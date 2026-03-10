# Syntheteria: Core Game Loop — Atomic Implementation

Implement the core game loop for Syntheteria, a first-person 4X factory game on a machine planet. Each story is one testable unit of work with a vitest test file. The player grinds ore → compresses powder into cubes → grabs/carries cubes → stacks on grid → builds walls → assembles machines.

## Tech Stack
- React Three Fiber + Three.js + Koota ECS + Rapier 3D physics
- TypeScript + Vite + Vitest for testing
- JSON config files in `config/` loaded via `game/config/index.ts`
- ECS traits in `game/ecs/traits/` and `game/src/ecs/koota/`

## User Stories

### US-001: Rapier Raycast Utility Function
**Priority:** P1

**As a** developer building the selection system
**I want to** have a pure utility function for Rapier raycasting
**So that** I can reuse it for object selection, placement preview, and interaction checks

Create `game/src/input/raycastUtils.ts`. Function: `castSelectionRay(rapierWorld, cameraPosition, cameraDirection, maxDistance): { entityId, point, normal, distance } | null`. Uses Rapier `world.castRay()`. Returns nearest hit with entity ID lookup, or null on miss. Add `selectionRayMaxDistance: 50` to `config/rendering.json`.

**Acceptance Criteria:**
- [ ] Function `castSelectionRay` exists in `game/src/input/raycastUtils.ts`
- [ ] Returns `{ entityId, point, normal, distance }` on hit
- [ ] Returns `null` on miss or distance > maxDistance
- [ ] Reads maxDistance default from `config/rendering.json`
- [ ] Unit test passes: `npx vitest run game/src/input/__tests__/raycastUtils.test.ts`
- [ ] Test covers: hit returns correct data, miss returns null, exceeds maxDistance returns null

### US-002: Selection State Manager
**Priority:** P1

**As a** developer building the interaction system
**I want to** have a reactive store for current selection state
**So that** multiple systems (highlight, menu, HUD) can respond to selection changes

Create `game/src/input/selectionState.ts`. Pure TypeScript — no ECS. Exports: `setSelected(entityId | null)`, `getSelected(): entityId | null`, `onSelectionChange(callback): unsubscribe`. Setting new selection auto-clears previous. Null clears. Subscriber pattern.

**Acceptance Criteria:**
- [ ] `setSelected(id)` stores entity ID, `getSelected()` retrieves it
- [ ] `setSelected(newId)` replaces previous selection
- [ ] `setSelected(null)` clears selection
- [ ] `onSelectionChange` fires callback with `{ newId, oldId }` on every change
- [ ] Returns unsubscribe function that stops callbacks
- [ ] Unit test passes: `npx vitest run game/src/input/__tests__/selectionState.test.ts`

### US-003: Wire Raycast to Click Handler
**Priority:** P1
**Depends on:** US-001, US-002

**As a** player in first-person view
**I want to** click or tap to select objects via raycast
**So that** I can interact with entities in the world

Update `game/src/input/ObjectSelectionSystem.tsx` to use `castSelectionRay` (US-001) and `setSelected` (US-002). Left-click (desktop) or single-tap (mobile) casts ray, calls `setSelected` with hit entity ID. Miss calls `setSelected(null)`.

**Acceptance Criteria:**
- [ ] Left-click casts ray via `castSelectionRay` utility
- [ ] Hit entity ID passed to `setSelected()`
- [ ] Click on empty space calls `setSelected(null)`
- [ ] Mobile single-tap works same as click
- [ ] Integration test passes: `npx vitest run game/src/input/__tests__/ObjectSelectionSystem.test.tsx`
- [ ] Test mocks `useFrame`/`useThree`, simulates click, verifies `setSelected` called

### US-004: Action Registry (Trait-to-Action Mapping)
**Priority:** P1

**As a** developer building the contextual interaction system
**I want to** have a pure mapping from entity traits to available actions
**So that** the radial menu shows correct actions for any entity type

