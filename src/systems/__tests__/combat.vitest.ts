/**
 * Combat system tests.
 *
 * Verifies component-based damage: attackPower/durability scaling,
 * arms bonus, unit destruction, salvage drops, and retaliation.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	EntityId,
	Faction,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { parseComponents, serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	combatSystem,
	computeHitChance,
	dealDamage,
	getAttackPower,
	getDurability,
	getLastCombatEvents,
} from "../combat";
import { getResources, resetResources } from "../resources";

const entities: Entity[] = [];

function spawnUnit(
	id: string,
	faction: "player" | "feral" | "cultist",
	x: number,
	z: number,
	opts: {
		unitType?: string;
		mark?: number;
		speed?: number;
		components?: { name: string; functional: boolean; material: string }[];
	} = {},
): Entity {
	const {
		unitType = "maintenance_bot",
		mark = 1,
		speed = 3,
		components = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
		],
	} = opts;
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: faction }),
		Unit({ unitType, displayName: id, speed, selected: false, mark }),
		UnitComponents({
			componentsJson: serializeComponents(components),
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
	resetResources();
});

// ---------------------------------------------------------------------------
// getAttackPower / getDurability
// ---------------------------------------------------------------------------

describe("getAttackPower", () => {
	it("returns Mark I stats for maintenance_bot mark 1", () => {
		const unit = spawnUnit("u1", "player", 0, 0, {
			unitType: "maintenance_bot",
			mark: 1,
		});
		expect(getAttackPower(unit)).toBe(0.5);
	});

	it("returns Mark II stats after upgrade", () => {
		const unit = spawnUnit("u2", "player", 0, 0, {
			unitType: "guard_bot",
			mark: 2,
		});
		expect(getAttackPower(unit)).toBe(1.5);
	});

	it("returns Mark III stats", () => {
		const unit = spawnUnit("u3", "player", 0, 0, {
			unitType: "cavalry_bot",
			mark: 3,
		});
		expect(getAttackPower(unit)).toBe(2.5);
	});

	it("returns 1.0 for unknown unit types (cult mechs)", () => {
		const unit = spawnUnit("cult1", "feral", 0, 0, {
			unitType: "wanderer",
			mark: 1,
		});
		expect(getAttackPower(unit)).toBe(1.0);
	});
});

describe("getDurability", () => {
	it("returns Mark I durability for maintenance_bot", () => {
		const unit = spawnUnit("u1", "player", 0, 0, {
			unitType: "maintenance_bot",
			mark: 1,
		});
		expect(getDurability(unit)).toBe(1.0);
	});

	it("returns higher durability at Mark III", () => {
		const unit = spawnUnit("u2", "player", 0, 0, {
			unitType: "sentinel_bot",
			mark: 3,
		});
		expect(getDurability(unit)).toBe(3.0);
	});

	it("returns 1.0 for unknown unit types", () => {
		const unit = spawnUnit("cult1", "feral", 0, 0, {
			unitType: "brute",
			mark: 1,
		});
		expect(getDurability(unit)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// computeHitChance
// ---------------------------------------------------------------------------

describe("computeHitChance", () => {
	const armsComp = [
		{ name: "arms", functional: true, material: "metal" as const },
	];
	const noArmsComp = [
		{ name: "legs", functional: true, material: "metal" as const },
	];

	it("base hit chance with arms, attackPower=1, durability=1", () => {
		const chance = computeHitChance(armsComp, 1.0, 1.0);
		// (0.35 + 0.15) * 1.0 / 1.0 = 0.50
		expect(chance).toBeCloseTo(0.5, 5);
	});

	it("base hit chance without arms", () => {
		const chance = computeHitChance(noArmsComp, 1.0, 1.0);
		// 0.35 * 1.0 / 1.0 = 0.35
		expect(chance).toBeCloseTo(0.35, 5);
	});

	it("high attackPower increases hit chance", () => {
		const chance = computeHitChance(armsComp, 2.5, 1.0);
		// (0.50) * 2.5 / 1.0 = 1.25 → clamped to 0.95
		expect(chance).toBe(0.95);
	});

	it("high durability reduces hit chance", () => {
		const chance = computeHitChance(noArmsComp, 0.5, 3.0);
		// 0.35 * 0.5 / 3.0 = 0.0583 → clamped to 0.058
		expect(chance).toBeCloseTo(0.0583, 3);
	});

	it("clamps minimum to 0.05", () => {
		const chance = computeHitChance(noArmsComp, 0.1, 10.0);
		// 0.35 * 0.1 / 10.0 = 0.0035 → clamped to 0.05
		expect(chance).toBe(0.05);
	});

	it("clamps maximum to 0.95", () => {
		const chance = computeHitChance(armsComp, 10.0, 0.5);
		expect(chance).toBe(0.95);
	});
});

// ---------------------------------------------------------------------------
// dealDamage
// ---------------------------------------------------------------------------

describe("dealDamage", () => {
	it("breaks a component when rng rolls under hit chance", () => {
		const target = spawnUnit("target", "player", 0, 0);
		const attackerComps = [
			{ name: "arms", functional: true, material: "metal" as const },
		];
		// rng returns 0.0 → always hits
		const damaged = dealDamage(attackerComps, 1.0, target, () => 0.0);
		expect(damaged).not.toBeNull();

		const comps = parseComponents(target.get(UnitComponents)?.componentsJson);
		const broken = comps.filter((c) => !c.functional);
		expect(broken.length).toBe(1);
		expect(broken[0].name).toBe(damaged);
	});

	it("misses when rng rolls above hit chance", () => {
		const target = spawnUnit("target", "player", 0, 0);
		const attackerComps = [
			{ name: "legs", functional: true, material: "metal" as const },
		];
		// rng returns 0.99 → always misses (hit chance ~0.35)
		const damaged = dealDamage(attackerComps, 1.0, target, () => 0.99);
		expect(damaged).toBeNull();

		const comps = parseComponents(target.get(UnitComponents)?.componentsJson);
		const broken = comps.filter((c) => !c.functional);
		expect(broken.length).toBe(0);
	});

	it("returns null when target has no functional components", () => {
		const target = spawnUnit("target", "player", 0, 0, {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
			],
		});
		const attackerComps = [
			{ name: "arms", functional: true, material: "metal" as const },
		];
		const damaged = dealDamage(attackerComps, 2.0, target, () => 0.0);
		expect(damaged).toBeNull();
	});

	it("high attackPower makes hits more likely", () => {
		const target = spawnUnit("target", "player", 0, 0);
		const attackerComps = [
			{ name: "arms", functional: true, material: "metal" as const },
		];
		// attackPower=2.5, hit chance = 0.95 (clamped), rng=0.9 → hit
		const damaged = dealDamage(attackerComps, 2.5, target, () => 0.9);
		expect(damaged).not.toBeNull();
	});

	it("high durability target resists damage", () => {
		// sentinel_bot Mark III has durability=3.0
		const target = spawnUnit("target", "player", 0, 0, {
			unitType: "sentinel_bot",
			mark: 3,
		});
		const attackerComps = [
			{ name: "legs", functional: true, material: "metal" as const },
		];
		// attackPower=0.5, durability=3.0 → hit chance = 0.35 * 0.5 / 3.0 = 0.058
		// rng=0.1 → miss
		const damaged = dealDamage(attackerComps, 0.5, target, () => 0.1);
		expect(damaged).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// combatSystem integration
// ---------------------------------------------------------------------------

describe("combatSystem", () => {
	it("feral unit attacks nearby player unit", () => {
		// Place feral and player within melee range
		spawnUnit("feral1", "feral", 5, 5, {
			unitType: "wanderer",
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		spawnUnit("player1", "player", 5, 6, {
			unitType: "maintenance_bot",
			mark: 1,
		});

		// Run enough ticks that at least one attack should land
		let anyEvents = false;
		for (let i = 0; i < 50; i++) {
			combatSystem();
			if (getLastCombatEvents().length > 0) {
				anyEvents = true;
				break;
			}
		}
		// With 50 ticks × 0.4 attack chance, it's extremely unlikely to get zero attacks
		expect(anyEvents).toBe(true);
	});

	it("player units do not initiate attacks (only retaliate)", () => {
		// Two player units next to each other — should never fight
		spawnUnit("p1", "player", 5, 5);
		spawnUnit("p2", "player", 5, 6);

		for (let i = 0; i < 20; i++) {
			combatSystem();
		}
		// No events should fire between same-faction units
		const events = getLastCombatEvents();
		const playerAttacks = events.filter((e) => e.attackerId === "p1");
		expect(playerAttacks.length).toBe(0);
	});

	it("unit with all components broken is destroyed and drops salvage", () => {
		// Feral with arms, player with single fragile component
		spawnUnit("feral1", "feral", 5, 5, {
			unitType: "wanderer",
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		});
		const fragile = spawnUnit("fragile", "player", 5, 6, {
			unitType: "maintenance_bot",
			mark: 1,
			components: [
				{ name: "camera", functional: true, material: "electronic" },
			],
		});

		// Run many ticks until the fragile unit dies
		let destroyed = false;
		for (let i = 0; i < 200; i++) {
			combatSystem();
			if (!fragile.isAlive()) {
				destroyed = true;
				break;
			}
		}
		expect(destroyed).toBe(true);

		// Should have dropped salvage
		const pool = getResources();
		expect(pool.scrapMetal).toBeGreaterThan(0);
	});

	it("units out of melee range do not fight", () => {
		spawnUnit("feral1", "feral", 0, 0, { unitType: "wanderer" });
		spawnUnit("player1", "player", 100, 100); // way out of range

		for (let i = 0; i < 20; i++) {
			combatSystem();
		}
		expect(getLastCombatEvents().length).toBe(0);
	});

	it("combat events include correct attacker/target IDs", () => {
		spawnUnit("attacker_feral", "feral", 5, 5, {
			unitType: "wanderer",
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		spawnUnit("target_player", "player", 5, 6, {
			unitType: "maintenance_bot",
			mark: 1,
		});

		let found = false;
		for (let i = 0; i < 100; i++) {
			combatSystem();
			const events = getLastCombatEvents();
			for (const e of events) {
				if (e.attackerId === "attacker_feral") {
					expect(e.targetId).toBe("target_player");
					found = true;
				}
				if (e.attackerId === "target_player") {
					// Retaliation
					expect(e.targetId).toBe("attacker_feral");
					found = true;
				}
			}
			if (found) break;
		}
		expect(found).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Mark tier integration
// ---------------------------------------------------------------------------

describe("mark tier combat integration", () => {
	it("guard_bot Mark III has high attackPower", () => {
		const guard = spawnUnit("guard", "player", 0, 0, {
			unitType: "guard_bot",
			mark: 3,
		});
		expect(getAttackPower(guard)).toBe(2.0);
	});

	it("sentinel_bot Mark III has highest durability", () => {
		const sentinel = spawnUnit("sentinel", "player", 0, 0, {
			unitType: "sentinel_bot",
			mark: 3,
		});
		expect(getDurability(sentinel)).toBe(3.0);
	});

	it("utility_drone has low durability, low attackPower", () => {
		const drone = spawnUnit("drone", "player", 0, 0, {
			unitType: "utility_drone",
			mark: 1,
		});
		expect(getAttackPower(drone)).toBe(0.3);
		expect(getDurability(drone)).toBe(0.7);
	});

	it("upgrading a unit changes its combat effectiveness", () => {
		const unit = spawnUnit("upgradable", "player", 0, 0, {
			unitType: "guard_bot",
			mark: 1,
		});
		expect(getAttackPower(unit)).toBe(1.0);

		// Simulate upgrade by changing mark
		unit.set(Unit, { mark: 2 });
		expect(getAttackPower(unit)).toBe(1.5);
		expect(getDurability(unit)).toBe(1.6);
	});
});
