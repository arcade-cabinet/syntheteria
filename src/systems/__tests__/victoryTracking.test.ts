/**
 * Unit tests for the victory condition tracking system.
 *
 * Tests cover:
 * - Grace period prevents early victories
 * - Economic victory: meets cube and territory thresholds
 * - Military victory: all enemies eliminated
 * - Scientific victory: required tier researched
 * - Cultural victory: holograms + quests meet thresholds
 * - Hacking victory: hack percentage threshold met
 * - Survival victory: last faction standing
 * - Victory events emitted correctly
 * - Progress tracking works per faction
 * - Reset clears all state
 * - Multiple factions can approach victory simultaneously
 * - Check interval respected (not checked every tick)
 */

import type { GameStateQueries } from "../victoryTracking";
import {
	getVictoryEvents,
	getVictoryProgress,
	getWinner,
	isGameOver,
	resetVictoryTracking,
	setGameStateQueries,
	victoryTrackingSystem,
} from "../victoryTracking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock GameStateQueries with sensible defaults that can be overridden */
function makeQueries(overrides: Partial<GameStateQueries> = {}): GameStateQueries {
	return {
		getCubeCount: jest.fn(() => 0),
		getTerritoryPercentage: jest.fn(() => 0),
		getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]),
		getMaxResearchedTier: jest.fn(() => 0),
		getHologramCount: jest.fn(() => 0),
		getQuestCompletionCount: jest.fn(() => 0),
		getHackPercentage: jest.fn(() => 0),
		...overrides,
	};
}

/** Grace period from config (3000 ticks) */
const GRACE_PERIOD = 3000;
/** Check interval from config (60 ticks) */
const CHECK_INTERVAL = 60;
/** First valid check tick — just past grace period */
const FIRST_CHECK_TICK = GRACE_PERIOD;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetVictoryTracking();
});

// ---------------------------------------------------------------------------
// Grace period
// ---------------------------------------------------------------------------

describe("victoryTracking — grace period", () => {
	it("does not check victory conditions during grace period", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
		});
		setGameStateQueries(queries);

		// Run at tick 0 — inside grace period
		victoryTrackingSystem(0);
		expect(isGameOver()).toBe(false);
		expect(getWinner()).toBeNull();
	});

	it("does not check at tick just before grace period ends", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(GRACE_PERIOD - 1);
		expect(isGameOver()).toBe(false);
	});

	it("checks conditions once grace period has passed", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 600),
			getTerritoryPercentage: jest.fn(() => 0.5),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Economic victory
// ---------------------------------------------------------------------------

