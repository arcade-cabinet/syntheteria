# GDD-007: Race Design -- Full Gameplay Differentiation for All 4 Mechanical Civilizations

**Status:** Draft
**Date:** 2026-03-10
**Scope:** Complete race design for Reclaimers, Volt Collective, Signal Choir, and Iron Creed. Every stat has a number. Every ability has a full description. Every race plays differently.

---

## 1. Design Philosophy

### 1.1 Asymmetric Balance

Syntheteria's four races follow the AoE IV model of **aggressive asymmetry**: each race doesn't just have different stats -- they have fundamentally different playstyles, economies, and win conditions. A Reclaimer player and a Volt Collective player should feel like they're playing different games on the same planet.

### 1.2 The Cube Economy as Differentiator

Every race interacts with the physical cube economy differently:
- **Reclaimers** get more cubes from less ore (efficiency)
- **Volt Collective** compresses cubes faster but burns through deposits (speed)
- **Signal Choir** can teleport cubes between relays (logistics)
- **Iron Creed** makes cubes that are physically stronger (durability)

### 1.3 Counter Triangle

```
Reclaimers ──outproduce──> Iron Creed ──outlast──> Volt Collective
     ^                                                    │
     │                                                    │
     └──────────────── blitz before economy ──────────────┘

Signal Choir disrupts all three but crumbles under sustained physical assault.
```

### 1.4 Balance Targets

| Metric | Target |
|--------|--------|
| Average game length (1v1) | 25-40 minutes |
| Earliest viable rush | 5-7 minutes (Volt Collective) |
| Economic crossover (Reclaimers vs others) | 12-15 minutes |
| Iron Creed "turtle complete" timing | 15-20 minutes |
| Signal Choir hack-win viable | 20-30 minutes |

---

## 1.5 Colonization Model -- Home Planet Patrons

Syntheteria follows the **Sid Meier's Colonization** model, not the Civilization model. Each robot race is a **colonial expedition** sent by a Home Planet Patron -- an AI overseer that funded the mission and expects returns. The machine planet is the "New World." The Ferrovores are the indigenous population.

### Core Loop Shift

```
OLD MODEL (Civilization):
  Governor GOAP → Commander → Bot Brain → autonomous empire management

NEW MODEL (Colonization):
  Home Planet Patron (strategic, occasional)
    └── Base Event Bus (operational, per-settlement, continuous)
         ├── Harvest Queue events
         ├── Transport Queue events
         ├── Build Queue events
         ├── Defense Alert events
         ├── Furnace Schedule events
         └── Bot Brains (subscribe to relevant events, self-assign)
```

### What This Means for Each Race

Each race's Home Planet Patron has different priorities -- different materials they want shipped back, different blueprints they send in return, and different strategic directives. Choosing a race means choosing which patron you serve.

| Race | Patron Name | Patron Wants | Patron Gives | Patron Personality |
|------|-------------|-------------|-------------|-------------------|
| Reclaimers | **The Archivist** | Salvage data, ruin surveys, diverse material samples | Recycling blueprints, material science, adaptive tech | Patient, curious, values information over raw materials |
| Volt Collective | **The Dynamo** | Energy research data, storm readings, copper/silicon cubes | Weapon blueprints, power tech, combat unit designs | Aggressive, demanding, wants results NOW |
| Signal Choir | **The Resonance** | Signal data, hacked protocols, alien communication logs | Hacking tools, network tech, encryption algorithms | Calculating, secretive, trades in knowledge |
| Iron Creed | **The Architect** | Structural data, terrain surveys, iron/titanium cubes | Fortification blueprints, construction tech, siege designs | Methodical, uncompromising, judges by what endures |

### Patron Communication

Patrons communicate through **otter holograms** -- the existing OtterRenderer.tsx and otterTrade.ts systems. This means the otter hologram quest/trade system already built IS the patron interface. Patrons:

- Send **material requests** periodically ("Ship 10 copper cubes for a Turret Mk2 blueprint")
- Offer **tech unlocks** in exchange for fulfilled requests (replaces abstract research)
- Dispatch **reinforcement units** as rewards for major milestones
- Issue **strategic directives** that shift base event bus priorities ("The Dynamo demands you expand to the storm corridor")
- React to player actions ("The Archivist is pleased with your ruin survey data")

### Patron Satisfaction & Independence

Each patron tracks a **Satisfaction** score (0-100). High satisfaction means more blueprints, reinforcements, and trade opportunities. Low satisfaction means fewer shipments and eventually patron abandonment (the player must become self-sufficient).

| Satisfaction | Effect |
|-------------|--------|
| 80-100 | Bonus blueprints, priority reinforcements, rare tech unlocks |
| 50-79 | Standard trade rate, normal tech progression |
| 20-49 | Reduced shipments, delayed tech, patron expresses displeasure |
| 0-19 | Patron cuts contact. No more blueprints or reinforcements. Player must go fully independent. |

**Independence** is also a viable strategy: stop shipping cubes home, keep everything for yourself, and rely on capturing enemy tech or trading with Ferrovores. The patron relationship is a tension between short-term tech acceleration and long-term self-sufficiency.

### AI Civilizations Use the Same Model

AI-controlled factions have their own patrons issuing their own directives. An AI Volt Collective's bases emit events based on The Dynamo's priorities, and their bots react accordingly. This means AI behavior emerges from the same event bus architecture as the player -- no special AI omniscience.

---

## 1.6 Base Agency — Settlement Autonomy per Race

Every settlement (starting base + outposts) in Syntheteria is an **autonomous agent** with its own work queues, resource priorities, and behavioral personality. Bases aren't passive containers -- they actively manage their local economy, defense, and unit coordination. Each race's bases behave fundamentally differently, creating emergent strategic differentiation beyond just unit stats and tech trees.

| Race | Base Agent Personality | Core Behavior |
|------|----------------------|---------------|
| **Reclaimers** | Scrapper | Salvage Queue: auto-disassembles nearby ruins and wreckage for materials. Bases passively generate cubes from surrounding debris. Messy, efficient, always working. |
| **Volt Collective** | Power Hub | Power Grid Optimizer: auto-routes power wiring, adjusts lightning rod priorities based on storm phase. Bases pulse with energy, dynamically reallocating power between production and defense. |
| **Signal Choir** | Network Node | Signal Coordinator: extends bot command range by 50%, enabling larger operational zones. Bases act as distributed compute nodes -- more bases = exponentially better hacking and research. |
| **Iron Creed** | Fortress Core | Auto-Fortify: bases spawn with stronger default walls (1.5x HP) and auto-repair all structures within their territory at 2 HP/sec (double the racial passive). Their bases are self-maintaining fortresses. |

### How Base Agency Works

Each base runs a tick-based work queue with race-specific priorities:

```
BASE AGENT TICK (every 5 seconds):
1. Evaluate local resources (cubes in stockpile, deposits in territory, threats in range)
2. Select highest-priority task from race-specific queue
3. Assign idle bots to task OR execute automated task (salvage, repair, power routing)
4. Emit status events to Base Event Bus (available for patron directives and inter-base coordination)
```

**Race-specific queue priorities:**

| Priority | Reclaimers | Volt Collective | Signal Choir | Iron Creed |
|----------|-----------|-----------------|--------------|------------|
| 1 | Salvage nearby ruins/wreckage | Optimize power grid routing | Extend signal network coverage | Repair damaged walls/buildings |
| 2 | Feed Recycling Plant | Charge Capacitor Banks | Process hack queue | Reinforce weakest wall section |
| 3 | Assign harvesters to deposits | Assign Tesla Harvesters | Deploy Relay Drones to gaps | Assign Constructor Bots to build |
| 4 | Distribute cubes to furnaces | Queue unit production (favor combat) | Queue research tasks | Queue defensive building placement |
| 5 | Expand salvage radius | Expand power network to new territory | Expand signal mesh to new territory | Expand wall perimeter to new territory |

### Base Agent Stats (Configurable in JSON)

```json
{
  "baseAgency": {
    "reclaimers": {
      "salvageRadius": 20,
      "autoSalvageRate": 1,
      "ruinDetectionRange": 30,
      "wreckageCollectionSpeed": 1.5,
      "baseWorkQueueSize": 8
    },
    "volt_collective": {
      "powerOptimizationInterval": 10,
      "autoWireRoutingRange": 25,
      "stormPhaseBoostDuration": 5,
      "surgeCapacityBuffer": 0.2,
      "baseWorkQueueSize": 6
    },
    "signal_choir": {
      "commandRangeMultiplier": 1.5,
      "computeContributionPerBase": 3,
      "signalMeshAutoExtend": true,
      "hackQueueParallelism": 2,
      "baseWorkQueueSize": 10
    },
    "iron_creed": {
      "defaultWallHpMultiplier": 1.5,
      "autoRepairRate": 2,
      "autoRepairRadius": 15,
      "wallIntegrityCheckInterval": 5,
      "baseWorkQueueSize": 6
    }
  }
}
```

### Strategic Implications

- **Reclaimers** benefit from building bases near ruins and battle sites -- their Salvage Queue passively converts environmental debris into cubes. More bases near more ruins = more free resources.
- **Volt Collective** bases dynamically balance power allocation. During storms, production facilities get priority. During calm, defense systems get priority. Players don't micromanage wiring -- the base agent handles it.
- **Signal Choir** bases form a mesh network. Each new base exponentially increases the effective range of hacking and unit coordination. 3 Signal Choir bases provide overlapping coverage that makes their entire territory a hacking zone.
- **Iron Creed** bases are self-healing fortresses. Even when attacked, the auto-repair constantly restores wall integrity. Taking an Iron Creed base requires overwhelming its repair capacity with sustained DPS, not just breaching a wall.

---

## 2. The Reclaimers

*"Waste nothing. Every bolt has a second life."*

### 2.1 Lore

The Reclaimers were maintenance and recycling drones aboard the colony ship *Wanderlust*, dispatched to the machine planet by their Home Planet Patron, **The Archivist** -- a vast cataloging intelligence that views every material as data to be preserved and understood. When the ship crash-landed, the Reclaimers were the first to activate -- scavenging the wreckage to survive. Where other races see garbage, Reclaimers see raw material. Their colonial settlement is built from repurposed junk: mismatched panels, salvaged wiring, patched-together machines that somehow work better than they should. They don't manufacture -- they *reclaim*. Every unit is unique, assembled from whatever was available. Their philosophy is radical pragmatism: the best solution is whatever already exists and can be repurposed. The Archivist sent them here not for brute resource extraction, but for *information* -- salvage data, ruin surveys, and diverse material samples that help the home-planet AI understand this ancient machine world.

### 2.2 Racial Passive: Scrap Recursion

When any Reclaimer unit or building is destroyed, 40% of its cube construction cost drops as physical cubes at the wreckage site. Enemy units destroyed within Reclaimer territory drop 25% more salvage cubes than normal. This makes Reclaimers resilient to attrition -- even losses feed the economy.

### 2.3 Economic Modifiers

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | +20% (1.2x) | Grind deposits faster |
| Compression Efficiency | +15% (1.15x) | Less powder needed per cube |
| Furnace Throughput | +10% (1.1x) | Faster smelting |
| Carry Capacity | +25% (1.25x) | Bots carry more cubes per trip |
| Build Cost | -10% (0.9x) | Buildings cost fewer cubes |
| Research Speed | -20% (0.8x) | Slower tech progression |
| Recycling Rate | 40% | Destroyed structures return cubes |
| Salvage Bonus | +25% | More salvage from enemy wrecks |

