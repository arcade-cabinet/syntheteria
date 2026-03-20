# Progress: Syntheteria (Ground-Up Rewrite)

> System-level status dashboard. **The old game is in `pending/` — do not reference it.**
> Run `pnpm test:vitest` to verify.

---

## Is the game done?

**Gameplay systems: yes. Presentation: Phaser + enable3d (board) + R3F (title globe).** Core systems are implemented and wired. **`src/rendering/` is deleted** — sphere/title assets live under `src/views/title/` and `src/board/sphere/`; match board under `src/views/board/`. See `docs/RENDERING_VISION.md` for visual targets.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Active `.ts`/`.tsx` files under `src/` | 443 (`find src -name '*.ts' -o -name '*.tsx' \| wc -l`) |
| Vitest test files | 126 (all passing) |
| Vitest tests | 2252 |
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
| Overworld generator | DONE | `src/board/generator.ts` | **Biome + noise** overworld (industrial-only presentation **LEGACY** where still present) |
| Noise + elevation | DONE | `src/board/noise.ts` | Seeded RNG + noise for terrain |
| BFS adjacency | DONE | `src/board/adjacency.ts` | 4-dir passable neighbors, reachable BFS, A* path |
| GridApi | DONE | `src/board/grid.ts` | Addressable grid API |
| Labyrinth / depth underground | **REMOVED** | — | Deleted with pivot to overworld-only; no `labyrinth*.ts`, no `depth.ts` |
| 9 terrain substrates | DONE / LEGACY | `src/terrain/types.ts` | FloorType + FLOOR_DEFS — industrial palette **LEGACY** vs biome target in design doc |
| Resource taxonomy | DONE | `src/terrain/types.ts`, `src/config/resources/` | Natural → processed → synthetic progression (**TARGET**); legacy industrial labels may remain in comments |
| PBR texture atlas | DONE | `src/terrain/floorShader.ts` | AmbientCG atlas (5 maps: color, normal, roughness, metalness, opacity) |
| BSP / city layout / connectivity | **REMOVED** | — | Old labyrinth-era mapgen deleted |

### Sphere World

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Sphere geometry | DONE | `src/board/sphere/boardGeometry.ts` | `buildSphereGeometry()` — equirectangular tile grid → sphere |
| Sphere radius | DONE | `src/board/sphere/boardGeometry.ts` | `sphereRadius(W, H)` — board dims → radius |
| Tile → sphere position | DONE | `src/board/sphere/boardGeometry.ts` | `tileToSpherePos()` — grid coords → 3D |
| Sphere → tile inverse | DONE | `src/board/sphere/boardGeometry.ts` | `spherePosToTile()` — raycast hit → tile coords |
| SphereOrbitCamera | DONE | `src/camera/SphereOrbitCamera.tsx` | Orbit around sphere center, WASD rotates globe |
| Sphere model placement | DONE | `src/board/sphere/spherePlacement.ts` | Position + quaternion for models tangent to sphere |
| Sphere fog of war GLSL | DONE | `src/views/title/glsl/fogOfWarSphere*.glsl` | BFS distance on sphere surface |
| Cutaway clip plane | WIP | `src/views/title/renderers/CutawayClipPlane.tsx` | Dollhouse zoom — descend through layers |
| Cutaway store | DONE | `src/camera/cutawayStore.ts` | Cutaway state management |
| LOD system | DONE | `src/views/title/renderers/LodGlobe.tsx` | Procedural shader at far zoom, PBR atlas at close |
| Strategic zoom | DONE | `src/views/title/` + `src/ui/Globe.tsx` | Seamless surface-to-globe zoom (title flow) |

### Globe / Title Screen

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Globe component | DONE | `src/ui/Globe.tsx` | ONE persistent Canvas across all phases |
| Phase state machine | DONE | `src/main.tsx` | title → setup → generating → playing |
| Title globe animation | DONE | `src/ui/Globe.tsx` | Growth 0.3→1, shader-based |
| Title text (curved) | DONE | `src/ui/Globe.tsx` | Drei Text chars arranged in arc |
| Title camera zoom | DONE | `src/ui/Globe.tsx` | Far orbit → surface approach during generating |
| Globe shaders | DONE | `src/views/title/globe/shaders.ts` | Vertex + fragment shaders for animated globe |
| GlobeWithCities | DONE | `src/views/title/globe/GlobeWithCities.tsx` | Structures on title globe |
| Storm clouds | DONE | `src/views/title/globe/StormClouds.tsx` | Persistent across all phases |
| Hypercane | DONE | `src/views/title/globe/Hypercane.tsx` | Persistent across all phases |
| Lightning effect | DONE | `src/views/title/globe/LightningEffect.tsx` | Persistent across all phases |

