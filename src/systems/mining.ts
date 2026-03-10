/**
 * Mining system — drills extract resources from terrain deposits.
 *
 * Each tick, active powered miners increment an internal counter.
 * When the counter reaches the extraction interval (1 / extractionRate),
 * an item is produced and placed on the output belt or buffered.
 * Drill health degrades slightly with each extraction (0.001 per item).
 */

import type { Entity } from "../ecs/types";
import { miners, world } from "../ecs/world";

/** Internal extraction counters keyed by entity ID */
const extractionCounters = new Map<string, number>();

/** Internal buffers keyed by entity ID (max 5) */
const minerBuffers = new Map<string, number>();

/**
 * Find an entity by ID. Returns undefined if not found.
 */
function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

/** Get the current buffer count for a miner. */
export function getMinerBuffer(minerId: string): number {
	return minerBuffers.get(minerId) ?? 0;
}

/**
 * Run mining system. Called once per simulation tick.
 */
export function miningSystem() {
	for (const entity of miners) {
		const miner = entity.miner;

		// Skip inactive or unpowered miners
		if (!miner.active || !entity.building.powered) continue;

		// Skip broken drills
		if (miner.drillHealth <= 0) {
			miner.active = false;
			continue;
		}

		// Get or init counter
		const counter = (extractionCounters.get(entity.id) ?? 0) + 1;
		const interval = Math.ceil(1 / miner.extractionRate);

		if (counter < interval) {
			extractionCounters.set(entity.id, counter);
			continue;
		}

		// Time to extract — reset counter
		extractionCounters.set(entity.id, 0);

		// Degrade drill health
		miner.drillHealth = Math.max(0, miner.drillHealth - 0.001);

		// Try to place on output belt
		if (miner.outputBeltId !== null) {
			const beltEntity = getEntityById(miner.outputBeltId);
			if (beltEntity?.belt && beltEntity.belt.carrying === null) {
				// Place item on belt
				beltEntity.belt.carrying = miner.resourceType;
				beltEntity.belt.itemProgress = 0;
				continue;
			}
		}

		// Buffer the item (max 5)
		const currentBuffer = minerBuffers.get(entity.id) ?? 0;
		if (currentBuffer < 5) {
			minerBuffers.set(entity.id, currentBuffer + 1);
		}
		// If buffer is full, item is lost (drill still degrades)
	}
}
