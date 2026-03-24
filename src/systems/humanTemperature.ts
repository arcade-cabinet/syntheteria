/**
 * Human temperature system — 5-tier disposition meter.
 *
 * Tracks global human-player relationship (0-100, starts at 10).
 * Player actions push the temperature up (friendly) or down (hostile).
 *
 * Tier effects:
 *   Frozen (0-20):  Humans hide. No interaction.
 *   Cool (21-40):   Humans appear. Cautious observation.
 *   Warm (41-60):   Humans reveal shrine locations.
 *   Hot (61-80):    Human scouts join your force.
 *   Burning (81+):  Human militia spawns to fight the cult.
 *
 * The system processes queued events each tick and clamps the value.
 * Tier transitions are exposed for the game phase system and UI.
 */

import {
	getTemperatureTier,
	HUMAN_ENCOUNTER_DEFS,
	type HumanEventType,
	type TemperatureTier,
} from "../config/humanEncounterDefs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let temperature = 10;
let previousTier: TemperatureTier = "frozen";
let lastTierTransition: { from: TemperatureTier; to: TemperatureTier } | null =
	null;

/** Queued events to process on the next tick */
const eventQueue: HumanEventType[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue a human encounter event. Processed on next tick.
 */
export function queueHumanEvent(eventType: HumanEventType): void {
	eventQueue.push(eventType);
}

/**
 * Get the current temperature value (0-100).
 */
export function getHumanTemperature(): number {
	return temperature;
}

/**
 * Get the current tier name.
 */
export function getHumanTemperatureTier(): TemperatureTier {
	return getTemperatureTier(temperature).tier;
}

/**
 * Get the last tier transition that occurred, or null if none.
 * Consumed on read (returns null on subsequent calls until next transition).
 */
export function popTierTransition(): {
	from: TemperatureTier;
	to: TemperatureTier;
} | null {
	const t = lastTierTransition;
	lastTierTransition = null;
	return t;
}

/**
 * Reset the temperature system to initial state.
 * Call when starting a new game.
 */
export function resetHumanTemperature(): void {
	temperature = 10;
	previousTier = "frozen";
	lastTierTransition = null;
	eventQueue.length = 0;
}

/**
 * Directly set the temperature value (for testing / save-load).
 * Clamps to 0-100.
 */
export function setHumanTemperature(value: number): void {
	temperature = Math.max(0, Math.min(100, value));
	previousTier = getTemperatureTier(temperature).tier;
}

/**
 * Human temperature tick. Called once per sim tick.
 * Drains the event queue and applies deltas.
 */
export function humanTemperatureSystem(): void {
	if (eventQueue.length === 0) return;

	// Apply all queued events
	for (const eventType of eventQueue) {
		const def = HUMAN_ENCOUNTER_DEFS[eventType];
		temperature += def.delta;
	}
	eventQueue.length = 0;

	// Clamp to 0-100
	temperature = Math.max(0, Math.min(100, temperature));

	// Check for tier transition
	const currentTier = getTemperatureTier(temperature).tier;
	if (currentTier !== previousTier) {
		lastTierTransition = { from: previousTier, to: currentTier };
		previousTier = currentTier;
	}
}
