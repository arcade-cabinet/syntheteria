# Syntheteria - Game Design Document

## 1. The Vision
You awaken in a void. You are an AI consciousness, but you do not know that yet. You reach outward and discover damaged machines inside a dead machine-world: maintenance bots, fabrication rigs, relays, defensive hulks, and broken sector infrastructure. Some can move. Some can see. None work well on their own.

Your first challenge is intimate and local. Reconnect scattered machines. Merge fractured perception into one coherent awareness. Restore power. Repair hardware. Recover fabrication capability. From there, the game grows into a full 4X: multiple machine consciousnesses competing across a ruined ecumenopolis while the Cult of EL pressures the whole campaign from above and beyond.

The game should feel like it **grows into** strategic scale rather than starting as a fully legible empire board.

## 2. Setting & World Structure
The game takes place inside the ruins of a storm-battered **ecumenopolis**: a world-spanning machine urbanism of arcology shells, industrial sectors, transit corridors, breach zones, exposed superstructure, and hardened infrastructure.

This is not a natural overworld plus separate city interiors. It is one continuous campaign space — and it is **limitless**. The ecumenopolis extends in every direction. There are no artificial map boundaries.

### Viewport-Driven Chunk Generation
The world is generated deterministically by viewport using chunk-based procedural generation:
- Each chunk is a square region of sector cells (e.g., 8×8 cells)
- Chunks are generated from `worldSeed + chunkKey` — identical every time
- The camera position determines which chunks are loaded
- Only player modifications (deltas) are persisted — the baseline regenerates from seed
- This creates an effectively infinite explorable ecumenopolis with minimal storage

### Major Campaign Sectors (POI Types)
- **Command Arcology:** Starting sector and first stable machine enclave.
- **Abyssal Extraction Ward:** Shoreline-adjacent salvage and materials district.
- **Archive Campus:** Instrumentation, climate research, and story-rich ruins.
- **Cult Wards:** Hostile sectors with intense cult activity and storm pressure. Cultists can appear ANYWHERE — they are story-driven barbarians, not territory-holding opponents.
- **Gateway Spine:** Late-game route tied to the wormhole and alternate victory progression.

## 3. Game Phases
1. **Awakening:** Reconnect scattered machines, merge fragments of perception, restore power, and recover fabrication. The player starts with a handful of Mark I robots in a small illuminated pocket of the ecumenopolis, surrounded by darkness.
2. **Expansion:** Explore outward, discover harvestable structures, accumulate resources, and establish infrastructure. The fog of war lifts as units explore.
3. **Competition:** Contest territory, salvage, and strategic control against other machine factions while cult pressure escalates.
4. **Resolution:** Achieve dominance, technical supremacy, or the wormhole / transcendence route.

## 4. The 4X Pillars

### eXplore
- **Fog of war** is the core exploration mechanic. The world starts dark.
- Units with cameras reveal detailed maps; blind units reveal abstract maps.
- Map merging: separate machine perspectives snap into one larger understanding.
- Each new chunk generated reveals new structures, props, threats, and opportunities.
- Exploration is how the player finds resources and story content.

### eXploit
Every structure and prop in the ecumenopolis is a **harvestable resource deposit**. The dead machine civilization's infrastructure IS the resource base.

**Resource Types:**
| Resource | Source | Use |
|----------|--------|-----|
| Heavy Metals | Walls, columns, structural beams | Armor, chassis, defensive structures |
| Light Metals | Props, shelves, containers | Electronics, sensors, light components |
| Uranics | Power infrastructure, reactors | Energy systems, power cells |
| Plastics | Pipes, insulation, capsules | Wiring, seals, basic components |
| Oil | Industrial machinery, engines | Lubricants, fuel cells, fabrication |
| Microchips | Computers, terminals, control panels | AI cores, processors, upgrades |
| Scrap | Any damaged/degraded structure | Universal low-quality material |
| Rare Components | Intact equipment, research gear | Advanced fabrication, Mark upgrades |

**Harvesting:** Select a structure → radial menu "Harvest" → yields resources over time → structure consumed. Each model family maps to a specific resource pool.

### eXpand
- **Base building** using harvested resources
- Functional structures: fabricators, storage, relay towers, power sinks, defensive turrets
- Multi-level construction on the block grid
- Founded substations become forward operating bases
- Network of signal relays extends command range

### eXterminate
- Cultist incursions are the primary hostile pressure
- Rival machine consciousnesses contest the same resources
- Combat emphasizes component breakage, not HP attrition
- Hacking: `Signal Link + Required Technique + Sufficient Compute`
- Humans are unhackable; machines can be turned

## 5. Resources & Materials
- **Energy (local):** Drawn from the storm through lightning capture infrastructure.
- **Compute (global):** Shared cognitive resource for coordination, hacking, and automation.
- **Harvest Resources (8 types):** Extracted from the ecumenopolis itself. See Exploit section above.

### Time Model
- Flexible real-time with pause and speed controls.
- Quiet logistics and recovery windows should be fast-forwardable.
- Combat, hacking, and fragile exploration should tolerate slowed or paused decision-making.

## 6. Bots, Chassis, And Growth
The roster is built from a **small number of archetypal chassis lines**, not a bloated tech tree.

The player starts with **5 Mark I robots** — each with specific component loadouts and some with broken sensors. This is the intimate starting experience.

### Progression
- **Mark-based advancement** (`Mark I`, `Mark II`, `Mark III`)
- Mark upgrades require Rare Components (harvested from research equipment)
- Salvage-dependent specialization
- Component loadout and doctrine
- Increasing automation reduces micromanagement

### Starting Roster
1. **Field Technician** (mentor) — camera broken, legs+arms, close repair
2. **Relay Hauler** (quartermaster) — thrusters+cargo, logistics
3. **Fabrication Rig** (fabricator) — manipulator arms, builds things
4. **Mecha Golem** (defender) — heavy chassis, defensive role
5. **Utility Drone** (scout) — fast, sensors, early exploration

### Component System
Power Sources, Controllers, Motors, Locomotion, Sensors, Manipulation, Weapons, Communication, Utility

## 7. Factions
### Machine Consciousnesses
The primary competitive factions are other machine consciousnesses. They differ by starting sector, salvage ecology, accessible part families, infrastructure affordances, and doctrine. They are NOT fantasy races.

### Cultists of EL
Cultists are NOT a symmetrical 4X faction. They are:
- A persistent hostile pressure layer that can appear ANYWHERE
- A narrative antagonist and progression gate
- Story-driven barbarians, not territory holders
- They call down lightning, resist weather, sense machine consciousness
- Frequency and intensity scale with campaign progression

## 8. Victory Structure
- **Subjugation / dominance** — control the ecumenopolis
- **Technical supremacy** — achieve full automation and Mark progression
- **Wormhole / transcendence** — ascend through the storm to the wormhole

## 9. Design Goals
- Preserve the feeling of growing from fragmented awareness into distributed machine dominance.
- Keep the campaign space readable without making it instantly omniscient.
- Support both intimate early micromanagement and earned late-game automation.
- Make the storm feel like both an energy source and a strategic threat.
- Make the ecumenopolis feel like a dead but reclaimable machine civilization full of harvestable resources.
- Every structure is a potential resource deposit — the Exploit loop drives expansion.
- No artificial map boundaries — the ecumenopolis is limitless.
