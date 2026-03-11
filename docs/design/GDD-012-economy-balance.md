# GDD-012: Economy Balance -- Harvest Rates, Compression, Furnace, Cube Values

**Status:** Final (Colonization Pivot Applied)
**Date:** 2026-03-10
**Scope:** Complete numerical balance for the physical cube economy -- every rate, cost, duration, and formula that drives the core loop. Economy follows the **Colonization model**: the core strategic decision is whether to use cubes locally or ship them home to your patron for blueprints, tech, and reinforcements.

---

## 1. Material Hierarchy

Six raw materials form the economy. Each is harvested from deposits, compressed into 0.5m physical cubes, and used for construction, crafting, trade, and combat. Iron is a processed material (smelted from scrap iron). All values below are final tuning targets.

### 1.1 Master Material Table

| Material | Tier | Rarity | Deposit Freq | Grind Speed | Powder to Fill | Compress Time | Cube HP | Wall HP | Base Value | Carry Speed |
|----------|------|--------|-------------|-------------|----------------|---------------|---------|---------|------------|-------------|
| Rock | 1 | Abundant | 30% | 1.0x | 40 | 1.0s | 25 | 50 | 0.5 | 100% |
| Scrap Iron | 1 | Common | 25% | 0.8x | 60 | 1.5s | 50 | 100 | 1.0 | 85% |
| Copper | 2 | Moderate | 15% | 0.6x | 80 | 2.0s | 40 | 80 | 1.5 | 90% |
| Silicon | 2 | Rare | 10% | 0.4x | 100 | 2.5s | 30 | 60 | 2.0 | 95% |
| Carbon | 3 | Uncommon | 5% | 0.35x | 90 | 2.0s | 60 | 120 | 2.5 | 92% |
| Titanium | 3 | Very Rare | 5% | 0.3x | 120 | 3.5s | 150 | 300 | 5.0 | 70% |
| Rare Earth | 4 | Ultra Rare | 3% | 0.2x | 150 | 4.0s | 40 | 80 | 8.0 | 95% |
| Gold | 4 | Ultra Rare | 2% | 0.25x | 130 | 3.5s | 35 | 70 | 10.0 | 88% |
| Quantum Crystal | 5 | Legendary | 1% | 0.1x | 200 | 5.0s | 60 | 120 | 25.0 | 95% |

**Processed materials (smelted, not mined):**

| Material | Recipe | Cube HP | Wall HP | Base Value |
|----------|--------|---------|---------|------------|
| Iron | 2x Scrap Iron cubes | 90 | 180 | 2.5 |
| Steel | 2x Iron + 1x Carbon cube | 200 | 400 | 8.0 |
| Advanced Alloy | 1x Titanium + 1x Rare Earth cube | 250 | 500 | 18.0 |

---

## 2. Harvesting Loop -- The Core Feel

### 2.1 Design Goal

Grinding a deposit must feel like **physical labor**. Not instant, not boring -- satisfying in the way that breaking rocks in a good mining game feels. The player should feel the hardness of the material through timing and feedback. Target: **8-15 seconds** to fill capacity, scaling by drill tier and material hardness.

### 2.2 Extraction Rate Formula

```
effectiveRate = baseExtractionRate * drillTierMultiplier * oreGrindSpeed * biomeHarvestMod * weatherHarvestMod

ticksToFill = powderCapacity / effectiveRate
secondsToFill = ticksToFill / 60  (assuming 60 ticks per second)
```

### 2.3 Drill Tier Table

| Tier | Name | Base Rate | Capacity | Mineable Types | Unlock Cost | Sound Level |
|------|------|-----------|----------|---------------|-------------|-------------|
| 1 | Salvage Grinder | 0.5/tick | 60 | Rock, Scrap Iron | Starting | Low |
| 2 | Diamond Drill | 1.0/tick | 100 | + Copper, Carbon | 4x Scrap cubes | Medium |
| 3 | Plasma Cutter | 1.8/tick | 150 | + Silicon, Titanium | 2x Copper + 1x Silicon | High |
| 4 | Quantum Extractor | 3.0/tick | 250 | All including Rare Earth, Gold, Quantum Crystal | 1x Titanium + 1x Rare Earth | Very High |

**Sound Level matters:** Higher tier drills are louder, attracting enemies from farther away. This creates a stealth-vs-speed trade-off.

| Sound Level | Aggro Radius |
|-------------|-------------|
| Low | 8 units |
| Medium | 15 units |
| High | 25 units |
| Very High | 40 units |

### 2.4 Time-to-Fill Calculations (at 60 ticks/second)

**Tier 1 Drill (Salvage Grinder), capacity 60:**

| Material | Grind Speed | Effective Rate | Ticks to Fill | Seconds |
|----------|-------------|---------------|---------------|---------|
| Rock | 1.0 | 0.5 | 120 | **2.0s** |
| Scrap Iron | 0.8 | 0.4 | 150 | **2.5s** |

Wait -- this is too fast. The paper playtest found the same issue. With capacity 60 and rate 0.5, filling takes only 2 seconds. That is far too quick for something that should feel like work.

**REBALANCED:** The base extraction rate must be **0.1/tick** (not 0.5). The drill tier multiplier increases this, but the base must be slower.

**Corrected Tier 1 Drill, capacity 60:**

| Material | Grind Speed | Effective Rate | Ticks to Fill | Seconds |
|----------|-------------|---------------|---------------|---------|
| Rock | 1.0 | 0.10 | 600 | **10.0s** |
| Scrap Iron | 0.8 | 0.08 | 750 | **12.5s** |

That hits the 8-15 second target. Now the full table:

**Tier 1 Drill (capacity 60, base rate 0.10):**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.100 | 10.0 |
| Scrap Iron | 0.080 | 12.5 |

**Tier 2 Drill (capacity 100, base rate 0.20):**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.200 | 8.3 |
| Scrap Iron | 0.160 | 10.4 |
| Copper | 0.120 | 13.9 |
| Carbon | 0.070 | 23.8 |

**Tier 3 Drill (capacity 150, base rate 0.36):**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.360 | 6.9 |
| Scrap Iron | 0.288 | 8.7 |
| Copper | 0.216 | 11.6 |
| Carbon | 0.126 | 19.8 |
| Silicon | 0.144 | 17.4 |
| Titanium | 0.108 | 23.1 |

**Tier 4 Drill (capacity 250, base rate 0.60):**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.600 | 6.9 |
| Scrap Iron | 0.480 | 8.7 |
| Copper | 0.360 | 11.6 |
| Carbon | 0.210 | 19.8 |
| Silicon | 0.240 | 17.4 |
| Titanium | 0.180 | 23.1 |
| Rare Earth | 0.120 | 34.7 |
| Gold | 0.150 | 27.8 |
| Quantum Crystal | 0.060 | 69.4 |

**Design note:** Quantum Crystal takes over a minute to fill even with the best drill. This is intentional -- it is the most valuable material in the game. The player should feel its rarity through the grind time.

### 2.5 Deposit Yield and Depletion

Each deposit node contains a finite amount of powder. When depleted, the deposit crumbles.

