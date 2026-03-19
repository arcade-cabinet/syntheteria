# Syntheteria — Architecture

> Technical reference for the ground-up rewrite on `ralph/syntheteria-1-0`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | **Vite** (`pnpm dev`, `pnpm build`) |
| Renderer | **R3F** — one `<Canvas>` in `GameScreen.tsx` |
| ECS | **Koota** — all game state as typed traits |
| Persistence | **sql.js** — pure JS SQLite, no wasm needed |
| Testing | **Vitest** (`*.vitest.ts` files) |
| Lint/format | **Biome** (tabs, double quotes, sorted imports) |
| TypeScript | Strict mode, 0 errors required |
| GLSL | Extracted to `.glsl` files with `vite-plugin-glsl` `#include` directives |

**Entry:** `src/main.tsx` — DOM bootstrap + `Root` component (screen state machine)

---

## Repository Layout

```
syntheteria/
├── AGENTS.md                  # Multi-agent orchestration (READ FIRST)
├── CLAUDE.md                  # Claude Code contract
├── src/
│   ├── main.tsx               # Entry: DOM bootstrap + Root (landing → generating → game)
│   ├── board/                 # Fixed-size deterministic board generator
│   ├── camera/                # IsometricCamera (CivRev2-style fixed-angle)
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
│   ├── ai/                    # Yuka GOAP, fuzzy logic, NavGraph, track selection
│   ├── systems/               # radialMenu state machine, radialProviders
│   ├── audio/                 # Tone.js synth pooling, SFX, ambient storm loop
│   ├── db/                    # SQLite schema + GameRepo (sql.js adapter)
│   ├── rendering/
│   │   ├── BoardRenderer.tsx  # Merged BufferGeometry, PBR atlas shader
│   │   ├── DepthRenderer.tsx  # Bridge platforms, support columns, void planes
│   │   ├── MinedPitRenderer.tsx # Visible pits from floor mining
│   │   ├── HighlightRenderer.tsx
│   │   ├── UnitRenderer.tsx   # GLB models, faction colors, lerped movement
│   │   ├── StormDome.tsx      # BackSide sky sphere with storm + wormhole + illuminator GLSL
│   │   └── sky/chronometry.ts # Turn→time math (day/night cycle, seasons)
│   ├── input/                 # BoardInput (click-to-select, click-to-move, click-to-attack)
│   ├── ui/
│   │   ├── landing/           # LandingScreen, NewGameModal, SettingsModal, TitleMenuScene
│   │   └── game/              # GameScreen, HUD, RadialMenu, GarageModal, info panels
│   ├── config/                # gameDefaults.ts, techTreeDefs.ts
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

**GridApi** is the only public interface into board state outside `board/`. Never access `board.tiles[][]` directly.

**Elevation:** `-1` (void pit) | `0` (ground) | `1` (bridge) | `2` (elevated structure tier).

### `src/ecs/` — Koota ECS

All game state lives as typed traits on Koota entities.

#### Core

| File | Purpose |
|------|---------|
| `world.ts` | `createWorld()` + `WorldType` export |
| `init.ts` | `initWorldFromBoard(world, board)` — tiles, resources, factions, robots |

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
| `floorShader.ts` | `makeFloorShaderMaterial(seed)` — PBR atlas shader (5 AmbientCG atlas maps: color, normal, roughness, metalness, opacity) |
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

| File | Purpose |
|------|---------|
| `movementSystem.ts` | Lerp `UnitMove.progress` → set `UnitPos`, deduct AP |
| `highlightSystem.ts` | BFS reachable → `TileHighlight` emissive/color/reason |
| `turnSystem.ts` | Clear highlights, refresh AP, increment `Board.turn`, run AI + environment phases |
| `attackSystem.ts` | `resolveAttacks(world)` — damage = attack - defense (min 1), destroy at 0 HP |
| `harvestSystem.ts` | `harvestSystem(world)` — tick-down active harvests, yield resources on complete; `startHarvest()` |
| `resourceSystem.ts` | `getPlayerResources()`, `addResources()`, `spendResources()`, `canAfford()` — per-faction ResourcePool |
| `aiTurnSystem.ts` | `runAiTurns(world, board)` — greedy AI moves toward player, attacks on adjacency |
| `cultistSystem.ts` | `checkCultistSpawn()` — breach zones, 3 escalation stages, per-sect GOAP, POI spawning |
| `cultMutation.ts` | `tickCultMutations(world)` — 4-tier time-based mutation: stat buffs → abilities → aberrant |
| `floorMiningSystem.ts` | `floorMiningSystem(world)` — strip-mine tiles, DAISY pattern, deep mining tech +50% |
| `specializationSystem.ts` | `runSpecializationPassives(world)` — aura effects: regen, scan boost, attack/defense buff |
| `victorySystem.ts` | `checkVictoryConditions(world)` — 7 victory paths + elimination defeat + forced endgame |
| `territorySystem.ts` | `computeTerritory(world)` — faction tile painting, percentage tracking |
| `populationSystem.ts` | Population cap enforcement based on outpost count |
| `resourceRenewalSystem.ts` | Resource deposit regeneration over time |
| `experienceSystem.ts` | XP tracking, mark level progression, harvest/combat XP awards |
| `researchSystem.ts` | Tech tree progression, research labs accumulate points |
| `upgradeSystem.ts` | Mark level upgrades, stat improvements |
| `diplomacySystem.ts` | Granular standings (-100 to +100), trade, reputation |
| `hackingSystem.ts` | Hack enemy units/buildings, convert to faction |
| `buildSystem.ts` | Building placement from radial menu |
| `buildingPlacement.ts` | Adjacency and cost validation for placement |
| `fogRevealSystem.ts` | Per-unit scan radius fog reveal |
| `toastNotifications.ts` | In-game toast notification system |
| `turnEventLog.ts` | Per-turn event history recording |
| `tutorialSystem.ts` | First-time player tutorial guidance |
| `memoryFragments.ts` | Lore fragment discovery system |
| `resourceDeltaSystem.ts` | Income/expense tracking per material |
| `campaignStats.ts` | Cross-game statistics tracking |
| `speechTriggers.ts` | Context-sensitive dialogue triggers |
| `speechBubbleStore.ts` | Speech bubble state management |
| `turnSummary.ts` | End-of-turn summary generation |
| `wormholeProject.ts` | 20-turn wormhole stabilizer construction |

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
| `types.ts` | `GameRecord`, `GameSummary`, `TileRecord`, `UnitRecord` |

SQLite is **non-fatal**: DB failures don't crash the game — ECS runs in memory.

### `src/rendering/` — R3F Renderers

| File | Purpose |
|------|---------|
| `BoardRenderer.tsx` | Merged `BufferGeometry` (single draw call), PBR atlas shader |
| `DepthRenderer.tsx` | Bridge platforms at Y=0.4m, support columns, under-bridge void planes |
| `MinedPitRenderer.tsx` | Visible pits from floor mining operations |
| `HighlightRenderer.tsx` | Thin emissive plane pool per tile from `TileHighlight` |
| `UnitRenderer.tsx` | GLB models from asset library, lerped on `UnitMove`, faction colors |
| `StormDome.tsx` | BackSide sphere with 3 GLSL layers (storm / wormhole / illuminator disc) |
| `sky/chronometry.ts` | `turnToChronometry(turn)` — day/night cycle + seasons from turn counter |

### `src/ai/` — Yuka GOAP AI

| File | Purpose |
|------|---------|
| `yukaAiTurnSystem.ts` | Yuka Think/GoalEvaluator for AI faction turns |
| `fuzzyModule.ts` | Fuzzy logic situation assessment |
| `factionMemory.ts` | Perception memory for sighted units |
| `boardNavGraph.ts` | NavGraph pathfinding for AI |
| `territoryTrigger.ts` | Territory change response system |
| `trackSelection.ts` | AI faction track preferences for fabrication |

### `src/audio/` — Sound

| File | Purpose |
|------|---------|
| `sfx.ts` | Tone.js synth pooling + SFX playback |
| `ambience.ts` | Continuous ambient storm loop |

### `src/camera/` — Camera

| File | Purpose |
|------|---------|
| `IsometricCamera.tsx` | Fixed-angle CivRev2 camera: `enableRotate=false`, FOV=45, WASD pan |
| `types.ts` | `CameraControls` interface: panTo/snapTo/setZoom/reset |

### `src/input/` — Input Handling

| File | Purpose |
|------|---------|
| `BoardInput.tsx` | Click-to-select, click-to-move, click-to-attack via Y=0 plane raycast |

### `src/ui/` — UI Components

| File | Purpose |
|------|---------|
| `ui/landing/LandingScreen.tsx` | Title, New Game button, Continue (when saves exist), Settings |
| `ui/landing/NewGameModal.tsx` | SectorScale presets, seed phrases, difficulty/climate/storm options, faction setup |
| `ui/landing/SettingsModal.tsx` | Audio sliders, keybindings reference, accessibility |
| `ui/landing/title/TitleMenuScene.tsx` | 3D title screen scene |
| `ui/game/GameScreen.tsx` | R3F Canvas with all renderers + input + RadialMenu |
| `ui/game/HUD.tsx` | Turn counter, resource counters (13-material), AP display, End Turn button |
| `ui/game/RadialMenu.tsx` | SVG renderer for dual-ring radial context menu |
| `ui/game/GarageModal.tsx` | Two-step fabrication: Classification → Specialization track |

All player-visible elements carry `data-testid` attributes for component tests and E2E.

### `src/config/` — Tunables

| File | Purpose |
|------|---------|
| `gameDefaults.ts` | All tunables: tile size, AP, camera, board sizes, faction colors, unit dims |
| `techTreeDefs.ts` | 27 techs in 5 tiers — 15 base + 12 track-gating (TypeScript const) |

**Rule:** No magic numbers in system or rendering code. All tunables in `gameDefaults.ts`.

---

## Screen State Machine (`main.tsx`)

```
"landing"
  ↓ user clicks New Game
  ↓ (brief "generating" phase)
