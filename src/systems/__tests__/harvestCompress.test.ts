/**
 * Unit tests for the harvest + compress system.
 *
 * Tests cover:
 * - startHarvesting validation (deposit exists, not already active, etc.)
 * - Powder accumulation over ticks via harvestCompressSystem()
 * - Auto-stop on capacity reached or deposit depleted
 * - stopHarvesting clears state
 * - startCompression validation (not harvesting, sufficient powder, etc.)
 * - Compression progress over ticks
 * - Cube spawn events on compression completion
 * - Mutual exclusion: cannot harvest while compressing and vice versa
 * - Multiple entities independently
 * - Extraction rates per ore type from config
 * - Compression configs per material from config
 * - resetHarvestCompress clears everything
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		mining: {
			oreTypes: {
				rock: { hardness: 1, grindSpeed: 1.0, color: "#8B7355" },
				scrap_iron: { hardness: 2, grindSpeed: 0.8, color: "#8B4513" },
				copper: { hardness: 3, grindSpeed: 0.6, color: "#B87333" },
				silicon: { hardness: 4, grindSpeed: 0.4, color: "#A0A0C0" },
				titanium: { hardness: 5, grindSpeed: 0.3, color: "#C0C0C0" },
			},
			defaultExtractionRate: 0.1,
			harvesting: {
				defaultRange: 3.0,
				defaultPowderCapacity: 100,
			},
		},
		deposits: {
			types: {
				rock: { frequency: 0.3, yieldRange: [50, 200], tier: 1 },
				scrap_iron: { frequency: 0.25, yieldRange: [30, 150], tier: 1 },
				copper: { frequency: 0.15, yieldRange: [20, 80], tier: 2 },
				silicon: { frequency: 0.1, yieldRange: [10, 50], tier: 2 },
				titanium: { frequency: 0.05, yieldRange: [5, 30], tier: 3 },
			},
		},
		furnace: {
			compression: {
				cubeSize: 0.5,
				configs: {
					rock: { powderRequired: 60, compressionTime: 3 },
					scrap_iron: { powderRequired: 100, compressionTime: 5 },
					copper: { powderRequired: 80, compressionTime: 4 },
					silicon: { powderRequired: 120, compressionTime: 6 },
					titanium: { powderRequired: 150, compressionTime: 8 },
				},
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	getCompressionState,
	getDeposit,
	getHarvestingState,
	harvestCompressSystem,
	registerDeposit,
	resetHarvestCompress,
	setEntityPosition,
	startCompression,
	startHarvesting,
	stopHarvesting,
} from "../harvestCompress";

import type {
	CompressEvent,
	DepositData,
} from "../harvestCompress";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetHarvestCompress();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeposit(overrides: Partial<DepositData> = {}): DepositData {
	return {
		id: overrides.id ?? "deposit_1",
		type: overrides.type ?? "rock",
		tier: overrides.tier ?? 1,
		quantity: overrides.quantity ?? 500,
		...overrides,
	};
}

function tickN(n: number): CompressEvent[] {
	let allEvents: CompressEvent[] = [];
	for (let i = 0; i < n; i++) {
		allEvents = allEvents.concat(harvestCompressSystem());
	}
	return allEvents;
}

// ---------------------------------------------------------------------------
// registerDeposit / getDeposit
// ---------------------------------------------------------------------------

describe("deposit registry", () => {
	it("registers and retrieves a deposit", () => {
		const dep = makeDeposit();
		registerDeposit(dep);
		const retrieved = getDeposit("deposit_1");
		expect(retrieved).toBeDefined();
		expect(retrieved!.type).toBe("rock");
		expect(retrieved!.quantity).toBe(500);
	});

	it("returns undefined for unregistered deposit", () => {
		expect(getDeposit("nonexistent")).toBeUndefined();
	});

	it("stores a copy, not a reference", () => {
		const dep = makeDeposit();
		registerDeposit(dep);
		dep.quantity = 0;
		expect(getDeposit("deposit_1")!.quantity).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// startHarvesting
// ---------------------------------------------------------------------------

describe("startHarvesting", () => {
	it("starts harvesting a valid deposit", () => {
		registerDeposit(makeDeposit());
		const result = startHarvesting("player", "deposit_1");
		expect(result).toBe(true);
		expect(getHarvestingState("player")).not.toBeNull();
	});

	it("returns false for nonexistent deposit", () => {
		expect(startHarvesting("player", "nope")).toBe(false);
		expect(getHarvestingState("player")).toBeNull();
	});

	it("returns false for depleted deposit (quantity 0)", () => {
		registerDeposit(makeDeposit({ quantity: 0 }));
		expect(startHarvesting("player", "deposit_1")).toBe(false);
	});

	it("returns false if entity is already harvesting", () => {
		registerDeposit(makeDeposit({ id: "d1" }));
		registerDeposit(makeDeposit({ id: "d2" }));
		startHarvesting("player", "d1");
		expect(startHarvesting("player", "d2")).toBe(false);
	});

	it("returns false if entity is currently compressing", () => {
		registerDeposit(makeDeposit());
		// Start a compression first
		startCompression("player", "rock", 100);
		expect(startHarvesting("player", "deposit_1")).toBe(false);
	});

	it("uses custom capacity when provided", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1", 50);
		const state = getHarvestingState("player");
		expect(state!.capacity).toBe(50);
	});

	it("uses default capacity (100) when not provided", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		const state = getHarvestingState("player");
		expect(state!.capacity).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// getHarvestingState
// ---------------------------------------------------------------------------

describe("getHarvestingState", () => {
	it("returns null when entity is not harvesting", () => {
		expect(getHarvestingState("player")).toBeNull();
	});

	it("returns deposit ID, powder collected, capacity, and material type", () => {
		registerDeposit(makeDeposit({ type: "copper" }));
		startHarvesting("player", "deposit_1");

		const state = getHarvestingState("player");
		expect(state).toEqual({
			depositId: "deposit_1",
			powderCollected: 0,
			capacity: 100,
			materialType: "copper",
		});
	});
});

// ---------------------------------------------------------------------------
// stopHarvesting
// ---------------------------------------------------------------------------

describe("stopHarvesting", () => {
	it("stops active harvesting and clears state", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		stopHarvesting("player");
		expect(getHarvestingState("player")).toBeNull();
	});

	it("is a no-op for entity not harvesting", () => {
		// Should not throw
		stopHarvesting("player");
		expect(getHarvestingState("player")).toBeNull();
	});

	it("allows entity to start harvesting again after stop", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		stopHarvesting("player");
		expect(startHarvesting("player", "deposit_1")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// harvestCompressSystem — harvesting advancement
// ---------------------------------------------------------------------------

describe("harvestCompressSystem — harvesting", () => {
	it("accumulates powder each tick based on extraction rate", () => {
		// rock: grindSpeed=1.0, defaultExtractionRate=0.1 → rate = 0.1 per tick
		registerDeposit(makeDeposit({ type: "rock", quantity: 500 }));
		startHarvesting("player", "deposit_1");

		harvestCompressSystem();
		const state = getHarvestingState("player");
		expect(state).not.toBeNull();
		expect(state!.powderCollected).toBeCloseTo(0.1);
	});

	it("accumulates over multiple ticks", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 500 }));
		startHarvesting("player", "deposit_1");

		tickN(10);
		const state = getHarvestingState("player");
		expect(state).not.toBeNull();
		// 10 * 0.1 = 1.0
		expect(state!.powderCollected).toBeCloseTo(1.0);
	});

	it("uses ore-type-specific grindSpeed", () => {
		// scrap_iron: grindSpeed=0.8, rate = 0.8 * 0.1 = 0.08
		registerDeposit(makeDeposit({ type: "scrap_iron", quantity: 500 }));
		startHarvesting("player", "deposit_1");

		harvestCompressSystem();
		const state = getHarvestingState("player");
		expect(state!.powderCollected).toBeCloseTo(0.08);
	});

	it("uses slower rate for harder ore (titanium)", () => {
		// titanium: grindSpeed=0.3, rate = 0.3 * 0.1 = 0.03
		registerDeposit(makeDeposit({ type: "titanium", quantity: 500 }));
		startHarvesting("player", "deposit_1");

		harvestCompressSystem();
		expect(getHarvestingState("player")!.powderCollected).toBeCloseTo(0.03);
	});

	it("decreases deposit quantity as powder is extracted", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 10 }));
		startHarvesting("player", "deposit_1");

		tickN(5);
		// Extracted 5 * 0.1 = 0.5
		const deposit = getDeposit("deposit_1");
		expect(deposit!.quantity).toBeCloseTo(10 - 0.5);
	});

	it("auto-stops when powder capacity is reached", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 500 }));
		startHarvesting("player", "deposit_1", 1); // tiny capacity

		// rate=0.1, capacity=1 → 10 ticks to fill
		tickN(10);
		expect(getHarvestingState("player")).toBeNull();
	});

	it("auto-stops when deposit is depleted", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 0.05 }));
		startHarvesting("player", "deposit_1");

		// rate=0.1 but only 0.05 available → extracts 0.05, deposit depleted
		harvestCompressSystem();
		expect(getHarvestingState("player")).toBeNull();
		expect(getDeposit("deposit_1")!.quantity).toBe(0);
	});

	it("clamps extraction to deposit remaining when less than rate", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 0.03 }));
		startHarvesting("player", "deposit_1");

		harvestCompressSystem();
		// Should have extracted only 0.03, not 0.1
		expect(getDeposit("deposit_1")!.quantity).toBeCloseTo(0);
	});

	it("clamps extraction to remaining capacity", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 500 }));
		startHarvesting("player", "deposit_1", 0.05); // capacity of 0.05

		harvestCompressSystem();
		// rate=0.1 but capacity=0.05, so only 0.05 extracted
		expect(getDeposit("deposit_1")!.quantity).toBeCloseTo(500 - 0.05);
	});

	it("falls back to defaultExtractionRate for unknown ore type", () => {
		registerDeposit(makeDeposit({ type: "unobtainium", quantity: 500 }));
		startHarvesting("player", "deposit_1");

		harvestCompressSystem();
		// Unknown ore → defaultExtractionRate = 0.1
		expect(getHarvestingState("player")!.powderCollected).toBeCloseTo(0.1);
	});

	it("returns no events during harvesting (events are from compression only)", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		const events = harvestCompressSystem();
		expect(events).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// startCompression
// ---------------------------------------------------------------------------

describe("startCompression", () => {
	it("starts compression with sufficient powder", () => {
		// rock: powderRequired=60
		const result = startCompression("player", "rock", 60);
		expect(result).toBe(true);
		expect(getCompressionState("player")).not.toBeNull();
	});

	it("returns false with insufficient powder", () => {
		// rock: powderRequired=60
		expect(startCompression("player", "rock", 59)).toBe(false);
		expect(getCompressionState("player")).toBeNull();
	});

	it("returns false with zero powder", () => {
		expect(startCompression("player", "rock", 0)).toBe(false);
	});

	it("returns false without materialType", () => {
		expect(startCompression("player", undefined, 100)).toBe(false);
	});

	it("returns false if entity is currently harvesting", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		expect(startCompression("player", "rock", 100)).toBe(false);
	});

	it("returns false if entity is already compressing", () => {
		startCompression("player", "rock", 100);
		expect(startCompression("player", "rock", 100)).toBe(false);
	});

	it("uses per-material compression time from config", () => {
		// titanium: compressionTime=8
		startCompression("player", "titanium", 200);
		const state = getCompressionState("player");
		expect(state!.duration).toBe(8);
	});

	it("uses fallback config for unknown material type", () => {
		// Unknown material falls back to powderRequired=100 (defaultPowderCapacity), compressionTime=2
		const result = startCompression("player", "unobtainium", 100);
		expect(result).toBe(true);
		const state = getCompressionState("player");
		expect(state!.duration).toBe(2);
	});

	it("rejects unknown material with insufficient powder for fallback", () => {
		// Fallback powderRequired = 100 (defaultPowderCapacity)
		expect(startCompression("player", "unobtainium", 99)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getCompressionState
// ---------------------------------------------------------------------------

describe("getCompressionState", () => {
	it("returns null when entity is not compressing", () => {
		expect(getCompressionState("player")).toBeNull();
	});

	it("returns progress, duration, and materialType", () => {
		startCompression("player", "copper", 100);
		const state = getCompressionState("player");
		expect(state).toEqual({
			progress: 0,
			duration: 4, // copper compressionTime
			materialType: "copper",
		});
	});
});

// ---------------------------------------------------------------------------
// harvestCompressSystem — compression advancement
// ---------------------------------------------------------------------------

describe("harvestCompressSystem — compression", () => {
	it("advances compression progress by 1 per tick", () => {
		startCompression("player", "rock", 100);
		harvestCompressSystem();
		const state = getCompressionState("player");
		expect(state!.progress).toBe(1);
	});

	it("accumulates progress over multiple ticks", () => {
		startCompression("player", "rock", 100);
		tickN(2);
		const state = getCompressionState("player");
		expect(state!.progress).toBe(2);
	});

	it("emits CompressEvent when progress reaches duration", () => {
		// rock: compressionTime=3
		startCompression("player", "rock", 100);
		const events = tickN(3);
		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({
			entityId: "player",
			cubeSpawned: true,
			materialType: "rock",
			x: 0,
			z: 0,
		});
	});

	it("clears compression state after completion", () => {
		startCompression("player", "rock", 100);
		tickN(3);
		expect(getCompressionState("player")).toBeNull();
	});

	it("does not emit event before duration is reached", () => {
		// rock: compressionTime=3
		startCompression("player", "rock", 100);
		const events = tickN(2);
		expect(events).toHaveLength(0);
		expect(getCompressionState("player")).not.toBeNull();
	});

	it("uses entity position for cube spawn coordinates", () => {
		setEntityPosition("player", 10.5, 25.3);
		startCompression("player", "rock", 100);
		const events = tickN(3);
		expect(events[0].x).toBeCloseTo(10.5);
		expect(events[0].z).toBeCloseTo(25.3);
	});

	it("defaults to (0, 0) when entity position is not set", () => {
		startCompression("player", "rock", 100);
		const events = tickN(3);
		expect(events[0].x).toBe(0);
		expect(events[0].z).toBe(0);
	});

	it("allows starting new compression after completion", () => {
		startCompression("player", "rock", 100);
		tickN(3); // completes
		expect(startCompression("player", "copper", 100)).toBe(true);
	});

	it("handles different materials with correct durations", () => {
		// silicon: compressionTime=6
		startCompression("player", "silicon", 200);
		const events5 = tickN(5);
		expect(events5).toHaveLength(0);
		expect(getCompressionState("player")).not.toBeNull();

		const events1 = tickN(1); // tick 6 → completes
		expect(events1).toHaveLength(1);
		expect(events1[0].materialType).toBe("silicon");
	});
});

// ---------------------------------------------------------------------------
// Mutual exclusion: harvest vs compress
// ---------------------------------------------------------------------------

describe("mutual exclusion", () => {
	it("cannot start harvesting while compressing", () => {
		registerDeposit(makeDeposit());
		startCompression("player", "rock", 100);
		expect(startHarvesting("player", "deposit_1")).toBe(false);
	});

	it("cannot start compressing while harvesting", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		expect(startCompression("player", "rock", 100)).toBe(false);
	});

	it("can compress after stopping harvest", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		stopHarvesting("player");
		expect(startCompression("player", "rock", 100)).toBe(true);
	});

	it("can harvest after compression completes", () => {
		registerDeposit(makeDeposit());
		startCompression("player", "rock", 100);
		tickN(3); // rock compressionTime=3
		expect(startHarvesting("player", "deposit_1")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Multiple entities
// ---------------------------------------------------------------------------

describe("multiple entities", () => {
	it("tracks harvesting independently per entity", () => {
		registerDeposit(makeDeposit({ id: "d1", type: "rock" }));
		registerDeposit(makeDeposit({ id: "d2", type: "copper" }));

		startHarvesting("bot_a", "d1");
		startHarvesting("bot_b", "d2");

		harvestCompressSystem();

		const stateA = getHarvestingState("bot_a");
		const stateB = getHarvestingState("bot_b");

		// rock rate = 1.0 * 0.1 = 0.1
		expect(stateA!.powderCollected).toBeCloseTo(0.1);
		expect(stateA!.materialType).toBe("rock");

		// copper rate = 0.6 * 0.1 = 0.06
		expect(stateB!.powderCollected).toBeCloseTo(0.06);
		expect(stateB!.materialType).toBe("copper");
	});

	it("tracks compression independently per entity", () => {
		startCompression("bot_a", "rock", 100); // duration=3
		startCompression("bot_b", "titanium", 200); // duration=8

		const events3 = tickN(3);
		// bot_a should complete, bot_b should not
		expect(events3).toHaveLength(1);
		expect(events3[0].entityId).toBe("bot_a");

		const stateB = getCompressionState("bot_b");
		expect(stateB).not.toBeNull();
		expect(stateB!.progress).toBe(3);
	});

	it("one entity harvesting does not affect another compressing", () => {
		registerDeposit(makeDeposit());
		startHarvesting("bot_a", "deposit_1");
		startCompression("bot_b", "rock", 100);

		harvestCompressSystem();

		expect(getHarvestingState("bot_a")).not.toBeNull();
		expect(getCompressionState("bot_b")).not.toBeNull();
		expect(getCompressionState("bot_b")!.progress).toBe(1);
	});

	it("multiple compressions can complete in the same tick", () => {
		startCompression("bot_a", "rock", 100); // duration=3
		startCompression("bot_b", "rock", 100); // duration=3

		const events = tickN(3);
		expect(events).toHaveLength(2);
		const ids = events.map((e) => e.entityId);
		expect(ids).toContain("bot_a");
		expect(ids).toContain("bot_b");
	});
});

// ---------------------------------------------------------------------------
// Full pipeline: harvest then compress
// ---------------------------------------------------------------------------

describe("full pipeline: harvest → compress", () => {
	it("harvests powder then compresses into a cube", () => {
		registerDeposit(makeDeposit({ type: "rock", quantity: 500 }));
		setEntityPosition("player", 5, 10);

		// Start harvesting
		expect(startHarvesting("player", "deposit_1")).toBe(true);

		// Tick enough to accumulate some powder (but capacity-limited at 100)
		// rock rate=0.1/tick, need 1000 ticks for 100 powder
		tickN(1000);

		// Harvesting should auto-stop at capacity
		expect(getHarvestingState("player")).toBeNull();

		// Now compress — rock needs 60 powder, we have 100
		expect(startCompression("player", "rock", 100)).toBe(true);

		// Tick through compression (3 ticks for rock)
		const events = tickN(3);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({
			entityId: "player",
			cubeSpawned: true,
			materialType: "rock",
			x: 5,
			z: 10,
		});
	});
});

// ---------------------------------------------------------------------------
// resetHarvestCompress
// ---------------------------------------------------------------------------

describe("resetHarvestCompress", () => {
	it("clears all harvesting state", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		resetHarvestCompress();
		expect(getHarvestingState("player")).toBeNull();
	});

	it("clears all compression state", () => {
		startCompression("player", "rock", 100);
		resetHarvestCompress();
		expect(getCompressionState("player")).toBeNull();
	});

	it("clears deposits", () => {
		registerDeposit(makeDeposit());
		resetHarvestCompress();
		expect(getDeposit("deposit_1")).toBeUndefined();
	});

	it("clears entity positions", () => {
		setEntityPosition("player", 5, 10);
		resetHarvestCompress();
		// After reset, position defaults to (0,0)
		startCompression("player", "rock", 100);
		const events = tickN(3);
		expect(events[0].x).toBe(0);
		expect(events[0].z).toBe(0);
	});

	it("allows fresh start after reset", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		resetHarvestCompress();

		// Re-register and start fresh
		registerDeposit(makeDeposit({ id: "d_new", type: "copper" }));
		expect(startHarvesting("player", "d_new")).toBe(true);
		expect(getHarvestingState("player")!.materialType).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("harvestCompressSystem with no active entities returns empty", () => {
		const events = harvestCompressSystem();
		expect(events).toEqual([]);
	});

	it("harvesting a deposit that gets removed mid-session clears state", () => {
		registerDeposit(makeDeposit());
		startHarvesting("player", "deposit_1");
		// Simulate deposit removal by resetting deposits
		resetHarvestCompress();
		registerDeposit(makeDeposit({ id: "deposit_1", quantity: 0 }));
		startHarvesting("player", "deposit_1");
		// Deposit has 0 quantity — rejected
		expect(getHarvestingState("player")).toBeNull();
	});

	it("multiple entities can harvest the same deposit", () => {
		registerDeposit(makeDeposit({ quantity: 500 }));
		startHarvesting("bot_a", "deposit_1");
		startHarvesting("bot_b", "deposit_1");

		harvestCompressSystem();

		const stateA = getHarvestingState("bot_a");
		const stateB = getHarvestingState("bot_b");
		expect(stateA).not.toBeNull();
		expect(stateB).not.toBeNull();
		// Both extracted 0.1 each → deposit lost 0.2
		expect(getDeposit("deposit_1")!.quantity).toBeCloseTo(500 - 0.2);
	});

	it("deposit depletion mid-tick stops harvesting cleanly", () => {
		// Deposit with only 0.15 quantity, two entities extracting 0.1 each
		registerDeposit(makeDeposit({ quantity: 0.15 }));
		startHarvesting("bot_a", "deposit_1");
		startHarvesting("bot_b", "deposit_1");

		harvestCompressSystem();

		// First entity extracts 0.1, leaving 0.05
		// Second entity can only extract 0.05
		const deposit = getDeposit("deposit_1");
		expect(deposit!.quantity).toBeCloseTo(0);
	});

	it("compression with exact powder requirement succeeds", () => {
		// rock: powderRequired=60
		expect(startCompression("player", "rock", 60)).toBe(true);
	});
});
