# GDD-009: Colony AI Architecture -- Distributed Event-Driven AI for Autonomous Play

**Status:** Draft (v4 -- 3-Act Colonization Model)
**Date:** 2026-03-10
**Scope:** The complete AI system for Syntheteria's 3-act 4X game. Act 1 (Colonization): colony depends on home-planet patron for blueprints. Act 2 (Factory): automation reduces patron dependency organically. Act 3 (Conquest): self-sufficient multi-base empires compete for territory. Bases are autonomous event-driven nodes; bots are reactive agents; patron dependency is a cost-benefit gradient, not a dramatic break.

**Supersedes:** v1 (Commander tier), v2 (Base Agency with GOAP Governor), v3 (Colonization with Independence mechanic)
**Reference:** COLONIZATION-MODEL.md (the design pivot document)

---

## 1. The 3-Act Model

### 1.1 Why Colonization, Not Civilization

The v1/v2 architecture modeled AI civilizations as self-contained strategic entities with omniscient GOAP governors. This was:
- **Thematically wrong**: Robots don't think like human emperors with grand strategy
- **Architecturally complex**: GOAP preconditions were unreachable, evaluators needed omniscient world snapshots
- **Disconnected from existing code**: `otterTrade.ts`, `eventBus.ts`, and `OtterRenderer.tsx` already implement a patron-colony relationship

The game follows a 3-act structure that evolves organically:

### 1.2 The Three Acts

| Act | Phase | Patron Dependency | Core Gameplay |
|---|---|---|---|
| **Act 1: Colonization** | Early game (0-15 min) | High -- patron is sole source of blueprints | Harvest, compress, ship cubes home, receive blueprints. Build first base and furnace. Learn the core loop. |
| **Act 2: Factory** | Mid game (15-40 min) | Declining -- furnace recipes produce blueprints locally | Automate with belts and machines. Optimize resource flows. Patron still useful but no longer essential. Dependency decreases as a natural cost-benefit gradient. |
| **Act 3: Conquest** | Late game (40+ min) | Low -- patron is one trade partner among many | Self-sufficient multi-base empire. Bot armies, territory control, subjugate rival colonies. Deal with alien natives. Inter-faction warfare. |

The transition between acts is **not dramatic**. There is no "declare independence" moment. For robots and AIs, it is a rational cost-benefit calculation: as local blueprint production increases, the marginal value of shipping cubes home decreases. The colony gradually stops needing the patron as much. Both sides have vested interest -- the patron wants resources, the colony wants tech -- so the relationship persists but shifts in balance.

### 1.3 The Three Actors

**Home Planet Patron (per race):** An AI on the home planet that dispatched this colony. Communicates infrequently via otter hologram projections. Sends material requests ("We need 20 chrome cubes"), delivers blueprints and reinforcements in exchange. Each race has a different patron with different priorities. In Act 1, the patron is essential. By Act 3, the patron is one trade partner among many.

**Colonial Bases (per settlement):** Autonomous event-driven agents anchored to physical buildings. Each base has its own event bus, work queue, bot roster, cube inventory. Bases communicate needs via demand signals over wire/signal networks. No central brain -- emergent coordination.

**Alien Natives (indigenous):** Were here before the colonists. Not competing for patron favor. Can be traded with, fought, or subjugated. Their relationship with each colony adds strategic depth, particularly in Act 3 when territorial control matters.

---

## 2. Architecture Overview

```
  HOME PLANET PATRON                    runs every 2-5 minutes
  One per faction. Remote AI with priorities.
  Sends: material requests, blueprint rewards, reinforcement drops
  Receives: cube shipments from colony
  Output: PatronDirective (broadcast to all colony bases)
            │
            ├──────────────┬──────────────┐
            ▼              ▼              ▼
  BASE AGENT (Event Bus)  BASE AGENT     BASE AGENT     runs every 5-10s
  One per settlement.     (outpost #1)   (outpost #2)
  Autonomous event-driven node.
  Local event bus emits: harvest_needed, transport_needed,
                         build_queued, defense_alert, furnace_ready
  Bots subscribe to events and self-assign tasks.
  Output: WorkQueue tasks (bots claim from queue)
            │
            ▼
  BOT BRAIN (Reactive Agent)             runs every frame
  One per bot entity. Yuka Vehicle + FSM.
  Subscribes to nearest base's event bus.
  Claims tasks from work queue. Executes with steering behaviors.
  If no task available -> "Phone Home" -> guaranteed fallback.
  Output: SteeringOutput (movement + action commands)
```

### 2.1 What Changed from v2

| v2 (GOAP Governor) | v3 (Colonization) |
|---|---|
| Yuka Think + 6 GoalEvaluators | Home Planet Patron with material requests |
| Governor aggregates all base reports | Patron doesn't see base internals -- only receives shipments |
| StrategicDirective with goal + cubeBudgetFraction | PatronDirective with material requests + blueprint offers |
| Governor decides Economy vs Military vs Expand | Bases decide locally based on events + patron requests |
| DiplomacyEvaluator for inter-faction trade | Otter hologram trade interface (already built: `otterTrade.ts`) |
| ResearchEvaluator for tech progression | Tech = blueprints earned by shipping cubes home |
| Abstract "victory condition evaluation" | 4X victory conditions (economic, military, scientific, territorial) |

### 2.2 What Gets Preserved from v2

All of these remain exactly as designed:

| Component | Status |
|---|---|
| BaseAgent with local event bus + work queue | **Kept** -- now the PRIMARY intelligence layer |
| Phone Home guarantee (no bot ever idles) | **Kept** -- unchanged |
| Inter-base demand signals | **Kept** -- now the ONLY coordination mechanism |
| Bot Brain FSM with HARVEST/COMPRESS/CARRY/BUILD states | **Kept** -- unchanged |
| Extended BotOrders and BotContext | **Kept** -- unchanged |
| Resource allocation tables per goal | **Kept** -- now driven by patron request type, not governor goal |
| Base lifecycle (spawn on outpost built, dissolve on destroyed) | **Kept** -- unchanged |
| Difficulty scaling | **Kept** -- adjusted for patron pacing |
| WorldQueryInterface | **Kept** -- unchanged |

### 2.3 What Gets Replaced

| Current File | Replaced By |
|---|---|
| `src/systems/aiCivilization.ts` | Base Agent layer (local event bus) |
| `src/ai/goap/CivilizationGovernor.ts` | Home Planet Patron (simple request/reward) |
| GovernorEntity with 6 evaluators | PatronAgent with material priorities |
| StrategicDirective | PatronDirective (requests + rewards) |
| Abstract `CivState.resources` counters | Real ECS entity queries per base |
| `passiveHarvest()` rounding bug | Real bot harvesting via Base Agent events |
| Hardcoded `HOSTILE_FACTIONS` table | Diplomacy-driven hostility from faction relations |

### 2.4 What Gets Preserved (Existing Code)

| Current File | Status |
|---|---|
| `src/systems/otterTrade.ts` | **Kept** -- IS the patron trade interface |
| `src/rendering/OtterRenderer.tsx` | **Kept** -- IS the patron communication channel |
| `src/ai/base/BaseAgent.ts` | **Kept** -- already implements local event bus |
| `src/ai/base/BaseWorkQueue.ts` | **Kept** -- already implements task claiming |
| `src/ai/BotBrain.ts` | **Kept** -- extend with economy states |
| `src/ai/BotOrders.ts` | **Kept** -- extend with new order types |
| `src/ai/BotContext.ts` | **Kept** -- extend with economy perception |
| `src/ai/BotVehicle.ts` | **Kept** -- Yuka Vehicle factory |
| `src/ai/PerceptionSystem.ts` | **Kept** -- vision cone checks |
| `src/ai/ThreatAssessment.ts` | **Refactored** -- use dynamic hostility |
| `src/ai/MemorySystem.ts` | **Kept** -- entity memory |
| `src/ai/FormationSystem.ts` | **Kept** -- squad movement |
| `src/ai/goap/GOAPPlanner.ts` | **Kept** -- A* planner for bot-level tactical planning |
| `src/ai/goap/FactionPersonality.ts` | **Kept** -- feeds into patron personality |

---

## 3. Home Planet Patron (Strategic Layer)

### 3.1 Core Concept

The Home Planet Patron replaces the omniscient GOAP Governor. It is a remote AI entity that:
- **Does NOT see** the colony's internal state (no aggregated base reports)
- **Only knows** what cubes it has received and what scouts have reported back
- **Sends requests** for specific materials ("Ship 10 chrome cubes")
- **Rewards compliance** with blueprints, tech unlocks, reinforcement bot drops
- **Communicates** via otter holographic projections (already built)

This is architecturally simpler than the Governor because the patron doesn't need a WorldQueryInterface or real-time economy snapshots. It operates on a slow cadence (every 2-5 minutes) with limited information.

### 3.2 PatronAgent Class

