# Syntheteria — Comprehensive Engineering & Alignment Plan

> **Purpose:** Leave nothing to surprise later. Covers macro (product), meso (architecture), micro (files, constants, tests), reference repos, Koota parity, Phaser/Three, CivRev2 presentation, robots/assets, and verification gates.
>
> **For cloud / long-running agents:** start with [CLOUD_AGENT_RUNBOOK.md](CLOUD_AGENT_RUNBOOK.md) (phased backlog, git squash flow, POC links, full doc index).
>
> **Companion docs:** [GAME_DESIGN.md](GAME_DESIGN.md), [RENDERING_VISION.md](RENDERING_VISION.md), [PHASER_PIVOT_PLAN.md](PHASER_PIVOT_PLAN.md), [PHASER_VS_REACT_MATRIX.md](PHASER_VS_REACT_MATRIX.md), [KOOTA_PATTERNS.md](KOOTA_PATTERNS.md), [memory-bank/progress.md](memory-bank/progress.md), [reference-codebases.md](reference-codebases.md).

---

## 0. Non-negotiable: one `views/` package (no `view/`)

> **STATUS: DONE** — `src/view/` deleted, `src/views/title/` + `src/views/board/` created.

**Problem:** `src/view/` (R3F) and `src/views/` (Phaser) is confusing, error-prone, and violates “one obvious place” for rendering code.

**Target layout (canonical):**

```
src/views/
├── index.ts              # Public barrel — consumers import from "../views" only
├── title/                # R3F — title + generating globe ONLY (all TSX currently under view/)
│   ├── globe/
│   ├── renderers/        # LodGlobe, StormSky, … used only by title flow
│   ├── overlays/
│   ├── effects/
│   ├── ModelErrorBoundary.tsx
│   ├── UnitStatusBars.tsx   # if still needed for generating; else delete
│   └── index.ts
├── board/                # Phaser + enable3d — match / playing phase ONLY
│   ├── createGame.ts
│   ├── eventBus.ts
│   ├── scenes/
│   ├── renderers/
│   ├── lighting/
│   ├── input/
│   ├── labels/
│   ├── __tests__/
│   └── index.ts
└── README.md             # This split + import rules
```

**Rules:**

- **Never** have a top-level `src/view/` after migration.
- **`rendering/`** is **temporary** — see **§8**; it must be **deleted** after decomposition (no long-lived “grab bag” package).
- **`ui/`** stays React DOM (HUD, modals, `Globe.tsx` composes from `views/title`).
- **Imports:** `from "../views/title"` or `from "../views/board"` via barrel only (no deep paths across package boundaries).

**Migration sequence (execution checklist):**

1. Create `views/title/` and `views/board/`; move files; fix `tsconfig` paths if any.
2. Update `Globe.tsx` → `from "../views/title"` (or `views` barrel).
3. Update `GameBoard.tsx` → `from "../views/board"`.
4. Global replace `from "../view"` / `from "../../view"` → title barrel.
5. Delete empty `src/view/`.
6. `pnpm verify` + grep CI gate: `rg "from ['\"].*\\/view['\"]" src` must be empty (except changelog).

---

## 1. Reference codebases — clone, pin, review

Clone **outside** the game repo (or into a gitignored `reference/` folder) so you can grep upstream examples without bloating the main tree.

| Repository | Why | What to audit |
|------------|-----|----------------|
| **Koota** (`pmndrs/koota`) | ECS + official examples | `examples/boids` (pure `view/` + `sim/`), `n-body`, `react-120`, `revade` — schedule, `sim` never imports `view`, actions pattern |
| **Phaser 3** (`phaserjs/phaser`) | Game loop, scenes, scale mode | `src/scene`, scale/resize, input, WebGL loss |
| **three.js** (`mrdoob/three.js`) | Materials, lights, fog, tone mapping | docs/examples matching our stack (no tone map where we use vertex colors) |
| **enable3d** (package source / examples) | Phaser↔Three bridge | Scene3D lifecycle, `warpSpeed`, renderer defaults |
| **Civilization Revolution 2** (video + captures) | Art direction | See [Grok-Civilization_Revolution_2_Visual_Recreation.md](Grok-Civilization_Revolution_2_Visual_Recreation.md) — treat as visual spec, not code |

**Suggested host paths (pick one):**

- `~/src/reference-codebases/koota` (already common on your machine)
- `~/src/reference-codebases/phaser`
- `~/src/reference-codebases/three.js`

**Pin versions** to match `package.json` (Phaser 3.90.x, Three version pulled by enable3d).

---

## 2. Koota — gap analysis vs Syntheteria

