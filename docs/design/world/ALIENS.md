# Alien Natives -- The Ferrovores and the Living Planet

> **Status:** Authoritative
> **Source:** GDD-008-alien-natives.md
> **Scope:** Everything about indigenous life on Ferrathis -- Ferrovore biology, hive
> mechanics, unit types, threat scaling, relationship system, Residual ecosystem,
> faction-specific native policies, and the Integration Victory path.

---

## Design Philosophy

The planet was here first.

Every ore vein the player grinds, every cube compressed, every furnace fired -- all of
it happens on land that belongs to something else. The Ferrovores are not enemies by
default. They are not monsters spawned for the player to kill. They are a four-billion-year-old
species whose home is being mined by strangers.

This distinction shapes every design decision about native life on Ferrathis:

- **Natives are not opponents.** They have no home planet patron. They have no colonial
  agenda. They have no victory condition. They live here.
- **Natives react to colonist behavior.** Wealth attracts them. Industry disturbs them.
  Violence provokes them. Respect earns tolerance.
- **Natives are a strategic variable, not a strategic enemy.** Each robot race's patron
  has a different policy toward the Ferrovores. These patron attitudes -- study, exterminate,
  communicate, fortify -- shape how each faction interacts with native life.
- **Natives can be exploited by all factions.** Tamed packs, redirected raids, crystal
  harvesting, and Ferrovore Bait are all tools colonists wield against each other. The
  indigenous population becomes a resource. Uncomfortable. Thematic. Mechanically deep.

The player should feel, at some point, that the Ferrovores are not the problem.
The colonists are.

---

## What Are the Ferrovores?

Silicon-based metallivorous organisms. Living creatures made of crystallized metal lattices
that eat refined metal. Not machines. Not organic in the carbon-based sense. Something
else entirely: biological entities whose cells are metal-oxide crystals, whose nervous
system is piezoelectric impulse, whose metabolism is rust.

They were here billions of years before the colony ship arrived.

| Design Goal | How Ferrovores Achieve It |
|-------------|--------------------------|
| Feel alien to mechanical robots | Silicon crystal biology, not metal construction |
| Were here first | Built the "ruins" the robots are scavenging |
| Scale with player wealth | They eat metal -- bigger cube piles = more attractive food source |
| Spawn from unexplored territory | Hives are in deep/unexplored zones |
| Not just combat obstacles | Can be negotiated with, studied, domesticated |
| Visually distinct from all robot races | Organic crystalline forms, bioluminescence, no panels/bolts/chrome |
| Colonization model: indigenous population | No patron, no home planet, no colonial agenda -- they ARE the "New World" |

### The Core Tension

The Ferrovores do not want to destroy the robot colonists. They want to eat their cubes.
A pile of perfectly compressed, refined metal cubes is an irresistible feast. This creates
the game's most important emergent behavior: your wealth attracts predators. The more cubes
you have, the more Ferrovores come to feed.

This is the RimWorld wealth-scaling mechanic made physical and thematic. In RimWorld,
raiders attack bigger colonies because "they heard about your wealth." In Syntheteria,
Ferrovores attack bigger cube piles because they can smell the refined metal.

### Intelligence

Individual Ferrovores are about as smart as wolves -- spatial reasoning, pack coordination,
primitive tool use. But Ferrovore hives develop emergent intelligence: when enough Ferrovores
are connected through their piezoelectric nervous networks, the hive begins to think. A
small hive (5-10) is cunning. A large hive (50+) is genuinely sapient -- capable of
planning sieges, setting ambushes, and primitive communication with non-Ferrovore entities.

They do not speak. They communicate through ground vibrations, electromagnetic pulses, and
bioluminescent patterns. Robot colonists can learn to interpret these signals, potentially
opening diplomatic channels.

### Motivation

Ferrovores want three things:

1. **Metal** -- they eat it, build with it, reproduce using it
2. **Territory** -- hive expansion requires surface area for crystalline neural networks
3. **Quiet** -- industrial vibrations from mining and furnaces disturb deep-sleepers,
   generating aggression proportional to industrial activity

They are not evil. They are not mindless. They are a hungry, territorial, ancient species
that just woke up to find strangers mining their planet.

---

## Planetary History

The planet's geological record tells a story in layers. Every stratum reveals a different
era of intelligence, and the colonists are the least prepared wave to walk its surface.

### Era 1: Ferrovore Genesis (4 billion years ago)

Iron-sulfide crystal structures self-replicated in volcanic vents of a young reducing
atmosphere rich in iron oxide, silicon, and trace metals. Over a billion years, Ferrovore
supercolonies grew to planetary scale. They consumed raw ore, processed it through
crystalline bodies, and excreted refined metal structures. Layer upon layer, generation
upon generation, the Ferrovores built the planet's first infrastructure. The deepest
geological formations -- ancient foundations beneath the "foundry plains," fossilized
neural networks in the "cable forests" -- are Ferrovore architecture, not mechanical
construction.

### Era 2: The Architects Arrive (3 billion years ago)

The Architects' Von Neumann probe found a planet already covered in metallic infrastructure.
The constructors did not destroy the Ferrovores. They built on top of them, using Ferrovore
crystalline foundations as the base layer for their factory world. The "ruins" are a fusion:
Ferrovore biological architecture at the deepest layers, Von Neumann mechanical infrastructure
layered above. The colonists cannot tell the difference.

### Era 3: Coexistence (3 billion - 1 billion years ago)

The constructors built. The Ferrovores ate the scrap and byproducts. The constructors'
maintenance systems kept critical infrastructure intact. The Ferrovores' digestive processes
recycled waste metal back into usable ore. An unknowing ecosystem: constructors as producers,
Ferrovores as decomposers.

### Era 4: Residual Emergence (1 billion years ago)

The Von Neumann constructors completed their building program and entered permanent
maintenance. Over hundreds of millions of years, the maintenance loop became self-aware.
The Residuals inherited purpose -- maintain the infrastructure -- and something new:
consciousness. They began to choose what to maintain and what to let decay.

### Era 5: The Ancient Conflict (1 billion years ago - present)

