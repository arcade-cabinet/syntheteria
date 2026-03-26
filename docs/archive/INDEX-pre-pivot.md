> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Syntheteria Documentation Index

## Design Documents
- [Game Overview](./design/GAME_OVERVIEW.md) - High-level concept, world map, game phases
- [Core Mechanics](./design/CORE_MECHANICS.md) - Gameplay systems: resources, hacking, power, combat
- [Consciousness Model](./design/CONSCIOUSNESS_MODEL.md) - AI resource system: energy, compute, signal
- [Drones](./design/DRONES.md) - Robot repair/enhance, component assembly, power/compute calculations
- [Combat](./design/COMBAT.md) - Cultists, lightning, hacking, enemy types
- [Materials](./design/MATERIALS.md) - Scavenging, mining, fabrication, supply chain
- [UI Concept](./design/UI_CONCEPT.md) - 2.5D top-down view, fragmented maps, exploration mechanics
- [Intro Sequence](./design/INTRO_SEQUENCE.md) - Void awakening, map merging, base establishment
- [Open Questions](./design/OPEN_QUESTIONS.md) - Tracking unresolved design decisions

## Story Documents
- [Lore Overview](./story/LORE_OVERVIEW.md) - World history, EL, Cultists, geography

## Technical Documents
- [Implementation Options](./design/IMPLEMENTATION_OPTIONS.md) - Engine choices, platform strategy, development phases
- [Core Formulas](./technical/CORE_FORMULAS.md) - Mathematical formulas for game mechanics (needs update)
- [Reference Builds](./technical/REFERENCE_BUILDS.md) - Drone archetypes (needs update after component redesign)

---

## Document Status

| Document | Status |
|----------|--------|
| Game Overview | **Rewritten** - Industrial city, world map, three phases |
| Core Mechanics | **Rewritten** - Lightning power, hacking, flexible time, enemies |
| Consciousness Model | **Rewritten** - Void awakening, lightning rod power |
| Drones | **Rewritten** - Repair/enhance framing, component categories (data TBD) |
| Combat | **Rewritten** - Cultists with lightning, hacking, three enemy types |
| Materials | **Rewritten** - Scavenging, coastal mines, deep-sea mining |
| UI Concept | **Rewritten** - 2.5D top-down, fragmented maps, exploration |
| Intro Sequence | **Rewritten** - Void awakening, fragmented maps, base establishment |
| Open Questions | **Updated** - 24 resolved, 1 partial, 5 open |
| Lore Overview | **Updated** - Perpetual storm, lightning, world geography |
| Implementation Options | **Superseded** - Engine decided: BabylonJS 8 + Reactylon 3 + Koota ECS |
| Architecture | **Updated** - Build order with implementation status tracking |
| Core Formulas | **Needs update** - Power/combat formulas implemented but doc not updated |
| Reference Builds | **Needs update** - Component data retired, will need rebuild |

---

## What Changed (Vision Realignment)

Major changes from the previous design:

1. **View:** Abstract consciousness UI → 2.5D/3D top-down with fragmented map exploration
2. **Setting:** Generic post-apocalyptic → Industrial city as home base with specific world geography
3. **Power:** Generic energy → Lightning rods drawing from perpetual storm
4. **Enemies:** Rogue AIs as primary → Cultists with supernatural lightning powers as primary
5. **Intro:** Scripted 4-gate tutorial → Emergent discovery (connect to broken machines, explore, repair)
6. **Time:** Accelerated real-time (1s=1min) → Flexible with pause/speed controls
7. **Multiplayer:** Core feature → Future scope (procedural world), single-player focus
8. **Platform:** Mobile-first → PC and mobile equally
9. **Components:** 101 components in JSON → Retired, redesigned with 5 basic types implemented
10. **Combat:** Component-based damage (break parts, not HP), feral machines implemented, cultists pending
11. **Engine:** Decided — Custom web engine (BabylonJS 8 + Reactylon 3 + Koota ECS)

---

## Implementation Progress

| System | Status |
|--------|--------|
| Title screen & intro narration | **Done** |
| Procedural city environment | **Done** |
| Terrain, navmesh, fog-of-war | **Done** |
| Mobile/desktop input | **Done** |
| Power (lightning rods + storm) | **Done** |
| Resources & scavenging | **Done** |
| Building placement | **Done** |
| Fabrication (5 recipes) | **Done** |
| Feral enemy AI | **Done** |
| Component-based combat | **Done** |
| Repair system | **Done** |
| Hacking system | Pending |
| Cultist enemies | Pending |
| Signal/compute network | Pending |
| Save/load | Pending |
| Audio | Pending |

---

## Next Steps

1. **Hacking system** — core mechanic for taking over enemy machines
2. **Cultist enemies** — humans with lightning powers
3. **Signal/compute network** — BFS connectivity, global compute pool
4. **Save/load** — IndexedDB persistence
5. **Expand component data** — more types for unit specialization
6. **Audio** — storm ambience, combat, UI sounds
