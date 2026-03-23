# Core Formulas

This document defines the mathematical formulas for Syntheteria's game mechanics. These formulas are engine-agnostic and can be implemented in any programming language.

**Status:** Partially updated. Power/compute formulas are current. Combat, territory, and time formulas need revision after component data redesign.

---

## Notation

- All weights in kilograms (kg)
- All power in abstract power units (PU)
- All compute in abstract compute units (CU)
- All distances in meters (m)

---

## 1. Drone Assembly Validation

A robot is valid if and only if:

```
has_power_source AND has_controller AND (has_locomotion OR is_stationary)
```

Where:
- `has_power_source`: At least one component with `power.output > 0` (or connected to lightning rod infrastructure)
- `has_controller`: At least one component in category `controller`
- `has_locomotion`: At least one component in category `locomotion`
- `is_stationary`: Robot is designated as a fixed installation

---

## 2. Weight Calculation

### 2.1 Total Robot Weight

```
total_weight = sum(component.weight for component in robot.components)
```

### 2.2 Payload Weight

```
payload_weight = sum(item.weight for item in robot.cargo)
```

### 2.3 Operational Weight

```
operational_weight = total_weight + payload_weight
```

---

## 3. Motor Requirements

### 3.1 Torque Validation

A robot can move if:

```
total_torque >= operational_weight
```

### 3.2 Torque Margin

```
torque_margin = total_torque / operational_weight
```

- `< 1.0`: Cannot move
- `1.0 - 1.5`: Sluggish movement
- `1.5 - 2.0`: Normal movement
- `> 2.0`: Agile movement

---

## 4. Power Calculation

### 4.1 Power Capacity

```
power_capacity = sum(source.power.output for source in robot.power_sources)
```

Note: Robots connected to lightning rod infrastructure may have effectively unlimited power while stationary (TBD).

### 4.2 Locomotion Power Draw

```
locomotion_power = base_rate × operational_weight × terrain_factor × speed_factor
```

**Base Rate by Locomotion Type:**

| Type | Base Rate |
|------|-----------|
| Wheels (road) | 0.10 |
| Wheels (off-road) | 0.15 |
| Treads | 0.20 |
| Legs (walking) | 0.25 |
| Legs (climbing) | 0.40 |
| Rotors (hover) | 0.50 |
| Rotors (forward) | 0.30 |
| Aquatic (surface) | 0.15 |
| Aquatic (submerged) | 0.20 |

**Terrain Factor:**

| Terrain | Factor |
|---------|--------|
| Smooth/paved | 1.0 |
| Rough ground | 1.5 |
| Steep incline | 2.0 |
| Extreme terrain | 2.5 |

**Speed Factor:**

| Speed | Factor |
|-------|--------|
| Idle | 0.0 |
| Slow | 0.5 |
| Normal | 1.0 |
| Fast | 1.5 |
| Maximum | 2.0 |

### 4.3 Total Power Draw

```
total_power_draw = locomotion_power + sum(function_power for each active component)
```

### 4.4 Power State

```
power_ratio = total_power_draw / power_capacity
```

- `<= 0.7`: Sustainable (green)
- `<= 0.9`: Elevated (yellow)
- `<= 1.0`: Critical (red)
- `> 1.0`: Overdraw — must reduce activity or shut down

---

## 5. Compute Calculation

### 5.1 Automation Multiplier

| Automation Level | Multiplier |
|------------------|------------|
| Direct control | 0.5× |
| Simple routine | 1.0× |
| Reactive routine | 2.0× |
| Adaptive routine | 3.0× |
| Full autonomy | 5.0× |

### 5.2 Robot Compute Cost

```
base_cost = sum(function.base_cost for each active function)
robot_compute_cost = base_cost × automation_multiplier
```

### 5.3 Net Compute

```
net_compute = robot_compute_contribution - robot_compute_cost
```

### 5.4 Global Compute Pool

```
global_compute = sum(net_compute for each robot where net_compute > 0)
compute_demand = sum(abs(net_compute) for each robot where net_compute < 0)
available_compute = global_compute - compute_demand
```

If `available_compute < 0`, robots must be shut down or reduced.

---

## 6. Hacking Formulas

### 6.1 Hack Feasibility

A hack can be attempted if:

```
has_signal_link AND has_technique AND available_compute >= hack_compute_cost
```

### 6.2 Hack Compute Cost

```
hack_compute_cost = target_complexity × technique_efficiency
```

Where:
- `target_complexity`: Based on target's compute contribution and hack resistance
- `technique_efficiency`: Based on the quality of the discovered hacking technique (lower = better)

### 6.3 Hack Duration

```
hack_duration = base_duration × (target_hack_resistance / player_compute_surplus)
```

Stronger targets take longer. More available compute speeds the process.

---

## 7. Signal Range

### 7.1 Base Signal Range

```
base_signal_range = 1000m  (starting, from core infrastructure)
```

### 7.2 Extended Range

```
extended_range = base_signal_range + sum(relay.range for each relay in network)
```

### 7.3 Robot Connectivity

A robot is connected if:

```
distance_to_nearest_relay <= relay.range OR distance_to_core <= base_signal_range
```

---

## 8. Lightning (TBD)

### 8.1 Lightning Rod Power

```
lightning_power = rod_capacity × storm_intensity
```

Storm intensity, rod capacity, and power distribution formulas need definition.

### 8.2 Random Lightning Strikes

Outside the city, random lightning strikes occur:

```
strike_probability = base_rate × storm_intensity × exposure_factor
```

Where `exposure_factor` = 0 inside lightning rod protection, 1.0 in open terrain.

### 8.3 Cultist Lightning

Cultist-called lightning:

```
lightning_damage = base_damage × cultist_power_level
```

Mechanics TBD (cooldown, range, targeting).

---

## 9. Needs Redesign

The following sections from the previous version need to be redone after component data is redesigned:

- **Combat damage formulas** — need to account for cultist lightning and supernatural abilities
- **Territory control** — may work differently with the specific world geography
- **Manufacturing time** — needs to work with pause/speed controls instead of accelerated time
- **Sensor detection** — visibility modifiers should reflect the perpetual storm (no "clear day")

---

## Implementation Notes

1. **Floating Point**: Use floating point for all calculations. Round only for display.
2. **Update Frequency**: Power/compute every game tick. Combat every tick. Manufacturing per game-tick scaled by speed.
3. **Caching**: Cache derived values and invalidate when components change.
4. **Edge Cases**: Protect against division by zero, clamp negatives, cap at maximums.
5. **Balancing**: All numbers are initial estimates. Expect adjustment during playtesting.
