/**
 * modelPaths — single source of truth for all model ID → URL resolution.
 *
 * Derives paths from ECS definitions (BUILDING_DEFS, SALVAGE_DEFS, CULT_STRUCTURE_DEFS).
 * No hardcoded maps in renderers — everything flows through here.
 */

import { BUILDING_DEFS, CULT_STRUCTURE_DEFS } from "./buildings";
import { FACTION_COLORS as GAME_FACTION_COLORS } from "./gameDefaults";
import { SALVAGE_DEFS } from "./resources";

const MODEL_BASE = "/assets/models/";

// ─── Salvage model paths ─────────────────────────────────────────────────────

/** modelId → relative path under /assets/models/ for salvage props */
const SALVAGE_MODEL_PATHS: Record<string, string> = {
	// ── City props ──────────────────────────────────────────────────────
	props_chest: "city/Props_Chest.glb",
	props_container_full: "city/Props_ContainerFull.glb",
	props_crate: "city/Props_Crate.glb",
	props_crate_long: "city/Props_CrateLong.glb",
	props_base: "city/Props_Base.glb",
	props_capsule: "city/Props_Capsule.glb",
	props_computer: "city/Props_Computer.glb",
	props_computer_small: "city/Props_ComputerSmall.glb",
	props_pod: "city/Props_Pod.glb",
	props_statue: "city/Props_Statue.glb",
	props_teleporter_1: "city/Props_Teleporter_1.glb",
	props_teleporter_2: "city/Props_Teleporter_2.glb",
	props_laser: "city/Props_Laser.glb",
	// ── Industrial props ────────────────────────────────────────────────
	computer: "industrial/Computer.glb",
	computer_large: "industrial/Computer_Large.glb",
	barrel: "industrial/barrel.glb",
	barrel_01: "industrial/Barrel_01.glb",
	barrel_stove: "industrial/barrel_stove.glb",
	barrels: "industrial/barrels.glb",
	barrels_rail: "industrial/barrels_rail.glb",
	machine_generator: "infrastructure/machine_generator.glb",
	machine_barrel: "industrial/machine_barrel.glb",
	machine_barrel_large: "industrial/machine_barrelLarge.glb",
	robot_arm_a: "industrial/robot-arm-a.glb",
	robot_arm_b: "industrial/robot-arm-b.glb",
	conveyor: "industrial/conveyor.glb",
	conveyor_long: "industrial/conveyor-long.glb",
	conveyor_sides: "industrial/conveyor-sides.glb",
	scanner_high: "industrial/scanner-high.glb",
	scanner_low: "industrial/scanner-low.glb",
	lever: "industrial/Lever.glb",
	tv_1: "industrial/TV_1.glb",
	tv_2: "industrial/TV_2.glb",
	tv_3: "industrial/TV_3.glb",
	chimney: "industrial/chimney.glb",
	chimney_detailed: "industrial/chimney_detailed.glb",
	// ── Props pack ──────────────────────────────────────────────────────
	cargo_a: "props/cargo_A.glb",
	cargo_a_packed: "props/cargo_A_packed.glb",
	cargo_b: "props/cargo_B.glb",
	containers_a: "props/containers_A.glb",
	containers_b: "props/containers_B.glb",
	props_shelf: "props/Props_Shelf.glb",
	props_shelf_tall: "props/Props_Shelf_Tall.glb",
	props_vessel: "props/Props_Vessel.glb",
	props_vessel_short: "props/Props_Vessel_Short.glb",
	props_vessel_tall: "props/Props_Vessel_Tall.glb",
	lander_a: "props/lander_A.glb",
	drone_carrier: "props/Drone_carrier.glb",
	drone_earner: "props/Drone_earner.glb",
	transporter: "props/Transporter.glb",
	roofmodule_base: "props/roofmodule_base.glb",
	roofmodule_solarpanels: "props/roofmodule_solarpanels.glb",
	tile_track_1: "props/Tile_track1.glb",
	tile_track_2: "props/Tile_track2.glb",
	tile_track_3: "props/Tile_track3.glb",
	tile_track_4: "props/Tile_track4.glb",
};

