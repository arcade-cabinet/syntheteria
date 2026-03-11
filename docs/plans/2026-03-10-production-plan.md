# Syntheteria Production Plan

**Date:** 2026-03-10
**Goal:** Ship a complete, tested, documented first-person 4X factory game — 300-400 files minimum, production quality
**Current State:** 205 test suites green (6463 tests), ~280 files, core loop stubbed, UI communicates wrong game

---

## Design Source of Truth

All design decisions come from these GDDs in `docs/design/`:

| GDD | Topic | Status |
|-----|-------|--------|
| 002 | Koota ECS + Expo/Metro + JSON config migration | Active |
| 003 | 4X framework, contextual interaction, Yuka governors, race selection | Active |
| 004 | Core game loop — harvesting, cubes, compression, furnace | Active |
| 005 | Visual identity — procedural geometry, PBR, faction visuals | Active |
| 006 | Cube building economy | Active |
| 007 | Lore and narrative (96KB) | Complete |
| 008 | Alien natives — Ferrovores + Residuals unified ecosystem | Complete |
| 009 | Governor architecture | Active |
| 010 | Pregame lobby — patron/map/rivals/settings | Active |
| 011 | Victory conditions (50KB) | Complete |
| 012 | Economy balance | Active |
| 013 | Combat system | Active |
| 014 | Environment systems | Active |

---

## Architecture Overview

```
Player Input (FPS Camera + Contextual Click)
    ↓
ECS World (Koota traits + reactive queries)
    ↓
Systems (harvesting, compression, furnace, belts, combat, AI, quests)
    ↓
Rendering (R3F + Three.js + instanced meshes + PBR materials)
    ↓
Physics (Rapier WASM — cubes, collisions, raycasts)
    ↓
Audio (Tone.js — spatial SFX, ambient, music)
    ↓
Persistence (expo-sqlite native / IndexedDB web)
```

### Data Flow

```
config/*.json → game/config/index.ts (typed imports)
    ↓
ECS traits define entity shape
    ↓
Systems query traits, process game logic, emit events
    ↓
Event bus distributes: quest events, audio events, UI updates
    ↓
React components subscribe to ECS state via hooks
    ↓
R3F renders 3D scene, HTML overlay renders HUD
```

---

## Execution Phases

### Phase A: Foundation (blocks everything downstream)

**Goal:** Green tests, safe types, error handling — the codebase is trustworthy.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 39 | Audit/fix 20+ non-null assertions | Across src/ | — |
| 40 | Fix unsafe type casts in AI/GOAP/events | src/ai/, src/systems/eventBus.ts | — |
| 41 | Tests: ECS Koota integration (8 files) | src/ecs/koota/__tests__/ | — |
| 42 | Tests: AI system (8 files) | src/ai/__tests__/ | — |
| 43 | Tests: Audio system (8 files) | src/audio/__tests__/ | — |
| 44 | Tests: Rendering system (16 files) | src/rendering/__tests__/ | — |
| 45 | Tests: Save/Load, Physics, Input (9 files) | Various __tests__/ | — |
| 46 | Tests: 6 untested UI components | src/ui/__tests__/ | — |
| 47 | Tests: 12 rendering components | src/rendering/__tests__/ | — |

**Parallelism:** All 9 tasks are independent. Run all concurrently.
**Exit criteria:** 250+ test suites green. Zero non-null assertions. Zero unsafe casts.

---

### Phase B: Core Loop (the game's reason to exist)

**Goal:** Player can harvest → compress → grab → carry → furnace → craft. The complete GDD-004 loop works.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 85 | Harvester mechanic (grind → powder) | src/systems/harvesting.ts | — |
| 106 | Screen shake system | src/systems/screenShake.ts | — |
| 91 | Ore deposit procgen + rendering | src/rendering/procgen/OreDepositGenerator.ts | — |
| 86 | Compression mechanic (powder → cube) | src/systems/compression.ts | 85, 106 |
| 90 | Contextual interaction (raycast → menu) | src/input/ObjectSelectionSystem.tsx | 85 |
| 87 | Grabber tool (magnetic beam) | src/systems/grabber.ts | 86 |
| 88 | Belt transport (physical cubes) | src/systems/beltTransport.ts | 87 |
| 89 | Furnace interaction (hopper → recipe → output) | src/systems/furnaceProcessing.ts | 87 |
| 107 | Particle systems (harvest, compression, etc.) | src/rendering/particles/ | — |
| 105 | Notification/toast system | src/ui/NotificationSystem.tsx | — |

