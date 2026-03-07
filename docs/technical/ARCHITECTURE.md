# Syntheteria — Web Architecture (R3F + ECS)

This document defines the technical architecture for Syntheteria using React Three Fiber, Three.js, and an Entity-Component-System pattern — designed around the game's actual mechanics: fragmented maps, AI consciousness, storm-based power, hacking, and combat against cultists.

---

## Why Custom Engine (Not Unity/Godot)

- **Mobile-first web delivery:** Runs in any browser on any device — no app store, no install, no gatekeeping. The game is a URL.
- **AI-assisted development:** Everything is text (TypeScript, JSX). No binary scene files. AI can read, write, and verify all code.
- **Perfect fit for fragmented maps:** Custom chunk-based renderer maps directly to the game's signature mechanic. No fighting an engine's assumptions about continuous worlds.
- **Free forever:** No licensing at any scale.
- **Fast iteration:** Vite hot reload. Change a system → see it immediately.

**Trade-offs accepted:** Must build more from scratch. Lower 3D performance ceiling than native. Mobile WebGL quirks.

---

## Mobile-First Design Principles

The game targets mobile as the primary platform, with PC as a natural extension.

- **Touch controls are the default.** Mouse/keyboard are enhancements, not requirements.
- **UI sized for fingers.** Minimum 44px touch targets. No tiny buttons or hover-dependent interactions.
- **Performance budget for mid-range phones.** Target 30fps on 2-year-old Android devices. 60fps on flagship/PC.
- **Responsive canvas.** Full-screen on mobile, resizable window on desktop.
- **Battery-aware.** Reduce tick rate and particle effects when battery is low (Battery Status API where available).
- **Offline-capable.** Service worker for asset caching. Game state in IndexedDB. Playable without network after first load.

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Rendering | React Three Fiber + Three.js | 2.5D/3D top-down scene |
| ECS | Miniplex | Entity management, archetype queries |
| UI | React DOM overlay | Resource bars, building toolbar, unit panels, minimap |
| State bridge | useSyncExternalStore | ECS → React UI sync |
| Pathfinding | A* over chunk grids | Unit movement |
| Audio | Howler.js or Web Audio API | Storm ambience, lightning, combat |
| Persistence | IndexedDB | Save/load full world state |
| Build | Vite | Dev server, bundling, PWA plugin |
| Testing | Vitest + Playwright | Unit/integration + E2E |

---

## 1. Entity-Component-System

### Entity Interface

All components are optional properties on a single Entity type. Miniplex queries select entities by which components they have.

