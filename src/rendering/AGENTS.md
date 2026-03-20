# rendering/

> **Scheduled for elimination.** This package is a **kitchen sink** (board geometry, labyrinth meshes, model URL catalogs, globe shader strings, Three materials, particles, fog rules, path preview). It violates single-responsibility; decompose per [docs/COMPREHENSIVE_ENGINEERING_PLAN.md](../../docs/COMPREHENSIVE_ENGINEERING_PLAN.md) **§8** and [docs/CLOUD_AGENT_RUNBOOK.md](../../docs/CLOUD_AGENT_RUNBOOK.md) **Phase I**. There is **no `.tsx` here** — the problem is **mixed domains**, not TS/TSX.

Pure TypeScript utilities and `.glsl` assets **until** §8 migration completes.

## Rules
- **Pure TS only** — geometry, placement, materials, paths (exported via index)
- **No game logic** — utility functions, never ECS mutations
- **Model paths are centralized** — all GLB URL resolution goes through `modelPaths.ts`
- **Subdirectories** — `globe/`, `particles/`, `sky/`, `labyrinth/`, `glsl/` are sub-packages
- **`rendering/` MUST NOT import from `view/`** — no circular deps

## Public API (via index.ts — utilities only)

### Sphere Geometry
- `buildSphereGeometry(board)` — equirectangular tile grid to sphere mesh
- `tileToSpherePos(x, z, board)` — grid coord to 3D sphere position
- `spherePosToTile(pos, board)` — 3D sphere position to grid coord
- `sphereRadius(w, h)` — board dimensions to sphere radius

### Sphere Placement
- `sphereModelPlacement(x, z, board)` — position + quaternion for models on sphere
- `worldToTileCoords(pos, board)` — world position to tile coordinates

### Model Paths
- `resolveRobotModelUrl(id)`, `resolveBuildingModelUrl(id)`, `resolveSalvageModelUrl(id)`
- `getAllRobotModelUrls()`, `getAllBuildingModelUrls()`, `getAllStructureModelUrls()`
- Infrastructure/structure model arrays for procedural placement

### Other Utilities
- `buildExploredSet(world)`, `isTileExplored()` — fog of war helpers
- `isUnitDetected()` — stealth detection
- `makeHeightMaterial()` — height-based terrain shading
- `getStructuralEdges()`, `getColumnPositions()` — structural geometry

## Files
| File | Purpose |
|------|---------|
| boardGeometry.ts | Sphere geometry builder |
| spherePlacement.ts | Model placement on sphere surface |
| depthLayerStack.ts | Depth-based terrain layering |
| depthMappedLayer.ts | Per-layer geometry generation |
| heightMaterial.ts | Height-based shader material |
| modelPaths.ts | All GLB model path constants + resolvers |
| structureHelpers.ts | Structural edge/column geometry |
| tileVisibility.ts | Fog of war explored set |
| unitDetection.ts | Stealth/detection logic |
| globe/ | cinematicState.ts, shaders.ts (pure TS for title globe) |
| particles/ | effectEvents.ts, ParticlePool.ts (pure TS) |
| sky/ | Chronometry (turn-to-time mapping) |
| labyrinth/ | Wall classification for labyrinth rendering |
| glsl/ | GLSL shader files (fog of war, height) |
