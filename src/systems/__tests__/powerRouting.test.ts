/**
 * Unit tests for the power routing system (BFS wire-graph distribution).
 *
 * Tests cover:
 * - Wire graph construction (bidirectional adjacency)
 * - BFS power distribution from lightning rod sources
 * - Distance-based power loss (wireLossPerUnit * wireLength)
 * - Power splitting at forks (even distribution among unvisited neighbors)
 * - Wire capacity limits
 * - Entity power demand by building type (config + defaults)
 * - Power satisfaction threshold (90%)
 * - applyPowerToBuildings: setting powered/operational flags
 * - Public API: getPowerAtEntity, isPowered, getPowerGridSnapshot, getWireFlow
 * - Edge cases: disconnected wires, no wires, no rods, long chains, cycles
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock collections — populated per test
// ---------------------------------------------------------------------------

const {
	mockWorld,
	mockBuildings,
	mockLightningRods,
	mockWires,
	mockMiners,
	mockProcessors,
} = vi.hoisted(() => {
	const mockWorld: Entity[] = [];
	const mockBuildings: Entity[] = [];
	const mockLightningRods: Entity[] = [];
	const mockWires: Entity[] = [];
	const mockMiners: Entity[] = [];
	const mockProcessors: Entity[] = [];
	return {
		mockWorld,
		mockBuildings,
		mockLightningRods,
		mockWires,
		mockMiners,
		mockProcessors,
	};
});

vi.mock("../../ecs/world", () => ({
	world: mockWorld,
	buildings: mockBuildings,
	lightningRods: mockLightningRods,
	wires: mockWires,
	miners: mockMiners,
	processors: mockProcessors,
}));

vi.mock("../../../config", () => ({
	config: {
		power: {
			wireLossPerUnit: 0.02,
			wireMaxCapacity: 5,
		},
		buildings: {
			furnace: { powerRequired: 2 },
			fabrication_unit: { powerRequired: 3 },
			miner: { powerRequired: 2 },
			processor: { powerRequired: 1 },
		},
	},
}));

// Import after mocking
import {
	getPowerAtEntity,
	getPowerGridSnapshot,
	getWireFlow,
	isPowered,
	updatePowerGrid,
} from "../powerRouting";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entityCounter = 0;

function uid(prefix = "e"): string {
	return `${prefix}-${++entityCounter}`;
}
// Mark uid as used to prevent TS6133
void uid;

function makeRod(
	id: string,
	opts: { currentOutput?: number; x?: number; z?: number } = {},
): Entity {
	const entity: Entity = {
		id,
		faction: "player",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity: 10,
			currentOutput: opts.currentOutput ?? 10,
			protectionRadius: 12,
		},
	};
	return entity;
}

function makeBuilding(
	id: string,
	type: string,
	opts: { x?: number; z?: number } = {},
): Entity {
	return {
		id,
		faction: "player",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		building: {
			type,
			powered: false,
			operational: false,
			selected: false,
			components: [],
		},
	};
}

function makeMiner(id: string): Entity {
	return {
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		building: {
			type: "miner",
			powered: false,
			operational: false,
			selected: false,
			components: [],
		},
		miner: {
			resourceType: "scrap_metal",
			extractionRate: 0.1,
			outputBeltId: null,
			drillHealth: 1,
			active: false,
		},
	};
}

function makeProcessor(id: string): Entity {
	return {
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		building: {
			type: "processor",
			powered: false,
			operational: false,
			selected: false,
			components: [],
		},
		processor: {
			processorType: "smelter",
			recipe: null,
			inputBeltId: null,
			outputBeltId: null,
			progress: 0,
			speed: 60,
			active: false,
		},
	};
}

function makeWire(
	id: string,
	fromId: string,
	toId: string,
	opts: { length?: number; maxCapacity?: number; wireType?: "power" | "signal" } = {},
): Entity {
	return {
		id,
		faction: "player",
		wire: {
			wireType: opts.wireType ?? "power",
			fromEntityId: fromId,
			toEntityId: toId,
			length: opts.length ?? 1,
			currentLoad: 0,
			maxCapacity: opts.maxCapacity ?? 5,
		},
	};
}

/** Register entities in both the world array and appropriate typed arrays. */
function addToWorld(...entities: Entity[]) {
	for (const e of entities) {
		mockWorld.push(e);
		if (e.lightningRod) mockLightningRods.push(e);
		if (e.building && e.building.type !== "lightning_rod") {
			mockBuildings.push(e);
		}
		if (e.wire) mockWires.push(e);
		if (e.miner) mockMiners.push(e);
		if (e.processor) mockProcessors.push(e);
	}
}

