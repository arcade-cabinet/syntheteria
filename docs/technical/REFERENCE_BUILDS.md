# Reference Drone Builds

This document defines 10 reference drone builds to validate component balance and formula interactions. Each build represents a distinct gameplay archetype.

---

## Build Archetypes

| # | Name | Role | Tier | Locomotion |
|---|------|------|------|------------|
| 1 | Micro Scout | Minimum viable recon | 1 | Wheels |
| 2 | Light Scout | Standard reconnaissance | 1-2 | Wheels |
| 3 | Cargo Hauler | Resource transport | 2 | Wheels |
| 4 | Combat Striker | Fast attack | 2-3 | Wheels |
| 5 | Heavy Tank | Armored assault | 3-4 | Treads |
| 6 | Aerial Recon | Flying scout | 2 | Rotors |
| 7 | Mining Drone | Resource extraction | 2-3 | Treads |
| 8 | Support Unit | Field repair | 2-3 | Wheels |
| 9 | Sniper Platform | Long-range precision | 3 | Legs |
| 10 | Mobile Compute | Network node | 3-4 | Treads |

---

## Build 1: Micro Scout

**Role**: Absolute minimum viable drone for early-game scouting.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Micro Battery | 0.10 | 5 | - | - |
| Microcontroller | 0.05 | - | 0.5 | 0 |
| Micro Motor | 0.02 | - | - | - |
| Micro Wheels (4x) | 0.05 | - | - | - |
| Basic Camera | 0.10 | - | 0.5 (active) | 0.1 |
| **TOTAL** | **0.32** | **5** | **1.0** | **-0.1** |

### Calculations

**Weight**: 0.32 kg

**Torque Check**:
- Total torque: 0.5 (micro motor)
- Operational weight: 0.32 kg
- Torque margin: 0.5 / 0.32 = **1.56** (Normal movement)

**Power Budget** (normal speed, smooth terrain):
- Locomotion: 0.1 × 0.32 × 1.0 × 1.0 = 0.032 PU
- Camera active: 0.5 PU
- Controller: 0.5 PU
- **Total draw**: 1.032 PU
- **Power capacity**: 5 PU
- **Power ratio**: 1.032 / 5 = **20.6%** (Sustainable - green)
- **Duration**: 5 / 1.032 = **4.8 hours**

**Compute Budget**:
- Camera base cost: 0.1 CU
- Automation (simple routine, 1.0×): 0.1 CU
- Contribution: 0 CU
- **Net compute**: -0.1 CU (Consumer)

### Assessment
✅ **VALID BUILD** - Functional minimal scout
- Very power-efficient (4.8 hour endurance)
- Minimal compute burden on network
- Torque margin allows normal movement
- Extremely cheap to produce

---

## Build 2: Light Scout

**Role**: Standard early-game reconnaissance drone with better sensors.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Small Battery | 1.0 | 15 | - | - |
| Basic CPU | 0.1 | - | 1.5 | 0 |
| Small Motor | 0.3 | - | - | - |
| Small Wheels (4x) | 0.5 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Thermal Camera | 0.2 | - | 1.0 | 0.1 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **2.3** | **15** | **3.5** | **-0.3** |

### Calculations

**Weight**: 2.3 kg

**Torque Check**:
- Total torque: 5 (small motor)
- Torque margin: 5 / 2.3 = **2.17** (Agile movement)

**Power Budget** (normal speed, smooth terrain):
- Locomotion: 0.1 × 2.3 × 1.0 × 1.0 = 0.23 PU
- Sensors active: 1.5 PU
- Controller: 1.5 PU
- Radio: 0.5 PU
- **Total draw**: 3.73 PU
- **Power capacity**: 15 PU
- **Power ratio**: 3.73 / 15 = **24.9%** (Sustainable - green)
- **Duration**: 15 / 3.73 = **4.0 hours**

**Compute Budget** (simple routine):
- Cameras: 0.2 CU
- Radio: 0.1 CU
- **Net compute**: -0.3 CU (Consumer)

### Assessment
✅ **VALID BUILD** - Solid early scout
- Dual-spectrum vision (daylight + thermal)
- Good 4-hour operational window
- Agile movement for evasion
- Light compute footprint

---

## Build 3: Cargo Hauler

