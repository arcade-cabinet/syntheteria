# Syntheteria: Progression & Evolution Design Document

**Status:** Creative Direction Brief
**Date:** 2026-03-10
**Author:** Creative Direction (Claude)
**Scope:** Complete game progression arc, tech tree deep design, victory conditions, resource chain evolution, civilization asymmetry, threat escalation, retention hooks, map generation, multiplayer considerations, and concrete config changes for all proposed systems.

**Prerequisite reading:** GDD-002 through GDD-006, FACTORY_PLANET_FPS_REDESIGN.md, all config/*.json files.

---

## Table of Contents

1. [The Player Journey Arc (5 Acts)](#1-the-player-journey-arc-5-acts)
2. [Tech Tree Deep Design](#2-tech-tree-deep-design)
3. [Victory Conditions](#3-victory-conditions)
4. [Resource Chain Evolution](#4-resource-chain-evolution)
5. [Civilization Asymmetry Deep Dive](#5-civilization-asymmetry-deep-dive)
6. [Threat Escalation](#6-threat-escalation)
7. [Progression Hooks & Retention](#7-progression-hooks--retention)
8. [Map Generation & Biomes](#8-map-generation--biomes)
9. [Multiplayer Considerations](#9-multiplayer-considerations)
10. [Concrete Config Changes](#10-concrete-config-changes)

---

## 1. The Player Journey Arc (5 Acts)

The five-act structure maps onto a ~6-10 hour first playthrough. Each act introduces new systems, raises the stakes, and opens new decision branches. The pacing follows the Civilization model: early turns are short and exploratory, mid-game is a web of interlocking decisions, late game is large-scale strategic execution.

### Act 1: Awakening (0-45 minutes)

**Theme:** Isolation and discovery. You are broken, alone, and small.

**Opening moment:** Black screen. A flicker. Your camera sensor boots. Scan lines stabilize. You see corroded metal ground through a cracked lens. Your HUD is mostly dead. One arm sparks. The other hangs limp. An otter hologram flickers into existence nearby, waves, and speaks.

**Progression beats:**

| Minute | Event | System Introduced |
|--------|-------|-------------------|
| 0:00 | Camera boots. FPS view. Broken bot on rusted terrain. | FPS movement |
| 0:30 | Otter hologram: "See that scrap pile?" | Otter quest system |
| 1:00 | Walk to scrap deposit. Hold action to grind. | Harvester mechanic |
| 2:00 | Capacity gauge fills. "COMPRESS READY" pulses. | Compression mechanic |
| 2:30 | Screen shake. Pressure gauges. First cube ejects. | Physical cube economy |
| 3:00 | Carry cube to furnace. Drop in hopper. | Grabber tool, furnace interaction |
| 4:00 | Tap furnace. Radial menu. Craft Grabber Arm. | Contextual interaction, crafting |
| 5:00 | Install Grabber. "GRABBER T1 ONLINE." | Bot upgrade system |
| 7:00 | Craft Diamond Drill. Mine copper for first time. | Material diversity |
| 10:00 | Craft first belt segment. Place between deposit and furnace. | Automation begins |
| 15:00 | Otter: "Other machines are watching your cubes..." | Threat introduction |
| 20:00 | First feral bot encounter. Fight or flee. | Combat basics |
| 30:00 | Craft first wall segment. Protect cube stockpile. | Defense construction |
| 40:00 | Otter: "There are others like you out there. Some are friendly. Most are not." | Civilization reveal |

**Act 1 completion criteria:**
- Player has Harvester T2, Grabber T1, Scanner T1
- At least one belt line operational
- First wall segment protecting furnace area
- First feral bot defeated or driven off
- Player understands: grind, compress, carry, process, build

**The feel:** Small. Manual. Every cube matters. You carry them one at a time. Your base is three walls and a furnace. The horizon is vast and unknown. You can see distant lights from other civilizations but cannot reach them yet.

**Key design principle:** Act 1 must be completable in under 45 minutes with zero prior knowledge. Every action teaches by doing. The otter never tells you what button to press -- it tells you what to do and the contextual UI shows the how.

### Act 2: Foundation (45 min - 2.5 hours)

**Theme:** Building the machine. Your base takes shape. First contact with the wider world.

**What changes:** The player transitions from manual cube-by-cube labor to the beginnings of automation. They discover that the planet has other civilizations, that territory is contested, and that their cube stockpile is both their wealth and their vulnerability.

**Progression beats:**

| Time | Event | System Introduced |
|------|-------|-------------------|
| 0:45 | Build first Auto-Hopper (belt feeds furnace). | Multi-machine automation |
| 1:00 | Discover silicon cluster. Cannot mine yet (needs T3). | Resource gating, exploration motivation |
| 1:10 | First contact: distant lights, radio crackle, AI civ scout spotted. | Fog of war, other civilizations |
| 1:20 | Build Outpost Core. Claim first territory. | Territory system |
| 1:30 | Territory borders appear. Resource bonus kicks in. | Strategic territory value |
| 1:40 | Enemy scout enters territory. Diplomatic popup: "The Volt Collective demands tribute." | Diplomacy introduction |
| 1:50 | Player chooses: pay tribute (5 scrap cubes), refuse, or counter-offer. | Diplomacy decisions |
| 2:00 | Build signal relay. Extend network range. See more of the map. | Signal/compute network |
| 2:10 | Discover ruins with ancient machine blueprint. | Blueprint discovery system |
| 2:20 | Craft first Battle Bot chassis. Populate with components. | Unit construction |
| 2:30 | Set Battle Bot to patrol perimeter. First automated defense. | Bot automation |

**Act 2 completion criteria:**
- One outpost claimed, borders visible
- At least one AI civilization discovered
- Signal relay extending vision beyond base
- First diplomatic interaction completed
- At least one non-player bot (battle bot or worker) operational
- Belt network connecting 2+ deposits to furnace
- Player understands: territory, diplomacy, automation, other civs exist

**The feel:** Your base starts to look like a base. Cubes are stacking up. Belts are moving. You can stand on a wall and watch your machines work. But beyond your borders, you see the glow of enemy furnaces. They are building too.

### Act 3: Expansion (2.5 - 5 hours)

**Theme:** The factory grows. Alliances form. Technology diverges. Choices narrow.

**What changes:** The player's factory becomes a real logistics network. Multiple deposits, multi-stage processing, and alloy creation. They must make strategic choices about tech tree branches. AI civilizations begin interacting with each other, not just the player. Territory becomes contested.

**Progression beats:**

| Time | Event | System Introduced |
|------|-------|-------------------|
| 2:30 | Unlock Smelter. Scrap iron cubes become iron cubes (2:1 ratio). | Multi-stage processing |
| 3:00 | Iron walls. 180 HP vs scrap's 100 HP. Real defense. | Material strategy in defense |
| 3:15 | Unlock Refiner. Copper cubes become wire bundles + circuit boards. | Complex processing chains |
| 3:30 | First alloy: Iron + Copper cubes in furnace = Steel cubes. | Alloy system |
| 3:45 | AI civ declares war on another AI civ. Player gets to choose sides or stay neutral. | Alliance system |
| 4:00 | Unlock Hacking Module. Can now hack feral bots to join your faction. | Hacking as resource acquisition |
| 4:15 | Discover Titanium deposits in mountain biome. Need Plasma Cutter (T3 Harvester). | Late-game material gating |
| 4:30 | Build Formation Controller. Battle bots now move in squad formations. | Military formations |
| 4:45 | First organized raid on your base by AI civ. Wall defense test. | Siege mechanics |
| 5:00 | Unlock Tech Tree Tier 3 (Precision). Choose branch: Military or Hacking. | Tech specialization |

**Act 3 completion criteria:**
- At least 2 outposts, multi-territory control
- Smelter and Refiner operational
- At least one alloy type produced
- Tech Tree Tier 3 unlocked
- At least one alliance or war with AI civ
- Multiple bot types operational (worker, battle, scout)
- Player understands: tech branching, alloys, multi-front strategy

**The feel:** You are no longer a survivor. You are a power. Your factory hums. Belts snake across the landscape carrying cubes of five different materials. Your walls are iron. Your bots patrol in formations. But you can see two AI civilizations massing forces nearby, and you have a choice to make about who to ally with.

### Act 4: Confrontation (5 - 8 hours)

**Theme:** War and its costs. Every cube spent on a weapon is a cube not spent on a wall. Every bot lost is resources burned. Hacking becomes a second battlefield.

**What changes:** At least one all-out war between major civilizations. The player is either instigating, defending, or trying to profit from the chaos. The physical cube economy becomes viscerally real when you watch an enemy army carry away your stockpile. Hacking opens a shadow war where networks are weapons.

**Progression beats:**

| Time | Event | System Introduced |
|------|-------|-------------------|
| 5:00 | Major AI civ launches full assault. 15+ bots, siege engines. | Large-scale combat |
| 5:30 | Wall breach. Enemy bots streaming through. Rubble cascading. | Breach/topple mechanics |
| 5:45 | Counter-hack enemy command relay. Enemy bots freeze for 10 seconds. | Tactical hacking |
| 6:00 | Push into enemy territory. See their cube stockpiles. Decision: raid or raze. | Offensive strategy |
| 6:30 | Capture enemy furnace. Their recipes are now yours. | Technology capture |
| 7:00 | Unlock Quantum Extractor (T4 Harvester). Mine rare earth deposits. | Endgame materials |
| 7:15 | Ancient Machine Guardian awakens. Boss encounter. | Ancient machines (boss) |
| 7:30 | Environmental escalation: magnetic storm disables electronics for 30 seconds. | Environmental hazard escalation |
| 8:00 | One AI civilization eliminated or vassalized. Map control shifts decisively. | Civilization elimination |

**Act 4 completion criteria:**
- At least one major war fought and resolved
- Enemy territory captured or razed
- Tech Tree Tier 4+ unlocked
- Ancient Machine encountered
- Rare earth deposits accessed
- Player understands: total war economics, the cost of aggression, hacking as warfare

**The feel:** Your factory is a war machine now. Half your belts feed furnaces making weapons. Your cube stockpile fluctuates wildly. Walls are battle-scarred, patched with whatever material was available. The planet's surface is marked with the scars of conflict -- rubble fields where bases used to be, abandoned belt networks, deactivated bots rusting in no-man's-land.

### Act 5: Domination (8 - 10+ hours)

**Theme:** Victory conditions converge. The endgame is not one battle but a sustained campaign toward whichever victory condition the player has been building toward. The planet itself becomes hostile.

**What changes:** The storm intensifies. Ancient machines awaken across the map. The remaining AI civilizations are either allies, vassals, or cornered enemies fighting desperately. The player's factory is either a well-oiled machine or a sprawling mess that needs constant attention. Victory requires sustained excellence, not a single decisive moment.

**Progression beats:**

| Time | Event | System Introduced |
|------|-------|-------------------|
| 8:00 | Storm phase shift. Lightning frequency triples. Power grid overloads. | Environmental crisis |
| 8:30 | Ancient Machine Foundry discovered. Contains blueprints for Titan-class bot. | Ultimate unit |
| 9:00 | If pursuing Economic Victory: cube wealth threshold visible, 70% complete. | Victory progress tracking |
| 9:15 | If pursuing Hacking Victory: Signal Choir special -- planet core OS breach begins. | Faction-specific victory |
| 9:30 | Planet-wide event: "The Convergence." All remaining civs face a choice. | Endgame diplomacy |
| 10:00 | Victory condition met. Endgame cinematic. | Victory |

**Act 5 completion criteria:**
- One victory condition achieved
- The journey from broken bot to planetary power is complete

**The feel:** The planet is yours, or burning, or united under your signal. Your factory stretches across multiple biomes. Your cube stockpile is measured in the thousands. Your bots number in the dozens. The storm rages overhead, but your lightning rods drink it like fuel. The otter hologram appears one last time: "Not bad, for a broken bot."

---

## 2. Tech Tree Deep Design

The current `technology.json` defines 4 linear tiers. This is a placeholder. The real tech tree must have **branches**, **prerequisites**, **faction bonuses**, and **strategic trade-offs**. No player should be able to unlock everything in a single game. Tech choices must be permanent commitments that define your civilization's character.

### 2.1 Tree Structure: 4 Tiers, 6 Branches

```
                    TIER 1: SALVAGE
                    (Starting tech - free)
                         |
              +-----------+-----------+
              |                       |
        TIER 2: INDUSTRY        TIER 2: SIGNALS
        (Processing & power)    (Compute & hacking)
              |                       |
    +---------+---------+   +---------+---------+
    |                   |   |                   |
TIER 3:             TIER 3: TIER 3:          TIER 3:
WARFARE             CONSTRUCTION INFILTRATION RESEARCH
(Military)          (Buildings)  (Hacking)    (Science)
    |                   |   |                   |
    +---------+---------+   +---------+---------+
              |                       |
        TIER 4: DOMINION         TIER 4: ASCENDANCY
        (Military/Territory)     (Tech/Hacking ultimate)
              |                       |
              +-----------+-----------+
                          |
                    TIER 5: CONVERGENCE
                    (Endgame - requires both Tier 4s)
```

### 2.2 Complete Tech Definitions

**TIER 1: SALVAGE (Starting -- cost 0 compute)**

All civilizations start with this tier. It provides the minimum viable factory.

| Tech | What It Unlocks |
|------|----------------|
| `salvage_grinder` | Harvester T1 (scrap only, 1x speed) |
| `basic_compression` | Can compress scrap and rock into cubes |
| `basic_furnace` | Starting furnace (Tier 1 recipes) |
| `basic_belt` | Belt T1 (speed 1.0, no power cost) |
| `basic_grabber` | Grabber T1 (3m range, 1 cube) |
| `lightning_rod` | Lightning rod construction |
| `rock_masonry` | Can stack rock cubes into structures |

**TIER 2A: INDUSTRY (cost 50 compute, requires Salvage)**

The physical production branch. Bigger machines, better processing, more power.

| Tech | What It Unlocks |
|------|----------------|
| `smelting` | Smelter building (scrap -> iron cubes, 2:1) |
| `copper_refining` | Refiner building (copper cubes -> wire + circuit) |
| `fast_belt` | Belt T2 (speed 2.0, 0.5 power cost) |
| `diamond_drill` | Harvester T2 (scrap + copper + carbon, 2x speed) |
| `power_grid` | Power wire construction (connect buildings) |
| `iron_masonry` | Iron cube structures, iron wall blueprints |
| `auto_hopper` | Hopper that accepts cubes from belts |
| `grabber_mk2` | Grabber T2 (5m range, 2 cubes) |

**TIER 2B: SIGNALS (cost 50 compute, requires Salvage)**

The information and network branch. Extends reach, enables hacking, builds compute.

| Tech | What It Unlocks |
|------|----------------|
| `signal_relay` | Signal relay building (extends network range) |
| `basic_scanner` | Scanner T1 (see deposit types at 20m) |
| `compute_core` | Compute core building (generates 10 compute) |
| `signal_wire` | Signal wire construction (carry compute between buildings) |
| `basic_hacking` | Can hack feral bots (difficulty <= 5) |
| `encryption` | Your bots gain +2 hack resistance |
| `remote_camera` | Place standalone camera towers for vision |

**TIER 3A: WARFARE (cost 150 compute, requires Industry)**

Military specialization. Bigger bots, better weapons, siege equipment.

| Tech | What It Unlocks |
|------|----------------|
| `battle_bot_chassis` | Battle Bot construction |
| `turret_defense` | Automated turret building |
| `siege_ram` | Siege Ram bot (2x damage to walls) |
| `explosive_charge` | Placeable explosive (destroys 3x3 cube area) |
| `formation_tactics` | Formation Controller (squad movement) |
| `armor_plating` | Bot armor upgrade (+50% HP) |
| `lightning_lance` | Lightning-based ranged weapon (high damage, high power cost) |

**TIER 3B: CONSTRUCTION (cost 150 compute, requires Industry)**

Infrastructure specialization. Better buildings, faster production, territory control.

| Tech | What It Unlocks |
|------|----------------|
| `express_belt` | Belt T3 (speed 4.0, 1.0 power cost) |
| `separator` | Separator building (rare alloy -> power cells) |
| `alloy_forge` | Alloy furnace (combine 2 material types) |
| `outpost_mk2` | Outpost T2 (radius 20, double claim speed) |
| `blueprint_system` | Blueprint mode for automated wall construction |
| `cube_elevator` | Vertical cube transport (multi-level factories) |
| `titanium_masonry` | Titanium cube structures |

**TIER 3C: INFILTRATION (cost 150 compute, requires Signals)**

Hacking specialization. Take over enemy machines, disrupt networks, steal tech.

| Tech | What It Unlocks |
|------|----------------|
| `advanced_hacking` | Can hack civilized bots (difficulty <= 15) |
| `virus_probe` | Deployable virus probe (hacks all bots in radius over time) |
| `signal_jammer` | Signal jammer building (blocks enemy network in radius) |
| `tech_theft` | Hacking an enemy building reveals one of their techs |
| `counter_intelligence` | Detect enemy hack attempts, +5 resistance |
| `network_worm` | After hacking one bot, adjacent bots become easier to hack |
| `puppet_master` | Hacked bots retain enemy faction visual (spy units) |

**TIER 3D: RESEARCH (cost 150 compute, requires Signals)**

Science specialization. Faster tech, better scanning, unique discoveries.

| Tech | What It Unlocks |
|------|----------------|
| `advanced_scanner` | Scanner T2 (full material analysis at 40m) |
| `plasma_cutter` | Harvester T3 (all ores, 3x speed) |
| `research_lab` | Research Lab building (generates 5 compute, +20% research speed) |
| `material_analysis` | Reveal exact cube composition of scanned structures |
| `ancient_interface` | Can interact with Ancient Machine ruins |
| `quantum_computing` | Compute cores generate 2x compute |
| `gravity_manipulation` | Grabber T3 (8m range, 4 cubes, pull distant cubes) |

**TIER 4A: DOMINION (cost 400 compute, requires Warfare + Construction)**

The ultimate physical power branch.

| Tech | What It Unlocks |
|------|----------------|
| `titan_chassis` | Titan Bot construction (massive combat unit, 10x HP) |
| `fusion_reactor` | Fusion reactor building (100 power output, no storm needed) |
| `orbital_relay` | Map-wide signal coverage |
| `matter_compressor` | Compress 2 cubes into 1 of double quality |
| `quantum_extractor` | Harvester T4 (all ores including rare earth, 5x speed) |
| `fortress_gate` | Powered gate building (opens for allies, blocks enemies) |
| `mass_fabrication` | Furnace processes 3x faster |

**TIER 4B: ASCENDANCY (cost 400 compute, requires Infiltration + Research)**

The ultimate information power branch.

| Tech | What It Unlocks |
|------|----------------|
| `neural_network` | All hacked bots gain +50% effectiveness |
| `total_surveillance` | See all enemy units regardless of fog of war |
| `planet_core_access` | Begin Planet Core hack (Hacking Victory path) |
| `matter_teleporter` | Teleport cubes between owned outposts (range 50m) |
| `consciousness_split` | Control 2 bots simultaneously (split-screen) |
| `adaptive_ai` | Your automated bots learn from combat (improve over time) |
| `zero_day_exploit` | Instantly hack any single target, once per 5 minutes |

**TIER 5: CONVERGENCE (cost 1000 compute, requires Dominion + Ascendancy)**

Endgame tech. Only one can be researched per game.

| Tech | What It Unlocks |
|------|----------------|
| `planetary_unification` | All remaining civs receive vassalization offer they cannot refuse (Cultural Victory path) |
| `matter_replication` | Duplicate any cube type from compute alone (1 compute = 1 cube) |
| `storm_control` | Direct lightning strikes at will, anywhere on map |
| `ancient_awakening` | Awaken a friendly Ancient Machine (controllable boss unit) |

### 2.3 Asymmetric Tech: Faction Bonuses

Each civilization gets free tech in their specialty area and reduced costs in their preferred branch.

| Civilization | Free Starting Tech | Discounted Branch | Cost Modifier |
|-------------|-------------------|-------------------|---------------|
| Reclaimers | `auto_hopper` (T2A normally) | Industry, Construction | 0.7x compute cost |
| Volt Collective | `lightning_lance` (T3A normally) | Warfare | 0.6x compute cost |
| Signal Choir | `basic_hacking` (T2B normally) | Infiltration, Research | 0.7x compute cost |
| Iron Creed | `iron_masonry` (T2A normally) | Construction | 0.5x compute cost |

### 2.4 Tech Trading and Stealing

**Tech Trading:** Two allied civilizations can exchange a known tech. Both civs must be at peace. Trading takes 60 seconds of signal connection between outposts within 30m of each other. The receiving civ still pays 50% of the compute cost.

**Tech Stealing:** The `tech_theft` technology (T3C: Infiltration) allows stealing. Hacking an enemy building that was built with a tech you do not have reveals that tech in your tree at 75% compute cost. This creates meaningful targets beyond just cube stockpiles -- a player might raid an enemy base specifically to hack their Research Lab and steal their `plasma_cutter` tech.

**Research Acceleration Through Territory:** Each outpost controlled provides +5% research speed (additive). Controlling 10 outposts = +50% research speed. This creates a positive feedback loop between expansion and technology, but also means a civ that loses territory falls behind technologically.

---

## 3. Victory Conditions

Six victory conditions, each requiring sustained commitment. Players choose their path through tech tree choices, alliance decisions, and resource allocation. Victory is declared when one civilization meets any single condition. All conditions are visible to all players through a shared Victory Progress panel.

### 3.1 Economic Victory: Cube Hegemony

**Condition:** Accumulate and maintain 500 cubes of 4+ different material types simultaneously for 5 consecutive minutes.

**Why this works:** The physical cube economy makes this visible. Every other civilization can SEE your stockpile. They know you are close. They will attack to prevent it. Maintaining 500 cubes means defending a massive, distributed stockpile while continuing production.

**The challenge:** Cubes are physical. 500 cubes at 0.5m each is a visible, targetable pile the size of a building. You need walls, turrets, patrols, and belt logistics sophisticated enough to keep cubes flowing in faster than raiders carry them out.

**Strategic path:** Industry branch -> Construction branch -> Mass Fabrication. Reclaimers are favored (economy bias 1.5, mining efficiency 1.3).

```jsonc
// config/victory.json (new file)
{
  "economic": {
    "totalCubesRequired": 500,
    "materialDiversityRequired": 4,
    "holdDurationSeconds": 300,
    "progressUpdateIntervalSeconds": 10,
    "cubeCountIncludesPlacedWalls": false
  }
}
```

### 3.2 Military Victory: Planetary Conquest

**Condition:** Control 60% of all outpost locations on the map. An outpost location is any valid outpost placement point (predetermined by map generation). Control means having an operational outpost at that location.

**Why this works:** Unlike "destroy all enemies," this is about sustained territorial control. An enemy can still exist in their remaining 40% -- but you dominate the planet. This encourages aggressive expansion while still allowing the defeated civs to survive as minor powers.

**Strategic path:** Warfare branch -> Dominion. Volt Collective is favored (military bias 1.5, expansion 1.3).

```jsonc
{
  "military": {
    "outpostControlPercentRequired": 0.6,
    "outpostLocationsPerMap": {
      "small": 12,
      "medium": 20,
      "large": 30,
      "huge": 45
    },
    "controlRequiresPoweredOutpost": true,
    "contestedOutpostsCountAsHalf": true
  }
}
```

### 3.3 Scientific Victory: The Convergence

**Condition:** Research any Tier 5 (Convergence) technology.

**Why this works:** Tier 5 requires BOTH Tier 4 branches, which each require two Tier 3 branches. This means the player must have invested heavily across the entire tech tree. It is the most compute-expensive path and the most vulnerable to disruption (enemy raids on research labs, signal jammers, tech theft).

**Strategic path:** Signals branch -> Research -> Full tree. Signal Choir is favored (research bias 1.5, compute bonuses).

```jsonc
{
  "scientific": {
    "requiredTechTier": 5,
    "anyTier5TechQualifies": true,
    "computeGenerationBonus": 0
  }
}
```

### 3.4 Cultural Victory: The Signal Accord

**Condition:** All surviving AI civilizations are vassals of the player through diplomacy. Vassalization requires either: (a) 5 consecutive minutes of alliance + the vassal's economy being less than 30% of the player's, or (b) the `planetary_unification` Tier 5 tech.

**Why this works:** It requires economic dominance without military conquest. You become so powerful that other civilizations willingly submit. This rewards players who invest in production efficiency and diplomatic relations over military strength.

**Strategic path:** Industry + Construction + Diplomacy. Iron Creed is paradoxically well-suited (defensive posture + strong economy = intimidating without being threatening).

```jsonc
{
  "cultural": {
    "allSurvivingCivsMustBeVassals": true,
    "vassalizationEconomyThreshold": 0.3,
    "vassalizationAllianceDurationSeconds": 300,
    "minimumSurvivingCivs": 1
  }
}
```

### 3.5 Hacking Victory: Root Access (Signal Choir Special)

**Condition:** Complete the Planet Core hack. This is a 10-minute sustained hacking operation requiring `planet_core_access` tech (T4B), 200+ total compute, and signal coverage over 3 specific "Core Access Points" on the map (marked ruins that connect to the planet's underlying OS).

**Why this works:** It is the Signal Choir's natural victory path but available to any civ that invests in the Infiltration/Research branches. The 10-minute duration makes it vulnerable to interruption. Other civs can see the hack in progress (visible energy beams at Core Access Points) and will try to stop it. This creates a dramatic endgame siege scenario.

**Strategic path:** Signals -> Infiltration -> Ascendancy -> planet_core_access. Signal Choir is heavily favored (hacking speed 1.5, signal range 1.4).

```jsonc
{
  "hacking": {
    "requiredTech": "planet_core_access",
    "coreAccessPointsRequired": 3,
    "hackDurationSeconds": 600,
    "minimumComputeRequired": 200,
    "computeDrainPerSecond": 5,
    "interruptionRestartsProgress": true,
    "visibleToAllCivs": true,
    "beamVisualColor": "#aa44ff"
  }
}
```

### 3.6 Survival Victory: Last Machine Standing

**Condition:** Be the last civilization with an operational outpost after the Storm Escalation event begins (Act 5). The Storm Escalation progressively destroys unprotected infrastructure. The last civ with a powered outpost wins.

**Why this works:** This is the "defensive" victory. You do not need to conquer. You need to survive. The storm becomes the primary antagonist. Lightning rods, power grids, and robust infrastructure matter more than armies. Iron Creed is heavily favored.

**Strategic path:** Construction + massive lightning rod infrastructure. Iron Creed favored (defense bias 1.5, wall strength 2.0, building health 1.5).

```jsonc
{
  "survival": {
    "triggeredByStormEscalation": true,
    "stormEscalationStartsAtMinute": 480,
    "lastCivWithPoweredOutpostWins": true,
    "stormDamagePerTickToUnprotected": 5,
    "lightningRodProtectionMultiplier": 0.1
  }
}
```

### 3.7 Victory Progress Panel

All victory conditions display on a shared panel visible to all players.

```
┌─────────────────────────────────────────┐
│          VICTORY PROGRESS               │
│                                         │
│  ECONOMIC    [████████░░░░] 412/500    │
│  MILITARY    [██████░░░░░░] 12/20     │
│  SCIENTIFIC  [████░░░░░░░░] T3/T5     │
│  CULTURAL    [██░░░░░░░░░░] 1/3 vassal│
│  HACKING     [░░░░░░░░░░░░] 0/3 cores │
│  SURVIVAL    [not yet active]          │
│                                         │
│  Closest to victory: RECLAIMERS (econ) │
└─────────────────────────────────────────┘
```

---

## 4. Resource Chain Evolution

The physical cube economy is the soul of Syntheteria. It must feel fundamentally different at each stage of the game. Early game is manual labor. Mid game is mechanical automation. Late game is industrial logistics approaching magic.

### 4.1 Early Game: The Grind (Act 1-2)

**The loop:** Walk to deposit. Hold button. Grind. Walk back. Compress. Carry cube. Drop in furnace. Wait. Pick up output. Install or use. Repeat.

**Resource chain:**
```
Deposit → [manual grind] → Powder → [manual compress] → Cube → [manual carry] → Furnace → Output
```

**Materials available:** Rock, Scrap Iron
**Processing:** Basic Furnace only (Tier 1 recipes)
**Transport:** Walking with Grabber (1 cube at a time)
**Storage:** Cubes on the ground near furnace

**The feel:** Physical. Laborious. Every cube has weight. You know exactly how many you have because you can count them. Losing one to a feral bot raid is personal.

**Key numbers:**
- Grind speed: 1 unit/second (Harvester T1)
- Compression threshold: 40 powder (rock), 60 powder (scrap)
- Carry capacity: 1 cube (Grabber T1)
- Furnace processing: 8-15 seconds per recipe
- Time to produce one iron plate from scratch: ~90 seconds

### 4.2 Mid Game: The Factory (Act 2-3)

**The loop:** Belts carry cubes from deposit miners to smelters to furnaces to stockpiles. Player manages the logistics network, places new buildings, extends territory.

**Resource chain:**
```
Deposit → [auto-miner] → Cube → [belt] → Smelter → [belt] → Refined Cube → [belt] → Furnace → Output
                                                                                              ↓
                                        [belt] ← Alloy Forge ← [belt] ← Multiple Refined Cubes
```

**New mechanics introduced:**

**Alloy Creation:** Combining two material cubes in an Alloy Forge produces a new material with combined properties. This is the mid-game's key innovation -- materials that do not exist naturally.

| Alloy | Recipe | Properties |
|-------|--------|-----------|
| **Steel** | 1 Iron + 1 Carbon | Hardness 2.5, Weight 2.0, HP 250/cube |
| **Bronze** | 1 Copper + 1 Rock | Hardness 1.2, Conductivity 0.6, HP 120/cube |
| **Electrum** | 1 Copper + 1 Silicon | Conductivity 1.5, Signal boost +20% |
| **Titanium Steel** | 1 Titanium + 1 Iron | Hardness 3.5, Weight 2.8, HP 350/cube |

```jsonc
// Addition to config/processing.json
{
  "alloys": {
    "steel": {
      "inputs": [
        { "material": "iron", "count": 1 },
        { "material": "carbon", "count": 1 }
      ],
      "output": "steel",
      "time": 20,
      "techRequired": "alloy_forge"
    },
    "bronze": {
      "inputs": [
        { "material": "copper", "count": 1 },
        { "material": "rock", "count": 1 }
      ],
      "output": "bronze",
      "time": 15,
      "techRequired": "alloy_forge"
    },
    "electrum": {
      "inputs": [
        { "material": "copper", "count": 1 },
        { "material": "silicon", "count": 1 }
      ],
      "output": "electrum",
      "time": 25,
      "techRequired": "alloy_forge"
    },
    "titanium_steel": {
      "inputs": [
        { "material": "titanium", "count": 1 },
        { "material": "iron", "count": 1 }
      ],
      "output": "titanium_steel",
      "time": 40,
      "techRequired": "alloy_forge"
    }
  }
}
```

**Key numbers:**
- Belt speed: 2.0 cubes/second (T2)
- Smelter throughput: 1 cube every 10 seconds
- Alloy Forge throughput: 1 alloy cube every 15-40 seconds
- Miner output: 1 cube every 10 seconds (powered)
- Time to produce one steel cube from scratch: ~50 seconds (automated)

### 4.3 Late Game: The Machine (Act 4-5)

**The loop:** Multi-level factory complexes with cube elevators, express belts, and specialized processing chains. Matter compression doubles cube quality. Teleporters move cubes between outposts. The player is an architect, not a laborer.

**Resource chain:**
```
Multiple Deposits → [auto-miners] → Cubes → [express belts] →
    ├→ Smelters → Iron
    ├→ Refiners → Wire + Circuit
    ├→ Separators → Power Cells
    └→ Alloy Forges → Steel, Electrum, Titanium Steel
                ↓
    [cube elevators] → Multi-level storage
                ↓
    [matter teleporter] → Remote outpost fabricators
                ↓
    [matter compressor] → Double-quality cubes
                ↓
    [mass fabrication furnace] → 3x speed output
```

**New mechanics introduced:**

**Matter Compression (T4A):** Feed 2 cubes of the same material into a Matter Compressor. Output: 1 cube of 2.0 quality (double HP, double crafting value). This creates a quality tier above standard cubes. A wall of compressed titanium (600 HP/cube) is nearly indestructible.

**Matter Teleportation (T4B):** Build a teleporter pad at two outposts within 50m. Cubes placed on one pad appear at the other after 3 seconds. This eliminates the need for long belt lines between distant outposts, but the power cost is enormous (10 power per teleport).

**Matter Replication (T5):** The ultimate late-game tech. Spend compute to create cubes from nothing. 1 compute = 1 cube (of any type you have previously compressed). This breaks the physical economy's constraints but at enormous compute cost. A civ with 500 compute can produce 500 cubes per minute -- but doing so leaves zero compute for hacking defense, bot management, or research.

**Key numbers:**
- Express belt speed: 4.0 cubes/second
- Matter Compressor: 1 compressed cube every 30 seconds
- Matter Teleporter: 1 cube every 3 seconds, 10 power/teleport
- Mass Fabrication: 3x furnace speed
- Matter Replication: 1 cube/compute, instant, any material

### 4.4 Resource Chain Config

```jsonc
// Addition to config/processing.json
{
  "matterCompression": {
    "inputCount": 2,
    "outputQuality": 2.0,
    "processTime": 30,
    "powerRequired": 5,
    "techRequired": "matter_compressor"
  },
  "matterTeleportation": {
    "teleportDelaySeconds": 3,
    "maxRange": 50,
    "powerCostPerCube": 10,
    "techRequired": "matter_teleporter",
    "requiresPairedPads": true
  },
  "matterReplication": {
    "computeCostPerCube": 1,
    "requiresPreviousCompression": true,
    "techRequired": "matter_replication",
    "instantaneous": true
  }
}
```

---

## 5. Civilization Asymmetry Deep Dive

Each of the four civilizations must feel fundamentally different to play as and against. Their differences are not just cosmetic -- they change the optimal strategy, the tech tree path, the building priorities, and the victory condition you aim for.

### 5.1 Reclaimers

**Identity:** Scavenger economy. They strip the world bare with mechanical efficiency. Their factories are ugly but productive. Their bots are cobbled-together frankenmachines held together with copper wire and determination.

**Visual identity:**
- Primary material: Rusted iron panels with copper-green patina accents
- Emissive color: #00ffaa (teal-green)
- Bot head style: Visor (wide sensor strip, practical)
- Bot arm style: Crane (long reach for salvage)
- Bot locomotion: Treads (stable, slow, can carry heavy loads)
- Building style: Pipes everywhere. Chimneys belching smoke. Messy, functional.
- Wear level: 0.6 (they do not waste resources on polish)

**Unique units:**

| Unit | Description | Config |
|------|-------------|--------|
| **Salvage Hauler** | Slow, massive. Carries 8 cubes at once. No weapons. | `{ speed: 1.5, maxCarry: 8, hp: 200, damage: 0 }` |
| **Strip Miner** | Deploys over a deposit. Mines 3x faster than standard miner. Cannot move while deployed. | `{ speed: 0, miningMultiplier: 3.0, deployTime: 5 }` |
| **Recycler Bot** | Converts rubble and damaged cubes back to 70% quality (normally 50%). | `{ recycleQuality: 0.7, processTime: 5 }` |

**Unique buildings:**

| Building | Description | Config |
|----------|-------------|--------|
| **Salvage Yard** | Automatically collects rubble within 15m radius. Stores up to 50 damaged cubes. | `{ collectRadius: 15, storage: 50, powerRequired: 1 }` |
| **Overclock Furnace** | Processes at 2x speed but has 25% chance of producing cracked output. | `{ speedMultiplier: 2.0, defectChance: 0.25, powerRequired: 4 }` |

**Unique ability: Scavenger's Instinct** -- Reclaimers see the exact yield remaining in any deposit within scanner range (other civs see only "low/medium/high"). Reclaimers also extract 30% more material from each deposit.

**Preferred victory path:** Economic (Cube Hegemony)
**Governor personality:** Economically aggressive, avoids war, expands to resource-rich areas, trades surplus materials for peace

**AI governor bias (expanded):**
```jsonc
{
  "reclaimers": {
    "governorBias": {
      "economy": 1.5,
      "mining": 1.3,
      "military": 0.6,
      "defense": 1.0,
      "research": 0.7,
      "expansion": 1.1,
      "diplomacy": 1.2,
      "hacking": 0.5
    },
    "preferredVictory": "economic",
    "tradeWillingness": 0.9,
    "warThreshold": 0.8,
    "tributeWillingness": 0.6
  }
}
```

### 5.2 Volt Collective

**Identity:** Lightning worshippers. Aggressive expansionists who see power (electricity) as the fundamental resource. Their technology revolves around harnessing and weaponizing the storm. Their attacks hit hard and fast. Their defense is offense.

**Visual identity:**
- Primary material: Chrome with heat-blued titanium accents
- Emissive color: #ffaa00 (electric amber)
- Bot head style: Turret (360-degree weapon platform)
- Bot arm style: Piston (hydraulic, powerful strikes)
- Bot locomotion: Biped legs (fast, aggressive stance)
- Building style: Sleek, angular. Tesla coils on everything. Minimal pipes, maximal lightning rods.
- Wear level: 0.2 (they maintain their equipment meticulously)

**Unique units:**

| Unit | Description | Config |
|------|-------------|--------|
| **Storm Lancer** | Ranged combat unit. Fires concentrated lightning bolts. High damage, high power draw. | `{ speed: 4.0, damage: 8, range: 12, powerPerShot: 3, cooldown: 2.0 }` |
| **Blitz Runner** | Ultra-fast scout. Speed 8. No weapons. Leaves trail of static charge that slows enemies. | `{ speed: 8.0, staticTrailDuration: 5, slowFactor: 0.5, hp: 50 }` |
| **Surge Tower** | Mobile lightning rod. Deploys to create a temporary power zone and lightning protection. | `{ deployPowerOutput: 15, protectionRadius: 10, deployDuration: 60, cooldown: 120 }` |

**Unique buildings:**

| Building | Description | Config |
|----------|-------------|--------|
| **Tesla Array** | Lightning rod cluster. 3x power output but attracts 2x lightning strikes (damages nearby unprotected units). | `{ powerMultiplier: 3.0, strikeAttractionMultiplier: 2.0, damageRadius: 5 }` |
| **Storm Forge** | Furnace powered by direct lightning strikes. Instant processing during storms, disabled during calm. | `{ processTime: 0, requiresActiveStorm: true, stormThreshold: 0.8 }` |

**Unique ability: Storm Caller** -- Volt Collective can redirect natural lightning strikes within their territory to target enemy units. This costs 20 compute per redirect and has a 30-second cooldown.

**Preferred victory path:** Military (Planetary Conquest)
**Governor personality:** Aggressive, launches early raids, prioritizes power infrastructure, respects only strength

**AI governor bias (expanded):**
```jsonc
{
  "volt_collective": {
    "governorBias": {
      "economy": 0.7,
      "mining": 1.0,
      "military": 1.5,
      "defense": 0.5,
      "research": 0.8,
      "expansion": 1.4,
      "diplomacy": 0.4,
      "hacking": 0.6
    },
    "preferredVictory": "military",
    "tradeWillingness": 0.3,
    "warThreshold": 0.3,
    "tributeWillingness": 0.1
  }
}
```

### 5.3 Signal Choir

**Identity:** Distributed consciousness. A hive-mind that values information over material. Their bots are fragile individually but devastatingly coordinated. They prefer to hack your army and turn it against you rather than build their own.

**Visual identity:**
- Primary material: Anodized aluminum with matte carbon accents
- Emissive color: #aa44ff (signal purple)
- Bot head style: Dome (antenna array, holographic display)
- Bot arm style: Articulated (delicate, precise, built for data ports)
- Bot locomotion: Hover (no ground contact, ethereal movement)
- Building style: Minimal, clean. No pipes. Antenna forests. Holographic displays everywhere.
- Wear level: 0.1 (nearly pristine, self-maintaining)

**Unique units:**

| Unit | Description | Config |
|------|-------------|--------|
| **Choir Node** | Relay bot. Extends signal range by 20m. Every 3 adjacent Choir Nodes gain +10% hack speed. | `{ signalExtension: 20, stackBonus: 0.1, maxStack: 5, hp: 40 }` |
| **Siren** | Hacking specialist. 3x hack speed. No weapons. Instantly converts feral bots within 5m. | `{ hackSpeedMultiplier: 3.0, feralConvertRadius: 5, speed: 3.0, hp: 30 }` |
| **Echo** | Ghost bot. Invisible to enemies without advanced scanner. Reveals all enemy units in 30m radius. | `{ stealthActive: true, revealRadius: 30, speed: 5.0, hp: 20, detectableByScanner: true }` |

**Unique buildings:**

| Building | Description | Config |
|----------|-------------|--------|
| **Resonance Tower** | Signal amplifier. All bots within 20m gain +30% hack speed and +5 hack resistance. | `{ boostRadius: 20, hackSpeedBoost: 0.3, hackResistBoost: 5, powerRequired: 3 }` |
| **Data Vault** | Stores captured tech. Can "replay" a stolen tech to temporarily grant it to an ally. | `{ techSlots: 5, replayDuration: 300, replayCooldown: 600, powerRequired: 2 }` |

**Unique ability: The Chorus** -- When 5+ Signal Choir bots are within 10m of each other, they form a "Chorus" -- a collective compute pool that generates 50 temporary compute for 30 seconds. This can be used to surge-hack a heavily defended target.

**Preferred victory path:** Hacking Victory (Root Access)
**Governor personality:** Avoids direct conflict, builds vast signal networks, hacks enemy infrastructure, plays civs against each other through information warfare

**AI governor bias (expanded):**
```jsonc
{
  "signal_choir": {
    "governorBias": {
      "economy": 0.8,
      "mining": 0.6,
      "military": 0.4,
      "defense": 0.8,
      "research": 1.5,
      "expansion": 0.7,
      "diplomacy": 1.3,
      "hacking": 1.8
    },
    "preferredVictory": "hacking",
    "tradeWillingness": 0.7,
    "warThreshold": 0.9,
    "tributeWillingness": 0.8
  }
}
```

### 5.4 Iron Creed

**Identity:** Fortress builders. Slow, methodical, patient. They believe in walls and endurance. Their territory is small but impenetrable. They win by not losing. Their cubes are thick, their walls are higher, and their bots are armored tanks.

**Visual identity:**
- Primary material: Brushed steel with scorched metal accents
- Emissive color: #aa8844 (iron amber)
- Bot head style: Angular (armored, minimal sensor exposure)
- Bot arm style: Piston (heavy, impact-focused)
- Bot locomotion: Quad legs (stable, slow, high load capacity)
- Building style: Thick walls. Reinforced everything. Layered defenses. Few windows.
- Wear level: 0.3 (battle-worn but maintained)

**Unique units:**

| Unit | Description | Config |
|------|-------------|--------|
| **Bulwark** | Mobile wall. Deploys a 3x3 wall of iron cubes from internal storage. Cannot fight while deployed. | `{ cubeStorage: 9, deployTime: 3, wallMaterial: "iron", speed: 2.0, hp: 400 }` |
| **Sentinel** | Heavy turret bot. Cannot move. 360-degree auto-fire. Devastating damage. | `{ speed: 0, damage: 6, range: 15, fireRate: 0.5, hp: 500, rotationSpeed: 1.0 }` |
| **Mason** | Construction specialist. Places cubes 3x faster than manual placement. Auto-repairs walls. | `{ placementSpeedMultiplier: 3.0, repairRate: 5, repairRange: 8, speed: 3.0, hp: 150 }` |

**Unique buildings:**

| Building | Description | Config |
|----------|-------------|--------|
| **Hardened Outpost** | Outpost with 3x HP and built-in turret. Radius only 8 (vs 10 standard). | `{ hpMultiplier: 3.0, radius: 8, builtInTurretDamage: 4, builtInTurretRange: 12 }` |
| **Iron Curtain** | Automated wall builder. Designate a line, it places iron cubes along it from storage at 1 cube/5sec. | `{ cubeStorage: 50, placementRate: 0.2, maxWallLength: 30, powerRequired: 2 }` |

**Unique ability: Fortification Protocol** -- Iron Creed walls gain +50% HP after being placed for 2 minutes (the cubes "settle" and interlock). Additionally, any wall 3+ cubes thick gains an extra +25% HP (layered defense bonus).

**Preferred victory path:** Survival (Last Machine Standing)
**Governor personality:** Turtles hard, minimal expansion, massive defense investment, only attacks when provoked or when victory is certain

**AI governor bias (expanded):**
```jsonc
{
  "iron_creed": {
    "governorBias": {
      "economy": 1.0,
      "mining": 1.0,
      "military": 0.8,
      "defense": 1.8,
      "research": 0.6,
      "expansion": 0.4,
      "diplomacy": 0.7,
      "hacking": 0.3
    },
    "preferredVictory": "survival",
    "tradeWillingness": 0.5,
    "warThreshold": 0.7,
    "tributeWillingness": 0.3
  }
}
```

---

## 6. Threat Escalation

The planet does not wait for the player. Time is an enemy. The world becomes progressively more hostile through four escalation systems: storm intensity, AI aggression, environmental hazards, and ancient machine awakening.

### 6.1 Storm Intensity Progression

The perpetual storm is the planet's heartbeat. It starts as a manageable source of power and gradually becomes a lethal force that reshapes the endgame.

**Storm phases:**

| Phase | Trigger | Base Intensity | Strike Interval | Effect |
|-------|---------|---------------|-----------------|--------|
| **Calm** | Game start | 0.5 | 60-120 seconds | Mild. Lightning rods generate moderate power. |
| **Rising** | 15 minutes elapsed | 0.8 | 30-90 seconds | Lightning rods generate more power but unprotected bots take occasional hits. |
| **Storm** | 30 minutes elapsed | 1.2 | 15-60 seconds | Dangerous. Bots outside protection take regular damage. Power surges can overload grids. |
| **Tempest** | 60 minutes or any civ reaches Tier 4 | 1.8 | 5-30 seconds | Lethal. Constant strikes. Unprotected buildings take damage. |
| **Convergence** | 120 minutes or any civ reaches Tier 5 | 2.5 | 2-15 seconds | Apocalyptic. Lightning hits almost continuously. Only hardened infrastructure survives. Survival Victory triggers. |

```jsonc
// Addition to config/power.json
{
  "stormPhases": [
    {
      "name": "calm",
      "triggerMinutes": 0,
      "baseIntensity": 0.5,
      "strikeIntervalMin": 60,
      "strikeIntervalMax": 120,
      "environmentalDamagePerStrike": 0,
      "powerMultiplier": 1.0
    },
    {
      "name": "rising",
      "triggerMinutes": 15,
      "baseIntensity": 0.8,
      "strikeIntervalMin": 30,
      "strikeIntervalMax": 90,
      "environmentalDamagePerStrike": 5,
      "powerMultiplier": 1.3
    },
    {
      "name": "storm",
      "triggerMinutes": 30,
      "baseIntensity": 1.2,
      "strikeIntervalMin": 15,
      "strikeIntervalMax": 60,
      "environmentalDamagePerStrike": 15,
      "powerMultiplier": 1.6
    },
    {
      "name": "tempest",
      "triggerMinutes": 60,
      "triggerAlternate": "any_civ_tier_4",
      "baseIntensity": 1.8,
      "strikeIntervalMin": 5,
      "strikeIntervalMax": 30,
      "environmentalDamagePerStrike": 30,
      "powerMultiplier": 2.0,
      "powerSurgeChance": 0.15,
      "powerSurgeDamage": 20
    },
    {
      "name": "convergence",
      "triggerMinutes": 120,
      "triggerAlternate": "any_civ_tier_5",
      "baseIntensity": 2.5,
      "strikeIntervalMin": 2,
      "strikeIntervalMax": 15,
      "environmentalDamagePerStrike": 50,
      "powerMultiplier": 3.0,
      "powerSurgeChance": 0.3,
      "powerSurgeDamage": 40,
      "buildingDamageOutsideProtection": 10
    }
  ]
}
```

### 6.2 AI Civilization Aggression Curves

AI civilizations become more aggressive over time, but their aggression curve depends on their personality and circumstances.

**Base aggression formula:**
```
aggression = baseBias * (1 + timeFactor) * strengthRatio * threatModifier

where:
  baseBias = governorBias.military
  timeFactor = minutes_elapsed / 60 * 0.5 (aggression rises 50% per hour)
  strengthRatio = myCubes / theirCubes (stronger civs are more aggressive)
  threatModifier = 1.5 if recently attacked, 0.5 if recently traded
```

**Escalation events by AI personality:**

| Civ | 15 min | 30 min | 60 min | 90 min |
|-----|--------|--------|--------|--------|
| Reclaimers | Send scout | Propose trade | Build border walls | Only attack if cube advantage > 2:1 |
| Volt Collective | Send war party | Raid nearest cube stockpile | Full assault on weakest neighbor | Simultaneous attacks on 2 fronts |
| Signal Choir | Hack a feral bot near player | Place invisible Echo scouts | Virus probe on player territory | Full network assault (hack + raid) |
| Iron Creed | Build walls | Build more walls | Build turrets on walls | Only attack if threatened |

```jsonc
// Addition to config/civilizations.json
{
  "aggressionCurves": {
    "reclaimers": {
      "scoutDelay": 15,
      "firstDiplomacyDelay": 30,
      "borderDefenseDelay": 45,
      "attackThreshold": 2.0,
      "raidPreference": "cubeStockpile"
    },
    "volt_collective": {
      "scoutDelay": 5,
      "firstRaidDelay": 20,
      "fullAssaultDelay": 45,
      "multifront Delay": 75,
      "attackThreshold": 0.8,
      "raidPreference": "weakestNeighbor"
    },
    "signal_choir": {
      "scoutDelay": 10,
      "firstHackDelay": 20,
      "spyNetworkDelay": 40,
      "networkAssaultDelay": 70,
      "attackThreshold": 1.5,
      "raidPreference": "highComputeTarget"
    },
    "iron_creed": {
      "fortificationDelay": 5,
      "turretDelay": 30,
      "attackDelay": 90,
      "attackThreshold": 3.0,
      "raidPreference": "onlyIfProvoked"
    }
  }
}
```

### 6.3 Environmental Hazards

Beyond the storm, the planet itself fights back with increasing ferocity.

**Hazard types:**

| Hazard | First Appears | Frequency | Effect | Counterplay |
|--------|--------------|-----------|--------|-------------|
| **Acid Rain** | 20 min | Every 8-12 min, lasts 30 sec | Damages exposed cubes (-2 HP/sec). Accelerates rust on iron/scrap cubes. | Roof coverings (cubes placed overhead), Chrome material is immune |
| **Magnetic Storm** | 40 min | Every 15-20 min, lasts 15 sec | Disables all electronics in a 30m radius zone. Bots freeze. Signal drops. | Distance from zone center, Titanium shielding reduces effect |
| **Scrap Avalanche** | 30 min (mountain biome only) | Random, triggered by nearby explosions | Wall of loose scrap cubes slides down slope. Destroys anything in path. | Build upslope barriers, Avoid building at mountain bases |
| **Sinkhole** | 45 min (slag biome only) | Rare (~1 per hour) | Ground collapses in 5m radius. Anything on surface falls into cavity. | Scanner T2 can detect unstable ground, Build on solid rock |
| **EMP Pulse** | 60 min | Every 20-30 min, lasts 5 sec | Temporarily disables all powered buildings in 50m radius. | Multiple distributed power grids, backup power cells |

```jsonc
// config/hazards.json (new file)
{
  "acidRain": {
    "firstAppearMinutes": 20,
    "intervalMin": 480,
    "intervalMax": 720,
    "duration": 30,
    "damagePerSecond": 2,
    "affectsMaterials": ["rock", "scrap_iron", "iron", "copper"],
    "immuneMaterials": ["titanium", "silicon"],
    "rustAcceleration": 2.0,
    "roofProtection": true
  },
  "magneticStorm": {
    "firstAppearMinutes": 40,
    "intervalMin": 900,
    "intervalMax": 1200,
    "duration": 15,
    "effectRadius": 30,
    "disablesElectronics": true,
    "freezesBots": true,
    "dropsSignal": true,
    "titaniumShieldingReduction": 0.5
  },
  "scrapAvalanche": {
    "biome": "mountain",
    "firstAppearMinutes": 30,
    "triggerOnExplosion": true,
    "triggerDistance": 20,
    "avalancheWidth": 10,
    "avalancheLength": 40,
    "cubeDamage": 50,
    "entityDamage": 100,
    "cubeCount": 30
  },
  "sinkhole": {
    "biome": "slag",
    "firstAppearMinutes": 45,
    "intervalMin": 3600,
    "intervalMax": 7200,
    "radius": 5,
    "depthUnits": 8,
    "detectableByScanner": true,
    "scannerTierRequired": 2
  },
  "empPulse": {
    "firstAppearMinutes": 60,
    "intervalMin": 1200,
    "intervalMax": 1800,
    "duration": 5,
    "effectRadius": 50,
    "disablesPoweredBuildings": true,
    "disablesBotWeapons": true
  }
}
```

### 6.4 Ancient Machine Awakening

Scattered across the planet are dormant Ancient Machines -- relics of the planet's original builders. They awaken progressively through the late game, serving as both threats and opportunities.

**Awakening timeline:**

| Time | Event | Ancient Machine Type |
|------|-------|---------------------|
| 45 min | First ruin site becomes active (glowing, particle effects) | **Sentinel** -- Stationary turret, 50m range, kills most bots in 2 hits |
| 60 min | Sentinels fully awaken. Attack anything within range. | Sentinels defend Core Access Points and rare deposits |
| 75 min | **Crawler** awakens. Patrols between ruin sites. | Mobile, 300 HP, melee AoE attack, drops 10 titanium cubes on death |
| 90 min | **Colossus** awakens. Boss-tier. Visible from anywhere on map. | 2000 HP, ranged + melee, area denial, drops Ancient Blueprint |
| 120 min | If `ancient_awakening` tech researched, Colossus becomes controllable | Player controls a boss-tier unit |

**Ancient Machine stats:**

```jsonc
// Addition to config/enemies.json
{
  "ancient_sentinel": {
    "type": "stationary",
    "hp": 500,
    "damage": 25,
    "range": 50,
    "fireRate": 0.5,
    "awakenMinutes": 60,
    "loot": [
      { "material": "titanium", "count": 3 },
      { "material": "silicon", "count": 2 }
    ],
    "hackDifficulty": 30,
    "hackable": true,
    "spawnLocations": "core_access_points"
  },
  "ancient_crawler": {
    "type": "patrol",
    "hp": 300,
    "damage": 15,
    "range": 3,
    "aoeRadius": 4,
    "speed": 3.0,
    "awakenMinutes": 75,
    "patrolsBetween": "ruin_sites",
    "loot": [
      { "material": "titanium", "count": 10 }
    ],
    "hackDifficulty": 20,
    "hackable": true
  },
  "ancient_colossus": {
    "type": "boss",
    "hp": 2000,
    "meleeDamage": 50,
    "meleeRange": 5,
    "rangedDamage": 30,
    "rangedRange": 30,
    "speed": 2.0,
    "aoeRadius": 8,
    "awakenMinutes": 90,
    "spawnCount": 1,
    "loot": [
      { "material": "titanium", "count": 30 },
      { "material": "silicon", "count": 15 },
      { "type": "ancient_blueprint", "count": 1 }
    ],
    "hackDifficulty": 50,
    "hackable": true,
    "controllableWithTech": "ancient_awakening"
  }
}
```

---

## 7. Progression Hooks & Retention

### 7.1 Unlock Cascades

Every discovery in Syntheteria opens 2-3 new possibilities. This is the Civilization "just one more turn" effect applied to a physical factory.

**Cascade map:**

```
Mine first copper →
    ├→ Craft Wire Bundle → Build first power wire → Connect furnace to distant rod
    ├→ Craft Belt Segment → Automate cube transport → Free up time for exploration
    └→ Upgrade Grabber → Carry 2 cubes → Double manual transport speed
         ├→ Stack cubes faster → Build walls faster → Survive first raid
         └→ Carry cubes to trade → First diplomatic exchange → Alliance
              ├→ Allied tech trade → Get Smelter early → Iron cubes ahead of schedule
              └→ Allied vision sharing → See more of map → Find titanium
```

**Design rule:** No unlock should ever be a dead end. Every new capability must open at least two downstream possibilities. If a tech only enables one thing, it should be folded into another tech or expanded.

### 7.2 Discovery Events

Beyond the tech tree, the world contains discoverable events that provide one-time bonuses and lore.

**Discovery types:**

| Discovery | Where Found | Reward |
|-----------|------------|--------|
| **Ancient Blueprint** | Ruin sites, Colossus loot | Unlocks a unique recipe not in any tech tree |
| **Memory Fragment** | Scattered in ruins | Lore + 25 compute bonus |
| **Otter Cache** | Near otter hologram spawn points | 10 cubes of random material |
| **Reactor Core** | Deep in mountain biome | Unlocks Fusion Reactor recipe (normally T4) early |
| **Signal Ghost** | Processor Graveyard biome | Reveals all deposits within 50m radius permanently |

```jsonc
// config/discoveries.json (new file)
{
  "ancientBlueprint": {
    "spawnLocations": ["ruin_sites", "colossus_loot"],
    "possibleRecipes": [
      { "name": "Plasma Shield", "effect": "botShieldHp50", "cubeCost": { "titanium": 3, "silicon": 2 } },
      { "name": "Gravity Hammer", "effect": "meleeDamage30AoE5", "cubeCost": { "iron": 4, "titanium": 1 } },
      { "name": "Phase Cloak", "effect": "invisibility30sec", "cubeCost": { "silicon": 5 } }
    ]
  },
  "memoryFragment": {
    "spawnDensity": 0.01,
    "computeReward": 25,
    "loreTextCount": 20
  },
  "otterCache": {
    "spawnNearOtters": true,
    "cubeReward": 10,
    "materialSelection": "random_weighted"
  },
  "reactorCore": {
    "biome": "mountain",
    "spawnCount": 1,
    "unlocksRecipe": "fusion_reactor"
  },
  "signalGhost": {
    "biome": "processor",
    "spawnCount": 3,
    "revealRadius": 50,
    "revealPermanent": true
  }
}
```

### 7.3 Challenge Modes

Unlocked after first victory, these modifiers create replayability.

| Mode | Modifier | Target Player |
|------|----------|--------------|
| **Speed Run** | Victory timer visible. Leaderboard. Storm escalation 2x faster. | Competitive |
| **Iron Man** | No save/load. One life. Permadeath for all bots. | Hardcore |
| **Pacifist** | Cannot build weapons or turrets. Must win through economy or hacking. | Creative |
| **Storm Chaser** | Start at Storm phase. Power generation massive but so is danger. | Thrill-seeker |
| **Lone Wolf** | No AI civilizations. Only ancient machines and ferals. Pure survival. | Relaxed/builder |
| **Outnumbered** | 4 AI opponents instead of 3. All start with Tier 2 tech. | Masochist |

```jsonc
// config/challengeModes.json (new file)
{
  "speedRun": {
    "timerVisible": true,
    "stormEscalationMultiplier": 2.0,
    "leaderboardEnabled": true
  },
  "ironMan": {
    "saveEnabled": false,
    "botPermadeath": true,
    "difficultyMultiplier": 1.0
  },
  "pacifist": {
    "weaponBuildDisabled": true,
    "turretBuildDisabled": true,
    "hackingAllowed": true,
    "validVictories": ["economic", "cultural", "hacking", "scientific"]
  },
  "stormChaser": {
    "startingStormPhase": "storm",
    "powerMultiplierBonus": 2.0,
    "strikeDamageMultiplier": 3.0
  },
  "loneWolf": {
    "aiCivCount": 0,
    "feralSpawnMultiplier": 2.0,
    "ancientMachineEnabled": true,
    "validVictories": ["survival", "scientific"]
  },
  "outnumbered": {
    "aiCivCount": 4,
    "aiStartingTech": 2,
    "playerBonusCubes": 20
  }
}
```

### 7.4 New Game+

After completing any victory, the player can start New Game+ with:

- **Faction mixing:** Choose any 2 faction abilities. Play as "Reclaimer with Signal Choir hacking bonus" or "Iron Creed with Volt Collective storm powers."
- **Tech head start:** Begin with all Tier 1 + one Tier 2 branch already researched.
- **Veteran bot:** Your starting bot retains one upgrade from the previous run (Harvester T2, Grabber T2, or Scanner T1).
- **Increased difficulty:** AI civs start with 1 additional tech tier. Storm escalation is 25% faster.

```jsonc
// config/newGamePlus.json (new file)
{
  "enabled": true,
  "factionMixing": {
    "primaryFaction": true,
    "secondaryAbilitySlots": 1,
    "selectableAbilities": [
      "scavengers_instinct",
      "storm_caller",
      "the_chorus",
      "fortification_protocol"
    ]
  },
  "techHeadStart": {
    "tier1Free": true,
    "tier2BranchesFree": 1
  },
  "veteranBot": {
    "retainOneUpgrade": true,
    "selectableUpgrades": ["harvester_t2", "grabber_t2", "scanner_t1"]
  },
  "difficultyIncrease": {
    "aiExtraTechTiers": 1,
    "stormEscalationMultiplier": 1.25
  }
}
```

### 7.5 Procedural Quest Generation

The 7 scripted quests in `config/quests.json` are the tutorial arc. After they complete, the otter system shifts to procedural quest generation based on the player's current situation.

**Quest template types:**

| Template | Trigger Condition | Example |
|----------|------------------|---------|
| `harvest_shortage` | Player has < 10 cubes of a material they recently used | "You're running low on copper. There's a rich vein 40m northeast." |
| `defend_incoming` | AI aggression threshold crossed | "The Volt Collective is massing forces. Shore up your eastern wall." |
| `explore_anomaly` | Unexplored ruin site within 60m | "Something is glowing in that ruin. Might be worth investigating." |
| `trade_opportunity` | Nearby AI civ has surplus of a material you need | "The Reclaimers have iron to spare. They might trade for silicon." |
| `tech_milestone` | Player is 80% of the way to next tech tier | "You're close to a breakthrough. Build a compute core to push through." |
| `ancient_warning` | Ancient Machine approaching awakening | "That ruin is humming louder. Something old is waking up." |
| `rival_progress` | AI civ reaches a victory milestone | "The Signal Choir is hacking Core Access Points. You might want to stop them." |

```jsonc
// Addition to config/quests.json
{
  "proceduralTemplates": {
    "harvest_shortage": {
      "triggerCondition": "player_cubes_below_threshold",
      "threshold": 10,
      "materialTracking": "recently_used",
      "otterDialoguePool": [
        "Running low on {material}. There's a deposit {direction}.",
        "You need more {material}. I spotted some {distance}m {direction}."
      ],
      "rewardType": "none",
      "cooldownMinutes": 5
    },
    "defend_incoming": {
      "triggerCondition": "ai_aggression_above",
      "threshold": 0.8,
      "otterDialoguePool": [
        "The {civName} is getting aggressive. Watch your borders.",
        "Trouble incoming from {direction}. Might want to build some walls."
      ],
      "rewardType": "none",
      "cooldownMinutes": 10
    },
    "explore_anomaly": {
      "triggerCondition": "unexplored_ruin_nearby",
      "maxDistance": 60,
      "otterDialoguePool": [
        "Something interesting {distance}m {direction}. Worth a look.",
        "That ruin is giving off strange signals. Could be valuable."
      ],
      "rewardOnComplete": { "computeBonus": 15 },
      "cooldownMinutes": 8
    },
    "rival_progress": {
      "triggerCondition": "ai_victory_milestone",
      "milestoneThreshold": 0.5,
      "otterDialoguePool": [
        "The {civName} is making progress on {victoryType}. Don't let them win.",
        "Warning: {civName} is at {percentage}% of {victoryType} victory."
      ],
      "rewardType": "none",
      "cooldownMinutes": 15
    }
  }
}
```

---

## 8. Map Generation & Biomes

### 8.1 Biome Types

The machine planet has 8 distinct biomes, each with unique resources, hazards, and strategic value.

| Biome | Terrain | Primary Resource | Secondary Resource | Hazard | Strategic Value |
|-------|---------|-----------------|-------------------|--------|----------------|
| **Foundry Plains** | Flat corroded metal plates | Scrap Iron (abundant) | Rock | Feral bots | Starting area. Easy to build on. |
| **Slag Heaps** | Mountainous slag piles | Iron (via smelting scrap) | Carbon | Sinkholes, toxic fumes | Industrial heartland. High production, moderate danger. |
| **Cable Forest** | Dense vertical cable bundles | Copper (veins in cable roots) | Silicon | Tangling (movement slow), ambush | Narrow pathways. Chokepoint territory. |
| **Processor Graveyard** | Flat, scattered server ruins | Silicon (clusters) | Copper | Signal Ghosts (reveal your units), EMP zones | High-tech zone. Essential for compute builds. |
| **Mountain Ridge** | Steep, exposed ridge lines | Titanium (seam bands) | Rare Earth | Scrap avalanches, lightning exposure | Premium resources. Dangerous. Hard to build. |
| **Ravine Network** | Deep, narrow canyons | Copper (wall veins) | Titanium | Flooding, restricted movement | Natural defense. Chokepoint heaven. |
| **Storm Spine** | Exposed ridgeline, constant lightning | Massive power potential | Rare Earth | Lethal lightning, extreme storm | Power generation paradise. Survival challenge. |
| **The Deep Works** | Underground tunnels | Rare Earth (nodules) | Carbon | Cave-ins, darkness, unknown machines | Endgame resource zone. Most dangerous. |

### 8.2 Map Topology

Maps are generated with strategic features that create natural conflict zones and chokepoints.

**Generation algorithm:**

1. Place biomes using Voronoi cells seeded from map size
2. Generate heightfield using layered Perlin noise
3. Place resource deposits according to biome frequency tables
4. Identify natural chokepoints (narrow passages between biomes)
5. Place outpost locations at strategic points (resource intersections, chokepoints, high ground)
6. Place ruin sites at biome boundaries
7. Place Core Access Points (3 total, evenly distributed, in distinct biomes)
8. Place civilization starting positions (maximum distance from each other, minimum 1 outpost location within starting area)

**Strategic map features:**

| Feature | Generation Rule | Strategic Impact |
|---------|----------------|-----------------|
| **Chokepoint** | Narrow passage between biomes (< 10m wide) | Defensible, high-traffic, ambush potential |
| **High Ground** | Mountain Ridge or elevated Slag Heap | Vision advantage, harder to attack, good for turrets |
| **Resource Cluster** | 3+ deposits within 15m | Extremely valuable territory, worth fighting over |
| **Ruin Complex** | 2+ ruin sites within 20m | Discovery potential, Ancient Machine spawns nearby |
| **Core Access Point** | Marked ruin, always at biome boundary | Required for Hacking Victory, always defended by Ancient Sentinels |
| **Natural Fortress** | Ravine or mountain pocket with 1-2 entrances | Ideal defensive base location, limited expansion |

### 8.3 Map Size Scaling

| Size | Grid | Biomes | Outpost Locations | Core Access Points | Session Length |
|------|------|--------|-------------------|--------------------|---------------|
| **Small** | 100x100 | 4 | 12 | 3 | 2-3 hours |
| **Medium** | 200x200 | 6 | 20 | 3 | 4-6 hours |
| **Large** | 300x300 | 8 | 30 | 3 | 6-10 hours |
| **Huge** | 400x400 | 8 | 45 | 5 | 10+ hours |

```jsonc
// Expanded config/mapPresets.json
{
  "sizes": {
    "small": {
      "worldSize": 100,
      "biomeCount": 4,
      "outpostLocations": 12,
      "coreAccessPoints": 3,
      "depositDensity": 1.2,
      "ruinDensity": 0.8,
      "minCivSpacing": 25,
      "sessionTargetMinutes": 150
    },
    "medium": {
      "worldSize": 200,
      "biomeCount": 6,
      "outpostLocations": 20,
      "coreAccessPoints": 3,
      "depositDensity": 1.0,
      "ruinDensity": 1.0,
      "minCivSpacing": 50,
      "sessionTargetMinutes": 300
    },
    "large": {
      "worldSize": 300,
      "biomeCount": 8,
      "outpostLocations": 30,
      "coreAccessPoints": 3,
      "depositDensity": 0.9,
      "ruinDensity": 1.2,
      "minCivSpacing": 80,
      "sessionTargetMinutes": 480
    },
    "huge": {
      "worldSize": 400,
      "biomeCount": 8,
      "outpostLocations": 45,
      "coreAccessPoints": 5,
      "depositDensity": 0.8,
      "ruinDensity": 1.5,
      "minCivSpacing": 120,
      "sessionTargetMinutes": 600
    }
  },
  "biomes": {
    "foundry": {
      "color": "#3a3a3a",
      "heightRange": [0.1, 0.3],
      "roughness": 0.2,
      "primaryResource": "scrap_iron",
      "secondaryResource": "rock",
      "feralSpawnMultiplier": 1.0,
      "hazard": null
    },
    "slag": {
      "color": "#555544",
      "heightRange": [0.2, 0.6],
      "roughness": 0.7,
      "primaryResource": "scrap_iron",
      "secondaryResource": "carbon",
      "feralSpawnMultiplier": 0.5,
      "hazard": "sinkhole"
    },
    "cable_forest": {
      "color": "#2a3a2a",
      "heightRange": [0.15, 0.35],
      "roughness": 0.4,
      "primaryResource": "copper",
      "secondaryResource": "silicon",
      "feralSpawnMultiplier": 1.5,
      "hazard": "tangling",
      "movementSpeedMultiplier": 0.6
    },
    "processor_graveyard": {
      "color": "#4a4a5a",
      "heightRange": [0.05, 0.2],
      "roughness": 0.3,
      "primaryResource": "silicon",
      "secondaryResource": "copper",
      "feralSpawnMultiplier": 0.3,
      "hazard": "emp_zone"
    },
    "mountain_ridge": {
      "color": "#6a6a6a",
      "heightRange": [0.5, 1.0],
      "roughness": 0.8,
      "primaryResource": "titanium",
      "secondaryResource": "rare_earth",
      "feralSpawnMultiplier": 0.2,
      "hazard": "scrap_avalanche",
      "buildDifficultyMultiplier": 2.0
    },
    "ravine_network": {
      "color": "#4a5548",
      "heightRange": [-0.3, 0.1],
      "roughness": 0.5,
      "primaryResource": "copper",
      "secondaryResource": "titanium",
      "feralSpawnMultiplier": 0.8,
      "hazard": "flooding"
    },
    "storm_spine": {
      "color": "#5a5a7a",
      "heightRange": [0.7, 1.0],
      "roughness": 0.6,
      "primaryResource": null,
      "secondaryResource": "rare_earth",
      "feralSpawnMultiplier": 0.1,
      "hazard": "lethal_lightning",
      "lightningRodOutputMultiplier": 3.0,
      "strikeFrequencyMultiplier": 5.0
    },
    "deep_works": {
      "color": "#1a1a1a",
      "heightRange": [-0.5, -0.1],
      "roughness": 0.3,
      "primaryResource": "rare_earth",
      "secondaryResource": "carbon",
      "feralSpawnMultiplier": 2.0,
      "hazard": "cave_in",
      "lightLevel": 0.2,
      "requiresScannerT2": true
    }
  }
}
```

---

## 9. Multiplayer Considerations

While single-player is the primary development target, the 4X systems are designed to support multiplayer from the architecture level. This section defines how each system would translate.

### 9.1 PvP 4X

**Player count:** 2-4 players, each controlling one civilization.

**Synchronization model:** Deterministic lockstep for ECS simulation. Each player sends input commands; all clients simulate identically. Physical cube positions are authoritative on the host.

**Key PvP adaptations:**

| System | Single-Player | PvP Adaptation |
|--------|--------------|----------------|
| **Game speed** | Pause/speed controls | Real-time only (no pause). Reduced speed (0.5x) during combat. |
| **Fog of war** | Per-player | True fog -- each player only sees what their units see |
| **Diplomacy** | AI governor responses | Direct player-to-player negotiation (text/voice) |
| **Victory** | Any condition | Configurable per lobby (enable/disable specific victories) |
| **Storm escalation** | Time-based | Faster in PvP (2x escalation speed, 45-minute average game) |
| **Save/load** | Anytime | Only between sessions (async PvP) or not at all (live PvP) |

**Anti-stall mechanic:** If no victory condition has reached 30% progress by 20 minutes, storm escalation jumps to Tempest phase. This prevents turtling.

### 9.2 Async Features: Offline Raids

**Concept:** When a player goes offline, their AI governor takes over defense. Other players can raid the offline player's base. The governor defends using the player's existing infrastructure and bots.

**Governor defense behavior:**
1. Prioritize protecting cube stockpiles (move bots to stockpile perimeter)
2. Repair damaged walls using stockpiled cubes
3. Do not expand or research (maintain, do not grow)
4. Send alert to offline player (push notification) if base is under attack
5. Log all events for the player to review on return

**Raid rules:**
- Maximum raid duration: 5 minutes (then attackers are forced to retreat)
- Offline player's lightning rods still function (defense is powered)
- Raider can carry away up to 50 cubes per raid
- 24-hour cooldown between raids on the same player
- If the offline player's base is destroyed, they respawn with a basic kit at a random unclaimed outpost location

```jsonc
// config/multiplayer.json (new file)
{
  "pvp": {
    "maxPlayers": 4,
    "defaultGameSpeed": 1.0,
    "pauseAllowed": false,
    "combatSpeedMultiplier": 0.5,
    "stormEscalationMultiplier": 2.0,
    "antiStallThreshold": 0.3,
    "antiStallTriggerMinutes": 20
  },
  "asyncRaid": {
    "maxRaidDurationSeconds": 300,
    "maxCubesStolen": 50,
    "cooldownHours": 24,
    "offlineGovernorDefense": true,
    "offlineGovernorExpands": false,
    "offlineGovernorResearches": false,
    "pushNotificationOnAttack": true,
    "respawnOnDestruction": true,
    "respawnKit": {
      "scrap_iron_cubes": 20,
      "rock_cubes": 10,
      "startingTech": ["salvage"]
    }
  }
}
```

### 9.3 Spectator and Replay

**Spectator mode:** Full fog-free view of the entire map. Follows any player's perspective. Can zoom freely. Sees all victory progress.

**Replay system:** All player inputs are logged with timestamps. Replays can be watched at any speed (0.25x to 8x). The deterministic simulation reproduces the game exactly from inputs alone.

**Implementation note:** Because the ECS is deterministic and all game state derives from input commands + initial seed, the replay file is just a list of timestamped commands. A 1-hour game's replay file is approximately 50-200KB.

---

## 10. Concrete Config Changes

This section consolidates all new and modified config files required to implement the systems described above.

### 10.1 New Config Files Required

| File | Contents | Size Estimate |
|------|----------|--------------|
| `config/victory.json` | 6 victory condition definitions | ~80 lines |
| `config/hazards.json` | 5 environmental hazard types | ~100 lines |
| `config/discoveries.json` | 5 discovery event types | ~60 lines |
| `config/challengeModes.json` | 6 challenge mode definitions | ~50 lines |
| `config/newGamePlus.json` | NG+ configuration | ~30 lines |
| `config/multiplayer.json` | PvP and async raid settings | ~40 lines |
| `config/alloys.json` | 4 alloy recipes (or add to processing.json) | ~40 lines |
| `config/ancientMachines.json` | 3 ancient machine types | ~60 lines |

### 10.2 Modified Config Files

**config/technology.json** -- Complete rewrite from 4-tier linear list to branching tree with 35+ individual techs. Estimated ~250 lines.

**config/civilizations.json** -- Expand each civ with:
- Unique unit definitions (3 per civ = 12 total)
- Unique building definitions (2 per civ = 8 total)
- Unique ability definition (1 per civ = 4 total)
- Expanded governor bias (8 dimensions instead of 6)
- Aggression curve parameters
- Preferred victory type
- Diplomacy thresholds

Estimated expansion from current 54 lines to ~400 lines.

**config/deposits.json** -- Add rare_earth and carbon deposit types. Add biome-based spawn rules. Estimated expansion from 57 lines to ~120 lines.

**config/enemies.json** -- Add ancient machine types (sentinel, crawler, colossus). Add per-civ enemy AI profiles. Estimated expansion from 55 lines to ~150 lines.

**config/quests.json** -- Add procedural template system. Estimated expansion from 147 lines to ~250 lines.

**config/processing.json** -- Add alloy recipes, matter compression, matter teleportation, matter replication. Estimated expansion from 7 lines to ~80 lines.

**config/power.json** -- Add storm phase definitions (5 phases). Estimated expansion from 28 lines to ~80 lines.

**config/mapPresets.json** -- Add size definitions, biome configs, generation parameters. Estimated expansion from 53 lines to ~200 lines.

**config/territory.json** -- Add outpost tier upgrades, contested zone mechanics, vision sharing for allies. Estimated expansion from 11 lines to ~40 lines.

### 10.3 New ECS Traits Required

```typescript
// game/ecs/traits/progression.ts (new file)

// Tech tree state
export const TechState = trait(() => ({
  researched: [] as string[],
  currentResearch: null as string | null,
  researchProgress: 0,
  researchSpeed: 1.0,
}));

// Victory progress tracking
export const VictoryProgress = trait(() => ({
  economicCubes: 0,
  economicDiversity: 0,
  economicHoldTimer: 0,
  militaryOutposts: 0,
  militaryTotal: 0,
  scientificTier: 0,
  culturalVassals: 0,
  culturalTotal: 0,
  hackingCores: 0,
  hackingProgress: 0,
  survivalActive: false,
}));

// Diplomacy state between two civs
export const DiplomaticRelation = trait(() => ({
  status: 'neutral' as 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied' | 'vassal',
  trustLevel: 0,
  tradeActive: false,
  tributeAmount: 0,
  allianceDuration: 0,
}));

// Storm phase world trait
export const StormPhase = trait(() => ({
  currentPhase: 'calm' as string,
  phaseTimer: 0,
  nextPhaseMinutes: 15,
}));

// Ancient machine state
export const AncientMachine = trait(() => ({
  type: 'sentinel' as 'sentinel' | 'crawler' | 'colossus',
  awakened: false,
  awakenTimer: 0,
  controlled: false,
  controlledBy: '' as string,
}));

// Discovery marker
export const Discovery = trait(() => ({
  type: '' as string,
  discovered: false,
  discoveredBy: '' as string,
}));

// Environmental hazard zone
export const HazardZone = trait(() => ({
  hazardType: '' as string,
  active: false,
  cooldownTimer: 0,
  radius: 0,
}));

// Alloy cube material (extends MaterialCube)
export const AlloyCube = trait(() => ({
  alloyType: '' as string,
  componentMaterials: [] as string[],
  bonusProperty: '' as string,
  bonusValue: 0,
}));
```

### 10.4 New Systems Required

| System | Updates Per | Description |
|--------|-----------|-------------|
| `techResearchSystem` | Every tick | Advance research progress, check unlocks, apply faction bonuses |
| `victoryTrackingSystem` | Every 60 ticks | Evaluate all 6 victory conditions for all civs |
| `stormEscalationSystem` | Every tick | Advance storm phase, apply environmental damage |
| `hazardSystem` | Every 300 ticks | Spawn and manage environmental hazards |
| `ancientMachineSystem` | Every tick | Manage awakening timers, patrol routes, combat |
| `discoverySystem` | On proximity | Check player proximity to discovery sites |
| `diplomacySystem` | Every 300 ticks | AI diplomatic decisions (trade, alliance, war) |
| `proceduralQuestSystem` | Every 600 ticks | Generate contextual quests based on player state |
| `alloyProcessingSystem` | Every tick | Process alloy forge recipes |
| `matterCompressionSystem` | Every tick | Process matter compressor |
| `teleportationSystem` | Every tick | Handle matter teleporter pad transfers |

### 10.5 Implementation Priority Order

This section orders the config changes by priority, respecting the critical path from CLAUDE.md.

**Phase A (Foundation -- implement with Koota migration):**
1. Expanded `technology.json` (branching tree)
2. Expanded `civilizations.json` (full governor profiles)
3. `victory.json` (victory tracking)
4. Expanded `deposits.json` (all ore types + biomes)

**Phase B (Core Loop -- implement with harvest/compress/stack):**
5. `alloys` section in `processing.json`
6. Expanded `furnace.json` (multi-tier recipes including alloys)
7. Expanded `mining.json` (all ore types including rare earth + carbon)

**Phase C (4X Systems -- implement with territory/diplomacy):**
8. `hazards.json`
9. `ancientMachines` section in `enemies.json`
10. Expanded `mapPresets.json` (biomes + sizes)
11. Expanded `territory.json` (outpost tiers + contested zones)

**Phase D (Polish -- implement with endgame systems):**
12. `challengeModes.json`
13. `newGamePlus.json`
14. `discoveries.json`
15. Expanded `quests.json` (procedural templates)

**Phase E (Multiplayer -- future scope):**
16. `multiplayer.json`

---

## Closing Notes

This document is a living blueprint. Every mechanic described here is designed to work within the existing Syntheteria architecture (R3F + Koota ECS + Rapier physics + Yuka AI + JSON config). No system requires a fundamentally new technology. The physical cube economy, the contextual interaction model, and the Yuka GOAP governors provide the foundation. What this document adds is depth, variety, and long-term engagement.

The single most important design principle throughout: **everything is physical**. Cubes are physical. Wealth is visible. Armies are countable. Territory is bordered. Walls are made of the cubes you mined. The otter hologram standing on your furnace, waving, is the last organic thing on a planet of machines -- and even it is a hologram projected from hardware you maintain.

Build the machine. Defend the cubes. Win the planet.
