> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Phase 0: Foundation — Koota Port + Asset Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the original 27-file Miniplex RTS game to Koota ECS, bring in all GLB/audio assets from the feature branch, fix lint errors, and verify the game compiles with the new architecture — ready for Phase 1 (labyrinth + rendering).

**Architecture:** Replace Miniplex with Koota ECS. The original game uses a monolithic `Entity` interface with optional fields — each optional section becomes a Koota trait. All 12 systems, 5 renderers, and 2 input handlers get updated to use Koota's `world.query(Trait1, Trait2)` pattern instead of Miniplex's `world.with("field")`. Assets (9 robot GLBs, 25 building GLBs, audio files) are copied from the feature branch via `git show`.

**Tech Stack:** Koota ECS, React 19, R3F 9.5, Three.js 0.183, Vite 8, Biome 2.4, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

---

### Task 0.1: Fix Biome Lint Errors

**Files:**
- Modify: All 27 files in `src/` (formatting + unused vars)

- [ ] **Step 1: Run Biome auto-fix**

```bash
pnpm biome check --write --unsafe src/
```

- [ ] **Step 2: Check remaining errors**

```bash
pnpm lint 2>&1 | grep "Found"
```

Expected: some errors remain (real code issues, not formatting)

- [ ] **Step 3: Fix remaining lint errors manually**

Read each error, fix the actual code issue. Do NOT add `// biome-ignore` unless truly necessary. Common fixes:
- Unused variables: prefix with `_` or remove
- Missing return types: add explicit types
- `any` types: replace with proper types

- [ ] **Step 4: Verify clean lint**

```bash
pnpm lint
```

Expected: 0 errors (warnings OK)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve all Biome lint errors in original game code"
```

---

### Task 0.2: Install Koota + Remove Miniplex

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Koota, remove Miniplex**

```bash
pnpm add koota
pnpm remove miniplex
```

- [ ] **Step 2: Verify package.json**

```bash
grep -E "koota|miniplex" package.json
```

Expected: koota present, miniplex absent

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace miniplex with koota"
```

---

### Task 0.3: Create Koota Traits from Entity Interface

**Files:**
- Create: `src/ecs/traits.ts`
- Read: `src/ecs/types.ts` (the original `Entity` interface)
- Reference: Feature branch `src/traits/unit.ts` for Koota pattern

The original `Entity` interface has these optional sections that become Koota traits:
- `worldPosition` → `Position` trait
- `mapFragment` → `Fragment` trait
- `unit` → `Unit` trait (type, displayName, speed, selected)
- `unit.components` → `Components` trait (the component damage array)
- `navigation` → `Navigation` trait
- `building` → `Building` trait
- `lightningRod` → `LightningRod` trait
- `faction` (required string) → `Faction` trait
- `id` (required string) → use Koota's built-in `.id()`

- [ ] **Step 1: Create traits file**

```typescript
// src/ecs/traits.ts
import { trait } from "koota";

// --- Position (continuous 3D, not grid) ---
export const Position = trait({
  x: 0,
  y: 0,
  z: 0,
});

// --- Faction identity ---
export const Faction = trait({
  faction: "player" as "player" | "cultist" | "rogue" | "feral",
});

// --- Map fragment (fog-of-war grouping) ---
export const Fragment = trait({
  fragmentId: "",
});

// --- Unit component damage system ---
// Each component is { name, functional, material }
// Stored as a serialized array since Koota traits are flat
export const UnitComponents = trait({
  /** JSON-serialized UnitComponent[] — the signature mechanic */
  componentsJson: "[]",
});

// --- Mobile unit ---
export const Unit = trait({
  unitType: "maintenance_bot" as "maintenance_bot" | "utility_drone" | "fabrication_unit",
  displayName: "",
  speed: 2.0,
  selected: false,
});

// --- Navigation ---
export const Navigation = trait({
  /** JSON-serialized Vec3[] path */
  pathJson: "[]",
  pathIndex: 0,
  moving: false,
});

// --- Building ---
export const BuildingTrait = trait({
  buildingType: "",
  powered: false,
  operational: false,
  selected: false,
});

// --- Lightning rod ---
export const LightningRod = trait({
  rodCapacity: 100,
  currentOutput: 0,
  protectionRadius: 10,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc
```

- [ ] **Step 3: Commit**

```bash
git add src/ecs/traits.ts
git commit -m "feat: define Koota traits from original Entity interface"
```

---

### Task 0.4: Create Koota World + Query Helpers

**Files:**
- Rewrite: `src/ecs/world.ts`
- Modify: `src/ecs/types.ts` (keep helper functions, remove Entity interface)

- [ ] **Step 1: Rewrite world.ts for Koota**

```typescript
// src/ecs/world.ts
import { createWorld } from "koota";

export const world = createWorld();
```

- [ ] **Step 2: Update types.ts — keep helpers, drop Entity interface**

