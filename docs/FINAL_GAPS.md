# Syntheteria — Final Comprehensive Gaps Report (2026-03-18)

> **Superseded — do not treat P0/P1 items as current.** Historical audit; paths reference old layouts (`src/ecs/`, pre-views split). For **today**: run **`pnpm verify`**, read **`docs/memory-bank/progress.md`**, **`docs/CLOUD_AGENT_RUNBOOK.md`**, **`RENDERING_VISION.md`**. Summary tables below are **frozen in time** and often wrong now.

> Audit of EVERYTHING incomplete, broken, missing, or not matching the vision.
> Organized by priority. Nothing deferred. Nothing hidden.

---

## Audit Summary

*Frozen 2026-03-18. Do not use as live status — run `pnpm verify` today.*

| Check | Result (historical) |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | **0 ERRORS** (fixed: #101) |
| Vitest (`pnpm test:vitest`) | **131 suites, 2239 tests** (superseded — see `memory-bank/progress.md` for current counts) |
| Biome lint (`pnpm lint`) | **0 errors** (fixed: #103) |
| Production build (`pnpm build`) | **SUCCEEDS** — 324MB dist (deploy concern, not code fix — #108) |
| TODO/FIXME/HACK/XXX in source | **0** (fixed: #107 — added attack_miss SFX) |
| Stale "dome" references | **0 stale** — CultDomeRenderer is lore-correct, all others fixed (#106) |
| Dead code | **IsometricCamera deleted** (#105). `pending/` = accepted tech debt (#110). |
| Doc accuracy | Claims in this file are **not maintained** — use runbook + memory bank |

---

## P0 CRITICAL — Build/Test Failures

### 1. TypeScript errors in elevationMovement test (4 errors)

**File:** `src/ecs/__tests__/elevationMovement.vitest.ts` lines 46, 52, 59, 66

**Problem:** Test calls `movementCost(to, "medium", from)` where `from` is a `TileData` object, but `movementCost()` signature expects `sourceElevation?: number` as the 3rd parameter.

**Fix:** Change `from` to `from.elevation` in all 4 calls.

### 2. Test failures in labyrinthPlatforms (2 failures)

**File:** `src/board/__tests__/labyrinthPlatforms.vitest.ts` line 163

**Problem:** Test asserts that tiles with `elevation === 1` must be `passable === true` and not `structural_mass`. The assertion fails, meaning the labyrinth generator is placing platforms on impassable tiles. Either `applyMultiLevelPlatforms()` has a bug, or a later generation phase overwrites tile passability after platforms are placed.

**Fix:** Check phase ordering in `labyrinthGenerator.ts` — `applyMultiLevelPlatforms` runs at line 96 but subsequent phases may overwrite tile properties. Either fix the phase ordering or fix the platform generator to re-check after all phases complete.

### 3. Biome lint: 383 errors

**Problem:** Mostly auto-fixable: import ordering (`organizeImports`) and formatting (indentation). 1 actual code issue: unused function `aiUnit_didNotMoveToward` in `src/ai/__tests__/yukaAiTurnSystem.vitest.ts:390`.

**Fix:** Run `npx biome check --apply .` then prefix unused function with underscore.

---

## P1 HIGH — Missing Functionality

### 4. Keyboard shortcuts Tab/Enter/Z are shown but NOT implemented

**File:** `src/ui/game/KeybindHints.tsx` (UI hints), `src/main.tsx` (handlers)

**Problem:** KeybindHints shows:
- `Tab` = Cycle units -- **NOT IMPLEMENTED** (no handler listens for Tab)
- `Enter` = Advance -- **NOT IMPLEMENTED** (no handler listens for Enter)
- `Z` = Zoom -- **NOT IMPLEMENTED** (no handler listens for Z)

Only `Escape` (pause) and `WASD` (camera orbit) actually work.

**Fix:** Add keydown handler in `main.tsx` that:
- `Tab` — cycles `selectedUnitId` through player units
- `Enter` — calls `handleEndTurn()`
- `Z` — toggles zoom level or triggers a zoom action

### 5. Movement system does not handle elevation changes (ramps)

**Files:** `src/ecs/systems/movementSystem.ts`, `src/board/adjacency.ts`

**Problem:** Tasks #96, #97, #98 are still `in_progress`. The `movementCost()` function was updated to accept a `sourceElevation` parameter, but the movement system may not be passing elevation data during pathfinding. Units can still move between elevation layers but the cost isn't applied.

**Fix:** Verify that `reachable()` in `adjacency.ts` and movement system in `movementSystem.ts` correctly pass source tile elevation to `movementCost()`.

### 6. 3D pathfinding through depth layers incomplete

**Task:** #82 `ARCH-4` is `in_progress`.

**Problem:** Ramp traversal between sphere surface levels. The labyrinth platform generator creates elevated areas but the A* pathfinding may not properly handle elevation transitions.

---

## P2 MEDIUM — Dead Code / Documentation

### 7. IsometricCamera is dead code

**Files:** `src/camera/IsometricCamera.tsx`, `src/camera/index.ts`, `src/camera/__tests__/camera.vitest.ts`

**Problem:** `IsometricCamera` is exported from `src/camera/index.ts` but never imported by any runtime `.tsx` component. `Globe.tsx` exclusively uses `SphereOrbitCamera`. The file references stale concepts (GHOST=40 tiles, flat board pan mode).

**Fix:** Delete `IsometricCamera.tsx`, remove from `index.ts` export, update or remove its test file.

### 8. Doc test counts are stale

**Files:** `AGENTS.md:116`, `docs/memory-bank/activeContext.md:9`, `docs/memory-bank/progress.md:19`

| Doc Claims | Reality |
|------------|---------|
| 126 suites, 2239 tests, 0 failing | 130 suites, 2245 tests, 2 failing |
| 0 TypeScript errors | 4 TypeScript errors |

**Fix:** Update all three docs after fixing the TS errors and test failures.

### 9. Stale "dome" references in comments

| Location | Text | Action |
|----------|------|--------|
| `src/ecs/terrain/__tests__/floorShader.vitest.ts:95` | "Under the dome" | Change to "Under the storm" |
| `src/rendering/BoardRenderer.tsx:12` | "hills dome up" | Benign geometry term, not lore dome — low priority |
| `src/ecs/terrain/glsl/common.glsl:35` | Was "dome overhead" | Already fixed to "storm overhead" |

CultDomeRenderer.tsx references are **CORRECT** — cult POI energy shields ARE domes per GAME_DESIGN.md.

### 10. TODO in attackSystem.ts

**File:** `src/ecs/systems/attackSystem.ts:134`

**Content:** `playSfx("attack_hit"); // TODO: add miss sfx`

**Analysis:** The combat system uses `damage = attack - defense (min 1)`, so there are never true "misses." Either add a glancing-blow SFX for low-damage hits or remove the TODO since the game has no miss mechanic.

---

## P3 LOW — Performance / Polish

### 11. Production bundle is 324MB

**Problem:** `dist/` is 324MB after build. 145MB is GLB models copied from `public/assets/models/`. JS chunks:
- `index-BaW4w1Jl.js` = 1.85MB (Three.js + R3F + game code)
- `sql-asm-Cv-8_0d8.js` = 1.3MB (sql.js WebAssembly)

Vite warns about chunks > 500KB.

**Additionally:** `sfx.ts` is both dynamically imported (by `audioEngine.ts`) AND statically imported (by 16 other files), defeating code splitting. Vite warns about this conflict.

**Fix options:**
1. Code-split sql.js as true dynamic import
2. Lazy-load Three.js/R3F
3. Use CDN for GLB models in deployment rather than bundling
4. Resolve sfx.ts static/dynamic import conflict

### 12. pending/ directory is 252MB in working tree

**Problem:** `pending/` is excluded from tsconfig and biome but still physically present. It contains the old game code that is permanently quarantined.

**Fix:** Either remove from working tree (keep in git history) or add to `.gitignore`.

### 13. PauseMenu.tsx comment says "Save Game"

**File:** `src/ui/game/PauseMenu.tsx:4`

**Problem:** JSDoc comment says "Save Game" but the actual UI label correctly reads "Persistence Sync." Cosmetic inconsistency in a comment.

---

## What's Working Well (Verified)

These areas were checked and confirmed functional:

- **Globe.tsx** — ONE persistent Canvas across all phases (title/setup/generating/playing)
- **Phase state machine** — title -> setup -> generating -> playing transitions work
- **Cinematic transition** — globe growth animation with storm effects, camera zoom to surface
- **Sphere world** — `buildSphereGeometry()`, `tileToSpherePos()`, `spherePosToTile()`
- **SphereOrbitCamera** — orbit around sphere center, WASD rotates, scroll zooms
- **Sphere model placement** — units/buildings/salvage tangent to sphere surface
- **Overlay modals** — Research, Roster, Diplomacy; **production** moving to **settlement/city screen** (legacy `GarageModal` may still exist)
- **HUD** — CYCLE counter, resources, victory progress, AP, ADVANCE button, SYNC button
- **Command UI** — legacy radial still wired (`BoardInput.tsx`); **target:** Civ VI–style strip/inspector (`GAME_DESIGN.md` §9)
- **Observer mode** — AI-vs-AI auto-play with speed control
- **Save/Load** — SQLite persistence, auto-save every 3 turns, manual save via SYNC
- **40+ ECS systems** — all properly wired with `world` param in turnSystem.ts
- **AI GOAP** — Yuka-based with faction personalities, fuzzy logic, NavGraph A*
- **pickAITrack wired** — AI uses track preferences when fabricating (fixed from HONEST_REVIEW findings)
- **`GarageModal.tsx`** — interim fabrication UI; **design target:** production queue + priorities inside **city modal** (`GAME_DESIGN.md` §5)
- **Cult domes** — CultDomeRenderer renders translucent hemispheres at POIs (lore-correct)
- **Floating illuminators** — IlluminatorRenderer provides light in storm darkness
- **Storm effects** — StormClouds, Hypercane, LightningEffect persistent across all phases
- **InfrastructureRenderer** — 48 infrastructure models now placed
- **360 GLB models** in public/assets/models/
- **Diegetic vocabulary** — CYCLE, SYNC, ADVANCE, Persistence Sync, Calibration used correctly
- **Toast/Alert/Tutorial systems** — all wired and rendering
- **Turn summary** — TurnSummaryPanel wired in main.tsx
- **Combat effects** — CombatEffectsRenderer for floating damage text
- **Path renderer** — PathRenderer shows A* path preview on hover
- **Territory overlay** — TerritoryOverlayRenderer with faction colors
- **Particle system** — ParticleRenderer with effect events
- **Unit status bars** — HP/AP bars above units
- **Speech bubbles** — SpeechBubbleRenderer in-world
- **Audio** — Tone.js synth pool, ambient storm loop, SFX on actions
- **7 victory conditions** — victorySystem.ts with all 7 paths

---

## What Was Fixed Since HONEST_REVIEW.md

| Issue from HONEST_REVIEW | Status |
|--------------------------|--------|
| GarageModal.tsx doesn't exist | **FIXED** — file now exists, wired in main.tsx |
| pickAITrack dead code | **FIXED** — wired into yukaAiTurnSystem.ts |
| Power grid dead at game start | **FIXED** — task #11 completed |
| Stale test counts | **PARTIALLY FIXED** — counts updated but now stale again |
| Terrain uniformly beige | **FIXED** — task #16 completed, PBR atlas distinct |
| GameScreen.tsx dead code | **FIXED** — task #39 completed, Globe.tsx is primary |
| Board overwhelmingly dark | **FIXED** — fog redesigned as storm haze, not black tiles |
| Faction colors inconsistent | **FIXED** — task completed, single source |

---

## Issues from Design Docs Not Yet Addressed

### From SPHERICAL_WORLD_SPEC.md
- Delete flat board code (GHOST, CURVE_STRENGTH) — **IsometricCamera still has GHOST reference but file is dead code**
- Everything else implemented: sphere geometry, orbit camera, model placement, raycasting, fog on sphere

### From PAPER_PLAYTEST_3D_SPHERE.md
- Wall visibility / cut-away — **CutawayClipPlane.tsx exists (WIP)**
- Mini-globe in corner — **Minimap.tsx exists but is 2D; globe IS minimap at zoom-out**
- Line of sight for ranged — **Task #44 completed**
- Building preview ghost — **Not verified (build placement uses command UI path)**
- Power conduit visualization — **Not implemented (no visible connections between buildings)**
- Idle animations — **Task #53 completed (procedural bounce/wiggle)**

### From FULL_3D_SPHERE_BRAINSTORM.md
- LOD system — **Task #6 completed (LodGlobe.tsx)**
- Strategic zoom — **Task #49 completed**
- InfrastructureRenderer — **Task #52 completed**
- Robot animations — **Task #53 completed (procedural, no Blender)**

---

## Complete Fix Priority List

| # | Priority | Issue | Task ID | Status |
|---|----------|-------|---------|--------|
| 1 | P0 | TS errors: elevationMovement test passes TileData instead of number | #101 | FIXED |
| 2 | P0 | Test failure: labyrinthPlatforms elevated tiles on walls | #102 | FIXED |
| 3 | P0 | Biome lint: 383 errors (auto-fixable) | #103 | FIXED |
| 4 | P1 | Keyboard shortcuts Tab/Enter/Z not implemented | #104 | FIXED |
| 5 | P1 | Movement system elevation/ramp handling incomplete | #98 | FIXED |
| 6 | P1 | 3D pathfinding through depth layers incomplete | #82 | FIXED |
| 7 | P2 | Delete IsometricCamera dead code | #105 | FIXED |
| 8 | P2 | Update stale doc test counts | #109 | FIXED |
| 9 | P2 | Fix stale "dome" comment in test | #106 | FIXED |
| 10 | P2 | TODO in attackSystem.ts (miss SFX) | #107 | FIXED |
| 11 | P3 | Production bundle 324MB | #108 | ACCEPTED (deploy concern) |
| 12 | P3 | pending/ directory 252MB in working tree | #110 | ACCEPTED (tech debt) |
| 13 | P3 | PauseMenu comment says "Save Game" | — | COSMETIC |

---

## Verification Commands

```bash
# After fixes, all of these must pass:
npx tsc --noEmit           # 0 errors
pnpm test:vitest           # 0 failures
pnpm lint                  # 0 errors
pnpm build                 # succeeds (bundle size warning is acceptable)
```