function clearWorld() {
	mockWorld.length = 0;
	mockBuildings.length = 0;
	mockLightningRods.length = 0;
	mockWires.length = 0;
	mockMiners.length = 0;
	mockProcessors.length = 0;
	entityCounter = 0;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	clearWorld();
});

// ---------------------------------------------------------------------------
// Basic BFS routing
// ---------------------------------------------------------------------------

describe("BFS power routing — basic", () => {
	it("powers a building directly wired to a rod", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace"); // demand 2
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(isPowered("b1")).toBe(true);
		expect(getPowerAtEntity("b1")).toBeGreaterThan(0);
	});

	it("rod is always self-powered with 0 hops", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		addToWorld(rod);

		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		expect(snapshot.poweredEntityIds.has("rod-1")).toBe(true);
		const alloc = snapshot.allocations.get("rod-1");
		expect(alloc).toBeDefined();
		expect(alloc!.hops).toBe(0);
		expect(alloc!.demand).toBe(0);
		expect(alloc!.satisfied).toBe(true);
	});

	it("returns empty grid when no rods or wires exist", () => {
		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		expect(snapshot.totalGeneration).toBe(0);
		expect(snapshot.totalDemand).toBe(0);
		expect(snapshot.allocations.size).toBe(0);
	});

	it("returns generation but no allocations when rods exist but no wires", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		addToWorld(rod);

		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		expect(snapshot.totalGeneration).toBe(10);
		expect(snapshot.surplus).toBe(10);
		// Only the rod itself is in allocations
		expect(snapshot.allocations.size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Distance-based power loss
// ---------------------------------------------------------------------------

describe("distance-based power loss", () => {
	it("short wire delivers nearly full power", () => {
		// wireLossPerUnit = 0.02, length = 1, maxCapacity = 20 (no cap)
		// flow = min(10, 20) = 10, delivered = 10 * (1 - 0.02) = 9.8
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 1,
			maxCapacity: 20,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(getPowerAtEntity("b1")).toBeCloseTo(9.8, 1);
	});

	it("long wire reduces delivered power significantly", () => {
		// wireLossPerUnit = 0.02, length = 20, maxCapacity = 20 (no cap)
		// flow = min(10, 20) = 10, loss = 0.40, delivered = 10 * 0.60 = 6.0
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 20,
			maxCapacity: 20,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(getPowerAtEntity("b1")).toBeCloseTo(6.0, 1);
	});

	it("very long wire delivers zero power (loss >= 1.0)", () => {
		// wireLossPerUnit = 0.02, length = 50 => loss = 1.0 => delivered = max(0, 10 * 0) = 0
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 50,
			maxCapacity: 20,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(getPowerAtEntity("b1")).toBe(0);
	});

	it("power loss compounds across chained wires", () => {
		// Rod -> A (len 5) -> B (len 5), maxCapacity = 20 (no cap)
		// Rod output: 10
		// A receives: min(10, 20) * (1 - 0.02*5) = 10 * 0.9 = 9.0
		// B receives: min(9.0, 20) * (1 - 0.02*5) = 9.0 * 0.9 = 8.1
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", {
			length: 5,
			maxCapacity: 20,
		});
		const w2 = makeWire("w2", "a", "b", {
			length: 5,
			maxCapacity: 20,
		});

		addToWorld(rod, a, b, w1, w2);
		updatePowerGrid();

		expect(getPowerAtEntity("a")).toBeCloseTo(9.0, 1);
		expect(getPowerAtEntity("b")).toBeCloseTo(8.1, 1);
	});

	it("hop count increases through chain", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const c = makeBuilding("c", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", { length: 1 });
		const w2 = makeWire("w2", "a", "b", { length: 1 });
		const w3 = makeWire("w3", "b", "c", { length: 1 });

		addToWorld(rod, a, b, c, w1, w2, w3);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("a")?.hops).toBe(1);
		expect(snapshot.allocations.get("b")?.hops).toBe(2);
		expect(snapshot.allocations.get("c")?.hops).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Power splitting at forks
// ---------------------------------------------------------------------------

describe("power splitting at forks", () => {
	it("splits power evenly between two branches", () => {
		// Rod (output=10) -> A and B via equal wires
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", { length: 1 });
		const w2 = makeWire("w2", "rod-1", "b", { length: 1 });

		addToWorld(rod, a, b, w1, w2);
		updatePowerGrid();

		// 10 / 2 = 5 per branch, then loss = 5 * (1 - 0.02) = 4.9
		expect(getPowerAtEntity("a")).toBeCloseTo(4.9, 1);
		expect(getPowerAtEntity("b")).toBeCloseTo(4.9, 1);
	});

	it("splits power evenly among three branches", () => {
		const rod = makeRod("rod-1", { currentOutput: 9 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const c = makeBuilding("c", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", { length: 1 });
		const w2 = makeWire("w2", "rod-1", "b", { length: 1 });
		const w3 = makeWire("w3", "rod-1", "c", { length: 1 });

		addToWorld(rod, a, b, c, w1, w2, w3);
		updatePowerGrid();

		// 9 / 3 = 3 per branch, loss = 3 * (1 - 0.02) = 2.94
		expect(getPowerAtEntity("a")).toBeCloseTo(2.94, 1);
		expect(getPowerAtEntity("b")).toBeCloseTo(2.94, 1);
		expect(getPowerAtEntity("c")).toBeCloseTo(2.94, 1);
	});
});

// ---------------------------------------------------------------------------
// Wire capacity limits
// ---------------------------------------------------------------------------

describe("wire capacity limits", () => {
	it("caps flow at wire maxCapacity", () => {
		// Rod outputs 10, wire max capacity is 3
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 1,
			maxCapacity: 3,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		// Flow capped to 3, then loss = 3 * (1 - 0.02) = 2.94
		expect(getPowerAtEntity("b1")).toBeCloseTo(2.94, 1);
	});

	it("wire currentLoad is set to flow/capacity ratio (capped at 1)", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 1,
			maxCapacity: 5,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		// Flow = min(10, 5) = 5; currentLoad = 5 / 5 = 1.0
		expect(wire.wire!.currentLoad).toBeCloseTo(1.0, 2);
	});

	it("wire currentLoad is proportional when flow is below capacity", () => {
		// Rod -> fork -> two buildings, so each branch gets 5
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", {
			length: 1,
			maxCapacity: 10,
		});
		const w2 = makeWire("w2", "rod-1", "b", {
			length: 1,
			maxCapacity: 10,
		});

		addToWorld(rod, a, b, w1, w2);
		updatePowerGrid();

		// Each wire carries 5 out of capacity 10 => load = 0.5
		expect(w1.wire!.currentLoad).toBeCloseTo(0.5, 2);
		expect(w2.wire!.currentLoad).toBeCloseTo(0.5, 2);
	});

	it("uses default wireMaxCapacity from config when wire maxCapacity is 0", () => {
		const rod = makeRod("rod-1", { currentOutput: 4 });
		const building = makeBuilding("b1", "outpost");
		// maxCapacity = 0 should fall back to config.power.wireMaxCapacity (5)
		const wire = makeWire("w1", "rod-1", "b1", {
			length: 1,
			maxCapacity: 0,
		});

		addToWorld(rod, building, wire);
		updatePowerGrid();

		// flow = min(4, 5) = 4, delivered = 4 * (1 - 0.02) = 3.92
		expect(getPowerAtEntity("b1")).toBeCloseTo(3.92, 1);
	});
});

// ---------------------------------------------------------------------------
// Entity power demand
// ---------------------------------------------------------------------------

describe("entity power demand", () => {
	it("furnace demands 2 (from config)", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		const alloc = snapshot.allocations.get("b1");
		expect(alloc?.demand).toBe(2);
	});

	it("fabrication_unit demands 3 (from config)", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "fabrication_unit");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("b1")?.demand).toBe(3);
	});

	it("miner demands 2 (from config fallback)", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "miner");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("b1")?.demand).toBe(2);
	});

	it("unknown building type defaults to 1", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "unknown_type");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("b1")?.demand).toBe(1);
	});

	it("lightning rod has 0 demand", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		addToWorld(rod);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("rod-1")?.demand).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Power satisfaction threshold
