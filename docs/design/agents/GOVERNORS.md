# AI Governor Architecture

**Status:** Authoritative
**Date:** 2026-03-11
**Scope:** The complete AI system for Syntheteria — philosophy, 3-layer architecture, faction behavior, and implementation spec.

**Merges:** CONSCIOUSNESS_MODEL.md, GDD-009 (Colony AI Architecture), GDD-003 (Governors/Evaluators)

**See also:**
- `docs/design/world/RACES.md` — Per-faction lore, GOAP weight tables, base agency flavour, military doctrines
- `docs/design/gameplay/COMBAT.md` §13 — AI combat decision rules (when to attack, when to retreat, target selection)
- `docs/design/gameplay/OVERVIEW.md` §Civilizations — Player-facing summary of AI faction biases

---

## 1. AI Philosophy: Emergent Machine Intelligence

Syntheteria's AI is not a human emperor making grand strategy decisions. It is **distributed machine intelligence** — awareness that emerges from computation, extends through signal networks, and degrades under resource pressure.

### 1.1 Core Principle: Computation as Awareness

Every AI entity in Syntheteria requires computational resources to function. More compute means sharper decision-making, faster reactions, better planning. Less compute means degraded awareness — slower responses, worse task prioritization, vulnerability to hostile takeover.

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
| Normal operation | Yes | Yes | Full control — base agent runs optimally |
| Compute shortage | Yes | No | Unit vulnerable to hacking, cannot update task priorities |
| Signal loss | No | N/A | Unit continues last order, can be hacked by enemies |
| Both | No | No | Unit isolated and vulnerable — easy raid target |

Signal loss occurs when units move beyond relay range or when enemy Signal Choir infiltrators disrupt relay chains. Isolated bots continue their last orders but cannot receive new tasks from their base agent, making them predictable and exploitable.

### 1.3 Failure States and Vulnerability

The AI system models cascading failure — losing one component can trigger a chain reaction:

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

The AI architecture models robot colonies, not human empires. Robots don't think like emperors with grand strategy — they are rational agents making cost-benefit calculations. The game follows a 3-act structure that evolves organically through a **patron dependency gradient**:

| Act | Phase | Patron Dependency | Core Gameplay |
|-----|-------|-------------------|---------------|
| **Act 1: Colonization** | Early game (0-15 min) | High — patron is sole source of blueprints | Harvest, compress, ship cubes home, receive blueprints. Build first base and furnace. Learn the core loop. |
| **Act 2: Factory** | Mid game (15-40 min) | Declining — furnace recipes produce blueprints locally | Automate with belts and machines. Optimize resource flows. Patron still useful but no longer essential. |
| **Act 3: Conquest** | Late game (40+ min) | Low — patron is one trade partner among many | Self-sufficient multi-base empire. Bot armies, territory control, subjugate rival colonies. |

The transition between acts is **not dramatic**. There is no "declare independence" moment. As local blueprint production increases, the marginal value of shipping cubes home decreases. The colony gradually stops needing the patron. Both sides have vested interest — the patron wants resources, the colony wants tech — so the relationship persists but shifts in balance.

### 2.2 The Three Actors

**Home Planet Patron (per race):** An AI on the home planet that dispatched this colony. Communicates infrequently via otter hologram projections. Sends material requests, delivers blueprints and reinforcements in exchange. Each race has a different patron with different priorities.

**Colonial Bases (per settlement):** Autonomous event-driven agents anchored to physical buildings. Each base has its own event bus, work queue, bot roster, cube inventory. Bases communicate needs via demand signals over wire/signal networks. No central brain — emergent coordination.

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

## 4. GOAP Governor (Strategic Layer)

### 4.1 CivilizationGovernor — What It Actually Does

`src/ai/goap/CivilizationGovernor.ts` is the **GOAP planner** that runs at the strategic level. One governor exists per AI faction. Each tick it:

1. Reads the faction's current `FactionSituation` (resource level, threat, tech tier, idle units, outpost count, exploration fraction)
2. Computes effective goal weights by applying situational modifiers to personality weights
3. Scores all `CivGoal` values and sorts by priority
4. Runs the A* GOAP planner (`GOAPPlanner.ts`) to find the cheapest action sequence achieving the top goal
5. Returns the next `GOAPAction` to execute, or falls back to `BasicHarvest` (no bot ever idles)

The governor re-evaluates goals every 10 ticks (`REEVAL_INTERVAL = 10`). It only switches goals when a new goal outprioritizes the current goal by more than 0.2 (`PRIORITY_OVERRIDE_THRESHOLD`), providing inertia against rapid oscillation.

### 4.2 CivGoals (from GoalTypes.ts)

Eight strategic goals the governor evaluates each tick:

| CivGoal | Description |
|---------|-------------|
| `expand_territory` | Claim new territory via outposts |
| `gather_resources` | Collect scrap, e-waste, and cubes |
| `build_defenses` | Build walls and turrets |
| `research_tech` | Advance through tech tree |
| `attack_enemy` | Launch raid against enemy faction |
| `scout_map` | Send scouts to reveal fog-of-war |
| `trade` | Propose trade deal with neighbor |
| `hoard_cubes` | Accumulate material cubes |

Goals with already-satisfied desired world state get a 90% priority penalty (multiplied by 0.1) to drive the governor toward goals that still need work.

### 4.3 GOAP Actions (from ActionTypes.ts)

Ten actions the planner can chain. Each has preconditions, effects on world state, and a cost:

| Action | Cost | Preconditions | Effects |
|--------|-----:|---------------|---------|
| `BasicHarvest` | 3 | (none) | `has_resources`, `resources_gathered` |
| `SendScoutParty` | 2 | `has_idle_units` | `has_scouted`, `map_scouted` |
| `AssignMiners` | 2 | `has_idle_units` | `has_miners`, `has_resources`, `resources_gathered` |
| `TradeOffer` | 3 | `has_resources`, `has_trade_partner` | `trade_complete` |
| `HoardCubes` | 3 | `has_miners` | `cubes_hoarded` |
| `ProduceUnit` | 5 | `has_resources` | `has_idle_units` |
| `BuildOutpost` | 4 | `has_scouted`, `has_resources` | `has_outpost`, `territory_expanded` |
| `ResearchTech` | 6 | `has_resources` | `has_tech_progress`, `tech_researched` |
| `BuildWalls` | 5 | `has_resources`, `has_outpost` | `has_defenses`, `defenses_built` |
| `LaunchRaid` | 7 | `has_idle_units`, `has_enemy_target` | `attack_launched` |

`BasicHarvest` has no preconditions — it guarantees the planner can always find some plan from any starting state. It is also the ultimate fallback the governor returns when the planner fails entirely, with `needsBaseAssignment: true` set so the bot knows to phone home.

### 4.4 GOAPPlanner (A* Search)

`src/ai/goap/GOAPPlanner.ts` implements a standard A* search over world states:

- Each node is a `WorldState` (partial `Record<WorldStateKey, boolean>`)
- Edges are actions whose preconditions are met in the current node's state
- Edge cost is the action's `cost` field
- Heuristic: count of unsatisfied goal conditions (admissible — never overestimates)
- Max 1000 iterations before giving up (prevents infinite loops)

Typical plan length is 1-4 actions. For example, to expand territory from a resource-sparse start:
```
[AssignMiners]  -> has_resources
  +[BuildOutpost] -> territory_expanded
```
Or from a fully idle state:
```
[SendScoutParty] -> has_scouted
  +[AssignMiners] -> has_resources
    +[BuildOutpost] -> territory_expanded
```

### 4.5 FactionPersonality (from FactionPersonality.ts)

`src/ai/goap/FactionPersonality.ts` bridges `config/civilizations.json` to goal weights.

