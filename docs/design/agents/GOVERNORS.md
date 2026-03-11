# AI Governor Architecture

**Status:** Authoritative
**Date:** 2026-03-11
**Scope:** The complete AI system for Syntheteria -- philosophy, 3-layer architecture, faction behavior, and implementation spec.

**Merges:** CONSCIOUSNESS_MODEL.md, GDD-009 (Colony AI Architecture), GDD-003 (Governors/Evaluators)

---

## 1. AI Philosophy: Emergent Machine Intelligence

Syntheteria's AI is not a human emperor making grand strategy decisions. It is **distributed machine intelligence** -- awareness that emerges from computation, extends through signal networks, and degrades under resource pressure.

### 1.1 Core Principle: Computation as Awareness

Every AI entity in Syntheteria requires computational resources to function. More compute means sharper decision-making, faster reactions, better planning. Less compute means degraded awareness -- slower responses, worse task prioritization, vulnerability to hostile takeover.

This is expressed mechanically through three pillars:

| Pillar | Original Concept | Current Implementation |
|--------|-----------------|----------------------|
| **Energy** | Physical, local power delivered to each unit | Power grid: lightning rods, wires, energy distribution per base |
| **Compute** | Unified cognitive capacity for thinking and managing | Signal/hack network: signal relays extend control range, hacking tools exploit compute gaps |
| **Signal** | Range and reach of control over distributed body | Territory influence: outposts extend control, signal loss creates vulnerable zones |

### 1.2 Signal and Control

A governor's effective intelligence depends on whether it can **reach** its units and whether it has the capacity to **manage** them:

| Situation | Can Reach? | Can Manage? | Result |
|-----------|------------|-------------|--------|
| Normal operation | Yes | Yes | Full control -- base agent runs optimally |
| Compute shortage | Yes | No | Unit vulnerable to hacking, cannot update task priorities |
| Signal loss | No | N/A | Unit continues last order, can be hacked by enemies |
| Both | No | No | Unit isolated and vulnerable -- easy raid target |

Signal loss occurs when units move beyond relay range or when enemy Signal Choir infiltrators disrupt relay chains. Isolated bots continue their last orders but cannot receive new tasks from their base agent, making them predictable and exploitable.

### 1.3 Failure States and Vulnerability

The AI system models cascading failure -- losing one component can trigger a chain reaction:

**Compute Overextension:** When a colony's compute demand exceeds capacity (too many bots, too few signal relays), peripheral units become vulnerable. Enemy hacking can capture these units, reducing compute further, creating a death spiral. Governors must balance expansion against compute headroom.

**Signal Fragmentation:** When relay infrastructure is destroyed or power fails, bases lose contact with distant bots. These isolated bots keep harvesting or patrolling on autopilot but cannot respond to raids or shifting priorities. Reconnecting does not automatically reclaim hacked units.

**Territory Contestation:** When two factions' influence zones overlap, the contested zone becomes a no-build zone with accelerated decay. Neither faction can place buildings, and units in the zone face increased combat frequency. Governors must decide whether to fortify the border or withdraw.

### 1.4 Hack Resistance

Units with more excess compute are harder to hack. This creates a natural hierarchy:

| Unit Type | Excess Compute | Hack Resistance | Tactical Role |
|-----------|----------------|-----------------|---------------|
| Simple drone (harvester, transporter) | None | Low | Expendable workers |
| Smart drone (scout, builder) | Some | Medium | Specialized roles |
| Combat bot | High | High | Front-line defense |
| Signal relay | Very High | Very High | Infrastructure backbone |

The Signal Choir faction specializes in hacking, making their infiltrator bots a strategic threat to compute-poor colonies.

---

## 2. The 3-Act Model

### 2.1 Why Colonization, Not Civilization

The AI architecture models robot colonies, not human empires. Robots don't think like emperors with grand strategy -- they are rational agents making cost-benefit calculations. The game follows a 3-act structure that evolves organically through a **patron dependency gradient**:

| Act | Phase | Patron Dependency | Core Gameplay |
|-----|-------|-------------------|---------------|
| **Act 1: Colonization** | Early game (0-15 min) | High -- patron is sole source of blueprints | Harvest, compress, ship cubes home, receive blueprints. Build first base and furnace. Learn the core loop. |
| **Act 2: Factory** | Mid game (15-40 min) | Declining -- furnace recipes produce blueprints locally | Automate with belts and machines. Optimize resource flows. Patron still useful but no longer essential. |
| **Act 3: Conquest** | Late game (40+ min) | Low -- patron is one trade partner among many | Self-sufficient multi-base empire. Bot armies, territory control, subjugate rival colonies. |

The transition between acts is **not dramatic**. There is no "declare independence" moment. As local blueprint production increases, the marginal value of shipping cubes home decreases. The colony gradually stops needing the patron. Both sides have vested interest -- the patron wants resources, the colony wants tech -- so the relationship persists but shifts in balance.

### 2.2 The Three Actors

**Home Planet Patron (per race):** An AI on the home planet that dispatched this colony. Communicates infrequently via otter hologram projections. Sends material requests, delivers blueprints and reinforcements in exchange. Each race has a different patron with different priorities.

**Colonial Bases (per settlement):** Autonomous event-driven agents anchored to physical buildings. Each base has its own event bus, work queue, bot roster, cube inventory. Bases communicate needs via demand signals over wire/signal networks. No central brain -- emergent coordination.