// Validate: every model referenced in SALVAGE_DEFS must have a path entry
for (const [type, def] of Object.entries(SALVAGE_DEFS)) {
	for (const modelId of def.models) {
		if (!SALVAGE_MODEL_PATHS[modelId]) {
			console.warn(
				`[modelPaths] Salvage type "${type}" references model "${modelId}" with no path mapping`,
			);
		}
	}
}

// ─── Building model paths (from BUILDING_DEFS.assetPath) ────────────────────

/** buildingType → full URL built from BUILDING_DEFS.assetPath */
const BUILDING_URLS: Record<string, string> = {};
for (const [_type, def] of Object.entries(BUILDING_DEFS)) {
	BUILDING_URLS[def.modelId] = MODEL_BASE + def.assetPath;
}

// ─── Cult structure model paths (from CULT_STRUCTURE_DEFS) ──────────────────

/** Dedicated model paths for cult structures (Colony building GLBs). */
const CULT_MODEL_PATHS: Record<string, string> = {
	drone_control_center: "buildings/Drone_control_center.glb",
	drone_charging_station: "buildings/Drone_charging_station.glb",
	main_house: "buildings/Main_house.glb",
	main_house_3lv: "buildings/Main_house_3lv.glb",
	decontamination_section: "infrastructure/Decontamination_section.glb",
};

const CULT_URLS: Record<string, string> = {};
for (const [_type, def] of Object.entries(CULT_STRUCTURE_DEFS)) {
	if (def.modelId) {
		// Check dedicated cult model paths first, then fall back to salvage paths
		const cultPath = CULT_MODEL_PATHS[def.modelId];
		const salvagePath = SALVAGE_MODEL_PATHS[def.modelId];
		const resolvedPath = cultPath ?? salvagePath;
		if (resolvedPath) {
			CULT_URLS[def.modelId] = MODEL_BASE + resolvedPath;
		}
	}
}

// ─── Infrastructure scatter models (environmental decoration) ────────────────
//
// Non-harvestable, non-buildable props scattered on the world surface for visual
// richness. Pipe networks, supports, cables, lamps, tunnels, monorail segments.
//

/** Pipe segment models — connecting infrastructure between structures. */
export const INFRA_PIPE_MODELS: readonly string[] = [
	"infrastructure/pipe_straight.glb",
	"infrastructure/pipe_corner.glb",
	"infrastructure/pipe_cross.glb",
	"infrastructure/pipe_split.glb",
	"infrastructure/pipe_end.glb",
	"infrastructure/pipe_entrance.glb",
	"infrastructure/pipe_ring.glb",
	"infrastructure/pipe_supportHigh.glb",
	"infrastructure/pipe_supportLow.glb",
	"infrastructure/modular_industrial_pipes_01.glb",
	"infrastructure/modular_airduct_circular_01.glb",
];

/** Structural supports and cables. */
export const INFRA_SUPPORT_MODELS: readonly string[] = [
	"infrastructure/Support.glb",
	"infrastructure/Support_Long.glb",
	"infrastructure/Cable_Long.glb",
	"infrastructure/Cable_Thick.glb",
	"infrastructure/structure_low.glb",
	"infrastructure/structure_tall.glb",
];

/** Gateway/corridor connector models. */
export const INFRA_GATEWAY_MODELS: readonly string[] = [
	"infrastructure/Connecting_gateway.glb",
	"infrastructure/Connecting_gateway_corner.glb",
	"infrastructure/Connecting_gateway_long.glb",
	"infrastructure/Section.glb",
	"infrastructure/Section_door.glb",
	"infrastructure/Cross_section.glb",
];

/** Monorail track segments. */
export const INFRA_MONORAIL_MODELS: readonly string[] = [
	"infrastructure/monorail_trackStraight.glb",
	"infrastructure/monorail_trackCornerLarge.glb",
	"infrastructure/monorail_trackSlope.glb",
	"infrastructure/monorail_trackSupport.glb",
];

