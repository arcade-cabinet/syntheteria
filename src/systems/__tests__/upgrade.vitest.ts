/**
 * Upgrade system tests.
 *
 * Verifies Mark I → II → III upgrades consume correct materials,
 * apply new stats, and respect constraints (max mark, near fab, resources).
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { ROBOT_DEFS } from "../../config/robotDefs";
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
import { addResource, getResources, resetResources } from "../resources";
import { canUpgrade, performUpgrade } from "../upgrade";

const entities: Entity[] = [];

function spawnTestUnit(
	x: number,
	z: number,
	unitType = "maintenance_bot",
	mark = 1,
): Entity {
	const e = world.spawn(
		EntityId({ value: `unit_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		Unit({
			unitType,
			displayName: `Test ${unitType}`,
			speed: 3,
			selected: false,
			mark,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			]),
		}),
	);
	entities.push(e);
	return e;
}

function spawnPoweredFab(x: number, z: number): Entity {
	const e = world.spawn(
		EntityId({ value: `fab_test_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
		BuildingTrait({
			buildingType: "fabrication_unit",
			powered: true,
			operational: true,
			selected: false,
			buildingComponentsJson: "[]",
		}),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	for (const e of entities) {
		e.destroy();
	}
	entities.length = 0;
	resetResources();
});

describe("canUpgrade", () => {
	it("returns null when unit is Mark III (max)", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 3);
		spawnPoweredFab(5, 6);
		addResource("scrapMetal", 100);
		addResource("circuitry", 100);
		expect(canUpgrade(unit)).toBeNull();
	});

	it("returns null when not near a powered fabrication unit", () => {
		const unit = spawnTestUnit(5, 5);
		addResource("scrapMetal", 100);
		addResource("circuitry", 100);
		expect(canUpgrade(unit)).toBeNull();
	});

	it("returns null when near an unpowered fabrication unit", () => {
		const unit = spawnTestUnit(5, 5);
		const fab = world.spawn(
			EntityId({ value: "fab_unpowered" }),
			Position({ x: 5, y: 0, z: 6 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "test" }),
			BuildingTrait({
				buildingType: "fabrication_unit",
				powered: false,
				operational: true,
				selected: false,
				buildingComponentsJson: "[]",
			}),
		);
		entities.push(fab);
		addResource("scrapMetal", 100);
		addResource("circuitry", 100);
		expect(canUpgrade(unit)).toBeNull();
	});

	it("returns null when insufficient materials", () => {
		const unit = spawnTestUnit(5, 5);
		spawnPoweredFab(5, 6);
		// Don't add any resources
		expect(canUpgrade(unit)).toBeNull();
	});

	it("returns cost array when all conditions met", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 1);
		spawnPoweredFab(5, 6);
		// Mark I → II costs: 5 scrap, 2 circuitry
		addResource("scrapMetal", 10);
		addResource("circuitry", 5);
		const costs = canUpgrade(unit);
		expect(costs).not.toBeNull();
		expect(costs!.length).toBe(2);
	});
});

describe("performUpgrade", () => {
	it("Mark I → II upgrade consumes correct materials", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 1);
		spawnPoweredFab(5, 6);
		addResource("scrapMetal", 10);
		addResource("circuitry", 5);

		const result = performUpgrade(unit);
		expect(result).toBe(true);
		expect(unit.get(Unit)!.mark).toBe(2);

		// Check resources were consumed (maintenance_bot Mark II: 5 scrap, 2 circuitry)
		const pool = getResources();
		expect(pool.scrapMetal).toBe(5); // 10 - 5
		expect(pool.circuitry).toBe(3); // 5 - 2
	});

	it("Mark II → III upgrade consumes correct materials", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 2);
		spawnPoweredFab(5, 6);
		// Mark II → III costs: 8 scrap, 4 circuitry, 1 durasteel
		addResource("scrapMetal", 15);
		addResource("circuitry", 10);
		addResource("durasteel", 5);

		const result = performUpgrade(unit);
		expect(result).toBe(true);
		expect(unit.get(Unit)!.mark).toBe(3);

		const pool = getResources();
		expect(pool.scrapMetal).toBe(7); // 15 - 8
		expect(pool.circuitry).toBe(6); // 10 - 4
		expect(pool.durasteel).toBe(4); // 5 - 1
	});

	it("Mark III cannot upgrade further", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 3);
		spawnPoweredFab(5, 6);
		addResource("scrapMetal", 100);
		addResource("circuitry", 100);
		addResource("durasteel", 100);

		const result = performUpgrade(unit);
		expect(result).toBe(false);
		expect(unit.get(Unit)!.mark).toBe(3);
	});

	it("upgrade applies new speed from mark tier", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 1);
		spawnPoweredFab(5, 6);
		addResource("scrapMetal", 10);
		addResource("circuitry", 5);

		performUpgrade(unit);
		// Mark II maintenance_bot speed = 3.0
		expect(unit.get(Unit)!.speed).toBe(3.0);
	});

	it("insufficient materials blocks upgrade", () => {
		const unit = spawnTestUnit(5, 5, "maintenance_bot", 1);
		spawnPoweredFab(5, 6);
		addResource("scrapMetal", 2); // Need 5

		const result = performUpgrade(unit);
		expect(result).toBe(false);
		expect(unit.get(Unit)!.mark).toBe(1);
		// Resources should NOT be consumed on failure
		expect(getResources().scrapMetal).toBe(2);
	});

	it("works for different robot types", () => {
		const guard = spawnTestUnit(5, 5, "guard_bot", 1);
		spawnPoweredFab(5, 6);
		// Guard bot Mark II: 6 scrap, 2 durasteel
		addResource("scrapMetal", 10);
		addResource("durasteel", 5);

		const result = performUpgrade(guard);
		expect(result).toBe(true);
		expect(guard.get(Unit)!.mark).toBe(2);
		// Guard bot Mark II speed = 2.5
		expect(guard.get(Unit)!.speed).toBe(2.5);
	});
});

describe("robotDefs consistency", () => {
	it("all 6 robot types have 3 marks defined", () => {
		for (const [_type, def] of Object.entries(ROBOT_DEFS)) {
			expect(def.marks.length).toBe(3);
			expect(def.marks[0].upgradeCost.length).toBe(0); // Mark I has no cost
			expect(def.marks[1].upgradeCost.length).toBeGreaterThan(0);
			expect(def.marks[2].upgradeCost.length).toBeGreaterThan(0);
		}
	});
});
