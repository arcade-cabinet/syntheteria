# Bots and Units

The authoritative design document for all bot/unit systems in Syntheteria. Covers philosophy, types, faction visuals, procedural generation, crafting, power, AI steering, brain states, repair, and formations.

**References:** `config/combat.json` (botTypes, factionUniqueUnits, veterancy), `config/furnace.json` (bot chassis recipes), `config/units.json` (movement, components), `config/civilizations.json` (faction profiles)

---

## 1. Design Philosophy

### Build Your Own Robots From Parts

A bot is nothing but its components. You assemble motors, batteries, sensors, and tools. Capabilities emerge from what you build, not from predefined templates.

In practice this means:

- **Furnace crafting** produces bot chassis from physical cubes. A `battle_bot_chassis` recipe consumes 6 scrap iron, 2 copper, and 1 silicon cube. The furnace output is a living entity.
- **Faction-specific procedural generation** gives each chassis a unique visual identity based on race materials, head style, locomotion, and wear level. Two battle bots from different factions look and feel completely different.
- **Dynamic resource calculation** -- power draw and compute cost scale with what the bot weighs, what it is doing, and how autonomously it operates.
- **Repair vs. replace** -- damaged bots can be repaired with cubes (cheaper, keeps veterancy), or scrapped and rebuilt from scratch (expensive, resets to rookie). The tradeoff is always present.
- **Maximum freedom** -- the system does not impose hard roles. A worker bot can fight (badly). A scout can carry a cube (slowly). Roles are preferences, not constraints.

### Starting Conditions

You awaken as a broken robot on a machine planet. Your first task is to assess damaged machines scattered across the terrain -- some with cameras, some mobile, all needing repair. Fabrication units sit unpowered nearby. Get power flowing, repair what you can, then begin building from scratch.

---

## 2. Bot Types

Six bot types are produced via furnace recipes. Stats from `config/combat.json > botTypes`.

| Type | HP | Damage | Speed | Armor | Role | Tech Tier |
|------|---:|-------:|------:|------:|------|-----------|
| **Worker** | 80 | 4 | 5.0 | 10 | Economy -- harvest, carry, build, repair | 3 (Silicon & Carbon) |
| **Scout** | 60 | 5 | 7.0 | 0 | Reconnaissance -- 2x perception range, 180-degree FOV | 3 |
| **Soldier** | 100 | 8 | 5.0 | 15 | Combat -- standard infantry, takes cover | 3 |
| **Heavy** | 200 | 15 (+5 AoE) | 3.0 | 40 | Siege -- deploys into immobile 2x damage mode | 4 (Titanium) |
| **Hacker** | 50 | 3 | 5.5 | 5 | Support -- hacks enemy bots and buildings | 4 |
| **Titan** | 500 | 25 (+10 AoE) | 2.5 | 60 | Endgame siege -- unhackable, self-repairing, 3 wall-hits to breach | 5 (Endgame) |

### Faction Unique Units

Each race has one unique bot unlocked via patron blueprints:

| Unit | Faction | HP | Speed | Special |
|------|---------|---:|------:|---------|
| **Scrounger** | Reclaimers | 70 | 7.5 | Auto-scavenges kills for scrap |
| **Shock Trooper** | Volt Collective | 120 | 4.0 | Lightning chain attack (5 AoE, 3m radius) |
| **Infiltrator** | Signal Choir | 50 | 6.0 | 30-second cloak, hacks while cloaked |
| **Bastion** | Iron Creed | 160 | 2.5 / 0 | Deploys into stationary turret (8 dmg mobile, 15 deployed) |

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

Each civilization has a distinct material palette, bot anatomy, and building aesthetic. Visual config lives in `config/civilizations.json` (faction visuals section).

### 3.1 Reclaimers

- **Primary:** Rusted iron (metalness 0.7, roughness 0.85, heavy rust wear)
- **Accent:** Oxidized copper (patina green)
- **Emissive:** `#00ffaa`
- **Bot style:** Visor head, crane arms, treads, wear level 0.6
- **Buildings:** 4 pipes, 2 chimneys, medium panel complexity
- **Feel:** Scavengers. Everything looks salvaged, repaired, jury-rigged.

### 3.2 Volt Collective

- **Primary:** Chrome (metalness 1.0, roughness 0.08, clean reflective)
- **Accent:** Heat-blued titanium (purple-blue tint)
- **Emissive:** `#ffaa00`
- **Bot style:** Turret head, piston arms, biped legs, wear level 0.2
- **Buildings:** 1 pipe, no chimneys, high panel complexity
- **Feel:** Sleek aggressors. Chrome and heat. Lightning-fast, dangerous.

### 3.3 Signal Choir

- **Primary:** Anodized aluminum (metalness 0.8, roughness 0.2, lightweight)
- **Accent:** Matte carbon (non-reflective)
- **Emissive:** `#aa44ff`
- **Bot style:** Dome head, articulated arms, hover locomotion, wear level 0.1
- **Buildings:** No pipes, no chimneys, maximum panel complexity
- **Feel:** Hive-mind. Clean, precise, alien. Everything floats.

