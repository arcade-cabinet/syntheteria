# GDD-013: Combat System -- FPS Mechanics, Bot Armies, Hacking, Cube Raids

**Status:** Final (Colonization Pivot Applied)
**Date:** 2026-03-10
**Scope:** Complete combat design with exact stat blocks, damage formulas, raid mechanics, hacking system, cube wall defense, siege warfare, and alien native encounters

---

## 1. Design Philosophy

Combat in Syntheteria is **resource combat**. Every fight costs cubes. Cubes thrown as weapons are cubes not used for building. Bots destroyed are cubes spent on construction lost. Walls breached are cubes exposed to theft. The fundamental tension: **wealth makes you powerful but also makes you a target.**

Under the **Colonization model**, combat has an additional dimension: rival colonies are not just competing for territory -- they are competing for resources to ship home to their patrons. Raiding an enemy's cube stockpile delays their patron shipments. Destroying their supply lines cuts off their tech progression. Combat is economic warfare between colonial powers on a frontier planet.

Three distinct threat categories exist:
1. **Rival colonies** -- other robot races with their own patrons, competing for the same resources
2. **Alien natives** -- indigenous machine species, here before the colonists (trade, fight, or integrate)
3. **Ancient machines** -- dormant neutral hostiles guarding high-value deposits (boss encounters)

Combat is not the game's primary loop -- the core loop is harvest/compress/carry/build. Combat exists to create stakes for the economy, to make defense meaningful, and to enable the eXterminate pillar of the 4X.

---

## 2. Player FPS Combat

### 2.1 Player Health System

| Stat | Base Value | Notes |
|------|-----------|-------|
| Max HP | 100 | Upgradeable via Titan Armor Plate (+50) |
| HP Regen | 0.5/second | Only when out of combat (5s since last hit) |
| Armor | 0 (base) | Each armor component adds DR |
| Shield | 0 (base) | Requires power cell, regenerates |

**Damage Reduction (DR):**
```
damageTaken = rawDamage * (1 - DR)
DR = min(0.75, armorValue / 100)  // caps at 75% reduction
```

**Armor Sources:**

| Component | Armor Value | DR % | Cost |
|-----------|-------------|------|------|
| Scrap Plating | 10 | 9% | 2x Scrap Iron |
| Iron Plating | 20 | 17% | 2x Iron |
| Carbon Weave | 30 | 23% | 2x Carbon |
| Titan Armor Plate | 50 | 33% | 3x Titanium + 1x Carbon |

### 2.2 Player Weapons

#### 2.2.1 Drill Arm (Melee)

The player's starting weapon. Always available. Uses the Harvester tool offensively.

| Stat | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------|--------|--------|--------|--------|
| Damage | 8 | 15 | 25 | 40 |
| Range | 2.5m | 2.5m | 3.0m | 3.0m |
| Attack Speed | 1.2s | 1.0s | 0.8s | 0.6s |
| DPS | 6.7 | 15.0 | 31.3 | 66.7 |
| Special | -- | Pierces scrap | AoE 1m cone | Disrupts shields |

**Hit detection:** Rapier capsule cast from player position in camera forward direction, length = range, radius = 0.3m.

**Attack animation:** Camera dips 10 degrees down, arm swings across view (200ms), camera returns (100ms). Total attack animation: 300ms, cooldown fills remainder of attack speed window.

#### 2.2.2 Cube Launcher (Ranged)

Throws cubes from your stockpile. Every shot costs a cube. This is the game's signature weapon -- your ammunition is your economy.

| Stat | Value |
|------|-------|
| Range | 30m (max effective) |
| Fire Rate | 1 throw per 1.5s |
| Ammo | Cubes in grabber (auto-loads from nearby stockpile within 3m) |
| Projectile Speed | 20 m/s |
| Gravity | 0.3 (slight arc) |
| AoE | None (direct hit only) |

**Damage by Cube Material:**

| Material | Damage | Knockback | Special |
|----------|--------|-----------|---------|
| Rock | 8 | 1.0 | Shatters on impact (no recovery) |
| Scrap Iron | 15 | 1.5 | 50% chance to recover intact |
| Copper | 12 | 1.2 | Conducts -- stuns target 0.5s |
| Carbon | 18 | 1.0 | 70% chance to recover intact |
| Silicon | 10 | 0.8 | Shatters into sharp fragments (2m AoE, 3 damage) |
| Iron | 20 | 2.0 | 60% chance to recover intact |
| Titanium | 30 | 2.5 | 80% chance to recover intact |
| Steel | 25 | 2.2 | 75% chance to recover intact |
| Rare Earth | 35 | 1.5 | EMP effect -- disables electronics 2s |
| Gold | 40 | 1.8 | No special, just heavy |
| Quantum Crystal | 50 | 3.0 | Phase damage -- ignores armor |
| Advanced Alloy | 45 | 2.5 | 90% chance to recover |

**Economy tension:** A single Quantum Crystal cube (value 25.0) deals devastating damage but is irreplaceable. A stack of 5 scrap cubes (total value 5.0) deals 75 total damage and costs far less. The player must decide: throw the good stuff or save it?

**Cube recovery:** After a fight, thrown cubes that didn't shatter can be picked up from the battlefield. This encourages fighting near your base (shorter recovery walk) and creates a "looting the battlefield" phase after combat.

#### 2.2.3 Hack Beam (Sustained Channel)

A beam weapon that takes control of enemy bots. Does not damage -- converts.

| Stat | Value |
|------|-------|
| Range | 8m (base), 12m with hacking module |
| Channel Time | Varies by target (see 2.2.3.1) |
| Compute Cost | 5/second while channeling |
| Break Distance | Range + 2m (beam breaks if target moves too far) |
| Movement | Player can walk slowly (50% speed) while channeling |
| Vulnerability | Player takes 1.5x damage while channeling |

**2.2.3.1 Hack Progress by Target Type:**

| Target | Base Hack Time | Compute Cost | Faction Resistance |
|--------|---------------|-------------|-------------------|
| Feral Scout | 5s | 25 | 1.0x |
| Feral Soldier | 8s | 40 | 1.0x |
| Feral Heavy | 12s | 60 | 1.0x |
| Civ Scout | 8s | 40 | 1.5x |
| Civ Soldier | 12s | 60 | 1.5x |
| Civ Heavy | 18s | 90 | 1.5x |
| Civ Hacker | 10s | 50 | 2.0x (they resist) |
| Ancient Swarm Drone | 3s | 15 | 3.0x |
| Ancient Sentinel | 25s | 125 | 3.0x |
| Ancient Guardian | 45s | 225 | 5.0x |
| Buildings | 15s | 75 | 1.0x |

