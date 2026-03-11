# Contributing to Syntheteria

First-person 4X factory game on a machine planet, built with React Three Fiber + Koota ECS + Yuka AI.

---

## Prerequisites

- **Node.js 20+** (22 also supported)
- **npm 10+**
- **Git** with LFS support

Optional for native builds:
- **Expo CLI** — `npm install -g expo-cli`
- **iOS**: Xcode + CocoaPods
- **Android**: Android Studio + JDK 17

---

## Setup

```bash
git clone <repo-url>
cd syntheteria

# Install Git LFS and pull binary assets (GLBs, textures)
git lfs install
git lfs pull

# Install dependencies
npm install
```

---

## Running the Game

### Web (primary development target)

```bash
npm run dev
```

Opens the game in your browser at `http://localhost:8081`.

### Native (iOS/Android)

```bash
# Start Expo development server
npm start

# Open in iOS Simulator
npm run ios

# Open on Android device/emulator
npm run android
```

---

## Testing

```bash
# Run all Jest unit + config tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (Playwright, requires dev server running)
npm run test:e2e

# Open interactive E2E test UI
npm run test:e2e:ui
```

### Test Coverage

Jest covers:
- `src/*/__tests__/` — system unit tests (158 files, ~6500 tests)
- `config/__tests__/` — JSON schema validation (one file per config)

Config tests validate structure, value ranges, cross-references, and that no placeholder values (TODO, TBD, FIXME) exist.

---

## Code Quality

```bash
# Lint source files (Biome)
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format source files
npm run format

# Type-check without emitting
npx tsc --noEmit
```

All three must pass before merging. CI enforces them automatically.

---

## Project Structure

```
syntheteria/
├── config/          # JSON game balance (see docs/CONFIG.md)
├── src/
│   ├── ai/          # GOAP governors, BotBrain FSM, Yuka steering
│   ├── audio/       # Tone.js spatial audio
│   ├── ecs/         # Miniplex ECS world, types, tick loop
│   │   └── koota/   # Koota migration (in progress)
│   ├── input/       # FPS camera, object selection, raycasting
│   ├── rendering/   # Three.js renderers, PBR materials, procgen
│   ├── systems/     # 140 ECS systems (game logic)
│   └── ui/          # React HUD components
├── docs/
│   ├── ARCHITECTURE.md    # System overview
│   ├── CONFIG.md          # Config schema reference
│   ├── CONTRIBUTING.md    # This file
│   └── design/            # GDD design documents
└── tests/e2e/       # Playwright E2E tests
```

Full architecture: [docs/ARCHITECTURE.md](./ARCHITECTURE.md).
Config reference: [docs/CONFIG.md](./CONFIG.md).

---

## Coding Conventions

### TypeScript

- Biome handles formatting — tabs, double quotes, sorted imports
- No `any` except where unavoidable and explicitly suppressed
- Prefer `unknown` over `any` for external data boundaries
- Keep functions pure where possible for testability
- No non-null assertions (`!`) — use explicit null checks

### ECS Systems

- Systems are pure functions that iterate over Miniplex archetype queries
- No direct React state mutation from systems
- Systems read config via `import { config } from '../../config'`
- Never hardcode numeric tunables — every balance value belongs in a config file
- Module-level `Map` state is acceptable for lightweight stores; always provide `_reset()` for test cleanup

```ts
// Good
import { config } from '../../config';
const speed = config.belts.tiers.fast.speed;

// Bad
const speed = 4.0; // hardcoded
```

### React Components

- Scene components (in the R3F Canvas) must read ECS state in `useFrame`, never write to React state for per-frame positions
- DOM components (HUD) subscribe to ECS via `useSyncExternalStore`
- `GameScene.tsx` is `React.lazy()`-loaded — keep imports inside it

### Config Files

- All JSON files use tabs for indentation (Biome enforces this)
- Add a corresponding test file in `config/__tests__/` for every new JSON file
- Tests must cover: required fields, value ranges, cross-references
- See `config/__tests__/mining.test.ts` as a canonical example

---

## How to Add...

### A New Ore Type

1. Add to `config/mining.json` under `oreTypes`
2. Add to `config/economy.json` under `materials`, `deposits`, `tradeMultipliers`, `stockpileDepreciation.materialRates`, and `biomeYieldModifiers`
3. Add to `config/biomes.json` under each relevant biome's `resourceMultipliers`
4. Update `config/__tests__/mining.test.ts` — add to `ALL_ORE_TYPES` constant
5. Update cross-reference tests in `config/__tests__/biomes.test.ts`
6. If the ore has unique visuals, add PBR config to `config/cubeMaterials.json`

