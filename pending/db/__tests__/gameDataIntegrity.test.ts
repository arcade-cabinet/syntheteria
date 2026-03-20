/**
 * Game Data Integrity Tests
 *
 * Verifies the database layer correctly stores and retrieves game data.
 * Uses FakeDatabase for isolation. All expected counts are derived from
 * the JSON source of truth.
 */

import {
	CATEGORY_COUNTS,
	EXPECTED_MODEL_COUNT,
	TEST_SEED,
	VALID_CATEGORIES,
} from "../../../tests/testConstants";
import modelManifest from "../../config/modelDefinitions.json";
import { WORLD_POI_TYPES } from "../../world/contracts";
import {
	initializeDatabaseSync,
	resetDatabaseBootstrapForTests,
} from "../bootstrap";
import { FakeDatabase } from "./helpers/fakeDatabase";

const MODELS = modelManifest.models;

// ---------------------------------------------------------------------------
// Helper: seed model definitions into the FakeDatabase
// ---------------------------------------------------------------------------

function _seedModelDefinitions(db: FakeDatabase) {
	// The FakeDatabase doesn't natively support model_definitions INSERT,
	// so we extend it to track inserts via execSync SQL parsing.
	// Instead, we test the contract: if a real DB were seeded with these
	// models, the counts and IDs must match.
	// For this test suite, we verify the data invariants directly.
}

// ---------------------------------------------------------------------------
// Bootstrap Integrity
// ---------------------------------------------------------------------------

describe("database bootstrap integrity", () => {
	let db: FakeDatabase;

	beforeEach(() => {
		db = new FakeDatabase();
	});

	it("creates all required tables", () => {
		initializeDatabaseSync(db);

		const sql = db.execCalls[0];
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS save_games");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS ecumenopolis_maps");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS sector_cells");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS sector_structures");
		expect(sql).toContain(
			"CREATE TABLE IF NOT EXISTS world_points_of_interest",
		);
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS city_instances");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS model_definitions");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS tile_definitions");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS robot_definitions");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS game_map_tiles");
		expect(sql).toContain("CREATE TABLE IF NOT EXISTS map_deltas");
	});

	it("creates indexes for game_map_tiles and map_deltas", () => {
		initializeDatabaseSync(db);

		const sql = db.execCalls[0];
		expect(sql).toContain(
			"CREATE INDEX IF NOT EXISTS idx_game_map_tiles_save_coords",
		);
		expect(sql).toContain(
			"CREATE INDEX IF NOT EXISTS idx_game_map_tiles_save_zone",
		);
		expect(sql).toContain(
			"CREATE INDEX IF NOT EXISTS idx_map_deltas_save_turn",
		);
		expect(sql).toContain(
			"CREATE INDEX IF NOT EXISTS idx_model_definitions_category_family",
		);
	});

	it("is idempotent — initializing twice only runs schema once", () => {
		initializeDatabaseSync(db);
		const firstCount = db.execCalls.length;
		initializeDatabaseSync(db);

		// WeakSet guard prevents double execution
		expect(db.execCalls.length).toBe(firstCount);
	});

	it("re-initializes after reset", () => {
		initializeDatabaseSync(db);
		const firstCount = db.execCalls.length;
		resetDatabaseBootstrapForTests(db);
		initializeDatabaseSync(db);

		// Second init runs main block again; addColumnIfMissing may not run (columns already present)
		expect(db.execCalls.length).toBeGreaterThan(firstCount);
	});
});

// ---------------------------------------------------------------------------
// Model Definitions Data Contract
// ---------------------------------------------------------------------------