Create `game/src/systems/actionRegistry.ts`. Pure function: `getActionsForEntity(entityTraits: string[]): Action[]` where `Action = { id, label, icon, enabled }`. Maps: OreDeposit→harvest, MaterialCube+Grabbable→grab, MaterialCube+HeldBy→drop/throw, Hopper→insert, PlacedAt→build_wall.

**Acceptance Criteria:**
- [ ] `getActionsForEntity(['OreDeposit'])` returns action with id `'harvest'`
- [ ] `getActionsForEntity(['MaterialCube', 'Grabbable'])` returns `'grab'`
- [ ] `getActionsForEntity(['MaterialCube', 'HeldBy'])` returns `'drop'` and `'throw'`
- [ ] `getActionsForEntity(['Hopper'])` returns `'insert'`
- [ ] Returns empty array for unknown traits
- [ ] Each action has `id`, `label`, `icon`, `enabled` fields
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/actionRegistry.test.ts`

### US-005: Radial Action Menu Component
**Priority:** P2
**Depends on:** US-004

**As a** player who has selected an object
**I want to** see a radial menu of context-appropriate actions
**So that** I can interact with the selected entity

Create `game/src/ui/RadialActionMenu.tsx`. HTML overlay. Props: `actions`, `position`, `onAction`, `onDismiss`. Circular button layout. 44px minimum tap targets. Dismiss on click outside or ESC. Subscribe to selectionState.

**Acceptance Criteria:**
- [ ] Renders action buttons in circular layout around given screen position
- [ ] Each button has label text and calls `onAction(id)` on click
- [ ] Clicking outside the menu calls `onDismiss`
- [ ] ESC key calls `onDismiss`
- [ ] All buttons have minimum 44px touch target
- [ ] Component test passes: `npx vitest run game/src/ui/__tests__/RadialActionMenu.test.tsx`

### US-006: OreDeposit Entity Spawner
**Priority:** P2
**Depends on:** US-003

**As a** game world initializer
**I want to** spawn ore deposit entities at world positions
**So that** players have resources to harvest

Create `game/src/systems/oreSpawner.ts`. `spawnOreDeposit(world, position, oreType, quantity)` creates entity with OreDeposit data + Rapier static sphere collider (r=1.0). `spawnInitialDeposits(world, count)` places random deposits. Types from `config/mining.json`.

**Acceptance Criteria:**
- [ ] `spawnOreDeposit` creates entity with OreDeposit data (type, quantity)
- [ ] Entity has Rapier static body with sphere collider
- [ ] Ore type matches one in `config/mining.json` oreTypes
- [ ] `spawnInitialDeposits` places `count` deposits at valid positions
- [ ] Invalid ore type throws error
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/oreSpawner.test.ts`

### US-007: Harvesting System (Grinding Rates)
**Priority:** P2
**Depends on:** US-006

**As a** player near an ore deposit
**I want to** continuously grind it into powder
**So that** I accumulate material for compression into cubes

Create `game/src/systems/harvesting.ts`. `startHarvesting(playerId, depositId)`, `stopHarvesting(playerId)`, `updateHarvesting(delta)`. Transfers `grindSpeed * delta` from deposit to PowderStorage. Stops on depletion or out of range (3.0m). Rates from `config/mining.json`.

