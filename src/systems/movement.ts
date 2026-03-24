/**
 * Movement system: interpolates unit worldPosition along navigation path waypoints.
 * Runs per-frame in useFrame, not per sim tick.
 */

import { getTerrainHeight } from "../ecs/terrain";
import { Navigation, Position, Unit } from "../ecs/traits";
import { parsePath } from "../ecs/types";
import { world } from "../ecs/world";

export function movementSystem(delta: number, gameSpeed: number) {
	for (const entity of world.query(Position, Navigation, Unit)) {
		const nav = entity.get(Navigation)!;
		if (!nav.moving || nav.pathIndex >= parsePath(nav.pathJson).length) {
			if (nav.moving) {
				entity.set(Navigation, { moving: false });
			}
			continue;
		}

		const path = parsePath(nav.pathJson);
		const target = path[nav.pathIndex];
		const wp = entity.get(Position)!;
		const unit = entity.get(Unit)!;
		const step = unit.speed * delta * gameSpeed;

		const dx = target.x - wp.x;
		const dz = target.z - wp.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist <= step) {
			// Reached waypoint
			const newY = getTerrainHeight(target.x, target.z);
			const newPathIndex = nav.pathIndex + 1;
			entity.set(Position, { x: target.x, y: newY, z: target.z });
			entity.set(Navigation, {
				pathIndex: newPathIndex,
				moving: newPathIndex < path.length,
			});
		} else {
			// Move toward waypoint
			const newX = wp.x + (dx / dist) * step;
			const newZ = wp.z + (dz / dist) * step;
			const newY = getTerrainHeight(newX, newZ);
			entity.set(Position, { x: newX, y: newY, z: newZ });
		}
	}
}
