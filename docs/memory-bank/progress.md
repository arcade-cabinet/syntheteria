# Progress: Syntheteria

> System-level status dashboard. Answers: what works, what's broken, what's missing.
> Updated when system status changes. See [GAMEPLAN_1_0.md](../plans/GAMEPLAN_1_0.md) for full audit.

---

## System Status

### Core Systems

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Tick orchestrator | WORKS | `src/ecs/gameState.ts` | 21 systems, 60fps setInterval |
| Turn system | WORKS | `turnSystem.ts`, `turnPhaseHandlers.ts` | AP/MP per unit, player/AI/env phases |
| End Turn flow | WORKS | `turnPhaseHandlers.ts` | End Turn button triggers phase cascade |
| Resource pool | WORKS | `resources.ts` | 11 material types |
| Harvest system | WORKS | `harvestSystem.ts` | Tick-based, consumes structures |
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
| Chunk loader | WORKS | `chunkLoader.ts` | Camera-driven load/unload, Chebyshev distance (US-029) |
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
| StructuralFloorRenderer | WORKS | Live discovery from structuralSpace + VoidFillFloor (US-021) |
| NetworkLineRenderer | WORKS | Signal network beams |
| CityRenderer | WORKS | City site portals |
| MemoryFragmentRenderer | WORKS | Lore markers |
| MovementOverlayRenderer, PathPreviewRenderer | WORKS | Movement UI |
| ActionRangeRenderer | WORKS | Range circles |
| WormholeRenderer | WORKS | Endgame portal |
| SpeechBubbleRenderer | WORKS | Billboarded CanvasTexture panels above entities (US-019) |
| ShadowSystem, StormEnvironment, PostProcessing | WORKS | Lighting & effects |

---

## What Doesn't Work Right

### Floor Textures Are Hardcoded
- `src/config/floorTextureAssets.ts` uses ES module `require()` instead of config-driven JSON
- Model assets already use the correct pattern (JSON manifest + `resolveAssetUri()`)
- Violates config-driven architecture mandate

### City Model Manifest Gaps
- `machine_generator` and other model IDs referenced in `cityComposites.ts` are not in the generated manifest
- Tests work around this with mocks, but the data integrity issue remains
- Run `pnpm city:ingest` to regenerate manifest from GLB source files

---

## What's Missing Entirely

| Feature | Impact | Notes |
|---------|--------|-------|
| Config-driven floor textures | Architecture violation — can't evolve without code changes | Floor texture assets use `require()` |
| City model manifest completeness | Tests need mocks for missing models | Re-run ingest pipeline |
| Chunk streaming → rendering integration | Chunk math + loader + delta exist, per-chunk InstancedMesh exists, but not wired to live camera | All building blocks complete, needs integration glue |
| Visual verification in browser | Most systems tested only via Jest, not visually confirmed | Playwright E2E covers boot + HUD, not full visual |

---

## Known Issues & Risks

1. **Duplicate hacking tests** — both `src/systems/hacking.test.ts` (19 tests) and `src/systems/__tests__/hackingSystem.test.ts` (35 tests) exist with overlapping coverage
2. **Biome false positives** — 2 remaining biome warnings are `noCommonJs` false positives in Jest mock factories
3. **Koota static trait semantics** — `entity.get()` returns copies, must use `entity.set()` for mutations. 5 instances fixed (US-028), but pattern may recur.

---

## Codebase Metrics

| Category | Count |
|----------|-------|
| Total `.ts`/`.tsx` files | 417 |
| Source files (non-test) | 279 |
| Test files | 135 |
| Test suites | 135 |
| Individual tests | 1,605 |
| TypeScript errors | 0 |
| Biome lint errors | 0 (2 false-positive warnings) |
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
| Phase 2 | Config-Driven Asset Pipeline | **PARTIAL** — unified asset resolution (US-020), validation (US-024); floor textures still hardcoded |
| Phase 3 | World Architecture — chunk streaming | **COMPLETE** — chunk math, loader, discovery, deltas, per-chunk instancing all implemented |
| Phase 4 | Visual Polish | **PARTIAL** — zone blending, void fill floor, speech bubbles; storm/wormhole VFX coherence remains |
| Phase 5 | Gameplay Depth | **COMPLETE** — Mark upgrades (radial), hacking capture, diplomacy consequences, victory pacing |
