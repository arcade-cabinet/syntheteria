/**
 * @module cultCorruption
 *
 * Corruption spreading from corruption nodes and destroyed structure cleanup.
 */

import type { World } from "koota";
import { CultStructure } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { altarZones, corruptedTiles } from "./cultConstants";
import {
	checkAllCultsDestroyed,
	fireCultEncounter,
} from "./cultEncounterTracker";

// ---------------------------------------------------------------------------
// Structure destruction — check for structures reduced to 0 HP
// ---------------------------------------------------------------------------

/**
 * Remove destroyed cult structures and log events.
 * Called each turn from the environment phase.
 */
export function cleanupDestroyedStructures(world: World): void {
	let anyDestroyed = false;
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s) continue;
		if (s.hp <= 0) {
			pushTurnEvent(
				`${s.structureType.replace(/_/g, " ")} destroyed at (${s.tileX}, ${s.tileZ})`,
			);
			altarZones.delete(`${s.tileX},${s.tileZ}`);
			e.destroy();
			anyDestroyed = true;
		}
	}
	if (anyDestroyed) {
		checkAllCultsDestroyed(world);
	}
}

// ---------------------------------------------------------------------------
// Corruption spreading
// ---------------------------------------------------------------------------

export function spreadCorruption(world: World): void {
	const prevSize = corruptedTiles.size;
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s || s.structureType !== "corruption_node") continue;
		const r = s.corruptionRadius;
		for (let dx = -r; dx <= r; dx++) {
			for (let dz = -r; dz <= r; dz++) {
				if (Math.abs(dx) + Math.abs(dz) <= r) {
					corruptedTiles.add(`${s.tileX + dx},${s.tileZ + dz}`);
				}
			}
		}
	}
	if (corruptedTiles.size > prevSize) {
		fireCultEncounter(world, "cult_corruption_spread");
	}
}
