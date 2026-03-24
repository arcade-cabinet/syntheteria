/** Current schema version. Increment when adding tables/columns. */
export const SCHEMA_VERSION = 1;

export const SQL_CREATE_META = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

export const SQL_CREATE_GAMES = `
CREATE TABLE IF NOT EXISTS games (
  id            TEXT PRIMARY KEY,
  seed          TEXT NOT NULL,
  difficulty    TEXT NOT NULL DEFAULT 'normal',
  elapsed_ticks INTEGER NOT NULL DEFAULT 0,
  game_speed    REAL NOT NULL DEFAULT 1.0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);`;

export const SQL_CREATE_UNITS = `
CREATE TABLE IF NOT EXISTS units (
  id              TEXT NOT NULL,
  game_id         TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  unit_type       TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  faction         TEXT NOT NULL DEFAULT 'player',
  x               REAL NOT NULL,
  y               REAL NOT NULL,
  z               REAL NOT NULL,
  speed           REAL NOT NULL DEFAULT 3,
  fragment_id     TEXT NOT NULL DEFAULT '',
  components_json TEXT NOT NULL DEFAULT '[]',
  path_json       TEXT NOT NULL DEFAULT '[]',
  path_index      INTEGER NOT NULL DEFAULT 0,
  moving          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, id)
);`;

export const SQL_CREATE_BUILDINGS = `
CREATE TABLE IF NOT EXISTS buildings (
  id                      TEXT NOT NULL,
  game_id                 TEXT NOT NULL,
  entity_id               TEXT NOT NULL,
  building_type           TEXT NOT NULL,
  faction                 TEXT NOT NULL DEFAULT 'player',
  x                       REAL NOT NULL,
  y                       REAL NOT NULL,
  z                       REAL NOT NULL,
  powered                 INTEGER NOT NULL DEFAULT 0,
  operational             INTEGER NOT NULL DEFAULT 0,
  fragment_id             TEXT NOT NULL DEFAULT '',
  building_components_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (game_id, id)
);`;

export const SQL_CREATE_LIGHTNING_RODS = `
CREATE TABLE IF NOT EXISTS lightning_rods (
  building_id       TEXT NOT NULL,
  game_id           TEXT NOT NULL,
  rod_capacity      REAL NOT NULL DEFAULT 10,
  current_output    REAL NOT NULL DEFAULT 7,
  protection_radius REAL NOT NULL DEFAULT 8,
  PRIMARY KEY (game_id, building_id)
);`;

export const SQL_CREATE_RESOURCES = `
CREATE TABLE IF NOT EXISTS resources (
  game_id      TEXT PRIMARY KEY,
  scrap_metal  INTEGER NOT NULL DEFAULT 0,
  circuitry    INTEGER NOT NULL DEFAULT 0,
  power_cells  INTEGER NOT NULL DEFAULT 0,
  durasteel    INTEGER NOT NULL DEFAULT 0
);`;

export const SQL_CREATE_SCAVENGE_POINTS = `
CREATE TABLE IF NOT EXISTS scavenge_points (
  game_id             TEXT NOT NULL,
  x                   REAL NOT NULL,
  z                   REAL NOT NULL,
  remaining           INTEGER NOT NULL,
  resource_type       TEXT NOT NULL,
  amount_per_scavenge INTEGER NOT NULL,
  PRIMARY KEY (game_id, x, z)
);`;

export const ALL_CREATE_STATEMENTS = [
	SQL_CREATE_META,
	SQL_CREATE_GAMES,
	SQL_CREATE_UNITS,
	SQL_CREATE_BUILDINGS,
	SQL_CREATE_LIGHTNING_RODS,
	SQL_CREATE_RESOURCES,
	SQL_CREATE_SCAVENGE_POINTS,
];
