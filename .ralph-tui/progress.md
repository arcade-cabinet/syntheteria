# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Rapier WASM Mocking for Vitest
Rapier (`@dimforge/rapier3d-compat`) uses WASM and cannot be imported in Node.js tests. Mock it with `vi.mock('@dimforge/rapier3d-compat', () => ({ default: { Ray: MockRay }, Ray: MockRay }))`. Create mock colliders with `{ handle: number, castRayAndGetNormal: vi.fn() }` and mock worlds with `{ castRay: vi.fn().mockReturnValue(hit) }`.

### JSON Config Imports Don't Work in Vitest
The `import ... from '../../config/foo.json' with { type: "json" }` syntax fails in vitest without additional configuration. For pure utilities, use exported constants matching config values instead. Callers at runtime can pass config values as parameters.

### Module-Level State Pattern
The codebase uses module-level state (Maps, plain objects) as lightweight stores rather than React state or ECS. See `ObjectSelectionSystem.tsx` `selectionState`, territory module stores. Follow this pattern for new registries.

### Test Style
- Vitest with `describe/it/expect/beforeEach`
- Helper factory functions for test data (e.g., `makeMockCollider`, `makeTerritories`)
- Tests in `__tests__/` subdirectory of the module
- `npx vitest run <path>` to run specific test files

### Testing R3F Components Without RTL
To test React Three Fiber components without `@testing-library/react`, extract the core logic into exported pure functions that take dependencies as parameters. Mock all transitive imports of the module (three, R3F hooks, ECS world, physics) with `vi.mock()`, then test the extracted function directly. The R3F component becomes a thin wiring layer. See `ObjectSelectionSystem.test.tsx` for the full pattern.

---

## 2026-03-09 - US-001
- Implemented `castSelectionRay` utility function in `game/src/input/raycastUtils.ts`
- Created collider→entityId registry (register/unregister/clear/get)
- Added `selectionRayMaxDistance: 50` to `config/rendering.json`
- Files changed:
  - `config/rendering.json` — added `selectionRayMaxDistance`
  - `game/src/input/raycastUtils.ts` — new file, core utility
  - `game/src/input/__tests__/raycastUtils.test.ts` — 11 tests (4 registry + 7 raycast)
- **Learnings:**
  - Rapier WASM mocking pattern established (see Codebase Patterns above)
  - JSON import assertions (`with { type: "json" }`) break vitest — use constants instead
  - Pre-existing TS errors in `BotBrainSystem.tsx` — not related to this work
  - Biome enforces single-line for short function calls (3 args)
  - vitest 4.0.18 is available via npx but not in package.json devDependencies
---

## 2026-03-09 - US-003
- Wired click/tap handlers to use `castSelectionRay` (US-001) and `setSelected` (US-002)
- Extracted `handleSelectionClick` as an exported pure function for testability
- Changed click from right-click (button 2) to left-click (button 0) per PRD
- Removed pointer lock requirement — clicks work regardless of lock state
- Both desktop click and mobile tap call the same `doSelect` → `handleSelectionClick` path
- Files changed:
  - `game/src/input/ObjectSelectionSystem.tsx` — added imports, exported `handleSelectionClick`, rewired event handlers
  - `game/src/input/__tests__/ObjectSelectionSystem.test.tsx` — new file, 6 tests
- **Learnings:**
  - Testing R3F components: extract pure logic into exported functions, mock all transitive deps (see Codebase Patterns)
  - `vi.mock` paths are relative to the test file, not the module under test — `../../ecs/world` not `../ecs/world`
  - No `@testing-library/react` or `jsdom` installed — pure function testing avoids needing DOM rendering
  - Pre-existing failures: Playwright E2E tests error in vitest, territory.test.ts has JSON import issue — not related
  - `useEffect` deps: added `camera` alongside `gl` since click handler now uses camera to get position/direction
---

## 2026-03-09 - US-002
- Implemented selection state manager in `game/src/input/selectionState.ts`
- Pub/sub pattern: `setSelected`, `getSelected`, `onSelectionChange` with unsubscribe
- Files changed:
  - `game/src/input/selectionState.ts` — new file, reactive selection store
  - `game/src/input/__tests__/selectionState.test.ts` — 12 tests (get/set, subscribers, unsubscribe, edge cases)
- **Learnings:**
  - Pure TS modules with `Set<callback>` for listeners are the cleanest pub/sub — no framework dependency
  - Exported `_resetSelectionState()` (underscore-prefixed) as test-only reset avoids polluting the public API
  - TypeScript type check passes cleanly from `game/` directory (`npx tsc --noEmit`)
---

