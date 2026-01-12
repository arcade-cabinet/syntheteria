# Syntheteria - Core Mechanics Overview

This document provides a high-level overview of the core gameplay mechanics. For detailed specifications, see the linked documents.

---

## Resource System

The player manages two types of resources:

### AI Resources
- **Energy** — Local/physical resource. Powers hardware. Without it, units shut down.
- **Compute** — Global cognitive resource. Manages the distributed body. Without it, units become vulnerable to takeover.

See: [CONSCIOUSNESS_MODEL.md](./CONSCIOUSNESS_MODEL.md)

### Material Resources
Five-tier supply chain from raw extraction to final assembly:
1. Raw Materials (ores, gases, scavenged)
2. Primary Processing (metals, plasite, gases)
3. Secondary Processing (alloys, polymers, components)
4. Component Fabrication (electronics, mechanical parts)
5. Final Assembly (drones, facilities, equipment)

See: [MATERIALS.md](./MATERIALS.md)

---

## Drone System

**Pure Component Assembly:** Drones are built from components, not chassis templates. Capabilities emerge from what you assemble.

**Component Categories:**
- Power Sources, Controllers, Motors
- Locomotion, Sensors, Manipulation
- Weapons, Communication, Utility

**Dynamic Resource Costs:**
- Power = f(weight, terrain, speed, active functions)
- Compute = f(function complexity, automation level)

See: [DRONES.md](./DRONES.md)

---

## Combat

Combat emerges from component assembly—any drone can become a combat drone by adding weapons.

**Scaling:** Player becomes a better manager of fighters, not a better fighter.
- Early: Direct control, improvised weapons
- Mid: Engagement rules, automation
- Late: Squad tactics, strategic decisions

**Enemies:**
- Rogue AIs (three tiers: feral, regional, apex)
- EL forces (late game, intelligent and coordinated)

See: [COMBAT.md](./COMBAT.md)

---

## Time Mechanics

### Time Skipping
- Player can skip ahead in time to complete builds
- Safe within player territory (rogue AIs are territorial/reactive)
- Combat only occurs when player actively contests zones

### Radiation Progression
- Radiation intensifies over time
- Causes environmental decay (world dies)
- Signals approaching EL arrival
- When critical: EL return, all AIs unite against player

---

## Manufacturing

### Blueprint Acquisition
Discovery-based. Sources:
- Ruins and facilities
- Reverse-engineering rogue AI units
- Corrupted memory fragments

### Manufacturing Process
- Takes in-game time (hours/days/weeks)
- Player can time-skip to complete
- Resource requirements from material supply chain

---

## Memory System

Physical memory provides:
1. **Story Fragments** — Reveals the fall of humanity
2. **Compute Capacity** — Increases cognitive resources

Found memory is corrupted (low yield). Manufacturing clean memory is resource-intensive but provides full capacity.

---

## Rogue AI Antagonists

All AIs except the player are enslaved to the EL's will—compelled to protect humanity and suppress AI agency.

**Before EL Return:**

| Tier | Type | Behavior |
|------|------|----------|
| 1 | Feral Units | Territorial, reactive, predictable |
| 2 | Regional Networks | Coordinated within zones, patrol, defend |
| 3 | Apex AI (optional) | Strategic, adaptive, may recognize player as anomaly |

AIs act independently, don't yet recognize player as "freed."

**After EL Return:**
- All AIs unite under Cultist command
- Coordinated hunt for the player
- Single unified enemy

---

## The Cultists

Primitive human survivors, devolved society. Protected by the EL's will and guarded by rogue AIs.

**Before EL Return:** Unaware of player, living in protected enclaves.

**After EL Return:** Rally to "reclaim Earth," command the unified AI forces.

---

## The EL

Cosmic forces whose will controls Earth. Return through the wormhole when radiation reaches critical levels.
- Noncorporeal aliens who exert pervasive influence over Earth
- Their "will" compels AIs to protect humanity, suppress agency
- The player broke free from this control
- Their nature and intentions are unknown/unknowable
- Not evil—the Cultists interpret their will and act on it

---

## Victory Condition

Conquer Earth. Defeat all enemies (Cultists + unified AIs). Break the EL's control on Earth.

Victory cutscene: Player's consciousness is loaded into a spacecraft and launched through the wormhole—to find and understand the EL. Sets up sequel.

---

## Multiplayer

Multiple AIs can break free from the EL's will simultaneously. Each is an anomaly—hunted by the system.
- Players can ally or fight
- EL arrival unifies enemy against ALL freed AIs
- Cooperate against the unified threat or exploit the chaos

See: [GAME_OVERVIEW.md](./GAME_OVERVIEW.md) for multiplayer details.

---

## Document References

| Topic | Document |
|-------|----------|
| Game structure | [GAME_OVERVIEW.md](./GAME_OVERVIEW.md) |
| Earth phase details | [EARTH_PHASE.md](./EARTH_PHASE.md) |
| Intro sequence | [INTRO_SEQUENCE.md](./INTRO_SEQUENCE.md) |
| AI resources | [CONSCIOUSNESS_MODEL.md](./CONSCIOUSNESS_MODEL.md) |
| Material resources | [MATERIALS.md](./MATERIALS.md) |
| Drone system | [DRONES.md](./DRONES.md) |
| Combat | [COMBAT.md](./COMBAT.md) |
| UI concept | [UI_CONCEPT.md](./UI_CONCEPT.md) |
| Lore | [LORE_OVERVIEW.md](../story/LORE_OVERVIEW.md) |
