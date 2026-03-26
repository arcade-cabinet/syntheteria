> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Phase 1: Core RTS Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the procedural labyrinth city as the game environment, replace all primitive geometry with GLB models, make the viewport responsive, and get the real-time game loop running — so you can see robots in a city.

**Architecture:** Extract the 6-phase labyrinth generator from the commit history, adapt it for single-player (one player start room, cult POI rooms, no faction-specific placement), and wire it into Koota as the board data source. Renderers swap from procedural geometry to instanced GLB models for both buildings and robots. The game loop uses `requestAnimationFrame` with a speed multiplier, calling Koota systems each tick.

**Tech Stack:** Koota ECS, R3F 9.5, Three.js 0.183, @react-three/drei (useGLTF, Instances), Vite 8, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

**Depends on:** Phase 0 (Koota port + assets)

---

### Task 1.1: Extract Labyrinth Generator from History

**Source:** `aeef1650^` (parent of removal commit `aeef1650`)

**Files to extract:**
- `src/board/labyrinth.ts` — Core rooms-and-mazes pipeline
- `src/board/labyrinthMaze.ts` — Maze corridor carving
- `src/board/labyrinthFeatures.ts` — Room placement + feature injection
- `src/board/labyrinthConnectivity.ts` — Connectivity validation
- `src/board/labyrinthPlatforms.ts` — Platform/elevation assignment
- `src/board/labyrinthGenerator.ts` — Top-level generator orchestrator
- `src/board/labyrinthAbyssal.ts` — Abyssal structure generation
- `src/board/cityLayout.ts` — City layout helpers
- `src/board/connectivity.ts` — Graph connectivity
- `src/board/depth.ts` — Depth/elevation system

**Test files to extract:**
- `src/board/__tests__/labyrinth.vitest.ts`
- `src/board/__tests__/labyrinthMaze.vitest.ts`
- `src/board/__tests__/labyrinthFeatures.vitest.ts`
- `src/board/__tests__/labyrinthConnectivity.vitest.ts`
- `src/board/__tests__/labyrinthPlatforms.vitest.ts`
- `src/board/__tests__/labyrinthGenerator.vitest.ts`
- `src/board/__tests__/labyrinthAbyssal.vitest.ts`
- `src/board/__tests__/labyrinthDiagnostic.vitest.ts`
- `src/board/__tests__/cityLayout.vitest.ts`
- `src/board/__tests__/connectivity.vitest.ts`
- `src/board/__tests__/depth.vitest.ts`
- `src/board/__tests__/density.vitest.ts`

- [ ] **Step 1: Extract all labyrinth source files from `aeef1650^`**

Use `git show aeef1650^:<path>` for each file listed above. Write each to its original path under `src/board/`.

- [ ] **Step 2: Extract all labyrinth test files from `aeef1650^`**

Same pattern for the test files under `src/board/__tests__/`.

- [ ] **Step 3: Verify extracted files compile in isolation**

Run `pnpm tsc` and note errors — there will be import path issues to fix in the next step.

- [ ] **Step 4: Fix imports to match current project structure**

The extracted files may reference modules that were renamed or moved during the feature branch work. Update import paths to match the post-Phase-0 directory structure (Koota traits in `src/ecs/traits.ts`, world in `src/ecs/world.ts`, types in `src/board/types.ts`).

- [ ] **Step 5: Run labyrinth tests**

```bash
pnpm vitest run src/board/__tests__/labyrinth
```

All labyrinth tests should pass with seeded determinism.

- [ ] **Step 6: Commit**

```text
feat: extract labyrinth generator from aeef1650^ — rooms-and-mazes pipeline restored
```

---

### Task 1.2: Adapt Labyrinth for Single-Player RTS

**Files:**
- Modify: `src/board/labyrinthFeatures.ts`
- Modify: `src/board/labyrinthGenerator.ts`
- Modify: `src/board/labyrinth.ts`

The extracted labyrinth was designed for multi-faction 4X. Adapt it for single-player RTS:

- [ ] **Step 1: Replace faction start room placement with single player start**

The original placed N faction start rooms (one per faction). Change to place exactly ONE player start room, positioned near the center-south of the map.

- [ ] **Step 2: Add cult POI room types**

Replace faction-specific POI rooms with cult-themed rooms: cult shrine, cult workshop, cult antenna. These should be placed in the northern half of the map, increasing in density toward the north edge (the "cult stronghold" direction).

- [ ] **Step 3: Remove faction count from generator config**

The `BoardConfig` (or equivalent) should no longer accept `factionCount`. Replace with a fixed player start + configurable cult density parameter.

- [ ] **Step 4: Ensure seeded determinism still works**

Run existing labyrinth tests. Any test that assumed multi-faction placement will need updating.

- [ ] **Step 5: Write new tests for single-player room placement**

