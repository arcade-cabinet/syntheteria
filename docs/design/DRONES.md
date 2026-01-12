# Drone System

This document defines how drones are built from components and how their resource requirements are calculated dynamically.

---

## Design Philosophy

**Pure Component Assembly:** A drone is nothing but its components. You assemble motors, batteries, sensors, and other parts. Capabilities emerge from what you build.

**Dynamic Resource Calculation:** Power and compute requirements aren't fixed per component — they're calculated based on what the drone weighs, what it's doing, and how complex its automation is.

**Maximum Freedom:** The system doesn't impose roles or templates. Players create what they need.

---

## How Assembly Works

### Basic Requirements

A functional drone needs at minimum:
1. **Power source** (battery, generator, fuel cell, etc.)
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

Power draw is **dynamic** — it depends on what the drone is doing, not fixed costs per component.

### Locomotion Power

Moving the drone requires power proportional to weight and difficulty.

```
Locomotion Power = Base Rate × Weight × Terrain Factor × Speed Factor
```

| Locomotion Type | Base Rate | Notes |
|-----------------|-----------|-------|
| Wheels (road) | 0.1 | Most efficient |
| Wheels (off-road) | 0.15 | Moderate |
| Treads | 0.2 | High traction, less efficient |
| Legs (walking) | 0.25 | Versatile, moderate efficiency |
| Legs (climbing) | 0.4 | High effort |
| Rotors (hover) | 0.5 | Must fight gravity constantly |
| Rotors (forward flight) | 0.3 | More efficient than hover |
| Aquatic (surface) | 0.15 | Low resistance |
| Aquatic (submerged) | 0.2 | Pressure resistance |

| Terrain Factor | Value |
|----------------|-------|
| Smooth/paved | 1.0 |
| Rough ground | 1.5 |
| Steep incline | 2.0 |
| Extreme terrain | 2.5 |

| Speed Factor | Value |
|--------------|-------|
| Idle | 0 |
| Slow | 0.5 |
| Normal | 1.0 |
| Fast | 1.5 |
| Maximum | 2.0 |

**Example:** 30kg wheeled drone on rough ground at normal speed
- Power = 0.1 × 30 × 1.5 × 1.0 = **4.5 power units**

**Example:** 30kg rotor drone hovering
- Power = 0.5 × 30 × 1.0 × 1.0 = **15 power units**

### Function Power

Each active function draws power based on its intensity.

| Function | Idle | Active | Maximum |
|----------|------|--------|---------|
| **Sensors** ||||
| Camera (basic) | 0.1 | 0.5 | 1 |
| Camera (advanced) | 0.2 | 1 | 2 |
| Radar | 0.5 | 2 | 5 |
| Lidar | 0.3 | 1.5 | 3 |
| Chemical/EM sensors | 0.1 | 0.5 | 1 |
| **Manipulation** ||||
| Gripper | 0 | 0.5 | 2 |
| Arm (light) | 0.1 | 1 | 3 |
| Arm (heavy) | 0.2 | 3 | 8 |
| Drill (light) | 0 | 5 | 10 |
| Drill (mining) | 0 | 15 | 30 |
| Welder/cutter | 0 | 8 | 15 |
| **Weapons** ||||
| Projectile (firing) | 0 | 2 | 5 |
| Laser (firing) | 0 | 10 | 25 |
| EMP | 0 | 0 | 20 (burst) |
| Shield generator | 5 | 10 | 20 |
| **Communication** ||||
| Radio (short) | 0.2 | 0.5 | 1 |
| Radio (long) | 0.5 | 2 | 4 |
| Relay/uplink | 1 | 3 | 6 |
| **Compute** ||||
| Microcontroller | 0.5 | 0.5 | 0.5 |
| CPU (basic) | 1 | 1.5 | 2 |
| CPU (advanced) | 2 | 3 | 5 |
| Compute module | 3 | 5 | 8 |
| Server rack | 10 | 15 | 25 |

### Total Power Draw

```
Total Power = Locomotion Power + Sum of Function Powers
```

Drone must have Power Capacity ≥ Total Power Draw or it cannot sustain operations.

**Power margin matters:** If draw approaches capacity, the drone must slow down, reduce functions, or risk shutdown.

---

## Compute Calculation

