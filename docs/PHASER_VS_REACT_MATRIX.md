# Phaser vs React: Responsibility Matrix

> **Date:** 2026-03-19
> **Context:** Syntheteria is pivoting from R3F to Phaser + enable3d. This document clarifies what Phaser should own vs what React should own, with evidence and reasoning.

---

## Executive Summary

**Clear split:**
- **Phaser owns:** Game loop, board input, camera, scene lifecycle, game-world animations, particle effects
- **React owns:** Modal dialogs, settings forms, overlays with complex state (tech tree DAG, unit roster), tooltips, responsive layouts
- **Hybrid (DOM overlay):** HUD, status bars, minimap click-to-pan, **command strip / inspector** (input via Phaser selection events, layout via React DOM — **not** the legacy SVG radial)

The key insight: **Phaser's built-ins are game-specific; React's are for UI that exists independent of game state.** Use each for what it does best.

---

## 1. Phaser's Built-In Capabilities

### What Phaser Does WELL Out of the Box

| Capability | Why It Matters | Evidence |
|-----------|----------------|----------|
| **Scene management** | Scenes are state containers with init → create → update → render lifecycle. Perfect for game phases. | Phaser docs; our phase machine (title → setup → generating → playing) maps directly to scenes |
| **Game loop** | 60fps requestAnimationFrame wrapper. Handles pause, resume, delta time. | Built-in. We're currently using R3F's frameloop (not ideal) |
| **Camera system** | Pan, zoom, bounds, follow, shake, flash, fade animations | POC used enable3d camera; can extend with Phaser's 2D camera utilities |
| **Input handling** | Pointer (mouse/touch), keyboard, gamepad, zones, drag-drop, hitArea detection | CivRev2-tier input is a Phaser strength. Our BoardInput.tsx could be a Phaser listener |
| **Tweening** | Lerp, easing, callback chains. Used for animations, UI transitions | Currently hardcoded setTimeout chains (TurnPhaseOverlay) — Phaser tweens are cleaner |
| **Timer/Clock** | scheduleEvent, scheduleRepeat, delay, runningTime | Better than useState + useEffect for game timers |
| **Events system** | Pub/sub for game events (unit moved, building placed, turn ended) | More structured than React context for game state broadcasts |
| **Container/Group** | Hierarchical game object grouping. Rotate/scale groups, parent-child relationships | Important for 3D model hierarchies; enable3d extends this |
| **Physics** | Arcade, Matter physics. Not needed for turn-based 4X but available if needed | We don't need it; tile-based movement is logic, not physics |
| **Text rendering** | BitmapText, DynamicBitmapText for in-world labels | Better than DOM projection for high-frequency updates (e.g., resource counters above units) |

### What Phaser Does WORSE

- **Layout & Responsive UI** — No flexbox/grid. Hard-coded pixel positions only.
- **Form inputs** — No input fields, select menus, multiline text. Would need DOM anyway.
- **Accessibility** — No a11y tree, screen reader support. DOM required.
- **Complex overlays** — Modals with semi-transparent backdrops, nested panels. Use React.

---

## 2. React's Strengths for Game UI

### What React Does BETTER

| Capability | Game Angle | Why |
|-----------|-----------|-----|
| **Form UI** | New Game modal (sector size, seed, faction picker), Settings (audio/keybinds/a11y) | React form libraries (or plain HTML) handle validation, multi-step flows, complex state. Phaser has no form widgets. |
| **List rendering** | Tech tree DAG, unit roster, turn log, diplomacy standings | React's list virtualization + memoization handles large lists efficiently. Phaser Groups are game objects, not UI containers. |
| **Modal overlays** | Settlement/city, pause menu, diplomacy, tech tree | React portals + CSS overlays handle backdrops, z-stacking, focus trapping. Phaser has no modal layer concept. |
| **Responsive layouts** | HUD adapts to mobile/desktop; tooltips position at cursor; minimap docks left/right | CSS flexbox/grid. Phaser only has fixed pixel positioning. |
| **State management** | Turn number, resource counters, research progress, victory condition tracking | React hooks + context work well. Phaser events are for game logic broadcasts, not UI state. |
| **Accessibility** | Keyboard navigation in lists, ARIA labels, semantic HTML | DOM required. Phaser has no a11y primitives. |
| **Animations** | Fade-in/fade-out for overlay labels (TurnPhaseOverlay), toast notifications | CSS transitions + React state are simpler than Phaser tweens for UI. |

