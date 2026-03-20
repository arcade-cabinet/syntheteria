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
> - Vitest: **123 test files, 2208 tests**, 0 TS errors (update this line when counts change)

---

## Architectural Principle: Phaser Owns the Board, React Owns Everything Else

```
┌─────────────────────────────────────────────────┐
│  React DOM Layer (src/ui/, src/app/)            │
│  ┌───────────────────────────────────────────┐  │
│  │ LandingScreen, NewGameModal, SettingsModal│  │
│  │ HUD, command panels, TechTree, settlement production   │  │
│  │ PauseMenu, Minimap, Overlays, Tooltips   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Phaser Canvas (src/views/)                 │  │
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

**What Phaser replaces:** The **match** board only. `Globe.tsx` stays for **title + generating** (R3F). During `playing`, `GameBoard` mounts Phaser into a div; React DOM overlays sit above.

**What is OFF LIMITS — DO NOT CHANGE:**
- `src/ui/landing/` — LandingScreen, NewGameModal, SettingsModal — SIGNED OFF, DO NOT TOUCH
- `src/ui/game/` — HUD, command/settlement UI (incl. production queue), TechTree, all overlays — stays React DOM
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

### 0.2 — Port Settlement / City Data from Pending/ (Tier 1)

> **CANCELLED** — Hub-and-spoke building networks replace the city/settlement concept.
> Per-building management modals (GarageModal pattern) replace city management panels.
> See `docs/GAME_DESIGN.md` §2 and §7 for current design.

Port **data contracts and pure view-model logic** from `pending/` (not executable grid code):

1. **Snapshot types** — `WorldSessionSnapshot`, `CityRuntimeSnapshot`, `SectorPoiSnapshot`
2. **POI / settlement contracts** — `WorldPoiType` enum, site state enums (`latent`/`surveyed`/`founded`)
3. **UI session state** — which settlement is focused (e.g. `focusedSettlementId`, `cityPanelOpen`) —
   lives in **React / app shell**, not a Phaser scene switch
4. **City site actions** — `getCitySiteViewModel()` decision logic (what buttons/options apply)
5. **Presentation hints** — POI type → labels/badges on the **overworld** map

**Target:** extend `src/world/` beyond new-game config with snapshot types and settlement contracts.
Phaser keeps a **single** match scene (`WorldScene`); “enter city” = open DOM city screen (CivRev2/Civ VI pattern).

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

Create the Phaser mount in `App.tsx` for the **playing** phase only:
- After title → generating → playing transition, mount `<GameBoard>` (div + `Phaser.Game` via `createGame`)
- Keep `<Globe>` for phases before playing; **do not** remove the landing globe
- React passes session/board/world; Phaser renders the tactical board; DOM overlays unchanged on top

**Validation:** `pnpm dev` starts; landing + new game unchanged; Phaser boots when entering play.

---

## Phase 1: Game Board Rendering

### 1.1 — `src/views/` Phaser board (no React inside)

Follows the Koota sim/view idea: **board rendering is not React.** In Koota's boids example, `view/` is pure imperative Three.js. Here the **playing** board is **`src/views/`** — Phaser + enable3d — **no React, no JSX, no hooks:**

```
src/views/
├── index.ts                 Barrel export
├── createGame.ts            Phaser.Game factory — returns game instance
├── scenes/
│   └── WorldScene.ts        Scene3D — isometric overworld board (only match scene)
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
    └── boardInput.ts        Click-to-select, click-to-move, command UI triggers
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

Koota-style split: **`views/`** = Phaser/Three.js board; **`app/GameBoard.tsx`** = sole React bridge; **`view/`** = R3F title globe (and legacy board TSX until pruned).

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

### 2.4 — Command UI + Build System

**Target:** **Civ VI–style** contextual commands (action strip / inspector), not the legacy radial.
Build placement and move/harvest/attack dispatch through ECS systems unchanged; only the **surface**
that fires those commands moves to panels and rows. Phaser renders the preview ghost. Until the new
UI ships, `RadialMenu.tsx` may remain as a bridge — **do not** invest in extending radial providers.

### 2.5 — Combat Effects + Speech Bubbles

Port patterns from legacy `src/view/effects/` where needed. In `src/views/`, use Phaser/Three objects or DOM-projected labels.

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

## Phase 4: Settlement Management (CivRev2 / Civ VI Model)

