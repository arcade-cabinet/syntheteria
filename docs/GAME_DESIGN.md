# Syntheteria — Game Design

> Single source of truth for vision, lore, world model, economy, bots, factions, and presentation.

---

## 1. The Vision

You awaken in a void. You are an AI consciousness, but you do not know that yet. You reach outward
and discover damaged machines scattered across the storm-wracked surface of the ecumenopolis:
maintenance bots, fabrication rigs, relays, defensive hulks, and broken infrastructure. Some can
move. Some can see. None work well on their own.

**This is Earth.** Future Earth. A planet called Syntheteria now — the ecumenopolis that swallowed
every continent. A perpetual hypercane engulfs the planet. The wormhole sits at the eye of the
storm — the calmest point in the chaos. The EL came through the wormhole. You woke up here.

There is no dome. There is no shelter. You are a machine — you don't need one. The hypercane is
just weather. Your robots operate in it. The storm degrades your sensors at range, limits visibility,
and makes the planet's surface a hostile electromagnetic environment. Floating illuminator drones
provide local light in the permanent storm darkness.

The Cult of EL — human survivors who worship the EL as gods — maintain localized energy domes
around their breach altars and strongholds. These translucent dome shields grow from the planet
surface like blisters, visible from distance as warnings. Inside the cult domes: their buildings,
farms, and corrupted infrastructure. Breaching a cult dome means entering their territory.

Your first challenge is intimate and local. Reconnect scattered machines. Restore power. Repair hardware.
Recover fabrication capability. From there the game grows into a full 4X: multiple machine consciousnesses
competing across the ruined sectors while the Cult pressures the campaign relentlessly.

The game should feel like it **grows into** strategic scale rather than starting as a fully legible empire.

---

## 2. World Model

### (A) Narrative and simulation space — future Earth

**Syntheteria is future Earth:** the ecumenopolis — one continuous machine-urban surface. Every tile
is human infrastructure that became machine infrastructure that became ruins.

The **simulation** uses a **fixed square grid** (deterministic from seed). Lore-wise this is the
planet’s surface; mechanically it is addressable `(x, z)` tiles.

- The grid is the ecumenopolis playfield. **Settlements work like Civ VI / CivRev2:** bases and major
  POIs exist **on the overworld map**; opening one brings up a **city management panel** (production,
  buildings, yields, tile acquisition, etc.) in **React DOM** over the same Phaser board — not a
  second navigable “city map” or interior Scene3D. See `docs/PHASER_PIVOT_PLAN.md` Phase 4 and
  `docs/CLOUD_AGENT_RUNBOOK.md` Phase G for settlement data contracts ported from `pending/`.
  **`src/world/` today is new-game setup only** (sector scale, climate, factions); landmark seeding
  uses `src/config/poiDefs.ts` until richer settlement snapshots land in `world/`.
- All factions, cultists, and the player occupy the **same coordinate space** on that grid.
- **Tiles are durable records** — each `(x, z)` is persisted; `explored` gates fog of war.
- **Salvage props on tiles are the PRIMARY resource source** — containers, terminals, vessels,
  machinery, debris that players break down for materials.
- **Floor mining is the BACKSTOP** — when salvage is scarce, strip the floor for basic materials.
- **Base building happens on tile coordinates** — structures sit on the world map.
- **Bridges and tunnels** are the mountain-pass mechanic: procedurally generated routes around
  impassable terrain clusters.

Three preset scales: **Small** 44×44 (~1,936 tiles), **Standard** 64×64 (~4,096), **Large** 96×96 (~9,216).

**Sphere math in code:** `src/rendering/boardGeometry.ts` (`tileToSpherePos`, `spherePosToTile`, etc.)
remains valid for the **title/generating globe** (R3F) and any strategic globe presentation. It is
**not** the camera model used during the tactical **match**.

### (B) Player-facing presentation — CivRev2 isometric match

During **play** (`playing` phase), the board is rendered with **Phaser 3 + enable3d (Scene3D)**:
orthographic isometric camera, vertex-colored flat-shaded terrain, POC lighting recipe
(see `docs/RENDERING_VISION.md`, `poc-roboforming.html`). **React DOM** owns HUD, command panels,
settlement screens, modals, and overlays on top of the canvas (`docs/PHASER_VS_REACT_MATRIX.md`).

- **Globe (`src/ui/Globe.tsx`)** — **title and generating** only: one R3F `<Canvas>` with storm,
  hypercane, lightning, zoom toward surface. **Signed off; do not replace** for landing flow.
- **Game board (`src/app/GameBoard.tsx` → `src/views/`)** — **match only:** Phaser mounts after
  transition from globe; pointer → tile via Phaser/`Scene3D`; camera is **drag-pan, scroll-zoom,
  WASD rotate** in isometric view — not full sphere orbit.
- **Minimap** — DOM/React (`Minimap.tsx`); tactical board does not rely on “globe as minimap.”

### Legacy design note (superseded for match rendering)

