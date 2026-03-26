[PRD]
# PRD: Syntheteria RTS Course Correction — Full Implementation

## Overview

Restore the original RTS vision for Syntheteria: one emergent AI waking in industrial ruins, repairing robots, exploring a procedural labyrinth city, fortifying positions, and pushing north to defeat the Cult of EL. Port the best infrastructure from the feature branch (Koota ECS, labyrinth generator, audio, persistence, GLB models) while dropping all 4X scope creep (no 4 factions, no 5 epochs, no sphere world).

This PRD covers all 6 implementation phases (0-5) with 45 user stories designed for maximum parallel execution via ralph-tui. Stories within the same phase that share no data dependencies are annotated as parallel and can run concurrently.

**Source plans:** `docs/superpowers/plans/2026-03-23-master-plan.md` + phase files 0-5

## Goals

- Port 27-file Miniplex game to Koota ECS with zero TypeScript/Biome errors
- Render a procedural labyrinth city with instanced GLB models (9 robots + 25 buildings)
- Implement component-based combat (damage disables parts, not HP bars)
- Build fragment-merge fog-of-war, cult enemy AI via Yuka GOAP, navmesh A* pathfinding
- Complete resource loop: scavenge → fabricate → power → repair → upgrade (Mark I/II/III)
- Ship landing page with globe background, Tone.js audio, SQLite save/load
- Add narrative structure (intro, 3 game phases), human temperature system, PBR materials
- Achieve E2E test coverage, production error handling, and Capacitor mobile builds
- Include Vitest browser mode component tests for all R3F/canvas and DOM overlay components

## Quality Gates

These commands must pass for every user story:
- `pnpm tsc` — TypeScript type checking (zero errors)
- `pnpm lint` — Biome linting (zero errors)

For stories with unit tests:
- `pnpm vitest run` — All Vitest tests pass

For stories with browser component tests:
- `pnpm vitest --config vitest.browser.config.ts run` — Browser mode tests pass

For E2E stories:
- `pnpm playwright test` — Playwright E2E tests pass

## Parallelism Guide

Stories are organized by phase. Within each phase, stories marked **[PARALLEL]** share no data dependencies and can execute concurrently. Stories with **Depends on: US-XXX** must wait for the named story to complete.

---

## Phase 0: Foundation — Koota Port + Asset Integration

### US-001: Fix All Biome Lint Errors
As a developer, I want all Biome lint errors resolved so that the codebase is clean for the Koota port.

**Priority:** P1

**Acceptance Criteria:**
- [ ] Run `pnpm biome check --write --unsafe src/` for auto-fixes
- [ ] Manually fix remaining errors (unused vars prefixed with `_`, explicit return types, remove `any`)
- [ ] `pnpm lint` reports zero errors
- [ ] Commit with message: `fix: resolve all Biome lint errors in original game code`

---

### US-002: Replace Miniplex with Koota ECS + Define Traits and World
As a developer, I want the ECS foundation swapped from Miniplex to Koota so that all subsequent porting uses the new architecture.

**Priority:** P1
**Depends on:** US-001

**Acceptance Criteria:**
- [ ] `pnpm add koota && pnpm remove miniplex` — Koota in deps, Miniplex removed
- [ ] Create `src/ecs/traits.ts` with 8 Koota traits: Position, Faction, Fragment, UnitComponents, Unit, Navigation, BuildingTrait, LightningRod
- [ ] Rewrite `src/ecs/world.ts` to use `createWorld()` from Koota
- [ ] Update `src/ecs/types.ts` — keep Vec3, UnitComponent, component helpers; remove Entity/UnitEntity/BuildingEntity interfaces
- [ ] Rewrite `src/ecs/factory.ts` — spawnUnit, spawnFabricationUnit, spawnLightningRod use `world.spawn(Trait1({}), ...)`
- [ ] `pnpm tsc` may have consumer errors (expected at this stage, fixed in US-005/006/007)

---

### US-003: Copy GLB Assets and Audio from Feature Branch **[PARALLEL]**
As a developer, I want all 3D model and audio assets available in the project so that rendering and audio work can proceed.

**Priority:** P1

**Acceptance Criteria:**
- [ ] Extract 6 player robot GLBs via `git show cursor/cloud-agent-runbook-review-0483:public/assets/models/robots/factions/*.glb`
- [ ] Extract 3 cult mech GLBs via `git show cursor/cloud-agent-runbook-review-0483:public/assets/models/robots/cult/*.glb`
- [ ] Extract 25 building GLBs via `git show cursor/cloud-agent-runbook-review-0483:public/assets/models/buildings/*.glb`
- [ ] Extract 5 audio system files via `git show cursor/cloud-agent-runbook-review-0483:src/audio/*.ts`
- [ ] Verify counts: 6 faction GLBs, 3 cult GLBs, 25 building GLBs, 5 audio files
- [ ] Commit with message: `feat: bring in GLB models (9 robots, 25 buildings) + audio from feature branch`

---

### US-004: Set Up Vitest Browser Mode for Component Testing **[PARALLEL]**
As a developer, I want Vitest browser mode configured so that R3F canvas rendering and DOM overlay components can be tested in a real browser environment.

**Priority:** P2

**Acceptance Criteria:**
- [ ] Install vitest browser dependencies: `pnpm add -D @vitest/browser playwright`
- [ ] Create `vitest.config.ts` for JSDOM unit tests (pattern: `src/**/*.vitest.ts`)
- [ ] Create `vitest.browser.config.ts` for browser mode tests with Playwright provider (pattern: `tests/components/**/*.browser.test.tsx`)
- [ ] Add npm scripts: `"test": "vitest run"`, `"test:browser": "vitest --config vitest.browser.config.ts run"`, `"test:watch": "vitest"`
- [ ] Create `tests/components/smoke.browser.test.tsx` — minimal test that mounts an R3F Canvas and asserts it renders
- [ ] Browser smoke test passes: `pnpm test:browser`
- [ ] Commit with message: `chore: set up Vitest browser mode with Playwright provider for component testing`

---

