# Project Brief: Syntheteria

## What Is Syntheteria?

Syntheteria is a storm-bound machine-consciousness 4X game set on a ruined ecumenopolis. The player is not a human commander — the player IS an awakening distributed AI consciousness, emerging from degraded hardware inside a dead machine-world. The game grows from intimate local reconnection into full strategic-scale competition across a world-spanning machine urbanism.

## Core Premise

You awaken in a void. You reach outward and discover damaged machines — maintenance bots, fabrication rigs, relays, defensive hulks, broken sector infrastructure. Your first challenge is intimate and local: reconnect scattered machines, merge fractured perception into one coherent awareness, restore power, repair hardware, recover fabrication capability. From there, the game grows into a full 4X.

## The 4X Pillars

- **eXplore:** Fog of war is the core exploration mechanic. The world starts dark. Units with cameras reveal detailed maps; blind units reveal abstract maps. The ecumenopolis is limitless — viewport-driven chunk generation from `worldSeed + chunkKey` creates an effectively infinite explorable space.
- **eXploit:** Every structure and prop in the ecumenopolis is a harvestable resource deposit. The dead machine civilization's infrastructure IS the resource base. 11 material types (see Economy doc): heavy/light metals, uranics, plastics, e-waste, intact components, scrap metal, and others defined in config.
- **eXpand:** Base building using harvested resources — fabricators, storage, relay towers, power sinks, defensive turrets. Founded substations become forward operating bases. Signal relay networks extend command range.
- **eXterminate:** Cultist incursions are the primary hostile pressure. Rival machine consciousnesses contest the same resources. Combat emphasizes component breakage, not HP attrition. Hacking: `Signal Link + Required Technique + Sufficient Compute`.

## Victory Conditions

1. **Subjugation / Dominance** — control the ecumenopolis
2. **Technical Supremacy** — achieve full automation and Mark progression
3. **Wormhole / Transcendence** — ascend through the storm to the wormhole

## Non-Negotiable Requirements

### Identity
- The player is an awakening distributed AI, not a human commander
- The world is one continuous ecumenopolis — not a natural overworld plus separate city interiors
- The ecumenopolis is limitless — no artificial map boundaries
- The storm is both energy source and strategic threat
- Every structure is a potential resource deposit

### Technical
- Must work on mobile AND desktop (touch-first design constraint)
- Config-driven architecture — JSON config files over hardcoded constants
- Crash hard on missing assets — NEVER silently fallback
- Koota ECS owns canonical gameplay state; systems own logic; TSX reads contracts
- SQLite is authoritative persistence; runtime state is ECS
- No dual data stores — ONE source of truth per data domain

### Aesthetic
- Machine perception layer aesthetic — not fantasy, not generic cyber
- Dark industrial base, not pure black voids
- Cyan is accent; amber is infrastructure/power/fabrication; red is only for genuine threat
- The interface should feel like a machine perception layer and command relay
- Post-human, industrial, ruinous, cold, and deliberate

## Game Phases

1. **Awakening:** Reconnect scattered machines, merge perception fragments, restore power, recover fabrication. Starts with 5 Mark I robots in a small illuminated pocket surrounded by darkness.
2. **Expansion:** Explore outward, discover harvestable structures, accumulate resources, establish infrastructure.
3. **Competition:** Contest territory, salvage, and strategic control against rival machine factions while cult pressure escalates.
4. **Resolution:** Achieve dominance, technical supremacy, or the wormhole/transcendence route.

## Factions

- **Rival Machine Consciousnesses** (4 factions) — the true 4X competitors. Distinct awakenings from different sectors, salvage ecologies, and inherited infrastructure. Identities arise from doctrine, materials, environment, and recovered architecture.
- **Cultists of EL** — non-playable antagonist layer. Persistent hostile pressure that can appear ANYWHERE. Story-driven barbarians, not territory-holding opponents. Escalate from wanderers to war parties to organized assaults.

## Starting Roster (5 Mark I Robots)

1. Field Technician (mentor) — camera broken, legs+arms, close repair
2. Relay Hauler (quartermaster) — thrusters+cargo, logistics
3. Fabrication Rig (fabricator) — manipulator arms, builds things
4. Mecha Golem (defender) — heavy chassis, defensive role
5. Utility Drone (scout) — fast, sensors, early exploration

## Key Resources

- **Energy (local):** Drawn from the storm through lightning capture infrastructure
- **Compute (global):** Shared cognitive resource for coordination, hacking, and automation
- **Harvest Resources (8 types):** Extracted from the ecumenopolis structures
