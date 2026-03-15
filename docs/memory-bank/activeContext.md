# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.
> See [GAMEPLAN_1_0.md](../plans/GAMEPLAN_1_0.md) for the full execution roadmap.

---

## Is the game DONE?

**No.** Always think this first. Done = manual 0.5 (floor visible), 0.6 (radial, turn, save/load) run and documented + PR merged. Checklist: [IS_THE_GAME_DONE.md](../plans/IS_THE_GAME_DONE.md).

---

## Strategic direction: Capacitor + Vite + R3F

We are **migrating off Expo/React Native/Filament**. The only path that has consistently worked is **R3F on the web**. The target stack is:

- **Capacitor** — wrap a web app for iOS/Android (no React Native).
- **Vite** — replace Metro.
- **R3F only** — no Filament, no expo-gl; one 3D path.
- **Assets in `public/`** — no expo-asset; static files served at root.
- **@capacitor-community/sqlite** — replace expo-sqlite for persistence ([plugin](https://github.com/capacitor-community/sqlite)).

Full plan: [EXPO_TO_CAPACITOR_MIGRATION.md](../plans/EXPO_TO_CAPACITOR_MIGRATION.md). Execute in phases (scaffold → game logic → R3F scene → DB adapter → assets → UI → tests → cleanup).

---

## Current Focus

- **Prioritization owned** — [PRIORITIZATION.md](../plans/PRIORITIZATION.md) is the single source for "what next." Tiers: P0 (journey blockers), P1 (fun multipliers by phase: Awakening → Expansion → Competition → Resolution), P2 (depth, tests), P3 (nice to have). Grounded in 4X pillars, player journey, and design goals.
- **Ownership (everything)** — Test coverage, Playwright CT, docs, and PR readiness are owned in-session. Delivered: new unit tests (turn rehydrate, save no-save), coverage doc updated, TASK_LIST ownership section, prioritization framework, this context.
- **Capacitor + Vite migration (Phases 1–8 done)** — Primary build: `pnpm dev` / `pnpm build`. Entry: `src/main.tsx` → `initCapacitorDbForVite()` (Capacitor SQLite, web IndexedDB + native) → `createSessionDbSync()` (sql.js in-memory) → `AppVite` (DOM title + game, `GameSceneR3F`, `GameHUDDom`). Persistence: Capacitor SQLite; session: sql.js. Run `pnpm verify` for lint + tsc + test + test:ct.
- **Build-time foundation.db** — `pnpm db:build:foundation` generates `assets/db/foundation.db` with schema + all JSON config (models, tiles, robots, game_config); no fake/fallback DB
- **Test db** — Jest uses `createTestDb()` (sql.js) with schema + seed; reserved `TEST_SEED` in `src/db/testConstants.ts` and `tests/testConstants.ts`
- **JSON-in-SQLite foundation COMPLETE** — config and model definitions loaded into DB at bootstrap; world/gen read from SQLite
- **WorldGrid wired** — `initWorldGrid(db, worldSeed, saveGameId)` called from `initializeNewGame`
- **structuralSpace → worldGrid fallback** — `getSectorCell` falls back to worldGrid when cell not in session
- **Floor harvest** — radial "Strip-mine floor", `writeTileDelta` on completion, `consumed_floor_tiles_json` persist/reload

---

## Recent Changes (2026-03-15 session 2)

- **Koota migration W0–W5 complete** — Full audit of all migration tasks; confirmed W4 (T29/T30/T31/T32 — Experience, AnimationState, BotLOD, turret cooldown) and W1/W2 tasks (T4–T11, T13–T17) were already done in prior sessions. Marked ~20 tasks completed, 5 deleted (T23/T24/T25/T28/T33 not applicable given actual system architecture).
- **W5 T38** — Renamed `POITrait` → `POI` and `AIFactionTrait` → `AIFaction` across traits.ts, world.ts, all consumers and tests. `TurnStateKoota` kept (would conflict with `TurnState` interface in turnSystem.ts).
- **W5 T35/T39 audit** — All remaining module-level Maps are legitimate: entity indexes, listener sets, or primary system state not appropriate for ECS. No zombie Maps from migration.
- **BuildToolbar.tsx** — Now reads resources via `useResourcePool()` (Koota) instead of `snap.resources` (GameSnapshot). Retains snapshot subscription as re-render trigger for `getActivePlacement()`.
- **systemPatterns.md** — Updated ECS Pattern and Module Pattern sections to reflect completed migration state.

## Recent Changes (2026-03-15)

- **Docs aligned** — All agentic docs, docs/, and memory bank updated: Vite + Capacitor SQLite + session sql.js, `pnpm verify`, Playwright CT/E2E (headed; CI uses `xvfb-run -a`), path to done, IS_THE_GAME_DONE first in flow. Root AGENTS.md, CLAUDE.md, docs/AGENTS.md, techContext.md, ARCHITECTURE.md, RENDERING_BACKENDS.md, systemPatterns.md aligned.
- **Playwright headed + xvfb** — CT and E2E configs use `headless: false`. CI runs E2E with `xvfb-run -a` (xvfb preinstalled on ubuntu-latest).
- **P0 floor discovery:** StructuralFloorRenderer now subscribes to game state (`useSyncExternalStore(subscribe, getSnapshot, getSnapshot)`) and re-reads `liveDiscovery` from structuralSpace when `gameSnapshot.tick` changes, so exploration-driven discovery updates are visible every tick (single source of truth).
- **P2 harvest→resources test:** harvestSystem.test.ts — new test "harvest completion adds resources to pool (Exploit pillar — resources visible)" asserts addResource called with valid type and amount after floor harvest completes.
- **Own everything** — Unit tests: `turnSystem.test.ts` — rehydrateTurnState (restore phase/activeFaction, load-into-different-phase, playerHasActions). `saveGames.test.ts` — no-save edge (getSaveGameCountSync 0, getLatestSaveGameSync null). COMPREHENSIVE_TEST_COVERAGE.md updated (turn rehydrate, save/load, missing save). TASK_LIST: ownership section added; next steps for CT full run, coverage gaps, Maestro.
- **Playwright component testing (CT)** — `pnpm test:ct` runs isolated React component tests in browser. Stubs: react-native (dir + codegenNativeComponent), react-native-reanimated (useSharedValue, withSpring, Easing, etc.), RN (Image, PanResponder, Touchable, processColor, findNodeHandle, PixelRatio). assetsInclude glb. **DiegeticChip** CT: 3 tests pass.
- **Docs** — DIEGETIC_METAPHORS.md links fixed; docs/AGENTS.md index; COMPREHENSIVE_TEST_COVERAGE.md and Game HUD row updated.

## Next Steps

- **Path to done:** See [IS_THE_GAME_DONE.md](../plans/IS_THE_GAME_DONE.md). 1) `pnpm verify` green. 2) `pnpm test:e2e` (app must boot: Capacitor + sql.js WASM at `/sql-wasm.wasm`). 3) Manual 0.5 (floor visible). 4) Manual 0.6 (radial, turn, save/load). 5) PR merged.
- **Use [PRIORITIZATION.md](../plans/PRIORITIZATION.md) for what to do next.** P0 (journey blockers) first, then P1 by journey phase. P2 (depth, tests). P3 = NICE_TO_HAVES.
- Maestro web: adjust selector or wait if E2E required (P2).
- PR: `gh pr create` when branch is pushed (T9).

