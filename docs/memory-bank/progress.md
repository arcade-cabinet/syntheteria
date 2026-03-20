# Progress: Syntheteria (Ground-Up Rewrite)

> System-level status dashboard. **The old game is in `pending/` — do not reference it.**
> Run `pnpm test:vitest` to verify.

---

## Is the game done?

**Gameplay systems: yes. Rendering: pivoting.** All core gameplay systems are implemented and wired: economy, combat, AI GOAP, cultists with escalation, specialization tracks, tech tree, victory conditions, diplomacy, territory, save/load, audio. The rendering stack is pivoting from R3F to **Phaser + enable3d** (validated via POC). Package restructuring is in progress before the rendering overhaul begins. See `docs/RENDERING_VISION.md` for the full rendering design target.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Active `.ts`/`.tsx` files under `src/` | 465 |
| Vitest test files | 146 (all passing) |
| Vitest tests | 2487 |
| TypeScript errors | 0 |
| Biome errors | 0 |
| GLB models in public/ | 360 |
| Config definition files | 11 (`src/config/`) |
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
| Labyrinth generator | DONE | `src/board/labyrinth*.ts` | Rooms-and-Mazes + abyssal zones + maze corridors + features |
| BSP city layout | DONE | `src/board/cityLayout.ts` | Walls, corridors, doorways, 5 district zones |
| Connectivity guarantee | DONE | `src/board/connectivity.ts` | Flood-fill + corridor punching |

### Sphere World

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Sphere geometry | DONE | `src/rendering/boardGeometry.ts` | `buildSphereGeometry()` — equirectangular tile grid → sphere |
| Sphere radius | DONE | `src/rendering/boardGeometry.ts` | `sphereRadius(W, H)` — board dims → radius |
| Tile → sphere position | DONE | `src/rendering/boardGeometry.ts` | `tileToSpherePos()` — grid coords → 3D |
| Sphere → tile inverse | DONE | `src/rendering/boardGeometry.ts` | `spherePosToTile()` — raycast hit → tile coords |
| SphereOrbitCamera | DONE | `src/camera/SphereOrbitCamera.tsx` | Orbit around sphere center, WASD rotates globe |
| Sphere model placement | DONE | `src/rendering/spherePlacement.ts` | Position + quaternion for models tangent to sphere |
| Sphere fog of war GLSL | DONE | `src/rendering/glsl/fogOfWarSphere*.glsl` | BFS distance on sphere surface |
| Cutaway clip plane | WIP | `src/rendering/CutawayClipPlane.tsx` | Dollhouse zoom — descend through layers |
| Cutaway store | DONE | `src/camera/cutawayStore.ts` | Cutaway state management |
| LOD system | DONE | `src/rendering/LodGlobe.tsx` | Procedural shader at far zoom, PBR atlas at close |
| Strategic zoom | DONE | `src/rendering/` | Seamless surface-to-globe zoom (Supreme Commander style) |

### Globe / Title Screen

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Globe component | DONE | `src/ui/Globe.tsx` | ONE persistent Canvas across all phases |
| Phase state machine | DONE | `src/main.tsx` | title → setup → generating → playing |
| Title globe animation | DONE | `src/ui/Globe.tsx` | Growth 0.3→1, shader-based |
| Title text (curved) | DONE | `src/ui/Globe.tsx` | Drei Text chars arranged in arc |
| Title camera zoom | DONE | `src/ui/Globe.tsx` | Far orbit → surface approach during generating |
| Globe shaders | DONE | `src/rendering/globe/shaders.ts` | Vertex + fragment shaders for animated globe |
| GlobeWithCities | DONE | `src/rendering/globe/GlobeWithCities.tsx` | City structures on title globe |
| Storm clouds | DONE | `src/rendering/globe/StormClouds.tsx` | Persistent across all phases |
| Hypercane | DONE | `src/rendering/globe/Hypercane.tsx` | Persistent across all phases |
| Lightning effect | DONE | `src/rendering/globe/LightningEffect.tsx` | Persistent across all phases |

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
| Build system | DONE | `src/ecs/systems/buildSystem.ts` | Command UI (today: legacy radial) → select → check cost → place |
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
| AI track selection | DONE | `src/ai/trackSelection.ts` | Per-faction preferences |
| Settlement production | **Partial** | `GarageModal.tsx` (legacy) | **Target:** city modal — full queue, reorder, 4X priorities (`GAME_DESIGN.md` §5) |
| Mark progression | DONE | `src/ecs/robots/marks.ts` | Mark I-V with specialization abilities |

