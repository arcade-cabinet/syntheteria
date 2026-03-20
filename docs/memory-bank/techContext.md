# Tech Context: Syntheteria (Ground-Up Rewrite)

> **Partially stale** — update when stack shifts. Authoritative: `docs/ARCHITECTURE.md`, `docs/memory-bank/progress.md`, `docs/CLOUD_AGENT_RUNBOOK.md`.

## Stack

| Layer | Technology |
|-------|-----------|
| Bundler | **Vite** — `pnpm dev`, `pnpm build` |
| Renderer | **Title:** R3F `Globe.tsx` · **Match:** Phaser + enable3d `src/views/` (see `RENDERING_VISION.md`) |
| ECS | **Koota** — all game state as typed traits |
| Persistence | **sql.js** (pure JS SQLite) + **Capacitor SQLite** (`@capacitor-community/sqlite`, `jeep-sqlite`) |
| Preferences | **@capacitor/preferences** — key-value store for player settings |
| Testing | **Vitest** — `*.vitest.ts` files |
| Lint/format | **Biome** — tabs, double quotes, sorted imports |
| GLSL | Extracted `.glsl` files with **vite-plugin-glsl** `#include` directives |

Entry: `src/main.tsx` (Root component — screen state machine + DOM bootstrap)

## Key Dependencies

- `koota` — ECS
- `@react-three/fiber`, `@react-three/drei`, `three` — R3F
- `phaser` — Phaser 3 game framework (match board)
- `@enable3d/phaser-extension` — Three.js bridge for Phaser
- `sql.js` — in-memory SQLite (pure JS)
- `@capacitor-community/sqlite` — Capacitor SQLite for Android/iOS/Web
- `@capacitor/preferences` — cross-platform key-value preferences
- `jeep-sqlite` — web component for SQLite on web platform
- `vite` + `vite-plugin-glsl` — bundler + GLSL imports

## Build & Test

```bash
pnpm dev              # Vite dev server (http://localhost:5173)
pnpm build            # Production build
pnpm test:vitest      # All Vitest test files (see `progress.md` for current count)
pnpm test:ct          # Vitest browser visual tests
pnpm test:e2e         # Playwright E2E
pnpm tsc              # TypeScript check (0 errors)
pnpm lint             # Biome lint + format check
pnpm verify           # lint + tsc + test (full gate)
```

## Platform

- Web-first (Vite). No React Native, no Metro, no Expo on this branch.
- Capacitor for Android + iOS + Web targets.
- Touch targets designed for mobile but primary dev is browser.
- Playwright E2E + Vitest browser CT available.

## Codebase Scale

- ~457 active `.ts`/`.tsx` files under `src/`
- 130 Vitest test files, all passing
- 2282 tests
- 0 TypeScript errors
- ~360 GLB models in public/assets/models/
- 20 config definition files in `src/config/` (incl. registry, preferences, milestones, encounters)

## What `pending/` Is

The old React Native / Metro / GOAP ecumenopolis game. Permanently quarantined.
Excluded from tsconfig and Biome. Used as a reference library only.
See `docs/ARCHITECTURE.md` for the reference map.
