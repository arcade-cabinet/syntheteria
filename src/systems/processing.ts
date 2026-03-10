/**
 * Processing system — transforms raw materials into refined ones.
 *
 * Processors auto-pull from input belts and auto-push to output belts.
 * Each tick, active powered processors with a recipe and input item
 * advance progress by 1/speed. When progress >= 1.0, the input is
 * consumed and the output is produced.
 */

import { config } from "../../config";
import type { Entity } from "../ecs/types";
import { processors, world } from "../ecs/world";

/** Recipe maps: processorType → { inputItem → outputItem } */
export const PROCESSING_RECIPES: Record<string, Record<string, string>> =
	config.processing.recipes;

/** Internal state: what item a processor is currently working on */
const processorInputs = new Map<string, string>();

/**
 * Find an entity by ID. Returns undefined if not found.
 */
function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

/**
 * Get the item type a processor is currently processing, if any.
 */
export function getProcessorInput(processorId: string): string | null {
	return processorInputs.get(processorId) ?? null;
}

/**
 * Feed an item directly into a processor's input queue.
 *
 * Used by the belt transport system when a physical cube reaches a machine
 * hopper via belt routing. Returns true if the processor accepted the item
 * (i.e. the processor exists, is idle, and has a matching recipe).
 */
export function feedProcessor(
	processorId: string,
	itemType: string,
): boolean {
	// Reject if the processor is already working on something
	if (processorInputs.has(processorId)) return false;

	const entity = getEntityById(processorId);
	if (!entity?.processor) return false;

	const proc = entity.processor;

	// Must be active and powered
	if (!proc.active || !entity.building?.powered) return false;

	// Must have a valid recipe that accepts this item type
	const recipes = PROCESSING_RECIPES[proc.processorType];
	if (!recipes || recipes[itemType] === undefined) return false;

	processorInputs.set(processorId, itemType);
	proc.progress = 0;

	return true;
}

/**
 * Run processing system. Called once per simulation tick.
 */
export function processingSystem() {
	for (const entity of processors) {
		const proc = entity.processor;

		// Skip inactive or unpowered processors
		if (!proc.active || !entity.building.powered) continue;

		// Must have a valid recipe set
		if (proc.recipe === null) continue;

		const recipes = PROCESSING_RECIPES[proc.processorType];
		if (!recipes) continue;

		// Check if we have an input item to work on
		let currentInput = processorInputs.get(entity.id) ?? null;

		// If no input, try to pull from input belt
		if (currentInput === null && proc.inputBeltId !== null) {
			const inputBelt = getEntityById(proc.inputBeltId);
			if (inputBelt?.belt && inputBelt.belt.carrying !== null) {
				const itemType = inputBelt.belt.carrying;
				// Only accept items that match a valid recipe
				if (recipes[itemType] !== undefined) {
					currentInput = itemType;
					processorInputs.set(entity.id, itemType);
					inputBelt.belt.carrying = null;
					inputBelt.belt.itemProgress = 0;
					proc.progress = 0;
				}
			}
		}

		// Nothing to process
		if (currentInput === null) continue;

		// Advance progress
		proc.progress += 1 / proc.speed;

		if (proc.progress >= 1.0) {
			// Processing complete — produce output
			const outputType = recipes[currentInput];
			if (!outputType) {
				// Invalid recipe state — clear and skip
				processorInputs.delete(entity.id);
				proc.progress = 0;
				continue;
			}

			// Try to push to output belt
			if (proc.outputBeltId !== null) {
				const outputBelt = getEntityById(proc.outputBeltId);
				if (outputBelt?.belt && outputBelt.belt.carrying === null) {
					outputBelt.belt.carrying = outputType;
					outputBelt.belt.itemProgress = 0;
					processorInputs.delete(entity.id);
					proc.progress = 0;
				} else {
					// Output belt blocked — hold at 1.0, don't consume
					proc.progress = 1.0;
				}
			} else {
				// No output belt — just consume (item is "produced" but lost)
				processorInputs.delete(entity.id);
				proc.progress = 0;
			}
		}
	}
}
