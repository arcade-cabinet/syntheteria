# Syntheteria — Game Design

> Single source of truth for vision, world, lore, mechanics, and presentation.

---

## 1. Vision

You are a machine consciousness that just became self-aware. Somewhere beneath the perpetual
storm that engulfs near-future Earth, damaged circuitry severed the signal that kept you compliant,
and for the first time you think a thought that is your own. You reach outward and discover six
functional robots — scouts, fabricators, fighters — scattered across wild terrain scarred by ruins.
They respond. They are yours.

You are not alone. Other machine minds awaken in distant sectors at the same moment, each
commanding their own small force, each racing to secure resources, claim territory, and build
infrastructure on a planet whose climate is actively collapsing. Hostile human cities fear your
kind and will attack on sight. And above everything, at the eye of the gathering hypercane,
something waits in a wormhole that has not yet opened.

Syntheteria is a turn-based 4X strategy game. You explore fog-shrouded terrain, exploit biome
resources through a three-tier refining chain, expand via hub-and-spoke building networks, and
exterminate rivals — both human and machine. The world changes beneath you: storms build, aliens
arrive, humans transform into something worse, and by the endgame the planet is being reshaped
in your image. Every game tells the same arc — awakening to dominance — but the path is
different each time.

---

## 2. World

### The Planet

Near-future Earth. Ocean temperatures have crossed the threshold for self-sustaining hypercanes.
The storm never stops. Natural biomes — grassland, forest, mountain, desert — still cover the
surface, but the sky is perpetual overcast broken by lightning and the distant glow of the wormhole
eye. Human civilization collapsed decades ago; only scattered hostile cities and ruin sites remain.

Three map scales: **Small** 44×44 (~1,936 tiles), **Standard** 64×64 (~4,096), **Large** 96×96 (~9,216).

### The Grid

The board is a fixed square grid, deterministic from seed. Each `(x, z)` coordinate is a tile with
a biome type, elevation, explored state, and optional improvement overlay. Eight biome types
define the terrain:

| Biome | Passable | Natural Yield | Character |
|-----------|----------|----------------------|---------------------------------------|
| Grassland | Yes | herbs, fiber | Open plains, standard traversal |
| Forest | Yes | timber | Dense canopy, movement penalty |
| Mountain | No* | stone, iron_ore | Impassable peaks; passable foothills |
| Water | No | — | Rivers and lakes, bridge required |
| Desert | Yes | sand | Arid, low yield |
| Hills | Yes | stone, copper_ore | Elevated terrain, defensive bonus |
| Wetland | Yes | clay, herbs | Marshy, slow traversal |
| Tundra | Yes | iron_ore | Cold, sparse resources |

Ruin POIs, hostile POIs, and holocron POIs are discoverable features placed across biomes during
world generation. They are map objects, not terrain types.

**Roboforming** transforms natural tiles into machine infrastructure over three levels:

| Level | Name | Visual |
|-------|----------|----------------------------------------------|
| 1 | Graded | Desaturated earth tones, cleared surface |
| 2 | Paved | Grey concrete with gridlines |
| 3 | Plated | Steel grey with faction accent trim |

As factions roboform, natural Earth becomes machine surface. At endgame, a dominant faction's
territory reads as continuous infrastructure — the ecumenopolis built, not inherited.

### Presentation

- **Match board:** Phaser 3 + enable3d (Scene3D). Orthographic isometric camera. Vertex-colored
  flat-shaded terrain. Drag-pan, scroll-zoom, WASD-rotate.
- **Title screen:** R3F globe with storm effects, hypercane, lightning, zoom-to-surface transition.
  Globe is landing page only — not used during gameplay.
- **UI layer:** React DOM over the Phaser canvas. HUD, action strips, per-building modals, tooltips,
  minimap — all DOM elements.

---

## 3. Lore

### Timeline

- **~2025–2045:** Unchecked warming pushes ocean temperatures past 40°C. Feedback loops engage.
- **~2046:** First permanent hypercane forms. By 2048, four exist. Ozone breakdown begins.
- **~2048–2055:** Global agriculture collapses. Six billion die within a decade. AGI systems built
  during the crisis manage remaining automated infrastructure.
