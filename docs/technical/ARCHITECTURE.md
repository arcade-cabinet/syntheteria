# Syntheteria -- Technical Architecture

First-person 3D 4X factory game built with React Three Fiber and an Entity-Component-System pattern. You are a broken robot on a machine planet. Grind ore deposits into powder, compress powder into physical cubes, carry cubes to machines, and build an industrial civilization while competing against AI factions.

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | React Three Fiber 9.5 + Three.js 0.183 | 3D scene, FPS camera, PBR materials |
| ECS | Miniplex 2.0 (migrating to Koota 0.6) | Entity management, archetype queries |
| Physics | Rapier 0.14 (`@dimforge/rapier3d-compat`) | Rigid bodies, collisions, raycasting |
| AI | Yuka 0.7 + custom GOAP + FSM | Vehicle steering, NavMesh pathfinding, governors |
| Audio | Tone.js 15.1 | Spatial audio, procedural synth sound effects |
| Animation | anime.js 4.3 | UI animations, screen transitions |
| Mobile Input | nipplejs 0.10 | Virtual joystick for mobile FPS |
| UI | React DOM overlay | HUD, radial menus, tech tree, pregame screens |
| State bridge | `useSyncExternalStore` | ECS to React UI sync |
| Build | Vite 7.3 (primary), Expo SDK 55 (scaffolded for native) | Dev server, bundling |
| Lint | Biome 2.4 | Code quality |
| Test | Jest 30 + ts-jest (unit), Playwright 1.58 (E2E) | 158+ test files |
| CI | GitHub Actions | `ci.yml` (lint + test), `deploy.yml` |

---

## Two-Loop Architecture

All game logic runs in two separated loops to decouple simulation stability from frame rate.

### Simulation Tick (Fixed Interval)

`simulationTick()` in `src/ecs/gameState.ts` runs at a fixed cadence adjusted by game speed (0.5x through 4x, or paused). Each tick executes systems in a deterministic order:

```
 1. explorationSystem()         -- reveal chunks around moving units
 2. fragmentMergeSystem()       -- merge map fragments when robots meet
 3. powerSystem(tick)           -- lightning rod output, protection zones
 4. wireNetworkSystem()         -- wire connectivity graph
 5. updatePowerGrid()           -- power distribution BFS
 6. signalNetworkSystem()       -- signal range BFS from core/relays
 7. resourceSystem()            -- material gathering, consumption
 8. miningSystem()              -- ore extraction with drill health
 9. processingSystem()          -- smelter/refiner/separator recipes
10. repairSystem()              -- building/unit repair
11. fabricationSystem()         -- fabrication queue progression
12. hackingSystem()             -- hack progress, compute costs
13. enemySystem()               -- feral machine spawning and behavior
14. combatSystem()              -- damage resolution, engagement rules
15. turretSystem()              -- automated turret targeting
16. otterSystem()               -- otter wandering behavior
17. updateQuests(1)             -- quest condition checking
18. applyContestationDecay()    -- overlapping territory weakening
19. updateResearch() x5         -- tech progression for all 5 factions
20. applyTechEffects()          -- apply completed research bonuses
21. executeRaid() (per active)  -- raid state machine advance
22. aiCivilizationSystem()      -- AI faction economic simulation
23. updateDisplayOffsets()      -- fragment rendering positions
24. checkGameOver()             -- victory/loss condition check
```

After all systems run, a snapshot is built and listeners are notified, triggering React UI updates via `useSyncExternalStore`.

### Render Loop (Per-Frame via `useFrame`)

R3F components read ECS state directly each frame for smooth visual interpolation. No game state mutation here -- only visual updates:

- **`CoreLoopSystem`** (`src/systems/CoreLoopSystem.tsx`) -- updates harvesting, compression, furnace processing, and held-cube sync every frame. Exposes a snapshot for the HUD via its own `subscribeCoreLoop` store.
- **`GameplaySystems`** (`src/systems/GameplaySystems.tsx`) -- runs less-frequent strategic checks (cube stacking, pattern matching for machine assembly, wall detection) on slower cadences.
- **`InteractionSystem`** (`src/systems/InteractionSystem.tsx`) -- contextual interaction raycasting and action dispatch.
- **Movement interpolation** -- `movementSystem` (`src/systems/movement.ts`) lerps unit positions toward navmesh waypoints.
- **Steering** -- `YukaSystem` (`src/ai/YukaSystem.tsx`) ticks the Yuka entity manager each frame, updating vehicle positions.
- **Rendering components** -- each renderer reads `worldPosition` directly from entities; positions never flow through React state.

**Critical rule:** Never put per-frame positions into React state. Scene components read ECS directly in `useFrame`.

---

## Directory Structure

