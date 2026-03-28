# PRD: Syntheteria -- From Rendering Demo to Playable Game

**Created**: 2026-03-26T23:00:00Z
**Version**: 2.88
**Timeframe**: Sprint (6 phases, sequential)
**Source Plan**: `docs/superpowers/plans/2026-03-27-implementation-plan.md`

## Priority: P0 (Critical -- game is not playable)

## Overview

Syntheteria is a 2.5D top-down open-world RTS with 4X exploration. An AI awakens in a dead ecumenopolis, explores a procedural labyrinth, scavenges, fabricates, and fights the Cult of EL. The engine infrastructure (BabylonJS/Reactylon, Koota ECS, Yuka AI, 732 unit tests) is built, but the game is not playable. Robots are invisible, chunks don't fill the viewport, entity placement is hardcoded, and no gameplay loops are wired. This PRD decomposes the 6-phase implementation plan into executable tasks that bring the game from rendering demo to playable experience.

## Architecture Rules (from AGENTS.md + ARCHITECTURE_VISION.md)

1. **Board is central authority** -- `src/board/` generates the world AND populates it with entities. No hardcoded entity positions outside the 2 starting robots.
2. **WebGPU engine** -- BabylonJS 8.x with WGSL shaders. Never downgrade to WebGL.
3. **No JSON configs** -- All game data in TypeScript `const` objects in `src/config/`.
4. **ECS systems accept `world: World`** -- For testability.
5. **Mouse-first input** -- If it can't be done with a mouse, UX has FAILED.
6. **No silent fallbacks** -- `catch {}` is banned. Log + throw or log + comment why non-fatal.
7. **No mocks in tests** -- Vitest browser tests compile everything including Reactylon. Unit tests use real ECS world.
8. **Visual verification required** -- Every task must be verified via Chrome DevTools MCP screenshot before claiming done.
9. **Build**: Vite 8 + @vitejs/plugin-react + babel-plugin-reactylon
10. **TILE_SIZE_M = 2.0**, CHUNK_SIZE = 32 tiles, VIEW_RADIUS = 3 chunks

## Dependencies

- BabylonJS 8.x, Reactylon 3.x, Koota 0.6.x, Yuka 0.7.x
- Tone.js (audio), @capacitor-community/sqlite + sql.js (persistence)
- Vite 8, vitest, playwright, biome

---

## Phase 1: Make The World Work

**Blocks all subsequent phases.** Without a visible, populated world, nothing else matters.

### Task 1.1: Fix chunk loading -- labyrinth fills viewport

- **Priority**: P0
- **Files**:
  - `src/game/ChunkManager.ts` (debug/fix `loadChunksAround`, verify VIEW_RADIUS=3 produces 49 chunks)
  - `src/board/chunks.ts` (verify `generateChunk` produces valid tile grids)
  - `src/board/scene.ts` (verify `populateChunkScene` creates meshes at correct world positions)
  - `src/game/GameCanvas.tsx` (verify camera target aligns with chunk world coords, verify `premultipliedAlpha=false` eliminates transparent pixels)
- **Description**: Debug why only a small cluster of labyrinth chunks renders when VIEW_RADIUS=3 should produce 49 chunks (7x7 grid). The POC loaded chunks that filled the screen. Compare the POC chunk generation with current `generateChunk()`. The canvas renders transparent pixels (alpha=0) where chunks should be -- either chunks are not generating, meshes are not being created, or they are positioned wrong. Check that `CHUNK_SIZE * TILE_SIZE_M` (32 * 2.0 = 64m per chunk) correctly converts between tile coords and world coords in ChunkManager. Verify the camera starts centered on player spawn chunk.
- **Completion criteria**:
  - After navigating to gameplay, >50% of canvas pixels are non-transparent (not the fog/clear color)
  - `ChunkManager.loaded.size` equals 49 when VIEW_RADIUS=3
  - Camera target is centered on player spawn position (`startPos`)
  - Chunks tile seamlessly with no gaps between adjacent chunks
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome DevTools MCP screenshot of gameplay canvas showing labyrinth filling the viewport

### Task 1.2: Board generates entities in chunks

