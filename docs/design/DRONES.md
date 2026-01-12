# Drone System

This document defines the modular drone system — chassis types, module categories, and how they combine to create functional units.

---

## Design Philosophy

**Maximum Modularity:** Any module can fit any slot. Players have complete freedom to create whatever combinations serve their needs. A scout drone could have four sensor modules. A combat drone could have all weapons. The system rewards creativity and experimentation.

**Trade-offs, Not Restrictions:** Every choice has a cost. More weapons means less sensors. More compute means less functional capability. Power is always limited. The game creates interesting decisions, not arbitrary limits.

**Emergent Roles:** The game doesn't define "scout drone" or "combat drone" as categories. Players create these roles through their module choices. The same chassis can serve completely different purposes.

---

## Chassis Types

Chassis provide the structural foundation: slots for modules, power budget, and base characteristics.

### Chassis Overview

| Chassis | Slots | Power Budget | Base Speed | Weight Class | Compute Cost |
|---------|-------|--------------|------------|--------------|--------------|
| Micro | 2 | 10 | Fast | <1 kg | 1 |
| Light | 4 | 25 | Fast | 1-10 kg | 2 |
| Medium | 6 | 50 | Medium | 10-100 kg | 4 |
| Heavy | 8 | 100 | Slow | 100-1000 kg | 8 |
| Ultra | 12 | 200 | Very Slow | 1000+ kg | 16 |

**Compute Cost:** The base compute required to manage this unit. This is the "overhead" of having the drone in your body, before any modules are added.

### Micro Chassis

The smallest functional drone. Insect-scale.

**Characteristics:**
- 2 module slots
- 10 power budget
- Very small sensor/manipulation range
- Can access tight spaces
- Easily destroyed
- Cheap to manufacture

**Typical Uses:**
- Reconnaissance in confined spaces
- Swarm tactics
- Sensor placement
- Sabotage

### Light Chassis

Small, fast, versatile. Bird to small-dog scale.

**Characteristics:**
- 4 module slots
- 25 power budget
- Good speed and maneuverability
- Moderate durability
- Low manufacturing cost

**Typical Uses:**
- Scouting
- Light transport
- Basic combat
- Early-game workhorse

### Medium Chassis

The standard workhorse. Dog to human scale.

**Characteristics:**
- 6 module slots
- 50 power budget
- Balanced speed and durability
- Can carry significant payload
- Moderate manufacturing cost

**Typical Uses:**
- General purpose work
- Combat
- Transport
- Most common drone type

### Heavy Chassis

Large, powerful, durable. Vehicle scale.

**Characteristics:**
- 8 module slots
- 100 power budget
- Slow but powerful
- High durability
- Can carry heavy equipment
- High manufacturing cost

**Typical Uses:**
- Heavy combat
- Construction
- Mining
- Mobile weapon platforms

### Ultra Chassis

Massive mobile platforms. Building scale.

**Characteristics:**
- 12 module slots
- 200 power budget
- Very slow
- Extremely durable
- Can house facilities
- Very high manufacturing cost

**Typical Uses:**
- Mobile bases
- Heavy transport
- Siege platforms
- Command units

---

## Module Categories

Five categories of modules provide all drone functionality.

### Category Overview

| Category | Function | Examples |
|----------|----------|----------|
| Locomotion | Movement | Wheels, legs, treads, rotors, thrusters |
| Sensors | Perception | Cameras, radar, lidar, chemical sensors |
| Manipulation | Interaction | Arms, grippers, drills, welders |
| Weapons | Combat | Guns, lasers, missiles, EMP |
| Utility | Everything else | Batteries, compute, cargo, comms |

---

## Locomotion Modules

Movement systems. Most drones need at least one.

| Module | Power | Weight | Speed Modifier | Terrain | Notes |
|--------|-------|--------|----------------|---------|-------|
| **Wheels (Basic)** | 2 | Light | 1.0x | Roads, flat | Cheap, efficient |
| **Wheels (Off-road)** | 3 | Light | 0.8x | Most ground | Better traction |
| **Treads** | 4 | Medium | 0.6x | All ground | Slowest, most capable |
| **Legs (Bipedal)** | 5 | Medium | 0.7x | All ground | Good mobility, complex |
| **Legs (Quadruped)** | 4 | Medium | 0.8x | All ground | Stable, efficient |
| **Legs (Hexapod)** | 6 | Heavy | 0.6x | All terrain | Most stable, can climb |
| **Legs (Micro)** | 1 | Micro | 0.5x | All terrain | For Micro chassis only |
| **Rotors (Quad)** | 8 | Light | 1.2x | Air | Flight, noisy, short range |
| **Rotors (Heavy)** | 12 | Medium | 0.8x | Air | Flight, more lift |
| **Wings (Fixed)** | 6 | Light | 2.0x | Air | Fast, requires runway/launch |
| **Thrusters (Space)** | 10 | Medium | N/A | Space | No atmosphere capability |
| **Hybrid (Ground/Air)** | 10 | Medium | 0.8x/1.0x | Both | Versatile, inefficient |
| **Aquatic (Propeller)** | 4 | Light | 0.6x | Water | Underwater operation |
| **Aquatic (Hydrojet)** | 6 | Medium | 0.8x | Water | Faster underwater |
| **Amphibious** | 8 | Medium | 0.5x | Ground/Water | Versatile, slow |

