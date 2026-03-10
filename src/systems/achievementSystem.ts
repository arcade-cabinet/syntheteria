/**
 * Achievement system — milestones and tiered accomplishments.
 *
 * Tracks player progress across exploration, combat, economy, building,
 * social, and mastery categories. Each achievement has bronze/silver/gold
 * tiers with increasing thresholds.
 *
 * Achievements are checked periodically against accumulated game stats.
 * No randomness — purely threshold-based.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AchievementType =
	| "exploration"
	| "combat"
	| "economy"
	| "building"
	| "social"
	| "mastery";

export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementDefinition {
	id: string;
	title: string;
	description: string;
	type: AchievementType;
	tier: AchievementTier;
	requirement: number;
	/** Stat key to check against in GameStats */
	statKey: string;
}

export interface AchievementState {
	id: string;
	definition: AchievementDefinition;
	currentProgress: number;
	completed: boolean;
	completedTick: number | null;
}

export interface GameStats {
	locationsDiscovered: number;
	enemiesDefeated: number;
	cubesAccumulated: number;
	structuresPlaced: number;
	tradesCompleted: number;
	playerLevel: number;
	oreHarvested: number;
	cubesCompressed: number;
	questsCompleted: number;
	beltSegmentsBuilt: number;
	wiresConnected: number;
	machinesAssembled: number;
	territoriesClaimed: number;
	botsBuilt: number;
}

export interface AchievementEvent {
	achievementId: string;
	title: string;
	tier: AchievementTier;
	type: AchievementType;
	tick: number;
}

// ---------------------------------------------------------------------------
// Achievement definitions (20+ achievements)
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
	// Exploration — discover N locations
	{
		id: "explorer_bronze",
		title: "Curious Wanderer",
		description: "Discover 5 locations",
		type: "exploration",
		tier: "bronze",
		requirement: 5,
		statKey: "locationsDiscovered",
	},
	{
		id: "explorer_silver",
		title: "Trailblazer",
		description: "Discover 25 locations",
		type: "exploration",
		tier: "silver",
		requirement: 25,
		statKey: "locationsDiscovered",
	},
	{
		id: "explorer_gold",
		title: "Cartographer",
		description: "Discover 100 locations",
		type: "exploration",
		tier: "gold",
		requirement: 100,
		statKey: "locationsDiscovered",
	},

	// Combat — defeat N enemies
	{
		id: "fighter_bronze",
		title: "Scrap Brawler",
		description: "Defeat 10 enemies",
		type: "combat",
		tier: "bronze",
		requirement: 10,
		statKey: "enemiesDefeated",
	},
	{
		id: "fighter_silver",
		title: "Iron Warrior",
		description: "Defeat 100 enemies",
		type: "combat",
		tier: "silver",
		requirement: 100,
		statKey: "enemiesDefeated",
	},
	{
		id: "fighter_gold",
		title: "Annihilator",
		description: "Defeat 1000 enemies",
		type: "combat",
		tier: "gold",
		requirement: 1000,
		statKey: "enemiesDefeated",
	},

	// Economy — accumulate N cubes
	{
		id: "hoarder_bronze",
		title: "Cube Collector",
		description: "Accumulate 10 cubes",
		type: "economy",
		tier: "bronze",
		requirement: 10,
		statKey: "cubesAccumulated",
	},
	{
		id: "hoarder_silver",
		title: "Stockpiler",
		description: "Accumulate 100 cubes",
		type: "economy",
		tier: "silver",
		requirement: 100,
		statKey: "cubesAccumulated",
	},
	{
		id: "hoarder_gold",
		title: "Cube Magnate",
		description: "Accumulate 1000 cubes",
		type: "economy",
		tier: "gold",
		requirement: 1000,
		statKey: "cubesAccumulated",
	},

	// Building — place N structures
	{
		id: "builder_bronze",
		title: "Foundation Layer",
		description: "Place 5 structures",
		type: "building",
		tier: "bronze",
		requirement: 5,
		statKey: "structuresPlaced",
	},
	{
		id: "builder_silver",
		title: "Architect",
		description: "Place 50 structures",
		type: "building",
		tier: "silver",
		requirement: 50,
		statKey: "structuresPlaced",
	},
	{
		id: "builder_gold",
		title: "Master Builder",
		description: "Place 500 structures",
		type: "building",
		tier: "gold",
		requirement: 500,
		statKey: "structuresPlaced",
	},

	// Social — complete N trades
	{
		id: "trader_bronze",
		title: "Barterer",
		description: "Complete 5 trades",
		type: "social",
		tier: "bronze",
		requirement: 5,
		statKey: "tradesCompleted",
	},
	{
		id: "trader_silver",
		title: "Merchant",
		description: "Complete 25 trades",
		type: "social",
		tier: "silver",
		requirement: 25,
		statKey: "tradesCompleted",
	},
	{
		id: "trader_gold",
		title: "Trade Baron",
		description: "Complete 100 trades",
		type: "social",
		tier: "gold",
		requirement: 100,
		statKey: "tradesCompleted",
	},

	// Mastery — reach level N
	{
		id: "level_bronze",
		title: "Awakened",
		description: "Reach level 3",
		type: "mastery",
		tier: "bronze",
		requirement: 3,
		statKey: "playerLevel",
	},
	{
		id: "level_silver",
		title: "Veteran",
		description: "Reach level 5",
		type: "mastery",
		tier: "silver",
		requirement: 5,
		statKey: "playerLevel",
	},
	{
		id: "level_gold",
		title: "Ascendant",
		description: "Reach level 10",
		type: "mastery",
		tier: "gold",
		requirement: 10,
		statKey: "playerLevel",
	},

	// Ore harvesting
	{
		id: "miner_bronze",
		title: "Ore Nibbler",
		description: "Harvest 50 ore",
		type: "economy",
		tier: "bronze",
		requirement: 50,
		statKey: "oreHarvested",
	},
	{
		id: "miner_silver",
		title: "Deep Driller",
		description: "Harvest 500 ore",
		type: "economy",
		tier: "silver",
		requirement: 500,
		statKey: "oreHarvested",
	},
	{
		id: "miner_gold",
		title: "Strip Miner",
		description: "Harvest 5000 ore",
		type: "economy",
		tier: "gold",
		requirement: 5000,
		statKey: "oreHarvested",
	},

	// Quest completion
	{
		id: "quester_bronze",
		title: "Errand Runner",
		description: "Complete 3 quests",
		type: "exploration",
		tier: "bronze",
		requirement: 3,
		statKey: "questsCompleted",
	},
	{
		id: "quester_silver",
		title: "Questmaster",
		description: "Complete 10 quests",
		type: "exploration",
		tier: "silver",
		requirement: 10,
		statKey: "questsCompleted",
	},

	// Territory
	{
		id: "conqueror_bronze",
		title: "Land Grabber",
		description: "Claim 3 territories",
		type: "exploration",
		tier: "bronze",
		requirement: 3,
		statKey: "territoriesClaimed",
	},
	{
		id: "conqueror_gold",
		title: "Dominion",
		description: "Claim 20 territories",
		type: "exploration",
		tier: "gold",
		requirement: 20,
		statKey: "territoriesClaimed",
	},
];

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let achievementStates: Map<string, AchievementState> = new Map();
let completionEvents: AchievementEvent[] = [];
const completionCallbacks: Array<(event: AchievementEvent) => void> = [];
let initialized = false;

