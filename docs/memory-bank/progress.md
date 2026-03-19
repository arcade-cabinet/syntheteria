# Progress: Syntheteria (Ground-Up Rewrite)

> System-level status dashboard. **The old game is in `pending/` — do not reference it.**
> Run `pnpm test:vitest` to verify.

---

## Is the game done?

**Nearly.** All core gameplay systems are implemented and wired: economy, combat, AI GOAP, cultists with escalation, specialization tracks, tech tree, victory conditions, diplomacy, territory, save/load, audio. The remaining work is visual polish (unified depth renderer, fog gradient, storm dome tuning) and wiring AI track selection into runtime.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Active `.ts`/`.tsx` files | ~338 |
| Vitest suites | 125 (all passing) |
| Vitest tests | 2219 |
| TypeScript errors | 0 |
| Biome errors | 0 |
| GLB models in public/ | 360 |
| Jest | Removed (Vitest-only) |

---

## System Status

### Board / Terrain

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Board generator | DONE | `src/board/generator.ts` | Seeded FNV-1a + mulberry32, deterministic |
| Noise + elevation | DONE | `src/board/noise.ts` | 2D value noise with bilinear interp |
| BFS adjacency | DONE | `src/board/adjacency.ts` | 4-dir passable neighbors, reachable BFS, A* path |
| GridApi | DONE | `src/board/grid.ts` | Addressable grid API |
| Depth stacking | DONE | `src/board/depth.ts` | Bridge/tunnel span generation |
| 9 terrain substrates | DONE | `src/ecs/terrain/types.ts` | FloorType + FLOOR_DEFS with yield/hardness per type |
| 13-material taxonomy | DONE | `src/ecs/terrain/types.ts` | ResourceMaterial — 4 tiers |
| PBR texture atlas | DONE | `src/ecs/terrain/floorShader.ts` | AmbientCG atlas (5 maps: color, normal, roughness, metalness, opacity) |
| Grating cutout | DONE | `src/ecs/terrain/glsl/floorFrag.glsl` | Discard in shader for abyssal grating transparency |
| Labyrinth generator | DONE | `src/board/labyrinth/` | Rooms-and-Mazes with seeded determinism |
| BSP city layout | DONE | `src/board/cityLayout.ts` | Walls, corridors, doorways, 5 district zones |
| Abyssal zones | DONE | `src/board/abyssal.ts` | Bridges, platforms, docks |
| Connectivity guarantee | DONE | `src/board/connectivity.ts` | Flood-fill + corridor punching |
| Weight-class traversal | DONE | `src/board/weightClass.ts` | Scouts walk grating at 2 AP |

