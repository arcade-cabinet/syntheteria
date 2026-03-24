/**
 * Model path registry — maps unit types and building types to GLB asset paths.
 *
 * Single source of truth for all model resolution. Renderers import from here,
 * never hardcode paths.
 */

const ROBOT_BASE = "/assets/models/robots/";

// ─── Robot model paths ──────────────────────────────────────────────────────

/**
 * Unit type → GLB path mapping.
 *
 * Player robots use faction GLBs; cult mechs use cult GLBs.
 * The key is the `Unit.unitType` value from Koota traits.
 */
const UNIT_TYPE_TO_MODEL: Record<string, string> = {
	// Player faction robots
	maintenance_bot: `${ROBOT_BASE}factions/Companion-bot.glb`,
	utility_drone: `${ROBOT_BASE}factions/ReconBot.glb`,
	fabrication_unit: `${ROBOT_BASE}factions/MobileStorageBot.glb`,

	// Cult mechs (from cultDefs.ts)
	wanderer: `${ROBOT_BASE}cult/Mecha01.glb`,
	brute: `${ROBOT_BASE}cult/MechaGolem.glb`,
	assault: `${ROBOT_BASE}cult/MechaTrooper.glb`,
};

/** Resolve a unit type to its GLB model URL. Falls back to Companion-bot. */
export function resolveUnitModelUrl(unitType: string): string {
	return (
		UNIT_TYPE_TO_MODEL[unitType] ?? `${ROBOT_BASE}factions/Companion-bot.glb`
	);
}

/** All unique robot model URLs for preloading. */
export function getAllRobotModelUrls(): string[] {
	return [...new Set(Object.values(UNIT_TYPE_TO_MODEL))];
}

// ─── Building model paths ───────────────────────────────────────────────────

const BUILDING_BASE = "/assets/models/buildings/";

const BUILDING_TYPE_TO_MODEL: Record<string, string> = {
	lightning_rod: `${BUILDING_BASE}Solar_generator.glb`,
	fabrication_unit: `${BUILDING_BASE}Machine_building_plant.glb`,
	reactor: `${BUILDING_BASE}Reactor.glb`,
	research_center: `${BUILDING_BASE}Research_center.glb`,
	warehouse: `${BUILDING_BASE}Resource_warehouse.glb`,
	farm: `${BUILDING_BASE}Farm.glb`,
	home: `${BUILDING_BASE}Home_colonists.glb`,
	solar_panel: `${BUILDING_BASE}Solar_panel.glb`,
	drone_control: `${BUILDING_BASE}Drone_control_center.glb`,
	drone_charging: `${BUILDING_BASE}Drone_charging_station.glb`,
};

/** Resolve a building type to its GLB model URL. Falls back to basemodule_A. */
export function resolveBuildingModelUrl(buildingType: string): string {
	return (
		BUILDING_TYPE_TO_MODEL[buildingType] ?? `${BUILDING_BASE}basemodule_A.glb`
	);
}

/** All unique building model URLs for preloading. */
export function getAllBuildingModelUrls(): string[] {
	return [...new Set(Object.values(BUILDING_TYPE_TO_MODEL))];
}

// ─── City environment model paths ────────────────────────────────────────────

import type { CityBuilding } from "../ecs/cityLayout";

type CityBuildingType = CityBuilding["type"];

const CITY_TYPE_TO_MODEL: Record<CityBuildingType, string> = {
	conduit: "/assets/models/infrastructure/Connecting_gateway_long.glb",
	node: "/assets/models/city/Props_Base.glb",
	tower: "/assets/models/infrastructure/structure_tall.glb",
	ruin: "/assets/models/defense/barricade-window-a.glb",
	wall: "/assets/models/defense/wall-low.glb",
};

/** Resolve a city building type to its GLB model URL. */
export function resolveCityModelUrl(type: CityBuildingType): string {
	return CITY_TYPE_TO_MODEL[type];
}

/** All unique city model URLs for preloading. */
export function getAllCityModelUrls(): string[] {
	return [...new Set(Object.values(CITY_TYPE_TO_MODEL))];
}
