/**
 * Economy integration test — full resource loop.
 *
 * Verifies the end-to-end chain:
 *   scavenge materials → fabricate components → repair broken unit
 *
 * Note: Mark I/II/III upgrades not yet implemented (task #34 in progress).
 * The upgrade step will be added once that system exists.
 *
 * Uses the global world singleton. Each test spawns entities directly
 * with traits (bypassing factory.ts terrain/fragment dependencies).
 */
import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	Inventory,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { UnitComponent } from "../../ecs/types";
import { parseComponents, serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	fabricationSystem,
	getActiveJobs,
	startFabrication,
} from "../fabrication";
import { getActiveRepairs, repairSystem, startRepair } from "../repair";
import {
	addResource,
	getResources,
	resetResources,
	resourceSystem,
} from "../resources";

const entities: Entity[] = [];

function makeComponents(...parts: UnitComponent[]): string {
	return serializeComponents(parts);
}

function spawnWorker(
	x: number,
	z: number,
	components: UnitComponent[],
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `worker_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Worker",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: makeComponents(...components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
	);
	entities.push(e);
	return e;
}

function spawnFabricator(
	x: number,
	z: number,
	powered: boolean,
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `fab_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		Unit({
			unitType: "fabrication_unit",
			displayName: "Fabrication Unit",
			speed: 0,
			selected: false,
		}),
		UnitComponents({ componentsJson: "[]" }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		BuildingTrait({
			buildingType: "fabrication_unit",
			powered,
			operational: powered,
			selected: false,
			buildingComponentsJson: "[]",
		}),
	);
	entities.push(e);
	return e;
}

function spawnScavengeSite(
	x: number,
	z: number,
	materialType: string,
	amountPerScavenge: number,
	remaining: number,
): Entity {
	const e = world.spawn(
		Position({ x, y: 0, z }),
		ScavengeSite({ materialType, amountPerScavenge, remaining }),
	);
	entities.push(e);
	return e;
}

beforeEach(() => {
	resetResources();
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	// Drain active repairs
	for (let i = 0; i < 20; i++) {
		if (getActiveRepairs().length === 0) break;
		repairSystem();
	}
	// Drain active fabrication jobs
	for (let i = 0; i < 20; i++) {
		if (getActiveJobs().length === 0) break;
		fabricationSystem();
	}
	resetResources();
});

