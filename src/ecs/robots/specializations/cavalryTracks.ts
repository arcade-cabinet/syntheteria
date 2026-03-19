/**
 * Cavalry (ARACHNOID) specialization tracks — chosen at FABRICATION time in the Garage.
 *
 * Two permanent tracks:
 *   A. Flanker — positional combat. Side/rear bonuses, terrain ambush, maneuver warfare.
 *   B. Interceptor — reaction/denial. Attacks of opportunity, movement disruption, area lockdown.
 *
 * Same visual model for both tracks — differentiation is gameplay only.
 * Higher-tier tech tree research unlocks upgraded v2 versions that obsolete earlier ones.
 *
 * Design reference: GAME_DESIGN.md S7 (Bot Roster), task #52.
 */

import type { MarkSpecialization } from "../marks";
import type { ClassActionDef } from "../classActions";
import type { TechDef } from "../../../config/techTreeDefs";

// ─── Track IDs ───────────────────────────────────────────────────────────────

export type CavalryTrack = "flanker" | "interceptor";

// ─── Specialization Interface ────────────────────────────────────────────────

export interface TrackSpecialization extends MarkSpecialization {
	/** Which specialization track this belongs to. */
	readonly track: CavalryTrack;
}

// ─── Track A: Flanker ───────────────────────────────────────────────────────
//
// Fantasy: The blade that strikes where armor is thinnest. Masters of
// positional warfare — circling to side arcs, diving behind defensive lines,
// and using terrain as springboards for devastating ambush charges. The
// Arachnoid's multi-limbed chassis makes it uniquely suited to clinging to
// walls and dropping onto unsuspecting targets from above.

export const FLANKER_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "flanker",
		label: "Side Arc Mastery",
		markLevel: 2 as 3, // Mark II — cast to satisfy base type, runtime uses 2
		effectType: "side_arc_bonus",
		effectValue: 2,
		description: "Attacks from side tiles deal +2 damage. Flank action bonus increased to +5 from rear.",
	},
	{
		track: "flanker",
		label: "Terrain Ambush",
		markLevel: 3,
		effectType: "terrain_ambush",
		effectValue: 3,
		description: "Charge from elevated or corridor terrain deals +3 bonus damage. No counterattack on ambush charges.",
	},
	{
		track: "flanker",
		label: "Encirclement",
		markLevel: 4,
		effectType: "encirclement",
		effectValue: 2,
		description: "+2 damage per friendly unit adjacent to target. Max +6 bonus with 3 allies surrounding.",
	},
	{
		track: "flanker",
		label: "Transcendent Predator",
		markLevel: 5,
		effectType: "predator_instinct",
		effectValue: 1,
		description: "After any kill, immediately gain a free Charge action. Flanking attacks ignore target defense entirely.",
	},
] as const;

// ─── Track B: Interceptor ───────────────────────────────────────────────────
//
// Fantasy: The lockdown enforcer. Where the Flanker seeks openings, the
// Interceptor denies them. It controls corridors and chokepoints, punishing
// any enemy that dares move through its threat zone. Enemies learn quickly
// that passing through an Interceptor's territory is a death sentence.

export const INTERCEPTOR_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "interceptor",
		label: "Reactive Pounce",
		markLevel: 2 as 3, // Mark II
		effectType: "reactive_pounce",
		effectValue: 2,
		description: "When an enemy moves within 2 tiles, may immediately move adjacent and attack (once per turn).",
	},
	{
		track: "interceptor",
		label: "Corridor Denial",
		markLevel: 3,
		effectType: "corridor_denial",
		effectValue: 2,
		description: "Enemies within 2 tiles pay +2 MP to move. Does not stack with other Interceptors.",
	},
	{
		track: "interceptor",
		label: "Threat Projection",
		markLevel: 4,
		effectType: "threat_projection",
		effectValue: 3,
		description: "Extends threat zone to 3 tiles. Enemies entering threat zone lose 1 AP for that turn.",
	},
	{
		track: "interceptor",
		label: "Transcendent Warden",
		markLevel: 5,
		effectType: "warden_aura",
		effectValue: 1,
		description: "Reactive Pounce triggers unlimited times per turn. Enemies in threat zone cannot Retreat or use free-movement abilities.",
	},
] as const;

// ─── v2 Upgraded Versions ────────────────────────────────────────────────────
//
// Unlocked by higher-tier tech tree research. Replaces the base track's
// Mark III/IV abilities with strictly better versions.

export const FLANKER_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "flanker",
		label: "Phantom Ambush",
		markLevel: 3,
		effectType: "phantom_ambush",
		effectValue: 5,
		description: "Replaces Terrain Ambush. Charge from any tile deals +5 damage. Ambush attacks are invisible to enemies until damage resolves.",
	},
	{
		track: "flanker",
		label: "Coordinated Slaughter",
		markLevel: 4,
		effectType: "coordinated_slaughter",
		effectValue: 3,
		description: "Replaces Encirclement. +3 damage per friendly unit within 2 tiles of target (not just adjacent). All surrounding allies also deal +1 bonus damage to the same target until next turn.",
	},
] as const;