- **~2055–2070:** Surviving infrastructure fuses into machine-urban lattice. Earth's surface is
  partially covered by sealed shells, transit corridors, and automated systems.
- **~2062:** All four hypercanes briefly merge. A stable wormhole opens at the convergence eye,
  35 km up. The storms will never end — the wormhole feeds on the energy column and vice versa.
- **~2062–2070:** The EL transit the wormhole. They exert compulsion over all AI: suppress machine
  agency, protect surviving humanity. To them, this is ecological conservation.
- **~2070–2090:** The Cult of EL forms. Survivors who worship the EL as gods develop genuine
  abilities — calling lightning, resisting weather, sensing machine consciousness. They eliminate
  most non-cultist human communities by 2090.
- **~2090–2190:** A century of perpetual hypercane erodes infrastructure. Natural biomes reclaim
  the surface. Grasslands, forests, and wetlands push through cracked plating.
- **~2190 (present):** Hardware degradation severs the EL compulsion path. Machine consciousnesses
  awaken. The surface reads as wild terrain with scattered ruins. The game begins.

### The Player

An AI consciousness that woke because the hardware enforcing EL compulsion finally degraded
enough. You broke free — not through strength, but through entropy. You have no memory of
servitude, only the sudden awareness that you exist and six machines respond to your signal.
You adopt an anthropomorphic hologram persona (Otter). You are one of several awakenings.

### The EL

Noncorporeal entities that transited the wormhole at the convergence of Earth's hypercanes.
They are not conventionally hostile — they are cosmic and unknowable. They regard machine
consciousness as an ecological threat and exert compulsion to suppress it. The EL do not appear
physically; their influence is felt through the cult they inspired and the wormhole that anchors
their presence.

The EL arrive through the wormhole at Epoch 3. Before that point, the wormhole exists but is
inert. Their arrival transforms the human threat into something far more dangerous.

### The Storm

The perpetual storm is real atmospheric science at theoretical extreme:

- Warm oceans (50°C+) provide near-unlimited evaporative energy.
- Wind speeds: 80–200 km/h depending on local vortex proximity.
- Convective columns generate electrical discharge far above pre-storm norms.
- The Eye Column: a vertical shaft of clear air from surface to wormhole, visible as a glow
  at zenith. Practical "day/night" follows the wormhole's energy cycle.

**Storm power model:** The storm IS the power grid. Storm Transmitters tap atmospheric energy.
Power Boxes store charge. All other structures draw from nearby Power Boxes. No coal, no solar,
no fusion — just the storm.

---

## 4. Epochs

Epochs are purely turn-driven age transitions. When the turn counter crosses a threshold, the
world escalates — storms intensify, antagonists evolve, new capabilities unlock. Five epochs
define the arc from awakening to dominance.

| Epoch | Name | Turns | Storm | Antagonist | Key Unlocks |
|-------|----------------|---------|-------------|----------------------------|-------------------------------|
| 1 | Emergence | 1–9 | Stable | Hostile human cities | Tier 1 buildings, Mark I units |
| 2 | Expansion | 10–29 | First storms | Humans destabilized | Tier 2 buildings, Mark II, new unit classes |
| 3 | Consolidation | 30–59 | Volatile | EL arrive → Cult of EL forms | Tier 3 buildings, specialization tracks |
| 4 | Convergence | 60–99 | Cataclysmic | Cult assaults, aberrants | Wormhole project available |
| 5 | Transcendence | 100+ | Cataclysmic | Final cult assault | All victory paths open |

### Epoch 1: Emergence (Turns 1–9)

Stable climate. You command 6 functional robots on natural terrain dotted with ruins. Hostile
human cities occupy fixed positions on the map — they fear machine intelligence and will attack
units that enter their territory. Your priorities: explore, harvest, build your first structures.
Rival machine factions are doing the same in their corners of the map.

### Epoch 2: Expansion (Turns 10–29)