- **Priority**: P0
- **Files**:
  - `src/board/chunks.ts` (add `entitySpawns` field to `Chunk` interface, add entity spawn logic to `generateChunk`)
  - `src/board/types.ts` (add `EntitySpawn` type definition)
  - `src/game/ChunkManager.ts` (spawn Koota entities when chunk loads, despawn when chunk unloads)
  - `src/ecs/factory.ts` (ensure `spawnCultUnit`, `spawnUnit`, `spawnLightningRod`, `spawnFabricationUnit` accept chunk-based spawning)
  - `src/board/__tests__/` (new tests for entity spawn generation)
- **Description**: Add entity spawn data to the `Chunk` type. During chunk generation, deterministically place: ScavengeSite entities in rooms (density based on distance from origin), enemy patrol markers in corridors (density based on distance), lightning rods in large rooms near origin, fabrication units in specific room configurations. ChunkManager must spawn entities when chunk loads and despawn them when chunk unloads. Use the existing `dangerLevel()` function from Phase 1.3 to control density.
- **Completion criteria**:
  - `Chunk` interface has an `entitySpawns: EntitySpawn[]` field
  - `EntitySpawn` type includes: `type`, `position`, `materialType`, `faction`, `mechType` (optional fields based on spawn type)
  - `generateChunk` populates `entitySpawns` with ScavengeSite, enemy, lightning rod, and fabrication unit spawns
  - Spawns are deterministic (same seed + chunk coords = same entities)
  - ChunkManager creates Koota entities on chunk load and destroys them on chunk unload
  - After loading chunks, Koota world has ScavengeSite + enemy entities that the player did not manually spawn
  - No entity spawns at distance 0-2 chunks from origin (safe zone)
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing salvage nodes and enemy markers in loaded chunks

### Task 1.3: Difficulty gradient via distance

- **Priority**: P0
- **Files**:
  - `src/board/chunks.ts` (add `dangerLevel()` function, wire into entity spawn density)
  - `src/board/zones.ts` (remove or deprecate `WORLD_EXTENT` zone system if replaced by distance-based)
  - `src/board/__tests__/` (tests for difficulty gradient)
- **Description**: Replace the `WORLD_EXTENT` zone system with a continuous distance-based difficulty function:
  ```typescript
  function dangerLevel(chunkX: number, chunkZ: number, spawnCx: number, spawnCz: number): number {
    const dist = Math.sqrt((chunkX - spawnCx) ** 2 + (chunkZ - spawnCz) ** 2);
    return Math.min(1.0, dist / 30);
  }
  ```
  Danger level drives: enemy density (0 at spawn, max at 30 chunks out), resource rarity (inverse -- common near spawn, rare far), cult POI probability (rises with distance). This creates the geographic difficulty curve described in GAME_IDENTITY.md without hard zone boundaries.
- **Completion criteria**:
  - `dangerLevel()` exported from `src/board/chunks.ts`
  - Enemy spawn count per chunk scales linearly with danger level
  - Salvage spawn count is constant or slightly decreasing with distance (resources are everywhere but type shifts)
  - Cult POI spawns only appear at dangerLevel > 0.3
  - Chunks at distance 0-2 from spawn have zero enemy spawns
  - Chunks at distance 30+ from spawn have maximum enemy density
  - Tests verify gradient: chunks far from spawn have more enemy spawn points than chunks near spawn
- **Verification**: `command` -- `pnpm tsc && pnpm test`

### Task 1.4: Strip initializeWorld to just player start

- **Priority**: P0
- **Files**:
  - `src/app/initializeWorld.ts` (remove all hardcoded entity spawns except the 2 starting robots)
  - `src/ecs/cityLayout.ts` (keep city layout init for nav graph, remove hardcoded rooms if any)
  - `src/app/__tests__/` (update tests for stripped initializeWorld)
- **Description**: Remove all hardcoded entity spawns from `initializeWorld`. The board now handles entity placement via chunk generation (Task 1.2). `initializeWorld` should only: (1) Set game config (seed, difficulty), (2) Init city layout + nav graph, (3) Spawn 2 broken starting robots at the spawn point, (4) Return start position. Remove: hardcoded scavenge sites (8 sites), hardcoded cult bases (3 bases), hardcoded fabrication unit, hardcoded lightning rod. These are now generated by the board's chunk entity spawn system.
- **Completion criteria**:
  - `initializeWorld` spawns exactly 2 Unit entities (Bot Alpha, Bot Beta)
  - No ScavengeSite entities exist after `initializeWorld` (board handles them)
  - No cult bases exist after `initializeWorld` (board handles them)
  - No fabrication units or lightning rods exist after `initializeWorld` (board handles them)
  - `initializeWorld` still calls `setGameConfig`, `initCityLayout`, `buildNavGraph`
  - With no chunks loaded, Koota world has exactly 2 entities with the Unit trait
  - All existing tests updated to reflect new behavior
