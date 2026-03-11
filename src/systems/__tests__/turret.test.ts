/**
 * Unit tests for the turret system.
 *
 * Tests cover:
 * - Target selection (nearest enemy within range)
 * - Cooldown tracking (fireRateTicks delay between shots)
 * - Power requirement (unpowered/non-operational turrets skip)
 * - Hit chance roll (hitChance = 0.7 from config)
 * - Component damage on hit (random functional component broken)
 * - Target destruction when all components broken
 * - Salvage drops on destruction (uses combat.json multipliers)
 * - Range checks (enemies beyond turret range ignored)
 * - Faction filtering (player and wildlife ignored)
 * - Edge cases: no enemies, no turrets, already-destroyed targets
 * - Event recording (getLastTurretEvents)
 * - resetTurrets clears state
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../resources", () => ({
	addResource: jest.fn(),
}));

const mockBuildings: import("../../ecs/types").BuildingEntity[] = [];
const mockUnits: import("../../ecs/types").UnitEntity[] = [];

jest.mock("../../ecs/world", () => ({
	buildings: mockBuildings,
	units: mockUnits,
	world: {
		remove: jest.fn((entity: import("../../ecs/types").Entity) => {
			const idx = mockUnits.findIndex((u) => u.id === entity.id);
			if (idx >= 0) mockUnits.splice(idx, 1);
		}),
	},
}));

// Also mock the Koota compat layer (turret.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	buildings: mockBuildings,
	units: mockUnits,
}));

jest.mock("../../../config", () => ({
	config: {
		buildings: {
			defense: {
				turret: {
					powerRequired: 2,
					range: 12,
					damage: 1,
					fireRateTicks: 4,
					hitChance: 0.7,
					defaultComponents: [
						{ name: "targeting_sensor", functional: true, material: "electronic" },
						{ name: "barrel", functional: true, material: "metal" },
						{ name: "ammo_feed", functional: true, material: "metal" },
					],
				},
			},
		},
		combat: {
			salvageScrapMultiplier: 1.5,
			salvageEWasteChance: 0.5,
		},
	},
}));

import type { BuildingEntity, Entity, UnitComponent, UnitEntity } from "../../ecs/types";
import {
	getLastTurretEvents,
	resetTurrets,
	turretSystem,
} from "../turret";
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

function makeTurret(
	id: string,
	pos: { x: number; z: number },
	opts: { powered?: boolean; operational?: boolean } = {},
): BuildingEntity {
	const entity = {
		id,
		faction: "player" as const,
		worldPosition: { x: pos.x, y: 0, z: pos.z },
		building: {
			type: "turret",
			powered: opts.powered ?? true,
			operational: opts.operational ?? true,
			selected: false,
			components: [
				{ name: "targeting_sensor", functional: true, material: "electronic" as const },
				{ name: "barrel", functional: true, material: "metal" as const },
				{ name: "ammo_feed", functional: true, material: "metal" as const },
			],
		},
	} as BuildingEntity;
	mockBuildings.push(entity);
	return entity;
}

function makeEnemy(
	id: string,
	faction: Entity["faction"],
	pos: { x: number; z: number },
	opts: { components?: UnitComponent[] } = {},
): UnitEntity {
	const entity = {
		id,
		faction,
		worldPosition: { x: pos.x, y: 0, z: pos.z },
		mapFragment: { fragmentId: "test_frag" },
		unit: {
			type: "maintenance_bot" as const,
			displayName: id,
			speed: 3,
			selected: false,
			components: opts.components ?? makeComponents(),
		},
	} as UnitEntity;
	mockUnits.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	resetTurrets();
	mockBuildings.length = 0;
	mockUnits.length = 0;
});

// ---------------------------------------------------------------------------
// Basic firing
// ---------------------------------------------------------------------------

describe("turret — basic firing", () => {
	it("fires at a feral enemy within range", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
		expect(events[0].turretId).toBe("t1");
		expect(events[0].targetId).toBe("e1");
	});

	it("fires at a cultist enemy within range", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "cultist", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
		expect(events[0].targetId).toBe("e1");
	});

	it("fires at a rogue enemy within range", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "rogue", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
		expect(events[0].targetId).toBe("e1");
	});

	it("damages a component on hit", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const enemy = makeEnemy("e1", "feral", { x: 5, z: 0 });

		const functionalBefore = enemy.unit.components.filter((c) => c.functional).length;

		turretSystem();

		const functionalAfter = enemy.unit.components.filter((c) => c.functional).length;
		expect(functionalAfter).toBe(functionalBefore - 1);
	});
});

// ---------------------------------------------------------------------------
// Range checks
// ---------------------------------------------------------------------------

describe("turret — range", () => {
	it("does NOT fire at enemies beyond range (12)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 13, z: 0 }); // dist = 13 > 12

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});

	it("fires at enemy exactly at range boundary (< range)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 11, z: 0 }); // dist = 11 < 12

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
	});

	it("targets the nearest enemy when multiple are in range", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e_far", "feral", { x: 10, z: 0 });
		makeEnemy("e_near", "feral", { x: 3, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
		expect(events[0].targetId).toBe("e_near");
	});

	it("uses 2D distance (ignores Y)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const enemy = makeEnemy("e1", "feral", { x: 5, z: 0 });
		enemy.worldPosition.y = 100; // should be ignored

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Faction filtering
// ---------------------------------------------------------------------------

describe("turret — faction filtering", () => {
	it("does NOT target player units", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("p1", "player", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});

	it("does NOT target wildlife", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("w1", "wildlife", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});

	it("skips enemies with all components broken", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const brokenComps = makeComponents({
			camera: false,
			arms: false,
			legs: false,
			power_cell: false,
		});
		makeEnemy("e1", "feral", { x: 5, z: 0 }, { components: brokenComps });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Power requirement
// ---------------------------------------------------------------------------

describe("turret — power requirement", () => {
	it("does NOT fire when unpowered", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 }, { powered: false });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});

	it("does NOT fire when not operational", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 }, { operational: false });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(0);
	});

	it("fires again when power is restored", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const turret = makeTurret("t1", { x: 0, z: 0 }, { powered: false });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(0);

		// Restore power
		turret.building.powered = true;

		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Cooldown
// ---------------------------------------------------------------------------

describe("turret — cooldown", () => {
	it("cannot fire again until cooldown expires (fireRateTicks = 4)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		// First tick: fires
		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(1);

		// Ticks 2-5: on cooldown (4 ticks)
		for (let i = 0; i < 4; i++) {
			turretSystem();
			expect(getLastTurretEvents()).toHaveLength(0);
		}

		// Tick 6: cooldown expired, fires again
		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(1);
	});

	it("cooldown is per-turret (different turrets have independent cooldowns)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeTurret("t2", { x: 20, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });
		makeEnemy("e2", "feral", { x: 25, z: 0 });

		// Both fire on tick 1
		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(2);

		// Both on cooldown
		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Hit chance
// ---------------------------------------------------------------------------

describe("turret — hit chance", () => {
	it("misses when random exceeds hitChance (0.7)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0.8); // > 0.7

		makeTurret("t1", { x: 0, z: 0 });
		const enemy = makeEnemy("e1", "feral", { x: 5, z: 0 });

		const functionalBefore = enemy.unit.components.filter((c) => c.functional).length;

		turretSystem();

		// Should fire (event recorded) but miss (no component damaged)
		const events = getLastTurretEvents();
		expect(events).toHaveLength(1);
		expect(events[0].componentDamaged).toBeNull();

		const functionalAfter = enemy.unit.components.filter((c) => c.functional).length;
		expect(functionalAfter).toBe(functionalBefore);
	});

	it("hits when random is below hitChance (0.7)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();

		const events = getLastTurretEvents();
		expect(events).toHaveLength(1);
		expect(events[0].componentDamaged).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Destruction
// ---------------------------------------------------------------------------

describe("turret — destruction", () => {
	it("destroys target when last functional component is broken", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const oneComp: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makeEnemy("e1", "feral", { x: 5, z: 0 }, { components: oneComp });

		turretSystem();

		const events = getLastTurretEvents();
		expect(events).toHaveLength(1);
		expect(events[0].targetDestroyed).toBe(true);
	});

	it("does NOT destroy target with remaining functional components", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 }); // 4 components

		turretSystem();

		const events = getLastTurretEvents();
		expect(events).toHaveLength(1);
		expect(events[0].targetDestroyed).toBe(false);
	});

	it("drops salvage on destruction (scrapMetal from combat config)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const oneComp: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makeEnemy("e1", "feral", { x: 5, z: 0 }, { components: oneComp });

		turretSystem();

		// componentCount = 1, Math.floor(1 * 1.5) = 1
		expect(addResource).toHaveBeenCalledWith("scrapMetal", 1);
	});

	it("drops eWaste on destruction when random < salvageEWasteChance", () => {
		const randomSequence = [
			0, // hitChance check (0 < 0.7 => hit)
			0, // component pick index
			0.3, // eWaste roll (0.3 < 0.5 => drop)
		];
		let idx = 0;
		jest.spyOn(Math, "random").mockImplementation(() => {
			const val = randomSequence[idx % randomSequence.length];
			idx++;
			return val;
		});

		makeTurret("t1", { x: 0, z: 0 });
		const oneComp: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makeEnemy("e1", "feral", { x: 5, z: 0 }, { components: oneComp });

		turretSystem();

		const eWasteCalls = (addResource as ReturnType<typeof jest.fn>).mock.calls.filter(
			(call: unknown[]) => call[0] === "eWaste",
		);
		expect(eWasteCalls).toHaveLength(1);
	});

	it("removes destroyed entity from world", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		const oneComp: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makeEnemy("e1", "feral", { x: 5, z: 0 }, { components: oneComp });

		expect(mockUnits).toHaveLength(1);

		turretSystem();

		// world.remove should have been called, which splices from mockUnits
		expect(mockUnits).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Event recording
// ---------------------------------------------------------------------------

describe("turret — event recording", () => {
	it("getLastTurretEvents returns empty array when no turrets", () => {
		turretSystem();
		expect(getLastTurretEvents()).toEqual([]);
	});

	it("events are replaced each tick (not accumulated)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(1);

		// Next tick: on cooldown, no events
		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("turret — resetTurrets", () => {
	it("clears cooldowns so turret can fire immediately after reset", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem(); // fires, sets cooldown
		expect(getLastTurretEvents()).toHaveLength(1);

		turretSystem(); // on cooldown
		expect(getLastTurretEvents()).toHaveLength(0);

		resetTurrets();

		turretSystem(); // cooldown cleared, fires again
		expect(getLastTurretEvents()).toHaveLength(1);
	});

	it("clears events", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(1);

		resetTurrets();
		expect(getLastTurretEvents()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("turret — edge cases", () => {
	it("runs safely with no buildings", () => {
		expect(() => turretSystem()).not.toThrow();
		expect(getLastTurretEvents()).toEqual([]);
	});

	it("runs safely with turrets but no enemies", () => {
		makeTurret("t1", { x: 0, z: 0 });

		expect(() => turretSystem()).not.toThrow();
		expect(getLastTurretEvents()).toEqual([]);
	});

	it("non-turret buildings are ignored", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		// Add a furnace building — should not trigger turret logic
		const furnace = {
			id: "furnace1",
			faction: "player" as const,
			worldPosition: { x: 0, y: 0, z: 0 },
			building: {
				type: "furnace",
				powered: true,
				operational: true,
				selected: false,
				components: [],
			},
		} as BuildingEntity;
		mockBuildings.push(furnace);

		makeEnemy("e1", "feral", { x: 5, z: 0 });

		turretSystem();
		expect(getLastTurretEvents()).toHaveLength(0);
	});

	it("multiple turrets can fire at different targets in the same tick", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeTurret("t1", { x: 0, z: 0 });
		makeTurret("t2", { x: 50, z: 0 });
		makeEnemy("e1", "feral", { x: 5, z: 0 });
		makeEnemy("e2", "feral", { x: 55, z: 0 });

		turretSystem();
		const events = getLastTurretEvents();

		expect(events).toHaveLength(2);
		const turretIds = events.map((e) => e.turretId);
		expect(turretIds).toContain("t1");
		expect(turretIds).toContain("t2");
	});
});
