# Syntheteria Architecture

First-person 4X factory game on a machine planet. You are a broken robot. Grind ore deposits into powder, compress powder into physical cubes, carry cubes to machines, and build an industrial civilization while competing against AI factions.

For a detailed system inventory, see [docs/technical/ARCHITECTURE.md](./technical/ARCHITECTURE.md).

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | React Three Fiber 9.5 + Three.js 0.183 | 3D scene, FPS camera, PBR materials |
| ECS | Miniplex 2.0 (migrating to Koota 0.6) | Entity management, archetype queries |
| Physics | Rapier 0.14 | Rigid bodies, collisions, raycasting |
| AI | Yuka 0.7 + custom GOAP + 9-state FSM | Vehicle steering, NavMesh, governors |
| Audio | Tone.js 15.1 | Spatial audio, procedural synth |
| UI | React DOM + nipplejs | HUD, radial menus, mobile joystick |
| Persistence | IndexedDB (web), expo-sqlite (native) | Save/load |
| Build | Vite 7 (web), Expo SDK 55 (native) | Dev server, bundling |
| Lint | Biome 2.4 | Code quality |
| Test | Jest 30 + ts-jest, Playwright 1.58 | Unit + E2E |
| CI | GitHub Actions | Lint, type-check, tests, build |

---

## Data Flow Overview

```
Player Input (WASD/mouse/touch)
    ↓
FPSCamera + FPSInput (pointer lock, WASD walk)
    ↓
ObjectSelectionSystem (Rapier raycast → emissive highlight → radial menu)
    ↓
ECS World (Miniplex 2.0 entity store)
    ↓
Two-Loop Architecture:

[Fixed Tick Loop]                    [Frame Loop via useFrame]
simulationTick() in gameState.ts     R3F components read ECS directly
  - exploration                       - CoreLoopSystem (harvest/compress)
  - power/wire/signal networks        - GameplaySystems (strategic checks)
  - mining, processing, fabrication   - YukaSystem (AI steering)
  - combat, hacking                   - Renderers (terrain, cubes, units)
  - territory, diplomacy, quests      - AudioSystem (Tone.js)
  - AI governors (GOAP)
  - raid system
  - victory checking
    ↓
GameSnapshot (useSyncExternalStore)
    ↓
React HUD (FPSHUD, CoreLoopHUD, QuestPanel, TechTreePanel...)
```

**Critical rule:** Never write per-frame positions into React state. Scene components read ECS entities directly in `useFrame`.

---

## Directory Structure

```
syntheteria/
├── app/                           # Expo Router screens
│   ├── _layout.tsx                # Root layout
│   ├── index.tsx                  # Title screen route
│   └── game/index.tsx             # Game route
├── config/                        # JSON tunables (39 files + index.ts)
│   ├── index.ts                   # Type-safe loader — single export point
│   └── *.json                     # All game balance (see docs/CONFIG.md)
├── src/
│   ├── App.tsx                    # Phase router: title → pregame → game
│   ├── GameScene.tsx              # Canvas + all 3D rendering (lazy-loaded)
│   ├── ai/                        # AI: GOAP governors + FSM + steering
│   ├── audio/                     # Tone.js spatial audio
│   ├── ecs/                       # ECS world, types, tick loop
│   │   └── koota/                 # Koota migration (in progress)
│   ├── input/                     # FPS camera, raycasting, selection
│   ├── physics/                   # Rapier WASM setup
│   ├── rendering/                 # Three.js renderers + materials + procgen
│   ├── save/                      # IndexedDB save management
│   ├── systems/                   # 140 ECS systems (~41K lines)
│   │   └── __tests__/             # Jest unit tests (158 files)
│   └── ui/                        # React HUD components
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── CONFIG.md                  # Config schema reference
│   ├── CONTRIBUTING.md            # Developer getting-started guide
│   ├── technical/ARCHITECTURE.md  # Full system inventory
│   ├── design/                    # GDD design documents
│   └── plans/                     # Implementation plans
├── tests/e2e/                     # Playwright E2E tests
├── .github/workflows/             # ci.yml + deploy.yml
├── jest.config.js                 # Jest + ts-jest (node env)
├── biome.json                     # Biome linter config
└── tsconfig.json                  # TypeScript config
```

