/**
 * Unit tests for the FPS combat system.
 *
 * Tests cover:
 * - fireWelder: raycasting weapon that damages enemies within range + cone
 * - fpsCombatSystem: enemy retaliation against player bot within melee range
 * - getLastHitResult: hit/miss state for HUD crosshair feedback
 * - Component-based damage and unit destruction
 * - Edge cases: no player bot, broken arms, no enemies, out of range
 */

// Mock the resources module so we can inspect salvage drops without side effects.
jest.mock("../resources", () => ({
	addResource: jest.fn(),
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
import { fireWelder, fpsCombatSystem, getLastHitResult } from "../fpsCombat";
import { addResource } from "../resources";

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

/** Spawn a player bot (playerControlled + unit + worldPosition). */
function makePlayerBot(
	id: string,
	pos: { x: number; y: number; z: number },
	opts: {
		components?: UnitComponent[];
		yaw?: number;
		pitch?: number;
		isActive?: boolean;
	} = {},
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
		playerControlled: {
			isActive: opts.isActive ?? true,
			yaw: opts.yaw ?? 0,
			pitch: opts.pitch ?? 0,
		},
	} as Partial<Entity> as Entity);
	trackedEntities.push(entity);
	return entity;
}

/** Spawn a non-player enemy unit. */
function makeEnemy(
	id: string,
	faction: Entity["faction"],
	pos: { x: number; y: number; z: number },
	opts: {
		components?: UnitComponent[];
		navigation?: boolean;
	} = {},
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
		...(opts.navigation !== false
			? { navigation: { path: [], pathIndex: 0, moving: false } }
			: {}),
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
			// already removed by destroyUnit
		}
	}
	trackedEntities.length = 0;
});

// ---------------------------------------------------------------------------
// getLastHitResult
// ---------------------------------------------------------------------------

describe("fpsCombat — getLastHitResult", () => {
	it("returns initial state with hit=false", () => {
		const result = getLastHitResult();
		expect(result.hit).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// fireWelder — no player bot
// ---------------------------------------------------------------------------

describe("fpsCombat — fireWelder no player", () => {
	it("does nothing when no active player bot exists", () => {
		// No player bot in world
		expect(() => fireWelder()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// fireWelder — arms requirement
// ---------------------------------------------------------------------------

describe("fpsCombat — fireWelder arms", () => {
	it("reports miss when player bot has no functional arms", () => {
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, {
			components: makeComponents({ arms: false }),
		});
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -2 }); // directly ahead

		fireWelder();
		const result = getLastHitResult();
		expect(result.hit).toBe(false);
	});

	it("can fire when player bot has functional arms", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		// yaw=0, forward = (0, -1) in XZ (fwdX = -sin(0)=0, fwdZ = -cos(0)=-1)
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 }); // directly in front

		fireWelder();
		const result = getLastHitResult();
		expect(result.hit).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// fireWelder — range and cone
// ---------------------------------------------------------------------------

describe("fpsCombat — fireWelder range", () => {
	it("hits enemy within WELDER_RANGE (6)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		// yaw=0 => forward is (0, -1)
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -5 }); // dist=5 < 6

		fireWelder();
		expect(getLastHitResult().hit).toBe(true);
	});

	it("misses enemy beyond WELDER_RANGE (6)", () => {
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -7 }); // dist=7 > 6

		fireWelder();
		expect(getLastHitResult().hit).toBe(false);
	});

	it("misses enemy outside the ~30 degree cone (dot < 0.85)", () => {
		// yaw=0 => forward = (0, -1)
		// Enemy at (5, 0, -3): angle = atan2(5, 3) ~ 59 degrees off axis
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 5, y: 0, z: -3 });

		fireWelder();
		expect(getLastHitResult().hit).toBe(false);
	});

	it("hits the closest enemy when multiple are in range", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		const nearEnemy = makeEnemy("e_near", "feral", { x: 0, y: 0, z: -2 });
		makeEnemy("e_far", "feral", { x: 0, y: 0, z: -5 });

		fireWelder();
		expect(getLastHitResult().hit).toBe(true);

		// Near enemy should have taken damage (one component broken)
		const nearFunctional = nearEnemy.unit!.components.filter(c => c.functional).length;
		expect(nearFunctional).toBeLessThan(4);
	});
});

// ---------------------------------------------------------------------------
// fireWelder — skips player faction
// ---------------------------------------------------------------------------

