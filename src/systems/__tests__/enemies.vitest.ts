/**
 * Enemy (feral machine) system tests.
 *
 * The enemy system depends on terrain initialization (isWalkable, isInsideBuilding)
 * and navmesh pathfinding (findPath), which makes full integration testing
 * impractical without a complete game init. These tests focus on:
 * - ECS queries for counting feral faction units
 * - enemySystem() not crashing when called without terrain
 * - Spawn timer countdown behavior (no crash over multiple ticks)
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { enemySystem } from "../enemies";

const entities: Entity[] = [];

/**
 * Spawn a feral unit manually, bypassing the enemy system's internal
 * findValidSpawn / createFragment logic.
 */
function spawnFeralUnit(id: string, x: number, z: number): Entity {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "feral" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: `Feral ${id}`,
			speed: 2.5,
			selected: false,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

function spawnPlayerUnit(id: string, x: number, z: number): Entity {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: `Player ${id}`,
			speed: 3,
			selected: false,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
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

// ---------------------------------------------------------------------------
// Basic safety: enemySystem does not crash without terrain
// ---------------------------------------------------------------------------

describe("enemySystem safety", () => {
	it("does not crash when called with no terrain", () => {
		// enemySystem() references isWalkable (pure function) and
		// isInsideBuilding (returns false when no board is cached).
		// It should not throw even without full game initialization.
		expect(() => enemySystem()).not.toThrow();
	});

	it("enemy spawn timer counts down without crashing", () => {
		// Run enemySystem several ticks to exercise the spawn timer
		// countdown path. Even if spawns fail (no valid terrain),
		// the system should not throw.
		for (let i = 0; i < 10; i++) {
			expect(() => enemySystem()).not.toThrow();
		}
	});
});

// ---------------------------------------------------------------------------
// ECS query: counting feral faction units
// ---------------------------------------------------------------------------

describe("feral unit counting via ECS query", () => {
	it("counts feral faction units correctly", () => {
		// Replicate the same query pattern used by countEnemies()
		spawnFeralUnit("f1", 10, 10);
		spawnFeralUnit("f2", 20, 20);
		spawnFeralUnit("f3", 30, 30);

		let feralCount = 0;
		for (const entity of world.query(Unit, Faction)) {
			if (entity.get(Faction)?.value === "feral") feralCount++;
		}
		expect(feralCount).toBe(3);
	});

	it("does not count player units as feral", () => {
		spawnFeralUnit("f1", 10, 10);
		spawnPlayerUnit("p1", 15, 15);
		spawnPlayerUnit("p2", 25, 25);

		let feralCount = 0;
		for (const entity of world.query(Unit, Faction)) {
			if (entity.get(Faction)?.value === "feral") feralCount++;
		}
		expect(feralCount).toBe(1);
	});

	it("returns zero when no feral units exist", () => {
		spawnPlayerUnit("p1", 10, 10);

		let feralCount = 0;
		for (const entity of world.query(Unit, Faction)) {
			if (entity.get(Faction)?.value === "feral") feralCount++;
		}
		expect(feralCount).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// enemySystem processes spawned feral units
// ---------------------------------------------------------------------------

describe("enemySystem with pre-spawned ferals", () => {
	it("processes feral units without crashing", () => {
		// Pre-spawn some feral units, then run the system.
		// The AI loop queries Position, Unit, Faction, Navigation —
		// it should iterate over them without error.
		spawnFeralUnit("f1", 10, 10);
		spawnFeralUnit("f2", 20, 20);

		for (let i = 0; i < 5; i++) {
			expect(() => enemySystem()).not.toThrow();
		}
	});

	it("does not crash when feral and player units coexist", () => {
		spawnFeralUnit("f1", 10, 10);
		spawnPlayerUnit("p1", 50, 50); // far away, no aggro

		for (let i = 0; i < 5; i++) {
			expect(() => enemySystem()).not.toThrow();
		}
	});

	it("idle feral units have moving=false initially", () => {
		const feral = spawnFeralUnit("idle_f", 10, 10);

		const nav = feral.get(Navigation);
		expect(nav).toBeDefined();
		expect(nav!.moving).toBe(false);
	});
});