```
syntheteria/
├── src/
│   ├── App.tsx                    # Phase router: title -> pregame -> game
│   ├── main.tsx                   # React DOM entry (Vite)
│   ├── GameScene.tsx              # Canvas + all 3D/physics/audio (lazy-loaded)
│   │
│   ├── ecs/                       # Entity-Component-System core
│   │   ├── types.ts               # Entity interface (30+ component types)
│   │   ├── world.ts               # Miniplex world instance + archetype queries
│   │   ├── gameState.ts           # Simulation tick loop, game speed, snapshot
│   │   ├── terrain.ts             # Heightfield terrain + map fragment data
│   │   ├── seed.ts                # Seeded PRNG (deterministic generation)
│   │   ├── factory.ts             # Entity spawn: units, buildings, otters
│   │   ├── factoryBuildings.ts    # Miner/processor spawn functions
│   │   ├── beltFactory.ts         # Belt entity creation
│   │   ├── wireFactory.ts         # Wire entity creation
│   │   ├── cityLayout.ts          # Procedural city building placement
│   │   └── koota/                 # Koota migration (in progress)
│   │       ├── traits.ts          # Koota trait definitions
│   │       ├── world.ts           # Koota world instance
│   │       ├── queries.ts         # Koota reactive queries
│   │       ├── bridge.ts          # Miniplex <-> Koota sync bridge
│   │       ├── serialize.ts       # Koota world serialization
│   │       └── MIGRATION_STATUS.md
│   │
│   ├── systems/                   # ECS systems (140 files, ~41K lines)
│   │   ├── __tests__/             # 138 Jest test files (~67K lines)
│   │   └── ... (see System Inventory below)
│   │
│   ├── ai/                        # AI subsystem (21 files)
│   │   ├── goap/                  # GOAP civilization governor (6 files)
│   │   ├── BotBrain.ts            # 9-state FSM for unit behavior
│   │   ├── BotVehicle.ts          # Yuka Vehicle wrapper
│   │   ├── SteeringBehaviors.ts   # Seek/arrive/flee/wander
│   │   ├── NavMeshBuilder.ts      # Build NavMesh from terrain
│   │   ├── PathfindingSystem.ts   # NavMesh pathfinding API
│   │   ├── PerceptionSystem.ts    # Cone-of-sight with LOS occlusion
│   │   ├── MemorySystem.ts        # Entity memory with confidence decay
│   │   ├── ThreatAssessment.ts    # Multi-factor threat evaluation
│   │   ├── FormationSystem.ts     # Squad formation management
│   │   ├── FormationPatterns.ts   # Line/wedge/column/circle offsets
│   │   ├── YukaManager.ts         # Singleton Yuka entity manager
│   │   └── YukaSystem.tsx         # R3F component driving Yuka updates
│   │
│   ├── rendering/                 # Three.js rendering (36 files)
│   │   ├── TerrainRenderer.tsx    # Heightfield terrain mesh
│   │   ├── TerrainPBR.tsx         # PBR terrain materials
│   │   ├── UnitRenderer.tsx       # Bot/unit meshes
│   │   ├── CubeRenderer.tsx       # Material cube rendering
│   │   ├── FreeCubeRenderer.tsx   # Loose cubes
│   │   ├── PlacedCubeRenderer.tsx # Placed/structural cubes
│   │   ├── WallRenderer.tsx       # Cube-stack walls
│   │   ├── BeltRenderer.tsx       # Conveyor belt meshes
│   │   ├── WireRenderer.tsx       # Power/signal wire meshes
│   │   ├── FactoryRenderer.tsx    # Factory machines
│   │   ├── FurnaceRenderer.tsx    # Furnace with hopper
│   │   ├── OreDepositRenderer.tsx # Ore vein meshes
│   │   ├── CityRenderer.tsx       # Pre-placed city buildings
│   │   ├── OtterRenderer.tsx      # Otter sprite billboards
│   │   ├── HologramRenderer.tsx   # Holographic projections
│   │   ├── FogOfWarRenderer.tsx   # Fog overlay
│   │   ├── SelectionHighlight.tsx # Emissive glow on hover/select
│   │   ├── StockpileGlow.tsx      # Cube stockpile indicator
│   │   ├── HarvestParticles.tsx   # Grinding particle effects
│   │   ├── StormSky.tsx           # Storm dome skybox
│   │   ├── InstancedCubeRenderer.tsx + InstancedCubeManager.ts  # (built, not wired)
│   │   ├── materials/             # PBR material system (10 files)
│   │   │   ├── MaterialFactory.ts      # Composable PBR from texture sets
│   │   │   ├── CubeMaterialProvider.tsx # Per-cube PBR (15 material types)
│   │   │   ├── cubePBRMaterials.json   # PBR texture map configs
│   │   │   ├── NormalMapComposer.ts    # Layered detail (bolts, seams, vents)
│   │   │   └── MetalMaterial / BeltMaterial / CircuitMaterial / TerrainMaterial
│   │   ├── procgen/               # Procedural geometry (7 files)
│   │   │   ├── PanelGeometry.ts        # Beveled panels with insets, bolts
│   │   │   ├── BotGenerator.ts + BotParts.ts  # Faction-distinct bot meshes
│   │   │   ├── BuildingGenerator.ts    # Procedural machine buildings
│   │   │   ├── OreDepositGenerator.ts  # Organic ore deposit shapes
│   │   │   └── PanelDemo.tsx           # Interactive panel demo
│   │   └── shaders/
│   │       └── fogShader.ts       # Custom fog GLSL
│   │
│   ├── input/                     # Player input (8 files)
│   │   ├── FPSCamera.tsx          # First-person camera (pointer lock)
│   │   ├── FPSInput.tsx           # Keyboard/mouse + touch input
│   │   ├── FPSMovement.ts         # Walk, sprint, jump, gravity
│   │   ├── ObjectSelectionSystem.tsx  # Rapier raycast -> radial menu
│   │   ├── raycastUtils.ts        # Physics raycast helpers
│   │   └── selectionState.ts      # Selection state store
│   │
│   ├── audio/                     # Tone.js audio (10 files)
│   │   ├── SoundEngine.ts         # Core Tone.js synth engine
│   │   ├── SynthSounds.ts         # Procedural synth sound definitions
│   │   ├── GameSounds.ts          # Game event sound mappings
│   │   ├── SpatialAudio.ts        # 3D positional audio
│   │   ├── StormAmbience.ts       # Ambient storm soundscape
│   │   ├── FactoryAudio.ts        # Factory machine sounds
│   │   ├── AudioEventBridge.ts    # ECS event -> audio trigger bridge
│   │   └── AudioSystem.tsx        # R3F audio system component
│   │
│   ├── physics/                   # Rapier WASM (2 files)
│   │   ├── PhysicsSystem.tsx      # R3F physics provider
│   │   └── PhysicsWorld.ts        # Rapier world setup
│   │
│   ├── save/                      # Persistence (3 files)
│   │   ├── SaveManager.ts         # IndexedDB save slot management
│   │   ├── saveLoad.ts            # Save/load orchestration
│   │   └── schema.ts              # Drizzle ORM schema (for expo-sqlite)
│   │
│   └── ui/                        # React HUD components (24 files)
│       ├── FPSHUD.tsx             # Main game HUD overlay
│       ├── CoreLoopHUD.tsx        # Harvest/compress/furnace status
│       ├── ObjectActionMenu.tsx   # Context-sensitive radial menu
│       ├── RadialActionMenu.tsx   # Radial menu rendering
│       ├── TechTreePanel.tsx      # Tech tree visualization
│       ├── QuestPanel.tsx         # Quest tracker
│       ├── PowerOverlay.tsx       # Power network visualization
│       ├── InventoryView.tsx      # Inventory panel
│       ├── SaveLoadMenu.tsx       # Save/load UI
│       ├── FactionSelect.tsx      # Race selection
│       ├── OpponentConfig.tsx     # AI opponent configuration
│       ├── PregameScreen.tsx      # Pre-game setup
│       ├── TitleScreen.tsx        # Title screen
│       ├── GameOverScreen.tsx     # Victory/defeat
│       ├── MobileControls.tsx     # Touch overlay
│       ├── MobileJoystick.tsx     # nipplejs joystick
│       ├── Bezel.tsx              # Retro CRT bezel frame
│       └── ErrorBoundary.tsx      # React error boundary
│
├── config/                        # JSON tunables (39 files + index.ts)
├── app/                           # Expo Router screens (scaffolded)
├── public/textures/materials/     # PBR texture maps (Git LFS)
├── assets/                        # GLB models (Git LFS)
├── docs/design/                   # GDD design documents (002-005)
├── tests/e2e/                     # Playwright E2E tests
├── .github/workflows/             # CI + Deploy
├── jest.config.js                 # Jest with ts-jest
├── biome.json                     # Biome linter
├── vite.config.ts                 # Vite bundler
├── app.json / metro.config.js     # Expo (scaffolded)
└── tsconfig.json                  # TypeScript
```