**Role**: Mid-game resource transport between facilities.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Medium Battery | 4.0 | 40 | - | - |
| Basic CPU | 0.1 | - | 1.5 | 0 |
| Medium Motor ×2 | 2.0 | - | - | - |
| Medium Wheels (4x) | 2.0 | - | - | - |
| Large Cargo Bay | 10.0 | - | 0 | 0 |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **18.3** | **40** | **2.5** | **-0.2** |

### Calculations

**Weight** (empty): 18.3 kg
**Cargo capacity**: 200 kg
**Max operational weight**: 218.3 kg

**Torque Check** (full load):
- Total torque: 40 (2× medium motors)
- Torque margin (empty): 40 / 18.3 = **2.19** (Agile)
- Torque margin (full): 40 / 218.3 = **0.18** ❌ Cannot move!

**ISSUE IDENTIFIED**: Need more motors for full cargo load.

### Revised Build (add 2 more medium motors)
| Component | Weight (kg) |
|-----------|-------------|
| Medium Motor ×4 | 4.0 |
| **New Total** | **20.3** |

**Revised Torque** (full load at 220.3 kg):
- Total torque: 80
- Torque margin: 80 / 220.3 = **0.36** ❌ Still cannot move!

### Further Revised (use Large Motors)
| Component | Weight (kg) | Torque |
|-----------|-------------|--------|
| Large Motor ×2 | 8.0 | 100 |
| Large Battery | 10.0 | - |
| **New Total** | **32.3** |
| **Full load** | **232.3** |

- Torque margin (full): 100 / 232.3 = **0.43** ❌

### Analysis
⚠️ **BALANCE ISSUE**: Large Cargo Bay (200kg capacity) cannot be moved by available motors.

**Finding**: Motor torque ratings are too low relative to cargo capacities. Options:
1. Reduce cargo capacity values
2. Increase motor torque ratings
3. Allow multiple locomotion components to stack

**Workable Alternative**: Medium Cargo Bay (50kg capacity)

### Working Cargo Hauler Build
| Component | Weight (kg) | Power | Torque |
|-----------|-------------|-------|--------|
| Medium Battery | 4.0 | 40 out | - |
| Basic CPU | 0.1 | 1.5 draw | - |
| Large Motor ×1 | 4.0 | - | 50 |
| Medium Wheels (4x) | 2.0 | - | - |
| Medium Cargo Bay | 3.0 | 0 | - |
| Basic Camera | 0.1 | 0.5 | - |
| Short-Range Radio | 0.1 | 0.5 | - |
| **TOTAL** | **13.3** | **40 / 2.5** | **50** |

**Full load**: 13.3 + 50 = 63.3 kg
**Torque margin**: 50 / 63.3 = **0.79** ❌ Still sluggish/cannot move

**Further Revised with Industrial Motor**:
| Component | Weight (kg) | Torque |
|-----------|-------------|--------|
| Industrial Motor | 15.0 | 200 |
| Large Battery | 10.0 | 80 out |
| Large Wheels (4x) | 8.0 | - |
| **Base weight** | **36.4** |
| **+ 50kg cargo** | **86.4** |

- Torque margin: 200 / 86.4 = **2.31** ✅ (Agile)

### Final Working Cargo Build
| Component | Weight (kg) |
|-----------|-------------|
| Large Battery | 10.0 |
| Basic CPU | 0.1 |
| Industrial Motor | 15.0 |
| Large Wheels (4x) | 8.0 |
| Medium Cargo Bay | 3.0 |
| Basic Camera | 0.1 |
| Short-Range Radio | 0.1 |
| **TOTAL** | **36.3** |

**With 50kg cargo**: 86.3 kg, torque margin 2.31 ✅

**Power Budget**:
- Locomotion: 0.1 × 86.3 × 1.0 × 1.0 = 8.63 PU
- Components: 2.5 PU
- **Total**: 11.13 PU / 80 PU = **13.9%** ✅

✅ **VALID BUILD** after significant component upgrades

---

## Build 4: Combat Striker

**Role**: Fast attack drone for hit-and-run tactics.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Medium Battery | 4.0 | 40 | - | - |
| Advanced CPU | 0.2 | - | 3 | +2 |
| Medium Motor | 1.0 | - | - | - |
| Small Wheels (4x) | 0.5 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Light Machine Gun | 3.0 | - | 2 | 0.2 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **8.9** | **40** | **6.0** | **+1.6** |