---

## 3. The Hybrid Pattern: Phaser + React DOM Overlay

**Key insight:** Syntheteria can have **ONE Phaser scene** (the game board) with a **React DOM overlay** on top (HUD, modals, panels).

### How It Works

```
┌────────────────────────────────────────┐
│  HTML ROOT                             │
├────────────────────────────────────────┤
│  PHASER CANVAS (game board)            │  ← Game loop, camera, board input
│  ├─ Terrain (Three.js via enable3d)   │
│  ├─ Units/Buildings/Particles         │
│  ├─ Fog of war overlay                │
│  └─ Highlights (on-board feedback)    │
├────────────────────────────────────────┤
│  REACT DOM OVERLAY (z-index > canvas) │  ← Modal, HUD, panels, tooltips
│  ├─ HUD (resources, turn, AP)          │
│  ├─ Command strip / selection inspector │
│  ├─ Minimap (canvas, but React-owned) │
│  ├─ Tech Tree Modal                    │
│  ├─ Pause Menu                         │
│  └─ Toasts, Tooltips, Alerts          │
└────────────────────────────────────────┘
```

### Communication Pattern

1. **Phaser → React:** Use Phaser events or a global state store (Zustand, Jotai) for game state updates that React cares about (resource changed, unit selected, turn number).
2. **React → Phaser:** Use JavaScript callbacks or Phaser event emitters. React components call methods on the Phaser scene instance.
3. **Shared state:** Keep a single source of truth (Koota ECS world) accessed by both. Phaser reads from it on update; React reads it on render.

Example flow:
```typescript
// User clicks on tile in Phaser
scene.input.on('pointerdown', (pointer) => {
  const tile = getTileAtPointer(pointer);
  if (isMovable(tile)) {
    moveUnit(tile); // Mutates ECS world
    emitter.emit('unitMoved', { unit, tile });
  }
});

// React listens
useEffect(() => {
  const unsub = emitter.on('unitMoved', (data) => {
    setSelectedUnit(data.unit);
    updateHUD();
  });
  return unsub;
});
```

---

## 4. Responsibility Matrix: Per-Component