---

## ECS Architecture

### Miniplex (Current)

The game runs on Miniplex 2.0 with a single `Entity` interface where all components are optional properties. Miniplex queries select entities by which components they have.

**Entity type** (`src/ecs/types.ts`) -- 30+ optional component fields including:

- **Identity**: `id`, `faction` ("player" | "cultist" | "rogue" | "feral" | "wildlife")
- **Spatial**: `worldPosition` (continuous 3D Vec3 -- single source of truth for position)
- **Unit**: type, speed, displayName, functional/broken component list (`UnitComponent[]`)
- **Factory**: `belt`, `wire`, `miner`, `processor`, `item`
- **Materials**: `oreDeposit`, `materialCube`, `placedAt`, `grabbable`, `powderStorage`, `hopper`, `cubeStack`
- **Ownership**: `heldBy`, `onBelt`, `inHopper` (entity ID references)
- **AI/Signal**: `hackable`, `signalRelay`, `automation`
- **FPS**: `playerControlled` (isActive, yaw, pitch)
- **Visual**: `hologram`, `otter`
- **Structural**: `building`, `lightningRod`, `navigation`, `mapFragment`

**Archetype queries** (`src/ecs/world.ts`):

```ts
const units         = world.with("unit", "worldPosition", "mapFragment");
const playerBots    = world.with("playerControlled", "unit", "worldPosition");
const buildings     = world.with("building", "worldPosition");
const lightningRods = world.with("lightningRod", "building", "worldPosition");
const belts         = world.with("belt", "worldPosition");
const placedCubes   = world.with("placedAt", "materialCube", "worldPosition");
const miners        = world.with("miner", "building", "worldPosition");
const processors    = world.with("processor", "building", "worldPosition");
const hackables     = world.with("hackable", "worldPosition");
const otters        = world.with("otter", "worldPosition");
const holograms     = world.with("hologram", "worldPosition");
```

