import type { ResourceMaterial } from "../terrain";
import type { RobotClass } from "./types";

export type BotMark =
	| "reinforced_hull"
	| "extended_range"
	| "swift_treads"
	| "harvester_arm"
	| "shield_emitter"
	| "power_core"
	| "quantum_processor";

export interface MarkDef {
	/** Display label in radial menu. */
	readonly label: string;
	/** Stat changes applied to the unit. */
	readonly effects: {
		hp?: number;
		maxHp?: number;
		ap?: number;
		maxAp?: number;
		mp?: number;
		maxMp?: number;
		scanRange?: number;
		attack?: number;
		defense?: number;
	};
	/** Resource cost to apply this mark. */
	readonly cost: Partial<Record<ResourceMaterial, number>>;
	/** Minimum BotTier required (1 = always, 2 = 1 lab, 3 = 2 labs, 4 = 3 labs, 5 = 4 labs). */
	readonly minTier: 1 | 2 | 3 | 4 | 5;
}

export const MARK_DEFS: Record<BotMark, MarkDef> = {
	reinforced_hull: {
		label: "Reinforced Hull",
		effects: { maxHp: 3, hp: 3, defense: 1 },
		cost: { alloy_stock: 2, ferrous_scrap: 1 },
		minTier: 1,
	},
	extended_range: {
		label: "Extended Range",
		effects: { scanRange: 2 },
		cost: { silicon_wafer: 2, conductor_wire: 1 },
		minTier: 1,
	},
	swift_treads: {
		label: "Swift Treads",
		effects: { maxMp: 1, mp: 1 },
		cost: { polymer_salvage: 2, alloy_stock: 1 },
		minTier: 2,
	},
	harvester_arm: {
		label: "Harvester Arm",
		effects: {},
		cost: { ferrous_scrap: 2, conductor_wire: 1 },
		minTier: 1,
	},
	shield_emitter: {
		label: "Shield Emitter",
		effects: { defense: 2 },
		cost: { el_crystal: 1, silicon_wafer: 2, alloy_stock: 2 },
		minTier: 3,
	},
	power_core: {
		label: "Power Core",
		effects: { maxHp: 5, hp: 5, attack: 2 },
		cost: { storm_charge: 3, el_crystal: 2, alloy_stock: 3 },
		minTier: 4,
	},
	quantum_processor: {
		label: "Quantum Processor",
		effects: { scanRange: 3, attack: 1, defense: 1 },
		cost: { silicon_wafer: 4, el_crystal: 3, depth_salvage: 2 },
		minTier: 5,
	},
};

// ─── Mark Specializations (Mark III+) ───────────────────────────────────────

/** Maximum mark level (Mark V = Transcendence). */
export const MAX_MARK_LEVEL = 5;

/**
 * Passive specialization unlocked at a specific mark level.
 * These activate automatically — no manual trigger.
 */
export interface MarkSpecialization {
	/** Display label for the specialization. */
	readonly label: string;
	/** Which mark level this unlocks at. */
	readonly markLevel: 3 | 4 | 5;
	/** Passive effect type — used by systems to apply the behavior. */
	readonly effectType: string;
	/** Numeric parameter for the effect (range, percentage, count, etc). */
	readonly effectValue: number;
	/** Human-readable description. */
	readonly description: string;
}

/**
 * Mark III-V specializations per robot class.
 * Per GAME_DESIGN.md §7: each class gets role-specific passive abilities.
 */
export const MARK_SPECIALIZATIONS: Partial<
	Record<RobotClass, readonly MarkSpecialization[]>