> **CANCELLED** — No settlement/city management screen. Each building has its own management
> modal. Motor Pool → fabrication panel. Synthesizer → recipe panel. Etc.
> The "city screen" concept is replaced by per-building interaction.

### 4.1 — World map only (WorldScene)
The **entire** tactical match runs in one isometric Phaser scene: terrain, units, buildings, fog,
settlement markers on tiles. Phase 1–3 deliver this. There is **no** `CityScene` or walkable interior.

### 4.2 — City / settlement screen (React DOM)
Selecting a settlement opens a **management UI** (full-screen or large modal) — **all production
queueing** (units, structures, and anything else the settlement spends turns on), **queue order /
priorities** (4X-style “what to build next” tradeoffs), yields, purchases, narrative hooks — same
pattern as **Civ VI** city screens (including **mobile** for dense, scannable rows). No separate
“Garage” product concept; motor pools are **facilities**, not their own modal brand.

Phaser may **pause or dim** behind the panel (optional polish); the city “view” is **not** a second 3D level.

Use `pending/` only for **data** inspiration (catalogs, copy, state shapes). Do not port real-time
interior navigation or `cityTransition.ts` scene swaps.

### 4.3 — Wiring

```typescript
// Example: app-level UI state (not Phaser scenes)
export function openSettlementPanel(settlementId: number): void { ... }
export function closeSettlementPanel(): void { ... }
```

ECS + SQLite own settlement truth; React reads/writes through existing command paths; Phaser re-renders
the overworld when traits change.

---

## Phase 5: Cleanup

### 5.1 — Delete unused R3F **board** code (keep Globe)

**Do not delete** `src/ui/Globe.tsx` or title `src/view/globe/` — landing/generating stay R3F.

Remove once Phaser parity is proven:

- Old **match** R3F renderers under `src/view/renderers/` and related overlays not used by `Globe.tsx`
- `src/ui/game/GameScreen.tsx` and any dead entry that mounted the old board canvas
- Sphere **orbit** camera for match if nothing else needs it; title globe keeps its camera

Keep `src/rendering/globe/` and sphere geometry helpers while the title globe uses them.

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
├── views/                Phaser + enable3d — playing board ONLY (pure .ts + Scene3D)
│   ├── scenes/           WorldScene (single match scene)
│   ├── renderers/        terrain, units, buildings, fog, particles, …
│   ├── input/            boardInput.ts
│   └── lighting/         worldLighting, epochAtmosphere
│   ├── title/          R3F — title globe (migrated from src/view/)
├── ui/                   React DOM (Globe, landing, HUD, modals, overlays)
├── rendering/            DELETED — decomposed into board/sphere, config/models, lib/, etc.
├── config/               Tunables + (optional) consolidated data subpackages
├── systems/              ECS systems
├── traits/               Koota traits
├── ai/                   Yuka GOAP
├── board/                Board generation
├── board/sphere/          Sphere geometry (grid ↔ sphere math)
├── db/                   SQLite persistence
├── world/                New-game config + (future) settlement snapshots & POI contracts
├── audio/                Tone.js
└── types/                Shared types
```

**Layering:** `views/` imports `rendering/`, `traits/`, `systems/`, `config/`, `board/` — not `ui/`. `app/GameBoard.tsx` mounts Phaser. `view/` stays for R3F globe; `Globe.tsx` composes `view/` + phase logic.

---

## Dependency Graph

```
Phase 0 (Foundation) — all 3 tracks run in parallel
  ├── 0.1 Config consolidation
  ├── 0.2 Settlement / city data port
  └── 0.3 Phaser replaces R3F in build
        │
Phase 1 (Game Board) — depends on 0.3
  ├── 1.1 Implement src/views/ (Phaser)
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
  ├── 2.4 Command UI + build
  └── 2.5 Combat effects + speech
        │
Phase 3 (Visual Gaps) — depends on 2.1, 2.3
  ├── 3.1 Terrain blending
  ├── 3.2 Forest canopy
  ├── 3.3 Elevation drama
  ├── 3.4 Ocean layers
  └── 3.5 Roboforming
        │
Phase 4 (Settlement UI) — depends on Phase 2 + 0.2
  ├── 4.1 World map (done in Phase 1-3)
  ├── 4.2 React city / settlement management panel
  └── 4.3 App wiring (focus id, open/close, ECS commands)
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
| 4 | E2E or integration tests for opening settlement panel + queue actions |
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
| Bundle size (Phaser + Three.js) | Code-split Phaser boot; city UI is DOM (no extra 3D scene) |
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
