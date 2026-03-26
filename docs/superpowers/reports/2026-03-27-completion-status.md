# Completion Status — 2026-03-27

## What Works

- **Build:** Vite 8 + babel-plugin-reactylon, dev server at :8080, production build clean
- **Landing page:** BabylonJS Engine + WGSL shaders compile on WebGPU, bezel arc + buttons render
- **Gameplay canvas:** BabylonJS/Reactylon renders labyrinth chunks with PBR textures, 25° camera, fog of war, salvage nodes, robots visible
- **HUD:** React DOM overlays — TopBar, Sidebar, Minimap, SelectionInfo, ActionPanel
- **ECS:** 18 game systems wired in simulationTick(), Koota traits, governor AI
- **Tests:** 732 unit tests + 50 browser tests, 0 tsc errors, 0 lint errors
- **Codebase:** Clean — zero legacy artifacts, DRY docs, ESM throughout

## What's Broken

### Globe Shader — Static Blob, No Continents
The WGSL port of the globe shader compiles without errors but renders incorrectly:
- Static blob instead of recognizable Earth continents
- Repeating patterns instead of smooth noise
- The `continentPattern()` function uses `atan2()` and `asin()` for lat/lon but the WGSL port may have incorrect trig behavior (WGSL atan2 arg order, NDC z-range 0-1 vs GLSL -1 to 1)
- The noise/fbm functions may produce different distributions in WGSL due to float precision or function naming conflicts

**Fix approach:** Debug the globe fragment shader step by step — output solid colors for each continent region to verify lat/lon mapping, then verify noise output range, then verify the full composition.

### Browser Test Quality — Placeholders, Not Real Integration
The 50 browser tests check DOM content ("does SYNTHETERIA appear?") but don't actually exercise:
- Full ECS game loop with real entity interactions
- Real mouse/pointer input → visual response verification
- Shader compilation verification via diagnostics API
- Canvas pixel verification (is the globe actually rendering non-black?)
- Multi-tick governor gameplay with resource/combat state assertions

**What real integration tests should look like:**
- Landing: verify `window.__syntheteriaLandingDiagnostics` reports all 5 shaders compiled, canvas has non-black pixels in globe region
- Gameplay: render App, navigate to gameplay, verify BabylonJS scene has meshes, camera at correct beta, FogOfWar state initialized
- Governor playthrough: 100+ ticks with assertions on position changes, resource deltas, combat events — not just "governor made decisions"
- Component tests should spawn real ECS entities, trigger real interactions (click buttons, verify state changes), not just check text presence

### Playthrough Test Broken
The E2E playthrough test looks for "SYNTHETERIA" as DOM text but the title now renders inside the BabylonJS canvas (hero mesh). Needs to use the diagnostics API instead.

## Architecture Decisions Made

1. **Vite 8** replaces Webpack — unified bundler for dev + tests, ESM throughout
2. **WGSL** for custom shaders — WebGPU native, no GLSL transpilation
3. **Zero mocks** in browser tests — Vite compiles Reactylon natively
4. **Source restructure:** app/ + components/ + views/ + render/ + lib/ replaces flat ui/
5. **Diagnostics API:** `window.__syntheteriaLandingDiagnostics` for testable shader state
6. **All legacy deleted:** game/, reactylon-poc/, prototype/, pending/, docs/archive/ — 14K lines removed

## Next Session Priorities

1. **Fix globe shader** — debug continent pattern in WGSL, verify noise functions
2. **Real integration tests** — use diagnostics API, pixel verification, full ECS exercise
3. **Hero mesh permanence** — make the landing hero (title text mesh) a permanent part of the scene
4. **Gameplay lightning** — BabylonJS tube-based lightning bolts on the game board (not shaders)
