/**
 * Unit tests for balanceTuning.ts — game economy timing validation.
 *
 * These tests serve as paper-playtest assertions: they encode what
 * "good" game pacing should feel like and flag when config values
 * produce bad timing.
 */

import {
	simulateCoreLoopTiming,
	getDifficultyModifiers,
	applyDifficultyToConfig,
	analyzeFactionEconomy,
	calculateIdealExtractionRate,
	generateBalanceReport,
	calculateTimeToKill,
	assessCombatBalance,
	type EconomyConfig,
} from "../balanceTuning";

// ---------------------------------------------------------------------------
// Test config — represents a reasonable early-game setup
// ---------------------------------------------------------------------------

const EARLY_GAME_CONFIG: EconomyConfig = {
	extractionRatePerTick: 0.5,    // slow early grinder
	powderCapacity: 100,
	compressionTime: 3,            // 3 seconds to compress
	smeltTime: 5,                  // 5 seconds to smelt
	ticksPerSecond: 60,
	walkSpeed: 3,                  // 3 m/s walking
	depositToFurnaceDistance: 15,   // 15 meters
};

const FAST_CONFIG: EconomyConfig = {
	extractionRatePerTick: 10,     // overpowered
	powderCapacity: 50,
	compressionTime: 0.5,
	smeltTime: 1,
	ticksPerSecond: 60,
	walkSpeed: 5,
	depositToFurnaceDistance: 5,
};

const SLOW_CONFIG: EconomyConfig = {
	extractionRatePerTick: 0.05,   // painfully slow
	powderCapacity: 200,
	compressionTime: 10,
	smeltTime: 30,
	ticksPerSecond: 60,
	walkSpeed: 1,
	depositToFurnaceDistance: 50,
};

// ---------------------------------------------------------------------------
// simulateCoreLoopTiming
// ---------------------------------------------------------------------------

describe("simulateCoreLoopTiming", () => {
	it("calculates harvest duration correctly", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		// 100 powder / 0.5 per tick = 200 ticks / 60 tps = 3.33 seconds
		expect(result.harvestDurationSeconds).toBeCloseTo(3.33, 1);
	});

	it("includes compression time", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		expect(result.compressionDurationSeconds).toBe(3);
	});

	it("calculates walk time from distance and speed", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		// 15m / 3 m/s = 5 seconds each way
		expect(result.walkDurationSeconds).toBeCloseTo(5, 1);
	});

	it("includes smelt time", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		expect(result.smeltDurationSeconds).toBe(5);
	});

	it("total cycle includes harvest + compress + walk + smelt + walk back", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		const expected =
			result.harvestDurationSeconds +
			result.compressionDurationSeconds +
			result.walkDurationSeconds +
			result.smeltDurationSeconds +
			result.walkDurationSeconds; // walk back
		expect(result.totalCycleSeconds).toBeCloseTo(expected, 2);
	});

	it("calculates items per minute", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		expect(result.itemsPerMinute).toBeCloseTo(
			60 / result.totalCycleSeconds,
			2,
		);
	});

	it("assesses too-fast configs", () => {
		const result = simulateCoreLoopTiming(FAST_CONFIG);
		expect(result.assessment).toBe("too_fast");
		expect(result.totalCycleSeconds).toBeLessThan(15);
	});

	it("assesses too-slow configs", () => {
		const result = simulateCoreLoopTiming(SLOW_CONFIG);
		expect(result.assessment).toBe("too_slow");
		expect(result.totalCycleSeconds).toBeGreaterThan(180);
	});

	it("handles zero walk speed gracefully", () => {
		const cfg = { ...EARLY_GAME_CONFIG, walkSpeed: 0 };
		const result = simulateCoreLoopTiming(cfg);
		expect(result.walkDurationSeconds).toBe(0);
	});

	// PAPER PLAYTEST ASSERTION: early game cycle should be 15-45 seconds
	it("early game config produces good_early timing", () => {
		const result = simulateCoreLoopTiming(EARLY_GAME_CONFIG);
		expect(result.assessment).toBe("good_early");
	});
});

// ---------------------------------------------------------------------------
// getDifficultyModifiers
// ---------------------------------------------------------------------------

