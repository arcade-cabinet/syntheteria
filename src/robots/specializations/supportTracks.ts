/**
 * Support (COMPANION) specialization tracks — chosen at FABRICATION time in the Garage.
 *
 * Three permanent tracks (most versatile class gets 3):
 *   A. Field Medic — healing. Better repair, regen aura, emergency revival.
 *   B. Signal Booster — intel/relay. Scan extension, jamming, fog piercing, counter-stealth.
 *   C. War Caller — combat support. Buff allies, debuff enemies, morale/coordination.
 *
 * Same visual model for all tracks — differentiation is gameplay only.
 * Higher-tier tech tree research unlocks upgraded v2 versions that obsolete earlier ones.
 *
 * Design reference: GAME_DESIGN.md S7 (Bot Roster), task #54.
 */

import type { TechDef } from "../../config/techTreeDefs";
import type { ClassActionDef } from "../classActions";
import type { MarkSpecialization } from "../marks";

// ─── Track IDs ───────────────────────────────────────────────────────────────

export type SupportTrack = "field_medic" | "signal_booster" | "war_caller";

// ─── Specialization Interface ────────────────────────────────────────────────

export interface TrackSpecialization extends MarkSpecialization {
	/** Which specialization track this belongs to. */
	readonly track: SupportTrack;
}

// ─── Track A: Field Medic ───────────────────────────────────────────────────
//
// Fantasy: The battlefield surgeon of the machine lattice. Keeps squads
// operational under fire, restores critically damaged units, and at
// transcendence can resurrect destroyed chassis from salvage.

export const FIELD_MEDIC_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "field_medic",
		label: "Triage Protocols",
		markLevel: 2 as 3, // Mark II — cast to satisfy base type, runtime uses 2
		effectType: "triage_protocols",
		effectValue: 3,
		description:
			"Repair action restores 3 HP instead of 2. Can repair self for 1 AP.",
	},
	{
		track: "field_medic",
		label: "Regeneration Aura",
		markLevel: 3,
		effectType: "regen_aura",
		effectValue: 1,
		description: "Adjacent friendly units passively regenerate 1 HP per turn.",
	},
	{
		track: "field_medic",
		label: "Emergency Stabilizer",
		markLevel: 4,
		effectType: "emergency_stabilize",
		effectValue: 1,
		description:
			"When an adjacent friendly unit would be destroyed, it survives at 1 HP once per battle. Costs 2 AP to activate.",
	},
	{
		track: "field_medic",
		label: "Transcendent Restorer",
		markLevel: 5,
		effectType: "chassis_revival",
		effectValue: 1,
		description:
			"Can rebuild a destroyed friendly unit on an adjacent tile at 50% HP. Costs all AP + scrap_metal resources.",
	},
] as const;

// ─── Track B: Signal Booster ────────────────────────────────────────────────
//
// Fantasy: The signal relay node. Extends faction scan coverage, pierces
// enemy fog, detects stealth units, and at transcendence provides
// real-time intelligence on all hostile movement.

export const SIGNAL_BOOSTER_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "signal_booster",
		label: "Relay Amplifier",
		markLevel: 2 as 3, // Mark II
		effectType: "relay_amplifier",
		effectValue: 3,
		description:
			"Extends scan range of all friendly units within 3 tiles by +2.",
	},
	{
		track: "signal_booster",
		label: "Counter-Stealth Array",
		markLevel: 3,
		effectType: "counter_stealth",
		effectValue: 4,
		description: "Reveals stealthed/cloaked enemy units within 4-tile radius.",
	},
	{
		track: "signal_booster",
		label: "Signal Jammer",
		markLevel: 4,
		effectType: "signal_jam",
		effectValue: 3,
		description:
			"Enemy units within 3 tiles lose 3 scan range. Their fog re-covers explored tiles near this unit.",
	},
	{
		track: "signal_booster",
		label: "Transcendent Overseer",
		markLevel: 5,
		effectType: "omniscient_relay",
		effectValue: 1,
		description:
			"All friendly units share vision. Enemy movements within faction territory are permanently visible.",
	},
] as const;

// ─── Track C: War Caller ────────────────────────────────────────────────────
//
// Fantasy: The combat coordinator. Inspires allied machines with tactical
// directives, weakens enemy resolve through signal disruption, and at
// transcendence grants overwhelming tactical superiority to the entire army.

