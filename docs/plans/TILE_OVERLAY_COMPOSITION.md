# Tile Overlay Composition — Syntheteria

## Context

Syntheteria is not a traditional 4X with human opponents building roads between cities. The player is a machine intelligence. "Trade" is information exchange over signal relays. Physical goods move on high-speed belt networks, not roads. Both the player and opposing forces build their own colored traceries of connectivity across the hex map.

This document defines how multiple visual layers compose on a single hex tile, how network lines route through tiles, and how we guarantee precise alignment at every zoom level.

## 1. The Hex as a Composition Surface

Each hex tile in the world grid (`HEX_SIZE=2`, flat-top, 4 world units wide) is a stack of visual layers. Not all layers are present on every hex. The composition must be predictable — a player should be able to glance at any tile and instantly parse what's there.

### Layer Stack (bottom to top)

| Z-Order | Layer | What It Shows | Render Method |
|---------|-------|---------------|---------------|
| 0 | **Terrain base** | Biome texture from atlas | PlaneGeometry + atlas material (existing) |
| 1 | **Ownership wash** | Faction territory tint | Additive color plane, 15-20% opacity |
| 2 | **Network lines** | Signal relays, power feeds, belt routes | Line geometry through hex centers, emissive material |
| 3 | **Resource markers** | Scrap nodes, ore veins, e-waste deposits | Small icons at fixed sub-positions |
| 4 | **Structure model** | Building, lightning rod, fabricator | 3D model, always hex center |
| 5 | **Unit model(s)** | Drones, bots, hostile machines | 3D model, center or offset position |
| 6 | **Fog overlay** | Unexplored / abstract / detailed | Darkening plane with alpha, top-most terrain layer |
| 7 | **Selection ring** | Player-selected tile highlight | Emissive hex outline, pulsing |
| 8 | **Interaction hint** | "Tap to survey" / "Enter city" prompt | Floating label above tile (UI overlay, not 3D) |

### Why This Order

- Terrain is the ground truth — always visible if fog permits
- Ownership wash sits on terrain so network lines read OVER colored territory
- Network lines are the primary strategic readability layer — they need to be instantly scannable
- Resource markers sit above networks but below structures, because structures consume resources from their tile
- Structures dominate center — they're the most important thing on a tile
- Units sit on top because they move and the player needs to see them above everything
- Fog covers all game content — nothing bleeds through undiscovered territory
- Selection and interaction are player-intent layers, always topmost

## 2. Network Line Rendering

### Three Network Types

| Network | Visual | Color | Thickness | Animation |
|---------|--------|-------|-----------|-----------|
| **Signal relay** | Thin emissive line | Player: cyan `#89d9ff` / Enemy: red `#ff8f8f` / Neutral: white 40% | 0.06 world units (~1.5% hex width) | Pulse particles flowing along line, direction = data flow |
| **Power feed** | Medium emissive line | Amber `#f6c56a`, intensity scales with load | 0.10 world units (~2.5% hex width) | Steady glow, brightness = power throughput / capacity |
| **Belt route** | Chunky conveyor track | Mint `#6ff3c8` segments with dark gaps | 0.16 world units (~4% hex width) | Animated dashes moving along path, speed = throughput |

### Routing Through Hexes

Network lines connect hex **centers** to each other along the shortest edge-to-edge path. On a flat-top hex, there are 6 possible edge connections (0°, 60°, 120°, 180°, 240°, 300°).

```
      ╱‾‾╲
    ╱  NE  ╲
   │   NW    │
   │  CENTER │
   │   SW    │
    ╲  SE  ╱
      ╲__╱
```

**Single network through a tile:**
- Line enters from one edge, passes through center, exits opposite or adjacent edge
- The line curves slightly through center (bezier with 0.15 hex-radius control point offset) to avoid hard angles

**Multiple networks through a tile:**
- Lines are offset from center by fixed amounts perpendicular to their direction
- First network: centered on the hex-center-to-edge axis
- Second network: offset +0.12 world units perpendicular
- Third network: offset -0.12 world units perpendicular
- Maximum 3 parallel networks per edge connection (more would be visually unreadable)

