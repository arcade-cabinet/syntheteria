/**
 * Click-to-move integration chain tests.
 *
 * These test the full gameplay chain:
 *   1. Spawn a player unit with EntityId + Position + Unit + Faction + Navigation
 *   2. Select the unit via selectEntity()
 *   3. Issue a move command via issueMoveTo()
 *   4. Run movementSystem() several frames
 *   5. Verify Position has changed toward the target
 *
 * This bridges input/selection.ts and systems/movement.ts — the complete
 * "player clicks unit then clicks ground" chain at the ECS level.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { movementSystem } from "../../systems/movement";
import {
	deselectAll,
	getSelectedEntity,
	issueMoveTo,
	selectEntity,
} from "../selection";

// Mock pathfinding so issueMoveTo returns a straight-line path to the goal
vi.mock("../../systems/pathfinding", () => ({
	findPath: (_start: unknown, goal: { x: number; y: number; z: number }) => [
		goal,
	],
}));

const entities: Entity[] = [];

function spawnPlayerUnit(id: string, x: number, z: number, speed = 5): Entity {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: id,
			speed,
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

// ─── Full select-then-move chain ─────────────────────────────────────────────

describe("click-to-move chain", () => {
	it("select unit → issue move → movementSystem advances position toward target", () => {
		const unit = spawnPlayerUnit("bot_0", 10, 10, 5);

		// Step 1: Select the unit
		selectEntity(unit);
		expect(unit.get(Unit)!.selected).toBe(true);
		expect(getSelectedEntity()).toBe(unit);

		// Step 2: Issue move command to (20, 20)
		issueMoveTo(unit, 20, 20);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(true);
		expect(nav.pathIndex).toBe(0);

		// Step 3: Run movement system for several frames
		const initialPos = { ...unit.get(Position)! };
		for (let i = 0; i < 5; i++) {
			movementSystem(0.5, 1.0); // 5 speed * 0.5 dt * 1x = 2.5 units per frame
		}

		// Step 4: Verify position has moved toward the target
		const finalPos = unit.get(Position)!;
		expect(finalPos.x).toBeGreaterThan(initialPos.x);
		expect(finalPos.z).toBeGreaterThan(initialPos.z);
	});

	it("select unit → issue move → unit reaches destination and stops", () => {
		// Place unit close to target so it arrives quickly
		const unit = spawnPlayerUnit("bot_1", 18, 18, 10);

		selectEntity(unit);
		issueMoveTo(unit, 20, 20);

		// Distance ~2.83, speed=10 — should arrive in 1 frame at dt=1
		movementSystem(1.0, 1.0);

		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(20, 0);
		expect(pos.z).toBeCloseTo(20, 0);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(false);
	});

	it("deselect before move does not prevent movement once issued", () => {
		const unit = spawnPlayerUnit("bot_2", 0, 0, 5);

		selectEntity(unit);
		issueMoveTo(unit, 10, 0);
		deselectAll();

		// Unit should still move even though deselected
		expect(unit.get(Unit)!.selected).toBe(false);
		expect(unit.get(Navigation)!.moving).toBe(true);

		movementSystem(1.0, 1.0);

		const pos = unit.get(Position)!;
		expect(pos.x).toBeGreaterThan(0);
	});

	it("selecting a different unit does not affect first unit's movement", () => {
		const unitA = spawnPlayerUnit("bot_a", 0, 0, 5);
		const unitB = spawnPlayerUnit("bot_b", 50, 50, 5);

		// Move unit A
		selectEntity(unitA);
		issueMoveTo(unitA, 10, 0);

		// Now select unit B — unit A should still be moving
		selectEntity(unitB);
		expect(unitA.get(Unit)!.selected).toBe(false);
		expect(unitA.get(Navigation)!.moving).toBe(true);

		movementSystem(1.0, 1.0);

		expect(unitA.get(Position)!.x).toBeGreaterThan(0);
		// Unit B should not have moved
		expect(unitB.get(Position)!.x).toBe(50);
	});

	it("issuing a new move overrides the previous destination", () => {
		const unit = spawnPlayerUnit("bot_3", 0, 0, 5);

		selectEntity(unit);
		issueMoveTo(unit, 100, 0); // First command: move east

		// Immediately override: move north instead
		issueMoveTo(unit, 0, 100);

		movementSystem(1.0, 1.0);

		const pos = unit.get(Position)!;
		// Should be moving north (z increasing), not east (x increasing)
		expect(pos.z).toBeGreaterThan(0);
		expect(pos.x).toBeCloseTo(0, 0);
	});
});
