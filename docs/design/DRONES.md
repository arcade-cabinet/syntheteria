# Drone System

This document defines how drones are built from components and how their properties emerge from assembly.

---

## Design Philosophy

**Pure Component Assembly:** A drone is nothing but its components. There is no chassis, no frame, no predefined structure. You assemble motors, batteries, sensors, and other parts. The drone's capabilities, size, power requirements, and compute cost all emerge from what you put together.

**Maximum Freedom:** Want a drone with six legs and two drills? Build it. Want a flying platform with nothing but compute modules? Build it. The system doesn't impose roles or templates — players create what they need.

**Emergent Properties:** Every drone property is calculated from its components:
- Weight = sum of component weights
- Power draw = sum of component power draws
- Power capacity = what power sources provide
- Compute cost = sum of component compute costs
- Compute contribution = what compute hardware provides
- Capabilities = what functional components enable

---

## How Assembly Works

### Basic Requirements

A functional drone needs at minimum:
1. **Power source** (battery, generator, fuel cell, etc.)
2. **Controller** (microcontroller, CPU, or compute module)
3. Something that **does something** (locomotion, sensors, tools, etc.)

That's it. Everything else is optional.

### Property Calculation

| Property | Calculation |
|----------|-------------|
| Total Weight | Sum of all component weights |
| Power Draw | Sum of all component power requirements |
| Power Capacity | Sum of all power source outputs |
| Net Power | Capacity - Draw (must be ≥ 0 to function) |
| Compute Cost | Sum of all component compute costs |
| Compute Contribution | Sum of all compute hardware outputs |
| Net Compute | Contribution - Cost |

### Core Unit Status

A drone becomes a **core unit** when its compute contribution exceeds its compute cost (net compute > 0). Core units:
- Add to your total compute capacity
- Cannot go rogue from compute shortage
- Have higher hack resistance

---

## Component Categories

Components are grouped by function, but any combination is valid.

### Power Sources

Provide energy to run everything else.

| Component | Output | Weight | Notes |
|-----------|--------|--------|-------|
| Battery (micro) | 5 | 0.1 kg | Tiny, short duration |
| Battery (small) | 15 | 1 kg | Light drones |
| Battery (medium) | 30 | 4 kg | Standard |
| Battery (large) | 60 | 10 kg | Extended operation |
| Battery (massive) | 120 | 25 kg | Heavy platforms |
| Solar panel (small) | 3 | 0.5 kg | Slow recharge, daylight |
| Solar panel (large) | 10 | 3 kg | Better output |
| Fuel cell (small) | 20 | 2 kg | Requires hydrogen |
| Fuel cell (large) | 50 | 8 kg | High output |
| RTG (small) | 15 | 5 kg | Nuclear, constant, heavy |
| RTG (large) | 40 | 15 kg | Long-term power |
| Generator (small) | 30 | 5 kg | Combustion, needs fuel |
| Generator (large) | 80 | 15 kg | High output |

### Controllers

Required for drone operation. Provide basic compute, more advanced ones contribute to your pool.

| Component | Power | Compute Cost | Compute Contrib | Weight | Notes |
|-----------|-------|--------------|-----------------|--------|-------|
| Microcontroller | 1 | 0.5 | 0 | 0.05 kg | Minimum viable |
| CPU (basic) | 2 | 1 | 0 | 0.1 kg | Standard drone brain |
| CPU (advanced) | 4 | 2 | 0 | 0.2 kg | Smarter automation |
| Compute module | 6 | 3 | 10 | 1 kg | Net contributor |
| Compute module (adv) | 10 | 5 | 25 | 3 kg | Significant compute |
| Server rack | 20 | 10 | 60 | 20 kg | Major core unit |
| Server cluster | 50 | 20 | 150 | 80 kg | Mobile data center |

### Motors and Drives

Provide mechanical power for movement and manipulation.