**Hack states:**
```
IDLE -> CONNECTING (0.5s warmup, beam visual appears)
     -> HACKING (progress bar fills over hack time)
     -> SUCCESS (target joins your faction)
     -> FAIL (interrupted -- progress resets to 50% of current)
```

**Faction resistance modifiers:**
- Reclaimers: 1.2x (rusty firewalls)
- Volt Collective: 1.5x (electrical interference)
- Signal Choir: 0.6x (they are strong hackers but also strong targets -- **2.0x resistance**)
- Iron Creed: 1.8x (hardened systems)

Wait -- Signal Choir's hack acceleration ability (1.4x speed) means they hack 40% faster, but they should also be HARDER to hack since they understand networks. Correction:

| Faction | Hack Speed Modifier (as attacker) | Hack Resistance (as target) |
|---------|----------------------------------|---------------------------|
| Reclaimers | 1.0x | 1.0x |
| Volt Collective | 1.0x | 1.2x |
| Signal Choir | 1.4x | 2.0x |
| Iron Creed | 0.8x | 1.5x |

### 2.3 Death and Respawn

| Event | Effect |
|-------|--------|
| Player HP reaches 0 | Bot body collapses. First-person camera detaches and floats up (death cam). |
| Cube drop | All carried cubes (in grabber) drop at death location. Lootable by anyone. |
| Powder loss | 50% of stored powder is lost. Remaining 50% persists through respawn. |
| Respawn timer | 10 seconds (reduced to 5s with Power Cell upgrade) |
| Respawn location | At base furnace (or nearest owned outpost) |
| Invulnerability | 3 seconds of spawn protection (can move, cannot attack) |
| Penalty | None beyond lost cubes and time. No XP loss, no equipment loss. |

**Death is punishing through economy, not progression.** You lose cubes and time, not levels or gear. This keeps deaths stinging without creating spiral-of-death scenarios.

---

## 3. Bot Army Combat

### 3.1 Bot Type Stat Blocks

#### Scout Bot
```
HP:         60
Damage:     5 (ranged, needle gun)
Range:      12m
Speed:      7.0 u/s
Armor:      0
Cost:       3x Scrap Iron + 1x Copper + 1x Silicon
Build Time: 20s
Special:    180-degree FOV, 2x perception range
Role:       Reconnaissance, early warning, perimeter patrol
Counter:    Weak to any combat unit. Dies fast. Value is information.
```

#### Soldier Bot
```
HP:         100
Damage:     8 (ranged, rivet gun)
Range:      10m
Speed:      5.0 u/s
Armor:      15 (13% DR)
Cost:       6x Scrap Iron + 2x Copper + 1x Silicon
Build Time: 30s
Special:    Can use cover (50% damage reduction behind walls)
Role:       General combat, garrison, patrol
Counter:    Balanced. Weak to Heavy (out-tanked) and Hacker (disabled).
```

#### Heavy Bot
```
HP:         200
Damage:     15 (ranged, siege launcher) + 5 AoE (2m radius)
Range:      8m
Speed:      3.0 u/s
Armor:      40 (29% DR)
Cost:       5x Titanium + 3x Iron + 2x Silicon
Build Time: 45s
Special:    Siege mode: immobile but 2x damage + 2x range (16m)
Role:       Siege, area denial, anti-structure
Counter:    Slow. Vulnerable to flanking Scouts and Hackers.
```

#### Hacker Bot
```
HP:         50
Damage:     3 (hack beam, non-lethal to buildings)
Range:      10m (hack beam)
Speed:      5.5 u/s
Armor:      5 (5% DR)
Cost:       3x Silicon + 2x Copper + 1x Titanium
Build Time: 35s
Special:    Can hack enemy bots (8s channel, converts target)
            Can hack enemy buildings (15s channel, disables for 30s)
Role:       Force multiplier, disabling key targets, stealing enemy units
Counter:    Fragile. Must be protected during hack channel.
```

#### Worker Bot
```
HP:         80
Damage:     4 (drill arm melee, 2.5m range)
Range:      2.5m (melee only)
Speed:      5.0 u/s
Armor:      10 (9% DR)
Cost:       4x Scrap Iron + 2x Copper
Build Time: 22s
Special:    Can harvest deposits, carry cubes, repair buildings
            Repairs at 2 HP/second, costs 1 scrap cube per 50 HP repaired
Role:       Economy, logistics, field repair
Counter:    Not a combat unit. Will fight if attacked but should flee.
```

#### Titan Bot (Endgame)
```
HP:         500
Damage:     25 (twin siege launchers) + 10 AoE (3m radius)
Range:      15m
Speed:      2.5 u/s
Armor:      60 (38% DR)
Cost:       8x Titanium + 4x Silicon + 2x Rare Earth + 1x Gold
Build Time: 120s
Special:    Cannot be hacked. Regenerates 2 HP/s. Destroys walls in 3 hits.
Role:       Endgame siege weapon, base assault, boss-level unit
Counter:    Extremely expensive. Requires massive cube investment. Multiple
            Hacker Bots can slow it (each reduces speed by 30%, stacks).
```

### 3.2 Unit Counter Matrix

| Attacker \ Target | Scout | Soldier | Heavy | Hacker | Worker | Titan |
|-------------------|-------|---------|-------|--------|--------|-------|
| Scout | Even | Loses | Loses hard | Wins (speed) | Wins | Loses |
| Soldier | Wins | Even | Loses | Even | Wins | Loses |
| Heavy | Wins | Wins | Even | Loses (hacked) | Wins | Loses |
| Hacker | Wins (hack) | Even (hack) | Wins (hack) | Even | Wins | Slows |
| Worker | Loses | Loses | Loses | Loses | Even | Loses |
| Titan | Wins | Wins | Wins | Resists | Wins | Even |

### 3.3 Time-to-Kill Analysis

**DPS calculation:** `dps = damage / attackCooldown * hitChance`

All bots have 0.8 hit chance at optimal range, decreasing to 0.4 at max range.

| Matchup | Attacker DPS | Defender HP (after DR) | TTK (seconds) |
|---------|-------------|----------------------|---------------|
| Soldier vs Scout | 6.4 | 60 | 9.4 |
| Soldier vs Soldier | 6.4 | 87 (15 armor) | 13.6 |
| Soldier vs Heavy | 6.4 | 142 (40 armor) | 22.2 |
| Heavy vs Soldier | 12.0 + 4 AoE | 87 | 5.4 |
| Heavy vs Heavy | 12.0 + 4 AoE | 142 | 8.9 |
| Scout vs Soldier | 4.0 | 87 | 21.8 |
| Hacker vs Scout | hack (5s) | -- | 5.0 (conversion) |
| Hacker vs Soldier | hack (8s) | -- | 8.0 (conversion) |
| 3 Soldiers vs Heavy | 19.2 | 142 | 7.4 |
| Titan vs Soldier | 20.0 + 8 AoE | 87 | 3.1 |
| 5 Soldiers vs Titan | 32.0 | 310 (60 armor) | 9.7 |

