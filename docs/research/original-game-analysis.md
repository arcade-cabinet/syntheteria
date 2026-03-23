# Original Game Codebase Analysis

> Complete analysis of `game/src/` -- the pre-migration state of Syntheteria.
> 30 files total (28 TypeScript/TSX + 1 CSS + 1 JSON config).
> Generated from reading every line of every file.

---

## 1. Architecture Overview

The original game is a **React + R3F (React Three Fiber)** application using **Miniplex** as its ECS.
It is structured as a single-page app with three phases: Title -> Narration -> Playing.

### Dependency Stack
- **React 19.2** + ReactDOM
- **Three.js 0.183** via `@react-three/fiber` (R3F) 9.5 and `@react-three/drei` 10.7
- **Miniplex 2.0** for ECS (entity archetype queries with `.with()` and `.where()`)
- **Vite 7.3** with `@vitejs/plugin-react`
- Deployed at `/syntheteria/` base path

### File Organization (30 files)

```
game/src/
  main.tsx              -- ReactDOM entry point (10 LOC)
  App.tsx               -- Root component: phases, narration, world init, game loop (233 LOC)
  index.css             -- Global reset CSS (23 LOC)

  ecs/
    types.ts            -- Entity interface, Vec3, UnitComponent, helper functions (106 LOC)
    world.ts            -- Miniplex World instance + archetype queries (15 LOC)
    factory.ts          -- Entity spawn functions: spawnUnit, spawnFabricationUnit, spawnLightningRod (138 LOC)
    gameState.ts        -- Simulation tick orchestrator + React bridge via useSyncExternalStore (118 LOC)
    terrain.ts          -- Procedural heightfield, fog-of-war grids, fragment management (203 LOC)
    cityLayout.ts       -- Procedural labyrinth city generator (376 LOC)

  rendering/
    TerrainRenderer.tsx -- Per-fragment terrain mesh with fog-based vertex alpha (274 LOC)
    CityRenderer.tsx    -- Instanced city buildings with circuit-board aesthetic (311 LOC)
    UnitRenderer.tsx    -- Unit meshes (bots, buildings, ghost placement preview) (241 LOC)
    StormSky.tsx        -- Shader-based sky dome with storm clouds + wormhole glow (85 LOC)
    LandscapeProps.tsx  -- Instanced rocks/trees/debris/ruins (276 LOC)

  input/
    TopDownCamera.tsx   -- Top-down camera: WASD + scroll zoom + touch pan/pinch (200 LOC)
    UnitInput.tsx       -- Unit selection + move commands: click/tap/right-click (281 LOC)

  systems/
    buildingPlacement.ts -- Ghost preview + placement validation + cost checking (142 LOC)
    combat.ts           -- Component-based melee damage system (143 LOC)
    enemies.ts          -- Feral bot spawning + patrol/aggro AI (177 LOC)
    exploration.ts      -- Fog-of-war reveal around units (31 LOC)
    fabrication.ts      -- Recipe-based crafting at powered fabrication units (135 LOC)
    fragmentMerge.ts    -- Merge fog data when units from different fragments meet (75 LOC)
    movement.ts         -- Per-frame waypoint interpolation (41 LOC)
    navmesh.ts          -- Grid-based nav graph + A* + line-of-sight path smoothing (285 LOC)
    pathfinding.ts      -- Thin wrapper: findPath() -> findNavPath() + terrain Y (24 LOC)
    power.ts            -- Lightning rod power generation + storm fluctuation + distribution (158 LOC)
    repair.ts           -- Component repair: arms-equipped unit fixes broken parts (122 LOC)
    resources.ts        -- Resource pool (scrap/e-waste/parts) + scavenge points (140 LOC)

  ui/
    GameUI.tsx          -- Full DOM overlay: HUD, resources, unit info, repair, fabrication, minimap (681 LOC)
    TitleScreen.tsx     -- Title screen with glitch effect and menu buttons (175 LOC)
```

### Data Flow

```
App.tsx (phase state machine)
  |
  |-- TitleScreen -> "narration" -> NarrationOverlay -> "playing"
  |
  |-- Canvas (R3F)
  |     |-- StormSky (sky dome shader)
  |     |-- TerrainRenderer (per-fragment heightfield + fog)
  |     |-- LandscapeProps (instanced rocks/trees/debris)
  |     |-- CityRenderer (instanced buildings + circuit traces)
  |     |-- UnitRenderer (bots + buildings + ghost placement)
  |     |-- TopDownCamera (camera controller)
  |     |-- UnitInput (selection + move commands)
  |     |-- GameLoop (useFrame: movement per-frame, simulationTick per-interval)
  |
  |-- GameUI (DOM overlay: HUD, resources, unit info, minimap)
```

### State Management Pattern

