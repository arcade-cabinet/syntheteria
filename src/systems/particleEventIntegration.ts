/**
 * Particle event integration — bridges the event bus to particle feedback.
 *
 * Subscribes to game events emitted via eventBus.ts and maps each to
 * the appropriate particle action defined in particleFeedbackMap.ts,
 * queuing them for the rendering layer to drain each frame.
 *
 * Lifecycle:
 *   initParticleEventIntegration()  — subscribe to all relevant events
 *   drainPendingParticles()         — consume queued particle requests
 *   teardownParticleEventIntegration() — remove all subscriptions
 *   reset()                         — clear queue + subscriptions (testing)
 */

import type { GameEventType, EventPayload } from "./eventBus";
import { subscribe } from "./eventBus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A pending particle request queued for the rendering layer. */
export interface PendingParticle {
	/** Particle action name from particleFeedbackMap (e.g. "harvest_sparks") */
	action: string;
	/** World position to emit from, if available */
	position?: { x: number; y: number; z: number };
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Queue of particle requests waiting to be consumed by the renderer. */
let pendingQueue: PendingParticle[] = [];

/** Unsubscribe functions for all active event subscriptions. */
let activeUnsubscribes: Array<() => void> = [];

/** Whether the integration has been initialized. */
let initialized = false;

// ---------------------------------------------------------------------------
// Event-to-particle mapping table
// ---------------------------------------------------------------------------

interface EventParticleMapping {
	eventType: GameEventType;
	action: string;
	/** Extract position from the event payload, or return undefined for player-relative effects. */
	getPosition: (event: Record<string, unknown>) => { x: number; y: number; z: number } | undefined;
}

const EVENT_PARTICLE_MAPPINGS: EventParticleMapping[] = [
	{
		eventType: "harvest_started",
		action: "harvest_sparks",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "harvest_complete",
		action: "harvest_burst",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "compression_started",
		action: "compression_steam",
		getPosition: () => undefined,
	},
	{
		eventType: "cube_spawned",
		action: "cube_spawn_burst",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "cube_dropped",
		action: "cube_impact_dust",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "cube_thrown",
		action: "cube_trail",
		getPosition: (e) => e.direction as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "damage_taken",
		action: "damage_sparks",
		getPosition: () => undefined,
	},
	{
		eventType: "entity_death",
		action: "death_explosion",
		getPosition: () => undefined,
	},
	{
		eventType: "combat_kill",
		action: "kill_burst",
		getPosition: () => undefined,
	},
	{
		eventType: "building_placed",
		action: "build_dust",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	{
		eventType: "storm_strike",
		action: "lightning_strike",
		getPosition: (e) => e.position as { x: number; y: number; z: number } | undefined,
	},
	// weather_change intentionally omitted — ambient effects handled separately
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Create a listener for a single event-to-particle mapping.
 */
function createListener(mapping: EventParticleMapping): () => void {
	return subscribe(mapping.eventType, (event: EventPayload<typeof mapping.eventType>) => {
		const position = mapping.getPosition(event as unknown as Record<string, unknown>);
		const pending: PendingParticle = { action: mapping.action };
		if (position) {
			pending.position = { x: position.x, y: position.y, z: position.z };
		}
		pendingQueue.push(pending);
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize particle event integration.
 *
 * Subscribes to all mapped game events and begins queuing particle
 * requests. Safe to call multiple times — subsequent calls are no-ops
 * until teardown is called.
 */
export function initParticleEventIntegration(): void {
	if (initialized) return;

	for (const mapping of EVENT_PARTICLE_MAPPINGS) {
		const unsub = createListener(mapping);
		activeUnsubscribes.push(unsub);
	}

	initialized = true;
}

/**
 * Tear down all event subscriptions.
 *
 * Removes every listener registered by init. Does NOT clear the
 * pending queue — call drainPendingParticles() first if you need
 * to process remaining events.
 */
export function teardownParticleEventIntegration(): void {
	for (const unsub of activeUnsubscribes) {
		unsub();
	}
	activeUnsubscribes = [];
	initialized = false;
}

/**
 * Drain and return all pending particle requests.
 *
 * The renderer calls this once per frame to collect queued particle
 * effects. The internal queue is cleared after draining.
 *
 * @returns Array of pending particle requests (may be empty).
 */
export function drainPendingParticles(): PendingParticle[] {
	const drained = pendingQueue;
	pendingQueue = [];
	return drained;
}

/**
 * Get the number of active event subscriptions.
 *
 * Useful for testing to verify init/teardown lifecycle.
 */
export function getSubscriptionCount(): number {
	return activeUnsubscribes.length;
}

/**
 * Check whether the integration is currently initialized.
 */
export function isInitialized(): boolean {
	return initialized;
}

/**
 * Reset all module state — for testing.
 *
 * Tears down subscriptions and clears the pending queue.
 */
export function reset(): void {
	teardownParticleEventIntegration();
	pendingQueue = [];
}
