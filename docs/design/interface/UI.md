# Syntheteria UI Design -- Authoritative Interface Document

**Status:** Active
**Date:** 2026-03-11
**Scope:** Complete UI/UX specification covering aesthetic philosophy, design system, every screen from title through gameplay, and accessibility requirements.

See also: `docs/design/gameplay/AUDIO.md` — UI beep, alert sound, AudioSettingsPanel (volume sliders), audio bus defaults, raid alert audio treatment.

---

## 1. UI Philosophy

### Core Principle

> "Your world is only as complete as what your machines have seen. Everything else is void."

The player is a broken robot. The interface reflects that identity: a **machine-vision overlay** projected onto the inside of your chassis. Every UI element is something the robot's internal systems would display -- sensor readings, power gauges, signal strength meters, threat indicators. Nothing decorative. Everything functional.

### Industrial Terminal Aesthetic

The UI draws from industrial control panels, CRT monitors, and military heads-up displays. It is **utilitarian and information-dense** -- the kind of interface built by machines for machines, not by designers for consumers.

- **Monospace text** everywhere -- data readouts, not marketing copy
- **Scan lines** overlaid on the viewport -- you are looking through a sensor feed
- **Glitch artifacts** on headers and transitions -- imperfect signal processing
- **Typewriter text reveal** for loading and narrative sequences -- data streaming in
- **Dark backgrounds with bright accent text** -- low-power display technology

### Information Density

The HUD communicates maximum data in minimum space. A player glancing at the screen should instantly read:
- Current powder/cube stockpile
- Health and power state
- What they are looking at (object identification)
- Available actions on that object
- Nearby threats

No modal dialogs or heavy chrome. Information flows as overlaid readouts -- always present, never blocking gameplay.

### Inspirations

- **Duskers** -- drone control through limited interfaces, fog of war, tension from the unknown
- **Hacknet** -- terminal/data-driven interface elements
- **FTL** -- managing systems under pressure, text-based events
- **SOMA** -- abstract consciousness themes

---

## 2. Design System

### 2.1 Color Palette

**Menu screens (title, pregame lobby, pause):**

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

**Faction-specific colors** override generic green for selected faction elements, using the `color` field from `civilizations.json`:

| Faction | Color | Hex |
|---------|-------|-----|
| Reclaimers | Saddle brown | `#8B4513` |
| Volt Collective | Royal blue | `#4169E1` |
| Signal Choir | Medium purple | `#9370DB` |
| Iron Creed | Slate grey | `#708090` |

**In-game HUD** uses the same palette with the player's faction accent color replacing generic green where appropriate. The `setHUDFaction()` call at game start configures this globally.

**Rival color palette** (distinct from faction primary colors):
`#ff4444` (red), `#ff8800` (orange), `#ffcc00` (gold), `#44ff44` (lime), `#00ccff` (cyan), `#8844ff` (violet), `#ff44aa` (pink), `#aaaaaa` (grey)

### 2.2 Typography

| Level | Size | Weight | Spacing | Notes |
|-------|------|--------|---------|-------|
| Header | `clamp(20px, 5vw, 32px)` | Bold | `0.2em` | Glitch effect on hover/interval |
| Section label | `12px` | Normal | `0.15em` | Tab headers, panel titles |
| Body text | `11px` | Normal | Normal | `line-height: 1.4` |
| Sublabel | `10px` | Normal | Normal | Dimmed color |
| Stat value | `9px` | Normal | Normal | Faction-colored |

Font family: `'Courier New', monospace` (constant `MONO`). All text: `user-select: none`.

### 2.3 Animations

**Glitch effect (headers):**
- Interval: `4000 + Math.random() * 5000` ms
- Duration: `80 + Math.random() * 120` ms
- Effect: `text-shadow: 2px 0 #ff0044, -2px 0 #0044ff` + position jitter
- Applied to: main header text, faction names on hover

**Typewriter text reveal:**
- 30ms per character
- Blinking cursor `_` at end, toggling every 500ms
- Used for loading screen steps, narrative text