## Recent Changes (2026-03-13)

### Ecumenopolis Full-Scope Sprint (33 User Stories)

**Depth 0 — Foundation (16 stories)**
- US-001 through US-016: Core gameplay (harvest, combat, diplomacy, victory, tech tree, weather, exploration, building, resources, turn system, narrative, radial menu, tutorial, unit selection)

**Depth 1 — Integration (6 stories)**
- US-017: World ready gate — systems gated behind `worldReady` flag
- US-018: UI layer mount sequencing — loading → hud-entering → hud-visible
- US-019: Speech bubble renderer — billboarded CanvasTexture panels
- US-020: Unified asset resolution — single `resolveAssetUri()` for all asset types
- US-021: Void fill floor — camera-following shader plane under structural floor
- US-022: Core gameplay loop verification — documented findings

**Depth 2 — Advanced Systems (5 stories)**
- US-023: Rival faction encounters — spawn timing, first contact, strength assessment
- US-024: Asset manifest validation — crash-hard on missing assets at boot
- US-025: Bot speech events — 6 event types, proximity filtering, archetype lines
- US-026: Zone transition blending — smoothstep gradients + breach crack shader
- US-027: Chunk boundary system — deterministic seeding, pure coordinate math

**Depth 3 — Gameplay Verification (3 stories)**
- US-028: Mark upgrade + hacking capture verification — found/fixed 5 Koota mutation bugs
- US-029: Camera-driven chunk loading — state machine with Chebyshev distance
- US-030: Chunk-scoped fog of war — cache round-trip on unload/reload

