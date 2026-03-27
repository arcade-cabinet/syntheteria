/**
 * Unit tests for entity factory functions.
 *
 * Verifies that spawnUnit, spawnFabricationUnit, spawnLightningRod,
 * spawnCultUnit, and spawnBuilding create entities with the correct
 * traits and default values.
 */

import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	spawnBuilding,
	spawnCultUnit,
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "../factory";
import { createFragment, resetFragments } from "../terrain";
import {
	BuildingTrait,
	EngagementRule,
	EntityId,
	Faction,
	Inventory,
	LightningRod,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../traits";
import type { UnitComponent } from "../types";
import { parseComponents } from "../types";

const entities: Entity[] = [];

beforeEach(() => {
	resetFragments();
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
});

// ---------------------------------------------------------------------------
// spawnUnit
// ---------------------------------------------------------------------------

describe("spawnUnit", () => {
	const defaultComponents: UnitComponent[] = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
	];

	it("creates entity with all required traits", () => {
		const entity = spawnUnit({ x: 5, z: 10, components: defaultComponents });
		entities.push(entity);

		expect(entity.has(Position)).toBe(true);
		expect(entity.has(Unit)).toBe(true);
		expect(entity.has(Faction)).toBe(true);
		expect(entity.has(EntityId)).toBe(true);
		expect(entity.has(UnitComponents)).toBe(true);
		expect(entity.has(Navigation)).toBe(true);
		expect(entity.has(Inventory)).toBe(true);
		expect(entity.has(EngagementRule)).toBe(true);
	});

	it("uses correct default values", () => {
		const entity = spawnUnit({ x: 0, z: 0, components: defaultComponents });
		entities.push(entity);

		const unit = entity.get(Unit)!;
		expect(unit.unitType).toBe("maintenance_bot");
		expect(unit.displayName).toBe("Maintenance Bot");
		expect(unit.speed).toBe(3);
	});

	it("sets faction to player", () => {
		const entity = spawnUnit({ x: 0, z: 0, components: defaultComponents });
		entities.push(entity);

		const faction = entity.get(Faction)!;
		expect(faction.value).toBe("player");
	});

	it("serializes components correctly", () => {
		const components: UnitComponent[] = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "legs", functional: false, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		];

		const entity = spawnUnit({ x: 0, z: 0, components });
		entities.push(entity);

		const stored = entity.get(UnitComponents)!;
		const parsed = parseComponents(stored.componentsJson);
		expect(parsed).toEqual(components);
	});
});

// ---------------------------------------------------------------------------
// spawnFabricationUnit
// ---------------------------------------------------------------------------

describe("spawnFabricationUnit", () => {
	it("has both Unit and BuildingTrait", () => {
		const fragment = createFragment();

		const entity = spawnFabricationUnit({
			x: 10,
			z: 20,
			fragmentId: fragment.id,
		});
		entities.push(entity);

		expect(entity.has(Unit)).toBe(true);
		expect(entity.has(BuildingTrait)).toBe(true);

		const unit = entity.get(Unit)!;
		expect(unit.speed).toBe(0);

		const building = entity.get(BuildingTrait)!;
		expect(building.buildingType).toBe("fabrication_unit");
	});
});

// ---------------------------------------------------------------------------
// spawnLightningRod
// ---------------------------------------------------------------------------

describe("spawnLightningRod", () => {
	it("has BuildingTrait and LightningRod", () => {
		const fragment = createFragment();

		const entity = spawnLightningRod({
			x: 5,
			z: 5,
			fragmentId: fragment.id,
		});
		entities.push(entity);

		expect(entity.has(BuildingTrait)).toBe(true);
		expect(entity.has(LightningRod)).toBe(true);

		const building = entity.get(BuildingTrait)!;
		expect(building.buildingType).toBe("lightning_rod");
		expect(building.powered).toBe(true);
		expect(building.operational).toBe(true);

		const rod = entity.get(LightningRod)!;
		expect(rod.rodCapacity).toBe(10);
		expect(rod.currentOutput).toBe(7);
		expect(rod.protectionRadius).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// spawnCultUnit
// ---------------------------------------------------------------------------

describe("spawnCultUnit", () => {
	it("sets faction to cultist", () => {
		const entity = spawnCultUnit({ x: 0, z: 0, mechType: "wanderer" });
		entities.push(entity);

		const faction = entity.get(Faction)!;
		expect(faction.value).toBe("cultist");
	});
});

// ---------------------------------------------------------------------------
// spawnBuilding
// ---------------------------------------------------------------------------

describe("spawnBuilding", () => {
	it("delegates to specialized spawners", () => {
		const fragment = createFragment();

		const entity = spawnBuilding({
			x: 15,
			z: 25,
			fragmentId: fragment.id,
			buildingType: "lightning_rod",
		});
		entities.push(entity);

		// A lightning_rod should have both BuildingTrait and LightningRod
		expect(entity.has(BuildingTrait)).toBe(true);
		expect(entity.has(LightningRod)).toBe(true);

		const building = entity.get(BuildingTrait)!;
		expect(building.buildingType).toBe("lightning_rod");
	});
});
