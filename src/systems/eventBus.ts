/**
 * Typed event bus for game events.
 *
 * Provides a strongly-typed publish/subscribe system for game-wide events.
 * Supports priority listeners (high/normal/low), one-shot subscriptions,
 * event history queries, and batch emission.
 *
 * No external config dependency — this is infrastructure, not game logic.
 */

// ---------------------------------------------------------------------------
// Event types — discriminated union
// ---------------------------------------------------------------------------

export interface CombatKillEvent {
	type: "combat_kill";
	attackerId: string;
	targetId: string;
	weaponType: string;
	tick: number;
}

export interface QuestCompleteEvent {
	type: "quest_complete";
	questId: string;
	rewardItems: string[];
	tick: number;
}

export interface ResourceGatheredEvent {
	type: "resource_gathered";
	resourceType: string;
	amount: number;
	sourceId: string;
	tick: number;
}

export interface BuildingPlacedEvent {
	type: "building_placed";
	buildingType: string;
	buildingId: string;
	position: { x: number; y: number; z: number };
	tick: number;
}

export interface TechResearchedEvent {
	type: "tech_researched";
	techId: string;
	tier: number;
	tick: number;
}

export interface TerritoryClaimedEvent {
	type: "territory_claimed";
	territoryId: string;
	factionId: string;
	tick: number;
}

export interface CubeStolenEvent {
	type: "cube_stolen";
	cubeId: string;
	thiefFactionId: string;
	victimFactionId: string;
	materialType: string;
	tick: number;
}

export interface StormStrikeEvent {
	type: "storm_strike";
	position: { x: number; y: number; z: number };
	damage: number;
	tick: number;
}

export interface DiplomacyChangedEvent {
	type: "diplomacy_changed";
	factionA: string;
	factionB: string;
	previousStance: string;
	newStance: string;
	tick: number;
}

export interface DiscoveryFoundEvent {
	type: "discovery_found";
	discoveryId: string;
	discoveryType: string;
	position: { x: number; y: number; z: number };
	tick: number;
}


export interface HarvestStartedEvent {
	type: "harvest_started";
	entityId: string;
	depositId: string;
	materialType: string;
	tick: number;
}

export interface HarvestCompleteEvent {
	type: "harvest_complete";
	entityId: string;
	depositId: string;
	materialType: string;
	powderGained: number;
	tick: number;
}

export interface CompressionStartedEvent {
	type: "compression_started";
	entityId: string;
	materialType: string;
	tick: number;
}

export interface CubeSpawnedEvent {
	type: "cube_spawned";
	cubeId: string;
	materialType: string;
	position: { x: number; y: number; z: number };
	source: "compression" | "furnace" | "spawn";
	tick: number;
}

export interface CubeGrabbedEvent {
	type: "cube_grabbed";
	cubeId: string;
	entityId: string;
	materialType: string;
	tick: number;
}

export interface CubeDroppedEvent {
	type: "cube_dropped";
	cubeId: string;
	entityId: string;
	position: { x: number; y: number; z: number };
	tick: number;
}

export interface CubeThrownEvent {
	type: "cube_thrown";
	cubeId: string;
	entityId: string;
	direction: { x: number; y: number; z: number };
	force: number;
	tick: number;
}

export interface FurnaceDepositEvent {
	type: "furnace_deposit";
	furnaceId: string;
	materialType: string;
	entityId: string;
	tick: number;
}

export interface SmeltingCompleteEvent {
	type: "smelting_complete";
	furnaceId: string;
	inputMaterial: string;
	outputMaterial: string;
	tick: number;
}

export interface DamageTakenEvent {
	type: "damage_taken";
	targetId: string;
	sourceId: string;
	amount: number;
	damageType: string;
	tick: number;
}

export interface EntityDeathEvent {
	type: "entity_death";
	entityId: string;
	killedBy: string;
	entityType: string;
	tick: number;
}

