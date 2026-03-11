# Environment Systems

**Authoritative reference for weather, terrain, biomes, and environmental hazards.**

See also: `docs/design/gameplay/AUDIO.md` — storm ambience layers, biome soundscapes, lightning sound triggers, sinkhole warning rumble.

---

## Design Philosophy

The machine planet is not a passive backdrop. It is an active participant in gameplay -- a living system of corroded terrain, electrical storms, and corrosive rain that forces constant adaptation. Three principles govern every environmental mechanic:

**1. Weather is a strategic resource and threat.** Storms are not cosmetic. They charge lightning rods, degrade visibility, corrode exposed stockpiles, and disrupt signal networks. A player who monitors the weather forecast and times their operations accordingly gains a decisive advantage over one who ignores it. An EM Surge is simultaneously the most dangerous weather event and the most powerful window for hacking and power generation.

**2. Biomes create distinct gameplay zones.** Each of the five biomes is a self-contained strategic proposition: different movement costs, different primary resources, different natural defenses, different hazards. Controlling a biome means controlling its resource supply. The best resources spawn in the hardest-to-hold biomes.

**3. The planet escalates.** Early game is calm. Late game is dangerous. The processing cycle system ensures that new players learn in relative safety while experienced players face increasingly volatile conditions where rare resources appear alongside lethal hazards. The planet's core machinery drives this escalation -- dormant at start, convergent by endgame.

Environmental mastery is as important as combat mastery. The player who builds roofed storage before the first acid rain, who places lightning rods on Chrome Ridge peaks before the first storm, who retreats bots to Cable Forest canopy before the first EM Surge -- that player survives.

---

## Weather System

### Five Weather States

Weather cycles using weighted Markov chain transitions. Each state modifies movement, harvesting, combat, visibility, and power generation. Transitions occur every **600 ticks (~10 seconds at 60 TPS)**.

#### Clear

The default state. Full capability across all systems. Good conditions for scouting and expansion.

| Modifier | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 100% |
| Combat Accuracy | 100% |
| Visibility Range | 100% (1.0x) |
| Power Generation | 100% |
| Lightning Strike Chance | 0% |
| Special | Solar power +20%, full perception range |
| Duration | 5--10 minutes |

#### Overcast

Reduced visibility, slight combat penalty from dim conditions. A warning that storms may follow.

| Modifier | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 95% |
| Combat Accuracy | 90% |
| Visibility Range | 70% (0.7x) |
| Power Generation | 80% |
| Lightning Strike Chance | 0% |
| Special | Reduced perception range for all units |
| Duration | 3--8 minutes |

#### Storm

The signature weather of the machine planet. Lightning strikes charge rods but threaten exposed units and cube stockpiles. Movement hindered by wind. Harvest and combat degraded.

| Modifier | Value |
|----------|-------|
| Movement Speed | 80% |
| Harvest Efficiency | 75% |
| Combat Accuracy | 80% |
| Visibility Range | 40% (0.4x) |
| Power Generation | 150% |
| Lightning Strike Chance | 5% per tick per exposed unit |
| Lightning Damage | 25 per strike |
| Cube Damage | Exposed cubes take 0.5 damage/minute |
| Special | Lightning rods charge at 1.5x. Unprotected units risk 25 damage + 1s stun. |
| Duration | 2--5 minutes |

#### Electromagnetic Surge

The most dangerous weather state. Electronics disrupted. Hacking range doubled but vulnerability also doubled. Compass and navigation markers break. Maximum lightning rod output.

| Modifier | Value |
|----------|-------|
| Movement Speed | 60% |
| Harvest Efficiency | 50% |
| Combat Accuracy | 70% |
| Visibility Range | 30% (0.3x) |
| Power Generation | 250% |
| Lightning Strike Chance | 15% per tick |
| Lightning Damage | 35 per strike |
| Hack Range | 2.0x base |
| Hack Resistance | 0.5x (halved) |
| Signal Packet Loss | 50% |
| Automation Fail Chance | 10% per tick |
| Cube Damage | 1.0 damage/minute |
| Special | Navigation markers disabled. Bot automation degrades. |
| Duration | 1--3 minutes |

