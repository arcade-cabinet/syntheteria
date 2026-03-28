# Polish Batch — Every Feature Fully Working & Verified

Every gap from design docs, game systems, rendering, UI, and tests.
Each task verified with Chrome DevTools MCP screenshot before done.

---

## BATCH 1: Canvas & Rendering Foundation

### 1.1 WebGPU canvas renders opaque dark void
Canvas currently composites as transparent. Fix alphaMode on WebGPU context.
**Verify:** canvas corner pixel has alpha=255. Background is dark #03070b, not white/gray.

### 1.2 All chunks load (VIEW_RADIUS=3 = 49 chunks)
ChunkManager should load chunks in all directions from camera. Currently only ~1 cluster renders.
**Verify:** minimap shows large grid of chunks. Canvas shows labyrinth extending in all directions.

### 1.3 Ground plane under chunks
2000x2000 void-colored ground catches gaps between tiles.
**Verify:** no transparent gaps between chunks. Dark void fills all non-chunk space.

### 1.4 Fog fades chunk edges
Exponential fog (mode 2, density 0.015, color #03070b) fades distant geometry.
**Verify:** screenshot shows gradual fade to darkness at loaded chunk edges. No hard boundaries.

### 1.5 All Reactylon JSX elements work OR are imperative
Verify every BabylonJS element used in JSX is registered in Reactylon's inventory.
If not, convert to imperative creation. No "not found in inventory" errors.
**Verify:** zero console errors related to inventory or BabylonJS class registration.

---

## BATCH 2: Entity Rendering & Visibility

### 2.1 Player robot GLBs visible at spawn
3 player units (Bot Alpha, Bot Beta + lightning rod) visible as GLB models at spawn position.
Scale appropriately for 25° camera distance. Environment texture for PBR reflections.
**Verify:** screenshot shows robot models at player start. They're recognizable, not dots.

### 2.2 Enemy cult mechs visible
Cult enemies (Mecha01, MechaGolem, MechaTrooper) visible in northern zone.
**Verify:** enemy models visible when panning north (or on minimap as red dots).

### 2.3 Hub marker (cyan pyramid)
Bright cyan pyramid at player start position. Emissive so it glows in dark lighting.
**Verify:** bright cyan pyramid clearly visible at center of starting area.

### 2.4 Salvage nodes with pulsing glow
ScavengeSite entities rendered as colored meshes with emissive pulse animation.
4 material types (scrap, circuitry, power cells, durasteel).
**Verify:** colored pulsing nodes visible near player start area.

### 2.5 Base markers
Cult bases (red cylinders) pre-placed in northern zone. Player bases (cyan) on founding.
**Verify:** red dots on minimap in north. Clicking FOUND BASE creates cyan marker.

### 2.6 Selection ring on selected unit
Cyan torus appears around selected unit on left-click. Fades in/out.
**Verify:** click robot → cyan ring appears. Click elsewhere → ring disappears.

### 2.7 Move destination marker
Blue ring appears at clicked ground position when moving a selected unit.
**Verify:** select unit → click ground → blue ring appears at destination.

### 2.8 Fog of War visual
Three states: hidden (mesh disabled), shroud (dim), visible (full).
Based on player unit positions with vision radius.
**Verify:** areas near units are bright. Distant areas are dark/hidden.

---

## BATCH 3: Camera & Input

### 3.1 Camera intro animation
On gameplay start: camera zooms from high to 25° beta, centered on player spawn.
**Verify:** first frame shows zoom animation landing on player robots.

### 3.2 Camera tracks selected entity
Clicking a unit smoothly pans camera to center on it.
**Verify:** select unit → camera pans to unit position.

### 3.3 Pan, zoom, box select all work
Right-drag = pan. Scroll = zoom. Left-drag = box selection rectangle.
**Verify:** each interaction produces expected visual result.

### 3.4 Click-to-move + pathfinding
Select unit → click ground → unit navigates via Yuka pathfinding.
Movement system runs per-frame for smooth interpolation.
**Verify:** unit visually moves from A to B over multiple frames.

### 3.5 Click-to-attack
Select player unit → click enemy → unit moves toward enemy. Combat system engages.
**Verify:** player unit approaches enemy. Combat events fire (damage flash visible).

---

## BATCH 4: HUD & UI Fully Wired

### 4.1 TopBar shows live game state
Unit count, enemy count, tick, resources, storm %, power, temperature, speed controls.
All values update as game ticks progress.
**Verify:** tick counter increments. Resource values change. Speed buttons work.

### 4.2 SelectionInfo shows unit details
Selected unit: name, type, mark, faction, component bars (camera/arms/legs/power_cell).
"No Selection" when nothing selected.
**Verify:** click unit → panel shows component bars. Broken components show red.

### 4.3 ActionPanel context-sensitive
ATTACK, FOUND BASE, STANCE buttons when unit selected. Empty when nothing selected.
STANCE cycles: ATK → DEF → HOLD → FLEE.
**Verify:** buttons appear on selection. STANCE label changes on click.

### 4.4 BasePanel slides out on base click
Click base marker on map → BasePanel slides from right. Shows name, production, power, storage.
ESC or X closes it.
**Verify:** click base marker → panel appears. ESC → panel closes.

### 4.5 Minimap accurate
Shows chunk outlines, player units (green), enemies (red), bases (cyan/red), resources (yellow).
Legend visible below.
**Verify:** minimap dots match actual entity positions. Legend text visible.

### 4.6 NarrativeOverlay auto-advance
Typewriter text → 2.5s hold → 500ms fade → next frame. Click skips. SKIP bypasses all.
**Verify:** narration advances automatically without clicking. Skip works.

---

## BATCH 5: Game Systems Verified Working

### 5.1 Combat system produces visible results
When player and enemy units are within range, combat fires.
Component damage applied (not HP). Damage flash on hit entity.
**Verify:** near enemy, combat events appear in governor log. Entity meshes flash red.

### 5.2 Resource system accumulates
Scavenging near ScavengeSites produces resources. Resources show in TopBar.
**Verify:** Fe/Ci/Pw/Du values increase over time when near salvage nodes.

### 5.3 Power system
Lightning rods generate power. Power shows in TopBar as PWR gen/demand.
**Verify:** PWR value shows non-zero generation.

### 5.4 Base production
Bases with infrastructure produce units over time. Production queue visible in BasePanel.
**Verify:** base panel shows production progress bar advancing.

### 5.5 Cult escalation
Cult enemies spawn and increase over time. Enemy count in TopBar rises.
**Verify:** enemy count increases over 100+ ticks.

### 5.6 Exploration system
Moving units reveal fog of war. Fragment merge combines explored areas.
**Verify:** moving a unit reveals new dark areas on minimap.

### 5.7 Hacking system
When near hackable targets, hacking can be initiated.
**Verify:** system exists and runs without errors (verify in governor log).

### 5.8 Human temperature
Global disposition meter (0-100). Shows in TopBar as "HUMAN: FROZEN" etc.
**Verify:** temperature value shown and changes over time.

---

## BATCH 6: Audio & Persistence

### 6.1 Storm ambience plays
Brown noise + periodic thunder on gameplay start.
**Verify:** AudioContext is "running". No Tone.js errors.

### 6.2 Epoch music plays
Pad synth + bass loop matching current epoch.
**Verify:** music audible (manual check or AudioContext node count > 0).

### 6.3 SFX on interactions
Unit select → select sound. Move command → move sound.
**Verify:** playSfx called (check in console or governor log).

### 6.4 Save/Load round-trip
Save → state serialized to sql.js. Load → state restored.
**Verify:** save → advance 50 ticks → load → tick count returns to saved value.

---

## BATCH 7: Tests That Catch Real Problems

### 7.1 Landing test with shader diagnostics
All 5 shaders compiled. Canvas has non-black pixels. Scene has correct mesh names.

### 7.2 Gameplay canvas test
After navigation: canvas renders non-transparent pixels. Scene has >50 meshes. Camera at 20-35°.

### 7.3 Full playthrough test
Real App render → navigate to gameplay → governor 100 ticks → state advanced.

### 7.4 Component tests exercise real ECS
Each component test spawns real entities, performs real interactions, verifies real state changes. Zero mocks.

---

## BATCH 8: Lightning & Polish

### 8.1 Gameplay lightning bolts
BabylonJS tube-based lightning from sky hitting labyrinth. GlowLayer for visual impact.
Random frequency tied to storm intensity.
**Verify:** lightning bolts visible striking the game board periodically.

### 8.2 Globe shader continents
Current noise-based continents are acceptable but could be improved with more distinct landmass shapes.

### 8.3 Ice blue palette everywhere
No leftover green (#00ffaa). All accents use #8be6ff family.
**Verify:** grep for #00ffaa returns 0 matches in src/.

### 8.4 Mobile responsive layout
Sidebar → bottom panel on narrow viewport. Touch controls work.
**Verify:** Chrome DevTools mobile emulation shows bottom panel layout.

---

## Execution Standards

1. **Screenshot BEFORE marking done** — Chrome DevTools MCP for every visual task
2. **Tests must FAIL when broken** — not just check text presence
3. **Zero mocks** in browser tests
4. **Commit each batch** with descriptive message
5. **No "will be done later"** — everything in this document gets done
