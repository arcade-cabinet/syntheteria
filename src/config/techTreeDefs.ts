/**
 * Tech tree definitions — base techs + specialization track techs.
 *
 * Prerequisite chains form the research DAG.
 * Effects are applied when research completes.
 *
 * Track techs are imported from the 6 specialization track files and
 * merged into TECH_TREE automatically. Do NOT duplicate them here.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TechEffectType =
	| "harvest_bonus"
	| "signal_range_bonus"
	| "unit_hp_bonus"
	| "storm_resistance"
	| "fabrication_cost_reduction"
	| "hacking_defense_bonus"
	| "unlock_mark_level"
	| "unlock_deep_harvest"
	| "unit_regen"
	| "hacking_speed_bonus"
	| "research_speed_bonus"
	| "unlock_wormhole"
	| "enable_wormhole_construction";

export interface TechEffect {
	readonly type: TechEffectType;
	readonly value: number;
}

export interface TechDef {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly tier: 1 | 2 | 3 | 4 | 5;
	readonly cost: Readonly<Record<string, number>>;
	readonly turnsToResearch: number;
	readonly prerequisites: readonly string[];
	readonly effects: readonly TechEffect[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Resource name mapping from old JSON keys to our 13-material taxonomy:
 *   microchips      → silicon_wafer
 *   scrap           → scrap_metal
 *   heavy_metals    → alloy_stock
 *   plastics        → polymer_salvage
 *   light_metals    → ferrous_scrap
 *   uranics         → storm_charge
 *   rare_components → intact_components
 *   oil             → electrolyte
 */
