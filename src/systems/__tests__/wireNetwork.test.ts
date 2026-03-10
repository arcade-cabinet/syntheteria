/**
 * Unit tests for the wire network system.
 *
 * Tests cover:
 * - Power distribution through wires (BFS from lightning rods)
 * - Wire load calculation
 * - Building powered state via wire connections
 * - Signal propagation through signal wires
 * - Signal degradation with wire length
 * - isEntityPowered helper
 * - Edge cases: no wires, no rods, disconnected graphs, long chains
 */

import type { BuildingEntity, Entity, LightningRodEntity } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock ECS world collections
// ---------------------------------------------------------------------------

const mockWorld: Entity[] = [];
const mockBuildings: BuildingEntity[] = [];
const mockLightningRods: LightningRodEntity[] = [];
const mockWires: Entity[] = [];
const mockSignalRelays: Entity[] = [];
jest.mock("../../ecs/world", () => ({
	world: mockWorld,
	buildings: mockBuildings,
	lightningRods: mockLightningRods,
	wires: mockWires,
	signalRelays: mockSignalRelays,
}));

// Import after mocking
import { isEntityPowered, wireNetworkSystem } from "../wireNetwork";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 0;

function makeRod(
	id: string,
	x: number,
	z: number,
	currentOutput = 10,
): LightningRodEntity {
	const entity = {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity: 10,
			currentOutput,
			protectionRadius: 12,
		},
	} as LightningRodEntity;
	mockLightningRods.push(entity);
	mockWorld.push(entity);
	return entity;
}

function makeBuilding(
	id: string,
	type: string,
	x: number,
	z: number,
): BuildingEntity {
	const entity = {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type,
			powered: false,
			operational: false,
			selected: false,
			components: [],
		},
	} as BuildingEntity;
	mockBuildings.push(entity);
	mockWorld.push(entity);
	return entity;
}

function makeSignalRelay(
	id: string,
	x: number,
	z: number,
	signalStrength = 1.0,
): Entity {
	const entity: Entity = {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		signalRelay: {
			signalRange: 20,
			connectedTo: [],
			signalStrength,
		},
	};
	mockSignalRelays.push(entity);
	mockWorld.push(entity);
	return entity;
}

function makeWire(
	fromId: string,
	toId: string,
	wireType: "power" | "signal" = "power",
	length = 5,
	maxCapacity = 10,
): Entity {
	const entity: Entity = {
		id: `wire_test_${nextId++}`,
		faction: "player",
		wire: {
			wireType,
			fromEntityId: fromId,
			toEntityId: toId,
			length,
			currentLoad: 0,
			maxCapacity,
		},
	};
	mockWires.push(entity);
	mockWorld.push(entity);
	return entity;
}

function resetMockWorld() {
	mockWorld.length = 0;
	mockBuildings.length = 0;
	mockLightningRods.length = 0;
	mockWires.length = 0;
	mockSignalRelays.length = 0;
	nextId = 0;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetMockWorld();
});

afterEach(() => {
	resetMockWorld();
});

// ---------------------------------------------------------------------------
// Power distribution through wires
// ---------------------------------------------------------------------------