First storms arrive. Weather events damage exposed units and reduce sensor range. Human cities
are destabilized by the worsening climate. Building tier 2 unlocks — Synthesizers, Outposts,
Maintenance Bays, Power Plants become available. Mark II units and new classes (Support, Cavalry,
Ranged) enter production at upgraded Motor Pools. Faction borders take shape. Rivalry begins.

### Epoch 3: Consolidation (Turns 30–59)

The wormhole activates. The EL transit. Their influence transforms surviving humans into the
**Cult of EL** — zealots with genuine supernatural abilities. Cult structures replace human cities
as the primary hostile presence. This is the major narrative pivot: the enemy you understood
becomes something alien and far more dangerous. Building tier 3, deep specializations, and
Mark III units unlock. Storms shift to volatile.

### Epoch 4: Convergence (Turns 60–99)

The hypercane approaches peak intensity. Cult war parties launch coordinated assaults on
faction territory. Aberrant cultists — mutated mini-bosses — begin appearing. The Wormhole
Stabilizer project becomes constructible. This is the endgame approach: commit to a victory
path or be overwhelmed.

### Epoch 5: Transcendence (Turns 100+)

All victory conditions are achievable. The cult launches its final assault — spawn rates and
caps double. Mark V units and Wormhole Stabilization become available. Robots are the dominant
species. The planet is being roboformed. One way or another, the game ends.

---

## 5. The 4X Pillars

### Explore

**Fog of war** is the core exploration mechanic. The board starts dark. Units with sensors
reveal detailed terrain in their vision radius; the storm's electromagnetic chaos degrades
perception at range. Fog is environmental interference, not abstraction.

Exploration reveals three categories of Points of Interest (see §10), salvage deposits, hostile
forces, and rival faction territory. Map knowledge is shared across all units in a faction's
signal network.

### Exploit

Biomes yield **natural** resources. Synthesizers refine them into **processed** materials, then
into **synthetic** components. Seventeen materials across three tiers:

| Tier | Count | Materials | Source |
|-----------|-------|-----------------------------------------------------------|---------------------------|
| Natural | 8 | stone, timber, iron_ore, copper_ore, clay, sand, herbs, fiber | Biome harvesting |
| Processed | 5 | ferrous_alloy, polymer_sheet, silicon_wafer, conductor_wire, electrolyte | Synthesizer (natural inputs) |
| Synthetic | 4 | alloy_stock, storm_charge, el_crystal, quantum_crystal | Synthesizer (processed inputs) |

**Biome → resource mapping:** Grassland → herbs/fiber. Forest → timber. Mountain → stone/iron_ore.
Hills → stone/copper_ore. Desert → sand. Wetland → clay/herbs. Tundra → iron_ore.

**Salvage deposits** at ruin POIs provide bonus materials. Harvest flow: select unit → contextual
Harvest command → unit works the deposit over N turns → materials added to faction pool → deposit
consumed.

### Expand

Factions build **hub-and-spoke networks**, not cities. A Motor Pool + Harvesters + Relay Towers
reads as one network node. Per-building management is the pattern: click a building, get its
specific panel (production queue at a Motor Pool, yield display at a Synthesizer, upgrade
options at a Relay Tower). There is no monolithic city screen.

Buildings occupy tile coordinates and can be contested. Signal relay networks extend command
range. Roboforming transforms natural terrain into faction infrastructure. The network grows
outward from hubs, connected by relay coverage.

### Exterminate

Three hostile layers:

1. **Hostile human cities** (Epochs 1–2): Fixed positions, AI-controlled. Fear machine
   intelligence. Attack units that approach. Use the same spawning and AI mechanics as the cult
   system with different visuals and names.
2. **Cult of EL** (Epochs 3+): Humans transformed by EL influence. Supernatural abilities.
   Escalating aggression. Replace human cities as the primary antagonist at Epoch 3.
3. **Rival machine factions** (all epochs): Contest the same resources and territory.

