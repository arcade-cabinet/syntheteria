# Phaser + enable3d Pivot — Implementation Plan

> Comprehensive roadmap for migrating Syntheteria from R3F to Phaser + enable3d.
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

## Phase 0: Foundation (Do First)

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

### 0.3 — Add Phaser + enable3d to Build Pipeline

```bash
pnpm add phaser@3.90.0 @enable3d/phaser-extension@0.26.1
```

Configure Vite for Phaser:
- Add `optimizeDeps.include` for Phaser
- Configure asset handling for GLB models
- Ensure HMR works with Phaser scenes

**Validation:** `pnpm dev` starts, Phaser boots in browser, empty scene renders.

---

## Phase 1: Parallel Rendering (Keep R3F + Add Phaser)

### 1.1 — Create Phaser Scene3D Skeleton

```
src/phaser/
├── index.ts              Barrel export
├── PhaserGame.tsx        React wrapper component (replaces Globe.tsx)
├── scenes/
│   ├── WorldScene.ts     Scene3D — isometric overworld
│   └── CityScene.ts      Scene3D — city interior (modal)
├── systems/
│   ├── terrainRenderer.ts    Vertex-colored terrain mesh
│   ├── modelRenderer.ts      GLB model placement
│   ├── fogRenderer.ts        Fog of war overlay
│   └── cameraController.ts   Orthographic isometric camera
└── lighting/
    └── worldLighting.ts      POC lighting recipe (ambient + directional + points + fog)
```

### 1.2 — Implement POC Lighting Recipe

From `docs/RENDERING_VISION.md`:

```typescript
// worldLighting.ts
export function setupWorldLighting(scene: Scene3D) {
  const ambient = new THREE.AmbientLight(0x223344, 0.6);
  const sun = new THREE.DirectionalLight(0xaaccff, 0.8);
  sun.position.set(10, 20, 10);
  scene.scene.add(ambient, sun);
  scene.scene.fog = new THREE.FogExp2(0x050a0f, 0.012);
  // NO tone mapping
}
```

### 1.3 — Implement Terrain Renderer

Vertex-colored flat-shaded terrain from ECS board data:

```typescript
export function buildTerrainMesh(board: GeneratedBoard): THREE.Mesh {
  // BufferGeometry from board tiles
  // Vertex colors from terrain type → color lookup
  // MeshStandardMaterial({ vertexColors: true, flatShading: true })
}
```

### 1.4 — Implement Model Renderer

GLB models at 2.5x scale with procedural bob-and-weave:

```typescript
export function placeModels(world: World, scene: Scene3D) {
  // Query UnitPos, UnitVisual entities
  // Load GLBs from rendering/modelPaths
  // Position on terrain surface
  // Apply bob-and-weave animation in update loop
}
```

### 1.5 — DOM Label Projection

From `docs/RENDERING_VISION.md`:

```typescript
export function projectLabel(worldPos: THREE.Vector3, camera: THREE.Camera, canvas: HTMLCanvasElement) {
  const screenPos = worldPos.clone().project(camera);
  return {
    x: (screenPos.x * 0.5 + 0.5) * canvas.width,
    y: (-screenPos.y * 0.5 + 0.5) * canvas.height,
  };
}
```

**Validation:** Phaser scene renders terrain + models + labels alongside existing R3F canvas. Toggle between them with a dev switch.

---

## Phase 2: Feature Parity

### 2.1 — Fog of War

Sphere fog GLSL shaders → flat terrain fog (simpler). BFS-based explored set from `rendering/tileVisibility.ts`.

### 2.2 — Camera System

Orthographic isometric camera with:
- Drag-pan (mouse/touch)
- Scroll-zoom
- WASD rotate
- Smooth transitions

### 2.3 — Input System

Click-to-select, click-to-move, radial menu trigger. Port logic from `src/input/BoardInput.tsx`.

### 2.4 — HUD Integration

DOM overlays positioned above Phaser canvas. Reuse existing `src/ui/game/` components — they're already pure DOM.

### 2.5 — Turn System Integration

Connect Phaser render loop to existing ECS turn system:

```typescript
// WorldScene.ts update()
update(time: number, delta: number) {
  // Render loop — animations, particles, camera
  updateAnimations(this.world, delta);
  updateParticles(this.world, delta);
  // Turn advancement triggered by user action (not in render loop)
}
```

**Validation:** Full gameplay loop works in Phaser scene. End turn, AI moves, combat resolves, UI updates.

---

## Phase 3: Visual Gaps

Address the gaps identified in `docs/RENDERING_VISION.md`:

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

### 4.1 — World Overview Scene

The main game scene — isometric overworld with all terrain, units, buildings, fog.

### 4.2 — City Interior Scene (Modal)

