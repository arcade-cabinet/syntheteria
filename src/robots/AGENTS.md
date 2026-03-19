# robots/

Robot archetypes, class actions, marks, placement, and specialization tracks.

## Rules
- **One file per archetype** — BuilderBot, CavalryBot, GuardBot, HarvesterBot, ScoutBot, SentinelBot
- **`archetypes.ts` re-exports** — canonical barrel for all spawn functions + defaults
- **Placement uses `RobotPlacementFlag[]`** — not hardcoded positions
- **Cult mechs are separate** — `CultMechs.ts` has escalation-tier spawning
- **Specialization tracks live in `specializations/`** — per-class track files + registry

## Public API

### Spawn Functions
- `spawnWorker`, `spawnSupport`, `spawnScout`, `spawnInfantry`, `spawnRanged`, `spawnCavalry`
- `spawnCultInfantry`, `spawnCultRanged`, `spawnCultShaman`, `spawnCultCavalry`, `spawnCultArchon`

### Class Actions
- `CLASS_ACTIONS` — all class action definitions
- `getClassActions(robotClass)` — actions available to a class
- `canUseAction(world, entityId, actionId)` — check action availability

### Marks & Upgrades
- `MARK_DEFS` — mark level definitions (thresholds, stat buffs)
- `MARK_SPECIALIZATIONS` — mark-specific specialization effects
- `MARK_EFFECTS` — per-mark stat modifiers

### Placement
- `buildPlacementFlags(config)` — generate placement flags from game config
- `placeRobots(world, board, flags)` — place starting units
- `computeSpawnCenters()` — compute faction spawn locations

### Specializations
- `TRACK_REGISTRY` — all specialization tracks across all classes
- `getTracksForClass(robotClass)` — available tracks for a class
- `getAllTrackTechs()` — tech tree entries for all tracks

## Files
| File | Purpose |
|------|---------|
| archetypes.ts | Barrel re-export of all archetype spawn functions |
| BuilderBot.ts | Support/builder archetype |
| CavalryBot.ts | Cavalry archetype |
| GuardBot.ts | Ranged guard archetype |
| HarvesterBot.ts | Worker/harvester archetype |
| ScoutBot.ts | Scout archetype |
| SentinelBot.ts | Infantry/sentinel archetype |
| CultMechs.ts | Cult enemy unit types + escalation |
| classActions.ts | Per-class action definitions |
| marks.ts | Mark levels, specializations, effects |
| placement.ts | Starting unit placement logic |
| types.ts | `RobotClass`, `BotTier` type definitions |
| specializations/ | Per-class specialization track files |
