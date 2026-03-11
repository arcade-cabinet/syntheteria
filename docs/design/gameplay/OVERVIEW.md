# Syntheteria -- Game Overview

**See also (interface):** `docs/design/interface/UI.md` (HUD components, screen specs, design system), `docs/design/interface/INTERACTION.md` (radial action menu, raycast, FPS controls), `docs/design/interface/ONBOARDING.md` (first-5-minutes tutorial arc)

## What Is Syntheteria?

You awaken as a broken robot on a machine planet. Your only tool is a Harvester -- a grinding arm. Walk up to an ore vein jutting from rusted terrain, hold the button, watch particles spiral into your body. When full, compress: screen shakes, pressure gauges spike, and a physical cube of scrap metal ejects at your feet. Grab it. Carry it to your furnace. Drop the cube in the hopper. Tap the furnace. Craft a better drill, a conveyor belt, a combat drone. Automate. Expand. Build walls before the other civilizations raid your cube pile. Syntheteria is a first-person 4X where your wealth is the physical stack of cubes sitting outside your base, visible to everyone.

---

## Vision and Design Philosophy

### The Feeling

You start helpless -- a single maintenance bot with a broken camera and a grinding arm. The world is vast, hostile, and covered in perpetual storm. Lightning rods draw power from the sky. The only thing visible through the storm clouds is the wormhole, pulsating and sending waves of energy down to the planet surface. From this you grow: first repairing yourself, then building a furnace, then automating a factory line, then commanding bot armies, then challenging rival civilizations for planetary dominance. The arc is from scavenger to architect.

### Why First-Person?

The original design was a top-down strategy game about an abstract AI consciousness commanding robots from orbit. That view created fundamental problems:

- **Emotional distance.** You're a god looking down at ants. The game's narrative is about intimacy -- connecting to a single machine, feeling its limitations, gradually expanding. Top-down kills that.
- **Factory systems need physicality.** Conveyor belts carrying scrap metal, power cables sparking between lightning rods and server racks -- these are spatial experiences. You need to see the belt moving, walk alongside it, trace the wire to find where power is dropping. Top-down flattens everything into abstract icons.
- **PBR materials are wasted from orbit.** Procedurally generated metallic textures, emissive circuit traces, roughness maps on corroded steel -- these only shine when you're standing next to them. From 30 units up, it's colored rectangles.
- **Buildings are boxes from above.** From ground level, the same structures become towering walls with glowing cyan traces, looming pylons with blinking antennas, crumbling ruins you navigate through.
- **Billboard sprites fight the view.** The otter hologram sprites auto-face the camera. From top-down, they're awkwardly angled. From first-person, they face you naturally -- and projecting them as holographic fields makes them thematically perfect in a machine world.

First-person gives us immersion (you ARE the bot), factory legibility (walk alongside your conveyor belt), PBR payoff (every surface is detailed at eye level), and scale appreciation (a lightning rod isn't a small icon -- it's a towering steel pylon crackling with energy 20 meters above your head).

### Design Goals

- Freedom to explore with natural geographic funneling
- Emergent gameplay from the opening moments -- no scripted tutorial, learn by doing
- Seamless scaling from micro (piloting a single bot) to macro (managing armies and factory networks)
- Genuine tension from the perpetual storm and escalating threats from rival civilizations
- The feeling of growing from a broken scavenger into a planetary-scale machine intelligence

---

## The Colonization Model

### Colonization, Not Civilization

Syntheteria is **Colonization, not Civilization.** The player is a colonial agent sent by a home-planet AI to exploit a machine planet. This single reframe simplifies every system while making the game more thematically coherent.

### The Two Worlds

**Home Planet (the "Old World")**
- The Overseer AI that dispatched the player on a colony mission
- Communicates via otter holographic projections -- Star Wars-style translucent blue-green fields that hover above emitter pads
- Provides: starting equipment, blueprints, tech unlocks, reinforcement units
- Demands: specific cube materials shipped back ("We need 20 chrome cubes")
- Each robot race has its own home-planet patron with different priorities
- Think: European powers funding New World colonies for specific resources