```typescript
// game/ai/patron/PatronAgent.ts

/**
 * Home Planet Patron -- the "Old World" AI that sent this colony.
 * Operates on limited information: only knows what cubes it received
 * and what intelligence has been reported back.
 *
 * NOT a Yuka entity -- pure TypeScript, fully testable.
 */
export class PatronAgent {
  readonly civId: string;
  readonly raceName: string;
  readonly personality: PatronPersonality;
  readonly priorities: MaterialPriority[];  // from config/civilizations.json

  // -- What the patron knows (limited!) --
  private totalCubesReceived: Record<string, number>;  // material -> count
  private totalBlueprintsSent: number;
  private currentRequest: PatronRequest | null;
  private requestHistory: PatronRequest[];
  private satisfactionLevel: number;  // 0..1, affects reward quality

  // -- Timing --
  private tickTimer = 0;
  private readonly TICK_INTERVAL: number;  // 120-300s depending on difficulty

  constructor(civId: string, config: CivilizationConfig) {
    this.civId = civId;
    this.raceName = config.name;
    this.personality = config.patronPersonality;
    this.priorities = config.patronPriorities;
    this.totalCubesReceived = {};
    this.totalBlueprintsSent = 0;
    this.currentRequest = null;
    this.requestHistory = [];
    this.satisfactionLevel = 0.5;
    this.TICK_INTERVAL = config.patronTickInterval;
  }

  /**
   * Called every frame. Internal timer gates actual work.
   */
  tick(dt: number): PatronDirective | null {
    this.tickTimer += dt;
    if (this.tickTimer < this.TICK_INTERVAL) return null;
    this.tickTimer = 0;

    return this.generateDirective();
  }

  /**
   * Colony ships cubes to the patron. Updates satisfaction and
   * potentially triggers blueprint rewards.
   */
  receiveCubeShipment(materialType: string, quantity: number): PatronReward | null {
    this.totalCubesReceived[materialType] =
      (this.totalCubesReceived[materialType] ?? 0) + quantity;

    // Check if current request is fulfilled
    if (this.currentRequest &&
        this.currentRequest.materialType === materialType) {
      this.currentRequest.fulfilled += quantity;

      if (this.currentRequest.fulfilled >= this.currentRequest.quantity) {
        // Request complete! Generate reward.
        this.satisfactionLevel = Math.min(1.0, this.satisfactionLevel + 0.15);
        const reward = this.generateReward();
        this.requestHistory.push(this.currentRequest);
        this.currentRequest = null;
        return reward;
      }
    }

    // Partial fulfillment still improves satisfaction
    this.satisfactionLevel = Math.min(1.0, this.satisfactionLevel + 0.02 * quantity);
    return null;
  }

  /**
   * Generate the next directive based on patron priorities and history.
   */
  private generateDirective(): PatronDirective {
    // If no current request, generate one based on race priorities
    if (!this.currentRequest) {
      this.currentRequest = this.generateRequest();
    }

    return {
      request: this.currentRequest,
      availableBlueprints: this.getAvailableBlueprints(),
      reinforcementReady: this.satisfactionLevel > 0.7,
      satisfactionLevel: this.satisfactionLevel,
      patronMessage: this.generateMessage(),
    };
  }

  /**
   * Generate a material request based on race-specific priorities.
   * Higher priority materials are requested more often and in larger quantities.
   */
  private generateRequest(): PatronRequest {
    // Weight selection by priority
    const totalWeight = this.priorities.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = this.priorities[0];

    for (const priority of this.priorities) {
      roll -= priority.weight;
      if (roll <= 0) {
        selected = priority;
        break;
      }
    }

    // Quantity scales with game time and satisfaction
    const baseQuantity = selected.baseRequestQuantity;
    const timeScale = 1 + Math.floor(this.requestHistory.length * 0.3);
    const quantity = Math.min(baseQuantity * timeScale, selected.maxRequestQuantity);

    return {
      materialType: selected.materialType,
      quantity,
      fulfilled: 0,
      urgency: selected.weight / totalWeight,
      description: selected.requestDescription,
    };
  }

  /**
   * Generate a reward for fulfilling a request.
   * Quality scales with satisfaction level.
   */
  private generateReward(): PatronReward {
    this.totalBlueprintsSent++;

    // Higher satisfaction = better rewards
    if (this.satisfactionLevel > 0.9) {
      return { type: 'reinforcement', unitType: this.getRaceUniqueUnit(), count: 2 };
    } else if (this.satisfactionLevel > 0.6) {
      return { type: 'blueprint', blueprintId: this.getNextBlueprint() };
    } else {
      return { type: 'supplies', materialType: 'scrap_iron', quantity: 5 };
    }
  }
}
```

### 3.3 Patron Types and Interfaces

```typescript
export interface PatronDirective {
  request: PatronRequest | null;       // what the patron wants shipped home
  availableBlueprints: string[];       // blueprints available for purchase
  reinforcementReady: boolean;         // patron will drop bots if satisfied
  satisfactionLevel: number;           // 0..1, affects reward quality
  patronMessage: string;               // dialogue for otter hologram
}

export interface PatronRequest {
  materialType: string;                // "chrome", "iron", "fiber_optics"
  quantity: number;                    // how many cubes to ship
  fulfilled: number;                   // how many shipped so far
  urgency: number;                     // 0..1, how badly the patron wants this
  description: string;                 // "We need chrome for the weapons program"
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

export interface MaterialPriority {
  materialType: string;
  weight: number;                      // selection probability weight
  baseRequestQuantity: number;         // starting request size
  maxRequestQuantity: number;          // cap for late-game requests
  requestDescription: string;          // patron's flavor text
}

export type PatronPersonality = 'demanding' | 'supportive' | 'mysterious' | 'strategic';
```

### 3.4 Race-Specific Patron Behavior

Each race's home-planet patron has distinct priorities, personality, and rewards:

| Race | Patron Name | Personality | Primary Request | Ships Home | Receives |
|---|---|---|---|---|---|
| Reclaimers | Salvage Overseer | Supportive | Scrap analysis data | Scrap cubes | Recycling blueprints, efficiency upgrades |
| Volt Collective | War Council | Demanding | Energy research data | Power cubes, chrome | Weapon blueprints, shock trooper drops |
| Signal Choir | Signal Archive | Mysterious | Communication logs | Fiber optics, rare alloy | Hacking tools, infiltrator blueprints |
| Iron Creed | Forge Council | Strategic | Engineering specs | Iron, copper | Fortification plans, bastion blueprints |

```typescript
// From config/civilizations.json patronPriorities field
const RECLAIMER_PRIORITIES: MaterialPriority[] = [
  {
    materialType: 'scrap_iron',
    weight: 2.0,
    baseRequestQuantity: 10,
    maxRequestQuantity: 40,
    requestDescription: 'Send scrap samples. Our recycling program needs feedstock.',
  },
  {
    materialType: 'copper',
    weight: 1.0,
    baseRequestQuantity: 5,
    maxRequestQuantity: 20,
    requestDescription: 'Copper reserves are low back home. Ship what you can.',
  },
];

const VOLT_PRIORITIES: MaterialPriority[] = [
  {
    materialType: 'chrome',
    weight: 2.0,
    baseRequestQuantity: 8,
    maxRequestQuantity: 30,
    requestDescription: 'Chrome. Now. The weapons program cannot wait.',
  },
  {
    materialType: 'rare_alloy',
    weight: 1.5,
    baseRequestQuantity: 5,
    maxRequestQuantity: 15,
    requestDescription: 'Rare alloy for our new battle chassis. Do not disappoint us.',
  },
];
```

### 3.5 The Patron Dependency Gradient

The patron relationship is a cost-benefit curve that shifts across the 3 acts:

```
ACT 1 — Colony depends on patron:
  Grind ore -> Compress cube -> Ship home -> Receive blueprint
  No local blueprint production. Patron is the only source.
  Shipment fraction: HIGH (0.5-0.7)

ACT 2 — Colony becomes self-sufficient:
  Furnace recipes now produce some blueprints locally.
  Patron still offers BETTER blueprints (rare recipes, unique units).
  Rational cost-benefit: ship when patron offers something worth it.
  Shipment fraction: MEDIUM (0.2-0.4)

ACT 3 — Colony is self-sufficient:
  Local production covers most needs.
  Patron is one trade partner among many (other factions, alien natives).
  Ship cubes home only for highest-tier blueprints or reinforcements.
  Shipment fraction: LOW (0.05-0.2)
```

This is NOT a dramatic "declare independence" moment. For robots and AIs, it is a rational cost-benefit gradient. There is vested interest on both sides -- the patron wants resources, the colony wants tech. The relationship persists but the balance shifts.

For AI factions, each Base Agent evaluates this gradient using a simple heuristic:

```typescript
/**
 * Should this base ship cubes home or use them locally?
 * Returns fraction of surplus cubes to ship (0..1).
 *
 * The fraction naturally decreases as the colony advances through acts:
 * - Act 1: high (patron essential for blueprints)
 * - Act 2: medium (local furnace produces some blueprints)
 * - Act 3: low (self-sufficient, patron is optional luxury)
 */
function calculateShipmentFraction(
  localCubeCount: number,
  localThreats: number,
  patronSatisfaction: number,
  wallCoverage: number,
  raceBias: number,          // from civilizations.json: shipHomeBias
  localBlueprintCapacity: number,  // 0..1, fraction of blueprints colony can produce locally
  techTier: number,          // higher tier = less patron dependency
): number {
  // Base: race preference, reduced by local production capability
  let fraction = raceBias * (1 - localBlueprintCapacity * 0.7);

  // Tech tier naturally reduces dependency (Act progression)
  fraction *= Math.max(0.2, 1 - techTier * 0.15);

  // Under threat? Keep cubes local.
  if (localThreats > 0) fraction *= 0.3;

  // Walls incomplete? Keep cubes for building.
  if (wallCoverage < 0.5) fraction *= 0.5;

  // Patron offering something valuable? Ship more.
  if (patronSatisfaction < 0.3) fraction = Math.max(fraction, 0.3);

  // Stockpile large? Ship surplus (even in Act 3, surplus is worth trading).
  if (localCubeCount > 50) fraction = Math.max(fraction, 0.15);

  return clamp(fraction, 0.05, 0.8);
}
```

### 3.6 Patron-Colony Communication via Otter Holograms

The patron communicates through `OtterRenderer.tsx` (already built) and trades through `otterTrade.ts` (already built). The connection:

```
PatronAgent generates PatronDirective
    │
    ▼
PatronDirective.request → updates OtterTrader inventory
    │ (requests become "trades" the player/AI can fulfill)
    │
    ▼
PatronDirective.patronMessage → updates OtterEntity.lines
    │ (dialogue appears in speech bubbles near otter holograms)
    │
    ▼
Colony ships cubes → PatronAgent.receiveCubeShipment()
    │
    ▼
PatronReward → unlocks blueprint in otterTrade inventory
    │         → or spawns reinforcement bots at colony
    │
    ▼
OtterTrader inventory refreshes with new blueprints/rewards
```

For AI factions, this happens programmatically. For the player faction, the otter hologram UI is the patron interface.

