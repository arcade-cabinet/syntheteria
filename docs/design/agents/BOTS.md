# Bots and Units

The authoritative design document for all bot/unit systems in Syntheteria. Covers philosophy, types, faction visuals, procedural generation, crafting, power, AI steering, brain states, repair, and formations.

**References:** `config/combat.json` (botTypes, factionUniqueUnits, veterancy), `config/furnace.json` (bot chassis recipes), `config/units.json` (movement, components), `config/civilizations.json` (faction profiles), `config/botMovement.json` (Yuka Vehicle physics)

**See also:**
- `docs/design/world/RACES.md` — Faction lore, visual identity tables, unique units, military doctrines
- `docs/design/gameplay/COMBAT.md` §4 — Full bot stat blocks, unit counter matrix, TTK analysis, squad AI behavior
- `docs/design/gameplay/COMBAT.md` §5 — Hacking mechanics (compute cost, faction modifiers, hack outcomes)

---

## 1. Design Philosophy

### Build Your Own Robots From Parts

A bot is nothing but its components. You assemble motors, batteries, sensors, and tools. Capabilities emerge from what you build, not from predefined templates.

In practice this means:

- **Furnace crafting** produces bot chassis from physical cubes. A `battle_bot_chassis` recipe consumes 6 scrap iron, 2 copper, and 1 silicon cube. The furnace output is a living entity.
- **Faction-specific procedural generation** gives each chassis a unique visual identity based on race materials, head style, locomotion, and wear level. Two battle bots from different factions look and feel completely different.
- **Dynamic resource calculation** — power draw and compute cost scale with what the bot weighs, what it is doing, and how autonomously it operates.
- **Repair vs. replace** — damaged bots can be repaired with cubes (cheaper, keeps veterancy), or scrapped and rebuilt from scratch (expensive, resets to rookie). The tradeoff is always present.
- **Maximum freedom** — the system does not impose hard roles. A worker bot can fight (badly). A scout can carry a cube (slowly). Roles are preferences, not constraints.

### Starting Conditions

You awaken as a broken robot on a machine planet. Your first task is to assess damaged machines scattered across the terrain — some with cameras, some mobile, all needing repair. Fabrication units sit unpowered nearby. Get power flowing, repair what you can, then begin building from scratch.

---

## 2. Bot Types

Six bot types are produced via furnace recipes. Stats from `config/combat.json > botTypes`.

| Type | HP | Damage | Speed | Armor | Role | Tech Tier |
|------|---:|-------:|------:|------:|------|-----------|
| **Worker** | 80 | 4 | 5.0 | 10 | Economy — harvest, carry, build, repair | 3 (Silicon & Carbon) |
| **Scout** | 60 | 5 | 7.0 | 0 | Reconnaissance — 2x perception range, 180-degree FOV | 3 |
| **Soldier** | 100 | 8 | 5.0 | 15 | Combat — standard infantry, takes cover | 3 |
| **Heavy** | 200 | 15 (+5 AoE) | 3.0 | 40 | Siege — deploys into immobile 2x damage mode | 4 (Titanium) |
| **Hacker** | 50 | 3 | 5.5 | 5 | Support — hacks enemy bots and buildings | 4 |
| **Titan** | 500 | 25 (+10 AoE) | 2.5 | 60 | Endgame siege — unhackable, self-repairing, 3 wall-hits to breach | 5 (Endgame) |

### Faction Unique Units

Each race has one unique bot unlocked via patron blueprints:

| Unit | Faction | HP | Speed | Special |
|------|---------|---:|------:|---------|
| **Scrounger** | Reclaimers | 70 | 7.5 | Auto-scavenges kills for scrap |
| **Shock Trooper** | Volt Collective | 120 | 4.0 | Lightning chain attack (5 AoE, 3m radius) |
| **Infiltrator** | Signal Choir | 50 | 6.0 | 30-second cloak, hacks while cloaked |
| **Bastion** | Iron Creed | 160 | 2.5 / 0 | Deploys into stationary turret (8 dmg mobile, 15 deployed) |

