/**
 * ObjectSelectionSystem — Rapier raycast hover + click selection.
 *
 * Every frame:
 *   1. Cast ray from camera through screen center (crosshair)
 *   2. Find nearest entity hit (unit, building, belt, wire, cube, deposit, ground)
 *   3. Set hoveredEntity in shared state
 *   4. On click (or tap), set selectedEntity
 *   5. Selected entity triggers emissive highlight glow
 *
 * This is a React Three Fiber component that runs inside the Canvas.
 *
 * Strategy: Uses Rapier's world.castRay() when physics is initialized and
 * colliders have entity associations. Falls back to Three.js Raycaster
 * for scene intersection, then matches hit positions against ECS entities.
 */

import RAPIER from "@dimforge/rapier3d-compat";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Entity } from "../ecs/types";
import {
	belts,
	buildings,
	hackables,
	items,
	miners,
	otters,
	processors,
	signalRelays,
	units,
	wires,
} from "../ecs/world";
import { getPhysicsWorld, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { getAllFurnaces } from "../systems/furnace";
import { getCube } from "../systems/grabber";
import { getDeposit } from "../systems/oreSpawner";
import { castSelectionRay, type Vec3 } from "./raycastUtils";
import { setSelected } from "./selectionState";

// ─── Configuration ──────────────────────────────────────────────────────────

/** Maximum distance for interaction raycasts. */
const MAX_INTERACTION_RANGE = 6.0;

/** Distance threshold for matching a raycast hit point to an entity. */
const ENTITY_MATCH_THRESHOLD = 1.5;

// ─── Module-level state (follows gameState pattern) ─────────────────────────

/** The entity type category for the currently hovered entity. */
export type EntityCategory =
	| "unit"
	| "building"
	| "belt"
	| "wire"
	| "miner"
	| "processor"
	| "item"
	| "otter"
	| "hackable"
	| "signalRelay"
	| "oreDeposit"
	| "furnace"
	| "ground"
	| null;

interface SelectionState {
	hoveredEntityId: string | null;
	hoveredEntityType: EntityCategory;
	hoveredHitPoint: THREE.Vector3 | null;
	hoveredDistance: number;
	selectedEntityId: string | null;
	selectedEntityType: EntityCategory;
}

const selectionState: SelectionState = {
	hoveredEntityId: null,
	hoveredEntityType: null,
	hoveredHitPoint: null,
	hoveredDistance: 0,
	selectedEntityId: null,
	selectedEntityType: null,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/** Get the entity currently under the crosshair (hovered). */
export function getHoveredEntity(): {
	entityId: string | null;
	entityType: EntityCategory;
	hitPoint: THREE.Vector3 | null;
	distance: number;
} {
	return {
		entityId: selectionState.hoveredEntityId,
		entityType: selectionState.hoveredEntityType,
		hitPoint: selectionState.hoveredHitPoint,
		distance: selectionState.hoveredDistance,
	};
}

/** Get the entity currently selected (clicked). */
export function getSelectedEntity(): {
	entityId: string | null;
	entityType: EntityCategory;
} {
	return {
		entityId: selectionState.selectedEntityId,
		entityType: selectionState.selectedEntityType,
	};
}

/** Clear the current selection. */
export function clearSelection(): void {
	selectionState.selectedEntityId = null;
	selectionState.selectedEntityType = null;
}

/**
 * Handle a selection click by casting a ray and updating selection state.
 *
 * Exported for testing. Called by both desktop click and mobile tap handlers.
 * Uses castSelectionRay (US-001) and setSelected (US-002).
 */
export function handleSelectionClick(
	cameraPosition: Vec3,
	cameraDirection: Vec3,
	rapierWorld: RAPIER.World | null,
): void {
	if (rapierWorld) {
		const hit = castSelectionRay(rapierWorld, cameraPosition, cameraDirection);
		if (hit) {
			// Update reactive selection state (new system)
			setSelected(hit.entityId);
			// Sync internal state for hover/highlight consumers
			selectionState.selectedEntityId = hit.entityId;
			selectionState.selectedEntityType = null;
			return;
		}
	}
	// No hit or no physics — clear selection
	setSelected(null);
	clearSelection();
}

// ─── Internal: find nearest entity to a world point ─────────────────────────

interface EntityMatch {
	entity: Entity;
	category: EntityCategory;
	distance: number;
}

/**
 * Find the closest ECS entity to a given world point.
 * Searches all entity archetypes and returns the nearest one
 * within the match threshold.
 */
function findEntityNearPoint(
	point: THREE.Vector3,
	cameraPos: THREE.Vector3,
): EntityMatch | null {
	let best: EntityMatch | null = null;

	const check = (entity: Entity, category: EntityCategory) => {
		if (!entity.worldPosition) return;

		// Skip the player's own bot
		if (entity.playerControlled?.isActive) return;

		const dx = entity.worldPosition.x - point.x;
		const dy = entity.worldPosition.y - point.y;
		const dz = entity.worldPosition.z - point.z;
		const distToPoint = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (distToPoint > ENTITY_MATCH_THRESHOLD) return;

		// Also check distance from camera to entity (must be within range)
		const camDx = entity.worldPosition.x - cameraPos.x;
		const camDy = entity.worldPosition.y - cameraPos.y;
		const camDz = entity.worldPosition.z - cameraPos.z;
		const distFromCam = Math.sqrt(camDx * camDx + camDy * camDy + camDz * camDz);

		if (distFromCam > MAX_INTERACTION_RANGE) return;

		if (!best || distToPoint < best.distance) {
			best = { entity, category, distance: distFromCam };
		}
	};

	// Check all entity types — order doesn't matter since we pick closest
	for (const e of units) check(e, "unit");
	for (const e of buildings) {
		// Differentiate miners and processors from generic buildings
		if (e.miner) check(e, "miner");
		else if (e.processor) check(e, "processor");
		else check(e, "building");
	}
	for (const e of belts) check(e, "belt");
	for (const e of wires) {
		if (e.worldPosition) check(e, "wire");
	}
	for (const e of miners) check(e, "miner");
	for (const e of processors) check(e, "processor");
	for (const e of items) check(e, "item");
	for (const e of otters) check(e, "otter");
	for (const e of hackables) check(e, "hackable");
	for (const e of signalRelays) check(e, "signalRelay");

	return best;
}

/**
 * Alternative approach: find the entity closest to the ray itself
 * (point-to-line distance) rather than closest to a specific hit point.
 * This is more robust when the ray doesn't hit scene geometry directly.
 */
function findEntityNearRay(
	rayOrigin: THREE.Vector3,
	rayDir: THREE.Vector3,
): EntityMatch | null {
	let best: EntityMatch | null = null;

	const check = (entity: Entity, category: EntityCategory) => {
		if (!entity.worldPosition) return;
		if (entity.playerControlled?.isActive) return;

		const wp = entity.worldPosition;
		const entityPos = _tmpVec.set(wp.x, wp.y + 0.5, wp.z); // offset up for center

		// Distance from camera
		const toEntity = _tmpVec2.copy(entityPos).sub(rayOrigin);
		const distAlongRay = toEntity.dot(rayDir);

		// Must be in front of camera and within range
		if (distAlongRay < 0 || distAlongRay > MAX_INTERACTION_RANGE) return;

		// Point on ray closest to entity
		const closestOnRay = _tmpVec3
			.copy(rayDir)
			.multiplyScalar(distAlongRay)
			.add(rayOrigin);
		const perpDist = closestOnRay.distanceTo(entityPos);

		// Entity must be close to the ray (within a cone angle effectively)
		// Threshold grows slightly with distance for far objects
		const threshold = 0.5 + distAlongRay * 0.05;
		if (perpDist > threshold) return;

		if (!best || perpDist < best.distance) {
			best = { entity, category, distance: distAlongRay };
		}
	};

	for (const e of units) check(e, "unit");
	for (const e of buildings) {
		if (e.miner) check(e, "miner");
		else if (e.processor) check(e, "processor");
		else check(e, "building");
	}
	for (const e of belts) check(e, "belt");
	for (const e of wires) {
		if (e.worldPosition) check(e, "wire");
	}
	for (const e of miners) check(e, "miner");
	for (const e of processors) check(e, "processor");
	for (const e of items) check(e, "item");
	for (const e of otters) check(e, "otter");
	for (const e of hackables) check(e, "hackable");
	for (const e of signalRelays) check(e, "signalRelay");

	return best;
}

// Reusable temp vectors to avoid GC pressure
const _tmpVec = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector3();
const _tmpVec3 = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

// ─── R3F Component ──────────────────────────────────────────────────────────

/**
 * ObjectSelectionSystem — add inside the R3F Canvas.
 *
 * Runs every frame to update hover state.
 * Listens for click/tap events to set selection.
 */
export function ObjectSelectionSystem() {
	const { camera, gl, scene } = useThree();
	const raycaster = useRef(new THREE.Raycaster());

	// Configure raycaster
	useEffect(() => {
		raycaster.current.far = MAX_INTERACTION_RANGE;
	}, []);

	// ─── Click handler: raycast and select via castSelectionRay ─────

	useEffect(() => {
		const canvas = gl.domElement;

		const doSelect = () => {
			camera.getWorldPosition(_rayOrigin);
			camera.getWorldDirection(_rayDir);

			const rapierWorld = isPhysicsInitialized()
				? getPhysicsWorld()
				: null;

			handleSelectionClick(_rayOrigin, _rayDir, rapierWorld);
		};

		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType === "touch") return; // Mobile uses tap handler
			if (e.button === 0) {
				// Left-click to select
				doSelect();
			}
		};

		// Mobile: single tap selects via a dispatched custom event
		const onTap = () => {
			doSelect();
		};

		// Keyboard: Tab to select what you're looking at
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Tab") {
				e.preventDefault();
				doSelect();
			}
		};

		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("objectselect", onTap);
		window.addEventListener("keydown", onKeyDown);

		return () => {
			canvas.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("objectselect", onTap);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [camera, gl]);

	// ─── Per-frame hover update ──────────────────────────────────────

	useFrame(() => {
		// Get ray from camera center (where crosshair is)
		camera.getWorldPosition(_rayOrigin);
		camera.getWorldDirection(_rayDir);

		let matched: EntityMatch | null = null;

		// Strategy 1: Try Rapier physics raycast first
		if (isPhysicsInitialized()) {
			const world = getPhysicsWorld();
			if (world) {
				const ray = new RAPIER.Ray(
					{ x: _rayOrigin.x, y: _rayOrigin.y, z: _rayOrigin.z },
					{ x: _rayDir.x, y: _rayDir.y, z: _rayDir.z },
				);
				const hit = world.castRay(ray, MAX_INTERACTION_RANGE, true);
				if (hit) {
					const hitPt = ray.pointAt(hit.timeOfImpact);
					_hitPoint.set(hitPt.x, hitPt.y, hitPt.z);

					// Try to match the physics hit point to an entity
					matched = findEntityNearPoint(_hitPoint, _rayOrigin);
				}
			}
		}

		// Strategy 2: Three.js scene raycaster
		if (!matched) {
			raycaster.current.set(_rayOrigin, _rayDir);
			const intersects = raycaster.current.intersectObjects(
				scene.children,
				true,
			);

			for (const intersect of intersects) {
				if (intersect.distance > MAX_INTERACTION_RANGE) break;

				// Check if the intersected object or any parent has userData.entityId
				let obj: THREE.Object3D | null = intersect.object;
				while (obj) {
					if (obj.userData?.entityId) {
						// Direct entity ID match from userData — ideal path
						const entityId = obj.userData.entityId as string;
						const entityType =
							(obj.userData.entityType as EntityCategory) ?? null;
						matched = {
							entity: { id: entityId } as Entity,
							category: entityType,
							distance: intersect.distance,
						};
						break;
					}
					obj = obj.parent;
				}

				if (matched) break;

				// No userData — match against entity positions
				_hitPoint.copy(intersect.point);
				matched = findEntityNearPoint(_hitPoint, _rayOrigin);
				if (matched) break;
			}
		}

		// Strategy 3: Direct ray-to-entity proximity (no scene geometry needed)
		if (!matched) {
			matched = findEntityNearRay(_rayOrigin, _rayDir);
		}

		// Update hover state
		if (matched) {
			selectionState.hoveredEntityId = matched.entity.id;
			selectionState.hoveredEntityType = matched.category;
			selectionState.hoveredDistance = matched.distance;

			if (matched.entity.worldPosition) {
				if (!selectionState.hoveredHitPoint) {
					selectionState.hoveredHitPoint = new THREE.Vector3();
				}
				selectionState.hoveredHitPoint.set(
					matched.entity.worldPosition.x,
					matched.entity.worldPosition.y,
					matched.entity.worldPosition.z,
				);
			}
		} else {
			selectionState.hoveredEntityId = null;
			selectionState.hoveredEntityType = null;
			selectionState.hoveredHitPoint = null;
			selectionState.hoveredDistance = 0;
		}

		// If the selected entity no longer exists, clear selection
		if (selectionState.selectedEntityId) {
			const stillExists = entityExists(selectionState.selectedEntityId);
			if (!stillExists) {
				clearSelection();
			}
		}
	});

	return null;
}

/** Check if an entity with the given ID still exists in any archetype. */
function entityExists(id: string): boolean {
	// Check ore deposits (module registry, not ECS)
	if (getDeposit(id)) return true;
	// Check furnaces (module registry, not ECS)
	for (const f of getAllFurnaces()) if (f.id === id) return true;
	// Check cubes in grabber registry
	if (getCube(id)) return true;
	// Check ECS archetypes
	for (const e of units) if (e.id === id) return true;
	for (const e of buildings) if (e.id === id) return true;
	for (const e of belts) if (e.id === id) return true;
	for (const e of miners) if (e.id === id) return true;
	for (const e of processors) if (e.id === id) return true;
	for (const e of items) if (e.id === id) return true;
	for (const e of otters) if (e.id === id) return true;
	for (const e of hackables) if (e.id === id) return true;
	for (const e of signalRelays) if (e.id === id) return true;
	return false;
}