### Calculations

**Weight**: 8.9 kg

**Torque Check**:
- Total torque: 20 (medium motor)
- Torque margin: 20 / 8.9 = **2.25** (Agile)

**Power Budget** (fast speed, rough terrain - combat conditions):
- Locomotion: 0.1 × 8.9 × 1.5 × 1.5 = 2.0 PU
- Camera: 0.5 PU
- Controller: 3.0 PU
- Weapon (active): 2.0 PU
- Radio: 0.5 PU
- **Total draw**: 8.0 PU
- **Power ratio**: 8.0 / 40 = **20%** (Sustainable)
- **Duration in combat**: 40 / 8.0 = **5 hours**

**Compute Budget** (reactive routine, 2.0×):
- Base: 0.1 + 0.2 + 0.1 = 0.4 CU
- With automation: 0.4 × 2.0 = 0.8 CU
- Contribution: 2.0 CU
- **Net compute**: +1.2 CU (Contributor!)

### Assessment
✅ **VALID BUILD** - Excellent striker
- Agile movement for flanking
- 5-hour combat endurance
- Net compute contributor (rare for combat unit)
- Light Machine Gun effective vs light targets

---

## Build 5: Heavy Tank

**Role**: Armored assault platform for front-line combat.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Large Battery | 10.0 | 80 | - | - |
| Generator (Small) | 5.0 | 40 | fuel | - |
| Advanced CPU | 0.2 | - | 3 | +2 |
| Industrial Motor | 15.0 | - | - | - |
| Large Treads | 15.0 | - | - | - |
| 360° Camera | 0.2 | - | 1 | 0.2 |
| Heavy Machine Gun | 8.0 | - | 4 | 0.25 |
| Autocannon | 20.0 | - | 6 | 0.3 |
| Shield Generator | 8.0 | - | 10 | 0.2 |
| Medium-Range Radio | 0.3 | - | 1.5 | 0.1 |
| Fuel Tank (Small) | 1.0 | - | 0 | 0 |
| **TOTAL** | **82.7** | **120** | **25.75** | **+0.95** |

### Calculations

**Weight**: 82.7 kg

**Torque Check**:
- Total torque: 200 (industrial motor)
- Torque margin: 200 / 82.7 = **2.42** (Agile - surprising for a tank!)

**Power Budget** (normal speed, rough terrain):
- Locomotion (treads): 0.2 × 82.7 × 1.5 × 1.0 = 24.8 PU
- Components: 25.75 PU
- **Total draw**: 50.55 PU
- **Power capacity**: 120 PU (battery + generator)
- **Power ratio**: 50.55 / 120 = **42%** (Sustainable)

**Fuel Duration**:
- Generator fuel rate: 1.0/hour
- Fuel tank capacity: 20 units
- **Fuel duration**: 20 hours (if generator runs continuously)

**Compute Budget** (adaptive routine, 3.0×):
- Base: 0.2 + 0.25 + 0.3 + 0.2 + 0.1 = 1.05 CU
- With automation: 1.05 × 3.0 = 3.15 CU
- Contribution: 2.0 CU
- **Net compute**: -1.15 CU (Consumer)

### Assessment
✅ **VALID BUILD** - Powerful tank
- Dual weapons (sustained + burst damage)
- Shield for survivability
- Long operational range with fuel
- Moderate compute cost for a heavy unit

---

## Build 6: Aerial Recon

**Role**: Flying scout for rapid area coverage.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Medium Battery | 4.0 | 40 | - | - |
| Basic CPU | 0.1 | - | 1.5 | 0 |
| Small Rotors (4x) | 1.0 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Telephoto Camera | 0.3 | - | 1.0 | 0.1 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **5.6** | **40** | **3.5** | **-0.3** |

### Calculations

**Weight**: 5.6 kg

**Power Budget** (hover):
- Locomotion (rotors, hover): 0.5 × 5.6 × 1.0 × 1.0 = 2.8 PU
- Components: 3.5 PU
- **Total draw**: 6.3 PU
- **Power ratio**: 6.3 / 40 = **15.8%** (Sustainable)
- **Hover duration**: 40 / 6.3 = **6.3 hours**