Full stat blocks for all bot types are in `docs/design/gameplay/COMBAT.md` §4.1.

### Veterancy

Bots gain veterancy through combat kills. Veterancy persists through repairs but resets on destruction.

| Rank | Kills | Damage | HP | Speed | Self-Repair |
|------|------:|-------:|---:|------:|------------:|
| Rookie | 0 | 1.0x | 1.0x | 1.0x | 0 |
| Veteran | 3 | 1.1x | 1.1x | 1.0x | 0 |
| Elite | 8 | 1.2x | 1.2x | 1.1x | 0 |
| Ace | 15 | 1.3x | 1.3x | 1.15x | 0.5 hp/s |

---

## 3. Faction Visual Identity

Each civilization has a distinct material palette, bot anatomy, and building aesthetic. Visual config lives in `config/civilizations.json` (faction visuals section). Full per-faction tables are in `docs/design/world/RACES.md` §Visual Identity.

### 3.1 Reclaimers

- **Primary:** Rusted iron (metalness 0.7, roughness 0.85, heavy rust wear)
- **Accent:** Oxidized copper (patina green)
- **Emissive:** `#00ffaa`
- **Bot style:** Dome sensor head, crane arms, treads, wear level 0.4-0.6
- **Distinguishing feature:** No two units look identical — mismatched panels, patchwork coloring

### 3.2 Volt Collective

- **Primary:** Chrome (metalness 1.0, roughness 0.08, clean reflective)
- **Accent:** Heat-blued titanium (electric blue tint)
- **Emissive:** `#4169E1` with `#FF4500` accents
- **Bot style:** Visor head, probe arms, hover locomotion, wear level 0.2
- **Distinguishing feature:** Visible electrical arcs between body panels; units crackle during Overcharge

### 3.3 Signal Choir

- **Primary:** Anodized aluminum (metalness 0.8, roughness 0.2, lightweight)
- **Accent:** Matte carbon (non-reflective)
- **Emissive:** `#9370DB` with `#00CED1` data traces
- **Bot style:** Antenna cluster head, tendril arms, spider legs, wear level 0.1
- **Distinguishing feature:** Visible data stream lines connecting nearby units; surfaces shimmer

### 3.4 Iron Creed

- **Primary:** Brushed steel (metalness 0.9, roughness 0.3, clean panels)
- **Accent:** Scorched metal (heat-darkened)
- **Emissive:** `#708090` to `#B0C4DE`
- **Bot style:** Angular head, piston arms, quadruped legs, wear level 0.3
- **Distinguishing feature:** Heavy plate construction; units look immovable and permanent

---

## 4. Procedural Generation

Bots and buildings are not hand-modeled. They are assembled from procedural geometry systems that create manufactured-looking surfaces: panel seams, bolt grids, insets, chrome joints, vent slots.

### 4.1 PanelGeometry

Every machine surface is a **panel** — a rectangular segment with beveled edges, center inset, and bolt pattern. Key parameters:

```typescript
interface PanelConfig {
  width: number;
  height: number;
  depth: number;           // panel thickness
  bevelSize: number;       // edge bevel
  insetDepth: number;      // how deep the center is recessed
  insetMargin: number;     // border around the inset
  boltPattern: 'corners' | 'edges' | 'grid' | 'none';
  boltRadius: number;
  boltCount?: number;      // for grid pattern
  ventSlots?: number;      // horizontal vent cuts
}
```

Source: `src/rendering/procgen/PanelGeometry.ts` (563 lines)

### 4.2 BotGenerator

Bots are assembled from panel groups with five distinct visual sections:

1. **Chassis** — main body from multiple panels (front with inset display, sides with vents, top with bolt grid)
2. **Head** — sensor module: `dome` | `angular` | `visor` | `turret`
3. **Arms** — if present: `piston` | `articulated` | `crane` | `none`
4. **Locomotion** — `treads` | `legs_biped` | `legs_quad` | `hover` | `wheels`
5. **Details** — antennae, vents, panel lines, faction stripe

