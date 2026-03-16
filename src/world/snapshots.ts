import type { AgentRole } from "../ai";
import type { BotArchetypeId, BotSpeechProfile, BotUnitType } from "../bots";
import type { SaveGameRecord } from "../db/saveGames";
import type { UnitComponent } from "../ecs/traits";
import { defaultResourcePool, type ResourcePool } from "../systems/resources";
import type { NewGameConfig } from "./config";
import type {
	CityGenerationStatus,
	CityInstanceState,
	WorldPoiType,
} from "./contracts";

export type SceneMode = "world" | "city";

export interface EcumenopolisSnapshot {
	id: number;
	save_game_id: number;
	width: number;
	height: number;
	sector_scale: string;
	climate_profile: NewGameConfig["climateProfile"];
	storm_profile: NewGameConfig["stormProfile"];
	spawn_sector_id: string;
	spawn_anchor_key: string;
	generated_at: number;
}

export interface SectorCellSnapshot {
	id: number;
	ecumenopolis_id: number;
	q: number;
	r: number;
	structural_zone: string;
	floor_preset_id: string;
	discovery_state: number;
	passable: number;
	sector_archetype: string;
	storm_exposure: "shielded" | "stressed" | "exposed";
	impassable_class: "none" | "breach" | "sealed_power" | "structural_void";
	anchor_key: string;
}

export interface SectorStructureSnapshot {
	id: number;
	ecumenopolis_id: number;
	district_structure_id: string;
	anchor_key: string;
	q: number;
	r: number;
	model_id: string;
	placement_layer: string;
	edge: string | null;
	rotation_quarter_turns: number;
	offset_x: number;
	offset_y: number;
	offset_z: number;
	target_span: number;
	sector_archetype: string;
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	controller_faction: string | null;
}

export interface SectorPoiSnapshot {
	id: number;
	ecumenopolis_id: number;
	type: WorldPoiType;
	name: string;
	q: number;
	r: number;
	discovered: number;
}

export interface CityRuntimeSnapshot {
	id: number;
	ecumenopolis_id: number;
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
	unit_type: BotUnitType | null;
	bot_archetype_id: BotArchetypeId | null;
	mark_level: number | null;
	speech_profile: BotSpeechProfile | null;
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
	unitType: BotUnitType | null;
	botArchetypeId: BotArchetypeId | null;
	markLevel: number | null;
	speechProfile: BotSpeechProfile | null;
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

export interface HarvestStateSnapshot {
	id: number;
	save_game_id: number;
	consumed_structure_ids_json: string;
	active_harvests_json: string;
	consumed_floor_tiles_json?: string;
	last_synced_at: number;
}

export interface TurnStateSnapshot {
	id: number;
	save_game_id: number;
	turn_number: number;
	phase: string;
	active_faction: string;
	unit_states_json: string;
	last_synced_at: number;
}

export interface FactionResourceStateSnapshot {
	id: number;
	save_game_id: number;
	faction_id: string;
	resources_json: string;
	last_synced_at: number;
}

export interface CampaignStatisticsSnapshot {
	id: number;
	save_game_id: number;
	stats_json: string;
	last_synced_at: number;
}

export interface TurnEventLogSnapshot {
	id: number;
	save_game_id: number;
	turn_number: number;
	events_json: string;
}

export interface WorldSessionSnapshot {
	saveGame: SaveGameRecord;
	config: NewGameConfig;
	ecumenopolis: EcumenopolisSnapshot;
	sectorCells: SectorCellSnapshot[];
	sectorStructures: SectorStructureSnapshot[];
	pointsOfInterest: SectorPoiSnapshot[];
	cityInstances: CityRuntimeSnapshot[];
	campaignState: CampaignStateSnapshot;
	resourceState: ResourceStateSnapshot;
}

export interface PersistedWorldSnapshot extends WorldSessionSnapshot {
	entities: WorldEntitySnapshot[];
	harvestState: HarvestStateSnapshot | null;
	turnState: TurnStateSnapshot | null;
	factionResourceStates: FactionResourceStateSnapshot[];
	campaignStatistics: CampaignStatisticsSnapshot | null;
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
		ecumenopolis: persistedWorld.ecumenopolis,
		sectorCells: persistedWorld.sectorCells,
		sectorStructures: persistedWorld.sectorStructures,
		pointsOfInterest: persistedWorld.pointsOfInterest,
		cityInstances: persistedWorld.cityInstances,
		campaignState: persistedWorld.campaignState,
		resourceState: persistedWorld.resourceState,
	};
}

export function createResourcePoolFromSnapshot(
	resourceState: ResourceStateSnapshot,
): ResourcePool {
	return defaultResourcePool({
		scrapMetal: resourceState.scrap_metal,
		eWaste: resourceState.e_waste,
		intactComponents: resourceState.intact_components,
	});
}