When player enters a city/base, transition to `CityScene`:
- Separate camera, lighting, environment
- Interior layout from `pending/city/` (catalog, grammar, composites)
- Port `cityTransition.ts` (enterCityInstance, returnToWorld)
- Port `CitySiteModal.tsx` for the transition UI

### 4.3 — Scene Management

```typescript
// src/world/sceneManager.ts
export type ActiveScene = "world" | "city";
export function enterCity(cityId: number): void { ... }
export function returnToWorld(): void { ... }
```

---

## Phase 5: R3F Removal

### 5.1 — Remove R3F Dependencies

Once Phaser scene has full feature parity:

```bash
pnpm remove @react-three/fiber @react-three/drei three
```

### 5.2 — Delete R3F Code

- `src/view/` — all R3F renderer components
- `src/ui/Globe.tsx` — replaced by `src/phaser/PhaserGame.tsx`
- `src/camera/SphereOrbitCamera.tsx` — replaced by Phaser camera
- `src/rendering/globe/` — globe-specific shaders

### 5.3 — Update Package Structure

```
src/
├── main.tsx              Thin mount
├── app/                  App shell (App.tsx, session, debug, etc.)
├── phaser/               Phaser scenes + renderers (replaces view/)
├── rendering/            Pure TS geometry/placement utilities (retained)
├── config/               All game data (consolidated)
├── systems/              ECS systems (unchanged)
├── traits/               Koota traits (unchanged)
├── ai/                   Yuka GOAP (unchanged)
├── board/                Board generation (unchanged)
├── db/                   SQLite persistence (unchanged)
├── ui/                   DOM overlays (retained — game HUD, modals)
├── audio/                Tone.js audio (unchanged)
└── world/                World/city state, POI contracts (new)
```

---

## Dependency Graph

```
Phase 0 (Foundation)
  ├── 0.1 Config consolidation
  ├── 0.2 World/city data port
  └── 0.3 Phaser in build pipeline
        │
Phase 1 (Parallel Rendering) — depends on 0.3
  ├── 1.1 Scene3D skeleton
  ├── 1.2 Lighting recipe
  ├── 1.3 Terrain renderer
  ├── 1.4 Model renderer
  └── 1.5 DOM labels
        │
Phase 2 (Feature Parity) — depends on Phase 1
  ├── 2.1 Fog of war
  ├── 2.2 Camera
  ├── 2.3 Input
  ├── 2.4 HUD integration
  └── 2.5 Turn system
        │
Phase 3 (Visual Gaps) — depends on 2.1-2.3
  ├── 3.1 Terrain blending
  ├── 3.2 Forest canopy
  ├── 3.3 Elevation drama
  ├── 3.4 Ocean layers
  └── 3.5 Roboforming
        │
Phase 4 (World/City) — depends on Phase 2 + 0.2
  ├── 4.1 World overview
  ├── 4.2 City interior
  └── 4.3 Scene management
        │
Phase 5 (R3F Removal) — depends on Phases 2-4
  ├── 5.1 Remove deps
  ├── 5.2 Delete code
  └── 5.3 Update structure
```

---

## Testing Strategy

| Phase | Test Approach |
|-------|---------------|
| 0 | `pnpm verify` — existing tests must pass after data moves |
| 1 | Visual smoke test — Phaser scene renders terrain + models |
| 2 | Existing Vitest suites pass (ECS systems unchanged) |
| 3 | Visual comparison against POC screenshots |
| 4 | New E2E tests for world↔city transitions |
| 5 | `pnpm verify` — all tests pass after R3F removal |

**Key invariant:** ECS logic (systems, traits, AI) is rendering-agnostic. Changing the rendering stack should NOT require changing any system tests. If it does, the abstraction boundary leaked.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Phaser + enable3d performance with 360 GLBs | LOD system, instanced rendering, frustum culling |
| Circular deps in consolidated config/ | Direct type imports for cross-package types (proven pattern) |
| R3F removal breaks tests | Systems are rendering-agnostic; only view/ tests affected |
| World/city scene management complexity | Port proven patterns from pending/ |
| Bundle size increase (Phaser + Three.js) | Code-split Phaser scenes, lazy-load city interior |

---

## References

| Document | Purpose |
|----------|---------|
| `docs/RENDERING_VISION.md` | Visual targets, lighting recipe, gap analysis |
| `docs/KOOTA_PATTERNS.md` | ECS patterns, sim/view split, actions, React hooks |
| `docs/AI_DESIGN.md` | Yuka GOAP architecture |
| `docs/GAME_DESIGN.md` | Game design, lore, factions, economy |
| Memory: `project_pending_salvage.md` | Pending/ salvageability assessment |
| Reference: `/Users/jbogaty/src/reference-codebases/koota/examples/` | Koota patterns |