Compute cost depends on **what the drone does** and **how autonomously it does it**.

### Base Function Cost

Every active function requires some compute to operate.

| Function Category | Base Compute |
|-------------------|--------------|
| Passive sensor (camera feed) | 0.1 |
| Active sensor (radar, lidar) | 0.3 |
| Sensor fusion (multiple inputs) | 0.5 per input |
| Simple manipulation (grip, release) | 0.1 |
| Complex manipulation (welding, cutting) | 0.3 |
| Coordinated manipulation (two arms) | 0.5 |
| Weapon (manual targeting) | 0.2 |
| Weapon (auto-targeting) | 0.5 |
| Communication relay | 0.2 |

### Automation Complexity

The more autonomous the drone, the more compute it requires.

| Automation Level | Multiplier | Description |
|------------------|------------|-------------|
| Direct control | 0.5× | You control every action |
| Simple routine | 1× | Follow waypoints, repeat actions |
| Reactive routine | 2× | Respond to triggers (if-then) |
| Adaptive routine | 3× | Adjust behavior based on conditions |
| Full autonomy | 5× | Make independent decisions |

### Total Compute Cost

```
Compute Cost = (Sum of Base Function Costs) × Automation Multiplier
```

**Example:** Scout drone with camera + radar + simple patrol routine
- Camera: 0.1
- Radar: 0.3
- Total base: 0.4
- Simple routine: 1× multiplier
- **Compute cost: 0.4**

**Example:** Combat drone with sensors + weapons + adaptive targeting
- Camera: 0.1
- Radar: 0.3
- Sensor fusion: 0.5
- Weapon (auto-target): 0.5
- Total base: 1.4
- Adaptive routine: 3× multiplier
- **Compute cost: 4.2**

### Compute Contribution

Compute hardware provides capacity to your pool:

| Component | Contribution |
|-----------|--------------|
| Microcontroller | 0 (minimum to run) |
| CPU (basic) | 0 (runs drone only) |
| CPU (advanced) | 2 (slight surplus) |
| Compute module | 10 |
| Compute module (advanced) | 25 |
| Server rack | 60 |
| Server cluster | 150 |

**Net Compute = Contribution - Cost**

Positive net = core unit (contributes to your pool)
Negative net = consumer (costs you compute)

---

## Component Specifications

Components are defined by their **capabilities**, not fixed resource costs.

### Power Sources

| Component | Output | Weight | Notes |
|-----------|--------|--------|-------|
| Battery (micro) | 5 | 0.1 kg | ~10 min at 5 draw |
| Battery (small) | 15 | 1 kg | Light drones |
| Battery (medium) | 40 | 4 kg | Standard |
| Battery (large) | 80 | 10 kg | Extended operation |
| Battery (massive) | 150 | 25 kg | Heavy platforms |
| Solar panel (small) | 3 | 0.5 kg | Slow, daylight only |
| Solar panel (large) | 10 | 3 kg | Better output |
| Fuel cell (small) | 25 | 2 kg | Requires hydrogen |
| Fuel cell (large) | 60 | 8 kg | High output |
| RTG (small) | 15 | 5 kg | Nuclear, constant |
| RTG (large) | 40 | 15 kg | Long-term |
| Generator (small) | 40 | 5 kg | Combustion, needs fuel |
| Generator (large) | 100 | 15 kg | High output |

### Controllers

| Component | Compute Contrib | Weight | Notes |
|-----------|-----------------|--------|-------|
| Microcontroller | 0 | 0.05 kg | Minimum viable |
| CPU (basic) | 0 | 0.1 kg | Standard |
| CPU (advanced) | 2 | 0.2 kg | Slight surplus |
| Compute module | 10 | 1 kg | Net contributor |
| Compute module (adv) | 25 | 3 kg | Significant |
| Server rack | 60 | 20 kg | Major core unit |
| Server cluster | 150 | 80 kg | Mobile data center |

### Motors

Motors provide **torque** — ability to move weight.

| Component | Torque Rating | Weight | Notes |
|-----------|---------------|--------|-------|
| Micro motor | 0.5 kg | 0.02 kg | Tiny mechanisms |
| Small motor | 5 kg | 0.3 kg | Light drones |
| Medium motor | 20 kg | 1 kg | Standard |
| Large motor | 50 kg | 4 kg | Heavy duty |
| Industrial motor | 200 kg | 15 kg | Vehicles |
| Servo (precision) | 2 kg | 0.2 kg | Fine control |
| Hydraulic system | 500 kg | 10 kg | Extreme force |

