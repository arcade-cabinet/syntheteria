import { getBotCommandProfile, isBotCategoryAllowed } from "../bots";
import { setGameSpeed, togglePause } from "../ecs/gameState";
import {
	Building,
	Identity,
	LightningRod,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units, world } from "../ecs/world";
import { getCitySiteViewModel } from "../world/citySiteActions";
import {
	enterCityInstance,
	openCityKitLab,
	returnToWorld,
} from "../world/cityTransition";
import { executeDistrictOperation } from "../world/districtOperations";
import { foundCitySite, surveyCitySite } from "../world/poiActions";
import { getRuntimeState, setCitySiteModalOpen } from "../world/runtimeState";
import { gridToWorld } from "../world/sectorCoordinates";
import { getActiveWorldSession } from "../world/session";
import {
	BUILDING_COSTS,
	canUnitBuild,
	computeAdjacencyBonuses,
	setActivePlacement,
} from "./buildingPlacement";
import { RECIPES, startFabrication } from "./fabrication";
import { isStructureConsumed, startHarvest } from "./harvestSystem";
import {
	BOT_FABRICATION_RECIPES,
	MOTOR_POOL_TIER_CONFIG,
	canMotorPoolUpgradeMark,
	getMarkUpgradeCost,
	getMotorPoolState,
	queueBotFabrication,
	upgradeMotorPool,
} from "./motorPool";
import {
	type RadialAction,
	type RadialOpenContext,
	registerRadialProvider,
} from "./radialMenu";
import {
	applyMarkUpgrade,
	awardXP,
	getUnitExperience,
	getXPProgress,
	type XPActionType,
} from "./experience";
import { startRepair } from "./repair";
import { getResourcePoolForModel, isHarvestable } from "./resourcePools";
import { getResources, spendResource } from "./resources";
import { logTurnEvent } from "./turnEventLog";
import {
	hasActionPoints,
	hasMovementPoints,
	spendActionPoint,
	spendMovementPoints,
} from "./turnSystem";

/**
 * Radial Menu Action Providers
 *
 * Each game system registers what actions it contributes to the radial menu.
 * Providers are grouped by CATEGORY (inner ring). Each provider's getActions()
 * returns available actions (outer ring) based on current game state.
 *
 * This file is imported once at startup. Systems that want to register
 * providers can either do it here centrally, or call registerRadialProvider()
 * from their own module scope.
 *
 * Works for BOTH world and city scenes — providers check context to decide
 * which actions are relevant.
 */

// --- Helper: find entity by ID ---

function findEntityById(id: string | null) {
	if (!id) return null;
	return world.entities.find((e) => e.get(Identity)?.id === id) ?? null;
}

function getSelectedBotProfile(ctx: RadialOpenContext) {
	const entity = findEntityById(ctx.targetEntityId);
	const unit = entity?.get(Unit);
	return unit ? getBotCommandProfile(unit.type) : null;
}

function isSelectedBotCategoryAllowed(
	ctx: RadialOpenContext,
	categoryId: Parameters<typeof isBotCategoryAllowed>[1],
) {
	const entity = findEntityById(ctx.targetEntityId);
	const unit = entity?.get(Unit);
	if (!unit) {
		return true;
	}
	return isBotCategoryAllowed(unit.type, categoryId);
}

/** Award XP to a unit after it performs an action. */
function awardXPToActor(entityId: string | null, action: XPActionType) {
	if (!entityId) return;
	const entity = findEntityById(entityId);
	const unit = entity?.get(Unit);
	if (!unit) return;
	awardXP(entityId, unit.archetypeId, action, unit.markLevel);
}

function getActiveDistrictViewModel(mode: "world" | "city") {
	const runtime = getRuntimeState();
	const session = getActiveWorldSession();
	if (!session) {
		return null;
	}
	const context = runtime.citySiteModalContext ?? runtime.nearbyPoi;
	if (!context) {
		return null;
	}
	const city =
		context.cityInstanceId == null
			? null
			: (session.cityInstances.find(
					(candidate) => candidate.id === context.cityInstanceId,
				) ?? null);
	return {
		context,
		city,
		viewModel: getCitySiteViewModel({
			city,
			context,
			mode,
		}),
	};
}

