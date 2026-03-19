# Syntheteria — Architecture

> Technical reference for the ground-up rewrite on `docs/syntheteria-1-0-done`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | **Vite** (`pnpm dev`, `pnpm build`) |
| Renderer | **R3F** — one persistent `<Canvas>` in `Globe.tsx` |
| ECS | **Koota** — all game state as typed traits |
| AI | **Yuka** — GOAP goal evaluation, fuzzy logic, NavGraph A* |
| Persistence | **sql.js** — pure JS SQLite, no wasm needed |
| Testing | **Vitest** (`*.vitest.ts` files) |
| Lint/format | **Biome** (tabs, double quotes, sorted imports) |
| TypeScript | Strict mode, 0 errors required |
| GLSL | Extracted to `.glsl` files with `vite-plugin-glsl` `#include` directives |

**Entry:** `src/main.tsx` — DOM bootstrap + `Root` component (phase state machine)

---

## Repository Layout

```
syntheteria/
├── AGENTS.md                  # Multi-agent orchestration (READ FIRST)
├── CLAUDE.md                  # Claude Code contract
├── src/
│   ├── main.tsx               # Entry: DOM bootstrap + Root (title → setup → generating → playing)
│   ├── board/                 # Fixed-size deterministic board generator
│   │   ├── generator.ts       # generateBoard(config) — seeded noise, resource scatter
│   │   ├── adjacency.ts       # BFS reachability, A* pathfinding
│   │   ├── grid.ts            # GridApi — addressable interface
│   │   ├── depth.ts           # Bridge/tunnel span generation
│   │   ├── noise.ts           # FNV-1a + mulberry32 PRNG
│   │   ├── cityLayout.ts      # BSP city layout (walls, corridors, districts)
│   │   ├── connectivity.ts    # Flood-fill + corridor punching
│   │   ├── labyrinth*.ts      # Rooms-and-Mazes generator (4 files)
│   │   └── types.ts           # Elevation, TileData, BoardConfig, GeneratedBoard
│   ├── camera/
│   │   ├── IsometricCamera.tsx # Flat-board CivRev2-style PAN camera
│   │   ├── SphereOrbitCamera.tsx # Sphere world orbit camera
│   │   ├── cameraStore.ts     # Global camera controls registry
│   │   ├── cutawayStore.ts    # Cutaway clip plane state
│   │   └── types.ts           # CameraControls interface
│   ├── ecs/
│   │   ├── traits/            # board, tile, unit, faction, resource, building, salvage, cult
│   │   ├── terrain/           # FloorType, FLOOR_DEFS, ResourceMaterial, GLSL shaders
│   │   ├── robots/            # 9 archetypes, placement flags, marks, specializations
│   │   │   └── specializations/  # 6 track files + trackRegistry.ts (14 tracks total)
│   │   ├── factions/          # definitions, cults, init, relations
│   │   ├── buildings/         # 15 faction buildings + 6 cult structures (TypeScript const)
│   │   ├── resources/         # 10 salvage types with yield tables
│   │   ├── narrative/         # speechProfiles — faction persona dialogue
│   │   └── systems/           # 40+ systems (movement, combat, economy, AI, cult, etc.)
│   ├── ai/                    # Yuka GOAP AI
│   │   ├── agents/            # SyntheteriaAgent.ts — agent entity
│   │   ├── fuzzy/             # situationModule.ts — fuzzy logic assessment
│   │   ├── goals/             # evaluators.ts — GOAP goal evaluation
│   │   ├── navigation/        # boardNavGraph.ts — NavGraph pathfinding
│   │   ├── perception/        # factionMemory.ts — perception memory
│   │   ├── runtime/           # AIRuntime.ts — runtime orchestration
│   │   ├── triggers/          # territoryTrigger.ts — territory response
│   │   ├── trackSelection.ts  # Per-faction specialization preferences
│   │   └── yukaAiTurnSystem.ts # Per-turn AI execution
│   ├── systems/               # radialMenu state machine, radialProviders
│   ├── audio/                 # audioEngine, sfx (Tone.js), ambience (storm loop)
│   ├── db/                    # SQLite schema + GameRepo (sql.js adapter)
│   ├── rendering/
│   │   ├── BoardRenderer.tsx  # Merged BufferGeometry, PBR atlas shader
│   │   ├── BiomeRenderer.tsx  # Biome-specific terrain visuals
│   │   ├── UnifiedTerrainRenderer.tsx # Unified depth layers (bridge/pit/terrain)
│   │   ├── HighlightRenderer.tsx # Emissive overlay from TileHighlight
│   │   ├── UnitRenderer.tsx   # GLB models, faction colors, lerped movement
│   │   ├── BuildingRenderer.tsx # Building GLBs, fog-gated
│   │   ├── SalvageRenderer.tsx # Salvage GLBs
│   │   ├── StructureRenderer.tsx # Wall/column rendering
│   │   ├── ProceduralStructureRenderer.tsx # Procedural geometry
│   │   ├── FogOfWarRenderer.tsx # Per-unit scan radius fog
│   │   ├── TerritoryOverlayRenderer.tsx # Faction territory colors
│   │   ├── PathRenderer.tsx   # Pathfinding visualization
│   │   ├── CombatEffectsRenderer.tsx # Damage text + combat flash
│   │   ├── FragmentRenderer.tsx # Memory fragment objects
│   │   ├── SpeechBubbleRenderer.tsx # In-world speech bubbles
│   │   ├── UnitStatusBars.tsx # HP/AP bars above units
│   │   ├── CutawayClipPlane.tsx # Dollhouse zoom clipping
│   │   ├── StormDome.tsx      # BackSide sky sphere with storm + wormhole + illuminator GLSL
│   │   ├── boardGeometry.ts   # Flat board + sphere geometry builders
│   │   ├── spherePlacement.ts # Model position + orientation on sphere surface
│   │   ├── modelPaths.ts      # GLB model path resolution
│   │   ├── tileVisibility.ts  # Fog-gated visibility
│   │   ├── particles/         # ParticlePool, ParticleRenderer, effectEvents
│   │   ├── globe/             # Title screen: GlobeWithCities, Hypercane, StormClouds, Lightning, shaders
│   │   ├── sky/               # chronometry.ts — turn→time (day/night, seasons)
│   │   ├── labyrinth/         # wallClassification.ts
│   │   └── glsl/              # GLSL shaders: fogOfWar (flat+sphere), height
│   ├── input/                 # BoardInput (click-to-select, click-to-move, click-to-attack)
│   ├── ui/
│   │   ├── Globe.tsx          # ONE persistent R3F Canvas across all phases
│   │   ├── FatalErrorModal.tsx # Error recovery UI
│   │   ├── icons.tsx          # UI icon components
│   │   ├── landing/           # LandingScreen, NewGameModal, SettingsModal, title/
│   │   └── game/              # HUD, RadialMenu, GarageModal, overlays, panels (26 files)
│   ├── config/                # 11 definition files (all TypeScript const objects)
│   │   ├── gameDefaults.ts    # All tunables: tile size, AP, camera, board sizes, faction colors
│   │   ├── techTreeDefs.ts    # 27 techs in 5 tiers
│   │   ├── buildingDefs.ts    # Building type definitions
│   │   ├── diplomacyDefs.ts   # Diplomacy thresholds and rules
│   │   ├── factionAiDefs.ts   # AI faction personality parameters
│   │   ├── movementDefs.ts    # Movement cost definitions
│   │   ├── narrativeDefs.ts   # Narrative/lore definitions
│   │   ├── poiDefs.ts         # Point of interest definitions
│   │   ├── recipeDefs.ts      # Synthesis recipe definitions
│   │   ├── upgradeDefs.ts     # Upgrade path definitions
│   │   └── weatherDefs.ts     # Storm/weather parameters
│   └── world/                 # Config wiring, world initialization
├── docs/
│   ├── GAME_DESIGN.md         # Vision, lore, world model, economy, bots, factions
│   ├── ARCHITECTURE.md        # THIS FILE — tech stack, packages, patterns
│   ├── ROADMAP.md             # Foundation status, next systems
│   └── memory-bank/           # Session context (activeContext.md, progress.md)
├── public/
│   ├── assets/models/         # 360 curated GLB models (city, defense, industrial, etc.)
│   └── assets/textures/       # PBR atlas textures (AmbientCG)
└── pending/                   # OLD GAME — quarantined, REFERENCE ONLY (see §7)
```

