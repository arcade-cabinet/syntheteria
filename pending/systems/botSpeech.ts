import speechProfilesConfig from "../config/speechProfiles.json";
import { gameplayRandom } from "../ecs/seed";
import { SpeechBubble as SpeechBubbleTrait } from "../ecs/traits";
import { speechBubbles, world } from "../ecs/world";
import { getStormIntensity } from "./power";

/**
 * Bot speech engine — selects in-character lines based on archetype, activity,
 * and world state. Supports both activity-based and event-triggered speech.
 *
 * Speech profiles are defined in config/speechProfiles.json. Lines are selected
 * using gameplayRandom (seeded PRNG) for deterministic replay. A configurable
 * cooldown prevents speech spam.
 *
 * Event-triggered speech: bots react to nearby game events (AI construction,
 * combat, weather changes) with proximity-filtered, archetype-appropriate lines.
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

/** Event types that trigger reactive bot speech */
export type GameEventType =
	| "hostile_construction"
	| "enemy_scouts"
	| "taking_fire"
	| "target_down"
	| "storm_intensifying"
	| "lightning_close";

export interface SpeechBubble {
	entityId: string;
	text: string;
	expiresAtTurn: number;
	/** World position for 3D rendering (updated via updateBubblePosition) */
	position: { x: number; y: number; z: number };
	/** Visual opacity 0-1 for fade in/out (updated via updateSpeechBubbleOpacities) */
	opacity: number;
	/** Elapsed time since spawn in seconds (for fade calculation) */
	elapsed: number;
	/** Total display duration in seconds (for fade calculation) */
	displayDuration: number;
}

export interface WorldContext {
	stormIntensity: number;
	nearbyEnemyCount: number;
}

/** A game event with a world position, used for proximity filtering */
export interface GameEvent {
	type: GameEventType;
	position: { x: number; z: number };
}

/** A bot with a position, archetype, and entity ID for event-triggered speech */
export interface EventSpeechBot {
	entityId: string;
	archetype: BotArchetype;
	position: { x: number; z: number };
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

/** Fade-in/out durations in seconds for 3D rendering */
const FADE_IN_SECONDS = 0.3;
const FADE_OUT_SECONDS = 0.5;
/** Default display duration in seconds for 3D bubble rendering */
const DEFAULT_DISPLAY_SECONDS = 3.0;

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
// Event speech line selection
// ---------------------------------------------------------------------------

/**
 * Get the vision radius for event-triggered speech from config.
 */
export function getEventVisionRadius(): number {
	return speechProfilesConfig.eventVisionRadius;
}

/**
 * Select a speech line for an event type from the given profile.
 * Uses gameplayRandom for deterministic, seeded selection.
 * Returns null if no lines exist for the profile/event pair.
 */
export function selectEventLine(
	profile: SpeechProfile,
	eventType: GameEventType,
): string | null {
	const profileData =
		speechProfilesConfig.eventSpeech[
			profile as keyof typeof speechProfilesConfig.eventSpeech
		];
	if (!profileData) return null;

	const lines = profileData[eventType as keyof typeof profileData] as
		| string[]
		| undefined;
	if (!lines || lines.length === 0) return null;

	const index = Math.floor(gameplayRandom() * lines.length);
	return lines[index];
}

// ---------------------------------------------------------------------------
// Proximity filtering
// ---------------------------------------------------------------------------

/**
 * Compute 2D distance between two positions (x, z plane).
 */
function distance2D(
	a: { x: number; z: number },
	b: { x: number; z: number },
): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Filter game events to only those within vision radius of a bot.
 * Returns events sorted by distance (closest first).
 */
export function filterNearbyEvents(
	botPosition: { x: number; z: number },
	events: GameEvent[],
	visionRadius?: number,
): GameEvent[] {
	const radius = visionRadius ?? getEventVisionRadius();
	return events
		.filter((event) => distance2D(botPosition, event.position) <= radius)
		.sort(
			(a, b) =>
				distance2D(botPosition, a.position) -
				distance2D(botPosition, b.position),
		);
}

// ---------------------------------------------------------------------------
// Event-triggered speech tick
// ---------------------------------------------------------------------------

/**
 * Process event-triggered speech for bots near game events.
 *
 * For each bot:
 *  1. Check cooldown
 *  2. Find nearby events within vision radius
 *  3. Select the highest priority nearby event
 *  4. Generate an archetype-appropriate speech line
 *
 * Event priority: taking_fire > target_down > enemy_scouts >
 *   hostile_construction > lightning_close > storm_intensifying
 */
const EVENT_PRIORITY: GameEventType[] = [
	"taking_fire",
	"target_down",
	"enemy_scouts",
	"hostile_construction",
	"lightning_close",
	"storm_intensifying",
];

export function processEventSpeech(
	currentTurn: number,
	bots: EventSpeechBot[],
	events: GameEvent[],
): void {
	if (events.length === 0) return;

	for (const bot of bots) {
		if (!canSpeak(bot.entityId, currentTurn)) continue;

		const nearbyEvents = filterNearbyEvents(bot.position, events);
		if (nearbyEvents.length === 0) continue;

		// Pick the highest priority event among nearby ones
		const nearbyTypes = new Set(nearbyEvents.map((e) => e.type));
		let bestEvent: GameEventType | null = null;
		for (const priority of EVENT_PRIORITY) {
			if (nearbyTypes.has(priority)) {
				bestEvent = priority;
				break;
			}
		}
		if (!bestEvent) continue;

		const profile = ARCHETYPE_TO_PROFILE[bot.archetype];
		const line = selectEventLine(profile, bestEvent);
		if (line === null) continue;

		const bubble: SpeechBubble = {
			entityId: bot.entityId,
			text: line,
			expiresAtTurn: currentTurn + getBubbleDuration(),
			position: { x: bot.position.x, y: 0, z: bot.position.z },
			opacity: 0,
			elapsed: 0,
			displayDuration: DEFAULT_DISPLAY_SECONDS,
		};

		activeBubbles.set(bot.entityId, bubble);
		lastSpeechTurn.set(bot.entityId, currentTurn);
	}
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
			position: { x: 0, y: 0, z: 0 },
			opacity: 0,
			elapsed: 0,
			displayDuration: DEFAULT_DISPLAY_SECONDS,
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
 * Update the world position of all bubbles for a given entity.
 * Call when the entity moves so the 3D speech bubble follows it.
 */
export function updateBubblePosition(
	entityId: string,
	position: { x: number; y: number; z: number },
): void {
	const bubble = activeBubbles.get(entityId);
	if (bubble) {
		bubble.position.x = position.x;
		bubble.position.y = position.y;
		bubble.position.z = position.z;
	}
}

/**
 * Update speech bubble opacities based on elapsed frame time.
 * Called each render frame with delta in seconds. Handles fade-in/fade-out.
 */
export function updateSpeechBubbleOpacities(delta: number): void {
	for (const bubble of activeBubbles.values()) {
		bubble.elapsed += delta;

		const fadeInProgress = Math.min(bubble.elapsed / FADE_IN_SECONDS, 1);
		const remaining = bubble.displayDuration - bubble.elapsed;
		const fadeOutProgress = Math.min(remaining / FADE_OUT_SECONDS, 1);
		bubble.opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));
	}
}