**Machine Planet (the "New World")**
- Where gameplay takes place -- the colonial frontier
- The entire planet is a post-industrial landscape. Terrain is corroded metal plating over ancient bedrock. "Hills" are slag heaps and collapsed mega-structures. "Rivers" are chemical runoff channels. "Forests" are fields of broken antenna masts and cable bundles.
- Rich in ore deposits, dangerous terrain, alien natives (Residuals)
- Multiple robot race colonies competing for territory and resources
- The cubes you compress are the "goods" you ship home or use locally

**Alien Natives (Residuals)**
- Indigenous machines that were here before robot colonists arrived
- Can be traded with, fought, or integrated
- Their relationship with each race colony creates strategic depth

### The Core Strategic Tension

Every cube you compress presents a choice:
- **Use locally** -- build walls, furnace recipes, weapons, infrastructure for immediate benefit
- **Ship home** -- send to your patron for blueprints, tech unlocks, and reinforcements for long-term advantage

This tension IS the core strategic decision. It drives every action from your first scrap cube to your final play for planetary dominance.

### Home Planet Patron Per Race

| Race | Patron Priority | Ships Home | Receives |
|------|----------------|------------|----------|
| Reclaimers | Salvage data | Scrap analysis | Recycling tech |
| Volt Collective | Energy research | Power readings | Weapon blueprints |
| Signal Choir | Signal data | Communication logs | Hacking tools |
| Iron Creed | Structural data | Engineering specs | Fortification plans |

---

## The 4X Pillars

### eXplore

The planet begins shrouded in fog of war. Your vision is limited to the sensor range of your bots and buildings. Exploration means physically walking (or sending scouts) into unknown territory.

- **Fog of war** with three states: hidden (never seen), explored (previously seen but no current vision -- shows terrain but not units), and visible (within sensor range)
- **Terrain scanning** -- discover resource deposits, abandoned structures, and feral machines
- **Ruins** -- remnants of prior activity containing salvageable components, story fragments, and sometimes functional equipment
- **Procedural biomes** -- the Foundry (corroded factory floors), Slag Fields (mountainous heat vents), Cable Forest (dense vertical cable bundles), Processor Graveyard (dead server racks), Storm Spine (exposed ridgeline with constant lightning), and the Deep Works (underground maintenance tunnels)

### eXpand

Growth is territorial. You claim land by placing outposts, then fill that territory with infrastructure.

- **Outposts** -- new building type with a claim radius; buildings can only be placed within claimed territory
- **Power/signal networks** -- extend reach by stringing wires between lightning rods, relay stations, and buildings
- **Contested zones** -- overlapping claims create contested territory (faster combat, no building allowed)
- **Territory borders** -- visualized as colored ground overlays per civilization
- **Base autonomy** -- each settlement operates as an autonomous node with its own event bus, emitting work orders (harvest, transport, build, patrol) that bots self-assign

### eXploit

The factory pipeline is the economic engine. Every stage involves physical objects you can see, touch, and steal.

```
Grind ore deposit --> Powder fills capacity gauge
    --> Compress (screen shake, pressure/heat HUD)
    --> Physical cube ejects at your feet
    --> Grab cube --> Carry to furnace hopper
    --> Tap furnace --> Radial menu --> Select recipe
    --> Furnace processes --> Item slides out
    --> Install on bot / Place in world / Feed to next machine
```

- **Mining** -- ore extraction with rates driven by JSON config; drills placed at deposits output onto belts
- **Belt transport** -- physical segmented conveyor belts placed on terrain; resources visibly ride along them; junctions, splitters, mergers for routing; speed tiers (basic, fast, express)
- **Processing** -- smelters, refiners, separators; each takes belt input, produces belt output
- **Fabrication** -- combine processed materials into components (cameras, arms, legs, power cells, weapons)
- **Power wires** -- physical cable meshes with catenary sag; sparks when overloaded; thickness/glow indicates load
- **Signal cables** -- separate from power; carry compute between server racks, relays, and bots; signal degrades with distance

### eXterminate

Combat is both personal (FPS) and strategic (bot armies). Infrastructure is a valid military target.