The game uses a **global singleton ECS world** (`world.ts`) bridged to React via `useSyncExternalStore`.
`gameState.ts` is the orchestrator:
- Maintains a `tick` counter, `gameSpeed`, and `paused` flag
- `simulationTick()` runs all systems in order each tick
- `subscribe()`/`getSnapshot()` provide React integration (no Redux, no Zustand)
- Snapshot is lazily rebuilt and cached until invalidated

This is a clean pattern: systems mutate ECS directly, then a snapshot captures the state for React to read.

---

## 2. Entity Model

### The Entity Interface (Miniplex style -- all components optional)

```typescript
interface Entity {
  id: string
  faction: "player" | "cultist" | "rogue" | "feral"

  worldPosition?: Vec3            // Continuous 3D position
  mapFragment?: { fragmentId }    // Fog-of-war group membership

  unit?: {                        // Mobile robot
    type: "maintenance_bot" | "utility_drone" | "fabrication_unit"
    displayName: string
    speed: number
    selected: boolean
    components: UnitComponent[]   // Physical parts (camera, arms, legs, power_cell)
  }

  navigation?: {                  // Navmesh pathfinding state
    path: Vec3[]
    pathIndex: number
    moving: boolean
  }

  building?: {                    // Static structure
    type: string                  // "lightning_rod", "fabrication_unit", etc.
    powered: boolean
    operational: boolean
    selected: boolean
    components: UnitComponent[]
  }

  lightningRod?: {                // Power generation specialization
    rodCapacity: number
    currentOutput: number
    protectionRadius: number
  }
}
```

### UnitComponent (the health system)

```typescript
interface UnitComponent {
  name: string            // "camera", "arms", "legs", "power_cell", etc.
  functional: boolean     // true = working, false = broken
  material: "metal" | "plastic" | "electronic"  // determines repair cost
}
```

This is the game's most distinctive design: **no HP, no health bars**. Units have discrete functional parts. Damage breaks a random part. All parts broken = destroyed.

### Archetype Queries (world.ts)

```typescript
units          = world.with("unit", "worldPosition", "mapFragment")
movingUnits    = world.with("unit", "navigation", "worldPosition")
selectedUnits  = world.with("unit").where(e => e.unit.selected)
buildings      = world.with("building", "worldPosition")
lightningRods  = world.with("lightningRod", "building", "worldPosition")
```

### Concrete Entity Types Spawned

| Entity | Components Present | Faction | Speed |
|--------|-------------------|---------|-------|
| Bot Alpha (maintenance_bot) | unit, navigation, worldPosition, mapFragment | player | 3 |
| Bot Beta (maintenance_bot) | unit, navigation, worldPosition, mapFragment | player | 3 |
| Fabrication Unit | unit + building, navigation, worldPosition, mapFragment | player | 0 (immobile) |
| Lightning Rod | building + lightningRod, worldPosition, mapFragment | player | N/A |
| Feral Enemy | unit, navigation, worldPosition, mapFragment | feral | 2-3.5 |

Note: The fabrication unit is a **hybrid entity** -- it has both `unit` and `building` components. This lets it appear in the unit selection panel (with components) and the building power system simultaneously. This is an interesting but somewhat awkward pattern.

---

## 3. Game Loop

### Two-Speed Architecture

The game runs two loops at different rates:

**Per-frame (60fps via useFrame):**
- `movementSystem(delta, speed)` -- interpolates unit positions along navigation waypoints

**Per-tick (1.0s interval, scaled by gameSpeed):**
- `simulationTick()` runs these systems IN ORDER:
  1. `explorationSystem()` -- reveal fog around units
  2. `fragmentMergeSystem()` -- merge overlapping fog fragments
  3. `powerSystem(tick)` -- update storm intensity, distribute power
  4. `resourceSystem()` -- auto-scavenge nearby resource points
  5. `repairSystem()` -- advance active repair jobs
  6. `fabricationSystem()` -- advance fabrication recipes
  7. `enemySystem()` -- spawn/patrol/aggro feral bots
  8. `combatSystem()` -- resolve melee combat
  9. `updateDisplayOffsets()` -- drift fragment visual offsets toward zero

**Game speed** ranges 0.5x to 4x. The sim accumulator (`simAccumulator`) adds `delta * speed` each frame and triggers ticks when >= 1.0s.

### Initialization Order

When "playing" phase starts:
1. `getCityBuildings()` -- generates the labyrinth layout (cached)
2. `buildNavGraph()` -- samples terrain + buildings to build walkability grid
3. Spawn Bot Alpha, Bot Beta, Fabrication Unit, Lightning Rod
4. Run one `simulationTick()` to reveal initial fog

---

## 4. Rendering Approach

### Technology: React Three Fiber (R3F)

All 3D rendering happens inside a single `<Canvas>` component. No scene graph manipulation -- everything is declarative JSX.

### Camera