Key helper: `getActivePlayerBot()` returns the bot the player is currently piloting. `switchBot()` and `switchBotTo()` handle bot switching.

### Koota Migration (In Progress)

`src/ecs/koota/` contains the migration scaffolding:

- `traits.ts` -- Koota trait definitions mirroring Miniplex components
- `world.ts` -- Koota world instance
- `queries.ts` -- Koota reactive queries
- `bridge.ts` -- Bidirectional Miniplex <-> Koota sync for incremental migration
- `serialize.ts` -- Koota world serialization for save/load
- `MIGRATION_STATUS.md` -- Detailed migration plan

Koota brings trait-based SoA storage, relations, reactive queries, and change detection. The bridge allows systems to be migrated one at a time while both ECS instances stay in sync.

---

## System Inventory

The `src/systems/` directory contains 140 system files totaling approximately 41,000 lines.

### Core Loop (Per-Frame -- Harvest, Compress, Build)

| System | File | Purpose |
|--------|------|---------|
| Harvesting | `harvesting.ts` | Ore grinding -> powder accumulation |
| Harvest+Compress | `harvestCompress.ts` | Harvest-to-compress state bridge |
| Compression | `compression.ts` | Powder -> physical cube ejection |
| Compression Juice | `compressionJuice.ts` | Screen shake, pressure/heat overlays |
| Furnace | `furnace.ts` | Furnace state management |
| Furnace Processing | `furnaceProcessing.ts` | Hopper -> recipe -> output cube |
| Fabrication | `fabrication.ts` | Build queue progression |
| Grabber | `grabber.ts` | Cube grab/carry/drop/throw + quickDeposit |
| Held Cube Sync | `heldCubeSync.ts` | Sync held cube to bot hand position |

### Factory and Infrastructure (Tick-Based)

| System | File | Purpose |
|--------|------|---------|
| Belt Transport | `beltTransport.ts` | Physical cube movement with spacing/back-pressure |
| Belt Routing | `beltRouting.ts` | Belt-to-belt and belt-to-machine connections |
| Mining | `mining.ts` | Automated drill ore extraction |
| Processing | `processing.ts` | Smelter/refiner/separator recipes |
| Power | `power.ts` | Lightning rod output based on storm phase |
| Power Routing | `powerRouting.ts` | Power distribution BFS through wire graph |
| Wire Network | `wireNetwork.ts` | Wire connection propagation |
| Wire Builder | `wireBuilder.ts` | Wire placement and validation |
| Signal Network | `signalNetwork.ts` | Signal relay BFS connectivity |
| Building Placement | `buildingPlacement.ts` | Ghost preview, validation, construction |
| Machine Assembly | `machineAssembly.ts` | Assemble machines from cube patterns |
| Pattern Matcher | `patternMatcher.ts` | Match cube arrangements against blueprints |
| Grid Snap | `gridSnap.ts` | Snap placement to terrain grid |

### Cube Economy

