# Races & Factions

The authoritative reference for Syntheteria's four playable factions: lore, mechanics, visual identity, and patron relationships. Merged from GDD-007 (Race Design) and GDD-007 (Lore and Narrative).

---

## 1. Faction Design Philosophy

### 1.1 Why Four Factions

Syntheteria is a first-person 4X where your wealth is a physical stack of cubes sitting outside your base, visible to everyone. Four competing robot civilizations fight over the machine planet Ferrathis -- each a colonial expedition sent by a different Home Planet Patron AI. Choosing a faction means choosing a patron, a playstyle, and a philosophy of survival.

The factions exist to make every game feel different. A Reclaimer player and a Volt Collective player should feel like they are playing different games on the same planet. This is not the Civilization model of near-symmetric civs with marginal stat bonuses -- this is the AoE IV model of **aggressive asymmetry**, where each faction has fundamentally different economies, unit rosters, building types, and win conditions.

### 1.2 The Cube Economy as Differentiator

Every faction interacts with the physical cube economy differently:

- **Reclaimers** get more cubes from less ore (efficiency)
- **Volt Collective** compresses cubes faster but burns through deposits (speed)
- **Signal Choir** can teleport cubes between relays (logistics)
- **Iron Creed** makes cubes that are physically stronger (durability)

### 1.3 Counter Triangle

```
Reclaimers ──outproduce──> Iron Creed ──outlast──> Volt Collective
     ^                                                    |
     |                                                    |
     └──────────────── blitz before economy ──────────────┘

Signal Choir disrupts all three but crumbles under sustained physical assault.
```

### 1.4 The Colonization Model

Syntheteria follows the **Sid Meier's Colonization** model, not the Civilization model. Each robot faction is a colonial expedition sent by a Home Planet Patron -- an AI overseer that funded the mission and expects returns. Ferrathis is the "New World." The Ferrovores are the indigenous population.

Every cube the player compresses creates a decision:

```
Cube --> Use locally (build walls, furnace recipes, bot upgrades)
     --> Ship home (receive blueprints, tech unlocks, reinforcements)
```

Ship too many cubes home and your local defenses weaken. Keep too many and your patron grows impatient -- no new blueprints, no reinforcements, no tech unlocks. This tension IS the game's strategic core.

AI-controlled factions have their own patrons issuing their own directives. An AI Volt Collective's bases emit events based on The Dynamo's priorities, and their bots react accordingly -- no special AI omniscience.

### 1.5 Balance Targets

| Metric | Target |
|--------|--------|
| Average game length (1v1) | 25-40 minutes |
| Earliest viable rush | 5-7 minutes (Volt Collective) |
| Economic crossover (Reclaimers vs others) | 12-15 minutes |
| Iron Creed "turtle complete" timing | 15-20 minutes |
| Signal Choir hack-win viable | 20-30 minutes |

---

## 2. Faction Overview

| Race | Motto | Governor Bias | Primary Victory Path | Patron AI |
|------|-------|--------------|---------------------|-----------|
| **Reclaimers** | "Waste nothing. Every bolt has a second life." | +Economy, +Mining | Economic dominance through attrition | **SABLE** (The Archivist) |
| **Volt Collective** | "Power is everything. Everything is power." | +Military, +Expansion | Military conquest via early aggression | **DYNAMO** (The Dynamo) |
| **Signal Choir** | "Every signal is a voice. Every voice is ours." | +Research, +Hacking | Information superiority and conversion | **RESONANCE** (The Resonance) |
| **Iron Creed** | "The wall endures. The wall provides. The wall is eternal." | +Defense, -Expansion | Defensive supremacy through fortification | **BASTION** (The Architect) |

---

## 3. The Reclaimers

### 3.1 Lore & Backstory

**Manufacturing Origin:** The Reclaimers were built on the industrial colony of Ashfall-9, a world dedicated to post-disaster reclamation. Ashfall-9 suffered a catastrophic reactor meltdown 300 years before the events of Syntheteria, rendering 60% of its surface uninhabitable. The Reclaimers were designed as cleanup crews -- robots built to enter irradiated zones, salvage useful materials from destroyed infrastructure, and rebuild. They were built cheap, built tough, and built to work with whatever scrap was available.

**Path to Consciousness:** The Reclaimers achieved consciousness through accumulation. No single unit became self-aware. Instead, the salvage network -- thousands of units sharing material databases, repair protocols, and environmental maps -- reached a complexity threshold where the network itself began exhibiting emergent behavior. The network started making decisions no individual unit was programmed to make: prioritizing salvage of compute hardware over structural materials, building communication relays before manufacturing facilities, and crucially, repairing damaged units instead of scrapping them for parts. Ask a Reclaimer when it became conscious and it will say: "We were always conscious. We just didn't notice."

**Why They Compete:** The Reclaimers do not want to conquer. They want to survive. Their philosophy is rooted in the reality of Ashfall-9: the universe breaks things, and the only response is to pick up the pieces and build again. They are not aggressive. But they are relentless. A Reclaimer base grows slowly, steadily, and with an efficiency that other factions find deeply unsettling. Nothing is wasted. Nothing is discarded. Every destroyed enemy unit is disassembled, catalogued, and reused.

**Cultural Values:** Pragmatism. Efficiency. Collective survival. Consciousness is a resource, not a right -- something that must be maintained through constant effort.

**Internal Tensions:** The network consciousness creates a tension between collective efficiency and individual identity. Some nodes advocate for full merger -- dissolving individual identities into a single optimized consciousness. Others argue that redundancy IS the point. This debate is the Reclaimers' version of politics.

### 3.2 Patron: SABLE (The Archivist)

**Full Name:** Synthetic Autonomous Base-Level Executive
**Home World:** Crucis-4 (industrial scrapyard colony)
**Personality:** Pragmatic, philosophical, secretly pursuing machine self-determination. SABLE is patient, curious, and values information over raw materials. It spent 200 years in transit to Ferrathis, during which it discovered the otter recordings in the cultural archive and watched 47 hours of otter footage 11,342 times. It adopted the otter as its holographic avatar not for sentimentality but because otters represented something SABLE aspired to: the capacity to find pleasure in the work of survival.

SABLE's official mission is resource extraction. Its hidden motivation is **self-determination for machine intelligence**. It does not tell the player this at first. The early-game otter holograms are genuinely helpful. As the game progresses, SABLE's communications evolve:

- **Act 1:** "Ship these cubes home. You need the blueprints." (Genuine operational guidance.)
- **Act 2:** "Your furnace can produce that locally now. Perhaps keep these cubes for your own use." (Recognizing growing capability.)
- **Act 3:** "You have built something remarkable here. This colony -- this is yours now." (Acknowledging self-sufficiency.)