| Deposit Type | Yield Range (powder) | Cubes per Deposit | Respawn Time | Respawn Location |
|-------------|---------------------|-------------------|--------------|------------------|
| Rock | 200-600 | 5-15 | 180s (3 min) | Same location |
| Scrap Iron | 180-450 | 3-7 | 300s (5 min) | Same location |
| Copper | 120-320 | 1.5-4 | 480s (8 min) | Same biome, shifted |
| Silicon | 80-250 | 0.8-2.5 | 600s (10 min) | Same biome, shifted |
| Carbon | 100-280 | 1.1-3.1 | 420s (7 min) | Same biome, shifted |
| Titanium | 60-180 | 0.5-1.5 | 900s (15 min) | Random in biome |
| Rare Earth | 30-100 | 0.2-0.7 | 1800s (30 min) | Random on map |
| Gold | 20-75 | 0.15-0.6 | 2400s (40 min) | Random on map |
| Quantum Crystal | 10-30 | 0.05-0.15 | Never | One-time only |

**Cubes per Deposit** = yield / compressionThreshold. Fractional means the last harvest may not yield enough for a full cube (leftover powder remains in storage).

**Depletion visual stages:**

| Remaining % | Visual |
|-------------|--------|
| 100% | Full size, pristine surface |
| 75% | Small surface cracks, fragments on ground |
| 50% | Noticeable size reduction, deep cracks, dimmer color |
| 25% | Heavily fragmented, nearly flat |
| 0% | Crumbles to dust (particle burst), scarred terrain |

### 2.6 Distance to Nearest Deposit from Spawn

Guaranteed spawn placement ensures the player can find resources immediately:

| Material | Min Distance from Spawn | Max Distance | Guaranteed Count within Range |
|----------|------------------------|-------------|-------------------------------|
| Rock | 5 | 15 | 3 |
| Scrap Iron | 8 | 20 | 2 |
| Copper | 30 | 60 | 1 (visible from spawn with scanner) |
| Silicon | 50 | 100 | 0 (requires exploration) |

---

## 3. Compression -- The Signature Moment

### 3.1 Design Goal

Compression is the **most satisfying micro-interaction** in the game. Every time you compress a cube, you should feel it. The 2-4 second duration is a reward moment, not downtime. It must have:
- Escalating screen shake
- Visual pressure/heat gauges
- Sound design crescendo
- Physical cube eject with bounce

### 3.2 Compression Timing Table

| Material | Powder Required | Duration | Screen Shake Peak | Eject Velocity |
|----------|----------------|----------|-------------------|----------------|
| Rock | 40 | 1.0s | 0.3 | 2.0 m/s |
| Scrap Iron | 60 | 1.5s | 0.5 | 1.8 m/s |
| Copper | 80 | 2.0s | 0.6 | 1.6 m/s |
| Carbon | 90 | 2.0s | 0.6 | 1.5 m/s |
| Silicon | 100 | 2.5s | 0.7 | 1.4 m/s |
| Titanium | 120 | 3.5s | 0.9 | 1.0 m/s |
| Rare Earth | 150 | 4.0s | 0.8 | 1.2 m/s |
| Gold | 130 | 3.5s | 0.85 | 1.1 m/s |
| Quantum Crystal | 200 | 5.0s | 1.0 | 0.8 m/s |

### 3.3 Screen Shake Curve

```
shakeIntensity(t) = peakIntensity * easeInQuad(t / duration)

where easeInQuad(x) = x * x
```

The shake starts barely noticeable and builds to peak at the moment of cube ejection. At t=duration, there is a sharp spike to 1.5x peak for exactly 2 frames (the "SLAM"), then instant drop to 0.

### 3.4 Pressure and Heat Gauges

**Pressure gauge** (left side of compression overlay):
```
pressure(t) = easeInCubic(t / duration)
```
Fills smoothly from 0% to 100%. Enters "red zone" (visual pulse + warning color) at 85%.

**Heat gauge** (right side):
```
heat(t) = easeInQuad((t - delay) / (duration - delay))
where delay = duration * 0.15
```
Heat starts slightly after pressure (delayed by 15% of duration), creating a staggered fill that feels more mechanical.

### 3.5 Sound Design Spec

| Phase | Duration | Sound |
|-------|----------|-------|
| Start | 0-20% | Low hydraulic whine, building |
| Build | 20-80% | Rising metallic groan, pressure hiss intensifying |
| Peak | 80-99% | High-pitched whine, steam venting |
| SLAM | Frame of completion | Heavy metallic SLAM + reverb tail (200ms) |
| Settle | Post-slam 500ms | Metallic ring-down, cube bounce clanks |

### 3.6 Compression Quality

| Condition | Quality Multiplier | Visual |
|-----------|-------------------|--------|
| Normal compression | 1.0x | Clean cube, full color |
| Took damage during compression | 0.7x | Cracked surface, dim color |
| Interrupted (enemy hit) | Fails | No cube, powder lost (50%) |
| Rushed (cancel early at 80%+) | 0.8x | Slightly deformed, rough texture |

Quality affects cube value in trade and wall HP (quality * base HP). A cracked titanium cube (0.7 * 300 = 210 wall HP) is still better than a clean scrap cube (100 wall HP).

### 3.7 Cube Eject Physics

```
ejectDirection = playerForward * 0.7 + Vector3.UP * 0.3  (normalized)
ejectSpeed = ejectVelocity from table above
bounceRestitution = 0.3  (low -- cubes thud, they don't ping-pong)
frictionCoefficient = 0.6  (settle quickly)
```

The cube physically pops out in front of the player, bounces once on the ground, and settles. Total settle time: ~1 second for heavy materials, ~1.5s for light materials.

---

## 4. Cube Value and Economy Flow

### 4.1 Value Hierarchy

Base Value determines trade worth, raid attractiveness, and victory condition progress.

**Economic velocity:** How fast can a solo player generate value?

| Phase | Materials Available | Value/Minute (solo, no automation) |
|-------|--------------------|------------------------------------|
| Early (0-10 min) | Rock, Scrap Iron | ~3.0 value/min |
| Mid (10-30 min) | + Copper, Carbon, Silicon | ~6.0 value/min |
| Late (30-60 min) | + Titanium, Rare Earth | ~12.0 value/min |
| Endgame (60+ min) | + Gold, Quantum Crystal | ~20.0 value/min |

**With full automation (belts + auto-miners):** multiply by 3-5x.

### 4.2 Value/Minute Derivation (Early Game Example)

Player with Tier 1 drill, no automation:
1. Walk to scrap deposit (5 units away, speed 5 u/s) = 1s
2. Grind to capacity (60 powder at 0.08/tick) = 12.5s
3. Compress (1.5s)
4. Walk to furnace/stockpile (5 units) = 1s
5. Drop cube = 0.5s

**Total cycle: ~16.5 seconds per scrap cube (value 1.0)**

Per minute: 60 / 16.5 = **3.6 cubes/min = 3.6 value/min**

With some rock mixed in (faster grind, lower value):
- Rock cycle: ~12.5 seconds, value 0.5
- Average: ~3.0 value/min

This feels right. Early game is a grind. You are manually hauling cubes one at a time.

### 4.3 Wealth Brackets (for raid scaling)

| Bracket | Total Cube Value | Raid Frequency | Max Raid Size |
|---------|-----------------|----------------|---------------|
| Destitute | 0-10 | No raids | -- |
| Poor | 11-30 | Every 10 min | 2 scouts |
| Modest | 31-80 | Every 7 min | 3 scouts + 1 soldier |
| Wealthy | 81-200 | Every 5 min | 4 soldiers + 1 heavy |
| Rich | 201-500 | Every 3 min | 6 soldiers + 2 heavy + 1 hacker |
| Opulent | 501+ | Every 2 min | 8 soldiers + 3 heavy + 2 hackers |

Formula:
```
raidPoints = totalVisibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidInterval = max(120, 600 - raidPoints * 2) seconds
maxRaiders = floor(raidPoints / 15) capped at 15
```

---

## 5. Furnace Recipes -- Complete Table