### ECS (Koota)

**Paths:** Game logic lives under `src/systems/`, `src/traits/`, `src/robots/`, `src/factions/` (Koota — not a monolithic `src/ecs/` package).

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| World init | DONE | `src/init-world.ts` | Board singleton, tiles, resources, factions, robots |
| Core traits | DONE | `src/traits/` | board, tile, unit, faction, resource, building, salvage, cult |
| 9 robot archetypes | DONE | `src/robots/` | 6 faction roles + 3 cult mechs |
| Placement flags | DONE | `src/robots/placement.ts` | Min 2-tile spread, 10-tile search radius |
| 5 factions | DONE | `src/factions/definitions.ts` | player, reclaimers, volt_collective, signal_choir, iron_creed |
| 3 cults | DONE | `src/factions/cults.ts` | static_remnants, null_monks, lost_signal |
| Faction relations | DONE | `src/factions/relations.ts` | setRelation, getRelation, isHostile |
| Movement system | DONE | `src/systems/movementSystem.ts` | Lerp UnitMove → set UnitPos, deduct AP |
| Highlight system | DONE | `src/systems/highlightSystem.ts` | BFS reachable → TileHighlight |
| Turn system | DONE | `src/systems/turnSystem.ts` | Multi-phase: player → AI → attacks → env → new turn |
| Attack system | DONE | `src/systems/attackSystem.ts` | damage = attack - defense (min 1), destroy at 0 HP |
| Harvest system | DONE | `src/systems/harvestSystem.ts` | Tick-down, yield to faction pool, depletion |
| Resource system | DONE | `src/systems/resourceSystem.ts` | ResourcePool per faction CRUD |
| AI turn system | DONE | `src/systems/aiTurnSystem.ts` | Yuka GOAP with faction personalities |
| Cultist system | DONE | `src/systems/cultistSystem.ts` | 3 escalation stages, per-sect GOAP, POI spawning |
| Power grid system | DONE | `src/systems/powerSystem.ts` | Transmitters charge boxes, consumers draw, Powered trait |
| Turret system | DONE | `src/systems/turretSystem.ts` | Powered turrets auto-attack nearest hostile, cooldown |
| Signal system | DONE | `src/systems/signalSystem.ts` | Relay tower chained coverage, scanRange penalty |
| Repair system | DONE | `src/systems/repairSystem.ts` | Powered maintenance bays heal friendly units +2 HP |
| Fabrication system | DONE | `src/systems/fabricationSystem.ts` | Motor pool bot queue, resource cost, tick-down, spawn |
| Synthesis system | DONE | `src/systems/synthesisSystem.ts` | Synthesizer fusion recipes, common → advanced materials |
| Floor mining system | DONE | `src/systems/floorMiningSystem.ts` | DAISY pattern, deep mining tech +50% yield, pit creation |
| Specialization system | DONE | `src/systems/specializationSystem.ts` | Aura passives: regen, scan boost, attack buff, defense buff |
| Cult mutation system | DONE | `src/systems/cultMutation.ts` | 4-tier time-based: buffs → abilities → aberrant |
| Victory system | DONE | `src/systems/victorySystem.ts` | **6** win paths + elimination defeat (turn-cap score uses `scoreSystem`) |
| Territory system | DONE | `src/systems/territorySystem.ts` | Faction tile painting |
| Population system | DONE | `src/systems/populationSystem.ts` | Population cap enforcement |
| Resource renewal | DONE | `src/systems/resourceRenewalSystem.ts` | Resource deposit regeneration |
| Experience system | DONE | `src/systems/experienceSystem.ts` | XP tracking, mark level progression |
| Research system | DONE | `src/systems/researchSystem.ts` | Tech tree progression, research labs |
| Building upgrade system | DONE | `src/systems/buildingUpgradeSystem.ts` | Per-building tier jobs, unlock chains |
| Analysis system | DONE | `src/systems/analysisSystem.ts` | Acceleration for queued building upgrades |
| Score system | DONE | `src/systems/scoreSystem.ts` | Weighted faction score (turn-cap victory) |
| Upgrade system | DONE | `src/systems/upgradeSystem.ts` | Mark level upgrades (units) |
| Diplomacy system | DONE | `src/systems/diplomacySystem.ts` | Granular standings (-100 to +100) |
| Hacking system | DONE | `src/systems/hackingSystem.ts` | Hack enemy units/buildings |
| Build system | DONE | `src/systems/buildSystem.ts` | Build placement flow → check cost → place |
| Building placement | DONE | `src/systems/buildingPlacement.ts` | Adjacency and cost validation |
| Fog reveal system | DONE | `src/systems/fogRevealSystem.ts` | Per-unit scan radius fog |
| Toast notifications | DONE | `src/systems/toastNotifications.ts` | In-game toast messages |
| Turn event log | DONE | `src/systems/turnEventLog.ts` | Per-turn event history |
| Tutorial system | DONE | `src/systems/tutorialSystem.ts` | First-time player guidance |
| Memory fragments | DONE | `src/systems/memoryFragments.ts` | Lore discovery system |
| Resource delta | DONE | `src/systems/resourceDeltaSystem.ts` | Income/expense tracking |
| Campaign stats | DONE | `src/systems/campaignStats.ts` | Cross-game statistics |
| Analytics collector | DONE | `src/systems/analyticsCollector.ts` | Gameplay data collection |
| Speech triggers | DONE | `src/systems/speechTriggers.ts` | Context-sensitive dialogue |
| Speech bubble store | DONE | `src/systems/speechBubbleStore.ts` | Bubble state management |
| Turn summary | DONE | `src/systems/turnSummary.ts` | End-of-turn recap |
| Wormhole project | DONE | `src/systems/wormholeProject.ts` | 20-turn construction for wormhole victory |
| Hacking types | DONE | `src/systems/hackingTypes.ts` | Hacking action definitions |

