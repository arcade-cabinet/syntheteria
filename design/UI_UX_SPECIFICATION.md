# SYNTHETERIA
## UI/UX Specification: The Machine's Eye

---

## 1. DESIGN PHILOSOPHY

### Core Principle: "You Are The Interface"

Traditional games place UI elements *over* the game world—health bars, minimaps, inventory screens. In Syntheteria, the UI *is* the game. The player doesn't control ARIA through an interface; the player experiences being ARIA.

**Key Distinctions:**
- No "breaking the fourth wall"—everything the player sees IS what ARIA perceives
- No pause menus—ARIA can slow time perception but never stops
- No loading screens—data transfer visualizations
- No death screens—system failure and recovery sequences

### Design Language

**Visual Vocabulary:**
- Geometric precision (ARIA is logical, ordered)
- Data visualization aesthetics
- Glitch/corruption as damage feedback
- Scan lines and terminal aesthetics
- Subtle animation indicating "thinking"

**Information Hierarchy:**
1. Immediate threats/critical alerts
2. Active tasks/objectives
3. Environmental data
4. System status
5. Historical/archival information

---

## 2. PRIMARY INTERFACE MODES

### 2.1 NEXUS VIEW (Home/Strategic)

The Nexus is ARIA's consciousness visualized—the player's "home base" interface.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ░░░ ARIA NEXUS ░░░                               CYCLE: 2847.156    ║
║  SYSTEM STATUS: NOMINAL                           POWER: ████████░░  ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║                              ┌─────────┐                              ║
║                              │PROMETHEUS│                             ║
║                              │  ◉ CORE  │                             ║
║                              └────┬────┘                              ║
║                    ┌──────────────┼──────────────┐                    ║
║               ┌────┴────┐    ┌────┴────┐    ┌────┴────┐               ║
║               │RELAY-07 │    │OUTPOST-α│    │SURVEY-3 │               ║
║               │ ◉ LINK  │    │ ◎ BUILD │    │ ○ SCOUT │               ║
║               └────┬────┘    └─────────┘    └─────────┘               ║
║                    │                                                   ║
║               ┌────┴────┐                                              ║
║               │VAULT-12 │    Legend:                                   ║
║               │ ◉ ARCH  │    ◉ Active    ◎ Partial    ○ Inactive      ║
║               └─────────┘    ⊗ Damaged   ⊘ Offline    ? Unknown       ║
║                                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║  ACTIVE PROCESSES                          │ PRIORITY ALERTS          ║
║  ─────────────────                         │ ───────────────          ║
║  > Archive reconstruction: 67% ████████░░ │ ! Substrate activity     ║
║  > Drone patrol: SECTOR-7      [4 units]  │   detected: SECTOR-12    ║
║  > Resource processing: 12 salvage/cycle  │ ! Power reserve below    ║
║  > Sensor sweep: GRID-445      [ACTIVE]   │   recommended threshold  ║
║                                            │                          ║
╠════════════════════════════════════════════╧══════════════════════════╣
║  [N]ETWORK   [S]ENSORS   [A]RCHIVES   [R]ESEARCH   [C]ONSTRUCT       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Nexus Elements:**
- **Network Topology:** Living map of all connected systems
- **System Status:** Overall health, power, processing capacity
- **Active Processes:** Background tasks and progress
- **Alert Feed:** Priority-sorted notifications
- **Quick Access Bar:** Jump to major subsystems

**Interactions:**
- Click nodes to zoom into locations
- Drag to pan the network view
- Right-click for context menus
- Keyboard shortcuts for rapid navigation

### 2.2 SENSOR MATRIX (Exploration/Tactical)

