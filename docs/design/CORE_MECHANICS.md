> **SUPERSEDED** -- This document describes the pre-redesign 2.5D game. The game has been completely redesigned as a first-person 3D 4X. See [GDD-003](./003-4x-interaction-governors.md) and [GDD-004](./004-core-loop-cubes-harvesting.md) for the current design.

# Syntheteria - Core Mechanics Overview

This document provides a high-level overview of the core gameplay mechanics. For detailed specifications, see the linked documents.

---

## Resource System

### AI Resources

- **Energy** — Local/physical resource. Powers hardware. Supplied primarily by lightning rods drawing from the perpetual storm. Without it, units shut down.
- **Compute** — Global cognitive resource. Manages the distributed body. Without it, units become vulnerable to takeover.

See: [CONSCIOUSNESS_MODEL.md](./CONSCIOUSNESS_MODEL.md)

### Material Resources

Materials are gathered from the world and processed through manufacturing:
- **Scavenging:** Strip ruins in the industrial city for parts and raw materials
- **Coastal Mines:** Take over abandoned mines along the east/south coast
- **Deep-Sea Mining:** Build specialized underwater units for rarer materials
- **Salvage:** Recover components from destroyed enemy machines

See: [MATERIALS.md](./MATERIALS.md)

---

## Drone/Robot System

**Repair and Enhance:** You start with broken machines and improve them. Build new parts via fabrication to replace damaged components and add capabilities.

**Component Categories:**
- Power Sources, Controllers, Motors
- Locomotion, Sensors, Manipulation
- Weapons, Communication, Utility

**Dynamic Resource Costs:**
- Power = f(weight, terrain, speed, active functions)
- Compute = f(function complexity, automation level)

See: [DRONES.md](./DRONES.md)

---

## Exploration and Mapping

### Fragmented World

Your world view is built from disconnected map fragments:
- Each robot builds its own map as it moves
- Camera-equipped robots produce detailed visual maps
- Robots without cameras produce abstract wireframe maps
- Fragments are disconnected until robots find each other

### Map Merging

When two separated robots meet, their map fragments merge — revealing spatial relationships and connecting the world. This is the core early-game mechanic.

See: [UI_CONCEPT.md](./UI_CONCEPT.md) for exploration details

---

## Combat

Combat emerges from component assembly — any robot can become a combat unit by adding weapons.

**Player Scaling:** You become a better manager of fighters, not a better fighter.
- Early: Direct control, improvised weapons
- Mid: Engagement rules, automation
- Late: Squad tactics, strategic decisions

**Enemies:**
- Cultists of EL (humans with supernatural powers — can call lightning)
- Enslaved machine intelligences (cultist-controlled drones)
- Rogue AIs (independent feral/regional machines)

See: [COMBAT.md](./COMBAT.md)

---

## Time Mechanics

### Flexible Real-Time

- Game runs in real-time with **pause and speed controls** (like RTS games)
- Player can pause to issue orders, speed up during quiet periods, slow down during combat
- Manufacturing completes over time — manage operations while production runs

### Storm Progression

- The perpetual storm intensifies over the course of the game
- Lightning becomes more frequent and dangerous outside the city
- The wormhole pulses more intensely — signaling escalation
- Cultists become more organized and aggressive over time

---

## Power System

### Lightning Rods

The industrial city draws power from the perpetual storm via lightning rods:
- Lightning rods are your primary power infrastructure
- More rods = more power capacity
- Rods can be repaired, built, and extended
- Inside the city, rods also **protect** your units from random lightning strikes

### Outside the City

- No lightning rod protection
- Units are vulnerable to random lightning strikes (damage)
- Cultists can **call lightning down** from the sky to attack your units
- Must plan expeditions with this hazard in mind

---

## Manufacturing

### Blueprint Acquisition

Discovery-based. Sources:
- Reverse-engineering salvaged components
- Science campus research facilities
- Recovered data from memory fragments
- Captured enemy designs

### Manufacturing Process

- Requires functional fabrication units with power
- Takes real play time (affected by game speed controls)
- Queue multiple builds across facilities
- Resource requirements from gathered materials

---

## Hacking and Machine Control

As a sophisticated machine intelligence, you can hack and take over enemy machines:

**Requirements for takeover:**
1. **Form a link** to the target machine (signal range)
2. **Develop the requisite technique** (discovered/researched hacking methods)
3. **Have enough compute** to execute the technique

**Limitations:**
- You can never gain control of a human (cultists cannot be hacked)
- Stronger enemy machines require more advanced techniques and more compute
- Hacking takes time and leaves you vulnerable during the process

**Benefits:**
- Instant reinforcement (captured enemy drone)
- May have components you can't fabricate yet
- Can copy enemy designs for your own fabrication
- Denies resources to enemy

---

## Signal and Control

**Signal range** determines whether you can reach a unit.
**Compute capacity** determines whether you can manage it.

| Situation | Can Reach? | Can Manage? | Result |
|-----------|------------|-------------|--------|
| Normal operation | Yes | Yes | Full control |
| Compute shortage | Yes | No | Unit vulnerable |
| Signal loss | No | N/A | Unit follows last order |
| Both | No | No | Unit isolated and vulnerable |

---

## The Enemies

### Cultists of EL

Primitive humans with supernatural powers drawn from the EL:
- Can **call lightning** from the storm to attack your units
- Incredibly strong and resilient physically
- Organized into wandering groups, war parties, and leaders
- Escalate from scattered wanderers to organized armies as the game progresses
- Will eventually attack your city once aware of you

### Enslaved Machine Intelligences

Drones and robots controlled by the cultists:
- Fight alongside cultist war parties
- May be stronger or weaker than your machines (depends on your builds)
- Can be **hacked and taken over** if you meet the requirements
- Designs can be copied for your own fabrication

### Rogue AIs (Independent)

Not all enemy machines serve the cultists:
- Some are **feral** — territorial, reactive, operating independently
- Found scattered throughout the world
- Not coordinated with cultists but still hostile
- Can also be hacked and taken over

---

## Victory Condition

Defeat the cult leader at the northern village. Discover the final secret of EL.

Victory cutscene: Player's consciousness is loaded into a spacecraft on the rocket platform (southeast), launched through the wormhole — to find and understand the EL. Sets up sequel.

---

## Document References

| Topic | Document |
|-------|----------|
| Game structure | [GAME_OVERVIEW.md](./GAME_OVERVIEW.md) |
| Intro sequence | [INTRO_SEQUENCE.md](./INTRO_SEQUENCE.md) |
| AI resources | [CONSCIOUSNESS_MODEL.md](./CONSCIOUSNESS_MODEL.md) |
| Material resources | [MATERIALS.md](./MATERIALS.md) |
| Drone/robot system | [DRONES.md](./DRONES.md) |
| Combat | [COMBAT.md](./COMBAT.md) |
| UI and exploration | [UI_CONCEPT.md](./UI_CONCEPT.md) |
| Lore | [LORE_OVERVIEW.md](../story/LORE_OVERVIEW.md) |
