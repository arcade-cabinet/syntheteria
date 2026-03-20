# Visual + Gameplay Completion Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transform the current flat-rectangle-with-hacks board into a proper CivRev2-style curved ecumenopolis with dense terrain, proper lighting, complete gameplay loops, and polished UX.

**Architecture:** Baked cylindrical geometry, 7-layer rendering pipeline, ECS-driven model paths, terrain-affinity faction spawning, comprehensive save/load, all game config wired.

---

## Chunk 1: Board Geometry — Curved Surface, Not Flat Rectangle

The board must BE curved, not fake it with a shader. Zooming out must show a globe-like surface, not a rectangle.

### Task 1.1: Bake cylindrical curvature into boardGeometry.ts
**Files:** `src/rendering/boardGeometry.ts`
- [ ] Replace `verts[vi++] = 0` (flat Y) with baked cylindrical curvature: `curveY = cos(offX/R)*R-R + cos(offZ/R)*R-R`
- [ ] Use `CURVE_STRENGTH = 0.0008`, `R = 625`
- [ ] Board center computed from `width/2 * TILE_SIZE_M`
- [ ] Run vitest, verify no test failures

### Task 1.2: Remove shader curvature (now baked)
**Files:** `src/rendering/glsl/heightVert.glsl`, `src/ecs/terrain/glsl/floorVert.glsl`, `src/rendering/glsl/fogOfWarVert.glsl`
- [ ] Remove all `cos(angle)*R-R` curvature math from all 3 vertex shaders
- [ ] Keep `worldPos.y += elevation` (tile height) — that's NOT curvature
- [ ] Keep uniforms (uBoardCenter, uCurve) in case we need them, but don't use for Y displacement
- [ ] Run tsc + vitest

### Task 1.3: Cap MAX_ZOOM so edges are never visible
**Files:** `src/camera/IsometricCamera.tsx`
- [ ] Change `MAX_ZOOM = 180` to `MAX_ZOOM = 100`
- [ ] At zoom 100 with fog density 0.018, the ghost tile boundary is fogged out
- [ ] Run vitest

### Task 1.4: Increase GHOST to 40 tiles
**Files:** `src/rendering/boardGeometry.ts`
- [ ] `GHOST = 30` → `GHOST = 40`
- [ ] More visual buffer for the curved edge to roll under

### Task 1.5: Verify — take screenshot at max zoom, no rectangle visible
- [ ] Navigate to game, zoom all the way out, screenshot
- [ ] Verify: curved surface visible, no flat edges, fog hides boundaries

---

## Chunk 2: Lighting — Perpetual Harsh Industrial Daylight

The dome blocks all natural light. The artificial sun at zenith creates fluorescent warehouse lighting.

### Task 2.1: Scene lighting — bright industrial
**Files:** `src/ui/game/GameScreen.tsx`
- [ ] Ambient: intensity 2.0, color `#d8e0f0` (bright cool white)
- [ ] Hemisphere: intensity 1.5, sky `#e0eaf8`, ground `#506070`
- [ ] Directional: intensity 5.0 at `[0, 100, 0]` (direct zenith), color `#f0f4ff` (near-white)
- [ ] Fog color: `#1a2030` (dark blue-grey, not near-black)
- [ ] Scene background: `#0e1420`

### Task 2.2: Biome pattern colors — twice as bright
**Files:** `src/ecs/terrain/glsl/patterns/*.glsl`
- [ ] Durasteel base: `vec3(0.55, 0.60, 0.68)` — light steel grey
- [ ] Transit deck base: `vec3(0.62, 0.58, 0.54)` — warm light concrete
- [ ] Structural mass base: `vec3(0.68, 0.72, 0.78)` — bright steel (impassable = bright)
- [ ] Collapsed zone base: `vec3(0.50, 0.46, 0.40)` — tan rubble
- [ ] Dust district base: `vec3(0.58, 0.56, 0.50)` — light ash
- [ ] Bio district base: `vec3(0.38, 0.50, 0.30)` — olive green
- [ ] Aerostructure base: `vec3(0.54, 0.46, 0.40)` — warm rust
- [ ] Abyssal grating: keep darker (`vec3(0.12, 0.15, 0.22)`) — it's a void