```ts
interface Entity {
  // Identity
  id: string
  faction: "player" | "cultist" | "rogue" | "feral"

  // Spatial
  position: { chunkId: string; localX: number; localY: number }
  worldPosition: { x: number; y: number; z: number }  // continuous, for rendering

  // Map fragment membership
  mapFragment: { fragmentId: string }

  // Unit
  unit: {
    type: string            // "maintenance_bot", "scout", "combat", "mining", "aquatic", etc.
    health: number
    maxHealth: number
    speed: number           // grid cells per game tick
    selected: boolean
    automationLevel: "direct" | "simple" | "reactive" | "adaptive" | "autonomous"
  }

  // Components (the robot's physical parts)
  robotComponents: {
    slots: RobotComponent[]  // power sources, controllers, motors, locomotion, sensors, etc.
    totalWeight: number      // cached, recalculated on change
    powerCapacity: number    // cached
    powerDraw: number        // cached, dynamic based on activity
    computeContribution: number
    computeCost: number
  }

  // Navigation
  navigation: {
    path: GridCell[]
    pathIndex: number
    moving: boolean
  }

  // Building / Facility
  building: {
    type: string             // "lightning_rod", "fabrication_unit", "relay_station", "server_rack", etc.
    powered: boolean
    operational: boolean
    footprint: GridCell[]
  }

  // Lightning rod (specialization of building)
  lightningRod: {
    rodCapacity: number
    currentOutput: number
    protectionRadius: number  // grid cells shielded from random strikes
  }

  // Power network membership
  powerNetwork: { networkId: string }

  // Signal / communication
  signal: {
    range: number
    connected: boolean       // within player signal network
    relaySource: boolean     // this entity extends signal
  }

  // Hacking state
  hacking: {
    targetId: string | null
    technique: string | null
    progress: number         // 0..1
    computeCostPerTick: number
  }

  // Combat
  combat: {
    weapons: WeaponState[]
    engagementRule: "attack" | "flee" | "protect" | "hold"
    targetId: string | null
    inCombat: boolean
  }

  // Cultist (human enemy — cannot be hacked)
  cultist: {
    rank: "wanderer" | "warrior" | "leader" | "cult_leader"
    lightningCooldown: number
    lightningPower: number
    meleeStrength: number
  }

  // Automation routine
  automation: {
    routineId: string
    instructions: AutomationInstruction[]
    active: boolean
  }

  // Sensor
  sensor: {
    type: "camera" | "radar" | "lidar" | "sonar" | "chemical" | "em" | "seismic"
    range: number
    producesDetailedMap: boolean  // cameras → detailed, others → abstract
  }

  // Cargo / resources carried
  cargo: {
    items: CargoItem[]
    capacity: number
  }

  // Fabrication queue (on fabrication buildings)
  fabrication: {
    queue: BlueprintOrder[]
    currentProgress: number
    powered: boolean
  }

  // Storm lightning strike (transient entity)
  lightningStrike: {
    targetPosition: { x: number; y: number }
    damage: number
    sourceType: "random" | "cultist"
    ticksRemaining: number
  }
}
```

### Key Queries (Archetypes)

```ts
const units        = world.with("unit", "position", "worldPosition")
const buildings    = world.with("building", "position")
const lightningRods = world.with("lightningRod", "building", "powerNetwork")
const movingUnits  = world.with("unit", "navigation", "worldPosition")
const selectedUnits = world.with("unit").where(e => e.unit.selected)
const playerUnits  = world.with("unit", "faction").where(e => e.faction === "player")
const enemyUnits   = world.with("unit", "faction").where(e => e.faction !== "player")
const cultists     = world.with("cultist", "position")
const hackableUnits = world.with("unit", "faction").where(e => e.faction !== "player" && !("cultist" in e))
const fabricators  = world.with("fabrication", "building")
const relays       = world.with("signal").where(e => e.signal.relaySource)
const sensors      = world.with("sensor", "position")
```

---

## 2. Fragmented Map System

This is the game's signature mechanic and the most architecturally significant departure from a standard RTS.

### Data Model

```ts
interface MapFragment {
  id: string
  chunks: Map<string, Chunk>        // chunkId → chunk data
  exploredBy: Set<string>           // entity IDs that contributed
  detailLevel: "abstract" | "detailed" | "mixed"
  connectedFragments: Set<string>   // fragments merged with this one
  // Rendering offset — fragments float in void at arbitrary positions until merged
  displayOffset: { x: number; y: number; rotation: number }
}

interface Chunk {
  id: string
  fragmentId: string
  grid: TileType[][]           // e.g. 16x16 tiles
  walkCosts: number[][]        // A* weights
  occupied: boolean[][]        // building footprints, unwalkable
  fogState: "unexplored" | "abstract" | "detailed" | "stale"
  terrainMesh: THREE.BufferGeometry | null   // generated on reveal
  lastObservedTick: number
}
```

### How Fragments Work

1. **Each robot has a `mapFragment` component** linking it to the fragment it belongs to.
2. **As a robot moves**, the `explorationSystem` reveals chunks around it:
   - Robots with camera sensors → `"detailed"` fog state (full visual terrain)
   - Robots without cameras → `"abstract"` fog state (wireframe/schematic)
