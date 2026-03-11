# Interaction Model

**Source of truth** for how the player interacts with the 3D world in first-person.

Extracted from GDD-003 and refined against the implemented codebase.

---

## 1. Interaction Philosophy

Syntheteria uses **contextual interaction** -- every object on the planet surface is clickable and responds with actions appropriate to its type. There is no tool system. The player does not equip a welder and then click; the player clicks an enemy bot and sees `[ATTACK] [HACK] [INSPECT]`. Click a belt and see `[ROTATE] [INSPECT]`.

What you can do depends on:
- What you clicked (entity category and traits)
- What you are doing (holding a cube? in build mode?)
- How far away you are (per-category interaction ranges)

This replaces the old tool system (`RadialToolMenu`, `EquippedToolView`, `getEquippedTool`) entirely.

---

## 2. Raycast Selection

Every interactable object has a kinematic Rapier physics collider. The `ObjectSelectionSystem` runs inside the R3F Canvas and uses a three-strategy cascade each frame to determine what the player is looking at.

### 2.1 Strategy Cascade

| Priority | Method | When Used |
|----------|--------|-----------|
| 1 | **Rapier physics raycast** | When physics is initialized and colliders have entity associations |
| 2 | **Three.js scene raycaster** | Fallback when Rapier misses; traverses scene graph, checks `userData.entityId` |
| 3 | **Ray-to-entity proximity** | Last resort; computes perpendicular distance from ray to all entity positions |

The ray originates at the camera position and points along the camera forward direction (screen center / crosshair).

### 2.2 Entity Matching

When Rapier or Three.js reports a hit point, the system searches all ECS archetypes for the closest entity within a match threshold of 1.5 world units. The search checks: units, buildings (with miner/processor differentiation), belts, wires, miners, processors, items, otters, hackables, and signal relays.

A collider-to-entity ID registry (`raycastUtils.ts`) maps physics collider handles to entity IDs, decoupling physics from ECS.

### 2.3 Recognized Entity Categories

```
unit | building | belt | wire | miner | processor | item
otter | hackable | signalRelay | oreDeposit | furnace | ground
```

### 2.4 Interaction Ranges

Each entity category has a maximum interaction range in world units:

| Category | Range | Category | Range |
|----------|-------|----------|-------|
| ore_deposit | 3.0 | enemy_bot | 15.0 |
| material_cube | 2.5 | friendly_bot | 5.0 |
| furnace | 3.0 | otter | 3.0-4.0 |
| belt | 3.0 | wall | 3.0-4.0 |
| lightning_rod | 4.0 | wire | 3.0-4.0 |
| turret | 4.0 | building | 4.0 |

### 2.5 Configuration Constants

Defined in `ObjectSelectionSystem.tsx`:
- `MAX_INTERACTION_RANGE = 6.0` -- maximum raycast distance
- `ENTITY_MATCH_THRESHOLD = 1.5` -- position-match tolerance

Defined in `raycastUtils.ts`:
- `SELECTION_RAY_MAX_DISTANCE = 50` -- absolute ray length cap

---

## 3. Emissive Highlight

When the crosshair passes over an interactable entity, it receives a visual glow. A second, brighter glow marks the actively selected entity. Both are rendered as slightly-scaled transparent box meshes with additive blending, overlaid on the entity's world position.

### 3.1 Hover Highlight

- **Color:** `#00ff66` (green)
- **Opacity:** Oscillates between 0.05 and 0.20 (`0.05 + 0.15 * (0.5 + 0.5 * sin(time * 4))`)
- **Blending:** Additive (`THREE.AdditiveBlending`)
- **Depth write:** Off (renders on top)
- **Scale:** Entity bounding box * 1.15

### 3.2 Selection Highlight

- **Color:** `#00ff88` (bright green)
- **Opacity:** Steady at ~0.25 with subtle breathing (`0.25 + 0.05 * sin(time * 2)`)
- **Blending:** Additive
- **Scale:** Entity bounding box * 1.15 * 1.05 (slightly larger than hover)

### 3.3 Bounding Boxes per Entity Type

The highlight system uses approximate bounding boxes (half-extents) per entity type:

| Type | W | H | D | Y-Offset |
|------|---|---|---|----------|
| unit | 0.35 | 0.55 | 0.35 | 0.5 |
| building | 0.90 | 0.80 | 0.90 | 0.5 |
| miner | 0.75 | 1.20 | 0.75 | 1.0 |
| processor | 0.95 | 0.70 | 0.95 | 0.6 |
| belt | 0.55 | 0.15 | 0.55 | 0.1 |
| wire | 0.20 | 0.20 | 0.20 | 0.5 |
| item | 0.20 | 0.15 | 0.20 | 0.15 |
| otter | 0.30 | 0.25 | 0.30 | 0.2 |
| hackable | 0.50 | 0.50 | 0.50 | 0.5 |
| signalRelay | 0.40 | 0.60 | 0.40 | 0.5 |

