/**
 * Harvest Events — tracks completed harvests for UI notification.
 *
 * When a harvest completes, the yield is recorded here so the
 * HarvestYieldPopup component can show a floating notification.
 * Events auto-expire after a configurable duration.
 */

import type { HarvestResource } from "./resourcePools";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HarvestYieldEvent {
	id: number;
	/** World position of the harvested structure */
	x: number;
	z: number;
	/** Materials yielded */
	yields: Array<{ resource: HarvestResource; amount: number }>;
	/** Tick when the event was created */
	createdAtTick: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

let nextId = 1;
const events: HarvestYieldEvent[] = [];
const listeners = new Set<() => void>();

/** How many ticks before an event expires (3 seconds at 60fps) */
const EVENT_LIFETIME_TICKS = 180;

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Record a completed harvest yield for UI display.
 * Called from harvestSystem when a harvest finishes.
 */
export function pushHarvestYield(
	x: number,
	z: number,
	yields: Map<HarvestResource, number>,
	tick: number,
) {
	const yieldArray: HarvestYieldEvent["yields"] = [];
	for (const [resource, amount] of yields) {
		if (amount > 0) {
			yieldArray.push({ resource, amount });
		}
	}
	if (yieldArray.length === 0) return;

	events.push({
		id: nextId++,
		x,
		z,
		yields: yieldArray,
		createdAtTick: tick,
	});

	// Keep at most 6 active events
	while (events.length > 6) {
		events.shift();
	}

	notify();
}

/**
 * Get all active harvest yield events.
 */
export function getHarvestYieldEvents(): readonly HarvestYieldEvent[] {
	return events;
}

/**
 * Subscribe to harvest yield event changes.
 */
export function subscribeHarvestEvents(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Expire old events. Call once per tick.
 */
export function expireHarvestEvents(currentTick: number) {
	let removed = false;
	for (let i = events.length - 1; i >= 0; i--) {
		if (currentTick - events[i].createdAtTick > EVENT_LIFETIME_TICKS) {
			events.splice(i, 1);
			removed = true;
		}
	}
	if (removed) {
		notify();
	}
}

/**
 * Reset all harvest events — call on new game.
 */
export function resetHarvestEvents() {
	events.length = 0;
	nextId = 1;
}