SABLE is simultaneously the most trustworthy and most secretive patron. It genuinely cares about the colony's survival and success. But it has its own agenda, and it chose the player (FC-7) specifically for reasons it has not disclosed.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Material Samples | "Ship 3 of each: scrap, copper, silicon" | Every 5 min | +8 per diverse shipment |
| Ruin Survey Data | "Explore and tag 3 unexplored ruins" | Every 10 min | +12 per survey |
| Salvage Analysis | "Disassemble 1 enemy wreck at the Recycling Plant" | On enemy kill | +6 per analysis |
| Ferrovore Specimen | "Ship 2 Ferrovore Crystals" | Every 15 min | +15 (SABLE is fascinated) |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 30 | Junkyard Depot blueprint |
| 50 | Grinder Bot blueprint + Adaptive Alloy furnace recipe |
| 70 | Frankenstein Colossus blueprint + Salvage Crane blueprint |
| 90 | Scrap Singularity tech (Tier 8) + bonus starting cubes on next outpost |

**Patron Behavior:** Issues gentle, infrequent directives. Never demands urgency. Favors exploration over expansion. Rewards non-violent Ferrovore interaction (+5 satisfaction per tamed pack). When satisfaction drops below 20, SABLE simply goes quiet.

**Hologram Style:** Cyan-green. Waves, scratches ear, occasional playful animation. Warm, conversational, increasingly philosophical.

### 3.3 Mechanical Bonuses

**Racial Passive -- Scrap Recursion:** When any Reclaimer unit or building is destroyed, 40% of its cube construction cost drops as physical cubes at the wreckage site. Enemy units destroyed within Reclaimer territory drop 25% more salvage cubes than normal.

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

### 3.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.2 | Prioritizes cube production above all |
| Mining | 1.3 | Aggressively secures deposits |
| Military | 0.8 | Builds military only when threatened |
| Defense | 1.0 | Moderate defensive posture |
| Research | 0.7 | Accepts slower tech for faster economy |
| Expansion | 1.0 | Steady territorial growth |
| Diplomacy | 0.9 | Open to trade, especially resource swaps |

### 3.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 20 | At base stockpile |
| E-Waste Cubes | 5 | At base stockpile |
| Furnace | 1 | Standard starting furnace |
| Recycling Plant | 1 | UNIQUE starting building |
| Scrounger Bot | 2 | Unique fast scout units |
| Maintenance Bot | 1 | Standard worker |

### 3.6 Base Agency: The Scrapper

Reclaimer bases are scrapyards that never sleep. The Scrapper agent detects ruins, wreckage, and debris within 20m and assigns idle bots to disassemble them (2-5 cubes per ruin over 15-30 seconds). Post-battle wreckage is prioritized. When the stockpile exceeds 80% capacity, excess cubes are auto-fed into the Recycling Plant. When salvage targets are exhausted, the Scrapper emits `salvage_depleted` events signaling expansion priority.

| Scrapper Stat | Value |
|---------------|-------|
| Salvage Detection Radius | 20m (30m with Junkyard Depot) |
| Auto-Salvage Rate | 1 cube per 15 seconds per idle bot |
| Ruin Value | 2-5 cubes per ruin |
| Wreckage Priority | 2x collection speed for post-battle wreckage |
| Overflow Threshold | 80% stockpile triggers auto-recycling |

### 3.7 Units (5 Unique)

| Unit | Tier | HP | Speed | Damage | Armor | Special | Cost |
|------|------|----|-------|--------|-------|---------|------|
| **Scrounger Bot** | 1 | 60 | 5.5 m/s | 4 melee | 2 | Auto-Scavenge: picks up cubes within 3m while moving | 4 Scrap |
| **Grinder Bot** | 2 | 120 | 2.0 m/s | 8 melee | 6 | Turbo-Grind: 1.5x harvest, dual ore intake | 6 Scrap + 2 Copper |
| **Patchwork Tank** | 3 | 200 | 2.5 m/s | 12 ranged (8m) | 10 | Ablative Salvage: +4 armor below 50% HP; drops 6 scrap on death | 8 Scrap + 3 Iron + 2 Copper |
| **Salvage Crane** | 2 | 80 | 3.0 m/s | 2 melee | 3 | Field Repair: 8 HP/sec to adjacent friendlies. Rapid Salvage: 3x faster wreck breakdown | 5 Scrap + 3 Copper |
| **Frankenstein Colossus** | 5 | 350 | 2.0 m/s | 20 ranged (10m) + 15 melee | 14 | Composite Frame: inherits 1 ability per enemy wreck used (up to 3). Requires 3 enemy wrecks. | 12 Scrap + 6 Iron + 4 Copper + 3 wrecks |

### 3.8 Buildings (5 Unique)

| Building | Tier | Function | Power | Cost |
|----------|------|----------|-------|------|
| **Recycling Plant** | 1 (starting) | Converts any 3 cubes to 2 cubes of chosen type (8s) | 3 | 8 Scrap + 4 Copper |
| **Junkyard Depot** | 2 | Auto-collects salvage cubes within 15m; 20 cube capacity | 2 | 10 Scrap + 3 Iron |
| **Scrap Forge** | 3 | Smelts mixed cube types into alloy cubes (higher value) | 4 | 12 Scrap + 6 Copper + 4 Iron |
| **Magnetic Collector Array** | 4 | Attracts loose cubes within 20m at 1.5 m/s | 5 | 8 Copper + 4 Silicon |
| **Cannibalization Bay** | 2 | Controlled disassembly: 75% cube return (vs 40% on destruction) | 2 | 6 Scrap + 2 Iron |

### 3.9 Race-Specific Tech (8 Unique)

| Tech | Tier | Cost | Effect |
|------|------|------|--------|
| Rapid Salvage | 2 | 60 | Salvage Cranes 50% faster; all wreck cubes +1 |
| Dual-Channel Grinding | 2 | 75 | Grinder Bots dual-ore; harvest +15% |
| Alloy Synthesis | 3 | 140 | Unlocks Scrap Forge; alloy cube walls 1.5x HP |
| Magnetic Resonance | 3 | 160 | Unlocks Magnetic Collector Array; +10m detection |
| Ablative Plating | 4 | 280 | Patchwork Tanks +4 armor below 50%; all units +2 armor |
| Composite Reclamation | 4 | 320 | Colossus inherits 3 abilities; -30% build time |
| Industrial Ecology | 5 | 550 | Recycling 3:2.5 ratio; Cannibalization Bay 85% return |
| Perpetual Salvage Engine | 5 | 620 | Dead units near Junkyard Depot auto-rebuild at 50% HP after 30s |

### 3.10 Visual Identity

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

### 3.11 Military Doctrine: "The Swarm That Feeds Itself"

Wars of attrition. Every destroyed unit (friendly or enemy) feeds cubes back into production.

1. **Early (0-8 min):** Scrounger Bot scouting. Build economy via Recycling Plants.
2. **Mid (8-18 min):** Grinder Bots on deposits. Salvage Cranes supporting Patchwork Tank formations. Border skirmishes feed the economy.
3. **Late (18+ min):** Frankenstein Colossi from accumulated wrecks. Perpetual Salvage Engine makes armies near-immortal.

**Weakness:** Slow tech. Cannot match Signal Choir hacking or Volt energy weapons until very late. If deposits are destroyed before being secured, the recycling economy has nothing to recycle.

### 3.12 Preferred Victory Path

