# Progression & Tech Tree

How the player grows from a broken bot to a planetary power.

**Config:** `config/technology.json`
**System:** `src/systems/techResearch.ts`

---

## Progression Philosophy

Syntheteria's progression follows three design principles:

1. **Meaningful choices.** No player can unlock everything in a single game. The tech tree branches force permanent commitments that define your civilization's character. Choosing the Warfare branch at Tier 3 means you are NOT choosing Construction -- and that shapes your strategy for the rest of the session.

2. **Multiple paths.** Every tech branch leads to at least one victory condition. There is no "correct" build order. A Reclaimer player rushing Industry/Construction for Economic Victory plays a fundamentally different game than a Signal Choir player racing through Signals/Infiltration for a Hacking Victory.

3. **Tech as power curve, not power spike.** Individual techs provide incremental improvements. The power comes from how techs chain together. Smelting alone is a 2:1 scrap-to-iron conversion. Smelting + Fast Belt + Auto-Hopper together create an automated iron production line that transforms your economy.

---

## The Five-Act Journey

The progression arc maps to a 6-10 hour first playthrough. Each act introduces new systems, raises the stakes, and opens new decision branches.

### Act 1: Awakening (0-45 minutes)

**Theme:** Isolation and discovery. You are broken, alone, and small.

You start with a broken camera, one working arm, and a grinding ability. The otter hologram teaches the core loop: grind ore, compress into a cube, carry to furnace, craft an upgrade. By the end of Act 1 you have a Harvester T2, a Grabber T1, one belt line running, and your first wall segment protecting a tiny furnace area.

**Key progression beats:**

| Minute | What Happens | System Learned |
|--------|-------------|----------------|
| 0-3 | Camera boots, grind first scrap, compress first cube | FPS movement, harvester, compression |
| 3-5 | Carry cube to furnace, craft Grabber Arm | Grabber tool, contextual crafting |
| 5-10 | Craft Diamond Drill, mine copper | Material diversity, upgrades |
| 10-15 | Place first belt segment between deposit and furnace | Automation |
| 15-30 | First feral bot encounter, build first wall | Combat basics, defense |
| 30-45 | Otter reveals other civilizations exist | Threat awareness |

**The feel:** Manual. Physical. Every cube matters. You carry them one at a time. Your base is three walls and a furnace.

**Design rule:** Act 1 must be completable in under 45 minutes with zero prior knowledge. The otter tells you WHAT to do; the contextual UI shows HOW.

### Act 2: Foundation (45 min - 2.5 hours)

**Theme:** Building the machine. First contact with the wider world.

The player transitions from manual labor to early automation. Belts feed furnaces via Auto-Hoppers. Territory becomes real with the first Outpost claim. Diplomacy begins when an AI civilization demands tribute.

**Completion criteria:**
- One outpost claimed, territory borders visible
- At least one AI civilization discovered
- Signal relay extending vision
- First diplomatic interaction completed
- At least one automated bot (battle or worker) operational
- Belt network connecting 2+ deposits to furnace

### Act 3: Expansion (2.5 - 5 hours)

**Theme:** The factory grows. Alliances form. Technology diverges.

Multi-stage processing chains emerge (smelter, refiner, alloy forge). The player makes their first permanent tech branch choice at Tier 3. AI civilizations begin interacting with each other, not just the player. Territory becomes contested.

**Completion criteria:**
- At least 2 outposts, multi-territory control
- Smelter and Refiner operational
- At least one alloy type produced
- Tech Tree Tier 3 unlocked with branch chosen
- At least one alliance or war with AI civ
- Multiple bot types operational

### Act 4: Confrontation (5 - 8 hours)

**Theme:** War and its costs. Every cube spent on a weapon is a cube not spent on a wall.

At least one all-out war between civilizations. Hacking opens a shadow war. The physical cube economy becomes visceral when you watch an enemy army carry away your stockpile. Tier 4 tech unlocks endgame materials and capabilities.