---

## 4. Crosshair / Reticle

The crosshair is driven by `crosshairDriver.ts`, a pure-logic module that translates raycast hit data into HUD display state.

### 4.1 Crosshair Styles

| Style | Color | Trigger |
|-------|-------|---------|
| default | `#ffffff` | Nothing targeted |
| harvest | `#ffcc00` | Looking at ore deposit |
| interact | `#00ccff` | Looking at cube, furnace, belt, bot, otter, etc. |
| combat | `#ff3333` | Looking at enemy bot |
| build | `#33ff33` | Build mode active |

### 4.2 Crosshair State

Each frame, `updateCrosshair()` produces:
- `style` -- which reticle variant to render
- `targetName` -- formatted entity name with status (e.g., "Ore Deposit (73%)", "Furnace [Powered]")
- `targetDistance` -- meters to target
- `canInteract` -- whether the target is in range and interactable
- `quickAction` -- contextual prompt (e.g., "Hold E to harvest", "E to grab", "LMB to attack")

### 4.3 Target Health Bar

Entities with health/status display a bar below the crosshair:
- **Enemies:** Colored by faction (Reclaimers `#cc6633`, Volt `#3399ff`, Signal `#aa44ff`, Iron `#888888`, Feral `#ff3333`, Player `#00ff88`)
- **Buildings/furnaces/turrets/walls:** Yellow `#ffcc00`
- **Ore deposits:** Light blue `#88ccff`
- **Cubes:** No health bar

---

## 5. Radial Action Menu

When the player clicks/taps a selected entity, a context-sensitive radial menu appears at screen center (crosshair position). The menu is rendered as an SVG overlay with wedge-shaped buttons arranged in a circle.

### 5.1 Visual Design

- **Aesthetic:** Machine-vision terminal -- dark backgrounds (`rgba(0, 8, 4, 0.92)`), monospace font (`Courier New`), green accent colors
- **Layout:** Ring of wedge buttons at 85px radius, 30px wedge radius, center hub with entity type label and ID
- **Colors per entity type:** unit `#00aaff`, building `#aa8844`, belt `#44ff88`, wire `#ffaa00`, miner `#ff8844`, processor `#aa44ff`, item `#00ffaa`, otter `#88cc44`, hackable `#ff4488`
- **Action categories:** primary `#00ffaa`, secondary `#00aaff`, danger `#ff4444`
- **Touch targets:** Minimum 44px per WCAG 2.5.5

### 5.2 Menu Lifecycle

```
Click/tap entity
    -> InteractionSystem resolves entity traits
    -> actionRegistry returns matching actions
    -> MenuState updated (visible: true, actions, position)
    -> ObjectActionMenu renders SVG wedges

Player selects action
    -> CustomEvent "coreloop:action" dispatched
    -> InteractionSystem routes to correct system function
    -> Menu dismissed

ESC / click outside
    -> CustomEvent "coreloop:action" with "__dismiss__"
    -> Menu closed, selection cleared
```

### 5.3 Trait Resolution

The `InteractionSystem` bridges selection to actions through trait resolution. When an entity is selected, it checks all system registries (ore deposits, furnaces, cubes, units, lightning rods, buildings, signal relays, hackables, belts, otters) to build a trait list, then passes those traits to the action registry.

### 5.4 Action Registry

The `actionRegistry.ts` maps entity traits to available actions using pattern matching. Patterns with more required traits take priority (e.g., `['MaterialCube', 'HeldBy']` matches the drop/throw pattern before the generic grab pattern).

Some actions have dynamic enable/disable via `adjustActions` hooks (e.g., furnace "INSERT" is only enabled when the player is holding a cube; "SMELT" is only enabled when the hopper has items and the furnace is idle).

---

## 6. Actions per Entity Type

### 6.1 Ore Deposits

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| HARVEST | pickaxe | primary | E | Not depleted, in range |
| INSPECT | target | secondary | -- | Always |
| MARK ON MAP | pin | secondary | -- | Always |

Quick action: `harvest` (single-click starts immediately if not depleted).

### 6.2 Material Cubes

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| GRAB | hand | primary | E | Not already holding a cube, in range |
| DROP | down arrow | primary | -- | When cube is held |
| THROW | diagonal arrow | danger | -- | When cube is held |
| INSPECT | target | secondary | -- | Always |

Quick action: `grab` (single-click grabs if hands empty).

### 6.3 Furnace

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| OPEN | menu | primary | E | Always |
| DROP IN / INSERT | down arrow | primary | -- | Player holding a cube |
| SMELT | fire | primary | -- | Hopper has items, furnace idle |
| INSPECT | target | secondary | -- | Always |

