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
| Open Questions | **Updated** - 20 resolved, 2 partial, 11 new open |
| Lore Overview | **Updated** - Perpetual storm, lightning, world geography |
| Implementation Options | **Updated** - Visual direction resolved, either engine viable |
| Core Formulas | **Needs update** - Time model changed, power system changed |
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
9. **Components:** 101 components in JSON → Retired, needs redesign for new setting
10. **Combat:** Added hacking, lightning calling, cultist organization tiers

---

## Next Steps (Pre-Implementation)

1. **Choose engine** — Unity or Godot, then commit
2. **Build Phase 1 prototype** — fragmented map system is the key test
3. **Redesign component data** — new components for the storm/lightning/coastal setting
4. **Determine art style** — low-poly, pixel art, or clean minimal
5. **Update technical docs** — formulas and reference builds after component redesign