### 5.1 Tier 1: Salvage (Starting)

Available from game start. Requires only scrap iron and rock cubes.

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Grabber Arm | 3x Scrap Iron | 10s | tool_grabber_t1 | Tool |
| Diamond Drill Bit | 4x Scrap Iron | 15s | tool_harvester_t2 | Tool |
| Scanner Lens | 2x Scrap Iron | 8s | tool_scanner_t1 | Tool |
| Basic Power Cell | 5x Scrap Iron | 20s | component_power_cell | Component |
| Repair Patch | 2x Scrap Iron | 5s | consumable_repair | Consumable |
| Rock Foundation | 4x Rock | 8s | building_foundation | Building |
| Scrap Wall Panel | 3x Scrap Iron + 2x Rock | 12s | building_wall_scrap | Building |
| Basic Miner Frame | 6x Scrap Iron | 25s | building_miner_t1 | Building |

### 5.2 Tier 2: Copper Processing (requires Harvester T2)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Wire Bundle | 2x Copper | 12s | component_wire_bundle | Component |
| Belt Segment | 3x Scrap Iron + 1x Copper | 15s | building_belt_segment | Building |
| Auto-Hopper | 4x Scrap Iron + 2x Copper | 20s | building_auto_hopper | Building |
| Grabber Mk2 | 3x Copper + 2x Scrap Iron | 15s | tool_grabber_t2 | Tool |
| Lightning Rod | 3x Copper + 2x Scrap Iron | 18s | building_lightning_rod | Building |
| Power Wire | 1x Copper | 8s | building_power_wire_x5 | Building |
| Signal Relay | 2x Copper + 1x Scrap Iron | 14s | building_signal_relay | Building |
| Copper Wall Panel | 4x Copper + 2x Rock | 16s | building_wall_copper | Building |

### 5.3 Tier 3: Silicon and Carbon (requires Harvester T2+)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Circuit Board | 2x Silicon + 1x Copper | 25s | component_circuit_board | Component |
| Battle Bot Chassis | 6x Scrap Iron + 2x Copper + 1x Silicon | 30s | unit_battle_bot | Unit |
| Scout Bot Chassis | 3x Scrap Iron + 1x Copper + 1x Silicon | 20s | unit_scout_bot | Unit |
| Worker Bot Chassis | 4x Scrap Iron + 2x Copper | 22s | unit_worker_bot | Unit |
| Hacking Module | 3x Silicon + 2x Copper | 30s | component_hacking_module | Component |
| Compute Core | 2x Silicon + 1x Carbon | 28s | component_compute_core | Component |
| Carbon Fiber Panel | 3x Carbon + 1x Scrap Iron | 20s | building_wall_carbon | Building |
| Smelter | 4x Scrap Iron + 2x Carbon + 1x Copper | 35s | building_smelter | Building |
| Refiner | 3x Silicon + 2x Copper + 2x Scrap Iron | 35s | building_refiner | Building |

### 5.4 Smelter Recipes (requires Smelter building)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Iron Cube | 2x Scrap Iron cubes | 15s | 1x Iron cube | Material |
| Steel Cube | 2x Iron + 1x Carbon cubes | 25s | 1x Steel cube | Material |

### 5.5 Tier 4: Titanium (requires Harvester T3+)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Plasma Cutter | 2x Titanium + 1x Silicon + 2x Copper | 30s | tool_harvester_t3 | Tool |
| Defense Turret | 3x Titanium + 2x Silicon + 3x Copper | 40s | building_turret | Building |
| Fortified Wall | 4x Titanium + 4x Scrap Iron | 25s | building_wall_titanium | Building |
| Outpost Core | 2x Titanium + 2x Silicon + 4x Copper + 4x Scrap Iron | 60s | building_outpost | Building |
| Heavy Bot Chassis | 5x Titanium + 3x Iron + 2x Silicon | 45s | unit_heavy_bot | Unit |
| Hacker Bot Chassis | 3x Silicon + 2x Copper + 1x Titanium | 35s | unit_hacker_bot | Unit |
| Formation Controller | 2x Silicon + 1x Titanium + 1x Copper | 25s | component_formation_ctrl | Component |
| Titan Armor Plate | 3x Titanium + 1x Carbon | 20s | component_titan_armor | Component |

### 5.6 Tier 5: Endgame (requires Harvester T4)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Quantum Extractor | 2x Rare Earth + 1x Gold + 2x Titanium | 50s | tool_harvester_t4 | Tool |
| Advanced Alloy Cube | 1x Titanium + 1x Rare Earth cubes | 30s | 1x Advanced Alloy cube | Material |
| Gravity Grabber | 2x Rare Earth + 1x Gold + 1x Silicon | 40s | tool_grabber_t4 | Tool |
| Signal Jammer | 3x Silicon + 2x Rare Earth + 1x Gold | 45s | building_signal_jammer | Building |
| Fusion Core | 1x Quantum Crystal + 2x Rare Earth + 1x Gold | 90s | component_fusion_core | Component |
| Titan-Class Bot | 8x Titanium + 4x Silicon + 2x Rare Earth + 1x Gold | 120s | unit_titan_bot | Unit |
| Teleporter Pad | 2x Quantum Crystal + 3x Rare Earth + 2x Gold | 180s | building_teleporter | Building |
| Planet Core Tap | 3x Quantum Crystal + 5x Titanium + 3x Rare Earth | 300s | building_core_tap | Building (victory) |

---

## 6. Building Costs -- Complete Table

### 6.1 Production Buildings

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Notes |
|----------|-----------|---------------|------------|-----------|-------|
| Furnace (starter) | FREE | 0 | -- | 1 | Provided at game start |
| Basic Miner | 6x Scrap Iron | 2 | 15s | 1 | Auto-extracts from deposits |
| Smelter | 4x Scrap Iron + 2x Carbon + 1x Copper | 2 | 20s | 3 | Scrap -> Iron, Iron+Carbon -> Steel |
| Refiner | 3x Silicon + 2x Copper + 2x Scrap Iron | 2 | 20s | 3 | Processes rare materials |
| Fabrication Unit | 4x Iron + 2x Silicon + 2x Copper | 3 | 25s | 3 | Advanced crafting recipes |

### 6.2 Infrastructure

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Notes |
|----------|-----------|---------------|------------|-----------|-------|
| Belt Segment | 3x Scrap Iron + 1x Copper | 0 | 5s | 2 | Moves cubes at 2 u/s |
| Fast Belt | 4x Iron + 2x Copper | 1 | 8s | 4 | Moves cubes at 4 u/s |
| Express Belt | 4x Titanium + 3x Copper | 2 | 12s | 5 | Moves cubes at 8 u/s |
| Auto-Hopper | 4x Scrap Iron + 2x Copper | 0 | 10s | 2 | Belt -> furnace feeder |
| Lightning Rod | 3x Copper + 2x Scrap Iron | 0 (generates) | 12s | 2 | Generates power |
| Power Wire (x5) | 1x Copper | 0 | 3s | 2 | Carries power between buildings |
| Signal Relay | 2x Copper + 1x Scrap Iron | 1 | 10s | 2 | Extends signal/compute network |
| Signal Amplifier | 3x Silicon + 2x Copper | 3 | 18s | 3 | Boosts signal range 2x |

