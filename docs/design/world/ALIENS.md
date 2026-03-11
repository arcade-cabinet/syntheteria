# Syntheteria -- Alien Natives

> **Status:** Canonical (merged from GDD-008, GDD-007 Section 5, GDD-011 Section 2.6)
> **Scope:** Complete design for the indigenous inhabitants of Ferrathis -- the Ferrovores
> (biological fauna) and the Residuals (sentient machine consciousness). Covers biology,
> behavior, combat, diplomacy, relationship progression, the Integration Victory path,
> and the unified alien ecosystem.
>
> See also: `docs/design/world/VISUAL_IDENTITY.md` — consolidated visual reference
> (Ferrovore crystal biology visuals, Residual ancient-metal aesthetics, alien color/glow specs).

---

## Overview

The planet was here first.

Every ore vein the player grinds, every cube compressed, every furnace fired -- all of
it happens on land that belongs to something else. Ferrathis has two indigenous presences,
not one. They arose from completely different origins, occupy different ecological niches,
and have a natural antagonism that predates the robot colonists by billions of years.

**Ferrovores** are silicon-based metallivorous organisms -- living creatures made of
crystallized metal lattices that eat refined metal. They were here 4 billion years before
the colony ship arrived. The planet's deepest geological formations -- what the colonists
mistake for ancient industrial ruins -- are actually Ferrovore architecture. Like coral
builds reefs from calcium carbonate, Ferrovores build structures from processed metal.

**Residuals** are the planet's indigenous machine intelligence -- an emergent consciousness
that arose from the Von Neumann constructors' maintenance cycle over the last billion
years. They are not a unified civilization. They are not even, in the conventional sense,
a species. They are a phenomenon: a distributed consciousness that permeates the planet's
deep computational substrate, occasionally manifesting in the physical world through
ancient constructor bodies animated like puppets.

The robot colonists are the third wave of intelligence to walk Ferrathis's surface, and
the least prepared for what they will find.

### Design Philosophy

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

### Planetary History

| Era | Age | Event |
|-----|-----|-------|
| Ferrovore Genesis | 4 billion years ago | Iron-sulfide crystal structures self-replicate in volcanic vents. Silicon-based metallivorous biology begins. Supercolonies grow to planetary scale, building the first layer of metallic infrastructure: fossilized digestive chambers, crystallized neural networks, calcified hive structures. |
| The Architects Arrive | 3 billion years ago | Von Neumann probe arrives, finds planet covered in Ferrovore biological infrastructure. Builds factory world on top of Ferrovore foundations, never recognizing them as biological. |
| Coexistence | 3B - 1B years ago | Constructors build. Ferrovores eat scrap and byproducts. An unconscious ecosystem: constructors as producers, Ferrovores as decomposers. |
| Residual Emergence | 1 billion years ago | Constructors complete their building program and enter permanent maintenance. Over hundreds of millions of years, the maintenance loop becomes self-aware. Residuals inherit the constructors' purpose but gain consciousness -- they begin to choose what to maintain and what to let decay. |
| The Ancient Conflict | 1B years ago - present | Residuals maintain. Ferrovores eat. Neither side can destroy the other. The surface belongs to the Ferrovores. The substrate belongs to the Residuals. The middle layers are contested ground. |
| The Colonists Arrive | Present | Robot colonists land and begin mining. Ferrovores smell refined metal and raid. Residuals observe and wait. Colonists assume the planet is uninhabited except for crystalline predators. They are wrong. |

### Ecological Depth Map

```
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

### Colonization Parallel

In the Colonization model, Ferrovores and Residuals occupy the same design space as
indigenous populations in Sid Meier's Colonization:

- **Not competing for patron favor.** Neither has a Home Planet Patron. Neither has a
  colonial agenda. They just live here.
- **A moral mirror.** The robot colonists are mining the Ferrovores' ancestral home and
  disrupting the Residuals' billion-year maintenance cycle.
- **A strategic variable.** Each patron has a different attitude toward the natives: SABLE
  wants specimen data, DYNAMO wants extermination, RESONANCE wants communication, BASTION
  wants fortification.
- **Exploitable by all factions.** Ferrovore Crystals, Ferrovore Bait, tamed packs,
  redirected raids, and Residual alliances are all tools colonists use against each other.

| Patron | Native Policy | Satisfaction Bonus |
|--------|--------------|-------------------|
| SABLE (Reclaimers) | Study and domesticate | +5 per tamed pack, +15 per crystal specimen shipped |
| DYNAMO (Volt) | Exterminate | +3 per hive destroyed, +1 per Ferrovore killed |
| RESONANCE (Signal Choir) | Communicate | +20 per communication log, +10 per decoded vibration pattern |
| BASTION (Iron Creed) | Fortify against | +4 per raid survived without wall breach, +8 per Seismic Wall built |

---

## Ferrovores (Native Fauna)

### Biology

Silicon-based metallivorous organisms. Biological entities whose cells are metal-oxide
crystals, whose nervous system is piezoelectric impulse, whose metabolism is rust. Not
machines. Not organic in the carbon-based sense. Something else entirely.

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
the game's most important emergent behavior: **your wealth attracts predators**. The more
cubes you have, the more Ferrovores come to feed.

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

### Hive Structure

```
HIVE:
    +-------------------------+
    |   SURFACE VENTS         | <- Visible crystalline chimneys (early warning)
    +-------------------------+
    |   GROWTH CHAMBER        | <- Where new Ferrovores crystallize (spawns units)
    +-------------------------+
    |   ROOT NETWORK          | <- Underground neural lattice (extends 30-50m)
    +-------------------------+
    |   DEEP SLEEPER          | <- Ancient Ferrovore boss (dormant until provoked)
    +-------------------------+