**How weights are computed:**

Each `CivGoal` is a weighted sum of relevant `governorBias` fields:

| CivGoal | Bias contributions |
|---------|--------------------|
| `expand_territory` | expansion×0.7 + military×0.3 |
| `gather_resources` | economy×0.5 + mining×0.5 |
| `build_defenses` | defense×0.8 + military×0.2 |
| `research_tech` | research×0.9 + economy×0.1 |
| `attack_enemy` | military×0.8 + expansion×0.2 |
| `scout_map` | expansion×0.6 + military×0.4 |
| `trade` | economy×0.7 + research×0.3 |
| `hoard_cubes` | economy×0.6 + mining×0.4 |

Normalized to `[0..1]` by dividing by `1.5 * totalContribution`. Bias values range ~0.7–1.5.

**Situational modifiers applied each tick:**

| Condition | Effect |
|-----------|--------|
| `resourceLevel < 0.3` | `gather_resources` × up to 1.6x, `hoard_cubes` × up to 1.6x |
| `underAttack == true` | `build_defenses` × 1.5, `expand_territory` × 0.5, `trade` × 0.3 |
| `explorationLevel < 0.4` | `scout_map` × up to 1.6x |
| `idleRatio > 0.5` | `expand_territory` × up to 1.75x, `attack_enemy` × up to 1.75x |
| `techProgress < 0.5` | `research_tech` × up to 1.75x |
| `outpostCount == 0` | `expand_territory` × 1.4x |

### 4.6 GovernorActionExecutor (from GovernorActionExecutor.ts)

`src/ai/goap/GovernorActionExecutor.ts` translates GOAP actions into concrete system calls. It implements the `IActionExecutor` interface and is injected into the governor via `setActionExecutor()`.

Only two GOAP actions require direct system calls. All others are resolved at the unit-brain level:

| GOAP Action | Executor behavior |
|-------------|------------------|
| `launch_raid` | Calls `findRaidTargets(faction)` → `assessRaidViability(faction, target)` → `planRaid(faction, position, unitIds, homePosition, tick)`. Returns raid ID on success, null if no viable target. |
| `research_tech` | Calls `getResearchProgress(faction)` (no-op if in progress), then `getAvailableTechs(faction)`, then `startResearch(faction, tech.id)`. Returns tech ID on success, null otherwise. |
| All other actions | Returns null — handled by unit brain layer. |

The executor receives an `ExecutionContext` with: `faction` (ID), `unitIds` (available bots), `homePosition` (Vec3), `tick` (current sim tick).

### 4.7 GovernorSystem (Bridge Layer)

`src/systems/governorSystem.ts` bridges the GOAP governor to the running game. It sits on top of `aiCivilization.ts` (which handles passive harvest and phase-cycling) and adds strategic prioritization.

On each tick it:
1. Reads `CivState` from `aiCivilization.ts` (resources, threat level, territory, tech tier)
2. Translates `CivState` → `FactionSituation` (governor personality inputs)
3. Translates `CivState` → `WorldState` (GOAP boolean conditions)
4. Calls `governor.tick(situation, worldState)` to get the `GOAPAction`
5. Translates `GOAPAction.name` into bot commands issued to idle bots

**GOAP action → bot command translation:**

| GOAPAction | Bot Command |
|------------|-------------|
| `basic_harvest` | `harvest` at nearest deposit |
| `assign_miners` | `harvest` issued to all idle bots |
| `send_scout_party` | `patrol` with wide radius |
| `build_outpost` | `build` at expansion target position |
| `build_walls` | `build` at base perimeter |
| `research_tech` | `idle` (tech is passive) |
| `launch_raid` | `attack` toward nearest enemy base |
| `hoard_cubes` | `harvest` directed to stockpile |
| `produce_unit` | `idle` (production handled by fabrication system) |
| `trade_offer` | `idle` (handled by diplomacySystem) |