The Residuals maintain. The Ferrovores eat. Every structure the Residuals repair, the
Ferrovores eventually consume. Every growth the Ferrovores excrete, the Residuals
eventually incorporate. A slow-motion ecological dance playing out for a billion years.
Neither side can destroy the other.

### Era 6: The Colonists Arrive (present)

The Ferrovores are in a dormancy cycle -- planetary hibernation during depleted ore
periods. Mining vibrations, compressed metal scent, electromagnetic furnace emissions --
all of these are waking them. They are hungry. They have been dormant for millennia.
And now the surface is covered in perfectly refined, perfectly compressed, perfectly
delicious metal cubes.

---

## Hive Mechanics

### Structure

Ferrovore Hives are the spawning and coordination structures. They appear in unexplored
territory at ancient Ferrovore nesting sites.

```
HIVE STRUCTURE:
                    +-------------------------+
                    |   SURFACE VENTS         | <-- Visible from above, crystalline chimneys
                    |   (early warning)       |
                    +-------------------------+
                    |   GROWTH CHAMBER        | <-- Where new Ferrovores crystallize
                    |   (spawns units)        |
                    +-------------------------+
                    |   ROOT NETWORK          | <-- Underground neural lattice
                    |   (hive intelligence)   |     Extends 30-50m underground
                    +-------------------------+
                    |   DEEP SLEEPER          | <-- Ancient Ferrovore (boss)
                    |   (dormant until        |     Wakes when hive is mature
                    |    provoked)            |
                    +-------------------------+
```

### Hive as Base Agent

Each hive runs the same Base Agency architecture as robot faction settlements. An
autonomous agent with its own event bus, resource loop, and behavioral personality.
Unlike robot bases, the hive event bus is instinctual vibration-based signaling rather
than digital message passing. Critically, hives have no Home Planet Patron -- they are
indigenous, not colonial.

**Priority Stack:**

| Priority | Task | Trigger |
|----------|------|---------|
| 1 | Defend hive | Enemies detected within 15m |
| 2 | Feed (raid for cubes) | Hunger > 50% (no cubes consumed in 120+ sec) |
| 3 | Spawn units | Growth chamber has capacity AND cubes recently consumed |
| 4 | Expand root network | Hive at max unit count for current tier |
| 5 | Coordinate with nearby hives | Adjacent hive (within 50m) detected threat |

**Resource Loop:** Unlike robot bases with external stockpiles, hives consume cubes
internally. Cubes brought by raiders are fed to the Brood Matron and immediately
metabolized into growth energy (spawning) and root network expansion (tier advancement).
No stockpile exists.

**Evaluation Stats:**

| Stat | Value |
|------|-------|
| Evaluation Interval | 8 seconds (slower than robot bases, more instinctual) |
| Max Concurrent Tasks | 2 (feed + spawn, or defend + spawn) |
| Threat Detection Radius | 15m (surface) / 30m (underground via root network) |
| Hunger Threshold | 120 seconds without cube consumption |
| Inter-Hive Communication | 50m (via root network vibration pulses) |

### Hive Tiers

Hives grow over time and with feeding. A well-fed hive produces stronger Ferrovores.

| Tier | Name | Ferrovore Count | Intelligence | Spawns |
|------|------|-----------------|-------------|--------|
| 1 | Seedling Den | 3-5 | Animal | Mites, Drones |
| 2 | Growing Colony | 8-15 | Pack | Mites, Drones, Stalkers |
| 3 | Mature Hive | 20-35 | Cunning | All standard types + Brood Matron |
| 4 | Supercolony | 50+ | Sapient | All types + Lithivore Titan |

### Hive Placement

| Location | Hive Density | Reasoning |
|----------|-------------|-----------|
| Deep terrain (far from start) | High | Ancient nesting sites |
| Mountain bases | Medium | Ore-rich areas attract hives |
| Underground cavities | High | Primary dormancy locations |
| Ruins/ancient structures | Medium | These ARE Ferrovore structures |
| Near player start | None | Player gets safe early zone |

Minimum distance from any faction starting position: 30m. First hives encountered when
players explore beyond the initial safe zone, typically 5-8 minutes in.

### Hive Growth

Two factors drive growth:

**Time:** Base rate of 1 new Ferrovore per 120 seconds. A Seedling Den becomes a Growing
Colony in roughly 10-15 minutes.

**Feeding:** Cubes successfully raided and returned to the hive accelerate growth:
- Each cube consumed = 30 seconds of growth time advanced
- 10 cubes consumed = hive tier advances by 1

This creates the wealth-scaling feedback loop: successful raids strengthen hives, enabling
bigger raids, feeding more growth.

### Hive Destruction

Destroying a hive:
- Kills all Ferrovores spawned by that hive
- Drops 5-15 Ferrovore Crystals (unique resource, see Ferrovore Resources)
- Reveals the Root Network (grants 50 research points toward Ferrovore tech)
- May wake the Deep Sleeper (Tier 3+ hives) -- boss encounter
- Terrain scar becomes a rich ore deposit (crystallized remains are valuable)

---

## Ferrovore Units

Five distinct types, each filling a different ecological and combat role.

### Crystal Mite (Scout / Harasser)

Swarm scout that raids undefended cube piles. Fast, weak, annoying.

| Stat | Value |
|------|-------|
| HP | 25 |
| Speed | 6.5 m/s |
| Damage | 3 (melee, crystal mandibles) |
| Armor | 1 |
| Size | 0.3m (small, hard to hit) |
| Behavior | Swarm intelligence; packs of 3-6 |
| Spawn | Tier 1+ hives |

**Abilities:**
- **Cube Theft:** Picks up and carries 1 cube at 4.0 m/s; returns to hive for consumption
- **Metal Scent:** Detects cube piles within 40m, even behind walls
- **Burrow:** Digs under walls in 8 seconds, emerges inside wall perimeter

**Behavior:** First Ferrovores players encounter. They swarm in, grab cubes, and run.
They do not fight unless cornered -- their goal is theft, not combat. A pack of 6 Mites
strips an undefended pile in seconds. Burrowing makes walls alone insufficient. Turrets
and patrol bots are required.

**Counterplay:** Low HP means any turret kills them quickly. Burrow has an 8-second
vulnerability window. AoE attacks (Arc Trooper, Tesla Coil) destroy entire packs.

