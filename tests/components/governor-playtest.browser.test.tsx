/**
 * Browser tests for PlaytestGovernor — automated player AI.
 *
 * Tests governor decision logic in a real browser environment using
 * the actual Koota ECS. Spawns test entities, runs governor ticks,
 * and verifies decisions are made without crashes.
 */

import { afterEach, beforeEach, expect, test, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../src/systems/resources", () => ({
	getResources: vi.fn(() => ({
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
	})),
	getScavengePoints: vi.fn(() => []),
}));

vi.mock("../../src/systems/baseManagement", () => ({
	validateBaseLocation: vi.fn(() => null),
	foundBase: vi.fn(() => ({
		get: () => ({ value: "mock_base" }),
	})),
}));

vi.mock("../../src/ecs/terrain", () => ({
	isWalkable: vi.fn(() => true),
	getTerrainHeight: vi.fn(() => 0),
}));

import type { Entity } from "koota";
import {
	clearGovernorLog,
	type GovernorAction,
	getGovernorLog,
	governorTick,
	resetGovernor,
} from "../../src/ai/governor/PlaytestGovernor";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
} from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const spawnedEntities: Entity[] = [];

function spawnPlayerUnit(
	id: string,
	x: number,
	z: number,
	moving = false,
): Entity {
	const entity = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: `Bot ${id}`,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving }),
	);
	spawnedEntities.push(entity);
	return entity;
}

function spawnEnemyUnit(id: string, x: number, z: number): Entity {
	const entity = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "cultist" }),
		Unit({
			unitType: "cult_drone",
			displayName: `Cult ${id}`,
			speed: 2,
			selected: false,
			mark: 1,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	spawnedEntities.push(entity);
	return entity;
}

function spawnScavengeSite(x: number, z: number): Entity {
	const entity = world.spawn(
		Position({ x, y: 0, z }),
		ScavengeSite({
			materialType: "scrapMetal",
			amountPerScavenge: 2,
			remaining: 5,
		}),
	);
	spawnedEntities.push(entity);
	return entity;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
	resetGovernor();
});

afterEach(() => {
	for (const entity of spawnedEntities) {
		try {
			entity.destroy();
		} catch {
			// Entity may already be destroyed
		}
	}
	spawnedEntities.length = 0;
	resetGovernor();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test("governor runs without crashing on empty world", () => {
	const actions = governorTick(world, 10);
	expect(actions).toEqual([]);
});

test("governor only runs on TICK_INTERVAL ticks", () => {
	spawnPlayerUnit("u1", 10, 10);

	// Ticks 1-9 should return empty
	for (let t = 1; t < 10; t++) {
		const actions = governorTick(world, t);
		expect(actions).toEqual([]);
	}

	// Tick 10 should produce actions (TICK_INTERVAL = 10)
	const actions = governorTick(world, 10);
	expect(actions.length).toBeGreaterThan(0);
});

test("idle unit gets exploration target", () => {
	spawnPlayerUnit("explorer", 20, 20);

	const actions = governorTick(world, 10);
	expect(actions.length).toBe(1);
	expect(actions[0].action).toBe("explore");
	expect(actions[0].entityId).toBe("explorer");
	expect(actions[0].targetX).toBeDefined();
	expect(actions[0].targetZ).toBeDefined();
});

test("unit near enemy gets attack action", () => {
	spawnPlayerUnit("attacker", 10, 10);
	spawnEnemyUnit("enemy1", 15, 10); // Within AGGRO_RANGE (12 world units)

	const actions = governorTick(world, 10);
	const attackAction = actions.find((a) => a.action === "attack");
	expect(attackAction).toBeDefined();
	expect(attackAction!.entityId).toBe("attacker");
});

test("unit near scavenge site gets scavenge action", () => {
	spawnPlayerUnit("scavenger", 10, 10);
	spawnScavengeSite(12, 10); // Within SCAVENGE_RANGE (5 world units)

	const actions = governorTick(world, 10);
	const scavengeAction = actions.find((a) => a.action === "scavenge");
	expect(scavengeAction).toBeDefined();
	expect(scavengeAction!.entityId).toBe("scavenger");
});

test("moving units are skipped (idle action)", () => {
	spawnPlayerUnit("mover", 10, 10, true); // moving = true

	const actions = governorTick(world, 10);
	expect(actions.length).toBe(1);
	expect(actions[0].action).toBe("idle");
});

test("governor runs 100 ticks without crashing", () => {
	spawnPlayerUnit("bot1", 10, 10);
	spawnPlayerUnit("bot2", 30, 30);
	spawnPlayerUnit("bot3", 50, 50);
	spawnEnemyUnit("cult1", 60, 60);

	const allActions: GovernorAction[] = [];
	for (let tick = 0; tick <= 1000; tick += 10) {
		const actions = governorTick(world, tick);
		allActions.push(...actions);
	}

	// Should have made some decisions
	expect(allActions.length).toBeGreaterThan(0);

	// Governor log should have accumulated entries
	const log = getGovernorLog();
	expect(log.length).toBeGreaterThan(0);
});

test("governor log can be cleared", () => {
	spawnPlayerUnit("bot", 10, 10);
	governorTick(world, 10);

	expect(getGovernorLog().length).toBeGreaterThan(0);
	clearGovernorLog();
	expect(getGovernorLog().length).toBe(0);
});

test("attack priority is higher than scavenge", () => {
	// Place a unit next to both an enemy and a scavenge site
	spawnPlayerUnit("prioritized", 10, 10);
	spawnEnemyUnit("nearby-enemy", 14, 10); // Within aggro range
	spawnScavengeSite(13, 10); // Also within scavenge range

	const actions = governorTick(world, 10);
	const unitAction = actions.find((a) => a.entityId === "prioritized");
	expect(unitAction).toBeDefined();
	// Attack has higher priority than scavenge
	expect(unitAction!.action).toBe("attack");
});

test("multiple units get independent decisions", () => {
	spawnPlayerUnit("u1", 10, 10);
	spawnPlayerUnit("u2", 50, 50);
	spawnPlayerUnit("u3", 90, 90);

	const actions = governorTick(world, 10);
	expect(actions.length).toBe(3);

	const entityIds = actions.map((a) => a.entityId);
	expect(entityIds).toContain("u1");
	expect(entityIds).toContain("u2");
	expect(entityIds).toContain("u3");
});
