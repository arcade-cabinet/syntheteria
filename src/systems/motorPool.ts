/**
 * Motor Pool bot fabrication and Mark upgrade system.
 *
 * Motor Pools are buildings that fabricate new bots. Each Motor Pool has a
 * queue of fabrication jobs. The queue size depends on the Motor Pool's tier:
 *   - Basic: 1 slot
 *   - Advanced: 2 slots
 *   - Elite: 3 slots
 *
 * Each job selects a bot type, deducts resources, and counts down over
 * multiple turns. When complete, a new bot spawns at the Motor Pool's position.
 *
 * Motor Pools also gate unit Mark upgrades. Units adjacent to a powered
 * Motor Pool can be upgraded to higher Marks by spending resources,
 * subject to tier restrictions (from upgrades.json).
 */

import type { BotUnitType } from "../bots";
import { getBotDefinition } from "../bots";
import upgradesConfig from "../config/upgrades.json";
import { spawnUnit } from "../ecs/factory";
import type { Entity } from "../ecs/traits";
import {
	Building,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, world } from "../ecs/world";
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

export function getMotorPoolState(entityId: string): MotorPoolState | null {
	return motorPools.get(entityId) ?? null;
}

export function getAllMotorPools(): MotorPoolState[] {
	return Array.from(motorPools.values());
}

/**
 * Register a Motor Pool entity. Called when a motor_pool building becomes
 * operational.
 */
export function registerMotorPool(
	entityId: string,
	tier: MotorPoolTier = "basic",
) {
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
			const _def = getBotDefinition(job.botType);
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
	return MARK_UPGRADE_COSTS.find((c) => c.fromMark === currentMark) ?? null;
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
	const tierMaxMark = getMaxMarkForTier(state.tier);
	return targetMark <= tierMaxMark;
}

export function resetMotorPoolState() {
	motorPools.clear();
	activeUpgradeJobs.length = 0;
}

export function _reset() {
	motorPools.clear();
	activeUpgradeJobs.length = 0;
}

// ---------------------------------------------------------------------------
// Mark upgrade job system (tick-based, from upgrades.json)
//
// Units adjacent to a powered Motor Pool can be upgraded to higher Marks.
// The upgrade takes a config-driven number of ticks and consumes resources.
// If the Motor Pool loses power, the upgrade pauses (not cancelled).
// If the unit is destroyed, the upgrade is cancelled.
// ---------------------------------------------------------------------------

export interface UpgradeJob {
	unitId: string;
	motorPoolId: string;
	targetMark: number;
	ticksRemaining: number;
}

const activeUpgradeJobs: UpgradeJob[] = [];

export function getActiveUpgradeJobs(): UpgradeJob[] {
	return [...activeUpgradeJobs];
}

/**
 * Get the maximum Mark a Motor Pool tier can upgrade to (from upgrades.json).
 */
export function getMaxMarkForTier(tier: MotorPoolTier): number {
	const tierConfig =
		upgradesConfig.motorPoolTiers[
			tier as keyof typeof upgradesConfig.motorPoolTiers
		];
	if (!tierConfig) {
		throw new Error(`Unknown Motor Pool tier: ${tier}`);
	}
	return tierConfig.maxMark;
}

/**
 * Get the resource cost for upgrading to a specific Mark level (from upgrades.json).
 */
export function getUpgradeCost(
	targetMark: number,
): Record<string, number> | null {
	const costs =
		upgradesConfig.markLevels.costs[
			String(targetMark) as keyof typeof upgradesConfig.markLevels.costs
		];
	return costs ?? null;
}

/**
 * Get the number of ticks required for an upgrade to a specific Mark.
 */
export function getUpgradeTicks(targetMark: number): number {
	const ticks =
		upgradesConfig.markLevels.upgradeTicks[
			String(targetMark) as keyof typeof upgradesConfig.markLevels.upgradeTicks
		];
	if (ticks === undefined) {
		throw new Error(`No upgrade duration for Mark ${targetMark}`);
	}
	return ticks;
}

/**
 * Find Motor Pool buildings adjacent to a unit (within adjacencyRange).
 * Only returns powered, operational Motor Pools.
 */
export function findAdjacentMotorPools(unitEntity: Entity): Entity[] {
	const unitPos = unitEntity.get(WorldPosition);
	if (!unitPos) return [];

	const range = upgradesConfig.adjacencyRange;
	const result: Entity[] = [];

	for (const building of buildings) {
		const bComp = building.get(Building);
		if (!bComp || bComp.type !== "motor_pool") continue;
		if (!bComp.powered || !bComp.operational) continue;

		const bPos = building.get(WorldPosition);
		if (!bPos) continue;

		const dx = unitPos.x - bPos.x;
		const dz = unitPos.z - bPos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist <= range) {
			result.push(building);
		}
	}

	return result;
}

export interface UpgradeCheckResult {
	canUpgrade: boolean;
	reason: string | null;
	targetMark: number;
	cost: Record<string, number> | null;
}

/**
 * Check whether a unit can be upgraded at a given Motor Pool.
 * Returns detailed result with reason for failure if any.
 */