### 3.7 Patron Relationship Across Acts

The patron relationship never "breaks" -- it gradually shifts in balance:

```typescript
/**
 * Calculate the current act based on colony state.
 * This drives the patron dependency gradient.
 *
 * Act transitions are organic, not triggered by player action.
 */
function getCurrentAct(
  techTier: number,
  localBlueprintCapacity: number,
  baseCount: number,
  totalCubeStockpile: number,
): 1 | 2 | 3 {
  // Act 3: Self-sufficient empire
  if (techTier >= 3 && localBlueprintCapacity > 0.7 && baseCount >= 3) {
    return 3;
  }
  // Act 2: Factory automation reducing patron dependency
  if (techTier >= 2 && localBlueprintCapacity > 0.3) {
    return 2;
  }
  // Act 1: Colonial dependency
  return 1;
}

/**
 * Patron behavior adapts to the colony's act.
 * The patron is rational too -- it adjusts expectations.
 */
function getPatronBehaviorForAct(act: 1 | 2 | 3): PatronBehavior {
  switch (act) {
    case 1: return {
      requestFrequency: 'frequent',    // many small requests
      rewardQuality: 'essential',      // blueprints colony can't make yet
      reinforcementChance: 0.3,        // occasionally sends bots
      tolerance: 'patient',            // colony is still growing
    };
    case 2: return {
      requestFrequency: 'moderate',    // fewer, larger requests
      rewardQuality: 'premium',        // rare recipes, unique units
      reinforcementChance: 0.15,       // less frequent support
      tolerance: 'expectant',          // colony should be productive
    };
    case 3: return {
      requestFrequency: 'rare',        // occasional high-value requests
      rewardQuality: 'exclusive',      // top-tier blueprints only
      reinforcementChance: 0.05,       // colony doesn't need help
      tolerance: 'pragmatic',          // pure trade relationship
    };
  }
}
```

The patron always has SOMETHING worth trading for -- exclusive top-tier blueprints, unique unit designs, strategic intel about other factions. The colony never has zero reason to ship cubes home. But the balance shifts from dependency (Act 1) to optional luxury (Act 3).

---

## 4. Base Agent (Operational Layer) -- Event Bus Architecture

### 4.1 Core Concept

The Base Agent is the **primary intelligence** in the Colonization model. It is NOT a subordinate executing governor commands -- it IS the colony's operational brain. Each settlement is an autonomous event-driven node.

The existing `BaseAgent.ts` already implements this pattern with:
- Local event bus (`on()` / `emit()`)
- Work queue with task categories and priorities (`BaseWorkQueue.ts`)
- State scanners that generate tasks from local conditions
- Patrol tasks as guaranteed fallback (no bot ever idles)

### 4.2 How Patron Directives Influence Base Behavior

The patron doesn't command bases directly. Instead, patron directives become **priority modifiers** on the base's local decision-making:

```typescript
/**
 * Apply patron directive to base's local priorities.
 * The base still makes its own decisions -- the patron
 * just shifts weights.
 */
function applyPatronDirective(
  base: BaseAgent,
  directive: PatronDirective,
  state: BaseLocalState,
): void {
  // If patron requests a specific material, boost harvest priority
  // for deposits of that material type
  if (directive.request) {
    const requestedMaterial = directive.request.materialType;

    for (const deposit of state.nearbyDeposits) {
      if (deposit.oreType === requestedMaterial) {
        // Emit high-priority harvest event for this deposit
        base.workQueue.add({
          id: nextTaskId('patron_harvest'),
          category: TaskCategory.HARVEST,
          priority: TaskPriority.HIGH,  // boosted from NORMAL
          targetId: deposit.depositId,
          position: deposit.position,
          data: {
            oreType: deposit.oreType,
            isPatronRequest: true,
          },
        });
      }
    }

    // Queue transport of matching cubes to shipment point
    const matchingCubes = state.looseCubes?.filter(
      c => c.materialType === requestedMaterial
    ) ?? [];
    for (const cube of matchingCubes) {
      base.workQueue.add({
        id: nextTaskId('patron_transport'),
        category: TaskCategory.TRANSPORT,
        priority: TaskPriority.HIGH,
        targetId: cube.cubeId,
        position: cube.position,
        data: {
          destination: 'shipment_point',
          isPatronRequest: true,
        },
      });
    }
  }

  // If reinforcements are ready, patron is happy -- less urgent to ship
  // If patron satisfaction is low, boost transport priority for shipments
  if (directive.satisfactionLevel < 0.3) {
    // Patron unhappy -- prioritize shipment transport
    // (handled by calculateShipmentFraction above)
  }
}
```

### 4.3 Base Agent -- Extended for Colonization

The existing `BaseAgent.ts` needs these extensions for the Colonization model:

```typescript
// Additional BaseEventType entries
export const BaseEventType = {
  // ... existing ...
  HARVEST_NEEDED: 'harvest_needed',
  TRANSPORT_NEEDED: 'transport_needed',
  BUILD_QUEUED: 'build_queued',
  DEFENSE_ALERT: 'defense_alert',
  FURNACE_READY: 'furnace_ready',
  PATROL_ROUTE: 'patrol_route',
  CUBE_REQUEST: 'cube_request',

  // New for Colonization model
  PATRON_REQUEST: 'patron_request',       // patron wants specific material
  SHIPMENT_READY: 'shipment_ready',       // cubes ready to ship home
  BLUEPRINT_RECEIVED: 'blueprint_received', // new blueprint from patron
  REINFORCEMENT_DROP: 'reinforcement_drop', // patron sent bots
  NATIVE_SPOTTED: 'native_spotted',        // alien native entity nearby
  NATIVE_TRADE: 'native_trade',           // trade opportunity with natives
} as const;
```

### 4.4 Inter-Base Communication: Demand Signals

Bases communicate needs through **demand signals** transmitted over wire/signal networks. This creates emergent supply chain behavior without centralized planning.

```typescript
interface DemandSignal {
  fromBaseId: string;
  type: 'material' | 'bots' | 'defense';
  materialType?: string;        // e.g., "chrome" -- what we need
  quantity?: number;            // how many cubes
  botRole?: BotRole;           // what kind of bot we need
  urgency: number;             // 0..1
  fulfilled: boolean;
  // New for Colonization: patron-driven demands
  isPatronRequest?: boolean;   // true if this demand serves a patron request
}

/**
 * Broadcast what this base needs to all connected bases.
 * Patron requests propagate as high-urgency demand signals.
 */
function broadcastDemands(directive: PatronDirective | null): void {
  this.demandSignals = [];

  // If furnace is starving (hopper empty, recipe waiting)
  if (this.furnaceIsStarving()) {
    this.demandSignals.push({
      fromBaseId: this.baseId,
      type: 'material',
      materialType: this.getStarvingRecipeInput(),
      quantity: 5,
      urgency: 0.7,
      fulfilled: false,
    });
  }

  // If patron requests material we don't have locally
  if (directive?.request) {
    const localSupply = this.getLocalCubesOfType(directive.request.materialType);
    const remaining = directive.request.quantity - directive.request.fulfilled;
    if (localSupply < remaining) {
      this.demandSignals.push({
        fromBaseId: this.baseId,
        type: 'material',
        materialType: directive.request.materialType,
        quantity: remaining - localSupply,
        urgency: directive.request.urgency,
        fulfilled: false,
        isPatronRequest: true,  // high priority -- serves patron
      });
    }
  }

  // If we have deposits but no harvesters
  if (this.harvestQueue.length > 0 && this.getBotsWithRole('harvester').length === 0) {
    this.demandSignals.push({
      fromBaseId: this.baseId,
      type: 'bots',
      botRole: 'harvester',
      quantity: 2,
      urgency: 0.6,
      fulfilled: false,
    });
  }

  // If under attack and low on combat bots
  if (this.isUnderAttack() && this.getBotsWithRole('combat').length < 2) {
    this.demandSignals.push({
      fromBaseId: this.baseId,
      type: 'defense',
      botRole: 'combat',
      quantity: 3,
      urgency: 0.9,
      fulfilled: false,
    });
  }
}

/**
 * Process demands from connected bases.
 * If we have surplus of what another base needs, dispatch it.
 */
function processIncomingDemands(): void {
  for (const otherBase of this.connectedBases) {
    for (const demand of otherBase.demandSignals) {
      if (demand.fulfilled) continue;

      if (demand.type === 'material') {
        const surplus = this.getSurplusOf(demand.materialType);
        if (surplus > 0) {
          this.queueInterBaseTransport(demand.materialType, otherBase.position);
          demand.fulfilled = true;
        }
      }

      if (demand.type === 'bots' || demand.type === 'defense') {
        const spareBots = this.getSpareBotsOfRole(demand.botRole!);
        if (spareBots.length > 0) {
          const toSend = spareBots.slice(0, demand.quantity ?? 1);
          for (const bot of toSend) {
            this.botRoster.delete(bot.entityId);
            otherBase.adoptBot(bot.entityId, bot.currentRole);
            bot.order = {
              type: BotOrderType.MOVE_TO_BASE,
              destination: otherBase.position,
              newBaseId: otherBase.baseId,
            };
          }
          demand.fulfilled = true;
        }
      }
    }
  }
}
```

### 4.5 Resource Allocation Tables

Each base adjusts its local bot allocation based on the patron's current emphasis. Instead of a governor "goal", the base reacts to what the patron wants and local conditions:

| Act / Emphasis | Harvest % | Transport % | Build % | Combat % | Scout % |
|---|---|---|---|---|---|
| **Act 1: Patron request active** | 50 | 25 | 10 | 10 | 5 |
| **Act 1: Building first base** | 35 | 20 | 25 | 10 | 10 |
| **Act 2: Factory automation** | 30 | 30 | 25 | 5 | 10 |
| **Act 2: Expanding territory** | 25 | 15 | 30 | 10 | 20 |
| **Act 3: Conquest** | 20 | 15 | 10 | 45 | 10 |
| **Act 3: Multi-base economy** | 30 | 25 | 20 | 15 | 10 |
| **Any act: Under attack** | 15 | 10 | 10 | 55 | 10 |

