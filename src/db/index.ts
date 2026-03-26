/**
 * @package db
 *
 * SQLite persistence — schema, migrations, serialization, and game repository.
 * SQLite is non-fatal: if the DB fails, the game runs from ECS in memory.
 */

export type { SqliteAdapter } from "./adapter";
// --- Repository ---
export { GameRepo } from "./gameRepo";
// --- Migrations ---
export { runMigrations } from "./migrations";
// --- Persistence Manager ---
export {
	closePersistence,
	deleteSave,
	initPersistence,
	isPersistenceAvailable,
	listSaves,
	loadGame,
	saveGame,
} from "./persistence";

// --- Schema ---
export {
	ALL_CREATE_STATEMENTS,
	SCHEMA_VERSION,
	SQL_CREATE_BUILDINGS,
	SQL_CREATE_GAMES,
	SQL_CREATE_LIGHTNING_RODS,
	SQL_CREATE_META,
	SQL_CREATE_RESOURCES,
	SQL_CREATE_SCAVENGE_POINTS,
	SQL_CREATE_UNITS,
} from "./schema";

// --- Serialization ---
export {
	applyBuildings,
	applyResources,
	applyUnits,
	serializeBuildings,
	serializeResources,
	serializeScavengePoints,
	serializeUnits,
} from "./serialize";
// --- Types ---
export type {
	BuildingRecord,
	GameRecord,
	GameSummary,
	LightningRodRecord,
	ResourcePoolRecord,
	ScavengePointRecord,
	UnitRecord,
} from "./types";
// --- Web Adapter ---
export { createWebAdapter, exportDatabase } from "./webAdapter";
// --- Capacitor Adapter ---
export {
	createCapacitorAdapter,
	initCapacitorSqlite,
} from "./capacitorAdapter";