- **Verification**: `command` -- `pnpm tsc && pnpm test`

---

## Phase 2: Make Units Visible and Interactive

**Depends on**: Phase 1 complete (world renders, entities spawn).

### Task 2.1: Fix robot GLB visibility

- **Priority**: P0
- **Files**:
  - `src/game/EntityRenderer.ts` (adjust MODEL_SCALE, verify mesh creation, check material assignment)
  - `src/config/models.ts` (verify model URLs point to valid GLBs)
  - `src/game/GameCanvas.tsx` (verify lighting is sufficient for PBR materials on GLBs)
  - `public/assets/models/` or model source paths (verify GLBs exist and have correct normals/materials)
- **Description**: Robots load via `LoadAssetContainerAsync` but are barely visible at the camera distance (25deg beta, radius 60). Debug the full visibility chain: GLB loads -> `createFromContainer` instantiates -> root node positioned -> child meshes tagged -> frame sync updates position. Check: (1) MODEL_SCALE=2.0 is appropriate for the GLB's native size, (2) PBR materials on GLBs work with the scene's environment texture and lighting setup, (3) mesh positions are in world coords (not tile coords), (4) meshes are not occluded by wall geometry, (5) mesh normals face outward, (6) `isVisible=true` and `setEnabled(true)` are both set.
- **Completion criteria**:
  - Robot GLB models are clearly visible at the default camera distance (radius=60, beta=25deg)
  - At least 2 robot meshes render at spawn position
  - Robots have distinct visual appearance (not solid black or invisible)
  - Console shows `[EntityRenderer] Models loaded: N/N` with N > 0
  - No `GameError` logged for model loading
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing recognizable robot models at spawn position with distinct materials and lighting

### Task 2.2: Selection and movement work

- **Priority**: P0
- **Files**:
  - `src/game/InputHandler.ts` (verify click detection, entity picking, ground picking, movement command dispatch)
  - `src/input/selection.ts` (verify selection logic sets Unit.selected=true on click)
  - `src/game/EntityRenderer.ts` (verify selection ring appears, verify `getEntityAtPoint` raycasting works)
  - `src/systems/movement.ts` (verify position updates from Navigation path)
  - `src/systems/pathfinding.ts` (verify path computation from Yuka NavGraph)
  - `src/systems/navmesh.ts` (verify `buildNavGraph` produces valid graph for chunk terrain)
  - `src/ecs/traits.ts` (verify Navigation trait fields are correctly updated)
- **Description**: Wire the complete selection and movement chain: click robot -> `getEntityAtPoint` returns entityId -> `selectEntity` sets `Unit.selected=true` -> selection ring fades in -> click ground -> `scene.pick` returns ground position -> `issueMoveTo` computes path via Yuka NavGraph -> `Navigation.pathJson` set -> `movementSystem` reads path -> `Position` updates per frame -> `EntityRenderer.syncEntities` moves mesh. Verify each link in the chain. The pathfinding (`buildNavGraph` + Yuka) is wired but may not produce paths that correspond to current chunk layout.
- **Completion criteria**:
  - Clicking a robot selects it (Unit.selected becomes true)
  - Selected robot shows cyan selection ring (torus mesh with fade-in animation)
  - Clicking ground while a robot is selected issues a move command
  - Robot physically moves from old position to clicked position
  - Unit position (ECS Position trait) changes after issuing move command
  - Path follows passable tiles (does not walk through walls)
  - Move marker appears at click destination
  - Second click on a different robot deselects the first
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing (1) selected robot with selection ring, (2) robot at a different position after movement

### Task 2.3: Combat produces visual feedback

- **Priority**: P1
- **Files**:
  - `src/systems/combat.ts` (verify combat detection, damage application, combat event emission)
  - `src/game/EntityRenderer.ts` (verify `showDamageFlash` triggers on combat events via `getLastCombatEvents`)
  - `src/ecs/traits.ts` (verify UnitComponents stores per-component damage state)
  - `src/ecs/types.ts` (verify `UnitComponent.functional` flag for component damage)
  - `src/components/game/SelectionInfo.tsx` (display component damage state in UI)
