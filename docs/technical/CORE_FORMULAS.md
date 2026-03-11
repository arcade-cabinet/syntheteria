# Core Formulas

Mathematical formulas for Syntheteria's game mechanics, sourced directly from the
implemented systems. All configurable constants reference their JSON config path so
balance changes can be made without touching code.

**Sources verified against:** commit on current branch, 2026-03-11.

See also: [docs/CONFIG.md](../CONFIG.md) for config schema.

---

## Notation

- `delta` — elapsed seconds since last frame (per-frame systems)
- `tick` — simulation tick integer (tick-based systems)
- All distances in meters (m)
- All time in seconds (s)

---

## 1. Harvesting (Powder Extraction)

**File:** `src/systems/harvesting.ts`
**Config:** `config/mining.json`

### 1.1 Powder gained per frame

```
powderThisTick = deposit.grindSpeed * delta
```

`deposit.grindSpeed` is per-material (e.g. rock = 1.0, titanium = 0.3, quantum_crystal = 0.1).

The result is clamped so it never exceeds `deposit.quantity` (can't overharvest).

### 1.2 Deposit depletion

```
deposit.quantity -= powderThisTick
```

When `deposit.quantity <= 0`, harvesting stops automatically and `harvest_complete` is emitted.

### 1.3 Harvest range check

Player must be within `config.mining.harvesting.defaultRange` meters (Euclidean 3D distance).
Default: read from `config/mining.json harvesting.defaultRange`.

### 1.4 Per-material grind speeds (from `config/mining.json`)

| Ore | grindSpeed | hardness |
|-----|-----------|---------|
| rock | 1.00 | 1 |
| scrap_iron | 0.80 | 2 |
| copper | 0.60 | 3 |
| carbon | 0.35 | 3 |
| silicon | 0.40 | 4 |
| titanium | 0.30 | 5 |
| gold | 0.25 | 5 |
| rare_earth | 0.20 | 6 |
| quantum_crystal | 0.10 | 8 |

Drill tier multipliers apply on top of these rates via `config/mining.json drillTiers[n].rateMultiplier`
(Tier 1: 1.0x, Tier 2: 2.0x, Tier 3: 3.6x).

---

## 2. Compression (Powder to Cube)

**File:** `src/systems/compression.ts`
**Config:** `config/furnace.json` (`compression.cubeSize`, `compression.configs`)

### 2.1 Compression feasibility

Compression starts if:
```
powderStorage[material] >= config.compression.configs[material].powderRequired
```

### 2.2 Powder consumed

```
powderStorage[material] -= config.compression.configs[material].powderRequired
```

Deducted at start. Not refunded on cancel.

### 2.3 Compression progress

```
progress = elapsed / compressionTime  -- clipped to [0, 1]
```

Timer advances each frame by `delta`. Cube ejects when `elapsed >= compressionTime`.

### 2.4 Output cube size

All cubes are `0.5m` rigid body boxes regardless of material type.
(`config/furnace.json compression.cubeSize = 0.5`)

### 2.5 Per-material compression parameters (from `config/furnace.json`)

| Material | powderRequired | compressionTime (s) | screenShakePeak | ejectVelocity |
|----------|---------------|--------------------|-----------------|-|
| rock | 40 | 1.0 | 0.30 | 2.0 |
| scrap_iron | 60 | 1.5 | 0.50 | 1.8 |
| copper | 80 | 2.0 | 0.60 | 1.6 |
| carbon | 90 | 2.0 | 0.60 | 1.5 |
| silicon | 100 | 2.5 | 0.70 | 1.4 |
| titanium | 120 | 3.5 | 0.90 | 1.0 |
| gold | 130 | 3.5 | 0.85 | 1.1 |
| rare_earth | 150 | 4.0 | 0.80 | 1.2 |
| quantum_crystal | 200 | 5.0 | 1.00 | 0.8 |

### 2.6 Ejection physics

```
forwardWeight = 0.7   (config/furnace.json compression.ejectPhysics.forwardWeight)
upWeight      = 0.3   (config/furnace.json compression.ejectPhysics.upWeight)
```

Cube velocity = `ejectVelocity * (forward * forwardWeight + up * upWeight)`.
Rapier rigid body gets bounce restitution 0.3, friction 0.6.

---

## 3. Furnace Smelting

**File:** `src/systems/furnaceProcessing.ts`
**Config:** `config/furnace.json` (tiers, smelterRecipes)

### 3.1 Smelting progress

```
state.elapsed += delta   (only when furnace.isPowered == true)
progress = state.elapsed / recipe.smeltTime
```

Timer pauses when power is cut; resumes when power is restored.

### 3.2 Completion

```
completed = state.elapsed >= recipe.smeltTime
```

On completion the output cube spawns at:
```
outputPosition = { x: furnace.x, y: furnace.y + 1.0, z: furnace.z + 1.5 }
```

### 3.3 Output cube ejection

After one recipe completes, the next hopper item auto-starts if available.

### 3.4 Key recipe times (Tier 1 — Salvage, from `config/furnace.json`)

| Recipe | Inputs | Output | Time (s) |
|--------|--------|--------|---------|
| grabber_arm | scrap_iron x3 | tool_grabber_t1 | 10 |
| diamond_drill_bit | scrap_iron x4 | tool_harvester_t2 | 15 |
| scanner_lens | scrap_iron x2 | tool_scanner_t1 | 8 |
| scrap_wall_panel | scrap_iron x3, rock x2 | building_wall_scrap | 12 |
| basic_miner_frame | scrap_iron x6 | building_miner_t1 | 25 |

Tier 2 (techRequired: 2) and higher are unlocked by tech research. See `config/furnace.json` for full recipe list.

---

## 4. Combat (Melee)

**File:** `src/systems/combat.ts`
**Config:** `config/combat.json`

### 4.1 Attack eligibility per tick

```
attackOccurs = (dist <= MELEE_RANGE) AND (Math.random() <= ATTACK_CHANCE)
```

Where:
- `MELEE_RANGE = config.combat.meleeRange` (2.5m)
- `ATTACK_CHANCE = config.combat.attackChancePerTick` (0.3 = 30% per tick)

### 4.2 Hit resolution (component damage model)

```
hitChance = hasArms(attacker) ? config.combat.meleeHitChance        -- 0.7
                              : config.combat.meleeHitChanceNoArms  -- 0.3

hit = Math.random() <= hitChance
```

On hit, one random functional component on the target is set to `functional = false`.
Each attack breaks exactly one component (or zero on a miss).

### 4.3 Destruction check

```
destroyed = unit.components.every(c => !c.functional)
```

A unit is destroyed when all components are broken.

### 4.4 Salvage drop on destruction

```
scrapMetal += Math.floor(componentCount * config.combat.salvageScrapMultiplier)
                              -- salvageScrapMultiplier = 1.5

eWaste += 1   if Math.random() < config.combat.salvageEWasteChance
                              -- salvageEWasteChance = 0.5
```

### 4.5 Retaliation

After an attacker hits a target, the target immediately retaliates (same tick, same hit-chance formula) if it has any functional components left.

### 4.6 Hostility rules

| Attacker faction | Attacks |
|-----------------|---------|
| wildlife | Never initiates |
| player | Never initiates (player controls attacks directly) |
| feral | All non-feral, non-wildlife |
| AI faction | Only factions declared at war via `declareWar(a, b)` |

---

## 5. Turret Defense

**File:** `src/systems/turret.ts`
**Config:** `config/buildings.json` (defense.turret), `config/combat.json`

### 5.1 Targeting

Turret selects the nearest enemy unit within `turretCfg.range`. Targets faction "feral",
"cultist", and "rogue" only (not player, not wildlife, not AI civs unless at war).

### 5.2 Fire rate

```
fireCondition = (cooldown == 0) AND (turret.powered) AND (turret.operational)
cooldown resets to turretCfg.fireRateTicks after each shot
cooldown decrements by 1 per tick
```

### 5.3 Hit resolution

Same component-damage model as melee combat:
```
hit = Math.random() <= turretCfg.hitChance
```
On hit, one random functional component is broken. Same salvage drop on destruction.

---

## 6. Raid Targeting

**File:** `src/systems/raidTargeting.ts`
**Config:** `config/combat.json` (raid section)

### 6.1 Stockpile clustering

Cubes within `raidCfg.clusterRadius` meters of each other (XZ plane) are grouped into
one stockpile using single-linkage BFS.

### 6.2 Target score

Higher score = more attractive to raiders:
```
score = estimatedValue / (1 + threatLevel)

estimatedValue = sum over cluster of: VALUE_WEIGHTS[cube.resourceType] * cube.value
threatLevel    = count of functional enemy units within raidCfg.defenderScanRadius
```

`VALUE_WEIGHTS` per material type are in `config/combat.json raid.valueWeights`.

Targets are sorted descending by score; the top target is attempted first.

### 6.3 Raid viability

```
availableForce  = sum of functional component counts across attacker's units
expectedDefense = target.threatLevel * raidCfg.defenderComponentEstimate

forceRatio = availableForce / expectedDefense   (or 10 if expectedDefense == 0)

viable = (forceRatio >= raidCfg.forceRatioThreshold) AND (availableForce > 0)
```

---

## 7. Wall Segments

**File:** `src/systems/wallBuilding.ts`
**Config:** `config/combat.json` (walls section)

### 7.1 Segment formation

A wall segment forms when 3 or more cubes are contiguous (adjacent grid cells) in an
axis-aligned line (X or Z) at the same Y level.
`MIN_WALL_LENGTH = config.combat.walls.minWallLength` (3).

### 7.2 Wall HP

```
wallHP = sum of MATERIAL_WALL_HP[cube.material] for each cube in segment
```

`MATERIAL_WALL_HP` is keyed per material in `config/combat.json walls.materialWallHp`.
Default for unknown materials: `config.combat.walls.defaultCubeHp` (25).

### 7.3 Breach threshold

```
breached = (segment.hp <= 0) OR (segment.hp < segment.maxHp * BREACH_THRESHOLD)
BREACH_THRESHOLD = config.combat.walls.breachThreshold
```

### 7.4 Cover bonus

Units behind a wall segment receive `WALL_DEFENSE_BONUS = config.combat.walls.wallDefenseBonus`
as a damage reduction multiplier. Cover is checked by scanning `coverScanDistance` cells
toward the threat and testing whether any cell belongs to a wall segment.

---

## 8. Power System (Lightning Rods)

**File:** `src/systems/power.ts`
**Config:** `config/power.json`

### 8.1 Storm intensity oscillation (per tick)

```
stormPhase  = tick * config.power.stormPhaseRate

base = config.power.stormBaseOscillationMin
       + config.power.stormBaseOscillationAmplitude * sin(stormPhase * config.power.stormBaseFrequency)

surge = max(0, sin(stormPhase * config.power.stormSurgeFrequency
                  + config.power.stormSurgePhaseOffset)) * config.power.stormSurgeAmplitude

stormIntensity = min(config.power.stormMaxIntensity, base + surge)
```

### 8.2 Lightning rod output

```
weatherMult = getWeatherModifiers(currentWeather).lightningChanceMult
rodOutput   = rod.rodCapacity * stormIntensity * weatherMult
totalPower  = sum of rodOutput across all rods
```

### 8.3 Power distribution

Buildings within `config.power.defaultPowerRadius` of any powered rod receive power.
Power demand = sum of per-building demands when `building.operational == true`.

---

## 9. Movement

**File:** `src/systems/movement.ts`

### 9.1 Per-frame interpolation along nav-path

```
effectiveSpeed = applyMovementModifier(unit.speed, currentWeather)
step           = effectiveSpeed * delta * gameSpeed

dist = sqrt((target.x - pos.x)^2 + (target.z - pos.z)^2)

if dist <= step:
    pos = target   (snap to waypoint, advance pathIndex)
else:
    pos.x += (dx / dist) * step
    pos.z += (dz / dist) * step

pos.y = getTerrainHeight(pos.x, pos.z)   (height-sampled every frame)
```

### 9.2 Weather movement modifiers

`applyMovementModifier` reads a multiplier from `src/systems/weatherEffects.ts` based on
`config/weather.json`. For example, storm weather reduces movement speed.

---

## 10. Tech Research

**File:** `src/systems/techResearch.ts`
**Config:** `config/technology.json`

### 10.1 Research progress per tick

```
effectiveCompute = computeByFaction[faction] * factionResearchBonuses[faction]

if tech.race == faction:
    effectiveCompute *= 1.5   (faction-affinity bonus for own-race techs)

state.active.progress += effectiveCompute
```

`factionResearchBonuses` per faction multiplier is in `config/technology.json factionResearchBonuses`.

### 10.2 Completion

```
completed = state.active.progress >= tech.researchCost
```

### 10.3 Prerequisites

A tech can be started only when all prerequisite tech IDs are in the faction's
`researched` set, and no other research is in progress.

---

## 11. Scavenging (Resource Points)

**File:** `src/systems/resources.ts`
**Config:** `config/mining.json` (scavenging section)

### 11.1 Scavenge point generation

Points are seeded deterministically across a grid:
```
for z in range(gridMinZ, gridMaxZ, gridSpacing):
    for x in range(gridMinX, gridMaxX, gridSpacing):
        if rng() > spawnChance: skip
        position += jitter up to +-scavCfg.jitter meters (uniformly random)
```

### 11.2 Type selection

```
if   typeRoll < scrapWeight:               type = scrapMetal
elif typeRoll < scrapWeight + eWasteWeight: type = eWaste
else:                                       type = intactComponents
```

Amounts: `amountMin + floor(rng() * amountRange)` per visit.

### 11.3 Auto-scavenging (tick-based)

Units with functional arms automatically scavenge any point within
`scavCfg.range` meters. One scavenge per tick per unit. Moving units skip.

---

## 12. Perception (AI Vision)

**File:** `src/ai/PerceptionSystem.ts`
**Config:** `config/enemies.json` (perception section)

### 12.1 Field-of-view by unit type

| Unit type | FOV (degrees) |
|-----------|-------------|
| scout | `config.enemies.perception.scoutFOV` |
| heavy | `config.enemies.perception.heavyFOV` |
| default | `config.enemies.perception.defaultFOV` |

### 12.2 Vision range

```
range = config.enemies.perception.defaultRange
if unit has functional camera component:
    range += config.enemies.perception.cameraRangeBonus
```

Effective range is further modulated by weather:
```
effectiveRange = getEffectivePerceptionRange(range, currentWeather)
```

### 12.3 Line-of-sight occlusion

City buildings and placed cubes are represented as sphere obstacles using Yuka's
`Vision` class. A target is visible if:
1. Within `range` distance
2. Within FOV cone
3. No obstacle sphere intersects the ray from observer to target

---

## 13. Building Placement

**File:** `src/systems/buildingPlacement.ts`
**Config:** `config/buildings.json`

### 13.1 Placement validity

```
valid = isWalkable(x, z)
        AND NOT isInsideBuilding(x, z)
        AND (if type == "lightning_rod": distance to all existing rods >= minSpacing)

minSpacing = config.buildings.infrastructure.lightning_rod.minSpacing
```

### 13.2 Cost check

Costs are read from `config.buildings[category][id].cubeCost` as `{ materialId: count }`.
All costs must be payable before any resource is deducted.

---

## 14. Weather (Transition System)

**File:** `src/systems/weatherSystem.ts`
**Config:** `config/weather.json`

### 14.1 Transition interval

Weather transitions are checked every `config.weather.transitionIntervalTicks` ticks.

### 14.2 Storm intensity

```
-- During storm/EM-surge states:
stormIntensity += INTENSITY_GROWTH   (config.weather.stormIntensityGrowthRate)
stormIntensity  = min(1.0, stormIntensity)

-- During all other states:
stormIntensity -= INTENSITY_DECAY    (config.weather.stormIntensityDecayRate)
stormIntensity  = max(0.0, stormIntensity)
```

### 14.3 Markov chain transition

Transition probabilities per weather state are in `config/biomes.json weatherTransitions`.
Each row must sum to 1.0 (enforced by schema tests).
A mulberry32 PRNG selects the next state:
```
next = pickWeightedRandom(transitions[current], rng())
```

### 14.4 Acid rain damage

```
damage per tick = ACID_RAIN_DAMAGE_PER_TICK  (config.weather.acidRainDamagePerTick)
```
Applied to exposed units when weather == "acid_rain".

---

## 15. Drone Assembly (Unchanged Formulas)

These formulas from the original design are implemented in robot spawning and remain accurate.

### 15.1 Robot validity

```
valid = has_power_source AND has_controller AND (has_locomotion OR is_stationary)
```

### 15.2 Operational weight

```
total_weight      = sum(component.weight for component in robot.components)
payload_weight    = sum(item.weight for item in robot.cargo)
operational_weight = total_weight + payload_weight
```

### 15.3 Torque validation

```
can_move = total_torque >= operational_weight
torque_margin = total_torque / operational_weight
```

| Margin | Behavior |
|--------|----------|
| < 1.0 | Cannot move |
| 1.0 - 1.5 | Sluggish |
| 1.5 - 2.0 | Normal |
| > 2.0 | Agile |

### 15.4 Power state

```
power_ratio = total_power_draw / power_capacity
```

| Ratio | State |
|-------|-------|
| <= 0.7 | Sustainable (green) |
| <= 0.9 | Elevated (yellow) |
| <= 1.0 | Critical (red) |
| > 1.0 | Overdraw — reduce activity |

---

## 16. Hacking

**File:** `src/systems/hacking.ts`
**Config:** `config/hacking.json`

### 16.1 Hack feasibility

```
can_hack = has_signal_link
           AND has_technique
           AND available_compute >= config.hacking.computeCostPerHack
```

### 16.2 Hack duration

```
hack_duration = config.hacking.baseHackSpeed
                * (target_hack_resistance / player_compute_surplus)
```

### 16.3 Hack compute cost

```
hack_compute_cost = target_complexity * technique_efficiency
```

Where `target_complexity` is based on target compute contribution and hack resistance;
`technique_efficiency` is the quality of the discovered hacking technique.

---

## 17. Signal Range

### 17.1 Base signal range

```
base_signal_range = 1000m  (from core infrastructure)
extended_range    = base_signal_range + sum(relay.range for each relay in network)
```

### 17.2 Robot connectivity

```
connected = (distance_to_nearest_relay <= relay.range)
            OR (distance_to_core <= base_signal_range)
```

---

## Implementation Notes

1. **Floating point everywhere.** Round only for display.
2. **Update frequency:** Harvest/compression/furnace run per-frame (delta-scaled). Combat/turrets/raids/research run per simulation tick.
3. **Config is ground truth.** All numeric constants above reference their config path. Changing the JSON changes behavior without code changes.
4. **Null guards.** All config lookups use `?? default` to avoid NaN.
5. **Edge cases.** Division-by-zero is guarded in raid viability (returns 10 when expectedDefense == 0 and attacker has units).