**Faction implications:**
- **Signal Choir** thrives (hack range doubled = massive offensive window)
- **Iron Creed** suffers least (fortification-focused, less reliant on signals)
- **Volt Collective** benefits from massive power surge
- All automated logistics degrade -- manual intervention needed

#### Acid Rain

Corrosive precipitation that damages exposed metal. Movement slowed by slippery surfaces. Iron and scrap iron cubes corrode faster. Only sheltered or coated assets are safe.

| Modifier | Value |
|----------|-------|
| Movement Speed | 70% |
| Harvest Efficiency | 80% (acid weakens deposits: faster extraction, lower quality) |
| Combat Accuracy | 85% |
| Visibility Range | 50% (0.5x) |
| Power Generation | 90% |
| Lightning Strike Chance | 2% |
| Acid Damage | 0.5 HP/tick to exposed bots |
| Cube Corrosion | Iron/scrap cubes lose 1 HP/minute exposed |
| Special | Rust damage to iron/scrap structures. Copper develops patina (cosmetic). Titanium/silicon unaffected. |
| Duration | 2--4 minutes |

---

### Weather Transition Weights (Markov Chain)

Each row sums to 1.0. Read as: "From [row state], probability of transitioning to [column state]."

```
                  Clear    Overcast   Storm   EM Surge   Acid Rain
From Clear:        0.40      0.35     0.10      0.05       0.10
From Overcast:     0.25      0.30     0.25      0.05       0.15
From Storm:        0.10      0.20     0.30      0.20       0.20
From EM Surge:     0.15      0.20     0.30      0.20       0.15
From Acid Rain:    0.20      0.25     0.20      0.10       0.25
```

**Design rationale:**
- Clear is the most common single state but not a majority
- Storms chain into EM Surges (20% chance) -- creating "super storm" sequences
- Acid rain is somewhat persistent (25% self-transition)
- EM Surges are rare from Clear (5%) but common from Storms (20%)
- Overcast is the gateway state: it transitions broadly, making it a tension-builder

---

### Storm Intensity

Storm intensity is a continuous 0--1 value that modulates within stormy states:

```
During storm/EM surge:   intensity += 0.02 per tick   (reaches 1.0 in ~50 ticks)
During non-storm:        intensity -= 0.01 per tick   (decays over ~100 ticks)
```

Lightning strike chance is multiplied by intensity. A storm that just started has low lightning, building to full power over approximately 1 second. Lightning damage also scales: `strikeDamage = baseLightningDamage * stormIntensity`.

**Lightning strike check interval:** every 10 ticks during storm/EM surge.

---

### Storm Mechanics: Lightning Targeting

When a lightning strike occurs, the target is selected by weighted random choice:

```
strikeTarget = random weighted selection:
  - Lightning rods       (weight 10) -- absorbed harmlessly, generates power
  - Tall structures      (weight  3) -- buildings take 25 damage
  - Units in open        (weight  2) -- 25 damage, 1s stun
  - Cube piles > 5       (weight  1) -- top cube takes 25 damage
  - Ground               (weight  5) -- cosmetic only, scorch mark
```

Lightning rods act as attractors. Having rods near your base dramatically reduces the chance of harmful strikes. This is their defensive function beyond power generation.

**Full lightning strike formula:**

```
strikeChance = weatherLightningChance * stormIntensity * biomeLightningMultiplier

biomeLightningMultiplier:
  rust_plains:     1.0
  scrap_hills:     1.0
  chrome_ridge:    3.0   (chrome attracts lightning)
  signal_plateau:  1.5
  cable_forest:    0.0   (cable canopy blocks all strikes)

if strike occurs:
  target = selectTarget(weighted table above)
  damage = baseLightningDamage * stormIntensity
  apply stun (1 second) to hit unit
  cosmetic: flash, thunder sound, scorch mark
```

