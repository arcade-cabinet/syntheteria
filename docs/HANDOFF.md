# Syntheteria — Architecture Handoff (2026-03-25)

This document is the single source of truth for the current state of the project after the BabylonJS + Reactylon pivot. It supersedes the outdated ARCHITECTURE.md (R3F/Three.js) and the pre-pivot sections of CLAUDE.md.

---

## 1. What Is Syntheteria

A 2.5D top-down RTS about an AI that wakes up in the sealed machine lattice of a dead ecumenopolis. You control robots exploring a procedural labyrinth, scavenging resources, fabricating components, and fighting the Cult of EL. The world is an infinite chunk-based labyrinth — you generate it as you explore, fog of war covers the unknown, and it fades to darkness at the edges.

**Primary view:** 2.5D top-down RTS (StarCraft/C&C style, not isometric)
**Setting:** Ecumenopolis with 4 geographic zones: City (center), Coast (E/S), Campus (SW), Enemy/Cult (N)
**Victory:** Defeat the cult leader in northern territory

---

## 2. Tech Stack (Current)

| Layer | Technology | Notes |
|-------|-----------|-------|
| **3D Engine** | BabylonJS 8.x (WebGPU) | Replaced Three.js. Full PBR, shadows, fog, physics |
| **React Binding** | Reactylon 3.x | Declarative JSX for BJS. Uses `babel-plugin-reactylon` |
| **ECS** | Koota 0.6.x | Traits, queries, systems. NOT Miniplex (old) |
| **AI** | Yuka 0.7.x | GOAP (Think/GoalEvaluator), NavGraph, Vehicle |
| **Build (main app)** | Vite 8 + `@vitejs/plugin-react` | Standard React SPA |
| **Build (POC)** | Webpack 5 + babel-plugin-reactylon | Separate entry, port 3001 |
| **Types** | TypeScript 6.x | `tsconfig.app.json` (main), `tsconfig.poc.json` (POC) |
| **Testing** | Vitest (unit), Playwright (E2E) | Unchanged |
| **Persistence** | sql.js (ASM build, no WASM fetch) | IndexedDB backing |
| **Mobile** | Capacitor (Android/iOS shells) | Web-first, native wrap |
| **Assets** | GLB models + AmbientCG PBR textures | `/public/assets/` |

### What Was Replaced

| Old | New | Why |
|-----|-----|-----|
| React Three Fiber + Three.js | BabylonJS + Reactylon | Real engine: built-in physics, PBR, shadows, WebGPU, scene graph |
| Miniplex ECS | Koota ECS | Already migrated before this pivot |
| Fixed-size board generation | Chunk-based generation | Infinite world, no edge math, fog handles boundaries |
| Per-tile React JSX rendering | Imperative `scene.ts` mesh creation | 15k React elements killed the reconciler; imperative is instant |
| Konva (briefly) | BabylonJS | Konva is 2D — no depth, no lighting, no 2.5D |

---

## 3. Project Structure