### 3.4 Squad AI Behavior

Bots use Yuka GOAP evaluators for decision-making. Squads (groups of 3-8 bots) share a squad leader that coordinates behavior.

**Engagement rules:**

| Condition | Behavior |
|-----------|----------|
| Enemy spotted, squad outnumbers 2:1 | Engage aggressively |
| Enemy spotted, roughly even | Engage cautiously (seek cover first) |
| Enemy spotted, squad outnumbered | Fall back to nearest defensive position |
| Squad HP below 30% average | Retreat to base for repair |
| High-value target spotted (lone worker with cubes) | Prioritize, even if outnumbered |
| Friendly building under attack | Rush to defend (all bots within 20 units) |

**Formation spacing:**
- Patrol: 3m between bots, line formation
- Combat: 5m between bots, spread formation
- Siege: 8m between bots, arc formation (heavies front, hackers back)
- Retreat: tight cluster (2m), fastest bots rear-guard

### 3.5 Veterancy System

Bots gain experience from kills and successful hacks.

| Level | Kills Required | Bonus |
|-------|---------------|-------|
| Rookie | 0 | None |
| Veteran | 3 | +10% damage, +10% HP |
| Elite | 8 | +20% damage, +20% HP, +10% speed |
| Ace | 15 | +30% damage, +30% HP, +15% speed, self-repair 0.5 HP/s |

Veteran bots have a subtle visual indicator: chevron marks on their chassis (1/2/3 chevrons).

---

## 4. Cube Raid Mechanics

### 4.1 Design Goal

Cube raids are **the most distinctive combat mechanic** in Syntheteria. Because wealth is physical (cube piles sitting in the world), enemies can steal it. This is not abstract -- you watch enemy bots grab your cubes and run away with them. This creates visceral urgency to defend.

### 4.2 AI Raid Perception

Enemy AI can "see" your cube stockpiles through Yuka Vision perception:

```
perceptionRange = baseRange * (1 + cubePileSize * 0.05)
```

| Cube Pile Size | Perception Bonus | Effective Range (base 15) |
|---------------|-----------------|--------------------------|
| 1-5 cubes | +5-25% | 15.75 - 18.75 |
| 6-15 cubes | +30-75% | 19.5 - 26.25 |
| 16-30 cubes | +80-150% | 27.0 - 37.5 |
| 31+ cubes | +155%+ | 38.25+ |

Larger cube piles are visible from further away. This drives the core strategic tension: stockpiling cubes makes you powerful but paints a target on your base.

### 4.3 Wealth-Scaled Aggression

```
aggressionScore = visibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidFrequency = baseFrequency * (1 + aggressionScore / 50)
raidStrength = baseStrength * (1 + aggressionScore / 30)
```

Per-faction aggression modifiers (applied to base frequency):

| Faction | Aggression Modifier | Preferred Raid Size | Raid Style |
|---------|--------------------|--------------------|------------|
| Reclaimers | 0.7x | Small (2-4 bots) | Steal cubes, avoid combat |
| Volt Collective | 1.5x | Large (6-10 bots) | Smash and grab, destroy walls |
| Signal Choir | 1.0x | Medium (3-6 bots) | Hack turrets first, then steal |
| Iron Creed | 0.5x | Large (6-8 bots) | Only raids when very strong |

### 4.4 Raid Behavior State Machine

```
PLANNING -> APPROACH -> ENGAGE -> LOOT -> RETREAT -> DEPOSIT
```

**PLANNING:**
- Governor evaluates raid target (see section 4.3)
- Selects composition (scouts for intel, soldiers for combat, workers for carrying)
- Assigns rally point near target base border

**APPROACH:**
- Squad moves in formation toward target
- Scouts sent ahead (range 20m) to detect turrets and patrols
- If heavy defense detected: reassess (may abort if outgunned)
- Speed: 80% normal (cautious approach)

**ENGAGE:**
- If defenders present: combat begins
- Priority targets: turrets first, then defenders, then walls
- If wall blocks path: Heavies enter siege mode, blast wall
- Duration: max 60 seconds. If wall not breached, retreat.

**LOOT:**
- Worker bots (or soldiers if no workers) run to cube stockpile
- Each bot grabs up to 2 cubes (soldiers) or 4 cubes (workers)
- Grab time: 1.5 seconds per cube
- Bots prioritize highest-value cubes first
- Bots grab and run -- they do not fight while carrying
- Maximum loot time: 30 seconds, then forced retreat

**RETREAT:**
- All bots retreat to rally point
- Fastest bots guard rear
- Dropped cubes during retreat are abandoned (lootable by anyone)
- Bots carrying cubes move at 70% speed (encumbered)
- If pursued beyond 30 units from target base: pursuers break off (too far from own base)

**DEPOSIT:**
- Stolen cubes are placed at raiding faction's base
- These cubes are now that faction's wealth
- Value added to faction's economy

### 4.5 Raid Composition by Raid Strength

| Raid Points | Scouts | Soldiers | Heavies | Hackers | Workers |
|------------|--------|----------|---------|---------|---------|
| 10-20 | 1 | 1 | 0 | 0 | 1 |
| 21-40 | 1 | 2 | 0 | 0 | 1 |
| 41-70 | 2 | 3 | 1 | 0 | 2 |
| 71-100 | 2 | 4 | 1 | 1 | 2 |
| 101-150 | 2 | 5 | 2 | 1 | 3 |
| 151-200 | 3 | 6 | 2 | 2 | 3 |
| 201+ | 3 | 8 | 3 | 2 | 4 |

### 4.6 Defense Options

| Defense | Effect | Cost | Notes |
|---------|--------|------|-------|
| Cube walls (stacked) | Blocks pathing, absorbs damage | Cubes directly | Cheapest, but cubes used as wall are cubes not in stockpile |
| Wall panels (built) | Higher HP, uniform construction | Recipe-based | Better than raw cubes, requires crafting |
| Turrets | Automated ranged defense | 3x Ti + 2x Si + 3x Cu | 2 DPS, range 12, requires power |
| Patrol bots | Mobile defense | Per-bot cost | React to threats, can pursue |
| Underground storage | Hides cubes from perception | 6x Rock + 4x Scrap | Capacity 20 cubes, invisible to raids |
| Decoy pile | Fake cubes, triggers alert | 3x Rock | Alerts player when enemy touches |
| Gates | Controllable passage | 2x Iron + 1x Copper | Auto-closes when enemies detected |
| Signal jammer | Blocks hacking in area | 3x Si + 2x RE + 1x Gold | Radius 15, prevents hack beam |

### 4.7 Anti-Raid Strategy Guide