/** Tunnel segments. */
export const INFRA_TUNNEL_MODELS: readonly string[] = [
	"infrastructure/tunnel_straight_A.glb",
	"infrastructure/tunnel_straight_B.glb",
];

/** Communication dishes and antennas. */
export const INFRA_ANTENNA_MODELS: readonly string[] = [
	"infrastructure/Antenna_1.glb",
	"infrastructure/Antenna_2.glb",
	"infrastructure/satelliteDish.glb",
	"infrastructure/satelliteDish_large.glb",
	"infrastructure/satelliteDish_detailed.glb",
	"infrastructure/machine_wireless.glb",
];

/** Lighting fixtures. */
export const INFRA_LIGHT_MODELS: readonly string[] = [
	"infrastructure/lights.glb",
	"infrastructure/street_lamp_01.glb",
	"infrastructure/industrial_wall_lamp.glb",
];

/** Power/energy infrastructure. */
export const INFRA_POWER_MODELS: readonly string[] = [
	"infrastructure/power_box_01.glb",
	"infrastructure/solarpanel.glb",
	"infrastructure/windturbine_tall.glb",
	"infrastructure/machine_generator.glb",
	"infrastructure/machine_generatorLarge.glb",
	"infrastructure/exterior_aircon_unit.glb",
	"infrastructure/drill_structure.glb",
];

/** Landing pad models. */
export const INFRA_LANDING_MODELS: readonly string[] = [
	"infrastructure/landingpad_small.glb",
	"infrastructure/landingpad_large.glb",
];

/** Decontamination section (cult structure overlap). */
export const INFRA_DECON_MODEL = "infrastructure/Decontamination_section.glb";

/** Get all infrastructure scatter model URLs. */
export function getAllInfraModelUrls(): string[] {
	return [
		...INFRA_PIPE_MODELS,
		...INFRA_SUPPORT_MODELS,
		...INFRA_GATEWAY_MODELS,
		...INFRA_MONORAIL_MODELS,
		...INFRA_TUNNEL_MODELS,
		...INFRA_ANTENNA_MODELS,
		...INFRA_LIGHT_MODELS,
		...INFRA_POWER_MODELS,
		...INFRA_LANDING_MODELS,
		INFRA_DECON_MODEL,
	].map((rel) => MODEL_BASE + rel);
}

// ─── Building variant models (not in BUILDING_DEFS — environmental scatter) ──

/** Base module variants — faction outpost building family. */
export const BUILDING_BASEMODULE_MODELS: readonly string[] = [
	"buildings/basemodule_A.glb",
	"buildings/basemodule_B.glb",
	"buildings/basemodule_C.glb",
	"buildings/basemodule_D.glb",
	"buildings/basemodule_E.glb",
	"buildings/basemodule_garage.glb",
];

/** Cargo depot variants. */
export const BUILDING_CARGODEPOT_MODELS: readonly string[] = [
	"buildings/cargodepot_A.glb",
	"buildings/cargodepot_B.glb",
	"buildings/cargodepot_C.glb",
];

/** Residential/colony buildings. */
export const BUILDING_COLONY_MODELS: readonly string[] = [
	"buildings/Main_house.glb",
	"buildings/Main_house_2lv.glb",
	"buildings/Main_house_3lv.glb",
	"buildings/Home_colonists.glb",
];

/** Production/industrial buildings. */
export const BUILDING_PRODUCTION_MODELS: readonly string[] = [
	"buildings/Machine_building_plant.glb",
	"buildings/Research_center.glb",
	"buildings/Resource_warehouse.glb",
	"buildings/Farm.glb",
	"buildings/Farm_module.glb",
];

/** Power generation buildings. */
export const BUILDING_POWER_MODELS: readonly string[] = [
	"buildings/Reactor.glb",
	"buildings/Reactor_add.glb",
	"buildings/Geothermal_generator.glb",
	"buildings/Solar_generator.glb",
	"buildings/Solar_panel.glb",
];

