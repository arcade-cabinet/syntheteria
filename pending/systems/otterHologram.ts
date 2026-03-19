/**
 * Otter Hologram Patron System — Narrative guidance from the player's patron AI.
 *
 * The patron appears as a holographic otter at key gameplay moments:
 * first turn, first combat, first expansion, first harvest, etc.
 *
 * Messages are queued and displayed one at a time. Each message has a
 * priority — higher priority messages preempt lower ones.
 */

import otterConfig from "../config/otterHologram.json";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HologramTrigger = keyof typeof otterConfig.triggers;

export interface HologramMessage {
	trigger: HologramTrigger;
	title: string;
	text: string;
	priority: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

let activeMessage: HologramMessage | null = null;
let displayTimer = 0;
const messageQueue: HologramMessage[] = [];
const triggeredSet = new Set<HologramTrigger>();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeOtterHologram(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Get the currently displayed hologram message, or null.
 */
export function getActiveHologramMessage(): HologramMessage | null {
	return activeMessage;
}

/**
 * Check if the hologram is currently displaying.
 */
export function isHologramActive(): boolean {
	return activeMessage !== null;
}

/**
 * Trigger a hologram message. Each trigger fires at most once per game.
 * Higher priority messages can preempt queued lower priority ones.
 */
export function triggerHologram(trigger: HologramTrigger) {
	// Each trigger fires once per game
	if (triggeredSet.has(trigger)) return;

	const config = otterConfig.triggers[trigger];
	if (!config) return;

	triggeredSet.add(trigger);

	const message: HologramMessage = {
		trigger,
		title: config.title,
		text: config.text,
		priority: config.priority,
	};

	// If nothing is active, show immediately
	if (!activeMessage) {
		activeMessage = message;
		displayTimer = otterConfig.displayDuration;
		notify();
		return;
	}

	// If higher priority, preempt current
	if (message.priority > activeMessage.priority) {
		// Push current to front of queue
		messageQueue.unshift(activeMessage);
		activeMessage = message;
		displayTimer = otterConfig.displayDuration;
		notify();
		return;
	}

	// Otherwise queue, sorted by priority (highest first)
	messageQueue.push(message);
	messageQueue.sort((a, b) => b.priority - a.priority);
}

/**
 * Dismiss the current hologram message. Shows next in queue if any.
 */
export function dismissHologram() {
	if (messageQueue.length > 0) {
		activeMessage = messageQueue.shift()!;
		displayTimer = otterConfig.displayDuration;
	} else {
		activeMessage = null;
		displayTimer = 0;
	}
	notify();
}

/**
 * Tick the hologram display timer. Call each frame with delta in seconds.
 * Auto-dismisses after display duration.
 */
export function tickHologram(deltaSeconds: number) {
	if (!activeMessage) return;

	displayTimer -= deltaSeconds;
	if (displayTimer <= 0) {
		dismissHologram();
	}
}

/**
 * Get remaining display time as fraction 0..1.
 */
export function getDisplayProgress(): number {
	if (!activeMessage) return 0;
	return Math.max(0, displayTimer / otterConfig.displayDuration);
}

/**
 * Get hologram visual config.
 */
export function getHologramVisuals() {
	return {
		color: otterConfig.hologramColor as [number, number, number],
		scanlineSpeed: otterConfig.scanlineSpeed,
		flickerRate: otterConfig.flickerRate,
		displayDuration: otterConfig.displayDuration,
	};
}

/**
 * Check if a trigger has already fired this game.
 */
export function hasTriggered(trigger: HologramTrigger): boolean {
	return triggeredSet.has(trigger);
}

/**
 * Reset hologram state — call on new game.
 */
export function resetOtterHologram() {
	activeMessage = null;
	displayTimer = 0;
	messageQueue.length = 0;
	triggeredSet.clear();
	notify();
}
