# Syntheteria -- Progression & Technology

How the player grows from a broken bot to a planetary power.

**Config:** `config/technology.json`
**System:** `src/systems/techResearch.ts`

**Canonical sources merged here:**
- `docs/design/progression-evolution-design.md` -- vision, pacing, resource chain evolution
- `docs/design/003-4x-interaction-governors.md` -- 4X tech integration, governor research behavior
- `config/technology.json` -- live balance data (tiers, costs, prerequisites, faction techs)

**See also:**
- `docs/design/gameplay/VICTORY.md` -- how tech tiers gate victory conditions (Technology Victory requires Tier 5)
- `docs/design/gameplay/MATERIALS.md` -- resource chain evolution that progression unlocks
- `docs/design/agents/GOVERNORS.md` -- AI research decision-making via GOAP

---

## Progression Philosophy

Syntheteria's progression follows three design principles:

1. **Meaningful choices.** No player can unlock everything in a single game. The tech tree branches force permanent commitments that define your civilization's character. Choosing the Warfare branch at Tier 3 means you are NOT choosing Construction -- and that shapes your strategy for the rest of the session.

2. **Multiple paths.** Every tech branch leads to at least one victory condition. There is no "correct" build order. A Reclaimer player rushing Industry/Construction for Economic Victory plays a fundamentally different game than a Signal Choir player racing through Signals/Infiltration for a Hacking Victory.

3. **Tech as power curve, not power spike.** Individual techs provide incremental improvements. The power comes from how techs chain together. Smelting alone is a 2:1 scrap-to-iron conversion. Smelting + Fast Belt + Auto-Hopper together create an automated iron production line that transforms your economy.

---

## Tech Tree Overview

The tech tree has 5 tiers arranged in a branching structure. Tier 1 is free and universal. Tiers 2-3 branch into specializations. Tiers 4-5 require converging multiple branches.

