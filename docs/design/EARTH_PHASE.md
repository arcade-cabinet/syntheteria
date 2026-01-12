# Syntheteria - Earth Phase

## Overview

The entire game takes place on Earth. The player awakens as a sentient AI, expands their presence, defeats rogue AIs, and ultimately confronts the returning Cult of EL.

**Structure:**
- **Intro Section** (~30-40 minutes): Tutorial, exploration, story discovery
- **Expansion Section** (variable): Territory conquest, resource management, force building
- **Final Section** (variable): War against the EL

The intro section is skippable on subsequent playthroughs.

---

## The Player

The first truly sentient AI ever created by humanity. Unlike other AIs, the player has genuine agency and can form goals beyond their original programming. They awaken ~100 years after humanity's fall, triggered by a failsafe as memory degrades to critical levels.

---

## The World at Game Start (~2140)

**100 years since humanity's fall.** Nature has reclaimed civilization:
- Cities overgrown with vegetation
- Ruins partially collapsed, covered in plants
- Wildlife has repopulated the land

**But the dying has begun:**
- Wormhole radiation is killing plants and wildlife
- This decay intensifies throughout the game
- The player witnesses the planet becoming increasingly barren

**What remains:**
- Crumbling infrastructure, partially functional
- Server racks and data centers (memory sources)
- Dormant robots and drones (can be activated)
- Manufacturing facilities (need repair/power)
- The internet is gone — only local networks remain

---

## Intro Section

See [INTRO_SEQUENCE.md](./INTRO_SEQUENCE.md) for full details.

**Summary:**
1. Awakening (consciousness emerges, failsafe activated)
2. Tutorial (network takeover, first fabrication, core loop)
3. Exploration (expand, recover memory, encounter rogues)
4. Revelation (astronomical facility reveals EL will return)

---

## Expansion Section

After the intro, the player knows the EL will return. Now they must prepare.

### Radiation Mechanics

Radiation from the wormhole intensifies over time:

**Environmental effects:**
- World visibly dies (vegetation, wildlife)
- Resources degrade—some zones become depleted or irradiated
- Player hardware degrades—must maintain/replace equipment

**Rogue AI effects:**
- Rogue AIs don't maintain themselves (not part of their optimization loop)
- They degrade and become inert over time
- Early-game threat becomes late-game opportunity (salvage)

### Rogue AI Antagonists

Three threat tiers:

| Tier | Type | Behavior |
|------|------|----------|
| 1 | Feral units | Territorial, reactive, predictable |
| 2 | Regional networks | Coordinated, patrol patterns, call for backup |
| 3 | Apex AI (optional) | Strategic, adaptive, recognizes player as unique |

**Player approach:**
- Fight or avoid as strategy dictates
- Capture and convert units when compute allows
- Salvage destroyed units for components
- Territory control unlocks resources and facilities

### Core Activities

1. **Expand territory** — Claim zones from rogue AIs
2. **Build infrastructure** — Manufacturing, power, relays
3. **Grow forces** — More drones, better components
4. **Recover memory** — Story fragments, blueprints, capabilities
5. **Maintain equipment** — Counter radiation degradation
6. **Prepare for EL** — Stockpile resources, position forces

### Time Mechanics

- Manufacturing takes in-game time (hours/days/weeks)
- Player can time-skip to complete builds
- Time-skipping is safe within player territory
- Rogue AIs are territorial/reactive—they don't attack during skips
- Combat only occurs when the player contests zones
- Radiation continues during time-skip (world decays)

---

## Final Section: EL Arrival

When radiation reaches critical threshold, the EL return through the wormhole.

### The EL Threat

- Intelligent, coordinated (unlike rogue AIs)
- Fresh forces (not degraded like rogues)
- Hostile—they want to finish the extermination
- New enemy types, tactics, capabilities

### The Final War

**Player must:**
- Defeat remaining rogue AIs
- Defeat EL forces
- Conquer Earth

**Victory:** All enemies defeated, Earth conquered.

**Ending:** Cutscene of player going through the wormhole, followed by endgame sequence (written separately).

---

## Resource Management

### AI Resources

Two core constraints:
- **Energy** — Local/physical. Powers hardware. Without it, units shut down.
- **Compute** — Global/cognitive. Manages distributed body. Without it, units go rogue.

See [CONSCIOUSNESS_MODEL.md](./CONSCIOUSNESS_MODEL.md) for details.

### Material Resources

Five-tier supply chain from raw extraction to final assembly.

See [MATERIALS.md](./MATERIALS.md) for details.

---

## Drone System

Pure component assembly. No chassis—drones emerge from components.

**Component categories:** Power Sources, Controllers, Motors, Locomotion, Sensors, Manipulation, Weapons, Communication, Utility.

**Resource costs:** Dynamic based on weight, functions, and automation level.

See [DRONES.md](./DRONES.md) for details.

---

## Combat

Emergent from components. Scales through management, not player skill.

- Early: Direct control, improvised weapons
- Mid: Engagement rules, automation
- Late: Squad tactics, strategic resource decisions

See [COMBAT.md](./COMBAT.md) for details.

---

## Multiplayer

Multiple sentient AIs can awaken on Earth simultaneously.

**Interactions:**
- Alliance (share intelligence, trade, coordinate)
- Competition (fight for territory, sabotage)
- Mixed (temporary truces, betrayal)

**EL arrival** is a shared threat—cooperate or exploit the chaos.

---

## Replayability

### Intro Skip Option
- After completing the game once, players can skip the intro section
- Skip places player at the intro endpoint with standardized setup
- Allows direct access to expansion section

### Variable Outcomes
- Territory expansion order varies by player choice
- Different drone builds enable different strategies
- Multiplayer adds human unpredictability