**Intersection behavior:**
- When two networks cross at a hex center, they form a visible **junction node** — a small emissive circle (radius 0.14) at hex center
- Junction nodes pulse brighter than lines
- New routes automatically connect into existing junctions rather than crossing over them
- This is the "connect into the network automatically" behavior the user described

### Network Construction Logic

Robots building networks choose the most efficient mechanism:
1. **Signal relay** is established first (cheapest, fastest) — just needs line-of-sight between relay nodes
2. **Power feed** extends from lightning rods along signal relay paths — follows existing signal topology
3. **Belt route** is built only where physical goods need to move — most expensive, follows power/signal where possible

When a robot needs to connect City A to City B:
1. Pathfind through hex grid (avoiding water/mountain, preferring existing junctions)
2. If signal relay already exists on the path, belt piggybacks on it (visual: belt line runs parallel to signal line)
3. If no signal exists, lay signal first, then belt
4. Power extends automatically from nearest rod through the new signal path

### Faction-Colored Traceries

Each faction's signal network uses its semantic color:
- **Player**: cyan `#89d9ff` signal, amber `#f6c56a` power, mint `#6ff3c8` belt
- **Hostile (cultist-controlled)**: red `#ff8f8f` signal, dark amber `#c4823a` power, red-orange `#e06040` belt
- **Rogue AI**: white 40% signal, gray power, no belt (feral, no infrastructure)
- **Neutral/unclaimed**: no networks

When player captures enemy territory, network lines transition color from enemy to player over 2 seconds (lore: signal reprogramming).

## 3. Placement & Alignment Rules

### The Hex Coordinate System

Every placeable element references the hex center as origin `(0, 0)` in local tile space. Positions are defined as fractions of hex radius (`HEX_SIZE = 2`, so radius = 2 world units).

### Structure Placement: Always Center

Structures (buildings, lightning rods, fabricators, city cores) are ALWAYS placed at hex center `(0, 0)`. No exceptions. This guarantees:
- Structures never overlap across tiles
- Network lines can always route through the predictable center point
- Zoom-level scaling never causes alignment drift

Structure model scale: **60% of hex width** at tactical zoom. At strategic zoom, replaced by a simplified icon of the same footprint.

### Unit Placement: Center or Slotted Offset

| Condition | Unit Position |
|-----------|---------------|
| Unit alone on tile | Center `(0, 0)` |
| Unit + structure | **Offset slot**: `(0.55, 0, 0.55)` from center (SE quadrant, ~39% of hex radius) |
| 2 units, no structure | Positions `(-0.4, 0, 0)` and `(0.4, 0, 0)` (flanking center) |
| 2 units + structure | Slots at `(0.55, 0, 0.55)` and `(-0.55, 0, 0.55)` (south flanks) |
| 3+ units | Stack counter badge, show only lead unit model |

Unit model scale: **40% of hex width** at tactical zoom.

### Resource Marker Placement: Corner Slots

Resource markers occupy 4 fixed sub-positions on the hex, defined relative to center:

| Slot | Position (fraction of radius) | Usage |
|------|------|-------|
| NE | `(0.65, 0, -0.38)` | Primary resource (scrap metal) |
| NW | `(-0.65, 0, -0.38)` | Secondary resource (e-waste) |
| SE | `(0.65, 0, 0.38)` | Tertiary resource (intact components) |
| SW | `(-0.65, 0, 0.38)` | Special (memory fragment, tech cache) |

Resource markers are small (12% of hex width), use semantic colors (mint for harvestable, amber for depleted, red for contested), and include a small quantity label.

### Alignment Guarantees

All placement positions are computed from hex center using **fixed fractional offsets of `HEX_SIZE`**. This means:
- At any zoom level, the spatial relationships between layers are identical
- No floating-point drift between zoom in and zoom out
- Models scale proportionally to hex size in view space
- Network lines are geometrically anchored to hex centers, not pixel positions

