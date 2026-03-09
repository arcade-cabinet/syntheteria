# Syntheteria — Factory Planet FPS Redesign

## The Vision Shift

Syntheteria is no longer a top-down strategy game about an abstract AI consciousness commanding robots from orbit. **You ARE a robot.** You walk the surface of a machine planet in first-person, building increasingly complex factory systems by hand, connecting them with conveyor belts and power wires, and growing from a single broken bot on a desolate industrial world into the architect of a planetary-scale machine ecosystem.

**Factory Planet meets Minecraft meets Star Wars holographics.**

---

## Why FPS Changes Everything

### The Top-Down Problem

The current 2.5D top-down view creates several fundamental issues:

1. **Emotional distance.** You're a god looking down at ants. The "awakening AI consciousness" narrative is about intimacy — connecting to a single machine, feeling its limitations, gradually expanding. Top-down kills that.

2. **Billboard sprites fight the view.** The otter sprites are billboard 2D PNGs that auto-face the camera. From top-down, they're always awkwardly angled. From FPS, they'd face you naturally — but more importantly, projecting them as **holographic fields** makes them thematically perfect in a machine world.

3. **Buildings are boxes from above.** The city renderer creates instanced meshes with circuit-board aesthetics — conduits, nodes, towers, ruins. From above, you see rectangles. From ground level, those same structures become towering walls with glowing cyan traces, looming pylons with blinking antennas, crumbling ruins you navigate through.

4. **Factory systems need physicality.** Conveyor belts carrying scrap metal from a mining drill to a fabrication unit, power cables sparking between lightning rods and server racks — these are *spatial* experiences. You need to see the belt moving, walk alongside it, trace the wire to find where power is dropping. Top-down flattens all of this into abstract icons.

5. **PBR materials are wasted from orbit.** Procedurally generated metallic textures, emissive circuit traces, roughness maps on corroded steel — these only shine when you're *standing next to them*. From 30 units up, it's colored rectangles.

### What FPS Gives Us

- **Immersion.** You wake up as a broken robot on the surface. You *see* the storm overhead, the wormhole pulsing through clouds. You look down and see your own damaged chassis.
- **Factory legibility.** Walk alongside your conveyor belt. Watch resources tumble from a mining drill onto the belt, ride it past a sorting junction, drop into a smelter. Follow the power wire from the lightning rod to your fabrication unit and see the indicator light turn green.
- **Natural billboard sprites.** The otters (and any 2D elements) become **holographic projections** — Star Wars style translucent blue-green fields that hover above small emitter pads on the ground. This is *thematically native* to a machine world. The AI consciousness projects information as holograms. The slight billboard-wobble becomes holographic shimmer.
- **PBR payoff.** Procedural metallic textures on mining drills, belt segments, power conduits — all readable and beautiful at eye level. Emissive glow from active machinery. Sparks from damaged components.
- **Scale appreciation.** A lightning rod isn't a small icon — it's a towering steel pylon crackling with energy 20 meters above your head.

---

## Core Gameplay Loop (Factory Planet)

### You Are a Bot

You start as a single maintenance robot on the surface of the machine planet. First person. Looking through a camera sensor (slightly glitchy, scan-line overlay to reinforce the machine POV). Your arms are broken — you can see but not interact. Your first task: find another bot nearby that has working arms but a broken camera. Together, you're functional.

### The Factory Loop

```
EXPLORE → MINE → TRANSPORT → PROCESS → FABRICATE → BUILD → EXPAND
     ↑                                                         |
     └─────────────────────────────────────────────────────────┘
```