### ECS (Koota)

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| World init | DONE | `src/ecs/init.ts` | Board singleton, tiles, resources, factions, robots |
| Core traits | DONE | `src/ecs/traits/` | board, tile, unit, faction, resource, building, salvage, cult |
| 9 robot archetypes | DONE | `src/ecs/robots/` | 6 faction roles + 3 cult mechs |
| Placement flags | DONE | `src/ecs/robots/placement.ts` | Min 2-tile spread, 10-tile search radius |
| 5 factions | DONE | `src/ecs/factions/definitions.ts` | player, reclaimers, volt_collective, signal_choir, iron_creed |
| 3 cults | DONE | `src/ecs/factions/cults.ts` | static_remnants, null_monks, lost_signal |
| Faction relations | DONE | `src/ecs/factions/relations.ts` | setRelation, getRelation, isHostile |
| Movement system | DONE | `src/ecs/systems/movementSystem.ts` | Lerp UnitMove → set UnitPos, deduct AP |
| Highlight system | DONE | `src/ecs/systems/highlightSystem.ts` | BFS reachable → TileHighlight |
| Turn system | DONE | `src/ecs/systems/turnSystem.ts` | Multi-phase: player → AI → attacks → env → new turn |
| Attack system | DONE | `src/ecs/systems/attackSystem.ts` | damage = attack - defense (min 1), destroy at 0 HP |
| Harvest system | DONE | `src/ecs/systems/harvestSystem.ts` | Tick-down, yield to faction pool, depletion |
| Resource system | DONE | `src/ecs/systems/resourceSystem.ts` | ResourcePool per faction CRUD |
| AI turn system | DONE | `src/ecs/systems/aiTurnSystem.ts` | Yuka GOAP with faction personalities |
| Cultist system | DONE | `src/ecs/systems/cultistSystem.ts` | 3 escalation stages, per-sect GOAP, POI spawning |
| Power grid system | DONE | `src/ecs/systems/powerSystem.ts` | Transmitters charge boxes, consumers draw, Powered trait |
| Turret system | DONE | `src/ecs/systems/turretSystem.ts` | Powered turrets auto-attack nearest hostile, cooldown |
| Signal system | DONE | `src/ecs/systems/signalSystem.ts` | Relay tower chained coverage, scanRange penalty |
| Repair system | DONE | `src/ecs/systems/repairSystem.ts` | Powered maintenance bays heal friendly units +2 HP |
| Fabrication system | DONE | `src/ecs/systems/fabricationSystem.ts` | Motor pool bot queue, resource cost, tick-down, spawn |
| Synthesis system | DONE | `src/ecs/systems/synthesisSystem.ts` | Synthesizer fusion recipes, common → advanced materials |
| Floor mining system | DONE | `src/ecs/systems/floorMiningSystem.ts` | DAISY pattern, deep mining tech +50% yield, pit creation |
| Specialization system | DONE | `src/ecs/systems/specializationSystem.ts` | Aura passives: regen, scan boost, attack buff, defense buff |
| Cult mutation system | DONE | `src/ecs/systems/cultMutation.ts` | 4-tier time-based: buffs → abilities → aberrant |
| Victory system | DONE | `src/ecs/systems/victorySystem.ts` | 7 paths + elimination defeat + forced endgame |
| Territory system | DONE | `src/ecs/systems/territorySystem.ts` | Faction tile painting |
| Population system | DONE | `src/ecs/systems/populationSystem.ts` | Population cap enforcement |
| Resource renewal | DONE | `src/ecs/systems/resourceRenewalSystem.ts` | Resource deposit regeneration |
| Experience system | DONE | `src/ecs/systems/experienceSystem.ts` | XP tracking, mark level progression |
| Research system | DONE | `src/ecs/systems/researchSystem.ts` | Tech tree progression, research labs |
| Upgrade system | DONE | `src/ecs/systems/upgradeSystem.ts` | Mark level upgrades |
| Diplomacy system | DONE | `src/ecs/systems/diplomacySystem.ts` | Granular standings (-100 to +100) |
| Hacking system | DONE | `src/ecs/systems/hackingSystem.ts` | Hack enemy units/buildings |
| Build system | DONE | `src/ecs/systems/buildSystem.ts` | Radial menu → select → check cost → place |
| Building placement | DONE | `src/ecs/systems/buildingPlacement.ts` | Adjacency and cost validation |
| Fog reveal system | DONE | `src/ecs/systems/fogRevealSystem.ts` | Per-unit scan radius fog |
| Toast notifications | DONE | `src/ecs/systems/toastNotifications.ts` | In-game toast messages |
| Turn event log | DONE | `src/ecs/systems/turnEventLog.ts` | Per-turn event history |
| Tutorial system | DONE | `src/ecs/systems/tutorialSystem.ts` | First-time player guidance |
| Memory fragments | DONE | `src/ecs/systems/memoryFragments.ts` | Lore discovery system |
| Resource delta | DONE | `src/ecs/systems/resourceDeltaSystem.ts` | Income/expense tracking |
| Campaign stats | DONE | `src/ecs/systems/campaignStats.ts` | Cross-game statistics |
| Analytics collector | DONE | `src/ecs/systems/analyticsCollector.ts` | Gameplay data collection |
| Speech triggers | DONE | `src/ecs/systems/speechTriggers.ts` | Context-sensitive dialogue |
| Speech bubble store | DONE | `src/ecs/systems/speechBubbleStore.ts` | Bubble state management |
| Turn summary | DONE | `src/ecs/systems/turnSummary.ts` | End-of-turn recap |
| Wormhole project | DONE | `src/ecs/systems/wormholeProject.ts` | 20-turn construction for wormhole victory |
| Hacking types | DONE | `src/ecs/systems/hackingTypes.ts` | Hacking action definitions |