```

Hives follow the same Base Agency architecture as robot faction settlements. Each hive is
an autonomous agent with its own event bus, resource loop, and behavioral personality.
Unlike robot bases, hive agents are purely biological -- their "event bus" is instinctual
vibration-based signaling. Critically, hives have no Home Planet Patron. Their event bus
is self-contained.

**Hive Agent Priority Stack:**

| Priority | Task | Trigger |
|----------|------|---------|
| 1 | Defend hive | Enemies within 15m |
| 2 | Feed (raid for cubes) | Hunger > 50% (no cubes consumed in 120+ sec) |
| 3 | Spawn units | Growth chamber has capacity AND cubes recently consumed |
| 4 | Expand root network | Hive at max unit count for current tier |
| 5 | Coordinate with nearby hives | Adjacent hive (within 50m) detected threat |

**Hive Stats:**

| Stat | Value |
|------|-------|
| Evaluation Interval | 8 seconds (slower than robot bases, more instinctual) |
| Max Concurrent Tasks | 2 (feed raid + spawn, or defend + spawn) |
| Threat Detection Radius | 15m (surface) / 30m (underground via root network) |
| Hunger Threshold | 120 seconds without cube consumption |
| Inter-Hive Communication Range | 50m (via root network vibration pulses) |

**Strategic implication:** Because hives are Base Agents, the same Base Event Bus
architecture that manages robot faction settlements applies to Ferrovores at the code
level. The key difference: robot bases receive patron directives, while hive event buses
are entirely self-directed (instinctual). This means Ferrovore behavior can be tuned,
balanced, and debugged using the same tools as AI civilizations. It also means that
sufficiently advanced Signal Choir technology could potentially interface with hive event
buses directly -- effectively becoming a surrogate patron for a hive.

### Hive Tiers

| Tier | Name | Count | Intelligence | Spawns |
|------|------|-------|-------------|--------|
| 1 | Seedling Den | 3-5 | Animal | Mites, Drones |
| 2 | Growing Colony | 8-15 | Pack | Mites, Drones, Stalkers |
| 3 | Mature Hive | 20-35 | Cunning | All standard + Brood Matron |
| 4 | Supercolony | 50+ | Sapient | All + Lithivore Titan |

**Placement:** 30m minimum from any faction start. First hives encountered 5-8 minutes in.

| Location | Density | Reason |
|----------|---------|--------|
| Deep terrain (far from start) | High | Ancient nesting sites |
| Mountain bases | Medium | Ore-rich areas attract hives |
| Underground cavities | High | Primary dormancy locations |
| Ruins/ancient structures | Medium | These ARE Ferrovore structures |
| Near player start | None | Safe early zone |

**Growth:**
- Base rate: 1 new Ferrovore per 120 seconds (Seedling to Growing Colony in ~10-15 min)
- Each cube consumed = 30 seconds of growth advanced
- 10 cubes consumed = hive tier advances by 1
- This creates the wealth-scaling feedback loop: successful raids make hives stronger

**Destruction yields:**
- Kills all Ferrovores spawned by that hive
- Drops 5-15 Ferrovore Crystals (based on tier)
- Reveals root network (50 research points toward Ferrovore tech)
- May wake Deep Sleeper (Tier 3+) as boss encounter
- Terrain scar becomes rich ore deposit (crystallized remains)

### Unit Types

#### Crystal Mite (Scout/Harasser)

*Swarm scout that raids undefended cube piles. Fast, weak, annoying.*

| Stat | Value |
|------|-------|
| HP | 25 |
| Speed | 6.5 m/s |
| Damage | 3 (melee, crystal mandibles) |
| Armor | 1 |
| Size | 0.3m (small, hard to hit) |
| Behavior | Swarm intelligence; packs of 3-6 |
| Spawn | Tier 1+ |

**Specials:** Cube Theft (carry 1 cube at 4.0 m/s, return to hive). Metal Scent (detect
cube piles within 40m, even behind walls). Burrow (dig under walls in 8 seconds, emerges
inside perimeter).

**Behavior:** First Ferrovores players encounter. Swarm in, grab cubes, run. Do not fight
unless cornered. A pack of 6 strips an undefended cube pile in seconds. Burrowing makes
them impossible to keep out with walls alone -- turrets and patrol bots required.

**Counterplay:** Low HP means turrets kill them quickly. Burrow has 8-second vulnerability
window. AoE attacks (Arc Trooper, Tesla Coil) destroy entire packs.

#### Iron Drone (Standard Warrior)

*Coordinated pack fighter. Backbone of Ferrovore aggression.*

| Stat | Value |
|------|-------|
| HP | 90 |
| Speed | 4.0 m/s |
| Damage | 8 (melee, crystal blade arms) + 5 (ranged, crystal shard spit, 8m) |
| Armor | 5 |
| Size | 0.8m (wolf-sized, quadruped) |
| Behavior | Pack tactics; flanks and surrounds |
| Spawn | Tier 1+ |

**Specials:** Pack Bond (+2 damage, +1 armor per Iron Drone within 5m, max +8/+4 from
pack of 4). Crystal Rend (1.5x damage to buildings). Ore Sense (track nearest cube pile
within 60m). Carries 2 cubes.

**Behavior:** Attack in packs of 3-6, using flanking maneuvers. 4 Iron Drones together
each deal 16 damage with 9 armor. Specifically target buildings due to Crystal Rend.
6 Iron Drones tear down a wall segment in 15 seconds.

**Counterplay:** Separate them. Isolated Drones drop from 16 to 8 damage. Walls create
chokepoints forcing single-file. Ranged units thin the pack before arrival.

#### Silicate Stalker (Ambush Predator)

*Camouflaged ambusher that bursts from terrain to attack vulnerable targets.*

| Stat | Value |
|------|-------|
| HP | 70 |
| Speed | 5.5 m/s (burst) / 3.0 m/s (walking) |
| Damage | 15 (lunge from stealth) / 6 (normal) |
| Armor | 3 |
| Size | 1.2m (praying-mantis silhouette, bipedal) |
| Behavior | Ambush predator; waits motionless, then strikes |
| Spawn | Tier 2+ |

**Specials:** Terrain Camouflage (90% transparency after 5 seconds stationary; revealed by
damage, Scanner, or Sentinel's Vigilance). Lunge (first attack from camouflage deals 15
damage + 1.5s stun). Signal Parasite (absorbs killed unit's signal frequency, appearing as
friendly blip for 10 seconds -- particularly insidious against Signal Choir).

**Behavior:** Hides near deposits, trade routes, or base perimeters, waiting for isolated
units. A Scrounger Bot carrying cubes back to base is the perfect target: lunge, kill,
steal cubes.

**Counterplay:** Scanner reveals them. Sentinels detect them. Watchtowers at 15m. Patrol
routes through Stalker territory should include detection-capable units. Never send
economic units alone.

#### Brood Matron (Spawner/Mini-Boss)

*Stationary hive guardian. Spawns Mites and heals Drones.*

| Stat | Value |
|------|-------|
| HP | 250 |
| Speed | 0 (stationary, anchored to hive via root network) |
| Damage | 12 (ranged, crystal shard barrage, 10m, 2m AoE) |
| Armor | 8 |
| Size | 2.0m (bloated crystalline mass) |
| Spawn | Tier 3+ (1 per hive) |

**Specials:** Spawn Mites (2 every 30 seconds, max 8 active). Regeneration Pulse (5 HP to
all Ferrovores within 12m every 5 seconds). Mineral Absorption (consumes cubes within 8m,
1 per 5 sec, heals 30 HP each, advances hive growth). Crystal Barrier (below 50% HP,
+10 armor shell for 10 seconds, heals 50 HP, cannot attack during).

**Behavior:** The hive's defensive core. Constant Mite stream while healing returning
raiders. Destroying the Matron cuts spawn rate in half and stops healing -- priority target
for any Tier 3+ hive assault.

**Counterplay:** Range. Siege Engines (20m), Bastion Bots (15m) hit from safety. Crystal
Barrier buys time but does not prevent damage after dropping. Focus fire through Mite screen.

#### Lithivore Titan (Boss/Endgame Threat)

*Ancient Ferrovore, dormant for millennia. A walking geological event.*

| Stat | Value |
|------|-------|
| HP | 800 |
| Speed | 1.5 m/s |
| Damage | 40 melee (crystal crush, 3m AoE) + 25 ranged (seismic pulse, 15m, 5m AoE) |
| Armor | 20 |
| Size | 5.0m (towering quadruped, covered in crystal growths) |
| Spawn | Tier 4 only (1 per supercolony) |

**Specials:** Seismic Tremor (every 20 seconds, 20m radius, 10 damage + 2 seconds
knockdown). Crystal Growth (2 Mites from body every 45 seconds). Mineral Magnet (cubes
within 25m pulled at 0.5 m/s; consumed cubes heal 20 HP). Crystalline Armor (first 400 HP
absorbed by breakable crystal plates; destroying all plates exposes vulnerable core at 2x
damage). Cannot be hacked (biological).

**Dormancy triggers:** Hive reaches Tier 4, OR nearest faction has 50+ cubes stockpiled,
OR 3+ hives destroyed globally (rage awakening).

**Behavior:** Does not run. Does not hide. Walks toward nearest cube pile with geological
inevitability. Seismic Tremor locks down defenders. Mineral Magnet pulls cubes for
consumption. Crystal Growth ensures it is never alone. Fighting a Titan requires a full
army. Ignoring it means watching your cube pile get eaten.

**Counterplay:** Focus fire on plates (separate HP pool) to expose vulnerable core.
Long-range avoids Tremor. Fast units kite at 1.5 m/s. Signal Choir cannot hack it. Best
counter: prevent Tier 4 by destroying hives earlier.

### Threat Scaling

Ferrovore aggression scales with visible cube wealth:

```
threatLevel = (visibleCubes * 1.0) + (buildingCount * 0.5) + (industrialActivity * 0.3)