export function checkUpgradeEligibility(
	unitEntity: Entity,
	motorPoolEntity: Entity,
): UpgradeCheckResult {
	const unit = unitEntity.get(Unit);
	if (!unit) {
		return {
			canUpgrade: false,
			reason: "Not a unit",
			targetMark: 0,
			cost: null,
		};
	}

	const currentMark = unit.markLevel;
	const maxMark = upgradesConfig.markLevels.max;

	if (currentMark >= maxMark) {
		return {
			canUpgrade: false,
			reason: "Already at maximum Mark",
			targetMark: currentMark,
			cost: null,
		};
	}

	const targetMark = currentMark + 1;

	// Check Motor Pool tier via the registered state
	const motorPoolId = motorPoolEntity.get(Identity)?.id;
	if (!motorPoolId) {
		return {
			canUpgrade: false,
			reason: "Not a Motor Pool",
			targetMark,
			cost: null,
		};
	}

	const poolState = motorPools.get(motorPoolId);
	if (!poolState) {
		return {
			canUpgrade: false,
			reason: "Motor Pool not registered",
			targetMark,
			cost: null,
		};
	}

	const tierMaxMark = getMaxMarkForTier(poolState.tier);
	if (targetMark > tierMaxMark) {
		return {
			canUpgrade: false,
			reason: `Motor Pool tier too low (${poolState.tier} supports up to Mark ${tierMaxMark})`,
			targetMark,
			cost: null,
		};
	}

	// Check not already being upgraded
	const unitId = unitEntity.get(Identity)?.id;
	if (unitId && activeUpgradeJobs.some((job) => job.unitId === unitId)) {
		return {
			canUpgrade: false,
			reason: "Upgrade already in progress",
			targetMark,
			cost: null,
		};
	}

	const cost = getUpgradeCost(targetMark);
	if (!cost) {
		return {
			canUpgrade: false,
			reason: `No upgrade cost defined for Mark ${targetMark}`,
			targetMark,
			cost: null,
		};
	}

	// Check resources
	const pool = getResources();
	for (const [resourceType, amount] of Object.entries(cost)) {
		const available = pool[resourceType as keyof ResourcePool] ?? 0;
		if (available < amount) {
			return {
				canUpgrade: false,
				reason: `Insufficient resources (need ${amount} ${resourceType})`,
				targetMark,
				cost,
			};
		}
	}

	return { canUpgrade: true, reason: null, targetMark, cost };
}

/**
 * Start a Mark upgrade for a unit at a Motor Pool.
 * Returns true if the upgrade was started.
 */
export function startUpgrade(
	unitEntity: Entity,
	motorPoolEntity: Entity,
): boolean {
	const check = checkUpgradeEligibility(unitEntity, motorPoolEntity);
	if (!check.canUpgrade || !check.cost) return false;

	const unitId = unitEntity.get(Identity)?.id;
	const motorPoolId = motorPoolEntity.get(Identity)?.id;
	if (!unitId || !motorPoolId) return false;

	// Deduct resources
	for (const [resourceType, amount] of Object.entries(check.cost)) {
		if (!spendResource(resourceType as keyof ResourcePool, amount)) {
			return false;
		}
	}

	const ticks = getUpgradeTicks(check.targetMark);
	activeUpgradeJobs.push({
		unitId,
		motorPoolId,
		targetMark: check.targetMark,
		ticksRemaining: ticks,
	});

	return true;
}

/**
 * Motor Pool upgrade system tick. Advances active upgrade jobs.
 * Completed upgrades increment the unit's markLevel.
 *
 * If a Motor Pool loses power, the upgrade pauses (not cancelled).
 * If a unit is destroyed, the upgrade is cancelled.
 */
export function motorPoolUpgradeSystem() {
	for (let i = activeUpgradeJobs.length - 1; i >= 0; i--) {
		const job = activeUpgradeJobs[i];

		// Check Motor Pool is still powered
		let motorPoolPowered = false;
		for (const building of buildings) {
			if (
				building.get(Identity)?.id === job.motorPoolId &&
				building.get(Building)?.powered
			) {
				motorPoolPowered = true;
				break;
			}
		}

		if (!motorPoolPowered) continue; // paused, not cancelled

		// Check unit still exists (query Unit+Identity directly)
		let unitEntity: Entity | null = null;
		for (const unit of world.query(Unit, Identity)) {
			if (unit.get(Identity)?.id === job.unitId) {
				unitEntity = unit;
				break;
			}
		}

		if (!unitEntity) {
			// Unit destroyed — cancel upgrade
			activeUpgradeJobs.splice(i, 1);
			continue;
		}

		job.ticksRemaining--;
		if (job.ticksRemaining <= 0) {
			// Upgrade complete — increment markLevel using entity.set()
			const unit = unitEntity.get(Unit);
			if (unit) {
				unitEntity.set(Unit, {
					...unit,
					markLevel: job.targetMark,
				});
			}
			activeUpgradeJobs.splice(i, 1);
		}
	}
}