| Koota example pattern | Location in Koota | Syntheteria target | Gap / action |
|----------------------|-------------------|-------------------|--------------|
| `sim/` never imports `view/` | boids, n-body | `systems/`, `traits/`, `board/` never import `views/*` | CI: forbid `traits`/`systems` → `views` |
| View sync systems | `view/systems/syncThreeObjects.ts` | `views/board/*` read ECS each frame / on event | Ensure no duplicated “source of truth” in Phaser scene state |
| `schedule` ordering | `sim/systems/schedule.ts` | Turn is discrete; Phaser `update` only animates | Document: sim advance in React/systems; view interpolates |
| `actions.ts` imperative API | boids `sim/actions.ts` | Command UI + build + move dispatch | Optional consolidation — low priority if working |
| React example `view/` | react-120 | `views/title/*` TSX | Align naming: we use `title` not generic `view` |
| Frameloop separation | revade `frameloop.ts` | `WorldScene.update` vs `advanceTurn` | Explicit doc: no turn logic inside Phaser `update` |

**Fine-tooth checks:**

- [ ] Every `world.query` in `views/board` is read-only (mutations only via systems/actions).
- [ ] No `World` singleton in view code — session passes `world` into `createGame` config.
- [ ] `world.destroy()` in tests still matches Koota limits (16 worlds / process).

---

## 3. Phaser + enable3d + Three — technical checklist

**Macro**

- [ ] Single WebGL context handoff: title R3F unmount → one-frame delay → Phaser mount (document why in code comment).
- [ ] `Scale.RESIZE` + DPR: no blur on retina; document canvas CSS size vs internal resolution.

**Meso**

- [ ] `Scene3D` + `accessThirdDimension({ usePhysics: false })` — confirm still correct after Three minor bumps.
- [ ] Lighting matches [RENDERING_VISION.md](RENDERING_VISION.md) and `poc-roboforming.html` (ambient, directional, accents, FogExp2, **no** tone mapping for vertex-color look).
- [ ] Shadow map type: avoid deprecated defaults; match POC.

**Micro**

- [ ] `tileToWorld` / `TILE_SIZE` consistent with `board/grid` and DB serialization.
- [ ] GLB loader error paths: missing model must log + fallback mesh (no silent black hole).
- [ ] Dispose geometries/materials on scene shutdown (memory leaks on restart / HMR).

---

## 4. CivRev2 alignment — viewport, readability, board UX

Use **your** [Grok-Civilization_Revolution_2_Visual_Recreation.md](Grok-Civilization_Revolution_2_Visual_Recreation.md) plus fresh screenshot capture from hardware or emulated CivRev2.

**Command / information layout** is **not** CivRev2-first: see [GAME_DESIGN.md](GAME_DESIGN.md) §9 — **Civilization VI (especially mobile)** for dense, legible panels and action strips; radial menu is deprecated.

| Area | CivRev2 expectation | Syntheteria verification |
|------|---------------------|---------------------------|
| **Viewport fill** | Board uses safe area; no letterboxing “dead” zones incorrectly | Playwright: full-window screenshot; assert canvas bounding box ~ viewport minus HUD chrome |
| **Isometric readability** | Units readable at default zoom; silhouettes + team color on base/disc | Manual + screenshot diff vs reference board |
| **Terrain** | Chunky, saturated biomes; clear passable vs blocked | Compare to `poc-roboforming.html` — non-negotiable bar |
| **Forest / water** | Forest reads as mass; water reads as layer | Already in RENDERING_VISION gaps — visual regression |
| **Fog / unrevealed** | Unexplored clearly darker; no “everything black” | Tune fog + unexplored color; test with seeded board |
| **UI** | HUD does not obscure tile under cursor | z-index matrix — re-verify after command-strip / inspector work (`PHASER_VS_REACT_MATRIX.md`) |
| **Camera** | Pan limits, zoom min/max, no nausea | Bounds + clamp tests (unit test camera math) |
| **Turn flow** | Obvious whose turn; action affordances | DOM tests for HUD state |

**Deliverable:** “CivRev2 parity sheet” — one page of reference thumbnails + matching Syntheteria screenshots per row.

---

## 5. Robot models & assets — complete checklist

| Item | Source of truth | Test / gate |
|------|-----------------|-------------|
| Model path resolution | `rendering/modelPaths.ts` | Vitest: every `BuildingType` / robot archetype used in game resolves to existing URL or explicit placeholder |
| Scale | POC 2.5× (document in RENDERING_VISION) | Visual + constant exported from one module |
| Bob-and-weave | procedural in unit renderer | Snapshot or deterministic math test (phase per entity id) |
| **No faction tint on mesh** | AGENTS.md | Grep for material color multiply by faction — forbidden |
| Faction on ground disc | board renderer | Present in Phaser pipeline |
| Cult / hostile variants | definitions | Same path resolution tests |
| Animation / skinning | GLB capabilities | If model has skeleton, document whether we animate or static |
| Count / size | `public/` GLBs | Build step warning if dist > budget (optional) |

