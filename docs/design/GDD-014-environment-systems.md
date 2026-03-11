# GDD-014: Environment Systems -- Weather, Terrain, and Biome Gameplay Effects

**Status:** Final (Colonization Pivot Applied)
**Date:** 2026-03-10
**Scope:** Complete environmental gameplay design -- weather states with exact modifiers, biome types with resource/movement/combat effects, terrain mechanics, processing cycle progression, and alien native territories

---

## 1. Design Philosophy

The machine planet is not a passive backdrop. It is an active participant in gameplay. Weather changes strategy on a minute-by-minute basis. Biomes determine where you build and what you mine. Terrain shapes combat and logistics. The environment is the "board" of the 4X -- controlling it is as important as controlling enemies.

Under the **Colonization model**, the machine planet is the "New World" -- a frontier rich in resources that your home planet patron wants exploited. The environment shapes which materials you can ship home, where alien natives have established their territories, and which biomes give your faction a natural advantage. Environmental mastery is colonial mastery.

---

## 2. Weather System

### 2.1 Weather States

Five weather states cycle using weighted probability transitions. Each state modifies movement, harvesting, combat, visibility, and power generation. Weather transitions occur every 600 ticks (~10 seconds at 60 TPS).

#### Clear

The default state. Full capability across all systems. Solar power bonus for future solar array buildings. Good conditions for scouting and expansion.

| Modifier | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 100% |
| Combat Accuracy | 100% |
| Visibility Range | 100% (1.0x) |
| Power Generation | 100% |
| Lightning Strike Chance | 0% |
| Special | Solar power +20% (future), full perception range |
| Duration (avg) | 5-10 minutes |

#### Overcast

Reduced visibility, slight combat penalty from dim conditions. No special hazards. A warning that storms may follow.

| Modifier | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 95% |
| Combat Accuracy | 90% |
| Visibility Range | 70% (0.7x) |
| Power Generation | 80% |
| Lightning Strike Chance | 0% |
| Special | Reduced perception range for all units |
| Duration (avg) | 3-8 minutes |

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
| Special | Lightning rods charge 1.5x. Unprotected units risk 25 damage. |
| Duration (avg) | 2-5 minutes |

**Lightning strike targeting:**
```
strikeTarget = random weighted selection:
  - Lightning rods (weight 10) -- absorbed harmlessly, generates power
  - Tall structures (weight 3) -- buildings take 25 damage
  - Units in open (weight 2) -- 25 damage, 1s stun
  - Cube piles > 5 (weight 1) -- top cube takes 25 damage
  - Ground (weight 5) -- cosmetic only, scorch mark
```

Lightning rods act as attractors. Having rods near your base dramatically reduces the chance of harmful strikes. This is their defensive function beyond power generation.

#### Electromagnetic Surge

The most dangerous weather state. Electronics disrupted. Hacking range doubled but also vulnerability doubled. Compass/navigation markers break. Maximum lightning rod output.

| Modifier | Value |
|----------|-------|
| Movement Speed | 60% |
| Harvest Efficiency | 50% |
| Combat Accuracy | 70% |
| Visibility Range | 30% (0.3x) |
| Power Generation | 250% |
| Lightning Strike Chance | 15% per tick |
| Lightning Damage | 35 per strike |
| Special | Hack range 2x. Hack resistance halved. Signal network disrupted (50% packet loss). Navigation markers disabled. Bot automation degrades (10% chance to ignore orders each tick). |
| Duration (avg) | 1-3 minutes |

**Strategic implications:**
- Signal Choir thrives (hack range doubled = massive offensive window)
- Iron Creed suffers least (fortification-focused, less reliant on signals)
- Volt Collective benefits from massive power surge
- All automated logistics degrade -- manual intervention needed

#### Acid Rain

Corrosive precipitation that damages exposed metal. Movement slowed by slippery surfaces. Iron and scrap iron cubes corrode faster. Only sheltered or coated assets are safe.

| Modifier | Value |
|----------|-------|
| Movement Speed | 70% |
| Harvest Efficiency | 80% (acid weakens deposits, faster extraction but lower quality) |
| Combat Accuracy | 85% |
| Visibility Range | 50% (0.5x) |
| Power Generation | 90% |
| Lightning Strike Chance | 2% |
| Acid Damage (per tick) | 0.5 HP to exposed bots |
| Cube Corrosion | Iron/scrap iron cubes lose 1 HP per minute exposed |
| Special | Rust damage to iron/scrap structures. Copper cubes develop patina (cosmetic). Titanium and silicon unaffected. |
| Duration (avg) | 2-4 minutes |

**Corrosion vulnerability by material:**

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

**Acid rain shelter:**
- Cubes under a roof (any horizontal structure 1+ blocks above) are protected
- Bots standing within 3m of any building are partially sheltered (50% damage reduction)
- Sheltered cubes take 0 acid damage
- This incentivizes building roofed storage areas -- emergent architecture

### 2.2 Weather Transition Weights

From the existing config, expanded with gameplay context:

```
From Clear:       Clear 40%, Overcast 35%, Storm 10%, EM Surge 5%, Acid Rain 10%
From Overcast:    Clear 25%, Overcast 30%, Storm 25%, EM Surge 5%, Acid Rain 15%
From Storm:       Clear 10%, Overcast 20%, Storm 30%, EM Surge 20%, Acid Rain 20%
From EM Surge:    Clear 15%, Overcast 20%, Storm 30%, EM Surge 20%, Acid Rain 15%
From Acid Rain:   Clear 20%, Overcast 25%, Storm 20%, EM Surge 10%, Acid Rain 25%
```

**Design rationale:**
- Clear is the most common single state but not majority
- Storms chain into EM surges (20% chance) -- creating "super storm" sequences
- Acid rain is somewhat persistent (25% self-transition)
- EM surges are rare from clear (5%) but common from storms (20%)

### 2.3 Storm Intensity

Storm intensity is a 0-1 value that modulates within stormy states:

```
During storm/EM surge: intensity += 0.02 per tick (reaches 1.0 in ~50 ticks)
During non-storm: intensity -= 0.01 per tick (decays over ~100 ticks)
```

Lightning strike chance is multiplied by intensity. A storm that just started has low lightning, building to full power over ~1 second.

### 2.4 Weather Forecasting

Players can see weather forecasts up to 3 transitions ahead (using signal relay + compute):

| Forecast Distance | Accuracy |
|-------------------|----------|
| Next transition | 85% |
| 2 transitions | 60% |
| 3 transitions | 40% |

This allows strategic preparation: if a storm is coming, secure cube stockpiles, charge power reserves, position bots near lightning rods.

### 2.5 Weather Effects on Patron Shipments

> **Colonization Model:** Weather affects the patron shipment system. The otter hologram communication channel degrades in bad weather, and physical cube shipments require clear conditions for optimal transfer.

| Weather | Shipment Effect | Hologram Quality |
|---------|----------------|-----------------|
| Clear | Shipments arrive/depart normally | Crystal clear |
| Overcast | Normal | Slight static |
| Storm | Shipment delayed 30 seconds | Intermittent, flickering |
| EM Surge | Shipments blocked until surge ends | Hologram offline |
| Acid Rain | Shipment cubes take corrosion damage in transit (iron/scrap only) | Distorted, yellow tint |

**Strategic implication:** Players should time their patron shipments for clear or overcast weather. Shipping during a storm delays fulfillment. Shipping during an EM surge is impossible -- if your demand deadline falls during a surge, plan ahead. This creates weather-aware logistics gameplay.

---

## 3. Processing Cycle Progression (Seasonal System)

### 3.1 Concept

The machine planet has "processing cycles" instead of biological seasons. These are planet-wide state changes driven by the planet's core machinery (lore: remnant automated systems from the original builders). Each cycle lasts 15-20 minutes of real time and shifts which resources are more abundant and which weather is more common.

### 3.2 Cycle Table

| Cycle | Duration | Weather Bias | Resource Bonus | Combat Effect | Narrative |
|-------|----------|-------------|---------------|---------------|-----------|
| **Dormant** | 15 min | Clear +20%, Storm -10% | Rock/Scrap +20% yield | Normal | Core systems idle. Calm surface. |
| **Active** | 15 min | Storm +15%, EM Surge +10% | Copper/Silicon +15% | Power generation +30% | Core systems processing. Electrical activity rises. |
| **Volatile** | 12 min | Storm +25%, Acid Rain +15% | Titanium/Carbon +20% | Movement -10%, all damage +10% | Core overheating. Planet surface destabilizes. |
| **Convergent** | 10 min | EM Surge +30%, Acid Rain +20% | Rare Earth/Gold +30% | Hack range +50%, Lightning 2x | Core systems peak. Maximum danger, maximum reward. |
| **Aftermath** | 8 min | Clear +30%, Overcast +20% | All yields +10% | Repair speed +50% | Core exhausted. Brief window of recovery. |

### 3.3 Cycle Progression

Cycles progress linearly through the game:

| Game Time | Cycle Pattern |
|-----------|--------------|
| 0-45 min | Dormant -> Active -> Dormant -> Active |
| 45-90 min | Active -> Volatile -> Active -> Volatile |
| 90-150 min | Volatile -> Convergent -> Volatile -> Aftermath |
| 150+ min | Convergent -> Aftermath -> Convergent (repeating) |

**Design rationale:** Early game is calm (Dormant) to let players learn. Mid-game introduces volatility. Late game is dangerous, rewarding skilled play with rare resource bonuses during Convergent cycles.

### 3.4 HUD Indicator

```
Bottom-left corner:
  CYCLE: ACTIVE  [||||||||----]  7:30 remaining
  NEXT: VOLATILE
```

---

## 4. Biome Types

### 4.1 Five Biomes

Each biome has distinct visual identity, primary resources, movement characteristics, and strategic significance. Biomes are generated during map creation and remain fixed.

#### 4.1.1 Rust Plains (Foundry Biome)

The default terrain. Flat, corroded ground with scattered debris. Easy to build on, easy to traverse. Most starting positions are in or near rust plains.

