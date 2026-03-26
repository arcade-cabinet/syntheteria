/**
 * Pathfinding interface — delegates to navmesh.
 * Provides a simple findPath(start, goal) → Vec3[] API.
 */

import { getTerrainHeight } from "../ecs/terrain";
import type { Vec3 } from "../ecs/types";
import { findNavPath } from "./navmesh";

/**
 * Find a path from start to goal in world space.
 * Returns array of Vec3 waypoints with terrain Y heights, or empty if no path.
 */
export function findPath(start: Vec3, goal: Vec3): Vec3[] {
	const path = findNavPath(start.x, start.z, goal.x, goal.z);

	// Apply terrain height to each waypoint
	for (const p of path) {
		p.y = getTerrainHeight(p.x, p.z);
	}

	return path;
}