---

## 6. Epochs, cult, storm, roboforming — design ↔ render ↔ test

| Layer | Artifact | Must stay in sync |
|-------|----------|-------------------|
| Design | [GAME_DESIGN.md](GAME_DESIGN.md) §4 | Epoch table |
| Config | `config/epochDefs.ts` | `stormEscalation`, `cultMutationCap`, wormhole flags |
| Sim | `cultMutation`, `cultistSystem`, `turnSystem` | Vitest already — keep coverage when changing caps |
| Render | `views/board/lighting/epochAtmosphere.ts`, `roboformOverlay.ts` | **Tests:** given mock epoch, fog color / density deltas are deterministic |
| Roboforming levels | RENDERING_VISION table | ECS field driving `setRoboformLevel` — integration test: place building → overlay updates |

**World evolution narrative** (“Earth normal → oases → hypercane → roboforming”): keep **lore** in GAME_DESIGN; **mechanics** in epoch + weather defs; **visuals** in atmosphere + terrain + storm VFX. Add a short matrix doc row if design adds new phases.

---

## 7. Testing strategy — so nothing “obvious” slips through

### 7.1 Automated (required gates)

- `pnpm verify` = lint + tsc + vitest (all suites).
- **Import lint (custom script or biome rule):**  
  - `systems/` + `traits/` must not import `views/`.  
  - No imports from `pending/`.
- **Path resolution test:** sample N entities from each category resolve GLB paths.

### 7.2 Visual / E2E (strongly recommended)

- Playwright: start game → `playing` → screenshot full window → compare to golden (or perceptual diff).
- Separate golden for **title** and **playing** phases.
- Resize test: 1280×720 and 1920×1080 — canvas fills expected region.

### 7.3 Manual review cadence (per milestone)

- Side-by-side: `poc-roboforming.html` vs dev build.
- CivRev2 reference sheet (§4).
- Audio on/off, one full turn cycle, open each overlay (tech, settlement/city production, pause).

### 7.4 Documentation drift gate

After each milestone: `AGENTS.md` package map, `progress.md` tables, and this file’s migration checkboxes updated in same PR.

---

## 8. Retire `src/rendering/` — decompose, then delete

> **STATUS: DONE** — `src/rendering/` deleted and decomposed. See CLOUD_AGENT_RUNBOOK.md Phase I.

### 8.1 Why it violates project principles

| Issue | Detail |
|-------|--------|
| **Kitchen-sink package** | One barrel mixes board geometry, labyrinth meshes, **asset URL catalogs**, globe GLSL strings, Three materials, particle queues, fog helpers, and **input-adjacent** `pathPreview` — unrelated domains. |
| **Blurred boundaries** | `FACTION_COLORS` / `setPlayerFactionColor` overlap `config/gameDefaults.ts`; model tables belong with **assets or config**, not “rendering”. |
| **Name lies** | `tileVisibility` / `unitDetection` are **game rules** for fog & stealth, not drawing code. |
| **TS vs TSX** | Today there is **no `.tsx` in `rendering/`** (only `.ts` + `.glsl`). The *real* problem is **mixing layers** (sim-adjacent logic + title-globe shaders + Phaser asset resolvers) in one import hub — agents assume “rendering = dumb draw helpers” and pull in everything. |

**Goal:** **No `src/rendering/` directory.** Each concern lives in **one** package with a clear name and `index.ts` barrel.

### 8.2 Target decomposition (execute after `views/title` + `views/board` exist)