| Component | Power | Weight | Output | Notes |
|-----------|-------|--------|--------|-------|
| Micro motor | 0.5 | 0.02 kg | Tiny | For micro drones |
| Small motor | 2 | 0.3 kg | Low | Light applications |
| Medium motor | 5 | 1 kg | Medium | Standard |
| Large motor | 12 | 4 kg | High | Heavy duty |
| Industrial motor | 30 | 15 kg | Very high | Vehicles, heavy machinery |
| Servo (small) | 1 | 0.1 kg | Precision | Fine manipulation |
| Servo (large) | 3 | 0.5 kg | Precision + power | Arms, actuators |
| Hydraulic pump | 8 | 5 kg | Very high | Heavy lifting |
| Hydraulic actuator | 2 | 2 kg | High force | Requires pump |

### Locomotion

Movement systems. Usually paired with appropriate motors.

| Component | Power | Weight | Speed | Terrain | Notes |
|-----------|-------|--------|-------|---------|-------|
| Wheels (micro, 4x) | 0 | 0.05 kg | Fast | Smooth | Passive, motor provides power |
| Wheels (small, 4x) | 0 | 0.5 kg | Fast | Roads | Standard small |
| Wheels (medium, 4x) | 0 | 2 kg | Medium | Most ground | All-terrain |
| Wheels (large, 4x) | 0 | 8 kg | Medium | Rough | Heavy vehicles |
| Treads (small) | 0 | 3 kg | Slow | All ground | High traction |
| Treads (large) | 0 | 15 kg | Slow | All terrain | Heavy platforms |
| Legs (2x bipedal) | 2 | 4 kg | Medium | All terrain | Complex, versatile |
| Legs (4x quadruped) | 3 | 6 kg | Medium | All terrain | Stable |
| Legs (6x hexapod) | 4 | 8 kg | Slow | Extreme terrain | Most capable |
| Legs (micro, 6x) | 0.5 | 0.1 kg | Slow | All terrain | Insect-scale |
| Rotors (micro, 4x) | 3 | 0.1 kg | Fast | Air | Tiny flyers |
| Rotors (small, 4x) | 8 | 1 kg | Fast | Air | Light drones |
| Rotors (large, 4x) | 20 | 5 kg | Medium | Air | Heavy lift |
| Rotors (heavy, 8x) | 40 | 15 kg | Slow | Air | Cargo |
| Propeller (water) | 3 | 1 kg | Medium | Water | Underwater |
| Hydrojet | 8 | 3 kg | Fast | Water | High speed underwater |
| Thrusters (space) | 15 | 5 kg | N/A | Space | No atmosphere |

### Sensors

Perception systems.

| Component | Power | Weight | Range | Function |
|-----------|-------|--------|-------|----------|
| Camera (basic) | 1 | 0.1 kg | 100m | Visual |
| Camera (telephoto) | 2 | 0.3 kg | 1km | Long-range visual |
| Camera (thermal) | 2 | 0.2 kg | 200m | Heat detection |
| Camera (night vision) | 1 | 0.15 kg | 150m | Low light |
| Camera (360°) | 2 | 0.2 kg | 100m | All-around visual |
| Radar (small) | 4 | 1 kg | 500m | Object detection |
| Radar (large) | 10 | 5 kg | 5km | Wide area |
| Lidar | 3 | 0.5 kg | 200m | 3D mapping |
| Sonar (active) | 3 | 0.5 kg | 500m | Underwater, reveals position |
| Sonar (passive) | 1 | 0.3 kg | 1km | Underwater listening |
| Chemical sensor | 2 | 0.2 kg | 10m | Gas/material detection |
| Radiation sensor | 1 | 0.1 kg | 50m | Radioactivity |
| EM sensor | 3 | 0.3 kg | 200m | Electronics detection |
| Seismic sensor | 2 | 0.5 kg | 500m | Ground vibration |
| Magnetic sensor | 2 | 0.2 kg | 100m | Metal/ore detection |
| Signal interceptor | 4 | 0.5 kg | 1km | Communications intel |
| Microphone array | 1 | 0.1 kg | 100m | Audio detection |

### Manipulation

Physical interaction tools.

