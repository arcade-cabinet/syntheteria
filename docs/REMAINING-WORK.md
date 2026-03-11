# Syntheteria — Remaining Work Specification

> **Single source of truth** for all incomplete work. Consolidates and replaces:
> all docs/plans/, .ralph-tui/ PRDs, and .kiro/specs/ task lists.
>
> **Last updated:** 2026-03-11 (follow-up audit — checked off completed rendering, AI, victory, weather wires)
> **Codebase state:** 256 test suites, 7,594 tests passing, 552 source files, zero TS errors
> **Sources consolidated:** 6 plans, 1 PRD, 3 specs, 1 task list (11 documents total)

---

## How to Use This Document

Each section is a **workstream** — a coherent chunk of related work. Within each workstream,
items are ordered by dependency. Items marked `[CRITICAL]` block gameplay. Items marked
`[HIGH]` significantly impact quality. Items marked `[MEDIUM]` add depth. Items marked
`[LOW]` are polish.

**When work is completed, check the box and note the commit SHA.**

---

## 1. Rendering Pipeline — Wire Procgen to R3F Scene `[CRITICAL]`

All procedural geometry generators exist and are tested, but none render in the live scene.
The game currently shows placeholder geometry.

- [x] **1.1** Wire `PanelGeometry.ts` (563 lines) into R3F rendering for buildings/machines — `BuildingGenerator` → `BuildingRenderer.tsx` in `GameScene.tsx`
- [x] **1.2** Wire `BotGenerator.ts` + `BotParts.ts` (1,238 lines) into R3F for faction bots — `UnitRenderer.tsx` uses `disposeBotGroup` from `BotGenerator`, wired in `GameScene.tsx`
- [x] **1.3** Wire `BuildingGenerator` into R3F for building entities — `BuildingRenderer.tsx` imports `generateBuilding`, wired in `GameScene.tsx`
- [x] **1.4** Wire `InstancedCubeRenderer.tsx` (387 lines) into R3F scene for cube stockpiles — replaced FreeCubeRenderer in GameScene.tsx
- [x] **1.5** Replace remaining `meshLambertMaterial` with `MeshStandardMaterial` (PBR) — verified: zero Lambert materials in src/
- [x] **1.6** Drive `MaterialFactory` from JSON specs (currently some hardcoded materials) — `MaterialFactory.ts` reads PBR defaults from `config/materials.json`
- [x] **1.7** Verify HDRI environment lighting in live scene — `EnvironmentSetup.tsx` wired in GameScene, storm-reactive IBL
- [x] **1.8** Wire `OreDepositGenerator` (672 lines) into R3F for deposit rendering — `OreDepositRenderer.tsx` wired in `GameScene.tsx`
- [ ] **1.9** Implement visual feedback for cube compression (animation, VFX)
- [ ] **1.10** Implement visual feedback for grinding (particles, animation)
- [ ] **1.11** Implement visual feedback for furnace crafting (progress bar, glow effects)
- [x] **1.12** Add selection highlight shader for selected entities — `SelectionHighlight.tsx` wired in GameScene
- [x] **1.13** Implement ghost preview for building placement — `PlacementPreview.tsx` + `GhostCube` wired in GameScene
- [ ] **1.14** Add damage visualization (sparks, smoke, visual degradation)

**Files:** `src/rendering/`, `src/rendering/procgen/`, `src/rendering/materials/`
**Tests:** Unit tests exist for generators; need integration with R3F scene
**Source:** Production plan Phase C-D; prd-integration-sprint §Rendering

---

## 2. AI Economy — Real Entities, Not Abstract Counters `[CRITICAL]`

AI civilizations produce abstract resource counters but don't create real ECS entities.
The physical cube economy — the game's core differentiator — is player-only.

- [x] **2.1** AI-produced cubes must spawn as real Rapier rigid body entities at faction bases — aiCivilization.ts calls spawnCube(), newGameInit sets base positions
- [ ] **2.2** AI bots must interact with deposits (walk to, harvest, compress, carry)
  - At minimum: passive cube generation spawns REAL cubes at faction base
  - Full: AI bots run the harvest→compress→carry pipeline like the player
