# Syntheteria UI Design -- Authoritative Interface Document

**Status:** Active
**Date:** 2026-03-11
**Scope:** Complete UI/UX specification covering aesthetic philosophy, design system, every screen from title through gameplay, and accessibility requirements.

**See also:** `docs/design/gameplay/OVERVIEW.md` §Design Principles (contextual interaction, holographic projections), `docs/design/gameplay/MECHANICS.md` §Core Loop (HUD-reflected state machine)

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

### 2.1 Color Palettes

There are **two distinct palettes** sharing one visual language. Both are defined in `src/ui/designTokens.ts`.

#### Menu Palette (amber/chrome)

Used by: title, pregame lobby, pause menu, loading screen, settings, save/load.

| Token | Value | Usage |
|-------|-------|-------|
| `menu.accent` | `#e8a020` | Headers, active elements, primary text |
| `menu.accentDim` | `rgba(232,160,32,0.45)` | Labels, secondary text |
| `menu.accentMuted` | `rgba(232,160,32,0.22)` | Borders, muted backgrounds |
| `menu.accentFaint` | `rgba(232,160,32,0.08)` | Hover backgrounds |
| `menu.chrome` | `#b8c4cc` | Chrome/silver secondary text |
| `menu.chromeDim` | `rgba(184,196,204,0.5)` | Dim chrome labels |
| `menu.bgInset` | `rgba(14,16,20,0.88)` | Panel/card background |
| `menu.bgScreen` | `#05070a` | Screen background |
| `menu.error` | `#ff4444` | Validation errors |
| `menu.errorDim` | `#ff6644` | Error descriptions |

#### HUD Palette (faction-colored machine vision)

Used by: FPSHUD, CoreLoopHUD, Bezel, all in-game overlays.

| Token | Value | Usage |
|-------|-------|-------|
| `hud.accent` | `#00ffaa` | Primary accent (default; replaced by faction color at game start) |
| `hud.accentBright` | `#00ff88` | Bright variant, status indicators |
| `hud.accentDim` | `#00ffaa66` | Labels, inactive elements |
| `hud.accentMuted` | `#00ffaa22` | Borders, subtle outlines |
| `hud.accentFaint` | `rgba(0,255,170,0.05)` | Panel backgrounds |
| `hud.bg` | `rgba(4, 8, 6, 0.95)` | Bezel and overlay background |
| `hud.error` | `#ff4444` | Damage, critical errors |
| `hud.warning` | `#ffaa00` | Compression bar, low-power, cautions |

**Faction-specific colors** (in-game HUD) override `hud.accent` when `setHUDFaction()` is called at game start. Source: `civilizations.json`.

| Faction | Color | Hex |
|---------|-------|-----|
| Reclaimers | Saddle brown | `#8B4513` |
| Volt Collective | Royal blue | `#4169E1` |
| Signal Choir | Medium purple | `#9370DB` |
| Iron Creed | Slate grey | `#708090` |

**Rival color palette** (spectator/minimap): `#ff4444`, `#ff8800`, `#ffcc00`, `#44ff44`, `#00ccff`, `#8844ff`, `#ff44aa`, `#aaaaaa`

### 2.2 Typography

| Level | Size | Weight | Spacing | Notes |
|-------|------|--------|---------|-------|
| Header | `clamp(20px, 5vw, 32px)` | Bold | `0.2em` | Glitch effect on hover/interval |
| Section label | `12px` | Normal | `0.15em` | Tab headers, panel titles |
| Body text | `11px` | Normal | Normal | `line-height: 1.4` |
| Sublabel | `10px` | Normal | Normal | Dimmed color |
| Stat value | `9px` | Normal | Normal | Faction-colored |