export interface PlayerRespawnEvent {
	type: "player_respawn";
	entityId: string;
	position: { x: number; y: number; z: number };
	tick: number;
}

export interface WeatherChangeEvent {
	type: "weather_change";
	previousWeather: string;
	newWeather: string;
	tick: number;
}

export interface AchievementUnlockedEvent {
	type: "achievement_unlocked";
	achievementId: string;
	tier: number;
	tick: number;
}

export interface LevelUpEvent {
	type: "level_up";
	entityId: string;
	previousLevel: number;
	newLevel: number;
	tick: number;
}

export interface GameOverEvent {
	type: "game_over";
	winnerId: string;
	condition: string;
	conditionName: string;
	tick: number;
}

export interface RecipeUnlockedEvent {
	type: "recipe_unlocked";
	/** Furnace tier number that just became available (e.g. 2, 3, 4, 5) */
	furnaceTier: number;
	/** Tech tier that was crossed to unlock this furnace tier */
	techRequired: number;
	/** All recipe IDs now newly available */
	recipeIds: string[];
	tick: number;
}

export interface AncientMachineAwakenedEvent {
	type: "ancient_machine_awakened";
	/** Unique ID of the awakened entity */
	entityId: string;
	/** "sentinel" | "crawler" | "colossus" */
	machineType: string;
	/** World position of the awakening */
	position: { x: number; y: number; z: number };
	/** Substrate damage level that triggered the awakening */
	substrateDamage: number;
	tick: number;
}

export interface SubstrateDamagedEvent {
	type: "substrate_damaged";
	/** Source action that caused the damage */
	cause: "mining" | "building_over_access" | "sentinel_destroyed" | "crawler_destroyed";
	/** Damage amount added this event */
	amount: number;
	/** Running total substrate damage */
	totalDamage: number;
	tick: number;
}

export interface ResidualRelationshipChangedEvent {
	type: "residual_relationship_changed";
	/** New relationship score (negative = hostile, positive = friendly) */
	newScore: number;
	/** Change delta from previous score */
	delta: number;
	/** Cause of the change */
	cause: string;
	tick: number;
}

export interface AncientMachineHostileEvent {
	type: "ancient_machine_hostile";
	entityId: string;
	machineType: string;
	tick: number;
}

export interface ColossusAwakeningEvent {
	type: "colossus_awakening";
	entityId: string;
	tick: number;
}

export type GameEvent =
	| CombatKillEvent
	| QuestCompleteEvent
	| ResourceGatheredEvent
	| BuildingPlacedEvent
	| TechResearchedEvent
	| TerritoryClaimedEvent
	| CubeStolenEvent
	| StormStrikeEvent
	| DiplomacyChangedEvent
	| DiscoveryFoundEvent
	| HarvestStartedEvent
	| HarvestCompleteEvent
	| CompressionStartedEvent
	| CubeSpawnedEvent
	| CubeGrabbedEvent
	| CubeDroppedEvent
	| CubeThrownEvent
	| FurnaceDepositEvent
	| SmeltingCompleteEvent
	| DamageTakenEvent
	| EntityDeathEvent
	| PlayerRespawnEvent
	| WeatherChangeEvent
	| AchievementUnlockedEvent
	| LevelUpEvent
	| GameOverEvent
	| RecipeUnlockedEvent
	| AncientMachineAwakenedEvent
	| AncientMachineHostileEvent
	| ColossusAwakeningEvent
	| SubstrateDamagedEvent
	| ResidualRelationshipChangedEvent;

export type GameEventType = GameEvent["type"];

/** Extract the event payload for a given event type. */
export type EventPayload<T extends GameEventType> = Extract<
	GameEvent,
	{ type: T }
>;

// ---------------------------------------------------------------------------
// Listener types
// ---------------------------------------------------------------------------

export type ListenerPriority = "high" | "normal" | "low";

export type EventCallback<T extends GameEventType> = (
	event: EventPayload<T>,
) => void;

