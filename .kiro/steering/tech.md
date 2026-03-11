# Syntheteria — Tech Stack & Build

## Stack

| Layer | Technology |
|-------|-----------|
| 3D Engine | React Three Fiber + Three.js |
| ECS | Koota (migrating from Miniplex) |
| Physics | Rapier 3D (`@dimforge/rapier3d-compat`) |
| AI | Yuka (GOAP, steering, NavMesh) |
| Audio | Tone.js |
| Animation | anime.js |
| Mobile Input | nipplejs |
| Persistence | expo-sqlite + Drizzle ORM (native), IndexedDB (web) |
| Framework | Expo SDK 55 + Metro bundler |
| Router | expo-router (file-based, `app/` directory) |
| Language | TypeScript 5.9 (strict mode) |
| Linter | Biome 2.4 |
| Test (unit) | Jest 30 + ts-jest |
| Test (e2e) | Playwright |

## Commands

```bash
npm run dev          # Start Expo web dev server
npm run build        # Expo export for web
npm run lint         # Biome check ./src
npm run lint:fix     # Biome check --write ./src
npm run format       # Biome format --write ./src
npm test             # Jest (unit tests)
npm run test:e2e     # Playwright (e2e tests)
npx tsc --noEmit     # Type check (no emit)
```

## Code Conventions

- Biome enforces: tabs for indentation, double quotes for strings
- `noExplicitAny: error` — no `any` types allowed
- `useConst: error` — prefer `const` over `let`
- `noCommonJs: error` — ESM only, no `require()`
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- React hooks rules enforced: `useExhaustiveDependencies`, `useHookAtTopLevel`

## System Authoring Conventions

- Systems are plain functions, not classes: `export function updateSystem(delta: number): void`
- Module-scope mutable state, never in closures
- Every stateful system exports a `resetSystem(): void` function
- All tunables come from `config/*.json`, never hardcoded magic numbers
- Cross-system communication via event bus (`src/systems/eventBus.ts`)
- No per-frame heap allocations — reuse module-scope temp objects
- All MeshStandardMaterial, never meshLambertMaterial
- New system → new `__tests__/*.test.ts` file

## Config System

All game balance lives in `config/*.json` (40+ files). Type-safe imports via `config/index.ts`. Config tests in `config/__tests__/` validate schemas and cross-references between configs.