### Robot Specializations

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Track registry | DONE | `src/ecs/robots/specializations/trackRegistry.ts` | 14 tracks across 6 classes |
| Scout tracks | DONE | `src/ecs/robots/specializations/scoutTracks.ts` | Pathfinder + Infiltrator |
| Infantry tracks | DONE | `src/ecs/robots/specializations/infantryTracks.ts` | Vanguard + Shock Trooper |
| Cavalry tracks | DONE | `src/ecs/robots/specializations/cavalryTracks.ts` | Flanker + Interceptor |
| Ranged tracks | DONE | `src/ecs/robots/specializations/rangedTracks.ts` | Sniper + Suppressor |
| Support tracks | DONE | `src/ecs/robots/specializations/supportTracks.ts` | Field Medic + Signal Booster + War Caller |
| Worker tracks | DONE | `src/ecs/robots/specializations/workerTracks.ts` | Deep Miner + Fabricator + Salvager |
| Per-class actions | DONE | `src/ecs/robots/classActions.ts` | Unique action sets per class + track actions |
| AI track selection | DEFINED | `src/ai/trackSelection.ts` | Per-faction preferences — tested but not wired into aiTurnSystem runtime |
| Garage modal | DONE | `src/ui/game/GarageModal.tsx` | Two-step fabrication UI |
| Mark progression | DONE | `src/ecs/robots/marks.ts` | Mark I-V with specialization abilities |

### Buildings / Salvage / Cult

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 15 faction buildings | DONE | `src/ecs/buildings/definitions.ts` | BUILDING_DEFS — TypeScript const with build costs |
| 6 cult structures | DONE | `src/ecs/buildings/cultStructures.ts` | breach_altar, signal_corruptor, human_shelter, corruption_node, cult_stronghold, bio_farm |
| 10 salvage types | DONE | `src/ecs/resources/salvageTypes.ts` | container, terminal, vessel, machinery, debris, cargo_crate, storage_rack, power_cell, landing_wreck, abyssal_relic |
| Building placement | DONE | `src/ecs/systems/buildSystem.ts` | Radial menu → select structure → check cost → place |
| Building power systems | DONE | `src/ecs/systems/powerSystem.ts` + 5 systems | All building types have active gameplay effects |
| Salvage mapgen | DONE | `src/ecs/systems/salvagePlacement.ts` | Scatter salvage entities during mapgen |
| Instanced renderer | DONE | `src/rendering/` | GLB instanced rendering for salvage and buildings |

### Tech Tree

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 27 techs (5 tiers) | DONE | `src/config/techTreeDefs.ts` | 15 base + 12 track-gating techs |
| Research system | DONE | `src/ecs/systems/researchSystem.ts` | Research labs accumulate points |
| Tech prerequisites | DONE | `src/config/techTreeDefs.ts` | DAG with prereq chains |
| Tech UI | DONE | `src/ui/game/` | Tech progress in HUD, research modal |

### AI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Yuka GOAP | DONE | `src/ai/` | Think/GoalEvaluator with characterBias |
| Fuzzy logic | DONE | `src/ai/fuzzyModule.ts` | Situation assessment module |
| Faction memory | DONE | `src/ai/factionMemory.ts` | Perception memory for sighted units |
| NavGraph A* | DONE | `src/ai/boardNavGraph.ts` | Pathfinding graph for AI |
| Territory triggers | DONE | `src/ai/territoryTrigger.ts` | Respond to territory changes |
| Track selection | DONE | `src/ai/trackSelection.ts` | Per-faction specialization preferences |
| Faction personalities | DONE | `src/ai/` | Reclaimers/Volt/Signal/Iron distinct behaviors |

### Persistence

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| SQLite schema | DONE | `src/db/schema.ts` | meta, games, tiles, tile_resources, units, buildings, events |
| sql.js adapter | DONE | `src/db/adapter.ts` | Pure JS, no wasm |
| GameRepo | DONE | `src/db/gameRepo.ts` | createGame, saveTiles, listGames, getGame, loadTiles |
| DB init on mount | DONE | `src/main.tsx` | Async init, savedGames → LandingScreen |
| Save/load | DONE | `src/db/` | Fixed for BSP generator, unit identity, auto-save |
| Serialization | DONE | `src/db/serialize.ts` | World state → DB round-trip |

