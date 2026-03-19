/**
 * BoardInput — click-to-select and click-to-move for board units.
 *
 * Mounted inside the R3F Canvas. Uses raycasting to map pointer events
 * to tile coordinates.
 *
 * State machine:
 *   idle: click on player unit -> selected
 *   selected: click on reachable tile -> issue move, return to idle
 *             click elsewhere -> deselect, return to idle
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { Entity, World } from "koota";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playSfx } from "../audio/sfx";
import { shortestPath } from "../board/adjacency";
import { createGridApi } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import {
	cancelBuildPlacement,
	confirmBuildPlacement,
	isInBuildPlacementMode,
} from "../systems/buildSystem";
import {
	clearHighlights,
	highlightPlacementTile,
	highlightReachableTiles,
} from "../systems/highlightSystem";
import { Building } from "../traits/building";
import { ResourceDeposit } from "../traits/resource";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits/unit";
import { spherePosToTile, sphereRadius } from "../rendering/boardGeometry";
import { clearPreviewPath, setPreviewPath } from "../rendering/PathRenderer";
import {
	closeRadialMenu,
	confirmRadialSelection,
	getRadialMenuState,
	openRadialMenu,
} from "../systems/radialMenu";
// Import providers so they register at module scope
import {
	setBuildProviderWorld,
	setProviderBoard,
	setProviderSelectedUnit,
} from "../systems/radialProviders";
import "../systems/radialProviders";

type BoardInputProps = {
	world: World;
	board: GeneratedBoard;
	/** Koota entity numeric ID of the currently selected unit, or null. */
	selectedId?: number | null;
	onSelect: (entityId: number | null) => void;
	/** When true, raycast against the sphere instead of the ground plane. */
	useSphere?: boolean;
};

/**
 * Analytic ray-sphere intersection.
 * Returns the nearest intersection point, or null if the ray misses.
 */
function raySphereIntersect(
	ray: THREE.Ray,
	center: THREE.Vector3,
	radius: number,
	target: THREE.Vector3,
): THREE.Vector3 | null {
	const oc = new THREE.Vector3().subVectors(ray.origin, center);
	const a = ray.direction.dot(ray.direction);
	const b = 2 * oc.dot(ray.direction);
	const c = oc.dot(oc) - radius * radius;
	const disc = b * b - 4 * a * c;
	if (disc < 0) return null;
	const sqrtDisc = Math.sqrt(disc);
	let t = (-b - sqrtDisc) / (2 * a);
	if (t < 0) t = (-b + sqrtDisc) / (2 * a);
	if (t < 0) return null;
	target.copy(ray.direction).multiplyScalar(t).add(ray.origin);
	return target;
}

