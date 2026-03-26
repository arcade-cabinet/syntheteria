/**
 * Movement system: interpolates unit worldPosition along navigation path waypoints.
 * Runs per-frame in useFrame, not per sim tick.
 */

import { getTerrainHeight } from "../ecs/terrain";
import { movingUnits } from "../ecs/world";

export function movementSystem(delta: number, gameSpeed: number) {
	for (const entity of movingUnits) {
		const nav = entity.navigation;
		if (!nav.moving || nav.pathIndex >= nav.path.length) {
			nav.moving = false;
			continue;
		}

		const target = nav.path[nav.pathIndex];
		const wp = entity.worldPosition;
		const step = entity.unit.speed * delta * gameSpeed;

		const dx = target.x - wp.x;
		const dz = target.z - wp.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist <= step) {
			// Reached waypoint
			wp.x = target.x;
			wp.z = target.z;
			wp.y = getTerrainHeight(wp.x, wp.z);
			nav.pathIndex++;
			if (nav.pathIndex >= nav.path.length) {
				nav.moving = false;
			}
		} else {
			// Move toward waypoint
			wp.x += (dx / dist) * step;
			wp.z += (dz / dist) * step;
			wp.y = getTerrainHeight(wp.x, wp.z);
		}
	}
}