"game"     ← generateBoard + createWorld + initWorldFromBoard + DB write
```

`Root` in `main.tsx` owns the phase state. `landing/` and `game/` subpackages are isolated —
neither knows the other exists. `main.tsx` is the only place both are imported.

`GameScreen` receives `board`, `world`, and `gameId`. All renderers + input mount inside the R3F Canvas.

### `window.__syntheteria` Debug Bridge

`main.tsx` exposes live game state after every render:

```ts
window.__syntheteria = {
  phase: "landing" | "generating" | "game",
  turn: number,
  playerAp: number,
  selectedUnitId: number | null,
  getWorld: () => WorldType | null,
};
```

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

**124 test suites, 2171 tests. 0 TypeScript errors. Vitest-only.**

Run: `pnpm test:vitest` (unit) | `pnpm test:ct` (browser CT) | `pnpm verify` (full gate)

| Suite | Coverage |
|-------|---------|
| `board/__tests__/generator.vitest.ts` | Board generation, seed determinism, resource scatter |
| `board/__tests__/adjacency.vitest.ts` | BFS reachability, A* pathfinding |
| `board/__tests__/depth.vitest.ts` | Bridge/tunnel span generation |
| `board/__tests__/grid.vitest.ts` | GridApi CRUD |
| `board/__tests__/noise.vitest.ts` | seededRng determinism/range, noise2D |
| `camera/__tests__/camera.vitest.ts` | IsometricCamera: FOV=45, angle, CameraControls API |
| `ecs/__tests__/traits.vitest.ts` | Koota trait defaults, world lifecycle |
| `ecs/__tests__/movementSystem.vitest.ts` | movementSystem lerp + completion |
| `ecs/__tests__/highlightSystem.vitest.ts` | BFS highlight + clear |
| `ecs/__tests__/turnSystem.vitest.ts` | Turn advance, AP refresh |
| `ecs/__tests__/placement.vitest.ts` | Robot placement flags → tile coords |
| `ecs/__tests__/robots.vitest.ts` | 9 robot spawn functions |
| `ecs/__tests__/factions.vitest.ts` | FACTION_DEFINITIONS, CULT_DEFINITIONS, relations |
| `ecs/__tests__/init.vitest.ts` | initWorldFromBoard: Board, tiles, ResourceDeposit, factions, robots |
| `ecs/terrain/__tests__/elevationSampler.vitest.ts` | ELEV_Y, tileElevY, sampleElevation |
| `ecs/terrain/__tests__/floorShader.vitest.ts` | ShaderMaterial factory, uniforms |
| `ecs/systems/__tests__/aiTurnSystem.vitest.ts` | AI faction movement + attack |
| `ecs/systems/__tests__/attackSystem.vitest.ts` | Damage calc, destruction at 0 HP |
| `ecs/systems/__tests__/harvestSystem.vitest.ts` | Tick-down, yield, depletion |
| `ecs/systems/__tests__/resourceSystem.vitest.ts` | ResourcePool CRUD, canAfford |
| `ecs/systems/__tests__/cultistSystem.vitest.ts` | Breach zones, escalation, spawn cap |
| `ecs/systems/__tests__/turnSystem.vitest.ts` | Turn advance, full multi-phase |
| `db/__tests__/gameRepo.vitest.ts` | GameRepo CRUD, round-trip |
| `ui/__tests__/HUD.vitest.tsx` | Turn/AP/resource display, End Turn callback |
| `ui/__tests__/NewGameModal.vitest.tsx` | Form defaults, seed, submit, cancel |
| `ui/__tests__/LandingScreen.vitest.tsx` | Title, New Game modal, Continue, save list |
| `systems/__tests__/radialMenu.vitest.ts` | Dual-ring state machine, hit testing, providers |
| `rendering/__tests__/DepthRenderer.vitest.ts` | Bridge geometry, column positions, void planes |
| `rendering/sky/__tests__/chronometry.vitest.ts` | Turn→time, sun direction/color |

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
- `floorVert.glsl` — vertex shader with elevation + cylindrical curvature
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

## Depth Stacking

Bridges and tunnels are the mountain-pass mechanic. **DepthRenderer is implemented.**

```
Elevation  World Y   Rendered as
   -1       n/a      Void pit (handled by abyssal_platform shader)
    0        0.0m    Standard ground
   +1       +0.4m    Bridge — platform boxes + support columns + void planes
   +2       +0.8m    Elevated structure tier