describe("getDifficultyModifiers", () => {
	it("returns easy modifiers", () => {
		const mods = getDifficultyModifiers("easy");
		expect(mods.playerHarvestRate).toBe(1.5);
		expect(mods.aiHarvestRate).toBe(0.5);
		expect(mods.peacePeriodSeconds).toBe(600);
	});

	it("returns normal modifiers", () => {
		const mods = getDifficultyModifiers("normal");
		expect(mods.playerHarvestRate).toBe(1.0);
		expect(mods.enemyDamageMult).toBe(1.0);
	});

	it("returns hard modifiers", () => {
		const mods = getDifficultyModifiers("hard");
		expect(mods.playerHarvestRate).toBe(0.8);
		expect(mods.aiHarvestRate).toBe(1.3);
	});

	it("returns brutal modifiers", () => {
		const mods = getDifficultyModifiers("brutal");
		expect(mods.playerHarvestRate).toBe(0.6);
		expect(mods.enemyDamageMult).toBe(2.0);
		expect(mods.peacePeriodSeconds).toBe(30);
	});

	it("defaults to normal for unknown difficulty", () => {
		const mods = getDifficultyModifiers("unknown_level");
		expect(mods.playerHarvestRate).toBe(1.0);
	});

	// PAPER PLAYTEST ASSERTION: easy should give 10 min peace period
	it("easy gives 10 minutes of peace", () => {
		const mods = getDifficultyModifiers("easy");
		expect(mods.peacePeriodSeconds).toBe(600);
	});

	// PAPER PLAYTEST ASSERTION: brutal should still give 30s to orient
	it("brutal still gives at least 30 seconds", () => {
		const mods = getDifficultyModifiers("brutal");
		expect(mods.peacePeriodSeconds).toBeGreaterThanOrEqual(30);
	});
});

// ---------------------------------------------------------------------------
// applyDifficultyToConfig
// ---------------------------------------------------------------------------

describe("applyDifficultyToConfig", () => {
	it("easy increases extraction rate", () => {
		const adjusted = applyDifficultyToConfig(EARLY_GAME_CONFIG, "easy");
		expect(adjusted.extractionRatePerTick).toBeCloseTo(
			EARLY_GAME_CONFIG.extractionRatePerTick * 1.5,
		);
	});

	it("hard decreases extraction rate", () => {
		const adjusted = applyDifficultyToConfig(EARLY_GAME_CONFIG, "hard");
		expect(adjusted.extractionRatePerTick).toBeLessThan(
			EARLY_GAME_CONFIG.extractionRatePerTick,
		);
	});

	it("preserves non-modified config values", () => {
		const adjusted = applyDifficultyToConfig(EARLY_GAME_CONFIG, "hard");
		expect(adjusted.powderCapacity).toBe(EARLY_GAME_CONFIG.powderCapacity);
		expect(adjusted.compressionTime).toBe(EARLY_GAME_CONFIG.compressionTime);
	});
});

// ---------------------------------------------------------------------------
// analyzeFactionEconomy
// ---------------------------------------------------------------------------

describe("analyzeFactionEconomy", () => {
	it("reports positive net flow when production > consumption", () => {
		const result = analyzeFactionEconomy(5, 2, 10, 20);
		expect(result.netCubeFlow).toBe(3);
		expect(result.viable).toBe(true);
	});

	it("flags negative net flow as non-viable", () => {
		const result = analyzeFactionEconomy(1, 3, 10, 20);
		expect(result.netCubeFlow).toBe(-2);
		expect(result.viable).toBe(false);
		expect(result.warnings.some((w) => w.includes("Negative"))).toBe(true);
	});

	it("calculates time to first wall", () => {
		// 3 cubes/min net, need 10 cubes → 10/3 * 60 = 200 seconds
		const result = analyzeFactionEconomy(5, 2, 10, 20);
		expect(result.timeToFirstWall).toBeCloseTo(200, 0);
	});

	it("flags slow wall time", () => {
		const result = analyzeFactionEconomy(1.5, 1, 10, 20);
		// 0.5 net, 10 cubes → 10/0.5 * 60 = 1200 seconds
		expect(result.warnings.some((w) => w.includes("Wall takes"))).toBe(true);
	});

	it("warns about high production rates (physics stress)", () => {
		const result = analyzeFactionEconomy(15, 5, 10, 20);
		expect(result.warnings.some((w) => w.includes("physics instability"))).toBe(true);
	});

	it("handles zero net flow", () => {
		const result = analyzeFactionEconomy(3, 3, 10, 20);
		expect(result.netCubeFlow).toBe(0);
		expect(result.viable).toBe(false);
	});

	// PAPER PLAYTEST ASSERTION: player should reach first wall in < 5 min
	it("reasonable config reaches wall within 5 minutes", () => {
		const result = analyzeFactionEconomy(4, 1, 8, 15);
		expect(result.timeToFirstWall).toBeLessThan(300);
	});
});

