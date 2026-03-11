/**
 * Progression system — player experience, leveling, milestones, and feature unlocks.
 *
 * XP is gained from completing quests, crafting items, discovering locations,
 * winning battles, and trading. Each level unlocks new recipes, building types,
 * and bot abilities, plus stat bonuses for mining speed, movement speed, and
 * inventory capacity.
 *
 * Level formula: level = floor(sqrt(totalXP / 100))
 * This is deterministic — no randomness in progression formulas.
 *
 * Milestones are defined in config/progression.json and checked every tick.
 * When a milestone's statKey threshold is crossed, a notification is queued
 * and the associated featureUnlock is registered. Events are emitted on the
 * global event bus for HUD and UI consumption.
 *
 * Config references:
 *   config/progression.json  (xpRewards, levelUnlocks, milestones)
 */

import progressionConfig from "../../config/progression.json";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type XPSource =
	| "quest"
	| "craft"
	| "discovery"
	| "battle"
	| "trade";

export interface XPEvent {
	amount: number;
	source: XPSource;
	tick: number;
}

export interface PlayerStats {
	totalXP: number;
	level: number;
	xpToNextLevel: number;
	totalKills: number;
	totalCrafts: number;
	totalDiscoveries: number;
	totalTrades: number;
	totalQuestsCompleted: number;
	playtimeTicks: number;
}

export interface LevelBonuses {
	miningSpeedMultiplier: number;
	movementSpeedMultiplier: number;
	inventorySlots: number;
}

export interface LevelUnlocks {
	recipes: string[];
	buildings: string[];
	abilities: string[];
}

export interface MilestoneDefinition {
	id: string;
	title: string;
	description: string;
	statKey: keyof PlayerStats;
	threshold: number;
	featureUnlock: string;
	notificationMessage: string;
}

export interface MilestoneNotification {
	milestoneId: string;
	title: string;
	message: string;
	featureUnlock: string;
	tick: number;
}

// ---------------------------------------------------------------------------
// Constants — XP per source type
// ---------------------------------------------------------------------------

export const XP_REWARDS: Record<XPSource, number> = {
	quest: 500,
	craft: 25,
	discovery: 150,
	battle: 50,
	trade: 75,
};

// ---------------------------------------------------------------------------
// Config — milestones and level unlocks
// ---------------------------------------------------------------------------

const MILESTONES: MilestoneDefinition[] = (
	progressionConfig.milestones as Array<{
		id: string;
		title: string;
		description: string;
		statKey: string;
		threshold: number;
		featureUnlock: string;
		notificationMessage: string;
	}>
).map((m) => ({ ...m, statKey: m.statKey as keyof PlayerStats }));

// ---------------------------------------------------------------------------
// Level unlock definitions (from config + fallback to hardcoded for tests)
// ---------------------------------------------------------------------------

const CONFIG_LEVEL_UNLOCKS = progressionConfig.levelUnlocks as Record<
	string,
	{ recipes: string[]; buildings: string[]; abilities: string[] }
>;

const LEVEL_UNLOCKS: Record<number, LevelUnlocks> = (() => {
	const result: Record<number, LevelUnlocks> = {};
	for (const [key, value] of Object.entries(CONFIG_LEVEL_UNLOCKS)) {
		result[Number(key)] = value;
	}
	return result;
})();

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let stats: PlayerStats = createDefaultStats();
let xpHistory: XPEvent[] = [];
const levelUpCallbacks: Array<(level: number, unlocks: LevelUnlocks) => void> =
	[];

/** Set of milestone IDs already triggered (prevents re-firing). */
const triggeredMilestones = new Set<string>();

/** Ordered list of milestone notifications (newest last). */
const milestoneNotifications: MilestoneNotification[] = [];

/** Set of feature unlock IDs unlocked via milestones. */
const unlockedFeatures = new Set<string>();

