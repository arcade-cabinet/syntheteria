# Input & Interaction Architecture

**Status:** LIVE
**Last updated:** 2026-03-12

This document is the single source of truth for how the player interacts with the game world. All agents should read this before touching input handling, UI panels, or contextual action surfaces.

---

## Core Principle: Radial Menu Is The Only Contextual Action Surface

All contextual actions (build, repair, fabricate, move, attack, hack, survey, reclaim, sector operations) are accessed through a **composable dual-layer SVG radial menu**. There are no persistent bottom panels, no bottom sheets, no floating toolbars for actions.

**Persistent HUD elements** (always visible):
- `ResourceStrip` — top bar (resources, storm %, day, pause)
- `Notifications` — combat alerts, merge events
- `Minimap` — tactical overview
- `ThoughtOverlay` — AI narration

**Contextual information surfaces** (on demand / in-world anchored):
- bot speech bubbles / anchored site briefs
- POI or sector callouts
- modal briefings for high-commitment actions

**Contextual HUD element** (on demand):
- `RadialMenu` — ALL contextual actions

**Deleted/superseded:**
- `SelectedInfo` panel — replaced by radial menu
- `BuildToolbar` — replaced by radial menu Build category
- `BottomSheet` — deleted, radial menu replaces it entirely
- `LocationPanel` as a primary action owner — superseded by anchored briefings and radial-owned actions
- `TerrainRenderer` as the world ground substrate — replaced by structural floors plus GLB structure composition

---

## Input Mapping

### Desktop
| Input | Action |
|-------|--------|
| Left-click | Select unit/building, or move selected unit to empty ground |
| Right-click | Open radial menu at cursor (context-sensitive) |
| Scroll wheel | Continuous zoom |
| Z key | Cycle zoom tiers (tactical → default → strategic → world) |
| WASD / arrows | Pan camera |
| Middle-click drag | Pan camera |
| Escape | Cancel building placement |

### Mobile
| Input | Action |
|-------|--------|
| Single tap | Select unit/building, or move selected unit to empty ground |
| Long-press (500ms) | Open radial menu at touch point (context-sensitive) |
| Two-finger drag | Pan camera |
| Pinch | Zoom camera |
| Double-tap | Cycle zoom tiers |
| Touch-drag on radial | Navigate radial menu petals |
| Release on petal | Execute action |

---

## Radial Menu Architecture

### Decomposition Pattern

```
radialMenu.json (config — visual appearance only)
    |
radialMenu.ts (system — provider registry, hit testing, state machine)
    |
radialProviders.ts (providers — each system registers its actions)
    |
RadialMenu.tsx (renderer — pure SVG, reads state, no game logic)
    |
UnitInput.tsx (trigger — right-click/long-press opens menu)
```

### Provider System

Each game system registers a **provider** at module scope via `registerRadialProvider()`:

```ts
registerRadialProvider({
  id: "build",
  category: { id: "build", label: "Build", icon: "gear", tone: "default", priority: 30 },
  getActions: (ctx) => {
    // Return available actions based on ECS state
    return [{ id: "build_rod", label: "Rod", icon: "bolt", tone: "power", enabled: canAfford, onExecute: () => setActivePlacement("lightning_rod") }];
  },
});
```

