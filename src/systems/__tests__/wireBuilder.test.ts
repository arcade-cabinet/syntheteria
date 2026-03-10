/**
 * Unit tests for the wire builder system.
 *
 * Tests cover:
 * - hasWirePort — which entities can have wire connections
 * - canConnect — validation logic for wire endpoints
 * - createWire / deleteWire / getWiresForEntity — CRUD operations
 * - Build mode state machine — start, setSource, preview, confirm, cancel
 * - Wire preview (ghost wire) updates
 * - Edge cases: self-connect, duplicate wires, missing entities, max length
 */

import type { Entity } from "../../ecs/types";
import { world } from "../../ecs/world";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const addedEntities: Entity[] = [];

function addEntity(partial: Partial<Entity>): Entity {
	const entity = world.add(partial as Entity);
	addedEntities.push(entity);
	return entity;
}

function makeBuilding(
	id: string,
	type: string,
	x = 0,
	z = 0,
): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type,
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
	});
}

function makeSignalRelay(id: string, x = 0, z = 0): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		signalRelay: {
			signalRange: 20,
			connectedTo: [],
			signalStrength: 0.8,
		},
	});
}

function makeMiner(id: string, x = 0, z = 0): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type: "miner",
			powered: false,
			operational: true,
			selected: false,
			components: [],
		},
		miner: {
			resourceType: "scrap_metal",
			extractionRate: 1,
			outputBeltId: null,
			drillHealth: 1,
			active: true,
		},
	});
}

function makeProcessor(id: string, x = 0, z = 0): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type: "smelter",
			powered: false,
			operational: true,
			selected: false,
			components: [],
		},
		processor: {
			processorType: "smelter",
			recipe: null,
			inputBeltId: null,
			outputBeltId: null,
			progress: 0,
			speed: 5,
			active: true,
		},
	});
}

function makeGenericEntity(id: string, x = 0, z = 0): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
	});
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	cancelWireBuild();
});