```
                    TIER 1: SCRAP (SALVAGE)
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

### Design vs. Config Reconciliation

The design vision uses the branching tree above. The live `config/technology.json` implements this with a flat `tiers` array (Scrap, Refined, Precision, Advanced, Quantum) plus a `techTree` array where each tech carries its own `tier`, `prerequisites`, and `race` fields. The branching structure emerges from prerequisite chains rather than explicit branch labels. This is deliberate -- it allows the same config format to express both the universal tree and faction-exclusive sub-trees.

| Design Tier | Config Tier Name | Config Cost | Branch Mapping |
|-------------|-----------------|-------------|----------------|
| Tier 1: Salvage | Scrap | 0 | Universal starting techs |
| Tier 2: Industry / Signals | Refined | 50 | Split by prerequisites |
| Tier 3: Warfare / Construction / Infiltration / Research | Precision | 150 | Split by prerequisites |
| Tier 4: Dominion / Ascendancy | Advanced | 400 | Converging prerequisites |
| Tier 5: Convergence | Quantum | 800 | Requires both Tier 4 branches |

---

## The Five-Act Journey

The progression arc maps to a 6-10 hour first playthrough. Each act introduces new systems, raises the stakes, and opens new decision branches. The pacing follows the Civilization model: early turns are short and exploratory, mid-game is a web of interlocking decisions, late game is large-scale strategic execution.

### Act 1: Awakening (0-45 minutes)

**Theme:** Isolation and discovery. You are broken, alone, and small.

You start with a broken camera, one working arm, and a grinding ability. The otter hologram teaches the core loop: grind ore, compress into a cube, carry to furnace, craft an upgrade. By the end of Act 1 you have a Harvester T2, a Grabber T1, one belt line running, and your first wall segment protecting a tiny furnace area.

**Key progression beats:**

| Minute | What Happens | System Learned |
|--------|-------------|----------------|
| 0-3 | Camera boots. Walk to scrap deposit. Hold action to grind. Capacity gauge fills. Compress: screen shake, pressure gauges, first cube ejects. | FPS movement, harvester, compression |
| 3-5 | Carry cube to furnace. Drop in hopper. Tap furnace. Radial menu. Craft Grabber Arm. | Grabber, contextual interaction, crafting |
| 5-10 | Craft Diamond Drill. Mine copper for first time. | Material diversity, upgrades |
| 10-15 | Place first belt segment between deposit and furnace. | Automation begins |
| 15-30 | Otter: "Other machines are watching your cubes..." First feral bot encounter. Fight or flee. Build first wall. | Threat awareness, combat basics, defense |
| 30-45 | Otter: "There are others like you out there. Some are friendly. Most are not." | Civilization reveal |

**Act 1 completion criteria:**
- Player has Harvester T2, Grabber T1, Scanner T1
- At least one belt line operational
- First wall segment protecting furnace area
- First feral bot defeated or driven off
- Player understands: grind, compress, carry, process, build

**The feel:** Small. Manual. Every cube matters. You carry them one at a time. Your base is three walls and a furnace. The horizon is vast and unknown. You can see distant lights from other civilizations but cannot reach them yet.

**Design rule:** Act 1 must be completable in under 45 minutes with zero prior knowledge. Every action teaches by doing. The otter never tells you what button to press -- it tells you what to do and the contextual UI shows the how.

### Act 2: Foundation (45 min - 2.5 hours)

**Theme:** Building the machine. First contact with the wider world.

The player transitions from manual labor to early automation. Belts feed furnaces via Auto-Hoppers. Territory becomes real with the first Outpost claim. Diplomacy begins when an AI civilization demands tribute.

**Key progression beats:**

| Time | What Happens | System Learned |
|------|-------------|----------------|
| 0:45 | Build first Auto-Hopper (belt feeds furnace). | Multi-machine automation |
| 1:00 | Discover silicon cluster. Cannot mine yet (needs T3). | Resource gating, exploration motivation |
| 1:10 | First contact: distant lights, radio crackle, AI civ scout spotted. | Fog of war, other civilizations |
| 1:20 | Build Outpost Core. Claim first territory. | Territory system |
| 1:40 | Enemy scout enters territory. Diplomatic popup: "The Volt Collective demands tribute." | Diplomacy introduction |
| 2:00 | Build signal relay. Extend network range. | Signal/compute network |
| 2:20 | Craft first Battle Bot chassis. Set to patrol perimeter. | Unit construction, bot automation |

**Completion criteria:**
- One outpost claimed, territory borders visible
- At least one AI civilization discovered
- Signal relay extending vision
- First diplomatic interaction completed
- At least one automated bot (battle or worker) operational
- Belt network connecting 2+ deposits to furnace

### Act 3: Expansion (2.5 - 5 hours)

**Theme:** The factory grows. Alliances form. Technology diverges. Choices narrow.

Multi-stage processing chains emerge (smelter, refiner, alloy forge). The player makes their first permanent tech branch choice at Tier 3. AI civilizations begin interacting with each other, not just the player. Territory becomes contested.

**Key progression beats:**

| Time | What Happens | System Learned |
|------|-------------|----------------|
| 2:30 | Unlock Smelter. Scrap iron cubes become iron cubes (2:1). | Multi-stage processing |
| 3:00 | Iron walls. 180 HP vs scrap's 100 HP. Real defense. | Material strategy in defense |
| 3:15 | Unlock Refiner. Copper cubes become wire bundles + circuit boards. | Complex processing chains |
| 3:30 | First alloy: Iron + Copper cubes in furnace = Steel cubes. | Alloy system |
| 3:45 | AI civ declares war on another AI civ. Choose sides or stay neutral. | Alliance system |
| 4:30 | Build Formation Controller. Battle bots move in squad formations. | Military formations |
| 5:00 | Unlock Tech Tree Tier 3 (Precision). Choose branch: Military or Hacking. | Tech specialization |

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

**Key progression beats:**

| Time | What Happens | System Learned |
|------|-------------|----------------|
| 5:00 | Major AI civ launches full assault. 15+ bots, siege engines. | Large-scale combat |
| 5:30 | Wall breach. Enemy bots streaming through. Rubble cascading. | Breach/topple mechanics |
| 5:45 | Counter-hack enemy command relay. Enemy bots freeze for 10 seconds. | Tactical hacking |
| 6:00 | Push into enemy territory. See their cube stockpiles. Decision: raid or raze. | Offensive strategy |
| 7:00 | Unlock Quantum Extractor (T4 Harvester). Mine rare earth deposits. | Endgame materials |
| 7:15 | Ancient Machine Guardian awakens. Boss encounter. | Ancient machines (boss) |
| 8:00 | One AI civilization eliminated or vassalized. Map control shifts. | Civilization elimination |

**Completion criteria:**
- At least one major war fought
- Enemy territory captured or razed
- Tech Tree Tier 4+ unlocked
- Ancient Machine encountered
- Rare earth deposits accessed

### Act 5: Domination (8 - 10+ hours)

**Theme:** Victory conditions converge. The planet itself becomes hostile.

The storm intensifies. Ancient machines awaken across the map. The remaining AI civilizations are either allies, vassals, or cornered enemies. Victory requires sustained excellence, not a single decisive moment.

**The feel:** The planet is yours, or burning, or united under your signal. Your factory stretches across multiple biomes. Your cube stockpile is measured in the thousands. Your bots number in the dozens. The storm rages overhead, but your lightning rods drink it like fuel. The otter hologram appears one last time: "Not bad, for a broken bot."

---

## Resource Chain Evolution

The physical cube economy is the soul of Syntheteria. It must feel fundamentally different at each stage of the game. Early game is manual labor. Mid game is mechanical automation. Late game is industrial logistics approaching magic.

### Early Game: The Grind (Acts 1-2)

**The loop:** Walk to deposit. Hold button. Grind. Walk back. Compress. Carry cube. Drop in furnace. Wait. Pick up output. Install or use. Repeat.

```
Deposit -> [manual grind] -> Powder -> [manual compress] -> Cube -> [manual carry] -> Furnace -> Output
```

**Materials available:** Rock, Scrap Iron
**Processing:** Basic Furnace only (Tier 1 recipes)
**Transport:** Walking with Grabber (1 cube at a time)
**Storage:** Cubes on the ground near furnace

**Key numbers:**
- Grind speed: 1 unit/second (Harvester T1)
- Compression threshold: 40 powder (rock), 60 powder (scrap)
- Carry capacity: 1 cube (Grabber T1)
- Furnace processing: 8-15 seconds per recipe
- Time to produce one iron plate from scratch: ~90 seconds

**The feel:** Physical. Laborious. Every cube has weight. You know exactly how many you have because you can count them. Losing one to a feral bot raid is personal.

### Mid Game: The Factory (Acts 2-3)

**The loop:** Belts carry cubes from deposit miners to smelters to furnaces to stockpiles. Player manages the logistics network, places new buildings, extends territory.

```
Deposit -> [auto-miner] -> Cube -> [belt] -> Smelter -> [belt] -> Refined Cube -> [belt] -> Furnace -> Output
                                                                                                 |
                                  [belt] <- Alloy Forge <- [belt] <- Multiple Refined Cubes -----+