### 6.3 Defense

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Wall HP | Notes |
|----------|-----------|---------------|------------|-----------|---------|-------|
| Scrap Wall Panel | 3x Scrap Iron + 2x Rock | 0 | 8s | 1 | 150 | Cheapest wall |
| Copper Wall Panel | 4x Copper + 2x Rock | 0 | 10s | 2 | 240 | Conducts power through wall |
| Carbon Wall Panel | 3x Carbon + 1x Scrap Iron | 0 | 10s | 3 | 360 | Lightweight but strong |
| Titanium Wall Panel | 4x Titanium + 4x Scrap Iron | 0 | 15s | 4 | 900 | Nearly impenetrable |
| Cube Wall (stacked) | Cubes directly | 0 | Instant | 1 | Per-cube HP | Manual stacking |
| Turret | 3x Titanium + 2x Silicon + 3x Copper | 2 | 20s | 4 | 400 | Automated fire, range 12 |
| Bunker | 4x Titanium + 3x Iron + 2x Silicon | 2 | 25s | 4 | 800 | 3 garrison slots |
| Gate | 2x Iron + 1x Copper | 1 | 10s | 2 | 200 | Controllable passage |

### 6.4 Territory

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Claim Radius | Notes |
|----------|-----------|---------------|------------|-----------|-------------|-------|
| Outpost Core | 2x Ti + 2x Si + 4x Cu + 4x Scrap | 1 | 30s | 4 | 15 | Claims territory |
| Outpost Upgrade | 3x Titanium + 2x Silicon | 2 | 20s | 5 | 25 | Expands claim radius |
| Underground Storage | 6x Rock + 4x Scrap Iron | 0 | 20s | 2 | -- | Hides 20 cubes from perception |
| Decoy Pile | 3x Rock | 0 | 8s | 1 | -- | Fake cubes, alerts on touch |

---

## 7. Furnace Throughput and Machine Balance

### 7.1 Furnace Stats

| Stat | Value |
|------|-------|
| Hopper capacity | 3 cubes (upgradeable to 5, then 8) |
| Processing speed | 1.0x (base) |
| Power required | 2 (when powered -- optional early game) |
| Powered speed bonus | 1.5x processing speed |
| Max queue depth | 1 recipe at a time |

### 7.2 Multi-Furnace Efficiency

Building multiple furnaces is valid but has diminishing returns on player attention:

| Furnace Count | Effective Throughput | Rationale |
|---------------|---------------------|-----------|
| 1 | 1.0x | Manual attention |
| 2 | 1.8x | Context-switching penalty |
| 3 | 2.4x | Harder to keep all fed |
| 4+ | 2.8x (cap) | Belt automation required |

With belts and auto-hoppers, this penalty disappears -- the system self-feeds.

### 7.3 Optimal Factory Layout (Early Game)

```
Deposit (10m) --[belt]--> Auto-Hopper --> Furnace --> Output
                                                   \--> Stockpile
```

**Throughput calculation:**
- Belt speed: 2 u/s
- Belt length: 10 units
- Transport time: 5 seconds per cube
- Furnace processing: 10-15 seconds (Tier 1 recipes)
- **Bottleneck: furnace processing time**
- With 1 belt feeding 1 furnace: 1 cube processed per 10-15 seconds
- Need 2 belts feeding 1 furnace for continuous operation (one cube arrives while previous is processing)

### 7.4 Base Agency and Per-Base Economics

Each settlement (base) is an autonomous agent with its own work queues, furnace capacity, and cube stockpile. Economy scales per-base, not per-civilization.

#### 7.4.1 Base Economic Profile

Every base maintains these local resources:

| Resource | Scope | Notes |
|----------|-------|-------|
| Cube stockpile | Per-base | Physical cubes at this base. Visible, raidable. |
| Furnace capacity | Per-base | Each base has its own furnace(s). More bases = more throughput. |
| Work queue | Per-base | Harvest, transport, build, patrol, furnace scheduling |
| Bot roster | Per-base | Bots assigned to this base. "Phone home" to nearest base when idle. |
| Power grid | Per-base | Lightning rods and wires are local to each base |

#### 7.4.2 Multi-Base Throughput Scaling

| Bases Owned | Total Furnace Capacity | Notes |
|-------------|----------------------|-------|
| 1 (starter) | 1x | Single furnace, manual or single belt |
| 2 | 2x | Second base needs its own furnace built |
| 3 | 3x | Each base operates independently |
| 4+ | 4x+ | Linear scaling, but transport logistics become the bottleneck |

**No diminishing returns on separate bases** -- unlike multiple furnaces at a single base (7.2), each base's furnace operates independently with its own work queue. The bottleneck shifts from furnace throughput to **inter-base transport logistics**.

#### 7.4.3 Inter-Base Transport

Cubes must physically travel between bases. There is no teleportation or abstract resource sharing.

| Transport Method | Speed | Capacity | Risk |
|-----------------|-------|----------|------|
| Manual carry (player) | 5 u/s (with cube) | 1-8 cubes (by grabber tier) | Player is vulnerable while carrying |
| Worker bot convoy | 5 u/s | 4 cubes per worker | Convoy can be ambushed |
| Belt network | 2-8 u/s (by tier) | Continuous flow | Belt can be destroyed by raids |
| Teleporter pad (endgame) | Instant | 1 cube per 5s | Extremely expensive, requires power |

**Transport time formula:**
```
transportTime = distance / transportSpeed
cubesPerMinute = (capacity / transportTime) * 60
```

**Example:** Two bases 50 units apart, 2 worker bots with 4 cubes each:
```
roundTripTime = (50 / 5) * 2 = 20 seconds
cubesPerTrip = 8 (2 workers * 4 cubes)
cubesPerMinute = (8 / 20) * 60 = 24 cubes/min
```

But those workers are not harvesting during transit. Transport is a real economic cost.

#### 7.4.4 Supply Line Vulnerability

Inter-base belt networks and worker convoys create attack surfaces:

| Vulnerability | Effect of Disruption | Recovery |
|--------------|---------------------|----------|
| Belt segment destroyed | Flow stops until repaired | 1x Scrap Iron + 5s rebuild per segment |
| Worker bot destroyed | 4 cubes dropped on ground (lootable) | Must build replacement (22s + cost) |
| Road ambush | Cubes scattered, workers damaged | Manual collection, repair |
| Teleporter disabled | Instant transport lost | Requires power restoration |

**Design note:** Attacking supply lines is a legitimate strategy. A civ with 3 rich bases but poor inter-base logistics is fragile. Belt networks along exposed routes should be defended or routed through safe terrain.

#### 7.4.5 Base Work Queue Priority

Each base's autonomous agent schedules work in this priority order:

| Priority | Task | Condition |
|----------|------|-----------|
| 1 | Emergency repair | Any building below 25% HP |
| 2 | Furnace scheduling | Cubes in hopper, recipe selected |
| 3 | Harvest (assigned deposits) | Deposits in territory with available bots |
| 4 | Transport (to furnace) | Cubes at deposit, furnace has hopper space |
| 5 | Transport (inter-base) | Surplus cubes, other base needs materials |
| 6 | Build (queued buildings) | Materials available, build site ready |
| 7 | Patrol | Idle bots with no other work |
| 8 | Explore | Scout bots with no assigned patrol |

Bots always "phone home" to their nearest base when they have no active task. A destroyed base causes all its bots to reassign to the next nearest base, creating a temporary efficiency loss as they travel.

#### 7.4.6 AI Base Expansion Economics

AI civs decide when to build a new base using this evaluation:

```
newBaseDesirability =
  (nearestUntappedDepositValue * 0.4) +
  (distanceFromExistingBase > 30 ? 0.3 : 0) +
  (currentBaseCapacityUtilization > 0.8 ? 0.3 : 0) -
  (militaryThreatAtLocation * 0.5) -
  (baseBuildCost / currentCubeStockpile * 0.3)
```

