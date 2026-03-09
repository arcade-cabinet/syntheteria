/**
 * Otter system: small furry creatures wander the city ruins and countryside.
 *
 * Each simulation tick, otters count down their wander timer. When it expires
 * they pick a new random heading. They move along the terrain surface and
 * bounce off water or world boundaries.
 */

import { getTerrainHeight, isWalkable, WORLD_HALF } from "../ecs/terrain";
import { otters } from "../ecs/world";

const OTTER_BORDER = 5; // keep otters away from the very edge of the world

export function otterSystem() {
	for (const entity of otters) {
		const o = entity.otter;

		// Stationary otters (quest givers) never move.
		if (o.stationary) {
			o.moving = false;
			continue;
		}
		o.wanderTimer--;

		if (o.wanderTimer <= 0) {
			// Choose a new random heading
			const angle = Math.random() * Math.PI * 2;
			o.wanderDir = { x: Math.cos(angle), z: Math.sin(angle) };
			o.wanderTimer = 3 + Math.floor(Math.random() * 8);
		}

		// Attempt to move forward; set moving flag explicitly in both outcomes.
		const wp = entity.worldPosition;
		const newX = wp.x + o.wanderDir.x * o.speed;
		const newZ = wp.z + o.wanderDir.z * o.speed;

		const clampedX = Math.max(
			-WORLD_HALF + OTTER_BORDER,
			Math.min(WORLD_HALF - OTTER_BORDER, newX),
		);
		const clampedZ = Math.max(
			-WORLD_HALF + OTTER_BORDER,
			Math.min(WORLD_HALF - OTTER_BORDER, newZ),
		);

		if (isWalkable(clampedX, clampedZ)) {
			wp.x = clampedX;
			wp.z = clampedZ;
			wp.y = getTerrainHeight(wp.x, wp.z);
			o.moving = true;
		} else {
			// Hit water or impassable terrain — bounce to a new direction next tick.
			const angle = Math.random() * Math.PI * 2;
			o.wanderDir = { x: Math.cos(angle), z: Math.sin(angle) };
			o.wanderTimer = 1;
			o.moving = false;
		}
	}
}