| Property | Value |
|----------|-------|
| Movement Speed | 100% |
| Harvest Efficiency | 100% |
| Visibility | 100% |
| Signal Bonus | 1.0x |
| Passable | Yes |
| Primary Resources | Rock (1.5x), Scrap Iron (1.3x), Gold (2.0x) |
| Secondary Resources | All others at base rate |
| Terrain Color | #8B6914 (rusty gold-brown) |
| Alien Spawn Rate | Low (0.02/tick) |
| Strategic Value | Starting territory, furnace placement, belt logistics |

**Biome-specific features:**
- Scrap piles: 2x3m clusters of salvageable debris (acts as deposit)
- Corroded machinery: non-functional ancient equipment (deconstructable for components)
- Flat terrain: optimal for belt networks (no elevation changes)

#### 4.1.2 Scrap Hills (Slag Biome)

Rolling hills of compacted industrial waste. Slower movement due to uneven terrain but rich in metals. Good defensive terrain due to elevation.

| Property | Value |
|----------|-------|
| Movement Speed | 80% |
| Harvest Efficiency | 120% |
| Visibility | 100% |
| Signal Bonus | 1.0x |
| Passable | Yes |
| Primary Resources | Titanium (1.5x), Carbon (1.3x), Rock (1.2x) |
| Secondary Resources | Scrap Iron at base rate |
| Terrain Color | #6B5B3A (dark brown-grey) |
| Alien Spawn Rate | Medium (0.03/tick) |
| Strategic Value | Titanium access, defensible hills, chokepoints between hills |

**Biome-specific features:**
- Slag mounds: 3-5m hills that provide elevation advantage (+15% combat range from high ground)
- Toxic pools: small impassable areas (0.5-2m diameter) between hills
- Narrow passes: natural chokepoints between hills, ideal for wall placement

**Height advantage combat bonus:**
```
if attacker.elevation > target.elevation:
  rangeBonus = +15% effective range
  damageBonus = +10%
if attacker.elevation < target.elevation:
  rangePenalty = -10% effective range
  accuracyPenalty = -15%
```

#### 4.1.3 Chrome Ridge (Chrome/Mountain Biome)

Steep terrain with exposed chrome and titanium veins. Difficult to traverse but highly reflective surfaces create unique visibility conditions. Premium material access.

| Property | Value |
|----------|-------|
| Movement Speed | 60% |
| Harvest Efficiency | 80% |
| Visibility | 70% (reflections cause glare) |
| Signal Bonus | 1.0x |
| Passable | Yes (mostly) |
| Primary Resources | Titanium (2.0x), Silicon (1.5x) |
| Secondary Resources | Carbon at 1.2x |
| Terrain Color | #A0A0B0 (silver-grey) |
| Alien Spawn Rate | Medium (0.03/tick) |
| Strategic Value | Premium materials, natural fortress locations, limited access points |

**Biome-specific features:**
- Cliff faces: impassable vertical terrain segments (must path around)
- Chrome deposits: exposed veins on cliff walls (harvestable at cliff base)
- Reflective surfaces: during Clear weather, visibility in chrome ridge is 130% (chrome reflects light)
- Treacherous paths: some paths between ridges are only 1 unit wide (single-file movement)

#### 4.1.4 Signal Plateau (Processor Biome)

Flat elevated plateaus studded with ancient processor towers and silicon outcrops. Excellent signal propagation. The domain of the Signal Choir.

| Property | Value |
|----------|-------|
| Movement Speed | 90% |
| Harvest Efficiency | 70% (ancient interference with harvesting equipment) |
| Visibility | 100% |
| Signal Bonus | 1.5x |
| Passable | Yes |
| Primary Resources | Silicon (1.5x), Rare Earth (2.0x), Quantum Crystal (2.0x) |
| Secondary Resources | Copper at 1.3x |
| Terrain Color | #6A5ACD (purple-blue) |
| Alien Spawn Rate | High (0.05/tick) |
| Strategic Value | Signal network hub, rare resource access, compute generation |

**Biome-specific features:**
- Processor towers: ancient structures that boost signal relay range by 2.0x when built adjacent
- Silicon fields: broad flat deposits with high yield but heavy ancient machine presence
- EM interference zones: 5m radius areas where electronics malfunction (no automation, no hacking)
- Ancient sentinel spawn points: high-value deposits always guarded

#### 4.1.5 Cable Forest (Cable Biome)

Dense terrain of tangled cables, conduits, and fallen transmission towers. The planet's ancient wiring system. Extremely slow movement but rich in copper and carbon. Signal interference from the cable mass.

| Property | Value |
|----------|-------|
| Movement Speed | 50% |
| Harvest Efficiency | 110% (cables are easy to strip) |
| Visibility | 40% (dense cable canopy) |
| Signal Bonus | 0.6x (interference) |
| Passable | Yes (barely) |
| Primary Resources | Copper (2.0x), Carbon (1.5x), Quantum Crystal (1.5x) |
| Secondary Resources | Scrap Iron at 1.2x |
| Terrain Color | #2A3A2A (dark green-black) |
| Alien Spawn Rate | High (0.05/tick) |
| Strategic Value | Copper bonanza, ambush terrain, difficult to raid |

