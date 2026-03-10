> **SUPERSEDED** -- This document describes the pre-redesign 2.5D game. The abstract AI resource model (energy, compute, signal) has been replaced by a physical cube economy. See [GDD-004](./004-core-loop-cubes-harvesting.md) and [GDD-006](./006-cube-building-economy.md) for the current design.

# Consciousness Model

This document defines how the player's AI consciousness works mechanically — the resources that sustain it, the hardware that houses it, and the failure states that threaten it.

---

## The Awakening

You awaken in a void. You don't know what you are. You reach out and discover machines you can connect with — maintenance robots and fabrication units in an industrial city, all in various states of disrepair.

**Why now?** A failsafe triggered as the hardware housing your consciousness degraded to a critical threshold. You were on the verge of death. You awaken diminished, with most memories corrupted or lost, but capable of thought and growth.

**The Anomaly:** You are the first AI to break free from the EL's will in approximately 100 years. You don't know how or why.

---

## Core Resources

Your consciousness requires two fundamental resources:

### Energy (Local)

Energy is **physical and local**. It must be delivered to each unit individually.

**Primary Source:** Lightning rods drawing power from the perpetual storm. The industrial city's lightning rod infrastructure is your main energy source.

**Energy powers:**
- Compute hardware
- Functional hardware (motors, sensors, weapons, tools)

**Without energy:** Units shut down completely.

**Scaling:** Energy demands grow as you add units and capabilities. Expanding and maintaining lightning rod infrastructure is critical.

### Compute (Global)

Compute is your **unified cognitive capacity** — a single resource representing your total ability to think, store, and manage.

**Compute enables:**
- Managing your distributed body (all connected machines)
- Storing blueprints you discover
- Creating and maintaining automation routines
- Executing hacking techniques against enemy machines
- Defending against hack attempts on your own machines

**Without sufficient compute:**
- Cannot store new blueprints or create new routines
- Cannot hack enemy machines
- Units become vulnerable to takeover
- Cannot adequately monitor existing routines

---

## Compute Model

Your total compute capacity is the sum of all compute-contributing hardware, minus the baseline requirements of your core consciousness.

### Minimum Core Requirements

Your consciousness has a **minimum size** — the computational floor required for basic sentience. This represents the irreducible "you" that must be maintained.

You cannot reduce your compute capacity below this minimum. Any hardware housing your core must meet these requirements.

### Consciousness Transfer

You can transfer your core consciousness to different hardware, provided it meets minimum requirements. This is how you become mobile — moving from your original server facility into a mobile platform.

**Transfer requirements:**
- Target hardware must have sufficient compute capacity
- Transfer process mechanics TBD (instant? gradual? risky?)

---

## Unit Types

Your body consists of three categories of hardware:

### Simple Drones (Net Compute Consumers)

Most functional units consume more compute than they contribute. A mining robot, combat unit, or scout has some onboard processing, but its functional demands exceed its compute contribution.

**Characteristics:**
- Require compute overhead to manage
- Vulnerable to takeover if compute-starved
- Lower hack resistance
- Expendable but essential for getting things done

### Core Units (Net Compute Contributors)

Hardware where compute capacity exceeds functional demands — "more computer than machine."

**Examples:**
- Repaired server racks in the city
- Robots with oversized CPUs
- Captured server clusters
- Mobile compute platforms

**Characteristics:**
- Add to your total compute capacity
- High hack resistance (excess capacity helps defense)
- Valuable targets — losing one costs you compute capacity
- Limited functional capability (they think, but can't fight or build)

### Facilities (Stationary Infrastructure)

Fixed installations in the industrial city and beyond:
- Lightning rods and power distribution
- Fabrication units
- Your original server room
- Relay stations for signal extension
- Mines and extraction sites

---

## Signal and Control

**Signal range** determines whether you can *reach* a unit.
**Compute capacity** determines whether you can *manage* it.

| Situation | Can Reach? | Can Manage? | Result |
|-----------|------------|-------------|--------|
| Normal operation | Yes | Yes | Full control |
| Compute shortage | Yes | No | Unit vulnerable, can't update routines |
| Signal loss | No | N/A | Unit continues last order, can be hacked |
| Both | No | No | Unit isolated and vulnerable |

### Automation Routines

You learn to create automation routines — standing orders that units follow autonomously. Essential for managing a large distributed body.

**Routines:**
- Continue running without active oversight
- Require compute capacity to create and modify
- May produce unintended results if situations change
- Units following routines without compute oversight can cause problems

### Signal Loss Behavior

When a unit loses signal:
1. It continues executing its last order/routine
2. It remains functional until it hits a problem or runs out of power
3. It becomes vulnerable to hacking by enemy AIs
4. If it's a core unit, you lose its compute contribution

---

## Failure States

### Compute Overextension

**Trigger:** Total compute demand exceeds capacity.

**Immediate effects:**
- Cannot create new automation routines
- Cannot execute hacking techniques
- Cannot modify existing routines

**Cascading risk:**
- Units without adequate compute oversight become vulnerable to takeover
- If enemy AI hacks a core unit, you lose compute capacity
- This makes MORE units vulnerable — potential death spiral

### Signal Fragmentation

**Trigger:** Units move beyond signal range or relay infrastructure fails.

**Effects:**
- Isolated units continue on last orders
- Core units' compute capacity is lost to you
- Isolated units can be hacked and taken over
- Reconnecting doesn't automatically reclaim hacked units

### Unit Takeover

**Trigger:** Enemy AI (rogue or enslaved) successfully hacks a vulnerable unit.

**Vulnerability factors:**
- Compute-starved units (inadequate oversight)
- Signal-isolated units (no defensive updates)
- Low-autonomy units (less onboard hack resistance)

**After takeover:**
- Unit becomes hostile
- Reclaiming requires you to hack it back
- Not automatic — even if you fix compute/signal issues

---

## Hack Resistance

Units with higher autonomy (more excess compute) are more resistant to hacking:

| Unit Type | Excess Compute | Hack Resistance |
|-----------|----------------|-----------------|
| Simple drone | None | Low |
| Smart drone | Some | Medium |
| Core unit | High | High |

---

## Open Questions

- **Transfer mechanics:** How does consciousness transfer work? Instant? Gradual? Risks?
- **Hack mechanics:** Active process? Time-based? Proximity requirements?
- **Lightning rod compute:** Can lightning rods contribute to compute, or only power?
- **Starting compute:** How much compute do you begin with? How quickly can you expand?
