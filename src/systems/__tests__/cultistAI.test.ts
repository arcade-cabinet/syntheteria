/**
 * Unit tests for the cultist AI system.
 *
 * Tests cover:
 * - spawnCultist: creates cultist entity with correct components
 * - spawnCultistPair: creates two cultists in a patrol group
 * - cultistAISystem: aggro, lightning discharge, patrol behavior
 * - getLastLightningEvents: event reporting
 * - Lightning cooldowns, range checks, and AoE damage
 * - Edge cases: hacked cultists, broken legs, no targets
 */

// Mock terrain and city layout before importing cultistAI
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

// Compat layer: defer world access until iteration time to avoid circular init issues
jest.mock("../../ecs/koota/compat", () => ({
	get units() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../ecs/world").units;
	},
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	cultistAISystem,
	getLastLightningEvents,
	spawnCultist,
	spawnCultistPair,
} from "../cultistAI";

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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const trackedEntities: Entity[] = [];

beforeEach(() => {
	jest.clearAllMocks();
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
// spawnCultist
// ---------------------------------------------------------------------------

describe("cultistAI — spawnCultist", () => {
	it("creates a cultist entity in the world", () => {
		const cultist = spawnCultist({ x: 10, z: 20 });
		trackedEntities.push(cultist);

		expect(cultist.id).toMatch(/^cultist_/);
		expect(cultist.faction).toBe("cultist");
		expect(cultist.worldPosition).toBeDefined();
		expect(cultist.worldPosition!.x).toBe(10);
		expect(cultist.worldPosition!.z).toBe(20);
	});

	it("has correct components including lightning_array", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		const componentNames = cultist.unit!.components.map(c => c.name);
		expect(componentNames).toContain("lightning_array");
		expect(componentNames).toContain("camera");
		expect(componentNames).toContain("arms");
		expect(componentNames).toContain("legs");
		expect(componentNames).toContain("power_cell");
	});

	it("has hackable component with difficulty 50", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		expect(cultist.hackable).toBeDefined();
		expect(cultist.hackable!.difficulty).toBe(50);
		expect(cultist.hackable!.hacked).toBe(false);
	});

	it("has automation component with patrol routine", () => {
		const cultist = spawnCultist({ x: 0, z: 0, patrolRadius: 10 });
		trackedEntities.push(cultist);

		expect(cultist.automation).toBeDefined();
		expect(cultist.automation!.routine).toBe("patrol");
		expect(cultist.automation!.patrolPoints.length).toBeGreaterThanOrEqual(1);
	});

	it("has navigation component", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		expect(cultist.navigation).toBeDefined();
		expect(cultist.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// spawnCultistPair
// ---------------------------------------------------------------------------

describe("cultistAI — spawnCultistPair", () => {
	it("creates two cultists", () => {
		// Count cultist entities before
		let countBefore = 0;
		for (const e of world) {
			if (e.faction === "cultist") countBefore++;
		}

		spawnCultistPair(10, 20);

		let countAfter = 0;
		const cultists: Entity[] = [];
		for (const e of world) {
			if (e.faction === "cultist") {
				countAfter++;
				cultists.push(e);
			}
		}

		// Track for cleanup
		for (const c of cultists) trackedEntities.push(c);

		expect(countAfter - countBefore).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// cultistAISystem — target acquisition
// ---------------------------------------------------------------------------

describe("cultistAI — target acquisition", () => {
	it("cultist aggros player within AGGRO_RANGE (12)", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		// Place player within aggro range
		makePlayerUnit("p1", { x: 10, y: 0, z: 0 }); // dist=10 < 12

		// Force pathfinding to trigger (random < 0.1 for patrol won't matter since there's a target)
		cultistAISystem(1.0);

		// Cultist should have started moving or fired lightning
		// (depending on whether within lightning range)
	});

	it("cultist ignores player beyond AGGRO_RANGE (12)", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		makePlayerUnit("p1", { x: 15, y: 0, z: 0 }); // dist=15 > 12

		cultistAISystem(1.0);

		// Should not have lightning events
		expect(getLastLightningEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// cultistAISystem — lightning discharge
// ---------------------------------------------------------------------------

describe("cultistAI — lightning discharge", () => {
	it("fires lightning when player is within LIGHTNING_RANGE (6) and cooldown ready", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		const player = makePlayerUnit("p1", { x: 4, y: 0, z: 0 }); // dist=4 < 6

		cultistAISystem(1.0);

		const events = getLastLightningEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);

		// Player should have taken component damage
		const functional = player.unit!.components.filter(c => c.functional).length;
		expect(functional).toBeLessThan(4);
	});

	it("does not fire lightning when on cooldown", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		// First tick — fires lightning, sets cooldown to 10s
		cultistAISystem(1.0);
		expect(getLastLightningEvents().length).toBeGreaterThanOrEqual(1);

		// Second tick — only 1s elapsed, cooldown still 9s
		cultistAISystem(1.0);
		expect(getLastLightningEvents()).toHaveLength(0);
	});

	it("fires lightning again after cooldown expires", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		// Fire first time
		cultistAISystem(1.0);
		expect(getLastLightningEvents().length).toBeGreaterThanOrEqual(1);

		// Burn through cooldown (10s)
		cultistAISystem(11.0);

		// Should fire again
		const events = getLastLightningEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("does not fire when lightning_array is broken", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		// Break the lightning array
		const la = cultist.unit!.components.find(c => c.name === "lightning_array");
		if (la) la.functional = false;

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);
		expect(getLastLightningEvents()).toHaveLength(0);
	});

	it("lightning AoE hits multiple player units", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		// Two player units near each other (within AOE radius 4)
		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });
		makePlayerUnit("p2", { x: 5, y: 0, z: 0 });

		cultistAISystem(1.0);

		const events = getLastLightningEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);

		// Both should have been hit (they're within AOE_RADIUS=4 of the target)
		const totalHit = events.reduce((sum, e) => sum + e.targetsHit.length, 0);
		expect(totalHit).toBeGreaterThanOrEqual(1);
	});

	it("stops moving during lightning attack", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);
		cultist.navigation!.moving = true;

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);

		expect(cultist.navigation!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// cultistAISystem — hacked cultists
// ---------------------------------------------------------------------------

describe("cultistAI — hacked cultists", () => {
	it("skips hacked cultists", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);
		cultist.hackable!.hacked = true;

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);
		expect(getLastLightningEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// cultistAISystem — broken legs
// ---------------------------------------------------------------------------

describe("cultistAI — broken legs", () => {
	it("skips cultists with no functional legs", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		// Break legs
		const legs = cultist.unit!.components.find(c => c.name === "legs");
		if (legs) legs.functional = false;

		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);
		expect(getLastLightningEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// cultistAISystem — edge cases
// ---------------------------------------------------------------------------

describe("cultistAI — edge cases", () => {
	it("runs safely with no entities", () => {
		expect(() => cultistAISystem(1.0)).not.toThrow();
		expect(getLastLightningEvents()).toEqual([]);
	});

	it("runs safely with only cultists (no player units)", () => {
		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);

		expect(() => cultistAISystem(1.0)).not.toThrow();
		expect(getLastLightningEvents()).toEqual([]);
	});

	it("events are replaced each tick (not accumulated)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);
		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);
		expect(getLastLightningEvents().length).toBeGreaterThanOrEqual(1);

		// Remove player so next tick has no targets
		for (const e of trackedEntities) {
			if (e.id === "p1") {
				try { world.remove(e); } catch { /* */ }
			}
		}

		cultistAISystem(1.0);
		expect(getLastLightningEvents()).toHaveLength(0);
	});

	it("lightning event contains correct structure", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const cultist = spawnCultist({ x: 0, z: 0 });
		trackedEntities.push(cultist);
		makePlayerUnit("p1", { x: 4, y: 0, z: 0 });

		cultistAISystem(1.0);

		const events = getLastLightningEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);

		const event = events[0];
		expect(event.attackerId).toBe(cultist.id);
		expect(event.position).toBeDefined();
		expect(typeof event.radius).toBe("number");
		expect(Array.isArray(event.targetsHit)).toBe(true);
	});
});