describe("economy integration — full resource loop", () => {
	it("scavenge → fabricate → repair: complete chain", () => {
		// === STEP 1: Scavenge ===
		// A worker with functional arms sits next to a scavenge site.
		// Running the resource system should deposit materials into the global pool.
		const worker = spawnWorker(0, 0, [
			{ name: "arms", functional: true, material: "metal" },
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "legs", functional: true, material: "metal" },
		]);

		// Place scavenge sites right next to the worker (within SCAVENGE_RANGE=2.5)
		spawnScavengeSite(1, 0, "circuitry", 5, 10);
		spawnScavengeSite(0, 1, "scrapMetal", 5, 10);

		// Run resource system to scavenge (one site per tick per unit)
		resourceSystem();
		const afterFirstScavenge = getResources();
		// Should have picked up from one site
		const scavengedSomething =
			afterFirstScavenge.circuitry > 0 || afterFirstScavenge.scrapMetal > 0;
		expect(scavengedSomething).toBe(true);

		// Scavenge again to get from the second site
		resourceSystem();
		const afterSecondScavenge = getResources();
		const totalScavenged =
			afterSecondScavenge.circuitry + afterSecondScavenge.scrapMetal;
		expect(totalScavenged).toBeGreaterThanOrEqual(5);

		// === STEP 2: Fabricate ===
		// Ensure we have enough resources for Camera Module recipe:
		// costs: 2 circuitry + 1 scrapMetal
		// Top up if scavenging didn't yield enough for the specific recipe
		if (getResources().circuitry < 2) addResource("circuitry", 2);
		if (getResources().scrapMetal < 1) addResource("scrapMetal", 1);

		const fabricator = spawnFabricator(5, 5, true, "fab_economy_test");

		const fabStarted = startFabrication(fabricator, "Camera Module");
		expect(fabStarted).toBe(true);
		expect(getActiveJobs()).toHaveLength(1);

		// Camera Module takes 8 ticks
		for (let t = 0; t < 8; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(0);

		// Fabrication output: adds 1 circuitry to pool
		const afterFab = getResources();
		expect(afterFab.circuitry).toBeGreaterThan(0);

		// === STEP 3: Repair ===
		// Create a unit with a broken camera that needs repair.
		// Electronic repair costs 2 circuitry.
		if (getResources().circuitry < 2) addResource("circuitry", 2);

		const brokenUnit = spawnWorker(
			0.5,
			0,
			[
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			],
			"broken_unit",
		);

		const repairStarted = startRepair(worker, brokenUnit, "camera");
		expect(repairStarted).toBe(true);

		// Repair takes 5 ticks
		for (let t = 0; t < 5; t++) {
			repairSystem();
		}

		// Camera should now be functional
		const repairedComps = parseComponents(
			brokenUnit.get(UnitComponents)?.componentsJson,
		);
		const camera = repairedComps.find(
			(c: UnitComponent) => c.name === "camera",
		);
		expect(camera?.functional).toBe(true);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("scavenging from ECS ScavengeSite entities deposits into global pool", () => {
		spawnWorker(0, 0, [{ name: "arms", functional: true, material: "metal" }]);
		spawnScavengeSite(1, 0, "durasteel", 3, 5);

		resourceSystem();

		const pool = getResources();
		expect(pool.durasteel).toBe(3);
	});

	it("fabrication pauses when fabricator loses power", () => {
		addResource("circuitry", 10);
		addResource("scrapMetal", 10);

		const fabricator = spawnFabricator(0, 0, true, "fab_power_test");
		startFabrication(fabricator, "Arm Assembly"); // 6 ticks

		// Tick 3 times
		for (let t = 0; t < 3; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(1);
		expect(getActiveJobs()[0].ticksRemaining).toBe(3);

		// Kill power
		fabricator.set(BuildingTrait, { powered: false, operational: false });

		// Tick 3 more times — should NOT complete (paused)
		for (let t = 0; t < 3; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(1);
		expect(getActiveJobs()[0].ticksRemaining).toBe(3); // unchanged

		// Restore power
		fabricator.set(BuildingTrait, { powered: true, operational: true });

		// Tick 3 more times — now should complete
		for (let t = 0; t < 3; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(0);
	});

	it("repair fails when resources are exhausted mid-chain", () => {
		// Give just enough for one metal repair (3 scrapMetal)
		addResource("scrapMetal", 3);

		const worker = spawnWorker(0, 0, [
			{ name: "arms", functional: true, material: "metal" },
		]);
		const target1 = spawnWorker(
			1,
			0,
			[{ name: "legs", functional: false, material: "metal" }],
			"target1",
		);
		const target2 = spawnWorker(
			0,
			1,
			[{ name: "legs", functional: false, material: "metal" }],
			"target2",
		);

		// First repair should succeed (costs 3 scrapMetal)
		expect(startRepair(worker, target1, "legs")).toBe(true);

		// Second repair should fail — no resources left
		expect(startRepair(worker, target2, "legs")).toBe(false);
	});

	it("unpowered fabricator cannot start jobs", () => {
		addResource("circuitry", 10);
		addResource("scrapMetal", 10);

		const fabricator = spawnFabricator(0, 0, false, "fab_unpowered");

		const started = startFabrication(fabricator, "Camera Module");
		expect(started).toBe(false);
	});

	it("multiple fabricators can run jobs concurrently", () => {
		addResource("circuitry", 20);
		addResource("scrapMetal", 20);
		addResource("durasteel", 10);
		addResource("powerCells", 10);

		const fab1 = spawnFabricator(0, 0, true, "fab_concurrent_1");
		const fab2 = spawnFabricator(10, 0, true, "fab_concurrent_2");

		expect(startFabrication(fab1, "Camera Module")).toBe(true); // 8 ticks
		expect(startFabrication(fab2, "Leg Assembly")).toBe(true); // 5 ticks

		expect(getActiveJobs()).toHaveLength(2);

		// After 5 ticks, Leg Assembly should be done but Camera still going
		for (let t = 0; t < 5; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(1);
		expect(getActiveJobs()[0].recipe.name).toBe("Camera Module");

		// 3 more ticks, Camera Module done
		for (let t = 0; t < 3; t++) {
			fabricationSystem();
		}
		expect(getActiveJobs()).toHaveLength(0);
	});

	it("worker without arms cannot scavenge from sites", () => {
		// Worker with only legs (no arms)
		spawnWorker(0, 0, [{ name: "legs", functional: true, material: "metal" }]);
		spawnScavengeSite(1, 0, "scrapMetal", 5, 10);

		resourceSystem();

		const pool = getResources();
		expect(pool.scrapMetal).toBe(0);
	});

	it("depleted scavenge site yields nothing", () => {
		spawnWorker(0, 0, [{ name: "arms", functional: true, material: "metal" }]);
		// Site with 0 remaining
		spawnScavengeSite(1, 0, "scrapMetal", 5, 0);

		resourceSystem();

		const pool = getResources();
		expect(pool.scrapMetal).toBe(0);
	});
});
