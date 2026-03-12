import { setGameSpeed, togglePause } from "../ecs/gameState";
import {
	Building,
	Identity,
	LightningRod,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units, world } from "../ecs/world";
import {
	BUILDING_COSTS,
	setActivePlacement,
} from "./buildingPlacement";
import { RECIPES, startFabrication } from "./fabrication";
import { type RadialOpenContext, registerRadialProvider } from "./radialMenu";
import { startRepair } from "./repair";
import { getResources } from "./resources";
import { openCityKitLab, returnToWorld } from "../world/cityTransition";

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
	return (
		world.entities.find((e) => e.get(Identity)?.id === id) ?? null
	);
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

		return [
			{
				id: "move_to",
				label: "Move",
				icon: "arrow",
				tone: "default",
				enabled: true,
				onExecute: () => {
					// Movement is handled by the input system on next tap
					// This just confirms the intent
				},
			},
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

		return [
			{
				id: "attack",
				label: "Attack",
				icon: "sword",
				tone: "combat",
				enabled: true,
				onExecute: () => {
					// TODO: wire to attack order
				},
			},
			{
				id: "hack",
				label: "Hack",
				icon: "signal",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					// TODO: wire to hacking system
				},
			},
		];
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
		// Build actions available on empty tiles or when a unit is selected
		if (
			ctx.selectionType !== "empty_tile" &&
			ctx.selectionType !== "unit"
		) {
			return [];
		}

		const resources = getResources();
		const actions = [];

		// Lightning Rod
		const rodCosts = BUILDING_COSTS.lightning_rod;
		const canAffordRod = rodCosts.every(
			(cost) => resources[cost.type] >= cost.amount,
		);
		actions.push({
			id: "build_rod",
			label: "Rod",
			icon: "bolt",
			tone: "power",
			enabled: canAffordRod,
			onExecute: () => setActivePlacement("lightning_rod"),
		});

		// Fabricator
		const fabCosts = BUILDING_COSTS.fabrication_unit;
		const canAffordFab = fabCosts.every(
			(cost) => resources[cost.type] >= cost.amount,
		);
		actions.push({
			id: "build_fab",
			label: "Fabricator",
			icon: "gear",
			tone: "signal",
			enabled: canAffordFab,
			onExecute: () => setActivePlacement("fabrication_unit"),
		});

		// Signal Relay
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

		const unit = entity.get(Unit);
		const building = entity.get(Building);
		if (!unit || unit.type !== "fabrication_unit") return [];
		if (!building?.powered || !building.operational) return [];

		const resources = getResources();

		return RECIPES.map((recipe) => {
			const canAfford = recipe.costs.every(
				(cost) => resources[cost.type] >= cost.amount,
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
			ctx.selectionType !== "empty_tile" &&
			ctx.selectionType !== "resource_node"
		) {
			return [];
		}

		const actions = [
			{
				id: "survey_tile",
				label: "Survey",
				icon: "eye",
				tone: "default",
				enabled: true,
				onExecute: () => {
					// TODO: wire to exploration/survey system
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

		return [
			{
				id: "city_brief",
				label: "Brief",
				icon: "eye",
				tone: "signal",
				enabled: true,
				onExecute: () => {
					// TODO: wire to city brief modal
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
