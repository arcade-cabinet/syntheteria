/**
 * Infantry (FIELDFIGHTER) specialization tracks — chosen at FABRICATION time in the Garage.
 *
 * Two permanent tracks:
 *   A. Vanguard — tank/frontline. HP, defense, taunt/aggro, damage absorption, zone control.
 *   B. Shock Trooper — burst damage. Attack, charge, execution strikes, glass cannon.
 *
 * Same visual model for both tracks — differentiation is gameplay only.
 * Higher-tier tech tree research unlocks upgraded v2 versions that obsolete earlier ones.
 *
 * Design reference: GAME_DESIGN.md S7 (Bot Roster), task #51.
 */

import type { TechDef } from "../../config/techTreeDefs";
import type { ClassActionDef } from "../classActions";
import type { MarkSpecialization } from "../marks";

// ─── Track IDs ───────────────────────────────────────────────────────────────

export type InfantryTrack = "vanguard" | "shock_trooper";

// ─── Specialization Interface ────────────────────────────────────────────────

export interface InfantryTrackSpecialization extends MarkSpecialization {
	/** Which specialization track this belongs to. */
	readonly track: InfantryTrack;
}

// ─── Track A: Vanguard ──────────────────────────────────────────────────────
//
// Fantasy: The immovable wall. A walking fortress that anchors the frontline,
// absorbs punishment, and forces enemies to deal with it before they can reach
// softer targets. At transcendence it becomes a zone-denial engine — enemies
// within its radius can't move freely and take passive damage.

export const VANGUARD_SPECIALIZATIONS: readonly InfantryTrackSpecialization[] =
	[
		{
			track: "vanguard",
			label: "Hardened Plating",
			markLevel: 2 as 3, // Mark II — cast to satisfy base type, runtime uses 2
			effectType: "hardened_plating",
			effectValue: 3,
			description:
				"Permanent +3 max HP and +1 defense. Reduces incoming critical damage by 50%.",
		},
		{
			track: "vanguard",
			label: "Threat Beacon",
			markLevel: 3,
			effectType: "threat_beacon",
			effectValue: 2,
			description:
				"Enemies within 2 tiles must target this unit first (taunt). +1 defense while taunting.",
		},
		{
			track: "vanguard",
			label: "Reactive Armor",
			markLevel: 4,
			effectType: "reactive_armor",
			effectValue: 2,
			description:
				"When hit, reflect 2 damage back to the attacker. Fortify now grants +4 defense instead of +2.",
		},
		{
			track: "vanguard",
			label: "Transcendent Bulwark",
			markLevel: 5,
			effectType: "bulwark_aura",
			effectValue: 2,
			description:
				"Adjacent allies gain +2 defense. Enemies within 2 tiles take 1 damage at start of their turn and have -1 MP.",
		},
	] as const;

// ─── Track B: Shock Trooper ─────────────────────────────────────────────────
//
// Fantasy: The glass cannon berserker. Trades durability for devastating burst
// damage. Excels at punishing wounded units, breaking through defensive lines,
// and ending fights fast. At transcendence, every kill resets its action point,
// enabling chain kills.

export const SHOCK_TROOPER_SPECIALIZATIONS: readonly InfantryTrackSpecialization[] =
	[
		{
			track: "shock_trooper",
			label: "Impact Charge",
			markLevel: 2 as 3, // Mark II
			effectType: "impact_charge",
			effectValue: 2,
			description:
				"+2 attack damage when attacking a unit you moved adjacent to this turn. -1 defense.",
		},
		{
			track: "shock_trooper",
			label: "Weak Point Analysis",
			markLevel: 3,
			effectType: "weak_point",
			effectValue: 2,
			description:
				"Attacks ignore 2 points of target defense. Attacks against targets below 50% HP deal +2 bonus damage.",
		},
		{
			track: "shock_trooper",
			label: "Execution Protocol",
			markLevel: 4,
			effectType: "execution",
			effectValue: 4,
			description:
				"Attacks against targets at or below 4 HP deal double damage. Kills restore 1 AP.",
		},
		{
			track: "shock_trooper",
			label: "Transcendent Striker",
			markLevel: 5,
			effectType: "chain_kill",
			effectValue: 1,
			description:
				"Every kill fully restores AP and grants +1 attack for the rest of the turn (stacks). No defense bonus from any source.",
		},
	] as const;

// ─── v2 Upgraded Versions ────────────────────────────────────────────────────
//
// Unlocked by higher-tier tech tree research. Replaces the base track's
// Mark III/IV abilities with strictly better versions.

export const VANGUARD_V2_UPGRADES: readonly InfantryTrackSpecialization[] = [
	{
		track: "vanguard",
		label: "Graviton Anchor",
		markLevel: 3,
		effectType: "graviton_anchor",
		effectValue: 3,
		description:
			"Replaces Threat Beacon. Enemies within 3 tiles must target this unit first. Taunted enemies have -1 attack.",
	},
	{
		track: "vanguard",
		label: "Ablative Shell",
		markLevel: 4,
		effectType: "ablative_shell",
		effectValue: 3,
		description:
			"Replaces Reactive Armor. Reflect 3 damage on hit. Once per turn, absorb the first attack completely (0 damage taken).",
	},
] as const;