### 3.4 Iron Creed

- **Primary:** Brushed steel (metalness 0.9, roughness 0.3, clean panels)
- **Accent:** Scorched metal (heat-darkened, dirty)
- **Emissive:** `#aa8844`
- **Bot style:** Angular head, piston arms, quadruped legs, wear level 0.3
- **Buildings:** 2 pipes, 1 chimney, medium panel complexity
- **Feel:** Fortress builders. Heavy, grounded, immovable. Built to last.

---

## 4. Procedural Generation

Bots and buildings are not hand-modeled. They are assembled from procedural geometry systems that create manufactured-looking surfaces: panel seams, bolt grids, insets, chrome joints, vent slots.

### 4.1 PanelGeometry

Every machine surface is a **panel** -- a rectangular segment with beveled edges, center inset, and bolt pattern. Key parameters:

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

1. **Chassis** -- main body from multiple panels (front with inset display, sides with vents, top with bolt grid)
2. **Head** -- sensor module: `dome` | `angular` | `visor` | `turret`
3. **Arms** -- if present: `piston` | `articulated` | `crane` | `none`
4. **Locomotion** -- `treads` | `legs_biped` | `legs_quad` | `hover` | `wheels`
5. **Details** -- antennae, vents, panel lines, faction stripe

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

Bot power draw is **dynamic** -- it depends on activity, not fixed per-component costs.

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

Every bot is a Yuka `Vehicle` entity with physics-based movement -- velocity, acceleration, mass, max turn rate. No teleportation.

### 7.1 Vehicle Properties per Bot Type

From `config/botMovement.json` (referenced in GDD-005):

| Bot | maxSpeed | maxForce | maxTurnRate | Mass |
|-----|--------:|--------:|-----------:|-----:|
| Worker | 3.0 | 5.0 | 2.0 | 2.0 |
| Scout | 5.0 | 8.0 | 3.5 | 0.8 |
| Soldier | 4.0 | 10.0 | 1.5 | 5.0 |
| Harvester | 2.0 | 3.0 | 1.0 | 8.0 |

Heavier bots accelerate slower and feel heavier. Carrying a cube reduces maxSpeed by 30%.

### 7.2 Steering Behaviors

| Behavior | Use Case |
|----------|----------|
| `SeekBehavior` | Move directly toward target (approaching deposit, enemy) |
| `ArriveBehavior` | Seek but decelerate at target (cube pickup precision) |
| `FleeBehavior` | Move away from threat (damaged bot retreating) |
| `PursuitBehavior` | Predict and intercept moving target (combat pursuit) |
| `EvadeBehavior` | Predict and flee from moving pursuer |
| `WanderBehavior` | Random meandering (idle patrol) |
| `ObstacleAvoidanceBehavior` | Steer around buildings and terrain |
| `FollowPathBehavior` | Follow NavMesh path with smooth curves |
| `AlignmentBehavior` | Match heading with nearby allies (formation) |
| `CohesionBehavior` | Stay near group center (squad movement) |
| `SeparationBehavior` | Maintain spacing from nearby entities |
| `InterposeBehavior` | Position between two entities (bodyguard) |
| `OffsetPursuitBehavior` | Follow leader at fixed offset (formation position) |

### 7.3 Integration

```typescript
// Yuka EntityManager runs per-frame, updating all Vehicle positions
useFrame((_, delta) => {
  yukaTime.update();
  yukaEntityManager.update(delta);  // steering + pathfollowing + avoidance
  // Then run ECS systems which read updated positions
});
```

Each Yuka Vehicle syncs its world matrix to the Three.js mesh via `setRenderComponent()`. The mesh has `matrixAutoUpdate = false` so Yuka controls position directly.

### 7.4 NavMesh Pathfinding

Yuka `NavMesh` replaces the old grid-based A*. Navigation mesh is generated from terrain walkability and building footprints. Bots request paths via `navMesh.findPath(from, to)` and follow them with `FollowPathBehavior`.

### 7.5 Perception

Each bot has a Yuka `Vision` system with configurable range and field of view:

- Scout: 12 range, 180-degree FOV, 2x perception multiplier
- Soldier: 10 range, 120-degree FOV
- Heavy: 8 range, 90-degree FOV

`MemorySystem` tracks seen entities for 5 seconds after leaving vision cone. This drives threat assessment and target selection.

---

## 8. Bot Brain States

Each bot runs a finite state machine (FSM) that determines its current behavior. The FSM consumes `BotContext` (perception data, base reference, economy state) and outputs `SteeringCommand` for the Yuka Vehicle.

### 8.1 State Enumeration