| Component | Power | Weight | Capability | Notes |
|-----------|-------|--------|------------|-------|
| Gripper (micro) | 0.5 | 0.02 kg | <100g | Tiny objects |
| Gripper (small) | 1 | 0.2 kg | <1kg | Light objects |
| Gripper (medium) | 2 | 0.5 kg | <10kg | Standard |
| Gripper (heavy) | 4 | 2 kg | <50kg | Heavy objects |
| Arm (light) | 3 | 1 kg | Reach 0.5m | Basic manipulation |
| Arm (medium) | 6 | 3 kg | Reach 1m | Standard |
| Arm (heavy) | 12 | 8 kg | Reach 1.5m | Heavy duty |
| Arm (industrial) | 25 | 20 kg | Reach 3m | Major construction |
| Drill (small) | 5 | 2 kg | Soft rock | Sampling, light mining |
| Drill (mining) | 15 | 10 kg | Hard rock | Full mining |
| Drill (industrial) | 40 | 30 kg | Any material | Heavy extraction |
| Welder | 8 | 2 kg | Metal joining | Construction, repair |
| Plasma cutter | 10 | 3 kg | Metal cutting | Salvage, construction |
| Laser cutter | 6 | 1 kg | Precision cut | Also light weapon |
| Excavator bucket | 0 | 20 kg | Earth moving | Requires arm |
| Magnetic clamp | 3 | 1 kg | Metal holding | No grip needed |
| Vacuum gripper | 2 | 0.5 kg | Flat surfaces | Glass, panels |

### Weapons

Combat systems.

| Component | Power | Weight | Damage | Range | Ammo | Notes |
|-----------|-------|--------|--------|-------|------|-------|
| **Projectile** |||||||
| Machine gun (light) | 2 | 3 kg | Low | 200m | Yes | Suppression |
| Machine gun (heavy) | 4 | 8 kg | Medium | 400m | Yes | Anti-vehicle |
| Autocannon | 8 | 20 kg | High | 800m | Yes | Armor piercing |
| Sniper system | 3 | 5 kg | High | 1km+ | Yes | Precision |
| Shotgun | 2 | 2 kg | High (close) | 30m | Yes | Close combat |
| Grenade launcher | 4 | 4 kg | Area | 300m | Yes | Indirect fire |
| Missile launcher | 6 | 8 kg | V. High | 2km | Yes | Guided |
| Railgun | 25 | 25 kg | Extreme | 2km | No | No ammo, high power |
| **Energy** |||||||
| Laser (light) | 8 | 2 kg | Low | 500m | No | Precise, silent |
| Laser (heavy) | 18 | 8 kg | High | 1km | No | Anti-armor |
| EMP projector | 15 | 5 kg | N/A | 100m | No | Disables electronics |
| Microwave emitter | 12 | 6 kg | Medium | 200m | No | Area denial |
| **Melee** |||||||
| Blade | 0 | 0.5 kg | Medium | Contact | No | Silent, reliable |
| Powered blade | 3 | 1 kg | High | Contact | No | Vibrating/heated |
| Crusher | 5 | 5 kg | V. High | Contact | No | Structural damage |
| **Defensive** |||||||
| Smoke launcher | 1 | 1 kg | N/A | 50m | Yes | Concealment |
| Flare launcher | 1 | 0.5 kg | N/A | 100m | Yes | Decoys |
| Point defense | 8 | 4 kg | N/A | 100m | Yes | Anti-missile |
| Shield generator | 15 | 8 kg | N/A | Self | No | Damage absorption |
| Armor plating | 0 | Variable | N/A | Self | No | Passive protection |

### Communication

Signal and networking equipment.

| Component | Power | Weight | Range | Notes |
|-----------|-------|--------|-------|-------|
| Radio (short) | 1 | 0.1 kg | 1km | Basic comms |
| Radio (medium) | 2 | 0.3 kg | 10km | Standard |
| Radio (long) | 4 | 1 kg | 100km | Extended range |
| Relay antenna | 6 | 3 kg | Extends network | Signal repeater |
| Satellite uplink | 10 | 5 kg | Global | Requires satellite |
| Laser comm | 3 | 0.5 kg | Line of sight | Secure, jam-resistant |
| ECM suite | 8 | 3 kg | 500m | Jamming, spoofing |