describe("victoryTracking — economic", () => {
	it("triggers when cube count and territory percentage both meet thresholds", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn((f: string) => f === "reclaimers" ? 500 : 0),
			getTerritoryPercentage: jest.fn((f: string) => f === "reclaimers" ? 0.4 : 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w).not.toBeNull();
		expect(w!.faction).toBe("reclaimers");
		expect(w!.condition).toBe("economic");
	});

	it("does not trigger when cubes met but territory below threshold", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn(() => 600),
			getTerritoryPercentage: jest.fn(() => 0.2),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});

	it("does not trigger when territory met but cubes below threshold", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn(() => 100),
			getTerritoryPercentage: jest.fn(() => 0.5),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});

	it("tracks partial progress in score", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn(() => 250), // 50% of 500
			getTerritoryPercentage: jest.fn(() => 0.2), // 50% of 0.4
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const progress = getVictoryProgress("reclaimers");
		expect(progress.economic.score).toBeCloseTo(0.5);
		expect(progress.economic.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Military victory
// ---------------------------------------------------------------------------

describe("victoryTracking — military", () => {
	it("triggers when all enemies are eliminated", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w!.faction).toBe("reclaimers");
		// Military is checked before survival in evaluator order
		expect(w!.condition).toBe("military");
	});

	it("does not trigger when enemies remain", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Scientific victory
// ---------------------------------------------------------------------------

describe("victoryTracking — scientific", () => {
	it("triggers when faction has researched required tier", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["signal_choir", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getMaxResearchedTier: jest.fn((faction: string) =>
				faction === "signal_choir" ? 5 : 0,
			),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w!.faction).toBe("signal_choir");
		expect(w!.condition).toBe("scientific");
	});

	it("does not trigger at lower tier", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["signal_choir", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getMaxResearchedTier: jest.fn(() => 4),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});

	it("tracks progress as fraction of required tier", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["signal_choir", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getMaxResearchedTier: jest.fn(() => 3),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const progress = getVictoryProgress("signal_choir");
		expect(progress.scientific.score).toBeCloseTo(0.6); // 3/5
		expect(progress.scientific.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Cultural victory
// ---------------------------------------------------------------------------

describe("victoryTracking — cultural", () => {
	it("triggers when hologram and quest thresholds are met", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getHologramCount: jest.fn((faction: string) =>
				faction === "reclaimers" ? 10 : 0,
			),
			getQuestCompletionCount: jest.fn((faction: string) =>
				faction === "reclaimers" ? 20 : 0,
			),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w!.faction).toBe("reclaimers");
		expect(w!.condition).toBe("cultural");
	});

	it("does not trigger when only hologram threshold met", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getHologramCount: jest.fn(() => 15),
			getQuestCompletionCount: jest.fn(() => 5),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Hacking victory
// ---------------------------------------------------------------------------

describe("victoryTracking — hacking", () => {
	it("triggers when hack percentage meets threshold", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["signal_choir", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getHackPercentage: jest.fn((faction: string) =>
				faction === "signal_choir" ? 0.8 : 0,
			),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w!.faction).toBe("signal_choir");
		expect(w!.condition).toBe("hacking");
	});

	it("does not trigger below threshold", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["signal_choir", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
			getHackPercentage: jest.fn(() => 0.5),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Survival victory
// ---------------------------------------------------------------------------

describe("victoryTracking — survival", () => {
	it("last faction standing triggers military before survival", () => {
		// When only 1 faction is alive, military fires first (same condition)
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["iron_creed"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w!.faction).toBe("iron_creed");
		expect(w!.condition).toBe("military");
	});

	it("tracks partial survival progress when multiple factions alive", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["iron_creed", "reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const progress = getVictoryProgress("iron_creed");
		expect(progress.survival.score).toBeCloseTo(0.5); // 1/2 factions
		expect(progress.survival.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Victory events
// ---------------------------------------------------------------------------

describe("victoryTracking — events", () => {
	it("emits a victory event when a condition is met", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const events = getVictoryEvents();
		expect(events).toHaveLength(1);
		expect(events[0].faction).toBe("reclaimers");
		expect(events[0].tick).toBe(FIRST_CHECK_TICK);
	});

	it("drains the event queue on read", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const first = getVictoryEvents();
		expect(first).toHaveLength(1);

		const second = getVictoryEvents();
		expect(second).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Progress per faction
// ---------------------------------------------------------------------------

describe("victoryTracking — per-faction progress", () => {
	it("tracks independent progress for multiple factions", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn((faction: string) =>
				faction === "reclaimers" ? 250 : 100,
			),
			getTerritoryPercentage: jest.fn((faction: string) =>
				faction === "reclaimers" ? 0.2 : 0.1,
			),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		const recProgress = getVictoryProgress("reclaimers");
		const voltProgress = getVictoryProgress("volt_collective");

		// Reclaimers: cubeScore = 250/500 = 0.5, territoryScore = 0.2/0.4 = 0.5, avg = 0.5
		expect(recProgress.economic.score).toBeCloseTo(0.5);
		// Volt: cubeScore = 100/500 = 0.2, territoryScore = 0.1/0.4 = 0.25, avg = 0.225
		expect(voltProgress.economic.score).toBeCloseTo(0.225);
	});

	it("returns default progress for unknown faction", () => {
		const progress = getVictoryProgress("nonexistent_faction");
		expect(progress.economic.score).toBe(0);
		expect(progress.economic.met).toBe(false);
		expect(progress.military.score).toBe(0);
		expect(progress.survival.score).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("victoryTracking — reset", () => {
	it("clears all state including winner and events", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(true);

		resetVictoryTracking();

		expect(isGameOver()).toBe(false);
		expect(getWinner()).toBeNull();
		expect(getVictoryEvents()).toEqual([]);
		expect(getVictoryProgress("reclaimers").economic.score).toBe(0);
	});

	it("allows re-initialization after reset", () => {
		const queries1 = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries1);
		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(true);

		resetVictoryTracking();

		const queries2 = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries2);
		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Check interval
// ---------------------------------------------------------------------------

describe("victoryTracking — check interval", () => {
	it("does not re-evaluate conditions before interval elapses", () => {
		const cubeCountFn = jest.fn(() => 0);
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: cubeCountFn,
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		// First check at FIRST_CHECK_TICK
		victoryTrackingSystem(FIRST_CHECK_TICK);
		const callsAfterFirst = cubeCountFn.mock.calls.length;

		// Next tick — should NOT re-evaluate (interval is 60)
		victoryTrackingSystem(FIRST_CHECK_TICK + 1);
		expect(cubeCountFn.mock.calls.length).toBe(callsAfterFirst);
	});

	it("re-evaluates after the interval has passed", () => {
		const cubeCountFn = jest.fn(() => 0);
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: cubeCountFn,
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		const callsAfterFirst = cubeCountFn.mock.calls.length;

		// Exactly one interval later
		victoryTrackingSystem(FIRST_CHECK_TICK + CHECK_INTERVAL);
		expect(cubeCountFn.mock.calls.length).toBeGreaterThan(callsAfterFirst);
	});
});

// ---------------------------------------------------------------------------
// Multiple factions approaching victory
// ---------------------------------------------------------------------------

describe("victoryTracking — simultaneous approach", () => {
	it("only one faction can win even if multiple meet conditions", () => {
		// Both factions have 500+ cubes and 40%+ territory
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getCubeCount: jest.fn(() => 600),
			getTerritoryPercentage: jest.fn(() => 0.5),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);

		expect(isGameOver()).toBe(true);
		const w = getWinner();
		expect(w).not.toBeNull();
		// The first faction in the alive list wins
		expect(w!.faction).toBe("reclaimers");
		expect(w!.condition).toBe("economic");
	});
});

// ---------------------------------------------------------------------------
// isGameOver / getWinner
// ---------------------------------------------------------------------------

describe("victoryTracking — isGameOver / getWinner", () => {
	it("isGameOver returns false before any victory", () => {
		expect(isGameOver()).toBe(false);
	});

	it("getWinner returns null before any victory", () => {
		expect(getWinner()).toBeNull();
	});

	it("game stays won across subsequent ticks", () => {
		const queries = makeQueries({
			getAliveFactions: jest.fn(() => ["reclaimers"]),
			getCubeCount: jest.fn(() => 0),
			getTerritoryPercentage: jest.fn(() => 0),
		});
		setGameStateQueries(queries);

		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(true);

		// Further ticks should not change outcome
		victoryTrackingSystem(FIRST_CHECK_TICK + CHECK_INTERVAL);
		victoryTrackingSystem(FIRST_CHECK_TICK + CHECK_INTERVAL * 2);
		expect(isGameOver()).toBe(true);
		expect(getWinner()!.faction).toBe("reclaimers");
	});
});

// ---------------------------------------------------------------------------
// No queries set
// ---------------------------------------------------------------------------

describe("victoryTracking — no queries", () => {
	it("does nothing when game state queries are not set", () => {
		// Don't call setGameStateQueries
		victoryTrackingSystem(FIRST_CHECK_TICK);
		expect(isGameOver()).toBe(false);
	});
});
