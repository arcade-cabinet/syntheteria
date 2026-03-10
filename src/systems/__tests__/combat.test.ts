/**
 * Unit tests for the combat system.
 *
 * Tests cover:
 * - Component-based damage calculations (dealDamage via combatSystem)
 * - Melee damage exchange between hostile feral/player units
 * - Random component breakage mechanics (arm bonus, hit chance)
 * - Unit destruction when all components broken
 * - Faction hostility checks (feral attacks player only)
 * - Range/proximity requirements for melee (MELEE_RANGE = 2.5)
 * - Edge cases: already-destroyed units, same-faction units, zero damage
 * - Salvage resource drops on destruction
 * - Navigation halt during combat
 * - Retaliation mechanics
 * - Combat event recording
 */

// Mock the resources module so we can inspect salvage drops without side effects.
jest.mock("../resources", () => ({
	addResource: jest.fn(),
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import { combatSystem, getLastCombatEvents } from "../combat";
import { addResource } from "../resources";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard set of functional components for a unit. */
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

/** Spawn a unit in the ECS world and track it for cleanup. */
function makeUnit(
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

/** Make a feral attacker at a given position. */
function makeFeral(
	id: string,
	pos: { x: number; y: number; z: number },
	opts: { components?: UnitComponent[]; navigation?: boolean } = {},
): Entity {
	return makeUnit(id, "feral", pos, opts);
}

/** Make a player unit at a given position. */
function makePlayer(
	id: string,
	pos: { x: number; y: number; z: number },
	opts: { components?: UnitComponent[] } = {},
): Entity {
	return makeUnit(id, "player", pos, opts);
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
// Faction hostility checks
// ---------------------------------------------------------------------------

describe("combat — faction hostility", () => {
	it("feral units attack player units", () => {
		// Seed Math.random so attacks always land
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		// At minimum the feral should have attacked the player
		const feralAttacks = events.filter((e) => e.attackerId === "f1");
		expect(feralAttacks.length).toBeGreaterThanOrEqual(1);
	});

	it("player units do not initiate attacks (only retaliate)", () => {
		// Math.random = 0 ensures attack chance and hit chance both pass
		jest.spyOn(Math, "random").mockReturnValue(0);

		makePlayer("p1", { x: 0, y: 0, z: 0 });
		makePlayer("p2", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("feral units do not attack other feral units", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makeFeral("f2", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("feral units do not attack wildlife", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makeUnit("w1", "wildlife", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("non-feral factions do not initiate attacks", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeUnit("c1", "cultist", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Range / proximity requirements
// ---------------------------------------------------------------------------

describe("combat — melee range", () => {
	it("attacks when units are within MELEE_RANGE (2.5)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 2, y: 0, z: 0 }); // dist = 2.0 < 2.5

		combatSystem();
		const events = getLastCombatEvents();

		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("attacks when units are exactly at MELEE_RANGE boundary", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 2.5, y: 0, z: 0 }); // dist = 2.5 = MELEE_RANGE

		combatSystem();
		const events = getLastCombatEvents();

		// dist > MELEE_RANGE check means 2.5 > 2.5 is false, so attack proceeds
		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("does NOT attack when units are beyond MELEE_RANGE", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 3, y: 0, z: 0 }); // dist = 3.0 > 2.5

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("uses 2D distance (ignores Y axis)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 100, z: 0 }); // dx=1, dz=0, dy ignored

		combatSystem();
		const events = getLastCombatEvents();

		// dist = sqrt(1+0) = 1 < 2.5
		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("calculates diagonal distance correctly", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		// dist = sqrt(2*2 + 2*2) = sqrt(8) ≈ 2.83 > 2.5
		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 2, y: 0, z: 2 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Component-based damage
// ---------------------------------------------------------------------------

describe("combat — component damage", () => {
	it("breaks a functional component on the target", () => {
		// Math.random returns 0 for all rolls: attack chance, hit chance, component pick
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		const player = makePlayer("p1", { x: 1, y: 0, z: 0 });

		const functionalBefore = player.unit!.components.filter(
			(c) => c.functional,
		).length;

		combatSystem();

		const functionalAfter = player.unit!.components.filter(
			(c) => c.functional,
		).length;

		// The feral attacked, the player retaliated, so at least one component
		// on the player should be broken (feral attack), and possibly one on feral
		// (retaliation). We check the player lost at least one.
		expect(functionalAfter).toBeLessThan(functionalBefore);
	});

	it("records the damaged component name in the combat event", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		const player = makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		const feralAttackEvent = events.find((e) => e.attackerId === "f1");
		expect(feralAttackEvent).toBeDefined();

		// The damaged component should be one of the player's component names
		const componentNames = player.unit!.components.map((c) => c.name);
		expect(componentNames).toContain(feralAttackEvent!.componentDamaged);
	});

	it("does not break already-broken components", () => {
		// Start with only one functional component
		const components = makeComponents({
			camera: false,
			arms: false,
			legs: false,
			power_cell: true,
		});

		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components });

		combatSystem();
		const events = getLastCombatEvents();

		const feralAttack = events.find((e) => e.attackerId === "f1");
		if (feralAttack) {
			// The only functional component was power_cell
			expect(feralAttack.componentDamaged).toBe("power_cell");
		}
	});
});

// ---------------------------------------------------------------------------
// Arms bonus hit chance
// ---------------------------------------------------------------------------

describe("combat — arms bonus", () => {
	it("units with functional arms have higher hit chance (0.6 vs 0.3)", () => {
		// We test indirectly: with Math.random returning 0.5,
		// an attacker WITH arms (hitChance 0.6) hits,
		// but an attacker WITHOUT arms (hitChance 0.3) misses.
		const randomValues = [
			0, // ATTACK_CHANCE check (0 < 0.4 => passes)
			0.5, // hitChance check for feral's dealDamage (0.5 > 0.3 for no-arms => miss, 0.5 < 0.6 for arms => hit)
			0, // component pick index
		];
		let callIndex = 0;
		jest.spyOn(Math, "random").mockImplementation(() => {
			const val = randomValues[callIndex % randomValues.length];
			callIndex++;
			return val;
		});

		// Feral WITHOUT arms
		const noArmsComponents = makeComponents({ arms: false });
		makeFeral("f_noarms", { x: 0, y: 0, z: 0 }, { components: noArmsComponents });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const eventsNoArms = getLastCombatEvents();
		const feralAttackNoArms = eventsNoArms.filter(
			(e) => e.attackerId === "f_noarms",
		);

		// With random = 0.5 and no arms, hitChance is 0.3, so 0.5 > 0.3 => miss
		expect(feralAttackNoArms).toHaveLength(0);

		// Clean up
		for (const e of trackedEntities) {
			try {
				world.remove(e);
			} catch {
				/* */
			}
		}
		trackedEntities.length = 0;

		// Reset mock
		callIndex = 0;
		jest.spyOn(Math, "random").mockImplementation(() => {
			const val = randomValues[callIndex % randomValues.length];
			callIndex++;
			return val;
		});

		// Feral WITH arms
		makeFeral("f_arms", { x: 0, y: 0, z: 0 });
		makePlayer("p2", { x: 1, y: 0, z: 0 });

		combatSystem();
		const eventsArms = getLastCombatEvents();
		const feralAttackArms = eventsArms.filter(
			(e) => e.attackerId === "f_arms",
		);

		// With random = 0.5 and arms, hitChance is 0.6, so 0.5 < 0.6 => hit
		expect(feralAttackArms).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Attack chance (ATTACK_CHANCE = 0.4)
// ---------------------------------------------------------------------------

describe("combat — attack chance", () => {
	it("does not attack when random exceeds ATTACK_CHANCE (0.4)", () => {
		// random returns 0.5 > 0.4 => attack chance fails
		jest.spyOn(Math, "random").mockReturnValue(0.5);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("attacks when random is below ATTACK_CHANCE (0.4)", () => {
		// random returns 0 which passes all checks
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events.length).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Unit destruction
// ---------------------------------------------------------------------------

describe("combat — unit destruction", () => {
	it("destroys a unit when all components are broken", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		// Player with only one functional component — will be destroyed in one hit
		const fragileComponents: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: fragileComponents });

		combatSystem();
		const events = getLastCombatEvents();

		const destroyEvent = events.find(
			(e) => e.targetId === "p1" && e.targetDestroyed,
		);
		expect(destroyEvent).toBeDefined();
	});

	it("does not destroy a unit with remaining functional components", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		// Player with 4 functional components — one hit won't destroy it
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		const destroyEvents = events.filter((e) => e.targetDestroyed);
		const playerDestroyed = destroyEvents.some((e) => e.targetId === "p1");
		expect(playerDestroyed).toBe(false);
	});

	it("drops salvage resources on destruction", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		// One-component player will be destroyed
		const fragileComponents: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: fragileComponents });

		combatSystem();

		// addResource should have been called for scrapMetal
		// componentCount = 1, Math.floor(1 * 1.5) = 1
		expect(addResource).toHaveBeenCalledWith("scrapMetal", 1);
	});

	it("does not drop eWaste when random >= salvageEWasteChance", () => {
		// Control the random sequence so that the eWaste roll fails
		const randomSequence = [
			0, // ATTACK_CHANCE
			0, // hitChance for feral->player dealDamage
			0, // component index pick
			// retaliation won't matter — player destroyed
			0.6, // eWaste chance: 0.6 >= 0.5, so no drop (check is < salvageEWasteChance)
		];
		let idx = 0;
		jest.spyOn(Math, "random").mockImplementation(() => {
			const val = randomSequence[idx % randomSequence.length];
			idx++;
			return val;
		});

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		const fragileComponents: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: fragileComponents });

		combatSystem();

		// Math.random() returned 0.6 for the eWaste roll: 0.6 < 0.5 is false, so no eWaste
		const eWasteCalls = (addResource as ReturnType<typeof jest.fn>).mock.calls.filter(
			(call: unknown[]) => call[0] === "eWaste",
		);
		expect(eWasteCalls).toHaveLength(0);
	});

	it("drops eWaste when random < salvageEWasteChance in destroy path", () => {
		// Sequence: attack chance pass, hit, component pick, eWaste roll
		const randomSequence = [
			0, // ATTACK_CHANCE
			0, // hitChance
			0, // component pick
			0.3, // eWaste chance: 0.3 < 0.5 => drops
		];
		let idx = 0;
		jest.spyOn(Math, "random").mockImplementation(() => {
			const val = randomSequence[idx % randomSequence.length];
			idx++;
			return val;
		});

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		const fragileComponents: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: fragileComponents });

		combatSystem();

		const eWasteCalls = (addResource as ReturnType<typeof jest.fn>).mock.calls.filter(
			(call: unknown[]) => call[0] === "eWaste",
		);
		expect(eWasteCalls).toHaveLength(1);
		expect(eWasteCalls[0]).toEqual(["eWaste", 1]);
	});

	it("salvage scrapMetal scales with component count", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		// 3 components, but only 1 functional — will be destroyed
		// Math.floor(3 * 1.5) = 4
		const components: UnitComponent[] = [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "legs", functional: false, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components });

		combatSystem();

		expect(addResource).toHaveBeenCalledWith("scrapMetal", 4);
	});
});

// ---------------------------------------------------------------------------
// Already-destroyed / incapacitated units
// ---------------------------------------------------------------------------

describe("combat — already-destroyed units", () => {
	it("feral with all components broken does not attack", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const brokenComponents = makeComponents({
			camera: false,
			arms: false,
			legs: false,
			power_cell: false,
		});
		makeFeral("f_broken", { x: 0, y: 0, z: 0 }, { components: brokenComponents });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		expect(events).toHaveLength(0);
	});

	it("player with all components broken does not retaliate", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		const brokenComponents = makeComponents({
			camera: false,
			arms: false,
			legs: false,
			power_cell: false,
		});
		makePlayer("p_broken", { x: 1, y: 0, z: 0 }, { components: brokenComponents });

		combatSystem();
		const events = getLastCombatEvents();

		// Feral has no valid target with functional components to damage
		// (dealDamage returns null when no functional parts)
		const retaliations = events.filter((e) => e.attackerId === "p_broken");
		expect(retaliations).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Retaliation
// ---------------------------------------------------------------------------

describe("combat — retaliation", () => {
	it("player unit retaliates against feral attacker", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const feral = makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		// Should have events for both directions
		const feralAttacks = events.filter((e) => e.attackerId === "f1");
		const playerRetaliations = events.filter((e) => e.attackerId === "p1");

		expect(feralAttacks.length).toBeGreaterThanOrEqual(1);
		expect(playerRetaliations.length).toBeGreaterThanOrEqual(1);

		// The feral should have lost a component from retaliation
		const feralFunctional = feral.unit!.components.filter(
			(c) => c.functional,
		).length;
		expect(feralFunctional).toBeLessThan(4);
	});

	it("player does not retaliate when it has no functional components after being hit", () => {
		// Player has 1 component — feral destroys it, then player can't retaliate
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		const fragileComponents: UnitComponent[] = [
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: fragileComponents });

		combatSystem();
		const events = getLastCombatEvents();

		// Player should not have retaliated — their only component was broken
		const retaliations = events.filter((e) => e.attackerId === "p1");
		expect(retaliations).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Navigation halt during combat
// ---------------------------------------------------------------------------

describe("combat — navigation halt", () => {
	it("stops attacker navigation.moving during combat", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		const feral = makeFeral("f1", { x: 0, y: 0, z: 0 });
		feral.navigation!.moving = true;

		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();

		expect(feral.navigation!.moving).toBe(false);
	});

	it("does not crash when attacker has no navigation component", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f_nonav", { x: 0, y: 0, z: 0 }, { navigation: false });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		// Should not throw
		expect(() => combatSystem()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// One target per attacker per tick
// ---------------------------------------------------------------------------

describe("combat — one target per tick", () => {
	it("each feral attacks at most one player unit per tick", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });
		makePlayer("p2", { x: -1, y: 0, z: 0 }); // also in range

		combatSystem();
		const events = getLastCombatEvents();

		// f1 should only attack one of the two players
		const feralAttacks = events.filter((e) => e.attackerId === "f1");
		const targetIds = new Set(feralAttacks.map((e) => e.targetId));
		expect(targetIds.size).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Multiple ferals attacking
// ---------------------------------------------------------------------------

describe("combat — multiple attackers", () => {
	it("multiple ferals can attack in the same tick", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makeFeral("f2", { x: 0, y: 0, z: 1 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		const attackerIds = new Set(
			events.filter((e) => e.targetId === "p1").map((e) => e.attackerId),
		);
		// Both ferals can attack (they're both in range)
		expect(attackerIds.size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Combat events
// ---------------------------------------------------------------------------

describe("combat — event recording", () => {
	it("getLastCombatEvents returns empty array when no combat occurs", () => {
		combatSystem(); // no entities
		const events = getLastCombatEvents();
		expect(events).toEqual([]);
	});

	it("events are replaced each tick (not accumulated)", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const firstEvents = getLastCombatEvents();
		expect(firstEvents.length).toBeGreaterThan(0);

		// Remove all entities so second tick produces no events
		for (const e of trackedEntities) {
			try {
				world.remove(e);
			} catch {
				/* */
			}
		}
		trackedEntities.length = 0;

		combatSystem();
		const secondEvents = getLastCombatEvents();
		expect(secondEvents).toEqual([]);
	});

	it("event contains correct attacker and target IDs", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makePlayer("p1", { x: 1, y: 0, z: 0 });

		combatSystem();
		const events = getLastCombatEvents();

		const feralAttack = events.find((e) => e.attackerId === "f1");
		expect(feralAttack).toBeDefined();
		expect(feralAttack!.targetId).toBe("p1");
		expect(typeof feralAttack!.componentDamaged).toBe("string");
		expect(typeof feralAttack!.targetDestroyed).toBe("boolean");
	});

	it("targetDestroyed is true only when all components are broken", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		makeFeral("f1", { x: 0, y: 0, z: 0 });

		// Two-component player: first hit breaks one, but unit survives
		const twoComponents: UnitComponent[] = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "power_cell", functional: true, material: "electronic" },
		];
		makePlayer("p1", { x: 1, y: 0, z: 0 }, { components: twoComponents });

		combatSystem();
		const events = getLastCombatEvents();

		const feralAttack = events.find((e) => e.attackerId === "f1");
		expect(feralAttack).toBeDefined();
		expect(feralAttack!.targetDestroyed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge: no units in the world
// ---------------------------------------------------------------------------

describe("combat — edge cases", () => {
	it("runs safely with no units in the world", () => {
		expect(() => combatSystem()).not.toThrow();
		expect(getLastCombatEvents()).toEqual([]);
	});

	it("runs safely with only player units (no ferals)", () => {
		makePlayer("p1", { x: 0, y: 0, z: 0 });
		makePlayer("p2", { x: 1, y: 0, z: 0 });

		expect(() => combatSystem()).not.toThrow();
		expect(getLastCombatEvents()).toEqual([]);
	});

	it("runs safely with only feral units (no players)", () => {
		makeFeral("f1", { x: 0, y: 0, z: 0 });
		makeFeral("f2", { x: 1, y: 0, z: 0 });

		expect(() => combatSystem()).not.toThrow();
		expect(getLastCombatEvents()).toEqual([]);
	});
});