### Rendering

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Board renderer | DONE | `src/rendering/BoardRenderer.tsx` | Merged BufferGeometry, PBR atlas shader |
| Depth renderer | DONE | `src/rendering/DepthRenderer.tsx` | Bridge platforms, columns, void planes |
| Highlight renderer | DONE | `src/rendering/HighlightRenderer.tsx` | Emissive plane pool from TileHighlight |
| Unit renderer | DONE | `src/rendering/UnitRenderer.tsx` | GLB models, faction colors, lerped movement |
| Storm dome | DONE | `src/rendering/StormDome.tsx` | 3 GLSL layers: storm, wormhole, illuminator |
| Chronometry | DONE | `src/rendering/sky/chronometry.ts` | Turn→time (day/night + seasons) |
| GLB unit models | DONE | `src/rendering/UnitRenderer.tsx` | 9 robot GLBs loaded from asset library |
| Instanced buildings | DONE | `src/rendering/` | Building GLBs rendered, fog-gated |
| Instanced salvage | DONE | `src/rendering/` | Salvage GLBs with instanced rendering |
| Mined pit renderer | DONE | `src/rendering/MinedPitRenderer.tsx` | Visible pits from floor mining |
| Fog gradient | DONE | `src/rendering/` | Per-unit scan radius fog |
| Procedural walls | DONE | `src/rendering/` | Wall/column classification + rendering |
| Labyrinth structures | DONE | `src/rendering/` | drei Instances for labyrinth walls |

### UI / Input

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Landing screen | DONE | `src/ui/landing/LandingScreen.tsx` | Title + New Game + Continue + Settings |
| New Game modal | DONE | `src/ui/landing/NewGameModal.tsx` | SectorScale, seed phrases, factions |
| Settings modal | DONE | `src/ui/landing/SettingsModal.tsx` | Audio, keybindings, accessibility |
| HUD | DONE | `src/ui/game/HUD.tsx` | Turn, 13-material resource counters, AP, End Turn |
| Radial menu | DONE | `src/systems/radialMenu.ts` | Dual-ring state machine + SVG renderer |
| Board input | DONE | `src/input/BoardInput.tsx` | Click-to-select, click-to-move, click-to-attack |
| Camera | DONE | `src/camera/IsometricCamera.tsx` | CivRev2-style fixed angle, FOV=45, WASD pan |
| Garage modal | DONE | `src/ui/game/GarageModal.tsx` | Two-step fabrication: Classification → Specialization |
| Info panels | DONE | `src/ui/game/` | Unit info, building info, tile info |
| Observer mode | DONE | `src/ui/game/` | AI-vs-AI spectator |
| Dev console | DONE | `src/ui/game/` | Debug controls |
| Minimap | DONE | `src/ui/game/` | Territory visualization |
| Turn log | DONE | `src/ui/game/` | Per-turn event display |
| Tooltips | DONE | `src/ui/game/` | Hover information |
| Toast system | DONE | `src/ui/game/` | Notifications |

### Audio

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Tone.js synth | DONE | `src/audio/sfx.ts` | Synth pool + SFX playback |
| Ambient storm | DONE | `src/audio/ambience.ts` | Continuous storm loop |

---

## What's Not Working / Missing

| Gap | Impact | Notes |
|-----|--------|-------|
| Unified depth renderer | Visual polish | BiomeRenderer + DepthRenderer + MinedPitRenderer should merge |
| Fog gradient | Visual polish | Hard cutoff instead of radiating gradient |
| Storm dome tuning | Visual polish | Hypercane + wormhole atmosphere |
| Signal relay control limits | Gameplay | Relay towers don't limit unit control range |

---

## Known Issues

1. **`pending/` exclusion**: Excluded via tsconfig `exclude` + biome `ignore`. Confirmed clean.
2. **Koota world limit**: 16 worlds max per process. Test suites use `world.destroy()` in `afterEach`.