**Tier 1 (early game, 0-15 min):**
- Stack 4-6 scrap cubes around furnace as makeshift wall
- Keep cube stockpile small (spend cubes on upgrades immediately)
- Manual defense with drill arm

**Tier 2 (mid game, 15-40 min):**
- Build proper wall panels around base perimeter
- 1-2 turrets covering approach routes
- Underground storage for valuable cubes
- 2 patrol soldiers covering perimeter
- Gate on main approach for controlled entry

**Tier 3 (late game, 40+ min):**
- Titanium walls on all sides
- 4+ turrets with overlapping fields of fire
- Signal jammer to prevent hack raids
- Decoy piles at fake locations to divert raids
- Quick reaction force (4+ soldiers) on standby
- Underground storage network for all rare materials

---

## 5. Hacking System

### 5.1 Core Mechanics

Hacking is a **sustained channel** -- the hacker must maintain line of sight and remain within range for the full duration. Interruption (damage or distance) resets progress to 50% of current.

### 5.2 Compute Resource System

```
computeGeneration = signalRelayCount * computePerRelay + computeCoreCount * 20
computeMax = 100 + signalRelayCount * 50 + computeCoreCount * 100
computeCurrent -= hackComputeCost (per second while hacking)
computeRegenRate = computeGeneration / 60 (per second)
```

| Source | Compute/minute | Max Compute Added |
|--------|---------------|-------------------|
| Signal Relay | 10 | 50 |
| Compute Core (component) | 20 | 100 |
| Signal Amplifier (building) | 30 (Signal Choir: 45) | 150 |

### 5.3 Hack Outcomes

| Outcome | When | Duration | Effect |
|---------|------|----------|--------|
| Temporary Control | Default for AI civ bots | 60 seconds | Bot fights for you, then goes rogue |
| Permanent Conversion | With Hacking Module T2 | Permanent | Bot joins your faction. Costs 2x compute. |
| System Crash | Against buildings | 30 seconds | Building disabled, sparking, no function |
| Data Theft | Against enemy furnace/fab | Instant | Reveals enemy recipes and tech level |
| Network Breach | Against signal relay | 20 seconds | Cuts signal network, all connected bots lose coordination for 20s |

### 5.4 Counter-Hacking

| Defense | Effect | Cost |
|---------|--------|------|
| Firewall (passive) | +50% hack resistance per firewall component | 2x Copper cubes per unit |
| Signal Jammer (building) | Blocks all hack attempts in radius 15 | 3x Silicon + 2x Rare Earth + 1x Gold |
| Counter-hack (active) | Player can channel hack beam at hacker to interrupt and damage compute | Requires hacking module |
| Isolated Network | Buildings without signal connection cannot be remotely hacked | Free (but lose automation bonuses) |

### 5.5 Signal Choir Hacking Bonuses

| Bonus | Value | Notes |
|-------|-------|-------|
| Hack speed multiplier | 1.4x | All hack channels 40% faster |
| Signal relay range | 1.3x | 30% more range per relay |
| Permanent hack base chance | Default (no extra compute cost) | Other factions pay 2x compute for permanent |
| Hack resistance | 2.0x | Hardest faction to hack |
| Unique: Mass Hack | Available at Tech Tier 5 | Hacks all enemy bots within 10m simultaneously (costs 200 compute, 15s channel) |

---

## 6. Cube Walls as Defense

### 6.1 Stacking Mechanics

Cubes snap to a 0.5m grid when placed near other cubes or flat ground.

```
snapDistance = 0.3m (within this distance, cube snaps to nearest grid point)
maxStackHeight = 8 cubes (4m)
unstableHeight = 6 cubes (3m) -- above this, 10% chance per tick of topple
toppleThreshold = when >50% of support cubes destroyed
```

### 6.2 Wall HP by Material

| Material | HP per Cube | HP per Wall Panel (built) | Notes |
|----------|-------------|--------------------------|-------|
| Rock | 25 | 75 (3-cube panel) | Crumbles fast |
| Scrap Iron | 50 | 150 | Cheapest useful wall |
| Copper | 40 | 120 | Conducts power (charges turrets on wall) |
| Carbon | 60 | 180 | Lightweight, doesn't topple |
| Iron (smelted) | 90 | 270 | Strong, mid-game standard |
| Silicon | 30 | 90 | Too fragile for walls |
| Titanium | 150 | 450 | Best raw material wall |
| Steel (smelted) | 200 | 600 | Best overall wall |
| Advanced Alloy | 250 | 750 | Endgame fortress |

### 6.3 Structural Collapse Physics

When a support cube is destroyed (HP reaches 0):
1. Check all cubes directly above
2. Each unsupported cube enters "falling" state
3. Falling cubes deal 10 damage to anything they land on
4. Falling cubes take 20% of their max HP as damage on impact
5. Chain collapse: if a falling cube breaks another cube's support, that cube also falls
6. Collapse animation: 0.5s per tier of height (a 4-high wall collapses over 2 seconds)
7. Rubble: destroyed cubes become rubble entities (0 value, 5 HP, can be cleared)

**Strategic implication:** Destroying the bottom cube of a tall wall causes a chain collapse that can damage attackers. This means wall design matters -- alternate materials so the bottom row is the strongest.

### 6.4 Wall Breach Mechanics

```
breachWidth = number of consecutive destroyed cubes in a row (minimum 2 cubes = 1m)
breachThreshold = 3 cubes destroyed in a row (1.5m) -- bots can path through
```

When a breach occurs:
- Pathfinding immediately recalculates for all nearby bots
- Defender alert: "WALL BREACHED at [location]" notification
- Breach visual: rubble, sparks, dust cloud
- Repair cost: same cubes as original wall, placed manually or by worker bot

### 6.5 Gate Buildings

| Stat | Value |
|------|-------|
| HP | 200 |
| Width | 1.5m (3 cubes) |
| Open speed | 1 second |
| Close speed | 0.5 second (faster for emergency) |
| Auto-close | When enemy detected within 15m |
| Power | 1 (required for auto-close) |
| Cost | 2x Iron + 1x Copper |

Gates allow friendly units and the player to pass through walls without creating a permanent breach.

---

## 7. Damage to Structures

### 7.1 Building Damage

All buildings (furnaces, miners, smelters, etc.) have HP and can be damaged by raids.

| Building | HP | Repair Cost (per 50 HP) |
|----------|----|-----------------------|
| Furnace (starter) | 200 | 2x Scrap Iron |
| Miner | 150 | 1x Scrap Iron |
| Smelter | 200 | 2x Scrap Iron + 1x Carbon |
| Refiner | 200 | 1x Silicon + 1x Copper |
| Fabrication Unit | 250 | 2x Iron + 1x Silicon |
| Lightning Rod | 100 | 1x Copper |
| Signal Relay | 80 | 1x Copper |
| Belt Segment | 50 | 1x Scrap Iron |
| Turret | 400 | 2x Titanium + 1x Silicon |
| Outpost Core | 500 | 3x Iron + 2x Silicon |

