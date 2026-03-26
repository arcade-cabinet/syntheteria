# Syntheteria — Agent Instructions

> **Read this file FIRST.** It is the single source of agentic truth.

## What This Is

2.5D top-down RTS. AI wakes up in a dead ecumenopolis. Explore labyrinth, scavenge, fabricate, fight Cult of EL. Chunk-based infinite world. Real-time with pause. Component damage (not HP). Mouse-first input.

## Current State

**Infrastructure built. Game NOT yet playable.** See `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` for the honest status.

Known broken:
- Robots not visible (EntityRenderer loads GLBs but meshes don't appear)
- Camera too flat (beta=1°, need 20-30° for depth)
- No starting focus (camera should center on player spawn)
- Some tiles have `floorType: "undefined"` (chunk gen edge case)

## Tech Stack

| What | Tech |
|------|------|
| Game engine | BabylonJS 8.x (WebGPU) + Reactylon 3.x |
| Landing page | R3F + Three.js (GLSL shaders, WebGL) — coexists with BabylonJS |
| ECS | Koota 0.6.x |
| AI | Yuka 0.7.x (GOAP, NavGraph) |
| Build | Webpack 5 + babel-plugin-reactylon |
| UI | React 19 + shadcn/ui + Tailwind 3 |
| Persistence | @capacitor-community/sqlite (web + native) with sql.js fallback |
| Audio | Tone.js |
| Testing | Vitest (unit + browser) + Playwright (E2E) |
| Mobile | Capacitor |

## Critical Rules

1. **R3F and BabylonJS coexist.** R3F for landing page, BabylonJS for game canvas. Different screens, never simultaneous. Do NOT remove either.
2. **WebGPU is the game engine.** Do NOT fall back to WebGL for the game canvas. Fix shaders to work with WebGPU, don't downgrade.
3. **No JSON configs.** All game data in TypeScript `const` objects in `src/config/`.
4. **ECS systems accept `world: World` param** for testability.
5. **Mouse-first.** If it can't be done with a mouse, UX has FAILED.
6. **No silent fallbacks.** `catch {}` is banned. Log + throw or log + comment why non-fatal.
7. **NEVER claim done without visual verification.** Open Chrome, take a screenshot, look at it. Tests passing ≠ working game.
8. **Everything is in scope.** Never defer review feedback as "out of scope" or "follow-up."
9. **Don't remove working libraries.** Multiple renderers, persistence layers, etc. can coexist.
10. **Capacitor SQLite works on web too.** Not just native.

## Key Files

### Architecture (read these)
- `CLAUDE.md` — commands, docs index
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — status, what's broken, architecture reference
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — what works, what's broken

### Game Design (read when implementing features)
- `docs/design/GAME_OVERVIEW.md` — 3-phase game loop
- `docs/design/CORE_MECHANICS.md` — fragmented maps, component damage, hacking
- `docs/design/COMBAT.md` — component-based damage
- `docs/design/CONSCIOUSNESS_MODEL.md` — AI consciousness
- `docs/design/DRONES.md` — starting units
- `docs/story/LORE_OVERVIEW.md` — world lore
- `docs/technical/CORE_FORMULAS.md` — math formulas

### Source Code (key entry points)
- `src/index.tsx` — Webpack entry, Havok init, React mount
- `src/App.tsx` — phase state machine (title → narration → playing)
- `src/game/GameCanvas.tsx` — BabylonJS scene, camera, chunk loading, game loop
- `src/game/EntityRenderer.ts` — GLB mesh lifecycle (BROKEN — needs debugging)
- `src/game/InputHandler.ts` — pointer events → ECS selection/movement
- `src/ecs/gameState.ts` — 18 systems in `simulationTick()`
- `src/ecs/traits.ts` — all Koota trait definitions
- `src/board/chunks.ts` — 32×32 deterministic chunk generation
- `src/board/scene.ts` — imperative BabylonJS mesh creation from chunks
- `src/config/` — all game data (robotDefs, cultDefs, models, floorMaterials, buildingDefs)

### Do NOT read (archived)
- `docs/archive/` — 22 obsolete docs from pre-pivot era. Ignore unless user explicitly asks.

## Source Structure

```
src/
├── ai/           — Yuka GOAP (cultBehavior) + PlaytestGovernor
├── audio/        — Tone.js (ambience, music, sfx)
├── board/        — chunk generation, scene rendering, navigation, coords, zones
├── config/       — TypeScript game data (robots, cults, models, materials, buildings)
├── db/           — SQLite persistence (adapter, webAdapter, capacitorAdapter, serialize)
├── ecs/          — Koota traits, factory, gameState, world
├── game/         — BabylonJS game layer (canvas, entities, input, markers)
├── input/        — ECS selection/movement logic (engine-independent)
├── systems/      — 18+ game systems (combat, resources, power, fabrication, etc.)
├── ui/
│   ├── base/     — BasePanel (side panel for base management)
│   ├── game/     — NarrativeOverlay, RadialMenu, ErrorBoundary, DebugOverlay
│   ├── landing/  — LandingScreen, GlobeBackground (R3F), NewGameModal
│   ├── layout/   — GameLayout, TopBar, Sidebar, Minimap, SelectionInfo, ActionPanel
│   └── lib/      — cn() utility (shadcn pattern)
└── errors.ts     — logError, gameAssert
```

## Testing

```bash
pnpm test           # 722 unit tests (vitest, jsdom)
pnpm test:browser   # 48 browser tests (vitest, headed Chrome)
pnpm test:e2e       # 4 E2E tests (playwright)
pnpm tsc            # Type check (0 errors)
pnpm lint           # Biome lint (0 errors)
pnpm build          # Production build (webpack)
```

## Before Claiming Work Is Done

1. Run `pnpm tsc && pnpm lint`
2. Run `pnpm test`
3. Start `pnpm dev`
4. Open Chrome DevTools MCP → navigate to localhost:8080
5. Take a screenshot of every visual change
6. Look at the screenshot. Does it look right?
7. If you can't tell, describe what you see and ASK the user