**Torque requirement:** Locomotion needs motor(s) that can handle total drone weight. Manipulation needs motor/servo that can handle payload.

### Locomotion

| Component | Weight | Terrain Capability | Speed Class |
|-----------|--------|-------------------|-------------|
| Wheels (micro, 4x) | 0.05 kg | Smooth only | Fast |
| Wheels (small, 4x) | 0.5 kg | Roads, light off-road | Fast |
| Wheels (medium, 4x) | 2 kg | Most ground | Medium |
| Wheels (large, 4x) | 8 kg | Rough terrain | Medium |
| Treads (small) | 3 kg | All ground | Slow |
| Treads (large) | 15 kg | Extreme terrain | Slow |
| Legs (2x) | 4 kg | All terrain, climbing | Medium |
| Legs (4x) | 6 kg | All terrain, stable | Medium |
| Legs (6x) | 8 kg | Extreme terrain | Slow |
| Rotors (micro, 4x) | 0.1 kg | Air | Fast |
| Rotors (small, 4x) | 1 kg | Air | Fast |
| Rotors (large, 4x) | 5 kg | Air, heavy lift | Medium |
| Rotors (heavy, 8x) | 15 kg | Air, cargo | Slow |
| Propeller (water) | 1 kg | Underwater | Medium |
| Hydrojet | 3 kg | Underwater | Fast |

### Sensors

| Component | Weight | Range | Resolution |
|-----------|--------|-------|------------|
| Camera (basic) | 0.1 kg | 100m | Low |
| Camera (telephoto) | 0.3 kg | 1km | Medium |
| Camera (thermal) | 0.2 kg | 200m | Heat only |
| Camera (night vision) | 0.15 kg | 150m | Low light |
| Camera (360°) | 0.2 kg | 100m | Panoramic |
| Radar (small) | 1 kg | 500m | Object detection |
| Radar (large) | 5 kg | 5km | Wide area |
| Lidar | 0.5 kg | 200m | 3D mapping |
| Sonar (active) | 0.5 kg | 500m | Underwater |
| Sonar (passive) | 0.3 kg | 1km | Listening only |
| Chemical sensor | 0.2 kg | 10m | Gas/material |
| Radiation sensor | 0.1 kg | 50m | Radioactivity |
| EM sensor | 0.3 kg | 200m | Electronics |
| Seismic sensor | 0.5 kg | 500m | Vibration |
| Magnetic sensor | 0.2 kg | 100m | Metal/ore |
| Microphone array | 0.1 kg | 100m | Audio |

### Manipulation

| Component | Weight | Reach | Payload |
|-----------|--------|-------|---------|
| Gripper (micro) | 0.02 kg | — | 100g |
| Gripper (small) | 0.2 kg | — | 1kg |
| Gripper (medium) | 0.5 kg | — | 10kg |
| Gripper (heavy) | 2 kg | — | 50kg |
| Arm (light) | 1 kg | 0.5m | 5kg |
| Arm (medium) | 3 kg | 1m | 20kg |
| Arm (heavy) | 8 kg | 1.5m | 50kg |
| Arm (industrial) | 20 kg | 3m | 200kg |
| Drill (sampling) | 2 kg | — | Soft materials |
| Drill (mining) | 10 kg | — | Rock |
| Drill (industrial) | 30 kg | — | Anything |
| Welder | 2 kg | — | Metal joining |
| Plasma cutter | 3 kg | — | Metal cutting |
| Laser cutter | 1 kg | — | Precision |

### Weapons

| Component | Weight | Damage | Range | Ammo |
|-----------|--------|--------|-------|------|
| Machine gun (light) | 3 kg | Low | 200m | Yes |
| Machine gun (heavy) | 8 kg | Medium | 400m | Yes |
| Autocannon | 20 kg | High | 800m | Yes |
| Sniper system | 5 kg | High | 1km+ | Yes |
| Grenade launcher | 4 kg | Area | 300m | Yes |
| Missile launcher | 8 kg | V. High | 2km | Yes |
| Railgun | 25 kg | Extreme | 2km | No |
| Laser (light) | 2 kg | Low | 500m | No |
| Laser (heavy) | 8 kg | High | 1km | No |
| EMP projector | 5 kg | Disable | 100m | No |
| Blade | 0.5 kg | Medium | Contact | No |
| Shield generator | 8 kg | Defense | Self | No |