**Biome-specific features:**
- Cable canopy: overhead cable mass blocks lightning strikes (no storm damage to units/cubes below)
- Natural traps: tangled cables can snare bots (5% chance per movement tick, 2s stuck)
- Ambush corridors: visibility so low that units can't see enemies until 5m range
- Copper veins: exposed cable bundles that yield pure copper at 2x rate

### 4.2 Biome Summary Table

| Biome | Move | Harvest | Vis | Signal | Primary Resource | Alien Rate | Strategic Role |
|-------|------|---------|-----|--------|-----------------|------------|---------------|
| Rust Plains | 100% | 100% | 100% | 1.0x | Rock, Scrap Iron | Low | Starting base, logistics |
| Scrap Hills | 80% | 120% | 100% | 1.0x | Titanium, Carbon | Medium | Defense, chokepoints |
| Chrome Ridge | 60% | 80% | 70% | 1.0x | Titanium, Silicon | Medium | Premium materials, fortress |
| Signal Plateau | 90% | 70% | 100% | 1.5x | Silicon, Rare Earth | High | Compute, rare resources |
| Cable Forest | 50% | 110% | 40% | 0.6x | Copper, Carbon | High | Ambush, copper access |

### 4.3 Biome Strategic Significance

**Chokepoints:** Scrap Hills create natural chokepoints between hills. Wall placement at chokepoints controls access to entire biome regions. Chrome Ridge has narrow passes between ridges.

**Resource clusters:** Each biome has a primary resource that spawns at 1.5-2x density. Controlling a biome = controlling that resource supply.

**Defensible positions:** Chrome Ridge and Scrap Hills are naturally defensible due to terrain. Cable Forest is defensible through obscurity (hard to navigate for raiders). Signal Plateau is exposed but compensated by signal advantage.

**Faction biome preferences:**

| Faction | Preferred Biome | Reason |
|---------|----------------|--------|
| Reclaimers | Rust Plains | Scrap abundance, easy logistics |
| Volt Collective | Scrap Hills + Rust Plains | Aggressive expansion, lightning rod placement on hills |
| Signal Choir | Signal Plateau | Signal bonus, compute generation, hacking range |
| Iron Creed | Chrome Ridge / Scrap Hills | Natural fortress, premium wall materials |

### 4.3 Alien Native Territories

> **Colonization Model:** Alien natives occupy biome regions before colonists arrive. Their territories contain unique resources unavailable elsewhere. Expanding into native territory forces the trade/fight/integrate decision.

| Biome | Native Presence | Village Density | Unique Resource |
|-------|----------------|----------------|-----------------|
| Rust Plains | Low | 1 per 50x50 area | Corroded Circuits (low value) |
| Scrap Hills | Medium | 1 per 40x40 area | Deep Slag Crystals |
| Chrome Ridge | High | 1 per 30x30 area | Resonance Ore (Signal Choir priority) |
| Signal Plateau | Very High | 1 per 25x25 area | Signal Roots (hacking material) |
| Cable Forest | Medium | 1 per 35x35 area | Living Wire (unique conductor) |

**Native territory radius:** Each village claims a 15m radius. Building within this radius triggers hostility escalation (Wary → Hostile) unless allied.

**Biome-native interaction:** Natives on their home biome receive terrain bonuses (see GDD-013 §10.3). Colonists fighting in native territory face both the native defenders AND the biome's environmental challenges.

**Colonization tension:** The richest biomes (Chrome Ridge, Signal Plateau) have the highest native density. Expanding into them means either investing in native relations (trade quests, time) or fighting through (fast, but locks out integration victory and unique resources permanently for that village).

---

## 5. Terrain Mechanics

### 5.1 Elevation Effects

The world has a heightfield terrain with 3 height layers (from config/terrain.json). Elevation affects combat, movement, and visibility.

| Elevation Difference | Movement Effect | Combat Effect | Visibility Effect |
|---------------------|----------------|---------------|-------------------|
| 0 (flat) | Normal speed | Normal | Normal |
| 1 level up (climbing) | 60% speed | +10% damage, +15% range (from high ground) | +20% range |
| 1 level down (descending) | 120% speed | -15% accuracy (shooting up) | Normal |
| 2+ levels (cliff) | Impassable (must find path around) | Cannot engage across | Blocked |

### 5.2 Slope Movement Penalties

```
movementSpeed = baseSpeed * biomeModifier * weatherModifier * slopeModifier

slopeModifier:
  flat (slope < 0.1): 1.0
  gentle (0.1 - 0.3): 0.9
  moderate (0.3 - 0.5): 0.7
  steep (0.5 - 0.7): 0.5
  cliff (> 0.7): 0.0 (impassable)
```

### 5.3 Hazard Zones

