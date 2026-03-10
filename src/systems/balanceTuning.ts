/**
 * Balance tuning system — validates and simulates game economy timing.
 *
 * Paper-playtesting revealed that many config values haven't been validated
 * against the actual core loop timing. This system provides simulation tools
 * to verify that harvest→compress→furnace→craft feels good.
 *
 * Key questions it answers:
 * - How long does it take to harvest a full load of powder?
 * - How long to compress powder into a cube?
 * - How long to smelt a cube into a usable item?
 * - What's the total time from "find ore" to "crafted item"?
 * - How does difficulty affect these timings?
 * - Are AI economies viable at their configured rates?
 *
 * No side effects — pure calculation. Used for testing and debug overlays.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Config values needed for timing calculations. */
export interface EconomyConfig {
	/** Powder extracted per tick (from mining.json oreTypes[type].grindSpeed * defaultExtractionRate) */
	extractionRatePerTick: number;
	/** Maximum powder before compression required */
	powderCapacity: number;
	/** Time in seconds for compression (from furnace.json compression.configs[type]) */
	compressionTime: number;
	/** Time in seconds for smelting (from furnace.json tiers[0].recipes[type].time) */
	smeltTime: number;
	/** Game ticks per second (typically 60) */
	ticksPerSecond: number;
	/** Walking speed in meters/second */
	walkSpeed: number;
	/** Average distance from deposit to furnace in meters */
	depositToFurnaceDistance: number;
}

/** Result of a core loop timing simulation. */
export interface CoreLoopTiming {
	/** Seconds to fill powder capacity */
	harvestDurationSeconds: number;
	/** Seconds to compress powder into cube */
	compressionDurationSeconds: number;
	/** Seconds to walk from deposit to furnace */
	walkDurationSeconds: number;
	/** Seconds to smelt cube into output */
	smeltDurationSeconds: number;
	/** Total seconds for one full cycle */
	totalCycleSeconds: number;
	/** Items produced per minute at this rate */
	itemsPerMinute: number;
	/** Assessment of whether timing feels right */
	assessment: TimingAssessment;
}

export type TimingAssessment =
	| "too_fast"    // < 15 seconds total — no tension, boring
	| "good_early"  // 15-45 seconds — appropriate for early game
	| "good_mid"    // 45-90 seconds — appropriate for mid game
	| "good_late"   // 90-180 seconds — appropriate for late game
	| "too_slow";   // > 180 seconds — frustrating, needs automation

/** Difficulty scaling factors. */
export interface DifficultyModifiers {
	/** Multiplier on player harvest rate (1.0 = normal) */
	playerHarvestRate: number;
	/** Multiplier on AI harvest rate */
	aiHarvestRate: number;
	/** Multiplier on player health */
	playerHealthMult: number;
	/** Multiplier on enemy damage */
	enemyDamageMult: number;
	/** Multiplier on resource deposit quantity */
	depositQuantityMult: number;
	/** Seconds before AI starts raiding player */
	peacePeriodSeconds: number;
}

/** Resource flow analysis for a faction. */
export interface FactionEconomyAnalysis {
	/** Cubes produced per minute */
	cubeProductionRate: number;
	/** Cubes consumed per minute (building, smelting, trading) */
	cubeConsumptionRate: number;
	/** Net cubes per minute (positive = growing, negative = shrinking) */
	netCubeFlow: number;
	/** Seconds to accumulate 10 cubes (for first wall section) */
	timeToFirstWall: number;
	/** Seconds to accumulate enough for a furnace */
	timeToFurnace: number;
	/** Whether this economy is viable */
	viable: boolean;
	/** Warning messages for balance issues */
	warnings: string[];
}

// ---------------------------------------------------------------------------
// Difficulty presets
// ---------------------------------------------------------------------------

const DIFFICULTY_PRESETS: Record<string, DifficultyModifiers> = {
	easy: {
		playerHarvestRate: 1.5,
		aiHarvestRate: 0.5,
		playerHealthMult: 1.5,
		enemyDamageMult: 0.5,
		depositQuantityMult: 1.5,
		peacePeriodSeconds: 600,
	},
	normal: {
		playerHarvestRate: 1.0,
		aiHarvestRate: 1.0,
		playerHealthMult: 1.0,
		enemyDamageMult: 1.0,
		depositQuantityMult: 1.0,
		peacePeriodSeconds: 300,
	},
	hard: {
		playerHarvestRate: 0.8,
		aiHarvestRate: 1.3,
		playerHealthMult: 0.8,
		enemyDamageMult: 1.5,
		depositQuantityMult: 0.7,
		peacePeriodSeconds: 120,
	},
	brutal: {
		playerHarvestRate: 0.6,
		aiHarvestRate: 2.0,
		playerHealthMult: 0.5,
		enemyDamageMult: 2.0,
		depositQuantityMult: 0.5,
		peacePeriodSeconds: 30,
	},
};