**Top-down isometric-ish** camera that looks straight down at an angle:
- Camera position: `(target.x, zoom, target.z + zoom * 0.6)` -- always above, slightly behind
- WASD/arrows to pan, scroll wheel to zoom (10-80 range)
- Two-finger touch pan + pinch zoom on mobile
- Middle-click drag to pan on desktop
- Touch momentum with 0.92 decay
- No rotation allowed -- always the same orientation

### Terrain Rendering

The terrain is a **200x200 world-unit procedural heightfield** using layered sine waves (not Perlin noise):
```
height = 0.5 + 0.3*sin(1.2x + 0.8z) + 0.15*sin(2.5x + 1.7z + 1.3) + 0.05*sin(5.1x + 4.3z + 2.7)
```
Scaled to 0-0.5 elevation. Below 0.15 raw = water (impassable).

**Per-fragment rendering:** Each fog fragment gets its own terrain mesh. Vertices have a custom `alpha` attribute controlled by fog state:
- fog=0 (unexplored): alpha=0 (invisible)
- fog=1 (abstract): shown as cyan wireframe grid lines (lineSegments)
- fog=2 (detailed): full colored terrain mesh

Custom shader injection via `onBeforeCompile` to pass vertex alpha to fragment shader and discard fully transparent fragments.

Five terrain colors by height: water (dark teal), mud, dirt, ground, rubble.

### City Rendering

**Instanced meshes** grouped by building type (conduit, node, tower, ruin, wall). Each type gets:
- Main body: `InstancedMesh` with BoxGeometry, dark blue/grey materials
- Accent detail: `InstancedMesh` with type-specific geometry (glowing traces, antenna cylinders, pad glows)
- Ground-level circuit traces: thin cyan instanced boxes between buildings

Per-frame fog visibility: hidden instances are moved to y=-100 and scaled to 0.

Color palette is circuit-board themed: dark blue-black bodies with cyan/green emissive accents.

### Unit Rendering

Each unit is an individual `<group>` (not instanced) with:
- Body box (blue for player, red for enemy, orange when selected)
- Tread box underneath
- Camera dome on top (green if functional, red if broken)
- Two arm boxes (grey-blue if functional, red if broken)
- Selection ring (orange ring on ground, hidden until selected)

Each building gets:
- Base platform
- Type-specific structures (fabricator body + arm + status light, or lightning rod pole + cone tip + protection radius ring)
- Selection ring

Ghost building preview: wireframe green box at cursor position during placement mode.

### Sky

Custom GLSL shader on an inverted sphere (radius 200, BackSide):
- Three octaves of 2D value noise for cloud patterns
- Dark storm clouds (near-black to dark purple)
- Wormhole glow at zenith: purple, pulsating
- Rare lightning flashes (random white flicker at ~0.3% chance per frame)

### Landscape Props

Instanced meshes for 6 prop types, deterministically placed every 6 world units:
- **Inside city:** scrap (boxes), debris (boxes), ruin_pillar (cylinders)
- **Outside city:** rocks (dodecahedrons), trees (cones), dead_tree (cylinders)
- ~25% placement chance per grid cell
- Fog-aware: hidden when unrevealed

---

## 5. The CITY Concept

The "city" is a **procedural circuit-board labyrinth** occupying a fixed rectangular region (-30 to 50 on X, -20 to 50 on Z). It is not a typical 4X city -- it is the pre-existing environment the player awakens in.

### Generation Algorithm (`cityLayout.ts`)

Uses a seeded PRNG (seed=42, linear congruential generator) for determinism.

1. **Primary N-S corridors:** Vertical wall segments every 8 world units, with random offsets. 15% chance of being omitted entirely. 25% chance of a gap (doorway) splitting a segment.

2. **Primary E-W corridors:** Same pattern but horizontal.

3. **Junction nodes:** At corridor intersections, ~75% chance of a wider junction block. 15% of those become tall towers instead.

4. **Secondary connectors:** Shorter diagonal/offset walls between primary corridors at double spacing.

5. **Perimeter walls:** Segmented wall segments along all four edges with 20% gap chance.

### Building Types
| Type | Visual | Purpose |
|------|--------|---------|
| conduit | Long narrow walls | Circuit board traces |
| node | Wider junction blocks | IC pads at intersections |
| tower | Tall pylons with antennas | Landmarks |
| ruin | Partially collapsed walls | Atmosphere + passages |
| wall | Perimeter segments | City boundary |

### Spawn Area Clearance

A hardcoded region (2-23 on X, 7-21 on Z) is kept clear for the player's starting area. Corridors that overlap this area are either skipped or replaced with small ruins.

### Key Design Insight

The city is NOT a player-built settlement. It is the **ancient machine infrastructure** the AI wakes up inside. The labyrinth creates natural navigation challenges -- the player's bots must navigate streets, find routes around walls, and explore dead ends. This is fundamentally different from a Civ-style city.

---

## 6. Combat System