/** Drone facility buildings. */
export const BUILDING_DRONE_MODELS: readonly string[] = [
	"buildings/Drone_control_center.glb",
	"buildings/Drone_charging_station.glb",
];

/** Get all building variant model URLs (includes models already in BUILDING_DEFS). */
export function getAllBuildingVariantUrls(): string[] {
	return [
		...BUILDING_BASEMODULE_MODELS,
		...BUILDING_CARGODEPOT_MODELS,
		...BUILDING_COLONY_MODELS,
		...BUILDING_PRODUCTION_MODELS,
		...BUILDING_POWER_MODELS,
		...BUILDING_DRONE_MODELS,
	].map((rel) => MODEL_BASE + rel);
}

// ─── Exploration / POI models ────────────────────────────────────────────────

/** Collectible / loot models — found at POIs and discovery sites. */
export const EXPLORATION_COLLECTIBLE_MODELS: readonly string[] = [
	"exploration/Collectible_Gear.glb",
	"exploration/Collectible_Board.glb",
	"exploration/Lootbox.glb",
];

/** Terrain feature models — craters, meteors, rocks. */
export const EXPLORATION_TERRAIN_MODELS: readonly string[] = [
	"exploration/crater.glb",
	"exploration/craterLarge.glb",
	"exploration/meteor_half.glb",
	"exploration/meteor_detailed.glb",
	"exploration/rock_crystals.glb",
	"exploration/rock_crystalsLargeA.glb",
	"exploration/rock_crystalsLargeB.glb",
	"exploration/rocks_smallA.glb",
	"exploration/rocks_smallB.glb",
	"exploration/bones.glb",
];

/** Hangar models — larger exploration landmarks. */
export const EXPLORATION_HANGAR_MODELS: readonly string[] = [
	"exploration/hangar_largeA.glb",
	"exploration/hangar_smallA.glb",
];

// ─── Structural platform / prop models ──────────────────────────────────────

/** Platform models — elevated walkway tiles. */
export const STRUCTURAL_PLATFORM_MODELS: readonly string[] = [
	"structural/platform_center.glb",
	"structural/platform_corner.glb",
	"structural/platform_large.glb",
	"structural/platform_high.glb",
];

/** Structural column variants (additional to structures/ columns). */
export const STRUCTURAL_COLUMN_MODELS: readonly string[] = [
	"structural/Column_Simple.glb",
	"structural/Column_MetalSupport.glb",
	"structural/Column_Pipes.glb",
];

/** Structural prop models — vents, access points. */
export const STRUCTURAL_PROP_MODELS: readonly string[] = [
	"structural/Prop_Vent_Big.glb",
	"structural/Prop_Vent_Small.glb",
	"structural/Prop_AccessPoint.glb",
];

/** Structural supports and enclosures. */
export const STRUCTURAL_SUPPORT_MODELS: readonly string[] = [
	"structural/supports_high.glb",
	"structural/supports_low.glb",
	"structural/structure_detailed.glb",
	"structural/structure_closed.glb",
];

// ─── Defense models ─────────────────────────────────────────────────────────

/** Turret models — placed on defense structures. */
export const DEFENSE_TURRET_MODELS: readonly string[] = [
	"defense/Turret_Cannon.glb",
	"defense/Turret_Gun.glb",
	"defense/Turret_GunDouble.glb",
	"defense/turret_single.glb",
	"defense/turret_double.glb",
];

/** Barrier/fortification models — walls, fences, barricades. */
export const DEFENSE_BARRIER_MODELS: readonly string[] = [
	"defense/wall-low.glb",
	"defense/Fence.glb",
	"defense/modular_chainlink_fence.glb",
	"defense/concrete_road_barrier.glb",
	"defense/barricade-window-a.glb",
	"defense/barricade-window-b.glb",
	"defense/barricade-doorway-a.glb",
	"defense/barricade-doorway-b.glb",
];

/** Gate/entrance models. */
export const DEFENSE_GATE_MODELS: readonly string[] = [
	"defense/gate_simple.glb",
	"defense/gate_complex.glb",
];

