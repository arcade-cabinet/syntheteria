import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import {
	CombatResult,
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits";
import { resolveAttacks } from "../attackSystem";

describe("attackSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("damage = attacker.attack - target.defense", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 1,
			}),
		);

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 5,
				defense: 0,
			}),
			UnitAttack({ targetEntityId: target.id(), damage: 0 }),
		);

		resolveAttacks(world);

		// damage = 5 - 1 = 4
		const stats = target.get(UnitStats);
		expect(stats?.hp).toBe(6);
	});

	it("damage is minimum 1 even when defense >= attack", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 10,
			}),
		);

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitAttack({ targetEntityId: target.id(), damage: 0 }),
		);

		resolveAttacks(world);

		// damage = max(1, 2 - 10) = 1
		const stats = target.get(UnitStats);
		expect(stats?.hp).toBe(9);
	});

	it("target is destroyed when HP reaches 0", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 2,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);
		const targetId = target.id();

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 5,
				defense: 0,
			}),
			UnitAttack({ targetEntityId: targetId, damage: 0 }),
		);

		resolveAttacks(world);

		// Target entity should no longer exist in world queries
		let found = false;
		for (const e of world.query(UnitStats)) {
			if (e.id() === targetId) {
				found = true;
			}
		}
		expect(found).toBe(false);
	});

	it("UnitAttack is removed from attacker after resolution", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitAttack({ targetEntityId: target.id(), damage: 0 }),
		);

		expect(attacker.has(UnitAttack)).toBe(true);
		resolveAttacks(world);
		expect(attacker.has(UnitAttack)).toBe(false);
	});

	describe("attack range", () => {
		it("ranged unit can attack targets within attackRange", () => {
			const target = world.spawn(
				UnitPos({ tileX: 3, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 6,
					attack: 4,
					defense: 2,
					attackRange: 3,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// damage = 4 - 0 = 4
			const stats = target.get(UnitStats);
			expect(stats?.hp).toBe(6);
		});

		it("attack fails when target is beyond attackRange", () => {
			const target = world.spawn(
				UnitPos({ tileX: 4, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 6,
					attack: 4,
					defense: 2,
					attackRange: 3,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Target should be unharmed — out of range
			const stats = target.get(UnitStats);
			expect(stats?.hp).toBe(10);
		});

		it("melee unit (attackRange=1) can only attack adjacent", () => {
			const target = world.spawn(
				UnitPos({ tileX: 2, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 1,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Target at distance 2, attackRange 1 — attack should fail
			expect(target.get(UnitStats)?.hp).toBe(10);
		});
	});

	describe("counterattack", () => {
		it("target counterattacks attacker if it survives and is in range", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 4,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Primary: damage = max(1, 3-0) = 3, target HP: 10→7
			expect(target.get(UnitStats)?.hp).toBe(7);
			// Counter: damage = max(1, floor(4*0.5)-0) = max(1, 2) = 2, attacker HP: 10→8
			expect(attacker.get(UnitStats)?.hp).toBe(8);
		});

		it("no counterattack if target is destroyed", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 3,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 4,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 5,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Target destroyed (3-5 < 0), no counterattack
			expect(attacker.get(UnitStats)?.hp).toBe(10);
		});

		it("no counterattack if target has 0 attack", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 0,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Target has 0 attack — no counterattack
			expect(attacker.get(UnitStats)?.hp).toBe(10);
		});

		it("no counterattack if attacker is outside target's attackRange", () => {
			const target = world.spawn(
				UnitPos({ tileX: 3, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 4,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 6,
					attack: 4,
					defense: 0,
					attackRange: 3,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			// Attacker at range 3, target's attackRange is 1 — no counterattack
			expect(target.get(UnitStats)?.hp).toBe(6);
			expect(attacker.get(UnitStats)?.hp).toBe(10);
		});

		it("counterattack can destroy the attacker", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 10,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 1,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);
			const attackerId = attacker.id();

			resolveAttacks(world);

			// Counter damage = max(1, floor(10*0.5)-0) = 5, attacker HP 1→-4, destroyed
			let attackerFound = false;
			for (const e of world.query(UnitStats)) {
				if (e.id() === attackerId) attackerFound = true;
			}
			expect(attackerFound).toBe(false);

			// Target should have taken primary damage: 3
			expect(target.get(UnitStats)?.hp).toBe(7);
		});
	});

	describe("combat visual feedback", () => {
		it("adds CombatResult to target on hit", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 0,
					defense: 0,
					attackRange: 0,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			expect(target.has(CombatResult)).toBe(true);
			const result = target.get(CombatResult);
			expect(result?.kind).toBe("hit");
			expect(result?.damage).toBe(3);
		});

		it("adds CombatResult(counter) to attacker on counterattack", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 4,
					defense: 0,
					attackRange: 1,
				}),
			);

			const attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			resolveAttacks(world);

			expect(attacker.has(CombatResult)).toBe(true);
			const result = attacker.get(CombatResult);
			expect(result?.kind).toBe("counter");
			expect(result?.damage).toBe(2);
		});
	});
});