### Melee-Only Component Damage

Combat is automatic and proximity-based:
- Only **feral** units initiate attacks
- Melee range: 2.5 world units
- 40% chance of attack per tick when in range
- Damage = break a random functional component on target

### Attack Resolution

1. Feral attacker rolls for hit chance:
   - With functional arms: 60% hit chance
   - Without arms: 30% hit chance
2. On hit: random functional component on target becomes `functional: false`
3. If all components broken: unit is destroyed
4. Player unit **retaliates** in the same tick (same hit mechanics)
5. Destroyed units drop salvage: `componentCount * 1.5` scrap metal + 50% chance of 1 e-waste

### Implications

- No ranged combat
- No active player combat commands (combat is automatic when close)
- No damage types, no armor, no shields
- Component system creates natural tactical depth: losing camera = can't see, losing arms = can't repair/scavenge, losing legs = immobile
- The attacker's movement stops during combat

---

## 7. Resource System

### Three Resources

| Resource | Source | Used For |
|----------|--------|----------|
| scrapMetal | Scavenge points, enemy salvage | Repairs (metal/plastic), building costs, fabrication recipes |
| eWaste | Scavenge points, enemy salvage | Repairs (electronic), building costs, fabrication recipes |
| intactComponents | Scavenge points (rare), fabrication output | Building costs, high-tier fabrication recipes |

### Scavenging

Deterministic scavenge points (seeded PRNG, seed=789) scattered through the city area:
- ~35% of grid cells (4-unit spacing) get a point
- 50% scrapMetal, 35% eWaste, 15% intactComponents
- Each point has 1-6 remaining scavenges
- **Auto-scavenge:** Units with functional arms automatically pick up nearby resources (2.5 unit range) when idle (not moving). One scavenge per unit per tick.

### Fabrication

Powered fabrication units can craft replacement components:

| Recipe | Output | Cost | Build Time |
|--------|--------|------|------------|
| Camera Module | camera (electronic) | 4 eWaste + 1 intactComponents | 8 ticks |
| Arm Assembly | arms (metal) | 5 scrapMetal | 6 ticks |
| Leg Assembly | legs (metal) | 4 scrapMetal | 5 ticks |
| Power Cell | power_cell (electronic) | 3 eWaste + 2 scrapMetal | 7 ticks |
| Power Supply | power_supply (electronic) | 5 eWaste + 1 intactComponents | 10 ticks |

All recipes produce 1 intactComponent on completion. Fabrication requires continuous power -- job pauses (not cancels) if power is lost.

### Building Costs

| Building | Cost |
|----------|------|
| Lightning Rod | 8 scrapMetal + 4 eWaste |
| Fabrication Unit | 12 scrapMetal + 6 eWaste + 2 intactComponents |

### Repair Costs

| Material Type | Cost |
|---------------|------|
| metal | 3 scrapMetal |
| plastic | 1 scrapMetal |
| electronic | 2 eWaste |

Repair takes 5 ticks and requires a nearby unit with functional arms.

---

## 8. The Power System

### Storm-Powered Infrastructure

Lightning rods capture energy from the perpetual storm:
- Rod capacity: 10 (fixed)
- Output = capacity * stormIntensity
- Storm intensity oscillates: `0.7 + 0.2*sin(t*0.006) + surge`, range ~0.5 to 1.5
- Surges are periodic sine-wave spikes

### Power Distribution

Simple radius-based:
- Each rod powers all buildings within its `protectionRadius` (default 8, distribution uses 12)
- No power grid, no transmission lines
- Buildings outside all rod radii are unpowered

### Power Demand

| Entity | Demand |
|--------|--------|
| Fabrication unit | 3 |
| Other buildings | 1 |
| Moving unit | 0.8 |
| Idle unit | 0.5 |
| Lightning rod | 0 (generates) |

Note: demand is calculated but not actually used to limit anything. The system tracks generation vs demand for display but doesn't ration power -- it uses purely radius-based distribution.

---

## 9. Fog of War / Map Fragment System

### The Fragment Concept

This is the game's most architecturally interesting system. Each robot group starts as its own **map fragment** with independent fog-of-war data. Fragments:

- Have a 200x200 Uint8Array fog grid (one cell per world unit)
- Three fog states: 0=unexplored, 1=abstract (cyan wireframe), 2=detailed (full terrain)
- Camera-equipped units reveal fog=2; others reveal fog=1
- Vision radius: 6 world units (circular)

### Fragment Merging

When units from different fragments come within 6 world units:
1. Fog data is merged (keeping higher detail level at each cell)
2. All entities of the absorbed fragment are reassigned to the survivor
3. Absorbed fragment is deleted
4. UI shows "MAP FRAGMENTS MERGED" notification

This creates a compelling gameplay moment: your bots are exploring independently, each with their own partial map, until they meet and their knowledge combines.