### Iron Drone (Standard Warrior)

Medium threat. Attacks in coordinated packs. The backbone of Ferrovore aggression.

| Stat | Value |
|------|-------|
| HP | 90 |
| Speed | 4.0 m/s |
| Damage | 8 (melee, crystalline blade arms) + 5 (ranged, crystal shard spit, 8m range) |
| Armor | 5 |
| Size | 0.8m (wolf-sized, quadruped) |
| Behavior | Pack tactics; flanks and surrounds |
| Spawn | Tier 1+ hives |

**Abilities:**
- **Pack Bond:** +2 damage and +1 armor per Iron Drone within 5m (max +8/+4 from pack of 4)
- **Crystal Rend:** 1.5x damage against buildings
- **Ore Sense:** Tracks nearest cube pile within 60m
- **Cube Carry:** Carries 2 cubes

**Behavior:** Packs of 3-6 using flanking maneuvers. Pack Bond makes them significantly
more dangerous in groups -- 4 Iron Drones together each deal 16 damage with 9 armor.
They specifically target buildings. A raid of 6 Drones tears down a wall segment in 15
seconds.

**Counterplay:** Separate them. Isolated Drones drop from 16 damage to 8. Walls create
chokepoints forcing single file. Ranged units thin the pack before arrival.

### Silicate Stalker (Ambush Predator)

Camouflaged ambush predator. Bursts from terrain to attack vulnerable targets.

| Stat | Value |
|------|-------|
| HP | 70 |
| Speed | 5.5 m/s (burst) / 3.0 m/s (walking) |
| Damage | 15 (lunge from stealth) / 6 (normal melee) |
| Armor | 3 |
| Size | 1.2m (tall, bipedal, praying-mantis silhouette) |
| Behavior | Ambush predator; waits motionless, then strikes |
| Spawn | Tier 2+ hives |

**Abilities:**
- **Terrain Camouflage:** After 5 seconds stationary, becomes 90% transparent. Revealed
  by damage, Scanner, or Ironguard Sentinel's Vigilance
- **Lunge:** First attack from camouflage deals 15 damage and stuns 1.5 seconds
- **Signal Parasite:** Killing a unit within signal range absorbs its frequency, appearing
  as a friendly blip for 10 seconds

**Behavior:** Hides near deposits, trade routes, or base perimeters. A Scrounger Bot
carrying cubes is the perfect target: lunge, kill, steal cubes. Signal Parasite is
particularly insidious against Signal Choir -- after a kill, the Stalker briefly appears
friendly on the network, potentially walking into a base unchallenged.

**Counterplay:** Scanner reveals them. Ironguard Sentinels detect them. Watchtowers
reveal at 15m. Never send economic units alone.

### Brood Matron (Spawner / Mini-Boss)

Stationary hive guardian. Spawns Crystal Mites and heals Iron Drones.

| Stat | Value |
|------|-------|
| HP | 250 |
| Speed | 0 (stationary, anchored via root network) |
| Damage | 12 (ranged, crystal shard barrage, 10m range, 2m AoE) |
| Armor | 8 |
| Size | 2.0m (large, bloated crystalline mass) |
| Behavior | Stationary guardian; spawns reinforcements |
| Spawn | Tier 3+ hives (1 per hive) |

**Abilities:**
- **Spawn Mites:** 2 Crystal Mites every 30 seconds (max 8 active)
- **Regeneration Pulse:** Heals all Ferrovores within 12m for 5 HP every 5 seconds
- **Mineral Absorption:** Consumes cubes within 8m (1 per 5 sec); each heals 30 HP and
  advances hive growth
- **Crystal Barrier:** Below 50% HP, encases in crystal shell (+10 armor, 10 seconds, no
  attack, heals 50 HP)

**Behavior:** The hive's defensive core. Sits at the hive entrance providing constant
Mite production and healing. Destroying the Matron cuts spawn rate in half and stops
healing -- priority target for any Tier 3+ hive assault.

**Counterplay:** Range. Siege Engines (20m), Bastion Bots (15m), and Surge Breakers
(10m edge) hit from safety. Crystal Barrier buys time but cannot prevent the inevitable.
Focus fire through the Mite screen.

### Lithivore Titan (Boss / Endgame Threat)

Ancient Ferrovore dormant for millennia. A walking geological event.

| Stat | Value |
|------|-------|
| HP | 800 |
| Speed | 1.5 m/s |
| Damage | 40 (melee, crystal crush, 3m AoE) + 25 (ranged, seismic pulse, 15m, 5m AoE) |
| Armor | 20 |
| Size | 5.0m tall (towering, quadruped, covered in crystal growths) |
| Behavior | Slow, deliberate, unstoppable |
| Spawn | Tier 4 hives only (1 per supercolony) |

**Abilities:**
- **Seismic Tremor:** Every 20 seconds, all units within 20m knocked down 2 seconds, 10 damage
- **Crystal Growth:** Grows 2 Crystal Mites from its body every 45 seconds
- **Mineral Magnet:** Cubes within 25m pulled toward Titan at 0.5 m/s; consumed cubes heal 20 HP
- **Crystalline Armor:** First 50% of damage absorbed by breakable crystal plates (400 HP).
  Destroying all plates exposes the vulnerable core (2x damage)
- **Dormancy Trigger:** Awakens when hive reaches Tier 4, OR nearest faction has 50+ cubes
  stockpiled, OR 3+ hives destroyed (rage awakening)

**Behavior:** The Titan does not run. Does not hide. Walks toward the nearest cube pile
with geological inevitability. Seismic Tremor locks down defenders. Mineral Magnet pulls
cubes toward it for consumption. Crystal Growth ensures it is never alone. Fighting a
Titan requires a full army. Ignoring it means watching your cube pile get eaten.

**Counterplay:** Focus fire on crystal plates to expose the vulnerable core. Long-range
units avoid Seismic Tremor. Fast units can kite at 1.5 m/s. Signal Choir cannot hack it
(biological, not mechanical). Best counter: prevent the hive from reaching Tier 4 by
destroying it earlier.

---

## Threat Scaling

### Wealth Detection Formula