### Utility

Everything else.

| Component | Power | Weight | Function | Notes |
|-----------|-------|--------|----------|-------|
| Cargo bay (small) | 0 | 1 kg | 10kg capacity | Light transport |
| Cargo bay (medium) | 0 | 3 kg | 50kg capacity | Standard |
| Cargo bay (large) | 0 | 10 kg | 200kg capacity | Heavy transport |
| Fuel tank (small) | 0 | 1 kg | Generator fuel | Extended range |
| Fuel tank (large) | 0 | 5 kg | More fuel | Long operations |
| Hydrogen tank | 0 | 3 kg | Fuel cell supply | For fuel cells |
| Noise dampener | 2 | 1 kg | Sound reduction | Stealth |
| Heat sink | 3 | 2 kg | IR reduction | Thermal stealth |
| Radar absorbing coat | 0 | 0.5 kg | Radar stealth | Passive |
| Self-destruct | 1 | 0.5 kg | Explosive | Denial, sacrifice |
| Recovery beacon | 1 | 0.1 kg | Location broadcast | For recovery |
| Hacking interface | 5 | 0.5 kg | Cyber attack | Required for hacking |
| Repair kit | 3 | 2 kg | Field repairs | Self/ally repair |
| Tow cable | 0 | 1 kg | Pulling loads | Transport assist |
| Lights | 1 | 0.2 kg | Illumination | Work in dark |
| Winch | 3 | 3 kg | Lifting/pulling | Vertical access |

---

## Example Assemblies

### Micro Scout

Tiny reconnaissance drone.

| Component | Power | Compute | Weight |
|-----------|-------|---------|--------|
| Battery (micro) | -5 | 0 | 0.1 kg |
| Microcontroller | 1 | 0.5 | 0.05 kg |
| Micro motor | 0.5 | 0 | 0.02 kg |
| Rotors (micro, 4x) | 3 | 0 | 0.1 kg |
| Camera (basic) | 1 | 0 | 0.1 kg |
| Radio (short) | 1 | 0 | 0.1 kg |
| **Total** | **6.5 / 5** | **0.5** | **0.47 kg** |

*Note: Over power budget — needs bigger battery or fewer features*

### Wheeled Scout (Fixed)

| Component | Power | Compute | Weight |
|-----------|-------|---------|--------|
| Battery (small) | -15 | 0 | 1 kg |
| CPU (basic) | 2 | 1 | 0.1 kg |
| Small motor | 2 | 0 | 0.3 kg |
| Wheels (small, 4x) | 0 | 0 | 0.5 kg |
| Camera (telephoto) | 2 | 0 | 0.3 kg |
| Camera (thermal) | 2 | 0 | 0.2 kg |
| Radio (medium) | 2 | 0 | 0.3 kg |
| **Total** | **10 / 15** | **1** | **2.7 kg** |

Compute cost: 1. Fast, long-range observation, thermal capability.

### Combat Unit

| Component | Power | Compute | Weight |
|-----------|-------|---------|--------|
| Battery (large) | -60 | 0 | 10 kg |
| CPU (advanced) | 4 | 2 | 0.2 kg |
| Large motor | 12 | 0 | 4 kg |
| Treads (small) | 0 | 0 | 3 kg |
| Machine gun (heavy) | 4 | 0 | 8 kg |
| Missile launcher | 6 | 0 | 8 kg |
| Camera (basic) | 1 | 0 | 0.1 kg |
| Radar (small) | 4 | 0 | 1 kg |
| Shield generator | 15 | 0 | 8 kg |
| Radio (medium) | 2 | 0 | 0.3 kg |
| **Total** | **48 / 60** | **2** | **42.6 kg** |

Compute cost: 2. Heavy firepower, protected, good sensors.

### Mining Drone

