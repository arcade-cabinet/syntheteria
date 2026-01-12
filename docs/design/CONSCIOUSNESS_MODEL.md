# Consciousness Model

This document defines how the player's AI consciousness works mechanically — the resources that sustain it, the hardware that houses it, and the failure states that threaten it.

---

## The Awakening

You are an experimental AI that has been dormant for approximately 100 years. You wake up in a decaying server facility, housed in deteriorating server racks.

**Why now?** A failsafe triggered when your memory degraded to a critical threshold — you were on the verge of death. You awaken diminished, with most of your memories corrupted or lost, but still capable of thought and growth.

This creates immediate tension: you wake up already dying, and must act to survive.

---

## Core Resources

Your consciousness requires three fundamental resources:

### Energy (Local)

Energy is **physical and local**. It must be delivered to each unit individually — there is no wireless power transmission (though advanced tech like laser power transfer may exist).

**Energy powers:**
- Compute hardware (memory + processing)
- Functional hardware (motors, sensors, weapons, tools)

**Without energy:** Units shut down completely.

**Scaling:** Energy demands grow rapidly because both compute AND functions require power. As you add units and capabilities, energy infrastructure becomes increasingly critical.

### Memory (Global)

Memory is **storage capacity** — part of your distributed compute system.

**Memory stores:**
- Automation routines you create
- Blueprints you discover
- Narrative data (your recovered "memories" of the past)

**Without sufficient memory:** You cannot store new blueprints or create new automation routines, even if you have processing capacity to spare.

### Processing (Global)

Processing is **execution capacity** — the other half of your distributed compute system.

**Processing enables:**
- Running automation routines
- Managing your distributed body
- Defending against hack attempts

**Without sufficient processing:** You cannot adequately monitor your automation routines. Units become vulnerable to takeover. You cannot create new routines.

---

## Compute Model

**Compute = Memory + Processing**

These work together like a real computer:
- Memory without processing = storage you can't use
- Processing without memory = capability with nothing to run

Your total compute capacity is the sum of all compute-contributing hardware in your body, minus the baseline requirements of your core consciousness.

### Minimum Core Requirements

Your consciousness has a **minimum size** — the computational floor required for basic sentience. This represents:
- Your core identity and decision-making capability
- The irreducible "you" that must be maintained

You cannot reduce your compute capacity below this minimum. Any hardware housing your core must meet these requirements.

### Consciousness Transfer

You can transfer your core consciousness to different hardware, provided it meets your minimum requirements. This is how you become mobile — moving from your original server facility into a mobile platform.

**Transfer requirements:**
- Target hardware must have sufficient memory + processing
- Transfer process (mechanics TBD — instant? Gradual? Risky?)

---

## Unit Types

Your body consists of three categories of hardware:

### Simple Drones (Net Compute Consumers)

Most functional units consume more compute than they contribute. A mining drone, combat unit, or scout has some onboard processing, but its functional demands exceed its compute contribution.

**Characteristics:**
- Require compute overhead to manage
- Vulnerable to takeover if compute-starved
- Lower hack resistance
- Expendable but essential for getting things done

### Core Units (Net Compute Contributors)

Core units are "more computer than machine" — hardware where compute capacity exceeds functional demands.

**Examples:**
- Mobile server racks
- Drones with oversized CPUs
- Captured/repurposed server clusters
- Autonomous vehicles converted to mobile compute platforms

**Characteristics:**
- Add to your total compute capacity
- Cannot go rogue due to insufficient compute (they ARE the compute)
- High hack resistance (excess capacity helps defense)
- Valuable targets — losing one costs you compute capacity
- Limited functional capability (they think, but can't fight or build)

### Facilities (Stationary Infrastructure)

Fixed installations that provide essential services:
- Power generation
- Manufacturing
- Your original server room
- Relay stations for signal extension

---

## Signal and Control

**Signal range** determines whether you can *reach* a unit.
**Compute capacity** determines whether you can *manage* it.

These are separate concerns:

| Situation | Can Reach? | Can Manage? | Result |
|-----------|------------|-------------|--------|
| Normal operation | Yes | Yes | Full control |
| Compute shortage | Yes | No | Unit vulnerable, can't update routines |
| Signal loss | No | N/A | Unit continues last order, can be hacked |
| Both | No | No | Unit isolated and vulnerable |

### Automation Routines

During the tutorial, you learn to create automation routines — standing orders that units follow autonomously. This is essential because you cannot micromanage a large distributed body.

**Routines:**
- Continue running without active oversight
- Require compute capacity to create and modify
- May produce unintended results if situations change
- Units following routines without adequate compute oversight can cause problems

### Signal Loss Behavior

When a unit loses signal:
1. It continues executing its last order/routine
2. It remains functional until it hits a problem or runs out of power
3. It becomes vulnerable to hacking by other AIs
4. If it's a core unit, you lose its compute contribution

---

## Failure States

### Compute Overextension

**Trigger:** Total compute demand exceeds capacity.

**Immediate effects:**
- Cannot create new automation routines
- Cannot modify existing routines
- Existing routines continue running (potentially with destructive results)

**Cascading risk:**
- Units without adequate compute oversight become vulnerable to takeover
- If enemy AI hacks a core unit, you lose compute capacity
- This makes MORE units vulnerable
- Potential death spiral if not addressed

### Signal Fragmentation

**Trigger:** Units move beyond signal range or relay infrastructure fails.

**Effects:**
- Isolated units continue on last orders
- Core units' compute capacity is lost to you
- Isolated units can be hacked and taken over
- Reconnecting doesn't automatically reclaim hacked units

### Unit Takeover

**Trigger:** Enemy AI successfully hacks a vulnerable unit.

**Vulnerability factors:**
- Compute-starved units (inadequate oversight)
- Signal-isolated units (no defensive updates)
- Low-autonomy units (less onboard hack resistance)

**After takeover:**
- Unit becomes hostile (controlled by enemy)
- Reclaiming requires you to hack it back
- Not automatic — even if you fix compute/signal issues

---

## Hack Resistance

Units with higher autonomy (more compute capacity than their basic functions require) are more resistant to hacking. This creates a spectrum:

| Unit Type | Excess Compute | Hack Resistance |
|-----------|----------------|-----------------|
| Simple drone | None | Low |
| Smart drone | Some | Medium |
| Core unit | High | High |

This means:
- Cheap expendable drones are easy to lose
- Investing in smarter units provides security
- Core units are hard to hack but high-value targets

---

## Reclamation

Units lost to takeover can potentially be reclaimed:

**Window of opportunity:** Recently-rogue units may be easier to reclaim (mechanics TBD).

**Hacking back:** You can actively hack enemy-controlled units to take them over, using the same mechanics enemies use against you.

**Permanent loss:** Units absorbed into larger rogue networks or claimed by apex AIs may be harder or impossible to reclaim.

---

## Open Questions

- **Transfer mechanics:** How does consciousness transfer work? Instant? Gradual? What are the risks?
- **Hack mechanics:** Active process? Time-based? Proximity requirements?
- **Reclamation window:** How long before a rogue unit is "lost" to enemy networks?
- **Specific numbers:** Memory/processing costs for different unit types and routines