| Component | Current | Target | Reasoning |
|-----------|---------|--------|-----------|
| **HUD** (resources, turn, AP, end turn button) | React DOM | **React DOM** | State management (resource counters, AP), responsive layout. Button is a standard <button>. |
| **Command UI** (selection actions) | React SVG radial (legacy) | **Phaser** (selection, tile hit) + **React** (rows, buttons, inspector) | **Civ VI / mobile Civ VI** pattern: show **contextual actions** for the selection without a dual-ring menu. Replace radial over time; see `GAME_DESIGN.md` §9. |
| **Minimap** | React Canvas | **React Canvas** (Phaser integration) | 150px live display updates frequently but is inherently a UI element. React owns rendering; integrate with Phaser camera for click-to-pan. |
| **Selected Info** (unit/building details) | React DOM | **React DOM** | Text-heavy info display. Lookup is logic (Phaser/ECS), rendering is React. |
| **Entity Tooltip** (hover info) | React DOM | **React DOM** | Cursor-tracked overlay. Phaser can emit 'entityHovered' events; React renders the tooltip. |
| **Turn Phase Overlay** ("AI THINKING...") | React DOM + useEffect | **Phaser Tweens** | Fade-in/fade-out animations, timer-based. Phaser's tween system is designed for this. Can emit events that React listens to if needed. |
| **Settlement production** (unit queue, class/track, priorities) | React DOM | **React DOM** | Belongs in **city/settlement screen** with reorderable queue — not a standalone “Garage.” Legacy `GarageModal.tsx` may exist until merged. |
| **Diplomacy Overlay** (standings panel) | React DOM | **React DOM** | Table of factions + standings. List rendering, sorting. React's job. |
| **Tech Tree Overlay** (full DAG) | React DOM | **React DOM** | Large graph visualization, search, filter. React + D3/custom canvas render. |
| **Unit Roster** (all units list) | React DOM | **React DOM** | Scrollable list with quick-jump. Virtual list or memo. |
| **Turn Log** (per-turn events) | React DOM | **React DOM** | Scrollable, text-heavy, time-stamped. Pure React. |
| **Pause Menu** (pause/save/quit) | React DOM | **React DOM** | Modal with buttons. React. Phaser scene pause is just a flag (no update calls). |
| **Settings Modal** (audio/keybinds) | React DOM | **React DOM** | Form inputs, toggles, sliders. HTML form, no game engine needed. |
| **Tutorial Overlay** (5-step guide) | React DOM | **React DOM** | Sequence of text panels + highlights. Logic can be in Phaser (highlight logic), rendering in React. |
| **Turn Phase Audio** (synth jingle) | Tone.js (logic) | **Phaser** (via enable3d context or Tone.js) | Audio cues on phase transitions. Phaser has no audio, but events can trigger Tone.js in React. Keep as-is. |
| **Toast Notifications** | React | **React** | Ephemeral, async. useEffect with timers. Leave alone. |
| **Camera** | React Three Fiber SphereOrbitCamera | **Phaser Camera2D** | Phaser's camera has pan, zoom, follow. Way better than React hooks. Rip out and use Phaser native. |
| **Board Input** (click to select, click to move) | React component (BoardInput.tsx) | **Phaser Input Handler** | Pointer events belong in Phaser. React component currently listens to Phaser events; flip it — make Phaser the authority. |
| **Unit Movement Lerp** | R3F renderer (animating Three.js positions) | **Phaser Tween** or **Phaser Update** | Smooth movement animation. Phaser's update loop + tweens handle this natively. No need for React hooks. |
| **Particle Effects** (harvest dust, combat sparks) | R3F Points-based | **Phaser Particles** or **enable3d** | Phaser has a full particle system. More performant than R3F Points for large counts. |
| **Speech Bubbles** (in-world dialogue) | R3F Text3D over units | **Phaser Text or DOM Labels** | If 3D-positioned: enable3d Text; if 2D overlay: React DOM. Current setup (in-canvas) should be enable3d Text. |
| **Fog of War Overlay** (visual darkness) | R3F shader plane | **Phaser/enable3d Layer** | Belongs on the Phaser scene's layer stack, not a React component. |
| **Terrain Renderer** (board geometry, tile meshes) | R3F custom component | **Phaser/enable3d Scene3D** | Three.js meshes are game objects, not UI. They belong in the game loop, not React. |
| **Unit Models** (GLB rendering) | R3F <Model> components | **Phaser/enable3d displayList** | Game objects on the scene, not React. Phaser handles batching and LOD better. |
| **Building Models** (structure rendering) | R3F <Model> components | **Phaser/enable3d displayList** | Same as units — scene objects, not React. |

---

## 5. Deep Dives: Specific Decisions

### 5.1 Command UI (replaces radial)

**Legacy:** React SVG dual-ring radial, `radialMenuState`, sector hit-testing.

**Target:**
1. **Phaser:** Selection and tile taps unchanged; emit `selectionChanged` / `tileFocused` for UI.
2. **React:** **Action strip** or **inspector panel** — icon buttons and short labels for Move, Harvest,
   Attack, Build, etc., filtered by **unit class / building type / specialization** (same rules the
   providers already encode; surface changes, not necessarily the whole provider graph at first).
3. **Deep actions** (full build lists, production) live in **modals and settlement screens**, matching
   **Civ VI mobile** information architecture: lots of data, but **progressive disclosure** instead of
   one overloaded wheel.

**Why:** Radial was optimized for **minimal chrome** (CivRev2-like); we want **clearer affordances**
and room for **specialization-heavy** commands without ring clutter.

---

### 5.2 Minimap

**Current:** React Canvas (150x150px), reads world state, re-draws every 100ms.

**Proposed:** Keep as React Canvas, but integrate with Phaser camera:
- React renders the minimap canvas
- Phaser camera change emits an event → React updates camera viewport rect overlay
- Click on minimap → emit Phaser event → Phaser camera pans to that tile

**Why stay React?** Minimap is inherently a UI widget (small, docked, labeled). React canvas rendering is fine. Integration via events keeps concerns separate.

---

### 5.3 Turn Phase Overlay