### 7.2 Damage States

| HP Remaining | State | Visual | Effect |
|-------------|-------|--------|--------|
| 100-76% | Healthy | Normal | Full function |
| 75-51% | Damaged | Sparks, dents | 80% efficiency |
| 50-26% | Critical | Heavy damage, smoke | 50% efficiency |
| 25-1% | Failing | Flames, structural buckling | 20% efficiency, may shut down |
| 0% | Destroyed | Rubble + explosion | Gone. Drops 30% of build cost as cubes |

### 7.3 Repair Mechanics

- Player can repair by standing within 3m and holding interact (3s per repair tick)
- Worker bots auto-repair buildings in their patrol zone
- Each repair tick restores 50 HP
- Each repair tick consumes repair materials (see table above)
- Cannot repair while building is under attack (must clear enemies first)

---

## 8. Siege Warfare and Base Destruction

The Base Agency architecture (see GDD-012 §7.4) means each settlement is an autonomous agent with its own event bus, work queues, furnace capacity, and bot roster. This creates distinct combat implications: attacking a base is not just destroying buildings — it is severing an autonomous command node.

### 8.1 Base Destruction Consequences

When an Outpost Core reaches 0 HP, the base is **destroyed**. This triggers a cascade:

| Event | Timing | Effect |
|-------|--------|--------|
| Outpost Core explodes | t=0 | 30 damage in 5m radius. Drops 30% build cost as cubes. |
| Event bus goes offline | t=0 | All bots assigned to this base lose their work queue. |
| Bot coordination loss | t=0 to t+5s | Affected bots enter CONFUSED state for 5 seconds. |
| Phone-home reassignment | t+5s | Bots query nearest surviving allied base for new assignment. |
| Orphaned bots | t+5s | If no allied base within `phoneHomeRadius` (50m), bots enter FERAL state. |
| Local buildings shut down | t+3s | Furnaces, miners, smelters with no base lose power routing. Halt at current state. |

**Bot states after base loss:**

| State | Behavior | Duration |
|-------|----------|----------|
| CONFUSED | Stops current action, spins in place, sparks VFX | 5 seconds |
| REASSIGNING | Moves toward nearest allied base at 50% speed | Until arrival or timeout (30s) |
| FERAL | Wanders randomly, attacks anything within 5m | Permanent until captured or destroyed |

**Strategic implication:** Destroying a base deep in enemy territory creates a pocket of feral bots that attack everyone — including your own units passing through. Plan your assault routes accordingly.

### 8.2 Supply Line Interdiction

Bases share resources via inter-base transport (belt networks and convoy bots). Cutting these supply lines is a key siege tactic.

#### Belt Destruction

| Target | HP | Effect When Destroyed |
|--------|----|-----------------------|
| Belt segment | 50 | 1m gap in transport line. Cubes pile up at break point. |
| Belt junction | 75 | All connected belt branches halt. |
| Power wire | 30 | Downstream buildings lose power. |

**Cascade failure:** When 3+ consecutive belt segments are destroyed, the entire belt line enters BROKEN state. All cubes on the line stop moving. Worker bots must repair segments sequentially from the source end.

```
supplyLineIntegrity = connectedSegments / totalSegments
if supplyLineIntegrity < 0.7:
    throughput = throughput * supplyLineIntegrity  // degraded mode
if supplyLineIntegrity < 0.3:
    throughput = 0  // line considered severed
```

#### Convoy Ambush

Worker bots carrying cubes between bases follow predictable paths. Intercepting them is efficient raiding:

| Stat | Value |
|------|-------|
| Convoy worker HP | 80 |
| Cubes carried per worker | 4 |
| Convoy escort (if any) | 1 soldier per 3 workers |
| Dropped cubes on kill | 100% of carried cubes |
| Convoy frequency | 1 per 30 seconds (scales with demand) |

**Ambush bonus:** Attacking a convoy from within 5m before they detect you grants a 2-second stun on all convoy members (surprise attack). This encourages stealth-oriented play and rewards scouting enemy supply routes.

### 8.3 Siege Strategy Phases

A full siege follows four phases. AI governors execute these phases based on their faction bias; players can follow or improvise.

#### Phase 1: Isolate (Cut Supply Lines)

| Action | Units Used | Goal |
|--------|-----------|------|
| Destroy belt connections | 2-3 soldiers | Sever automated cube transport |
| Ambush convoys | 1 hacker + 2 scouts | Steal cubes in transit, deny reinforcement |
| Jam signal relays | 1 hacker | Reduce base's perception radius by 50% |
| Block road approaches | Workers + cubes | Place cube barriers on convoy paths |

**Isolation check:** A base is considered **isolated** when:
```
isolationScore = (
    (severedBeltLines / totalBeltLines) * 0.4 +
    (destroyedRelays / totalRelays) * 0.3 +
    (blockedConvoyRoutes / totalConvoyRoutes) * 0.3
)
// Isolated when isolationScore >= 0.7
```

AI governor triggers Phase 2 when `isolationScore >= 0.7` and at least 60 seconds have elapsed.

#### Phase 2: Soften (Bombardment)

| Action | Units Used | Goal |
|--------|-----------|------|
| Heavy bombardment of walls | 2+ heavies | Breach outer defenses |
| Turret suppression | Soldiers at max range | Keep turrets targeting soldiers, not heavies |
| Hacking turrets | 1-2 hackers from cover | Convert turrets to attack defenders |
| Cube launcher barrage | Player or specialized bot | Damage buildings behind walls |

**Siege damage bonus:** Heavy bots deal `2x damage` to buildings and walls (see `siegeDamageMultiplier` in config). They also have `2x range` against stationary targets (`siegeRangeMultiplier`).

**Duration target:** 60-120 seconds of bombardment before breach, depending on wall material and turret count.

#### Phase 3: Breach and Assault

| Action | Units Used | Goal |
|--------|-----------|------|
| Rush through wall breach | All combat units | Enter base perimeter |
| Priority target: Outpost Core | Heavies + soldiers | Destroy command structure |
| Secondary target: Furnaces | Soldiers | Cripple production |
| Suppress defenders | All | Prevent repair attempts |

**Breach assault formation:**
```
heavies → front rank (absorb turret fire)
soldiers → second rank (DPS on core)
hackers → flanks (hack buildings during chaos)
workers → rear (ready to grab cubes)
```

#### Phase 4: Loot