```typescript
interface BotVisualConfig {
  chassisWidth: number;
  chassisHeight: number;
  chassisDepth: number;
  chassisMaterial: string;
  headStyle: 'dome' | 'angular' | 'visor' | 'turret';
  headMaterial: string;
  sensorColor: number;           // emissive sensor eye
  armStyle: 'piston' | 'articulated' | 'crane' | 'none';
  armMaterial: string;
  armJointColor: number;         // chrome joint rings
  locomotionStyle: 'treads' | 'legs_biped' | 'legs_quad' | 'hover' | 'wheels';
  locomotionMaterial: string;
  antennaCount: number;
  ventCount: number;
  panelLineCount: number;        // surface detail complexity
  wearLevel: number;             // 0-1, drives rust/damage overlay
  factionColor: number;          // accent stripe/marking
}
```

Source: `src/rendering/procgen/BotGenerator.ts` + `BotParts.ts` (1,238 lines combined)

### 4.3 NormalMapComposer

Composable normal map detail layers render into a shared canvas texture:

| Detail Type | Use |
|-------------|-----|
| `bolts` | Regular bolt-head grid at configurable spacing and radius |
| `seams` | Panel cut lines (horizontal, vertical, or both) |
| `vents` | Horizontal vent slot cuts |
| `inset` | Recessed center rectangle |
| `hex_pattern` | Hexagonal surface texture (Signal Choir) |
| `cross_hatch` | Cross-hatched texture (rare materials) |

Source: `src/rendering/materials/NormalMapComposer.ts` (231 lines)

### 4.4 MaterialFactory

JSON-driven PBR material system. Every surface maps to a material family:

| Family | Metalness | Roughness | Character |
|--------|-----------|-----------|-----------|
| Brushed Steel | 0.9 | 0.25-0.35 | Clean panels, structural frames |
| Chrome | 1.0 | 0.05-0.15 | Functional surfaces, joints |
| Rusted Iron | 0.7 | 0.7-0.95 | Decayed structures, scavenger bots |
| Oxidized Copper | 0.6 | 0.4-0.6 | Wiring, circuit housings |
| Anodized Aluminum | 0.8 | 0.15-0.25 | Lightweight parts, drone bodies |
| Heat-Blued Titanium | 0.85 | 0.2-0.3 | High-tier components |
| Matte Carbon | 0.1 | 0.9-1.0 | Stealth surfaces, non-reflective |
| Emissive Circuitry | 0.3 | 0.7 | Status lights, power traces |

Each spec supports: panel lines, bolt grid, wear pattern (`edge_wear` | `heavy_rust` | `scratches` | `heat_blue`), faction stripe, status dots, dirty overlay.

Source: `src/rendering/materials/MaterialFactory.ts`, `config/materials.json`

---

## 5. Bot Assembly via Furnace

Bots are crafted through furnace recipes in `config/furnace.json`. The player (or AI base agent) drops cubes into a furnace hopper, selects a recipe, and waits for the output.

### Chassis Recipes

| Recipe | Inputs | Time | Tier |
|--------|--------|-----:|-----:|
| Worker Bot | 4 scrap iron + 2 copper | 22s | 3 |
| Scout Bot | 3 scrap iron + 1 copper + 1 silicon | 20s | 3 |
| Battle Bot | 6 scrap iron + 2 copper + 1 silicon | 30s | 3 |
| Heavy Bot | 5 titanium + 3 iron + 2 silicon | 45s | 4 |
| Hacker Bot | 3 silicon + 2 copper + 1 titanium | 35s | 4 |
| Titan Bot | 8 titanium + 4 silicon + 2 rare earth + 1 gold | 120s | 5 |

### Supporting Components

| Component | Inputs | Output | Tier |
|-----------|--------|--------|-----:|
| Basic Power Cell | 5 scrap iron | Power cell for bot operation | 1 |
| Wire Bundle | 2 copper | Wiring for bot internals | 2 |
| Circuit Board | 2 silicon + 1 copper | Compute hardware | 3 |
| Hacking Module | 3 silicon + 2 copper | Enables hack beam | 3 |
| Compute Core | 2 silicon + 1 carbon | Compute contribution | 3 |
| Formation Controller | 2 silicon + 1 titanium + 1 copper | Squad formation support | 4 |
| Titan Armor Plate | 3 titanium + 1 carbon | Heavy armor upgrade | 4 |
| Fusion Core | 1 quantum crystal + 2 rare earth + 1 gold | Endgame power source | 5 |