- **Description**: When player unit and enemy are within combat range, the combat system should fire damage events. Verify: combat range detection works, damage is applied to specific components (not HP), `getLastCombatEvents()` returns events that `syncEntities` reads, `showDamageFlash` tints enemy meshes red for 150ms. Component damage should reduce functionality (broken camera = reduced vision range, broken legs = speed=0, broken arms = cannot repair).
- **Completion criteria**:
  - Combat system detects units in range and fires combat events
  - `showDamageFlash` triggers visible red tint on damaged entity meshes
  - Component damage reduces the component's `functional` flag to false
  - Broken camera: unit cannot explore (vision range = 0)
  - Broken legs: unit speed = 0 (cannot move)
  - Broken arms: unit cannot repair or scavenge
  - SelectionInfo panel shows component status (functional/broken) for selected unit
  - Combat events visible in combat log or debug overlay
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing a unit near an enemy with a red damage flash visible on the target mesh

---

## Phase 3: The Base Building Loop

**Depends on**: Phase 2 complete (units visible, selectable, movable).

### Task 3.1: Found base -> production -> units

- **Priority**: P1
- **Files**:
  - `src/systems/baseManagement.ts` (verify `foundBase`, production queue processing, unit spawning from queue)
  - `src/components/base/BasePanel.tsx` (wire UI to base management system: show queue, add items, display progress)
  - `src/components/game/ActionPanel.tsx` (add FOUND BASE button when conditions met)
  - `src/game/BaseMarker.ts` (verify base marker mesh appears at founded location)
  - `src/ecs/traits.ts` (verify Base trait fields: productionQueueJson, storageJson)
  - `src/config/buildingDefs.ts` (verify building definitions for producible unit types)
- **Description**: Wire the base building loop: FOUND BASE button in ActionPanel -> `foundBase()` creates Base entity at position -> BasePanel slides in from right showing production queue -> player adds items to production queue -> `baseManagement` system processes queue over time -> new Unit entity spawns when production completes. The systems exist in `baseManagement.ts` but are not wired to the UI. Focus on connecting existing logic to the React DOM overlay panels.
- **Completion criteria**:
  - ActionPanel shows FOUND BASE button when a unit is selected and standing on valid terrain
  - Clicking FOUND BASE creates a Base entity at the selected unit's position
  - Base marker mesh (from BaseMarker.ts) appears at founded location
  - BasePanel slides in showing the base name, power status, and production queue
  - Player can add production items to the queue via BasePanel UI
  - After N simulation ticks, a new Unit entity spawns at the base position
  - New unit is visible as a robot GLB mesh at the base
  - Production queue decreases as items are completed
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing (1) FOUND BASE button, (2) base marker on terrain, (3) BasePanel with production queue

### Task 3.2: Lightning rods and power

- **Priority**: P1
- **Files**:
  - `src/systems/power.ts` (verify power generation from lightning rods, power demand calculation, surplus/deficit)
  - `src/ecs/traits.ts` (verify LightningRod trait: rodCapacity, currentOutput, protectionRadius)
  - `src/components/game/TopBar.tsx` (display PWR: generation vs demand)
  - `src/systems/fabrication.ts` (verify fabrication units require power to operate)
  - `src/systems/baseManagement.ts` (verify bases require power for production)
  - `docs/technical/CORE_FORMULAS.md` (reference for storm power math)
- **Description**: Lightning rods generate power from the storm. Power supplies fabrication units and bases. Power deficit = things stop working (fabrication halts, production pauses). Wire: rod entities generate `currentOutput` power -> total power computed across all rods -> base/fabrication units consume power -> TopBar shows PWR surplus/deficit number. Storm intensity varies (from CORE_FORMULAS.md) affecting rod output.
- **Completion criteria**:
  - TopBar shows PWR value with generation and demand (e.g., "PWR: +7/-3")
  - Lightning rods generate power based on rodCapacity and storm intensity
  - Fabrication units require power to be operational (powered=true)
  - Bases require power for production queue processing
  - Removing (or destroying) a lightning rod reduces total power generation
  - Power deficit causes fabrication units to go offline (operational=false)
  - Power deficit causes base production to pause
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing TopBar with PWR display

### Task 3.3: Repair workflow

