# Syntheteria — BabylonJS Refactor (Complete Design Spec)

> Single comprehensive spec covering the full pivot from R3F to BabylonJS/Reactylon.
> No phases. No vacuums. Everything in one document.

**Goal:** Replace R3F/Three.js rendering with BabylonJS/Reactylon, adopt chunk-based infinite world, implement base system, clean up UI with responsive RTS-standard layout.

---

## 1. Build System

Kill Vite. Webpack 5 is the sole bundler.

- Promote `webpack.poc.config.ts` → `webpack.config.ts` (dev/prod modes)
- `babel-plugin-reactylon` in Babel pipeline for Reactylon JSX
- Single entry: `src/index.tsx`
- Delete: `vite.config.ts`, `tsconfig.app.json`, `vite-static-assets-plugin` dep
- Keep: `tsconfig.json` (adapt), `tsconfig.poc.json` (merge into main)

---

## 2. Rendering Architecture

### Engine
- **Reactylon** (`Engine` + `Scene`) creates the BabylonJS canvas
- React DOM overlays ABOVE the canvas for all UI (shadcn components)
- BabylonJS handles ALL 3D — no Three.js anywhere

### Terrain
- **Imperative mesh creation** via `src/board/scene.ts` — NOT React JSX per tile
- **Chunk-based infinite world** — 32×32 tile chunks generate on demand as camera pans
- `populateChunkScene(chunk, scene)` creates meshes; `disposeChunkMeshes()` removes them
- **PBR materials** cached per FloorType from `floorMaterials.ts`
  - Different concrete variants for different corridor types (transit_deck, dust_district, etc.)
  - Different metal variants for different wall types
  - Visual depth from BLENDING different textures, not one texture everywhere
- The labyrinth IS the landscape — rooms, corridors, walls are procedural "buildings"
- No per-tile React elements. No instanced mesh per floor type. Imperative geometry.

### Camera
- BabylonJS `ArcRotateCamera`
- Beta ~1° from vertical (near-top-down, 2.5D RTS view)
- Alpha locked at -90° (no orbital rotation)
- Pan via right-click drag / two-finger
- Zoom via scroll wheel, radius 20-100
- Zero inertia for crisp RTS feel

### Fog
- Exponential fog (mode 2), density 0.015, color `#03070b`
- Fades distant chunks into darkness — never a visible edge
- Large ground plane at fog color below all geometry — no black void

### Lights
- DirectionalLight "sun" — steep angle, cool blue-white
- HemisphericLight "ambient" — subtle fill, dark teal ground
- PointLight "accent" — cyan, at player start / active base

---

## 3. What's ON the Game Board

| Element | Visual | Source |
|---------|--------|--------|
| **Labyrinth terrain** | PBR-textured walls + corridors | `scene.ts` from chunk data |
| **Player robots** (6 types) | GLB models | Koota `Position` → BabylonJS mesh |
| **Cult enemies** (3 types) | GLB models | Koota `Position` → BabylonJS mesh |
| **Player base markers** | Banner/beacon mesh | Koota `Base` trait position |
| **Cult base markers** | Enemy-colored beacon | Pre-placed in northern zone chunks |
| **Circuit trace accents** | Thin emissive lines on corridors | Part of `scene.ts` |

### What's NOT on the Game Board
- No building GLBs placed individually
- No building placement ghost preview
- No power radius visualization
- No building toolbar on HUD

---

## 4. Base System

### Founding
- A robot at a suitable location (room in the labyrinth) can "found a base"
- Radial menu action: FOUND BASE
- Creates a `Base` entity in Koota ECS at that location
- On the map: base shows as a marker/beacon (small 3D mesh)

### Base Panel (side panel, not full-screen modal)
- React DOM + shadcn
- Slides from the right edge when a base is selected (click marker)
- Shows:
  - **Name + faction** (editable for player bases)
  - **Production queue** — fabricate components, manufacture units
  - **Infrastructure** — lightning rods, server racks, fabrication units (INSIDE the base, not on the map)
  - **Power status** — storm intensity × rod count = power generation
  - **Storage** — resource stockpile (scrap, circuitry, power cells, durasteel)
  - **Garrison** — units stationed at this base
  - **Upgrade options** — base-level upgrades that unlock capabilities
- Closes on Escape, click outside, or click X

