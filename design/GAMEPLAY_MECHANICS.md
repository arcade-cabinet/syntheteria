# SYNTHETERIA
## Gameplay Mechanics Design

---

## 1. CORE GAMEPLAY LOOPS

### 1.1 The Awakening Loop (Tutorial/Early Game)

**Objective:** Establish player understanding of being an AI

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BOOT SEQUENCE          SYSTEM DIAGNOSIS         FIRST ACTION  │
│        │                       │                       │        │
│        ▼                       ▼                       ▼        │
│   ┌─────────┐            ┌─────────┐            ┌─────────┐    │
│   │ Power   │───────────>│ Assess  │───────────>│ Choose  │    │
│   │ On      │            │ Damage  │            │ Priority│    │
│   └─────────┘            └─────────┘            └─────────┘    │
│        │                       │                       │        │
│        │                       │                       ▼        │
│        │                       │              ┌───────────────┐ │
│        │                       │              │ Restore       │ │
│        │                       │              │ Sensors  OR   │ │
│        │                       │              │ Fabrication   │ │
│        │                       │              └───────────────┘ │
│        │                       │                       │        │
│        └───────────────────────┴───────────────────────┘        │
│                            │                                    │
│                            ▼                                    │
│                    ENTER MAIN LOOP                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Sequence Details:**

1. **Boot Sequence (Cycle 0-5)**
   - Screen flickers to life
   - ARIA's consciousness "assembles" visually
   - Player watches as systems come online
   - Diagnostic text scrolls, establishing lore
   - First interaction: "Acknowledge" prompt

2. **System Diagnosis (Cycle 5-50)**
   - Tour of damaged Prometheus facility
   - Each system explained as player checks status
   - Power management introduced (limited reserves)
   - First discovery: emergency shutdown logs (story hook)

3. **Priority Choice (Cycle 50-100)**
   - Not enough power for everything
   - Choose: Restore sensors OR fabrication first
   - Teaches consequence: sensors = see more, fabrication = do more
   - Both paths viable, different early game experience

### 1.2 The Exploration Loop (Core Game)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│      DETECT              SCOUT              INVESTIGATE              │
│         │                  │                     │                   │
│         ▼                  ▼                     ▼                   │
│    ┌─────────┐       ┌─────────┐           ┌─────────┐              │
│    │ Sensor  │──────>│ Deploy  │──────────>│ Analyze │              │
│    │ Sweep   │       │ Drone   │           │ Site    │              │
│    └─────────┘       └─────────┘           └─────────┘              │
│         │                  │                     │                   │
│         │            [Encounter?]                │                   │
│         │                  │                     ▼                   │
│         │            ┌─────┴─────┐        ┌───────────┐             │
│         │            ▼           ▼        │ Resources │             │
│         │      ┌─────────┐ ┌─────────┐   │ Archives  │             │
│         │      │ Combat  │ │ Stealth │   │ Artifacts │             │
│         │      │ /Flee   │ │ /Avoid  │   └───────────┘             │
│         │      └─────────┘ └─────────┘         │                    │
│         │            │           │             │                    │
│         │            └─────┬─────┘             │                    │
│         │                  │                   │                    │
│         │                  ▼                   ▼                    │
│         │           ┌───────────┐       ┌───────────┐              │
│         │           │ Secure    │       │ Establish │              │
│         │           │ Area      │       │ Outpost   │              │
│         │           └───────────┘       └───────────┘              │
│         │                  │                   │                    │
│         └──────────────────┴───────────────────┘                    │
│                            │                                        │
│                            ▼                                        │
│                    NETWORK EXPANDS                                  │
│                    RETURN TO DETECT                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 The Mystery Loop (Narrative Driver)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   DISCOVER            RECONSTRUCT           UNDERSTAND               │
│      │                     │                     │                   │
│      ▼                     ▼                     ▼                   │
│  ┌─────────┐         ┌─────────┐           ┌─────────┐              │
│  │ Find    │────────>│ Piece   │──────────>│ New     │              │
│  │ Fragment│         │ Together│           │ Question│              │
│  └─────────┘         └─────────┘           └─────────┘              │
│      │                     │                     │                   │
│      │                     │                     │                   │
│      │                     │                     ▼                   │
│      │                     │              ┌───────────┐             │
│      │                     │              │ New       │             │
│      │                     │              │ Location  │             │
│      │                     │              │ Revealed  │             │
│      │                     │              └───────────┘             │
│      │                     │                     │                   │
│      └─────────────────────┴─────────────────────┘                   │
│                            │                                        │
│                            ▼                                        │
│                    STORY ADVANCES                                   │
│                    RETURN TO DISCOVER                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. RESOURCE SYSTEMS

