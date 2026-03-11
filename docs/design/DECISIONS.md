# Syntheteria - Technical Decisions Log

This document records the technology choices made for Syntheteria, the reasoning behind each decision, and how the architecture has evolved. It serves as a decision log -- showing not just what was chosen, but what was considered and why things changed.

---

## Tech Stack Philosophy

Three principles have guided every technical decision:

1. **Web-first, cross-platform.** The game should run in a browser with no install. Native mobile (iOS/Android) is a bonus, not a blocker. All code is TypeScript -- fully readable by both humans and AI tooling.

2. **Performance-conscious but pragmatic.** PBR materials, physics simulations, and hundreds of entities demand real performance. But we chose a web stack over Unity/Godot because the development velocity of TypeScript + React + hot reload outweighs the raw performance ceiling of native engines for this game's scope.

3. **Data-driven balance.** Every tunable value lives in JSON config files. Game balance changes never require code changes. Config is type-inferred at compile time with zero runtime overhead.

---

## Decision 1: Renderer -- React Three Fiber + Three.js

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Unity** | Mature ecosystem, strong mobile optimization, better 3D tooling, extensive docs | Heavier footprint, C# verbosity, 2023 trust concerns, not web-native |
| **Godot 4** | Free/MIT, lightweight, human-readable scene files, simple headless CI | Smaller ecosystem, less documentation, mobile export less proven |
| **Custom Web (R3F + Three.js)** | Browser-native delivery, all-text codebase (AI-friendly), free forever, hot reload, standard CI tooling | Must build more from scratch, lower 3D performance ceiling, mobile WebGL quirks |

### Decision

**React Three Fiber + Three.js.** Custom web engine built on the pmndrs (Poimandres) ecosystem.

### Reasoning

The game's delivery model (instant play in browser, no app store) and development model (AI-assisted, rapid iteration) both favor a web stack. The fragmented map system and factory mechanics don't need AAA-tier rendering -- they need fast iteration and reliable cross-platform behavior. R3F's declarative component model maps naturally to ECS-driven rendering, and the entire codebase is TypeScript text that AI tools can read and modify.

The visual upgrade from `meshLambertMaterial` to `MeshStandardMaterial` with procedural PBR textures was critical when the game shifted from top-down to first-person -- ground-level rendering demands real material quality.

---

## Decision 2: ECS -- Koota (migrated from Miniplex)

### Original Decision: Miniplex

The prototype used **Miniplex** -- a lightweight ECS with optional properties on entity objects and reactive query buckets (`.with("a", "b")`). It was simple and worked well for the initial prototype.

### Migration Decision: Koota

| Feature | Miniplex | Koota |
|---------|----------|-------|
| Storage | Sparse component bags (AoS) | SoA for schemas, AoS for complex |
| Components | Optional properties on entity object | `trait()` declarations with defaults |
| Queries | `.with("a", "b")` -- reactive buckets | `world.query(A, B)` with `Not()`, `Or()`, `Added()`, `Changed()` |
| Relations | None -- manual ID strings | First-class `relation()` with auto-destroy, exclusivity |
| React hooks | Basic (miniplex-react) | `useQuery`, `useTrait`, `useTraitEffect`, `useActions` |
| Systems | Manual function calls | `createActions()` -- world-scoped action bundles |
| Change detection | None | Built-in per-trait change tracking |
| World traits | None | `world.add(Trait)` -- singleton/global data |
| Events | None | `onAdd`, `onRemove`, `onChange`, `onQueryAdd`, `onQueryRemove` |

### Why the Migration

As factory systems grew (belts, wires, miners, processors), Miniplex's lack of relations became a serious pain point. Belt chains used `nextBeltId`/`prevBeltId` string references. Wire connections used `fromEntityId`/`toEntityId`. Every system that traversed these graphs had to do manual ID lookups -- error-prone and hard to reason about.

Koota's first-class `relation()` system replaced all of this:
- `NextBelt(entity)` / `PrevBelt(entity)` -- type-safe belt chain traversal
- `ConnectsFrom(entity)` / `ConnectsTo(entity)` -- wire network as a relation graph
- `OutputTo(entity)` / `InputFrom(entity)` -- miner/processor belt connections

