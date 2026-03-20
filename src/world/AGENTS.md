# world/

New-game configuration — sector scale, difficulty, climate, storm profile, and faction slots.

## Rules
- **Config is created once per game** — `createNewGameConfig()` at game start
- **Types define the new-game modal** — UI reads `SectorScale`, `Difficulty`, etc.
- **Specs provide display data** — labels, descriptions, numeric ranges
- **No ECS references** — this is pre-game configuration, not runtime state

## Public API
- `createNewGameConfig(overrides)` — build a `NewGameConfig` with defaults
- `getPlayerFactionId(config)` — extract player's faction from config
- `DEFAULT_NEW_GAME_CONFIG` — default config values
- `SECTOR_SCALE_SPECS`, `CLIMATE_PROFILE_SPECS`, `STORM_PROFILE_SPECS` — spec lookup tables
- Types: `NewGameConfig`, `SectorScale`, `Difficulty`, `ClimateProfile`, `StormProfile`, `FactionSlot`

## Files
| File | Purpose |
|------|---------|
| config.ts | New-game config types, defaults, and spec lookups |

## Future (see `docs/PHASER_PIVOT_PLAN.md` 0.2 / Phase 4)

Settlement **snapshots and POI contracts** may land here for persistence and the **CivRev2/Civ VI-style
city management panel** (React DOM). That is **not** a second Phaser scene or playable city interior.