- **Priority**: P1
- **Files**:
  - `src/systems/repair.ts` (verify repair logic: select damaged unit, choose component, spend resources, repair)
  - `src/components/game/SelectionInfo.tsx` (show per-component status with REPAIR button for broken ones)
  - `src/components/game/ActionPanel.tsx` (add REPAIR action when conditions met)
  - `src/ecs/traits.ts` (Inventory trait for resource consumption)
  - `src/ecs/types.ts` (UnitComponent type -- functional field toggled by repair)
- **Description**: Damaged components can be repaired using fabricated parts from inventory. Wire: select damaged unit -> SelectionInfo shows components with status -> click REPAIR on broken component -> repair system checks inventory for required materials -> spends resources -> sets `component.functional = true`. The repair system exists -- wire it to the UI panels. A unit with working arms near a damaged unit can perform repair (proximity check).
- **Completion criteria**:
  - SelectionInfo shows per-component status (green=functional, red=broken)
  - Broken components show REPAIR button when repairer unit is nearby and has materials
  - Clicking REPAIR deducts required materials from inventory
  - Broken component transitions from functional=false to functional=true
  - Unit capabilities are restored (e.g., repaired legs restore movement speed)
  - If materials insufficient, REPAIR button is disabled with tooltip
  - Damaged component goes from broken to functional after repair action
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing SelectionInfo with component status and REPAIR button

---

## Phase 4: The Enemy Threat

**Depends on**: Phase 3 complete (base building functional, power system works).

### Task 4.1: Cult escalation

- **Priority**: P1
- **Files**:
  - `src/systems/cultEscalation.ts` (verify escalation timer, enemy wave generation, proximity-to-base triggering)
  - `src/systems/enemies.ts` (verify enemy spawning at chunk boundaries or far corridors)
  - `src/ecs/factory.ts` (verify `spawnCultUnit` with correct mech types per escalation tier)
  - `src/config/cultDefs.ts` (verify cult mech definitions: scout, patrol, war party tiers)
- **Description**: Over time, cult presence increases through an escalation system. Tiers: wandering scouts (early) -> patrol pairs (mid) -> war parties (late) -> base raids (endgame). The cult escalation system exists in `cultEscalation.ts` -- verify it produces visible enemies that spawn at appropriate distances and approach the player base. Escalation should accelerate if the player expands aggressively and slow if the player turtles (but never stop).
- **Completion criteria**:
  - After 500 simulation ticks, enemy count in the world has increased from initial state
  - Enemies spawn at appropriate distances based on escalation tier
  - Early enemies (scouts) spawn at moderate distances, later enemies (war parties) spawn closer
  - Enemy entities have correct Faction("cultist") and appropriate mech types
  - Enemies are visible as tinted-red robot meshes (from EntityRenderer faction coloring)
  - Enemies near player base trigger "raid" behavior
  - Escalation timer is visible in debug overlay
- **Verification**: `command` -- `pnpm tsc && pnpm test`

### Task 4.2: Cult AI behavior

- **Priority**: P1
- **Files**:
  - `src/ai/cultBehavior.ts` (verify Yuka GOAP agent: PatrolGoal, AggroGoal, EscalateGoal evaluation)
  - `src/systems/enemies.ts` (verify enemy movement system ticks AI agents)
  - `src/systems/movement.ts` (verify cult units use same movement system as player units)
  - `src/systems/pathfinding.ts` (verify cult units can compute paths through labyrinth)
- **Description**: CultAgent (Yuka GOAP) decides: patrol corridors, aggro chase nearby player units, escalate toward player base. Verify agents actually make decisions and move through the labyrinth. Currently enemies may be static because the AI tick is not running or pathfinding fails for cult units. Debug: (1) AI agents are created per cult entity, (2) Think brain evaluates goals each tick, (3) selected goal produces a movement target, (4) pathfinding computes path, (5) movement system moves the unit.
- **Completion criteria**:
  - Cult units change position over time (not static)
  - Patrol behavior: cult units wander corridors within their chunk region
  - Aggro behavior: cult units chase player units that enter detection range
  - Cult units navigate around walls (use pathfinding, not straight-line)
  - At least 2 distinct AI behaviors are observable (patrol vs aggro)
  - Enemy units visible on minimap
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing enemy unit at a different position than initial spawn (proves movement)

### Task 4.3: Hacking

- **Priority**: P2
- **Files**:
  - `src/systems/hacking.ts` (verify hack initiation, progress tracking, faction conversion)
  - `src/ecs/traits.ts` (HackTarget, Hacking traits -- progress 0..1, entity references)
  - `src/components/game/ActionPanel.tsx` (add HACK button when near hackable enemy)
  - `src/components/game/SelectionInfo.tsx` (show hack progress bar on target)