// ---------------------------------------------------------------------------
// Core Loop Timing
// ---------------------------------------------------------------------------

/**
 * Simulate the core loop timing for given economy config.
 *
 * Calculates how long each step takes and assesses whether the pacing
 * is appropriate for the game phase.
 */
export function simulateCoreLoopTiming(cfg: EconomyConfig): CoreLoopTiming {
	// Harvest: ticks to fill capacity, then convert to seconds
	const ticksToFill = cfg.powderCapacity / cfg.extractionRatePerTick;
	const harvestDurationSeconds = ticksToFill / cfg.ticksPerSecond;

	// Compression: direct from config
	const compressionDurationSeconds = cfg.compressionTime;

	// Walk: distance / speed
	const walkDurationSeconds =
		cfg.walkSpeed > 0
			? cfg.depositToFurnaceDistance / cfg.walkSpeed
			: 0;

	// Smelt: direct from config
	const smeltDurationSeconds = cfg.smeltTime;

	// Total cycle = harvest + compress + walk + smelt + walk back
	const totalCycleSeconds =
		harvestDurationSeconds +
		compressionDurationSeconds +
		walkDurationSeconds +
		smeltDurationSeconds +
		walkDurationSeconds; // walk back to deposit

	// Items per minute
	const itemsPerMinute =
		totalCycleSeconds > 0 ? 60 / totalCycleSeconds : 0;

	// Assess timing
	let assessment: TimingAssessment;
	if (totalCycleSeconds < 15) {
		assessment = "too_fast";
	} else if (totalCycleSeconds < 45) {
		assessment = "good_early";
	} else if (totalCycleSeconds < 90) {
		assessment = "good_mid";
	} else if (totalCycleSeconds < 180) {
		assessment = "good_late";
	} else {
		assessment = "too_slow";
	}

	return {
		harvestDurationSeconds,
		compressionDurationSeconds,
		walkDurationSeconds,
		smeltDurationSeconds,
		totalCycleSeconds,
		itemsPerMinute,
		assessment,
	};
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

/**
 * Get difficulty modifiers for a given difficulty level.
 */
export function getDifficultyModifiers(
	difficulty: string,
): DifficultyModifiers {
	return (
		DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.normal
	);
}

/**
 * Apply difficulty modifiers to an economy config.
 */
export function applyDifficultyToConfig(
	baseConfig: EconomyConfig,
	difficulty: string,
): EconomyConfig {
	const mods = getDifficultyModifiers(difficulty);
	return {
		...baseConfig,
		extractionRatePerTick:
			baseConfig.extractionRatePerTick * mods.playerHarvestRate,
		powderCapacity: baseConfig.powderCapacity,
		compressionTime: baseConfig.compressionTime,
		smeltTime: baseConfig.smeltTime,
		ticksPerSecond: baseConfig.ticksPerSecond,
		walkSpeed: baseConfig.walkSpeed,
		depositToFurnaceDistance: baseConfig.depositToFurnaceDistance,
	};
}

// ---------------------------------------------------------------------------
// Faction Economy Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze whether a faction's economy is viable at given rates.
 *
 * A viable economy must:
 * - Produce cubes faster than it consumes them (positive net flow)
 * - Reach first wall within 5 minutes
 * - Reach furnace within 10 minutes
 */
export function analyzeFactionEconomy(
	productionRate: number,
	consumptionRate: number,
	cubesForWall: number,
	cubesForFurnace: number,
): FactionEconomyAnalysis {
	const netCubeFlow = productionRate - consumptionRate;

	const timeToFirstWall =
		netCubeFlow > 0 ? (cubesForWall / netCubeFlow) * 60 : Number.POSITIVE_INFINITY;
	const timeToFurnace =
		netCubeFlow > 0 ? (cubesForFurnace / netCubeFlow) * 60 : Number.POSITIVE_INFINITY;

	const warnings: string[] = [];

	if (netCubeFlow <= 0) {
		warnings.push(
			"CRITICAL: Negative cube flow — faction will never grow",
		);
	}

	if (timeToFirstWall > 300) {
		warnings.push(
			`Wall takes ${Math.round(timeToFirstWall)}s — too slow (target <300s)`,
		);
	}

	if (timeToFurnace > 600) {
		warnings.push(
			`Furnace takes ${Math.round(timeToFurnace)}s — too slow (target <600s)`,
		);
	}

	if (productionRate > 10) {
		warnings.push(
			"Production rate >10 cubes/min may cause physics instability from too many rigid bodies",
		);
	}

	const viable =
		netCubeFlow > 0 &&
		timeToFirstWall <= 300 &&
		timeToFurnace <= 600;

	return {
		cubeProductionRate: productionRate,
		cubeConsumptionRate: consumptionRate,
		netCubeFlow,
		timeToFirstWall,
		timeToFurnace,
		viable,
		warnings,
	};
}

// ---------------------------------------------------------------------------
// Harvest Rate Recommendations
// ---------------------------------------------------------------------------

/**
 * Calculate the ideal extraction rate for a target harvest duration.
 *
 * Given a desired harvest time and powder capacity, returns the extraction
 * rate per tick needed.
 */
export function calculateIdealExtractionRate(
	targetHarvestSeconds: number,
	powderCapacity: number,
	ticksPerSecond: number,
): number {
	if (targetHarvestSeconds <= 0 || ticksPerSecond <= 0) return 0;
	const totalTicks = targetHarvestSeconds * ticksPerSecond;
	return powderCapacity / totalTicks;
}

/**
 * Generate a balance report comparing current config against targets.
 */
export function generateBalanceReport(
	currentConfig: EconomyConfig,
	targetEarlyGameCycleSeconds: number,
	targetMidGameCycleSeconds: number,
): BalanceReport {
	const currentTiming = simulateCoreLoopTiming(currentConfig);

	const idealEarlyRate = calculateIdealExtractionRate(
		targetEarlyGameCycleSeconds * 0.4, // 40% of cycle is harvesting
		currentConfig.powderCapacity,
		currentConfig.ticksPerSecond,
	);

	const idealMidRate = calculateIdealExtractionRate(
		targetMidGameCycleSeconds * 0.3, // 30% — better tools
		currentConfig.powderCapacity,
		currentConfig.ticksPerSecond,
	);

	const issues: string[] = [];

	if (currentTiming.assessment === "too_fast") {
		issues.push(
			`Core loop is ${currentTiming.totalCycleSeconds.toFixed(1)}s — too fast, no tension. Target: 20-45s for early game.`,
		);
	}
	if (currentTiming.assessment === "too_slow") {
		issues.push(
			`Core loop is ${currentTiming.totalCycleSeconds.toFixed(1)}s — too slow, frustrating. Target: <90s even late game.`,
		);
	}
	if (currentTiming.harvestDurationSeconds < 3) {
		issues.push(
			`Harvest takes ${currentTiming.harvestDurationSeconds.toFixed(1)}s — too fast, should feel like work. Target: 8-15s.`,
		);
	}
	if (currentTiming.compressionDurationSeconds < 1) {
		issues.push(
			`Compression is ${currentTiming.compressionDurationSeconds.toFixed(1)}s — too fast for dramatic effect. Target: 2-4s.`,
		);
	}

	return {
		currentTiming,
		idealEarlyExtractionRate: idealEarlyRate,
		idealMidExtractionRate: idealMidRate,
		currentExtractionRate: currentConfig.extractionRatePerTick,
		issues,
		overallHealth: issues.length === 0 ? "healthy" : issues.length <= 2 ? "needs_tuning" : "broken",
	};
}

/** Balance report output. */
export interface BalanceReport {
	currentTiming: CoreLoopTiming;
	idealEarlyExtractionRate: number;
	idealMidExtractionRate: number;
	currentExtractionRate: number;
	issues: string[];
	overallHealth: "healthy" | "needs_tuning" | "broken";
}

// ---------------------------------------------------------------------------
// Combat Balance
// ---------------------------------------------------------------------------

/**
 * Calculate time-to-kill for a given damage/health matchup.
 */
export function calculateTimeToKill(
	dps: number,
	targetHealth: number,
	armorReduction: number,
): number {
	if (dps <= 0) return Number.POSITIVE_INFINITY;
	const effectiveDps = dps * (1 - armorReduction);
	if (effectiveDps <= 0) return Number.POSITIVE_INFINITY;
	return targetHealth / effectiveDps;
}

/**
 * Assess whether a combat matchup is balanced.
 *
 * A good 1v1 should last 5-15 seconds. Too fast = no counterplay.
 * Too slow = tedious.
 */
export function assessCombatBalance(
	ttk: number,
): "too_squishy" | "balanced" | "too_tanky" {
	if (ttk < 3) return "too_squishy";
	if (ttk > 20) return "too_tanky";
	return "balanced";
}