### Task 2.3: Height layer base color
**Files:** `src/rendering/glsl/heightFrag.glsl`
- [ ] Base: `vec3(0.35, 0.38, 0.42)` — medium grey (visible even where biome layer is thin)
- [ ] Ambient floor: 0.6 (from 0.55)

### Task 2.4: GLSL common.glsl lighting
**Files:** `src/ecs/terrain/glsl/common.glsl`
- [ ] Ambient multiplier: 1.0 (from 0.8)
- [ ] Sun multiplier: 2.5 (from 2.0)

---

## Chunk 3: Density — The Ecumenopolis Must Feel DENSE

A planet-wide machine city should have structures EVERYWHERE, not sparse props on empty terrain.

### Task 3.1: Double salvage scatter rates
**Files:** `src/ecs/systems/salvagePlacement.ts`
- [ ] structural_mass: 0.12→0.30
- [ ] collapsed_zone: 0.10→0.25
- [ ] transit_deck: 0.06→0.18
- [ ] durasteel_span: 0.05→0.15
- [ ] dust_district: 0.08→0.22
- [ ] bio_district: 0.04→0.12
- [ ] aerostructure: 0.06→0.18
- [ ] abyssal_platform: 0.03→0.10

### Task 3.2: Larger structural_mass clusters
**Files:** `src/ecs/terrain/cluster.ts`
- [ ] Widen the structural geography threshold range so structural_mass forms contiguous blobs of 5-15 tiles
- [ ] Currently `STRUCTURAL_T = 0.725` with tight smoothstep — widen to create bigger clusters
- [ ] Verify with generator test that average structural cluster size > 5 tiles

### Task 3.3: More bridge/elevated tiles
**Files:** `src/board/generator.ts`
- [ ] Increase probability of elevation=1 (bridge) tiles at structural_mass cluster edges
- [ ] Bridges should connect adjacent structural clusters across passable terrain
- [ ] Target: 5-8% of tiles are bridges (currently ~1-2%)

### Task 3.4: Verify density
- [ ] Count salvage entities after init: should be 15-25% of passable tiles
- [ ] Count structural_mass tiles: should be 20-30% of board
- [ ] Screenshot: board should look DENSE, like a ruined industrial landscape

---

## Chunk 4: Model Path Cleanup — ECS-Driven, Not Hardcoded

### Task 4.1: Wire model paths from ECS definitions
**Files:** `src/rendering/SalvageRenderer.tsx`, `src/rendering/BuildingRenderer.tsx`, `src/rendering/UnitRenderer.tsx`
- [ ] Remove hardcoded MODEL_PATH_MAP from all 3 renderers
- [ ] SalvageRenderer: read `assetPath` from SALVAGE_DEFS → models array → look up in model_catalog.json OR use a shared `resolveModelUrl(modelId)` function
- [ ] BuildingRenderer: read `assetPath` from BUILDING_DEFS
- [ ] UnitRenderer: read model path from robot archetype definitions
- [ ] Create `src/rendering/modelPaths.ts` — single source of truth for all model ID → URL resolution
- [ ] Validate all paths against actual files on disk (case-sensitive check)

### Task 4.2: Batch-validate all GLB paths at startup
**Files:** `src/rendering/modelPaths.ts`
- [ ] On dev mode: fetch HEAD request for every model URL at startup
- [ ] Log warnings for any 404s
- [ ] Fatal error if critical models (robots, starter buildings) are missing

---

## Chunk 5: Fog of War — Complete Implementation

### Task 5.1: Models gated by explored status (all renderers)
**Files:** All renderers
- [ ] SalvageRenderer: skip unexplored tiles ✅ (done)
- [ ] BuildingRenderer: skip unexplored tiles ✅ (done)
- [ ] UnitRenderer: skip enemy units on unexplored tiles ✅ (done)
- [ ] ProceduralStructureRenderer: walls/columns should also be hidden on unexplored tiles
- [ ] DepthRenderer: bridges should be hidden on unexplored tiles

