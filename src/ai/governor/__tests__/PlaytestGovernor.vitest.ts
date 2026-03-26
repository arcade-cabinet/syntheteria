/**
 * Tests for the PlaytestGovernor — automated player AI for playtesting.
 *
 * Tests governor decision-making with a real Koota ECS world:
 * - Exploration targeting for idle units
 * - Attack behavior when enemies are nearby
 * - Base founding when resource conditions are met
 * - Scavenge behavior near resource sites
 * - Tick interval gating
 * - Auto-play enable/disable
 */

import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
} from "../../../ecs/traits";
import { world } from "../../../ecs/world";
import {
	clearGovernorLog,
	disableAutoPlay,
	enableAutoPlay,
	getGovernorLog,
	governorTick,
	isAutoPlayEnabled,
	resetGovernor,
} from "../PlaytestGovernor";

// ─── Mock resources to control governor decisions ────────────────────────────

vi.mock("../../../systems/resources", () => ({
	getResources: vi.fn(() => ({
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
	})),
}));

// Mock base management to avoid zone validation issues in tests
vi.mock("../../../systems/baseManagement", () => ({
	validateBaseLocation: vi.fn(() => null), // Always valid
	foundBase: vi.fn(() => {
		// Return a minimal mock entity
		return { get: () => ({ value: "mock_base" }) };
	}),
}));

// Mock terrain walkability
vi.mock("../../../ecs/terrain", () => ({
	isWalkable: vi.fn(() => true),
	getTerrainHeight: vi.fn(() => 0),
}));

import {
	foundBase,
	validateBaseLocation,
} from "../../../systems/baseManagement";
import { getResources } from "../../../systems/resources";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const entities: Entity[] = [];