**Parallelism:** 85, 106, 91, 107, 105 can run concurrently. Then 86+90. Then 87. Then 88+89.
**Exit criteria:** Player can complete full core loop: walk to deposit → grind → compress → pick up cube → carry to furnace → craft tool.

---

### Phase C: UI/UX Redesign (communicate the right game)

**Goal:** Every screen communicates "factory colonization on a machine planet" per GDD-010.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 48 | Redesign TitleScreen | src/ui/TitleScreen.tsx | — |
| 49 | Rebuild PregameScreen (patron/map/rivals) | src/ui/PregameScreen.tsx + sub-components | 48 |
| 50 | Update in-game HUD (faction colors, terminology) | src/ui/FPSHUD.tsx, CoreLoopHUD.tsx, etc. | 49 |
| 51 | Visual verification in browser | — | 48, 49, 50 |
| 101 | Settings screen | src/ui/SettingsScreen.tsx | — |
| 102 | Pause menu | src/ui/PauseMenu.tsx | — |
| 103 | Loading screen with progress | src/ui/LoadingScreen.tsx | — |

**Parallelism:** 48, 101, 102, 103 can run concurrently. Then 49. Then 50. Then 51.
**Exit criteria:** Full flow: title → pregame (patron selection) → loading → game with faction HUD.

---

### Phase D: Config & Data Completion

**Goal:** Every system has complete, validated JSON config data.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 52 | Complete economy.json | config/economy.json | — |
| 53 | Complete biomes.json (5 biomes) | config/biomes.json | — |

**Parallelism:** Both independent.
**Exit criteria:** All config files have complete data. Cross-references valid.

---

### Phase E: AI Systems (civilizations that play the game)

**Goal:** AI civilizations autonomously harvest, build, expand, fight using Yuka GOAP + Vehicle steering.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 63 | Wire Yuka Vehicle steering | src/ai/BotVehicle.ts, YukaManager.ts | — |
| 64 | Wire Yuka NavMesh pathfinding | src/ai/NavMeshBuilder.ts | 63 |
| 65 | Wire GOAP governors to behavior | src/ai/goap/CivilizationGovernor.ts | — |
| 66 | Unit-level GOAP brain | src/ai/BotBrain.ts | 63 |
| 56 | Formation movement (OffsetPursuit) | src/systems/formationMovement.ts | 63 |
| 61 | Cultist faction AI | src/systems/cultistAI.ts | 65 |

**Parallelism:** 63 and 65 concurrently. Then 64, 66, 56 concurrently. Then 61.
**Exit criteria:** AI factions visibly harvest ore, compress cubes, build structures, patrol, and fight.

---

### Phase F: Incomplete Systems

**Goal:** Finish all partially-implemented game systems.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 55 | Storm system (weather + lightning + damage) | src/systems/stormEscalation.ts | — |
| 58 | Signal network (failure conditions) | src/systems/signalNetwork.ts | — |
| 59 | Cube stacking physics (topple/collapse) | src/systems/cubeStacking.ts | — |
| 60 | Raid mechanics (theft/defense) | src/systems/raidSystem.ts | — |
| 57 | Hacking system (compute costs) | src/systems/hacking.ts | 58 |
| 62 | Procedural quest generation | src/systems/proceduralQuests.ts | — |

**Parallelism:** 55, 58, 59, 60, 62 concurrently. Then 57.
**Exit criteria:** All systems fully functional with tests.

---

### Phase G: Visual Identity (the game looks like itself)