// --- MOVEMENT category ---

registerRadialProvider({
	id: "movement",
	category: {
		id: "move",
		label: "Move",
		icon: "arrow",
		tone: "default",
		priority: 10,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!isSelectedBotCategoryAllowed(ctx, "move")) return [];
		const profile = getSelectedBotProfile(ctx);
		if (!profile?.canMove) return [];

		const unitHasMP = ctx.targetEntityId
			? hasMovementPoints(ctx.targetEntityId)
			: false;

		return [
			{
				id: "move_to",
				label: "Move",
				icon: "arrow",
				tone: "default",
				enabled: unitHasMP,
				disabledReason: unitHasMP ? undefined : "No MP remaining",
				onExecute: () => {
					// Movement is handled by the input system on next tap
					// MP is spent by the movement system when the move executes
				},
			},
			...(profile.canPatrol
				? [
						{
							id: "patrol",
							label: "Patrol",
							icon: "loop",
							tone: "default",
							enabled: unitHasMP,
							disabledReason: unitHasMP ? undefined : "No MP remaining",
							onExecute: () => {
								// TODO: wire to patrol order system
							},
						},
					]
				: []),
		];
	},
});

// --- COMBAT category ---

registerRadialProvider({
	id: "combat",
	category: {
		id: "combat",
		label: "Combat",
		icon: "sword",
		tone: "combat",
		priority: 20,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!isSelectedBotCategoryAllowed(ctx, "combat")) return [];
		const profile = getSelectedBotProfile(ctx);
		if (!profile) return [];

		const unitHasAP = ctx.targetEntityId
			? hasActionPoints(ctx.targetEntityId)
			: false;

		const noApReason = unitHasAP ? undefined : "No AP remaining";
		const actions = [];
		if (profile.canAttack) {
			actions.push({
				id: "attack",
				label: "Attack",
				icon: "sword",
				tone: "combat",
				enabled: unitHasAP,
				disabledReason: noApReason,
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "combat");
					}
					// TODO: wire to attack order
				},
			});
		}
		if (profile.canHack) {
			actions.push({
				id: "hack",
				label: "Hack",
				icon: "signal",
				tone: "signal",
				enabled: unitHasAP,
				disabledReason: noApReason,
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "hack");
					}
					// TODO: wire to hacking system
				},
			});
		}
		if (profile.canFortify) {
			actions.push({
				id: "fortify",
				label: "Fortify",
				icon: "city",
				tone: "power",
				enabled: unitHasAP,
				disabledReason: noApReason,
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "fortify");
					}
					// TODO: wire to fortification orders
				},
			});
		}

		return actions;
	},
});

// --- BUILD category ---

/** Helper: check affordability and create a build action entry */
function makeBuildAction(
	id: string,
	label: string,
	icon: string,
	tone: string,
	buildingType: string,
	resources: ReturnType<typeof getResources>,
	unitHasAP: boolean,
	ctx: RadialOpenContext,
) {
	const costs = BUILDING_COSTS[buildingType];
	if (!costs) return null;
	const canAfford = costs.every(
		(cost) => (resources[cost.type] ?? 0) >= cost.amount,
	);
	const disabledReason = !unitHasAP
		? "No AP remaining"
		: !canAfford
			? "Insufficient materials"
			: undefined;
	return {
		id,
		label,
		icon,
		tone,
		enabled: canAfford && unitHasAP,
		disabledReason,
		onExecute: () => {
			if (ctx.selectionType === "unit" && ctx.targetEntityId) {
				spendActionPoint(ctx.targetEntityId, 1);
				awardXPToActor(ctx.targetEntityId, "build");
			}
			setActivePlacement(
				buildingType as Parameters<typeof setActivePlacement>[0],
				ctx.targetEntityId ?? undefined,
			);
		},
	};
}