### US-005: Port All 12 Game Systems to Koota Queries
As a developer, I want all game systems using Koota world queries so that the ECS migration is complete for logic code.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] Port `src/systems/movement.ts` — `world.query(Position, Navigation, Unit)`
- [ ] Port `src/systems/combat.ts` — `world.query(Position, Unit, UnitComponents, Faction)`
- [ ] Port `src/systems/enemies.ts` — faction filter via Koota queries
- [ ] Port `src/systems/exploration.ts` — fog reveal with Fragment trait
- [ ] Port `src/systems/fragmentMerge.ts` — fragment connectivity
- [ ] Port `src/systems/resources.ts` — scavenging logic
- [ ] Port `src/systems/fabrication.ts` — component manufacturing
- [ ] Port `src/systems/power.ts` — lightning rod power grid
- [ ] Port `src/systems/repair.ts` — unit repair
- [ ] Port `src/systems/buildingPlacement.ts` — ghost preview
- [ ] Port `src/systems/navmesh.ts` — nav mesh from terrain
- [ ] Port `src/systems/pathfinding.ts` — A* on navmesh
- [ ] All 12 systems use `entity.get(Trait)` / `entity.set(Trait, {...})` pattern
- [ ] `pnpm tsc` shows reduced error count (consumer errors in renderers/UI still expected)

---

### US-006: Port Terrain, City Layout, and Game Loop to Koota **[PARALLEL]**
As a developer, I want terrain generation, city layout, and the game loop using Koota so that world initialization works with the new ECS.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] Port `src/ecs/terrain.ts` — replace `world.add()` with `world.spawn()`, update entity type references
- [ ] Port `src/ecs/cityLayout.ts` — same pattern (will be replaced by labyrinth in Phase 1, but must compile now)
- [ ] Port `src/ecs/gameState.ts` — tick loop calls systems with Koota world, `useSyncExternalStore` bridge preserved, speed multiplier + pause retained

---

### US-007: Port Renderers, Input Handlers, UI, and App.tsx to Koota
As a developer, I want all rendering, input, and UI components using Koota so that the full application compiles.

**Priority:** P1
**Depends on:** US-005, US-006

**Acceptance Criteria:**
- [ ] Port `src/rendering/TerrainRenderer.tsx` — Koota world queries replace Miniplex hooks
- [ ] Port `src/rendering/CityRenderer.tsx`
- [ ] Port `src/rendering/UnitRenderer.tsx`
- [ ] Port `src/rendering/StormSky.tsx`
- [ ] Port `src/rendering/LandscapeProps.tsx`
- [ ] Port `src/input/TopDownCamera.tsx` — entity selection via Koota
- [ ] Port `src/input/UnitInput.tsx` — movement commands via Koota
- [ ] Port `src/ui/GameUI.tsx` — HUD reads from Koota
- [ ] Port `src/ui/TitleScreen.tsx`
- [ ] Port `src/App.tsx` — world initialization, phase management
- [ ] `pnpm tsc` reports zero errors
- [ ] `pnpm lint` reports zero errors

---

### US-008: Phase 0 Integration Gate — TypeScript + Biome + Build
As a developer, I want Phase 0 verified end-to-end so that Phase 1 can begin on a solid foundation.

**Priority:** P1
**Depends on:** US-001, US-002, US-003, US-004, US-005, US-006, US-007

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero TypeScript errors
- [ ] `pnpm lint` — zero Biome errors
- [ ] `pnpm build` — production Vite build succeeds
- [ ] All 27 original game files ported from Miniplex to Koota
- [ ] 9 robot GLBs in `public/assets/models/robots/`
- [ ] 25 building GLBs in `public/assets/models/buildings/`
- [ ] Audio system files in `src/audio/`
- [ ] Vitest browser mode smoke test passes
- [ ] Commit with message: `chore: Phase 0 complete — Koota port + assets, ready for Phase 1`

---

## Phase 1: Core RTS Loop — Labyrinth City + GLB Models + Game Loop

### US-009: Extract Labyrinth Generator from Git History
As a developer, I want the 6-phase rooms-and-mazes labyrinth generator restored so that the procedural city can be generated.

**Priority:** P1
**Depends on:** US-008

**Acceptance Criteria:**
- [ ] Extract 10 source files from `aeef1650^` via `git show`: labyrinth.ts, labyrinthMaze.ts, labyrinthFeatures.ts, labyrinthConnectivity.ts, labyrinthPlatforms.ts, labyrinthGenerator.ts, labyrinthAbyssal.ts, cityLayout.ts, connectivity.ts, depth.ts
- [ ] Extract 12 test files from `aeef1650^`: all `src/board/__tests__/labyrinth*.vitest.ts` + cityLayout, connectivity, depth, density tests
- [ ] Fix import paths to match post-Phase-0 directory structure (Koota traits, world, types)
- [ ] All labyrinth tests pass with seeded determinism: `pnpm vitest run src/board/`
- [ ] Commit with message: `feat: extract labyrinth generator from aeef1650^ — rooms-and-mazes pipeline restored`

---

### US-010: Adapt Labyrinth for Single-Player RTS
As a developer, I want the labyrinth generator configured for one player start and cult POI rooms so that the map suits the RTS format.

**Priority:** P1
**Depends on:** US-009

**Acceptance Criteria:**
- [ ] Replace multi-faction start room placement with exactly ONE player start room near center-south
- [ ] Add cult POI room types (shrine, workshop, antenna) concentrated in northern half of map
- [ ] Remove `factionCount` from BoardConfig — replaced by fixed player start + cult density parameter
- [ ] Seeded determinism still works (existing tests updated)
- [ ] New test file `src/board/__tests__/labyrinthSinglePlayer.vitest.ts`: exactly one player start, cult rooms in north, seeded reproducibility
- [ ] All board tests pass: `pnpm vitest run src/board/`

---

### US-011: Wire Labyrinth as Koota Board Data Source
As a developer, I want the labyrinth generator feeding tile data into Koota entities so that the game world uses the procedural city.

**Priority:** P1
**Depends on:** US-010

**Acceptance Criteria:**
- [ ] Wire labyrinth generator into world initialization (`gameState.ts` or equivalent) — call with game seed to produce tile grid
- [ ] Spawn Koota entities for each tile using Position, Fragment, BuildingTrait traits as appropriate
- [ ] Remove or replace old terrain.ts / cityLayout.ts with delegation to labyrinthGenerator.ts
- [ ] Spawn initial player units (maintenance bot + utility drone) at the player start room
- [ ] Smoke test: board tiles spawn, player start exists, cult POI rooms exist

