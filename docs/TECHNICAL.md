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

## 2. ECS Structure & Two-Loop Architecture (Koota)
- **Entities & Traits:** Entities use strict Koota traits (e.g., `Transform`, `Velocity`, `Renderable`, `Signal`, `Hacking`) rather than loose property bags, enabling clean and type-safe systems.
- **Simulation Tick:** Runs at fixed intervals to handle logic like storms, lightning, power networks, compute pools, and combat.
- **Render Loop:** 60fps via `useFrame` for smooth visual interpolation. UI updates react to ECS changes rather than holding game state.

## 3. Fragmented Map System
- **Chunks & Fragments:** Terrain is rendered per-chunk based on exploration state.
- **Map Merge:** Systems detect when units from different fragments meet, calculate spatial offsets, and trigger merge logic.

## 4. Power & Signal Networks
- **Power (BFS):** Lightning rods generate power based on storm intensity. Distributed via BFS to connected buildings/units.
- **Signal (BFS):** Determines which units are within signal range. Disconnected units follow last orders and become vulnerable to hacking.

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
