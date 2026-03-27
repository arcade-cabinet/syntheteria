/**
 * Movement system tests.
 *
 * Verifies that movementSystem() interpolates Position along Navigation
 * waypoints correctly, stops at the end, and respects game speed.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
} from "../../ecs/traits";
import { serializePath } from "../../ecs/types";
import { world } from "../../ecs/world";
import { movementSystem } from "../movement";

const entities: Entity[] = [];

function spawnMovingUnit(
	x: number,
	z: number,
	path: { x: number; y: number; z: number }[],
	speed = 3,
): Entity {
	const e = world.spawn(
		EntityId({ value: `move_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Mover",
			speed,
			selected: false,
		}),
		Navigation({
			pathJson: serializePath(path),
			pathIndex: 0,
			moving: true,
		}),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
});

describe("movementSystem", () => {
	it("moves a unit toward its first waypoint", () => {
		const unit = spawnMovingUnit(0, 0, [{ x: 10, y: 0, z: 0 }], 5);

		movementSystem(1.0, 1.0); // 5 units/sec * 1s * 1x speed = 5 units

		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(5, 0);
		expect(pos.z).toBeCloseTo(0, 0);
	});

	it("reaches waypoint and advances pathIndex", () => {
		// Place unit close enough to reach in one step
		const unit = spawnMovingUnit(
			0,
			0,
			[
				{ x: 3, y: 0, z: 0 },
				{ x: 3, y: 0, z: 6 },
			],
			10,
		);

		movementSystem(1.0, 1.0); // 10 units/sec — can reach first waypoint at dist 3

		const nav = unit.get(Navigation)!;
		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(3, 0);
		expect(nav.pathIndex).toBeGreaterThanOrEqual(1);
	});

	it("stops moving when all waypoints are reached", () => {
		const unit = spawnMovingUnit(0, 0, [{ x: 1, y: 0, z: 0 }], 10);

		// Step enough to reach the single waypoint
		movementSystem(1.0, 1.0);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(false);

		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(1, 0);
	});

	it("does not move when moving=false", () => {
		const unit = world.spawn(
			EntityId({ value: "idle_unit" }),
			Position({ x: 5, y: 0, z: 5 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Idle",
				speed: 5,
				selected: false,
			}),
			Navigation({
				pathJson: serializePath([{ x: 20, y: 0, z: 20 }]),
				pathIndex: 0,
				moving: false,
			}),
		);
		entities.push(unit);

		movementSystem(1.0, 1.0);

		const pos = unit.get(Position)!;
		expect(pos.x).toBe(5);
		expect(pos.z).toBe(5);
	});

	it("respects gameSpeed multiplier", () => {
		const unit = spawnMovingUnit(0, 0, [{ x: 20, y: 0, z: 0 }], 4);

		// At gameSpeed=2, effective step = 4 * 0.5 * 2 = 4
		movementSystem(0.5, 2.0);

		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(4, 0);
	});

	it("traverses multiple waypoints over several frames", () => {
		const unit = spawnMovingUnit(
			0,
			0,
			[
				{ x: 2, y: 0, z: 0 },
				{ x: 2, y: 0, z: 4 },
				{ x: 6, y: 0, z: 4 },
			],
			10,
		);

		// Run multiple small frames
		for (let i = 0; i < 20; i++) {
			movementSystem(0.1, 1.0);
		}

		const nav = unit.get(Navigation)!;
		const pos = unit.get(Position)!;

		// Should have reached the final waypoint (total dist = 2+4+4 = 10, speed*time = 10*2 = 20)
		expect(nav.moving).toBe(false);
		expect(pos.x).toBeCloseTo(6, 0);
		expect(pos.z).toBeCloseTo(4, 0);
	});

	it("handles diagonal movement correctly", () => {
		const unit = spawnMovingUnit(0, 0, [{ x: 3, y: 0, z: 4 }], 5);

		// Distance to waypoint = 5. Speed = 5. Delta = 1. Should reach exactly.
		movementSystem(1.0, 1.0);

		const pos = unit.get(Position)!;
		expect(pos.x).toBeCloseTo(3, 0);
		expect(pos.z).toBeCloseTo(4, 0);
	});
});