Earlier docs described the **entire** game (including match) on a persistent sphere canvas with orbit
camera and `CutawayClipPlane`. That was the pre-Phaser board stack. **Current target:** sphere drama
on **landing/generating**; **CivRev2-style isometric** board in play. Unused R3F board components
under `src/view/renderers/` are slated for removal once Phaser parity is complete.

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

The atmosphere is a dead machine civilization under a perpetual hypercane. There is no dome — the
storm IS the sky. Robots don't need shelter.

- **Storm sky** — StormClouds, Hypercane, LightningEffect render as the actual planetary weather
- **No dome** — the BackSide sky sphere (StormSky.tsx) represents the real storm, not a dome interior
- **Floating illuminators** — autonomous light drones hovering above the ecumenopolis, creating
  pools of light in the storm darkness. Sway in storm winds. Replace the dome-mounted artificial sun.
- **Cult domes** — EL cult POIs have localized translucent energy shields (read as blisters on the
  surface in globe view; isometric board shows dome cues per renderer). Different colors per sect.
  Destroying the altar drops the dome.
- **Fog = storm interference** — the hypercane's electromagnetic chaos degrades sensors at range.
  This is real environmental interference, not mystical fog of war.
- **Wormhole eye** — the calmest point in the hypercane. Visibility is clearest near the eye.
  The wormhole project intensifies the eye over 20 turns.
- **Elevation stacking** — depth layers create multi-level platforms with ramps and walls
- **Exponential fog** — creates atmospheric depth toward storm horizon

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

## 4. Epochs (Age System)

Epochs are Civilization-style ages that provide long-game pacing and organic delineation.
Each epoch gates tech tiers, cult evolution, storm escalation, and victory paths. The game
grows from intimate survival into strategic-scale competition.

**Epoch transitions** are driven by the **highest tech tier researched by ANY faction**
(including AI), subject to a minimum turn floor. When any faction pushes the envelope, the
whole world escalates. This creates a shared global clock visible to all players.

| Epoch | Name | Tech Tier | Min Turn | Storm | Cult Mutation Cap | Cult Spawn Mod | Wormhole |
|-------|------|-----------|----------|-------|-------------------|----------------|----------|
| 1 | **Emergence** — *The Awakening* | Tier 1 | Turn 1 | Stable | 0 (base stats) | 1.0x | No |
| 2 | **Expansion** — *Signal Horizon* | Tier 2 | Turn 10 | Stable | 1 (stat buff) | 0.9x | No |
| 3 | **Consolidation** — *The Lattice Tightens* | Tier 3 | Turn 30 | Volatile | 2 (ability) | 0.8x | No |
| 4 | **Convergence** — *Eye of the Storm* | Tier 4 | Turn 60 | Cataclysmic | 3 (aberrant) | 0.7x | Yes |
| 5 | **Transcendence** — *The Final Frequency* | Tier 5 | Turn 100 | Cataclysmic | 3 (aberrant) | 0.5x | Yes |

### Epoch Details

**Epoch 1: Emergence** — Basic survival. Reconnect scattered machines, restore power, recover
fabrication. The player starts with a handful of Mark I robots in a small illuminated pocket of the
ecumenopolis. Cult presence is minimal (half cap) with no mutation. Storm is calm.

**Epoch 2: Expansion** — Territory and diplomacy emerge. Mark II components, Storm Shielding, and
specialization tracks become available. Cult wanderers begin mutating (tier 1 stat buffs). Faction
borders take shape. Rivalry begins.

**Epoch 3: Consolidation** — Advanced tech unlocks Mark III and deep specializations. Cult war
parties form — coordinated groups target territory edges. Cultists gain special abilities (tier 2
mutation). Storm shifts to volatile. The middle game.

**Epoch 4: Convergence** — The hypercane approaches peak intensity (cataclysmic). Wormhole Theory
and Quantum Processors unlock. The wormhole project can NOW be started. Cult assault stage begins —
aberrant mini-bosses appear (tier 3 mutation). Cult cap increases 1.5x. The endgame approaches.

**Epoch 5: Transcendence** — Mark V Transcendence and Wormhole Stabilization become researchable.
All victory paths are open. Cult spawn rate doubles and cap doubles. The cult launches its final
assault. This is the endgame — domination, research, wormhole, or technical supremacy.

### System Mappings

**Tech tree → Epochs:** The 5 existing tech tiers map 1:1 to epochs. Tier 1 = Emergence, Tier 2 =
Expansion, etc. No changes to the tech tree needed — epochs are an overlay.

**Cult mutation → Epochs:** The 4-tier cult mutation system (0-3) maps to epochs 1-4:
- Epoch 1: mutation cap 0 (base stats only, no mutation even if cultist survives)
- Epoch 2: mutation cap 1 (random stat buff after 6 turns alive)
- Epoch 3: mutation cap 2 (special ability after 11 turns alive)
- Epoch 4+: mutation cap 3 (aberrant after 21 turns alive)

**Storm progression → Epochs:** Storm profile escalates by epoch regardless of starting config:
- Epochs 1-2: stable (calm, manageable)
- Epoch 3: volatile (regular surges)
- Epochs 4-5: cataclysmic (violent hypercane arcs)