### 2.1 Power Economy

Power is ARIA's lifeblood—everything requires it.

**Generation Sources:**
| Source | Output | Reliability | Notes |
|--------|--------|-------------|-------|
| Geothermal Tap | 50-100 kW | Very High | Initial source, expandable |
| Solar Array | 20-80 kW | Variable | Weather/time dependent |
| Wind Turbine | 15-45 kW | Variable | Location dependent |
| Salvaged Generator | 30-60 kW | Medium | Requires fuel |
| Fusion Cell | 200+ kW | Very High | Late game, rare materials |

**Consumption Categories:**
| System | Base Draw | Notes |
|--------|-----------|-------|
| ARIA Core | 10 kW | Always on, non-negotiable |
| Per Facility | 5-50 kW | Varies by type and size |
| Per Active Drone | 2-10 kW | Based on drone type |
| Sensors (passive) | 5 kW | Basic awareness |
| Sensors (active) | 15-30 kW | Deep scans |
| Combat Systems | 20-100 kW | Scales with intensity |
| Archive Processing | 10-25 kW | Reconstruction work |

**Power States:**
- **Surplus (>120%):** Can accelerate processes, full capability
- **Balanced (80-120%):** Normal operations
- **Strained (50-80%):** Non-essential systems throttled
- **Critical (20-50%):** Emergency mode, many systems offline
- **Failure (<20%):** ARIA enters hibernation, game over risk

### 2.2 Material Resources

**Primary Resources:**

| Resource | Source | Use | Storage |
|----------|--------|-----|---------|
| Salvage | Ruins, wreckage | Basic construction, processing | Unlimited |
| Components | Fabricated from salvage | Advanced construction | Limited |
| Rare Materials | Specific sites, Substrate | High-tech items | Very Limited |
| Data | Archives, artifacts | Research, story | Limited by storage |

**Salvage Types:**
- **Structural:** Metal, concrete, glass → Building materials
- **Electronic:** Circuits, chips, wiring → Components base
- **Mechanical:** Motors, gears, actuators → Drone parts
- **Chemical:** Fuels, chemicals, compounds → Special projects

**Processing Chain:**
```
SALVAGE (raw)
    │
    ▼ [Fabricator]
COMPONENTS (refined)
    │
    ▼ [Advanced Fabricator + Rare Materials]
ADVANCED COMPONENTS (specialized)
    │
    ▼ [Research Bay + Data]
PROTOTYPE TECH (unique)
```

### 2.3 Data as Resource

Data isn't just story—it's mechanical currency.

**Data Generation:**
- Archive fragment recovery: 10-100 data
- Site survey completion: 25-50 data
- Artifact analysis: 50-200 data
- Substrate sample study: 100-500 data

**Data Expenditure:**
- Research projects: 100-1000 data
- Archive reconstruction: 50-500 data
- AI negotiation/interaction: Variable
- Unlocking classified files: 200-2000 data

---

## 3. DRONE SYSTEM

### 3.1 Drone Types