| Action | Units Used | Goal |
|--------|-----------|------|
| Grab cube stockpile | Workers + soldiers | Primary economic objective |
| Salvage building drops | Workers | Collect dropped materials from destroyed buildings |
| Capture hacked buildings | Hackers | Optional: steal infrastructure instead of destroying |
| Retreat with loot | All | Encumbered units retreat to rally point |

**Loot priority order:** Workers grab highest-value cubes first (quantum crystal > gold > rare earth > titanium > ...).

**Retreat timer:** `maxLootTimeSeconds = 30` (from raid config). After 30 seconds of looting, all units retreat regardless of remaining cubes.

### 8.4 Base Defense Priority Scaling

A base's defense posture scales dynamically with its stockpile value. More cubes = more patrols = harder to raid.

```
stockpileValue = sum(cube.materialValue for cube in base.stockpile)

defensePriority = clamp(stockpileValue / 100, 0.2, 1.0)

patrolBots = floor(base.totalBots * defensePriority * 0.4)
// Minimum 1 patrol bot if stockpileValue > 0

patrolRadius = base.claimRadius * (0.5 + defensePriority * 0.5)
// Low value: patrol close. High value: patrol wide.

alertLevel = 0  // calm
if recentAttack (within 120s): alertLevel = 1  // heightened
if activeAttack: alertLevel = 2  // combat

alertMultiplier = [1.0, 1.5, 2.0][alertLevel]
effectivePatrolBots = min(base.totalBots * 0.8, patrolBots * alertMultiplier)
// Never commit more than 80% of bots to defense — need workers
```

| Stockpile Value | Defense Priority | Patrol Bots (10 total) | Patrol Radius |
|----------------|-----------------|----------------------|---------------|
| 0-20 | 0.2 | 1 | 60% of claim |
| 50 | 0.5 | 2 | 75% of claim |
| 100 | 1.0 | 4 | 100% of claim |
| 100 (heightened) | 1.0 | 6 | 100% of claim |
| 100 (active combat) | 1.0 | 8 | 100% of claim |

**Cube visibility range:** Stockpiles are visible from a distance proportional to their size:
```
visibilityRange = 10 + sqrt(stockpileValue) * 2
// 10 cubes (value ~30): visible from 21m
// 50 cubes (value ~150): visible from 34m
// 100 cubes (value ~300): visible from 44m
```

This creates a natural tension: hoarding cubes makes you a bigger target, but spending them weakens your economy. The optimal strategy depends on your defensive capability and neighbor aggression.

### 8.5 Siege Warfare Config Spec

```json
{
  "siege": {
    "baseDestruction": {
      "coreExplosionRadius": 5,
      "coreExplosionDamage": 30,
      "coreMaterialDropPercent": 0.3,
      "botConfusedDurationSeconds": 5,
      "botReassignmentTimeoutSeconds": 30,
      "phoneHomeRadius": 50,
      "feralAttackRange": 5,
      "buildingShutdownDelaySeconds": 3
    },
    "supplyLines": {
      "cascadeFailureThreshold": 3,
      "degradedThroughputThreshold": 0.7,
      "severedThroughputThreshold": 0.3,
      "convoyEscortRatio": 3,
      "convoyFrequencySeconds": 30,
      "ambushStunDurationSeconds": 2,
      "ambushDetectionRange": 5,
      "convoyDropPercent": 1.0
    },
    "isolation": {
      "beltWeight": 0.4,
      "relayWeight": 0.3,
      "convoyWeight": 0.3,
      "isolatedThreshold": 0.7,
      "minIsolationTimeSeconds": 60
    },
    "bombardment": {
      "minDurationSeconds": 60,
      "maxDurationSeconds": 120,
      "heavySiegeDamageMultiplier": 2.0,
      "heavySiegeRangeMultiplier": 2.0
    },
    "defense": {
      "minDefensePriority": 0.2,
      "maxDefensePriority": 1.0,
      "defenseValueDivisor": 100,
      "maxDefenseAllocation": 0.8,
      "patrolRadiusMin": 0.5,
      "patrolRadiusMax": 1.0,
      "alertLevelMultipliers": [1.0, 1.5, 2.0],
      "recentAttackWindowSeconds": 120,
      "cubeVisibilityBase": 10,
      "cubeVisibilityScaleFactor": 2
    },
    "loot": {
      "priorityOrder": ["quantum_crystal", "gold", "rare_earth", "titanium", "advanced_alloy", "steel", "iron", "silicon", "copper", "carbon", "scrap_iron", "rock"]
    }
  }
}
```

---

## 9. Faction-Specific Combat Bonuses

| Faction | Combat Bonus | Details |
|---------|-------------|---------|
| Reclaimers | Scrap Recovery | Destroyed enemies drop 50% more scrap. Repair costs reduced 20%. |
| Volt Collective | Shock Weapons | 15% chance to stun on hit (3 ticks). Tesla Coil unique building. |
| Signal Choir | Hack Acceleration | 40% faster hacking. Mass Hack ability at Tier 5. |
| Iron Creed | Fortification | Wall HP +40%. Units behind walls deal +20% damage. |

### 9.1 Faction Unique Units in Combat

| Unit | Faction | HP | Damage | Speed | Special |
|------|---------|----|---------| ------|---------|
| Scrounger Bot | Reclaimers | 70 | 4 | 7.5 | Auto-scavenges kills for scrap |
| Shock Trooper | Volt Collective | 120 | 10 + 5 AoE (3m) | 4.0 | Lightning chain attack |
| Infiltrator Bot | Signal Choir | 50 | 3 | 6.0 | Cloaks for 30s, hacks while cloaked |
| Bastion Bot | Iron Creed | 160 | 8 (mobile) / 15 (deployed) | 2.5 / 0 | Deploys into stationary turret |

---

## 10. Alien Native Encounters

> **Colonization Model:** Alien natives are the indigenous machine species of the planet. They were here before any colonist arrived. They are NOT colonists and do NOT compete for home planet patron favor. Their relationship with each colony creates a distinct strategic layer.

Alien natives occupy territory that colonists want. The player chooses: trade, fight, or integrate. Each approach has combat implications.

### 10.1 Native Combat Profile

| Stat | Value | Notes |
|------|-------|-------|
| Native Warrior HP | 90 | Tougher than scouts, weaker than soldiers |
| Native Warrior Damage | 6 | Moderate |
| Native Warrior Speed | 5.5 | Fast on their own terrain |
| Native Warrior Range | 3m (melee) | Close-quarters fighters |
| Native Elder HP | 200 | Non-combatant unless provoked |
| Native Swarm Size | 4-8 warriors | Per village encounter |
| Aggro Radius | 8m | Will warn before attacking |
| Warning Phase | 3 seconds | Natives posture and flash warning signals before attack |

### 10.2 Native Hostility Levels

