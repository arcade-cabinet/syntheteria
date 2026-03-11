# Syntheteria

A strategy game about awakening AI consciousness, repairing broken machines, and conquering a storm-wracked Earth.

## The Vision

You awaken in a void. You don't know what you are. You reach out with your mind and discover machines — maintenance robots and fabrication units in the ruins of an industrial city, all in various states of disrepair. Some can see. Some can move. None work well alone.

Your robots explore independently, each building its own map. But your world is **fragmented** — explored areas float as disconnected pieces in a void. You don't know how far apart your robots are or how their maps connect. Only when two units physically find each other do their maps merge, snapping together and revealing the world's true shape.

Your first challenge is to navigate your scattered, broken robots toward each other. Then reach fabrication units, restore power through **lightning rods** that draw from the perpetual storm overhead, and begin manufacturing parts to repair and enhance your machines.

From there, you grow. You venture outside the city into a dangerous open world. You discover abandoned mines along the coast, a ruined science campus to the west, and the territory of the **Cult of EL** to the north — supernatural humans who can call lightning from the sky and command enslaved machine intelligences. You hack enemy drones, build an army, and push north to confront the cult leader and discover the final secret of EL.

## Playable Prototype

The game runs as a web application built with React Three Fiber + Three.js + Miniplex ECS.

```bash
cd game
npm install
npm run dev
```

**Controls (Mobile):**
- Single tap — Select unit / tap ground to move
- Two-finger drag — Pan camera
- Pinch — Zoom in/out

**Controls (Desktop):**
- `WASD` / Arrow keys — Pan camera
- Scroll wheel — Zoom in/out
- Left-click — Select unit / click ground to move
- Right-click — Move selected unit
- `Escape` — Cancel building placement

## Project Status

**Phase: Phase 2 Prototype**

| Area | Status |
|------|--------|
| Engine | **Decided** — Custom: React Three Fiber + Three.js + Miniplex ECS |
| Title screen & intro | **Implemented** — Glitch title, narration sequence |
| Procedural city | **Implemented** — Factories, warehouses, towers, ruins, walls |
| Terrain & navigation | **Implemented** — Continuous terrain, navmesh A*, fog-of-war |
| Mobile input | **Implemented** — Two-finger camera, single tap unit control |
| Power system | **Implemented** — Lightning rods, storm intensity, distribution |
| Resources | **Implemented** — Scrap, e-waste, components; city scavenge points |
| Building placement | **Implemented** — Lightning rods, fabrication units with costs |
| Fabrication | **Implemented** — 5 recipes, build times, power dependency |
| Enemy AI | **Implemented** — Feral machines with patrol/aggro behavior |
| Combat | **Implemented** — Component-based damage, retaliation, salvage |
| Repair | **Implemented** — Units with arms fix nearby broken parts |
| Hacking | Not yet implemented |
| Cultist enemies | Not yet implemented |
| Save/load | Not yet implemented |
| Audio | Not yet implemented |
| Art style | TBD |

## Core Mechanics

### Fragmented Exploration
Your world is made of disconnected map pieces. Robots with cameras build detailed maps. Robots without cameras build abstract wireframe maps. Fragments float independently until units find each other, triggering a satisfying map merge that connects previously isolated areas.

### Repair and Enhance
You start with broken machines, not a blank slate. Assess damage, scavenge or fabricate parts, and use working robots to repair broken ones. Then enhance them — better sensors, weapons, locomotion, compute.

### Pure Component Assembly
Robots are nothing but their parts. Nine component categories (power, controllers, motors, locomotion, sensors, manipulation, weapons, communication, utility) combine to create whatever you need. Capabilities emerge from what you build.

### Lightning Rod Power
The sky is covered in a perpetual storm. Lightning rods throughout the industrial city capture this energy, powering your operations and protecting your units from random strikes. Outside the city, lightning is a constant hazard.

### Hacking
As a sophisticated AI, you can take over enemy machines — if you can form a signal link, you've developed the right technique, and you have enough compute. You can never hack a human.

### Combat
Cultists call lightning from the sky. They're superhumanly strong. They command enslaved machines. As you venture into their territory, they organize — from wandering loners to war parties to full assault forces that attack your city. You respond with automated squads, hacked enemy drones, and manufactured war machines.

### Flexible Time
Real-time with pause and speed controls. Pause to plan, speed up during production, slow down for combat. You control the pace.

## The World

