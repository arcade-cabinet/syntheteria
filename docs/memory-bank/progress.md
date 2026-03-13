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

### Combat & AI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Combat | WORKS | `combat.ts` | Component damage (not HP), taunt, formations |
| Hacking | WORKS | `hackingSystem.ts` | Signal link + technique + compute -> capture |
| GOAP governors | WORKS | `governorSystem.ts` | Faction-level decision-making |
| AI system | WORKS | `src/ai/` (50+ subsystems) | `aiSystem(delta, tick)` entry point |
| NavMesh pathfinding | WORKS | `navmesh.ts` | A* with LRU cache |
| Yuka steering | WORKS | `src/ai/steering/` | Seek/arrive/flee/pursue/flank/siege |

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

### Progression

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Tech tree | WORKS | `techTree.ts` | DAG research, real gameplay effects |
| Diplomacy | WORKS | `diplomacy.ts` | Standing, trade, alliances |
| Victory conditions | WORKS | `victoryConditions.ts` | 3 paths (subjugation, technical, wormhole) |
| Mark progression | WORKS | Bot definitions | Mark I-V multipliers |
| Tutorial | WORKS | `tutorialSystem.ts` | 3-turn onboarding |

### Persistence

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Save/load | WORKS | `saveGames.ts`, `worldPersistence.ts` | 4 slots + autosave, IndexedDB + expo-sqlite |
| Autosave | WORKS | `autosave.ts` | Every N turns |

### UI

| System | Status | Key Files | Notes |
|--------|--------|-----------|-------|
| Title screen | WORKS | `TitleScreen.tsx` | Branded, uses in-repo assets |
| New Game modal | WORKS | `NewGameModal.tsx` | Campaign setup |
| Game HUD | WORKS | `GameHUD.tsx` | Resources, turn counter, end turn |
| Radial menu | WORKS | `RadialMenu.tsx` | Context-sensitive, provider-based |
| Pause menu | WORKS | `PauseMenu.tsx` | Save/load/settings/quit |
| Tech tree modal | WORKS | `TechTreeModal.tsx` | Research UI |
| Diplomacy modal | WORKS | `DiplomacyModal.tsx` | Faction relations |
| Victory overlay | WORKS | `VictoryOverlay.tsx` | Endgame announcement |

### Rendering (39 components in GameScene)

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
| InstancedBuildingRenderer | WORKS | 1000+ structures |
| ParticleRenderer | WORKS | Spark, smoke, dust, energy |
| TerritoryBorderRenderer, TerritoryFillRenderer | WORKS | Faction shading |
| BreachZoneRenderer | WORKS | Cultist rifts |
| StructuralFloorRenderer | FIX APPLIED | Was black void, now reads live discovery — UNVERIFIED |
| NetworkLineRenderer | WORKS | Signal network beams |
| CityRenderer | WORKS | City site portals |
| MemoryFragmentRenderer | WORKS | Lore markers |
| MovementOverlayRenderer, PathPreviewRenderer | WORKS | Movement UI |
| ActionRangeRenderer | WORKS | Range circles |
| WormholeRenderer | WORKS | Endgame portal |
| ShadowSystem, StormEnvironment, PostProcessing | WORKS | Lighting & effects |

---

## What Doesn't Work Right

### Floor Rendering (FIX APPLIED — NOT VISUALLY VERIFIED)
- **Bug**: `StructuralFloorRenderer.tsx` read `discovery_state` from stale DB snapshot while exploration writes to `structuralSpace` -> all cells = discovery 0 -> filtered out -> black void
- **Fix**: Renderer now reads from `structuralSpace` via `getStructuralCellRecords()`
- **Risk**: NOT verified in browser. If `structuralSpace` isn't populated before first render, cells still won't appear.

### Floor Textures Are Hardcoded
- `src/config/floorTextureAssets.ts` uses ES module `require()` instead of config-driven JSON
- Model assets already use the correct pattern (JSON manifest + `resolveAssetUri()`)
- Violates config-driven architecture mandate

### AI Factions Are Invisible
- GOAP governors compute decisions but visual impact is minimal
- Rival factions don't visibly build, expand, send scouts, or compete
- AI is a background simulation, not a visible opponent

### Narrative Is Scripted, Not Emergent
- `narrative.ts` fires predetermined thoughts at trigger points
- No bot speech bubble system — units can't produce contextual dialogue
- Need: archetype-driven emergent commentary from individual bots

### Chunk Streaming Not Implemented
- World is a fixed grid generated at new-game time
- No viewport-driven chunk loading/unloading
- Architecture designed in `VIEWPORT_CHUNK_PIVOT.md`, zero code exists
- NOT required for playable 1.0, required for "infinite ecumenopolis" vision

---

## What's Missing Entirely

| Feature | Impact | Planned Phase |
|---------|--------|---------------|
| Bot speech bubble system | World feels dead — no emergent personality | Phase 1 |
| Config-driven floor textures | Architecture violation — can't evolve without code changes | Phase 2 |
| Chunk-based world streaming | No infinite exploration, fixed world size | Phase 3 |
| Cultist visual identity | Enemies look generic — no distinct models | Phase 1 |
| Storm/wormhole VFX coherence | Environment lacks spectacle — individual renderers, no cohesion | Phase 4 |
| Mark upgrade player-facing flow | Progression not visible — no UI, no radial menu integration | Phase 5 |
| Cultist escalation (reactive) | Threat is time-based, not responsive to player expansion | Phase 1 |
| Unified asset manifest validation | Missing assets fail silently at runtime | Phase 2 |

---

## Known Issues & Risks

1. **Black void on first launch** — floor fix applied but NOT visually verified
2. **Silent asset fallbacks** — some loading paths may still return null instead of crashing
3. **20 planning documents** contradict each other — GAMEPLAN_1_0 is now canonical; others are reference only
4. **CLAUDE_UI_POLISH_PLAN claims 56/56 done** — same-day playtest report found P0 crashes; completion claims premature

---

## Codebase Metrics

| Category | Count |
|----------|-------|
| Total `.ts`/`.tsx` files | 375 |
| Source files | 262 |
| Test files | 113 |
| Test suites | 113 |
| Individual tests | 1,092 |
| TypeScript errors | 0 |
| Renderer components | 39 |
| Game systems (ticked/frame) | 21 |
| JSON config files | 23+ |
| Plan documents | 20 |
| Design documents | 16 |

---

## Execution Roadmap Status

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Verify & Stabilize — make what exists work visually | **NOT STARTED** |
| Phase 1 | Visible AI & Emergent Narrative — make world feel alive | NOT STARTED |
| Phase 2 | Config-Driven Asset Pipeline — architecture alignment | NOT STARTED |
| Phase 3 | World Architecture — chunk streaming (deferrable) | NOT STARTED |
| Phase 4 | Visual Polish — make it look right | NOT STARTED |
| Phase 5 | Gameplay Depth — strategic play | NOT STARTED |