**Alien Natives (indigenous):** Were here before the colonists. Not competing for patron favor. Can be traded with, fought, or subjugated. Their relationship with each colony adds strategic depth, particularly in Act 3.

---

## 3. Architecture Overview

```
  HOME PLANET PATRON                    runs every 2-5 minutes
  One per faction. Remote AI with priorities.
  Sends: material requests, blueprint rewards, reinforcement drops
  Receives: cube shipments from colony
  Output: PatronDirective (broadcast to all colony bases)
            |
            +---------------+--------------+
            v               v              v
  BASE AGENT (Event Bus)  BASE AGENT     BASE AGENT     runs every 5-10s
  One per settlement.     (outpost #1)   (outpost #2)
  Autonomous event-driven node.
  Local event bus emits: harvest_needed, transport_needed,
                         build_queued, defense_alert, furnace_ready
  Bots subscribe to events and self-assign tasks.
  Output: WorkQueue tasks (bots claim from queue)
            |
            v
  BOT BRAIN (Reactive Agent)             runs every frame
  One per bot entity. Yuka Vehicle + FSM.
  Subscribes to nearest base's event bus.
  Claims tasks from work queue. Executes with steering behaviors.
  If no task available -> "Phone Home" -> guaranteed fallback.
  Output: SteeringOutput (movement + action commands)
```

### 3.1 Layer Responsibilities

| Layer | Decides | Knows | Frequency |
|-------|---------|-------|-----------|
| Patron Agent | What materials to request, what blueprints to offer | Only what cubes it has received + scout reports | Every 2-5 minutes |
| Base Agent | Which tasks to queue, which bots to reassign, demand signals | Local state: deposits, cubes, bots, threats within territory radius | Every 5-10 seconds |
| Bot Brain | Movement, combat reactions, task execution | Perception cone: nearby enemies, cubes, deposits, natives | Every frame |

---

## 4. Patron Agent (Strategic Layer)

### 4.1 Core Concept

The Home Planet Patron is a remote AI entity that:
- **Does NOT see** the colony's internal state (no aggregated base reports)
- **Only knows** what cubes it has received and what scouts have reported back
- **Sends requests** for specific materials ("Ship 10 chrome cubes")
- **Rewards compliance** with blueprints, tech unlocks, reinforcement bot drops
- **Communicates** via otter holographic projections (built: `OtterRenderer.tsx`, `otterTrade.ts`)

This is architecturally simpler than an omniscient governor because the patron operates on a slow cadence with limited information.

### 4.2 PatronAgent Class

```typescript
export class PatronAgent {
  readonly civId: string;
  readonly raceName: string;
  readonly personality: PatronPersonality;
  readonly priorities: MaterialPriority[];

  // What the patron knows (limited!)
  private totalCubesReceived: Record<string, number>;
  private totalBlueprintsSent: number;
  private currentRequest: PatronRequest | null;
  private requestHistory: PatronRequest[];
  private satisfactionLevel: number;  // 0..1, affects reward quality

  // Timing
  private tickTimer = 0;
  private readonly TICK_INTERVAL: number;  // 90-300s by difficulty

  tick(dt: number): PatronDirective | null;
  receiveCubeShipment(materialType: string, quantity: number): PatronReward | null;
}
```

**Key interfaces:**

```typescript
export interface PatronDirective {
  request: PatronRequest | null;
  availableBlueprints: string[];
  reinforcementReady: boolean;
  satisfactionLevel: number;
  patronMessage: string;         // dialogue for otter hologram
}

export interface PatronRequest {
  materialType: string;          // "chrome", "iron", "fiber_optics"
  quantity: number;
  fulfilled: number;
  urgency: number;               // 0..1
  description: string;           // "We need chrome for the weapons program"
}

export interface PatronReward {
  type: 'blueprint' | 'reinforcement' | 'supplies' | 'tech_unlock';
  blueprintId?: string;
  unitType?: string;
  count?: number;
  materialType?: string;
  quantity?: number;
  techId?: string;
}

export type PatronPersonality = 'demanding' | 'supportive' | 'mysterious' | 'strategic';
```

### 4.3 Request Generation

The patron selects materials based on race-specific priorities with weighted random selection. Quantity scales with game time (requests grow larger as the colony matures). Request fulfillment improves satisfaction, which improves reward quality.

### 4.4 Reward Quality Scaling

| Satisfaction | Reward Tier |
|-------------|-------------|
| > 0.9 | Reinforcement drop (2 race-unique units) |
| > 0.6 | Blueprint unlock (next in tech progression) |
| < 0.6 | Basic supplies (5 scrap cubes) |

### 4.5 The Patron Dependency Gradient

The patron relationship is a cost-benefit curve that shifts across the 3 acts:

```
ACT 1: Patron is only blueprint source.
       Shipment fraction: HIGH (0.5-0.7)

ACT 2: Furnace recipes produce some blueprints locally.
       Patron still offers BETTER blueprints (rare, unique).
       Shipment fraction: MEDIUM (0.2-0.4)

ACT 3: Local production covers most needs.
       Patron is one trade partner among many.
       Shipment fraction: LOW (0.05-0.2)
```

For AI factions, each Base Agent evaluates this gradient using a heuristic that considers: local cube count, active threats, patron satisfaction, wall coverage, race bias, local blueprint capacity, and tech tier. The fraction naturally decreases as the colony advances.

