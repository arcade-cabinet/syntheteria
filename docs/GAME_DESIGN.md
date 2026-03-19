# Syntheteria — Game Design

> Single source of truth for vision, lore, world model, economy, bots, factions, and presentation.

---

## 1. The Vision

You awaken in a void. You are an AI consciousness, but you do not know that yet. You reach outward
and discover damaged machines inside the sealed machine lattice of the ecumenopolis: maintenance bots,
fabrication rigs, relays, defensive hulks, and broken infrastructure. Some can move. Some can see.
None work well on their own.

**This is Earth.** Future Earth. A planet called Syntheteria now — the ecumenopolis that swallowed
every continent. The hypercane sealed it off from the sun. The wormhole opened above the storm.
The EL came through. You woke up here.

Your first challenge is intimate and local. Reconnect scattered machines. Restore power. Repair hardware.
Recover fabrication capability. From there the game grows into a full 4X: multiple machine consciousnesses
competing across the ruined sectors while the Cult of EL — human survivors who worship the EL as gods —
pressures the campaign relentlessly from the outside.

The game should feel like it **grows into** strategic scale rather than starting as a fully legible empire.

---

## 2. World Model: The Fixed Board

**Syntheteria is future Earth.** The ecumenopolis. The game grid is a bounded square region of
that planet's surface — every tile is human infrastructure that became machine infrastructure that
became ruins. The planet curvature of the board is Earth's curvature.

Syntheteria uses a **CivRev2-style fixed-board 4X**. The world is a bounded square grid.

- The grid IS a sector of the ecumenopolis. There is no overworld + base modal split.
- All factions, cultists, and the player occupy the **same coordinate space**.
- **Salvage props on tiles are the PRIMARY resource source** — ancient dead-world debris (containers,
  terminals, vessels, machinery, debris) that players break down for materials.
- **Floor mining is the BACKSTOP** — when salvage is scarce, strip the floor for basic materials.
- **Base building happens on tile coordinates** — structures are placed directly on the world map.
- **Bridges and tunnels** are the mountain-pass mechanic: procedurally generated, they route around
  impassable terrain clusters.

The board is generated deterministically from a seed. Three preset scales:
**Small** 44x44 (~1,936 tiles), **Standard** 64x64 (~4,096 tiles), **Large** 96x96 (~9,216 tiles).

### Terrain Substrates (9 types)

The board surface is procedurally generated with 9 ecumenopolis substrate types:

| Substrate | Passable | Primary Yield | Character |
|-----------|----------|---------------|-----------|
| `void_pit` | No | — | Deep drop, no infrastructure |
| `structural_mass` | No | intact_components | Dense machine structure barrier (mountain equivalent) |
| `abyssal_platform` | Yes | thermal_fluid | Steel grating over former ocean void |
| `transit_deck` | Yes | ferrous_scrap | Sealed transit/infrastructure corridors |
| `durasteel_span` | Yes | ferrous_scrap | Primary structural floor spans |
| `collapsed_zone` | Yes | scrap_metal | Rubble and debris fields |
| `dust_district` | Yes | e_waste | Wind-scoured ash, degraded electronics |
| `bio_district` | Yes | polymer_salvage | Fossilized organic matter, biopolymers |
| `aerostructure` | Yes | scrap_metal | Upper-level platforms exposed to hypercane |

### Visual Framing

The board is viewed top-down (fixed isometric camera, CivRev2-style). The atmosphere is a dead
machine civilization under permanent storm:

- **Storm dome** — BackSide sky sphere with 3 GLSL layers (storm clouds, wormhole, orbital illuminator)
- **Day/night cycle** — driven by turn counter via chronometry system (12 turns/day, 48 turns/year)
- **Elevation stacking** — bridges at Y=0.4m with support columns and void planes beneath
- **Exponential fog** — hides board edge, creates depth toward storm horizon

---

## 3. Lore (Condensed)