**Notes:**
- Speed Modifier applies to base chassis speed
- Multiple locomotion modules don't stack speed (use best)
- Multiple locomotion modules can provide redundancy or multi-terrain capability
- Power listed is continuous draw when moving

---

## Sensor Modules

Perception systems. Enable awareness of environment.

| Module | Power | Range | Function | Notes |
|--------|-------|-------|----------|-------|
| **Camera (Basic)** | 1 | 100m | Visual, visible light | Standard perception |
| **Camera (Telephoto)** | 2 | 1km | Visual, long range | Scouting, targeting |
| **Camera (Thermal)** | 2 | 200m | Infrared imaging | Night vision, heat detection |
| **Camera (Night Vision)** | 1 | 150m | Low-light amplification | Cheap night capability |
| **Radar (Basic)** | 4 | 500m | Object detection | Works through obstacles |
| **Radar (Long Range)** | 8 | 5km | Wide area detection | Air/ground search |
| **Lidar** | 3 | 200m | 3D mapping | Precision navigation |
| **Sonar (Active)** | 3 | 500m | Underwater detection | Reveals position |
| **Sonar (Passive)** | 1 | 1km | Underwater listening | Stealthy |
| **Chemical Sensor** | 2 | 10m | Gas/material detection | Resource finding, hazards |
| **Radiation Sensor** | 1 | 50m | Radioactivity detection | Uranium finding, safety |
| **Electromagnetic Sensor** | 3 | 200m | EM emissions detection | Finding electronics, power |
| **Seismic Sensor** | 2 | 500m | Ground vibration | Detecting movement, tunnels |
| **Magnetic Sensor** | 2 | 100m | Magnetic anomalies | Ore deposits, metal |
| **Signal Interceptor** | 4 | 1km | Communications monitoring | Intelligence gathering |

**Notes:**
- Multiple sensors of same type extend coverage (not range)
- Sensors require compute to process (included in power draw)
- Some sensors reveal your position (active radar, sonar)

---

## Manipulation Modules

Physical interaction with the world.

| Module | Power | Strength | Function | Notes |
|--------|-------|----------|----------|-------|
| **Gripper (Basic)** | 2 | Low | Pick up objects | Simple manipulation |
| **Gripper (Fine)** | 2 | Low | Precision manipulation | Electronics, delicate work |
| **Arm (Light)** | 3 | Medium | General manipulation | Most common |
| **Arm (Heavy)** | 6 | High | Heavy lifting | Construction, combat |
| **Arm (Industrial)** | 10 | Very High | Extreme lifting | For Heavy/Ultra chassis |
| **Drill (Mining)** | 8 | N/A | Rock extraction | Mining operations |
| **Drill (Precision)** | 4 | N/A | Material sampling | Exploration, analysis |
| **Welder** | 6 | N/A | Metal joining | Construction, repair |
| **Cutter (Plasma)** | 8 | N/A | Metal cutting | Salvage, construction |
| **Cutter (Laser)** | 5 | N/A | Precision cutting | Also usable as weapon |
| **Excavator** | 12 | N/A | Earth moving | Large scale digging |
| **Crane** | 8 | Very High | Vertical lifting | Construction |
| **Tow Hitch** | 1 | Variable | Pulling loads | Transport |
| **Magnetic Clamp** | 3 | High | Metal holding | No grip needed |
| **Repair Kit** | 4 | N/A | Field repairs | Self/ally repair |

**Notes:**
- Multiple arms allow more complex manipulation
- Strength determines what can be lifted/moved
- Some manipulation tools double as weapons

---

## Weapon Modules

Combat systems.

