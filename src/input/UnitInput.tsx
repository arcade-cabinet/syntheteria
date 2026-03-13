import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { Entity, UnitEntity } from "../ecs/traits";
import {
	Building,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import {
	cancelPlacement,
	confirmPlacement,
	getActivePlacement,
	updateGhostPosition,
} from "../systems/buildingPlacement";
import { tryMoveUnit } from "../systems/moveCommand";
import {
	type RadialOpenContext,
	closeRadialMenu,
	getRadialMenuState,
	openRadialMenu,
} from "../systems/radialMenu";
import { worldToGrid } from "../world/sectorCoordinates";
import { getStructuralFragment } from "../world/structuralSpace";

/**
 * Handles unit selection and move commands.
 */

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

/** Find unit or building closest to a display-space point (accounts for fragment offsets). */
function findEntityAtPoint(
	point: THREE.Vector3,
	threshold = 1.5,
): Entity | null {
	let closest: Entity | null = null;
	let closestDist = threshold;

	// Check mobile units
	for (const entity of units) {
		const frag = getStructuralFragment(entity.get(MapFragment)!.fragmentId);
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		const dx = entity.get(WorldPosition)!.x + ox - point.x;
		const dz = entity.get(WorldPosition)!.z + oz - point.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	// Check buildings (larger click target)
	for (const entity of buildings) {
		const frag = entity.get(MapFragment)!
			? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		const dx = entity.get(WorldPosition)!.x + ox - point.x;
		const dz = entity.get(WorldPosition)!.z + oz - point.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	return closest;
}

/** Issue a move command with MP cost check. Converts display-space target to real-world position. */
function issueMoveTo(entity: UnitEntity, displayX: number, displayZ: number) {
	const frag = getStructuralFragment(entity.get(MapFragment)!.fragmentId);
	const ox = frag?.displayOffset.x ?? 0;
	const oz = frag?.displayOffset.z ?? 0;

	const realX = displayX - ox;
	const realZ = displayZ - oz;

	const entityId = entity.get(Identity)?.id;
	if (!entityId) {
		return;
	}

	const currentPos = entity.get(WorldPosition)!;
	tryMoveUnit(
		entityId,
		{ x: currentPos.x, y: currentPos.y, z: currentPos.z },
		{ x: realX, y: 0, z: realZ },
	);
}

/** Build a RadialOpenContext from a 3D world point. */
function buildRadialContext(point: THREE.Vector3): RadialOpenContext {
	const entity = findEntityAtPoint(point);
	const sector = worldToGrid(point.x, point.z);

	if (entity) {
		const unitComp = entity.get(Unit);
		const buildingComp = entity.get(Building);
		const identity = entity.get(Identity);

		return {
			selectionType: unitComp ? "unit" : "building",
			targetEntityId: identity?.id ?? null,
			targetSector: sector,
			targetFaction: identity?.faction ?? null,
		};
	}

	return {
		selectionType: "empty_sector",
		targetEntityId: null,
		targetSector: sector,
		targetFaction: null,
	};
}

/** Long-press duration threshold in ms */
const LONG_PRESS_MS = 500;
/** Max movement in px before long-press is cancelled */
const LONG_PRESS_MOVE_THRESHOLD = 100; // 10px squared

function getSelectedEntity(): Entity | null {
	for (const entity of units) {
		if (entity.get(Unit)?.selected) return entity;
	}
	for (const entity of buildings) {
		if (entity.get(Building)?.selected) return entity;
	}
	return null;
}

function deselectAll() {
	for (const u of units) {
		u.get(Unit)!.selected = false;
	}
	for (const b of buildings) {
		b.get(Building)!.selected = false;
	}
}

function isUnit(entity: Entity): boolean {
	return !!entity.get(Unit);
}

function isBuilding(entity: Entity): boolean {
	return !!entity.get(Building);
}

export function UnitInput() {
	const { camera, gl } = useThree();
	const touchStart = useRef<{ x: number; y: number; time: number } | null>(
		null,
	);
	const wasPanning = useRef(false);
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressFired = useRef(false);

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

			const entityAtPoint = findEntityAtPoint(point);
			const currentlySelected = getSelectedEntity();

			if (entityAtPoint) {
				// Tapped on a unit or building — select it (deselect others)
				deselectAll();
				if (isUnit(entityAtPoint)) {
					entityAtPoint.get(Unit)!.selected = true;
				} else if (isBuilding(entityAtPoint)) {
					entityAtPoint.get(Building)!.selected = true;
				}
			} else if (currentlySelected && isUnit(currentlySelected)) {
				// Tapped empty ground with a mobile unit selected — move there
				issueMoveTo(currentlySelected, point.x, point.z);
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

			// Close any existing radial menu first
			if (getRadialMenuState().open) {
				closeRadialMenu();
			}

			const context = buildRadialContext(point);
			openRadialMenu(clientX, clientY, context);
		},
		[camera, gl],
	);

	const handleLongPress = useCallback(
		(clientX: number, clientY: number) => {
			const point = getWorldPointFromEvent(
				clientX,
				clientY,
				camera,
				gl.domElement,
			);
			if (!point) return;

			if (getRadialMenuState().open) {
				closeRadialMenu();
			}

			const context = buildRadialContext(point);
			openRadialMenu(clientX, clientY, context);
		},
		[camera, gl],
	);

	useEffect(() => {
		const canvas = gl.domElement;

		// --- Desktop: mouse events ---
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType === "touch") return; // handled by touch events
			if (e.button === 0) {
				// Close radial menu on left-click if it's open
				if (getRadialMenuState().open) {
					closeRadialMenu();
					return;
				}
				handleTap(e.clientX, e.clientY);
			} else if (e.button === 2) {
				handleRightClick(e.clientX, e.clientY);
			}
		};

		const onContextMenu = (e: Event) => {
			e.preventDefault();
		};

		// --- Mobile: touch events ---
		// Single-finger tap = select or move.
		// Single-finger long-press = open radial menu.
		// Multi-touch = camera pan (handled by TopDownCamera).
		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length !== 1) {
				// Multi-touch started — mark as panning, cancel long-press
				wasPanning.current = true;
				touchStart.current = null;
				if (longPressTimer.current) {
					clearTimeout(longPressTimer.current);
					longPressTimer.current = null;
				}
				return;
			}
			wasPanning.current = false;
			longPressFired.current = false;
			const startX = e.touches[0].clientX;
			const startY = e.touches[0].clientY;
			touchStart.current = {
				x: startX,
				y: startY,
				time: performance.now(),
			};

			// Start long-press timer
			longPressTimer.current = setTimeout(() => {
				if (!wasPanning.current && touchStart.current) {
					longPressFired.current = true;
					handleLongPress(startX, startY);
				}
			}, LONG_PRESS_MS);
		};

		const onTouchMove = (e: TouchEvent) => {
			if (!touchStart.current) return;
			// If finger moved more than a small threshold, it's a pan not a tap
			const dx = e.touches[0]?.clientX - touchStart.current.x;
			const dy = e.touches[0]?.clientY - touchStart.current.y;
			if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD) {
				// 10px threshold squared
				wasPanning.current = true;
				// Cancel long-press timer on significant movement
				if (longPressTimer.current) {
					clearTimeout(longPressTimer.current);
					longPressTimer.current = null;
				}
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			// Cancel any pending long-press timer
			if (longPressTimer.current) {
				clearTimeout(longPressTimer.current);
				longPressTimer.current = null;
			}

			// Don't process tap if long-press already fired
			if (longPressFired.current) {
				longPressFired.current = false;
				touchStart.current = null;
				return;
			}

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
				// Close radial menu on tap if open, otherwise normal tap behavior
				if (getRadialMenuState().open) {
					closeRadialMenu();
				} else {
					handleTap(touchStart.current.x, touchStart.current.y);
				}
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

		// Escape to cancel placement
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && getActivePlacement()) {
				cancelPlacement();
			}
		};

		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("contextmenu", onContextMenu);
		canvas.addEventListener("mousemove", onMouseMove);
		window.addEventListener("keydown", onKeyDown);
		canvas.addEventListener("touchstart", onTouchStart, { passive: true });
		canvas.addEventListener("touchmove", onTouchMove, { passive: true });
		canvas.addEventListener("touchend", onTouchEnd);

		return () => {
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("contextmenu", onContextMenu);
			canvas.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("keydown", onKeyDown);
			canvas.removeEventListener("touchstart", onTouchStart);
			canvas.removeEventListener("touchmove", onTouchMove);
			canvas.removeEventListener("touchend", onTouchEnd);
		};
	}, [gl, camera, handleTap, handleRightClick, handleLongPress]);

	return null;
}
