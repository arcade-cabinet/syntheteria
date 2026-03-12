# World / City Test Plan

## Unit Coverage

- city catalog integrity
- family / subcategory / placement filtering
- composite references only point at real model ids
- city layout scenario determinism
- city layout validation failures for bad plans
- world/city transition state persistence

## Component Coverage

- title and new-game flow
- City Kit Lab full catalog screenshot
- location panel / city interaction panel
- future survey / found / enter-city branded modal surfaces

## Visual Coverage

- terrain permutations
- City Kit Lab catalog screenshot
- city scenario/composite screenshot surfaces as they are added

## E2E Coverage

- new game -> world generation -> POI approach
- POI interaction -> city entry -> return to world
- continue from world scene
- continue from city scene

## Validation Gate

- `pnpm exec tsc --noEmit --pretty false`
- targeted Jest suites for `src/city` and world/city runtime state
- Playwright CT for City Kit Lab and branded world/city panels
- later Playwright E2E for world/city transition paths