| Current area (`src/rendering/…`) | Responsibility | **Target home** | Notes |
|--------------------------------|----------------|-----------------|--------|
| `boardGeometry.ts`, `spherePlacement.ts` | Grid ↔ sphere math | `src/board/sphere/` or `src/lib/sphereBoard.ts` | Pure math; consumed by title globe + any sphere tools |
| `depthLayerStack.ts`, `depthMappedLayer.ts`, `structureHelpers.ts`, `labyrinth/` | Labyrinth / stacked floor geometry | `src/board/depth/` (or subfolder under `board/`) | Keeps generation + derived geometry together |
| `modelPaths.ts` (+ exports mutating player tint) | GLB URL tables, resolvers | `src/lib/modelPaths.ts` **or** `src/config/models/` | Split file if >500 LOC; **single** source for `FACTION_COLORS` used at runtime tint — dedupe with `gameDefaults` |
| `globe/shaders.ts`, `globe/cinematicState.ts` | Title globe only | `src/views/title/globe/shaders.ts`, `…/cinematicState.ts` | Only `views/title` and tests import these |
| `glsl/*` (sphere fog, height) | Raw shader text | Co-locate with **sole consumer**: `views/title/glsl/` for sphere; height shaders with terrain or title | Vite raw import paths update once |
| `heightMaterial.ts` | `MeshStandardMaterial` factory | `src/views/title/materials/heightMaterial.ts` | Three-specific; belongs with R3F title stack |
| `particles/effectEvents.ts`, `ParticlePool.ts` | Combat/UI effect queue | `src/lib/particles/` **or** `src/effects/` | Small package with barrel; R3F + future Phaser can import |
| `pathPreview.ts` | Move-hover path segment store | `src/input/pathPreview.ts` | Already renderer-agnostic; `input/` owns pointer UX state |
| `tileVisibility.ts`, `unitDetection.ts` | Explored set, scanner rules | `src/lib/fog/` **or** `src/systems/fogHelpers.ts` | Must not create `systems` → `views` cycles; prefer **pure functions** called from systems + views |
| `sky/chronometry.ts` | Turn → sun angle / season | `src/lib/chronometry.ts` **or** `src/config/chronometry.ts` | Data-ish mapping; no Three types if possible |

### 8.3 Migration mechanics

1. Create target folders + `index.ts` barrels **per row** (or batch by `board/` + `lib/`).  
2. Move files; fix imports **through barrels only** (AGENTS.md).  
3. Move colocated `__tests__/` with the code (same package).  
4. Delete `src/rendering/index.ts` last; grep `from ["'].*rendering` → zero.  
5. `pnpm verify`; update `AGENTS.md` package map (remove `rendering/` line).  

### 8.4 CI / agent guard

After deletion: `rg "src/rendering|from ['\"].*\\/rendering"` must be empty in `src/` (allow only docs/history if needed).

---

## 9. Open risks & surprises to eliminate

| Risk | Mitigation |
|------|------------|
| Dual `view` / `views` confusion | §0 migration + grep CI |
| POC quality regression | Locked constants in `worldLighting.ts` + comment “sync with poc-roboforming.html” |
| WebGL context fights | Documented mount ordering; E2E after transition |
| Stale sphere-world docs | GAME_DESIGN §2 already split narrative vs presentation — keep aligned |
| Huge `modelPaths.ts` | Split by domain when >500 LOC per AGENTS.md |
| Monolithic `rendering/` | §8 decomposition + delete package |
| Bundle size | CDN for GLBs in production (progress.md already notes) |

---

## 10. Execution order (recommended)

1. **§0** — Unify `views/title` + `views/board` (highest confusion reducer).
2. **§7** — Add import gate script + Playwright goldens for title + play.
3. **§3–4** — POC + CivRev2 visual pass with locked tunables.
4. **§5** — Model path audit tests.
5. **§6** — Epoch/roboform render tests + ECS wiring audit.
6. **§8** — Decompose and **remove** `src/rendering/` (board vs lib vs views/title vs input).
7. **Config consolidation** (from PHASER_PIVOT_PLAN 0.1) when views + paths stable.
8. **R3F legacy board deletion** — only files not imported by `views/title`.

---

## 11. Pre-PR gate (integration tranche — before squash PR)

Use **`docs/CLOUD_AGENT_RUNBOOK.md` §3.1** as the canonical short list. In brief: **`pnpm verify`**, branch **`feature/phaser-civrev2-main-integration`**, memory-bank **metrics** match Vitest output, new umbrella docs **committed**.

---

## 12. Sign-off checklist (before calling “done”)

- [x] `src/view/` deleted; only `src/views/` with `title/` + `board/`.
- [x] **`src/rendering/` deleted** — concerns split per §8; no `from "../rendering"` left.
- [x] No `systems`/`traits` → `views` imports.
- [x] `pnpm verify` green.
- [ ] Reference repos cloned locally; version pins noted in README or this doc.
- [ ] CivRev2 parity sheet + POC side-by-side signed off.
- [ ] Robot/building path resolution tests green.
- [ ] `AGENTS.md` + `KOOTA_PATTERNS.md` + `memory-bank/activeContext.md` updated.

---

*This document is the umbrella plan; smaller pivots (e.g. PHASER_PIVOT_PLAN phases) nest under it. Update this file when scope changes.*

**Vitest:** run `pnpm test:vitest` and sync **test file count + test count** into `docs/memory-bank/progress.md` when they change (avoid hard-coding stale “suite” numbers across docs).
