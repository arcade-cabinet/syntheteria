---
title: "Architecture"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "Tech stack (Expo/Metro, Koota ECS, R3F, NativeWind), ECS structure, persistence model, hard rules"
depends_on: []
planned_work:
  - "Config-driven asset pipeline — all assets via JSON + resolveAssetUri()"
  - "Fail-hard audit — remove all silent fallbacks"
---

# Architecture

## Stack & Rationale

| Layer | Technology | Why |
|---|---|---|
| Cross-platform framework | Expo SDK + Metro | Single codebase targeting web, iOS, Android; Metro handles native module resolution |
| World & logic | Koota ECS | Canonical gameplay state; entity/component/system with trait-based queries |
| Rendering | React Three Fiber + Three.js + Drei | Declarative 3D in React; Drei for camera controls, loaders, helpers. Target backends: WebGPU (web), Filament (mobile) — see [RENDERING_BACKENDS.md](RENDERING_BACKENDS.md). |
| UI & styling | NativeWind v4 + React Native components | Tailwind-like utility classes that compile to RN StyleSheet |
| Persistence | Expo SQLite + Drizzle ORM | Local-first campaign saves; typed schema with migrations |
| Animation | animejs + react-native-reanimated | UI motion (reanimated) and procedural tweens (animejs) |
| Audio | Tone.js | Spatial audio, procedural SFX, adaptive music layers |
| Testing | Jest + Maestro | Jest for unit/component; Maestro for E2E (flows in maestro/flows/) |

## Platform Constraints

- Touch-first remains a design constraint. Every interaction must work with fingers.
- The game must remain readable on mobile and desktop viewports.
- Persistent campaign state belongs in SQLite, not long-lived runtime globals.
- Metro wraps modules in CJS `__d()` factories — any npm package using `import.meta` in ESM will break. Use `unstable_conditionNames: ['react-native', 'browser', 'require', 'default']` in metro.config.js to force CJS builds.

## ECS Structure

Koota owns canonical gameplay state. The ownership boundaries are:

- **Koota ECS** — identity, faction, components, canonical position, scene state.
- **Systems** — pure logic operating on Koota queries. Systems run in an 8-phase tick orchestrator registered in `src/systems/registerSystems.ts`.
- **TS package layers** — rules, contracts, generation, persistence, and AI interfaces. These are pure TypeScript modules with no React dependency.
- **TSX** — reads from contracts and Koota queries. TSX must not invent gameplay logic locally.

### Tick Phases

The game loop runs systems in explicit phases per tick. Each phase has a defined responsibility (e.g., input, AI, physics, economy, rendering sync). Systems register into exactly one phase.

### Module-Level State Pattern

Lightweight stores use module-level `Map` state with an exported `_reset()` function for test cleanup. This avoids React context for high-frequency gameplay state while keeping tests isolated.

## Persistence

SQLite is the authoritative long-term state store. Campaign saves own:

- Campaign setup (seed, faction, difficulty)
- Sector map / topology state
- POIs and progression markers
- World actors (robots, NPCs, cultists)
- AI state (tasks, memory, steering targets)
- Infrastructure state (power, belts, fabrication)
- Faction state (territory, diplomacy, tech)
- Current scene / camera / context
- **Chunk deltas** — only player modifications against the procedural baseline (see WORLD_SYSTEMS.md)

The save model supports loading the campaign as one coherent machine-world, not as separately generated outdoor and city layers.

### Persistence Rules

- The procedural baseline is never stored — it is regenerated from seed.
- Only deltas are saved: harvested/destroyed structures, player-built structures, discovery state, modified terrain.
- Save/load must not silently drop AI task state.
- Versioned serialization is required; schema evolution must be explicit.

## Core Formulas

### Assembly
```
Valid Robot = has_power_source AND has_controller AND (has_locomotion OR is_stationary)
```

### Hacking
```
Hack = Signal Link + Required Technique + Available Compute
```

### Progression
Chassis growth uses small archetype sets plus logarithmic Mark progression rather than a sprawling unit tree.

## Hard Rules

These are non-negotiable architectural constraints:

| Rule | Rationale |
|---|---|
| **No Vite / Vitest** | Metro is the bundler. Jest is the test runner. Vite was removed. |
| **No Miniplex** | Koota is the ECS. Miniplex was fully migrated away. |
| **No raw CSS** | NativeWind v4 owns all styling. No `.css` files, no inline `style` objects for layout. |
| **No TSX-owned gameplay logic** | Gameplay logic lives in systems and TS package layers. TSX reads and renders. |
| **No legacy compatibility layers** | Do not preserve shims, re-exports, or renamed `_vars` for removed code. Delete completely. |
| **Crash hard on missing assets** | Do not silently fall back to placeholder geometry or skip rendering. If an asset is missing, the error must be visible and immediate. |
| **Config over constants** | Tunable values come from JSON config files loaded via `config/index.ts`. Never hardcode gameplay numbers in source. |
| **gameplayRandom over Math.random** | All gameplay-affecting randomness must use the seeded PRNG for deterministic replay. |
| **No _ prefix for unused params** | If a parameter is unused, remove it. Do not rename to `_param`. |
| **Biome formatting** | Tabs, double quotes, sorted imports. Enforced by tooling. |

## Weather & Storm Runtime

The storm is a core game system, not a cosmetic effect. Weather systems own:

- Wormhole cycle timing
- Storm intensity (sine wave + surges)
- Visibility modifiers
- Lightning scheduling
- Breach / exposed-sector pressure

Renderers consume system state. They do not invent weather logic. See RENDERING.md for the visual implementation.

## Infrastructure Model

Infrastructure is modeled as embedded, subsurface, and structural — not as visible above-ground conveyor lines:

- Energy spines and power conduits
- Relay towers and signal nodes
- Lift shafts and transit corridors
- Freight portals and subsurface logistics

Visible belts and overlay lines are optional visual aids for readability, not foundational identity. The long-term metaphors are transit relays, freight portals, lift shafts, and energy spines.
