/**
 * Exploration system: reveals fog around units based on distance.
 * Camera-equipped robots produce "detailed" fog; others produce "abstract".
 * Operates on the continuous fog grid in each fragment.
 */

import { type FogState, getFragment, setFogAt } from "../ecs/terrain";
import { Fragment, Position, Unit, UnitComponents } from "../ecs/traits";
import { hasCamera, parseComponents } from "../ecs/types";
import { world } from "../ecs/world";

const VISION_RADIUS = 6; // world units around the unit

export function explorationSystem() {
	for (const entity of world.query(Position, Unit, Fragment, UnitComponents)) {
		const fragTrait = entity.get(Fragment)!;
		const fragment = getFragment(fragTrait.fragmentId);
		if (!fragment) continue;

		const pos = entity.get(Position)!;
		const components = parseComponents(
			entity.get(UnitComponents)?.componentsJson,
		);
		const fogType: FogState = hasCamera(components) ? 2 : 1;

		// Reveal cells within vision radius (circle)
		const r = Math.ceil(VISION_RADIUS);
		for (let dz = -r; dz <= r; dz++) {
			for (let dx = -r; dx <= r; dx++) {
				if (dx * dx + dz * dz > VISION_RADIUS * VISION_RADIUS) continue;
				setFogAt(fragment, pos.x + dx, pos.z + dz, fogType);
			}
		}
	}
}