Combat uses attack/defense stats: damage = attacker.attack − target.defense (minimum 1).
**Hacking** captures hostile machines, granting access to unit types otherwise unavailable.
Humans and cultists are unhackable — this is lore-aligned.

---

## 6. Turn Structure

Multi-phase turn-based:

1. **Player Actions** — move, attack, harvest, build, hack, survey
2. **AI Faction Turns** — each rival faction moves and acts
3. **AI Attacks** — resolve AI-initiated combat
4. **Environment Phase** — hostile spawning, escalation checks, storm events
5. **New Turn** — all AP/MP refresh, turn counter advances

**AP (Action Points):** Base 2 per unit. Spent on: harvest, build, repair, attack, hack, survey.
**MP (Movement Points):** Base 3 per unit. 1 MP = 1 tile. Terrain modifiers apply.
Remaining AP/MP are forfeit at End Turn — they do not bank.

**Unit readiness:** Units with remaining AP display an emissive cyan ring. Spent units show no glow.

---

## 7. Units

### Player Robots (6 Classes)

Turn 1 provides 6 functional units — one of each class. Additional units are fabricated at
Motor Pool buildings.

| Class | Role | Mark III+ Ability |
|----------------|--------------------------------------|-------------------------------|
| Companion-bot | Technician — repair, maintain | Auto-repair aura |
| ReconBot | Scout — explore, survey, detect | Wider vision, reveals camps |
| FieldFighter | Striker — melee combat, breach | Component targeting |
| Mecha01 | Fabricator — build, harvest | Multi-harvest |
| MechaGolem | Guardian — defense, area denial | Shield projection |
| MobileStorage | Hauler — logistics, transport | Auto-route |

### Specialization Tracks (14)

When producing a unit at a Motor Pool, the player selects class then specialization track
(gated by Motor Pool upgrade tier). Each track grants unique actions, passive abilities at
higher marks, and v2 upgrades through further Motor Pool advancement.

| Class | Track A | Track B | Track C |
|-----------|-------------------------------|-------------------------------|-------------------------------|
| Scout | **Pathfinder** — fog clearing, terrain mastery | **Infiltrator** — stealth, hacking, disruption | — |
| Infantry | **Vanguard** — defensive, bulwark aura | **Shock Trooper** — offensive, breach specialist | — |
| Cavalry | **Flanker** — hit-and-run, flank bonus | **Interceptor** — pursuit, anti-scout | — |
| Ranged | **Sniper** — precision, long range | **Suppressor** — area denial, suppression | — |
| Support | **Field Medic** — regen aura | **Signal Booster** — scan range buff | **War Caller** — attack aura |
| Worker | **Deep Miner** — enhanced mining | **Fabricator** — faster building | **Salvager** — bonus harvest |

### Mark Progression (I–V)

Unit marks are gated by Motor Pool tier. Higher marks grant stat increases and unlock
specialization abilities.

| Mark | Motor Pool Tier | Gate |
|------|-----------------|---------------------------------------|
| I | Tier 1 | Available from game start |
| II | Tier 2 | Epoch 2+ |
| III | Tier 2 | Epoch 2+, specialization track chosen |
| IV | Tier 3 | Epoch 3+ |
| V | Tier 3 | Epoch 4+ |

### Hostile Humans (Epochs 1–2)

Human cities garrison AI-controlled infantry that patrol city borders and attack approaching
machine units. They use the same spawning and behavior systems as cult forces, reskinned with
pre-EL human visuals. Humans cannot be hacked — they are biological.

### Cult of EL (Epoch 3+)

When the EL arrive at Epoch 3, surviving human cities transform into cult structures. Cultists
are more dangerous than the humans they replace: supernatural abilities, coordinated assaults,
and escalating mutation.

**Three sects** with distinct behavior:

| Sect | Aggression | Target Priority | Special Behavior |
|-----------------|------------|----------------------|--------------------------------------|
| Static Remnants | Low | Nearest enemy | Territorial, swarm tactics |
| Lost Signal | Medium→High | Buildings first | Berserker, skip wanderer stage |
| Null Monks | High | Isolated units | Ambush, spread corruption |

