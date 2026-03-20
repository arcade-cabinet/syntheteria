# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-19)

**Cloud / long-running work:** [docs/CLOUD_AGENT_RUNBOOK.md](../CLOUD_AGENT_RUNBOOK.md) — full doc map, **four POC HTML files**, phased backlog (A–H), squash PR from **`feature/phaser-civrev2-main-integration`** → `main`.

**Umbrella engineering plan:** [docs/COMPREHENSIVE_ENGINEERING_PLAN.md](../COMPREHENSIVE_ENGINEERING_PLAN.md) — single **`src/views/`** package (`title/` R3F + `board/` Phaser), Koota/Phaser/three reference review, CivRev2 + POC gates, robot/asset tests, CI import rules. Clones: [reference-codebases.md](../reference-codebases.md).

**PIVOT: Labyrinth underground → 4X overworld.** Rendering stack validated via POC.

**Design targets captured in `docs/GAME_DESIGN.md` (2026-03-20):** biome-based overworld + vertex-color CivRev2 terrain (TARGET), industrial floor types marked LEGACY; hub-and-spoke **networks** (not city screens) with **GarageModal**-style per-building UI; cultists as **AI-only** antagonist + scripted narrative beats (no player cult systems); **resource progression** arc early/mid/late (TARGET) vs current 13-material taxonomy.

### Rendering Stack: Phaser + enable3d (VALIDATED)

The `poc-roboforming.html` prototype proved that **Phaser + enable3d** delivers CivRev2-tier visuals:
- Vertex colors + flat shading + good lighting = stylized 3D without PBR/HDRI
- Lighting recipe: ambient 0x223344@0.6, directional 0xaaccff@0.8, cyan/magenta point lights, FogExp2
- GLB models load at 2.5x scale with procedural bob-and-weave animation
- DOM label projection works for hub names, HP, production counters
- New deps: `phaser@3.90.0`, `@enable3d/phaser-extension@0.26.1`

Visual gaps identified (documented in `docs/RENDERING_VISION.md`):
- Terrain blending (hard tile boundaries → need vertex color edge interpolation)
- Forest canopy (scattered trees → need canopy blob mesh)
- Elevation drama (smooth noise → need chunky discrete platforms)
- Ocean layers (open ocean + grid-covered metallic grating)

### Codebase Restructuring COMPLETE

Package structure fully aligned to Koota best practices:
- **All packages have `index.ts`** with public API exports
- **Zero deep import violations** — all 367 converted to barrel imports
- **main.tsx split** — 1253 → 28 LOC, app shell in `src/app/` (App.tsx, CommandBar, useKeyboardShortcuts, hmrState)
- **Top 5 largest files split** — cultistSystem (1397→37+6 files), radialProviders (→8 files in radial/), evaluators (1022→34+5 files), speechProfiles (1017→104+3 files), yukaAiTurnSystem (1684→755+6 files)
- **Circular deps fixed** — lazy init for module-scope model preloads, direct type imports for cross-package types
- **Koota patterns documented** — `docs/KOOTA_PATTERNS.md` (world, traits, systems, actions, frameloop, React hooks)
- **Pending/ assessed** — 80% salvageable for settlement data / city-screen contracts (Civ-style panel, not interior scene; see `project_pending_salvage.md` memory)

### Gameplay Systems (Complete from prior work)

All core gameplay systems remain implemented: economy, combat, AI GOAP, cultists, specializations, tech tree, victory conditions, diplomacy, territory, save/load, audio. These will be re-wired to the new Phaser + enable3d rendering stack.

**2487 tests, 146 Vitest test files (all passing), 0 TypeScript errors.** ~**465** `src/**/*.ts(x)` files. *Refresh counts after large merges:* `pnpm test:vitest` + `find src -name '*.ts' -o -name '*.tsx' | wc -l`.

**Git (pre-PR):** If `main` is many commits ahead of `origin/main`, use branch **`feature/phaser-civrev2-main-integration`** and **`docs/CLOUD_AGENT_RUNBOOK.md` §3.1** before opening the squash PR.

**Pending/ is READ-ONLY REFERENCE** — valuable for design patterns and game data, but most code is incompatible (real-time hex-grid architecture vs our turn-based square-grid). Port DATA (configs, narrative text), not CODE.

---

## Architecture: Phaser + enable3d (Target)

The rendering stack is pivoting from R3F/React Three Fiber to **Phaser + enable3d**:
- **Phaser** — game loop, input handling, scene management
- **enable3d** — Three.js bridge (`Scene3D`) providing 3D rendering inside Phaser scenes
- **DOM overlay** — HTML labels and HUD positioned over the game canvas

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

**Umbrella docs exist:** [COMPREHENSIVE_ENGINEERING_PLAN.md](../COMPREHENSIVE_ENGINEERING_PLAN.md) + [CLOUD_AGENT_RUNBOOK.md](../CLOUD_AGENT_RUNBOOK.md). **Phaser + enable3d board** is live under `src/views/` (flat layout until Phase B splits `title/` + `board/`).

1. **Pre-PR:** Run **`pnpm verify`**; follow runbook **§3.1**; push **`feature/phaser-civrev2-main-integration`** → squash PR to `main`.
2. **Phase B (views):** `src/views/title/` + `src/views/board/`, delete `src/view/` — [COMPREHENSIVE_ENGINEERING_PLAN.md](../COMPREHENSIVE_ENGINEERING_PLAN.md) §0.
3. **Consolidate data packages into `src/config/`** — [PHASER_PIVOT_PLAN.md](../PHASER_PIVOT_PLAN.md) 0.1.
4. **Port settlement data from `pending/`** — city-screen contracts; **Civ VI–style** production queue + command UI (`GAME_DESIGN.md` §5, §9).
5. **Visual gaps** (see `RENDERING_VISION.md`):
   - Terrain blending, forest canopy, elevation drama, ocean layers
   - Roboforming presentation: `src/views/renderers/roboformOverlay.ts` + `epochAtmosphere.ts` (iterate vs design)

**Accepted tech debt**: `pending/` directory (252MB quarantined reference code) remains in working tree — excluded from tsconfig + biome.
