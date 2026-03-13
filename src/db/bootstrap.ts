import { getDatabaseSync } from "./runtime";
import type { SyncDatabase } from "./types";

const initializedDatabases = new WeakSet<object>();

function hasColumn(
	database: SyncDatabase,
	tableName: string,
	columnName: string,
) {
	const columns = database.getAllSync<{ name: string }>(
		`PRAGMA table_info(${tableName})`,
	);
	return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(
	database: SyncDatabase,
	tableName: string,
	columnName: string,
	columnDefinition: string,
) {
	if (!hasColumn(database, tableName, columnName)) {
		database.execSync(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`,
		);
	}
}

export function initializeDatabaseSync(
	database: SyncDatabase = getDatabaseSync(),
) {
	if (initializedDatabases.has(database as object)) {
		return;
	}

	database.execSync(`
		PRAGMA journal_mode = WAL;

		CREATE TABLE IF NOT EXISTS save_games (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			name TEXT NOT NULL,
			world_seed INTEGER NOT NULL DEFAULT 42,
			sector_scale TEXT NOT NULL DEFAULT 'standard',
			difficulty TEXT NOT NULL DEFAULT 'standard',
			climate_profile TEXT NOT NULL DEFAULT 'temperate',
			storm_profile TEXT NOT NULL DEFAULT 'volatile',
			created_at INTEGER NOT NULL,
			last_played_at INTEGER NOT NULL,
			playtime_seconds INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS ecumenopolis_maps (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			width INTEGER NOT NULL,
			height INTEGER NOT NULL,
			sector_scale TEXT NOT NULL,
			climate_profile TEXT NOT NULL,
			storm_profile TEXT NOT NULL,
			spawn_sector_id TEXT NOT NULL,
			spawn_anchor_key TEXT NOT NULL,
			generated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS sector_cells (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			ecumenopolis_id INTEGER NOT NULL REFERENCES ecumenopolis_maps(id) ON DELETE CASCADE,
			q INTEGER NOT NULL,
			r INTEGER NOT NULL,
			structural_zone TEXT NOT NULL,
			floor_preset_id TEXT NOT NULL,
			discovery_state INTEGER NOT NULL DEFAULT 0,
			passable INTEGER NOT NULL DEFAULT 1,
			sector_archetype TEXT NOT NULL DEFAULT 'service_plate',
			storm_exposure TEXT NOT NULL DEFAULT 'shielded',
			impassable_class TEXT NOT NULL DEFAULT 'none',
			anchor_key TEXT NOT NULL DEFAULT '0,0'
		);

		CREATE TABLE IF NOT EXISTS sector_structures (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			ecumenopolis_id INTEGER NOT NULL REFERENCES ecumenopolis_maps(id) ON DELETE CASCADE,
			district_structure_id TEXT NOT NULL,
			anchor_key TEXT NOT NULL,
			q INTEGER NOT NULL,
			r INTEGER NOT NULL,
			model_id TEXT NOT NULL,
			placement_layer TEXT NOT NULL,
			edge TEXT,
			rotation_quarter_turns INTEGER NOT NULL DEFAULT 0,
			offset_x REAL NOT NULL DEFAULT 0,
			offset_y REAL NOT NULL DEFAULT 0,
			offset_z REAL NOT NULL DEFAULT 0,
			target_span REAL NOT NULL DEFAULT 1,
			sector_archetype TEXT NOT NULL DEFAULT 'service_plate',
			source TEXT NOT NULL DEFAULT 'seeded_district',
			controller_faction TEXT
		);

		CREATE TABLE IF NOT EXISTS world_points_of_interest (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			ecumenopolis_id INTEGER NOT NULL REFERENCES ecumenopolis_maps(id) ON DELETE CASCADE,
			type TEXT NOT NULL,
			name TEXT NOT NULL,
			q INTEGER NOT NULL,
			r INTEGER NOT NULL,
			discovered INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS city_instances (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			ecumenopolis_id INTEGER NOT NULL REFERENCES ecumenopolis_maps(id) ON DELETE CASCADE,
			poi_id INTEGER REFERENCES world_points_of_interest(id) ON DELETE SET NULL,
			name TEXT NOT NULL,
			world_q INTEGER NOT NULL,
			world_r INTEGER NOT NULL,
			layout_seed INTEGER NOT NULL,
			generation_status TEXT NOT NULL DEFAULT 'reserved',
			state TEXT NOT NULL DEFAULT 'latent'
		);

		CREATE TABLE IF NOT EXISTS world_entities (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			entity_id TEXT NOT NULL,
			scene_location TEXT NOT NULL DEFAULT 'world',
			scene_building_id TEXT,
			faction TEXT NOT NULL,
			unit_type TEXT,
			bot_archetype_id TEXT,
			mark_level INTEGER,
			speech_profile TEXT,
			building_type TEXT,
			display_name TEXT,
			fragment_id TEXT,
			x REAL NOT NULL,
			y REAL NOT NULL,
			z REAL NOT NULL,
			speed REAL,
			selected INTEGER NOT NULL DEFAULT 0,
			components_json TEXT NOT NULL DEFAULT '[]',
			navigation_json TEXT,
			ai_role TEXT,
			ai_state_json TEXT,
			powered INTEGER,
			operational INTEGER,
			rod_capacity REAL,
			current_output REAL,
			protection_radius REAL
		);

		CREATE TABLE IF NOT EXISTS campaign_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			active_scene TEXT NOT NULL DEFAULT 'world',
			active_city_instance_id INTEGER REFERENCES city_instances(id) ON DELETE SET NULL,
			current_tick INTEGER NOT NULL DEFAULT 0,
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS resource_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			scrap_metal INTEGER NOT NULL DEFAULT 0,
			e_waste INTEGER NOT NULL DEFAULT 0,
			intact_components INTEGER NOT NULL DEFAULT 0,
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS unlocked_techniques (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER REFERENCES save_games(id) ON DELETE CASCADE,
			technique_id TEXT NOT NULL,
			unlocked_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS map_discovery (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER REFERENCES save_games(id) ON DELETE CASCADE,
			chunk_x INTEGER NOT NULL,
			chunk_y INTEGER NOT NULL,
			discovered_state TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS harvest_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			consumed_structure_ids_json TEXT NOT NULL DEFAULT '[]',
			active_harvests_json TEXT NOT NULL DEFAULT '[]',
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS turn_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			turn_number INTEGER NOT NULL DEFAULT 1,
			phase TEXT NOT NULL DEFAULT 'player',
			active_faction TEXT NOT NULL DEFAULT 'player',
			unit_states_json TEXT NOT NULL DEFAULT '[]',
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS faction_resource_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			faction_id TEXT NOT NULL,
			resources_json TEXT NOT NULL DEFAULT '{}',
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS campaign_statistics (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			stats_json TEXT NOT NULL DEFAULT '{}',
			last_synced_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS turn_event_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			save_game_id INTEGER NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
			turn_number INTEGER NOT NULL,
			events_json TEXT NOT NULL DEFAULT '[]'
		);
	`);

	addColumnIfMissing(
		database,
		"sector_cells",
		"sector_archetype",
		"TEXT NOT NULL DEFAULT 'service_plate'",
	);
	addColumnIfMissing(
		database,
		"sector_cells",
		"storm_exposure",
		"TEXT NOT NULL DEFAULT 'shielded'",
	);
	addColumnIfMissing(
		database,
		"sector_cells",
		"impassable_class",
		"TEXT NOT NULL DEFAULT 'none'",
	);
	addColumnIfMissing(
		database,
		"sector_cells",
		"anchor_key",
		"TEXT NOT NULL DEFAULT '0,0'",
	);
	addColumnIfMissing(
		database,
		"save_games",
		"world_seed",
		"INTEGER NOT NULL DEFAULT 42",
	);
	addColumnIfMissing(
		database,
		"save_games",
		"sector_scale",
		"TEXT NOT NULL DEFAULT 'standard'",
	);
	if (hasColumn(database, "save_games", "map_size")) {
		database.execSync(
			"UPDATE save_games SET sector_scale = COALESCE(sector_scale, map_size);",
		);
	}
	addColumnIfMissing(
		database,
		"save_games",
		"difficulty",
		"TEXT NOT NULL DEFAULT 'standard'",
	);
	addColumnIfMissing(
		database,
		"save_games",
		"climate_profile",
		"TEXT NOT NULL DEFAULT 'temperate'",
	);
	addColumnIfMissing(
		database,
		"sector_structures",
		"district_structure_id",
		"TEXT NOT NULL DEFAULT 'substation_core'",
	);
	addColumnIfMissing(
		database,
		"sector_structures",
		"controller_faction",
		"TEXT",
	);
	addColumnIfMissing(
		database,
		"save_games",
		"storm_profile",
		"TEXT NOT NULL DEFAULT 'volatile'",
	);
	addColumnIfMissing(
		database,
		"save_games",
		"created_at",
		"INTEGER NOT NULL DEFAULT 0",
	);
	addColumnIfMissing(
		database,
		"ecumenopolis_maps",
		"sector_scale",
		"TEXT NOT NULL DEFAULT 'standard'",
	);
	if (hasColumn(database, "ecumenopolis_maps", "map_size")) {
		database.execSync(
			"UPDATE ecumenopolis_maps SET sector_scale = COALESCE(sector_scale, map_size);",
		);
	}
	addColumnIfMissing(
		database,
		"world_entities",
		"scene_location",
		"TEXT NOT NULL DEFAULT 'world'",
	);
	addColumnIfMissing(database, "world_entities", "scene_building_id", "TEXT");
	addColumnIfMissing(
		database,
		"world_entities",
		"faction",
		"TEXT NOT NULL DEFAULT 'player'",
	);
	addColumnIfMissing(database, "world_entities", "unit_type", "TEXT");
	addColumnIfMissing(database, "world_entities", "bot_archetype_id", "TEXT");
	addColumnIfMissing(database, "world_entities", "mark_level", "INTEGER");
	addColumnIfMissing(database, "world_entities", "speech_profile", "TEXT");
	addColumnIfMissing(database, "world_entities", "building_type", "TEXT");
	addColumnIfMissing(database, "world_entities", "display_name", "TEXT");
	addColumnIfMissing(database, "world_entities", "fragment_id", "TEXT");
	addColumnIfMissing(
		database,
		"world_entities",
		"x",
		"REAL NOT NULL DEFAULT 0",
	);
	addColumnIfMissing(
		database,
		"world_entities",
		"y",
		"REAL NOT NULL DEFAULT 0",
	);
	addColumnIfMissing(
		database,
		"world_entities",
		"z",
		"REAL NOT NULL DEFAULT 0",
	);
	addColumnIfMissing(database, "world_entities", "speed", "REAL");
	addColumnIfMissing(
		database,
		"world_entities",
		"selected",
		"INTEGER NOT NULL DEFAULT 0",
	);
	addColumnIfMissing(
		database,
		"world_entities",
		"components_json",
		"TEXT NOT NULL DEFAULT '[]'",
	);
	addColumnIfMissing(database, "world_entities", "navigation_json", "TEXT");
	addColumnIfMissing(database, "world_entities", "ai_role", "TEXT");
	addColumnIfMissing(database, "world_entities", "ai_state_json", "TEXT");
	addColumnIfMissing(database, "world_entities", "powered", "INTEGER");
	addColumnIfMissing(database, "world_entities", "operational", "INTEGER");
	addColumnIfMissing(database, "world_entities", "rod_capacity", "REAL");
	addColumnIfMissing(database, "world_entities", "current_output", "REAL");
	addColumnIfMissing(database, "world_entities", "protection_radius", "REAL");

	initializedDatabases.add(database as object);
}

export function resetDatabaseBootstrapForTests(database: SyncDatabase) {
	initializedDatabases.delete(database as object);
}
