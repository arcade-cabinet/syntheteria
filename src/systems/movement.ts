import { hexToWorld } from "../ecs/terrain";
import {
	AIController,
	Navigation,
	Rotation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { movingUnits } from "../ecs/world";

export function movementSystem(delta: number, gameSpeed: number) {
	for (const entity of movingUnits) {
		if (entity.get(AIController)?.enabled) {
			continue;
		}
		const nav = entity.get(Navigation)!;
		if (!nav.moving || nav.pathIndex >= nav.path.length) {
			nav.moving = false;
			continue;
		}

		const targetGridPosition = nav.path[nav.pathIndex];
		const targetWorld = hexToWorld(targetGridPosition.q, targetGridPosition.r);

		const wp = entity.get(WorldPosition)!;
		const step = entity.get(Unit)!.speed * delta * gameSpeed;

		const dx = targetWorld.x - wp.x;
		const dz = targetWorld.z - wp.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		// Turn to face target
		const rot = entity.get(Rotation);
		if (rot && dist > 0.01) {
			rot.y = Math.atan2(dx, dz);
		}

		if (dist <= step) {
			// Reached waypoint
			wp.x = targetWorld.x;
			wp.z = targetWorld.z;
			wp.y = targetWorld.y;
			nav.pathIndex++;
			if (nav.pathIndex >= nav.path.length) {
				nav.moving = false;
			}
		} else {
			// Move toward waypoint
			wp.x += (dx / dist) * step;
			wp.z += (dz / dist) * step;
			wp.y = targetWorld.y;
		}
	}
}
