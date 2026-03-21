# Syntheteria — Full Quality Audit (2026-03-18)

> **Historical snapshot** — metrics below are frozen. For **current** health: **`pnpm verify`** and
> **`docs/memory-bank/progress.md`**.

> Comprehensive audit across visuals, gameplay, UI, code quality, and completeness.
> Screenshots saved in `docs/audit/`.

---

## Codebase Health Summary

| Metric | Value (2026-03-18) | Status |
|--------|-------|--------|
| TypeScript errors | 0 | PASS |
| Vitest | 125 files passing (0 failing) | PASS |
| Vitest tests | 2220 | PASS |
| Biome lint | 0 errors | PASS |
| Console errors (runtime) | 2 (1 x 404, 1 x pointer capture) | WARN |
| Console warnings | 5 (THREE.js deprecations) | LOW |
| GLB models in public/ | 360 | OK |
| Stale worktrees | 7 dirs, 3.1 GB | CLEANUP |

---

## P0 CRITICAL — Game-Breaking or Looks Broken

### P0-1: Board is overwhelmingly dark — "basically black"

**Observed:** At default zoom, the board is a small lit island in an ocean of near-black. The fog of war covers ~95% of the visible area at game start, making the game look broken/unfinished.

**Root causes:**
1. **Fog of war is too aggressive** — `FogOfWarRenderer` starts ALL tiles at visibility 0 (fully fogged). Only tiles within player unit scanRange are revealed. With scanRange=10 on a 44x44 board, only ~20% is visible at start.
2. **Fog color is near-black** (`#28272a` in fogExp2 and heightMaterial) — fogged terrain looks identical to empty void.
3. **No atmospheric fog between fog-of-war and void** — the board edge just cuts to black. The exponential fog (`fogDensity: 0.008`) is tuned so weakly it barely registers at board scale.
4. **StormDome void color** is `vec3(0.012, 0.015, 0.035)` — essentially black. The DarkFallbackPlane is `#010308`. Everything outside the board is indistinguishable darkness.
5. **Canvas background** is `#0e1420` — yet another shade of near-black.

**Impact:** First impression is "the game is broken." User said it looks "awful and basically black."

**Fix priorities:**
- Make fogged terrain lighter — unexplored tiles should be dark but visible (silhouetted structures, faint terrain shapes), not pitch black
- Increase fog gradient distance or reduce fog opacity so the transition from explored to unexplored is gradual
- Give the storm dome more visual presence — the clouds, wormhole, and illuminator are there but too dim to see at normal zoom
- Consider revealing more tiles at game start (larger initial scanRange or pre-explored area around spawn)

**Files:** `src/rendering/FogOfWarRenderer.tsx`, `src/rendering/heightMaterial.ts`, `src/rendering/StormDome.tsx`, `src/ui/game/GameScreen.tsx:125`

---

### P0-2: Camera jumps after ADVANCE — disorienting

**Observed:** After clicking ADVANCE, the camera position shifted dramatically, showing mostly fogged/dark terrain instead of the player's units. Player loses track of their units.

**Root cause:** Camera does not re-center on player units after turn processing. If AI movement or turn resolution logic triggers camera movement, the player is left looking at the wrong part of the board.

**Files:** `src/main.tsx` (turn advance handler), `src/camera/IsometricCamera.tsx`

---

### P0-3: 5 separate FACTION_COLORS definitions — colors are inconsistent

**Observed:** Faction colors are defined in 5 different places with CONFLICTING values:

| Location | Reclaimers | Volt Collective | Signal Choir | Iron Creed |
|----------|-----------|-----------------|-------------|-----------|
| **GAME_DESIGN.md** | Orange | Yellow | Purple | Red |
| `gameDefaults.ts` | 0xff8844 (orange) | 0x44aaff (**BLUE**) | 0xaa44ff (purple) | 0xff4444 (red) |
| `modelPaths.ts` | 0xff6644 (orange) | 0xffcc00 (yellow) | 0xaa44ff (purple) | 0x88aacc (**BLUE-GREY**) |
| `SelectedInfo.tsx` | CSS strings | Different again | Different again | Different again |
| `TurnPhaseOverlay.tsx` | CSS strings | Different again | Different again | Different again |
| `EntityTooltip.tsx` | CSS strings | Different again | Different again | Different again |