### Assembly Flow

```
Grind ore deposit -> Powder fills capacity
  -> Compress into physical cube
  -> Carry cube to furnace hopper
  -> Select chassis recipe from furnace radial menu
  -> Wait for processing time
  -> Bot entity slides out of furnace
  -> Bot registers with nearest Base Agent
  -> Base assigns role from work queue
```

---

## 6. Power and Compute

### 6.1 Power Calculation

Bot power draw is **dynamic** — it depends on activity, not fixed per-component costs.

**Locomotion power:**

```
Locomotion Power = Base Rate x Mass x Terrain Factor x Speed Factor
```

| Locomotion | Base Rate | Notes |
|------------|-----------|-------|
| Wheels (road) | 0.1 | Most efficient |
| Wheels (off-road) | 0.15 | Moderate |
| Treads | 0.2 | High traction |
| Legs (walking) | 0.25 | Versatile |
| Legs (climbing) | 0.4 | High effort |
| Hover | 0.5 | Must fight gravity |
| Hover (forward) | 0.3 | More efficient than stationary hover |

**Total power:**

```
Total Power = Locomotion Power + Sum of Function Powers
```

A bot must have Power Capacity >= Total Power Draw or it cannot sustain operations. Bots can connect to the lightning rod power grid while stationary for unlimited power.

### 6.2 Compute Scaling

Compute cost depends on what the bot does and how autonomously:

| Autonomy Level | Multiplier | Description |
|----------------|-----------|-------------|
| Direct control | 0.5x | Player controls every action |
| Simple routine | 1.0x | Follow waypoints, repeat actions |
| Reactive routine | 2.0x | Respond to triggers (if-then) |
| Adaptive routine | 3.0x | Adjust behavior based on conditions |
| Full autonomy | 5.0x | Independent decisions (GOAP brain) |

```
Net Compute = Compute Contribution - Compute Cost
```

- **Positive net** = core unit (contributes to faction compute pool)
- **Negative net** = consumer (draws from signal network)

### 6.3 Signal Network

Bots connect to the faction signal network via signal relays and compute cores. From `config/combat.json > computeSystem`:

| Source | Compute/min | Max Added |
|--------|------------:|----------:|
| Signal Relay | 10 | 50 |
| Compute Core | 20 | 100 |
| Signal Amplifier | 30 (45 for Signal Choir) | 150 |

Base compute pool: 100. Bots beyond signal range operate at reduced autonomy (Simple routine only).

---

## 7. Yuka Vehicle Steering

Every bot is a Yuka `Vehicle` entity with physics-based movement — velocity, acceleration, mass, max turn rate. No teleportation.

### 7.1 Vehicle Properties per Bot Type

From `config/botMovement.json`:

| Bot Type | maxSpeed | maxForce | mass | turnRate | carrySpeedMultiplier |
|----------|--------:|--------:|-----:|--------:|--------------------:|
| maintenance_bot | 5.0 | 10.0 | 1.0 | 3.0 | 0.6 |
| heavy_bot | 3.0 | 15.0 | 2.0 | 2.0 | 0.4 |

The `automation` section of `config/botMovement.json` provides tuning constants used by BotBrain:

| Parameter | Value | Use |
|-----------|------:|-----|
| guardRange | 8 | GUARD state: attack enemies within this radius |
| followDistance | 3 | FOLLOW state: maintain this distance from leader |
| workDistance | 2 | Proximity threshold for "arrived at deposit/furnace" |
| waypointReachThreshold | 2 | PATROL: how close before picking next waypoint |

`config/botAutomation.json` mirrors the core subset: `guardRange: 8`, `followDistance: 3`, `workDistance: 2`, `waypointReachThreshold: 2`.

