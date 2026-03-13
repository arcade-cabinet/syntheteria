/**
 * Motor Pool bot fabrication system.
 *
 * Motor Pools are buildings that fabricate new bots. Each Motor Pool has a
 * queue of fabrication jobs. The queue size depends on the Motor Pool's tier:
 *   - Basic: 1 slot
 *   - Advanced: 2 slots
 *   - Elite: 3 slots
 *
 * Each job selects a bot type, deducts resources, and counts down over
 * multiple turns. When complete, a new bot spawns at the Motor Pool's position.
 */

import type { BotUnitType } from "../bots";
import { getBotDefinition } from "../bots";
import { spawnUnit } from "../ecs/factory";
import { Building, Identity, MapFragment, WorldPosition } from "../ecs/traits";
import { buildings } from "../ecs/world";
import { getResources, type ResourcePool, spendResource } from "./resources";

// ---------------------------------------------------------------------------
// Motor Pool tier definitions
// ---------------------------------------------------------------------------

export type MotorPoolTier = "basic" | "advanced" | "elite";

export const MOTOR_POOL_TIER_CONFIG: Record<
	MotorPoolTier,
	{ maxQueue: number; maxMark: number; speedMultiplier: number }
> = {
	basic: { maxQueue: 1, maxMark: 1, speedMultiplier: 1.0 },
	advanced: { maxQueue: 2, maxMark: 2, speedMultiplier: 1.25 },
	elite: { maxQueue: 3, maxMark: 3, speedMultiplier: 1.5 },
};

export const MOTOR_POOL_UPGRADE_COSTS: Record<
	MotorPoolTier,
	{ type: keyof ResourcePool; amount: number }[] | null
> = {
	basic: null,
	advanced: [
		{ type: "ferrousScrap", amount: 20 },
		{ type: "alloyStock", amount: 10 },
		{ type: "siliconWafer", amount: 6 },
	],
	elite: [
		{ type: "ferrousScrap", amount: 30 },
		{ type: "alloyStock", amount: 15 },
		{ type: "siliconWafer", amount: 10 },
		{ type: "conductorWire", amount: 8 },
	],
};

// ---------------------------------------------------------------------------
// Bot fabrication costs (per bot type)
// ---------------------------------------------------------------------------

export interface BotFabricationRecipe {
	botType: BotUnitType;
	label: string;
	costs: { type: keyof ResourcePool; amount: number }[];
	buildTurns: number;
}

export const BOT_FABRICATION_RECIPES: BotFabricationRecipe[] = [
	{
		botType: "maintenance_bot",
		label: "Field Technician",
		costs: [
			{ type: "ferrousScrap", amount: 6 },
			{ type: "alloyStock", amount: 4 },
			{ type: "conductorWire", amount: 2 },
		],
		buildTurns: 3,
	},
	{
		botType: "utility_drone",
		label: "Relay Hauler",
		costs: [
			{ type: "alloyStock", amount: 6 },
			{ type: "conductorWire", amount: 4 },
			{ type: "polymerSalvage", amount: 2 },
		],
		buildTurns: 3,
	},
	{
		botType: "mecha_scout",
		label: "Survey Strider",
		costs: [
			{ type: "ferrousScrap", amount: 8 },
			{ type: "alloyStock", amount: 6 },
			{ type: "siliconWafer", amount: 3 },
		],
		buildTurns: 4,
	},
	{
		botType: "field_fighter",
		label: "Assault Strider",
		costs: [
			{ type: "ferrousScrap", amount: 12 },
			{ type: "alloyStock", amount: 6 },
			{ type: "conductorWire", amount: 4 },
		],
		buildTurns: 5,
	},
	{
		botType: "mecha_trooper",
		label: "Storm Trooper",
		costs: [
			{ type: "ferrousScrap", amount: 14 },
			{ type: "alloyStock", amount: 8 },
			{ type: "conductorWire", amount: 4 },
			{ type: "electrolyte", amount: 3 },
		],
		buildTurns: 6,
	},
	{
		botType: "mecha_golem",
		label: "Substation Engineer",
		costs: [
			{ type: "ferrousScrap", amount: 16 },
			{ type: "alloyStock", amount: 10 },
			{ type: "siliconWafer", amount: 6 },
			{ type: "conductorWire", amount: 4 },
		],
		buildTurns: 7,
	},
	{
		botType: "quadruped_tank",
		label: "Defense Sentry",
		costs: [
			{ type: "ferrousScrap", amount: 18 },
			{ type: "alloyStock", amount: 10 },
			{ type: "conductorWire", amount: 6 },
			{ type: "electrolyte", amount: 4 },
		],
		buildTurns: 8,
	},
];

// ---------------------------------------------------------------------------
// Motor Pool state
// ---------------------------------------------------------------------------

export interface MotorPoolState {
	motorPoolEntityId: string;
	tier: MotorPoolTier;
	queue: MotorPoolJob[];
}

export interface MotorPoolJob {
	botType: BotUnitType;
	turnsRemaining: number;
}

const motorPools: Map<string, MotorPoolState> = new Map();

export function getMotorPoolState(
	entityId: string,
): MotorPoolState | null {
	return motorPools.get(entityId) ?? null;
}

export function getAllMotorPools(): MotorPoolState[] {
	return Array.from(motorPools.values());
}

/**
 * Register a Motor Pool entity. Called when a motor_pool building becomes
 * operational.
 */
export function registerMotorPool(entityId: string, tier: MotorPoolTier = "basic") {
	if (motorPools.has(entityId)) return;
	motorPools.set(entityId, {
		motorPoolEntityId: entityId,
		tier,
		queue: [],
	});
}