**Depth 4-5 — Persistence & Integration (2 stories)**
- US-031: Delta persistence for chunks — versioned serialization, backward compatible
- US-032: Instanced rendering per chunk — per-chunk InstancedMesh with frustum culling
- US-033: Full campaign integration verification

**Quality Pass**
- Fixed 4 failing tests (ESM mocks for expo-asset, city model manifest gaps)
- Auto-formatted 172 files with biome
- Reduced lint errors from 239 → 0 (2 false-positive warnings remain)

---

## Rendering (R3F-only)

- **Single path:** One `<Canvas>` in `GameSceneR3F.tsx` (entry: `src/main.tsx` → AppVite). Web: WebGPU when `USE_WEBGPU_WEB`, else WebGL. Native: same build via Capacitor (`pnpm cap:ios` / `cap:android`); no Filament, no scene snapshot.
- **Camera:** `TopDownCamera` syncs to `cameraStateStore`. All 39 renderers (floor, units, storm, territory, etc.) are R3F components in the same scene.
- **Doc:** [RENDERING_BACKENDS.md](../technical/RENDERING_BACKENDS.md) — R3F-only; Filament and scene contract removed.

---

## Next Steps (Prioritized)

1. **Task list** — See [docs/plans/TASK_LIST.md](../plans/TASK_LIST.md) for remaining work with dependencies (docs, E2E, assets commit, verification, PR).
2. **Ralph 1.0 PRD** — All 25 stories marked complete; manual verification (0.5, 0.6) and PR (5.3) remain for maintainer.
3. **Create PR** — `codex/ecumenopolis-fullscope` → `main` when TASK_LIST T8 passes; update GAMEPLAN_1_0 and progress.md on PR.
4. **Maestro E2E** — Native: `pnpm build` + `pnpm cap:sync`, then run **both** iOS and Android. Web: `pnpm dev`, `MAESTRO_WEB_URL=http://localhost:5173`, run `title-web.yaml`. See [MAESTRO_PLAYTESTING.md](../plans/MAESTRO_PLAYTESTING.md).
5. **Nice-to-haves** — See [NICE_TO_HAVES.md](../plans/NICE_TO_HAVES.md).

---

## Active Decisions

| Decision | Rationale |
|----------|-----------|
| Chunk streaming deferred to Phase 3 | Playable fixed-grid game is the immediate goal. Infinite ecumenopolis is vision, not 1.0. |
| Narrative must be emergent bot speech | NOT scripted story blocks. Bots say things because they're doing things. |
| ALL asset loads must crash hard on failure | NEVER fallback silently. Missing asset = crash with clear error naming the asset. |
| One plan document (GAMEPLAN_1_0) | 20 previous plans are demoted to reference. Do NOT create new plan docs. |
| Config over code | Asset paths, costs, material types, texture sets belong in JSON configs, not .ts files. |
| Koota `entity.set()` over `entity.get()` mutation | `get()` returns copies — always use `set()` for mutations. |

---

## Blocked / At Risk

| Item | Status | Risk |
|------|--------|------|
| Playwright | Deprecated; Maestro in place | E2E requires dev build or web flow |
| Floor textures | floorTextures.json + static imports | Partially config-driven; Metro limits |
| City model manifest | PRD 0.4 complete | modelDefinitions has machine_generator |

---

## Key Links