```
syntheteria/
├── src/
│   ├── board/              ← CORE: generation, chunks, scene population, navigation
│   │   ├── chunks.ts           Chunk-based generation (32x32 tiles, deterministic border gates)
│   │   ├── scene.ts            BabylonJS mesh creation from chunks (PBR materials, cached)
│   │   ├── navigation.ts       Yuka NavGraph per chunk (8-directional weighted edges)
│   │   ├── coords.ts           Unified coordinate system (tile ↔ world ↔ BJS Vector3 ↔ Yuka Vector3)
│   │   ├── zones.ts            Geographic zones (absolute WORLD_EXTENT coords, not board-relative)
│   │   ├── generator.ts        Legacy full-board API (still works, used by tests)
│   │   ├── labyrinthGenerator.ts  8-phase pipeline orchestrator
│   │   ├── labyrinth.ts        Phase 1: Room placement
│   │   ├── labyrinthMaze.ts    Phase 2: Growing Tree maze fill
│   │   ├── labyrinthConnectivity.ts  Phase 3: Region connectivity + loops
│   │   ├── labyrinthFeatures.ts     Phase 4: Dead-end pruning, bridges, tunnels
│   │   ├── labyrinthAbyssal.ts      Phase 5: Ocean basins + platforms
│   │   ├── labyrinthPlatforms.ts    Phase 7: Multi-level elevation
│   │   ├── noise.ts            Seeded RNG (FNV-1a + Mulberry32), 2D value noise
│   │   ├── terrain.ts          Geography/cluster noise, floor type mapping
│   │   ├── grid.ts             GridApi for full-board queries
│   │   ├── adjacency.ts        Pathfinding (A*, BFS, neighbors)
│   │   ├── types.ts            TileData, BoardConfig, FloorType, etc.
│   │   ├── yuka.d.ts           Local Yuka type declarations (TS6 compat)
│   │   └── index.ts            Barrel exports
│   ├── poc/                ← POC: BabylonJS + Reactylon proof of concept
│   │   ├── PocApp.tsx          Engine + Scene + fog setup
│   │   ├── CityContent.tsx     Camera, lights, imperative chunk loading
│   │   ├── index.tsx           React mount + Havok physics init
│   │   ├── index.css           Fullscreen canvas styles
│   │   └── declarations.d.ts   Module + ImportMeta types
│   ├── config/             ← Game data (TypeScript const objects, NO JSON)
│   │   ├── robotDefs.ts        6 player robot archetypes × 3 marks
│   │   ├── cultDefs.ts         3 cult mech types + escalation tiers
│   │   ├── floorMaterials.ts   FloorType → PBR texture mapping (SINGLE SOURCE OF TRUTH)
│   │   ├── models.ts           Unit/building type → GLB path registry
│   │   ├── buildingDefs.ts     Placeable building types
│   │   └── ...
│   ├── ecs/                ← Koota ECS (traits, factory, systems, game state)
│   ├── ai/                 ← Yuka GOAP (CultAgent, PatrolGoal, AggroGoal, EscalateGoal)
│   ├── rendering/          ← OLD R3F renderers (to be replaced by board/scene.ts)
│   ├── systems/            ← Game systems (combat, power, fabrication, navmesh, etc.)
│   ├── ui/                 ← React DOM UI (landing, HUD, modals — still valid)
│   ├── camera/             ← OLD camera code (replaced by BJS ArcRotateCamera in POC)
│   ├── input/              ← OLD input code (replaced by BJS camera controls)
│   ├── audio/              ← Tone.js audio engine (still valid)
│   └── db/                 ← SQLite schema + GameRepo (still valid)
├── poc/
│   └── index.html          POC entry HTML
├── public/
│   ├── assets/
│   │   ├── textures/pbr/   AmbientCG PBR textures (concrete, corrugated_steel, metal)
│   │   └── models/         GLB models (robots, buildings — currently git-deleted, on NAS)
│   └── poc.html            Static Three.js POC (reference only)
├── docs/
│   ├── HANDOFF.md          THIS DOCUMENT
│   ├── design/             Game design docs (CORRECT, engine-independent)
│   ├── technical/          ARCHITECTURE.md (OUTDATED — see this doc instead)
│   ├── research/           Visual audits, analysis (still valid findings)
│   └── references/         poc.html (original Three.js POC)
├── webpack.poc.config.ts   Webpack config for POC (port 3001)
├── tsconfig.poc.json       POC TypeScript config
├── vite.config.ts          Main app Vite config (unchanged)
└── tsconfig.app.json       Main app TS config (excludes src/poc)
```

---

## 4. Chunk-Based World Architecture

### How It Works

The world is not a fixed-size board. It's an infinite grid of **chunks** (32x32 tiles each). Chunks generate on demand as the camera pans. Each chunk is deterministic — same seed + chunk coordinates = identical output every time.

```
Chunk grid:        World:
(0,0) (1,0) (2,0)   Each chunk = 32x32 tiles = 64x64 world meters
(0,1) (1,1) (2,1)   TILE_SIZE_M = 2.0 meters per tile
(0,2) (1,2) (2,2)   Camera loads VIEW_RADIUS chunks in each direction
```

### Chunk Generation Pipeline

Each chunk runs a self-contained version of the labyrinth pipeline:

1. **Room placement** — seeded by `${worldSeed}_c${cx}_${cz}_labyrinth`
2. **Growing Tree maze fill** — carves corridors between rooms
3. **Border gate opening** — deterministic passable tiles at chunk edges, seeded by edge coordinates so adjacent chunks share identical gate positions
4. **Region connectivity** — flood-fill + union-find within the chunk
5. **Dead-end pruning + bridges/tunnels** — features pass
6. **Re-open border gates** — in case pruning closed them
7. **Zone floor assignment** — uses absolute world coords (not chunk-relative)
8. **Resource scatter** — zone-aware resource distribution
9. **Zone stamping** — every tile gets its geographic zone

