# config/

All game data files — tunables, constants, tech tree, recipes, movement profiles, and more.

## Rules
- **Config is data, not code** — only simple lookup helpers, never game logic
- **All tunables live here** — no magic numbers in systems or renderers
- **TypeScript `const` objects** — never JSON files
- **Immutable at runtime** — config is read-only after module load
- **One file per domain** — gameDefaults, techTreeDefs, movementDefs, etc.

## Public API

### Game Defaults (`gameDefaults.ts`)
- `TILE_SIZE_M`, `ELEVATION_STEP_M` — spatial constants
- `PLAYER_MAX_AP`, `INITIAL_SCAN_RANGE` — player tuning
- `FACTION_COLORS`, `FACTION_COLORS_CSS` — faction color palettes
- `VICTORY_*` — victory condition thresholds
- `STANDING_*`, `DIPLOMACY_*` — diplomacy tuning

### Building Blueprints (`buildingDefs.ts`)
- `BUILDING_BLUEPRINTS` — component-based building definitions
- `getBuildingDisplayName(type)` — human-readable name

### Tech Tree (`techTreeDefs.ts`)
- `TECH_TREE`, `TECH_BY_ID`, `getTechsByTier`
- `TechDef`, `TechEffect`, `TechEffectType`

### Movement (`movementDefs.ts`)
- `MOVEMENT_PROFILES` — per-class movement stats
- `computeMaxMp`, `canUnitMove`, `canUnitAct`

### Other
- `COMPONENT_RECIPES` — fusion synthesis recipes
- `FACTION_AI_BIASES` — AI personality biases
- `POI_DEFINITIONS` — point of interest types
- `NARRATIVE_THOUGHTS` — lore thought triggers
- `WEATHER_VISIBILITY`, `STORM_VISUAL_PARAMS` — weather tuning
- `MARK_LEVEL_COSTS`, `MOTOR_POOL_TIERS` — upgrade costs

## Files
| File | Purpose |
|------|---------|
| gameDefaults.ts | Core game constants and tunables |
| buildingDefs.ts | Building blueprint components |
| diplomacyDefs.ts | Diplomacy standing tiers and modifiers |
| factionAiDefs.ts | AI faction personality biases |
| movementDefs.ts | Per-class movement profiles |
| narrativeDefs.ts | Narrative thought triggers |
| poiDefs.ts | Point of interest definitions |
| recipeDefs.ts | Fusion synthesis recipes |
| techTreeDefs.ts | Tech tree definitions |
| upgradeDefs.ts | Mark upgrade costs and tiers |
| weatherDefs.ts | Weather/storm visual and gameplay parameters |