| System | File | Purpose |
|--------|------|---------|
| Cube Stacking | `cubeStacking.ts` | Snap-grid registration, topple detection |
| Structural Collapse | `structuralCollapse.ts` | Collapse when support cubes removed |
| Cube Placement | `cubePlacement.ts` | Placement validation |
| Cube Physics | `cubePhysicsModel.ts` | Rapier rigid body parameters per material |
| Cube Material Props | `cubeMaterialProperties.ts` | Per-material physics (weight, friction) |
| Cube Damage | `cubeDamage.ts` | Per-cube HP and destruction |
| Cube Ammo | `cubeAmmo.ts` | Cubes as throwable ammunition |
| Cube Economy | `cubeEconomy.ts` | Value/trade calculations |
| Cube Pile Tracker | `cubePileTracker.ts` | Stockpile location tracking |
| Decoy Pile | `decoyPile.ts` | Fake piles to misdirect raiders |
| Quick Deposit | `quickDeposit.ts` | Quick-deposit cubes into nearby hoppers |
| Wall Building | `wallBuilder.ts`, `wallBuilding.ts`, `wallPlacement.ts` | Walls from cube stacks |

### Combat

| System | File | Purpose |
|--------|------|---------|
| Combat | `combat.ts` | Tick-based damage resolution |
| FPS Combat | `fpsCombat.ts` | Real-time first-person combat |
| Damage Model | `damageModel.ts` | Component-based damage (functional/broken parts) |
| Turret | `turret.ts` | Automated defense turrets |
| Raid System | `raidSystem.ts` | Raid state machine (scout -> approach -> steal -> flee) |
| Raid Targeting | `raidTargeting.ts` | AI raid target selection |
| Hacking | `hacking.ts` | Compute-based entity hacking |
| Breach Detection | `breachDetection.ts` | Unauthorized access detection |
| Shelter | `shelterSystem.ts` | Cover/shelter mechanics |

### AI and Automation

| System | File | Purpose |
|--------|------|---------|
| AI Civilization | `aiCivilization.ts` | AI faction economic simulation |
| AI Peace Period | `aiPeacePeriod.ts` | Early-game aggression delay |
| Cultist AI | `cultistAI.ts` | Cultist faction behavior |
| Enemies | `enemies.ts` | Feral/rogue unit spawning and behavior |
| Bot Automation | `botAutomation.ts` | Routine execution (patrol/guard/work/follow) |
| Bot Command | `botCommand.ts` | Command queue for bot orders |
| Bot Fleet | `botFleetManager.ts` | Multi-bot fleet coordination |
| Noise Attraction | `noiseAttraction.ts` | Sound-based enemy attraction |

### Territory and Exploration

| System | File | Purpose |
|--------|------|---------|
| Exploration | `exploration.ts` | Reveal chunks as units move |
| Fragment Merge | `fragmentMerge.ts` | Merge map fragments when robots meet |
| Fog of War | `fogOfWar.ts`, `fogOfWarManager.ts` | Hidden/explored/visible states |
| Territory | `territory.ts`, `territoryControl.ts`, `territoryEffects.ts` | Claim, contestation, decay |
| Outpost | `outpost.ts` | Territory outpost mechanics |

### Progression and Quests

| System | File | Purpose |
|--------|------|---------|
| Tech Tree | `techTree.ts`, `techResearch.ts`, `techEffects.ts` | Research + bonuses |
| Quest System | `questSystem.ts`, `proceduralQuests.ts`, `questDialogue.ts` | Quest tracking + dialogue |
| Otters | `otters.ts`, `otterTrade.ts` | Otter wandering, dialogue, trading |
| Discovery | `discoverySystem.ts` | Exploration discovery events |
| Diplomacy | `diplomacySystem.ts` | Inter-faction relations |
| Victory | `victoryTracking.ts`, `gameOverDetection.ts` | Win/loss evaluation |

### Environment

| System | File | Purpose |
|--------|------|---------|
| Weather | `weatherSystem.ts`, `weatherEffects.ts` | Weather state + gameplay effects |
| Storm | `stormEscalation.ts`, `stormForecast.ts` | Storm intensity + prediction |
| Hazards | `environmentHazards.ts` | Environmental damage zones |
| Biomes | `biomeSystem.ts` | Biome assignment and properties |
| Map Generator | `mapGenerator.ts` | Procedural world generation |
| Ore Spawner | `oreSpawner.ts` | Ore deposit placement |

### Infrastructure

| System | File | Purpose |
|--------|------|---------|
| Event Bus | `eventBus.ts` | Typed publish/subscribe (25 event types) |
| Spatial Index | `spatialIndex.ts` | Spatial partitioning for queries |
| Action Registry | `actionRegistry.ts`, `contextualActions.ts` | Contextual action dispatch |
| Screen Shake | `screenShake.ts` | Camera shake effects |
| Save/Load | `saveLoad.ts`, `newGameInit.ts`, `playerEntity.ts` | Persistence + initialization |
| Settings | `settingsSystem.ts`, `balanceTuning.ts` | Runtime configuration |

