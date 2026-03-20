/**
 * @package db
 *
 * SQLite persistence — schema, migrations, serialization, and game repository.
 */

export type { SqliteAdapter } from "./adapter";
// --- Adapter ---
export { createTestAdapter } from "./adapter";
export {
	createCapacitorAdapter,
	initCapacitorSqlite,
} from "./capacitorAdapter";

// --- Repository ---
export { GameRepo } from "./gameRepo";

// --- Migrations ---
export { runMigrations } from "./migrations";

// --- Schema ---
export {
	ALL_CREATE_STATEMENTS,
	SCHEMA_VERSION,
	SQL_CREATE_BUILDINGS,
	SQL_CREATE_CAMPAIGN_STATISTICS,
	SQL_CREATE_EVENTS,
	SQL_CREATE_EXPLORED,
	SQL_CREATE_FACTION_RESOURCE_SNAPSHOTS,
	SQL_CREATE_GAMES,
	SQL_CREATE_META,
	SQL_CREATE_RESOURCES,
	SQL_CREATE_TILE_RESOURCES,
	SQL_CREATE_TILES,
	SQL_CREATE_TURN_EVENT_LOGS,
	SQL_CREATE_TURN_SNAPSHOTS,
	SQL_CREATE_UNITS,
} from "./schema";

// --- Serialization ---
export {
	applyBuildings,
	applyExplored,
	applyResources,
	applyTurn,
	applyUnits,
	serializeBuildings,
	serializeExplored,
	serializeResources,
	serializeUnits,
} from "./serialize";

// --- Types ---
export type {
	BuildingRecord,
	CampaignStatisticsRecord,
	EventRecord,
	ExploredRecord,
	FactionResourceSnapshotRecord,
	FactionSnapshotData,
	GameRecord,
	GameSummary,
	ResourceRecord,
	TileRecord,
	TileResourceRecord,
	TurnEventLogRecord,
	TurnSnapshotRecord,
	UnitRecord,
} from "./types";
