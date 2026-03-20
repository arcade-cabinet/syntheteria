# db/

SQLite persistence layer — save/load games, schema migrations, and ECS serialization.

## Rules
- **SQLite is non-fatal** — if DB fails, the game still runs from ECS in memory
- **Capacitor SQLite for production** — web via jeep-sqlite, native via @capacitor-community/sqlite
- **sql.js for tests only** — `createTestAdapter()` provides in-memory isolation (devDependency)
- **Migrations are additive** — never drop columns, only add
- **Serialization round-trips ECS state** — `serialize*` writes, `apply*` reads
- **GameRepo is the only DB consumer** — all queries go through it

## Public API
- `createCapacitorAdapter()` — production SQLite adapter (web + Android + iOS)
- `initCapacitorSqlite()` — one-time platform init (call before createCapacitorAdapter)
- `createTestAdapter()` — in-memory sql.js adapter for test isolation only
- `GameRepo` — high-level save/load/list API
- `runMigrations(db)` — apply schema migrations
- `serializeUnits()`, `applyUnits()` — ECS unit round-trip
- `serializeBuildings()`, `applyBuildings()` — ECS building round-trip
- `serializeExplored()`, `applyExplored()` — fog of war round-trip
- `serializeResources()`, `applyResources()` — resource pool round-trip

## Files
| File | Purpose |
|------|---------|
| adapter.ts | `SqliteAdapter` interface + `createTestAdapter()` (test-only sql.js) |
| capacitorAdapter.ts | `createCapacitorAdapter()` + `initCapacitorSqlite()` (production) |
| gameRepo.ts | `GameRepo` class — save, load, list, delete |
| migrations.ts | Schema migration runner |
| schema.ts | All CREATE TABLE statements |
| serialize.ts | ECS ↔ DB serialization functions |
| types.ts | DB record interfaces |
