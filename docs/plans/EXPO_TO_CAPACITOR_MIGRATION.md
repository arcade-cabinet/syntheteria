# Migration: Expo/React Native → Capacitor + Vite + R3F

**Status:** Phases 1–8 done. Primary build is Vite + Capacitor + R3F only. **Current entry:** `src/main.tsx` → `initCapacitorDbForVite()` (Capacitor SQLite) → `createSessionDbSync()` (sql.js in-memory) → AppVite. See `db/viteCapacitorSession.ts`.

- **Phase 1:** Vite + Capacitor + R3F + Tailwind scaffold.
- **Phase 2:** Platform shim (`src/platform.ts`), `rendering.ts` uses `isWebPlatform`; game logic framework-agnostic.
- **Phase 3:** Full R3F scene in `GameSceneR3F.tsx`, DOM shell in `AppVite.tsx`; entry `src/main.tsx` (createTestDb → App).
- **Phase 4:** Capacitor SQLite adapter in `src/db/capacitorDb.ts` (initCapacitorDb, execute, query, run). App still uses sql.js in-memory; wire Capacitor when persisting to device.
- **Phase 5:** All repo assets **moved** into `public/assets/` (canonical location). Root `assets` is a symlink to `public/assets` so existing imports (`../../../assets/...`) still resolve. HDRI and static paths use `/assets/...`.
- **Phase 6:** Minimal DOM UI: `GameHUDDom` (turn, resources, storm, Quit); Title screen and game flow in `AppVite.tsx` (DOM).
- **Phase 7:** Vitest added (`pnpm test:vitest`, `pnpm test:vitest:coverage`, `pnpm test:all`); `@testing-library/jest-dom` for DOM matchers; Jest unchanged for existing tests.
- **Phase 8:** Filament and scene snapshot removed (R3F-only). Docs updated (RENDERING_BACKENDS.md, progress, migration). Expo/RN deps retained for legacy Jest/optional Expo dev; primary build and CI use Vite only.

**Commands:** `pnpm dev` | `pnpm build` | `pnpm cap:sync` | `pnpm cap:ios` | `pnpm cap:android` | `pnpm test:vitest`.  
**Rationale:** Expo and React Native have not delivered on their promises for this project. Filament on native added complexity without payoff. The only path that has consistently worked is **R3F (React Three Fiber) on the web**. This plan moves to a **web-first, Capacitor-wrapped** app: Vite, R3F only, assets in `public/`, and [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite) for persistence. No Metro, no React Native, no Filament, no expo-*.

**Scope: nothing is out of scope.** Every R3F component, every three/drei/loader, every scene feature (storm, floor, units, post-processing, camera, input), and any code removed in git history that belonged to the R3F path must be identified, retained, or restored. Rapier (physics) is documented as decoupled via callbacks; include it explicitly if the game uses or will use physics.

**Important:** On this branch we were **fully using R3F before Filament**. Filament was added later as a *second* path for native; the **web path has always been and still is full R3F**. All the R3F code (renderers, camera, input, storm, floor, units, post-processing, etc.) is already here—we are **not** recovering lost code. Migration is: **keep the existing R3F as the only path**, drop the Filament/native/Expo path, and re-host in Vite + Capacitor. It should not be painful; the inventory below is for verification and checklisting so nothing is accidentally dropped.

---

## Phase 0: R3F inventory and verification (do first)

Confirm and list every R3F-related file so nothing is dropped when we remove the Filament path. The code is already present; this phase is **verification**, not recovery.

### 0.1 Inventory: all R3F / three / drei files