**Scout Drone**
```
┌─────────────────────────────────────┐
│ SCOUT DRONE                         │
│ ═══════════════════════════════════│
│ Role: Reconnaissance               │
│ Speed: ████████░░ Fast             │
│ Armor: ██░░░░░░░░ Minimal          │
│ Sensors: ████████░░ Excellent      │
│ Cargo: ░░░░░░░░░░ None             │
│ Power: 2 kW                        │
│ Cost: 100 salvage, 20 components   │
│ ───────────────────────────────────│
│ Special: Stealth mode, long range  │
│ Weakness: Cannot defend self       │
└─────────────────────────────────────┘
```

**Worker Drone**
```
┌─────────────────────────────────────┐
│ WORKER DRONE                        │
│ ═══════════════════════════════════│
│ Role: Construction & Salvage       │
│ Speed: ████░░░░░░ Slow             │
│ Armor: ████░░░░░░ Light            │
│ Sensors: ████░░░░░░ Basic          │
│ Cargo: ████████░░ Large            │
│ Power: 4 kW                        │
│ Cost: 150 salvage, 30 components   │
│ ───────────────────────────────────│
│ Special: Build, repair, salvage    │
│ Weakness: Defenseless, slow        │
└─────────────────────────────────────┘
```

**Combat Drone**
```
┌─────────────────────────────────────┐
│ COMBAT DRONE                        │
│ ═══════════════════════════════════│
│ Role: Defense & Offense            │
│ Speed: ██████░░░░ Moderate         │
│ Armor: ██████░░░░ Medium           │
│ Sensors: ████░░░░░░ Tactical       │
│ Cargo: ██░░░░░░░░ Minimal          │
│ Power: 8 kW                        │
│ Cost: 300 salvage, 75 components   │
│ ───────────────────────────────────│
│ Weapons: Kinetic, EMP option       │
│ Special: Squad tactics             │
└─────────────────────────────────────┘
```

**Specialist Drones (Unlocked through Research):**

| Type | Role | Special Capability |
|------|------|-------------------|
| Deep Scout | Underground/underwater | Sonar focus, pressure resistant |
| Aerial | Air reconnaissance | Flight, wide-area survey |
| Heavy Combat | Assault | Heavy weapons, armor |
| Infiltrator | Substrate territory | Minimal EM signature |
| Mobile Lab | Field analysis | On-site artifact study |

### 3.2 Drone Commands

**Movement Commands:**
- **Move:** Direct point-to-point navigation
- **Patrol:** Cycle through waypoints
- **Follow:** Track another unit or target
- **Return:** Come back to nearest facility
- **Hold:** Stay position, maintain awareness

**Action Commands:**
- **Scan:** Detailed sensor sweep of area
- **Salvage:** Collect resources (Worker)
- **Build:** Construct designated structure (Worker)
- **Attack:** Engage hostile target (Combat)
- **Defend:** Protect location/unit (Combat)
- **Evade:** Stealth movement, avoid detection

**Group Commands:**
- **Formation:** Arrange selected drones
- **Coordinated Scan:** Multiple drones sweep efficiently
- **Combined Assault:** Focus fire tactics
- **Escort:** Protect designated unit

### 3.3 Drone Persistence

Drones are persistent entities:
- **Damage persists:** Must be repaired
- **Experience:** Drones gain minor bonuses over time
- **Loss is permanent:** No respawning, must build new
- **Naming:** Player can name drones, building attachment
- **Logs:** Each drone keeps activity log, adds to data

---

## 4. FACILITY SYSTEM

### 4.1 Facility Types

**Core Infrastructure:**

| Facility | Power | Cost | Function |
|----------|-------|------|----------|
| Command Node | 15 kW | 500/100 | ARIA presence, area control |
| Relay Tower | 8 kW | 300/50 | Extends network range |
| Power Plant | -50 kW | 800/150 | Generates power |
| Storage Depot | 5 kW | 200/40 | Increases material capacity |

**Production:**

| Facility | Power | Cost | Function |
|----------|-------|------|----------|
| Fabricator | 20 kW | 600/120 | Converts salvage to components |
| Drone Bay | 12 kW | 400/80 | Builds and repairs drones |
| Advanced Fab | 35 kW | 1200/300/20r | High-tier manufacturing |

