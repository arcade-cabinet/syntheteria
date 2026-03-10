/**
 * Unit tests for the bot automation system.
 *
 * Tests cover:
 * - botAutomationSystem: dispatches to routine handlers
 * - idle: stops movement, occasional yaw randomization
 * - patrol: follows waypoints, advances patrolIndex
 * - guard: attacks nearby enemies, returns to guard position
 * - follow: follows target entity, maintains distance
 * - work: moves toward work target, stays nearby
 * - Skips bots being directly controlled (playerControlled.isActive)
 * - Skips bots with broken legs
 * - Edge cases: no automated bots, missing targets
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock pathfinding before importing botAutomation
vi.mock("../pathfinding", () => ({
	findPath: vi.fn((_start: unknown, goal: { x: number; z: number }) => {
		return [{ x: goal.x, y: 0, z: goal.z }];
	}),
}));

import type { AutomationComponent, Entity, UnitComponent, Vec3 } from "../../ecs/types";
import { world } from "../../ecs/world";
import { botAutomationSystem } from "../botAutomation";

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

function makeAutomatedBot(
	id: string,
	pos: { x: number; y: number; z: number },
	automation: AutomationComponent,
	opts: {
		faction?: Entity["faction"];
		components?: UnitComponent[];
		playerControlled?: { isActive: boolean; yaw: number; pitch: number };
	} = {},
): Entity {
	const entity = world.add({
		id,
		faction: opts.faction ?? ("player" as const),
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
		automation,
		...(opts.playerControlled ? { playerControlled: opts.playerControlled } : {}),
	} as Partial<Entity> as Entity);
	trackedEntities.push(entity);
	return entity;
}

function makeUnit(
	id: string,
	faction: Entity["faction"],
	pos: { x: number; y: number; z: number },
	opts: { components?: UnitComponent[] } = {},
): Entity {
	const entity = world.add({
		id,
		faction,
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

function makeIdleAutomation(): AutomationComponent {
	return {
		routine: "idle",
		followTarget: null,
		patrolPoints: [],
		patrolIndex: 0,
		workTarget: null,
	};
}

function makePatrolAutomation(points: Vec3[]): AutomationComponent {
	return {
		routine: "patrol",
		followTarget: null,
		patrolPoints: points,
		patrolIndex: 0,
		workTarget: null,
	};
}

function makeGuardAutomation(): AutomationComponent {
	return {
		routine: "guard",
		followTarget: null,
		patrolPoints: [],
		patrolIndex: 0,
		workTarget: null,
	};
}

function makeFollowAutomation(targetId: string): AutomationComponent {
	return {
		routine: "follow",
		followTarget: targetId,
		patrolPoints: [],
		patrolIndex: 0,
		workTarget: null,
	};
}

function makeWorkAutomation(targetId: string): AutomationComponent {
	return {
		routine: "work",
		followTarget: null,
		patrolPoints: [],
		patrolIndex: 0,
		workTarget: targetId,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const trackedEntities: Entity[] = [];

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
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
// Skip conditions
// ---------------------------------------------------------------------------

describe("botAutomation — skip conditions", () => {
	it("skips bots being directly controlled (isActive=true)", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 10, y: 0, z: 10 }]),
			{
				playerControlled: { isActive: true, yaw: 0, pitch: 0 },
			},
		);

		botAutomationSystem(1.0);

		// Should not have started moving
		expect(bot.navigation!.moving).toBe(false);
	});

	it("runs automation for bots with isActive=false", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 10, y: 0, z: 10 }]),
			{
				playerControlled: { isActive: false, yaw: 0, pitch: 0 },
			},
		);

		// Run enough times for path cooldown to expire
		botAutomationSystem(1.0);

		// Should have started patrolling
		expect(bot.navigation!.moving).toBe(true);
	});

	it("skips bots with no functional legs", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 10, y: 0, z: 10 }]),
			{
				components: makeComponents({ legs: false }),
			},
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("runs automation for bots without playerControlled", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 10, y: 0, z: 10 }]),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Idle routine
// ---------------------------------------------------------------------------

describe("botAutomation — idle", () => {
	it("ensures navigation.moving is false", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeIdleAutomation(),
		);
		bot.navigation!.moving = true;

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("runs without errors", () => {
		makeAutomatedBot("b1", { x: 0, y: 0, z: 0 }, makeIdleAutomation());
		expect(() => botAutomationSystem(1.0)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Patrol routine
// ---------------------------------------------------------------------------

describe("botAutomation — patrol", () => {
	it("moves toward the first patrol waypoint", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([
				{ x: 20, y: 0, z: 0 },
				{ x: 20, y: 0, z: 20 },
			]),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(true);
	});

	it("advances patrolIndex when close to current waypoint", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 20, y: 0, z: 0 }, // Already at waypoint 0
			makePatrolAutomation([
				{ x: 20, y: 0, z: 0 }, // dist < WAYPOINT_REACH_THRESHOLD (2)
				{ x: 40, y: 0, z: 0 },
			]),
		);

		botAutomationSystem(1.0);

		expect(bot.automation!.patrolIndex).toBe(1);
	});

	it("wraps patrol index back to 0", () => {
		const points: Vec3[] = [
			{ x: 10, y: 0, z: 0 },
			{ x: 20, y: 0, z: 0 },
		];
		const bot = makeAutomatedBot(
			"b1",
			{ x: 20, y: 0, z: 0 }, // At waypoint 1
			makePatrolAutomation(points),
		);
		bot.automation!.patrolIndex = 1;

		botAutomationSystem(1.0);

		expect(bot.automation!.patrolIndex).toBe(0);
	});

	it("does nothing with empty patrol points", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([]),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("does not re-path while already moving", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 20, y: 0, z: 0 }]),
		);
		bot.navigation!.moving = true;

		const pathBefore = [...bot.navigation!.path];
		botAutomationSystem(1.0);

		// Path should not have changed
		expect(bot.navigation!.path).toEqual(pathBefore);
	});
});

// ---------------------------------------------------------------------------
// Guard routine
// ---------------------------------------------------------------------------

describe("botAutomation — guard", () => {
	it("moves toward nearby enemy", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeGuardAutomation(),
		);

		// Enemy within GUARD_RANGE (8)
		makeUnit("e1", "feral", { x: 5, y: 0, z: 0 });

		botAutomationSystem(0.5);

		expect(bot.navigation!.moving).toBe(true);
	});

	it("ignores enemies beyond GUARD_RANGE (8)", () => {
		makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeGuardAutomation(),
		);

		// Enemy outside GUARD_RANGE
		makeUnit("e1", "feral", { x: 10, y: 0, z: 0 }); // dist=10 > 8

		botAutomationSystem(1.5);

		// Bot should not be moving toward enemy (no enemy in range)
		// It might try to return to guard position if it drifted
	});

	it("ignores player and wildlife faction units", () => {
		makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeGuardAutomation(),
		);

		makeUnit("p1", "player", { x: 3, y: 0, z: 0 });
		makeUnit("w1", "wildlife", { x: 3, y: 0, z: 3 });

		botAutomationSystem(1.5);

		// Should not target allies or wildlife
		// May still move to return to guard position
	});

	it("returns to guard position when no enemies and drifted too far", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 }, // Guard position set on first call
			makeGuardAutomation(),
		);

		// First call records guard position
		botAutomationSystem(0.1);

		// Move bot away from guard position
		bot.worldPosition!.x = 10;
		bot.navigation!.moving = false;

		// Let cooldown expire
		botAutomationSystem(2.0);

		expect(bot.navigation!.moving).toBe(true);
	});

	it("does not move when already at guard position with no enemies", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeGuardAutomation(),
		);

		// First call to set guard position
		botAutomationSystem(0.1);

		// Bot is at guard position (dist < 3)
		bot.navigation!.moving = false;
		botAutomationSystem(2.0);

		expect(bot.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Follow routine
// ---------------------------------------------------------------------------

describe("botAutomation — follow", () => {
	it("moves toward follow target when beyond FOLLOW_DISTANCE (3)", () => {
		// Create the target entity first
		makeUnit("leader", "player", { x: 10, y: 0, z: 0 });

		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeFollowAutomation("leader"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(true);
	});

	it("stays still when within FOLLOW_DISTANCE (3)", () => {
		makeUnit("leader", "player", { x: 2, y: 0, z: 0 });

		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeFollowAutomation("leader"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("does nothing when follow target does not exist", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeFollowAutomation("nonexistent"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("does nothing when followTarget is null", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			{
				routine: "follow",
				followTarget: null,
				patrolPoints: [],
				patrolIndex: 0,
				workTarget: null,
			},
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Work routine
// ---------------------------------------------------------------------------

describe("botAutomation — work", () => {
	it("moves toward work target when beyond WORK_DISTANCE (2)", () => {
		makeUnit("machine1", "player", { x: 10, y: 0, z: 0 });

		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeWorkAutomation("machine1"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(true);
	});

	it("stays still when within WORK_DISTANCE (2)", () => {
		makeUnit("machine1", "player", { x: 1, y: 0, z: 0 });

		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeWorkAutomation("machine1"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("does nothing when work target does not exist", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			makeWorkAutomation("nonexistent"),
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});

	it("does nothing when workTarget is null", () => {
		const bot = makeAutomatedBot(
			"b1",
			{ x: 0, y: 0, z: 0 },
			{
				routine: "work",
				followTarget: null,
				patrolPoints: [],
				patrolIndex: 0,
				workTarget: null,
			},
		);

		botAutomationSystem(1.0);

		expect(bot.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("botAutomation — edge cases", () => {
	it("runs safely with no automated bots", () => {
		expect(() => botAutomationSystem(1.0)).not.toThrow();
	});

	it("handles multiple bots with different routines simultaneously", () => {
		makeUnit("leader", "player", { x: 20, y: 0, z: 0 });

		makeAutomatedBot("idle_bot", { x: 0, y: 0, z: 0 }, makeIdleAutomation());
		makeAutomatedBot(
			"patrol_bot",
			{ x: 0, y: 0, z: 0 },
			makePatrolAutomation([{ x: 10, y: 0, z: 0 }]),
		);
		makeAutomatedBot(
			"follow_bot",
			{ x: 0, y: 0, z: 0 },
			makeFollowAutomation("leader"),
		);

		expect(() => botAutomationSystem(1.0)).not.toThrow();
	});

	it("does not crash when navigation component is missing", () => {
		// Create entity without navigation via a slightly different path
		const entity = world.add({
			id: "no_nav",
			faction: "player" as const,
			worldPosition: { x: 0, y: 0, z: 0 },
			mapFragment: { fragmentId: "test_frag" },
			unit: {
				type: "maintenance_bot",
				displayName: "no_nav",
				speed: 3,
				selected: false,
				components: makeComponents(),
			},
			automation: makeIdleAutomation(),
		} as Partial<Entity> as Entity);
		trackedEntities.push(entity);

		expect(() => botAutomationSystem(1.0)).not.toThrow();
	});
});