**Impact:** Volt Collective is BLUE in 3D units but YELLOW in design docs. Iron Creed is RED in one file, BLUE-GREY in another. Territory overlay colors (from `gameDefaults.ts`) don't match unit model colors (from `modelPaths.ts`). Total visual incoherence.

**Fix:** Single FACTION_COLORS definition, imported everywhere. Match GAME_DESIGN.md: Reclaimers=Orange, Volt=Yellow, Signal=Purple, Iron=Red.

**Files:** `src/config/gameDefaults.ts:58`, `src/rendering/modelPaths.ts:590`, `src/ui/game/SelectedInfo.tsx:49`, `src/ui/game/TurnPhaseOverlay.tsx:23`, `src/ui/game/EntityTooltip.tsx:25`

---

### P0-4: 404 resource error on every page load

**Observed:** `Failed to load resource: the server responded with a status of 404 (Not Found)` — appears on every navigation. The Chrome console doesn't show which URL is 404ing (no URL in the error args).

**Impact:** A missing asset means something isn't rendering. Could be a missing GLB model, texture, or favicon.

**Investigation needed:** Use Network tab to identify the 404 URL.

---

## P1 HIGH — Major Feature Gap or Visual Problem

### P1-1: Terrain floor is uniformly beige/white — no visual distinction between biome zones

**Observed:** In screenshots, all floor tiles appear the same cream/white color. The 9 terrain substrates (void_pit, structural_mass, abyssal_platform, transit_deck, durasteel_span, collapsed_zone, dust_district, bio_district, aerostructure) are not visually distinguishable.

**Root cause:** The height shader (`heightFrag.glsl`) uses a single `baseColor = vec3(0.55, 0.52, 0.48)` for ALL terrain. The BiomeRenderer exists and has the PBR atlas shader, but it may be rendering too transparently or the atlas textures are too similar at game scale.

**Impact:** The procedural generation — BSP city layout, district zones, biome transitions — is invisible. All tiles look the same.

**Files:** `src/rendering/glsl/heightFrag.glsl`, `src/rendering/BiomeRenderer.tsx`, `src/ecs/terrain/floorShader.ts`

---

### P1-2: Storm dome is barely visible — looks like empty void

**Observed:** At zoomed-out view, faint light rays are visible from above but the storm clouds, wormhole vortex, and illuminator are essentially invisible. The sky looks like black emptiness, not a dramatic hypercane.

**Root cause:** The storm cloud colors in `StormDome.tsx` are extremely dark: `dark = vec3(0.025, 0.035, 0.090)`, `lit = vec3(0.080, 0.110, 0.200)`. The cloud layer is painting dark-navy onto near-black void. Combined with the dark void color, there's no contrast.

**Fix:** Brighten storm cloud colors significantly, increase storm intensity base, and add more visible lightning flashes.

**Files:** `src/rendering/StormDome.tsx:138-139`

---

### P1-3: No visible readiness rings on units

**Observed:** Unit readiness rings (cyan glow for units with AP) are implemented in `UnitRenderer.tsx` but not visible in screenshots. The ring geometry is at Y=0.05 which may be below the terrain surface after elevation displacement.

**Files:** `src/rendering/UnitRenderer.tsx:97-145`

---

### P1-4: Board size mismatch with GAME_DESIGN.md

**Observed:** New Game modal shows 44x44 / 64x64 / 96x96. GAME_DESIGN.md says 28x28 / 40x40 / 56x56.