---

### Acid Rain: Material Corrosion

Corrosion is checked every 60 ticks during acid rain. Each exposed cube takes damage based on its material:

| Material | Acid Damage/Minute | Notes |
|----------|-------------------|-------|
| Rock | 0.5 | Slight dissolution |
| Scrap Iron | 2.0 | Heavy rust, most vulnerable |
| Iron (smelted) | 1.5 | Cleaner iron rusts less |
| Copper | 0.3 | Patina protects |
| Carbon | 0 | Acid resistant |
| Silicon | 0 | Acid resistant |
| Titanium | 0 | Acid resistant |
| Steel | 0.5 | Treated surface |
| Rare Earth | 0.2 | Minimal effect |
| Gold | 0 | Noble metal |
| Quantum Crystal | 0 | Otherworldly material |

**Acid erosion formula:**

```
erosionCheck: every 60 ticks during acid_rain
for each exposed cube:
  if cube.material in ["scrap_iron", "iron", "rock", "steel", "copper", "rare_earth"]:
    cube.hp -= acidCorrosionRate[material]
  if cube.hp <= 0:
    destroyCube(cube)   // crumbles to dust
    spawnRubble(cube.position)

for each exposed bot:
  bot.hp -= 0.5 per tick
  if bot has "rust_resistance" (Reclaimers): damage * 0.7
```

**Shelter rules:**
- Cubes under a roof (any horizontal structure 1+ blocks above) take **0 acid damage**
- Bots within 3m of any building are partially sheltered (**50% damage reduction**)
- This incentivizes building roofed storage areas -- emergent architecture

---

### Weather Forecasting

Players can see weather forecasts up to 3 transitions ahead (requires signal relay + compute):

| Forecast Distance | Accuracy |
|-------------------|----------|
| Next transition | 85% |
| 2 transitions ahead | 60% |
| 3 transitions ahead | 40% |

This allows strategic preparation: if a storm is forecast, secure cube stockpiles, charge power reserves, position bots near lightning rods.

---

### Weather Effects on Patron Shipments

Weather affects the colonization patron shipment system. Otter hologram communication degrades in bad weather, and physical cube shipments require good conditions.

| Weather | Shipment Effect | Hologram Quality |
|---------|----------------|-----------------|
| Clear | Normal arrival/departure | Crystal clear |
| Overcast | Normal | Slight static |
| Storm | Delayed 30 seconds | Intermittent, flickering |
| EM Surge | **Blocked** until surge ends | Offline |
| Acid Rain | Iron/scrap cubes take corrosion in transit | Distorted, yellow tint |

**Strategic implication:** Time patron shipments for clear or overcast weather. If a demand deadline falls during an EM Surge, plan ahead or miss it.

---

## Processing Cycles (Seasonal System)

### Concept

The machine planet has "processing cycles" instead of biological seasons. These are planet-wide state changes driven by the planet's core machinery -- remnant automated systems from the original builders. Each cycle lasts 8--15 minutes of real time and shifts which resources are more abundant, which weather is more common, and how combat behaves.

### Cycle Definitions

| Cycle | Duration | Weather Bias | Resource Bonus | Combat Effect | Narrative |
|-------|----------|-------------|---------------|---------------|-----------|
| **Dormant** | 15 min | Clear +20%, Storm -10% | Rock/Scrap Iron +20% yield | Normal (1.0x) | Core systems idle. Calm surface. |
| **Active** | 15 min | Storm +15%, EM Surge +10% | Copper/Silicon +15% yield | Power generation +30% | Core systems processing. Electrical activity rises. |
| **Volatile** | 12 min | Storm +25%, Acid Rain +15% | Titanium/Carbon +20% yield | Movement -10%, all damage +10% | Core overheating. Planet surface destabilizes. |
| **Convergent** | 10 min | EM Surge +30%, Acid Rain +20% | Rare Earth/Gold +30% yield | Hack range +50%, Lightning 2x | Core systems peak. Maximum danger, maximum reward. |
| **Aftermath** | 8 min | Clear +30%, Overcast +20% | All yields +10% | Repair speed +50% | Core exhausted. Brief window of recovery. |

