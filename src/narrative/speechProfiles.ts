/**
 * Speech profiles — persona mapping and seeded-deterministic line selection.
 *
 * Data lives in separate modules:
 *   - speechTypes.ts — types and configuration constants
 *   - eventSpeech.ts — EVENT_SPEECH data (game-event-triggered dialogue)
 *   - contextSpeech.ts — CONTEXT_SPEECH data (ambient/contextual dialogue)
 */

export { CONTEXT_SPEECH } from "./contextSpeech";
// Re-export speech data
export { EVENT_SPEECH } from "./eventSpeech";
// Re-export types and config
export type {
	ContextSpeechTrigger,
	EventSpeechTrigger,
	SpeechProfileId,
} from "./speechTypes";
export {
	EVENT_VISION_RADIUS,
	SPEECH_BUBBLE_DURATION_TURNS,
	SPEECH_COOLDOWN_TURNS,
} from "./speechTypes";

// ---------------------------------------------------------------------------
// Internal imports for helpers below
// ---------------------------------------------------------------------------

import { gameplayRandom } from "../seed";
import { CONTEXT_SPEECH } from "./contextSpeech";
import { EVENT_SPEECH } from "./eventSpeech";
import type {
	ContextSpeechTrigger,
	EventSpeechTrigger,
	SpeechProfileId,
} from "./speechTypes";

// ---------------------------------------------------------------------------
// Persona → Profile mapping
// ---------------------------------------------------------------------------

/**
 * Maps the Faction trait's `persona` field to the corresponding speech profile.
 *
 * - otter (player) → mentor (guiding voice)
 * - fox (Reclaimers) → scout (salvager explorers)
 * - raven (Volt Collective) → quartermaster (energy/resource harvesters)
 * - lynx (Signal Choir) → fabricator (hive-mind builders)
 * - bear (Iron Creed) → warden (militant fortress defenders)
 */
export const PERSONA_TO_PROFILE: Readonly<Record<string, SpeechProfileId>> = {
	otter: "mentor",
	fox: "scout",
	raven: "quartermaster",
	lynx: "fabricator",
	bear: "warden",
} as const;

/** Resolve a persona string to its speech profile, defaulting to "mentor". */
export function profileForPersona(persona: string): SpeechProfileId {
	return PERSONA_TO_PROFILE[persona] ?? "mentor";
}

// ---------------------------------------------------------------------------
// Helpers — seeded-deterministic line selection
// ---------------------------------------------------------------------------

/** Pick a seeded-deterministic line from a speech array. */
export function pickSpeechLine(lines: readonly string[]): string {
	return lines[Math.floor(gameplayRandom() * lines.length)];
}

/** Get event speech for a profile + trigger. */
export function getEventSpeech(
	profile: SpeechProfileId,
	trigger: EventSpeechTrigger,
): string {
	return pickSpeechLine(EVENT_SPEECH[profile][trigger]);
}

/** Get context speech for a profile + context. */
export function getContextSpeech(
	profile: SpeechProfileId,
	context: ContextSpeechTrigger,
): string {
	return pickSpeechLine(CONTEXT_SPEECH[profile][context]);
}

/** Get event speech for a persona (e.g. "fox") + trigger. */
export function getEventSpeechByPersona(
	persona: string,
	trigger: EventSpeechTrigger,
): string {
	return getEventSpeech(profileForPersona(persona), trigger);
}

/** Get context speech for a persona (e.g. "fox") + context. */
export function getContextSpeechByPersona(
	persona: string,
	context: ContextSpeechTrigger,
): string {
	return getContextSpeech(profileForPersona(persona), context);
}
