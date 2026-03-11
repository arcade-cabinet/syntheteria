# Syntheteria Architecture

First-person 4X factory game on a machine planet. You are a broken robot. Grind ore deposits into powder, compress powder into physical cubes, carry cubes to machines, and build an industrial civilization while competing against AI factions.

The canonical architecture reference is [docs/technical/ARCHITECTURE.md](./technical/ARCHITECTURE.md). This file provides the high-level overview; the technical doc contains the full system inventory, ECS deep-dive, rendering pipeline, and application boot flow.

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | React Three Fiber 9.5 + Three.js 0.183 | 3D scene, FPS camera, PBR materials |
| ECS | Miniplex 2.0 (migrating to Koota 0.6) | Entity management, archetype queries |
| Physics | Rapier 0.14 (`@dimforge/rapier3d-compat`) | Rigid bodies, collisions, raycasting |
| AI | Yuka 0.7 + custom GOAP + 9-state FSM | Vehicle steering, NavMesh, governors |
| Audio | Tone.js 15.1 | Spatial audio, procedural synth |
| Animation | anime.js 4.3 | UI animations, screen transitions |
| Mobile Input | nipplejs 0.10 | Virtual joystick for mobile FPS |
| UI | React DOM overlay | HUD, radial menus, tech tree, pregame screens |
| State bridge | `useSyncExternalStore` | ECS to React UI sync |
| Build | Vite 7 (web primary), Expo SDK 55 (native scaffolded) | Dev server, bundling |
| Lint | Biome 2.4 | Code quality |
| Test | Jest 30 + ts-jest (unit), Playwright 1.58 (E2E) | 158+ test files |
| CI | GitHub Actions | `ci.yml` (lint + test), `deploy.yml` |

---

## Data Flow Overview

```
Player Input (WASD/mouse/touch)
    |
    v
FPSCamera + FPSInput (pointer lock, WASD walk)
    |
    v
ObjectSelectionSystem (Rapier raycast -> emissive highlight -> radial menu)
    |
    v
ECS World (Miniplex 2.0 entity store)
    |
    v
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
    |
    v
GameSnapshot (useSyncExternalStore)
    |
    v
React HUD (FPSHUD, CoreLoopHUD, QuestPanel, TechTreePanel...)
```

**Critical rule:** Never write per-frame positions into React state. Scene components read ECS entities directly in `useFrame`.

---

## Directory Structure

```
syntheteria/
|- app/                           # Expo Router screens
|  |- _layout.tsx                 # Root layout
|  |- index.tsx                   # Title screen route
|  `- game/index.tsx              # Game route
|- config/                        # JSON tunables (39+ files + index.ts)
|  |- index.ts                    # Type-safe loader -- single export point
|  `- *.json                      # All game balance (see docs/CONFIG.md)
|- src/
|  |- App.tsx                     # Phase router: title -> pregame -> game
|  |- GameScene.tsx               # Canvas + all 3D rendering (lazy-loaded)
|  |- ai/                         # AI: GOAP governors + FSM + steering
|  |- audio/                      # Tone.js spatial audio
|  |- ecs/                        # ECS world, types, tick loop
|  |  `- koota/                   # Koota migration (in progress)
|  |- input/                      # FPS camera, raycasting, selection
|  |- physics/                    # Rapier WASM setup
|  |- rendering/                  # Three.js renderers + materials + procgen
|  |- save/                       # IndexedDB save management
|  |- systems/                    # 140 ECS systems (~41K lines)
|  |  `- __tests__/               # Jest unit tests (158 files)
|  `- ui/                         # React HUD components
|- docs/
|  |- ARCHITECTURE.md             # This file (high-level overview)
|  |- CONFIG.md                   # Config schema reference
|  |- CONTRIBUTING.md             # Developer getting-started guide
|  |- REMAINING-WORK.md           # Task tracker
|  |- technical/ARCHITECTURE.md   # Full system inventory (canonical)
|  |- design/                     # GDD design documents
|  `- plans/                      # Implementation plans
|- tests/e2e/                     # Playwright E2E tests
|- .github/workflows/             # ci.yml + deploy.yml
|- jest.config.js                 # Jest + ts-jest (node env)
|- biome.json                     # Biome linter config
`- tsconfig.json                  # TypeScript config
```

---

## Config System

All game balance is in 39 JSON files under `config/`. The type-safe loader at `config/index.ts` imports every JSON file and re-exports them as a single `config` object with full TypeScript inference:

```ts
import { config } from '../config';

const beltSpeed   = config.belts.tiers.fast.speed;       // number
const oreHardness = config.mining.oreTypes.titanium.hardness; // number
const reclaimer   = config.civilizations.reclaimers;     // exact shape
```

Balance changes never require code changes. See [docs/CONFIG.md](./CONFIG.md) for full schema reference.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| First-person view | You ARE the bot — intimate relationship with the physical economy |
| Contextual interaction | Click object -> radial menu. No tool system. |
| Physical cubes | Wealth is visible, steal-able, raid-able — natural tension |
| Component damage | Units have functional/broken parts, not HP bars |
| Config-driven balance | 39 JSON files — balance changes never require code changes |
| Two-loop separation | Fixed tick for deterministic simulation; frame rate for smooth rendering |
| Lazy scene loading | `GameScene` is `React.lazy()` — title/pregame load instantly |
| Seeded generation | `src/ecs/seed.ts` — same seed = same world |
| GOAP governors | Goals evaluated dynamically, not scripted behavior trees |
| Yuka steering | Proper vehicle velocity/acceleration, not teleporting |

See [docs/technical/ARCHITECTURE.md](./technical/ARCHITECTURE.md) for full details: complete system inventory, ECS entity model, AI architecture, rendering pipeline, state bridge, and application boot flow.