function createDefaultStats(): PlayerStats {
	return {
		totalXP: 0,
		level: 0,
		xpToNextLevel: 100,
		totalKills: 0,
		totalCrafts: 0,
		totalDiscoveries: 0,
		totalTrades: 0,
		totalQuestsCompleted: 0,
		playtimeTicks: 0,
	};
}

// ---------------------------------------------------------------------------
// Core formulas (deterministic)
// ---------------------------------------------------------------------------

/**
 * Calculate level from total XP.
 * Formula: level = floor(sqrt(totalXP / 100))
 */
export function calculateLevel(totalXP: number): number {
	if (totalXP < 0) return 0;
	return Math.floor(Math.sqrt(totalXP / 100));
}

/**
 * Calculate total XP required to reach a given level.
 * Inverse of the level formula: xp = level^2 * 100
 */
export function xpRequiredForLevel(level: number): number {
	if (level <= 0) return 0;
	return level * level * 100;
}

/**
 * Calculate XP remaining until the next level.
 */
export function calculateXPToNextLevel(totalXP: number): number {
	const currentLevel = calculateLevel(totalXP);
	const nextLevelXP = xpRequiredForLevel(currentLevel + 1);
	return nextLevelXP - totalXP;
}

/**
 * Get stat bonuses for a given level.
 * Mining speed: +2% per level
 * Movement speed: +1% per level
 * Inventory: +1 slot per level (base 5)
 */
export function getLevelBonuses(level: number): LevelBonuses {
	const cfg = progressionConfig.levelBonuses;
	return {
		miningSpeedMultiplier: 1 + level * cfg.miningSpeedPerLevel,
		movementSpeedMultiplier: 1 + level * cfg.movementSpeedPerLevel,
		inventorySlots: cfg.baseInventorySlots + level * cfg.inventorySlotsPerLevel,
	};
}

/**
 * Get unlocks granted at a specific level.
 * Returns empty arrays for levels without defined unlocks.
 */
export function getLevelUnlocks(level: number): LevelUnlocks {
	return (
		LEVEL_UNLOCKS[level] ?? {
			recipes: [],
			buildings: [],
			abilities: [],
		}
	);
}

/**
 * Get all unlocks up to and including a given level.
 */
