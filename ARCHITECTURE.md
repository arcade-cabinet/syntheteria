# Syntheteria — Technical Architecture

> Consolidated technical reference. For package structure rules see [AGENTS.md](AGENTS.md).
> For game design see [DESIGN.md](DESIGN.md).

---

## Stack

| Layer | Technology |
|-------|------------|
| Bundler | Vite |
| Match Renderer | Phaser 3.90 + enable3d 0.26 (Scene3D) |
| Title Renderer | React Three Fiber |
| UI | React DOM (overlays on Phaser canvas) |
| ECS | Koota |
| Database | Capacitor SQLite (web: jeep-sqlite, native: SQLite) |
| AI | Yuka 0.7.8 (GOAP + FSM + steering) |
| Testing | Vitest (130 files, 2282 tests) |
| Lint | Biome |
| Mobile | Capacitor (Android + iOS) |

---

## Package Structure

See [AGENTS.md](AGENTS.md) for the full package map and mandatory rules. Key points:

- Every `src/` directory is a self-contained package with `index.ts` barrel exports
- Consumers import from the package index, never from internal files
- Logic in `.ts`, presentation in `.tsx`, shaders in `.glsl`
- Systems accept `world: World` param (no singletons)
- Config is data in `src/config/`, not hardcoded

---

## Rendering Architecture

### Phaser Owns the Board (playing phase)

Scene3D (Phaser + enable3d) renders the match board with vertex-colored flat-shaded terrain in CivRev2 style. No PBR textures — vertex colors + flat shading + good lighting delivers the target aesthetic.

**Lighting recipe:**

| Light | Type | Color | Intensity |
|-------|------|-------|-----------|
| Ambient | AmbientLight | `0x223344` | 0.6 |
| Sun | DirectionalLight | `0xaaccff` | 0.8 |
| Accent 1 | PointLight | cyan | varies |
| Accent 2 | PointLight | magenta | varies |

**Fog:** `FogExp2(0x050a0f, 0.012)` — near-black blue, very low density.
**Tone mapping:** NONE — ACESFilmic washes out saturated accent colors.

**Biome colors (8 types):**

| Biome | Color | Character |
|-------|-------|-----------|
| Grassland | `#7cb342` | Open plains, standard traversal |
| Forest | `#2e7d32` | Dense canopy, movement penalty |
| Mountain | `#757575` | Rocky terrain, impassable peaks |
| Water | `#1565c0` | Rivers/lakes, impassable without bridge |
| Desert | `#d4a017` | Arid, low yield |
| Hills | `#8d6e63` | Elevated terrain, defensive bonus |
| Wetland | `#00695c` | Marshy, slow traversal |
| Tundra | `#b0bec5` | Cold, sparse resources |
| Ruins | `#546e7a` | Machine debris, rich salvage |

**Roboforming (5-level progression):**

| Level | Name | Visual |
|-------|------|--------|
| 0 | Natural | Original biome colors |
| 1 | Graded | Desaturated earth tones |
| 2 | Paved | Grey concrete with gridlines |
| 3 | Plated | Steel grey + faction accent |
| 4 | Armored | Dark alloy + glowing faction trim |

Transitions use vertex color interpolation — a tile at level 2.5 blends between Paved and Plated.

**Camera:** Orthographic isometric — drag-pan, scroll-zoom, WASD rotate. No perspective distortion.

**Models:** GLB at 2.5x scale, bob-and-weave procedural animation (Wall-E style). No faction tint on meshes — faction identity via ground disc and UI labels.

### React Owns the UI

React DOM overlays the Phaser canvas for all user interface:

- HUD (resources, turn counter, AP)
- Per-building management modals (Motor Pool, Synthesizer, etc.)
- Command strip / selection inspector
- Settings, pause menu, diplomacy panels
- Toast notifications, tooltips

**Communication:** Phaser ↔ React via EventBus. Both read from Koota ECS world (single source of truth).

