# Syntheteria — Brutally Honest Session Review (2026-03-18)

> **Superseded for current state** — snapshot from pre–Phaser pivot / pre–package finalization. For
> architecture, renderer status, **PR workflow**, and **current test counts** see
> `docs/CLOUD_AGENT_RUNBOOK.md`, `docs/memory-bank/progress.md`, `docs/PHASER_PIVOT_PLAN.md`, `AGENTS.md`.
> Findings below (e.g. missing `GarageModal`, dead `pickAITrack`) are **historical** — verify against code before acting.

> Independent audit of what was delivered vs. what was claimed.
> No sugar-coating. Screenshots and evidence for every claim.

---

## Executive Summary

**The good news:** The codebase is healthy. 0 TypeScript errors, 2219 tests across 125 suites ALL passing, 0 console errors at runtime, and the game actually loads and runs. The ECS architecture is solid. The landing screen, new game modal, and HUD are polished. Turn advancement works. 3D GLB models render for robots, buildings, and salvage. The underlying SYSTEMS work.

**The bad news:** The game still looks dark and oppressive. Multiple documentation files claim features exist that do not. One key UI file (`GarageModal.tsx`) is referenced as "DONE" in FOUR separate docs but does not exist. AI track selection code is dead (never called from runtime). The docs overstate reality significantly — they were written aspirationally, not verified against what shipped.

**Overall verdict:** The session produced massive amounts of working backend code and test coverage. The visual presentation improved marginally. The documentation became significantly less trustworthy.

---

## What ACTUALLY Works (Verified)

### Build & Tests
- **TypeScript**: 0 errors (`npx tsc --noEmit` exits clean)
- **Vitest**: 125 suites, 2219 tests, ALL passing (not 2171/120 as docs claim)
- **Console**: 0 errors at runtime — only 3 THREE.js deprecation warnings (Clock -> Timer)
- **Dev server**: Starts and serves at localhost:5173

### Landing & New Game
- Landing screen renders with "SYNTHETERIA" title, New Game + Calibration buttons
- New Game modal has sector scale (44/64/96), seed phrase, difficulty, geography, 4 factions with AI/player toggle
- Faction selection works (player IS one of 4 factions)

### In-Game UI
- HUD shows CYCLE counter, POP, resources (FER/CND/SCR/STM), victory progress bars (DOM/RES/ECO/SRV), AP counter
- SYNC (save) and ADVANCE (end turn) buttons work
- Keybind hints visible (Tab/Enter/Esc/WASD/Z)
- Minimap present in bottom-left corner
- Turn counter increments correctly on ADVANCE

### Rendering
- Board is NOT a flat rectangle — visible 3D structure with walls, depth, elevated sections
- GLB robot models visible and rendered with faction colors
- Building models visible (Storage Hub, Storm Transmitter, etc.)
- Salvage prop models scattered on board
- Labyrinth wall structures visible creating room boundaries
- Fog of war functional — explored area lighter than unexplored
- Storm dome arc visible at top of viewport (faint but present)
- Multi-layer rendering pipeline working (floor -> biome -> depth -> structures -> salvage -> buildings -> territory)

### ECS Systems (Wired and Called)
All of these are actually imported, called from `turnSystem.ts`, and tested:
- `cultMutation.ts` — `tickCultMutations` called at line 109
- `specializationSystem.ts` — `runSpecializationPassives` called at line 110
- `floorMiningSystem.ts` — `floorMiningSystem` called at line 96
- `powerSystem.ts` — `runPowerGrid` called at line 97
- All other systems listed in progress.md (combat, harvest, resource, signal, repair, fabrication, synthesis, territory, victory, etc.)

### Specialization Track Definitions
- All 6 track definition files exist and are imported by `techTreeDefs.ts` and `trackRegistry.ts`
- `trackRegistry.ts` is imported by `fabricationSystem.ts` and `classActions.ts`
- 14 tracks across 6 robot classes — data definitions are complete and used

### Depth Layer Architecture
- `depthMappedLayer.ts` and `depthLayerStack.ts` are NOT dead code — both imported by `UnifiedTerrainRenderer.tsx`
- `UnifiedTerrainRenderer.tsx` is imported and rendered by `GameScreen.tsx`

---

## What Was CLAIMED to Work But DOESN'T

### PHANTOM: GarageModal.tsx — "DONE" in 4 docs, FILE DOES NOT EXIST

The file `src/ui/game/GarageModal.tsx` is referenced as completed in:
1. `docs/memory-bank/activeContext.md` line 40: "Garage modal (`GarageModal.tsx`)"
2. `docs/memory-bank/progress.md` line 115: "Garage modal | DONE | `src/ui/game/GarageModal.tsx`"
3. `docs/memory-bank/progress.md` line 191: "Garage modal | DONE | `src/ui/game/GarageModal.tsx`"
4. `docs/GAME_DESIGN.md` line 265: "**Garage Modal** (`GarageModal.tsx`)"
5. `docs/ARCHITECTURE.md` line 59, 280, 521: Multiple references
6. `AGENTS.md` line 43: Directory listing