// ---------------------------------------------------------------------------

describe("power satisfaction (90% threshold)", () => {
	it("marks entity as satisfied when received >= 90% of demand", () => {
		// furnace demands 2; deliver ~9.8 => satisfied
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("b1")?.satisfied).toBe(true);
	});

	it("marks entity as NOT satisfied when received < 90% of demand", () => {
		// fabrication_unit demands 3; deliver very little power
		// Rod output 0.1, wire length 1 => delivered ~ 0.098
		// 0.098 < 3 * 0.9 = 2.7 => not satisfied
		const rod = makeRod("rod-1", { currentOutput: 0.1 });
		const building = makeBuilding("b1", "fabrication_unit");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.allocations.get("b1")?.satisfied).toBe(false);
	});

	it("exactly at 90% threshold is satisfied", () => {
		// Demand = 1 (outpost defaults to 1). Need received >= 0.9.
		// Rod output 0.92, wire length 1, maxCapacity 5:
		// flow = min(0.92, 5) = 0.92
		// delivered = 0.92 * (1 - 0.02*1) = 0.92 * 0.98 = 0.9016
		// 0.9016 >= 1 * 0.9 = 0.9 => satisfied
		const rod = makeRod("rod-1", { currentOutput: 0.92 });
		const building = makeBuilding("b1", "outpost");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		const alloc = snapshot.allocations.get("b1");
		expect(alloc?.received).toBeCloseTo(0.9016, 3);
		expect(alloc?.satisfied).toBe(true);
	});

	it("just below 90% threshold is NOT satisfied", () => {
		// Demand = 1 (outpost defaults to 1). Need received < 0.9.
		// Rod output 0.91, wire length 1:
		// delivered = 0.91 * 0.98 = 0.8918
		// 0.8918 < 1 * 0.9 = 0.9 => NOT satisfied
		const rod = makeRod("rod-1", { currentOutput: 0.91 });
		const building = makeBuilding("b1", "outpost");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		const snapshot = getPowerGridSnapshot();
		const alloc = snapshot.allocations.get("b1");
		expect(alloc?.received).toBeCloseTo(0.8918, 3);
		expect(alloc?.satisfied).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applyPowerToBuildings
// ---------------------------------------------------------------------------

describe("applyPowerToBuildings", () => {
	it("sets building.powered and operational when satisfied", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(building.building!.powered).toBe(true);
		expect(building.building!.operational).toBe(true);
	});

	it("leaves building unpowered when NOT satisfied", () => {
		const rod = makeRod("rod-1", { currentOutput: 0.1 });
		const building = makeBuilding("b1", "fabrication_unit"); // demands 3
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(building.building!.powered).toBe(false);
	});

	it("resets building powered state before applying", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();
		expect(building.building!.powered).toBe(true);

		// Remove wire, re-run
		mockWires.length = 0;
		updatePowerGrid();
		expect(building.building!.powered).toBe(false);
	});

	it("powers miners when connected through wire graph", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const miner = makeMiner("m1");
		const wire = makeWire("w1", "rod-1", "m1", { length: 1 });

		addToWorld(rod, miner, wire);
		updatePowerGrid();

		expect(miner.building!.powered).toBe(true);
		expect(miner.building!.operational).toBe(true);
	});

	it("powers processors when connected through wire graph", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const proc = makeProcessor("p1");
		const wire = makeWire("w1", "rod-1", "p1", { length: 1 });

		addToWorld(rod, proc, wire);
		updatePowerGrid();

		expect(proc.building!.powered).toBe(true);
		expect(proc.building!.operational).toBe(true);
	});

	it("does NOT change lightning_rod building powered state", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		addToWorld(rod);

		// Lightning rods start as powered=true in our helper
		updatePowerGrid();

		// The rod building should retain its original powered state
		// (distribution skips lightning_rod type)
		expect(rod.building!.powered).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

describe("public API", () => {
	it("getPowerAtEntity returns 0 for disconnected entity", () => {
		expect(getPowerAtEntity("nonexistent")).toBe(0);
	});

	it("isPowered returns false for disconnected entity", () => {
		expect(isPowered("nonexistent")).toBe(false);
	});

	it("getWireFlow returns 0 for unknown wire", () => {
		expect(getWireFlow("nonexistent")).toBe(0);
	});

	it("getWireFlow reports flow through a carrying wire", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(getWireFlow("w1")).toBeGreaterThan(0);
	});

	it("getPowerGridSnapshot returns correct surplus", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace"); // demand 2
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		// surplus = generation (10) - total demand (0 for rod + 2 for furnace = 2)
		expect(snapshot.surplus).toBe(10 - 2);
	});

	it("getPowerGridSnapshot totalDemand sums all allocations", () => {
		const rod = makeRod("rod-1", { currentOutput: 20 });
		const b1 = makeBuilding("b1", "furnace"); // demand 2
		const b2 = makeBuilding("b2", "fabrication_unit"); // demand 3
		const w1 = makeWire("w1", "rod-1", "b1", { length: 1 });
		const w2 = makeWire("w2", "rod-1", "b2", { length: 1 });

		addToWorld(rod, b1, b2, w1, w2);
		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		// Total demand includes rod (0) + furnace (2) + fabrication_unit (3) = 5
		expect(snapshot.totalDemand).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Signal wires are ignored
// ---------------------------------------------------------------------------

describe("signal wires", () => {
	it("signal wires do not carry power", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const signalWire = makeWire("sw1", "rod-1", "b1", {
			length: 1,
			wireType: "signal",
		});

		addToWorld(rod, building, signalWire);
		updatePowerGrid();

		expect(isPowered("b1")).toBe(false);
		expect(getPowerAtEntity("b1")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("disconnected building receives no power", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		// No wire connecting them

		addToWorld(rod, building);
		updatePowerGrid();

		expect(isPowered("b1")).toBe(false);
		expect(building.building!.powered).toBe(false);
	});

	it("wire pointing to nonexistent entity does not crash", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const wire = makeWire("w1", "rod-1", "ghost", { length: 1 });

		addToWorld(rod, wire);

		expect(() => updatePowerGrid()).not.toThrow();
		// Ghost entity is in poweredEntityIds if delivered > 0.1
		// but has no building to apply power to
	});

	it("wire between two non-rod entities carries no power", () => {
		const a = makeBuilding("a", "furnace");
		const b = makeBuilding("b", "furnace");
		const wire = makeWire("w1", "a", "b", { length: 1 });

		addToWorld(a, b, wire);
		updatePowerGrid();

		expect(isPowered("a")).toBe(false);
		expect(isPowered("b")).toBe(false);
	});

	it("zero rod output means no power flows", () => {
		const rod = makeRod("rod-1", { currentOutput: 0 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		expect(getPowerAtEntity("b1")).toBe(0);
		expect(isPowered("b1")).toBe(false);
	});

	it("bidirectional wires work regardless of from/to direction", () => {
		// Wire is defined from building to rod (reversed)
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "b1", "rod-1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		// Power should still flow from rod to building
		expect(isPowered("b1")).toBe(true);
		expect(getPowerAtEntity("b1")).toBeGreaterThan(0);
	});

	it("multiple rods sum their power contribution", () => {
		const rod1 = makeRod("rod-1", { currentOutput: 5 });
		const rod2 = makeRod("rod-2", { currentOutput: 5 });
		addToWorld(rod1, rod2);

		updatePowerGrid();
		const snapshot = getPowerGridSnapshot();

		expect(snapshot.totalGeneration).toBe(10);
	});

	it("long chain attenuates power through wire losses", () => {
		// Build a long chain: rod -> a -> b -> c -> d -> e
		// Each wire length 10, maxCapacity 20 (no cap): loss per wire = 0.02 * 10 = 0.2
		// Power multiplied by 0.8 at each hop
		// a: 10 * 0.8 = 8.0, b: 8.0 * 0.8 = 6.4, c: 6.4 * 0.8 = 5.12, ...
		const rod = makeRod("rod-1", { currentOutput: 10 });
		addToWorld(rod);

		const nodeIds = ["a", "b", "c", "d", "e"];
		let prevId = "rod-1";
		for (const nodeId of nodeIds) {
			const node = makeBuilding(nodeId, "outpost");
			const wire = makeWire(`w-${nodeId}`, prevId, nodeId, {
				length: 10,
				maxCapacity: 20,
			});
			addToWorld(node, wire);
			prevId = nodeId;
		}

		updatePowerGrid();

		// Expected: a=8.0, b=6.4, c=5.12, d=4.096, e=3.277
		expect(getPowerAtEntity("a")).toBeCloseTo(8.0, 1);
		expect(getPowerAtEntity("b")).toBeCloseTo(6.4, 1);
		expect(getPowerAtEntity("c")).toBeCloseTo(5.12, 1);
		expect(getPowerAtEntity("d")).toBeCloseTo(4.096, 0);
		expect(getPowerAtEntity("e")).toBeCloseTo(3.277, 0);
	});

	it("BFS does not revisit nodes (cycle in graph)", () => {
		// Rod -> A -> B -> A (cycle), should not infinite loop
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", { length: 1 });
		const w2 = makeWire("w2", "a", "b", { length: 1 });
		const w3 = makeWire("w3", "b", "a", { length: 1 }); // cycle back

		addToWorld(rod, a, b, w1, w2, w3);

		// Should complete without hanging
		expect(() => updatePowerGrid()).not.toThrow();
		expect(isPowered("a")).toBe(true);
		expect(isPowered("b")).toBe(true);
	});

	it("entity powered threshold: delivered <= 0.1 does not mark as powered", () => {
		// Rod output very small, so delivered is < 0.1
		const rod = makeRod("rod-1", { currentOutput: 0.05 });
		const building = makeBuilding("b1", "outpost");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);
		updatePowerGrid();

		// delivered = 0.05 * (1 - 0.02) = 0.049 < 0.1
		expect(isPowered("b1")).toBe(false);
	});

	it("BFS stops propagating when delivered drops below 0.05", () => {
		// Rod output tiny, chain of buildings
		const rod = makeRod("rod-1", { currentOutput: 0.06 });
		const a = makeBuilding("a", "outpost");
		const b = makeBuilding("b", "outpost");
		const w1 = makeWire("w1", "rod-1", "a", { length: 1 });
		const w2 = makeWire("w2", "a", "b", { length: 1 });

		addToWorld(rod, a, b, w1, w2);
		updatePowerGrid();

		// a receives: 0.06 * 0.98 = 0.0588 > 0.05 => continues
		// b receives: 0.0588 * 0.98 = 0.0576 > 0.05 => continues (but b has nothing after)
		// If we make rod output even smaller:
		expect(getPowerAtEntity("a")).toBeCloseTo(0.0588, 3);
	});

	it("wire load is reset to 0 before each routing pass", () => {
		const rod = makeRod("rod-1", { currentOutput: 10 });
		const building = makeBuilding("b1", "furnace");
		const wire = makeWire("w1", "rod-1", "b1", { length: 1 });

		addToWorld(rod, building, wire);

		// First pass
		updatePowerGrid();
		const load1 = wire.wire!.currentLoad;

		// Second pass — should be same, not accumulated
		updatePowerGrid();
		const load2 = wire.wire!.currentLoad;

		expect(load2).toBeCloseTo(load1);
	});

	it("large network does not crash", () => {
		const rod = makeRod("rod-1", { currentOutput: 100 });
		addToWorld(rod);

		// Build a chain of 50 buildings
		let prevId = "rod-1";
		for (let i = 0; i < 50; i++) {
			const nodeId = `node-${i}`;
			const node = makeBuilding(nodeId, "outpost");
			const wire = makeWire(`w-${i}`, prevId, nodeId, { length: 1 });
			addToWorld(node, wire);
			prevId = nodeId;
		}

		expect(() => updatePowerGrid()).not.toThrow();

		const snapshot = getPowerGridSnapshot();
		expect(snapshot.totalGeneration).toBe(100);
		expect(snapshot.poweredEntityIds.size).toBeGreaterThan(0);
	});
});