**Goal:** Industrial mechanical PBR aesthetic. Faction-distinct visuals. No flat colors.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 67 | Panel-based procedural geometry | src/rendering/procgen/PanelGeometry.ts | — |
| 68 | MaterialFactory (PBR from JSON) | src/rendering/materials/MaterialFactory.ts | — |
| 69 | NormalMapComposer (layered details) | src/rendering/materials/NormalMapComposer.ts | — |
| 71 | Cube PBR materials (9 ore types) | config/cubeMaterials.json, renderers | — |
| 70 | BotGenerator (faction bots) | src/rendering/procgen/BotGenerator.ts | 67 |
| 110 | Otter hologram rendering | src/rendering/HologramRenderer.tsx | — |
| 108 | HDRI environment + post-processing | src/rendering/EnvironmentSetup.tsx | — |
| 109 | Instanced rendering + LOD | src/rendering/InstancedCubeManager.ts | — |

**Parallelism:** 67, 68, 69, 71, 110, 108, 109 concurrently. Then 70.
**Exit criteria:** Zero meshLambertMaterial. All materials PBR. Faction bots visually distinct.

---

### Phase H: 4X Features

**Goal:** Territory, fog of war, diplomacy, tech tree — the 4X layer on top of the factory.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 72 | Territory claiming (outposts, borders) | new system | — |
| 73 | Fog of war (hidden/explored/visible) | new system | — |
| 75 | Tech tree progression UI | src/ui/TechTreePanel.tsx | — |
| 74 | Diplomacy (trade, alliances) | new system | — |
| 98 | Victory conditions | src/systems/victoryConditions.ts | — |
| 99 | Procedural terrain generation | src/systems/terrainGeneration.ts | — |
| 100 | Minimap | src/ui/Minimap.tsx | 72, 73 |

**Parallelism:** 72, 73, 75, 74, 98, 99 concurrently. Then 100.
**Exit criteria:** Full 4X game playable with territory, fog, tech, diplomacy, victory.

---

### Phase I: Audio

**Goal:** Every game action has sound. Spatial audio. Adaptive music. Biome ambience.

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 92 | Spatial audio system (Tone.js) | src/audio/SoundEngine.ts, SpatialAudio.ts | — |
| 93 | Factory + combat SFX | src/audio/FactoryAudio.ts, GameSounds.ts | 92 |
| 94 | Ambient soundscapes + storm audio | src/audio/StormAmbience.ts | 92 |
| 95 | Adaptive music system | src/audio/MusicSystem.ts | 92 |

**Parallelism:** 92 first. Then 93, 94, 95 concurrently.
**Exit criteria:** Every interaction has audio feedback. Biomes sound different. Music adapts.

---

### Phase J: Save/Load + Persistence

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 96 | Save/load (expo-sqlite + IndexedDB) | src/save/ | — |
| 97 | Save slot management UI | src/ui/SaveLoadMenu.tsx | 96 |

**Exit criteria:** Save captures full state. Load restores. Auto-save works.

---

