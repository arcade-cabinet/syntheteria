/**
 * PathfindingSystem — high-level navmesh-based pathfinding for Syntheteria.
 *
 * Wraps Yuka's NavMesh.findPath() with:
 *   - Path smoothing: removes collinear/redundant waypoints
 *   - FollowPathBehavior integration: attaches Yuka path-following to vehicles
 *   - Entity-level API: requestPath(entityId, target) handles lookup and wiring
 *   - Terrain Y correction: all waypoints get proper terrain height
 *
 * Works alongside the existing movement system in systems/movement.ts.
 * The movement system interpolates the entity's worldPosition along
 * the navigation.path waypoints. This module populates that path using
 * the Yuka NavMesh instead of the old grid-based A* in systems/navmesh.ts.
 */

import type { NavMesh, Vehicle } from "yuka";
import { FollowPathBehavior, Path, Vector3 as YukaVector3 } from "yuka";

import { getTerrainHeight } from "../ecs/terrain";
import type { Entity, Vec3 } from "../ecs/types";
import { getEntityById } from "../ecs/koota/compat";
import { YukaManager } from "./YukaManager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathResult {
	/** The smoothed path as world-space Vec3 waypoints with terrain Y. */
	waypoints: Vec3[];
	/** Whether a path was found. */
	found: boolean;
}

export interface PathFollowerHandle {
	/** The FollowPathBehavior attached to the vehicle. */
	behavior: FollowPathBehavior;
	/** Remove the behavior from the vehicle. */
	detach: () => void;
	/** Whether the path has been fully traversed. */
	isFinished: () => boolean;
}

// ---------------------------------------------------------------------------
// Path smoothing
// ---------------------------------------------------------------------------

/**
 * Remove unnecessary waypoints on approximately straight lines.
 * Uses a simple collinearity test in the XZ plane: if three consecutive
 * points form a sufficiently straight line (cross product near zero),
 * the middle point is removed.
 */
function smoothPath(raw: Vec3[]): Vec3[] {
	if (raw.length <= 2) return raw;

	const result: Vec3[] = [raw[0]];

	for (let i = 1; i < raw.length - 1; i++) {
		const prev = result[result.length - 1];
		const curr = raw[i];
		const next = raw[i + 1];

		// Cross product in XZ (2D)
		const ax = curr.x - prev.x;
		const az = curr.z - prev.z;
		const bx = next.x - prev.x;
		const bz = next.z - prev.z;
		const cross = Math.abs(ax * bz - az * bx);

		// Normalize by segment lengths to get a meaningful threshold
		const lenA = Math.sqrt(ax * ax + az * az);
		const lenB = Math.sqrt(bx * bx + bz * bz);
		const denom = lenA * lenB;

		// Keep the point if the triangle area is significant
		// (i.e., the path bends here)
		if (denom > 0.001 && cross / denom > 0.05) {
			result.push(curr);
		}
	}

	result.push(raw[raw.length - 1]);
	return result;
}

// ---------------------------------------------------------------------------
// Core pathfinding
// ---------------------------------------------------------------------------

/**
 * Find a path from `from` to `to` on the Yuka NavMesh.
 *
 * @param navMesh - The Yuka NavMesh to search.
 * @param from    - Start position in world space.
 * @param to      - Goal position in world space.
 * @returns PathResult with smoothed waypoints and success flag.
 */
export function findPath(navMesh: NavMesh, from: Vec3, to: Vec3): PathResult {
	const fromVec = new YukaVector3(from.x, from.y, from.z);
	const toVec = new YukaVector3(to.x, to.y, to.z);

	const yukaPath = navMesh.findPath(fromVec, toVec);

	if (yukaPath.length === 0) {
		return { waypoints: [], found: false };
	}

	// Convert Yuka Vector3s to our Vec3 format with terrain Y
	const waypoints: Vec3[] = yukaPath.map((v) => ({
		x: v.x,
		y: getTerrainHeight(v.x, v.z),
		z: v.z,
	}));

	// Smooth out collinear waypoints
	const smoothed = smoothPath(waypoints);

	return { waypoints: smoothed, found: true };
}

/**
 * Create a Yuka FollowPathBehavior and attach it to a vehicle.
 *
 * The behavior drives the vehicle along the given waypoints using
 * Yuka's seek/arrive blend. When the path is finished, the behavior
 * can be detected via the returned handle's isFinished().
 *
 * @param vehicle - The Yuka Vehicle to steer.
 * @param path    - Ordered waypoints in world space.
 * @param nextWaypointDistance - How close the vehicle must get to a waypoint
 *   before advancing to the next one. Default: 1.5 world units.
 * @returns A handle to manage the behavior lifecycle.
 */
export function createPathFollower(
	vehicle: Vehicle,
	path: Vec3[],
	nextWaypointDistance = 1.5,
): PathFollowerHandle {
	const yukaPath = new Path();
	for (const p of path) {
		yukaPath.add(new YukaVector3(p.x, p.y, p.z));
	}

	const behavior = new FollowPathBehavior(yukaPath, nextWaypointDistance);
	behavior.active = true;
	behavior.weight = 1;

	vehicle.steering.add(behavior);

	return {
		behavior,
		detach: () => {
			vehicle.steering.remove(behavior);
		},
		isFinished: () => yukaPath.finished(),
	};
}

// ---------------------------------------------------------------------------
// Entity-level API
// ---------------------------------------------------------------------------

/**
 * Request a path for an entity identified by ID.
 *
 * This is the high-level "fire and forget" API. It:
 *   1. Looks up the entity and its worldPosition.
 *   2. Uses the global navmesh from YukaManager to find a path.
 *   3. Writes the path into the entity's `navigation` component.
 *
 * The movement system in systems/movement.ts then interpolates the
 * entity along the waypoints each frame.
 *
 * @param entityId       - The entity's `id` field.
 * @param targetPosition - Where the entity should navigate to.
 * @returns True if a path was found and assigned, false otherwise.
 */
export function requestPath(entityId: string, targetPosition: Vec3): boolean {
	const navMesh = YukaManager.navMesh;
	if (!navMesh) {
		console.warn(
			"[PathfindingSystem] No navmesh available. Call YukaManager.setNavMesh() first.",
		);
		return false;
	}

	// Find the entity in the ECS world
	const entity: Entity | undefined = getEntityById(entityId);

	if (!entity) {
		console.warn(
			`[PathfindingSystem] Entity "${entityId}" not found in world.`,
		);
		return false;
	}

	if (!entity.worldPosition) {
		console.warn(
			`[PathfindingSystem] Entity "${entityId}" has no worldPosition.`,
		);
		return false;
	}

	const result = findPath(navMesh, entity.worldPosition, targetPosition);
	if (!result.found) return false;

	// Ensure the entity has a navigation component
	if (!entity.navigation) {
		entity.navigation = {
			path: [],
			pathIndex: 0,
			moving: false,
		};
	}

	entity.navigation.path = result.waypoints;
	entity.navigation.pathIndex = 0;
	entity.navigation.moving = true;

	return true;
}

/**
 * Find a path using the global navmesh (convenience wrapper).
 * Falls back to an empty result if no navmesh is set.
 */
export function findPathGlobal(from: Vec3, to: Vec3): PathResult {
	const navMesh = YukaManager.navMesh;
	if (!navMesh) {
		return { waypoints: [], found: false };
	}
	return findPath(navMesh, from, to);
}