3. **Fragments are disconnected.** The player sees explored areas as islands floating in void. There is **no spatial relationship** between fragments until they merge.
4. **When two robots from different fragments physically meet** (adjacent grid cells), the `fragmentMergeSystem` fires:
   - Calculates the spatial offset between the two fragments
   - Plays a merge animation (fragments slide together and snap)
   - Combines into a single fragment; all entities update their `mapFragment` component
   - Reveals the true spatial relationship
5. **Rendering:** Each fragment is a `<group>` in R3F, positioned by its `displayOffset`. Unmerged fragments have arbitrary offsets. Merged fragments share a unified coordinate space.

### Chunk-Based Terrain (Not Single BufferGeometry)

Terrain is rendered per-chunk, not as a single mesh. This is essential because:
- Chunks are revealed incrementally as robots explore
- Different chunks have different detail levels (abstract vs detailed)
- Fog of war needs per-chunk state
- Late game may have hundreds of chunks; only render visible ones

```tsx
function ChunkRenderer({ chunk }: { chunk: Chunk }) {
  if (chunk.fogState === "unexplored") return null
  if (chunk.fogState === "abstract") return <AbstractChunkMesh chunk={chunk} />
  return <DetailedChunkMesh chunk={chunk} />
}
```

### Abstract vs Detailed Maps

| Map Type | Source | Visual |
|----------|--------|--------|
| Abstract | Robots without cameras (sonar, radar, etc.) | Wireframe walls, obstacle outlines, no texture |
| Detailed | Camera-equipped robots | Full terrain, buildings, objects rendered |
| Mixed | Fragment with both types of exploration | Detailed where cameras went, abstract elsewhere |

---

## 3. Two-Loop Architecture

### Simulation Tick (Fixed Interval)

Runs at 1 tick/second at 1x speed. Adjustable: 0 (paused), 0.5x, 1x, 2x, 4x.

**Tick order:**

```
1. stormSystem()           — update storm intensity, schedule random lightning strikes
2. lightningStrikeSystem() — resolve pending strikes (damage, protection checks)
3. powerNetworkSystem()    — BFS from lightning rods, distribute energy, check rod protection zones
4. computePoolSystem()     — sum global compute, calculate demand, flag overextended units
5. signalNetworkSystem()   — BFS from core/relays, determine unit connectivity
6. explorationSystem()     — reveal chunks around moving units, check for fragment merges
7. fragmentMergeSystem()   — process pending merges
8. hackingSystem()         — progress active hacks, resolve completions/failures
9. combatSystem()          — resolve damage, apply engagement rules, cultist lightning calls
10. automationSystem()     — execute automation routines for units with routines
11. navigationSystem()     — compute A* paths for units that need them
12. fabricationSystem()    — progress build queues
13. resourceSystem()       — material gathering, consumption
14. decaySystem()          — component degradation (if enabled)
15. escalationSystem()     — cultist aggression, storm progression over game time
```

### Render Loop (60fps via useFrame)

Only handles smooth visual interpolation. **No game logic here.**

```ts
function movementSystem(delta: number) {
  for (const entity of movingUnits) {
    const nav = entity.navigation
    if (!nav.moving || nav.pathIndex >= nav.path.length) continue

    const target = nav.path[nav.pathIndex]
    const targetWorld = gridToWorld(target, entity.mapFragment)
    const wp = entity.worldPosition

    // Lerp toward next waypoint
    const step = entity.unit.speed * delta * gameSpeedMultiplier
    const dx = targetWorld.x - wp.x
    const dz = targetWorld.z - wp.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist <= step) {
      // Reached waypoint
      wp.x = targetWorld.x
      wp.z = targetWorld.z
      entity.position = { chunkId: target.chunkId, localX: target.x, localY: target.y }
      nav.pathIndex++
      if (nav.pathIndex >= nav.path.length) nav.moving = false
    } else {
      wp.x += (dx / dist) * step
      wp.z += (dz / dist) * step
    }
  }
}
```

**Critical rule:** Never put per-frame positions into React state. Scene components read ECS directly in `useFrame`.

