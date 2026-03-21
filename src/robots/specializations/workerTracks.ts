/**
 * Worker (MOBILE STORAGE) specialization tracks — chosen at FABRICATION time in the Garage.
 *
 * Three permanent tracks (worker is the most diverse task set → 3 tracks):
 *   A. Deep Miner    — excavation. Floor mining, DAISY dig pattern, depth reduction.
 *   B. Fabricator    — construction. Faster builds, repair structures, upgrade buildings.
 *   C. Salvager      — extraction. Better prop/salvage yields, rare material chance, recycling.
 *
 * Same visual model for all tracks — differentiation is gameplay only.
 * Higher-tier tech tree research unlocks upgraded v2 versions that obsolete earlier ones.
 *
 * Design reference: GAME_DESIGN.md S7 (Bot Roster), task #55.
 */

import type { TechDef } from "../../config";
import type { ClassActionDef } from "../classActions";
import type { MarkSpecialization } from "../marks";

// ─── Track IDs ───────────────────────────────────────────────────────────────

export type WorkerTrack =
	| "deep_miner"
	| "fabricator"
	| "salvager"
	| "aquatic_engineer";

// ─── Specialization Interface ────────────────────────────────────────────────

export interface WorkerTrackSpecialization extends MarkSpecialization {
	/** Which specialization track this belongs to. */
	readonly track: WorkerTrack;
}

// ─── Track A: Deep Miner ─────────────────────────────────────────────────────
//
// Fantasy: The excavator of the machine lattice. Digs into the floor substrate,
// creating visible pits with dirt/gravel texture and ramps down. The DAISY
// pattern (center + 4 cardinal cells) turns the worker into a terraforming unit
// that reshapes the board itself. At transcendence, targeted mining lets you
// dig any specific cell without needing an adjacent ramp.

export const DEEP_MINER_SPECIALIZATIONS: readonly WorkerTrackSpecialization[] =
	[
		{
			track: "deep_miner",
			label: "Subsurface Probe",
			markLevel: 2 as 3, // Mark II — cast to satisfy base type, runtime uses 2
			effectType: "subsurface_probe",
			effectValue: 2,
			description:
				"Prospect action also reveals floor mining yields on adjacent tiles. +2 scan range for resource deposits.",
		},
		{
			track: "deep_miner",
			label: "DAISY Excavation",
			markLevel: 3,
			effectType: "daisy_dig",
			effectValue: 5,
			description:
				"Dig center cell + 4 cardinal neighbors simultaneously. Creates dirt pits with ramps (elevation -1). Yields floor resources from all 5 cells.",
		},
		{
			track: "deep_miner",
			label: "Deep Bore",
			markLevel: 4,
			effectType: "deep_bore",
			effectValue: 2,
			description:
				"DAISY pattern digs 2 levels deep (-2 elevation). Deeper pits yield +50% resources. Exposes buried resource deposits.",
		},
		{
			track: "deep_miner",
			label: "Transcendent Excavator",
			markLevel: 5,
			effectType: "targeted_mining",
			effectValue: 3,
			description:
				"Targeted mining within 3 range — dig any visible cell without adjacent ramp. Mined cells have 25% chance to expose rare alloy.",
		},
	] as const;

// ─── Track B: Fabricator ─────────────────────────────────────────────────────
//
// Fantasy: The master builder. Constructs faster, repairs damaged structures,
// and can upgrade existing buildings in-place. At transcendence, buildings
// complete instantly and cost 25% less. The Fabricator turns the worker from a
// construction unit into a logistics multiplier.