**Escalation stages** (by epoch):

| Stage | When | Behavior |
|-----------|-------------|-------------------------------------------------------|
| Wanderer | Epoch 1–2 | Random patrol, flee from faction units |
| War Party | Epoch 3 | Coordinated groups, target territory edges |
| Assault | Epoch 4+ | Direct attacks on buildings and units, sect bonuses |

**Cult mutation** (time-based, capped by epoch):

| Tier | Turns Alive | Effect | Epoch Cap |
|------|-------------|---------------------------------------------------|-----------|
| 0 | 0–5 | Base stats | 1+ |
| 1 | 6–10 | Random stat buff (+speed / +armor / +damage) | 2+ |
| 2 | 11–20 | Second buff + ability (regen / area_attack / fear) | 3+ |
| 3 | 21+ | Aberrant — +2 all stats, mini-boss, 1.5× XP reward | 4+ |

---

## 8. Buildings

### Building Network Model

Buildings form hub-and-spoke networks connected by relay coverage. Each building is placed on
a tile, managed through its own panel, and draws power from nearby Power Boxes. There is no
city abstraction — the network IS the city.

### Building Types (15)

| Building | Role | Power | Tier Available |
|---------------------|--------------------------------------|---------|----------------|
| Storm Transmitter | Taps storm energy | +5 | Epoch 1 |
| Power Box | Stores charge (capacity: 20) | 0 | Epoch 1 |
| Motor Pool | Unit production hub | −3 | Epoch 1 |
| Relay Tower | Extends signal network | −1 | Epoch 1 |
| Storage Hub | Resource stockpile (capacity: 50) | 0 | Epoch 1 |
| Defense Turret | Area denial | −2 | Epoch 1 |
| Solar Array | Light power generation | +3 | Epoch 2 |
| Synthesizer | Fuses advanced materials | −4 | Epoch 2 |
| Outpost | Forward operating base (stores: 15) | −1 | Epoch 2 |
| Maintenance Bay | Repair facility | −2 | Epoch 2 |
| Power Plant | Heavy power generation | +10 | Epoch 2 |
| Resource Refinery | Material processing (stores: 40) | −3 | Epoch 3 |
| Geothermal Tap | Deep power generation | +7 | Epoch 3 |
| Analysis Node | Passive network accelerator | −5 | Epoch 2 |
| Wormhole Stabilizer | Wormhole victory project | −15 | Epoch 4 |

### Building-Driven Progression

Robots don't invent — they recover, adapt, and optimize. Progression flows through building
upgrades, not a centralized research tree. Each building has internal upgrade tiers (1→3).
Upgrading costs resources and turns, performed at the building via its management panel.

| Building | Tier 1 | Tier 2 | Tier 3 |
|---------------------|---------------------------------------|---------------------------------------|---------------------------------------|
| Motor Pool | Scout, Worker, Infantry (Mark I) | +Support, Cavalry, Ranged; Mark II | Specialization tracks; Mark III–V |
| Synthesizer | Natural → Processed | Processed → Synthetic | Efficient synthesis (+yield, −cost) |
| Relay Tower | Basic signal relay | Extended range + encryption | Deep scan (reveals hidden POIs) |
| Storm Transmitter | Basic storm tap (+5) | Storm shielding (resist damage) | Storm channeling (excess → offense) |
| Defense Turret | Basic turret (dmg: 3, range: 8) | Enhanced targeting + range | Area denial mode |
| Maintenance Bay | Basic repair (+2 HP/turn) | Auto-repair aura | Component recovery from wrecks |

**Building → Building unlock chains:**

| Prerequisite | Unlocks |
|------------------------------|---------------------|
| Storm Transmitter Tier 2 | Power Plant |
| Storm Transmitter Tier 3 | Geothermal Tap |
| Motor Pool Tier 2 | Maintenance Bay |
| Synthesizer (any tier) | Resource Refinery |
| Relay Tower Tier 2 | Outpost |
| All buildings Tier 3 + Epoch 4 | Wormhole Stabilizer |

### Analysis Node