### Buildings / Salvage / Cult

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 15 faction buildings | DONE | `src/ecs/buildings/definitions.ts` | BUILDING_DEFS — TypeScript const with build costs |
| 6 cult structures | DONE | `src/ecs/buildings/cultStructures.ts` | breach_altar, signal_corruptor, human_shelter, corruption_node, cult_stronghold, bio_farm |
| 10 salvage types | DONE | `src/ecs/resources/salvageTypes.ts` | container, terminal, vessel, machinery, debris, cargo_crate, storage_rack, power_cell, landing_wreck, abyssal_relic |
| Building placement | DONE | `src/ecs/systems/buildSystem.ts` | Command UI → select structure → check cost → place |
| Building power systems | DONE | `src/ecs/systems/powerSystem.ts` + 5 systems | All building types have active gameplay effects |
| Salvage mapgen | DONE | `src/ecs/systems/salvagePlacement.ts` | Scatter salvage entities during mapgen |

### Tech Tree

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 27 techs (5 tiers) | DONE | `src/config/techTreeDefs.ts` | 15 base + 12 track-gating techs |
| Research system | DONE | `src/ecs/systems/researchSystem.ts` | Research labs accumulate points |
| Tech prerequisites | DONE | `src/config/techTreeDefs.ts` | DAG with prereq chains |
| Tech UI | DONE | `src/ui/game/TechTreeOverlay.tsx` | Full DAG visualization with research progress |

### AI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Yuka GOAP | DONE | `src/ai/` | Think/GoalEvaluator with characterBias |
| Fuzzy logic | DONE | `src/ai/fuzzy/situationModule.ts` | Situation assessment module |
| Faction memory | DONE | `src/ai/perception/factionMemory.ts` | Perception memory for sighted units |
| NavGraph A* | DONE | `src/ai/navigation/boardNavGraph.ts` | Pathfinding graph for AI |
| Territory triggers | DONE | `src/ai/triggers/territoryTrigger.ts` | Respond to territory changes |
| Track selection | DONE | `src/ai/trackSelection.ts` | Per-faction specialization preferences |
| Goal evaluators | DONE | `src/ai/goals/evaluators.ts` | GOAP goal evaluation |
| AI agents | DONE | `src/ai/agents/SyntheteriaAgent.ts` | Agent entity definition |
| AI runtime | DONE | `src/ai/runtime/AIRuntime.ts` | Runtime orchestration |
| Yuka turn system | DONE | `src/ai/yukaAiTurnSystem.ts` | Per-turn AI execution |

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
| **Phaser + enable3d stack** | VALIDATED | `poc-roboforming.html` | POC proved vertex colors + flat shading + lighting = CivRev2-tier visuals |
| **Rendering vision doc** | DONE | `docs/RENDERING_VISION.md` | All POC findings, gaps, and design targets |
| **POC artifacts** | REFERENCE | `poc-roboforming.html`, `poc.html`, `poc_real_world.html`, `poc-isometric.html` | Prototype files — not production code |
| **New deps** | ADDED | `package.json` | `phaser@3.90.0`, `@enable3d/phaser-extension@0.26.1` |
| Sphere placement | DONE | `src/rendering/spherePlacement.ts` | Model position + orientation on sphere surface |
| Board geometry | DONE | `src/rendering/boardGeometry.ts` | Both flat (legacy) and sphere geometry |
| Depth layer stack | DONE | `src/rendering/depthLayerStack.ts` | Depth stacking utilities |
| Depth mapped layer | DONE | `src/rendering/depthMappedLayer.ts` | Mapped layer utilities |
| Height material | DONE | `src/rendering/heightMaterial.ts` | Height-based material |
| Model paths | DONE | `src/rendering/modelPaths.ts` | GLB model path resolution |
| Tile visibility | DONE | `src/rendering/tileVisibility.ts` | Fog-gated tile visibility |
| Chronometry | DONE | `src/rendering/sky/chronometry.ts` | Turn to time (day/night + seasons) |
| Wall classification | DONE | `src/rendering/labyrinth/wallClassification.ts` | Wall type identification |
| GLSL shaders | DONE | `src/rendering/glsl/` | fogOfWar (flat+sphere), height shaders |
| Globe shaders | DONE | `src/rendering/globe/shaders.ts` | Globe vertex/fragment shaders |

### View — R3F (title / generating globe + legacy match stack)