```
CORE STATES:
  IDLE           -- no task, waiting for Phone Home
  PATROL         -- walking a patrol route around base perimeter

COMBAT STATES:
  SEEK_TARGET    -- moving toward detected enemy
  ATTACK         -- within range, engaging
  FLEE           -- health critical, retreating to base
  GUARD          -- holding position at defensive point
  FOLLOW         -- following a leader entity

ECONOMY STATES:
  HARVEST        -- grinding an ore deposit (8-15s per fill)
  COMPRESS       -- compressing powder into cube (2-4s)
  PICKUP_CUBE    -- walking to a loose cube to grab it
  CARRY_CUBE     -- carrying cube to destination (speed -30%)
  DELIVER_CUBE   -- dropping cube into furnace hopper or stockpile
  BUILD          -- constructing a structure (progress 0-100%)
  SCOUT          -- exploring fog-of-war tiles

COLONIZATION STATES:
  SHIP_HOME      -- carrying cubes to shipment point for patron
  MOVE_TO_BASE   -- relocating to new base (inter-base transfer)
  TRADE_NATIVE   -- interacting with alien native entity
```

### 8.2 Harvest State Machine

```
IDLE -> claim HARVEST task from work queue
  |
  v
HARVEST (move to deposit, begin grinding)
  | powder capacity full
  v
COMPRESS (stationary, 2-4s)
  | cube spawns at feet
  v
HARVEST (return to deposit for next load)
  | deposit depleted
  v
IDLE -> Phone Home -> next task
```

Combat interrupts at any point: enemy in aggro range triggers `SEEK_TARGET`.

### 8.3 Transport State Machine

```
IDLE -> claim TRANSPORT task from work queue
  |
  v
PICKUP_CUBE (move to cube, grab)
  | destination == shipment point?
  +-- YES -> SHIP_HOME (carry to patron point, cube destroyed on delivery)
  +-- NO  -> CARRY_CUBE (move to furnace/stockpile)
  |
  v
DELIVER_CUBE (drop into hopper or onto pile)
  |
  v
IDLE -> Phone Home -> next task
```

If health drops below 30% while carrying, the bot drops the cube and enters `FLEE`.

### 8.4 Build State Machine

```
IDLE -> claim BUILD task from work queue
  |
  v
BUILD (move to site, construct)
  | progress 0% -> 100% over build time
  | combat interrupt: progress saved, resume later
  | construction complete
  +-- built outpost? -> new BaseAgent spawns
  v
IDLE -> Phone Home -> next task
```

### 8.5 Scout State Machine

```
IDLE -> claim SCOUT task from work queue
  |
  v
SCOUT (spiral outward, reveal fog tiles)
  | enemy detected -> record in memory, continue
  | deposit discovered -> record in faction knowledge
  | alien native spotted -> emit NATIVE_SPOTTED event
  | area 80% explored
  v
IDLE -> Phone Home -> next task
```

### 8.6 Emergency Overrides

Checked every frame, override any current state:

1. **Health < 20% AND enemies nearby** -> `FLEE` (drop cube, run to base, alert defense)
2. **Health < 50% AND outnumbered 3:1** -> `FLEE`
3. **Home base under attack AND role == combat** -> `GUARD` base at max speed

### 8.7 The Phone Home Guarantee

No bot ever idles. When a bot has no task:

```
Has task from Base work queue?  -> execute
  |
  NO
  v
BotBrain produces state transition?  -> execute (e.g., enemy detected)
  |
  NO
  v
Stuck / idle / task completed?
  -> Phone Home to nearest Base Agent
  -> Work queue ALWAYS has tasks:
       Priority 1: Pending harvest
       Priority 2: Loose cubes needing transport
       Priority 3: Pending build order
       Priority 4: Patrol base perimeter (ALWAYS available)
```

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
| Risk | Bot is vulnerable during repair | Safe -- furnace does the work |

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

Components wear over time through use. This is not yet specified in detail -- open design question. Current plan: components have a durability value that decreases with use, repaired by maintenance bots with appropriate cube materials.

---

## 10. Formation Movement

Squads of bots move in coordinated formations using Yuka steering:

### 10.1 Steering Composition

```typescript
// Leader navigates via FollowPathBehavior
// Followers use OffsetPursuitBehavior (maintain formation offset)
// All units add SeparationBehavior (prevent overlap)
function createSquad(leader: Vehicle, followers: Vehicle[], offsets: Vec3[]) {
  followers.forEach((follower, i) => {
    follower.steering.add(new OffsetPursuitBehavior(leader, offsets[i]));
    follower.steering.add(new SeparationBehavior());  // weight 0.5
  });
}
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

- Engage if outnumbered 2:1: yes
- Engage if even: cautious (evaluate before committing)
- Retreat if HP below 30%
- Rush-defend friendly buildings within 20m radius
- Prioritize high-value targets

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
| `config/units.json` | Movement speeds, vision range, grabber reach |
| `config/civilizations.json` | Faction visual profiles (materials, bot style, building style) |
| `config/materials.json` | PBR material palette for procedural generation |

---

## 12. Open Questions

- **Deep-sea mining units** -- aquatic locomotion for underwater resource extraction (pressure-resistant construction, hydrojets, extended power). Needed for rare materials on east/south coast. Not yet designed in detail.
- **Component degradation** -- do components wear out over time? Rate? Repair cost curve?
- **Lightning rod connections** -- can bots plug into the power grid for unlimited power while stationary?
- **Bot customization** -- should the player be able to swap individual components on existing bots, or only fabricate whole chassis?
- **Deep-sea communication** -- how do submerged bots maintain signal network connection?