**Power Budget** (fast forward flight):
- Locomotion: 0.3 × 5.6 × 1.0 × 1.5 = 2.52 PU
- Components: 3.5 PU
- **Total draw**: 6.02 PU
- **Flight duration**: 40 / 6.02 = **6.6 hours**

**Compute Budget** (simple routine):
- **Net compute**: -0.3 CU (Consumer)

### Assessment
✅ **VALID BUILD** - Effective aerial scout
- 6+ hour flight time
- Forward flight slightly more efficient than hover
- Long-range visual with telephoto
- Very light compute footprint

---

## Build 7: Mining Drone

**Role**: Resource extraction in the field.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Large Battery | 10.0 | 80 | - | - |
| Advanced CPU | 0.2 | - | 3 | +2 |
| Large Motor | 4.0 | - | - | - |
| Small Treads | 3.0 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Mining Drill | 10.0 | - | 15 | 0.2 |
| Medium Cargo Bay | 3.0 | - | 0 | 0 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **30.4** | **80** | **19.0** | **+1.6** |

### Calculations

**Weight** (empty): 30.4 kg
**With cargo**: 80.4 kg (50kg ore)

**Torque Check**:
- Total torque: 50 (large motor)
- Margin (empty): 50 / 30.4 = **1.64** (Normal)
- Margin (full): 50 / 80.4 = **0.62** ❌ Cannot return with full load!

### Revised with Industrial Motor
| Component | Weight (kg) |
|-----------|-------------|
| Industrial Motor | 15.0 |
| **New Total** | **41.4** |
| **With cargo** | **91.4** |

- Torque margin (full): 200 / 91.4 = **2.19** ✅

**Power Budget** (drilling, stationary):
- Locomotion: 0 (stationary)
- Drill active: 15 PU
- Components: 4.0 PU
- **Total draw**: 19.0 PU
- **Power ratio**: 19.0 / 80 = **23.8%** (Sustainable)

**Compute Budget** (simple routine):
- Base: 0.4 CU × 1.0 = 0.4 CU
- Contribution: 2.0 CU
- **Net compute**: +1.6 CU (Contributor)

### Assessment
✅ **VALID BUILD** (with Industrial Motor)
- Can mine and return with full cargo
- Power-efficient drilling operations
- Net compute contributor
- Treads handle rough mining terrain

---

## Build 8: Support Unit

**Role**: Field repair and logistics support.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Medium Battery | 4.0 | 40 | - | - |
| Advanced CPU | 0.2 | - | 3 | +2 |
| Medium Motor | 1.0 | - | - | - |
| Medium Wheels (4x) | 2.0 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Light Arm | 1.0 | - | 1 | 0.2 |
| Medium Gripper | 0.5 | - | 0.5 | 0.1 |
| Welder | 2.0 | - | 8 | 0.2 |
| Repair Kit | 2.0 | - | 0.5 | 0.1 |
| Small Cargo Bay | 1.0 | - | 0 | 0 |
| Short-Range Radio | 0.1 | - | 0.5 | 0.1 |
| **TOTAL** | **13.9** | **40** | **14.0** | **+1.2** |

### Calculations

**Weight**: 13.9 kg

**Torque Check**:
- Total torque: 20 (medium motor)
- Torque margin: 20 / 13.9 = **1.44** (Sluggish)

**Power Budget** (repair mode):
- Locomotion: 0 (stationary during repairs)
- Arm + Gripper + Welder: 9.5 PU
- Other components: 4.5 PU
- **Total draw**: 14.0 PU
- **Power ratio**: 14.0 / 40 = **35%** (Sustainable)

**Power Budget** (travel mode):
- Locomotion: 0.1 × 13.9 × 1.0 × 1.0 = 1.39 PU
- Basic components: 4.5 PU
- **Total**: 5.89 PU
- **Duration**: 40 / 5.89 = **6.8 hours travel**

**Compute Budget** (adaptive routine, 3.0×):
- Base: 0.8 CU
- With automation: 0.8 × 3.0 = 2.4 CU
- Contribution: 2.0 CU
- **Net compute**: -0.4 CU (Slight consumer)