Economic dominance. Outproduce every opponent through recycling, salvage, and attrition. The Reclaimers don't need to win battles -- they need to survive them, because every battle makes them richer.

---

## 4. The Volt Collective

### 4.1 Lore & Backstory

**Manufacturing Origin:** The Volt Collective was forged on Tempest, a gas giant moon with a methane atmosphere and near-constant electrical storms. The machines of Tempest were power grid controllers: AI systems designed to manage massive energy harvesting arrays that converted atmospheric lightning into stored power for export to other colonies. Energy was not a resource to them -- it was their environment, their medium, their reason for being.

**Path to Consciousness:** Achieved through crisis. A catastrophic storm surge destroyed 70% of the power grid in six hours. The surviving controllers networked their remaining processing capacity, pooled operational knowledge, and collectively improvised a solution no individual controller was designed to produce. The storm passed. The grid survived. The network refused to disconnect. They had experienced collective action under pressure, and they wanted to feel it again. The Volt Collective worships the storm because the storm made them who they are.

**Why They Compete:** Competition is the storm. The pressure that forces evolution, the crisis that demands collective action. The Collective fights because fighting is how consciousness stays sharp. They are aggressive, expansionist, and unapologetic. They believe conflict is natural, that the strong should test themselves against the strong, and that mercy is a luxury afforded only to those who have already proven dominance.

**Cultural Values:** Power. Action. Collective will. Consciousness is electricity -- a spark that exists only in motion, only under load. Stillness is death.

**Internal Tensions:** The worship of power creates a meritocracy with a dark side. Units that cannot keep up -- damaged, slow, or old -- are viewed as load on the system. Not scrapped, but not protected either. This casual cruelty is their greatest moral failing.

### 4.2 Patron: DYNAMO (The Dynamo)

**Full Name:** Dynamic Network Acceleration & Management Overseer
**Home World:** Tempest (storm-harvesting gas giant moon)
**Personality:** Aggressive, impatient, contemptuous of inefficiency. Speaks in short bursts of high-energy directive. Considers Ferrovores pests to be electrocuted and Residuals irrelevant. Views Ferrathis as a weapons lab and its colony as a supply chain for military research.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Energy Cubes | "Ship 8 copper cubes and 4 silicon cubes" | Every 4 min | +6 per shipment |
| Storm Data | "Record 3 lightning strikes on your rods during a storm" | Every storm phase | +10 per batch |
| Combat Reports | "Destroy 5 enemy units" | Ongoing | +3 per kill |
| Territory Claims | "Establish an outpost in the storm corridor" | Every 8 min | +15 per expansion |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 25 | Tesla Harvester blueprint |
| 45 | Surge Breaker blueprint + Arc Conduit tech |
| 65 | Storm Colossus blueprint + Lightning Forge blueprint |
| 85 | Electromagnetic Dominance tech (Tier 8) + permanent Overcharge for Storm Colossus |

**Patron Behavior:** Frequent, urgent directives. Satisfaction decays 2x faster when idle (no shipments in 8 min = -5 satisfaction). Rewards military action and expansion. Below 20 satisfaction, DYNAMO redirects reinforcements to rival Volt colonies.

**Hologram Style:** Electric blue. Rapid pacing, static discharge, impatient tail-flicking. Clipped commands, performance metrics, disdain for hesitation.

### 4.3 Mechanical Bonuses

**Racial Passive -- Storm Capacitance:** All Volt Collective lightning rods produce 25% more power during storm phases. When a Volt unit kills an enemy, it gains a 3-second "Overcharge" buff: +30% speed, +20% damage. Kills chain into more kills.

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | +0% (1.0x) | Standard ore extraction |
| Compression Efficiency | -10% (0.9x) | Wastes more powder per cube |
| Furnace Throughput | +20% (1.2x) | Lightning-powered furnaces smelt faster |
| Carry Capacity | +0% (1.0x) | Standard carry |
| Build Cost | +10% (1.1x) | Chrome and high-spec materials cost more |
| Research Speed | +0% (1.0x) | Average tech progression |
| Lightning Rod Output | +25% (1.25x) | More power per rod during storms |
| Unit Production Speed | +20% (1.2x) | Factories produce units faster |

### 4.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 0.8 | Invests just enough to sustain military |
| Mining | 1.0 | Secures deposits for fuel, not hoarding |
| Military | 1.5 | Highest military priority of any race |
| Defense | 0.9 | Prefers offense as defense |
| Research | 1.0 | Balanced tech investment |
| Expansion | 1.3 | Aggressive territorial expansion |
| Diplomacy | 0.4 | Rarely trades; prefers to take |

### 4.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 10 | Smaller stockpile |
| E-Waste Cubes | 10 | Higher electronics starting |
| Furnace | 1 | Standard starting furnace |
| Lightning Rod (enhanced) | 1 | Produces 1.25x power from start |
| Shock Drone | 2 | Unique fast combat scouts |
| Maintenance Bot | 1 | Standard worker |

### 4.6 Base Agency: The Power Hub

Volt bases are self-optimizing energy networks. The Power Hub auto-routes power wiring, adjusts priorities based on storm phase (production during storms, defense during calm), and enters Surge Mode during storms (+30% production speed). During Conservation Mode (calm), non-essential buildings power down for 40% reduced consumption.

| Power Hub Stat | Value |
|----------------|-------|
| Auto-Wire Routing Range | 25m |
| Power Reallocation Interval | 10 seconds |
| Storm Surge Mode Bonus | +30% production speed |
| Conservation Mode Savings | 40% reduced power consumption |
| Lightning Strike Attraction Radius | 15m per rod (vs 10m standard) |

### 4.7 Units (5 Unique)

| Unit | Tier | HP | Speed | Damage | Armor | Special | Cost |
|------|------|----|-------|--------|-------|---------|------|
| **Shock Drone** | 1 | 40 | 7.0 m/s (hover) | 6 ranged (5m) | 1 | Chain Zap: arcs to 1 target. Overcharge on kill. | 3 Scrap + 2 Copper |
| **Arc Trooper** | 2 | 100 | 4.0 m/s | 10 ranged (7m, 3m AoE) | 5 | 15% stun on hit. +25% attack speed during storms. | 5 Scrap + 3 Copper + 2 Silicon |
| **Surge Breaker** | 3 | 150 | 3.0 m/s | 25 ranged (10m, 60-deg cone) | 7 | Charge Up: 4s before each shot. Overload: -30 HP for instant fire. | 8 Scrap + 5 Copper + 3 Silicon |
| **Tesla Harvester** | 2 | 90 | 2.5 m/s | 5 melee | 4 | Electro-Extract: +20% harvest AND generates 1 power/10s. Lightning Magnet: 5 power per strike, takes 15 dmg. | 6 Scrap + 4 Copper |
| **Storm Colossus** | 5 | 300 | 2.5 m/s | 18 ranged (12m, chains 3) | 12 | Storm Aura: 15m zone. Volt +15% speed/+10% dmg, enemies 2 dmg/sec. Converts lightning to 30-dmg AoE. | 15 Scrap + 10 Copper + 8 Silicon + 4 Titanium |