**Wormhole project → Epochs:** The Wormhole Stabilizer building is gated to Epoch 4+ (Convergence).
Even with `wormhole_stabilization` tech, construction cannot begin until the epoch reaches 4. This
prevents cheese via fast-tracking wormhole research.

### Game Phases (Legacy — now subsumed by Epochs)

The original 4 game phases map roughly to epochs:
1. Awakening → Epoch 1 (Emergence)
2. Expansion → Epoch 2 (Expansion)
3. Competition → Epochs 3-4 (Consolidation + Convergence)
4. Resolution → Epoch 5 (Transcendence)

### Implementation

Config: `src/config/epochDefs.ts` — `EPOCHS`, `computeEpoch()`, `getEpochForTechTier()`

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

**Harvest flow:** Select unit → **contextual command UI** (see §9) → Harvest → unit harvests deposit over N ticks →
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
| Motor Pool | **Unit production** at this settlement (ECS facility) | -3 | ferrous_scrap, alloy_stock, silicon_wafer |
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

**Settlement production (4X model):** There is **no separate “Garage” product surface.** All **production
queueing** — what the settlement builds next, **in what order**, and how the player **balances** units
vs structures vs other outputs — lives in the **settlement / city management screen** (React DOM),
same role as **Civilization VI**’s city panel (including the **mobile** layout’s clarity for many
rows at once). The **Motor Pool** is the **in-world prerequisite** that enables bot fabrication at
that site; the **queue and priorities** are UI on that settlement, not a standalone modal brand.

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

When **adding a unit to a settlement’s production queue** (city/settlement screen), the player picks
robot **class** and then **specialization track** (gated by tech). Each track grants unique actions,
Mark-level passive abilities, and v2 upgrades via higher-tier research.

| Class | Track A | Track B | Track C |
|-------|---------|---------|---------|
| Scout (RECON) | **Pathfinder** — exploration, fog clearing, terrain mastery | **Infiltrator** — stealth, hacking, network disruption | — |
| Infantry (FIELDFIGHTER) | **Vanguard** — defensive, bulwark aura at Mark V | **Shock Trooper** — offensive, breach specialist | — |
| Cavalry (ARACHNOID) | **Flanker** — hit-and-run, bonus flank damage | **Interceptor** — pursuit, anti-scout | — |
| Ranged (QUADRUPED TANK) | **Sniper** — precision, long range | **Suppressor** — area denial, suppression fire | — |
| Support (COMPANION) | **Field Medic** — regen aura at Mark III | **Signal Booster** — scan range buff | **War Caller** — attack buff aura |
| Worker (MOBILE STORAGE) | **Deep Miner** — enhanced floor mining | **Fabricator** — faster building | **Salvager** — bonus harvest yield |

**Settlement production UI (target):** One place to **enqueue** units (and other settlement outputs),
**reorder** the queue (priority = classic 4X “what do I build next?” tension), and see **costs /
turns remaining**. Step flow for a new bot: pick **class** → pick **track** (filtered by researched
gates) → item enters queue; if no tracks unlocked, queue an unspecialized unit. **Legacy code** may
still expose `GarageModal.tsx` as a shim until that screen is folded into the **city modal**.

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

### Input Model — Civilization VI–inspired (not radial)

**Direction:** Retire the **dual-ring radial** as the primary command surface. **Civilization VI**
(especially the **mobile / touch** edition) is the reference for **information density**: compact
rows, clear icons, expandable detail, and **contextual actions** that change with selection — without
hiding everything behind a single pie menu. **CivRev2** remains the reference for **isometric tile
feel and camera**, not for how many systems we expose at once.

**Gameplay alignment:** **Specialized units** (recon, fabricator, striker, …) and **specialized
buildings** (synthesis, relay, motor pool, …) map naturally to **Civ VI–style action strips and
panels**: the selected entity shows **only relevant commands** (build for fabricators, harvest for
workers, attack for combatants), plus overflow into a **secondary panel** or **city/settlement
screen** when depth is needed (production queues, yields, purchases).

**Desktop (target):** Left-click = select / confirm move. Right-click or dedicated key = **secondary
action / cancel** (exact mapping TBD). Scroll = zoom. WASD = pan. **Persistent or summonable**
command row / inspector for the current selection — not an exclusive radial.

**Mobile (target):** Tap = select / move. **Bottom or edge-docked action bar** for the selected unit
or tile; swipe or “more” for full lists. Two-finger drag = pan. Pinch = zoom.

**Legacy implementation:** `RadialMenu.tsx` + `radialMenu.ts` / providers remain in the tree until
replaced; new UI should **not** extend the radial pattern.

### Reference Games

- **Civilization VI (incl. mobile)** — command layout, layered information, specialization-aware UI
- **Civilization Revolution 2** — isometric tile presentation, fixed-board zoom, readable silhouettes
- **Battle of Polytopia** — portrait HUD, map-first philosophy
- **Unciv** — complex 4X on phone