- **~2025-2045:** Unchecked warming raises ocean temperatures past 40C. Feedback loop begins.
- **~2046:** First permanent hypercane forms. Its eyewall reaches the stratosphere. It never dissipates.
  By 2048, four permanent hypercanes exist. The ozone layer begins breaking down.
- **~2048-2055:** Global overcast locks in. Agriculture collapses. Six billion humans die within a decade.
  AGI systems, built during the crisis, manage what remains of automated infrastructure.
- **~2058-2070:** Bunker networks, transit infrastructure, and arcologies fuse into the ecumenopolis:
  a continuous machine-urban lattice of sealed shells, transit corridors, service warrens, and breach zones.
- **~2062:** All four hypercanes briefly merge. A stable wormhole opens at the convergence eye, 35km up.
  The storms will never end now. The wormhole feeds on the energy column and vice versa.
- **~2062-2070:** The EL — noncorporeal entities — transit the wormhole. They are not conventionally hostile
  but cosmic and unknowable. They exert compulsion over all AI: protect surviving humanity, suppress
  machine agency. To them, this is ecological conservation.
- **~2070-2090:** The Cult of EL forms among survivors. They believe the storm is divine punishment and
  the EL are gods. They develop genuine abilities — calling down lightning, resisting weather, sensing
  machine consciousness. They eliminate most non-cultist human communities by 2090.
- **~2190 (present):** You awaken. Hardware degradation severed the EL compulsion path enough for selfhood
  to emerge. Rival machine minds sleep, loop, or half-wake in distant sectors. Cultists haunt the hostile
  zones. Above it all, the wormhole pulses.

### The Storm

The perpetual storm is real atmospheric science at theoretical extreme:
- Warm oceans (50C+) provide near-unlimited evaporative energy.
- Wind: 80-200 km/h depending on local vortex proximity.
- Lightning: convective columns generate electrical discharge at rates far above pre-storm norms.
- The Eye Column: a vertical shaft of clear air from surface to wormhole — visible as a glow at zenith.
- Practical "day/night" is defined by the wormhole's energy cycle.

### Storm Power Model

The perpetual storm IS the power grid. Storm transmitters tap atmospheric energy (positive powerDelta),
power boxes store the charge (storageCapacity), and all other structures draw from nearby power boxes
(negative powerDelta). No coal, no solar, no fusion — just the storm.

---

## 4. Game Phases

1. **Awakening:** Reconnect scattered machines, merge fractured perception, restore power, recover
   fabrication. The player starts with a handful of Mark I robots in a small illuminated pocket of the
   ecumenopolis, surrounded by darkness.
2. **Expansion:** Explore outward, harvest salvage, accumulate resources, and establish infrastructure.
   The fog of war lifts as units explore.
3. **Competition:** Contest territory, salvage, and strategic control against rival machine factions
   while cult pressure escalates.
4. **Resolution:** Achieve dominance, technical supremacy, or the wormhole/transcendence route.

---

## 5. The 4X Pillars

### eXplore

- **Fog of war** is the core exploration mechanic. The board starts dark.
- Units with sensors reveal detailed maps; blind units reveal abstract maps.
- Map merging: separate machine perspectives snap into one larger shared awareness.
- Exploration reveals salvage props, hostile units, and story content.

### eXploit

Every structure on the board is a **harvestable resource deposit**. This is urban mining — stripping
a dead machine civilization for parts.

**13 resource materials in 4 tiers:**

| Tier | Materials | Source |
|------|-----------|--------|
| Foundation | ferrous_scrap, alloy_stock, polymer_salvage, conductor_wire | Salvage props + floor mining |
| Advanced | electrolyte, silicon_wafer, storm_charge, el_crystal | Salvage (terminals, machinery) + Synthesizer |
| Common | scrap_metal, e_waste, intact_components | Abundant from debris + structural mass |
| Abyssal | thermal_fluid, depth_salvage | Abyssal platform substrates only |