---

### US-012: Replace Primitive Units with GLB Robot Models + Browser Test **[PARALLEL]**
As a developer, I want player robots rendered as 3D GLB models so that they look like robots instead of colored boxes.

**Priority:** P1
**Depends on:** US-008

**Acceptance Criteria:**
- [ ] Create `src/config/models.ts` — map 6 unit types to GLB paths (Arachnoid, Companion-bot, FieldFighter, MobileStorageBot, QuadrupedTank, ReconBot)
- [ ] Rewrite `src/rendering/UnitRenderer.tsx` to use `useGLTF` + drei `Instances` for each robot type
- [ ] Each unit entity reads `Unit.unitType` to select correct model
- [ ] Call `useGLTF.preload()` for all 6 robot GLBs to prevent pop-in
- [ ] Browser component test `tests/components/UnitRenderer.browser.test.tsx`: mounts UnitRenderer in R3F Canvas, asserts mesh children exist
- [ ] Dev server shows robot models (visual verification)

---

### US-013: Replace Primitive City with GLB Building Models + Browser Test
As a developer, I want the labyrinth city rendered with instanced GLB building models so that the environment looks like an industrial city.

**Priority:** P1
**Depends on:** US-011, US-012

**Acceptance Criteria:**
- [ ] Extend `src/config/models.ts` with building type → GLB path mappings for all 25 building types
- [ ] Rewrite `src/rendering/CityRenderer.tsx` to use instanced GLB rendering — group tiles by building type, use drei `Instances` per group
- [ ] Apply tile rotation (0/90/180/270) and scale to match grid spacing
- [ ] Call `useGLTF.preload()` for all used building GLBs
- [ ] Browser component test `tests/components/CityRenderer.browser.test.tsx`: mounts CityRenderer with mock tile data, asserts instanced meshes render
- [ ] Dev server shows labyrinth city with 3D buildings (visual verification)

---

### US-014: Responsive Viewport + Browser Test **[PARALLEL]**
As a developer, I want the game canvas filling the viewport at all screen sizes so that the game works on desktop and mobile.

**Priority:** P2
**Depends on:** US-008

**Acceptance Criteria:**
- [ ] R3F Canvas set to `style={{ width: '100vw', height: '100vh' }}`
- [ ] `src/index.css` sets `html, body, #root` to `margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%`
- [ ] `TopDownCamera` listens to `resize` events and updates frustum/aspect ratio
- [ ] No black bars, clipping, or overflow scrollbars at any size
- [ ] Browser component test `tests/components/Viewport.browser.test.tsx`: mounts Canvas, resizes window, asserts Canvas dimensions match
- [ ] Manually verify at 1920x1080, 1366x768, 375x812 (portrait), 812x375 (landscape)

---

### US-015: Real-Time Game Loop with 5-Speed Control
As a developer, I want the game loop ticking at configurable speeds so that gameplay runs in real-time with pause support.

**Priority:** P1
**Depends on:** US-011

**Acceptance Criteria:**
- [ ] Game loop via `useFrame` or `requestAnimationFrame` — each frame: `delta * speedMultiplier`
- [ ] Support 5 speeds: 0x (paused), 0.5x, 1x, 2x, 4x
- [ ] Speed stored in Koota singleton trait or React ref
- [ ] Systems called in order: movement → combat → enemies → exploration → resources → fabrication → power → repair → building placement
- [ ] At 0x, no systems tick
- [ ] App.tsx manages phases: Title → Playing (board gen, entity spawn, loop start)
- [ ] Verify: units spawn at player start, tick loop runs, pause stops updates, speed changes work

---

### US-016: Phase 1 Integration Gate — Labyrinth City Renders with Models
As a developer, I want Phase 1 verified end-to-end so that the core RTS loop is solid before combat/exploration work.