**Completion criteria:**
- At least one major war fought
- Enemy territory captured or razed
- Tech Tree Tier 4+ unlocked
- Ancient Machine encountered
- Rare earth deposits accessed

### Act 5: Domination (8 - 10+ hours)

**Theme:** Victory conditions converge. The planet itself becomes hostile.

The storm intensifies. Ancient machines awaken across the map. The remaining AI civilizations are either allies, vassals, or cornered enemies. Victory requires sustained excellence, not a single decisive moment.

---

## Tech Tree Overview

The tech tree has 5 tiers arranged in a branching structure. Tier 1 is free and universal. Tiers 2-3 branch into specializations. Tiers 4-5 require converging multiple branches.

```
                    TIER 1: SALVAGE
                    (Starting tech -- free)
                         |
              +----------+-----------+
              |                      |
        TIER 2: INDUSTRY       TIER 2: SIGNALS
        (Processing & power)   (Compute & hacking)
              |                      |
    +---------+--------+   +---------+---------+
    |                  |   |                   |
TIER 3:            TIER 3: TIER 3:          TIER 3:
WARFARE            CONSTRUCTION INFILTRATION RESEARCH
(Military)         (Buildings)  (Hacking)    (Science)
    |                  |   |                   |
    +---------+--------+   +---------+---------+
              |                      |
        TIER 4: DOMINION       TIER 4: ASCENDANCY
        (Military/Territory)   (Tech/Hacking ultimate)
              |                      |
              +----------+-----------+
                         |
                   TIER 5: CONVERGENCE
                   (Endgame -- requires both Tier 4s)
```

**Key constraint:** A single game does NOT allow researching everything. The compute costs escalate faster than compute generation scales. Players must specialize and accept trade-offs.

---

## Per-Tier Breakdown

### Tier 1: Salvage (Cost: 0 compute)

All civilizations start here. Provides the minimum viable factory.

| Tech | Unlocks |
|------|---------|
| `salvage_grinder` | Harvester T1 (scrap only, 1x speed) |
| `basic_compression` | Can compress scrap and rock into cubes |
| `basic_furnace` | Starting furnace (Tier 1 recipes) |
| `basic_belt` | Belt T1 (speed 1.0, no power cost) |
| `basic_grabber` | Grabber T1 (3m range, 1 cube) |
| `lightning_rod` | Lightning rod construction |
| `rock_masonry` | Can stack rock cubes into structures |

**Design intent:** Everything needed for the core loop (grind, compress, carry, process) without any choices. The player learns the systems before facing decisions.

### Tier 2A: Industry (Cost: 50 compute, requires Salvage)

The physical production branch. Bigger machines, better processing, more power.

| Tech | Unlocks |
|------|---------|
| `smelting` | Smelter building (scrap -> iron cubes, 2:1) |
| `copper_refining` | Refiner building (copper cubes -> wire + circuit) |
| `fast_belt` | Belt T2 (speed 2.0, 0.5 power cost) |
| `diamond_drill` | Harvester T2 (scrap + copper + carbon, 2x speed) |
| `power_grid` | Power wire construction (connect buildings) |
| `iron_masonry` | Iron cube structures, iron wall blueprints |
| `auto_hopper` | Hopper that accepts cubes from belts |
| `grabber_mk2` | Grabber T2 (5m range, 2 cubes) |

### Tier 2B: Signals (Cost: 50 compute, requires Salvage)

The information and network branch. Extends reach, enables hacking, builds compute.

| Tech | Unlocks |
|------|---------|
| `signal_relay` | Signal relay building (extends network range) |
| `basic_scanner` | Scanner T1 (see deposit types at 20m) |
| `compute_core` | Compute core building (generates 10 compute) |
| `signal_wire` | Signal wire construction (carry compute between buildings) |
| `basic_hacking` | Can hack feral bots (difficulty <= 5) |
| `encryption` | Your bots gain +2 hack resistance |
| `remote_camera` | Place standalone camera towers for vision |