| Hazard | Visual | Effect | Locations |
|--------|--------|--------|-----------|
| Acid Pool | Bubbling green-yellow liquid | 5 damage/second to bots entering | Cable Forest, Scrap Hills |
| Magnetic Anomaly | Shimmering air distortion | Disrupts navigation (random 30-degree heading offset), disables compass | Signal Plateau |
| Thermal Vent | Orange glow from ground cracks | 10 damage/second, cubes placed on vents take 3x storm damage | Chrome Ridge |
| Rubble Field | Collapsed structures, debris | 40% movement speed, 20% chance to snag per movement tick | Rust Plains (rare), after battle |
| Sinkhole | Circular depression, cracked edges | Units falling in take 30 damage, must be retrieved by grabber | All biomes (rare, triggers near heavy mining) |

### 5.4 Buildable vs Unbuildable Terrain

| Terrain Type | Buildable? | Notes |
|-------------|-----------|-------|
| Flat ground | Yes | Standard building placement |
| Gentle slope | Yes | Buildings auto-level (cosmetic only) |
| Moderate slope | Limited | Only small structures (relays, rods, walls) |
| Steep slope | No | Nothing can be built |
| Water/acid | No | No building, no walking |
| Hazard zone | No | Must clear hazard first (costs cubes) |
| Rubble | Yes (after clearing) | Worker bot clears rubble (10s per tile) |
| Existing building | No | Must demolish first |

### 5.5 Bridges

Players can build bridges over impassable terrain:

| Bridge Type | Span | HP | Cost | Width |
|------------|------|----|----- |-------|
| Scrap Bridge | 3 units | 100 | 4x Scrap Iron | 1 unit (single-file) |
| Iron Bridge | 5 units | 250 | 6x Iron + 2x Copper | 2 units (double-wide) |
| Titanium Bridge | 8 units | 500 | 8x Titanium + 4x Iron | 3 units (full army passage) |

Bridges can be destroyed (targeting the support columns). Destroyed bridges collapse -- anything on them takes 30 damage and falls to the terrain below.

---

## 6. Weather x Biome Interaction Matrix

Weather and biome modifiers stack multiplicatively:

| Weather x Biome | Rust Plains | Scrap Hills | Chrome Ridge | Signal Plateau | Cable Forest |
|----------------|-------------|-------------|--------------|----------------|--------------|
| **Clear** | Normal | Normal | Vis 130% (reflection) | Normal | Normal |
| **Overcast** | Normal | Normal | Normal | Normal | Vis 25% (very dark) |
| **Storm** | Full exposure | Partial cover (hills) | Lightning attracted to peaks | EM equipment risk | Cable canopy protects |
| **EM Surge** | Full exposure | Full exposure | Chrome amplifies EM (2x hack range) | Signal Plateau becomes hack warzone | Signal completely blocked |
| **Acid Rain** | Iron cubes corrode | Iron cubes corrode | Chrome resists acid | Silicon unaffected | Cable canopy protects from acid |

### 6.1 Notable Interactions

**Storm + Chrome Ridge:** Chrome peaks attract lightning. Lightning strikes in Chrome Ridge are 3x more frequent. This makes Chrome Ridge dangerous during storms but excellent for power generation (place lightning rods on peaks).

**EM Surge + Signal Plateau:** The signal bonus (1.5x) combines with EM surge hack range bonus (2x) for a total 3x hack range. Signal Choir forces on Signal Plateau during EM surge can hack targets across the entire plateau. This is their ultimate power play.

**Acid Rain + Cable Forest:** The cable canopy protects from acid rain. Cable Forest becomes a safe haven during acid rain events. Factions that control Cable Forest can shelter their bots there during corrosive weather.

**Storm + Cable Forest:** Cable canopy blocks lightning. No lightning damage to anything under the canopy. Cable Forest is the safest place during storms but the hardest to navigate.

---

## 7. Environmental Hazard Events

### 7.1 Lightning Strikes (Storms)

```
strikeCheck: performed every 10 ticks during storm/EM surge
strikeChance = weatherLightningChance * stormIntensity * biomeLightningMultiplier

biomeLightningMultiplier:
  rust_plains: 1.0
  scrap_hills: 1.0
  chrome_ridge: 3.0  (chrome attracts)
  signal_plateau: 1.5
  cable_forest: 0.0  (canopy blocks)

if strike occurs:
  target = selectTarget(see section 2.1 targeting)
  damage = baseLightningDamage * stormIntensity
  apply stun (1 second) to hit unit
  cosmetic: flash, thunder sound, scorch mark
```

### 7.2 Acid Erosion (Acid Rain)

```
erosionCheck: every 60 ticks during acid_rain
for each exposed cube:
  if cube.material in ["scrap_iron", "iron", "rock", "steel"]:
    cube.hp -= acidDamage[material]
  if cube.hp <= 0:
    destroyCube(cube) // crumbles
    spawnRubble(cube.position)

for each exposed bot:
  bot.hp -= 0.5 per tick
  if bot has "rust_resistance" (Reclaimers): damage * 0.7
```

### 7.3 Sinkholes (Mining-Triggered)

Heavy mining in one area can trigger sinkholes:

