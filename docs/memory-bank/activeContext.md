# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-20)

**Runbook:** [docs/CLOUD_AGENT_RUNBOOK.md](../CLOUD_AGENT_RUNBOOK.md) — structural phases **B, C, D, E, F, H, I** completed; **Phase G cancelled** (hub-and-spoke design — no settlement-type snapshot tranche; see `GAME_DESIGN.md`).

**Umbrella plan:** [docs/COMPREHENSIVE_ENGINEERING_PLAN.md](../COMPREHENSIVE_ENGINEERING_PLAN.md) — **`src/views/title/`** (R3F globe, migrated from deleted `src/view/`) + **`src/views/board/`** (Phaser + enable3d). Clones: [reference-codebases.md](../reference-codebases.md).

### Structural work complete

- **`src/view/` deleted** — title / generating globe → **`src/views/title/`**; match board → **`src/views/board/`**.
- **`src/rendering/` deleted** — split into **`src/board/sphere/`** (geometry + placement), **`src/config/models.ts`**, **`src/views/title/globe/`**, **`src/views/title/glsl/`**, **`src/views/title/materials/`**, **`src/lib/particles/`**, **`src/input/pathPreview.ts`**, **`src/lib/fog/`** (tile visibility + unit detection), **`src/lib/chronometry.ts`**.
- **Data consolidation** — definitions under **`src/config/buildings/`** and **`src/config/resources/`** (redirect barrels remain at `src/buildings/`, `src/resources/`).
- **Labyrinth + depth underground removed** — overworld-only; **`src/board/generator.ts`** is **noise-based** (labyrinth tests deleted).
- **Import gate:** `scripts/check-imports.sh`.

### Design pivots (`GAME_DESIGN.md`)

Biome-based overworld + vertex-color CivRev2 terrain (**TARGET**); industrial floor types **LEGACY** where noted. Hub-and-spoke **networks** (not city screens); **per-building** modals (BuildingModal dispatcher + 8 type-specific panels — **DONE**) vs a single city management screen. Cultists: **AI-only** antagonist + scripted beats. **Resource progression** natural → processed → synthetic (**TARGET**) vs current 13-material taxonomy.

### Rendering: Phaser + enable3d (board) + R3F (title)

`poc-roboforming.html` validated the board look (vertex colors, lighting, DOM labels). Gaps: `docs/RENDERING_VISION.md` (blending, canopy, elevation drama, ocean layers).

### Gameplay systems & quality

Core sim remains (economy, combat, AI GOAP, tech tree, diplomacy, etc.).

**123 Vitest files, 2208 tests (all passing).** 0 TypeScript errors, 0 lint errors. ~**434** `src/**/*.ts(x)` files (`find src -name '*.ts' -o -name '*.tsx' | wc -l`).

**Pending/ is READ-ONLY REFERENCE** — port DATA (configs, narrative text), not CODE.

---

## Architecture: Phaser + enable3d (match) + R3F (title)

- **Title / generating** — R3F (`Globe.tsx`, `src/views/title/`).
- **Playing** — **Phaser** + **enable3d** (`Scene3D`), game loop, input, 3D in scene.
- **DOM overlay** — HTML labels and HUD over the canvas.

### Camera
- Orthographic isometric, drag-pan, scroll-zoom, WASD rotate
- No free orbit — stays in isometric projection

### Title vs match

`Globe.tsx` remains a single persistent `<Canvas>` for **title → generating**; **playing** uses the Phaser board (`src/views/board/`) plus DOM HUD. Sphere math lives in **`src/board/sphere/`** (not a monolithic `rendering/` package).

---

## Key Rules
- ECS systems accept `world: World` param — never singleton
- No JSON configs — TypeScript const objects only (11 config files in `src/config/`)
- All generation seeded-deterministic
- pending/ is reference-only — port data, not code
- Check pending/ BEFORE building from scratch
- Tiles are GPS coordinates — each (x,z) is a database record, `explored` is the topmost gatekeeper
- Overlay UI (HUD, modals) is DOM-based; diegetic UI (speech bubbles, status bars) is in-canvas

## Next Steps

1. **Biome terrain** — implement biome-based terrain model per `GAME_DESIGN.md` (replace industrial floor-type presentation where planned).
2. **Resource overhaul** — natural → processed → synthetic progression; align ECS + UI with design doc.
3. **Overworld generator** — iterate noise-based `src/board/generator.ts` (passability, POIs, resource scatter) for hub-and-spoke flow.
4. **Visual polish** — `RENDERING_VISION.md` gaps; roboforming via `src/views/board/renderers/roboformOverlay.ts` + `epochAtmosphere.ts`.
5. **Optional:** repair browser CT / import previews per runbook Phase C follow-up (`pnpm verify:with-ct`).

**Accepted tech debt:** `pending/` (quarantined reference) remains excluded from tsconfig + biome.
