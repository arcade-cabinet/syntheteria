/**
 * Place salvage props during world init based on terrain type.
 *
 * Salvage props are the PRIMARY resource source. Density and type
 * vary by terrain substrate:
 *   structural_mass  → machinery, terminals (advanced yields)
 *   collapsed_zone   → debris (common yields)
 *   transit_deck     → containers (polymer, scrap)
 *   dust_district    → vessels (electrolyte)
 *   durasteel_span   → containers, debris (mixed)
 *   bio_district     → debris (polymer heavy)
 *   aerostructure    → machinery (ferrous heavy)
 *   abyssal_platform → vessels (abyssal yields)
 *   void_pit         → nothing
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../board/types";
import { SALVAGE_DEFS } from "../resources";
import { makePRNG } from "../seed";
import type { FloorType } from "../terrain/types";
import { SalvageProp, type SalvageType } from "../traits";

// ─── Scatter config ─────────────────────────────────────────────────────────

interface TerrainSalvageConfig {
	readonly rate: number;
	readonly weights: ReadonlyArray<readonly [SalvageType, number]>;
}

const TERRAIN_SALVAGE: Record<FloorType, TerrainSalvageConfig> = {
	mountain: {
		rate: 0.6,
		weights: [
			["machinery", 0.4],
			["terminal", 0.3],
			["container", 0.2],
			["debris", 0.1],
		],
	},
	ruins: {
		rate: 0.5,
		weights: [
			["debris", 0.5],
			["container", 0.3],
			["vessel", 0.2],
		],
	},
	grassland: {
		rate: 0.35,
		weights: [
			["container", 0.3],
			["debris", 0.4],
			["machinery", 0.2],
			["terminal", 0.1],
		],
	},
	forest: {
		rate: 0.3,
		weights: [
			["debris", 0.5],
			["vessel", 0.3],
			["container", 0.2],
		],
	},
	desert: {
		rate: 0.45,
		weights: [
			["vessel", 0.4],
			["debris", 0.3],
			["container", 0.2],
			["machinery", 0.1],
		],
	},
	hills: {
		rate: 0.4,
		weights: [
			["container", 0.4],
			["debris", 0.3],
			["vessel", 0.2],
			["terminal", 0.1],
		],
	},
	wetland: {
		rate: 0.25,
		weights: [
			["vessel", 0.5],
			["debris", 0.3],
			["machinery", 0.2],
		],
	},
	tundra: {
		rate: 0.4,
		weights: [
			["machinery", 0.5],
			["debris", 0.3],
			["container", 0.2],
		],
	},
	water: {
		rate: 0,
		weights: [],
	},
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Hash a tile position + board seed into a deterministic PRNG seed.
 * Different tiles get independent sequences.
 */
function tileSeed(x: number, z: number, boardSeed: string): number {
	let h = 2166136261;
	for (let i = 0; i < boardSeed.length; i++) {
		h ^= boardSeed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	h ^= x;
	h = Math.imul(h, 16777619);
	h ^= z;
	h = Math.imul(h, 16777619);
	// Extra mix for "salvage" purpose
	h ^= 0x5a1a6e;
	h = Math.imul(h, 16777619);
	return h >>> 0;
}

/** Pick a salvage type from weighted distribution using a [0,1) roll. */
function pickSalvageType(
	weights: ReadonlyArray<readonly [SalvageType, number]>,
	roll: number,
): SalvageType {
	let cumulative = 0;
	for (const [type, weight] of weights) {
		cumulative += weight;
		if (roll < cumulative) return type;
	}
	// Fallback to last entry (rounding errors)
	return weights[weights.length - 1]![0];
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Scatter salvage props across the board based on terrain type.
 * Returns the number of salvage entities spawned.
 */
export function placeSalvageProps(world: World, board: GeneratedBoard): number {
	const { width, height, seed } = board.config;
	let count = 0;

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]![x]!;
			const cfg = TERRAIN_SALVAGE[tile.floorType];
			if (!cfg || cfg.rate === 0) continue;

			// Per-tile deterministic RNG
			const rng = makePRNG(tileSeed(x, z, seed));

			// Scatter check
			if (rng() >= cfg.rate) continue;

			// Pick salvage type
			const salvageType = pickSalvageType(cfg.weights, rng());

			// Pick model from available models for this type
			const def = SALVAGE_DEFS[salvageType];
			const modelIdx = Math.floor(rng() * def.models.length);
			const modelId = def.models[modelIdx]!;

			world.spawn(
				SalvageProp({
					tileX: x,
					tileZ: z,
					salvageType,
					modelId,
					harvestDuration: def.harvestDuration,
					hp: def.hp,
					maxHp: def.hp,
					consumed: false,
				}),
			);
			count++;
		}
	}

	return count;
}

/** Exported for testing. */
export { TERRAIN_SALVAGE };