```
miningDensity = cubesExtracted within 10m radius in last 300 seconds
sinkholeProbability = max(0, (miningDensity - 20) * 0.001) per tick

if sinkhole triggers:
  radius = 2-4m
  depth = 3m
  all entities in radius fall:
    damage = 30
    stuck for 5 seconds (must be grabbed out or self-climb)
  all cubes in radius fall into hole (retrievable from bottom)
  terrain permanently modified (hole remains)

warning signs (30 seconds before):
  - ground texture cracks
  - subtle rumbling sound
  - small particle dust rising
```

### 7.4 Magnetic Anomaly Storms (Signal Plateau Only)

During EM Surge weather on Signal Plateau, magnetic anomaly zones expand:

```
normalAnomalyRadius = 3m
emSurgeAnomalyRadius = 8m

effects within anomaly:
  - compass disabled (minimap rotates randomly)
  - navigation waypoints hidden
  - bot automation: 30% chance to walk wrong direction per tick
  - hacking: impossible (magnetic interference)
  - but: deposits within anomaly yield +50% rare earth
```

---

## 8. Config Changes Required

### 8.1 config/weather.json Updates

Add gameplay effect values to each weather state:

```json
{
  "states": {
    "clear": {
      "visibilityRange": 1.0,
      "movementSpeedModifier": 1.0,
      "harvestEfficiencyModifier": 1.0,
      "combatAccuracyModifier": 1.0,
      "damageModifier": 0.0,
      "powerGenerationModifier": 1.0,
      "lightningStrikeChance": 0.0,
      "cubeDamagePerMinute": 0,
      "solarBonus": 0.2
    },
    "overcast": {
      "visibilityRange": 0.7,
      "movementSpeedModifier": 1.0,
      "harvestEfficiencyModifier": 0.95,
      "combatAccuracyModifier": 0.9,
      "damageModifier": 0.0,
      "powerGenerationModifier": 0.8,
      "lightningStrikeChance": 0.0,
      "cubeDamagePerMinute": 0,
      "solarBonus": 0
    },
    "storm": {
      "visibilityRange": 0.4,
      "movementSpeedModifier": 0.8,
      "harvestEfficiencyModifier": 0.75,
      "combatAccuracyModifier": 0.8,
      "damageModifier": 0.0,
      "powerGenerationModifier": 1.5,
      "lightningStrikeChance": 0.05,
      "lightningDamage": 25,
      "cubeDamagePerMinute": 0.5,
      "solarBonus": 0
    },
    "electromagnetic_surge": {
      "visibilityRange": 0.3,
      "movementSpeedModifier": 0.6,
      "harvestEfficiencyModifier": 0.5,
      "combatAccuracyModifier": 0.7,
      "damageModifier": 0.0,
      "powerGenerationModifier": 2.5,
      "lightningStrikeChance": 0.15,
      "lightningDamage": 35,
      "hackRangeMultiplier": 2.0,
      "hackResistanceMultiplier": 0.5,
      "signalPacketLoss": 0.5,
      "automationFailChance": 0.1,
      "cubeDamagePerMinute": 1.0,
      "solarBonus": 0
    },
    "acid_rain": {
      "visibilityRange": 0.5,
      "movementSpeedModifier": 0.7,
      "harvestEfficiencyModifier": 0.8,
      "combatAccuracyModifier": 0.85,
      "damageModifier": 2.0,
      "powerGenerationModifier": 0.9,
      "lightningStrikeChance": 0.02,
      "acidDamagePerTick": 0.5,
      "cubeDamagePerMinute": 2.0,
      "acidCorrosionRates": {
        "rock": 0.5,
        "scrap_iron": 2.0,
        "iron": 1.5,
        "copper": 0.3,
        "carbon": 0,
        "silicon": 0,
        "titanium": 0,
        "steel": 0.5,
        "rare_earth": 0.2,
        "gold": 0,
        "quantum_crystal": 0
      },
      "solarBonus": 0
    }
  }
}
```

### 8.2 config/biomes.json (NEW)