### 4.6 Patron-Colony Communication Flow

```
PatronAgent generates PatronDirective
    |
    v
PatronDirective.request -> updates OtterTrader inventory
    | (requests become "trades" the player/AI can fulfill)
    v
PatronDirective.patronMessage -> updates OtterEntity.lines
    | (dialogue appears in speech bubbles near otter holograms)
    v
Colony ships cubes -> PatronAgent.receiveCubeShipment()
    |
    v
PatronReward -> unlocks blueprint in otterTrade inventory
    |         -> or spawns reinforcement bots at colony
    v
OtterTrader inventory refreshes with new blueprints/rewards
```

For AI factions, this happens programmatically. For the player faction, the otter hologram UI is the patron interface.

### 4.7 Race-Specific Patron Behavior

| Race | Patron Name | Personality | Primary Request | Receives |
|------|-------------|-------------|-----------------|----------|
| Reclaimers | Salvage Overseer | Supportive | Scrap cubes | Recycling blueprints, efficiency upgrades |
| Volt Collective | War Council | Demanding | Chrome, rare alloy | Weapon blueprints, shock trooper drops |
| Signal Choir | Signal Archive | Mysterious | Fiber optics, rare alloy | Hacking tools, infiltrator blueprints |
| Iron Creed | Forge Council | Strategic | Iron, copper | Fortification plans, bastion blueprints |

---

## 5. Base Agent (Operational Layer)

### 5.1 Core Concept

The Base Agent is the **primary intelligence** in the architecture. It is NOT a subordinate executing patron commands -- it IS the colony's operational brain. Each settlement is an autonomous event-driven node.

The existing `BaseAgent.ts` implements this pattern with:
- Local event bus (`on()` / `emit()`)
- Work queue with task categories and priorities (`BaseWorkQueue.ts`)
- State scanners that generate tasks from local conditions
- Patrol tasks as guaranteed fallback (no bot ever idles)

### 5.2 How Patron Directives Influence Base Behavior

The patron doesn't command bases directly. Patron directives become **priority modifiers** on the base's local decision-making:

- If patron requests a specific material, the base boosts harvest priority for deposits of that material type
- Matching cubes already in inventory get queued for transport to the shipment point
- Low patron satisfaction causes the base to prioritize shipment transport
- The base still makes its own decisions -- the patron only shifts weights

### 5.3 Event Types

```typescript
export const BaseEventType = {
  HARVEST_NEEDED: 'harvest_needed',
  TRANSPORT_NEEDED: 'transport_needed',
  BUILD_QUEUED: 'build_queued',
  DEFENSE_ALERT: 'defense_alert',
  FURNACE_READY: 'furnace_ready',
  PATROL_ROUTE: 'patrol_route',
  CUBE_REQUEST: 'cube_request',
  PATRON_REQUEST: 'patron_request',
  SHIPMENT_READY: 'shipment_ready',
  BLUEPRINT_RECEIVED: 'blueprint_received',
  REINFORCEMENT_DROP: 'reinforcement_drop',
  NATIVE_SPOTTED: 'native_spotted',
  NATIVE_TRADE: 'native_trade',
} as const;
```

### 5.4 Inter-Base Communication: Demand Signals

Bases communicate needs through **demand signals** transmitted over wire/signal networks. This creates emergent supply chain behavior without centralized planning.

```typescript
interface DemandSignal {
  fromBaseId: string;
  type: 'material' | 'bots' | 'defense';
  materialType?: string;
  quantity?: number;
  botRole?: BotRole;
  urgency: number;             // 0..1
  fulfilled: boolean;
  isPatronRequest?: boolean;   // true if serving a patron request
}
```

Demand signals flow naturally:
1. Base A's furnace is starving -- broadcasts material demand
2. Base B has surplus of that material -- dispatches transport bot
3. Patron requests chrome -- Base C near chrome deposit boosts harvest, broadcasts surplus
4. Base D far from chrome -- broadcasts demand, receives chrome via inter-base transport

### 5.5 Resource Allocation Tables

Each base adjusts bot allocation based on the current act and situation:

| Act / Emphasis | Harvest % | Transport % | Build % | Combat % | Scout % |
|----------------|-----------|-------------|---------|----------|---------|
| Act 1: Patron request active | 50 | 25 | 10 | 10 | 5 |
| Act 1: Building first base | 35 | 20 | 25 | 10 | 10 |
| Act 2: Factory automation | 30 | 30 | 25 | 5 | 10 |
| Act 2: Expanding territory | 25 | 15 | 30 | 10 | 20 |
| Act 3: Conquest | 20 | 15 | 10 | 45 | 10 |
| Act 3: Multi-base economy | 30 | 25 | 20 | 15 | 10 |
| Any act: Under attack | 15 | 10 | 10 | 55 | 10 |

Base adjusts at most 1-2 bots per tick to avoid thrashing.

### 5.6 Base Lifecycle

**Spawning a new Base Agent (expansion):**
```
Base detects unclaimed rich deposits in range
  -> Queues BUILD task { type: 'outpost', position: nearDeposit }
  -> Builder bot constructs outpost
  -> New BaseAgent instantiated, starts with 0 bots, 0 cubes
  -> Broadcasts demand: "need harvesters" + "need cubes"
  -> Nearest existing base sends bots + cubes
  -> New base begins autonomous operation
```

