/**
 * Unit tests for selection + move-command logic.
 *
 * Tests use the global world singleton (same as production code).
 * Each test spawns entities, runs selection functions, asserts, then destroys them.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	deselectAll,
	findEntityAtPoint,
	getSelectedEntity,
	issueMoveTo,
	selectEntity,
} from "../selection";

// Mock pathfinding so issueMoveTo doesn't need navmesh state
vi.mock("../../systems/pathfinding", () => ({
	findPath: (_start: unknown, goal: { x: number; y: number; z: number }) => [
		goal,
	],
}));

const entities: Entity[] = [];

let unitCounter = 0;

function spawnUnit(
	x: number,
	z: number,
	opts?: { selected?: boolean },
): Entity {
	const e = world.spawn(
		EntityId({ value: `sel_unit_${unitCounter++}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Bot",
			speed: 3,
			selected: opts?.selected ?? false,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

function spawnBuilding(
	x: number,
	z: number,
	opts?: { selected?: boolean },
): Entity {
	const e = world.spawn(
		Position({ x, y: 0, z }),
		Fragment({ fragmentId: "" }),
		BuildingTrait({
			buildingType: "lightning_rod",
			powered: false,
			operational: true,
			selected: opts?.selected ?? false,
			buildingComponentsJson: "[]",
		}),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	deselectAll();
	for (const e of entities) {
		if (e.has(Position)) e.destroy();
	}
	entities.length = 0;
});

// ─── Full select/deselect chain with all traits ─────────────────────────────

describe("click-to-select chain (EntityId + Position + Unit + Faction)", () => {
	it("spawns with all required traits, selects, then deselects", () => {
		const unit = spawnUnit(10, 10);

		// Verify all traits are present
		expect(unit.has(EntityId)).toBe(true);
		expect(unit.has(Position)).toBe(true);
		expect(unit.has(Unit)).toBe(true);
		expect(unit.has(Faction)).toBe(true);

		// Select
		selectEntity(unit);
		expect(unit.get(Unit)!.selected).toBe(true);

		// Deselect
		deselectAll();
		expect(unit.get(Unit)!.selected).toBe(false);
	});
});

// ─── selectEntity + deselectAll ──────────────────────────────────────────────

describe("selectEntity / deselectAll", () => {
	it("selects a unit and deselects others", () => {
		const a = spawnUnit(0, 0);
		const b = spawnUnit(5, 5);

		selectEntity(a);
		expect(a.get(Unit)!.selected).toBe(true);
		expect(b.get(Unit)!.selected).toBe(false);

		selectEntity(b);
		expect(a.get(Unit)!.selected).toBe(false);
		expect(b.get(Unit)!.selected).toBe(true);
	});

	it("selects a building", () => {
		const bldg = spawnBuilding(10, 10);
		selectEntity(bldg);
		expect(bldg.get(BuildingTrait)!.selected).toBe(true);
	});

	it("deselects units when selecting a building", () => {
		const unit = spawnUnit(0, 0, { selected: true });
		const bldg = spawnBuilding(10, 10);

		selectEntity(bldg);
		expect(unit.get(Unit)!.selected).toBe(false);
		expect(bldg.get(BuildingTrait)!.selected).toBe(true);
	});

	it("deselectAll clears everything", () => {
		const a = spawnUnit(0, 0, { selected: true });
		const bldg = spawnBuilding(10, 10, { selected: true });

		deselectAll();
		expect(a.get(Unit)!.selected).toBe(false);
		expect(bldg.get(BuildingTrait)!.selected).toBe(false);
	});
});

// ─── getSelectedEntity ───────────────────────────────────────────────────────

describe("getSelectedEntity", () => {
	it("returns null when nothing selected", () => {
		spawnUnit(0, 0);
		expect(getSelectedEntity()).toBeNull();
	});

	it("returns selected unit", () => {
		const a = spawnUnit(0, 0, { selected: true });
		expect(getSelectedEntity()).toBe(a);
	});

	it("returns selected building", () => {
		const bldg = spawnBuilding(5, 5, { selected: true });
		expect(getSelectedEntity()).toBe(bldg);
	});
});

// ─── findEntityAtPoint ───────────────────────────────────────────────────────

describe("findEntityAtPoint", () => {
	it("finds unit within threshold", () => {
		const a = spawnUnit(5, 5);
		const found = findEntityAtPoint(5.5, 5.5);
		expect(found).toBe(a);
	});

	it("returns null when no entity nearby", () => {
		spawnUnit(0, 0);
		expect(findEntityAtPoint(100, 100)).toBeNull();
	});

	it("picks the closest entity", () => {
		spawnUnit(0, 0);
		const closer = spawnUnit(3, 3);
		const found = findEntityAtPoint(3.2, 3.2);
		expect(found).toBe(closer);
	});

	it("finds buildings too", () => {
		const bldg = spawnBuilding(10, 10);
		expect(findEntityAtPoint(10.5, 10.5)).toBe(bldg);
	});

	it("respects custom threshold", () => {
		spawnUnit(5, 5);
		// Default threshold is 1.5, entity is ~0.7 away — should find
		expect(findEntityAtPoint(5.5, 5.5, 1.5)).not.toBeNull();
		// Tiny threshold — should miss
		expect(findEntityAtPoint(5.5, 5.5, 0.1)).toBeNull();
	});
});

// ─── issueMoveTo ─────────────────────────────────────────────────────────────

describe("issueMoveTo", () => {
	it("sets Navigation to moving with path", () => {
		const unit = spawnUnit(0, 0);
		issueMoveTo(unit, 10, 10);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(true);
		expect(nav.pathIndex).toBe(0);
		expect(nav.pathJson).not.toBe("[]");
	});

	it("does not crash on entity without Navigation", () => {
		// Building has no Navigation trait — should be a no-op
		const bldg = spawnBuilding(0, 0);
		expect(() => issueMoveTo(bldg, 10, 10)).not.toThrow();
	});
});