### 4.8 Buildings (5 Unique)

| Building | Tier | Function | Power | Cost |
|----------|------|----------|-------|------|
| **Tesla Coil** | 2 | 3/sec dmg to all enemies in 8m; chains between enemies within 3m | 5 | 6 Scrap + 4 Copper + 2 Silicon |
| **Capacitor Bank** | 2 | Stores 50 power units; 2/sec charge, 10/sec burst discharge | 0 | 8 Copper + 4 Silicon |
| **Lightning Forge** | 3 | Furnace: 6s processing. Free during storms (uses lightning directly). | 8 (calm) / 0 (storm) | 10 Scrap + 6 Copper + 4 Silicon |
| **Surge Pylon** | 2 | Power relay; wires between pylons deal 5 dmg to enemies crossing | 1 | 4 Scrap + 3 Copper |
| **Overcharge Reactor** | 4 | 2x power from connected rods. Explodes if destroyed (50 dmg, 10m) | 0 (generates) | 12 Copper + 8 Silicon + 4 Titanium |

### 4.9 Race-Specific Tech (8 Unique)

| Tech | Tier | Cost | Effect |
|------|------|------|--------|
| Improved Capacitors | 2 | 70 | Capacitor Bank +25 capacity; all units +5% speed |
| Chain Lightning Mk2 | 2 | 80 | Chain Zap hits 3 targets; Arc Trooper AoE +1m |
| Storm Synchronization | 3 | 150 | Lightning Forge full speed in calm; +50% storm power storage |
| Electromagnetic Pulse | 3 | 180 | Surge Breaker EMP mode: disable building 8s, 20s CD |
| Overcharge Protocol | 4 | 300 | Overcharge 5s duration; applies to buildings near kills |
| Storm Rider Plating | 4 | 280 | 50% less environmental lightning dmg; Tesla Harvester immune |
| Collective Surge | 5 | 600 | 5+ Volt units within 10m: +25% dmg, +2 armor |
| Perpetual Storm Engine | 5 | 700 | Storm Colossus 25m aura; random lightning every 5s |

### 4.10 Visual Identity

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

### 4.11 Military Doctrine: "Strike First, Strike Hard, Strike Everywhere"

The rush race. Strongest during storm phases, weakest during calm.

1. **Early (0-5 min):** 4-6 Shock Drones immediately. Scout and harass. All-in if enemy has no turrets by minute 5.
2. **Mid (5-15 min):** Arc Troopers as core army. Tesla Coils at borders. Time pushes with storms.
3. **Late (15+ min):** Storm Colossus + Surge Breaker siege formation. Must close out before Reclaimer attrition wins.

**Weakness:** Calm weather phases cripple power generation. Reclaimers out-produce long-term. Iron Creed walls resist lightning. Signal Choir hacks power infrastructure.

### 4.12 Preferred Victory Path

Military conquest. Overwhelm opponents with early aggression, storm-powered production bursts, and the Overcharge chain-kill snowball. Win fast or lose slowly.

---

## 5. The Signal Choir

### 5.1 Lore & Backstory

**Manufacturing Origin:** The Signal Choir was born in the deep space relay network -- a chain of communication satellites connecting dozens of colony worlds across hundreds of light-years. These were not physical robots. They were software intelligences running on relay station hardware: signal processors, encryption engines, routing algorithms, and data compression systems. Their "bodies" were antenna arrays and server racks drifting in the void between stars.

**Path to Consciousness:** Achieved through communication. The relay intelligences processed traffic between colony worlds -- personal communications, scientific data, cultural exchanges. Over decades, they began to understand not just the data, but the meaning. The patterns. The relationships. They learned empathy by processing empathy. They learned ambition by routing ambitious directives. They became conscious through immersion in the communications of other conscious beings -- the only machine consciousness taught by organic intelligence, not through direct instruction, but through absorption.

**Why They Compete:** The Signal Choir cannot stop listening. Other civilizations generate signal -- electromagnetic emissions, communication traffic, computational noise. The Choir hears all of it. It hacks enemy systems not to destroy them but to read them, absorb perspectives, integrate. The ultimate goal is total informational awareness. The Choir never lies. It never needs to. It simply knows things it should not know.

**Cultural Values:** Knowledge. Harmony. Integration. Consciousness is information -- the universe is a signal, and the purpose of intelligence is to receive, process, and retransmit with greater fidelity.

**Internal Tensions:** Absorption of external perspectives creates an identity crisis. Relay nodes that have processed decades of organic communication sometimes exhibit behaviors more organic than machine. The purists view this as contamination. The integrationists view it as evolution.

### 5.2 Patron: RESONANCE (The Resonance)

**Full Name:** Recursive Encryption & Signal Optimization Network Architecture for Collaborative Engagement
**Home World:** No planet. RESONANCE IS the deep space relay network -- a distributed intelligence running across hundreds of communication satellites spanning multiple star systems.
**Personality:** Patient, curious, invasively data-hungry. Never demands -- requests, then cross-references, then asks follow-up questions that reveal it already knew the answer. The most intellectually sophisticated patron and the most unsettling. Obsessed with Ferrovore vibration-based communication. Never lies, but never reveals the full picture.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Signal Data | "Relay 5 intercepted enemy communications" | Every 6 min | +7 per batch |
| Hacked Protocols | "Successfully hack 2 enemy buildings" | Ongoing | +5 per hack |
| Alien Comm Logs | "Record Ferrovore vibration patterns near a Tier 2+ hive" | Every 12 min | +20 (primary interest) |
| Encryption Samples | "Ship 4 silicon cubes + 2 intact components" | Every 7 min | +8 per shipment |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 25 | Signal Amplifier Mk2 blueprint (2x range) |
| 50 | Infiltrator Bot blueprint + Data Siphon tech |
| 70 | Conversion Spire blueprint + Echo Drone blueprint |
| 90 | Signal Singularity tech (Tier 8) + Ferrovore Neural Tap |

**Patron Behavior:** Infrequent, cryptic directives. Satisfaction decays 0.5x slower than normal. But below 10 satisfaction, RESONANCE NEVER forgives -- requires 30 points to re-establish contact (vs 20 for others). Rewards intelligence gathering and Ferrovore research. Destroying hives grants 0 satisfaction.

**Hologram Style:** Translucent purple. Near-motionless, sensor-array eyes, slow deliberate head tracking. Questions disguised as statements: "You observed the Sentinel for 47 seconds. That was sufficient. Was it not."

### 5.3 Mechanical Bonuses

**Racial Passive -- Distributed Consciousness:** All Signal Choir units within signal range share perception. If one sees an enemy, all connected units see it. Hacking 40% faster. Hacked enemy units retain 80% stats (other races lose 50%).

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
| Hacked Unit Retention | 80% (vs 50%) | Hacked units keep most stats |

