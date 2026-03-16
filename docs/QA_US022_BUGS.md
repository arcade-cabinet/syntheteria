# QA US-022: Core Gameplay Loop Verification

Date: 2026-03-13
Branch: `codex/ecumenopolis-fullscope`
Agent: qa-gameplay-verify

## Summary

The core gameplay loop is **structurally wired end-to-end**. All major systems
are connected and the code paths are complete from title screen through
gameplay and persistence. TypeScript compiles clean, all 19 test suites
(45 tests) pass, and the simulation tick correctly chains all systems.

## Verification Results

### 1. Game Launch: Title -> Playing (PASS)

- `App.tsx` implements a two-phase state machine: `!inGame` (TitleScreen) vs
  `inGame` (Canvas + GameUI).
- TitleScreen correctly dispatches `onNewGame` and `onContinueGame` callbacks.
- `handleNewGame` creates a SaveGame record, generates world data, persists it,
  hydrates ECS state, and transitions to the game canvas via `setInGame(true)`.
- `handleContinueGame` loads the latest save game and follows the same
  hydration path.
- NOTE: The task spec mentions "title -> pregame -> playing" but this branch
  uses a simpler "title -> playing" flow. The NewGameModal serves as the
  pregame configuration step (inline within TitleScreen).

### 2. World Rendering (PASS)

- `TerrainRenderer` reads fragments from `GameSnapshot` via
  `useSyncExternalStore` and renders hex tiles with terrain atlas materials.
- `UnitRenderer` renders all units and buildings from ECS queries, plus a
  `GhostBuilding` component for placement preview.
- `CityRenderer` and `CityInteriorRenderer` handle world vs. city scene
  modes via `runtimeState.activeScene`.
- NOTE: `StructuralFloorRenderer` does not exist in this branch. The task
  spec reference to it appears to be from a different branch context.

### 3. Unit Selection (PASS)

- `UnitInput.tsx` handles desktop (left-click select, right-click move) and
  mobile (single-tap select/move, multi-touch camera pan).
- `findEntityAtPoint` searches both `units` and `buildings` queries.
- Selection state lives on the `Unit.selected` and `Building.selected` traits.
- `SelectedInfo.tsx` panel shows hardware, AI status, repair orders, and
  fabrication queue for the selected entity.

### 4. Unit Selection -> Radial Menu (N/A for this branch)

- This branch does NOT have `radialMenu.ts` or `RadialMenu.tsx`. The task
  spec references these files but they belong to a later branch/sprint.
- Instead, interaction uses direct tap/click with the `SelectedInfo` panel
  for contextual actions (repair, fabricate).

### 5. Movement (PASS)

- `movementSystem(delta, gameSpeed)` in `src/systems/movement.ts` advances
  units along hex-grid paths using `Navigation` trait.
- `issueMoveCommand` from the AI module converts display-space clicks to
  world-space coordinates and sets the navigation path.
- Units skip AI-controlled entities (those with `AIController.enabled`).
- Movement correctly deducts step distance from path waypoints.

### 6. Harvest / Resource Gathering (PASS)

- `resourceSystem()` in `src/systems/resources.ts` auto-scavenges nearby
  resource points for units with functional arms.
- Scavenge points are procedurally generated based on world seed.
- Three resource types: scrapMetal, eWaste, intactComponents.
- NOTE: No explicit "harvest AP" deduction or turn-based AP system exists.
  This is a real-time system, not turn-based. Resources are gathered
  automatically when units are within `SCAVENGE_RANGE` (2.5 units).

### 7. Build (PASS)

- `buildingPlacement.ts` implements a state machine: select type -> ghost
  preview -> validate position -> spend resources -> spawn entity.
- `BuildToolbar.tsx` shows placeable buildings with affordability checks.
- Two buildable types: `lightning_rod` and `fabrication_unit`.
- Placement validates: walkable terrain, not inside buildings, rod spacing.
- NOTE: No "AP cost" for building. Resource cost only.

### 8. End Turn / Simulation Tick (PASS with caveat)

- The game uses a **real-time simulation** at 60 ticks/second, not a
  turn-based system.
- `simulationTick()` in `gameState.ts` chains 14 systems in order:
  enemy -> AI -> movement -> exploration -> fragmentMerge -> power ->
  signalNetwork -> resource -> repair -> fabrication -> combat -> hacking ->
  narrative -> POI -> persistence -> displayOffsets.
- Pause/resume and speed controls (0.5x, 1x, 2x) work through the
  `paused` and `gameSpeed` state variables.
