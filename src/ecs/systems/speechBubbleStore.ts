/**
 * Speech Bubble Store — pub/sub store for unit speech bubbles.
 *
 * Tracks active speech text per unit entity ID with cooldown enforcement.
 * Consumed by SpeechBubbleRenderer to display billboard text above units.
 *
 * Flow:
 *   1. Game systems call `triggerSpeech(entityId, factionId, text)` during events
 *   2. Store checks cooldown — skips if unit spoke too recently
 *   3. Active speech entries expire after BUBBLE_DURATION_MS
 *   4. Renderer reads `getActiveSpeech()` each frame
 */

import { SPEECH_BUBBLE_DURATION_TURNS, SPEECH_COOLDOWN_TURNS } from "../narrative/speechProfiles";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveSpeech {
	entityId: number;
	factionId: string;
	text: string;
	/** Timestamp when speech was triggered (Date.now()). */
	startedAt: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

/** Convert turn-based durations to real-time milliseconds. ~1s per turn. */
const BUBBLE_DURATION_MS = SPEECH_BUBBLE_DURATION_TURNS * 1000;
const COOLDOWN_MS = SPEECH_COOLDOWN_TURNS * 1000;

// ─── State ──────────────────────────────────────────────────────────────────

/** Active speech bubbles keyed by entity ID. */
const activeSpeech = new Map<number, ActiveSpeech>();

/** Cooldown timestamps keyed by entity ID — last time unit spoke. */
const cooldowns = new Map<number, number>();

/** Subscribers for React integration (useSyncExternalStore). */
const listeners = new Set<() => void>();

function notify() {
	for (const fn of listeners) fn();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Trigger a speech bubble for a unit. Respects cooldown — silently
 * skips if the unit spoke too recently.
 */
export function triggerSpeech(entityId: number, factionId: string, text: string): void {
	const now = Date.now();

	// Check cooldown
	const lastSpoke = cooldowns.get(entityId);
	if (lastSpoke && now - lastSpoke < COOLDOWN_MS) return;

	// Set cooldown and add active speech
	cooldowns.set(entityId, now);
	activeSpeech.set(entityId, { entityId, factionId, text, startedAt: now });
	notify();
}

/**
 * Get all currently active (non-expired) speech bubbles.
 * Cleans up expired entries as a side effect.
 */
export function getActiveSpeech(): ActiveSpeech[] {
	const now = Date.now();
	let changed = false;

	for (const [eid, speech] of activeSpeech) {
		if (now - speech.startedAt > BUBBLE_DURATION_MS) {
			activeSpeech.delete(eid);
			changed = true;
		}
	}

	if (changed) notify();
	return Array.from(activeSpeech.values());
}

/** Clear all speech — useful on game reset. */
export function clearAllSpeech(): void {
	activeSpeech.clear();
	cooldowns.clear();
	notify();
}

/** Subscribe for React useSyncExternalStore. */
export function subscribeSpeech(cb: () => void): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

/** Snapshot accessor for useSyncExternalStore. */
let _cache: ActiveSpeech[] = [];
let _cacheSize = -1;

export function getSpeechSnapshot(): ActiveSpeech[] {
	const active = getActiveSpeech();
	if (active.length !== _cacheSize) {
		_cache = active;
		_cacheSize = active.length;
	}
	return _cache;
}