| Resource | Path |
|----------|------|
| Execution roadmap | [`docs/plans/GAMEPLAN_1_0.md`](../plans/GAMEPLAN_1_0.md) |
| Progress tracker | [`docs/memory-bank/progress.md`](progress.md) |
| Product context | [`docs/memory-bank/productContext.md`](productContext.md) |
| System patterns | [`docs/memory-bank/systemPatterns.md`](systemPatterns.md) |
| Tech context | [`docs/memory-bank/techContext.md`](techContext.md) |

---

## Session Log

### 2026-03-13 — Phase 8 complete: Filament removed, plan done
- **Filament + scene snapshot removed:** Deleted `FilamentSceneView.tsx`, `FilamentSceneView.web.tsx`, `NativeSceneComposer.tsx`, `SceneComposer.tsx`, `sceneContract.ts`, `sceneSnapshotStore.ts`, `sceneSnapshotBuilder.ts`, `rendering/backends/filament.ts`. `cameraStateStore.ts` kept with local `SceneCamera` type (used by `TopDownCamera`).
- **App.tsx:** Removed Filament/SceneComposer imports and usage; native branch shows placeholder (use web or Capacitor).
- **package.json:** Removed `react-native-filament` and `patchedDependencies`; lockfile updated.
- **Docs:** RENDERING_BACKENDS.md (R3F-only, Filament removed); EXPO_TO_CAPACITOR_MIGRATION.md (Phase 8 done); progress.md, activeContext.md, AGENTS.md updated. Primary build: Vite only; Expo/RN deps retained for legacy Jest.
- **Verification:** `pnpm test:vitest` (12), `pnpm test` (128 suites, 2435 tests), `pnpm build` pass.

### 2026-03-14 — Finish everything: fog patch, docs, progress
- **Fog patch:** Created via `pnpm patch` + edit + `pnpm patch-commit`. `patches/react-native-filament@1.9.0.patch` adds `setFogOptions` to RNFViewWrapper (cpp) and View types; `pnpm install` applies it. Native rebuild required for fog to take effect.
- **RENDERING_BACKENDS.md:** "Practical next steps" updated to "Implemented (sky, fog, instancing)" with current status; remaining: createDebugCubeWireframe, shared line/quad renderable.
- **progress.md:** Rendering backends bullet updated with sky/fog/instancing and patch reference.

### 2026-03-14 — Full parity: territory border, path preview, hacking beam
- **sceneContract:** DrawHackingBeam (from, to, progress) added.
- **sceneSnapshotBuilder:** buildTerritoryBorderDraws (getAllCellOwnership + getCellOwner + EDGE_DEFS), buildPathPreviewDraws(pointerWorld) via previewClickToMove, buildHackingBeamDraws (getLastHackingEvents). buildSceneSnapshot(camera, session, pointerWorld?) — path preview when pointerWorld provided.
- **FilamentSceneView:** Territory border (line pipeline), path preview (when in snapshot), hacking beams (DebugBox segment per beam). 128 suites, 2435 tests pass.

### 2026-03-14 — Full parity: breach, wormhole, construction, range circles
- **sceneContract:** DrawBreachCell, DrawWormhole, DrawConstructionOverlay added (DrawRangeCircle removed; range emitted as DrawLineSegment closed loops).
- **sceneSnapshotBuilder:** buildBreachDraws (getBreachZones), buildWormholeDraw (getWormholeState, getWormholeVisualPhase), buildConstructionOverlayDraws (getConstructionOverlayData), buildRangeCircleDraws (selected player unit → 3 closed line loops with circlePoints). All merged into snapshot.
- **FilamentSceneView:** Renders breach (flat DebugBox per cell), wormhole (DebugBox at position), construction (DebugBox per overlay). Line segments now iterate consecutive point pairs (so range circles render as full loops). 128 suites, 2435 tests pass.

### 2026-03-14 — Full web/native parity: floor, territory, network, sky
- **sceneContract.ts:** Added `DrawFloorCell`, `DrawTerritoryCell`, `DrawLineSegment`, `DrawSky`; extended `DrawItem` union.
- **sceneSnapshotBuilder.ts:** `buildFloorDraws()` (getStructuralFragments + getStructuralCellRecords), `buildTerritoryDraws()` (getAllCellOwnership), `buildNetworkDraws()` (getNetworkOverlayState), `buildSkyDraw()` (getWeatherSnapshot). All merged into snapshot; no optional/placeholder path.
- **FilamentSceneView.tsx:** Renders floor cells as Model floortile_basic, territory as floortile_empty, line segments as DebugBox (midpoint, rotation, halfExtent). useMemo for floor/territory sources moved before early return (hooks rule). Sky data in snapshot; Skybox omitted (needs texture; lights carry weather).
- **RENDERING_BACKENDS.md, activeContext:** Updated to state full parity done.

