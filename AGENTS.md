# Syntheteria — Agent Instructions

> **Read this file FIRST.** It is the single source of agentic truth.

## What This Is

2.5D top-down RTS. AI wakes up in a dead ecumenopolis. Explore labyrinth, scavenge, fabricate, fight Cult of EL. Chunk-based infinite world. Real-time with pause. Component damage (not HP). Mouse-first input.

## Current State

**Playable. All 22 PRD stories implemented. Victory/defeat conditions. Board generates all entities.**

- 780 unit tests, 62 suites, 51 browser tests, 0 tsc errors, 0 lint errors
- Build: Vite 8 + @vitejs/plugin-react + babel-plugin-reactylon
- Landing: BabylonJS storm globe with WGSL custom ShaderMaterial (WebGPU native)
- Gameplay: BabylonJS/Reactylon game canvas, 25° camera, fog of war, salvage nodes
- HUD: React DOM overlays (TopBar, Sidebar, Minimap, SelectionInfo, ActionPanel)

Known issues:
- Globe has weird static blob / repeating pattern (shader continent logic)
- Test quality needs improvement (more ECS exercise, fewer placeholders)

## Tech Stack

| What | Tech |
|------|------|
| Game engine | BabylonJS 8.x (WebGPU) + Reactylon 3.x |
| ECS | Koota 0.6.x |
| AI | Yuka 0.7.x (GOAP, NavGraph) |
| Collision | Tile-based NavGraph (no physics engine) |
| Build | Vite 8 + @vitejs/plugin-react + babel-plugin-reactylon |
| UI | React 19 + shadcn/ui + Tailwind 3 |
| Persistence | @capacitor-community/sqlite (web + native) with sql.js fallback |
| Audio | Tone.js |
| Testing | Vitest (unit + browser, zero mocks) |
| Mobile | Capacitor |

## Critical Rules

1. **WebGPU is the game engine.** Custom shaders use WGSL + ShadersStoreWGSL + ShaderLanguage.WGSL.
2. **No JSON configs.** All game data in TypeScript `const` objects in `src/config/`.
3. **ECS systems accept `world: World` param** for testability.
4. **Mouse-first.** If it can't be done with a mouse, UX has FAILED.
5. **No silent fallbacks.** `catch {}` is banned. Log + throw or log + comment why non-fatal.
6. **NEVER claim done without visual verification.** Open Chrome, take a screenshot, look at it.
7. **Everything is in scope.** Never defer review feedback as "out of scope."
8. **Don't remove working libraries.** Multiple renderers can coexist.
9. **No mocks in browser tests.** Vite compiles everything including Reactylon.
10. **Best solution, not quickest.** Choose what's right for the codebase, not the fastest fix.
11. **Capacitor SQLite works on web too.** Not just native.

## Source Structure

```
src/
├── ai/              — Yuka GOAP (cultBehavior) + PlaytestGovernor
├── app/             — App.tsx, ErrorBoundary, DebugOverlay, GameOverlays, initializeWorld
├── audio/           — Tone.js (ambience, music, sfx)
├── board/           — chunk generation, scene rendering, navigation, coords, zones
├── components/
│   ├── base/        — BasePanel (side panel for base management)
│   └── game/        — TopBar, Sidebar, ActionPanel, SelectionInfo, Minimap
├── config/          — TypeScript game data (robots, cults, models, materials, buildings)
├── db/              — SQLite persistence (adapter, webAdapter, capacitorAdapter, serialize)
├── ecs/             — Koota traits, factory, gameState, world
├── game/            — BabylonJS game layer (canvas, entities, input, fog, markers)
├── input/           — ECS selection/movement logic (engine-independent)
├── lib/             — shared utilities (cn helper)
├── render/
│   └── landing/     — GlobeBackground, WGSL shaders, scene setup, diagnostics
├── systems/         — 18+ game systems (combat, resources, power, fabrication, etc.)
├── views/
│   ├── game/        — GameLayout, NarrativeOverlay
│   └── landing/     — LandingScreen, NewGameModal
└── errors.ts        — logError, gameAssert
```

## Key Files

- `src/app/App.tsx` — phase state machine (title → narration → playing)
- `src/game/GameCanvas.tsx` — BabylonJS scene, camera, chunk loading, game loop
- `src/render/landing/GlobeBackground.tsx` — storm globe with WGSL shaders
- `src/render/landing/shaders.ts` — WGSL vertex + fragment shaders (storm, globe, lightning, hypercane)
- `src/render/landing/diagnostics.ts` — shader compilation diagnostics for tests
- `src/ecs/gameState.ts` — 18 systems in `simulationTick()`
- `src/ecs/traits.ts` — all Koota trait definitions
- `src/board/chunks.ts` — 32×32 deterministic chunk generation
- `src/board/scene.ts` — imperative BabylonJS mesh creation from chunks

## Docs

- `CLAUDE.md` — commands, docs index
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — status + architecture
- `docs/superpowers/plans/2026-03-27-test-plan.md` — test plan
- `docs/design/` — game design (overview, mechanics, combat, consciousness, drones)

## Testing

```bash
pnpm test           # 780 unit tests (vitest, jsdom)
pnpm test:browser   # browser tests (vitest, headed Chrome, zero mocks)
pnpm tsc            # Type check (0 errors)
pnpm lint           # Biome lint (0 errors)
pnpm build          # Production build (vite)
```

## Before Claiming Work Is Done

1. `pnpm tsc && pnpm lint`
2. `pnpm test && pnpm test:browser`
3. `pnpm dev` → open Chrome DevTools MCP → localhost:8080
4. Screenshot every visual change
5. Look at it. Does it look right?