**Root cause:** `src/world/config.ts` SECTOR_SCALE_SPECS was updated independently of GAME_DESIGN.md. The actual board sizes are larger, and the doc tile counts (~784/~1600/~3136) are wrong.

**Impact:** Documentation inconsistency. Not game-breaking but confusing. Either update GAME_DESIGN.md to match the actual sizes or vice versa.

**Files:** `src/world/config.ts:61-80`, `docs/GAME_DESIGN.md` Section 2

---

### P1-5: PauseMenu uses non-diegetic label "Save Game"

**Observed:** `src/ui/game/PauseMenu.tsx:154` — `"Save Game"` instead of diegetic vocabulary like "Persistence Sync" or just "Sync" (as the HUD button already uses).

**GAME_DESIGN.md Section 9 spec:** "Save game" should be "Persistence sync"

**Files:** `src/ui/game/PauseMenu.tsx:154`

---

### P1-6: `releasePointerCapture` error on click

**Observed:** `Uncaught NotFoundError: Failed to execute 'releasePointerCapture' on 'Element': No active pointer with the given id is found.`

This fires on clicking the ADVANCE button, indicating a pointer event handler is trying to release a pointer that's already been released.

**Files:** Likely `src/input/BoardInput.tsx` or the R3F canvas event system

---

### P1-7: Starting Storm Transmitter has "No Power" — dead start

**Observed:** The player's initial Storm Transmitter building shows "No Power" at game start. Storm Transmitters are POWER GENERATORS (+5 power per BUILDING_DEFS) — they should not require power, they produce it.

**Impact:** If the starting transmitter isn't powering anything, the entire power grid is dead at game start. No powered buildings means maintenance bays don't heal, turrets don't fire, fabrication doesn't work.

**Investigation needed:** Check if `powerSystem.ts` has a bug where transmitters require power input instead of generating it.

**Files:** `src/ecs/systems/powerSystem.ts`, `src/ecs/buildings/definitions.ts`

---

## P2 MEDIUM — Missing Polish, Incomplete Wiring

### P2-1: Duplicate unit info panels — top-left AND right side

**Observed:** After clicking a unit, info appears in BOTH the top-left corner (compact panel) and the right side (detailed SelectedInfo panel). This is redundant and clutters the screen.

**Fix:** Remove the top-left panel or make it context-specific (buildings only in top-left, units in right panel).

---

### P2-2: Only 3 resource types showing in HUD

**Observed:** HUD shows only `FER 5, CND 2, SCR 10` at game start. The game has 13 resource materials. The HUD filters for non-zero, so this is expected — but the player starts with only 3 resources, which feels sparse.

**Impact:** Economy feels thin at game start. Player should start with a small amount of more materials to bootstrap.

---

### P2-3: THREE.js deprecation warnings