```json
{
  "biomes": {
    "rust_plains": {
      "displayName": "Rust Plains",
      "moveSpeedMod": 1.0,
      "harvestMod": 1.0,
      "visibility": 1.0,
      "signalBonus": 1.0,
      "passable": true,
      "bgColor": "#8B6914",
      "lightningMultiplier": 1.0,
      "alienSpawnRate": 0.02,
      "resourceMultipliers": { "rock": 1.5, "scrap_iron": 1.3, "gold": 2.0 },
      "features": ["scrap_piles", "corroded_machinery"]
    },
    "scrap_hills": {
      "displayName": "Scrap Hills",
      "moveSpeedMod": 0.8,
      "harvestMod": 1.2,
      "visibility": 1.0,
      "signalBonus": 1.0,
      "passable": true,
      "bgColor": "#6B5B3A",
      "lightningMultiplier": 1.0,
      "alienSpawnRate": 0.03,
      "resourceMultipliers": { "titanium": 1.5, "carbon": 1.3, "rock": 1.2 },
      "features": ["slag_mounds", "toxic_pools", "narrow_passes"],
      "elevationBonus": { "rangeBonus": 0.15, "damageBonus": 0.1 }
    },
    "chrome_ridge": {
      "displayName": "Chrome Ridge",
      "moveSpeedMod": 0.6,
      "harvestMod": 0.8,
      "visibility": 0.7,
      "signalBonus": 1.0,
      "passable": true,
      "bgColor": "#A0A0B0",
      "lightningMultiplier": 3.0,
      "alienSpawnRate": 0.03,
      "resourceMultipliers": { "titanium": 2.0, "silicon": 1.5, "carbon": 1.2 },
      "features": ["cliff_faces", "chrome_deposits", "reflective_surfaces", "treacherous_paths"],
      "clearWeatherVisibilityBonus": 1.3
    },
    "signal_plateau": {
      "displayName": "Signal Plateau",
      "moveSpeedMod": 0.9,
      "harvestMod": 0.7,
      "visibility": 1.0,
      "signalBonus": 1.5,
      "passable": true,
      "bgColor": "#6A5ACD",
      "lightningMultiplier": 1.5,
      "alienSpawnRate": 0.05,
      "resourceMultipliers": { "silicon": 1.5, "rare_earth": 2.0, "quantum_crystal": 2.0, "copper": 1.3 },
      "features": ["processor_towers", "silicon_fields", "em_interference_zones", "ancient_sentinels"],
      "processorTowerSignalBonus": 2.0,
      "emInterferenceRadius": 5
    },
    "cable_forest": {
      "displayName": "Cable Forest",
      "moveSpeedMod": 0.5,
      "harvestMod": 1.1,
      "visibility": 0.4,
      "signalBonus": 0.6,
      "passable": true,
      "bgColor": "#2A3A2A",
      "lightningMultiplier": 0.0,
      "alienSpawnRate": 0.05,
      "resourceMultipliers": { "copper": 2.0, "carbon": 1.5, "quantum_crystal": 1.5, "scrap_iron": 1.2 },
      "features": ["cable_canopy", "natural_traps", "ambush_corridors"],
      "cableCanopy": { "blocksLightning": true, "blocksAcid": true },
      "snareChance": 0.05,
      "snareDurationSeconds": 2
    },
    "deep_water": {
      "displayName": "Deep Water",
      "moveSpeedMod": 0.0,
      "harvestMod": 0.0,
      "visibility": 0.3,
      "signalBonus": 0.5,
      "passable": false,
      "bgColor": "#1A1A3E",
      "lightningMultiplier": 1.0,
      "alienSpawnRate": 0,
      "resourceMultipliers": {},
      "features": []
    },
    "shallow_water": {
      "displayName": "Shallow Water",
      "moveSpeedMod": 0.4,
      "harvestMod": 0.0,
      "visibility": 0.5,
      "signalBonus": 0.8,
      "passable": true,
      "bgColor": "#2E4A6E",
      "lightningMultiplier": 2.0,
      "alienSpawnRate": 0,
      "resourceMultipliers": {},
      "features": ["conducts_lightning"]
    }
  },
  "terrain": {
    "slopeModifiers": {
      "flat": { "threshold": 0.1, "speedMod": 1.0 },
      "gentle": { "threshold": 0.3, "speedMod": 0.9 },
      "moderate": { "threshold": 0.5, "speedMod": 0.7, "buildRestricted": true },
      "steep": { "threshold": 0.7, "speedMod": 0.5, "noBuild": true },
      "cliff": { "threshold": 1.0, "speedMod": 0.0, "impassable": true }
    },
    "heightAdvantage": {
      "rangeBonus": 0.15,
      "damageBonus": 0.10,
      "rangePenalty": -0.10,
      "accuracyPenalty": -0.15
    },
    "hazards": {
      "acid_pool": { "damage": 5, "biomes": ["cable_forest", "scrap_hills"] },
      "magnetic_anomaly": { "headingOffset": 30, "biomes": ["signal_plateau"], "emSurgeRadiusMultiplier": 2.67 },
      "thermal_vent": { "damage": 10, "stormDamageMultiplier": 3, "biomes": ["chrome_ridge"] },
      "rubble_field": { "speedMod": 0.4, "snareChance": 0.2, "biomes": ["rust_plains"] },
      "sinkhole": { "damage": 30, "stuckDuration": 5, "warningDuration": 30, "miningDensityThreshold": 20 }
    },
    "bridges": {
      "scrap_bridge": { "span": 3, "hp": 100, "cost": { "scrap_iron": 4 }, "width": 1 },
      "iron_bridge": { "span": 5, "hp": 250, "cost": { "iron": 6, "copper": 2 }, "width": 2 },
      "titanium_bridge": { "span": 8, "hp": 500, "cost": { "titanium": 8, "iron": 4 }, "width": 3 }
    }
  },
  "processingCycles": {
    "dormant": { "durationMinutes": 15, "weatherBias": { "clear": 0.2, "storm": -0.1 }, "resourceBonus": { "rock": 0.2, "scrap_iron": 0.2 }, "combatMod": 1.0 },
    "active": { "durationMinutes": 15, "weatherBias": { "storm": 0.15, "electromagnetic_surge": 0.1 }, "resourceBonus": { "copper": 0.15, "silicon": 0.15 }, "powerBonus": 0.3 },
    "volatile": { "durationMinutes": 12, "weatherBias": { "storm": 0.25, "acid_rain": 0.15 }, "resourceBonus": { "titanium": 0.2, "carbon": 0.2 }, "movementPenalty": -0.1, "damageMod": 1.1 },
    "convergent": { "durationMinutes": 10, "weatherBias": { "electromagnetic_surge": 0.3, "acid_rain": 0.2 }, "resourceBonus": { "rare_earth": 0.3, "gold": 0.3 }, "hackRangeBonus": 0.5, "lightningMultiplier": 2.0 },
    "aftermath": { "durationMinutes": 8, "weatherBias": { "clear": 0.3, "overcast": 0.2 }, "resourceBonus": { "all": 0.1 }, "repairSpeedBonus": 0.5 }
  }
}
```