### 4.8 aiCivilization.ts (Passive Economic Layer)

`src/systems/aiCivilization.ts` provides the base economic loop that the GOAP governor runs on top of. It is a state machine (`GATHER → BUILD → EXPAND → DEFEND`) with passive resource harvesting scaled by faction biases. The governor does not replace this — it adds strategic prioritization on top.

**CivPhases:**

| Phase | Duration | Trigger | Behavior |
|-------|----------:|---------|---------|
| `GATHER` | ~50 ticks | Start, or after defense | Passive resource accumulation at faction harvest rate |
| `BUILD` | ~50 ticks | Enough cubes to build | Consume cubes for buildings/units |
| `EXPAND` | ~50 ticks | Buildings placed | Grow territory, dispatch bots outward |
| `DEFEND` | ~50 ticks | `threatLevel` high | Pull bots back, prioritize turrets and walls |

---

## 5. Patron Agent (Strategic Layer)

### 5.1 Core Concept

The Home Planet Patron is a remote AI entity that:
- **Does NOT see** the colony's internal state (no aggregated base reports)
- **Only knows** what cubes it has received and what scouts have reported back
- **Sends requests** for specific materials ("Ship 10 chrome cubes")
- **Rewards compliance** with blueprints, tech unlocks, reinforcement bot drops
- **Communicates** via otter holographic projections (built: `OtterRenderer.tsx`, `otterTrade.ts`)

This is architecturally simpler than an omniscient governor because the patron operates on a slow cadence with limited information.

### 5.2 PatronAgent Class

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

### 5.3 Request Generation

The patron selects materials based on race-specific priorities with weighted random selection. Quantity scales with game time (requests grow larger as the colony matures). Request fulfillment improves satisfaction, which improves reward quality.

### 5.4 Reward Quality Scaling

| Satisfaction | Reward Tier |
|-------------|-------------|
| > 0.9 | Reinforcement drop (2 race-unique units) |
| > 0.6 | Blueprint unlock (next in tech progression) |
| < 0.6 | Basic supplies (5 scrap cubes) |

### 5.5 The Patron Dependency Gradient

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

### 5.6 Patron-Colony Communication Flow

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

### 5.7 Race-Specific Patron Behavior

See `docs/design/world/RACES.md` for full per-faction lore. Summary of AI behavioral differences:

| Race | Patron Name | Personality | Primary Request | Receives |
|------|-------------|-------------|-----------------|----------|
| Reclaimers | Salvage Overseer | Supportive | Scrap cubes | Recycling blueprints, efficiency upgrades |
| Volt Collective | War Council | Demanding | Chrome, rare alloy | Weapon blueprints, shock trooper drops |
| Signal Choir | Signal Archive | Mysterious | Fiber optics, rare alloy | Hacking tools, infiltrator blueprints |
| Iron Creed | Forge Council | Strategic | Iron, copper | Fortification plans, bastion blueprints |

---

## 6. Base Agent (Operational Layer)

### 6.1 Core Concept

The Base Agent is the **primary intelligence** in the architecture. It is NOT a subordinate executing patron commands — it IS the colony's operational brain. Each settlement is an autonomous event-driven node.

The existing `BaseAgent.ts` implements this pattern with:
- Local event bus (`on()` / `emit()`)
- Work queue with task categories and priorities (`BaseWorkQueue.ts`)
- State scanners that generate tasks from local conditions
- Patrol tasks as guaranteed fallback (no bot ever idles)

### 6.2 How Patron Directives Influence Base Behavior

The patron doesn't command bases directly. Patron directives become **priority modifiers** on the base's local decision-making:

- If patron requests a specific material, the base boosts harvest priority for deposits of that material type
- Matching cubes already in inventory get queued for transport to the shipment point
- Low patron satisfaction causes the base to prioritize shipment transport
- The base still makes its own decisions — the patron only shifts weights

### 6.3 Event Types

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

