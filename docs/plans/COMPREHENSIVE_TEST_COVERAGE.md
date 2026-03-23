---
title: "Comprehensive Test Coverage"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "Scenario matrix and test plan to cover all different possible scenarios beyond current origin"
---

# Comprehensive Test Coverage

This document defines **all the different possible scenarios** the game can be in and how tests (unit, integration, component, E2E) should cover them. Use it to find gaps and to add new tests systematically.

---

## 1. Scenario dimensions

Scenarios are combinations of:

| Dimension | Values | Notes |
|-----------|--------|-------|
| **Turn phase** | `player`, `ai_faction`, `environment` | Affects who acts, what UI shows |
| **World state** | `not_ready`, `ready`, `in_city` | Gates systems and HUD |
| **Save state** | `no_save`, `has_save`, `autosave_slot` | Title "Continue", load flow |
| **Faction** | `player`, rival IDs, `cult` | Diplomacy, combat, territory |
| **Selection** | `none`, `single_unit`, `multi`, `structure`, `city_site` | Radial and briefing content |
| **Storm** | `calm`, `building`, `active` | Weather, lightning, visuals |
| **Victory path** | `none`, `subjugation`, `technical`, `wormhole` | Endgame triggers |
| **Resources** | `zero`, `low`, `adequate`, `surplus` | Build/harvest affordances |
| **Tech** | `no_research`, `in_progress`, `unlocks_available` | Tech tree UI |
| **Diplomacy** | `neutral`, `allied`, `war`, `trade_active` | Faction UI and events |

---

## 2. System × scenario matrix

For each system, the table lists scenario dimensions that **must** be exercised by tests (unit or integration). **Covered** = tests exist; **Gap** = add tests.

| System | Key scenarios | Current coverage | Gap |
|--------|----------------|------------------|-----|
| **Turn system** | Phase transitions, AP/MP per unit, phase order | turnSystem.test.ts, turnPhaseHandlers.test.ts | Rehydrate (load-into-different-phase) covered in turnSystem.test.ts |
| **Harvest** | No structure, harvesting, completed, floor strip-mine | harvestSystem.test.ts | Floor harvest completion; multiple units harvesting |
| **Combat** | No combat, one strike, formation, taunt, death | combat.test.ts | Multi-faction; component depletion to zero |
| **Building placement** | Valid, invalid, adjacency, cost fail | buildingPlacement.test.ts | All 7 types; adjacency rules exhaustively |
| **Hacking** | No link, linking, capture in progress, captured | hackingSystem.test.ts, hacking.test.ts | Signal strength scenarios; multi-unit hack |
| **Diplomacy** | Neutral, war, alliance, trade | diplomacy.test.ts | Trade flow; war consequences on spawn |
| **Victory** | No win, subjugation/technical/wormhole triggered | victoryConditions.test.ts | Wormhole stage progression; tie/race |
| **Tech tree** | No research, researching, complete, effects applied | techTree.test.ts | Effect application to units/buildings |
| **Mark upgrade** | Mark I–V, radial visibility, upgrade in progress | markUpgrade.test.ts | Radial integration; upgrade completion |
| **Exploration / fog** | Unexplored, discovered, visible, chunk unload | exploration.test.ts, chunkDiscovery | Chunk round-trip; multi-unit vision merge |
| **Territory** | No ownership, single faction, contested | territorySystem.test.ts | Border updates; loss of cell |
| **Weather / storm** | Calm, building, active, lightning strike | storm visuals, lightning | Storm intensity cycle; strike targeting |
| **Wormhole** | Inactive, opening, open, used | wormhole.test.ts | Stage transitions; endgame trigger |
| **Bot speech** | No event, harvest/combat/move/site events, archetype lines | botSpeech.test.ts | Proximity filtering; 6 event types |
| **Rival encounters** | No rival, first contact, strength assessment | rivalEncounters.test.ts | Spawn timing; strength tiers |
| **Save / load** | New game, save slot, load, autosave | saveGames, worldPersistence tests, turnSystem rehydrateTurnState | Load-into-different-phase via rehydrateTurnState; no-save (0 slots) in saveGames.test.ts |
| **World gen** | Seed A, seed B, chunk boundary, sector structure | chunkGen, worldGrid, generation tests | Sector structure consistency; POI placement |
| **Radial menu** | Hidden, move/survey/build/upgrade visible, disabled | radialMenu, radialProviders | Per-context options; disabled when no AP |
| **Briefing bubbles** | No selection, unit selected, site nearby | BriefingBubbleLayer.test.tsx | Multiple bubbles; site discovery state |
| **City / POI** | World only, city entered, city exit | CitySiteOverlay, city transition | Interior state; return to world |

---

## 3. UI flow × scenario matrix

Player-facing flows that should be covered by **component** or **E2E** tests.