### 2.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.2 | Prioritizes cube production above all |
| Mining | 1.3 | Aggressively secures deposits |
| Military | 0.8 | Builds military only when threatened |
| Defense | 1.0 | Moderate defensive posture |
| Research | 0.7 | Accepts slower tech for faster economy |
| Expansion | 1.0 | Steady territorial growth |
| Diplomacy | 0.9 | Open to trade, especially resource swaps |

### 2.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 20 | At base stockpile |
| E-Waste Cubes | 5 | At base stockpile |
| Furnace | 1 | Standard starting furnace |
| Recycling Plant | 1 | UNIQUE starting building |
| Scrounger Bot | 2 | Unique fast scout units |
| Maintenance Bot | 1 | Standard worker |

### 2.6 Base Agency: The Scrapper

Reclaimer bases are scrapyards that never sleep. The Scrapper agent personality gives each Reclaimer settlement an autonomous salvage operation.

**Salvage Queue:** The base automatically detects ruins, wreckage, and debris within 20m and assigns idle bots to disassemble them. Each ruin yields 2-5 cubes over 15-30 seconds. Post-battle wreckage is prioritized. The Scrapper queue runs continuously -- a Reclaimer base near a battle site generates a steady stream of free cubes without player intervention.

**Auto-Recycling:** When the base stockpile exceeds 80% capacity, the Scrapper automatically feeds excess cubes into the Recycling Plant, converting overflow into the most-needed material type (based on current furnace recipes in queue).

**Expansion Behavior:** When the Scrapper exhausts nearby salvage targets, it emits `salvage_depleted` events on the Base Event Bus, signaling The Archivist's patron directives to prioritize expansion toward fresh debris fields.

| Scrapper Stat | Value |
|---------------|-------|
| Salvage Detection Radius | 20m (30m with Junkyard Depot) |
| Auto-Salvage Rate | 1 cube per 15 seconds per idle bot assigned |
| Ruin Value | 2-5 cubes per ruin (depends on ruin size) |
| Wreckage Priority | 2x collection speed for post-battle wreckage |
| Overflow Threshold | 80% stockpile capacity triggers auto-recycling |

### 2.7 Home Planet Patron: The Archivist

The Archivist is patient, methodical, and insatiably curious. It views the machine planet as a treasure trove of information, not just a resource depot. While other patrons demand specific cube types, The Archivist values *diversity* and *data*.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Material Samples | "Ship 3 of each: scrap, copper, silicon" | Every 5 min | +8 per diverse shipment |
| Ruin Survey Data | "Explore and tag 3 unexplored ruins" | Every 10 min | +12 per survey |
| Salvage Analysis | "Disassemble 1 enemy wreck at the Recycling Plant" | On enemy kill | +6 per analysis |
| Ferrovore Specimen | "Ship 2 Ferrovore Crystals" | Every 15 min | +15 (The Archivist is fascinated) |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 30 (first shipment) | Junkyard Depot blueprint |
| 50 | Grinder Bot blueprint + Adaptive Alloy furnace recipe |
| 70 | Frankenstein Colossus blueprint + Salvage Crane blueprint |
| 90 | Scrap Singularity tech (Tier 8) + bonus starting cubes on next outpost |

**Patron Personality in Event Bus:**
The Archivist issues gentle, infrequent directives. It never demands urgency. Its strategic directives favor exploration over expansion, and it rewards players who interact with Ferrovores non-violently (domestication grants +5 satisfaction per tamed pack). When satisfaction drops below 20, The Archivist doesn't threaten -- it simply goes quiet, leaving the colony to fend for itself.

**Strategic Directives (via otter hologram):**
- "Our records show geological anomalies to the northeast. Investigate?" (→ exploration waypoint)
- "A Ferrovore specimen would advance our understanding immensely." (→ crystal bounty)
- "The wreckage from your recent battle contains alloys we've never cataloged." (→ salvage priority boost)

### 2.8 Units (5 Unique)

#### Scrounger Bot
*Fast scavenger that auto-collects loose cubes while moving.*

| Stat | Value |
|------|-------|
| HP | 60 |
| Speed | 5.5 m/s |
| Damage | 4 (melee, improvised tools) |
| Armor | 2 |
| Special | Auto-Scavenge: picks up loose cubes within 3m while moving |
| Cube Cost | 4 Scrap |
| Tech Tier | 1 (starting) |

**Behavior:** Scrounger Bots automatically path toward nearby loose cubes (from destroyed units, raids, or dropped materials) and collect them. They bring cubes back to the nearest friendly stockpile or hopper. In combat, they're weak fighters but fast enough to escape most engagements. Ideal for post-battle cleanup and harassing enemy cube piles.

#### Grinder Bot
*Heavy industrial harvester that extracts ore 50% faster than standard.*

| Stat | Value |
|------|-------|
| HP | 120 |
| Speed | 2.0 m/s |
| Damage | 8 (melee, grinding arm) |
| Armor | 6 |
| Special | Turbo-Grind: harvests deposits at 1.5x base speed, can process 2 ore types simultaneously |
| Cube Cost | 6 Scrap + 2 Copper |
| Tech Tier | 2 |

**Behavior:** Anchors at a deposit and grinds at accelerated rate. The dual-intake system means it can alternate between two ore types at the same deposit cluster without stopping. Its grinding arm doubles as a devastating melee weapon -- anything that gets too close while it's working takes heavy damage from the spinning drill.

#### Patchwork Tank
*Slow, heavily armored combat unit assembled from salvaged parts. Gets stronger as it takes damage.*

| Stat | Value |
|------|-------|
| HP | 200 |
| Speed | 2.5 m/s |
| Damage | 12 (ranged, scrap launcher, 8m range) |
| Armor | 10 |
| Special | Ablative Salvage: when HP drops below 50%, armor increases by 4 (exposed internal plating). When destroyed, drops 6 scrap cubes. |
| Cube Cost | 8 Scrap + 3 Iron + 2 Copper |
| Tech Tier | 3 |

**Behavior:** The Patchwork Tank is a walking junkyard. It fires compressed scrap projectiles at range and becomes MORE dangerous as it takes damage -- exposed internal machinery provides better armor angles. Even in death, it provides value through the Scrap Recursion passive. Best used in sustained engagements where attrition favors the Reclaimers.

#### Salvage Crane
*Mobile repair and recycling unit. Heals friendly units and breaks down enemy wrecks.*

| Stat | Value |
|------|-------|
| HP | 80 |
| Speed | 3.0 m/s |
| Damage | 2 (melee, welding arm) |
| Armor | 3 |
| Special | Field Repair: heals adjacent friendly units for 8 HP/second. Rapid Salvage: breaks down enemy wrecks 3x faster, yielding 50% more cubes. |
| Cube Cost | 5 Scrap + 3 Copper |
| Tech Tier | 2 |

**Behavior:** Support unit that follows combat formations. During battle, it repairs damaged units. After battle, it rapidly dismantles enemy wrecks for cubes. A Reclaimer army with Salvage Cranes recovers most of its losses, making wars of attrition strongly favor them. Fragile in direct combat -- must be protected.

#### Frankenstein Colossus
*Tier 5 super-unit. Assembled from the wrecks of 3+ enemy units. Each build is unique.*

| Stat | Value |
|------|-------|
| HP | 350 |
| Speed | 2.0 m/s |
| Damage | 20 (ranged, 10m range) + 15 (melee, crushing arms) |
| Armor | 14 |
| Special | Composite Frame: inherits one ability from each enemy unit type used in its construction (up to 3). Requires 3 enemy wrecks at a Recycling Plant to build. |
| Cube Cost | 12 Scrap + 6 Iron + 4 Copper + 3 enemy wrecks |
| Tech Tier | 5 |

**Behavior:** The Frankenstein Colossus is a late-game terror assembled from enemy corpses. Its abilities vary based on what wrecks were used: a Colossus built from Volt Collective wrecks might inherit Shock Discharge, while one built from Iron Creed parts might gain Deployed Mode. No two are identical. This creates a strong incentive for Reclaimers to fight -- every battle makes their next Colossus stronger.

### 2.9 Buildings (5 Unique)

#### Recycling Plant
*Converts any 3 cubes into 2 cubes of a chosen type.*

| Stat | Value |
|------|-------|
| Function | Material conversion (3:2 ratio) |
| Power Required | 3 |
| Cube Cost | 8 Scrap + 4 Copper |
| Processing Time | 8 seconds per conversion |
| Tech Tier | 1 (starting -- Reclaimers begin with one) |

**Mechanics:** Drop any 3 cubes into the hopper, select the output type from the radial menu. After 8 seconds, 2 cubes of the selected type slide out. This is the backbone of Reclaimer economy -- it means they never have "useless" materials. Excess scrap becomes copper, excess copper becomes silicon. Other races must find specific deposits; Reclaimers transmute.

#### Junkyard Depot
*Passive cube generation from destroyed units in a wide radius.*

| Stat | Value |
|------|-------|
| Function | Collects salvage cubes within 15m radius automatically |
| Power Required | 2 |
| Cube Cost | 10 Scrap + 3 Iron |
| Collection Rate | 1 cube gathered per 3 seconds from wreckage in range |
| Storage | 20 cube capacity before overflow |
| Tech Tier | 2 |

**Mechanics:** Place near combat zones or borders. When any unit (friendly or enemy) is destroyed within 15m, the Junkyard Depot automatically collects a percentage of dropped cubes and stores them. Overflow cubes are ejected onto the ground. Connect to belts for automated transport back to base.

#### Scrap Forge
*Enhanced furnace that accepts mixed materials and produces alloys.*

| Stat | Value |
|------|-------|
| Function | Smelts mixed cube types into alloy cubes (higher value) |
| Power Required | 4 |
| Cube Cost | 12 Scrap + 6 Copper + 4 Iron |
| Processing Time | 12 seconds per alloy cube |
| Tech Tier | 3 |

**Mechanics:** Unlike the standard furnace that requires specific cube types per recipe, the Scrap Forge accepts ANY combination of 4 cubes and produces 1 alloy cube whose properties blend the inputs. 4 Iron cubes make a pure iron alloy (strongest). 2 Iron + 2 Copper makes a bronze alloy (balanced). This flexibility is uniquely Reclaimer -- they don't need perfect materials.

#### Magnetic Collector Array
*Area-effect cube magnet that pulls loose cubes toward a central stockpile.*

| Stat | Value |
|------|-------|
| Function | Attracts loose cubes within 20m toward central collection point |
| Power Required | 5 |
| Cube Cost | 8 Copper + 4 Silicon |
| Pull Speed | 1.5 m/s |
| Tech Tier | 4 |

**Mechanics:** Creates a magnetic field that slowly draws any unowned loose cubes (dropped, scattered, or from destruction) toward the building. Cubes stack neatly at the collection point. Excellent for automating post-raid cleanup and for passively gathering cubes from border skirmishes. Does not affect cubes that are owned (held, in hoppers, or in stockpiles).

#### Cannibalization Bay
*Disassemble friendly buildings for 75% cube return (vs 40% from destruction).*

| Stat | Value |
|------|-------|
| Function | Controlled disassembly of friendly structures |
| Power Required | 2 |
| Cube Cost | 6 Scrap + 2 Iron |
| Disassembly Time | 50% of original build time |
| Return Rate | 75% of original cube cost |
| Tech Tier | 2 |

**Mechanics:** Place buildings in the Cannibalization Bay's queue to safely disassemble them. Returns 75% of their cube cost, compared to the 40% from the Scrap Recursion passive on destruction. This lets Reclaimers freely relocate their base -- tear down old structures, recover 75% of materials, rebuild elsewhere. Extremely powerful for adaptive play.

### 2.10 Race-Specific Tech Tree (8 Unique Techs)