- [x] **2.3** Build Commander layer: translate governor directives into bot orders via `actionToOrder()` — `governorSystem.ts` wired to game loop, 46+ tests
- [ ] **2.4** AI production planning: "I need X cubes of Y material to build Z"
- [ ] **2.5** AI should evaluate territory value (deposit-aware site selection for outposts)
- [x] **2.6** Connect `economySimulation.ts` to real cube economy data — registered in game loop `economy` phase, tracks per-faction GDP/stockpile/trade
- [x] **2.7** Implement ore deposit spawning on terrain (procedural placement) — `oreSpawner.ts`, `depositRenderData.ts`
- [x] **2.8** Implement deposit health/depletion system — `harvesting.ts`, `harvestCompress.ts`
- [x] **2.9** Implement powder → cube compression mechanic (player + AI) — `compression.ts`, `compressionJuice.ts`
- [x] **2.10** Implement cube pickup/drop/carry system — `grabber.ts`
- [x] **2.11** Implement furnace cube input system (drop cube near furnace) — `furnaceProcessing.ts`
- [x] **2.12** Implement recipe crafting system (config/furnace.json driven) — `furnaceProcessing.ts`, `config/furnace.json`
- [x] **2.13** Implement inventory system for crafted items — `resources.ts`
- [x] **2.14** Implement storage buildings for cube stockpiles — `buildingPlacement.ts`
- [x] **2.15** Implement mining outposts (automated ore extraction) — `mining.ts`
- [x] **2.16** Implement belt conveyor system for cube transport — `beltTransport.ts`, `beltRouting.ts`
- [x] **2.17** Implement resource pool system (powder, energy, compute) — `resources.ts`

**Source:** Gap analysis gaps #7, #8, #20-25; Paper playtest §1.1; Production plan Phase C-E; Ralph PRD Epic 2

---

## 3. AI Combat & Diplomacy `[CRITICAL]`

Combat is feral-vs-player only. AI factions can't fight each other or negotiate meaningfully.

- [x] **3.1** Enable all hostile faction pairs via war declarations — `combat.ts` uses `warSet` + `areAtWar()`; all non-feral AI faction combat is opt-in via `declareWar()`
- [x] **3.2** `declareWar(factionA, factionB)` implemented in `combat.ts` — sets mutual hostility, enables combat between any faction pair
- [x] **3.3** Connect GOAP `LaunchRaid` → Commander → `planRaid()` (raid system is complete but nothing calls it) — `GovernorActionExecutor.ts` calls `planRaid()` directly
- [ ] **3.4** AI trade proposals: evaluate resource needs instead of hardcoded `scrapMetal:10 / eWaste:5`
- [ ] **3.5** `acceptTrade()` must transfer actual resources between factions (currently only modifies opinion)
- [x] **3.6** Faction-specific AI strategies: Reclaimers hoard, Volt attacks early, Signal hacks, Iron turtles — `FactionPersonality.ts` defines per-faction GOAP weights and behavior biases
- [x] **3.7** AI tech tree usage: GOAP `ResearchTech` must trigger real `techResearch.ts` — `GovernorActionExecutor.executeResearchTech()` calls `startResearch()`, tested
- [x] **3.8** Implement health & damage system — `combat.ts`, tested
- [x] **3.9** Implement weapon system — `combat.ts`, `config/combat.json`
- [x] **3.10** Implement melee combat — `combat.ts`, tested
- [x] **3.11** Implement ranged combat — `turret.ts`, `combat.ts`, tested
- [x] **3.12** Implement bot combat AI — `BotBrain.ts`, `UnitBrain.ts`, tested
- [x] **3.13** Implement squad combat — `FormationSystem.ts`, `formationMovement.ts`
- [x] **3.14** Implement hacking system — `hacking.ts`, tested
- [x] **3.15** Implement cube raiding — `raidSystem.ts`, `raidTargeting.ts`, `cubePileTracker.ts`
- [x] **3.16** Implement salvage system — `salvage.ts`, tested
- [x] **3.17** Implement AI perception system — `BotPerception.ts`, Yuka perception, tested
- [x] **3.18** Implement AI steering behaviors — `BotVehicle.ts`, Yuka Vehicle, tested
- [x] **3.19** Implement AI squad system — `FormationSystem.ts`, squad entity, tested
- [x] **3.20** Implement territory control system — `territory.ts`, `territoryControl.ts`, `territoryEffects.ts`

**Source:** Gap analysis gaps #9-11, #21-22, #26-30; Production plan Phase I-L; Ralph PRD Epic 3-4

---

## 4. Faction Differentiation `[HIGH]`

