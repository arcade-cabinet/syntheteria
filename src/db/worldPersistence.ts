import type { AgentRole } from "../ai";
import type { TerrainSetId } from "../config/terrainSetRules";
import type { Biome, FogState } from "../ecs/terrain";
import type { UnitComponent } from "../ecs/traits";
import type { ResourcePool } from "../systems/resources";
import type {
	ClimateProfile,
	NewGameConfig,
	StormProfile,
} from "../world/config";
import type { WorldPoiType } from "../world/contracts";
import type {
	GeneratedCityInstanceSeed,
	GeneratedWorldData,
	GeneratedWorldPointOfInterest,
	GeneratedWorldTile,
} from "../world/generation";
import type {
	CampaignStateSnapshot,
	CityRuntimeSnapshot,
	PersistableWorldEntity,
	PersistedWorldSnapshot,
	PoiState,
	ResourceStateSnapshot,
	WorldEntitySnapshot,
	WorldMapSnapshot,
	WorldSessionSnapshot,
	WorldTileSnapshot,
} from "../world/snapshots";
import { initializeDatabaseSync } from "./bootstrap";
import { getDatabaseSync, setDatabaseResolver } from "./runtime";
import type { SaveGameRecord } from "./saveGames";
import type { SyncDatabase } from "./types";
export type WorldMapRecord = WorldMapSnapshot;
export type WorldTileRecord = WorldTileSnapshot;
export type WorldPointOfInterestRecord = PoiState;
export type CityInstanceRecord = CityRuntimeSnapshot;
export type CampaignStateRecord = CampaignStateSnapshot;
export type ResourceStateRecord = ResourceStateSnapshot;
export type WorldEntityRecord = WorldEntitySnapshot;
export type PersistedWorldRecord = PersistedWorldSnapshot;
export type ActiveWorldRecord = WorldSessionSnapshot;

export function setWorldPersistenceDatabaseResolver(
	resolver: (() => SyncDatabase) | null,
) {
	setDatabaseResolver(resolver);
}