Font family: `'Courier New', monospace` (exported as `FONT_MONO` from `designTokens.ts`). All text: `user-select: none`.

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
- CSS: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)`
- Full-screen, `pointer-events: none`, highest z-index
- Note: HUD scan lines use near-black `rgba(0,0,0,0.03)`, not green-tinted

**Fade transitions:**
- Tab switch: 150ms opacity
- Card selection: 200ms border/background/shadow
- Screen transitions: 400ms opacity

**Hover effects:**
- Buttons: background brightens, border sharpens
- Cards: `scale(1.01)`, border brightens
- Primary buttons: subtle glow `box-shadow`

### 2.4 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| < 480px (phone) | Cards stack 1/row. Tabs compress to icons. Detail panels below cards. |
| 480-768px (tablet) | Cards 2/row. Full tab labels. Detail panels below cards. |
| 768-1200px (desktop) | Cards 4/row. Full layout. Detail panels beside cards. |
| > 1200px (widescreen) | Max-width 960px content, centered. Extra margins. |

Content width: `min(960px, 94vw)`. Safe-area insets: `env(safe-area-inset-*)`. Touch targets: minimum 48px height (`MIN_TOUCH_TARGET = 44` in `designTokens.ts`).

---

## 3. Title Screen

**File:** `src/ui/TitleScreen.tsx`

Full-screen dark background (`menu.bgScreen` = `#05070a`). "SYNTHETERIA" in large glowing amber text with periodic glitch effect. Subtitle: factory-planet framing. Scanline overlay. Fades in over 1.4s: title at 0.2s, menu buttons at 1.4s. Uses menu palette (amber/chrome), not HUD green.

**Buttons:**
- **NEW GAME** -- transitions to pregame lobby
- **CONTINUE** -- checks `SaveManager.getSaveSlots()`; disabled/dimmed if no saves exist; shows latest save info when enabled
- **SETTINGS** -- reserved (not yet wired to SettingsScreen)

**State transition:** Title --> PregameScreen (400ms fade)

---

## 4. Pregame Lobby

**Files:** `src/ui/PregameScreen.tsx`, `src/ui/FactionSelect.tsx`, `src/ui/MapConfig.tsx`, `src/ui/OpponentConfig.tsx`, `src/ui/SettingsScreen.tsx`

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

- **ASCII glyph emblem** in faction color
- **Colony name** in caps, faction primary color
- **Subtitle** in dimmed text
- **Stat bars** (1-5 filled pips) derived from `governorBias` in `civilizations.json`
- **Difficulty indicator** (BEGINNER green / NORMAL yellow / HARD red)
- **Patron demand summary**
- **Colony passive** one-liner

| Stat | Reclaimers | Volt Collective | Signal Choir | Iron Creed |
|------|-----------|-----------------|-------------|-----------|
| Economy | 5 | 3 | 3 | 3 |
| Military | 2 | 5 | 2 | 3 |
| Tech | 2 | 3 | 5 | 2 |
| Expansion | 3 | 4 | 3 | 2 |
| Defense | 3 | 3 | 3 | 5 |

**Selection interaction:**
1. **Hover:** Border brightens to faction color 50%, background to `{factionColor}0a`, `scale(1.01)`
2. **Click:** Full faction-color border, background `{factionColor}18`, "SELECTED" label
3. **Other cards:** Dim to 60%, borders revert

**Detail panel:** Expands below the selected card showing patron identity, patron demands, colony lore, starting equipment, unique unit, unique building, and recommended playstyle.

**3D preview (future):** Small R3F canvas below detail panel showing the faction's signature unit rotating on a faction-colored platform.

### 4.2 Map Configuration (MAP Tab)

**Map size** -- five radio buttons: TINY (64x64), SMALL (100x100), MEDIUM (200x200), LARGE (400x400), HUGE (512x512).

**Map type** -- five options: Pangaea, Continental, Archipelago, Ring, Fracture.

**Resource density** -- four radio buttons: SPARSE (0.5x), NORMAL (1.0x), RICH (1.5x), ABUNDANT (2.0x).

**Biome mix sliders (advanced toggle):** Five horizontal sliders (0-100, default 50) for Rust Wastes, Chrome Valley, Circuit Forest, Magnetic Crater, Scrap Field.

**Seed input:** Text field accepting `adj-adj-noun` phrases or raw integers. Shuffle button to randomize. Uses `src/ecs/seed.ts`.

**Map preview:** 200x200px canvas showing real-time heightmap render. Debounced 300ms.

