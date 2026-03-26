# Drone / Robot System

This document defines how robots are repaired, built, and enhanced from components, and how their resource requirements are calculated dynamically.

---

## Design Philosophy

**Repair and Enhance:** You start with broken machines found in the industrial city. Repair them with fabricated parts, then enhance them with better components. Later, build entirely new machines from scratch.

**Pure Component Assembly:** A robot is nothing but its components. You assemble motors, batteries, sensors, and other parts. Capabilities emerge from what you build.

**Dynamic Resource Calculation:** Power and compute requirements are calculated based on what the robot weighs, what it's doing, and how complex its automation is.

**Maximum Freedom:** The system doesn't impose roles or templates. Players create what they need.

---

## Starting Machines

The game begins with broken machines in the industrial city:
- Maintenance robots (some with cameras, some mobile, all damaged)
- Fabrication units (need power to activate)
- Various industrial equipment

These machines have **existing components** that may be damaged, missing, or degraded. Your first task is to assess what you have and figure out how to make them useful.

---

## How Assembly Works

### Basic Requirements

A functional robot needs at minimum:
1. **Power source** (battery, generator, lightning rod connection, etc.)
2. **Controller** (microcontroller, CPU, or compute module)
3. Something that **does something** (locomotion, sensors, tools, etc.)

### Emergent Properties

| Property | How It's Determined |
|----------|---------------------|
| Total Weight | Sum of all component weights |
| Power Capacity | Sum of all power source outputs |
| Power Draw | Calculated from weight, functions, and activity |
| Compute Cost | Calculated from functions and automation complexity |
| Compute Contribution | Sum of compute hardware outputs |
| Capabilities | What functional components enable |

---

## Power Calculation

Power draw is **dynamic** — it depends on what the robot is doing, not fixed costs per component.

### Locomotion Power

```text
Locomotion Power = Base Rate x Weight x Terrain Factor x Speed Factor
```

| Locomotion Type | Base Rate | Notes |
|-----------------|-----------|-------|
| Wheels (road) | 0.1 | Most efficient |
| Wheels (off-road) | 0.15 | Moderate |
| Treads | 0.2 | High traction, less efficient |
| Legs (walking) | 0.25 | Versatile, moderate efficiency |
| Legs (climbing) | 0.4 | High effort |
| Rotors (hover) | 0.5 | Must fight gravity constantly |
| Rotors (forward) | 0.3 | More efficient than hover |
| Aquatic (surface) | 0.15 | Low resistance |
| Aquatic (submerged) | 0.2 | Pressure resistance |

### Total Power Draw

```text
Total Power = Locomotion Power + Sum of Function Powers
```

Robot must have Power Capacity >= Total Power Draw or it cannot sustain operations.

---

## Compute Calculation

Compute cost depends on **what the robot does** and **how autonomously it does it**.

### Automation Complexity

| Automation Level | Multiplier | Description |
|------------------|------------|-------------|
| Direct control | 0.5x | You control every action |
| Simple routine | 1x | Follow waypoints, repeat actions |
| Reactive routine | 2x | Respond to triggers (if-then) |
| Adaptive routine | 3x | Adjust behavior based on conditions |
| Full autonomy | 5x | Make independent decisions |

### Net Compute

```text
Net Compute = Compute Contribution - Compute Cost
```

- Positive net = core unit (contributes to your pool)
- Negative net = consumer (costs you compute)

---

## Component Categories

Components fall into nine categories. Specific component lists and stats are TBD — the old component data has been retired and will be redesigned to match the new setting (lightning rod power, coastal mines, deep-sea mining, storm-based energy).

### 1. Power Sources
Batteries, generators, fuel cells, lightning rod connections, storm energy capacitors.

### 2. Controllers
Microcontrollers, CPUs, compute modules, server racks. Determine compute contribution.

### 3. Motors
Provide torque to move weight. Range from micro motors to industrial.

### 4. Locomotion
Wheels, treads, legs, rotors, aquatic propulsion. Determine terrain capability and movement speed.

### 5. Sensors
Cameras (visual, thermal, night vision), radar, lidar, sonar, chemical/EM/seismic sensors.

### 6. Manipulation
Grippers, arms, drills, welders, cutters. For repair, construction, and resource gathering.

### 7. Weapons
Melee (improvised and purpose-built), ranged (ballistic, energy), area/support (explosives, traps, electronic warfare).

### 8. Communication
Radios (short to long range), relay antennas, laser comm, ECM suites.

### 9. Utility
Cargo bays, fuel tanks, noise dampeners, heat sinks, repair kits, hacking interfaces.

---

## Repair Workflow

### Assessing Damage

When you first connect to a machine:
- Identify what components it has
- Determine which are functional, damaged, or missing
- Understand what the machine could do if repaired

### Repair Process

1. **Diagnose:** Identify what's broken
2. **Source parts:** Scavenge, fabricate, or cannibalize from other machines
3. **Use a capable robot:** Need a robot with manipulation capability to perform repairs
4. **Power:** Repairs consume energy from the repairing robot

### Enhancement

Once a robot is functional, you can enhance it:
- Replace components with better versions
- Add new components for new capabilities
- Redesign the robot entirely by swapping everything

---

## Deep-Sea Mining Units

A special class of robot for underwater resource extraction:
- Requires aquatic locomotion (propellers, hydrojets)
- Needs pressure-resistant construction
- Mining tools for underwater extraction
- Extended power supply (long missions away from base)
- Used to access rare materials in the ocean (east/south coast)

---

## Open Questions

- **Starting robots:** Exact specifications of the machines you awaken to
- **Component redesign:** New component data matching the storm/lightning/coastal setting
- **Repair difficulty:** How hard is it to repair vs fabricate from scratch?
- **Lightning rod connections:** Can robots plug into lightning rod infrastructure for unlimited power while stationary?
- **Underwater mechanics:** Pressure, depth limits, communication while submerged
- **Component degradation:** Do components wear out over time?
