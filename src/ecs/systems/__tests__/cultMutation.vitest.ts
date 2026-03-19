import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CultMutation } from "../../traits/cult";
import { UnitFaction, UnitStats } from "../../traits/unit";
import {
	computeTier,
	getMutationXPMultiplier,
	TIER_1_BUFFS,
	TIER_2_ABILITIES,
	tickCultMutations,
} from "../cultMutation";
import { CULT_INFANTRY_DEFAULTS } from "../../robots/CultMechs";

function spawnCultUnit(
	world: ReturnType<typeof createWorld>,
	seed: number,
	factionId = "static_remnants",
) {
	const stats = { ...CULT_INFANTRY_DEFAULTS.stats };
	const e = world.spawn(
		UnitFaction({ factionId }),
		UnitStats(stats),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: seed, specialAbility: "" }),
	);
	return e;
}

describe("cultMutation", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	describe("computeTier", () => {
		it("returns 0 for turns 1-5", () => {
			for (let t = 0; t <= 5; t++) {
				expect(computeTier(t)).toBe(0);
			}
		});

		it("returns 1 for turns 6-10", () => {
			for (let t = 6; t <= 10; t++) {
				expect(computeTier(t)).toBe(1);
			}
		});

		it("returns 2 for turns 11-20", () => {
			for (let t = 11; t <= 20; t++) {
				expect(computeTier(t)).toBe(2);
			}
		});

		it("returns 3 for turns 21+", () => {
			expect(computeTier(21)).toBe(3);
			expect(computeTier(100)).toBe(3);
			expect(computeTier(999)).toBe(3);
		});
	});

	describe("tickCultMutations", () => {
		it("increments turnsAlive each tick", () => {
			const unit = spawnCultUnit(world, 42);

			tickCultMutations(world);
			expect(unit.get(CultMutation)!.turnsAlive).toBe(1);

			tickCultMutations(world);
			expect(unit.get(CultMutation)!.turnsAlive).toBe(2);

			tickCultMutations(world);
			expect(unit.get(CultMutation)!.turnsAlive).toBe(3);
		});

		it("stays at tier 0 for first 5 turns", () => {
			const unit = spawnCultUnit(world, 42);

			for (let i = 0; i < 5; i++) {
				tickCultMutations(world);
			}

			expect(unit.get(CultMutation)!.turnsAlive).toBe(5);
			expect(unit.get(CultMutation)!.mutationTier).toBe(0);
		});

		it("transitions to tier 1 at turn 6 with one stat buff", () => {
			const unit = spawnCultUnit(world, 42);
			const baseStats = { ...unit.get(UnitStats)! };

			for (let i = 0; i < 6; i++) {
				tickCultMutations(world);
			}

			expect(unit.get(CultMutation)!.mutationTier).toBe(1);

			const newStats = unit.get(UnitStats)!;
			// Exactly ONE of: mp+2, defense+3, attack+2 should have changed
			const mpDiff = newStats.mp - baseStats.mp;
			const defDiff = newStats.defense - baseStats.defense;
			const atkDiff = newStats.attack - baseStats.attack;

			const buffsApplied = [
				mpDiff === 2 ? 1 : 0,
				defDiff === 3 ? 1 : 0,
				atkDiff === 2 ? 1 : 0,
			].reduce((a, b) => a + b, 0);

			expect(buffsApplied).toBe(1);
		});

		it("transitions to tier 2 at turn 11 with second buff + special ability", () => {
			const unit = spawnCultUnit(world, 42);

			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}

			expect(unit.get(CultMutation)!.mutationTier).toBe(2);
			const ability = unit.get(CultMutation)!.specialAbility;
			expect(TIER_2_ABILITIES).toContain(ability);
			expect(ability).not.toBe("");
		});

		it("tier 2 second buff is different from tier 1 buff", () => {
			const unit = spawnCultUnit(world, 42);
			const baseStats = { ...unit.get(UnitStats)! };

			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}

			const newStats = unit.get(UnitStats)!;
			const mpDiff = newStats.mp - baseStats.mp;
			const defDiff = newStats.defense - baseStats.defense;
			const atkDiff = newStats.attack - baseStats.attack;

			// At tier 2 we should have TWO different buffs applied
			const buffsApplied = [
				mpDiff > 0 ? 1 : 0,
				defDiff > 0 ? 1 : 0,
				atkDiff > 0 ? 1 : 0,
			].reduce((a, b) => a + b, 0);

			expect(buffsApplied).toBe(2);
		});

		it("transitions to tier 3 (aberrant) at turn 21 with all stats boosted", () => {
			const unit = spawnCultUnit(world, 42);

			// Snapshot stats just before tier 3 transition
			for (let i = 0; i < 20; i++) {
				tickCultMutations(world);
			}
			const preTier3Stats = { ...unit.get(UnitStats)! };

			tickCultMutations(world); // Turn 21 -> tier 3

			expect(unit.get(CultMutation)!.mutationTier).toBe(3);

			const newStats = unit.get(UnitStats)!;
			expect(newStats.hp).toBe(preTier3Stats.hp + 2);
			expect(newStats.maxHp).toBe(preTier3Stats.maxHp + 2);
			expect(newStats.attack).toBe(preTier3Stats.attack + 2);
			expect(newStats.defense).toBe(preTier3Stats.defense + 2);
			expect(newStats.mp).toBe(preTier3Stats.mp + 2);
			expect(newStats.maxMp).toBe(preTier3Stats.maxMp + 2);
		});

		it("does not re-apply buffs after tier is reached", () => {
			const unit = spawnCultUnit(world, 42);

			// Advance to tier 3
			for (let i = 0; i < 25; i++) {
				tickCultMutations(world);
			}
			const statsAt25 = { ...unit.get(UnitStats)! };

			// Run 10 more turns — stats should not change (except regen if applicable)
			for (let i = 0; i < 10; i++) {
				tickCultMutations(world);
			}
			const statsAt35 = unit.get(UnitStats)!;

			expect(statsAt35.attack).toBe(statsAt25.attack);
			expect(statsAt35.defense).toBe(statsAt25.defense);
			// mp and maxMp should be stable
			expect(statsAt35.maxMp).toBe(statsAt25.maxMp);
			expect(statsAt35.maxHp).toBe(statsAt25.maxHp);
		});

		it("mutations are deterministic — same seed = same buffs", () => {
			// Run two units with the same mutation seed
			const unit1 = spawnCultUnit(world, 999);
			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}
			const stats1 = { ...unit1.get(UnitStats)! };
			const ability1 = unit1.get(CultMutation)!.specialAbility;
			world.destroy();

			// Fresh world, same seed
			world = createWorld();
			const unit2 = spawnCultUnit(world, 999);
			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}
			const stats2 = { ...unit2.get(UnitStats)! };
			const ability2 = unit2.get(CultMutation)!.specialAbility;

			expect(stats1.attack).toBe(stats2.attack);
			expect(stats1.defense).toBe(stats2.defense);
			expect(stats1.mp).toBe(stats2.mp);
			expect(stats1.maxMp).toBe(stats2.maxMp);
			expect(ability1).toBe(ability2);
		});

		it("different seeds produce different mutations", () => {
			// Spawn many units with different seeds
			const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 200, 300];
			const results: Array<{ attack: number; defense: number; mp: number; ability: string }> = [];

			for (const seed of seeds) {
				world.destroy();
				world = createWorld();
				const unit = spawnCultUnit(world, seed);

				for (let i = 0; i < 11; i++) {
					tickCultMutations(world);
				}

				const stats = unit.get(UnitStats)!;
				results.push({
					attack: stats.attack,
					defense: stats.defense,
					mp: stats.mp,
					ability: unit.get(CultMutation)!.specialAbility,
				});
			}

			// Not all results should be identical (statistical — with 13 seeds and 3 options,
			// the probability of all being the same is (1/3)^12 ≈ negligible)
			const allSame = results.every(
				(r) =>
					r.attack === results[0].attack &&
					r.defense === results[0].defense &&
					r.mp === results[0].mp &&
					r.ability === results[0].ability,
			);
			expect(allSame).toBe(false);
		});

		it("regen ability heals 1 HP per turn when damaged", () => {
			const unit = spawnCultUnit(world, 42);
			// Force the unit to have regen by manually setting it
			// First advance to tier 2
			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}

			// Manually set regen ability and reduce HP
			const currentMut = unit.get(CultMutation)!;
			unit.set(CultMutation, { ...currentMut, specialAbility: "regen" });
			const stats = unit.get(UnitStats)!;
			unit.set(UnitStats, { ...stats, hp: stats.maxHp - 3 });

			const hpBefore = unit.get(UnitStats)!.hp;
			tickCultMutations(world);
			const hpAfter = unit.get(UnitStats)!.hp;

			expect(hpAfter).toBe(hpBefore + 1);
		});

		it("regen does not exceed maxHp", () => {
			const unit = spawnCultUnit(world, 42);
			for (let i = 0; i < 11; i++) {
				tickCultMutations(world);
			}

			const currentMut = unit.get(CultMutation)!;
			unit.set(CultMutation, { ...currentMut, specialAbility: "regen" });
			// HP already at max — should stay at max
			const stats = unit.get(UnitStats)!;
			unit.set(UnitStats, { ...stats, hp: stats.maxHp });

			tickCultMutations(world);
			expect(unit.get(UnitStats)!.hp).toBe(unit.get(UnitStats)!.maxHp);
		});

		it("does not mutate non-cult units", () => {
			const playerUnit = world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitStats({ ...CULT_INFANTRY_DEFAULTS.stats }),
				CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 1, specialAbility: "" }),
			);

			for (let i = 0; i < 10; i++) {
				tickCultMutations(world);
			}

			// turnsAlive should NOT have incremented for non-cult factions
			expect(playerUnit.get(CultMutation)!.turnsAlive).toBe(0);
			expect(playerUnit.get(CultMutation)!.mutationTier).toBe(0);
		});
	});

	describe("getMutationXPMultiplier", () => {
		it("returns 1.0 for tiers 0-2", () => {
			expect(getMutationXPMultiplier(0)).toBe(1.0);
			expect(getMutationXPMultiplier(1)).toBe(1.0);
			expect(getMutationXPMultiplier(2)).toBe(1.0);
		});

		it("returns 1.5 for tier 3 (aberrant)", () => {
			expect(getMutationXPMultiplier(3)).toBe(1.5);
		});
	});
});
