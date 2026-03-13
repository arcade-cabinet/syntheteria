import type { AgentRole } from "../ai";
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
	GeneratedEcumenopolisData,
	GeneratedSectorCell,
	GeneratedSectorPointOfInterest,
} from "../world/generation";
import type { GeneratedSectorStructure } from "../world/sectorStructurePlan";
import type {
	CampaignStateSnapshot,
	CampaignStatisticsSnapshot,
	CityRuntimeSnapshot,
	EcumenopolisSnapshot,
	FactionResourceStateSnapshot,
	HarvestStateSnapshot,
	PersistableWorldEntity,
	PersistedWorldSnapshot,
	ResourceStateSnapshot,
	SectorCellSnapshot,
	SectorPoiSnapshot,
	SectorStructureSnapshot,
	TurnEventLogSnapshot,
	TurnStateSnapshot,
	WorldEntitySnapshot,
	WorldSessionSnapshot,
} from "../world/snapshots";
import { createInitialCampaignEntities } from "../world/startingForces";
import { initializeDatabaseSync } from "./bootstrap";
import { FakeDatabase } from "./fallbackDatabase";
import { getDatabaseSync, setDatabaseResolver } from "./runtime";
import type { SaveGameRecord } from "./saveGames";
import type { SyncDatabase } from "./types";
export type EcumenopolisRecord = EcumenopolisSnapshot;
export type SectorCellRecord = SectorCellSnapshot;
export type SectorStructureRecord = SectorStructureSnapshot;
export type WorldPointOfInterestRecord = SectorPoiSnapshot;
export type CityInstanceRecord = CityRuntimeSnapshot;
export type CampaignStateRecord = CampaignStateSnapshot;
export type ResourceStateRecord = ResourceStateSnapshot;
export type WorldEntityRecord = WorldEntitySnapshot;
export type HarvestStateRecord = HarvestStateSnapshot;
export type TurnStateRecord = TurnStateSnapshot;
export type FactionResourceStateRecord = FactionResourceStateSnapshot;
export type CampaignStatisticsRecord = CampaignStatisticsSnapshot;
export type TurnEventLogRecord = TurnEventLogSnapshot;
export type PersistedWorldRecord = PersistedWorldSnapshot;
export type ActiveWorldRecord = WorldSessionSnapshot;

function persistFallbackDatabase(database: SyncDatabase) {
	if (database instanceof FakeDatabase) {
		database.persistToStorage();
	}
}

export function setWorldPersistenceDatabaseResolver(
	resolver: (() => SyncDatabase) | null,
) {
	setDatabaseResolver(resolver);
}