Quick action: `deposit` when holding a cube; opens furnace detail otherwise.

### 6.4 Belts

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| ROTATE | clockwise arrow | primary | Always |
| REMOVE | cross | danger | Always |
| INSPECT | target | secondary | Always |
| TOGGLE | power | primary | Always |

No quick action (always opens menu).

### 6.5 Wires

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| INSPECT | target | secondary | Always |
| REROUTE | curved arrow | primary | Always |
| CUT | scissors | danger | Always |

### 6.6 Lightning Rods

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| INSPECT | target | secondary | Always |
| WIRE | lightning | primary | Always (starts wire connection) |
| REPAIR | wrench | primary | In range, health < 100% |
| RELOCATE | bidirectional | secondary | Always |

### 6.7 Turrets

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| TARGET PRIORITY | crosshair | primary | Always |
| REPAIR | wrench | primary | In range, health < 100% |
| AMMO STATUS | box | secondary | Always |
| DEACTIVATE | power | danger | Always |

### 6.8 Friendly Bots

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| SWITCH TO | arrows | primary | Q | In range |
| COMMAND | play | secondary | -- | Always |
| REPAIR | wrench | primary | -- | In range, health < 100% |
| INSPECT | target | secondary | -- | Always |

Quick action: `switch_to`.

### 6.9 Enemy Bots

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| ATTACK | swords | primary | F | Always (ranged, 15m range) |
| HACK | block | primary | -- | Player has hack module |
| INSPECT | target | secondary | -- | Always |
| FLEE | runner | danger | -- | Always |

Quick action: `attack`.

### 6.10 Otter Holograms

| Action | Icon | Category | Hotkey | Condition |
|--------|------|----------|--------|-----------|
| TALK | speech | primary | E | In range |
| TRADE | money | primary | -- | In range |
| QUEST LOG | scroll | secondary | -- | Always |

Quick action: `talk`.

### 6.11 Walls

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| INSPECT | target | secondary | Always |
| REINFORCE | shield | primary | Always |
| DEMOLISH | cross | danger | Always |

### 6.12 Buildings (Generic)

| Action | Icon | Category | Condition |
|--------|------|----------|-----------|
| INSPECT | target | secondary | Always |
| POWER | power toggle | primary | Always |
| UPGRADE | up arrow | primary | Always |
| DISMANTLE | cross | danger | Always |
| REPAIR | wrench | primary | In range, health < 100% |

### 6.13 Empty Ground

Clicking empty terrain (no entity collider hit) opens a build submenu:
- **BELT** -- place conveyor belt
- **MINER** -- place mining drill
- **ROD** -- place lightning rod
- **FAB** -- place fabrication unit

---

## 7. Build Mode

When the player selects a buildable item from the ground-click menu, the game enters placement mode.

### 7.1 Placement Flow

```
Ground click -> Build submenu -> Select item
    -> Ghost preview mesh follows crosshair
    -> Ray cast onto ground plane (Y=0)
    -> Ghost snaps to placement position
    -> LMB / E to confirm (within 15m of player)
    -> ESC to cancel

Crosshair style changes to "build" (#33ff33)
Quick action shows "LMB to place"
```

### 7.2 Placement System

`FPSInput` handles build mode by casting a ray from the camera onto a ground plane (`new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)`). If the hit point is within 15 units of the player, it calls `updateGhostPosition()` then `confirmPlacement()` from `buildingPlacement.ts`.

---

## 8. FPS Controls

### 8.1 Desktop (Keyboard + Mouse)

| Input | Action | System |
|-------|--------|--------|
| **WASD** | Movement | FPS camera controller |
| **Mouse look** | Camera rotation | Pointer lock on canvas |
| **Left click** | Select entity / interact in build mode / attack | `ObjectSelectionSystem` + `FPSInput` |
| **Tab** | Select entity under crosshair | `ObjectSelectionSystem` |
| **E** | Interact (context-dependent: harvest, open, grab, talk) | `FPSInput.handleInteract()` |
| **F** | Harvest deposit under crosshair | `FPSInput.handleHarvest()` |
| **C** | Compress highest-quantity powder into cube | `FPSInput.handleCompress()` |
| **G** | Grab/drop cube (auto-feeds furnace if nearby) | `FPSInput.handleGrab()` |
| **Q** | Switch to another bot | Dispatched via custom event |
| **ESC** | Cancel build mode / close radial menu | `FPSInput` + `ObjectActionMenu` |

### 8.2 Grab Key Behavior (G)

The G key has smart dual behavior:
1. **If holding a cube:** Check if near a furnace (within 3.0m). If so, auto-feed the cube into the furnace hopper and start smelting. If not near a furnace, drop the cube 1.5m in front of the player at Y=0.25.
2. **If not holding a cube:** Grab the entity currently under the crosshair (via `getHoveredEntity()`).

