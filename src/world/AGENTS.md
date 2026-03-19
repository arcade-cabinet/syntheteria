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
