# GAMEPLAN 1.0 — Syntheteria Comprehensive Assessment & Execution Plan

> **This document is the single source of truth.** It consolidates all 20 planning documents
> in `docs/plans/`, all 16 canonical design documents in `docs/`, and the results of a
> full codebase audit (375+ source files, 127 test suites, 2,431 tests).
>
> **Date**: 2026-03-13
> **Branch**: `codex/ecumenopolis-fullscope`
> **Purpose**: Stop the cycle of fragmented plans, contradictory status claims, and
> repeated rework by establishing one brutally honest picture of what exists, what
> doesn't, and what to do next.

---

## Table of Contents

1. [Brutally Honest Status Assessment](#1-brutally-honest-status-assessment)
2. [What Actually Works (Verified)](#2-what-actually-works-verified)
3. [What Exists But Doesn't Work Right](#3-what-exists-but-doesnt-work-right)
4. [What's Missing Entirely](#4-whats-missing-entirely)
5. [Plan Contradictions & Document Debt](#5-plan-contradictions--document-debt)
6. [Obsolete Documents](#6-obsolete-documents)
7. [Architecture Gaps](#7-architecture-gaps)
8. [Execution Roadmap: 6 Phases to 1.0](#8-execution-roadmap-6-phases-to-10)
9. [Design Document Index](#9-design-document-index)
10. [Plan Document Consolidation Map](#10-plan-document-consolidation-map)

---

## 1. Brutally Honest Status Assessment

### The Good

The codebase is **real**. This is not a prototype or a placeholder. There are:

- **375+ TypeScript source files** (source + test)
- **127 test suites, 2,431 tests — ALL PASSING**
- **Zero TypeScript errors** on `tsc --noEmit`
- **39 renderer components** mounted in a real R3F Canvas
- **21 game systems** ticking every frame in a real game loop
- **Full save/load** with SQLite persistence (IndexedDB fallback on web)
- **A working turn system** with AP/MP budgeting
- **A working economy** with 11 material types flowing through harvest → build → research
- **A working AI** with GOAP governors, Yuka steering, and NavMesh pathfinding
- **A working combat system** with component damage, formations, and faction hostility

### The Bad

Despite 2,431 passing tests and 375+ source files, **the game still renders as a black void
on first launch**. The gap between "tests pass" and "player sees a game" is the core problem:

1. **Dual data store bug** — The floor renderer reads `discovery_state` from a stale DB
   snapshot while the exploration system writes to a separate in-memory store
   (`structuralSpace`). Fix was implemented this session but NOT yet visually verified.

2. **Floor texture pipeline** — `floorTextures.json` defines zone structure; `floorTextureAssets.ts` uses static ESM imports for Metro bundling. Adding zones requires JSON + TS mapping. Partially config-driven (see §3.2).

3. **Chunk streaming** — Implemented (US-027–US-032, ChunkLoaderSync). Camera-driven load/unload. Per-chunk InstancedBuildingRenderer. Fixed grid still playable; chunk architecture in place.

4. **AI factions exist but don't visibly compete** — GOAP governors produce data mutations
   but the player doesn't see rival factions building, expanding, or threatening. The AI
   is a background simulation, not a visible opponent.

5. **Narrative** — SpeechBubbleRenderer + botSpeech (US-019, US-025) provide emergent bot dialogue. Thought system remains patron AI monologue. Bots say things based on events (harvest, combat, etc.).

6. **20 planning documents** that contradict each other on priorities, completion status,
   and architectural direction.

### The Ugly

The cycle keeps repeating because:

- Plans claim completion based on **test existence**, not **visual verification**.
  `CLAUDE_UI_POLISH_PLAN.md` marks 56/56 tasks done while `FRONTEND_PLAYTEST_REPORT.md`
  (written the same day) identifies P0 crashes.

- New plans get written instead of old ones being updated. There are 20 separate plan
  files. No human or AI can hold 20 plans in working memory.

- "Fix" means "add a fallback" instead of "crash hard and trace the root cause." Silent
  fallbacks have hidden real bugs for months. The floor renderer returning null textures
  instead of crashing is why the black void wasn't caught earlier.

- Config-driven architecture: models use JSON + resolveAssetUri; floor textures use floorTextures.json + static imports (Metro). Building costs and other tuning increasingly in JSON configs.

---

## 2. What Actually Works (Verified)

Each system below has been verified by reading the source code, confirming it's wired
into the game loop, and confirming tests pass.

### Core Game Loop
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Tick orchestrator | `src/ecs/gameState.ts` | YES — 60fps setInterval | YES | **WORKS** |
| Turn system | `src/systems/turnSystem.ts` | YES — AP/MP per unit | YES (9.6k) | **WORKS** |
| End Turn flow | `src/systems/turnPhaseHandlers.ts` | YES — player→AI→env phases | YES | **WORKS** |

### Economy
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Resource pool | `src/systems/resources.ts` | YES — 11 material types | YES | **WORKS** |
| Harvest system | `src/systems/harvestSystem.ts` | YES — tick-based, consumes structures | YES | **WORKS** |
| Building placement | `src/systems/buildingPlacement.ts` | YES — 7 types, cost-check, adjacency | YES (12k) | **WORKS** |
| Fabrication queue | `src/systems/fabricationSystem.ts` | YES — Motor Pool processes queue | YES | **WORKS** |
| Motor Pool | `src/systems/motorPool.ts` | YES — spawns fabricated units | YES | **WORKS** |

### Combat & AI
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Combat | `src/systems/combat.ts` | YES — component damage, taunt | YES (13.6k) | **WORKS** |
| Hacking | `src/systems/hackingSystem.ts` | YES — signal link + capture | YES | **WORKS** |
| GOAP governors | `src/systems/governorSystem.ts` | YES — faction decision-making | YES | **WORKS** |
| AI system | `src/ai/` (50+ subsystems) | YES — `aiSystem(delta, tick)` | YES | **WORKS** |
| NavMesh pathfinding | `src/systems/navmesh.ts` | YES — A* with LRU cache | YES (13.5k) | **WORKS** |
| Yuka steering | `src/ai/steering/` | YES — seek/arrive/flee/pursue | YES | **WORKS** |

### World
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| World generation | `src/world/generation.ts` | YES — procedural ecumenopolis | YES | **WORKS** |
| Exploration/fog | `src/systems/exploration.ts` | YES — per-unit vision radius | YES | **WORKS** |
| Territory | `src/systems/territory.ts` | YES — faction ownership | YES | **WORKS** |
| Weather/storms | `src/systems/weather.ts` | YES — storm intensity cycle | YES | **WORKS** |
| Lightning | `src/systems/lightning.ts` | YES — strikes exposed cells | YES | **WORKS** |
| Signal network | `src/systems/signalNetwork.ts` | YES — relay connections | YES | **WORKS** |
| Wormhole | `src/systems/wormhole.ts` | YES — endgame portal | YES | **WORKS** |

### Progression
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Tech tree | `src/systems/techTree.ts` | YES — DAG research, real effects | YES (7.7k) | **WORKS** |
| Diplomacy | `src/systems/diplomacy.ts` | YES — standing, trade, alliances | YES (6.1k) | **WORKS** |
| Victory conditions | `src/systems/victoryConditions.ts` | YES — 3 paths, game-ending | YES (10.5k) | **WORKS** |
| Mark progression | (in bot definitions) | YES — Mark I-V multipliers | YES | **WORKS** |
| Tutorial | `src/systems/tutorialSystem.ts` | YES — 3-turn onboarding | YES (3.9k) | **WORKS** |

### Persistence
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Save games | `src/db/saveGames.ts` | YES — 4 slots + autosave | YES | **WORKS** |
| World persistence | `src/db/worldPersistence.ts` | YES — full state serialization | YES | **WORKS** |
| Autosave | `src/systems/autosave.ts` | YES — every N turns | YES | **WORKS** |

### UI
| System | File | Wired? | Tests? | Status |
|--------|------|--------|--------|--------|
| Title screen | `src/ui/TitleScreen.tsx` | YES | YES | **WORKS** |
| New Game modal | `src/ui/NewGameModal.tsx` | YES | YES | **WORKS** |
| Game HUD | `src/ui/panels/GameHUD.tsx` | YES — resources, turn, end turn | YES | **WORKS** |
| Radial menu | `src/ui/RadialMenu.tsx` | YES — provider-based actions | YES | **WORKS** |
| Pause menu | `src/ui/PauseMenu.tsx` | YES | YES | **WORKS** |
| Tech tree modal | `src/ui/TechTreeModal.tsx` | YES | YES | **WORKS** |
| Diplomacy modal | `src/ui/DiplomacyModal.tsx` | YES | YES | **WORKS** |
| Victory overlay | `src/ui/VictoryOverlay.tsx` | YES | YES | **WORKS** |

### Rendering (39 components, all mounted in App.tsx)
| Renderer | Status |
|----------|--------|
| StormSky, StormLighting, StormParticles | **WORKS** — storm visuals |
| LightningSystem | **WORKS** — visible strikes |
| UnitRenderer, GlowRingRenderer | **WORKS** — units with activity rings |
| CombatEffectsRenderer | **WORKS** — attack flash, damage |
| HackingBeamRenderer | **WORKS** — signal beams |
| TurretAttackRenderer | **WORKS** — auto-fire visuals |
| HarvestVisualRenderer | **WORKS** — dissolve + material cubes |
| ConstructionRenderer | **WORKS** — staged building |
| InstancedBuildingRenderer | **WORKS** — 1000+ structures |
| ParticleRenderer | **WORKS** — spark, smoke, dust, energy |
| TerritoryBorderRenderer, TerritoryFillRenderer | **WORKS** — faction shading |
| BreachZoneRenderer | **WORKS** — cultist rifts |
| StructuralFloorRenderer | **FIX APPLIED** — was black void, now reads live discovery |
| NetworkLineRenderer | **WORKS** — signal network beams |
| CityRenderer | **WORKS** — city site portals |
| MemoryFragmentRenderer | **WORKS** — lore markers |
| MovementOverlayRenderer, PathPreviewRenderer | **WORKS** — movement UI |
| ActionRangeRenderer | **WORKS** — range circles |
| WormholeRenderer | **WORKS** — endgame portal |
| ShadowSystem, StormEnvironment, PostProcessing | **WORKS** — lighting & effects |

---

## 3. What Exists But Doesn't Work Right

These systems have code and tests but have known issues that prevent them from functioning
correctly at runtime.

### 3.1 Floor Rendering (FIXED THIS SESSION — UNVERIFIED VISUALLY)

**Problem**: `StructuralFloorRenderer.tsx` read `discovery_state` from a stale DB snapshot
(`getActiveWorldSession().sectorCells`) while `explorationSystem()` writes to a separate
in-memory store (`structuralSpace`). Result: all cells appear as `discovery_state: 0` →
filtered out → black void.

**Fix applied**: Renderer now reads live discovery state from `structuralSpace` via
`getStructuralCellRecords()`. Also added fail-hard throws for missing texture mappings.

**Remaining risk**: Fix has NOT been visually verified in browser. The ~20 pre-discovered
cells near home_base should render immediately on new game start.

**Reference**: [`src/rendering/StructuralFloorRenderer.tsx`](../../src/rendering/StructuralFloorRenderer.tsx)

### 3.2 Floor Textures — Partially Config-Driven

**Current state**: `floorTextures.json` defines zone structure; `floorTextureAssets.ts` imports the JSON and uses static ESM imports for texture assets (Metro requires static imports for image bundling). Zone labels and structure are config-driven; adding a new zone requires both a JSON entry and a TS mapping.

**Impact**: Adding zones requires code changes. Less severe than before — JSON config exists and drives zone structure. Full runtime resolution would need a different asset pipeline (e.g. resolveAssetUri for textures if Metro supports it).

**Reference**: [`src/config/floorTextureAssets.ts`](../../src/config/floorTextureAssets.ts),
[`src/config/floorTextures.json`](../../src/config/floorTextures.json),
[`src/city/config/floorMaterialPresets.ts`](../../src/city/config/floorMaterialPresets.ts)

### 3.3 AI Factions Are Invisible

**Problem**: GOAP governors compute decisions and mutate ECS state, but the visual impact
is minimal. Rival factions don't visibly:
- Build structures the player can see being constructed
- Expand territory in ways the player notices
- Send units that the player encounters and must deal with
- Compete for the same resources or structures

The AI is a background simulation. A player watching the screen doesn't see opponents
doing things.

**Fix needed**: AI actions must produce visible world changes. When a rival faction builds,
the player should see construction. When rivals expand, territory borders should shift.
When rivals scout, their units should appear near the player's fog edge.

### 3.4 Narrative Is Scripted, Not Emergent

**Problem**: `narrative.ts` fires predetermined thoughts at trigger points (first combat,
breach discovered, tech unlocked). This is a scripted story system, not emergent bot
personality.

**What the game needs**: Individual bots should have speech profiles and sporadically
produce contextual dialogue during gameplay — "Scrap yield's good here," "Storm's
picking up," "Hostile spotted." This creates organic world-feel without scripted blocks.

**Fix needed**: Bot speech bubble system driven by bot archetype + current activity +
world state. Not interactive fiction. Not story blocks. Emergent commentary.

**Reference**: [`src/systems/narrative.ts`](../../src/systems/narrative.ts)

### 3.5 Chunk Streaming Not Implemented

**Problem**: `VIEWPORT_CHUNK_PIVOT.md` describes chunk-based infinite world generation as
foundational architecture. The actual implementation uses a fixed grid generated entirely
at new-game time. There is no:
- Chunk boundary system
- Camera-driven loading/unloading
- Delta persistence (save only modifications)
- Infinite exploration

**Impact**: World size is fixed. Performance degrades with world size. Can't implement the
"limitless ecumenopolis" described in [design/GAME_DESIGN.md](../design/GAME_DESIGN.md).

**Status**: Architecture designed (VIEWPORT_CHUNK_PIVOT.md), zero code exists.

---

## 4. What's Missing Entirely

These have NO code, NO tests, and are NOT wired into anything.

### 4.1 Config-Driven Asset Pipeline (PARTIAL)

Models use JSON manifest + `resolveAssetUri()`. Floor textures: `floorTextures.json` defines zones; `floorTextureAssets.ts` uses static ESM imports for Metro bundling. Partially config-driven. Full runtime texture resolution would need different pipeline.

### 4.2 Bot Speech (IMPLEMENTED)

SpeechBubbleRenderer (US-019) and botSpeech (US-025) exist: 6 event types, proximity filtering, archetype lines. Bubbles billboard above entities. Thought system remains patron AI monologue; bot speech is emergent.

### 4.3 Chunk-Based World Streaming (IMPLEMENTED)

Chunk math, loader, discovery, deltas, per-chunk InstancedBuildingRenderer, ChunkLoaderSync — all implemented (US-027 through US-032, PRD 4.1). Viewport-driven loading wired to camera.

### 4.4 Cultist Visual Identity (PARTIAL — PRD 2.1)

unitVisuals.json: cultist tint, emissive, auraColor. UnitRenderer + GlowRingRenderer use getCultistVisualConfig(). Visually distinct. Cultist-specific 3D models remain a gap (ASSETS.md).

### 4.5 Storm/Lightning/Wormhole VFX Coherence

Individual renderers exist (StormSky, LightningSystem, WormholeRenderer) but they don't
form a cohesive visual spectacle. The wormhole at the hypercane eye should be a
persistent environmental presence, not just an endgame structure.

### 4.6 Mark Upgrade Flow (IMPLEMENTED — PRD 2.3)

Radial "Upgrade" when unit adjacent to Motor Pool. getMarkUpgradeCost from upgrades.json. Tier gates (Basic→II, Elite→V). motorPool.test.ts covers costs and gates.

### 4.7 Cultist Escalation (IMPLEMENTED — PRD 2.5)

cultists.json: territoryMilestones, spawnIntervals, maxEnemiesPerTier. getEscalationTier, getTierSpawnInterval. cultistIncursion.test.ts covers scaling.

---

## 5. Plan Contradictions & Document Debt

### Contradiction 1: CLAUDE_UI_POLISH_PLAN vs FRONTEND_PLAYTEST_REPORT

Both written 2026-03-12. The polish plan marks 56/56 tasks complete and claims P0 crashes
are fixed. The playtest report (written the same day) identifies 3 P0 crashes and 12
high-severity issues.

**Resolution**: The polish plan's completion claims are premature. Tasks were marked done
based on code changes, not visual verification. The playtest report is the truth.

### Contradiction 2: NEXT_STEPS vs VIEWPORT_CHUNK_PIVOT

`NEXT_STEPS.md` puts chunk generation as Priority 12 (Sprint 5, last).
`VIEWPORT_CHUNK_PIVOT.md` describes chunk generation as the foundational architecture
that everything else depends on.

**Resolution**: Chunk generation is an architecture decision, not a polish item.
It should be addressed in Phase 3 (Architecture) of this gameplan, not deferred to
the end.

### Contradiction 3: ECUMENOPOLIS_IMPLEMENTATION_CHECKLIST completion tracking

Claims ~30-40% completion with many items marked "IN PROGRESS," but the items marked
complete don't match what's actually in the codebase. Some "complete" items refer to
documentation that doesn't exist.

**Resolution**: This checklist is abandoned as a tracking mechanism. This gameplan
replaces it.

### Contradiction 4: BOT_AND_ECONOMY_REDESIGN resource types vs actual code

The redesign doc specifies 8 material types. The actual `resources.ts` has 11 types.
The mapping between design doc names and code names is unclear.

**Resolution**: The code's 11 types are canonical. The design doc's 8-type model was
a proposal that evolved during implementation.

### Contradiction 5: 20 plans, zero canonical roadmap

There are 20 planning documents. Many overlap. Some contradict each other. None of
them is authoritative. This is why the same work gets repeated.

**Resolution**: This document is the canonical roadmap. All 20 previous plans are
demoted to reference/historical status.

---

## 6. Obsolete Documents

These documents are **historically interesting but no longer authoritative**.
Do NOT use them for planning or implementation decisions.

| Document | Status | Reason |
|----------|--------|--------|
| `plans/TILE_OVERLAY_COMPOSITION.md` | **OBSOLETE** | Explicitly marked "historical" in the file |
| `plans/UI_REFINEMENT_EXECUTION_PLAN.md` | **SUPERSEDED** | Replaced by `CLAUDE_UI_POLISH_PLAN.md` |
| `plans/WORLD_CITY_COMPLETION_PR_PLAN.md` | **COMPLETED** | Branch completed, PR merged |
| `plans/WORLD_CITY_TEST_PLAN.md` | **COMPLETED** | Tests written, branch merged |
| `plans/ASSET_LIBRARY_REORGANIZATION.md` | **COMPLETED** | Asset library reorganized |
| `plans/YUKA_AUDIT.md` | **COMPLETED** | Yuka integration done |
| `docs/BRANCH_REVIEW_AND_REALIGNMENT.md` | **HISTORICAL** | Branch-specific review |
| `docs/SPATIAL_REPLACEMENT_AUDIT.md` | **HISTORICAL** | One-time audit |

### Documents That Remain Valuable As Reference

| Document | Use As |
|----------|--------|
| `plans/BOT_AND_ECONOMY_REDESIGN.md` | Reference for material types, bot archetypes, Mark progression design |
| `plans/VIEWPORT_CHUNK_PIVOT.md` | Reference for chunk architecture when implementation begins |
| `plans/AI_SYSTEM_MAP.md` | Reference for AI subsystem layout |
| `plans/AI_REQUIREMENTS.md` | Reference for AI behavior requirements |
| `plans/STORM_WEATHER_VISUAL_SYSTEM.md` | Reference for storm VFX spec |
| `plans/CITY_CONFIG_PIPELINE.md` | Reference for city asset pipeline |
| `plans/CITY_KIT_AUDIT.md` | Reference for structural kit coverage |
| `plans/MOBILE_4X_VIEWPORT_DESIGN.md` | Reference for mobile layout spec |
| `plans/FRONTEND_PLAYTEST_REPORT.md` | Reference for known UI issues |
| `plans/CLAUDE_UI_POLISH_PLAN.md` | Reference for UI work already done (with caveats about premature completion claims) |
| `plans/NEXT_STEPS.md` | Reference for sprint-style task breakdown |
| `plans/ECUMENOPOLIS_IMPLEMENTATION_CHECKLIST.md` | Reference for implementation ledger |

---

## 7. Architecture Gaps

### 7.1 Config-Driven Assets (CRITICAL)

**Current state**: Models use JSON manifest + `resolveAssetUri()`. Floor textures: `floorTextures.json` for zone structure; `floorTextureAssets.ts` uses static ESM imports (Metro requirement). Zone structure is config-driven; asset mapping is code.

**Target state** (stretch): Full runtime texture resolution if Metro supports it. Current state is acceptable for 1.0.

**Files**: `floorTextures.json` exists; `floorTextureAssets.ts` bridges JSON config to bundled assets.
- `src/city/config/floorMaterialPresets.ts` → consume JSON config
- `src/rendering/StructuralFloorRenderer.tsx` → already uses `resolveAssetUri()` for texture loading

### 7.2 Dual Data Store (FIXED — VERIFY)

**Current state**: Fix applied in `StructuralFloorRenderer.tsx` to read from
`structuralSpace` instead of stale DB snapshot.

**Target state**: ONE source of truth for discovery state during gameplay. DB is for
persistence. `structuralSpace` is for runtime. Renderers read runtime. Persistence
writes to DB.

**Verification needed**: Launch game in browser, confirm floor renders.

### 7.3 Chunk Architecture (FUTURE)

**Current state**: Fixed grid, no streaming.

**Target state**: Viewport-driven chunk generation per `VIEWPORT_CHUNK_PIVOT.md`.

**Dependency**: Not required for 1.0 playability. Required for "infinite ecumenopolis"
vision. Can ship a playable game with fixed grid.

### 7.4 Fail-Hard Asset Loading (PARTIALLY DONE)

**Current state**: `StructuralFloorRenderer.tsx` now throws on missing texture mappings.
`resolveAssetUri()` throws on empty strings. But other asset loading paths may still
have silent fallbacks.

**Target state**: EVERY asset load path crashes on failure. Zero silent fallbacks.
If an asset is missing, the game crashes with a clear error message naming the
missing asset.

**Audit needed**: Search codebase for `?? null`, `?? undefined`, `catch` blocks in
asset loading, and `|| fallback` patterns in texture/model/audio loading.

---

## 8. Execution Roadmap: 6 Phases to 1.0

### Phase 0: Verify & Stabilize (IMMEDIATE)
> Make what exists actually work visually.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 0.1 | **Verify floor renders in browser** — launch game, confirm ~20 pre-discovered cells visible | P0 | `StructuralFloorRenderer.tsx` |
| 0.2 | **Verify radial menu triggers actions** — select unit, right-click, harvest/build/move | P0 | `RadialMenu.tsx`, `radialProviders.ts` |
| 0.3 | **Verify turn system gates actions** — AP/MP actually depleted, End Turn refreshes | P0 | `turnSystem.ts` |
| 0.4 | **Verify save/load round-trips** — save → quit → load → same state | P0 | `saveGames.ts`, `worldPersistence.ts` |
| 0.5 | **Remove ALL silent asset fallbacks** — audit and replace with hard crashes | P0 | Codebase-wide |

**Exit criteria**: A player can launch the game, see the world, select a unit, move it
(spending MP), harvest a structure (spending AP), end their turn, and save/load.

### Phase 1: Visible AI & Emergent Narrative
> Make the world feel alive.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1.1 | **Bot speech bubble system** — archetype-driven contextual dialogue during gameplay | P0 | NEW: `src/systems/botSpeech.ts`, `src/ui/panels/SpeechBubble.tsx` |
| 1.2 | **AI faction actions produce visible changes** — construction, expansion, unit movement visible to player | P0 | `governorSystem.ts`, renderers |
| 1.3 | **Rival faction encounters** — player sees rival scouts near fog edge, rival territory expansion | P1 | `aiSystem`, `explorationSystem` |
| 1.4 | **Cultist visual identity** — distinct models or at minimum distinct color/effect on existing hostile models | P1 | Asset pipeline, `UnitRenderer.tsx` |
| 1.5 | **Cultist escalation** — reactive to player expansion, not just time-based | P2 | `cultistIncursion.ts` |

**Exit criteria**: During normal gameplay, the player sees: bots occasionally saying things,
rival factions building/expanding visibly, and cultist threats that respond to player growth.

### Phase 2: Config-Driven Asset Pipeline
> Make the architecture match the design docs.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 2.1 | **Floor textures to JSON config** — replace `floorTextureAssets.ts` hardcoded imports | P0 | `floorTextureAssets.ts` → JSON |
| 2.2 | **Unified asset resolution** — all assets (model, texture, audio, UI) through `resolveAssetUri()` | P1 | Codebase-wide |
| 2.3 | **Fail-hard audit** — search for silent fallbacks in all asset loading, replace with throws | P1 | Codebase-wide |
| 2.4 | **Asset manifest validation** — startup check that all referenced assets exist | P2 | NEW: `src/config/assetValidation.ts` |

**Exit criteria**: Zero hardcoded asset paths in source code. All assets defined in JSON.
Missing asset = hard crash with clear error.

### Phase 3: World Architecture
> Make the world scale.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 3.1 | **Chunk boundary system** — define chunk size, coordinate mapping, deterministic seeding | P1 | NEW: `src/world/chunks.ts` |
| 3.2 | **Camera-driven chunk loading** — load chunks within viewport radius, unload distant | P1 | `src/rendering/`, camera system |
| 3.3 | **Delta persistence** — save only player modifications per chunk | P1 | `src/db/worldPersistence.ts` |
| 3.4 | **Fog of war per chunk** — discovery state stored and streamed with chunks | P1 | `explorationSystem.ts`, `structuralSpace.ts` |
| 3.5 | **Structure renderer per chunk** — instanced rendering scoped to loaded chunks | P2 | `InstancedBuildingRenderer.tsx` |

**Exit criteria**: World generates on-demand as camera moves. Only player modifications
are saved. Performance doesn't degrade with exploration distance.

**Note**: Phase 3 can be deferred if a playable fixed-grid game is the immediate goal.
It's required for the "infinite ecumenopolis" vision but not for a fun 1.0.

### Phase 4: Visual Polish
> Make what works look right.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 4.1 | **Floor fills viewport** — no dark void edges, smooth zone transitions | P1 | `StructuralFloorRenderer.tsx` |
| 4.2 | **Storm/wormhole spectacle** — cohesive environmental presence | P2 | Storm renderers, `WormholeRenderer.tsx` |
| 4.3 | **Construction animation** — visible staged building (foundation→shell→operational) | P2 | `ConstructionRenderer.tsx` |
| 4.4 | **Unit visual fidelity** — Mark indicators, role badges, damage states | P2 | `UnitRenderer.tsx` |
| 4.5 | **Zone transition blending** — soft blends between floor biomes | P2 | `StructuralFloorRenderer.tsx` (blend edges exist, tune) |

**Exit criteria**: The game looks like the industrial machine-consciousness aesthetic
described in [interface/UI_DESIGN.md](../interface/UI_DESIGN.md).

### Phase 5: Gameplay Depth
> Make the game strategic.

| # | Task | Priority | Files |
|---|------|----------|-------|
| 5.1 | **Mark upgrade UI** — radial action on Motor Pool for unit upgrades | P1 | `radialProviders.ts`, `motorPool.ts` |
| 5.2 | **Hacking capture flow** — hack hostile bot → convert to player faction | P1 | `hackingSystem.ts`, UI |
| 5.3 | **Tech tree effects visible** — completed techs change gameplay noticeably | P2 | `techTree.ts`, various systems |
| 5.4 | **Diplomacy consequences** — trade, alliance, war affect gameplay | P2 | `diplomacy.ts` |
| 5.5 | **Victory pacing** — game duration feels right, conditions achievable but challenging | P2 | `victoryConditions.ts` |

**Exit criteria**: A player can win a full campaign through any of the 3 victory paths
with meaningful strategic decisions throughout.

---

## 9. Design Document Index

### Canonical Design Documents (AUTHORITATIVE)

These documents define what the game IS. Implementation must align with them. Paths are under `docs/`; see [docs/AGENTS.md](../AGENTS.md) for the full index.

| Document | Domain | Key Content |
|----------|--------|-------------|
| [design/GAME_DESIGN.md](../design/GAME_DESIGN.md) | Core vision | 4X pillars, progression, factions, victory |
| [technical/ARCHITECTURE.md](../technical/ARCHITECTURE.md) | Architecture | Tech stack mandates, platform constraints, core formulas |
| [design/LORE.md](../design/LORE.md) | World context | 140-year timeline, Earth history, faction origins |
| [technical/WORLD_SYSTEMS.md](../technical/WORLD_SYSTEMS.md) | Spatial model | Unified ecumenopolis, sector types, no outdoor/city split |
| [interface/UI_DESIGN.md](../interface/UI_DESIGN.md) | Visual language | Industrial aesthetic, color palette, component requirements |
| [interface/INPUT.md](../interface/INPUT.md) | Interaction model | Radial menu as sole contextual surface, input mappings |
| [design/FACTIONS.md](../design/FACTIONS.md) | Faction design | 4 rival factions, campaign structure |
| [design/ECONOMY.md](../design/ECONOMY.md) | Economy/turns | AP/MP system, resource flow, building costs |
| [design/BOTS.md](../design/BOTS.md) | Unit design | 9 chassis, archetypes, Mark I–V, speech |
| [technical/ASSETS.md](../technical/ASSETS.md) | Asset pipeline | Structural GLBs, robot chassis, ingestion |
| [technical/RENDERING.md](../technical/RENDERING.md) | Rendering | 39 renderers, storm, floor zones |
| [design/OPEN_QUESTIONS.md](../design/OPEN_QUESTIONS.md) | Unresolved decisions | Open design questions requiring answers |

### Reference Documents

| Document | Purpose |
|----------|---------|
| [AGENTS.md](../AGENTS.md) | Documentation index and agent session protocol |

---

## 10. Plan Document Consolidation Map

All 20 documents in `docs/plans/` mapped to their status and what replaces them.

| Document | Status | Replaced By |
|----------|--------|-------------|
| `NEXT_STEPS.md` | **SUPERSEDED** | This document (Phase 0-5 roadmap) |
| `VIEWPORT_CHUNK_PIVOT.md` | **REFERENCE** | This document (Phase 3); original preserved as architecture spec |
| `ECUMENOPOLIS_IMPLEMENTATION_CHECKLIST.md` | **SUPERSEDED** | This document (all phases) |
| `BOT_AND_ECONOMY_REDESIGN.md` | **REFERENCE** | Preserved as design spec for material types, bot archetypes, Mark progression |
| `CLAUDE_UI_POLISH_PLAN.md` | **SUPERSEDED** | This document (Phase 0, Phase 4); progress log preserved as historical record |
| `FRONTEND_PLAYTEST_REPORT.md` | **REFERENCE** | Preserved as known-issues record; fixes tracked in Phase 0 |
| `AI_FOUNDATION_PLAN.md` | **REFERENCE** | AI architecture is implemented; original plan preserved |
| `AI_REQUIREMENTS.md` | **REFERENCE** | AI behavior requirements doc; still valid for Phase 1 |
| `AI_SYSTEM_MAP.md` | **REFERENCE** | AI subsystem layout; still accurate |
| `AI_TEST_STRATEGY.md` | **COMPLETED** | AI tests written and passing |
| `ASSET_LIBRARY_REORGANIZATION.md` | **COMPLETED** | Asset library reorganized |
| `CITY_CONFIG_PIPELINE.md` | **REFERENCE** | City asset pipeline spec; still valid |
| `CITY_KIT_AUDIT.md` | **REFERENCE** | Structural kit coverage audit; still valid |
| `MOBILE_4X_VIEWPORT_DESIGN.md` | **REFERENCE** | Mobile layout spec; still valid for responsive work |
| `STORM_WEATHER_VISUAL_SYSTEM.md` | **REFERENCE** | Storm VFX spec; relevant to Phase 4 |
| `TILE_OVERLAY_COMPOSITION.md` | **OBSOLETE** | Explicitly marked historical |
| `UI_REFINEMENT_EXECUTION_PLAN.md` | **OBSOLETE** | Superseded by `CLAUDE_UI_POLISH_PLAN.md` |
| `WORLD_CITY_COMPLETION_PR_PLAN.md` | **COMPLETED** | Branch merged |
| `WORLD_CITY_TEST_PLAN.md` | **COMPLETED** | Tests written |
| `YUKA_AUDIT.md` | **COMPLETED** | Yuka integration done |

---

## Appendix A: The Rules Going Forward

### Rule 1: One Plan

This document is the plan. Do not create new planning documents. Update this one.

### Rule 2: Verify Visually

A task is not "done" until it's been verified in the browser. Tests passing ≠ feature
working. If you can't launch the game and see it, it's not done.

### Rule 3: Crash Hard

Missing assets, missing configs, missing data → **CRASH WITH A CLEAR ERROR**.
Never add fallbacks. Never return null. Never swallow exceptions.
The user has been extremely clear about this.

### Rule 4: Config Over Code

Asset paths, building costs, material types, texture sets, audio cues — all of these
belong in JSON config files, not in TypeScript source code. If you're typing a file
path or a numeric constant into a `.ts` file, you're doing it wrong.

### Rule 5: Emerge, Don't Script

Narrative should emerge from bot behavior, world state, and player actions. Not from
scripted story blocks, interactive fiction segments, or predetermined thought sequences.
Bots should say things because they're doing things, not because a trigger fired.

### Rule 6: One Source of Truth

For any piece of game state, there must be exactly ONE authoritative store:
- During gameplay: ECS (Koota) or module-level state (with `_reset()`)
- For persistence: SQLite database
- For config: JSON files in `src/config/`
- For design: canonical docs in `docs/`
- For execution: this document

Never create a second store that shadows the first. The floor renderer dual-data-store
bug is the canonical example of what happens when this rule is violated.

---

## Appendix B: Quick Reference — What Tests What

| Test File | What It Verifies |
|-----------|-----------------|
| `src/systems/__tests__/turnSystem.test.ts` | AP/MP budgeting, turn phases |
| `src/systems/__tests__/combat.test.ts` | Component damage, taunt, formations |
| `src/systems/__tests__/buildingPlacement.test.ts` | Placement validation, costs, adjacency |
| `src/systems/__tests__/resources.test.ts` | Resource pool operations |
| `src/systems/__tests__/techTree.test.ts` | Research DAG, effects |
| `src/systems/__tests__/diplomacy.test.ts` | Standing, trade, factions |
| `src/systems/__tests__/victoryConditions.test.ts` | 3 victory paths |
| `src/systems/__tests__/navmesh.test.ts` | A* pathfinding correctness |
| `src/systems/__tests__/tutorialSystem.test.ts` | 3-turn onboarding flow |
| `src/config/assetUri.test.ts` | Asset URI resolution |
| `src/db/__tests__/saveGames.test.ts` | Save slot CRUD |
| `src/db/__tests__/bootstrap.test.ts` | Database schema |
| `maestro/flows/*.yaml` | E2E (Maestro: title, title-web, onboarding, ai-playtest) |

---

## Appendix C: File Counts

| Category | Count |
|----------|-------|
| Total `.ts`/`.tsx` files | 417+ |
| Source files (non-test) | 279+ |
| Test files | 127 |
| Test suites | 127 |
| Individual tests | 2,431 |
| TypeScript errors | 0 |
| Renderer components | 39 |
| Game systems (ticked per frame) | 21 |
| JSON config files | 23+ |
| Plan documents | 20 |
| Design documents | 16 |

---

*This document replaces all previous planning documents as the canonical execution
roadmap. Previous plans are preserved as reference material. Update THIS document,
not the old ones.*