---

## 4. Power Network System

Lightning rods are not generic "power buildings." They draw intermittent energy from the perpetual storm.

### Storm Model

```ts
interface StormState {
  intensity: number           // 0.0–1.0, increases over game time
  strikeFrequency: number     // strikes per tick outside protection zones
  currentPhase: "calm" | "building" | "active" | "surge"
  phaseTimer: number
}
```

Storm intensity cycles through phases and trends upward over the game. During surges, lightning rods produce more power but random strikes are more dangerous.

### Power Distribution (BFS)

```
1. For each lightning rod: currentOutput = rodCapacity × stormIntensity × phaseMultiplier
2. Build power graph: rods → distribution lines → connected buildings/stations
3. BFS from rods, distributing available power to connected entities
4. Entities mark powered = true/false
5. Robots stationary near rod infrastructure: may draw unlimited power (Q32, TBD)
```

### Protection Zones

Each lightning rod defines a `protectionRadius`. Units within the radius are shielded from random strikes. Outside: vulnerable.

```ts
function isProtected(position: GridCell): boolean {
  for (const rod of lightningRods) {
    if (gridDistance(position, rod.position) <= rod.lightningRod.protectionRadius) {
      return true
    }
  }
  return false
}
```

---

## 5. Compute and Signal Systems

### Global Compute Pool

```ts
function computePoolSystem() {
  let totalCapacity = 0
  let totalDemand = 0

  for (const entity of playerUnits) {
    const rc = entity.robotComponents
    if (!rc) continue
    const net = rc.computeContribution - rc.computeCost
    if (net > 0) totalCapacity += net
    else totalDemand += Math.abs(net)
  }

  globalState.compute.capacity = totalCapacity
  globalState.compute.demand = totalDemand
  globalState.compute.available = totalCapacity - totalDemand

  // Flag units vulnerable to takeover if overextended
  if (globalState.compute.available < 0) {
    flagVulnerableUnits()
  }
}
```

### Signal Network (BFS from Core)

```ts
function signalNetworkSystem() {
  // Start from core infrastructure (server room)
  const visited = new Set<string>()
  const queue: Entity[] = [coreEntity]

  while (queue.length > 0) {
    const current = queue.shift()!
    // Mark all units within this entity's signal range as connected
    for (const unit of playerUnits) {
      if (gridDistance(current.position, unit.position) <= current.signal.range) {
        unit.signal.connected = true
        visited.add(unit.id)
        // If this unit is a relay, add it to the queue
        if (unit.signal?.relaySource && !visited.has(unit.id)) {
          queue.push(unit)
        }
      }
    }
  }

  // Units not visited are disconnected
  for (const unit of playerUnits) {
    if (!visited.has(unit.id)) {
      unit.signal.connected = false
      // Disconnected units follow last order, are vulnerable to hacking
    }
  }
}
```

---

## 6. Hacking System

### Process

1. Player selects a hacking-capable unit and targets an enemy machine
2. System checks: signal link? technique discovered? compute available?
3. Creates/updates the `hacking` component on the attacking unit
4. Each sim tick: `progress += computeAllocated / hackDifficulty`
5. During hacking, the unit is vulnerable (reduced defense)
6. On completion: target's `faction` flips to `"player"`, compute demand increases
7. Cultists (entities with `cultist` component) are **immune** — hack attempts are blocked at validation

```ts
function hackingSystem() {
  for (const entity of world.with("hacking")) {
    const hack = entity.hacking
    if (!hack.targetId) continue

    const target = world.get(hack.targetId)
    if (!target || "cultist" in target) {
      // Invalid or unhackable target — cancel
      hack.targetId = null
      continue
    }

    if (!entity.signal?.connected) {
      // Lost signal — hack paused
      continue
    }

    if (globalState.compute.available < hack.computeCostPerTick) {
      // Not enough compute — hack stalls
      continue
    }

    globalState.compute.available -= hack.computeCostPerTick
    hack.progress += hack.computeCostPerTick / getHackDifficulty(target)

    if (hack.progress >= 1.0) {
      // Success — convert target
      target.faction = "player"
      hack.targetId = null
      hack.progress = 0
    }
  }
}
```