function initializeAchievements(): void {
	if (initialized) return;
	initialized = true;

	for (const def of ACHIEVEMENT_DEFINITIONS) {
		achievementStates.set(def.id, {
			id: def.id,
			definition: def,
			currentProgress: 0,
			completed: false,
			completedTick: null,
		});
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check all incomplete achievements against current game stats.
 * Returns an array of newly completed achievement IDs.
 */
export function checkAchievements(gameStats: GameStats): string[] {
	initializeAchievements();

	const newlyCompleted: string[] = [];

	for (const state of achievementStates.values()) {
		if (state.completed) continue;

		const statValue =
			gameStats[state.definition.statKey as keyof GameStats] ?? 0;
		state.currentProgress = statValue;

		if (statValue >= state.definition.requirement) {
			state.completed = true;
			// completedTick is set by the system tick; if called directly, use 0
			if (state.completedTick === null) {
				state.completedTick = 0;
			}
			newlyCompleted.push(state.id);
		}
	}

	return newlyCompleted;
}

/**
 * Get all completed achievements.
 */
export function getCompletedAchievements(): AchievementState[] {
	initializeAchievements();
	return Array.from(achievementStates.values()).filter((a) => a.completed);
}

/**
 * Get progress for a specific achievement.
 */
export function getAchievementProgress(
	id: string,
): { current: number; required: number; completed: boolean } | null {
	initializeAchievements();

	const state = achievementStates.get(id);
	if (!state) return null;

	return {
		current: state.currentProgress,
		required: state.definition.requirement,
		completed: state.completed,
	};
}

/**
 * Get all achievement states.
 */
export function getAllAchievements(): AchievementState[] {
	initializeAchievements();
	return Array.from(achievementStates.values());
}

/**
 * Get achievements filtered by type.
 */
export function getAchievementsByType(
	type: AchievementType,
): AchievementState[] {
	initializeAchievements();
	return Array.from(achievementStates.values()).filter(
		(a) => a.definition.type === type,
	);
}

/**
 * Get achievements filtered by tier.
 */
export function getAchievementsByTier(
	tier: AchievementTier,
): AchievementState[] {
	initializeAchievements();
	return Array.from(achievementStates.values()).filter(
		(a) => a.definition.tier === tier,
	);
}

/**
 * Get completion events history.
 */
export function getCompletionEvents(): readonly AchievementEvent[] {
	return [...completionEvents];
}

/**
 * Register a callback that fires when an achievement is completed.
 * Returns an unsubscribe function.
 */
export function onAchievementComplete(
	callback: (event: AchievementEvent) => void,
): () => void {
	completionCallbacks.push(callback);
	return () => {
		const idx = completionCallbacks.indexOf(callback);
		if (idx !== -1) completionCallbacks.splice(idx, 1);
	};
}

/**
 * Main system tick. Call once per simulation tick.
 *
 * Checks all incomplete achievements against the provided game stats.
 * Emits completion events and fires callbacks for newly completed achievements.
 */
export function achievementSystem(
	currentTick: number,
	gameStats: GameStats,
): void {
	initializeAchievements();

	for (const state of achievementStates.values()) {
		if (state.completed) continue;

		const statValue =
			gameStats[state.definition.statKey as keyof GameStats] ?? 0;
		state.currentProgress = statValue;

		if (statValue >= state.definition.requirement) {
			state.completed = true;
			state.completedTick = currentTick;

			const event: AchievementEvent = {
				achievementId: state.id,
				title: state.definition.title,
				tier: state.definition.tier,
				type: state.definition.type,
				tick: currentTick,
			};

			completionEvents.push(event);

			for (const cb of completionCallbacks) {
				cb(event);
			}
		}
	}
}

/**
 * Reset all achievement state. Primarily for testing.
 */
export function resetAchievements(): void {
	achievementStates = new Map();
	completionEvents = [];
	completionCallbacks.length = 0;
	initialized = false;
}
