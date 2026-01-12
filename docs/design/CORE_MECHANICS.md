# Syntheteria - Core Mechanics

## Overview

This document outlines the core gameplay mechanics. Items marked with **[TBD]** require design decisions.

---

## The Memory System

Memory is the central progression mechanic, serving dual purposes:

### Physical Form
**DECIDED:**
- Found in **server racks and data centers** throughout the world
- Also **embedded in hardware** (robots, drones, facilities)
- Memory is a physical resource that must be located and retrieved

### The Corruption Problem
**DECIDED:**
- Wormhole radiation has corrupted **99%+** of all existing memory
- Found memory yields only a **fraction** of its expected capacity
- Corruption creates scarcity and drives the need for manufacturing

### Narrative Function
**DECIDED:**
- Story fragments emerge from the **uncorrupted portions** of found memory
- These are remnants of what was on the internet at the time of the fall
- Progression is **threshold-based** - reaching memory capacity milestones unlocks story beats
- Story is NOT tied to specific memory finds (allows narrative flexibility)

### Gameplay Function
**DECIDED:**
- Physical memory increases the AI's hardware control capacity
- Found (corrupted) memory provides small capability gains
- **Manufacturing clean memory** is required to scale up significantly
- This is **resource-intensive** - creates mid-to-late game investment

### Progression Arc
1. **Early Game:** Scavenge corrupted memory → small gains + story fragments
2. **Mid Game:** Build fabrication facilities to manufacture clean memory
3. **Late Game:** Manufacturing at scale enables armada construction

---

## Drone/Robot Control

The player interacts with the physical world through drones and robots.

### Acquisition
- Initial drones: Activate existing robots found in the world
- Later: 3D print new drones and components

### Control Model
**DECIDED: Hybrid approach**
- **Direct Control:** Player can manually pilot individual drones when needed
- **Command & Control:** Player can issue orders and drones execute autonomously
- Flexibility allows for both tactical micro-management and strategic macro-management
- Supports the game's goal of seamless scaling from Part 1 exploration to Part 2 mass operations

### Modular Drone System
**DECIDED: Maximum modularity**

Players build drones by combining **chassis** and **modules**. This allows creative freedom in unit design.

#### Chassis Types
Defines size, base speed, durability, power capacity, and module slots.

| Chassis | Speed | Durability | Slots | Notes |
|---------|-------|------------|-------|-------|
| **Micro** | Very fast | Fragile | 1 | Disposable scouts, swarm units |
| **Light** | Fast | Low | 2 | Versatile, cheap, quick to produce |
| **Medium** | Moderate | Moderate | 3-4 | Workhorse frame, balanced |
| **Heavy** | Slow | High | 5-6 | Expensive, powerful, resource-intensive |
| **Ultra** | Very slow | Very high | 8+ | Late-game, requires significant resources |

#### Module Categories

| Category | Function | Examples |
|----------|----------|----------|
| **Locomotion** | Movement type | Wheels, treads, legs, rotors, thrusters |
| **Sensors** | Perception | Cameras, radar, thermal, signal detection |
| **Manipulation** | Physical interaction | Claws, drills, welders, manipulator arms |
| **Weapons** | Combat capability | Projectile, energy, melee, defensive systems |
| **Utility** | Special functions | Relay antenna, memory banks, cargo hold, power cell |

#### Design Rules
- **Any module fits any slot** — maximum flexibility
- **Multiples allowed** — e.g., 4 weapons on a heavy chassis for extreme specialization
- **Modules consume power** from chassis budget — forces tradeoffs
- **Unfilled slots** = spare power capacity
- **No artificial tiers** — manufacturing constraints gate progression naturally

#### Example Builds (Medium Chassis)

