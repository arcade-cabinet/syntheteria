/**
 * Rapier raycast utility for entity selection.
 *
 * Casts a ray through the Rapier physics world and maps collider hits
 * back to entity IDs via a collider handle registry. This decouples
 * physics raycasting from ECS — any code that creates colliders
 * registers the handle→entityId mapping here.
 */

import RAPIER from "@dimforge/rapier3d-compat";

/** Default max distance for selection raycasts. Matches config/rendering.json selectionRayMaxDistance. */
export const SELECTION_RAY_MAX_DISTANCE = 50;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface RaycastHit {
	entityId: string;
	point: Vec3;
	normal: Vec3;
	distance: number;
}

// ─── Collider → Entity ID Registry ─────────────────────────────────────────

const colliderEntityMap = new Map<number, string>();

/** Register a collider handle → entity ID mapping. */
export function registerColliderEntity(
	colliderHandle: number,
	entityId: string,
): void {
	colliderEntityMap.set(colliderHandle, entityId);
}

/** Remove a collider handle mapping (e.g., when entity is destroyed). */
export function unregisterColliderEntity(colliderHandle: number): void {
	colliderEntityMap.delete(colliderHandle);
}

/** Clear all mappings (e.g., on world reset). */
export function clearColliderEntityMap(): void {
	colliderEntityMap.clear();
}

/** Get the entity ID for a collider handle, or undefined if not registered. */
export function getEntityForCollider(
	colliderHandle: number,
): string | undefined {
	return colliderEntityMap.get(colliderHandle);
}

// ─── Raycast ────────────────────────────────────────────────────────────────

/**
 * Cast a selection ray through the Rapier world.
 *
 * Returns the nearest hit that maps to a registered entity,
 * or null on miss / distance exceeds maxDistance / collider not in registry.
 */
export function castSelectionRay(
	rapierWorld: RAPIER.World,
	cameraPosition: Vec3,
	cameraDirection: Vec3,
	maxDistance: number = SELECTION_RAY_MAX_DISTANCE,
): RaycastHit | null {
	const ray = new RAPIER.Ray(cameraPosition, cameraDirection);

	const hit = rapierWorld.castRay(ray, maxDistance, true);
	if (!hit) return null;

	const distance = hit.timeOfImpact;
	if (distance > maxDistance) return null;

	// Look up entity ID from collider handle registry
	const entityId = colliderEntityMap.get(hit.collider.handle);
	if (!entityId) return null;

	// Compute hit point: origin + direction * distance
	const point: Vec3 = {
		x: cameraPosition.x + cameraDirection.x * distance,
		y: cameraPosition.y + cameraDirection.y * distance,
		z: cameraPosition.z + cameraDirection.z * distance,
	};

	// Get normal at hit point
	const normalResult = hit.collider.castRayAndGetNormal(ray, maxDistance, true);
	const normal: Vec3 = normalResult
		? {
				x: normalResult.normal.x,
				y: normalResult.normal.y,
				z: normalResult.normal.z,
			}
		: { x: 0, y: 1, z: 0 };

	return { entityId, point, normal, distance };
}