### Cult Bases
- Pre-placed in northern enemy zone chunks during generation
- Same marker visual but enemy-colored (red tint)
- Attackable — destroying a cult base removes the marker and spawns salvage
- Cannot be captured (cultists are human, can't be hacked)

### Base ECS
- New trait: `Base { name: string, tileX: number, tileZ: number, factionId: string, infrastructure: string[], productionQueue: string[], power: number, storage: Record<string, number> }`
- `src/systems/baseManagement.ts` — founding, production ticks, power calculation, garrison management

---

## 5. Robot GLB Loading

- `ImportMeshAsync` / `LoadAssetContainerAsync` loads each of 9 GLBs once at startup
- Per entity: instantiate from asset container, position at `Position` world coords via `coords.ts`
- Bob animation (BabylonJS Animation system, not R3F useFrame)
- Selection ring (torus mesh, cyan emissive, toggled by selection state)
- Faction-colored emissive tint on materials
- When entity moves: lerp mesh position along Yuka NavGraph path
- New file: `src/game/EntityRenderer.ts` — manages the mesh ↔ Koota entity lifecycle

---

## 6. Navigation (Yuka)

- `src/board/navigation.ts` builds Yuka `NavGraph` per chunk
- One node per passable tile at world-space center
- 8-directional edges (4 cardinal + 4 diagonal)
- Edge cost = distance × (1 + elevation_delta × 1.5)
- Cross-chunk pathfinding: `connectChunkGraphs()` merges graphs at shared border gates
- Coordinate conversions via `src/board/coords.ts` (tile ↔ world ↔ BabylonJS ↔ Yuka)
- Movement system reads `Navigation` trait, follows Yuka path, updates `Position`

---

## 7. UI Layout (React DOM + shadcn)

Reference: `otter-elite-force/docs/references/poc_final.html` — responsive RTS HUD pattern.

### Desktop Layout
```
┌──────────────────────────────────────────────────────┐
│ Resources ──── Status ──── Speed Controls ──── Clock │  thin top bar
├──────────┬───────────────────────────────────────────┤
│ Minimap  │                                           │
│          │                                           │
├──────────┤          GAME CANVAS                      │
│ Selected │        (Reactylon/BabylonJS)              │
│ Unit     │                                           │
│ Info     │                                           │
├──────────┤                                           │
│ Actions  │                                           │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

### Mobile Layout
```
┌────────────────────────────────┐
│ Resources ──── Status ──── Clk│
├───────────────────────────────┤
│                               │
│         GAME CANVAS           │
│                               │
├──────┬──────────┬─────────────┤
│ Mini │ Selected │   Actions   │  bottom panel (thumb zone)
│ map  │ Info     │             │
└──────┴──────────┴─────────────┘
```

### Key Layout Rules
- `flex-col-reverse md:flex-row` — mobile=bottom panel, desktop=left sidebar
- Game canvas is `flex-1` — takes ALL remaining space
- UI panels are `flex-shrink-0` with fixed dimensions
- `touch-action: none` on game canvas
- When base selected, Actions area expands into Base Panel (slides right or replaces)

### Components (shadcn + Tailwind)
- **TopBar** — resources (color-coded badges), game status, speed controls (0.5x/1x/2x/4x + pause), clock/tick counter
- **Minimap** — canvas element showing chunk outlines, unit dots, base markers, fog overlay, camera viewport indicator
- **SelectionInfo** — selected unit name, component status (camera/arms/legs/power_cell), faction, mark level, HP-equivalent (functional components / total)
- **ActionPanel** — context-sensitive buttons: MOVE, ATTACK, HACK, FOUND BASE, SCAVENGE, UPGRADE, STANCE
- **BasePanel** — slides from right, shows base internals (production, infrastructure, power, storage, garrison)
- **NarrativeOverlay** — full-screen typewriter text with AUTO-ADVANCE (2-3 second hold per frame, then fade to next). Tap/click SKIPS the timer, doesn't advance. SKIP button bypasses entire sequence.
- **RadialMenu** — appears at cursor/tap position on right-click selected unit. Replaces ActionPanel temporarily.

---

## 8. Landing Page

Faithful port of the R3F storm globe to BabylonJS:

- **GLSL shaders** ported to BabylonJS `ShaderMaterial` (mechanical translation, same math)
  - Storm clouds (FBM turbulence)
  - Lightning bolts (jagged hash-based)
  - Ecumenopolis globe (continent generation + lattice growth)
  - Hypercane spiral band
- **Sphere mesh** with storm shader as material
- **Auto-rotation** (slow spin)
- **DOM overlay** for title text, menu buttons (shadcn styled)
- NOT a placeholder — must visually match the current R3F landing page

---

## 9. Narration

- **Auto-advance**: text fades in (typewriter), holds 2-3 seconds, then automatically fades to next frame
- Tap/click COMPLETES the current typewriter if still typing, OR skips the hold timer
- SKIP button bypasses the entire sequence
- Mood-based color theming (default green, urgent red-orange, glitch cyan)
- Scanline overlay for atmosphere
- Progress dots at bottom

---

## 10. Input

### Golden Rule: MOUSE-FIRST

**If it can't be done with a mouse, it can't be done with tap/pinch and the UX has FAILED.**

No keyboard shortcuts required for ANY action. No joystick. No central controls. Everything is point-and-click. Keyboard shortcuts are OPTIONAL accelerators for power users — never required.

This is an RTS. The interaction model is:
1. **Click** a unit to select it
2. **Click** a destination to move it there (pathfinds automatically)
3. **Click** a resource to harvest it
4. **Click** an enemy to attack it
5. **Click** a base marker to open the base panel
6. **Click** an empty spot near a unit to open the radial menu (context actions)

That's it. Every action is a click on something.

### Camera
- **Pan**: right-click drag / two-finger drag
- **Zoom**: scroll wheel / pinch zoom
- BabylonJS ArcRotateCamera handles all of this natively

### Selection
- **Click unit** → select it (highlight, show info in sidebar)
- **Click terrain** with unit selected → move command (Yuka pathfind)
- **Click enemy** with unit selected → attack command
- **Click resource** with unit selected → harvest command
- **Click nothing** → deselect
- **Drag rectangle** → box select multiple units

### Context Actions
- **Click near selected unit** (or right-click) → radial menu appears at cursor
- Actions shown depend on context: MOVE, ATTACK, HACK, FOUND BASE, SCAVENGE, STANCE
- Click an action → executes → menu closes

### Base Interaction
- **Click base marker** → Base Panel slides open from right
- **Click X** or click outside → panel closes

### Touch (identical to mouse, just pointer events)
- Tap = click
- Two-finger drag = pan
- Pinch = zoom
- Long press = right-click equivalent (radial menu)
- Drag = box select

### Keyboard (OPTIONAL accelerators, never required)
- Space = pause/unpause (also available as a clickable button in top bar)
- Escape = deselect / close panel (also available as X button)
- Number keys = speed presets (also available as clickable buttons)

---

## 11. Entity System (Koota)

Stays engine-independent. No changes to trait structure except adding `Base`.

### Existing Traits (unchanged)
- `Unit`, `Position`, `Faction`, `Navigation`, `UnitComponents`
- `BuildingTrait` (repurposed: infrastructure INSIDE bases, not on map)
- `LightningRod`, `Fragment`, `EngagementRule`, `Hacking`, `HumanTemperature`

### New Trait
- `Base { name: string, tileX: number, tileZ: number, factionId: string, infrastructure: string[], productionQueue: string[], power: number, storage: Record<string, number> }`

### New System
- `src/systems/baseManagement.ts` — founding validation, production ticks, power calculation from storm × infrastructure, garrison tracking

---

## 12. Game Systems (Unchanged)

All engine-independent, operate on Koota world:
- `combat.ts` — component-based damage
- `resources.ts` — scavenging
- `fabrication.ts` — component manufacturing (now happens inside bases)
- `power.ts` — lightning rod power (now per-base, not per-building-on-map)
- `repair.ts` — component repair
- `upgrade.ts` — Mark I/II/III progression
- `hacking.ts` — take over feral/rogue machines
- `compute.ts` — global cognitive resource
- `humanTemperature.ts` — disposition tracking
- `gamePhases.ts` — Awakening/Expansion/War
- `cultEscalation.ts` — 3-tier threat ramp
- `enemies.ts` — enemy spawning

---

## 13. Audio (Unchanged)

Tone.js engine. SFX triggers from game systems. Procedural music. Storm ambience.

---

## 14. Persistence (Unchanged)

sql.js ASM build. Save/load Koota world state. Future: chunk deltas to IndexedDB.

---

## 15. Error Handling

- No silent fallbacks. Every `catch` calls `logError()`. Every `??` has a safety comment.
- `gameAssert()` + throw for invariant violations
- React ErrorBoundary for UI crashes
- Debug overlay (toggle backtick) — FPS, entity count, chunk count, errors

---

## 16. Files to DELETE

| Path | Reason |
|------|--------|
| `vite.config.ts` | Replaced by webpack.config.ts |
| `tsconfig.app.json` | Merged into tsconfig.json |
| `src/rendering/` (entire dir) | R3F renderers replaced by board/scene.ts |
| `src/camera/` (entire dir) | R3F camera replaced by BJS ArcRotateCamera |
| `src/input/TopDownCamera.tsx` | BJS camera handles this |
| `src/input/UnitInput.tsx` | BJS picking replaces this |
| vite-static-assets-plugin dep | Vite is dead |
| `src/static-assets.ts` | Generated by dead plugin |

---

## 17. Files to KEEP (engine-independent)

| Path | Role |
|------|------|
| `src/ecs/` | Koota traits, factory, gameState |
| `src/systems/` | All game systems |
| `src/ai/` | Yuka GOAP |
| `src/config/` | All game data configs |
| `src/board/` | Generation, chunks, scene, navigation, coords, zones |
| `src/audio/` | Tone.js |
| `src/db/` | sql.js persistence |
| `src/errors.ts` | Error handling |

---

## 18. Files to CREATE

| Path | Purpose |
|------|---------|
| `webpack.config.ts` | Promoted from POC, dev/prod modes |
| `src/index.tsx` | App entry (Reactylon Engine+Scene + React DOM root) |
| `src/game/GameCanvas.tsx` | Reactylon Engine+Scene wrapper, fog, lights |
| `src/game/EntityRenderer.ts` | BJS mesh lifecycle for Koota entities (GLB load, position, animate) |
| `src/game/BaseMarker.ts` | BJS mesh for base indicators |
| `src/game/InputHandler.ts` | BJS picking, selection, movement commands |
| `src/game/ChunkManager.ts` | Load/unload chunks on camera pan (from POC CityContent.tsx) |
| `src/ui/layout/GameLayout.tsx` | Responsive RTS layout (sidebar/bottom panel pattern) |
| `src/ui/layout/TopBar.tsx` | Resources, status, speed controls |
| `src/ui/layout/Sidebar.tsx` | Minimap + SelectionInfo + ActionPanel |
| `src/ui/base/BasePanel.tsx` | Base management side panel |
| `src/ui/landing/LandingPage.tsx` | Storm globe in BJS ShaderMaterial + shadcn menu |
| `src/systems/baseManagement.ts` | Base founding, production, power, garrison |
| `src/ecs/traits.ts` | Add `Base` trait |

---

## 19. Files to REFACTOR

| Path | Change |
|------|--------|
| `src/ui/game/GameUI.tsx` | Strip to nothing — replaced by GameLayout + TopBar + Sidebar |
| `src/ui/game/NarrativeOverlay.tsx` | Add auto-advance with fade transitions |
| `src/ui/game/RadialMenu.tsx` | Add FOUND BASE + HACK actions |
| `src/systems/fabrication.ts` | Fabrication happens inside bases, not at map buildings |
| `src/systems/power.ts` | Power is per-base, not per-building-on-map |
| `src/systems/buildingPlacement.ts` | Remove — buildings are inside bases now |

---

## 20. Success Criteria

- [ ] Webpack builds and serves the full game (no Vite)
- [ ] Chunk-based labyrinth renders with blended PBR textures, fills viewport, fog at edges
- [ ] 9 robot GLBs load and position correctly from Koota entities
- [ ] Robots move along Yuka NavGraph paths across chunks
- [ ] Cult AI patrols, detects, attacks via Yuka GOAP
- [ ] Component damage combat works
- [ ] Player can found a base via radial menu
- [ ] Base panel slides open showing production/power/storage/garrison
- [ ] Cult bases exist in northern zone, attackable
- [ ] Landing page faithfully reproduces storm globe in BabylonJS ShaderMaterial
- [ ] Narration auto-advances with fades (not "tap to continue" forever)
- [ ] Responsive HUD: sidebar on desktop, bottom panel on mobile
- [ ] Resources, minimap, selection info, action panel all functional
- [ ] Save/load works
- [ ] Audio plays
- [ ] Zero console errors
- [ ] All engine-independent tests pass (Koota, systems, board generation)
- [ ] No silent fallbacks anywhere in the codebase
