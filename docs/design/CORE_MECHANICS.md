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

### Drone Types **[TBD]**
Potential categories:
- Scouts / Exploration
- Builders / Constructors
- Harvesters / Resource gatherers
- Combat / Defense
- Transport / Logistics
- Specialized (research, repair, etc.)

### Limitations
**DECIDED: Four core constraints**

1. **Memory** - Physical storage capacity affects:
   - Story progression (memory fragments)
   - Overall capability expansion
   - **[TBD]:** Specific gameplay effects

2. **Processing Power** - Computational capacity affects:
   - Number of drones controllable simultaneously?
   - Complexity of autonomous behaviors?
   - **[TBD]:** Specific gameplay effects

3. **Electrical Power** - Energy supply affects:
   - Drone operation
   - Facility operation
   - **[TBD]:** Is this a moment-to-moment resource or a strategic one?

4. **Signal Range** - Communication distance affects:
   - How far drones can operate from core/relays
   - Expansion strategy
   - **DECIDED:** Can be extended through **relay stations** and eventually **satellites**

---

## 3D Printing / Manufacturing

Unlocked during Part 1, becomes central to Part 2.

### How It Works **[TBD]**
- **Blueprints:** How are designs acquired? (Research? Memory unlocks? Discovery?)
- **Materials:** What raw materials are needed? How are they gathered?
- **Time:** How long do prints take? Can they be queued?
- **Facilities:** Can printers be improved? Can you build more printers?

### What Can Be Printed **[TBD]**
- Drone components / upgrades
- New drones
- Base/facility components
- Rocket parts
- Weapons systems
- **[TBD]:** Full list of printable items

---

## Resource Management

### Resource Types **[TBD]**
Potential resources to track:
- **Raw Materials:** Metal, plastic, silicon, rare elements
- **Energy:** Power generation and storage
- **Memory/Processing:** AI's computational capacity
- **Manufactured Components:** Intermediate products
- **Fuel:** For rockets and possibly drones

### Gathering Methods **[TBD]**
- Scavenging from ruins
- Mining/extraction
- Recycling destroyed equipment
- Manufacturing from raw materials

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

## Combat (Part 3 Preview)

Combat becomes relevant in Part 3.

### Part 2 Preparation
- Player must bring "sufficient firepower" through wormhole
- Building up forces on the other side will be harder
- **[TBD]:** Should there be any combat in Parts 1-2? (Defense against hazards? Automated systems?)

---

## Multiplayer Considerations (Future)

- Players complete Part 2 before joining multiplayer
- Different players = different AIs from parallel Earths
- Coming through different wormholes to same destination
- **[TBD]:** PvP, PvE, or both?
- **[TBD]:** Alliance mechanics?