### Robot Specializations

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Track registry | DONE | `src/robots/specializations/trackRegistry.ts` | 14 tracks across 6 classes |
| Scout tracks | DONE | `src/robots/specializations/scoutTracks.ts` | Pathfinder + Infiltrator |
| Infantry tracks | DONE | `src/robots/specializations/infantryTracks.ts` | Vanguard + Shock Trooper |
| Cavalry tracks | DONE | `src/robots/specializations/cavalryTracks.ts` | Flanker + Interceptor |
| Ranged tracks | DONE | `src/robots/specializations/rangedTracks.ts` | Sniper + Suppressor |
| Support tracks | DONE | `src/robots/specializations/supportTracks.ts` | Field Medic + Signal Booster + War Caller |
| Worker tracks | DONE | `src/robots/specializations/workerTracks.ts` | Deep Miner + Fabricator + Salvager |
| Per-class actions | DONE | `src/robots/classActions.ts` | Unique action sets per class + track actions |
| AI track selection | DONE | `src/ai/trackSelection.ts` | Per-faction preferences |
| Settlement production | **Partial** | `GarageModal.tsx` (legacy) | **Target:** city modal — full queue, reorder, 4X priorities (`GAME_DESIGN.md` §5) |
| Mark progression | DONE | `src/robots/marks.ts` | Mark I-V with specialization abilities |

### Buildings / Salvage / Cult

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 15 faction buildings | DONE | `src/config/buildings/definitions.ts` | BUILDING_DEFS — TypeScript const with build costs |
| 6 cult structures | DONE | `src/config/buildings/cultStructures.ts` | breach_altar, signal_corruptor, human_shelter, corruption_node, cult_stronghold, bio_farm |
| 10 salvage types | DONE | `src/config/resources/salvageTypes.ts` | container, terminal, vessel, machinery, debris, cargo_crate, storage_rack, power_cell, landing_wreck, abyssal_relic |
| Building placement | DONE | `src/systems/buildSystem.ts` | Command UI → select structure → check cost → place |
| Building power systems | DONE | `src/systems/powerSystem.ts` + 5 systems | All building types have active gameplay effects |
| Salvage mapgen | DONE | `src/systems/salvagePlacement.ts` | Scatter salvage entities during mapgen |

### Tech Tree

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| 27 techs (5 tiers) | DONE / **LEGACY** sim data | `src/config/techTreeDefs.ts` | 15 base + 12 track-gating techs — still drives research effects; **player-facing tree superseded** by building progression |
| Research system | DONE | `src/systems/researchSystem.ts` | Research labs accumulate points |
| Tech prerequisites | DONE | `src/config/techTreeDefs.ts` | DAG with prereq chains |
| Centralized tech tree UI | **LEGACY** | `src/ui/game/TechTreeOverlay.tsx` | Re-exports **BuildingProgressionOverlay** — use building-driven UI |
| Building progression UI | DONE | `src/ui/game/BuildingProgressionOverlay.tsx` | Unlocks + tiers (primary progression surface) |

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

### Mobile / CI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Capacitor | DONE | `capacitor.config.ts`, `android/`, `ios/` | Android + iOS + Web targets |
| CI/CD | DONE | `.github/workflows/` | Includes Android debug APK build job |

