/**
 * Database singleton for native (iOS/Android) saves.
 *
 * On native: opens an expo-sqlite database and wraps it with Drizzle ORM.
 * On web: returns null (SaveManager falls back to IndexedDB).
 *
 * Usage:
 * ```ts
 * import { getNativeDb } from './db';
 * const db = getNativeDb(); // null on web, Drizzle instance on native
 * ```
 *
 * Schema: src/save/schema.ts
 *
 * Migration: Inline CREATE TABLE IF NOT EXISTS — no drizzle-kit required.
 * Increment DB_VERSION when schema changes and add ALTER TABLE statements
 * to migrateDatabase() below.
 */

import { Platform } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleExpoSqliteDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpoSqliteDb = any;

let _db: DrizzleExpoSqliteDb | null = null;
let _sqlite: ExpoSqliteDb | null = null;
let _initialized = false;

/**
 * Current SQLite schema version.
 * Bump this when columns or tables change and add migration steps.
 */
const DB_VERSION = 1;

/**
 * SQL statements to create all tables on first install.
 */
const CREATE_TABLES_SQL = [
	`CREATE TABLE IF NOT EXISTS saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    seed INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    play_time_seconds INTEGER NOT NULL DEFAULT 0
  )`,
	`CREATE TABLE IF NOT EXISTS saved_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL REFERENCES saves(id),
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    faction TEXT NOT NULL,
    pos_x INTEGER NOT NULL,
    pos_y INTEGER NOT NULL,
    pos_z INTEGER NOT NULL,
    component_data TEXT NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS saved_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL REFERENCES saves(id),
    resource_type TEXT NOT NULL,
    amount INTEGER NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS saved_game_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL REFERENCES saves(id),
    game_speed INTEGER NOT NULL,
    tick_count INTEGER NOT NULL,
    storm_intensity INTEGER NOT NULL
  )`,
	// Stores full JSON payload by slot ID — mirrors the IndexedDB pattern
	`CREATE TABLE IF NOT EXISTS save_slots (
    slot_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  )`,
] as const;

/**
 * Initialize the SQLite database and run migrations if needed.
 * Safe to call multiple times — only runs once per process lifetime.
 * Call this at app startup (e.g., in app/_layout.tsx).
 *
 * @returns The Drizzle db instance on native, null on web.
 */
export function initNativeDb(): DrizzleExpoSqliteDb | null {
	if (_initialized) return _db;
	_initialized = true;

	if (Platform.OS === "web") {
		_db = null;
		return null;
	}

	try {
		// Dynamic require so Metro does not attempt to bundle native modules on web
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { openDatabaseSync } = require("expo-sqlite");
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { drizzle } = require("drizzle-orm/expo-sqlite");

		const sqlite = openDatabaseSync("syntheteria.db") as ExpoSqliteDb;
		const db = drizzle(sqlite) as DrizzleExpoSqliteDb;

		migrateDatabase(sqlite);

		_sqlite = sqlite;
		_db = db;
		return db;
	} catch (err) {
		console.error("[db] Failed to initialize native SQLite database:", err);
		_db = null;
		_sqlite = null;
		return null;
	}
}

/**
 * Get the initialized Drizzle db instance.
 * Returns null on web or if initialization failed.
 * Call initNativeDb() at app startup before using this.
 */
export function getNativeDb(): DrizzleExpoSqliteDb | null {
	return _db;
}

/**
 * Check whether the native SQLite backend is available.
 */
export function isNativeDbAvailable(): boolean {
	return _sqlite !== null;
}

/**
 * Run CREATE TABLE IF NOT EXISTS and schema version migrations.
 * Called once at startup. Add ALTER TABLE statements here for future versions.
 */
function migrateDatabase(sqlite: ExpoSqliteDb): void {
	for (const sql of CREATE_TABLES_SQL) {
		sqlite.execSync(sql);
	}

	const rows = sqlite.getAllSync(
		"SELECT version FROM schema_version LIMIT 1",
	) as Array<{ version: number }>;
	const currentVersion = rows.length > 0 ? rows[0].version : 0;

	if (currentVersion < DB_VERSION) {
		// Add ALTER TABLE migrations here for future schema versions:
		// if (currentVersion < 2) { sqlite.execSync("ALTER TABLE saves ADD COLUMN ...") }

		if (currentVersion === 0) {
			sqlite.runSync(
				"INSERT INTO schema_version (version) VALUES (?)",
				[DB_VERSION],
			);
		} else {
			sqlite.runSync(
				"UPDATE schema_version SET version = ?",
				[DB_VERSION],
			);
		}
	}
}

/**
 * Save a full JSON payload to the native SQLite save_slots table.
 * Upserts by slot_id. No-op if native db is unavailable.
 *
 * All values passed through parameterized queries — no string interpolation.
 */
export function nativePutSave(slotId: string, payload: unknown): void {
	if (!_sqlite) return;
	const json = JSON.stringify(payload);
	_sqlite.runSync(
		"INSERT INTO save_slots (slot_id, payload) VALUES (?, ?) ON CONFLICT(slot_id) DO UPDATE SET payload = excluded.payload",
		[slotId, json],
	);
}

/**
 * Load a save payload from the native SQLite save_slots table.
 * Returns undefined if the slot is empty or native db is unavailable.
 */
export function nativeGetSave(slotId: string): unknown | undefined {
	if (!_sqlite) return undefined;
	const rows = _sqlite.getAllSync(
		"SELECT payload FROM save_slots WHERE slot_id = ? LIMIT 1",
		[slotId],
	) as Array<{ payload: string }>;
	if (rows.length === 0) return undefined;
	try {
		return JSON.parse(rows[0].payload);
	} catch {
		return undefined;
	}
}

/**
 * Load all save payloads from the native SQLite save_slots table.
 */
export function nativeGetAllSaves(): unknown[] {
	if (!_sqlite) return [];
	const rows = _sqlite.getAllSync(
		"SELECT payload FROM save_slots",
	) as Array<{ payload: string }>;
	return rows.flatMap((r) => {
		try {
			return [JSON.parse(r.payload)];
		} catch {
			return [];
		}
	});
}

/**
 * Delete a save slot from the native SQLite save_slots table.
 */
export function nativeDeleteSave(slotId: string): void {
	if (!_sqlite) return;
	_sqlite.runSync(
		"DELETE FROM save_slots WHERE slot_id = ?",
		[slotId],
	);
}

/**
 * Reset db state — for tests only.
 * @internal
 */
export function _resetNativeDb(): void {
	_db = null;
	_sqlite = null;
	_initialized = false;
}