---

## JSON Config System

All game balance is externalized to 39 JSON files in `config/`. The type-safe loader at `config/index.ts` imports every JSON file and re-exports them as a single `config` object with full TypeScript inference via `typeof`:

```ts
import { config } from '../config';

const beltSpeed = config.belts.tiers.fast.speed;          // fully typed
const reclaimerBias = config.civilizations.reclaimers;     // exact shape known
const scrapRate = config.mining.rates.scrap_metal;         // number
```

Balance changes -- belt speeds, ore extraction rates, recipe costs, tech tree unlocks, combat damage, raid timing -- never require code changes.

**Config files by domain:**

- **Economy**: `units.json`, `buildings.json`, `belts.json`, `mining.json`, `processing.json`, `furnace.json`, `cubeMaterials.json`, `crafting.json`, `inventory.json`
- **Combat**: `combat.json`, `hacking.json`, `enemies.json`
- **4X**: `civilizations.json`, `technology.json`, `territory.json`, `diplomacy.json`, `victory.json`, `deposits.json`
- **World**: `terrain.json`, `mapPresets.json`, `biomes.json`, `weather.json`, `environmentHazards.json`
- **Visual**: `materials.json`, `factionVisuals.json`, `rendering.json`, `textureMapping.json`, `particles.json`
- **Gameplay**: `quests.json`, `botMovement.json`, `botAutomation.json`, `power.json`, `interaction.json`, `camera.json`, `discoveries.json`, `progression.json`, `achievements.json`
- **Assets**: `assetMapping.json`, `audio.json`

---

## AI Architecture

Three-tier AI with clear separation between strategic, tactical, and movement layers.

### Tier 1: CivilizationGovernor (GOAP)

`src/ai/goap/CivilizationGovernor.ts` -- one per AI faction. Each faction (Reclaimers, Volt Collective, Signal Choir, Iron Creed) has a governor with personality-weighted goal evaluators defined in `config/civilizations.json`.

Supporting files:
- `GOAPPlanner.ts` -- A* search over world state conditions
- `GoalTypes.ts` -- strategic goals (expand, gather, defend, research, attack, scout, trade, hoard)
- `ActionTypes.ts` -- GOAP actions with preconditions, effects, and costs
- `FactionPersonality.ts` -- per-race personality weights + situational modifiers

The `aiCivilization.ts` system ticks the governor each simulation tick, translating GOAP plans into bot orders.

### Tier 2: BotBrain (FSM)

`src/ai/BotBrain.ts` -- finite state machine for individual bot behavior with 9 states:

```
IDLE -> PATROL -> SEEK_TARGET -> ATTACK -> FLEE
                                   ^        |
                                   +--------+
GUARD -> (engages enemies within radius, returns to post)
GATHER -> (approach deposit, auto-aggro if threatened)
RETURN_TO_BASE -> (head home when inventory full)
FOLLOW -> (trail a leader at set distance)
```

Each bot receives orders from its faction's governor and combines them with local perception (`BotContext.ts` -- nearby enemies/allies sorted by distance, health ratio, aggro range) to decide state transitions. Output is a `SteeringOutput` with a command (STOP, SEEK, ARRIVE, FLEE, WANDER) and optional target position.

`BotBrainSystem.tsx` is the R3F component that runs BotBrain updates per frame.

### Tier 3: Steering and Navigation

- **`BotVehicle.ts`** -- wraps Yuka `Vehicle` with velocity/acceleration/steering
- **`SteeringBehaviors.ts`** -- seek, arrive, flee, wander behaviors
- **`NavMeshBuilder.ts`** -- generates Yuka NavMesh from terrain and obstacles
- **`PathfindingSystem.ts`** -- A* pathfinding over NavMesh with path follower API
- **`useBotSteering.ts`** -- React hook linking Miniplex entity to Yuka Vehicle
- **`YukaManager.ts`** -- singleton Yuka entity manager
- **`YukaSystem.tsx`** -- R3F component driving Yuka updates each frame

### Perception and Memory

- **`PerceptionSystem.ts`** -- cone-of-sight vision with line-of-sight occlusion
- **`MemorySystem.ts`** -- entity memory with time-based confidence decay
- **`ThreatAssessment.ts`** -- multi-factor threat scoring (distance, health, weapon type)
- **`FormationSystem.ts`** + **`FormationPatterns.ts`** -- squad formations (line/wedge/column/circle) using offset pursuit and separation

---

## Rendering Pipeline

### Scene Composition

`GameScene.tsx` is lazy-loaded via `React.lazy()` to keep the title/pregame bundle small. It sets up:

1. **R3F Canvas** with FPS camera, Rapier physics provider, environment lighting
2. **Terrain**: `TerrainRenderer` (heightfield mesh) + `TerrainPBR` (PBR materials with preloading)
3. **Buildings**: `CityRenderer` (pre-placed), `FactoryRenderer` (miners/processors), `FurnaceRenderer`
4. **Cubes**: `FreeCubeRenderer` (loose), `PlacedCubeRenderer` (structural), `WallRenderer` (stacked)
5. **Factory**: `BeltRenderer`, `WireRenderer`, `OreDepositRenderer`
6. **Units**: `UnitRenderer` (bots), `OtterRenderer` (sprite billboards)
7. **Effects**: `HologramRenderer`, `FogOfWarRenderer`, `StockpileGlow`, `HarvestParticles`, `StormSky`, `Flashlight`, `CameraEffects`
8. **Input**: `FPSCamera` (pointer lock), `FPSInput`, `ObjectSelectionSystem` (Rapier raycast -> radial menu)
9. **Systems**: `CoreLoopSystem`, `GameplaySystems`, `InteractionSystem`, `YukaSystem`, `AudioSystem`
10. **DOM overlay**: `FPSHUD`, `CoreLoopHUD`, `ObjectActionMenu`, `QuestPanel`, `TechTreePanel`, `PowerOverlay`, `MobileControls`, `Bezel`

### PBR Material System

`src/rendering/materials/MaterialFactory.ts` builds composable PBR materials from texture sets (color, metalness, normal, roughness, displacement). `CubeMaterialProvider.tsx` maps each of the 15 ore types to unique PBR treatments configured in `cubePBRMaterials.json`. Specialized materials: `MetalMaterial.ts`, `BeltMaterial.ts`, `CircuitMaterial.ts`, `TerrainMaterial.ts`.

`NormalMapComposer.ts` generates layered normal maps with procedural detail -- bolts, seams, vents, hex patterns -- for the industrial mechanical aesthetic.

### Procedural Geometry

`src/rendering/procgen/` contains generators that build meshes programmatically:

- **`PanelGeometry.ts`** -- beveled panels with configurable insets, bolt holes, and vent slots
- **`BotGenerator.ts`** + **`BotParts.ts`** -- faction-distinct bot meshes assembled from panels (head, torso, limbs)
- **`BuildingGenerator.ts`** -- procedural machine building meshes
- **`OreDepositGenerator.ts`** -- organic ore deposit shapes using noise

These generators are functional but not yet wired into the live R3F rendering pipeline. Units and buildings currently use simpler placeholder meshes.

### Instanced Rendering

`InstancedCubeRenderer.tsx` and `InstancedCubeManager.ts` implement Three.js InstancedMesh for rendering large numbers of cubes efficiently. Built but not yet connected to the live scene.

---

## Physical Cube Economy

Resources are not abstract counters. They are physical 0.5m rigid body cubes with PBR materials, visible to all factions.

### Material States

1. **Raw Deposits** -- organic geological formations protruding from terrain (not cubes). Rendered by `OreDepositRenderer`.
2. **Powder** -- internal to the player bot. Shown on the HUD capacity bar. Accumulated by `harvesting.ts`.
3. **Cubes** -- physical Rapier rigid bodies. Can be grabbed, carried, stacked, dropped, thrown as ammo, placed on belts, loaded into hoppers, stolen by enemies.

### Cube Lifecycle

```
Deposit -> [grind] -> Powder -> [compress] -> Cube -> [carry to furnace] -> [smelt] -> Refined Cube
                                                   -> [place on belt] -> transported to machine
                                                   -> [stack] -> wall / structure
                                                   -> [throw] -> projectile (cubeAmmo)
                                                   -> [get raided] -> enemy steals cube
```

### Why Physical?

Your wealth is the stack of cubes sitting outside your base, visible to every faction. Enemies can plan raids (`raidSystem.ts` + `raidTargeting.ts`) to steal your cubes. You can build decoy piles (`decoyPile.ts`) to misdirect them. You can build walls by stacking cubes (`wallBuilding.ts`), where the material type determines structural strength.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **First-person view** | You ARE the bot. Intimate relationship with the physical economy. `FPSCamera.tsx` with pointer lock. Switch bots via `switchBot()`. |
| **Contextual interaction** | Click any object -> emissive highlight -> radial action menu. No tool system. Actions depend on target, not equipped item. |
| **Physical cubes** | Wealth is visible, steal-able, raid-able. Creates natural tension and strategic depth. |
| **Component-based damage** | Units have functional/broken parts (`UnitComponent[]`), not HP bars. Losing your camera = losing vision. Losing arms = cannot grab cubes. |
| **Config-driven balance** | 39 JSON files cover every tunable. Balance changes never require code changes. |
| **Two-loop separation** | Fixed ticks for deterministic simulation; frame rate for smooth rendering. Scene components read ECS in `useFrame`, never through React state. |
| **Lazy scene loading** | `GameScene` is `React.lazy()`. Title and pregame load instantly; 3D bundle loaded only when game starts. |
| **Seeded generation** | `src/ecs/seed.ts` provides deterministic PRNG. Same seed phrase = same world. |
| **Miniplex -> Koota** | Koota adds trait-based SoA storage, relations, reactive queries. Migration is incremental via `bridge.ts`. |
| **GOAP for strategic AI** | Governors evaluate goals dynamically via planner, not scripted behavior trees. |
| **Yuka for movement** | Vehicle steering with proper velocity/acceleration. NavMesh for pathfinding. Not teleporting. |