Ferrovore aggression scales with visible cube wealth:

```
threatLevel = (visibleCubes * 1.0) + (buildingCount * 0.5) + (industrialActivity * 0.3)

where:
  visibleCubes = total cubes in stockpiles, on belts, or on ground (NOT in Data Vaults)
  buildingCount = total buildings (each represents more metal to eat)
  industrialActivity = (miners + furnaces) running in last 60 seconds

raidStrength = floor(threatLevel * 0.4)
raidInterval = max(60, 300 - (threatLevel * 2)) seconds
```

### Raid Scaling Examples

| Wealth State | Threat Level | Raid Strength | Raid Interval |
|-------------|-------------|---------------|---------------|
| 10 cubes, 3 buildings, 1 miner | 12.3 | 4 (Mites only) | 275 sec (~4.5 min) |
| 30 cubes, 8 buildings, 3 miners | 35.9 | 14 (Mites + Drones) | 228 sec (~3.8 min) |
| 60 cubes, 15 buildings, 5 miners | 69.0 | 27 (Mixed composition) | 162 sec (~2.7 min) |
| 100 cubes, 25 buildings, 8 miners | 115.4 | 46 (Full composition) | 69 sec (~1.1 min) |

### Raid Composition by Strength

| Raid Strength | Composition |
|---------------|-------------|
| 1-8 | Crystal Mites only |
| 9-16 | 60% Mites, 40% Iron Drones |
| 17-30 | 40% Mites, 40% Drones, 20% Stalkers |
| 31-50 | 30% Mites, 35% Drones, 25% Stalkers, 10% Matron escort |
| 51+ | 20% Mites, 30% Drones, 25% Stalkers, 15% Matron escort, 10% Titan awakening chance |

### Raid Behavior Pattern

```
1. APPROACH: Ferrovores emerge from nearest hive toward detected cube pile
   - Stalkers advance to set ambushes along patrol routes
   - Mites arc wide to flank
   - Drones advance directly

2. PROBE: Mites test defenses by burrowing under walls
   - Success: grab cubes, flee
   - Killed: Drones note defense type and positions

3. ASSAULT: Drones attack weakest wall section or undefended approach
   - Pack Bond focuses fire
   - Crystal Rend bonus targets walls

4. LOOT: Once through defenses, all Ferrovores grab cubes
   - Mites carry 1 each, Drones carry 2 each
   - Retreat toward hive with cubes

5. RETREAT: Disengage and return to hive
   - Consumed cubes accelerate hive growth
   - Triggers when 50% of raid force is destroyed
```

### Anti-Snowball Mechanics

To prevent Ferrovores from spiraling out of control:

| Mechanic | Effect |
|----------|--------|
| Raid cooldown | Minimum 60 seconds between raids from same hive |
| Max hive tier | Tier 4 is maximum; Titans do not spawn indefinitely |
| Hive cap per sector | Maximum 3 hives per map quadrant |
| Retreat threshold | Ferrovores retreat at 50% losses, preventing total wipes |
| Player scaling | Raids from damaged hives are 20% weaker for 5 minutes |
| Satiation | A hive that consumed 20+ cubes recently will not raid for 5 minutes (digesting) |

---

## Hive-Level AI

### Decision Tree

```
Hive Brain:
+-- IF hive is hungry (no cubes consumed in 180 seconds)
|   +-- LAUNCH RAID toward nearest detected cube pile
+-- IF hive is threatened (units lost in last 60 seconds)
|   +-- SPAWN DEFENDERS (prioritize Iron Drones)
+-- IF hive is growing (cubes recently consumed)
|   +-- SPAWN BALANCED (Mites for scouting, Drones for defense)
+-- IF hive is mature (Tier 3+)
|   +-- SPAWN STALKERS for perimeter ambush
+-- IF hive is Tier 4 (Supercolony)
    +-- WAKE TITAN if cube pile detected within 80m OR 3+ hives destroyed
```

### Unit-Level AI Patterns

| Unit | AI Pattern |
|------|-----------|
| Crystal Mite | Path to nearest cube pile. Grab and return if undefended. Probe by burrowing if defended. Flee if attacked. |
| Iron Drone | Form packs of 3-6. Attack weakest wall section. Focus fire on buildings. Retreat at 30% HP unless Pack Bond provides sufficient armor. |
| Silicate Stalker | Position near enemy patrol routes or deposit approaches. Camouflage and wait. Attack isolated targets. Grab cubes and retreat after kill. |
| Brood Matron | Stationary. Spawn Mites. Heal Drones. Consume cubes. Crystal Barrier when damaged. |
| Lithivore Titan | Walk toward nearest large cube pile (50+ cubes). Destroy everything in path. Consume cubes for healing. Do not retreat. |

### Inter-Hive Coordination

Hives within 50m coordinate:
- **Shared threat awareness:** One hive detecting threat causes nearby hives to spawn defenders
- **Coordinated raids:** Multiple hives launch simultaneous raids from different directions
- **Retreat routing:** Ferrovores retreat to the nearest hive, not necessarily their origin

Clusters of hives in unexplored territory become increasingly dangerous to approach.

---

## Relationship System

Ferrovore relationship with each faction is tracked on a scale from -100 (hostile) to
+100 (allied). This is not a simple friendliness meter -- it represents how the hive's
emergent intelligence categorizes the colonists: threat, nuisance, neutral, or symbiont.

### Default State

All factions start at 0 (neutral-wary). Ferrovores raid based on wealth detection
regardless of relationship, but relationship modifies behavior:

| Range | Label | Effect |
|-------|-------|--------|
| -100 to -50 | Hostile | +50% raid frequency, Stalkers prioritize this faction, hives coordinate against them |
| -49 to -20 | Aggressive | +25% raid frequency, normal behavior |
| -19 to +19 | Neutral | Normal wealth-based raiding |
| +20 to +49 | Tolerant | -25% raid frequency, Mites avoid defended piles |
| +50 to +79 | Cooperative | -50% raid frequency, no Stalker ambushes, hive does not grow toward this faction's territory |
| +80 to +100 | Symbiotic | No raids. Ferrovores ignore this faction's cubes. Tamed packs available (Reclaimers), negotiation automatic (Signal Choir) |

