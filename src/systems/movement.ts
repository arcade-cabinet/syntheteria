import movementConfig from "../config/movement.json";
import {
	AIController,
	Identity,
	Navigation,
	Rotation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { movingUnits } from "../ecs/world";
import { gridToWorld } from "../world/sectorCoordinates";
import { getSectorCell } from "../world/structuralSpace";
import { logTurnEvent } from "./turnEventLog";
import { hasMovementPoints, spendMovementPoints } from "./turnSystem";

/**
 * Look up the MP cost for entering a cell based on its zone type.
 * Uses the same config as the A* pathfinder so costs stay consistent.
 */
function getZoneMovementCost(q: number, r: number): number {
	const cell = getSectorCell(q, r);
	if (!cell) return movementConfig.defaultCost;
	const costs = movementConfig.zoneCosts as Record<string, number>;
	return costs[cell.floor_preset_id] ?? movementConfig.defaultCost;
}

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

		// Gate player movement by MP
		const entityId = entity.get(Identity)?.id;
		const faction = entity.get(Identity)?.faction;
		if (faction === "player" && entityId && !hasMovementPoints(entityId)) {
			nav.moving = false;
			continue;
		}

		const targetGridPosition = nav.path[nav.pathIndex];
		const targetWorld = gridToWorld(targetGridPosition.q, targetGridPosition.r);

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
			// Reached waypoint — spend zone-based MP for player units
			if (faction === "player" && entityId) {
				const mpCost = getZoneMovementCost(
					targetGridPosition.q,
					targetGridPosition.r,
				);
				if (!spendMovementPoints(entityId, mpCost)) {
					nav.moving = false;
					continue;
				}
				logTurnEvent("movement", entityId, "player", {
					fromX: wp.x,
					fromZ: wp.z,
					toQ: targetGridPosition.q,
					toR: targetGridPosition.r,
					mpSpent: mpCost,
				});
			}
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