function selectWorldMapBySaveId(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<WorldMapRecord>(
		`
			SELECT
				id,
				save_game_id,
				width,
				height,
				map_size,
				climate_profile,
				storm_profile,
				spawn_q,
				spawn_r,
				generated_at
			FROM world_maps
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectWorldTiles(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<WorldTileRecord>(
		`
			SELECT
				id,
				world_map_id,
				q,
				r,
				biome,
				terrain_set_id,
				fog_state,
				passable
			FROM world_tiles
			WHERE world_map_id = ?
			ORDER BY r ASC, q ASC
		`,
		worldMapId,
	);
}

function selectPointsOfInterest(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<WorldPointOfInterestRecord>(
		`
			SELECT
				id,
				world_map_id,
				type,
				name,
				q,
				r,
				discovered
			FROM world_points_of_interest
			WHERE world_map_id = ?
			ORDER BY id ASC
		`,
		worldMapId,
	);
}

function selectCityInstances(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<CityInstanceRecord>(
		`
			SELECT
				id,
				world_map_id,
				poi_id,
				name,
				world_q,
				world_r,
				layout_seed,
				generation_status,
				state
			FROM city_instances
			WHERE world_map_id = ?
			ORDER BY id ASC
		`,
		worldMapId,
	);
}

function selectCampaignState(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<CampaignStateRecord>(
		`
			SELECT
				id,
				save_game_id,
				active_scene,
				active_city_instance_id,
				current_tick,
				last_synced_at
			FROM campaign_states
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectResourceState(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<ResourceStateRecord>(
		`
			SELECT
				id,
				save_game_id,
				scrap_metal,
				e_waste,
				intact_components,
				last_synced_at
			FROM resource_states
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectWorldEntities(database: SyncDatabase, saveGameId: number) {
	return database.getAllSync<WorldEntityRecord>(
		`
			SELECT
				id,
				save_game_id,
				entity_id,
				scene_location,
				scene_building_id,
				faction,
				unit_type,
				building_type,
				display_name,
				fragment_id,
				x,
				y,
				z,
				speed,
				selected,
				components_json,
				navigation_json,
				ai_role,
				ai_state_json,
				powered,
				operational,
				rod_capacity,
				current_output,
				protection_radius
			FROM world_entities
			WHERE save_game_id = ?
			ORDER BY id ASC
		`,
		saveGameId,
	);
}

export function persistGeneratedWorldSync(
	saveGame: SaveGameRecord,
	config: NewGameConfig,
	generatedWorld: GeneratedWorldData,
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();

	database.runSync(
		"DELETE FROM city_instances WHERE world_map_id IN (SELECT id FROM world_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_points_of_interest WHERE world_map_id IN (SELECT id FROM world_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_tiles WHERE world_map_id IN (SELECT id FROM world_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_entities WHERE save_game_id = ?",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_maps WHERE save_game_id = ?",
		saveGame.id,
	);

	const worldMapInsert = database.runSync(
		`
			INSERT INTO world_maps (
				save_game_id,
				width,
				height,
				map_size,
				climate_profile,
				storm_profile,
				spawn_q,
				spawn_r,
				generated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		saveGame.id,
		generatedWorld.map.width,
		generatedWorld.map.height,
		config.mapSize,
		config.climateProfile,
		config.stormProfile,
		generatedWorld.map.spawnQ,
		generatedWorld.map.spawnR,
		now,
	);

	const worldMapId = worldMapInsert.lastInsertRowId;

	for (const tile of generatedWorld.tiles) {
		insertWorldTile(database, worldMapId, tile);
	}

	const poiIds = new Map<WorldPoiType, number>();
	for (const poi of generatedWorld.pointsOfInterest) {
		const insert = insertWorldPointOfInterest(database, worldMapId, poi);
		poiIds.set(poi.type, insert.lastInsertRowId);
	}

	for (const city of generatedWorld.cityInstances) {
		insertCityInstance(
			database,
			worldMapId,
			poiIds.get(city.poiType) ?? null,
			city,
		);
	}

	ensureCampaignStateSync(saveGame.id, database, now);
	ensureResourceStateSync(saveGame.id, database, now);
	persistWorldEntitiesSync(
		saveGame.id,
		createInitialWorldEntities(generatedWorld),
		database,
	);

	return selectWorldMapBySaveId(database, saveGame.id);
}

function ensureCampaignStateSync(
	saveGameId: number,
	database: SyncDatabase,
	now: number,
) {
	const existing = selectCampaignState(database, saveGameId);
	if (existing) {
		return existing;
	}

	const result = database.runSync(
		`
			INSERT INTO campaign_states (
				save_game_id,
				active_scene,
				active_city_instance_id,
				current_tick,
				last_synced_at
			)
			VALUES (?, 'world', NULL, 0, ?)
		`,
		saveGameId,
		now,
	);

	return database.getFirstSync<CampaignStateRecord>(
		"SELECT id, save_game_id, active_scene, active_city_instance_id, current_tick, last_synced_at FROM campaign_states WHERE id = ?",
		result.lastInsertRowId,
	);
}

function ensureResourceStateSync(
	saveGameId: number,
	database: SyncDatabase,
	now: number,
) {
	const existing = selectResourceState(database, saveGameId);
	if (existing) {
		return existing;
	}

	const result = database.runSync(
		`
			INSERT INTO resource_states (
				save_game_id,
				scrap_metal,
				e_waste,
				intact_components,
				last_synced_at
			)
			VALUES (?, 0, 0, 0, ?)
		`,
		saveGameId,
		now,
	);

	return database.getFirstSync<ResourceStateRecord>(
		"SELECT id, save_game_id, scrap_metal, e_waste, intact_components, last_synced_at FROM resource_states WHERE id = ?",
		result.lastInsertRowId,
	);
}

function createInitialWorldEntities(
	generatedWorld: GeneratedWorldData,
): PersistableWorldEntity[] {
	return [
		{
			entityId: "unit_0",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: "maintenance_bot",
			buildingType: null,
			displayName: "Maintenance Bot",
			fragmentId: "world_primary",
			x: generatedWorld.map.spawnQ,
			y: 0,
			z: generatedWorld.map.spawnR,
			speed: 2,
			selected: false,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
			navigation: { path: [], pathIndex: 0, moving: false },
			aiRole: null,
			aiStateJson: null,
			powered: null,
			operational: null,
			rodCapacity: null,
			currentOutput: null,
			protectionRadius: null,
		},
		{
			entityId: "bldg_1",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: null,
			buildingType: "lightning_rod",
			displayName: "Lightning Rod",
			fragmentId: "world_primary",
			x: generatedWorld.map.spawnQ + 2,
			y: 0,
			z: generatedWorld.map.spawnR + 2,
			speed: null,
			selected: false,
			components: [],
			navigation: null,
			aiRole: null,
			aiStateJson: null,
			powered: true,
			operational: true,
			rodCapacity: 12,
			currentOutput: 4,
			protectionRadius: 8,
		},
	];
}

function insertWorldEntity(
	database: SyncDatabase,
	saveGameId: number,
	entity: PersistableWorldEntity,
) {
	return database.runSync(
		`
			INSERT INTO world_entities (
				save_game_id,
				entity_id,
				scene_location,
				scene_building_id,
				faction,
				unit_type,
				building_type,
				display_name,
				fragment_id,
				x,
				y,
				z,
				speed,
				selected,
				components_json,
				navigation_json,
				ai_role,
				ai_state_json,
				powered,
				operational,
				rod_capacity,
				current_output,
				protection_radius
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		saveGameId,
		entity.entityId,
		entity.sceneLocation,
		entity.sceneBuildingId,
		entity.faction,
		entity.unitType,
		entity.buildingType,
		entity.displayName,
		entity.fragmentId,
		entity.x,
		entity.y,
		entity.z,
		entity.speed,
		entity.selected ? 1 : 0,
		JSON.stringify(entity.components),
		entity.navigation ? JSON.stringify(entity.navigation) : null,
		entity.aiRole,
		entity.aiStateJson,
		entity.powered == null ? null : entity.powered ? 1 : 0,
		entity.operational == null ? null : entity.operational ? 1 : 0,
		entity.rodCapacity,
		entity.currentOutput,
		entity.protectionRadius,
	);
}

function persistWorldEntitiesSync(
	saveGameId: number,
	entities: PersistableWorldEntity[],
	database: SyncDatabase,
) {
	database.runSync(
		"DELETE FROM world_entities WHERE save_game_id = ?",
		saveGameId,
	);
	for (const entity of entities) {
		insertWorldEntity(database, saveGameId, entity);
	}
}

function insertWorldTile(
	database: SyncDatabase,
	worldMapId: number,
	tile: GeneratedWorldTile,
) {
	return database.runSync(
		`
			INSERT INTO world_tiles (
				world_map_id,
				q,
				r,
				biome,
				terrain_set_id,
				fog_state,
				passable
			)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
		worldMapId,
		tile.q,
		tile.r,
		tile.biome,
		tile.terrainSetId,
		tile.fog,
		tile.passable ? 1 : 0,
	);
}

function insertWorldPointOfInterest(
	database: SyncDatabase,
	worldMapId: number,
	poi: GeneratedWorldPointOfInterest,
) {
	return database.runSync(
		`
			INSERT INTO world_points_of_interest (
				world_map_id,
				type,
				name,
				q,
				r,
				discovered
			)
			VALUES (?, ?, ?, ?, ?, ?)
		`,
		worldMapId,
		poi.type,
		poi.name,
		poi.q,
		poi.r,
		poi.discovered ? 1 : 0,
	);
}

function insertCityInstance(
	database: SyncDatabase,
	worldMapId: number,
	poiId: number | null,
	city: GeneratedCityInstanceSeed,
) {
	return database.runSync(
		`
			INSERT INTO city_instances (
				world_map_id,
				poi_id,
				name,
				world_q,
				world_r,
				layout_seed,
				generation_status,
				state
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`,
		worldMapId,
		poiId,
		city.name,
		city.worldQ,
		city.worldR,
		city.layoutSeed,
		city.generationStatus,
		city.state,
	);
}

export function getPersistedWorldSync(
	saveGame: SaveGameRecord,
	database: SyncDatabase = getDatabaseSync(),
): PersistedWorldRecord {
	initializeDatabaseSync(database);
	const worldMap = selectWorldMapBySaveId(database, saveGame.id);

	if (!worldMap) {
		throw new Error(`No world map exists for save ${saveGame.id}.`);
	}

	return {
		saveGame,
		config: {
			worldSeed: saveGame.world_seed,
			mapSize: saveGame.map_size as NewGameConfig["mapSize"],
			difficulty: saveGame.difficulty as NewGameConfig["difficulty"],
			climateProfile: saveGame.climate_profile as ClimateProfile,
			stormProfile: saveGame.storm_profile as StormProfile,
		},
		worldMap,
		tiles: selectWorldTiles(database, worldMap.id),
		pointsOfInterest: selectPointsOfInterest(database, worldMap.id),
		cityInstances: selectCityInstances(database, worldMap.id),
		campaignState:
			selectCampaignState(database, saveGame.id) ??
			ensureCampaignStateSync(saveGame.id, database, Date.now())!,
		resourceState:
			selectResourceState(database, saveGame.id) ??
			ensureResourceStateSync(saveGame.id, database, Date.now())!,
		entities: selectWorldEntities(database, saveGame.id),
	};
}

export function persistRuntimeWorldStateSync(
	{
		saveGameId,
		worldMapId,
		tick,
		activeScene,
		activeCityInstanceId,
		resources,
		tiles,
		pointsOfInterest,
		cityInstances,
		entities,
	}: {
		saveGameId: number;
		worldMapId: number;
		tick: number;
		activeScene: "world" | "city";
		activeCityInstanceId: number | null;
		resources: ResourcePool;
		tiles: Pick<WorldTileRecord, "q" | "r" | "fog_state">[];
		pointsOfInterest: Pick<WorldPointOfInterestRecord, "id" | "discovered">[];
		cityInstances: Pick<CityInstanceRecord, "id" | "state">[];
		entities: PersistableWorldEntity[];
	},
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();

	database.runSync(
		`
			UPDATE campaign_states
			SET active_scene = ?, active_city_instance_id = ?, current_tick = ?, last_synced_at = ?
			WHERE save_game_id = ?
		`,
		activeScene,
		activeCityInstanceId,
		tick,
		now,
		saveGameId,
	);

	database.runSync(
		`
			UPDATE resource_states
			SET scrap_metal = ?, e_waste = ?, intact_components = ?, last_synced_at = ?
			WHERE save_game_id = ?
		`,
		resources.scrapMetal,
		resources.eWaste,
		resources.intactComponents,
		now,
		saveGameId,
	);

	for (const tile of tiles) {
		database.runSync(
			"UPDATE world_tiles SET fog_state = ? WHERE world_map_id = ? AND q = ? AND r = ?",
			tile.fog_state,
			worldMapId,
			tile.q,
			tile.r,
		);
	}

	for (const poi of pointsOfInterest) {
		database.runSync(
			"UPDATE world_points_of_interest SET discovered = ? WHERE id = ?",
			poi.discovered,
			poi.id,
		);
	}

	for (const city of cityInstances) {
		database.runSync(
			"UPDATE city_instances SET state = ? WHERE id = ?",
			city.state,
			city.id,
		);
	}

	persistWorldEntitiesSync(saveGameId, entities, database);
}