> = {
	support: [
		{
			label: "Auto-Repair Aura",
			markLevel: 3,
			effectType: "repair_aura",
			effectValue: 2,
			description: "Heals adjacent friendly units 2 HP/turn",
		},
		{
			label: "Enhanced Repair Aura",
			markLevel: 4,
			effectType: "repair_aura",
			effectValue: 4,
			description: "Heals adjacent friendly units 4 HP/turn",
		},
		{
			label: "Transcendent Maintainer",
			markLevel: 5,
			effectType: "repair_aura_range",
			effectValue: 3,
			description: "Repair aura extends to 3-tile radius",
		},
	],
	infantry: [
		{
			label: "Component Targeting",
			markLevel: 3,
			effectType: "component_targeting",
			effectValue: 1,
			description: "Attacks can disable a target's mark for 1 turn",
		},
		{
			label: "Armor Piercing",
			markLevel: 4,
			effectType: "armor_pierce",
			effectValue: 2,
			description: "Ignores 2 points of target defense",
		},
		{
			label: "Transcendent Striker",
			markLevel: 5,
			effectType: "double_strike",
			effectValue: 1,
			description: "Can attack twice per turn",
		},
	],
	worker: [
		{
			label: "Multi-Harvest",
			markLevel: 3,
			effectType: "multi_harvest",
			effectValue: 2,
			description: "Harvests from 2 deposits simultaneously",
		},
		{
			label: "Efficient Harvest",
			markLevel: 4,
			effectType: "harvest_bonus",
			effectValue: 50,
			description: "+50% harvest yield",
		},
		{
			label: "Transcendent Fabricator",
			markLevel: 5,
			effectType: "instant_build",
			effectValue: 1,
			description: "Buildings complete instantly",
		},
	],
	scout: [
		{
			label: "Wider Vision",
			markLevel: 3,
			effectType: "vision_bonus",
			effectValue: 3,
			description: "+3 scan range, reveals cultist camps",
		},
		{
			label: "Stealth Movement",
			markLevel: 4,
			effectType: "stealth",
			effectValue: 1,
			description: "Not visible to enemies while moving",
		},
		{
			label: "Transcendent Observer",
			markLevel: 5,
			effectType: "map_reveal",
			effectValue: 1,
			description: "Reveals entire map permanently",
		},
	],
	ranged: [
		{
			label: "Shield Projection",
			markLevel: 3,
			effectType: "shield_projection",
			effectValue: 2,
			description: "+2 defense to adjacent friendly units",
		},
		{
			label: "Overwatch",
			markLevel: 4,
			effectType: "overwatch",
			effectValue: 1,
			description: "Automatically fires at enemies that enter range",
		},
		{
			label: "Transcendent Guardian",
			markLevel: 5,
			effectType: "area_denial",
			effectValue: 3,
			description: "Enemies in 3-tile radius take 2 damage/turn",
		},
	],
	cavalry: [
		{
			label: "Charge Strike",
			markLevel: 3,
			effectType: "charge_bonus",
			effectValue: 2,
			description: "+2 damage when attacking after moving 3+ tiles",
		},
		{
			label: "Evasion",
			markLevel: 4,
			effectType: "evasion",
			effectValue: 30,
			description: "30% chance to dodge incoming attacks",
		},
		{
			label: "Transcendent Striker",
			markLevel: 5,
			effectType: "blitz",
			effectValue: 1,
			description: "Can move again after a kill",
		},
	],
};

/**
 * Get all specializations unlocked for a robot class at a given mark level.
 * Returns specializations from Mark III up to the current level.
 */
export function getMarkSpecializations(
	robotClass: RobotClass,
	markLevel: number,
): readonly MarkSpecialization[] {
	const specs = MARK_SPECIALIZATIONS[robotClass];
	if (!specs) return [];
	return specs.filter((s) => s.markLevel <= markLevel);
}

/**
 * Check if a robot class has a specific effect type active at a given mark level.
 */
export function hasMarkSpecEffect(
	robotClass: RobotClass,
	markLevel: number,
	effectType: string,
): boolean {
	return getMarkSpecializations(robotClass, markLevel).some(
		(s) => s.effectType === effectType,
	);
}

/**
 * Get the effect value for a specific specialization effect type.
 * Returns the highest-level value if multiple levels define the same type.
 */
export function getMarkSpecEffectValue(
	robotClass: RobotClass,
	markLevel: number,
	effectType: string,
): number {
	const specs = getMarkSpecializations(robotClass, markLevel);
	const matching = specs.filter((s) => s.effectType === effectType);
	if (matching.length === 0) return 0;
	// Return the value from the highest mark level
	return matching[matching.length - 1]!.effectValue;
}

/** Backward-compatible re-export for existing code that imports MARK_EFFECTS. */
export const MARK_EFFECTS: Record<
	BotMark,
	{ hp?: number; ap?: number; mp?: number; scanRange?: number }
> = Object.fromEntries(
	(Object.entries(MARK_DEFS) as Array<[BotMark, MarkDef]>).map(([k, v]) => [
		k,
		v.effects,
	]),
) as Record<
	BotMark,
	{ hp?: number; ap?: number; mp?: number; scanRange?: number }
>;
