/**
 * Unit tests for the progression system.
 *
 * Tests cover:
 * - Level calculation formula: floor(sqrt(totalXP / 100))
 * - XP required for each level (inverse formula)
 * - XP to next level calculation
 * - addXP increments correct counters per source
 * - Level bonuses (mining speed, movement speed, inventory slots)
 * - Level unlocks at each tier
 * - getAllUnlocksUpToLevel accumulation
 * - progressionSystem tick: level-up detection, callback firing
 * - Multi-level jumps in a single tick
 * - Zero/negative XP edge cases
 * - Reset clears all state
 * - Playtime tick tracking
 * - XP history tracking
 * - Callback unsubscription
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	addXP,
	calculateLevel,
	calculateXPToNextLevel,
	getAllUnlocksUpToLevel,
	getLevelBonuses,
	getLevelUnlocks,
	getPlayerStats,
	getXPHistory,
	onLevelUp,
	progressionSystem,
	resetProgression,
	XP_REWARDS,
	xpRequiredForLevel,
} from "../progressionSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetProgression();
});

// ---------------------------------------------------------------------------
// Level calculation formula
// ---------------------------------------------------------------------------

describe("progression — calculateLevel", () => {
	it("returns 0 for 0 XP", () => {
		expect(calculateLevel(0)).toBe(0);
	});

	it("returns 0 for XP below 100", () => {
		expect(calculateLevel(99)).toBe(0);
	});

	it("returns 1 at exactly 100 XP (sqrt(100/100) = 1)", () => {
		expect(calculateLevel(100)).toBe(1);
	});

	it("returns 1 for 399 XP (sqrt(399/100) = 1.99...)", () => {
		expect(calculateLevel(399)).toBe(1);
	});

	it("returns 2 at exactly 400 XP (sqrt(400/100) = 2)", () => {
		expect(calculateLevel(400)).toBe(2);
	});

	it("returns 3 at exactly 900 XP (sqrt(900/100) = 3)", () => {
		expect(calculateLevel(900)).toBe(3);
	});

	it("returns 10 at exactly 10000 XP (sqrt(10000/100) = 10)", () => {
		expect(calculateLevel(10000)).toBe(10);
	});

	it("returns 0 for negative XP", () => {
		expect(calculateLevel(-50)).toBe(0);
	});

	it("handles large XP values", () => {
		// sqrt(1000000 / 100) = sqrt(10000) = 100
		expect(calculateLevel(1000000)).toBe(100);
	});

	it("floors fractional levels", () => {
		// sqrt(250 / 100) = sqrt(2.5) = 1.58... -> floor = 1
		expect(calculateLevel(250)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// XP required for level (inverse formula)
// ---------------------------------------------------------------------------

describe("progression — xpRequiredForLevel", () => {
	it("returns 0 for level 0", () => {
		expect(xpRequiredForLevel(0)).toBe(0);
	});

	it("returns 100 for level 1 (1^2 * 100)", () => {
		expect(xpRequiredForLevel(1)).toBe(100);
	});

	it("returns 400 for level 2 (2^2 * 100)", () => {
		expect(xpRequiredForLevel(2)).toBe(400);
	});

	it("returns 900 for level 3 (3^2 * 100)", () => {
		expect(xpRequiredForLevel(3)).toBe(900);
	});

	it("returns 10000 for level 10 (10^2 * 100)", () => {
		expect(xpRequiredForLevel(10)).toBe(10000);
	});

	it("returns 0 for negative levels", () => {
		expect(xpRequiredForLevel(-1)).toBe(0);
	});

	it("round-trips with calculateLevel", () => {
		for (let level = 0; level <= 20; level++) {
			const xp = xpRequiredForLevel(level);
			expect(calculateLevel(xp)).toBe(level);
		}
	});
});

// ---------------------------------------------------------------------------
// XP to next level
// ---------------------------------------------------------------------------

describe("progression — calculateXPToNextLevel", () => {
	it("returns 100 at 0 XP (need 100 for level 1)", () => {
		expect(calculateXPToNextLevel(0)).toBe(100);
	});

	it("returns 1 at 99 XP (need 100 for level 1)", () => {
		expect(calculateXPToNextLevel(99)).toBe(1);
	});

	it("returns 300 at 100 XP (need 400 for level 2)", () => {
		expect(calculateXPToNextLevel(100)).toBe(300);
	});

	it("returns 100 at 300 XP (need 400 for level 2)", () => {
		expect(calculateXPToNextLevel(300)).toBe(100);
	});

	it("returns 500 at 400 XP (need 900 for level 3)", () => {
		expect(calculateXPToNextLevel(400)).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// addXP and source tracking
// ---------------------------------------------------------------------------

describe("progression — addXP", () => {
	it("increments totalXP", () => {
		addXP(50, "craft");
		const stats = getPlayerStats();
		expect(stats.totalXP).toBe(50);
	});

	it("accumulates multiple adds", () => {
		addXP(100, "battle");
		addXP(200, "quest");
		const stats = getPlayerStats();
		expect(stats.totalXP).toBe(300);
	});

	it("returns the new total XP", () => {
		const result = addXP(150, "discovery");
		expect(result).toBe(150);
	});

	it("increments totalKills for battle source", () => {
		addXP(50, "battle");
		addXP(50, "battle");
		const stats = getPlayerStats();
		expect(stats.totalKills).toBe(2);
	});

	it("increments totalCrafts for craft source", () => {
		addXP(25, "craft");
		const stats = getPlayerStats();
		expect(stats.totalCrafts).toBe(1);
	});

	it("increments totalDiscoveries for discovery source", () => {
		addXP(150, "discovery");
		addXP(150, "discovery");
		addXP(150, "discovery");
		const stats = getPlayerStats();
		expect(stats.totalDiscoveries).toBe(3);
	});

	it("increments totalTrades for trade source", () => {
		addXP(75, "trade");
		const stats = getPlayerStats();
		expect(stats.totalTrades).toBe(1);
	});

	it("increments totalQuestsCompleted for quest source", () => {
		addXP(500, "quest");
		const stats = getPlayerStats();
		expect(stats.totalQuestsCompleted).toBe(1);
	});

	it("ignores zero amount", () => {
		addXP(0, "craft");
		const stats = getPlayerStats();
		expect(stats.totalXP).toBe(0);
		expect(stats.totalCrafts).toBe(0);
	});

	it("ignores negative amount", () => {
		addXP(-100, "battle");
		const stats = getPlayerStats();
		expect(stats.totalXP).toBe(0);
		expect(stats.totalKills).toBe(0);
	});

	it("records XP event in history", () => {
		addXP(50, "battle");
		const history = getXPHistory();
		expect(history).toHaveLength(1);
		expect(history[0]).toEqual({
			amount: 50,
			source: "battle",
			tick: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// Level bonuses
// ---------------------------------------------------------------------------

describe("progression — getLevelBonuses", () => {
	it("returns base values at level 0", () => {
		const bonuses = getLevelBonuses(0);
		expect(bonuses.miningSpeedMultiplier).toBe(1.0);
		expect(bonuses.movementSpeedMultiplier).toBe(1.0);
		expect(bonuses.inventorySlots).toBe(5);
	});

	it("returns +2% mining speed per level", () => {
		const bonuses = getLevelBonuses(5);
		expect(bonuses.miningSpeedMultiplier).toBeCloseTo(1.1, 5);
	});

	it("returns +1% movement speed per level", () => {
		const bonuses = getLevelBonuses(10);
		expect(bonuses.movementSpeedMultiplier).toBeCloseTo(1.1, 5);
	});

	it("returns +1 inventory slot per level (base 5)", () => {
		const bonuses = getLevelBonuses(3);
		expect(bonuses.inventorySlots).toBe(8);
	});

	it("scales linearly", () => {
		const b1 = getLevelBonuses(1);
		const b2 = getLevelBonuses(2);
		expect(b2.miningSpeedMultiplier - b1.miningSpeedMultiplier).toBeCloseTo(
			0.02,
			5,
		);
		expect(
			b2.movementSpeedMultiplier - b1.movementSpeedMultiplier,
		).toBeCloseTo(0.01, 5);
		expect(b2.inventorySlots - b1.inventorySlots).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Level unlocks
// ---------------------------------------------------------------------------

describe("progression — getLevelUnlocks", () => {
	it("returns defined unlocks for level 1", () => {
		const unlocks = getLevelUnlocks(1);
		expect(unlocks.recipes).toContain("iron_plate");
		expect(unlocks.recipes).toContain("copper_wire");
		expect(unlocks.buildings).toContain("storage_crate");
		expect(unlocks.abilities).toContain("scan");
	});

	it("returns defined unlocks for level 5", () => {
		const unlocks = getLevelUnlocks(5);
		expect(unlocks.recipes).toContain("quantum_core");
		expect(unlocks.buildings).toContain("fabricator");
		expect(unlocks.abilities).toContain("teleport");
	});

	it("returns empty arrays for undefined levels", () => {
		const unlocks = getLevelUnlocks(99);
		expect(unlocks.recipes).toEqual([]);
		expect(unlocks.buildings).toEqual([]);
		expect(unlocks.abilities).toEqual([]);
	});

	it("returns empty arrays for level 0", () => {
		const unlocks = getLevelUnlocks(0);
		expect(unlocks.recipes).toEqual([]);
		expect(unlocks.buildings).toEqual([]);
		expect(unlocks.abilities).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Accumulated unlocks
// ---------------------------------------------------------------------------

describe("progression — getAllUnlocksUpToLevel", () => {
	it("returns empty arrays for level 0", () => {
		const unlocks = getAllUnlocksUpToLevel(0);
		expect(unlocks.recipes).toEqual([]);
		expect(unlocks.buildings).toEqual([]);
		expect(unlocks.abilities).toEqual([]);
	});

	it("accumulates unlocks from levels 1 through N", () => {
		const unlocks = getAllUnlocksUpToLevel(2);
		// Level 1 + Level 2 recipes
		expect(unlocks.recipes).toContain("iron_plate");
		expect(unlocks.recipes).toContain("copper_wire");
		expect(unlocks.recipes).toContain("steel_beam");
		expect(unlocks.recipes).toContain("circuit_board");
	});

	it("includes all buildings up to level 3", () => {
		const unlocks = getAllUnlocksUpToLevel(3);
		expect(unlocks.buildings).toContain("storage_crate");
		expect(unlocks.buildings).toContain("smelter");
		expect(unlocks.buildings).toContain("assembler");
		expect(unlocks.buildings).toContain("turret_base");
	});

	it("includes all abilities up to level 3", () => {
		const unlocks = getAllUnlocksUpToLevel(3);
		expect(unlocks.abilities).toContain("scan");
		expect(unlocks.abilities).toContain("dash");
		expect(unlocks.abilities).toContain("overclock");
	});
});

// ---------------------------------------------------------------------------
// progressionSystem tick
// ---------------------------------------------------------------------------

describe("progression — progressionSystem", () => {
	it("updates playtimeTicks", () => {
		progressionSystem(42);
		const stats = getPlayerStats();
		expect(stats.playtimeTicks).toBe(42);
	});

	it("detects level-up and updates stats.level", () => {
		addXP(100, "quest"); // level 0 -> 1
		progressionSystem(1);
		const stats = getPlayerStats();
		expect(stats.level).toBe(1);
	});

	it("fires level-up callback on level change", () => {
		const cb = jest.fn();
		onLevelUp(cb);

		addXP(100, "quest");
		progressionSystem(1);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ recipes: expect.any(Array) }),
		);
	});

	it("fires callback for each level when jumping multiple levels", () => {
		const cb = jest.fn();
		onLevelUp(cb);

		addXP(900, "quest"); // level 0 -> 3
		progressionSystem(1);

		expect(cb).toHaveBeenCalledTimes(3);
		expect(cb).toHaveBeenNthCalledWith(1, 1, expect.any(Object));
		expect(cb).toHaveBeenNthCalledWith(2, 2, expect.any(Object));
		expect(cb).toHaveBeenNthCalledWith(3, 3, expect.any(Object));
	});

	it("does not fire callback if no level change", () => {
		const cb = jest.fn();
		onLevelUp(cb);

		addXP(50, "craft"); // still level 0
		progressionSystem(1);

		expect(cb).not.toHaveBeenCalled();
	});

	it("does not fire callback on subsequent ticks at same level", () => {
		const cb = jest.fn();
		onLevelUp(cb);

		addXP(100, "quest");
		progressionSystem(1);
		expect(cb).toHaveBeenCalledTimes(1);

		progressionSystem(2);
		expect(cb).toHaveBeenCalledTimes(1); // not called again
	});

	it("updates xpToNextLevel after level-up", () => {
		addXP(100, "quest"); // level 1
		progressionSystem(1);
		const stats = getPlayerStats();
		// Level 1, next is level 2 at 400. xpToNext = 400 - 100 = 300
		expect(stats.xpToNextLevel).toBe(300);
	});

	it("handles XP added between system ticks", () => {
		addXP(50, "craft");
		progressionSystem(1);
		expect(getPlayerStats().level).toBe(0);

		addXP(60, "craft"); // total 110, level 1
		progressionSystem(2);
		expect(getPlayerStats().level).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Callback unsubscription
// ---------------------------------------------------------------------------

describe("progression — onLevelUp unsubscribe", () => {
	it("removes callback after unsubscribe", () => {
		const cb = jest.fn();
		const unsub = onLevelUp(cb);

		unsub();

		addXP(100, "quest");
		progressionSystem(1);

		expect(cb).not.toHaveBeenCalled();
	});

	it("other callbacks still fire after one unsubscribes", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		const unsub1 = onLevelUp(cb1);
		onLevelUp(cb2);

		unsub1();

		addXP(100, "quest");
		progressionSystem(1);

		expect(cb1).not.toHaveBeenCalled();
		expect(cb2).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// XP history
// ---------------------------------------------------------------------------

describe("progression — XP history", () => {
	it("tracks multiple XP events", () => {
		addXP(50, "battle");
		addXP(100, "quest");
		addXP(25, "craft");

		const history = getXPHistory();
		expect(history).toHaveLength(3);
		expect(history[0].source).toBe("battle");
		expect(history[1].source).toBe("quest");
		expect(history[2].source).toBe("craft");
	});

	it("returns a copy of the history", () => {
		addXP(50, "battle");
		const h1 = getXPHistory();
		const h2 = getXPHistory();
		expect(h1).not.toBe(h2);
		expect(h1).toEqual(h2);
	});
});

// ---------------------------------------------------------------------------
// getPlayerStats returns a copy
// ---------------------------------------------------------------------------

describe("progression — getPlayerStats", () => {
	it("returns a copy, not internal state", () => {
		addXP(100, "quest");
		const s1 = getPlayerStats();
		const s2 = getPlayerStats();
		expect(s1).not.toBe(s2);
		expect(s1).toEqual(s2);
	});

	it("modifying the returned object does not affect internal state", () => {
		addXP(100, "quest");
		const stats = getPlayerStats();
		stats.totalXP = 999999;
		expect(getPlayerStats().totalXP).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// XP_REWARDS constants
// ---------------------------------------------------------------------------

describe("progression — XP_REWARDS", () => {
	it("defines XP for all source types", () => {
		expect(XP_REWARDS.quest).toBe(500);
		expect(XP_REWARDS.craft).toBe(25);
		expect(XP_REWARDS.discovery).toBe(150);
		expect(XP_REWARDS.battle).toBe(50);
		expect(XP_REWARDS.trade).toBe(75);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("progression — resetProgression", () => {
	it("clears totalXP", () => {
		addXP(500, "quest");
		resetProgression();
		expect(getPlayerStats().totalXP).toBe(0);
	});

	it("clears level", () => {
		addXP(400, "quest");
		progressionSystem(1);
		resetProgression();
		expect(getPlayerStats().level).toBe(0);
	});

	it("clears all counters", () => {
		addXP(50, "battle");
		addXP(25, "craft");
		addXP(150, "discovery");
		resetProgression();

		const stats = getPlayerStats();
		expect(stats.totalKills).toBe(0);
		expect(stats.totalCrafts).toBe(0);
		expect(stats.totalDiscoveries).toBe(0);
	});

	it("clears XP history", () => {
		addXP(50, "battle");
		resetProgression();
		expect(getXPHistory()).toHaveLength(0);
	});

	it("clears level-up callbacks", () => {
		const cb = jest.fn();
		onLevelUp(cb);
		resetProgression();

		addXP(100, "quest");
		progressionSystem(1);
		expect(cb).not.toHaveBeenCalled();
	});

	it("resets xpToNextLevel to 100", () => {
		addXP(500, "quest");
		progressionSystem(1);
		resetProgression();
		expect(getPlayerStats().xpToNextLevel).toBe(100);
	});
});