| File | Role | R3F/three/drei usage |
|------|------|----------------------|
| **App.tsx** | Root; Canvas for web path | `Canvas`, `Suspense`, WebGPURenderer (optional), all scene children |
| **src/input/TopDownCamera.tsx** | Camera controller | `useFrame`, `useThree`, THREE.PerspectiveCamera |
| **src/input/UnitInput.tsx** | Pointer/click for unit selection & move | `useThree`, THREE.Raycaster |
| **src/ui/TitleScreen.tsx** | Title layout | `Canvas` for TitleMenuScene |
| **src/ui/title/TitleMenuScene.tsx** | 3D title (globe, storm) | `useFrame`, `PerspectiveCamera` (drei), THREE |
| **src/city/runtime/CityModelMesh.tsx** | Single city GLB instance | `useGLTF` (drei), THREE |
| **src/rendering/SceneComposer.tsx** | Snapshot for Filament (remove in migration) | `useFrame`, `useThree`; delete when Filament removed |
| **src/rendering/ChunkLoaderSync.tsx** | Camera-driven chunk loading | `useFrame`, `useThree` |
| **src/rendering/StructuralFloorRenderer.tsx** | Procedural floor tiles | `useFrame`, `useThree`, THREE.TextureLoader |
| **src/rendering/StormSky.tsx** | Sky dome / gradient | `useFrame`, THREE |
| **src/rendering/StormLighting.tsx** | Storm-modulated lights | `useFrame`, THREE |
| **src/rendering/StormParticles.tsx** | Rain/snow particles | `useFrame`, THREE |
| **src/rendering/StormEnvironment.tsx** | HDRI env map (PBR) | `useFrame`, `useThree`, RGBELoader (three/examples/jsm) |
| **src/rendering/LightningSystem.tsx** | Lightning bolts | `useFrame`, `useThree`, THREE |
| **src/rendering/GroundFog.tsx** | Fog plane | `useFrame`, `useThree`, THREE |
| **src/rendering/PostProcessing.tsx** | Tone mapping, vignette (custom shaders) | `useFrame`, `useThree`, THREE (no EffectComposer dep) |
| **src/rendering/ShadowSystem.tsx** | Shadow map sync | `useFrame`, `useThree`, THREE |
| **src/rendering/UnitRenderer.tsx** | Unit GLBs, labels | `useFrame`, `Text`, `useGLTF` (drei), THREE |
| **src/rendering/CityRenderer.tsx** | City GLB instances | THREE |
| **src/rendering/BuildingRenderer.tsx** | Building meshes | `useFrame`, THREE |
| **src/rendering/InstancedBuildingRenderer.tsx** | Instanced sector structures | `useFrame`, `useThree`, THREE (frustum/LOD) |
| **src/rendering/LandscapeProps.tsx** | Props/scatter | `useFrame`, THREE |
| **src/rendering/NetworkLineRenderer.tsx** | Line segments | `useFrame`, THREE |
| **src/rendering/TerritoryBorderRenderer.tsx** | Territory borders | `useFrame`, THREE |
| **src/rendering/TerritoryFillRenderer.tsx** | Territory fill | `useFrame`, THREE |
| **src/rendering/BreachZoneRenderer.tsx** | Breach zones | `useFrame`, THREE |
| **src/rendering/GlowRingRenderer.tsx** | Action/range rings | `useFrame`, THREE |
| **src/rendering/ActionRangeRenderer.tsx** | Action range | `useFrame`, THREE |
| **src/rendering/PathPreviewRenderer.tsx** | Move path line | `useFrame`, `useThree`, THREE |
| **src/rendering/MovementOverlayRenderer.tsx** | Movement overlay | `useFrame`, THREE |
| **src/rendering/HackingBeamRenderer.tsx** | Hacking beams | `useFrame`, THREE |
| **src/rendering/TurretAttackRenderer.tsx** | Turret attacks | `useFrame`, THREE |
| **src/rendering/CombatEffectsRenderer.tsx** | Combat float text | `useFrame`, THREE |
| **src/rendering/HarvestVisualRenderer.tsx** | Harvest VFX | `useFrame`, THREE |
| **src/rendering/HarvestProgressOverlay.tsx** | Harvest progress | THREE |
| **src/rendering/HarvestYieldPopup.tsx** | Yield popup | THREE |
| **src/rendering/ConstructionRenderer.tsx** | Construction stages | `useFrame`, THREE |
| **src/rendering/SpeechBubbleRenderer.tsx** | Speech bubbles (3D) | `useFrame`, THREE |
| **src/rendering/MemoryFragmentRenderer.tsx** | Memory fragments | `useFrame`, THREE |
| **src/rendering/WormholeRenderer.tsx** | Wormhole VFX | `useFrame`, THREE |
| **src/rendering/ProceduralStructureDetails.tsx** | Procedural details | THREE |
| **src/rendering/particles/ParticleRenderer.tsx** | Particle system | `useFrame`, THREE |
| **src/rendering/CityInteriorRenderer.tsx** | Interior scene (city site) | (R3F scene branch) |
| **src/rendering/materials/MaterialFactory.ts** | PBR materials | THREE |
| **src/rendering/materials/NormalMapComposer.ts** | Normal map combiner | THREE |
| **src/rendering/sceneSnapshotBuilder.ts** | Snapshot for Filament | THREE types only; remove with Filament |
| **src/rendering/__tests__/r3fScene.test.tsx** | R3F scene test | `create` (@react-three/test-renderer), THREE |