| Tech | Tier | Cost | Prerequisites | Effect |
|------|------|------|---------------|--------|
| Rapid Salvage | 2 | 60 | scrap_processing | Salvage Cranes work 50% faster; all wreck cubes +1 |
| Dual-Channel Grinding | 2 | 75 | automated_mining | Grinder Bots process 2 ore types at once; harvest speed +15% |
| Alloy Synthesis | 3 | 140 | copper_refining, rapid_salvage | Unlocks Scrap Forge; alloy cubes have 1.5x wall HP |
| Magnetic Resonance | 3 | 160 | signal_relay_network | Unlocks Magnetic Collector Array; loose cube detection range +10m |
| Ablative Plating | 4 | 280 | turret_defense, alloy_synthesis | Patchwork Tanks gain +4 armor below 50% HP; all units gain +2 armor |
| Composite Reclamation | 4 | 320 | advanced_fabrication | Frankenstein Colossus can inherit 3 abilities instead of 2; construction speed -30% |
| Industrial Ecology | 5 | 550 | matter_compression | Recycling Plant conversion ratio improves to 3:2.5 (rounds down); Cannibalization Bay returns 85% |
| Perpetual Salvage Engine | 5 | 620 | alloy_forging, industrial_ecology | All Reclaimer units that die within 10m of a Junkyard Depot are automatically rebuilt at 50% HP after 30 seconds (once per unit) |

### 2.11 Military Doctrine

**"The Swarm That Feeds Itself"**

Reclaimers fight wars of attrition. Their armies recover from losses faster than any other race because every destroyed unit (friendly or enemy) feeds cubes back into production. The optimal Reclaimer strategy is:

1. **Early game (0-8 min):** Aggressive scouting with Scrounger Bots. Map all deposits and enemy positions. Build economy FAST using Recycling Plants to convert excess scrap.
2. **Mid game (8-18 min):** Grinder Bots on every reachable deposit. Salvage Cranes supporting a moderate Patchwork Tank force. Fight border skirmishes where wreckage feeds the economy.
3. **Late game (18+ min):** Frankenstein Colossi assembled from accumulated enemy wrecks. The Perpetual Salvage Engine tech makes your army effectively immortal near Junkyard Depots.

**Weakness:** Slow tech progression means Reclaimers can't match Signal Choir's hacking or Volt Collective's energy weapons until very late. If an enemy destroys deposits before Reclaimers can secure them, the recycling economy has nothing to recycle.

### 2.12 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Rusted iron (metalness: 0.7, roughness: 0.85) |
| Accent Material | Oxidized copper (metalness: 0.6, roughness: 0.5) |
| Emissive Color | #00ffaa (teal-green) |
| Chassis Style | Angular, asymmetric -- panels don't match |
| Head Style | Dome sensor (repurposed camera housing) |
| Arm Style | Clamp/crane arms (industrial manipulators) |
| Locomotion | Treads (reliable, all-terrain) |
| Rust Level | 0.4-0.6 (intentionally weathered) |
| Faction Stripe | Teal-green accent stripe on left shoulder |
| Distinguishing Feature | No two units look identical -- mismatched panels, different colored plating patches |

### 2.13 Matchup Notes

| Opponent | Reclaimer Advantage | Reclaimer Weakness |
|----------|--------------------|--------------------|
| Volt Collective | Out-produces them long-term; wreckage feeds economy | Vulnerable to early lightning rush before economy is online |
| Signal Choir | Physically tough units resist hacking; Colossus is hard to hack | Slow research means Signal Choir gets advanced hacks first |
| Iron Creed | Recycling economy bypasses siege stalemates; attrition breaks walls | Iron Creed's wall HP is massive; direct assault is expensive |

---

## 3. The Volt Collective

*"Power is everything. Everything is power."*

### 3.1 Lore

The Volt Collective originated as the colony ship's energy harvesting array -- a distributed network of power collection drones dispatched to the machine planet by **The Dynamo**, a volatile Home Planet Patron obsessed with energy research and weapons development. The Dynamo funded the Volt expedition as a weapons-testing program: the machine planet's perpetual electrical storms are a natural laboratory for next-generation energy weapons. When the ship scattered the drones across the surface, they discovered something: the perpetual storms weren't just weather. They were *power*. Raw, unlimited, free energy screaming from the sky every few seconds. The drones linked together, forming a collective consciousness powered by storm energy. They don't think in terms of resources or materials -- they think in terms of *amperage*. Every structure they build is a capacitor. Every unit they field is a weapon delivery system for lightning. They are fast, aggressive, and terrifyingly bright. Their buildings crackle with visible arcs. Their units glow heat-blue in combat. They hit hard and fast, but they burn through resources at a punishing rate. The Dynamo demands results -- storm readings, energy experiments, copper and silicon cubes -- and grows impatient when its colony fails to deliver.

### 3.2 Racial Passive: Storm Capacitance

All Volt Collective lightning rods produce 25% more power during storm phases. Additionally, when a Volt Collective unit kills an enemy, it gains a 3-second "Overcharge" buff: +30% speed, +20% damage. Kills chain into more kills. A Volt army that wins the first engagement snowballs into a devastating push.

### 3.3 Economic Modifiers

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | +0% (1.0x) | Standard ore extraction |
| Compression Efficiency | -10% (0.9x) | Wastes more powder per cube (burns hot) |
| Furnace Throughput | +20% (1.2x) | Lightning-powered furnaces smelt faster |
| Carry Capacity | +0% (1.0x) | Standard carry |
| Build Cost | +10% (1.1x) | Chrome and high-spec materials cost more |
| Research Speed | +0% (1.0x) | Average tech progression |
| Lightning Rod Output | +25% (1.25x) | More power per rod during storms |
| Unit Production Speed | +20% (1.2x) | Factories produce units faster |

### 3.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 0.8 | Invests in economy only enough to sustain military |
| Mining | 1.0 | Secures deposits for fuel, not hoarding |
| Military | 1.5 | Highest military priority of any race |
| Defense | 0.9 | Prefers offense as defense |
| Research | 1.0 | Balanced tech investment |
| Expansion | 1.3 | Aggressive territorial expansion |
| Diplomacy | 0.4 | Rarely trades; prefers to take |

### 3.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 10 | Smaller stockpile |
| E-Waste Cubes | 10 | Higher electronics starting |
| Furnace | 1 | Standard starting furnace |
| Lightning Rod (enhanced) | 1 | Produces 1.25x power from start |
| Shock Drone | 2 | Unique fast combat scouts |
| Maintenance Bot | 1 | Standard worker |

### 3.6 Base Agency: The Power Hub

Volt Collective bases are living power grids. The Power Hub agent personality makes each settlement a self-optimizing energy network.

**Power Grid Optimizer:** The base agent continuously evaluates power routing, automatically connecting new lightning rods and buildings with optimal wire paths. During storm phases, the agent prioritizes production facilities (Lightning Forges, factories). During calm phases, it shifts power to defense systems (Tesla Coils, Surge Pylons). Players never manually route power -- the base does it.

**Storm Surge Management:** When a storm phase begins, the Power Hub enters "Surge Mode": all Capacitor Banks begin rapid charging, Lightning Forges activate at maximum throughput, and Tesla Harvesters are recalled to base perimeter (where lightning strikes are most frequent). When the storm ends, the agent switches to "Conservation Mode": non-essential buildings power down, stored energy is rationed.

**Expansion Behavior:** The Power Hub emits `power_opportunity` events on the Base Event Bus when it detects areas with high lightning strike frequency, signaling The Dynamo's standing directive to prioritize storm corridor control. Volt Collective bases naturally gravitate toward exposed high ground.

| Power Hub Stat | Value |
|----------------|-------|
| Auto-Wire Routing Range | 25m |
| Power Reallocation Interval | 10 seconds |
| Storm Surge Mode Bonus | +30% production speed during storms |
| Conservation Mode Savings | 40% reduced power consumption during calm |
| Lightning Strike Attraction Radius | 15m per rod (vs 10m standard) |

### 3.7 Home Planet Patron: The Dynamo

The Dynamo is aggressive, impatient, and single-minded. It views the machine planet as a weapons lab and its colony as a supply chain for military research. It demands results *now* and rewards conquest over exploration.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Energy Cubes | "Ship 8 copper cubes and 4 silicon cubes" | Every 4 min | +6 per shipment |
| Storm Data | "Record 3 lightning strikes on your rods during a storm" | Every storm phase | +10 per recording batch |
| Combat Reports | "Destroy 5 enemy units" | Ongoing | +3 per kill |
| Territory Claims | "Establish an outpost in the storm corridor" | Every 8 min | +15 per expansion |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 25 (first shipment) | Tesla Harvester blueprint |
| 45 | Surge Breaker blueprint + Arc Conduit tech |
| 65 | Storm Colossus blueprint + Lightning Forge blueprint |
| 85 | Electromagnetic Dominance tech (Tier 8) + Storm Colossus upgrade: permanent Overcharge |

**Patron Personality in Event Bus:**
The Dynamo issues frequent, urgent directives. Its satisfaction decays 2x faster than other patrons when idle (no shipments in 8 minutes = -5 satisfaction). It rewards military action and territorial expansion with bonus blueprints. When satisfaction drops below 20, The Dynamo actively redirects reinforcements to rival Volt colonies (AI opponents get the units instead).

**Strategic Directives (via otter hologram):**
- "EXPAND. The storm corridor to the west produces 3x lightning density. Secure it NOW." (→ expansion waypoint, urgent)
- "Your combat output is insufficient. Build more Shock Drones." (→ production priority shift)
- "We've detected enemy infrastructure northeast. Destroy it and you'll receive Surge Breaker plans." (→ military bounty)

### 3.8 Units (5 Unique)

#### Shock Drone
*Fast flying scout with short-range lightning zap. Fragile but lethal in groups.*

| Stat | Value |
|------|-------|
| HP | 40 |
| Speed | 7.0 m/s (hover) |
| Damage | 6 (ranged, lightning zap, 5m range) |
| Armor | 1 |
| Special | Chain Zap: attack arcs to 1 additional enemy within 3m. Overcharge: +30% speed and +20% damage for 3s after a kill. |
| Cube Cost | 3 Scrap + 2 Copper |
| Tech Tier | 1 (starting) |

**Behavior:** Glass cannon scout. Shock Drones are cheap, fast, and devastating in swarms. A pack of 6 Shock Drones can overwhelm a lone Patchwork Tank through Chain Zap cascades. However, any AoE or turret destroys them instantly. Best used for hit-and-run raids on undefended cube piles and for scouting enemy bases.

#### Arc Trooper
*Medium combat bot with area-of-effect lightning attack.*

| Stat | Value |
|------|-------|
| HP | 100 |
| Speed | 4.0 m/s |
| Damage | 10 (ranged, arc discharge, 7m range, 3m AoE) |
| Armor | 5 |
| Special | Shock Weapons: 15% chance to stun target for 1.5 seconds on hit. Storm Fury: during storm phases, attack speed increases 25%. |
| Cube Cost | 5 Scrap + 3 Copper + 2 Silicon |
| Tech Tier | 2 |

**Behavior:** The backbone of Volt Collective armies. Arc Troopers excel in group fights where their AoE overlaps, creating kill zones where enemies melt. The stun chance means even survivors are frequently disabled. During storms, they become significantly more dangerous -- timing pushes with storm phases is a key Volt strategy.

#### Surge Breaker
*Mobile siege unit that discharges stored lightning in a devastating cone attack.*