**Randomize All button:** Random size (weighted MEDIUM), type (uniform), density (weighted NORMAL), biome sliders, seed phrase.

### 4.3 Rival Colony Setup (RIVALS Tab)

Each rival row: slot number, color dot, colony/patron dropdown, difficulty (EASY/NORMAL/HARD/NIGHTMARE), patron aggression (DEFAULT/AGGRESSIVE/TURTLE/RUSHER/TRADER/RESEARCHER), color picker, remove button.

**Color picker:** 8 preset swatches. No two rivals share a color.

**Additional controls:** "RANDOMIZE ALL", "NO DUPLICATE COLONIES" toggle (default ON), add/remove rival slots (0-4).

### 4.4 Colony Settings (SETTINGS Tab)

**Game speed:** SLOW (0.5x) / NORMAL (1.0x) / FAST (2.0x) / BLITZ (4.0x)

**Victory conditions** (checkboxes, all ON by default except TIME LIMIT): DOMINATION, ECONOMIC, SCIENTIFIC, CULTURAL, HACKING, SURVIVAL, TIME LIMIT

**Advanced toggles:** FOG OF WAR, ALIEN NATIVES, PEACEFUL MODE, SPECTATOR MODE, WEATHER, FRIENDLY FIRE, PATRON COMMUNICATION

**Toggle interactions:**
- Spectator ON: PATRON tab becomes read-only, RIVALS minimum becomes 2, button becomes "OBSERVE"
- Peaceful ON: Aliens become passive, combat victories auto-disable

### 4.5 Launch and Colony Deployment

**LAUNCH COLONY button** validates config and transitions to the initialization loading screen.

**Loading overlay:** Full-screen dark background, terminal aesthetic. "DEPLOYING COLONY" header. Steps appear with typewriter effect. Progress bar of block characters. Config summary at bottom. Each step shows for at least 200ms.

**Camera transition:** Orbital overview (2s) --> accelerate toward landing zone (1.5s) --> descend to ground level (1s) --> interpolate to first-person (0.5s) --> HUD fades in. Skip button in bottom-right.

---

## 5. In-Game HUD

The in-game overlay is composed of multiple focused components, all positioned as `position: absolute` overlays on the R3F canvas. Faction-colored accents replace default green after `setHUDFaction()` is called at game start.

### 5.1 FPSHUD

**File:** `src/ui/FPSHUD.tsx`

The primary FPS overlay. Exports `setHUDFaction(color)` and `getHUDAccent()` for global faction-color coordination.

**Subcomponents:**
- **Crosshair** -- thin cross-arms (20px) with center dot. Flashes red on miss, amber on hit for 200ms. Uses `getLastHitResult()` from `fpsCombat.ts`.
- **ResourceBar** -- top-center. SCRAP, E-WASTE, PARTS, STORM%, PWR gen/demand. `role="status" aria-live="polite"`.
- **SpeedControls** -- top-right. Buttons for 0.5x/1x/2x speeds and PAUSE/RESUME. `aria-pressed` on each button.
- **BotStatus** -- bottom-left. Bot name (label: "Colony Unit"), component list with functional/offline dots.
- **Hints** -- bottom-right. Faint control reminders (WASD, E, F, C, G, Q). Only shows when a bot is active.
- **SelectedInfo** -- right-center. Appears when a unit or building is selected. "COLONY UNIT" or "COLONY STRUCTURE" label, type, power status, component list.
- **CombatNotifications** -- top-center below ResourceBar. `role="alert" aria-live="assertive"`. Up to 3 combat events.
- **ScanLines** -- full-screen repeating gradient. `aria-hidden="true"`. `z-index: 100`.

### 5.2 CoreLoopHUD

**File:** `src/ui/CoreLoopHUD.tsx`

Dedicated to the core factory loop state. Subscribes to `CoreLoopSystem` for powder/compression/harvesting state.