### Tier 3A: Warfare (Cost: 150 compute, requires Industry)

Military specialization. Bigger bots, better weapons, siege equipment.

| Tech | Unlocks |
|------|---------|
| `battle_bot_chassis` | Battle Bot construction |
| `turret_defense` | Automated turret building |
| `siege_ram` | Siege Ram bot (2x damage to walls) |
| `explosive_charge` | Placeable explosive (destroys 3x3 cube area) |
| `formation_tactics` | Formation Controller (squad movement) |
| `armor_plating` | Bot armor upgrade (+50% HP) |
| `lightning_lance` | Lightning-based ranged weapon (high damage, high power cost) |

### Tier 3B: Construction (Cost: 150 compute, requires Industry)

Infrastructure specialization. Better buildings, faster production, territory control.

| Tech | Unlocks |
|------|---------|
| `express_belt` | Belt T3 (speed 4.0, 1.0 power cost) |
| `separator` | Separator building (rare alloy -> power cells) |
| `alloy_forge` | Alloy furnace (combine 2 material types) |
| `outpost_mk2` | Outpost T2 (radius 20, double claim speed) |
| `blueprint_system` | Blueprint mode for automated wall construction |
| `cube_elevator` | Vertical cube transport (multi-level factories) |
| `titanium_masonry` | Titanium cube structures |

### Tier 3C: Infiltration (Cost: 150 compute, requires Signals)

Hacking specialization. Take over enemy machines, disrupt networks, steal tech.

| Tech | Unlocks |
|------|---------|
| `advanced_hacking` | Can hack civilized bots (difficulty <= 15) |
| `virus_probe` | Deployable virus probe (hacks all bots in radius over time) |
| `signal_jammer` | Signal jammer building (blocks enemy network in radius) |
| `tech_theft` | Hacking an enemy building reveals one of their techs |
| `counter_intelligence` | Detect enemy hack attempts, +5 resistance |
| `network_worm` | After hacking one bot, adjacent bots become easier to hack |
| `puppet_master` | Hacked bots retain enemy faction visual (spy units) |

### Tier 3D: Research (Cost: 150 compute, requires Signals)

Science specialization. Faster tech, better scanning, unique discoveries.

| Tech | Unlocks |
|------|---------|
| `advanced_scanner` | Scanner T2 (full material analysis at 40m) |
| `plasma_cutter` | Harvester T3 (all ores, 3x speed) |
| `research_lab` | Research Lab building (5 compute, +20% research speed) |
| `material_analysis` | Reveal exact cube composition of scanned structures |
| `ancient_interface` | Can interact with Ancient Machine ruins |
| `quantum_computing` | Compute cores generate 2x compute |
| `gravity_manipulation` | Grabber T3 (8m range, 4 cubes, pull distant cubes) |

### Tier 4A: Dominion (Cost: 400 compute, requires Warfare + Construction)

The ultimate physical power branch.

| Tech | Unlocks |
|------|---------|
| `titan_chassis` | Titan Bot construction (massive combat unit, 10x HP) |
| `fusion_reactor` | Fusion reactor building (100 power output, no storm needed) |
| `orbital_relay` | Map-wide signal coverage |
| `matter_compressor` | Compress 2 cubes into 1 of double quality |
| `quantum_extractor` | Harvester T4 (all ores including rare earth, 5x speed) |
| `fortress_gate` | Powered gate building (opens for allies, blocks enemies) |
| `mass_fabrication` | Furnace processes 3x faster |

### Tier 4B: Ascendancy (Cost: 400 compute, requires Infiltration + Research)

The ultimate information power branch.

| Tech | Unlocks |
|------|---------|
| `neural_network` | All hacked bots gain +50% effectiveness |
| `total_surveillance` | See all enemy units regardless of fog of war |
| `planet_core_access` | Begin Planet Core hack (Hacking Victory path) |
| `matter_teleporter` | Teleport cubes between owned outposts (range 50m) |
| `consciousness_split` | Control 2 bots simultaneously (split-screen) |
| `adaptive_ai` | Automated bots learn from combat (improve over time) |
| `zero_day_exploit` | Instantly hack any single target, once per 5 minutes |