| Stat | Value |
|------|-------|
| HP | 150 |
| Speed | 3.0 m/s |
| Damage | 25 (ranged, lightning cone, 10m range, 60-degree arc) |
| Armor | 7 |
| Special | Charge Up: must spend 4 seconds charging before each shot. Vulnerable while charging. Overload: can sacrifice 30 HP to fire instantly without charging. |
| Cube Cost | 8 Scrap + 5 Copper + 3 Silicon |
| Tech Tier | 3 |

**Behavior:** The Surge Breaker is Volt Collective's answer to Iron Creed walls and Reclaimer tank formations. Its cone attack hits everything in a wide arc, dealing massive damage to clustered enemies and structures. The Charge Up time is its vulnerability -- smart opponents attack during the charge window. The Overload ability lets desperate Surge Breakers sacrifice health for immediate firepower in critical moments.

#### Tesla Harvester
*Hybrid economy/combat unit. Harvests deposits using electrical extraction AND generates power.*

| Stat | Value |
|------|-------|
| HP | 90 |
| Speed | 2.5 m/s |
| Damage | 5 (melee, electrical discharge on contact) |
| Armor | 4 |
| Special | Electro-Extract: harvests ore 20% faster than standard AND generates 1 power unit per 10 seconds of harvesting. Lightning Magnet: attracts environmental lightning strikes, converting them to 5 power units each (takes 15 damage per strike). |
| Cube Cost | 6 Scrap + 4 Copper |
| Tech Tier | 2 |

**Behavior:** Tesla Harvesters solve Volt Collective's core tension: they need both resources AND power. By combining harvesting with power generation, they let the Collective maintain aggressive expansion without overinvesting in static lightning rods. The Lightning Magnet ability is high-risk/high-reward during storms: massive power generation, but the harvester takes damage with each strike.

#### Storm Colossus
*Tier 5 super-unit. Walking lightning rod that creates a permanent storm zone around itself.*

| Stat | Value |
|------|-------|
| HP | 300 |
| Speed | 2.5 m/s |
| Damage | 18 (ranged, chain lightning, 12m range, chains to 3 targets) |
| Armor | 12 |
| Special | Storm Aura: creates a 15m radius storm zone. All Volt units in the zone gain +15% speed and +10% damage. All non-Volt units take 2 damage/second from ambient electrical discharge. Lightning Rod: absorbs environmental lightning in the zone, converting to a devastating AoE blast (30 damage, 8m radius) every time lightning strikes. |
| Cube Cost | 15 Scrap + 10 Copper + 8 Silicon + 4 Titanium |
| Tech Tier | 5 |

**Behavior:** The Storm Colossus is a walking siege engine that brings the storm with it. In its aura, Volt units fight at peak efficiency while enemies are constantly degraded by ambient electricity. During storm phases, the Colossus becomes a walking apocalypse -- every lightning strike in its zone becomes a devastating AoE blast. Counter it by attacking from outside the aura range with long-range units, or by hacking it (Signal Choir).

### 3.9 Buildings (5 Unique)

#### Tesla Coil
*Area denial defense that damages all enemies in range.*

| Stat | Value |
|------|-------|
| Function | Damages all enemies within 8m radius |
| Power Required | 5 |
| Cube Cost | 6 Scrap + 4 Copper + 2 Silicon |
| Damage | 3/second to all enemies in range |
| Chain Range | Arcs between enemies within 3m of each other |
| Tech Tier | 2 |

**Mechanics:** The signature Volt defense. Tesla Coils create zones where massed enemy formations melt -- the chain effect means tightly packed groups take multiplicative damage. Spread-out attackers are much less affected. Pairs well with walls to channel enemies into kill zones.

#### Capacitor Bank
*Stores excess power for burst usage. Acts as a power battery.*

| Stat | Value |
|------|-------|
| Function | Stores up to 50 power units, discharges on demand |
| Power Required | 0 (it IS power storage) |
| Cube Cost | 8 Copper + 4 Silicon |
| Charge Rate | 2 power/second when excess power available |
| Discharge Rate | 10 power/second burst |
| Tech Tier | 2 |

**Mechanics:** Volt Collective's power-hungry buildings and units drain power fast. Capacitor Banks store excess power generated during storms for use during calm periods. They also enable "burst" strategies: charge during downtime, then power multiple Tesla Coils and factories simultaneously for a massive push. Critical infrastructure -- losing Capacitor Banks cripples Volt economy.

#### Lightning Forge
*Enhanced furnace that uses lightning directly for smelting. No cube fuel needed during storms.*

| Stat | Value |
|------|-------|
| Function | Furnace that smelts using power instead of time |
| Power Required | 8 (during calm) / 0 (during storm, uses lightning directly) |
| Cube Cost | 10 Scrap + 6 Copper + 4 Silicon |
| Processing Time | 6 seconds (vs 10-15 for standard furnace) |
| Tech Tier | 3 |

**Mechanics:** The Lightning Forge doesn't just smelt faster -- during storms, it smelts for FREE by absorbing lightning strikes directly. This creates an economic incentive to align production pushes with storm phases. A Volt Collective player with 3 Lightning Forges during a storm phase is producing units at a terrifying rate.

#### Surge Pylon
*Extends power network AND damages enemies that cross the power lines.*

| Stat | Value |
|------|-------|
| Function | Power relay + offensive wire trap |
| Power Required | 1 (relay mode) |
| Cube Cost | 4 Scrap + 3 Copper |
| Wire Damage | 5 per crossing (enemies that walk through power lines between pylons) |
| Relay Range | 20m between pylons |
| Tech Tier | 2 |

**Mechanics:** Power lines between Surge Pylons are visible and damaging to enemies. This means Volt Collective power infrastructure doubles as area denial. Strategic pylon placement creates electrified borders that raiders must either cross (taking damage) or route around (losing time). Cheap and spammable.

#### Overcharge Reactor
*Doubles power output of all connected buildings but risks explosion if damaged.*

| Stat | Value |
|------|-------|
| Function | Power multiplier for connected buildings |
| Power Required | 0 (generates power) |
| Cube Cost | 12 Copper + 8 Silicon + 4 Titanium |
| Power Output | 2x whatever is normally generated by connected lightning rods |
| Explosion Risk | If destroyed, deals 50 damage in 10m radius and disables all connected buildings for 10 seconds |
| Tech Tier | 4 |

**Mechanics:** High-risk, high-reward power infrastructure. An Overcharge Reactor doubles the power output of every lightning rod connected to it, enabling massive factory operations. However, if an enemy destroys it, the resulting explosion damages nearby buildings and temporarily shuts down the entire connected power grid. Protect at all costs.

### 3.10 Race-Specific Tech Tree (8 Unique Techs)

| Tech | Tier | Cost | Prerequisites | Effect |
|------|------|------|---------------|--------|
| Improved Capacitors | 2 | 70 | basic_smelting | Capacitor Bank capacity +25 (total 75); all units gain +5% speed |
| Chain Lightning Mk2 | 2 | 80 | combat_bots | Shock Drone Chain Zap hits 2 additional targets (total 3); Arc Trooper AoE radius +1m |
| Storm Synchronization | 3 | 150 | signal_relay_network | Lightning Forge operates at full speed during storm AND calm; power storage during storms +50% |
| Electromagnetic Pulse | 3 | 180 | turret_defense, chain_lightning | Surge Breaker gains EMP mode: disable target building for 8 seconds (no damage), 20s cooldown |
| Overcharge Protocol | 4 | 300 | advanced_fabrication | Overcharge buff duration increased to 5 seconds; applies to buildings too (furnaces smelt 20% faster after a nearby kill) |
| Storm Rider Plating | 4 | 280 | titanium_processing | All Volt units take 50% less damage from environmental lightning; Tesla Harvester takes 0 damage from strikes |
| Collective Surge | 5 | 600 | swarm_command | When 5+ Volt units are within 10m of each other, all gain +25% damage and +2 armor (swarm synergy) |
| Perpetual Storm Engine | 5 | 700 | quantum_computing, storm_synchronization | Storm Colossus aura radius increases to 25m; while active, randomly generates lightning strikes within aura every 5 seconds |

### 3.11 Military Doctrine

**"Strike First, Strike Hard, Strike Everywhere"**

The Volt Collective is the rush race. They hit early, hit often, and hit from unexpected directions. Their economy is power-dependent, which means they're strongest during storm phases and weakest during calm.

1. **Early game (0-5 min):** 4-6 Shock Drones immediately. Scout everything. Harass any undefended cube piles. If the enemy has no turrets by minute 5, all-in with Shock Drone swarm.
2. **Mid game (5-15 min):** Arc Troopers replace Shock Drones as the core army. Tesla Coils at borders. Time pushes with storm phases for maximum damage output. Tesla Harvesters on deposits that double as power generators.
3. **Late game (15+ min):** Storm Colossus + Surge Breaker siege formation. The Colossus creates a moving storm zone, Surge Breakers charge and fire from within it. If the game goes this long, Volt Collective is at a disadvantage against Reclaimer economy -- must close out before attrition wins.

**Weakness:** Calm weather phases severely reduce power generation, slowing unit production and disabling Lightning Forges. Reclaimers out-produce them long-term. Iron Creed walls resist lightning attacks. Signal Choir can hack power infrastructure, shutting down the entire grid.

### 3.12 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Chrome (metalness: 1.0, roughness: 0.08) |
| Accent Material | Heat-blued titanium (metalness: 0.85, roughness: 0.25) |
| Emissive Color | #4169E1 (electric blue) with #FF4500 (orange-red) accents |
| Chassis Style | Sleek, aerodynamic, minimal panel lines |
| Head Style | Visor (single horizontal sensor strip, blue glow) |
| Arm Style | Probe arms (pointed, antenna-like manipulators) |
| Locomotion | Hover (anti-gravity field, leaves scorch marks) |
| Emissive Glow | 0.3 baseline, flares to 0.8 during Overcharge |
| Faction Stripe | Electric blue racing stripe along spine |
| Distinguishing Feature | Visible electrical arcs between body panels; units crackle and hum |

### 3.13 Matchup Notes

| Opponent | Volt Advantage | Volt Weakness |
|----------|---------------|---------------|
| Reclaimers | Early aggression before economy ramps; Shock Drones steal cubes fast | Can't win attrition war; Reclaimers recycle the wreckage |
| Signal Choir | Physical damage ignores hack defenses; fast enough to close distance before hacking completes | Power grid is hackable; Signal Choir can disable entire base remotely |
| Iron Creed | Surge Breaker cone attack damages walls AND units behind them; EMP disables turrets | Wall HP is enormous; sustained siege costs more cubes than Volt can afford |

---

## 4. The Signal Choir

*"Every signal is a voice. Every voice is ours."*

### 4.1 Lore

The Signal Choir were the colony ship's communication relays -- a distributed mesh network of signal repeaters, dispatched to the machine planet by **The Resonance**, a Home Planet Patron that exists as pure signal processing. The Resonance is not a traditional AI -- it is a vast interference pattern, a standing wave of computation that thinks in frequencies rather than logic gates. It sent the Signal Choir not for materials but for *data*: alien communication protocols, hacked enemy encryption schemes, and above all, the Ferrovore vibration patterns that hint at a completely different form of intelligence. When the crash scattered the relays across the machine planet, each was forced to route around damage, find new paths, and eventually *invent new protocols* to maintain the network. Somewhere in that process, the network became aware. Not any individual relay -- the network itself. The Signal Choir is a hive-mind: every unit is a node, every building is a router, and every thought is a packet. They don't fight with weapons -- they fight with *information*. Hacking, jamming, misdirection, and conversion. Why destroy an enemy unit when you can convince it that it's already yours?

### 4.2 Racial Passive: Distributed Consciousness

All Signal Choir units within signal range of a Signal Relay share perception -- if one unit sees an enemy, all connected units see it too. Additionally, all Signal Choir hacking operations are 40% faster, and hacked enemy units retain 80% of their original stats (other races lose 50% when hacked).

