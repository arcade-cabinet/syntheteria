/**
 * QUADRUPED TANK (Ranged) — specialization tracks.
 *
 * Chosen at FABRICATION time in the Garage modal. Permanent — cannot be swapped.
 * Same visual model (QuadrupedTank.glb) — differentiation is gameplay only.
 *
 * Track A: SNIPER — extreme range, single-target precision, headshot crits.
 * Track B: SUPPRESSOR — area control, AP reduction, zone denial, splash damage.
 *
 * Base ranged stats: HP 12, AP 2, MP 1, scanRange 6, attack 4, defense 2,
 *   attackRange 3, weightClass "heavy", actions: Stage/Attack(2-4)/Overwatch/Relocate
 */

import type { TechDef, TechEffectType } from "../../config/techTreeDefs";
import type { ClassActionDef } from "../classActions";
import type { MarkSpecialization } from "../marks";

// ─── Track Identity ──────────────────────────────────────────────────────────

export type RangedTrack = "sniper" | "suppressor";

export interface RangedTrackDef {
	readonly id: RangedTrack;
	readonly label: string;
	readonly description: string;
	/** Stat modifiers applied at fabrication when this track is chosen. */
	readonly statMods: {
		readonly hp?: number;
		readonly maxHp?: number;
		readonly ap?: number;
		readonly maxAp?: number;
		readonly mp?: number;
		readonly maxMp?: number;
		readonly scanRange?: number;
		readonly attack?: number;
		readonly defense?: number;
		readonly attackRange?: number;
	};
	/** Additional actions granted by this specialization. */
	readonly actions: readonly ClassActionDef[];
	/** Mark II-V specialization passives for this track. */
	readonly markSpecializations: readonly MarkSpecialization[];
	/** Tech tree prerequisites to unlock this track. */
	readonly requiredTech: readonly string[];
	/** Upgraded v2 version — requires higher-tier tech. */
	readonly v2: {
		readonly label: string;
		readonly requiredTech: readonly string[];
		readonly statMods: {
			readonly hp?: number;
			readonly maxHp?: number;
			readonly attack?: number;
			readonly defense?: number;
			readonly attackRange?: number;
			readonly scanRange?: number;
		};
		readonly description: string;
	};
}

// ─── Track A: Sniper ─────────────────────────────────────────────────────────

const SNIPER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "aimed_shot",
		label: "Aimed Shot",
		icon: "\uD83C\uDFAF",
		tone: "hostile",
		category: "combat",
		apCost: 2,
		minRange: 3,
		maxRange: 6,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"High-damage precision shot at extreme range (3-6). Costs 2 AP.",
	},
	{
		id: "headshot",
		label: "Headshot",
		icon: "\u2620",
		tone: "hostile",
		category: "combat",
		apCost: 2,
		minRange: 2,
		maxRange: 5,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"Critical strike — 2x damage if target HP < 50%. 2-turn cooldown.",
	},
];

const SNIPER_MARK_SPECS: readonly MarkSpecialization[] = [
	{
		label: "Precision Optics",
		markLevel: 3,
		effectType: "sniper_range_bonus",
		effectValue: 1,
		description: "+1 max range on all ranged attacks",
	},
	{
		label: "Armor-Piercing Rounds",
		markLevel: 4,
		effectType: "sniper_armor_pierce",
		effectValue: 2,
		description: "Ranged attacks ignore 2 points of target defense",
	},
	{
		label: "Transcendent Marksman",
		markLevel: 5,
		effectType: "sniper_guaranteed_crit",
		effectValue: 1,
		description: "First attack each turn is always a critical hit (2x damage)",
	},
];

// ─── Track B: Suppressor ─────────────────────────────────────────────────────

const SUPPRESSOR_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "suppressive_fire",
		label: "Suppress",
		icon: "\uD83D\uDCA5",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 2,
		maxRange: 3,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Reduced damage but target loses 1 AP next turn",
	},
	{
		id: "barrage",
		label: "Barrage",
		icon: "\uD83D\uDD25",
		tone: "hostile",
		category: "combat",
		apCost: 2,
		minRange: 2,
		maxRange: 3,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"Splash damage to target tile + all 4 adjacent tiles. 2-turn cooldown.",
	},
];

const SUPPRESSOR_MARK_SPECS: readonly MarkSpecialization[] = [
	{
		label: "Concussive Rounds",
		markLevel: 3,
		effectType: "suppressor_ap_drain",
		effectValue: 1,
		description: "All attacks reduce target AP by 1 next turn",
	},
	{
		label: "Denial Zone",
		markLevel: 4,
		effectType: "suppressor_zone_penalty",
		effectValue: 2,
		description: "Enemies within 2 tiles of staged suppressor lose 1 MP",
	},
	{
		label: "Transcendent Bombardier",
		markLevel: 5,
		effectType: "suppressor_barrage_free",
		effectValue: 1,
		description: "Barrage costs 0 AP (still has cooldown)",
	},
];

// ─── Track Definitions ───────────────────────────────────────────────────────