- **Description**: When near a hackable enemy, player can attempt to convert it. The hacking system in `hacking.ts` should: detect proximity to enemy, show HACK button in ActionPanel, initiate hack (sets Hacking/HackTarget traits), progress over time (per simulation tick), on completion change Faction from "cultist" to "player". Hacking can be interrupted by combat or distance.
- **Completion criteria**:
  - HACK button appears in ActionPanel when player unit is near a cult unit
  - Clicking HACK sets Hacking trait on player unit and HackTarget on enemy
  - Hack progress increases per simulation tick (visible in UI)
  - When progress reaches 1.0, enemy faction changes from "cultist" to "player"
  - Hacked unit is now player-controlled (selectable, movable)
  - Hacked unit's mesh tint changes from red to default
  - Hack interrupted if player unit moves away or enters combat
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing HACK progress bar on an enemy unit

---

## Phase 5: Story Discovery

**Depends on**: Phase 2 complete (units can explore), Phase 1 complete (board generates world).

### Task 5.1: Dialogue system for world exploration

- **Priority**: P2
- **Files**:
  - `src/views/game/NarrativeOverlay.tsx` (adapt existing component for in-game story triggers, not just phase transitions)
  - `src/config/narrativeDefs.ts` (add world exploration dialogue sequences: observatory, cult encounters, etc.)
  - `src/views/game/GameLayout.tsx` (conditionally render NarrativeOverlay when story trigger fires)
  - `src/ecs/traits.ts` (add StoryTrigger trait or similar for marking entities as story points)
  - `src/systems/exploration.ts` (detect when player unit enters a story trigger area)
- **Description**: When the player encounters a story trigger (special room, cult figure, observatory), a dialogue overlay appears. NarrativeOverlay already exists with typewriter text, speaker labels, and mood coloring. Adapt it to work as an in-game overlay (not full-screen black) triggered by world exploration. Create story trigger entities that the board generates in special rooms. When a player unit enters the trigger radius, fire the dialogue sequence.
- **Completion criteria**:
  - StoryTrigger trait or marker exists in ECS
  - Board generates story trigger entities in chunks at specific distances/directions
  - When player unit moves within trigger radius, NarrativeOverlay appears
  - Dialogue plays with typewriter effect, speaker labels, mood coloring
  - Player can advance dialogue with click/space or skip entirely
  - Game pauses during dialogue (speed=0)
  - After dialogue completes, game resumes and trigger is consumed (does not re-fire)
  - At least 3 story sequences exist: awakening reflection, first cult encounter, observatory discovery
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing NarrativeOverlay triggered during gameplay

### Task 5.2: Story triggers in chunks

- **Priority**: P2
- **Files**:
  - `src/board/chunks.ts` (add story trigger spawns to `generateChunk` entity spawn list)
  - `src/config/narrativeDefs.ts` (map story trigger IDs to dialogue sequences)
  - `src/board/types.ts` (extend EntitySpawn type for story triggers)
- **Description**: Board generates story trigger rooms at specific distances and directions from spawn. Each trigger has associated dialogue content defined in narrativeDefs.ts. Story triggers should follow the geographic narrative spine from GAME_IDENTITY.md: observatory to the southwest, cult encounters to the north, etc. Use directional bias + distance to place triggers deterministically.
- **Completion criteria**:
  - Story trigger entity spawns appear in chunk generation at specific distances
  - Triggers are deterministic (same seed = same trigger placement)
  - Observatory trigger at distance ~15-20 chunks, southwest bias
  - Cult encounter triggers at distance ~10-15 chunks, north bias
  - Awakening trigger at distance ~5 chunks, any direction
  - Each trigger maps to a valid DialogueSequence in narrativeDefs
  - Exploring far enough from spawn eventually hits a story trigger
- **Verification**: `command` -- `pnpm tsc && pnpm test`

---

## Phase 6: Polish

**Depends on**: Phases 1-4 complete (core gameplay functional).

### Task 6.1: Fog of war on minimap

- **Priority**: P2
- **Files**:
  - `src/components/game/Minimap.tsx` (render only explored areas, unexplored = dark)
  - `src/game/FogOfWar.ts` (verify fog grid tracks explored chunks/tiles)
  - `src/systems/exploration.ts` (verify exploration system reveals fog as units move)