### 2026-03-14 — Building parity: zero placeholders
- **buildingModelMap.ts:** New config mapping each placeable building type to a city catalog model ID (column_slim, props_computer, props_containerfull, etc.). No `building_*` placeholders.
- **sceneSnapshotBuilder:** Buildings emit real city model IDs via `getBuildingModelId()`; skip only if type not in map.
- **buildingModelMap.test.ts:** Tests that every placeable type maps to a valid city model; no placeholder keys.
- **RENDERING_BACKENDS.md, activeContext:** Updated to reflect building parity. Full parity (floor, territory, network, storm, particles) requires new Draw types and Filament rendering — documented as remaining.

### 2026-03-14 — Rendering backends doc: Native done & remaining
- **RENDERING_BACKENDS.md:** Added "Native Filament — Done & Remaining": camera (pan, pinch, double-tap), model resolution (robots + structures), and optional remaining (DrawMeshInstanced/DrawParticles in contract only; building_* skipped; instancing/particles would need producer + Filament APIs). Test suite 127 suites / 2431 tests pass.

### 2026-03-14 — Native double-tap camera reset
- **NativeCameraController:** Double-tap (two taps within 400ms, no pan/pinch) resets camera to default (position [0,20,20], target [0,0,0]). `hasMovedRef` and `lastTapTimeRef` track tap vs gesture. progress.md rendering backends note updated (structure resolution + double-tap).

### 2026-03-14 — Filament structure models (city GLBs on native)
- **FilamentSceneView:** Added `resolveModelSource(modelId)`: resolve robot GLBs from `modelAssets`; else resolve sector structure `model_id` via `getCityModelById()` (city catalog `sourceAsset`). Unresolvable IDs (e.g. `building_*`) skip render. Sector structures now draw on native Filament. Lint, tsc, 127 suites / 2431 tests pass.
- **RENDERING_BACKENDS.md:** Phase 3 row updated to mention structure/city model resolution.

### 2026-03-14 — Native Filament camera pan + pinch zoom
- **NativeCameraController.tsx:** Switched to raw touch events (onTouchStart/Move/End). Single-finger pan; two-finger pinch zoom (scale from distance ratio, clamped 8–120) plus two-finger pan from center delta. Hook returns `{ onTouchStart, onTouchMove, onTouchEnd }`; no PanResponder. Lint + tsc + full test suite (127 suites, 2431 tests) pass.
- **App.tsx:** Native branch View uses `{...nativeCameraPanHandlers}`; same as before, now includes pinch.

### 2026-03-14 — All errors and warnings fixed
- **Lint:** Biome override for test/setup files (`noCommonJs` off); unused vars prefixed with `_`; removed ineffective suppression in NetworkLineRenderer; ResourceStrip require() has biome-ignore. **pnpm lint: 0 errors, 0 warnings.** tsc and full test suite pass.

### 2026-03-14 — Pushing forward (continued)
- **PR_CHECKLIST.md:** New doc (docs/plans/PR_CHECKLIST.md) — before opening PR, PR description, on merge, manual verification. Linked from docs/AGENTS.md.
- **ralph progress.txt:** Appended entry for docs/Maestro/PR checklist batch.
- **Lint:** pnpm lint had 13 errors (format/sort); fixed in "Production burst" entry above. tsc and test pass.

### 2026-03-14 — Pushing forward
- **Phase 2 wording:** progress.md Execution Roadmap — "floor textures still hardcoded" → "floor textures hybrid (floorTextures.json + static imports)".
- **Maestro:** Added `onboarding-web.yaml` (url: localhost:8081). maestro/README and MAESTRO_PLAYTESTING updated (five flows; web run instructions).
- **NICE_TO_HAVES:** Focus-visible item marked Addressed (HudButton + modals have role/labels).
- **Verification:** pnpm tsc + pnpm test pass (127 suites, 2,431 tests).