### Persistence

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| SQLite schema | DONE | `src/db/schema.ts` | meta, games, tiles, tile_resources, units, buildings, events |
| sql.js adapter | DONE | `src/db/adapter.ts` | Pure JS, no wasm |
| GameRepo | DONE | `src/db/gameRepo.ts` | createGame, saveTiles, listGames, getGame, loadTiles |
| DB init on mount | DONE | `src/main.tsx` | Async init, savedGames → LandingScreen |
| Save/load | DONE | `src/db/` | Fixed for BSP generator, unit identity, auto-save |
| Serialization | DONE | `src/db/serialize.ts` | World state → DB round-trip |

### Rendering (`src/rendering/` **DELETED** — 2026-03)

Former `rendering/` concerns now live in **`src/board/sphere/`**, **`src/config/models.ts`**, **`src/views/title/`** (globe, GLSL, materials), **`src/lib/particles/`**, **`src/lib/fog/`**, **`src/lib/chronometry.ts`**, **`src/input/pathPreview.ts`**. Labyrinth-only helpers (e.g. wall classification) removed with underground deletion.

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| **Phaser + enable3d stack** | VALIDATED | `poc-roboforming.html` | POC proved vertex colors + flat shading + lighting = CivRev2-tier visuals |
| **Rendering vision doc** | DONE | `docs/RENDERING_VISION.md` | All POC findings, gaps, and design targets |
| **POC artifacts** | REFERENCE | `poc-roboforming.html`, `poc.html`, `poc_real_world.html`, `poc-isometric.html` | Prototype files — not production code |
| **New deps** | ADDED | `package.json` | `phaser@3.90.0`, `@enable3d/phaser-extension@0.26.1` |
| Sphere placement | DONE | `src/board/sphere/spherePlacement.ts` | Model position + orientation on sphere surface |
| Board / sphere geometry | DONE | `src/board/sphere/boardGeometry.ts` | Equirectangular tile grid ↔ sphere |
| Height material | DONE | `src/views/title/materials/heightMaterial.ts` | Height-based material |
| Model paths | DONE | `src/config/models.ts` | GLB model path resolution |
| Tile visibility | DONE | `src/lib/fog/tileVisibility.ts` | Fog-gated tile visibility |
| Unit detection (fog) | DONE | `src/lib/fog/unitDetection.ts` | Visibility helpers |
| Chronometry | DONE | `src/lib/chronometry.ts` | Turn to time (day/night + seasons) |
| Path preview (input) | DONE | `src/input/pathPreview.ts` | Move preview state |
| Particles | DONE | `src/lib/particles/` | Particle pool + events |
| GLSL shaders | DONE | `src/views/title/glsl/` | fogOfWar sphere, height shaders |
| Globe shaders | DONE | `src/views/title/globe/shaders.ts` | Globe vertex/fragment shaders |

### View — R3F title (`src/views/title/`; `src/view/` **deleted**)

Used by `src/ui/Globe.tsx` for **title → generating → playing** (R3F subtree for globe + match overlay). **`src/view/`** was removed; all paths below are under **`src/views/title/`**. **Playing** terrain/units are primarily **Phaser** (`src/views/board/`); R3F renderers below include legacy overlap and title-specific globe content.

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Board renderer | LEGACY / overlap | `src/views/title/renderers/BoardRenderer.tsx` | Sphere board mesh — Phaser board is source of truth for match |
| Biome renderer | LEGACY | `src/views/title/renderers/BiomeRenderer.tsx` | |
| Unified terrain | LEGACY | `src/views/title/renderers/UnifiedTerrainRenderer.tsx` | |
| Unit renderer | LEGACY | `src/views/title/renderers/UnitRenderer.tsx` | |
| Building renderer | LEGACY | `src/views/title/renderers/BuildingRenderer.tsx` | |
| Salvage renderer | LEGACY | `src/views/title/renderers/SalvageRenderer.tsx` | |
| Structure renderer | LEGACY | `src/views/title/renderers/StructureRenderer.tsx` | |
| Storm sky | DONE | `src/views/title/renderers/StormSky.tsx` | Globe / generating sky |
| LOD globe | DONE | `src/views/title/renderers/LodGlobe.tsx` | Title procedural + PBR |
| Illuminator | DONE | `src/views/title/renderers/IlluminatorRenderer.tsx` | |
| Infrastructure | LEGACY | `src/views/title/renderers/InfrastructureRenderer.tsx` | |
| Cult domes | LEGACY | `src/views/title/renderers/CultDomeRenderer.tsx` | |
| Fragment renderer | LEGACY | `src/views/title/renderers/FragmentRenderer.tsx` | |
| Cutaway clip plane | WIP | `src/views/title/renderers/CutawayClipPlane.tsx` | |
| Highlight renderer | LEGACY | `src/views/title/overlays/HighlightRenderer.tsx` | |
| Fog of war | LEGACY | `src/views/title/overlays/FogOfWarRenderer.tsx` | |
| Territory overlay | LEGACY | `src/views/title/overlays/TerritoryOverlayRenderer.tsx` | |
| Path renderer | LEGACY | `src/views/title/overlays/PathRenderer.tsx` | Preview wiring → `src/input/pathPreview.ts` |
| Combat effects | LEGACY | `src/views/title/effects/CombatEffectsRenderer.tsx` | |
| Speech bubbles | LEGACY | `src/views/title/effects/SpeechBubbleRenderer.tsx` | |
| Particle system | LEGACY | `src/views/title/effects/ParticleRenderer.tsx` | |
| Unit status bars | LEGACY | `src/views/title/UnitStatusBars.tsx` | |
| Model error boundary | DONE | `src/views/title/ModelErrorBoundary.tsx` | Globe GLB fallback |
| Globe renderers | DONE | `src/views/title/globe/` | GlobeWithCities, Hypercane, StormClouds, Lightning, TitleText |