---

## ECS Architecture

### Entity Model (Miniplex 2.0)

All game objects are entities. An entity is an object with optional component fields (defined in `src/ecs/types.ts`). Miniplex queries select entities by which fields they have.

Key component categories:

- **Identity**: `id`, `faction` ("player" | "reclaimers" | "volt_collective" | "signal_choir" | "iron_creed" | "feral")
- **Spatial**: `worldPosition` — the single source of truth for 3D position
- **Unit**: `unit` (type, speed, component list)
- **Factory**: `belt`, `wire`, `miner`, `processor`
- **Materials**: `oreDeposit`, `materialCube`, `powderStorage`, `hopper`, `cubeStack`
- **Ownership**: `heldBy`, `onBelt`, `inHopper` (entity ID refs)
- **AI**: `hackable`, `signalRelay`, `automation`
- **Player**: `playerControlled` (isActive, yaw, pitch)

Archetype queries are defined in `src/ecs/world.ts`:

```ts
const units      = world.with("unit", "worldPosition", "mapFragment");
const belts      = world.with("belt", "worldPosition");
const placedCubes = world.with("placedAt", "materialCube", "worldPosition");
const otters     = world.with("otter", "worldPosition");
```

### Koota Migration

`src/ecs/koota/` contains the migration scaffolding. Koota adds trait-based SoA storage, relations, and reactive queries. The `bridge.ts` file syncs Miniplex and Koota instances so systems can be migrated incrementally.

---

## AI Architecture

Three-tier hierarchy with strict separation of concerns:

### Tier 1: CivilizationGovernor (GOAP)

`src/ai/goap/CivilizationGovernor.ts` — one per AI faction. Evaluates strategic goals (expand, gather, defend, research, attack, scout, trade, hoard) using A* planner over world state. Personality weights are in `config/civilizations.json`.

### Tier 2: BotBrain (9-State FSM)

`src/ai/BotBrain.ts` — per-unit finite state machine:

```
IDLE → PATROL → SEEK_TARGET → ATTACK → FLEE
GUARD (engage enemies within radius, return to post)
GATHER (approach deposit, auto-aggro if threatened)
RETURN_TO_BASE (head home when inventory full)
FOLLOW (trail a leader at set distance)
```

### Tier 3: Yuka Steering + NavMesh

- `BotVehicle.ts` wraps Yuka `Vehicle` with velocity/acceleration/steering
- `SteeringBehaviors.ts` — seek, arrive, flee, wander
- `NavMeshBuilder.ts` + `PathfindingSystem.ts` — NavMesh-based A* pathfinding
- `FormationSystem.ts` + `FormationPatterns.ts` — squad formations (line/wedge/column/circle)

### Perception and Memory

- `PerceptionSystem.ts` — cone-of-sight with line-of-sight occlusion
- `MemorySystem.ts` — time-based confidence decay
- `ThreatAssessment.ts` — multi-factor threat scoring

---

## Config System

All game balance is in 39 JSON files under `config/`. The type-safe loader at `config/index.ts` re-exports everything as a single `config` object with full TypeScript inference:

```ts
import { config } from '../config';

const beltSpeed   = config.belts.tiers.fast.speed;       // number
const oreHardness = config.mining.oreTypes.titanium.hardness; // number
const reclaimer   = config.civilizations.reclaimers;     // exact shape
```

Balance changes never require code changes. See [docs/CONFIG.md](./CONFIG.md) for full schema reference.

---

## Physical Cube Economy

Resources are physical 0.5m Rapier rigid body cubes, visible to all factions.

### Material States

1. **Raw Deposits** — geological formations in terrain; not cubes
2. **Powder** — internal to bot; shown on HUD capacity bar
3. **Cubes** — physical rigid bodies; grab, carry, stack, belt-transport, smelt, throw, or have stolen

### Cube Lifecycle