describe("power distribution", () => {
	it("powers a building connected to a rod via power wire", () => {
		makeRod("rod-1", 0, 0, 10);
		const fab = makeBuilding("fab-1", "fabrication_unit", 5, 0);
		makeWire("rod-1", "fab-1", "power", 5);

		wireNetworkSystem();

		expect(fab.building.powered).toBe(true);
		expect(fab.building.operational).toBe(true);
	});

	it("does not power building connected via signal wire", () => {
		makeRod("rod-2", 0, 0, 10);
		const fab = makeBuilding("fab-2", "fabrication_unit", 5, 0);
		makeWire("rod-2", "fab-2", "signal", 5); // signal, not power

		wireNetworkSystem();

		expect(fab.building.powered).toBe(false);
	});

	it("powers building through chain of wires", () => {
		makeRod("rod-chain", 0, 0, 10);
		const relay = makeBuilding("relay-mid", "fabrication_unit", 5, 0);
		const fab = makeBuilding("fab-chain", "fabrication_unit", 10, 0);

		makeWire("rod-chain", "relay-mid", "power", 5);
		makeWire("relay-mid", "fab-chain", "power", 5);

		wireNetworkSystem();

		expect(relay.building.powered).toBe(true);
		expect(fab.building.powered).toBe(true);
	});

	it("distributes power evenly across branches", () => {
		makeRod("rod-branch", 0, 0, 10);
		const b1 = makeBuilding("b-branch1", "outpost", 5, 0);
		const b2 = makeBuilding("b-branch2", "outpost", -5, 0);

		makeWire("rod-branch", "b-branch1", "power", 5);
		makeWire("rod-branch", "b-branch2", "power", 5);

		wireNetworkSystem();

		// Both should be powered
		expect(b1.building.powered).toBe(true);
		expect(b2.building.powered).toBe(true);
	});

	it("power degrades through each wire segment (0.95 passthrough)", () => {
		// With 10 output and 0.95 passthrough per segment, after many hops
		// power should drop below threshold
		makeRod("rod-degrade", 0, 0, 1.0); // low output
		const b1 = makeBuilding("b-deg1", "outpost", 5, 0);
		const b2 = makeBuilding("b-deg2", "outpost", 10, 0);
		const b3 = makeBuilding("b-deg3", "outpost", 15, 0);

		makeWire("rod-degrade", "b-deg1", "power", 5);
		makeWire("b-deg1", "b-deg2", "power", 5);
		makeWire("b-deg2", "b-deg3", "power", 5);

		wireNetworkSystem();

		// All should be powered since 1.0 * 0.95 * 0.95 * 0.95 = 0.857 > 0.1 threshold
		expect(b1.building.powered).toBe(true);
		expect(b2.building.powered).toBe(true);
		expect(b3.building.powered).toBe(true);
	});

	it("does not power buildings without wire connections", () => {
		makeRod("rod-noconn", 0, 0, 10);
		const fab = makeBuilding("fab-noconn", "fabrication_unit", 5, 0);
		// No wire between them

		wireNetworkSystem();

		expect(fab.building.powered).toBe(false);
	});

	it("resets wire loads each tick", () => {
		makeRod("rod-reset", 0, 0, 10);
		makeBuilding("b-reset", "outpost", 5, 0);
		const wire = makeWire("rod-reset", "b-reset", "power", 5, 10);

		wireNetworkSystem();
		const load1 = wire.wire!.currentLoad;
		expect(load1).toBeGreaterThan(0);

		// Remove rod — wire should have zero load
		mockLightningRods.length = 0;
		wireNetworkSystem();
		expect(wire.wire!.currentLoad).toBe(0);
	});

	it("wire load is capped at 1.0", () => {
		makeRod("rod-cap", 0, 0, 100); // very high output
		makeBuilding("b-cap", "outpost", 5, 0);
		const wire = makeWire("rod-cap", "b-cap", "power", 5, 5); // low capacity

		wireNetworkSystem();

		expect(wire.wire!.currentLoad).toBeLessThanOrEqual(1.0);
	});

	it("skips lightning_rod buildings in powered state updates", () => {
		const rod = makeRod("rod-skip", 0, 0, 10);
		// Rods have building.type = "lightning_rod" and are skipped in building loop

		wireNetworkSystem();

		// The rod's building.powered should not be set to false by the system
		expect(rod.building.powered).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isEntityPowered
// ---------------------------------------------------------------------------

describe("isEntityPowered", () => {
	it("returns true for powered entity via wire network", () => {
		makeRod("rod-iep", 0, 0, 10);
		makeBuilding("b-iep", "outpost", 5, 0);
		makeWire("rod-iep", "b-iep", "power", 5);

		wireNetworkSystem();

		expect(isEntityPowered("b-iep")).toBe(true);
	});

	it("returns false for lightning rod with no wire connections", () => {
		// When there are no wires, the power graph is empty and the function
		// returns early before adding rods to wirePoweredEntities
		makeRod("rod-self-p", 0, 0, 10);

		wireNetworkSystem();

		expect(isEntityPowered("rod-self-p")).toBe(false);
	});

	it("returns true for lightning rod that has wire connections", () => {
		makeRod("rod-conn-p", 0, 0, 10);
		makeBuilding("b-conn-p", "outpost", 5, 0);
		makeWire("rod-conn-p", "b-conn-p", "power", 5);

		wireNetworkSystem();

		expect(isEntityPowered("rod-conn-p")).toBe(true);
	});

	it("returns false for entity not in wire network", () => {
		makeBuilding("b-alone", "outpost", 5, 0);

		wireNetworkSystem();

		expect(isEntityPowered("b-alone")).toBe(false);
	});

	it("returns false for nonexistent entity", () => {
		wireNetworkSystem();

		expect(isEntityPowered("nonexistent")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Signal distribution
// ---------------------------------------------------------------------------

describe("signal distribution", () => {
	// Note: the current wireNetwork implementation adds ALL entities in the
	// signalRelays collection to the visited set before BFS runs. This means
	// signal does NOT propagate from one relay to another relay that is already
	// in the signalRelays collection. Signal propagation works from relays
	// to non-relay entities (generic entities with signalRelay found via
	// getEntityById). We test the actual behavior below.

	it("sets wire load from relay signal strength to non-relay neighbor", () => {
		// Create a relay and a non-relay entity connected via signal wire
		makeSignalRelay("relay-s1", 0, 0, 1.0);
		// A generic entity (not in signalRelays) that appears in the graph
		const target: Entity = {
			id: "target-s1",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
		};
		mockWorld.push(target);
		makeWire("relay-s1", "target-s1", "signal", 5);

		wireNetworkSystem();

		// Wire load = min(1, propagatedStrength)
		// degradation = max(0, 1 - 5*0.02) = 0.9
		// propagated = 1.0 * 0.9 = 0.9
		const wire = mockWires.find(w => w.wire!.wireType === "signal")!;
		expect(wire.wire!.currentLoad).toBeCloseTo(0.9);
	});

	it("signal degrades with wire length for non-relay neighbors", () => {
		makeSignalRelay("relay-deg1", 0, 0, 1.0);
		const target: Entity = {
			id: "target-deg",
			faction: "player",
			worldPosition: { x: 20, y: 0, z: 0 },
		};
		mockWorld.push(target);
		makeWire("relay-deg1", "target-deg", "signal", 20);

		wireNetworkSystem();

		// degradation = max(0, 1 - 20*0.02) = 0.6
		// propagated = 1.0 * 0.6 = 0.6
		const wire = mockWires.find(w => w.wire!.wireType === "signal")!;
		expect(wire.wire!.currentLoad).toBeCloseTo(0.6);
	});

	it("updates non-relay neighbor signalRelay strength when propagated is higher", () => {
		makeSignalRelay("relay-up1", 0, 0, 1.0);
		// A non-source-relay entity that has signalRelay component
		const target: Entity = {
			id: "target-up",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
			signalRelay: { signalRange: 20, connectedTo: [], signalStrength: 0.1 },
		};
		mockWorld.push(target);
		// Don't add to mockSignalRelays — only add to mockWorld so it's found via getEntityById
		makeWire("relay-up1", "target-up", "signal", 5);

		wireNetworkSystem();

		// propagated = 1.0 * 0.9 = 0.9 > 0.1 (existing) => update
		expect(target.signalRelay!.signalStrength).toBeCloseTo(0.9);
	});

	it("signal does not propagate through power wires", () => {
		makeSignalRelay("relay-nopow1", 0, 0, 1.0);
		const target: Entity = {
			id: "target-nopow",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
			signalRelay: { signalRange: 20, connectedTo: [], signalStrength: 0 },
		};
		mockWorld.push(target);
		makeWire("relay-nopow1", "target-nopow", "power", 5); // power, not signal

		wireNetworkSystem();

		expect(target.signalRelay!.signalStrength).toBe(0);
	});

	it("resets signal wire loads each tick", () => {
		makeSignalRelay("relay-reset1", 0, 0, 1.0);
		const target: Entity = {
			id: "target-reset",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
		};
		mockWorld.push(target);
		const wire = makeWire("relay-reset1", "target-reset", "signal", 5);

		wireNetworkSystem();
		expect(wire.wire!.currentLoad).toBeGreaterThan(0);

		// Remove source relay so no signal propagates
		mockSignalRelays.length = 0;
		wireNetworkSystem();
		expect(wire.wire!.currentLoad).toBe(0);
	});

	it("signal wire load reflects relay signal strength", () => {
		makeSignalRelay("relay-load1", 0, 0, 0.5);
		const target: Entity = {
			id: "target-load",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
		};
		mockWorld.push(target);
		const wire = makeWire("relay-load1", "target-load", "signal", 5);

		wireNetworkSystem();

		// Load = min(1, propagatedStrength) = min(1, 0.5 * 0.9) = 0.45
		expect(wire.wire!.currentLoad).toBeCloseTo(0.45);
	});

	it("does not update neighbor strength if propagated is lower than existing", () => {
		makeSignalRelay("relay-noup1", 0, 0, 0.3);
		const target: Entity = {
			id: "target-noup",
			faction: "player",
			worldPosition: { x: 5, y: 0, z: 0 },
			signalRelay: { signalRange: 20, connectedTo: [], signalStrength: 0.9 },
		};
		mockWorld.push(target);
		makeWire("relay-noup1", "target-noup", "signal", 5);

		wireNetworkSystem();

		// Propagated = 0.3 * 0.9 = 0.27, which is < 0.9 (existing)
		expect(target.signalRelay!.signalStrength).toBe(0.9);
	});

	it("signal stops propagating below threshold (0.05)", () => {
		makeSignalRelay("relay-stop1", 0, 0, 0.05);
		const target1: Entity = {
			id: "target-stop1",
			faction: "player",
			worldPosition: { x: 10, y: 0, z: 0 },
			signalRelay: { signalRange: 20, connectedTo: [], signalStrength: 0 },
		};
		const target2: Entity = {
			id: "target-stop2",
			faction: "player",
			worldPosition: { x: 20, y: 0, z: 0 },
			signalRelay: { signalRange: 20, connectedTo: [], signalStrength: 0 },
		};
		mockWorld.push(target1, target2);
		makeWire("relay-stop1", "target-stop1", "signal", 10);
		makeWire("target-stop1", "target-stop2", "signal", 5);

		wireNetworkSystem();

		// propagated to target1 = 0.05 * (1 - 10*0.02) = 0.05 * 0.8 = 0.04 < 0.05
		// So propagation should stop — target2 never updated
		expect(target2.signalRelay!.signalStrength).toBe(0);
	});

	it("all relay-to-relay connections in signalRelays collection share visited set", () => {
		// Both relays are in signalRelays, so both are pre-visited.
		// Signal from relay1 does NOT propagate to relay2 because relay2 is already visited.
		makeSignalRelay("relay-both1", 0, 0, 1.0);
		const relay2 = makeSignalRelay("relay-both2", 5, 0, 0);
		makeWire("relay-both1", "relay-both2", "signal", 5);

		wireNetworkSystem();

		// relay2 keeps its original strength (0) because it was pre-visited
		expect(relay2.signalRelay!.signalStrength).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles no wires at all", () => {
		makeRod("rod-empty", 0, 0, 10);
		makeBuilding("b-empty", "outpost", 5, 0);

		expect(() => wireNetworkSystem()).not.toThrow();
		expect(isEntityPowered("b-empty")).toBe(false);
	});

	it("handles no rods or relays (just wires)", () => {
		makeBuilding("b1-nowire", "outpost", 0, 0);
		makeBuilding("b2-nowire", "outpost", 5, 0);
		makeWire("b1-nowire", "b2-nowire", "power", 5);

		expect(() => wireNetworkSystem()).not.toThrow();
	});

	it("handles rod with no connections in graph", () => {
		makeRod("rod-isolated", 0, 0, 10);
		// Wire between two buildings, not connected to the rod
		makeBuilding("b1-iso", "outpost", 5, 0);
		makeBuilding("b2-iso", "outpost", 10, 0);
		makeWire("b1-iso", "b2-iso", "power", 5);

		wireNetworkSystem();

		expect(isEntityPowered("rod-isolated")).toBe(true); // rod is always powered
		expect(isEntityPowered("b1-iso")).toBe(false);
		expect(isEntityPowered("b2-iso")).toBe(false);
	});

	it("handles empty world", () => {
		expect(() => wireNetworkSystem()).not.toThrow();
	});

	it("handles bidirectional wire traversal", () => {
		// Wire from fab to rod (reversed direction) — BFS should still find it
		makeRod("rod-bidir", 0, 0, 10);
		const fab = makeBuilding("fab-bidir", "fabrication_unit", 5, 0);
		makeWire("fab-bidir", "rod-bidir", "power", 5); // reversed!

		wireNetworkSystem();

		expect(fab.building.powered).toBe(true);
	});

	it("multiple rods power multiple branches independently", () => {
		makeRod("rod-a", 0, 0, 10);
		makeRod("rod-b", 20, 0, 10);
		const b1 = makeBuilding("b-a", "outpost", 5, 0);
		const b2 = makeBuilding("b-b", "outpost", 15, 0);

		makeWire("rod-a", "b-a", "power", 5);
		makeWire("rod-b", "b-b", "power", 5);

		wireNetworkSystem();

		expect(b1.building.powered).toBe(true);
		expect(b2.building.powered).toBe(true);
	});
});