export function getAllUnlocksUpToLevel(level: number): LevelUnlocks {
	const result: LevelUnlocks = { recipes: [], buildings: [], abilities: [] };
	for (let i = 1; i <= level; i++) {
		const unlocks = getLevelUnlocks(i);
		result.recipes.push(...unlocks.recipes);
		result.buildings.push(...unlocks.buildings);
		result.abilities.push(...unlocks.abilities);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Milestone helpers
// ---------------------------------------------------------------------------

/**
 * Return the stat value used to check a milestone's statKey.
 */
function getStatValue(statKey: keyof PlayerStats): number {
	const value = stats[statKey];
	// All PlayerStats values are numbers; level is derived but stored
	return typeof value === "number" ? value : 0;
}

/**
 * Check all milestones and fire notifications for newly-crossed thresholds.
 * Called each tick from progressionSystem after updating level.
 */
function checkMilestones(currentTick: number): void {
	for (const milestone of MILESTONES) {
		if (triggeredMilestones.has(milestone.id)) continue;

		const statValue = getStatValue(milestone.statKey);
		if (statValue >= milestone.threshold) {
			triggeredMilestones.add(milestone.id);
			unlockedFeatures.add(milestone.featureUnlock);

			const notification: MilestoneNotification = {
				milestoneId: milestone.id,
				title: milestone.title,
				message: milestone.notificationMessage,
				featureUnlock: milestone.featureUnlock,
				tick: currentTick,
			};
			milestoneNotifications.push(notification);

			// Emit achievement_unlocked event on the bus — tier 1 for milestones
			try {
				emit({
					type: "achievement_unlocked",
					achievementId: milestone.id,
					tier: 1,
					tick: currentTick,
				});
			} catch {
				// Event bus errors must not crash gameplay
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add XP from a specific source. Tracks source-specific counters.
 * Returns the new total XP.
 */
export function addXP(amount: number, source: XPSource): number {
	if (amount <= 0) return stats.totalXP;

	stats.totalXP += amount;

	switch (source) {
		case "battle":
			stats.totalKills += 1;
			break;
		case "craft":
			stats.totalCrafts += 1;
			break;
		case "discovery":
			stats.totalDiscoveries += 1;
			break;
		case "trade":
			stats.totalTrades += 1;
			break;
		case "quest":
			stats.totalQuestsCompleted += 1;
			break;
	}

	xpHistory.push({ amount, source, tick: stats.playtimeTicks });

	return stats.totalXP;
}

/**
 * Get a snapshot of the current player stats.
 */
export function getPlayerStats(): PlayerStats {
	return { ...stats };
}

/**
 * Get XP event history.
 */
export function getXPHistory(): readonly XPEvent[] {
	return [...xpHistory];
}

/**
 * Register a callback that fires on level-up.
 * Returns an unsubscribe function.
 */
export function onLevelUp(
	callback: (level: number, unlocks: LevelUnlocks) => void,
): () => void {
	levelUpCallbacks.push(callback);
	return () => {
		const idx = levelUpCallbacks.indexOf(callback);
		if (idx !== -1) levelUpCallbacks.splice(idx, 1);
	};
}

/**
 * Get all milestone notifications that have fired, in order.
 */
export function getMilestoneNotifications(): readonly MilestoneNotification[] {
	return [...milestoneNotifications];
}

/**
 * Get the set of feature IDs unlocked by milestones.
 */
export function getUnlockedFeatures(): ReadonlySet<string> {
	return unlockedFeatures;
}

/**
 * Check whether a specific feature has been unlocked via a milestone.
 */
export function isFeatureUnlocked(featureId: string): boolean {
	return unlockedFeatures.has(featureId);
}

/**
 * Get milestone progress for the HUD/UI.
 * Returns each milestone definition with current stat value and whether it's triggered.
 */
export function getMilestoneProgress(): Array<{
	milestone: MilestoneDefinition;
	currentValue: number;
	triggered: boolean;
}> {
	return MILESTONES.map((m) => ({
		milestone: m,
		currentValue: getStatValue(m.statKey),
		triggered: triggeredMilestones.has(m.id),
	}));
}

/**
 * Main system tick. Call once per simulation tick.
 *
 * - Increments playtimeTicks
 * - Checks for level-ups and emits level_up events + callbacks
 * - Checks milestones and emits achievement_unlocked events
 * - Updates xpToNextLevel
 */
export function progressionSystem(currentTick: number): void {
	stats.playtimeTicks = currentTick;

	const newLevel = calculateLevel(stats.totalXP);
	const oldLevel = stats.level;

	if (newLevel > oldLevel) {
		// Fire level-up callbacks and emit bus events for each level gained
		for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
			const unlocks = getLevelUnlocks(lvl);
			for (const cb of levelUpCallbacks) {
				cb(lvl, unlocks);
			}

			// Emit level_up event on the bus
			try {
				emit({
					type: "level_up",
					entityId: "player",
					previousLevel: lvl - 1,
					newLevel: lvl,
					tick: currentTick,
				});
			} catch {
				// Event bus errors must not crash gameplay
			}
		}
		stats.level = newLevel;
	}

	stats.xpToNextLevel = calculateXPToNextLevel(stats.totalXP);

	// Check milestones after updating level (so playerLevel statKey works)
	checkMilestones(currentTick);
}

/**
 * Reset all progression state. Primarily for testing.
 */
export function resetProgression(): void {
	stats = createDefaultStats();
	xpHistory = [];
	levelUpCallbacks.length = 0;
	triggeredMilestones.clear();
	milestoneNotifications.length = 0;
	unlockedFeatures.clear();
}
