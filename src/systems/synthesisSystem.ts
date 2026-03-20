/**
 * Synthesizer material fusion system.
 *
 * Powered synthesizers convert common materials into advanced ones
 * using defined fusion recipes. Each turn during the environment phase,
 * queued conversions on powered synthesizers are resolved: inputs are
 * already spent at queue time, outputs are deposited into the faction
 * resource pool.
 */

import type { World } from "koota";
import { trait } from "koota";
import { playSfx } from "../audio/sfx";
import type { ResourceMaterial } from "../terrain/types";
import { Building, Powered } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { addResources, canAfford, spendResources } from "./resourceSystem";

// ─── Recipes ────────────────────────────────────────────────────────────────

export interface FusionRecipe {
	id: string;
	label: string;
	inputs: Partial<Record<ResourceMaterial, number>>;
	outputs: Partial<Record<ResourceMaterial, number>>;
}

export const FUSION_RECIPES: readonly FusionRecipe[] = [
	{
		id: "alloy_fusion",
		label: "Alloy Fusion",
		inputs: { ferrous_scrap: 3, conductor_wire: 2 },
		outputs: { alloy_stock: 2 },
	},
	{
		id: "polymer_reclamation",
		label: "Polymer Reclamation",
		inputs: { scrap_metal: 2, conductor_wire: 1 },
		outputs: { polymer_salvage: 2 },
	},
	{
		id: "wafer_fabrication",
		label: "Wafer Fabrication",
		inputs: { e_waste: 3, polymer_salvage: 2 },
		outputs: { silicon_wafer: 1 },
	},
	{
		id: "storm_capacitor",
		label: "Storm Capacitor",
		inputs: { ferrous_scrap: 5, electrolyte: 3 },
		outputs: { storm_charge: 1 },
	},
	{
		id: "crystal_synthesis",
		label: "Crystal Synthesis",
		inputs: { silicon_wafer: 4, storm_charge: 2 },
		outputs: { el_crystal: 1 },
	},
] as const;

// ─── Queue Trait ─────────────────────────────────────────────────────────────

/** Queued fusion conversion on a synthesizer building. */
export const SynthesisQueue = trait({
	recipeId: "",
	ticksRemaining: 3,
});

// ─── Queue Action ───────────────────────────────────────────────────────────

/**
 * Queue a fusion recipe on a synthesizer building.
 * Spends input resources immediately. Returns true on success.
 */
export function queueSynthesis(
	world: World,
	buildingEntityId: number,
	recipeId: string,
): boolean {
	const recipe = FUSION_RECIPES.find((r) => r.id === recipeId);
	if (!recipe) return false;

	// Find the synthesizer building entity
	let buildingEntity = null;
	for (const e of world.query(Building, Powered)) {
		if (e.id() === buildingEntityId) {
			buildingEntity = e;
			break;
		}
	}
	if (!buildingEntity) return false;

	const b = buildingEntity.get(Building);
	if (!b || b.buildingType !== "synthesizer") return false;

	// Already has a queued conversion
	if (buildingEntity.has(SynthesisQueue)) return false;

	// Check and spend inputs
	if (!canAfford(world, b.factionId, recipe.inputs)) return false;

	for (const [mat, amount] of Object.entries(recipe.inputs)) {
		if (!spendResources(world, b.factionId, mat as ResourceMaterial, amount!)) {
			return false;
		}
	}

	// Queue the conversion
	buildingEntity.add(SynthesisQueue({ recipeId, ticksRemaining: 3 }));
	playSfx("harvest_complete");
	return true;
}

// ─── Per-Turn Processing ────────────────────────────────────────────────────

/**
 * Process queued synthesis conversions on powered synthesizers.
 * Called each turn during the environment phase.
 */
export function runSynthesis(world: World): void {
	for (const entity of world.query(Building, SynthesisQueue, Powered)) {
		const b = entity.get(Building);
		const sq = entity.get(SynthesisQueue);
		if (!b || !sq) continue;

		const remaining = sq.ticksRemaining - 1;
		if (remaining > 0) {
			entity.set(SynthesisQueue, { ...sq, ticksRemaining: remaining });
			continue;
		}

		// Conversion complete — deposit outputs
		const recipe = FUSION_RECIPES.find((r) => r.id === sq.recipeId);
		if (recipe) {
			for (const [mat, amount] of Object.entries(recipe.outputs)) {
				addResources(world, b.factionId, mat as ResourceMaterial, amount!);
			}
			pushTurnEvent(`Synthesis complete: ${recipe.label}`);
		}

		entity.remove(SynthesisQueue);
	}
}