Used by `src/ui/Globe.tsx` for **title → generating**. Legacy **match** R3F components below are
candidates for removal after Phaser parity; see `src/views/` for the playing-phase board.

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Board renderer | LEGACY | `src/view/renderers/BoardRenderer.tsx` | Pre-Phaser match terrain |
| Biome renderer | LEGACY | `src/view/renderers/BiomeRenderer.tsx` | |
| Unified terrain | LEGACY | `src/view/renderers/UnifiedTerrainRenderer.tsx` | |
| Unit renderer | LEGACY | `src/view/renderers/UnitRenderer.tsx` | |
| Building renderer | LEGACY | `src/view/renderers/BuildingRenderer.tsx` | |
| Salvage renderer | LEGACY | `src/view/renderers/SalvageRenderer.tsx` | |
| Structure renderer | LEGACY | `src/view/renderers/StructureRenderer.tsx` | |
| Storm sky | DONE | `src/view/renderers/StormSky.tsx` | Globe / generating sky |
| LOD globe | DONE | `src/view/renderers/LodGlobe.tsx` | Title procedural + PBR |
| Illuminator | DONE | `src/view/renderers/IlluminatorRenderer.tsx` | |
| Infrastructure | LEGACY | `src/view/renderers/InfrastructureRenderer.tsx` | |
| Cult domes | LEGACY | `src/view/renderers/CultDomeRenderer.tsx` | |
| Fragment renderer | LEGACY | `src/view/renderers/FragmentRenderer.tsx` | |
| Cutaway clip plane | WIP | `src/view/renderers/CutawayClipPlane.tsx` | |
| Highlight renderer | LEGACY | `src/view/overlays/HighlightRenderer.tsx` | |
| Fog of war | LEGACY | `src/view/overlays/FogOfWarRenderer.tsx` | |
| Territory overlay | LEGACY | `src/view/overlays/TerritoryOverlayRenderer.tsx` | |
| Path renderer | LEGACY | `src/view/overlays/PathRenderer.tsx` | Preview state in `src/rendering/pathPreview.ts` |
| Combat effects | LEGACY | `src/view/effects/CombatEffectsRenderer.tsx` | |
| Speech bubbles | LEGACY | `src/view/effects/SpeechBubbleRenderer.tsx` | |
| Particle system | LEGACY | `src/view/effects/ParticleRenderer.tsx` | |
| Unit status bars | LEGACY | `src/view/UnitStatusBars.tsx` | |
| Model error boundary | DONE | `src/view/ModelErrorBoundary.tsx` | Globe GLB fallback |
| Globe renderers | DONE | `src/view/globe/` | GlobeWithCities, Hypercane, StormClouds, Lightning, TitleText |

### Views — Phaser + enable3d (playing phase)

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Game factory | DONE | `src/views/createGame.ts` | Phaser.Game + enable3d |
| World scene | DONE | `src/views/scenes/WorldScene.ts` | Scene3D, camera, sync |
| Event bus | DONE | `src/views/eventBus.ts` | React ↔ Phaser |
| Terrain | DONE | `src/views/renderers/terrainRenderer.ts` | Vertex colors, flat shading |
| Units / buildings / salvage / structures | DONE | `src/views/renderers/*Renderer.ts` | GLB + bob-and-weave |
| Fog / highlights / territory | DONE | `fogRenderer`, `highlightRenderer`, `territoryRenderer` | |
| Ocean / vegetation | DONE | `oceanRenderer.ts`, `vegetationRenderer.ts` | |
| Combat / speech / particles | DONE | `combatEffects`, `speechRenderer`, `particleRenderer` | |
| Roboforming overlay | DONE | `src/views/renderers/roboformOverlay.ts` | |
| Epoch atmosphere | DONE | `src/views/lighting/epochAtmosphere.ts` | |
| World lighting | DONE | `src/views/lighting/worldLighting.ts` | POC recipe |
| Board input | DONE | `src/views/input/boardInput.ts` | Pointer → tile |
| DOM labels | DONE | `src/views/labels/domLabels.ts` | |
| React bridge | DONE | `src/app/GameBoard.tsx` | Sole Phaser mount |