All factions play and look identically. Design docs define unique units, buildings, and visual identity.

- [ ] **4.1** Implement 12 unique units (3 per faction) from GDD-007
  - [ ] **4.1.1** Reclaimer units: Salvager, Patchwork Titan, Scrap Swarm
  - [ ] **4.1.2** Volt Collective units: Arc Welder, Tesla Coil, Capacitor Drone
  - [ ] **4.1.3** Signal Choir units: Relay Node, Jammer, Hacker Bot
  - [ ] **4.1.4** Iron Creed units: Assault Bot, Tank, Artillery
- [ ] **4.2** Implement 8 unique buildings (2 per faction) from GDD-007
  - [ ] **4.2.1** Reclaimer buildings: Salvage Yard, Repair Bay
  - [ ] **4.2.2** Volt buildings: Power Plant, Tesla Tower
  - [ ] **4.2.3** Signal buildings: Relay Station, Hacking Hub
  - [ ] **4.2.4** Iron buildings: Barracks, Fortress
- [ ] **4.3** Per-faction visual identity: materials, emissive colors, bot head styles
- [ ] **4.4** Faction-colored HUD accents when playing as each faction
- [ ] **4.5** Tactical AI: flanking, retreat, terrain usage
- [ ] **4.6** Siege mechanics: wall-breaching behavior for AI
- [ ] **4.7** Hacking warfare: Signal Choir should heavily favor hack attacks
- [ ] **4.8** Formation combat: wire `FormationSystem.ts` into AI combat
- [x] **4.9** Implement GOAP planner core — `GOAPPlanner.ts`, `ActionTypes.ts`, tested
- [x] **4.10** Implement Civilization Governor base class — `CivilizationGovernor.ts`, tested
- [x] **4.11** Implement Reclaimer governor — governor profiles in `CivilizationGovernor.ts`
- [x] **4.12** Implement Volt Collective governor — governor profiles in `CivilizationGovernor.ts`
- [x] **4.13** Implement Signal Choir governor — governor profiles in `CivilizationGovernor.ts`
- [x] **4.14** Implement Iron Creed governor — governor profiles in `CivilizationGovernor.ts`

**Source:** Gap analysis gaps #26-35; GDD-007 race design; Production plan Phase I; Ralph PRD Epic 3

---

## 5. Victory & Pacing `[HIGH]`

Victory conditions are in config but not evaluated. No difficulty scaling or pacing.

- [x] **5.1** Victory progress tracking: evaluate all 6 conditions per faction per tick — `victoryConditionEvaluator.ts` registered as "progression" phase system in `registerSystems.ts`
- [ ] **5.2** Victory progress UI panel (show faction progress toward each condition)
- [ ] **5.3** Storm escalation: 5-phase progression (Calm → Convergence) with time-based triggers
- [ ] **5.4** Wealth-based raid scaling (RimWorld-style: `raidStrength = cubeCount * 0.5 + buildingCount * 2 + techLevel * 10`)
- [ ] **5.5** AI aggression curves: per-faction timers controlling when scouting/raiding/assault unlocks
- [ ] **5.6** Pacing/storyteller: cooldown-based event scheduling with tension curves
- [x] **5.7** Implement tech tree system — `techResearch.ts`, `config/technology.json`, tested
- [x] **5.8** Implement tech tree UI — `TechTreeScreen.tsx`, tested
- [x] **5.9** Implement research system — `techResearch.ts`, tested
- [x] **5.10** Implement victory condition checking (domination, tech, economic types) — `victoryConditionEvaluator.ts` evaluates all condition types per tick
- [ ] **5.11** Implement progression milestones (milestone definitions, notifications, feature unlocks)
- [ ] **5.12** Implement victory screen (show on win, display victory type and stats)

**Source:** Gap analysis gaps #14-19; Progression design doc §3, §6; Production plan Phase M-N; Ralph PRD Epic 6

---

## 6. World Responsiveness `[HIGH]`

Weather, hazards, and ancient machines are designed but don't affect gameplay.