---

## Package Reference

### `src/board/` — Board Generator

Fixed-size deterministic board. No infinite chunk streaming.

| File | Purpose |
|------|---------|
| `types.ts` | `Elevation`, `TileData`, `BoardConfig`, `GeneratedBoard` |
| `generator.ts` | `generateBoard(config)` — seeded noise, resource scatter, faction corners |
| `noise.ts` | FNV-1a hash → mulberry32 PRNG, 2D value noise |
| `adjacency.ts` | `tileNeighbors()`, `reachableTiles()` (BFS), `shortestPath()` (A*) |
| `grid.ts` | `createGridApi(board)` — addressable API for all placement + display systems |
| `depth.ts` | `generateDepthLayer()` — bridge/tunnel span generation |
| `cityLayout.ts` | BSP city layout — walls, corridors, doorways, 5 district zones |
| `connectivity.ts` | Flood-fill + corridor punching — connectivity guarantee |
| `labyrinthGenerator.ts` | Rooms-and-Mazes generator (main entry) |
| `labyrinthMaze.ts` | Maze corridor generation |
| `labyrinthAbyssal.ts` | Abyssal zone generation |
| `labyrinthFeatures.ts` | Feature placement |
| `labyrinthConnectivity.ts` | Labyrinth connectivity |
| `labyrinth.ts` | Core labyrinth types |

