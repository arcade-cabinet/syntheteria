# Tech Context: Syntheteria

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Expo SDK + Metro | NOT Vite. Metro web uses CJS wrappers. |
| ECS | Koota | Migrated from Miniplex. Koota owns canonical gameplay state. |
| Rendering | React Three Fiber + Three.js + Drei | 39 R3F renderer components in GameScene |
| UI / Styling | NativeWind v4 + React Native components | Touch-first, responsive |
| Persistence | expo-sqlite + Drizzle ORM | SQLite is authoritative persistence |
| Animation | animejs + react-native-reanimated | |
| Audio | Tone.js | Spatial audio, procedural SFX, adaptive music |
| Testing | Jest + ts-jest (unit/component), Playwright (E2E) | Migrated from Vitest |
| Formatting | Biome | Tabs, double quotes, sorted imports |
| Physics | Rapier | Decoupled via callbacks — never import directly in systems |

## Codebase Scale

- ~375 source files (.ts/.tsx)
- ~113 test suites, ~1,092 tests (all passing)
- 23+ JSON config files in `src/config/`
- Zero TypeScript errors on `tsc --noEmit`

## Project Structure

```
src/
  ai/           # GOAP governors, Yuka steering, NavMesh, bot brains
  city/         # City runtime, CityKitLab
  config/       # JSON config files + type-safe loader (config/index.ts)
  ecs/          # Koota traits, world setup
  rendering/    # R3F renderer components (39 total)
  systems/      # 21 game systems (tick per frame in gameState.ts)
  ui/           # React components — panels, modals, HUD, radial menu
    components/ # Shared primitives (HudButton, HudPanel)
    panels/     # TopBar, Notifications, ThoughtOverlay, Minimap, ResourceStrip
  utils/        # Helpers, RNG, math
tests/
  components/   # Jest component tests
  e2e/          # Playwright E2E tests
docs/           # Design docs, plans, contracts
config/         # Top-level config JSONs
assets/
  ui/           # Brand assets (background.png, mark.png, buttons/)
```

## Key Dependencies

- `koota` — ECS runtime (replaces Miniplex)
- `@react-three/fiber` + `@react-three/drei` — R3F rendering
- `three` — 3D engine
- `expo-sqlite` — persistence
- `drizzle-orm` — SQL query builder
- `tone` — audio engine
- `yuka` — AI steering behaviors + NavMesh
- `nativewind` — Tailwind for React Native
- `animejs` — animation
- `nipplejs` — mobile joystick input

## Platform Constraints

- **Touch-first:** All interactions must work on mobile. Radial menu (long-press) replaces right-click context menus.
- **Metro bundler:** Uses CJS module wrappers. ESM-only packages (e.g., zustand v5 using `import.meta.env`) require `unstable_conditionNames: ['react-native', 'browser', 'require', 'default']` in metro.config.js.
- **No Vite/Vitest:** Removed. Jest + ts-jest with tsconfig.test.json (CJS mode) is the test runner.
- **No Miniplex:** Fully migrated to Koota.
- **No raw CSS:** NativeWind v4 only.

## Metro ESM Workaround

Metro wraps modules in CJS `__d()` factories, so `import.meta` throws SyntaxError. Any npm package using `import.meta` in its ESM build will break. The fix is `unstable_conditionNames` in metro.config.js to force CJS resolution.

## Build & Run

```bash
# Install dependencies
npm install

# Development (web)
npx expo start --web

# Development (native)
npx expo start

# Run tests
npx jest

# Type check
npx tsc --noEmit

# Format
npx biome check --apply .

# E2E tests
npx playwright test
```

## Persistence Model

SQLite is the authoritative long-term state store. Campaign saves own:
- Campaign setup and seed
- Sector map / topology state
- POIs and progression
- World actors (bot positions, health, components)
- AI state (governor plans, faction state)
- Infrastructure state
- Faction state
- Current scene / camera / context

Runtime state lives in Koota ECS. The save model loads the campaign as one coherent machine-world.

## Testing Conventions

- Jest + ts-jest for unit and component tests
- `tsconfig.test.json` with CJS mode for Jest compatibility
- Playwright for E2E (18 tests across 6 phases)
- Tests MUST import expected values from JSON/config source of truth — never hardcode
- `jest.mock` for ECS queries (mock Koota queries as plain arrays)
- Variables prefixed with `mock` can be referenced in `jest.mock` factories
- Mock all R3F renderers in smoke tests to avoid ESM parse errors from `three/examples/jsm/*`
- Module-level Map state uses `_reset()` for test cleanup

## CI/CD

GitHub Actions pipeline runs:
- `tsc --noEmit` — type checking
- `npx jest` — full test suite
- `npx biome check` — formatting/linting
- Playwright E2E on push to main