**The file does not exist.** There is no `GarageModal.tsx` anywhere in the codebase. `grep -r GarageModal src/` returns zero results. The two-step fabrication UI for robot specialization has never been built. Players cannot choose specialization tracks at fabrication time.

### DEAD CODE: src/ai/trackSelection.ts — Not Called from Runtime

`pickAITrack()` and `pickAITrackVersion()` are defined and exported, but:
- They are imported ONLY in `src/ecs/systems/__tests__/specializationSystem.vitest.ts` (tests)
- They are NEVER imported by `aiTurnSystem.ts`, `fabricationSystem.ts`, or any other runtime code
- AI factions cannot actually select specialization tracks because this code is never invoked
- Progress.md line 148 claims "AI track selection | DONE" — it is NOT wired

### NOT FIXED: P1-7 — Power Grid Dead at Game Start

The `runPowerGrid()` function is only called inside `turnSystem.ts` (line 97), which runs on ADVANCE. It is NOT called during `initWorldFromBoard()`. This means:
- All buildings show "No Power" at game start (CYCLE 1, before first ADVANCE)
- Player's first impression is that their buildings are broken
- After one ADVANCE, power works correctly
- This was identified in `FULL_AUDIT.md` as P1-7 but was NOT fixed despite task #64 being marked completed

### STALE DOC NUMBERS: activeContext.md Claims Wrong Test Counts

`activeContext.md` line 9 says: "2171 tests, 124 suites (120 passing, 4 failing)"
`progress.md` line 19 says: "Vitest suites | 124 (120 passing, 4 failing)"

Reality: **2219 tests, 125 suites, 0 failing.** The docs claim 4 suites are failing when NONE are. The test counts are 48 tests behind reality. This is stale documentation that was never updated after the last batch of test additions.

### MinedPitRenderer.tsx — Listed as Separate File, Doesn't Exist

`progress.md` line 175 lists: "Mined pit renderer | DONE | `src/rendering/MinedPitRenderer.tsx`"

This file does not exist as a standalone file. The functionality WAS correctly merged into `UnifiedTerrainRenderer.tsx` (line 171: `buildMinedPits`). The progress doc just has the wrong file path — minor inaccuracy but reflects sloppy documentation.

---

## Visual Assessment (Screenshot Evidence)

Screenshots saved in `docs/audit/review_*.png`.

### What You Actually See

1. **The board is dark.** Fog of war covers most of the map in near-black. Explored tiles are visible but the overall impression is a small lit island in darkness. P0-1 was improved (storm dome brightened ~3x, void colors raised) but the fundamental darkness problem persists.

2. **Terrain variation is subtle.** The BiomeRenderer and PBR atlas are active, but at game zoom level, terrain tiles look mostly dark grey/beige with minor variation. The 9 substrate types are not dramatically visually distinct (P1-1 not fixed).

3. **Storm dome is visible but faint.** A lighter arc at the top of the viewport shows the storm dome exists. Cloud colors were brightened from the original near-black but are still low-contrast against the dark background.

4. **3D models look decent.** Robot GLBs, building models, and salvage props all render correctly as actual 3D objects. This is a genuine achievement — no placeholder boxes.

5. **Walls and labyrinth structure are visible.** The structural walls create visible room boundaries and corridors. The BSP/labyrinth generator output is actually rendered.

6. **Camera doesn't catastrophically jump on ADVANCE.** P0-2 appears improved — camera stayed near the player's units after turn advance.

7. **No readiness rings visible on units** (P1-3 still an issue).

---

## P0 Fix Status (from FULL_AUDIT.md)

| Issue | Claimed Fixed | Actually Fixed |
|-------|--------------|----------------|
| P0-1: Board overwhelmingly dark | Partially | Storm dome brightened 3x, void colors raised. Still dark overall. |
| P0-2: Camera jumps after ADVANCE | Yes | Improved — no dramatic jump observed |
| P0-3: 5 separate FACTION_COLORS | Yes | YES — modelPaths.ts now spreads from gameDefaults.ts single source |
| P0-4: 404 resource error | Unclear | No 404 errors seen in current console |

## P1 Fix Status

| Issue | Claimed Fixed | Actually Fixed |
|-------|--------------|----------------|
| P1-1: Terrain uniformly beige | No | NO — heightFrag.glsl still uses single baseColor |
| P1-2: Storm dome barely visible | Partially | Cloud colors 3x brighter but still low-contrast |
| P1-3: No readiness rings | No | NO — not visible in screenshots |
| P1-4: Board size mismatch with docs | Unknown | Not verified |
| P1-5: PauseMenu "Save Game" | Yes | YES — changed to "Persistence Sync" |
| P1-6: releasePointerCapture error | Unknown | No such error in current console |
| P1-7: Storm Transmitter "No Power" | No | NO — runPowerGrid not called on init |

## P2 Fix Status

| Issue | Claimed Fixed | Actually Fixed |
|-------|--------------|----------------|
| P2-7: Stale BOARD_SIZES constant | Yes | YES — removed from gameDefaults.ts |
| P2-8: Stale DEFAULT_BOARD_W/H | Yes | YES — removed from gameDefaults.ts |

