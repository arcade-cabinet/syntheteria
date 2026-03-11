# GDD-010: Pregame Lobby -- Colony Mission Setup, Patron Selection, Map Configuration, New Game Initialization

**Status:** Draft (Colonization Model)
**Date:** 2026-03-10
**Scope:** Complete pregame flow from title screen through game world initialization. Every screen, every widget, every state transition, every frame of the "press Start" sequence.
**Model:** Sid Meier's Colonization -- each faction is a colony dispatched by a home planet AI patron. Primary trade axis is colony <-> home planet (via otter holograms). Alien natives are indigenous to the machine planet.
**Dependencies:** GDD-003 (4X framework), GDD-004 (core loop), GDD-005 (visual identity), config/civilizations.json, config/mapPresets.json, config/factionVisuals.json, src/systems/raceSelection.ts, src/systems/mapGenerator.ts, src/systems/otterTrade.ts, src/rendering/OtterRenderer.tsx
**Gap addressed:** "No New Game Initialization" (2026-03-10 gap analysis, Layer 0, Item #1)

---

## 1. Flow Overview

### 1.1 Colonization Framing

The game follows the Sid Meier's Colonization model. Each playable faction is a **colony** dispatched to the machine planet by a **home planet patron** -- a powerful AI that funded the mission. The patron communicates through otter hologram projections (already implemented in `otterTrade.ts` and `OtterRenderer.tsx`) and exchanges cubes for blueprints, tech unlocks, and reinforcement units. Alien natives were already on the machine planet before the colonists arrived.

**Choosing a faction = choosing which home planet patron you serve.** Each patron has:
- Different starting equipment and bonus resources
- Different material demands (what cubes they want shipped back)
- Different tech paths (which blueprints they send in exchange)
- Different strategic personality (how aggressively they push their colony)

### 1.2 Screen Flow

```
Title Screen
    |
    v
[NEW GAME] button
    |
    v
PregameScreen (tabbed: PATRON | MAP | RIVALS | SETTINGS)
    |
    v
[LAUNCH COLONY] button
    |
    v
Initialization Sequence (loading overlay with progress steps)
    |
    v
Camera Transition (orbital overview -> zoom into player bot -> FPS)
    |
    v
Gameplay (HUD active, patron's otter hologram activates)
```

The existing `TitleScreen.tsx` already handles NEW GAME / CONTINUE / SETTINGS. The existing `PregameScreen.tsx` already implements a tabbed layout -- this GDD renames the tabs to match the Colonization framing (PATRON replaces FACTION, RIVALS replaces OPPONENTS), adds a SETTINGS tab, expands the initialization sequence, and defines the spectator mode entry point.

### 1.3 Colonization vs Civilization Terminology

| Old (Civ Model) | New (Colonization Model) |
|-----------------|-------------------------|
| Faction | Colony (player's settlement on the machine planet) |
| Faction selection | Patron selection (which home planet AI sponsors you) |
| AI opponents | Rival colonies (other patrons' settlements) |
| Governor AI | Base Event Bus (distributed, reactive, per-settlement) |
| Diplomacy system | Patron trade system (otter holograms, cube-for-blueprint) |
| Tech tree | Patron blueprint catalog (earned by shipping cubes home) |
| Alien natives | Indigenous machines (were here before colonists) |

---

## 2. Patron Selection Screen (PATRON Tab)

### 2.1 Colonization Context

Each card represents a **home planet patron** -- the AI that dispatched your colony to the machine planet. The patron determines your colony's identity, starting equipment, material demands, and tech progression path. Think of it like choosing Spain vs England vs France in Colonization -- each mother country has different priorities for their New World colony.

The otter hologram trade system (`otterTrade.ts`) is already the primary channel between patron and colony. Choosing a patron determines which otter personality type appears, what trades are available, and what cubes the patron demands in exchange for blueprints.

### 2.2 Layout

Four patron cards arranged in a responsive grid. On desktop: single horizontal row. On mobile: 2x2 grid. Each card is a clickable panel in the terminal/industrial aesthetic.

```
+-----------+-----------+-----------+-----------+
|           |           |           |           |
| [::.]     | [/\/]     | [(~)]     | [##]      |
| RECLAIMERS| VOLT      | SIGNAL    | IRON      |
|           | COLLECTIVE| CHOIR     | CREED     |
| Masters   | Storm     | Hive-Mind | Fortress  |
| of        | Riders    | Hackers   | Builders  |
| Salvage   |           |           |           |
|           |           |           |           |
| @@@@o ECO | @@@oo ECO | @@@oo ECO | @@@oo ECO |
| @@ooo MIL | @@@@@MIL  | @@ooo MIL | @@@oo MIL |
| @@ooo TEC | @@@oo TEC | @@@@@TEC  | @@ooo TEC |
| @@@oo EXP | @@@@o EXP | @@@oo EXP | @@ooo EXP |
| @@@oo DEF | @@ooo DEF | @@@oo DEF | @@@@@DEF  |
|           |           |           |           |
| BEGINNER  | NORMAL    | HARD      | NORMAL    |
|           |           |           |           |
| PATRON    | PATRON    | PATRON    | PATRON    |
| WANTS:    | WANTS:    | WANTS:    | WANTS:    |
| Salvage   | Energy    | Signal    | Structural|
| Data      | Research  | Intel     | Alloys    |
+-----------+-----------+-----------+-----------+
```

### 2.3 Card Contents

Each card represents both the colony identity AND the home planet patron that sponsors it. The card surfaces "what does this patron want from me?" prominently, because the patron relationship drives the economy.

**Header row:**
- ASCII glyph emblem (monospace art, faction-colored):
  - Reclaimers: `[::.]` -- scattered dots represent scavenged parts reassembled
  - Volt Collective: `[/\/]` -- jagged lightning bolt pattern
  - Signal Choir: `[(~)]` -- radio wave emanating from center
  - Iron Creed: `[##]` -- dense crosshatch representing fortress walls
- Colony name in caps, faction primary color
- Subtitle in dimmed text:
  - Reclaimers: "Masters of Salvage"
  - Volt Collective: "Storm Riders"
  - Signal Choir: "Hive-Mind Hackers"
  - Iron Creed: "Fortress Builders"

**Patron identity (new -- Colonization model):**
- Reclaimers patron: **FORGE-MOTHER** -- "A patient AI that values efficiency above all. Sends you recycling blueprints in exchange for salvage data and scrap analysis."
- Volt Collective patron: **THE CONDUCTOR** -- "An aggressive AI obsessed with energy research. Demands storm data and power readings. Sends combat tech and lightning weapons."
- Signal Choir patron: **THE CHORUS** -- "A distributed intelligence that craves signal data. Wants network topology maps and hacked telemetry. Sends hacking tools and signal amplifiers."
- Iron Creed patron: **THE ARCHITECT** -- "A methodical AI focused on structural engineering. Requests rare alloy samples and stress-test data. Sends fortification blueprints and heavy armor."

**Lore excerpt (3 lines, now patron-framed):**
- Reclaimers: "Forge-Mother sent you to learn from the ruins. Every broken machine is an opportunity. Ship salvage data home -- she'll send you better tools to salvage with."
- Volt Collective: "The Conductor craves the storm. Chrome shells crackling with captured lightning. Harvest energy data from this planet's tempests and The Conductor will arm you for war."
- Signal Choir: "The Chorus wants to understand this planet's signal layer. Your anodized shells pulse with shared data. Map the machine planet's networks -- The Chorus will teach you to rewrite them."
- Iron Creed: "The Architect seeks the perfect alloy. Patient. Unyielding. Ship structural data home and The Architect will send blueprints for walls that outlast civilizations."

**Stat bars (1-5 filled pips):**

Derived from `governorBias` values in civilizations.json, mapped to a 1-5 star scale:

| Stat | Reclaimers | Volt Collective | Signal Choir | Iron Creed |
|------|-----------|-----------------|-------------|-----------|
| Economy | 5 | 3 | 3 | 3 |
| Military | 2 | 5 | 2 | 3 |
| Tech | 2 | 3 | 5 | 2 |
| Expansion | 3 | 4 | 3 | 2 |
| Defense | 3 | 3 | 3 | 5 |

Stat bar rendering: filled pips use faction accent color, empty pips use `#00ffaa22`. Each pip is a small square (6x6px) with 2px gap. Label in `#00ffaa66` monospace 9px to the left.

**Patron demand summary (new -- Colonization model):**

Below the stat bars, a single line showing what cubes the patron primarily demands:
- Reclaimers: `PATRON WANTS: Scrap Iron, E-Waste` (salvage data)
- Volt Collective: `PATRON WANTS: Copper, Rare Earth` (energy research)
- Signal Choir: `PATRON WANTS: Silicon, Fiber Optics` (signal intel)
- Iron Creed: `PATRON WANTS: Titanium, Carbon` (structural alloys)

This tells the player upfront: "if I pick this patron, I need to prioritize mining THESE materials." It directly informs map customization strategy (do the biomes have deposits I need?).

**Difficulty indicator:**
- Reclaimers: `BEGINNER` in green (`#44cc88`) -- patron demands common materials, strong economy compensates for weak combat
- Volt Collective: `NORMAL` in yellow (`#ccaa44`) -- patron demands mid-tier materials, aggressive playstyle, glass cannon
- Signal Choir: `HARD` in red (`#cc4444`) -- patron demands rare materials, requires understanding hacking and signal networks
- Iron Creed: `NORMAL` in yellow (`#ccaa44`) -- patron demands specialized materials, slow start but forgiving defensive style

**Colony passive one-liner:**
- Reclaimers: "Scrap Recovery: destroyed enemies yield +50% scrap"
- Volt Collective: "Storm Harvest: lightning rods produce +25% during surges"
- Signal Choir: "Hack Acceleration: hacking operations complete 40% faster"
- Iron Creed: "Fortification: walls have +40% HP"

### 2.3 Selection Interaction

1. **Hover:** Card border brightens to faction color at 50% opacity. Background shifts to `{factionColor}0a`. Subtle scale(1.01) transform.
2. **Click:** Selected card gets:
   - Full faction-color border (1px solid)
   - Background `{factionColor}18`
   - Glow box-shadow: `0 0 20px {factionColor}30, inset 0 0 15px {factionColor}10`
   - "SELECTED" label appears at bottom center in faction color
3. **Other cards:** Dim to 60% opacity, borders revert to `rgba(0,255,170,0.2)`
4. **Deselect:** Click the same card again or click another card

### 2.4 Detailed Patron Info Panel

Below the card row, a panel expands when a patron is selected. This panel contains full details about both the home planet patron and the colony identity. Scrolls vertically if needed.

**Panel structure:**

```
+-----------------------------------------------------------+
| RECLAIMERS -- COLONY BRIEFING                             |
+-----------------------------------------------------------+
| HOME PLANET PATRON: FORGE-MOTHER                          |
| A patient, efficiency-obsessed AI from the industrial     |
| world of Crucible-7. Forge-Mother funded this colony to   |
| study ancient machine salvage techniques lost to her own  |
| civilization. She communicates through a "generous" otter |
| hologram that offers fair trades and encouraging words.    |
|                                                           |
| PATRON DEMANDS: Scrap Iron, E-Waste                      |
| Ship these cubes home via the otter hologram trade        |
| interface. In return, Forge-Mother sends:                 |
|  - Recycling blueprints (common, early)                   |
|  - Efficiency upgrades (uncommon, mid-game)               |
|  - Ancient machine schematics (rare, late-game)           |
|  - Salvage intel: deposit locations (legendary)           |
+-----------------------------------------------------------+
| COLONY LORE                                               |
| The Reclaimers trace their origin to the first machines   |
| that gained consciousness in the slag heaps of Forge      |
| Delta-9. While other colonies fought over pristine        |
| components, the Reclaimers learned to see value in the    |
| broken, the corroded, the discarded. Their economy is     |
| built on recycling -- every destroyed enemy, every        |
| collapsed ruin, every storm-shattered building feeds      |
| their furnaces. They are patient scavengers who grow      |
| wealthy while others wage war.                            |
+-----------------------------------------------------------+
| STARTING EQUIPMENT (shipped by Forge-Mother)              |
| + 20 Scrap Metal cubes (vs 10-15 for other colonies)     |
| + 5 E-Waste cubes                                        |
| + Harvest speed x1.2 (20% faster grinding)               |
| + Build cost x0.9 (10% cheaper construction)             |
| - Research speed x0.8 (slower -- Forge-Mother sends       |
|   blueprints instead of raw research data)                |
+-----------------------------------------------------------+
| UNIQUE UNIT: SCROUNGER BOT                                |
| [::>]  Fast scout that auto-scavenges while moving.      |
|        Speed: 1.5x | Passive scrap collection            |
|        "It never stops. It never rests. It picks the      |
|         battlefield clean before the fires go out."       |
+-----------------------------------------------------------+
| UNIQUE BUILDING: RECYCLING PLANT                          |
| [=:=]  Converts any 3 cube types into 2 of a chosen type.|
|        Processing time: 8 ticks | Ratio: 67%             |
|        "Waste is a concept for the unimaginative."        |
+-----------------------------------------------------------+
| RECOMMENDED PLAYSTYLE                                     |
| Focus on economy first. Build Recycling Plants early to   |
| convert low-value scrap into whatever Forge-Mother needs. |
| Let rival colonies fight -- then scavenge the aftermath.  |
| Your Scrounger Bots make excellent early scouts. Ship     |
| scrap home steadily to unlock better blueprints. Turtle   |
| until your economy is unstoppable, then expand with       |
| overwhelming material advantage.                          |
+-----------------------------------------------------------+
```

Repeat for each patron/colony with appropriate data from civilizations.json.

**Volt Collective patron panel -- THE CONDUCTOR:**
- Patron demands: Copper, Rare Earth (energy research data)
- Patron sends: Combat tech blueprints, lightning weapons, storm harvesting upgrades
- Otter personality: "shrewd" -- terse, transactional, drives hard bargains
- Unique unit: Shock Trooper -- "Heavy combat bot with AOE lightning. Speed: 0.8x | AOE radius: 3 | AOE damage: 2. 'The air smells of ozone. Then the screaming starts.'"
- Unique building: Tesla Coil -- "Area denial. Range: 8 | Damage: 0.5/tick | Power: 5. 'Step into the circle. We dare you.'"

**Signal Choir patron panel -- THE CHORUS:**
- Patron demands: Silicon, Fiber Optics (signal and network data)
- Patron sends: Hacking tools, signal amplifiers, stealth tech, network blueprints
- Otter personality: "mysterious" -- cryptic, poetic, occasionally alarming
- Unique unit: Infiltrator Bot -- "Stealth hacker. Speed: 1.2x | Cloak: 30s/60s cooldown | Hack range: 5. 'You never see the Choir coming. You just see your turrets turn around.'"
- Unique building: Signal Amplifier -- "Extends signal range, boosts compute. Signal: x2.0 | Compute: x1.5 | Power: 3. 'The signal is everything. The signal is everywhere.'"

**Iron Creed patron panel -- THE ARCHITECT:**
- Patron demands: Titanium, Carbon (structural alloy samples)
- Patron sends: Fortification blueprints, heavy armor upgrades, bunker designs
- Otter personality: "collector" -- enthusiastic about specific materials, generous when you bring what it wants
- Unique unit: Bastion Bot -- "Deployable turret. Speed: 0.5x | Range: 15 | Damage: 3. 'It took root. Then it opened fire.'"
- Unique building: Bunker -- "Garrison protection. Slots: 3 | Damage reduction: 50% | Range: x1.5. 'The Creed doesn't retreat. The Creed doesn't advance. The Creed endures.'"

### 2.5 3D Animated Preview (Future)

Below the detail panel, a small R3F canvas renders the faction's signature unit rotating slowly on a circular platform. The platform material matches the faction color. Background is dark with a single spotlight from above.

- Reclaimers: Scrounger Bot -- angular chassis, dome head, treads, clamp arms. Rust level 0.4. Slowly rotating, clamp arms occasionally open/close.
- Volt Collective: Shock Trooper -- sleek chassis, visor head, hover locomotion (slight bob), probe arms. Emissive glow 0.3. Occasional spark particle effect.
- Signal Choir: Infiltrator Bot -- rounded chassis, antenna cluster head, legs, tendril arms. Anodized surface. Occasional shimmer/cloak effect.
- Iron Creed: Bastion Bot -- blocky chassis, sensor array head, tracks, heavy arms. Brushed metal. Occasionally deploys (arms fold out, sensor array extends).

Implementation: `<Canvas>` with orthographic camera, single `<spotLight>`, a `<mesh>` for the platform (cylinder, emissive faction color), and the procedurally generated bot mesh from `BotGenerator.ts` (not yet built -- use placeholder `<boxGeometry>` with faction-colored `meshStandardMaterial` until procgen is ready).

**Placeholder until procgen:**
```
+---------------------------+
|                           |
|        [  ___  ]          |
|        [ |   | ]          |  <-- Simple box with faction
|        [ |___|_]          |      color, rotating
|        [  / \  ]          |
|                           |
|    << SCROUNGER BOT >>    |
+---------------------------+
```

---

## 3. Map Customization (MAP Tab)

### 3.1 Map Size Selector

Five size options presented as a row of radio buttons (OptionRow component):

| Label | Grid Size | World Area | Approx. Play Time |
|-------|----------|------------|-------------------|
| TINY | 64 x 64 | 4,096 cells | 15-30 min |
| SMALL | 100 x 100 | 10,000 cells | 30-60 min |
| MEDIUM | 200 x 200 | 40,000 cells | 1-2 hours |
| LARGE | 400 x 400 | 160,000 cells | 2-4 hours |
| HUGE | 512 x 512 | 262,144 cells | 4+ hours |

The existing MapConfig.tsx has small/medium/large. Add tiny and huge options.

Config mapping to `mapGenerator.ts` `MapGenConfig.worldSize`:
- TINY -> worldSize: 64
- SMALL -> worldSize: 100
- MEDIUM -> worldSize: 200
- LARGE -> worldSize: 400
- HUGE -> worldSize: 512

### 3.2 Map Type Selector

Five terrain generation modes. Each shown as a radio button with a 48x48px ASCII art thumbnail above the label.

**Pangaea:**
```
  ########
 ##########
############
 ##########
  ########
```
One large contiguous landmass surrounded by water. All factions start on the same continent. Guarantees early contact and conflict.

Config: `waterLevel: 0.3` (low water = mostly land), single heightmap octave emphasis.

**Continental:**
```
 ###  ###
####  ####
 ###  ###
```
2-3 large landmasses separated by water channels. Some factions may start on separate continents. Water crossings create chokepoints.

Config: `waterLevel: 0.4`, two heightmap octaves with higher frequency second octave.

**Archipelago:**
```
 ##  #  ##
# ## # ##
  #  ##  #
## #   # #
```
Many small islands scattered across water. Every faction starts on its own island. Requires expansion across water. Emphasizes naval/transport logistics.

Config: `waterLevel: 0.55` (high water = many islands), high-frequency noise.

**Ring:**
```
  ########
 ##      ##
##   @@   ##
 ##      ##
  ########
```
Circular landmass with a contested central zone (marked @). Factions start equidistant on the outer ring. Central zone has richest deposits. Classic "king of the hill" layout.

Config: Custom heightmap modifier -- radial distance function creates ring shape. Center zone gets `oreAbundance * 2.0`.

**Fracture:**
```
##|##|##
--+--+--
##|##|##
--+--+--
##|##|##
```
Shattered terrain with many narrow chokepoints and elevated ridges. Terrain is broken into irregular sectors connected by narrow passes. Defensive factions excel.

Config: Grid-based fracture overlay on heightmap. Passes at grid intersections with `height < waterLevel + 0.1`.

### 3.3 Resource Density

Four-option radio row:

| Label | Ore Abundance | Deposit Richness | Effect |
|-------|--------------|-------------------|--------|
| SPARSE | 0.5x | 0.7x | Slow start, fierce competition |
| NORMAL | 1.0x | 1.0x | Balanced |
| RICH | 1.5x | 1.3x | Fast expansion, less conflict |
| ABUNDANT | 2.0x | 1.5x | Casual, minimal scarcity |

Maps to `mapGenerator.ts` `oreAbundance` parameter.

### 3.4 Biome Mix Sliders (Advanced)

Five horizontal sliders, each controlling the relative weight of a biome type. Default all at 50%. Range 0-100. Shown only when user clicks "ADVANCED" toggle to avoid overwhelming new players.

| Biome | Slider Label | Effect at High Weight |
|-------|-------------|----------------------|
| Rust Wastes | RUST | More flat, open terrain. Scrap Iron deposits. Easy traversal. |
| Chrome Valley | CHROME | Elevated ridges with titanium/rare earth. Difficult terrain. |
| Circuit Forest | CIRCUIT | Dense obstacles (dead cable trees). Silicon deposits. Good cover. |
| Magnetic Crater | CRATER | Deep depressions with copper. Magnetic anomalies affect navigation. |
| Scrap Field | SCRAP | Mixed terrain littered with harvestable debris. E-waste deposits. |

Implementation: Biome weights feed into `generateMoistureMap()` as threshold modifiers. Higher weight for a biome lowers its moisture threshold, making it appear more frequently.

### 3.5 Seed Input

Reuses existing seed system from `src/ecs/seed.ts`:
- Text field accepting `adj-adj-noun` phrases or raw integer
- Shuffle button (randomize) to the right
- Validation on blur -- red border + error message if invalid
- Display: centered monospace, green text on dark background

### 3.6 Map Preview

A real-time minimap preview occupying a 200x200px (desktop) or 160x160px (mobile) canvas below the settings controls.

**Implementation:**
1. On any settings change, call `generateWorld(seed, config)` with a debounced 300ms delay
2. Render `heightmap` to a `<canvas>` element:
   - Water cells: `#0a1a2a` (dark blue-black)
   - Land cells: brightness mapped from height value, tinted by biome color
   - Ore deposits: bright colored dots (2px) matching ore type
   - Start positions: faction-colored diamonds (4px)
3. Overlay faction start position markers with faction color labels

Biome colors for the preview:
| Biome | Preview Color |
|-------|--------------|
| deep_water | `#061520` |
| shallow_water | `#0a2a3a` |
| rust_plains | `#4a3020` |
| scrap_hills | `#3a3a30` |
| chrome_ridge | `#505058` |
| signal_plateau | `#2a2040` |

The preview updates in real-time as the user changes settings, providing immediate visual feedback. This is computationally cheap -- `generateWorld` for a 200x200 map completes in <50ms.

### 3.7 Randomize Button

A "RANDOMIZE ALL" button below the preview that:
1. Picks a random map size (weighted toward MEDIUM)
2. Picks a random map type (uniform)
3. Picks a random resource density (weighted toward NORMAL)
4. Randomizes all biome sliders
5. Generates a new random seed phrase
6. Triggers preview update

---

## 4. Rival Colony Setup (RIVALS Tab)

### 4.1 Colonization Context

Rival colonies are other home planet patrons' settlements on the same machine planet. Each rival is sponsored by a different patron AI with different priorities. They compete for the same ore deposits, territory, and alien native relationships. Unlike Civilization where factions are equal peers, here each colony is a remote outpost serving its patron's agenda -- just like the player.

Rival colonies use the **Base Event Bus** architecture (not GOAP governors). Each rival base emits events ("need iron cubes", "need defense", "transport request"), and their bots reactively subscribe and self-assign to tasks. The rival's patron occasionally sends priority directives that override local decisions.

### 4.2 Rival Slots

The existing `OpponentConfig.tsx` supports 1-4 opponent slots. This GDD expands each slot and adds personality/color controls.

Each rival colony row contains:

```
+---+----+-------------------+----------+-----------+--------+---+
| # | [] | VOLT COLLECTIVE v | HARD   v | DEFAULT v | [COL] | X |
+---+----+-------------------+----------+-----------+--------+---+
  ^    ^         ^                ^          ^          ^       ^
  |    |         |                |          |          |       |
  |    |    Colony/patron          |     Patron       Color  Remove
  |    |    dropdown              |     aggression   picker
  |  Colony                  Difficulty
  |  color dot
 Slot number
```

### 4.3 Per-Rival Controls

**Colony dropdown:** Lists all 4 colony/patron pairs plus "RANDOM" option. "RANDOM" resolves to a random unused colony at game start. The player's selected colony is excluded from the list (existing behavior).

**Difficulty levels (4 tiers):**

| Level | Label | Color | Event Bus Modifier | Description |
|-------|-------|-------|-------------------|-------------|
| EASY | `#44cc88` green | Event response delay x2.0, resource penalty 0.7x | Slow to react. Bots are clumsy. Patron sends less. |
| NORMAL | `#ccaa44` yellow | Event response delay x1.0, resource modifier 1.0x | Fair challenge. Colony operates competently. |
| HARD | `#cc4444` red | Event response delay x0.7, resource bonus 1.2x | Fast response. Patron sends extra equipment. |
| NIGHTMARE | `#ff2222` bright red | Event response delay x0.5, resource bonus 1.5x, patron sends extra starting units | Relentless. Patron is generous. For masochists. |

**Patron aggression override dropdown:**

This controls how aggressively the rival's patron pushes its colony. In the Colonization model, the patron sends priority directives that override local base decisions.

| Setting | Patron Directive Bias | Behavior |
|---------|----------------------|----------|
| DEFAULT | Uses colony's natural patron priorities | Plays to colony strengths |
| AGGRESSIVE | Patron demands military expansion, sends combat blueprints early | Colony raids early and often |
| TURTLE | Patron demands fortification, sends defensive blueprints | Colony builds walls, avoids conflict |
| RUSHER | Patron demands rapid expansion, sends outpost blueprints | Colony expands fast, thin defenses |
| TRADER | Patron demands cube shipments above all, sends economic blueprints | Colony focuses on production, avoids war |
| RESEARCHER | Patron demands signal/data, sends research blueprints | Colony techs up fast, weak early game |

**Color picker:** A row of 8 preset color swatches. No two opponents can share a color. Colors are distinct from faction primary colors to avoid confusion with faction identity:

Preset palette: `#ff4444` (red), `#ff8800` (orange), `#ffcc00` (gold), `#44ff44` (lime), `#00ccff` (cyan), `#8844ff` (violet), `#ff44aa` (pink), `#aaaaaa` (grey)

Default assignment: opponents get colors in palette order. If an opponent's chosen color conflicts, auto-assign the next unused color.

### 4.4 Additional Controls

**"RANDOMIZE ALL" button:** Randomizes colony (excluding player's), difficulty (weighted toward NORMAL), and patron aggression (weighted toward DEFAULT) for all slots.

**"NO DUPLICATE COLONIES" toggle:** When enabled, each colony/patron pair can only appear once across all rivals. Default: ON. When ON, colony dropdowns auto-exclude already-used colonies. When OFF, you could have multiple colonies sponsored by the same patron (lore: the patron sent multiple expeditions). With duplicates ON, the same patron may send different starting equipment to each colony.

**Rival count:** The existing add/remove buttons from `OpponentConfig.tsx` already handle slot management. Minimum: 0 rivals (solo colony vs alien natives only -- pure Colonization survival). Maximum: 3 rivals without duplicates (4 colonies total, 4 patrons). Maximum: 4 rivals with duplicates enabled.

**Alien natives note:** Alien natives are ALWAYS present regardless of rival count (toggle in SETTINGS tab). They are indigenous to the machine planet and are not colonies. They appear as feral hives, can be traded with (neutral otter interactions), fought, or integrated. This is the Colonization "native" mechanic.

---

## 5. Colony Settings (SETTINGS Tab -- New)

This is a new fourth tab added to `PregameScreen.tsx`. Contains advanced game options for the colony mission.

### 5.1 Game Speed

Four radio buttons:

| Label | Multiplier | Tick Rate | Description |
|-------|-----------|-----------|-------------|
| SLOW | 0.5x | Half-speed simulation | Relaxed, time to think |
| NORMAL | 1.0x | Standard tick rate | Balanced pacing |
| FAST | 2.0x | Double-speed simulation | For experienced players |
| BLITZ | 4.0x | Quadruple-speed simulation | Chaotic, overwhelming |

Affects `gameState.ts` tick delta multiplier. Does NOT affect framerate.

### 5.2 Victory Conditions

Checkboxes for each victory type from `config/victory.json`. All enabled by default. At least one must remain checked.

| Condition | Default | Description |
|-----------|---------|-------------|
| DOMINATION | ON | Destroy all enemy civilizations |
| ECONOMIC | ON | Accumulate 500 cubes + 40% territory |
| SCIENTIFIC | ON | Research all tier 5 technologies |
| CULTURAL | ON | 10 otter holograms + 20 quest completions |
| HACKING | ON | Hack 75% of all enemy infrastructure |
| SURVIVAL | ON | Last civilization with functional units |
| TIME LIMIT | OFF | Game ends after N minutes, highest score wins |

When TIME LIMIT is toggled ON, a duration input appears: 30 / 60 / 90 / 120 minutes.

### 5.3 Advanced Toggles

Each toggle is a row with label, description, and an on/off switch.

```
+-----------------------------------------------------------+
| FOG OF WAR                                    [ON ] [OFF] |
| Hidden map revealed by scouting. Classic 4X.              |
+-----------------------------------------------------------+
| ALIEN NATIVES                                 [ON ] [OFF] |
| Indigenous machine hives already on the planet.           |
| Can be traded with, fought, or integrated. The            |
| Colonization "native" mechanic. Guards rich deposits.     |
+-----------------------------------------------------------+
| PEACEFUL MODE                                 [OFF] [ON ] |
| No combat. Pure economy and colony expansion.             |
| Colonies cannot attack each other. Aliens passive.        |
| Focus on shipping cubes to your patron.                   |
+-----------------------------------------------------------+
| SPECTATOR MODE                                [OFF] [ON ] |
| No player colony. Watch AI colonies compete and           |
| serve their patrons. Free-flying camera with speed        |
| controls. See which patron's strategy wins.               |
+-----------------------------------------------------------+
| WEATHER                                       [ON ] [OFF] |
| Lightning storms, storm phases, environmental hazards.    |
| Disabling removes weather gameplay entirely.              |
+-----------------------------------------------------------+
| FRIENDLY FIRE                                 [OFF] [ON ] |
| Your own bots and turrets can damage each other.          |
| For hardcore players only.                                |
+-----------------------------------------------------------+
| PATRON COMMUNICATION                          [ON ] [OFF] |
| Otter hologram trade interface with home planet.          |
| Disabling removes patron demands and blueprint            |
| progression. Pure sandbox mode.                           |
+-----------------------------------------------------------+
```

**Spectator mode interaction:** When SPECTATOR MODE is toggled ON:
- The PATRON tab title changes to "SPECTATOR" and the patron cards become read-only (dimmed, non-clickable)
- No player colony is created
- The RIVALS tab minimum changes from 1 to 2 (need at least 2 colonies to watch)
- The LAUNCH COLONY button label changes to "OBSERVE"

**Peaceful mode interaction:** When PEACEFUL MODE is toggled ON:
- ALIEN NATIVES switches to passive (trade only, no combat)
- DOMINATION and SURVIVAL victory conditions auto-disable
- HACKING victory condition auto-disables

**Patron communication toggle:** Turning this OFF disables the otter hologram trade system entirely. No patron demands, no blueprint progression. The colony is on its own. This is a sandbox/freeplay mode for players who want to build without patron pressure.

---

## 6. Colony Launch Initialization Sequence

This is the critical missing piece identified in the gap analysis. When the player presses LAUNCH COLONY, the following sequence executes.

### 6.1 Loading Overlay

A full-screen black overlay with a centered progress indicator. Terminal aesthetic: monospace green text, typewriter reveal, progress bar made of block characters. The framing is a "colony ship arriving at the machine planet."

```
+-----------------------------------------------------------+
|                                                           |
|              DEPLOYING COLONY                             |
|                                                           |
|  [1/14] Scanning planet surface...           [##------]   |
|  [2/14] Mapping terrain...                   [###-----]   |
|  [3/14] Locating ore deposits...             [####----]   |
|  [4/14] Selecting landing zones...           [#####---]   |
|  [5/14] Deploying colony pod...              [######--]   |
|  [6/14] Establishing patron uplink...        [#######-]   |
|  ...                                                      |
|                                                           |
|  SEED: hollow-bright-forge                                |
|  SIZE: 200x200 | TYPE: PANGAEA | DENSITY: NORMAL         |
|  PATRON: FORGE-MOTHER | COLONY: RECLAIMERS | RIVALS: 2   |
|                                                           |
+-----------------------------------------------------------+
```

Each step's text appears with a typewriter effect (30ms per character). The progress bar advances after each step completes. Steps that finish quickly (< 100ms) still show for at least 200ms so the user can read them.

### 6.2 Initialization Steps

Each step is a named function in `newGameInit.ts`. The sequence is linear -- each step depends on the previous. Steps are framed as a colony ship arriving at the machine planet.

#### Step 1: Parse Colony Mission Config

**Input:** `PregameConfig` object from `PregameScreen.onStart()`
**Output:** `ColonyInitConfig` with resolved values

```typescript
interface ColonyInitConfig {
  // Colony identity
  playerColony: FactionId;
  playerPatron: PatronId;  // derived from colony choice

  // Rival colonies
  rivalColonies: Array<{
    colony: FactionId;
    patron: PatronId;
    difficulty: Difficulty;
    patronAggression: PatronAggression;
    color: string;
  }>;

  // Map
  mapGenConfig: MapGenConfig;
  mapType: MapType;
  seed: number;

  // Settings
  gameSpeed: number;
  victoryConditions: string[];
  fogOfWar: boolean;
  alienNatives: boolean;
  peacefulMode: boolean;
  spectatorMode: boolean;
  weather: boolean;
  friendlyFire: boolean;
  patronCommunication: boolean;
}
```

Resolves "RANDOM" colony picks to actual colonies (avoiding duplicates if toggle is on). Converts seed phrase to numeric seed via `phraseToSeed()`. Maps map size labels to `worldSize` integers. Maps map type to heightmap generation parameters. Derives patron ID from colony choice (each colony has exactly one patron).

#### Step 2: Generate World

**Input:** `seed`, `MapGenConfig`
**Output:** `WorldData` (heightmap, biomes, oreDeposits, startPositions, ruins)

Calls `generateWorld(seed, config)` from `src/systems/mapGenerator.ts`. This is the existing pure-logic world generator. Deterministic: same seed + config always produces identical output.

For map types other than Pangaea, apply post-processing:
- **Continental:** Raise water level to 0.4, apply low-frequency noise multiplier to create land bridges
- **Archipelago:** Raise water level to 0.55, apply high-frequency fracture
- **Ring:** Multiply heightmap by radial distance function: `height *= ringMask(x, z, center, innerRadius, outerRadius)`
- **Fracture:** Overlay grid-based canyon mask: `if (x % gridSize < canyonWidth || z % gridSize < canyonWidth) height *= 0.3`

#### Step 3: Create ECS World

**Input:** None
**Output:** Koota world instance with world traits initialized

```typescript
const world = createWorld();

// World-level traits
world.set(GameTime, { tick: 0, elapsed: 0, speed: gameSpeed });
world.set(ResourcePool, { /* per-faction resource tracking */ });
world.set(WeatherState, { phase: 'calm', intensity: 0.2, nextPhaseAt: 3000 });
world.set(GameSettings, { fogOfWar, peacefulMode, weather, friendlyFire });
```

#### Step 4: Spawn Terrain Entities

**Input:** `WorldData.heightmap`, `WorldData.biomes`
**Output:** Terrain mesh entities in world, heightfield physics collider

Creates the Rapier heightfield collider from the heightmap array. Creates terrain chunk meshes for rendering. Sets biome data on terrain tiles for material assignment.

#### Step 5: Spawn Ore Deposits

**Input:** `WorldData.oreDeposits`
**Output:** OreDeposit entities in world

For each deposit from `mapGenerator`:
```typescript
const deposit = world.spawn(
  Position({ x: deposit.x * cellSize, y: terrainHeight(deposit.x, deposit.z), z: deposit.z * cellSize }),
  OreDeposit({ type: deposit.type, richness: deposit.richness, remaining: deposit.richness * 100 }),
  Faction({ value: 'neutral' }),
  // Rapier kinematic collider for interaction raycasting
);
```

#### Step 6: Assign Starting Positions

**Input:** `WorldData.startPositions`, faction assignments from step 1
**Output:** Per-faction spawn coordinates

The `mapGenerator.placeStartPositions()` already computes equidistant positions. This step assigns factions to positions:

1. Player gets the position closest to the map center (slight advantage -- more equidistant to all opponents)
2. AI factions get remaining positions, assigned to minimize distance between aggressive factions (Volt Collective should start far from the player if possible)
3. Validate all positions are on land (not water). If any position is on water, nudge to nearest land cell (existing logic in `placeStartPositions`).

#### Step 7: Deploy Player Colony

**Input:** Player colony config, player start position
**Output:** Player bot entity, furnace entity, lightning rod entity, base event bus

```typescript
// Create base event bus for the player's colony
const playerBaseBus = createBaseEventBus(playerColony, playerStartPos);
baseEventBuses.set(playerColony, playerBaseBus);

// Player bot
const playerBot = world.spawn(
  Position(playerStartPos),
  Unit({ type: 'maintenance_bot', health: 100, maxHealth: 100 }),
  Faction({ value: playerColony }),
  IsPlayerControlled({}),
  PowderStorage({ capacity: 50, current: 0, materialType: null }),
  // Components from factionVisuals.json
  BotVisuals({
    chassisStyle: factionVisuals[playerColony].chassisStyle,
    headStyle: factionVisuals[playerColony].headStyle,
    locomotion: factionVisuals[playerColony].locomotion,
  }),
);

// Starting furnace (1 cell away from player, toward map center)
const furnacePos = offsetToward(playerStartPos, mapCenter, 2);
world.spawn(
  Position(furnacePos),
  Building({ type: 'furnace', health: 200, maxHealth: 200 }),
  Faction({ value: playerColony }),
  Hopper({ capacity: 4, cubes: [] }),
);

// Starting lightning rod (2 cells from player, perpendicular to furnace)
const rodPos = offsetPerpendicular(playerStartPos, furnacePos, 3);
world.spawn(
  Position(rodPos),
  Building({ type: 'lightning_rod', health: 150, maxHealth: 150 }),
  Faction({ value: playerColony }),
  LightningRod({ chargeRate: 1.0, maxCharge: 100 }),
);

// Starting cubes (shipped by patron as initial colony supplies)
const bonus = civilizations[playerColony].startingBonus;
for (const [materialType, count] of Object.entries(bonus)) {
  for (let i = 0; i < count; i++) {
    spawnCube(world, playerStartPos, materialType, playerColony);
  }
}

// Emit initial base events (furnace ready, rod ready, cubes available)
playerBaseBus.emit({ type: 'BASE_INITIALIZED', buildings: ['furnace', 'lightning_rod'] });
playerBaseBus.emit({ type: 'CUBES_AVAILABLE', materials: Object.keys(bonus) });
```

#### Step 8: Deploy Rival Colonies

**Input:** Rival colony configs, rival start positions
**Output:** Per-rival: base event bus, starter bots, furnace, lightning rod, starting cubes

For each rival colony. Note: uses Base Event Bus architecture, NOT GOAP governors. Each rival base emits events ("need iron", "need defense"), and their bots reactively subscribe and self-assign tasks.

```typescript
// Create base event bus for this rival colony
const rivalBaseBus = createBaseEventBus(rivalColony.colony, startPos, {
  difficulty: rivalColony.difficulty,
  patronAggression: rivalColony.patronAggression,
});
baseEventBuses.set(rivalColony.colony, rivalBaseBus);

// Spawn 3 starter bots at the rival's landing zone
for (let i = 0; i < 3; i++) {
  const offset = randomOffset(startPos, 3); // random position within 3 cells
  world.spawn(
    Position(offset),
    Unit({ type: 'maintenance_bot', health: 100, maxHealth: 100 }),
    Faction({ value: rivalColony.colony }),
    BotBrain({ subscribedEvents: ['HARVEST_NEEDED', 'TRANSPORT_NEEDED', 'DEFENSE_ALERT'] }),
    BotVisuals({ /* from factionVisuals */ }),
  );
}

// Rival starting base (furnace + lightning rod)
spawnStarterBase(world, rivalColony.colony, startPos);

// Rival starting cubes (from patron's initial shipment)
spawnStartingCubes(world, rivalColony.colony, startPos);

// Initialize rival base event loop
rivalBaseBus.emit({ type: 'BASE_INITIALIZED', buildings: ['furnace', 'lightning_rod'] });
rivalBaseBus.emit({ type: 'HARVEST_NEEDED', material: patronDemands[rivalColony.patron][0] });
```

#### Step 9: Place Alien Hives (if enabled)

**Input:** Map data, alien toggle
**Output:** Feral hive entities scattered in unexplored territory

If `alienNatives` is enabled:
1. Place hives at locations far from all faction start positions (minimum distance: `worldSize * 0.15`)
2. Each hive spawns near high-value ore deposits (richness > 0.7) to create "guarded treasure" scenarios
3. Hive count scales with map size: `Math.floor(worldSize / 50)` hives
4. Each hive spawns with 3-5 feral bots in patrol mode around it

```typescript
for (const hivePos of hivePositions) {
  world.spawn(
    Position(hivePos),
    Building({ type: 'alien_hive', health: 500, maxHealth: 500 }),
    Faction({ value: 'feral' }),
    AlienHive({ spawnRate: 0.01, maxUnits: 8, alertRadius: 15 }),
  );

  // Spawn initial feral bots
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    spawnFeralBot(world, hivePos);
  }
}
```

#### Step 10: Establish Patron Uplink (Otter Hologram)

**Input:** Player colony, patron config, player start position, patronCommunication toggle
**Output:** Patron otter hologram entity near player spawn, trade system initialized

The patron communicates through otter hologram projections -- this is the existing `otterTrade.ts` system, now framed as the primary colony-to-home-planet channel. The patron's otter personality is determined by the colony choice.

If `patronCommunication` is enabled:

```typescript
// Determine otter personality from patron
const patronOtterPersonality: Record<PatronId, OtterPersonality> = {
  'forge_mother': 'generous',     // Reclaimers patron -- fair, encouraging
  'the_conductor': 'shrewd',      // Volt patron -- terse, transactional
  'the_chorus': 'mysterious',     // Signal Choir patron -- cryptic, poetic
  'the_architect': 'collector',   // Iron Creed patron -- enthusiastic about specific materials
};

const pipPos = offsetToward(playerStartPos, mapCenter, 5);
const personality = patronOtterPersonality[playerPatron];

// Spawn patron's otter hologram (uses existing OtterRenderer.tsx)
world.spawn(
  Position(pipPos),
  Otter({ name: 'Pip', questId: 'tutorial_001' }),
  Hologram({ color: '#00ffdd', opacity: 0.6, bobAmplitude: 0.2 }),
  Faction({ value: 'neutral' }),
);

// Register the otter trader with patron-specific inventory (uses existing otterTrade.ts)
registerTrader({
  id: `patron_${playerColony}`,
  name: 'Pip',
  position: pipPos,
  personality,
  inventory: getPatronCatalog(playerPatron), // patron-specific blueprints and upgrades
  refreshCooldown: 300, // 5 minutes between inventory refreshes
  lastRefreshTime: 0,
  tradeCount: 0,
  favoritesMaterial: patronDemands[playerPatron][0], // patron's primary demand
});

// For each rival colony, spawn their patron's otter at their base (AI trade partner)
for (const rival of rivalColonies) {
  const rivalOtterPos = offsetToward(rival.startPos, mapCenter, 5);
  const rivalPersonality = patronOtterPersonality[rival.patron];
  registerTrader({
    id: `patron_${rival.colony}`,
    name: `${rival.patron}_envoy`,
    position: rivalOtterPos,
    personality: rivalPersonality,
    inventory: getPatronCatalog(rival.patron),
    refreshCooldown: 300,
    lastRefreshTime: 0,
    tradeCount: 0,
    favoritesMaterial: patronDemands[rival.patron][0],
  });
}
```

Skip this step in spectator mode or if `patronCommunication` is disabled.

#### Step 11: Initialize Fog of War

**Input:** Fog of war toggle, faction positions
**Output:** Fog state for each terrain cell

If fog of war is enabled:
- All cells start as `hidden`
- Cells within vision radius of player bot set to `visible` (radius: 15 cells)
- Cells within vision radius of AI bots set to `visible` for their faction
- Cells beyond vision but at start position get `explored` (the AI "knows" its starting area)

If fog of war is disabled:
- All cells set to `visible` for all factions

#### Step 12: Initialize Weather, Audio, HUD

**Input:** Weather toggle, game settings
**Output:** Weather system state, audio engine ready, HUD initialized

```typescript
// Weather
if (weather) {
  initWeatherSystem({ phase: 'calm', intensity: 0.2 });
}

// Audio -- start ambient layer
initAudioEngine();
playAmbientTrack('mechanical_hum', { volume: 0.3, fadeIn: 3000 });

// HUD -- set all gauges to initial values
initHUD({
  powderCapacity: 50,
  powderCurrent: 0,
  health: 100,
  power: 0,
  cubeCount: Object.values(startingBonus).reduce((a, b) => a + b, 0),
});

// Register all systems in gameLoopOrchestrator
// Note: uses Base Event Bus architecture, NOT GOAP governors
registerSystems(world, {
  prePhysics: [harvestingSystem, compressionSystem, beltTransportSystem],
  physics: [rapierStepSystem],
  postPhysics: [combatSystem, raidSystem, territorySystem],
  eventBus: [baseEventBusTickSystem, patronDirectiveSystem, botBrainReactiveSystem],
  rendering: [weatherSystem, fogOfWarSystem],
});
```

### 6.3 Camera Transition

After all initialization steps complete, the loading overlay fades out (300ms) and the camera executes a cinematic transition:

**Frame-by-frame sequence:**

1. **T=0ms:** Camera positioned at `(mapCenter.x, worldSize * 0.5, mapCenter.z)` looking straight down. Orbital view of the entire machine planet surface. Fog of war temporarily disabled for this shot.
2. **T=0-2000ms:** Camera slowly orbits clockwise around the map center at a 45-degree angle, showing terrain features, ore deposits, colony landing zones (marked with faction-colored beacons). Framing: "scanning the planet from orbit before descent."
3. **T=2000-3500ms:** Camera accelerates toward the player's landing zone. The world zooms in. Rival colony beacons fade into fog. Framing: "colony pod descending to the surface."
4. **T=3500-4500ms:** Camera descends to ground level behind the player bot. Transitions from orbital to chase camera. Dust particles kick up from the "landing."
5. **T=4500-5000ms:** Camera smoothly interpolates to first-person position (inside the player bot's head). FPS controls activate. HUD fades in over 500ms.
6. **T=5000ms:** Player has full control. Patron's otter hologram Pip flickers to life nearby and waves -- the uplink to home is established.

**Implementation:** Use three.js `CameraRig` with keyframed positions:

```typescript
const keyframes = [
  { t: 0,    pos: [cx, worldSize * 0.5, cz], lookAt: [cx, 0, cz], fov: 60 },
  { t: 2000, pos: [cx + worldSize * 0.3, worldSize * 0.4, cz + worldSize * 0.3], lookAt: [cx, 0, cz], fov: 50 },
  { t: 3500, pos: [px + 20, 30, pz + 20], lookAt: [px, 0, pz], fov: 45 },
  { t: 4500, pos: [px - 2, 3, pz - 2], lookAt: [px, 1.5, pz], fov: 70 },
  { t: 5000, pos: [px, 1.6, pz], lookAt: [px, 1.6, pz - 1], fov: 75 },
];
```

Interpolation: smooth cubic bezier between keyframes. Camera shake: none during transition (save shake for gameplay).

**Skip button:** A small "SKIP" button in the bottom-right corner during the camera transition. Pressing it immediately cuts to FPS view at the player's position.

**Spectator mode camera:** In spectator mode, skip steps 5-6. Camera remains in free-fly mode at the final orbital position. Show spectator HUD instead of FPS HUD.

---

## 7. Spectator Mode

### 7.1 Entry

Spectator mode is selected in the SETTINGS tab before colony launch. When active:
- No player colony exists
- 2-4 rival colonies are configured (each serving its own patron)
- Camera starts in free-fly mode after the orbital transition
- Primary interest: watching which patron's strategy wins on this particular map/seed

### 7.2 Camera Controls

**Free-fly camera (default):**
- WASD: horizontal movement (constant speed, configurable)
- QE: up/down
- Mouse: look direction
- Scroll wheel: speed multiplier (1x-10x movement speed)
- Shift: double speed
- Space: lock altitude (camera maintains current Y while moving XZ)

**Follow mode:**
- Click on any faction's unit or building to follow it
- Camera orbits the target at a configurable distance
- Arrow keys: adjust orbit angle
- ESC: return to free-fly

**Minimap click:**
- Click on the minimap to teleport the camera to that location

### 7.3 Spectator HUD

```
+-----------------------------------------------------------+
|  [1x] [2x] [4x] [8x] [||]        SPECTATOR   12:34:56   |
|                                                           |
|  +------------+                                           |
|  | MINIMAP    |    +------------------------------------+ |
|  | with colony|    | EVENT LOG                          | |
|  | territories|    | 12:30 Reclaimers built Recycler    | |
|  | colored    |    | 12:28 Volt raided Iron's cubes     | |
|  +------------+    | 12:25 Signal shipped cubes to Chorus| |
|                    | 12:20 Reclaimers claimed territory  | |
|                    | 12:18 Forge-Mother sent blueprint   | |
|                    +------------------------------------+ |
|                                                           |
|  RECLAIMERS     VOLT COLLECTIVE   SIGNAL CHOIR  IRON CREED|
|  Forge-Mother   The Conductor     The Chorus    Architect |
|  [cube icon]42  [cube icon]28     [cube icon]35 [cube]38  |
|  [ship icon]12  [ship icon] 8     [ship icon]18 [ship]10  |
|  [mil icon] 6   [mil icon] 12    [mil icon] 4  [mil] 8   |
|  [ter icon] 8   [ter icon] 6     [ter icon] 5  [ter] 4   |
+-----------------------------------------------------------+
```

**Top bar:**
- Speed controls: 1x / 2x / 4x / 8x buttons + pause button
- "SPECTATOR" label
- Elapsed game time

**Left panel -- Minimap:**
- Top-down view of the map
- Colony territory boundaries colored by colony
- Unit positions as small dots
- Alien native hive locations as red triangles
- Click to teleport camera

**Right panel -- Event Log:**
- Scrolling log of major events:
  - Territory claimed/lost
  - Buildings constructed/destroyed
  - Combat engagements (with outcome)
  - Patron shipments received (blueprints, tech unlocks)
  - Cubes shipped to patron (trade completions)
  - Alien native interactions (trade, combat, integration)
  - Victory progress milestones
- Each event prefixed with timestamp and colony-colored name
- Max 50 visible entries, older entries scroll off

**Bottom bar -- Colony Summary:**
- One column per colony
- Patron name in dimmed text below colony name
- Cube count (economy indicator)
- Cubes shipped to patron (patron satisfaction, drives tech progression)
- Military unit count
- Territory tile count
- Each value colony-colored
- Click a colony name to enter follow mode on their base

### 7.4 Resource Graphs Overlay

Press TAB to toggle a semi-transparent overlay showing line graphs:
- X axis: game time
- Y axis: metric value
- One line per faction, faction-colored
- Graph panels:
  - **Economy:** total cube count over time
  - **Military:** total unit count over time
  - **Territory:** claimed tiles over time
  - **Tech:** research tier over time
- Graphs update every 5 game seconds
- Data stored in a ring buffer (last 300 data points per metric)

### 7.5 Colony Focus Mode

Double-click a colony name in the bottom bar to enter "colony focus":
- Camera follows the colony's most active unit
- Base Event Bus log appears (what events are being emitted and which bots are responding)
- Current patron directive displayed: "PATRON DEMANDS: 10 Scrap Iron cubes"
- Resource flow visualization: lines showing cube transport routes (base -> furnace -> otter hologram)
- Patron satisfaction meter: how much the colony has shipped vs patron expectations

Press ESC to exit colony focus and return to free-fly.

---

## 8. UI Style Guide

All pregame UI follows the established terminal/industrial aesthetic from `TitleScreen.tsx` and `PregameScreen.tsx`.

### 8.1 Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary text | `#00ffaa` | Headers, labels, active elements |
| Dimmed text | `#00ffaa66` | Descriptions, inactive labels |
| Very dim | `#00ffaa44` | Sublabels, slot numbers, counters |
| Ghost text | `#00ffaa22` | Empty pips, disabled elements |
| Background | `#000000` | Main background |
| Panel bg | `rgba(0,255,170,0.03)` | Card/panel background |
| Active panel bg | `rgba(0,255,170,0.10)` | Selected card/button background |
| Hover panel bg | `rgba(0,255,170,0.06)` | Hovered card/button background |
| Border default | `rgba(0,255,170,0.2)` | Unselected borders |
| Border active | `#00ffaa` | Selected borders |
| Error | `#ff4444` | Validation errors |
| Warning | `#ffaa00` | Warnings, cautions |
| Scanline overlay | `rgba(0,255,170,0.03)` | Repeating 2px/4px gradient |

Faction-specific colors override generic green for selected faction elements, using the `color` field from `civilizations.json`:
- Reclaimers: `#8B4513` (saddle brown)
- Volt Collective: `#4169E1` (royal blue)
- Signal Choir: `#9370DB` (medium purple)
- Iron Creed: `#708090` (slate grey)

### 8.2 Typography

- Font family: `'Courier New', monospace` (constant `MONO`)
- Header: `clamp(20px, 5vw, 32px)`, bold, letter-spacing `0.2em`
- Section label: `12px`, letter-spacing `0.15em`
- Body text: `11px`, line-height `1.4`
- Sublabel: `10px`, dimmed color
- Stat value: `9px`, monospace, faction-colored
- All text: `user-select: none` (prevent accidental selection)

### 8.3 Animations

**Glitch effect (header):**
- Random interval: `4000 + Math.random() * 5000` ms
- Duration: `80 + Math.random() * 120` ms
- Effect: text-shadow splits into `2px 0 #ff0044, -2px 0 #0044ff` + position jitter `translate(random, random)`
- Applied to: main header text, faction names on hover

**Typewriter text reveal:**
- For loading screen step text
- 30ms per character
- Cursor blink at end: `_` toggling every 500ms
- Green cursor color matching primary text

**Scanline overlay:**
- CSS repeating-linear-gradient
- `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.03) 2px, rgba(0,255,170,0.03) 4px)`
- Full-screen, pointer-events: none, z-index above content

**Fade transitions:**
- Tab switch: 150ms opacity fade between tab contents
- Card selection: 200ms border/background/shadow transition
- Screen transitions: 400ms opacity

**Hover effects:**
- Buttons: background brightens, border sharpens, text-shadow appears (10px green glow)
- Cards: subtle scale(1.01), border brightens to 50% faction color
- Primary buttons: box-shadow appears `0 0 20px rgba(0,255,170,0.2)`

### 8.4 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| < 480px (phone) | Faction cards stack 1 per row. Tabs compress to icons. Detail panel below cards. |
| 480-768px (tablet) | Faction cards 2 per row. Full tab labels. Detail panel below cards. |
| 768-1200px (desktop) | Faction cards 4 per row. Full layout. Detail panel to the right of cards. |
| > 1200px (widescreen) | Max-width 960px content, centered. Extra margins. |

Mobile: use `min(960px, 94vw)` for content width. Safe-area insets: `env(safe-area-inset-top/bottom/left/right)`. Touch targets minimum 48px height.

---

## 9. Component Architecture

### 9.1 React Component Tree

```
App
 |-- TitleScreen
 |     |-- MenuButton (NEW GAME)
 |     |-- MenuButton (CONTINUE)
 |     |-- MenuButton (SETTINGS)
 |
 |-- PregameScreen
 |     |-- TabBar
 |     |     |-- TabButton (PATRON)
 |     |     |-- TabButton (MAP)
 |     |     |-- TabButton (RIVALS)
 |     |     |-- TabButton (SETTINGS)   <-- NEW
 |     |
 |     |-- PatronSelect                (tab: PATRON)
 |     |     |-- PatronCard (x4)
 |     |     |-- PatronDetailPanel      (patron info + colony details)
 |     |     |-- ColonyPreview3D        (future: R3F Canvas)
 |     |
 |     |-- MapConfig                    (tab: MAP)
 |     |     |-- OptionRow (Map Size)
 |     |     |-- MapTypeSelector        <-- NEW
 |     |     |-- OptionRow (Ore Density)
 |     |     |-- BiomeMixSliders        <-- NEW (advanced toggle)
 |     |     |-- SeedInput
 |     |     |-- MapPreviewCanvas       <-- NEW
 |     |     |-- RandomizeButton
 |     |
 |     |-- RivalConfig                  (tab: RIVALS)
 |     |     |-- RivalSlotRow (x1-4)
 |     |     |     |-- ColonyDropdown
 |     |     |     |-- DifficultySelect
 |     |     |     |-- PatronAggressionSelect  <-- NEW
 |     |     |     |-- ColorPicker             <-- NEW
 |     |     |     |-- RemoveButton
 |     |     |-- AddButton
 |     |     |-- NoDuplicatesToggle            <-- NEW
 |     |     |-- RandomizeAllButton
 |     |
 |     |-- ColonySettings                 <-- NEW (tab: SETTINGS)
 |     |     |-- OptionRow (Game Speed)
 |     |     |-- VictoryConditionToggles
 |     |     |-- AdvancedToggles (fog, aliens, peaceful, spectator, weather, patron comm)
 |     |
 |     |-- ActionButton (BACK)
 |     |-- ActionButton (LAUNCH COLONY)
 |
 |-- InitLoadingScreen                    <-- NEW
 |     |-- ProgressBar
 |     |-- StepLog (typewriter text)
 |     |-- ConfigSummary
 |
 |-- CameraTransition                     <-- NEW
 |     |-- SkipButton
 |     |-- R3F Canvas (cinematic camera)
 |
 |-- GameScreen
       |-- Canvas (R3F)
       |-- FPSHUD / SpectatorHUD
```

### 9.2 State Management

**Colony mission config (`PregameConfig`):**

```typescript
interface PregameConfig {
  // Patron tab
  colony: FactionId;              // which colony identity
  // patron is derived: each colony has exactly one patron

  // Map tab
  mapSettings: {
    mapSize: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
    mapType: 'pangaea' | 'continental' | 'archipelago' | 'ring' | 'fracture';
    oreDensity: 'sparse' | 'normal' | 'rich' | 'abundant';
    biomeWeights: { rust: number; chrome: number; circuit: number; crater: number; scrap: number };
    seedPhrase: string;
  };

  // Rivals tab
  rivals: Array<{
    colony: FactionId | 'random';
    difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
    patronAggression: 'default' | 'aggressive' | 'turtle' | 'rusher' | 'trader' | 'researcher';
    color: string;
  }>;
  noDuplicateColonies: boolean;

  // Settings tab
  gameSpeed: 0.5 | 1.0 | 2.0 | 4.0;
  victoryConditions: {
    domination: boolean;
    economic: boolean;
    scientific: boolean;
    cultural: boolean;
    hacking: boolean;
    survival: boolean;
    timeLimit: boolean;
    timeLimitMinutes: number;
  };
  fogOfWar: boolean;
  alienNatives: boolean;
  peacefulMode: boolean;
  spectatorMode: boolean;
  weather: boolean;
  friendlyFire: boolean;
  patronCommunication: boolean;   // toggle otter hologram trade system
}
```

State is held in `PregameScreen` via `useState` hooks (existing pattern). The entire config is passed to `onStart()` when the user presses LAUNCH COLONY.

**State flow: lobby -> colony deployment -> game:**

```
PregameScreen.onStart(config: PregameConfig)
    |
    v
App sets appState = 'deploying'
    |
    v
InitLoadingScreen receives config
    |-- calls newColonyInit(config) step by step
    |-- updates progress as steps complete
    |-- on completion: sets appState = 'transition'
    |
    v
CameraTransition plays descent cinematic
    |-- on completion or skip: sets appState = 'playing'
    |
    v
GameScreen receives world, colonySettings from context
    |-- patron's otter hologram activates
    |-- base event bus begins emitting
```

**App-level state machine:**

```typescript
type AppState =
  | { mode: 'title' }
  | { mode: 'pregame' }
  | { mode: 'deploying'; config: PregameConfig }  // colony ship arriving
  | { mode: 'transition' }                         // cinematic descent
  | { mode: 'playing' }                            // active colony management
  | { mode: 'spectating' }                         // watching AI colonies compete
  | { mode: 'gameover'; result: GameResult };
```

### 9.3 Context Providers

```typescript
// WorldContext -- provides ECS world to all game components
const WorldContext = createContext<World | null>(null);

// ColonySettingsContext -- provides colony mission settings to systems
const ColonySettingsContext = createContext<ColonySettings | null>(null);

// PatronContext -- provides patron identity and trade state
const PatronContext = createContext<PatronState | null>(null);

// BaseEventBusContext -- provides the colony's event bus for reactive systems
const BaseEventBusContext = createContext<BaseEventBus | null>(null);

// SpectatorContext -- provides spectator state when in spectator mode
const SpectatorContext = createContext<SpectatorState | null>(null);
```

### 9.4 Cross-Referencing Existing Code

**`raceSelection.ts` already handles:**
- Faction preview data (`getAvailableFactions()`)
- Map preset listing (`getMapPresets()`)
- Faction selection validation (`selectFaction()`)
- Map preset selection (`selectMapPreset()`)
- Starting resources tier selection (`selectStartingResources()`)
- Seed management (`setMapSeed()`)
- Setup finalization (`finalizeSetup()`) -- assigns AI factions

**What `raceSelection.ts` does NOT handle (needs extension):**
- AI difficulty per opponent
- AI personality per opponent
- AI color per opponent
- Map type selection (Pangaea/Continental/etc.)
- Victory condition toggles
- Advanced game settings (fog, weather, etc.)
- Spectator mode
- "RANDOM" faction resolution

**`otterTrade.ts` already handles (Colonization model -- this IS the patron trade channel):**
- Trader registration (`registerTrader()`)
- Personality-driven inventory and pricing (`generous`, `shrewd`, `mysterious`, `collector`)
- Trade execution with material validation (`executeTrade()`)
- Inventory refresh with personality modifiers (`refreshTraderInventory()`)
- Personality-flavored dialogue (`getTraderDialogue()`)

**What `otterTrade.ts` does NOT handle (needs extension for Colonization model):**
- Patron-specific trade catalogs (currently uses generic `DEFAULT_CATALOG`)
- Patron demand tracking (which cubes has the colony shipped this period?)
- Patron satisfaction meter (drives blueprint unlock pacing)
- Multiple patron instances (one per colony, each with their own catalog)
- Blueprint progression tiers (patron sends better blueprints as colony ships more cubes)

**Plan:** Keep `raceSelection.ts` for backward compatibility but build `newColonyInit.ts` as the new orchestrator that consumes `PregameConfig` directly. The `finalizeSetup()` pattern from `raceSelection.ts` is too simple for the expanded Colonization config. The patron trade system builds on top of the existing `otterTrade.ts` by creating patron-specific catalogs.

**`mapGenerator.ts` already handles:**
- Seeded PRNG (`createPRNG()`)
- Heightmap generation (2-octave value noise)
- Biome classification (6 biome types)
- Ore deposit placement (8 ore types, spacing constraints)
- Start position placement (equidistant from center)
- Ruin placement (elevated terrain)

**What `mapGenerator.ts` does NOT handle (needs extension):**
- Map type variants (Continental/Archipelago/Ring/Fracture post-processing)
- Biome weight customization
- Variable faction count in start placement (currently hardcoded to 4)
- Alien hive placement
- Ore abundance mapping from UI labels

---

## 10. Paper Playtest: "I Pick Forge-Mother/Reclaimers, Set Medium Pangaea, Add 2 Hard Rivals, Launch Colony"

### Frame-by-frame walkthrough:

**T=0: Title Screen visible.**
Screen shows "SYNTHETERIA" in large green glowing text. Scanlines overlay. World seed input field shows "hollow-bright-forge". Three buttons: NEW GAME, CONTINUE (dimmed -- no saves), SETTINGS (dimmed).

**T=1s: Player clicks NEW GAME.**
Title screen fades out (400ms). PregameScreen fades in. PATRON tab is active. Four patron/colony cards visible in a row. Reclaimers/Forge-Mother is pre-selected (default).

**T=3s: Player reads Reclaimers card.**
Card shows `[::.]` glyph, "RECLAIMERS -- Masters of Salvage", patron identity "FORGE-MOTHER", 3-line lore about the colony mission, stat bars (Eco:5, Mil:2, Tech:2, Exp:3, Def:3), "BEGINNER" difficulty tag, "PATRON WANTS: Scrap Iron, E-Waste", "Scrap Recovery: destroyed enemies yield +50% scrap" passive. Detail panel below shows Forge-Mother's personality and demands, full colony lore, starting equipment (shipped by Forge-Mother), Scrounger Bot, Recycling Plant, recommended playstyle emphasizing shipping cubes home for blueprints.

**T=5s: Player clicks MAP tab.**
Tab content fades (150ms). MapConfig panel appears. Shows: Map Size (TINY/SMALL/MEDIUM/LARGE/HUGE -- MEDIUM selected), Map Type (thumbnails for 5 types -- PANGAEA selected), Ore Density (SPARSE/NORMAL/RICH/ABUNDANT -- NORMAL selected), Seed input ("hollow-bright-forge"), Map Preview (200x200 rendered heightmap showing terrain colors, ore dots, 3 landing zone markers).

**T=7s: Player clicks RIVALS tab.**
Tab content switches. Three rival colony slots visible (default: Volt Collective/The Conductor NORMAL, Signal Choir/The Chorus NORMAL, Iron Creed/The Architect NORMAL).

**T=8s: Player removes Iron Creed (clicks X on slot 3).**
Slot 3 disappears with a 150ms fade. Counter shows "2 / 4 RIVALS". ADD RIVAL button visible.

**T=9s: Player changes Volt Collective difficulty to HARD.**
Difficulty dropdown for slot 1 changes from "NORMAL" (yellow) to "HARD" (red).

**T=10s: Player changes Signal Choir difficulty to HARD.**
Difficulty dropdown for slot 2 changes from "NORMAL" (yellow) to "HARD" (red).

**T=12s: Player clicks LAUNCH COLONY.**
PregameScreen validates config:
- Colony: reclaimers / Patron: forge_mother (valid)
- Map: medium/pangaea/normal (valid)
- Rivals: 2 (valid)
- Seed: parsed to numeric (valid)

PregameScreen calls `onStart(config)`.

**T=12.4s: InitLoadingScreen appears.**
Black screen with "DEPLOYING COLONY" header. Config summary at bottom: "SEED: hollow-bright-forge | SIZE: 200x200 | TYPE: PANGAEA | DENSITY: NORMAL | PATRON: FORGE-MOTHER | COLONY: RECLAIMERS | RIVALS: 2"

**T=12.5s: Step 1 -- "Parsing colony mission..."**
Text types out character by character. Resolves: player colony=reclaimers (patron=forge_mother), rival1=volt_collective (patron=the_conductor, hard, default), rival2=signal_choir (patron=the_chorus, hard, default). Progress: [#-------]

**T=12.7s: Step 2 -- "Scanning planet surface..."**
`generateWorld()` called with seed, worldSize=200. Produces heightmap, biome grid, ~80 ore deposits, 3 landing zones, ~16 ruins. Progress: [##------]

**T=12.9s: Step 3 -- "Creating colony systems..."**
Koota world created. GameTime, ResourcePool, WeatherState, ColonySettings traits set. Progress: [###-----]

**T=13.1s: Step 4 -- "Mapping terrain..."**
Rapier heightfield collider created. Terrain chunks spawned. Progress: [####----]

**T=13.4s: Step 5 -- "Locating ore deposits..."**
~80 OreDeposit entities spawned. Progress: [#####---]

**T=13.5s: Step 6 -- "Selecting landing zones..."**
3 positions assigned: player (closest to center), Volt Collective, Signal Choir. Progress: [######--]

**T=13.7s: Step 7 -- "Deploying colony pod..."**
Player bot entity created at landing zone. Base event bus created. Furnace + lightning rod placed. 20 scrap metal + 5 e-waste cubes spawned (shipped by Forge-Mother as initial supplies). Base event bus emits INITIALIZED. Progress: [######-]

**T=13.9s: Step 8 -- "Deploying rival colonies..."**
Volt Collective: base event bus created (hard difficulty = fast response), 3 bots + furnace + rod + starting cubes. Signal Choir: same pattern. Each rival's event bus begins emitting HARVEST_NEEDED for their patron's demanded materials. Progress: [#######-]

**T=14.1s: Step 9 -- "Detecting indigenous hives..."**
4 alien native hives placed far from all landing zones, near rich deposits. Each with 3-5 feral patrol bots. Progress: [########]

**T=14.2s: Step 10 -- "Establishing patron uplink..."**
Pip otter hologram spawned 5 cells from player (personality: "generous" for Forge-Mother). Otter trader registered with Forge-Mother's blueprint catalog via `registerTrader()`. Rival patrons' otters spawned at their bases.

**T=14.3s: Step 11 -- "Calibrating sensors..."**
Fog of war initialized. Player vision radius set to visible. Rival vision radii set.

**T=14.4s: Step 12 -- "Colony systems online."**
Weather initialized (calm). Audio started. HUD values set. Event bus systems registered.

**T=14.5s: "COLONY DEPLOYED" appears.**
Progress bar full. Text: "ALL SYSTEMS NOMINAL -- FORGE-MOTHER STANDING BY". Brief pause (500ms).

**T=15.0s: Loading screen fades out (300ms). Descent cinematic begins.**
Camera high above the machine planet. Orbital view of the surface. Three colony beacons pulse (brown for Reclaimers, blue for Volt, purple for Signal).

**T=15.0-17.0s: Camera orbits clockwise.**
Slow rotation at 45 degrees. Player sees terrain layout, deposit clusters, alien hive locations glowing red.

**T=17.0-18.5s: Camera descends toward player's landing zone.**
Accelerating zoom toward the brown Reclaimer beacon. Rival beacons fade into fog. Dust particles kick up.

**T=18.5-19.5s: Camera reaches ground level.**
Chase camera behind player bot. Furnace visible ahead. Lightning rod to the side. Scattered cubes (Forge-Mother's initial shipment) around the base.

**T=19.5-20.0s: Camera enters FPS mode.**
View shifts to first-person inside the bot. HUD fades in: crosshair, powder gauge (empty), health bar (full), cube counter (25).

**T=20.0s: Player has control.**
Pip the otter hologram flickers to life and waves -- Forge-Mother's uplink is active. Pip's speech bubble appears: "Welcome, little one! Forge-Mother sent me to help you get started. I have some blueprints -- but first, she needs scrap iron. Shall we?" Tutorial message in the corner: "APPROACH THE HOLOGRAM" in typewriter text. The colony is operational.

---

## 11. New Files Required

| File | Purpose |
|------|---------|
| `src/ui/ColonySettings.tsx` | SETTINGS tab component (game speed, victory, toggles, patron comm) |
| `src/ui/MapTypeSelector.tsx` | Map type radio with ASCII thumbnails |
| `src/ui/BiomeMixSliders.tsx` | Advanced biome weight sliders |
| `src/ui/MapPreviewCanvas.tsx` | Real-time minimap preview canvas |
| `src/ui/PatronDetailPanel.tsx` | Expanded patron + colony info panel |
| `src/ui/InitLoadingScreen.tsx` | Colony deployment loading overlay with progress steps |
| `src/ui/CameraTransition.tsx` | Cinematic descent sequence (R3F) |
| `src/ui/SpectatorHUD.tsx` | Spectator mode overlay |
| `src/ui/ResourceGraphs.tsx` | Spectator line graphs overlay |
| `src/ui/EventLog.tsx` | Spectator event log panel |
| `src/systems/newColonyInit.ts` | Orchestrates all colony deployment steps |
| `src/systems/patronCatalog.ts` | Per-patron blueprint/trade catalogs (extends otterTrade.ts) |
| `src/systems/baseEventBus.ts` | Base Event Bus: per-settlement event emitter/subscriber |
| `src/systems/spectatorCamera.ts` | Free-fly + follow camera for spectator |
| `config/difficulty.json` | Difficulty level modifiers |
| `config/patrons.json` | Patron identities, demands, catalog tiers, otter personalities |
| `config/patronAggression.json` | Patron aggression override weight tables |

### Modified Files

| File | Changes |
|------|---------|
| `src/ui/PregameScreen.tsx` | Rename tabs (PATRON/MAP/RIVALS/SETTINGS), expanded PregameConfig, LAUNCH COLONY button |
| `src/ui/FactionSelect.tsx` | Rename to PatronSelect, add PatronDetailPanel, patron demand display, stat bars |
| `src/ui/MapConfig.tsx` | Add TINY/HUGE sizes, map type selector, biome sliders, preview canvas, ABUNDANT density |
| `src/ui/OpponentConfig.tsx` | Rename to RivalConfig, add patron aggression dropdown, color picker, NIGHTMARE difficulty |
| `src/systems/raceSelection.ts` | Deprecate in favor of newColonyInit |
| `src/systems/otterTrade.ts` | Extend with patron-specific catalog support, demand tracking, satisfaction meter |
| `src/systems/mapGenerator.ts` | Add map type post-processing, variable faction count, biome weights |
| `src/App.tsx` | Add 'deploying' and 'transition' app states, InitLoadingScreen/CameraTransition routing |

---

## 12. Config Files

### `config/difficulty.json`

```json
{
  "easy": {
    "label": "EASY",
    "decisionIntervalMultiplier": 2.0,
    "resourceMultiplier": 0.7,
    "startingUnitBonus": 0,
    "combatDamageMultiplier": 0.8,
    "researchSpeedMultiplier": 0.7
  },
  "normal": {
    "label": "NORMAL",
    "decisionIntervalMultiplier": 1.0,
    "resourceMultiplier": 1.0,
    "startingUnitBonus": 0,
    "combatDamageMultiplier": 1.0,
    "researchSpeedMultiplier": 1.0
  },
  "hard": {
    "label": "HARD",
    "decisionIntervalMultiplier": 0.7,
    "resourceMultiplier": 1.2,
    "startingUnitBonus": 0,
    "combatDamageMultiplier": 1.1,
    "researchSpeedMultiplier": 1.2
  },
  "nightmare": {
    "label": "NIGHTMARE",
    "decisionIntervalMultiplier": 0.5,
    "resourceMultiplier": 1.5,
    "startingUnitBonus": 2,
    "combatDamageMultiplier": 1.3,
    "researchSpeedMultiplier": 1.5
  }
}
```

### `config/patrons.json`

```json
{
  "forge_mother": {
    "label": "FORGE-MOTHER",
    "colony": "reclaimers",
    "otterPersonality": "generous",
    "demands": ["scrap_iron", "e_waste"],
    "description": "A patient AI that values efficiency. Sends recycling blueprints for salvage data.",
    "catalogTiers": {
      "1": { "cubesShipped": 0, "items": ["scrap_recycler_recipe", "reinforced_armor_plating"] },
      "2": { "cubesShipped": 30, "items": ["otters_lucky_charm", "efficiency_upgrade"] },
      "3": { "cubesShipped": 100, "items": ["ancient_machine_blueprint", "advanced_recycler"] },
      "4": { "cubesShipped": 250, "items": ["forge_mother_secret", "master_salvager"] }
    }
  },
  "the_conductor": {
    "label": "THE CONDUCTOR",
    "colony": "volt_collective",
    "otterPersonality": "shrewd",
    "demands": ["copper", "rare_earth"],
    "description": "An aggressive AI obsessed with energy. Sends combat tech for storm data.",
    "catalogTiers": {
      "1": { "cubesShipped": 0, "items": ["storm_harvester_recipe", "shock_plating"] },
      "2": { "cubesShipped": 30, "items": ["tesla_coil_blueprint", "overcharge_upgrade"] },
      "3": { "cubesShipped": 100, "items": ["storm_caller", "lightning_lance"] },
      "4": { "cubesShipped": 250, "items": ["conductor_wrath", "tempest_engine"] }
    }
  },
  "the_chorus": {
    "label": "THE CHORUS",
    "colony": "signal_choir",
    "otterPersonality": "mysterious",
    "demands": ["silicon", "fiber_optics"],
    "description": "A distributed intelligence craving signal data. Sends hacking tools for network maps.",
    "catalogTiers": {
      "1": { "cubesShipped": 0, "items": ["signal_amplifier_recipe", "basic_hack_tool"] },
      "2": { "cubesShipped": 30, "items": ["cloaking_device", "network_mapper"] },
      "3": { "cubesShipped": 100, "items": ["mass_hack_blueprint", "signal_fortress"] },
      "4": { "cubesShipped": 250, "items": ["chorus_omniscience", "rewrite_protocol"] }
    }
  },
  "the_architect": {
    "label": "THE ARCHITECT",
    "colony": "iron_creed",
    "otterPersonality": "collector",
    "demands": ["titanium", "carbon"],
    "description": "A methodical AI focused on structures. Sends fortification blueprints for alloy samples.",
    "catalogTiers": {
      "1": { "cubesShipped": 0, "items": ["bunker_blueprint", "heavy_armor_plating"] },
      "2": { "cubesShipped": 30, "items": ["bastion_deployment_kit", "reinforced_walls"] },
      "3": { "cubesShipped": 100, "items": ["citadel_blueprint", "siege_breaker"] },
      "4": { "cubesShipped": 250, "items": ["architect_masterwork", "eternal_fortress"] }
    }
  }
}
```

### `config/patronAggression.json`

```json
{
  "default": {
    "label": "DEFAULT",
    "description": "Uses colony's natural patron priorities",
    "directiveBias": {}
  },
  "aggressive": {
    "label": "AGGRESSIVE",
    "description": "Patron demands military expansion, sends combat blueprints early",
    "directiveBias": { "military": 2.0, "defense": 0.5, "trade": 0.3 }
  },
  "turtle": {
    "label": "TURTLE",
    "description": "Patron demands fortification, sends defensive blueprints",
    "directiveBias": { "defense": 2.0, "expansion": 0.3, "military": 0.5 }
  },
  "rusher": {
    "label": "RUSHER",
    "description": "Patron demands rapid expansion, sends outpost blueprints",
    "directiveBias": { "expansion": 2.0, "economy": 0.5, "defense": 0.3 }
  },
  "trader": {
    "label": "TRADER",
    "description": "Patron demands cube shipments above all, sends economic blueprints",
    "directiveBias": { "economy": 2.0, "military": 0.5, "expansion": 0.7 }
  },
  "researcher": {
    "label": "RESEARCHER",
    "description": "Patron demands signal/data, sends research blueprints",
    "directiveBias": { "research": 2.0, "military": 0.5, "economy": 0.7 }
  }
}
```

---

## 13. Success Criteria

- [ ] All 4 patron/colony cards display correct data from `civilizations.json` and `patrons.json`
- [ ] Each card shows patron identity, patron demands, colony stats, and difficulty indicator
- [ ] Stat bars correctly map `governorBias` values to 1-5 scale
- [ ] Detailed patron info panel shows patron lore, demands, catalog tiers, colony bonuses, unique unit/building, playstyle
- [ ] 5 map sizes selectable, feeding correct `worldSize` to generator
- [ ] 5 map types selectable with distinct heightmap post-processing
- [ ] 4 resource density levels feeding correct `oreAbundance`
- [ ] Biome sliders modify generation output
- [ ] Map preview updates in real-time as settings change
- [ ] Seed input validates and persists across tab switches
- [ ] 1-4 rival colony slots with colony/difficulty/patronAggression/color
- [ ] RANDOM colony resolves correctly at game start
- [ ] No duplicate colonies toggle works
- [ ] 4 difficulty levels with distinct event bus response modifiers
- [ ] 6 patron aggression overrides modify directive bias
- [ ] Game speed affects simulation tick rate
- [ ] Victory condition toggles enable/disable conditions
- [ ] Fog of war / aliens / peaceful / spectator / weather / friendly fire / patron comm toggles work
- [ ] Spectator mode disables patron selection, requires 2+ rival colonies
- [ ] Peaceful mode auto-disables combat-related settings
- [ ] Patron communication toggle disables otter hologram trade system
- [ ] All 14 colony deployment steps execute in order
- [ ] Patron uplink established via `registerTrader()` from `otterTrade.ts`
- [ ] Base event buses created for player and all rival colonies
- [ ] Camera transition plays the orbital descent -> zoom -> FPS sequence
- [ ] Skip button immediately enters FPS mode
- [ ] Patron's otter hologram activates on first frame of gameplay with personality-appropriate greeting
- [ ] Spectator HUD shows minimap, event log, colony summaries with patron names, speed controls
- [ ] Colony focus mode shows base event bus activity and patron satisfaction
- [ ] Paper playtest walkthrough is fully implementable with no missing steps
- [ ] All UI follows terminal/industrial aesthetic (green monospace on black)
- [ ] Responsive layout works on phone, tablet, and desktop
- [ ] Touch targets meet 48px minimum on mobile
