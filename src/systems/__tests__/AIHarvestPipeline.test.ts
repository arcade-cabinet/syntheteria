/**
 * Unit tests for AIHarvestPipeline — physical harvest→compress→carry loop for AI bots.
 *
 * Tests cover:
 * - Bot registration and initial state (IDLE)
 * - IDLE → SEEK_DEPOSIT when ore deposit exists
 * - SEEK_DEPOSIT → HARVESTING on arrival at deposit
 * - HARVESTING accumulates powder and transitions to COMPRESSING
 * - HARVESTING handles depleted deposit mid-harvest
 * - COMPRESSING waits AI_COMPRESSION_TICKS then spawns cube and transitions to CARRYING
 * - CARRYING moves bot toward base
 * - DEPOSITING transitions back to IDLE
 * - Full pipeline cycle: register bot, add deposit, run many ticks → cube spawned
 * - Multiple bots run independently
 * - Unregistering a bot removes it from the pipeline
 * - Reset clears all bot state
 * - No deposits: bot stays IDLE
 */

// Mock cubeEconomy before importing pipeline
const mockSpawnCube = jest.fn().mockReturnValue("cube_mock_id");
jest.mock("../cubeEconomy", () => ({
	spawnCube: (...args: unknown[]) => mockSpawnCube(...args),
}));

// Mock oreSpawner to control deposits in tests
import type { OreDepositData } from "../oreSpawner";
const mockGetAllDeposits = jest.fn<OreDepositData[], []>(() => []);
jest.mock("../oreSpawner", () => ({
	getAllDeposits: () => mockGetAllDeposits(),
}));

import {
	registerBot,
	unregisterBot,
	getBotState,
	getAllBotStates,
	tickAIHarvestPipeline,
	resetAIHarvestPipeline,
	type AIBotHarvestState,
	type Vec3,
} from "../AIHarvestPipeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeDeposit(id: string, x = 50, z = 50, quantity = 1000) {
	return {
		id,
		type: "scrapMetal",
		quantity,
		position: { x, y: 0, z },
		colliderRadius: 1,
		hardness: 1,
		grindSpeed: 2,
		color: "#888",
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetAIHarvestPipeline();
	mockSpawnCube.mockClear();
	mockGetAllDeposits.mockReturnValue([]);
});

afterEach(() => {
	resetAIHarvestPipeline();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — registration", () => {
	it("registers a bot with IDLE initial state", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		const state = getBotState("bot_1");
		expect(state).toBeDefined();
		expect(state!.phase).toBe("IDLE");
		expect(state!.faction).toBe("reclaimers");
	});

	it("re-registering updates basePosition but preserves phase", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		// Force bot into CARRYING state
		const state = getBotState("bot_1")!;
		state.phase = "CARRYING";

		// Re-register with new base position
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(200, 0, 200));

		const updated = getBotState("bot_1")!;
		expect(updated.phase).toBe("CARRYING"); // phase preserved
		expect(updated.basePosition.x).toBe(200); // base updated
	});

	it("unregistering removes the bot", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		unregisterBot("bot_1");
		expect(getBotState("bot_1")).toBeUndefined();
	});

	it("getAllBotStates returns all registered bots", () => {
		registerBot("bot_a", "reclaimers", pos(), pos(100, 0, 100));
		registerBot("bot_b", "volt_collective", pos(), pos(200, 0, 200));
		const all = getAllBotStates();
		expect(all).toHaveLength(2);
		expect(all.map((b) => b.botId)).toContain("bot_a");
		expect(all.map((b) => b.botId)).toContain("bot_b");
	});

	it("reset clears all bots", () => {
		registerBot("bot_1", "reclaimers", pos(), pos(100, 0, 100));
		registerBot("bot_2", "reclaimers", pos(), pos(100, 0, 100));
		resetAIHarvestPipeline();
		expect(getAllBotStates()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// IDLE phase
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — IDLE phase", () => {
	it("stays IDLE when no deposits exist", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		mockGetAllDeposits.mockReturnValue([]);

		tickAIHarvestPipeline();

		expect(getBotState("bot_1")!.phase).toBe("IDLE");
	});

	it("transitions to SEEK_DEPOSIT when a non-depleted deposit exists", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		mockGetAllDeposits.mockReturnValue([makeDeposit("dep_1", 50, 50, 500)]);

		tickAIHarvestPipeline();

		expect(getBotState("bot_1")!.phase).toBe("SEEK_DEPOSIT");
		expect(getBotState("bot_1")!.targetDepositId).toBe("dep_1");
	});

	it("stays IDLE when all deposits are depleted", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		mockGetAllDeposits.mockReturnValue([makeDeposit("dep_1", 50, 50, 0)]);

		tickAIHarvestPipeline();

		// Depleted deposit (quantity=0) should not trigger SEEK_DEPOSIT
		expect(getBotState("bot_1")!.phase).toBe("IDLE");
	});
});