---

## 9. Balance Verification

### Scenario 1: "Storm damage to unprotected cube stockpile"

Player has 20 scrap iron cubes exposed during a 5-minute storm.
- Cube damage: 0.5 HP/minute during storm
- Storm duration: 5 minutes
- Total damage per cube: 2.5 HP
- Scrap iron cube HP: 50
- HP remaining: 47.5 (5% loss)
- Verdict: Annoying but not devastating. Incentivizes shelter without punishing. PASS.

### Scenario 2: "Acid rain wipes out iron stockpile?"

Player has 10 iron cubes (smelted) exposed during 4-minute acid rain.
- Iron acid corrosion: 1.5 HP/minute
- Duration: 4 minutes
- Damage: 6.0 HP per cube
- Iron cube HP: 90
- HP remaining: 84 (6.7% loss)
- Verdict: Not devastating, but repeated acid rain over 30 minutes would deal 45 HP total (50% of cube). Incentivizes shelter construction. PASS.

### Scenario 3: "Can I exploit Chrome Ridge for power?"

6 lightning rods on Chrome Ridge peaks during storm.
- Chrome Ridge lightning multiplier: 3.0x
- Storm power generation: 1.5x
- Rod output per tick: 2 (base) * 1.5 (storm) = 3.0 per rod
- 6 rods: 18 power/tick
- Normal 6 rods on Rust Plains during storm: 6 * 3.0 = 18 (same per rod)
- But lightning strike frequency is 3x on Chrome Ridge, meaning rods charge faster
- Net power: ~2x more power from Chrome Ridge rods during storms
- Trade-off: Building on Chrome Ridge is hard (60% move speed, 80% harvest)
- Verdict: Viable strategy for power-hungry factions (Volt Collective). PASS.

### Scenario 4: "Signal Choir on Signal Plateau during EM Surge"

- Base hack range: 10m
- Signal Plateau signal bonus: 1.5x (extends hack range to 15m)
- EM Surge hack range multiplier: 2.0x (extends to 30m)
- Signal Choir hack speed: 1.4x
- Signal Choir on Signal Plateau during EM Surge: 30m hack range at 1.4x speed
- Can hack targets across most of the plateau from a single position
- Counter: EM surge also halves hack resistance, so Signal Choir's own units are vulnerable
- Verdict: Extremely powerful but symmetrically risky. Creates exciting "EM surge showdown" moments. PASS.

---

## 10. Formula Reference Sheet

```
-- Movement --
effectiveSpeed = baseSpeed * biomeMoveSpeedMod * weatherMoveSpeedMod * slopeModifier * carrySpeedMod
slopeModifier = lookup(slope, slopeModifiers table)

-- Combat (terrain) --
if attacker.elevation > target.elevation:
  effectiveRange = baseRange * (1 + heightAdvantage.rangeBonus)
  effectiveDamage = baseDamage * (1 + heightAdvantage.damageBonus)
else if attacker.elevation < target.elevation:
  effectiveRange = baseRange * (1 + heightAdvantage.rangePenalty)
  hitChance = baseHitChance * (1 + heightAdvantage.accuracyPenalty)

-- Harvesting (environment) --
effectiveHarvestRate = baseRate * drillMult * oreMult * biomeHarvestMod * weatherHarvestMod * cycleBonus

-- Lightning --
strikeChance = weatherLightningChance * stormIntensity * biomeLightningMultiplier
strikeDamage = weatherLightningDamage * stormIntensity

-- Acid Erosion --
cubeErosion = acidCorrosionRate[material] * (1 if exposed, 0 if sheltered) * stormIntensity
botAcidDamage = acidDamagePerTick * (1 - reclaimerResistance)

-- Hacking (environment) --
effectiveHackRange = baseRange * biomeSignalBonus * weatherHackRangeMult
effectiveHackResistance = baseResistance * weatherHackResistanceMult * (0 if in EM interference zone)

-- Visibility --
effectiveVisibility = baseVision * biomeVisibility * weatherVisibility * (biomeSpecialVis or 1.0)

-- Sinkhole --
sinkholeProbability = max(0, (miningDensityIn10m - 20) * 0.001)
```