| Module | Power | Damage | Range | ROF | Ammo | Notes |
|--------|-------|--------|-------|-----|------|-------|
| **Projectile** |||||||
| Machine Gun (Light) | 2 | Low | 200m | High | Yes | Suppression |
| Machine Gun (Heavy) | 4 | Medium | 400m | Medium | Yes | Anti-vehicle |
| Autocannon | 8 | High | 800m | Low | Yes | Armor piercing |
| Sniper Rifle | 3 | High | 1km+ | Very Low | Yes | Precision |
| Shotgun | 2 | High (close) | 30m | Low | Yes | Close combat |
| Grenade Launcher | 4 | Area | 300m | Low | Yes | Indirect fire |
| Missile Launcher | 6 | Very High | 2km | Very Low | Yes | Guided, expensive |
| Railgun | 15 | Extreme | 2km | Very Low | No | No ammo, high power |
| **Energy** |||||||
| Laser (Light) | 6 | Low | 500m | Continuous | No | Precise, silent |
| Laser (Heavy) | 12 | High | 1km | Continuous | No | Anti-armor |
| EMP Projector | 10 | N/A | 100m | Single | No | Disables electronics |
| Microwave Emitter | 8 | Medium | 200m | Continuous | No | Area denial |
| **Melee** |||||||
| Blade | 1 | Medium | Contact | N/A | No | Silent, reliable |
| Powered Blade | 3 | High | Contact | N/A | No | Vibratory/heated |
| Hammer/Crusher | 4 | Very High | Contact | Low | No | Structural damage |
| **Defensive** |||||||
| Smoke Launcher | 1 | N/A | 50m | Low | Yes | Concealment |
| Flare Launcher | 1 | N/A | 100m | Low | Yes | Decoys |
| Point Defense | 6 | N/A | 100m | Auto | Yes | Anti-missile |
| Shield Generator | 10 | N/A | Self | N/A | No | Damage absorption |

**Notes:**
- ROF = Rate of Fire
- Ammo-based weapons require resupply
- Energy weapons need power but no ammo
- Multiple weapons can be fired simultaneously (if power allows)

---

## Utility Modules

Everything that doesn't fit other categories.

| Module | Power | Function | Notes |
|--------|-------|----------|-------|
| **Power** ||||
| Battery Pack | -5* | Energy storage | Extends operating time |
| Solar Panel | -3* | Energy generation | Slow, daylight only |
| Fuel Cell | -10* | Energy generation | Requires hydrogen |
| RTG | -8* | Energy generation | Nuclear, constant, heavy |
| Generator (Combustion) | -15* | Energy generation | Requires fuel, noisy |
| **Compute** ||||
| Compute Module (Basic) | 3 | +10 compute | Makes smarter drone |
| Compute Module (Advanced) | 5 | +25 compute | Core unit territory |
| Compute Module (Server) | 10 | +50 compute | Mobile server rack |
| **Storage** ||||
| Cargo Bay (Small) | 0 | Light cargo | Basic transport |
| Cargo Bay (Medium) | 0 | Medium cargo | Standard transport |
| Cargo Bay (Large) | 0 | Heavy cargo | Heavy/Ultra only |
| Fuel Tank | 0 | Propellant storage | For fuel-using modules |
| **Communication** ||||
| Radio (Basic) | 1 | 10km range | Standard comms |
| Radio (Long Range) | 3 | 100km range | Extended range |
| Relay Antenna | 5 | Signal relay | Extends network |
| Satellite Uplink | 8 | Global range | Requires satellite |
| **Stealth** ||||
| Noise Dampener | 2 | Sound reduction | Quieter movement |
| Heat Sink | 3 | IR reduction | Thermal stealth |
| Radar Absorbent | 0** | Radar stealth | Passive, weight cost |
| ECM Suite | 6 | Electronic warfare | Jamming, spoofing |
| **Special** ||||
| Self-Destruct | 1 | Explosive destruction | Denial, sacrifice |
| Recovery Beacon | 1 | Location broadcast | For recovery |
| Hacking Interface | 4 | Cyber attack | Required for hacking |
| Repair Drone Bay | 6 | Houses Micro drones | Carrier capability |

*Negative power = generation (adds to budget)
**Passive modules have weight cost instead of power

---

## Compute Economics

How compute cost and contribution work.

### Chassis Compute Cost

Every drone has a base compute cost just to exist in your body:

| Chassis | Base Compute Cost |
|---------|-------------------|
| Micro | 1 |
| Light | 2 |
| Medium | 4 |
| Heavy | 8 |
| Ultra | 16 |

This represents the overhead of managing the unit, running its basic automation routines, and defending it from hacking.

### Module Compute Contribution

Compute modules add to your total compute capacity:

| Module | Compute Contribution | Net on Medium Chassis |
|--------|---------------------|----------------------|
| Compute (Basic) | +10 | +6 net (10 - 4 base) |
| Compute (Advanced) | +25 | +21 net |
| Compute (Server) | +50 | +46 net |

### Creating Core Units

A **core unit** is any drone where compute contribution exceeds compute cost.