**GridApi** is the only public interface into board state outside `board/`. Never access `board.tiles[][]` directly.

**Elevation:** `-1` (void pit) | `0` (ground) | `1` (bridge) | `2` (elevated structure tier).

### `src/ecs/` — Koota ECS

All game state lives as typed traits on Koota entities.

#### Core

| File | Purpose |
|------|---------|
| `world.ts` | `createWorld()` + `WorldType` export |
| `init.ts` | `initWorldFromBoard(world, board)` — tiles, resources, factions, robots |
| `seed.ts` | Seed phrase ↔ numeric seed conversion |

#### Traits (`ecs/traits/`)

| Trait file | Traits defined |
|-----------|----------------|
| `board.ts` | `Board` singleton — width, height, seed, tileSizeM |
| `tile.ts` | `Tile`, `TileHighlight` |
| `unit.ts` | `UnitPos`, `UnitMove`, `UnitFaction`, `UnitStats` (incl. attack/defense), `UnitVisual`, `UnitAttack`, `UnitHarvest` |
| `faction.ts` | `Faction`, `FactionRelation` |
| `resource.ts` | `ResourceDeposit` (13-material), `ResourcePool` (per-faction stockpile) |
| `building.ts` | `Building`, `PowerGrid`, `SignalNode`, `TurretStats`, `BotFabricator`, `StorageCapacity` |
| `salvage.ts` | `SalvageProp` — harvestable dead-world props (primary resource source) |
| `cult.ts` | `CultStructure` — cult-placed structures at breach zones |

#### Terrain (`ecs/terrain/`)

| File | Purpose |
|------|---------|
| `types.ts` | `FloorType` (9 substrates), `ResourceMaterial` (13 materials), `FLOOR_DEFS` |
| `traits.ts` | `TileFloor` — floorType, mineable, hardness, resourceType, resourceAmount |
| `cluster.ts` | JS mirror of GLSL cluster math — `floorTypeForTile()`, `tileFloorProps()` |
| `floorShader.ts` | `makeFloorShaderMaterial(seed)` — PBR atlas shader (5 AmbientCG atlas maps) |
| `glsl/` | Extracted GLSL shader files: `floorVert.glsl`, `floorFrag.glsl`, `common.glsl`, `patterns/*.glsl` |

**9 terrain substrates** (FloorType):
- Impassable: `void_pit`, `structural_mass`
- Passable: `abyssal_platform`, `transit_deck`, `durasteel_span`, `collapsed_zone`, `dust_district`, `bio_district`, `aerostructure`

**13 resource materials** (ResourceMaterial):
- Foundation: `ferrous_scrap`, `alloy_stock`, `polymer_salvage`, `conductor_wire`
- Advanced: `electrolyte`, `silicon_wafer`, `storm_charge`, `el_crystal`
- Common: `scrap_metal`, `e_waste`, `intact_components`
- Abyssal: `thermal_fluid`, `depth_salvage`

#### Buildings (`ecs/buildings/`)

| File | Purpose |
|------|---------|
| `definitions.ts` | `BUILDING_DEFS` — 15 faction-buildable structures (TypeScript const, not JSON) |
| `cultStructures.ts` | `CULT_STRUCTURE_DEFS` — 6 cult structures |

**15 faction buildings:** storm_transmitter, power_box, synthesizer, motor_pool, relay_tower, defense_turret, storage_hub, maintenance_bay, power_plant, research_lab, resource_refinery, solar_array, geothermal_tap, outpost, wormhole_stabilizer

**6 cult structures:** breach_altar, signal_corruptor, human_shelter, corruption_node, cult_stronghold, bio_farm