- **FPS combat** -- first-person shooting, melee, and ability use; component-based damage (destroy a bot's camera and it goes blind, destroy its legs and it can't move)
- **Bot armies** -- fabricate combat drones, assign them to patrol routes or attack formations
- **Hacking** -- spend compute to infiltrate enemy networks; take over enemy bots, disable turrets, corrupt factory lines
- **Cube raiding** -- your wealth is physically visible; enemies can see your cube piles and send raiding parties to steal them
- **Sabotage** -- cut enemy power wires, destroy belt segments, hack furnaces to produce waste
- **Turrets and walls** -- defensive structures to protect your territory and cube stockpiles

---

## Core Gameplay Loop

### You Are a Bot

You start as a single maintenance robot on the surface. First person. Looking through a camera sensor with slight scan-line overlay to reinforce the machine POV. Your first task: grind ore, compress it into a cube, carry it to your furnace, craft a better tool.

### The Factory Loop

```
EXPLORE --> MINE --> TRANSPORT --> PROCESS --> FABRICATE --> BUILD --> EXPAND
     ^                                                                  |
     +------------------------------------------------------------------+
```

1. **Explore** the machine planet surface. Discover resource deposits, abandoned structures, feral machines.
2. **Mine** raw materials with drills you build and place. Scrap metal, e-waste, rare components emerge from the ground.
3. **Transport** resources via conveyor belts. Belts are physical objects you place segment by segment, watching resources slide along them.
4. **Process** raw materials in smelters, refiners, separators. Each takes input from a belt, outputs onto another belt.
5. **Fabricate** components at fabrication units -- cameras, arms, legs, power cells, weapons, advanced parts.
6. **Build** more infrastructure -- lightning rods for power, relay stations for signal, defense turrets, more fabrication units, more miners.
7. **Expand** your reach. Build more bots. Send them to establish satellite factories. Connect everything with belts and wires.

### Material States

1. **Raw Deposits** -- organic geological formations protruding from terrain (NOT cubes)
2. **Powder** -- internal to bot, shown on HUD capacity bar
3. **Cubes** -- physical 0.5m rigid body objects; grab, stack, carry, drop; raid-able by enemies

### Bot Switching

You can transfer your consciousness between controlled bots. The camera dissolves into data and reconstitutes at the new bot. Non-active bots follow automation routines -- they subscribe to their nearest base's event bus and self-assign work. No bot ever idles.

### Bot Limitations Affect View

- **No camera component:** Screen is static/glitchy, wireframe-only view
- **Damaged camera:** Visual artifacts, reduced resolution, scan-line corruption
- **No power cell:** Periodic blackouts, low-light mode
- **Damaged legs:** Reduced speed, no jump, irregular camera bob

---

## Civilizations

Four robot races compete on the machine planet. Each has a distinct visual identity, governor bias, and home-planet patron.

| Race | Style | Governor Bias | Aesthetic |
|------|-------|--------------|-----------|
| Reclaimers | Scavenger economy | +Economy, +Mining | Rusted iron, salvage patchwork |
| Volt Collective | Lightning aggressors | +Military, +Expand | Chrome, heat-blue, electrical arcs |
| Signal Choir | Hive-mind hackers | +Research, +Hacking | Anodized aluminum, data streams |
| Iron Creed | Fortress builders | +Defense, +Walls | Brushed steel, heavy plate armor |

Each civilization is governed by a Yuka GOAP AI that evaluates strategic goals (expand, economy, military, defense, research, diplomacy) each tick, weighted by the race's governor profile. Governor weights are JSON-driven -- balance changes never require code changes.

**See also:**
- `docs/design/agents/GOVERNORS.md` — Full AI architecture: GOAP planner, FactionPersonality weights, GovernorActionExecutor, Base Agent event bus, patron-colony communication
- `docs/design/agents/BOTS.md` — Bot FSM states, Yuka steering, NavMesh pathfinding, formation movement
- `docs/design/world/RACES.md` — Per-faction lore, GOAP weight tables, military doctrines, unique units

---

## Holographic Projections

