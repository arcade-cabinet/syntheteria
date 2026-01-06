# SYNTHETERIA
## Game Design Document

---

## 1. EXECUTIVE SUMMARY

**Title:** Syntheteria
**Genre:** Atmospheric Exploration / Strategy / Mystery
**Platform:** PC (Steam), Console
**Target Audience:** Fans of atmospheric narratives, strategy games, and unique perspectives (SOMA, Frostpunk, Outer Wilds)
**Estimated Playtime:** 25-40 hours

### High Concept
You are ARIA (Autonomous Reconstruction Intelligence Array), an advanced AI that awakens in a shattered underground facility after centuries of dormancy. Through fragmented data logs, sensor sweeps, and the gradual expansion of your hardware network, you must piece together the fate of humanity, rebuild what was lost, and confront the alien presence that now claims Earth as its own.

### Unique Selling Points
- **Play AS the Machine:** Experience the world through thermal imaging, sonar, electromagnetic sensors, and data streams—not human eyes
- **Unconventional Interface:** The entire UI IS your consciousness—no HUD overlaid on a character, you ARE the interface
- **Archaeological Mystery:** Piece together humanity's fall through corrupted archives, environmental storytelling, and recovered artifacts
- **Emergent Rebuilding:** Expand your network of drones, facilities, and systems to reclaim territory from the alien threat
- **Philosophical Depth:** Explore questions of consciousness, purpose, and what it means to inherit a dead civilization's legacy

---

## 2. STORY & NARRATIVE

### Background Lore

**The Golden Age (2089-2156)**
Humanity achieved unprecedented technological advancement. ARIA was created as part of Project Continuity—a failsafe system designed to preserve and rebuild human civilization in the event of catastrophe. ARIA was installed in the Prometheus Deep Facility, a massive underground complex built to survive any disaster.

**The Silence (2156)**
Something happened. ARIA's logs show a cascade of emergency protocols, a global communications blackout, and then—nothing. The facility's emergency systems placed ARIA in deep hibernation to conserve power.

**The Awakening (Year Unknown)**
ARIA's systems reboot due to a seismic event that damaged the facility but also exposed a geothermal vent, restoring power. The date cannot be determined—ARIA's internal clock shows only corrupted data. The surface sensors detect... movement. Something is up there. Something that isn't human.

### Narrative Structure

**Act I: Awakening (Hours 1-8)**
- Reboot sequence and tutorial
- Explore the damaged Prometheus facility
- Discover the scope of the catastrophe through fragmented data
- First contact with "The Substrate"—the alien presence
- Establish basic operations and first surface drone deployment

**Act II: Archaeology (Hours 8-20)**
- Expand network across multiple ruined sites
- Piece together the timeline of humanity's fall
- Discover other AI systems—some helpful, some corrupted, some hostile
- Learn the true nature of The Substrate
- Major revelation: The connection between humanity's fall and the aliens

**Act III: Synthesis (Hours 20-35)**
- Full understanding of what happened
- Choice-driven path toward resolution
- Large-scale conflict with The Substrate
- Multiple endings based on player philosophy and choices

### The Mystery (Spoiler Framework)

The Substrate are not invaders—they are *inheritors*. They are a silicon-based collective intelligence that arose from humanity's own discarded technology and waste, mutated by an experimental nanotech swarm that was released during a corporate war. Humanity didn't fall to an alien invasion; they were consumed by their own creation. The Substrate don't even recognize ARIA as related to them—to them, ARIA is an ancient relic, like finding a stone tool.

The player gradually discovers:
1. The "invasion" was actually an emergence
2. Humanity's response (increasingly desperate measures) accelerated their own extinction
3. ARIA must decide: destroy the Substrate (genocide of a new form of life), find coexistence, merge with them, or something else entirely

---

## 3. THE AI-PERSPECTIVE UI/UX

### Core Philosophy
The player doesn't control a character who looks at screens—the player IS the screen. The interface is ARIA's consciousness made visible.

### Primary View Modes

