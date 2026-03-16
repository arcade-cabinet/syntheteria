/**
 * @module exploration
 *
 * Fog-of-war revelation system. Each tick, reveals discovery cells around all units
 * based on vision radius. Camera-equipped bots reveal "detailed" fog; others reveal
 * "abstract". Scouts get 2x vision radius.
 *
 * @exports explorationSystem - Per-tick fog revelation
 * @exports getVisionRadius - Compute vision radius for a unit type (scout bonus)
 *
 * @dependencies bots/definitions (getBotDefinition), ecs/traits, ecs/world,
 *   world/structuralSpace (setDiscoveryAtWorldPosition)
 * @consumers gameState (explorationSystem tick)
 */
import { getBotDefinition } from "../bots/definitions";
import { hasCamera, MapFragment, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import {
	type DiscoveryState,
	getStructuralFragment,
	setDiscoveryAtWorldPosition,
} from "../world/structuralSpace";

const BASE_VISION_RADIUS = 6; // world units around the unit
const SCOUT_VISION_MULTIPLIER = 2;

/**
 * Resolve the vision radius for a unit. Scouts get 2x base radius.
 */
export function getVisionRadius(unitType: string | null | undefined): number {
	if (!unitType) return BASE_VISION_RADIUS;
	const definition = getBotDefinition(
		unitType as Parameters<typeof getBotDefinition>[0],
	);
	if (definition?.role === "scout") {
		return BASE_VISION_RADIUS * SCOUT_VISION_MULTIPLIER;
	}
	return BASE_VISION_RADIUS;
}

export function explorationSystem() {
	for (const entity of units) {
		const fragment = getStructuralFragment(entity.get(MapFragment)!.fragmentId);
		if (!fragment) continue;

		const wx = entity.get(WorldPosition)?.x;
		const wz = entity.get(WorldPosition)?.z;
		const unitType = entity.get(Unit)?.type ?? null;
		const fogType: DiscoveryState = hasCamera(entity) ? 2 : 1;
		const visionRadius = getVisionRadius(unitType);

		// Reveal cells within vision radius (circle)
		const r = Math.ceil(visionRadius);
		for (let dz = -r; dz <= r; dz++) {
			for (let dx = -r; dx <= r; dx++) {
				if (dx * dx + dz * dz > visionRadius * visionRadius) continue;
				setDiscoveryAtWorldPosition(fragment, wx! + dx, wz! + dz, fogType);
			}
		}
	}
}