---

## 7. Combat System

Combat is **not a separate mode** — it emerges from component assembly and automation.

### Damage Model

Component-based damage: attacks damage individual `RobotComponent` slots, reducing robot capability progressively rather than a single HP bar depleting.

```ts
interface WeaponState {
  component: RobotComponent    // the weapon component
  cooldown: number
  range: number                // grid cells
  damageType: "physical" | "energy" | "lightning"
}
```

### Cultist Lightning Attacks

Cultists call lightning as a combat ability, not a building mechanic:

```ts
function cultistCombatSystem() {
  for (const cultist of cultists) {
    if (cultist.cultist.lightningCooldown > 0) {
      cultist.cultist.lightningCooldown--
      continue
    }

    // Find nearest player unit in line of sight
    const target = findNearestVisible(cultist, playerUnits)
    if (!target) continue

    // Spawn a lightning strike entity
    world.add({
      lightningStrike: {
        targetPosition: { x: target.worldPosition.x, y: target.worldPosition.z },
        damage: BASE_LIGHTNING_DAMAGE * cultist.cultist.lightningPower,
        sourceType: "cultist",
        ticksRemaining: 1
      }
    })
    cultist.cultist.lightningCooldown = getCooldownByRank(cultist.cultist.rank)
  }
}
```

### Engagement Rules and Automation

Units follow their `combat.engagementRule` when not under direct control:

| Rule | Behavior |
|------|----------|
| `attack` | Engage any enemy in range |
| `flee` | Retreat when enemies detected |
| `protect` | Attack enemies threatening a designated unit/building |
| `hold` | Attack only if attacked, don't pursue |

At higher automation levels, units make more sophisticated decisions (flanking, retreating when damaged, calling for support).

---

## 8. 3D Rendering

### Scene Structure

```tsx
<Canvas camera={{ position: [0, 50, 30], fov: 45 }}>
  <StormSky />           {/* Perpetual storm dome, wormhole pulse */}
  <ambientLight intensity={0.3} />
  <StormLighting />      {/* Dynamic directional light simulating storm flashes */}

  {/* Each fragment is its own group, positioned by displayOffset */}
  {fragments.map(frag => (
    <group key={frag.id} position={[frag.displayOffset.x, 0, frag.displayOffset.y]}>
      {/* Chunks within this fragment */}
      {Array.from(frag.chunks.values()).map(chunk => (
        <ChunkRenderer key={chunk.id} chunk={chunk} />
      ))}
    </group>
  ))}

  {/* Units — read worldPosition in useFrame, never in React state */}
  <UnitRenderer />

  {/* Lightning strike effects (transient) */}
  <LightningEffects />

  {/* Buildings rendered per-instance or instanced mesh */}
  <BuildingRenderer />

  <TopDownControls />    {/* Custom controls: pan, zoom, no orbit rotation */}
</Canvas>
```

### Unit Rendering

```tsx
function UnitRenderer() {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map())

  useFrame(() => {
    for (const entity of units) {
      const mesh = meshRefs.current.get(entity.id)
      if (mesh) {
        mesh.position.set(
          entity.worldPosition.x,
          entity.worldPosition.y,
          entity.worldPosition.z
        )
      }
    }
  })

  // Render meshes — type determines model
  return <>{/* ... */}</>
}
```

### Abstract vs Detailed Chunk Rendering

