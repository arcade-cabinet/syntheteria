# Tech Context: Syntheteria (Ground-Up Rewrite)

> Current stack for the `ralph/syntheteria-1-0` branch.
> Full details: `docs/ARCHITECTURE.md`

## Stack

| Layer | Technology |
|-------|-----------|
| Bundler | **Vite** — `pnpm dev`, `pnpm build` |
| Renderer | **R3F** — one `<Canvas>` in `GameScreen.tsx` |
| ECS | **Koota** — all game state as typed traits |
| Persistence | **sql.js** — pure JS SQLite, no wasm needed |
| Testing | **Vitest** — `*.vitest.ts` files |
| Lint/format | **Biome** — tabs, double quotes, sorted imports |
| GLSL | Extracted `.glsl` files with **vite-plugin-glsl** `#include` directives |

Entry: `src/main.tsx` (Root component — screen state machine + DOM bootstrap)

## Key Dependencies

- `koota` — ECS
- `@react-three/fiber`, `@react-three/drei`, `three` — R3F
- `sql.js` — in-memory SQLite (pure JS)
- `vite` + `vite-plugin-glsl` — bundler + GLSL imports

## Build & Test

```bash
pnpm dev              # Vite dev server (http://localhost:5173)
pnpm build            # Production build
pnpm test:vitest      # All Vitest suites (~29 suites, all passing)
pnpm test:ct          # Vitest browser visual tests
pnpm test:e2e         # Playwright E2E
pnpm tsc              # TypeScript check (0 errors)
pnpm lint             # Biome lint + format check
pnpm verify           # lint + tsc + test (full gate)
```

## Platform

- Web-first (Vite). No React Native, no Metro, no Expo on this branch.
- Touch targets designed for mobile but primary dev is browser.
- Playwright E2E + Vitest browser CT available.

## Codebase Scale

- ~70 active `.ts`/`.tsx` files
- 29 test suites, all passing
- 0 TypeScript errors
- ~212 GLB models in public/assets/models/

## What `pending/` Is

The old React Native / Metro / GOAP ecumenopolis game. Permanently quarantined.
Excluded from tsconfig and Biome. Used as a reference library only.
See `docs/ARCHITECTURE.md` for the reference map.