export const FABRICATOR_SPECIALIZATIONS: readonly WorkerTrackSpecialization[] =
	[
		{
			track: "fabricator",
			label: "Rapid Assembly",
			markLevel: 2 as 3, // Mark II
			effectType: "rapid_assembly",
			effectValue: 1,
			description:
				"Build action takes 1 fewer turn to complete. Reduces build tick-down by 1.",
		},
		{
			track: "fabricator",
			label: "Field Repair",
			markLevel: 3,
			effectType: "field_repair",
			effectValue: 3,
			description:
				"New action: Repair adjacent friendly building for 3 HP. Costs 1 AP, no resources.",
		},
		{
			track: "fabricator",
			label: "Structural Upgrade",
			markLevel: 4,
			effectType: "structural_upgrade",
			effectValue: 1,
			description:
				"New action: Upgrade adjacent building to next tier. Costs 50% of original build cost. Upgraded buildings have +50% HP and enhanced effects.",
		},
		{
			track: "fabricator",
			label: "Transcendent Constructor",
			markLevel: 5,
			effectType: "instant_fabrication",
			effectValue: 25,
			description:
				"All builds complete instantly. Construction costs reduced by 25%. Repaired buildings gain a temporary +2 defense shield for 3 turns.",
		},
	] as const;

// ─── Track C: Salvager ───────────────────────────────────────────────────────
//
// Fantasy: The scavenger supreme. Extracts maximum value from every prop,
// wreck, and ruin on the map. The Salvager turns debris fields into resource
// bonanzas and can find rare materials that other workers miss entirely.
// At transcendence, dismantling returns full cost and has a chance to yield
// el_crystal from any source.

export const SALVAGER_SPECIALIZATIONS: readonly WorkerTrackSpecialization[] = [
	{
		track: "salvager",
		label: "Efficient Extraction",
		markLevel: 2 as 3, // Mark II
		effectType: "efficient_extraction",
		effectValue: 25,
		description:
			"Harvest and Salvage actions yield +25% resources. Salvage refund increased from 50% to 75%.",
	},
	{
		track: "salvager",
		label: "Material Analysis",
		markLevel: 3,
		effectType: "material_analysis",
		effectValue: 15,
		description:
			"15% chance to find bonus rare materials (fuel, quantum_crystal) when harvesting any deposit. Prospect reveals exact yield amounts.",
	},
	{
		track: "salvager",
		label: "Rapid Dismantle",
		markLevel: 4,
		effectType: "rapid_dismantle",
		effectValue: 0,
		description:
			"Salvage action is instant (0 tick-down) and costs 0 AP. Can salvage enemy buildings if adjacent and undefended.",
	},
	{
		track: "salvager",
		label: "Transcendent Recycler",
		markLevel: 5,
		effectType: "total_recycling",
		effectValue: 100,
		description:
			"Salvage returns 100% of build cost. Every harvest has 10% chance to yield quantum_crystal. Destroyed enemy units in scan range drop salvage.",
	},
] as const;

// ─── Track D: Aquatic Engineer ──────────────────────────────────────────────
//
// Fantasy: A waterproofed worker that can build on water tiles and harvest
// aquatic resources. Enables coastal and naval infrastructure. Unlocked at
// Motor Pool tier 3.

export const AQUATIC_ENGINEER_SPECIALIZATIONS: readonly WorkerTrackSpecialization[] =
	[
		{
			track: "aquatic_engineer",
			label: "Platform Assembly",
			markLevel: 2 as 3,
			effectType: "platform_assembly",
			effectValue: 1,
			description:
				"Can build on water tiles (creates platform improvements). Water movement cost 2.0.",
		},
		{
			track: "aquatic_engineer",
			label: "Aquatic Harvesting",
			markLevel: 3,
			effectType: "aquatic_harvest",
			effectValue: 2,
			description:
				"Can harvest water tile resources. Water deposits yield +50% materials.",
		},
		{
			track: "aquatic_engineer",
			label: "Naval Infrastructure",
			markLevel: 4,
			effectType: "naval_infra",
			effectValue: 1,
			description:
				"Buildings on water platforms gain +2 signal range. Platforms connect to power grid across water.",
		},
		{
			track: "aquatic_engineer",
			label: "Transcendent Dockmaster",
			markLevel: 5,
			effectType: "transcendent_dockmaster",
			effectValue: 1,
			description:
				"Platform building is instant. All water tiles within 3 range of platforms become passable. Aquatic buildings have double HP.",
		},
	] as const;

// ─── v2 Upgraded Versions ────────────────────────────────────────────────────
//
// Unlocked by higher-tier tech tree research. Replaces the base track's
// Mark III/IV abilities with strictly better versions.