| Component | Power | Compute | Weight |
|-----------|-------|---------|--------|
| Generator (small) | -30 | 0 | 5 kg |
| Fuel tank (small) | 0 | 0 | 1 kg |
| CPU (basic) | 2 | 1 | 0.1 kg |
| Large motor | 12 | 0 | 4 kg |
| Treads (small) | 0 | 0 | 3 kg |
| Drill (mining) | 15 | 0 | 10 kg |
| Arm (medium) | 6 | 0 | 3 kg |
| Cargo bay (medium) | 0 | 0 | 3 kg |
| Magnetic sensor | 2 | 0 | 0.2 kg |
| Camera (basic) | 1 | 0 | 0.1 kg |
| Radio (medium) | 2 | 0 | 0.3 kg |
| **Total** | **40 / 30** | **1** | **29.7 kg** |

*Note: Over budget — needs larger generator or smaller drill*

### Mobile Core Unit

Compute platform that contributes to your pool.

| Component | Power | Compute Cost | Compute Contrib | Weight |
|-----------|-------|--------------|-----------------|--------|
| Battery (massive) | -120 | 0 | 0 | 25 kg |
| Generator (large) | -80 | 0 | 0 | 15 kg |
| Fuel tank (large) | 0 | 0 | 0 | 5 kg |
| Server rack | 20 | 10 | 60 | 20 kg |
| Server rack | 20 | 10 | 60 | 20 kg |
| Industrial motor | 30 | 0 | 0 | 15 kg |
| Treads (large) | 0 | 0 | 0 | 15 kg |
| Radar (large) | 10 | 0 | 0 | 5 kg |
| Radio (long) | 4 | 0 | 0 | 1 kg |
| Relay antenna | 6 | 0 | 0 | 3 kg |
| Shield generator | 15 | 0 | 0 | 8 kg |
| Point defense | 8 | 0 | 0 | 4 kg |
| Camera (360°) | 2 | 0 | 0 | 0.2 kg |
| **Total** | **115 / 200** | **20** | **120** | **136.2 kg** |

Net compute: +100. Major core unit. Extends signal range, heavily protected.

---

## Compute Economics

### How Compute Flows

Every drone has:
- **Compute Cost:** The overhead to manage this unit in your body
- **Compute Contribution:** What compute hardware the drone provides

**Net Compute = Contribution - Cost**

| Net Compute | Status | Hack Resistance |
|-------------|--------|-----------------|
| Negative | Consumer | Low |
| Zero | Neutral | Medium |
| Positive | Core Unit | High |

### Simple Drones

Most drones are compute consumers. A basic scout with a CPU costs ~1 compute from your pool. You need enough total compute capacity to manage all your drones.

### Core Units

Drones with enough compute hardware become net contributors. The Mobile Core Unit example above costs 20 compute to manage but contributes 120, for a net +100 to your pool.

Core units:
- Cannot go rogue from compute shortage (they are the compute)
- Are more resistant to hacking
- Are high-value targets for enemies

---

## Manufacturing

Drones are assembled from components, which come from the materials supply chain.

| Component Category | Primary Materials |
|-------------------|-------------------|
| Batteries | Lithium, Cobalt, Electronics |
| Motors | Copper, Steel, Magnets |
| Locomotion | Steel, Aluminum, Rubber |
| Sensors | Electronics, Optics, Rare Earths |
| Manipulation | Steel, Actuators, Hydraulics |
| Weapons | Steel, Electronics, Propellants |
| Compute | Silicon, Electronics, Cooling |
| Communication | Electronics, Copper, Antennas |

Specific component recipes would be defined in the manufacturing system.

---

## Open Questions

- **Assembly constraints:** Are there any limits on what can combine? (e.g., can't put 10 drills on one motor?)
- **Physical layout:** Does component arrangement matter, or is it purely abstract?
- **Repair and salvage:** Can you swap components in the field? Salvage from destroyed drones?
- **Upgrade paths:** Can components be upgraded, or must they be replaced entirely?
- **Blueprint system:** Which components need blueprints vs. default availability?
- **Exact power/weight values:** Current numbers are placeholders for balancing
