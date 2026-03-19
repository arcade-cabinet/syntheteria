# Phaser + enable3d Pivot — Implementation Plan

> Comprehensive roadmap for migrating Syntheteria's game board from R3F to Phaser + enable3d.
> Built on the fully reorganized codebase (2026-03-19).
>
> **Prerequisites complete:**
> - Package structure aligned to Koota best practices (`docs/KOOTA_PATTERNS.md`)
> - Zero deep import violations, all barrel exports clean
> - main.tsx → thin 28-LOC mount, app shell in `src/app/`
> - Rendering vision documented (`docs/RENDERING_VISION.md`)
> - Pending/ salvageability assessed (80% reusable)
> - 143 test suites, 2440 tests, 0 TS errors

---

## Architectural Principle: Phaser Owns the Board, React Owns Everything Else

```
┌─────────────────────────────────────────────────┐
│  React DOM Layer (src/ui/, src/app/)            │
│  ┌───────────────────────────────────────────┐  │
│  │ LandingScreen, NewGameModal, SettingsModal│  │
│  │ HUD, RadialMenu, TechTree, GarageModal   │  │
│  │ PauseMenu, Minimap, Overlays, Tooltips   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Phaser Canvas (src/view/)                 │  │
│  │ ┌─────────────────────────────────────┐   │  │
│  │ │ Scene3D: terrain, models, fog,      │   │  │
│  │ │ lighting, particles, animations     │   │  │
│  │ └─────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  React manages phase state machine:             │
│  title → setup → generating → playing           │
└─────────────────────────────────────────────────┘
```

**What Phaser replaces:** Globe.tsx's R3F `<Canvas>` — the 3D game board rendering ONLY.

**What is OFF LIMITS — DO NOT CHANGE:**
- `src/ui/landing/` — LandingScreen, NewGameModal, SettingsModal — SIGNED OFF, DO NOT TOUCH
- `src/ui/game/` — HUD, RadialMenu, TechTree, GarageModal, all overlays — stays React DOM
- `src/app/App.tsx` — phase state machine, session lifecycle — stays React
- The new game flow, settings flow, landing page design — ALL SIGNED OFF

Phaser is ONLY for the game board that renders during the `"playing"` phase. Everything else is React DOM and stays exactly as built.

**`src/view/` becomes `src/views/`** — plural, containing Phaser Scene3D scenes and their renderers. Pure Phaser/Three.js — no React dependency. The only React bridge is a thin mount component in `src/app/`.

---

## Phase 0: Foundation (Do First — 3 Parallel Tracks)

### 0.1 — Consolidate Data Packages into src/config/

Move pure data definition packages into `src/config/` subdirectories:

```
src/config/
├── index.ts              Unified barrel export
├── gameDefaults.ts       Game constants (existing)
├── techTreeDefs.ts       Tech tree (existing)
├── buildings/            ← from src/buildings/
│   ├── definitions.ts
│   └── cultStructures.ts
├── factions/             ← from src/factions/definitions.ts + cults.ts
├── resources/            ← from src/resources/salvageTypes.ts
├── terrain/              ← from src/terrain/types.ts (FloorType, ResourceMaterial)
├── narrative/            ← from src/narrative/speechProfiles.ts + splits
├── robots/               ← from src/robots/ (archetype defs, tracks, marks)
├── diplomacyDefs.ts      (existing)
├── movementDefs.ts       (existing)
├── recipeDefs.ts         (existing)
├── upgradeDefs.ts        (existing)
├── weatherDefs.ts        (existing)
└── poiDefs.ts            (existing)
```

**Why:** Eliminates the circular dependency chains between config/ ↔ buildings/ ↔ robots/ ↔ terrain/. All game data in one package with no cross-package type imports.

**Validation:** `pnpm verify` must pass after migration.

### 0.2 — Port World/City Separation from Pending/ (Tier 1)

Port data contracts and pure logic from `pending/`:

1. **Snapshot types** — `WorldSessionSnapshot`, `CityRuntimeSnapshot`, `SectorPoiSnapshot`
2. **POI contracts** — `WorldPoiType` enum, city state enums (`latent`/`surveyed`/`founded`)
3. **Runtime state** — `activeScene: "world" | "city"`, `activeCityInstanceId`
4. **City site actions** — `getCitySiteViewModel()` decision logic
5. **City presentation** — POI type → display labels/badges