```
┌────────────────────────────────────────┐
│  PHASER CANVAS (game board)            │  ← Game loop, camera, input
│  ├─ Terrain (Three.js via enable3d)    │
│  ├─ Units / Buildings / Particles      │
│  └─ Fog of war overlay                 │
├────────────────────────────────────────┤
│  REACT DOM OVERLAY (z-index > canvas)  │  ← HUD, modals, panels
│  ├─ HUD (resources, turn, AP)          │
│  ├─ Command strip / inspector          │
│  ├─ Per-building modals                │
│  └─ Toasts, Tooltips, Alerts          │
└────────────────────────────────────────┘
```

### R3F Owns the Title Globe

`Globe.tsx` renders a persistent R3F `<Canvas>` during title/setup/generating phases:

- Storm sky sphere, hypercane, lightning effects
- Zoom cinematic toward surface on game start
- Speech bubble overlay via Drei `<Html>`
- Signed off — do not replace for landing flow

---

## ECS Patterns (Koota)

### Core Principles

1. **World is a parameter** — every system receives `world: World`
2. **Traits are data containers** — minimal value containers with defaults
3. **Systems are pure functions** — accept world, query, update
4. **Actions centralize mutations** — `createActions()` for spawning/modifying entities
5. **React reads, ECS owns** — components read via hooks, mutations go through actions
6. **One file per system** — named after what it does

### Trait Types

- **Simple value:** `trait({ x: 0, y: 0 })` — primitives shared across instances
- **Factory default:** `trait({ velocity: () => new Vector3() })` — mutable objects get factory functions
- **Marker:** `trait()` — tag components for querying (no data)
- **Relation:** `relation()` — entity-to-entity connections

### Query Patterns

```typescript
world.query(Position, Velocity);                    // Has both
world.query(Position, Not(Dragging));               // Has Position, not Dragging
query.updateEach(([pos, vel]) => { ... });          // Mutable access
query.forEach(([pos, vel], entity) => { ... });     // Read + entity ref
query.useStores(([posStore, velStore], entities) => { ... }); // Direct arrays
```

### Sim/View Split

- `traits/` + `systems/` never import `views/`
- Rendering adapters live under `src/views/` only (`title/` = R3F, `board/` = Phaser)
- Import gates enforce this boundary (`scripts/check-imports.sh`)

### Turn-Based Adaptation

Koota examples are real-time. Syntheteria is turn-based:
- **Render loop** — runs every frame for animations, camera, particles
- **Turn loop** — explicit `advanceTurn(world)` triggered by player action

---

## Building-Driven Progression

Buildings drive all technology advancement — robots don't invent, they recover and optimize.

### Building Upgrade Tiers

Each building has internal tiers (1→3). Upgrading costs resources + turns via the building's management panel.

| Building | Tier 1 | Tier 2 | Tier 3 |
|----------|--------|--------|--------|
| Motor Pool | Scout, Worker, Infantry (Mark I) | +Support, Cavalry, Ranged; Mark II | Specialization tracks; Mark III-V |
| Synthesizer | Basic fusion | Advanced fusion | Efficient synthesis |
| Relay Tower | Basic signal | Extended range + encryption | Deep scan |
| Storm Transmitter | Basic tap (+5 power) | Storm shielding | Storm channeling |
| Defense Turret | Basic (dmg:3) | Enhanced targeting | Area denial |
| Maintenance Bay | Basic repair | Auto-repair aura | Component recovery |

### Building→Building Unlock Chains

| Prerequisite | Unlocks |
|-------------|---------|
| Storm Transmitter Tier 2 | Power Plant |
| Storm Transmitter Tier 3 | Geothermal Tap |
| Motor Pool Tier 2 | Maintenance Bay |
| Synthesizer (any tier) | Resource Refinery |
| Relay Tower Tier 2 | Outpost |
| All buildings Tier 3 + Epoch 4 | Wormhole Stabilizer |

### Analysis Node

Replaces the legacy Research Lab — a passive network accelerator:
- Reduces upgrade times for nearby buildings by 25%
- Multiple nodes stack with diminishing returns
- Strategic placement decision, not a gatekeeper

---

## Resource System

### 17 Materials: Natural → Processed → Synthetic