**Acceptance Criteria:**
- [ ] `startHarvesting` begins powder transfer from deposit to player storage
- [ ] Powder accumulates at `grindSpeed` rate per second (delta-based)
- [ ] Deposit quantity decreases by same amount
- [ ] Stops when deposit quantity reaches 0
- [ ] Stops when player moves beyond 3.0m range
- [ ] Cannot harvest two deposits simultaneously
- [ ] Rates from `config/mining.json`
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/harvesting.test.ts`

### US-008: Compression System (Powder to Cube)
**Priority:** P3
**Depends on:** US-007

**As a** player with accumulated powder
**I want to** compress it into a solid 0.5m material cube
**So that** I have a physical building block to work with

Create `game/src/systems/compression.ts`. `startCompression(playerId, oreType): boolean`, `updateCompression(delta): MaterialCube | null`, `getCompressionProgress(): number`. Requires `compressionRatio` (100) powder. Takes `compressionTime` seconds. Spawns MaterialCube: Dynamic RigidBody, 0.5m BoxCollider, Grabbable trait.

**Acceptance Criteria:**
- [ ] Returns false if insufficient powder
- [ ] Returns true and begins timer if enough powder
- [ ] Powder deducted from PowderStorage on start
- [ ] `updateCompression` advances timer by delta
- [ ] `getCompressionProgress` returns 0.0 to 1.0
- [ ] On completion returns MaterialCube with correct material type
- [ ] Cube has 0.5m dimensions and Grabbable trait
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/compression.test.ts`

### US-009: Grab Mechanic (Pick Up Cube)
**Priority:** P3
**Depends on:** US-008

**As a** player looking at a cube
**I want to** pick it up, carry it, and drop or throw it
**So that** I can move cubes to building locations

Create `game/src/systems/grabber.ts`. `grabCube(playerId, cubeId): boolean`, `dropCube(playerId)`, `throwCube(playerId, direction, force)`, `getHeldCube(playerId)`. Validates Grabbable + within 2.0m + not already holding. HeldBy relation. Kinematic while held, Dynamic on release.

**Acceptance Criteria:**
- [ ] `grabCube` returns false if cube not Grabbable
- [ ] Returns false if out of reach (>2.0m)
- [ ] Returns false if already holding a cube
- [ ] Creates HeldBy relation on success, body to Kinematic
- [ ] `dropCube` removes HeldBy, body to Dynamic
- [ ] `throwCube` removes HeldBy, body to Dynamic, applies impulse
- [ ] `getHeldCube` returns held cube ID or null
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/grabber.test.ts`

### US-010: Held Cube Camera Follow
**Priority:** P3
**Depends on:** US-009

**As a** player carrying a cube
**I want to** see it floating in front of my view
**So that** I know what I'm carrying and where I'll place it

Create `game/src/systems/heldCubeSync.ts`. `updateHeldCubePosition(playerId, cameraPosition, cameraForward)` sets held cube to `cameraPos + forward*1.5 + down*0.3`. `getCarrySpeedMultiplier(playerId)` returns 1.0 or 0.6 (from `config/botMovement.json`).

**Acceptance Criteria:**
- [ ] Held cube position set to camera forward offset (1.5m forward, 0.3m down)
- [ ] `getCarrySpeedMultiplier` returns 1.0 when not carrying
- [ ] Returns 0.6 when carrying (from `config/botMovement.json`)
- [ ] No position update when not holding a cube
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/heldCubeSync.test.ts`

### US-011: Grid Snap Math Utility
**Priority:** P1

**As a** developer building the cube placement system
**I want to** have pure math functions for 0.5m grid snapping
**So that** cubes align precisely when placed

Create `game/src/systems/gridSnap.ts`. `snapToGrid(position, gridSize): {gx,gy,gz}`, `gridToWorld(gx,gy,gz, gridSize): {x,y,z}`, `getAdjacentSlots(gx,gy,gz): Array`, `isSlotOccupied(gx,gy,gz, set): boolean`. All pure, no ECS.