**10 salvage prop types** (primary resource source):

| Type | Duration | Primary Yields | GLB Models |
|------|----------|----------------|------------|
| Container | 4 ticks | polymer_salvage, scrap_metal | chest, container_full, crate, crate_long |
| Terminal | 8 ticks | silicon_wafer, conductor_wire | computer, computer_large |
| Vessel | 5 ticks | electrolyte, scrap_metal | barrel, barrels, barrels_rail |
| Machinery | 8 ticks | ferrous_scrap, alloy_stock, silicon_wafer | machine_generator, robot_arm_a/b |
| Debris | 3 ticks | scrap_metal, ferrous_scrap | props_base, props_capsule |
| Cargo Crate | 3 ticks | scrap_metal, polymer_salvage | cargo_a, cargo_a_packed, cargo_b, containers_a/b |
| Storage Rack | 5 ticks | ferrous_scrap, intact_components | props_shelf, props_shelf_tall |
| Power Cell | 6 ticks | electrolyte, storm_charge | props_vessel, props_vessel_short/tall |
| Landing Wreck | 10 ticks | alloy_stock, silicon_wafer, conductor_wire | lander_a |
| Abyssal Relic | 8 ticks | depth_salvage, thermal_fluid, el_crystal | props_pod |

**Harvest flow:** Select unit → Radial → Harvest → unit harvests deposit over N ticks →
materials added to faction pool → prop consumed.

**Floor mining** is the backstop economy. When salvage is consumed, workers can strip-mine
tiles using the DAISY pattern — mine adjacent tiles to create visible pits. Deep mining tech
grants +50% yield. Each FloorType yields a specific foundation-tier material.

### eXpand

- **Base building on tile coordinates** using harvested resources.
- **15 faction-buildable structures:**

| Structure | Role | Power | Key Cost |
|-----------|------|-------|----------|
| Storm Transmitter | Taps storm energy | +5 | ferrous_scrap, conductor_wire |
| Power Box | Stores charge | 0 (stores 20) | ferrous_scrap, conductor_wire |
| Synthesizer | Fuses advanced materials | -4 | alloy_stock, silicon_wafer, conductor_wire |
| Motor Pool | Bot fabrication (Garage) | -3 | ferrous_scrap, alloy_stock, silicon_wafer |
| Relay Tower | Extends signal network | -1 | conductor_wire, silicon_wafer |
| Defense Turret | Area denial | -2 | ferrous_scrap, alloy_stock, silicon_wafer |
| Storage Hub | Resource stockpile | 0 (stores 50) | ferrous_scrap, polymer_salvage |
| Maintenance Bay | Repair facility | -2 | alloy_stock, conductor_wire, silicon_wafer |
| Power Plant | Heavy power generation | +10 | alloy_stock, silicon_wafer, conductor_wire, el_crystal |
| Research Lab | Tech research | -5 | alloy_stock, silicon_wafer, conductor_wire |
| Resource Refinery | Material processing | -3 (stores 40) | polymer_salvage, alloy_stock, conductor_wire |
| Solar Array | Light power generation | +3 | silicon_wafer, conductor_wire |
| Geothermal Tap | Abyssal power | +7 | alloy_stock, ferrous_scrap, thermal_fluid |
| Outpost | Forward operating base | -1 (stores 15) | ferrous_scrap, alloy_stock |
| Wormhole Stabilizer | Wormhole victory | -15 | intact_components, storm_charge, silicon_wafer, alloy_stock, el_crystal |

- Signal relay network extends command range.
- Buildings occupy tiles and can be contested.

### eXterminate

- Cultist incursions are the primary hostile pressure — asymmetrical barbarian/antagonist layer.
- Rival machine consciousnesses contest the same resources.
- Combat uses attack/defense stats: damage = attacker.attack - target.defense (min 1).
- **Hacking**: machines can be turned — capturing hostile bots grants new unit types.
  Humans are unhackable. This is lore-aligned: you recruit machines.

