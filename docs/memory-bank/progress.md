# Progress: Syntheteria

> System-level status dashboard. Answers: what works, what's broken, what's missing.
> Updated when system status changes. See [GAMEPLAN_1_0.md](../plans/GAMEPLAN_1_0.md) for full audit.

---

## Is the game DONE?

**No.** Always ask this first. See **[IS_THE_GAME_DONE.md](../plans/IS_THE_GAME_DONE.md)** for the checklist and **path to done**. Run `pnpm verify` (lint + tsc + test + test:ct). Until manual 0.5/0.6 are run and documented and the PR is merged, the game is not done.

---

**Migration (Phases 1–8 done):** **Capacitor + Vite + R3F** is the primary stack. `pnpm dev` / `pnpm build` run Vite; `src/main.tsx` → Capacitor SQLite (init + schema) → session DB (sql.js) → `AppVite` + `GameSceneR3F` + `GameHUDDom`. Run `pnpm verify` for CI. Assets in `public/`; sql.js WASM at `public/sql-wasm.wasm`. Plan: [EXPO_TO_CAPACITOR_MIGRATION.md](../plans/EXPO_TO_CAPACITOR_MIGRATION.md).

---

## System Status

### Core Systems

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Tick orchestrator | WORKS | `src/ecs/gameState.ts` | 21 systems, 60fps setInterval |
| Turn system | WORKS | `turnSystem.ts`, `turnPhaseHandlers.ts` | AP/MP per unit, player/AI/env phases |
| End Turn flow | WORKS | `turnPhaseHandlers.ts` | End Turn button triggers phase cascade |
| Resource pool | WORKS | `resources.ts` | 11 material types |
| Harvest system | WORKS | `harvestSystem.ts`, `resourcePools.ts` | Tick-based, consumes structures; floor harvest (strip-mining) via FLOOR_* pools, `startFloorHarvest` |
| JSON-in-SQLite | WORKS | `db/bootstrap.ts`, `db/seedGameData.ts`, `db/gameConfig.ts`, `db/modelDefinitions.ts` | Config and model definitions loaded at bootstrap; world/gen read from DB |
| Foundation DB build | WORKS | `scripts/build-foundation-db.ts`, `db/sqljsAdapter.ts` | `pnpm db:build:foundation` generates assets/db/foundation.db; sql.js (no native deps) |
| Test DB | WORKS | `db/testDb.ts`, `jest.setup.ts` | Real SQLite (sql.js) per test file; FakeDatabase removed from runtime |
| Building placement | WORKS | `buildingPlacement.ts` | 7 types, cost-check, adjacency |
| Fabrication queue | WORKS | `fabricationSystem.ts` | Motor Pool processes build orders |
| Motor Pool | WORKS | `motorPool.ts` | Spawns fabricated units |
| World ready gate | WORKS | `gameState.ts` | Systems gated behind `worldReady` flag (US-017) |
| Asset validation | WORKS | `assetValidation.ts` | Validates all config asset refs at boot (US-024) |
| UI layer sequencing | WORKS | `uiLayerState.ts` | loading → hud-entering → hud-visible (US-018) |

### Combat & AI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Combat | WORKS | `combat.ts` | Component damage (not HP), taunt, formations |
| Hacking | WORKS | `hackingSystem.ts` | Signal link + technique + compute -> capture (US-009) |
| GOAP governors | WORKS | `governorSystem.ts` | Faction-level decision-making |
| AI system | WORKS | `src/ai/` (50+ subsystems) | `aiSystem(delta, tick)` entry point |
| NavMesh pathfinding | WORKS | `navmesh.ts` | A* with LRU cache |
| Yuka steering | WORKS | `src/ai/steering/` | Seek/arrive/flee/pursue/flank/siege |
| Rival encounters | WORKS | `rivalEncounters.ts` | Spawn timing, first contact, strength assessment (US-023) |
| Bot speech (events) | WORKS | `botSpeech.ts` | 6 event types, proximity filtering, archetype lines (US-025) |

