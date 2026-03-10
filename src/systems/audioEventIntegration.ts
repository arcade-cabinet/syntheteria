/**
 * Audio-event integration bridge.
 *
 * Subscribes to typed game events from the event bus and maps each to an
 * audio action string.  Actions are NOT played immediately — they are queued
 * in a `pendingActions` list so the rendering layer can drain them once per
 * frame via `drainPendingActions()`.
 *
 * Lifecycle:
 *   initAudioEventIntegration()  — wire up all subscriptions
 *   drainPendingActions()        — called by render loop each frame
 *   teardownAudioEventIntegration() — remove all subscriptions
 *   reset()                      — clear everything (testing)
 */

import {
	type GameEventType,
	type EventCallback,
	subscribe,
	unsubscribe,
} from "./eventBus";

// ---------------------------------------------------------------------------
// Event → audio action mapping (hardcoded, no config import)
// ---------------------------------------------------------------------------

/**
 * Maps event bus event types to audio feedback action strings.
 * Action strings correspond to keys in audioFeedbackMap's ACTION_SOUNDS.
 */
const EVENT_TO_ACTION: ReadonlyMap<GameEventType, string> = new Map<
	GameEventType,
	string
>([
	["harvest_started", "harvest_start"],
	["harvest_complete", "harvest_complete"],
	["compression_started", "compression_start"],
	["cube_spawned", "cube_eject"],
	["cube_grabbed", "cube_grab"],
	["cube_dropped", "cube_drop"],
	["cube_thrown", "cube_throw"],
	["furnace_deposit", "furnace_deposit"],
	["smelting_complete", "furnace_complete"],
	["damage_taken", "damage_hit"],
	["entity_death", "entity_death"],
	["combat_kill", "combat_kill"],
	["building_placed", "building_place"],
	["tech_researched", "tech_unlock"],
	["achievement_unlocked", "achievement_unlock"],
	["level_up", "level_up"],
	["weather_change", "weather_transition"],
]);

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Queue of audio action strings waiting to be consumed by the render loop. */
let pendingActions: string[] = [];

/** Active subscriptions keyed by event type, storing the callback reference
 *  so we can unsubscribe cleanly. */
const activeSubscriptions = new Map<GameEventType, EventCallback<GameEventType>>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set up event bus subscriptions for every mapped event type.
 *
 * Safe to call multiple times — existing subscriptions are torn down first.
 */
export function initAudioEventIntegration(): void {
	// Idempotent — avoid double-subscribing.
	if (activeSubscriptions.size > 0) {
		teardownAudioEventIntegration();
	}

	for (const [eventType, action] of EVENT_TO_ACTION) {
		const callback: EventCallback<typeof eventType> = () => {
			pendingActions.push(action);
		};

		subscribe(eventType, callback as EventCallback<GameEventType>);
		activeSubscriptions.set(eventType, callback as EventCallback<GameEventType>);
	}
}

/**
 * Remove all event bus subscriptions created by `initAudioEventIntegration`.
 */
export function teardownAudioEventIntegration(): void {
	for (const [eventType, callback] of activeSubscriptions) {
		unsubscribe(eventType, callback);
	}
	activeSubscriptions.clear();
}

/**
 * Return all queued audio action strings and clear the queue.
 *
 * The rendering/audio layer should call this once per frame (or per audio
 * tick) to collect actions that need sound playback.
 *
 * @returns Array of audio action strings accumulated since the last drain.
 */
export function drainPendingActions(): string[] {
	const drained = pendingActions;
	pendingActions = [];
	return drained;
}

/**
 * Get the number of event types currently subscribed.
 *
 * Useful for assertions in tests.
 */
export function getActiveSubscriptionCount(): number {
	return activeSubscriptions.size;
}

/**
 * Get the set of event types that have active subscriptions.
 */
export function getSubscribedEventTypes(): GameEventType[] {
	return [...activeSubscriptions.keys()];
}

/**
 * Get the total number of mapped event types (constant).
 */
export function getMappedEventCount(): number {
	return EVENT_TO_ACTION.size;
}

/**
 * Look up which audio action a given event type maps to, or `null` if
 * unmapped.
 */
export function getActionForEvent(eventType: GameEventType): string | null {
	return EVENT_TO_ACTION.get(eventType) ?? null;
}

/**
 * Reset all module state.  Tears down subscriptions, clears the pending
 * queue.  Intended for test isolation.
 */
export function reset(): void {
	teardownAudioEventIntegration();
	pendingActions = [];
}