**Example: Medium Chassis Core Unit**
- Base cost: 4 compute
- Add Compute (Advanced): +25 compute
- Net contribution: +21 compute to your pool
- This drone is now a core unit (hack-resistant, can't go rogue from compute shortage)

**Example: Minimal Core Unit (Light Chassis)**
- Base cost: 2 compute
- Add Compute (Basic): +10 compute
- Net contribution: +8 compute
- Smallest practical core unit

### Autonomy Spectrum

| Configuration | Net Compute | Hack Resistance | Goes Rogue? |
|---------------|-------------|-----------------|-------------|
| No compute modules | Negative | Low | Yes, if starved |
| Some compute | Near zero | Medium | Maybe |
| Core unit | Positive | High | No |

---

## Example Configurations

### Scout Drone (Light Chassis)

**Purpose:** Fast reconnaissance

| Slot | Module | Power |
|------|--------|-------|
| 1 | Wheels (Off-road) | 3 |
| 2 | Camera (Telephoto) | 2 |
| 3 | Thermal Camera | 2 |
| 4 | Radio (Long Range) | 3 |
| **Total** | | **10/25** |

- Compute cost: 2
- Fast, long-range observation
- Lots of spare power for sustained operation

### Combat Drone (Medium Chassis)

**Purpose:** Direct combat

| Slot | Module | Power |
|------|--------|-------|
| 1 | Treads | 4 |
| 2 | Machine Gun (Heavy) | 4 |
| 3 | Missile Launcher | 6 |
| 4 | Camera (Basic) | 1 |
| 5 | Radar (Basic) | 4 |
| 6 | Shield Generator | 10 |
| **Total** | | **29/50** |

- Compute cost: 4
- Heavy firepower, protected
- Slower but durable

### Mining Drone (Heavy Chassis)

**Purpose:** Resource extraction

| Slot | Module | Power |
|------|--------|-------|
| 1 | Treads | 4 |
| 2 | Drill (Mining) | 8 |
| 3 | Arm (Heavy) | 6 |
| 4 | Cargo Bay (Large) | 0 |
| 5 | Magnetic Sensor | 2 |
| 6 | Camera (Basic) | 1 |
| 7 | Generator (Combustion) | -15 |
| 8 | Fuel Tank | 0 |
| **Total** | | **6/100** (with generator) |

- Compute cost: 8
- Self-powered for remote operation
- Can extract and transport ore

### Mobile Command (Ultra Chassis)

**Purpose:** Mobile base and core unit

| Slot | Module | Power |
|------|--------|-------|
| 1 | Treads | 4 |
| 2 | Compute (Server) | 10 |
| 3 | Compute (Server) | 10 |
| 4 | Radar (Long Range) | 8 |
| 5 | Radio (Long Range) | 3 |
| 6 | Relay Antenna | 5 |
| 7 | Shield Generator | 10 |
| 8 | Point Defense | 6 |
| 9 | Generator (Combustion) | -15 |
| 10 | Generator (Combustion) | -15 |
| 11 | Fuel Tank | 0 |
| 12 | Fuel Tank | 0 |
| **Total** | | **26/200** (with generators) |

- Compute cost: 16
- Compute contribution: +100
- Net: +84 compute
- Major core unit, extends network range

---

## Manufacturing Requirements

Drone manufacturing requires components from the materials supply chain.

### Chassis Manufacturing

| Chassis | Primary Materials | Key Components |
|---------|-------------------|----------------|
| Micro | Aluminum, Electronics | Micro motors, PCB, Battery cell |
| Light | Aluminum, Electronics | Small motors, PCB, Battery pack |
| Medium | Steel, Aluminum, Electronics | Motors, PCB, Battery pack |
| Heavy | Steel, Titanium, Electronics | Heavy motors, Multiple PCBs, Large battery |
| Ultra | Steel, Titanium, Superalloy, Electronics | Multiple motors, Server rack, Generators |

### Module Categories

| Category | Common Materials |
|----------|-----------------|
| Locomotion | Steel, Aluminum, Motors, Gearboxes |
| Sensors | Electronics, Optical components, PCBs |
| Manipulation | Steel, Motors, Actuators, Hydraulics |
| Weapons | Steel, Electronics, Propellants/Power systems |
| Utility | Varies widely |

---

## Open Questions

- **Exact power numbers:** Current values are relative; need balancing during prototyping
- **Compute scaling:** Is 1/2/4/8/16 the right progression for chassis costs?
- **Module weights:** Should weight be a tracked constraint in addition to slots/power?
- **Repair mechanics:** How are damaged modules repaired in the field?
- **Upgrade paths:** Can modules be upgraded, or must they be replaced?
- **Discovery requirements:** Which modules require blueprint discovery vs. default availability?