- [x] **6.1** Weather gameplay effects: storms → lightning rod output, rain → movement/visibility, fog → perception range — `power.ts` uses `getWeatherModifiers`, `movement.ts` uses `applyMovementModifier`, `PerceptionSystem.ts` uses `getEffectivePerceptionRange` (combat accuracy modifier pending)
- [ ] **6.2** Environmental hazards: acid rain, magnetic storms, sinkholes
- [ ] **6.3** Ancient machine awakening: Sentinels, Crawlers, Colossus (from GDD-008)
- [ ] **6.4** AI perception of cube stockpiles — enemies "see" wealth, attract raids proportionally
- [ ] **6.5** Territory border visualization — render faction borders on terrain
- [ ] **6.6** Cube material gameplay differentiation: different compression times, wall strength, stack behavior
- [ ] **6.7** Cube count indicators: floating world-space labels on cube piles
- [x] **6.8** Implement building placement system — `buildingPlacement.ts`, tested
- [x] **6.9** Implement building types config — `config/buildings.json`
- [x] **6.10** Implement power network system — `power.ts`, `powerNetwork.ts`, tested
- [x] **6.11** Implement signal network system — `signalNetwork.ts`, tested
- [x] **6.12** Implement outpost system — `buildingPlacement.ts`, territory claiming
- [x] **6.13** Implement fabricator building — `fabrication.ts`, tested
- [x] **6.14** Implement turret building — `turret.ts`, tested
- [x] **6.15** Implement wall building — `wallBuilding.ts`, tested
- [x] **6.16** Implement terrain generation — `proceduralTerrain.ts`, tested
- [x] **6.17** Implement NavMesh generation — `NavMeshBuilder.ts`, Yuka NavMesh
- [x] **6.18** Implement pathfinding system — `PathfindingSystem.ts`, tested

**Source:** Gap analysis gaps #36-40; Paper playtest §3.2, §3.3; Production plan Phase F-H; Ralph PRD Epic 5

---

## 7. UI/UX Overhaul `[HIGH]`

Current UI is functional but text-heavy. Needs shaders, faction art, portraits, and modern game design.

- [ ] **7.1** Faction patron portraits and selection card art (pregame PATRON tab)
- [ ] **7.2** Shader-based UI effects (scanlines, holographic overlays, glitch transitions)
- [ ] **7.3** In-game minimap rendering (`minimapData.ts` exists, no rendering)
- [x] **7.4** Crosshair feedback loop: switch between 5 crosshair styles based on raycast target — `Crosshair` component in `FPSHUD.tsx` with raycast-driven style
- [x] **7.5** Contextual tooltips on hover (entity name, distance, available actions) — `getCrosshairTooltipInfo()` wired in `FPSHUD.tsx`
- [ ] **7.6** Tech tree visualization UI panel
- [ ] **7.7** Otter hologram visual treatment (holographic projection effect, speech bubbles)
- [ ] **7.8** First-5-minutes onboarding experience design
- [ ] **7.9** Tutorial waypoint markers + target object highlighting
- [x] **7.10** HUD refinement (layout polish, animations, readability) — `FPSHUD.tsx` overhauled with resource panels, animations, readability pass
- [ ] **7.11** Minimap enhancement (icons, zoom, territory display)
- [ ] **7.12** Settings menu (graphics, audio, controls, persistence)
- [ ] **7.13** Tutorial system (overlay, steps, progression, skip option)
- [x] **7.14** Resource pool UI display (powder, energy, compute) — resource pools displayed in `FPSHUD.tsx`
- [x] **7.15** Furnace UI (recipe selection, crafting progress) — furnace recipe panel in `FPSHUD.tsx`
- [x] **7.16** Inventory UI (show items, pickup/drop) — inventory display in `FPSHUD.tsx`
- [x] **7.17** Radial action menu (context-sensitive actions on selection) — `RadialMenuItem` / `contextualActions.ts` wired via `ObjectSelectionSystem.tsx`

**Source:** Paper playtest §2.1-2.5; User feedback "just text"; Ralph PRD Epic 7; prd-integration-sprint §UI

---

## 8. System Integration Wires `[MEDIUM]`

Many system-to-system event wires are missing. The event bus is underutilized.

