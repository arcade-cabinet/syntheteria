/**
 * AI synthesis subsystem -- auto-queues material conversions on idle synthesizers.
 *
 * Selects recipes based on what the faction is LOWEST on, not a fixed priority.
 * Reserves enough for at least one cheap building so synthesis
 * doesn't starve the build pipeline.
 */

import type { World } from "koota";
import {
	canAfford,
	FUSION_RECIPES,
	type FusionRecipe,
	queueSynthesis,
	SynthesisQueue,
} from "../systems";
import { Building, Faction, Powered, ResourcePool } from "../traits";
import { isCultFactionId } from "./aiHelpers";

const RESERVE: Partial<Record<string, number>> = {
	iron_ore: 6,
	coal: 4,
	stone: 3,
	sand: 3,
	timber: 4,
	circuits: 4,
	steel: 3,
	glass: 2,
	fuel: 2,
};

const CRITICAL_OUTPUTS: readonly string[] = [
	"steel",
	"glass",
	"circuits",
	"fuel",
	"concrete",
	"alloy",
	"quantum_crystal",
];

/**
 * Pick the best synthesis recipe for a faction based on what output material
 * it has the least of. Ensures diverse production rather than always making steel.
 */
function pickBestRecipe(
	pool: Record<string, number>,
	world: World,
	factionId: string,
): FusionRecipe | null {
	let bestRecipe: FusionRecipe | null = null;
	let bestNeed = -1;

	for (const recipe of FUSION_RECIPES) {
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

		// Score this recipe by how much the faction needs its output
		let need = 0;
		for (const [mat, amount] of Object.entries(recipe.outputs)) {
			if (!amount) continue;
			const current = (pool[mat] as number) ?? 0;
			const criticality = CRITICAL_OUTPUTS.indexOf(mat);
			// Lower stockpile = higher need; critical materials get a boost
			const materialNeed = Math.max(0, 20 - current);
			const critBoost = criticality >= 0 ? (7 - criticality) * 3 : 0;
			need += materialNeed + critBoost;
		}

		if (need > bestNeed) {
			bestNeed = need;
			bestRecipe = recipe;
		}
	}

	return bestRecipe;
}

/**
 * For each AI faction, find powered synthesizers with no active queue
 * and start the recipe that produces the material the faction needs most.
 */
export function runAiSynthesis(world: World, factionIds: string[]): void {
	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		let pool: Record<string, number> | null = null;
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id !== factionId) continue;
			const r = e.get(ResourcePool);
			if (r) pool = r as unknown as Record<string, number>;
			break;
		}
		if (!pool) continue;

		for (const e of world.query(Building, Powered)) {
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			if (b.buildingType !== "synthesizer") continue;
			if (e.has(SynthesisQueue)) continue;

			const recipe = pickBestRecipe(pool, world, factionId);
			if (recipe) {
				queueSynthesis(world, e.id(), recipe.id);
			}
		}
	}
}