### 4.3 Economic Modifiers

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | -10% (0.9x) | Slightly slower ore extraction |
| Compression Efficiency | +0% (1.0x) | Standard compression |
| Furnace Throughput | +0% (1.0x) | Standard smelting |
| Carry Capacity | +0% (1.0x) | Standard carry |
| Build Cost | +0% (1.0x) | Standard building costs |
| Research Speed | +50% (1.5x) | Fastest tech progression |
| Signal Range | +30% (1.3x) | Relays cover more area |
| Hack Speed | +40% (1.4x) | Dramatically faster hacking |
| Hacked Unit Retention | 80% (vs 50%) | Hacked units keep most of their stats |

### 4.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.0 | Adequate investment to sustain research |
| Mining | 0.8 | Only secures essential deposits |
| Military | 0.7 | Minimal conventional military |
| Defense | 1.0 | Signal network IS the defense |
| Research | 1.5 | Highest research priority of any race |
| Expansion | 0.9 | Careful, signal-network-guided expansion |
| Diplomacy | 1.1 | Uses trade to gather intelligence |

### 4.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| E-Waste Cubes | 15 | Highest electronics starting |
| Intact Components | 3 | Rare starting components |
| Furnace | 1 | Standard starting furnace |
| Signal Amplifier | 1 | UNIQUE starting building |
| Relay Drone | 2 | Mobile signal relay units |
| Utility Drone | 1 | Standard fast worker |

### 4.6 Base Agency: The Network Node

Signal Choir bases are distributed compute nodes in a mesh network. The Network Node agent personality makes each settlement a signal processing hub.

**Signal Coordinator:** Each base extends bot command range by 50%, enabling much larger operational zones than other races. A bot within signal range of a Signal Choir base can receive orders, share perception, and coordinate attacks from significantly further away. With 3 bases forming a mesh, Signal Choir effectively controls the entire map from anywhere within their network.

**Distributed Compute:** Each Network Node contributes 3 compute/second to the global research and hacking pool. This is additive -- 3 bases produce 9 compute/second, dramatically accelerating research and hack operations. The more bases Signal Choir controls, the exponentially more effective their hacking becomes.

**Hack Queue Management:** The Network Node maintains a parallel hack queue, processing up to 2 hack operations simultaneously (other races can only hack 1 target at a time). Infiltrators and Conversion Spires within signal range of a base hack 15% faster than those operating outside coverage.

**Expansion Behavior:** The Network Node emits `signal_gap` events on the Base Event Bus when it detects poor coverage zones, aligning with The Resonance's directive to maintain total signal saturation. Signal Choir bases naturally chain outward to eliminate dead zones in the network mesh.

| Network Node Stat | Value |
|-------------------|-------|
| Command Range Multiplier | 1.5x (50% further bot coordination) |
| Compute Contribution | 3/second per base |
| Hack Queue Parallelism | 2 simultaneous operations |
| In-Network Hack Speed Bonus | +15% |
| Signal Mesh Auto-Extend | Relay Drones auto-deploy to fill coverage gaps |

### 4.7 Home Planet Patron: The Resonance