Additional wins:
- **Change detection** (`Changed(Power)`) means renderers only update when traits actually change
- **Query modifiers** (`Added(Position)`) for tracking new entities without manual bookkeeping
- **World traits** for global singletons (game time, resource pool, storm state) instead of separate stores
- **Actions** (`createActions()`) replace scattered factory functions with typed, world-scoped spawn/destroy bundles

Both Miniplex and Koota are from the pmndrs ecosystem, so the migration was evolutionary rather than revolutionary.

### Migration Pattern

```typescript
// Miniplex: manual ID strings
interface WireComponent {
  fromEntityId: string;
  toEntityId: string;
}

// Koota: first-class relations
export const ConnectsFrom = relation({ exclusive: true });
export const ConnectsTo = relation({ exclusive: true });

// Miniplex: iterate query
for (const entity of miners) {
  if (!entity.building.powered) continue;
}

// Koota: trait-based query with updateEach
world.query(Miner, Building).updateEach(([miner, building]) => {
  if (!building.powered) return;
});
```

---

## Decision 3: Bundler -- Expo SDK 55 + Metro (migrated from Vite)

### Original Decision: Vite

The prototype used **Vite** -- fast HMR, simple config, excellent TypeScript support. It was the right choice for rapid prototyping.

### Migration Decision: Expo SDK 55 + Metro

### Why the Migration

Vite is web-only. Once the decision was made to support iOS/Android native builds (landscape-locked mobile 4X game), Expo + Metro became the clear path. Key factors:

1. **Single codebase for web + iOS + Android.** Expo SDK 55 with Metro bundles the same TypeScript for all three platforms.
2. **Static JSON imports.** Metro bundles JSON config files at compile time -- zero async loading, zero runtime overhead. Critical for the data-driven config system.
3. **WASM asset handling.** Rapier physics requires WASM. Metro's `assetExts` config handles `.wasm`, `.glb`, and `.hdr` files cleanly.
4. **Proven with R3F.** The grovekeeper reference project demonstrated R3F + Rapier + Tone.js all working under Metro.
5. **expo-sqlite for native persistence.** Web uses IndexedDB; native uses expo-sqlite via Drizzle ORM. Same save/load API, platform-specific backends.

### Metro Configuration

Key Metro config decisions:
- `assetExts` extended for `wasm`, `glb`, `hdr`
- Custom resolver for Tone.js ESM-to-CJS `tslib` resolution
- `unstable_conditionNames: ['react-native', 'browser', 'require', 'default']` to force CJS builds for packages using `import.meta` (zustand v5 fix)
- SharedArrayBuffer support via `coi-serviceworker` and COOP/COEP headers in `app/+html.tsx`

### Expo Project Structure

```
app/                    # Expo Router file-based routing
  _layout.tsx           # Root: WorldProvider, fonts, persistence
  +html.tsx             # Web: SharedArrayBuffer headers
  index.tsx             # Title screen
  game/index.tsx        # Game: Canvas + HUD + controls
app.json                # Expo config (landscape, plugins)
metro.config.js         # Metro bundler config
babel.config.js         # babel-preset-expo
```

---

## Decision 4: Physics -- Rapier (WASM)

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Rapier** (`@dimforge/rapier3d-compat`) | Deterministic, fast WASM, excellent R3F integration via `@react-three/rapier` | Requires SharedArrayBuffer headers, WASM loading |
| **Cannon.js** (`cannon-es`) | Pure JS, no WASM complexity | Slower for many bodies, less deterministic |
| **Ammo.js** (Bullet port) | Battle-tested physics | Large bundle, complex API |

### Decision

**Rapier** via `@react-three/rapier`. Physical cube economy demands a real physics engine -- cubes are 0.5m rigid bodies that stack, topple, get carried, and are visible to enemies. Rapier's determinism and performance handle hundreds of physical cubes.

### Reasoning

The physical cube economy is the game's core innovation. Resources aren't abstract counters -- they're visible rigid body cubes that stack outside your base, can be raided by enemies, and must be physically transported. This requires:
- Rigid body simulation for cube stacking and structural collapse
- Raycasting for contextual interaction (click any object in the world)
- Collision detection for belt transport, grabbing, and dropping
- Deterministic physics for consistent behavior across platforms