### Cycle Progression Timeline

Cycles progress linearly through the game, escalating danger alongside opportunity:

| Game Time | Cycle Pattern | Design Intent |
|-----------|--------------|---------------|
| 0--45 min | Dormant -> Active -> Dormant -> Active | Early game calm. Learn systems safely. |
| 45--90 min | Active -> Volatile -> Active -> Volatile | Mid-game volatility. Storms become common. |
| 90--150 min | Volatile -> Convergent -> Volatile -> Aftermath | Late game danger. Rare resources appear. |
| 150+ min | Convergent -> Aftermath -> Convergent (repeating) | Endgame intensity. Maximum risk/reward. |

**HUD indicator:**
```
Bottom-left corner:
  CYCLE: ACTIVE  [||||||||----]  7:30 remaining
  NEXT: VOLATILE
```

---

## Biomes

### Five Core Biomes

Each biome has distinct visual identity, primary resources, movement characteristics, and strategic significance. Biomes are generated during map creation and remain fixed.

#### Rust Plains (Foundry Biome)

The default terrain. Flat, corroded ground with scattered debris. Easy to build on, easy to traverse. Most starting positions are in or near Rust Plains.

| Property | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 100% |
| Visibility | 100% |
| Signal Bonus | 1.0x |
| Lightning Multiplier | 1.0x |
| Primary Resources | Rock (1.5x), Scrap Iron (1.3x), Gold (2.0x) |
| Alien Spawn Rate | Low (0.02/tick) |
| Terrain Color | `#8B6914` (rusty gold-brown) |

**Features:** Scrap piles (2x3m salvageable debris clusters), corroded machinery (deconstructable for components), flat terrain optimal for belt networks.

#### Scrap Hills (Slag Biome)

Rolling hills of compacted industrial waste. Slower movement due to uneven terrain but rich in metals. Good defensive terrain due to elevation.

| Property | Value |
|----------|-------|
| Movement Speed | 80% |
| Harvest Efficiency | 120% |
| Visibility | 100% |
| Signal Bonus | 1.0x |
| Lightning Multiplier | 1.0x |
| Primary Resources | Titanium (1.5x), Carbon (1.3x), Rock (1.2x) |
| Alien Spawn Rate | Medium (0.03/tick) |
| Terrain Color | `#6B5B3A` (dark brown-grey) |

**Features:** Slag mounds (3--5m hills with +15% combat range from high ground), toxic pools (small impassable areas), narrow passes (natural chokepoints for wall placement).

**Height advantage:**
```
if attacker.elevation > target.elevation:
  rangeBonus  = +15% effective range
  damageBonus = +10%
if attacker.elevation < target.elevation:
  rangePenalty    = -10% effective range
  accuracyPenalty = -15%
```

#### Chrome Ridge (Mountain Biome)

Steep terrain with exposed chrome and titanium veins. Difficult to traverse but highly reflective surfaces create unique visibility conditions. Premium material access.

| Property | Value |
|----------|-------|
| Movement Speed | 60% |
| Harvest Efficiency | 80% |
| Visibility | 70% (reflections cause glare) |
| Signal Bonus | 1.0x |
| Lightning Multiplier | 3.0x |
| Primary Resources | Titanium (2.0x), Silicon (1.5x), Carbon (1.2x) |
| Alien Spawn Rate | Medium (0.03/tick) |
| Terrain Color | `#A0A0B0` (silver-grey) |

**Features:** Cliff faces (impassable vertical segments), chrome deposits (harvestable at cliff base), reflective surfaces (130% visibility during Clear weather), treacherous single-file paths between ridges.

#### Signal Plateau (Processor Biome)