### Phase K: Performance + Polish

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 76 | useMemo/useCallback for 18 UI components | src/ui/*.tsx | — |
| 77 | Asset lazy loading + mobile throttling | rendering integration | — |
| 116 | FPS camera polish (head bob, sprint) | src/input/FPSMovement.ts | — |
| 104 | Tutorial/onboarding overlay | src/ui/TutorialOverlay.tsx | Core loop (B) |

**Parallelism:** 76, 77, 116 concurrently. 104 after Phase B.

---

### Phase L: Accessibility + Responsive

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 78 | ARIA labels for 17 components | src/ui/*.tsx | — |
| 79 | Keyboard navigation (menus, tech tree) | src/ui/*.tsx | — |
| 80 | aria-live regions (HUD, notifications) | src/ui/*.tsx | — |
| 81 | Tablet media queries + landscape | src/ui/*.tsx | — |
| 82 | HUD safe area handling | src/ui/FPSHUD.tsx | — |

**Parallelism:** All 5 concurrent.

---

### Phase M: Architecture Migration

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 83 | Koota ECS — define all traits | src/ecs/koota/ | — |
| 84 | Migrate systems to Koota queries | src/systems/*.ts | 83 |

**Note:** This is the heaviest refactor. 83 defines the foundation, 84 touches ~30 system files incrementally.

---

### Phase N: Documentation + CI

| # | Task | Files | Blocked By |
|---|------|-------|------------|
| 111 | Architecture documentation | docs/ARCHITECTURE.md | — |
| 112 | Config schema documentation | docs/CONFIG_SCHEMAS.md | — |
| 113 | Getting-started guide | docs/CONTRIBUTING.md | — |
| 114 | GitHub Actions CI pipeline | .github/workflows/ci.yml | — |
| 115 | Playwright E2E test suite | tests/e2e/ | Core loop (B), UI (C) |

**Parallelism:** 111, 112, 113, 114 concurrently. 115 after B+C.

---

## Team Structure

| Role | Scope | File Ownership | Tasks |
|------|-------|----------------|-------|
| **Tech Lead** (me) | Orchestration, reviews, blockers | — | Coordination |
| **Systems Engineer** | Core loop, physics, ECS, game systems | src/systems/, src/ecs/, src/physics/ | A, B, F, M |
| **AI Engineer** | GOAP, Yuka, pathfinding, bot brains | src/ai/ | E |
| **Frontend Designer** | UI/UX, screens, HUD, menus | src/ui/, src/input/ | C, K(104), L |
| **Rendering Engineer** | PBR, procgen, instancing, particles | src/rendering/ | G |
| **Audio Engineer** | Tone.js, spatial, music, SFX | src/audio/ | I |
| **Config & Docs** | JSON configs, tests, documentation | config/, docs/ | D, N |

### File Ownership Rules

- **No two agents edit the same file simultaneously**
- Each role owns a directory subtree
- Cross-cutting tasks (e.g., event bus) coordinated through tech lead
- All agents run tests after every change

---

## Execution Order

```
Phase A (Foundation)     ─── all 9 tasks parallel ───────────────────→
Phase B (Core Loop)      ─── 85,106,91,107,105 → 86,90 → 87 → 88,89
Phase C (UI/UX)          ─── 48,101,102,103 → 49 → 50 → 51 ────────→
Phase D (Config)         ─── 52, 53 parallel ────────────────────────→
Phase E (AI)             ─── 63,65 → 64,66,56 → 61 ────────────────→
Phase F (Systems)        ─── 55,58,59,60,62 → 57 ──────────────────→
Phase G (Visual)         ─── 67,68,69,71,110,108,109 → 70 ─────────→
Phase H (4X)             ─── 72,73,75,74,98,99 → 100 ──────────────→
Phase I (Audio)          ─── 92 → 93,94,95 ─────────────────────────→
Phase J (Save/Load)      ─── 96 → 97 ──────────────────────────────→
Phase K (Polish)         ─── 76,77,116 parallel ─── 104 after B ───→
Phase L (A11y)           ─── all 5 parallel ─────────────────────────→
Phase M (Koota)          ─── 83 → 84 ──────────────────────────────→
Phase N (Docs+CI)        ─── 111,112,113,114 → 115 after B+C ──────→
```

Phases A-N run concurrently where file ownership doesn't conflict.
Each team member works their phase(s) independently.

---

## Quality Gates

1. **After every task:** `npx jest --no-cache` must pass
2. **After each phase:** Full test suite + TypeScript type check (`tsc --noEmit`)
3. **After Phase B:** Manual playtest of core loop in browser
4. **After Phase C:** Visual verification of all screens
5. **After Phase G:** Visual inspection of PBR materials and faction bots
6. **After all phases:** Playwright E2E suite green, CI pipeline green
7. **Final gate:** Architecture doc covers all systems, config doc covers all JSON files

---

## Success Criteria

- [ ] 300+ source files, properly decomposed
- [ ] 300+ test suites, all green
- [ ] Zero `any` types, zero non-null assertions
- [ ] Complete core loop playable end-to-end
- [ ] All 4 AI factions autonomously playing
- [ ] All 6 victory conditions implementedHi
- [ ] All 10 otter holograms with dialogue
- [ ] All 27 quests functional
- [ ] Spatial audio for every game action
- [ ] Adaptive music system
- [ ] Save/load working on web + native
- [ ] WCAG 2.1 AA accessible
- [ ] Mobile responsive (phone + tablet)
- [ ] CI pipeline automated
- [ ] Architecture + config + contributing docs complete