**Storm power model:** The perpetual storm IS the power grid. Storm transmitters tap it (positive `powerDelta`), power boxes store charge (`storageCapacity`), everything else draws from nearby power boxes (negative `powerDelta`).

#### Resources / Salvage (`ecs/resources/`)

| File | Purpose |
|------|---------|
| `salvageTypes.ts` | `SALVAGE_DEFS` — 10 harvestable prop types with yield tables and GLB model mappings |

**10 salvage types:** container, terminal, vessel, machinery, debris, cargo_crate, storage_rack, power_cell, landing_wreck, abyssal_relic — PRIMARY resource source. Each maps to specific GLB models and yields specific materials. `abyssal_relic` yields `el_crystal`.

#### Systems (`ecs/systems/`)

42 systems. See `docs/memory-bank/progress.md` for the complete list with status and file paths.

#### Other ECS packages

| Package | Purpose |
|---------|---------|
| `robots/` | 9 robot spawn functions + placement flags + marks system + specialization tracks |
| `robots/specializations/` | 6 track files (14 tracks) + trackRegistry.ts — single source of truth |
| `robots/classActions.ts` | Per-class action definitions (unique action sets per robot class) |
| `factions/` | `FACTION_DEFINITIONS`, `CULT_DEFINITIONS`, relations helpers |
| `narrative/` | Speech profiles — faction persona dialogue |

### `src/systems/` — Radial Menu

| File | Purpose |
|------|---------|
| `radialMenu.ts` | Dual-ring radial context menu state machine (pure TS, no React) |
| `radialProviders.ts` | Move/Harvest/Attack action providers |

### `src/db/` — SQLite Persistence

| File | Purpose |
|------|---------|
| `schema.ts` | `meta`, `games`, `tiles`, `tile_resources`, `units`, `buildings`, `events` |
| `migrations.ts` | Run pending schema migrations |
| `adapter.ts` | `SqliteAdapter` interface + `createSqlJsAdapter()` |
| `gameRepo.ts` | `GameRepo`: `createGame`, `saveTiles`, `listGames`, `getGame`, `loadTiles` |
| `serialize.ts` | World state ↔ DB serialization |
| `types.ts` | `GameRecord`, `GameSummary`, `TileRecord`, `UnitRecord` |

SQLite is **non-fatal**: DB failures don't crash the game — ECS runs in memory.

### `src/rendering/` — R3F Renderers

| File | Purpose |
|------|---------|
| `BoardRenderer.tsx` | Merged `BufferGeometry` (single draw call), PBR atlas shader |
| `BiomeRenderer.tsx` | Biome-specific terrain visuals |
| `UnifiedTerrainRenderer.tsx` | Unified depth layers — replaced DepthRenderer + MinedPitRenderer |
| `HighlightRenderer.tsx` | Thin emissive plane pool per tile from `TileHighlight` |
| `UnitRenderer.tsx` | GLB models from asset library, lerped on `UnitMove`, faction colors |
| `BuildingRenderer.tsx` | Building GLBs, fog-gated |
| `SalvageRenderer.tsx` | Salvage prop GLBs |
| `StructureRenderer.tsx` | Wall/column structural rendering |
| `ProceduralStructureRenderer.tsx` | Procedural geometry for structures |
| `FogOfWarRenderer.tsx` | Per-unit scan radius fog (flat + sphere GLSL variants) |
| `TerritoryOverlayRenderer.tsx` | Faction territory color overlay |
| `PathRenderer.tsx` | Pathfinding line visualization |
| `CombatEffectsRenderer.tsx` | Floating damage numbers + combat flash |
| `FragmentRenderer.tsx` | Memory fragment glowing objects |
| `SpeechBubbleRenderer.tsx` | In-world speech bubble rendering |
| `UnitStatusBars.tsx` | HP/AP status bars above units |
| `CutawayClipPlane.tsx` | Dollhouse zoom clipping plane |
| `StormDome.tsx` | BackSide sphere with 3 GLSL layers (storm / wormhole / illuminator disc) |
| `boardGeometry.ts` | Both flat (legacy) and sphere geometry builders |
| `spherePlacement.ts` | Model position + orientation on sphere surface |
| `modelPaths.ts` | GLB model path resolution |
| `tileVisibility.ts` | Fog-gated visibility checks |
| `particles/` | ParticlePool + ParticleRenderer + effectEvents |
| `globe/` | Title screen: GlobeWithCities, Hypercane, StormClouds, Lightning, TitleText, shaders |
| `sky/chronometry.ts` | `turnToChronometry(turn)` — day/night cycle + seasons from turn counter |
| `labyrinth/wallClassification.ts` | Wall type classification |
| `glsl/` | GLSL shaders: fogOfWar (flat + sphere variants), height shaders |