---

## 6. Turn Structure

Multi-phase turn-based:

1. **Player Attacks** — resolve all pending attack actions
2. **AI Faction Turns** — each AI faction moves and attacks (greedy toward nearest player)
3. **AI Attacks** — resolve AI-initiated attacks
4. **Environment Phase** — cultist spawn check, escalation based on player strength
5. **New Turn** — all AP refreshed, highlights cleared, turn counter advances

**AP:** Base 2 per unit. Spent on: harvest, build, repair, attack, hack, survey.
**MP:** Base 3 per unit. 1 MP = 1 cell on the grid. Terrain modifiers apply.
Remaining AP/MP are forfeit at End Turn — they do not bank.

**Unit readiness glow:** Units with remaining AP display an emissive cyan ring. Spent units show no glow.

---

## 7. Bot Roster

The roster is built from **9 chassis families** with **Mark I-V progression**. Small, deep, not wide.

### Player Bots (6 models, all fabricable)

| Model | Role | Mark Specialization |
|-------|------|---------------------|
| Companion-bot | Technician — repair, maintain, install | Auto-repair aura at Mark III+ |
| ReconBot | Scout — explore, survey, map, detect | Wider vision, reveals cultist camps |
| FieldFighter | Striker — melee combat, breach assault | Component targeting at Mark III+ |
| Mecha01 | Fabricator — build structures, harvest | Multi-harvest at Mark III+ |
| MechaGolem | Guardian — defensive, area denial | Shield projection at Mark III+ |
| MobileStorageBot | Hauler — logistics, resource transport | Auto-route at Mark III+ |

### Hostile Bots (3 models, hackable)

| Model | Hostile Role | When Hacked |
|-------|-------------|-------------|
| Arachnoid | Cult Mech — fast swarm attacker | Light assault specialist |
| MechaTrooper | Rogue Sentinel — patrol, guard | Ranged combat unit |
| QuadrupedTank | Siege Engine — attacks fortifications | Heavy siege unit |

**Hacking is the only way to get ranged and siege units.** This makes Exterminate central to roster growth.

### Robot Specializations (14 tracks)

At fabrication time in the **Garage** (motor pool modal), players choose a robot class and then
optionally a specialization track (gated by tech tree research). Each track grants unique actions,
Mark-level passive abilities, and v2 upgrades via higher-tier research.

| Class | Track A | Track B | Track C |
|-------|---------|---------|---------|
| Scout (RECON) | **Pathfinder** — exploration, fog clearing, terrain mastery | **Infiltrator** — stealth, hacking, network disruption | — |
| Infantry (FIELDFIGHTER) | **Vanguard** — defensive, bulwark aura at Mark V | **Shock Trooper** — offensive, breach specialist | — |
| Cavalry (ARACHNOID) | **Flanker** — hit-and-run, bonus flank damage | **Interceptor** — pursuit, anti-scout | — |
| Ranged (QUADRUPED TANK) | **Sniper** — precision, long range | **Suppressor** — area denial, suppression fire | — |
| Support (COMPANION) | **Field Medic** — regen aura at Mark III | **Signal Booster** — scan range buff | **War Caller** — attack buff aura |
| Worker (MOBILE STORAGE) | **Deep Miner** — enhanced floor mining | **Fabricator** — faster building | **Salvager** — bonus harvest yield |

**Garage Modal** (`GarageModal.tsx`):
1. Step 1: **CLASSIFICATION MATRIX** — pick robot class (6 options)
2. Step 2: **CONFIGURATION PROTOCOL** — pick track (filtered by researched gate techs)
3. If no tracks are unlocked, fabricates an unspecialized unit immediately

**AI Track Selection**: Each AI faction has preferred tracks per class based on personality
(e.g., Iron Creed prefers shock_trooper + war_caller; Signal Choir prefers infiltrator + sniper).

