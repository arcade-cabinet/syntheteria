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

### Codebase Restructuring In Progress

Package structure refactoring underway per `AGENTS.md`:
- All packages must have `index.ts` with public API exports
- Import from package index, never deep into internals
- `view/` split from `rendering/` (R3F components vs pure logic)

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

Pivot from labyrinth underground to 4X overworld. Rendering stack validated — now restructure codebase before rendering overhaul.

1. **Continue package restructuring** — ensure all packages have `index.ts`, imports go through package index, `view/` separated from `rendering/`
2. **Document rendering vision** — DONE → `docs/RENDERING_VISION.md`
3. **Defer rendering overhaul** — don't start Phaser + enable3d migration until package structure is solid
4. **Address visual gaps** (when rendering overhaul begins):
   - Terrain blending (vertex color edge interpolation)
   - Forest canopy (blob mesh)
   - Elevation drama (discrete platforms)
   - Ocean layers (open ocean + metallic grating)
   - Roboforming progression (5-level vertex color transitions)

**Accepted tech debt**: `pending/` directory (252MB quarantined reference code) remains in working tree — excluded from tsconfig + biome.
