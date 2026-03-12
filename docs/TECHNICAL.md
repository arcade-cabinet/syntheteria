# Syntheteria - Technical Architecture & Core Formulas

## 1. Stack & Rationale
- **Cross-Platform Framework:** Expo SDK (Latest), Metro (Bundler)
- **World & Logic (ECS):** `koota` (Trait-based, strict typings, performant queries)
- **UI & Styling:** NativeWind v4 + React Native Reusables (Radix-like primitives)
- **Rendering:** React Three Fiber + Three.js + Drei (bridged via `expo-gl`)
- **Audio:** Tone.js (Procedural synths and spatial ambient loops via `AmbienceManager`)
- **Animation:** `animejs` (for ECS traits tweening) & `react-native-reanimated` (for 120fps UI threads)
- **Build/Test:** Jest (replaces Vitest)
- **Persistence (Stores):** Expo SQLite + Drizzle ORM (Separation of long-term retention from short-term ECS state)

**Why this Stack?**
Migrating to an Expo + Koota foundation provides true cross-platform capabilities (iOS, Android, Web) from a single codebase while offering a more rigorous ECS architecture. NativeWind and RN Reusables accelerate UI development, and Tone.js provides unmatched capabilities for our atmospheric, procedural audio needs. Expo SQLite combined with Drizzle ORM allows for robust, type-safe local data persistence, cleanly separating long-term saved game data from volatile, short-term ECS tick state.

## 1.1 Interaction And Platform Constraints
- Touch-first interaction remains a design constraint even when desktop controls are supported.
- UI targets should be sized for fingers and should not depend on hover-only affordances.
- The runtime should be conscious of mid-range device performance, not just desktop/WebGL headroom.
- Large campaign state must live in SQLite rather than volatile runtime globals.

## 2. ECS Structure & Two-Loop Architecture (Koota)
- **Entities & Traits:** Entities use strict Koota traits (e.g., `Transform`, `Velocity`, `Renderable`, `Signal`, `Hacking`) rather than loose property bags, enabling clean and type-safe systems.
- **Simulation Tick:** Runs at fixed intervals to handle logic like storms, lightning, power networks, compute pools, and combat.
- **Render Loop:** 60fps via `useFrame` for smooth visual interpolation. UI updates react to ECS changes rather than holding game state.

## 3. Fragmented Map System
- **Chunks & Fragments:** Terrain is rendered per-chunk based on exploration state.
- **Map Merge:** Systems detect when units from different fragments meet, calculate spatial offsets, and trigger merge logic.

### Rendering Intent
- Abstract chunks and detailed chunks are both first-class render states.
- Fragment merging is not just a simulation event; it is a player-facing revelation of spatial truth.
- Outdoor rendering should stay chunk-aware because fog, discovery, and future ownership are all spatially local concerns.

## 3.1 Persistent World Layer
- **New Game Config:** `worldSeed`, `mapSize`, `difficulty`, `climateProfile`, and `stormProfile` are now first-class inputs to generation and persistence.
- **Outdoor Persistence:** Generated world headers, tiles, POIs, city-instance seeds, campaign scene state, resource pools, and persisted world actors are stored in Expo SQLite tables and reloaded on `Continue`.
- **Runtime Sync:** Fog state, discovered POIs, city-instance state, active scene, resource deltas, and world actor snapshots are periodically synchronized back into SQLite.

## 4. Power & Signal Networks
- **Power (BFS):** Lightning rods generate power based on storm intensity. Distributed via BFS to connected buildings/units.
- **Signal (BFS):** Determines which units are within signal range. Disconnected units follow last orders and become vulnerable to hacking.

## 4.1 World / City Transition Contract
- **Scene Modes:** Runtime supports `world` and `city`.
- **Transition State:** The active scene and active city instance id are persisted in `campaign_states`.
- **City Foundation:** Interior scenes currently use a deterministic square-grid assembly contract as a placeholder for future Quaternius-driven authored modules.
- **Actor Hydration:** Outdoor units/buildings now hydrate from `world_entities`, which keeps runtime ECS state aligned with saved campaign state instead of using hard-coded reseeding.

## 4.2 AI Runtime Contract
- **AI Package Boundary:** `src/ai` is the only valid package for Yuka-backed behavior runtime work.
- **Ownership:** Koota owns canonical gameplay state, Yuka owns behavior execution runtime, and SQLite owns persisted AI/session state.
- **Bridge:** Koota snapshots project into typed Syntheteria agents via `src/ai/bridge`, and write-back stays explicit and bounded.
- **Navigation:** Behavior code must consume `src/ai/navigation` adapters instead of calling ad hoc path helpers directly.
- **Persistence:** Saves serialize Syntheteria-defined AI state, not raw Yuka objects.
- **Planning Workspace:** Architecture, audit, requirements, and test strategy live under `docs/plans/`.

## 5. Core Formulas

### Assembly & Validation
- Valid Robot: `has_power_source AND has_controller AND (has_locomotion OR is_stationary)`

### Hacking & Compute
- Hack is feasible if: `has_signal_link AND has_technique AND available_compute >= hack_compute_cost`
- `robot_compute_cost = sum(function.base_cost) × automation_multiplier`
- `hack_compute_cost = target_complexity × technique_efficiency`

## 6. Architecture Mandates (The "No" List)
- **NO Vite/Vitest:** Use Metro/Jest exclusively.
- **NO Miniplex:** All ECS logic must use Koota traits and queries.
- **NO Raw Web Audio:** All audio must route through Tone.js via an `AmbienceManager`.
- **NO Raw CSS:** Use NativeWind and RN Reusables for UI styling.

## 7. Historical Notes
- Older docs described a web-only Vite/Miniplex architecture. That implementation direction is obsolete.
- The important parts to preserve from that earlier phase are the gameplay constraints: chunked fragmented maps, touch-aware UX, explicit persistence boundaries, and render/simulation separation.