**Subcomponents:**
- **PowderStorage** -- top-left. Per-ore-type powder amounts with colored dot indicators. Only shows when powder is present.
- **HarvestingIndicator** -- bottom-center. "HARVESTING" + powder/sec. Appears only while active.
- **CompressionBar** -- bottom-center. Amber progress bar during compression. `role="progressbar"`.
- **HeldCubeIndicator** -- bottom-center. "HOLDING: [MATERIAL] CUBE". `aria-live="polite"`.
- **FurnaceStatus** -- top-right. Per-furnace power, hopper fill, recipe name, progress bar. Only shows active furnaces.
- **FurnaceDetailPanel** -- center-screen modal. Opens via `coreloop:furnace-open` window event. Full furnace state: power, hopper contents, processing, available recipes. Has CLOSE button.
- **ObjectActionMenu** -- see §7 below.

### 5.3 GameUI

**File:** `src/ui/GameUI.tsx`

Older overlay providing additional panels. Uses CSS custom properties (`--ui-xs` through `--ui-xl`, `--panel-w`, `--sat/--sar/--sab/--sal`) for responsive scaling.

**Subcomponents:**
- **Top bar** -- unit count, building count, hostile count (red), fragment count, speed controls
- **Resource bar** -- SCRAP, E-WASTE, PARTS, STORM%, PWR
- **Selected unit info** -- bottom-left. Unit name, type, position, speed, power status, component list. RepairPanel when repairer is nearby. InlineFabricationPanel when a fab unit is selected.
- **Selected building info** -- bottom-left. Building type, power/operational status, position, components, lightning rod stats, BuildingRepairPanel.
- **BuildToolbar** -- right-center. ROD and FAB build buttons. Affordability check. Cost tooltip.
- **FabricationPanel** -- bottom-left shortcut. Active queue display. Expandable recipe list.
- **CombatNotifications** -- top-right.
- **Fragment merge notification** -- center-screen "MAP FRAGMENTS MERGED" on merge events.
- **Minimap** -- bottom-right. Canvas render. Buildings: amber squares, player units: amber dots, enemies: red dots.

### 5.4 PowerOverlay

**File:** `src/ui/PowerOverlay.tsx`

**Subcomponents:**
- **PowerBar** -- generation vs demand bar. STABLE (green), LOW (amber), DEFICIT (red), EXCESS (dim-green). Shows GEN, USE, surplus, storm%.
- **PowerWarnings** -- active warnings: POWER DEFICIT, LOW POWER MARGIN, overloaded wire count, unpowered building count. `role="alert" aria-live="assertive"`.
- **SelectedBuildingPower** -- power received, demand, hops from nearest rod for selected building.

### 5.5 QuestPanel

**File:** `src/ui/QuestPanel.tsx`

Quest tracker and otter dialogue. Positioned top-left below ResourceBar. Uses `requestAnimationFrame` loop to call `updateDialogue(delta)`.

**Subcomponents:**
- **QuestTracker** -- quest name, description, progress bar (`role="progressbar"`), current/target counts.
- **DialogueOverlay** -- otter portrait (circular, `~` placeholder), dialogue line, "tap to continue". `role="button" tabIndex={0}`. Advance on click or Enter/Space.
- **CompletionNotification** -- center-screen modal on quest complete. Quest name, rewards. `role="dialog" aria-modal="true"`. Dismiss on click.

### 5.6 TechTreePanel

**File:** `src/ui/TechTreePanel.tsx`

Toggle button top-right (`TECH [+]/[-]`). `aria-expanded`. Opens scrollable panel (max 780px wide, 70vh tall).

**Subcomponents:**
- **TechTreeNode** -- absolute-positioned cards. States: locked (grey border), available (green), in-progress (amber + progress bar at bottom), researched (faction color). `role="button"`, Enter/Space activates. `aria-label` includes cost and status.
- **PrerequisiteLines** -- SVG lines. Solid faction-colored for researched paths, dashed grey for locked.
- Active research indicator in panel header.
- Legend: Researched, Available, In Progress, Locked.

### 5.7 InventoryView

**File:** `src/ui/InventoryView.tsx`

Full-screen modal overlay. Toggle: Tab key. Escape or background click closes. `z-index: 200`.