---

## State Bridge (ECS to React)

The simulation tick notifies React UI via `useSyncExternalStore`:

```ts
// In src/ecs/gameState.ts
export function subscribe(listener: () => void): () => void { ... }
export function getSnapshot(): GameSnapshot { ... }

// GameSnapshot contains:
interface GameSnapshot {
  tick: number;
  gameSpeed: number;
  paused: boolean;
  fragments: MapFragment[];
  unitCount: number;
  enemyCount: number;
  mergeEvents: MergeEvent[];
  combatEvents: CombatEvent[];
  power: PowerSnapshot;
  resources: ResourcePool;
  fabricationJobs: FabricationJob[];
  gameOver: GameOverState | null;
}
```

`CoreLoopSystem` has its own separate store (`subscribeCoreLoop` / `getCoreLoopSnapshot`) for per-frame data (harvesting state, compression progress, furnace snapshots, held cube ID) that changes too frequently for the main tick store.

---

## Testing

| Layer | Tool | Location | Count |
|-------|------|----------|-------|
| Unit | Jest + ts-jest | `src/*/__tests__/` | 158 test files |
| Integration | Jest | `src/__tests__/coreLoop.integration.test.ts` | 1 file |
| E2E | Playwright | `tests/e2e/` | 4 specs |
| CI | GitHub Actions | `.github/workflows/ci.yml` | Lint + type check + tests |

Jest config (`jest.config.js`): ts-jest transform, node environment, matches `src/**/__tests__/**/*.test.{ts,tsx}`.

Test files by domain: `src/systems/__tests__/` (138 files, ~67K lines), `src/ai/__tests__/` (10), `src/ecs/__tests__/` (6), `src/input/__tests__/` (2+), `src/save/__tests__/` (1), `src/ui/__tests__/` (1).

Run: `npm test` (unit), `npm run test:e2e` (E2E), `npm run test:e2e:ui` (interactive E2E).

---

## Application Flow

```
main.tsx (Vite entry)
  └── App.tsx (phase state machine: title | pregame | playing)
        ├── "title"   -> TitleScreen.tsx
        ├── "pregame" -> PregameScreen.tsx (race selection, map config, AI opponents)
        └── "playing" -> GameScene.tsx (React.lazy, lazy-loaded)
                           ├── Canvas (R3F)
                           │   ├── FPSCamera + FPSInput (pointer lock, WASD)
                           │   ├── PhysicsSystem (Rapier WASM)
                           │   ├── EnvironmentSetup (lights, HDRI)
                           │   ├── TerrainRenderer + TerrainPBR
                           │   ├── CityRenderer + FactoryRenderer + FurnaceRenderer
                           │   ├── FreeCubeRenderer + PlacedCubeRenderer + WallRenderer
                           │   ├── BeltRenderer + WireRenderer
                           │   ├── OreDepositRenderer + LandscapeProps
                           │   ├── UnitRenderer + OtterRenderer
                           │   ├── HologramRenderer + FogOfWarRenderer
                           │   ├── SelectionHighlight + StockpileGlow + WealthIndicator
                           │   ├── HarvestParticles + StormSky + Flashlight + CameraEffects
                           │   ├── PlacementPreview
                           │   ├── ObjectSelectionSystem
                           │   ├── CoreLoopSystem (per-frame)
                           │   ├── GameplaySystems (per-frame)
                           │   ├── InteractionSystem (per-frame)
                           │   ├── YukaSystem (AI steering)
                           │   ├── AudioSystem (Tone.js)
                           │   └── NavMeshDebugRenderer (debug toggle)
                           └── DOM Overlay
                               ├── FPSHUD + CoreLoopHUD
                               ├── ObjectActionMenu
                               ├── PowerOverlay
                               ├── QuestPanel + TechTreePanel
                               ├── InventoryView
                               ├── MobileControls
                               ├── SaveLoadMenu
                               ├── GameOverScreen
                               └── Bezel
```