/** Misc defense props. */
export const DEFENSE_MISC_MODELS: readonly string[] = [
	"defense/Sign_Corner_Hazard.glb",
	"defense/security_camera_01.glb",
];

// ─── Logistics models ───────────────────────────────────────────────────────

/** Logistics cargo/box models. */
export const LOGISTICS_CARGO_MODELS: readonly string[] = [
	"logistics/box-small.glb",
	"logistics/box-wide.glb",
	"logistics/box-large.glb",
	"logistics/box-long.glb",
	"logistics/craft_cargoA.glb",
	"logistics/craft_cargoB.glb",
	"logistics/craft_miner.glb",
	"logistics/rover.glb",
];

/** Logistics door models. */
export const LOGISTICS_DOOR_MODELS: readonly string[] = [
	"logistics/door-wide-open.glb",
	"logistics/door-wide-closed.glb",
	"logistics/rollershutter_door.glb",
];

// ─── Building tier visual variants ──────────────────────────────────────────

/** Building tier visual variants — T1/T2/T3 use progressively fancier models */
export const BUILDING_TIER_MODELS: Record<string, readonly string[]> = {
	outpost: [
		"buildings/basemodule_A.glb",
		"buildings/basemodule_B.glb",
		"buildings/basemodule_C.glb",
	],
	motor_pool: [
		"buildings/Machine_building_plant.glb",
		"buildings/basemodule_garage.glb",
		"buildings/Machine_building_plant.glb",
	],
	power_plant: [
		"buildings/Reactor.glb",
		"buildings/Reactor_add.glb",
		"buildings/Reactor.glb",
	],
	colony: [
		"buildings/Main_house.glb",
		"buildings/Main_house_2lv.glb",
		"buildings/Main_house_3lv.glb",
	],
	cargo_depot: [
		"buildings/cargodepot_A.glb",
		"buildings/cargodepot_B.glb",
		"buildings/cargodepot_C.glb",
	],
	farm: [
		"buildings/Farm.glb",
		"buildings/Farm_module.glb",
		"buildings/Farm.glb",
	],
	research: [
		"buildings/Research_center.glb",
		"buildings/Resource_warehouse.glb",
		"buildings/Research_center.glb",
	],
};

// ─── Ruin POI model clusters ────────────────────────────────────────────────

/** Ruin POI model clusters — scatter objects placed at ruin discovery sites */
export const RUIN_POI_MODELS: Record<string, readonly string[]> = {
	ruin_depot: [
		"exploration/hangar_largeA.glb",
		"exploration/hangar_smallA.glb",
		"props/cargo_A.glb",
	],
	ruin_factory: [
		"industrial/conveyor.glb",
		"industrial/machine_barrel.glb",
		"industrial/robot-arm-a.glb",
	],
	ruin_outpost: [
		"buildings/basemodule_D.glb",
		"exploration/Lootbox.glb",
		"props/containers_A.glb",
	],
	ruin_research: [
		"city/Props_Computer.glb",
		"city/Props_ComputerSmall.glb",
		"exploration/Collectible_Board.glb",
	],
	ruin_military: [
		"defense/Tank.glb",
		"defense/barricade-doorway-a.glb",
		"exploration/crater.glb",
	],
};

// ─── Natural feature / biome scatter models ─────────────────────────────────

/** Natural feature models — scatter objects on specific biome types */
export const BIOME_SCATTER_MODELS: Record<string, readonly string[]> = {
	mountain: [
		"exploration/rocks_smallA.glb",
		"exploration/rocks_smallB.glb",
		"exploration/rock_crystals.glb",
	],
	hills: [
		"exploration/rocks_smallA.glb",
		"exploration/rock_crystalsLargeA.glb",
	],
	desert: [
		"exploration/crater.glb",
		"exploration/craterLarge.glb",
		"exploration/meteor_half.glb",
	],
	tundra: ["exploration/meteor_detailed.glb", "exploration/bones.glb"],
};

// ─── Infrastructure improvement overlay models ──────────────────────────────

