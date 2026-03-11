/**
 * Unit tests for the mining system.
 *
 * Tests cover:
 * - Extraction rate per tick (counter-based interval from extractionRate)
 * - Counter threshold for item production
 * - Drill health degradation (0.001 per extraction)
 * - Deposit depletion — item placed on output belt or buffered
 * - Edge cases: depleted deposit (broken drill), unpowered miner, zero extraction rate
 * - Buffer limit (max 5), buffer overflow (items lost)
 * - Output belt interaction (carries item, belt full fallback to buffer)
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock declarations for jest.mock factory hoisting
const mockMiners = [] as Array<unknown>;
const mockWorldEntities = [] as Array<unknown>;
jest.mock("../../ecs/world", () => ({
	miners: mockMiners,
	world: mockWorldEntities,
}));

// Also mock the Koota compat layer (mining.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	miners: mockMiners,
}));

import { getMinerBuffer, miningSystem } from "../mining";

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

interface MockMinerEntity {
	id: string;
	miner: {
		resourceType: string;
		extractionRate: number;
		outputBeltId: string | null;
		drillHealth: number;
		active: boolean;
	};
	building: {
		powered: boolean;
		operational: boolean;
	};
	worldPosition: { x: number; y: number; z: number };
}

interface MockBeltEntity {
	id: string;
	belt: {
		carrying: string | null;
		itemProgress: number;
	};
}

function createMiner(
	opts: {
		id?: string;
		resourceType?: string;
		extractionRate?: number;
		outputBeltId?: string | null;
		drillHealth?: number;
		active?: boolean;
		powered?: boolean;
	} = {},
): MockMinerEntity {
	return {
		id: opts.id ?? `miner_${Math.random().toString(36).slice(2, 8)}`,
		miner: {
			resourceType: opts.resourceType ?? "scrap_metal",
			extractionRate: opts.extractionRate ?? 1.0,
			outputBeltId: opts.outputBeltId ?? null,
			drillHealth: opts.drillHealth ?? 1.0,
			active: opts.active ?? true,
		},
		building: {
			powered: opts.powered ?? true,
			operational: true,
		},
		worldPosition: { x: 0, y: 0, z: 0 },
	};
}

function createBelt(
	id: string,
	carrying: string | null = null,
): MockBeltEntity {
	return {
		id,
		belt: {
			carrying,
			itemProgress: 0,
		},
	};
}

/**
 * Run the mining system N times to accumulate ticks.
 */
function tickN(n: number) {
	for (let i = 0; i < n; i++) {
		miningSystem();
	}
}

// ---------------------------------------------------------------------------
// Setup — clear state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockMiners.length = 0;
	mockWorldEntities.length = 0;

	// Reset the module-level Maps (extractionCounters, minerBuffers).
	// Since they are private, we re-import a fresh module by clearing the cache.
	// A simpler approach: just run enough ticks with an empty miner list to be safe,
	// but the cleanest is to reload. Instead, we use jest.resetModules in a dynamic import.
	// However, since we already imported at top level, we rely on the test isolation
	// provided by unique entity IDs per test and explicit counter management.
});

// ---------------------------------------------------------------------------
// Extraction rate per tick (counter-based)
// ---------------------------------------------------------------------------