**Priority:** P1
**Depends on:** US-009, US-010, US-011, US-012, US-013, US-014, US-015

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm vitest run` — all labyrinth + existing tests pass
- [ ] `pnpm test:browser` — all browser component tests pass (UnitRenderer, CityRenderer, Viewport)
- [ ] `pnpm build` — production build succeeds
- [ ] Visual: labyrinth city renders with GLB building models
- [ ] Visual: 6 robot types visible as 3D models at player start
- [ ] Visual: viewport fills screen responsively
- [ ] Game loop ticks with 5 speed settings (0x/0.5x/1x/2x/4x)
- [ ] Commit with message: `chore: Phase 1 complete — core RTS loop with labyrinth, GLB models, responsive viewport`

---

## Phase 2: Combat + Exploration — Make the Game Playable

### US-017: Port Component Damage Combat System + Tests **[PARALLEL]**
As a developer, I want combat that damages individual robot components so that the signature mechanic (parts break, not HP) is functional.

**Priority:** P1
**Depends on:** US-016

**Acceptance Criteria:**
- [ ] Verify component damage helpers in `src/ecs/types.ts` work with Koota's `UnitComponents.componentsJson` field
- [ ] Port `src/systems/combat.ts` — query units with Position, Unit, UnitComponents, Faction; opposing factions in range roll damage targeting random component
- [ ] Damage sets `component.functional = false`; unit with ALL components non-functional is destroyed (entity removed)
- [ ] Attack range from unit archetype config (melee vs ranged)
- [ ] Test `src/systems/__tests__/combat.vitest.ts`: damage disables component, all-disabled destroys unit, same-faction no attack, range respected
- [ ] `pnpm vitest run src/systems/__tests__/combat` passes

---

### US-018: Port Fragment Merge Fog-of-War + Tests **[PARALLEL]**
As a developer, I want fog-of-war that reveals tiles organically and merges explored regions so that exploration feels like assembling a puzzle.

**Priority:** P1
**Depends on:** US-016

**Acceptance Criteria:**
- [ ] Port `src/systems/exploration.ts` — query player units with Position, Fragment; reveal tiles within vision range (affected by `hasCamera()`)
- [ ] Port `src/systems/fragmentMerge.ts` — when two fragments share adjacent tiles, merge into one (smaller adopts larger's ID)
- [ ] Wire fog rendering in TerrainRenderer: unrevealed = black, revealed = normal, previously-revealed-but-no-unit = dimmed
- [ ] Test `src/systems/__tests__/exploration.vitest.ts`: exploring reveals tile, camera-less unit has reduced vision, adjacent fragments merge, merged fragments share one ID
- [ ] `pnpm vitest run src/systems/__tests__/exploration` passes

---

### US-019: Wire 3 Cult Mech Types as Enemies + GLB Rendering **[PARALLEL]**
As a developer, I want 3 cult mech archetypes spawning as enemies so that the game has antagonists to fight.

**Priority:** P1
**Depends on:** US-016

**Acceptance Criteria:**
- [ ] Extract `CultMechs.ts` from feature branch, adapt to new trait structure
- [ ] Create `src/config/cultDefs.ts` — 3 mech archetypes: Mecha01/Wanderer (weak, patrols), MechaGolem/Brute (heavy, guards), MechaTrooper/Assault (fast, ranged)
- [ ] Add cult mech spawning to `src/systems/enemies.ts` — Wanderers in unexplored rooms, Brutes guard cult POI rooms
- [ ] Update `src/rendering/UnitRenderer.tsx` to handle cult faction — load cult GLB models via Faction trait
- [ ] Add cult GLB paths to `src/config/models.ts` (Mecha01.glb, MechaGolem.glb, MechaTrooper.glb)
- [ ] Test `src/systems/__tests__/enemies.vitest.ts`: Wanderers spawn in unexplored rooms, POI rooms have Brutes, cult units have "cultist" faction
- [ ] `pnpm vitest run src/systems/__tests__/enemies` passes

---

### US-020: Implement Cult Escalation — 3-Tier Threat Ramp
As a developer, I want cult enemies escalating from lone patrols to coordinated assault waves so that difficulty increases over time.

**Priority:** P1
**Depends on:** US-019

**Acceptance Criteria:**
- [ ] Create `src/systems/cultEscalation.ts` — track elapsed game time, escalate through 3 tiers
- [ ] Tier 1 (0-10 min): lone Wanderers patrol corridors
- [ ] Tier 2 (10-25 min): War Parties of 2-3 mixed mechs patrol aggressively
- [ ] Tier 3 (25+ min): coordinated Assault Waves push toward player base
- [ ] Wire into game loop tick order after enemy spawn system
- [ ] Test `src/systems/__tests__/cultEscalation.vitest.ts`: starts at tier 1, advances at time threshold, tier 2 spawns mixed groups, tier 3 spawns assault waves
- [ ] `pnpm vitest run src/systems/__tests__/cultEscalation` passes

---

### US-021: Wire Yuka GOAP for Cult AI Behavior **[PARALLEL]**
As a developer, I want cult units making autonomous decisions via GOAP so that enemies behave intelligently.

**Priority:** P1
**Depends on:** US-019

**Acceptance Criteria:**
- [ ] Install Yuka if not present: `pnpm add yuka`
- [ ] Create `src/ai/cultBehavior.ts` with 3 GoalEvaluator subclasses: PatrolGoal (random corridor walk), AggroGoal (detect + chase player), EscalateGoal (coordinate assault groups at tier 3)
- [ ] Each cult entity gets a Yuka Vehicle with a Think goal evaluating all three behaviors
- [ ] Maintain Map from Koota entity ID to Yuka Vehicle — create on spawn, remove on destroy
- [ ] Add `cultAI` system to game loop that calls Yuka EntityManager.update(delta) each tick
- [ ] Test `src/ai/__tests__/cultBehavior.vitest.ts`: idle unit selects PatrolGoal, unit near player switches to AggroGoal, patrol moves unit toward target tile
- [ ] `pnpm vitest run src/ai/__tests__/cultBehavior` passes

---

### US-022: Navmesh A* Pathfinding on Labyrinth Grid + Tests **[PARALLEL]**
As a developer, I want pathfinding through labyrinth corridors so that units navigate around walls intelligently.

**Priority:** P1
**Depends on:** US-016

**Acceptance Criteria:**
- [ ] Port `src/systems/navmesh.ts` — build Yuka NavGraph from walkable tiles; walls excluded, edges connect adjacent walkable tiles
- [ ] Port `src/systems/pathfinding.ts` — on move command, run A* to find waypoint path; store in Navigation trait
- [ ] Port `src/systems/movement.ts` — units with Navigation.moving follow waypoints at Unit.speed * delta, advance pathIndex, stop when final waypoint reached
- [ ] Test `src/systems/__tests__/pathfinding.vitest.ts`: path exists between walkable tiles, path avoids walls, no path returns empty, movement reaches destination
- [ ] `pnpm vitest run src/systems/__tests__/pathfinding` passes

---

### US-023: RTS Unit Selection + Move/Attack Commands + Touch Support
As a developer, I want click-to-select and right-click-to-move/attack so that the game plays like an RTS.

**Priority:** P1
**Depends on:** US-017, US-022

**Acceptance Criteria:**
- [ ] Port `src/input/UnitInput.tsx` — left-click selects unit (Unit.selected = true, others false), box select (click-drag rectangle)
- [ ] Right-click on walkable tile: issue move command to selected units (triggers pathfinding, sets Navigation.moving)
- [ ] Right-click on enemy: issue attack-move (pathfind to enemy position, enter combat range)
- [ ] Touch support: tap = select, double-tap = move, long-press = attack
- [ ] Visual feedback: selection ring on selected units, waypoint indicator on move, red indicator on attack target
- [ ] Verify end-to-end: click unit → right-click tile → unit pathfinds and walks → right-click enemy → unit approaches and fights

---

### US-024: Phase 2 Integration Gate — Combat, Exploration, AI Working
As a developer, I want Phase 2 verified end-to-end so that the game is playable before building the economy.

**Priority:** P1
**Depends on:** US-017, US-018, US-019, US-020, US-021, US-022, US-023

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm vitest run` — all tests pass (combat, fog, enemies, pathfinding, cult AI, escalation)
- [ ] `pnpm test:browser` — all browser tests pass
- [ ] `pnpm build` — production build succeeds
- [ ] Gameplay: select units and move through labyrinth
- [ ] Gameplay: fog-of-war reveals tiles, fragments merge when regions touch
- [ ] Gameplay: cult Wanderers patrol, combat triggers on contact
- [ ] Gameplay: component damage disables capabilities (blind without camera, immobile without legs)
- [ ] Gameplay: cult escalation increases threat over time
- [ ] Commit with message: `chore: Phase 2 complete — combat, exploration, cult AI, pathfinding, RTS input`

