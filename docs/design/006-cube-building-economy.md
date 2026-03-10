# GDD-006: Cube Building Block Economy — Physical Materials as Architecture

**Status:** Draft
**Date:** 2026-03-09
**Scope:** The core unique mechanic of Syntheteria — resources are physical 0.5m cubes that you harvest, compress, carry, and stack into walls, machines, and territory structures. No abstract inventories. Your base is literally made of the cubes you mined.

---

## 1. Material Types & Properties

Every cube in the game is one of six material types. Each material has distinct strategic properties that determine how and when it gets used in construction, machines, and defense. Materials are defined in `config/cubeMaterials.json` and affect gameplay through five stat axes: hardness, weight, conductivity, rarity, and compression threshold.

### 1.1 Material Table

| Material | Hardness | Weight | Conductivity | Rarity | Compression Threshold |
|----------|----------|--------|-------------|--------|----------------------|
| **Rock** | 0.5 | 1.0 | 0.0 | Abundant | 40 powder |
| **Scrap Iron** | 1.0 | 1.5 | 0.1 | Common | 60 powder |
| **Iron** | 1.8 | 2.0 | 0.15 | Processed | N/A (smelted) |
| **Copper** | 0.8 | 1.2 | 1.0 | Moderate | 80 powder |
| **Silicon** | 0.6 | 0.8 | 0.7 | Rare | 100 powder |
| **Titanium** | 3.0 | 2.5 | 0.2 | Very Rare | 120 powder |

### 1.2 Material Definitions

**Rock**
The planet's base substrate. Everywhere. Cheap, fast to compress, weak. A wall of rock cubes stops a scout bot but crumbles under sustained fire. Good for bulk construction early game when nothing better is available. Later, rock becomes insulation material inside machine assemblies and disposable filler for siege walls you expect to lose.

- Hardness: 0.5 (wall HP multiplier: 50 HP per cube)
- Weight: 1.0 (no carry speed penalty)
- Conductivity: 0.0 (cannot carry power or signal)
- Rarity: Abundant (40% of surface deposits)
- PBR treatment: Gray-brown base (RGB 140, 130, 115), roughness 0.85, metalness 0.05. Normal map shows granular sediment texture with hairline fracture lines. Slight warm undertone from iron oxide traces. No emissive. Edge wear shows lighter mineral underneath.

**Scrap Iron**
The remnant metal of the machine planet's previous industrial age. Found in slag heaps, ruin fields, and corroded surface plates. Your primary structural material through early and mid game. Stronger than rock, widely available, and the feedstock for smelting into proper iron.

- Hardness: 1.0 (wall HP multiplier: 100 HP per cube)
- Weight: 1.5 (85% carry speed)
- Conductivity: 0.1 (minimal — not useful for wiring)
- Rarity: Common (30% of surface deposits)
- PBR treatment: Dark gray base with orange-brown rust patches (RGB 110, 85, 65), roughness 0.75, metalness 0.7. Normal map shows rivet grid pattern (48px spacing), seam lines (64px spacing), and pitting from corrosion. Heavy rust wear overlay concentrated on edges and bottom face. Bolt details at corners.

**Iron** (Processed)
Scrap iron cubes fed through a furnace produce iron cubes — cleaner, stronger, and required for machine assembly. You never mine iron directly; you smelt it from scrap. This creates a natural production bottleneck that gates mid-game progression.

- Hardness: 1.8 (wall HP multiplier: 180 HP per cube)
- Weight: 2.0 (75% carry speed)
- Conductivity: 0.15 (marginal — insufficient for primary wiring)
- Rarity: Processed (furnace recipe: 2 scrap iron cubes -> 1 iron cube)
- PBR treatment: Clean metallic gray (RGB 175, 180, 190), roughness 0.3, metalness 0.9. Normal map shows brushed steel grain with panel seam lines (48px spacing) and inset detail (6px margin, 0.3 depth). Minimal wear — slight edge scratching. Subtle blue-shift in specular highlights.

**Copper**
Found in veins threading through cliff faces and ravine walls, identifiable by the distinctive green patina. Copper is the conductivity material — required for any wiring, circuit construction, or power distribution. Without copper, you have machines with no way to connect them.

- Hardness: 0.8 (wall HP multiplier: 80 HP per cube)
- Weight: 1.2 (90% carry speed)
- Conductivity: 1.0 (maximum — primary power/signal conductor)
- Rarity: Moderate (15% of deposits, found in specific biomes)
- PBR treatment: Warm orange-brown base with green patina edges (base RGB 185, 115, 65, patina RGB 120, 180, 130), roughness 0.5, metalness 0.6. Normal map shows horizontal seam lines (32px spacing) with inset border. Edge wear reveals bright orange copper underneath patina. Oxidation patterns procedurally generated per cube instance (seed from world position).

**Silicon**
Glassy crystalline outcrops found in processor graveyards and crystal fields. Rare and fragile, but essential for electronics, signal processing, and compute components. Silicon cubes have a distinctive translucent quality that makes them instantly recognizable in stockpiles.

