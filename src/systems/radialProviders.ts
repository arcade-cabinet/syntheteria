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
import { getActiveWorldSession } from "../world/session";
import { BUILDING_COSTS, setActivePlacement } from "./buildingPlacement";
import { RECIPES, startFabrication } from "./fabrication";
import { type RadialOpenContext, registerRadialProvider } from "./radialMenu";
import { startRepair } from "./repair";
import { getResources } from "./resources";

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

		return [
			{
				id: "move_to",
				label: "Move",
				icon: "arrow",
				tone: "default",
				enabled: true,
				onExecute: () => {
					// Movement is handled by the input system on next tap
				},
			},
			...(profile.canPatrol
				? [
						{
							id: "patrol",
							label: "Patrol",
							icon: "loop",
							tone: "default",
							enabled: true,
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

		const actions = [];
		if (profile.canAttack) {
			actions.push({
				id: "attack",
				label: "Attack",
				icon: "sword",
				tone: "combat",
				enabled: true,
				onExecute: () => {
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
				enabled: true,
				onExecute: () => {
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
				enabled: true,
				onExecute: () => {
					// TODO: wire to fortification orders
				},
			});
		}

		return actions;
	},
});

// --- BUILD category ---

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

		const resources = getResources();
		const actions = [];

		// Lightning Rod
		if (ctx.selectionType === "empty_sector" || profile?.canBuildRod) {
			const rodCosts = BUILDING_COSTS.lightning_rod;
			const canAffordRod = rodCosts.every(
				(cost) => (resources[cost.type] ?? 0) >= cost.amount,
			);
			actions.push({
				id: "build_rod",
				label: "Rod",
				icon: "bolt",
				tone: "power",
				enabled: canAffordRod,
				onExecute: () => setActivePlacement("lightning_rod"),
			});
		}

		// Fabricator
		if (ctx.selectionType === "empty_sector" || profile?.canBuildFabricator) {
			const fabCosts = BUILDING_COSTS.fabrication_unit;
			const canAffordFab = fabCosts.every(
				(cost) => (resources[cost.type] ?? 0) >= cost.amount,
			);
			actions.push({
				id: "build_fab",
				label: "Fabricator",
				icon: "gear",
				tone: "signal",
				enabled: canAffordFab,
				onExecute: () => setActivePlacement("fabrication_unit"),
			});
		}

		// Signal Relay
		if (ctx.selectionType === "empty_sector" || profile?.canBuildRelay) {
			actions.push({
				id: "build_relay",
				label: "Relay",
				icon: "signal",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					// TODO: wire to relay placement
				},
			});
		}

		if (profile?.canEstablishSubstation) {
			actions.push({
				id: "build_substation",
				label: "Establish",
				icon: "city",
				tone: "power",
				enabled: true,
				onExecute: () => {
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

		return broken.map((comp) => ({
			id: `repair_${comp.name}`,
			label: comp.name.replace(/_/g, " "),
			icon: "wrench",
			tone: "power",
			enabled: !!repairer,
			onExecute: () => {
				if (repairer) {
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

		return RECIPES.map((recipe) => {
			const canAfford = recipe.costs.every(
				(cost) => (resources[cost.type] ?? 0) >= cost.amount,
			);
			return {
				id: `fab_${recipe.name}`,
				label: recipe.name.replace(/_/g, " "),
				icon: "gear",
				tone: "default",
				enabled: canAfford,
				onExecute: () => startFabrication(entity, recipe.name),
			};
		});
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

		if (ctx.selectionType === "resource_node") {
			actions.push({
				id: "harvest",
				label: "Harvest",
				icon: "pickaxe",
				tone: "default",
				enabled: true,
				onExecute: () => {
					// TODO: wire to resource harvesting
				},
			});
		}

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
		const actions = [
			{
				id: "district_brief",
				label: "Brief",
				icon: "eye",
				tone: "signal",
				enabled: true,
				onExecute: () => setCitySiteModalOpen(true, context),
			},
		];

		if (viewModel.canSurvey && city) {
			actions.push({
				id: "district_survey",
				label: "Survey",
				icon: "eye",
				tone: "signal",
				enabled: true,
				onExecute: () => surveyCitySite(city.id),
			});
		}

		if (viewModel.canFound && city) {
			const profile =
				ctx.selectionType === "unit" ? getSelectedBotProfile(ctx) : null;
			const canEstablish =
				ctx.selectionType !== "unit" ||
				profile?.canEstablishSubstation === true;
			actions.push({
				id: "district_establish",
				label: "Establish",
				icon: "city",
				tone: "power",
				enabled: canEstablish,
				onExecute: () => {
					if (canEstablish) {
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