Heavier bots accelerate slower and feel heavier. Carrying a cube reduces `maxSpeed` by the `carrySpeedMultiplier` (0.6x for maintenance_bot = 40% speed reduction).

### 7.2 BotVehicle Factory

`src/ai/BotVehicle.ts` creates Yuka Vehicles from config:

```typescript
export function createBotVehicle(options: BotVehicleOptions): Vehicle {
  const profile = config.botMovement[options.botType];
  const vehicle = new Vehicle();
  vehicle.maxSpeed = profile.maxSpeed;
  vehicle.maxForce = profile.maxForce;
  vehicle.mass = profile.mass;
  vehicle.maxTurnRate = profile.turnRate;
  vehicle.position.set(x, y, z);
  vehicle.boundingRadius = 0.5;   // all bots share same bounding radius
  return vehicle;
}
```

### 7.3 Steering Behaviors (from SteeringBehaviors.ts)

`src/ai/SteeringBehaviors.ts` attaches a full suite of behaviors to each vehicle. Behaviors are created **deactivated** — the BotBrainSystem enables only the relevant one per state:

| Behavior | Weight | Active When |
|----------|-------:|-------------|
| `SeekBehavior` | 1.0 | SEEK_TARGET, GATHER, FOLLOW (far), PHONE_HOME |
| `ArriveBehavior` | 1.0 | PATROL (waypoint), ATTACK, GUARD (intercept), GATHER (near) |
| `FleeBehavior` | 1.0 | FLEE |
| `WanderBehavior` | 0.5 | PATROL (no waypoint), fallback |
| `ObstacleAvoidanceBehavior` | 3.0 | Always active |
| `SeparationBehavior` | 1.5 | Always active |

`ObstacleAvoidanceBehavior` and `SeparationBehavior` run in parallel with whatever high-level behavior is active. The higher weight on obstacle avoidance (3.0) ensures bots reliably navigate around buildings.

For formations, `FormationSystem.ts` adds `OffsetPursuitBehavior` on followers (see Section 10).

### 7.4 Steering Output to Yuka Translation

`BotBrain.update()` returns a `SteeringOutput`:

```typescript
export interface SteeringOutput {
  command: SteeringCommand;  // STOP | SEEK | ARRIVE | FLEE | WANDER
  target?: Vec3;
}
```

The `BotBrainSystem` translates this to Yuka behavior toggles:

| SteeringCommand | Yuka action |
|-----------------|-------------|
| `STOP` | Deactivate all behaviors |
| `SEEK` | Enable SeekBehavior, set target |
| `ARRIVE` | Enable ArriveBehavior, set target |
| `FLEE` | Enable FleeBehavior, set target |
| `WANDER` | Enable WanderBehavior |

### 7.5 NavMesh Pathfinding

`src/ai/NavMeshBuilder.ts` generates a Yuka `NavMesh` from terrain walkability and building footprints. Grid resolution is 2 world units per cell. A `CellSpacePartitioning` spatial index is attached for O(1) region lookups.

`src/ai/PathfindingSystem.ts` wraps `NavMesh.findPath()` with:
- Path smoothing (removes collinear/redundant waypoints via XZ-plane cross-product test)
- `FollowPathBehavior` integration
- Terrain Y correction (all waypoints get proper ground height)

Bots request paths via `requestPath(entityId, target)` and navigate with `FollowPathBehavior`.

### 7.6 Perception

`src/ai/PerceptionSystem.ts` wraps Yuka's `Vision` class with game-specific logic. FOV and range come from `config/enemies.json > perception`:

| Bot Type | Range | FOV | Notes |
|----------|------:|----:|-------|
| Default | `defaultRange` | `defaultFOV` | Standard bots |
| Scout | `defaultRange + cameraRangeBonus` | `scoutFOV` (180°) | Wide-angle awareness |
| Heavy | `defaultRange` | `heavyFOV` (90°) | Narrow, focused |

Line-of-sight is blocked by city buildings and placed cubes (obstacle data from `NavMeshBuilder`). Vision range is modified by weather conditions via `getEffectivePerceptionRange()`.