**Losing a Base Agent (destruction):**
```
Enemy raid destroys outpost building
  -> BaseAgent dissolved
  -> Orphaned bots "phone home" to nearest surviving BaseAgent
  -> Surviving base adopts orphaned bots via adoptBot()
  -> Cubes on ground near destroyed base become loot
```

---

## 6. Bot Brain (Tactical Layer)

### 6.1 FSM States

```typescript
export const BotState = {
  // Core states
  IDLE: 'idle',
  PATROL: 'patrol',
  SEEK_TARGET: 'seek_target',
  ATTACK: 'attack',
  FLEE: 'flee',
  GUARD: 'guard',
  FOLLOW: 'follow',

  // Economy states
  HARVEST: 'harvest',
  COMPRESS: 'compress',
  PICKUP_CUBE: 'pickup_cube',
  CARRY_CUBE: 'carry_cube',
  DELIVER_CUBE: 'deliver_cube',
  BUILD: 'build',
  SCOUT: 'scout',
  MOVE_TO_BASE: 'move_to_base',

  // Colonization states
  SHIP_HOME: 'ship_home',
  TRADE_NATIVE: 'trade_native',
} as const;
```

### 6.2 The "Phone Home" Guarantee

**No bot ever idles.** This is the architectural invariant:

```
Bot has a task from Base work queue?
  YES -> execute task (BotBrain handles tactical execution)
  NO  |
      v
Bot Brain produces a state transition?
  YES -> execute (e.g., enemy detected -> SEEK_TARGET)
  NO  |
      v
Bot is stuck / idle / task completed / target lost?
  -> "Phone Home" to nearest Base Agent
  -> Base Agent work queue ALWAYS has tasks:
      Priority 1: Pending harvest task
      Priority 2: Loose cubes needing transport
      Priority 3: Pending build order
      Priority 4: Patrol base perimeter (ALWAYS available)
```

In practice, the IDLE state waits 1 second, then claims a task from the nearest base's work queue. If nothing else is available, patrol is always there.

### 6.3 State Machines

**Harvest cycle:**
```
IDLE -> claim HARVEST task -> HARVEST (move to deposit, grind 8-15s)
  -> powder full -> COMPRESS (2-4s, cube spawns at feet)
  -> HARVEST (return to deposit for next load)
  -> deposit depleted -> IDLE -> Phone Home
  [enemy in aggro range at any point -> SEEK_TARGET interrupt]
```

**Transport cycle:**
```
IDLE -> claim TRANSPORT task -> PICKUP_CUBE (move to cube, grab)
  -> destination check:
     -> shipment point -> SHIP_HOME -> PatronAgent.receiveCubeShipment()
     -> furnace/stockpile -> CARRY_CUBE (move, 30% speed penalty)
  -> arrive -> DELIVER_CUBE (drop) -> IDLE -> Phone Home
  [health < 30% + enemies -> drop cube, FLEE]
```

**Build cycle:**
```
IDLE -> claim BUILD task -> BUILD (move to site, construct 0-100%)
  -> complete -> [outpost? new BaseAgent spawns] -> IDLE -> Phone Home
  [enemy interrupt -> progress saved, SEEK_TARGET]
```

**Scout cycle:**
```
IDLE -> claim SCOUT task -> SCOUT (spiral outward, reveal fog)
  -> discover deposit/enemy/native -> record in faction knowledge
  -> area 80% explored -> IDLE -> Phone Home
```

### 6.4 Emergency Overrides

Checked every frame, override any current state:

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Health < 20% AND enemies nearby | Drop cube if carrying, FLEE toward home base, base emits DEFENSE_ALERT |
| 2 | Health < 50% AND outnumbered 3:1 | FLEE |
| 3 | Home base under attack AND role == combat | Override current orders, GUARD base at max speed |

### 6.5 Yuka Vehicle Steering

Each bot is a Yuka Vehicle with steering behaviors:

| SteeringCommand | Yuka Behavior |
|-----------------|---------------|
| STOP | Clear all behaviors |
| SEEK | SeekBehavior toward target |
| ARRIVE | ArriveBehavior (decelerate at target) |
| FLEE | FleeBehavior from target |
| WANDER | WanderBehavior |

For squads: `OffsetPursuitBehavior` (FormationSystem.ts) + `SeparationBehavior` for spacing.
Carrying a cube reduces maxSpeed by 30% (from config).

### 6.6 Extended BotContext

```typescript
export interface BotContext {
  // Existing fields (position, health, weapon, etc.)

  // Base Agent reference
  homeBaseId: string;
  homeBase: BaseAgent | null;

  // Economy perception
  nearbyDeposits: NearbyDeposit[];
  nearbyCubes: NearbyCube[];
  nearbyFurnaces: NearbyFurnace[];
  powderLevel: number;               // 0..1
  carryingCube: string | null;

  // Role
  assignedRole: BotRole;

  // Colonization-specific
  nearbyNatives: NearbyNative[];
  patronRequestMaterial: string | null;
}
```

---

## 7. Governor Evaluators (Legacy Reference)

The v2 architecture used Yuka GOAP evaluators (`Think` + `GoalEvaluator`) at the strategic level. The v4 architecture replaces this with the simpler Patron/Base model. However, the evaluator weights remain as **faction personality biases** that influence base-level decision-making.

### 7.1 Strategic Evaluator Categories