export const SHOCK_TROOPER_V2_UPGRADES: readonly InfantryTrackSpecialization[] =
	[
		{
			track: "shock_trooper",
			label: "Overclocked Servos",
			markLevel: 3,
			effectType: "overclocked_servos",
			effectValue: 3,
			description:
				"Replaces Weak Point Analysis. Ignores 3 points of defense. Sub-50% targets take +3 bonus damage. +1 MP.",
		},
		{
			track: "shock_trooper",
			label: "Termination Sequence",
			markLevel: 4,
			effectType: "termination_sequence",
			effectValue: 5,
			description:
				"Replaces Execution Protocol. Targets at or below 5 HP take triple damage. Kills restore 2 AP.",
		},
	] as const;

// ─── Combined Track Map ──────────────────────────────────────────────────────

export const INFANTRY_TRACKS: Record<
	InfantryTrack,
	{
		readonly label: string;
		readonly description: string;
		readonly specializations: readonly InfantryTrackSpecialization[];
		readonly v2Upgrades: readonly InfantryTrackSpecialization[];
	}
> = {
	vanguard: {
		label: "Vanguard",
		description:
			"Tank and frontline anchor. High HP, taunt/aggro, damage reflection, and zone control.",
		specializations: VANGUARD_SPECIALIZATIONS,
		v2Upgrades: VANGUARD_V2_UPGRADES,
	},
	shock_trooper: {
		label: "Shock Trooper",
		description:
			"Burst damage assassin. Armor piercing, execution strikes, and chain-kill resets.",
		specializations: SHOCK_TROOPER_SPECIALIZATIONS,
		v2Upgrades: SHOCK_TROOPER_V2_UPGRADES,
	},
};

// ─── New Radial Menu Actions ─────────────────────────────────────────────────

/** Actions unlocked by the Vanguard track. */
export const VANGUARD_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "taunt",
		label: "Taunt",
		icon: "\uD83D\uDEE1", // shield
		tone: "neutral",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"Force nearby enemies to target this unit. +1 defense while active.",
	},
	{
		id: "shield_wall",
		label: "Shield Wall",
		icon: "\uD83E\uDDF1", // brick
		tone: "neutral",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"Absorb the next attack directed at an adjacent ally. Damage taken is halved.",
	},
];

/** Actions unlocked by the Shock Trooper track. */
export const SHOCK_TROOPER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "rush",
		label: "Rush",
		icon: "\u26A1", // lightning
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 2,
		maxRange: 3,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"Sprint 2-3 tiles toward an enemy and attack with +2 damage bonus.",
	},
	{
		id: "execute",
		label: "Execute",
		icon: "\u2620", // skull
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: false,
		requiresAdjacent: true,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 1,
		description:
			"Finishing blow — deals double damage to targets below 50% HP.",
	},
];

// ─── Tech Tree Additions ─────────────────────────────────────────────────────
//
// These techs gate and upgrade the infantry specialization tracks.

export const INFANTRY_TRACK_TECHS: readonly TechDef[] = [
	{
		id: "combat_chassis_specialization",
		name: "Combat Chassis Specialization",
		description:
			"Modular combat frame reconfiguration. Unlocks Vanguard and Shock Trooper specializations at the Garage.",
		tier: 2,
		cost: { alloy_stock: 6, ferrous_scrap: 4, polymer_salvage: 3 },
		turnsToResearch: 4,
		prerequisites: ["reinforced_chassis"],
		effects: [{ type: "unit_hp_bonus" as const, value: 1 }],
	},
	{
		id: "advanced_combat_doctrine",
		name: "Advanced Combat Doctrine",
		description:
			"Next-generation battlefield programming. Upgrades Vanguard to v2 (Graviton Anchor) and Shock Trooper to v2 (Overclocked Servos).",
		tier: 4,
		cost: { intact_components: 9, alloy_stock: 10, storm_charge: 6 },
		turnsToResearch: 8,
		prerequisites: ["combat_chassis_specialization", "mark_iii_components"],
		effects: [{ type: "unit_hp_bonus" as const, value: 2 }],
	},
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all specializations for an infantry track at a given mark level.
 * Returns specs from Mark II up to the current level.
 */
export function getInfantryTrackSpecializations(
	track: InfantryTrack,
	markLevel: number,
	useV2 = false,
): readonly InfantryTrackSpecialization[] {
	const trackDef = INFANTRY_TRACKS[track];
	const base = trackDef.specializations;

	if (!useV2) {
		return base.filter((s) => effectiveMarkLevel(s) <= markLevel);
	}

	// v2: replace base Mark III/IV with upgraded versions
	const v2 = trackDef.v2Upgrades;
	const v2MarkLevels = new Set(v2.map((u) => u.markLevel));

	const merged = [...base.filter((s) => !v2MarkLevels.has(s.markLevel)), ...v2];
	return merged.filter((s) => effectiveMarkLevel(s) <= markLevel);
}

/**
 * Get the actions unlocked by an infantry track.
 */
export function getInfantryTrackActions(
	track: InfantryTrack,
): readonly ClassActionDef[] {
	return track === "vanguard" ? VANGUARD_ACTIONS : SHOCK_TROOPER_ACTIONS;
}

/**
 * Get the effective mark level for a specialization.
 * Handles the Mark II cast (markLevel stored as 3 but logically 2).
 */
function effectiveMarkLevel(spec: InfantryTrackSpecialization): number {
	// Mark II specs use the cast pattern — detect by effectType
	if (
		spec.effectType === "hardened_plating" ||
		spec.effectType === "impact_charge"
	) {
		return 2;
	}
	return spec.markLevel;
}