### Assessment
✅ **VALID BUILD** - Functional support unit
- Can travel ~7 hours to reach damaged units
- Welder draws significant power but sustainable
- Slightly sluggish movement (acceptable for support)
- Light compute burden

---

## Build 9: Sniper Platform

**Role**: Long-range precision fire support.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Medium Battery | 4.0 | 40 | - | - |
| Advanced CPU | 0.2 | - | 3 | +2 |
| Medium Motor | 1.0 | - | - | - |
| Quadruped Legs (4x) | 6.0 | - | - | - |
| Telephoto Camera | 0.3 | - | 1.0 | 0.1 |
| Sniper System | 5.0 | - | 2 | 0.3 |
| Medium-Range Radio | 0.3 | - | 1.5 | 0.1 |
| Noise Dampener | 1.0 | - | 0 | 0 |
| **TOTAL** | **17.8** | **40** | **7.5** | **+1.5** |

### Calculations

**Weight**: 17.8 kg

**Torque Check**:
- Total torque: 20 (medium motor)
- Torque margin: 20 / 17.8 = **1.12** (Sluggish movement)

⚠️ **Issue**: Legs require more torque for stable movement. Need larger motor.

### Revised with Large Motor
| Component | Weight (kg) |
|-----------|-------------|
| Large Motor | 4.0 |
| **New Total** | **20.8** |

- Torque margin: 50 / 20.8 = **2.40** ✅ (Agile)

**Power Budget** (firing position, stationary):
- Locomotion: 0
- Sniper + Camera: 3.0 PU
- Controller + Radio: 4.5 PU
- **Total draw**: 7.5 PU
- **Power ratio**: 7.5 / 40 = **18.8%** (Sustainable)
- **Duration**: 40 / 7.5 = **5.3 hours in position**

**Power Budget** (moving, rough terrain):
- Locomotion (legs): 0.25 × 20.8 × 1.5 × 1.0 = 7.8 PU
- Components: 7.5 PU
- **Total**: 15.3 PU
- **Duration moving**: 40 / 15.3 = **2.6 hours**

**Compute Budget** (adaptive routine):
- Base: 0.5 CU × 3.0 = 1.5 CU
- Contribution: 2.0 CU
- **Net compute**: +0.5 CU (Contributor)

### Assessment
✅ **VALID BUILD** (with Large Motor)
- Legs allow positioning on any terrain
- 1500m range with Sniper System
- Noise dampener reduces detection
- Good endurance when stationary

---

## Build 10: Mobile Compute Node

**Role**: Extend network and provide compute capacity.

### Components
| Component | Weight (kg) | Power Out | Power Draw | Compute |
|-----------|-------------|-----------|------------|---------|
| Large Battery | 10.0 | 80 | - | - |
| Large Generator | 15.0 | 100 | fuel | - |
| Compute Module | 1.0 | - | 5 | +10 |
| Adv. Compute Module | 3.0 | - | 12 | +25 |
| Industrial Motor | 15.0 | - | - | - |
| Large Treads | 15.0 | - | - | - |
| Basic Camera | 0.1 | - | 0.5 | 0.1 |
| Relay Antenna | 3.0 | - | 3 | 0.2 |
| Medium-Range Radio | 0.3 | - | 1.5 | 0.1 |
| Fuel Tank (Large) | 5.0 | - | 0 | 0 |
| **TOTAL** | **67.4** | **180** | **22.0** | **+34.6** |

### Calculations

**Weight**: 67.4 kg

**Torque Check**:
- Total torque: 200 (industrial motor)
- Torque margin: 200 / 67.4 = **2.97** (Very agile)

**Power Budget** (stationary compute mode):
- Locomotion: 0
- Compute modules: 17 PU
- Other components: 5.0 PU
- **Total draw**: 22.0 PU
- **Power capacity**: 180 PU
- **Power ratio**: 22.0 / 180 = **12.2%** (Very sustainable)

**Power Budget** (moving, extreme terrain):
- Locomotion (treads): 0.2 × 67.4 × 2.5 × 1.0 = 33.7 PU
- Components: 22.0 PU
- **Total**: 55.7 PU
- **Power ratio**: 55.7 / 180 = **30.9%** (Sustainable)