- NOTE: The task spec mentions "turnSystem" and "turnPhaseHandlers" but
  these do not exist in this branch. The branch uses real-time, not
  turn-based.

### 9. Save/Load (PASS)

- `saveGames.ts` handles CRUD for save game records in SQLite.
- `worldPersistence.ts` handles full world state persistence including
  tiles, POIs, city instances, campaign state, resources, and entities.
- `persistenceSystem.ts` auto-saves every 60 ticks to SQLite.
- `entityPersistence.ts` handles capture and hydration of ECS entities.
- `bootstrap.ts` manages schema creation and migrations.
- Continue game loads the latest save, hydrates the world, and resumes.

## Bugs Found

### BUG-1: Lambert Materials in UnitRenderer (LOW severity)

**Location:** `src/rendering/UnitRenderer.tsx` lines 115-154
`src/rendering/CityInteriorRenderer.tsx` lines 77, 106, 123

The project memory states "Zero Lambert materials - verified clean PBR"
but `UnitRenderer.tsx` uses `<meshLambertMaterial>` in 8 places for
building meshes (fabrication units, lightning rods). The
`CityInteriorRenderer` also uses `<meshLambertMaterial>` in 3 places.
These should be `<meshStandardMaterial>` for PBR consistency.

**Impact:** Visual inconsistency, not a functional bug. Does not block
the gameplay loop.

### BUG-2: Misplaced JSDoc Comment in fabrication.ts Import (LOW severity)

**Location:** `src/systems/fabrication.ts` lines 5-18

A module-level JSDoc comment block is embedded inside an import
statement's destructuring braces. While TypeScript accepts this, it is
clearly a merge artifact. The comment should be outside the import.

```typescript
import {
    /**
     * Fabrication system.
     * ...
     */
    addResource,
    getResources,
    ...
} from "./resources";
```

**Impact:** Code readability only. TypeScript compiles fine.

### BUG-3: Verbose Entity Logging in buildSnapshot (LOW severity)

**Location:** `src/ecs/gameState.ts` lines 82-94

The `buildSnapshot()` function logs all entity details every 60 ticks.
This runs continuously during gameplay and will spam the console with
entity trait information. Should be guarded by a debug flag or removed.

**Impact:** Performance (console I/O) and debug noise.

### BUG-4: Biome Formatting Drift (16 errors) (LOW severity)

Files with formatting issues: babel.config.js, playwright/index.tsx,
narrative.json, units.json, uiBrandAssets.ts, CityRenderer.tsx,
navmesh.ts, pathfinding.ts, NewGameModal.tsx, tailwind.config.js,
HudButton.spec.tsx, onboarding.spec.ts.

Mostly spaces-vs-tabs and single-vs-double quote inconsistencies.
Can be fixed with `npx biome check --write .`

**Impact:** Style consistency only.

## Systems Not Present in This Branch

The task spec references several systems that belong to later branches:

| Referenced System | Status | Notes |
|---|---|---|
| `radialMenu.ts` / `RadialMenu.tsx` | NOT IN BRANCH | Contextual actions via SelectedInfo panel instead |
| `turnSystem.ts` / `turnPhaseHandlers` | NOT IN BRANCH | Real-time sim, not turn-based |
| `harvestSystem.ts` (AP-based) | NOT IN BRANCH | Auto-scavenge in `resources.ts` instead |
| `StructuralFloorRenderer.tsx` | NOT IN BRANCH | `TerrainRenderer.tsx` serves this role |
| `unitSelection.ts` | NOT IN BRANCH | Selection handled by `UnitInput.tsx` |
| `victoryConditions.ts` | NOT IN BRANCH | No victory system yet |
| `weather.ts` | NOT IN BRANCH | Storm intensity in `power.ts` |
| `techTree.ts` | NOT IN BRANCH | No tech tree yet |
| `diplomacy.ts` | NOT IN BRANCH | No diplomacy yet |
| `tutorialSystem.ts` | NOT IN BRANCH | Narrative triggers in `narrative.ts` |

## Quality Gate Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx biome check .` | 16 formatting errors (no logic errors) |
| `npx jest --passWithNoTests` | 19 suites, 45 tests, ALL PASS |

## Conclusion

The core gameplay loop on this branch is wired and functional for its
intended scope: real-time exploration, resource gathering, building
placement, fabrication, combat, and save/load persistence. The branch
predates the turn-based radial menu redesign referenced in the task
spec; those systems exist on later branches.

No critical bugs were found that would block gameplay.