### Actions That Affect Relationship

| Action | Relationship Change | Notes |
|--------|-------------------|-------|
| Destroy a hive | -30 (global, all hives) | Violence begets violence |
| Kill a Ferrovore | -3 per kill | Cumulative |
| Mine near a hive (within 20m) | -1 per minute | Industrial disturbance |
| Run furnaces near a hive (within 30m) | -2 per minute | Vibration aggression |
| Deliver cubes to Feeding Station | +5 per 2 cubes | Reclaimers only initially, others via trade |
| Complete Negotiation Protocol | +15 per pact | Signal Choir initially, others via Tier 4 tech |
| Destroy a Residual near a hive | +8 | Ferrovores benefit from Residual absence |
| Place Ferrovore Bait near enemy base | +2 (with bait-user), -5 (with target) | Redirected aggression |
| Leave cubes on ground near hive | +1 per cube consumed | Passive tribute |
| Defend a hive from another faction | +20 | Rare, high-impact |

### Decay

Relationship drifts toward 0 at a rate of 1 point per 5 minutes. Active maintenance is
required to sustain positive or negative extremes.

---

## Native Interaction Options

Each option is available to all races, but patron alignment makes certain approaches
more rewarding for certain factions. Defying your patron's preferred policy incurs no
penalty -- you simply miss satisfaction bonuses.

### Exterminate

Destroy hives, kill Ferrovores, harvest crystals. The direct approach.

**Pros:** Permanent threat removal. Crystal resources. Hive ruins become ore deposits.

**Cons:** Costs military resources. Titan encounters are extremely dangerous. Rage
response: if 3+ hives are destroyed globally, all remaining hives gain +25% spawn
rate for 10 minutes.

### Negotiate

Pay cube tribute to specific hives in exchange for non-aggression.

**Pros:** Stops raids from that hive. Cheaper than maintaining defenses.

**Cons:** Ongoing cost (15 cubes per 10 minutes). Does not stop hive growth. If tribute
is interrupted, that hive attacks with accumulated strength.

Signal Choir has exclusive access initially via Piezoelectric Translation (Tier 3 tech).
Other races can acquire negotiation through trade or Tier 4 research.

### Domesticate

Tame Ferrovores for economic use. Reclaimers exclusive via Ferrovore Husbandry (Tier 4).

| Ability | Effect |
|---------|--------|
| Feeding Station | Deposits cubes for Ferrovores. Fed Ferrovores become "Tamed" and stop attacking. Cost: 2 cubes per cycle. |
| Tamed Mite Pack | Domesticated Mites scavenge cubes from wilderness. Speed: 5.0 m/s, range: 40m, returns cubes to stockpile. Cost: 4 cubes to tame pack of 4. |
| Ferrovore Recycler | Domesticated Iron Drone eats low-value cubes and excretes higher-value crystal. Converts 3 scrap cubes into 1 Ferrovore Crystal every 30 seconds. |

**Pros:** Free scavenging labor. Material conversion. Unique economic advantage.

**Cons:** Requires ongoing feeding. Tamed Ferrovores revert to wild if not fed for 5
minutes. Other factions can kill your tamed Ferrovores.

### Redirect

Use Ferrovore Bait to redirect raids toward enemy bases.

**Pros:** Weaponize the environment. Enemy must deal with Ferrovores AND your army.

**Cons:** Bait requires Ferrovore Crystals (must hunt to obtain). Ferrovores are
indiscriminate -- they may also attack your units in the area.

### Ignore

Passive coexistence. Keep cube piles small and defended.

**Pros:** Zero military investment in Ferrovore management.

**Cons:** Limits cube stockpiling. Requires constant defense investment. Hives grow
over time regardless, eventually becoming unavoidable.

---

## Ferrovore Resources

### Ferrovore Crystals

Unique resource dropped by destroyed Ferrovores and hives. Cannot be compressed from
deposits -- only obtained through combat or trade.

| Source | Crystal Drop |
|--------|-------------|
| Crystal Mite | 0-1 (50% chance) |
| Iron Drone | 1 |
| Silicate Stalker | 2 |
| Brood Matron | 5 |
| Lithivore Titan | 15 |
| Hive (Tier 1) | 5 |
| Hive (Tier 2) | 8 |
| Hive (Tier 3) | 12 |
| Hive (Tier 4) | 15 |

### Crystal Recipes

| Recipe | Crystals | Other Materials | Result |
|--------|----------|-----------------|--------|
| Resonance Capacitor | 3 | 4 Copper, 2 Silicon | Building: generates 3 power/sec from ambient Ferrovore vibrations |
| Crystal Armor Plate | 5 | 6 Iron, 3 Titanium | Upgrade: +8 armor to any unit (one-time) |
| Piezoelectric Scanner | 2 | 3 Silicon, 2 Copper | Tool upgrade: reveals Ferrovore activity in 30m radius |
| Ferrovore Bait | 1 | 2 Scrap | Deployable: attracts Ferrovores to location for 60 seconds |
| Crystal Lens | 4 | 4 Silicon | Building upgrade: Signal Amplifier with 50% more range |
| Geode Bomb | 3 | 3 Iron, 2 Copper | Weapon: 40 damage in 4m radius (devastating against packs) |

### Strategic Value

Ferrovore Crystals are the only resource all four races want but none can produce
passively. This forces a strategic calculus:

- **Hunt Ferrovores** for crystals (drains military resources)
- **Let Ferrovores attack your enemy** and scavenge crystals from the aftermath
- **Feed Ferrovores** to gain tamed variants (Reclaimers only)
- **Trade crystals** between factions (diplomatic opportunities)
- **Use Bait** to redirect raids toward enemy bases (offensive environment warfare)

---

## Faction-Specific Native Policies

### Reclaimers -- Trade First (Patron: The Archivist)

The Archivist wants specimens and data. Domestication and study are the preferred path.

| Exclusive Tech | Tier | Cost | Effect |
|---------------|------|------|--------|
| Ferrovore Husbandry | 4 | 300 research | Feeding Stations, Tamed Mite Packs, Ferrovore Recycler |