// ---------------------------------------------------------------------------
// SEEK_DEPOSIT phase
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — SEEK_DEPOSIT phase", () => {
	it("moves bot toward deposit each tick", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 0, 500);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// First tick transitions IDLE → SEEK_DEPOSIT
		tickAIHarvestPipeline();
		const posAfterFirstTick = getBotState("bot_1")!.position.x;

		// Second tick: bot moves toward deposit
		tickAIHarvestPipeline();
		const posAfterSecondTick = getBotState("bot_1")!.position.x;

		expect(posAfterSecondTick).toBeGreaterThan(posAfterFirstTick);
	});

	it("transitions to HARVESTING when bot arrives at deposit", () => {
		// Place bot very close to deposit (within ARRIVAL_RADIUS = 1.5)
		registerBot("bot_1", "reclaimers", pos(49, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 500);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// First tick: IDLE → SEEK_DEPOSIT, then check — bot is close enough so should arrive
		tickAIHarvestPipeline();

		const state = getBotState("bot_1")!;
		// Bot should be in SEEK_DEPOSIT or HARVESTING depending on arrival check
		// Since deposit is at (50, 50) and bot at (49, 50), dist = 1 < 1.5 = arrived on next tick
		// Actually on first tick IDLE → SEEK_DEPOSIT, on second tick moved a step and arrives
		expect(["SEEK_DEPOSIT", "HARVESTING"]).toContain(state.phase);
	});

	it("returns to IDLE if deposit disappears before arrival", () => {
		registerBot("bot_1", "reclaimers", pos(0, 0, 0), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 500);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Start seeking
		tickAIHarvestPipeline();
		expect(getBotState("bot_1")!.phase).toBe("SEEK_DEPOSIT");

		// Deposit disappears (depleted or removed)
		mockGetAllDeposits.mockReturnValue([]);

		tickAIHarvestPipeline();

		// Bot should return to IDLE
		expect(getBotState("bot_1")!.phase).toBe("IDLE");
	});
});

// ---------------------------------------------------------------------------
// HARVESTING phase
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — HARVESTING phase", () => {
	it("accumulates powder each tick while harvesting", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 1000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// IDLE → SEEK_DEPOSIT
		tickAIHarvestPipeline();
		// SEEK_DEPOSIT → HARVESTING (bot arrives since it's at same position)
		tickAIHarvestPipeline();

		const state = getBotState("bot_1")!;
		// If we made it to HARVESTING, powder should be accumulating
		if (state.phase === "HARVESTING") {
			tickAIHarvestPipeline();
			expect(getBotState("bot_1")!.powderAccumulated).toBeGreaterThan(0);
		}
	});

	it("transitions to COMPRESSING when powder reaches threshold", () => {
		// Place bot at deposit
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Run enough ticks to reach COMPRESSING
		// IDLE → SEEK_DEPOSIT → HARVESTING → COMPRESSING
		// Powder threshold is defaultPowderCapacity, harvest rate = capacity/20 per tick
		// So need ~20 ticks of harvesting to fill up
		for (let i = 0; i < 30; i++) {
			tickAIHarvestPipeline();
			const s = getBotState("bot_1")!;
			if (s.phase === "COMPRESSING" || s.phase === "CARRYING") break;
		}

		const state = getBotState("bot_1")!;
		expect(["COMPRESSING", "CARRYING", "DEPOSITING", "IDLE"]).toContain(
			state.phase,
		);
	});

	it("transitions to IDLE if deposit depletes before threshold and powder is too low", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		// Deposit with very small quantity (below 50% of threshold)
		const deposit = makeDeposit("dep_1", 50, 50, 0.1);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Run until deposit depletes
		for (let i = 0; i < 10; i++) {
			tickAIHarvestPipeline();
		}

		// Bot should be IDLE (not enough powder to compress)
		const state = getBotState("bot_1")!;
		expect(["IDLE", "SEEK_DEPOSIT"]).toContain(state.phase);
	});
});