**Target:** `src/world/` package with snapshot types, POI contracts, and scene state.

### 0.3 — Replace R3F with Phaser in Build Pipeline

Clean replacement — no parallel stacks, no toggle:

```bash
pnpm remove @react-three/fiber @react-three/drei
pnpm add phaser@3.90.0 @enable3d/phaser-extension@0.26.1
```

Configure Vite for Phaser:
- Add `optimizeDeps.include` for Phaser
- Configure asset handling for GLB models
- Ensure HMR works with Phaser scenes

Create the Phaser mount point in App.tsx:
- Replace `<Globe>` with `<GameBoard>` — a React component that creates a `<div>` and mounts a Phaser.Game into it
- React passes phase, session, config down; Phaser renders the board
- React still renders all DOM overlays on top

**Validation:** `pnpm dev` starts, Phaser boots in the game board area, empty scene renders. Landing page still works (it's pure React DOM — unaffected).

---

## Phase 1: Game Board Rendering

### 1.1 — Rewrite src/view/ for Phaser (No React in view/)

`src/view/` follows the Koota examples pattern: **the view layer is NOT tied to React.** In Koota's boids example, `view/` is pure imperative Three.js (`view/main.ts`, `view/scene.ts`, `view/systems/syncThreeObjects.ts`). React is just one option for rendering — Phaser is another.

`src/view/` becomes pure Phaser + Three.js — **no React, no JSX, no hooks:**

```
src/view/
├── index.ts                 Barrel export
├── createGame.ts            Phaser.Game factory — returns game instance
├── scenes/
│   ├── WorldScene.ts        Scene3D — isometric overworld board
│   └── CityScene.ts         Scene3D — city interior (Phase 4)
├── renderers/
│   ├── terrainRenderer.ts   Vertex-colored flat-shaded terrain mesh
│   ├── unitRenderer.ts      GLB robot models + bob-and-weave
│   ├── buildingRenderer.ts  GLB building models
│   ├── salvageRenderer.ts   GLB salvage props
│   ├── structureRenderer.ts Walls, columns, infrastructure
│   ├── fogRenderer.ts       Fog of war overlay
│   └── particleRenderer.ts  Point-based particles
├── lighting/
│   └── worldLighting.ts     POC lighting recipe
├── camera/
│   └── isometricCamera.ts   Ortho camera + drag-pan + scroll-zoom + WASD rotate
└── input/
    └── boardInput.ts        Click-to-select, click-to-move, radial trigger
```

The ONLY React piece is a thin mount in `src/app/GameBoard.tsx`:
```typescript
// src/app/GameBoard.tsx — the one React bridge
export function GameBoard({ session, phase, ... }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const game = createGame(containerRef.current, session);
    return () => game.destroy(true);
  }, [session]);
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

This follows Koota's sim/view split exactly: `view/` is the rendering layer (pure Phaser/Three.js), `app/` bridges it to React. The view has ZERO React dependency.

### 1.2 — Implement POC Lighting Recipe

From `docs/RENDERING_VISION.md`:

```typescript
// lighting/worldLighting.ts
export function setupWorldLighting(scene: Scene3D) {
  scene.third.scene.add(new THREE.AmbientLight(0x223344, 0.6));
  const sun = new THREE.DirectionalLight(0xaaccff, 0.8);
  sun.position.set(10, 20, 10);
  scene.third.scene.add(sun);
  scene.third.scene.fog = new THREE.FogExp2(0x050a0f, 0.012);
  // NO tone mapping — flat-shaded vertex colors look best without it
}
```

### 1.3 — Terrain Renderer

```typescript
// renderers/terrainRenderer.ts
export function buildTerrainMesh(board: GeneratedBoard): THREE.Mesh {
  // BufferGeometry from board tiles
  // Vertex colors from terrain type → color lookup
  // MeshStandardMaterial({ vertexColors: true, flatShading: true })
}
```

### 1.4 — Model Renderer

GLBs at 2.5x scale with procedural bob-and-weave. Existing `rendering/modelPaths.ts` (645 LOC of path resolution) transfers directly — it's pure TS.

### 1.5 — Camera + Input

Orthographic isometric camera with drag-pan, scroll-zoom, WASD rotate. Port logic from existing `src/camera/` and `src/input/BoardInput.tsx` (the math stays, the hooks become Phaser event handlers).

### 1.6 — DOM Labels

React components positioned via `Vector3.project(camera)` → CSS `left`/`top`. The HUD, tooltips, and overlays from `src/ui/game/` already work this way.

**Validation:** Game board renders terrain + models + fog. Camera controls work. Clicking selects units. Landing page, HUD, modals all work (unchanged React DOM).

---

## Phase 2: Full Gameplay Loop

### 2.1 — Fog of War

BFS explored set from `rendering/tileVisibility.ts` → geometry mask or shader on terrain mesh.

### 2.2 — HUD Integration

DOM overlays on top of Phaser canvas. The existing `src/ui/game/` components mount unchanged — they read ECS state and render DOM. The only change is how they get the Phaser camera reference for label projection.

### 2.3 — Turn System Wiring

```typescript
// WorldScene.ts
update(time: number, delta: number) {
  // Per-frame: animations, particles, camera lerp
  this.updateAnimations(delta);
  this.updateParticles(delta);
}

// Turn advancement: triggered by React (App.tsx handleEndTurn)
// → advanceTurn(world, board) → ECS state changes → Scene re-reads traits
```

React still owns the turn button. Phaser just re-reads ECS trait values each frame and updates visuals.

### 2.4 — Radial Menu + Build System

Radial menu is DOM (stays in `src/ui/game/RadialMenu.tsx`). Build placement sends commands through ECS systems. Phaser renders the preview ghost.

### 2.5 — Combat Effects + Speech Bubbles

Port from existing `src/view/effects/`. Floating damage text, flash effects, speech bubbles — these become Phaser text/sprite objects or DOM-projected labels.

**Validation:** Full gameplay loop — start game, move units, build, attack, end turn, AI responds. All in Phaser board + React DOM overlays.

---

## Phase 3: Visual Gaps

Address the gaps from `docs/RENDERING_VISION.md`:

### 3.1 — Terrain Blending
Vertex color edge interpolation at tile boundaries. Sample neighbor tile colors at shared vertices.

### 3.2 — Forest Canopy
Single merged canopy blob mesh per forest tile. 2-3 accent trees for silhouette variety.

### 3.3 — Elevation Drama
Discrete elevation levels (flat, hill, mountain, peak). Cliff faces between levels. Shadow-casting prominences.

### 3.4 — Ocean Layers
- Open ocean: deep dark plane with subtle wave animation
- Grid-covered ocean: metallic grating texture, shadow-casting, deep blue underlighting

### 3.5 — Roboforming Progression
5-level vertex color transitions (natural → graded → paved → plated → armored).

---

## Phase 4: World/City View Separation

### 4.1 — World Overview (WorldScene)
The main game board — isometric overworld with terrain, units, buildings, fog. This is what Phase 1-3 builds.

### 4.2 — City Interior (CityScene)
When player enters a base, Phaser switches to `CityScene`:
- Separate camera, lighting, environment
- Interior layout from `pending/city/` (catalog, grammar, composites)
- Port `cityTransition.ts` (enterCityInstance, returnToWorld)

React renders a `CitySiteModal` overlay during the transition. Phaser swaps the active scene underneath.

### 4.3 — Scene Management

```typescript
// src/world/sceneManager.ts
export type ActiveScene = "world" | "city";
export function enterCity(cityId: number): void { ... }
export function returnToWorld(): void { ... }
```

React calls these functions; Phaser handles the scene switch internally.

---

## Phase 5: Cleanup

### 5.1 — Delete R3F Code

- `src/ui/Globe.tsx` — replaced by `src/view/GameBoard.tsx`
- `src/camera/SphereOrbitCamera.tsx` — replaced by Phaser isometric camera
- `src/rendering/globe/` — globe-specific shaders (sphere world)
- Old R3F renderer `.tsx` files in `src/view/renderers/` — replaced by new Phaser renderers

### 5.2 — Remove Unused Dependencies

```bash
pnpm remove three  # If enable3d bundles its own Three.js
```

Check if `three` is still needed directly or if enable3d re-exports it.

### 5.3 — Final Package Structure

```
src/
├── main.tsx              Thin mount (28 LOC)
├── app/                  React app shell (App.tsx, GameBoard.tsx, session, debug)
├── view/                 Phaser game board — NO React, pure Phaser/Three.js
│   ├── scenes/           WorldScene, CityScene (Scene3D)
│   ├── renderers/        terrain, units, buildings, fog, particles
│   ├── camera/           Isometric camera controller
│   ├── input/            Board input (click, drag, select)
│   └── lighting/         World lighting recipe
├── ui/                   React DOM (landing, HUD, modals, overlays, tooltips)
├── rendering/            Pure TS geometry/placement math (framework-agnostic)
├── config/               All game data (consolidated — buildings, factions, robots, terrain, etc.)
├── systems/              ECS systems (unchanged)
├── traits/               Koota traits (unchanged)
├── ai/                   Yuka GOAP (unchanged)
├── board/                Board generation (unchanged)
├── db/                   SQLite persistence (unchanged)
├── world/                World/city state, POI contracts, scene management
├── audio/                Tone.js audio (unchanged)
└── types/                Shared type declarations
```

**Layering rule:** `view/` imports from `rendering/`, `traits/`, `systems/`, `config/`, `board/`. It does NOT import from `ui/` or `app/`. React (`app/`) imports from `view/` to mount the game. This is Koota's sim/view pattern — view reads ECS state, app bridges to React.

---

## Dependency Graph

```
Phase 0 (Foundation) — all 3 tracks run in parallel
  ├── 0.1 Config consolidation
  ├── 0.2 World/city data port
  └── 0.3 Phaser replaces R3F in build
        │
Phase 1 (Game Board) — depends on 0.3
  ├── 1.1 Rewrite src/view/ for Phaser
  ├── 1.2 Lighting recipe
  ├── 1.3 Terrain renderer
  ├── 1.4 Model renderer
  ├── 1.5 Camera + input
  └── 1.6 DOM labels
        │
Phase 2 (Full Gameplay) — depends on Phase 1
  ├── 2.1 Fog of war
  ├── 2.2 HUD integration
  ├── 2.3 Turn system wiring
  ├── 2.4 Radial menu + build
  └── 2.5 Combat effects + speech
        │
Phase 3 (Visual Gaps) — depends on 2.1, 2.3
  ├── 3.1 Terrain blending
  ├── 3.2 Forest canopy
  ├── 3.3 Elevation drama
  ├── 3.4 Ocean layers
  └── 3.5 Roboforming
        │
Phase 4 (World/City) — depends on Phase 2 + 0.2
  ├── 4.1 World overview (done in Phase 1-3)
  ├── 4.2 City interior scene
  └── 4.3 Scene management
        │
Phase 5 (Cleanup) — depends on Phases 2-4
  ├── 5.1 Delete R3F code
  ├── 5.2 Remove deps
  └── 5.3 Final structure
```

---

## Testing Strategy

| Phase | Test Approach |
|-------|---------------|
| 0 | `pnpm verify` — existing tests must pass after data moves |
| 1 | Visual: Phaser renders board. Functional: camera, input, model loading |
| 2 | Existing Vitest suites pass (ECS systems unchanged). Manual: full game loop |
| 3 | Visual comparison against POC screenshots and CivRev2 reference |
| 4 | New E2E tests for world↔city transitions |
| 5 | `pnpm verify` — all tests pass after cleanup |

**Key invariant:** ECS logic (systems, traits, AI) is rendering-agnostic. Changing the rendering backend does NOT change system tests. If a system test breaks, the abstraction leaked.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Phaser + enable3d performance with 360 GLBs | LOD system, instanced rendering, frustum culling |
| Circular deps in consolidated config/ | Direct type imports for cross-package types (proven) |
| Landing page regression | Landing page is pure React DOM — Phaser doesn't touch it |
| HUD/overlay regression | All overlays are pure React DOM — Phaser doesn't touch them |
| Bundle size (Phaser + Three.js) | Code-split Phaser scenes, lazy-load city interior |
| enable3d compatibility | POC already validated the stack works |

---

## References

| Document | Purpose |
|----------|---------|
| `docs/RENDERING_VISION.md` | Visual targets, lighting recipe, gap analysis |
| `docs/KOOTA_PATTERNS.md` | ECS patterns, sim/view split, actions, React hooks |
| `docs/AI_DESIGN.md` | Yuka GOAP architecture |
| `docs/GAME_DESIGN.md` | Game design, lore, factions, economy |
| Memory: `project_pending_salvage.md` | Pending/ salvageability assessment |
| POC: `poc-roboforming.html` | Working prototype proving the rendering stack |
