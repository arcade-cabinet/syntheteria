/**
 * Compute system tests.
 *
 * Verifies: base capacity, server rack contributions, unit demand,
 * vulnerability calculation, power dependency.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	BASE_COMPUTE,
	COMPUTE_PER_EXTRA_COMPONENT,
	COMPUTE_PER_SERVER_RACK,
	COMPUTE_PER_UNIT,
	computeSystem,
	getComputeSnapshot,
	getUnitComputeDemand,
	resetCompute,
} from "../compute";

const entities: Entity[] = [];

function spawnPlayerUnit(
	id: string,
	opts: {
		components?: {
			name: string;
			functional: boolean;
			material: "metal" | "plastic" | "electronic";
		}[];
	} = {},
): Entity {
	const {
		components = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
		],
	} = opts;
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 0, y: 0, z: 0 }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents(components),
		}),
	);
	entities.push(e);
	return e;
}

function spawnServerRack(id: string, powered: boolean): Entity {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 0, y: 0, z: 0 }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		BuildingTrait({
			buildingType: "server_rack",
			powered,
			operational: powered,
			selected: false,
			buildingComponentsJson: "[]",
		}),
	);
	entities.push(e);
	return e;
}

function spawnEnemyUnit(id: string): Entity {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 10, y: 0, z: 10 }),
		Faction({ value: "feral" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			]),
		}),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	resetCompute();
});

// ---------------------------------------------------------------------------
// Base capacity (no server racks)
// ---------------------------------------------------------------------------

describe("base compute capacity", () => {
	it("starts with BASE_COMPUTE capacity when no server racks", () => {
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.capacity).toBe(BASE_COMPUTE);
		expect(snap.serverRackCount).toBe(0);
	});

	it("available equals capacity when no units", () => {
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.available).toBe(BASE_COMPUTE);
		expect(snap.demand).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Server rack contributions
// ---------------------------------------------------------------------------

describe("server rack contributions", () => {
	it("powered server rack adds to capacity", () => {
		spawnServerRack("rack1", true);
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.capacity).toBe(BASE_COMPUTE + COMPUTE_PER_SERVER_RACK);
		expect(snap.serverRackCount).toBe(1);
	});

	it("unpowered server rack does not add to capacity", () => {
		spawnServerRack("rack1", false);
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.capacity).toBe(BASE_COMPUTE);
		expect(snap.serverRackCount).toBe(0);
	});

	it("multiple powered racks stack", () => {
		spawnServerRack("rack1", true);
		spawnServerRack("rack2", true);
		spawnServerRack("rack3", true);
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.capacity).toBe(BASE_COMPUTE + 3 * COMPUTE_PER_SERVER_RACK);
		expect(snap.serverRackCount).toBe(3);
	});

	it("mixed powered/unpowered racks counted correctly", () => {
		spawnServerRack("rack1", true);
		spawnServerRack("rack2", false);
		spawnServerRack("rack3", true);
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.capacity).toBe(BASE_COMPUTE + 2 * COMPUTE_PER_SERVER_RACK);
		expect(snap.serverRackCount).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Unit demand
// ---------------------------------------------------------------------------

describe("unit compute demand", () => {
	it("simple unit (2 functional components) costs COMPUTE_PER_UNIT", () => {
		const unit = spawnPlayerUnit("p1", {
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		expect(getUnitComputeDemand(unit)).toBe(COMPUTE_PER_UNIT);
	});

	it("complex unit (more components) costs more", () => {
		const unit = spawnPlayerUnit("p1", {
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		});
		// 4 functional, 4-2=2 extra => COMPUTE_PER_UNIT + 2 * COMPUTE_PER_EXTRA_COMPONENT
		const expected = COMPUTE_PER_UNIT + 2 * COMPUTE_PER_EXTRA_COMPONENT;
		expect(getUnitComputeDemand(unit)).toBe(expected);
	});

	it("broken components do not count toward demand", () => {
		const unit = spawnPlayerUnit("p1", {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		});
		// 3 functional, 3-2=1 extra
		const expected = COMPUTE_PER_UNIT + 1 * COMPUTE_PER_EXTRA_COMPONENT;
		expect(getUnitComputeDemand(unit)).toBe(expected);
	});

	it("only player units consume compute", () => {
		spawnEnemyUnit("enemy1");
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.demand).toBe(0);
		expect(snap.unitCount).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Demand vs capacity
// ---------------------------------------------------------------------------

describe("demand vs capacity", () => {
	it("demand < capacity yields positive available", () => {
		spawnPlayerUnit("p1");
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.available).toBeGreaterThan(0);
	});

	it("many units exhaust compute", () => {
		// BASE_COMPUTE is 5, each unit costs at least COMPUTE_PER_UNIT
		// Spawn enough units to exceed capacity
		for (let i = 0; i < 10; i++) {
			spawnPlayerUnit(`p${i}`, {
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			});
		}
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.demand).toBeGreaterThan(snap.capacity);
		expect(snap.available).toBeLessThan(0);
	});

	it("adding server rack increases available compute", () => {
		for (let i = 0; i < 10; i++) {
			spawnPlayerUnit(`p${i}`, {
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			});
		}
		computeSystem();
		const before = getComputeSnapshot().available;

		spawnServerRack("rack1", true);
		computeSystem();
		const after = getComputeSnapshot().available;

		expect(after).toBeGreaterThan(before);
		expect(after - before).toBeCloseTo(COMPUTE_PER_SERVER_RACK, 1);
	});
});

// ---------------------------------------------------------------------------
// Vulnerability
// ---------------------------------------------------------------------------

describe("vulnerability", () => {
	it("no units vulnerable when compute is sufficient", () => {
		spawnPlayerUnit("p1");
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.vulnerableCount).toBe(0);
	});

	it("units become vulnerable when compute is exhausted", () => {
		for (let i = 0; i < 10; i++) {
			spawnPlayerUnit(`p${i}`, {
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			});
		}
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.vulnerableCount).toBeGreaterThan(0);
	});

	it("vulnerability count matches the shortfall", () => {
		// Each unit costs COMPUTE_PER_UNIT=1. BASE_COMPUTE=5.
		// 8 units = demand 8, capacity 5, shortfall 3 => 3 vulnerable
		for (let i = 0; i < 8; i++) {
			spawnPlayerUnit(`p${i}`, {
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			});
		}
		computeSystem();
		const snap = getComputeSnapshot();
		// Demand = 8, capacity = 5, shortfall = 3
		expect(snap.vulnerableCount).toBe(3);
	});

	it("losing a server rack can make units vulnerable", () => {
		for (let i = 0; i < 8; i++) {
			spawnPlayerUnit(`p${i}`, {
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			});
		}
		const rack = spawnServerRack("rack1", true);
		computeSystem();
		const before = getComputeSnapshot().vulnerableCount;

		// Unpower the rack
		rack.set(BuildingTrait, { powered: false });
		computeSystem();
		const after = getComputeSnapshot().vulnerableCount;

		expect(after).toBeGreaterThan(before);
	});
});

// ---------------------------------------------------------------------------
// Snapshot consistency
// ---------------------------------------------------------------------------

describe("snapshot", () => {
	it("unit count matches player units only", () => {
		spawnPlayerUnit("p1");
		spawnPlayerUnit("p2");
		spawnEnemyUnit("enemy1");
		computeSystem();
		const snap = getComputeSnapshot();
		expect(snap.unitCount).toBe(2);
	});

	it("values are rounded to one decimal", () => {
		spawnPlayerUnit("p1");
		computeSystem();
		const snap = getComputeSnapshot();
		// Check that values don't have excessive decimal places
		expect(
			snap.capacity.toString().split(".")[1]?.length ?? 0,
		).toBeLessThanOrEqual(1);
		expect(
			snap.demand.toString().split(".")[1]?.length ?? 0,
		).toBeLessThanOrEqual(1);
		expect(
			snap.available.toString().split(".")[1]?.length ?? 0,
		).toBeLessThanOrEqual(1);
	});
});