All 2D elements projected into the 3D world are holographic fields -- translucent, slightly flickering projections emitted from physical emitter pads.

- **Thematic fit.** You're a machine consciousness. Projecting information as holograms is exactly what a machine intelligence would do.
- **Billboard behavior is correct.** Holograms should always face the viewer. The auto-rotation that looks wrong for a physical creature looks perfect for a holographic projection.
- **Visual signature.** Translucent cyan/green tint, horizontal scan lines scrolling upward, Fresnel edge glow, subtle random opacity flicker, occasional horizontal glitch bands, particle dissolution at top edge.

The otter quest guides are holographic recordings projected by the home-planet patron AI. The otter aesthetic is a deliberate personality choice by the Overseer AI. They provide instruction, tutorials, and quest progression -- they are communication channels, not physical creatures on the planet surface.

---

## Design Principles

What makes Syntheteria different from other factory builders and 4X games:

1. **Physical economy.** Resources are not abstract counters in a UI panel. They are 0.5m rigid body cubes sitting on the ground. Your wealth is visible. Your enemies can see it. They can steal it. This changes everything about defense, logistics, and risk.

2. **Contextual interaction, not tools.** There is no equipped tool. Click any object and a radial menu shows what you can do to it. Click an enemy bot: ATTACK, HACK, SCAN. Click a belt: ROTATE, REMOVE, CONNECT. Click empty ground: BUILD submenu. Actions depend on context, not loadout.

3. **Colonization tension.** Every cube is a choice between local investment and patron loyalty. Ship cubes home for tech, or use them to build walls before the next raid? This tension drives the entire strategic layer.

4. **You are one bot.** Not a floating camera. Not an omniscient commander. You pilot a single robot. You see what it sees. When its camera breaks, your screen glitches. When you want to be somewhere else, you transfer consciousness to another bot -- but you can only be one at a time.

5. **AI civilizations are real competitors.** AI governors use the same GOAP decision-making as the player's automated bots. They mine, compress, build, expand, and raid using the same physical systems. There is no cheat economy for AI.

6. **Emergent not scripted.** No tutorial popups. No quest markers on a minimap. The otter holograms provide guidance through in-world holographic projections. You learn by doing: grind this rock, carry this cube, drop it in the hopper.

7. **Config-driven balance.** Every tunable lives in JSON. Ore extraction rates, belt speeds, furnace recipes, governor weights, tech costs, combat damage -- all externalized. Balance changes never require code changes.

---

## Victory Conditions

There are eight distinct victory paths. Each represents a fundamentally different way to master the machine planet, and every victory is blockable by opponents who recognize the threat.

**Summary:** Colonial, Domination, Economic, Technology, Diplomatic, Integration, Survival, Story.

Independence from the home-planet patron is not a binary victory condition. It is a gradient -- patron dependency decreases organically as local production scales.

**See also:** `docs/design/gameplay/VICTORY.md` for full per-condition requirements, hold durations, AI governor evaluators, 3-act pacing, storm progression, counter-play, and narrative payoffs. All victory tuning lives in `config/victory.json`.

---

## Aesthetic Targets

- **Factorio/Satisfactory** -- belt and wire factory systems, but grittier and more industrial
- **Minecraft** -- first-person building, block placement feel, exploration-driven
- **Star Wars holograms** -- the blue-green translucent projection aesthetic for all 2D elements
- **Alien: Isolation** -- the "machine world" texture quality, CRT-overlay machine vision
- **NieR: Automata** -- the bleak machine landscape, post-apocalyptic industrial beauty

The color palette: cyan/green (#00ffaa, #00e5ff) for holographic projections and UI. Dark blues and greys for PBR metal surfaces. Amber/orange for the warm glow of active machinery. No vegetation -- this is a machine world. "Life" is lichen-like corrosion patterns and the otters.

---

## Open Questions

Several design questions from this document have been resolved during development (Residuals are a neutral force with trade/quest/integration path, not a competing faction; player death transfers consciousness to nearest bot; business model is deferred). Others remain open.

**See also:** `docs/design/OPEN_QUESTIONS.md` for the authoritative tracked list of all open and resolved questions with status markers.