**Categories** (inner ring, priority-ordered clockwise from 12 o'clock):

| Priority | Category | Context | Description |
|----------|----------|---------|-------------|
| 10 | Move | unit selected, player | Move, patrol |
| 20 | Combat | unit selected, player | Attack, hack |
| 30 | Build | empty tile or unit | Lightning rod, fabricator, relay |
| 35 | Fabricate | fabrication unit | Per-recipe actions |
| 40 | Repair | damaged entity, player | Per-component repair |
| 50 | Survey | nearby site, unknown sector feature | Survey, inspect, reclaim |
| 60 | Sector | sector site, district infrastructure | Brief, enter subsystem, transit |
| 90 | System | always | Pause, speed, lab |

### Dual-Layer Behavior

1. **Inner ring** = categories. Drawn as arc petals around center.
2. **Hover inner petal** → **outer ring** springs open with specific actions centered around it.
3. **Single-action categories** execute immediately (skip outer ring).
4. **Release on outer petal** → execute action → menu closes.
5. **Tap backdrop** → dismiss menu.

### Tone Overrides

Certain categories use different accent colors:
- **Power** (amber): `#f6c56a` stroke/icon
- **Combat** (red): `#ff8f8f` stroke/icon
- **Signal** (cyan): `#89d9ff` stroke/icon
- **Default** (mint): `#6ff3c8` stroke/icon

### Adding New Actions

To add a new system's actions to the radial menu:
1. Call `registerRadialProvider()` from your system's module scope
2. Define a category (or reuse existing) with a priority for clockwise ordering
3. Return actions from `getActions(ctx)` — return `[]` for irrelevant contexts
4. Import your providers file in `GameUI.tsx` for side-effect registration

No central action list to maintain. The menu composes dynamically at open time.

---

## Zoom Tier System

4 zoom tiers with snap-to behavior:

| Tier | Tiles Across | Structure Detail | Unit Detail | Network Lines |
|------|-------------|-----------------|-------------|---------------|
| Tactical | 4.5 | Full | Full | Thick, animated |
| Default | 7.5 | Silhouette | Icon | Medium |
| Strategic | 12 | Icon | Badge | Thin, steady |
| World | 22 | Dot | Hidden | Faint tracery |

**Snap-to**: Double-tap (mobile) or Z key (desktop) cycles tiers with ~300ms exponential lerp.

**Config**: `src/config/zoomTiers.json`
**System**: `src/systems/zoomTier.ts` (pure TS, per-frame)
**Camera integration**: `src/input/TopDownCamera.tsx`

---

## Infrastructure Overlay

Visual representation of signal, power, transit, and subsurface logistics links across the machine world.

**Config**: `src/config/networks.json`
**System**: `src/systems/networkOverlay.ts` (pure TS, sim tick)
**Renderer**: `src/rendering/NetworkLineRenderer.tsx`

| Network | Color | Animation |
|---------|-------|-----------|
| Signal relay | Cyan (player) / Red (cultist) | Pulsing opacity sine wave |
| Power feed | Amber | Glow scales with throughput |
| Transit / logistics conduit | Mint | Embedded directional sweep |

The long-term target is not a field of exposed belts crossing terrain tiles. The visual language should imply embedded or subsurface machine infrastructure, with overlays only surfacing what the player needs to understand.

---

## Ground Fog

Instanced translucent planes at ground level for atmospheric depth.

**Renderer**: `src/rendering/GroundFog.tsx`
**Config**: `src/config/weather.json` (fogDensity per storm profile)

40 patches scattered across terrain, drifting south with wind. Opacity scales with `stormIntensity * fogDensity`.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/input/UnitInput.tsx` | Tap, right-click, long-press handlers |
| `src/input/TopDownCamera.tsx` | Camera pan/zoom, snap-to, keyboard |
| `src/systems/radialMenu.ts` | Radial menu state machine + provider registry |
| `src/systems/radialProviders.ts` | All game system action providers |
| `src/ui/RadialMenu.tsx` | SVG radial renderer (react-native-svg) |
| `src/ui/GameUI.tsx` | Top-level HUD composition |
| `src/config/radialMenu.json` | Radial visual config |
| `src/config/zoomTiers.json` | Zoom tier thresholds + LOD params |
| `src/config/networks.json` | Infrastructure overlay visual params |
| `src/systems/zoomTier.ts` | Zoom tier detection system |
| `src/systems/networkOverlay.ts` | Overlay geometric computation |
| `src/rendering/NetworkLineRenderer.tsx` | Infrastructure line renderer |
| `src/rendering/GroundFog.tsx` | Atmospheric fog renderer |