function spawnPlayerUnit(x: number, z: number, name = "Test Bot"): Entity {
	const entity = world.spawn(
		EntityId({ value: `test_unit_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: name,
			speed: 3,
			selected: false,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(entity);
	return entity;
}

function spawnEnemyUnit(x: number, z: number): Entity {
	const entity = world.spawn(
		EntityId({ value: `test_enemy_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "feral" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Feral Bot",
			speed: 2,
			selected: false,
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(entity);
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
	entities.push(entity);
	return entity;
}

beforeEach(() => {
	resetGovernor();
	vi.mocked(getResources).mockReturnValue({
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
	});
	vi.mocked(validateBaseLocation).mockReturnValue(null);
	vi.mocked(foundBase).mockClear();
});

afterEach(() => {
	for (const entity of entities) {
		try {
			entity.destroy();
		} catch {
			// Entity may already be destroyed
		}
	}
	entities.length = 0;
	resetGovernor();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("auto-play enable/disable", () => {
	it("starts disabled", () => {
		expect(isAutoPlayEnabled()).toBe(false);
	});

	it("can be enabled", () => {
		enableAutoPlay();
		expect(isAutoPlayEnabled()).toBe(true);
	});

	it("can be disabled after enabling", () => {
		enableAutoPlay();
		disableAutoPlay();
		expect(isAutoPlayEnabled()).toBe(false);
	});
});

describe("tick interval", () => {
	it("returns empty on non-interval ticks", () => {
		spawnPlayerUnit(10, 10);

		// TICK_INTERVAL = 10, so ticks 1-9 should return empty
		for (let t = 1; t <= 9; t++) {
			const actions = governorTick(world, t);
			expect(actions).toHaveLength(0);
		}
	});

	it("runs on interval ticks (multiples of 10)", () => {
		spawnPlayerUnit(10, 10);

		const actions = governorTick(world, 10);
		expect(actions.length).toBeGreaterThan(0);
	});

	it("runs on tick 0", () => {
		spawnPlayerUnit(10, 10);

		const actions = governorTick(world, 0);
		expect(actions.length).toBeGreaterThan(0);
	});
});

describe("exploration", () => {
	it("assigns exploration targets to idle units", () => {
		spawnPlayerUnit(50, 50);

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("explore");
		expect(actions[0]!.targetX).toBeDefined();
		expect(actions[0]!.targetZ).toBeDefined();
	});

	it("does not explore if unit is already moving", () => {
		const unit = spawnPlayerUnit(50, 50);
		unit.set(Navigation, {
			pathJson: JSON.stringify([{ x: 100, y: 0, z: 100 }]),
			pathIndex: 0,
			moving: true,
		});

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("idle");
	});

	it("sets navigation on the unit after exploration decision", () => {
		const unit = spawnPlayerUnit(50, 50);

		governorTick(world, 10);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(true);
		expect(nav.pathJson).not.toBe("[]");
	});
});

describe("attack", () => {
	it("attacks nearby enemies instead of exploring", () => {
		spawnPlayerUnit(50, 50);
		spawnEnemyUnit(55, 50); // 5 units away, within AGGRO_RANGE=12

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("attack");
		expect(actions[0]!.targetX).toBe(55);
		expect(actions[0]!.targetZ).toBe(50);
	});

	it("does not attack enemies outside aggro range", () => {
		spawnPlayerUnit(50, 50);
		spawnEnemyUnit(200, 200); // Far away

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).not.toBe("attack");
	});
});

describe("scavenge", () => {
	it("stays idle near scavenge sites to auto-scavenge", () => {
		spawnPlayerUnit(50, 50);
		spawnScavengeSite(52, 50); // 2 units away, within SCAVENGE_RANGE=5

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("scavenge");
	});

	it("prefers attacking over scavenging", () => {
		spawnPlayerUnit(50, 50);
		spawnScavengeSite(52, 50); // Nearby scavenge
		spawnEnemyUnit(55, 50); // Nearby enemy

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("attack");
	});

	it("ignores depleted scavenge sites", () => {
		spawnPlayerUnit(50, 50);
		const site = spawnScavengeSite(52, 50);
		site.set(ScavengeSite, { remaining: 0 });

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).not.toBe("scavenge");
	});
});

describe("found base", () => {
	it("founds a base when resources are sufficient", () => {
		spawnPlayerUnit(50, 50);

		vi.mocked(getResources).mockReturnValue({
			scrapMetal: 5,
			circuitry: 2,
			powerCells: 1,
			durasteel: 0,
		});

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).toBe("found_base");
		expect(foundBase).toHaveBeenCalled();
	});

	it("does not found base when resources are insufficient", () => {
		spawnPlayerUnit(50, 50);

		vi.mocked(getResources).mockReturnValue({
			scrapMetal: 1,
			circuitry: 0,
			powerCells: 0,
			durasteel: 0,
		});

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).not.toBe("found_base");
	});

	it("does not found base when location is invalid", () => {
		spawnPlayerUnit(50, 50);

		vi.mocked(getResources).mockReturnValue({
			scrapMetal: 10,
			circuitry: 5,
			powerCells: 0,
			durasteel: 0,
		});
		vi.mocked(validateBaseLocation).mockReturnValue(
			"Too close to existing base",
		);

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(1);
		expect(actions[0]!.action).not.toBe("found_base");
		expect(foundBase).not.toHaveBeenCalled();
	});
});

describe("governor log", () => {
	it("logs actions taken", () => {
		spawnPlayerUnit(50, 50);

		governorTick(world, 10);

		const log = getGovernorLog();
		expect(log.length).toBeGreaterThan(0);
	});

	it("clearGovernorLog empties the log", () => {
		spawnPlayerUnit(50, 50);
		governorTick(world, 10);

		clearGovernorLog();
		expect(getGovernorLog()).toHaveLength(0);
	});

	it("does not log idle actions", () => {
		const unit = spawnPlayerUnit(50, 50);
		unit.set(Navigation, {
			pathJson: JSON.stringify([{ x: 100, y: 0, z: 100 }]),
			pathIndex: 0,
			moving: true,
		});

		governorTick(world, 10);

		const log = getGovernorLog();
		const idleActions = log.filter((a) => a.action === "idle");
		expect(idleActions).toHaveLength(0);
	});
});

describe("multiple units", () => {
	it("processes all player units", () => {
		spawnPlayerUnit(10, 10);
		spawnPlayerUnit(50, 50);
		spawnPlayerUnit(90, 90);

		const actions = governorTick(world, 10);

		expect(actions.length).toBe(3);
	});

	it("returns empty when no player units exist", () => {
		// Only spawn enemies
		spawnEnemyUnit(50, 50);

		const actions = governorTick(world, 10);
		expect(actions).toHaveLength(0);
	});
});
