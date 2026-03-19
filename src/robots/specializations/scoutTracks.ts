/**
 * Scout (RECON) specialization tracks — chosen at FABRICATION time in the Garage.
 *
 * Two permanent tracks:
 *   A. Pathfinder — exploration/cartography. Better movement, fog clearing, terrain bonuses.
 *   B. Infiltrator — stealth/electronic warfare. Hacking, invisible movement, disruption.
 *
 * Same visual model for both tracks — differentiation is gameplay only.
 * Higher-tier tech tree research unlocks upgraded v2 versions that obsolete earlier ones.
 *
 * Design reference: GAME_DESIGN.md S7 (Bot Roster), task #50.
 */

import type { TechDef } from "../../config/techTreeDefs";
import type { ClassActionDef } from "../classActions";
import type { MarkSpecialization } from "../marks";

// ─── Track IDs ───────────────────────────────────────────────────────────────

export type ScoutTrack = "pathfinder" | "infiltrator";

// ─── Specialization Interface ────────────────────────────────────────────────

export interface TrackSpecialization extends MarkSpecialization {
	/** Which specialization track this belongs to. */
	readonly track: ScoutTrack;
}

// ─── Track A: Pathfinder ─────────────────────────────────────────────────────
//
// Fantasy: The cartographer of the machine lattice. Moves faster through
// hostile terrain, clears fog efficiently, and maps the labyrinth for the
// faction. At transcendence, the entire board becomes visible infrastructure.

export const PATHFINDER_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "pathfinder",
		label: "Terrain Adaptation",
		markLevel: 2 as 3, // Mark II — cast to satisfy base type, runtime uses 2
		effectType: "terrain_adapt",
		effectValue: 1,
		description:
			"Ignores movement penalties from collapsed zones and dust districts. +1 MP.",
	},
	{
		track: "pathfinder",
		label: "Cartographer's Sweep",
		markLevel: 3,
		effectType: "fog_sweep",
		effectValue: 3,
		description:
			"Reveal action clears fog in a 3-tile radius cone in facing direction.",
	},
	{
		track: "pathfinder",
		label: "Wayfinder Pulse",
		markLevel: 4,
		effectType: "wayfinder_pulse",
		effectValue: 5,
		description:
			"Once per turn, reveal all tiles within 5 Manhattan distance. Reveals resource deposits.",
	},
	{
		track: "pathfinder",
		label: "Transcendent Cartographer",
		markLevel: 5,
		effectType: "permanent_vision",
		effectValue: 1,
		description:
			"All explored tiles remain permanently visible. Fog never re-covers mapped territory.",
	},
] as const;

// ─── Track B: Infiltrator ────────────────────────────────────────────────────
//
// Fantasy: The ghost in the machine. Moves unseen, disrupts enemy networks,
// and steals intelligence. The anti-scout: instead of mapping YOUR territory,
// it operates in THEIR territory.

export const INFILTRATOR_SPECIALIZATIONS: readonly TrackSpecialization[] = [
	{
		track: "infiltrator",
		label: "Signal Dampener",
		markLevel: 2 as 3, // Mark II
		effectType: "signal_dampen",
		effectValue: 2,
		description:
			"Reduces enemy scan range by 2 within 3 tiles. -1 AP cost on Signal action.",
	},
	{
		track: "infiltrator",
		label: "Ghost Protocol",
		markLevel: 3,
		effectType: "ghost_protocol",
		effectValue: 1,
		description:
			"Invisible to enemies while stationary. Breaking stealth grants +3 attack on first strike.",
	},
	{
		track: "infiltrator",
		label: "Network Intrusion",
		markLevel: 4,
		effectType: "network_intrusion",
		effectValue: 2,
		description:
			"Can hack enemy buildings within 2 range. Hacked buildings reveal enemy unit positions for 3 turns.",
	},
	{
		track: "infiltrator",
		label: "Transcendent Phantom",
		markLevel: 5,
		effectType: "phantom_network",
		effectValue: 1,
		description:
			"Permanently invisible. All enemy units within scan range have their actions visible to the player.",
	},
] as const;

// ─── v2 Upgraded Versions ────────────────────────────────────────────────────
//
// Unlocked by higher-tier tech tree research. Replaces the base track's
// Mark III/IV abilities with strictly better versions.

export const PATHFINDER_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "pathfinder",
		label: "Seismic Cartography",
		markLevel: 3,
		effectType: "seismic_sweep",
		effectValue: 5,
		description:
			"Replaces Cartographer's Sweep. Reveal action clears fog in 5-tile radius (360 degrees). Also reveals subterranean resource deposits.",
	},
	{
		track: "pathfinder",
		label: "Resonance Mapping",
		markLevel: 4,
		effectType: "resonance_map",
		effectValue: 8,
		description:
			"Replaces Wayfinder Pulse. Passively reveals all tiles within 8 range every turn. Revealed enemy units are marked for +2 damage.",
	},
] as const;