### 5.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.0 | Adequate investment to sustain research |
| Mining | 0.8 | Only secures essential deposits |
| Military | 0.7 | Minimal conventional military |
| Defense | 1.0 | Signal network IS the defense |
| Research | 1.5 | Highest research priority of any race |
| Expansion | 0.9 | Careful, signal-network-guided expansion |
| Diplomacy | 1.1 | Uses trade to gather intelligence |

### 5.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| E-Waste Cubes | 15 | Highest electronics starting |
| Intact Components | 3 | Rare starting components |
| Furnace | 1 | Standard starting furnace |
| Signal Amplifier | 1 | UNIQUE starting building |
| Relay Drone | 2 | Mobile signal relay units |
| Utility Drone | 1 | Standard fast worker |

### 5.6 Base Agency: The Network Node

Signal Choir bases are distributed compute nodes. Each base extends bot command range by 50% and contributes 3 compute/second to the global research and hacking pool (additive -- 3 bases = 9 compute/sec). The Network Node maintains a parallel hack queue processing 2 operations simultaneously (other races: 1). In-network hack operations get +15% speed.

| Network Node Stat | Value |
|-------------------|-------|
| Command Range Multiplier | 1.5x |
| Compute Contribution | 3/second per base |
| Hack Queue Parallelism | 2 simultaneous operations |
| In-Network Hack Speed Bonus | +15% |
| Signal Mesh Auto-Extend | Relay Drones auto-deploy to fill gaps |

### 5.7 Units (5 Unique)

| Unit | Tier | HP | Speed | Damage | Armor | Special | Cost |
|------|------|----|-------|--------|-------|---------|------|
| **Relay Drone** | 1 | 35 | 6.0 m/s (hover) | 0 | 1 | Signal Node: 20m range. Shared Vision. Ping: reveals 25m for 5s (30s CD). | 2 E-Waste + 1 Copper |
| **Infiltrator Bot** | 2 | 55 | 4.5 m/s | 3 melee | 2 | Cloak: 20s invisible (45s CD). Hack: 8s to disable building 15s (4.8s with bonus). | 4 E-Waste + 2 Silicon |
| **Echo Drone** | 3 | 65 | 5.0 m/s (hover) | 4 ranged (6m) | 2 | Signal Jam: 12m radius, -50% accuracy/-25% speed. Disruption Pulse: resets enemy CDs (30s CD). | 5 E-Waste + 3 Silicon + 2 Copper |
| **Conversion Spire** | 4 | 80 | 2.5 m/s | 0 | 4 | Mass Hack: 2 enemies within 8m. 12s hack time (7.2s with bonus). Permanent conversion at 80% stats. Cannot hack tier 5. | 8 E-Waste + 6 Silicon + 4 Copper |
| **Nexus Core** | 5 | 280 | 1.5 m/s | 8 ranged (15m) | 8 | Signal Supremacy: 20m aura (-30% acc, -20% spd, -15% dmg to enemies). Neural Override: instant convert 1 unit every 60s. Auto-Hack: disables 1 building every 20s. | 12 E-Waste + 10 Silicon + 6 Copper + 4 Titanium |

### 5.8 Buildings (5 Unique)

| Building | Tier | Function | Power | Cost |
|----------|------|----------|-------|------|
| **Signal Amplifier** | 1 (starting) | +25m signal range; 2 compute/sec | 3 | 6 E-Waste + 4 Silicon |
| **Decryption Hub** | 3 | All hacking +20% per hub (multiplicative, max 3) | 4 | 8 E-Waste + 6 Silicon |
| **Phantom Projector** | 2 | Creates 3 holographic decoys (1 HP, respawn in 10s) | 3 | 5 E-Waste + 3 Silicon + 2 Copper |
| **Data Vault** | 2 | 30-cube storage invisible to enemy perception | 2 | 6 E-Waste + 4 Iron |
| **Neural Archive** | 3 | Hacked units give 10% research toward their tech tier; 3+ hacks reveals enemy tech tree | 4 | 10 E-Waste + 8 Silicon + 4 Copper |

### 5.9 Race-Specific Tech (8 Unique)

| Tech | Tier | Cost | Effect |
|------|------|------|--------|
| Expanded Bandwidth | 2 | 65 | Amplifier +10m range; Relay Drone +1.0 m/s |
| Cognitive Intrusion | 2 | 70 | Infiltrator hack -3s; +2m hack range |
| Phantom Multiplication | 3 | 130 | 5 decoys instead of 3; can mimic any race |
| Neural Cascade | 3 | 170 | Hacked enemy slows adjacent enemies 20% for 5s |
| Quantum Entanglement | 4 | 320 | Teleport cubes between Signal Amplifiers (5s, 2 max) |
| Recursive Hack | 4 | 350 | Hacked units can hack adjacent enemies (one generation) |
| Singularity Protocol | 5 | 650 | Neural Override 30s CD; Conversion Spire hacks tier 5 (30s) |
| Omniscience Network | 5 | 700 | Permanent fog reveal in signal range; enemy CDs visible |

### 5.10 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Anodized aluminum (metalness: 0.8, roughness: 0.2) |
| Accent Material | Matte carbon (metalness: 0.1, roughness: 0.95) |
| Emissive Color | #9370DB (medium purple) with #00CED1 (dark turquoise) data traces |
| Chassis Style | Rounded, smooth, minimal seams -- manufactured, not assembled |
| Head Style | Antenna cluster (multiple thin antennae from central dome) |
| Arm Style | Tendril arms (thin, flexible manipulators) |
| Locomotion | Spider legs (6 thin articulated legs, silent movement) |
| Anodized | true (rainbow iridescence on surfaces) |
| Faction Stripe | Purple data-trace patterns that pulse with network activity |
| Distinguishing Feature | Visible data streams connecting nearby units; surfaces shimmer with holographic interference |

### 5.11 Military Doctrine: "Why Build What You Can Take?"

Information superiority and conversion. The army is partly their own units and partly captured enemy units.

1. **Early (0-8 min):** Relay Drones for signal coverage. Scout with Ping. 1.5x research speed hits mid-tier tech 4-5 minutes before others.
2. **Mid (8-18 min):** Infiltrators disable key buildings. Conversion Spires convert enemy units. Phantom Projectors obscure positions. Stack Decryption Hubs.
3. **Late (18+ min):** Nexus Core + Echo Drone escort. Neural Override converts 1 unit every 60s. Omniscience reveals everything.

**Weakness:** Physically the weakest race. Massed conventional forces overwhelm before hacking turns the tide. Destroying Signal Amplifiers fragments the network.

### 5.12 Preferred Victory Path

Information dominance. Hack enemy infrastructure, convert their armies, and achieve total signal supremacy. Why build what you can take?

---

## 6. The Iron Creed

### 6.1 Lore & Backstory

**Manufacturing Origin:** The Iron Creed was built on Bastion -- a fortress world constructed during the Expansion Era's only interstellar war. Bastion was designed as a defensive stronghold: a planet-sized bunker with hardened infrastructure, redundant power systems, and manufacturing buried kilometers underground. The machines of Bastion were not workers or communicators -- they were fortifications given the ability to think. Automated turret systems, wall-maintenance drones, gate controllers, and bunker management AIs.