afterEach(() => {
	cancelWireBuild();
	for (const e of addedEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	addedEntities.length = 0;
});

// Import after entity helpers are defined
import {
	cancelWireBuild,
	canConnect,
	confirmWirePlacement,
	createWire,
	deleteWire,
	getWireBuildMode,
	getWirePreview,
	getWireSource,
	getWiresForEntity,
	hasWirePort,
	setWireSource,
	startWireBuild,
	updateWirePreview,
	updateWirePreviewPosition,
} from "../wireBuilder";

// ---------------------------------------------------------------------------
// hasWirePort
// ---------------------------------------------------------------------------

describe("hasWirePort", () => {
	it("returns true for lightning_rod building", () => {
		const rod = makeBuilding("rod-1", "lightning_rod");
		expect(hasWirePort(rod)).toBe(true);
	});

	it("returns true for fabrication_unit building", () => {
		const fab = makeBuilding("fab-1", "fabrication_unit");
		expect(hasWirePort(fab)).toBe(true);
	});

	it("returns true for miner", () => {
		const miner = makeMiner("miner-1");
		expect(hasWirePort(miner)).toBe(true);
	});

	it("returns true for processor", () => {
		const proc = makeProcessor("proc-1");
		expect(hasWirePort(proc)).toBe(true);
	});

	it("returns true for signal relay", () => {
		const relay = makeSignalRelay("relay-1");
		expect(hasWirePort(relay)).toBe(true);
	});

	it("returns true for smelter building type", () => {
		const smelter = makeBuilding("smelter-1", "smelter");
		expect(hasWirePort(smelter)).toBe(true);
	});

	it("returns true for furnace building type", () => {
		const furnace = makeBuilding("furnace-1", "furnace");
		expect(hasWirePort(furnace)).toBe(true);
	});

	it("returns true for outpost building type", () => {
		const outpost = makeBuilding("outpost-1", "outpost");
		expect(hasWirePort(outpost)).toBe(true);
	});

	it("returns false for generic entity with no wire port", () => {
		const entity = makeGenericEntity("generic-1");
		expect(hasWirePort(entity)).toBe(false);
	});

	it("returns false for unknown building type", () => {
		const entity = makeBuilding("unknown-1", "decorative_plant");
		expect(hasWirePort(entity)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canConnect
// ---------------------------------------------------------------------------

describe("canConnect", () => {
	it("returns valid for two connectable entities", () => {
		const rod = makeBuilding("rod-c1", "lightning_rod", 0, 0);
		const fab = makeBuilding("fab-c1", "fabrication_unit", 5, 0);

		const result = canConnect(rod, fab);
		expect(result.valid).toBe(true);
		expect(result.reason).toBeNull();
	});

	it("returns invalid for same entity", () => {
		const rod = makeBuilding("rod-self", "lightning_rod");

		const result = canConnect(rod, rod);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("Cannot connect entity to itself");
	});

	it("returns invalid when entity A has no wire port", () => {
		const generic = makeGenericEntity("generic-a");
		const rod = makeBuilding("rod-noport", "lightning_rod");

		const result = canConnect(generic, rod);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("has no wire port");
	});

	it("returns invalid when entity B has no wire port", () => {
		const rod = makeBuilding("rod-bport", "lightning_rod");
		const generic = makeGenericEntity("generic-b");

		const result = canConnect(rod, generic);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("has no wire port");
	});

	it("returns invalid when entity has no worldPosition", () => {
		const entityNoPos = addEntity({
			id: "nopos-1",
			faction: "player",
			building: {
				type: "lightning_rod",
				powered: true,
				operational: true,
				selected: false,
				components: [],
			},
		});
		const rod = makeBuilding("rod-pos", "lightning_rod", 5, 0);

		const result = canConnect(entityNoPos, rod);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("Entity missing world position");
	});

	it("returns invalid when entities are too far apart", () => {
		// maxLength = config.power.wireMaxCapacity * 5 = 5 * 5 = 25
		const rod = makeBuilding("rod-far1", "lightning_rod", 0, 0);
		const fab = makeBuilding("fab-far1", "fabrication_unit", 30, 0);

		const result = canConnect(rod, fab);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("Too far apart");
	});

	it("returns valid when distance is within max length", () => {
		const rod = makeBuilding("rod-near1", "lightning_rod", 0, 0);
		const fab = makeBuilding("fab-near1", "fabrication_unit", 20, 0);

		const result = canConnect(rod, fab);
		expect(result.valid).toBe(true);
	});

	it("returns invalid for duplicate wire", () => {
		const rod = makeBuilding("rod-dup1", "lightning_rod", 0, 0);
		const fab = makeBuilding("fab-dup1", "fabrication_unit", 5, 0);

		// Create a wire between them
		createWire("rod-dup1", "fab-dup1");

		const result = canConnect(rod, fab);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("Wire already exists between these entities");
	});

	it("detects duplicate wire in reverse direction", () => {
		const rod = makeBuilding("rod-rev1", "lightning_rod", 0, 0);
		const fab = makeBuilding("fab-rev1", "fabrication_unit", 5, 0);

		createWire("fab-rev1", "rod-rev1");

		// Check in opposite direction
		const result = canConnect(rod, fab);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("Wire already exists between these entities");
	});
});

// ---------------------------------------------------------------------------
// createWire / deleteWire / getWiresForEntity
// ---------------------------------------------------------------------------

describe("createWire", () => {
	it("creates a power wire between valid entities", () => {
		makeBuilding("rod-cw1", "lightning_rod", 0, 0);
		makeBuilding("fab-cw1", "fabrication_unit", 5, 0);

		const wire = createWire("rod-cw1", "fab-cw1", "power");

		expect(wire).not.toBeNull();
		expect(wire!.wire!.wireType).toBe("power");
		expect(wire!.wire!.fromEntityId).toBe("rod-cw1");
		expect(wire!.wire!.toEntityId).toBe("fab-cw1");
		addedEntities.push(wire!);
	});

	it("creates a signal wire", () => {
		makeSignalRelay("relay-cw1", 0, 0);
		makeSignalRelay("relay-cw2", 5, 0);

		const wire = createWire("relay-cw1", "relay-cw2", "signal");

		expect(wire).not.toBeNull();
		expect(wire!.wire!.wireType).toBe("signal");
		addedEntities.push(wire!);
	});

	it("defaults to power wire type", () => {
		makeBuilding("rod-def", "lightning_rod", 0, 0);
		makeBuilding("fab-def", "fabrication_unit", 5, 0);

		const wire = createWire("rod-def", "fab-def");

		expect(wire).not.toBeNull();
		expect(wire!.wire!.wireType).toBe("power");
		addedEntities.push(wire!);
	});

	it("returns null for nonexistent source", () => {
		makeBuilding("fab-noexist", "fabrication_unit", 5, 0);

		const wire = createWire("nonexistent", "fab-noexist");
		expect(wire).toBeNull();
	});

	it("returns null for nonexistent target", () => {
		makeBuilding("rod-noexist", "lightning_rod", 0, 0);

		const wire = createWire("rod-noexist", "nonexistent");
		expect(wire).toBeNull();
	});

	it("returns null when canConnect fails", () => {
		makeBuilding("rod-fail", "lightning_rod", 0, 0);

		const wire = createWire("rod-fail", "rod-fail"); // self-connect
		expect(wire).toBeNull();
	});
});

describe("deleteWire", () => {
	it("removes a wire entity from the world", () => {
		makeBuilding("rod-dw1", "lightning_rod", 0, 0);
		makeBuilding("fab-dw1", "fabrication_unit", 5, 0);

		const wire = createWire("rod-dw1", "fab-dw1")!;
		const wireId = wire.id;

		deleteWire(wireId);

		const wires = getWiresForEntity("rod-dw1");
		expect(wires).toHaveLength(0);
	});

	it("does not crash when deleting nonexistent wire", () => {
		expect(() => deleteWire("nonexistent-wire")).not.toThrow();
	});
});

describe("getWiresForEntity", () => {
	it("returns all wires connected to an entity", () => {
		makeBuilding("rod-gw1", "lightning_rod", 0, 0);
		makeBuilding("fab-gw1", "fabrication_unit", 5, 0);
		makeBuilding("fab-gw2", "fabrication_unit", -5, 0);

		const wire1 = createWire("rod-gw1", "fab-gw1")!;
		const wire2 = createWire("rod-gw1", "fab-gw2")!;
		addedEntities.push(wire1, wire2);

		const wires = getWiresForEntity("rod-gw1");
		expect(wires).toHaveLength(2);
	});

	it("returns wires where entity is the target", () => {
		makeBuilding("rod-gw3", "lightning_rod", 0, 0);
		makeBuilding("fab-gw3", "fabrication_unit", 5, 0);

		const wire = createWire("rod-gw3", "fab-gw3")!;
		addedEntities.push(wire);

		const wires = getWiresForEntity("fab-gw3");
		expect(wires).toHaveLength(1);
	});

	it("returns empty array for entity with no wires", () => {
		makeBuilding("lonely", "lightning_rod", 0, 0);
		expect(getWiresForEntity("lonely")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Build mode state machine
// ---------------------------------------------------------------------------

describe("wire build mode", () => {
	it("starts with null build mode", () => {
		expect(getWireBuildMode()).toBeNull();
	});

	it("startWireBuild activates build mode", () => {
		startWireBuild("power");
		expect(getWireBuildMode()).toBe("power");
	});

	it("startWireBuild defaults to power", () => {
		startWireBuild();
		expect(getWireBuildMode()).toBe("power");
	});

	it("startWireBuild resets source and preview", () => {
		makeBuilding("rod-bm", "lightning_rod", 0, 0);
		startWireBuild("power");
		setWireSource("rod-bm");

		startWireBuild("signal");

		expect(getWireSource()).toBeNull();
		expect(getWirePreview()).toBeNull();
		expect(getWireBuildMode()).toBe("signal");
	});

	it("cancelWireBuild resets everything", () => {
		startWireBuild("power");
		makeBuilding("rod-cancel", "lightning_rod", 0, 0);
		setWireSource("rod-cancel");

		cancelWireBuild();

		expect(getWireBuildMode()).toBeNull();
		expect(getWireSource()).toBeNull();
		expect(getWirePreview()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// setWireSource
// ---------------------------------------------------------------------------

describe("setWireSource", () => {
	it("returns true and sets source for valid entity", () => {
		startWireBuild("power");
		makeBuilding("rod-src", "lightning_rod", 0, 0);

		const result = setWireSource("rod-src");
		expect(result).toBe(true);
		expect(getWireSource()).toBe("rod-src");
	});

	it("returns false when not in build mode", () => {
		makeBuilding("rod-nomode", "lightning_rod", 0, 0);

		const result = setWireSource("rod-nomode");
		expect(result).toBe(false);
	});

	it("returns false for entity without wire port", () => {
		startWireBuild("power");
		makeGenericEntity("generic-src");

		const result = setWireSource("generic-src");
		expect(result).toBe(false);
	});

	it("returns false for nonexistent entity", () => {
		startWireBuild("power");

		const result = setWireSource("nonexistent");
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Wire preview
// ---------------------------------------------------------------------------

describe("wire preview", () => {
	it("shows valid preview between two connectable entities", () => {
		makeBuilding("rod-pv", "lightning_rod", 0, 0);
		makeBuilding("fab-pv", "fabrication_unit", 5, 0);

		startWireBuild("power");
		setWireSource("rod-pv");
		updateWirePreview("fab-pv");

		const preview = getWirePreview();
		expect(preview).not.toBeNull();
		expect(preview!.valid).toBe(true);
		expect(preview!.wireType).toBe("power");
		expect(preview!.invalidReason).toBeNull();
		expect(preview!.length).toBeCloseTo(5);
	});

	it("shows invalid preview for self-connect", () => {
		makeBuilding("rod-pvself", "lightning_rod", 0, 0);

		startWireBuild("power");
		setWireSource("rod-pvself");
		updateWirePreview("rod-pvself");

		const preview = getWirePreview();
		expect(preview).not.toBeNull();
		expect(preview!.valid).toBe(false);
		expect(preview!.invalidReason).toBe("Cannot connect entity to itself");
	});

	it("returns null when not in build mode", () => {
		makeBuilding("rod-nobm", "lightning_rod", 0, 0);
		updateWirePreview("rod-nobm");

		expect(getWirePreview()).toBeNull();
	});

	it("returns null when no source set", () => {
		startWireBuild("power");
		makeBuilding("rod-nosrc", "lightning_rod", 0, 0);
		updateWirePreview("rod-nosrc");

		expect(getWirePreview()).toBeNull();
	});

	it("shows invalid preview for free position (no target entity)", () => {
		makeBuilding("rod-freepos", "lightning_rod", 0, 0);

		startWireBuild("power");
		setWireSource("rod-freepos");
		updateWirePreviewPosition({ x: 10, y: 0, z: 0 });

		const preview = getWirePreview();
		expect(preview).not.toBeNull();
		expect(preview!.valid).toBe(false);
		expect(preview!.invalidReason).toBe("No target entity");
		expect(preview!.length).toBeCloseTo(10);
	});

	it("updateWirePreviewPosition returns null when no source", () => {
		startWireBuild("power");
		updateWirePreviewPosition({ x: 10, y: 0, z: 0 });

		expect(getWirePreview()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// confirmWirePlacement
// ---------------------------------------------------------------------------

describe("confirmWirePlacement", () => {
	it("creates wire and returns true for valid placement", () => {
		makeBuilding("rod-conf", "lightning_rod", 0, 0);
		makeBuilding("fab-conf", "fabrication_unit", 5, 0);

		startWireBuild("power");
		setWireSource("rod-conf");

		const result = confirmWirePlacement("fab-conf");
		expect(result).toBe(true);

		// Wire should exist
		const wires = getWiresForEntity("rod-conf");
		expect(wires.length).toBeGreaterThan(0);
		// Track for cleanup
		for (const w of wires) addedEntities.push(w);
	});

	it("resets source but keeps build mode after successful placement", () => {
		makeBuilding("rod-chain", "lightning_rod", 0, 0);
		makeBuilding("fab-chain", "fabrication_unit", 5, 0);

		startWireBuild("power");
		setWireSource("rod-chain");
		confirmWirePlacement("fab-chain");

		expect(getWireSource()).toBeNull();
		expect(getWirePreview()).toBeNull();
		expect(getWireBuildMode()).toBe("power"); // build mode stays for chaining

		// Cleanup
		const wires = getWiresForEntity("rod-chain");
		for (const w of wires) addedEntities.push(w);
	});

	it("returns false when not in build mode", () => {
		makeBuilding("rod-nobm2", "lightning_rod", 0, 0);
		makeBuilding("fab-nobm2", "fabrication_unit", 5, 0);

		expect(confirmWirePlacement("fab-nobm2")).toBe(false);
	});

	it("returns false when no source set", () => {
		startWireBuild("power");
		makeBuilding("fab-nosrc2", "fabrication_unit", 5, 0);

		expect(confirmWirePlacement("fab-nosrc2")).toBe(false);
	});

	it("returns false when validation fails", () => {
		makeBuilding("rod-valfail", "lightning_rod", 0, 0);
		makeGenericEntity("generic-valfail"); // no wire port

		startWireBuild("power");
		setWireSource("rod-valfail");

		expect(confirmWirePlacement("generic-valfail")).toBe(false);
	});
});