export const INFILTRATOR_V2_UPGRADES: readonly TrackSpecialization[] = [
	{
		track: "infiltrator",
		label: "Quantum Cloak",
		markLevel: 3,
		effectType: "quantum_cloak",
		effectValue: 1,
		description:
			"Replaces Ghost Protocol. Invisible while moving AND stationary. First strike bonus increased to +5 attack.",
	},
	{
		track: "infiltrator",
		label: "Deep Intrusion",
		markLevel: 4,
		effectType: "deep_intrusion",
		effectValue: 4,
		description:
			"Replaces Network Intrusion. Hack range 4. Hacked buildings are disabled for 2 turns and reveal all enemy units globally.",
	},
] as const;

// ─── Combined Track Map ──────────────────────────────────────────────────────

export const SCOUT_TRACKS: Record<
	ScoutTrack,
	{
		readonly label: string;
		readonly description: string;
		readonly specializations: readonly TrackSpecialization[];
		readonly v2Upgrades: readonly TrackSpecialization[];
	}
> = {
	pathfinder: {
		label: "Pathfinder",
		description:
			"Exploration and cartography. Better movement, fog clearing, and terrain mastery.",
		specializations: PATHFINDER_SPECIALIZATIONS,
		v2Upgrades: PATHFINDER_V2_UPGRADES,
	},
	infiltrator: {
		label: "Infiltrator",
		description:
			"Stealth and electronic warfare. Hacking, invisible movement, and network disruption.",
		specializations: INFILTRATOR_SPECIALIZATIONS,
		v2Upgrades: INFILTRATOR_V2_UPGRADES,
	},
};

// ─── New Radial Menu Actions ─────────────────────────────────────────────────

/** Actions unlocked by the Pathfinder track. */
export const PATHFINDER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "sweep_reveal",
		label: "Sweep",
		icon: "\uD83C\uDF0A", // wave
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Directional fog sweep — clears fog in a cone ahead",
	},
	{
		id: "wayfinder_pulse",
		label: "Pulse",
		icon: "\uD83D\uDCE1", // satellite
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 1,
		description: "Reveal all tiles and deposits within 5 range",
	},
];

/** Actions unlocked by the Infiltrator track. */
export const INFILTRATOR_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "cloak",
		label: "Cloak",
		icon: "\uD83D\uDC7B", // ghost
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 2,
		description:
			"Enter stealth — invisible to enemies until you attack or are adjacent",
	},
	{
		id: "hack_building",
		label: "Hack",
		icon: "\uD83D\uDD13", // unlock
		tone: "hostile",
		category: "utility",
		apCost: 1,
		minRange: 1,
		maxRange: 2,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 3,
		description: "Hack an enemy building to reveal unit positions for 3 turns",
	},
];

// ─── Tech Tree Additions ─────────────────────────────────────────────────────
//
// These techs gate and upgrade the scout specialization tracks.

export const SCOUT_TRACK_TECHS: readonly TechDef[] = [
	{
		id: "advanced_recon_optics",
		name: "Advanced Recon Optics",
		description:
			"Enhanced sensor arrays for scout chassis. Unlocks Pathfinder and Infiltrator specializations at the Garage.",
		tier: 2,
		cost: { silicon_wafer: 5, conductor_wire: 3, ferrous_scrap: 2 },
		turnsToResearch: 4,
		prerequisites: ["signal_amplification"],
		effects: [{ type: "signal_range_bonus" as const, value: 0.2 }],
	},
	{
		id: "deep_signal_processing",
		name: "Deep Signal Processing",
		description:
			"Quantum-enhanced signal analysis. Upgrades Pathfinder to v2 (Seismic Cartography) and Infiltrator to v2 (Quantum Cloak).",
		tier: 4,
		cost: { intact_components: 8, silicon_wafer: 10, storm_charge: 5 },
		turnsToResearch: 8,
		prerequisites: ["advanced_recon_optics", "quantum_processors"],
		effects: [{ type: "signal_range_bonus" as const, value: 0.3 }],
	},
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all specializations for a scout track at a given mark level.
 * Returns specs from Mark II up to the current level.
 */
export function getTrackSpecializations(
	track: ScoutTrack,
	markLevel: number,
	useV2 = false,
): readonly TrackSpecialization[] {
	const trackDef = SCOUT_TRACKS[track];
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
 * Get the actions unlocked by a scout track.
 */
export function getTrackActions(track: ScoutTrack): readonly ClassActionDef[] {
	return track === "pathfinder" ? PATHFINDER_ACTIONS : INFILTRATOR_ACTIONS;
}

/**
 * Get the effective mark level for a specialization.
 * Handles the Mark II cast (markLevel stored as 3 but logically 2).
 */
function effectiveMarkLevel(spec: TrackSpecialization): number {
	// Mark II specs have markLevel cast as 3 but effectType starts with terrain_ or signal_
	if (
		spec.effectType === "terrain_adapt" ||
		spec.effectType === "signal_dampen"
	) {
		return 2;
	}
	return spec.markLevel;
}