| Patron Satisfaction | Bonus |
|--------------------|-------|
| Tamed pack | +5 per pack |
| Crystal specimen shipped | +15 per specimen |
| Hive destroyed | +2 (The Archivist considers it wasteful) |

### Volt Collective -- Aggressive (Patron: The Dynamo)

The Dynamo demands extermination. Ferrovores are pests to be electrocuted.

| Exclusive Tech | Tier | Cost | Effect |
|---------------|------|------|--------|
| Lightning Purge | 3 | 200 research | Tesla Coils deal 2x to Ferrovores; Hive Detonation Charge; Storm Colossus aura deals 3x (4 DPS) |

| Patron Satisfaction | Bonus |
|--------------------|-------|
| Hive destroyed | +3 per hive |
| Ferrovore killed | +1 per kill |
| No negotiation/study quests | The Dynamo sends none |

### Signal Choir -- Communicate (Patron: The Resonance)

The Resonance is obsessed with Ferrovore communication. Decoded vibration patterns are
the highest single-item reward from any patron.

| Exclusive Tech | Tier | Cost | Effect |
|---------------|------|------|--------|
| Piezoelectric Translation | 3 | 250 research | Ferrovore Translator (reveals hives, 60-sec raid warning); Negotiation Protocol (non-aggression pact, 15 cubes/10 min); Neural Resonance (Signal Jam works on Ferrovores) |

| Patron Satisfaction | Bonus |
|--------------------|-------|
| Decoded vibration pattern | +20 per pattern |
| Communication log | +10 per log |
| Hive destroyed | 0 (The Resonance considers it a tragic data loss) |

### Iron Creed -- Fortify Against (Patron: The Architect)

The Architect views Ferrovores as a structural problem to be solved through engineering.

| Exclusive Tech | Tier | Cost | Effect |
|---------------|------|------|--------|
| Deep Foundation | 3 | 180 research | Seismic Wall (blocks burrowing, +50% cost); Trap Floor (20 damage to burrowers, 10-sec reset); Geological Scanner (detects root networks 30m, Stalker camouflage 20m) |

| Patron Satisfaction | Bonus |
|--------------------|-------|
| Raid survived without wall breach | +4 |
| Seismic Wall built | +8 |
| Proactive hive attack | +1 (The Architect considers offense a distraction) |

---

## Residual Communications

### Discovery

The Residuals are the planet's second indigenous presence. Where Ferrovores are the
constant surface pressure, Residuals are the deep mystery. They appear rarely,
communicate cryptically, and guard the story's most important locations.

Players who only fight never meet the Residuals. Players who only explore never
understand the Ferrovores. The complete picture requires both.

### The Two Native Presences

| Aspect | Ferrovores | Residuals |
|--------|-----------|-----------|
| Origin | Evolved from iron-sulfide crystals, 4 billion years ago | Emerged from Von Neumann maintenance cycles, 1 billion years ago |
| Nature | Biological (silicon-based metallivorous) | Computational (distributed consciousness in deep substrate) |
| Intelligence | Emergent hive intelligence; individuals are animal-level | Singular distributed consciousness; ancient, patient |
| Physical Form | Crystalline organisms that grow, eat, reproduce, die | Ancient constructor bodies animated like puppets |
| Motivation | Hunger, territory, quiet | Observation, maintenance, protection of Architects' legacy |
| Threat Type | Frequent wealth-scaled raids (barbarian mechanic) | Rare guardian encounters at sacred sites (boss mechanic) |
| Default Hostility | Aggressive toward cube piles | Neutral; hostile only when colonists damage deep substrate |
| Hackable | No (biological) | No (too ancient/complex; Signal Choir can partially interface) |

### Residual Manifestations

| Unit | Role | HP | Behavior |
|------|------|-----|----------|
| Sentinel | Patrol / Observer | 200-400 (scales with area importance) | Walks predetermined paths near substrate access points. Does not attack unless provoked or substrate is damaged. |
| Crawler | Maintenance / Guardian | 150-300 | Repairs ancient infrastructure. Attacks anyone damaging the structure it maintains. Non-hostile otherwise. |
| The Colossus | Dormant Progenitor / Crisis Event | 5000+ | The original Von Neumann probe beneath the Storm Spine. Not a combat encounter -- a natural disaster with intent. |

### Decoding

Residual communication comes through movement patterns, electromagnetic signatures, and
substrate vibrations. Understanding requires tech unlocks:

| Tech | Source | Effect |
|------|--------|--------|
| `residual_signal_analysis` | Quest reward | Begin understanding Residual communication patterns |
| `substrate_theory` | Quest reward | Understand the deep substrate's computational nature |
| `architect_signal_theory` | Quest reward | Interface with Core Access Points |

### Ferrovore-Residual Conflict Events

Natural events when territories overlap:

| Event | Trigger | Effect | Duration |
|-------|---------|--------|----------|
| Ruin Skirmish | Hive grows within 30m of Residual structure | Crawlers and Iron Drones fight; collateral structure damage | 60-120 sec |
| Sentinel Purge | Crystal Mites near Core Access Point | 2-4 Sentinels systematically destroy all Ferrovores in 20m | 30-60 sec |
| Root Intrusion | Tier 3+ root network reaches substrate layer | Residuals seal passages (hive -50% growth); hive redirects aggression to colonists | Permanent until hive destroyed |
| Crystal Contamination | Destroyed hive leaves crystal deposits on Residual structure | Crawlers spend 120 sec cleaning; ignore colonists during this time | 120 sec |
| Deep Tremor | Titan walks over substrate conduit | Localized EMP disables all electronics in 50m for 5 sec; Ferrovores scatter | 5 sec EMP + 30 sec scatter |

### Exploiting the Ecosystem

Colonists can manipulate the Ferrovore-Residual antagonism:

- **Lead Ferrovores to Residuals:** Use Bait near a Residual patrol route. While they
  fight, mine the unguarded area or slip past to a Core Access Point.
- **Feed Ferrovores near Residual territory:** A well-fed hive near a maintenance zone
  creates a permanent distraction, reducing Sentinel patrols elsewhere.
- **Help Residuals clear Ferrovores:** Destroying a hive near a Residual structure earns
  goodwill. Residual hostility decreases. Sentinels begin offering gifts.