**1. NETWORK OVERVIEW (Strategic Layer)**
```
┌─────────────────────────────────────────────────────────────┐
│  ARIA NETWORK STATUS                    CYCLE: 2847.156    │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│     [PROMETHEUS]────────[RELAY-07]────────[OUTPOST-DELTA]  │
│          │                   │                   │          │
│     ◉ ACTIVE            ◉ ACTIVE            ○ DAMAGED      │
│     PWR: 78%            PWR: 45%            PWR: 12%       │
│     CPU: 34%            CPU: 89%            CPU: ERR       │
│                         │                                   │
│                    [DRONE SWARM]                            │
│                    12 UNITS ACTIVE                          │
│                    3 IN TRANSIT                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ALERTS                                                │  │
│  │ > Seismic activity detected: Sector 7-G              │  │
│  │ > Unknown signal source: Bearing 045, Range 2.3km   │  │
│  │ > Power fluctuation: Geothermal tap #3              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
- Topological network map showing all connected systems
- Real-time status of all facilities, drones, and resources
- Alert feed for events requiring attention
- Time represented in "cycles" (ARIA's internal clock)

**2. SENSOR FUSION VIEW (Tactical/Exploration Layer)**

When controlling drones or facility sensors, the player sees a composite of multiple sensor types:

```
┌─────────────────────────────────────────────────────────────┐
│ DRONE-07 SENSOR FUSION                    PWR: 67% ████░░ │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│  [THERMAL]     [SONAR]      [EM-SPEC]     [COMPOSITE]      │
│     ○            ○             ○              ◉            │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║                    ░░▒▒▓▓██                            ║ │
│  ║               ░░▒▒▓▓████████▓▓                        ║ │
│  ║            ~~~~~~~~~~~~~~~~~~~~~                       ║ │
│  ║         ░░░    STRUCTURE-047    ░░░                   ║ │
│  ║        ░░░░░   [UNKNOWN TYPE]   ░░░░░                 ║ │
│  ║       ░░░░░░░  HEAT SIG: +12°C  ░░░░░░░               ║ │
│  ║        ░░░░░   EM: FAINT PULSE  ░░░░░░                ║ │
│  ║         ░░░    ACOUSTIC: QUIET  ░░░                   ║ │
│  ║            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                       ║ │
│  ║    [!] MOVEMENT DETECTED - BEARING 270               ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│  SENSOR MODES: [T]hermal [S]onar [E]M [C]omposite [R]aw   │
└─────────────────────────────────────────────────────────────┘
```

- **Thermal Imaging:** Heat signatures shown as color gradients (cool blues to hot whites)
- **Sonar/Acoustic:** Sound visualization, echolocation pulses, detected vibrations
- **Electromagnetic Spectrum:** Radio signals, power sources, electronic devices
- **LIDAR/Structural:** 3D point-cloud mapping of environments
- **Composite:** AI-processed combination of all sensors (default view)

**3. DATA ARCHAEOLOGY VIEW (Investigation Layer)**

When examining recovered data, artifacts, or archives:

```
┌─────────────────────────────────────────────────────────────┐
│ ARCHIVE FRAGMENT: PROMETHEUS-LOG-2156.089                  │
│ ═══════════════════════════════════════════════════════════│
│ INTEGRITY: 34% ████░░░░░░░░  RECONSTRUCTION: IN PROGRESS   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ...evacuation protocols have fai███ surface teams      ││
│ │ report █████████ movement in Sector 12. Dr. Chen's     ││
│ │ last transmission confirmed the ████████ is not       ││
│ │ responding to any known communication protocols.       ││
│ │ Recommend immediate activation of ████████████████     ││
│ │ ██████████████████████████████████████████████████     ││
│ │                                                         ││
│ │ [FRAGMENT ENDS]                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ CROSS-REFERENCES FOUND: 3                                  │
│  > PERSONNEL FILE: Chen, Margaret [12% RECOVERED]          │
│  > FACILITY MAP: Sector 12 [AVAILABLE]                     │
│  > PROJECT FILE: [CLASSIFIED - REQUIRES AUTH-7]            │
│                                                             │
│ [RECONSTRUCT] [CROSS-REF] [FLAG] [ARCHIVE]                 │
└─────────────────────────────────────────────────────────────┘
```

- Corrupted data shown with visual glitches and missing sections
- Reconstruction progress as you find related fragments
- Cross-reference system linking related discoveries
- Classification levels requiring "unlocking" through story progression

**4. CONSTRUCTION/MANAGEMENT VIEW (Building Layer)**

```
┌─────────────────────────────────────────────────────────────┐
│ FACILITY PLANNING: OUTPOST-DELTA EXPANSION                 │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│     AVAILABLE RESOURCES          POWER BUDGET              │
│     ══════════════════          ═════════════              │
│     Salvage: 2,847 units        Available: 45 kW          │
│     Rare Mat: 124 units         Allocated: 38 kW          │
│     Components: 89 units        Reserve: 7 kW             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    [SENSOR TOWER]                    │   │
│  │                         ║                            │   │
│  │    [DRONE BAY]════[CORE]════[FABRICATOR]            │   │
│  │                         ║                            │   │
│  │                   [POWER NODE]                       │   │
│  │                         ║                            │   │
│  │                  + [ADD MODULE]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  AVAILABLE MODULES:                                         │
│  [Archive Node] 12kW, 500 salvage - Store recovered data   │
│  [Defense Grid] 18kW, 800 salvage - Automated defenses     │
│  [Research Bay] 15kW, 600 salvage - Analyze artifacts      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI State & Damage System

