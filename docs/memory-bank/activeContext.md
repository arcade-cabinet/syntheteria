# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-19)

**PIVOT: Labyrinth underground → 4X overworld.** Rendering stack validated via POC.

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
- **Pending/ assessed** — 80% salvageable for world/city separation (see `project_pending_salvage.md` memory)

### Gameplay Systems (Complete from prior work)

All core gameplay systems remain implemented: economy, combat, AI GOAP, cultists, specializations, tech tree, victory conditions, diplomacy, territory, save/load, audio. These will be re-wired to the new Phaser + enable3d rendering stack.

**2239 tests, 131 suites (all passing), 0 TypeScript errors. 344 source files.**

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

### Prior Architecture (R3F — being replaced)

The prior R3F stack used `Globe.tsx` as a single persistent `<Canvas>` with sphere geometry. This code still exists but will be superseded by the Phaser + enable3d approach. Sphere-world concepts (equirectangular projection, tile↔sphere mapping) remain valid and will be ported.

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

**Codebase restructuring COMPLETE.** Package structure is solid. Ready for Phaser + enable3d pivot.

1. **Create comprehensive Phaser pivot implementation plan** — the roadmap for the rendering migration
2. **Consolidate data packages into src/config/** — buildings/, resources/, factions/, terrain/, narrative/ are pure data definitions
3. **Port world/city separation from pending/** — Tier 1: bots, snapshots, config, generation. Tier 2: city catalog, transitions. Tier 3: AI split, radial menu
4. **Begin Phaser + enable3d migration** — follow the implementation plan
5. **Visual gaps** (during rendering overhaul):
   - Terrain blending, forest canopy, elevation drama, ocean layers
   - ~~Roboforming progression~~ DONE: `src/views/renderers/roboformOverlay.ts` + `src/views/lighting/epochAtmosphere.ts`

**Accepted tech debt**: `pending/` directory (252MB quarantined reference code) remains in working tree — excluded from tsconfig + biome.