### `src/ai/` — Yuka GOAP AI

| File | Purpose |
|------|---------|
| `yukaAiTurnSystem.ts` | Per-turn AI faction execution |
| `trackSelection.ts` | AI faction track preferences for fabrication |
| `agents/SyntheteriaAgent.ts` | Yuka agent entity definition |
| `fuzzy/situationModule.ts` | Fuzzy logic situation assessment |
| `goals/evaluators.ts` | GOAP goal evaluation |
| `navigation/boardNavGraph.ts` | NavGraph pathfinding for AI |
| `perception/factionMemory.ts` | Perception memory for sighted units |
| `runtime/AIRuntime.ts` | AI runtime orchestration |
| `triggers/territoryTrigger.ts` | Territory change response system |

### `src/audio/` — Sound

| File | Purpose |
|------|---------|
| `audioEngine.ts` | Core audio system |
| `sfx.ts` | Tone.js synth pooling + SFX playback |
| `ambience.ts` | Continuous ambient storm loop |

### `src/camera/` — Camera

| File | Purpose |
|------|---------|
| `IsometricCamera.tsx` | Flat-board CivRev2 camera: `enableRotate=false`, FOV=45, WASD pan |
| `SphereOrbitCamera.tsx` | Sphere orbit camera: orbit around (0,0,0), polar clamped, WASD rotates globe |
| `cameraStore.ts` | Global camera controls registry (for Minimap click-to-pan etc.) |
| `cutawayStore.ts` | Cutaway clip plane state management |
| `types.ts` | `CameraControls` interface: panTo/snapTo/setZoom/reset |

### `src/input/` — Input Handling

| File | Purpose |
|------|---------|
| `BoardInput.tsx` | Click-to-select, click-to-move, click-to-attack via Y=0 plane raycast |

### `src/ui/` — UI Components

| File | Purpose |
|------|---------|
| `Globe.tsx` | **ONE persistent R3F Canvas** — renders across all phases (title/setup/generating/playing) |
| `FatalErrorModal.tsx` | Error recovery modal |
| `icons.tsx` | UI icon components |
| `ui/landing/LandingScreen.tsx` | Title, New Game button, Continue (when saves exist), Settings |
| `ui/landing/NewGameModal.tsx` | SectorScale presets, seed phrases, difficulty/climate/storm options, faction setup |
| `ui/landing/SettingsModal.tsx` | Audio sliders, keybindings reference, accessibility |
| `ui/landing/title/` | Title menu scene components |
| `ui/game/GameScreen.tsx` | **LEGACY** — old separate Canvas, superseded by Globe.tsx |
| `ui/game/HUD.tsx` | Turn counter, resource counters (13-material), AP display, End Turn button |
| `ui/game/RadialMenu.tsx` | SVG renderer for dual-ring radial context menu |
| `ui/game/GarageModal.tsx` | Two-step fabrication: Classification → Specialization track |
| `ui/game/TechTreeOverlay.tsx` | Full 27-tech DAG with research progress |
| `ui/game/DiplomacyOverlay.tsx` | Faction standings panel |
| `ui/game/UnitRosterOverlay.tsx` | All player units with quick-jump |
| `ui/game/TurnSummaryPanel.tsx` | End-of-turn recap |
| `ui/game/AlertBar.tsx` | Off-screen event alerts |
| `ui/game/TutorialOverlay.tsx` | 5-step guided onboarding |

All player-visible elements carry `data-testid` attributes for component tests and E2E.

### `src/config/` — Tunables

11 definition files — all TypeScript `const` objects (never JSON):

| File | Purpose |
|------|---------|
| `gameDefaults.ts` | All tunables: tile size, AP, camera, board sizes, faction colors, unit dims |
| `techTreeDefs.ts` | 27 techs in 5 tiers — 15 base + 12 track-gating |
| `buildingDefs.ts` | Building type definitions |
| `diplomacyDefs.ts` | Diplomacy thresholds and rules |
| `factionAiDefs.ts` | AI faction personality parameters |
| `movementDefs.ts` | Movement cost definitions |
| `narrativeDefs.ts` | Narrative/lore definitions |
| `poiDefs.ts` | Point of interest definitions |
| `recipeDefs.ts` | Synthesis recipe definitions |
| `upgradeDefs.ts` | Upgrade path definitions |
| `weatherDefs.ts` | Storm/weather parameters |