export const WAR_CALLER_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "war_caller",
		label: "Tactical Directive",
		markLevel: 2 as 3, // Mark II
		effectType: "tactical_directive",
		effectValue: 1,
		description:
			"Adjacent friendly units gain +1 attack. Stacks with buff action.",
	},
	{
		track: "war_caller",
		label: "Disruption Wave",
		markLevel: 3,
		effectType: "disruption_wave",
		effectValue: 1,
		description:
			"Active ability: enemies within 2 tiles lose 1 AP next turn. Costs 1 AP, 2-turn cooldown.",
	},
	{
		track: "war_caller",
		label: "Coordination Matrix",
		markLevel: 4,
		effectType: "coordination_matrix",
		effectValue: 2,
		description:
			"All friendly units within 3 tiles gain +1 attack and +1 defense. Does not require staging.",
	},
	{
		track: "war_caller",
		label: "Transcendent Commander",
		markLevel: 5,
		effectType: "supreme_command",
		effectValue: 1,
		description:
			"All friendly units on the board gain +1 AP per turn. The War Caller's buff action affects all units within 3 tiles.",
	},
] as const;

// ─── v2 Upgraded Versions ────────────────────────────────────────────────────
//
// Unlocked by higher-tier tech tree research. Replaces the base track's
// Mark III/IV abilities with strictly better versions.

export const FIELD_MEDIC_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "field_medic",
		label: "Nanite Swarm Repair",
		markLevel: 3,
		effectType: "nanite_regen",
		effectValue: 2,
		description:
			"Replaces Regeneration Aura. All friendly units within 2 tiles regenerate 2 HP per turn.",
	},
	{
		track: "field_medic",
		label: "Failsafe Override",
		markLevel: 4,
		effectType: "failsafe_override",
		effectValue: 2,
		description:
			"Replaces Emergency Stabilizer. Saves up to 2 adjacent friendlies from destruction per battle. Triggers automatically (no AP cost).",
	},
] as const;

export const SIGNAL_BOOSTER_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "signal_booster",
		label: "Quantum Resonance Array",
		markLevel: 3,
		effectType: "quantum_counter_stealth",
		effectValue: 6,
		description:
			"Replaces Counter-Stealth Array. Reveals stealthed enemies within 6 tiles. Revealed enemies take +2 damage from all sources for 1 turn.",
	},
	{
		track: "signal_booster",
		label: "Blackout Pulse",
		markLevel: 4,
		effectType: "blackout_pulse",
		effectValue: 4,
		description:
			"Replaces Signal Jammer. Enemy units within 4 tiles lose all scan range for 1 turn. Buildings in range are disabled.",
	},
] as const;

export const WAR_CALLER_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "war_caller",
		label: "Overcharge Protocol",
		markLevel: 3,
		effectType: "overcharge_wave",
		effectValue: 2,
		description:
			"Replaces Disruption Wave. Enemies within 3 tiles lose 1 AP AND 1 attack next turn. Friendly units gain +1 MP for 1 turn.",
	},
	{
		track: "war_caller",
		label: "Tactical Supremacy",
		markLevel: 4,
		effectType: "tactical_supremacy",
		effectValue: 3,
		description:
			"Replaces Coordination Matrix. All friendly units within 4 tiles gain +2 attack, +2 defense, and +1 MP.",
	},
] as const;

// ─── Combined Track Map ──────────────────────────────────────────────────────

export const SUPPORT_TRACKS: Record<
	SupportTrack,
	{
		readonly label: string;
		readonly description: string;
		readonly specializations: readonly TrackSpecialization[];
		readonly v2Upgrades: readonly TrackSpecialization[];
	}
> = {
	field_medic: {
		label: "Field Medic",
		description:
			"Healing and restoration. Better repair, regeneration aura, emergency revival, and chassis reconstruction.",
		specializations: FIELD_MEDIC_SPECIALIZATIONS,
		v2Upgrades: FIELD_MEDIC_V2_UPGRADES,
	},
	signal_booster: {
		label: "Signal Booster",
		description:
			"Intel and relay warfare. Scan extension, counter-stealth, signal jamming, and fog piercing.",
		specializations: SIGNAL_BOOSTER_SPECIALIZATIONS,
		v2Upgrades: SIGNAL_BOOSTER_V2_UPGRADES,
	},
	war_caller: {
		label: "War Caller",
		description:
			"Combat support and coordination. Buff allies, debuff enemies, and tactical superiority.",
		specializations: WAR_CALLER_SPECIALIZATIONS,
		v2Upgrades: WAR_CALLER_V2_UPGRADES,
	},
};

