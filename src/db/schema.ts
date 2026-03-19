/** Current schema version. Increment when adding tables/columns. */
export const SCHEMA_VERSION = 4;

export const SQL_CREATE_META = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

export const SQL_CREATE_GAMES = `
CREATE TABLE IF NOT EXISTS games (
  id              TEXT PRIMARY KEY,
  seed            TEXT NOT NULL,
  board_w         INTEGER NOT NULL,
  board_h         INTEGER NOT NULL,
  tile_size_m     REAL NOT NULL DEFAULT 2.0,
  difficulty      TEXT NOT NULL DEFAULT 'normal',
  turn            INTEGER NOT NULL DEFAULT 1,
  climate_profile TEXT NOT NULL DEFAULT 'temperate',
  storm_profile   TEXT NOT NULL DEFAULT 'volatile',
  game_difficulty TEXT NOT NULL DEFAULT 'standard',
  faction_slots   TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);`;

export const SQL_CREATE_TILES = `
CREATE TABLE IF NOT EXISTS tiles (
  game_id   TEXT NOT NULL,
  x         INTEGER NOT NULL,
  z         INTEGER NOT NULL,
  zone      TEXT NOT NULL,
  elevation INTEGER NOT NULL DEFAULT 0,
  passable  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (game_id, x, z)
);`;

export const SQL_CREATE_TILE_RESOURCES = `
CREATE TABLE IF NOT EXISTS tile_resources (
  game_id       TEXT NOT NULL,
  x             INTEGER NOT NULL,
  z             INTEGER NOT NULL,
  resource_type TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  depleted      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, x, z)
);`;

export const SQL_CREATE_UNITS = `
CREATE TABLE IF NOT EXISTS units (
  id         TEXT NOT NULL,
  game_id    TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  tile_x     INTEGER NOT NULL,
  tile_z     INTEGER NOT NULL,
  hp         INTEGER NOT NULL,
  max_hp     INTEGER NOT NULL,
  ap         INTEGER NOT NULL,
  max_ap     INTEGER NOT NULL,
  mp         INTEGER NOT NULL DEFAULT 3,
  max_mp     INTEGER NOT NULL DEFAULT 3,
  model_id   TEXT NOT NULL,
  PRIMARY KEY (game_id, id)
);`;

export const SQL_CREATE_BUILDINGS = `
CREATE TABLE IF NOT EXISTS buildings (
  id         TEXT NOT NULL,
  game_id    TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  tile_x     INTEGER NOT NULL,
  tile_z     INTEGER NOT NULL,
  type       TEXT NOT NULL,
  hp         INTEGER NOT NULL,
  max_hp     INTEGER NOT NULL,
  PRIMARY KEY (game_id, id)
);`;

export const SQL_CREATE_EVENTS = `
CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id  TEXT NOT NULL,
  turn     INTEGER NOT NULL,
  type     TEXT NOT NULL,
  payload  TEXT NOT NULL
);`;

export const SQL_CREATE_EXPLORED = `
CREATE TABLE IF NOT EXISTS game_explored (
  game_id    TEXT NOT NULL,
  tile_x     INTEGER NOT NULL,
  tile_z     INTEGER NOT NULL,
  explored   INTEGER NOT NULL DEFAULT 0,
  visibility REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, tile_x, tile_z)
);`;

export const SQL_CREATE_RESOURCES = `
CREATE TABLE IF NOT EXISTS game_resources (
  game_id    TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  material   TEXT NOT NULL,
  amount     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, faction_id, material)
);`;

// ─── Analytics Tables ───────────────────────────────────────────────────────

/** Campaign-wide statistics snapshot. One row per game, updated each turn. */
export const SQL_CREATE_CAMPAIGN_STATISTICS = `
CREATE TABLE IF NOT EXISTS campaign_statistics (
  game_id    TEXT NOT NULL,
  stats_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (game_id)
);`;

/** Per-turn event batch. One row per turn with all events as JSON array. */
export const SQL_CREATE_TURN_EVENT_LOGS = `
CREATE TABLE IF NOT EXISTS turn_event_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id     TEXT NOT NULL,
  turn        INTEGER NOT NULL,
  events_json TEXT NOT NULL DEFAULT '[]'
);`;

/** Per-faction resource snapshot per turn. Powers resource trajectory graphs. */
export const SQL_CREATE_FACTION_RESOURCE_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS faction_resource_snapshots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id        TEXT NOT NULL,
  turn           INTEGER NOT NULL,
  faction_id     TEXT NOT NULL,
  resources_json TEXT NOT NULL DEFAULT '{}'
);`;

/** Per-turn game state snapshot. Territory %, unit counts, building counts per faction. */
export const SQL_CREATE_TURN_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS turn_snapshots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id        TEXT NOT NULL,
  turn           INTEGER NOT NULL,
  snapshot_json  TEXT NOT NULL DEFAULT '{}'
);`;

export const ALL_CREATE_STATEMENTS = [
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
];