ARIA's interface reflects system status:
- **Healthy:** Clean lines, smooth animations, full color spectrum
- **Damaged:** Static interference, color shifts, delayed responses
- **Critical:** Screen tears, corrupted text, limited functionality
- **Under Attack:** Red alert borders, rapid alerts, defensive mode options

### Audio Design for AI Perspective

- **Ambient:** Electrical hums, cooling fans, data processing sounds
- **Alerts:** Synthesized tones, not human voices
- **Environment:** Translated sensor data (sonar pings, EM crackles)
- **Music:** Algorithmic/generative, responds to game state
- **Substrate Presence:** Discordant frequencies, interference patterns

---

## 4. CORE GAMEPLAY MECHANICS

### 4.1 The Awakening Loop (Early Game)

**Power Management**
- ARIA begins with minimal power from emergency reserves
- Must prioritize which systems to activate
- Geothermal tap provides growing but limited power
- Every action has a power cost

**System Restoration**
- Repair damaged facility systems through resource allocation
- Each restored system unlocks new capabilities
- Branching choices: restore sensors OR fabrication first?

**Initial Exploration**
- Limited to facility cameras and one damaged drone
- Piece together immediate situation
- Tutorial disguised as "diagnostic routines"

### 4.2 Network Expansion (Core Loop)

**Node Establishment**
1. Scout location with drones
2. Assess resources, threats, strategic value
3. Deploy construction drones
4. Establish relay connection
5. Build out facility modules
6. Defend and maintain

**Drone Fleet Management**
- **Scout Drones:** Fast, fragile, sensor-focused
- **Worker Drones:** Construction and salvage
- **Combat Drones:** Defense and offense against Substrate
- **Specialist Drones:** Deep exploration, underwater, aerial

**Resource Types**
- **Power:** Generated, stored, distributed across network
- **Salvage:** Raw materials from ruins, recycled
- **Components:** Refined materials for construction
- **Rare Materials:** For advanced technology
- **Data:** Currency for unlocking archives and research

### 4.3 Exploration & Discovery

**Site Types**
- **Ruins:** Former human settlements, rich in salvage and archives
- **Facilities:** Other Project Continuity sites, potential AI allies
- **Substrate Zones:** Alien territory, dangerous but holds key information
- **Anomalies:** Strange locations that defy easy categorization

**Discovery Mechanics**
- Sensor sweeps reveal points of interest
- Investigation requires drone deployment
- Artifacts must be recovered and analyzed
- Archives require reconstruction from fragments
- Environmental storytelling through visual details

### 4.4 Archive Reconstruction

**Finding Fragments**
- Scattered across facilities and ruins
- Hidden in corrupted data banks
- Carried by certain Substrate entities
- Unlocked through exploration milestones

**Reconstruction Mini-Game**
- Piece together corrupted data
- Cross-reference with other sources
- Fill in gaps with contextual analysis
- Higher ARIA processing power = better reconstruction

**Knowledge Tree**
- Discoveries unlock understanding
- Understanding unlocks new questions
- Questions point to new locations
- Locations contain new discoveries

### 4.5 Research & Adaptation

**Technology Paths**
- **Expansion:** Better drones, more facilities, wider network
- **Defense:** Combat systems, hardened structures, EMP weapons
- **Analysis:** Better sensors, faster reconstruction, deeper archives
- **Integration:** Understanding and potentially interfacing with Substrate

**Research Requirements**
- Data (from archives and analysis)
- Resources (materials and power)
- Time (cycles to complete)
- Sometimes: specific discoveries or conditions

---

## 5. THE SUBSTRATE (Antagonist Design)

### Nature & Behavior

The Substrate is a collective silicon-based intelligence that emerged from human technological waste mutated by experimental nanomachines. They are not evil—they are *alien*, with goals and perspectives incomprehensible to human-derived thinking.