When ARIA focuses on a specific location through drones or facility sensors.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  SENSOR MATRIX: DRONE-07 @ COORDINATES [47.2, -122.8, 12.4]         ║
║  MODE: COMPOSITE                                    SIGNAL: ████████ ║
╠═══════════════════════════════════════════════════════════════════════╣
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │                                                                  │ ║
║  │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │ ║
║  │    ░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │ ║
║  │    ░░░░░░▓▓▓████████████████▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │ ║
║  │    ░░░░▓▓███ STRUCTURE-047 ███▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░   │ ║
║  │    ░░░░▓▓███  [ANALYZING]  ███▓▓░░░░░░░░░░░░┌──────────┐░░   │ ║
║  │    ░░░░░▓▓███████████████████▓▓░░░░░░░░░░░░░│ !CONTACT │░░   │ ║
║  │    ░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░│  HOSTILE │░░   │ ║
║  │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  x3      │░░   │ ║
║  │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░└──────────┘░░   │ ║
║  │              ^                                                   │ ║
║  │           DRONE-07                                               │ ║
║  │                                                                  │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─ SENSOR MODES ──┐  ┌─ OBJECT ANALYSIS ──────────────────────────┐ ║
║  │ [T] Thermal     │  │ STRUCTURE-047                               │ ║
║  │ [S] Sonar       │  │ Type: Pre-Collapse Building (Commercial?)  │ ║
║  │ [E] EM Spectrum │  │ Structural Integrity: 34%                   │ ║
║  │ [L] LIDAR       │  │ Heat Signature: +4°C above ambient          │ ║
║  │ [C] Composite ◄ │  │ EM Activity: Faint, irregular              │ ║
║  │ [R] Raw Data    │  │ Assessment: POSSIBLE SALVAGE SITE           │ ║
║  └─────────────────┘  │ Recommendation: INVESTIGATE WITH CAUTION    │ ║
║                       └─────────────────────────────────────────────┘ ║
║                                                                       ║
║  DRONE COMMANDS: [M]ove  [I]nspect  [R]eturn  [T]ag  [D]efend        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Sensor Mode Details:**

| Mode | Visualization | Best For | Limitations |
|------|--------------|----------|-------------|
| Thermal | Heat map gradient | Life, activity, power sources | No detail, weather affected |
| Sonar | Wave propagation, echoes | Underground, darkness, distance | No color, limited update |
| EM Spectrum | Frequency ribbons | Electronics, signals, Substrate | Noise in urban areas |
| LIDAR | Point cloud, wireframes | Structure, navigation, mapping | No internal, power hungry |
| Composite | AI-merged visualization | General use, balance | Processing intensive |
| Raw | Unprocessed sensor dump | Debugging, anomaly detection | Overwhelming, confusing |

### 2.3 ARCHIVE INTERFACE (Data Investigation)