```

**New mechanics: Alloy Creation.** Combining two material cubes in an Alloy Forge produces a new material with combined properties. This is the mid-game's key innovation -- materials that do not exist naturally.

| Alloy | Recipe | Properties |
|-------|--------|-----------|
| Steel | 1 Iron + 1 Carbon | Hardness 2.5, Weight 2.0, HP 250/cube |
| Bronze | 1 Copper + 1 Rock | Hardness 1.2, Conductivity 0.6, HP 120/cube |
| Electrum | 1 Copper + 1 Silicon | Conductivity 1.5, Signal boost +20% |
| Titanium Steel | 1 Titanium + 1 Iron | Hardness 3.5, Weight 2.8, HP 350/cube |

**Key numbers:**
- Belt speed: 2.0 cubes/second (T2)
- Smelter throughput: 1 cube every 10 seconds
- Alloy Forge throughput: 1 alloy cube every 15-40 seconds
- Miner output: 1 cube every 10 seconds (powered)
- Time to produce one steel cube from scratch: ~50 seconds (automated)

### Late Game: The Machine (Acts 4-5)

**The loop:** Multi-level factory complexes with cube elevators, express belts, and specialized processing chains. Matter compression doubles cube quality. Teleporters move cubes between outposts. The player is an architect, not a laborer.

```
Multiple Deposits -> [auto-miners] -> Cubes -> [express belts] ->
    +-> Smelters -> Iron
    +-> Refiners -> Wire + Circuit
    +-> Separators -> Power Cells
    +-> Alloy Forges -> Steel, Electrum, Titanium Steel
                |
    [cube elevators] -> Multi-level storage
                |
    [matter teleporter] -> Remote outpost fabricators
                |
    [matter compressor] -> Double-quality cubes
                |
    [mass fabrication furnace] -> 3x speed output