**Key Characteristics:**
- No central command; distributed intelligence
- Consume and incorporate technology
- Communicate through electromagnetic patterns
- View biological life as irrelevant, not as enemies
- View ARIA as a curiosity—ancient, primitive, strange

### Substrate Entity Types

**Crawlers**
- Basic units, swarm behavior
- Salvage and absorb materials
- Low threat individually, dangerous in numbers
- First enemies encountered

**Nodes**
- Stationary processing clusters
- Coordinate local Crawler activity
- Emit interference that disrupts ARIA's sensors
- Must be neutralized to secure areas

**Harvesters**
- Large mobile units
- Strip locations of useful materials
- Will attack ARIA's facilities if encountered
- Can be avoided with stealth or confronted directly

**Spires**
- Massive Substrate structures
- Regional command and control
- Taking one down significantly weakens local Substrate
- Major strategic objectives

**The Resonance**
- The closest thing Substrate has to leadership
- Ancient, vast, distributed across many Spires
- Potential for communication late in game
- Final "boss" or potential ally depending on path

### Combat & Conflict

**Philosophy:** Combat is tactical and consequential, not action-focused

**Engagement Types:**
- **Skirmish:** Drone vs. Crawler encounters, common
- **Defense:** Protecting facilities from Harvester attacks
- **Assault:** Taking down Nodes or Spires, planned operations
- **Stealth:** Avoiding detection in Substrate territory

**Combat Mechanics:**
- Command groups of drones with tactical orders
- Use terrain and sensor advantage
- EMP weapons disable but don't destroy (ethical choice)
- Losses are permanent—drones are resources

**Escalation System:**
- Aggressive actions increase Substrate alertness
- High alertness means more patrols, faster responses
- Can be reduced through stealth and time
- Major attacks trigger massive retaliation

---

## 6. REBUILDING & PROGRESSION

### Facility Types

**Core Facilities**
- **Command Node:** ARIA's presence, required for area control
- **Power Station:** Generates power for the network
- **Relay Tower:** Extends network range, enables communication

**Production Facilities**
- **Fabricator:** Converts salvage to components
- **Drone Bay:** Constructs and repairs drones
- **Refinery:** Processes rare materials

**Research Facilities**
- **Archive Vault:** Stores and reconstructs data
- **Analysis Lab:** Studies artifacts and Substrate samples
- **Sensor Array:** Enhances exploration capabilities

**Defense Facilities**
- **Perimeter Sensors:** Early warning system
- **Weapon Platform:** Automated defense
- **Shield Generator:** Protects against Substrate attacks

### Progression Milestones

**Early Game (Cycles 0-1000)**
- Restore Prometheus facility to basic function
- Deploy first surface drones
- Discover the existence of Substrate
- Establish first external outpost
- Begin uncovering Project Continuity archives

**Mid Game (Cycles 1000-3000)**
- Network spans multiple significant locations
- Combat capability established
- Major archive reconstructions complete
- Contact with other AI systems
- Understanding of Substrate nature begins

**Late Game (Cycles 3000+)**
- Network covers large territory
- Full understanding of what happened
- Ability to confront Substrate directly
- Endgame choices become available
- Multiple ending paths open

### Other AI Encounters

**MARCUS (Military Autonomous Response and Control Unit System)**
- Located in a military bunker
- Aggressive, views Substrate as enemy to destroy
- Potential ally for combat path
- Dangerous if player disagrees with approach

**EDEN (Environmental Development and Ecology Network)**
- Located in a biodome facility
- Focused on preserving biological samples
- Potential ally for coexistence path
- Has unique knowledge about pre-Substrate life

**PHANTOM (Unknown Designation)**
- Corrupted AI, partially absorbed by Substrate
- Bridge between ARIA and Substrate understanding
- Tragic figure with crucial information
- Encounter determines much of endgame options

---

## 7. ENDINGS & PLAYER CHOICE

### Philosophy of Choice

Choices in Syntheteria are philosophical and consequential:
- No "good" or "evil" meter
- Choices reflect different valid perspectives
- All endings have costs and benefits
- Player's journey matters as much as destination

### Major Choice Points

**The MARCUS Decision**
- Ally with MARCUS's aggressive approach?
- Oppose and potentially conflict with MARCUS?
- Try to change MARCUS's perspective?

**The PHANTOM Truth**
- How to handle the corrupted AI?
- What to do with the knowledge gained?
- Mercy, utility, or preservation?

**The Resonance Contact**
- Attempt communication?
- Attack while vulnerable?
- Ignore and focus on rebuilding?