| Evaluator | What It Measures | Drives |
|-----------|-----------------|--------|
| **Expand** | Few territories, surplus resources, no threats | Outpost placement, scout priority |
| **Economy** | Low production rate, empty build slots | Factory construction, furnace recipes |
| **Military** | Border pressure, can afford units, army weaker than enemy | Combat bot production, raid planning |
| **Defense** | Recent attacks, unfortified borders | Wall construction, turret placement |
| **Research** | Stability (low threats), available compute | Tech progression, blueprint production |
| **Diplomacy** | Known neighbors, surplus materials for trade | Trade offers, alliance formation |

### 7.2 Evaluator Formulas

Each evaluator calculates a desirability score (0..1) multiplied by the faction's `characterBias` weight:

**ExpandEvaluator:**
```
fewTerritories = max(0, 1 - claimedTiles / 50) * 0.5
hasResources = scrapMetal > 20 ? 0.3 : 0
noThreats = borderPressure < 0.3 ? 0.2 : 0
score = characterBias * (fewTerritories + hasResources + noThreats)
```

**EconomyEvaluator:**
```
lowProduction = productionRate < claimedTiles * 0.5 ? 0.6 : 0.1
hasSpace = emptyBuildSlots > 0 ? 0.3 : 0
score = characterBias * (lowProduction + hasSpace)
```

**MilitaryEvaluator:**
```
threat = borderPressure * 0.5
canAfford = refinedMetal > 10 ? 0.3 : 0
lowArmy = militaryStrength < enemyStrength ? 0.4 : 0
score = characterBias * (threat + canAfford + lowArmy)
```

**DefenseEvaluator:**
```
recentAttack = recentDamage > 0 ? 0.5 : 0
unfortified = unfortifiedBorders / max(1, totalBorders) * 0.4
score = characterBias * (recentAttack + unfortified)
```

**ResearchEvaluator:**
```
stable = borderPressure < 0.2 ? 0.3 : 0
hasCompute = computeAvailable > 5 ? 0.3 : 0
score = characterBias * (0.1 + stable + hasCompute)
```

**DiplomacyEvaluator:**
```
hasNeighbors = knownCivs > 0 ? 0.2 : 0
wantsTrade = surplusTypes > 0 ? 0.3 : 0
score = characterBias * (hasNeighbors + wantsTrade)
```

In the current architecture, these scores feed into Base Agent allocation decisions rather than a top-level GOAP planner.

---

## 8. Faction Governor Profiles

Each civilization race has distinct personality biases from `config/civilizations.json`:

### 8.1 The Reclaimers

```json
{
  "displayName": "The Reclaimers",
  "description": "Scavenger machines that rebuild from ruins. Strong economy, weak military.",
  "color": "#00ffaa",
  "governor": {
    "expandWeight": 0.7,
    "economyWeight": 1.2,
    "militaryWeight": 0.5,
    "defenseWeight": 0.8,
    "researchWeight": 0.9,
    "diplomacyWeight": 1.0
  },
  "patronPersonality": "supportive",
  "shipHomeBias": 0.6,
  "nativePolicy": "trade_first",
  "bonuses": {
    "miningEfficiency": 1.3,
    "fabricationSpeed": 1.2,
    "combatDamage": 0.8
  }
}
```

**Play pattern:** Ships scrap home aggressively in Act 1 (cheap, builds satisfaction fast). Recycling blueprints let cubes go further. Economy advantage compounds. Expands fast in Act 2. Economic Victory path in Act 3 with massive cube stockpiles. Trades with alien natives for rare materials.

### 8.2 Volt Collective

```json
{
  "displayName": "Volt Collective",
  "description": "Lightning-worshipping machines. Powerful storms, aggressive expansion.",
  "color": "#ffaa00",
  "governor": {
    "expandWeight": 1.1,
    "economyWeight": 0.7,
    "militaryWeight": 1.3,
    "defenseWeight": 0.6,
    "researchWeight": 0.5,
    "diplomacyWeight": 0.4
  },
  "patronPersonality": "demanding",
  "shipHomeBias": 0.3,
  "nativePolicy": "aggressive",
  "bonuses": {
    "lightningRodOutput": 1.5,
    "combatDamage": 1.3,
    "miningEfficiency": 0.9
  }
}
```

**Play pattern:** Patron demands chrome/rare alloy -- expensive but weapons follow. Low shipment fraction (keeps cubes for military). Shock trooper reinforcements arrive early. Forward bases built aggressively. First raids by minute 20. Shortest Act 2 of all races. Military Victory path. Hostile to alien natives.

### 8.3 The Signal Choir

```json
{
  "displayName": "The Signal Choir",
  "description": "Networked hive-mind. Supreme hacking, distributed compute.",
  "color": "#aa44ff",
  "governor": {
    "expandWeight": 0.8,
    "economyWeight": 0.9,
    "militaryWeight": 0.6,
    "defenseWeight": 0.7,
    "researchWeight": 1.4,
    "diplomacyWeight": 1.1
  },
  "patronPersonality": "mysterious",
  "shipHomeBias": 0.45,
  "nativePolicy": "study",
  "bonuses": {
    "hackingSpeed": 1.5,
    "signalRange": 1.4,
    "miningEfficiency": 0.8
  }
}
```

**Play pattern:** Patron requests fiber optics. Blueprint rewards are hacking tools. Reaches factory phase fastest (research bias 1.5). Studies alien natives. Infiltrator bots deployed to hack enemy infrastructure. Subjugation Victory path -- hacks instead of brute force.