### Tier 5: Convergence (Cost: 1000 compute, requires Dominion + Ascendancy)

Endgame tech. Only one Tier 5 tech can be researched per game.

| Tech | Unlocks |
|------|---------|
| `planetary_unification` | All remaining civs receive vassalization offer they cannot refuse |
| `matter_replication` | Duplicate any cube type from compute alone (1 compute = 1 cube) |
| `storm_control` | Direct lightning strikes at will, anywhere on map |
| `ancient_awakening` | Awaken a friendly Ancient Machine (controllable boss unit) |

**Design intent:** Reaching Tier 5 requires investment across BOTH branches of the tree (Dominion needs Warfare + Construction; Ascendancy needs Infiltration + Research; Convergence needs both Tier 4s). This is the most compute-expensive path in the game and the most vulnerable to disruption.

---

## Unlock Dependencies

The prerequisite chain creates a directed acyclic graph. Here are the critical paths:

**Fastest path to military power:**
```
Salvage -> Industry -> Warfare -> battle_bot_chassis (3 tiers, ~350 compute)
```

**Fastest path to hacking:**
```
Salvage -> Signals -> Infiltration -> advanced_hacking (3 tiers, ~250 compute)
```

**Path to Tier 5 (minimum):**
```
Salvage -> Industry -> Warfare + Construction -> Dominion (4 tiers)
Salvage -> Signals -> Infiltration + Research -> Ascendancy (4 tiers)
Dominion + Ascendancy -> Convergence (5 tiers, ~2000+ total compute)
```

**No shortcuts:** Reaching Convergence requires traversing both halves of the entire tree. This takes the full 6-10 hour session and only happens if the player successfully defends their research infrastructure throughout.

---

## Faction-Specific Tech Paths

Each civilization gets free starting tech in their specialty area and reduced costs in preferred branches.

### Starting Tech Asymmetry

| Civilization | Free Starting Tech | Discounted Branch | Cost Modifier |
|-------------|-------------------|-------------------|---------------|
| Reclaimers | `auto_hopper` (normally Tier 2A) | Industry, Construction | 0.7x compute |
| Volt Collective | `lightning_lance` (normally Tier 3A) | Warfare | 0.6x compute |
| Signal Choir | `basic_hacking` (normally Tier 2B) | Infiltration, Research | 0.7x compute |
| Iron Creed | `iron_masonry` (normally Tier 2A) | Construction | 0.5x compute |

### Faction-Exclusive Tech Trees

Beyond the universal tree, each faction has its own exclusive tech branch available only to that race (configured via the `race` field on tech definitions in `technology.json`). These techs enhance the faction's identity and cannot be researched by other races -- though they can be stolen via the `tech_theft` Infiltration tech.

**Reclaimers exclusive techs:**

| Tier | Tech | Effect |
|------|------|--------|
| 2 | Rapid Salvage | Salvage Crane speed +50%, +1 cube per wreckage |
| 2 | Dual-Channel Grinding | Grinder Bots process two ore types simultaneously |
| 3 | Alloy Synthesis | Scrap Forge accepts any 4 cubes, output gains +50% wall HP |
| 3 | Magnetic Resonance | Pull loose cubes from 20m radius to collection point |
| 4 | Ablative Plating | Reactive armor: +4 armor below half HP, +2 base armor all units |
| 4 | Composite Reclamation | Frankenstein Colossus inherits 3 enemy abilities (up from 2) |
| 5 | Industrial Ecology | Recycling Plants convert 3 cubes to 2, 85% return on cannibalization |
| 5 | Perpetual Salvage Engine | Auto-rebuild destroyed units at half HP after 30 seconds |

**Volt Collective exclusive techs:**