**Rule:** No magic numbers in system or rendering code. All tunables in config files.

---

## Phase State Machine (`main.tsx`)

```
"title"       → Globe rotates, title text, storms, far camera (DOM: title buttons)
    ↓ user clicks New Game
"setup"       → Globe visible behind modal (DOM: NewGameModal overlay)
    ↓ user submits config
"generating"  → Globe growth animation, camera zooms to surface
    ↓ growth complete
"playing"     → Game renderers, game HUD, all overlays
```

`Root` in `main.tsx` owns the phase state. `Globe.tsx` (`src/ui/Globe.tsx`) is the ONE persistent
`<Canvas>` that renders across all phases. Title scene components are visible in non-playing phases;
game renderers activate in the playing phase.

Landing DOM overlays (`LandingScreen`, `NewGameModal`) layer on top of the Canvas.
Game DOM overlays (`HUD`, `GarageModal`, etc.) layer on top during the playing phase.

**UI Architecture Rule:**
- **Overlay UI** (HUD, modals, panels) = DOM-based, layered on Canvas
- **Diegetic UI** (speech bubbles, status bars, particles) = in-Canvas R3F components

### `window.__syntheteria` Debug Bridge

`main.tsx` exposes live game state after every render:

```ts
window.__syntheteria = {
  phase: "title" | "setup" | "generating" | "playing",
  turn: number,
  playerAp: number,
  selectedUnitId: number | null,
  getWorld: () => WorldType | null,
};
```

---

## Sphere World Architecture

### Geometry (`boardGeometry.ts`)

The board geometry module contains BOTH flat and sphere implementations:

**Flat board (legacy, to be deleted):**
- `buildBoardGeometry()` — merged BufferGeometry with CURVE_STRENGTH cosine curvature
- `GHOST = 30` — extra tile rows rendered beyond board edge for seamless wrapping
- `CURVE_STRENGTH = 0.0008` — cosine-based vertex displacement

**Sphere world (current):**
- `buildSphereGeometry(board)` — maps tile grid onto SphereGeometry via equirectangular projection
- `sphereRadius(W, H)` — computes sphere radius from board dimensions
- `tileToSpherePos(x, z, W, H, R)` — converts tile grid coords to 3D sphere surface position
- `spherePosToTile(pos, W, H, R)` — inverse: 3D position → tile coords (for raycasting)

### Model Placement (`spherePlacement.ts`)

All 3D models (units, buildings, salvage, structures) are placed on the sphere surface:
- Position: `tileToSpherePos()` + optional Y offset along normal
- Orientation: quaternion rotating local Y-up to sphere outward normal
- `sphereModelPlacementWithRotation()` adds additional Y-axis rotation for directional models

### Camera (`SphereOrbitCamera.tsx`)

- OrbitControls centered at (0,0,0) — the sphere center
- Left drag = orbit (rotate azimuth + polar)
- Scroll = zoom (change orbit distance)
- WASD = orbit via keyboard
- Pan DISABLED — the world rotates, not the camera target
- Polar angle clamped to avoid pole singularities
- Zoom bounds: 1.15x radius (surface) to 4x radius (full planet)

### Fog of War on Sphere

Dedicated GLSL shaders for sphere-surface fog:
- `fogOfWarSphereVert.glsl` — vertex shader
- `fogOfWarSphereFrag.glsl` — fragment shader
- BFS distance computed on sphere surface

### Tile = GPS Coordinate

Each (x,z) tile is a GPS database record. The `explored` flag is the topmost gatekeeper:
- Unexplored tiles: no data revealed, fog shader active
- Explored tiles: terrain, resources, buildings visible

---

## ECS Patterns

### Core Rules

| Rule | Detail |
|------|--------|
| Systems accept `world` param | Never use world singleton import — enables clean test isolation |
| `.get()` returns undefined | Always null-guard: `const x = e.get(Trait); if (!x) continue;` |
| No `world.entity(id)` | Rebuild `Map<id, Entity>` per-operation when needed |
| 16 worlds max per process | Tests use `world.destroy()` in `afterEach` |
| No JSON for game data | All models/factions/robots/buildings are TypeScript `const` objects |

### Query Pattern

```ts
// Always pass world as parameter, never import singleton
export function highlightSystem(world: WorldType, unitId: number) {
  for (const entity of world.query(Tile, TileHighlight)) {
    const tile = entity.get(Tile);
    const highlight = entity.get(TileHighlight);
    if (!tile || !highlight) continue;
    // ...
  }
}
```