Flat elevated plateaus studded with ancient processor towers and silicon outcrops. Excellent signal propagation. The domain of the Signal Choir.

| Property | Value |
|----------|-------|
| Movement Speed | 90% |
| Harvest Efficiency | 70% (ancient interference) |
| Visibility | 100% |
| Signal Bonus | 1.5x |
| Lightning Multiplier | 1.5x |
| Primary Resources | Silicon (1.5x), Rare Earth (2.0x), Quantum Crystal (2.0x), Copper (1.3x) |
| Alien Spawn Rate | High (0.05/tick) |
| Terrain Color | `#6A5ACD` (purple-blue) |

**Features:** Processor towers (2.0x signal relay range when built adjacent), silicon fields (high yield, heavy alien presence), EM interference zones (5m radius: no automation, no hacking), ancient sentinel spawn points (high-value deposits always guarded).

#### Cable Forest (Cable Biome)

Dense terrain of tangled cables, conduits, and fallen transmission towers. The planet's ancient wiring system. Extremely slow movement but rich in copper and carbon.

| Property | Value |
|----------|-------|
| Movement Speed | 50% |
| Harvest Efficiency | 110% (cables are easy to strip) |
| Visibility | 40% (dense cable canopy) |
| Signal Bonus | 0.6x (interference) |
| Lightning Multiplier | 0.0x (canopy blocks) |
| Primary Resources | Copper (2.0x), Carbon (1.5x), Quantum Crystal (1.5x), Scrap Iron (1.2x) |
| Alien Spawn Rate | High (0.05/tick) |
| Terrain Color | `#2A3A2A` (dark green-black) |

**Features:** Cable canopy (blocks lightning AND acid rain), natural traps (5% snare chance per movement tick, 2s stuck), ambush corridors (enemies invisible until 5m range), copper veins at 2x extraction rate.

#### Water Biomes

Two water types serve as terrain boundaries:

| Type | Move | Passable | Lightning | Notes |
|------|------|----------|-----------|-------|
| Deep Water | 0% | No | 1.0x | Impassable barrier, requires bridges |
| Shallow Water | 40% | Yes | 2.0x | Hazardous crossing, conducts lightning |

### Biome Summary Table

| Biome | Move | Harvest | Vis | Signal | Lightning | Primary Resource | Alien Rate | Strategic Role |
|-------|------|---------|-----|--------|-----------|-----------------|------------|---------------|
| Rust Plains | 100% | 100% | 100% | 1.0x | 1.0x | Rock, Scrap Iron, Gold | Low | Starting base, logistics |
| Scrap Hills | 80% | 120% | 100% | 1.0x | 1.0x | Titanium, Carbon | Medium | Defense, chokepoints |
| Chrome Ridge | 60% | 80% | 70% | 1.0x | 3.0x | Titanium, Silicon | Medium | Premium materials, fortress |
| Signal Plateau | 90% | 70% | 100% | 1.5x | 1.5x | Silicon, Rare Earth, QC | High | Compute, rare resources |
| Cable Forest | 50% | 110% | 40% | 0.6x | 0.0x | Copper, Carbon, QC | High | Ambush, copper access |

### Faction Biome Preferences

Each faction has a preferred starting biome based on its economic and strategic strengths. See `RACES.md` for full faction profiles. Preference data is also stored in `config/biomes.json` under `factionBiomePreferences`.

| Faction | Preferred Biome | Reason |
|---------|----------------|--------|
| Reclaimers | Rust Plains | Scrap abundance, easy logistics |
| Volt Collective | Scrap Hills + Rust Plains | Aggressive expansion, lightning rod placement on hills |
| Signal Choir | Signal Plateau | Signal bonus, compute generation, hacking range |
| Iron Creed | Chrome Ridge / Scrap Hills | Natural fortress, premium wall materials |

---

## Weather x Biome Interaction Matrix

Weather and biome modifiers stack **multiplicatively**. Special interactions override or amplify base effects.