---

## 9. Mobile Controls

Implemented in `MobileControls.tsx`. Only renders on touch devices.

### 9.1 Layout

| Zone | Element | Purpose |
|------|---------|---------|
| Bottom-left | nipplejs joystick | Movement (virtual analog stick) |
| Bottom-center | Equipped tool view | Tap to open radial tool menu |
| Right side | Action buttons | Single-thumb access to core actions |

### 9.2 Action Buttons (Right Thumb Cluster)

- **Primary cluster:** Harvest, Compress, Grab/Drop
- **Secondary row:** Interact (E), Switch Bot (Q)

### 9.3 Touch Selection

Mobile selection is handled via a dispatched `objectselect` custom event on tap, which triggers the same `handleSelectionClick()` codepath as desktop click. The `ObjectSelectionSystem` listens for both `pointerdown` (desktop) and `objectselect` (mobile).

### 9.4 Accessibility

- All touch targets are minimum 48x48px (exceeds WCAG 2.5.5 Level AAA)
- Safe area insets respected for notch/home indicator devices (`env(safe-area-inset-*)`)
- Radial menu wedge buttons have 44px minimum touch target per WCAG

---

## 10. Selection State Architecture

Selection state flows through a reactive store pattern:

```
ObjectSelectionSystem (per-frame raycast)
    -> selectionState.ts (setSelected / getSelected / onSelectionChange)
        -> InteractionSystem (resolves traits, builds action list)
            -> MenuState (visible, actions, position)
                -> ObjectActionMenu (SVG radial render)
                -> SelectionHighlight (3D glow mesh)
                -> CrosshairDriver (reticle style, prompt text)
```

The `selectionState.ts` module is a pure TypeScript pub/sub store with no ECS or React dependency. Multiple consumers subscribe independently:
- `InteractionSystem` -- opens/closes the radial menu
- `SelectionHighlight` -- toggles the 3D glow mesh
- `ObjectActionMenu` -- renders/hides the SVG overlay
- `FPSHUD` -- updates crosshair and target info

---

## 11. Action Dispatch

When the player picks an action from the radial menu, `ObjectActionMenu` dispatches a `CustomEvent("coreloop:action")` on the window. `InteractionSystem` catches it and routes to the appropriate system:

| Action ID | Routed To |
|-----------|-----------|
| `harvest` | `startHarvesting()` from `harvesting.ts` |
| `grab` | `grabCube()` from `grabber.ts` |
| `drop` | `dropCube()` from `grabber.ts` |
| `throw` | `throwCube()` from `grabber.ts` |
| `insert` | `insertCubeIntoFurnace()` from `furnace.ts` |
| `open` | `coreloop:furnace-open` custom event |
| `smelt` | `startSmelting()` from `furnaceProcessing.ts` |
| `place` | `placeHeldCube()` from `cubeStacking.ts` |
| `inspect` | `coreloop:inspect` custom event |
| `switch` | `coreloop:switch-bot` custom event |
| `command` | `coreloop:command-bot` custom event |
| `power_toggle` | `coreloop:power-toggle` custom event |
| `disassemble` | `coreloop:disassemble` custom event |
| `connect_wire` | `coreloop:connect-wire` custom event |
| `hack` | `coreloop:hack` custom event |

After every action dispatch, the menu is dismissed and selection cleared.

---

## 12. Custom Action Extension

Mods and dynamic content can register additional actions at runtime via `registerCustomActions(category, actions)` in `contextualActions.ts`. Custom actions are appended after the default action set for the specified entity category.

---

## 13. Source Files

| File | Purpose |
|------|---------|
| `src/input/ObjectSelectionSystem.tsx` | Per-frame raycast, hover/selection state, click handler |
| `src/input/selectionState.ts` | Reactive pub/sub store for selected entity ID |
| `src/input/FPSInput.tsx` | Keyboard/mouse action handlers (E, F, C, G, ESC) |
| `src/input/raycastUtils.ts` | Rapier ray utility, collider-to-entity registry |
| `src/rendering/SelectionHighlight.tsx` | 3D emissive glow on hovered/selected entities |
| `src/systems/InteractionSystem.tsx` | Trait resolution, action lookup, action dispatch |
| `src/systems/actionRegistry.ts` | Trait-to-action pattern matching, dynamic adjustments |
| `src/systems/contextualActions.ts` | Category-to-action mapping, enable/disable logic, quick actions |
| `src/systems/interactionState.ts` | Pure-logic interaction state (hover, select, radial open) |
| `src/systems/crosshairDriver.ts` | Crosshair style, target name, distance, prompts, health bars |
| `src/ui/ObjectActionMenu.tsx` | SVG radial menu React component |
| `src/ui/MobileControls.tsx` | Mobile overlay: joystick, action buttons, tool view |