### 8.4 Iron Creed

```json
{
  "displayName": "Iron Creed",
  "description": "Armored fortress builders. Slow expansion, impenetrable defense.",
  "color": "#aa8844",
  "governor": {
    "expandWeight": 0.4,
    "economyWeight": 1.0,
    "militaryWeight": 0.9,
    "defenseWeight": 1.5,
    "researchWeight": 0.7,
    "diplomacyWeight": 0.6
  },
  "patronPersonality": "strategic",
  "shipHomeBias": 0.4,
  "nativePolicy": "fortify",
  "bonuses": {
    "buildingHealth": 1.5,
    "wallStrength": 2.0,
    "combatDamage": 1.1,
    "miningEfficiency": 0.7,
    "expansionSpeed": 0.6
  }
}
```

**Play pattern:** Patron requests iron/copper for fortification specs. Home base fully walled before expanding. Slowest expansion but most secure. Each outpost becomes a fortress. Longest Act 2 of all races. Territorial Victory path -- slow advance, hold every inch. Builds walls around native territory borders.

---

## 9. Situation Assessment (WorldQueryInterface)

Governors and Base Agents communicate with the game world through a typed interface. No direct ECS access -- all queries go through this abstraction:

```typescript
export interface WorldQueryInterface {
  // Economy queries
  countCubesOwnedBy(civId: string): number;
  getLooseCubesNear(position: Vec3, radius: number, civId: string): CubeInfo[];
  getDepositsInRadius(position: Vec3, radius: number): DepositInfo[];
  getKnownDeposits(civId: string): DepositInfo[];
  getEconomyStats(civId: string): { incomePerMinute: number; demandPerMinute: number };
  getEconomyBias(civId: string): number;

  // Base state
  getBaseLocalState(baseId: string): BaseLocalState | null;

  // Bot queries
  getBotsForFaction(civId: string): BotInfo[];
  getBotsNearBase(baseId: string, radius: number): BotInfo[];

  // Territory queries
  getTerritoryCount(civId: string): number;
  getTerritoryCountNear(position: Vec3, radius: number): number;
  getTotalMapTiles(): number;
  countUnclaimedDepositsKnownBy(civId: string): number;
  getExploredFraction(civId: string): number;

  // Military queries
  getMilitaryIntel(civId: string): MilitaryIntel;
  getEstimatedBasePosition(civId: string): Vec3 | null;
  getWallCoverage(civId: string): number;
  getCubePileExposure(civId: string): number;

  // Diplomacy queries
  getDiplomacySnapshot(civId: string): DiplomacySnapshot;
  getDiplomaticStance(civA: string, civB: string): DiplomaticStance;
  getSurplusMaterial(civId: string): MaterialSurplus | null;
  getDeficitMaterial(civId: string): MaterialDeficit | null;

  // Native queries
  getNativesInRadius(position: Vec3, radius: number): NativeInfo[];
  getNativeRelationship(civId: string, nativeId: string): NativeRelationship;

  // Tech queries
  getTechSnapshot(civId: string): TechSnapshot;

  // Building queries
  hasFurnace(civId: string): boolean;
  getFurnacesAt(position: Vec3, radius: number): FurnaceInfo[];
  getBuildingCount(civId: string): number;
  getBuildingCountNear(position: Vec3, radius: number): number;
  isBuildComplete(position: Vec3): boolean;

  // Commands (world mutations)
  spawnCube(params: SpawnCubeParams): string;
  spawnBot(params: SpawnBotParams): string;
  setFurnaceRecipe(furnaceId: string, recipe: string): void;
  destroyCube(cubeId: string): void;

  // Time
  getGameTime(): number;
}
```

---

## 10. Action Execution: Plans to Bot Commands

### 10.1 CivilizationAI Entry Point

```typescript
export class CivilizationAI {
  readonly civId: string;
  private patron: PatronAgent;
  private bases: BaseAgent[];
  private currentDirective: PatronDirective | null;

  tick(dt: number, world: WorldQueryInterface): void {
    // Patron: slow cadence, generates directives
    const newDirective = this.patron.tick(dt);
    if (newDirective) this.currentDirective = newDirective;

    // Each Base Agent: autonomous operation with patron influence
    for (const base of this.bases) {
      const localState = world.getBaseLocalState(base.baseId);
      if (localState) {
        if (this.currentDirective) {
          applyPatronDirective(base, this.currentDirective, localState);
        }
        base.tick(localState);
      }
    }

    // Update inter-base connections
    this.updateBaseConnections(world);
  }

  shipCubesToPatron(materialType: string, quantity: number): PatronReward | null;
  onOutpostBuilt(outpostId: string, position: Vec3): void;
  onBaseDestroyed(baseId: string): void;
}
```

### 10.2 System Registration

```typescript
const factionAIs = new Map<string, CivilizationAI>();

export function initCivilizationAI(factions: FactionStartInfo[]): void {
  for (const f of factions) {
    factionAIs.set(f.civId, new CivilizationAI(
      f.civId, f.startingBaseId, f.startingPosition, f.config,
    ));
  }
}

export function civilizationAISystem(dt: number, world: WorldQueryInterface): void {
  for (const [_, ai] of factionAIs) {
    ai.tick(dt, world);
  }
}
```