1. **Explore** the machine planet surface. Discover resource deposits, abandoned structures, feral machines.
2. **Mine** raw materials with mining drills you build and place. Scrap metal, e-waste, rare components emerge from the ground.
3. **Transport** resources via conveyor belts connecting miners to processors. Belts are physical objects you place segment by segment, watching resources slide along them.
4. **Process** raw materials in smelters, refiners, separators. Each takes input from a belt, outputs onto another belt.
5. **Fabricate** components (cameras, arms, legs, power cells, weapons, advanced parts) at fabrication units.
6. **Build** more infrastructure — lightning rods for power, relay stations for signal, defense turrets, more fabrication units, more miners.
7. **Expand** your reach. Build more bots. Send them out to establish satellite factories. Connect everything with belts and wires.

### Belts and Wires

**Conveyor Belts:**
- Physical segmented tracks placed on the terrain surface
- Resources visibly ride along them (small 3D objects on the belt mesh)
- Junctions, splitters, and mergers for routing
- Speed tiers (basic belt, fast belt, express belt)
- Underground belt tunnels for crossing paths
- Belt segments snap to a grid but curve naturally between grid points

**Power Wires:**
- Physical cable meshes strung between power poles/buildings
- Visible sag (catenary curve) — sparks when overloaded
- Power flows from lightning rods through the wire network
- You can trace power issues by following wires and looking for dead indicators
- Wire thickness/glow indicates load

**Signal Cables:**
- Separate from power — carry compute/signal between server racks, relay stations, bots
- Thinner than power wires, blue glow instead of amber
- Signal strength degrades with distance unless boosted by relays

---

## The Machine Planet World

### Reimagined Setting

The "industrial city" becomes the starting region of a much larger **machine planet**. The entire planet is a post-industrial landscape — not a natural world with factories on it, but a world that *is* the factory. Terrain is corroded metal plating over ancient bedrock. "Hills" are slag heaps and collapsed mega-structures. "Rivers" are chemical runoff channels. "Forests" are fields of broken antenna masts and cable bundles.

### Biomes (Regions)

| Region | Terrain | Resources | Hazards |
|--------|---------|-----------|---------|
| **The Foundry** (start) | Corroded factory floors, collapsed roofs | Scrap metal, basic e-waste | Feral bots, electrical shorts |
| **The Slag Fields** (east) | Mountainous slag heaps, heat vents | Refined metals, rare alloys | Toxic fumes, unstable ground |
| **The Cable Forest** (south) | Dense vertical cable bundles, dim lighting | Copper, fiber optics, intact components | Tangling hazards, ambush predators |
| **The Processor Graveyard** (west) | Vast plains of dead server racks | Advanced electronics, compute cores | EMP zones, data ghosts |
| **The Storm Spine** (north) | Exposed ridgeline, constant lightning | Massive power potential | Lethal lightning, cult territory |
| **The Deep Works** (underground) | Maintenance tunnels, machine guts | Rare materials, ancient tech | Darkness, cave-ins, unknown machines |

### Procedural Terrain

Terrain is still procedurally generated but reinterpreted:
- **Height map** = corroded metal plating + slag deposits + collapsed structures
- **Surface material** = procedural PBR (rusted steel, scorched aluminum, cracked concrete, exposed circuitry)
- **No vegetation** — this is a machine world. "Life" is lichen-like corrosion patterns and the otters (the only organic survivors)

---

## Holographic Projections (Billboard Sprites Reimagined)

### The Concept

The current otter billboard sprites and any 2D UI elements projected into the 3D world become **holographic fields** — translucent, slightly flickering projections emitted from small physical devices (holographic emitter pads).

### Why This Works

1. **Thematic fit.** You're an AI consciousness. Projecting information as holograms is exactly what a machine intelligence would do. The otters aren't "sprites" — they're holographic recordings or live feeds.
2. **Billboard behavior is correct.** Holograms *should* always face the viewer. The billboard auto-rotation that looks wrong for a physical otter looks *perfect* for a holographic projection.
3. **Visual distinction.** Holograms have a distinct look — translucent cyan/green tint, scan lines, slight flicker, edge glow, particle dissolve at edges. This makes them visually striking and immediately readable as "projected information."
4. **Extensible.** Any 2D content can be projected: otter NPCs, status displays, minimap projections, warning indicators, tutorial prompts. All share the holographic aesthetic.