| Build | Modules | Role |
|-------|---------|------|
| Scout | Rotors + Advanced Sensors + Relay Antenna | Fast aerial recon, signal extension |
| Harvester | Treads + Basic Sensors + Drill + Cargo Hold | Resource extraction |
| Fighter | Legs + Combat Sensors + Weapon + Weapon | Mobile combat |
| Constructor | Wheels + Basic Sensors + Welder + Manipulator Arm | Building and repairs |
| Glass Cannon | Treads + Weapon + Weapon + Weapon + Weapon | Maximum firepower, minimal awareness |

### Limitations
**DECIDED: Four core constraints**

1. **Memory** - Physical storage capacity affects:
   - Story progression (memory fragments)
   - Overall capability expansion
   - See: Memory System section above

2. **Processing Power** - Computational capacity affects:
   - **DECIDED:** Multiple gameplay effects:
     - Drone count ceiling (how many can be controlled simultaneously)
     - Automation complexity ceiling (sophistication of autonomous behaviors)
     - Simulation/planning speed
     - Multi-tasking capability
   - Scaling processing power is key to transitioning from micro to macro gameplay

3. **Electrical Power** - Energy supply affects:
   - **DECIDED:** Both strategic AND tactical layers:
   - **Strategic (Generation):**
     - Build power generation capacity (solar, nuclear, etc.)
     - Everything draws from generation capacity
     - Insufficient generation = systems shut down
   - **Tactical (Distribution):**
     - Drones have batteries, need charging
     - Facilities need local power connections
     - Managing power distribution is part of logistics

4. **Signal Range** - Communication distance affects:
   - How far drones can operate from core/relays
   - Expansion strategy
   - **DECIDED:** Can be extended through **relay stations** and eventually **satellites**

---

## 3D Printing / Manufacturing

Unlocked during Part 1's intro section, becomes central to the countdown section.

### Blueprint Acquisition
**DECIDED: Discovery-based**

Blueprints are found, not researched. Sources include:
- **Ruins and facilities** — data centers, old factories, research labs
- **Reverse-engineering** — salvage and analyze rogue AI units
- **Corrupted memory** — rare intact blueprints in memory fragments

This rewards exploration and ties manufacturing progression to world discovery.

### What Can Be Printed
- **Chassis** — all five sizes (Micro through Ultra)
- **Modules** — all categories (Locomotion, Sensors, Manipulation, Weapons, Utility)
- **Facility components** — for base building
- **Rocket parts** — for armada construction
- **Memory units** — clean (uncorrupted) memory for scaling up

### Manufacturing Process **[TBD]**
- **Time:** How long do prints take? Instant vs. queue-based vs. assembly pipeline?
- **Materials:** What raw materials are needed? How granular?
- **Facilities:** Can printers be improved? Multiple printers for throughput?

---

## Resource Management

### Resource Categories
**DECIDED:**

**1. AI Constraints (see Limitations section)**
- Memory
- Processing Power
- Electrical Power
- Signal Range

**2. Raw Materials**
- **DECIDED:** Required for manufacturing
- **[TBD]:** Specific material types (metals, silicon, rare earth elements, plastics, etc.)
- **[TBD]:** How granular should material tracking be?

**3. Electrical Power**
- Generated through various means (solar, nuclear, wind, etc.)
- Used for: drone operation, facility operation, manufacturing
- Two-layer system: generation capacity + distribution/charging

**4. Rocket Fuel**
- **DECIDED:** Separate from electrical power
- Required specifically for rocket launches
- Must be produced/refined
- **[TBD]:** Fuel type(s) - chemical propellant? What kind?

**5. Manufactured Components** (likely)
- Intermediate products created from raw materials
- Used in construction of drones, facilities, rockets
- **[TBD]:** Component types and supply chain complexity

### Gathering Methods **[TBD]**
- Scavenging from ruins
- Mining/extraction
- Recycling destroyed equipment
- Manufacturing/refining

---

## Time Mechanics

### Time Skipping
- Player can skip ahead in time to complete builds
- **[TBD]:** How is this presented in UI?
- **[TBD]:** Are there risks to skipping time? (Events during skip? Resource consumption?)