/**
 * Remove all bubbles for a given entity.
 */
export function clearBubblesForEntity(entityId: string): void {
	activeBubbles.delete(entityId);
}

/**
 * Reset all speech state. Used in tests and when loading a new game.
 */
export function resetBotSpeechState(): void {
	activeBubbles.clear();
	lastSpeechTurn.clear();
	// Also destroy all SpeechBubble Koota entities
	for (const e of Array.from(speechBubbles)) {
		if (e.isAlive()) e.destroy();
	}
}

// ---------------------------------------------------------------------------
// W2: SpeechBubble Koota entity API
// ---------------------------------------------------------------------------

/**
 * Spawn (or replace) a SpeechBubble Koota entity for a bot.
 * If an entity already exists for the given entityId it is destroyed first.
 * Called by botSpeechSystem and processEventSpeech when a new line is selected.
 */
export function spawnSpeechBubble(
	entityId: string,
	text: string,
	expiresAtTick: number,
	wx: number,
	wy: number,
	wz: number,
): void {
	// Destroy any existing bubble for this entity
	for (const e of Array.from(speechBubbles)) {
		if (e.get(SpeechBubbleTrait)?.entityId === entityId) {
			e.destroy();
			break;
		}
	}
	const entity = world.spawn(SpeechBubbleTrait);
	entity.set(SpeechBubbleTrait, {
		entityId,
		text,
		expiresAtTick,
		opacity: 1,
		wx,
		wy,
		wz,
	});
}

/**
 * Tick all SpeechBubble entities: destroy expired ones, fade near-expiry ones.
 * FADE_TICKS controls how many ticks before expiry the bubble starts to fade.
 */
const FADE_TICKS = 10;

export function tickSpeechBubbles(currentTick: number): void {
	for (const e of Array.from(speechBubbles)) {
		const b = e.get(SpeechBubbleTrait);
		if (!b) continue;
		if (b.expiresAtTick <= currentTick) {
			e.destroy();
		} else {
			const remaining = b.expiresAtTick - currentTick;
			if (remaining < FADE_TICKS) {
				e.set(SpeechBubbleTrait, {
					...b,
					opacity: remaining / FADE_TICKS,
				});
			}
		}
	}
}