| Tier | Tech | Effect |
|------|------|--------|
| 2 | Improved Capacitors | Capacitor Bank +25 capacity, all units +5% speed |
| 2 | Chain Lightning Mk2 | Shock Drone chains to 3 targets, Arc Trooper +1m AoE |
| 3 | Storm Synchronization | Lightning Forges work in any weather, +50% storm power storage |
| 3 | Electromagnetic Pulse | Surge Breakers gain EMP mode (8s building disable) |
| 4 | Overcharge Protocol | Kill energy cascades to buildings, furnaces +20% speed |
| 4 | Storm Rider Plating | -50% lightning damage to all Volt units |
| 5 | Collective Surge | 5+ units in 10m: +25% damage, +2 armor |
| 5 | Perpetual Storm Engine | Storm Colossus 25m aura, artificial lightning every 5s |

**Signal Choir exclusive techs:**

| Tier | Tech | Effect |
|------|------|--------|
| 2 | Expanded Bandwidth | Signal Amplifier +10m range, Relay Drones +1 speed |
| 2 | Cognitive Intrusion | Infiltrator hack time -3s, hack range to 7m |
| 3 | Phantom Multiplication | Phantom Projector creates 5 decoys (up from 3) |
| 3 | Neural Cascade | Hack success slows nearby enemies -20% for 5s in 5m |
| 4 | Quantum Entanglement | Teleport 2 cubes between Signal Amplifiers (5s transfer) |
| 4 | Recursive Hack | Hacked units carry dormant payload, chain-hack 1 generation |
| 5 | Singularity Protocol | Nexus Core Override cooldown halved, target tier 5 units |
| 5 | Omniscience Network | Permanent fog reveal in signal network, see enemy cooldowns |

**Iron Creed exclusive techs:**

| Tier | Tech | Effect |
|------|------|--------|
| 2 | Hardened Alloys | Walls +20% HP, Constructor Bot reinforce cost = 1 cube |
| 2 | Layered Defense Doctrine | Garrison +30% damage, bunkers gain 4th slot |
| 3 | Automated Sentries | Turret fire rate +25%, Bastion Bots gain auto-targeting |
| 3 | Structural Resonance | Connected walls share 30% damage within 5m |
| 4 | Siege Engineering | Siege Engine +5m range, 2s setup, 4m scatter shot |
| 4 | Impervious Bulwark | Walls immune to hacking, all buildings -30% damage |
| 5 | Mobile Fortress Protocol | Citadel Walker garrison = 6, barricade HP +50% |
| 5 | Eternal Foundation | Destroyed buildings leave indestructible foundations for 5 min, rebuild at -60% cost |

### Faction Research Speed Multipliers

From `config/technology.json` `factionResearchBonuses`:

| Faction | Base Research Multiplier | Effective Meaning |
|---------|------------------------|-------------------|
| Reclaimers | 0.8x | Slowest researchers -- offset by economic efficiency |
| Iron Creed | 0.9x | Below average -- offset by defensive sustainability |
| Volt Collective | 1.0x | Baseline research speed |
| Signal Choir | 1.5x | Fastest researchers -- their primary advantage |

Additionally, Signal Choir can research 2 techs in parallel (`signalChoirParallelResearch: 2` in config) while all other factions are limited to 1 concurrent research.

---

## Difficulty Curve

### Early Game: Forgiving (Acts 1-2)

- Feral bots are weak and infrequent
- Storm is in Calm phase (lightning rods generate moderate power, no damage to bots)
- AI civilizations are focused on building, not raiding
- Resources are abundant near starting location
- The otter hologram provides contextual guidance without being prescriptive
- One belt line and one furnace are sufficient to progress

### Mid Game: Escalating (Act 3)

- AI civilizations become diplomatically active (tributes, alliances, border disputes)
- Storm enters Rising/Storm phases (unprotected bots take damage)
- Resource pressure increases -- nearby deposits deplete, forcing expansion
- Tech branch choices create real trade-offs (cannot do everything)
- First organized raids on the player's cube stockpile
- Environmental hazards begin (acid rain at 20 min, scrap avalanches at 30 min)