```

DepthRenderer produces 3 merged geometries per board (single draw call each):
bridge platform boxes, support columns (cylinders), and dark void planes at Y=0 beneath bridges.

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

## Cult Mutation System

Time-based mutation for cult units. Cult mechs grow stronger the longer they survive.

### Tiers (`cultMutation.ts`)

| Tier | Turns Alive | Effect |
|------|-------------|--------|
| 0 | 0-5 | Base stats |
| 1 | 6-10 | ONE random stat buff (speed +2 MP / armor +3 DEF / damage +2 ATK) |
| 2 | 11-20 | SECOND stat buff (different from tier 1) + special ability (regen / area_attack / fear_aura) |
| 3 | 21+ | ABERRANT — +2 to ALL stats (HP, ATK, DEF, MP), mini-boss threat |

### Design

- Buff selection is **seeded-deterministic** — same `mutationSeed` always produces same buffs
- Regen ability heals 1 HP/turn
- Aberrant tier triggers turn event log notification
- `getMutationXPMultiplier()` rewards 1.5x XP for killing aberrant mechs

---

## Floor Mining System

Strip-mine tiles for foundation-tier materials — the backstop economy when salvage props are consumed.

### Flow (`floorMiningSystem.ts`)

1. Player selects worker unit adjacent to mineable tile
2. `startFloorMining()` adds `UnitMine` trait with `ticksRemaining = FloorDef.hardness`
3. Each turn, `floorMiningSystem()` decrements ticks
4. On completion: yield resources, mark tile as mined (`mineable → false`)
5. Tile elevation drops to -1 (creates visible pit via `MinedPitRenderer`)
6. Deep mining tech bonus: +50% yield if `deep_mining` tech researched

### DAISY Pattern

Mining creates visible pits by setting tile elevation to -1. `MinedPitRenderer.tsx` renders the pit geometry. This makes strip-mining visually impactful and permanent — mined tiles cannot be mined again.

---

## Cult Escalation System

Three-stage cult behavior that scales with game progression.

### Stages (`cultistSystem.ts`)

| Stage | Tier | Behavior |
|-------|------|----------|
| Wanderer | 0-1 | Random movement near patrol center, flee from enemies, fight only when cornered |
| War Party | 2-3 | Coordinated groups, chase enemies, target territory edges, sect-specific tactics |
| Assault | 4+ | Direct attacks on faction buildings and units, charge with damage bonus |

### Per-Sect Behaviors (`SectBias`)

| Sect | Patrol | Target | Attack | Style |
|------|--------|--------|--------|-------|
| Static Remnants | Tight (0.75x) | Nearest | Base | Territorial — defend POIs |
| Null Monks | Wide (1.5x) | Isolated units | Base | Ambush — spread corruption |
| Lost Signal | Normal | Nearest | +1 damage | Berserker — skip wanderer stage, charge buildings |

### POI Spawning

At game start, 3-6 cult POIs are placed on `collapsed_zone`/`dust_district` terrain, away from center and edges. Each POI gets a breach altar + initial cult mech guard + human shelter.

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
