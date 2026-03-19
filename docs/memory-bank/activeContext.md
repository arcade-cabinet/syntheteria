# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-18)

**2239 tests, 131 suites (all passing), 0 TypeScript errors. 344 source files.**

The game is a playable turn-based 4X with:
- **Globe-based rendering** — ONE persistent R3F Canvas (`Globe.tsx`) across all phases (title → setup → generating → playing)
- **Sphere world** — `buildSphereGeometry()`, `tileToSpherePos()`, `SphereOrbitCamera` (orbit around sphere center)
- **Sphere model placement** — all models snap to sphere surface normal via `spherePlacement.ts`
- **Sphere fog of war** — dedicated GLSL shaders (`fogOfWarSphereFrag.glsl`, `fogOfWarSphereVert.glsl`)
- **Title-to-game cinematic** — animated globe growth (0.3→1), title text fade, camera zoom to surface
- **Persistent storm effects** — StormClouds, Hypercane, LightningEffect render in ALL phases (title storms become game sky)
- **Unified terrain renderer** — `UnifiedTerrainRenderer.tsx` replaces old DepthRenderer + MinedPitRenderer
- **PBR texture atlas** (8 AmbientCG packs, 5 atlas maps, atlas-sampling GLSL shader)
- **Cutaway clip plane** — `CutawayClipPlane.tsx` + `cutawayStore.ts` for dollhouse zoom
- **15 faction buildings** + 6 cult structures + 10 salvage types
- **Specialization system** — 14 tracks across 6 robot classes, Garage modal, AI track selection
- **27-tech research tree** (15 base + 12 track-gating techs across 5 tiers)
- **Cult mutation system** — 4-tier time-based evolution (stat buffs → abilities → aberrant)
- **Floor mining** with DAISY pattern — backstop economy when salvage is consumed
- **Yuka GOAP AI** with fuzzy logic, faction personalities, perception memory, NavGraph A*
- **Combat** — attack ranges, damage calc, counterattack, death/removal
- **Cult escalation** — 3 stages (wanderer → war party → assault), per-sect GOAP behaviors
- **Economy** — harvest/synthesize/fabricate loop, building placement, tech/upgrade progression
- **Territory** — faction tile painting, minimap visualization
- **Victory** — 7 paths (domination, research, economic, survival, wormhole, technical supremacy, forced domination)
- **Diplomacy** — granular standings (-100 to +100), trade, reputation, AI personality responses
- **Save/Load** — fixed for BSP generator, unit identity persistence, manual save, auto-save
- **360 GLB models** from 3 asset packs (sci-fi blends, Space Colony, KayKit)
- **Audio** — Tone.js synth pooling, ambient storm loop, SFX
- **11 config definition files** — gameDefaults, techTree, buildings, diplomacy, factionAi, movement, narrative, poi, recipe, upgrade, weather

**Pending/ is READ-ONLY REFERENCE** — valuable for design patterns and game data, but most code is incompatible (real-time hex-grid architecture vs our turn-based square-grid). Port DATA (configs, narrative text), not CODE.

---

## Architecture: Globe-Based Rendering

The game uses a **single persistent `<Canvas>`** via `Globe.tsx` (`src/ui/Globe.tsx`). This replaces the old separate Canvas approach in `GameScreen.tsx`.

### Phase State Machine (from `main.tsx`)

```
"title"      → Globe rotates slowly, title text visible, far orbit camera
"setup"      → Globe visible behind NewGameModal overlay
"generating" → Globe growth animation (0.3→1), title text fades, camera zooms to surface
"playing"    → Game renderers active, title scene hidden, HUD + overlays
```

### Sphere Geometry (`boardGeometry.ts`)

Both flat and sphere geometry co-exist:
- `buildBoardGeometry()` — flat board with CURVE_STRENGTH cosine curvature + GHOST tile border
- `buildSphereGeometry()` — maps tile grid onto a SphereGeometry via equirectangular projection
- `tileToSpherePos(x, z, W, H, R)` — grid coords → 3D sphere position
- `sphereRadius(W, H)` — board dimensions → sphere radius
- `spherePosToTile()` — inverse: 3D sphere position → tile coords (for raycasting)

### Cameras

- `SphereOrbitCamera` — orbit around sphere center, WASD rotates globe, scroll zooms, pan disabled

### Sphere Model Placement (`spherePlacement.ts`)

- `sphereModelPlacement(tileX, tileZ, W, H, yOffset)` — position + quaternion for any model on sphere surface
- `sphereModelPlacementWithRotation()` — adds Y-axis rotation (for directional models like walls)
- Models are oriented so local Y-up aligns with sphere outward normal

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

All core systems complete. Remaining work is deployment and polish:

- **Deploy concern**: Production bundle is 324MB (GLB models + JS chunks). Consider CDN for GLBs, code-split sql.js, lazy-load Three.js/R3F.
- **Accepted tech debt**: `pending/` directory (252MB quarantined reference code) remains in working tree — excluded from tsconfig + biome.
- **Polish**: Power conduit visualization, building preview ghost, idle robot animations (Blender rigging).