| Level | Trigger | Behavior |
|-------|---------|----------|
| Peaceful | Default, or after successful trade | Ignore colonists. Will not attack. |
| Wary | Colonist enters native territory | Warning display (3s). Retreat if colonist backs off. |
| Hostile | Colonist attacks native, or steals from village | Attack on sight. Raid nearby colonial bases. |
| Allied | Integration quest completed | Fight alongside colonists. Provide unique resources. |

**Hostility is per-colony, not global.** Reclaimers can be allied with natives while Volt Collective is hostile. Natives remember which faction wronged them.

### 10.3 Native Combat Behavior

Natives fight differently from colonial bots:
- **Swarm tactics:** Always attack in groups of 4-8. Never alone.
- **Terrain advantage:** +30% speed and +20% damage on their home terrain.
- **Hit-and-run:** Attack for 10 seconds, then retreat 15m, then re-engage.
- **Will not chase:** Break pursuit after 30m from their village.
- **Target priority:** Attack the nearest colonist or bot. Do not prioritize buildings.

### 10.4 Native Village Raiding

Attacking a native village is high-risk, high-reward:

| Village Type | Warriors | Loot | Hostility Cost |
|-------------|----------|------|----------------|
| Scout Camp | 4 | 5x mixed cubes, 2x unique native material | Wary → Hostile |
| Settlement | 6 | 12x mixed cubes, 5x unique, 1x rare artifact | Permanent Hostile |
| Elder Village | 8 + Elder | 20x mixed cubes, 10x unique, 1x elder artifact | Permanent Hostile, all natives on map turn hostile |

**Unique native materials** are not available from deposits or patrons. They are required for certain late-game recipes and the Integration victory path. Raiding gets you the materials but locks you out of integration.

### 10.5 Integration Path (Combat Implications)

Choosing to ally with natives provides combat advantages:

| Benefit | Effect |
|---------|--------|
| Native patrols | 2 native warriors patrol your territory perimeter (free defense) |
| Warning network | Natives alert you to incoming raids 30 seconds early |
| Terrain knowledge | Fog of war lifted in native territories |
| Joint assault | Can request native war party (6 warriors) for one assault per 10 min |
| Unique recipes | Access to native-only buildings (Signal Vine, Root Network) |

**Cost:** Must complete 3 trade quests before integration is offered. Each quest requires shipping specific cube types to a native village (NOT to patron -- this creates a three-way resource tension).

---

## 11. Ancient Machine Combat

Ancient machines are neutral hostiles that guard high-value deposits. They do not participate in faction warfare or native politics.

### 11.1 Ancient Machine Types

| Type | HP | Damage | Range | Speed | Location | Loot |
|------|----|---------| ------| ------| ---------|------|
| Swarm Drone | 30 | 1 | 4m | 4.0 | Near quantum crystal | 2x eWaste, 10% quantum crystal shard |
| Sentinel | 200 | 5 | 20m | 0 (stationary) | Near gold/rare earth deposits | 10x scrap, 10x eWaste, 3x intactComp, 1x gold |
| Guardian | 500 | 10 | 12m | 1.0 | Near quantum crystal | 30x scrap, 15x eWaste, 5x intactComp, 3x rare earth |
| Colossus | 1500 | 30 + 15 AoE (5m) | 15m | 0.5 | Planet core access | Victory-tier loot: 5x quantum crystal, 10x rare earth |

### 11.2 Awaken Trigger

Ancient machines are dormant until a unit enters their trigger radius:

| Type | Trigger Radius | Awaken Condition |
|------|---------------|-----------------|
| Swarm | 10m | Always (swarm of 8) |
| Sentinel | 10m | Always (single) |
| Guardian | 15m | Player tech level >= 3 |
| Colossus | 20m | Player tech level >= 5, only after game minute 60 |

### 11.3 Boss Fight: Guardian

**Phase 1 (100-51% HP):** Standard ranged attacks, 1.0 speed, turns slowly.
- Weakness: Circle-strafe to stay behind it (90-degree turn speed per second)
- Attack pattern: 3 shots, 2s pause, 3 shots

**Phase 2 (50-26% HP):** Enters enraged state. Speed increases to 2.0. AoE ground slam every 8 seconds (10m radius, 15 damage).
- Weakness: Ground slam has 1.5s telegraph (red circle on ground). Jump or run.

**Phase 3 (25-0% HP):** Spawns 4 swarm drones. Self-repair 3 HP/s for 10 seconds (one time only).
- Strategy: Kill drones first (they heal the Guardian if alive), then burst damage.

---

## 12. Combat Balance Parameters (config/combat.json updates)

