# Core Formulas

This document defines the precise mathematical formulas for Syntheteria's game mechanics. These formulas are engine-agnostic and can be implemented in any programming language.

---

## Notation

- All weights in kilograms (kg)
- All power in abstract power units (PU)
- All compute in abstract compute units (CU)
- All distances in meters (m)
- All times in game-hours unless specified

---

## 1. Drone Assembly Validation

A drone is valid if and only if:

```
has_power_source AND has_controller AND (has_locomotion OR is_stationary)
```

Where:
- `has_power_source`: At least one component with `power.output > 0`
- `has_controller`: At least one component in category `controller`
- `has_locomotion`: At least one component in category `locomotion`
- `is_stationary`: Drone is designated as a fixed installation

---

## 2. Weight Calculation

### 2.1 Total Drone Weight

```
total_weight = sum(component.weight for component in drone.components)
```

### 2.2 Payload Weight

```
payload_weight = sum(item.weight for item in drone.cargo)
```

### 2.3 Operational Weight

```
operational_weight = total_weight + payload_weight
```

---

## 3. Motor Requirements

### 3.1 Torque Validation

A drone can move if:

```
total_torque >= operational_weight
```

Where:

```
total_torque = sum(motor.torque_rating for motor in drone.motors)
```

### 3.2 Torque Margin

```
torque_margin = total_torque / operational_weight
```

- `torque_margin < 1.0`: Cannot move
- `torque_margin = 1.0 - 1.5`: Sluggish movement
- `torque_margin = 1.5 - 2.0`: Normal movement
- `torque_margin > 2.0`: Agile movement

---

## 4. Power Calculation

### 4.1 Power Capacity

```
power_capacity = sum(source.power.output for source in drone.power_sources)
```

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

### 4.3 Function Power Draw

Each active component draws power based on its state:

```
function_power = component.power.draw_idle    (if idle)
               = component.power.draw_active  (if active)
               = component.power.draw_max     (if at maximum)
```

### 4.4 Total Power Draw

```
total_power_draw = locomotion_power + sum(function_power for each active component)
```

### 4.5 Power State

```
power_ratio = total_power_draw / power_capacity
```

- `power_ratio <= 0.7`: Sustainable (green)
- `power_ratio <= 0.9`: Elevated (yellow)
- `power_ratio <= 1.0`: Critical (red)
- `power_ratio > 1.0`: Overdraw - drone must reduce activity or shut down

### 4.6 Battery Duration

For battery-powered drones:

```
duration_hours = power_capacity / total_power_draw
```

For fuel-powered drones:

```
fuel_consumption_rate = sum(source.power.fuel_rate for source in active_fuel_sources)
duration_hours = fuel_tank_capacity / fuel_consumption_rate
```

---

## 5. Compute Calculation

### 5.1 Base Function Cost

Each active function requires compute:

| Function Category | Base Cost (CU) |
|-------------------|----------------|
| Passive sensor (camera feed) | 0.1 |
| Active sensor (radar, lidar) | 0.3 |
| Sensor fusion (per input) | 0.5 |
| Simple manipulation | 0.1 |
| Complex manipulation | 0.3 |
| Coordinated manipulation | 0.5 |
| Weapon (manual targeting) | 0.2 |
| Weapon (auto-targeting) | 0.5 |
| Communication relay | 0.2 |

### 5.2 Automation Multiplier

| Automation Level | Multiplier | Description |
|------------------|------------|-------------|
| Direct control | 0.5× | Player controls every action |
| Simple routine | 1.0× | Follow waypoints, repeat actions |
| Reactive routine | 2.0× | Respond to triggers (if-then) |
| Adaptive routine | 3.0× | Adjust behavior based on conditions |
| Full autonomy | 5.0× | Make independent decisions |

### 5.3 Drone Compute Cost

```
base_cost = sum(function.base_cost for each active function)
drone_compute_cost = base_cost × automation_multiplier
```

### 5.4 Drone Compute Contribution

```
drone_compute_contribution = sum(controller.compute.contribution for controller in drone.controllers)
```

### 5.5 Net Compute

```
net_compute = drone_compute_contribution - drone_compute_cost
```

- `net_compute > 0`: Core unit (contributes to global pool)
- `net_compute = 0`: Neutral (self-sufficient)
- `net_compute < 0`: Consumer (costs from global pool)

### 5.6 Global Compute Pool

```
global_compute = sum(net_compute for each drone where net_compute > 0)
compute_demand = sum(abs(net_compute) for each drone where net_compute < 0)
available_compute = global_compute - compute_demand
```

If `available_compute < 0`, drones must be:
1. Switched to lower automation levels
2. Have functions disabled
3. Shut down entirely

---

## 6. Combat Formulas

### 6.1 Damage Calculation

Base damage values:

| Damage Class | Base Damage |
|--------------|-------------|
| Low | 10 |
| Medium | 25 |
| High | 50 |
| Very High | 100 |
| Extreme | 200 |