export const RANGED_TRACKS: Readonly<Record<RangedTrack, RangedTrackDef>> = {
	sniper: {
		id: "sniper",
		label: "Sniper",
		description:
			"Extreme range, single-target precision. Headshot crits punish wounded targets.",
		statMods: {
			attackRange: 2, // base 3 → 5
			attack: 1, // base 4 → 5
			defense: -1, // base 2 → 1 (glass cannon tradeoff)
		},
		actions: SNIPER_ACTIONS,
		markSpecializations: SNIPER_MARK_SPECS,
		requiredTech: ["mark_ii_components"],
		v2: {
			label: "Sniper v2",
			requiredTech: ["mark_iv_components", "quantum_processors"],
			statMods: {
				attackRange: 3, // base 3 → 6
				attack: 2, // base 4 → 6
				scanRange: 2, // base 6 → 8
			},
			description:
				"Enhanced optics + quantum targeting. +3 range, +2 attack, +2 scan.",
		},
	},
	suppressor: {
		id: "suppressor",
		label: "Suppressor",
		description:
			"Area control specialist. AP drain, zone denial, splash damage.",
		statMods: {
			hp: 2, // base 12 → 14 (tankier for frontline suppression)
			maxHp: 2,
			attack: -1, // base 4 → 3 (lower per-hit, compensated by area effects)
		},
		actions: SUPPRESSOR_ACTIONS,
		markSpecializations: SUPPRESSOR_MARK_SPECS,
		requiredTech: ["mark_ii_components"],
		v2: {
			label: "Suppressor v2",
			requiredTech: ["mark_iv_components", "adaptive_armor"],
			statMods: {
				hp: 4, // base 12 → 16
				maxHp: 4,
				defense: 1, // base 2 → 3
			},
			description: "Adaptive plating + reinforced frame. +4 HP, +1 defense.",
		},
	},
} as const;

// ─── Tech Tree Extensions ────────────────────────────────────────────────────

/**
 * New tech tree entries that gate ranged specialization tracks.
 * These slot into the existing tech tree DAG.
 */
export const RANGED_SPEC_TECHS: readonly TechDef[] = [
	{
		id: "precision_targeting",
		name: "Precision Targeting",
		description:
			"Unlocks Sniper specialization for Quadruped Tanks. Enables Aimed Shot and Headshot actions.",
		tier: 2,
		cost: { silicon_wafer: 6, conductor_wire: 3, alloy_stock: 4 },
		turnsToResearch: 5,
		prerequisites: ["mark_ii_components", "signal_amplification"],
		effects: [{ type: "unlock_mark_level" as TechEffectType, value: 2 }],
	},
	{
		id: "area_suppression",
		name: "Area Suppression",
		description:
			"Unlocks Suppressor specialization for Quadruped Tanks. Enables Suppressive Fire and Barrage actions.",
		tier: 2,
		cost: { alloy_stock: 6, storm_charge: 3, polymer_salvage: 4 },
		turnsToResearch: 5,
		prerequisites: ["mark_ii_components", "reinforced_chassis"],
		effects: [{ type: "unlock_mark_level" as TechEffectType, value: 2 }],
	},
] as const;

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

/** Get a track definition by ID. */
export function getRangedTrack(track: RangedTrack): RangedTrackDef {
	return RANGED_TRACKS[track];
}

/** Get all additional actions for a given track (does NOT include base ranged actions). */
export function getRangedTrackActions(
	track: RangedTrack,
): readonly ClassActionDef[] {
	return RANGED_TRACKS[track].actions;
}

/** Get mark specializations for a given track, filtered by current mark level. */
export function getRangedTrackSpecs(
	track: RangedTrack,
	markLevel: number,
): readonly MarkSpecialization[] {
	return RANGED_TRACKS[track].markSpecializations.filter(
		(s) => s.markLevel <= markLevel,
	);
}

/** Check if a ranged track has a specific effect active at a given mark level. */
export function hasRangedTrackEffect(
	track: RangedTrack,
	markLevel: number,
	effectType: string,
): boolean {
	return getRangedTrackSpecs(track, markLevel).some(
		(s) => s.effectType === effectType,
	);
}

/** Get the effect value for a specific track effect at a given mark level. */
export function getRangedTrackEffectValue(
	track: RangedTrack,
	markLevel: number,
	effectType: string,
): number {
	const specs = getRangedTrackSpecs(track, markLevel);
	const matching = specs.filter((s) => s.effectType === effectType);
	if (matching.length === 0) return 0;
	return matching[matching.length - 1]!.effectValue;
}

/** Apply track stat mods to base stats. Returns new stat values (does not mutate). */
export function applyTrackStatMods(
	baseStats: Record<string, number>,
	track: RangedTrack,
	useV2: boolean,
): Record<string, number> {
	const result = { ...baseStats };
	const mods = useV2
		? RANGED_TRACKS[track].v2.statMods
		: RANGED_TRACKS[track].statMods;
	for (const [key, value] of Object.entries(mods)) {
		if (value !== undefined && key in result) {
			result[key] = (result[key] ?? 0) + value;
		}
	}
	return result;
}