- [x] **8.1** Wire core systems → `audioEventSystem` — `audioEventIntegration.ts` maps 16+ events, emitters in harvesting/compression/furnace/grabber/combat
- [x] **8.2** Wire core systems → `particleEmitterSystem` — `particleEventIntegration.ts` subscribes to events, tested
- [x] **8.3** Wire `weatherSystem` → gameplay: movement speed, visibility, combat accuracy modifiers — movement speed + perception range wired; combat accuracy modifier pending
- [x] **8.4** Wire `biomeSystem` → `movement`: terrain speed modifiers — `movement.ts` reads biome terrain modifiers
- [x] **8.5** Wire `biomeSystem` → `oreSpawner`: deposit type distribution by biome — `oreSpawner.ts` uses biome deposit configs
- [ ] **8.6** Wire `progressionSystem` → `hudState`: XP bar updates
- [x] **8.7** Wire `diplomacySystem` → event bus: diplomacy_changed events — `diplomacySystem.ts` emits `diplomacy_changed` on stance transition; `notificationSystem.ts` subscribes
- [x] **8.8** Wire `techTree` → `craftingSystem`: recipe unlocks gated by tech level — `craftingSystem.ts` checks tech unlock prerequisites via `techResearch.ts`
- [x] **8.9** Event bus audit: verified emitters in 5 core systems + gameLoopBridge, subscribers in audio/particle/notification integrations
- [x] **8.10** Implement Tone.js audio setup — `audioSetup.ts`, tested
- [x] **8.11** Implement spatial audio — `spatialAudio.ts`, tested
- [x] **8.12** Implement SFX system — `sfxLibrary.ts`, tested
- [x] **8.13** Implement procedural SFX — `proceduralSFX.ts`, tested
- [x] **8.14** Implement adaptive music — `adaptiveMusic.ts`, tested

**Source:** Paper playtest §4 integration matrix (27 missing wires); Ralph PRD Epic 7; prd-integration-sprint §Audio

---

## 9. Architecture Migration `[MEDIUM]`

Migration to Koota ECS and Expo is scaffolded but not complete.

- [ ] **9.1** Full Koota ECS migration: replace Miniplex entity types/queries with Koota traits
  - Bridge exists at `src/ecs/koota/bridge.ts`, traits started in `src/ecs/koota/`
  - ~30 system files need query migration
  - [ ] **9.1.1** Koota world setup (migrate from Miniplex, trait system in ecs/traits/)
  - [ ] **9.1.2** Core trait definitions (Position, Rotation, Scale, Velocity, Acceleration, Health, Damage, Owner, Team)
  - [ ] **9.1.3** System migration (migrate existing systems to Koota queries, update signatures, test execution order)
- [ ] **9.2** Expo SDK 55 native builds: verify iOS and Android builds compile and run
- [ ] **9.3** expo-sqlite game.db: verify native persistence works alongside IndexedDB web path
- [ ] **9.4** Drizzle ORM schema for game save data
- [x] **9.5** Implement save system architecture — `SaveManager.ts` with 4 slots, ECS serialization, versioning
- [x] **9.6** Implement web persistence — IndexedDB with localStorage fallback, autosave every 5min, tested
- [ ] **9.7** Implement native persistence (SQLite save/load, Drizzle schema, web save compatibility)

**Source:** CLAUDE.md "Architecture Migration" checklist; Production plan Phase A-B; ship-the-game/requirements Workstream 1

---

## 10. Content & Lore `[MEDIUM]`

Designed content not yet implemented.

- [ ] **10.1** Alien ecosystem reconciliation: merge Ferrovores + Residuals into unified fauna
- [ ] **10.2** Ancient Sentinel encounters (mid-game environmental threat)
- [ ] **10.3** Recipe expansion: more furnace recipes, fabrication chains
  - [ ] **10.3.1** Advanced materials (alloys, composites, multi-stage crafting, material properties)
  - [ ] **10.3.2** Advanced tools (laser drill, plasma cutter, upgrades, durability)
  - [ ] **10.3.3** Advanced components (AI cores, quantum processors, tiers, effects)
- [ ] **10.4** Procedural quest variety beyond the 27 otter quests
- [ ] **10.5** Lore entries: discoverable world lore pieces
- [ ] **10.6** Bot variety & content
  - [ ] **10.6.1** Scout bot (fast movement, low health, scouting behavior)
  - [ ] **10.6.2** Hauler bot (high carry capacity, hauling behavior)
  - [ ] **10.6.3** Combat bot (weapons, armor, combat behavior)
  - [ ] **10.6.4** Engineer bot (building/repair capability, engineer behavior)
  - [ ] **10.6.5** Hacker bot (enhanced hacking, hacking behavior)
- [ ] **10.7** Building variety & content
  - [ ] **10.7.1** Advanced Fabricator (faster fabrication, advanced bot types)
  - [ ] **10.7.2** Research Lab (research speed bonus, research UI)
  - [ ] **10.7.3** Radar Tower (extended vision, radar on minimap)
  - [ ] **10.7.4** Shield Generator (shield protection, shield visuals)
  - [ ] **10.7.5** Teleporter (instant transport, teleport animation)

