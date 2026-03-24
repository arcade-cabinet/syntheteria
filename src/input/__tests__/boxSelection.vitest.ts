/**
 * Unit tests for box selection.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { Fragment, Navigation, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import { boxSelect, deselectAll } from "../selection";

const entities: Entity[] = [];

function spawnUnit(x: number, z: number): Entity {
	const e = world.spawn(
		Position({ x, y: 0, z }),
		Fragment({ fragmentId: "" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Bot",
			speed: 3,
			selected: false,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	deselectAll();
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
});

describe("boxSelect", () => {
	it("selects units inside the rectangle", () => {
		const a = spawnUnit(5, 5);
		const b = spawnUnit(7, 7);
		spawnUnit(20, 20); // outside

		const count = boxSelect(0, 0, 10, 10);
		expect(count).toBe(2);
		expect(a.get(Unit)!.selected).toBe(true);
		expect(b.get(Unit)!.selected).toBe(true);
	});

	it("handles inverted rectangle corners", () => {
		const a = spawnUnit(5, 5);

		// Bottom-right to top-left drag
		const count = boxSelect(10, 10, 0, 0);
		expect(count).toBe(1);
		expect(a.get(Unit)!.selected).toBe(true);
	});

	it("returns 0 when no units in rectangle", () => {
		spawnUnit(50, 50);
		const count = boxSelect(0, 0, 10, 10);
		expect(count).toBe(0);
	});

	it("deselects previously selected units", () => {
		const a = spawnUnit(5, 5);
		const b = spawnUnit(50, 50);

		// First select b
		b.set(Unit, { selected: true });
		expect(b.get(Unit)!.selected).toBe(true);

		// Box select only captures a
		boxSelect(0, 0, 10, 10);
		expect(a.get(Unit)!.selected).toBe(true);
		expect(b.get(Unit)!.selected).toBe(false);
	});

	it("selects units on the boundary", () => {
		const a = spawnUnit(0, 0);
		const b = spawnUnit(10, 10);

		const count = boxSelect(0, 0, 10, 10);
		expect(count).toBe(2);
		expect(a.get(Unit)!.selected).toBe(true);
		expect(b.get(Unit)!.selected).toBe(true);
	});
});