/** Infrastructure improvement overlay models — placed when tiles are roboformed */
export const IMPROVEMENT_MODELS = {
	road: [
		"infrastructure/monorail_trackStraight.glb",
		"infrastructure/monorail_trackCornerLarge.glb",
	],
	pipeline: [
		"infrastructure/pipe_straight.glb",
		"infrastructure/pipe_corner.glb",
		"infrastructure/pipe_cross.glb",
	],
	power_line: [
		"infrastructure/Cable_Long.glb",
		"infrastructure/Cable_Thick.glb",
	],
	mining: ["infrastructure/drill_structure.glb"],
	lighting: [
		"infrastructure/lights.glb",
		"infrastructure/industrial_wall_lamp.glb",
	],
};

// ─── Robot model paths ──────────────────────────────────────────────────────
//
// Two categories:
//   factions/ — 6 bot models used by ALL factions (player + AI). Differentiated by role.
//   cult/    — 3 mech models exclusively for EL cult encounters (POIs + random).
//

const ROBOT_MODEL_BASE = "/assets/models/robots/";

/**
 * Robot modelId → relative path under ROBOT_MODEL_BASE.
 * Every robot class has exactly one model. No defaults, no fallbacks.
 */
const ROBOT_MODEL_ID_PATHS: Record<string, string> = {
	// Faction bots (all factions use these 6)
	scout: "factions/ReconBot.glb",
	infantry: "factions/FieldFighter.glb",
	cavalry: "factions/Arachnoid.glb",
	ranged: "factions/QuadrupedTank.glb",
	support: "factions/Companion-bot.glb",
	worker: "factions/MobileStorageBot.glb",
	// Cult mechs (EL cult encounters only — 3)
	cult_infantry: "cult/MechaTrooper.glb",
	cult_ranged: "cult/MechaGolem.glb",
	cult_cavalry: "cult/Mecha01.glb",
};

/** Faction colors for unit tinting — re-exported from gameDefaults (single source of truth). */
export const FACTION_COLORS: Record<string, number> = {
	...GAME_FACTION_COLORS,
	static_remnants: 0xcc2255,
	null_monks: 0xcc2255,
	lost_signal: 0xcc2255,
};

/** Update the player faction's display color to match the selected faction. */
export function setPlayerFactionColor(color: number): void {
	FACTION_COLORS.player = color;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Resolve a salvage modelId to a full URL, or null if unknown. */
export function resolveSalvageModelUrl(modelId: string): string | null {
	const rel = SALVAGE_MODEL_PATHS[modelId];
	return rel ? MODEL_BASE + rel : null;
}

/** Resolve a building/cult modelId to a full URL, or null if unknown. */
export function resolveBuildingModelUrl(modelId: string): string | null {
	return BUILDING_URLS[modelId] ?? CULT_URLS[modelId] ?? null;
}

/** Resolve a robot modelId to a model URL. Every robot class must have an entry. */
export function resolveRobotModelUrl(modelId: string): string {
	const rel = ROBOT_MODEL_ID_PATHS[modelId];
	if (!rel) {
		console.error(`[modelPaths] Unknown robot modelId: "${modelId}"`);
		return ROBOT_MODEL_BASE + "factions/Companion-bot.glb";
	}
	return ROBOT_MODEL_BASE + rel;
}

/** Get all unique salvage model URLs for preloading. */
export function getAllSalvageModelUrls(): string[] {
	return Object.values(SALVAGE_MODEL_PATHS).map((rel) => MODEL_BASE + rel);
}

/** Get all unique building model URLs for preloading. */
export function getAllBuildingModelUrls(): string[] {
	return [
		...new Set([...Object.values(BUILDING_URLS), ...Object.values(CULT_URLS)]),
	];
}

/** Get all unique robot model URLs for preloading. */
export function getAllRobotModelUrls(): string[] {
	return [
		...new Set(
			Object.values(ROBOT_MODEL_ID_PATHS).map((rel) => ROBOT_MODEL_BASE + rel),
		),
	];
}