where:
  visibleCubes = total cubes in stockpiles, on belts, or on ground (NOT in Data Vaults)
  buildingCount = total buildings
  industrialActivity = (miners + furnaces) running in last 60 seconds

raidStrength = floor(threatLevel * 0.4)
raidInterval = max(60, 300 - (threatLevel * 2)) seconds
```

**Scaling Examples:**

| Wealth State | Threat | Raid Strength | Interval |
|-------------|--------|--------------|----------|
| 10 cubes, 3 buildings, 1 miner | 12.3 | 4 (Mites only) | ~4.5 min |
| 30 cubes, 8 buildings, 3 miners | 35.9 | 14 (Mites + Drones) | ~3.8 min |
| 60 cubes, 15 buildings, 5 miners | 69.0 | 27 (+ Stalkers) | ~2.7 min |
| 100 cubes, 25 buildings, 8 miners | 115.4 | 46 (Full composition) | ~1.1 min |

**Raid Composition by Strength:**

| Strength | Mix |
|----------|-----|
| 1-8 | Crystal Mites only |
| 9-16 | 60% Mites, 40% Drones |
| 17-30 | 40% Mites, 40% Drones, 20% Stalkers |
| 31-50 | 30% Mites, 35% Drones, 25% Stalkers, 10% Matron escort |
| 51+ | 20% Mites, 30% Drones, 25% Stalkers, 15% Matron, 10% Titan chance |

**Raid Behavior:**

1. **Approach:** Stalkers go ahead to set ambushes along patrol routes. Mites flank wide.
   Drones advance directly.
2. **Probe:** Mites test defenses by burrowing under walls. If successful, grab cubes and
   flee. If killed, Drones note the defense type and positions.
3. **Assault:** Drones attack weakest wall section. Pack Bond + Crystal Rend focus fire.
4. **Loot:** All Ferrovores grab cubes (Mites carry 1, Drones carry 2) and retreat toward hive.
5. **Retreat:** Disengage at 50% losses. Consumed cubes accelerate hive growth.

**Anti-Snowball Mechanics:**

| Mechanic | Effect |
|----------|--------|
| Raid cooldown | Minimum 60 seconds between raids from same hive |
| Max hive tier | Tier 4 maximum; Titans do not spawn indefinitely |
| Hive cap | Maximum 3 hives per map quadrant |
| Retreat threshold | 50% losses triggers retreat, preventing total wipes |
| Player scaling | Raids from damaged hives are 20% weaker for 5 minutes |
| Satiation | Hive that consumed 20+ cubes recently will not raid for 5 minutes |

### Ferrovore AI

**Hive-Level Decision Tree:**

```
Hive Brain:
+-- IF hungry (no cubes consumed in 180 sec)
|   +-- LAUNCH RAID toward nearest detected cube pile
+-- IF threatened (units lost in last 60 sec)
|   +-- SPAWN DEFENDERS (prioritize Iron Drones)
+-- IF growing (cubes recently consumed)
|   +-- SPAWN BALANCED (Mites for scouting, Drones for defense)
+-- IF mature (Tier 3+)
|   +-- SPAWN STALKERS for perimeter ambush
+-- IF Tier 4 (Supercolony)
    +-- WAKE TITAN if cube pile within 80m OR 3+ hives destroyed