---

## Phase 3: Economy + Building — Complete the Resource Loop

### US-025: Port Resource Scavenging — 4 Materials from Ruin Sites + Tests **[PARALLEL]**
As a developer, I want units collecting materials from ruins so that the resource economy has inputs.

**Priority:** P1
**Depends on:** US-024

**Acceptance Criteria:**
- [ ] Add traits to `src/ecs/traits.ts`: Inventory (material/quantity pairs), ScavengeSite (material type, remaining quantity)
- [ ] Create `src/config/materials.ts` — 4 materials: Scrap Metal (common, ruins), Circuitry (uncommon, tech rooms), Power Cells (rare, cult structures), Durasteel (rare, deep ruins)
- [ ] Port `src/systems/resources.ts` — unit at ScavengeSite transfers materials to Inventory over time; depleted sites lose ScavengeSite trait
- [ ] Seed scavenge sites during board generation: ruin rooms get scrap, tech rooms get circuitry, cult rooms get power cells
- [ ] Test `src/systems/__tests__/resources.vitest.ts`: unit collects over time, depleted site stops, inventory tracks materials, scavenge rate respects game speed
- [ ] `pnpm vitest run src/systems/__tests__/resources` passes

---

### US-026: Port Lightning Rod Power System + Tests **[PARALLEL]**
As a developer, I want lightning rods harvesting storm energy to power buildings so that the power infrastructure works.

**Priority:** P1
**Depends on:** US-024

**Acceptance Criteria:**
- [ ] Port `src/systems/power.ts` — query LightningRod entities, find Building entities within protectionRadius, set Building.powered accordingly
- [ ] Rod currentOutput fluctuates via noise function (storm intensity)
- [ ] Render subtle power radius indicator around rods; buildings show lit/dark visual state based on powered status
- [ ] Test `src/systems/__tests__/power.vitest.ts`: building in range is powered, building outside is unpowered, removing rod unpowers, output fluctuates
- [ ] `pnpm vitest run src/systems/__tests__/power` passes

---

### US-027: Port Building Placement — 6 Types, Ghost Preview + Browser Test **[PARALLEL]**
As a developer, I want to place buildings with validation and ghost preview so that base-building is functional.

**Priority:** P1
**Depends on:** US-024

**Acceptance Criteria:**
- [ ] Create `src/config/buildingDefs.ts` — 6 buildings with costs, build times, GLB paths, gameplay properties: Lightning Rod, Fabrication Unit, Repair Bay, Barricade, Sensor Tower, Storage Depot
- [ ] Port `src/systems/buildingPlacement.ts` — placement mode with ghost preview (semi-transparent GLB), validation (walkable tile, not blocking connectivity, builder adjacent), material consumption, build timer
- [ ] Validation rules: no walls/occupied tiles, no blocking only path, minimum rod spacing, builder within 1 tile
- [ ] Test `src/systems/__tests__/buildingPlacement.vitest.ts`: valid placement spawns entity, wall placement rejected, blocking connectivity rejected, materials consumed, build timer completes
- [ ] Browser test `tests/components/BuildingPlacement.browser.test.tsx`: ghost preview renders in Canvas with transparency
- [ ] `pnpm vitest run src/systems/__tests__/buildingPlacement` passes

---

### US-028: Port Fabrication System — Craft Components from Materials + Tests
As a developer, I want to craft robot components at powered fabrication units so that damaged robots can be repaired.

**Priority:** P1
**Depends on:** US-025, US-026

**Acceptance Criteria:**
- [ ] Create `src/config/recipeDefs.ts` — 4 recipes: Camera (2 Circuitry + 1 Scrap), Arms (3 Scrap + 1 Circuitry), Legs (3 Scrap + 1 Durasteel), Power Cell (2 Power Cells + 1 Circuitry)
- [ ] Port `src/systems/fabrication.ts` — query powered fabrication buildings, check adjacent unit has matching materials, consume + start timer, produce component
- [ ] Show progress bar over fabrication building while crafting
- [ ] Test `src/systems/__tests__/fabrication.vitest.ts`: consumes correct materials, unpowered refuses, timer completes, insufficient materials prevents
- [ ] `pnpm vitest run src/systems/__tests__/fabrication` passes

---

### US-029: Port Repair System — Auto-Repair at Powered Bays + Tests
As a developer, I want damaged robots auto-repairing at repair bays so that units can recover from combat.

**Priority:** P1
**Depends on:** US-026, US-028

**Acceptance Criteria:**
- [ ] Port `src/systems/repair.ts` — query powered operational repair bays, find adjacent player units with broken components, repair over time
- [ ] Manual repair option: unit at fabrication unit can self-repair using inventory components (slower than bay)
- [ ] Show repair animation (sparks, progress bar) during repair
- [ ] Test `src/systems/__tests__/repair.vitest.ts`: damaged unit at bay gets repaired, repair takes time, unpowered bay no repair, manual repair at fab unit works
- [ ] `pnpm vitest run src/systems/__tests__/repair` passes

---

### US-030: Mark I/II/III Upgrades via Radial Menu + Browser Test
As a developer, I want to upgrade robot archetypes through 3 Mark tiers via a radial menu so that units become more powerful.

**Priority:** P1
**Depends on:** US-028

**Acceptance Criteria:**
- [ ] Extend Unit trait with `mark: 1 | 2 | 3`; Mark level affects speed, vision, durability, damage
- [ ] Create `src/config/robotDefs.ts` — 6 archetypes (Maintenance, Utility Drone, Fabrication, Guard, Cavalry, Sentinel) with 3 Mark tiers of stats
- [ ] Create `src/ui/game/RadialMenu.tsx` — DOM overlay on right-click/long-press selected unit; options: Move, Attack, Repair, Upgrade, Scavenge
- [ ] Upgrade action: check materials, consume, increment mark, apply new stats
- [ ] Upgrade grayed out if insufficient materials or already Mark III
- [ ] Test `src/systems/__tests__/upgrade.vitest.ts`: I→II consumes materials, II→III consumes materials, III cannot upgrade, stats change, insufficient blocks
- [ ] Browser test `tests/components/RadialMenu.browser.test.tsx`: menu renders positioned near selected unit, shows correct options
- [ ] `pnpm vitest run src/systems/__tests__/upgrade` passes