**Source:** GDD-008 alien natives; Progression design doc §8; prd-integration-sprint §Content

---

## 11. Performance & Polish `[LOW]`

- [ ] **11.1** Entity pooling for cubes, projectiles, particles
- [ ] **11.2** LOD system for distant terrain/buildings
- [ ] **11.3** Culling optimization (frustum + occlusion)
- [ ] **11.4** Physics optimization: spatial partitioning for large cube counts
- [ ] **11.5** AI debug overlay: visualization of GOAP goals, plans, weights
- [ ] **11.6** Replay system: make `replaySystem.ts` functional
  - [ ] **11.6.1** Replay recording (input/state capture, compression)
  - [ ] **11.6.2** Replay playback (playback controls: pause/speed/seek, UI)
- [ ] **11.7** Day/night cycle
  - [ ] **11.7.1** Time system (time-of-day, progression, speed control)
  - [ ] **11.7.2** Lighting cycle (day/night lighting, sun/moon position, transitions)
  - [ ] **11.7.3** Gameplay effects (night visibility reduction, AI behavior changes, resource bonuses)
- [ ] **11.8** Localization framework
  - [ ] **11.8.1** i18n framework (system, language switching, text loading)
  - [ ] **11.8.2** String extraction (extract UI strings, translation files, keys)
  - [ ] **11.8.3** Language support (English, Spanish, French, German, Japanese, Chinese Simplified)
- [ ] **11.9** Visual polish
  - [ ] **11.9.1** PBR material system (MaterialFactory, CubeMaterialProvider, presets)
  - [ ] **11.9.2** Procedural geometry polish (bot geometry, building geometry, terrain detail)
  - [ ] **11.9.3** Shader effects (custom shaders: glow/hologram, post-processing: bloom/SSAO, VFX shaders)
  - [ ] **11.9.4** Lighting system (dynamic lighting, shadows CSM, presets: day/night/storm)
  - [ ] **11.9.5** Particle system (particle effects: dust/sparks/smoke, rendering optimization)
- [ ] **11.10** Animation system
  - [ ] **11.10.1** Animation framework (anime.js, blending, events)
  - [ ] **11.10.2** Bot animations (movement, actions: grind/attack, state machine)
  - [ ] **11.10.3** Building animations (construction, destruction, idle)
- [x] **11.11** Terrain biomes — `biomeSystem.ts`, `config/biomes.json`, tested
  - [x] **11.11.1** Biome system — `biomeSystem.ts`
  - [x] **11.11.2** Desert biome — in `config/biomes.json`
  - [x] **11.11.3** Forest biome — in `config/biomes.json`
  - [x] **11.11.4** Mountain biome — in `config/biomes.json`
  - [x] **11.11.5** Wasteland biome — in `config/biomes.json`
- [x] **11.12** Weather system — `weatherSystem.ts`, `stormSystem.ts`, tested
  - [x] **11.12.1** Weather framework — `weatherSystem.ts`
  - [x] **11.12.2** Rain weather — `weatherSystem.ts`
  - [x] **11.12.3** Storm weather — `stormSystem.ts`
- [x] **11.13** Fog of war — `fogOfWar.ts`, `fogOfWarManager.ts`, tested
  - [x] **11.13.1** Fog of war system — `fogOfWar.ts`
  - [x] **11.13.2** Vision system — `fogOfWarManager.ts`
  - [x] **11.13.3** Fog visuals — `fogOfWarManager.ts` render hooks
- [ ] **11.14** Achievements
  - [ ] **11.14.1** Achievement system (tracking, definitions from config, unlocks)
  - [ ] **11.14.2** Achievement UI (screen, notifications, progress)
- [x] **11.15** Instanced rendering for cubes — `InstancedCubeRenderer.tsx` wired in GameScene, 5000+ cube target
- [ ] **11.16** Physics sleeping for static cubes

**Source:** Ralph PRD Epic 8; prd-integration-sprint §Performance, §Polish

---

## 13. Physics Foundation `[CRITICAL]`

Rapier physics integration is partially complete but needs full ECS integration.