```
Deposit → [grind] → Powder → [compress] → Cube
  → [carry] → Furnace hopper → [smelt] → Refined Cube
  → [place on belt] → Machine input
  → [stack] → Wall or structure
  → [throw] → Projectile
  → [raid] → Enemy steals
```

### Why Physical?

Wealth is visible to all factions. Enemies plan raids (`raidSystem.ts`) to steal cubes. You build decoy piles (`decoyPile.ts`) to misdirect them. Walls are built from cube stacks — material type determines structural strength.

---

## Rendering Pipeline

`GameScene.tsx` is `React.lazy()`-loaded to keep the title/pregame bundle small. Scene composition:

1. **Physics** — Rapier WASM provider
2. **Terrain** — `TerrainRenderer` + `TerrainPBR` (heightfield + PBR materials)
3. **World Objects** — city buildings, factories, furnaces, ore deposits
4. **Cubes** — `FreeCubeRenderer`, `PlacedCubeRenderer`, `WallRenderer`
5. **Factory** — `BeltRenderer`, `WireRenderer`
6. **Units** — `UnitRenderer`, `OtterRenderer` (sprite billboards), `HologramRenderer`
7. **Effects** — fog of war, stockpile glow, harvest particles, storm sky
8. **Input** — `FPSCamera` (pointer lock), `ObjectSelectionSystem` (Rapier raycast)
9. **Systems** — `CoreLoopSystem`, `GameplaySystems`, `YukaSystem`, `AudioSystem`
10. **DOM Overlay** — FPSHUD, radial menus, tech tree, quest panel, mobile controls

### PBR Materials

`MaterialFactory.ts` builds composable PBR materials from texture sets. `CubeMaterialProvider.tsx` maps 15 ore types to unique PBR treatments. `NormalMapComposer.ts` generates layered normals with bolts, seams, and vent detail.

---

## State Bridge (ECS → React)

The tick loop notifies React via `useSyncExternalStore`:

```ts
// src/ecs/gameState.ts
export function subscribe(listener: () => void): () => void { ... }
export function getSnapshot(): GameSnapshot { ... }
```

`GameSnapshot` carries tick, speed, pause state, fragments, unit counts, events, power, resources, fabrication jobs, and game-over state. `CoreLoopSystem` has its own high-frequency store (`subscribeCoreLoop`) for per-frame data (harvesting progress, compression state, held cube).

---

## Testing

| Layer | Tool | Location |
|-------|------|----------|
| Unit | Jest 30 + ts-jest | `src/*/__tests__/`, `config/__tests__/` |
| Integration | Jest | `src/__tests__/` |
| E2E | Playwright 1.58 | `tests/e2e/` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

Run tests: `npm test` (unit + config), `npm run test:e2e` (E2E).

Config schema tests live in `config/__tests__/` — one test file per JSON file. They validate structure, value ranges, and cross-references between configs.

---

## Application Boot Flow

```
main.tsx (Vite entry) / Expo Router (native)
  └── App.tsx — phase state machine
        ├── "title"   → TitleScreen.tsx
        ├── "pregame" → PregameScreen.tsx
        │               (race selection, map config, AI opponents)
        └── "playing" → GameScene.tsx (React.lazy)
                          ├── R3F Canvas (physics, terrain, units, effects)
                          └── DOM Overlay (HUD, menus, panels)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| First-person view | You ARE the bot — intimate relationship with the physical economy |
| Contextual interaction | Click object → radial menu. No tool system. |
| Physical cubes | Wealth is visible, steal-able, raid-able — natural tension |
| Component damage | Units have functional/broken parts, not HP bars |
| Config-driven balance | 39 JSON files — balance changes never require code changes |
| Two-loop separation | Fixed tick for deterministic simulation; frame rate for smooth rendering |
| Lazy scene loading | `GameScene` is `React.lazy()` — title/pregame load instantly |
| Seeded generation | `src/ecs/seed.ts` — same seed = same world |
| GOAP governors | Goals evaluated dynamically, not scripted behavior trees |
| Yuka steering | Proper vehicle velocity/acceleration, not teleporting |