// ---------------------------------------------------------------------------
// calculateIdealExtractionRate
// ---------------------------------------------------------------------------

describe("calculateIdealExtractionRate", () => {
	it("calculates rate for target harvest duration", () => {
		// Want 10 seconds to fill 100 powder at 60 tps
		// = 100 / (10 * 60) = 0.1667 per tick
		const rate = calculateIdealExtractionRate(10, 100, 60);
		expect(rate).toBeCloseTo(0.1667, 3);
	});

	it("returns 0 for invalid inputs", () => {
		expect(calculateIdealExtractionRate(0, 100, 60)).toBe(0);
		expect(calculateIdealExtractionRate(10, 100, 0)).toBe(0);
	});

	// PAPER PLAYTEST ASSERTION: ideal early harvest should take 8-15 seconds
	it("ideal early rate produces 8-15 second harvest", () => {
		const rate = calculateIdealExtractionRate(12, 100, 60);
		const ticksToFill = 100 / rate;
		const seconds = ticksToFill / 60;
		expect(seconds).toBeCloseTo(12, 1);
	});
});

// ---------------------------------------------------------------------------
// generateBalanceReport
// ---------------------------------------------------------------------------

describe("generateBalanceReport", () => {
	it("reports healthy for good config", () => {
		const report = generateBalanceReport(EARLY_GAME_CONFIG, 30, 60);
		expect(report.overallHealth).not.toBe("broken");
	});

	it("reports issues for too-fast config", () => {
		const report = generateBalanceReport(FAST_CONFIG, 30, 60);
		expect(report.issues.length).toBeGreaterThan(0);
		expect(report.issues.some((i) => i.includes("too fast"))).toBe(true);
	});

	it("reports issues for too-slow config", () => {
		const report = generateBalanceReport(SLOW_CONFIG, 30, 60);
		expect(report.issues.some((i) => i.includes("too slow"))).toBe(true);
	});

	it("includes ideal extraction rates", () => {
		const report = generateBalanceReport(EARLY_GAME_CONFIG, 30, 60);
		expect(report.idealEarlyExtractionRate).toBeGreaterThan(0);
		expect(report.idealMidExtractionRate).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Combat balance
// ---------------------------------------------------------------------------

describe("calculateTimeToKill", () => {
	it("calculates basic TTK", () => {
		// 10 dps, 100 hp, no armor = 10 seconds
		expect(calculateTimeToKill(10, 100, 0)).toBe(10);
	});

	it("accounts for armor reduction", () => {
		// 10 dps * (1-0.3) = 7 effective, 100 hp / 7 = 14.28s
		expect(calculateTimeToKill(10, 100, 0.3)).toBeCloseTo(14.28, 1);
	});

	it("returns infinity for zero dps", () => {
		expect(calculateTimeToKill(0, 100, 0)).toBe(Infinity);
	});

	it("returns infinity for 100% armor", () => {
		expect(calculateTimeToKill(10, 100, 1.0)).toBe(Infinity);
	});
});

describe("assessCombatBalance", () => {
	it("too squishy under 3 seconds", () => {
		expect(assessCombatBalance(2)).toBe("too_squishy");
	});

	it("balanced between 3-20 seconds", () => {
		expect(assessCombatBalance(8)).toBe("balanced");
	});

	it("too tanky over 20 seconds", () => {
		expect(assessCombatBalance(25)).toBe("too_tanky");
	});

	// PAPER PLAYTEST ASSERTION: player vs basic enemy should be balanced
	it("baseline combat is balanced", () => {
		// Player does 5 dps, basic enemy has 50 hp, no armor
		const ttk = calculateTimeToKill(5, 50, 0);
		expect(assessCombatBalance(ttk)).toBe("balanced");
	});
});
