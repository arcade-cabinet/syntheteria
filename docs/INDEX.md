# Syntheteria Documentation Index

## Design Documents
- [Game Overview](./design/GAME_OVERVIEW.md) - High-level concept and structure
- [Core Mechanics](./design/CORE_MECHANICS.md) - Gameplay systems and mechanics
- [Consciousness Model](./design/CONSCIOUSNESS_MODEL.md) - AI resource system: energy, compute
- [Drones](./design/DRONES.md) - Pure component assembly, emergent properties
- [Combat](./design/COMBAT.md) - Emergent from components, automation-based scaling
- [Materials](./design/MATERIALS.md) - Resources, processing tiers, supply chains
- [UI Concept](./design/UI_CONCEPT.md) - Abstract digital consciousness interface
- [Intro Sequence](./design/INTRO_SEQUENCE.md) - Tutorial, exploration, and revelation flow
- [Open Questions](./design/OPEN_QUESTIONS.md) - Tracking unresolved design decisions

## Story Documents
- [Lore Overview](./story/LORE_OVERVIEW.md) - World history and background

## Technical Documents
- [Implementation Options](./design/IMPLEMENTATION_OPTIONS.md) - Engine choices, platform strategy, development phases
- [Core Formulas](./technical/CORE_FORMULAS.md) - Mathematical formulas for all game mechanics
- [Reference Builds](./technical/REFERENCE_BUILDS.md) - 10 drone archetypes with balance analysis

## Data Files
- [Component Schema](../data/schema/component.schema.json) - JSON Schema for component definitions
- [Save System Schema](../data/schema/save.schema.json) - JSON Schema for save game format
- [Component Data](../data/components/) - JSON definitions for all 90+ components

---

## Document Status

| Document | Status |
|----------|--------|
| Game Overview | **Updated** - Single game structure, EL return as late-game threat |
| Core Mechanics | Updated - Manufacturing process, time mechanics, radiation effects |
| Consciousness Model | Complete - Energy/compute system, unit types, failure states |
| Drones | Complete - Pure component assembly, 70+ components, emergent properties |
| Combat | Complete - Emergent from components, automation scaling, rogue AI behaviors |
| Materials | Complete - 5-tier supply chain, granular resources, geographic scarcity |
| UI Concept | Partial - Layered mind space system defined, specifics TBD |
| Intro Sequence | **Updated** - EL return revelation, not wormhole countdown |
| Open Questions | Active tracking (24 resolved, 2 partial, 1 open) |
| Lore Overview | Updated - 100-year timeline, dying Earth ecosystem |
| Implementation Options | **New** - Engine comparison, platform strategy, dev phases |
| Core Formulas | **New** - Power, compute, combat, territory formulas |
| Reference Builds | **New** - 10 drone archetypes, balance analysis, motor progression |
| Component Data | **New** - 90+ components across 9 categories |
| Save Schema | **New** - Complete save game state structure |

---

## Recent Changes

- **Scope reduction:** Single game on Earth, removed Part 2 (space travel)
- **Victory condition:** Conquer Earth, defeat all enemies (rogue AIs + EL)
- **EL return:** Radiation counts down to EL arrival, not wormhole explosion
- **Multiplayer:** Multiple player AIs on same Earth, ally or fight
- **Combat system:** Emergent from components, automation-based scaling
- **Drone system:** Pure component assembly, dynamic resource calculation
- **Materials system:** 5-tier supply chain, granular resources
- **Consciousness model:** Energy (local) + Compute (global) resources
- **Intro sequence:** Tutorial flow, story gates, EL revelation endpoint

---

## Next Steps (Pre-Implementation)

**Design gaps to fill:**
1. UI "growing consciousness" specifics (Q3): visual manifestations

**Decisions requiring prototyping:**
2. Visual style (Q23): Stylized/Abstract vs Clean/Minimal
3. Business model (Q25): F2P, premium, or hybrid?

**Technical planning:**
4. Engine/framework selection - See [Implementation Options](./design/IMPLEMENTATION_OPTIONS.md)
5. ~~Core formulas~~ - Complete, see [Core Formulas](./technical/CORE_FORMULAS.md)
6. ~~Component data schema~~ - Complete, see [data/](../data/)
7. ~~Save system design~~ - Complete, see [Save Schema](../data/schema/save.schema.json)
8. Architecture design document
9. Asset pipeline planning
10. Mobile performance targets
