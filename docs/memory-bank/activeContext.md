# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-20)

**Runbook:** [docs/CLOUD_AGENT_RUNBOOK.md](../CLOUD_AGENT_RUNBOOK.md) — structural phases **B–I** completed; **Phase G cancelled** (hub-and-spoke design — no settlement-type snapshot tranche; see `GAME_DESIGN.md`).

**MEGA-PHASES 1–7 — complete:** biome terrain + resource taxonomy, building-driven progression and unlock chains, six victory conditions (+ elimination defeat), per-building modals and building progression overlay, Capacitor (Android + iOS + Web), CI/CD (including Android debug APK workflow), and cleanup/doc refresh (this tranche).

**Umbrella plan:** [docs/COMPREHENSIVE_ENGINEERING_PLAN.md](../COMPREHENSIVE_ENGINEERING_PLAN.md) — **`src/views/title/`** (R3F globe) + **`src/views/board/`** (Phaser + enable3d). Clones: [reference-codebases.md](../reference-codebases.md).

### Structural work complete

- **`src/view/` deleted** — title / generating globe → **`src/views/title/`**; match board → **`src/views/board/`**.
- **`src/rendering/` deleted** — split into **`src/board/sphere/`**, **`src/config/models.ts`**, **`src/views/title/globe/`**, **`src/views/title/glsl/`**, **`src/views/title/materials/`**, **`src/lib/particles/`**, **`src/input/pathPreview.ts`**, **`src/lib/fog/`**, **`src/lib/chronometry.ts`**.
- **Data consolidation** — definitions under **`src/config/buildings/`** and **`src/config/resources/`**; redirect barrels at **`src/buildings/`**, **`src/resources/`** (still imported by systems/tests — intentional).
- **Labyrinth + depth underground removed** — overworld-only; **`src/board/generator.ts`** is **noise- and biome-based**.
- **Import gate:** `scripts/check-imports.sh`.

### Design pivots (`GAME_DESIGN.md`) — implemented targets

- **Biome-based overworld** + vertex-color CivRev2 terrain (board Phaser stack).
- **Resource progression** natural → processed → synthetic (aligned with config + ECS).
- **Hub-and-spoke networks** (not city screens); **per-building modals** (`BuildingModal` + panels — **DONE**).
- **Building-driven progression** — tiers/unlocks via `buildingUpgradeSystem`, `BuildingProgressionOverlay` (centralized tech tree UI **LEGACY** — `TechTreeOverlay` redirects to building progression).

### Rendering: Phaser + enable3d (board) + R3F (title)

`poc-roboforming.html` validated the board look. Remaining visual gaps: **`docs/RENDERING_VISION.md`** (blending, canopy, elevation drama, ocean layers). **Phase 11.8** improvement overlays still open (Phaser roboforming polish).

### Gameplay systems & quality

Core sim wired: economy, combat, AI GOAP, **legacy** research DAG (data still drives effects), diplomacy, **six** win paths + score + building upgrades + analysis acceleration.

**Vitest: 126 test files, 2252 tests (all passing).** 0 TypeScript errors, 0 lint errors. **443** `src/**/*.ts(x)` files (`find src -name '*.ts' -o -name '*.tsx' | wc -l`).

**Pending/ is READ-ONLY REFERENCE** — port DATA (configs, narrative text), not CODE.

---

## Architecture: Phaser + enable3d (match) + R3F (title)

- **Title / generating** — R3F (`Globe.tsx`, `src/views/title/`). **Globe** still mounts legacy **null-returning** R3F stubs `StructureRenderer` / `UnifiedTerrainRenderer` (placeholders post–Phase I gut).
- **Playing** — **Phaser** + **enable3d** (`Scene3D`), game loop, input, 3D in scene.
- **DOM overlay** — HTML labels and HUD over the canvas.

### Camera

- Orthographic isometric, drag-pan, scroll-zoom, WASD rotate
- No free orbit — stays in isometric projection

### Title vs match

`Globe.tsx` remains a single persistent `<Canvas>` for **title → generating**; **playing** uses the Phaser board (`src/views/board/`) plus DOM HUD. Sphere math lives in **`src/board/sphere/`**.

---

## Key Rules

- ECS systems accept `world: World` param — never singleton
- No JSON configs — TypeScript `const` objects only (11 config files in `src/config/`)
- All generation seeded-deterministic
- pending/ is reference-only — port data, not code
- Check pending/ BEFORE building from scratch
- Tiles are GPS coordinates — each (x,z) is a database record, `explored` is the topmost gatekeeper
- Overlay UI (HUD, modals) is DOM-based; diegetic UI (speech bubbles, status bars) is in-canvas

## Next Steps

1. **Phase 11.8** — Improvement overlays (roads, mines, irrigation → roboforming visual progression on Phaser board).
2. **Phase 11.9** — Cultist scripted encounter events (narrative/content).
3. **Visual polish** — `RENDERING_VISION.md` gaps; extend `roboformOverlay` / `epochAtmosphere` as needed.
4. **Optional:** repair browser CT / import previews per runbook Phase C follow-up (`pnpm verify:with-ct`).

**Accepted tech debt:** `pending/` (quarantined reference) remains excluded from tsconfig + biome. **`src/systems/radialMenu.ts`** kept for Vitest + diegetic specs — no in-game `RadialMenu` in active `src/ui/` (per-building modals replaced player radial UI).