### Border Gates (Cross-Chunk Connectivity)

Each chunk edge has 4 deterministic gate positions. The seed for a horizontal edge is `${worldSeed}_edge_h_${cx}_${cz}` — both the chunk above and below compute the same gates for their shared edge.

### Zone Assignment

Zones use `WORLD_EXTENT = 256` tiles as a fixed reference frame. A tile at absolute world position `(x, z)` normalizes to `(x/256, z/256)` and maps to zones using fixed boundary thresholds. This means zones are stable regardless of which chunks are loaded.

### Delta Storage (Future)

Player modifications (buildings placed, walls destroyed) will be stored as per-chunk deltas in a `Map<ChunkKey, Delta[]>`. Revisiting a chunk: regenerate from seed + apply deltas = identical state.

---

## 5. Rendering Architecture

### Scene Population (Imperative, Not Declarative)

Creating one React element per tile (~1024 per chunk × 49 chunks = 50k elements) kills the Reactylon reconciler. Instead, `src/board/scene.ts` creates BabylonJS meshes directly:

```typescript
import { populateChunkScene, disposeChunkMeshes } from "../board";

// Create meshes for a chunk
const chunkMeshes = populateChunkScene(chunk, scene);

// Remove when chunk scrolls out of view
disposeChunkMeshes(chunkMeshes);
```

### Material System

- **PBR materials** for all surfaces — albedo texture + roughness + metallic
- **Material cache** — each FloorType gets ONE material instance, shared across all tiles
- **Texture mapping** defined in `src/config/floorMaterials.ts` (single source of truth)
- **8 floor materials**: transit_deck, durasteel_span, collapsed_zone, dust_district, bio_district, aerostructure, abyssal_platform, structural_mass
- **2 wall materials**: durasteel (default), alloy (8% of walls, cyan emissive)

### Camera

BabylonJS `ArcRotateCamera`:
- **Beta ~1°** from vertical (near-top-down)
- **Alpha locked** at -90° (no orbital rotation)
- **Pan** via right-click drag / two-finger
- **Zoom** via scroll wheel, radius 20-100
- **Zero inertia** for crisp RTS feel

### Fog

Exponential fog (mode 2), density 0.015, color `#03070b`. Fades distant chunks into darkness. Combined with a large ground plane at fog color, there's never a visible edge.

### Lights

- **DirectionalLight** "sun" — steep angle, PI*0.8 intensity, cool blue-white
- **HemisphericLight** "ambient" — subtle fill, dark teal ground color
- **PointLight** "accent" — cyan, positioned at player start

---

## 6. Navigation (Yuka)

`src/board/navigation.ts` builds a Yuka `Graph<NavNode, Edge>` per chunk:

- One node per passable tile at its world-space center
- 8-directional edges (4 cardinal + 4 diagonal)
- Edge cost = distance × (1 + elevation_delta × 1.5)
- Cross-chunk pathfinding: `connectChunkGraphs()` will merge graphs at shared border gates

### Coordinate System (`src/board/coords.ts`)

Single source of truth for all coordinate conversions:
- `tileToWorldX/Z()`, `worldToTileX/Z()` — tile ↔ world
- `tileToBabylon()`, `tileToYuka()` — tile → engine-specific Vector3
- `babylonToYuka()`, `yukaToBabylon()` — cross-engine conversion
- `tileToChunk()`, `chunkOrigin()` — tile ↔ chunk grid

---

## 7. ECS (Koota)

Koota traits in `src/ecs/traits.ts`:
- `Unit` — unitType, displayName, speed, selected, mark
- `Position` — x, y, z
- `Faction` — player | cultist | rogue | feral
- `Navigation` — pathJson, pathIndex, moving
- `UnitComponents` — componentsJson (JSON-serialized array)
- `BuildingTrait` — buildingType, powered, operational

Systems accept `world: World` param for testability. Complex data uses JSON string serialization in traits.

---

## 8. AI (Yuka GOAP)

`src/ai/cultBehavior.ts`:
- `CultAgent extends Vehicle` — has `Think<CultAgent>` brain
- 3 evaluators: PatrolGoal, AggroGoal, EscalateGoal
- Decides actions each tick: patrol, attack, assault, idle
- `cultAISystem` reads decided action and issues ECS commands

---

## 9. Game Data (TypeScript Config)

All game data lives in `src/config/` as TypeScript const objects. No JSON. No runtime loading.