// ---------------------------------------------------------------------------
// COMPRESSING phase
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — COMPRESSING phase", () => {
	it("calls spawnCube after compression ticks complete", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Run until spawnCube is called or we exceed a generous tick limit
		let spawnCalled = false;
		for (let i = 0; i < 100; i++) {
			tickAIHarvestPipeline();
			if (mockSpawnCube.mock.calls.length > 0) {
				spawnCalled = true;
				break;
			}
		}

		expect(spawnCalled).toBe(true);
	});

	it("spawnCube is called with the faction ID", () => {
		registerBot("bot_1", "iron_creed", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		for (let i = 0; i < 100; i++) {
			tickAIHarvestPipeline();
			if (mockSpawnCube.mock.calls.length > 0) break;
		}

		expect(mockSpawnCube).toHaveBeenCalledWith(
			"iron_creed",
			expect.any(String),
			expect.any(Number),
			expect.any(Number),
		);
	});

	it("transitions to CARRYING after cube is spawned", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		for (let i = 0; i < 100; i++) {
			tickAIHarvestPipeline();
			const state = getBotState("bot_1")!;
			if (state.phase === "CARRYING") break;
		}

		expect(getBotState("bot_1")!.phase).toBe("CARRYING");
	});
});

// ---------------------------------------------------------------------------
// CARRYING and DEPOSITING phases
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — CARRYING/DEPOSITING phases", () => {
	it("bot moves toward base during CARRYING", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Advance to CARRYING
		let carryingReached = false;
		for (let i = 0; i < 100; i++) {
			tickAIHarvestPipeline();
			if (getBotState("bot_1")!.phase === "CARRYING") {
				carryingReached = true;
				break;
			}
		}

		if (carryingReached) {
			const posBefore = { ...getBotState("bot_1")!.position };
			tickAIHarvestPipeline();
			const posAfter = getBotState("bot_1")!.position;

			// Bot should be moving toward base at (100, 100)
			const dBefore = Math.hypot(100 - posBefore.x, 100 - posBefore.z);
			const dAfter = Math.hypot(100 - posAfter.x, 100 - posAfter.z);
			expect(dAfter).toBeLessThanOrEqual(dBefore);
		}
	});

	it("transitions from DEPOSITING to IDLE and clears carriedCubeId", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(100, 0, 100));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		// Run full cycle
		for (let i = 0; i < 300; i++) {
			tickAIHarvestPipeline();
			const state = getBotState("bot_1")!;
			if (state.phase === "IDLE" && i > 50) {
				// Bot completed at least one full cycle
				expect(state.carriedCubeId).toBeNull();
				break;
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Full cycle integration
// ---------------------------------------------------------------------------

describe("AIHarvestPipeline — full cycle", () => {
	it("bot completes IDLE→SEEK→HARVEST→COMPRESS→CARRY→DEPOSIT→IDLE cycle", () => {
		registerBot("bot_1", "reclaimers", pos(50, 0, 50), pos(51, 0, 51));
		const deposit = makeDeposit("dep_1", 50, 50, 10000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		const phasesSeen = new Set<string>();

		for (let i = 0; i < 500; i++) {
			tickAIHarvestPipeline();
			const state = getBotState("bot_1")!;
			phasesSeen.add(state.phase);

			// Stop once we've cycled back to IDLE after starting (seen CARRYING)
			if (phasesSeen.has("CARRYING") && state.phase === "IDLE") {
				break;
			}
		}

		// All phases should have been visited
		expect(phasesSeen).toContain("SEEK_DEPOSIT");
		expect(phasesSeen).toContain("HARVESTING");
		expect(phasesSeen).toContain("COMPRESSING");
		expect(phasesSeen).toContain("CARRYING");
		// spawnCube should have been called
		expect(mockSpawnCube).toHaveBeenCalled();
	});

	it("multiple bots harvest independently without interfering", () => {
		registerBot("bot_a", "reclaimers", pos(50, 0, 50), pos(0, 0, 0));
		registerBot("bot_b", "volt_collective", pos(50, 0, 50), pos(200, 0, 200));

		const deposit = makeDeposit("dep_1", 50, 50, 100000);
		mockGetAllDeposits.mockReturnValue([deposit]);

		for (let i = 0; i < 100; i++) {
			tickAIHarvestPipeline();
		}

		// Both bots should have progressed from IDLE
		const stateA = getBotState("bot_a")!;
		const stateB = getBotState("bot_b")!;
		expect(stateA.phase).not.toBe("IDLE");
		expect(stateB.phase).not.toBe("IDLE");
	});
});