function selectWorldMapBySaveId(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<EcumenopolisRecord>(
		`
			SELECT
				id,
				save_game_id,
				width,
				height,
				sector_scale,
				climate_profile,
				storm_profile,
				spawn_sector_id,
				spawn_anchor_key,
				generated_at
			FROM ecumenopolis_maps
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectWorldTiles(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<SectorCellRecord>(
		`
			SELECT
				id,
				ecumenopolis_id,
				q,
				r,
				structural_zone,
				floor_preset_id,
				discovery_state,
				passable,
				sector_archetype,
				storm_exposure,
				impassable_class,
				anchor_key
			FROM sector_cells
			WHERE ecumenopolis_id = ?
			ORDER BY r ASC, q ASC
		`,
		worldMapId,
	);
}

function selectSectorStructures(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<SectorStructureRecord>(
		`
			SELECT
				id,
				ecumenopolis_id,
				district_structure_id,
				anchor_key,
				q,
				r,
				model_id,
				placement_layer,
				edge,
				rotation_quarter_turns,
				offset_x,
				offset_y,
				offset_z,
				target_span,
				sector_archetype,
				source,
				controller_faction
			FROM sector_structures
			WHERE ecumenopolis_id = ?
			ORDER BY q ASC, r ASC, id ASC
		`,
		worldMapId,
	);
}

function selectPointsOfInterest(database: SyncDatabase, worldMapId: number) {
	return database.getAllSync<WorldPointOfInterestRecord>(
		`
			SELECT
				id,
				ecumenopolis_id,
				type,
				name,
				q,
				r,
				discovered
			FROM world_points_of_interest
			WHERE ecumenopolis_id = ?
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
				ecumenopolis_id,
				poi_id,
				name,
				world_q,
				world_r,
				layout_seed,
				generation_status,
				state
			FROM city_instances
			WHERE ecumenopolis_id = ?
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

function selectHarvestState(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<HarvestStateRecord>(
		`
			SELECT
				id,
				save_game_id,
				consumed_structure_ids_json,
				active_harvests_json,
				last_synced_at
			FROM harvest_states
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectTurnState(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<TurnStateRecord>(
		`
			SELECT
				id,
				save_game_id,
				turn_number,
				phase,
				active_faction,
				unit_states_json,
				last_synced_at
			FROM turn_states
			WHERE save_game_id = ?
		`,
		saveGameId,
	);
}

function selectFactionResourceStates(
	database: SyncDatabase,
	saveGameId: number,
) {
	return database.getAllSync<FactionResourceStateRecord>(
		`
			SELECT
				id,
				save_game_id,
				faction_id,
				resources_json,
				last_synced_at
			FROM faction_resource_states
			WHERE save_game_id = ?
			ORDER BY faction_id ASC
		`,
		saveGameId,
	);
}

function selectCampaignStatistics(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<CampaignStatisticsRecord>(
		`
			SELECT
				id,
				save_game_id,
				stats_json,
				last_synced_at
			FROM campaign_statistics
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
				bot_archetype_id,
				mark_level,
				speech_profile,
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
	generatedWorld: GeneratedEcumenopolisData,
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();

	database.runSync(
		"DELETE FROM sector_structures WHERE ecumenopolis_id IN (SELECT id FROM ecumenopolis_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM city_instances WHERE ecumenopolis_id IN (SELECT id FROM ecumenopolis_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_points_of_interest WHERE ecumenopolis_id IN (SELECT id FROM ecumenopolis_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM sector_cells WHERE ecumenopolis_id IN (SELECT id FROM ecumenopolis_maps WHERE save_game_id = ?)",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM world_entities WHERE save_game_id = ?",
		saveGame.id,
	);
	database.runSync(
		"DELETE FROM ecumenopolis_maps WHERE save_game_id = ?",
		saveGame.id,
	);

	const worldMapInsert = database.runSync(
		`
			INSERT INTO ecumenopolis_maps (
				save_game_id,
				width,
				height,
				sector_scale,
				climate_profile,
				storm_profile,
				spawn_sector_id,
				spawn_anchor_key,
				generated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		saveGame.id,
		generatedWorld.ecumenopolis.width,
		generatedWorld.ecumenopolis.height,
		config.sectorScale,
		config.climateProfile,
		config.stormProfile,
		generatedWorld.ecumenopolis.spawnSectorId,
		generatedWorld.ecumenopolis.spawnAnchorKey,
		now,
	);

	const worldMapId = worldMapInsert.lastInsertRowId;

	for (const tile of generatedWorld.sectorCells) {
		insertWorldTile(database, worldMapId, tile);
	}

	for (const structure of generatedWorld.sectorStructures) {
		insertSectorStructure(database, worldMapId, structure);
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
		createInitialCampaignEntities(generatedWorld),
		database,
	);
	persistFallbackDatabase(database);

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
				bot_archetype_id,
				mark_level,
				speech_profile,
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
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		saveGameId,
		entity.entityId,
		entity.sceneLocation,
		entity.sceneBuildingId,
		entity.faction,
		entity.unitType,
		entity.botArchetypeId,
		entity.markLevel,
		entity.speechProfile,
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
	tile: GeneratedSectorCell,
) {
	return database.runSync(
		`
			INSERT INTO sector_cells (
				ecumenopolis_id,
				q,
				r,
				structural_zone,
				floor_preset_id,
				discovery_state,
				passable,
				sector_archetype,
				storm_exposure,
				impassable_class,
				anchor_key
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		worldMapId,
		tile.q,
		tile.r,
		tile.structuralZone,
		tile.floorPresetId,
		tile.discoveryState,
		tile.passable ? 1 : 0,
		tile.sectorArchetype,
		tile.stormExposure,
		tile.impassableClass,
		tile.anchorKey,
	);
}

function insertSectorStructure(
	database: SyncDatabase,
	worldMapId: number,
	structure: GeneratedSectorStructure,
) {
	return database.runSync(
		`
			INSERT INTO sector_structures (
				ecumenopolis_id,
				district_structure_id,
				anchor_key,
				q,
				r,
				model_id,
				placement_layer,
				edge,
				rotation_quarter_turns,
				offset_x,
				offset_y,
				offset_z,
				target_span,
				sector_archetype,
				source,
				controller_faction
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		worldMapId,
		structure.districtStructureId,
		structure.anchorKey,
		structure.q,
		structure.r,
		structure.modelId,
		structure.placementLayer,
		structure.edge,
		structure.rotationQuarterTurns,
		structure.offsetX,
		structure.offsetY,
		structure.offsetZ,
		structure.targetSpan,
		structure.sectorArchetype,
		structure.source,
		structure.controllerFaction,
	);
}

function insertWorldPointOfInterest(
	database: SyncDatabase,
	worldMapId: number,
	poi: GeneratedSectorPointOfInterest,
) {
	return database.runSync(
		`
			INSERT INTO world_points_of_interest (
				ecumenopolis_id,
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
				ecumenopolis_id,
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
			sectorScale: saveGame.sector_scale as NewGameConfig["sectorScale"],
			difficulty: saveGame.difficulty as NewGameConfig["difficulty"],
			climateProfile: saveGame.climate_profile as ClimateProfile,
			stormProfile: saveGame.storm_profile as StormProfile,
		},
		ecumenopolis: worldMap,
		sectorCells: selectWorldTiles(database, worldMap.id),
		sectorStructures: selectSectorStructures(database, worldMap.id),
		pointsOfInterest: selectPointsOfInterest(database, worldMap.id),
		cityInstances: selectCityInstances(database, worldMap.id),
		campaignState:
			selectCampaignState(database, saveGame.id) ??
			ensureCampaignStateSync(saveGame.id, database, Date.now())!,
		resourceState:
			selectResourceState(database, saveGame.id) ??
			ensureResourceStateSync(saveGame.id, database, Date.now())!,
		entities: selectWorldEntities(database, saveGame.id),
		harvestState: selectHarvestState(database, saveGame.id),
		turnState: selectTurnState(database, saveGame.id),
		factionResourceStates: selectFactionResourceStates(database, saveGame.id),
		campaignStatistics: selectCampaignStatistics(database, saveGame.id),
	};
}

export function persistRuntimeWorldStateSync(
	{
		saveGameId,
		ecumenopolisId,
		tick,
		activeScene,
		activeCityInstanceId,
		resources,
		sectorCells,
		pointsOfInterest,
		cityInstances,
		entities,
	}: {
		saveGameId: number;
		ecumenopolisId: number;
		tick: number;
		activeScene: "world" | "city";
		activeCityInstanceId: number | null;
		resources: ResourcePool;
		sectorCells: Pick<SectorCellRecord, "q" | "r" | "discovery_state">[];
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

	for (const tile of sectorCells) {
		database.runSync(
			"UPDATE sector_cells SET discovery_state = ? WHERE ecumenopolis_id = ? AND q = ? AND r = ?",
			tile.discovery_state,
			ecumenopolisId,
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
	persistFallbackDatabase(database);
}

export function persistHarvestStateSync(
	saveGameId: number,
	consumedStructureIds: number[],
	activeHarvests: unknown[],
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();
	const consumedJson = JSON.stringify(consumedStructureIds);
	const harvestsJson = JSON.stringify(activeHarvests);

	const existing = selectHarvestState(database, saveGameId);
	if (existing) {
		database.runSync(
			`
				UPDATE harvest_states
				SET consumed_structure_ids_json = ?, active_harvests_json = ?, last_synced_at = ?
				WHERE save_game_id = ?
			`,
			consumedJson,
			harvestsJson,
			now,
			saveGameId,
		);
	} else {
		database.runSync(
			`
				INSERT INTO harvest_states (
					save_game_id, consumed_structure_ids_json, active_harvests_json, last_synced_at
				) VALUES (?, ?, ?, ?)
			`,
			saveGameId,
			consumedJson,
			harvestsJson,
			now,
		);
	}
	persistFallbackDatabase(database);
}

export function persistTurnStateSync(
	saveGameId: number,
	turnNumber: number,
	phase: string,
	activeFaction: string,
	unitStates: unknown[],
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();
	const unitStatesJson = JSON.stringify(unitStates);

	const existing = selectTurnState(database, saveGameId);
	if (existing) {
		database.runSync(
			`
				UPDATE turn_states
				SET turn_number = ?, phase = ?, active_faction = ?, unit_states_json = ?, last_synced_at = ?
				WHERE save_game_id = ?
			`,
			turnNumber,
			phase,
			activeFaction,
			unitStatesJson,
			now,
			saveGameId,
		);
	} else {
		database.runSync(
			`
				INSERT INTO turn_states (
					save_game_id, turn_number, phase, active_faction, unit_states_json, last_synced_at
				) VALUES (?, ?, ?, ?, ?, ?)
			`,
			saveGameId,
			turnNumber,
			phase,
			activeFaction,
			unitStatesJson,
			now,
		);
	}
	persistFallbackDatabase(database);
}

export function persistFactionResourceStatesSync(
	saveGameId: number,
	factionResources: Array<{
		factionId: string;
		resources: Record<string, number>;
	}>,
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();

	database.runSync(
		"DELETE FROM faction_resource_states WHERE save_game_id = ?",
		saveGameId,
	);
	for (const entry of factionResources) {
		database.runSync(
			`
				INSERT INTO faction_resource_states (
					save_game_id, faction_id, resources_json, last_synced_at
				) VALUES (?, ?, ?, ?)
			`,
			saveGameId,
			entry.factionId,
			JSON.stringify(entry.resources),
			now,
		);
	}
	persistFallbackDatabase(database);
}

export function persistCampaignStatisticsSync(
	saveGameId: number,
	stats: Record<string, unknown>,
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();
	const statsJson = JSON.stringify(stats);

	const existing = selectCampaignStatistics(database, saveGameId);
	if (existing) {
		database.runSync(
			`
				UPDATE campaign_statistics
				SET stats_json = ?, last_synced_at = ?
				WHERE save_game_id = ?
			`,
			statsJson,
			now,
			saveGameId,
		);
	} else {
		database.runSync(
			`
				INSERT INTO campaign_statistics (
					save_game_id, stats_json, last_synced_at
				) VALUES (?, ?, ?)
			`,
			saveGameId,
			statsJson,
			now,
		);
	}
	persistFallbackDatabase(database);
}

export function persistTurnEventLogSync(
	saveGameId: number,
	turnNumber: number,
	events: unknown[],
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	database.runSync(
		`
			INSERT INTO turn_event_logs (
				save_game_id, turn_number, events_json
			) VALUES (?, ?, ?)
		`,
		saveGameId,
		turnNumber,
		JSON.stringify(events),
	);
	persistFallbackDatabase(database);
}
