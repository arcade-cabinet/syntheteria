/**
 * Robot archetype definitions with Mark I/II/III progression.
 *
 * Six archetypes with 3 tiers each. Each Mark improves stats
 * and costs materials to upgrade. Mark 1 = starting state.
 */

import type { ResourcePool } from "../systems/resources";

export type RobotType =
	| "maintenance_bot"
	| "utility_drone"
	| "fabrication_unit"
	| "guard_bot"
	| "cavalry_bot"
	| "sentinel_bot";

export interface MarkStats {
	speed: number;
	/** Vision range in world units */
	visionRange: number;
	/** Component durability multiplier (1.0 = base) */
	durability: number;
	/** Attack damage multiplier (1.0 = base) */
	attackPower: number;
}

export interface MarkTier {
	label: string;
	stats: MarkStats;
	/** Materials consumed to upgrade TO this mark (empty for Mark I) */
	upgradeCost: { type: keyof ResourcePool; amount: number }[];
}

export interface RobotDef {
	type: RobotType;
	displayName: string;
	role: string;
	marks: [MarkTier, MarkTier, MarkTier];
}

export const ROBOT_DEFS: Record<RobotType, RobotDef> = {
	maintenance_bot: {
		type: "maintenance_bot",
		displayName: "Maintenance Bot",
		role: "Repair / Build",
		marks: [
			{
				label: "Mark I",
				stats: {
					speed: 2.5,
					visionRange: 8,
					durability: 1.0,
					attackPower: 0.5,
				},
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: {
					speed: 3.0,
					visionRange: 10,
					durability: 1.3,
					attackPower: 0.7,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 5 },
					{ type: "circuitry", amount: 2 },
				],
			},
			{
				label: "Mark III",
				stats: {
					speed: 3.5,
					visionRange: 12,
					durability: 1.6,
					attackPower: 0.8,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 8 },
					{ type: "circuitry", amount: 4 },
					{ type: "durasteel", amount: 1 },
				],
			},
		],
	},
	utility_drone: {
		type: "utility_drone",
		displayName: "Utility Drone",
		role: "Scout",
		marks: [
			{
				label: "Mark I",
				stats: {
					speed: 5.0,
					visionRange: 12,
					durability: 0.7,
					attackPower: 0.3,
				},
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: {
					speed: 6.0,
					visionRange: 16,
					durability: 0.9,
					attackPower: 0.4,
				},
				upgradeCost: [
					{ type: "circuitry", amount: 3 },
					{ type: "scrapMetal", amount: 2 },
				],
			},
			{
				label: "Mark III",
				stats: {
					speed: 7.0,
					visionRange: 20,
					durability: 1.0,
					attackPower: 0.5,
				},
				upgradeCost: [
					{ type: "circuitry", amount: 5 },
					{ type: "powerCells", amount: 2 },
				],
			},
		],
	},
	fabrication_unit: {
		type: "fabrication_unit",
		displayName: "Fabrication Unit",
		role: "Craft",
		marks: [
			{
				label: "Mark I",
				stats: { speed: 0, visionRange: 6, durability: 1.2, attackPower: 0 },
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: { speed: 0, visionRange: 8, durability: 1.5, attackPower: 0 },
				upgradeCost: [
					{ type: "scrapMetal", amount: 6 },
					{ type: "circuitry", amount: 3 },
					{ type: "durasteel", amount: 1 },
				],
			},
			{
				label: "Mark III",
				stats: { speed: 0, visionRange: 10, durability: 2.0, attackPower: 0 },
				upgradeCost: [
					{ type: "scrapMetal", amount: 10 },
					{ type: "circuitry", amount: 5 },
					{ type: "durasteel", amount: 3 },
					{ type: "powerCells", amount: 2 },
				],
			},
		],
	},
	guard_bot: {
		type: "guard_bot",
		displayName: "Guard Bot",
		role: "Defense",
		marks: [
			{
				label: "Mark I",
				stats: {
					speed: 2.0,
					visionRange: 10,
					durability: 1.3,
					attackPower: 1.0,
				},
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: {
					speed: 2.5,
					visionRange: 12,
					durability: 1.6,
					attackPower: 1.5,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 6 },
					{ type: "durasteel", amount: 2 },
				],
			},
			{
				label: "Mark III",
				stats: {
					speed: 2.5,
					visionRange: 14,
					durability: 2.0,
					attackPower: 2.0,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 10 },
					{ type: "durasteel", amount: 4 },
					{ type: "powerCells", amount: 2 },
				],
			},
		],
	},
	cavalry_bot: {
		type: "cavalry_bot",
		displayName: "Cavalry Bot",
		role: "Assault",
		marks: [
			{
				label: "Mark I",
				stats: {
					speed: 4.0,
					visionRange: 8,
					durability: 0.9,
					attackPower: 1.2,
				},
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: {
					speed: 5.0,
					visionRange: 10,
					durability: 1.1,
					attackPower: 1.8,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 4 },
					{ type: "durasteel", amount: 2 },
					{ type: "powerCells", amount: 1 },
				],
			},
			{
				label: "Mark III",
				stats: {
					speed: 6.0,
					visionRange: 12,
					durability: 1.3,
					attackPower: 2.5,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 8 },
					{ type: "durasteel", amount: 4 },
					{ type: "powerCells", amount: 3 },
				],
			},
		],
	},
	sentinel_bot: {
		type: "sentinel_bot",
		displayName: "Sentinel Bot",
		role: "Heavy",
		marks: [
			{
				label: "Mark I",
				stats: {
					speed: 1.5,
					visionRange: 10,
					durability: 1.8,
					attackPower: 0.8,
				},
				upgradeCost: [],
			},
			{
				label: "Mark II",
				stats: {
					speed: 1.8,
					visionRange: 12,
					durability: 2.2,
					attackPower: 1.2,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 8 },
					{ type: "durasteel", amount: 3 },
				],
			},
			{
				label: "Mark III",
				stats: {
					speed: 2.0,
					visionRange: 14,
					durability: 3.0,
					attackPower: 1.5,
				},
				upgradeCost: [
					{ type: "scrapMetal", amount: 12 },
					{ type: "durasteel", amount: 6 },
					{ type: "powerCells", amount: 3 },
				],
			},
		],
	},
};

export const ROBOT_TYPES = Object.keys(ROBOT_DEFS) as RobotType[];

/** Maximum mark level */
export const MAX_MARK = 3;

/** Get the current mark tier definition for a unit */
export function getMarkTier(unitType: string, mark: number): MarkTier | null {
	const def = ROBOT_DEFS[unitType as RobotType];
	if (!def) return null;
	const idx = Math.max(0, Math.min(2, mark - 1));
	return def.marks[idx];
}

/** Get the upgrade cost to reach the NEXT mark level */
export function getUpgradeCost(
	unitType: string,
	currentMark: number,
): { type: keyof ResourcePool; amount: number }[] | null {
	if (currentMark >= MAX_MARK) return null;
	const def = ROBOT_DEFS[unitType as RobotType];
	if (!def) return null;
	return def.marks[currentMark]?.upgradeCost ?? null;
}
