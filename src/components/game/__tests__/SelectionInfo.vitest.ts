/**
 * Tests for SelectionInfo component logic.
 *
 * Tests the selection detection and data extraction from ECS entities
 * without full React rendering.
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BuildingTrait,
	Faction,
	LightningRod,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../../ecs/traits";
import { parseComponents } from "../../../ecs/types";
import { world } from "../../../ecs/world";

// Mock getScavengePoints to avoid side-effect generation
vi.mock("../../../systems/resources", () => ({
	getScavengePoints: vi.fn(() => []),
}));

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const entities: Entity[] = [];

afterEach(() => {
	for (const entity of entities) {
		try {
			entity.destroy();
		} catch {
			// Entity may already be destroyed
		}
	}
	entities.length = 0;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function spawnUnit(opts: {
	selected: boolean;
	displayName?: string;
	unitType?: string;
	mark?: number;
	faction?: "player" | "cultist" | "rogue" | "feral";
	components?: Array<{ name: string; functional: boolean; material: string }>;
}): Entity {
	const entity = world.spawn(
		Position({ x: 10, y: 0, z: 20 }),
		Faction({ value: opts.faction ?? "player" }),
		Unit({
			unitType: opts.unitType ?? "maintenance_bot",
			displayName: opts.displayName ?? "Test Bot",
			speed: 3,
			selected: opts.selected,
			mark: opts.mark ?? 1,
		}),
		UnitComponents({
			componentsJson: JSON.stringify(
				opts.components ?? [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: false, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
				],
			),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(entity);
	return entity;
}

function spawnBuilding(opts: {
	selected: boolean;
	buildingType?: string;
	powered?: boolean;
	operational?: boolean;
}): Entity {
	const entity = world.spawn(
		Position({ x: 30, y: 0, z: 40 }),
		BuildingTrait({
			buildingType: opts.buildingType ?? "lightning_rod",
			powered: opts.powered ?? false,
			operational: opts.operational ?? false,
			selected: opts.selected,
			buildingComponentsJson: "[]",
		}),
		LightningRod({ rodCapacity: 10, currentOutput: 7, protectionRadius: 8 }),
	);
	entities.push(entity);
	return entity;
}

/** Simulate what SelectionInfo does: find the selected unit/building. */
function findSelectedUnit(): Entity | null {
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) return entity;
	}
	return null;
}

function findSelectedBuilding(): Entity | null {
	for (const entity of world.query(BuildingTrait)) {
		const b = entity.get(BuildingTrait)!;
		if (b.selected && !entity.has(Unit)) return entity;
	}
	return null;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("selection detection", () => {
	it("shows no selection when nothing selected", () => {
		spawnUnit({ selected: false });

		const selectedUnit = findSelectedUnit();
		const selectedBuilding = findSelectedBuilding();

		expect(selectedUnit).toBeNull();
		expect(selectedBuilding).toBeNull();
	});

	it("finds selected unit", () => {
		spawnUnit({ selected: true, displayName: "Bot Alpha" });

		const selected = findSelectedUnit();

		expect(selected).not.toBeNull();
		expect(selected!.get(Unit)!.displayName).toBe("Bot Alpha");
	});

	it("finds selected building when no unit selected", () => {
		spawnUnit({ selected: false });
		spawnBuilding({ selected: true, buildingType: "lightning_rod" });

		const selectedUnit = findSelectedUnit();
		const selectedBuilding = findSelectedBuilding();

		expect(selectedUnit).toBeNull();
		expect(selectedBuilding).not.toBeNull();
		expect(selectedBuilding!.get(BuildingTrait)!.buildingType).toBe(
			"lightning_rod",
		);
	});

	it("prefers unit over building when both selected", () => {
		spawnUnit({ selected: true, displayName: "Priority Bot" });
		spawnBuilding({ selected: true });

		const selectedUnit = findSelectedUnit();
		expect(selectedUnit).not.toBeNull();
		expect(selectedUnit!.get(Unit)!.displayName).toBe("Priority Bot");
	});
});

describe("unit data extraction", () => {
	it("extracts unit name and type", () => {
		const unit = spawnUnit({
			selected: true,
			displayName: "Bot Alpha",
			unitType: "utility_drone",
		});

		const data = unit.get(Unit)!;
		expect(data.displayName).toBe("Bot Alpha");
		expect(data.unitType).toBe("utility_drone");
	});

	it("extracts mark level", () => {
		const unit = spawnUnit({ selected: true, mark: 3 });

		const data = unit.get(Unit)!;
		expect(data.mark).toBe(3);
	});

	it("extracts component status", () => {
		const unit = spawnUnit({
			selected: true,
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
			],
		});

		const comps = parseComponents(
			unit.get(UnitComponents)?.componentsJson ?? "[]",
		);
		expect(comps).toHaveLength(2);
		expect(comps[0]!.name).toBe("camera");
		expect(comps[0]!.functional).toBe(true);
		expect(comps[1]!.name).toBe("arms");
		expect(comps[1]!.functional).toBe(false);
	});

	it("extracts faction for hostile indicator", () => {
		const unit = spawnUnit({
			selected: true,
			faction: "feral",
			displayName: "Feral Bot",
		});

		const faction = unit.get(Faction)!.value;
		expect(faction).toBe("feral");
	});

	it("extracts position", () => {
		const unit = spawnUnit({ selected: true });

		const pos = unit.get(Position)!;
		expect(pos.x).toBe(10);
		expect(pos.z).toBe(20);
	});
});

describe("building data extraction", () => {
	it("extracts building type and power status", () => {
		const building = spawnBuilding({
			selected: true,
			buildingType: "lightning_rod",
			powered: true,
			operational: true,
		});

		const data = building.get(BuildingTrait)!;
		expect(data.buildingType).toBe("lightning_rod");
		expect(data.powered).toBe(true);
		expect(data.operational).toBe(true);
	});

	it("extracts lightning rod stats", () => {
		const building = spawnBuilding({ selected: true });

		const rod = building.get(LightningRod)!;
		expect(rod.rodCapacity).toBe(10);
		expect(rod.currentOutput).toBe(7);
		expect(rod.protectionRadius).toBe(8);
	});
});
