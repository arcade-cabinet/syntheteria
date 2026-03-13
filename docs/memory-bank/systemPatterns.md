# System Patterns: Syntheteria

## Architecture Overview

Syntheteria follows a strict separation of concerns:

```
JSON Config  -->  Systems (logic)  -->  Koota ECS (state)  -->  TSX (rendering)
                      |                      |
                      v                      v
                  AI Runtime            SQLite (persistence)
```

- **Koota ECS** owns canonical gameplay state
- **Systems** own all logic — 21 systems tick per frame in `gameState.ts`
- **TSX** reads from contracts and renders — TSX must NOT invent gameplay logic
- **JSON config** drives all tuning — 23+ config files in `src/config/`
- **SQLite** is authoritative persistence; runtime state is Koota ECS
- **No dual data stores** — ONE source of truth per data domain

## ECS Pattern (Koota)

Koota replaced Miniplex as the ECS runtime. Key patterns:

- Traits define component schemas
- Queries filter entities by trait composition
- Systems iterate queries each frame
- `_reset()` functions on module-level Map state for test cleanup
- Tests mock Koota queries as plain arrays via `jest.mock`

## System Tick Architecture

21 systems registered in `gameState.ts` execute in 8 ordered phases per frame:

1. Input processing
2. AI decision (GOAP governors evaluate)
3. Movement / steering
4. Physics (Rapier callbacks)
5. Combat / hacking
6. Economy / harvesting
7. Construction / fabrication
8. Rendering state sync

Systems are pure functions operating on ECS state. They do not import React, R3F, or rendering concerns.

## Config-Driven Design

All tuning values live in JSON config files, loaded through the type-safe loader at `config/index.ts`:

```typescript
import { config } from "../../config";
// Access: config.combat.hackRange, config.economy.harvestRate, etc.
```

- 23+ JSON config files in `src/config/`
- Tests import expected values from config — never hardcode
- `gameplayRandom` over `Math.random` for determinism; `scopedRNG` for reproducible sequences

## Radial Menu Pipeline

The radial context menu is the primary interaction surface, replacing toolbars, bottom sheets, and selection panels:

```
radialMenu.json  -->  radialMenu.ts  -->  radialProviders.ts  -->  RadialMenu.tsx
   (config)           (state machine)      (context providers)      (SVG renderer)
```

- Right-click on desktop, long-press on mobile
- Context-sensitive: terrain, structures, bots, enemies each expose different actions
- All contextual actions flow through this pipeline — no separate toolbars

## AI Architecture

Three-layer AI stack:

```
GOAP Governors (strategic)  -->  Yuka Steering (tactical)  -->  NavMesh Pathfinding (movement)
```

- **GOAP Governors** (`src/ai/`): Evaluate faction goals, plan action sequences, issue orders to bots
- **Yuka Steering** (`BotVehicle`): Execute movement orders — seek, flee, flank, siege, formation
- **NavMesh Pathfinding** (`NavMeshBuilder`): Generate navigation meshes from sector geometry

Bot definitions carry: archetype, mark, speech profile, default AI role, steering profile, navigation profile. All affect runtime behavior.

### Bot States
Standard: IDLE, PATROL, ATTACK, FLEE, HARVEST
Tactical: FLANK (perpendicular intercept), SIEGE (spiral inward around fortified position)
Faction-specific: Signal Choir hack attack (hold at range instead of closing to melee)

### Governor System
`governorSystem.ts` runs in the AI decision phase. Each AI civilization has a governor that:
1. Evaluates current world state against faction goals
2. Plans GOAP action sequences
3. Issues orders to subordinate bots
4. Executes through `GovernorActionExecutor`

## Rendering Architecture

39 R3F renderer components mounted in `GameScene.tsx` Canvas:

- Renderers consume system state — they do NOT invent logic
- `InstancedCubeRenderer` for cube economy (replaced `FreeCubeRenderer`)
- `MaterialFactory` for JSON-driven PBR materials
- `HologramRenderer` for otter hologram patron AI communication
- `SelectionHighlight` + `PlacementPreview` for interaction feedback
- HDRI environment with storm-reactive intensities

### Rendering Rules
- Zero Lambert materials — verified clean PBR
- Instanced rendering for cubes and repeated geometry
- Weather renderers consume storm system state, do not invent weather logic

## Rapier Physics

Physics is decoupled via callbacks — systems NEVER import Rapier directly:

```typescript
// Correct: system registers callback
onCollision((entityA, entityB) => { /* handle */ });

// Wrong: system imports Rapier
import RAPIER from "@dimforge/rapier3d"; // NEVER
```

## World Generation

Viewport-driven chunk generation:
- Each chunk = square region of sector cells (e.g., 8x8 cells)
- Generated deterministically from `worldSeed + chunkKey`
- Camera position determines which chunks are loaded
- Only player modifications (deltas) are persisted — baseline regenerates from seed
- Creates effectively infinite explorable ecumenopolis with minimal storage

## Save/Load System

- IndexedDB + expo-sqlite persistence
- 4 save slots + autosave
- Saves campaign as one coherent machine-world state
- Load reconstructs ECS state from SQLite records

## Audio Architecture

- Tone.js spatial audio engine
- Procedural SFX library (not pre-recorded samples for most effects)
- Ambient soundscapes tied to sector type
- Adaptive music system responds to game state (combat, exploration, calm)
- Quality tier system with GPU detection and mobile throttling

## Component Decomposition Rules

Strict separation enforced across the codebase:

- **No logic in TSX** — extract to systems or pure functions
- **Config over constants** — never hardcode tuning values
- **`gameplayRandom` over `Math.random`** — deterministic RNG
- **Never `_` prefix** for "unused" variables — delete or use them
- **Pure functions for testability** — extract from R3F components

## Module Pattern

Module-level Map state is the lightweight store pattern:

```typescript
const _state = new Map<string, FactionState>();

export function getFactionState(id: string) { return _state.get(id); }
export function _reset() { _state.clear(); } // For test cleanup
```

## Testing Patterns

- Mock all R3F renderers in smoke tests (ESM parse avoidance)
- `jest.mock` for ECS queries — mock as plain arrays
- Variables prefixed with `mock` can be referenced in `jest.mock` factories
- `_reset()` called in `beforeEach` for module-level state cleanup
- Tests import expected values from JSON config source of truth