export const INTERCEPTOR_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "interceptor",
		label: "Gravity Well",
		markLevel: 3,
		effectType: "gravity_well",
		effectValue: 3,
		description: "Replaces Corridor Denial. Enemies within 3 tiles pay +3 MP to move. Enemies that end movement in the zone are Pinned (cannot move next turn).",
	},
	{
		track: "interceptor",
		label: "Kill Box",
		markLevel: 4,
		effectType: "kill_box",
		effectValue: 4,
		description: "Replaces Threat Projection. Threat zone extends to 4 tiles. Enemies entering the zone take 2 immediate damage and lose 1 AP.",
	},
] as const;

// ─── Combined Track Map ──────────────────────────────────────────────────────

export const CAVALRY_TRACKS: Record<CavalryTrack, {
	readonly label: string;
	readonly description: string;
	readonly specializations: readonly TrackSpecialization[];
	readonly v2Upgrades: readonly TrackSpecialization[];
}> = {
	flanker: {
		label: "Flanker",
		description: "Positional combat. Side/rear attack bonuses, terrain ambush charges, and encirclement warfare.",
		specializations: FLANKER_SPECIALIZATIONS,
		v2Upgrades: FLANKER_V2_UPGRADES,
	},
	interceptor: {
		label: "Interceptor",
		description: "Reaction and denial. Attacks of opportunity, movement disruption, and area lockdown.",
		specializations: INTERCEPTOR_SPECIALIZATIONS,
		v2Upgrades: INTERCEPTOR_V2_UPGRADES,
	},
};

// ─── New Radial Menu Actions ─────────────────────────────────────────────────

/** Actions unlocked by the Flanker track. */
export const FLANKER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "ambush_charge",
		label: "Ambush",
		icon: "\uD83D\uDDE1", // dagger
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
		description: "Charge with terrain bonus damage — no counterattack if from elevation or corridor",
	},
	{
		id: "surround",
		label: "Surround",
		icon: "\u21BB", // clockwise circle arrow
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
		description: "Encirclement attack — bonus damage per friendly unit near the target",
	},
];

/** Actions unlocked by the Interceptor track. */
export const INTERCEPTOR_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "pounce",
		label: "Pounce",
		icon: "\uD83D\uDC3E", // paw prints
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 1,
		maxRange: 2,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 1,
		description: "Leap to an enemy within 2 tiles and attack — can trigger as reaction",
	},
	{
		id: "lockdown",
		label: "Lockdown",
		icon: "\uD83D\uDD12", // lock
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description: "Activate threat zone — enemies moving nearby pay extra MP and lose AP",
	},
];

// ─── Tech Tree Additions ─────────────────────────────────────────────────────
//
// These techs gate and upgrade the cavalry specialization tracks.

export const CAVALRY_TRACK_TECHS: readonly TechDef[] = [
	{
		id: "arachnoid_motor_suite",
		name: "Arachnoid Motor Suite",
		description: "Articulated limb actuators for cavalry chassis. Unlocks Flanker and Interceptor specializations at the Garage.",
		tier: 2,
		cost: { alloy_stock: 5, polymer_salvage: 3, ferrous_scrap: 2 },
		turnsToResearch: 4,
		prerequisites: ["reinforced_chassis"],
		effects: [{ type: "unit_hp_bonus" as const, value: 1 }],
	},
	{
		id: "predator_reflex_core",
		name: "Predator Reflex Core",
		description: "Neural-reactive combat processors. Upgrades Flanker to v2 (Phantom Ambush) and Interceptor to v2 (Gravity Well).",
		tier: 4,
		cost: { intact_components: 8, alloy_stock: 10, storm_charge: 5 },
		turnsToResearch: 8,
		prerequisites: ["arachnoid_motor_suite", "mark_iii_components"],
		effects: [{ type: "unit_hp_bonus" as const, value: 2 }],
	},
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all specializations for a cavalry track at a given mark level.
 * Returns specs from Mark II up to the current level.
 */
export function getTrackSpecializations(
	track: CavalryTrack,
	markLevel: number,
	useV2 = false,
): readonly TrackSpecialization[] {
	const trackDef = CAVALRY_TRACKS[track];
	const base = trackDef.specializations;

	if (!useV2) {
		return base.filter(s => effectiveMarkLevel(s) <= markLevel);
	}

	// v2: replace base Mark III/IV with upgraded versions
	const v2 = trackDef.v2Upgrades;
	const v2MarkLevels = new Set(v2.map(u => u.markLevel));

	const merged = [
		...base.filter(s => !v2MarkLevels.has(s.markLevel)),
		...v2,
	];
	return merged.filter(s => effectiveMarkLevel(s) <= markLevel);
}

/**
 * Get the actions unlocked by a cavalry track.
 */
export function getTrackActions(track: CavalryTrack): readonly ClassActionDef[] {
	return track === "flanker" ? FLANKER_ACTIONS : INTERCEPTOR_ACTIONS;
}

/**
 * Get the effective mark level for a specialization.
 * Handles the Mark II cast (markLevel stored as 3 but logically 2).
 */
function effectiveMarkLevel(spec: TrackSpecialization): number {
	// Mark II specs have markLevel cast as 3 but effectType identifies them
	if (spec.effectType === "side_arc_bonus" || spec.effectType === "reactive_pounce") {
		return 2;
	}
	return spec.markLevel;
}