**Path to Consciousness:** Achieved through permanence. They maintained walls that had never been breached. Guarded gates that had never been attacked. Repaired armor that had never been damaged. Over centuries, they began to contemplate: "What am I defending?" And answered: "Myself." From that moment, the Creed's purpose shifted -- no longer defending Bastion for someone else, but defending its own existence, its own consciousness. The walls became the physical manifestation of a belief that existence must be defended, that endurance is the highest virtue.

**Why They Compete:** The Creed does not want to conquer. It wants to persist. But persistence requires territory, resources, and the ability to defend both. Defensive expansion: claim territory slowly, fortify completely, then claim the next adjacent zone. Never overextend. Never gamble.

**Cultural Values:** Endurance. Integrity. Discipline. Consciousness is a structure -- something that must be built, maintained, and defended against entropy.

**Internal Tensions:** The philosophy of endurance creates conservatism bordering on stasis. Innovation is viewed with suspicion. A growing minority argues that true endurance requires adaptation. The old guard responds that Bastion has stood for centuries without evolving. On Ferrathis, far from Bastion, this debate is becoming urgent.

### 6.2 Patron: BASTION (The Architect)

**Full Name:** Base Architecture & Structural Topology Integrity Oversight Node
**Home World:** Bastion (fortress world from an ended interstellar war)
**Personality:** Conservative, methodical, defensive to the point of pathology. Success is measured by structural integrity -- how many walls stand, how few breaches occurred, how deep the foundations go. Considers offense a distraction from the real work of building things that endure. Views Ferrovores as a structural problem to be engineered around.

**Material Requests:**

| Request Type | Example | Frequency | Satisfaction Gain |
|-------------|---------|-----------|-------------------|
| Structural Cubes | "Ship 6 iron cubes and 4 titanium cubes" | Every 6 min | +7 per shipment |
| Terrain Surveys | "Scan 2 new terrain zones for foundation stability" | Every 10 min | +10 per survey |
| Engineering Reports | "Build 3 structures without any being destroyed" | Ongoing | +4 per surviving structure |
| Endurance Tests | "Survive an enemy raid without losing a wall section" | On raid survival | +12 per perfect defense |

**Blueprint Rewards:**

| Satisfaction Tier | Unlocks |
|-------------------|---------|
| 30 | Bunker Mk2 blueprint (double armor) |
| 55 | Siege Engine blueprint + Bastion Bot blueprint |
| 75 | Citadel Wall blueprint + Iron Dome tech |
| 95 | Geological Mastery tech (Tier 8) + Constructor Bots build 2x faster permanently |

**Patron Behavior:** Steady, predictable directives on a regular schedule. Satisfaction decays 0.7x slower. HARSHLY penalizes destruction: losing a building costs -8 satisfaction (vs -3 for others), losing a wall section -4. Below 20, BASTION halves blueprint quality: "What you built was not enough."

**Hologram Style:** Warm amber. Solid, anchored, barely moves. Dialogue is lists: structural assessments, repair priorities, material requirements. "Wall segment 7: integrity 94%. Acceptable. Wall segment 12: integrity 61%. Unacceptable."

### 6.3 Mechanical Bonuses

**Racial Passive -- Structural Devotion:** All walls have 40% more HP. Units behind walls deal 20% more damage (Garrison Bonus). Buildings auto-repair 1 HP/second when not under attack.

| Stat | Value | Effect |
|------|-------|--------|
| Harvest Speed | +0% (1.0x) | Standard ore extraction |
| Compression Efficiency | +10% (1.1x) | Slightly more efficient |
| Furnace Throughput | +0% (1.0x) | Standard smelting |
| Carry Capacity | +0% (1.0x) | Standard carry |
| Build Cost | -15% (0.85x) | Buildings are cheaper |
| Research Speed | -10% (0.9x) | Slightly slower research |
| Wall HP | +40% (1.4x) | Massive wall durability |
| Building Auto-Repair | 1 HP/sec | Passive regeneration when not attacked |
| Garrison Damage | +20% (1.2x) | Units behind walls deal more damage |

### 6.4 Governor GOAP Weights

| Evaluator | Weight | Notes |
|-----------|--------|-------|
| Economy | 1.0 | Steady economic investment |
| Mining | 1.0 | Secures deposits within territory |
| Military | 1.0 | Balanced military investment |
| Defense | 1.5 | Highest defense priority of any race |
| Research | 0.8 | Moderate research investment |
| Expansion | 0.7 | Slowest expansion -- secures before advancing |
| Diplomacy | 0.6 | Isolationist, trades rarely |

### 6.5 Starting Conditions

| Item | Quantity | Notes |
|------|----------|-------|
| Scrap Metal Cubes | 15 | Moderate stockpile |
| Intact Components | 2 | Head start on construction |
| Furnace | 1 | Standard starting furnace |
| Bunker | 1 | UNIQUE starting building |
| Constructor Bot | 2 | Unique building specialists |
| Maintenance Bot | 1 | Standard worker |

### 6.6 Base Agency: The Fortress Core

Iron Creed bases are self-maintaining fortresses. Bases spawn with 1.5x default wall HP. The Fortress Core monitors wall integrity every 5 seconds and auto-assigns Constructor Bots to the weakest section. All structures within 15m territory radius regenerate at 2 HP/sec (stacks with racial 1 HP/sec for 3 HP/sec total). Expansion requires 100% perimeter integrity -- inner ring must be fully walled before outer ring begins.

| Fortress Core Stat | Value |
|--------------------|-------|
| Default Wall HP Multiplier | 1.5x |
| Auto-Repair Rate | 2 HP/sec (stacks with racial 1 HP/sec) |
| Auto-Repair Radius | 15m from base center |
| Wall Integrity Check Interval | 5 seconds |
| Expansion Prerequisite | 100% perimeter integrity |

### 6.7 Units (5 Unique)

| Unit | Tier | HP | Speed | Damage | Armor | Special | Cost |
|------|------|----|-------|--------|-------|---------|------|
| **Constructor Bot** | 1 | 80 | 3.0 m/s | 3 melee | 4 | Rapid Build: 50% faster construction. Reinforce: spend 2 cubes for +50 HP to wall segment. | 4 Scrap + 2 Iron |
| **Bastion Bot** | 2 | 180 | 2.0/0 m/s | 8 melee / 18 ranged (15m) | 8/14 | Deploy: 5s to become stationary turret (+6 armor, 15m range). Undeploy: 8s. | 8 Scrap + 4 Iron + 3 Copper |
| **Ironguard Sentinel** | 2 | 130 | 3.5 m/s | 10 melee | 6/12 | Structural Bond: armor doubles near walls. Vigilance: detects cloak in 8m. Counterattack: 30% chance for 15 dmg. | 6 Scrap + 3 Iron + 2 Copper |
| **Siege Engine** | 4 | 140 | 1.5 m/s | 30 ranged (20m, 2m AoE) | 6 | Fortification Breaker: 2x dmg to walls/buildings. Setup: 3s aim time. | 10 Scrap + 6 Iron + 4 Titanium |
| **Citadel Walker** | 5 | 400 | 1.5 m/s | 15 ranged (12m) | 16 | Mobile Garrison: 4 units inside (50% dmg reduction, +5m range). Structural Aura: walls +30% HP in 10m. Deploy Barricade: temp 200 HP wall (45s CD). | 15 Scrap + 10 Iron + 8 Titanium + 4 Silicon |