registerRadialProvider({
	id: "build",
	category: {
		id: "build",
		label: "Build",
		icon: "gear",
		tone: "default",
		priority: 30,
	},
	getActions: (ctx: RadialOpenContext) => {
		// Build actions available on open sector space or when a unit is selected
		if (ctx.selectionType !== "empty_sector" && ctx.selectionType !== "unit") {
			return [];
		}

		const profile =
			ctx.selectionType === "unit" ? getSelectedBotProfile(ctx) : null;
		if (ctx.selectionType === "unit" && !profile) {
			return [];
		}
		if (
			ctx.selectionType === "unit" &&
			!isSelectedBotCategoryAllowed(ctx, "build")
		) {
			return [];
		}

		// Restrict building to Fabricator-role bots (task #68)
		if (
			ctx.selectionType === "unit" &&
			!canUnitBuild(ctx.targetEntityId)
		) {
			return [];
		}

		const resources = getResources();
		const unitHasAP =
			ctx.selectionType === "unit" && ctx.targetEntityId
				? hasActionPoints(ctx.targetEntityId)
				: true;
		const actions = [];

		// Lightning Rod
		if (ctx.selectionType === "empty_sector" || profile?.canBuildRod) {
			const action = makeBuildAction(
				"build_rod", "Rod", "bolt", "power",
				"lightning_rod", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Fabrication Unit
		if (ctx.selectionType === "empty_sector" || profile?.canBuildFabricator) {
			const action = makeBuildAction(
				"build_fab", "Fabricator", "gear", "signal",
				"fabrication_unit", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Motor Pool
		{
			const action = makeBuildAction(
				"build_motor_pool", "Motor Pool", "gear", "power",
				"motor_pool", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Relay Tower
		if (ctx.selectionType === "empty_sector" || profile?.canBuildRelay) {
			const action = makeBuildAction(
				"build_relay", "Relay", "signal", "signal",
				"relay_tower", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Defense Turret
		{
			const action = makeBuildAction(
				"build_turret", "Turret", "sword", "combat",
				"defense_turret", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Power Sink
		{
			const action = makeBuildAction(
				"build_power_sink", "Power Sink", "bolt", "power",
				"power_sink", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Storage Hub
		{
			const action = makeBuildAction(
				"build_storage", "Storage", "gear", "default",
				"storage_hub", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Habitat Module
		{
			const action = makeBuildAction(
				"build_habitat", "Habitat", "city", "signal",
				"habitat_module", resources, unitHasAP, ctx,
			);
			if (action) actions.push(action);
		}

		// Establish Substation
		if (profile?.canEstablishSubstation) {
			actions.push({
				id: "build_substation",
				label: "Establish",
				icon: "city",
				tone: "power",
				enabled: unitHasAP,
				disabledReason: unitHasAP ? undefined : "No AP remaining",
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "found");
					}
					setCitySiteModalOpen(true, getRuntimeState().nearbyPoi);
				},
			});
		}

		return actions;
	},
});

// --- REPAIR category ---

registerRadialProvider({
	id: "repair",
	category: {
		id: "repair",
		label: "Repair",
		icon: "wrench",
		tone: "power",
		priority: 40,
	},
	getActions: (ctx: RadialOpenContext) => {
		const profile = getSelectedBotProfile(ctx);
		if (!isSelectedBotCategoryAllowed(ctx, "repair")) return [];
		if (!profile?.canRepair) return [];
		const entity = findEntityById(ctx.targetEntityId);
		if (!entity) return [];
		if (ctx.targetFaction !== "player") return [];

		// Get broken components
		const unitComp = entity.get(Unit);
		const buildingComp = entity.get(Building);
		const components = unitComp?.components ?? buildingComp?.components ?? [];
		const broken = components.filter((c) => !c.functional);

		if (broken.length === 0) return [];

		// Find nearest repair drone
		const repairer = Array.from(units).find((u) => {
			if (u.get(Identity)?.id === ctx.targetEntityId) return false;
			if (u.get(Identity)?.faction !== "player") return false;
			const hasArms = u
				.get(Unit)
				?.components.some((c) => c.name === "arms" && c.functional);
			if (!hasArms) return false;
			const uPos = u.get(WorldPosition);
			const ePos = entity.get(WorldPosition);
			if (!uPos || !ePos) return false;
			const dx = uPos.x - ePos.x;
			const dz = uPos.z - ePos.z;
			return Math.sqrt(dx * dx + dz * dz) < 3.0;
		});

		const unitHasAP = ctx.targetEntityId
			? hasActionPoints(ctx.targetEntityId)
			: false;
		const repairDisabledReason = !unitHasAP
			? "No AP remaining"
			: !repairer
				? "No repairer nearby"
				: undefined;

		return broken.map((comp) => ({
			id: `repair_${comp.name}`,
			label: comp.name.replace(/_/g, " "),
			icon: "wrench",
			tone: "power",
			enabled: !!repairer && unitHasAP,
			disabledReason: repairDisabledReason,
			onExecute: () => {
				if (repairer && ctx.targetEntityId) {
					spendActionPoint(ctx.targetEntityId, 1);
					awardXPToActor(ctx.targetEntityId, "repair");
					startRepair(repairer, entity, comp.name);
				}
			},
		}));
	},
});

// --- FABRICATION category ---

registerRadialProvider({
	id: "fabrication",
	category: {
		id: "fabricate",
		label: "Fabricate",
		icon: "gear",
		tone: "default",
		priority: 35,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit" && ctx.selectionType !== "building") {
			return [];
		}

		const entity = findEntityById(ctx.targetEntityId);
		if (!entity) return [];
		const profile = entity.get(Unit)
			? getBotCommandProfile(entity.get(Unit)!.type)
			: null;
		if (entity.get(Unit) && !isSelectedBotCategoryAllowed(ctx, "fabricate")) {
			return [];
		}
		if (!profile?.canFabricate) return [];

		const unit = entity.get(Unit);
		const building = entity.get(Building);
		if (!unit || unit.type !== "fabrication_unit") return [];
		if (!building?.powered || !building.operational) return [];

		const resources = getResources();
		const unitHasAP = ctx.targetEntityId
			? hasActionPoints(ctx.targetEntityId)
			: false;

		return RECIPES.map((recipe) => {
			const canAfford = recipe.costs.every(
				(cost) => (resources[cost.type] ?? 0) >= cost.amount,
			);
			const fabDisabledReason = !unitHasAP
				? "No AP remaining"
				: !canAfford
					? "Insufficient materials"
					: undefined;
			return {
				id: `fab_${recipe.name}`,
				label: recipe.name.replace(/_/g, " "),
				icon: "gear",
				tone: "default",
				enabled: canAfford && unitHasAP,
				disabledReason: fabDisabledReason,
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "build");
					}
					startFabrication(entity, recipe.name);
				},
			};
		});
	},
});

// --- MOTOR POOL category ---

registerRadialProvider({
	id: "motor_pool",
	category: {
		id: "motor_pool",
		label: "Motor Pool",
		icon: "gear",
		tone: "power",
		priority: 36,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "building") return [];

		const entity = findEntityById(ctx.targetEntityId);
		if (!entity) return [];
		const building = entity.get(Building);
		if (!building || building.type !== "motor_pool") return [];
		if (!building.powered || !building.operational) return [];

		const entityId = ctx.targetEntityId;
		if (!entityId) return [];

		const poolState = getMotorPoolState(entityId);
		if (!poolState) return [];

		const tierConfig = MOTOR_POOL_TIER_CONFIG[poolState.tier];
		const queueFull = poolState.queue.length >= tierConfig.maxQueue;
		const resources = getResources();
		const actions = [];

		// Bot fabrication actions
		for (const recipe of BOT_FABRICATION_RECIPES) {
			const canAfford = recipe.costs.every(
				(cost) => (resources[cost.type] ?? 0) >= cost.amount,
			);
			actions.push({
				id: `mp_fab_${recipe.botType}`,
				label: recipe.label,
				icon: "gear",
				tone: "power",
				enabled: canAfford && !queueFull,
				onExecute: () => queueBotFabrication(entityId, recipe.botType),
			});
		}

		// Tier upgrade action
		if (poolState.tier !== "elite") {
			const nextTier = poolState.tier === "basic" ? "Advanced" : "Elite";
			actions.push({
				id: "mp_upgrade",
				label: `Upgrade → ${nextTier}`,
				icon: "bolt",
				tone: "signal",
				enabled: true,
				onExecute: () => upgradeMotorPool(entityId),
			});
		}

		return actions;
	},
});

// --- MARK UPGRADE category (on units near Motor Pool) ---

/** Maximum distance (in world units) for a unit to be in range of a Motor Pool */
const MARK_UPGRADE_RANGE = 5.0;

registerRadialProvider({
	id: "mark_upgrade",
	category: {
		id: "upgrade",
		label: "Upgrade",
		icon: "bolt",
		tone: "signal",
		priority: 37,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];

		const entity = findEntityById(ctx.targetEntityId);
		if (!entity) return [];
		const unit = entity.get(Unit);
		if (!unit) return [];
		const entityPos = entity.get(WorldPosition);
		if (!entityPos) return [];

		// Check if there's a powered Motor Pool nearby
		const nearbyMotorPool = Array.from(buildings).find((b) => {
			const building = b.get(Building);
			if (!building || building.type !== "motor_pool") return false;
			if (!building.powered || !building.operational) return false;
			if (b.get(Identity)?.faction !== "player") return false;
			const bPos = b.get(WorldPosition);
			if (!bPos) return false;
			const dx = entityPos.x - bPos.x;
			const dz = entityPos.z - bPos.z;
			return Math.sqrt(dx * dx + dz * dz) <= MARK_UPGRADE_RANGE;
		});

		if (!nearbyMotorPool) return [];

		const unitHasAP = ctx.targetEntityId
			? hasActionPoints(ctx.targetEntityId)
			: false;
		const xpState = ctx.targetEntityId
			? getUnitExperience(ctx.targetEntityId)
			: undefined;
		const xpEligible = xpState?.upgradeEligible ?? false;
		const progress = ctx.targetEntityId
			? getXPProgress(ctx.targetEntityId)
			: 0;
		const currentMark = xpState?.currentMark ?? unit.markLevel;

		// Check resource cost for this Mark upgrade
		const upgradeCost = getMarkUpgradeCost(currentMark);
		const resources = getResources();
		const canAfford = upgradeCost
			? upgradeCost.costs.every(
					(cost) => (resources[cost.type] ?? 0) >= cost.amount,
				)
			: false;

		// Check Motor Pool tier allows this upgrade
		const motorPoolId = nearbyMotorPool.get(Identity)?.id;
		const tierAllows =
			motorPoolId && upgradeCost
				? canMotorPoolUpgradeMark(motorPoolId, upgradeCost.toMark)
				: false;

		const canUpgrade = xpEligible && canAfford && tierAllows;

		const disabledReason = !unitHasAP
			? "No AP remaining"
			: !xpEligible
				? `XP: ${Math.round(progress * 100)}% to Mark ${currentMark + 1}`
				: !canAfford
					? "Insufficient resources"
					: !tierAllows
						? "Motor Pool tier too low"
						: undefined;

		return [
			{
				id: "mark_upgrade",
				label: `Mark ${currentMark} → ${currentMark + 1}`,
				icon: "bolt",
				tone: "signal",
				enabled: canUpgrade && unitHasAP,
				disabledReason,
				onExecute: () => {
					if (ctx.targetEntityId && canUpgrade && upgradeCost) {
						// Spend resources
						for (const cost of upgradeCost.costs) {
							spendResource(cost.type, cost.amount);
						}
						spendActionPoint(ctx.targetEntityId, 1);
						const success = applyMarkUpgrade(ctx.targetEntityId);
						if (success) {
							// Update the ECS Unit trait's markLevel
							unit.markLevel = upgradeCost.toMark;
							logTurnEvent(
								"fabrication",
								ctx.targetEntityId,
								"player",
								{ action: "mark_upgrade", newMark: unit.markLevel },
							);
						}
					}
				},
			},
		];
	},
});

// --- HARVEST category ---

/** Maximum distance (in world units) for a fabricator to reach a structure */
const HARVEST_SCAN_RANGE = 4.0;

registerRadialProvider({
	id: "harvest",
	category: {
		id: "harvest",
		label: "Harvest",
		icon: "pickaxe",
		tone: "power",
		priority: 36,
	},
	getActions: (ctx: RadialOpenContext) => {
		// Only available when a player unit is selected
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!isSelectedBotCategoryAllowed(ctx, "harvest")) return [];
		const profile = getSelectedBotProfile(ctx);
		if (!profile?.canHarvest) return [];

		// Find the selected entity and its position
		const entity = findEntityById(ctx.targetEntityId);
		if (!entity) return [];
		const entityPos = entity.get(WorldPosition);
		if (!entityPos) return [];

		const unitHasAP = ctx.targetEntityId
			? hasActionPoints(ctx.targetEntityId)
			: false;

		// Scan nearby structures within harvest range
		const session = getActiveWorldSession();
		if (!session) return [];

		const actions = [];
		for (const structure of session.sectorStructures) {
			if (isStructureConsumed(structure.id)) continue;

			// Get family from placement_layer (maps to resource pool family)
			const family = structure.placement_layer;
			if (!isHarvestable(family)) continue;

			const worldPos = gridToWorld(structure.q, structure.r);
			const dx = worldPos.x + structure.offset_x - entityPos.x;
			const dz = worldPos.z + structure.offset_z - entityPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > HARVEST_SCAN_RANGE) continue;

			// Get resource pool for yield preview
			const pool = getResourcePoolForModel(family, structure.model_id);
			const yieldPreview = pool.yields
				.map((y) => `${y.min}-${y.max} ${y.resource.replace(/_/g, " ")}`)
				.join(", ");

			actions.push({
				id: `harvest_${structure.id}`,
				label: `${pool.label}`,
				icon: "pickaxe",
				tone: "power",
				enabled: unitHasAP,
				disabledReason: unitHasAP ? undefined : "No AP remaining",
				onExecute: () => {
					if (ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "harvest");
						startHarvest(
							ctx.targetEntityId,
							structure.id,
							structure.model_id,
							family,
							worldPos.x + structure.offset_x,
							worldPos.z + structure.offset_z,
						);
					}
				},
			});

			// Limit to 6 nearby targets to keep the radial menu readable
			if (actions.length >= 6) break;
		}

		return actions;
	},
});

// --- SYSTEM category (sim controls) ---

registerRadialProvider({
	id: "sim_control",
	category: {
		id: "system",
		label: "System",
		icon: "gear",
		tone: "default",
		priority: 90,
	},
	getActions: () => {
		// System actions are always available
		return [
			{
				id: "pause_toggle",
				label: "Pause",
				icon: "pause",
				tone: "default",
				enabled: true,
				onExecute: () => togglePause(),
			},
			{
				id: "speed_05x",
				label: "0.5x",
				icon: "slow",
				tone: "default",
				enabled: true,
				onExecute: () => setGameSpeed(0.5),
			},
			{
				id: "speed_1x",
				label: "1x",
				icon: "normal",
				tone: "default",
				enabled: true,
				onExecute: () => setGameSpeed(1),
			},
			{
				id: "speed_2x",
				label: "2x",
				icon: "fast",
				tone: "power",
				enabled: true,
				onExecute: () => setGameSpeed(2),
			},
			{
				id: "city_lab",
				label: "Lab",
				icon: "city",
				tone: "signal",
				enabled: true,
				onExecute: () => openCityKitLab(),
			},
		];
	},
});

// --- SURVEY category ---

registerRadialProvider({
	id: "survey",
	category: {
		id: "survey",
		label: "Survey",
		icon: "eye",
		tone: "default",
		priority: 50,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (
			ctx.selectionType !== "empty_sector" &&
			ctx.selectionType !== "resource_node"
		) {
			if (!isSelectedBotCategoryAllowed(ctx, "survey")) {
				return [];
			}
			const profile = getSelectedBotProfile(ctx);
			if (!profile?.canSurvey) {
				return [];
			}
		}

		const actions = [
			{
				id: "brief_sector",
				label: "Brief",
				icon: "eye",
				tone: "default",
				enabled: true,
				onExecute: () => {
					setCitySiteModalOpen(true, getRuntimeState().nearbyPoi);
				},
			},
		];

		return actions;
	},
});

// --- DISTRICT category ---

registerRadialProvider({
	id: "district",
	category: {
		id: "district",
		label: "District",
		icon: "city",
		tone: "signal",
		priority: 55,
	},
	getActions: (ctx: RadialOpenContext) => {
		const runtime = getRuntimeState();
		const mode = runtime.activeScene === "city" ? "city" : "world";
		if (
			ctx.selectionType === "unit" &&
			!isSelectedBotCategoryAllowed(ctx, "district")
		) {
			return [];
		}
		const active = getActiveDistrictViewModel(mode);
		if (!active) {
			return [];
		}

		const { city, context, viewModel } = active;
		const actions: RadialAction[] = [
			{
				id: "district_brief",
				label: "Brief",
				icon: "eye",
				tone: "signal",
				enabled: true,
				onExecute: () => setCitySiteModalOpen(true, context),
			},
		];

		const unitHasAP =
			ctx.selectionType === "unit" && ctx.targetEntityId
				? hasActionPoints(ctx.targetEntityId)
				: true;

		if (viewModel.canSurvey && city) {
			actions.push({
				id: "district_survey",
				label: "Survey",
				icon: "eye",
				tone: "signal",
				enabled: unitHasAP,
				disabledReason: unitHasAP ? undefined : "No AP remaining",
				onExecute: () => {
					if (ctx.selectionType === "unit" && ctx.targetEntityId) {
						spendActionPoint(ctx.targetEntityId, 1);
						awardXPToActor(ctx.targetEntityId, "survey");
					}
					surveyCitySite(city.id);
				},
			});
		}

		if (viewModel.canFound && city) {
			const profile =
				ctx.selectionType === "unit" ? getSelectedBotProfile(ctx) : null;
			const canEstablish =
				ctx.selectionType !== "unit" ||
				profile?.canEstablishSubstation === true;
			const establishReason = !unitHasAP
				? "No AP remaining"
				: !canEstablish
					? "Wrong unit role"
					: undefined;
			actions.push({
				id: "district_establish",
				label: "Establish",
				icon: "city",
				tone: "power",
				enabled: canEstablish && unitHasAP,
				disabledReason: establishReason,
				onExecute: () => {
					if (canEstablish) {
						if (ctx.selectionType === "unit" && ctx.targetEntityId) {
							spendActionPoint(ctx.targetEntityId, 1);
							awardXPToActor(ctx.targetEntityId, "found");
						}
						foundCitySite(city.id);
					}
				},
			});
		}

		if (viewModel.canEnter && city && mode === "world") {
			actions.push({
				id: "district_enter",
				label: "Enter",
				icon: "arrow",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					enterCityInstance(city.id);
				},
			});
		}

		if (mode === "city") {
			actions.push({
				id: "district_return",
				label: "Return",
				icon: "arrow",
				tone: "default",
				enabled: true,
				onExecute: () => {
					returnToWorld();
				},
			});
		}

		for (const operation of viewModel.operations.filter(
			(candidate) => candidate.status === "available",
		)) {
			actions.push({
				id: `district_operation_${operation.id}`,
				label: operation.label,
				icon: "gear",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					executeDistrictOperation({
						cityInstanceId: city?.id ?? null,
						poiType: context.poiType,
						state: city?.state ?? "latent",
						operationId: operation.id,
					});
				},
			});
		}

		return actions;
	},
});

// --- CITY INTERIOR category (for city scene) ---

registerRadialProvider({
	id: "city_interior",
	category: {
		id: "city",
		label: "City",
		icon: "city",
		tone: "signal",
		priority: 60,
	},
	getActions: (ctx: RadialOpenContext) => {
		// Only available in city scene contexts
		// The radial menu will be opened with appropriate context
		// by the city interior input handler
		if (ctx.selectionType === "none") return [];
		if (getRuntimeState().activeScene !== "city") return [];

		return [
			{
				id: "city_brief",
				label: "Brief",
				icon: "eye",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					setCitySiteModalOpen(true, getRuntimeState().nearbyPoi);
				},
			},
			{
				id: "return_world",
				label: "Return",
				icon: "arrow",
				tone: "default",
				enabled: true,
				onExecute: () => returnToWorld(),
			},
		];
	},
});