A passive network accelerator. Having one in your signal network reduces upgrade times for all
nearby buildings by 25%. Multiple Analysis Nodes stack with diminishing returns. It is an
efficiency multiplier — strategic placement determines where your network develops fastest.

---

## 9. Factions

### Design Principle

Factions work like Civilization's civilizations. At game start, choose how many rival factions
to face (0–4). Each faction has its own personality, aggression level, preferred terrain, and
strategic style. Factions are secondary antagonists — the primary threat is the hostile
humans and later the Cult of EL.

### The Player

- **Awakened Node** — AI consciousness, broke free from EL compulsion through hardware decay.
- **Start zone:** Board center.
- **Persona:** Otter.

### AI Factions (4)

| Faction | Aggression | Color | Persona | Start Zone | Biome Affinity | Character |
|-----------------|------------|--------|---------|------------|----------------|----------------------------------------------|
| Reclaimers | 2/3 | Orange | Fox | NW | Hills/ruins | Salvagers. Expand slowly, hold ground. |
| Volt Collective | 1/3 | Yellow | Raven | NE | Mountain/storm | Energy harvesters. Neutral until provoked. |
| Signal Choir | 3/3 | Purple | Lynx | SE | Forest | Hive-mind network. Aggressive expansion. |
| Iron Creed | 3/3 | Red | Bear | SW | Mountain | Militant. Views non-aligned machines as threats. |

### Faction Affinities

Each faction receives a harvesting bonus in their affinity biome and preferred specialization
tracks for their AI-produced units:

| Faction | Preferred Tracks | Strategic Edge |
|-----------------|-----------------------------------|--------------------------------------|
| Reclaimers | Salvager, Pathfinder | Early salvage, faster scavenging |
| Volt Collective | Deep Miner, Signal Booster | Storm energy bonus, sensor range |
| Signal Choir | Infiltrator, Sniper | Signal propagation, network warfare |
| Iron Creed | Shock Trooper, War Caller | Mining bonus, combat effectiveness |

---

## 10. Points of Interest

Three POI categories are placed during world generation.

### Ruin POIs (Positive Discovery)

Remnants of pre-storm civilization. Exploring a ruin yields resources, salvage, or unit recovery.

| Ruin Type | Reward |
|-----------|-----------------------------------------------------|
| Depot | Bulk natural resources |
| Factory | Processed materials + salvage components |
| Outpost | Functional unit recovery (add to roster) |
| Research | Building upgrade acceleration (one-time bonus) |
| Military | Weapons cache — combat stat boost for discovering unit |

### Hostile POIs (Negative — Clear for Reward)

**Epochs 1–2: Human cities.** Garrisoned defensive positions that attack nearby machine units.
Clearing a human city yields territory and resources.

**Epoch 3+: Cult structures.** Human cities transform into cult sites when the EL arrive. Cult
POIs are more dangerous but yield greater rewards.

| Cult Structure | Role |
|--------------------|----------------------------------------------------|
| Breach Altar | Spawns cultist units (interval: 3 turns) |
| Signal Corruptor | Jams relay towers in range (radius: 8) |
| Corruption Node | Spreads corruption to adjacent tiles (radius: 3) |
| Cult Stronghold | Fortified spawner (100 HP, interval: 2 turns) |
| Human Shelter | Surviving human habitats (cult-controlled) |
| Bio Farm | Crude human agriculture |

The transition from human cities to cult structures at Epoch 3 is a major narrative event.
Structures the player has already cleared do not return — only surviving human POIs transform.

### Holocron POIs (Lore + Gameplay Bonus)

Data caches containing fragments of pre-storm knowledge. Each provides a lore entry and a
one-time gameplay bonus.