---

## Decision 5: AI -- Yuka (GOAP + Steering + NavMesh)

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Yuka** | GOAP planners, Vehicle steering behaviors, NavMesh pathfinding, perception system -- all in one library | Less documented than some alternatives |
| **Custom GOAP** | Full control over planner architecture | Significant engineering effort for steering, navmesh, perception |
| **Behavior trees** (various) | Well-understood pattern | Less flexible than GOAP for strategic AI; no built-in movement |

### Decision

**Yuka** for all AI systems. Three layers:

1. **CivilizationGovernor** (GOAP) -- strategic decisions for AI civilizations. Evaluates goals (expand territory, build military, research tech, raid enemies) based on perception-limited world state.
2. **BotVehicle** (Steering) -- physical bot movement using Vehicle behaviors (seek, flee, arrive, pursuit, wander, follow path). Bots move with velocity and acceleration, not teleportation.
3. **NavMeshBuilder** -- pathfinding over procedural terrain. Bots navigate around buildings, terrain features, and factory infrastructure.

### Reasoning

Syntheteria has 4 AI civilizations competing in a 4X loop. Each needs strategic planning (what to build, where to expand, when to attack) AND tactical execution (bot movement, formation control, combat positioning). Yuka provides both strategic (GOAP) and tactical (steering + navmesh) AI in a single coherent library.

---

## Decision 6: Audio -- Tone.js

### Decision

**Tone.js** for all audio -- spatial audio, procedural SFX, ambient soundscapes, and adaptive music. Web Audio API gives precise timing control. Procedural sound generation means no large audio asset files.

### Reasoning

A machine planet demands industrial audio -- grinding, sparking, clanking, electrical hums. Procedural synthesis generates these sounds parametrically from config, matching the data-driven philosophy. Spatial audio places sounds at their source in 3D space (belt segments, miners, lightning rods), reinforcing the first-person immersion.

---

## Decision 7: View -- First-Person (migrated from Top-Down)

### Original Decision: 2.5D Top-Down

The original design was a top-down strategy game -- an AI consciousness commanding robots from above.

### Migration Decision: First-Person 3D

### Why the Migration

The FPS redesign was driven by five realizations:

1. **Emotional distance.** Top-down makes you a god looking at ants. The "you ARE a broken robot" narrative demands intimacy.
2. **Factory systems need physicality.** Conveyor belts, power wires, mining drills -- these are spatial experiences. Walking alongside a belt, tracing a wire to find a power drop, watching cubes tumble from a drill onto a belt. Top-down flattens all of this into abstract icons.
3. **PBR materials wasted from orbit.** Procedural metallic textures, emissive circuit traces, roughness maps -- these only matter at eye level. From 30 units up, everything is colored rectangles.
4. **Billboard sprites become holograms.** The otter sprites that looked awkward from top-down become perfect as holographic projections in FPS. A billboard that always faces the camera IS how a hologram behaves.
5. **Scale appreciation.** A lightning rod isn't a small icon -- it's a towering steel pylon crackling with energy 20 meters above your head.

---

## Decision 8: Interaction Model -- Contextual (no tool system)

### Decision

**Contextual interaction.** Every object in the world is clickable. Click an object, it highlights with emissive glow, a radial action menu appears with context-sensitive options. No "equipped tool" concept.

### Reasoning

A tool-based system ("select pickaxe, then click ore") adds an indirection layer that slows down play. Contextual interaction ("click ore deposit, choose 'harvest'") is faster and more discoverable. The radial menu adapts to what you're looking at -- ore deposits show harvest/scan options, furnaces show recipes, bots show follow/patrol/repair options.

Implementation: Rapier raycasting from camera through crosshair, hit detection, `ObjectSelectionSystem` + `ObjectActionMenu`.

---

## Decision 9: Config System -- JSON Tunables with Type Inference

### Decision

All game balance values live in JSON files under `config/`. A type-safe loader at `config/index.ts` imports them with `typeof` inference -- no manual type definitions needed. Metro bundles JSON at compile time.

### Config Files

39+ JSON files covering: biomes, buildings, combat, economy, furnace, mining, quests, technology, units, terrain, audio, rendering, power, hacking, civilizations, map presets, and more.