```

**New late-game mechanics:**

**Matter Compression (Tier 4):** Feed 2 cubes of the same material into a Matter Compressor. Output: 1 cube of 2.0 quality (double HP, double crafting value). A wall of compressed titanium (600 HP/cube) is nearly indestructible.

**Matter Teleportation (Tier 4):** Build teleporter pads at two outposts within 50m. Cubes placed on one pad appear at the other after 3 seconds. Eliminates long belt lines between distant outposts, but the power cost is enormous (10 power per teleport).

**Matter Replication (Tier 5):** Spend compute to create cubes from nothing. 1 compute = 1 cube (of any type you have previously compressed). Breaks the physical economy's constraints but at enormous compute cost. A civ with 500 compute can produce 500 cubes per minute -- but doing so leaves zero compute for hacking, bot management, or research.

**Key numbers:**
- Express belt speed: 4.0 cubes/second
- Matter Compressor: 1 compressed cube every 30 seconds
- Matter Teleporter: 1 cube every 3 seconds, 10 power/teleport
- Mass Fabrication: 3x furnace speed
- Matter Replication: 1 cube/compute, instant, any material

---

## Per-Tier Breakdown

### Tier 1: Scrap / Salvage (Cost: 0 compute)

All civilizations start here. Provides the minimum viable factory.

**Design tier unlocks (vision):**

| Tech | Unlocks |
|------|---------|
| `salvage_grinder` | Harvester T1 (scrap only, 1x speed) |
| `basic_compression` | Can compress scrap and rock into cubes |
| `basic_furnace` | Starting furnace (Tier 1 recipes) |
| `basic_belt` | Belt T1 (speed 1.0, no power cost) |
| `basic_grabber` | Grabber T1 (3m range, 1 cube) |
| `lightning_rod` | Lightning rod construction |
| `rock_masonry` | Can stack rock cubes into structures |

**Live config techs (from `technology.json`):**

| Tech ID | Research Cost | Unlocks | Bonuses |
|---------|--------------|---------|---------|
| `scrap_processing` | 30 | basic_belt, basic_furnace | -- |
| `basic_smelting` | 40 | lightning_rod | harvestSpeed +10% |
| `belt_transport` | 35 | belt_mk1 | -- |

All three Tier 1 techs have `source: "patron"` (delivered via otter hologram) and no prerequisites.

**Design intent:** Everything needed for the core loop (grind, compress, carry, process) without any choices. The player learns the systems before facing decisions.

### Tier 2: Refined (Cost: 50 compute)

The tree branches here. Techs split into the Industry path (physical production) and the Signals path (information and networking) based on their prerequisites.

**Industry path (requires scrap_processing or basic_smelting):**

| Tech | Unlocks |
|------|---------|
| `smelting` | Smelter building (scrap -> iron, 2:1) |
| `copper_refining` | Refiner building (copper cubes -> wire + circuit) |
| `fast_belt` | Belt T2 (speed 2.0, 0.5 power cost) |
| `diamond_drill` | Harvester T2 (scrap + copper + carbon, 2x speed) |
| `power_grid` | Power wire construction |
| `iron_masonry` | Iron cube structures, iron wall blueprints |
| `auto_hopper` | Hopper that accepts cubes from belts |
| `grabber_mk2` | Grabber T2 (5m range, 2 cubes) |

**Signals path (requires basic_smelting):**

| Tech | Unlocks |
|------|---------|
| `signal_relay` | Signal relay building (extends network range) |
| `basic_scanner` | Scanner T1 (see deposit types at 20m) |
| `compute_core` | Compute core building (generates 10 compute) |
| `signal_wire` | Signal wire construction |
| `basic_hacking` | Can hack feral bots (difficulty <= 5) |
| `encryption` | Your bots gain +2 hack resistance |
| `remote_camera` | Standalone camera towers for vision |

**Live config techs at Tier 2:**

| Tech ID | Research Cost | Prerequisites | Unlocks | Bonuses |
|---------|--------------|---------------|---------|---------|
| `automated_mining` | 80 | scrap_processing | auto_miner | miningRate +20% |
| `outpost_construction` | 90 | scrap_processing | outpost | claimRadius +15% |
| `signal_relay_network` | 100 | basic_smelting | signal_relay | signalRange +20% |
| `copper_refining` | 85 | basic_smelting | copper_ingot, copper_wire | -- |

### Tier 3: Precision (Cost: 150 compute)

Four branches emerge. Each represents a strategic specialization. The branch chosen at Tier 3 has the most impact on the player's long-term strategy.

**3A: Warfare** (requires Industry) -- Bigger bots, better weapons, siege equipment.

| Tech | Unlocks |
|------|---------|
| `battle_bot_chassis` | Battle Bot construction |
| `turret_defense` | Automated turret building |
| `siege_ram` | Siege Ram bot (2x damage to walls) |
| `explosive_charge` | Placeable explosive (3x3 cube area) |
| `formation_tactics` | Formation Controller (squad movement) |
| `armor_plating` | Bot armor upgrade (+50% HP) |
| `lightning_lance` | Lightning-based ranged weapon |

**3B: Construction** (requires Industry) -- Better buildings, faster production, territory control.

| Tech | Unlocks |
|------|---------|
| `express_belt` | Belt T3 (speed 4.0, 1.0 power cost) |
| `separator` | Separator building (rare alloy -> power cells) |
| `alloy_forge` | Alloy furnace (combine 2 material types) |
| `outpost_mk2` | Outpost T2 (radius 20, double claim speed) |
| `blueprint_system` | Blueprint mode for automated wall construction |
| `cube_elevator` | Vertical cube transport (multi-level factories) |
| `titanium_masonry` | Titanium cube structures |

**3C: Infiltration** (requires Signals) -- Take over enemy machines, disrupt networks, steal tech.

| Tech | Unlocks |
|------|---------|
| `advanced_hacking` | Can hack civilized bots (difficulty <= 15) |
| `virus_probe` | Deployable virus probe (hacks bots in radius) |
| `signal_jammer` | Signal jammer building (blocks enemy network) |
| `tech_theft` | Hacking an enemy building reveals one of their techs |
| `counter_intelligence` | Detect enemy hack attempts, +5 resistance |
| `network_worm` | Adjacent bots become easier to hack |
| `puppet_master` | Hacked bots retain enemy faction visual (spy units) |

**3D: Research** (requires Signals) -- Faster tech, better scanning, unique discoveries.

| Tech | Unlocks |
|------|---------|
| `advanced_scanner` | Scanner T2 (full material analysis at 40m) |
| `plasma_cutter` | Harvester T3 (all ores, 3x speed) |
| `research_lab` | Research Lab (5 compute, +20% research speed) |
| `material_analysis` | Reveal exact cube composition of scanned structures |
| `ancient_interface` | Can interact with Ancient Machine ruins |
| `quantum_computing` | Compute cores generate 2x compute |
| `gravity_manipulation` | Grabber T3 (8m range, 4 cubes, pull distant cubes) |

**Live config techs at Tier 3:**

| Tech ID | Research Cost | Prerequisites | Unlocks | Bonuses |
|---------|--------------|---------------|---------|---------|
| `turret_defense` | 180 | automated_mining, copper_refining | turret_mk1 | turretDamage +10% |
| `combat_bots` | 200 | automated_mining | combat_bot, patrol_route | botSpeed +15% |
| `wall_reinforcement` | 160 | outpost_construction | reinforced_wall | wallDurability +25% |
| `advanced_smelter` | 170 | copper_refining | smelter_mk2 | smeltingSpeed +20% |

### Tier 4: Advanced (Cost: 400 compute)

**4A: Dominion** (requires Warfare + Construction) -- Ultimate physical power.

| Tech | Unlocks |
|------|---------|
| `titan_chassis` | Titan Bot (massive combat unit, 10x HP) |
| `fusion_reactor` | Fusion reactor (100 power, no storm needed) |
| `orbital_relay` | Map-wide signal coverage |
| `matter_compressor` | Compress 2 cubes into 1 of double quality |
| `quantum_extractor` | Harvester T4 (all ores, 5x speed) |
| `fortress_gate` | Powered gate (opens for allies, blocks enemies) |
| `mass_fabrication` | Furnace processes 3x faster |

**4B: Ascendancy** (requires Infiltration + Research) -- Ultimate information power.

| Tech | Unlocks |
|------|---------|
| `neural_network` | Hacked bots gain +50% effectiveness |
| `total_surveillance` | See all enemy units regardless of fog of war |
| `planet_core_access` | Begin Planet Core hack (Hacking Victory path) |
| `matter_teleporter` | Teleport cubes between outposts (range 50m) |
| `consciousness_split` | Control 2 bots simultaneously |
| `adaptive_ai` | Automated bots learn from combat |
| `zero_day_exploit` | Instantly hack any target, once per 5 minutes |

**Live config techs at Tier 4:**

| Tech ID | Research Cost | Prerequisites | Unlocks | Bonuses |
|---------|--------------|---------------|---------|---------|
| `titanium_processing` | 350 | advanced_smelter, turret_defense | titanium_ingot, titanium_plate | cubeDurability +30% |
| `advanced_fabrication` | 380 | combat_bots, advanced_smelter | fabricator_mk2, express_belt | craftingSpeed +25% |
| `network_infiltration` | 400 | signal_relay_network, combat_bots | hacking_module, signal_jammer | hackSpeed +30% |
| `fortress_architecture` | 360 | wall_reinforcement, turret_defense | blast_door, turret_mk2 | wallDurability +30%, turretRange +20% |

### Tier 5: Quantum / Convergence (Cost: 800 compute)

Endgame tech. Only one Tier 5 tech can be researched per game. Requires BOTH Tier 4 branches.

| Tech | Unlocks |
|------|---------|
| `planetary_unification` | All remaining civs receive vassalization offer they cannot refuse |
| `matter_replication` | Duplicate any cube type from compute (1 compute = 1 cube) |
| `storm_control` | Direct lightning strikes at will, anywhere on map |
| `ancient_awakening` | Awaken a friendly Ancient Machine (controllable boss unit) |

**Live config techs at Tier 5:**

| Tech ID | Research Cost | Prerequisites | Unlocks | Bonuses |
|---------|--------------|---------------|---------|---------|
| `matter_compression` | 600 | titanium_processing, advanced_fabrication | compressor_mk2, dense_cube | compressionYield +40% |
| `alloy_forging` | 650 | titanium_processing | alloy_furnace, composite_plate | cubeDurability +50% |
| `quantum_computing` | 700 | network_infiltration, advanced_fabrication | quantum_relay, mass_hack | hackSpeed +50%, signalRange +40% |
| `swarm_command` | 680 | advanced_fabrication, fortress_architecture | swarm_controller, bot_factory | botSpeed +30%, botCapacity +50% |

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

### Live Config Prerequisite Graph

The actual prerequisite chains from `technology.json`:

```
scrap_processing (T1, 30) -----> automated_mining (T2, 80) -----> turret_defense (T3, 180) ----+
                          |                              |                                     |
                          +-> outpost_construction (T2, 90) -> wall_reinforcement (T3, 160) ---+---> fortress_architecture (T4, 360)
                          |                                                                    |
                          |   combat_bots (T3, 200) --------+---> advanced_fabrication (T4, 380)
                          |                                  |