export const DEEP_MINER_V2_UPGRADES: readonly WorkerTrackSpecialization[] = [
	{
		track: "deep_miner",
		label: "Seismic DAISY",
		markLevel: 3,
		effectType: "seismic_daisy",
		effectValue: 9,
		description:
			"Replaces DAISY Excavation. Digs center + 8 surrounding cells (3x3 grid). All cells become dirt pits with ramp access. +75% yield from expanded pattern.",
	},
	{
		track: "deep_miner",
		label: "Abyssal Bore",
		markLevel: 4,
		effectType: "abyssal_bore",
		effectValue: 3,
		description:
			"Replaces Deep Bore. Digs 3 levels deep (-3 elevation). Exposes abyssal-tier resources (fuel, alloy) regardless of floor type.",
	},
] as const;

export const FABRICATOR_V2_UPGRADES: readonly WorkerTrackSpecialization[] = [
	{
		track: "fabricator",
		label: "Nano-Repair Swarm",
		markLevel: 3,
		effectType: "nano_repair",
		effectValue: 5,
		description:
			"Replaces Field Repair. Repairs all friendly buildings within 2 range for 5 HP each. Passive: adjacent buildings regenerate 1 HP/turn.",
	},
	{
		track: "fabricator",
		label: "Architect's Vision",
		markLevel: 4,
		effectType: "architects_vision",
		effectValue: 2,
		description:
			"Replaces Structural Upgrade. Upgrade costs reduced to 25% of original. Upgraded buildings gain +100% HP and a new passive ability based on building type.",
	},
] as const;

export const SALVAGER_V2_UPGRADES: readonly WorkerTrackSpecialization[] = [
	{
		track: "salvager",
		label: "Quantum Sifting",
		markLevel: 3,
		effectType: "quantum_sifting",
		effectValue: 30,
		description:
			"Replaces Material Analysis. 30% chance for bonus rare materials. Harvesting also yields secondary material based on floor type.",
	},
	{
		track: "salvager",
		label: "Total Disassembly",
		markLevel: 4,
		effectType: "total_disassembly",
		effectValue: 0,
		description:
			"Replaces Rapid Dismantle. Salvage any structure (friendly or enemy) instantly. Enemy buildings yield 75% of their cost to you. No adjacency required — range 2.",
	},
] as const;

// ─── Combined Track Map ──────────────────────────────────────────────────────

export const WORKER_TRACKS: Record<
	WorkerTrack,
	{
		readonly label: string;
		readonly description: string;
		readonly specializations: readonly WorkerTrackSpecialization[];
		readonly v2Upgrades: readonly WorkerTrackSpecialization[];
	}
> = {
	deep_miner: {
		label: "Deep Miner",
		description:
			"Excavation and terraforming. DAISY dig pattern, depth reduction, underground resource access.",
		specializations: DEEP_MINER_SPECIALIZATIONS,
		v2Upgrades: DEEP_MINER_V2_UPGRADES,
	},
	fabricator: {
		label: "Fabricator",
		description:
			"Construction mastery. Faster builds, structure repair, building upgrades, cost reduction.",
		specializations: FABRICATOR_SPECIALIZATIONS,
		v2Upgrades: FABRICATOR_V2_UPGRADES,
	},
	salvager: {
		label: "Salvager",
		description:
			"Extraction and recycling. Better salvage yields, rare material chance, instant dismantle.",
		specializations: SALVAGER_SPECIALIZATIONS,
		v2Upgrades: SALVAGER_V2_UPGRADES,
	},
	aquatic_engineer: {
		label: "Aquatic Engineer",
		description:
			"Naval construction. Build on water, harvest aquatic resources, coastal infrastructure.",
		specializations: AQUATIC_ENGINEER_SPECIALIZATIONS,
		v2Upgrades: [],
	},
};

// ─── New Radial Menu Actions ─────────────────────────────────────────────────

/** Actions unlocked by the Deep Miner track. */
export const DEEP_MINER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "daisy_dig",
		label: "DAISY Dig",
		icon: "\u26CF", // pick
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"Excavate center + 4 cardinal cells. Creates dirt pits with ramps (-1 elevation)",
	},
	{
		id: "targeted_mine",
		label: "Target Mine",
		icon: "\uD83D\uDD2D", // telescope
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 3,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 1,
		description:
			"Mine a specific tile at range — no adjacent ramp needed (Mark V)",
	},
];