### Reasoning

Game balance iteration requires changing numbers, not code. A designer (or AI agent) should be able to tune extraction rates, recipe costs, combat damage, and belt speeds by editing JSON files. Type inference from `typeof` means TypeScript catches config access errors at compile time without requiring separate type definitions that drift from the actual data.

---

## Decision 10: Testing -- Jest + ts-jest (migrated from Vitest)

### Original Decision: Vitest

Vitest was the natural choice with Vite -- same config, same transform pipeline, fast.

### Migration Decision: Jest + ts-jest

### Why the Migration

When the bundler moved from Vite to Metro, Vitest lost its config-sharing advantage. Jest with ts-jest provides:
- CJS module execution via `tsconfig.test.json` (avoids ESM/Metro conflicts)
- Broader ecosystem support and CI tooling
- `jest.mock()` for ECS query mocking (mock Koota queries as plain arrays)

Current state: 256 test suites, 7,594 tests, all passing.

---

## Decision 11: Persistence -- IndexedDB (web) + expo-sqlite (native)

### Decision

Platform-specific persistence backends behind a unified save/load API:
- **Web:** IndexedDB for save game data
- **Native (iOS/Android):** expo-sqlite via Drizzle ORM

### Reasoning

Web browsers don't have filesystem access. IndexedDB is the most reliable web storage for structured data larger than localStorage limits. On native, expo-sqlite provides a real SQL database that can also store governor decision tables and game analytics. Drizzle ORM provides type-safe queries for both.

Koota has no built-in serialization, so a custom `serializeWorld()` / `deserializeWorld()` handles trait-based entity serialization with a version field for save format migrations.

---

## Migration History

| When | What Changed | Why |
|------|-------------|-----|
| Initial | Vite + Miniplex + top-down view | Fastest path to prototype |
| FPS Redesign | Top-down to first-person | Physical factory systems, emotional intimacy, PBR payoff |
| GDD-002 | Vite to Expo SDK 55 + Metro | Native mobile builds, static JSON imports, WASM handling |
| GDD-002 | Miniplex to Koota ECS | Relations for belt/wire graphs, change detection, world traits |
| GDD-002 | Hardcoded values to JSON config | Data-driven balance, designer-editable tunables |
| GDD-002 | Vitest to Jest + ts-jest | CJS compatibility with Metro, broader ecosystem |
| GDD-002 | Billboard sprites to holographic projections | FPS view makes billboard rotation thematically correct as holograms |
| GDD-002 | Tool-based interaction to contextual | Faster, more discoverable; radial menu adapts to clicked object |

---

## Current Architecture Summary

```
Engine:       React Three Fiber + Three.js
ECS:          Koota (trait-based SoA, relations, change detection)
Physics:      Rapier WASM (@react-three/rapier)
AI:           Yuka (GOAP governors, Vehicle steering, NavMesh)
Audio:        Tone.js (spatial, procedural, adaptive)
Bundler:      Expo SDK 55 + Metro (web + iOS + Android)
Persistence:  IndexedDB (web) + expo-sqlite + Drizzle (native)
Testing:      Jest + ts-jest (7,594 tests)
Config:       39+ JSON files, type-inferred at compile time
CI/CD:        GitHub Actions (lint, typecheck, test, deploy)
```

---

## Open Technical Decisions

| Decision | Options Under Consideration | Status |
|----------|---------------------------|--------|
| Visual art style detail | Low-poly / pixel art / clean minimal / industrial PBR | Leaning industrial PBR, not finalized |
| Multiplayer architecture | Peer-to-peer / authoritative server / post-launch | Deferred -- single-player first |
| Native mobile performance | Acceptable on mid-range phones? Needs profiling | Untested -- web works, iOS/Android not yet built |
| expo-sqlite schema design | Governor decision tables, analytics, save slots | Designed but not implemented |
| Quality tier auto-detection | GPU capability detection for mobile throttling | System exists, not wired to R3F scene |
| InstancedCubeRenderer | Connected to R3F scene? Performance at scale? | Exists (387 lines), not yet wired in |
| Wire MaterialFactory to JSON | Currently some materials hardcoded | Partially done |
