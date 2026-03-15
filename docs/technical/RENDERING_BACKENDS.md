---
title: "Rendering Backends — R3F Only (Web + Capacitor)"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "Single backend: R3F + Three.js on web; Capacitor wraps the same build for native."
depends_on:
  - "RENDERING.md"
  - "ARCHITECTURE.md"
planned_work: []
---

# Rendering Backends: R3F Only (Web + Capacitor)

We need **two solution paths early**: **WebGPU on web** and **Filament on mobile**. This document captures the target architecture, rationale, and how to get there without blocking current delivery.

## Why Two Backends, and Why Early

| Platform | Target backend | Rationale |
|----------|----------------|-----------|
| **Web** | WebGPU | Modern web API; better performance and future-proofing than WebGL; browser support is now broad (Chrome/Edge 113+, Firefox 141+/145+, Safari 26+). |
| **Mobile (iOS/Android)** | Filament | Native PBR engine designed for mobile (small, efficient); better performance and battery than running Three.js/WebGL over expo-gl. |

Introducing the **split early** avoids locking the 39 existing renderers and all future 3D work into a single WebGL/OpenGL ES path. Once we have a clear abstraction and a second backend in mind, new renderer code can stay backend-agnostic and we can migrate incrementally.

## Current State

- **Web:** React Three Fiber (R3F) + Three.js **WebGL** renderer inside a single `<Canvas>` in `App.tsx` / game scene.
- **Native:** Same R3F + Three.js stack, rendered via **expo-gl** (OpenGL ES). No WebGPU on native; no Filament yet.

All 39 renderers (storm, floor, structures, units, particles, etc.) are R3F components that depend on Three.js types and the current WebGL renderer.

## Target Architecture

```
                    ┌─────────────────────────────────────┐
                    │   Game state (Koota ECS, systems)   │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  Renderer layer (scene / draw list)  │  ← backend-agnostic
                    │  (current: R3F components)          │
                    └─────────────┬───────────┬────────────┘
                                  │           │
              ┌───────────────────▼───┐   ┌───▼────────────────────┐
              │  Web                  │   │  Native (iOS/Android)   │
              │  WebGPU               │   │  Filament               │
              │  (Three.js WebGPU      │   │  (react-native-filament  │
              │   or R3F WebGPU)       │   │   or custom native mod) │
              └───────────────────────┘   └─────────────────────────┘
```