Create `src/board/__tests__/labyrinthSinglePlayer.vitest.ts`:
- Test: exactly one player start room exists
- Test: cult rooms concentrate in northern half
- Test: seeded generation produces identical layouts

- [ ] **Step 6: Verify all board tests pass**

```bash
pnpm vitest run src/board/
```

- [ ] **Step 7: Commit**

```text
feat: adapt labyrinth generator for single-player RTS — one start, cult POI rooms
```

---

### Task 1.3: Wire Labyrinth as Board Data Source

**Files:**
- Modify: `src/ecs/terrain.ts` (or rewrite)
- Modify: `src/ecs/cityLayout.ts` (or replace)
- Modify: `src/ecs/gameState.ts` — world initialization

The current `terrain.ts` and `cityLayout.ts` generate simple tile data. Replace their output with the labyrinth generator's output, feeding tile data into Koota traits.

- [ ] **Step 1: Wire labyrinth generator into world initialization**

In `gameState.ts` (or wherever the world is initialized), call the labyrinth generator with the game seed to produce a `TileData[][]` grid. Spawn Koota entities for each tile using the `Position`, `Fragment`, and `BuildingTrait` traits as appropriate.

- [ ] **Step 2: Remove or replace old terrain/cityLayout generation**

The old `terrain.ts` and `cityLayout.ts` are superseded by the labyrinth pipeline. Either delete them or gut them to delegate to `labyrinthGenerator.ts`.

- [ ] **Step 3: Spawn player units at the player start room**

After board generation, find the player start room and spawn initial player units (maintenance bot + utility drone) at that position using the Koota factory.

- [ ] **Step 4: Verify board generates and entities exist**

Write a quick smoke test or add a `console.log` to confirm: board tiles spawn, player start exists, cult POI rooms exist.

- [ ] **Step 5: Commit**

```text
feat: wire labyrinth generator as Koota board data source
```

---

### Task 1.4: Replace Primitive Unit Geometry with GLB Robot Models

**Files:**
- Modify: `src/rendering/UnitRenderer.tsx`
- Create: `src/config/models.ts` (model path registry)

**Assets (from Phase 0):**
- `public/assets/models/robots/factions/Arachnoid.glb`
- `public/assets/models/robots/factions/Companion-bot.glb`
- `public/assets/models/robots/factions/FieldFighter.glb`
- `public/assets/models/robots/factions/MobileStorageBot.glb`
- `public/assets/models/robots/factions/QuadrupedTank.glb`
- `public/assets/models/robots/factions/ReconBot.glb`

- [ ] **Step 1: Create model path registry**

Create `src/config/models.ts` mapping unit types to GLB paths. Define the 6 player robot types and their GLB file paths. Reference the feature branch file at `cursor/cloud-agent-runbook-review-0483:src/config/models.ts` for the pattern.

- [ ] **Step 2: Rewrite UnitRenderer to use `useGLTF` + Instances**

Replace the current primitive geometry (boxes/spheres) with `useGLTF` loading of GLB models. Use `@react-three/drei`'s `Instances` for performance when many units of the same type exist. Each unit entity queries its `Unit.unitType` to select the correct model.

- [ ] **Step 3: Add unit type mapping from config to GLB path**

The `Unit` trait's `unitType` field maps to a robot archetype. Create a lookup function: `unitType → GLB path`.

- [ ] **Step 4: Preload all robot models**

Call `useGLTF.preload()` for all 6 robot GLBs in the renderer or App initialization to avoid pop-in.

- [ ] **Step 5: Verify robots render as GLB models**

Start the dev server (`pnpm dev`), create a new game. Confirm robot units appear as 3D models, not colored boxes.

- [ ] **Step 6: Commit**

```text
feat: render player robots as GLB models — 6 archetypes via useGLTF
```

---

### Task 1.5: Replace Primitive City Geometry with GLB Building Set Pieces

**Files:**
- Modify: `src/rendering/CityRenderer.tsx`
- Modify: `src/config/models.ts` (add building paths)

**Assets (from Phase 0):**
- `public/assets/models/buildings/*.glb` (25 building GLBs)

- [ ] **Step 1: Add building GLB paths to model registry**

Extend `src/config/models.ts` with building type → GLB path mappings. Map the labyrinth's tile types (e.g., wall, floor, ruin, fabrication_unit, lightning_rod) to appropriate building GLBs from the 25 available.

- [ ] **Step 2: Rewrite CityRenderer to use instanced GLB models**

Replace primitive box geometry with instanced GLB rendering. Group tiles by building type, use `Instances` from drei for each group. Walls render as wall-type buildings, open rooms render as floor plates, special rooms render with their designated building model.

- [ ] **Step 3: Handle tile-to-model rotation and scale**