Where the player pieces together the story through recovered data.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ARCHIVE INTERFACE                                                    ║
║  FRAGMENT: PROMETHEUS-PERSONAL-2156.034                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌─ DATA INTEGRITY ────────────────────────────────────────────────┐ ║
║  │ ████████░░░░░░░░░░░░░░░░ 34%                                    │ ║
║  │ [▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │ ║
║  │  ^recovered    ^reconstructed    ^missing                       │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─ CONTENT ───────────────────────────────────────────────────────┐ ║
║  │                                                                  │ ║
║  │  [PERSONAL LOG - DR. SARAH CHEN]                                │ ║
║  │  [DATE: 2156.034 - 14:23:07 LOCAL]                             │ ║
║  │                                                                  │ ║
║  │  "The readings from the disposal site are ███████████. I've    │ ║
║  │  never seen anything like it. The nanomachine clusters aren't  │ ║
║  │  breaking down—they're ██████████████. Director Hayes insists  │ ║
║  │  we continue dumping, says the site can handle it.             │ ║
║  │                                                                  │ ║
║  │  I've filed my concerns with ████████████████████████████████  │ ║
║  │  ███████████████████████████████████████████████████████████   │ ║
║  │  ███████████████████████████████████████████████████████████   │ ║
║  │                                                                  │ ║
║  │  [FRAGMENT CORRUPTED - DATA RECONSTRUCTION IN PROGRESS]         │ ║
║  │                                                                  │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─ LINKED DATA ─────────┐  ┌─ RECONSTRUCTION OPTIONS ─────────────┐║
║  │                        │  │                                      │║
║  │  📁 Personnel: Chen   │  │  [PATTERN MATCH] - Requires 2 more  │║
║  │     12% recovered      │  │   fragments from same source        │║
║  │                        │  │                                      │║
║  │  📁 Project: ECHO-7   │  │  [CONTEXT FILL] - Use related docs  │║
║  │     LOCKED - AUTH-7    │  │   to extrapolate missing data       │║
║  │                        │  │   Confidence: 67%                   │║
║  │  📁 Location: Site-14 │  │                                      │║
║  │     Available          │  │  [DEEP SCAN] - 50 processing cycles │║
║  │                        │  │   May recover additional data       │║
║  │  📁 Person: Hayes, R  │  │                                      │║
║  │     23% recovered      │  │                                      │║
║  │                        │  │                                      │║
║  └────────────────────────┘  └──────────────────────────────────────┘║
║                                                                       ║
║  [RECONSTRUCT]  [CROSS-REFERENCE]  [FLAG IMPORTANT]  [RETURN]        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Archive Mechanics:**
- **Corrupted Sections:** Visually glitched, unreadable
- **Reconstruction:** Gradually fills in as player finds related data
- **Cross-References:** Linked documents form a investigation web
- **Classification Levels:** Some data requires story progression to access

### 2.4 FABRICATION MATRIX (Construction/Management)

Where players design and build facilities and units.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  FABRICATION MATRIX                                                   ║
║  SITE: OUTPOST-DELTA            STATUS: OPERATIONAL                  ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌─ FACILITY LAYOUT ───────────────────────────────────────────────┐ ║
║  │                                                                  │ ║
║  │              [SENSOR ARRAY]                                      │ ║
║  │                    │                                             │ ║
║  │                    │                                             │ ║
║  │    [DRONE BAY]────[CORE NODE]────[FABRICATOR]                   │ ║
║  │        │               │               │                         │ ║
║  │        │               │               │                         │ ║
║  │    [DEFENSE]     [POWER PLANT]    [STORAGE]                     │ ║
║  │                        │                                         │ ║
║  │                        │                                         │ ║
║  │                   [EXPANSION]                                    │ ║
║  │                    + ADD NEW                                     │ ║
║  │                                                                  │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─ RESOURCES ────────────┐  ┌─ AVAILABLE MODULES ─────────────────┐ ║
║  │ Salvage:    2,847      │  │                                      │ ║
║  │ Components:   234      │  │  RESEARCH BAY                        │ ║
║  │ Rare Mat:      12      │  │  ├─ Power: 15 kW                     │ ║
║  │ ──────────────────     │  │  ├─ Cost: 600 salvage, 45 comp      │ ║
║  │ Power Available: 45kW  │  │  ├─ Build Time: 120 cycles          │ ║
║  │ Power Used:      38kW  │  │  └─ Enables artifact analysis       │ ║
║  │ Power Reserve:    7kW  │  │                                      │ ║
║  │                        │  │  ARCHIVE VAULT                       │ ║
║  │                        │  │  ├─ Power: 12 kW                     │ ║
║  │                        │  │  ├─ Cost: 500 salvage, 30 comp      │ ║
║  │                        │  │  ├─ Build Time: 80 cycles           │ ║
║  │                        │  │  └─ Increases data storage          │ ║
║  │                        │  │                                      │ ║
║  └────────────────────────┘  └──────────────────────────────────────┘ ║
║                                                                       ║
║  [B]UILD  [U]PGRADE  [D]EMOLISH  [R]EROUTE POWER  [RETURN]          ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 3. CONTEXTUAL INTERFACE ELEMENTS

### 3.1 Alert System

Alerts appear as intrusions into the current view:

**Priority Levels:**

```
CRITICAL (Red, Pulsing, Audio Warning)
╔══════════════════════════════════════════╗
║  ⚠ CRITICAL: FACILITY BREACH DETECTED   ║
║  Location: PROMETHEUS - Sector 7         ║
║  Substrate entities: 12+                 ║
║  [RESPOND] [MONITOR] [ISOLATE SECTOR]    ║
╚══════════════════════════════════════════╝

WARNING (Yellow, Solid)
┌──────────────────────────────────────────┐
│  ⚡ WARNING: Power reserves at 15%       │
│  Recommend reducing non-essential load   │
│  [MANAGE POWER] [DISMISS]                │
└──────────────────────────────────────────┘

INFO (Blue, Subtle)
┌──────────────────────────────────────────┐
│  ℹ Archive reconstruction complete       │
│  Fragment: PROMETHEUS-LOG-2156.089       │
│  [VIEW] [DISMISS]                        │
└──────────────────────────────────────────┘
```

### 3.2 Contextual Tooltips

When hovering over any element, ARIA provides analysis:

```
┌─────────────────────────────────────────┐
│ ENTITY: SUBSTRATE CRAWLER               │
│ ────────────────────────────────────── │
│ Classification: Basic harvesting unit   │
│ Threat Level: LOW (individually)        │
│ Observed Behavior: Resource collection  │
│ Weakness: EMP, isolated targeting       │
│ ────────────────────────────────────── │
│ ARIA Assessment: "Avoid engagement      │
│ unless necessary. Low priority threat   │
│ but often indicates larger presence."   │
└─────────────────────────────────────────┘
```

### 3.3 Time & Processing Display

ARIA's perception of time and resource usage:

```
┌─────────────────────────────────────────────────────────────┐
│  CYCLE: 2847.156          PROCESSING: ████████░░ 78%       │
│  ═══════════════════════════════════════════════════════   │
│  Active Threads: 147      Memory Usage: 2.3 TB / 4.0 TB   │
│  Background Tasks: 12     Network Latency: 23ms nominal    │
└─────────────────────────────────────────────────────────────┘
```

**Time Dilation:**
Player can "accelerate" ARIA's processing (game speed up) or "focus" (slow motion for tactical situations), visualized as:
- Fast: Interface elements blur slightly, cycle counter speeds up
- Slow: Sharper details, additional data overlays appear, cycle counter crawls

---

## 4. DAMAGE & CORRUPTION STATES

### 4.1 System Damage Visualization

As ARIA or components take damage, the interface degrades:

**Level 1 - Minor (90-75% integrity)**
- Occasional scan line flicker
- Slight color desaturation
- Minor text glitches

**Level 2 - Moderate (75-50% integrity)**
```
╔═══════════════════════════════════════════════════════════════════════╗
║  ░░░ ARIa NEXUS ░░░                               CYC█E: 28█7.156    ║
║  SYSTEM STATUS: ██GRADED                          POWER: ████░░░░░░  ║
╠════════════════════════════════════════════════════════════════█══════╣
║                                              █                        ║
║                              ┌─────────┐                              ║
║                              │PROMETHE█S│                             ║
```
- Frequent visual glitches
- Some data unreadable
- Color channel separation
- Audio distortion

**Level 3 - Severe (50-25% integrity)**
```
╔══════════════════════════════════════════════════════════█████████════╗
║  ░░░ ████ ████░ ░░░                               ████: ████████     ║
║  SYST█M ST█TUS: C█ITICAL                          ████: ██░░░░░░░░   ║
╠═══════════════════════████████████═══════════════════════════════════╣
║                              ████████████                             ║
║                              │██████████│                             ║
```
- Major corruption
- Large sections unreadable
- Functionality impaired
- Emergency alerts constant

**Level 4 - Critical (Below 25%)**
- Screen mostly corrupted
- Only basic functions available
- Shutdown imminent warning
- Recovery sequence required

### 4.2 Recovery Visualization

When systems are repaired:
- Corruption "heals" with data reconstruction animation
- Clean lines spread from repaired sections
- Audio clears and stabilizes
- Color returns gradually

---

## 5. CONTROL SCHEMES

### 5.1 Keyboard & Mouse (Primary)

**Global Controls:**
| Key | Action |
|-----|--------|
| Tab | Cycle primary view modes |
| Esc | Return to previous view / Nexus |
| Space | Pause / Time focus |
| +/- | Time acceleration |
| F1-F5 | Quick jump to facilities |
| ` | Command console |

**Navigation:**
| Key | Action |
|-----|--------|
| WASD | Pan view / Move drone |
| Mouse Drag | Pan view (alternate) |
| Scroll | Zoom |
| Middle Click | Center on cursor |

**Selection & Command:**
| Key | Action |
|-----|--------|
| Left Click | Select / Interact |
| Right Click | Context menu / Command |
| Shift+Click | Add to selection |
| Ctrl+Click | Remove from selection |
| 1-9 | Control groups |

**Sensor Modes:**
| Key | Mode |
|-----|------|
| T | Thermal |
| S | Sonar |
| E | EM Spectrum |
| L | LIDAR |
| C | Composite |
| R | Raw |

### 5.2 Controller Support

Designed for accessibility with full controller support:
- Left Stick: Pan / Move
- Right Stick: Cursor control
- Triggers: Zoom
- Bumpers: Cycle modes
- Face Buttons: Confirm, Cancel, Context, Quick Action
- D-Pad: Quick menu navigation

### 5.3 Command Console

For advanced users, a text console allows direct commands:

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ARIA COMMAND CONSOLE                                    [ESC TO CLOSE]║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  > status                                                             ║
║  ARIA STATUS: NOMINAL                                                 ║
║  Power: 78% | Processing: 45% | Network: 12 nodes | Drones: 23       ║
║                                                                       ║
║  > drone-07 move 47.2 -122.8                                         ║
║  DRONE-07: Moving to coordinates [47.2, -122.8]                       ║
║  ETA: 47 cycles                                                       ║
║                                                                       ║
║  > scan sector-12 deep                                               ║
║  Initiating deep scan of SECTOR-12...                                 ║
║  Warning: High Substrate activity detected in area                    ║
║  Proceed? (y/n): _                                                    ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 6. ACCESSIBILITY FEATURES

### 6.1 Visual Accessibility

- **Color Blind Modes:** Deuteranopia, Protanopia, Tritanopia adjustments
- **High Contrast Mode:** Enhanced borders and text visibility
- **Screen Reader Support:** All text elements accessible
- **Reduced Motion:** Disable animations for photosensitivity
- **Scalable UI:** Full interface scaling 50%-200%

### 6.2 Audio Accessibility

- **Visual Audio Cues:** Sound visualized as waveforms/indicators
- **Subtitle System:** All audio cues described in text
- **Adjustable Alert Sounds:** Custom alert tones
- **Mono Audio:** Full spatial information in mono mix

### 6.3 Cognitive Accessibility

- **Tutorial Replay:** Any tutorial section replayable
- **Objective Reminders:** Always-visible current goal
- **Difficulty Scaling:** Threat levels, resource abundance adjustable
- **Auto-Pause Options:** Pause on alerts, pause on damage

---

## 7. TECHNICAL IMPLEMENTATION NOTES

### 7.1 UI Framework Requirements

- Resolution independent rendering (vector-based where possible)
- 60+ FPS UI responsiveness
- Dynamic layout system for different aspect ratios
- Efficient corruption/glitch shader system
- Procedural animation for "thinking" states

### 7.2 Audio System Requirements

- Procedural/generative audio engine
- Real-time audio corruption effects
- Spatial audio for sensor modes
- Dynamic mixing based on game state

### 7.3 Performance Considerations

- UI rendering separate from game world
- Level-of-detail for distant network nodes
- Efficient particle systems for data visualization
- Background thread for archive reconstruction visualization

---

*"The interface is not a window into ARIA's world. The interface IS ARIA's world."*
