/**
 * Speech profile types and configuration constants.
 *
 * Shared by eventSpeech, contextSpeech, and speechProfiles.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeechProfileId =
	| "mentor"
	| "scout"
	| "quartermaster"
	| "fabricator"
	| "warden"
	| "feral"
	| "cult";

export type EventSpeechTrigger =
	| "hostile_construction"
	| "enemy_scouts"
	| "taking_fire"
	| "target_down"
	| "storm_intensifying"
	| "lightning_close";

export type ContextSpeechTrigger =
	| "harvesting"
	| "combat"
	| "storm"
	| "idle"
	| "movement"
	| "discovery";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum turns between speech bubbles for a unit. */
export const SPEECH_COOLDOWN_TURNS = 5;
/** How many turns a speech bubble stays visible. */
export const SPEECH_BUBBLE_DURATION_TURNS = 3;
/** Tile radius for event-triggered speech (e.g. "enemy scouts nearby"). */
export const EVENT_VISION_RADIUS = 15;