### Communication

| Component | Weight | Range |
|-----------|--------|-------|
| Radio (short) | 0.1 kg | 1km |
| Radio (medium) | 0.3 kg | 10km |
| Radio (long) | 1 kg | 100km |
| Relay antenna | 3 kg | Extends network |
| Satellite uplink | 5 kg | Global |
| Laser comm | 0.5 kg | Line of sight |
| ECM suite | 3 kg | 500m jamming |

### Utility

| Component | Weight | Function |
|-----------|--------|----------|
| Cargo bay (small) | 1 kg | 10kg capacity |
| Cargo bay (medium) | 3 kg | 50kg capacity |
| Cargo bay (large) | 10 kg | 200kg capacity |
| Fuel tank (small) | 1 kg | Generator supply |
| Fuel tank (large) | 5 kg | Extended ops |
| Hydrogen tank | 3 kg | Fuel cell supply |
| Noise dampener | 1 kg | Sound reduction |
| Heat sink | 2 kg | IR reduction |
| Repair kit | 2 kg | Field repairs |
| Hacking interface | 0.5 kg | Cyber attack |
| Self-destruct | 0.5 kg | Explosive |

---

## Example: Wheeled Scout

**Components:**
- Battery (medium): 40 output, 4 kg
- CPU (basic): 0.1 kg
- Small motor: 5 kg torque, 0.3 kg
- Wheels (small): 0.5 kg
- Camera (telephoto): 0.3 kg
- Camera (thermal): 0.2 kg
- Radio (medium): 0.3 kg