/**
 * Queue a bot fabrication job on a Motor Pool.
 * Returns true if the job was queued.
 */
export function queueBotFabrication(
	motorPoolEntityId: string,
	botType: BotUnitType,
): boolean {
	const state = motorPools.get(motorPoolEntityId);
	if (!state) return false;

	const tierConfig = MOTOR_POOL_TIER_CONFIG[state.tier];
	if (state.queue.length >= tierConfig.maxQueue) return false;

	const recipe = BOT_FABRICATION_RECIPES.find((r) => r.botType === botType);
	if (!recipe) return false;

	// Check resources
	const pool = getResources();
	for (const cost of recipe.costs) {
		if ((pool[cost.type] ?? 0) < cost.amount) return false;
	}

	// Spend resources
	for (const cost of recipe.costs) {
		spendResource(cost.type, cost.amount);
	}

	state.queue.push({
		botType,
		turnsRemaining: recipe.buildTurns,
	});

	return true;
}

/**
 * Upgrade a Motor Pool to the next tier.
 * Returns true if upgraded.
 */
export function upgradeMotorPool(motorPoolEntityId: string): boolean {
	const state = motorPools.get(motorPoolEntityId);
	if (!state) return false;

	const nextTier: MotorPoolTier | null =
		state.tier === "basic"
			? "advanced"
			: state.tier === "advanced"
				? "elite"
				: null;
	if (!nextTier) return false;

	const costs = MOTOR_POOL_UPGRADE_COSTS[nextTier];
	if (!costs) return false;

	const pool = getResources();
	for (const cost of costs) {
		if ((pool[cost.type] ?? 0) < cost.amount) return false;
	}

	for (const cost of costs) {
		spendResource(cost.type, cost.amount);
	}

	state.tier = nextTier;
	return true;
}

/**
 * Advance all Motor Pool fabrication queues by one turn.
 * Completed bots are spawned at the Motor Pool's position.
 */
export function motorPoolTurnTick(): void {
	for (const state of motorPools.values()) {
		if (state.queue.length === 0) continue;

		// Verify the Motor Pool building still exists and is powered
		let powered = false;
		let position: { x: number; z: number } | null = null;
		let fragmentId: string | null = null;
		for (const bldg of buildings) {
			if (bldg.get(Identity)?.id === state.motorPoolEntityId) {
				const bComp = bldg.get(Building);
				if (bComp?.powered && bComp.operational) {
					powered = true;
					const pos = bldg.get(WorldPosition);
					if (pos) position = { x: pos.x, z: pos.z };
					fragmentId = bldg.get(MapFragment)?.fragmentId ?? null;
				}
				break;
			}
		}

		if (!powered || !position || !fragmentId) continue;

		// Only the first job in queue advances (serial fabrication)
		const job = state.queue[0];
		if (!job) continue;

		job.turnsRemaining--;
		if (job.turnsRemaining <= 0) {
			// Spawn the bot
			const def = getBotDefinition(job.botType);
			spawnUnit({
				x: position.x + 2,
				z: position.z + 2,
				fragmentId,
				type: job.botType,
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: true, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
					{ name: "power_cell", functional: true, material: "electronic" },
				],
			});
			state.queue.shift();
		}
	}
}

// ---------------------------------------------------------------------------
// Mark upgrade costs (per mark level)
// Mark IV-V cannot be built from scratch, only upgraded from existing units.
// ---------------------------------------------------------------------------

export interface MarkUpgradeCost {
	fromMark: number;
	toMark: number;
	costs: { type: keyof ResourcePool; amount: number }[];
}

export const MARK_UPGRADE_COSTS: MarkUpgradeCost[] = [
	{
		fromMark: 1,
		toMark: 2,
		costs: [
			{ type: "ferrousScrap", amount: 10 },
			{ type: "siliconWafer", amount: 4 },
		],
	},
	{
		fromMark: 2,
		toMark: 3,
		costs: [
			{ type: "ferrousScrap", amount: 20 },
			{ type: "siliconWafer", amount: 8 },
			{ type: "conductorWire", amount: 6 },
		],
	},
	{
		fromMark: 3,
		toMark: 4,
		costs: [
			{ type: "ferrousScrap", amount: 30 },
			{ type: "siliconWafer", amount: 12 },
			{ type: "conductorWire", amount: 10 },
			{ type: "elCrystal", amount: 2 },
		],
	},
	{
		fromMark: 4,
		toMark: 5,
		costs: [
			{ type: "ferrousScrap", amount: 50 },
			{ type: "siliconWafer", amount: 20 },
			{ type: "conductorWire", amount: 16 },
			{ type: "elCrystal", amount: 6 },
		],
	},
];

/**
 * Get the cost to upgrade a unit from its current Mark to the next.
 * Returns null if no upgrade path exists.
 */
export function getMarkUpgradeCost(
	currentMark: number,
): MarkUpgradeCost | null {
	return (
		MARK_UPGRADE_COSTS.find((c) => c.fromMark === currentMark) ?? null
	);
}

/**
 * Check if a Motor Pool can perform a Mark upgrade (right tier).
 * Mark II needs Basic+, Mark III needs Advanced+, Mark IV-V need Elite.
 */
export function canMotorPoolUpgradeMark(
	motorPoolEntityId: string,
	targetMark: number,
): boolean {
	const state = motorPools.get(motorPoolEntityId);
	if (!state) return false;
	const tierConfig = MOTOR_POOL_TIER_CONFIG[state.tier];
	return targetMark <= tierConfig.maxMark + 1;
}

export function resetMotorPoolState() {
	motorPools.clear();
}

export function _reset() {
	motorPools.clear();
}