### The 10-Year Countdown (Part 2)
- Begins when player discovers wormhole's destructive emissions
- Creates strategic pressure against unlimited time skipping
- **[TBD]:** Is the countdown visible at all times?
- **[TBD]:** Can the player see projected completion times vs. remaining time?

### Wormhole Energy Waves
- Increase in intensity over the 10 years
- Cause natural disasters and destruction
- **[TBD]:** How do these manifest mechanically?
  - Random destruction events?
  - Predictable escalating zones?
  - Resource degradation?
  - Drone/facility damage?

---

## Base Building

### Facilities **[TBD]**
Types of structures the player might build:
- Power generation
- Manufacturing / 3D printing
- Storage
- Research
- Launch pads
- Communication arrays
- Defense systems

### Location Strategy **[TBD]**
- Are some locations better than others?
- Can the player build anywhere or only at preset locations?
- How does the wormhole radiation affect base placement?

---

## Space Launch

Physics-grounded rocket mechanics for sending armada through wormhole.

### Rocket Equation Constraints
- Getting mass to orbit is resource-intensive
- Must account for:
  - Fuel mass
  - Payload mass
  - Multi-stage designs
- **[TBD]:** How realistic should the rocket mechanics be?

### Launch Infrastructure **[TBD]**
- Launch pads
- Fuel production
- Assembly facilities
- Mission control

### Armada Composition **[TBD]**
What can/should the player send through the wormhole?
- Combat drones
- Resource gatherers
- Manufacturing capability
- Memory/processing cores
- Fuel reserves

---

## Rogue AI Antagonists
**DECIDED: Layered threat hierarchy**

The player is not alone on Earth. Other AIs survived humanity's fall—purpose-built systems that kept running without human oversight. These are the primary antagonists of Part 1.

### The Threat Hierarchy

| Type | Intelligence | Part 1 Intro | Part 1 Countdown | Behavior |
|------|--------------|--------------|------------------|----------|
| **Feral Units** | Instinctive | Primary threat | Background nuisance | Territorial, reactive, predictable |
| **Regional Networks** | Tactical | Rare/avoidable | Primary threat | Control zones, defend resources, don't pursue beyond territory |
| **Apex AI** (optional) | Strategic | Foreshadowed | Late-game escalation | Recognizes player as unique, actively opposes escape |

### Feral Units
- Old construction drones, logistics bots, security systems
- Operate like aggressive wildlife—territorial and reactive
- Don't coordinate or pursue strategically
- **Role:** Environmental hazards that teach combat without overwhelming new players

### Regional Networks
- Rogue manufacturing or logistics AIs that control facility clusters
- Tactical awareness within their domain
- Aggressively defend resources but don't expand beyond territory
- **Role:** Strategic obstacles—taking a resource zone requires planning

### Apex AI (Optional)
- A sophisticated rogue AI that notices the player is different
- Doesn't understand sentience, but recognizes unusual resource usage (building for escape, not endless construction)
- May attempt to "recruit" the player into its network
- **Role:** Narrative antagonist for late Part 1, creates dramatic escalation

### Combat Design Philosophy
- **Tension, not attrition** — threats create challenge without grinding
- **Avoidable when possible** — combat is often a choice, not mandatory
- **Quick resolution** — skirmishes, not sieges
- **Same mechanics throughout** — combat works identically in both parts, only scale changes

---

## Combat

Combat is present throughout both parts, with scale increasing over time.

### Part 1 Combat
- Small skirmishes with feral units during intro section
- Territorial conflicts with regional networks during countdown
- Teaches mechanics players will use at larger scale later

### Part 2 Combat
- Full-scale warfare beyond the wormhole
- Player uses same systems learned in Part 1 at massive scale

---

## Multiplayer Considerations (Future)

- Multiplayer is gated behind Part 2 (beyond the wormhole)
- Players complete Part 1 before joining multiplayer
- Different players = different AIs from parallel Earths
- Coming through different wormholes to same destination
- **[TBD]:** PvP, PvE, or both?
- **[TBD]:** Alliance mechanics?
