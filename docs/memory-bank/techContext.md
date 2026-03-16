# Tech Context: Syntheteria

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Build** | Vite | Primary. `pnpm dev`, `pnpm build`. Entry: `src/main.tsx`. |
| **Native wrap** | Capacitor | Same Vite build; `pnpm cap:sync`, `cap:ios`/`cap:android`. |
| **ECS** | Koota | Canonical gameplay state. Migrated from Miniplex. |
| **Rendering** | React Three Fiber + Three.js + Drei | R3F only (no Filament in primary path). 39 renderer components. |
| **UI (Vite)** | DOM + inline styles | `AppVite.tsx`, `GameHUDDom.tsx`, DOM title. |
| **UI (Expo/RN)** | NativeWind v4 + React Native | Legacy; `GameHUD.tsx`, `TitleScreen.tsx`. |
| **Persistence** | Capacitor SQLite + sql.js session | Capacitor: web IndexedDB, native SQLite. Session: in-memory sql.js (sync API). `db/viteCapacitorSession.ts`, `db/capacitorDb.ts`. |
| **Schema** | Drizzle ORM | Typed schema; bootstrap + seed in `db/bootstrap.ts`, `db/seedGameData.ts`. |
| **Audio** | Tone.js | Spatial audio, procedural SFX, adaptive music. |
| **Testing** | Jest + Playwright + Vitest | Jest: unit/component. Playwright CT: `tests/components/` (headed). Playwright E2E: `tests/e2e/` (headed; CI uses `xvfb-run -a`). Vitest: `*.vitest.ts`. |
| **Lint/format** | Biome | Tabs, double quotes, sorted imports. |
| **Physics** | Rapier | Decoupled via callbacks. |

## Codebase Scale

- ~375+ source files (.ts/.tsx)
- Jest suites in `src/**/__tests__/`; Playwright CT in `tests/components/`; E2E in `tests/e2e/`
- JSON config in `src/config/`; sql.js WASM at `public/sql-wasm.wasm` for session DB

## Project Structure

```
src/
  main.tsx          # Vite entry: Capacitor SQLite init → session DB → AppVite
  AppVite.tsx       # Vite app: DOM title + GameSceneR3F + GameHUDDom
  GameSceneR3F.tsx  # R3F scene (single 3D path)
  ai/               # GOAP governors, Yuka steering, NavMesh
  city/             # City runtime, CityKitLab
  config/           # JSON config + loaders
  db/               # Capacitor SQLite, sql.js session, bootstrap, schema
    viteCapacitorSession.ts  # initCapacitorDbForVite, createSessionDbSync
    capacitorDb.ts          # Async Capacitor API
    testDb.ts               # sql.js in-memory (session + Jest)
  ecs/              # Koota traits, game loop
  rendering/        # R3F renderers
  systems/          # Game systems (pure logic)
  ui/               # RN panels + dom/ (GameHUDDom, DiegeticChip)
tests/
  components/       # Playwright CT (*.spec.tsx)
  e2e/              # Playwright E2E (*.spec.ts); done-checklist.spec.ts
docs/               # memory-bank, design, technical, interface, plans
public/             # Static assets; sql-wasm.wasm for sql.js
```

## Key Dependencies

- `koota` — ECS
- `@react-three/fiber`, `@react-three/drei`, `three` — R3F
- `@capacitor-community/sqlite`, `@capacitor/core` — persistence (web + native)
- `sql.js` — in-memory session DB (sync API)
- `drizzle-orm` — schema
- `tone` — audio
- `yuka` — steering, NavMesh
- `playwright`, `@playwright/test` — CT and E2E (headed)

## Platform Constraints

- **Touch-first:** Interactions must work on mobile. Radial menu (long-press) for context.
- **Vite is primary.** Metro/Expo retained for legacy Jest and optional Expo build.
- **Playwright runs headed** (`headless: false`). On CI (no display), use `xvfb-run -a` (xvfb is preinstalled on ubuntu-latest).

## Build & Run

```bash
pnpm install
pnpm dev              # Vite dev server (http://localhost:5173)
pnpm build            # Vite build
pnpm verify           # Full CI: lint + tsc + test + test:ct
pnpm lint             # Biome check
pnpm lint:fix         # Biome autofix
pnpm tsc              # TypeScript check
pnpm test             # Jest (unit + component)
pnpm test:ct          # Playwright component tests (headed)
pnpm test:e2e         # Playwright E2E (headed; start dev server first or use webServer in config)
pnpm test:vitest      # Vitest (*.vitest.ts)
```

## Persistence Model

- **Capacitor SQLite:** Schema and persistence (web: IndexedDB; native: SQLite). Initialized first in `main.tsx`.
- **Session DB (sql.js):** In-memory, sync API. Bootstrap + seed. All runtime reads/writes go through `getDatabaseSync()`.
- Campaign saves: seed, sector map, POIs, world entities, AI state, turn state, discovery, etc. See `db/worldPersistence.ts`, `db/saveAllState.ts`.

## Testing Conventions

- **Jest:** Unit and component tests in `src/**/__tests__/`. Use `createTestDb()` for DB tests. Mock R3F/ECS as needed.
- **Playwright CT:** Isolated components in `tests/components/*.spec.tsx`. Headed. Stubs for react-native, expo-asset, etc. in `playwright-ct.config.ts`.
- **Playwright E2E:** Full app in `tests/e2e/`. Headed; CI runs with `xvfb-run -a`. Config: `playwright.e2e.config.ts`.
- **Vitest:** `*.vitest.ts` for Vite-side unit tests.
- Tests MUST use config/JSON as source of truth where applicable. Use `gameplayRandom` / `scopedRNG` for determinism.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

- **Quality job:** checkout → pnpm install → lint → tsc → test (Jest) → build:web
- **E2E job:** checkout → pnpm install → Playwright install chromium → **xvfb-run -a** playwright test -c playwright.e2e.config.ts → upload report

Done checklist and path to done: [docs/plans/IS_THE_GAME_DONE.md](../plans/IS_THE_GAME_DONE.md).