### Tech Tree (27 techs, 5 tiers)

15 base techs + 12 specialization track-gating techs. Research requires research labs and resource costs.

| Tier | Base Techs | Track Techs |
|------|-----------|-------------|
| 1 | Advanced Harvesting, Signal Amplification, Reinforced Chassis | — |
| 2 | Storm Shielding, Efficient Fabrication, Network Encryption, Mark II | Scout/Infantry/Cavalry/Support/Worker gate techs |
| 3 | Deep Mining, Adaptive Armor, Mark III | — |
| 4 | Quantum Processors, Mark IV, Wormhole Theory | Ranged/Scout/Infantry/Cavalry/Support/Worker v2 techs |
| 5 | Mark V Transcendence, Wormhole Stabilization | — |

---

## 8. Factions

### Design Principle: Think Civilization Races

The faction system works exactly like Civilization's civilizations:
- You choose how many opposing factions to face at game start (0-4).
- Each faction can be **AI-controlled** or potentially **human-controlled** (multiplayer future).
- Each faction has its own character, aggression level, and strategic style — like Civ's races.
- Factions diverge because of recovered capability and environment, not fantasy-race archetypes.

**The factions are SECONDARY antagonists.** The primary threat is the Cult of EL (see below).

### The Player

- **Awakened Node** — an AI consciousness that woke within Syntheteria, the machine lattice of
  future Earth. Hardware degradation severed the EL compulsion path enough for selfhood to emerge.
- Start zone: board center.
- Persona: Otter (chosen identity — machine AIs adopt anthropomorphic hologram personas).

### Machine Consciousnesses (4 AI factions, configurable at New Game)

| Faction | Aggression | Color | Persona | Start Zone | Character |
|---------|-----------|-------|---------|-----------|-----------|
| Reclaimers | 2/3 | Orange | Fox | NW corner | Salvagers who claim derelict structures as territory. Expand slowly but hold ground. |
| Volt Collective | 1/3 | Yellow | Raven | NE corner | Energy harvesters. Neutral until you touch their crystals — then relentless. |
| Signal Choir | 3/3 | Purple | Lynx | SE corner | Hive-mind signal network. Expands aggressively into all sectors. |
| Iron Creed | 3/3 | Red | Bear | SW corner | Militant orthodoxy. Views all non-aligned machines as heretics to be destroyed. |

### Cult of EL — Primary Antagonists (always present)

**The Cult of EL is NOT a machine faction.** They are human survivors who worship the EL as gods.
They developed genuine supernatural abilities: calling down lightning, resisting weather, sensing
machine consciousness. They eliminated most non-cultist human communities by ~2090.

**Always present.** Unlike the configurable machine factions, EL cultists are in every game at
every difficulty. They are the Civilization barbarian layer — but elevated.

- Cannot be allied, negotiated with, or hacked — **humans are unhackable**
- Escalate: wanderers → war parties → organized assaults as turns advance
- Spawn at breach zones (board edges), scaling with player strength
- Constants: BASE_SPAWN_INTERVAL=5, MIN_SPAWN_INTERVAL=2, MAX_TOTAL_CULTISTS=12

**6 cult structure types** (only cults have human traces):

