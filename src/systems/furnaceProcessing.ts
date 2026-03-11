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
 * Recipes sourced from config/furnace.json tiers[0].recipes.
 *
 * Config reference: config/furnace.json  (tiers[0].recipes)
 */

import furnaceConfig from "../../config/furnace.json";
import { getFurnace } from "./furnace";

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

/**
 * Default smelting recipes derived from config/furnace.json across all tiers.
 * Each recipe maps the first input material to the output.
 * Deduplicates by input material (first occurrence wins).
 * Exported so tests can reference without JSON imports.
 */
export const DEFAULT_RECIPES: SmeltingRecipe[] = (() => {
	const seen = new Set<string>();
	const recipes: SmeltingRecipe[] = [];
	for (const tier of Object.values(furnaceConfig.tiers)) {
		for (const r of Object.values(
			tier.recipes as Record<
				string,
				{ inputs: Record<string, number>; output: string; time: number }
			>,
		)) {
			const input = Object.keys(r.inputs)[0];
			if (!seen.has(input)) {
				seen.add(input);
				recipes.push({ input, output: r.output, smeltTime: r.time });
			}
		}
	}
	return recipes;
})();

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
 * Pops the front of the hopper queue, finds a matching recipe, and begins
 * the smelting timer. The furnace's isProcessing / currentItem /
 * progress fields are updated on the underlying FurnaceData.
 *
 * @param furnaceId - ID of the furnace to start smelting on
 * @param recipes   - optional recipe list (defaults to DEFAULT_RECIPES)
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

	// Look up recipe
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
 * @param recipes   - optional recipe list for auto-start (defaults to DEFAULT_RECIPES)
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
		const outputPosition = computeOutputPosition(furnace.position);

		// Reset furnace state
		furnace.isProcessing = false;
		furnace.currentItem = null;
		furnace.progress = 0;

		// Remove processing state
		processingStates.delete(furnaceId);

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