### World

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| World generation | WORKS | `src/world/generation.ts` | Procedural ecumenopolis from seed |
| Exploration / fog | WORKS | `exploration.ts` | Per-unit vision radius |
| Territory | WORKS | `territory.ts` | Faction cell ownership |
| Weather / storms | WORKS | `weather.ts` | Storm intensity cycle |
| Lightning | WORKS | `lightning.ts` | Strikes exposed cells |
| Signal network | WORKS | `signalNetwork.ts` | Relay connections |
| Wormhole | WORKS | `wormhole.ts` | Endgame portal |
| Chunk math | WORKS | `chunks.ts` | worldToChunk, chunkToSeed, adjacency, bounds (US-027) |
| Chunk loader | WORKS | `chunkLoader.ts`, `ChunkLoaderSync.tsx` | Camera-driven load/unload via ChunkLoaderSync in App (US-029, 4.1) |
| Chunk discovery | WORKS | `chunkDiscovery.ts` | Per-chunk fog of war with cache round-trip (US-030) |
| Chunk deltas | WORKS | `chunkDelta.ts` | Delta persistence, versioned serialization (US-031) |
| Zone blending | WORKS | `zoneBlendLogic.ts` | Smoothstep gradients + breach crack shader (US-026) |

### Progression

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Tech tree | WORKS | `techTree.ts` | DAG research, real gameplay effects |
| Diplomacy | WORKS | `diplomacy.ts` | Standing, trade, alliances, war consequences (US-011) |
| Victory conditions | WORKS | `victoryConditions.ts` | 3 paths (subjugation, technical, wormhole) (US-012) |
| Mark progression | WORKS | `markUpgrade.ts` | Mark I-V, radial menu integration (US-008, US-028) |
| Tutorial | WORKS | `tutorialSystem.ts` | 3-turn onboarding |

### Persistence

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Save/load | WORKS | `saveGames.ts`, `worldPersistence.ts` | 4 slots + autosave, IndexedDB + expo-sqlite |
| Autosave | WORKS | `autosave.ts` | Every N turns |
| Entity persistence | WORKS | `entityPersistence.ts` | Full ECS hydration from DB snapshots |
| Turn state persistence | WORKS | `turnSystem.ts` | Saved/restored turn number, AP/MP per unit |

### UI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Title screen | WORKS | `TitleScreen.tsx` | Branded, uses in-repo assets |
| New Game modal | WORKS | `NewGameModal.tsx` | Campaign setup |
| Game HUD | WORKS | `GameHUD.tsx` | Resources, turn counter, end turn |
| Radial menu | WORKS | `RadialMenu.tsx` | Context-sensitive, provider-based (US-008, US-009) |
| Pause menu | WORKS | `PauseMenu.tsx` | Save/load/settings/quit |
| Tech tree modal | WORKS | `TechTreeModal.tsx` | Research UI |
| Diplomacy modal | WORKS | `DiplomacyModal.tsx` | Faction relations with trade/alliance/war UI |
| Victory overlay | WORKS | `VictoryOverlay.tsx` | Endgame announcement with stats |

### Testing

| Layer | Status | Command / Location | Notes |
|--------|--------|-------------------|-------|
| Jest (unit/integration) | WORKS | `pnpm test` | 1,092+ tests; sql.js test DB |
| Playwright CT (component) | WORKS | `pnpm test:ct` | Isolated React components in browser; RN/reanimated/svg stubbed; DiegeticChip and other specs under `tests/components/` |
| E2E (Maestro) | Partial | See MAESTRO_PLAYTESTING.md | Web flow attempted; New Game assert failed (timing/selector) |

### Rendering (39+ components in GameScene)

| Renderer | Status | Notes |
|----------|--------|-------|
| StormSky, StormLighting, StormParticles | WORKS | Storm visuals |
| LightningSystem | WORKS | Visible strikes |
| UnitRenderer, GlowRingRenderer | WORKS | Units with activity rings |
| CombatEffectsRenderer | WORKS | Attack flash, damage |
| HackingBeamRenderer | WORKS | Signal beams |
| TurretAttackRenderer | WORKS | Auto-fire visuals |
| HarvestVisualRenderer | WORKS | Dissolve + material cubes |
| ConstructionRenderer | WORKS | Staged building |
| InstancedBuildingRenderer | WORKS | Per-chunk instancing with frustum culling (US-032) |
| ParticleRenderer | WORKS | Spark, smoke, dust, energy |
| TerritoryBorderRenderer, TerritoryFillRenderer | WORKS | Faction shading |
| BreachZoneRenderer | WORKS | Cultist rifts |
| StructuralFloorRenderer | WORKS | Live discovery from structuralSpace + VoidFillFloor (US-021); subscribes to game state and re-reads discovery each tick so fog updates are visible |
| NetworkLineRenderer | WORKS | Signal network beams |
| CityRenderer | WORKS | City site portals |
| MemoryFragmentRenderer | WORKS | Lore markers |
| MovementOverlayRenderer, PathPreviewRenderer | WORKS | Movement UI |
| ActionRangeRenderer | WORKS | Range circles |
| WormholeRenderer | WORKS | Endgame portal |
| SpeechBubbleRenderer | WORKS | Billboarded CanvasTexture panels above entities (US-019) |
| ShadowSystem, StormEnvironment, PostProcessing | WORKS | Lighting & effects |