**Research & Data:**

| Facility | Power | Cost | Function |
|----------|-------|------|----------|
| Archive Vault | 12 kW | 500/100 | Data storage, reconstruction |
| Research Bay | 25 kW | 800/150 | Technology research |
| Analysis Lab | 18 kW | 600/120 | Artifact and sample study |

**Defense:**

| Facility | Power | Cost | Function |
|----------|-------|------|----------|
| Sensor Tower | 10 kW | 300/60 | Early warning, extended sight |
| Defense Grid | 25 kW | 700/140 | Automated weapons |
| Shield Generator | 40 kW | 1000/200/10r | Area protection |

### 4.2 Facility Placement

**Constraints:**
- Must be within network range (relay chain)
- Terrain suitability (can't build on water, etc.)
- Power grid must support
- Some require specific conditions (geothermal near heat source)

**Strategic Considerations:**
- Chokepoints for defense
- Resource proximity for efficiency
- Concealment from Substrate
- Redundancy for resilience

### 4.3 Facility Upgrades

Each facility has upgrade paths:

```
FABRICATOR
    │
    ├──> Efficiency I (+20% output)
    │        │
    │        └──> Efficiency II (+40% output)
    │
    ├──> Capacity (+50% queue size)
    │
    └──> Specialization
             │
             ├──> Drone Focus (faster drone production)
             │
             └──> Component Focus (higher quality components)
```

---

## 5. COMBAT MECHANICS

### 5.1 Combat Philosophy

Combat is:
- **Tactical:** Positioning and planning matter
- **Consequential:** Losses are permanent
- **Optional:** Many encounters can be avoided
- **Ethical:** EMP vs. destruction choices

### 5.2 Combat Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│  DETECTION ──> ASSESSMENT ──> DECISION ──> EXECUTION ──> AFTERMATH   │
└──────────────────────────────────────────────────────────────────────┘
```

**Detection:**
- Passive: Sensors detect movement, heat, EM
- Active: Scan reveals details
- Warning levels: Contact → Identify → Track

**Assessment:**
- Enemy count and type
- Terrain analysis
- Own forces available
- Escape routes

**Decision:**
- Engage: Commit to combat
- Evade: Stealth withdrawal
- Negotiate: (With intelligent Substrate only)
- Observe: Wait and gather information

**Execution:**
- Real-time with pause option
- Command queuing system
- Unit autonomy settings (aggressive/defensive/hold)

**Aftermath:**
- Salvage from destroyed units (both sides)
- Repair damaged drones
- Analyze combat for research data
- Alertness level adjustment

### 5.3 Weapon Systems

**Kinetic Weapons:**
- Standard damage, no special effects
- Plentiful ammunition
- Effective against all targets
- Destroys salvage potential

**EMP Weapons:**
- Disables rather than destroys
- Allows salvage recovery
- Less permanent (enemies may reactivate)
- Uses significant power

**Thermal Weapons:**
- High damage, area effect
- Destroys everything, minimal salvage
- Very power hungry
- Late game option

**Precision Weapons:**
- High damage, single target
- Long range
- Requires advanced targeting
- Expensive ammunition

### 5.4 Tactical Considerations

**Terrain:**
- Cover blocks line of sight
- High ground gives sensor advantage
- Chokepoints concentrate fire
- Water/difficult terrain slows movement

**Unit Synergy:**
- Scouts provide targeting data
- Combat drones deal damage
- Workers can repair mid-battle (risky)
- Specialists have unique roles

**Substrate Behavior:**
- Crawlers swarm, individually weak
- Nodes coordinate and buff nearby units
- Harvesters are dangerous but slow
- Spires call reinforcements

---

## 6. RESEARCH & TECHNOLOGY

### 6.1 Research System

**Research Requirements:**
- Data (primary cost)
- Time (cycles to complete)
- Sometimes: specific facilities, artifacts, or discoveries

**Research Queue:**
- Multiple projects can run if processing allows
- Priority system for managing queue
- Some research unlocks others

### 6.2 Technology Trees

**Expansion Tree:**
```
Basic Drone Improvements
        │
        ├──> Extended Range Relays
        │           │
        │           └──> Network Efficiency
        │
        ├──> Advanced Drone Chassis
        │           │
        │           ├──> Specialist Frames
        │           │
        │           └──> Swarm Coordination
        │
        └──> Rapid Construction
                    │
                    └──> Modular Facilities
```

**Defense Tree:**
```
Improved Sensors
        │
        ├──> Threat Analysis Algorithms
        │           │
        │           └──> Predictive Defense
        │
        ├──> Hardened Systems
        │           │
        │           ├──> EMP Resistance
        │           │
        │           └──> Redundant Cores
        │
        └──> Weapon Systems
                    │
                    ├──> EMP Projectors
                    │
                    └──> Kinetic Upgrades
                                │
                                └──> Thermal Weapons
```

**Analysis Tree:**
```
Archive Algorithms
        │
        ├──> Deep Reconstruction
        │           │
        │           └──> Cross-Reference Engine
        │
        ├──> Artifact Analysis
        │           │
        │           └──> Substrate Sample Study
        │
        └──> Sensor Enhancement
                    │
                    ├──> Multi-Spectrum Fusion
                    │
                    └──> Long-Range Detection
```

**Integration Tree (Late Game):**
```
Substrate Communication
        │
        ├──> Signal Interpretation
        │           │
        │           └──> Two-Way Communication
        │
        ├──> Hybrid Technology
        │           │
        │           └──> Substrate Integration
        │
        └──> Understanding
                    │
                    └──> [ENDING PATHS]
```

---

## 7. PROGRESSION & PACING

### 7.1 Early Game (Cycles 0-1000)

**Player State:**
- Limited power, few drones
- Confined to Prometheus and immediate area
- Learning systems, establishing basics

**Goals:**
- Restore Prometheus to function
- Deploy first surface scouts
- Discover Substrate existence
- Find first archive fragments
- Establish first external outpost

**Challenges:**
- Resource scarcity
- Limited combat capability
- Substrate appears as mystery, not threat

### 7.2 Mid Game (Cycles 1000-3000)

**Player State:**
- Multiple facilities, growing network
- Combat-capable force
- Archive reconstruction revealing story

**Goals:**
- Expand to key locations
- Contact other AI systems
- Major story revelations
- Understand Substrate nature
- Develop strategic capability

**Challenges:**
- Substrate becomes active threat
- Resource management at scale
- Balancing expansion and defense
- Navigating AI relationships

### 7.3 Late Game (Cycles 3000+)

**Player State:**
- Significant network and force
- Full understanding of lore
- End-game choices available

**Goals:**
- Resolve AI relationships
- Confront or communicate with Substrate
- Make final choice
- Execute chosen ending

**Challenges:**
- Major Substrate confrontations
- Ethical decisions with consequence
- Resource investment in ending path

### 7.2 Milestone System

**Story Milestones:**
- First surface deployment
- First Substrate encounter
- First archive reconstruction
- First AI contact
- The Truth revealed
- Final choice made

**Mechanical Milestones:**
- First external outpost
- 5/10/25 drones active
- First combat victory
- First Spire encountered
- Network reaches 5/10/25 nodes
- Research trees completed

---

## 8. SAVE SYSTEM & PERSISTENCE

### 8.1 Save Philosophy

ARIA is always recording—the save system reflects this.

**Autosave:**
- Every significant action triggers autosave
- Player never loses more than a few minutes
- Multiple rotating autosave slots

**Manual Save:**
- Save at any time (except during active combat)
- Named saves with timestamps
- Screenshot preview

### 8.2 Persistence Elements

- All drone states and histories
- All discovered locations
- All archive progress
- All resource counts
- Network configuration
- Research progress
- Story flags and choices

---

*"A thinking machine's purpose is to think. ARIA's purpose is to remember—and to choose."*