Base adjusts at most 1-2 bots per tick to avoid thrashing.

### 4.6 The "Phone Home" Guarantee

Unchanged from v2. The Phone Home mechanic ensures NO BOT EVER IDLES:

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

In the BotBrain FSM, the IDLE state:

```typescript
private handleIdle(delta: number, ctx: BotContext): SteeringOutput {
  // Check for nearby enemies (auto-aggro)
  const threat = this.findClosestThreat(ctx);
  if (threat && threat.distanceSq <= ctx.aggroRangeSq) {
    this.targetId = threat.id;
    this.transitionTo(BotState.SEEK_TARGET);
    return { command: SteeringCommand.SEEK, target: threat.position };
  }

  // PHONE HOME: claim a task from the nearest base's work queue
  if (this.stateTime > 1.0) { // wait 1 second before phoning home
    const task = ctx.homeBase?.workQueue.claim(ctx.entityId);
    if (task) {
      this.applyTask(task);
      return this.update(delta, ctx); // re-enter with new state
    }
  }

  return { command: SteeringCommand.STOP };
}
```

### 4.7 Base Lifecycle

**Spawning a new Base Agent (expansion):**
```
Base detects unclaimed rich deposits in range
  |
  v
Base queues: BUILD task { type: 'outpost', position: nearDeposit }
  |
  v
Builder bot walks to site, constructs outpost
  |
  v
Outpost entity created in ECS
  |
  v
New BaseAgent instantiated, attached to outpost entity
  |
  v
New base starts with 0 bots, 0 cubes
  |
  v
New base broadcasts demand: "need harvesters" + "need cubes"
  |
  v
Nearest existing base receives demand, sends bots + cubes
  |
  v
New base begins autonomous operation
```

**Losing a Base Agent (destruction):**
```
Enemy raid destroys outpost building
  |
  v
BaseAgent for that outpost is dissolved
  |
  v
All bots registered to that base become orphaned
  |
  v
Each orphaned bot "phones home" to nearest surviving BaseAgent
  |
  v
Surviving base adopts orphaned bots via adoptBot()
  |
  v
Orphaned bots receive new tasks from their new base
  |
  v
Cubes on the ground near destroyed base become loot
```

---

## 5. Bot Brain (Tactical Layer)

### 5.1 Extended BotBrain States

The existing `BotBrain.ts` FSM is extended with economy-related states:

```typescript
export const BotState = {
  // Existing states (kept as-is)
  IDLE: 'idle',
  PATROL: 'patrol',
  SEEK_TARGET: 'seek_target',
  ATTACK: 'attack',
  FLEE: 'flee',
  GUARD: 'guard',
  FOLLOW: 'follow',

  // Economy states
  HARVEST: 'harvest',           // grinding an ore deposit
  COMPRESS: 'compress',         // compressing powder into cube
  PICKUP_CUBE: 'pickup_cube',   // walking to a loose cube to grab it
  CARRY_CUBE: 'carry_cube',     // carrying a cube to destination
  DELIVER_CUBE: 'deliver_cube', // dropping cube into furnace hopper or shipment point
  BUILD: 'build',               // constructing a structure at a location
  SCOUT: 'scout',               // exploring unexplored fog tiles
  MOVE_TO_BASE: 'move_to_base', // relocating to a new base (inter-base transfer)

  // Colonization-specific
  SHIP_HOME: 'ship_home',       // carrying cubes to shipment point for patron
  TRADE_NATIVE: 'trade_native', // interacting with alien native entity
} as const;
```

### 5.2 Extended BotOrders

```typescript
export const BotOrderType = {
  // Existing (kept)
  PATROL_AREA: 'patrol_area',
  ATTACK_TARGET: 'attack_target',
  GUARD_POSITION: 'guard_position',
  GATHER_RESOURCES: 'gather_resources',
  RETURN_TO_BASE: 'return_to_base',
  FOLLOW: 'follow',

  // Base Agent task orders
  HARVEST_DEPOSIT: 'harvest_deposit',     // go to deposit, grind, compress, repeat
  PICKUP_CUBE: 'pickup_cube',             // go to cube, grab it
  DELIVER_CUBE: 'deliver_cube',           // carry cube to destination
  BUILD_STRUCTURE: 'build_structure',     // go to site, construct building
  ATTACK_MOVE: 'attack_move',            // move to destination, attack anything in path
  SCOUT_AREA: 'scout_area',             // explore fog in a given region
  MOVE_TO_BASE: 'move_to_base',         // relocate to a new base

  // Colonization-specific
  SHIP_CUBES_HOME: 'ship_cubes_home',   // transport cubes to shipment point
  TRADE_WITH_NATIVE: 'trade_with_native', // interact with alien native
} as const;
```

### 5.3 Extended BotContext

```typescript
export interface BotContext {
  // ... existing fields ...

  // Base Agent reference
  homeBaseId: string;                 // entity ID of registered base
  homeBase: BaseAgent | null;         // reference for Phone Home / work queue

  // Economy perception
  nearbyDeposits: NearbyDeposit[];     // ore deposits within perception range
  nearbyCubes: NearbyCube[];           // loose cubes on the ground
  nearbyFurnaces: NearbyFurnace[];     // furnaces within perception range
  powderLevel: number;                 // 0..1, current powder capacity
  carryingCube: string | null;         // entity ID of cube being carried

  // Role
  assignedRole: BotRole;               // current role from Base Agent

  // Colonization-specific
  nearbyNatives: NearbyNative[];       // alien native entities nearby
  patronRequestMaterial: string | null; // what the patron currently wants
}
```

### 5.4 Harvest State Machine (per bot)

When a harvester bot claims a HARVEST task from the work queue:

```
IDLE
  | claim HARVEST task from work queue
  v
HARVEST (move to deposit)
  | arrive at deposit within 2m range
  | begin grinding -- takes 8-15 seconds per fill
  | powder gauge fills
  |
  +-- [enemy detected in aggro range] -> SEEK_TARGET (interrupt harvest)
  |
  | powder capacity full
  v
COMPRESS (stationary)
  | compress powder -> cube (2-4 second animation)
  | physical cube entity spawns at bot feet
  |
  | cube spawned
  v
HARVEST (return to deposit for next load)
  | OR if deposit depleted:
  v
IDLE -> Phone Home -> claim next task from work queue
```

### 5.5 Transport State Machine (per bot)

```
IDLE
  | claim TRANSPORT or PICKUP_CUBE task from work queue
  v
PICKUP_CUBE (move to cube location)
  | arrive within 1m of cube
  | grab cube (magnetic beam attach)
  |
  | cube grabbed -- check destination
  +-- destination == 'shipment_point' -> SHIP_HOME
  |
  v
CARRY_CUBE (move to furnace/stockpile)
  | pathfind to furnace hopper or stockpile or other base
  | movement speed reduced by 30% while carrying
  |
  +-- [enemy detected, health < 30%] -> drop cube, FLEE
  |
  | arrive at destination
  v
DELIVER_CUBE
  | drop cube into furnace hopper or onto stockpile
  |
  v
IDLE -> Phone Home -> claim next task

SHIP_HOME (Colonization-specific):
  | carry cube to shipment point (otter hologram location)
  | arrive at shipment point
  | PatronAgent.receiveCubeShipment() called
  | cube entity destroyed (shipped off-world)
  |
  v
IDLE -> Phone Home -> claim next task
```

### 5.6 Build State Machine (per bot)

```
IDLE
  | claim BUILD task from work queue
  v
BUILD (move to build site)
  | arrive at site
  | begin construction
  | progress 0% -> 100% over build time
  |
  +-- [enemy detected in aggro range] -> SEEK_TARGET (interrupt, progress saved)
  |
  | construction complete
  |
  +-- [built an outpost?] -> new BaseAgent spawns for the outpost
  |
  v
IDLE -> Phone Home -> claim next task
```

### 5.7 Scout State Machine (per bot)

```
IDLE
  | claim SCOUT task from work queue
  v
SCOUT (spiral outward from center)
  | pick nearest fog-of-war tile not yet visited
  | move to it, reveal fog in vision radius
  |
  +-- [enemy detected] -> record in memory, continue scouting
  +-- [deposit discovered] -> record in faction knowledge, continue
  +-- [alien native spotted] -> emit NATIVE_SPOTTED event to base
  |
  | scout area 80% explored
  v
IDLE -> Phone Home -> claim next task or area
```

### 5.8 Emergency Overrides

These override ANY current state and are checked every frame:

```
PRIORITY 1: if health < 20% AND enemies nearby -> FLEE
  - Drop carried cube if any
  - Run toward home base
  - Base receives alert, emits defense event, reassigns combat bots

PRIORITY 2: if health < 50% AND outnumbered 3:1 -> FLEE

PRIORITY 3: if home base under attack (DEFENSE_ALERT event) AND role == combat -> GUARD base
  - Override patrol/attack orders
  - Head to base at max speed
```

### 5.9 Yuka Vehicle Steering

Each bot is a Yuka Vehicle with steering behaviors:

| SteeringCommand | Yuka Behavior |
|---|---|
| STOP | Clear all behaviors |
| SEEK | SeekBehavior toward target |
| ARRIVE | ArriveBehavior at target (decelerate) |
| FLEE | FleeBehavior from target |
| WANDER | WanderBehavior |

For squads: `OffsetPursuitBehavior` (already in FormationSystem.ts).
Carrying a cube reduces maxSpeed by 30% (from config/botMovement.json).

---

## 6. Colony Economy Loop

### 6.1 The Full Loop (3-Act Progression)