**Total weight:** 5.7 kg (well under motor's 5kg rating... needs bigger motor or lighter build)

**Revised with medium motor:**
- Total weight: 6.4 kg
- Medium motor handles 20 kg — plenty of margin

**Power at normal speed on roads:**
- Locomotion: 0.1 × 6.4 × 1.0 × 1.0 = 0.64
- Camera (active): 1.0
- Thermal (active): 1.0
- Radio (active): 0.5
- CPU: 1.0
- **Total: 4.14 / 40 capacity** — excellent endurance

**Compute cost (simple patrol):**
- Camera: 0.1
- Thermal: 0.1
- Simple routine: 1×
- **Cost: 0.2** — very light on compute

---

## Example: Mining Drone

**Components:**
- Generator (small): 40 output, 5 kg
- Fuel tank: 1 kg
- CPU (basic): 0.1 kg
- Large motor: 50 kg torque, 4 kg
- Treads (small): 3 kg
- Drill (mining): 10 kg
- Arm (medium): 3 kg
- Cargo bay (medium): 3 kg
- Magnetic sensor: 0.2 kg
- Camera (basic): 0.1 kg
- Radio (medium): 0.3 kg

**Total weight:** 29.7 kg (under motor's 50 kg rating)

**Power while drilling:**
- Locomotion (stationary): 0
- Drill (active): 15
- Arm (active): 3
- Sensors: 1
- Radio: 0.5
- CPU: 1
- **Total: 20.5 / 40 capacity** — sustainable

**Power while moving with full cargo (50kg payload):**
- Total moving weight: ~80 kg
- Locomotion: 0.2 × 80 × 1.5 × 0.5 = 12 (slow on rough ground)
- Other systems: ~3
- **Total: 15 / 40** — fine

**Compute cost (reactive mining routine):**
- Sensor: 0.1
- Drill operation: 0.3
- Arm coordination: 0.3
- Reactive routine: 2×
- **Cost: 1.4**

---

## Example: Mobile Core Unit

**Components:**
- Battery (massive): 150 output, 25 kg
- Generator (large): 100 output, 15 kg
- Fuel tank (large): 5 kg
- Server rack ×2: 120 compute, 40 kg
- Industrial motor: 200 kg torque, 15 kg
- Treads (large): 15 kg
- Radar (large): 5 kg
- Radio (long): 1 kg
- Relay antenna: 3 kg
- Shield generator: 8 kg
- Camera (360°): 0.2 kg

**Total weight:** 132.2 kg

**Power while moving:**
- Locomotion: 0.2 × 132 × 1.0 × 0.5 = 13.2 (slow)
- Server racks: 30
- Radar: 2
- Radio + relay: 5
- Shield (idle): 5
- Camera: 0.5
- **Total: 55.7 / 250 capacity** — lots of margin

**Compute:**
- Server racks contribute: 120
- Sensors + comms cost: ~1
- Simple routine: 1×
- **Net compute: +119** — major core unit

---

## Core Unit Economics

A drone becomes a **core unit** when its compute contribution exceeds its operational cost.

| Drone Type | Typical Cost | Needs Compute Hardware |
|------------|--------------|------------------------|
| Simple scout | 0.2 - 0.5 | CPU only, consumer |
| Smart scout | 1 - 2 | Compute module makes it neutral |
| Combat drone | 2 - 5 | Compute module makes it near-neutral |
| Mining drone | 1 - 2 | Compute module makes it contributor |
| Mobile base | 1 - 3 | Server rack(s) = major contributor |

**Trade-off:** Compute hardware adds weight and power draw. A drone loaded with server racks is slow and power-hungry but provides huge compute capacity.

---

## Spacecraft (Part 2)

Spacecraft use the same component assembly system but operate under different physics. This section covers space-specific mechanics (KSP-style orbital mechanics).

### Space vs Surface

| Aspect | Surface | Space |
|--------|---------|-------|
| Movement cost | Power (continuous) | Delta-v (burns) |
| Stopping | Free | Costs fuel |
| Environment | Terrain, air resistance | Vacuum, gravity wells |
| Key constraint | Power budget | Propellant mass |

### Core Concepts

**Delta-v (Δv):** Total velocity change available. Determined by:
```
Δv = Isp × g₀ × ln(m_wet / m_dry)
```
- **Isp**: Engine efficiency (specific impulse, in seconds)
- **m_wet**: Total mass with propellant
- **m_dry**: Mass without propellant
- Higher Isp = more efficient = more Δv per kg of fuel

**Thrust-to-Weight Ratio (TWR):** Determines if you can launch/land.
- TWR > 1: Can lift off from surface
- TWR < 1: Cannot escape gravity (but fine in orbit)
- Higher TWR = faster acceleration, but usually less efficient

**Orbital Mechanics:**
- Objects in orbit don't need thrust to stay there
- Changing orbits costs Δv
- Efficient transfers (Hohmann) take longer but cost less
- Direct burns are faster but expensive

### Propulsion Types

| Engine Type | Isp | Thrust | Notes |
|-------------|-----|--------|-------|
| Chemical (keralox) | 300-350s | High | Good for launch, landing |
| Chemical (hydrolox) | 400-450s | Medium | Better efficiency |
| Chemical (methylox) | 350-380s | High | Reusable-friendly |
| Nuclear thermal | 800-900s | Medium | Much better Isp, needs reactor |
| Ion drive | 3000-5000s | Very low | Excellent Isp, slow acceleration |
| Nuclear pulse | 2000-3000s | Very high | Extreme capability, exotic |

### Spacecraft Components

In addition to standard drone components, spacecraft need:

**Propulsion**

| Component | Isp | Thrust | Weight | Notes |
|-----------|-----|--------|--------|-------|
| Rocket engine (small) | 320s | 50 kN | 100 kg | Landers, small craft |
| Rocket engine (medium) | 340s | 200 kN | 400 kg | Standard |
| Rocket engine (large) | 350s | 800 kN | 1500 kg | Heavy lift |
| Vacuum engine | 380s | 100 kN | 200 kg | No atmosphere capability |
| Nuclear thermal | 850s | 150 kN | 2000 kg | Requires reactor fuel |
| Ion thruster | 4000s | 0.5 kN | 50 kg | Very slow, very efficient |
| RCS thrusters | 250s | 1 kN | 20 kg | Attitude control |

**Propellant Tanks**

| Component | Capacity | Dry Mass | Propellant Type |
|-----------|----------|----------|-----------------|
| Tank (small) | 1000 kg | 100 kg | Chemical |
| Tank (medium) | 5000 kg | 400 kg | Chemical |
| Tank (large) | 20000 kg | 1200 kg | Chemical |
| Cryo tank (small) | 800 kg | 150 kg | Hydrolox (boil-off) |
| Cryo tank (large) | 15000 kg | 2000 kg | Hydrolox |
| Hydrogen tank | 500 kg | 200 kg | Nuclear thermal |
| Xenon tank | 200 kg | 50 kg | Ion propulsion |

**Spacecraft-Specific**

| Component | Weight | Function |
|-----------|--------|----------|
| Heat shield (light) | 100 kg | Aerobraking, small craft |
| Heat shield (heavy) | 500 kg | Atmospheric entry |
| Landing legs (small) | 50 kg | Light lander |
| Landing legs (large) | 200 kg | Heavy lander |
| Docking port | 100 kg | Connect to other craft |
| Solar panels (large) | 50 kg | High power in space |
| Reaction wheels | 30 kg | Attitude control without fuel |
| Antenna (deep space) | 20 kg | Long-range communication |

### Delta-v Budget Examples

**Earth to Orbit:** ~9,400 m/s
- This is done in Part 1 (escape to wormhole)

**Typical Part 2 Operations:**

| Maneuver | Δv Required |
|----------|-------------|
| Low orbit to high orbit | 500-2000 m/s |
| Planet to moon | 1000-3000 m/s |
| Planet to planet (same star) | 5000-15000 m/s |
| Landing on moon (no atmosphere) | 1500-2500 m/s |
| Landing on planet (atmosphere) | Aerobraking + 500 m/s |

### Orbital Operations

**Time Warp:** Long transfers take in-game time. Player can time-warp during coasting phases (same as safe time-skip on surface).

**Refueling:**
- Can mine propellant from asteroids, moons, planets with right equipment
- In-situ resource utilization (ISRU) lets you extend range
- Critical for sustainable space operations

**Staging:** Large missions may require multiple stages:
- Launch stage (high thrust, expendable)
- Transfer stage (efficient engines)
- Landing stage (throttleable, restartable)

### Spacecraft Assembly

Same component philosophy as drones. A spacecraft is just:
- Engines + tanks + structure + payload
- All properties emerge from components
- Bigger isn't always better (more mass = more fuel needed)

**Example: Simple Orbital Shuttle**

| Component | Mass |
|-----------|------|
| Rocket engine (medium) | 400 kg |
| Tank (medium) | 400 kg dry + 5000 kg prop |
| CPU (advanced) | 0.2 kg |
| Battery (medium) | 4 kg |
| Reaction wheels | 30 kg |
| Camera (basic) | 0.1 kg |
| Radio (long) | 1 kg |
| RCS thrusters (x4) | 80 kg |
| **Dry mass** | **915 kg** |
| **Wet mass** | **5915 kg** |

Δv = 340 × 9.8 × ln(5915/915) = **6,280 m/s**

Good for orbital operations, not enough for interplanetary.

**Example: Interplanetary Transfer Vehicle**

| Component | Mass |
|-----------|------|
| Nuclear thermal engine | 2000 kg |
| Hydrogen tank (×2) | 400 kg dry + 1000 kg prop |
| Reaction wheels | 30 kg |
| Solar panels (large, ×4) | 200 kg |
| Server rack | 20 kg |
| Antenna (deep space) | 20 kg |
| Docking port (×2) | 200 kg |
| **Dry mass** | **2870 kg** |
| **Wet mass** | **3870 kg** |

Δv = 850 × 9.8 × ln(3870/2870) = **2,500 m/s**

Lower Δv but much more efficient engine — good for long-duration missions when combined with refueling.

### Space Combat Considerations

- Engagements happen at range (no atmosphere to limit weapons)
- Δv matters for pursuit/evasion
- Stealth is hard (heat signatures visible against cold space)
- Kinetic weapons don't slow down
- Lasers work better in vacuum (no atmospheric diffusion)

---

## Open Questions

- **Exact formulas:** Current numbers are illustrative; need balancing during prototyping
- **Power margin behavior:** What happens as draw approaches capacity? Graceful degradation?
- **Automation routines:** How are these created/modified? What's the interface?
- **Physical constraints:** Any limits on component combinations beyond weight/power?
- **Blueprints:** Which components require discovery vs. default availability?
