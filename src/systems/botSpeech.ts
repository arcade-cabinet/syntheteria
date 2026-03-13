import speechProfilesConfig from "../config/speechProfiles.json";
import { gameplayRandom } from "../ecs/seed";
import { getStormIntensity } from "./power";

/**
 * Bot speech engine — selects in-character lines based on archetype, activity,
 * and world state.
 *
 * Speech profiles are defined in config/speechProfiles.json. Lines are selected
 * using gameplayRandom (seeded PRNG) for deterministic replay. A configurable
 * cooldown prevents speech spam.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeechProfile = keyof typeof speechProfilesConfig.profiles;
export type SpeechContext =
	| "harvesting"
	| "combat"
	| "storm"
	| "idle"
	| "movement"
	| "discovery";

export type BotArchetype =
	| "mentor"
	| "scout"
	| "quartermaster"
	| "fabricator"
	| "warden"
	| "feral"
	| "cult";

export interface SpeechBubble {
	entityId: string;
	text: string;
	expiresAtTurn: number;
}

export interface WorldContext {
	stormIntensity: number;
	nearbyEnemyCount: number;
}

// ---------------------------------------------------------------------------
// Archetype -> profile mapping
// ---------------------------------------------------------------------------

const ARCHETYPE_TO_PROFILE: Record<BotArchetype, SpeechProfile> = {
	mentor: "mentor",
	scout: "scout",
	quartermaster: "quartermaster",
	fabricator: "fabricator",
	warden: "warden",
	feral: "feral",
	cult: "cult",
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Active speech bubbles, keyed by entityId */
const activeBubbles = new Map<string, SpeechBubble>();

/** Last turn each entity spoke (for cooldown) */
const lastSpeechTurn = new Map<string, number>();

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

function getCooldownTurns(): number {
	return speechProfilesConfig.cooldown.defaultTurns;
}

function getBubbleDuration(): number {
	return speechProfilesConfig.cooldown.bubbleDurationTurns;
}

// ---------------------------------------------------------------------------
// Context detection
// ---------------------------------------------------------------------------

const STORM_THRESHOLD = 1.1;

/**
 * Determine the most relevant speech context for a bot given its activity
 * and the current world state.
 *
 * Priority: combat > storm > activity-specific > idle
 */
export function determineSpeechContext(
	activity: SpeechContext,
	worldCtx: WorldContext,
): SpeechContext {
	// Combat overrides everything when enemies are nearby
	if (worldCtx.nearbyEnemyCount > 0) {
		return "combat";
	}

	// Storm overrides non-combat activities when intensity is high
	if (worldCtx.stormIntensity >= STORM_THRESHOLD && activity !== "combat") {
		return "storm";
	}

	return activity;
}

// ---------------------------------------------------------------------------
// Line selection
// ---------------------------------------------------------------------------

/**
 * Select a speech line from the given profile and context.
 * Uses gameplayRandom for deterministic, seeded selection.
 * Returns null if no lines exist for the profile/context pair.
 */
export function selectLine(
	profile: SpeechProfile,
	context: SpeechContext,
): string | null {
	const profileData =
		speechProfilesConfig.profiles[
			profile as keyof typeof speechProfilesConfig.profiles
		];
	if (!profileData) return null;

	const lines = profileData[context as keyof typeof profileData] as
		| string[]
		| undefined;
	if (!lines || lines.length === 0) return null;

	const index = Math.floor(gameplayRandom() * lines.length);
	return lines[index];
}

// ---------------------------------------------------------------------------
// Cooldown logic
// ---------------------------------------------------------------------------

/**
 * Check whether a bot can speak this turn based on cooldown.
 */
export function canSpeak(entityId: string, currentTurn: number): boolean {
	const lastTurn = lastSpeechTurn.get(entityId);
	if (lastTurn === undefined) return true;
	return currentTurn - lastTurn >= getCooldownTurns();
}

// ---------------------------------------------------------------------------
// Core tick
// ---------------------------------------------------------------------------

export interface BotSpeechInput {
	entityId: string;
	archetype: BotArchetype;
	activity: SpeechContext;
}

/**
 * Run the bot speech system for a single tick.
 *
 * For each bot input:
 *  1. Check cooldown
 *  2. Determine effective speech context (activity + world state)
 *  3. Select and display a line
 *
 * Also prunes expired bubbles.
 */
export function botSpeechSystem(
	currentTurn: number,
	bots: BotSpeechInput[],
	worldCtx?: WorldContext,
): void {
	const ctx: WorldContext = worldCtx ?? {
		stormIntensity: getStormIntensity(),
		nearbyEnemyCount: 0,
	};

	// Prune expired bubbles
	for (const [entityId, bubble] of activeBubbles) {
		if (currentTurn >= bubble.expiresAtTurn) {
			activeBubbles.delete(entityId);
		}
	}

	// Process each bot
	for (const bot of bots) {
		if (!canSpeak(bot.entityId, currentTurn)) continue;

		const profile = ARCHETYPE_TO_PROFILE[bot.archetype];
		const context = determineSpeechContext(bot.activity, ctx);
		const line = selectLine(profile, context);

		if (line === null) continue;

		const bubble: SpeechBubble = {
			entityId: bot.entityId,
			text: line,
			expiresAtTurn: currentTurn + getBubbleDuration(),
		};

		activeBubbles.set(bot.entityId, bubble);
		lastSpeechTurn.set(bot.entityId, currentTurn);
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all currently active speech bubbles for UI rendering.
 */
export function getActiveSpeechBubbles(): SpeechBubble[] {
	return Array.from(activeBubbles.values());
}

/**
 * Reset all speech state. Used in tests and when loading a new game.
 */
export function resetBotSpeechState(): void {
	activeBubbles.clear();
	lastSpeechTurn.clear();
}