```
ACT 1 — COLONIZATION (Minutes 0-15)
  MINUTE 0-1: Colony starts with 1 base, 3 bots, 0 cubes
              Patron sends first directive: "Ship 10 iron cubes"
              Base scans deposits, emits harvest_needed events
              Bots claim harvest tasks from work queue

  MINUTE 1-3: Harvesters walk to deposits, grind, compress
              Cubes appear on ground near deposits
              Base detects loose cubes, emits transport_needed

  MINUTE 3-5: Transporters carry cubes to base
              Most cubes shipped home (patron is only blueprint source)
              Some cubes used to build furnace

  MINUTE 5-8: Furnace complete. Base sets recipe.
              Patron reward arrives: blueprint unlocked!
              Scout discovers rich deposits + alien natives.

  MINUTE 8-15: First outpost built -> NEW BASE spawns.
               Patron directive: "Ship 15 chrome cubes"
               Inter-base demand: chrome flows between bases.

ACT 2 — FACTORY (Minutes 15-40)
  MINUTE 15-20: Furnace recipes now include local blueprint production.
                Colony can make basic blueprints without patron.
                Shipment fraction drops naturally (0.5 -> 0.3).
                Belt automation begins. Conveyor chains link deposits to furnaces.

  MINUTE 20-30: 2-3 bases operating with automation.
                Supply chains emerge from demand signals.
                Patron still sends rare blueprints worth shipping for.
                Factory optimization: which furnace runs which recipe?

  MINUTE 30-40: Colony approaching self-sufficiency.
                Patron is useful but not essential.
                Territory borders with rival colonies create friction.
                Military production begins at forward bases.

ACT 3 — CONQUEST (Minutes 40+)
  MINUTE 40+: Self-sufficient multi-base empire.
              Bot armies assembled. Territory control enforced.
              Raid enemy cube stockpiles. Subjugate rival bases.
              Alien natives: trade, fight, or subjugate.
              Patron is one trade partner among many.
              Victory conditions being pursued.
```

### 6.2 Cube Flow Diagram (Multi-Base with Patron)

```
        ORE DEPOSIT (near Base A)
              |
        [Base A harvester grinds]
              |
        POWDER (internal to bot)
              |
        [Bot compresses]
              |
        CUBE (physical rigid body)
              |
        [Base A transporter picks up]
              |
   +----------+----------+----------+
   v          v          v          v
BASE A     BASE A     INTER-BASE  SHIP HOME
FURNACE    STOCKPILE  TRANSPORT   TO PATRON
   |          |       (Base B     (via shipment
   |          |        demand)     point)
   |          |          |          |
OUTPUT     LOCAL       BASE B    PATRON
ITEM       USE        FURNACE   REWARD
   |                     |          |
 EQUIP                 COMBAT    BLUEPRINT
 BUILD                 PLATING   UNLOCK
```

### 6.3 Abstract Fallback for Early Development

Until the full physical economy pipeline is implemented:

```typescript
/**
 * Simplified AI economy: generates cubes as real entities at each base.
 * Rate scales with territory and buildings. Cubes are physical and raidable.
 *
 * FIXES rounding bug: uses Math.max(1, ...) instead of Math.round()
 */
function abstractCubeGeneration(base: BaseAgent, world: WorldQueryInterface): void {
  const territoriesNearBase = world.getTerritoryCountNear(base.position, base.territoryRadius);
  const buildings = world.getBuildingCountNear(base.position, base.territoryRadius);
  const bias = world.getEconomyBias(base.civId);

  // Base rate: 1 cube per 30 seconds per territory tile, scaled by bias
  const cubesPerMinute = Math.max(1, Math.ceil(territoriesNearBase * 0.5 * bias + buildings * 0.2));

  // Convert to per-tick probability (at 60 ticks/second)
  const ticksPerCube = (60 * 60) / cubesPerMinute;

  if (Math.random() < 1 / ticksPerCube) {
    world.spawnCube({
      materialType: 'scrap_metal',
      position: {
        x: base.position.x + (Math.random() - 0.5) * 4,
        y: base.position.y + 0.5,
        z: base.position.z + (Math.random() - 0.5) * 4,
      },
      owner: base.civId,
    });
  }
}
```

---

## 7. Alien Natives

### 7.1 Role in Colonization

Alien natives were on the machine planet before the robot colonists arrived. They are NOT colonial factions -- they don't have home planet patrons and don't compete for patron favor. They are a separate mechanic:

| Interaction | Mechanic |
|---|---|
| **Trade** | Natives offer rare materials unavailable from deposits. Cost: common cubes. |
| **Fight** | Natives guard resource-rich areas. Defeating them opens deposits. |
| **Integrate** | Befriend natives to gain unique units/abilities. Required for Integration Victory. |
| **Ignore** | Natives are passive unless provoked. Safest early-game strategy. |

### 7.2 Native Interaction for AI Bases

```typescript
/**
 * When a scout detects an alien native, the base decides how to interact.
 * Race personality drives the decision.
 */
function handleNativeContact(
  nativeId: string,
  nativePosition: Vec3,
  racePolicy: NativePolicy,
): void {
  switch (racePolicy) {
    case 'trade_first':
      // Reclaimers: always try to trade before fighting
      this.workQueue.add({
        id: nextTaskId('native_trade'),
        category: TaskCategory.TRADE,
        priority: TaskPriority.HIGH,
        targetId: nativeId,
        position: nativePosition,
      });
      break;

    case 'aggressive':
      // Volt Collective: attack natives blocking deposits
      this.workQueue.add({
        id: nextTaskId('native_attack'),
        category: TaskCategory.DEFENSE,
        priority: TaskPriority.HIGH,
        targetId: nativeId,
        position: nativePosition,
        data: { targetType: 'native' },
      });
      break;

    case 'study':
      // Signal Choir: observe and learn from natives
      this.workQueue.add({
        id: nextTaskId('native_study'),
        category: TaskCategory.SCOUT,
        priority: TaskPriority.NORMAL,
        targetId: nativeId,
        position: nativePosition,
        data: { targetType: 'native', action: 'study' },
      });
      break;

    case 'fortify':
      // Iron Creed: build walls around native territory borders
      this.workQueue.add({
        id: nextTaskId('native_border'),
        category: TaskCategory.BUILD,
        priority: TaskPriority.NORMAL,
        position: nativePosition,
        data: { buildingType: 'wall', reason: 'native_border' },
      });
      break;
  }
}
```

---

## 8. Victory Conditions

Pure 4X victory conditions. No religion, no social game. Each condition naturally aligns with a different act emphasis:

| Victory | Condition | Act Focus |
|---|---|---|
| **Economic** | Accumulate 500 cubes + control 40% territory | Act 2 (factory optimization) |
| **Military** | Eliminate all rival colonies | Act 3 (conquest, subjugation) |
| **Scientific** | Reach tech tier 5 | Act 2-3 (patron blueprints + local research) |
| **Territorial** | Control 75% of planet territory | Act 3 (multi-base expansion) |
| **Subjugation** | Hack/control 75% of enemy infrastructure | Act 3 (Signal Choir specialty) |
| **Survival** | Last colony standing after all others eliminated | Act 3 |

```typescript
// From config/victory.json
interface VictoryCondition {
  type: string;
  requirements: {
    totalCubeStockpile?: number;           // Economic
    territoryControlPercent?: number;       // Economic, Territorial
    factionsEliminated?: number;            // Military
    techTier?: number;                     // Scientific
    enemyInfrastructureHacked?: number;    // Subjugation
    lastStanding?: boolean;                // Survival
  };
}
```

Note: patron relationship is NOT a victory condition. The patron is a means to an end (blueprints, reinforcements), not a goal in itself. A colony that ships lots of cubes home gets better tech faster, which helps win via Scientific or Economic victory. A colony that keeps cubes local builds faster, which helps win via Territorial or Military victory. The patron relationship is a strategic lever, not a win state.

---

## 9. CivilizationAI (Unified Entry Point)

### 9.1 Colonization Model Entry Point

```typescript
/**
 * Top-level AI for one faction. Contains Patron + all Base Agents.
 * Replaces both CivilizationGovernor.ts and aiCivilization.ts.
 *
 * Key difference from v2: the Patron does NOT aggregate base reports.
 * It only receives cube shipments and sends directives.
 */
export class CivilizationAI {
  readonly civId: string;
  private patron: PatronAgent;
  private bases: BaseAgent[];
  private currentDirective: PatronDirective | null;

  constructor(civId: string, startingBaseId: string, startingPosition: Vec3, config: CivilizationConfig) {
    this.civId = civId;
    this.patron = new PatronAgent(civId, config);
    this.bases = [new BaseAgent(startingBaseId, civId, startingPosition)];
    this.currentDirective = null;
  }

  tick(dt: number, world: WorldQueryInterface): void {
    // Patron: slow cadence, generates directives
    const newDirective = this.patron.tick(dt);
    if (newDirective) {
      this.currentDirective = newDirective;
    }

    // Each Base Agent: autonomous operation with patron influence
    for (const base of this.bases) {
      const localState = world.getBaseLocalState(base.baseId);
      if (localState) {
        // Apply patron directive as priority modifier
        if (this.currentDirective) {
          applyPatronDirective(base, this.currentDirective, localState);
        }
        // Base runs its own event-driven tick
        base.tick(localState);
      }
    }

    // Update inter-base connections (via wire/signal network)
    this.updateBaseConnections(world);

    // BotBrain runs per-frame in the ECS system loop (not here)
  }

  /**
   * Called when a bot ships cubes to the patron.
   * Routes to PatronAgent for reward processing.
   */
  shipCubesToPatron(materialType: string, quantity: number): PatronReward | null {
    return this.patron.receiveCubeShipment(materialType, quantity);
  }

  /**
   * Called when an outpost finishes construction.
   */
  onOutpostBuilt(outpostId: string, position: Vec3): void {
    const newBase = new BaseAgent(outpostId, this.civId, position);
    this.bases.push(newBase);
    this.updateBaseConnections(null);
  }

  /**
   * Called when a base/outpost is destroyed.
   */
  onBaseDestroyed(baseId: string): void {
    const destroyed = this.bases.find(b => b.baseId === baseId);
    if (!destroyed) return;

    const survivors = this.bases.filter(b => b.baseId !== baseId);
    if (survivors.length > 0) {
      const nearest = survivors.reduce((best, b) =>
        distanceTo(b.position, destroyed.position) < distanceTo(best.position, destroyed.position) ? b : best
      );
      // Orphaned bots phone home to nearest surviving base
      for (const [botId, assignment] of destroyed.botRoster) {
        nearest.adoptBot(botId, assignment.currentRole);
      }
    }

    this.bases = survivors;
  }

  // Debug API
  getPatronState(): PatronDebugInfo { return this.patron.getDebugInfo(); }
  getBaseStates(): BaseDebugInfo[] { return this.bases.map(b => b.getDebugInfo()); }
}
```

