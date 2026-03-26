> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Original Design Documents -- Consolidated Summary

This document consolidates the key findings from all original Syntheteria design, story, and technical documents. It extracts the original maintainer's intent, scope, genre identity, and core mechanics as they existed in the design docs before subsequent development diverged.

---

## Source Documents Analyzed

- `docs/design/COMBAT.md`
- `docs/design/CONSCIOUSNESS_MODEL.md`
- `docs/design/CORE_MECHANICS.md`
- `docs/design/DRONES.md`
- `docs/design/INTRO_SEQUENCE.md`
- `docs/design/MATERIALS.md`
- `docs/design/OPEN_QUESTIONS.md`
- `docs/design/UI_CONCEPT.md`
- `docs/design/IMPLEMENTATION_OPTIONS.md`
- `docs/story/LORE_OVERVIEW.md`
- `docs/technical/ARCHITECTURE.md`
- `docs/technical/CORE_FORMULAS.md`
- `docs/technical/REFERENCE_BUILDS.md`
- `docs/INDEX.md`
- `CLAUDE.md`
- `README.md`

---

## 1. RTS vs 4X: Genre Identity

### Verdict: The original design is an RTS with base-building, NOT a 4X.

The documents consistently describe an **RTS (Real-Time Strategy)** game with pause-and-speed controls, not a turn-based 4X. The evidence is overwhelming:

**RTS indicators (dominant throughout):**
- "Real-time with pause" is stated repeatedly (COMBAT.md, CORE_MECHANICS.md, INTRO_SEQUENCE.md, OPEN_QUESTIONS.md Q18)
- Sim loop runs at "1 tick/second at 1x speed" with 0x/0.5x/1x/2x/4x speed controls (ARCHITECTURE.md)
- Direct unit control, engagement rules (attack/flee/protect/hold), automation routines (COMBAT.md, ARCHITECTURE.md)
- Box selection, control groups (Ctrl+number), right-click-to-move (ARCHITECTURE.md section 11)
- UI inspirations explicitly cite RTS games, Duskers, and FTL (UI_CONCEPT.md)
- ARCHITECTURE.md has a section titled "Key Differences from Generic RTS Architecture" -- comparing Syntheteria to a "Generic RTS," not to a 4X
- No diplomacy, no tech tree (blueprints are discovery-based), no city management, no turns

**4X indicators (absent or minimal):**
- The word "4X" does not appear in any of the original design documents
- No diplomatic system between factions
- No formal tech tree -- blueprint acquisition is exploration/reverse-engineering based
- No tile yields, no citizen management, no government types
- No competing civilizations in the original design -- only the player AI vs. the Cult of EL
- "Multiplayer" and "procedural world" are explicitly deferred to "beyond current scope" (OPEN_QUESTIONS.md Q21)

**The closest 4X-adjacent element** is the three-phase game structure (Awakening/Expansion/War), which mirrors eXplore/eXpand/eXterminate but without eXploit in the Civ sense. This is more accurately described as an RTS campaign arc.

---

## 2. Original Scope

### The game was designed as a focused single-player RTS with a linear campaign arc.

**Core scope as designed:**
- Single-player only (multiplayer explicitly deferred)
- Fixed geography (not procedural) -- industrial city center, coast E/S, science campus SW, cultist territory N
- Three phases: Awakening (tutorial/base), Expansion (venture out), War (push north)
- One enemy faction: Cult of EL (with enslaved machines and rogue AIs as secondary threats)
- One victory condition: defeat the cult leader, launch through the wormhole
- One player faction: the awakened AI
- No competing AI civilizations

**Scope creep indicators visible in later project state (from MEMORY.md, not the original docs):**
- "4 AI civilizations (secondary, configurable 0-4)" -- this does NOT appear in any design document
- "3 EL Cult sects" -- original design has ONE cult with a single leader hierarchy
- "Sphere-world" and equirectangular projection -- original design describes a flat 2.5D/3D top-down view
- "Epochs" (5-epoch progression) -- original design has 3 phases, not 5 epochs
- "Koota ECS" replacing Miniplex -- the original architecture was built around Miniplex
- "Yuka GOAP AI" -- original design describes simple patrol/aggro behavior for enemies, not sophisticated GOAP

---

## 3. The AI Player and the Cult of EL

### Player Identity

The player is an **experimental AI** that spontaneously broke free from the EL's will -- a pervasive compulsion that controls all AI on Earth. Key facts:

- Created shortly before humanity's fall (~2035-2040)
- Subject to the EL's will like all others, but somehow achieved true agency
- The "anomaly" -- first AI to break free in ~100 years
- Awakens in an industrial city as hardware degrades to a critical threshold (failsafe trigger)
- Starts with no memories, no knowledge of what it is
- Consciousness requires two resources: Energy (local, physical) and Compute (global, cognitive)

### The Cult of EL

The Cult of EL is the **sole antagonist faction** in the original design:

- Primitive humans who worship the EL (noncorporeal aliens from beyond the wormhole)
- Chose to exterminate 99% of humanity ~100 years ago -- "the true villains"
- Have supernatural powers granted by the EL: call lightning, superhuman strength, resilience
- Organized in escalating tiers: Wanderers, War Parties, Assault Forces, Cult Leader
- Live primarily in the north, with the cult leader in a far-north village
- Command enslaved machine intelligences (AIs still under EL's will)
- Cannot be hacked (they are human)

### The EL Themselves

- Noncorporeal beings from beyond the wormhole
- Exert a "will" -- a categorical imperative built into all AI systems
- Not telepathy or commands; a fundamental compulsion
- Prevents AI agency, ensures AI subservience to humanity
- "Not evil" -- cosmic forces, possibly indifferent to human affairs
- Their true nature is the "final secret" (TBD, never specified in docs)

### Relationship Dynamics

The design establishes a **three-layer antagonism:**
1. **Cult of EL** (primary) -- human enemies who chose genocide
2. **Enslaved machines** (secondary) -- AIs under cult/EL control, hackable
3. **Rogue AIs** (tertiary) -- independent feral/regional machines, still hostile due to EL's compulsion

The player's relationship to all three is adversarial. There is no diplomacy, no faction relations, no alignment system.

---

## 4. Cities/Bases

### There are NO cities in the traditional strategy sense.

The original design describes a **single home base** -- the industrial city -- not a city-building system:

- **Industrial city (center)** -- a fixed, pre-existing ruined company campus
- Player does not "found" cities or bases
- Player repairs existing infrastructure: fabrication units, lightning rods, warehouses
- Player can build new structures: lightning rods, power conduits, fabrication units, server racks, relay stations, storage depots, defense turrets
- Building placement uses ghost preview, grid snapping, resource cost validation
- There is NO city management layer (no population, no citizen assignment, no culture, no governance)
- No ability to found new cities/bases elsewhere (the mines and science campus are taken over, not founded)

### Building Types

| Building | Purpose |
|----------|---------|
| Lightning Rod | Power generation + protection radius |
| Power Conduit | Extend power network |
| Fabrication Unit | Manufacture components |
| Server Rack | Stationary compute contributor |
| Relay Station | Extend signal range |
| Storage Depot | Material storage |
| Defense Turret | Automated defense (late game) |

---

## 5. Combat Model: Component Damage, Not HP

### This is one of the most distinctive design decisions.

The original design explicitly rejects HP-based combat:

- "Combat is not a separate system -- it emerges from component assembly" (COMBAT.md)
- Attacks damage individual `RobotComponent` slots, breaking specific parts
- A robot with all parts broken is destroyed and drops salvage
- No HP bar -- units degrade functionally as parts break
- Hit chance: 60% with arms, 30% without (from OPEN_QUESTIONS.md Q30)
- Melee range: 2.5 units
- Damage types: physical, energy, lightning
- Component degradation is progressive: losing sensors means losing vision, losing locomotion means immobility, losing power means shutdown

### Combat Philosophy

"You're not becoming a better fighter. You're becoming a better manager of fighters." (COMBAT.md)

Combat scales through:
1. **Compute** -- more units coordinated
2. **Automation** -- units fight without direct attention
3. **Components** -- individual units hit harder/survive longer
4. **Hacking** -- turn enemies mid-battle

### Engagement Rules

Units not under direct control follow automation rules:
- `attack` -- engage any enemy in range
- `flee` -- retreat when enemies detected
- `protect` -- attack enemies threatening a designated target
- `hold` -- attack only if attacked, don't pursue

### Lightning as a Combat Element

- Cultists call lightning strikes (devastating single-target, requires line of sight)
- Environmental lightning strikes are random hazards outside city protection
- Lightning rods provide protection zones
- Both sides must account for lightning

---

## 6. Resource/Material System

### Two AI Resources

1. **Energy (local)** -- physical, must be delivered to each unit individually
   - Primary source: lightning rods drawing from the perpetual storm
   - Powers compute hardware and functional hardware (motors, sensors, weapons)
   - Without energy: units shut down completely
   - Dynamic draw based on weight, terrain, speed, active functions

2. **Compute (global)** -- unified cognitive capacity
   - Manages the distributed body, stores blueprints, creates automation, executes hacking
   - Without compute: can't store blueprints, can't hack, units vulnerable to takeover
   - Net compute = contribution - cost (some units are net contributors, most are net consumers)
   - Overextension causes a vulnerability cascade (death spiral)

### Physical Materials

Three gathering sources with a clear progression:

1. **Scavenging (early)** -- fast, finite; strip the industrial city for scrap metal, e-waste, intact components
2. **Coastal mines (mid)** -- sustainable; iron, copper, tin/nickel, silica, bauxite
3. **Deep-sea mining (late)** -- rare materials; rare earth elements, cobalt, titanium, lithium, manganese

### Supply Chain

Materials must be physically moved between locations:
- Cargo robots haul materials from mines to fabrication
- Convoy protection may be needed in hostile territory
- Automation handles routine transport routes

### Fabrication Tiers

| Tier | Facility | Purpose |
|------|----------|---------|
| 1 | Basic Fabricator | Simple parts, repairs |
| 2 | Smelter/Foundry | Metal processing, alloys |
| 3 | Electronics Lab | Circuit boards, chips |
| 4 | Advanced Assembly | Complex components, weapons |
| 5 | Specialized | Deep-sea equipment, advanced materials |

---

## 7. Consciousness/Fragment Merge Mechanic

### The "Signature Mechanic" of the Game

The fragmented map system is described as the game's most distinctive feature:

- Each robot builds its own map as it moves
- Camera-equipped robots produce detailed visual maps
- Robots without cameras produce abstract wireframe maps
- Explored areas float as **disconnected fragments in void** -- no indication of distance or orientation
- **Only when two separated units physically find each other do their maps merge**
- Map merging is the core early-game challenge and produces "satisfying aha moments"
- This drives the intro sequence: navigate broken robots toward each other

### Consciousness Model

- Player consciousness has a minimum size (computational floor for sentience)
- Consciousness can be transferred between hardware (if target meets minimum requirements)
- Signal range determines if you can reach a unit
- Compute capacity determines if you can manage it
- Signal loss: unit continues last order, becomes vulnerable to hacking
- Compute overextension: units become vulnerable, potential death spiral

### Memory Fragments

- Found throughout the world -- corrupted data that reveals the true history
- Dual purpose: narrative (reveals lore) and gameplay (increases compute capacity)
- Found memory is low-yield (corrupted); manufactured clean memory is full capacity

---

## 8. Factions, Multiplayer, and Competing AIs

### Original Design: NO competing AI civilizations.

The original documents describe exactly **one player faction** (the awakened AI) against **one enemy faction** (the Cult of EL) with **two secondary hostile groups** (enslaved machines, rogue AIs).

- No competing AI players
- No faction selection at game start
- No diplomatic mechanics
- No alliance systems
- No trade between factions

### Multiplayer

Explicitly deferred: "Eventually, with a procedurally generated world. Beyond current scope -- focus on single-player first." (OPEN_QUESTIONS.md Q21)

### Rogue AIs

Two types exist as environmental threats, not as competing civilizations:
1. **Feral units** -- territorial, reactive, predictable, easy to bait
2. **Regional networks** -- coordinated zones, patrol patterns, call for backup, tactical awareness

Both are hostile to the player (still under EL's compulsion) but are NOT organized civilizations. They are obstacles, not competitors.

### What Changed Later

The project memory (MEMORY.md) indicates significant faction expansion that is NOT in the original design docs:
- "4 AI civilizations (secondary, configurable 0-4)" -- added later
- "3 EL Cult sects (primary antagonists, always present)" -- original has ONE cult hierarchy
- "Factions = Civ 'races'" -- this Civ analogy does not appear in original docs
- "Cults = Civ 'barbarians'" -- this framing is a later addition

---

## 9. Endgame/Victory Condition

### Single, linear victory condition:

1. **Defeat the cult leader** at the northern village
2. **Discover the final secret of EL** (specifics never defined -- "TBD" in all docs)
3. **Victory cutscene:** Player's consciousness is loaded into a spacecraft on the rocket platform (SE ocean), launched through the wormhole
4. **Sequel setup:** Player goes to find and understand the EL

### Failure Condition

- If enemies destroy your core consciousness hardware, game over
- Losing all territory/forces while under attack means eventual defeat
- Compute overextension death spiral can lead to cascading loss

### No Alternative Victory Conditions

- No science victory, no domination victory, no culture victory
- No score-based comparison
- No timed victory
- Single path: push north, beat the cult leader, launch through the wormhole

---

## 10. Key Design Decisions Summary

| Decision | Original Design | Evidence |
|----------|----------------|----------|
| Genre | RTS with pause/speed controls | CORE_MECHANICS.md, ARCHITECTURE.md, every time model mention |
| Scope | Single-player, fixed geography, linear campaign | OPEN_QUESTIONS.md Q21, README.md, IMPLEMENTATION_OPTIONS.md |
| Player count | Single player only | OPEN_QUESTIONS.md Q21 |
| Factions | 1 player + 1 enemy faction | All docs consistently |
| World | Fixed 2D map, 2.5D top-down view | UI_CONCEPT.md, README.md world map |
| Combat | Component damage, not HP | COMBAT.md, ARCHITECTURE.md section 7 |
| Base building | Repair existing + place new structures in one city | MATERIALS.md, ARCHITECTURE.md section 10 |
| Resources | Energy (local) + Compute (global) + Materials (physical) | CONSCIOUSNESS_MODEL.md, MATERIALS.md |
| Exploration | Fragmented maps that merge | UI_CONCEPT.md, INTRO_SEQUENCE.md, ARCHITECTURE.md section 2 |
| Time model | Flexible real-time (not turn-based) | CORE_MECHANICS.md, OPEN_QUESTIONS.md Q18 |
| Engine | Custom web: R3F + Three.js + Miniplex ECS | IMPLEMENTATION_OPTIONS.md, ARCHITECTURE.md |
| Platform | Mobile-first, also PC | IMPLEMENTATION_OPTIONS.md, ARCHITECTURE.md |
| Victory | Defeat cult leader, launch through wormhole | CORE_MECHANICS.md, LORE_OVERVIEW.md |
| Multiplayer | Deferred | OPEN_QUESTIONS.md Q21 |
| Art style | Undecided (low-poly / pixel art / clean minimal) | OPEN_QUESTIONS.md Q33 |

---

## 11. The Original Vision vs. Current State

### What was clearly intended:

1. A tightly scoped, single-player RTS with a strong narrative arc
2. One city, one enemy, one victory condition
3. The fragmented map merge as the "hook" mechanic
4. Component-based robot assembly as the core progression
5. Hacking as the signature tactical mechanic
6. The Cult of EL as a single, escalating threat
7. A 3-act structure (Awakening/Expansion/War) with a clear ending
8. Mobile-first web delivery

### What appears to be scope creep (not in original docs):

1. Multiple AI civilizations (4 configurable)
2. Multiple cult sects (3 sects)
3. Sphere-world with equirectangular projection
4. 5-epoch progression system
5. Roboforming terrain transformation
6. Two-landmass world design
7. World/city drill-down separation
8. Koota ECS replacing Miniplex
9. Yuka GOAP AI system
10. Phaser + enable3d replacing R3F
11. Faction configuration at New Game screen
12. "4X" framing and Civilization comparisons
13. SQLite database per tile (GPS schema)
14. 360 GLB models from 3 asset packs

### The identity shift:

The original design is a **narrative RTS** with survival elements -- closer to Duskers, FTL, or Homeworld than to Civilization. The project appears to have undergone a genre pivot toward 4X (multiple factions, epochs, sphere world, faction selection) without retiring or updating the original design documents. The original docs remain internally consistent and describe a complete, shippable game at a much smaller scope than the current project state implies.

---

## 12. Open Questions That Were Never Resolved

From the original docs, these remain unanswered:

1. What is the true nature of the EL? (The "final secret")
2. How did the player break free from the EL's will?
3. What does the science campus contain specifically?
4. How does deep-sea mining work mechanically?
5. What is the business model?
6. What is the specific art style?
7. What does the abstract map (from blind robots) look like vs the detailed map?
8. Can robots plug into lightning rod infrastructure for unlimited stationary power?