### Display Offsets

Fragments can have visual offsets that drift toward zero over time (0.3% per tick). This was designed to cluster separated fragments close together visually, then gradually separate them to their real positions as the map fills in. The `clusterFragments()` function exists but is never called in the shipped code.

---

## 10. The Original Vision

Based on the code, narration, and design choices, the original game was trying to be:

### "An AI awakening in a ruined machine city"

The narration explicitly establishes this:
- "I am." -- consciousness emerges
- "There is a machine. I can make it my limb." -- taking over robot bodies
- "Where does my knowledge come from?" -- existential mystery

The subtitle "AWAKEN // CONNECT // REBUILD" captures the three-act structure.

### Core Fantasy

You are a newly awakened AI in **Syntheteria** -- a vast machine infrastructure (an ecumenopolis, per later docs). You don't build cities. The city already exists as a ruined labyrinth. You:

1. **Awaken** in fragmented awareness (multiple independent fog fragments)
2. **Connect** by bringing your robots together (fragment merging)
3. **Rebuild** by scavenging, repairing, and fabricating (resource loop)

### What Makes It Different From Standard 4X

- **No city founding** -- the city is the pre-existing world
- **No health bars** -- component-based damage creates rich tactical decisions
- **No tile grid** -- continuous 3D world with navmesh pathfinding
- **Fog as narrative** -- fragments represent the AI's fragmented awareness
- **Storm as power source** -- the perpetual storm powers everything via lightning rods
- **Scavenging economy** -- you recycle the ruins, not extract from tiles

### Tone/Aesthetic

- **Color: #00ffaa** everywhere -- the "machine consciousness" green
- Circuit-board architecture with cyan/green glowing traces
- Industrial wasteland color palette (mud, dirt, rubble)
- Perpetual storm sky with purple wormhole at zenith
- Glitch effects on the title screen
- Monospace font throughout -- terminal aesthetic

---

## 11. RTS Elements vs 4X Elements

### Strongly RTS

- **Real-time movement** with per-frame interpolation (not turn-based)
- **Click-to-select, right-click-to-move** -- classic RTS input
- **Continuous world positions** (not tile/hex grid)
- **Free-form unit navigation** via navmesh + A* pathfinding
- **Auto-combat** when units are in proximity (no battle screen)
- **Game speed controls** (0.5x, 1x, 2x, pause)
- **No turns** -- everything is continuous with periodic simulation ticks

### Mildly 4X

- **Fog of war** / exploration
- **Resource gathering** and building
- **Power infrastructure** (lightning rods powering buildings)
- **Fabrication/production** (recipes with build times)

### Not Really 4X

- No tech tree
- No diplomacy
- No territory control
- No multiple cities/settlements
- No factions competing for victory
- Only 2 player units + 1 building at start (tiny scale)
- Max 3 enemies total (not civilizations)

The original is more of a **real-time survival/exploration game with light base-building** than a 4X.

---

## 12. Interesting Patterns and Decisions Worth Noting

### Component Damage System