| Tier | Count | Materials |
|------|-------|-----------|
| Natural | 8 | stone, timber, iron_ore, copper_ore, clay, sand, herbs, fiber |
| Processed | 5 | ferrous_alloy, polymer_sheet, silicon_wafer, conductor_wire, electrolyte |
| Synthetic | 4 | alloy_stock, storm_charge, el_crystal, quantum_substrate |

- **Biomes yield natural resources** — grassland→herbs, mountain→stone/iron_ore, forest→timber
- **Synthesizer converts** natural→processed→synthetic
- **Salvage props** are secondary source (containers, terminals, machinery)
- **Floor mining** is the backstop economy when salvage is scarce

---

## AI Architecture

### Stack

- **Yuka 0.7.8** — GOAP, FSM, steering, pathfinding
- **10 GOAP evaluators** — each returns desirability [0,1]; Think.arbitrate() picks highest
- **5-state FSM** — EXPLORE → EXPAND → FORTIFY → ATTACK ↔ RETREAT
- **Steering behaviors** — flocking (cult swarm), evasion, pursuit, wander
- **NavGraph** — A* pathfinding with elevation awareness
- **FuzzyModule** — situation assessment (resource level, threat proximity, territory)

### Faction Personalities

Each faction has character biases that combine with FSM multipliers:

| Faction | Style |
|---------|-------|
| Reclaimers | Economic — harvest + build focused |
| Volt Collective | Defensive — scout + defend |
| Signal Choir | Expansionist — scout + expand |
| Iron Creed | Aggressive — attack focused |

### Cult AI

Three sects with distinct GOAP behaviors:

| Sect | Style | Special |
|------|-------|---------|
| Static Remnants | Territorial | Defend POIs, tight patrol |
| Null Monks | Ambush | Target isolated units, spread corruption |
| Lost Signal | Berserker | Skip wanderer stage, +1 damage |

Escalation: Wanderer → War Party → Assault (based on turn count and faction strength).
Time-based mutation: tiers 0-3 over 21+ turns, culminating in aberrant mini-bosses.

---

## Config Registry

- `src/config/registry.ts` — `getConfig()`/`setConfigOverride()` typed API
- Override support for balance harness testing and debugging
- 20+ config definition files covering buildings, resources, factions, epochs, combat, etc.
- All config is TypeScript `const` objects — no JSON

---

## Balance Harness

- `src/balance/` — multi-tier runner + aggregator + diagnostics
- Tier 1-4 simulated runs: 10t, 100t, 200t, 1000t
- Auto-detects stagnation, snowball, hoarding, resource deadlock
- AI-vs-AI playtests with statistical aggregation

---

## Persistence

- **Capacitor SQLite (production):** web via jeep-sqlite, Android/iOS via native SQLite
- **sql.js (test only):** in-memory for test isolation
- **SqliteAdapter interface** abstracts both implementations
- **SQLite is non-fatal:** game runs from ECS in memory if DB fails
- **No backend services:** all data stays on the user's device

---

## Speech System

### Pipeline

1. Game systems trigger speech via `speechTriggers.ts` (combat, harvest, discovery)
2. `speechBubbleStore.ts` manages state with cooldown (2 turns) and duration (3 turns)
3. Two independent renderers consume the same store:

| Phase | Renderer | Technology |
|-------|----------|------------|
| Playing (Phaser) | `speechRenderer.ts` | THREE.Sprite with canvas texture |
| Title (R3F) | `SpeechBubbleRenderer.tsx` | Drei `<Html>` with CSS |

Context speech: per-persona lines triggered by game events.
Event speech: faction-specific reactions.

---

## Testing Strategy

### Commands

| Command | Purpose |
|---------|---------|
| `pnpm verify` | Full CI gate: lint + tsc + vitest |
| `pnpm test:vitest` | Vitest unit/integration tests |
| `pnpm lint` | Biome lint + format check |
| `pnpm tsc` | TypeScript type check |
| `pnpm check-imports` | Architectural import gate |
| `pnpm test:ct` | Playwright component tests (optional, may need GPU) |

### Coverage

- 130 test files, 2282 tests across all packages
- Tests colocated in `__tests__/` inside owning packages
- Import gates via `scripts/check-imports.sh` enforce sim/view boundary
- Balance harness provides multi-tier AI-vs-AI regression testing