### 6.2 Damage Application

```
effective_damage = base_damage × range_modifier × accuracy_modifier
```

**Range Modifier:**

```
range_modifier = 1.0                     (if distance <= effective_range × 0.5)
               = 1.0 - (distance - effective_range × 0.5) / (effective_range × 0.5)
                                         (if distance <= effective_range)
               = 0.0                     (if distance > effective_range)
```

**Accuracy Modifier:**

```
accuracy_modifier = 1.0    (manual targeting, stationary target)
                  = 0.8    (manual targeting, moving target)
                  = 0.9    (auto targeting, stationary target)
                  = 0.7    (auto targeting, moving target)
```

### 6.3 Armor and Penetration

```
damage_taken = effective_damage × (1 - armor_reduction)
```

Armor reduction is based on component materials (TBD during balancing).

### 6.4 Component Damage

Damage is distributed to components:

```
component_damage = damage_taken × (component.weight / total_weight) × random(0.5, 1.5)
```

Components are destroyed when accumulated damage exceeds their durability threshold.

---

## 7. Signal Range

### 7.1 Base Signal Range

The player's consciousness has a base signal range from core infrastructure:

```
base_signal_range = 1000m  (starting)
```

### 7.2 Extended Range

Relay components extend the network:

```
extended_range = base_signal_range + sum(relay.communication.range for each relay in network)
```

### 7.3 Drone Connectivity

A drone is connected if:

```
distance_to_nearest_relay <= relay.communication.range
```

Or:

```
distance_to_core <= base_signal_range
```

Disconnected drones:
- Cannot receive commands
- Cannot contribute compute
- Continue last automation routine until reconnected or power depleted

---

## 8. Territory Control

### 8.1 Control Radius

Each facility contributes a control radius:

| Facility Type | Control Radius |
|---------------|----------------|
| Relay Tower | 500m |
| Outpost | 1000m |
| Base | 2000m |
| Fortress | 5000m |

### 8.2 Contested Territory

Territory is contested if:

```
player_control_strength > 0 AND enemy_control_strength > 0
```

Control strength at a point:

```
control_strength = sum(facility.strength / distance² for each facility within range)
```

### 8.3 Resource Gathering

Resources can only be gathered in controlled (non-contested) territory.

---

## 9. Time and Manufacturing

### 9.1 Manufacturing Time

```
actual_time = base_time × (1 / facility_efficiency) × (1 / automation_level)
```

Where:
- `base_time`: From component crafting specification
- `facility_efficiency`: 0.5 (damaged) to 2.0 (upgraded)
- `automation_level`: 0.5 (manual) to 2.0 (fully automated)

### 9.2 Time Skip

Time can be skipped when:

```
is_safe = all_territory_uncontested AND no_threats_detected
```

During time skip:
- Manufacturing completes
- Resources are consumed/produced
- Radiation increases
- Random events may trigger and interrupt

---

## 10. Radiation Progression

### 10.1 Global Radiation Level

```
radiation_level = base_radiation + (time_elapsed / time_to_el_arrival) × 100
```

Where:
- `base_radiation`: 0 at game start
- `time_to_el_arrival`: Total game-time until EL return (configurable)

### 10.2 Radiation Effects

| Level | Effect |
|-------|--------|
| 0-20 | Minimal - cosmetic effects only |
| 20-40 | Low - feral creatures become more aggressive |
| 40-60 | Moderate - electronics may malfunction |
| 60-80 | High - regional threats emerge |
| 80-100 | Critical - EL return imminent |
| 100 | EL arrive - final phase begins |

---

## 11. Sensor Detection

### 11.1 Detection Range

```
detection_range = sensor.range × visibility_modifier
```

**Visibility Modifiers:**

| Condition | Modifier |
|-----------|----------|
| Clear day | 1.0 |
| Night | 0.5 (visual), 1.0 (thermal/radar) |
| Rain/Fog | 0.3 (visual), 0.7 (radar), 1.0 (thermal) |
| Underground | 0.0 (visual), 0.5 (radar), 0.8 (seismic) |

### 11.2 Stealth

Stealth components reduce detection range against the drone:

```
effective_detection_range = detection_range × (1 - stealth_modifier)
```

---

## Implementation Notes

1. **Floating Point**: Use floating point for all calculations. Round only for display.

2. **Update Frequency**:
   - Power/compute: Every game tick (10/second recommended)
   - Combat: Every game tick
   - Manufacturing: Every game-minute
   - Radiation: Every game-hour

3. **Caching**: Cache derived values (total_weight, power_capacity, etc.) and invalidate when components change.

4. **Edge Cases**:
   - Division by zero: Protect against zero weight, zero capacity
   - Negative values: Clamp to zero where appropriate
   - Overflow: Cap at reasonable maximums

5. **Balancing**: All numeric values in this document are initial estimates. Expect adjustment during playtesting.