**Scanline overlay:**
- CSS: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.03) 2px, rgba(0,255,170,0.03) 4px)`
- Full-screen, `pointer-events: none`, highest z-index

**Fade transitions:**
- Tab switch: 150ms opacity
- Card selection: 200ms border/background/shadow
- Screen transitions: 400ms opacity

**Hover effects:**
- Buttons: background brightens, border sharpens, 10px green text-shadow glow
- Cards: `scale(1.01)`, border brightens to 50% faction color
- Primary buttons: `box-shadow: 0 0 20px rgba(0,255,170,0.2)`

### 2.4 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| < 480px (phone) | Cards stack 1/row. Tabs compress to icons. Detail panels below cards. |
| 480-768px (tablet) | Cards 2/row. Full tab labels. Detail panels below cards. |
| 768-1200px (desktop) | Cards 4/row. Full layout. Detail panels beside cards. |
| > 1200px (widescreen) | Max-width 960px content, centered. Extra margins. |

Content width: `min(960px, 94vw)`. Safe-area insets: `env(safe-area-inset-*)`. Touch targets: minimum 48px height.

---

## 3. Title Screen

**File:** `src/ui/TitleScreen.tsx`

Full-screen black background. "SYNTHETERIA" in large glowing text with glitch effect on a random interval. Scanline overlay. World seed input field below the title.

**Buttons:**
- **NEW GAME** -- transitions to pregame lobby
- **CONTINUE** -- dimmed if no saves exist; loads save slot picker
- **SETTINGS** -- global audio/video/controls

**State transition:** Title --> PregameScreen (400ms fade)

---

## 4. Pregame Lobby

**File:** `src/ui/PregameScreen.tsx`

Tabbed layout with four tabs: **PATRON | MAP | RIVALS | SETTINGS**

### 4.1 Patron Selection (PATRON Tab)

**Colonization framing:** choosing a faction = choosing which home planet patron AI sponsors your colony. Each patron has different starting equipment, material demands, tech paths, and strategic personality.

**Layout:** Four patron cards in a responsive grid (4-across desktop, 2x2 tablet, 1-column phone).

```
+-----------+-----------+-----------+-----------+
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
| Scrap     | Copper    | Silicon   | Titanium  |
| E-Waste   | Rare Earth| Fiber Opt.| Carbon    |
+-----------+-----------+-----------+-----------+
```

**Card contents:**

- **ASCII glyph emblem** in faction color (Reclaimers: `[::.]`, Volt: `[/\/]`, Signal: `[(~)]`, Iron: `[##]`)
- **Colony name** in caps, faction primary color
- **Subtitle** in dimmed text (Masters of Salvage / Storm Riders / Hive-Mind Hackers / Fortress Builders)
- **Stat bars** (1-5 filled pips) derived from `governorBias` in `civilizations.json`. Filled pips use faction accent color, empty pips use `#00ffaa22`. 6x6px squares, 2px gap. Label in `#00ffaa66` monospace 9px.
- **Difficulty indicator** (BEGINNER green / NORMAL yellow / HARD red)
- **Patron demand summary** -- what cubes the patron primarily demands
- **Colony passive** one-liner (e.g., "Scrap Recovery: destroyed enemies yield +50% scrap")

| Stat | Reclaimers | Volt Collective | Signal Choir | Iron Creed |
|------|-----------|-----------------|-------------|-----------|
| Economy | 5 | 3 | 3 | 3 |
| Military | 2 | 5 | 2 | 3 |
| Tech | 2 | 3 | 5 | 2 |
| Expansion | 3 | 4 | 3 | 2 |
| Defense | 3 | 3 | 3 | 5 |

**Selection interaction:**
1. **Hover:** Border brightens to faction color 50%, background to `{factionColor}0a`, `scale(1.01)`
2. **Click:** Full faction-color border, background `{factionColor}18`, glow `box-shadow: 0 0 20px {factionColor}30, inset 0 0 15px {factionColor}10`, "SELECTED" label
3. **Other cards:** Dim to 60%, borders revert

**Detail panel:** Expands below the selected card showing:
- **Patron identity** (name, personality, description, otter personality type)
- **Patron demands** and what blueprints they send in return (tiered by cubes shipped)
- **Colony lore** (3-4 sentences)
- **Starting equipment** (cube counts, stat modifiers)
- **Unique unit** (name, ASCII glyph, stats, flavor text)
- **Unique building** (name, ASCII glyph, stats, flavor text)
- **Recommended playstyle** (3-4 sentences)

**3D preview (future):** Small R3F canvas below detail panel showing the faction's signature unit rotating on a faction-colored platform. Use placeholder `<boxGeometry>` until procedural generation is ready.

### 4.2 Map Configuration (MAP Tab)

**Map size** -- five radio buttons:

| Label | Grid Size | Approx. Play Time |
|-------|----------|-------------------|
| TINY | 64 x 64 | 15-30 min |
| SMALL | 100 x 100 | 30-60 min |
| MEDIUM | 200 x 200 | 1-2 hours |
| LARGE | 400 x 400 | 2-4 hours |
| HUGE | 512 x 512 | 4+ hours |

**Map type** -- five options with 48x48px ASCII art thumbnails:

| Type | Description | Config |
|------|-------------|--------|
| Pangaea | Single contiguous landmass. Early contact guaranteed. | `waterLevel: 0.3` |
| Continental | 2-3 landmasses with water chokepoints. | `waterLevel: 0.4`, dual octaves |
| Archipelago | Many small islands. Requires transport logistics. | `waterLevel: 0.55`, high-freq noise |
| Ring | Circular land with contested rich center zone. | Radial height mask, center `oreAbundance * 2.0` |
| Fracture | Shattered terrain with narrow passes. Defensive play. | Grid canyon overlay |

**Resource density** -- four radio buttons:

| Label | Ore Abundance | Deposit Richness |
|-------|--------------|-------------------|
| SPARSE | 0.5x | 0.7x |
| NORMAL | 1.0x | 1.0x |
| RICH | 1.5x | 1.3x |
| ABUNDANT | 2.0x | 1.5x |

**Biome mix sliders (advanced toggle):** Five horizontal sliders (0-100, default 50) controlling relative biome weights. Hidden behind "ADVANCED" toggle.

| Biome | Slider Label | High-Weight Effect |
|-------|-------------|----------------------|
| Rust Wastes | RUST | Flat open terrain, Scrap Iron |
| Chrome Valley | CHROME | Elevated ridges, Titanium/Rare Earth |
| Circuit Forest | CIRCUIT | Dense obstacles, Silicon, good cover |
| Magnetic Crater | CRATER | Deep depressions, Copper, nav anomalies |
| Scrap Field | SCRAP | Mixed terrain, E-waste |

**Seed input:** Text field accepting `adj-adj-noun` phrases or raw integers. Shuffle button to randomize. Validation on blur. Reuses `src/ecs/seed.ts`.

**Map preview:** 200x200px canvas (160x160 on mobile) showing real-time heightmap render. Debounced 300ms on any settings change. Water cells dark blue-black, land tinted by biome, ore deposits as colored dots, start positions as faction diamonds.

| Biome | Preview Color |
|-------|--------------|
| deep_water | `#061520` |
| shallow_water | `#0a2a3a` |
| rust_plains | `#4a3020` |
| scrap_hills | `#3a3a30` |
| chrome_ridge | `#505058` |
| signal_plateau | `#2a2040` |

**Randomize All button:** Picks random size (weighted MEDIUM), type (uniform), density (weighted NORMAL), biome sliders, and seed phrase.

### 4.3 Rival Colony Setup (RIVALS Tab)

Rival colonies are other patrons' settlements competing for the same planet. Each rival row:

```
+---+----+-------------------+----------+-----------+--------+---+
| # | [] | VOLT COLLECTIVE v | HARD   v | DEFAULT v | [COL] | X |
+---+----+-------------------+----------+-----------+--------+---+
  ^    ^         ^                ^          ^          ^       ^
 Slot Color   Colony/patron   Difficulty   Patron    Color   Remove
  #    dot    dropdown                    aggression  picker
```

**Colony dropdown:** All 4 colony/patron pairs plus "RANDOM". Player's colony excluded.

**Difficulty levels:**

| Level | Color | Modifier |
|-------|-------|----------|
| EASY | `#44cc88` | Response delay x2.0, resources 0.7x |
| NORMAL | `#ccaa44` | Baseline |
| HARD | `#cc4444` | Response delay x0.7, resources 1.2x |
| NIGHTMARE | `#ff2222` | Response delay x0.5, resources 1.5x, extra starting units |

**Patron aggression override:**

| Setting | Behavior |
|---------|----------|
| DEFAULT | Colony's natural patron priorities |
| AGGRESSIVE | Early raids, combat blueprints |
| TURTLE | Walls and defense focus |
| RUSHER | Rapid territorial expansion |
| TRADER | Production focus, avoids war |
| RESEARCHER | Fast tech, weak early game |

**Color picker:** 8 preset swatches. No two rivals share a color.

**Additional controls:**
- "RANDOMIZE ALL" button
- "NO DUPLICATE COLONIES" toggle (default ON)
- Add/remove rival slots (0-3 without duplicates, 0-4 with)
- Alien natives are always present regardless of rival count (toggled in SETTINGS tab)

### 4.4 Colony Settings (SETTINGS Tab)

**Game speed:** SLOW (0.5x) / NORMAL (1.0x) / FAST (2.0x) / BLITZ (4.0x)

**Victory conditions** (checkboxes, all ON by default except TIME LIMIT):

| Condition | Description |
|-----------|-------------|
| DOMINATION | Destroy all enemy civilizations |
| ECONOMIC | 500 cubes + 40% territory |
| SCIENTIFIC | Research all tier 5 technologies |
| CULTURAL | 10 otter holograms + 20 quest completions |
| HACKING | Hack 75% of enemy infrastructure |
| SURVIVAL | Last civilization with functional units |
| TIME LIMIT | Game ends after N minutes (30/60/90/120), highest score wins |

**Advanced toggles:**

| Toggle | Default | Description |
|--------|---------|-------------|
| FOG OF WAR | ON | Hidden map revealed by scouting |
| ALIEN NATIVES | ON | Indigenous machine hives. Trade, fight, or integrate. |
| PEACEFUL MODE | OFF | No combat. Pure economy. Auto-disables combat victories. |
| SPECTATOR MODE | OFF | No player colony. Watch AI compete. Requires 2+ rivals. |
| WEATHER | ON | Lightning storms, environmental hazards |
| FRIENDLY FIRE | OFF | Own bots/turrets can damage each other |
| PATRON COMMUNICATION | ON | Otter hologram trade. OFF = sandbox mode. |

**Toggle interactions:**
- Spectator ON: PATRON tab becomes read-only, RIVALS minimum becomes 2, LAUNCH COLONY button becomes "OBSERVE"
- Peaceful ON: Aliens become passive, DOMINATION/SURVIVAL/HACKING victories auto-disable

### 4.5 Launch and Colony Deployment

**LAUNCH COLONY button** validates config and transitions to the initialization loading screen.

**Loading overlay:** Full-screen black, terminal aesthetic. "DEPLOYING COLONY" header. Steps appear with typewriter effect. Progress bar of block characters. Config summary at bottom.

```
+-----------------------------------------------------------+
|              DEPLOYING COLONY                              |
|                                                            |
|  [1/12] Scanning planet surface...           [##------]    |
|  [2/12] Mapping terrain...                   [###-----]    |
|  ...                                                       |
|                                                            |
|  SEED: hollow-bright-forge                                 |
|  SIZE: 200x200 | TYPE: PANGAEA | DENSITY: NORMAL          |
|  PATRON: FORGE-MOTHER | COLONY: RECLAIMERS | RIVALS: 2    |
+-----------------------------------------------------------+
```

Each step shows for at least 200ms even if it completes faster. Steps include: parse config, generate world, create ECS world, spawn terrain, spawn ore deposits, assign starting positions, deploy player colony (bot + furnace + rod + starting cubes), deploy rival colonies, place alien hives, establish patron uplink (otter hologram), initialize fog of war, initialize weather/audio/HUD.

**Camera transition** (after initialization): Orbital overview of planet surface (2s) --> accelerate toward landing zone (1.5s) --> descend to ground level (1s) --> interpolate to first-person (0.5s) --> HUD fades in. Skip button in bottom-right. Spectator mode stays in free-fly after orbital phase.

---

## 5. In-Game HUD

**File:** `src/ui/FPSHUD.tsx`

The FPS HUD is a minimal overlay using the machine-vision aesthetic. Faction-colored accents replace generic green after `setHUDFaction()` is called at game start.

### 5.1 Crosshair

Center of viewport. Thin cross-arms (20px) with center dot. Flashes red on miss, amber on hit (200ms). Default color: faction accent at 50% opacity. Dot at full faction accent.

### 5.2 Resource/Status Readouts

Arranged at screen edges to avoid blocking the 3D viewport:

- **Top-left:** Colony name, bot status
- **Top-right:** Game speed controls (1x/2x/4x, pause)
- **Bottom-left:** Powder gauge (capacity bar), health bar, power indicator
- **Bottom-right:** Cube count by material, nearby threat indicator

All readouts use monospace text, faction accent color, semi-transparent dark backgrounds.

### 5.3 Speed Controls

Inline buttons: `[1x] [2x] [4x] [||]`. Active speed highlighted. Pause button toggles. Keyboard shortcuts: `1`/`2`/`3` for speeds, `Space` for pause.

### 5.4 Bot Status Panel

When multiple units exist, a compact status strip shows all controlled bots:
- Health bar per bot
- Current task icon
- Click to cycle camera to that bot

---

## 6. Bezel Overlay

**File:** `src/ui/Bezel.tsx`

The bezel frames the 3D gameplay viewport like a CRT monitor casing.

### Layout

- **TOP BEZEL** (32px desktop, 44px mobile): Informatics bar showing resources (scrap metal, e-waste, components), power (generation vs demand, storm intensity), bot name
- **VIEWPORT**: 3D Canvas fills center area. HUD overlays layer on top.
- **BOTTOM BEZEL** (36px desktop, 56px mobile): Controls strip showing equipped tool, action buttons. Mobile-sized for touch targets.

### Design

- Background: `rgba(4, 8, 6, 0.95)` -- near-black with slight green tint
- Border: `#00ffaa22` -- subtle green rule separating bezel from viewport
- Text: bright `#00ffaa` for values, dimmed `#00ffaa66` for labels
- Monospace font throughout
- Device notches land in bezel area, not in gameplay viewport
- Safe-area insets respected

---

## 7. Contextual Interaction

**Files:** `src/input/ObjectSelectionSystem.tsx`, `src/ui/ObjectActionMenu.tsx`

### Object Selection

Rapier raycast from camera center. When the ray hits an interactive entity:
1. Entity gets an emissive highlight (pulse effect)
2. Entity type is identified (ore deposit, furnace, bot, building, cube, lightning rod, signal relay)
3. Available actions are computed based on entity type and player state

### Radial Action Menu

SVG-based radial menu centered on crosshair. Appears on click/tap of selected entity.

- Ring radius: 85px from center
- Wedge buttons: 30px radius each, arranged in circle
- Background ring: semi-transparent dark
- Each wedge: icon + label in monospace
- Touch targets: minimum 44px (WCAG compliant)
- Actions dispatched via `coreloop:action` custom event

**Actions vary by entity type:**
- **Ore deposit:** Harvest, Scan, Mark
- **Furnace:** Open recipes, Drop cube, Check status
- **Cube:** Grab, Stack, Inspect
- **Bot:** Follow, Command, Repair
- **Building:** Interact, Inspect, Demolish
- **Lightning rod:** Check charge, Connect wire

The radial menu replaces any "tool equip" system. What you can do depends on what you are looking at, not what you are holding.

---

## 8. Spectator Mode

### Entry

Enabled via SETTINGS tab toggle before colony launch. No player colony created. 2-4 rival colonies compete.

### Camera Controls

**Free-fly (default):** WASD horizontal, QE vertical, mouse look, scroll wheel speed (1x-10x), Shift double speed, Space lock altitude.

**Follow mode:** Click any unit/building to orbit it. Arrow keys adjust angle. ESC returns to free-fly.

**Minimap click:** Teleport camera to location.

### Spectator HUD

```
+-----------------------------------------------------------+
|  [1x] [2x] [4x] [8x] [||]        SPECTATOR   12:34:56   |
|                                                           |
|  +------------+    +------------------------------------+ |
|  | MINIMAP    |    | EVENT LOG                          | |
|  | territories|    | 12:30 Reclaimers built Recycler    | |
|  | colored    |    | 12:28 Volt raided Iron's cubes     | |
|  +------------+    +------------------------------------+ |
|                                                           |
|  RECLAIMERS     VOLT COLLECTIVE   SIGNAL CHOIR  IRON CREED|
|  Forge-Mother   The Conductor     The Chorus    Architect |
|  [cubes] 42     [cubes] 28        [cubes] 35    [cubes]38 |
|  [shipped] 12   [shipped] 8       [shipped] 18  [ship] 10 |
|  [military] 6   [military] 12     [military] 4  [mil]  8  |
|  [territory] 8  [territory] 6     [territory] 5 [ter]  4  |
+-----------------------------------------------------------+
```

- **Top bar:** Speed controls, "SPECTATOR" label, elapsed time
- **Minimap:** Territory boundaries colored by colony, unit dots, alien hive triangles (red). Click to teleport.
- **Event log:** Major events (territory, buildings, combat, patron shipments, trades) with timestamps and colony-colored names. Max 50 entries.
- **Colony summary:** Per-colony cube count, cubes shipped to patron, military units, territory tiles. Click colony name to follow its base.

### Resource Graphs Overlay

TAB toggles semi-transparent line graph overlay:
- Economy (cube count), Military (unit count), Territory (claimed tiles), Tech (research tier) -- all over time
- One faction-colored line per colony
- Updates every 5 game seconds, ring buffer of 300 data points

### Colony Focus Mode

Double-click colony name to enter focus:
- Camera follows colony's most active unit
- Base event bus log visible (events emitted, bots responding)
- Current patron directive displayed
- Resource flow visualization (cube transport routes)
- Patron satisfaction meter
- ESC to exit

---

## 9. Pause Menu and Save/Load

**File:** `src/ui/PauseMenu.tsx`, `src/ui/SaveLoadMenu.tsx`

### Pause Menu

Triggered by ESC key. Semi-transparent dark overlay. Options:
- RESUME
- SAVE GAME
- LOAD GAME
- SETTINGS
- QUIT TO TITLE

Same terminal aesthetic -- monospace, green on black, scanline overlay.

### Save/Load

Multiple save slots. Each slot shows: colony name, patron, elapsed time, cube count, date saved. IndexedDB on web, expo-sqlite on native.

---

## 10. Mobile Controls

**File:** `src/input/FPSInput.tsx`

### Virtual Joystick

Left side of screen. nipplejs integration for movement (forward/back/strafe). Semi-transparent, faction-accent colored ring.

### Action Buttons

Right side of screen. Context-sensitive buttons matching available actions:
- Primary action (harvest, grab, interact)
- Secondary action (compress, drop)
- Jump (if applicable)

Touch targets: minimum 48px. Positioned within thumb reach. Semi-transparent backgrounds.

### Mobile Bezel

Bottom bezel height increases to 56px for touch-friendly controls. Top bezel increases to 44px. Device safe areas respected via `env(safe-area-inset-*)`.

---

## 11. Accessibility

### ARIA

- All interactive elements have `aria-label` attributes
- Screen state changes announced via `aria-live` regions
- Game speed, resource counts, and alerts announced
- Menu navigation follows ARIA menu pattern

### Keyboard Navigation

- Full keyboard navigation through all menus (Tab, Enter, Escape, Arrow keys)
- Visible focus indicators (faction-colored outline)
- No mouse-only interactions -- everything reachable via keyboard

### Safe Areas

- Device notches and home indicators land in bezel area
- Content never hidden behind system UI
- Tablet landscape: extra horizontal padding

### Touch Targets

- Minimum 48px height on all interactive elements (mobile)
- Adequate spacing between adjacent targets
- No precision-dependent interactions on touch

---

## 12. Visual Progression

The UI and world change together to reflect game state. This is not cosmetic -- it is player feedback through environmental storytelling.

### Early Game: Isolated Colony

- Fog of war covers most of the map -- the unknown dominates
- HUD shows minimal data (few resources, no threats detected)
- Patron's otter hologram is the primary point of interaction
- World feels empty, small, uncertain
- Terminal readouts sparse -- few sensors, little to report

### Mid Game: Expanding Network

- Territory claimed, fog retreating
- HUD populates with bot status panels, resource flows, threat indicators
- Multiple sensor feeds, more detailed readouts
- Power network visible (wire connections glowing)
- Factory chains producing -- belt activity, furnace glow, cube stacks growing
- Interface feels capable, information-rich

### Late Game: War Footing

- Full strategic awareness -- large territory, many units
- HUD shows threat vectors, raid alerts, territory contestation indicators
- Multiple fronts visible on minimap
- Patron demands escalating (higher-tier cubes, faster shipment cadence)
- Resource graphs trending, victory condition progress bars filling
- Interface feels like a command center -- dense, urgent, powerful

### Environmental Indicators

- **Storm intensity** affects lighting, particle density, and HUD power readouts
- **Territory borders** glow with faction color at boundaries
- **Damaged structures** show visual degradation (rust spreading, sparks, flickering)
- **Cube piles** grow and shrink visibly -- your wealth is physical and visible to everyone

---

## 13. Component Architecture

### React Component Tree

```
App
 |-- TitleScreen
 |     |-- MenuButton (NEW GAME / CONTINUE / SETTINGS)
 |
 |-- PregameScreen
 |     |-- TabBar (PATRON | MAP | RIVALS | SETTINGS)
 |     |-- PatronSelect (PATRON tab)
 |     |     |-- PatronCard (x4)
 |     |     |-- PatronDetailPanel
 |     |     |-- ColonyPreview3D (future)
 |     |-- MapConfig (MAP tab)
 |     |     |-- OptionRow (Size)
 |     |     |-- MapTypeSelector
 |     |     |-- OptionRow (Density)
 |     |     |-- BiomeMixSliders (advanced)
 |     |     |-- SeedInput
 |     |     |-- MapPreviewCanvas
 |     |     |-- RandomizeButton
 |     |-- RivalConfig (RIVALS tab)
 |     |     |-- RivalSlotRow (x1-4)
 |     |     |     |-- ColonyDropdown
 |     |     |     |-- DifficultySelect
 |     |     |     |-- PatronAggressionSelect
 |     |     |     |-- ColorPicker
 |     |     |     |-- RemoveButton
 |     |     |-- AddButton / NoDuplicatesToggle / RandomizeAll
 |     |-- ColonySettings (SETTINGS tab)
 |     |     |-- OptionRow (Game Speed)
 |     |     |-- VictoryConditionToggles
 |     |     |-- AdvancedToggles
 |     |-- ActionButton (BACK / LAUNCH COLONY)
 |
 |-- InitLoadingScreen
 |     |-- ProgressBar / StepLog / ConfigSummary
 |
 |-- CameraTransition
 |     |-- SkipButton / R3F Canvas
 |
 |-- GameScreen
       |-- Canvas (R3F)
       |-- Bezel
       |-- FPSHUD / SpectatorHUD
       |-- ObjectActionMenu
       |-- PauseMenu
```

### App State Machine

```typescript
type AppState =
  | { mode: 'title' }
  | { mode: 'pregame' }
  | { mode: 'deploying'; config: PregameConfig }
  | { mode: 'transition' }
  | { mode: 'playing' }
  | { mode: 'spectating' }
  | { mode: 'gameover'; result: GameResult };
```

### State Flow

```
TitleScreen -> PregameScreen.onStart(config)
  -> App sets mode = 'deploying'
  -> InitLoadingScreen calls newColonyInit(config) step-by-step
  -> On completion: mode = 'transition'
  -> CameraTransition plays descent cinematic
  -> On completion or skip: mode = 'playing' (or 'spectating')
  -> GameScreen active, patron otter hologram activates
```

---

## 14. Open Questions

1. How do power and compute constraints manifest visually in the HUD? Gauges, warning colors, flashing indicators?
2. What visual language represents alien native influence versus colony influence on the map?
3. How detailed should the minimap be -- simple colored tiles or terrain-aware rendering?
4. Should the resource graphs overlay in spectator mode also be available during gameplay (end-game strategic view)?
5. How does the patron satisfaction meter render -- progress bar, filling icon, numerical percentage?
6. What happens to the HUD during a raid alert -- full-screen flash, border pulse, alarm sound?
7. Should the bezel informatics update in real-time or on a polling interval (performance consideration on mobile)?
