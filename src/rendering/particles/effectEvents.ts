/**
 * Visual Effect Event Bus — decouples game systems from rendering.
 *
 * Game systems (combat, harvest, hacking, construction) push events here.
 * Renderers consume and drain events each frame.
 *
 * Event types:
 * - combat_hit: attack flash + damage number
 * - combat_destroy: death explosion
 * - harvest_tick: structure dissolve particles
 * - harvest_complete: material cubes float up
 * - hack_beam: signal beam between hacker and target
 * - hack_complete: capture flash
 * - construction_stage: stage transition particles
 * - sparks: generic spark burst at a position
 * - smoke: smoke puff (fabrication, destruction)
 * - dust: movement/construction dust
 */

export type EffectType =
	| "combat_hit"
	| "combat_destroy"
	| "harvest_tick"
	| "harvest_complete"
	| "hack_beam"
	| "hack_progress"
	| "hack_complete"
	| "construction_stage"
	| "sparks"
	| "smoke"
	| "dust";

export interface EffectEvent {
	type: EffectType;
	/** World position where the effect occurs */
	x: number;
	y: number;
	z: number;
	/** Optional secondary position (for beams) */
	targetX?: number;
	targetY?: number;
	targetZ?: number;
	/** Color hint (hex number) */
	color?: number;
	/** Intensity/magnitude 0-1 */
	intensity?: number;
	/** Text to display (damage numbers, component names) */
	text?: string;
	/** Extra data (e.g., progress for hacking) */
	progress?: number;
	/** Entity ID for tracking persistent effects */
	entityId?: string;
}

const eventQueue: EffectEvent[] = [];

/**
 * Push a visual effect event. Called from game systems.
 */
export function pushEffect(event: EffectEvent): void {
	eventQueue.push(event);
}

/**
 * Drain all queued events. Called once per frame by the effect renderer.
 * Returns the events and clears the queue.
 */
export function drainEffects(): EffectEvent[] {
	if (eventQueue.length === 0) return [];
	const events = eventQueue.splice(0);
	return events;
}

/**
 * Get the current queue length (for debugging).
 */
export function getEffectQueueLength(): number {
	return eventQueue.length;
}

/**
 * Clear all pending effects.
 */
export function clearEffects(): void {
	eventQueue.length = 0;
}