- **robotDefs.ts** — 6 player types × 3 marks (maintenance_bot, utility_drone, fabrication_unit, guard_bot, cavalry_bot, sentinel_bot)
- **cultDefs.ts** — 3 cult types (wanderer, brute, assault) + 3 escalation tiers
- **models.ts** — unitType → GLB path registry
- **floorMaterials.ts** — FloorType → PBR texture paths (color, normal, roughness, metalness, AO)
- **buildingDefs.ts** — 6 building types with costs and effects

---

## 10. Running the Project

```bash
# Main app (Vite, port 5173)
pnpm dev

# POC (Webpack + Reactylon, port 3001)
pnpm dev:poc

# Type check main app
pnpm tsc

# Tests
pnpm test

# Lint
pnpm lint
```

### Pre-existing Type Errors (Not From This Pivot)
- `src/App.tsx:47` — unused `StormSky` import
- `src/rendering/CityRenderer.tsx:346` — wrong arg count

These are in the OLD R3F rendering code that will be replaced.

---

## 11. Asset Pipeline

### PBR Textures
`public/assets/textures/pbr/` — AmbientCG 1K JPG textures:
- `concrete/` — Concrete001-020 (Color, NormalGL, Roughness, AO)
- `corrugated_steel/` — CorrugatedSteel001-006A (full PBR)
- `metal/` — Metal001-020 (full PBR)

### 3D Models
GLB models on NAS (`/Volumes/home/assets/`). Robot models in `public/assets/models/robots/`:
- `factions/` — Companion-bot, ReconBot, MobileStorageBot (3 mapped, 3 unmapped)
- `cult/` — Mecha01, MechaGolem, MechaTrooper

### Sprite Sheet Pipeline (Planned)
`/Users/jbogaty/src/reference-codebases/3d-to-2d/convert.py` — Blender bpy script that renders GLB → 8-direction sprite sheets. To be adapted for the 9 robot models for 2D map view.

---

## 12. What's Next

### Immediate
- Wire Koota ECS into the POC (spawn entities from chunk data)
- Yuka nav graph integration (build per chunk, pathfind across chunks)
- Robot sprite sheets (3d-to-2d pipeline → atlas per robot type)
- Replace procedural entity markers with actual robot sprites/models

### Short Term
- Fog of war (unexplored chunks = dark, explored = visible)
- Camera pan triggers chunk load/unload with smooth transitions
- Cult enemy spawning in enemy-zone chunks
- Basic combat loop in the chunk world

### Medium Term
- Hacking system
- Save/load (chunk deltas to IndexedDB via sql.js)
- Signal/compute network
- Audio (Tone.js storm ambience, combat sounds)

### Migrate Away From
- `src/rendering/` (R3F renderers) → replaced by `src/board/scene.ts`
- `src/camera/` (R3F cameras) → replaced by BJS ArcRotateCamera
- `src/input/` (R3F input) → replaced by BJS camera controls
- `src/systems/navmesh.ts` (old grid nav) → replaced by `src/board/navigation.ts`

---

## 13. Design Docs (Unchanged)

These are engine-independent and remain valid:
- `docs/design/GAME_OVERVIEW.md` — 3-phase game loop
- `docs/design/CORE_MECHANICS.md` — fragmented maps, component damage, hacking
- `docs/design/COMBAT.md` — component-based damage, engagement rules
- `docs/design/CONSCIOUSNESS_MODEL.md` — AI consciousness, compute/signal
- `docs/design/DRONES.md` — starting units, progression
- `docs/design/UI_CONCEPT.md` — HUD layout, radial menu
- `docs/story/LORE_OVERVIEW.md` — world lore

---

## 14. Key Architectural Rules

1. **No JSON configs for game data** — all TypeScript const objects in `src/config/`
2. **ECS systems accept `world: World` param** — not singletons, for testability
3. **`src/board/` knows about BabylonJS and Yuka** — not library-agnostic
4. **Material cache in scene.ts** — one PBR material per FloorType, shared across all chunks
5. **Chunks are self-contained** — generate independently, connect via deterministic border gates
6. **Zone assignment uses absolute world coordinates** — WORLD_EXTENT=256, not board-relative
7. **Imperative mesh creation** — don't use React JSX for per-tile geometry
8. **floorMaterials.ts is the single source of truth** for all material/texture assignments
9. **No TODOs** — implement everything properly or don't add it yet
10. **`pending/` is quarantine** — nothing comes back from there