### Trait Definition Pattern

```ts
export const UnitStats = trait({
  hp: 10,
  maxHp: 10,
  ap: 3,
  maxAp: 3,
  attack: 2,
  defense: 1,
  scanRange: 4,
});
```

### Robot Spawn Pattern

```ts
export function spawnSentinelBot(world: WorldType, tileX: number, tileZ: number, factionId: string) {
  return world.spawn(
    UnitPos({ tileX, tileZ }),
    UnitStats({ ...SENTINEL_BOT_DEFAULTS.stats }),
    UnitVisual({ ...SENTINEL_BOT_DEFAULTS.visual }),
    UnitFaction({ factionId }),
  );
}
```

### Faction Relations

```ts
setRelation(world, "player", "reclaimers", "hostile");
getRelation(world, "player", "reclaimers"); // → "hostile"
isHostile(world, "player", "reclaimers");   // → true
```

---

## SQLite Schema (current)

```sql
meta           -- key/value pairs (schema version)
games          -- id, seed, board_w, board_h, difficulty, turn, timestamps
tiles          -- game_id, x, z, zone, elevation, passable
tile_resources -- game_id, x, z, resource_type, amount, depleted
units          -- id, game_id, faction_id, tile_x, tile_z, hp, ap, model_id
buildings      -- id, game_id, faction_id, tile_x, tile_z, type, hp
events         -- id, game_id, turn, type, payload (JSON)
```

---

## Test Strategy

**126 test suites, 2239 tests. 0 TypeScript errors. Vitest-only.**

Run: `pnpm test:vitest` (unit) | `pnpm test:ct` (browser CT) | `pnpm verify` (full gate)

| Suite | Coverage |
|-------|---------|
| `board/__tests__/generator.vitest.ts` | Board generation, seed determinism, resource scatter |
| `board/__tests__/adjacency.vitest.ts` | BFS reachability, A* pathfinding |
| `board/__tests__/depth.vitest.ts` | Bridge/tunnel span generation |
| `board/__tests__/grid.vitest.ts` | GridApi CRUD |
| `board/__tests__/noise.vitest.ts` | seededRng determinism/range, noise2D |
| `camera/__tests__/camera.vitest.ts` | Camera: FOV, angle, CameraControls API |
| `ecs/__tests__/traits.vitest.ts` | Koota trait defaults, world lifecycle |
| `ecs/__tests__/movementSystem.vitest.ts` | movementSystem lerp + completion |
| `ecs/__tests__/highlightSystem.vitest.ts` | BFS highlight + clear |
| `ecs/__tests__/turnSystem.vitest.ts` | Turn advance, AP refresh |
| `ecs/__tests__/placement.vitest.ts` | Robot placement flags → tile coords |
| `ecs/__tests__/robots.vitest.ts` | 9 robot spawn functions |
| `ecs/__tests__/factions.vitest.ts` | FACTION_DEFINITIONS, CULT_DEFINITIONS, relations |
| `ecs/__tests__/init.vitest.ts` | initWorldFromBoard: Board, tiles, ResourceDeposit, factions, robots |
| `ecs/terrain/__tests__/*.vitest.ts` | Elevation, floor shader, cluster math |
| `ecs/systems/__tests__/*.vitest.ts` | All 42 systems |
| `db/__tests__/gameRepo.vitest.ts` | GameRepo CRUD, round-trip |
| `ui/__tests__/*.vitest.tsx` | HUD, NewGameModal, LandingScreen |
| `systems/__tests__/radialMenu.vitest.ts` | Dual-ring state machine, hit testing, providers |
| `rendering/__tests__/*.vitest.ts` | Renderers, chronometry |
| `ai/__tests__/*.vitest.ts` | AI systems |
| `config/__tests__/*.vitest.ts` | Config definitions |
| `world/__tests__/*.vitest.ts` | World config |

---

## Rendering: PBR Texture Atlas

`BoardRenderer` uses `THREE.ShaderMaterial` with a PBR texture atlas from AmbientCG.

### Atlas Pipeline

