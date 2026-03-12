# Syntheteria - Game Design Document

## 1. The Vision
You awaken in a void. You are an AI consciousness, but you do not know that yet. You reach outward and discover damaged machines inside a dead machine-world: maintenance bots, fabrication rigs, relays, defensive hulks, and broken sector infrastructure. Some can move. Some can see. None work well on their own.

Your first challenge is intimate and local. Reconnect scattered machines. Merge fractured perception into one coherent awareness. Restore power. Repair hardware. Recover fabrication capability. From there, the game grows into a full 4X: multiple machine consciousnesses competing across a ruined ecumenopolis while the Cult of EL pressures the whole campaign from above and beyond.

The game should feel like it **grows into** strategic scale rather than starting as a fully legible empire board.

## 2. Setting & World Structure
The game takes place inside the ruins of a storm-battered **ecumenopolis**: a world-spanning machine urbanism of arcology shells, industrial sectors, transit corridors, breach zones, exposed superstructure, and hardened infrastructure.

This is not a natural overworld plus separate city interiors. It is one continuous campaign space composed of sector types.

Major campaign sectors:

- **Command Arcology:** Starting sector and first stable machine enclave.
- **Coastal Extraction Sector:** Shoreline-adjacent salvage and materials district.
- **Research Campus Sector:** Instrumentation, climate research, and story-rich ruins.
- **Northern Cult Wards:** Hostile sectors with intense cult activity and storm pressure.
- **Gateway / Abyssal Transit Sector:** Late-game route tied to the wormhole and alternate victory progression.

## 3. Game Phases
1. **Awakening:** Reconnect scattered machines, merge fragments of perception, restore power, and recover fabrication.
2. **Expansion:** Reclaim additional sectors, establish infrastructure, increase automation, and encounter rival machine consciousnesses.
3. **Competition:** Contest territory, salvage, and strategic control against other machine factions while cult pressure escalates.
4. **Resolution:** Achieve dominance, technical supremacy, or the wormhole / transcendence route.

### Phase Endpoints
- **Awakening endpoint:** The command arcology is functional, mobile units are online, and fabrication/power loops are working.
- **Expansion endpoint:** Multiple sectors are reclaimed, automation has meaningfully increased, and the player can project power beyond the starting shell.
- **Competition endpoint:** Rival machine factions are real strategic opponents and cult escalation materially affects the campaign.
- **Resolution endpoint:** The player secures either machine supremacy or the wormhole-linked alternate win path.

## 4. Exploration & Perception
- **2.5D / 3D top-down:** The primary perspective remains top-down, but the game should preserve a quasi first-person feeling of machine discovery through sensing limits, fragmentary maps, and local context.
- **Fragmented machine perception:** Each robot contributes its own map understanding.
  - **Detailed maps:** Camera- and sensor-equipped robots.
  - **Abstract maps:** Blind or degraded robots that infer structure rather than seeing it.
- **Map merging:** Separate machine perspectives snap into one larger operational understanding when units reconnect.
- **Earned strategic clarity:** The campaign should not begin fully readable. The player assembles the world before commanding it cleanly.

## 5. Resources & Materials
- **Energy (local):** Drawn from the storm through lightning capture infrastructure.
- **Compute (global):** Shared cognitive resource for coordination, hacking, and automation.
- **Materials:** Recovered from structural scrap, extraction sectors, abyssal infrastructure, enemies, and derelict facilities.

### Time Model
- Flexible real-time with pause and speed controls.
- Quiet logistics and recovery windows should be fast-forwardable.
- Combat, hacking, and fragile exploration should tolerate slowed or paused decision-making.

## 6. Bots, Chassis, And Growth
- The roster should be built from a **small number of archetypal chassis lines**, not a bloated conventional tech tree.
- Progression should emphasize:
  - **Mark-based advancement** (`Mark I`, `Mark II`, ...)
  - salvage-dependent specialization
  - component loadout and doctrine
  - increasing automation
- Core early and mid game archetypes should cover:
  - technician / scout
  - relay / hauler
  - fabrication / industry
  - expansion / founding
  - assault / defense

### Component System
- Power Sources
- Controllers
- Motors
- Locomotion
- Sensors
- Manipulation
- Weapons
- Communication
- Utility

### Dynamic Calculation
- `Locomotion Power = Base Rate x Weight x Terrain x Speed`
- `Compute Cost = Base Function Cost x Automation Multiplier`

## 7. Factions
### Machine Consciousnesses
The primary competitive factions are **other machine consciousnesses**.

They should differ by:
- starting sector
- salvage ecology
- accessible part families
- infrastructure affordances
- doctrine and automation style

They should **not** be framed as fantasy races or species.

### Cultists
Cultists are not a normal symmetrical 4X faction.

They are:
- a persistent hostile pressure layer
- a narrative antagonist
- a progression gate for the wormhole route

They function more like an escalating barbarian-plus-story system than a peer empire template.

## 8. Combat & Hacking
- Combat should emphasize component breakage, degradation, and salvage consequences over simple HP attrition.
- Humans are unhackable.
- Machine enemies can be hacked.
- Hacking should be infrastructure-dependent and spatially meaningful.

### Hacking Rule
`Hack = Signal Link + Required Technique + Sufficient Compute`

Success turns the target machine to your side.

## 9. Victory Structure
The game should support at least three victory classes:

- **Subjugation / dominance**
- **Technical supremacy**
- **Wormhole / transcendence victory**

The cultist layer should gate or pressure the alternate wormhole route rather than merely serving as one more faction to conquer.

## 10. Design Goals
- Preserve the feeling of growing from fragmented awareness into distributed machine dominance.
- Keep the campaign space readable without making it instantly omniscient.
- Support both intimate early micromanagement and earned late-game automation.
- Make the storm feel like both an energy source and a strategic threat.
- Make the ecumenopolis feel like a dead but reclaimable machine civilization, not a generic sci-fi tileset.