- **Web:** Keep R3F + Three.js as the scene layer; swap the underlying renderer from WebGL to **WebGPURenderer** (Three.js r171+). R3F can use the `gl` prop to pass a WebGPU context; community work exists (e.g. `r3f-webgpu`). Custom GLSL in our 39 renderers may need TSL (Three Shader Language) or WGSL for full WebGPU.
- **Native:** Replace the expo-gl + Three.js path with **Filament**. Options:
  - **react-native-filament** (e.g. [margelo/react-native-filament](https://github.com/margelo/react-native-filament)) — declarative Filament from React Native.
  - **Custom native module** — Filament C++ engine wrapped in a React Native native module, with a thin JS API that receives the same scene/draw data as the web path.

The **renderer layer** should remain backend-agnostic: it turns ECS and game state into a scene description (meshes, materials, lights, particles, camera). That description can be executed by either WebGPU (via Three.js) or Filament.

## Abstraction Strategy

Two main approaches:

1. **Backend swap under R3F/Three.js (web only for now)**  
   On web, move from `WebGLRenderer` to `WebGPURenderer`. R3F and our existing components stay; only the renderer and possibly shader language (GLSL → TSL/WGSL) change. This gets WebGPU on web without a new abstraction. Native stays on expo-gl + Three.js until Filament is ready.

2. **Explicit scene / draw-list abstraction**  
   Introduce a small, serializable “scene” or “draw list” that our 39 renderers (or a single “scene composer”) fill each frame. Web backend interprets that into Three.js/WebGPU calls; native backend interprets it into Filament API calls. Bigger refactor, but gives a single source of truth and makes adding Filament (or another backend) straightforward.

**Recommendation:** Start with (1) for **web**: enable WebGPU via Three.js + R3F and fix shaders as needed. In parallel, design (2) for **native**: define a minimal scene/draw contract and implement a Filament backend (e.g. via react-native-filament) so we can migrate native off expo-gl when ready. Avoid building a full scene graph twice; keep the contract small and aligned with what the game actually draws (instanced meshes, particles, lights, floor tiles, etc.).

## Implementation Phases (High Level)

| Phase | Focus | Outcome |
|-------|--------|--------|
| **0** | Document & align | This doc; agreement on WebGPU (web) + Filament (mobile) as the two solutions. |
| **1** | WebGPU on web | Three.js `WebGPURenderer` behind a feature flag or env; R3F `gl` prop; convert custom GLSL to TSL where needed; keep WebGL fallback. **Done:** `USE_WEBGPU_WEB` + async `gl` in App.tsx; set `EXPO_PUBLIC_USE_WEBGPU=0` to force WebGL. |
| **2** | Scene/draw contract | **Removed.** Was for Filament; app is now R3F-only. |
| **3** | Filament on native | **Removed.** Primary build is Vite; R3F only. Native runs the same web build via Capacitor (`pnpm cap:ios` / `cap:android`). |

Phases 1 and 2 can overlap (e.g. WebGPU work while drafting the contract). Phase 3 depends on having a clear contract and at least one backend (web or native) using it.

### Scene/draw contract (Phase 2 — types in code)

- **Removed:** `sceneContract.ts`, `sceneSnapshotStore.ts`, `sceneSnapshotBuilder.ts`, `SceneComposer`, `NativeSceneComposer`, `FilamentSceneView`, `rendering/backends/filament.ts`. Camera state remains in `cameraStateStore.ts` (used by `TopDownCamera`).

## References

- [Three.js WebGPURenderer](https://threejs.org/docs/#api/en/renderers/WebGPURenderer)
- [R3F + WebGPU (forum / r3f-webgpu)](https://discourse.threejs.org/t/webgpu-renderer-vanilla-three-js-vs-r3f-maturity-and-pitfalls/89661) — maturity and pitfalls
- [Filament (Google)](https://google.github.io/filament/) — intro and concepts
- [react-native-filament (Margelo)](https://github.com/margelo/react-native-filament) — Filament from React Native
- [expo-gl](https://docs.expo.dev/versions/latest/sdk/gl-view/) — current native GL surface for Three.js

## R3F-Only (Phase 8 Complete)

**Filament and scene snapshot removed.** Single rendering path: entry `src/main.tsx` → `AppVite` → `GameSceneR3F` (one `<Canvas>` with all 39 renderers). Camera: `TopDownCamera` syncs to `cameraStateStore`. Native: Capacitor wraps the same Vite build; no Filament view. Legacy Expo/RN app may still exist for Jest; primary build is Vite + Capacitor + R3F only.

**Historical (removed):** Scene contract included `DrawFloorCell`, `DrawTerritoryCell`, `DrawLineSegment`, `DrawSky`, `DrawBreachCell`, `DrawWormhole`, `DrawConstructionOverlay`, `DrawHackingBeam`. Snapshot builder emits: floor, territory, **territory border** (getAllCellOwnership + getCellOwner edge segments), network, sky, breach, wormhole, construction, range circles, **path preview** (when `pointerWorld` is passed to `buildSceneSnapshot`; from previewClickToMove), **hacking beams** (getLastHackingEvents, in-progress only). Filament view renders: floor/territory as Models, all line segments (network, borders, range circles, path preview) as DebugBox per segment, breach/wormhole/construction as DebugBox, hacking beams as DebugBox segment from→to. Web keeps PathPreviewRenderer and HackingBeamRenderer for mouse-driven path and beam visuals; native uses snapshot when pointerWorld is supplied (path) and always (hacking beams). All implemented; no placeholders.

## Filament RenderableManager — Filling Gaps

Filament’s **Engine** and **RenderableManager** (from `engine.createRenderableManager()` / `useFilamentContext()`) can replace or augment the current “many DebugBox/Model” approach and close remaining visual/performance gaps.

| Gap | Current approach | RenderableManager / Engine option |
|-----|------------------|-----------------------------------|
| **Sky** | Snapshot has `DrawSky`; lights carry weather; no skybox on native | `Engine.createAndSetSkyboxByColor(colorInHex, showSun?, envIntensity?)` — drive from `DrawSky.color` / `intensity` so native gets a real sky. |
| **Lines** | Many `DebugBox` per segment (network, borders, range, path, beams) | No built-in “line” primitive in RN Filament; RenderableManager supports custom geometry (vertex/index buffers + `PrimitiveType`). A small line-renderable (quad or thin tri strip per segment) or shared line mesh could reduce draw calls and look correct. |
| **Wireframes** | Solid DebugBox for construction, range, breach | `RenderableManager.createDebugCubeWireframe(halfExtent, material?, color?)` — use for construction overlay and range circles so they read as “preview” instead of solid. |
| **Planes / quads** | DebugBox with flat rotation for breach, overlays | `RenderableManager.createPlane(material, halfExtentX, halfExtentY, halfExtentZ)` — one plane entity per breach cell or shared instanced plane with per-instance transform. |
| **Instancing** | One `Model` per floor/territory cell | `Engine.loadInstancedAsset(buffer, instanceCount)` for floor/territory tiles; or `Engine.setAutomaticInstancingEnabled(true)` so identical primitives (same geometry + material) are auto-instanced. Reduces CPU and draw calls. |
| **Materials** | DebugBox uses default material | `RenderableManager.setMaterialInstanceAt(renderable, index, materialInstance)` and `getMaterialInstanceAt()` — swap or tune materials per overlay (e.g. emissive breach, colored borders). `changeMaterialTextureMap()` for texture-driven effects. |
| **Opacity** | N/A | `RenderableManager.setAssetEntitiesOpacity(asset, opacity)` / `setInstanceEntitiesOpacity(instance, opacity)` — construction overlay, range circles, or territory tint without extra draw types. |
| **Particles / effects** | Not in snapshot | RenderableManager + custom geometry (point/quad buffers) or Filament’s particle APIs if exposed in RN — would need a small `DrawParticles` (or similar) and a producer in the snapshot builder. |

**Implemented (sky, fog, instancing):** (1) Sky via `useSkybox()` from `DrawSky`. (2) Fog via `view.setFogOptions` when patch applied (see FILAMENT_FOG_PATCH.md). (3) `engine.setAutomaticInstancingEnabled(true)`. (4) Remaining: `createDebugCubeWireframe()` for construction/range; shared “line” or “quad” renderable built via RenderableManager (or native module) to replace DebugBox-based lines where needed.

## Summary

- **Web:** R3F + Three.js (WebGPU when `USE_WEBGPU_WEB`; else WebGL). Single code path.
- **Mobile:** Same R3F build inside Capacitor WebView; no Filament, no scene contract.