**Observed:**
- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` (3x)
- `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.` (4x)

**Fix:** Update shadow map type to `PCFShadowMap` in Canvas config. Replace `Clock` usage with `Timer` (or suppress if from R3F internals).

**Files:** `src/ui/game/GameScreen.tsx:120` (shadows config)

---

### P2-4: Minimap is tiny and hard to read

**Observed:** Minimap is present in bottom-left but very small. Territory colors are barely visible. No zoom-to-click functionality visible.

---

### P2-5: No turn summary panel visible after ADVANCE

**Observed:** GAME_DESIGN.md and progress.md list turn summaries as implemented, but no summary panel appeared after advancing from CYCLE 1 to CYCLE 2.

**Files:** `src/ui/game/TurnSummaryPanel.tsx`, `src/main.tsx` (turn advance wiring)

---

### P2-6: No toast notifications visible

**Observed:** No toast messages appeared during the turn advance. System toasts, tutorial overlays, and event notifications are all implemented in code but none fired visibly.

**Files:** `src/ui/game/ToastStack.tsx`, `src/ui/game/SystemToasts.tsx`, `src/ecs/systems/toastNotifications.ts`

---

### P2-7: `gameDefaults.ts` BOARD_SIZES constant is stale

**Observed:** `BOARD_SIZES = [16, 32, 64, 128]` — these are the old board sizes. The actual sizes from `SECTOR_SCALE_SPECS` are [44, 64, 96]. The `BOARD_SIZES` constant is not used by the new game flow but is still exported and could confuse consumers.

**Files:** `src/config/gameDefaults.ts:83`

---

### P2-8: `DEFAULT_BOARD_W/H = 32` is also stale

**Observed:** `DEFAULT_BOARD_W = 32, DEFAULT_BOARD_H = 32` in gameDefaults.ts don't match any current board size option.

**Files:** `src/config/gameDefaults.ts:14-15`

---

### P2-9: Default storm profile is "cataclysmic" — too aggressive for new players

**Observed:** `DEFAULT_NEW_GAME_CONFIG` sets `stormProfile: "cataclysmic"` but the GameScreen passes `stormProfile = "stable"` as default. These conflict — the actual storm profile depends on which default wins.

**Files:** `src/world/config.ts:52`, `src/ui/game/GameScreen.tsx:103`

---

### P2-10: No right-click radial menu accessible via Chrome DevTools

**Observed (historical audit):** Radial was the context surface at audit time. **Current design:** `GAME_DESIGN.md` §9 deprecates radial in favor of **Civ VI–style** command UI; implementation migration pending. Radial code remains in `BoardInput.tsx` / `radialMenu.ts`.

---

## P3 LOW — Nice-to-Have, Minor Issues

### P3-1: 7 stale worktrees consuming 3.1 GB

**Observed:** `.claude/worktrees/` contains 7 agent worktree directories totaling 3.1 GB of disk space. Most are from March 15-18.

**Fix:** `git worktree remove` or manual deletion of stale worktrees.

---

### P3-2: `pending/` directory is 252 MB of quarantined code

**Observed:** `pending/` is excluded from tsconfig and biome but still in the repo, consuming 252 MB. No active imports reference it. If it's truly quarantined permanently, it should be removed from the working tree (keep in git history).

---

### P3-3: UnitRenderer uses `Clone` from drei — not instanced rendering

**Observed:** Each unit uses `<Clone object={scene} />` — this creates unique meshes per unit rather than GPU-instanced rendering. With 6 player + 18 AI + 12 cult = up to 36 units, this creates 36 separate draw calls for robot models.

**Impact:** Performance concern at scale. Not critical for current unit counts but will matter if unit cap increases.

**Files:** `src/rendering/UnitRenderer.tsx:69`

---

### P3-4: `SelectedInfo.tsx` Cavalry displays "Scan 2" — very low for a unit

**Observed:** The selected Cavalry unit shows scanRange=2, while INITIAL_SCAN_RANGE in gameDefaults is 10. Cavalry (Arachnoid) may have a low base scan. This means cavalry units barely reveal any fog of war.

**Investigation:** Check if cavalry archetypes have intentionally low scanRange or if this is a data error.

---

### P3-5: Shadow map config triggers deprecation but still works

**Observed:** `PCFSoftShadowMap` is deprecated in current THREE.js. Shadows fall back to `PCFShadowMap` automatically. No visual bug — just noisy console.

---

### P3-6: Missing keyboard shortcut visibility — "Z" for zoom isn't standard

**Observed:** Keybind hints show "Z = Zoom" which is unusual. Most games use scroll wheel for zoom (which is implemented) and Z is typically undo.

---

### P3-7: No loading/generating screen visible

**Observed:** After clicking "INITIALIZE SECTOR", the game transitions directly. GAME_DESIGN.md Section 9 says loading should use diegetic language like "Mapping sectors..." or "Calibrating...". No loading state was visible (generation may be too fast to notice on small maps).

---

### P3-8: Climate profile labels don't match internal enum names

**Observed:** Internal enum names are `temperate, wet, arid, frozen` but UI labels show `Coastal, Archipelago, Inland, Strait`. This is fine for users but confusing for developers — the mapping isn't obvious.

**Files:** `src/world/config.ts:88-130`

---

## What's Working Well

- **Landing screen** — polished, diegetic title, clean UI
- **New Game modal** — comprehensive options (scale, seed, difficulty, geography, factions), clean layout
- **HUD** — diegetic vocabulary (CYCLE, SYNC, ADVANCE), compact resource display, victory progress bars
- **Unit selection** — clicking selects units, displays stats in info panel (Attack, Defense, Range, Scan, Class, Mark, XP)
- **GLB models** — robots, buildings, salvage props all render as 3D models (not boxes)
- **Turn advance** — ADVANCE button works, cycle counter increments
- **Minimap** — present and shows territory
- **Keybind hints** — visible and correctly labeled
- **Test coverage** — 2220 tests, 125 suites, all passing
- **TypeScript** — 0 errors
- **ECS architecture** — 40+ systems, all properly trait-based with world param
- **AI GOAP** — Yuka-based with faction personalities, fuzzy logic
- **Save/Load** — SQLite persistence, auto-save
- **All 9 robot GLB models** — present in public/assets/models/robots/

---

## Completeness vs GAME_DESIGN.md

### Implemented and Visible
- [x] Fixed board generation (seeded, 3 scales)
- [x] 9 terrain substrates (in code, not visually distinct)
- [x] Fog of war (too aggressive but functional)
- [x] Salvage props as primary resource
- [x] 13 resource materials
- [x] 15 faction buildings
- [x] 6 cult structures
- [x] 9 robot archetypes with GLB models
- [x] 14 specialization tracks + interim fabrication UI (`GarageModal` → merge into settlement production)
- [x] 27-tech research tree
- [x] Combat (attack/defense/counterattack)
- [x] AI GOAP with faction personalities
- [x] Cult escalation (3 stages)
- [x] Cult mutations (4 tiers)
- [x] Economy (harvest/synthesize/fabricate)
- [x] Territory painting
- [x] 7 victory conditions
- [x] Diplomacy (-100 to +100 standings)
- [x] Save/Load + auto-save
- [x] Diegetic vocabulary (mostly)
- [x] Storm dome (exists but too dark)
- [x] Readiness rings (exist but may not be visible)

### Implemented But Not Verified in UI
- [ ] Context command UI (legacy radial — automation unclear; target: strip/inspector)
- [ ] Hacking system (wired to UI but not triggered in 2 turns)
- [ ] Floor mining (system exists, not tested visually)
- [ ] Building placement via command UI
- [ ] Speech bubbles above units
- [ ] Turn summary panel after advance
- [ ] Toast notifications
- [ ] Tutorial overlay

### Not Visible / Unclear
- [ ] Day/night cycle effect on board lighting (board uses fixed zenith light)
- [ ] Sparkles on wormhole/power nodes (too dark to see)
- [ ] Labyrinth maze corridors (structures visible but can't confirm maze pattern)
- [ ] CivRev2-style cylindrical curvature (hard to verify visually)

---

## Recommended Fix Order

1. **P0-1**: Fix the darkness — brighten fogged terrain, increase storm dome visibility, widen initial reveal
2. **P0-3**: Consolidate FACTION_COLORS to single source, match GAME_DESIGN.md
3. **P0-2**: Re-center camera on player units after ADVANCE
4. **P0-4**: Identify and fix the 404 resource
5. **P1-1**: Make terrain biomes visually distinct (different colors per substrate)
6. **P1-2**: Brighten storm dome clouds and wormhole
7. **P1-7**: Fix Storm Transmitter "No Power" at game start
8. **P1-4**: Update GAME_DESIGN.md board sizes to match reality
9. **P1-5**: Fix PauseMenu diegetic vocabulary
10. **P2-1**: Remove duplicate info panel
11. **P2-5/6**: Wire turn summary and toasts to actually display
12. **P3-1**: Clean up stale worktrees (3.1 GB)