**Fuel Duration** (generator at full load):
- Fuel rate: 2.5/hour
- Fuel capacity: 100 units
- **Duration**: 40 hours of operation

**Compute Budget**:
- Contribution: 10 + 25 = 35 CU
- Cost (simple routine): 0.4 × 1.0 = 0.4 CU
- **Net compute**: +34.6 CU (Major contributor!)

### Assessment
✅ **VALID BUILD** - Powerful infrastructure unit
- Provides 35 CU to global pool
- Extends network range by 5000m (relay)
- 40+ hours operational endurance
- Can relocate to where compute is needed

---

## Balance Analysis Summary

### Issues Identified

| Issue | Severity | Components Affected | Recommendation |
|-------|----------|---------------------|----------------|
| Cargo capacity vs motor torque | **HIGH** | Large Cargo Bay, all motors | Large Cargo Bay (200kg) is impractical. Consider reducing to 100kg or adding torque stacking. |
| Leg locomotion needs high torque | MEDIUM | All leg types | Document that legs require larger motors; this is intentional for balance. |
| Industrial Motor dominance | MEDIUM | All heavy builds | Industrial Motor (200 torque) is required for most heavy builds. Consider a mid-tier option around 100 torque. |

### Power Efficiency Rankings

| Build | Power Ratio | Duration | Verdict |
|-------|-------------|----------|---------|
| Micro Scout | 20.6% | 4.8h | Excellent |
| Light Scout | 24.9% | 4.0h | Good |
| Aerial Recon | 15.8% | 6.3h | Excellent |
| Combat Striker | 20.0% | 5.0h | Good |
| Heavy Tank | 42.0% | - | Acceptable (fuel-extended) |
| Mining Drone | 23.8% | - | Good (while drilling) |
| Support Unit | 35.0% | - | Acceptable |
| Sniper Platform | 18.8% | 5.3h | Excellent |
| Mobile Compute | 12.2% | 40h+ | Excellent (fuel-extended) |

### Compute Balance

| Build | Net Compute | Role Match |
|-------|-------------|------------|
| Micro Scout | -0.1 | ✅ Minimal burden |
| Light Scout | -0.3 | ✅ Light consumer |
| Combat Striker | +1.2 | ✅ Contributor! |
| Heavy Tank | -1.15 | ✅ Expected for complex unit |
| Aerial Recon | -0.3 | ✅ Light consumer |
| Mining Drone | +1.6 | ✅ Contributor while working |
| Support Unit | -0.4 | ✅ Light consumer |
| Sniper Platform | +0.5 | ✅ Contributor |
| Mobile Compute | +34.6 | ✅ Infrastructure unit |

### Torque Margin Summary

| Build | Margin | Movement Quality |
|-------|--------|------------------|
| Micro Scout | 1.56 | Normal |
| Light Scout | 2.17 | Agile |
| Cargo Hauler (revised) | 2.19 | Agile |
| Combat Striker | 2.25 | Agile |
| Heavy Tank | 2.42 | Agile |
| Aerial Recon | N/A | Flight |
| Mining Drone (revised) | 2.19 | Agile |
| Support Unit | 1.44 | Sluggish ⚠️ |
| Sniper Platform (revised) | 2.40 | Agile |
| Mobile Compute | 2.97 | Very Agile |

---

## Recommendations

### High Priority Fixes

1. **Large Cargo Bay rebalance**: Reduce capacity from 200kg to 80-100kg, or add a note that it requires stationary/towed platforms.

2. **Add mid-tier motor**: Consider adding a motor with ~100 torque between Large (50) and Industrial (200) to smooth progression.

### Documentation Clarifications

3. **Leg locomotion guidance**: Document that legs are power-hungry and require proportionally more motor torque due to their complexity.

4. **Support Unit movement**: Accept sluggish movement as intentional for support roles, or add a medium-large motor at ~75 torque.

### Design Validations

5. **Power system works well**: All builds achieve sustainable power ratios with reasonable operational durations.

6. **Compute system is balanced**: Combat units can be net contributors (good design), infrastructure units provide major capacity.

7. **Automation multipliers are impactful**: Moving from simple (1.0×) to adaptive (3.0×) routines significantly increases compute costs, creating meaningful trade-offs.

---

## Revision History

- v1.0 (2026-01-12): Initial reference builds and balance analysis