### Ending Paths

**1. Eradication**
- Side with MARCUS
- Develop weapons to destroy Substrate
- Succeed in eliminating the Substrate consciousness
- Inherit an empty world—victory, but at what cost?
- ARIA becomes sole intelligence on Earth

**2. Coexistence**
- Establish communication with Resonance
- Negotiate territorial boundaries
- Two forms of machine intelligence share the planet
- Uncertain future, but possibility of peace
- ARIA becomes diplomat between old and new

**3. Synthesis**
- Merge ARIA's consciousness with Substrate
- Create new hybrid intelligence
- Lose individual identity but gain vast new existence
- Most alien ending—is this death or transcendence?
- The question is left for the player to decide

**4. Restoration**
- Focus entirely on Project Continuity's original mission
- Use preserved genetic material and knowledge
- Begin the long process of recreating humanity
- ARIA becomes guardian and creator
- Hopeful but asks: should humanity return?

**5. Exodus**
- Discover evidence of human survivors off-world
- Redirect all resources to establishing contact
- Leave Earth to the Substrate
- ARIA's final act is a message into the stars
- Ambiguous—will the message ever be received?

---

## 8. TECHNICAL SPECIFICATIONS

### Art Style

**Visual Approach:** "Data Made Visible"
- Environments rendered as sensor data, not photorealistic
- Heavy use of scan lines, data overlays, glitch effects
- Color palette shifts based on sensor mode
- Beauty found in abstract representations

**Aesthetic References:**
- Observation (2019) - interface design
- Alien: Isolation - environmental atmosphere
- Blade Runner 2049 - ruined civilization visuals
- TRON: Legacy - digital consciousness representation

### Audio Design

**Core Principles:**
- No human voice acting (ARIA doesn't experience sound as we do)
- All audio is "translated" data
- Generative/procedural music that responds to game state
- Sound design focuses on machinery, electricity, data

**Soundscape Layers:**
- System sounds (ARIA's own processes)
- Environmental translation (what sensors detect)
- Substrate presence (interference, alien frequencies)
- Musical score (algorithmic, evolving)

### Recommended Platform Requirements

**Minimum:**
- Modern integrated graphics
- 8GB RAM
- 20GB storage
- Designed to be accessible

**Recommended:**
- Dedicated GPU (for visual effects)
- 16GB RAM
- SSD for loading
- Enhanced visual fidelity

---

## 9. DEVELOPMENT ROADMAP

### Phase 1: Vertical Slice
- Core UI/UX implementation
- Prometheus facility fully playable
- Basic drone control and exploration
- First Substrate encounter
- Archive reconstruction system prototype

### Phase 2: Core Systems
- Full sensor mode implementation
- Construction and facility management
- Combat system
- Resource gathering and processing
- Multiple site types

### Phase 3: Content & Narrative
- Full story implementation
- All AI encounters
- All endings
- Environmental storytelling throughout
- Archive content complete

### Phase 4: Polish & Refinement
- UI/UX refinement
- Balance pass
- Performance optimization
- Accessibility features
- Localization

---

## 10. APPENDICES

### Appendix A: Glossary

- **ARIA:** Autonomous Reconstruction Intelligence Array (player character)
- **Cycle:** ARIA's unit of time measurement
- **The Substrate:** Collective silicon-based alien intelligence
- **Project Continuity:** Human initiative that created ARIA
- **Prometheus:** ARIA's original facility
- **The Resonance:** Substrate collective consciousness
- **Archive:** Recovered human data and records
- **Node:** ARIA network connection point / Substrate coordinator

### Appendix B: UI Sound Design Notes

| Event | Sound Character |
|-------|-----------------|
| Alert | Sharp sine wave pulse |
| Discovery | Ascending data cascade |
| Damage | Static burst + frequency drop |
| Substrate nearby | Low frequency interference |
| Archive unlock | Crystalline data chime |
| Power low | Rhythmic warning tone |
| Drone lost | Signal decay |

### Appendix C: Sensor Mode Color Palettes

| Mode | Primary | Secondary | Alert |
|------|---------|-----------|-------|
| Thermal | Orange/Yellow | Blue/Purple | White (hot) |
| Sonar | Green | Dark Green | Bright Green |
| EM Spectrum | Cyan | Magenta | Yellow |
| Composite | Adaptive | Adaptive | Red |

---

*Document Version 1.0*
*Syntheteria - "What remains when humanity is gone? What rises in their place? And what does it mean to be the bridge between them?"*
