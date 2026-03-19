import type { World } from "koota";
import { seededRng } from "../../board/noise";
import { pushTurnEvent } from "../../ui/game/turnEvents";
import { CultMutation } from "../traits/cult";
import { UnitFaction, UnitStats } from "../traits/unit";

// ---------------------------------------------------------------------------
// Mutation tier thresholds (turnsAlive boundaries)
// ---------------------------------------------------------------------------

const TIER_1_THRESHOLD = 6;
const TIER_2_THRESHOLD = 11;
const TIER_3_THRESHOLD = 21;

// ---------------------------------------------------------------------------
// Tier 1 buffs — ONE selected by seeded RNG
// ---------------------------------------------------------------------------

export const TIER_1_BUFFS = [
	{ name: "speed", stat: "mp" as const, bonus: 2, maxStat: "maxMp" as const },
	{ name: "armor", stat: "defense" as const, bonus: 3, maxStat: null },
	{ name: "damage", stat: "attack" as const, bonus: 2, maxStat: null },
] as const;

// ---------------------------------------------------------------------------
// Tier 2 special abilities — ONE selected by seeded RNG (different from tier 1 index)
// ---------------------------------------------------------------------------

export const TIER_2_ABILITIES = ["regen", "area_attack", "fear_aura"] as const;

// ---------------------------------------------------------------------------
// Tier 3 (Aberrant) — flat boost to ALL stats
// ---------------------------------------------------------------------------

const ABERRANT_BOOST = 2;

// ---------------------------------------------------------------------------
// Deterministic buff selection using seededRng from noise.ts
// ---------------------------------------------------------------------------

function pickTier1BuffIndex(mutationSeed: number): number {
	const rng = seededRng(`cult_mutation_t1_${mutationSeed}`);
	return Math.floor(rng() * TIER_1_BUFFS.length);
}

function pickTier2AbilityIndex(
	mutationSeed: number,
	tier1Index: number,
): number {
	const rng = seededRng(`cult_mutation_t2_${mutationSeed}`);
	// Pick from abilities, ensuring different index from tier 1 buff
	let idx = Math.floor(rng() * TIER_2_ABILITIES.length);
	if (idx === tier1Index) {
		idx = (idx + 1) % TIER_2_ABILITIES.length;
	}
	return idx;
}

function pickTier2SecondBuffIndex(
	mutationSeed: number,
	tier1Index: number,
): number {
	const rng = seededRng(`cult_mutation_t2_buff_${mutationSeed}`);
	// Pick a buff different from tier 1
	let idx = Math.floor(rng() * TIER_1_BUFFS.length);
	if (idx === tier1Index) {
		idx = (idx + 1) % TIER_1_BUFFS.length;
	}
	return idx;
}

// ---------------------------------------------------------------------------
// Apply stat buff helper
// ---------------------------------------------------------------------------

function applyBuff(
	stats: { [k: string]: unknown },
	buff: (typeof TIER_1_BUFFS)[number],
): void {
	(stats as Record<string, number>)[buff.stat] += buff.bonus;
	if (buff.maxStat) {
		(stats as Record<string, number>)[buff.maxStat] += buff.bonus;
	}
}

// ---------------------------------------------------------------------------
// Core mutation tick — call once per turn during cult phase
// ---------------------------------------------------------------------------

/**
 * Advance turnsAlive for all cult mutation entities and apply tier upgrades.
 * Cult faction IDs: static_remnants, null_monks, lost_signal.
 */
export function tickCultMutations(world: World): void {
	const CULT_IDS = new Set(["static_remnants", "null_monks", "lost_signal"]);

	for (const entity of world.query(CultMutation, UnitFaction, UnitStats)) {
		const faction = entity.get(UnitFaction);
		if (!faction || !CULT_IDS.has(faction.factionId)) continue;

		const mutation = entity.get(CultMutation)!;
		const stats = entity.get(UnitStats)!;

		const newTurnsAlive = mutation.turnsAlive + 1;
		const oldTier = mutation.mutationTier;
		const newTier = computeTier(newTurnsAlive);

		// Apply tier transitions
		if (newTier > oldTier) {
			if (newTier >= 1 && oldTier < 1) {
				const buffIdx = pickTier1BuffIndex(mutation.mutationSeed);
				const buff = TIER_1_BUFFS[buffIdx];
				applyBuff(stats as unknown as Record<string, unknown>, buff);
				entity.set(UnitStats, { ...stats });
			}
			if (newTier >= 2 && oldTier < 2) {
				const t1Idx = pickTier1BuffIndex(mutation.mutationSeed);
				const t2BuffIdx = pickTier2SecondBuffIndex(
					mutation.mutationSeed,
					t1Idx,
				);
				const secondBuff = TIER_1_BUFFS[t2BuffIdx];
				applyBuff(stats as unknown as Record<string, unknown>, secondBuff);

				const abilityIdx = pickTier2AbilityIndex(mutation.mutationSeed, t1Idx);
				const ability = TIER_2_ABILITIES[abilityIdx];

				entity.set(UnitStats, { ...stats });
				entity.set(CultMutation, {
					turnsAlive: newTurnsAlive,
					mutationTier: newTier as 0 | 1 | 2 | 3,
					mutationSeed: mutation.mutationSeed,
					specialAbility: ability,
				});
				continue; // Already set mutation below, skip the final set
			}
			if (newTier >= 3 && oldTier < 3) {
				stats.hp += ABERRANT_BOOST;
				stats.maxHp += ABERRANT_BOOST;
				stats.attack += ABERRANT_BOOST;
				stats.defense += ABERRANT_BOOST;
				stats.mp += ABERRANT_BOOST;
				stats.maxMp += ABERRANT_BOOST;
				entity.set(UnitStats, { ...stats });
				pushTurnEvent(`Cult mech became ABERRANT — mini-boss threat detected`);
			}
		}

		// Apply regen each turn if unit has regen ability
		if (mutation.specialAbility === "regen" || (newTier >= 2 && oldTier >= 2)) {
			const currentMutation = entity.get(CultMutation)!;
			if (
				currentMutation.specialAbility === "regen" &&
				stats.hp < stats.maxHp
			) {
				stats.hp = Math.min(stats.hp + 1, stats.maxHp);
				entity.set(UnitStats, { ...stats });
			}
		}

		entity.set(CultMutation, {
			turnsAlive: newTurnsAlive,
			mutationTier: newTier as 0 | 1 | 2 | 3,
			mutationSeed: mutation.mutationSeed,
			specialAbility: mutation.specialAbility,
		});
	}
}

// ---------------------------------------------------------------------------
// Tier computation
// ---------------------------------------------------------------------------

export function computeTier(turnsAlive: number): 0 | 1 | 2 | 3 {
	if (turnsAlive >= TIER_3_THRESHOLD) return 3;
	if (turnsAlive >= TIER_2_THRESHOLD) return 2;
	if (turnsAlive >= TIER_1_THRESHOLD) return 1;
	return 0;
}

// ---------------------------------------------------------------------------
// XP reward multiplier for killing a mutated cult mech
// ---------------------------------------------------------------------------

export function getMutationXPMultiplier(mutationTier: number): number {
	if (mutationTier >= 3) return 1.5;
	return 1.0;
}