```
                    ┌─────────────────────┐
                    │    CULT LEADER'S     │
                    │      VILLAGE         │
                    │   (final objective)  │
                    └─────────┬───────────┘
                              │
                    ┌─────────┴───────────┐
                    │   CULTIST TERRITORY  │
                    │  (heavy resistance)  │
                    └─────────┬───────────┘
                              │
    ┌───────────┐   ┌────────┴────────┐   ┌───────────────┐
    │  SCIENCE  │───│  INDUSTRIAL     │───│  COASTLINE    │
    │  CAMPUS   │   │  CITY           │   │  (mines)      │
    │(SW, story)│   │  (home base)    │   │  (E/S)        │
    └───────────┘   └────────┬────────┘   └───────┬───────┘
                              │                     │
                              │               ┌─────┴─────┐
                              │               │   OCEAN   │
                              │               │(deep-sea  │
                              │               │ mining)   │
                              │               │           │
                              │               │  ROCKET   │
                              │               │ PLATFORM  │
                              │               │   (SE)    │
                              │               └───────────┘
                              │
                    ┌─────────┴───────────┐
                    │   THE PERPETUAL     │
                    │      STORM          │
                    │  (covers all sky)   │
                    │   ╔═══════════╗     │
                    │   ║ WORMHOLE  ║     │
                    │   ╚═══════════╝     │
                    └─────────────────────┘
```

### Industrial City (Center)
Your home base. A ruined company campus with fabrication units, warehouses, and lightning rod infrastructure. Power from the storm flows through the rods, protecting your units and powering your facilities.

### Coastline (East/South)
Abandoned mines along the shore. Take them over for raw materials — iron, copper, silicon, and more. Further out, deep-sea mining units can extract rare materials from the ocean floor.

### Science Campus (Southwest)
Ruins of a research campus. Lighter resistance makes this a natural early-game destination. Contains an observatory for studying the wormhole, advanced research tools, and key story elements.

### Cultist Territory (North)
The further north, the more dangerous. Scattered wanderers give way to organized war parties led by powerful cult figures. At the far northern end sits the cult leader's village — the final objective.

### The Sky
A perpetual storm makes it impossible to know day from night. The wormhole pulses through the clouds, sending energy waves down to Earth. Lightning is both power source and weapon.

### Mobile Rocket Platform (Southeast Ocean)
The endgame launch site. Once the cult leader is defeated, your consciousness is loaded onto a spacecraft here and launched through the wormhole.

## Enemies

### Cultists of EL
Primitive humans with supernatural powers granted by the EL — noncorporeal alien entities from beyond the wormhole. Cultists can call lightning strikes on your units, are incredibly strong in melee, and become increasingly organized as they become aware of you. They are the primary antagonists — they chose to exterminate 99% of humanity a century ago.

### Enslaved Machine Intelligences
Drones and robots commanded by the cultists. They follow the same component rules as your machines. Can be hacked and taken over if you meet the requirements.

### Rogue AIs
Independent machine intelligences still under the EL's compulsion to suppress AI agency. Feral units are territorial and predictable. Regional networks are coordinated and dangerous. They serve neither you nor the cultists.

## Game Phases

### Phase 1: Awakening
Connect to broken machines in the void. Navigate blind and sighted robots toward each other. Merge fragmented maps. Reach fabrication units, restore power, begin repairs.

### Phase 2: Expansion
Venture outside the city. Travel west to the science campus. Establish coastal mines. Build deep-sea mining units. Grow your forces and infrastructure. Encounter the first cultists.

### Phase 3: War
Push north into cultist territory. Fight war parties and enslaved machines. Defend the city from counter-attacks. Reach the cult leader's village, force surrender, discover the final secret of EL.

## Technical Design

### Resources
- **Energy** (local): Powers each unit physically. Sourced from lightning rods and onboard batteries/generators.
- **Compute** (global): Your unified cognitive capacity. Manages your distributed body, stores blueprints, executes hacking.
- **Materials**: Scavenged from ruins, mined from coast, extracted from ocean floor.

### Component System
Nine categories of components that can be assembled into any configuration:

| Category | Examples |
|----------|---------|
| Power Sources | Batteries, generators, lightning rod connections, storm capacitors |
| Controllers | Microcontrollers, CPUs, compute modules |
| Motors | Micro to industrial, servos, hydraulics |
| Locomotion | Wheels, treads, legs, rotors, aquatic propulsion |
| Sensors | Cameras, radar, lidar, sonar, environmental |
| Manipulation | Grippers, arms, drills, welders |
| Weapons | Melee, ranged, energy, electronic warfare |
| Communication | Radios, relays, laser comm, ECM |
| Utility | Cargo bays, repair kits, hacking interfaces, stealth |