### Late Game: Demanding (Acts 4-5)

- Full-scale wars with 15+ bot armies and siege engines
- Storm reaches Tempest/Convergence phase (constant lethal lightning)
- Ancient Machines awaken (boss-tier threats guarding key locations)
- Multiple simultaneous pressures: war, storms, resource management, research
- Victory conditions require sustained execution under pressure, not a single decisive action
- Environmental hazards at full intensity (EMP pulses at 60 min, sinkholes, magnetic storms)

### The Power Curve

The player's power relative to threats follows a deliberate shape:

```
Power  ^
       |         xxxxxxxxx  Act 4: Player peaks
       |        x         x
       |       x           x  Act 5: Threats catch up
       |     xx             xx
       |    x                 x
       |  xx                   x  Storm convergence
       | x    Act 2-3: Growth    x
       |x                         x
       x  Act 1: Vulnerable         x  Can you sustain?
       +----+----+----+----+----+-----> Time
       0   1hr  2hr  3hr  5hr  8hr
```

The player is weakest at the start and strongest around Acts 3-4, when their factory is humming and their tech advantage is at its peak. But the planet's threats continue to escalate, so the late game becomes a question of whether the player can sustain their advantage long enough to achieve a victory condition before the storm, ancient machines, and rival civilizations overwhelm them.

---

## Research Mechanics

### Compute as Research Currency

Research is fueled by compute points, generated by:
- **Compute Cores** -- 10 compute each (20 with `quantum_computing`)
- **Research Labs** -- 5 compute each, plus +20% research speed bonus
- **Signal relays** -- Extend compute network range (compute does not generate without connectivity)

Compute is also spent on hacking, bot management, and network operations. A faction pursuing aggressive research must sacrifice compute for other operations.

### Research Flow

1. Player (or AI governor) selects a tech from the available pool (prerequisites met, not yet researched)
2. Each tick, the system applies available compute toward the active research
3. Effective compute is modified by faction research multiplier and tech-faction affinity:
   ```
   effectiveCompute = compute * factionMultiplier * (1.5 if tech.race === faction)
   ```
4. When accumulated progress reaches the tech's `researchCost`, the tech completes
5. Unlock effects are applied immediately (new buildings, bonuses, abilities)
6. Only one tech can be researched at a time (Signal Choir: two)

### Research Acceleration

- **Territory bonus:** Each outpost controlled provides +5% research speed (additive). Controlling 10 outposts = +50% research speed. This creates a positive feedback loop between expansion and technology.
- **Research building bonus:** Each Research Lab adds +20% to base research rate (configured in `researchMechanics.researchBuildingBonus`).
- **Faction affinity:** Researching a tech tagged with your race ID provides a 1.5x speed bonus.

### Tech Sources: Patron vs. Local

Every tech in `technology.json` has a `source` field:

| Source | Meaning | Requirement |
|--------|---------|-------------|
| `patron` | Delivered by home-planet AI via otter hologram | Patron satisfaction above threshold (0.3), requires shipment |
| `local` | Discovered/developed on-planet | Requires a Research Lab building |

Early techs (Tiers 1-2) tend to come from the patron. Mid-to-late techs (Tiers 3-5) are local discoveries. Gaining independence from the patron is a natural progression as local research capability grows.

### Tech Trading and Stealing

**Trading:** Two allied civilizations can exchange a known tech. Requirements:
- Both civs at peace
- 60 seconds of signal connection between outposts within 30m
- Receiving civ still pays 50% compute cost

**Stealing:** The `tech_theft` tech (Tier 3C: Infiltration) enables this. Hacking an enemy building built with a tech you lack reveals that tech at 75% compute cost. This creates meaningful raid targets beyond cube stockpiles -- you might attack specifically to hack an enemy Research Lab and steal their `plasma_cutter` tech.

---

## Unlock Cascades

Every discovery opens 2-3 new possibilities. This is the "just one more turn" effect applied to a physical factory.