### Views — Phaser + enable3d (`src/views/board/` — playing phase)

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Game factory | DONE | `src/views/board/createGame.ts` | Phaser.Game + enable3d |
| World scene | DONE | `src/views/board/scenes/WorldScene.ts` | Scene3D, camera, sync |
| Event bus | DONE | `src/views/board/eventBus.ts` | React ↔ Phaser |
| Terrain | DONE | `src/views/board/renderers/terrainRenderer.ts` | Vertex colors, flat shading |
| Units / buildings / salvage / structures | DONE | `src/views/board/renderers/*Renderer.ts` | GLB + bob-and-weave |
| Fog / highlights / territory | DONE | `fogRenderer`, `highlightRenderer`, `territoryRenderer` | |
| Ocean / vegetation | DONE | `oceanRenderer.ts`, `vegetationRenderer.ts` | |
| Combat / speech / particles | DONE | `combatEffects`, `speechRenderer`, `particleRenderer` | |
| Roboforming overlay | DONE | `src/views/board/renderers/roboformOverlay.ts` | |
| Epoch atmosphere | DONE | `src/views/board/lighting/epochAtmosphere.ts` | |
| World lighting | DONE | `src/views/board/lighting/worldLighting.ts` | POC recipe |
| Board input | DONE | `src/views/board/input/boardInput.ts` | Pointer → tile |
| DOM labels | DONE | `src/views/board/labels/domLabels.ts` | |
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
| Radial menu (legacy) | **LEGACY** | `src/systems/radialMenu.ts` | State machine **retained** for Vitest + diegetic specs; in-game radial UI **removed** — per-building modals are the command surface |
| Per-building modals | DONE | `src/ui/game/BuildingModal.tsx`, `src/ui/game/building-panels/` | BuildingModal dispatcher + 8 panels (Generic, Synthesizer, AnalysisNode, Power, Storage, Turret, Relay, Maintenance) |
| Building progression | DONE | `src/ui/game/BuildingProgressionOverlay.tsx` | Replaces TechTreeOverlay; shows unlock chains + tier status |
| Board input (playing) | DONE | `src/views/input/boardInput.ts` | Phaser pointer → tile, EventBus |
| Board input (legacy R3F) | LEGACY | `src/input/BoardInput.tsx` | Globe / old match only |
| Camera (sphere orbit) | DONE | `src/camera/SphereOrbitCamera.tsx` | Orbit around sphere, polar clamped, WASD orbit |
| GarageModal.tsx | DONE | `src/ui/game/GarageModal.tsx` | Motor Pool panel — routed through BuildingModal dispatcher |
| Diplomacy overlay | DONE | `src/ui/game/DiplomacyOverlay.tsx` | Faction standings panel |
| Tech tree overlay | **LEGACY** (redirect) | `src/ui/game/TechTreeOverlay.tsx` | Wraps `BuildingProgressionOverlay` |
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
| Phase 11.8 improvement overlays | Major (visual) | Roads/mines/irrigation → roboforming progression on Phaser board — see `ROADMAP.md` §11.8. |
| Phase 11.9 cultist scripted encounters | Content | Narrative beats not fully wired — see `ROADMAP.md` §11.9. |
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