| Weather x Biome | Rust Plains | Scrap Hills | Chrome Ridge | Signal Plateau | Cable Forest |
|----------------|-------------|-------------|--------------|----------------|--------------|
| **Clear** | Normal | Normal | Vis 130% (reflection) | Normal | Normal |
| **Overcast** | Normal | Normal | Normal | Normal | Vis 25% (very dark) |
| **Storm** | Full exposure | Partial cover (hills) | Lightning 3x (peaks) | EM equipment risk | Canopy blocks lightning |
| **EM Surge** | Full exposure | Full exposure | Chrome amplifies EM (2x hack range) | Hack warzone (3x hack range total) | Signal completely blocked |
| **Acid Rain** | Iron cubes corrode | Iron cubes corrode | Chrome resists acid | Silicon unaffected | Canopy blocks acid |

### Notable Interactions

**Storm + Chrome Ridge:** Chrome peaks attract lightning at 3x frequency. Dangerous for units, excellent for power generation. Place lightning rods on peaks for massive energy output.

**EM Surge + Signal Plateau:** Signal bonus (1.5x) combines with EM Surge hack range (2.0x) for **3.0x total hack range**. Signal Choir forces on Signal Plateau during EM Surge can hack targets across the entire plateau. Counter: the 0.5x hack resistance penalty applies symmetrically.

**Acid Rain + Cable Forest:** Cable canopy fully protects from acid rain (0 damage). Cable Forest becomes a safe haven during corrosive weather for any faction that controls it.

**Storm + Cable Forest:** Cable canopy blocks all lightning. No lightning damage to anything under the canopy. Safest place during storms, but the hardest to navigate (50% movement, 40% visibility).

**EM Surge + Cable Forest:** Signal is completely blocked. No hacking, no signal relay, no automation. Units in Cable Forest during EM Surge are fully isolated.

---

## Environmental Hazards

### Static Hazards

| Hazard | Visual | Effect | Biome Locations |
|--------|--------|--------|-----------------|
| Acid Pool | Bubbling green-yellow liquid | 5 damage/second to bots entering | Cable Forest, Scrap Hills |
| Magnetic Anomaly | Shimmering air distortion | Random 30-degree heading offset, disables compass | Signal Plateau |
| Thermal Vent | Orange glow from ground cracks | 10 damage/second; cubes on vents take 3x storm damage | Chrome Ridge |
| Rubble Field | Collapsed structures, debris | 40% movement speed, 20% snare chance per movement tick | Rust Plains (rare), post-battle |

### Sinkholes (Mining-Triggered)

Heavy mining in one area can trigger terrain collapse:

```
miningDensity = cubesExtracted within 10m radius in last 300 seconds
sinkholeProbability = max(0, (miningDensity - 20) * 0.001) per tick

if sinkhole triggers:
  radius = 2--4m
  depth  = 3m
  all entities in radius fall:
    damage = 30
    stuck for 5 seconds (must be grabbed out or self-climb)
  all cubes in radius fall into hole (retrievable from bottom)
  terrain permanently modified (hole remains)

warning signs (30 seconds before):
  - ground texture cracks appear
  - subtle rumbling sound
  - small particle dust rising
```

### Magnetic Anomaly Expansion (EM Surge + Signal Plateau)

During EM Surge weather on Signal Plateau, magnetic anomaly zones expand dramatically:

```
normalAnomalyRadius   = 3m
emSurgeAnomalyRadius  = 8m   (2.67x expansion)

effects within anomaly:
  - compass disabled (minimap rotates randomly)
  - navigation waypoints hidden
  - bot automation: 30% chance to walk wrong direction per tick
  - hacking: impossible (magnetic interference)
  - deposits within anomaly yield +50% rare earth
```

---

## Terrain Elevation

### Height Layers

The world uses a heightfield terrain with 3 height layers. Elevation affects combat, movement, and visibility.