**Current:** React DOM with useEffect timeout chains (fade-in 200ms, hold 1200ms, fade-out 300ms).

**Proposed:** Phaser Tween + emit events for React to listen:
```typescript
// Phaser scene:
showPhaseLabel(text) {
  const label = this.add.text(centerX, centerY, text);
  this.tweens.add({
    targets: label,
    alpha: { from: 0, to: 1 },
    duration: 200,
    onComplete: () => {
      this.time.delayedCall(1200, () => {
        this.tweens.add({
          targets: label,
          alpha: { to: 0 },
          duration: 300,
          onComplete: () => label.destroy(),
        });
      });
    },
  });
}
```

**Why Phaser?** Built-in tweens and time.delayedCall are cleaner than useEffect chains. Less code, better performance (no React re-renders).

---

### 5.4 Unit Status Bars (HP/AP above units)

**Current:** R3F component with Three.js positioning (world → screen space).

**Proposed:** React DOM labels with JavaScript world-to-screen projection:
- Phaser enables3d provides world-to-2D projection helpers
- React component projects unit positions to screen-space every frame (in a useEffect or useLayoutEffect)
- Renders as fixed-position div with CSS

**Why React?** DOM labels are easier to style (fonts, shadows, color). Projection math is reusable. This is a standard pattern in web games.

Alternative: Keep in enable3d as Text objects if needing 3D depth sorting.

---

### 5.5 Camera

**Current:** React hook (SphereOrbitCamera.tsx), controls a Three.js camera.

**Proposed:** Phaser Camera2D:
- WASD/arrow keys to rotate globe → Phaser keyboard input
- Scroll wheel to zoom → Phaser mouse wheel input
- Drag to pan → Phaser pointer input (if wanted)
- Phaser camera has built-in easing, bounds, follow targets

**Why Phaser?** Game cameras are deeply integrated with game loop and input. Phaser's camera is designed for this. Pulling it out of React hooks makes input handling centralized.

---

### 5.6 Board Input (Click to Select / Move / Attack)

**Current:** React component (BoardInput.tsx), attaches Phaser input listeners.

**Proposed:** Move all logic into Phaser scene:
```typescript
// Phaser scene setup:
this.input.on('pointerdown', (pointer) => {
  const tile = raycastTile(pointer); // Phaser/enable3d raycasting
  if (canSelect(tile)) selectTile(tile);
});

// Emit event for React to listen:
selectTile(tile) {
  this.events.emit('tileSelected', tile);
  // Also update ECS world
}
```

React can subscribe to `scene.events.on('tileSelected', ...)` if needed for HUD updates.

**Why Phaser?** Input on the game board is 100% a game engine concern. React components listening to Phaser events is fine, but the authority should be Phaser.

---

## 6. Phaser Scene Structure (Proposed)

```typescript
// src/phaser/SyntheteriaScene.ts
export class SyntheteriaScene extends Scene {
  // Game state refs
  world: World; // Koota ECS
  board: GeneratedBoard;
  camera: Phaser.Cameras.Scene2D.Camera;

  // Input state
  selectedTile: Tile | null = null;
  hoveredEntity: Entity | null = null;

  // Layers
  terrainLayer: Container;  // Three.js meshes
  unitLayer: Container;
  buildingLayer: Container;
  effectsLayer: Container;  // Particles, effects

  create() {
    // Setup camera
    this.setupCamera();

    // Setup input listeners
    this.input.on('pointerdown', this.onPointerDown.bind(this));
    this.input.on('pointermove', this.onPointerMove.bind(this));
    this.input.keyboard?.on('keydown', this.onKeyDown.bind(this));

    // Render board
    this.renderBoard();
  }

  update(time, delta) {
    // Update camera
    this.updateCamera(delta);

    // Update game logic (movement lerps, animations)
    // This happens via Koota systems, not directly in update
    // But we can use Phaser tweens for smooth animations
  }

  onPointerDown(pointer) {
    const tile = this.raycastTile(pointer);
    if (tile) this.selectTile(tile);
  }

  // ... other handlers
}
```

---

## 7. Communication: Phaser ↔ React ↔ Koota

### Data Flow

