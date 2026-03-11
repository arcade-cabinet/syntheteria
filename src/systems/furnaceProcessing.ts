/**
 * Furnace smelting timer and output system (US-015).
 *
 * Drives the processing loop: when a furnace is powered and has items in its
 * hopper, it pops the first item, looks up the matching smelting recipe,
 * advances a timer each tick, and on completion produces an output cube at
 * the furnace's output position (furnace position + offset).
 *
 * After completing, the next hopper item is auto-started if available.
 *
 * Recipes are gated by tech tier. furnace.json tiers carry a `techRequired`
 * field (0 = always available; N = requires at least one researched tech of
 * tier N or higher). Call getAvailableRecipes(researchedTechIds) to build a
 * filtered recipe list, then pass it to startSmelting / updateFurnaceProcessing.
 *
 * Config references:
 *   config/furnace.json     (tiers, techRequired per tier)
 *   config/technology.json  (tech tree, tier per tech node)
 */

import furnaceConfig from "../../config/furnace.json";
import technologyConfig from "../../config/technology.json";
import { getFurnace } from "./furnace";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Audio helper — fire-and-forget; never throws into gameplay code
// ---------------------------------------------------------------------------

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Audio / event integration must never crash gameplay
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Vec3 = { x: number; y: number; z: number };

/** A single smelting recipe mapping an input material to an output. */
export interface SmeltingRecipe {
	/** Material type string that goes into the hopper (e.g. "scrap_iron") */
	input: string;
	/** Material type string produced on completion (e.g. "iron_plate") */
	output: string;
	/** Time in seconds to smelt this recipe */
	smeltTime: number;
	/** Furnace tier this recipe belongs to */
	furnaceTier: number;
}

/** Result returned by updateFurnaceProcessing when a smelt completes. */
export interface SmeltingResult {
	completed: boolean;
	outputMaterial?: string;
	outputPosition?: Vec3;
}