### Task 5.2: Fog updates reactively on exploration
**Files:** `src/rendering/FogOfWarRenderer.tsx`
- [ ] Currently polls every 200ms — switch to event-driven: update when revealFog is called
- [ ] Export a `markFogDirty()` function that the reveal system calls
- [ ] FogOfWarRenderer checks the dirty flag each frame and rebuilds DataTexture only when needed

### Task 5.3: Initial reveal includes faction starter area
- [ ] ✅ Already done in init.ts — revealFog called for each player unit

---

## Chunk 6: Game Config Wiring

### Task 6.1: Climate profiles affect terrain generation
**Files:** `src/board/generator.ts`, `src/ecs/terrain/cluster.ts`
- [ ] Temperate: waterLevel=0.35 (default), balanced terrain distribution
- [ ] Wet: waterLevel=0.55 → more abyssal_platform, wider geography bands
- [ ] Arid: waterLevel=0.15 → less abyssal, more dust_district and collapsed_zone
- [ ] Frozen: waterLevel=0.45, shift bio_district→dust_district, add ice tint to patterns

### Task 6.2: Storm profiles affect cultist behavior
**Files:** `src/ecs/systems/cultistSystem.ts`
- [ ] Stable: BASE_SPAWN_INTERVAL=7, MAX_WAVE_SIZE=2 (calmer)
- [ ] Volatile: default values (current)
- [ ] Cataclysmic: BASE_SPAWN_INTERVAL=3, MAX_WAVE_SIZE=6, MAX_TOTAL_CULTISTS=20

### Task 6.3: Difficulty affects resource scarcity and AI aggression
**Files:** `src/ecs/factions/init.ts`, `src/ecs/systems/aiTurnSystem.ts`
- [ ] Story: player starts with 2x resources, AI aggression halved
- [ ] Standard: default
- [ ] Hard: player starts with 0.5x resources, AI aggression doubled, faster cultist escalation

### Task 6.4: Pass config to systems
**Files:** `src/main.tsx`, `src/ecs/init.ts`
- [ ] NewGameConfig already has climate, storm, difficulty fields
- [ ] Pass them through to board generator, cultist system, faction init
- [ ] Store in Board trait so systems can read them

---

## Chunk 7: Title Screen Polish

### Task 7.1: Cigar band text — responsive to all aspect ratios
**Files:** `src/ui/landing/title/TitleMenuScene.tsx`
- [ ] Per-character arc wrapping at radius 3.0 (above globe r=2.5)
- [ ] `rotation=[0, angle, 0]` faces outward
- [ ] `depthTest=false`, `renderOrder=10`, `meshBasicMaterial` with `toneMapped=false`
- [ ] `onSync` on first character gates visibility until font loads
- [ ] Test on: desktop, OnePlus Open unfolded, iPhone SE

### Task 7.2: Globe lattice growth animation
- [ ] The globe shader has a `uGrowth` uniform (0→1) that spreads lattice from continents
- [ ] Animate it from 0 to 0.8 over 5 seconds on mount
- [ ] Creates the visual narrative: "the machine world consumes the planet"

---

## Chunk 8: Gameplay Polish

### Task 8.1: Tooltip/info panel on hover
**Files:** `src/ui/game/InfoPanel.tsx` (new)
- [ ] Hover a tile: show terrain type, passability, resource deposit if any
- [ ] Hover a unit: show name, HP, AP, faction, current action
- [ ] Hover a building: show type, powered status, HP, current production
- [ ] Use drei `<Html>` or a fixed-position DOM overlay tracking pointer

### Task 8.2: Minimap
**Files:** `src/ui/game/Minimap.tsx` (new)
- [ ] Small 150x150px overlay in bottom-left corner
- [ ] Renders fog of war + explored terrain as colored pixels
- [ ] Player units as bright dots, enemy units as red dots
- [ ] Click on minimap to pan camera