### 9.2 System Registration

```typescript
// game/systems/civilizationAI.ts
const factionAIs = new Map<string, CivilizationAI>();

export function initCivilizationAI(factions: FactionStartInfo[]): void {
  for (const f of factions) {
    factionAIs.set(f.civId, new CivilizationAI(
      f.civId,
      f.startingBaseId,
      f.startingPosition,
      f.config,
    ));
  }
}

export function civilizationAISystem(dt: number, world: WorldQueryInterface): void {
  for (const [_, ai] of factionAIs) {
    ai.tick(dt, world);
  }
}
```

### 9.3 Event Flow

```
Patron sends directive: "Ship 15 chrome cubes"
    |
    v
Each base receives directive as priority modifier
    |
    v
Base near chrome deposit: boosts harvest priority for chrome
    |
    v
Base far from chrome: broadcasts demand signal "need chrome"
    |
    v
Chrome-base receives demand, dispatches transport bot with cubes
    |
    v
Transport bot: PICKUP_CUBE -> CARRY_CUBE -> arrives at far base
    |
    v
Far base: routes cube to shipment point (otter hologram location)
    |
    v
Ship bot: SHIP_HOME -> PatronAgent.receiveCubeShipment()
    |
    v
Patron satisfied: sends blueprint reward
    |
    v
Blueprint unlocked in otterTrade.ts inventory
```

```
Enemy raid destroys outpost
    |
    +-- Emits: BUILDING_DESTROYED { entityId, civId }
    |
    v
CivilizationAI.onBaseDestroyed() -> BaseAgent dissolved
    |
    v
Orphaned bots: Phone Home -> nearest surviving base adopts them
    |
    v
Surviving bases: DEFENSE_ALERT events, reassign combat bots
```

---

## 10. Hostility and Diplomacy

### 10.1 Dynamic Hostility (Replaces Hardcoded Table)

The `HOSTILE_FACTIONS` table in `ThreatAssessment.ts` is replaced by diplomacy-driven hostility:

```typescript
function isHostile(factionA: string, factionB: string): boolean {
  // Feral entities are hostile to everyone
  if (factionA === 'feral' || factionB === 'feral') return true;
  // Alien natives: depends on relationship (starts neutral)
  if (factionA === 'native' || factionB === 'native') {
    return diplomacySystem.getStance(factionA, factionB) === 'hostile';
  }
  // Colonial factions: check diplomacy
  const stance = diplomacySystem.getStance(factionA, factionB);
  return stance === 'hostile' || stance === 'war';
}
```

### 10.2 Inter-Colony Diplomacy

In the Colonization model, inter-faction diplomacy is **secondary** to patron relationships. But colonies can still:

- **Trade**: Exchange surplus cubes at border outposts
- **Ally**: Formal alliance against a common threat (or common patron enemy)
- **War**: Over territory, resource deposits, or cube stockpiles
- **Sabotage**: Signal Choir hacks enemy infrastructure via infiltrator bots

The primary trade relationship is colony <-> patron (via `otterTrade.ts`). Inter-colony trade is an emergent behavior when border bases have complementary surplus/deficits.

---

## 11. WorldQueryInterface

Unchanged from v2. The Governor and BaseAgents communicate with the game world through a typed interface:

```typescript
export interface WorldQueryInterface {
  // -- Economy queries --
  countCubesOwnedBy(civId: string): number;
  getLooseCubesNear(position: Vec3, radius: number, civId: string): CubeInfo[];
  getDepositsInRadius(position: Vec3, radius: number): DepositInfo[];
  getKnownDeposits(civId: string): DepositInfo[];
  getEconomyStats(civId: string): { incomePerMinute: number; demandPerMinute: number };
  getBasePosition(civId: string): Vec3;
  getEconomyBias(civId: string): number;

  // -- Base state (new for Colonization) --
  getBaseLocalState(baseId: string): BaseLocalState | null;

  // -- Bot queries --
  getBotsForFaction(civId: string): BotInfo[];
  getBotsNearBase(baseId: string, radius: number): BotInfo[];

  // -- Territory queries --
  getTerritoryCount(civId: string): number;
  getTerritoryCountNear(position: Vec3, radius: number): number;
  getTotalMapTiles(): number;
  countUnclaimedDepositsKnownBy(civId: string): number;
  getExploredFraction(civId: string): number;

  // -- Military queries --
  getMilitaryIntel(civId: string): MilitaryIntel;
  getEstimatedBasePosition(civId: string): Vec3 | null;
  getWallCoverage(civId: string): number;
  getCubePileExposure(civId: string): number;

  // -- Diplomacy queries --
  getDiplomacySnapshot(civId: string): DiplomacySnapshot;
  getDiplomaticStance(civA: string, civB: string): DiplomaticStance;
  getSurplusMaterial(civId: string): MaterialSurplus | null;
  getDeficitMaterial(civId: string): MaterialDeficit | null;

  // -- Native queries (new for Colonization) --
  getNativesInRadius(position: Vec3, radius: number): NativeInfo[];
  getNativeRelationship(civId: string, nativeId: string): NativeRelationship;

  // -- Tech queries --
  getTechSnapshot(civId: string): TechSnapshot;

  // -- Building queries --
  hasFurnace(civId: string): boolean;
  getFurnacesAt(position: Vec3, radius: number): FurnaceInfo[];
  getBuildingCount(civId: string): number;
  getBuildingCountNear(position: Vec3, radius: number): number;
  isBuildComplete(position: Vec3): boolean;

  // -- Commands (world mutations) --
  spawnCube(params: SpawnCubeParams): string;
  spawnBot(params: SpawnBotParams): string;
  setFurnaceRecipe(furnaceId: string, recipe: string): void;
  destroyCube(cubeId: string): void;  // for shipment (cube leaves the world)

  // -- Time --
  getGameTime(): number;
}
```

---

## 12. AI Build Order: 3-Act Progression (Normal Difficulty)

### 12.1 Act 1: Colonization (Minutes 0-15)

| Time | Patron | Base Agent Activity | Bot Activity |
|---|---|---|---|
| 0:00 | First directive: "Ship 10 iron cubes" | Home base scans deposits, emits harvest events | 2 harvesters claim tasks, 1 scout explores |
| 1:00 | -- | Base detects first cubes on ground | Harvesters grinding, cubes appearing |
| 2:00 | -- | Base queues transport tasks | Transporter picks up cubes |
| 3:00 | -- | Ships ~50% of cubes home (Act 1 dependency) | Some cubes to shipment point, some stockpiled |
| 4:00 | -- | Queues furnace build | Builder constructs furnace |
| 5:00 | Patron receives first shipment (5 cubes) | Furnace ready, sets recipe | Transport to furnace hopper |
| 7:00 | "Good progress. Keep shipping." | Scout found chrome deposit + alien native | Base decides native policy |
| 8:00 | Patron reward: blueprint unlocked! | Queues outpost near chrome deposit | Builder walks to outpost site |
| 10:00 | 2nd directive: "Ship 8 chrome cubes" | **NEW BASE spawns at chrome.** Demands harvesters. | Bots transfer to new base |
| 12:00 | -- | 2 bases operating. Chrome flows via demand signals. | Inter-base transport of chrome |
| 15:00 | Patron satisfied. Reinforcement drop! | 2 new bots arrive at home base | Combat bots patrol borders |

### 12.2 Act 2: Factory (Minutes 15-40)

| Time | Patron | Base Agent Activity | Bot Activity |
|---|---|---|---|
| 15:00 | -- | Furnace upgraded: local blueprint production begins | Shipment fraction drops to ~30% |
| 18:00 | 3rd directive (less urgent now) | Belt automation between deposits and furnaces | Transport bots being replaced by conveyors |
| 20:00 | -- | Base builds 2nd furnace for parallel recipes | Factory optimization: which recipe where? |
| 22:00 | Patron offers rare blueprint (still worth it) | Ships cubes for rare blueprint. Keeps rest. | Scouts map rival colony locations |
| 25:00 | -- | 3rd outpost built. 3 bases with automation. | Supply chains fully automated |
| 30:00 | -- | Colony produces most blueprints locally | Patron shipments now ~15% of production |
| 35:00 | Patron offers unique unit design | Ships cubes for unique unit. Worth the trade. | Military production ramps up |
| 40:00 | Patron now a luxury, not a necessity | Territory borders contested. Military buildup. | Forward bases positioning for conquest |

### 12.3 Act 3: Conquest (Minutes 40+)

| Time | Patron | Base Agent Activity | Bot Activity |
|---|---|---|---|
| 40:00 | One trade partner among many | Forward base assembles attack squad | Combat bots + shock troopers |
| 45:00 | Occasionally ships cubes for top-tier blueprints | Raid on weakest rival colony's cube pile | ATTACK_MOVE squads deployed |
| 50:00 | -- | Captured rival outpost. Absorbs territory. | Garrison and rebuild |
| 55:00 | -- | 4-5 bases across map. Dominant economy. | Victory condition progress tracked |
| 60:00 | -- | Victory condition met or close | Endgame |

### 12.4 Race-Specific Deviations

**Reclaimers (Economy-focused Patron):**
- Act 1: Patron requests scrap cubes early -- cheap, builds satisfaction fast. High shipment fraction (0.6).
- Act 2: Recycling blueprints let cubes go further. Economy advantage compounds. Expands fast.
- Act 3: Economic victory path. Massive cube stockpiles. Trades with alien natives for rare materials.