**Rendering:** R3F-only. Web: WebGPU (or WebGL via env) in one `<Canvas>` (`GameSceneR3F`). Native: same build via Capacitor (`pnpm cap:ios` / `cap:android`). No Filament; no scene snapshot. Camera: `TopDownCamera` → `cameraStateStore`. See [RENDERING_BACKENDS.md](../technical/RENDERING_BACKENDS.md).

---

## What Doesn't Work Right

### Floor Textures — Hybrid Config
- `floorTextures.json` defines zone structure; `floorTextureAssets.ts` imports JSON and uses static ESM imports for texture assets (Metro requires static imports for images)
- Adding a new zone requires: 1) entry in floorTextures.json, 2) static import + mapping in floorTextureAssets.ts
- Partially config-driven; full runtime resolution would need different asset pipeline

### City Model Manifest
- PRD 0.4 completed: `pnpm city:ingest` produces manifest; `machine_generator` etc. in modelDefinitions.json
- Some tests still mock `getCityModelById` for isolation (navmesh, pathfindingCache, ProceduralStructureDetails) — not due to missing models

---

## What's Missing Entirely

| Feature | Impact | Notes |
|---------|--------|-------|
| Maestro E2E (native) | Flows require Capacitor build | `pnpm build && pnpm cap:sync` then run **both** iOS and Android. Web: `pnpm dev`, `MAESTRO_WEB_URL=http://localhost:5173`; see [MAESTRO_PLAYTESTING.md](../plans/MAESTRO_PLAYTESTING.md) |
| Visual verification in browser | Jest-only for most systems | Maestro flows + manual verify |

**Remaining work (with dependencies):** See [docs/plans/TASK_LIST.md](../plans/TASK_LIST.md) for the full list (docs, E2E, assets commit, verification, PR).

**Nice-to-haves:** See [docs/plans/NICE_TO_HAVES.md](../plans/NICE_TO_HAVES.md) for optional items (floor texture resolution, undermaterials, storm tuning, etc.).

---

## Known Issues & Risks

1. **Hacking tests** — hacking.test.ts (hacking.ts core) and hackingSystem.test.ts (hackingSystem.ts capture) test different modules; scope documented in file headers. No consolidation needed.
2. **Biome** — 0 errors, 0 warnings; test/setup files have noCommonJs disabled via override
3. **Koota static trait semantics** — `entity.get()` returns copies, must use `entity.set()` for mutations. 5 instances fixed (US-028), but pattern may recur.

---

## Codebase Metrics

| Category | Count |
|----------|-------|
| Total `.ts`/`.tsx` files | 417 |
| Source files (non-test) | 279 |
| Test files | 127 |
| Test suites | 127 |
| Individual tests | 2,431 |
| TypeScript errors | 0 |
| Biome lint | 0 errors, 0 warnings (full clean 2026-03-14) |
| Renderer components | 39+ |
| Game systems (ticked/frame) | 21+ |
| JSON config files | 23 |
| Commits on branch | 53 |

---

## Execution Roadmap Status

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Verify & Stabilize — make what exists work | **SUBSTANTIALLY COMPLETE** — worldReady gate, UI sequencing, asset validation, floor fix |
| Phase 1 | Visible AI & Emergent Narrative | **COMPLETE** — rival encounters, bot speech events, speech bubble renderer |
| Phase 2 | Config-Driven Asset Pipeline | **PARTIAL** — unified asset resolution (US-020), validation (US-024); floor textures hybrid (floorTextures.json + static imports) |
| Phase 3 | World Architecture — chunk streaming | **COMPLETE** — chunk math, loader, discovery, deltas, per-chunk instancing all implemented |
| Phase 4 | Visual Polish | **PARTIAL** — zone blending, void fill floor, speech bubbles; storm/wormhole VFX coherence remains |
| Phase 5 | Gameplay Depth | **COMPLETE** — Mark upgrades (radial), hacking capture, diplomacy consequences, victory pacing |
