/**
 * Handles unit selection and move commands.
 *
 * Mobile: Tap to select a unit. If a unit is already selected, tap empty ground
 * to move it there. Two-finger drag pans the camera (handled by TopDownCamera).
 *
 * Desktop: Click to select. Right-click to move selected unit.
 *
 * Selection works in display space (accounts for fragment offsets).
 * Move commands convert display-space targets back to real-world positions.
 */

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { playSfx } from "../audio";
import { getFragment, getTerrainHeight } from "../ecs/terrain";
import { Fragment, Navigation, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import { addMoveMarker } from "../rendering/MoveIndicator";
import {
	cancelPlacement,
	confirmPlacement,
	getActivePlacement,
	updateGhostPosition,
} from "../systems/buildingPlacement";
import { assignGroup, recallGroup } from "./controlGroups";
import {
	boxSelect,
	findEntityAtPoint,
	getSelectedEntity,
	issueMoveTo,
	selectEntity,
} from "./selection";

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getWorldPointFromEvent(
	clientX: number,
	clientY: number,
	camera: THREE.Camera,
	domElement: HTMLCanvasElement,
): THREE.Vector3 | null {
	const rect = domElement.getBoundingClientRect();
	pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
	pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
	raycaster.setFromCamera(pointer, camera);
	const intersection = new THREE.Vector3();
	const hit = raycaster.ray.intersectPlane(GROUND_PLANE, intersection);
	return hit ? intersection : null;
}

/** Minimum drag distance in pixels before it counts as box select vs click. */
const BOX_SELECT_THRESHOLD = 16;

export function UnitInput() {
	const { camera, gl } = useThree();
	const touchStart = useRef<{ x: number; y: number; time: number } | null>(
		null,
	);
	const wasPanning = useRef(false);

	// Box selection drag state
	const dragStart = useRef<{
		clientX: number;
		clientY: number;
	} | null>(null);
	const isDragging = useRef(false);

	const handleTap = useCallback(
		(clientX: number, clientY: number) => {
			const point = getWorldPointFromEvent(
				clientX,
				clientY,
				camera,
				gl.domElement,
			);
			if (!point) return;

			// Building placement mode
			if (getActivePlacement()) {
				updateGhostPosition(point.x, point.z);
				if (confirmPlacement()) {
					// Placed successfully
				}
				return;
			}

			const entityAtPoint = findEntityAtPoint(point.x, point.z);
			const currentlySelected = getSelectedEntity();

			if (entityAtPoint) {
				selectEntity(entityAtPoint);
				playSfx("unit_select");
			} else if (currentlySelected?.has(Unit)) {
				issueMoveTo(currentlySelected, point.x, point.z);
				addMoveMarker(point.x, getTerrainHeight(point.x, point.z), point.z);
				playSfx("unit_move");
			}
		},
		[camera, gl],
	);

	const handleRightClick = useCallback(
		(clientX: number, clientY: number) => {
			const point = getWorldPointFromEvent(
				clientX,
				clientY,
				camera,
				gl.domElement,
			);
			if (!point) return;

			// Check if right-clicking ON the selected unit — open radial menu
			const selected = getSelectedEntity();
			if (selected?.has(Unit) && selected.get(Unit)!.selected) {
				const pos = selected.get(Position);
				if (pos) {
					const fragId = selected.get(Fragment)?.fragmentId ?? "";
					const fragData = fragId ? getFragment(fragId) : null;
					const ox = fragData?.displayOffset.x ?? 0;
					const oz = fragData?.displayOffset.z ?? 0;
					const dx = pos.x + ox - point.x;
					const dz = pos.z + oz - point.z;
					if (Math.sqrt(dx * dx + dz * dz) < 2.0) {
						// Right-clicked on the unit — dispatch radial menu event
						window.dispatchEvent(
							new CustomEvent("syntheteria:radialmenu", {
								detail: { screenX: clientX, screenY: clientY },
							}),
						);
						return;
					}
				}
			}

			// Right-click on ground moves selected units
			let moved = false;
			for (const entity of world.query(Unit, Navigation, Fragment, Position)) {
				if (entity.get(Unit)!.selected) {
					issueMoveTo(entity, point.x, point.z);
					moved = true;
				}
			}
			if (moved) {
				addMoveMarker(point.x, getTerrainHeight(point.x, point.z), point.z);
			}
		},
		[camera, gl],
	);

	useEffect(() => {
		const canvas = gl.domElement;

		// --- Desktop: mouse events ---
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType === "touch") return; // handled by touch events
			if (e.button === 0) {
				// Start potential box-select drag
				dragStart.current = { clientX: e.clientX, clientY: e.clientY };
				isDragging.current = false;
			} else if (e.button === 2) {
				handleRightClick(e.clientX, e.clientY);
			}
		};

		const onPointerMove = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			if (!dragStart.current) return;

			const dx = e.clientX - dragStart.current.clientX;
			const dy = e.clientY - dragStart.current.clientY;
			if (
				!isDragging.current &&
				dx * dx + dy * dy > BOX_SELECT_THRESHOLD * BOX_SELECT_THRESHOLD
			) {
				isDragging.current = true;
			}

			if (isDragging.current) {
				// Dispatch drag rect for visual overlay
				window.dispatchEvent(
					new CustomEvent("syntheteria:boxselect", {
						detail: {
							x1: dragStart.current.clientX,
							y1: dragStart.current.clientY,
							x2: e.clientX,
							y2: e.clientY,
							active: true,
						},
					}),
				);
			}
		};

		const onPointerUp = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			if (e.button !== 0) return;

			if (isDragging.current && dragStart.current) {
				// Complete box selection — convert screen corners to world XZ
				const startWorld = getWorldPointFromEvent(
					dragStart.current.clientX,
					dragStart.current.clientY,
					camera,
					canvas,
				);
				const endWorld = getWorldPointFromEvent(
					e.clientX,
					e.clientY,
					camera,
					canvas,
				);
				if (startWorld && endWorld) {
					const count = boxSelect(
						startWorld.x,
						startWorld.z,
						endWorld.x,
						endWorld.z,
					);
					if (count > 0) playSfx("unit_select");
				}
				// Clear drag overlay
				window.dispatchEvent(
					new CustomEvent("syntheteria:boxselect", {
						detail: { x1: 0, y1: 0, x2: 0, y2: 0, active: false },
					}),
				);
			} else if (dragStart.current) {
				// Was a click, not a drag
				handleTap(e.clientX, e.clientY);
			}

			dragStart.current = null;
			isDragging.current = false;
		};

		const onContextMenu = (e: Event) => {
			e.preventDefault();
		};

		// --- Mobile: touch events ---
		// Single-finger tap = select or move. Multi-touch = camera pan (handled by TopDownCamera).
		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length !== 1) {
				// Multi-touch started — mark as panning
				wasPanning.current = true;
				touchStart.current = null;
				return;
			}
			wasPanning.current = false;
			touchStart.current = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
				time: performance.now(),
			};
		};

		const onTouchMove = (e: TouchEvent) => {
			if (!touchStart.current) return;
			// If finger moved more than a small threshold, it's a pan not a tap
			const dx = e.touches[0]?.clientX - touchStart.current.x;
			const dy = e.touches[0]?.clientY - touchStart.current.y;
			if (dx * dx + dy * dy > 100) {
				// 10px threshold squared
				wasPanning.current = true;
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			// Only count as a tap if we weren't panning and touch was brief
			if (wasPanning.current || !touchStart.current) {
				touchStart.current = null;
				// Reset panning flag when all fingers are lifted
				if (e.touches.length === 0) {
					wasPanning.current = false;
				}
				return;
			}

			const elapsed = performance.now() - touchStart.current.time;
			if (elapsed < 300) {
				handleTap(touchStart.current.x, touchStart.current.y);
			}
			touchStart.current = null;
		};

		// Mouse move for ghost building preview
		const onMouseMove = (e: MouseEvent) => {
			if (!getActivePlacement()) return;
			const point = getWorldPointFromEvent(
				e.clientX,
				e.clientY,
				camera,
				gl.domElement,
			);
			if (point) {
				updateGhostPosition(point.x, point.z);
			}
		};

		// Keyboard: Escape, control groups (Ctrl+1-9 assign, 1-9 recall)
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && getActivePlacement()) {
				cancelPlacement();
				return;
			}

			// Control groups: digits 1-9
			const digit = Number.parseInt(e.key, 10);
			if (digit >= 1 && digit <= 9) {
				if (e.ctrlKey || e.metaKey) {
					assignGroup(digit);
				} else {
					recallGroup(digit);
				}
			}
		};

		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("pointermove", onPointerMove);
		canvas.addEventListener("pointerup", onPointerUp);
		canvas.addEventListener("contextmenu", onContextMenu);
		canvas.addEventListener("mousemove", onMouseMove);
		window.addEventListener("keydown", onKeyDown);
		canvas.addEventListener("touchstart", onTouchStart, { passive: true });
		canvas.addEventListener("touchmove", onTouchMove, { passive: true });
		canvas.addEventListener("touchend", onTouchEnd);

		return () => {
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerup", onPointerUp);
			canvas.removeEventListener("contextmenu", onContextMenu);
			canvas.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("keydown", onKeyDown);
			canvas.removeEventListener("touchstart", onTouchStart);
			canvas.removeEventListener("touchmove", onTouchMove);
			canvas.removeEventListener("touchend", onTouchEnd);
		};
	}, [gl, handleTap, handleRightClick, camera]);

	return null;
}