/** Actions unlocked by the Fabricator track. */
export const FABRICATOR_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "repair_building",
		label: "Repair",
		icon: "\uD83D\uDD27", // wrench
		tone: "construct",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: true,
		cooldown: 0,
		description: "Repair adjacent friendly building for 3 HP",
	},
	{
		id: "upgrade_building",
		label: "Upgrade",
		icon: "\u2B06", // up arrow
		tone: "construct",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: true,
		cooldown: 0,
		description:
			"Upgrade adjacent building to next tier (costs 50% of original)",
	},
];

/** Actions unlocked by the Salvager track. */
export const SALVAGER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "analyze_deposit",
		label: "Analyze",
		icon: "\uD83D\uDD0D", // magnifying glass
		tone: "neutral",
		category: "utility",
		apCost: 0,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"Reveal exact yield and rare material chance of adjacent deposit",
	},
	{
		id: "strip_salvage",
		label: "Strip",
		icon: "\u267B", // recycle
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 2,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 2,
		description: "Salvage an undefended enemy building at range 2 (Mark IV+)",
	},
];

/** Actions unlocked by the Aquatic Engineer track. */
export const AQUATIC_ENGINEER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "build_platform",
		label: "Platform",
		icon: "\uD83C\uDF0A", // wave
		tone: "construct",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description:
			"Build a platform on adjacent water tile, enabling construction",
	},
	{
		id: "aquatic_harvest",
		label: "Dredge",
		icon: "\u2693", // anchor
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Harvest resources from water tiles",
	},
];

// ─── Tech Tree Additions ─────────────────────────────────────────────────────
//
// These techs gate and upgrade the worker specialization tracks.

export const WORKER_TRACK_TECHS: readonly TechDef[] = [
	{
		id: "industrial_specialization",
		name: "Industrial Specialization",
		description:
			"Advanced chassis modularity for worker units. Unlocks Deep Miner, Fabricator, and Salvager specializations at the Garage.",
		tier: 2,
		cost: { steel: 5, iron_ore: 4, timber: 3 },
		turnsToResearch: 4,
		prerequisites: ["advanced_harvesting"],
		effects: [{ type: "harvest_bonus" as const, value: 0.1 }],
	},
	{
		id: "deep_industrial_systems",
		name: "Deep Industrial Systems",
		description:
			"Quantum-enhanced industrial processes. Upgrades Deep Miner to v2 (Seismic DAISY), Fabricator to v2 (Nano-Repair Swarm), and Salvager to v2 (Quantum Sifting).",
		tier: 4,
		cost: { steel: 18, fuel: 6 },
		turnsToResearch: 8,
		prerequisites: ["industrial_specialization", "deep_mining"],
		effects: [{ type: "harvest_bonus" as const, value: 0.15 }],
	},
];

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all specializations for a worker track at a given mark level.
 * Returns specs from Mark II up to the current level.
 */
export function getWorkerTrackSpecializations(
	track: WorkerTrack,
	markLevel: number,
	useV2 = false,
): readonly WorkerTrackSpecialization[] {
	const trackDef = WORKER_TRACKS[track];
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
 * Get the actions unlocked by a worker track.
 */
export function getWorkerTrackActions(
	track: WorkerTrack,
): readonly ClassActionDef[] {
	switch (track) {
		case "deep_miner":
			return DEEP_MINER_ACTIONS;
		case "fabricator":
			return FABRICATOR_ACTIONS;
		case "salvager":
			return SALVAGER_ACTIONS;
		case "aquatic_engineer":
			return AQUATIC_ENGINEER_ACTIONS;
	}
}

/**
 * Get the effective mark level for a specialization.
 * Handles the Mark II cast (markLevel stored as 3 but logically 2).
 */
function effectiveMarkLevel(spec: WorkerTrackSpecialization): number {
	if (
		spec.effectType === "subsurface_probe" ||
		spec.effectType === "rapid_assembly" ||
		spec.effectType === "efficient_extraction" ||
		spec.effectType === "platform_assembly"
	) {
		return 2;
	}
	return spec.markLevel;
}
