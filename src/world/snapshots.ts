import type { AgentRole } from "../ai";
import type { TerrainSetId } from "../config/terrainSetRules";
import type { SaveGameRecord } from "../db/saveGames";
import type { Biome, FogState } from "../ecs/terrain";
import type { UnitComponent } from "../ecs/traits";
import type { ResourcePool } from "../systems/resources";
import type { NewGameConfig } from "./config";
import type {
	CityGenerationStatus,
	CityInstanceState,
	WorldPoiType,
} from "./contracts";

export type SceneMode = "world" | "city";

export interface WorldMapSnapshot {
	id: number;
	save_game_id: number;
	width: number;
	height: number;
	map_size: string;
	climate_profile: NewGameConfig["climateProfile"];
	storm_profile: NewGameConfig["stormProfile"];
	spawn_q: number;
	spawn_r: number;
	generated_at: number;
}

export interface WorldTileSnapshot {
	id: number;
	world_map_id: number;
	q: number;
	r: number;
	biome: Biome;
	terrain_set_id: TerrainSetId;
	fog_state: FogState;
	passable: number;
}

export interface PoiState {
	id: number;
	world_map_id: number;
	type: WorldPoiType;
	name: string;
	q: number;
	r: number;
	discovered: number;
}

export interface CityRuntimeSnapshot {
	id: number;
	world_map_id: number;
	poi_id: number | null;
	name: string;
	world_q: number;
	world_r: number;
	layout_seed: number;
	generation_status: CityGenerationStatus;
	state: CityInstanceState;
}

export interface CampaignStateSnapshot {
	id: number;
	save_game_id: number;
	active_scene: SceneMode;
	active_city_instance_id: number | null;
	current_tick: number;
	last_synced_at: number;
}

export interface ResourceStateSnapshot {
	id: number;
	save_game_id: number;
	scrap_metal: number;
	e_waste: number;
	intact_components: number;
	last_synced_at: number;
}

export interface WorldEntitySnapshot {
	id: number;
	save_game_id: number;
	entity_id: string;
	scene_location: "world" | "interior";
	scene_building_id: string | null;
	faction: string;
	unit_type: string | null;
	building_type: string | null;
	display_name: string | null;
	fragment_id: string | null;
	x: number;
	y: number;
	z: number;
	speed: number | null;
	selected: number;
	components_json: string;
	navigation_json: string | null;
	ai_role: AgentRole | null;
	ai_state_json: string | null;
	powered: number | null;
	operational: number | null;
	rod_capacity: number | null;
	current_output: number | null;
	protection_radius: number | null;
}

export interface PersistableWorldEntity {
	entityId: string;
	sceneLocation: "world" | "interior";
	sceneBuildingId: string | null;
	faction: string;
	unitType: string | null;
	buildingType: string | null;
	displayName: string | null;
	fragmentId: string | null;
	x: number;
	y: number;
	z: number;
	speed: number | null;
	selected: boolean;
	components: UnitComponent[];
	navigation: {
		path: { q: number; r: number }[];
		pathIndex: number;
		moving: boolean;
	} | null;
	aiRole: AgentRole | null;
	aiStateJson: string | null;
	powered: boolean | null;
	operational: boolean | null;
	rodCapacity: number | null;
	currentOutput: number | null;
	protectionRadius: number | null;
}

export interface WorldSessionSnapshot {
	saveGame: SaveGameRecord;
	config: NewGameConfig;
	worldMap: WorldMapSnapshot;
	tiles: WorldTileSnapshot[];
	pointsOfInterest: PoiState[];
	cityInstances: CityRuntimeSnapshot[];
	campaignState: CampaignStateSnapshot;
	resourceState: ResourceStateSnapshot;
}

export interface PersistedWorldSnapshot extends WorldSessionSnapshot {
	entities: WorldEntitySnapshot[];
}

export interface NearbyPoiContext {
	cityInstanceId: number | null;
	discovered: boolean;
	distance: number;
	name: string;
	poiId: number;
	poiType: WorldPoiType;
}

export function toWorldSessionSnapshot(
	persistedWorld: PersistedWorldSnapshot,
): WorldSessionSnapshot {
	return {
		saveGame: persistedWorld.saveGame,
		config: persistedWorld.config,
		worldMap: persistedWorld.worldMap,
		tiles: persistedWorld.tiles,
		pointsOfInterest: persistedWorld.pointsOfInterest,
		cityInstances: persistedWorld.cityInstances,
		campaignState: persistedWorld.campaignState,
		resourceState: persistedWorld.resourceState,
	};
}

export function createResourcePoolFromSnapshot(
	resourceState: ResourceStateSnapshot,
): ResourcePool {
	return {
		scrapMetal: resourceState.scrap_metal,
		eWaste: resourceState.e_waste,
		intactComponents: resourceState.intact_components,
	};
}