/** Internal type-erased listener entry for storage. */
interface ListenerEntryInternal {
	// biome-ignore lint: callback stored as unknown to erase generic — cast back at call site.
	callback: unknown;
	priority: ListenerPriority;
	once: boolean;
}

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<ListenerPriority, number> = {
	high: 0,
	normal: 1,
	low: 2,
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Listeners keyed by event type. */
const listeners = new Map<GameEventType, ListenerEntryInternal[]>();

/** Circular buffer of recent events. */
let eventHistory: GameEvent[] = [];

/** Max events to keep in history. */
let maxHistorySize = 100;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Subscribe to an event type.
 *
 * @param eventType - The event type to listen for.
 * @param callback  - Function invoked when the event fires.
 * @param options   - Priority and one-shot settings.
 * @returns An unsubscribe function for convenience.
 */
export function subscribe<T extends GameEventType>(
	eventType: T,
	callback: EventCallback<T>,
	options: { priority?: ListenerPriority; once?: boolean } = {},
): () => void {
	const entry: ListenerEntryInternal = {
		callback,
		priority: options.priority ?? "normal",
		once: options.once ?? false,
	};

	let bucket = listeners.get(eventType);
	if (!bucket) {
		bucket = [];
		listeners.set(eventType, bucket);
	}

	bucket.push(entry);

	// Keep the bucket sorted by priority so high fires first.
	bucket.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

	return () => unsubscribe(eventType, callback);
}

/**
 * Remove a specific callback from an event type.
 */
export function unsubscribe<T extends GameEventType>(
	eventType: T,
	callback: EventCallback<T>,
): void {
	const bucket = listeners.get(eventType);
	if (!bucket) return;

	const index = bucket.findIndex((e) => e.callback === (callback as unknown));
	if (index !== -1) {
		bucket.splice(index, 1);
	}
}

/**
 * Emit a single game event.
 * Listeners are invoked synchronously in priority order.
 */
export function emit<T extends GameEventType>(event: EventPayload<T>): void {
	// Record in history.
	eventHistory.push(event);
	if (eventHistory.length > maxHistorySize) {
		eventHistory = eventHistory.slice(eventHistory.length - maxHistorySize);
	}

	const bucket = listeners.get(event.type);
	if (!bucket) return;

	// Snapshot to allow safe removal of one-shot listeners during iteration.
	const snapshot = [...bucket];

	for (const entry of snapshot) {
		(entry.callback as (event: GameEvent) => void)(event);

		if (entry.once) {
			const idx = bucket.indexOf(entry);
			if (idx !== -1) {
				bucket.splice(idx, 1);
			}
		}
	}
}

/**
 * Emit multiple events in order.
 */
export function emitMany(events: GameEvent[]): void {
	for (const event of events) {
		emit(event);
	}
}

/**
 * Query recent events from the history buffer.
 *
 * @param type  - Optional filter by event type.
 * @param count - Max number of events to return (most recent first).
 */
export function getRecentEvents<T extends GameEventType>(
	type?: T,
	count?: number,
): GameEvent[] {
	let filtered = type
		? eventHistory.filter((e) => e.type === type)
		: [...eventHistory];

	// Most recent first.
	filtered = filtered.reverse();

	if (count !== undefined && count >= 0) {
		filtered = filtered.slice(0, count);
	}

	return filtered;
}

/**
 * Configure the maximum history buffer size.
 */
export function setMaxHistorySize(size: number): void {
	maxHistorySize = Math.max(1, size);
	if (eventHistory.length > maxHistorySize) {
		eventHistory = eventHistory.slice(eventHistory.length - maxHistorySize);
	}
}

/**
 * Get current max history size.
 */
export function getMaxHistorySize(): number {
	return maxHistorySize;
}

/**
 * Clear all listeners and event history. Primarily for testing.
 */
export function reset(): void {
	listeners.clear();
	eventHistory = [];
	maxHistorySize = 100;
}