### UI / Input

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Globe (title + generating) | DONE | `src/ui/Globe.tsx` | R3F Canvas for title through generating; **playing** uses `GameBoard` + `src/views/` |
| Landing screen | DONE | `src/ui/landing/LandingScreen.tsx` | Title + New Game + Continue + Settings |
| New Game modal | DONE | `src/ui/landing/NewGameModal.tsx` | SectorScale, seed phrases, factions |
| Settings modal | DONE | `src/ui/landing/SettingsModal.tsx` | Audio, keybindings, accessibility |
| Title scene | DONE | `src/ui/landing/title/` | Title menu components |
| GameScreen | LEGACY | `src/ui/game/GameScreen.tsx` | Old separate Canvas — superseded by Globe.tsx |
| HUD | DONE | `src/ui/game/HUD.tsx` | Turn, 13-material resource counters, AP, End Turn |
| Radial menu (legacy) | DONE / superseded | `src/systems/radialMenu.ts`, `RadialMenu.tsx` | Replace with Civ VI–style command UI per `GAME_DESIGN.md` §9 |
| Board input (playing) | DONE | `src/views/input/boardInput.ts` | Phaser pointer → tile, EventBus |
| Board input (legacy R3F) | LEGACY | `src/input/BoardInput.tsx` | Globe / old match only |
| Camera (sphere orbit) | DONE | `src/camera/SphereOrbitCamera.tsx` | Orbit around sphere, polar clamped, WASD orbit |
| GarageModal.tsx (shim) | Partial | `src/ui/game/GarageModal.tsx` | Fold into settlement city screen — queue + priorities (`GAME_DESIGN.md` §5; see Robot Specializations table) |
| Diplomacy overlay | DONE | `src/ui/game/DiplomacyOverlay.tsx` | Faction standings panel |
| Tech tree overlay | DONE | `src/ui/game/TechTreeOverlay.tsx` | Full DAG with research progress |
| Unit roster overlay | DONE | `src/ui/game/UnitRosterOverlay.tsx` | All player units with quick-jump |
| Selected info | DONE | `src/ui/game/SelectedInfo.tsx` | Unit/building/tile info panel |
| Entity tooltip | DONE | `src/ui/game/EntityTooltip.tsx` | Hover information |
| Minimap | DONE | `src/ui/game/Minimap.tsx` | Territory visualization |
| Turn log | DONE | `src/ui/game/TurnLog.tsx` | Per-turn event display |
| Turn summary | DONE | `src/ui/game/TurnSummaryPanel.tsx` | End-of-turn recap |
| Turn phase overlay | DONE | `src/ui/game/TurnPhaseOverlay.tsx` | Phase transition display |
| Toast system | DONE | `src/ui/game/ToastStack.tsx` + `SystemToasts.tsx` | Notifications |
| Alert bar | DONE | `src/ui/game/AlertBar.tsx` | Off-screen event alerts |
| Tutorial overlay | DONE | `src/ui/game/TutorialOverlay.tsx` | 5-step guided onboarding |
| Game outcome | DONE | `src/ui/game/GameOutcomeOverlay.tsx` | Victory/defeat screen |
| Pause menu | DONE | `src/ui/game/PauseMenu.tsx` | Pause/save/quit |
| Keybind hints | DONE | `src/ui/game/KeybindHints.tsx` | Keyboard shortcut reference |
| Pending completions | DONE | `src/ui/game/PendingCompletions.tsx` | Fabrication queue display |
| Hover tracker | DONE | `src/ui/game/HoverTracker.tsx` | Mouse hover state tracking |
| Fatal error modal | DONE | `src/ui/FatalErrorModal.tsx` | Error recovery UI |
| Icons | DONE | `src/ui/icons.tsx` | UI icon components |

### Audio

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Audio engine | DONE | `src/audio/audioEngine.ts` | Core audio system |
| Tone.js synth | DONE | `src/audio/sfx.ts` | Synth pool + SFX playback |
| Ambient storm | DONE | `src/audio/ambience.ts` | Continuous storm loop |

---

## What's Not Working / Missing

| Gap | Impact | Notes |
|-----|--------|-------|
| Rendering stack migration | Major | R3F → Phaser + enable3d. POC validated, migration not started. Package restructuring first. |
| Terrain blending | Visual | Hard tile boundaries. Need vertex color edge interpolation. See `docs/RENDERING_VISION.md`. |
| Forest canopy | Visual | Scattered trees → need canopy blob mesh. See `docs/RENDERING_VISION.md`. |
| Elevation drama | Visual | Smooth noise → need chunky discrete platforms. See `docs/RENDERING_VISION.md`. |
| Ocean layers | Visual | Need open ocean + grid-covered metallic grating. See `docs/RENDERING_VISION.md`. |
| Production bundle 324MB | Deploy concern | GLB models (145MB) copied to dist. JS: index=1.85MB, sql-asm=1.3MB. Use CDN for GLBs. |
| pending/ directory 252MB | Accepted tech debt | Quarantined reference code, excluded from tsconfig + biome. Not to be deleted. |

---

## Known Issues

1. **`pending/` exclusion**: Excluded via tsconfig `exclude` + biome `ignore`. Confirmed clean. Accepted tech debt — kept as reference.
2. **Koota world limit**: 16 worlds max per process. Test suites use `world.destroy()` in `afterEach`.
3. **Production bundle**: 324MB dist (145MB GLBs + large JS chunks). Deploy concern — use CDN for models in production.