1. **Source**: 8 AmbientCG PBR material packs (Metal032, Metal038, Concrete007, Concrete034, Asphalt004, Metal025, Metal036, Grate001)
2. **Build**: Atlas builder composites 8 materials into a 3x3 grid (3072x3072, 1024px per cell)
3. **Output**: 5 atlas maps in `public/assets/textures/`:
   - `floor_atlas_color.jpg` — base color (sRGB)
   - `floor_atlas_normal.jpg` — normal map (linear)
   - `floor_atlas_roughness.jpg` — roughness (linear)
   - `floor_atlas_metalness.jpg` — metalness (linear)
   - `floor_atlas_opacity.jpg` — opacity (linear, used for grating cutout)

### Shader

GLSL shaders in `src/ecs/terrain/glsl/`:
- `floorVert.glsl` — vertex shader with elevation
- `floorFrag.glsl` — fragment shader samples atlas by floorType index, applies PBR lighting
- `common.glsl` — shared noise functions
- `patterns/` — per-substrate surface shaders

Atlas UV mapping: `floorType` integer → atlas cell index → UV offset.
Grating opacity cutout: `abyssal_platform` tiles use opacity atlas to discard fragments, revealing void beneath.

### Material Setup (`floorShader.ts`)

```ts
makeFloorShaderMaterial(seed, boardCenterX, boardCenterZ)
```

Uniforms: `uColorAtlas`, `uNormalAtlas`, `uRoughnessAtlas`, `uMetalnessAtlas`, `uOpacityAtlas`,
`uSeed`, `uBoardCenter`, `uCurve`, `uSunDir`, `uSunColor`, `fogColor`, `fogDensity`.

Fixed zenith sun — perpetual harsh artificial daylight under the dome (no day/night orbit).

---

## Specialization System

Robot classes can specialize into permanent tracks at fabrication time. Chosen in the Garage modal (two-step: Classification → Specialization).

### Architecture

```
src/ecs/robots/specializations/
├── trackRegistry.ts      # Central registry — single source of truth
├── scoutTracks.ts         # Pathfinder + Infiltrator (2 tracks)
├── infantryTracks.ts      # Vanguard + Shock Trooper (2 tracks)
├── cavalryTracks.ts       # Flanker + Interceptor (2 tracks)
├── rangedTracks.ts        # Sniper + Suppressor (2 tracks)
├── supportTracks.ts       # Field Medic + Signal Booster + War Caller (3 tracks)
└── workerTracks.ts        # Deep Miner + Fabricator + Salvager (3 tracks)
```

### Track Registry (`TrackEntry`)

Each track defines: `trackId`, `robotClass`, `label`, `description`, `gateTechId`, `v2TechId`, optional `statMods`.

### Flow

1. Player opens Garage at motor pool → `GarageModal.tsx`
2. Step 1: pick robot class (6 options)
3. Step 2: pick specialization track (filtered by researched gate techs)
4. `queueFabrication()` with track ID → unit spawns with `UnitSpecialization` trait
5. Each turn, `specializationSystem.ts` applies aura passives based on track + mark level

### AI Track Selection

`src/ai/trackSelection.ts` — each AI faction has preferred tracks per class:
- Reclaimers: pathfinder, vanguard, fabricator/salvager
- Iron Creed: shock_trooper, interceptor, war_caller
- Signal Choir: infiltrator, sniper, signal_booster
- Volt Collective: infiltrator, interceptor, deep_miner

### Tech Gates

12 track techs (2 per class: gate + v2 upgrade) added to `techTreeDefs.ts`, bringing total to 27 techs.

---

## 7. `pending/` as Reference Library

`pending/` contains the old ecumenopolis game (React Native + Metro). It is **permanently quarantined**:
- Excluded from `tsconfig` and Biome
- Nothing from there is resurrected directly — all ports are rewrites on the new foundation

### High-Value Reference Targets

| Location | What it Contains | Useful For |
|----------|-----------------|------------|
| `pending/config/*.json` | 26 balance JSON files — materials, AP costs, Mark multipliers | Porting economy numbers |
| `pending/systems/economySimulation.ts` | Full harvest → refine → fabricate chain | Exploit pillar implementation |
| `pending/systems/combatSystem.ts` | Component-targeted combat | Exterminate pillar |
| `pending/systems/diplomacySystem.ts` | Faction relation state machine | Faction AI |
| `pending/bots/` | Archetype definitions, upgrade tracks, Mark math | Bot system details |
| `pending/ai/goals/` | GOAP goal/action patterns | AI faction turns |
| `pending/ecs/traits.ts` | Full trait shapes for all systems | Trait expansion reference |
| `pending/systems/radialMenu.ts` | Radial provider registration pattern | Input system port |
| `pending/systems/fogOfWar.ts` | Per-unit scan radius fog | Explore pillar |