**Sections:** COMPONENTS (status dots, name, material, ONLINE/OFFLINE), RESOURCES (scrap, e-waste, parts), EQUIPPED TOOL (from `RadialToolMenu`), NETWORK STATUS (power gen, demand, storm%, compute).

Note: `InventoryView` imports `getEquippedTool` from `RadialToolMenu.tsx`. See §7.1 for the coexistence of tool-based and contextual interaction.

### 5.8 GameOverScreen

**File:** `src/ui/GameOverScreen.tsx`

Full-screen overlay. Fades in over 1.5s. `role="alert" aria-live="assertive"`. `z-index: 1000`.

- **Victory:** Green (`#00ffaa`). Title: "SYNTHETERIA RECLAIMED".
- **Defeat:** Red (`#ff4444`). Title: "SYSTEMS OFFLINE".
- **RESTART button** -- page reload. `aria-label="Restart colony mission from the beginning"`.

### 5.9 ErrorBoundary

**File:** `src/ui/ErrorBoundary.tsx`

React class component. Catches runtime crashes (WebGL context loss, WASM failures). Shows "SYSTEM FAULT" overlay with RETRY (remounts) and REBOOT (page reload) buttons.

---

## 6. Bezel Overlay

**File:** `src/ui/Bezel.tsx`

Frames the 3D gameplay viewport like a CRT monitor casing.

- **TOP BEZEL** (32px desktop, 44px mobile): resources, power, storm, bot name
- **VIEWPORT**: 3D Canvas fills center. HUD overlays on top.
- **BOTTOM BEZEL** (36px desktop, 56px mobile): controls strip, equipped tool, action buttons

Background: `rgba(4, 8, 6, 0.95)`. Border: `#00ffaa22`. Safe-area insets respected.

---

## 7. Contextual Interaction

**Files:** `src/input/ObjectSelectionSystem.tsx`, `src/ui/ObjectActionMenu.tsx`, `src/ui/RadialActionMenu.tsx`

**See also:** `docs/design/interface/INTERACTION.md` for full raycast cascade, emissive highlight, crosshair styles, and action dispatch specification.

### Object Selection

Rapier raycast from camera center. Hit entity receives emissive highlight. Available actions computed from entity type and player state.

### Radial Action Menu

`RadialActionMenu.tsx` is the pure layout/hit-testing component. `ObjectActionMenu.tsx` wires it to ECS selection state.

- Ring radius: 80px (matches `config/interaction.json` `radialMenuRadius: 80`)
- `calculateButtonPositions()` distributes buttons evenly, starting at top (-PI/2)
- Background ring: `rgba(0, 8, 4, 0.85)` with `#00ffaa22` stroke
- Keyboard: arrow keys cycle through enabled items, Enter/Space activates, ESC dismisses
- Outside-click: `isClickOutsideMenu()` checks distance from center
- `role="menu"` on SVG, `role="menuitem"` per item, `aria-disabled` on unavailable
- Touch targets: invisible `<circle>` at max(buttonRadius, 22px) -- minimum 44px

### 7.1 Tool System Coexistence

`RadialToolMenu.tsx` (6 tools: scanner, repair, welder, fabricate, build, scavenge) coexists with the contextual action system. The contextual model handles world-object interactions; the tool menu handles the player's active tool/stance for use in `InventoryView`, `EquippedToolView`, and `MobileControls`. These are distinct concerns.

---

## 8. Spectator Mode

### Entry

Enabled via SETTINGS tab toggle. No player colony. 2-4 rival colonies compete.

### Camera Controls