---

### US-031: Phase 3 Integration Gate — Full Resource Loop End-to-End
As a developer, I want the complete resource loop verified so that the economy is solid before UI/audio work.

**Priority:** P1
**Depends on:** US-025, US-026, US-027, US-028, US-029, US-030

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm vitest run` — all tests pass (resources, power, building, fabrication, repair, upgrade)
- [ ] `pnpm test:browser` — all browser tests pass (BuildingPlacement, RadialMenu)
- [ ] `pnpm build` — production build succeeds
- [ ] Gameplay loop verified end-to-end: (1) move unit to ruin → (2) scavenge materials → (3) place lightning rod → (4) place fabrication unit in rod range → (5) craft component → (6) place repair bay → (7) repair damaged unit → (8) upgrade Mark I→II
- [ ] Commit with message: `chore: Phase 3 complete — full economy: scavenge, fabricate, power, repair, upgrade`

---

## Phase 4: UI + Audio + Persistence — Complete Game Shell

### US-032: Port Landing Page — LandingScreen + NewGameModal + Browser Test **[PARALLEL]**
As a developer, I want a landing page with new game options so that players can start the game properly.

**Priority:** P1
**Depends on:** US-031

**Acceptance Criteria:**
- [ ] Extract LandingScreen.tsx and NewGameModal.tsx from feature branch
- [ ] Adapt for RTS: remove faction selection, map options; keep seed input, difficulty selector (Easy/Normal/Hard affects cult escalation speed), Start button, Continue button
- [ ] Wire into App.tsx phase machine: `title → playing`
- [ ] Browser test `tests/components/LandingScreen.browser.test.tsx`: renders title, New Game button, modal opens with seed/difficulty/start
- [ ] Dev server shows landing screen with functional new game flow

---

### US-033: Port R3F Globe as Menu Background + Browser Test **[PARALLEL]**
As a developer, I want a slowly rotating storm globe behind the landing page so that the menu has atmospheric presence.

**Priority:** P2
**Depends on:** US-031

**Acceptance Criteria:**
- [ ] Extract Globe.tsx and title scene files from feature branch
- [ ] Adapt as background-only: strip board/unit/input rendering, keep sphere + storm sky shader + atmospheric glow + slow auto-rotation
- [ ] Compose as full-screen R3F Canvas behind LandingScreen DOM overlay
- [ ] Browser test `tests/components/GlobeBackground.browser.test.tsx`: mounts in Canvas, asserts sphere mesh and rotation animation
- [ ] Visual: spinning globe with storm atmosphere behind landing buttons

---

### US-034: Port Audio System — Tone.js SFX + Music + Ambience **[PARALLEL]**
As a developer, I want audio playing during gameplay so that the game has sound.

**Priority:** P2
**Depends on:** US-031

**Acceptance Criteria:**
- [ ] Adapt `src/audio/audioEngine.ts` — lazy init on first interaction (autoplay policy), master volume, mute toggle, clean teardown
- [ ] Adapt `src/audio/sfx.ts` — map SFX to RTS events: unit selected, moved, combat hit, component destroyed, building placed, fabrication complete, scavenging, cult spotted
- [ ] Adapt `src/audio/music.ts` — mood system: Calm (exploring), Tense (cult spotted), Combat (fighting), Dread (tier 3 assault)
- [ ] Adapt `src/audio/ambience.ts` — perpetual storm loop plays continuously
- [ ] Wire audio into game events: SFX from system callbacks, music mood from game state, ambience continuous, all pause at speed 0x
- [ ] Add volume slider + mute button to GameUI.tsx and LandingScreen settings
- [ ] Verify: storm ambience plays, music shifts mood, SFX triggers on actions, mute/volume work, audio respects pause

---

### US-035: Port SQLite Persistence — Save/Load Koota World + Tests **[PARALLEL]**
As a developer, I want save/load via SQLite so that game progress persists across sessions.

**Priority:** P1
**Depends on:** US-031

**Acceptance Criteria:**
- [ ] Extract DB files from feature branch; adapt schema for RTS: games, tiles, units, buildings, lightning_rods tables
- [ ] Rewrite `src/db/serialize.ts` for Koota: save queries all entities, extracts trait data, inserts into SQLite; load reads tables, spawns entities with traits
- [ ] Wire save/load into App.tsx: save pauses + serializes + resumes, load from Continue button, auto-save every 5 min
- [ ] Add save button to GameUI (Ctrl+S / HUD button), Continue button on LandingScreen shows available saves
- [ ] SQLite is non-fatal: DB failure → game continues in memory, save/load shows "unavailable"
- [ ] Test `src/db/__tests__/serialize.vitest.ts`: save creates records, load restores traits, round-trip preserves state, component damage survives, DB failure no crash
- [ ] `pnpm vitest run src/db/__tests__/serialize` passes

---

### US-036: Wire Game Speed Control UI + Keyboard Shortcuts **[PARALLEL]**
As a developer, I want speed control buttons and keyboard shortcuts so that players can pause and adjust game speed.

**Priority:** P2
**Depends on:** US-031

**Acceptance Criteria:**
- [ ] Extract `gameSpeedDefs.ts` from feature branch — 5 speeds: 0x, 0.5x, 1x, 2x, 4x
- [ ] Add speed control buttons to GameUI: Pause (||), speed buttons (0.5x-4x), current speed indicator
- [ ] Keyboard shortcuts: Space = pause/unpause, + = increase speed, - = decrease speed
- [ ] Verify all systems respect `delta * speedMultiplier` — at 0x nothing ticks, at 4x everything 4x
- [ ] Audio tempo adjusts with speed if applicable

---

### US-037: Phase 4 Integration Gate — Full Session Start to Resume
As a developer, I want the complete game shell verified so that Polish + Narrative work can begin.

**Priority:** P1
**Depends on:** US-032, US-033, US-034, US-035, US-036

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm vitest run` — all tests pass (including persistence round-trip)
- [ ] `pnpm test:browser` — all browser tests pass (LandingScreen, GlobeBackground)
- [ ] `pnpm build` — production build succeeds
- [ ] Full session: (1) landing page with globe → (2) New Game modal → (3) Start → labyrinth generates → (4) audio plays (storm + music + SFX) → (5) play for 1 min → (6) save (Ctrl+S) → (7) return to title → (8) Continue → (9) state restored → (10) speed controls work → (11) volume/mute work
- [ ] Commit with message: `chore: Phase 4 complete — landing page, audio, save/load, speed controls`