**Acceptance Criteria:**
- [ ] `snapToGrid` correctly snaps positions to 0.5m grid indices
- [ ] `gridToWorld` round-trips correctly with `snapToGrid`
- [ ] `getAdjacentSlots` returns exactly 6 face-adjacent positions
- [ ] `isSlotOccupied` returns true/false correctly
- [ ] All functions are pure with no side effects
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/gridSnap.test.ts`

### US-012: Cube Placement with Structural Integrity
**Priority:** P2
**Depends on:** US-011

**As a** player placing cubes
**I want to** cubes to require structural support
**So that** building feels physical and strategic

Create `game/src/systems/cubePlacement.ts`. `canPlaceCube(gx,gy,gz, occupied): {valid, reason}`, `placeCube(world, cubeId, gx,gy,gz)`, `checkStructuralIntegrity(occupied): cubeId[]`. Ground (gy=0) always valid. Otherwise needs occupied slot below or beside. BFS from ground finds unsupported cubes.

**Acceptance Criteria:**
- [ ] `canPlaceCube` returns valid for ground level (gy=0)
- [ ] Returns valid if slot below is occupied (stacking)
- [ ] Returns invalid for floating with no support
- [ ] Returns invalid for already-occupied slot
- [ ] `placeCube` adds PlacedAt trait and sets body to Fixed
- [ ] `checkStructuralIntegrity` finds unsupported cubes via BFS
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/cubePlacement.test.ts`

### US-013: Place Cube from Hand onto Grid
**Priority:** P3
**Depends on:** US-009, US-012

**As a** player holding a cube
**I want to** place it on a surface with grid snapping
**So that** I can build structures precisely

Create `game/src/systems/cubeStacking.ts`. `getPlacementPreview(cameraPos, cameraDir, occupied): {gx,gy,gz,valid} | null` raycasts and snaps. `placeHeldCube(playerId, gx,gy,gz)` drops then places. Integrates grabber + placement.

**Acceptance Criteria:**
- [ ] `getPlacementPreview` returns grid coords near raycast hit
- [ ] Preview snaps to adjacent empty slot
- [ ] Returns `valid:false` if `canPlaceCube` fails
- [ ] Returns null if no surface in range
- [ ] `placeHeldCube` drops cube then places at grid position
- [ ] Returns false if not holding a cube
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/cubeStacking.test.ts`

### US-014: Furnace Entity and Hopper Input
**Priority:** P3
**Depends on:** US-005

**As a** player who wants to refine materials
**I want to** build a furnace and insert cubes into it
**So that** I can smelt raw cubes into refined ones

Create `game/src/systems/furnace.ts`. `createFurnace(world, position)` with Hopper (cap 5) + Processor + static body. `insertCubeIntoFurnace(furnaceId, cubeId)` validates, removes cube, queues in hopper. `getFurnaceState(furnaceId)`.

**Acceptance Criteria:**
- [ ] `createFurnace` spawns entity with Hopper and Processor traits
- [ ] Furnace has Rapier static body
- [ ] `insertCubeIntoFurnace` adds material to hopper queue
- [ ] Returns false if hopper full (5 max)
- [ ] Removes cube entity from world on insert
- [ ] `getFurnaceState` returns current state
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/furnace.test.ts`

### US-015: Furnace Smelting Timer and Output
**Priority:** P3
**Depends on:** US-014

**As a** player with a powered furnace
**I want to** see it process inserted cubes over time
**So that** I get refined output materials

Add `updateFurnace(furnaceId, delta, isPowered)` to furnace.ts. When powered + hopper has items: dequeue, timer from `config/furnace.json`. On completion: spawn output cube. Timer pauses when unpowered.

**Acceptance Criteria:**
- [ ] Timer advances when powered
- [ ] Timer does NOT advance when unpowered
- [ ] Completion creates output cube at furnace output position
- [ ] Output type from `config/furnace.json` recipe lookup
- [ ] Next hopper item auto-starts after output
- [ ] Smelt time matches config recipe
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/furnaceProcessing.test.ts`

### US-016: Wall Line Calculator (Bresenham)
**Priority:** P2
**Depends on:** US-011

**As a** player building walls
**I want to** specify start and end points for a wall line
**So that** the system calculates all needed grid slots

Create `game/src/systems/wallBuilder.ts`. `calculateWallLine(start, end, height): Array<{gx,gy,gz}>` Bresenham on XZ at each Y level. `getWallCost(slots)` returns cube count. `getWallMaterialRequirements(slots, type)`.

**Acceptance Criteria:**
- [ ] `calculateWallLine` from (0,0) to (5,0) height 3 returns 18 slots
- [ ] Handles diagonal lines correctly via Bresenham
- [ ] Height parameter controls wall Y levels
- [ ] `getWallCost` returns exact slot count
- [ ] Handles single-point wall (start equals end)
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/wallBuilder.test.ts`

