/**
 * Unit tests for control groups.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { Fragment, Navigation, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	assignGroup,
	clearAllGroups,
	getGroup,
	recallGroup,
} from "../controlGroups";
import { deselectAll } from "../selection";

const entities: Entity[] = [];

function spawnUnit(
	x: number,
	z: number,
	opts?: { selected?: boolean },
): Entity {
	const e = world.spawn(
		Position({ x, y: 0, z }),
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

afterEach(() => {
	deselectAll();
	clearAllGroups();
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
});

describe("assignGroup", () => {
	it("assigns selected units to a group", () => {
		const a = spawnUnit(0, 0, { selected: true });
		const b = spawnUnit(5, 5, { selected: true });
		spawnUnit(10, 10); // not selected

		assignGroup(1);

		const group = getGroup(1);
		expect(group).toHaveLength(2);
		expect(group).toContain(a);
		expect(group).toContain(b);
	});

	it("does nothing when no units are selected", () => {
		spawnUnit(0, 0);
		assignGroup(1);
		expect(getGroup(1)).toHaveLength(0);
	});

	it("overwrites previous group assignment", () => {
		const a = spawnUnit(0, 0, { selected: true });
		assignGroup(1);

		deselectAll();
		const b = spawnUnit(5, 5, { selected: true });
		assignGroup(1);

		const group = getGroup(1);
		expect(group).toHaveLength(1);
		expect(group).toContain(b);
		expect(group).not.toContain(a);
	});
});

describe("recallGroup", () => {
	it("selects the group members and deselects others", () => {
		const a = spawnUnit(0, 0, { selected: true });
		const b = spawnUnit(5, 5, { selected: true });
		assignGroup(1);

		deselectAll();
		const c = spawnUnit(10, 10, { selected: true });

		recallGroup(1);

		expect(a.get(Unit)!.selected).toBe(true);
		expect(b.get(Unit)!.selected).toBe(true);
		expect(c.get(Unit)!.selected).toBe(false);
	});

	it("does nothing for unassigned group", () => {
		const a = spawnUnit(0, 0, { selected: true });
		recallGroup(9);
		// Selection should remain unchanged
		expect(a.get(Unit)!.selected).toBe(true);
	});

	it("prunes dead entities on recall", () => {
		const a = spawnUnit(0, 0, { selected: true });
		const b = spawnUnit(5, 5, { selected: true });
		assignGroup(1);

		// Kill entity a
		a.destroy();

		deselectAll();
		recallGroup(1);

		const group = getGroup(1);
		expect(group).toHaveLength(1);
		expect(group).toContain(b);
		expect(b.get(Unit)!.selected).toBe(true);
	});

	it("deletes group when all members are dead", () => {
		const a = spawnUnit(0, 0, { selected: true });
		assignGroup(1);

		a.destroy();
		recallGroup(1);

		expect(getGroup(1)).toHaveLength(0);
	});
});