---

## Phase 5: Polish + Narrative — Complete the Game

### US-038: Narrative Dialogue System — Typewriter Overlay + Browser Test **[PARALLEL]**
As a developer, I want an intro narrative and phase transitions told through a typewriter dialogue overlay so that the story is communicated.

**Priority:** P1
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Create `src/config/narrativeDefs.ts` — intro sequence (5 frames), phase transition dialogues, victory dialogue
- [ ] Create `src/ui/game/NarrativeOverlay.tsx` — full-screen DOM overlay with typewriter text effect, click/tap/Space advances, Skip button, atmospheric dark background
- [ ] Wire Narration phase into App.tsx: `title → narration → playing`; first game plays intro, subsequent games offer Skip Intro
- [ ] Browser test `tests/components/NarrativeOverlay.browser.test.tsx`: renders text with typewriter animation, advances on click, skip button skips sequence
- [ ] Dev server: New Game → intro dialogue plays with typewriter → transitions to gameplay

---

### US-039: Human Temperature 5-Tier Disposition System + Tests **[PARALLEL]**
As a developer, I want a human temperature meter affecting NPC behavior so that player actions have social consequences.

**Priority:** P2
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Add HumanTemperature singleton trait (value 0-100, starts at 10) to `src/ecs/traits.ts`
- [ ] Create `src/config/humanEncounterDefs.ts` — events: clear cult room +5, build near humans +3, lose unit -2, destroy shrine +8, friendly fire -10
- [ ] Create `src/systems/humanTemperature.ts` — listen for events, adjust value, clamp 0-100; tier effects: Cool (21+) humans appear, Warm (41+) reveal shrines, Hot (61+) scouts join, Burning (81+) militia spawns
- [ ] Add temperature display (gauge + tier name) to GameUI
- [ ] Test `src/systems/__tests__/humanTemperature.vitest.ts`: clearing raises, friendly fire lowers, clamps at 0/100, tier thresholds trigger effects
- [ ] `pnpm vitest run src/systems/__tests__/humanTemperature` passes

---

### US-040: 3 Game Phases — Awakening/Expansion/War Gating
As a developer, I want 3 game phases gating mechanics and triggering narrative so that the game has progression structure.

**Priority:** P1
**Depends on:** US-038

**Acceptance Criteria:**
- [ ] Create `src/config/phaseDefs.ts` — 3 phases with time thresholds, early-trigger conditions, unlocked buildings, Mark tiers, cult escalation tier, narrative dialogue
- [ ] Create `src/systems/gamePhases.ts` — track elapsed time, check transition triggers, play narrative, unlock mechanics, advance escalation
- [ ] Add GamePhase singleton trait to `src/ecs/traits.ts`
- [ ] Awakening (0-15 min): only Lightning Rod + Barricade, Wanderers only, Mark I only
- [ ] Expansion (15-35 min): all buildings, War Parties, Mark II available
- [ ] War (35+ min): Assault Waves, Mark III available, victory objective active
- [ ] Wire phase checks into building placement (unlock), upgrade (Mark tier), cult escalation
- [ ] Add phase indicator to GameUI (name + progress)
- [ ] Test `src/systems/__tests__/gamePhases.vitest.ts`: starts Awakening, Expansion at 15min or 3 rooms, War at 35min, building unlock respects phase, Mark unlock respects phase
- [ ] `pnpm vitest run src/systems/__tests__/gamePhases` passes

---

### US-041: PBR Materials on City — ambientCG Textures + Browser Test **[PARALLEL]**
As a developer, I want PBR-textured city surfaces so that the environment has visual depth and material realism.

