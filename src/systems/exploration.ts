import { hasCamera, MapFragment, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import {
	type DiscoveryState,
	getStructuralFragment,
	setDiscoveryAtWorldPosition,
} from "../world/structuralSpace";

/**
 * Exploration system: reveals fog around units based on distance.
 * Camera-equipped robots produce "detailed" fog; others produce "abstract".
 * Operates on the continuous fog grid in each fragment.
 */

const VISION_RADIUS = 6; // world units around the unit

export function explorationSystem() {
	for (const entity of units) {
		const fragment = getStructuralFragment(entity.get(MapFragment)!.fragmentId);
		if (!fragment) continue;

		const wx = entity.get(WorldPosition)?.x;
		const wz = entity.get(WorldPosition)?.z;
		const fogType: DiscoveryState = hasCamera(entity) ? 2 : 1;

		// Reveal cells within vision radius (circle)
		const r = Math.ceil(VISION_RADIUS);
		for (let dz = -r; dz <= r; dz++) {
			for (let dx = -r; dx <= r; dx++) {
				if (dx * dx + dz * dz > VISION_RADIUS * VISION_RADIUS) continue;
				setDiscoveryAtWorldPosition(fragment, wx! + dx, wz! + dz, fogType);
			}
		}
	}
}
