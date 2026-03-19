import { trait } from "koota";

export const UnitPos = trait({ tileX: 0, tileZ: 0 });

export const UnitMove = trait({
	fromX: 0,
	fromZ: 0,
	toX: 0,
	toZ: 0,
	progress: 0.0,
	mpCost: 1,
});

export const UnitFaction = trait({ factionId: "" });

export const UnitStats = trait({
	hp: 10,
	maxHp: 10,
	/** Action Points — spent on harvest, build, repair, attack, hack, survey. */
	ap: 2,
	maxAp: 2,
	/** Movement Points — 1 MP = 1 cell. Terrain modifiers apply. */
	mp: 3,
	maxMp: 3,
	scanRange: 4,
	attack: 2,
	defense: 0,
	/** Manhattan distance for attack. 1 = melee, 2+ = ranged. */
	attackRange: 1,
	weightClass: "medium" as import("../../board/types").WeightClass,
	/** Robot class — determines movement profile and available actions. */
	robotClass: "infantry" as import("../robots/types").RobotClass,
	/** How many separate move commands allowed per turn. */
	movesPerTurn: 1,
	/** Max Manhattan distance per single move command. */
	cellsPerMove: 2,
	/** How many move commands used this turn (reset at turn start). */
	movesUsed: 0,
	/** Whether unit has staged this turn (committed to stationary actions). */
	staged: false,
});

export const UnitVisual = trait({
	modelId: "",
	scale: 1.0,
	facingAngle: 0.0,
});

export const UnitAttack = trait({ targetEntityId: -1, damage: 2 });

/** Transient trait added after combat resolution for visual/audio feedback. */
export const CombatResult = trait({
	/** "hit" = took damage, "destroyed" = unit was killed, "counter" = counterattack received */
	kind: "hit" as "hit" | "destroyed" | "counter",
	damage: 0,
	/** Frame counter — renderer removes after N frames. */
	framesRemaining: 60,
});

export const UnitHarvest = trait({
	depositEntityId: -1,
	ticksRemaining: 0,
	totalTicks: 3,
	targetX: 0,
	targetZ: 0,
});

/** Floor mining — strip-mining a tile for basic resources. Backstop economy. */
export const UnitMine = trait({
	/** Target tile coordinates. */
	targetX: 0,
	targetZ: 0,
	/** Ticks remaining (from FloorDef.hardness). */
	ticksRemaining: 0,
	/** Total ticks for progress display. */
	totalTicks: 0,
});

/**
 * Specialization track chosen at fabrication time. Permanent — cannot be swapped.
 * null trackId = no specialization (cult units, or unspecialized base units).
 */
export const UnitSpecialization = trait({
	/** Track ID (e.g. "pathfinder", "vanguard", "sniper"). Empty = none. */
	trackId: "",
	/** Track version: 1 = base, 2 = upgraded via higher-tier tech. */
	trackVersion: 1 as 1 | 2,
});

/**
 * Marks applied to a unit + its tier level.
 * BotTier 1 = base, 2 = one research lab, 3 = two research labs.
 * marks is a comma-separated string of BotMark ids (Koota traits can't store arrays).
 */
export const UnitUpgrade = trait({
	/** Comma-separated BotMark ids, e.g. "reinforced_hull,swift_treads". Empty = no marks. */
	marks: "",
	/** Current tier: 1 (base), 2 (mark I unlocked), 3 (mark II unlocked). */
	tier: 1,
});

/**
 * Experience accumulation for a unit.
 * Units gain XP from role-aligned actions (combat, harvest, explore, build, etc.).
 * XP accumulates toward Mark thresholds for upgrading.
 */
export const UnitXP = trait({
	/** Accumulated experience points. */
	xp: 0,
	/** Current mark level (1 = base). */
	markLevel: 1,
	/** Lifetime kill count (for stats/achievements). */
	killCount: 0,
	/** Lifetime harvest count. */
	harvestCount: 0,
});
