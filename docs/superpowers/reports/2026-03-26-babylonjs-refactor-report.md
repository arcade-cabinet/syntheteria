# BabylonJS Refactor Report — 2026-03-26

## What Was Attempted

A 14-task plan to refactor the entire game from R3F/Vite to BabylonJS/Reactylon/Webpack, adding a responsive RTS HUD, base system, mouse-first input, and automated playtest governor.

**Tokens spent:** Massive. Multiple subagent waves — implementers, spec reviewers, code quality reviewers, audit agents, explorer agents. Over 40 subagent dispatches across the session.

**Branch:** `feature/rts-course-correction` — PR #25

---

## What Was Actually Done (Infrastructure)

### Build System (DONE)
- Killed Vite, promoted Webpack 5 + babel-plugin-reactylon
- Installed shadcn/ui + Tailwind CSS 3
- Single entry point `src/index.tsx`
- Production build compiles (~28s, 5.1MB bundle)

### R3F Landing Page (DONE — after breaking and re-fixing it)
- Originally working R3F storm globe was DELETED during the refactor (mistake)
- Then a BabylonJS ShaderMaterial replacement was written — it DOESN'T WORK because BabylonJS 8 uses WebGPU which can't run GLSL shaders
- Eventually R3F was RESTORED (`@react-three/fiber`, `@react-three/drei`, `three`)
- Landing page now renders correctly with ice blue palette (#8be6ff)
- Wasted significant effort on the BabylonJS port that was thrown away

### Game Canvas (PARTIALLY DONE — renders terrain, NOT game)
- `src/game/GameCanvas.tsx` — Reactylon Engine+Scene with ArcRotateCamera
- `src/game/ChunkManager.ts` — loads/unloads 32x32 tile chunks on camera pan
- PBR materials from `src/board/scene.ts` render walls and floors
- Fog (exponential, density 0.015) hides chunk edges
- **Camera is locked at beta=1° (nearly vertical)** — NO depth perception, walls look flat
- **Camera doesn't focus on player start position** — just centers on chunk coordinates

### Entity Rendering (WRITTEN BUT NOT VISUALLY VERIFIED)
- `src/game/EntityRenderer.ts` — 423 lines, loads 6 robot GLBs via `LoadAssetContainerAsync`
- Selection ring (cyan torus), bob animation, faction tinting
- `getEntityAtPoint()` for raycasting
- **Robot GLBs are NOT visible in the actual game** — models load but don't appear on screen
- `import.meta.env.BASE_URL` was `undefined` in webpack, causing model paths to be `"undefinedassets/models/..."` — fixed but never visually verified after fix

### Input System (WRITTEN, UNTESTED IN BROWSER)
- `src/game/InputHandler.ts` — click-to-select, click-to-move, box selection, attack
- `src/game/MoveMarker.ts` — green→blue torus at click destination
- Box selection DOM overlay rectangle during drag
- **Never tested with actual visible robots** — can't select what you can't see

### HUD Layout (RENDERS BUT OVER AN EMPTY GAME)
- `src/ui/layout/GameLayout.tsx` — responsive flex (sidebar desktop, bottom mobile)
- `src/ui/layout/TopBar.tsx` — resources, speed controls, save/load, audio toggle
- `src/ui/layout/Sidebar.tsx` — minimap + selection info + action panel
- `src/ui/layout/Minimap.tsx` — canvas-based with legend + viewport indicator
- `src/ui/layout/SelectionInfo.tsx` — unit details, component status bars
- `src/ui/layout/ActionPanel.tsx` — context-sensitive buttons
- Old `GameUI.tsx` (1597 lines) deleted and replaced with 946 lines across 6 files
- **MOVE button does nothing** (shows instructional text)
- **SCAVENGE button does nothing** (shows status indicator)
- **HACK button removed** (not implemented)

### Base System (WRITTEN, NOT VISUALLY VERIFIED)
- `Base` trait added to `src/ecs/traits.ts`
- `src/systems/baseManagement.ts` — founding, production ticks, power, storage (339 lines)
- `src/ui/base/BasePanel.tsx` — side panel for base management
- `src/game/BaseMarker.ts` — BabylonJS cylinder meshes for base indicators
- 32 tests passing for base management logic
- 3 cult bases pre-placed in App.tsx during world init
- **Never visually verified** — base markers may or may not appear

### Narration (DONE)
- Auto-advance with 2500ms hold + 500ms fade transitions
- Click/tap to complete text or skip timer
- SKIP button works
- Progress dots, speaker labels, mood colors
- **Visually verified** — works correctly in Chrome

### Game Systems Wiring (DONE IN CODE)
- All 18 systems wired in `gameState.ts simulationTick()`
- Game loop runs via `scene.registerBeforeRender()` in GameCanvas
- Movement system runs per-frame, simulation ticks at fixed 1.0s intervals
- **Systems tick but their effects are invisible** because entities aren't rendered

### Cross-Chunk Pathfinding (WRITTEN)
- `WorldNavGraph` in `src/board/navigation.ts` merges per-chunk Yuka NavGraphs
- Border gate edges created when adjacent chunks are merged
- **Never tested with actual unit movement** in the browser

### Audio (EXISTS FROM BEFORE, NOT CHANGED)
- Tone.js storm ambience (brown noise + periodic thunder)
- Epoch-based music (pad synth + bass per epoch)
- SFX system with named sound effects
- Audio init on first user gesture (NEW GAME click)
- **Audio was already implemented before this refactor** — not new work

### Persistence (PARTIALLY DONE)
- `sql.js/dist/sql-asm.js` web adapter exists and works
- `@capacitor-community/sqlite` adapter added from cursor branch
- Save/Load buttons in TopBar
- **Capacitor SQLite adapter uses dynamic import and returns null if native bridge unavailable**
- **No proper schema migration** — cursor branch had schema v4 with full tables, we just have basic ECS serialization

### Style (DONE LATE, AFTER BEING CALLED OUT)
- Ice blue palette (#8be6ff) replaces mint green (#00ffaa)
- Applied across: LandingScreen, NewGameModal, NarrativeOverlay, RadialMenu, MoveMarker
- Tailwind config already had cyan palette (blue-tinted)
- **Should have been the right color from the start** — spec never said green

### Governor / Playtest (DONE BUT ONLY IN TEST HARNESS)
- `src/ai/governor/PlaytestGovernor.ts` — automated RTS AI
- Explores, attacks, scavenges, founds bases
- `src/systems/playtestBridge.ts` — `window.__syntheteria` API
- 22 governor unit tests, 10 browser test files, 4 E2E tests
- `forceTicks()` for headless E2E (bypasses WebGL render loop)
- **Governor runs in tests but never tested in the actual game** because robots aren't visible

### Error Handling (DONE)
- All 17 bare `catch {}` blocks fixed with logging
- ErrorBoundary wraps app root
- DebugOverlay toggles with backtick
- `gameAssert()` for invariants

### CI/CD (DONE)
- `ci.yml` — PRs: lint, tsc, test, browser test, build
- `cd.yml` — push to main: GitHub Pages + Android debug APK
- Playwright config updated to port 8080

### Documentation Cleanup (DONE)
- CLAUDE.md updated to reflect current architecture
- HANDOFF.md updated (Webpack, removed Vite/POC refs)
- Historical notes on all pre-pivot design docs
- Outdated ARCHITECTURE.md deleted
- INDEX.md archived
- All 56 PR review threads resolved across 5 automated reviewers

### Test Infrastructure (DONE)
- 722 unit tests passing (55 suites)
- 48 browser tests (10 files, headed Chrome via vitest browser plugin)
- 4 Playwright E2E tests
- 19 previously failing zone tests FIXED (zoneForTile normalization bug)
- 0 TypeScript errors, 0 lint errors

---

## What Was SUPPOSED To Be Done But ISN'T

### Robots Not Visible
The spec says "9 robot GLBs load and position from Koota entities." The code loads GLBs but they DON'T APPEAR ON SCREEN. The `EntityRenderer` was never visually verified. Possible causes:
- Model scale wrong (too small or too large for the camera distance)
- Position mismatch (entity positions in tile coords, meshes in world coords — conversion may be wrong)
- Camera angle too flat to see low-profile models
- Models may be below the ground plane or inside walls

### Camera Has No Depth
The spec says "2.5D RTS top-down." The implementation is FULLY top-down (beta=1°). There is ZERO depth perception. Walls that are 2-6 units tall look exactly like floors. This is NOT 2.5D — it's 2D with extra steps. The camera beta needs to be 20-30° to show wall height and give the labyrinth visual depth.

### No Starting Focus
When gameplay starts, the camera should center on the player's two starter robots. Instead it centers on the chunk coordinate origin. The player has no idea where they are or what to do.

### No Visible Game State
- No robots → can't select anything → selection info always shows "No Selection"
- No enemies visible → combat system ticks but nothing happens visually
- No scavenge sites visible → resource system runs but player can't interact
- Base markers may or may not render — never checked

### Movement Not Working Visually
The movement system runs per-frame and the pathfinding code exists, but since robots aren't visible, movement was never verified. Click-to-move may work in ECS but produce no visual result.

### Combat Not Working Visually
The combat system runs in `simulationTick()` but with no visible units, there's no way to see or verify combat.

### Fog of War Not Implemented
The spec mentions "fragment merge fog-of-war" as a key mechanic. It's not visually implemented. The exploration system runs but there's no visual fog-of-war effect on the game canvas.

### Save/Load Not Verified
Save/Load buttons exist in TopBar. The persistence system uses sql.js. But:
- No proper schema with migrations (cursor branch had schema v4)
- Save/load round-trip never tested in the browser
- Capacitor SQLite adapter returns null on web (dynamic import fails silently)

### No Capacitor Setup
`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` are in package.json but:
- No `npx cap init` was run
- `capacitor.config.ts` exists but android/ directory was gitignored
- No Android build tested
- CD pipeline has `npx cap sync android` step but it will fail without the platform directory

### Radial Menu Not Wired
`src/ui/game/RadialMenu.tsx` exists with FOUND BASE and HACK actions but:
- Right-click input handler was supposedly wired but never verified
- RadialMenu rendering was never seen in a screenshot

### Circuit Trace Accents
The spec mentions "circuit trace accents" as part of the labyrinth visual identity. Not implemented.

### Texture 404s
PBR texture paths reference files in `/assets/textures/pbr/concrete/` and `/assets/textures/pbr/metal/` — these directories may not exist in `public/`. The labyrinth renders with fallback colors, not actual textures.

---

## What Was Done That SHOULDN'T Have Been

### Removing R3F
R3F was removed entirely in Task 3 because "BabylonJS replaces it." This was wrong. The landing page globe used R3F with GLSL shaders and worked perfectly. BabylonJS 8's WebGPU engine can't run GLSL shaders in custom ShaderMaterial. Hours were wasted writing a BabylonJS shader port, then debugging why it rendered black, then restoring R3F.

### 40+ Subagent Dispatches
The subagent-driven development workflow dispatched implementer + spec reviewer + code quality reviewer for each task. That's 3 agents per task × 14 tasks = 42 agent calls minimum, plus audit agents, explorer agents, fix agents. Each agent did file reads, edits, and commits without visual verification. Massive token waste for infrastructure that doesn't produce a visible game.

### Claiming "Production Ready"
Multiple audit agents reported "98% done, production ready" based on file existence checks. Nobody opened Chrome and looked at the game. This is the fundamental failure of the session.

### Premature Documentation
Hours spent updating CLAUDE.md, HANDOFF.md, INDEX.md, all design docs with historical notes, resolving 56 PR review threads — while the game itself didn't work. Documentation of a broken game is worthless.

---

## Files Created/Modified This Session

### New Files (25+)
```
src/game/GameCanvas.tsx          — Reactylon Engine+Scene
src/game/ChunkManager.ts         — chunk load/unload
src/game/EntityRenderer.ts       — GLB mesh lifecycle (NOT WORKING)
src/game/InputHandler.ts         — mouse input
src/game/MoveMarker.ts           — destination indicator
src/game/BaseMarker.ts           — base visualization
src/ui/layout/GameLayout.tsx     — responsive layout
src/ui/layout/TopBar.tsx         — resources/controls
src/ui/layout/Sidebar.tsx        — minimap+selection+actions
src/ui/layout/Minimap.tsx        — canvas minimap
src/ui/layout/SelectionInfo.tsx  — unit details
src/ui/layout/ActionPanel.tsx    — action buttons
src/ui/base/BasePanel.tsx        — base management panel
src/ui/lib/utils.ts              — cn() helper
src/systems/baseManagement.ts    — base ECS system
src/systems/playtestBridge.ts    — window.__syntheteria API
src/ai/governor/PlaytestGovernor.ts — automated AI
src/db/capacitorAdapter.ts       — Capacitor SQLite
webpack.config.ts                — Webpack 5 config
tailwind.config.ts               — Tailwind config
postcss.config.js                — PostCSS config
.github/workflows/ci.yml         — CI pipeline
.github/workflows/cd.yml         — CD pipeline
tests/components/*.browser.test.tsx — 10 browser test files
```

### Deleted Files
```
vite.config.ts
tsconfig.app.json
tsconfig.poc.json
src/static-assets.ts
src/poc/ (entire directory)
src/rendering/ (entire directory — 6 files)
src/camera/ (already gone)
src/input/TopDownCamera.tsx
src/input/UnitInput.tsx
src/ui/GameUI.tsx (1597 lines)
src/ui/TitleScreen.tsx
docs/technical/ARCHITECTURE.md
.github/workflows/deploy.yml (replaced by cd.yml)
webpack.poc.config.ts
200+ GLB model files (committed deletions from prior work)
```

### Modified Files (30+)
```
package.json — deps, scripts
tsconfig.json — flattened
index.html — cleaned for Webpack
src/index.tsx — new entry point
src/index.css — Tailwind directives
src/App.tsx — stripped R3F, added GameCanvas
src/ecs/traits.ts — added Base trait
src/ecs/gameState.ts — wired all systems + governor
src/board/scene.ts — floorType guard
src/board/navigation.ts — WorldNavGraph
src/board/zones.ts — zoneForTile normalization fix
src/config/models.ts — BASE_URL fallback
src/ui/landing/LandingScreen.tsx — GlobeBackground, ice blue
src/ui/landing/GlobeBackground.tsx — restored from git
src/ui/landing/title/shaders.ts — restored original GLSL
src/ui/game/NarrativeOverlay.tsx — auto-advance + blue
src/ui/game/RadialMenu.tsx — blue palette
src/vendor.d.ts — ImportMetaEnv types
biome.json — rule adjustments
playwright.config.ts — port 8080
vitest.browser.config.ts — headed Chrome
CLAUDE.md — full rewrite
docs/HANDOFF.md — updated
docs/INDEX.md — archived
All docs/design/*.md — historical notes
All docs/superpowers/plans/*.md — historical notes
```

---

## Commit History (40 commits on feature/rts-course-correction)

Key commits:
```
700dce35 feat: kill Vite, promote Webpack + Reactylon
588896b7 feat: install shadcn/ui + Tailwind CSS
0c1f6cd3 chore: delete old R3F rendering layer
a819ce3f feat: BabylonJS game canvas with chunk-based labyrinth
70acce21 feat: robot GLBs loaded and positioned from Koota entities
f06fa6e9 feat: mouse-first input — click to select, move, attack
dedb956e feat: responsive RTS HUD — sidebar desktop, bottom mobile
7786dc27 feat: base system — founding, production, side panel
b6efe2c0 feat: narration auto-advances with fade transitions
58be51b2 feat: landing page storm globe ported to BabylonJS (BROKEN)
0740e20d feat: all game systems wired into BabylonJS render loop
a27327f8 feat: add RTS playtest governor + vitest tests
c0e86ef9 fix: P1 playtest issues — move marker, box select, action buttons
ab8d04ff polish: P2 playtest refinements
1e87eb42 feat: restore R3F landing globe + Capacitor SQLite
e0b94580 fix: BASE_URL fallback + guard undefined floorType
style: ice blue palette replaces mint green
docs: honest status — infrastructure built, game not playable yet
```

---

## What The Next Session Must Do

**Priority 1: Make robots visible.** Debug EntityRenderer in Chrome DevTools. Check mesh positions, scale, camera angle. This is THE blocker.

**Priority 2: Fix camera angle.** Change beta from 1° to 20-30°. Give the labyrinth depth. Make it look like a 2.5D RTS, not a 2D grid.

**Priority 3: Center camera on spawn.** When gameplay starts, camera target must be the player's starting robots, not chunk 0,0.

**Priority 4: Verify interaction loop.** Click robot → see selection ring → click ground → see robot move → encounter enemy → see combat. All in the real browser.

**Priority 5: Check PBR textures.** Do the texture files exist in public/? Are they loading or are all tiles using fallback colors?

Everything else (tests, docs, CI, governor, base system) is secondary until the player can SEE and INTERACT with the game.