- **Detailed chunks:** Vertex-colored BufferGeometry per chunk, building models, props
- **Abstract chunks:** Wireframe material, wall outlines only, grid overlay — visually distinct "sensor data" feel
- **Stale chunks:** Detailed but desaturated/faded (haven't been observed recently)

### Storm Sky

The perpetual storm is always overhead. The wormhole pulses through it.

```tsx
function StormSky() {
  // Custom shader: animated storm clouds, wormhole glow center
  // Intensity driven by stormState from ECS
  // Lightning flashes sync with lightningStrike entities
}
```

---

## 9. Camera Controls (Mobile-First)

**Not OrbitControls.** Syntheteria uses a top-down strategic camera designed for touch.

### Touch (Primary)

| Gesture | Action |
|---------|--------|
| One-finger drag | Pan camera |
| Pinch | Zoom in/out |
| Tap unit | Select unit |
| Tap ground | Deselect / set rally point |
| Long-press unit | Context menu (move, hack, repair) |
| Long-press ground | Building placement |
| Two-finger tap | Pause/unpause |
| Swipe from edge | Open panel (building toolbar, unit info) |

### Keyboard/Mouse (PC Enhancement)

| Input | Action |
|-------|--------|
| WASD / arrows | Pan |
| Scroll wheel | Zoom |
| Left-click | Select |
| Right-click | Move / context command |
| Click-drag | Box selection |

### Camera Behavior

- **No rotation** — always top-down
- **Robot focus:** Tap a unit → camera smoothly pans to center on it
- **First-person peek:** Optional camera-feed view from a robot's sensor (picture-in-picture)
- **Momentum scrolling:** Pan has inertia on touch for natural feel
- **Zoom limits:** Prevent zooming too far in (performance) or too far out (lost context)

---

## 10. Building Placement

Same flow as the original proposal, but buildings are setting-appropriate:

| Building | Purpose |
|----------|---------|
| Lightning Rod | Power generation from storm + protection radius |
| Power Conduit | Connect rods to buildings, extend power network |
| Fabrication Unit | Manufacture components from materials |
| Server Rack | Stationary compute contributor |
| Relay Station | Extend signal range for unit connectivity |
| Storage Depot | Material storage |
| Defense Turret | Automated defense (late game) |

**Placement flow:**
1. Select building type from toolbar
2. Ghost preview follows cursor, snapped to grid
3. Green = valid (terrain OK, cost met, power network reachable), Red = invalid
4. Click → deduct materials → spawn ECS entity → mark grid cells occupied/unwalkable
5. Building starts unpowered until connected to power network

---

## 11. Unit Selection and Commands

### Touch (Primary)

- **Tap unit:** Select it. Tap another to switch. Tap void to deselect.
- **Long-press selected unit → drag:** Move command (shows path preview)
- **Long-press enemy machine:** Context radial → Attack / Hack
- **Long-press friendly building:** Context radial → Repair / Enter
- **Multi-select:** Tap first unit, then tap additional units (additive). Or use a "select all nearby" button.

### Mouse (PC)

- **Left-click:** Select unit (or building). Raycasts through R3F.
- **Right-click on ground:** Move selected units (compute A* path, attach Navigation component)
- **Right-click on enemy machine:** Context menu → Attack / Hack (if hackable)
- **Right-click on friendly building:** Context menu → Repair / Garrison
- **Box selection:** Click-drag rectangle selects all player units within bounds
- **Ctrl+number:** Assign group. **Number:** Recall group.

### Shared

All input methods ultimately call the same ECS command functions (`moveUnitsTo`, `attackTarget`, `hackTarget`, etc.). The input layer is thin and swappable.

---

## 12. UI Overlay (React DOM)

```tsx
<div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
  {/* Top bar: global resources */}
  <ResourceBar energy={snap.energy} compute={snap.compute} materials={snap.materials} />

  {/* Left: building toolbar */}
  <BuildingToolbar onSelect={setBuildingType} />

  {/* Bottom: selected unit info / robot components */}
  <UnitInfoPanel selected={snap.selectedUnits} />

  {/* Bottom-right: minimap showing all fragments */}
  <Minimap fragments={snap.fragments} units={snap.unitPositions} />

  {/* Top-right: game speed controls */}
  <SpeedControls speed={snap.gameSpeed} onPause={pause} onSetSpeed={setSpeed} />

  {/* Contextual: hacking progress, fabrication queue, automation editor */}
  <ContextualPanels />

  {/* Story narration overlay */}
  <NarrationOverlay />
</div>
```

All interactive elements get `pointerEvents: "auto"`.

### State Bridge

```ts
const useGameSnapshot = () => useSyncExternalStore(
  gameWorld.subscribe,    // called after each sim tick
  gameWorld.getSnapshot   // returns immutable snapshot
)
```

Scene components read ECS directly in `useFrame`. UI components read snapshots.

---

## 13. Persistence

### Save Format

```ts
interface SaveData {
  version: number
  gameTick: number
  stormState: StormState
  globalCompute: ComputeState
  fragments: MapFragment[]          // all fragment data including chunk grids
  entities: SerializedEntity[]      // full ECS dump
  discoveredBlueprints: string[]
  discoveredTechniques: string[]
  escalationLevel: number
}
```

### Storage

- Primary: IndexedDB (larger save files, chunk data can be big)
- Fallback: localStorage (small saves only)
- Auto-save every N ticks
- Manual save/load from UI

---

## 14. Build Order

| Phase | What | Key Validation |
|-------|------|----------------|
| 1 | Chunk grid + terrain generation | Can create/render chunks with abstract and detailed modes |
| 2 | Fragment system + void rendering | Multiple fragments float independently in void |
| 3 | Camera (top-down pan/zoom) | Works on desktop and mobile touch |
| 4 | Unit spawning + movement | Units move within fragments, smooth interpolation |
| 5 | Exploration system | Robots reveal chunks as they move, abstract vs detailed |
| 6 | Fragment merging | Two robots meeting triggers merge animation |
| 7 | ECS simulation loop | Fixed-tick systems run in order |
| 8 | Lightning rods + power network | BFS power distribution, protection zones |
| 9 | Compute + signal systems | Global compute pool, signal BFS, disconnection |
| 10 | State bridge + UI overlay | Resource bar, minimap, unit panels |
| 11 | Building placement | Ghost preview, validation, construction |
| 12 | Robot components + fabrication | Component slots, assembly validation, fabrication queues |
| 13 | Pathfinding + navigation | A* over chunk grids, cross-chunk pathing |
| 14 | Selection + commands | Click, box-select, right-click commands |
| 15 | Hacking system | Target selection, progress, conversion |
| 16 | Combat + enemies | Cultists, enslaved machines, rogue AIs, lightning attacks |
| 17 | Automation routines | Engagement rules, patrol routes, behavior editor |
| 18 | Storm progression + escalation | Intensifying storm, cultist aggression |
| 19 | Audio | Storm ambience, lightning cracks, UI sounds |
| 20 | Save/load | IndexedDB persistence, auto-save |
| 21 | Story/narration | Intro sequence, discoveries, lore reveals |
| 22 | Polish | Animations, particles, screen shake, juice |

**Phase 1–6 is the vertical slice** — the fragmented map system is the game's identity and the hardest technical challenge. If this works, everything else layers on top.

---

## Key Differences from Generic RTS Architecture

| Generic RTS | Syntheteria |
|-------------|-------------|
| Single continuous map | Fragmented maps that merge |
| Simplex noise terrain at startup | Chunks revealed incrementally by robots |
| Steady-state power buildings | Storm-driven intermittent lightning rods |
| Fixed unit types | Pure component assembly — any robot is its parts |
| Standard fog of war | Abstract vs detailed maps based on sensor type |
| No hacking | Hacking is a core combat/expansion mechanic |
| Generic enemies | Cultists (unhackable humans with lightning) + hackable machines |
| OrbitControls | Fixed top-down with pan/zoom (mobile-friendly) |
| Single terrain mesh | Per-chunk meshes with different detail levels |
| No consciousness model | Global compute pool, signal network, vulnerability cascades |