### US-017: Wall Auto-Placement from Stockpile
**Priority:** P3
**Depends on:** US-016, US-012

**As a** player with a wall plan and stockpiled cubes
**I want to** auto-place cubes along the wall line
**So that** I can build walls efficiently

Add `buildWall(world, slots, materialType, stockpileIds): { placed, failed }` to wallBuilder.ts. Each slot: find matching cube, call placeCube. Wrong material skipped.

**Acceptance Criteria:**
- [ ] Places cubes at each slot from wall plan
- [ ] Cubes consumed from stockpileIds in order
- [ ] Returns correct placed/failed counts
- [ ] Wrong material cubes skipped
- [ ] Zero stockpile returns placed 0 and failed equals slot count
- [ ] Each placed cube gets PlacedAt trait
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/wallPlacement.test.ts`

### US-018: 3D Pattern Matcher for Blueprints
**Priority:** P2
**Depends on:** US-011

**As a** game system checking for machine recipes
**I want to** match placed cube arrangements against blueprint patterns
**So that** players can assemble machines from cubes

Create `game/src/systems/patternMatcher.ts`. Blueprint: `{ pattern: string[][][], result: string }`. `matchBlueprint(occupied, anchor, blueprints)` checks 4 Y-axis rotations. `getAllBlueprintMatches(occupied, blueprints)`. Load from `config/buildings.json`.

**Acceptance Criteria:**
- [ ] `matchBlueprint` returns matching blueprint when pattern found
- [ ] Returns null when no match
- [ ] Tries all 4 rotations (0, 90, 180, 270 degrees)
- [ ] Underscore matches empty slot
- [ ] Material types must match exactly
- [ ] Blueprints from `config/buildings.json`
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/patternMatcher.test.ts`

### US-019: Machine Assembly (Cubes to Machine)
**Priority:** P3
**Depends on:** US-018, US-012

**As a** player who has arranged cubes in a blueprint pattern
**I want to** assemble them into a functional machine
**So that** I can mine, smelt, and fabricate

Create `game/src/systems/machineAssembly.ts`. `assembleMachine(world, cubeIds, blueprint)` removes cubes, creates Building. `disassembleMachine(world, machineId)` restores cubes. Stats scale by material quality.

**Acceptance Criteria:**
- [ ] `assembleMachine` removes all constituent cube entities
- [ ] Creates Building entity at anchor position
- [ ] Machine type from `blueprint.result`
- [ ] Stats scale by material quality
- [ ] `disassembleMachine` restores cubes at original positions
- [ ] Round-trip preserves material types
- [ ] Unit test passes: `npx vitest run game/src/systems/__tests__/machineAssembly.test.ts`

### US-020: Integration Test — Full Core Loop
**Priority:** P4
**Depends on:** US-007, US-008, US-009, US-013, US-017, US-019

**As a** developer verifying the complete game loop
**I want to** run an end-to-end test of harvest to assemble
**So that** I know all systems integrate correctly

Create `game/src/__tests__/coreLoop.integration.test.ts`. Full chain with real functions (mock only Rapier): deposit → harvest → compress → grab → place → wall → pattern → assemble.

**Acceptance Criteria:**
- [ ] Spawns ore deposit, harvests until enough powder
- [ ] Compresses into cube, verifies MaterialCube entity
- [ ] Grabs cube, verifies held state
- [ ] Places on grid, verifies PlacedAt trait
- [ ] Builds wall from multiple cubes
- [ ] Matches blueprint pattern, assembles machine
- [ ] All assertions pass with real system functions
- [ ] Integration test passes: `npx vitest run game/src/__tests__/coreLoop.integration.test.ts`