**New base establishment cost:**
- Outpost Core: 2x Ti + 2x Si + 4x Cu + 4x Scrap (from building table)
- Furnace: FREE (one provided per outpost)
- Lightning Rod: 3x Cu + 2x Scrap
- Basic perimeter: ~10x Scrap Iron (walls)
- **Total minimum: ~30 cubes worth of materials**

**Base establishment timeline (AI, normal difficulty):**

| Time | Event |
|------|-------|
| T+0 | Outpost Core placed. Territory claimed. |
| T+30s | Furnace placed and operational. |
| T+60s | Lightning rod placed. Power online. |
| T+120s | First belt line to nearest deposit. |
| T+180s | First cubes being produced at new base. |
| T+300s | Basic wall perimeter. Base is "online." |

---

## 8. Economy Pacing -- Minute-by-Minute Projection

### 8.1 Solo Player, First 20 Minutes

| Minute | Activity | Cubes Produced | Total Cubes | Total Value | Notes |
|--------|----------|---------------|-------------|-------------|-------|
| 0-1 | Tutorial. Walk to deposit. Start grinding. | 0 | 0 | 0 | Learning controls |
| 1-2 | Grind first scrap iron deposit. | 1 | 1 | 1.0 | First cube! |
| 2-3 | Compress. Carry to furnace. Start second. | 1 | 2 | 2.0 | Manual hauling |
| 3-4 | Third cube. Feed furnace 3x scrap -> Grabber. | 1 | 0 | 0 | Spent 3 cubes crafting |
| 4-5 | Grind + compress 2 cubes (faster with grabber reach). | 2 | 2 | 2.0 | Grabber helps |
| 5-6 | 2 more cubes. | 2 | 4 | 4.0 | Building stockpile |
| 6-7 | Feed furnace 4x scrap -> Diamond Drill. | 0 | 0 | 0 | Spent 4 cubes |
| 7-8 | Drill T2: now mining copper too. First copper cube. | 2 | 2 | 2.5 | Mixed materials |
| 8-10 | Mining copper + scrap. 4 cubes produced. | 4 | 6 | 7.5 | Faster now |
| 10-12 | Craft belt + auto-hopper. Automation begins. | 0 | 2 | 2.5 | Spent 4 cubes |
| 12-15 | Belt running. Semi-automated. ~3 cubes/min. | 9 | 11 | 14.0 | Automation boost |
| 15-18 | Build scanner, explore. Find silicon. | 9 | 18 | 23.5 | Stockpile growing |
| 18-20 | First feral raid (wealth bracket: "Modest"). | 6 | 20 | 27.0 | Defense needed |

### 8.2 Key Economic Milestones

| Milestone | Target Time | Cube Value Required |
|-----------|-------------|---------------------|
| First cube | 2 minutes | 1.0 |
| First tool crafted (Grabber) | 4 minutes | 3.0 spent |
| First automation (belt) | 12 minutes | 4.0 spent |
| First defense (wall) | 18 minutes | 5.0 spent |
| First territory claim (outpost) | 40 minutes | ~40 spent |
| First combat bot | 35 minutes | ~15 spent |
| Iron smelting operational | 50 minutes | ~20 spent |

---

## 9. AI Economy Scaling

### 9.1 AI Difficulty Multipliers

| Difficulty | Harvest Rate | Build Speed | Starting Cubes | Peace Period | Aggression |
|-----------|-------------|-------------|---------------|-------------|------------|
| Peaceful | 0.5x | 0.5x | 10 | Infinite | Never attacks |
| Easy | 0.7x | 0.7x | 15 | 10 min | Low |
| Normal | 1.0x | 1.0x | 20 | 5 min | Medium |
| Hard | 1.3x | 1.2x | 30 | 3 min | High |
| Brutal | 1.6x | 1.5x | 50 | 1 min | Very High |

### 9.2 AI Build Order Targets

Each AI civilization follows a build order that varies by faction but hits these milestones:

| Milestone | Easy | Normal | Hard | Brutal |
|-----------|------|--------|------|--------|
| First furnace operational | Start | Start | Start | Start |
| First 10 cubes stockpiled | 5 min | 3 min | 2 min | 1 min |
| First belt line | 8 min | 5 min | 3 min | 2 min |
| First outpost | 15 min | 8 min | 5 min | 3 min |
| First combat bot | 12 min | 7 min | 4 min | 2.5 min |
| First raid launched | Never | 12 min | 6 min | 3 min |
| Iron smelting | 20 min | 12 min | 8 min | 5 min |

### 9.3 AI Passive Cube Generation (Simplified)

Until full factory automation is implemented, AI factions generate cubes passively:

```
cubesPerMinute = baseCubeRate * difficultyMultiplier * territoryCount * factionEconomyBias

where:
  baseCubeRate = 2.0 cubes/minute
  difficultyMultiplier = from table above
  territoryCount = max(1, outposts owned)
  factionEconomyBias = from civilizations.json governorBias.economy
```

**Example: Normal difficulty, Reclaimers (economy bias 1.5), 2 territories:**
```
cubesPerMinute = 2.0 * 1.0 * 2 * 1.5 = 6.0 cubes/min
```

**Critical fix for rounding bug:** The current code uses `Math.round()` which produces 0 for small values. The formula must use `Math.max(1, Math.ceil(...))` to guarantee at least 1 cube per evaluation cycle.

### 9.4 AI Material Distribution

AI factions generate cubes of specific materials based on their biome and preferences:

| Faction | Scrap Iron | Copper | Silicon | Titanium | Other |
|---------|-----------|--------|---------|----------|-------|
| Reclaimers | 40% | 20% | 10% | 5% | 25% Rock |
| Volt Collective | 25% | 35% | 15% | 10% | 15% Carbon |
| Signal Choir | 15% | 30% | 35% | 5% | 15% Rare Earth |
| Iron Creed | 35% | 15% | 10% | 25% | 15% Rock |

### 9.5 Peace Period Mechanics

During the peace period:
- AI factions do not declare war on the player
- AI factions do not send raids against the player
- AI factions CAN fight each other (inter-AI peace is separate)
- Feral bots still spawn and attack normally
- AI builds economy, defense, and military during peace
- A countdown timer is visible on the HUD: "PEACE ENDS IN 3:00"
- When peace ends, AI re-evaluates all diplomatic stances immediately

---

## 10. Home Planet Shipments (Colony ↔ Patron Economy)

> **Design Reference:** See COLONIZATION-MODEL.md for the full Colonization pivot rationale.

The primary economic relationship is between your colony and your home planet patron -- not between rival factions. You ship cubes home; your patron sends back blueprints, tech unlocks, and reinforcement units. This is the game's core strategic decision: **use cubes locally for immediate benefit, or ship them home for long-term advantage.**

The otter hologram system (`otterTrade.ts`, `OtterRenderer.tsx`) serves as the home planet communication interface. Otter holograms deliver patron demands, accept shipments, and dispense rewards.

### 10.1 Patron Demand System

Each race's home planet patron periodically requests specific materials. Fulfilling demands earns favor and unlocks rewards. Ignoring demands reduces future support.

**Demand cycle:** Every 5 minutes of game time, the patron issues a new demand via otter hologram.

| Demand Tier | Cube Value Required | Deadline | Reward Tier |
|-------------|-------------------|----------|-------------|
| Minor | 5-15 value | 5 min | Tier 1 (components, repair packs) |
| Standard | 20-50 value | 8 min | Tier 2 (blueprints, tool upgrades) |
| Major | 60-150 value | 12 min | Tier 3 (reinforcement bots, unique buildings) |
| Critical | 200+ value | 15 min | Tier 4 (endgame tech, victory-path items) |