// ─── New Radial Menu Actions ─────────────────────────────────────────────────

/** Actions unlocked by the Field Medic track. */
export const FIELD_MEDIC_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "self_repair",
		label: "Self-Repair",
		icon: "\u2764", // heart
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 1,
		description: "Repair own chassis for 3 HP",
	},
	{
		id: "revive",
		label: "Revive",
		icon: "\u2B06", // up arrow
		tone: "neutral",
		category: "utility",
		apCost: 2,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 5,
		description:
			"Rebuild a destroyed friendly unit on an adjacent tile at 50% HP",
	},
];

/** Actions unlocked by the Signal Booster track. */
export const SIGNAL_BOOSTER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "counter_scan",
		label: "Scan",
		icon: "\uD83D\uDD0E", // magnifying glass
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 1,
		description:
			"Reveal stealthed units within scan range and extend ally vision",
	},
	{
		id: "jam_signal",
		label: "Jam",
		icon: "\uD83D\uDEAB", // no entry
		tone: "hostile",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"Reduce enemy scan range within 3 tiles. Re-cover their fog near this unit.",
	},
];

/** Actions unlocked by the War Caller track. */
export const WAR_CALLER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "disruption_wave",
		label: "Disrupt",
		icon: "\uD83C\uDF00", // cyclone
		tone: "hostile",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description: "Enemies within 2 tiles lose 1 AP next turn",
	},
	{
		id: "rally",
		label: "Rally",
		icon: "\uD83D\uDCAA", // flexed bicep
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"All friendly units within 3 tiles gain +1 attack and +1 defense for 2 turns",
	},
];

// ─── Tech Tree Additions ─────────────────────────────────────────────────────
//
// These techs gate and upgrade the support specialization tracks.

export const SUPPORT_TRACK_TECHS: readonly TechDef[] = [
	{
		id: "advanced_support_protocols",
		name: "Advanced Support Protocols",
		description:
			"Enhanced support chassis firmware. Unlocks Field Medic, Signal Booster, and War Caller specializations at the Garage.",
		tier: 2,
		cost: { silicon_wafer: 4, polymer_salvage: 3, conductor_wire: 2 },
		turnsToResearch: 4,
		prerequisites: ["reinforced_chassis"],
		effects: [{ type: "unit_hp_bonus" as const, value: 1 }],
	},
	{
		id: "transcendent_support_matrix",
		name: "Transcendent Support Matrix",
		description:
			"Quantum-linked support arrays. Upgrades Field Medic to v2 (Nanite Swarm), Signal Booster to v2 (Quantum Resonance), and War Caller to v2 (Overcharge Protocol).",
		tier: 4,
		cost: { intact_components: 7, silicon_wafer: 9, storm_charge: 5 },
		turnsToResearch: 8,
		prerequisites: ["advanced_support_protocols", "quantum_processors"],
		effects: [{ type: "unit_regen" as const, value: 1 }],
	},
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all specializations for a support track at a given mark level.
 * Returns specs from Mark II up to the current level.
 */
export function getTrackSpecializations(
	track: SupportTrack,
	markLevel: number,
	useV2 = false,
): readonly TrackSpecialization[] {
	const trackDef = SUPPORT_TRACKS[track];
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
 * Get the actions unlocked by a support track.
 */
export function getTrackActions(
	track: SupportTrack,
): readonly ClassActionDef[] {
	switch (track) {
		case "field_medic":
			return FIELD_MEDIC_ACTIONS;
		case "signal_booster":
			return SIGNAL_BOOSTER_ACTIONS;
		case "war_caller":
			return WAR_CALLER_ACTIONS;
	}
}

/**
 * Get the effective mark level for a specialization.
 * Handles the Mark II cast (markLevel stored as 3 but logically 2).
 */
function effectiveMarkLevel(spec: TrackSpecialization): number {
	// Mark II specs use specific effectTypes
	if (
		spec.effectType === "triage_protocols" ||
		spec.effectType === "relay_amplifier" ||
		spec.effectType === "tactical_directive"
	) {
		return 2;
	}
	return spec.markLevel;
}