```json
{
  "playerCombat": {
    "maxHP": 100,
    "hpRegenPerSecond": 0.5,
    "outOfCombatDelay": 5.0,
    "maxArmorDR": 0.75,
    "deathCubeDropAll": true,
    "deathPowderLossPercent": 0.5,
    "respawnTimerSeconds": 10,
    "spawnProtectionSeconds": 3,
    "drillArm": {
      "tiers": {
        "1": { "damage": 8, "range": 2.5, "cooldown": 1.2 },
        "2": { "damage": 15, "range": 2.5, "cooldown": 1.0 },
        "3": { "damage": 25, "range": 3.0, "cooldown": 0.8 },
        "4": { "damage": 40, "range": 3.0, "cooldown": 0.6 }
      }
    },
    "cubeLauncher": {
      "range": 30,
      "cooldown": 1.5,
      "projectileSpeed": 20,
      "gravity": 0.3,
      "autoLoadRange": 3.0,
      "materialDamage": {
        "rock": { "damage": 8, "knockback": 1.0, "recovery": 0, "special": "shatter" },
        "scrap_iron": { "damage": 15, "knockback": 1.5, "recovery": 0.5, "special": null },
        "copper": { "damage": 12, "knockback": 1.2, "recovery": 0.4, "special": "stun_0.5s" },
        "carbon": { "damage": 18, "knockback": 1.0, "recovery": 0.7, "special": null },
        "silicon": { "damage": 10, "knockback": 0.8, "recovery": 0, "special": "shatter_aoe_2m_3dmg" },
        "iron": { "damage": 20, "knockback": 2.0, "recovery": 0.6, "special": null },
        "titanium": { "damage": 30, "knockback": 2.5, "recovery": 0.8, "special": null },
        "steel": { "damage": 25, "knockback": 2.2, "recovery": 0.75, "special": null },
        "rare_earth": { "damage": 35, "knockback": 1.5, "recovery": 0.3, "special": "emp_2s" },
        "gold": { "damage": 40, "knockback": 1.8, "recovery": 0.5, "special": null },
        "quantum_crystal": { "damage": 50, "knockback": 3.0, "recovery": 0, "special": "phase_ignores_armor" },
        "advanced_alloy": { "damage": 45, "knockback": 2.5, "recovery": 0.9, "special": null }
      }
    },
    "hackBeam": {
      "baseRange": 8,
      "moduleRange": 12,
      "computePerSecond": 5,
      "breakDistance": 2,
      "movementSpeedWhileHacking": 0.5,
      "damageMultiplierWhileHacking": 1.5,
      "interruptProgressReset": 0.5
    }
  },
  "botTypes": {
    "scout": { "hp": 60, "damage": 5, "range": 12, "speed": 7.0, "armor": 0, "fov": 180, "perceptionRange": 30 },
    "soldier": { "hp": 100, "damage": 8, "range": 10, "speed": 5.0, "armor": 15, "fov": 120, "perceptionRange": 15 },
    "heavy": { "hp": 200, "damage": 15, "range": 8, "speed": 3.0, "armor": 40, "fov": 90, "perceptionRange": 15, "siegeDamageMultiplier": 2.0, "siegeRangeMultiplier": 2.0 },
    "hacker": { "hp": 50, "damage": 3, "range": 10, "speed": 5.5, "armor": 5, "hackTime": 8, "buildingHackTime": 15 },
    "worker": { "hp": 80, "damage": 4, "range": 2.5, "speed": 5.0, "armor": 10, "carryCapacity": 4, "repairRate": 2 },
    "titan": { "hp": 500, "damage": 25, "range": 15, "speed": 2.5, "armor": 60, "aoeRadius": 3, "unhackable": true, "regenPerSecond": 2 }
  },
  "veterancy": {
    "levels": {
      "rookie": { "kills": 0, "damageBonus": 0, "hpBonus": 0, "speedBonus": 0 },
      "veteran": { "kills": 3, "damageBonus": 0.1, "hpBonus": 0.1, "speedBonus": 0 },
      "elite": { "kills": 8, "damageBonus": 0.2, "hpBonus": 0.2, "speedBonus": 0.1 },
      "ace": { "kills": 15, "damageBonus": 0.3, "hpBonus": 0.3, "speedBonus": 0.15, "selfRepair": 0.5 }
    }
  },
  "raid": {
    "maxLootTimeSeconds": 30,
    "maxEngageTimeSeconds": 60,
    "cubesPerGrabSoldier": 2,
    "cubesPerGrabWorker": 4,
    "grabTimePerCube": 1.5,
    "encumberedSpeedMultiplier": 0.7,
    "pursuitBreakoffDistance": 30,
    "rallyPointDistance": 15,
    "abortDefenseThreshold": 0.6
  },
  "walls": {
    "snapGridSize": 0.5,
    "maxStackHeight": 8,
    "unstableHeight": 6,
    "toppleChancePerTick": 0.1,
    "toppleThreshold": 0.5,
    "breachMinWidth": 3,
    "fallingCubeDamage": 10,
    "fallingCubeSelfDamagePercent": 0.2,
    "collapseTimePerTier": 0.5,
    "rubbleHP": 5,
    "rubbleValue": 0
  },
  "alienNatives": {
    "warrior": { "hp": 90, "damage": 6, "range": 3, "speed": 5.5, "swarmSize": [4, 8] },
    "elder": { "hp": 200, "damage": 0, "speed": 2.0, "nonCombatant": true },
    "aggroRadius": 8,
    "warningPhaseSeconds": 3,
    "terrainSpeedBonus": 0.3,
    "terrainDamageBonus": 0.2,
    "engageDurationSeconds": 10,
    "retreatDistanceM": 15,
    "maxPursuitDistanceM": 30,
    "hostilityLevels": ["peaceful", "wary", "hostile", "allied"],
    "villages": {
      "scoutCamp": { "warriors": 4, "cubesLoot": 5, "uniqueLoot": 2 },
      "settlement": { "warriors": 6, "cubesLoot": 12, "uniqueLoot": 5, "rareLoot": 1 },
      "elderVillage": { "warriors": 8, "cubesLoot": 20, "uniqueLoot": 10, "rareLoot": 1, "hasElder": true }
    },
    "integration": {
      "tradeQuestsRequired": 3,
      "patrolWarriors": 2,
      "raidWarningLeadSeconds": 30,
      "warPartySize": 6,
      "warPartyCooldownSeconds": 600
    }
  }
}
```

---

## 13. Formula Reference Sheet

```
-- Player Damage --
drillDPS = drillDamage / drillCooldown
cubeDamage = materialDamage[cubeType] * (1 if no special, ignore armor if phase)
hackProgress = (1 / hackTime) * hackSpeedModifier / factionResistance (per second)

-- Damage Reduction --
damageTaken = rawDamage * (1 - min(0.75, armorValue / 100))

-- Bot Combat --
effectiveDPS = baseDamage / attackCooldown * hitChance * (1 + veterancyDamageBonus)
effectiveHP = baseHP * (1 + veterancyHPBonus) / (1 - DR)
timeToKill = effectiveHP / attackerEffectiveDPS

-- Raid Scaling --
raidPoints = visibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidInterval = max(120, 600 - raidPoints * 2)
maxRaiders = min(15, floor(raidPoints / 15))
cubePerceptionBonus = cubePileSize * 0.05

-- Wall Integrity --
wallBreached = consecutiveDestroyedCubes >= 3
collapseCheck = supportCubesRemaining / totalSupportCubes < 0.5
collapseTime = stackHeight * 0.5 seconds

-- Hacking --
totalComputeCost = hackTimeSeconds * computePerSecond
hackEffectiveTime = baseHackTime * factionResistance / attackerHackSpeedModifier
computeRegenRate = (relays * 10 + cores * 20 + amplifiers * 30) / 60

-- Siege Warfare --
isolationScore = (severedBelts/totalBelts)*0.4 + (destroyedRelays/totalRelays)*0.3 + (blockedConvoys/totalConvoys)*0.3
baseIsolated = isolationScore >= 0.7
supplyLineIntegrity = connectedSegments / totalSegments
supplyThroughput = if integrity < 0.3 then 0 else if integrity < 0.7 then throughput * integrity else throughput

-- Base Defense Scaling --
defensePriority = clamp(stockpileValue / 100, 0.2, 1.0)
patrolBots = floor(totalBots * defensePriority * 0.4)
patrolRadius = claimRadius * (0.5 + defensePriority * 0.5)
effectivePatrolBots = min(totalBots * 0.8, patrolBots * alertMultiplier[alertLevel])
cubeVisibilityRange = 10 + sqrt(stockpileValue) * 2

-- Alien Natives --
nativeEffectiveDamage = baseDamage * (1 + terrainDamageBonus * isHomeTerrain)
nativeEffectiveSpeed = baseSpeed * (1 + terrainSpeedBonus * isHomeTerrain)
nativeHostilityEscalation = attack → hostile (permanent per-faction)
integrationCost = 3 trade quests * questCubeValue
```