**Demand specificity by race patron:**

| Race | Patron Name | Priority Materials | Demand Flavor |
|------|-------------|-------------------|---------------|
| Reclaimers | Salvage Overseer | Scrap Iron, eWaste, Carbon | "Send salvage analysis data" |
| Volt Collective | Energy Directorate | Copper, Rare Earth, Gold | "We need power readings from these materials" |
| Signal Choir | Signal Prime | Silicon, Rare Earth, Quantum Crystal | "Communication substrate required" |
| Iron Creed | Forge Command | Titanium, Iron, Steel | "Engineering specimens for structural research" |

**Demand fulfillment formula:**
```
fulfillmentScore = sum(shippedCubeValue) / demandedValue
if fulfillmentScore >= 1.0: full reward
if fulfillmentScore >= 0.5: partial reward (50% of reward value)
if fulfillmentScore < 0.5: demand failed, patronFavor -= 10
```

### 10.2 Patron Favor

Favor determines what your patron is willing to send you. It replaces the abstract "tech tree research" mechanic.

| Favor Level | Range | Effect |
|-------------|-------|--------|
| Disfavored | -50 to -1 | No shipments. Patron threatens to cut support. |
| Neutral | 0-24 | Basic shipments only (Tier 1 rewards). |
| Trusted | 25-49 | Standard shipments (Tier 1-2 rewards). |
| Favored | 50-79 | Major shipments (Tier 1-3 rewards). |
| Essential | 80-100 | All rewards available. Independence path unlocks. |

**Favor gain/loss:**

| Action | Favor Change |
|--------|-------------|
| Fulfill minor demand | +5 |
| Fulfill standard demand | +10 |
| Fulfill major demand | +20 |
| Fulfill critical demand | +35 |
| Partial fulfillment (50%+) | Half of full reward |
| Fail demand (miss deadline) | -10 |
| Ignore demand (no cubes shipped) | -15 |
| Stop shipping entirely for 30+ min | -20 (patron expresses concern, reduces reward tier) |

**Starting favor:** 15 (Neutral, close to Trusted)

### 10.3 Patron Reward Catalog

Rewards are received via otter hologram delivery -- a physical crate materializes at your base.

