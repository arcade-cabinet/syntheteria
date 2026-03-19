/**
 * @package db
 *
 * SQLite persistence — schema, migrations, serialization, and game repository.
 */

// --- Adapter ---
export { createSqlJsAdapter } from "./adapter";
export type { SqliteAdapter } from "./adapter";

// --- Repository ---
export { GameRepo } from "./gameRepo";

// --- Migrations ---
export { runMigrations } from "./migrations";

// --- Schema ---
export {
	SCHEMA_VERSION,
	SQL_CREATE_META,
	SQL_CREATE_GAMES,
	SQL_CREATE_TILES,
	SQL_CREATE_TILE_RESOURCES,
	SQL_CREATE_UNITS,
	SQL_CREATE_BUILDINGS,
	SQL_CREATE_EVENTS,
	SQL_CREATE_EXPLORED,
	SQL_CREATE_RESOURCES,
	SQL_CREATE_CAMPAIGN_STATISTICS,
	SQL_CREATE_TURN_EVENT_LOGS,
	SQL_CREATE_FACTION_RESOURCE_SNAPSHOTS,
	SQL_CREATE_TURN_SNAPSHOTS,
	ALL_CREATE_STATEMENTS,
} from "./schema";

// --- Serialization ---
export {
	serializeUnits,
	serializeBuildings,
	serializeExplored,
	serializeResources,
	applyUnits,
	applyBuildings,
	applyExplored,
	applyTurn,
	applyResources,
} from "./serialize";

// --- Types ---
export type {
	GameRecord,
	TileRecord,
	TileResourceRecord,
	UnitRecord,
	BuildingRecord,
	ExploredRecord,
	ResourceRecord,
	EventRecord,
	GameSummary,
	CampaignStatisticsRecord,
	TurnEventLogRecord,
	FactionResourceSnapshotRecord,
	FactionSnapshotData,
	TurnSnapshotRecord,
} from "./types";