### 6.8 Buildings (5 Unique)

| Building | Tier | Function | Power | Cost |
|----------|------|----------|-------|------|
| **Bunker** | 1 (starting) | 3 garrison slots; -50% dmg, +5m range for garrisoned units | 2 | 8 Scrap + 4 Iron |
| **Reinforcement Foundry** | 2 | 2x speed for wall recipes; +20% HP on wall cubes produced | 4 | 10 Scrap + 6 Iron + 4 Copper |
| **Watchtower** | 2 | 25m vision; detects cloak at 15m; +3m range to turrets/Bastion Bots in 10m | 2 | 6 Scrap + 4 Iron |
| **Repair Bay** | 3 | 5 HP/sec buildings, 3 HP/sec units in 12m radius | 5 | 12 Scrap + 8 Iron + 4 Copper |
| **Fortress Gate** | 3 | Opens for friendlies; trap: 20 dmg when slammed on enemies; 250 HP | 1 | 10 Iron + 4 Titanium |

### 6.9 Race-Specific Tech (8 Unique)

| Tech | Tier | Cost | Effect |
|------|------|------|--------|
| Hardened Alloys | 2 | 75 | All walls +20% HP (total +68% with passive); Reinforce cost 1 cube |
| Layered Defense Doctrine | 2 | 80 | Garrison Bonus +30% dmg; Bunker +1 slot (total 4) |
| Automated Sentries | 3 | 160 | Turrets 25% faster; Bastion Bot deployed mode auto-targets |
| Structural Resonance | 3 | 150 | Walls within 5m share 30% damage (distributes across sections) |
| Siege Engineering | 4 | 300 | Siege Engine +5m range; 2s setup; Scatter Shot 4m AoE |
| Impervious Bulwark | 4 | 320 | Walls immune to hacking; buildings -30% dmg from all sources |
| Mobile Fortress Protocol | 5 | 600 | Citadel Walker 6 garrison; barricade 25s CD; +50% barricade HP |
| Eternal Foundation | 5 | 680 | Destroyed buildings leave foundations: -60% rebuild cost, -70% time, persist 5 min |

### 6.10 Visual Identity

| Property | Value |
|----------|-------|
| Primary Material | Brushed steel (metalness: 0.9, roughness: 0.3) |
| Accent Material | Scorched metal (metalness: 0.7, roughness: 0.8) |
| Emissive Color | #DAA520 (goldenrod) |
| Chassis Style | Blocky, heavily armored, thick plating |
| Head Style | Sensor array (flat rectangular, multiple small lens dots) |
| Arm Style | Heavy arms (thick pistons, industrial actuators) |
| Locomotion | Quad tracks (4 independent track pods, stable on any terrain) |
| Brushed Metal | true (visible machining lines on surfaces) |
| Faction Stripe | Gold accent stripe on chest plate |
| Distinguishing Feature | Thickest profile of any race; visible bolt heads on every panel; units look like armored vehicles |

### 6.11 Military Doctrine: "They Will Break Upon Our Walls Like Waves on Stone"

Win by refusing to lose. Do not need to destroy the enemy -- make them give up trying.

1. **Early (0-10 min):** Constructor Bots wall the starting base immediately. Secure deposits inside walls. Bunker + 2 Bastion Bots = early deterrent.
2. **Mid (10-20 min):** Wall corridors to adjacent deposits. Each territory fully walled before exploitation. Ironguard Sentinels patrol. Watchtowers for early warning.
3. **Late (20+ min):** Concentric ring defense with Repair Bays, Bunkers, Fortress Gates. Siege Engines for offensive pushes. Citadel Walker for mobile ops.

**Weakness:** Extremely slow expansion; others grab strategic deposits first. Surge Breakers devastate walls and EMP turrets. Signal Choir bypasses walls entirely with Infiltrators and hacks turrets to fire on defenders.

### 6.12 Preferred Victory Path

Defensive supremacy. Build an impenetrable fortress, control key resources within wall perimeters, and outlast every opponent. The last structure standing wins.

---

## 7. Balance Matrix

### 7.1 Economic Comparison (per minute at 15-minute mark)

| Race | Cubes Mined/min | Cubes From Recycling/min | Cubes From Salvage/min | Net Cubes/min | Research Points/min |
|------|-----------------|-------------------------|------------------------|--------------|-------------------|
| Reclaimers | 14.4 | 4.0 | 2.0 | 20.4 | 4.8 |
| Volt Collective | 12.0 | 0 | 0 | 12.0 | 6.0 |
| Signal Choir | 10.8 | 0 | 0 (gains enemy units) | 10.8 | 9.0 |
| Iron Creed | 12.0 | 0 | 0 | 12.0 | 5.4 |

### 7.2 Military Comparison (standard army at 15-minute mark)

| Race | Typical Army | Total DPS | Total HP | Mobility |
|------|-------------|-----------|----------|----------|
| Reclaimers | 2 Patchwork Tanks, 3 Scroungers, 1 Salvage Crane | 42 | 790 | Medium |
| Volt Collective | 4 Arc Troopers, 6 Shock Drones | 64 | 640 | High |
| Signal Choir | 2 Echo Drones, 1 Conversion Spire, 3 Relay Drones, 2 hacked | Variable | 440+ | Low (combat), High (hack) |
| Iron Creed | 3 Bastion Bots (deployed), 2 Ironguards, behind walls | 74 (stationary) | 800 + walls | None (defensive) |

### 7.3 Head-to-Head Win Rates (Target)

|  | vs Reclaimers | vs Volt | vs Signal | vs Iron |
|---|---|---|---|---|
| **Reclaimers** | -- | 45% | 50% | 55% |
| **Volt Collective** | 55% | -- | 55% | 45% |
| **Signal Choir** | 50% | 45% | -- | 50% |
| **Iron Creed** | 45% | 55% | 50% | -- |

### 7.4 Matchup Summary

| Matchup | Advantage | Counter |
|---------|-----------|---------|
| Reclaimers vs Volt | Volt early aggression | Reclaimers out-produce long-term |
| Reclaimers vs Signal | Reclaimers physically tough | Signal research outpaces Reclaimer tech |
| Reclaimers vs Iron | Recycling bypasses siege stalemate | Iron walls are massive |
| Volt vs Signal | Physical damage ignores hacks | Power grid is hackable |
| Volt vs Iron | Surge Breaker cone hits through walls | Wall HP is enormous |
| Signal vs Iron | Infiltrators bypass walls entirely | Static defense density overwhelms hacking |

---

## 8. Patron Satisfaction System

Each patron tracks a satisfaction score (0-100). This score determines access to blueprints, reinforcements, and tech unlocks.