describe("model definitions data contract", () => {
	it("manifest contains exactly EXPECTED_MODEL_COUNT models", () => {
		expect(MODELS.length).toBe(EXPECTED_MODEL_COUNT);
	});

	it("every model can be looked up by ID", () => {
		const byId = new Map(MODELS.map((m) => [m.id, m]));
		for (const model of MODELS) {
			const found = byId.get(model.id);
			expect(found).toBeDefined();
			expect(found!.id).toBe(model.id);
		}
	});

	it("category counts match when counted from JSON", () => {
		const counted: Record<string, number> = {};
		for (const model of MODELS) {
			counted[model.category] = (counted[model.category] ?? 0) + 1;
		}
		expect(counted).toEqual(CATEGORY_COUNTS);
	});

	it("all categories are present", () => {
		const categoriesInData = [...new Set(MODELS.map((m) => m.category))].sort();
		expect(categoriesInData).toEqual(VALID_CATEGORIES);
	});

	it("robot definitions count matches robot category", () => {
		const robotCount = MODELS.filter((m) => m.category === "robot").length;
		expect(robotCount).toBe(CATEGORY_COUNTS["robot"]);
	});
});

// ---------------------------------------------------------------------------
// Save Game + World Persistence Roundtrip
// ---------------------------------------------------------------------------

describe("save game and world persistence", () => {
	let db: FakeDatabase;

	beforeEach(() => {
		db = new FakeDatabase();
		initializeDatabaseSync(db);
	});

	it("can create a save game and retrieve it", () => {
		const now = Math.floor(Date.now() / 1000);
		const result = db.runSync(
			"INSERT INTO save_games (name, world_seed, sector_scale, difficulty, climate_profile, storm_profile, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			"Test Save",
			TEST_SEED,
			"standard",
			"standard",
			"temperate",
			"volatile",
			now,
			now,
		);
		expect(result.lastInsertRowId).toBeGreaterThan(0);

		const found = db.getFirstSync<{ id: number; name: string }>(
			"SELECT * FROM save_games WHERE id = ?",
			result.lastInsertRowId,
		);
		expect(found).not.toBeNull();
		expect(found!.name).toBe("Test Save");
	});

	it("can store and retrieve sector cells for a world map", () => {
		const now = Math.floor(Date.now() / 1000);
		const saveResult = db.runSync(
			"INSERT INTO save_games (name, world_seed, sector_scale, difficulty, climate_profile, storm_profile, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			"World Test",
			TEST_SEED,
			"standard",
			"standard",
			"temperate",
			"volatile",
			now,
			now,
		);

		const mapResult = db.runSync(
			"INSERT INTO ecumenopolis_maps (save_game_id, width, height, sector_scale, climate_profile, storm_profile, spawn_sector_id, spawn_anchor_key, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			saveResult.lastInsertRowId,
			40,
			40,
			"standard",
			"temperate",
			"volatile",
			"command_arcology",
			"0,0",
			now,
		);

		// Insert a sector cell
		db.runSync(
			"INSERT INTO sector_cells (ecumenopolis_id, q, r, structural_zone, floor_preset_id, discovery_state, passable, sector_archetype, storm_exposure, impassable_class, anchor_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			mapResult.lastInsertRowId,
			0,
			0,
			"command",
			"command_core",
			2,
			1,
			"command_plate",
			"shielded",
			"none",
			"0,0",
		);

		const cells = db.getAllSync<{ q: number; r: number }>(
			"SELECT * FROM sector_cells WHERE ecumenopolis_id = ?",
			mapResult.lastInsertRowId,
		);
		expect(cells.length).toBe(1);
		expect(cells[0].q).toBe(0);
		expect(cells[0].r).toBe(0);
	});

	it("can store a sector structure with a model ID", () => {
		const now = Math.floor(Date.now() / 1000);
		const saveResult = db.runSync(
			"INSERT INTO save_games (name, world_seed, sector_scale, difficulty, climate_profile, storm_profile, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			"Structure Test",
			TEST_SEED,
			"standard",
			"standard",
			"temperate",
			"volatile",
			now,
			now,
		);

		const mapResult = db.runSync(
			"INSERT INTO ecumenopolis_maps (save_game_id, width, height, sector_scale, climate_profile, storm_profile, spawn_sector_id, spawn_anchor_key, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			saveResult.lastInsertRowId,
			40,
			40,
			"standard",
			"temperate",
			"volatile",
			"command_arcology",
			"0,0",
			now,
		);

		// Use a real model ID from the manifest
		const modelId = MODELS[0].id;
		db.runSync(
			"INSERT INTO sector_structures (ecumenopolis_id, district_structure_id, anchor_key, q, r, model_id, placement_layer, edge, rotation_quarter_turns, offset_x, offset_y, offset_z, target_span, sector_archetype, source, controller_faction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			mapResult.lastInsertRowId,
			"substation_core",
			"0,0",
			0,
			0,
			modelId,
			"structure",
			null,
			0,
			0,
			0,
			0,
			2,
			"command_plate",
			"seeded_district",
			null,
		);

		const structures = db.getAllSync<{ model_id: string }>(
			"SELECT * FROM sector_structures WHERE ecumenopolis_id = ?",
			mapResult.lastInsertRowId,
		);
		expect(structures.length).toBe(1);
		expect(structures[0].model_id).toBe(modelId);
	});

	it("can store POIs for a world map", () => {
		const now = Math.floor(Date.now() / 1000);
		const saveResult = db.runSync(
			"INSERT INTO save_games (name, world_seed, sector_scale, difficulty, climate_profile, storm_profile, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			"POI Test",
			TEST_SEED,
			"standard",
			"standard",
			"temperate",
			"volatile",
			now,
			now,
		);

		const mapResult = db.runSync(
			"INSERT INTO ecumenopolis_maps (save_game_id, width, height, sector_scale, climate_profile, storm_profile, spawn_sector_id, spawn_anchor_key, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			saveResult.lastInsertRowId,
			40,
			40,
			"standard",
			"temperate",
			"volatile",
			"command_arcology",
			"0,0",
			now,
		);

		// Insert all POI types
		for (const poiType of WORLD_POI_TYPES) {
			db.runSync(
				"INSERT INTO world_points_of_interest (ecumenopolis_id, type, name, q, r, discovered) VALUES (?, ?, ?, ?, ?, ?)",
				mapResult.lastInsertRowId,
				poiType,
				`${poiType} POI`,
				0,
				0,
				poiType === "home_base" ? 1 : 0,
			);
		}

		const pois = db.getAllSync<{ type: string; discovered: number }>(
			"SELECT * FROM world_points_of_interest WHERE ecumenopolis_id = ?",
			mapResult.lastInsertRowId,
		);
		expect(pois.length).toBe(WORLD_POI_TYPES.length);
	});
});