Each tile has an orientation from the labyrinth generator. Apply appropriate rotation (0/90/180/270) and scale to match the tile grid spacing.

- [ ] **Step 4: Preload all building models**

Call `useGLTF.preload()` for all building GLBs used.

- [ ] **Step 5: Verify city renders with GLB buildings**

Start dev server. Confirm the labyrinth city renders with 3D building models — walls, floors, and special structures visible.

- [ ] **Step 6: Commit**

```text
feat: render city as instanced GLB buildings — 25 building types mapped to labyrinth tiles
```

---

### Task 1.6: Responsive Viewport

**Files:**
- Modify: `src/App.tsx` — Canvas sizing
- Modify: `src/input/TopDownCamera.tsx` — Camera frustum
- Modify: `src/index.css` — Full-bleed layout

- [ ] **Step 1: Make R3F Canvas fill the viewport**

Set the Canvas to `style={{ width: '100vw', height: '100vh' }}` and ensure the parent container has no padding/margin. Update `src/index.css` to set `html, body, #root` to `margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%;`.

- [ ] **Step 2: Update camera to respond to aspect ratio changes**

The `TopDownCamera` should listen to `resize` events and update its frustum / aspect ratio. For orthographic: recalculate left/right/top/bottom. For perspective: update aspect.

- [ ] **Step 3: Test at multiple viewport sizes**

Manually test (or add a Playwright viewport test) at: 1920x1080, 1366x768, 375x812 (mobile portrait), 812x375 (mobile landscape).

- [ ] **Step 4: Verify no clipping or empty space**

The labyrinth city should fill the visible area with no black bars or overflow scrollbars.

- [ ] **Step 5: Commit**

```text
feat: responsive viewport — canvas fills screen at all sizes
```

---

### Task 1.7: Wire Real-Time Game Loop

**Files:**
- Modify: `src/ecs/gameState.ts`
- Modify: `src/App.tsx` — Game phase transitions

**Reference:** Original `gameState.ts` tick orchestrator + feature branch `cursor/cloud-agent-runbook-review-0483:src/config/gameSpeedDefs.ts` for speed multiplier pattern

- [ ] **Step 1: Implement the real-time tick loop**

The game loop runs via `requestAnimationFrame` (or R3F's `useFrame`). Each frame:
1. Calculate `delta * speedMultiplier`
2. Call systems in order: movement → combat → enemies → exploration → resources → fabrication → power → repair → building placement
3. Skip if `speed === 0` (paused)

- [ ] **Step 2: Wire speed controls**

Support 5 speeds: 0x (paused), 0.5x, 1x, 2x, 4x. Store current speed in a Koota singleton trait or a React ref accessible to the game loop.

- [ ] **Step 3: Wire game phase transitions**

`App.tsx` manages phases: Title → Playing. When "New Game" is clicked, generate the labyrinth board, spawn entities, start the game loop.

- [ ] **Step 4: Verify the game loop runs**

Start dev server. Confirm:
- Units spawn at the player start
- The tick loop runs (add a frame counter or debug overlay)
- Pause (0x) stops all system updates
- Speed changes affect simulation rate

- [ ] **Step 5: Commit**

```text
feat: real-time game loop with 5-speed control — tick orchestrator wired to Koota systems
```

---

### Task 1.8: Integration Verification

- [ ] **Step 1: TypeScript clean**

```bash
pnpm tsc
```

Expected: 0 errors

- [ ] **Step 2: Biome clean**

```bash
pnpm lint
```

Expected: 0 errors

- [ ] **Step 3: All tests pass**

```bash
pnpm vitest run
```

Expected: all labyrinth tests + existing tests pass

- [ ] **Step 4: Visual verification**

Start `pnpm dev`. Confirm:
- Labyrinth city renders with GLB building models
- Robot units render as GLB models at the player start
- Viewport fills the screen responsively
- Game loop ticks (debug overlay or console output)
- Pause/resume works

- [ ] **Step 5: Production build**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 6: Commit**

```text
chore: Phase 1 complete — core RTS loop with labyrinth city, GLB models, responsive viewport
```

---

## Phase 1 Completion Criteria

- [ ] Labyrinth generator restored and adapted for single-player (one start room, cult POIs)
- [ ] Labyrinth wired as Koota board data source
- [ ] 6 player robot types render as GLB models
- [ ] 25 building types render as instanced GLBs mapped to labyrinth tiles
- [ ] Viewport fills screen responsively at all sizes
- [ ] Real-time game loop ticks with 5 speed settings (0x/0.5x/1x/2x/4x)
- [ ] All labyrinth tests pass with seeded determinism
- [ ] 0 TypeScript errors, 0 Biome errors
- [ ] Production build succeeds
- [ ] Visual confirmation: you can see a labyrinth city with robot models in it
