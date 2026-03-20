# db/

SQLite persistence layer — save/load games, schema migrations, and ECS serialization.

## Rules
- **SQLite is non-fatal** — if DB fails, the game still runs from ECS in memory
- **sql.js (pure JS, no WASM)** — uses `sql-asm.js` for browser compatibility
- **Migrations are additive** — never drop columns, only add
- **Serialization round-trips ECS state** — `serialize*` writes, `apply*` reads
- **GameRepo is the only DB consumer** — all queries go through it

## Public API
- `createSqlJsAdapter()` — create the SQLite adapter
- `GameRepo` — high-level save/load/list API
- `runMigrations(db)` — apply schema migrations
- `serializeUnits()`, `applyUnits()` — ECS unit round-trip
- `serializeBuildings()`, `applyBuildings()` — ECS building round-trip
- `serializeExplored()`, `applyExplored()` — fog of war round-trip
- `serializeResources()`, `applyResources()` — resource pool round-trip

## Files
| File | Purpose |
|------|---------|
| adapter.ts | `SqliteAdapter` interface + sql.js factory |
| gameRepo.ts | `GameRepo` class — save, load, list, delete |
| migrations.ts | Schema migration runner |
| schema.ts | All CREATE TABLE statements |
| serialize.ts | ECS ↔ DB serialization functions |
| types.ts | DB record interfaces |