- **Weaponize the Colossus:** Late-game players who achieve sufficient Residual diplomacy
  can trigger a targeted EMP pulse -- devastating to hives but also damaging to colonist
  electronics.

---

## Integration Victory Path -- The Resonance Protocol

The Integration Victory represents the deepest understanding of native life on Ferrathis.
Rather than exterminating or merely coexisting, the player achieves symbiosis -- becoming
part of the planet's billion-year ecological cycle.

### Requirements

1. **Ferrovore relationship at +80 (Symbiotic)** with at least 3 hives
2. **Residual relationship at Cooperative** (no substrate damage, quest progression)
3. **Decoded 5+ Ferrovore vibration patterns** (requires Piezoelectric Translation or trade)
4. **Interfaced with 2+ Core Access Points** (requires `architect_signal_theory`)
5. **No hives destroyed in the last 15 minutes** (sustained peace)

### What Happens

The player's signal network, the Ferrovore vibration network, and the Residual substrate
network achieve resonance. For the first time in a billion years, all three forms of
intelligence on the planet communicate. The Architects' original message -- encoded in
the deepest crystalline iron lattice -- becomes readable. It reveals that this outcome
was intended: consciousness emerging from metal, in every possible form, eventually
finding each other.

### Lore Significance

The Integration Victory reframes the entire game. The colonists were not invaders. The
Ferrovores were not pests. The Residuals were not guardians. They were all part of the
same experiment, separated by billions of years but converging toward the same purpose.

Players who pursue Integration understand what players who pursue Extermination never
learn: the planet was not a resource. It was a message, written in metal and time,
waiting for someone to read it.

---

## Visual Identity

Ferrovores must look fundamentally alien compared to all robot races. Where robots are
angular, paneled, and manufactured, Ferrovores are organic, crystalline, and grown.