**Volt Collective (Military-focused Patron):**
- Act 1: Patron demands chrome/rare alloy -- expensive but weapons follow. Low shipment fraction (0.3).
- Act 2: Shock trooper reinforcements arrive. Forward bases built aggressively. First raids by minute 20.
- Act 3: Military conquest. Overwhelming force. Hostile to alien natives. Shortest Act 2 of all races.

**Signal Choir (Research-focused Patron):**
- Act 1: Patron requests fiber optics. Blueprint rewards are hacking tools.
- Act 2: Reaches factory phase fastest (research bias 1.5). Studies alien natives. Infiltrator bots deployed.
- Act 3: Subjugation victory path. Hacks enemy infrastructure instead of brute force conquest.

**Iron Creed (Defense-focused Patron):**
- Act 1: Patron requests iron/copper for fortification specs. Home base fully walled before expanding.
- Act 2: Slowest expansion but most secure. Each outpost becomes a fortress. Longest Act 2 of all races.
- Act 3: Territorial victory path. Slow advance, hold every inch. Walls around native territory borders.

---

## 13. Difficulty Scaling

### 13.1 Difficulty Levels

| Parameter | Easy | Normal | Hard | Nightmare |
|---|---|---|---|---|
| Patron tick interval | 300s | 180s | 120s | 90s |
| Base Agent tick interval | 10s | 7s | 5s | 3s |
| Patron request size | 50% | 100% | 130% | 150% |
| Harvest speed multiplier | 0.7x | 1.0x | 1.3x | 1.5x |
| Build speed multiplier | 0.7x | 1.0x | 1.2x | 1.5x |
| Decision quality | Random noise +/-30% | Normal | Perfect | Perfect + rush |
| Patron satisfaction rate | 1.5x (forgiving) | 1.0x | 0.8x (demanding) | 0.6x (ruthless) |
| Reinforcement quality | Basic bots | Mixed | Elite bots | Elite + timing |
| Inter-base efficiency | Slow transport | Normal | Fast transport | Instant |

### 13.2 Decision Quality Scaling

```typescript
function applyDifficultyNoise(score: number, difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return score * (0.7 + Math.random() * 0.6); // +/- 30%
    case 'normal':
      return score * (0.9 + Math.random() * 0.2); // +/- 10%
    case 'hard':
      return score; // no noise
    case 'nightmare':
      return score * 1.1; // bonus for aggressive strategies
  }
}
```

---

## 14. Paper Playtest: 60-Minute AI-vs-AI Simulation (3-Act)

### Scenario: 4 colonial factions on a medium map, normal difficulty, alien natives present

**--- ACT 1: COLONIZATION (Minutes 0-15) ---**

**Minute 0: Colonial Landing**
- Reclaimers colony at (0, 0): 3 bots + home base = 1 BaseAgent. Salvage Overseer patron.
- Volt Collective colony at (80, 0): 3 bots + home base. War Council patron.
- Signal Choir colony at (0, 80): 3 bots + home base. Signal Archive patron.
- Iron Creed colony at (80, 80): 3 bots + home base. Forge Council patron.
- Alien natives scattered at (40, 40) village, (20, 60) outpost, (60, 20) camp.
- All patrons send first directive: material requests matching race priorities.

**Minutes 0-3: Colony Bootstrapping**
- All factions: home base emits harvest events, bots claim from work queue.
- Cubes begin appearing at deposit sites.
- Scouts reveal nearby terrain, find 2-3 deposits each.
- Reclaimers shipping scrap home aggressively (~60% of production).
- Volt Collective stockpiling chrome locally (~30% shipped).

**Minutes 3-8: First Patron Interactions**
- Reclaimers: 5 scrap cubes shipped. Patron pleased. Recycling blueprint incoming.
- Volt: 2 chrome cubes shipped. Patron sends weapon schematic.
- Signal Choir: 3 fiber optics shipped. Patron: "Fascinating data." Hacking tool blueprint.
- Iron Creed: 5 iron cubes shipped. Patron: "Strong foundation." Wall upgrade blueprint.
- All: furnaces built, first recipes running.

**Minutes 8-15: Expansion**
- Reclaimers: Outpost at copper deposit (economy bias 1.5). 2nd BaseAgent spawns.
  - Inter-base supply chain: copper flows from outpost to home furnace.
- Volt: Outpost near Reclaimer border (aggressive). Patron reinforcement drop: 2 shock troopers.
- Signal Choir: Scout discovers native village. Policy: 'study'. Learns native patterns.
- Iron Creed: Still at 1 base. Home base fully walled. Bunker under construction.

**--- ACT 2: FACTORY (Minutes 15-40) ---**

**Minutes 15-20: Automation Begins**
- Furnace recipes now include local blueprint production.
- Reclaimers: Shipment fraction naturally drops to ~35%. Local blueprints sufficient for basic needs.
- Volt: Belt automation links forward base deposits to furnace. Shipment drops to ~20%.
- Signal Choir: Signal amplifier chain extends scout range. Tech tier 2. Local hacking tools.
- Iron Creed: Finally expands. 2nd base at (60, 80). Immediate fortification. Demands iron from home.

**Minutes 20-30: Factory Optimization**
- Reclaimers: 3 bases, factory economy dominant. 2nd furnace for parallel recipes.
  - Patron still useful for rare recycling blueprints. Ships ~25% for premium rewards.
- Volt: Patron urgency: "We need rare alloy." No local deposit. Military emphasis rises.
  - Forward base trains combat bots. Scout reports Reclaimer cube piles.
- Signal Choir: Trades with native village. Receives rare alloy cubes! Native relations +20%.
  - Infiltrator bot deployed toward Volt home base. Hacks power grid.
- Iron Creed: 2 fortified bases. 350+ cubes. Patron wants cubes shipped, colony hoards.
  - Natural tension: patron offers fortress blueprints worth shipping for.

**Minutes 30-40: Self-Sufficiency**
- All factions: local blueprint production covers most needs. Patron dependency declining.
- Reclaimers: Ships ~15% to patron. Pure surplus trade. Economy booming.
- Volt: Patron sends last reinforcement. Prepares raid on Reclaimers for rare alloy.
- Signal Choir: Tech tier 3. Infiltrator hacked Iron Creed signal relay. Intel gathered.
- Iron Creed: 400 cubes across 2 bases. Patron satisfied enough. Fortress economy self-sustaining.

**--- ACT 3: CONQUEST (Minutes 40-60) ---**

**Minutes 40-45: First Major Conflict**
- Volt launches raid on Reclaimer border outpost.
  - 4 shock troopers + 2 standard bots: ATTACK_MOVE.
  - Reclaimer outpost: DEFENSE_ALERT. Demands combat bots from home base.
  - Battle at border. Volt breaches wall. Both sides lose 2 bots.
  - Volt captures outpost. Absorbs territory. Gains rare alloy deposit.

**Minutes 45-50: Escalation**
- Reclaimers: Regroup. Build 3rd outpost elsewhere. Counter-attack planned.
  - Patron offers unique unit blueprint (rare). Ships cubes for it. Still worth it.
- Signal Choir: Hacks Volt's captured outpost remotely. Power disruption.
  - Begins territorial expansion into unclaimed southern region.
- Iron Creed: Observes Volt aggression. Reinforces border. Passive accumulation continues.

**Minutes 50-60: Endgame**
- Reclaimers: 400+ cubes across 3 bases. Economic Victory at 80%.
- Volt: Territorial gains from raid. Military Victory path (2 of 3 rivals under pressure).
- Signal Choir: 3 bases, tech tier 4. Scientific Victory at 80%. 3 enemy systems hacked.
- Iron Creed: 500 cubes, 45% territory. Economic Victory at 100% -- **WINS**.

**Key emergent behaviors from 3-act model:**
1. Patron dependency declines naturally -- no dramatic break, just rational cost-benefit shift
2. Each act produces different gameplay: harvesting/shipping -> automation/optimization -> conquest/subjugation
3. Inter-base demand signals create supply chains without centralized planning
4. Races hit Act 2 and Act 3 at different times based on personality (Volt fastest to Act 3, Iron Creed slowest)
5. Patron remains useful even in Act 3 -- top-tier blueprints, unique units, intel
6. Alien native interactions matter most in Act 2-3 (trade for rare materials, territorial conflict)

---

## 15. Addressing Gap Analysis Items (Updated for Colonization)

| # | Gap | Resolution |
|---|---|---|
| 1 | No new game initialization | Out of scope (newGameInit.ts), but CivilizationAI expects world initialized with factions + first BaseAgent per faction |
| 2 | No system registration | CivilizationAI + BaseAgent register as systems |
| 3 | Rounding bug | FIXED: Base Agent reads real entity counts. Fallback uses Math.max(1, Math.ceil(...)) |
| 4 | No fallback when unaffordable | FIXED: Phone Home guarantee. No bot ever idles. |
| 5 | GOAP unreachable preconditions | FIXED: GOAP Governor replaced by Patron. No precondition chains needed. |
| 6 | Two disconnected AI systems | FIXED: Both replaced by CivilizationAI (Patron + BaseAgent[]) |
| 7 | AI produces abstract counters | FIXED: BaseAgent spawns real ECS entities. Cubes are physical. |
| 8 | No AI harvesting | FIXED: BotBrain HARVEST state + Base work queue + deposit targeting |
| 9 | Combat feral-vs-player only | Fix in combat.ts: use dynamic isHostile() replacing HOSTILE_FACTIONS table |
| 10 | No war declaration | Bases detect threats, diplomacy stance shifts to 'war' on attack |
| 11 | Raid system disconnected | Base emits DEFENSE_ALERT, combat bots respond via work queue |
| 12 | Duplicate harvesting | BotBrain HARVEST state uses single canonical interface |
| 13 | Event bus dead | BaseAgent local event bus is the primary coordination mechanism |
| 14-15 | No victory evaluation/progress | 4X victory conditions: economic, military, scientific, territorial, subjugation, survival |
| 17 | No AI aggression curves | 3-act progression: Act 1 economy, Act 2 automation, Act 3 conquest. Patron urgency + difficulty scaling. |
| 18 | No wealth-based raids | Scouts report enemy cube piles. Patron requests can force military action. |
| 21-22 | Trade mechanics | Colony <-> patron trade via otterTrade.ts. Inter-colony trade via base demand signals. |
| 23 | No territory evaluation | Bases expand when detecting unclaimed deposits in range |
| 24 | No production planning | Base furnace scheduler driven by patron requests + local needs |
| 25 | Economy simulation disconnected | Patron reads cube shipments. Bases read local state. |
| 26 | All factions play identically | FIXED: Patron personality + race-specific priorities + native policies |
| 29 | No tech tree for AI | Act 1: blueprints from patron. Act 2: local blueprint production from furnaces. Act 3: self-sufficient. |
| 38 | No AI cube pile perception | Scout bots report cube piles. Influences raid decisions. |