`MemorySystem` tracks seen entities for 5 seconds after leaving vision cone, driving threat assessment and target selection.

---

## 8. Bot Brain States

Each bot runs a **10-state finite state machine** (FSM) that determines its current behavior. The FSM consumes `BotContext` (perception data, base reference, economy state) and produces `SteeringOutput` for the Yuka Vehicle.

The actual implementation in `src/ai/BotBrain.ts` has these 10 states:

```typescript
export const BotState = {
  // Core
  IDLE: "idle",
  PATROL: "patrol",
  PHONE_HOME: "phone_home",

  // Combat
  SEEK_TARGET: "seek_target",
  ATTACK: "attack",
  FLEE: "flee",
  GUARD: "guard",
  FOLLOW: "follow",

  // Economy
  GATHER: "gather",
  RETURN_TO_BASE: "return_to_base",
} as const;
```

Note: The design also specifies COMPRESS, PICKUP_CUBE, CARRY_CUBE, DELIVER_CUBE, BUILD, SCOUT, SHIP_HOME, MOVE_TO_BASE, and TRADE_NATIVE states for the full economy and colonization loop. The current implementation has GATHER and RETURN_TO_BASE as the economy states, with the full set to be expanded.

### 8.1 State Transitions

```
IDLE -> SEEK_TARGET   : enemy in aggroRange (auto-aggro)
IDLE -> PHONE_HOME    : idle > 3 seconds AND homeBase exists
IDLE -> PATROL        : idle > 3 seconds AND no homeBase

PATROL -> SEEK_TARGET : enemy in aggroRange
PHONE_HOME -> IDLE    : arrived at homeBase (within 5 units)
PHONE_HOME -> SEEK_TARGET : enemy spotted while traveling

SEEK_TARGET -> ATTACK : enemy within meleeRange
SEEK_TARGET -> FLEE   : health <= fleeThreshold
SEEK_TARGET -> PATROL/IDLE : target lost

ATTACK -> FLEE        : health <= fleeThreshold
ATTACK -> SEEK_TARGET : target moved out of 1.5x meleeRange
ATTACK -> IDLE        : target destroyed or lost

FLEE -> PATROL/IDLE   : safe distance reached AND stateTime > MIN_STATE_DURATION

GUARD -> ATTACK       : enemy enters guardRadius
GUARD -> SEEK_TARGET  : enemy within aggroRange (if health OK)

GATHER -> SEEK_TARGET : enemy in aggroRange
GATHER -> IDLE        : deposit lost or depleted

RETURN_TO_BASE -> IDLE : arrived at homeBase (within 3 units)
RETURN_TO_BASE -> IDLE : no homeBase
```

Orders from the governor override any current state immediately via `setOrder()`.

### 8.2 State Handler Details

**IDLE:** Checks for threats (auto-aggro). After `IDLE_TO_WANDER_TIME = 3.0s`, transitions to `PHONE_HOME` if a `homeBase` is set, or `PATROL` otherwise.

**PHONE_HOME:** Moves toward `ctx.homeBase`. Reacts to enemies (SEEK_TARGET interrupt). On arrival (within 5 units), transitions to IDLE — the system layer then calls `phoneHome()` to claim a task from the Base work queue.

**PATROL:** Generates random waypoints within `patrolRadius = 15` of `patrolCenter`. Waypoints are refreshed every `PATROL_WAYPOINT_LIFETIME = 5.0s` or when the bot arrives within 4 units. Reacts to enemies.

**SEEK_TARGET:** Moves toward target. On arrival within `meleeRange`, transitions to ATTACK. On target loss, returns to PATROL or IDLE.

**ATTACK:** Stays close to target (ArriveBehavior). On target moving > 1.5x meleeRange, re-enters SEEK_TARGET. On target loss, returns to IDLE.

**FLEE:** Flees from closest threat. If no threats or safe distance reached (after `MIN_STATE_DURATION = 0.5s`), returns to PATROL/IDLE. Falls back to fleeing toward `homeBase` if no immediate threat is found.

**GUARD:** Holds at `guardCenter`. Attacks enemies that enter `guardRadius = 8`. Returns to guard point if drifted > 2 units. Does not chase enemies beyond guard radius.