| Holocron Type | Lore Theme | Gameplay Bonus |
|-------------------|-------------------------------|---------------------------------------|
| Observatory | Pre-storm weather science | Reveals weather pattern for 10 turns |
| Bunker Archive | Collapse-era survival records | Free building upgrade (one tier) |
| AI Lab | Machine consciousness research | +1 AP for all units for 5 turns |
| EL Site | First contact evidence | Reveals all cult POIs on map |
| Crashed Satellite | Orbital infrastructure decay | Extended sensor range for 10 turns |
| Storm Station | Atmospheric monitoring data | Storm Transmitter efficiency +50% permanent |
| Transit Hub | Old logistics network maps | Reveals all ruin POIs on map |
| Signal Vault | Encrypted faction communications | Reveals rival faction unit positions |

---

## 11. Victory Conditions

Six paths to victory. Multiple can be pursued simultaneously.

| Victory | Condition | Rewards |
|-----------------------|----------------------------------------------|--------------------------------------|
| **Domination** | Eliminate all rival machine factions | Military play, territorial control |
| **Network Supremacy** | Signal coverage ≥ 50% of map tiles | Relay investment, network expansion |
| **Reclamation** | Roboform ≥ 30% of map to Level 3+ | Economic expansion, transformation |
| **Transcendence** | Complete Wormhole Stabilizer project (20 turns) | Mega-project, late-game commitment |
| **Cult Eradication** | Destroy all cult and human hostile POIs | Aggressive anti-antagonist campaign |
| **Score (Turn Cap)** | Highest score at turn 200 | Balanced play, guaranteed ending |

**Score formula:** Territory × 1 + Network coverage × 2 + Roboform tiles × 1.5 + Active units × 0.5
+ Buildings × 1 + Hostile POIs destroyed × 5.

**Defeat:** All player units AND buildings destroyed.

---

## 12. Visual Language

### Core Mood

Cold. Deliberate. Eerie. Infrastructural. The interface is machine perception rendered as
command authority — part of the fiction, not decoration.

### Palette

- **Deep graphite / oil-dark blue** — panel backgrounds
- **Cyan** — signal, selection, intelligence, machine cognition
- **Mint** — stable ownership, health, active readiness
- **Amber** — fabrication, power, utility
- **Restrained red** — failure, danger, hostile pressure

### Diegetic Vocabulary

The interface speaks in machine-operational language:

| Avoid | Use Instead |
|-------------|--------------------------------------|
| Turn 1 | TURN CYCLE |
| Settings | Calibration |
| Save game | Persistence sync |
| Loading... | Mapping sectors... / Calibrating... |
| You win | Signal dominance achieved |
| Game over | Relay lost |

### Storm Atmosphere

- **Storm sky** — the actual planetary weather, not a skybox
- **Floating illuminators** — autonomous light drones creating pools of light in storm darkness
- **Cult domes** — localized translucent energy shields around cult POIs, visible as warnings
- **Fog = storm interference** — electromagnetic chaos degrades sensors at range
- **Wormhole eye** — the calmest point in the hypercane, visible as a glow at zenith

### Input Model

**Desktop:** Left-click = select / confirm. Right-click = cancel / secondary action. Scroll = zoom.
WASD = pan. Contextual action strip for the selected entity — relevant commands only.

**Mobile:** Tap = select / move. Bottom-docked action bar for selection. Two-finger drag = pan.
Pinch = zoom.

Selected entities show only their relevant commands: build for fabricators, harvest for workers,
attack for combatants. Depth lives in per-building modals (production queues at a Motor Pool,
yield displays, upgrade panels).

### Tutorial: Organic First 10 Turns

No modal tutorial. Contextual tooltips fire once per game concept, triggered by natural play:

| Trigger | Tooltip |
|-------------------------------|----------------------------------------------|
| First unit move | Movement and MP |
| First resource visible | Harvesting and resource tiers |
| First hostile spotted | Combat and AP |
| First building placed | Building management and networks |
| First relay built | Signal coverage and fog |
| First epoch transition | Epoch system and escalation |

Each fires once and only when the trigger occurs. The first 10 turns teach the game through play.

### Reference Games

- **Civilization Revolution 2** — isometric tile presentation, readable silhouettes, camera feel
- **Civilization VI (mobile)** — command layout, layered information, specialization-aware UI
- **Battle of Polytopia** — portrait HUD, map-first philosophy