Keep `Vec3`, `UnitComponent`, `hasCamera`, `hasArms`, `hasFunctionalComponent`, `getBrokenComponents`, `getFunctionalComponents`. Remove the `Entity`, `UnitEntity`, `BuildingEntity`, `LightningRodEntity` interfaces (replaced by Koota trait composition).

- [ ] **Step 3: Verify TypeScript compiles** (will have errors in consumers — that's expected)

```bash
pnpm tsc 2>&1 | wc -l
```

Note the error count — we'll fix these file by file.

- [ ] **Step 4: Commit**

```bash
git add src/ecs/world.ts src/ecs/types.ts
git commit -m "feat: Koota world + keep component helper functions"
```

---

### Task 0.5: Port Factory (Entity Spawning)

**Files:**
- Rewrite: `src/ecs/factory.ts`
- Read: Original `factory.ts` for spawn logic

The original `factory.ts` has `spawnUnit()`, `spawnFabricationUnit()`, `spawnLightningRod()`. Port each to use `world.spawn(Trait1({}), Trait2({}), ...)`.

- [ ] **Step 1: Read original factory.ts completely**

- [ ] **Step 2: Rewrite with Koota spawn pattern**

Each `world.add({...})` becomes `world.spawn(Position({x, y, z}), Faction({faction}), Unit({...}), UnitComponents({...}), Fragment({...}))`.

- [ ] **Step 3: Verify TypeScript compiles for factory.ts**

- [ ] **Step 4: Commit**

```bash
git add src/ecs/factory.ts
git commit -m "feat: port entity factory to Koota spawn pattern"
```

---

### Task 0.6: Port All 12 Systems to Koota Queries

**Files:**
- Modify: All 12 files in `src/systems/`

Each system currently does `units.entities.forEach(...)` or `world.with("field")`. Change to `world.query(Position, Unit, Faction)` pattern.

Port in this order (simplest → most complex):

1. `movement.ts` — `movingUnits` query → `world.query(Position, Navigation, Unit)`
2. `combat.ts` — uses `units` query + component damage
3. `enemies.ts` — spawns cultists, uses faction filter
4. `exploration.ts` — fog reveal, fragment merge
5. `fragmentMerge.ts` — fragment connectivity
6. `resources.ts` — scavenging logic
7. `fabrication.ts` — component manufacturing
8. `power.ts` — lightning rod power grid
9. `repair.ts` — unit repair at fab units
10. `buildingPlacement.ts` — ghost preview
11. `navmesh.ts` — nav mesh from terrain
12. `pathfinding.ts` — A* on navmesh

- [ ] **Step 1: Port movement.ts**

Replace `movingUnits.entities` with `world.query(Position, Navigation, Unit)`. Update entity field access from `e.worldPosition` to `e.get(Position)`.

- [ ] **Step 2: Port combat.ts**

Replace `units.entities` with `world.query(Position, Unit, UnitComponents, Faction)`. Component damage reads/writes via `e.get(UnitComponents)` / `e.set(UnitComponents, {...})`.

- [ ] **Step 3-12: Port remaining systems** (same pattern)

For each: read the original, identify which Miniplex queries it uses, replace with Koota equivalents.

- [ ] **Step 13: Verify all systems compile**

```bash
pnpm tsc
```

- [ ] **Step 14: Commit**

```bash
git add src/systems/
git commit -m "feat: port all 12 game systems from Miniplex to Koota"
```

---

### Task 0.7: Port gameState.ts (Game Loop)

**Files:**
- Rewrite: `src/ecs/gameState.ts`

The original uses `useSyncExternalStore` to bridge Miniplex to React. Port to Koota's world as the store, keeping the real-time tick orchestrator (speed controls, pause, system execution order).

- [ ] **Step 1: Read original gameState.ts completely**

- [ ] **Step 2: Rewrite tick loop for Koota**

The tick function calls systems in order. Replace Miniplex entity access with Koota world queries. Keep speed multiplier, pause state, and `useSyncExternalStore` bridge.

- [ ] **Step 3: Verify compiles**

- [ ] **Step 4: Commit**

```bash
git add src/ecs/gameState.ts
git commit -m "feat: port game loop to Koota — real-time tick orchestrator"
```

---

### Task 0.8: Port terrain.ts + cityLayout.ts

**Files:**
- Modify: `src/ecs/terrain.ts`
- Modify: `src/ecs/cityLayout.ts`

These generate the world data. They may reference entity types — update any Miniplex references to Koota.

- [ ] **Step 1: Port terrain.ts**

Update any `world.add()` calls to `world.spawn()`. Update entity type references.

- [ ] **Step 2: Port cityLayout.ts**

Same pattern. The labyrinth generator will be REPLACED in Phase 1 with the improved version from `aeef1650^`, but for now port what's here so the game compiles.

- [ ] **Step 3: Commit**

```bash
git add src/ecs/terrain.ts src/ecs/cityLayout.ts
git commit -m "feat: port terrain + city layout to Koota"
```

---

### Task 0.9: Port Renderers (5 files)

**Files:**
- Modify: `src/rendering/TerrainRenderer.tsx`
- Modify: `src/rendering/CityRenderer.tsx`
- Modify: `src/rendering/UnitRenderer.tsx`
- Modify: `src/rendering/StormSky.tsx`
- Modify: `src/rendering/LandscapeProps.tsx`

Each renderer reads from the ECS. Change Miniplex `useEntities(query)` / `query.entities` to Koota world queries.

- [ ] **Step 1: Port each renderer**

For R3F components that use Miniplex hooks, switch to reading from Koota's world directly (or via `useSyncExternalStore` wrapper from gameState).

- [ ] **Step 2: Verify compiles**

- [ ] **Step 3: Commit**

```bash
git add src/rendering/
git commit -m "feat: port all 5 renderers from Miniplex to Koota"
```

---

### Task 0.10: Port Input Handlers + UI + App.tsx

**Files:**
- Modify: `src/input/TopDownCamera.tsx`
- Modify: `src/input/UnitInput.tsx`
- Modify: `src/ui/GameUI.tsx`
- Modify: `src/ui/TitleScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Port input handlers**

Update entity selection, movement commands to use Koota world.

- [ ] **Step 2: Port UI components**

Update HUD to read from Koota.

- [ ] **Step 3: Port App.tsx**

Update world initialization, phase management.

- [ ] **Step 4: Full TypeScript verification**

```bash
pnpm tsc
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: complete Koota port — all 27 files ported from Miniplex"
```

---

### Task 0.11: Copy Assets from Feature Branch

**Files:**
- Create: `public/assets/models/robots/factions/*.glb` (6 files)
- Create: `public/assets/models/robots/cult/*.glb` (3 files)
- Create: `public/assets/models/buildings/*.glb` (25 files)

- [ ] **Step 1: Extract robot GLBs from feature branch**

```bash
mkdir -p public/assets/models/robots/factions public/assets/models/robots/cult public/assets/models/buildings

# Player robots (6)
for f in Arachnoid Companion-bot FieldFighter MobileStorageBot QuadrupedTank ReconBot; do
  git show cursor/cloud-agent-runbook-review-0483:public/assets/models/robots/factions/${f}.glb > public/assets/models/robots/factions/${f}.glb
done

# Cult mechs (3)
for f in Mecha01 MechaGolem MechaTrooper; do
  git show cursor/cloud-agent-runbook-review-0483:public/assets/models/robots/cult/${f}.glb > public/assets/models/robots/cult/${f}.glb
done
```

- [ ] **Step 2: Extract building GLBs from feature branch**

```bash
# All 25 buildings
for f in $(git ls-tree --name-only cursor/cloud-agent-runbook-review-0483 public/assets/models/buildings/ | sed 's|public/assets/models/buildings/||'); do
  git show "cursor/cloud-agent-runbook-review-0483:public/assets/models/buildings/${f}" > "public/assets/models/buildings/${f}"
done
```

- [ ] **Step 3: Extract audio system from feature branch**

```bash
mkdir -p src/audio
for f in audioEngine.ts sfx.ts music.ts ambience.ts index.ts; do
  git show cursor/cloud-agent-runbook-review-0483:src/audio/${f} > src/audio/${f}
done
```

- [ ] **Step 4: Verify assets exist**

```bash
ls public/assets/models/robots/factions/ | wc -l  # expect 6
ls public/assets/models/robots/cult/ | wc -l       # expect 3
ls public/assets/models/buildings/ | wc -l          # expect 25
ls src/audio/ | wc -l                               # expect 5
```

- [ ] **Step 5: Commit**

```bash
git add public/assets/ src/audio/
git commit -m "feat: bring in GLB models (9 robots, 25 buildings) + audio system from feature branch"
```

---

### Task 0.12: Full Verification

- [ ] **Step 1: TypeScript clean**

```bash
pnpm tsc
```

Expected: 0 errors

- [ ] **Step 2: Biome clean**

```bash
pnpm lint
```

Expected: 0 errors

- [ ] **Step 3: Vite build**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 0 complete — Koota port + assets, ready for Phase 1"
```

---

## Phase 0 Completion Criteria

- [ ] All 27 original game files ported from Miniplex to Koota
- [ ] 0 TypeScript errors
- [ ] 0 Biome lint errors
- [ ] Koota traits defined for all entity component types
- [ ] Component damage helpers preserved (hasCamera, hasArms, etc.)
- [ ] Fragment merge helpers preserved
- [ ] 9 robot GLBs in `public/assets/models/robots/`
- [ ] 25 building GLBs in `public/assets/models/buildings/`
- [ ] Audio system files in `src/audio/`
- [ ] Production build succeeds
- [ ] Game may not RENDER correctly yet (that's Phase 1) but it COMPILES