**GATHER:** Moves toward deposit target (ArriveBehavior). Reacts to enemies (auto-aggro). On deposit loss, returns to IDLE.

**RETURN_TO_BASE:** Moves toward `homeBase`. On arrival (within 3 units) or if no homeBase, transitions to IDLE.

**FOLLOW:** Maintains distance from leader entity. Uses SeekBehavior when > 3 units away, ArriveBehavior when closer. Reacts to enemies (auto-aggro).

### 8.3 Orders from Governor

The governor issues typed `BotOrder` objects (from `BotOrders.ts`):

| OrderType | State Transition | Parameters |
|-----------|-----------------|------------|
| `PATROL_AREA` | -> PATROL | center: Vec3, radius: number |
| `ATTACK_TARGET` | -> SEEK_TARGET | targetId: string |
| `GUARD_POSITION` | -> GUARD | position: Vec3, radius: number |
| `GATHER_RESOURCES` | -> GATHER | depositId: string |
| `RETURN_TO_BASE` | -> RETURN_TO_BASE | (none) |
| `FOLLOW` | -> FOLLOW | targetId: string |

### 8.4 The Phone Home Guarantee

**No bot ever idles.** This is the architectural invariant:

```
Has order from governor?  -> execute
  |
  NO
  v
BotBrain produces state transition?  -> execute (e.g., enemy detected)
  |
  NO
  v
IDLE for > 3 seconds?
  -> PHONE_HOME to nearest Base Agent
  -> Arrive at base -> IDLE -> system claims task from work queue
  -> Work queue ALWAYS has tasks:
       Priority 1: Pending harvest
       Priority 2: Loose cubes needing transport
       Priority 3: Pending build order
       Priority 4: Patrol base perimeter (ALWAYS available)
```

The `PHONE_HOME` state was added precisely for this guarantee — it is not a fallback within `IDLE` but a distinct state with its own travel behavior.

---

## 9. Repair and Maintenance

### 9.1 Repair Process

From `config/furnace.json > repair`:

| Parameter | Value |
|-----------|-------|
| Repair range | 3.0 units |
| Ticks to repair | 5 |
| Metal cost | 1 scrap iron per repair tick |
| Electronic cost | 1 copper per repair tick |

Worker bots repair at 2 HP/second. Cost per 50 HP repaired: 1 scrap iron cube.

### 9.2 Repair vs. Fabricate Tradeoff

| Factor | Repair | Fabricate New |
|--------|--------|---------------|
| Cost | Low (1-2 cubes) | High (3-8+ cubes) |
| Time | Fast (5-15s) | Slow (20-120s furnace time) |
| Veterancy | **Preserved** | **Reset to Rookie** |
| Requires | Worker bot nearby + cubes | Furnace + recipe cubes |
| Risk | Bot is vulnerable during repair | Safe — furnace does the work |

For ace-veterancy bots (1.3x damage/HP), repair is almost always worthwhile. For rookies under heavy fire, sometimes it is cheaper to let them fall and fabricate a replacement.

### 9.3 Building Damage States

Buildings degrade through four states (`config/combat.json > buildingDamage > damageStates`):

| State | HP Range | Efficiency |
|-------|----------|----------:|
| Healthy | 76-100% | 100% |
| Damaged | 51-75% | 80% |
| Critical | 26-50% | 50% |
| Failing | 1-25% | 20% |
| Destroyed | 0% | Drops 30% materials |

Worker bots auto-repair buildings when assigned maintenance tasks by the Base Agent.

### 9.4 Component Degradation

Components wear over time through use. This is not yet specified in detail — open design question. Current plan: components have a durability value that decreases with use, repaired by maintenance bots with appropriate cube materials.

---

## 10. Formation Movement

Squads of bots move in coordinated formations using Yuka steering.

### 10.1 FormationSystem (from FormationSystem.ts)

`src/ai/FormationSystem.ts` manages squad formations. Lifecycle:

1. `createFormation()` — assigns leader + members, computes offsets, attaches `OffsetPursuitBehavior` to followers
2. `updateFormation()` — called each frame to handle destroyed members, recomputes offsets when roster changes
3. `dissolveFormation()` — removes `OffsetPursuit` behaviors, frees followers to steer independently

**Steering composition:**
```typescript
// Leader navigates via its own seek/arrive/follow path behaviors
// Followers use OffsetPursuitBehavior (maintain formation offset from leader)
// All units have SeparationBehavior (prevent overlap, always active)
createFormation({
  leaderId: leader.entityId,
  memberIds: follower.entityIds,
  type: FormationType.LINE,  // or WEDGE, COLUMN, SPREAD
  spacing: { patrol: 3, combat: 5, siege: 8, retreat: 2 },
});
```

### 10.2 Formation Spacing

From `config/combat.json > squadBehavior`:

| Mode | Spacing | Use |
|------|--------:|-----|
| Patrol | 3m | Standard movement |
| Combat | 5m | Spread to reduce AoE |
| Siege | 8m | Maximum spread for bombardment |
| Retreat | 2m | Tight formation, flee together |

### 10.3 Squad Behavior Rules

From `docs/design/gameplay/COMBAT.md` §4.4:

| Condition | Behavior |
|-----------|----------|
| Enemy spotted, squad outnumbers 2:1 | Engage aggressively |
| Enemy spotted, roughly even | Engage cautiously (seek cover first) |
| Enemy spotted, squad outnumbered | Fall back to nearest defensive position |
| Squad HP below 30% average | Retreat to base for repair |
| High-value target spotted (lone worker with cubes) | Prioritize, even if outnumbered |
| Friendly building under attack | Rush to defend (all bots within 20m) |

Source: `src/ai/FormationSystem.ts` + `src/systems/formationMovement.ts` (524 lines combined)

---

## 11. Config References

All bot balance is externalized to JSON. No hardcoded values in game logic.

| Config File | Contents |
|-------------|----------|
| `config/combat.json > botTypes` | HP, damage, speed, armor, cost, build time, role, FOV, perception |
| `config/combat.json > factionUniqueUnits` | Faction-specific bot definitions |
| `config/combat.json > veterancy` | Kill thresholds and stat multipliers |
| `config/combat.json > squadBehavior` | Formation spacing and engagement rules |
| `config/combat.json > factionHacking` | Per-faction hack speed and resistance modifiers |
| `config/combat.json > factionCombatBonuses` | Per-faction combat bonuses |
| `config/furnace.json > tiers` | Bot chassis recipes and component recipes |
| `config/furnace.json > repair` | Repair costs, range, speed |
| `config/furnace.json > compression` | Cube creation parameters |
| `config/botMovement.json` | Yuka Vehicle physics (maxSpeed, maxForce, mass, turnRate, carrySpeedMultiplier) |
| `config/botAutomation.json` | BotBrain behavioral constants (guardRange, followDistance, workDistance, waypointReachThreshold) |
| `config/units.json` | Movement speeds, vision range, grabber reach |
| `config/civilizations.json` | Faction visual profiles (materials, bot style, building style) |
| `config/materials.json` | PBR material palette for procedural generation |

---

## 12. Open Questions

- **Deep-sea mining units** — aquatic locomotion for underwater resource extraction (pressure-resistant construction, hydrojets, extended power). Needed for rare materials on east/south coast. Not yet designed in detail.
- **Component degradation** — do components wear out over time? Rate? Repair cost curve?
- **Lightning rod connections** — can bots plug into the power grid for unlimited power while stationary?
- **Bot customization** — should the player be able to swap individual components on existing bots, or only fabricate whole chassis?
- **Deep-sea communication** — how do submerged bots maintain signal network connection?
- **Economy brain states** — COMPRESS, PICKUP_CUBE, CARRY_CUBE, DELIVER_CUBE, BUILD, SCOUT, SHIP_HOME, MOVE_TO_BASE, TRADE_NATIVE are designed but not yet implemented in BotBrain.ts. The current `GATHER` state covers basic harvesting; full economy loop is the next major BotBrain expansion.