**Exclude from port (delete with Filament):** `FilamentSceneView.tsx`, `FilamentSceneView.web.tsx`, `NativeSceneComposer.tsx`, `NativeCameraController.tsx`, `rendering/backends/filament.ts`, `sceneContract.ts`, `sceneSnapshotStore.ts`; optionally remove `SceneComposer.tsx` once no consumer needs the snapshot.

### 0.2 Libraries to retain or restore

- **three** (`three`) — Core. Keep. All renderers and materials depend on it.
- **@react-three/fiber** — R3F core. Keep. Used by every scene component (`useFrame`, `useThree`, `Canvas`).
- **@react-three/drei** — Helpers. Keep (already in use on web path).
  - **In use:** `useGLTF` (UnitRenderer, CityModelMesh), `Text` (UnitRenderer), `PerspectiveCamera` (TitleMenuScene).
  - **Optional audit:** Check [drei docs](https://github.com/pmndrs/drei) for helpers that could simplify custom code (e.g. `Environment`, `Html`, `OrbitControls`).
- **three/examples/jsm** — Loaders and helpers. Keep:
  - **RGBELoader** (StormEnvironment) — path must become configurable (e.g. from `public/`).
  - Any other loaders used elsewhere (e.g. GLTFLoader is used via useGLTF in drei).
- **three/webgpu** — Optional. Current app uses `WebGPURenderer` when `USE_WEBGPU_WEB` is true. Retain as an optional code path in the Vite app (same env or config flag).
- **@react-three/test-renderer** — For unit testing R3F. Keep; migrate tests to Vitest and keep this for rendering tests.
- **Rapier (physics):** Docs (systemPatterns, techContext) state physics is "decoupled via callbacks" and systems must never import Rapier. Currently **no direct Rapier import** in `src/`; `@dimforge/rapier3d-compat` appears in the lockfile as a peer of `@types/three` (via maath/stats-gl from drei). Decide:
  - If the game **does not use** physics yet: keep the pattern (callbacks) and add **@dimforge/rapier3d** or **rapier3d-compat** explicitly only when implementing physics.
  - If the game **will use** physics (e.g. collisions, raycast): add **@dimforge/rapier3d** (or compat) to the new app and implement the callback bridge so systems stay decoupled.
- **suspend-react** — Not currently used in `src/`. If we introduce suspense-based loading for GLBs or textures, add it; otherwise omit until needed.

### 0.3 Git archaeology (optional verification)

We were fully on R3F before Filament, so we do **not** expect missing R3F code. Optional sanity check:

- **Deleted rendering files (7c26730 — Ecumenopolis fullscope):** `terrainAtlas.ts`, `terrainHexLayout.ts`, `TerrainRenderer.tsx`. Those were the old hex/terrain path; the game deliberately moved to `StructuralFloorRenderer` and continuous ecumenopolis. **Do not restore** unless we add a hex/terrain mode.
- If you run `git log --diff-filter=D -- "src/rendering/*" "src/input/*"`: no other R3F renderers were removed. The full R3F surface lives in the current tree (web path).

### 0.4 Scene composition checklist (from App.tsx)

The **web** Canvas in `App.tsx` mounts (in order):

1. SceneReadySignal  
2. color (background)  
3. TopDownCamera  
4. SceneComposer  
5. Lights (ambient, hemisphere, directional x2)  
6. StormSky, StormLighting, StormParticles, LightningSystem  
7. UnitInput  
8. ChunkLoaderSync  
9. StructuralFloorRenderer  
10. NetworkLineRenderer  
11. LandscapeProps  
12. CityRenderer (Suspense)  
13. HarvestProgressOverlay  
14. UnitRenderer  
15. SpeechBubbleRenderer  
16. GlowRingRenderer  
17. CombatEffectsRenderer  
18. HackingBeamRenderer  
19. TurretAttackRenderer  
20. HarvestVisualRenderer  
21. ConstructionRenderer  
22. InstancedBuildingRenderer  
23. ParticleRenderer  
24. TerritoryBorderRenderer  
25. TerritoryFillRenderer  
26. BreachZoneRenderer  
27. StormEnvironment  
28. ProceduralStructureDetails  
29. MovementOverlayRenderer  
30. PathPreviewRenderer  
31. ActionRangeRenderer  
32. MemoryFragmentRenderer  
33. WormholeRenderer  
34. ShadowSystem  
35. PostProcessing  

**City interior branch (when activeScene !== "world"):** CityInteriorRenderer + lights.

**Not currently mounted (retain in codebase):** `BuildingRenderer`, `GroundFog`, `HarvestYieldPopup` — they exist and are R3F; mount in the new app if/when needed.

**Nothing is out of scope:** Every item above must exist in the new R3F-only app. No "we'll add it later" for a listed renderer or system.

---

## Target stack

| Concern | Current (Expo/RN) | Target (Capacitor) |
|--------|--------------------|--------------------|
| **Bundler** | Metro | Vite |
| **Framework** | React Native + react-native-web | React (DOM only) |
| **3D** | R3F on web; Filament on native | **R3F only** (web; Capacitor wraps the same build for iOS/Android) |
| **DB** | expo-sqlite + Drizzle (sync) | @capacitor-community/sqlite (async API); adapter layer for existing schema/queries |
| **Routing** | expo-router (app/) | React Router or single SPA |
| **Styling** | NativeWind (Tailwind for RN) | Tailwind for web (or plain CSS) |
| **Assets** | assets/ at root + expo-asset | **public/** (Vite static; served at root) |
| **Tests** | Jest + Maestro | Vitest + Maestro (against built web or Capacitor app) |

---

## Principles

1. **One codebase, one renderer.** R3F only. No platform-specific 3D (no Filament, no expo-gl).
2. **Web-first.** The app is a Vite-built SPA. Capacitor’s job is to wrap that SPA in a native shell and provide native plugins (e.g. SQLite).
3. **No hardcoded ports or devices.** E2E and dev config stay config-driven (existing config/e2e.json and env).
4. **Assets in public.** All static assets live under `public/` (e.g. `public/assets/`) and are referenced by path (e.g. `/assets/models/...`). No expo-asset, no Metro asset pipeline.
5. **DB behind an adapter.** Keep Drizzle schema and query patterns where possible; introduce a single persistence layer that talks to Capacitor SQLite (and web implementation using the plugin’s web path: jeep-sqlite / sql.js / IndexedDB).

---

## Phases

### Phase 1: Scaffold (new app shell)

- Create a **Vite + React + TypeScript** project (in-repo or temporary directory).
- Add **Capacitor** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`). Set `webDir` to Vite’s output (e.g. `dist`).
- Add **R3F** (`@react-three/fiber`, `@react-three/drei`, `three`). One `<Canvas>` entrypoint, no platform branching.
- Add **@capacitor-community/sqlite** (and peer deps: e.g. `jeep-sqlite`, `sql.js` for web per [plugin docs](https://github.com/capacitor-community/sqlite)). Configure in `capacitor.config.ts` if needed.
- Add **Tailwind** (or minimal CSS) for UI.
- Verify: `pnpm build` produces a working web bundle; `npx cap sync` and `npx cap run ios` (or android) open the same app in the native shell.

**Deliverable:** New shell runs on web and one native platform with a placeholder 3D scene and no Expo/RN.

---

### Phase 2: Move game logic (framework-agnostic)

- Move into the new app (or into a shared path the new app imports):
  - `src/ecs/` (Koota ECS, game loop)
  - `src/systems/` (all pure logic)
  - `src/ai/`, `src/pathfinding/`, `src/world/`, `src/city/` (config and logic only; no RN or Expo imports)
  - `src/bots/`, `src/config/` (JSON and non-UI code)
- Strip any dependency on `expo-*`, `react-native`, `react-native-*`. Replace with stubs or browser/Node-safe equivalents where needed (e.g. no `Platform.OS`; use `import.meta.env` or a small `platform` util).
- Keep **Tone.js** for audio; ensure it runs in the browser context used by Capacitor webview.

**Deliverable:** Game systems and world/city logic run in the Vite app without Expo/RN.

---

### Phase 3: Single R3F scene (no Filament)

- Port the **existing web R3F scene** from `App.tsx` (Canvas, SceneComposer, all 39 renderers) into the new app. This is the only 3D path.
- Remove all **Filament** code: `FilamentSceneView`, `NativeSceneComposer`, `sceneSnapshotStore`, `sceneContract`, and any `react-native-filament` usage.
- Remove **expo-gl** and any native 3D branching. One entrypoint: R3F Canvas for both web and Capacitor (same build).
- Input: use DOM/browser events (pointer, keyboard). No RN `PanResponder` or native gesture libs; use R3F/pointer or a small web input layer.

**Deliverable:** One R3F-based game view, working in browser and in Capacitor iOS/Android.

---

### Phase 4: DB adapter (Capacitor SQLite + Drizzle)

- **Capacitor Community SQLite** exposes an async API (`createConnection`, `execute`, `query`, etc.). On web it uses [jeep-sqlite](https://github.com/capacitor-community/sqlite) (sql.js + IndexedDB). On native it uses SQLCipher.
- Implement a **db adapter** that:
  - Uses `@capacitor-community/sqlite` for persistence.
  - Exposes a **sync or async** API that the rest of the app expects (current code uses sync via `getDatabaseSync()` and Drizzle). Options:
    - **A)** Adapter that implements the same sync interface by wrapping the plugin’s async API (e.g. in-memory queue or sync bridge if the plugin allows).
    - **B)** Migrate all persistence calls to async; update `db/` and callers to `async/await`.
- Keep **Drizzle schema** (`src/db/schema.ts`) and reuse it either via Drizzle’s raw SQL execution against the adapter, or by running the same SQL through the plugin. If Drizzle has no official Capacitor driver, maintain a thin executor that runs Drizzle-generated SQL via the plugin.
- **Bootstrap / migrations:** Replicate current behavior (create tables, seed foundation data) using the plugin’s `execute`/`run` API. Keep `db/bootstrap.ts` and `db/seedGameData.ts` logic; change only the execution layer.
- Remove **expo-sqlite** and any COOP/COEP dependency for SharedArrayBuffer (no longer required for the new DB path on web).

**Deliverable:** Save/load and all existing DB features work on web and native via Capacitor SQLite, with schema and behavior unchanged from the user’s perspective.

---

### Phase 5: Assets in public

- Move **all assets** from `assets/` (and any other non-public locations) into **`public/`** (e.g. `public/assets/models/`, `public/assets/ui/`, etc.). References in code and config become **root-relative paths** (e.g. `/assets/models/foo.glb`).
- Remove **expo-asset** and Metro asset resolution. **Central “registry”** can remain as config (list of paths or keys) but resolution is: base URL (e.g. `import.meta.env.BASE_URL` or `''`) + path from config. No numeric module IDs.
- **Vite:** Ensure `public/` is the static root so that `/assets/...` resolves to `public/assets/...`. Copy or move `coi-serviceworker.js` into `public/` if still required for COOP/COEP (or drop if no longer needed).
- Update all **asset loaders** (R3F useLoader, texture loaders, etc.) to use string URLs from the registry. Validate at startup or in a single place; throw on missing assets (no silent fallbacks).

**Deliverable:** No Expo/Metro assets; all assets under `public/` and loaded by URL; R3F and UI use the same paths on web and Capacitor.

**Committing the assets move:** After moving contents from root `assets/` into `public/assets/` and replacing the root directory with a symlink `assets` → `public/assets`: (1) Stage all new files under `public/assets/` with `git add public/assets`. (2) Stage the symlink with `git add assets`. (3) If the old `assets/*` paths were tracked, they will show as deleted; stage with `git add -u assets/` or equivalent so the commit records the move. (4) Commit (e.g. "Move assets to public/assets, add assets symlink"). See [ASSETS.md](../technical/ASSETS.md) for canonical location.

---

### Phase 6: UI (React DOM)

- Replace **React Native** UI with **React DOM**: `View` → `div`, `Text` → `span`/`p`, `Pressable` → `button`/`div` with handlers, etc. Use **Tailwind** (or existing Tailwind config) for layout and styling.
- Port **TitleScreen**, **GameUI**, **modals**, **HUD**, **radial menu**, etc., to DOM components. Keep the same game state and callbacks; only the presentation layer changes.
- **Icons:** Replace `lucide-react-native` with `lucide-react` (or SVG icons) for the web.
- **Routing:** If the app stays a single game screen with overlays, routing may be minimal (e.g. title vs game); use React state or React Router, and remove expo-router.

**Deliverable:** Full UI works in the browser and in Capacitor; no RN components.

---

### Phase 7: Tests and CI

- **Unit tests:** Switch from **Jest** to **Vitest** (Vite-native). Move or rewrite tests under `src/**/__tests__/` to Vitest. Mock Capacitor SQLite and any Capacitor APIs in tests.
- **E2E:** **Maestro** can still drive the app: on native, run against the Capacitor-built app; on web, run against the built SPA (existing `title-web.yaml` and config/e2e.json). No change to E2E config philosophy (config-driven, no hardcoded ports/devices).
- **CI:** Build with `pnpm build` (Vite); run Vitest; optionally run Maestro against a built artifact. Remove Metro and Expo from CI.

**Deliverable:** Vitest for unit tests; Maestro for E2E; CI uses Vite + Capacitor only.

---

### Phase 8: Cleanup and docs

- Remove **Expo**, **React Native**, **Metro**, **Filament**, **NativeWind**, **expo-router**, **expo-sqlite**, **expo-asset**, and all related deps and config (babel, metro.config.js, app/, etc.).
- Update **AGENTS.md**, **CLAUDE.md**, **README**, and **memory-bank** docs to describe the Capacitor + Vite + R3F stack, `public/` assets, and Capacitor SQLite. Archive or update **RENDERING_BACKENDS.md** (single backend: R3F).
- Remove **FilamentSceneView.web.tsx** and all **scene snapshot / Filament** code paths.

**Deliverable:** Repo has no Expo/RN/Filament; docs and contracts reflect the new stack.

---

## Capacitor SQLite (reference)

- **Plugin:** [capacitor-community/sqlite](https://github.com/capacitor-community/sqlite)
- **Web:** Uses `jeep-sqlite` (sql.js + IndexedDB). For Vue/React, copy `sql-wasm.wasm` from `node_modules/sql.js/dist/` to `public/assets` (or equivalent) per plugin docs.
- **Native:** iOS/Android use SQLCipher; configure in `capacitor.config.ts` if using encryption.
- **API:** Async (`createConnection`, `open`, `execute`, `query`, `run`, `close`, etc.). No sync API; adapter or app code must be async or wrapped.

---

## Execution order

Execute phases in order. Phase 1 can be done in a new directory or branch; Phases 2–4 can overlap slightly (e.g. DB adapter in parallel with R3F port). Phase 5 (assets) and Phase 6 (UI) can proceed once the shell and game logic are in place. Phase 7 and 8 after the app runs end-to-end on web and at least one native platform.

---

## Out of scope (for this migration)

- Changing game design or ECS/systems logic beyond replacing Expo/RN/Filament and DB.
- Adding new native modules beyond Capacitor and the SQLite plugin.
- Migrating to a different 3D engine; we are standardizing on R3F only.