Free-fly: WASD/QE/mouse look/scroll speed. Follow mode: click any unit to orbit, ESC returns. Minimap click teleports.

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
|  [cubes] 42     [cubes] 28        [cubes] 35    [cubes]38 |
+-----------------------------------------------------------+
```

TAB toggles resource graphs overlay (Economy, Military, Territory, Tech over time, faction-colored lines).

---

## 9. Pause Menu and Save/Load

**Files:** `src/ui/PauseMenu.tsx`, `src/ui/SaveLoadMenu.tsx`

**Pause Menu:** ESC key. Semi-transparent dark overlay. Options: RESUME, SAVE GAME, LOAD GAME, SETTINGS, QUIT TO TITLE. Menu palette (amber/chrome).

**Save/Load:** `SaveManager.ts` -- 4 slots, IndexedDB on web, expo-sqlite on native. Each slot shows colony name, patron, elapsed time, cube count, date saved.

---

## 10. Mobile Controls

**Files:** `src/ui/MobileControls.tsx`, `src/ui/MobileJoystick.tsx`, `src/ui/EquippedToolView.tsx`

`MobileControls.tsx` renders only on touch devices. Container `pointerEvents: "none"` with children opting into `auto`. Safe-area insets applied to container.

| Zone | Element | Purpose |
|------|---------|---------|
| Bottom-left | `MobileJoystick` (nipplejs) | Movement |
| Bottom-center | `EquippedToolView` | Tap to open `RadialToolMenu` |
| Right side | `ActionButtons` | Single-thumb core actions |

### Action Buttons (Right Thumb Cluster)

Arranged bottom-up:
1. **Primary (bottom):** C COMPRESS (56px), F MINE (56px)
2. **Middle:** G GRAB (52px), USE (56px)
3. **Secondary (top):** Q BOT (48px), E ACT (48px)

All minimum 48x48px. Safe area insets respected.

### Equipped Tool View

80x80px circular button at bottom-center showing current tool icon and label:

| Tool | Color | Icon |
|------|-------|------|
| scanner | `#00ffaa` | ◎ |
| repair | `#44aaff` | ⚙ |
| welder | `#ffaa00` | ⚡ |
| fabricate | `#aa44ff` | ⬡ |
| build | `#44ff88` | ▦ |
| scavenge | `#ff8844` | ◈ |

---

## 11. Accessibility

### ARIA

- `role="status" aria-live="polite"` -- ResourceBar, PowderStorage, FurnaceStatus, HeldCubeIndicator, QuestTracker
- `role="alert" aria-live="assertive"` -- CombatNotifications, PowerWarnings, GameOverScreen
- `role="progressbar"` with `aria-valuenow/min/max` -- CompressionBar, QuestTracker progress
- `role="dialog" aria-modal="true"` -- CompletionNotification
- `role="menu"` / `role="menuitem"` -- RadialActionMenu, RadialToolMenu
- `aria-expanded` -- TechTreePanel toggle button
- `aria-pressed` -- SpeedControl buttons
- `aria-disabled` -- unavailable radial menu items

### Keyboard Navigation

- Radial menu: arrow keys cycle enabled items, Enter/Space activates, ESC dismisses
- TechTree nodes: `tabIndex={0}`, Enter/Space to research
- Dialogue: `tabIndex={0}`, Enter/Space to advance
- InventoryView: Tab opens, Escape/background-click closes
- No mouse-only interactions

### Safe Areas

- `env(safe-area-inset-*)` used throughout
- CSS custom properties `--sat/--sar/--sab/--sal` in `GameUI.tsx`
- `MobileControls.tsx` applies padding to container

### Touch Targets

- `MIN_TOUCH_TARGET = 44` in `designTokens.ts`
- Mobile action buttons: minimum 48x48px
- Radial menu: invisible hit-area `<circle>` ensures minimum 44px diameter

---

## 12. Visual Progression

### Early Game: Isolated Colony

Fog of war dominant. HUD sparse. Patron otter hologram is primary interaction. Terminal readouts minimal.

### Mid Game: Expanding Network

Territory visible. HUD populated with bot status, resource flows, threat indicators. Power network glowing. Interface feels capable.

### Late Game: War Footing

Full strategic awareness. Threat vectors, raid alerts, territory contestation. Patron demands escalating. Interface feels like a command center.

### Environmental Indicators

