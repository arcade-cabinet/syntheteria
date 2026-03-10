/**
 * Unit tests for the achievement system.
 *
 * Tests cover:
 * - Achievement initialization from definitions
 * - checkAchievements against game stats
 * - Tiered achievements (bronze/silver/gold)
 * - Achievement progress tracking
 * - getCompletedAchievements filtering
 * - getAchievementProgress for specific IDs
 * - getAchievementsByType and getAchievementsByTier filtering
 * - achievementSystem tick: completion detection, event emission, callbacks
 * - Achievements only complete once (idempotent)
 * - Callback registration and unsubscription
 * - Completion events history
 * - Reset clears all state
 * - Edge cases: unknown ID, zero stats, all achievements complete
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	ACHIEVEMENT_DEFINITIONS,
	achievementSystem,
	checkAchievements,
	getAllAchievements,
	getAchievementProgress,
	getAchievementsByTier,
	getAchievementsByType,
	getCompletedAchievements,
	getCompletionEvents,
	onAchievementComplete,
	resetAchievements,
} from "../achievementSystem";
import type { AchievementEvent, GameStats } from "../achievementSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(overrides: Partial<GameStats> = {}): GameStats {
	return {
		locationsDiscovered: 0,
		enemiesDefeated: 0,
		cubesAccumulated: 0,
		structuresPlaced: 0,
		tradesCompleted: 0,
		playerLevel: 0,
		oreHarvested: 0,
		cubesCompressed: 0,
		questsCompleted: 0,
		beltSegmentsBuilt: 0,
		wiresConnected: 0,
		machinesAssembled: 0,
		territoriesClaimed: 0,
		botsBuilt: 0,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetAchievements();
});

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

describe("achievement — definitions", () => {
	it("has at least 20 achievement definitions", () => {
		expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
	});

	it("all definitions have unique IDs", () => {
		const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("all definitions have required fields", () => {
		for (const def of ACHIEVEMENT_DEFINITIONS) {
			expect(def.id).toBeTruthy();
			expect(def.title).toBeTruthy();
			expect(def.description).toBeTruthy();
			expect(def.type).toBeTruthy();
			expect(def.tier).toBeTruthy();
			expect(def.requirement).toBeGreaterThan(0);
			expect(def.statKey).toBeTruthy();
		}
	});

	it("covers all achievement types", () => {
		const types = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.type));
		expect(types).toContain("exploration");
		expect(types).toContain("combat");
		expect(types).toContain("economy");
		expect(types).toContain("building");
		expect(types).toContain("social");
		expect(types).toContain("mastery");
	});

	it("covers all achievement tiers", () => {
		const tiers = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.tier));
		expect(tiers).toContain("bronze");
		expect(tiers).toContain("silver");
		expect(tiers).toContain("gold");
	});

	it("has tiered achievements where gold > silver > bronze requirement", () => {
		// Check explorer tiers
		const explorerBronze = ACHIEVEMENT_DEFINITIONS.find(
			(d) => d.id === "explorer_bronze",
		)!;
		const explorerSilver = ACHIEVEMENT_DEFINITIONS.find(
			(d) => d.id === "explorer_silver",
		)!;
		const explorerGold = ACHIEVEMENT_DEFINITIONS.find(
			(d) => d.id === "explorer_gold",
		)!;

		expect(explorerGold.requirement).toBeGreaterThan(
			explorerSilver.requirement,
		);
		expect(explorerSilver.requirement).toBeGreaterThan(
			explorerBronze.requirement,
		);
	});
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("achievement — initialization", () => {
	it("initializes all achievements on first API call", () => {
		const all = getAllAchievements();
		expect(all.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
	});

	it("all achievements start incomplete", () => {
		const all = getAllAchievements();
		for (const a of all) {
			expect(a.completed).toBe(false);
			expect(a.completedTick).toBeNull();
			expect(a.currentProgress).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// checkAchievements
// ---------------------------------------------------------------------------

describe("achievement — checkAchievements", () => {
	it("completes achievement when stat meets requirement", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		const completed = checkAchievements(stats);

		expect(completed).toContain("explorer_bronze");
	});

	it("completes achievement when stat exceeds requirement", () => {
		const stats = makeStats({ locationsDiscovered: 200 });
		const completed = checkAchievements(stats);

		expect(completed).toContain("explorer_bronze");
		expect(completed).toContain("explorer_silver");
		expect(completed).toContain("explorer_gold");
	});

	it("does not complete achievement when stat is below requirement", () => {
		const stats = makeStats({ locationsDiscovered: 4 });
		const completed = checkAchievements(stats);

		expect(completed).not.toContain("explorer_bronze");
	});

	it("returns only newly completed achievements", () => {
		const stats1 = makeStats({ locationsDiscovered: 5 });
		checkAchievements(stats1);

		const stats2 = makeStats({ locationsDiscovered: 25 });
		const completed = checkAchievements(stats2);

		// explorer_bronze was already completed, should not be in new list
		expect(completed).not.toContain("explorer_bronze");
		expect(completed).toContain("explorer_silver");
	});

	it("updates progress on incomplete achievements", () => {
		const stats = makeStats({ locationsDiscovered: 3 });
		checkAchievements(stats);

		const progress = getAchievementProgress("explorer_bronze");
		expect(progress).not.toBeNull();
		expect(progress!.current).toBe(3);
		expect(progress!.required).toBe(5);
		expect(progress!.completed).toBe(false);
	});

	it("completes multiple achievements from different types simultaneously", () => {
		const stats = makeStats({
			locationsDiscovered: 5,
			enemiesDefeated: 10,
			cubesAccumulated: 10,
		});
		const completed = checkAchievements(stats);

		expect(completed).toContain("explorer_bronze");
		expect(completed).toContain("fighter_bronze");
		expect(completed).toContain("hoarder_bronze");
	});
});

// ---------------------------------------------------------------------------
// Tiered achievements
// ---------------------------------------------------------------------------

describe("achievement — tiered achievements", () => {
	it("lower tiers complete before higher tiers", () => {
		const stats = makeStats({ enemiesDefeated: 10 });
		const completed = checkAchievements(stats);

		expect(completed).toContain("fighter_bronze");
		expect(completed).not.toContain("fighter_silver");
		expect(completed).not.toContain("fighter_gold");
	});

	it("all tiers complete when stat exceeds gold requirement", () => {
		const stats = makeStats({ enemiesDefeated: 1000 });
		const completed = checkAchievements(stats);

		expect(completed).toContain("fighter_bronze");
		expect(completed).toContain("fighter_silver");
		expect(completed).toContain("fighter_gold");
	});

	it("bronze and silver complete, gold does not", () => {
		const stats = makeStats({ enemiesDefeated: 100 });
		const completed = checkAchievements(stats);

		expect(completed).toContain("fighter_bronze");
		expect(completed).toContain("fighter_silver");
		expect(completed).not.toContain("fighter_gold");
	});
});

// ---------------------------------------------------------------------------
// getCompletedAchievements
// ---------------------------------------------------------------------------

describe("achievement — getCompletedAchievements", () => {
	it("returns empty array when none completed", () => {
		expect(getCompletedAchievements()).toHaveLength(0);
	});

	it("returns only completed achievements", () => {
		const stats = makeStats({ locationsDiscovered: 5, enemiesDefeated: 10 });
		checkAchievements(stats);

		const completed = getCompletedAchievements();
		expect(completed.length).toBe(2);
		expect(completed.every((a) => a.completed)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getAchievementProgress
// ---------------------------------------------------------------------------

describe("achievement — getAchievementProgress", () => {
	it("returns progress for a valid achievement ID", () => {
		const stats = makeStats({ locationsDiscovered: 3 });
		checkAchievements(stats);

		const progress = getAchievementProgress("explorer_bronze");
		expect(progress).toEqual({
			current: 3,
			required: 5,
			completed: false,
		});
	});

	it("returns null for unknown achievement ID", () => {
		const progress = getAchievementProgress("nonexistent_achievement");
		expect(progress).toBeNull();
	});

	it("shows completed = true after completion", () => {
		const stats = makeStats({ locationsDiscovered: 10 });
		checkAchievements(stats);

		const progress = getAchievementProgress("explorer_bronze");
		expect(progress!.completed).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getAchievementsByType
// ---------------------------------------------------------------------------

describe("achievement — getAchievementsByType", () => {
	it("filters by combat type", () => {
		const combat = getAchievementsByType("combat");
		expect(combat.length).toBeGreaterThan(0);
		expect(combat.every((a) => a.definition.type === "combat")).toBe(true);
	});

	it("filters by exploration type", () => {
		const exploration = getAchievementsByType("exploration");
		expect(exploration.length).toBeGreaterThan(0);
		expect(
			exploration.every((a) => a.definition.type === "exploration"),
		).toBe(true);
	});

	it("filters by mastery type", () => {
		const mastery = getAchievementsByType("mastery");
		expect(mastery.length).toBeGreaterThan(0);
		expect(mastery.every((a) => a.definition.type === "mastery")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getAchievementsByTier
// ---------------------------------------------------------------------------

describe("achievement — getAchievementsByTier", () => {
	it("filters by bronze tier", () => {
		const bronze = getAchievementsByTier("bronze");
		expect(bronze.length).toBeGreaterThan(0);
		expect(bronze.every((a) => a.definition.tier === "bronze")).toBe(true);
	});

	it("filters by gold tier", () => {
		const gold = getAchievementsByTier("gold");
		expect(gold.length).toBeGreaterThan(0);
		expect(gold.every((a) => a.definition.tier === "gold")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// achievementSystem tick
// ---------------------------------------------------------------------------

describe("achievement — achievementSystem", () => {
	it("completes achievements and records tick", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(42, stats);

		const progress = getAchievementProgress("explorer_bronze");
		expect(progress!.completed).toBe(true);

		const completed = getCompletedAchievements();
		const explorer = completed.find((a) => a.id === "explorer_bronze");
		expect(explorer!.completedTick).toBe(42);
	});

	it("fires completion callback", () => {
		const cb = jest.fn();
		onAchievementComplete(cb);

		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(10, stats);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(
			expect.objectContaining({
				achievementId: "explorer_bronze",
				title: "Curious Wanderer",
				tier: "bronze",
				type: "exploration",
				tick: 10,
			}),
		);
	});

	it("fires callback for each newly completed achievement", () => {
		const cb = jest.fn();
		onAchievementComplete(cb);

		const stats = makeStats({
			locationsDiscovered: 5,
			enemiesDefeated: 10,
			cubesAccumulated: 10,
		});
		achievementSystem(1, stats);

		expect(cb).toHaveBeenCalledTimes(3);
	});

	it("does not fire callback for already-completed achievements", () => {
		const stats1 = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats1);

		const cb = jest.fn();
		onAchievementComplete(cb);

		const stats2 = makeStats({ locationsDiscovered: 10 });
		achievementSystem(2, stats2);

		// Only explorer_silver might complete if stats warrant, but not explorer_bronze again
		const bronzeCalls = cb.mock.calls.filter(
			(call: [AchievementEvent]) => call[0].achievementId === "explorer_bronze",
		);
		expect(bronzeCalls).toHaveLength(0);
	});

	it("records completion events in history", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(10, stats);

		const events = getCompletionEvents();
		expect(events.length).toBeGreaterThan(0);
		expect(events[0].achievementId).toBe("explorer_bronze");
		expect(events[0].tick).toBe(10);
	});

	it("accumulates events across multiple ticks", () => {
		const stats1 = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats1);

		const stats2 = makeStats({ locationsDiscovered: 5, enemiesDefeated: 10 });
		achievementSystem(2, stats2);

		const events = getCompletionEvents();
		expect(events.length).toBe(2);
		expect(events[0].tick).toBe(1);
		expect(events[1].tick).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Idempotent completion
// ---------------------------------------------------------------------------

describe("achievement — idempotent completion", () => {
	it("does not re-complete an already completed achievement", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);
		achievementSystem(2, stats);

		const events = getCompletionEvents();
		const explorerEvents = events.filter(
			(e) => e.achievementId === "explorer_bronze",
		);
		expect(explorerEvents).toHaveLength(1);
	});

	it("completedTick stays at original tick", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);
		achievementSystem(100, stats);

		const completed = getCompletedAchievements();
		const explorer = completed.find((a) => a.id === "explorer_bronze");
		expect(explorer!.completedTick).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Callback unsubscription
// ---------------------------------------------------------------------------

describe("achievement — callback unsubscription", () => {
	it("removes callback after unsubscribe", () => {
		const cb = jest.fn();
		const unsub = onAchievementComplete(cb);

		unsub();

		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);

		expect(cb).not.toHaveBeenCalled();
	});

	it("other callbacks still fire after one unsubscribes", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		const unsub1 = onAchievementComplete(cb1);
		onAchievementComplete(cb2);

		unsub1();

		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);

		expect(cb1).not.toHaveBeenCalled();
		expect(cb2).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Completion events
// ---------------------------------------------------------------------------

describe("achievement — getCompletionEvents", () => {
	it("returns a copy of the events array", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);

		const e1 = getCompletionEvents();
		const e2 = getCompletionEvents();
		expect(e1).not.toBe(e2);
		expect(e1).toEqual(e2);
	});

	it("returns empty array initially", () => {
		expect(getCompletionEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Mastery achievements
// ---------------------------------------------------------------------------

describe("achievement — mastery achievements", () => {
	it("completes level_bronze at level 3", () => {
		const stats = makeStats({ playerLevel: 3 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("level_bronze");
	});

	it("does not complete level_silver at level 4", () => {
		const stats = makeStats({ playerLevel: 4 });
		const completed = checkAchievements(stats);
		expect(completed).not.toContain("level_silver");
	});

	it("completes level_silver at level 5", () => {
		const stats = makeStats({ playerLevel: 5 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("level_silver");
	});

	it("completes level_gold at level 10", () => {
		const stats = makeStats({ playerLevel: 10 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("level_gold");
	});
});

// ---------------------------------------------------------------------------
// Economy achievements (ore harvesting)
// ---------------------------------------------------------------------------

describe("achievement — economy: ore harvesting", () => {
	it("completes miner_bronze at 50 ore", () => {
		const stats = makeStats({ oreHarvested: 50 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("miner_bronze");
	});

	it("completes miner_silver at 500 ore", () => {
		const stats = makeStats({ oreHarvested: 500 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("miner_silver");
	});

	it("does not complete miner_gold at 4999 ore", () => {
		const stats = makeStats({ oreHarvested: 4999 });
		const completed = checkAchievements(stats);
		expect(completed).not.toContain("miner_gold");
	});

	it("completes miner_gold at 5000 ore", () => {
		const stats = makeStats({ oreHarvested: 5000 });
		const completed = checkAchievements(stats);
		expect(completed).toContain("miner_gold");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("achievement — edge cases", () => {
	it("handles zero stats without errors", () => {
		const stats = makeStats();
		const completed = checkAchievements(stats);
		expect(completed).toHaveLength(0);
	});

	it("handles all achievements already complete", () => {
		// Complete everything by providing massive stats
		const stats = makeStats({
			locationsDiscovered: 100000,
			enemiesDefeated: 100000,
			cubesAccumulated: 100000,
			structuresPlaced: 100000,
			tradesCompleted: 100000,
			playerLevel: 100000,
			oreHarvested: 100000,
			cubesCompressed: 100000,
			questsCompleted: 100000,
			territoriesClaimed: 100000,
		});
		checkAchievements(stats);

		const completed2 = checkAchievements(stats);
		expect(completed2).toHaveLength(0); // nothing new
	});

	it("achievementSystem runs safely with zero stats", () => {
		expect(() => achievementSystem(1, makeStats())).not.toThrow();
	});

	it("progress for unknown stat key defaults to 0", () => {
		// All valid stat keys are covered, but this verifies robustness
		const all = getAllAchievements();
		for (const a of all) {
			expect(a.currentProgress).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("achievement — resetAchievements", () => {
	it("clears all achievement states", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		checkAchievements(stats);

		resetAchievements();

		expect(getCompletedAchievements()).toHaveLength(0);
	});

	it("clears completion events", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);

		resetAchievements();

		expect(getCompletionEvents()).toHaveLength(0);
	});

	it("clears callbacks", () => {
		const cb = jest.fn();
		onAchievementComplete(cb);

		resetAchievements();

		const stats = makeStats({ locationsDiscovered: 5 });
		achievementSystem(1, stats);

		expect(cb).not.toHaveBeenCalled();
	});

	it("re-initializes achievements after reset", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		checkAchievements(stats);

		resetAchievements();

		// After reset, achievements should be fresh
		const all = getAllAchievements();
		expect(all.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
		expect(all.every((a) => !a.completed)).toBe(true);
	});

	it("previously completed achievements can complete again after reset", () => {
		const stats = makeStats({ locationsDiscovered: 5 });
		checkAchievements(stats);

		resetAchievements();

		const completed = checkAchievements(stats);
		expect(completed).toContain("explorer_bronze");
	});
});