- **Description**: The minimap should only show explored areas. Unexplored regions are dark. As player units move through the labyrinth, fog is revealed in their vision radius. The FogOfWar module exists -- verify it tracks explored state and wire it to the Minimap component's rendering.
- **Completion criteria**:
  - Minimap shows dark/black for unexplored areas
  - Explored areas show terrain layout on minimap
  - Unit movement reveals fog in a radius around the unit
  - Fog state persists (re-explored areas stay revealed)
  - Enemy units only visible on minimap in explored areas
  - Fog updates are performant (no frame drops)
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing minimap with fog of war (dark and revealed areas)

### Task 6.2: Storm/power math

- **Priority**: P2
- **Files**:
  - `src/systems/power.ts` (cap storm values, meaningful display range)
  - `src/components/game/TopBar.tsx` (clear surplus/deficit display)
  - `docs/technical/CORE_FORMULAS.md` (reference)
- **Description**: Cap storm intensity display at a meaningful range. Power display shows surplus/deficit clearly with color coding (green=surplus, red=deficit). Storm intensity should vary over time following a noise function, affecting lightning rod output.
- **Completion criteria**:
  - Storm intensity capped at a meaningful range (0-100 or 0.0-1.0)
  - TopBar PWR display uses color: green for surplus, red for deficit
  - Storm intensity varies over time (not constant)
  - Power values are numerically reasonable (not NaN, Infinity, or absurdly large)
  - Power balance updates per simulation tick
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing TopBar with clear power display

### Task 6.3: Audio integration

- **Priority**: P3
- **Files**:
  - `src/audio/ambience.ts` (storm ambience: brown noise + periodic thunder)
  - `src/audio/music.ts` (epoch-based procedural synth music)
  - `src/audio/sfx.ts` (unit select, move, combat, discovery SFX)
  - `src/audio/audioEngine.ts` (verify Tone.js context starts on user interaction)
  - `src/views/game/GameLayout.tsx` (trigger audio start on gameplay entry)
- **Description**: All audio layers should play at correct times. Storm ambience loops during gameplay. Epoch music changes with game phase. SFX triggers on unit selection, movement commands, combat hits, and story discoveries. Tone.js requires user interaction to start AudioContext -- ensure first click/tap initializes it.
- **Completion criteria**:
  - Storm ambience plays continuously during gameplay (brown noise + thunder)
  - Epoch music plays procedural synth appropriate to current game phase
  - SFX plays on: unit select, move command, combat hit, resource pickup
  - Audio starts cleanly on first user interaction (no "AudioContext not allowed" errors)
  - Audio can be muted/unmuted via UI control
  - No audio glitches or overlapping sounds
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome DevTools MCP confirm no console errors related to Tone.js/AudioContext

### Task 6.4: Save/Load

- **Priority**: P2
- **Files**:
  - `src/db/serialize.ts` (full ECS world serialization to/from SQLite-compatible format)
  - `src/db/persistence.ts` (save/load orchestration)
  - `src/db/webAdapter.ts` (sql.js web adapter for browser)
  - `src/db/schema.ts` (SQLite schema for game state + chunk deltas)
  - `src/db/migrations.ts` (schema version management)
  - `src/components/game/TopBar.tsx` or new SaveLoadModal (UI for save/load)
- **Description**: Full ECS state serialization + chunk delta storage. Save: serialize all Koota entities (Position, Unit, Base, etc.) + game config (seed, tick count, speed) to SQLite via sql.js (web) or Capacitor SQLite (native). Load: clear world, restore entities from SQLite, regenerate terrain from seed, apply chunk deltas. Only player modifications to chunks need saving -- terrain is regenerated from seed.
- **Completion criteria**:
  - SAVE button in UI saves complete game state to SQLite
  - LOAD button restores game state from SQLite
  - After load: all units, bases, buildings in correct positions
  - After load: game config (seed, difficulty, tick count) preserved
  - After load: chunk terrain regenerated from seed (not stored)
  - Player modifications to chunks (built structures) stored as deltas
  - Save/load works in browser via sql.js
  - Multiple save slots supported (at least 3)
  - Corrupt save file does not crash game (error handling)
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome screenshot showing save/load UI

### Task 6.5: Mobile layout