- Hardness: 0.6 (wall HP multiplier: 60 HP per cube)
- Weight: 0.8 (95% carry speed — lightest material)
- Conductivity: 0.7 (high — used for signal, not raw power)
- Rarity: Rare (8% of deposits, biome-restricted)
- PBR treatment: Blue-gray base with translucent quality (RGB 140, 155, 185), roughness 0.08, metalness 0.3. Hex pattern normal map (16px cells, 0.15 depth). Translucency factor 0.3 — light passes through edges. Internal glow effect (color #8899cc, intensity 0.15) creates a subtle cold luminance. No rust or wear — silicon fractures cleanly, shown as sharp crack lines on damaged cubes.

**Titanium**
The premium material. Dark metallic bands exposed in mountain faces and deep ravines. Extremely hard to find, extremely hard to harvest (requires Plasma Cutter or better), and extremely strong. A wall of titanium cubes is nearly impenetrable. Titanium machines run longer, break less, and hit harder.

- Hardness: 3.0 (wall HP multiplier: 300 HP per cube)
- Weight: 2.5 (70% carry speed — heaviest material)
- Conductivity: 0.2 (moderate — usable but not optimal for wiring)
- Rarity: Very Rare (3% of deposits, deep terrain only)
- PBR treatment: Bright cool silver (RGB 200, 205, 215), roughness 0.2, metalness 0.85. Normal map shows panel seams (48px spacing), bolt grid (64px spacing, radius 2, height 0.5), and inset detail (6px margin, 0.3 depth). Heat-blue wear pattern — iridescent purple-blue tint (RGB 100, 90, 160) at heat-stressed areas. Edge bevel 0.02. The most visually premium cube — catches light with sharp specular highlights.

### 1.3 Material Config

```jsonc
// config/cubeMaterials.json
{
  "rock": {
    "displayName": "Rock",
    "hardness": 0.5,
    "weight": 1.0,
    "conductivity": 0.0,
    "rarity": "abundant",
    "compressionThreshold": 40,
    "hpPerCube": 50,
    "carrySpeedMultiplier": 1.0,
    "pbr": {
      "baseColor": [140, 130, 115],
      "metalness": 0.05,
      "roughness": 0.85,
      "normalDetails": [
        { "type": "seams", "spacing": 96, "width": 1, "depth": 0.2, "direction": "both" }
      ],
      "edgeBevel": 0.01,
      "wearOverlay": "edge_wear",
      "wearIntensity": 0.15
    }
  },
  "scrap_iron": {
    "displayName": "Scrap Iron",
    "hardness": 1.0,
    "weight": 1.5,
    "conductivity": 0.1,
    "rarity": "common",
    "compressionThreshold": 60,
    "hpPerCube": 100,
    "carrySpeedMultiplier": 0.85,
    "pbr": {
      "baseColor": [110, 85, 65],
      "metalness": 0.7,
      "roughness": 0.75,
      "normalDetails": [
        { "type": "seams", "spacing": 64, "width": 2, "depth": 0.5, "direction": "both" },
        { "type": "bolts", "spacing": 48, "radius": 3, "height": 0.4 }
      ],
      "edgeBevel": 0.02,
      "wearOverlay": "heavy_rust",
      "wearIntensity": 0.8
    }
  },
  "iron": {
    "displayName": "Iron",
    "hardness": 1.8,
    "weight": 2.0,
    "conductivity": 0.15,
    "rarity": "processed",
    "compressionThreshold": null,
    "smeltRecipe": { "input": "scrap_iron", "inputCount": 2, "outputCount": 1 },
    "hpPerCube": 180,
    "carrySpeedMultiplier": 0.75,
    "pbr": {
      "baseColor": [175, 180, 190],
      "metalness": 0.9,
      "roughness": 0.3,
      "normalDetails": [
        { "type": "seams", "spacing": 48, "width": 1, "depth": 0.4, "direction": "both" },
        { "type": "inset", "margin": 6, "depth": 0.3 }
      ],
      "edgeBevel": 0.03,
      "wearOverlay": "scratches",
      "wearIntensity": 0.15
    }
  },
  "copper": {
    "displayName": "Copper",
    "hardness": 0.8,
    "weight": 1.2,
    "conductivity": 1.0,
    "rarity": "moderate",
    "compressionThreshold": 80,
    "hpPerCube": 80,
    "carrySpeedMultiplier": 0.9,
    "pbr": {
      "baseColor": [185, 115, 65],
      "patinaColor": [120, 180, 130],
      "patinaIntensity": 0.4,
      "metalness": 0.6,
      "roughness": 0.5,
      "normalDetails": [
        { "type": "seams", "spacing": 32, "width": 1, "depth": 0.3, "direction": "horizontal" },
        { "type": "inset", "margin": 8, "depth": 0.2 }
      ],
      "edgeBevel": 0.03,
      "wearOverlay": "edge_wear",
      "wearIntensity": 0.4
    }
  },
  "silicon": {
    "displayName": "Silicon",
    "hardness": 0.6,
    "weight": 0.8,
    "conductivity": 0.7,
    "rarity": "rare",
    "compressionThreshold": 100,
    "hpPerCube": 60,
    "carrySpeedMultiplier": 0.95,
    "pbr": {
      "baseColor": [140, 155, 185],
      "metalness": 0.3,
      "roughness": 0.08,
      "normalDetails": [
        { "type": "hex_pattern", "size": 16, "depth": 0.15 }
      ],
      "edgeBevel": 0.04,
      "translucency": 0.3,
      "internalGlow": "#8899cc",
      "internalGlowIntensity": 0.15,
      "wearOverlay": "none"
    }
  },
  "titanium": {
    "displayName": "Titanium",
    "hardness": 3.0,
    "weight": 2.5,
    "conductivity": 0.2,
    "rarity": "very_rare",
    "compressionThreshold": 120,
    "hpPerCube": 300,
    "carrySpeedMultiplier": 0.7,
    "pbr": {
      "baseColor": [200, 205, 215],
      "metalness": 0.85,
      "roughness": 0.2,
      "normalDetails": [
        { "type": "seams", "spacing": 48, "width": 1, "depth": 0.4, "direction": "both" },
        { "type": "bolts", "spacing": 64, "radius": 2, "height": 0.5 },
        { "type": "inset", "margin": 6, "depth": 0.3 }
      ],
      "edgeBevel": 0.02,
      "wearOverlay": "heat_blue",
      "wearIntensity": 0.6
    }
  }
}
```

### 1.4 Strategic Material Roles

```
Early Game:    Rock (bulk fill) + Scrap Iron (structure)
               └── Scrap is everywhere, rock even more so.
                   Build ugly but functional walls and first furnace.

Mid Game:      Iron (strong structure) + Copper (wiring/power)
               └── Smelting scrap into iron doubles wall strength.
                   Copper unlocks power connections between machines.

Late Game:     Silicon (electronics/signal) + Titanium (premium everything)
               └── Silicon enables compute network, advanced fabrication.
                   Titanium walls and machines are nearly unbreakable.
```

---

## 2. Cube Physics & Snapping

### 2.1 Cube as Rigid Body

Every material cube in the world is a 0.5m Rapier rigid body with a cuboid collider. Cubes are the fundamental unit of construction, storage, trade, and combat. There are no abstract resource counters. If you have 40 iron cubes, there are 40 physical iron cubes sitting somewhere in the world that enemies can see, steal, or destroy.

```typescript
// Cube entity composition (Koota traits)
entity.add(MaterialCube, {
  material: 'iron',     // material type key
  quality: 1.0,         // 0-1, degraded by damage during compression or combat
  hp: 180,              // current HP (from hpPerCube * quality)
  maxHp: 180,           // max HP for this material
  gridPosition: null,   // [x, y, z] grid coords when placed, null when loose
  placed: false,        // true when snapped to grid (part of structure)
  damaged: false,       // true when HP < maxHp * 0.5 (visual crack state)
});
```

Rapier rigid body configuration per cube:
- Type: `dynamic` when loose (falls, rolls, can be pushed)
- Type: `kinematicPosition` when placed on grid (locked in position, immovable by physics)
- Collider: `cuboid(0.25, 0.25, 0.25)` — half-extents for 0.5m cube
- Friction: 0.8 (cubes don't slide easily on surfaces)
- Restitution: 0.1 (minimal bounce — heavy industrial materials)
- Mass: derived from `material.weight` (affects carry speed and throw distance)

### 2.2 Snap Grid

Cubes align to a global 0.5m snap grid when placed near existing structures or flat ground. The grid exists everywhere but is invisible until the player enters placement mode.

```
Snap rules:
- Cube center within 0.3m of a grid point → snap to that grid point
- Adjacent to an already-placed cube → snap to the neighbor face
- On flat ground (slope < 15 degrees) → snap to ground-level grid
- On steep terrain → no snap (cube is loose, rolls downhill)
```

When entering placement mode (holding a cube with the Grabber and aiming at a valid surface), a ghost preview appears:

```
Ghost preview:
- Semi-transparent version of the cube at the snap position
- Green tint when placement is valid
- Red tint when blocked (overlapping another cube or collider)
- Wireframe grid lines visible on adjacent faces showing available expansion
- Material-specific ghost (shows what the actual cube will look like)
```

### 2.3 Stacking

Cubes stack vertically. Gravity holds them in place. Stacking is the fundamental building action — walls are stacks, towers are tall stacks, buildings are organized stacks.

```
Stacking physics:
- Max stable height: 8 cubes (4m) for unsupported column
- Buttressed columns (adjacent stacks providing lateral support): up to 16 cubes (8m)
- Center of mass calculation: per-column, recalculated when cubes added/removed
- Stability threshold: center of mass must remain within base footprint
- Material weight affects stability: heavy cubes (titanium, iron) need wider bases
```

### 2.4 Toppling

Towers topple when their center of mass exceeds the base support footprint. This creates meaningful structural engineering — you cannot build a single-column tower 20 cubes high. You need pyramidal or buttressed designs for height.

```
Toppling calculation (per column, per physics tick):

  centerOfMassX = sum(cube.weight * cube.gridX) / sum(cube.weight)
  centerOfMassZ = sum(cube.weight * cube.gridZ) / sum(cube.weight)

  baseSupportRadius = (number of ground-level cubes in connected group) * 0.25m

  if distance(centerOfMass.xz, baseCenter.xz) > baseSupportRadius:
    trigger topple event
    convert top N cubes from kinematic → dynamic (they fall with physics)
    apply random angular impulse (tumbling)
    each cube takes fall damage: fallDamage = cube.weight * fallHeight * 10
```

Toppling is dramatic — a tower of iron cubes collapsing creates a cascade of physics objects clanking and tumbling. Nearby entities take crush damage if hit.

### 2.5 Placement Flow (First Person)

```
1. Grab a cube with the Grabber tool (aim + grab action)
2. Cube levitates in front of the bot (~1m forward, chest height)
3. Walk to the build site
4. Aim at a surface (ground, wall face, top of existing cube)
5. Ghost preview appears at nearest valid snap position
6. Click/tap to place → cube transitions from held → grid-locked
   - Cube rigid body changes from dynamic to kinematicPosition
   - Snap sound plays (metallic clank, pitch varies by material)
   - Seam lines appear between adjacent cubes (normal map detail)
7. Or throw (release while moving) → cube launches as projectile
   - Throw velocity = bot movement velocity * 2.0
   - Thrown cubes deal impact damage: cube.weight * velocity * 5
```

### 2.6 Material Mixing

Walls and structures CAN mix materials. A rock foundation with iron upper walls is valid and sometimes strategically optimal (cheap base, strong where it matters). However, mixed-material structures have visual consequences:

- Seam lines between different materials are more pronounced (thicker normal map gap)
- Color contrast makes the material boundary obvious
- Material transitions render a thin dark gap line (0.5px normal map groove)
- This is cosmetic only — no structural penalty for mixing

Mixed walls give defenders information: they can see where the weak rock cubes are and where the strong iron cubes are, helping prioritize repairs during combat.

### 2.7 Individual Cube HP

Each cube has individual HP based on its material hardness. Cubes in a wall are independently destructible. A wall is only as strong as its individual cubes.

```
Cube HP formula:
  cube.maxHp = material.hpPerCube * cube.quality
  cube.hp = cube.maxHp (when freshly compressed or smelted)

Damage application:
  cube.hp -= incomingDamage
  if cube.hp <= cube.maxHp * 0.5:
    cube.damaged = true       // visual: cracks appear
  if cube.hp <= 0:
    destroy cube
    spawn rubble (70% chance: 1 damaged cube of same material)
    recalculate column stability (may trigger topple cascade)
```

---

## 3. Wall Building System

### 3.1 Walls Are Just Cubes

There is no "wall" entity type. There is no "build wall" button. Walls are emergent structures created by stacking cubes in a line. A wall is defined by its geometry — if cubes form a contiguous line at least 2 cubes long and at least 2 cubes tall, the game recognizes it as a wall for AI targeting and structural integrity calculations.

```
Wall recognition heuristic:
  For each group of contiguous placed cubes:
    if width >= 2 AND height >= 2:
      classify as "wall segment"
      register in defense graph for AI pathfinding
      enable wall integrity overlay when selected
```

This means wall design is freeform. Build L-shapes, zigzags, star forts, layered walls, walls with embedded copper wiring, walls with silicon windows that let signal through. The system does not constrain; it recognizes patterns.

### 3.2 Manual vs. Automated Wall Building

**Manual building:** Walk up, grab cubes one at a time from stockpile, carry to build site, place. Slow but precise. Good for small repairs, custom shapes, early game.

**Blueprint mode:** For larger structures, the player can enter blueprint mode:

```
Blueprint flow:
1. Open build menu → select "Blueprint" → select "Wall"
2. First-person view shifts to a projection overlay
3. Aim at ground to set wall start point → click
4. Drag to set wall end point → click
5. Set wall height (scroll or number key) → confirm
6. Ghost cubes appear showing the planned wall outline
7. Assign a bot (or self) to the blueprint
8. Assigned bot carries cubes from nearest stockpile and fills blueprint
9. Bot prioritizes bottom row first, then each subsequent row (structural stability)
10. Blueprint cubes that aren't yet filled show as wireframe outlines
```

Blueprint configuration:

```jsonc
// Blueprint assignment
{
  "type": "wall",
  "startGrid": [10, 0, 5],
  "endGrid": [18, 0, 5],
  "height": 3,
  "preferredMaterial": "scrap_iron",
  "fallbackMaterial": "rock",
  "assignedBot": "entity_42",
  "sourceStockpile": "entity_15",
  "progress": 12,       // cubes placed
  "total": 27           // cubes needed (9 wide * 3 tall)
}
```

### 3.3 Wall Strength

Wall strength is not an abstract number — it is the sum of the individual cube HPs along any cross-section an attacker might target.

```
Wall strength at a point:
  strengthAtColumn(x, z) = sum of cube.hp for all cubes at grid column (x, z)

Total wall integrity:
  wallIntegrity = min(strengthAtColumn for each column in wall)
  // The wall is only as strong as its weakest column
```

This creates meaningful defensive construction decisions:
- A 3-cube-thick wall of rock (3 * 50 = 150 HP per column) is weaker than a single-cube wall of iron (180 HP per column)
- But the rock wall is cheaper and wider, potentially absorbing more area damage
- Mixing a rock core with iron facing gives 50 + 180 = 230 HP at moderate cost

### 3.4 Breach Mechanics

Attackers (feral bots, enemy civilizations, the player raiding an AI base) target the weakest cube in a wall section. Destroying individual cubes creates holes.

```
Attack targeting (AI):
1. Scan wall for lowest-HP cube at ground level
2. Concentrate fire on that cube
3. When cube is destroyed → hole in wall (1 cube gap)
4. If ground-level cube destroyed, check column stability
   - Cubes above may topple into the gap
   - Or may hold if adjacent columns provide lateral support
5. Once a hole exists, melee attackers path through it
6. Ranged attackers continue widening the breach

Breach cascade:
  Destroying a ground-level cube removes support for cubes above
  → Column stability check
  → If remaining structure is stable: cubes above hold (bridging)
  → If unstable: topple event (cubes fall into gap, blocking it with rubble)
  → Rubble in gap slows movement but doesn't block it
```

### 3.5 Rubble

When cubes in a wall are destroyed, they do not simply disappear. Destruction creates rubble — loose cubes and damaged cubes that scatter on the ground.

```
Rubble generation:
  On cube destruction:
    70% chance: spawn 1 damaged cube of same material (quality 0.3-0.6)
    30% chance: nothing (material lost to damage)

  Damaged cubes:
    - Reduced HP (quality * maxHp)
    - Visual: heavy crack overlay, reduced metalness, increased roughness
    - Can be re-compressed in a furnace to recover ~50% of material
    - Can be placed as-is (weaker but functional)
```

Rubble has strategic implications:
- After a siege, both attacker and defender can salvage rubble cubes
- Rubble slows movement through a breached area
- A desperate defender can throw rubble cubes at attackers
- Rubble piles near walls indicate battle damage (visual storytelling)

### 3.6 Doorways

Doorways are gaps intentionally left in walls. No special door entity exists initially — a doorway is just a wall with a 1-cube-wide, 2-cube-tall gap.

```
Doorway patterns:
  Basic: 1 cube wide, 2 cubes tall gap in wall
  Wide: 2 cubes wide, 2 cubes tall (vehicle access)
  Arch: 2 cubes wide, 3 cubes tall with single cube on top (decorative)

Future: Door mechanism
  Recipe: 2 iron cubes + 1 copper cube → door mechanism
  Placed in a doorway gap
  Opens/closes on approach (proximity sensor from copper conductivity)
  Can be locked (requires circuit board from silicon + copper)
```

---

## 4. Machine Assembly

### 4.1 Machines from Cubes

Machines are not items you craft in a furnace and place as a single object. Machines are assembled by placing specific cube types in specific spatial patterns in the world. When the pattern is complete, the cubes merge into a functional machine entity.

This is like Minecraft crafting, but in the 3D world instead of a crafting grid. You physically build the machine shape with cubes, and when the last cube clicks into place, the structure activates.

### 4.2 Assembly Patterns

```jsonc
// config/machineAssembly.json
{
  "furnace": {
    "displayName": "Furnace",
    "description": "Smelts raw material cubes into refined materials. Drop cubes in the hopper, tap the front to select a recipe.",
    "pattern": {
      "size": [2, 2, 2],
      "layout": [
        // Layer 0 (ground level) — 2x2 base
        [
          ["iron", "iron"],
          ["iron", "iron"]
        ],
        // Layer 1 (top) — insulation + wiring
        [
          ["rock", "copper"],
          ["rock", "rock"]
        ]
      ]
    },
    "totalCubes": { "iron": 4, "rock": 3, "copper": 1 },
    "activationEffect": "furnace_ignite",
    "mesh": "furnace_active",
    "hopper": { "position": [0.5, 1.0, 0.0], "capacity": 8 },
    "output": { "position": [0.5, 0.0, 1.0] },
    "powerRequired": false,
    "tier": 1
  },
  "lightning_rod": {
    "displayName": "Lightning Rod",
    "description": "Captures storm energy. Must be tall for maximum efficiency. Connects to machines via copper wire cubes.",
    "pattern": {
      "size": [1, 6, 1],
      "layout": [
        [["iron"]],    // Layer 0 - base
        [["iron"]],    // Layer 1
        [["iron"]],    // Layer 2
        [["iron"]],    // Layer 3
        [["copper"]],  // Layer 4 - conductor section
        [["copper"]]   // Layer 5 - tip
      ]
    },
    "totalCubes": { "iron": 4, "copper": 2 },
    "activationEffect": "rod_spark",
    "mesh": "lightning_rod_active",
    "powerOutput": true,
    "captureRadius": 8.0,
    "tier": 1
  },
  "fabrication_unit": {
    "displayName": "Fabrication Unit",
    "description": "Assembles complex components from material cubes. Requires power connection.",
    "pattern": {
      "size": [3, 2, 2],
      "layout": [
        // Layer 0 - base (3x2)
        [
          ["iron", "iron", "iron"],
          ["iron", "copper", "iron"]
        ],
        // Layer 1 - top
        [
          ["silicon", "copper", "silicon"],
          ["iron", "iron", "iron"]
        ]
      ]
    },
    "totalCubes": { "iron": 8, "copper": 2, "silicon": 2 },
    "activationEffect": "fab_boot",
    "mesh": "fabrication_unit_active",
    "hopper": { "position": [1.0, 1.0, 0.0], "capacity": 12 },
    "output": { "position": [1.0, 0.0, 1.5] },
    "powerRequired": true,
    "tier": 2
  },
  "smelter": {
    "displayName": "Smelter",
    "description": "Higher-tier furnace. Smelts scrap iron into iron, processes alloys. Requires power.",
    "pattern": {
      "size": [2, 3, 2],
      "layout": [
        // Layer 0
        [
          ["iron", "iron"],
          ["iron", "iron"]
        ],
        // Layer 1
        [
          ["rock", "rock"],
          ["copper", "copper"]
        ],
        // Layer 2
        [
          ["iron", "iron"],
          ["iron", "iron"]
        ]
      ]
    },
    "totalCubes": { "iron": 8, "rock": 2, "copper": 2 },
    "activationEffect": "smelter_ignite",
    "mesh": "smelter_active",
    "hopper": { "position": [0.5, 1.5, 0.0], "capacity": 12 },
    "output": { "position": [0.5, 0.0, 1.5] },
    "powerRequired": true,
    "tier": 2
  },
  "outpost_core": {
    "displayName": "Outpost Core",
    "description": "Claims territory in a radius. Buildings can only be placed within claimed territory. Must be powered to maintain claim.",
    "pattern": {
      "size": [3, 3, 3],
      "layout": [
        // Layer 0 - iron foundation
        [
          ["iron", "iron", "iron"],
          ["iron", "copper", "iron"],
          ["iron", "iron", "iron"]
        ],
        // Layer 1 - copper wiring ring
        [
          ["copper", null, "copper"],
          [null, "silicon", null],
          ["copper", null, "copper"]
        ],
        // Layer 2 - signal top
        [
          [null, "iron", null],
          ["iron", "silicon", "iron"],
          [null, "iron", null]
        ]
      ]
    },
    "totalCubes": { "iron": 12, "copper": 5, "silicon": 2 },
    "activationEffect": "outpost_pulse",
    "mesh": "outpost_active",
    "claimRadius": 20,
    "powerRequired": true,
    "tier": 2
  },
  "turret_base": {
    "displayName": "Defense Turret",
    "description": "Automated defense. Attacks enemies within range. Requires power and ammo (scrap cubes fed into hopper).",
    "pattern": {
      "size": [2, 2, 2],
      "layout": [
        // Layer 0
        [
          ["titanium", "titanium"],
          ["titanium", "titanium"]
        ],
        // Layer 1
        [
          ["silicon", "copper"],
          ["copper", "silicon"]
        ]
      ]
    },
    "totalCubes": { "titanium": 4, "silicon": 2, "copper": 2 },
    "activationEffect": "turret_online",
    "mesh": "turret_active",
    "hopper": { "position": [0.5, 1.0, 0.0], "capacity": 4 },
    "powerRequired": true,
    "attackRange": 12.0,
    "attackDamage": 25,
    "attackRate": 1.5,
    "tier": 3
  }
}
```

### 4.3 Assembly Process

```
Assembly flow:
1. Player places cubes matching a machine pattern
2. After each cube placement, system checks if any machine pattern is complete
3. Pattern matching: for each defined machine in machineAssembly.json:
   a. Check all rotations (0, 90, 180, 270 degrees around Y axis)
   b. Check if all required cube types are present at correct relative positions
   c. null entries in the pattern are empty spaces (must be unoccupied)
4. If pattern matches:
   a. Brief activation animation (0.5s):
      - Cubes glow with emissive pulse
      - Particle burst in machine's theme color
      - Camera shake (subtle, 0.1 intensity)
      - Activation sound (metallic assembly, hydraulic hiss)
   b. Individual cube entities are destroyed
   c. Single machine entity spawned at pattern center
   d. Machine mesh replaces the cube geometry (procedural panel-based mesh from GDD-005)
   e. Machine is now a functional entity with hopper, output, power connection
```

### 4.4 Disassembly

Machines can be dismantled to recover cubes. This is a deliberate action, not accidental.

```
Disassembly:
1. Click/tap machine → radial menu → [DISMANTLE]
2. Confirmation prompt: "Dismantle Furnace? This takes 10 seconds."
3. Dismantle timer begins (visible progress bar on machine)
4. Machine sparks and shudders during dismantle
5. On completion:
   - Machine entity destroyed
   - Cubes returned at positions matching the original pattern
   - Cube quality reduced by wear: quality = original_quality * 0.85
   - Cubes are loose (dynamic rigid bodies) and must be grabbed/placed
```

Disassembly enables nomadic play — tear down your base, carry the cubes to a better location, rebuild. Costly in time and quality, but possible.

---

## 5. Stockpile & Territory Strategy

### 5.1 Stockpiles Are Visible Wealth

Cubes left on the ground form natural stockpiles. There is no hidden inventory. Every cube you own is physically present in the world — and visible to any entity with line of sight.

```
Stockpile detection:
  stockpileValue(position, radius) =
    sum of (cube.material.rarity_weight * cube.quality)
    for all cubes within radius of position

  Rarity weights:
    rock: 1
    scrap_iron: 2
    iron: 4
    copper: 5
    silicon: 8
    titanium: 12
```

### 5.2 Stockpile Aggro

Large stockpiles attract raiders. Enemy AI runs a periodic stockpile scan and evaluates whether a raid is worth the risk.

```
Raid attractiveness formula:
  raidScore = stockpileValue * visibilityFactor - defenseEstimate

  visibilityFactor:
    1.0 if stockpile is on open ground (no walls)
    0.5 if stockpile is partially enclosed (walls on 2+ sides)
    0.2 if stockpile is fully enclosed (walls on all sides + roof)
    0.0 if stockpile is inside an active outpost with turrets

  defenseEstimate:
    sum of (wall.hp + turret.dps * 30 + patrol_bot.combat_rating)
    for all defenses within 10m of stockpile

  If raidScore > raid_threshold (configurable per AI difficulty):
    AI assembles raid party
    Raid party navigates to stockpile
    Attempts to grab cubes and flee
```

### 5.3 Storage Strategy

The player (and AI governors) must make strategic choices about material storage:

**Open stockpile:**
- Cubes on the ground, easily accessible
- Fast to grab cubes for building
- Maximum vulnerability to raiders
- Good for: active build sites, low-value materials (rock), temporary staging

**Walled storage:**
- Cubes enclosed in a cube-built room
- Must walk through doorway to access
- Slower access but protected from ranged attacks
- Bots must navigate through doorway (pathing bottleneck)
- Good for: medium-value materials, overnight storage

**Vault:**
- Fully enclosed structure with door mechanism (copper + iron)
- Locked access (requires circuit board key)
- Attackers must breach walls to reach cubes
- Slowest access but maximum protection
- Good for: silicon, titanium, strategic reserves

### 5.4 Territory via Outposts

Territory is claimed by assembling an outpost core (12 iron + 5 copper + 2 silicon cubes in pattern). Active outposts project a claim radius.

```
Territory rules:
- Outpost claim radius: 20m (40 cube-lengths)
- Buildings and blueprints can only be placed within claimed territory
- Multiple outposts extend territory (circles overlap)
- Outposts require power to maintain claim
  - Unpowered outpost: claim radius shrinks by 1m per minute
  - At radius 0: territory unclaimed, buildings become neutral
- Contested territory: overlapping claims from different factions
  - No building allowed in contested zones
  - Combat bonuses for defender in their own territory (+10% damage)
  - Attacker can "flip" territory by destroying the outpost
- Outpost destruction:
  - Outpost has combined HP of all its component cubes (12*180 + 5*80 + 2*60 = 2680 HP)
  - When destroyed: rubble cubes scatter, territory unclaimed
  - Rebuilding requires re-assembling the full pattern
```

### 5.5 Territory Expansion Strategy

```
Expansion flow:
1. Scout location (bot with camera explores)
2. Establish forward stockpile (carry cubes to new location)
3. Build outpost core at strategic position (near resources, defensible)
4. Power the outpost (extend wire from lightning rod, or build new rod)
5. Build walls around outpost and stockpile
6. Set up production (furnace, belts from nearby deposits)
7. Assign patrol bots for defense
8. Connect via belt network to main base (optional but efficient)

Cost to expand:
  Minimum: 12 iron + 5 copper + 2 silicon (outpost only)
  Recommended: + 4 iron + 2 copper (lightning rod)
              + 4 iron + 3 rock + 1 copper (furnace)
              + ~40 cubes for perimeter walls
  Total: ~70 cubes for a basic defended expansion
```

---

## 6. Cube Transport & Automation

### 6.1 Manual Carry

The player and bots carry cubes using the Grabber tool. Carry capacity depends on Grabber tier, and carry speed depends on total weight of held cubes.

```
Carry mechanics:
  Tier 1 Grabber: max 1 cube, range 3m
  Tier 2 Grabber: max 2 cubes, range 5m
  Tier 3 Grabber: max 4 cubes, range 8m (tractor beam)
  Tier 4 Grabber: max 8 cubes, range 12m (gravity manipulation)

Movement speed while carrying:
  speed = baseSpeed * min(carrySpeedMultiplier for each held cube)

  Example: Carrying 2 iron cubes (0.75 each)
  speed = baseSpeed * 0.75

Multiple cubes arrangement:
  1 cube: held centered, 1m in front
  2 cubes: held side by side, 1m in front
  3-4 cubes: held in 2x2 grid, 1.2m in front
  5-8 cubes: held in 2x2x2 cluster, 1.5m in front (partially obscures view)
```

Carrying large loads is deliberately awkward — cubes block part of the first-person view, movement is slower, and the bot cannot use other tools while carrying. This pressure drives investment in automation.

### 6.2 Conveyor Belts

Belts are the primary cube automation system. A belt segment is a physical object placed on the ground that moves cubes along its surface without bot intervention.

```
Belt placement:
1. Craft belt segment (from furnace: 3 scrap iron + 1 copper → 1 belt segment)
2. Enter build mode → select Belt
3. Aim at ground → ghost preview of belt segment
4. Click to place → belt snaps to 0.5m grid
5. Adjacent belt segments auto-connect (arrow shows direction)
6. Belt direction: set by player facing direction when placed

Belt operation:
  - One cube per belt segment at a time
  - Belt speed: 1.0 cubes/second (basic), 2.0 (fast), 4.0 (express)
  - Cubes placed on belt entrance → cube mesh visibly slides along belt surface
  - At belt end: cube drops off (dynamic physics) or enters connected hopper
  - Junction types: straight, 90-degree turn, T-splitter, merger
  - Underground belt: tunnels under other belts for crossing paths
```

### 6.3 Bot Automation

Bots can be assigned carry routines — repetitive tasks that they execute autonomously until interrupted.

```
Carry routine assignment:
1. Click bot → radial menu → [ORDER]
2. Select "Carry Route"
3. Click source (stockpile, belt output, ore deposit)
4. Click destination (hopper, build site, stockpile)
5. Bot begins looping: go to source → grab cube(s) → carry to destination → drop → repeat

Bot carry AI (Yuka GoalEvaluator):
  CarryEvaluator:
    if assignedRoute AND source has cubes AND destination needs cubes:
      desirability = 0.8 (high priority — assigned task)
    else:
      desirability = 0.0

  Bot uses ArriveBehavior for precision cube pickup
  Bot uses FollowPathBehavior for route navigation
  Bot uses ObstacleAvoidanceBehavior to navigate around walls and other bots
```

### 6.4 Cube Priority Marking

Cubes can be marked for specific uses, preventing bots from grabbing them for the wrong task.

```
Priority marks:
  [BUILDING] — reserved for a specific blueprint
  [FURNACE]  — earmarked for furnace/smelter input
  [EXPORT]   — designated for trade or outpost supply
  [DEFENSE]  — reserved for wall repair

Visual: small colored icon floating above marked cubes
  Building: green hammer
  Furnace: orange flame
  Export: blue arrow
  Defense: red shield

Bots with carry routes respect priorities:
  Bot assigned to "carry iron to blueprint X" will only grab [BUILDING]-marked iron cubes
  Unmarked cubes are available for any task
```

---

## 7. Visual Design

### 7.1 Cube Material Appearance

Each material type has a distinct PBR treatment defined in `config/cubeMaterials.json` (see Section 1.3). At a glance from 10+ meters, a player should be able to identify material type by color and surface quality alone.

```
Visual identification at distance:
  Rock:       Dull brown-gray, matte, no reflections
  Scrap Iron: Dark rusty orange, rough, rust patches visible
  Iron:       Clean silver-gray, reflective, brushed surface
  Copper:     Warm orange with green patina edges, moderate shine
  Silicon:    Blue-gray, glassy, faint internal glow
  Titanium:   Bright silver, sharp reflections, purple-blue heat marks
```

### 7.2 Seam Lines Between Placed Cubes

When cubes are placed adjacent to each other, subtle seam lines appear at the junction. These seams reinforce that structures are built from individual blocks rather than monolithic walls.

```
Seam rendering:
  - 2px dark gap rendered via normal map depression at cube edges
  - Gap color: slightly darker than average of adjacent material colors
  - Gap depth: 0.5px in normal map (subtle shadow line)
  - Different materials: gap widens to 4px, color shifts to near-black
  - Seam lines are part of the cube's edge bevel (configured per material)
```

### 7.3 Damage Visualization

Cube damage is visible on each individual cube, providing at-a-glance wall integrity information.

```
Damage states:
  100% HP:  Pristine — material looks as defined in PBR config
  75% HP:   Light damage — 1-2 hairline cracks in normal map
  50% HP:   Moderate damage — major cracks, reduced metalness (-0.2)
            Increased roughness (+0.2), darker base color (-20 per channel)
  25% HP:   Heavy damage — deep cracks, fragments visibly missing from edges
            Metalness reduced to minimum, roughness near maximum
            Faint smoke/dust particles emit from crack lines
  0% HP:    Destroyed — cube shatters, rubble spawns
            Particle burst in material color
            Destruction sound (crumbling, metallic crunch)
```

### 7.4 Compression Particle Effects

When a cube is first compressed from powder, a burst of color-coded particles marks the creation.

```
Compression particles per material:
  Rock:       Brown-gray dust cloud, settles quickly
  Scrap Iron: Orange-brown sparks + rust dust
  Copper:     Warm orange sparks with green-tinted edges
  Silicon:    Blue-white crystalline sparkle, slow fade
  Titanium:   Bright white flash + purple-blue afterglow sparks
```

### 7.5 Stockpile Glow

Large concentrations of valuable materials emit a faint environmental glow, visible from distance. This serves dual purposes: the player can locate their stockpiles at night, and enemies can spot valuable targets.

```
Stockpile glow calculation:
  glowIntensity = sum(cubeValue) / 100
  glowColor = weighted average of material glow colors in pile
  glowRadius = sqrt(cubeCount) * 0.5m

Material glow colors:
  Rock:       No glow (too common)
  Scrap Iron: Faint warm orange (#cc8844, intensity 0.05 per cube)
  Iron:       Cool silver (#aabbcc, intensity 0.08 per cube)
  Copper:     Warm amber (#ffaa44, intensity 0.12 per cube)
  Silicon:    Cold blue (#8899cc, intensity 0.2 per cube)
  Titanium:   Bright white-blue (#ccddff, intensity 0.3 per cube)

  Glow only activates when 5+ cubes of a single material type are within 2m
  Point light placed at pile center, color and intensity from above
  Subtle pulsing (0.8-1.0 intensity oscillation, period 4 seconds)
```

### 7.6 Wall Integrity Overlay

When a wall segment is selected or when the player activates "defense view" (a HUD mode), cubes in wall structures show a color overlay indicating their remaining HP.

```
Integrity overlay:
  100-75% HP:  Green tint (emissive #00ff44, intensity 0.1)
  75-50% HP:   Yellow tint (emissive #ffaa00, intensity 0.15)
  50-25% HP:   Orange tint (emissive #ff6600, intensity 0.2)
  25-0% HP:    Red tint (emissive #ff0000, intensity 0.25, pulsing)

  Overlay is additive on top of existing material PBR
  Only visible in defense view or when wall is selected
  Helps prioritize repair efforts during combat
```

---

## 8. Early Game Flow — First 15 Minutes

This walkthrough describes the first 15 minutes of gameplay from the player's perspective, demonstrating how the cube building economy drives moment-to-moment decisions.

### Minute 0:00 — Wake Up

Camera fades in. First person. You are a maintenance bot standing on corroded metal plating. Ahead: a broken furnace — its panel seams are cracked, two of its iron cubes are missing from the upper structure, replaced by empty grid positions with sparking wire stubs. An otter hologram shimmers nearby, waving.

The furnace needs 2 iron cubes to be repaired, but you have nothing. You cannot smelt iron without a working furnace. You need scrap iron cubes first — and even before that, you need rock cubes, because the nearby scrap ore deposit requires a Diamond Drill you do not have yet.

### Minute 0:30 — First Harvest

The otter hologram points toward a cluster of rock deposits protruding from the terrain 5 meters away. Gray-brown geological formations, rough and angular. You walk up, aim your Harvester (starting tool), and hold the action button. The grinder whirs. Rock particles spiral into your chassis. Your powder capacity bar fills: 15/100... 30/100... 40/100. The deposit visibly shrinks — cracks widen, fragments break off.

At 40 powder (rock's compression threshold), "COMPRESS READY" pulses on the HUD.

### Minute 1:00 — First Cube

You hold the compress action. The screen shakes. Pressure and heat gauges spike on the HUD. A hydraulic press sound crescendos. Your camera dips as the bot bends forward. Brown dust particles burst outward. A **rock cube** ejects onto the ground in front of you with a solid thud. 0.5 meters per side. Dull gray-brown, matte, granular texture. Your first physical resource.

### Minute 1:30 — First Placement

The otter hologram appears next to the broken furnace: "Stack cubes here to patch the frame!" You walk over to your rock cube. Aim at it. Press grab. A magnetic beam connects your arm to the cube — it levitates and follows your movement. You carry it to the furnace. Aim at the damaged section. A green ghost cube appears at the snap position. Click. The cube locks into place with a metallic clank. One gap filled.

### Minute 2:00 — Building the Repair

You compress 3 more rock cubes from the deposit (the deposit is noticeably smaller now, deeply cracked). You carry each one to the furnace and place them. Four rock cubes now fill the damaged sections. The furnace is not fully repaired — rock is weaker than the iron it replaced — but it is functional. The furnace's status light flickers from red to yellow. A brief activation animation plays: the intake glows, sparks fly from seams, a chimney exhaust puffs smoke. "FURNACE ONLINE (DEGRADED)" appears on the HUD.

### Minute 3:00 — First Scrap Iron

The otter points toward a slag heap 15 meters east: "See that rusted pile? Scrap ore. Your grinder can handle it." You walk to the scrap ore deposit — rusted metal sheets, bent rebar, corroded plates jutting from the ground. You hold the action button. Orange-brown particles spiral in. The capacity bar fills in scrap-iron orange. At 60 powder (scrap iron threshold), you compress. Screen shake, orange sparks burst. A **scrap iron cube** drops out — dark gray with rust patches, visible rivet pattern, rough surface. Distinctly different from your rock cubes.

### Minute 3:30 — First Craft

You grab the scrap iron cube and carry it to the furnace. Drop it in the hopper — it falls in with a heavy clank, visible through the hopper opening. You tap the furnace front. The radial menu appears: [GRABBER ARM - 3 Scrap Iron] [REPAIR PATCH - 2 Scrap Iron] [SCANNER - 2 Scrap Iron]. You have 1 scrap iron cube. Everything is grayed out except the cube count indicator showing "1/3" and "1/2".

You need more cubes. Back to the slag heap.

### Minute 5:00 — Grabber Online

Three scrap iron cubes in the hopper. You tap the furnace, select [GRABBER ARM]. The furnace glows intensely, sparks cascade from the chimney, hammering sounds echo. A 10-second progress bar fills on the furnace display. A **Grabber Arm** component slides out the output slot — a physical object on the ground. You pick it up. [INSTALL] prompt appears. You press install. Your bot's arm reconfigures (brief animation, hydraulic hiss). "GRABBER T1 ONLINE" on HUD. Now you can carry cubes from 3 meters away and place them with precision.

### Minute 5:30 — Stockpile Strategy

With the Grabber, cube logistics are faster. You grind and compress 4 more scrap iron cubes. But now you face a choice: craft a Diamond Drill (to mine copper and unlock better recipes), or start building a wall around your furnace (the otter mentioned feral bots watching your cube pile). You have 4 scrap iron cubes sitting on the ground near the furnace. They are visible. They are your wealth. They are your vulnerability.

You decide: drill first, wall later. You feed the furnace.

### Minute 6:30 — Diamond Drill

4 scrap iron cubes consumed. Diamond Drill slides out. Install. "HARVESTER T2 ONLINE." Now you can mine copper and carbon deposits in addition to rock and scrap.

### Minute 7:00 — Copper Discovery

The otter hologram appears at the edge of your explored area, pointing toward a cliff face to the northeast: "See those green streaks? Copper veins. You need copper for wiring — can't connect machines without it." You venture out. New terrain — steeper, cliff walls with visible green-patina veins threading through the rock. Beautiful and distinct from the flat slag fields around your base.

You grind a copper vein. Orange-green particles swirl in. Compress at 80 powder. A **copper cube** drops — warm orange-brown with green patina edges, moderate shine, horizontal seam pattern. Different feel from the rough scrap cubes.

### Minute 8:00 — Simple Rock Wall

You carry two copper cubes back to base. But on the way, you notice tracks in the corroded plating — a feral bot has been circling your area. Your 6 loose cubes (2 scrap iron, 2 copper, 2 rock left over) are sitting in the open. Unprotected.

You decide to build a quick perimeter. Rock is cheap and you have deposits right next to the furnace. You grind and compress 8 rock cubes in rapid succession (rock compresses fast, only 40 powder threshold). You stack them in a U-shape around the furnace and stockpile: 2 cubes tall, 4 cubes across on each of three sides. Open on the approach side — a doorway.

Total: 8 rock cubes forming walls. 8 * 50 HP = 400 HP total perimeter strength. Not much, but it blocks line of sight to the stockpile (visibility factor drops to 0.5) and forces attackers through the doorway.

### Minute 10:00 — First Outpost Assembly

Back to copper mining. You accumulate 5 copper cubes and begin smelting scrap iron into proper iron cubes (2 scrap -> 1 iron). Over the next few minutes you build up: 12 iron cubes + 5 copper cubes + 2 silicon cubes. This is the full outpost core recipe.

The otter appears: "Big project. Build the outpost pattern on that flat ground — territory claim incoming." You begin placing cubes in the 3x3x3 outpost pattern. Iron foundation layer. Copper wiring ring. Silicon signal nodes at center and top. Iron structural crown.

You place the final silicon cube at the center of layer 2. The cubes pulse with light — green, then blue, then white. Particles cascade outward. The cubes merge, folding and sliding into a unified machine mesh: an outpost core. A pulse of cyan light radiates outward to 20 meters. The ground within the radius shimmers briefly with your faction color. "TERRITORY CLAIMED" on HUD. You can now build machines and structures within this radius.

### Minute 12:00 — Wiring Power

You build a lightning rod just inside your territory (4 iron cubes + 2 copper cubes stacked vertically). It activates — the top copper cubes crackle with electricity during the next storm pulse. But the furnace is not connected. Power does not teleport.

You place copper cubes in a line on the ground from the lightning rod base to the furnace — a physical wire. Each copper cube placed between the rod and the furnace extends the power connection. 4 copper cubes bridging the 2-meter gap. When the last copper cube connects rod to furnace, the furnace status light switches from yellow to green. "FURNACE POWERED — FULL EFFICIENCY." Processing times halve.

### Minute 14:00 — First Raid

A warning chime. The otter hologram flashes red: "Incoming! Feral bots detected approaching from the east!" Two feral maintenance bots are heading for your stockpile — they detected the copper cube glow through a gap in your rock wall.

You have seconds. Options:
- Grab cubes from the stockpile and carry them inside the walled area
- Throw rock cubes at the approaching bots (improvised combat)
- Stand in the doorway and block entry

You grab two rock cubes, one in each hand (Grabber T1 only holds 1 — you make two trips). You throw the first at the lead feral bot. Impact: rock cube's weight * velocity * 5 = moderate damage. The bot staggers. The second feral reaches your wall and begins attacking the lowest-HP rock cube. 50 HP. It takes hits. Cracks appear. The cube flashes yellow, then orange on the integrity overlay.

You grab a scrap iron cube from inside the wall and throw it. Heavier, more damage. The feral bot's camera component shatters. It stumbles blindly. You finish it off by throwing another cube. The second feral, seeing its companion destroyed, flees.

You survey the damage: one rock cube in the wall is at 15 HP (heavy cracks, nearly destroyed). You replace it with a scrap iron cube — stronger, 100 HP. The wall is now mixed material (rock base, one iron reinforcement), but holding.

Your first defense. Your first territorial conflict. Your first experience of the cube economy under pressure.

### Minute 15:00 — The Loop Established

You have:
- A powered furnace inside a rough rock-and-iron perimeter wall
- A claimed territory (outpost core, radius 20m)
- A lightning rod providing power
- Copper wire cubes connecting rod to furnace
- A Grabber T1 and Harvester T2
- A small stockpile of mixed cubes (3 scrap iron, 2 copper, 1 silicon)
- The knowledge that raids will come again, and bigger

The 4X has begun. You can see copper veins on the distant cliff face. You know silicon clusters exist in the processor graveyard to the west. Somewhere in the mountains, titanium seams wait. But every cube you mine and carry is a physical commitment — a thing in the world that must be protected, transported, and deliberately placed.

The cube economy is the game.

---

## 9. Koota Traits Summary

```typescript
// game/ecs/traits/cubeEconomy.ts
import { trait, relation } from 'koota';

// Individual cube in the world
export const MaterialCube = trait(() => ({
  material: 'rock' as string,
  quality: 1.0,
  hp: 50,
  maxHp: 50,
  gridPosition: null as [number, number, number] | null,
  placed: false,
  damaged: false,
  priorityMark: null as 'building' | 'furnace' | 'export' | 'defense' | null,
}));

// Wall segment recognition (auto-calculated)
export const WallSegment = trait(() => ({
  cubeCount: 0,
  totalHp: 0,
  weakestColumnHp: 0,
  width: 0,
  height: 0,
}));

// Machine assembly pattern (checking in-progress patterns)
export const AssemblyCandidate = trait(() => ({
  machineType: '' as string,
  progress: 0,        // cubes placed matching pattern
  total: 0,           // cubes needed
  rotation: 0,        // 0, 90, 180, 270
  anchorGrid: null as [number, number, number] | null,
}));

// Active machine (after assembly completes)
export const Machine = trait(() => ({
  machineType: '' as string,
  tier: 1,
  powered: false,
  active: false,
  wearLevel: 0,       // 0-1, increases with use, reduces output quality
}));

// Stockpile aggregate (auto-calculated for AI targeting)
export const Stockpile = trait(() => ({
  totalValue: 0,
  cubeCount: 0,
  visibilityFactor: 1.0,
  raidAttractiveness: 0,
}));

// Blueprint (planned structure)
export const Blueprint = trait(() => ({
  blueprintType: 'wall' as string,
  gridStart: [0, 0, 0] as [number, number, number],
  gridEnd: [0, 0, 0] as [number, number, number],
  height: 1,
  preferredMaterial: 'scrap_iron' as string,
  fallbackMaterial: 'rock' as string,
  progress: 0,
  total: 0,
}));

// Carry route (bot automation)
export const CarryRoute = trait(() => ({
  sourceEntity: null as number | null,
  destinationEntity: null as number | null,
  materialFilter: null as string | null,
  active: true,
}));

// Relations
export const HeldBy = relation({ exclusive: true });
export const InsideOf = relation({ exclusive: true });
export const AssignedTo = relation();         // bot → blueprint
export const PoweredBy = relation();          // machine → lightning rod (via copper wire)
export const WiredTo = relation();            // copper cube → copper cube (wire chain)
```

---

## 10. What Changes from Previous GDDs

| Previous GDD Design | GDD-006 Revision |
|---------------------|-------------------|
| GDD-004: 6 material types (scrap, copper, silicon, titanium, rare earth, carbon) | 6 material types (rock, scrap iron, iron, copper, silicon, titanium). Rock added as cheap bulk material. Iron added as processed tier. Rare earth and carbon removed for clarity. |
| GDD-004: Furnace is a pre-placed starting machine entity | Furnace is a pre-placed structure made of cubes, damaged at game start. Player repairs it by placing cubes into the gaps. |
| GDD-004: Machines crafted via furnace recipes (abstract) | Machines assembled by placing cubes in spatial patterns in the world. Cubes merge into machine entity on pattern completion. |
| GDD-004: Walls as a craftable building type (wall segment recipe) | No wall recipe. Walls are emergent structures from stacking cubes. System recognizes wall patterns for AI and integrity calculations. |
| GDD-004: Cube stacking max 8 high | Unsupported: 8 high. Buttressed: 16 high. Toppling physics when center of mass exceeds base. |
| GDD-003: Outpost as abstract building | Outpost assembled from 12 iron + 5 copper + 2 silicon cubes in specific 3x3x3 pattern. Physical construction. |
| GDD-003: Territory from abstract outpost placement | Territory from cube-assembled outpost. Claim radius requires power (copper wire to lightning rod). |
| GDD-005: cubeMaterials.json for visual only | cubeMaterials.json expanded with gameplay stats (hardness, weight, conductivity, HP, carry speed). |
| GDD-004: Ore deposits yield powder → cubes | Unchanged. GDD-006 adds rock as a new deposit type and iron as a smelted product. |
| GDD-004: Belt transports cubes | Unchanged. GDD-006 adds cube priority marking and bot carry route automation. |

---

## 11. Implementation Priority

### Phase 1: Core Cube System
1. `MaterialCube` trait with all 6 material types from `config/cubeMaterials.json`
2. Cube Rapier rigid bodies (dynamic when loose, kinematic when placed)
3. 0.5m snap grid with ghost preview placement
4. PBR cube rendering per material type (instanced meshes per material)
5. Cube HP and damage states (visual crack progression)
6. Cube grab, carry, place, throw mechanics

### Phase 2: Wall Construction
1. Wall segment recognition (contiguous placed cubes -> WallSegment trait)
2. Breach mechanics (individual cube targeting, destruction, rubble)
3. Toppling physics (center of mass, column stability)
4. Blueprint mode (wall outline -> bot-fillable plan)
5. Wall integrity overlay (green/yellow/orange/red per cube)
6. Rubble generation on cube destruction (70% recovery rate)

### Phase 3: Machine Assembly
1. `config/machineAssembly.json` with all machine patterns
2. Pattern matching system (rotation, validation, cube type checking)
3. Assembly activation animation (cube merge -> machine mesh)
4. Disassembly mechanic (machine -> cubes with wear penalty)
5. Furnace repair tutorial (starting game state: damaged furnace)
6. Iron smelting recipe (2 scrap iron cubes -> 1 iron cube)

### Phase 4: Territory & Stockpile Economy
1. Outpost core assembly and territory claiming
2. Power wiring via copper cube chains
3. Stockpile value calculation and visibility factor
4. Raid attractiveness AI (stockpile scanning, raid party assembly)
5. Cube priority marking system
6. Bot carry route automation (source -> destination looping)

### Phase 5: Combat Integration
1. Cube throwing as weapon (weight * velocity damage formula)
2. Wall targeting AI (weakest cube identification)
3. Breach cascade (toppling from destroyed ground-level cubes)
4. Post-combat rubble salvage
5. Stockpile defense evaluation for AI governors

---

## 12. Success Criteria

- [ ] 6 material types are visually distinct at 10+ meter range via PBR treatment
- [ ] Cubes are physical Rapier rigid bodies that can be grabbed, carried, thrown, stacked
- [ ] Snap grid provides satisfying, precise cube placement with ghost preview
- [ ] Walls are emergent structures from stacked cubes (no wall recipe/entity)
- [ ] Individual cubes in walls take and show damage independently
- [ ] Toppling physics makes tall unsupported structures collapse realistically
- [ ] Machines are assembled from cube patterns placed in the world
- [ ] Pattern completion triggers activation animation and cube-to-machine merge
- [ ] Machines can be disassembled back into cubes (with wear penalty)
- [ ] Stockpiles are visible, valued, and attract enemy raids
- [ ] Territory is claimed by cube-assembled outposts with power requirements
- [ ] Copper wire cubes physically connect power sources to machines
- [ ] Blueprint mode allows planning walls that bots auto-fill from stockpiles
- [ ] Bot carry routes automate cube transport between locations
- [ ] Cube priority marks prevent wrong-task grabbing
- [ ] Early game flow takes ~15 minutes from wake-up to first raid defense
- [ ] No abstract resource counters exist — all wealth is physical cubes in the world