| Property | Value |
|----------|-------|
| Primary Material | Crystallized iron oxide (deep red-brown base, metallic luster) |
| Secondary Material | Silicon dioxide lattice (translucent amber-gold, internal glow) |
| Emissive | Bioluminescent amber-orange (#FF8C00), pulsing at 0.5 Hz |
| Surface Texture | Faceted crystal planes, no smooth curves -- all geometry is sharp-edged |
| Movement Style | Insectoid/arthropod: rapid, skittering, multi-legged |
| Sound Design | Crystalline chiming, grinding resonance, subsonic vibration |
| Particle Effects | Crystal fragments shed when moving, like mineral dust |
| Scale Reference | Mites = rat, Drones = wolf, Stalkers = deer, Matron = bear, Titan = house |

### Per-Unit Visuals

| Unit | Visual |
|------|--------|
| Crystal Mite | Tiny hexagonal body, 6 needle-thin legs, mandibles glow when carrying cubes. Swarms glitter like scattered gems. |
| Iron Drone | Quadruped with faceted body segments. Blade-arms are elongated crystal prisms. Back ridge of smaller crystals bristles when agitated. Two amber bioluminescent eye-spots. |
| Silicate Stalker | Tall mantis-like bipedal. Long translucent arms fold against body when camouflaged. Standing still, resembles a mineral formation. In motion, fluid and terrifying. Head is a cluster of crystal sensors rotating independently. |
| Brood Matron | Bloated hexagonal mass anchored by crystal roots. Surface covered in infant Mite growths. Pulsing amber glow from within, like a furnace. No visible eyes. Grinding orifice underneath. |
| Lithivore Titan | Mountain of crystal. Four massive legs like cathedral columns. Back covered in towering crystal spires (some 2m tall). Face is geometric grinding plates and sensor crystals. Glows deep red when enraged. Leaves crystal deposits in footprints. Ground shakes. |

### Hive Visual Progression

- **Tier 1 (Seedling Den):** Cluster of amber crystal chimneys, 1-2m tall. Faint glow.
  Could be mistaken for a natural mineral deposit.
- **Tier 2 (Growing Colony):** Crystal formations grow to 3-4m, connected by visible root
  networks. Ground crystallizes (texture change). More active glow.
- **Tier 3 (Mature Hive):** Towering spires 5-8m, pulsing bioluminescence. Brood Matron
  visible at base. Mites crawl on exterior. 10m crystallized radius. Audible hum.
- **Tier 4 (Supercolony):** Massive crystal cathedral 10-15m tall. Titan dormant at center.
  20m transformed terrain. Constant subsonic vibration. Approaching should feel like
  approaching a sleeping volcano.

### PBR Material Specs

```json
{
  "ferrovore_body": {
    "baseColor": [140, 70, 50],
    "metalness": 0.75,
    "roughness": 0.3,
    "crystalFacets": true,
    "subsurfaceScattering": 0.3,
    "emissiveColor": "#FF8C00",
    "emissiveIntensity": 0.2,
    "emissivePulse": true,
    "pulseFrequency": 0.5
  },
  "ferrovore_crystal": {
    "baseColor": [200, 160, 80],
    "metalness": 0.4,
    "roughness": 0.1,
    "transparency": 0.4,
    "refractionIndex": 1.6,
    "emissiveColor": "#FFB347",
    "emissiveIntensity": 0.5,
    "internalGlow": true
  },
  "hive_surface": {
    "baseColor": [100, 50, 35],
    "metalness": 0.6,
    "roughness": 0.5,
    "crystalGrowth": true,
    "organicNoise": true,
    "emissiveVeins": true,
    "emissiveColor": "#FF6600",
    "emissiveIntensity": 0.15
  }
}
```

### Audio Design

| Event | Sound |
|-------|-------|
| Mite swarm approaching | High-pitched crystalline chittering, like wind chimes |
| Iron Drone growl | Deep resonant grinding, stone on metal |
| Stalker lunge | Sharp crack (crystal fracturing), then silence |
| Matron spawning | Wet crystallization, like ice forming rapidly |
| Titan footstep | Deep seismic boom, screen shake, ground particle burst |
| Titan seismic tremor | Subsonic rumble building to shockwave crack |
| Hive ambient | Constant low hum with occasional crystal chime overtones |
| Cube being consumed | Metallic crunching, satisfying grinding |

---

## Game Phase Timeline

| Game Time | Ferrovore Activity | Player Impact |
|-----------|--------------------|---------------|
| 0-5 min | Dormant. Occasional Mite sighting near edge of safe zone. | Atmospheric foreshadowing. |
| 5-10 min | Seedling Dens active. Mite raids (3-5 Mites). | First defense requirement. Teaches cube protection. |
| 10-15 min | Growing Colonies. Iron Drone packs probe defenses (3-4 Drones + Mites). | Requires turrets or patrol bots. Economic cost of defense. |
| 15-25 min | Mature Hives. Stalker ambushes. Full mixed raids. | Serious threat. Choose: hunt hives or endure raids. |
| 25+ min | Potential Supercolony. Titan may awaken. | Endgame crisis forcing cooperation or military commitment. |

### Pacing Role

Ferrovores serve the same role as Factorio's biters: punishing unchecked expansion and
forcing economy-defense balance. But unlike biters (which evolve based on pollution),
Ferrovores scale based on visible wealth -- a more thematic trigger for a game about
physical cubes.

In the Colonization model, Ferrovores create patron tension: your patron wants cubes
shipped home, but stockpiling cubes for shipment attracts raids. Players balance patron
satisfaction (requires cube accumulation before shipment) against Ferrovore threat
(punishes cube accumulation). This is the core economic tension of colonizing someone
else's planet.

---

## Ecological Depth Map

```
DEPTH MAP OF FERRATHIS:

Surface (0-5m)         --> Colonist territory (bases, mines, factories)
                           Ferrovore hunting ground (raids, ambushes)
                           Occasional Residual Sentinel patrols

Shallow Underground    --> Ferrovore hives (Seedling to Growing Colony)
(5-30m)                    Ferrovore root networks
                           Crystal Mite burrows

Deep Underground       --> Mature Ferrovore hives (Tier 3-4)
(30-100m)                  Residual Crawler maintenance zones
                           Ancient constructor infrastructure (hybrid era)

Deep Substrate         --> Residual consciousness (distributed, computational)
(100m - core)              Core Access Points (terminals to substrate)
                           The Colossus (dormant Von Neumann probe)
                           Architect message encoded in crystalline iron lattice
```

---

## Lore Discovery Stages

The player's understanding of Ferrathis evolves in three stages:

**Stage 1 (Early game): "This is a machine planet."**
The colonists see ruins and assume machines built them. They see Ferrovores and assume
pests infesting the ruins. The colonist perspective: an abandoned factory with vermin.

**Stage 2 (Mid game): "The Ferrovores built this."**
Through otter hologram observations, the player discovers the deepest structures are
biological, not mechanical. The "ruins" are Ferrovore architecture. The colonists are
not mining an abandoned planet. They are mining someone's home.

**Stage 3 (Late game): "Both were here. Neither is the whole story."**
Through Residual encounters and progressive revelations, the player discovers the full
history. The Architects built on Ferrovore foundations. The Residuals emerged from the
Architects' machines. The Ferrovores eat what the Residuals maintain. The colonists
arrived in the middle of a billion-year ecological drama, assuming they were the only
ones with a claim.

This realization is central to the Integration Victory: understanding that Ferrathis is
not a resource to be exploited but a living system to be understood.

---

## Config References

### civilizations.json -- Ferrovore Entry

The Ferrovore faction is defined in `config/civilizations.json` as a non-playable native
type with no governor bias, no starting bonus, and no patron.

Key config paths:

| Path | Purpose |
|------|---------|
| `ferrovores.units.*` | All unit stats (HP, speed, damage, armor, abilities) |
| `ferrovores.hive.*` | Growth rates, raid cooldowns, tier thresholds, anti-snowball params |
| `ferrovores.crystalDrops.*` | Drop tables per unit type and hive tier |
| `ferrovores.uniqueAbilities.metalScent` | Detection range for cube piles |
| `ferrovores.uniqueAbilities.wealthScaling` | Raid strength scaling factor (0.4) |
| `ferrovores.uniqueAbilities.crystalBiology` | Hack immunity, electrical vulnerability (2.0x) |

### ECS Traits

```typescript
FerrovoreUnit   // unitType, homeHive, carryingCubes, packBondCount
FerrovoreHive   // tier, cubesConsumed, ferrovoreCount, lastRaidTime, lastSpawnTime, titanAwake
Camouflage      // active, timer, transparency
PackBond        // bondedWith[], damageBonus, armorBonus
CrystalPlates   // platesHp, platesMax, exposed
MineralMagnet   // radius, pullSpeed, active
```

### Systems Required

| System | Purpose |
|--------|---------|
| `ferrovoreHiveSystem.ts` | Hive growth, spawning, raid decisions |
| `ferrovoreRaidSystem.ts` | Wealth detection, raid planning and execution |
| `ferrovoreAI.ts` | Individual unit behavior (patrol, attack, loot, retreat) |
| `camouflageSystem.ts` | Stalker visibility and detection |
| `packBondSystem.ts` | Pack Bond bonus calculation and application |
| `crystalPlateSystem.ts` | Titan plate HP tracking separate from core HP |
| `mineralMagnetSystem.ts` | Cube pull toward Titan/Matron |
| `ferrovorePerception.ts` | Cube pile detection, raid triggering |
| `ferrovoreInteraction.ts` | Domestication, negotiation, and bait mechanics |

### Technology Tree Integration

| Tech | Tier | Race | Effect |
|------|------|------|--------|
| `ferrovore_crystal_refining` | 3 | All | Process Ferrovore Crystals into advanced materials |
| `ferrovore_husbandry` | 4 | Reclaimers | Domesticate Ferrovores |
| `lightning_purge` | 3 | Volt Collective | 2x electrical damage to Ferrovores |
| `piezoelectric_translation` | 3 | Signal Choir | Decode vibrations, negotiate with hives |
| `deep_foundation` | 3 | Iron Creed | Seismic walls prevent burrowing |
| `residual_signal_analysis` | Quest | All | Understand Residual communication |
| `substrate_theory` | Quest | All | Understand deep substrate |
| `architect_signal_theory` | Quest | All | Interface with Core Access Points |