The most innovative mechanic. Instead of HP, units have named parts that break independently. This creates emergent gameplay:
- A bot with broken camera can still move and fight, but generates fog=1 instead of fog=2
- A bot with broken arms can't scavenge, repair, or fight effectively
- A bot with broken legs is immobile (speed check isn't implemented, but the design implies it)
- The same system works for buildings (power_supply, fabrication_arm, etc.)

This is worth keeping and deepening.

### Labyrinth City as Environment

The city isn't built by the player -- it's a pre-existing maze to navigate. The circuit-board aesthetic (conduits, nodes, towers) is visually distinctive. The seeded generation ensures navmesh and rendering agree.

### Fragment Merge as Discovery

The fragment system creates a natural "aha" moment when units meet. It's narratively satisfying (fragmented consciousness becoming whole) and mechanistically clean (fog data merges, entities reassign).

### useSyncExternalStore Bridge

Clean pattern for bridging mutable ECS state to React without adding a state management library. The snapshot is lazy-cached and only rebuilt when systems notify. No unnecessary re-renders.

### Navmesh Approach

The navmesh is a coarse grid (2-unit step) over the 200x200 world. A* with octile distance heuristic, linear scan (no binary heap). Path smoothing via line-of-sight checks removes redundant waypoints. This works for the scale but would need optimization for larger worlds.

### Things That Don't Quite Work

- **Power demand is tracked but doesn't actually ration** -- buildings within rod radius always get power regardless of demand
- **Fragment display offsets** (clustering) exist but `clusterFragments()` is never called
- **Unit speed of 0** for fabrication units, but they still get navigation components
- **Dual unit/building nature** of fabrication units creates type-checking complexity
- **No way to hack/convert feral bots** despite the comment "Can be hacked and taken over (future feature)"
- **The minimap is static** -- only renders once on mount (canvas ref callback), never updates

### Performance Considerations

- Terrain: 201x201 = ~40,000 vertices per fragment, vertex attributes updated every frame
- City: instanced meshes (good), but per-frame fog check iterates all instances against all fragments
- Props: same per-frame fog iteration pattern
- Navmesh: 100x100 = 10,000 node A* with linear open list scan
- All of these are fine for the current scale but don't scale to larger worlds

---

## 13. File-by-File Detail

### `main.tsx`
Entry point. `createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`. Imports `index.css`. Nothing else.

### `App.tsx`
The most important file. Contains:
- `NARRATION_BLOCKS` -- 5 opening text blocks ("I am.", "What else is there...", etc.)
- `NarrationOverlay` -- React component: fade-in text blocks, auto-advance every 3s, click to skip
- `initializeWorld()` -- spawns starting entities, builds navmesh, runs first tick
- `GameLoop` -- R3F component: per-frame movement + per-tick simulation
- `App` -- phase state machine (title/narration/playing), renders Canvas with all 3D components

### `ecs/types.ts`
Defines `Vec3`, `UnitComponent`, `Entity` interfaces. Provides helper functions: `hasCamera()`, `hasArms()`, `hasFunctionalComponent()`, `getBrokenComponents()`, `getFunctionalComponents()`. Type aliases `UnitEntity`, `BuildingEntity`, `LightningRodEntity` for query results.

### `ecs/world.ts`
15 lines. Creates the singleton Miniplex world and 5 archetype queries. This is the central data store.

### `ecs/factory.ts`
Three factory functions:
- `spawnUnit()` -- creates a mobile bot with unit + navigation + mapFragment
- `spawnFabricationUnit()` -- creates a hybrid unit+building entity (immobile, speed=0)
- `spawnLightningRod()` -- creates a building+lightningRod entity (always powered)

Uses a module-level `nextEntityId` counter for unique IDs. Creates or reuses map fragments. Queries terrain height for Y position.

### `ecs/gameState.ts`
The simulation orchestrator. Stores tick count, game speed (0.5-4x), paused state. `simulationTick()` runs all 8 systems in order. Implements React's external store pattern with `subscribe()`/`getSnapshot()`. `GameSnapshot` captures all UI-relevant state into a single immutable object.

### `ecs/terrain.ts`
Procedural world layer:
- `WORLD_SIZE=200`, `WORLD_HALF=100`
- `getTerrainHeight(x,z)` -- 3-octave sine wave heightfield, 0-0.5 range
- `isWalkable(x,z)` -- height >= 0.15 (above water)
- `getWalkCost(x,z)` -- weighted A* costs by terrain type
- Fragment management: create, get, delete, list
- Fog grid helpers: worldToFogIndex, getFogAt, setFogAt (only upgrades, never downgrades)
- Display offset management: drift rate 0.003 per tick toward zero
- `clusterFragments()` -- exists but never called

### `ecs/cityLayout.ts`
Most complex generator. Uses seeded PRNG (LCG, seed=42). Generates ~300-500 buildings as axis-aligned rectangles. Types: conduit, node, tower, ruin, wall. Maintains spawn area clearance. Perimeter walls with gaps. Provides `isInsideBuilding()` and `nearBuildingEdge()` for navmesh integration. Result is cached after first call.

### `rendering/TerrainRenderer.tsx`
Per-fragment terrain with fog-driven visibility:
- Shared geometry data (positions, colors, indices) built once
- Per-fragment: cloned geometry with custom alpha attribute
- Abstract terrain: cyan wireframe lineSegments for fog=1
- Detailed terrain: colored mesh for fog=2
- Custom shader injection: vertex alpha passed to fragment shader, sub-0.01 alpha discarded
- Fragment display offset applied to group position

### `rendering/CityRenderer.tsx`
Instanced buildings grouped by type:
- 5 material palettes (dark bodies + glowing accents)
- Per-type InstancedMesh for main body + accent details
- Per-frame fog check: unrevealed buildings hidden at y=-100, scale=0
- `CircuitTraces` component: decorative ground-level cyan lines between buildings
- Hash-based deterministic trace placement radiating from conduits/nodes

### `rendering/UnitRenderer.tsx`
Individual mesh groups for each entity:
- `UnitMesh`: box body + treads + camera dome + arms + selection ring
- `BuildingMesh`: base platform + type-specific structures (fab body, rod pole, protection radius ring)
- `GhostBuilding`: wireframe preview during placement mode
- Colors reflect state: blue=player, red=enemy, orange=selected, red indicators=broken components
- Fragment display offset applied per-frame

### `rendering/StormSky.tsx`
GLSL shader sky dome:
- 2D value noise (hash+interpolation, 3 octaves)
- Dark storm clouds animated by uTime
- Purple wormhole glow at zenith, pulsating
- Random lightning flashes (0.3% per quarter-second)
- Sphere radius 200, BackSide rendering

### `rendering/LandscapeProps.tsx`
Six prop types, instanced:
- `rock`: DodecahedronGeometry, grey
- `scrap`: BoxGeometry, metallic grey-blue (city only)
- `debris`: BoxGeometry, dark grey-blue
- `tree`: ConeGeometry, green (countryside only)
- `dead_tree`: CylinderGeometry, brown
- `ruin_pillar`: BoxGeometry, dark blue-grey (city only)
- Deterministic hash-based placement every 6 units
- ~25% density, respects water/building exclusion
- Per-frame fog visibility updates

### `input/TopDownCamera.tsx`
Camera controller:
- Top-down with slight angle (camera positioned at target + zoom height + 0.6*zoom forward offset)
- WASD/arrow keys for pan (speed scales with zoom)
- Scroll wheel for zoom (10-80 range)
- Two-finger touch pan with momentum (0.92 decay)
- Pinch zoom
- Middle-click drag to pan
- No rotation capability

### `input/UnitInput.tsx`
Selection and movement:
- Raycast from screen point to ground plane (y=0)
- Click/tap: find nearest entity within 1.5 units, select it (deselects all others)
- If no entity at click point and a mobile unit is selected: issue move command
- Right-click: always move selected units (desktop RTS convention)
- Building placement mode: click confirms placement
- Escape cancels placement
- Touch: single-finger tap = select/move, multi-touch = camera (delegated to TopDownCamera)
- Display-to-real coordinate conversion for fragment offsets

### `systems/buildingPlacement.ts`
Placement state machine:
- `activePlacement`: current building type being placed (or null)
- `ghostPosition`: cursor position for preview
- Validation: must be walkable, not inside building, lightning rods need 10-unit spacing
- Cost checking against resource pool
- On confirm: spend resources, spawn entity, rebuild navmesh, reset state
- Escape to cancel

### `systems/combat.ts`
Melee combat per tick:
- Only feral units initiate (scan feral -> player pairs)
- 2.5 unit melee range, 40% attack chance per tick
- `dealDamage()`: hit chance modified by arms (60% vs 30%), breaks random functional component
- Auto-retaliation by player units
- Destroyed units: drop salvage (scrap metal + maybe e-waste), remove from world
- One target per attacker per tick, attacker stops moving during combat

### `systems/enemies.ts`
Feral bot AI:
- Max 3 enemies, spawn every 60 ticks (40 tick initial delay)
- 6 spawn zones at city edges
- Random component states (40% chance of camera, 30% chance no arms)
- Speed 2-3.5 (variable)
- AI loop: if idle, check for player units within 6 units (aggro), pathfind toward them
- Otherwise 30% chance per tick to patrol randomly within 15 units
- Each enemy gets its own map fragment (irrelevant since enemies don't reveal fog for the player)

### `systems/exploration.ts`
Simplest system (31 LOC):
- For each unit, reveal fog in a 6-unit radius circle
- Camera-equipped: fog=2 (detailed), others: fog=1 (abstract)
- Uses `setFogAt()` which only upgrades, never downgrades

### `systems/fabrication.ts`
Recipe-based crafting:
- 5 recipes (camera, arms, legs, power_cell, power_supply)
- Each takes 5-10 ticks to complete
- Requires powered fabrication unit
- Costs specific resources
- One active job per fabricator
- Output: 1 intactComponent
- Job pauses (not cancels) if power is lost

### `systems/fragmentMerge.ts`
Fragment unification:
- O(n^2) unit pair comparison
- Merge when distance <= 6 units
- Survivor = fragment with more revealed cells
- Fog data merged (max at each cell)
- All entities of absorbed fragment reassigned
- Returns merge events for UI notification

### `systems/movement.ts`
Per-frame interpolation:
- For each unit with active navigation, move toward next waypoint
- Step = speed * delta * gameSpeed
- When waypoint reached, advance to next; when all done, stop
- Y position updated from terrain height at each step

### `systems/navmesh.ts`
Grid-based navigation:
- 2-unit step resolution over 200x200 world = 100x100 grid
- Walkability: terrain must be above water AND not inside building
- Walk cost: water=0, rough=1.5, normal=1.0, steep=2.0, near-building=1.3
- A* with octile distance heuristic, linear open list scan, max 5000 nodes
- If goal/start unwalkable, BFS to find nearest walkable node
- Path smoothing: greedy line-of-sight checks to skip redundant waypoints
- Rebuilt when buildings are placed

### `systems/pathfinding.ts`
Thin wrapper (24 LOC): calls `findNavPath()` and applies terrain Y heights to each waypoint.

### `systems/power.ts`
Power generation and distribution:
- Storm intensity: oscillating sine wave with periodic surges (0.5-1.5 range)
- Lightning rods: output = capacity * stormIntensity
- Distribution: pure radius check from each rod to each building
- Tracks generation vs demand for UI display but doesn't actually ration
- Snapshot captures totals for HUD display

### `systems/repair.ts`
Component repair:
- Requires: nearby unit with arms (3.0 range), broken component on target, resources
- Takes 5 ticks to complete
- Costs depend on material type (3 scrap for metal, 1 scrap for plastic, 2 e-waste for electronic)
- On completion: `component.functional = true`
- Works on both unit and building components

### `systems/resources.ts`
Resource management:
- Global pool: {scrapMetal, eWaste, intactComponents}
- Scavenge points: deterministic (seed=789), scattered through city, depletable
- Auto-scavenge: idle armed units collect from nearby points (2.5 range)
- One scavenge per unit per tick
- Simple add/spend API

### `ui/GameUI.tsx`
Largest file (681 LOC). Full DOM overlay:
- **Top bar:** unit count, building count, enemy count, fragment count + speed controls (0.5x/1x/2x/pause)
- **Resource bar:** scrap, e-waste, parts, storm intensity, power gen/demand
- **Selected unit panel:** name, type, speed, position, component status with green/red dots
- **Repair panel:** shown when selected unit has broken components and a nearby armed unit exists
- **Building info panel:** type, power/operational status, lightning rod details
- **Inline fabrication panel:** shown on selected fabrication units -- recipe buttons with cost tooltips
- **Standalone fabrication panel:** bottom-left, for any powered fabricator
- **Combat notifications:** top-right, shows last 3 combat events (component damaged / destroyed)
- **Merge notification:** centered overlay "MAP FRAGMENTS MERGED"
- **Build toolbar:** right side, ROD and FAB buttons with cost tooltips
- **Minimap:** bottom-right 120x120 canvas, buildings (brown) + units (yellow/red), static (never updates)

### `ui/TitleScreen.tsx`
Title screen with polish:
- "SYNTHETERIA" with glitch effect (periodic random translate + color channel split)
- Subtitle "AWAKEN // CONNECT // REBUILD"
- Menu: NEW GAME (active), CONTINUE (disabled), SETTINGS (disabled)
- Scanline overlay effect
- Version label "v0.1.0 -- PHASE 1 PROTOTYPE"
- Staggered fade-in animations

### `index.css`
Global reset: zero margins, full viewport, overflow hidden, fixed body with touch-action: none for mobile.

### `package.json`
Name: "game", private, no test scripts, Vite 7.3, React 19.2, Three.js 0.183, Miniplex 2.0.

### `vite.config.ts`
Minimal: react plugin, base path `/syntheteria/`.

---

## 14. Summary Table: What Survived into Current Codebase

| Original Concept | Current State | Status |
|-----------------|---------------|--------|
| Component damage (no HP) | Still core mechanic | KEPT |
| Map fragments + merge | Evolved into Koota-based system | EVOLVED |
| Fog of war (0/1/2) | Still present | KEPT |
| Continuous 3D positions | Shifted to tile grid | CHANGED |
| Navmesh pathfinding | Replaced with grid A* | REPLACED |
| Circuit-board city | Became labyrinth generator | EVOLVED |
| Lightning rod power | Still present | KEPT |
| Fabrication recipes | Still present | KEPT |
| Storm sky | Still present | KEPT |
| Feral enemies | Became EL Cult system | EVOLVED |
| Miniplex ECS | Replaced with Koota | REPLACED |
| R3F rendering | Being replaced with Phaser | REPLACING |
| Top-down camera | Sphere orbit camera | REPLACED |
| Narration intro | Moved to NarrativeModal | EVOLVED |
| useSyncExternalStore bridge | Koota React hooks | REPLACED |
| Scavenge points | Evolved into resource system | EVOLVED |

---

## 15. Key Takeaways

1. **The original was a focused 2000-line prototype** that nailed the core loop: explore fragmented ruins, merge awareness, scavenge/repair/fabricate. It is more survival-RTS than 4X.

2. **Component damage is the signature mechanic** -- worth investing in. No other game in the genre does "break parts instead of reduce HP" this cleanly.

3. **The fragment merge system is narratively brilliant** -- it makes exploration feel like an AI assembling its consciousness. This should remain central to the experience.

4. **The city-as-labyrinth is atmospheric** but limits strategic depth. The migration to a sphere-world with tile grid opens up 4X territory/expansion gameplay that the original couldn't support.

5. **The power system has potential but is undercooked** -- demand is tracked but never constrains. Storm fluctuation is atmospheric but doesn't create meaningful decisions yet.

6. **The rendering is all primitive geometry** -- no GLB models, no textures. The circuit-board aesthetic is achieved purely through color and instancing. The migration to Phaser + enable3d with actual GLB assets will be a massive visual upgrade.

7. **The codebase was remarkably well-organized for its size** -- clean separation of concerns, every file documented, no spaghetti imports. The migration preserved this discipline.