| Elevation Difference | Movement | Combat | Visibility |
|---------------------|----------|--------|-----------|
| 0 (flat) | Normal speed | Normal | Normal |
| 1 level up (climbing) | 60% speed | +10% damage, +15% range (high ground) | +20% range |
| 1 level down (descending) | 120% speed | -15% accuracy (shooting up) | Normal |
| 2+ levels (cliff) | Impassable | Cannot engage across | Blocked |

### Slope Movement Modifiers

```
movementSpeed = baseSpeed * biomeModifier * weatherModifier * slopeModifier

slopeModifier:
  flat     (slope < 0.1):   1.0
  gentle   (0.1 -- 0.3):    0.9
  moderate (0.3 -- 0.5):    0.7   (build restricted: small structures only)
  steep    (0.5 -- 0.7):    0.5   (no building)
  cliff    (> 0.7):         0.0   (impassable)
```

### Buildable Terrain

| Terrain Type | Buildable? | Notes |
|-------------|-----------|-------|
| Flat ground | Yes | Standard building placement |
| Gentle slope | Yes | Buildings auto-level (cosmetic) |
| Moderate slope | Limited | Only relays, rods, walls |
| Steep slope | No | Nothing can be built |
| Water/acid | No | No building, no walking |
| Hazard zone | No | Must clear hazard first (costs cubes) |
| Rubble | Yes, after clearing | Worker bot clears rubble (10s per tile) |
| Existing building | No | Must demolish first |

### Bridges

Players can bridge impassable terrain:

| Bridge Type | Span | HP | Cost | Width |
|------------|------|-----|------|-------|
| Scrap Bridge | 3 units | 100 | 4x Scrap Iron | 1 unit (single-file) |
| Iron Bridge | 5 units | 250 | 6x Iron + 2x Copper | 2 units (double-wide) |
| Titanium Bridge | 8 units | 500 | 8x Titanium + 4x Iron | 3 units (full army passage) |

Bridges can be destroyed by targeting their support columns. Destroyed bridges collapse -- anything on them takes 30 damage and falls to terrain below.

---

## Alien Native Territories

Native presence per biome is documented in `ALIENS.md` (Section: Hive Tiers, Placement). Summary data is also stored in `config/biomes.json` under `alienNativeTerritories`. See `ALIENS.md` for full hive tier progression, territory radius, hostility escalation, and the colonization tension dynamic.

---

## Master Formula Reference

```
-- Movement --
effectiveSpeed = baseSpeed * biomeMoveSpeedMod * weatherMoveSpeedMod
                 * slopeModifier * carrySpeedMod
slopeModifier  = lookup(slope, slopeModifiers table)

-- Combat (terrain) --
if attacker.elevation > target.elevation:
  effectiveRange  = baseRange  * (1 + heightAdvantage.rangeBonus)     // +15%
  effectiveDamage = baseDamage * (1 + heightAdvantage.damageBonus)    // +10%
else if attacker.elevation < target.elevation:
  effectiveRange  = baseRange    * (1 + heightAdvantage.rangePenalty)  // -10%
  hitChance       = baseHitChance * (1 + heightAdvantage.accuracyPenalty) // -15%

-- Harvesting (environment) --
effectiveHarvestRate = baseRate * drillMult * oreMult
                       * biomeHarvestMod * weatherHarvestMod * cycleBonus

-- Lightning --
strikeChance = weatherLightningChance * stormIntensity * biomeLightningMultiplier
strikeDamage = weatherLightningDamage * stormIntensity

-- Acid Erosion --
cubeErosion    = acidCorrosionRate[material] * (1 if exposed, 0 if sheltered)
                 * stormIntensity
botAcidDamage  = acidDamagePerTick * (1 - reclaimerResistance)

-- Hacking (environment) --
effectiveHackRange      = baseRange * biomeSignalBonus * weatherHackRangeMult
effectiveHackResistance = baseResistance * weatherHackResistanceMult
                          * (0 if in EM interference zone)

-- Visibility --
effectiveVisibility = baseVision * biomeVisibility * weatherVisibility
                      * (biomeSpecialVis or 1.0)

-- Sinkhole --
sinkholeProbability = max(0, (miningDensityIn10m - 20) * 0.001) per tick
```