### 6.4 Inter-Base Communication: Demand Signals

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
1. Base A's furnace is starving — broadcasts material demand
2. Base B has surplus of that material — dispatches transport bot
3. Patron requests chrome — Base C near chrome deposit boosts harvest, broadcasts surplus
4. Base D far from chrome — broadcasts demand, receives chrome via inter-base transport

### 6.5 Resource Allocation Tables

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

### 6.6 Base Lifecycle

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

## 7. Faction Governor Profiles

Each civilization race has distinct personality biases. The authoritative source for **lore, military doctrine, base agency flavour, matchup notes, and per-faction GOAP weight explanations** is `docs/design/world/RACES.md`.

This section records the **config values** from `config/civilizations.json` and how they translate to GOAP behavior.

### 7.1 Config Schema

Each faction entry in `config/civilizations.json` has:

```typescript
{
  name: string;
  description: string;
  color: string;         // hex, used for territory overlay + emissive color
  accentColor: string;
  governorBias: {
    economy: number;     // 0.7 - 1.5 range
    mining: number;
    military: number;
    defense: number;
    research: number;
    expansion: number;
  };
  uniqueAbilities: { ... };    // passive bonuses (not governor-controlled)
  uniqueUnit: { ... };         // faction-specific bot type
  uniqueBuilding: { ... };     // faction-specific structure
  startingBonus: { ... };      // starting cube inventory
  researchSpeedMultiplier: number;
  harvestSpeedMultiplier: number;
  buildCostMultiplier: number;
}
```

Note: `governorBias` does NOT have a `diplomacy` key. The `trade` and `hoard_cubes` goals are computed from `economy` and `mining` bias combinations (see Section 4.5).

### 7.2 Reclaimers

Config `governorBias` (from `config/civilizations.json`):

| Bias | Value |
|------|------:|
| economy | 1.5 |
| mining | 1.3 |
| military | 0.8 |
| defense | 1.0 |
| research | 0.7 |
| expansion | 1.0 |

Derived GOAP goal priorities (highest to lowest):
1. `gather_resources` (economy + mining → strong)
2. `hoard_cubes` (economy + mining → strong)
3. `build_defenses` (defense moderate)
4. `expand_territory` (expansion + military moderate)
5. `research_tech` (research weak — slowest tech race)

Economic modifiers: `harvestSpeedMultiplier: 1.2`, `buildCostMultiplier: 0.9`, `researchSpeedMultiplier: 0.8`

Starting bonus: 20 scrap metal + 5 e-waste cubes

Unique ability: `scrapRecovery` (destroyed enemies yield 1.5x scrap), `rustResistance` (30% storm damage reduction to buildings)

See RACES.md §Reclaimers for lore, military doctrine, and base agency details.

### 7.3 Volt Collective

Config `governorBias`:

| Bias | Value |
|------|------:|
| economy | 0.8 |
| mining | 1.0 |
| military | 1.5 |
| defense | 0.9 |
| research | 1.0 |
| expansion | 1.3 |

Derived GOAP goal priorities (highest to lowest):
1. `attack_enemy` (military + expansion → very strong)
2. `expand_territory` (expansion + military → strong)
3. `scout_map` (expansion + military → strong, needed to find targets)
4. `research_tech` (research moderate)
5. `gather_resources` (economy + mining moderate)

Economic modifiers: `harvestSpeedMultiplier: 1.0`, `buildCostMultiplier: 1.1`, `researchSpeedMultiplier: 1.0`

Starting bonus: 10 scrap + 10 e-waste

Unique ability: `stormHarvest` (+25% power during storms), `shockWeapons` (15% stun chance on hit)

See RACES.md §Volt Collective for lore and military doctrine.

### 7.4 Signal Choir

Config `governorBias`:

| Bias | Value |
|------|------:|
| economy | 1.0 |
| mining | 0.8 |
| military | 0.7 |
| defense | 1.0 |
| research | 1.5 |
| expansion | 0.9 |