```
Mine first copper ->
    +-> Craft Wire Bundle -> Build power wire -> Connect furnace to distant rod
    +-> Craft Belt Segment -> Automate cube transport -> Free time for exploration
    +-> Upgrade Grabber -> Carry 2 cubes -> Double manual transport speed
         +-> Stack cubes faster -> Build walls faster -> Survive first raid
         +-> Carry cubes to trade -> First diplomatic exchange -> Alliance
              +-> Allied tech trade -> Get Smelter early -> Iron cubes ahead of schedule
              +-> Allied vision sharing -> See more of map -> Find titanium
```

**Design rule:** No unlock should be a dead end. Every new capability must open at least two downstream possibilities. If a tech only enables one thing, it should be folded into another tech or expanded.

---

## Discovery Events

Beyond the tech tree, the world contains discoverable one-time bonuses that shortcut or augment normal progression.

| Discovery | Location | Reward |
|-----------|----------|--------|
| Ancient Blueprint | Ruin sites, Colossus loot | Unique recipe not in any tech tree |
| Memory Fragment | Scattered in ruins | Lore + 25 compute bonus |
| Otter Cache | Near otter hologram spawn points | 10 cubes of random material |
| Reactor Core | Deep in mountain biome | Unlocks Fusion Reactor recipe (normally Tier 4) early |
| Signal Ghost | Processor Graveyard biome | Permanently reveals all deposits within 50m |

These are not reliable progression paths -- they are windfalls that reward exploration and create unique per-game stories.

---

## Post-Victory Progression

### Challenge Modes (unlocked after first victory)

| Mode | Modifier |
|------|----------|
| Speed Run | Victory timer visible, storm escalation 2x faster |
| Iron Man | No save/load, permadeath for all bots |
| Pacifist | No weapons or turrets, must win via economy or hacking |
| Storm Chaser | Start at Storm phase, massive power + massive danger |
| Lone Wolf | No AI civilizations, only ancient machines and ferals |
| Outnumbered | 4 AI opponents starting with Tier 2 tech |

### New Game+

After any victory:
- **Faction mixing:** Choose any 2 faction abilities (e.g., Reclaimer with Signal Choir hacking bonus)
- **Tech head start:** Begin with all Tier 1 + one Tier 2 branch already researched
- **Veteran bot:** Starting bot retains one upgrade from the previous run
- **Increased difficulty:** AI civs start with +1 tech tier, storm escalation 25% faster

---

## Config Reference

All progression values live in `config/technology.json`. The file contains three top-level sections:

**`tiers`** -- Five tier definitions with name, base compute cost, and unlock lists. These are the tier gates that determine when a branch becomes available.

**`techTree`** -- Array of individual tech definitions. Each entry has:
- `id` -- Unique identifier
- `name` -- Display name
- `tier` -- Which tier (1-5)
- `researchCost` -- Compute points required
- `prerequisites` -- Array of tech IDs that must be completed first
- `effects.unlocks` -- Array of building/ability/item IDs this tech enables
- `effects.bonuses` -- Key-value pairs of stat modifiers (e.g., `harvestSpeed: 0.1`)
- `race` -- Faction ID for exclusive techs, or `null` for universal
- `source` -- `"patron"` or `"local"` (determines delivery method)

**`factionResearchBonuses`** -- Per-faction multiplier applied to all research.

**`researchMechanics`** -- Global research rules:
- `baseResearchRate: 1`
- `researchBuildingBonus: 0.2`
- `maxParallelResearch: 1`
- `signalChoirParallelResearch: 2`
- `raceTechsRequireRaceMatch: true`
- `patronTechDeliveryMethod: "otter_hologram"`
- `localTechRequiresResearchBuilding: true`

The implementation in `src/systems/techResearch.ts` reads this config at module load and exposes `techResearchSystem()` as the tick-level entry point. Per-faction state is tracked in a module-level `Map<string, FactionResearchState>` with `_reset()` via `resetTechResearch()` for test cleanup.
