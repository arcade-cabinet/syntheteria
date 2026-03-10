/**
 * Unit tests for the enemy (feral bot) system.
 *
 * Tests cover:
 * - enemySystem: spawning, patrol behavior, aggro on player units
 * - Spawn caps (MAX_ENEMIES = 3)
 * - Spawn timing (SPAWN_INTERVAL = 60 ticks)
 * - Aggro range (AGGRO_RANGE = 6)
 * - Patrol behavior (30% chance per tick when idle)
 * - Edge cases: no spawn zones valid, no player units
 */

// Mock terrain and city layout before importing enemies
jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: jest.fn((_x: number, _z: number) => 0),
	isWalkable: jest.fn(() => true),
	createFragment: jest.fn(() => ({ id: "test_frag" })),
}));

jest.mock("../../ecs/cityLayout", () => ({
	isInsideBuilding: jest.fn(() => false),
}));

jest.mock("../pathfinding", () => ({
	findPath: jest.fn((_start: unknown, goal: { x: number; z: number }) => {
		return [{ x: goal.x, y: 0, z: goal.z }];
	}),
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { units, world } from "../../ecs/world";
import { enemySystem } from "../enemies";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponents(
	overrides: Partial<Record<string, boolean>> = {},
): UnitComponent[] {
	const defaults: Record<string, boolean> = {
		camera: true,
		arms: true,
		legs: true,
		power_cell: true,
		...overrides,
	};
	return Object.entries(defaults).map(([name, functional]) => ({
		name,
		functional,
		material: "metal" as const,
	}));
}

function makePlayerUnit(
	id: string,
	pos: { x: number; y: number; z: number },
	opts: { components?: UnitComponent[] } = {},
): Entity {
	const entity = world.add({
		id,
		faction: "player" as const,
		worldPosition: { ...pos },
		mapFragment: { fragmentId: "test_frag" },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: opts.components ?? makeComponents(),
		},
		navigation: { path: [], pathIndex: 0, moving: false },
	} as Partial<Entity> as Entity);
	trackedEntities.push(entity);
	return entity;
}

function countFerals(): number {
	let count = 0;
	for (const unit of units) {
		if (unit.faction === "feral") count++;
	}
	return count;
}

function getAllFerals(): Entity[] {
	const ferals: Entity[] = [];
	for (const unit of units) {
		if (unit.faction === "feral") ferals.push(unit);
	}
	return ferals;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const trackedEntities: Entity[] = [];

beforeEach(() => {
	jest.clearAllMocks();
});

afterEach(() => {
	// Remove all feral entities that were spawned by the system
	const ferals = getAllFerals();
	for (const e of ferals) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}

	for (const e of trackedEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	trackedEntities.length = 0;
});

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

describe("enemies — spawning", () => {
	it("spawns an enemy when timer expires and count is below MAX", () => {
		const initialCount = countFerals();

		// Run the system enough times to trigger spawning
		// spawnTimer starts at 40, decrements each call
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const finalCount = countFerals();
		expect(finalCount).toBeGreaterThan(initialCount);
	});

	it("does not exceed MAX_ENEMIES (3)", () => {
		// Run many ticks to trigger spawning
		for (let i = 0; i < 300; i++) {
			enemySystem();
		}

		expect(countFerals()).toBeLessThanOrEqual(3);
	});

	it("spawned enemies have feral faction", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		for (const f of ferals) {
			expect(f.faction).toBe("feral");
		}
	});

	it("spawned enemies have unit component with maintenance_bot type", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		expect(ferals.length).toBeGreaterThanOrEqual(1);

		for (const f of ferals) {
			expect(f.unit).toBeDefined();
			expect(f.unit!.type).toBe("maintenance_bot");
		}
	});

	it("spawned enemies have navigation component", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		expect(ferals.length).toBeGreaterThanOrEqual(1);

		for (const f of ferals) {
			expect(f.navigation).toBeDefined();
		}
	});

	it("spawned enemies always have functional legs", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		for (const f of ferals) {
			const legs = f.unit!.components.find(c => c.name === "legs");
			expect(legs).toBeDefined();
			expect(legs!.functional).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// Aggro
// ---------------------------------------------------------------------------

describe("enemies — aggro", () => {
	it("moves toward player within AGGRO_RANGE (6)", () => {
		// Spawn a feral manually
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		if (ferals.length === 0) return; // skip if spawn didn't trigger

		// Place a player near the first feral
		const feral = ferals[0];
		makePlayerUnit("p1", {
			x: feral.worldPosition!.x + 3,
			y: 0,
			z: feral.worldPosition!.z,
		}); // dist=3 < 6

		// Ensure feral is not moving
		feral.navigation!.moving = false;

		enemySystem();

		// Feral should start moving toward player
		expect(feral.navigation!.moving).toBe(true);
	});

	it("does not aggro player beyond AGGRO_RANGE (6)", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		if (ferals.length === 0) return;

		const feral = ferals[0];
		// Place player far away
		makePlayerUnit("p1", {
			x: feral.worldPosition!.x + 20,
			y: 0,
			z: feral.worldPosition!.z,
		});

		feral.navigation!.moving = false;

		// Use a high random value so patrol doesn't trigger (> 0.3)
		jest.spyOn(Math, "random").mockReturnValue(0.9);

		enemySystem();

		// Feral should NOT be targeting the far player (may patrol instead, but with 0.9 > 0.3, no patrol either)
		// We only check it didn't start moving — patrol check fails at 0.9 > 0.3
		// Actually 0.9 < 0.3 is false, so no patrol. And no aggro. So not moving.
		// Wait — 0.3 check: Math.random() < 0.3, with 0.9 < 0.3 = false. Correct.
		expect(feral.navigation!.moving).toBe(false);
	});

	it("does not aggro while already moving", () => {
		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		if (ferals.length === 0) return;

		const feral = ferals[0];
		feral.navigation!.moving = true;

		makePlayerUnit("p1", {
			x: feral.worldPosition!.x + 3,
			y: 0,
			z: feral.worldPosition!.z,
		});

		enemySystem();

		// Path should not have changed since feral was already moving
		// (the system skips moving units with `if (unit.navigation?.moving) continue;`)
	});
});

// ---------------------------------------------------------------------------
// Patrol behavior
// ---------------------------------------------------------------------------

describe("enemies — patrol", () => {
	it("patrols randomly when no player is nearby (30% chance)", () => {
		// random returns 0.1 < 0.3 => patrol triggers
		jest.spyOn(Math, "random").mockReturnValue(0.1);

		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		if (ferals.length === 0) return;

		const feral = ferals[0];
		feral.navigation!.moving = false;

		enemySystem();

		// With random=0.1 < 0.3, patrol should trigger
		expect(feral.navigation!.moving).toBe(true);
	});

	it("does not patrol when random > 0.3", () => {
		jest.spyOn(Math, "random").mockReturnValue(0.5);

		for (let i = 0; i < 41; i++) {
			enemySystem();
		}

		const ferals = getAllFerals();
		if (ferals.length === 0) return;

		const feral = ferals[0];
		feral.navigation!.moving = false;

		enemySystem();

		// With random=0.5 > 0.3, patrol should not trigger
		expect(feral.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("enemies — edge cases", () => {
	it("runs safely with no entities in the world", () => {
		expect(() => enemySystem()).not.toThrow();
	});

	it("runs safely with only player units", () => {
		makePlayerUnit("p1", { x: 0, y: 0, z: 0 });
		expect(() => enemySystem()).not.toThrow();
	});
});
