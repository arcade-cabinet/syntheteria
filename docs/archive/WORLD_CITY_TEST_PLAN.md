# World / City Test Plan

## Unit Coverage

- city catalog integrity
- family / subcategory / placement filtering
- composite references only point at real model ids
- city layout scenario determinism
- city layout validation failures for bad plans
- ecumenopolis sector/district state persistence
- substation capability resolution
- floor material preset determinism

## Component Coverage

- title and new-game flow
- structural-world lab full catalog screenshot
- briefing bubble / anchored site brief surfaces
- radial-driven substation and district interaction surfaces
- new game / loading / continue campaign surfaces

## Visual Coverage

- structural-world lab catalog screenshot
- starting sector screenshot
- starting bot radial screenshots
- substation screenshot
- cult-threat screenshot
- rival faction structure cluster screenshot
- district scenario/composite screenshot surfaces as they are added

## E2E Coverage

- new game -> ecumenopolis generation -> command arcology spawn
- establish first substation
- inspect a denser district
- continue from active campaign state

## Validation Gate

- `pnpm exec tsc --noEmit --pretty false`
- targeted Jest suites for `src/city`, `src/world`, and AI/runtime persistence
- Playwright CT for structural-world lab, briefing bubbles, radial surfaces, and branded campaign panels
- Playwright E2E for new game, first actions, first substation, and continue paths
