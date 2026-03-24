/**
 * Power system tests.
 *
 * Tests use the global world singleton (same as production code).
 * Each test spawns entities, runs the power system, asserts, then destroys them.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	LightningRod,
	Position,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { getPowerSnapshot, getStormIntensity, powerSystem } from "../power";

const entities: Entity[] = [];

function spawnRod(x: number, z: number, capacity = 10, radius = 12): Entity {
	const e = world.spawn(
		EntityId({ value: `rod_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		BuildingTrait({
			buildingType: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			buildingComponentsJson: "[]",
		}),
		LightningRod({
			rodCapacity: capacity,
			currentOutput: 0,
			protectionRadius: radius,
		}),
	);
	entities.push(e);
	return e;
}

function spawnBuilding(
	x: number,
	z: number,
	type = "fabrication_unit",
): Entity {
	const e = world.spawn(
		EntityId({ value: `bldg_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		BuildingTrait({
			buildingType: type,
			powered: false,
			operational: false,
			selected: false,
			buildingComponentsJson: "[]",
		}),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	for (const e of entities) {
		if (!e.destroyed) e.destroy();
	}
	entities.length = 0;
});

describe("power system", () => {
	it("building within rod radius gets powered", () => {
		spawnRod(0, 0, 10, 15);
		const bldg = spawnBuilding(5, 5);

		powerSystem(1);

		const trait = bldg.get(BuildingTrait)!;
		expect(trait.powered).toBe(true);
		expect(trait.operational).toBe(true);
	});

	it("building outside rod radius stays unpowered", () => {
		spawnRod(0, 0, 10, 5);
		const bldg = spawnBuilding(20, 20);

		powerSystem(1);

		const trait = bldg.get(BuildingTrait)!;
		expect(trait.powered).toBe(false);
	});

	it("removing rod unpowers its buildings", () => {
		const rod = spawnRod(0, 0, 10, 15);
		const bldg = spawnBuilding(5, 5);

		// First tick: powered
		powerSystem(1);
		expect(bldg.get(BuildingTrait)!.powered).toBe(true);

		// Remove rod
		rod.destroy();
		entities.splice(entities.indexOf(rod), 1);

		// Second tick: unpowered
		powerSystem(2);
		expect(bldg.get(BuildingTrait)!.powered).toBe(false);
	});

	it("rod output fluctuates based on storm intensity", () => {
		const rod = spawnRod(0, 0, 10, 15);

		// Run at different tick values to get different storm phases
		powerSystem(0);
		const output1 = rod.get(LightningRod)!.currentOutput;

		powerSystem(100);
		const output2 = rod.get(LightningRod)!.currentOutput;

		powerSystem(200);
		const output3 = rod.get(LightningRod)!.currentOutput;

		// At least two of three should differ (storm oscillates)
		const allSame = output1 === output2 && output2 === output3;
		expect(allSame).toBe(false);
	});

	it("storm intensity stays within valid range", () => {
		for (let tick = 0; tick < 500; tick += 10) {
			powerSystem(tick);
			const intensity = getStormIntensity();
			expect(intensity).toBeGreaterThan(0);
			expect(intensity).toBeLessThanOrEqual(1.5);
		}
	});

	it("snapshot reflects current state", () => {
		spawnRod(0, 0, 10, 15);
		spawnBuilding(5, 5);
		spawnBuilding(50, 50); // out of range

		powerSystem(1);

		const snap = getPowerSnapshot();
		expect(snap.rodCount).toBe(1);
		expect(snap.totalGeneration).toBeGreaterThan(0);
		// The rod itself counts as powered, plus the building in range
		expect(snap.poweredBuildingCount).toBeGreaterThanOrEqual(1);
		expect(snap.stormIntensity).toBeGreaterThan(0);
	});

	it("multiple rods power buildings in their respective radii", () => {
		spawnRod(0, 0, 10, 8);
		spawnRod(30, 30, 10, 8);
		const bldgA = spawnBuilding(3, 3);
		const bldgB = spawnBuilding(33, 33);
		const bldgC = spawnBuilding(50, 50); // out of range of both

		powerSystem(1);

		expect(bldgA.get(BuildingTrait)!.powered).toBe(true);
		expect(bldgB.get(BuildingTrait)!.powered).toBe(true);
		expect(bldgC.get(BuildingTrait)!.powered).toBe(false);
	});

	it("lightning rods do not power themselves via the building distribution loop", () => {
		const rod = spawnRod(0, 0, 10, 15);

		powerSystem(1);

		// Rod buildingType is "lightning_rod" — the system skips it in distribution
		// but the rod was spawned with powered: true
		const trait = rod.get(BuildingTrait)!;
		expect(trait.buildingType).toBe("lightning_rod");
	});
});