```
Koota ECS World (single source of truth)
    ↑                         ↑
    │                         │
  Phaser Scene            React Components
  (game logic,              (UI rendering,
   input, animation)        state display)
    │                         │
    └──────── Events / Zustand ────────┘
             (pub/sub bridge)
```

### Pattern 1: Game Event → UI Update

```typescript
// Phaser scene (after unit moves):
moveUnit(unit, targetTile) {
  updateECSWorld(unit, targetTile);
  this.events.emit('unitMoved', { unit, targetTile });
}

// React component:
useEffect(() => {
  const unsub = scene.events.on('unitMoved', (data) => {
    setSelectedUnit(data.unit);
    playMoveSound();
  });
  return () => unsub();
}, [scene]);
```

### Pattern 2: UI Action → Game State

```typescript
// React component (user clicks "End Turn"):
onClick={() => {
  scene.events.emit('playerEndTurn');
}}

// Phaser scene listener:
this.events.on('playerEndTurn', () => {
  advanceTurnSystem(this.world);
  // Turn advances, ECS updates, Phaser re-renders next frame
});
```

### Pattern 3: Shared Data Access

```typescript
// Both Phaser and React can query the ECS world directly:
// Phaser in update():
const playerResources = getPlayerResources(this.world);
updateHUDDisplay(playerResources); // Tell React to re-render

// React in render:
const playerResources = getPlayerResources(world);
return <HUD resources={playerResources} />;
```

---

## 8. Migration Roadmap (High-Level)

1. **Phase 1:** Create SyntheteriaScene (Phaser + enable3d). Migrate terrainRenderer, unitRenderer.
2. **Phase 2:** Migrate camera (Phaser Camera2D) and input (Phaser input handlers).
3. **Phase 3:** Replace R3F tweens with Phaser tweens (unit movement, combat effects).
4. **Phase 4:** Replace useEffect timer chains with Phaser timers/tweens (TurnPhaseOverlay, toast animations).
5. **Phase 5:** Keep React for modals, forms, lists (tech tree, unit roster, settings).
6. **Phase 6:** Integrate Zustand or Phaser events as the Phaser ↔ React bridge.

---

## 9. Benefits of This Split

| Benefit | Evidence |
|---------|----------|
| **Clear responsibility** | Each tool does what it's designed for. Less architectural confusion. |
| **Better performance** | Phaser's update loop is 60fps native. No React re-renders for game state. Only HUD updates trigger React. |
| **Easier testing** | Phaser scenes are testable; so are React components. Decouple them via events. |
| **Familiar patterns** | Phaser games typically use DOM overlays. This mirrors Unreal, Unity, Godot patterns. |
| **Code reuse** | Phaser plugins/examples (camera shake, tweens, input zones) apply directly. React overlays use standard web libraries (React Query, React Hook Form). |
| **Maintainability** | Game logic lives in one place (Phaser scene + Koota ECS). UI state in another (React). Less intertwining. |

---

## 10. Gotchas & Mitigations

| Gotcha | Risk | Mitigation |
|--------|------|-----------|
| **Event spaghetti** | Too many Phaser.events channels → hard to trace | Keep a registry of all events; document in PHASER_EVENTS.md |
| **Two canvases** | WebGL context conflict (we have this now!) | Ensure only one THREE.WebGLRenderer. Phaser manages it via enable3d. Revoke old R3F canvas on mount. |
| **State sync race** | Phaser mutates ECS, React reads stale copy | React should always read from ECS directly, not cached props. Or use a state store (Zustand) that both update. |
| **Animation timing** | Phaser tween finishes before React re-renders | Use Phaser tween callbacks to emit events. React listens and updates. |
| **React DevTools** | Can't inspect Phaser scene objects | Use Phaser debug tools. Dump scene state to console if needed. |

---

## Recommendation

**Adopt the Phaser + React hybrid pattern:**

- **Phaser owns:** Game loop, board rendering, camera, input, game-world animations, particles
- **React owns:** Modals, forms, overlays (tech tree, unit roster, settings), tooltips, responsive HUD
- **Bridge:** Phaser events ↔ React event listeners. Both read from Koota ECS world.

This aligns with industry patterns (CivRev, Polytopia, Godot games with web overlays) and leverages each tool's strengths.

**Next step:** Implement SyntheteriaScene and test the Phaser + enable3d stack with real gameplay.