### A New Building

1. Add to `config/buildings.json`
2. Add cost entry to `config/economy.json` under `buildingCosts`
3. Add a furnace recipe in `config/furnace.json` under the appropriate tier
4. If research-gated, add tech unlock in `config/technology.json`
5. Update `config/__tests__/buildings.test.ts`
6. Implement the system logic in `src/systems/`
7. Add a test file in `src/systems/__tests__/`
8. Wire rendering in `src/rendering/` if visual output needed

### A New Bot/Unit Type

1. Add to `config/units.json`
2. Add a furnace recipe in `config/furnace.json`
3. Add BotBrain behavior variant if needed in `src/ai/BotBrain.ts`
4. Add faction-distinct visual in `src/rendering/procgen/BotGenerator.ts`
5. Update `config/__tests__/units.test.ts`

### A New Quest

1. Add a quest entry to `config/quests.json` under `questLines`
2. Define `steps` with objective text, completion condition, and dialogue lines
3. Ensure biome IDs in conditions reference valid biomes from `biomes.json`
4. Update `config/__tests__/quests.test.ts`

### A New Tech Node

1. Add to `config/technology.json` under the appropriate faction branch (or `universal`)
2. Set `prerequisites` to existing tech node IDs (empty array if none)
3. Set `unlocks` to recipe/building IDs that already exist
4. Update `config/__tests__/technology.test.ts`

### A New ECS System

1. Create `src/systems/mySystem.ts`
2. Import config via `import { config } from '../../config'`
3. Create `src/systems/__tests__/mySystem.test.ts`
4. Wire into the simulation tick in `src/ecs/gameState.ts`
5. Add to the system inventory in `docs/technical/ARCHITECTURE.md`

Template for a system test:

```ts
import { mySystem } from '../mySystem';

// Mock Miniplex world queries
jest.mock('../../ecs/world', () => ({
  mockEntities: [],
  withMockEntities: [],
}));

describe('mySystem', () => {
  it('does the thing', () => {
    const result = mySystem({ /* mock state */ });
    expect(result).toBe(/* expected */);
  });
});
```

---

## PR Workflow

1. Branch from `main` (or the current feature branch)
2. Keep PRs focused — one logical change per PR
3. Run `npm test` and `npm run lint` before pushing
4. CI must be green before merging (lint + type-check + tests + build)
5. Config changes require updated tests in `config/__tests__/`
6. System changes require tests in `src/systems/__tests__/`

### PR Description Template

```
## What

Brief description of the change.

## Why

Why this change is needed.

## Config Changes

List any config fields added, changed, or removed.

## Test Coverage

- [ ] Config schema tests updated
- [ ] System unit tests added/updated
- [ ] All existing tests still pass
```

---

## Troubleshooting

### "Cannot find module './biomes.json'"

Check that `config/biomes.json` exists and is valid JSON. Run `node -e "JSON.parse(require('fs').readFileSync('config/biomes.json', 'utf8'))"` to validate.

### Jest can't import `.tsx` files

Ensure `tsconfig.test.json` has `allowImportingTsExtensions: true` and that `jest.config.js` points to it:

```js
transform: {
  "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
}
```

### Biome reports "import not organized"

Run `npm run lint:fix` to auto-sort imports. Biome enforces import ordering.

### TypeScript errors in test files

Test files use `tsconfig.test.json` (CJS mode, relaxed settings). If you get TS errors only in test files, check that the import resolves correctly under CJS module resolution.

### Git LFS assets not downloaded

```bash
git lfs install
git lfs pull
```

If on a fresh checkout, ensure the remote LFS server is reachable.

### Rapier WASM fails to initialize

Rapier requires `SharedArrayBuffer`. In web dev mode, the Vite server sets the required headers automatically. If you're testing manually, ensure your server sends:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

---

## Design Documents

All architectural decisions are documented in `docs/design/`:

| Doc | Topic |
|-----|-------|
| [GDD-002](./design/002-koota-expo-migration.md) | Koota ECS + Expo migration |
| [GDD-003](./design/003-4x-interaction-governors.md) | 4X framework, governors, race system |
| [GDD-004](./design/004-core-loop-cubes-harvesting.md) | Core game loop |
| [GDD-005](./design/005-visual-identity-procgen-yuka-vehicles.md) | Visual identity, procgen |
| [GDD-006](./design/006-cube-building-economy.md) | Cube economy |

GDDs are the source of truth for design decisions. If you disagree with a GDD, raise it in a PR or issue before implementing differently.