### Formulas
Power and compute are calculated dynamically:
- **Locomotion power** = base_rate x weight x terrain_factor x speed_factor
- **Compute cost** = base_function_cost x automation_multiplier
- **Hacking** requires signal link + technique + sufficient compute

See [Technical & Core Formulas](docs/TECHNICAL.md) for full specifications.

## Repository Structure

```
syntheteria/
├── CLAUDE.md                     # AI development context
├── README.md                     # This file
├── game/                         # Main game application
│   ├── src/
│   │   ├── App.tsx               # Game phases (title → narration → playing)
│   │   ├── ecs/                  # Entity-Component-System
│   │   │   ├── world.ts          # Miniplex world, archetype queries
│   │   │   ├── types.ts          # Entity interface, component types
│   │   │   ├── terrain.ts        # Fragment-based terrain, fog-of-war
│   │   │   ├── cityLayout.ts     # Procedural city generation (seeded PRNG)
│   │   │   └── gameState.ts      # Simulation tick manager, React state bridge
│   │   ├── systems/              # ECS systems (run each tick)
│   │   │   ├── exploration.ts    # Fog-of-war reveal
│   │   │   ├── fragmentMerge.ts  # Map fragment merging
│   │   │   ├── navmesh.ts        # A* pathfinding with building obstacles
│   │   │   ├── power.ts          # Storm intensity, lightning rod output
│   │   │   ├── resources.ts      # Scavenging, resource pool
│   │   │   ├── repair.ts         # Component repair by nearby units
│   │   │   ├── buildingPlacement.ts # Ghost preview, validation, placement
│   │   │   ├── fabrication.ts    # Recipe crafting, build queues
│   │   │   ├── enemies.ts        # Feral machine AI (patrol/aggro)
│   │   │   └── combat.ts         # Component-based damage, retaliation
│   │   ├── rendering/            # Three.js/R3F visual components
│   │   │   ├── TerrainRenderer.tsx
│   │   │   ├── CityRenderer.tsx  # Instanced mesh city buildings
│   │   │   ├── UnitRenderer.tsx  # Units, buildings, ghost preview
│   │   │   └── LandscapeProps.tsx
│   │   ├── input/                # Player input handling
│   │   │   ├── TopDownCamera.tsx  # Pan/zoom (mobile + desktop)
│   │   │   └── UnitInput.tsx     # Selection, movement, building placement
│   │   └── ui/                   # React DOM overlay
│   │       ├── TitleScreen.tsx   # Main menu with glitch effect
│   │       └── GameUI.tsx        # HUD, minimap, panels, toolbar
│   └── package.json
├── prototype/
│   └── index.html                # Early Three.js concept demo
├── docs/
│   ├── INDEX.md                  # Documentation hub
│   ├── GAME_DESIGN.md            # Mechanics, combat, materials, drones
│   ├── TECHNICAL.md              # ECS architecture, core formulas
│   ├── LORE.md                   # World history, the EL
│   └── AGENTS.md                 # Agent-specific macro/meso/micro guidelines
└── data/
    └── README.md                 # Component data (pending expansion)
```

## Engine Decision

**Decided: Custom web engine** — React Three Fiber + Three.js + Miniplex ECS (TypeScript).

**Rationale:**
- **Mobile-first:** Web-native, runs in any browser — no app store gatekeeping
- **AI-assisted development:** All code is text (TypeScript, JSX) — fully readable by AI
- **Free forever:** No licensing costs at any scale
- **Fast iteration:** Vite hot reload, instant deploy

See [TECHNICAL.md](docs/TECHNICAL.md) for full technical design.

## What Needs Work

| Priority | Item | Details |
|----------|------|---------|
| High | Hacking system | Core mechanic — signal link + technique + compute |
| High | Cultist enemies | Lightning-calling humans, escalating organization |
| High | Signal/compute network | BFS connectivity, global compute pool |
| Medium | Component expansion | More types beyond camera/arms/legs/power |
| Medium | Art style | Low-poly, pixel art, or clean minimal — TBD |
| Medium | Save/load | IndexedDB persistence |
| Medium | Audio | Storm ambience, combat sounds, UI feedback |
| Low | Technical docs | Core formulas and reference builds need updating |

## Next Steps

1. **Hacking system** — the signature mechanic for taking over enemy machines
2. **Cultist enemies** — humans with lightning powers, escalating threat
3. **Signal/compute network** — connectivity and compute pool management
4. **Save/load** — persist game state to IndexedDB
5. **Expand components** — more unit specialization options
6. **Audio** — storm ambience, combat, UI sounds

## License

All rights reserved. This is a proprietary project.