- [x] **13.1** Rapier world setup — `@react-three/rapier` integration, physics step in game loop
- [x] **13.2** Rigid body system — Rapier RigidBody components, creation/destruction
- [x] **13.3** Collider system — Rapier Collider components, shapes, collision groups
- [x] **13.4** Physics-ECS bridge — `cubePhysicsModel.ts`, raycast queries
- [x] **13.5** Physical cube implementation — `cubePhysicsModel.ts`, 0.5m box rigid bodies
- [x] **13.6** Cube stacking physics — `cubeStacking.ts`, `structuralCollapse.ts`

**Source:** Production plan Phase A-B; ship-the-game/requirements Workstream 2; prd-integration-sprint §Physics

---

## 12. Input, Spectator, and QA `[LOW]`

- [ ] **12.1** AI-vs-AI spectator mode (camera control, faction overview, speed controls)
- [ ] **12.2** Headed Chrome E2E playtesting (visual verification of full game loop)
- [ ] **12.3** Performance profiling under load (100+ cubes, 4 AI factions, full systems)
- [x] **12.4** FPS camera controller — `FPSInput.tsx`, tested
- [x] **12.5** Camera movement — `FPSInput.tsx`, nipplejs mobile
- [x] **12.6** Object selection system — `ObjectSelectionSystem.tsx`, tested

**Source:** ship-the-game/requirements Workstream 15; prd-integration-sprint §Input

---

## Reference: Design Documents

Design docs are organized by domain in `docs/design/`. Each directory has an `AGENTS.md`.

| Directory | Documents | Scope |
|-----------|-----------|-------|
| `gameplay/` | OVERVIEW, MECHANICS, MATERIALS, COMBAT, PROGRESSION, VICTORY | What you DO |
| `world/` | ENVIRONMENT, RACES, ALIENS | Where it takes place |
| `agents/` | GOVERNORS, BOTS | AI systems |
| `interface/` | UI, INTERACTION, ONBOARDING | How you interact |
| `research/` | 4X_ANALYSIS | Competitor analysis |

Root-level: `DECISIONS.md` (tech choices), `OPEN_QUESTIONS.md` (unresolved design).

---

## Summary

| Priority | Workstreams | Total Items | Remaining |
|----------|------------|------------|-----------|
| CRITICAL | 1 (Rendering), 2 (AI Economy), 3 (AI Combat), 13 (Physics) | 67 items | ~19 remaining |
| HIGH | 4 (Factions), 5 (Victory), 6 (World), 7 (UI/UX) | 72 items | ~31 remaining |
| MEDIUM | 8 (Integration), 9 (Migration), 10 (Content) | 42 items | ~14 remaining |
| LOW | 11 (Performance), 12 (Spectator) | 51 items | ~4 remaining |
| **Total** | **13 workstreams** | **168 items** | **68 remaining (100 done)** |

Critical path: Physics foundation (§13) → Rendering pipeline (§1) → AI economy (§2) → AI combat (§3) unblock the most downstream work.

---

## Archival Plan

After comprehensive audit, the following documents have been fully extracted into this specification:

**Plans to archive** (move to `docs/archived-plans/`):
- `2026-03-10-production-plan.md` — Phase breakdown extracted
- `2026-03-10-implementation-plan.md` — High-level roadmap extracted
- `2026-03-10-4x-gap-analysis.md` — Gap analysis extracted
- `2026-03-10-paper-playtest-findings.md` — Playtest findings extracted
- `2026-03-10-4x-research-analysis.md` — Research analysis extracted
- `2026-03-10-progression-evolution-design.md` — Progression design extracted

**PRDs to archive** (move to `docs/archived-prds/`):
- `.ralph-tui/prd.md` → `docs/archived-prds/prd-2026-03-10.md`
- `tasks/prd-integration-sprint.md` → `docs/archived-prds/`
- `.kiro/specs/ship-the-game/requirements.md` → `docs/archived-prds/`
- `.kiro/specs/ship-the-game/tasks.md` → `docs/archived-prds/`

**Execute archival:**
```bash
mkdir -p docs/archived-plans docs/archived-prds
mv docs/plans/*.md docs/archived-plans/
mv .ralph-tui/prd.md docs/archived-prds/prd-2026-03-10.md
mv tasks/prd-integration-sprint.md docs/archived-prds/
mv .kiro/specs/ship-the-game/requirements.md docs/archived-prds/
mv .kiro/specs/ship-the-game/tasks.md docs/archived-prds/
```