/** Internal processing state tracked per furnace. */
interface ProcessingState {
	/** Material currently being smelted */
	inputMaterial: string;
	/** Output material that will be produced */
	outputMaterial: string;
	/** Total smelt time required (seconds) */
	smeltTime: number;
	/** Elapsed time so far (seconds) */
	elapsed: number;
	/** Whether this furnace is powered */
	powered: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Y-offset from furnace position where output cubes appear. */
const OUTPUT_OFFSET_Y = 1.0;
/** Z-offset from furnace position where output cubes appear. */
const OUTPUT_OFFSET_Z = 1.5;

// ---------------------------------------------------------------------------
// Tech tier index — built once at module load
// ---------------------------------------------------------------------------

/**
 * Map from tech ID -> its tier number.
 * Sourced from config/technology.json techTree[].tier.
 */
const TECH_TIER_MAP: ReadonlyMap<string, number> = new Map(
	(
		technologyConfig.techTree as Array<{ id: string; tier: number }>
	).map((t) => [t.id, t.tier]),
);

// ---------------------------------------------------------------------------
// Pure tech-gating helpers (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Return true if the set of researched tech IDs satisfies `techRequired`.
 *
 * Rules:
 *  - techRequired === 0  → always unlocked (no tech needed)
 *  - techRequired === N  → at least one researched tech must have tier >= N
 *
 * @param techRequired    - minimum tech tier required (from furnace.json tier entry)
 * @param researchedTechs - set/array of researched tech IDs for the querying faction
 */
export function isTierUnlocked(
	techRequired: number,
	researchedTechs: ReadonlySet<string> | readonly string[],
): boolean {
	if (techRequired === 0) return true;

	const ids =
		researchedTechs instanceof Set
			? researchedTechs
			: new Set(researchedTechs);

	for (const techId of ids) {
		const tier = TECH_TIER_MAP.get(techId);
		if (tier !== undefined && tier >= techRequired) {
			return true;
		}
	}
	return false;
}

/**
 * Build the list of all recipes in a given furnace tier entry.
 * Each recipe stores the first input material and the output.
 */
function recipesForTier(
	tierKey: string,
	tierData: {
		techRequired: number;
		recipes: Record<
			string,
			{ inputs: Record<string, number>; output: string; time: number }
		>;
	},
): SmeltingRecipe[] {
	const tierNum = Number(tierKey);
	return Object.values(tierData.recipes).map((r) => ({
		input: Object.keys(r.inputs)[0],
		output: r.output,
		smeltTime: r.time,
		furnaceTier: tierNum,
	}));
}

/**
 * Return all recipes available given the provided set of researched tech IDs.
 *
 * Recipes from a furnace tier are included only when that tier's `techRequired`
 * is satisfied. Tier 1 (techRequired: 0) is always included.
 * Deduplicates by input material — first tier occurrence wins.
 *
 * This is a pure function: no side effects, safe to call from tests.
 *
 * @param researchedTechs - researched tech IDs for the querying faction
 */
export function getAvailableRecipes(
	researchedTechs: ReadonlySet<string> | readonly string[] = [],
): SmeltingRecipe[] {
	const seen = new Set<string>();
	const recipes: SmeltingRecipe[] = [];

	for (const [tierKey, tierData] of Object.entries(
		furnaceConfig.tiers as Record<
			string,
			{
				techRequired: number;
				recipes: Record<
					string,
					{ inputs: Record<string, number>; output: string; time: number }
				>;
			}
		>,
	)) {
		if (!isTierUnlocked(tierData.techRequired, researchedTechs)) continue;

		for (const recipe of recipesForTier(tierKey, tierData)) {
			if (!seen.has(recipe.input)) {
				seen.add(recipe.input);
				recipes.push(recipe);
			}
		}
	}

	return recipes;
}

/**
 * All recipes across ALL furnace tiers (no tech gating).
 * Equivalent to DEFAULT_RECIPES but with furnaceTier populated.
 * Exported for test reference.
 */
export const ALL_RECIPES: SmeltingRecipe[] = (() => {
	const seen = new Set<string>();
	const recipes: SmeltingRecipe[] = [];
	for (const [tierKey, tierData] of Object.entries(
		furnaceConfig.tiers as Record<
			string,
			{
				techRequired: number;
				recipes: Record<
					string,
					{ inputs: Record<string, number>; output: string; time: number }
				>;
			}
		>,
	)) {
		for (const recipe of recipesForTier(tierKey, tierData as Parameters<typeof recipesForTier>[1])) {
			if (!seen.has(recipe.input)) {
				seen.add(recipe.input);
				recipes.push(recipe);
			}
		}
	}
	return recipes;
})();

/**
 * Recipes available with no tech research (furnace tier 1 only).
 * Preserves the original export name used throughout the codebase.
 */
export const DEFAULT_RECIPES: SmeltingRecipe[] = getAvailableRecipes([]);

// ---------------------------------------------------------------------------
// Recipe unlock notification helper
// ---------------------------------------------------------------------------

/**
 * Emit `recipe_unlocked` events for any furnace tiers that transition from
 * locked to unlocked as a result of newly researched techs.
 *
 * Call this from the tech research system whenever a tech completes.
 *
 * @param prevResearched - tech IDs researched BEFORE the update
 * @param nextResearched - tech IDs researched AFTER the update (superset)
 * @param tick           - current game tick (for the event payload)
 */
export function notifyNewlyUnlockedRecipes(
	prevResearched: ReadonlySet<string> | readonly string[],
	nextResearched: ReadonlySet<string> | readonly string[],
	tick = 0,
): void {
	const tiers = furnaceConfig.tiers as Record<
		string,
		{
			techRequired: number;
			recipes: Record<
				string,
				{ inputs: Record<string, number>; output: string; time: number }
			>;
		}
	>;

	for (const [tierKey, tierData] of Object.entries(tiers)) {
		if (tierData.techRequired === 0) continue; // always unlocked — no event needed

		const wasBefore = isTierUnlocked(tierData.techRequired, prevResearched);
		const isNow = isTierUnlocked(tierData.techRequired, nextResearched);

		if (!wasBefore && isNow) {
			const recipeIds = Object.keys(tierData.recipes);
			safeEmit({
				type: "recipe_unlocked",
				furnaceTier: Number(tierKey),
				techRequired: tierData.techRequired,
				recipeIds,
				tick,
			});
		}
	}
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const processingStates = new Map<string, ProcessingState>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findRecipe(
	material: string,
	recipes: SmeltingRecipe[],
): SmeltingRecipe | undefined {
	return recipes.find((r) => r.input === material);
}

function computeOutputPosition(furnacePosition: Vec3): Vec3 {
	return {
		x: furnacePosition.x,
		y: furnacePosition.y + OUTPUT_OFFSET_Y,
		z: furnacePosition.z + OUTPUT_OFFSET_Z,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start smelting the first item in the furnace's hopper.
 *
 * Pops the front of the hopper queue, finds a matching recipe in `recipes`,
 * and begins the smelting timer. If the item has no matching recipe (including
 * because its tier is not yet unlocked), the item is returned to the front of
 * the hopper and false is returned.
 *
 * Pass the result of `getAvailableRecipes(researchedTechs)` as `recipes` to
 * enforce tech gating. Defaults to DEFAULT_RECIPES (tier-1 only).
 *
 * @param furnaceId - ID of the furnace to start smelting on
 * @param recipes   - recipe list to match against (tech-filtered)
 * @returns true if smelting started, false if hopper empty / no recipe / furnace not found
 */
export function startSmelting(
	furnaceId: string,
	recipes: SmeltingRecipe[] = DEFAULT_RECIPES,
): boolean {
	const furnace = getFurnace(furnaceId);
	if (!furnace) {
		return false;
	}

	// Already processing — don't start another
	if (furnace.isProcessing) {
		return false;
	}

	// Need at least one item in the hopper
	if (furnace.hopperQueue.length === 0) {
		return false;
	}

	// Pop the first item
	const material = furnace.hopperQueue.shift()!;

	// Look up recipe in the provided (potentially tech-filtered) list
	const recipe = findRecipe(material, recipes);
	if (!recipe) {
		// No recipe found — put the material back at the front
		furnace.hopperQueue.unshift(material);
		return false;
	}

	// Create processing state
	const state: ProcessingState = {
		inputMaterial: material,
		outputMaterial: recipe.output,
		smeltTime: recipe.smeltTime,
		elapsed: 0,
		powered: furnace.isPowered,
	};
	processingStates.set(furnaceId, state);

	// Update furnace data
	furnace.isProcessing = true;
	furnace.currentItem = material;
	furnace.progress = 0;

	return true;
}

/**
 * Advance the smelting timer for a furnace.
 *
 * Only advances when the furnace is powered. When the timer reaches the
 * recipe's smeltTime, the smelt completes: the furnace is reset, and the
 * result includes the output material and position.
 *
 * After completion, if the hopper still has items, auto-starts the next.
 *
 * @param furnaceId - ID of the furnace
 * @param delta     - time elapsed this tick (seconds)
 * @param recipes   - recipe list for auto-start (must match what was used for startSmelting)
 * @returns SmeltingResult with completed=true on finish, or null if not processing / not found
 */
export function updateFurnaceProcessing(
	furnaceId: string,
	delta: number,
	recipes: SmeltingRecipe[] = DEFAULT_RECIPES,
): SmeltingResult | null {
	const furnace = getFurnace(furnaceId);
	if (!furnace) {
		return null;
	}

	const state = processingStates.get(furnaceId);
	if (!state) {
		return null;
	}

	// Not powered — timer does NOT advance
	if (!furnace.isPowered) {
		return { completed: false };
	}

	// Advance timer
	state.elapsed += delta;

	// Check completion
	if (state.elapsed >= state.smeltTime) {
		const outputMaterial = state.outputMaterial;
		const inputMaterial = state.inputMaterial;
		const outputPosition = computeOutputPosition(furnace.position);

		// Reset furnace state
		furnace.isProcessing = false;
		furnace.currentItem = null;
		furnace.progress = 0;

		// Remove processing state
		processingStates.delete(furnaceId);

		safeEmit({
			type: "smelting_complete",
			furnaceId,
			inputMaterial,
			outputMaterial,
			tick: 0,
		});

		// Auto-start next hopper item if available
		if (furnace.hopperQueue.length > 0) {
			startSmelting(furnaceId, recipes);
		}

		return {
			completed: true,
			outputMaterial,
			outputPosition,
		};
	}

	// Update progress on furnace data (0..1)
	furnace.progress = state.elapsed / state.smeltTime;

	return { completed: false };
}

/**
 * Set whether a furnace is powered.
 *
 * When unpowered, updateFurnaceProcessing will not advance the timer.
 *
 * @param furnaceId - ID of the furnace
 * @param powered   - whether the furnace is powered
 */
export function setFurnacePowered(furnaceId: string, powered: boolean): void {
	const furnace = getFurnace(furnaceId);
	if (!furnace) {
		return;
	}
	furnace.isPowered = powered;
}

/**
 * Get the current smelting progress for a furnace (0.0 to 1.0).
 *
 * Returns 0 if the furnace is not processing or not found.
 *
 * @param furnaceId - ID of the furnace
 * @returns progress ratio 0.0..1.0
 */
export function getSmeltingProgress(furnaceId: string): number {
	const furnace = getFurnace(furnaceId);
	if (!furnace || !furnace.isProcessing) {
		return 0;
	}

	const state = processingStates.get(furnaceId);
	if (!state) {
		return 0;
	}

	return state.elapsed / state.smeltTime;
}

/**
 * Reset all smelting processing state — for testing.
 */
export function _resetSmeltingState(): void {
	processingStates.clear();
}