describe("fpsCombat — fireWelder faction filtering", () => {
	it("does not target player faction units", () => {
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		// Another player unit in front
		const ally = makeEnemy("p2", "player", { x: 0, y: 0, z: -3 });

		fireWelder();
		expect(getLastHitResult().hit).toBe(false);
		// Ally should be undamaged
		const allyFunctional = ally.unit!.components.filter(c => c.functional).length;
		expect(allyFunctional).toBe(4);
	});

	it("skips enemies with all components broken", () => {
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 }, {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		fireWelder();
		expect(getLastHitResult().hit).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// fireWelder — component damage and destruction
// ---------------------------------------------------------------------------

describe("fpsCombat — fireWelder damage", () => {
	it("breaks a functional component on the target", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		const enemy = makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 });

		const functionalBefore = enemy.unit!.components.filter(c => c.functional).length;
		fireWelder();
		const functionalAfter = enemy.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBe(functionalBefore - 1);
	});

	it("destroys enemy when all components are broken by welder", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		// Enemy with one component — will be destroyed
		const fragile: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 }, { components: fragile });

		fireWelder();

		expect(getLastHitResult().hit).toBe(true);
		// addResource should have been called for salvage
		expect(addResource).toHaveBeenCalledWith("scrapMetal", expect.any(Number));
	});

	it("reports miss when target has no functional components left", () => {
		// Enemy has no functional components — dealComponentDamage returns null
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { yaw: 0 });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 }, {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		fireWelder();
		expect(getLastHitResult().hit).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// fpsCombatSystem — enemy retaliation
// ---------------------------------------------------------------------------

describe("fpsCombat — enemy retaliation", () => {
	it("does nothing when no active player bot exists", () => {
		makeEnemy("e1", "feral", { x: 0, y: 0, z: 0 });
		expect(() => fpsCombatSystem(0.016)).not.toThrow();
	});

	it("enemies within ENEMY_MELEE_RANGE (5) can damage player bot", () => {
		// Ensure every attack lands
		jest.spyOn(Math, "random").mockReturnValue(0);

		const bot = makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 3, y: 0, z: 0 }); // dist=3 < 5

		const functionalBefore = bot.unit!.components.filter(c => c.functional).length;
		fpsCombatSystem(0.016);
		const functionalAfter = bot.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBeLessThan(functionalBefore);
	});

	it("enemies beyond ENEMY_MELEE_RANGE (5) do not attack", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const bot = makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 6, y: 0, z: 0 }); // dist=6 > 5

		const functionalBefore = bot.unit!.components.filter(c => c.functional).length;
		fpsCombatSystem(0.016);
		const functionalAfter = bot.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBe(functionalBefore);
	});

	it("skips enemies with all components broken", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const bot = makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 2, y: 0, z: 0 }, {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		const functionalBefore = bot.unit!.components.filter(c => c.functional).length;
		fpsCombatSystem(0.016);
		const functionalAfter = bot.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBe(functionalBefore);
	});

	it("skips player faction enemies", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const bot = makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		// Ally unit should not attack
		makeEnemy("p2", "player", { x: 2, y: 0, z: 0 });

		const functionalBefore = bot.unit!.components.filter(c => c.functional).length;
		fpsCombatSystem(0.016);
		const functionalAfter = bot.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBe(functionalBefore);
	});

	it("does not attack when player bot has no functional components", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});
		makeEnemy("e1", "feral", { x: 2, y: 0, z: 0 });

		// Should not throw, just skip
		expect(() => fpsCombatSystem(0.016)).not.toThrow();
	});

	it("stops enemy navigation during combat", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		const enemy = makeEnemy("e1", "feral", { x: 2, y: 0, z: 0 });
		enemy.navigation!.moving = true;

		fpsCombatSystem(0.016);

		expect(enemy.navigation!.moving).toBe(false);
	});

	it("does not crash when enemy has no navigation component", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 2, y: 0, z: 0 }, { navigation: false });

		expect(() => fpsCombatSystem(0.016)).not.toThrow();
	});

	it("probability check prevents most attacks per frame (ENEMY_ATTACK_CHANCE = 0.02)", () => {
		// random returns 0.5 > 0.02 => attack chance fails
		jest.spyOn(Math, "random").mockReturnValue(0.5);

		const bot = makePlayerBot("p1", { x: 0, y: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 2, y: 0, z: 0 });

		const functionalBefore = bot.unit!.components.filter(c => c.functional).length;
		fpsCombatSystem(0.016);
		const functionalAfter = bot.unit!.components.filter(c => c.functional).length;

		expect(functionalAfter).toBe(functionalBefore);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("fpsCombat — edge cases", () => {
	it("runs safely with no entities in the world", () => {
		expect(() => fpsCombatSystem(0.016)).not.toThrow();
		expect(() => fireWelder()).not.toThrow();
	});

	it("inactive player bot is ignored", () => {
		makePlayerBot("p1", { x: 0, y: 0, z: 0 }, { isActive: false });
		makeEnemy("e1", "feral", { x: 0, y: 0, z: -3 });

		// fireWelder should do nothing (no active bot)
		fireWelder();
		expect(getLastHitResult().hit).toBe(false);

		// fpsCombatSystem should also do nothing
		expect(() => fpsCombatSystem(0.016)).not.toThrow();
	});
});
