/**
 * Repair system tests.
 *
 * Tests use the global world singleton (same as production code).
 * Each test spawns entities, runs repair functions, asserts, then destroys them.
 */
import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { UnitComponent } from "../../ecs/types";
import { parseComponents, serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { getActiveRepairs, repairSystem, startRepair } from "../repair";
import { addResource, resetResources } from "../resources";

const entities: Entity[] = [];

function makeComponents(...parts: UnitComponent[]): string {
	return serializeComponents(parts);
}

const FUNCTIONAL_ARMS: UnitComponent = {
	name: "arms",
	functional: true,
	material: "metal",
};
const BROKEN_CAMERA: UnitComponent = {
	name: "camera",
	functional: false,
	material: "electronic",
};
const FUNCTIONAL_LEGS: UnitComponent = {
	name: "legs",
	functional: true,
	material: "metal",
};
const BROKEN_LEGS: UnitComponent = {
	name: "legs",
	functional: false,
	material: "metal",
};

function spawnUnit(
	x: number,
	z: number,
	components: UnitComponent[],
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `unit_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: makeComponents(...components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

function spawnBuilding(
	x: number,
	z: number,
	components: UnitComponent[],
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `bldg_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		BuildingTrait({
			buildingType: "fabrication_unit",
			powered: true,
			operational: true,
			selected: false,
			buildingComponentsJson: makeComponents(...components),
		}),
	);
	entities.push(e);
	return e;
}

beforeEach(() => {
	resetResources();
	// Seed resources for repairs: metal costs 3 scrapMetal, electronic costs 2 circuitry
	addResource("scrapMetal", 50);
	addResource("circuitry", 50);
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	// Drain any leftover active repairs by ticking until empty
	for (let i = 0; i < 20; i++) {
		if (getActiveRepairs().length === 0) break;
		repairSystem();
	}
	resetResources();
});

describe("repair system", () => {
	it("unit with arms can start repair on nearby broken component", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS, FUNCTIONAL_LEGS]);
		const target = spawnUnit(1, 1, [BROKEN_CAMERA, FUNCTIONAL_LEGS]);

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(true);
		expect(getActiveRepairs()).toHaveLength(1);
		expect(getActiveRepairs()[0].componentName).toBe("camera");
	});

	it("repair completes after 5 ticks and fixes the component", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]);

		startRepair(repairer, target, "camera");

		// Advance 5 ticks
		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		// Component should be fixed
		const comps = parseComponents(target.get(UnitComponents)?.componentsJson);
		const camera = comps.find((c: UnitComponent) => c.name === "camera");
		expect(camera?.functional).toBe(true);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("unit without arms cannot repair", () => {
		// Repairer has only legs, no arms
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_LEGS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]);

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("unit too far away cannot repair", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		// REPAIR_RANGE is 3.0, place target at distance ~14
		const target = spawnUnit(10, 10, [BROKEN_CAMERA]);

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
	});

	it("unit at edge of repair range can repair", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		// REPAIR_RANGE is 3.0, distance = sqrt(2*2 + 2*2) = 2.83 < 3.0
		const target = spawnUnit(2, 2, [BROKEN_CAMERA]);

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(true);
	});

	it("insufficient resources prevents repair", () => {
		resetResources(); // zero out all resources
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]); // electronic → 2 circuitry

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
	});

	it("cannot repair an already functional component", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [FUNCTIONAL_LEGS]); // legs are functional

		const started = startRepair(repairer, target, "legs");

		expect(started).toBe(false);
	});

	it("cannot start duplicate repair on same component", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]);

		expect(startRepair(repairer, target, "camera")).toBe(true);
		expect(startRepair(repairer, target, "camera")).toBe(false);
		expect(getActiveRepairs()).toHaveLength(1);
	});

	it("can repair a building component", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const building = spawnBuilding(1, 0, [BROKEN_LEGS]);

		const started = startRepair(repairer, building, "legs");

		expect(started).toBe(true);

		// Complete repair
		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		const comps = parseComponents(
			building.get(BuildingTrait)?.buildingComponentsJson,
		);
		const legs = comps.find((c: UnitComponent) => c.name === "legs");
		expect(legs?.functional).toBe(true);
	});

	it("repair of metal component costs scrapMetal", () => {
		resetResources();
		addResource("scrapMetal", 3); // exactly the cost for metal repair
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_LEGS]); // metal → 3 scrapMetal

		const started = startRepair(repairer, target, "legs");

		expect(started).toBe(true);

		// Try again — no resources left
		resetResources();
		const target2 = spawnUnit(2, 0, [BROKEN_LEGS]);
		const started2 = startRepair(repairer, target2, "legs");
		expect(started2).toBe(false);
	});

	it("repair in progress reports ticks remaining", () => {
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]);

		startRepair(repairer, target, "camera");
		expect(getActiveRepairs()[0].ticksRemaining).toBe(5);

		repairSystem();
		expect(getActiveRepairs()[0].ticksRemaining).toBe(4);

		repairSystem();
		expect(getActiveRepairs()[0].ticksRemaining).toBe(3);
	});
});