describe("extraction rate and counter", () => {
	it("produces an item after interval ticks (extractionRate = 1.0)", () => {
		// interval = ceil(1 / 1.0) = 1, so every tick produces
		const miner = createMiner({ extractionRate: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem();

		// After 1 tick with extractionRate 1.0, interval=1, counter goes 0->1 which equals interval
		expect(getMinerBuffer(miner.id)).toBe(1);
	});

	it("produces an item after 2 ticks when extractionRate = 0.5", () => {
		// interval = ceil(1 / 0.5) = 2
		const miner = createMiner({ extractionRate: 0.5 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem(); // counter = 1, interval = 2 => no item
		expect(getMinerBuffer(miner.id)).toBe(0);

		miningSystem(); // counter = 2, interval = 2 => item produced
		expect(getMinerBuffer(miner.id)).toBe(1);
	});

	it("produces an item after 5 ticks when extractionRate = 0.2", () => {
		// interval = ceil(1 / 0.2) = 5
		const miner = createMiner({ extractionRate: 0.2 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(4);
		expect(getMinerBuffer(miner.id)).toBe(0);

		miningSystem(); // tick 5
		expect(getMinerBuffer(miner.id)).toBe(1);
	});

	it("produces items continuously at interval rate", () => {
		// extractionRate = 0.5 => interval = 2, so every 2 ticks
		const miner = createMiner({ extractionRate: 0.5 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(6); // 3 items in 6 ticks
		expect(getMinerBuffer(miner.id)).toBe(3);
	});

	it("resets counter to 0 after extraction", () => {
		// extractionRate = 0.5 => interval = 2
		const miner = createMiner({ extractionRate: 0.5 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(2); // produces item, counter resets
		expect(getMinerBuffer(miner.id)).toBe(1);

		tickN(1); // counter = 1, no item yet
		expect(getMinerBuffer(miner.id)).toBe(1);

		tickN(1); // counter = 2, item produced
		expect(getMinerBuffer(miner.id)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Drill health degradation
// ---------------------------------------------------------------------------

describe("drill health degradation", () => {
	it("degrades by 0.001 per extraction", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem();

		expect(miner.miner.drillHealth).toBeCloseTo(0.999);
	});

	it("degrades cumulatively over multiple extractions", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(10);

		expect(miner.miner.drillHealth).toBeCloseTo(1.0 - 10 * 0.001);
	});

	it("does not degrade below zero", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 0.0005 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem();

		expect(miner.miner.drillHealth).toBe(0);
	});

	it("deactivates miner when drill health reaches zero", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 0.001 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		// First tick: health goes 0.001 -> 0 and item is produced
		miningSystem();
		expect(miner.miner.drillHealth).toBe(0);

		// Second tick: drillHealth <= 0, so miner is deactivated and skipped
		const bufferBefore = getMinerBuffer(miner.id);
		miningSystem();
		expect(miner.miner.active).toBe(false);
		expect(getMinerBuffer(miner.id)).toBe(bufferBefore);
	});
});

// ---------------------------------------------------------------------------
// Broken drill edge case
// ---------------------------------------------------------------------------

describe("broken drill", () => {
	it("skips miner with drillHealth = 0", () => {
		const miner = createMiner({
			extractionRate: 1.0,
			drillHealth: 0,
			active: true,
		});
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem();

		expect(miner.miner.active).toBe(false);
		expect(getMinerBuffer(miner.id)).toBe(0);
	});

	it("does not produce items after drill breaks", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(5);

		expect(getMinerBuffer(miner.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Unpowered miner
// ---------------------------------------------------------------------------

describe("unpowered miner", () => {
	it("skips unpowered miner", () => {
		const miner = createMiner({ extractionRate: 1.0, powered: false });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(5);

		expect(getMinerBuffer(miner.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Inactive miner
// ---------------------------------------------------------------------------

describe("inactive miner", () => {
	it("skips inactive miner", () => {
		const miner = createMiner({ extractionRate: 1.0, active: false });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(5);

		expect(getMinerBuffer(miner.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Output belt interaction
// ---------------------------------------------------------------------------

describe("output belt", () => {
	it("places item on empty output belt instead of buffering", () => {
		const belt = createBelt("belt_1");
		const miner = createMiner({
			extractionRate: 1.0,
			outputBeltId: "belt_1",
		});
		mockMiners.push(miner);
		mockWorldEntities.push(miner, belt);

		miningSystem();

		expect(belt.belt.carrying).toBe("scrap_metal");
		expect(belt.belt.itemProgress).toBe(0);
		expect(getMinerBuffer(miner.id)).toBe(0);
	});

	it("buffers item when output belt is occupied", () => {
		const belt = createBelt("belt_1", "copper"); // already carrying
		const miner = createMiner({
			extractionRate: 1.0,
			outputBeltId: "belt_1",
		});
		mockMiners.push(miner);
		mockWorldEntities.push(miner, belt);

		miningSystem();

		expect(belt.belt.carrying).toBe("copper"); // unchanged
		expect(getMinerBuffer(miner.id)).toBe(1);
	});

	it("buffers item when output belt entity does not exist", () => {
		const miner = createMiner({
			extractionRate: 1.0,
			outputBeltId: "nonexistent_belt",
		});
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		miningSystem();

		expect(getMinerBuffer(miner.id)).toBe(1);
	});

	it("places resourceType on belt matching miner's resource", () => {
		const belt = createBelt("belt_1");
		const miner = createMiner({
			extractionRate: 1.0,
			outputBeltId: "belt_1",
			resourceType: "e_waste",
		});
		mockMiners.push(miner);
		mockWorldEntities.push(miner, belt);

		miningSystem();

		expect(belt.belt.carrying).toBe("e_waste");
	});
});

// ---------------------------------------------------------------------------
// Buffer limits
// ---------------------------------------------------------------------------

describe("buffer limits", () => {
	it("buffers up to 5 items", () => {
		const miner = createMiner({ extractionRate: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(5);

		expect(getMinerBuffer(miner.id)).toBe(5);
	});

	it("does not buffer beyond 5 items (item is lost)", () => {
		const miner = createMiner({ extractionRate: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(10);

		expect(getMinerBuffer(miner.id)).toBe(5);
	});

	it("drill still degrades even when buffer is full", () => {
		const miner = createMiner({ extractionRate: 1.0, drillHealth: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(10);

		// 10 extractions * 0.001 = 0.01 degradation
		expect(miner.miner.drillHealth).toBeCloseTo(1.0 - 0.01);
		expect(getMinerBuffer(miner.id)).toBe(5); // capped
	});
});

// ---------------------------------------------------------------------------
// Zero extraction rate
// ---------------------------------------------------------------------------

describe("zero extraction rate", () => {
	it("never produces items with extractionRate = 0", () => {
		// interval = ceil(1 / 0) = Infinity, counter never reaches it
		const miner = createMiner({ extractionRate: 0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(100);

		expect(getMinerBuffer(miner.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getMinerBuffer
// ---------------------------------------------------------------------------

describe("getMinerBuffer", () => {
	it("returns 0 for unknown miner", () => {
		expect(getMinerBuffer("nonexistent")).toBe(0);
	});

	it("returns current buffer count for active miner", () => {
		const miner = createMiner({ extractionRate: 1.0 });
		mockMiners.push(miner);
		mockWorldEntities.push(miner);

		tickN(3);

		expect(getMinerBuffer(miner.id)).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Multiple miners
// ---------------------------------------------------------------------------

describe("multiple miners", () => {
	it("processes miners independently", () => {
		const fast = createMiner({
			id: "fast_miner",
			extractionRate: 1.0,
			resourceType: "scrap_metal",
		});
		const slow = createMiner({
			id: "slow_miner",
			extractionRate: 0.5,
			resourceType: "copper",
		});
		mockMiners.push(fast, slow);
		mockWorldEntities.push(fast, slow);

		tickN(4);

		// fast: 4 items in 4 ticks
		expect(getMinerBuffer(fast.id)).toBe(4);
		// slow: interval=2, 2 items in 4 ticks
		expect(getMinerBuffer(slow.id)).toBe(2);
	});

	it("one broken miner does not affect others", () => {
		const working = createMiner({ id: "working", extractionRate: 1.0 });
		const broken = createMiner({
			id: "broken",
			extractionRate: 1.0,
			drillHealth: 0,
		});
		mockMiners.push(working, broken);
		mockWorldEntities.push(working, broken);

		tickN(3);

		expect(getMinerBuffer(working.id)).toBe(3);
		expect(getMinerBuffer(broken.id)).toBe(0);
	});
});