### Implementation

```
Holographic Field = Physical emitter pad (small 3D mesh on ground)
                  + Projection cone (subtle volumetric light)
                  + Billboard sprite (existing PNG sequences)
                  + Holographic shader overlay (scan lines, flicker, edge glow, translucency)
```

**Shader effects for holographic sprites:**
- Base: existing sprite texture at ~70% opacity
- Color tint: shift toward cyan-green (#00ffaa base, matching existing UI color)
- Scan lines: horizontal lines scrolling upward at low frequency
- Edge glow: Fresnel-like glow at sprite edges
- Flicker: subtle random opacity variation (0.6–1.0 range)
- Interference: occasional horizontal glitch bands
- Particle dissolution: small particles float upward from the top edge of the projection

### Otter Holograms Specifically

The otters are real organic creatures — but what the player *sees* is a holographic recording/feed projected by emitter pads the otters carry. The otters themselves are nearby (you can hear them chittering) but the hologram is how the AI consciousness "perceives" and communicates with them. This explains:
- Why they always face the camera (holographic projection)
- Why they have a terminal-aesthetic speech bubble (it's a data overlay on the hologram)
- Why they glow faintly green (holographic emitter color)

---

## FPS Camera and Controls

### Replacing TopDownCamera

The current `TopDownCamera` (always looking straight down, Y=zoom height, two-finger pan) is completely replaced by a first-person camera attached to the player's current bot.

### FPS Camera Design

```
Camera position = bot.worldPosition + eye offset (head height)
Camera rotation = mouse look (desktop) / touch look (mobile)
```

**Desktop Controls:**
| Input | Action |
|-------|--------|
| WASD | Move forward/back/strafe |
| Mouse | Look around (pointer lock) |
| Space | Jump (if legs functional) |
| E | Interact (pick up, activate, connect belt/wire) |
| Q | Quick-switch between controlled bots |
| Tab | Inventory / component view |
| F | Flashlight (if power cell functional) |
| Left-click | Primary action (place belt/wire/building in build mode, use tool) |
| Right-click | Secondary action (remove, disconnect) |
| Scroll | Cycle build items |
| 1-9 | Quick-select build items |

**Mobile Controls:**
| Input | Action |
|-------|--------|
| Left thumb virtual stick | Move |
| Right side drag | Look |
| Tap right side | Primary action |
| Buttons | Interact, jump, inventory, build mode |

### Bot Switching

You can switch between controlled bots (Q key / dedicated button). Camera transitions smoothly — a brief holographic "transfer" animation (screen dissolves into data, reconstitutes at new bot). This replaces the old "click to select unit" paradigm. You *are* the bot you're controlling; others follow automation routines.

### Bot Limitations Affect View

- **No camera component:** Screen is static/glitchy, can only see outlines (abstract wireframe view)
- **Damaged camera:** Visual artifacts, reduced resolution, scan-line corruption
- **No power cell:** Periodic blackouts, low-light mode
- **Damaged legs:** Movement speed reduced, can't jump, camera bobs irregularly

---

## PBR Procedural Materials

### Why PBR Matters at Ground Level

From the current top-down view, `meshLambertMaterial` with flat colors is adequate — you can't see surface detail from 30 units up. At FPS eye level, every surface is in your face. PBR (Physically Based Rendering) materials with procedural textures make the difference between "colored boxes" and "a living machine world."

### Procedural Texture Generation

Generate textures at runtime using canvas/shader:

**Metal surfaces:**
- Base: procedural Voronoi/Perlin noise for panel patterns
- Color: silver/grey with rust (orange-brown) in crevices
- Roughness: smooth on panels, rough in corroded areas
- Metalness: high (0.8–1.0)
- Normal: rivet patterns, seam lines, dents

**Circuit traces:**
- Base: dark substrate (PCB green-black)
- Emissive: bright traces in geometric patterns (L-shapes, right angles)
- Color: copper traces on dark substrate
- Emissive map: glowing traces when powered

**Conveyor belt:**
- Base: dark rubber with metallic side rails
- Normal: cross-hatch tread pattern, animated UV scroll for belt motion
- Roughness: worn smooth in center, rough at edges

**Mining drill:**
- Base: heavy steel with scratches
- Emissive: status indicators (red/green LEDs)
- Normal: bolt patterns, intake vents, exhaust ports

### Implementation Approach

Three.js `MeshStandardMaterial` with procedural textures generated once per material type via OffscreenCanvas or custom shaders. Materials are shared across instances (instanced mesh still works for repeated objects like belt segments).

---

## Revised ECS Architecture

### New Components

```typescript
// Belt segment — physical conveyor belt piece
interface BeltComponent {
  direction: 'north' | 'south' | 'east' | 'west'
  speed: number           // items per second
  tier: 'basic' | 'fast' | 'express'
  carrying: string | null // item ID currently on this segment
  nextBeltId: string | null
  prevBeltId: string | null
}

// Wire connection — power or signal cable
interface WireComponent {
  type: 'power' | 'signal'
  fromEntityId: string
  toEntityId: string
  length: number
  currentLoad: number     // 0..1
  maxCapacity: number
}

// Mining drill — resource extractor
interface MinerComponent {
  resourceType: string
  extractionRate: number  // items per tick
  outputBeltId: string | null
  powered: boolean
  drillHealth: number
}

// Smelter / Processor — transforms resources
interface ProcessorComponent {
  recipe: string          // what it's currently processing
  inputBeltId: string | null
  outputBeltId: string | null
  progress: number        // 0..1
  speed: number
  powered: boolean
}

// Holographic emitter — projects sprites/data
interface HologramComponent {
  spriteSheet: string     // asset reference
  animState: string       // 'idle' | 'walk' | 'talk'
  opacity: number
  flickerSeed: number
  linkedEntityId: string | null  // the real entity being projected
}

// First-person controlled bot
interface PlayerControlled {
  isActive: boolean       // currently being piloted by the player
  lookDirection: { yaw: number; pitch: number }
}
```

### New Systems

```
beltTransportSystem()   — move items along belt chains
wireNetworkSystem()     — power/signal flow through wire connections
miningSystem()          — extract resources at drill sites
processingSystem()      — transform materials in processors
hologramSystem()        — update holographic projections (flicker, animation)
fpsMovementSystem()     — handle first-person movement for active bot
botSwitchSystem()       — manage player consciousness transfer between bots
```

---

## Migration Path from Current Codebase

### What We Keep

| Current System | Kept? | Changes |
|---------------|-------|---------|
| Miniplex ECS | Yes | Add new component types |
| R3F + Three.js | Yes | Switch to FPS rendering |
| Terrain generation | Yes | Reinterpret as metal/industrial surface, add PBR |
| City layout | Yes | Buildings become ground-level structures to walk through |
| Storm sky | Yes | Even more dramatic from ground level |
| Power system | Yes | Add physical wire connections |
| Resource system | Yes | Add mining drills and belt transport |
| Fabrication | Yes | Add belt input/output |
| Combat system | Yes | FPS combat (component damage still applies) |
| Pathfinding/navmesh | Yes | For NPC/automated bots (player uses direct control) |
| Game state/tick loop | Yes | Add belt/wire/mining ticks |
| Otter sprites | Yes | Wrapped in holographic projection system |

### What Changes

| Current System | Change |
|---------------|--------|
| `TopDownCamera` | → `FPSCamera` (pointer lock, WASD, attached to bot) |
| `UnitInput` (click-to-select, click-to-move) | → FPS direct control + bot automation |
| `UnitRenderer` (box meshes from above) | → Detailed PBR models at eye level |
| `CityRenderer` (instanced boxes) | → Walkable structures with interiors |
| `TerrainRenderer` (vertex-colored mesh) | → PBR terrain with procedural materials |
| `OtterRenderer` (billboard sprites) | → Holographic projection system |
| `GameUI` (minimap, selection panels) | → FPS HUD (health, power, inventory, build toolbar) |

### What's New

| System | Description |
|--------|-------------|
| Conveyor belt placement + rendering | Snap-to-grid belt segments with animated items |
| Wire placement + rendering | Catenary curve cables between buildings |
| Mining drill buildings | New building type, outputs to belts |
| Processor buildings | Smelters, refiners — belt in, belt out |
| Holographic projection shader | Scan lines, flicker, edge glow for sprites |
| FPS movement + collision | Player-controlled bot movement with building collision |
| Build mode | First-person placement (ghost preview in front of player) |
| Bot switching | Transfer consciousness between owned bots |

---

## Visual References

### Aesthetic Targets

- **Factorio/Satisfactory** — belt and wire factory systems, but grittier and more industrial
- **Minecraft** — first-person building, block placement feel, exploration-driven
- **Star Wars holograms** — the blue-green translucent projection aesthetic for all 2D elements
- **Alien: Isolation** — the "machine world" texture quality, CRT-overlay machine vision
- **NieR: Automata** — the bleak machine landscape, post-apocalyptic industrial beauty

### Color Palette (Unchanged but Recontextualized)

The existing cyan/green (#00ffaa, #00e5ff) terminal aesthetic becomes the holographic projection color. The dark blues and greys of the city buildings become the material palette for PBR surfaces. The amber/orange of powered buildings becomes the warm glow of active machinery at eye level.

---

## Implementation Priority

### Phase 1: FPS Foundation
1. Replace `TopDownCamera` with `FPSCamera` (pointer lock, WASD, attached to player bot)
2. Add `PlayerControlled` component to ECS
3. Adjust terrain for ground-level traversal (collision, proper scale)
4. Basic FPS movement with building collision

### Phase 2: PBR Ground-Level Rendering
5. Replace `meshLambertMaterial` with `meshStandardMaterial` + procedural textures
6. Rebuild `UnitRenderer` for eye-level detail
7. Rebuild `CityRenderer` for walkable scale
8. Add PBR terrain materials

### Phase 3: Holographic Projections
9. Create holographic shader (scan lines, flicker, edge glow)
10. Wrap `OtterRenderer` in holographic projection system
11. Add holographic emitter pad meshes
12. Holographic HUD elements

### Phase 4: Factory Systems
13. Conveyor belt ECS components + placement + rendering
14. Wire ECS components + placement + rendering (catenary curves)
15. Mining drill buildings
16. Processor buildings (smelter, refiner, separator)
17. Belt transport system (items moving along belts)
18. Wire network system (power/signal flow)

### Phase 5: Bot Control
19. Bot switching system (consciousness transfer)
20. Bot automation (automated bots follow patrol/work routines)
21. Camera damage effects (glitch, static, reduced vision)
22. FPS combat (component-based damage from first person)

---

## Open Design Questions

1. **Player death?** When the active bot is destroyed, consciousness auto-transfers to nearest bot? Or game over if all bots destroyed?
2. **Belt routing UI?** How does first-person belt placement feel? Ghost preview extending from player? Or a projected holographic overlay showing the planned route?
3. **Scale of factory?** How large do factory networks get? Need LOD for distant belt networks?
4. **Multiplayer implications?** Multiple players on the same planet, each as a bot, building competing/cooperating factory networks?
5. **Underground belts?** Can belts go underground to cross each other? How does this look in FPS?
6. **Bot followers?** Can non-active bots follow the player like Minecraft wolves? Or do they always stay at assigned tasks?