| Flow | Scenarios | Current | Gap |
|------|-----------|---------|-----|
| **Title → New Game** | No save (Continue hidden); has save (Continue visible); Settings open/close | TitleScreen.test.tsx, Maestro title-web | Vite DOM title (AppVite) component test |
| **Title → Continue** | Load success; load fail; missing slot | saveGames tests | UI feedback on load fail |
| **New Game → Campaign setup** | Default config; custom seed/difficulty/climate/storm | NewGameModal.test.tsx | All config combinations |
| **Game HUD** | Turn 1; mid-game; storm %; resources zero vs positive | GameHUD (RN), GameHUDDom (Vite), GameHUDDom.vitest.tsx | Storm display in Vitest/CT as needed |
| **End Turn** | Player phase; AI phase; environment phase label | turnPhaseHandlers, UI | Phase label in HUD |
| **Radial menu** | No selection; unit (move, survey, …); structure; disabled options | RadialMenu, radialProviders | Component test with mocked context |
| **City site** | Enter; interior; close; return to world | CitySiteModal, CitySiteOverlay | Full flow in Maestro or CT |
| **Victory overlay** | Subjugation/technical/wormhole message; stats | VictoryOverlay | Component test with mock state |
| **Pause / Save load** | Save slot 1–4; autosave; load in-game | PauseMenu, saveGames | Save slot list; load from pause |
| **Loading overlay** | Progress steps; diegetic copy | LoadingOverlay.test.tsx | Copy and progress states |

### Done checklist (0.5 + 0.6) verification

- **CT:** `DoneChecklistSurfaces.spec.tsx` (turn chip + End Turn + new game modal); `TitleScreen.spec.tsx` (NewGameModal, LoadingOverlay); `HudButton.spec.tsx` (End Turn); `DiegeticChip.spec.tsx`; `EcumenopolisRadialBot.spec.tsx` (radial).
- **E2E with GOAP:** `tests/e2e/done-checklist.spec.ts` — floor visible, GOAP turn advance, save/load round-trip when DB is persistent. See [IS_THE_GAME_DONE](IS_THE_GAME_DONE.md#verification-strategy-05--06).

---

## 4. Edge and failure scenarios

Tests should also cover:

| Scenario | Purpose | Where to test |
|----------|---------|----------------|
| **Missing asset** | Crash hard, clear error | assetValidation, failHardAssets.test.ts |
| **Missing save file** | No crash; show "No save" or empty slot | saveGames.test.ts (getSaveGameCountSync 0, getLatestSaveGameSync null), UI |
| **DB not ready** | getDatabaseSync() before resolver | runtime / init flow |
| **Zero units** | No selection; radial empty; no briefing | turnSystem, radial, briefingBubbles |
| **All factions eliminated** | Victory or draw | victoryConditions |
| **Chunk unload then reload** | Discovery and structure state restored | chunkDiscovery, chunkDelta |
| **First turn (tick 0)** | HUD deferred; no briefing flash | GameUI, Notifications (timing) |
| **Storm at 100%** | Lightning; visual and gameplay effect | lightning, StormParticles |
| **Wormhole open** | Victory path; UI cue | wormhole, VictoryOverlay |

---

## 5. Test layers (where to implement)

| Layer | Tool | Use for |
|-------|------|--------|
| **Unit** | Jest (src/**/*.test.ts) | Pure logic: systems, world, AI, DB |
| **UI unit** | Jest (src/ui/__tests__/*.test.tsx) | RN components with RNTL |
| **Component (isolated)** | Playwright CT (tests/components/*.spec.tsx) | React components in real browser; DOM or R3F |
| **Integration** | Jest | Multi-module (e.g. turn + harvest + resources) |
| **E2E** | Maestro | Full flows: title → game → turn → radial → city |

---

## 6. Action plan

1. **Audit** — For each row in §2 and §3, mark Covered vs Gap; add test file references.
2. **Prioritize** — Gaps that affect release-critical flows (title, new game, first turn, save/load) first.
3. **Add unit/integration tests** — One or more Jest tests per gap in §2 and §4.
4. **Add component tests** — Playwright CT for isolated React components (§3); mock store/context.
5. **Add E2E** — Maestro flows for §3 flows that span multiple screens.
6. **Regress** — Run full suite (Jest + Vitest + CT + Maestro) in CI.

---

## 7. References

- [AGENTS.md](../../AGENTS.md) — Test roots: Jest (unit/ui), Vitest (*.vitest.ts), Maestro (E2E)
- [UI_DESIGN.md](../../interface/UI_DESIGN.md) — §8 Testing expectations
- [MAESTRO_PLAYTESTING.md](MAESTRO_PLAYTESTING.md) — E2E flows
- [TASK_LIST.md](TASK_LIST.md) — Remaining work