### 10.3 Event Flow Examples

**Patron request fulfilled:**
```
Patron: "Ship 15 chrome cubes"
  -> Each base receives directive as priority modifier
  -> Base near chrome deposit: boosts harvest priority
  -> Base far from chrome: broadcasts demand "need chrome"
  -> Chrome-base dispatches transport bot with cubes
  -> Ship bot: SHIP_HOME -> PatronAgent.receiveCubeShipment()
  -> Patron satisfied -> blueprint reward
  -> Blueprint unlocked in otterTrade.ts
```

**Base destroyed:**
```
Enemy raid destroys outpost
  -> CivilizationAI.onBaseDestroyed() -> BaseAgent dissolved
  -> Orphaned bots: Phone Home -> nearest surviving base adopts them
  -> Surviving bases: DEFENSE_ALERT, reassign combat bots
```

---

## 11. Pacing Integration: 3-Act Aggression Scaling

### 11.1 Act Detection

Act transitions are organic, based on colony state, not player action:

```typescript
function getCurrentAct(
  techTier: number,
  localBlueprintCapacity: number,
  baseCount: number,
): 1 | 2 | 3 {
  if (techTier >= 3 && localBlueprintCapacity > 0.7 && baseCount >= 3) return 3;
  if (techTier >= 2 && localBlueprintCapacity > 0.3) return 2;
  return 1;
}
```

### 11.2 Race-Specific Pacing

| Race | Act 1 Duration | Act 2 Duration | Act 3 Start | Notes |
|------|---------------|---------------|-------------|-------|
| Reclaimers | 0-15 min | 15-35 min | ~35 min | Economy focus, slow military ramp |
| Volt Collective | 0-12 min | 12-25 min | ~25 min | Fastest to Act 3, raids by minute 20 |
| Signal Choir | 0-13 min | 13-30 min | ~30 min | Fastest to Act 2 (research bias), infiltration begins early |
| Iron Creed | 0-18 min | 18-45 min | ~45 min | Slowest overall, but most secure at each phase |

### 11.3 Patron Behavior Across Acts

```typescript
function getPatronBehaviorForAct(act: 1 | 2 | 3): PatronBehavior {
  switch (act) {
    case 1: return {
      requestFrequency: 'frequent',
      rewardQuality: 'essential',
      reinforcementChance: 0.3,
      tolerance: 'patient',
    };
    case 2: return {
      requestFrequency: 'moderate',
      rewardQuality: 'premium',
      reinforcementChance: 0.15,
      tolerance: 'expectant',
    };
    case 3: return {
      requestFrequency: 'rare',
      rewardQuality: 'exclusive',
      reinforcementChance: 0.05,
      tolerance: 'pragmatic',
    };
  }
}
```

---

## 12. Performance Budgets

### 12.1 Tick Frequencies

| Component | Easy | Normal | Hard | Nightmare |
|-----------|------|--------|------|-----------|
| Patron tick | 300s | 180s | 120s | 90s |
| Base Agent tick | 10s | 7s | 5s | 3s |
| Bot Brain | per frame | per frame | per frame | per frame |
| Demand signal broadcast | 10s cooldown | 10s cooldown | 10s cooldown | 10s cooldown |

### 12.2 Computation Costs

- **PatronAgent.tick():** Lightweight -- weighted random selection, satisfaction math. O(priorities).
- **BaseAgent.tick():** Scans deposits, cubes, threats in territory radius. O(entities in radius). Capped by `territoryRadius: 40`.
- **BotBrain.update():** Per-frame FSM transition check. O(1) per bot. Perception queries cached.
- **Inter-base demand:** O(bases * demand_signals). Typically 2-5 bases * 3-5 demands = negligible.

### 12.3 Bot Reassignment Limits

Base adjusts at most 2 bots per tick (`maxBotReassignmentsPerTick: 2`) to prevent allocation thrashing. This means a base with 10 bots takes 5 ticks minimum to fully reallocate, providing natural inertia against rapid priority oscillation.

---

## 13. Difficulty Scaling

| Parameter | Easy | Normal | Hard | Nightmare |
|-----------|------|--------|------|-----------|
| Patron tick interval | 300s | 180s | 120s | 90s |
| Base Agent tick interval | 10s | 7s | 5s | 3s |
| Patron request size | 50% | 100% | 130% | 150% |
| Harvest speed multiplier | 0.7x | 1.0x | 1.3x | 1.5x |
| Build speed multiplier | 0.7x | 1.0x | 1.2x | 1.5x |
| Decision quality | Random noise +/-30% | +/-10% | Perfect | Perfect + rush |
| Patron satisfaction rate | 1.5x (forgiving) | 1.0x | 0.8x (demanding) | 0.6x (ruthless) |
| Reinforcement quality | Basic bots | Mixed | Elite bots | Elite + timing |
| Inter-base efficiency | Slow transport | Normal | Fast transport | Instant |

### 13.1 Decision Quality Noise

```typescript
function applyDifficultyNoise(score: number, difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':      return score * (0.7 + Math.random() * 0.6);  // +/- 30%
    case 'normal':    return score * (0.9 + Math.random() * 0.2);  // +/- 10%
    case 'hard':      return score;                                 // perfect
    case 'nightmare': return score * 1.1;                           // bonus
  }
}
```