Derived GOAP goal priorities (highest to lowest):
1. `research_tech` (research → very strong)
2. `trade` (economy + research → strong, gathers intelligence via trade)
3. `build_defenses` (defense + military moderate)
4. `gather_resources` (economy + mining moderate)
5. `expand_territory` (expansion moderate)
6. `attack_enemy` (military weak — prefers hacking over direct assault)

Economic modifiers: `harvestSpeedMultiplier: 0.9`, `buildCostMultiplier: 1.0`, `researchSpeedMultiplier: 1.5`

Starting bonus: 15 e-waste + 3 intact components

Unique ability: `signalBoost` (relay range ×1.3), `hackAcceleration` (hack speed ×1.4)

See RACES.md §Signal Choir for lore and military doctrine.

### 7.5 Iron Creed

Config `governorBias`:

| Bias | Value |
|------|------:|
| economy | 1.0 |
| mining | 1.0 |
| military | 1.0 |
| defense | 1.5 |
| research | 0.8 |
| expansion | 0.7 |

Derived GOAP goal priorities (highest to lowest):
1. `build_defenses` (defense → very strong — wall everything)
2. `gather_resources` (economy + mining → strong)
3. `hoard_cubes` (economy + mining → strong, cubes go into walls)
4. `attack_enemy` (military moderate)
5. `expand_territory` (expansion + military moderate, but expansion bias low)

Economic modifiers: `harvestSpeedMultiplier: 1.0`, `buildCostMultiplier: 0.85`, `researchSpeedMultiplier: 0.9`

Starting bonus: 15 scrap + 2 intact components

Unique ability: `fortification` (wall HP ×1.4), `garrisonBonus` (+20% damage behind walls)

See RACES.md §Iron Creed for lore and military doctrine.

---

## 8. Situation Assessment (WorldQueryInterface)

Governors and Base Agents communicate with the game world through a typed interface. No direct ECS access — all queries go through this abstraction:

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

## 9. Action Execution: Plans to Bot Commands

### 9.1 CivilizationAI Entry Point

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

### 9.2 System Registration

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

### 9.3 Event Flow Examples

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

## 10. Pacing Integration: 3-Act Aggression Scaling

### 10.1 Act Detection

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

### 10.2 Race-Specific Pacing

| Race | Act 1 Duration | Act 2 Duration | Act 3 Start | Notes |
|------|---------------|---------------|-------------|-------|
| Reclaimers | 0-15 min | 15-35 min | ~35 min | Economy focus, slow military ramp |
| Volt Collective | 0-12 min | 12-25 min | ~25 min | Fastest to Act 3, raids by minute 20 |
| Signal Choir | 0-13 min | 13-30 min | ~30 min | Fastest to Act 2 (research bias 1.5), infiltration begins early |
| Iron Creed | 0-18 min | 18-45 min | ~45 min | Slowest overall, but most secure at each phase |

---

## 11. Performance Budgets

### 11.1 Tick Frequencies

| Component | Easy | Normal | Hard | Nightmare |
|-----------|------|--------|------|-----------|
| Patron tick | 300s | 180s | 120s | 90s |
| Base Agent tick | 10s | 7s | 5s | 3s |
| Bot Brain | per frame | per frame | per frame | per frame |
| Governor GOAP tick | every 10 frames | every 10 frames | every 10 frames | every 10 frames |
| Demand signal broadcast | 10s cooldown | 10s cooldown | 10s cooldown | 10s cooldown |

### 11.2 Computation Costs

- **PatronAgent.tick():** Lightweight — weighted random selection, satisfaction math. O(priorities).
- **BaseAgent.tick():** Scans deposits, cubes, threats in territory radius. O(entities in radius). Capped by `territoryRadius: 40`.
- **CivilizationGovernor.tick():** Scores 8 goals, runs A* planner over ~10 actions. O(goals + planner iterations). Planner capped at 1000 iterations; typical plan < 5 iterations.
- **BotBrain.update():** Per-frame FSM transition check. O(1) per bot. Perception queries cached.
- **Inter-base demand:** O(bases * demand_signals). Typically 2-5 bases * 3-5 demands = negligible.