### 2026-03-14 — Nice-to-haves addressed
- **NICE_TO_HAVES.md:** New consolidated doc (docs/plans/NICE_TO_HAVES.md) listing all optional, P2, deferred items from progress, GAMEPLAN, activeContext, domain docs. Each item has source, status, action.
- **Hacking tests:** Added file-header scope: hacking.test.ts → hacking.ts (core); hackingSystem.test.ts → hackingSystem.ts (capture). progress.md "duplicate" note updated to "scope documented; no consolidation needed."
- **progress.md:** "What's Missing" simplified; link to NICE_TO_HAVES.md for optional items.
- **activeContext, docs/AGENTS.md:** Reference NICE_TO_HAVES.

### 2026-03-14 — Comprehensive audit (codebase vs docs/PRD/GAMEPLAN)
- **PRD:** All 25 stories verified against code. 0.5, 0.6 manual; 5.3 PR for maintainer. Rest implemented.
- **GAMEPLAN:** §3.2 Floor textures → "Partially config-driven" (floorTextures.json + static imports). §4 "What's Missing" updated: 4.1 PARTIAL, 4.2–4.3 IMPLEMENTED (speech, chunks), 4.4 PARTIAL (cultist visuals), 4.6–4.7 IMPLEMENTED (Mark upgrade, cultist escalation). "The Bad" items 3 and 5 updated (chunk streaming done, bot speech exists). StructuralFloorRenderer link fixed to ../../src/rendering/.
- **progress.md:** Floor textures → "Hybrid config"; City model → PRD 0.4 complete. "What's Missing" softened.
- **activeContext Blocked/At Risk:** Updated to reflect current state.
- **COMPREHENSIVE_AUDIT_2026-03.md:** New doc; PRD table, GAMEPLAN fixes, docs consistency. Linked from docs/AGENTS.md.
- **README.md:** Quick Start (pnpm, pnpm web, Koota); Project Status table updated for 1.0.
- **package.json:** Added `tsc` script for `pnpm tsc`.

### 2026-03-14 — Docs review & Maestro playtesting
- **Docs:** Corrected `docs/memory-bank/AGENTS.md` Step 4 domain doc paths to `design/`, `technical/`, `interface/`. Updated `docs/plans/GAMEPLAN_1_0.md` canonical table and **fixed four broken in-body links**. Updated `progress.md` (127 suites, 2,431 tests; Chunk loader + ChunkLoaderSync). `docs/AGENTS.md` last_updated 2026-03-14; "Which Doc" row for E2E → MAESTRO_PLAYTESTING.
- **techContext.md:** Testing stack → Maestro (E2E); test counts 127 suites / 2,431; Build & Run → pnpm, Maestro commands; Testing Conventions & CI/CD → Maestro. Project structure: tests/ + maestro/.
- **projectbrief.md:** eXploit pillar 8 → 11 material types (match ECONOMY).
- **Root AGENTS.md:** Validation block 127 suites, 2,431 tests; E2E → Maestro.
- **Maestro:** Native flows need installed app; web flows use MAESTRO_WEB_URL / config/e2e.json (no hardcoded ports). README + MAESTRO_PLAYTESTING: config and flow selector audit.
- **GAMEPLAN_1_0:** Intro and "The Good" metrics updated to 127 suites / 2,431 tests; Appendix C file counts updated; E2E row → Maestro flows.
- **ARCHITECTURE.md:** Testing row → Jest + Maestro.
- **CLAUDE.md:** Test roots updated to current layout (unit/system, UI __tests__, maestro E2E).

### 2026-03-13 — Ecumenopolis Full-Scope Sprint
- Executed 33 user stories via DAG-based parallel agents with worktree isolation
- 5 depth levels processed as parallel waves
- Fixed 4 failing tests (ESM boundary mocks, city model manifest gaps)
- Auto-formatted 172 files with biome (239 → 0 errors)
- Updated progress.md and activeContext.md to reflect current state
- Final: 53 commits, 127 test suites, 2,431 tests, 0 TS errors
