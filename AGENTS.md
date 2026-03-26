# Syntheteria — Agent Instructions

> **Read this file FIRST.** It is the single source of agentic truth.

## What This Is

2.5D top-down RTS. AI wakes up in a dead ecumenopolis. Explore labyrinth, scavenge, fabricate, fight Cult of EL. Chunk-based infinite world. Real-time with pause. Component damage (not HP). Mouse-first input.

## Current State

**Waves 1-4 complete. Rendering works (robots visible, 25° camera, fog of war). All tests green.**

- 732 unit tests, 53 browser tests, 0 tsc errors, 0 lint errors
- Landing: BabylonJS storm globe renders
- Gameplay: chunk labyrinth with PBR textures, robots visible, fog of war, salvage nodes
- Camera: 25° beta with intro animation, pan+zoom
- HUD: TopBar, Sidebar, Minimap, SelectionInfo, ActionPanel — all tested
- Governor: automated AI playtests 100+ ticks

Remaining work:
- Visual polish (combat feedback needs real browser verification)
- Save/load UI integration testing
- Capacitor mobile build verification

## Tech Stack

| What | Tech |
|------|------|
| Game engine | BabylonJS 8.x (WebGPU) + Reactylon 3.x |
| Landing page | BabylonJS + Reactylon (ported from R3F in Wave 2) |
| ECS | Koota 0.6.x |
| AI | Yuka 0.7.x (GOAP, NavGraph) |
| Build | Vite 8 + @vitejs/plugin-react + babel-plugin-reactylon |
| UI | React 19 + shadcn/ui + Tailwind 3 |
| Persistence | @capacitor-community/sqlite (web + native) with sql.js fallback |
| Audio | Tone.js |
| Testing | Vitest (unit + browser, zero mocks) + Playwright (E2E) |
| Mobile | Capacitor |

## Critical Rules

1. **WebGPU is the game engine.** Do NOT fall back to WebGL. Fix shaders for WebGPU.
2. **No JSON configs.** All game data in TypeScript `const` objects in `src/config/`.
3. **ECS systems accept `world: World` param** for testability.
4. **Mouse-first.** If it can't be done with a mouse, UX has FAILED.
5. **No silent fallbacks.** `catch {}` is banned. Log + throw or log + comment why non-fatal.
6. **NEVER claim done without visual verification.** Open Chrome, take a screenshot, look at it.
7. **Everything is in scope.** Never defer review feedback as "out of scope."
8. **Don't remove working libraries.** Multiple renderers can coexist.
9. **No mocks in browser tests** unless genuinely impossible (WebGL context in jsdom). Vite compiles everything.
10. **Capacitor SQLite works on web too.** Not just native.

## Key Files

### Architecture
- `CLAUDE.md` — commands, docs index
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — status + architecture reference

### Game Design
- `docs/design/GAME_OVERVIEW.md` — 3-phase game loop
- `docs/design/CORE_MECHANICS.md` — fragmented maps, component damage, hacking
- `docs/design/COMBAT.md` — component-based damage
- `docs/design/CONSCIOUSNESS_MODEL.md` — AI consciousness
- `docs/design/DRONES.md` — starting units
- `docs/story/LORE_OVERVIEW.md` — world lore
- `docs/technical/CORE_FORMULAS.md` — math formulas

### Source Code
- `src/index.tsx` — Vite entry, Havok init, React mount
- `src/App.tsx` — phase state machine (title → narration → playing)
- `src/game/GameCanvas.tsx` — BabylonJS scene, camera, chunk loading, game loop
- `src/game/EntityRenderer.ts` — GLB mesh lifecycle, salvage nodes, base markers
- `src/game/FogOfWar.ts` — three-state visibility (hidden/shroud/visible)
- `src/game/InputHandler.ts` — pointer events → ECS selection/movement
- `src/ecs/gameState.ts` — 18 systems in `simulationTick()`
- `src/ecs/traits.ts` — all Koota trait definitions
- `src/board/chunks.ts` — 32×32 deterministic chunk generation
- `src/board/scene.ts` — imperative BabylonJS mesh creation from chunks
- `src/config/` — all game data (robotDefs, cultDefs, models, floorMaterials, buildingDefs)

### Do NOT read
- `docs/archive/` — 22 obsolete docs. Ignore unless user asks.

## Source Structure

```
src/
├── ai/           — Yuka GOAP (cultBehavior) + PlaytestGovernor
├── audio/        — Tone.js (ambience, music, sfx)
├── board/        — chunk generation, scene rendering, navigation, coords, zones
├── config/       — TypeScript game data (robots, cults, models, materials, buildings)
├── db/           — SQLite persistence (adapter, webAdapter, capacitorAdapter, serialize)
├── ecs/          — Koota traits, factory, gameState, world
├── game/         — BabylonJS game layer (canvas, entities, input, fog, markers)
├── input/        — ECS selection/movement logic (engine-independent)
├── systems/      — 18+ game systems (combat, resources, power, fabrication, etc.)
├── ui/
│   ├── base/     — BasePanel (side panel for base management)
│   ├── game/     — NarrativeOverlay, ErrorBoundary, DebugOverlay
│   ├── landing/  — LandingScreen, GlobeBackground (BabylonJS), NewGameModal
│   ├── layout/   — GameLayout, TopBar, Sidebar, Minimap, SelectionInfo, ActionPanel
│   └── lib/      — cn() utility (shadcn pattern)
└── errors.ts     — logError, gameAssert
```

## Testing

```bash
pnpm test           # 732 unit tests (vitest, jsdom)
pnpm test:browser   # 53 browser tests (vitest, headed Chrome, zero mocks)
pnpm test:e2e       # E2E tests (playwright)
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