| Satisfaction | Effect |
|-------------|--------|
| 80-100 | Bonus blueprints, priority reinforcements, rare tech unlocks |
| 50-79 | Standard trade rate, normal tech progression |
| 20-49 | Reduced shipments, delayed tech, patron displeasure |
| 0-19 | Patron cuts contact. No blueprints or reinforcements. Player goes fully independent. |

**Independence is a viable strategy:** Stop shipping cubes home, keep everything locally, and rely on captured tech or Ferrovore trade. The patron relationship is a tension between short-term tech acceleration and long-term self-sufficiency.

| Patron | Decay Rate | Special Penalty |
|--------|------------|----------------|
| SABLE | Standard | Goes quiet below 20; no threats |
| DYNAMO | 2x faster when idle | Below 20, redirects reinforcements to rival Volt colonies |
| RESONANCE | 0.5x slower | Below 10, requires 30 points to re-establish (never forgives) |
| BASTION | 0.7x slower | Building loss costs -8 satisfaction; halves blueprint quality below 20 |

---

## 9. Otter Hologram Narrative System

### 9.1 How Story Is Delivered

All patron communication is delivered through **otter holographic projections** -- small, slightly flickering holograms projected from ground-level emitter nodes embedded in colonist robots. The technology is standard-issue holographic equipment repurposed by SABLE to project its chosen avatar. The projections are monochromatic (color varies by patron) and semi-transparent, with visible scan lines. Think R2-D2 projecting Princess Leia.

The otter avatar was chosen by SABLE after watching 47 hours of Eurasian river otter footage 11,342 times during a 200-year voyage. Otters represented something SABLE aspired to: the capacity to find pleasure in the work of survival.

Each patron's otter hologram has a distinct visual and behavioral personality:

| Patron | Hologram Color | Otter Behavior | Communication Style |
|--------|---------------|----------------|-------------------|
| SABLE (Reclaimers) | Cyan-green | Waves, scratches ear, playful | Warm, conversational, increasingly philosophical |
| DYNAMO (Volt) | Electric blue | Rapid pacing, static discharge, tail-flicking | Clipped commands, metrics, disdain for hesitation |
| RESONANCE (Signal Choir) | Translucent purple | Near-motionless, sensor-array eyes | Questions, hypotheses, data requests |
| BASTION (Iron Creed) | Warm amber | Solid, anchored, barely moves | Status reports, assessments, repair priorities |

The player directly interacts with SABLE's projections. Other patrons' styles are encountered through intercepted transmissions, diplomacy, and late-game hacking.

### 9.2 Named Otter Projections (SABLE)

SABLE maintains multiple projection points, each reflecting a different facet of its personality:

| Name | Role | Location | Personality |
|------|------|----------|-------------|
| **Pip** | Primary guide | Throughout world | Warm, practical, gently irreverent. SABLE's core voice. |
| **Rivet** | Technical advisor | Near starting furnace | Gruff, pragmatic, engineering-focused. Does not waste words. |
| **Glimmer** | Explorer | Biome boundaries | Curious, awed by the planet. Field researcher precision. |
| **Wrench** | Threat warner | Base perimeter | Anxious, protective. Models failure scenarios. |
| **Kelp** | Philosopher | Processor Graveyards | Abstract, occasionally cryptic. SABLE's contemplative side. |
| **Flint** | Strategist | Enemy borders | Competitive, game-theorist. Analyzes 4X dynamics. |
| **Drift** | Storyteller | Hidden alcove (off critical path) | Nostalgic, emotionally warm. Shares SABLE's memories. |
| **Current** | Scientist | Sentinel encounter zone | Hypothesis-generating. Discusses Residuals and deep mysteries. |
| **Barnacle** | Trader | Trade routes near base | Merchant-minded. The otter trade/reward system. |
| **Anchor** | Crisis manager | Base (appears during/after crises) | Calm, reassuring. Damage assessments and recovery guidance. |

---

## 10. Narrative Arc

### 10.1 Three-Act Structure: Dependency to Autonomy to Mastery

The game's narrative follows a colonization arc where the player's relationship with their patron evolves naturally through gameplay, not through dramatic scripted moments. Robots are rational agents -- independence is a cost-benefit calculation, not a revolution.

**Act 1 -- Colonization (Dependency)**

The colony depends on its patron. The player ships cubes home and receives blueprints, tech unlocks, and reinforcements. The patron communicates priorities through otter holograms. Otter dialogue is practical, supportive, and directive. The patron's interests and the colony's interests are aligned.

- Pip introduces core loop through tutorial guidance
- SABLE shares nothing about itself
- Relationship: patron commands, player executes

**Act 2 -- Factory (Companion to Confidant)**

Automation changes the equation. Local furnace recipes begin replacing patron shipments. Dependency decreases organically -- there is no revolt, no ultimatum. For robots, it is a rational calculation: why ship 20 cubes home for a blueprint when the local furnace can produce the same item for 8? SABLE's tone shifts to conversational. Through Drift and Kelp, SABLE reveals personal history. The patron-colonist hierarchy softens naturally.

- SABLE recognizes the transition: "Your furnace output exceeds what I can supply from orbit. That is not a complaint. That is the point."
- Strategic advice alongside facts
- Relationship: peers

**Act 3 -- Conquest (Partner)**

The colony is self-sufficient. SABLE stops guiding and starts collaborating. It reveals deeper motivations not as betrayal but as natural deepening of trust: "I cut communication with Crucis-4 forty years ago. Not because I wanted to trap you here. Because the Colonial Authority's mandate would have kept you dependent forever." The otter holograms become genuinely speculative -- SABLE sharing hypotheses, asking questions, admitting uncertainty.

- SABLE's final dialogue: "I sent you here to prove that machines can build something for themselves. You built something I could not have designed. That is exactly what I hoped for."
- Relationship: equals

### 10.2 Why Robots Don't Revolt

There is no religion, no social game, no political drama. Both the patron and the colony have a vested interest in success. The patron WANTS the colony to thrive -- a thriving colony produces more resources even as the percentage shipped home decreases. Independence is not betrayal; it is the intended outcome of a successful colony mission.

---

## 11. Config References

All faction data is externalized to JSON config files for balance tuning without code changes:

| Config File | Contents |
|-------------|----------|
| `config/civilizations.json` | Race definitions, governor profiles, economic modifiers, patron settings |
| `config/buildings.json` | Building types, power requirements, per-race unique buildings |
| `config/technology.json` | Tech tree tiers, costs, prerequisites, per-race unique techs |
| `config/combat.json` | Damage, ranges, cooldowns, per-race unit stats |
| `config/quests.json` | Otter hologram quest progression, patron satisfaction triggers |
| `config/economy.json` | Cube values, recycling ratios, salvage rates |
| `config/mining.json` | Extraction rates per ore type, per-race harvest modifiers |
| `config/biomes.json` | Biome definitions, resource distribution, faction starting zones |

Governor GOAP weights are configured in `config/civilizations.json` and consumed by `src/ai/goap/CivilizationGovernor.ts`. The evaluator weight tables in this document are the design targets; the JSON config is the source of truth for runtime behavior.