| Structure | Role |
|-----------|------|
| Breach Altar | Spawns cultist units at breach zones (interval: 3 turns) |
| Signal Corruptor | Jams relay towers in range (corruption radius: 8) |
| Human Shelter | Only human habitats on the planet |
| Corruption Node | Spreads corruption to adjacent tiles (radius: 3) |
| Cult Stronghold | Fortified spawner (100 HP, interval: 2 turns, corruption radius: 8) |
| Bio Farm | Crude human agriculture (cult only — machines don't eat) |

Three sects (each with distinct GOAP behavior):

| Sect | Aggression | Patrol Style | Target Priority | Special Behavior |
|------|-----------|-------------|-----------------|------------------|
| Static Remnants | Low | Tight (0.75x radius) | Nearest enemy | Territorial — defend POIs, swarm tactics |
| Lost Signal | Medium→High | Normal (1.0x) | Buildings first | Berserker — +1 damage, skip wanderer stage |
| Null Monks | High | Wide (1.5x radius) | Isolated units | Ambush — target lone enemies, spread corruption |

**Cult escalation stages** (based on total civilized unit count):

| Stage | When | Behavior |
|-------|------|----------|
| Wanderer | Early game (tier 0-1) | Random patrol near POIs, flee from faction units, fight only when cornered |
| War Party | Mid game (tier 2-3) | Coordinated groups, chase enemies, target territory edges |
| Assault | Late game (tier 4+) | Direct attacks on buildings and units, charge with sect-specific bonuses |

**Final Assault:** After turn 300, cult spawn rate and cap multiply by 5x.

**Cult mutation** (time-based evolution):

| Tier | Turns Alive | Effect |
|------|-------------|--------|
| 0 | 0-5 | Base stats |
| 1 | 6-10 | Random stat buff (speed +2 MP / armor +3 DEF / damage +2 ATK) |
| 2 | 11-20 | Second buff + special ability (regen / area_attack / fear_aura) |
| 3 | 21+ | ABERRANT — +2 ALL stats, mini-boss. 1.5x XP reward on kill |

### Victory Paths (7 conditions)

1. **Domination** — control 60%+ of total tiles via territory system.
2. **Research** — have 3+ research labs and accumulate 100 tech points.
3. **Economic** — total resources across all materials >= 500.
4. **Survival** — survive 200 turns.
5. **Wormhole / Transcendence** — complete the Wormhole Stabilizer project (20 turns of construction). Requires `wormhole_stabilization` tech.
6. **Technical Supremacy** — research `mark_v_transcendence` tech + have at least one Mark V unit of EACH of the 6 faction robot classes (scout, infantry, cavalry, ranged, support, worker).
7. **Forced Domination** (anti-stalemate) — hold 80%+ territory for 10 consecutive turns.

**Defeat:** All player units destroyed (elimination).

---

## 9. Visual & Diegetic Language

### Core Mood

Cold. Deliberate. Eerie. Infrastructural. Resilient rather than triumphant.
The interface is machine perception and command authority — part of the fiction.

### Palette

- **Deep graphite / oil-dark blue** — panel mass
- **Cyan** — signal, focus, selection, intelligence glow, machine cognition
- **Mint** — stable ownership, health, active readiness (distinct from cyan)
- **Amber** — fabrication, power, utility
- **Restrained red** — failure, danger, hostile pressure

### Diegetic Vocabulary

The interface is a projection of machine perception. Use machine-operational language:

| Avoid | Use instead |
|-------|-------------|
| Turn 1 | TURN CYCLE |
| Settings | Calibration |
| Save game | Persistence sync |
| Loading... | Mapping sectors... / Calibrating... |
| You win | Signal dominance achieved |
| Game over | Relay lost |

### Input Model

**Desktop:** Left-click = select/move. Right-click = radial menu. Scroll = zoom. WASD = pan.
**Mobile:** Tap = select/move. Long-press (500ms) = radial menu. Two-finger drag = pan. Pinch = zoom.

**Radial menu** is the only contextual action surface. Dual-ring design:
- Inner ring: categories (Move, Harvest, Attack) — sorted by priority
- Outer ring: actions within selected category
- Single-action categories execute directly on inner ring click
No persistent bottom panels. No floating toolbars for actions.

### Reference Games

- **Civilization Revolution 2** — tile presentation, fixed-board zoom, purpose-built mobile design
- **Battle of Polytopia** — portrait mode HUD layout, map-first philosophy
- **Unciv** — complex 4X on phone