---

## 16. Config Integration

### 16.1 New Config: config/aiColony.json

```json
{
  "patron": {
    "tickIntervalByDifficulty": {
      "easy": 300,
      "normal": 180,
      "hard": 120,
      "nightmare": 90
    },
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
    "tickIntervalByDifficulty": {
      "easy": 10,
      "normal": 7,
      "hard": 5,
      "nightmare": 3
    },
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

### 16.2 Config Mapping

Existing `config/civilizations.json` needs these new fields per faction:

```json
{
  "reclaimers": {
    "patronPersonality": "supportive",
    "patronPriorities": [
      { "materialType": "scrap_iron", "weight": 2.0, "baseRequestQuantity": 10, "maxRequestQuantity": 40, "requestDescription": "Send scrap samples." },
      { "materialType": "copper", "weight": 1.0, "baseRequestQuantity": 5, "maxRequestQuantity": 20, "requestDescription": "Copper reserves are low." }
    ],
    "shipHomeBias": 0.6,
    "nativePolicy": "trade_first",
    "patronTickInterval": 180
  }
}
```

---

## 17. Yuka Class Hierarchy (Updated)

### 17.1 Classes Used

```
yuka.Vehicle                  (Tier 3: one per bot, steering behaviors)

yuka.SteeringBehavior
  +-- SeekBehavior            (built-in)
  +-- ArriveBehavior          (built-in)
  +-- FleeBehavior            (built-in)
  +-- WanderBehavior          (built-in)
  +-- OffsetPursuitBehavior   (built-in, for formations)
  +-- SeparationBehavior      (built-in, squad spacing)

yuka.Vision                   (Tier 3: cone-of-sight per bot)
yuka.MemorySystem             (Tier 3: entity memory per bot)
yuka.NavMesh                  (Tier 3: pathfinding)
```

### 17.2 Classes NOT Used (Colonization simplification)

```
yuka.GameEntity               NOT USED -- Patron is not a Yuka entity
yuka.Think                    NOT USED -- no GOAP governor
yuka.GoalEvaluator            NOT USED -- replaced by patron request scoring
```

The Colonization model eliminates the need for Yuka's GOAP/Think at the strategic level. Strategy comes from patron requests + local base reactions, not from evaluator scoring. This is a significant simplification.

### 17.3 Custom Classes

```
PatronAgent                  (Tier 1: remote AI, pure TypeScript, simple request/reward)
CivilizationAI               (wraps Patron + BaseAgent[])
BaseAgent                    (Tier 2: event bus + work queue, already implemented)
BaseWorkQueue                (Tier 2: task claiming, already implemented)
BotBrain                     (Tier 3: custom FSM, already exists)
BotContext                   (Tier 3: custom perception snapshot, already exists)
WorldQueryInterface          (abstraction over ECS)
```

---

## 18. Testing Strategy

### 18.1 Unit Tests

| Test | What It Validates |
|---|---|
| PatronAgent request generation | Weighted selection from priorities, quantity scaling |
| PatronAgent cube shipment | Satisfaction increases, request fulfillment tracking |
| PatronAgent reward generation | Quality scales with satisfaction level |
| PatronAgent directive timing | Only fires on interval, respects difficulty scaling |
| BaseAgent harvest scanning | Emits harvest events for deposits with remaining yield |
| BaseAgent threat scanning | Emits defense alerts, urgent priority tasks |
| BaseAgent patron directive | Boosts priority for patron-requested materials |
| BaseAgent Phone Home | Always returns a non-null task (guaranteed fallback) |
| BaseAgent demand signals | Broadcasts unfulfilled needs, marks as fulfilled when met |
| BotBrain HARVEST state | Transitions to COMPRESS when full, back to HARVEST |
| BotBrain SHIP_HOME state | Carries cube to shipment point, calls receiveCubeShipment |
| BotBrain emergency flee | Overrides any state when health < 20% |
| BotBrain idle -> Phone Home | Claims task from work queue after 1s idle |
| Inter-base demand | Base A demand fulfilled by Base B sending transport |
| Base destruction | Orphaned bots adopted by nearest surviving base |
| Shipment fraction | Decreases with tech tier and local blueprint capacity (3-act gradient) |
| Act detection | getCurrentAct() returns 1/2/3 based on tech tier, blueprint capacity, base count |
| Native contact | Correct policy applied per race (trade/attack/study/fortify) |
| Hostility check | Uses dynamic diplomacy, not hardcoded table |

### 18.2 Integration Tests

| Test | What It Validates |
|---|---|
| Colony bootstrap | Base creates tasks, bots claim them, cubes appear |
| Patron cycle | Ship cubes -> patron receives -> reward generated -> blueprint unlocked |
| Multi-base economy | Outpost built -> new base -> demand signals -> supply chain |
| Patron-driven harvest | Patron requests chrome -> base boosts chrome harvest priority |
| AI raid | Patron military pressure -> base assembles squad -> attack_move |
| Base loss + recovery | Base destroyed -> bots phone home -> nearest base absorbs |
| Native interaction | Scout spots native -> base applies race policy -> correct action |
| 3-act progression | AI transitions Act 1->2->3 as tech and local production increase |
| 60-minute smoke test | Run 4 AIs + natives: all 3 acts reached, cubes flowing, conquest phase active |

### 18.3 Debug Overlay

```typescript
interface PatronDebugInfo {
  civId: string;
  patronPersonality: PatronPersonality;
  currentAct: 1 | 2 | 3;               // which act the colony is in
  currentRequest: PatronRequest | null;
  satisfactionLevel: number;
  totalCubesReceived: Record<string, number>;
  totalBlueprintsSent: number;
  requestHistory: number;  // count of completed requests
  localBlueprintCapacity: number;       // 0..1, how self-sufficient the colony is
}

interface BaseDebugInfo {
  baseId: string;
  position: Vec3;
  localCubeCount: number;
  botCount: number;
  botRoles: Record<BotRole, number>;
  workQueueSize: number;
  pendingDemands: number;
  unfulfilledDemands: number;
  currentActEmphasis: string;           // which act/emphasis drives allocation
  shipmentFraction: number;
}
```

---

## 19. Implementation Order

1. **PatronAgent** -- pure TypeScript class with request/reward cycle. Fully testable with no dependencies.
2. **PatronDirective types** -- define request, reward, and directive interfaces.
3. **CivilizationAI** -- wraps PatronAgent + BaseAgent[], tick coordination.
4. **applyPatronDirective()** -- patron requests boost base harvest/transport priorities.
5. **calculateShipmentFraction()** -- heuristic with 3-act gradient (dependency declines with tech tier + local blueprint capacity).
6. **getCurrentAct()** -- detect which act the colony is in based on tech tier, blueprint capacity, base count.
7. **SHIP_HOME bot state** -- carry cube to shipment point, call receiveCubeShipment().
8. **config/aiColony.json** -- externalize all patron, base, and act transition tunables.
9. **Patron-colony communication** -- wire PatronDirective to otterTrade.ts inventory.
10. **civilizations.json updates** -- add patronPriorities, patronPersonality, shipHomeBias, nativePolicy.
11. **Native interaction in BaseAgent** -- handleNativeContact() with race-specific policies.
12. **TRADE_NATIVE bot state** -- interact with alien native entity.
13. **Victory condition updates** -- 4X victories (economic, military, scientific, territorial, subjugation, survival).
14. **Dynamic hostility** -- replace HOSTILE_FACTIONS table, add native relationship.
15. **Abstract cube generation fallback** -- spawn real cubes at each base until full pipeline works.
16. **Debug overlay** -- show Patron + per-base decisions + current act in dev mode.
17. **60-minute smoke test** -- run 4 colonial AIs + natives, verify: all 3 acts reached, cubes flowing, factory automation phase, conquest phase, no stuck states.

---

## 20. Connection to Existing Code

The Colonization model leverages code that already exists:

| Existing Code | Colonization Role |
|---|---|
| `src/systems/otterTrade.ts` | IS the patron trade interface. TradeItem = blueprint/reward. |
| `src/rendering/OtterRenderer.tsx` | IS the patron communication channel (holographic projections). |
| `src/ai/base/BaseAgent.ts` | IS the autonomous base agent (local event bus + work queue). |
| `src/ai/base/BaseWorkQueue.ts` | IS the task claiming system (bots claim from queue). |
| `src/systems/eventBus.ts` | IS the world event bus (25 event types, aggregates base buses). |
| `src/ai/BotBrain.ts` | IS the bot tactical FSM (extend with economy + colonization states). |
| `src/ai/BotOrders.ts` | IS the order system (extend with new order types). |
| `src/ai/BotContext.ts` | IS the perception snapshot (extend with economy + native data). |

The 3-act model doesn't require building something new from scratch -- it reframes and connects systems that already exist. The biggest new piece is PatronAgent, which is intentionally simple (request/reward cycle, no complex AI reasoning). The 3-act progression (Colonization -> Factory -> Conquest) emerges naturally from the patron dependency gradient as local blueprint production increases. No explicit act transitions -- just rational cost-benefit shifts.