**Tier 1 Rewards (Neutral+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Repair Pack x5 | 3 cubes | Heals 50 HP each |
| Wire Bundle x10 | 5 cubes | Saves crafting time |
| Power Cell x3 | 8 cubes | Pre-made components |
| Scout Bot (pre-built) | 10 cubes | Ready to deploy immediately |

**Tier 2 Rewards (Trusted+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Diamond Drill Blueprint | 15 cubes | Unlocks Tier 2 harvester recipe |
| Belt Automation Blueprint | 12 cubes | Unlocks auto-hopper recipe |
| Copper Wall Blueprint | 10 cubes | Unlocks copper wall recipe |
| Worker Bot x2 (pre-built) | 18 cubes | Two workers, ready to assign |

**Tier 3 Rewards (Favored+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Plasma Cutter Blueprint | 30 cubes | Unlocks Tier 3 harvester |
| Turret Blueprint | 25 cubes | Unlocks defense turret |
| Heavy Bot (pre-built) | 35 cubes | Single heavy, combat-ready |
| Smelter Blueprint | 20 cubes | Unlocks iron/steel production |
| Faction Unique Blueprint | 40 cubes | Race-specific unique building |

**Tier 4 Rewards (Essential):**

| Reward | Value | Notes |
|--------|-------|-------|
| Quantum Extractor Blueprint | 60 cubes | Unlocks Tier 4 harvester |
| Titan Bot (pre-built) | 80 cubes | The ultimate combat unit |
| Teleporter Blueprint | 100 cubes | Endgame logistics |
| Patron-Exclusive Blueprint | 50 cubes | Late-game tech only available through patron trade |

### 10.4 The Ship-or-Spend Tension

This is the Colonization model's core strategic lever:

```
Every cube you compress faces a choice:
  ├── USE LOCALLY → immediate benefit (wall, weapon, building, bot)
  └── SHIP HOME → delayed benefit (blueprint, tech, reinforcement)

earlyGameBias = use locally (need walls, tools, survival)
midGameBias = balance (need tech to progress, need defenses to survive)
lateGameBias = use locally (self-sufficient) with occasional patron trades for exclusive tech
```

**Economic pressure curve:**

| Game Phase | Patron Demand Rate | Local Pressure | Optimal Ship % |
|------------|-------------------|----------------|----------------|
| Early (0-15 min) | 1 minor / 5 min | High (survival) | 10-20% |
| Mid (15-40 min) | 1 standard / 5 min | Medium (expansion) | 30-40% |
| Late (40-70 min) | 1 major / 5 min | Low (established) | 40-60% |
| Endgame (70+ min) | 1 critical / 5 min | Variable (war or peace) | 0-10% (self-sufficient, specialized trades only) |

### 10.5 Patron Dependency Gradient

Independence is NOT a binary event. It is a **gradient** -- a natural economic transition that occurs as the colony's local production scales. There is no "declare independence" button. Robots don't revolt; they rationally shift resource allocation as local capability grows.

**3-Act progression of patron dependency:**

| Act | Colony State | Patron Shipping % | Local Production % | Patron Relationship |
|-----|-------------|-------------------|-------------------|---------------------|
| Act 1: Colonization | Dependent | 40-60% of cubes shipped home | Limited furnace recipes | Patron commands, colony obeys |
| Act 2: Factory | Transitioning | 15-30% shipped home | Local recipes replace patron shipments | Patron advises, colony evaluates |
| Act 3: Conquest | Self-sufficient | 0-10% shipped home (specialized trades only) | Full self-sufficiency | Patron is trade partner, not lifeline |

**Why the patron doesn't punish independence:**
- The patron WANTS a successful colony -- a thriving colony produces more absolute trade volume even if the percentage shipped home decreases
- Both sides benefit from continued trade (patron-unique blueprints for rare materials)
- For robots, the transition is rational cost-benefit: the patron recognizes that local production is more efficient than cross-system shipping
- The relationship evolves from commander-subordinate to trade-partners to equals

**Patron favor still matters in Act 3:** High patron favor unlocks patron-exclusive tech (blueprints unavailable through local research). Low patron favor reduces trade options but never results in punitive action. The patron is a rational trade partner, not a vindictive overlord.

### 10.6 Inter-Colony Trade (Secondary)

Trade between rival colonies on the machine planet is secondary to the patron economy. It uses physical cube exchange at neutral border points.

```
tradeRatio = offeredValue / requestedValue
fairTrade = tradeRatio >= 0.8 && tradeRatio <= 1.2
```

| Trade Acceptability | Ratio Range | AI Response |
|-------------------|-------------|-------------|
| Generous (player's favor) | < 0.8 | Always accept |
| Fair | 0.8 - 1.2 | Accept if opinion > -20 |
| Unfavorable (AI's favor) | 1.2 - 1.5 | Accept if opinion > +30 |
| Exploitative | > 1.5 | Reject, opinion -5 |

| Trade Action | Effect |
|-------------|--------|
| Complete fair trade | Both factions +10 opinion |
| Reject trade | -5 opinion |
| Ambush trade convoy | -50 opinion, immediate war declaration |
| Break trade agreement | -30 opinion, 10-minute trade embargo |

**Alien native trade:** The indigenous machine species (alien natives) can be traded with using a separate reputation system. They offer unique materials and information not available from patrons. See GDD for alien natives.

### 10.7 AI Patron Interaction

AI civilizations interact with their own home planet patrons using the same system:

```
aiShipmentDecision =
  if patronFavor < 25: prioritize shipments (need tech)
  if localThreat > 0.6: prioritize local use (need defense)
  if cubeStockpile > 100: ship surplus home
  default: ship (cubesPerMinute * 0.3) home, keep rest local

aiDemandFulfillment = max(0, cubesAvailable - localReserve) / demandedValue
```

AI civs at higher difficulty levels ship more efficiently and receive patron rewards faster:

| Difficulty | AI Ship Efficiency | Patron Demand Discount |
|-----------|-------------------|----------------------|
| Peaceful | 10% shipped | 50% demand reduction |
| Easy | 20% shipped | 30% demand reduction |
| Normal | 30% shipped | No discount |
| Hard | 40% shipped | Demands arrive 20% faster |
| Brutal | 50% shipped | Demands arrive 40% faster, bonus rewards |

---

## 11. Config Changes Required

### 11.1 config/mining.json Updates

```json
{
  "oreTypes": {
    "rock": { "hardness": 1, "grindSpeed": 1.0, "color": "#8B7355" },
    "scrap_iron": { "hardness": 2, "grindSpeed": 0.8, "color": "#8B4513" },
    "copper": { "hardness": 3, "grindSpeed": 0.6, "color": "#B87333" },
    "silicon": { "hardness": 4, "grindSpeed": 0.4, "color": "#A0A0C0" },
    "carbon": { "hardness": 3, "grindSpeed": 0.35, "color": "#333333" },
    "titanium": { "hardness": 5, "grindSpeed": 0.3, "color": "#C0C0C0" },
    "rare_earth": { "hardness": 6, "grindSpeed": 0.2, "color": "#44BBBB" },
    "gold": { "hardness": 5, "grindSpeed": 0.25, "color": "#FFD700" },
    "quantum_crystal": { "hardness": 8, "grindSpeed": 0.1, "color": "#8800FF" }
  },
  "defaultExtractionRate": 0.1,
  "drillTiers": {
    "1": { "name": "Salvage Grinder", "rateMultiplier": 1.0, "capacity": 60, "mineableTypes": ["rock", "scrap_iron"], "soundLevel": "low", "aggroRadius": 8 },
    "2": { "name": "Diamond Drill", "rateMultiplier": 2.0, "capacity": 100, "mineableTypes": ["rock", "scrap_iron", "copper", "carbon"], "soundLevel": "medium", "aggroRadius": 15 },
    "3": { "name": "Plasma Cutter", "rateMultiplier": 3.6, "capacity": 150, "mineableTypes": ["rock", "scrap_iron", "copper", "carbon", "silicon", "titanium"], "soundLevel": "high", "aggroRadius": 25 },
    "4": { "name": "Quantum Extractor", "rateMultiplier": 6.0, "capacity": 250, "mineableTypes": ["rock", "scrap_iron", "copper", "carbon", "silicon", "titanium", "rare_earth", "gold", "quantum_crystal"], "soundLevel": "very_high", "aggroRadius": 40 }
  },
  "harvesting": {
    "defaultRange": 3.0,
    "defaultPowderCapacity": 60
  }
}
```

### 11.2 config/furnace.json Compression Updates

```json
{
  "compression": {
    "cubeSize": 0.5,
    "configs": {
      "rock": { "powderRequired": 40, "compressionTime": 1.0 },
      "scrap_iron": { "powderRequired": 60, "compressionTime": 1.5 },
      "copper": { "powderRequired": 80, "compressionTime": 2.0 },
      "carbon": { "powderRequired": 90, "compressionTime": 2.0 },
      "silicon": { "powderRequired": 100, "compressionTime": 2.5 },
      "titanium": { "powderRequired": 120, "compressionTime": 3.5 },
      "rare_earth": { "powderRequired": 150, "compressionTime": 4.0 },
      "gold": { "powderRequired": 130, "compressionTime": 3.5 },
      "quantum_crystal": { "powderRequired": 200, "compressionTime": 5.0 }
    },
    "screenShake": {
      "curveType": "easeInQuad",
      "slamMultiplier": 1.5,
      "slamFrames": 2
    },
    "pressureGauge": { "curveType": "easeInCubic", "redZoneThreshold": 0.85 },
    "heatGauge": { "curveType": "easeInQuad", "delayPercent": 0.15 },
    "ejectPhysics": {
      "forwardWeight": 0.7,
      "upWeight": 0.3,
      "bounceRestitution": 0.3,
      "friction": 0.6
    }
  }
}
```

### 11.3 config/economy.json (NEW)

```json
{
  "wealthBrackets": {
    "destitute": { "maxValue": 10, "raidIntervalSeconds": null, "maxRaiders": 0 },
    "poor": { "maxValue": 30, "raidIntervalSeconds": 600, "maxRaiders": 2 },
    "modest": { "maxValue": 80, "raidIntervalSeconds": 420, "maxRaiders": 4 },
    "wealthy": { "maxValue": 200, "raidIntervalSeconds": 300, "maxRaiders": 5 },
    "rich": { "maxValue": 500, "raidIntervalSeconds": 180, "maxRaiders": 9 },
    "opulent": { "maxValue": null, "raidIntervalSeconds": 120, "maxRaiders": 13 }
  },
  "raidPointFormula": {
    "cubeValueWeight": 0.5,
    "buildingWeight": 2.0,
    "techLevelWeight": 10.0,
    "raiderDivisor": 15,
    "maxRaiders": 15,
    "minIntervalSeconds": 120,
    "baseIntervalSeconds": 600,
    "intervalReductionPerPoint": 2
  },
  "aiEconomy": {
    "baseCubeRate": 2.0,
    "difficultyMultipliers": {
      "peaceful": 0.5,
      "easy": 0.7,
      "normal": 1.0,
      "hard": 1.3,
      "brutal": 1.6
    },
    "peacePeriodSeconds": {
      "peaceful": null,
      "easy": 600,
      "normal": 300,
      "hard": 180,
      "brutal": 60
    }
  },
  "trade": {
    "fairRatioMin": 0.8,
    "fairRatioMax": 1.2,
    "generousThreshold": 0.8,
    "exploitativeThreshold": 1.5,
    "opinionOnCompleteTrade": 10,
    "opinionOnRejectTrade": -5,
    "opinionOnAmbushConvoy": -50,
    "opinionOnBreakAgreement": -30,
    "tradeEmbargoSeconds": 600
  },
  "patronShipments": {
    "demandCycleSeconds": 300,
    "demandTiers": {
      "minor": { "minValue": 5, "maxValue": 15, "deadlineSeconds": 300, "favorGain": 5 },
      "standard": { "minValue": 20, "maxValue": 50, "deadlineSeconds": 480, "favorGain": 10 },
      "major": { "minValue": 60, "maxValue": 150, "deadlineSeconds": 720, "favorGain": 20 },
      "critical": { "minValue": 200, "maxValue": null, "deadlineSeconds": 900, "favorGain": 35 }
    },
    "favor": {
      "startingFavor": 15,
      "minFavor": -50,
      "maxFavor": 100,
      "partialFulfillmentThreshold": 0.5,
      "failPenalty": -10,
      "ignorePenalty": -15,
      "independenceFavorCost": -100,
      "levels": {
        "disfavored": { "min": -50, "max": -1 },
        "neutral": { "min": 0, "max": 24 },
        "trusted": { "min": 25, "max": 49 },
        "favored": { "min": 50, "max": 79 },
        "essential": { "min": 80, "max": 100 }
      }
    },
    "patronPriorities": {
      "reclaimers": ["scrap_iron", "carbon", "rock"],
      "volt_collective": ["copper", "rare_earth", "gold"],
      "signal_choir": ["silicon", "rare_earth", "quantum_crystal"],
      "iron_creed": ["titanium", "iron", "steel"]
    },
    "independence": {
      "requiredFavor": 80,
      "requiredStockpileValue": 200,
      "requiredBases": 3,
      "punitiveWaves": 3,
      "punitiveBotsPerWave": 5,
      "punitiveWaveIntervalSeconds": 300
    },
    "aiShipEfficiency": {
      "peaceful": 0.1,
      "easy": 0.2,
      "normal": 0.3,
      "hard": 0.4,
      "brutal": 0.5
    }
  }
}
```

---

## 12. Balance Verification -- Paper Playtest Scenarios

### Scenario 1: "Can I build a Grabber before I starve?"

Player starts with 0 cubes and Tier 1 drill.
- Need: 3 scrap iron cubes for Grabber Arm
- Time per cube: grind (12.5s) + compress (1.5s) + walk (2s) = 16s
- Total: 48 seconds for 3 cubes + 10s furnace time = **58 seconds**
- Verdict: Achievable within 2 minutes. PASS.

### Scenario 2: "First raid timing"

At 18 minutes, player has ~27 value in cubes (from pacing table).
- Wealth bracket: "Poor" (11-30)
- Raid interval: 10 minutes
- Raid size: 2 scouts
- Player has no combat bot yet but has a wall
- 2 scouts vs 1 scrap wall (150 HP): scouts deal 1 damage/tick at 0.4 attack chance
  - DPS per scout: 0.4 * 1 = 0.4/tick, or 24 damage/minute
  - 2 scouts: 48 damage/minute
  - Time to breach wall: 150 / 48 = 3.1 minutes
- Player has 3 minutes to react (fight manually, build another wall, or flee)
- Verdict: Survivable with manual intervention. PASS.

### Scenario 3: "5 iron cubes vs 3 enemy scouts -- who wins?"

Player throws iron cubes at scouts:
- Iron cube throw damage: 20 per hit (see GDD-013)
- Scout HP: 60 (from enemies config)
- Cube throw rate: 1 throw per 1.5 seconds
- Player has 5 cubes to throw: 5 * 20 = 100 potential damage
- 3 scouts * 60 HP = 180 total enemy HP
- Player kills 1.6 scouts before running out of cubes
- Remaining 1.4 scouts attack player at melee
- Player must finish with drill arm (melee)
- Verdict: Challenging but winnable. Cubes are effective but expensive. PASS.

### Scenario 4: "AI economy doesn't starve"

Normal difficulty, Reclaimers (economy 1.5), 1 territory:
```
cubesPerMinute = 2.0 * 1.0 * 1 * 1.5 = 3.0 cubes/min
```
- After 3 minutes: 9 cubes (enough for first tools)
- After 8 minutes: 24 cubes (enough for outpost materials)
- Math.ceil(3.0) = 3 -- no rounding to zero. PASS.

### Scenario 5: "Titanium wall vs full raid"

Opulent bracket (500+ value). Max raid: 13 raiders.
- Titanium wall panel: 900 HP
- Soldier bot damage: 2/tick at 0.4 chance = 0.8 DPS per soldier
- 8 soldiers: 6.4 DPS against wall
- Time to breach: 900 / 6.4 = 140 ticks = ~2.3 minutes at 60 TPS
- During this time, player turrets (2 DPS each, 3 turrets = 6 DPS) kill soldiers
- Soldier HP: 80. Time to kill one soldier: 80 / 6 = 13 ticks
- Over 140 ticks, turrets kill 10 soldiers
- Verdict: Titanium wall + 3 turrets can hold against max raid. PASS.

### Scenario 6: "Can I fulfill the first patron demand?"

First demand arrives at ~5 minutes: Minor tier, 5-15 value, 5 min deadline.
- Worst case: 15 value demanded. Need to ship ~15 value in cubes.
- At minute 5, player has ~10 cubes valued at ~12 (from pacing table 8.1).
- Player can ship ~8-10 value (keeping some for local use).
- fulfillmentScore = 10 / 15 = 0.67 (above 0.5 partial threshold)
- Result: Partial reward (+2.5 favor instead of +5). Player stays at Neutral.
- Best case: 5 value demanded. Ship 5x Rock cubes (value 2.5) + 3x Scrap (value 3.0) = 5.5 value.
- fulfillmentScore = 5.5 / 5 = 1.1. Full reward. +5 favor → favor = 20 (still Neutral).
- Verdict: First demand is achievable without crippling local economy. PASS.

### Scenario 7: "Independence viability check"

Requirements: Favor 80+, 200 stockpile value, 3 bases, Broadcast Tower.
- Reaching Essential favor (80): Need ~12 successful major/critical shipments after starting at 15.
  - 6 major (+20 each = +120) puts you at 135, capped at 100. Achievable by minute 50-60.
- 200 stockpile value: With late-game automation at 20 value/min, takes ~15 minutes of saving.
- 3 bases: Outpost cost is ~30 cubes each. With 2 extra outposts = 60 cubes. Achievable by minute 40.
- Punitive expedition: 3 waves of 5 bots (15 total). Player should have turrets + heavy bots by now.
  - 5 soldiers (100 HP each) vs 3 turrets (2 DPS each = 6 DPS total) = killed in ~83 seconds per wave.
  - 5-minute gaps give time to repair between waves.
- Verdict: Independence is achievable around minute 70-80. Challenging but fair. PASS.

---

## 13. Formula Reference Sheet

```
-- Extraction --
effectiveRate = baseExtractionRate * drillTierMultiplier * oreGrindSpeed * biomeHarvestMod * weatherHarvestMod
ticksToFill = powderCapacity / effectiveRate
secondsToFill = ticksToFill / 60

-- Compression --
shakeIntensity(t) = peakIntensity * (t / duration)^2
pressure(t) = (t / duration)^3
heat(t) = ((t - delay) / (duration - delay))^2, where delay = duration * 0.15
cubeQuality = 1.0 * damageModifier * rushModifier

-- Cube Value --
effectiveCubeValue = baseValue * quality
wallHP = hpPerCube * quality

-- Wealth & Raids --
raidPoints = totalVisibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidInterval = max(120, 600 - raidPoints * 2) seconds
maxRaiders = min(15, floor(raidPoints / 15))

-- AI Economy --
cubesPerMinute = baseCubeRate * difficultyMult * max(1, territories) * factionEconomyBias
cubesPerEval = max(1, ceil(cubesPerMinute * evalInterval / 60))

-- Trade --
tradeRatio = offeredTotalValue / requestedTotalValue
isFair = tradeRatio >= 0.8 && tradeRatio <= 1.2

-- Patron Shipments (Colonization Model) --
fulfillmentScore = sum(shippedCubeValue) / demandedValue
favorChange = if fulfillment >= 1.0 then +tierFavorGain, elif >= 0.5 then +tierFavorGain/2, else -10
optimalShipPercent = gamePhaseShipRate * (1 - localThreat)
aiShipDecision = if favor < 25 then prioritize_ship, elif threat > 0.6 then prioritize_local, else ship_surplus

-- Factory Throughput --
beltDeliveryTime = beltLength / beltSpeed
furnaceCycleTime = recipeTime / (1 + 0.5 * isPowered)
throughput = min(beltDeliveryRate, 1 / furnaceCycleTime)
```