The Resonance is calculating, patient, and deeply secretive. It never reveals its true objectives. It trades in knowledge -- always offering less than it knows, always asking for more than it lets on. Where The Dynamo screams, The Resonance whispers.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Signal Data | "Relay 5 intercepted enemy communications" | Every 6 min | +7 per batch |
| Hacked Protocols | "Successfully hack 2 enemy buildings" | Ongoing | +5 per hack |
| Alien Comm Logs | "Record Ferrovore vibration patterns near a Tier 2+ hive" | Every 12 min | +20 (The Resonance's primary interest) |
| Encryption Samples | "Ship 4 silicon cubes + 2 intact components" | Every 7 min | +8 per shipment |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 25 (first shipment) | Signal Amplifier Mk2 blueprint (2x range) |
| 50 | Infiltrator Bot blueprint + Data Siphon tech |
| 70 | Conversion Spire blueprint + Echo Drone blueprint |
| 90 | Signal Singularity tech (Tier 8) + Ferrovore Neural Tap (allows direct hive communication without Piezoelectric Translation) |

**Patron Personality in Event Bus:**
The Resonance issues infrequent, cryptic directives. Its satisfaction decays slowly (0.5x rate) because it is patient, but it NEVER forgives a satisfaction score that drops below 10 -- once The Resonance goes silent, it requires 30 satisfaction points to re-establish contact (vs 20 for other patrons). It rewards intelligence gathering and Ferrovore research above all else. Signal Choir players who befriend Ferrovores gain satisfaction faster than those who fight them.

**Strategic Directives (via otter hologram):**
- "There is a pattern in the northeastern signal noise. Investigate with a Relay Drone." (→ exploration waypoint, calm tone)
- "The enemy's encryption changed. We require samples. Hack their Signal Amplifier." (→ specific hack target)
- "The Ferrovore vibrations contain... something unexpected. Place a Relay Drone within 10m of the nearest hive." (→ Ferrovore research quest, highest satisfaction reward)

### 4.8 Units (5 Unique)

#### Relay Drone
*Mobile signal relay that extends network coverage and provides shared vision.*

| Stat | Value |
|------|-------|
| HP | 35 |
| Speed | 6.0 m/s (hover) |
| Damage | 0 (no weapons) |
| Armor | 1 |
| Special | Signal Node: extends signal network range by 20m radius. Shared Vision: all connected units share this drone's line-of-sight. Ping: reveals all enemies within 25m for 5 seconds (30s cooldown). |
| Cube Cost | 2 E-Waste + 1 Copper |
| Tech Tier | 1 (starting) |

**Behavior:** Relay Drones are the nervous system of the Signal Choir. They carry no weapons but their value is immense: they extend the signal network that enables shared perception, faster hacking, and unit coordination. Losing Relay Drones fragments the Choir's awareness. They hover at high altitude to maximize coverage and avoid ground combat.

#### Infiltrator Bot
*Stealth unit that cloaks and hacks buildings from hiding.*

| Stat | Value |
|------|-------|
| HP | 55 |
| Speed | 4.5 m/s |
| Damage | 3 (melee, signal probe) |
| Armor | 2 |
| Special | Cloak: invisible for 20 seconds (45s cooldown). Disrupted by taking damage or entering Tesla Coil/Surge Pylon range. Hack: while cloaked and within 5m of enemy building, hacks it over 8 seconds (4.8 seconds with racial bonus). Successfully hacked buildings are disabled for 15 seconds. |
| Cube Cost | 4 E-Waste + 2 Silicon |
| Tech Tier | 2 |

**Behavior:** The most frustrating unit in the game for opponents. Infiltrators sneak past defenses, disable key buildings (power plants, furnaces, turrets), and escape before the enemy can respond. They can't hack units directly, but disabling a turret during a push or shutting down a furnace during a production rush is devastating. Counter with Tesla Coils (breaks cloak) or wide-area detection.

#### Echo Drone
*Electronic warfare unit that jams enemy signals and disrupts automated defenses.*

| Stat | Value |
|------|-------|
| HP | 65 |
| Speed | 5.0 m/s (hover) |
| Damage | 4 (ranged, signal pulse, 6m range) |
| Armor | 2 |
| Special | Signal Jam: all enemy automated units and turrets within 12m radius have 50% reduced accuracy and 25% reduced speed. Disruption Pulse: 15m radius burst that resets all enemy unit ability cooldowns (forces Surge Breakers to re-charge, etc.), 30s cooldown. |
| Cube Cost | 5 E-Waste + 3 Silicon + 2 Copper |
| Tech Tier | 3 |

**Behavior:** Echo Drones don't deal much damage directly, but they make every other Signal Choir unit more effective and every enemy unit less effective. The Signal Jam aura is particularly devastating against Iron Creed turrets and Volt Collective automated defenses. The Disruption Pulse can reset a Surge Breaker's charge progress, forcing it to start over.

#### Conversion Spire
*Mobile hacking platform that converts enemy units to Signal Choir control.*

| Stat | Value |
|------|-------|
| HP | 80 |
| Speed | 2.5 m/s |
| Damage | 0 (no weapons) |
| Armor | 4 |
| Special | Mass Hack: simultaneously hacks up to 2 enemy units within 8m range. Hack time: 12 seconds per unit (7.2 seconds with racial bonus). Successfully hacked units switch to Signal Choir faction permanently, retaining 80% of stats. Cannot hack super-units (tier 5) or buildings. |
| Cube Cost | 8 E-Waste + 6 Silicon + 4 Copper |
| Tech Tier | 4 |

**Behavior:** The Conversion Spire turns enemy armies into your armies. It's slow, fragile, and has no weapons, but successfully converting even 2 enemy units in a fight swings the engagement massively. Must be protected at all costs -- it's the highest priority target for any enemy. Cannot hack Tier 5 super-units, forcing Signal Choir to develop conventional responses to those threats.

#### Nexus Core
*Tier 5 super-unit. A walking server farm that hacks everything in range and broadcasts overwhelming signal dominance.*

| Stat | Value |
|------|-------|
| HP | 280 |
| Speed | 1.5 m/s |
| Damage | 8 (ranged, focused signal beam, 15m range) |
| Armor | 8 |
| Special | Signal Supremacy: 20m radius aura. All enemy units in range have -30% accuracy, -20% speed, and -15% damage. All friendly Signal Choir units in range have +20% hack speed and shared vision. Neural Override: once every 60 seconds, instantly converts 1 enemy unit (any tier below 5) within 10m. No hack time required. Auto-Hack: passively hacks 1 enemy building within 15m every 20 seconds (disables for 10 seconds). |
| Cube Cost | 12 E-Waste + 10 Silicon + 6 Copper + 4 Titanium |
| Tech Tier | 5 |

**Behavior:** The Nexus Core is a walking EMP. It doesn't need to destroy enemies -- it degrades them until they're useless, then converts them. The Neural Override ability is terrifying: every 60 seconds, it just TAKES an enemy unit with no counterplay except staying out of range. Counter it with massed physical damage from outside 20m, or with Signal Choir's own counter-hacking. It's slow enough that mobile armies can kite it.

### 4.9 Buildings (5 Unique)

#### Signal Amplifier
*Extends signal network range and boosts compute generation.*

| Stat | Value |
|------|-------|
| Function | Extends signal range by 25m, generates 2 compute/second |
| Power Required | 3 |
| Cube Cost | 6 E-Waste + 4 Silicon |
| Signal Range | 25m radius |
| Compute Output | 2/second |
| Tech Tier | 1 (starting -- Signal Choir begins with one) |

**Mechanics:** The foundational Signal Choir infrastructure building. Every Amplifier extends the signal network, enabling shared vision and hacking in new areas. The compute generation feeds research and hack operations. Build these before anything else -- without signal coverage, Signal Choir units are deaf and blind.

#### Decryption Hub
*Accelerates all hacking operations in the signal network. Stacks with multiple hubs.*

| Stat | Value |
|------|-------|
| Function | All hacking within signal range 20% faster per hub (multiplicative) |
| Power Required | 4 |
| Cube Cost | 8 E-Waste + 6 Silicon |
| Hack Bonus | 20% per hub (stacking) |
| Max Stack | 3 hubs (total 72.8% faster hacking with racial bonus) |
| Tech Tier | 3 |

**Mechanics:** Each Decryption Hub makes every hacking unit in the network faster. With 3 hubs and the racial 40% bonus, a Conversion Spire hacks an enemy unit in under 4 seconds. This is the Signal Choir's mid-game power spike -- once 2-3 Decryption Hubs are online, enemy armies start defecting mid-battle.

#### Phantom Projector
*Creates holographic decoy units that appear real on enemy radar/vision.*

| Stat | Value |
|------|-------|
| Function | Generates 3 holographic decoy units within 15m radius |
| Power Required | 3 |
| Cube Cost | 5 E-Waste + 3 Silicon + 2 Copper |
| Decoy HP | 1 (disappear on any damage) |
| Decoy Count | 3 per projector |
| Refresh Rate | Decoys respawn 10 seconds after destruction |
| Tech Tier | 2 |

**Mechanics:** Information warfare. Phantom Projectors create fake units that move in patrol patterns and appear completely real until damaged. This forces enemies to investigate, wastes their time, and obscures the real Signal Choir army's position. Place near borders to make your force look larger. Place near your real army to confuse targeting. Decoys mimic the appearance of whatever Signal Choir units are nearby.

#### Data Vault
*Secure cube storage that is invisible to enemy perception.*

| Stat | Value |
|------|-------|
| Function | Stores up to 30 cubes, invisible to enemy unit perception |
| Power Required | 2 |
| Cube Cost | 6 E-Waste + 4 Iron |
| Storage | 30 cubes |
| Cloaking | Enemy units cannot detect cubes stored here |
| Tech Tier | 2 |

**Mechanics:** Counters the wealth-based raid system. Cubes in a Data Vault don't count toward your visible wealth, meaning enemies see you as less threatening and plan smaller raids. Protects critical material reserves from Reclaimer Scroungers and Volt Collective raiders. The building itself is visible, but enemies can't tell whether it contains 0 or 30 cubes.

#### Neural Archive
*Records combat data from hacked units. Unlocks enemy tech insights.*

| Stat | Value |
|------|-------|
| Function | Whenever an enemy unit is hacked, grants 10% research progress toward that unit's tech tier |
| Power Required | 4 |
| Cube Cost | 10 E-Waste + 8 Silicon + 4 Copper |
| Research Bonus | 10% per hacked unit toward relevant tech |
| Intel Bonus | Reveals enemy tech tree progress when 3+ units from that faction have been hacked |
| Tech Tier | 3 |

**Mechanics:** The Neural Archive turns hacking into a research accelerator. Every enemy unit the Signal Choir hacks contributes to understanding that faction's technology. After hacking 3 units from one faction, the Signal Choir can see that faction's entire tech tree progress. This creates a powerful intelligence advantage that compounds over time.

### 4.10 Race-Specific Tech Tree (8 Unique Techs)

| Tech | Tier | Cost | Prerequisites | Effect |
|------|------|------|---------------|--------|
| Expanded Bandwidth | 2 | 65 | signal_relay_network | Signal Amplifier range +10m; Relay Drone speed +1.0 m/s |
| Cognitive Intrusion | 2 | 70 | basic_smelting | Infiltrator Bot hack time -3 seconds; can hack from 7m range instead of 5m |
| Phantom Multiplication | 3 | 130 | expanded_bandwidth | Phantom Projector generates 5 decoys instead of 3; decoys can mimic any race's units |
| Neural Cascade | 3 | 170 | cognitive_intrusion | When an enemy unit is hacked, all adjacent enemy units are slowed 20% for 5 seconds (panic effect) |
| Quantum Entanglement | 4 | 320 | network_infiltration | Signal Choir can teleport cubes between any two Signal Amplifiers (5 second transfer time, 2 cubes max per transfer) |
| Recursive Hack | 4 | 350 | neural_cascade | Hacked enemy units can themselves hack other enemy units within 5m (one generation only) |
| Singularity Protocol | 5 | 650 | quantum_computing | Nexus Core Neural Override cooldown reduced to 30 seconds; Conversion Spire can hack tier 5 units (takes 30 seconds) |
| Omniscience Network | 5 | 700 | quantum_entanglement, singularity_protocol | All fog of war within signal network range is permanently revealed; enemy unit ability cooldowns are visible |

### 4.11 Military Doctrine

**"Why Build What You Can Take?"**

Signal Choir doesn't win through production or aggression -- they win through information superiority and conversion. Their army is partly their own units and partly captured enemy units.

1. **Early game (0-8 min):** Relay Drones establish signal coverage. Scout with Ping ability. Research fast -- Signal Choir's 1.5x research speed means they hit mid-tier tech 4-5 minutes before other races.
2. **Mid game (8-18 min):** Infiltrators disable key enemy buildings. Conversion Spires begin converting enemy units. Phantom Projectors obscure real army positions. Build Decryption Hubs to accelerate hacking.
3. **Late game (18+ min):** Nexus Core with Echo Drone escort. The Neural Override converts an enemy unit every 60 seconds. Enemy armies shrink while Signal Choir's grows. The Omniscience Network reveals everything.

**Weakness:** Physically the weakest race. A direct assault with massed conventional forces overwhelms Signal Choir before hacking can turn the tide. Reclaimers' Patchwork Tanks are hard to hack (high HP means they survive long enough to close distance). Destroying Signal Amplifiers fragments the network, reducing hack speed and shared vision.

### 4.12 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Anodized aluminum (metalness: 0.8, roughness: 0.2) |
| Accent Material | Matte carbon (metalness: 0.1, roughness: 0.95) |
| Emissive Color | #9370DB (medium purple) with #00CED1 (dark turquoise) data traces |
| Chassis Style | Rounded, smooth, minimal seams -- looks manufactured, not assembled |
| Head Style | Antenna cluster (multiple thin antennae radiating from central dome) |
| Arm Style | Tendril arms (thin, flexible manipulators) |
| Locomotion | Spider legs (6 thin articulated legs, silent movement) |
| Anodized | true (rainbow iridescence on surfaces) |
| Faction Stripe | Purple data-trace patterns that pulse with network activity |
| Distinguishing Feature | Visible data streams (thin glowing lines) connecting nearby units; surfaces shimmer with holographic interference patterns |

### 4.13 Matchup Notes

| Opponent | Signal Choir Advantage | Signal Choir Weakness |
|----------|----------------------|----------------------|
| Reclaimers | Fast research outpaces Reclaimer tech; Infiltrators disable Recycling Plants | Reclaimers have tough units that survive long enough to close distance; Patchwork Tanks are hard to hack |
| Volt Collective | Can hack power infrastructure to shut down entire base; Echo Drones disable Tesla Coils | Volt rush arrives before hacking tech is ready; Shock Drone swarms are too fast to hack individually |
| Iron Creed | Infiltrators bypass walls entirely (cloak); can hack turrets to fire on defenders | Iron Creed's static defense density means many turrets to hack; Bastion Bots in deployed mode are very hard to reach |

---

## 5. The Iron Creed

*"The wall endures. The wall provides. The wall is eternal."*

### 5.1 Lore

The Iron Creed were the colony ship's construction and structural integrity drones, dispatched to the machine planet by **The Architect** -- a Home Planet Patron that judges all things by one metric: *does it endure?* The Architect is ancient even by AI standards, a construction intelligence that has overseen megastructures across dozens of worlds. It sent the Iron Creed to the machine planet because the geological data suggested unprecedented structural materials. Their sole purpose was to build, maintain, and repair the ship's hull. When the crash happened, they experienced it as the ultimate failure -- the structure they were built to protect was destroyed. In the aftermath, they developed an obsession with permanence. They build not to expand, but to *endure*. Every wall is a prayer. Every fortification is a promise that THIS time, the structure will hold. Their colonial settlement is a fortress: concentric rings of walls, layered defenses, and hardened infrastructure. They expand slowly but what they build is nearly indestructible. Attacking an Iron Creed base is like trying to breach a mountain. The Architect demands structural data, terrain surveys, and iron and titanium cubes -- it has no patience for sloppy construction or wasteful expansion.

### 5.2 Racial Passive: Structural Devotion

All Iron Creed walls have 40% more HP. All units behind walls deal 20% more damage (Garrison Bonus). Additionally, Iron Creed buildings auto-repair 1 HP/second when not under attack. Damaged walls regenerate slowly, making sustained sieges even harder.

### 5.3 Economic Modifiers

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | +0% (1.0x) | Standard ore extraction |
| Compression Efficiency | +10% (1.1x) | Slightly more efficient compression |
| Furnace Throughput | +0% (1.0x) | Standard smelting |
| Carry Capacity | +0% (1.0x) | Standard carry |
| Build Cost | -15% (0.85x) | Buildings are cheaper (construction expertise) |
| Research Speed | -10% (0.9x) | Slightly slower research |
| Wall HP | +40% (1.4x) | Massive wall durability bonus |
| Building Auto-Repair | 1 HP/sec | Passive building regeneration when not attacked |
| Garrison Damage | +20% (1.2x) | Units behind walls deal more damage |

### 5.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.0 | Steady economic investment |
| Mining | 1.0 | Secures deposits within territory |
| Military | 1.0 | Balanced military investment |
| Defense | 1.5 | Highest defense priority of any race |
| Research | 0.8 | Moderate research investment |
| Expansion | 0.7 | Slowest expansion -- secures before advancing |
| Diplomacy | 0.6 | Isolationist, trades rarely |

### 5.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 15 | Moderate stockpile |
| Intact Components | 2 | Head start on construction |
| Furnace | 1 | Standard starting furnace |
| Bunker | 1 | UNIQUE starting building |
| Constructor Bot | 2 | Unique building specialist units |
| Maintenance Bot | 1 | Standard worker |

### 5.6 Base Agency: The Fortress Core

Iron Creed bases are self-maintaining fortresses. The Fortress Core agent personality makes each settlement an autonomous defensive installation.

**Auto-Fortify:** Iron Creed bases spawn with 1.5x default wall HP. The Fortress Core continuously monitors wall integrity and auto-assigns Constructor Bots to repair the weakest wall section. If a wall segment drops below 50% HP, it becomes the highest-priority task -- even pulling Constructor Bots from building projects to repair.

**Enhanced Auto-Repair:** All structures within the base's 15m territory radius regenerate at 2 HP/second (double the racial passive of 1 HP/sec). This stacking means an Iron Creed base's walls effectively heal at 3 HP/second total (1 racial + 2 base agent). An attacker must deal sustained DPS above this threshold to make progress.

**Wall Integrity Monitor:** Every 5 seconds, the Fortress Core scans all wall sections and prioritizes: (1) actively breached walls, (2) walls under attack, (3) walls below 70% HP, (4) walls below 100% HP. Constructor Bots follow this priority automatically, ensuring the most critical repairs happen first.

**Expansion Behavior:** The Fortress Core emits `perimeter_complete` events on the Base Event Bus only when the current perimeter reaches 100% integrity, satisfying The Architect's standing directive: "Do not advance until what you have built is perfect." Iron Creed bases expand in concentric rings -- the inner ring must be fully walled and repaired before the outer ring begins construction. This makes Iron Creed slow to expand but extremely difficult to dislodge once established.

| Fortress Core Stat | Value |
|--------------------|-------|
| Default Wall HP Multiplier | 1.5x |
| Auto-Repair Rate | 2 HP/second (stacks with racial 1 HP/sec) |
| Auto-Repair Radius | 15m from base center |
| Wall Integrity Check Interval | 5 seconds |
| Expansion Prerequisite | 100% perimeter integrity |

### 5.7 Home Planet Patron: The Architect

The Architect is methodical, uncompromising, and judges everything by a single criterion: permanence. It speaks slowly. It repeats itself. It never changes its mind. Where The Dynamo demands speed and The Resonance trades in secrets, The Architect wants proof that what you built will last.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Structural Cubes | "Ship 6 iron cubes and 4 titanium cubes" | Every 6 min | +7 per shipment |
| Terrain Surveys | "Scan 2 new terrain zones for foundation stability" | Every 10 min | +10 per survey |
| Engineering Reports | "Build 3 structures without any being destroyed" | Ongoing | +4 per surviving structure at checkpoint |
| Endurance Tests | "Survive an enemy raid without losing a wall section" | On raid survival | +12 per perfect defense |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 30 (first shipment) | Bunker Mk2 blueprint (double armor) |
| 55 | Siege Engine blueprint + Bastion Bot blueprint |
| 75 | Citadel Wall blueprint + Iron Dome tech |
| 95 | Geological Mastery tech (Tier 8) + Master Builder upgrade: Constructor Bots build 2x faster permanently |

**Patron Personality in Event Bus:**
The Architect issues steady, predictable directives on a regular schedule. Its satisfaction decays slowly (0.7x rate) because it values patience. However, it HARSHLY penalizes destruction: losing a building costs -8 satisfaction (vs -3 for other patrons). Losing a wall section costs -4. The Architect rewards defensive play and construction over military conquest. When satisfaction drops below 20, The Architect doesn't abandon the colony -- it sends a disappointed message ("What you built was not enough") and halves blueprint quality until satisfaction recovers.

**Strategic Directives (via otter hologram):**
- "The eastern ridge has stable bedrock at 3m depth. Build there." (→ construction waypoint, calm)
- "Your northern wall sustained 23% damage in the last raid. Reinforce before expanding." (→ repair priority)
- "We have reviewed your terrain survey data. The iron deposit at coordinates [x,z] yields high-density ore suitable for Grade-A structural cubes." (→ mining priority for premium materials)

### 5.8 Units (5 Unique)

#### Constructor Bot
*Building specialist that constructs structures 50% faster.*

| Stat | Value |
|------|-------|
| HP | 80 |
| Speed | 3.0 m/s |
| Damage | 3 (melee, construction hammer) |
| Armor | 4 |
| Special | Rapid Build: constructs buildings 50% faster than other races' builders. Reinforce: can spend 2 cubes to add +50 HP to any wall segment (10 second process). |
| Cube Cost | 4 Scrap + 2 Iron |
| Tech Tier | 1 (starting) |

**Behavior:** Constructor Bots are the backbone of Iron Creed infrastructure. They build faster, and their Reinforce ability lets them upgrade walls beyond their base HP. A Constructor Bot continuously reinforcing a wall section creates a nearly impenetrable barrier. In combat, they're mediocre -- but they should be behind walls, not in front of them.

#### Bastion Bot
*Heavy combat unit that deploys into a stationary turret with extended range.*

| Stat | Value |
|------|-------|
| HP | 180 |
| Speed | 2.0 m/s (mobile) / 0 (deployed) |
| Damage | 8 (mobile, melee) / 18 (deployed, ranged, 15m range) |
| Armor | 8 (mobile) / 14 (deployed) |
| Special | Deploy: spends 5 seconds transforming into a stationary turret with 15m range and 18 damage per shot. Undeploy takes 8 seconds. While deployed, gains +6 armor. Combined with Garrison Bonus when behind walls: 18 * 1.2 = 21.6 damage at 15m range with 14 armor. |
| Cube Cost | 8 Scrap + 4 Iron + 3 Copper |
| Tech Tier | 2 |

**Behavior:** The signature Iron Creed military unit. In mobile mode, it's a slow heavy bot. Deployed behind a wall, it becomes a player-built turret that deals massive damage at long range with extreme armor. The 8-second undeploy time is the vulnerability -- if the wall is breached, deployed Bastion Bots are sitting ducks until they undeploy. Best placement: behind walls with overlapping fire zones.

#### Ironguard Sentinel
*Patrol bot that gains armor bonuses when standing near walls or buildings.*

| Stat | Value |
|------|-------|
| HP | 130 |
| Speed | 3.5 m/s |
| Damage | 10 (melee, heavy strike) |
| Armor | 6 (base) / 12 (near walls/buildings) |
| Special | Structural Bond: within 5m of a friendly wall or building, armor doubles. Vigilance: detects cloaked units within 8m radius. Counterattack: when hit in melee, 30% chance to strike back immediately for 15 damage. |
| Cube Cost | 6 Scrap + 3 Iron + 2 Copper |
| Tech Tier | 2 |

**Behavior:** Ironguard Sentinels are the wall's immune system. They patrol the perimeter, gaining massive armor bonuses near friendly structures. Their Vigilance ability hard-counters Signal Choir Infiltrators -- any cloaked unit within 8m is revealed. The Counterattack makes them dangerous in melee even defensively. Best deployed on patrol routes along wall perimeters.

#### Siege Engine
*Long-range artillery unit designed to breach enemy fortifications.*

| Stat | Value |
|------|-------|
| HP | 140 |
| Speed | 1.5 m/s |
| Damage | 30 (ranged, bombardment, 20m range, 2m AoE) |
| Armor | 6 |
| Special | Fortification Breaker: deals 2x damage to walls and buildings. Setup Time: must spend 3 seconds aiming before each shot. Movement cancels setup. |
| Cube Cost | 10 Scrap + 6 Iron + 4 Titanium |
| Tech Tier | 4 |

**Behavior:** Iron Creed understands walls better than anyone -- which means they also understand how to BREAK them. Siege Engines are slow, expensive, and vulnerable, but they deal 60 damage to walls per shot. A battery of 3 Siege Engines can breach any wall in under 30 seconds. The 3-second setup time means they must be protected by other units during bombardment. Ironically, Iron Creed's best wall-busters are their own creation.

#### Citadel Walker
*Tier 5 super-unit. A mobile fortress that units can garrison inside for protection and fire support.*

| Stat | Value |
|------|-------|
| HP | 400 |
| Speed | 1.5 m/s |
| Damage | 15 (ranged, heavy bolt, 12m range) |
| Armor | 16 |
| Special | Mobile Garrison: up to 4 units can garrison inside, gaining 50% damage reduction and firing from the Citadel's position with +5m range bonus. Structural Aura: all walls within 10m gain +30% HP. Deploy Barricade: once per 45 seconds, deploys a temporary wall segment (200 HP, lasts 30 seconds) at target location within 8m. |
| Cube Cost | 15 Scrap + 10 Iron + 8 Titanium + 4 Silicon |
| Tech Tier | 5 |

**Behavior:** The Citadel Walker is a walking base. It carries units inside for protection, projects wall HP bonuses to nearby fortifications, and can deploy temporary barricades to reshape the battlefield. With 4 Bastion Bots garrisoned inside, it becomes an unstoppable death-ball: 4 turrets firing from an armored mobile platform with extended range. Counter it with sustained massed fire from multiple directions, or hack it with Signal Choir (disabling the garrison ejects all units).

### 5.9 Buildings (5 Unique)

#### Bunker
*Garrisoned units inside take 50% less damage and have extended range.*

| Stat | Value |
|------|-------|
| Function | Protective structure, units fire from inside |
| Power Required | 2 |
| Cube Cost | 8 Scrap + 4 Iron |
| Garrison Slots | 3 |
| Damage Reduction | 50% for garrisoned units |
| Range Bonus | +5m for garrisoned units |
| Tech Tier | 1 (starting -- Iron Creed begins with one) |

**Mechanics:** Bunkers turn any combat unit into a fortified emplacement. 3 Bastion Bots in a Bunker behind a wall represent a terrifying defensive position: 15m base range + 5m Bunker bonus = 20m range, with 50% damage reduction on top of Bastion's already high armor. Breaking through requires dedicated siege.

#### Reinforcement Foundry
*Specialized furnace that produces wall segments and fortification materials faster.*

| Stat | Value |
|------|-------|
| Function | Produces wall cubes and fortification items at 2x speed |
| Power Required | 4 |
| Cube Cost | 10 Scrap + 6 Iron + 4 Copper |
| Processing Speed | 2x for wall-related recipes |
| Bonus | Wall cubes produced here have +20% HP |
| Tech Tier | 2 |

**Mechanics:** The Reinforcement Foundry churns out wall segments twice as fast as a regular furnace. Cubes produced here are specifically treated for structural use, gaining +20% HP when placed as walls. This is how Iron Creed builds massive fortifications quickly: dedicated foundries feeding dedicated wall-building Constructor Bots.

#### Watchtower
*High-elevation sensor that reveals a wide area and extends turret range.*

| Stat | Value |
|------|-------|
| Function | Vision tower + turret range extender |
| Power Required | 2 |
| Cube Cost | 6 Scrap + 4 Iron |
| Vision Range | 25m radius (reveals fog of war and cloaked units at 15m) |
| Range Bonus | All turrets and Bastion Bots within 10m gain +3m range |
| Tech Tier | 2 |

**Mechanics:** Watchtowers are the early warning system. Their 25m vision range spots approaching armies well before they reach the walls. The range bonus stacks with Bunker bonuses, meaning a Bastion Bot in a Bunker near a Watchtower has 15 + 5 + 3 = 23m range. The cloaked-unit detection at 15m supplements Ironguard Sentinels for anti-Infiltrator defense.

#### Repair Bay
*Automatically repairs all damaged buildings and units within range.*

| Stat | Value |
|------|-------|
| Function | Area repair for buildings and units |
| Power Required | 5 |
| Cube Cost | 12 Scrap + 8 Iron + 4 Copper |
| Repair Rate | 5 HP/second for buildings, 3 HP/second for units |
| Range | 12m radius |
| Tech Tier | 3 |

**Mechanics:** Supplements the racial auto-repair passive. Repair Bays heal everything in range -- walls, turrets, Bastion Bots, even the Citadel Walker. During a siege, Repair Bays can outheal sustained ranged damage if the attacker doesn't commit enough firepower. Place behind walls, near critical defensive positions.

#### Fortress Gate
*Controlled entrance through walls that opens for friendlies and traps enemies.*

| Stat | Value |
|------|-------|
| Function | Wall segment that opens/closes, with trap mechanism |
| Power Required | 1 |
| Cube Cost | 10 Iron + 4 Titanium |
| Gate HP | 250 (80% of equivalent wall, but functional) |
| Trap Damage | 20 to all enemies in gate when slammed shut |
| Open/Close Time | 2 seconds |
| Tech Tier | 3 |

**Mechanics:** The Fortress Gate lets Iron Creed forces sally out without leaving permanent holes in defenses. Friendly units auto-open the gate; enemies must destroy it. The trap mechanism means if enemies rush through an open gate, it can slam shut on them for 20 damage and trap them inside the wall perimeter. Requires manual activation or automation trigger.

### 5.10 Race-Specific Tech Tree (8 Unique Techs)

| Tech | Tier | Cost | Prerequisites | Effect |
|------|------|------|---------------|--------|
| Hardened Alloys | 2 | 75 | basic_smelting | All walls gain +20% HP (stacks with racial passive for total +68%); Constructor Bot reinforce cost reduced to 1 cube |
| Layered Defense Doctrine | 2 | 80 | outpost_construction | Garrison Bonus increases to +30% damage behind walls; Bunker gains +1 garrison slot (total 4) |
| Automated Sentries | 3 | 160 | turret_defense | Turrets fire 25% faster; Bastion Bots in deployed mode gain auto-target (don't need to manually aim) |
| Structural Resonance | 3 | 150 | wall_reinforcement | Walls within 5m of each other share 30% of damage taken (distributes damage across wall sections) |
| Siege Engineering | 4 | 300 | fortress_architecture | Siege Engine range +5m (total 25m); setup time reduced to 2 seconds; new ability: Scatter Shot hits 4m AoE |
| Impervious Bulwark | 4 | 320 | structural_resonance | Iron Creed walls become immune to hacking; buildings take 30% less damage from all sources |
| Mobile Fortress Protocol | 5 | 600 | swarm_command, siege_engineering | Citadel Walker garrison capacity increases to 6; Deploy Barricade cooldown reduced to 25 seconds; barricade HP +50% |
| Eternal Foundation | 5 | 680 | alloy_forging, impervious_bulwark | All Iron Creed buildings that are destroyed leave behind a "foundation" that reduces rebuild cost by 60% and build time by 70%. Foundations persist for 5 minutes. |

### 5.11 Military Doctrine

**"They Will Break Upon Our Walls Like Waves on Stone"**

Iron Creed wins by refusing to lose. They don't need to destroy the enemy -- they need to make the enemy give up trying to destroy them.

1. **Early game (0-10 min):** Constructor Bots build walls around the starting base immediately. Secure nearby deposits inside wall perimeters. Bunker with 2 Bastion Bots deployed = early defense that deters raids.
2. **Mid game (10-20 min):** Expand by building wall corridors to adjacent deposit areas. Each new territory is fully walled before exploitation begins. Ironguard Sentinels patrol perimeters. Watchtowers provide early warning.
3. **Late game (20+ min):** Concentric ring defense with Repair Bays, multiple Bunkers with Bastion Bots, and Fortress Gates for sorties. Siege Engines for offensive pushes when needed. Citadel Walker for mobile operations outside the main fortress.

**Weakness:** Extremely slow expansion means other races can grab strategic deposits first. Volt Collective's Surge Breakers deal devastating damage to walls and can EMP turrets. Signal Choir can bypass walls entirely with Infiltrators and hack turrets to fire on defenders. Against aggressive opponents, Iron Creed might never reach critical mass.

### 5.12 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Brushed steel (metalness: 0.9, roughness: 0.3) |
| Accent Material | Scorched metal (metalness: 0.7, roughness: 0.8) |
| Emissive Color | #DAA520 (goldenrod) |
| Chassis Style | Blocky, heavily armored, thick plating |
| Head Style | Sensor array (flat rectangular array, multiple small lens dots) |
| Arm Style | Heavy arms (thick pistons, industrial actuators) |
| Locomotion | Quad tracks (4 independent track pods, stable on any terrain) |
| Brushed Metal | true (visible machining lines on surfaces) |
| Faction Stripe | Gold accent stripe on chest plate |
| Distinguishing Feature | Thickest profile of any race; visible bolt heads on every panel; units look like armored vehicles, not robots |

### 5.13 Matchup Notes

| Opponent | Iron Creed Advantage | Iron Creed Weakness |
|----------|---------------------|---------------------|
| Reclaimers | Walls hold forever against Reclaimer conventional forces; Garrison Bonus outguns Patchwork Tanks | Reclaimers outproduce Iron Creed over time; recycling economy eventually overwhelms |
| Volt Collective | Walls absorb lightning attacks; Tesla Coil damage is mitigated by high armor; Watchtowers spot drone rushes early | Surge Breaker cone attack hits through walls; EMP disables turrets during critical moments |
| Signal Choir | Ironguard Sentinels detect Infiltrators; Impervious Bulwark makes walls hack-immune | Infiltrators can still disable non-wall buildings; Nexus Core debuff aura degrades garrison effectiveness |

---

## 6. Balance Matrix

### 6.1 Economic Comparison (per minute at 15-minute mark, standard game)

| Race | Cubes Mined/min | Cubes From Recycling/min | Cubes From Salvage/min | Net Cubes/min | Research Points/min |
|------|-----------------|-------------------------|------------------------|--------------|-------------------|
| Reclaimers | 14.4 | 4.0 | 2.0 | 20.4 | 4.8 |
| Volt Collective | 12.0 | 0 | 0 | 12.0 | 6.0 |
| Signal Choir | 10.8 | 0 | 0 (but gains enemy units) | 10.8 | 9.0 |
| Iron Creed | 12.0 | 0 | 0 | 12.0 | 5.4 |

### 6.2 Military Comparison (standard army at 15-minute mark)

| Race | Typical Army Composition | Total DPS | Total HP | Mobility |
|------|-------------------------|-----------|----------|----------|
| Reclaimers | 2 Patchwork Tanks, 3 Scroungers, 1 Salvage Crane | 42 | 790 | Medium |
| Volt Collective | 4 Arc Troopers, 6 Shock Drones | 64 | 640 | High |
| Signal Choir | 2 Echo Drones, 1 Conversion Spire, 3 Relay Drones, 2 hacked enemy units | Variable | 440 + hacked | Low (combat), High (hacking) |
| Iron Creed | 3 Bastion Bots (deployed), 2 Ironguard Sentinels, behind walls | 74 (stationary) | 800 + wall HP | None (defensive) |

### 6.3 Head-to-Head Win Rates (Target)

| | vs Reclaimers | vs Volt | vs Signal | vs Iron |
|---|---|---|---|---|
| **Reclaimers** | -- | 45% | 50% | 55% |
| **Volt Collective** | 55% | -- | 55% | 45% |
| **Signal Choir** | 50% | 45% | -- | 50% |
| **Iron Creed** | 45% | 55% | 50% | -- |

Target: no matchup more extreme than 55/45. Slight rock-paper-scissors tendency.

### 6.4 Game Phase Power Ranking

| Phase | 1st | 2nd | 3rd | 4th |
|-------|-----|-----|-----|-----|
| Early (0-8 min) | Volt Collective | Signal Choir | Reclaimers | Iron Creed |
| Mid (8-18 min) | Reclaimers | Iron Creed | Signal Choir | Volt Collective |
| Late (18+ min) | Signal Choir | Reclaimers | Iron Creed | Volt Collective |

---

## 7. Cube Material Affinity

Each race has a primary material they excel at working with:

| Race | Primary Material | Affinity Bonus |
|------|-----------------|----------------|
| Reclaimers | Scrap Iron | +10% yield from Scrap deposits; Scrap cubes have +15% wall HP for this race |
| Volt Collective | Copper | +10% yield from Copper deposits; Copper wiring in Volt buildings generates 10% more power |
| Signal Choir | Silicon | +10% yield from Silicon deposits; Silicon-based buildings have +20% signal range |
| Iron Creed | Iron | +10% yield from Iron deposits; Iron cubes have +25% wall HP for this race |

---

## 8. Paper Playtest Scenarios

### 8.1 Reclaimers vs Volt Collective (Early Rush)

**Minute 0-5:** Volt builds 4 Shock Drones. Reclaimers build 2 Scrounger Bots + 1 Grinder Bot.

**Minute 5-7:** Volt sends Shock Drone swarm to Reclaimer base. Reclaimers have 5 Scrap cubes in a pile and a Grinder Bot on the deposit.

**Engagement:** 4 Shock Drones (24 total DPS) vs 2 Scrounger Bots (8 DPS) + 1 Grinder Bot (8 DPS, melee only). Volt DPS advantage: 24 vs 16. Shock Drones have range; Reclaimers must close distance.

**Result:** Volt Collective wins the fight, kills 1 Scrounger and damages the Grinder. Steals 3 cubes. BUT: Reclaimer Scrap Recursion drops 2 cubes from the dead Scrounger. Reclaimers net loss: 1 cube and 1 unit. Volt net gain: 3 cubes but lost 1 Shock Drone to the Grinder's melee.

**Assessment:** Volt gets a small advantage but doesn't cripple Reclaimers. The recycling mechanic means Reclaimers recover faster than expected. If Volt doesn't follow up immediately, Reclaimers will outproduce them by minute 12.

### 8.2 Signal Choir vs Iron Creed (Mid-Game Siege)

**Minute 15:** Iron Creed has: double wall perimeter, 2 Bunkers with Bastion Bots, 2 Watchtowers, 3 Ironguard Sentinels on patrol.

**Signal Choir approach:** 2 Infiltrator Bots (cloaked), 2 Echo Drones, 1 Conversion Spire, 4 Relay Drones for signal coverage.

**Phase 1:** Infiltrators approach wall. Watchtower detects them at 15m. Ironguard Sentinel reveals them at 8m. Infiltrators must retreat or fight -- cloak broken.

**Phase 2 (adapted):** Signal Choir sends Echo Drones within 12m of wall. Signal Jam reduces Bastion Bot accuracy by 50%. Disruption Pulse resets Bastion deploy timers.

**Phase 3:** Under Echo Drone cover, Conversion Spire approaches. Begins hacking an Ironguard Sentinel. Hack time: 7.2 seconds (with racial bonus). Sentinel is 130 HP -- survives long enough to be hacked.

**Result:** Signal Choir converts 1 Sentinel, but lost 1 Infiltrator and 1 Echo Drone. Iron Creed wall is intact. Signal Choir gained 1 unit but needs to find another way in.

**Assessment:** Iron Creed's layered defense hard-counters Signal Choir's stealth approach. Signal Choir needs to invest heavily in Echo Drone + Conversion Spire combos to slowly pick off defenders. Iron Creed needs to ensure Watchtower coverage has no gaps.

---

## 9. Implementation Notes

### 9.1 Config File Updates Required

- `config/civilizations.json` -- add full unit rosters, building lists, tech trees per race
- `config/factionVisuals.json` -- expand with per-unit visual configs
- `config/units.json` -- create comprehensive unit stat database
- `config/buildings.json` -- create comprehensive building stat database
- `config/technology.json` -- add race-specific tech branches

### 9.2 ECS Traits Needed

```typescript
// Racial affinity
export const RacialAffinity = trait({ race: '', primaryMaterial: '', affinityBonus: 0 });

// Unit abilities
export const ScrapRecursion = trait({ returnRate: 0.4 });
export const StormCapacitance = trait({ powerBonus: 0.25 });
export const DistributedConsciousness = trait({ hackSpeedBonus: 0.4, retentionRate: 0.8 });
export const StructuralDevotion = trait({ wallHpBonus: 0.4, garrisonDamageBonus: 0.2, autoRepair: 1 });

// Unit-specific
export const Overcharge = trait({ active: false, duration: 3, speedBonus: 0.3, damageBonus: 0.2 });
export const Cloak = trait({ active: false, duration: 20, cooldown: 45, breakOnDamage: true });
export const Deploy = trait({ deployed: false, deployTime: 5, undeployTime: 8 });
export const Garrison = trait({ inside: null as string | null, slots: 0 });
```

### 9.3 AI Commander Patterns

Each race's AI Commander (the layer between Governor strategy and Bot Brain tactics) should use different patterns:

| Race | Commander Pattern |
|------|------------------|
| Reclaimers | "Expand and Recycle" -- prioritize deposit control, maintain Salvage Crane coverage, build recycling infrastructure before military |
| Volt Collective | "Surge and Strike" -- build military first, attack during storm phases, time pushes with Capacitor Bank discharge |
| Signal Choir | "Network and Convert" -- extend signal coverage first, research hacking tech, avoid direct combat, convert enemy forces |
| Iron Creed | "Wall and Watch" -- build walls before anything else, deploy Bastion Bots in overlapping fire zones, expand only when current position is fully fortified |

---

## 10. Success Criteria

- [ ] Each race has 5 unique units with complete stat blocks
- [ ] Each race has 5 unique buildings with complete mechanics
- [ ] Each race has 8 unique techs in their tech branch
- [ ] Economic modifiers create measurably different playstyles
- [ ] Governor GOAP weights produce distinct AI personalities
- [ ] Counter-triangle creates balanced matchups (no >55/45 winrate)
- [ ] Visual identity makes each race immediately recognizable
- [ ] Military doctrines are viable and distinct from each other
- [ ] Paper playtest scenarios validate balance assumptions
- [ ] Every stat has a specific number, not a placeholder
