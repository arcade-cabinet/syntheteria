/**
 * Progression system — player experience and leveling.
 *
 * XP is gained from completing quests, crafting items, discovering locations,
 * winning battles, and trading. Each level unlocks new recipes, building types,
 * and bot abilities, plus stat bonuses for mining speed, movement speed, and
 * inventory capacity.
 *
 * Level formula: level = floor(sqrt(totalXP / 100))
 * This is deterministic — no randomness in progression formulas.
 */

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
// Level unlock definitions
// ---------------------------------------------------------------------------

const LEVEL_UNLOCKS: Record<number, LevelUnlocks> = {
	1: {
		recipes: ["iron_plate", "copper_wire"],
		buildings: ["storage_crate"],
		abilities: ["scan"],
	},
	2: {
		recipes: ["steel_beam", "circuit_board"],
		buildings: ["smelter"],
		abilities: ["dash"],
	},
	3: {
		recipes: ["alloy_ingot", "motor"],
		buildings: ["assembler", "turret_base"],
		abilities: ["overclock"],
	},
	4: {
		recipes: ["advanced_circuit", "power_cell"],
		buildings: ["refinery", "radar_tower"],
		abilities: ["shield"],
	},
	5: {
		recipes: ["quantum_core", "nano_fiber"],
		buildings: ["fabricator", "signal_jammer"],
		abilities: ["teleport"],
	},
	6: {
		recipes: ["fusion_cell", "adaptive_alloy"],
		buildings: ["mega_furnace", "drone_bay"],
		abilities: ["overcharge"],
	},
	7: {
		recipes: ["singularity_shard"],
		buildings: ["fortress_gate"],
		abilities: ["emp_burst"],
	},
	8: {
		recipes: ["void_crystal"],
		buildings: ["orbital_relay"],
		abilities: ["mass_recall"],
	},
	9: {
		recipes: ["omega_catalyst"],
		buildings: ["world_engine"],
		abilities: ["domination_field"],
	},
	10: {
		recipes: ["genesis_matrix"],
		buildings: ["nexus_core"],
		abilities: ["ascension"],
	},
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let stats: PlayerStats = createDefaultStats();
let xpHistory: XPEvent[] = [];
const levelUpCallbacks: Array<(level: number, unlocks: LevelUnlocks) => void> =
	[];

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
	return {
		miningSpeedMultiplier: 1 + level * 0.02,
		movementSpeedMultiplier: 1 + level * 0.01,
		inventorySlots: 5 + level,
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
 * Main system tick. Call once per simulation tick.
 *
 * - Increments playtimeTicks
 * - Checks for level-ups and emits events
 * - Updates xpToNextLevel
 */
export function progressionSystem(currentTick: number): void {
	stats.playtimeTicks = currentTick;

	const newLevel = calculateLevel(stats.totalXP);
	const oldLevel = stats.level;

	if (newLevel > oldLevel) {
		// Fire level-up callbacks for each level gained
		for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
			const unlocks = getLevelUnlocks(lvl);
			for (const cb of levelUpCallbacks) {
				cb(lvl, unlocks);
			}
		}
		stats.level = newLevel;
	}

	stats.xpToNextLevel = calculateXPToNextLevel(stats.totalXP);
}

/**
 * Reset all progression state. Primarily for testing.
 */
export function resetProgression(): void {
	stats = createDefaultStats();
	xpHistory = [];
	levelUpCallbacks.length = 0;
}