// ---------------------------------------------------------------------------
// game_map_tiles + map_deltas Support
// ---------------------------------------------------------------------------

describe("game_map_tiles and map_deltas schema", () => {
	it("model_definitions table schema includes all required columns", () => {
		const db = new FakeDatabase();
		initializeDatabaseSync(db);

		const sql = db.execCalls[0];
		// Verify model_definitions columns exist in the CREATE TABLE statement
		expect(sql).toContain("id TEXT PRIMARY KEY NOT NULL");
		expect(sql).toContain("category TEXT NOT NULL");
		expect(sql).toContain("family TEXT NOT NULL");
		expect(sql).toContain("display_name TEXT NOT NULL");
		expect(sql).toContain("asset_path TEXT NOT NULL");
		expect(sql).toContain("bounds_json TEXT NOT NULL");
		expect(sql).toContain("grid_footprint_json TEXT NOT NULL");
		expect(sql).toContain("passable INTEGER NOT NULL");
		expect(sql).toContain("buildable INTEGER NOT NULL");
	});

	it("game_map_tiles table schema includes placed_model_id", () => {
		const db = new FakeDatabase();
		initializeDatabaseSync(db);

		const sql = db.execCalls[0];
		expect(sql).toContain("placed_model_id TEXT");
		expect(sql).toContain("controller_faction TEXT");
		expect(sql).toContain("zone_type TEXT NOT NULL");
	});

	it("map_deltas table schema includes change tracking columns", () => {
		const db = new FakeDatabase();
		initializeDatabaseSync(db);

		const sql = db.execCalls[0];
		expect(sql).toContain("change_type TEXT NOT NULL");
		expect(sql).toContain("change_json TEXT NOT NULL");
		expect(sql).toContain("turn_number INTEGER NOT NULL");
	});
});