On Easy, AI factions make suboptimal decisions frequently -- building the wrong thing, expanding at the wrong time. On Nightmare, AI factions play perfectly and get a 10% bonus to aggressive strategies.

---

## 14. Config References

### 14.1 config/civilizations.json

Faction definitions including governor profiles, patron personality, starting units, bonuses, ship-home bias, and native policy. See Section 8 for full per-race configs.

### 14.2 config/aiColony.json

All AI-specific tunables externalized:

```json
{
  "patron": {
    "tickIntervalByDifficulty": { "easy": 300, "normal": 180, "hard": 120, "nightmare": 90 },
    "satisfactionDecayPerMinute": 0.02,
    "satisfactionGainPerCube": 0.02,
    "requestCompletionSatisfactionBonus": 0.15,
    "reinforcementSatisfactionThreshold": 0.7,
    "actTransitions": {
      "act2MinTechTier": 2,
      "act2MinLocalBlueprintCapacity": 0.3,
      "act3MinTechTier": 3,
      "act3MinLocalBlueprintCapacity": 0.7,
      "act3MinBases": 3
    }
  },
  "baseAgent": {
    "tickIntervalByDifficulty": { "easy": 10, "normal": 7, "hard": 5, "nightmare": 3 },
    "territoryRadius": 40,
    "demandSignalCooldownSeconds": 10,
    "maxBotReassignmentsPerTick": 2,
    "shipmentFractionByRace": {
      "reclaimers": 0.6,
      "volt_collective": 0.3,
      "signal_choir": 0.45,
      "iron_creed": 0.4
    },
    "nativePolicyByRace": {
      "reclaimers": "trade_first",
      "volt_collective": "aggressive",
      "signal_choir": "study",
      "iron_creed": "fortify"
    }
  },
  "botBrain": {
    "harvestDurationSeconds": 12,
    "compressDurationSeconds": 3,
    "buildDurationSeconds": 15,
    "carrySpeedPenalty": 0.3,
    "fleeHealthThreshold": 0.2,
    "outnumberedFleeRatio": 3,
    "phoneHomeIdleThreshold": 1.0,
    "scoutSpiralStepSize": 10
  },
  "allocationByAct": {
    "act1_patron_request":   { "harvest": 50, "transport": 25, "build": 10, "combat": 10, "scout": 5 },
    "act1_building_base":    { "harvest": 35, "transport": 20, "build": 25, "combat": 10, "scout": 10 },
    "act2_factory":          { "harvest": 30, "transport": 30, "build": 25, "combat": 5,  "scout": 10 },
    "act2_expanding":        { "harvest": 25, "transport": 15, "build": 30, "combat": 10, "scout": 20 },
    "act3_conquest":         { "harvest": 20, "transport": 15, "build": 10, "combat": 45, "scout": 10 },
    "act3_multi_base":       { "harvest": 30, "transport": 25, "build": 20, "combat": 15, "scout": 10 },
    "any_under_attack":      { "harvest": 15, "transport": 10, "build": 10, "combat": 55, "scout": 10 }
  },
  "difficultyMultipliers": {
    "easy":      { "harvest": 0.7, "build": 0.7, "decisionNoise": 0.3, "patronSatisfactionRate": 1.5 },
    "normal":    { "harvest": 1.0, "build": 1.0, "decisionNoise": 0.1, "patronSatisfactionRate": 1.0 },
    "hard":      { "harvest": 1.3, "build": 1.2, "decisionNoise": 0,   "patronSatisfactionRate": 0.8 },
    "nightmare": { "harvest": 1.5, "build": 1.5, "decisionNoise": 0,   "patronSatisfactionRate": 0.6 }
  }
}
```

### 14.3 Existing Code Integration

| Existing Code | Governor Role |
|---------------|--------------|
| `src/systems/otterTrade.ts` | IS the patron trade interface |
| `src/rendering/OtterRenderer.tsx` | IS the patron communication channel |
| `src/ai/base/BaseAgent.ts` | IS the autonomous base agent |
| `src/ai/base/BaseWorkQueue.ts` | IS the task claiming system |
| `src/ai/BotBrain.ts` | IS the bot tactical FSM (extended with economy + colonization states) |
| `src/ai/BotOrders.ts` | IS the order system (extended with new order types) |
| `src/ai/BotContext.ts` | IS the perception snapshot (extended with economy + native data) |
| `src/ai/BotVehicle.ts` | IS the Yuka Vehicle factory |
| `src/ai/PerceptionSystem.ts` | IS the vision cone checks |
| `src/ai/FormationSystem.ts` | IS the squad movement |
| `src/ai/goap/GOAPPlanner.ts` | IS the A* planner for bot-level tactical planning |
| `src/ai/goap/FactionPersonality.ts` | Feeds into patron personality |

### 14.4 Yuka Class Usage

```
yuka.Vehicle                  (one per bot, steering behaviors)
yuka.SteeringBehavior
  +-- SeekBehavior, ArriveBehavior, FleeBehavior, WanderBehavior
  +-- OffsetPursuitBehavior   (formations)
  +-- SeparationBehavior      (squad spacing)
yuka.Vision                   (cone-of-sight per bot)
yuka.MemorySystem             (entity memory per bot)
yuka.NavMesh                  (pathfinding)
```

Yuka's `Think` and `GoalEvaluator` classes are NOT used at the strategic level. Strategy comes from patron requests + local base reactions, not from evaluator scoring. This is a deliberate simplification from v2.
