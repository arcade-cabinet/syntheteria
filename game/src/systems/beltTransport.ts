/**
 * Belt transport system — moves items along conveyor belt chains.
 *
 * Each tick, items on belts advance by belt.speed * deltaTick.
 * When an item reaches the end of a belt segment (itemProgress >= 1.0),
 * it transfers to the next belt in the chain. If the next entity has a
 * processor component, the item is delivered to it instead.
 * Items pile up (stop advancing) if there is no next belt or the next
 * belt is already carrying something.
 */

import type { Entity } from "../ecs/types";
import { belts, world } from "../ecs/world";

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
 * Run belt transport. Called once per simulation tick.
 * @param deltaTick - time elapsed this tick in seconds (at current game speed)
 */
export function beltTransportSystem(deltaTick: number) {
	for (const entity of belts) {
		const belt = entity.belt;

		// Nothing to move if not carrying an item
		if (belt.carrying === null) continue;

		// Advance item progress
		const newProgress = belt.itemProgress + belt.speed * deltaTick;

		if (newProgress < 1.0) {
			// Item still in transit on this belt segment
			belt.itemProgress = newProgress;
			continue;
		}

		// Item has reached the end of this belt segment
		if (belt.nextBeltId === null) {
			// No next belt — item piles up, cap progress at 1.0
			belt.itemProgress = 1.0;
			continue;
		}

		const nextEntity = getEntityById(belt.nextBeltId);
		if (!nextEntity) {
			// Next belt entity no longer exists — treat as dead end
			belt.itemProgress = 1.0;
			belt.nextBeltId = null;
			continue;
		}

		// If the next entity is a processor building, deliver the item to it
		if (nextEntity.processor) {
			if (nextEntity.processor.active && nextEntity.processor.recipe !== null) {
				// Processor accepts the item
				belt.carrying = null;
				belt.itemProgress = 0;
				// Processor progress is handled by its own system
			} else {
				// Processor not ready — item piles up
				belt.itemProgress = 1.0;
			}
			continue;
		}

		// Next entity is a belt — transfer item if the next belt is empty
		if (nextEntity.belt) {
			if (nextEntity.belt.carrying !== null) {
				// Next belt is occupied — item piles up
				belt.itemProgress = 1.0;
				continue;
			}

			// Transfer item to next belt
			nextEntity.belt.carrying = belt.carrying;
			nextEntity.belt.itemProgress = 0;
			belt.carrying = null;
			belt.itemProgress = 0;
		} else {
			// Next entity has no belt or processor — dead end
			belt.itemProgress = 1.0;
		}
	}
}