**Priority:** P2
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Select PBR textures from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/`: concrete (floors), metal (walls), durasteel (special), rust (ruins), grating (walkways)
- [ ] Copy selected 1K texture sets to `public/assets/textures/pbr/`
- [ ] Create `src/config/materialDefs.ts` — tile/building type → PBR texture path mappings
- [ ] Apply in CityRenderer: MeshStandardMaterial with map, normalMap, roughnessMap, metalnessMap, aoMap as available; use drei `useTexture`
- [ ] Apply in TerrainRenderer for uncovered tiles
- [ ] Browser test `tests/components/PBRMaterials.browser.test.tsx`: renders city tile with PBR material, asserts material has normalMap and roughnessMap set
- [ ] Visual: city surfaces show texture detail, normal map relief under lighting, varied roughness

---

### US-042: Production Error Handling — Assert+Throw, Debug Overlay, Error Boundary **[PARALLEL]**
As a developer, I want production-grade error handling so that bugs are caught immediately instead of silently degrading.

**Priority:** P2
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Create `src/ui/game/DebugOverlay.tsx` — dev-only DOM overlay (bottom-left): last 10 errors, FPS, entity count, system count
- [ ] Add React error boundary to App.tsx: dev shows stack + Reload, prod shows "Something went wrong" + Reload
- [ ] Audit all systems — replace silent fallbacks with asserts: `if (!entity) return` → `assert(entity, "Expected entity in combat")`, empty catches → `throw new GameError(...)`
- [ ] Create GameError class with context (system name, entity ID, state snapshot)
- [ ] Verify: intentionally trigger error → DebugOverlay shows it, error boundary catches

---

### US-043: E2E Tests with Playwright — New Game, Gameplay, Save/Load **[PARALLEL]**
As a developer, I want E2E tests covering critical game flows so that regressions are caught automatically.

**Priority:** P2
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Verify/create `playwright.config.ts` targeting Vite dev server with reasonable timeouts and failure screenshots
- [ ] Create `tests/e2e/newGame.spec.ts`: navigate → landing page visible → New Game → modal → Start → game view renders
- [ ] Create `tests/e2e/gameplay.spec.ts`: fixed seed → units visible → HUD displays info → pause/unpause (Space) → speed change (+/-)
- [ ] Create `tests/e2e/saveLoad.spec.ts`: start game → wait → save (Ctrl+S) → return to title → Continue → state restored (HUD values match)
- [ ] `pnpm playwright test` — all E2E tests pass

---

### US-044: Mobile Optimization — Capacitor iOS/Android, Touch Refinement
As a developer, I want the game running on mobile via Capacitor so that it is playable on phones and tablets.

**Priority:** P3
**Depends on:** US-037

**Acceptance Criteria:**
- [ ] Initialize Capacitor: `npx cap add ios && npx cap add android`
- [ ] Adapt main.tsx for Capacitor: detect `Capacitor.isNativePlatform()`, use native SQLite, viewport meta for no-zoom + safe-area-inset, fullscreen
- [ ] Performance budgets: reduce max instances on mobile, lower shadow quality, 512px textures, target 30fps, use drei `AdaptiveDpr` + `PerformanceMonitor`
- [ ] Touch refinement: tap accuracy (finger-sized targets), double-tap timing, long-press no conflict with scroll, pinch-to-zoom camera
- [ ] Build: `pnpm build && npx cap sync && npx cap open ios && npx cap open android`
- [ ] Test on simulator: game loads, touch works, 30fps+, save/load works, audio plays

---

### US-045: Final Integration Gate — Full Playthrough Start to Victory
As a developer, I want the complete game verified end-to-end so that the project is shippable.

**Priority:** P1
**Depends on:** US-038, US-039, US-040, US-041, US-042, US-043, US-044

**Acceptance Criteria:**
- [ ] `pnpm tsc` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm vitest run` — all unit tests pass
- [ ] `pnpm test:browser` — all browser component tests pass
- [ ] `pnpm playwright test` — all E2E tests pass
- [ ] `pnpm build` — production build succeeds, bundle size reasonable
- [ ] Full playthrough: (1) landing + globe → (2) New Game → intro narrative → (3) Awakening: explore, scavenge, build → (4) Phase transition → (5) Expansion: push out, war parties, Mark II → (6) Human temperature rises → (7) Phase transition → (8) War: assaults, Mark III, human allies → (9) Push north to cult stronghold → (10) Victory → (11) Save/load works at any point → (12) Audio throughout
- [ ] Commit with message: `chore: Phase 5 complete — narrative, temperature, PBR, E2E, mobile ready`

---

## Functional Requirements

- FR-1: All entity state managed through Koota ECS traits — no Miniplex references remain
- FR-2: Labyrinth generator produces seeded-deterministic maps with rooms-and-mazes pipeline
- FR-3: Combat targets individual components (camera, arms, legs, power_cell) — no HP bars
- FR-4: Fragment merge fog-of-war reveals map organically as units explore
- FR-5: Cult enemies escalate through 3 tiers based on elapsed game time
- FR-6: Yuka GOAP drives autonomous cult AI behavior (patrol, aggro, escalate)
- FR-7: A* pathfinding on navmesh navigates around labyrinth walls
- FR-8: Resources are physical (carried by units) not abstract (no global stockpile)
- FR-9: Buildings require adjacent powered lightning rod to operate
- FR-10: Mark I/II/III upgrades apply archetype-specific stat progressions
- FR-11: Radial menu provides context-sensitive unit actions
- FR-12: SQLite persistence is non-fatal — game runs from ECS if DB fails
- FR-13: Audio respects game speed (pauses at 0x)
- FR-14: 3 game phases gate building unlocks, Mark tiers, and cult escalation
- FR-15: Human temperature system has 5 tiers with gameplay effects at each threshold
- FR-16: All R3F renderer components have Vitest browser mode tests
- FR-17: All game systems accept `world: World` parameter for testability

## Non-Goals (Out of Scope)

- Multiple AI factions competing against each other (single player only)
- Diplomacy or faction relations system
- Sphere world / equirectangular projection (flat top-down labyrinth)
- Tech tree (replaced by Mark I/II/III upgrades)
- Turn-based gameplay (real-time with pause)
- Phaser, enable3d, Babylon.js (R3F is the rendering tech)
- 200+ scatter GLBs (25 buildings + procedural city)
- Weather multipliers on gameplay (storm is atmospheric only)
- Multiplayer / networking
- Custom color schemes or art style selection
- Procedural terrain biomes (city environment only)

## Technical Considerations

- **Source code:** All code sourced from existing commits/branches — see master plan Code Sourcing Reference table
- **Labyrinth generator:** Extract from `aeef1650^` (parent of removal commit)
- **GLB assets:** 9 robot + 25 building GLBs from `cursor/cloud-agent-runbook-review-0483` branch
- **Koota patterns:** `entity.get(Trait)` / `entity.set(Trait, {...})` / `world.query(T1, T2)`; entity `.id()` is a method call
- **Vitest browser mode:** Requires `@vitest/browser` + Playwright provider; config at `vitest.browser.config.ts`
- **PBR textures:** Source from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` (NAS must be mounted)
- **Capacitor SQLite:** `sql.js/dist/sql-asm.js` for web, native plugin for iOS/Android
- **Performance:** Mobile targets 30fps; desktop 60fps; use drei AdaptiveDpr + PerformanceMonitor

## Success Metrics

- Zero TypeScript errors across all 344+ source files
- Zero Biome lint errors
- All Vitest unit tests pass (target: 50+ test files across systems, board, AI, DB)
- All Vitest browser component tests pass (target: 10+ R3F/DOM component tests)
- All Playwright E2E tests pass (3 critical flows: new game, gameplay, save/load)
- Production Vite build succeeds with reasonable bundle size
- Full playthrough possible from landing page to victory condition
- Game runs at 60fps on desktop, 30fps on mobile (via Capacitor)

## Open Questions

- Exact ambientCG texture IDs to use for concrete/metal/rust — requires browsing the NAS asset library
- Whether music tempo should scale with game speed (1x/2x/4x) or remain constant
- Victory condition specifics: is the cult stronghold a specific room, or a boss encounter?
- Save slot management: how many save slots? Auto-save only, or named saves?
- Should the intro narrative play every new game, or only the first time?
[/PRD]