### 11.3 Bot Reassignment Limits

Base adjusts at most 2 bots per tick (`maxBotReassignmentsPerTick: 2`) to prevent allocation thrashing. This means a base with 10 bots takes 5 ticks minimum to fully reallocate, providing natural inertia against rapid priority oscillation.

---

## 12. Difficulty Scaling

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

### 12.1 Decision Quality Noise

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

On Easy, AI factions make suboptimal decisions frequently — building the wrong thing, expanding at the wrong time. On Nightmare, AI factions play perfectly and get a 10% bonus to aggressive strategies.

---

## 13. Config References

### 13.1 config/civilizations.json

Faction definitions including: `governorBias` (6 fields), unique abilities, unique unit, unique building, starting bonuses, `researchSpeedMultiplier`, `harvestSpeedMultiplier`, `buildCostMultiplier`. See Section 7 for per-race values.

### 13.2 config/aiColony.json

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

### 13.3 Existing Code Integration

| Existing Code | Governor Role |
|---------------|--------------|
| `src/ai/goap/CivilizationGovernor.ts` | GOAP strategic planner (per-faction, per-tick) |
| `src/ai/goap/GOAPPlanner.ts` | A* search planner — finds cheapest action sequence |
| `src/ai/goap/ActionTypes.ts` | 10 GOAP actions + WorldStateKey enum |
| `src/ai/goap/GoalTypes.ts` | 8 CivGoals + GoalState type |
| `src/ai/goap/FactionPersonality.ts` | Config → goal weights, situational modifiers |
| `src/ai/goap/GovernorActionExecutor.ts` | Bridges GOAP decisions to raid + research systems |
| `src/systems/governorSystem.ts` | Wires governor to aiCivilization.ts + bot commands |
| `src/systems/aiCivilization.ts` | Passive economic state machine (GATHER/BUILD/EXPAND/DEFEND) |
| `src/systems/otterTrade.ts` | IS the patron trade interface |
| `src/rendering/OtterRenderer.tsx` | IS the patron communication channel |
| `src/ai/base/BaseAgent.ts` | IS the autonomous base agent |
| `src/ai/base/BaseWorkQueue.ts` | IS the task claiming system |
| `src/ai/BotBrain.ts` | IS the bot tactical FSM |
| `src/ai/BotOrders.ts` | IS the order system |
| `src/ai/BotContext.ts` | IS the perception snapshot |
| `src/ai/BotVehicle.ts` | IS the Yuka Vehicle factory |
| `src/ai/PerceptionSystem.ts` | IS the vision cone checks |
| `src/ai/FormationSystem.ts` | IS the squad movement |

### 13.4 Yuka Class Usage

```
yuka.Vehicle                  (one per bot, steering behaviors)
yuka.SteeringBehavior
  +-- SeekBehavior, ArriveBehavior, FleeBehavior, WanderBehavior
  +-- ObstacleAvoidanceBehavior  (always active, weight 3.0)
  +-- SeparationBehavior         (always active, weight 1.5)
  +-- OffsetPursuitBehavior   (formations — FormationSystem.ts)
yuka.Vision                   (cone-of-sight per bot — PerceptionSystem.ts)
yuka.MemorySystem             (entity memory per bot)
yuka.NavMesh                  (pathfinding — NavMeshBuilder.ts)
yuka.FollowPathBehavior       (path following — PathfindingSystem.ts)
```

Yuka's `Think` and `GoalEvaluator` classes are **not used** in the strategic layer. Strategy comes from `CivilizationGovernor` (GOAP A* + FactionPersonality weights), not from Yuka evaluator scoring.