const BASE_TECHS: readonly TechDef[] = [
	// ── Tier 1 ──────────────────────────────────────────────────────────────
	{
		id: "advanced_harvesting",
		name: "Advanced Harvesting",
		description:
			"Improved material extraction techniques. Harvesting yields +25%.",
		tier: 1,
		cost: { silicon_wafer: 3, scrap_metal: 5 },
		turnsToResearch: 3,
		prerequisites: [],
		effects: [{ type: "harvest_bonus", value: 0.25 }],
	},
	{
		id: "signal_amplification",
		name: "Signal Amplification",
		description: "Extended relay tower range. Signal range +50%.",
		tier: 1,
		cost: { silicon_wafer: 4, ferrous_scrap: 3 },
		turnsToResearch: 3,
		prerequisites: [],
		effects: [{ type: "signal_range_bonus", value: 0.5 }],
	},
	{
		id: "reinforced_chassis",
		name: "Reinforced Chassis",
		description: "Hardened unit frames. All units gain +2 HP.",
		tier: 1,
		cost: { alloy_stock: 5, polymer_salvage: 3 },
		turnsToResearch: 3,
		prerequisites: [],
		effects: [{ type: "unit_hp_bonus", value: 2 }],
	},

	// ── Tier 2 ──────────────────────────────────────────────────────────────
	{
		id: "storm_shielding",
		name: "Storm Shielding",
		description: "Protective field generators. Buildings resist storm damage.",
		tier: 2,
		cost: { storm_charge: 4, alloy_stock: 6, silicon_wafer: 3 },
		turnsToResearch: 5,
		prerequisites: ["reinforced_chassis"],
		effects: [{ type: "storm_resistance", value: 0.5 }],
	},
	{
		id: "efficient_fabrication",
		name: "Efficient Fabrication",
		description: "Optimized assembly processes. Fabrication costs reduced 20%.",
		tier: 2,
		cost: { silicon_wafer: 6, intact_components: 2 },
		turnsToResearch: 4,
		prerequisites: ["advanced_harvesting"],
		effects: [{ type: "fabrication_cost_reduction", value: 0.2 }],
	},
	{
		id: "network_encryption",
		name: "Network Encryption",
		description: "Hardened signal protocols. Hacking defense +30%.",
		tier: 2,
		cost: { silicon_wafer: 8, ferrous_scrap: 4 },
		turnsToResearch: 4,
		prerequisites: ["signal_amplification"],
		effects: [{ type: "hacking_defense_bonus", value: 0.3 }],
	},
	{
		id: "mark_ii_components",
		name: "Mark II Components",
		description:
			"Unlocks Mark II unit upgrades. Units can be upgraded to Mark II.",
		tier: 2,
		cost: { intact_components: 3, silicon_wafer: 5, alloy_stock: 4 },
		turnsToResearch: 5,
		prerequisites: ["reinforced_chassis"],
		effects: [{ type: "unlock_mark_level", value: 2 }],
	},

	// ── Tier 3 ──────────────────────────────────────────────────────────────
	{
		id: "deep_mining",
		name: "Deep Mining",
		description:
			"Access buried resource deposits. Unlocks advanced material harvesting.",
		tier: 3,
		cost: { alloy_stock: 10, silicon_wafer: 6, electrolyte: 5 },
		turnsToResearch: 6,
		prerequisites: ["efficient_fabrication", "advanced_harvesting"],
		effects: [{ type: "unlock_deep_harvest", value: 1 }],
	},
	{
		id: "adaptive_armor",
		name: "Adaptive Armor",
		description:
			"Self-repairing armor plating. Units regenerate 1 HP per turn.",
		tier: 3,
		cost: { intact_components: 5, alloy_stock: 8, polymer_salvage: 6 },
		turnsToResearch: 6,
		prerequisites: ["storm_shielding", "mark_ii_components"],
		effects: [{ type: "unit_regen", value: 1 }],
	},
	{
		id: "mark_iii_components",
		name: "Mark III Components",
		description: "Unlocks Mark III unit upgrades with enhanced capabilities.",
		tier: 3,
		cost: { intact_components: 6, silicon_wafer: 8, storm_charge: 4 },
		turnsToResearch: 7,
		prerequisites: ["mark_ii_components"],
		effects: [{ type: "unlock_mark_level", value: 3 }],
	},

	// ── Tier 4 ──────────────────────────────────────────────────────────────
	{
		id: "quantum_processors",
		name: "Quantum Processors",
		description:
			"Next-generation computation. Hacking speed +50%, research speed +25%.",
		tier: 4,
		cost: { intact_components: 8, silicon_wafer: 12, storm_charge: 6 },
		turnsToResearch: 8,
		prerequisites: ["network_encryption", "deep_mining"],
		effects: [
			{ type: "hacking_speed_bonus", value: 0.5 },
			{ type: "research_speed_bonus", value: 0.25 },
		],
	},
	{
		id: "mark_iv_components",
		name: "Mark IV Components",
		description: "Near-peak machine evolution. Unlocks Mark IV upgrades.",
		tier: 4,
		cost: { intact_components: 10, silicon_wafer: 10, storm_charge: 8 },
		turnsToResearch: 9,
		prerequisites: ["mark_iii_components", "adaptive_armor"],
		effects: [{ type: "unlock_mark_level", value: 4 }],
	},
	{
		id: "wormhole_theory",
		name: "Wormhole Theory",
		description:
			"Theoretical framework for spacetime manipulation. Prerequisite for Wormhole construction.",
		tier: 4,
		cost: { intact_components: 12, silicon_wafer: 14, storm_charge: 10 },
		turnsToResearch: 10,
		prerequisites: ["quantum_processors"],
		effects: [{ type: "unlock_wormhole", value: 1 }],
	},

	// ── Tier 5 ──────────────────────────────────────────────────────────────
	{
		id: "mark_v_transcendence",
		name: "Mark V Transcendence",
		description:
			"The pinnacle of machine evolution. Unlocks Mark V — Technical Supremacy victory path.",
		tier: 5,
		cost: { intact_components: 15, silicon_wafer: 15, storm_charge: 10 },
		turnsToResearch: 12,
		prerequisites: ["mark_iv_components", "quantum_processors"],
		effects: [{ type: "unlock_mark_level", value: 5 }],
	},
	{
		id: "wormhole_stabilization",
		name: "Wormhole Stabilization",
		description:
			"Enables Wormhole construction. The path home — or to new frontiers. Wormhole victory path.",
		tier: 5,
		cost: {
			intact_components: 20,
			storm_charge: 15,
			silicon_wafer: 10,
			alloy_stock: 15,
		},
		turnsToResearch: 15,
		prerequisites: ["wormhole_theory"],
		effects: [{ type: "enable_wormhole_construction", value: 1 }],
	},
] as const;

// ---------------------------------------------------------------------------
// Track specialization techs — imported from the 6 class track files
// ---------------------------------------------------------------------------

import {
	CAVALRY_TRACK_TECHS,
	INFANTRY_TRACK_TECHS,
	RANGED_SPEC_TECHS,
	SCOUT_TRACK_TECHS,
	SUPPORT_TRACK_TECHS,
	WORKER_TRACK_TECHS,
} from "../robots";

/** All track techs merged from the 6 class specialization files. */
const TRACK_TECHS: readonly TechDef[] = [
	...SCOUT_TRACK_TECHS,
	...INFANTRY_TRACK_TECHS,
	...CAVALRY_TRACK_TECHS,
	...RANGED_SPEC_TECHS,
	...SUPPORT_TRACK_TECHS,
	...WORKER_TRACK_TECHS,
];

/** Combined tech tree: base techs + track specialization techs. */
export const TECH_TREE: readonly TechDef[] = [...BASE_TECHS, ...TRACK_TECHS];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Fast lookup by tech ID. */
export const TECH_BY_ID: ReadonlyMap<string, TechDef> = new Map(
	TECH_TREE.map((t) => [t.id, t]),
);

/** Get all techs at a given tier. */
export function getTechsByTier(tier: number): TechDef[] {
	return TECH_TREE.filter((t) => t.tier === tier);
}