- **Priority**: P3
- **Files**:
  - `src/views/game/GameLayout.tsx` (responsive layout: sidebar -> bottom panel on narrow viewport)
  - `src/components/game/Sidebar.tsx` (adapt for bottom-of-screen on mobile)
  - `src/components/game/TopBar.tsx` (compact layout for small screens)
  - `src/components/game/ActionPanel.tsx` (touch-friendly button sizes)
  - `tailwind.config.ts` or CSS (responsive breakpoints)
- **Description**: On narrow viewports (< 768px), the sidebar should collapse to a bottom panel. TopBar should use compact layout. Action buttons should be touch-friendly (min 44x44px touch targets). Minimap should be toggleable (not always visible on mobile). The 2.5D camera with pan/zoom already supports touch (pinchPrecision set in GameCanvas).
- **Completion criteria**:
  - Below 768px viewport width, sidebar moves to bottom of screen
  - TopBar uses compact layout on mobile (abbreviated labels)
  - All interactive elements are at least 44x44px touch targets
  - Minimap is toggleable on mobile (hidden by default)
  - Game is playable with touch-only input (no keyboard required)
  - Layout does not break at common mobile resolutions (375px, 390px, 414px width)
- **Verification**: `command` -- `pnpm tsc && pnpm test`
- **Visual verification**: Chrome DevTools mobile emulation screenshot (iPhone 14 Pro viewport)

---

## Execution Order

```
Phase 1 (sequential -- each task builds on the previous):
  1.1 Fix chunk loading
  1.2 Board generates entities (depends on 1.1)
  1.3 Difficulty gradient (depends on 1.2)
  1.4 Strip initializeWorld (depends on 1.2)

Phase 2 (sequential):
  2.1 Fix robot GLB visibility (depends on 1.1)
  2.2 Selection and movement (depends on 2.1)
  2.3 Combat visual feedback (depends on 2.2)

Phase 3 (sequential):
  3.1 Found base -> production (depends on 2.2)
  3.2 Lightning rods and power (depends on 3.1)
  3.3 Repair workflow (depends on 2.3)

Phase 4 (sequential):
  4.1 Cult escalation (depends on 1.2, 1.3)
  4.2 Cult AI behavior (depends on 4.1)
  4.3 Hacking (depends on 4.2, 2.2)

Phase 5 (can run in parallel with Phase 4):
  5.1 Dialogue system (depends on 2.2)
  5.2 Story triggers in chunks (depends on 1.2, 5.1)

Phase 6 (independent tasks, can run in parallel):
  6.1 Fog of war minimap (depends on 1.1)
  6.2 Storm/power math (depends on 3.2)
  6.3 Audio integration (depends on Phase 1)
  6.4 Save/Load (depends on Phase 3)
  6.5 Mobile layout (depends on Phase 3)
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| GLB models have wrong scale/normals causing invisibility | Test with a simple box mesh first; if GLBs fail, use placeholder geometry until model pipeline is fixed |
| Chunk generation performance degrades with entity spawns | Profile `generateChunk` cost; use web workers for off-main-thread generation if >16ms |
| Pathfinding fails across chunk boundaries | WorldNavGraph must merge chunk NavGraphs; test cross-chunk paths explicitly |
| WebGPU not available in test browser | Vitest browser tests use headed Chrome which supports WebGPU; ensure Chrome flags enabled |
| Yuka GOAP produces infinite loops or no decisions | Add timeout/fallback to cult AI: if no goal selected in N ticks, default to patrol |
| sql.js WASM loading fails on mobile | Use async import with fallback error screen; test on actual mobile devices |
| Tone.js AudioContext blocked by browser policy | Defer audio init to first user click; add "click to enable audio" prompt |

## Technical Notes

- `TILE_SIZE_M = 2.0` -- all world positions in meters, tiles are 2m x 2m
- `CHUNK_SIZE = 32` -- 32x32 tiles per chunk = 64m x 64m world space per chunk
- `VIEW_RADIUS = 3` -- 7x7 grid = 49 chunks loaded at once
- Camera: ArcRotateCamera, alpha=-90deg, beta=25deg, radius=60
- Fog: exponential (mode=2), density varies by epoch
- Entity renderer syncs ECS to BabylonJS meshes every frame via `scene.registerBeforeRender`
- Simulation ticks at fixed 1.0s game-time intervals (accumulated, not real-time)
- Koota entities are numeric IDs; use EntityId trait for stable string references