---

## Config References

All values in this document are driven by JSON configuration files. Changing balance never requires code changes.

### Primary Config: `config/biomes.json`

The single source of truth for all environment system tuning. Contains:

- `biomes.*` -- per-biome modifier tables (movement, harvest, visibility, signal, lightning, resources, features)
- `weatherStates.*` -- per-weather modifier tables (all 5 states with full numeric values)
- `weatherTransitions.*` -- Markov chain weight matrix (uses decimal probabilities: 0.4, 0.35...)
- `stormIntensity.*` -- ramp/decay rates, check intervals
- `weatherForecasting.*` -- accuracy per forecast distance
- `weatherShipmentEffects.*` -- patron shipment behavior per weather
- `weatherBiomeInteractions.*` -- special override rules for specific weather+biome combos
- `terrain.slopeModifiers.*` -- movement penalties by slope grade
- `terrain.heightAdvantage.*` -- combat bonuses for elevation
- `terrain.hazards.*` -- per-hazard damage, radius, and biome locations
- `terrain.bridges.*` -- bridge types with span, HP, cost, width
- `processingCycles.*` -- cycle durations, weather bias, resource bonuses, combat mods
- `cycleProgression[]` -- timeline of which cycles appear at which game time
- `factionBiomePreferences.*` -- AI governor biome targeting
- `alienNativeTerritories.*` -- native presence and unique resources per biome

### Additional Config Files

| Config File | Contents | Relationship |
|-------------|----------|-------------|
| `config/weather.json` | Weather states, transition weights, storm intensity, forecast accuracy, acid rain | **Partially overlaps** `biomes.json`. Code (`weatherSystem.ts`) imports from `weather.json`. Uses integer weights (40, 35...) vs biomes.json decimals (0.4, 0.35...) -- semantically equivalent. |
| `config/terrain.json` | World size, water level, height layers, walk costs, biome colors | Terrain generation params. Uses short biome names ("foundry", "slag", "cable", "processor") -- 4 biomes vs 7 in `biomes.json`. |
| `config/environmentHazards.json` | Hazard types (radiation_zone, toxic_spill, unstable_ground, magnetic_anomaly, scrap_storm) | **Different hazard set** from this document (acid_pool, thermal_vent, rubble_field, sinkhole). Needs reconciliation. |

### Code References

| Source File | Purpose | Config Source |
|-------------|---------|--------------|
| `src/systems/weatherSystem.ts` | Weather state machine, transitions, forecast | `config/weather.json` |
| `src/systems/biomeSystem.ts` | Biome modifiers, grid lookup, pathfinding | **Hardcoded** (does not import from `config/biomes.json`) |
| `src/ecs/terrain.ts` | Procedural terrain heightfield, fog of war | `config/terrain.json` |

### Known Config Discrepancies

1. **Weather data duplication:** `config/weather.json` and `config/biomes.json` both define weather states and transition weights. `weatherSystem.ts` reads from `weather.json`.
2. **Hazard mismatch:** `config/environmentHazards.json` defines 5 hazard types (radiation_zone, toxic_spill, unstable_ground, magnetic_anomaly, scrap_storm). This document and `config/biomes.json` define 4 different hazards (acid_pool, thermal_vent, rubble_field, sinkhole) plus magnetic_anomaly (shared). Needs unification.
3. **Biome naming:** `config/terrain.json` uses 4 short names (foundry, slag, cable, processor). `config/biomes.json` uses 7 entries with both `displayName` and `loreName`. `biomeSystem.ts` hardcodes 6 entries matching `biomes.json` keys.
4. **biomeSystem.ts is not config-driven:** Biome modifiers are hardcoded in code rather than loaded from `config/biomes.json`. Should be migrated to config-driven.
