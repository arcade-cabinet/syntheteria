/**
 * Exploration system: reveals fog around units based on distance.
 * Camera-equipped robots produce "detailed" fog; others produce "abstract".
 * Operates on the continuous fog grid in each fragment.
 *
 * Vision radius sourced from config/rendering.json fogOfWar section.
 */

import { config } from "../../config";
import { type FogState, getFragment, setFogAt } from "../ecs/terrain";
import { hasCamera } from "../ecs/types";
import { units } from "../ecs/koota/compat";

const VISION_RADIUS = config.rendering.fogOfWar.defaultVisionRange;

export function explorationSystem() {
	for (const entity of units) {
		const fragment = getFragment(entity.mapFragment.fragmentId);
		if (!fragment) continue;

		const wx = entity.worldPosition.x;
		const wz = entity.worldPosition.z;
		const fogType: FogState = hasCamera(entity) ? 2 : 1;

		// Reveal cells within vision radius (circle)
		const r = Math.ceil(VISION_RADIUS);
		for (let dz = -r; dz <= r; dz++) {
			for (let dx = -r; dx <= r; dx++) {
				if (dx * dx + dz * dz > VISION_RADIUS * VISION_RADIUS) continue;
				setFogAt(fragment, wx + dx, wz + dz, fogType);
			}
		}
	}
}