### Task 8.3: Turn log
**Files:** `src/ui/game/TurnLog.tsx` (new)
- [ ] Small scrollable log showing turn events: "Cultist spawned at breach zone", "Turret destroyed enemy", "Harvest complete: +3 ferrous_scrap"
- [ ] Driven by an event system: `pushTurnEvent(msg)`

### Task 8.4: Building construction progress
**Files:** `src/ui/game/HUD.tsx`
- [ ] Show active fabrication queue: "Motor Pool: Scout Bot (2 turns)"
- [ ] Show active synthesis queue: "Synthesizer: Alloy Fusion (1 turn)"

---

## Chunk 9: Audio + Ambient

### Task 9.1: Wire SFX to remaining actions
- [ ] Build placement: ✅ done
- [ ] Fabrication start: playSfx("build_complete") when queued
- [ ] Synthesis start: playSfx("harvest_complete") when queued
- [ ] Turret fires: playSfx("attack_hit") from turretSystem
- [ ] Victory/defeat: ✅ done

### Task 9.2: Ambient storm soundscape
**Files:** `src/audio/ambience.ts` (new)
- [ ] Low rumble loop using Tone.js Noise + filter
- [ ] Subtle wind/storm atmosphere
- [ ] Volume tied to ambient channel from audioEngine

---

## Chunk 10: Testing + CI

### Task 10.1: E2E game flow test
- [ ] ✅ Done — `tests/e2e/full-game-flow.spec.ts`

### Task 10.2: Screenshot visual QA test
- [ ] ✅ Done — `tests/e2e/screenshot-visual-qa.spec.ts`

### Task 10.3: CI pipeline
**Files:** `.github/workflows/ci.yml`
- [ ] Run `pnpm test:vitest` on push
- [ ] Run `pnpm tsc --noEmit` on push
- [ ] Run `pnpm biome check` on push
- [ ] Playwright E2E on schedule (nightly)

### Task 10.4: Test coverage for all new systems
- [ ] powerSystem ✅
- [ ] turretSystem ✅
- [ ] signalSystem ✅
- [ ] repairSystem ✅
- [ ] fabricationSystem ✅
- [ ] synthesisSystem ✅
- [ ] victorySystem ✅
- [ ] buildSystem ✅
- [ ] cultistSystem cult structures ✅
- [ ] fogRevealSystem ✅
- [ ] persistence serialize ✅
- [ ] Still needed: modelPaths validation test, density verification test, climate/storm/difficulty config tests

---

## Chunk 11: Save/Load Completion

### Task 11.1: Full round-trip persistence
- [ ] ✅ Serialize helpers created (src/db/serialize.ts)
- [ ] ✅ Wired into handleEndTurn + handleLoadGame
- [ ] Still needed: verify Continue Game actually restores unit positions, buildings, fog, resources
- [ ] Add integration test: start game → end 3 turns → reload → verify state matches

### Task 11.2: Auto-save
- [ ] Save automatically every 3 turns (not just on end turn)
- [ ] Save on browser beforeunload event

---

## Chunk 12: Performance

### Task 12.1: Board geometry vertex count
- [ ] With GHOST=40 on a 96x96 board: (96+80)×(96+80) = 176×176 = 30,976 tiles × 16 verts = ~500K vertices
- [ ] This is fine for desktop but may need LOD for mobile
- [ ] Consider reducing SEGS from 3 to 2 for ghost tiles (they don't need smooth height)

### Task 12.2: Model instance count
- [ ] With density increase, could have 500+ salvage props loaded
- [ ] Verify frame rate stays above 30fps on mid-range hardware
- [ ] Consider frustum culling for off-screen salvage groups

---

## Summary: 12 chunks, ~50 tasks

**Critical path:** Chunk 1 (geometry) → Chunk 2 (lighting) → Chunk 3 (density) → Chunk 6 (config wiring)

**Parallel:** Chunk 4 (model paths), Chunk 5 (fog completion), Chunk 7 (title), Chunk 8 (UI polish)

**After gameplay:** Chunk 9 (audio), Chunk 10 (testing), Chunk 11 (save/load), Chunk 12 (performance)