---

## Dead Code Inventory

| File | Status | Evidence |
|------|--------|----------|
| `src/ai/trackSelection.ts` | DEAD — only imported by tests | `grep` shows 0 runtime imports |
| `src/ui/game/GarageModal.tsx` | DOES NOT EXIST | File is missing, referenced in 4+ docs |
| `src/rendering/MinedPitRenderer.tsx` | DOES NOT EXIST | Merged into UnifiedTerrainRenderer (correct) but docs wrong |

Files that ARE used (falsely suspected dead):
- `src/ecs/robots/specializations/*.ts` — imported by techTreeDefs, trackRegistry, classActions
- `src/ecs/systems/cultMutation.ts` — called in turnSystem
- `src/ecs/systems/specializationSystem.ts` — called in turnSystem
- `src/ecs/systems/floorMiningSystem.ts` — called in turnSystem
- `src/rendering/depthMappedLayer.ts` — imported by UnifiedTerrainRenderer
- `src/rendering/depthLayerStack.ts` — imported by UnifiedTerrainRenderer

---

## Documentation Accuracy

### activeContext.md
- **Test counts wrong**: Claims 2171/124/4-failing. Reality: 2219/125/0-failing.
- **GarageModal claim false**: Lists it as built. File doesn't exist.
- **AI track selection claim false**: Says it's done. Code exists but is never called.
- Everything else about systems being implemented appears accurate.

### progress.md
- **Test counts wrong**: Same stale numbers as activeContext.
- **GarageModal listed twice as DONE**: Lines 115 and 191. File doesn't exist.
- **MinedPitRenderer wrong path**: Listed as separate file, actually merged into UnifiedTerrainRenderer.
- **"AI track selection | DONE"**: Code is dead — not wired into runtime.
- System status table is otherwise accurate — verified that listed systems are imported and called.

### GAME_DESIGN.md
- References GarageModal.tsx by name in Section 7 (line 265). File doesn't exist.
- Specialization track DATA is accurate (14 tracks, 6 classes, descriptions match code).
- Tech tree description matches techTreeDefs.ts.

### FULL_AUDIT.md
- Actually the most honest document of the session.
- Identified real problems accurately.
- "What's Working Well" section is verified correct.
- P0/P1/P2 classifications were fair.

---

## What the Session Actually Delivered

### Genuine Value Delivered
1. **2219 passing tests** across 125 suites — massive test coverage increase
2. **0 TypeScript errors** — clean type safety
3. **14 specialization track definitions** — complete data models for all robot classes
4. **Cult mutation system** — 4-tier time-based evolution, fully wired into turnSystem
5. **Floor mining system** — DAISY pattern mining, wired into turnSystem
6. **Cult escalation system** — 3 stages with per-sect behaviors
7. **Faction color consolidation** — single source of truth (P0-3 fixed)
8. **Storm dome brightening** — 3x increase in cloud colors (P0-1 partially fixed)
9. **Stale config cleanup** — removed BOARD_SIZES and DEFAULT_BOARD_W/H
10. **Diegetic vocabulary** — PauseMenu uses "Persistence Sync" (P1-5 fixed)
11. **360 GLB models** integrated and rendering
12. **40+ ECS systems** all properly wired with world param

### What Was Promised But Not Delivered
1. **GarageModal.tsx** — the two-step fabrication UI for choosing specializations. Doesn't exist.
2. **AI track selection wiring** — code exists but is never called from runtime.
3. **P1-7 power grid at game start** — buildings show "No Power" on turn 1.
4. **Accurate documentation** — multiple docs have wrong numbers and phantom file references.
5. **Terrain visual distinction** — 9 substrates still look mostly the same.
6. **Unit readiness rings** — not visible.

---

## Recommendations

### Immediate Fixes (< 1 hour each)
1. **Call `runPowerGrid(world)` in `initWorldFromBoard()`** — fixes P1-7 "No Power" on turn 1
2. **Delete or annotate `src/ai/trackSelection.ts`** as "not yet wired" — stop claiming it's done
3. **Update all docs** — fix test counts to 2219/125/0, remove GarageModal references, mark AI track selection as "defined but not wired"

### Real Work Needed
4. **Build GarageModal.tsx** — the actual UI for specialization selection at fabrication time. This is a real feature gap.
5. **Wire `pickAITrack` into `aiTurnSystem.ts`** — AI should use track preferences when fabricating
6. **Brighten the board** — the single biggest visual problem. Options: increase fog-of-war base visibility, brighten fogged tile color, increase initial scan range, or add ambient light to fogged areas
7. **Make terrain substrates visually distinct** — the PBR atlas exists but floor tiles mostly look the same at game scale

### Documentation Discipline
8. **Never mark a file as DONE if it doesn't exist.** Write the code first, then update the doc.
9. **Run `pnpm test:vitest 2>&1 | tail -5` before updating test counts.** Don't guess.
10. **Grep for imports before claiming something is "wired."** `grep -r "from.*trackSelection" src/ --include="*.ts" | grep -v __tests__` would have caught the dead code instantly.