- **Storm intensity** -- HUD power readouts change color
- **Territory borders** -- faction-colored ground overlays
- **Damaged structures** -- visual degradation
- **Cube piles** -- physical, visible wealth

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
 |     |-- FactionSelect (PATRON tab)
 |     |     |-- PatronCard (x4)
 |     |     |-- PatronDetailPanel
 |     |-- MapConfig (MAP tab)
 |     |     |-- OptionRow (Size/Density)
 |     |     |-- MapTypeSelector / BiomeMixSliders (advanced)
 |     |     |-- SeedInput / MapPreviewCanvas
 |     |-- OpponentConfig (RIVALS tab)
 |     |     |-- RivalSlotRow (x1-4)
 |     |-- SettingsScreen (SETTINGS tab)
 |     |-- ActionButton (BACK / LAUNCH COLONY)
 |
 |-- LoadingScreen
 |     |-- ProgressBar / StepLog / ConfigSummary
 |
 |-- GameScreen (lazy GameScene)
       |-- Canvas (R3F)
       |-- ErrorBoundary
       |-- Bezel
       |-- FPSHUD
       |     |-- Crosshair / ResourceBar / SpeedControls
       |     |-- BotStatus / Hints / SelectedInfo
       |     |-- CombatNotifications / ScanLines
       |-- CoreLoopHUD
       |     |-- PowderStorage / HarvestingIndicator / CompressionBar
       |     |-- HeldCubeIndicator / FurnaceStatus / FurnaceDetailPanel
       |     |-- ObjectActionMenu (RadialActionMenu)
       |-- GameUI
       |     |-- ResourceBar / BuildToolbar / Minimap
       |     |-- SelectedUnit/BuildingPanel / FabricationPanel
       |-- PowerOverlay
       |     |-- PowerBar / PowerWarnings / SelectedBuildingPower
       |-- QuestPanel
       |     |-- QuestTracker / DialogueOverlay / CompletionNotification
       |-- TechTreePanel
       |-- InventoryView (Tab-toggled modal)
       |-- MobileControls (touch only)
       |     |-- MobileJoystick / EquippedToolView / ActionButtons
       |     |-- RadialToolMenu (when open)
       |-- PauseMenu (ESC-triggered)
       |-- SaveLoadMenu
       |-- GameOverScreen (on victory/defeat)
```

### App State Machine

```typescript
type AppPhase = 'title' | 'pregame' | 'loading' | 'playing';
```

`GameScene` is lazy-loaded only when entering the playing phase.

### State Flow

```
TitleScreen.onNewGame()
  -> phase = 'pregame'
  -> PregameScreen.onStart(config)
  -> phase = 'loading', initFromConfig() step-by-step
  -> On completion: phase = 'playing'
  -> GameScene mounts, all HUD components active
  -> Patron otter hologram activates
```

---

## 14. Config References

| Config | Controls |
|--------|----------|
| `config/interaction.json` | Interaction ranges per entity type, actions per type, highlight color/intensity, radial menu radius (80) and animation duration |
| `config/inventory.json` | Item categories, weights, max stack sizes, inventory slot count (8) and max weight (20) |
| `config/quests.json` | Onboarding quest sequence, otter dialogue, trust arc stages |
| `config/rendering.json` | UI rendering params, hologram visual treatment |
| `config/civilizations.json` | Faction colors used for faction-colored HUD accents |

---

## 15. Open Questions

1. How do power and compute constraints manifest visually in the HUD? Gauges, warning colors, flashing indicators?
2. What visual language represents alien native influence versus colony influence on the map?
3. How detailed should the minimap be -- simple colored tiles or terrain-aware rendering?
4. Should the resource graphs overlay in spectator mode also be available during gameplay?
5. How does the patron satisfaction meter render -- progress bar, filling icon, numerical percentage?
6. What happens to the HUD during a raid alert -- full-screen flash, border pulse, alarm sound?
7. Should the bezel informatics update in real-time or on a polling interval (mobile performance)?
8. `GameUI.tsx` and `FPSHUD.tsx` both render resource bars and combat notifications. Should these be consolidated, or does `GameUI` serve an RTS mode while `FPSHUD` serves first-person?
9. `InventoryView` references `RadialToolMenu`'s equipped-tool state. Should the tool concept be deprecated in favor of pure contextual interaction, or does it serve a useful "stance" purpose?