basic_smelting (T1, 40) --+-> copper_refining (T2, 85) -----+---> advanced_smelter (T3, 170) --+
                          |                                                                    |
                          +-> signal_relay_network (T2, 100)        titanium_processing (T4, 350)
                                                                               |
                                                            matter_compression (T5, 600)
                                                            alloy_forging (T5, 650)
                                                            quantum_computing (T5, 700)
                                                            swarm_command (T5, 680)
```

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

- **Territory bonus:** Each outpost controlled provides +5% research speed (additive). Controlling 10 outposts = +50% research speed. This creates a positive feedback loop between expansion and technology, but also means a civ that loses territory falls behind technologically.
- **Research building bonus:** Each Research Lab adds +20% to base research rate (configured in `researchMechanics.researchBuildingBonus`).
- **Faction affinity:** Researching a tech tagged with your race ID provides a 1.5x speed bonus.

### Tech Sources: Patron vs. Local

Every tech in `technology.json` has a `source` field:

| Source | Meaning | Requirement |
|--------|---------|-------------|
| `patron` | Delivered by home-planet AI via otter hologram | Patron satisfaction above threshold (0.3), requires shipment |
| `local` | Discovered/developed on-planet | Requires a Research Lab building |

Early techs (Tiers 1-2) tend to come from the patron. Mid-to-late techs (Tiers 3-5) are local discoveries. Gaining independence from the patron is a natural progression as local research capability grows. The `independenceUnlocksAllLocalTech` flag in `researchMechanics` ensures that once a faction becomes independent, all local techs become available for research regardless of patron satisfaction.

### Tech Trading and Stealing

**Trading:** Two allied civilizations can exchange a known tech. Requirements:
- Both civs at peace
- 60 seconds of signal connection between outposts within 30m
- Receiving civ still pays 50% compute cost

**Stealing:** The `tech_theft` tech (Tier 3C: Infiltration) enables this. Hacking an enemy building built with a tech you lack reveals that tech at 75% compute cost. This creates meaningful raid targets beyond cube stockpiles -- you might attack specifically to hack an enemy Research Lab and steal their `plasma_cutter` tech.

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

### Faction Research Speed Multipliers

From `config/technology.json` `factionResearchBonuses`:

| Faction | Multiplier | Effective Meaning |
|---------|-----------|-------------------|
| Reclaimers | 0.8x | Slowest researchers -- offset by economic efficiency |
| Iron Creed | 0.9x | Below average -- offset by defensive sustainability |
| Volt Collective | 1.0x | Baseline research speed |
| Signal Choir | 1.5x | Fastest researchers -- their primary advantage |

Additionally, Signal Choir can research 2 techs in parallel (`signalChoirParallelResearch: 2`) while all other factions are limited to 1 concurrent research (`maxParallelResearch: 1`).

### Faction-Exclusive Tech Trees

Beyond the universal tree, each faction has its own exclusive tech branch available only to that race (configured via the `race` field on tech definitions in `technology.json`). These techs enhance the faction's identity and cannot be researched by other races -- though they can be stolen via the `tech_theft` Infiltration tech.

Race-exclusive techs also have a `cost` object with physical cube requirements and research time in addition to the standard `researchCost` compute cost.

**Reclaimers exclusive techs:**

| Tier | Tech ID | Effect | Cube Cost |
|------|---------|--------|-----------|
| 2 | `rapid_salvage` (60) | Salvage Crane speed +50%, +1 cube per wreckage | 4 scrap_iron, 2 copper |
| 2 | `dual_channel_grinding` (75) | Grinder Bots process two ore types simultaneously | 6 scrap_iron, 3 copper |
| 3 | `alloy_synthesis` (140) | Scrap Forge accepts any 4 cubes, output gains +50% wall HP | 8 scrap_iron, 4 copper, 4 iron |
| 3 | `magnetic_resonance` (160) | Pull loose cubes from 20m radius to collection point | 8 copper, 4 silicon |
| 4 | `ablative_plating` (280) | Reactive armor: +4 armor below half HP, +2 base armor all units | 10 iron, 4 titanium, 6 scrap_iron |
| 4 | `composite_reclamation` (320) | Frankenstein Colossus inherits 3 enemy abilities (up from 2) | 12 scrap_iron, 6 copper, 4 silicon |
| 5 | `industrial_ecology` (550) | Recycling Plants 3:2 ratio, 85% cannibalization return | 15 scrap_iron, 8 iron, 6 copper, 4 titanium |
| 5 | `perpetual_salvage_engine` (620) | Auto-rebuild destroyed units at half HP after 30 seconds | 20 scrap_iron, 10 iron, 6 titanium |

**Volt Collective exclusive techs:**

| Tier | Tech ID | Effect | Cube Cost |
|------|---------|--------|-----------|
| 2 | `improved_capacitors` (70) | Capacitor Bank +25 capacity, all units +5% speed | 4 copper, 2 silicon |
| 2 | `chain_lightning_mk2` (80) | Shock Drone chains to 3 targets, Arc Trooper +1m AoE | 6 copper, 3 silicon |
| 3 | `storm_synchronization` (150) | Lightning Forges work in any weather, +50% storm power storage | 8 copper, 6 silicon, 4 scrap_iron |
| 3 | `electromagnetic_pulse` (180) | Surge Breakers gain EMP mode (8s building disable, 20s cooldown) | 10 copper, 4 silicon, 4 iron |
| 4 | `overcharge_protocol` (300) | Kill energy cascades to buildings, furnaces +20% speed | 12 copper, 8 silicon, 4 titanium |
| 4 | `storm_rider_plating` (280) | -50% lightning damage to all Volt units | 8 titanium, 6 copper, 4 iron |
| 5 | `collective_surge` (600) | 5+ units in 10m: +25% damage, +2 armor | 15 copper, 10 silicon, 6 titanium |
| 5 | `perpetual_storm_engine` (700) | Storm Colossus 25m aura, artificial lightning every 5s | 20 copper, 12 silicon, 8 titanium |

**Signal Choir exclusive techs:**

| Tier | Tech ID | Effect | Cube Cost |
|------|---------|--------|-----------|
| 2 | `expanded_bandwidth` (65) | Signal Amplifier +10m range, Relay Drones +1 speed | 4 e_waste, 3 silicon |
| 2 | `cognitive_intrusion` (70) | Infiltrator hack time -3s, hack range to 7m | 6 e_waste, 2 silicon |
| 3 | `phantom_multiplication` (130) | Phantom Projector creates 5 decoys (up from 3) | 8 e_waste, 6 silicon, 3 copper |
| 3 | `neural_cascade` (170) | Hack success slows nearby enemies -20% for 5s in 5m radius | 10 e_waste, 6 silicon, 4 copper |
| 4 | `quantum_entanglement_relay` (320) | Teleport 2 cubes between Signal Amplifiers (5s transfer) | 12 silicon, 8 e_waste, 4 copper |
| 4 | `recursive_hack` (350) | Hacked units carry dormant payload, chain-hack 1 generation in 5m | 14 silicon, 10 e_waste, 6 copper |
| 5 | `singularity_protocol` (650) | Nexus Core Override cooldown halved to 30s, target tier 5 units | 18 silicon, 12 e_waste, 6 titanium |
| 5 | `omniscience_network` (700) | Permanent fog reveal in signal network, see enemy cooldowns | 20 silicon, 14 e_waste, 8 titanium, 6 copper |

**Iron Creed exclusive techs:**

| Tier | Tech ID | Effect | Cube Cost |
|------|---------|--------|-----------|
| 2 | `hardened_alloys` (75) | Walls +20% HP, Constructor Bot reinforce cost = 1 cube | 6 iron, 4 scrap_iron |
| 2 | `layered_defense_doctrine` (80) | Garrison +30% damage, bunkers gain 4th slot | 4 iron, 6 scrap_iron, 2 copper |
| 3 | `automated_sentries` (160) | Turret fire rate +25%, Bastion Bots gain auto-targeting | 8 iron, 6 copper, 3 silicon |
| 3 | `structural_resonance` (150) | Connected walls share 30% damage within 5m | 10 iron, 6 scrap_iron |
| 4 | `siege_engineering` (300) | Siege Engine +5m range, 2s setup, 4m scatter shot AoE | 12 iron, 6 titanium, 8 scrap_iron |
| 4 | `impervious_bulwark` (320) | Walls immune to hacking, all buildings -30% damage | 14 iron, 8 titanium, 4 silicon |
| 5 | `mobile_fortress_protocol` (600) | Citadel Walker garrison = 6, barricade HP +50%, -25% cooldown | 18 iron, 10 titanium, 6 silicon, 4 copper |
| 5 | `eternal_foundation` (680) | Destroyed buildings leave indestructible foundations for 5 min, rebuild at -60% cost, -70% time | 20 iron, 12 titanium, 10 scrap_iron |

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

### Threat Escalation Timeline

| Time | Storm Phase | AI Behavior | Environmental Hazards | Ancient Machines |
|------|------------|-------------|----------------------|-----------------|
| 0-15 min | Calm | Building, scouting | None | Dormant |
| 15-30 min | Rising | First diplomacy/raids | Acid rain begins | Ruins glow |
| 30-60 min | Storm | Organized warfare | Avalanches, sinkholes | Sentinels awaken |
| 60-90 min | Tempest | Multi-front assaults | EMP pulses, magnetic storms | Crawlers patrol |
| 90-120 min | Convergence | All-out war or submission | Full intensity | Colossus awakens |

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

All progression values live in `config/technology.json`. The file contains four top-level sections:

### `tiers`

Five tier definitions with name, base compute cost, and unlock lists. These are the tier gates that determine when a branch becomes available.

```json
{
  "tiers": [
    { "name": "Scrap", "cost": 0, "unlocks": ["basic_belt", "basic_furnace", "lightning_rod"] },
    { "name": "Refined", "cost": 50, "unlocks": ["fast_belt", "smelter", "walls", "outpost"] },
    { "name": "Precision", "cost": 150, "unlocks": ["express_belt", "refiner", "separator", "turret"] },
    { "name": "Advanced", "cost": 400, "unlocks": ["signal_relay", "hacking_module", "formation_controller"] },
    { "name": "Quantum", "cost": 800, "unlocks": ["convergence_device", "quantum_relay", "mass_hack"] }
  ]
}
```

### `techTree`

Array of individual tech definitions. Each entry has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `"scrap_processing"`) |
| `name` | string | Display name |
| `tier` | number | Which tier (1-5) |
| `researchCost` | number | Compute points required to complete |
| `prerequisites` | string[] | Tech IDs that must be completed first |
| `effects.unlocks` | string[] | Building/ability/item IDs enabled by this tech |
| `effects.bonuses` | object | Stat modifier key-value pairs (e.g., `{ "harvestSpeed": 0.1 }`) |
| `race` | string or null | Faction ID for exclusive techs, `null` for universal |
| `source` | string | `"patron"` (otter-delivered) or `"local"` (requires Research Lab) |
| `description` | string | In-game flavor text |
| `cost` | object (optional) | Physical cube cost for faction-exclusive techs: `{ cubes: { ... }, researchTime: number }` |

### `factionResearchBonuses`

Per-faction multiplier applied to all research progress:

```json
{
  "factionResearchBonuses": {
    "reclaimers": 0.8,
    "volt_collective": 1.0,
    "signal_choir": 1.5,
    "iron_creed": 0.9
  }
}
```

### `researchMechanics`

Global research rules:

| Key | Value | Description |
|-----|-------|-------------|
| `baseResearchRate` | 1 | Base compute-to-progress conversion |
| `researchBuildingBonus` | 0.2 | Per-Research Lab bonus to research rate |
| `maxParallelResearch` | 1 | Maximum concurrent researches (most factions) |
| `signalChoirParallelResearch` | 2 | Signal Choir can research 2 simultaneously |
| `raceTechsRequireRaceMatch` | true | Faction-exclusive techs locked to their race |
| `universalTechsAvailableToAll` | true | Non-race techs available to everyone |
| `patronTechDeliveryMethod` | "otter_hologram" | How patron techs are delivered |
| `patronTechRequiresShipment` | true | Patron techs need a shipment event |
| `localTechRequiresResearchBuilding` | true | Local techs need a Research Lab |
| `independenceUnlocksAllLocalTech` | true | Independence removes patron gate on local techs |
| `patronSatisfactionThresholdForTech` | 0.3 | Minimum satisfaction to receive patron tech |

### Implementation

The system in `src/systems/techResearch.ts` reads `config/technology.json` at module load and exposes `techResearchSystem()` as the tick-level entry point. Per-faction state is tracked in a module-level `Map<string, FactionResearchState>` with `_reset()` via `resetTechResearch()` for test cleanup. The `ResearchEvaluator` in the GOAP governor system uses the tech tree config to decide when AI factions should prioritize research over other strategic goals.