export function BoardInput({
	world,
	board,
	selectedId,
	onSelect,
	useSphere = true,
}: BoardInputProps) {
	const { camera, gl } = useThree();
	const gridApi = useMemo(() => createGridApi(board), [board]);
	const R = useMemo(
		() => sphereRadius(board.config.width, board.config.height),
		[board.config.width, board.config.height],
	);
	const sphereCenter = useRef(new THREE.Vector3(0, 0, 0));

	// Wire world and board refs so radial providers can query ECS state
	useEffect(() => {
		setBuildProviderWorld(world);
		setProviderBoard(board);
	}, [world, board]);

	// Keep selected unit in sync for radial providers
	useEffect(() => {
		setProviderSelectedUnit(selectedId ?? null);
	}, [selectedId]);

	const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
	const raycaster = useRef(new THREE.Raycaster());
	const hitPoint = useRef(new THREE.Vector3());
	const pointerRef = useRef({ x: 0, y: 0 });
	const clickedRef = useRef(false);

	/**
	 * Raycast to either the ground plane (flat board) or the sphere,
	 * returning the tile coordinate if hit. Returns null on miss.
	 */
	const raycastToTile = (): { x: number; z: number } | null => {
		raycaster.current.setFromCamera(
			pointerRef.current as THREE.Vector2,
			camera,
		);
		if (useSphere) {
			const hit = raySphereIntersect(
				raycaster.current.ray,
				sphereCenter.current,
				R,
				hitPoint.current,
			);
			if (!hit) return null;
			const result = spherePosToTile(
				hitPoint.current,
				board.config.width,
				board.config.height,
				R,
			);
			return result;
		}
		const planeHit = raycaster.current.ray.intersectPlane(
			groundPlane.current,
			hitPoint.current,
		);
		if (!planeHit) return null;
		return gridApi.worldToTile(hitPoint.current.x, hitPoint.current.z);
	};

	// Map from entity ID -> Entity, rebuilt each frame a click is processed
	const entityById = useRef(new Map<number, Entity>());

	// Store last screen coords for radial menu positioning
	const lastScreenRef = useRef({ x: 0, y: 0 });
	const rightClickedRef = useRef(false);

	// Click-vs-drag detection: only fire click if pointer moved < 5px
	const CLICK_THRESHOLD = 5;
	const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const canvas = gl.domElement;

		const onPointerMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			lastScreenRef.current.x = e.clientX;
			lastScreenRef.current.y = e.clientY;
		};

		const onPointerDown = (e: PointerEvent) => {
			// If radial menu is open, handle left-click
			if (e.button === 0 && getRadialMenuState().open) {
				confirmRadialSelection();
				return;
			}
			if (e.button === 0) {
				pointerDownPos.current = { x: e.clientX, y: e.clientY };
				// Update NDC immediately so tap-without-move works (touch devices)
				const rect = canvas.getBoundingClientRect();
				pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			}
		};

		const onPointerUp = (e: PointerEvent) => {
			if (e.button !== 0 || !pointerDownPos.current) return;
			const dx = e.clientX - pointerDownPos.current.x;
			const dy = e.clientY - pointerDownPos.current.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			pointerDownPos.current = null;
			// Only register as click if pointer didn't move (not a drag)
			if (dist < CLICK_THRESHOLD) {
				// Update NDC to final position
				const rect = canvas.getBoundingClientRect();
				pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
				clickedRef.current = true;
			}
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isInBuildPlacementMode()) {
				cancelBuildPlacement();
				clearHighlights(world);
			}
		};

		const onContextMenu = (e: MouseEvent) => {
			e.preventDefault();
			lastScreenRef.current.x = e.clientX;
			lastScreenRef.current.y = e.clientY;
			// Compute NDC for raycast
			const rect = canvas.getBoundingClientRect();
			pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			rightClickedRef.current = true;
		};

		canvas.addEventListener("pointermove", onPointerMove);
		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("pointerup", onPointerUp);
		canvas.addEventListener("contextmenu", onContextMenu);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("pointerup", onPointerUp);
			canvas.removeEventListener("contextmenu", onContextMenu);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [gl, world]);

	const lastPathTileRef = useRef("");

	useFrame(() => {
		// --- Path preview: show A* path when hovering reachable tiles ---
		if (selectedId != null && !isInBuildPlacementMode()) {
			const hoverTile = raycastToTile();
			const hoverKey = hoverTile ? `${hoverTile.x},${hoverTile.z}` : "";
			if (hoverKey !== lastPathTileRef.current) {
				lastPathTileRef.current = hoverKey;
				if (hoverTile) {
					// Find the selected unit's position
					let unitX = -1;
					let unitZ = -1;
					for (const e of world.query(UnitPos, UnitFaction)) {
						if (e.id() === selectedId) {
							const p = e.get(UnitPos);
							if (p) {
								unitX = p.tileX;
								unitZ = p.tileZ;
							}
							break;
						}
					}
					if (unitX >= 0 && (hoverTile.x !== unitX || hoverTile.z !== unitZ)) {
						const path = shortestPath(
							unitX,
							unitZ,
							hoverTile.x,
							hoverTile.z,
							board,
						);
						if (path.length >= 2) {
							setPreviewPath(
								path.map((t) => ({
									tileX: t.x,
									tileZ: t.z,
									elevation: t.elevation,
								})),
							);
						} else {
							clearPreviewPath();
						}
					} else {
						clearPreviewPath();
					}
				} else {
					clearPreviewPath();
				}
			}
		} else if (lastPathTileRef.current !== "") {
			lastPathTileRef.current = "";
			clearPreviewPath();
		}

		// --- Build placement mode: highlight hovered tile ---
		if (isInBuildPlacementMode()) {
			const hoverTile = raycastToTile();
			if (hoverTile) {
				highlightPlacementTile(world, hoverTile.x, hoverTile.z);
			}
		}

		// --- Right-click: cancel build placement or open radial menu ---
		if (rightClickedRef.current) {
			rightClickedRef.current = false;

			if (isInBuildPlacementMode()) {
				cancelBuildPlacement();
				clearHighlights(world);
				return;
			}

			const tile = raycastToTile();
			if (tile) {
				// Determine what's at this tile
				let selectionType:
					| "unit"
					| "empty_sector"
					| "resource_node"
					| "building"
					| "none" = "empty_sector";
				let targetEntityId: string | null = null;
				let targetFaction: string | null = null;

				for (const e of world.query(UnitPos, UnitFaction)) {
					const p = e.get(UnitPos);
					const f = e.get(UnitFaction);
					if (p && f && p.tileX === tile.x && p.tileZ === tile.z) {
						selectionType = "unit";
						targetEntityId = String(e.id());
						targetFaction = f.factionId;
						break;
					}
				}

				// Check for resource deposit if no unit found
				if (selectionType === "empty_sector") {
					for (const e of world.query(ResourceDeposit)) {
						const dep = e.get(ResourceDeposit);
						if (
							dep &&
							!dep.depleted &&
							dep.tileX === tile.x &&
							dep.tileZ === tile.z
						) {
							selectionType = "resource_node";
							targetEntityId = String(e.id());
							break;
						}
					}
				}

				// Check for building if still empty
				if (selectionType === "empty_sector") {
					for (const e of world.query(Building)) {
						const b = e.get(Building);
						if (b && b.tileX === tile.x && b.tileZ === tile.z) {
							selectionType = "building";
							targetEntityId = String(e.id());
							targetFaction = b.factionId;
							break;
						}
					}
				}

				openRadialMenu(lastScreenRef.current.x, lastScreenRef.current.y, {
					selectionType,
					targetEntityId,
					targetSector: { q: tile.x, r: tile.z },
					targetFaction,
				});
			}
		}

		// --- Left-click: build placement, select, or move ---
		if (!clickedRef.current) return;
		clickedRef.current = false;

		// Raycast to ground plane or sphere
		const clickTile = raycastToTile();
		if (!clickTile) return;

		const { x, z } = clickTile;

		// --- Build placement mode: confirm placement on click ---
		if (isInBuildPlacementMode()) {
			const placed = confirmBuildPlacement(world, x, z, board);
			clearHighlights(world);
			if (!placed) {
				// Stay in placement mode — player can try another tile
			}
			return;
		}

		// Build entity lookup map from current units
		const map = entityById.current;
		map.clear();
		for (const e of world.query(UnitPos, UnitFaction)) {
			map.set(e.id(), e);
		}

		if (selectedId != null) {
			const selectedEntity = map.get(selectedId);
			if (!selectedEntity) {
				clearHighlights(world);
				clearPreviewPath();
				onSelect(null);
				return;
			}

			const pos = selectedEntity.get(UnitPos);
			const stats = selectedEntity.get(UnitStats);
			if (!pos || !stats) {
				clearHighlights(world);
				clearPreviewPath();
				onSelect(null);
				return;
			}

			// Same tile as selected unit -> deselect
			if (x === pos.tileX && z === pos.tileZ) {
				clearHighlights(world);
				clearPreviewPath();
				onSelect(null);
				return;
			}

			// Check for enemy within attack range — click-to-attack
			const distToClick = Math.abs(x - pos.tileX) + Math.abs(z - pos.tileZ);
			if (
				distToClick <= stats.attackRange &&
				stats.attackRange > 0 &&
				stats.ap >= 1
			) {
				for (const e of world.query(UnitPos, UnitFaction)) {
					const ep = e.get(UnitPos);
					const ef = e.get(UnitFaction);
					if (!ep || !ef) continue;
					if (ep.tileX === x && ep.tileZ === z && ef.factionId !== "player") {
						playSfx("attack_hit");
						selectedEntity.add(
							UnitAttack({ targetEntityId: e.id(), damage: 2 }),
						);
						const newStats = selectedEntity.get(UnitStats);
						if (newStats) {
							selectedEntity.set(UnitStats, {
								...newStats,
								ap: Math.max(0, newStats.ap - 1),
							});
						}
						clearHighlights(world);
						clearPreviewPath();
						onSelect(null);
						return;
					}
				}
			}

			// Check reachability
			const reachable = gridApi.reachable(pos.tileX, pos.tileZ, stats.mp);
			const key = `${x},${z}`;

			if (reachable.has(key)) {
				// Issue move command
				playSfx("unit_move");
				selectedEntity.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: x,
						toZ: z,
						progress: 0,
						mpCost: 1,
					}),
				);
				clearHighlights(world);
				clearPreviewPath();
				onSelect(null);
			} else {
				// Clicked non-reachable tile -> deselect
				clearHighlights(world);
				clearPreviewPath();
				onSelect(null);
			}
		} else {
			// No unit selected — try to select a player unit at this tile
			for (const e of world.query(UnitPos, UnitFaction)) {
				const p = e.get(UnitPos);
				const f = e.get(UnitFaction);
				if (!p || !f) continue;
				if (p.tileX === x && p.tileZ === z && f.factionId === "player") {
					playSfx("unit_select");
					const st = e.get(UnitStats);
					onSelect(e.id());
					if (st) {
						highlightReachableTiles(world, x, z, st.mp);
					}
					return;
				}
			}
		}
	});

	return null;
}
