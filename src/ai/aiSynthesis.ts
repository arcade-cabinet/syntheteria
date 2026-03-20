/**
 * AI synthesis subsystem -- auto-queues material conversions on idle synthesizers.
 *
 * Only synthesizes when the faction has EXCESS raw materials.
 * Reserves enough for at least one cheap building so synthesis
 * doesn't starve the build pipeline.
 */

import type { World } from "koota";
import {
	canAfford,
	FUSION_RECIPES,
	queueSynthesis,
	SynthesisQueue,
} from "../systems";
import { Building, Faction, Powered, ResourcePool } from "../traits";
import { isCultFactionId } from "./aiHelpers";

// ---------------------------------------------------------------------------
// Priority + reserves
// ---------------------------------------------------------------------------

/**
 * Synthesis priority: produce the refined materials most needed for
 * upcoming builds. steel unlocks motor_pool and analysis_node.
 * timber unlocks storage_hub. glass unlocks analysis_node.
 */
const SYNTHESIS_PRIORITY: readonly string[] = [
	"alloy_fusion", // iron_ore -> steel (most needed)
	"polymer_reclamation", // stone -> timber
	"wafer_fabrication", // circuits -> glass
	"storm_capacitor", // iron_ore -> fuel
	"crystal_synthesis", // glass -> quantum_crystal (late game)
];

// Resource floor: keep at least this much of each material in reserve
// so buildings can be afforded. Values match the most expensive single-material
// requirement across common buildings.
const RESERVE: Partial<Record<string, number>> = {
	iron_ore: 8,
	circuits: 6,
	stone: 4,
	timber: 5,
	steel: 4,
};

// ---------------------------------------------------------------------------
// Synthesis execution
// ---------------------------------------------------------------------------

/**
 * For each AI faction, find powered synthesizers with no active queue
 * and start the highest-priority affordable recipe.
 */
export function runAiSynthesis(world: World, factionIds: string[]): void {
	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Check faction resource levels -- only synthesize if above reserve
		let pool: Record<string, number> | null = null;
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id !== factionId) continue;
			const r = e.get(ResourcePool);
			if (r) pool = r as unknown as Record<string, number>;
			break;
		}
		if (!pool) continue;

		// Find idle powered synthesizers for this faction
		for (const e of world.query(Building, Powered)) {
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			if (b.buildingType !== "synthesizer") continue;
			if (e.has(SynthesisQueue)) continue; // Already converting

			// Try each recipe in priority order
			for (const recipeId of SYNTHESIS_PRIORITY) {
				const recipe = FUSION_RECIPES.find((r) => r.id === recipeId);
				if (!recipe) continue;

				// Check canAfford AND that spending won't drop below reserve
				if (!canAfford(world, factionId, recipe.inputs)) continue;

				let belowReserve = false;
				for (const [mat, amount] of Object.entries(recipe.inputs)) {
					const current = (pool[mat] as number) ?? 0;
					const reserve = RESERVE[mat] ?? 0;
					if (current - (amount ?? 0) < reserve) {
						belowReserve = true;
						break;
					}
				}
				if (belowReserve) continue;

				queueSynthesis(world, e.id(), recipeId);
				break; // One recipe per synthesizer per turn
			}
		}
	}
}