```typescript
// Example: compute unit offset position for a unit sharing a tile with a structure
const UNIT_OFFSET_FRACTION = 0.55;
function getUnitSlotPosition(hexCenter: Vector3, slotIndex: number): Vector3 {
  const angle = slotIndex === 0 ? Math.PI / 4 : (3 * Math.PI) / 4; // SE or SW
  return new Vector3(
    hexCenter.x + Math.cos(angle) * HEX_SIZE * UNIT_OFFSET_FRACTION,
    hexCenter.y,
    hexCenter.z + Math.sin(angle) * HEX_SIZE * UNIT_OFFSET_FRACTION,
  );
}
```

## 4. Zoom Tier Visual Transitions

Different zoom levels show different representations of the same tile content. This is NOT just scaling — it's **level of detail for information density**.

| Zoom Tier | Terrain | Structures | Units | Networks | Resources |
|-----------|---------|------------|-------|----------|-----------|
| **Tactical** (4-5 hex across) | Full atlas texture | 3D model with detail | 3D model, component visible | Thick lines with animated particles | Individual markers with quantities |
| **Default** (7-8 hex across) | Full atlas texture | Simplified silhouette | Icon badge on hex | Medium lines with glow | Small dots, color only |
| **Strategic** (11-13 hex across) | Solid biome color | Ownership flag/icon | Stack count badge | Thin lines, steady | Hidden |
| **World** (20+ hex across) | Solid biome color | City dot only | Hidden | Faint tracery lines | Hidden |

### Transition Rules

- Transitions between tiers are smooth (300ms lerp of model scale/opacity)
- At each tier boundary, the detail model fades out while the simplified version fades in
- Network lines scale thickness with zoom but keep a minimum 1px screen-space width
- Resource markers snap to visible/hidden (no partial fade — they're either useful or noise)

## 5. Multiple Overlays on One Tile — Visual Priority

When a tile has ALL layers active (ownership + 3 networks + structure + unit + resources + selection), the composition must remain readable. Priority rules:

1. **Structure + unit are king** — their silhouettes must never be obscured by network lines or resource markers
2. **Network lines route UNDER models** — lines use a y-offset of -0.02 to render just above terrain but below model feet
3. **Resource markers hide when structure is present** — if a structure occupies the tile, resource markers are assumed consumed/integrated and hidden
4. **Selection ring renders at terrain level** — not competing with model space
5. **Ownership wash is subtle** — 15-20% opacity, never dominant
6. **Junction nodes dim when structure is present** — the structure itself implies the junction

### Maximum Visual Complexity Budget

No tile should ever show more than:
- 1 terrain texture
- 1 ownership wash
- 3 network lines (1 signal + 1 power + 1 belt maximum through any single edge)
- 1 structure
- 2 visible units (3+ shows stack badge)
- 2 resource markers (structure hides the rest)
- 1 selection state

This caps the "visual weight" of any tile and prevents the Civ VI problem of tiles becoming unreadable collages.

## 6. Implementation Approach

### Phase 1: Overlay Infrastructure
- Add `TileOverlayRenderer.tsx` that reads hex state and composes layers
- Define `TileOverlayState` type: ownership, networks, resources, selection
- Implement hex-center-aligned placement functions

### Phase 2: Network Line Geometry
- `NetworkLineRenderer.tsx` using Three.js `TubeGeometry` or instanced line segments
- Emissive materials with faction color
- Edge-to-edge routing with bezier curves through hex centers
- Junction node rendering at multi-network intersections

### Phase 3: Zoom-Tier LOD
- Hook into camera zoom ref to determine active tier
- Swap model representations at tier boundaries
- Scale network line thickness and resource marker visibility

### Phase 4: Animation
- Signal pulse particles (shader-based, flowing along line path)
- Belt dash animation (UV offset on conveyor material)
- Power glow intensity tied to actual power throughput
- Junction node pulse

## 7. How This Connects to Mobile Viewport

The tile overlay system directly serves the mobile viewport design:
- At **default phone zoom** (7 hex across), each hex is ~53dp — enough for a silhouette structure + colored network lines + ownership wash
- Network traceries are the PRIMARY strategic readability cue at this zoom — the player scans the map for connectivity patterns, not individual unit stats
- Tapping any tile opens the bottom sheet with full detail
- The zoom tier system ensures that at every zoom level, the visual language is designed for THAT distance — nothing becomes "unrecognizable muddle"