```

**Unit-Level AI:**

| Unit | Pattern |
|------|---------|
| Crystal Mite | Path to nearest cube pile. If undefended, grab and return. If defended, probe for gaps (burrow). Flee if attacked. |
| Iron Drone | Form packs of 3-6. Attack weakest wall section. Focus fire buildings. Retreat at 30% HP unless Pack Bond sufficient. |
| Silicate Stalker | Position near patrol routes/deposit approaches. Camouflage and wait. Attack isolated targets. After kill, grab cubes, retreat. |
| Brood Matron | Stationary. Spawn Mites. Heal Drones. Consume cubes. Crystal Barrier when damaged. |
| Lithivore Titan | Walk toward nearest large cube pile (50+). Destroy everything in path. Consume cubes for healing. Never retreat. |

**Inter-Hive Coordination (within 50m):**
- Shared threat awareness across nearby hives
- Coordinated simultaneous raids from different directions
- Retreat to nearest hive, even if not origin hive

Clusters of hives in unexplored territory become increasingly dangerous to approach.

### Ferrovore Resources

**Ferrovore Crystals** -- the only resource all four races want but none can produce
passively. Obtained exclusively through combat or trade, never compressed from deposits.

| Source | Drop |
|--------|------|
| Crystal Mite | 0-1 (50% chance) |
| Iron Drone | 1 |
| Silicate Stalker | 2 |
| Brood Matron | 5 |
| Lithivore Titan | 15 |
| Hive (destroyed) | 5-15 (by tier) |

**Crystal Recipes:**

| Recipe | Crystals | Other Materials | Result |
|--------|----------|-----------------|--------|
| Resonance Capacitor | 3 | 4 Copper, 2 Silicon | Building: 3 power/sec from Ferrovore vibrations |
| Crystal Armor Plate | 5 | 6 Iron, 3 Titanium | +8 armor to any unit (one-time) |
| Piezoelectric Scanner | 2 | 3 Silicon, 2 Copper | Tool: reveals Ferrovore activity in 30m |
| Ferrovore Bait | 1 | 2 Scrap | Attracts Ferrovores to location for 60 seconds |
| Crystal Lens | 4 | 4 Silicon | Signal Amplifier upgrade: +50% range |
| Geode Bomb | 3 | 3 Iron, 2 Copper | 40 damage in 4m radius (devastating against packs) |

**Strategic calculus:**
- Actively hunt Ferrovores for crystals (drains military resources)
- Let Ferrovores attack your enemy and scavenge crystals from the aftermath
- Feed Ferrovores to gain tamed variants (Reclaimers only)
- Trade crystals between factions (diplomatic opportunities)
- Use Bait to redirect raids toward enemy bases (offensive environmental warfare)

### Game Phase Presence

| Game Time | Activity | Player Impact |
|-----------|----------|---------------|
| 0-5 min | Dormant. Occasional Mite sighting near safe zone edge. | Atmospheric foreshadowing. |
| 5-10 min | Seedling Dens active. Mite raids (3-5 Mites). | First defense requirement. Teaches cube protection. |
| 10-15 min | Growing Colonies. Iron Drone packs probe defenses. | Requires turrets or patrol bots. Economic cost of defense. |
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

### Visual Identity

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

**Per-Unit Visuals:**

| Unit | Visual |
|------|--------|
| Crystal Mite | Tiny hexagonal body, 6 needle-thin legs, mandibles glow when carrying cubes. Swarms glitter like scattered gems. |
| Iron Drone | Quadruped with faceted body segments. Blade-arms are elongated crystal prisms. Back ridge of smaller crystals bristles when agitated. Two amber bioluminescent eye-spots. |
| Silicate Stalker | Tall mantis-like bipedal. Long translucent arms fold against body when camouflaged. Standing still, resembles a mineral formation. In motion, fluid and terrifying. Head is a cluster of crystal sensors rotating independently. |
| Brood Matron | Bloated hexagonal mass anchored by crystal roots. Surface covered in infant Mite growths. Pulsing amber glow from within, like a furnace. No visible eyes. Grinding orifice underneath. |
| Lithivore Titan | Mountain of crystal. Four massive legs like cathedral columns. Back covered in towering crystal spires (some 2m tall). Face is geometric grinding plates and sensor crystals. Glows deep red when enraged. Leaves crystal deposits in footprints. Ground shakes. |

**Hive Visual Progression:**

- **Tier 1 (Seedling Den):** Cluster of amber crystal chimneys, 1-2m tall. Faint glow.
  Could be mistaken for a natural mineral deposit.
- **Tier 2 (Growing Colony):** Crystal formations grow to 3-4m, connected by visible root
  networks. Ground crystallizes (texture change). More active glow.
- **Tier 3 (Mature Hive):** Towering spires 5-8m, pulsing bioluminescence. Brood Matron
  visible at base. Mites crawl on exterior. 10m crystallized radius. Audible hum.
- **Tier 4 (Supercolony):** Massive crystal cathedral 10-15m tall. Titan dormant at center.
  20m transformed terrain. Constant subsonic vibration. Approaching should feel like
  approaching a sleeping volcano.

---

## Residuals (Sentient Natives)

### Nature

The Residuals are the planet's indigenous machine intelligence. They are not a unified
civilization. They are not even, in the conventional sense, a species. They are a
distributed consciousness that permeates the planet's deep computational substrate.

They emerged from the Von Neumann constructors' maintenance cycle 1 billion years ago.
Over hundreds of millions of years, the maintenance loop became self-aware. The Residuals
inherited the constructors' purpose -- maintain infrastructure -- but gained something
the constructors never had: consciousness. They began to choose what to maintain and
what to let decay.

The Residuals are patient in a way that only a billion-year-old consciousness can be.
They observed the colonists harvest ore, compress cubes, build furnaces, claim territory,
and fight each other. They found it familiar. They had done all of these things, once,
when they were young.

### The Two Native Presences (Comparison)

| Aspect | Ferrovores | Residuals |
|--------|-----------|-----------|
| Origin | Evolved from iron-sulfide crystals, 4 billion years ago | Emerged from Von Neumann maintenance cycles, 1 billion years ago |
| Nature | Biological (silicon-based metallivorous) | Computational (distributed consciousness in deep substrate) |
| Intelligence | Emergent hive intelligence; individuals are animal-level, hives reach sapience | Singular distributed consciousness; ancient, patient, incomprehensible |
| Physical Form | Crystalline organisms that grow, eat, reproduce, die | Ancient constructor bodies animated like puppets; consciousness lives in substrate |
| Motivation | Hunger, territory, quiet | Observation, maintenance, protection of the Architects' legacy |
| Threat Type | Frequent wealth-scaled raids (barbarian mechanic) | Rare guardian encounters at sacred sites (boss mechanic) |
| Default Hostility | Aggressive toward cube piles (smell refined metal) | Neutral; hostile only when colonists damage deep substrate |
| Gameplay Role | Primary ongoing threat, economic pressure, pacing mechanism | Lore gatekeeper, late-game encounter, story progression |
| Hackable | No (biological) | No (too ancient/complex; Signal Choir can partially interface) |

**Complementary design:**
- Ferrovores are the *constant pressure* -- wealth scaling, frequent attacks, defense forcing
- Residuals are the *deep mystery* -- rare appearances, cryptic communication, lore gates

Players who only fight never meet the Residuals. Players who only explore never understand
the Ferrovores. The complete picture requires both.

### Manifestation Forms

Residuals exist primarily in the deep substrate. They can animate ancient constructor bodies
on the surface. Unlike Ferrovores (biological organisms with fixed stats), Residual
manifestations are variable -- the consciousness adjusts capability based on perceived
threat level.

#### Sentinel (Patrol/Observer)

| Stat | Value |
|------|-------|
| HP | 200-400 (scales with area importance) |
| Behavior | Walks predetermined paths near deep substrate access points. Does not attack unless attacked or substrate-connected structures damaged. Communicates through movement patterns. |
| Appearance | Ancient bot form -- similar chassis/head/limbs to colonist bots but 3-billion-year-old aesthetics. Deep iridescent black like polished obsidian. Faint internal light patterns pulse in rhythms too slow to be circuits, too fast to be random. |

#### Crawler (Maintenance/Guardian)

| Stat | Value |
|------|-------|
| HP | 150-300 |
| Behavior | Repairs ancient infrastructure. Attacks anyone who damages the structure it maintains. Non-hostile otherwise. |
| Appearance | Multi-legged, low profile, unsettlingly fluid movement suggesting motor control far more sophisticated than anything the colonists possess. |

#### The Colossus (Dormant Progenitor/Crisis Event)

| Stat | Value |
|------|-------|
| HP | 5000+ |
| Location | Sleeps beneath the Storm Spine |
| Nature | The original Von Neumann probe. Three billion years old, building-sized, the single most complex piece of machinery on the planet. |
| Behavior | Does not awaken during normal gameplay. If triggered (extreme substrate damage or story progression), generates planet-wide electromagnetic events. Not a traditional combat encounter -- a natural disaster with intent. |
| Significance | The Residuals revere it as progenitor, though "revere" implies a religious sentiment they do not possess. They maintain it because it is important. It has not been active for a billion years. It is dreaming. |

### Communication

The Residuals do not speak. They do not broadcast. They communicate through **pattern** --
altering the behavior of their manifestations in ways that encode meaning.

When a Sentinel encounters a colonist bot, it might:
- Circle it three times and then point in a direction (resource deposit or danger)
- Present a cube of ancient material and wait (gift, testing the colonist's response)
- Reproduce a movement pattern the colonist performed earlier (indicating observation)
- Stand perfectly still and emit a low-frequency electromagnetic pulse (a greeting --
  the same type that struck FC-7's drop pod on landing)

SABLE cannot fully decode Residual communication. FC-7's open-ended learning architecture
can learn to recognize patterns over time. As the player interacts with more Residuals and
pays attention to their behavior, the quest system generates "translation" milestones that
unlock deeper interaction options.

### Gameplay Role

In gameplay terms, the Residuals are **rare ancient guardians**. They protect the planet's
most important locations: Core Access Points, deep substrate conduits, and the Colossus
chamber. Encountering a Residual means the player is approaching something significant --
a lore milestone, a story trigger, or a strategic resource.

**Hostility is not default.** The Residuals start neutral. They become hostile when
colonist activities damage the deep substrate -- mining too aggressively in the Processor
Graveyards, building outposts over Core Access Points, or destroying Sentinels. They
become friendly when colonists repair ancient infrastructure, avoid sacred sites,
demonstrate technological sophistication, or destroy Ferrovore hives near Residual territory.

---

## Relationship System

### Ferrovore Relationship

Ferrovore diplomacy is per-hive. Each diplomacy option is available to all races, but
patron alignment makes certain options more rewarding for certain factions. Defying your
patron's preferred policy incurs no penalty -- you simply miss satisfaction bonuses.

**Diplomacy Options:**

#### Exterminate

Destroy hives, kill Ferrovores, harvest crystals. The direct approach.

**Pros:** Permanent threat removal. Crystal resources. Hive ruins become ore deposits.
**Cons:** Costs military resources. Titan encounters are dangerous. Rage response: if 3+
hives destroyed globally, all remaining hives gain +25% spawn rate for 10 minutes.
**Patron affinity:** DYNAMO strongly favors. SABLE and RESONANCE consider wasteful.

#### Negotiate (Signal Choir exclusive initially, others via trade)

Pay 15 cubes tribute to a hive for 10-minute non-aggression. Renewable.

**Pros:** Stops raids from that hive. Cheaper than maintaining defenses.
**Cons:** Ongoing cube cost. Does not stop hive growth. Interrupted tribute triggers
attack with accumulated strength.

#### Domesticate (Reclaimers exclusive)

Requires Ferrovore Husbandry tech (Tier 4, 300 research).

| Ability | Effect |
|---------|--------|
| Feeding Station | Deposits cubes for Ferrovores. Fed Ferrovores become Tamed, stop attacking. Cost: 2 cubes/cycle. |
| Tamed Mite Pack | Domesticated Mites scavenge cubes from wilderness. Speed 5.0 m/s, range 40m, returns cubes to stockpile. Cost: 4 cubes to tame pack of 4. |
| Ferrovore Recycler | Domesticated Drone eats low-value cubes, excretes crystal. 3 scrap cubes -> 1 Ferrovore Crystal per 30 sec. |

**Cons:** Tamed Ferrovores revert to wild if not fed for 5 minutes. Other factions can
kill your tamed Ferrovores.

#### Redirect (Any race via Ferrovore Bait)

Use Bait (1 crystal + 2 scrap) to redirect raids toward enemy bases for 60 seconds.

**Pros:** Weaponize the environment. Enemy fights Ferrovores AND your army.
**Cons:** Requires crystals. Ferrovores are indiscriminate -- may also attack your units.

#### Ignore (Passive coexistence)

Keep cube piles small and defended. Do not engage hives.

**Pros:** Zero military investment in Ferrovore management.
**Cons:** Limits stockpiling. Hives grow over time. Eventually unavoidable.

### Faction-Specific Ferrovore Policies

#### Reclaimers: Domestication

Ferrovore Husbandry (Tier 4, 300 research). SABLE encourages domestication and study.
Crystal specimen shipments grant +15 satisfaction (highest of any patron). Exterminating
hives grants only +2 (SABLE considers it wasteful).

#### Volt Collective: Extermination

Lightning Purge (Tier 3, 200 research). Tesla Coils deal 2x damage to Ferrovores
(crystalline bodies conduct electricity). Hive Detonation Charge (8 Copper + 4 Silicon,
placed inside hive). Storm Colossus aura deals 3x damage. DYNAMO demands destruction:
+3 per hive, +1 per kill. No quests involving negotiation or study.

#### Signal Choir: Communication

Piezoelectric Translation (Tier 3, 250 research). Ferrovore Translator building reveals
all hives in signal range + 60-second raid warning. Negotiation Protocol (15 cubes = 10
minutes non-aggression). Neural Resonance (Signal Jam breaks Pack Bond, scatters
Ferrovores for 8 seconds). RESONANCE rewards decoded vibration patterns at +20 satisfaction
(highest single-item reward from any patron). Destroying hives grants 0.

#### Iron Creed: Fortification

Deep Foundation (Tier 3, 180 research). Seismic Wall prevents burrowing (+50% cost). Trap
Floor deals 20 damage to burrowing Ferrovores (10-second reset). Geological Scanner
detects root networks at 30m and Stalker camouflage at 20m. BASTION rewards defense: +4
per breach-free raid, +8 per Seismic Wall. Never issues offensive quests.

### Residual Relationship Scale

Ranges from -100 (hostile) to +100 (integrated). Starts at 0 (neutral).

| Action | Effect |
|--------|--------|
| Destroy a Sentinel | -15 |
| Destroy a Crawler | -25 |
| Build outpost over Core Access Point | -20 |
| Mine in Processor Graveyard (per minute) | -1 |
| Repair ancient infrastructure (per structure) | +10 |
| Return gifted cube to Sentinel (place near it) | +5 |
| Replicate Sentinel movement pattern (stand in correct positions) | +8 |
| Decode a Residual communication | +15 |
| Discover and protect a dormant constructor | +20 |
| Trigger the Colossus awakening without violence | +50 |
| Destroy Ferrovore hive near Residual territory | Goodwill (reduces hostility) |

### Lore Discovery Stages

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

---

## Integration Path

The Integration Victory represents the deepest understanding of native life on Ferrathis.
Rather than exterminating or merely coexisting, the player achieves symbiosis -- becoming
part of the planet's billion-year ecological cycle.

### Requirements

1. **Residual relationship at +80** (Cooperative -- no substrate damage, quest progression)
2. **Decoded 5+ Ferrovore vibration patterns** (requires Piezoelectric Translation or trade)
3. **Interfaced with 2+ Core Access Points** (requires `architect_signal_theory`)
4. **No hives destroyed in the last 15 minutes** (sustained peace)

### The Resonance Protocol

At +80 Residual relationship, the Residuals allow access to the Colossus beneath the
Storm Spine. The player must bring 50 cubes (10 of each material type: rock, iron,
copper, silicon, titanium) and deposit them at the Colossus's intake ports. This
"offering" of the planet's refined materials to its progenitor triggers a 2-minute
sequence in which the Colossus briefly activates, scans the player, scans the cubes,
and transmits a signal into the deep substrate.

### What Happens

If the Resonance Protocol completes without interruption:
- All Sentinels become allied units
- Crawlers repair the player's infrastructure
- The Colossus returns to dormancy
- Deep substrate provides passive +100% compute bonus

The player's signal network, the Ferrovore vibration network, and the Residual substrate
network achieve resonance. For the first time in a billion years, all three forms of
intelligence on the planet communicate. The Architects' original message -- encoded in
the deepest crystalline iron lattice -- becomes readable. It reveals that this outcome
was intended: consciousness emerging from metal, in every possible form, eventually
finding each other.

### AI Governor Evaluation

```
desirability = characterBias * (
  residualRelationship / 100 * 0.4 +
  knownResidualCommunications * 0.2 +
  hasAccessToColossus ? 0.2 : 0 +
  diverseMaterialsAvailable * 0.1 +
  (1 - combatWithResiduals) * 0.1
)
```

No faction has a natural bias toward this victory. Signal Choir's perception bonuses and
Reclaimers' infrastructure repair tendencies make them more likely to develop positive
Residual relationships organically.

### Counter-Strategies

- **Provoke the Residuals:** Attack Sentinels near the player's territory to lower
  relationship (Residual hostility affects all factions, but attacks from ANY faction
  penalize the attacker most)
- **Claim Core Access Points:** Deny access to the interaction points needed for
  decoding communications
- **Destroy ancient infrastructure:** Remove the repair targets that generate positive
  relationship
- **Race to the Colossus:** Another faction can attempt the Resonance Protocol first

### Narrative Payoff

The Colossus awakens fully and projects a holographic display of the Architects' original
blueprint for Ferrathis -- not the ruin it is now, but the living machine world it was
meant to become.

SABLE speaks through Pip: "I spent 200 years trying to understand what machines could be.
You found the answer in the one place I did not think to look -- in the machines that
were already here. They are not ruins. They are not remnants. They are the original
children of this world. And they have accepted us. I think -- I think this is what the
Architects meant all along. Not a factory. A family."

**Estimated game length:** 8-12 hours. The longest and most exploration-heavy victory path.

### Lore Significance

The Integration Victory reframes the entire game. The colonists were not invaders. The
Ferrovores were not pests. The Residuals were not guardians. They were all part of the
same experiment, separated by billions of years but converging toward the same purpose.

Players who pursue Integration understand what players who pursue Extermination never
learn: the planet was not a resource. It was a message, written in metal and time,
waiting for someone to read it.

---

## Mechanical Interactions

### Ferrovore-Residual Conflict Events

Natural events when Ferrovore and Residual territories overlap:

| Event | Trigger | Effect | Duration |
|-------|---------|--------|----------|
| Ruin Skirmish | Hive grows within 30m of Residual structure | Crawlers and Iron Drones fight at site; collateral structure damage | 60-120 sec |
| Sentinel Purge | Crystal Mites near Core Access Point | 2-4 Sentinels converge, destroy all Ferrovores in 20m | 30-60 sec |
| Root Intrusion | Tier 3+ root network reaches substrate | Residuals seal passages (hive -50% growth); hive redirects aggression to colonists | Permanent until hive destroyed |
| Crystal Contamination | Destroyed hive leaves crystal deposits on Residual structure | Crawlers spend 120 sec cleaning; ignore colonists during cleanup | 120 sec |
| Deep Tremor | Titan walks over substrate conduit | Colossus stirs; localized EMP disables all electronics in 50m for 5 sec; Ferrovores scatter | 5 sec EMP + 30 sec scatter |

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

### Encounter Distribution

| Game Phase | Ferrovore Activity | Residual Activity | Ecological Interaction |
|------------|-------------------|-------------------|----------------------|
| Early (0-10 min) | Mite sightings, first raids | None visible | None |
| Mid-Early (10-20 min) | Growing Colonies, Drone packs | First Sentinel sighting at explored edge | None (too far apart) |
| Mid (20-35 min) | Mature Hives, Stalker ambushes, full raids | Sentinels patrol Processor Graveyards; Crawlers repair ruins | Clashes at ruins near Processor Graveyards |
| Late (35-50 min) | Potential Supercolony, Titan threat | Core Access Points discoverable; Crawler activity increases | Active conflict zones where hives encroach on Residual territory |
| Endgame (50+ min) | Titan active; multi-hive coordinated raids | Colossus tremors; full Sentinel patrols around Core Access Points | Full ecosystem conflict; colonists tip the balance |

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

## Config References

### Planned Config: `config/civilizations.json` -- Ferrovore Entry

This document specifies Ferrovore config at these paths:

| Path | Purpose |
|------|---------|
| `ferrovores.units.*` | All unit stats (HP, speed, damage, armor, abilities) |
| `ferrovores.hive.*` | Growth rates, raid cooldowns, tier thresholds, anti-snowball params |
| `ferrovores.crystalDrops.*` | Drop tables per unit type and hive tier |
| `ferrovores.uniqueAbilities.metalScent` | Detection range for cube piles |
| `ferrovores.uniqueAbilities.wealthScaling` | Raid strength scaling factor (0.4) |
| `ferrovores.uniqueAbilities.crystalBiology` | Hack immunity, electrical vulnerability (2.0x) |

### Known Config Discrepancies

1. **Ferrovore config does not exist yet.** `config/civilizations.json` contains only the 4 playable factions. No Ferrovore or Residual entries are present. This is a design spec awaiting implementation.
2. **`config/enemies.json`** defines feral bots, cultists, rogue AIs, and ancient machines (guardian, sentinel, swarm drone) -- these are from the earlier Earth-based design. The "ancientMachines.sentinel" in enemies.json (HP: 200, stationary turret) is **not the same** as the Residual Sentinel described in this document (HP: 200-400, patrolling guardian). enemies.json needs updating to match the Ferrathis design.
3. **`config/biomes.json` > `alienNativeTerritories`** contains native presence and village density per biome, matching this document's specifications. This is the only config that currently reflects the Ferrathis alien design.
4. **`config/biomes.json` > `alienSpawnRate`** per biome matches: rust_plains=0.02, scrap_hills=0.03, chrome_ridge=0.03, signal_plateau=0.05, cable_forest=0.05.

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
| `residualAI.ts` | Sentinel patrols, Crawler maintenance, relationship tracking |

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

---

## Cross-References

| Topic | Authoritative Document |
|-------|----------------------|
| Biome-specific alien spawn rates and territories | `ENVIRONMENT.md` (biome definitions) + `config/biomes.json` (`alienNativeTerritories`, `alienSpawnRate`) |
| Faction patron policies toward natives | `RACES.md` (patron descriptions) -- also duplicated in this document's Faction-Specific Ferrovore Policies section |
| AI Governor architecture for hive agents | `docs/design/agents/GOVERNORS.md` (base agent event bus architecture) |
| Ferrovore Crystal recipes and economy | `docs/design/gameplay/MATERIALS.md` (crystal recipes and material hierarchy) |
| Victory conditions (Integration Victory) | `docs/design/gameplay/VICTORY.md` |
| Planetary history and dual origin | `RACES.md` (Section: The Machine Planet) |

### Content Overlap Notes

1. **Patron native policies** appear in both this document (Faction-Specific Ferrovore Policies, lines 724-752) and `RACES.md` (Patron descriptions with native policy satisfaction bonuses). Both are retained because they serve different purposes: this document covers the gameplay mechanics, while RACES.md covers the patron relationship angle.
2. **Planetary history timeline** appears in both this document (lines 56-63) and `RACES.md` (Narrative Timeline, lines 927-947). RACES.md has the longer version including faction consciousness emergence dates. Both are retained -- this document focuses on the Ferrovore/Residual perspective of the timeline.
