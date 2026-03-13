---
title: "UI Design"
domain: interface
status: canonical
last_updated: 2026-03-13
summary: "Visual language (industrial machine-consciousness), mobile viewport design, component specs, accessibility, known issues"
depends_on: []
planned_work:
  - "City transition playtest verification"
  - "Radial menu mobile verification"
  - "City Kit Lab usability polish"
---

# UI Design

This document defines the player-facing design language, viewport strategy, component requirements, and accessibility expectations for Syntheteria. It is the canonical reference for all UI polish and flow design work.

---

## 1. Product Identity

Syntheteria should feel like:
- awakening machine consciousness
- storm-powered infrastructure
- post-apocalyptic industrial ruins
- distributed intelligence coordinating fragile assets across a hostile world

It should not feel like:
- a generic neon cyberpunk dashboard
- a fantasy city-builder skin
- a glossy mobile idle-game HUD
- a debug tool pretending to be a game

### Core Mood

The emotional register should be:
- cold
- deliberate
- eerie
- infrastructural
- resilient rather than triumphant

The interface is a projection of machine perception and command authority. It is not neutral chrome. It is part of the fiction.

---

## 2. Visual Language

### Base Palette

- **Deep graphite** and oil-dark blue for panel mass
- **Muted steel/industrial** tones for support surfaces
- **Cyan** for signal, focus, selection, and intelligence glow
- **Mint** for owned/healthy/active operational state
- **Amber** for fabrication, power, and utility
- **Restrained red** for failure, danger, hostile pressure

The cyan/mint split is intentional:
- `cyan` frames machine cognition, signal, overlays, and interaction focus
- `mint` marks stable operational ownership, health, and active command readiness
- These should not blur into arbitrary green/cyan drift

### Surface Treatment

- Thin engineered borders
- Layered panels with subtle depth
- Selective glow rails, scanline hints, and signal motifs
- Controlled gradients instead of flat blocks
- Limited texture noise

### Motion

- Staggered reveals where useful
- Soft shimmer or pulse for high-energy surfaces
- Crisp hover/press/focus response
- Avoid constant busy motion
- Animation should reinforce state changes, not distract from them

### Typography

- Technical, deliberate, readable
- Uppercase labels only where the hierarchy benefits from it
- Longer descriptive text should remain highly legible and low-drama
- Do not overcompress everything into tiny diagnostic type

---

## 3. Brand Assets

Primary assets currently in use:
- `assets/ui/background.png`
- `assets/ui/mark.png`
- `assets/ui/buttons/new_game.png`
- `assets/ui/buttons/load_game.png`
- `assets/ui/buttons/settings.png`

These assets establish the direction. Supporting UI should harmonize with them rather than compete with them.

---

## 4. Mobile Viewport Design

### The Problem

On a 375x812 phone, a multi-row top bar, persistent side toolbars, corner minimap, and full-width selection panel can consume 75% of the screen. For a 4X where spatial awareness IS the game, this is the Civ VI mobile trap: "playing through a keyhole."

### Principle: The Map IS the Screen

At rest (nothing selected, no panel open), the game world should fill 100% of the viewport. HUD elements float as transparent overlays occupying no more than 15% of screen area total.

**Persistent elements on phone** (always visible):
- **Resource strip** -- single horizontal row at top, transparent bg, ~36px tall
- **Minimap toggle** -- small radar icon bottom-right (~36x36px), tapping expands minimap as a bottom sheet
- **Menu dot** -- top-right corner, opens sim controls / settings

Everything else is contextual -- appears on interaction, dismissed by tapping the map.

### Default Zoom: The 7-Cell Rule

At default zoom on a phone in portrait, the player should see approximately 7 structural cells across the screen width. This is the sweet spot from Polytopia and CivRev2:
- Enough cells for local tactical context (your active sector + 2-3 cells of surroundings)
- Each cell large enough to show its floor zone, any unit/structure on it, and its ownership color
- Not so zoomed out that individual units become undifferentiated dots

For a 375px phone showing 7 cells, each cell renders at ~53px -- readable for a square structural space with a small icon.

### Snap-To Zoom Tiers

Instead of smooth continuous zoom (which leads to awkward "between" states), use snap-to zoom tiers with smooth animation between them:

| Tier | Name | Cells Across (Phone) | What's Visible |
|------|------|---------------------|----------------|
| 1 | Tactical | 4-5 | Unit models, structure details, floor-zone features |
| 2 | **Default** | 7-8 | Units as icons, structures as silhouettes, district colors |
| 3 | Strategic | 11-13 | Ownership colors, district icons, unit group indicators |
| 4 | World | 20+ | Full map overview (like minimap but interactive) |

Pinch zoom snaps to nearest tier. Double-tap cycles to next tier. This prevents the "unrecognizable muddle" problem -- at every tier, the visual language is designed for THAT distance.

### Structural Cell Scaling

When rendering the structural-space campaign:
- Each cell at the **default zoom tier** should resolve to approximately 48-56dp on phone
- At this size, a 2-tone floor plus a structure or unit silhouette must remain readable
- Center-placed models should be ~60% of cell width -- large enough to identify type but not overflowing
- District or substation icons at strategic zoom should be recognizable silhouettes at ~20-24dp

On tablet, tiles naturally get more pixels, so the same 7-tile rule gives ~90dp tiles -- room for more detail.

### Resource Strip (Top Edge)

Replace multi-row top bars with a single-row resource strip:

```
+---------------------------------------------+
| [lightning]32  [gear]14  [recycle]8  [storm]78%  [menu] |
|                                             |
|              G A M E  W O R L D             |
|                                             |
|                                       [map] |
+---------------------------------------------+
```

- Icons + numbers only, no labels (labels visible on long-press)
- Semi-transparent background (~70% opacity dark)
- Menu button opens Sim Control panel as a bottom sheet
- Map toggle is the minimap
- Total height: 36-40px including safe area padding
- On desktop/tablet: expand to full TopBar with labels

### Device Breakpoints

| Surface | Phone Portrait | Tablet | Desktop |
|---------|---------------|--------|---------|
| Resource bar | Icons only, 36px tall | Icons + short labels, 44px | Full TopBar with labels + sim controls |
| Minimap | Hidden, toggle icon | Always visible, corner | Always visible, larger |
| Local context | Anchored bubble or compact modal | Compact side/popup | Compact side/popup |
| Build/actions | Radial + modal escalation | Radial + side affordance | Radial + side affordance |
| Sim controls | In hamburger menu | Top-right panel | Top-right panel, always visible |
| Default zoom | 7 tiles across | 9-10 tiles across | 12-14 tiles across |

---

## 5. Player Flows

### Title Flow

- The background art should remain visually dominant in the center
- Primary interaction should live in the upper band
- `New Game` is the main call to action
- `Continue` appears only when persisted saves exist
- `Settings` should remain visible and distinct

### New Game Flow

- Seed, map size, difficulty, climate, and storm profile must feel like meaningful campaign commitments
- The modal should read as a world-initialization ritual, not a generic form
- Copy should reinforce deterministic world generation and campaign persistence

### Loading Flow

- Loading overlays should feel integrated with the command/signal language
- Loading should communicate what the game is doing
- Do not leave players staring at empty transitions
- Do not present fake deterministic progress if the runtime does not expose real progress
- Prefer indeterminate or staged progress language over dishonest percentages

### World HUD

- Top bar should communicate command status, resources, pressure, and simulation control cleanly
- Selected-unit and location context should be readable without flooding the screen
- World interactions should feel operational, not menu-driven

### World to City Flow

- Surveying, founding, entering, and returning must feel like campaign actions, not temporary view toggles
- City status should communicate role and progression clearly
- Transitions should reinforce that cities are real spaces in the campaign

### City Runtime

- Cities should read as operational interior spaces
- UI should support future fabrication, storage, power, habitation, and service loops
- The player should understand where they are and why the space matters

---

## 6. Component Requirements

### Buttons

- Strong state readability
- Hover, focus, pressed, and disabled states
- No button should depend on art alone to be understandable
- Primary, secondary, and danger actions must be visually distinct
- Active/healthy/owned action states may lean mint
- Modal/briefing/signal framing may lean cyan

### Panels

- Title, eyebrow, body, and actions should have clear hierarchy
- Panels over 3D scenes need strong backdrop control
- Panel density should stay high-signal, not cramped

### Modals

- Every modal needs a clear reason to exist
- Every modal should contain real actions or information
- Modal layering should preserve context without sacrificing legibility

### Notifications / Thought Overlay

- Narration and machine-thought moments should feel diegetic
- These surfaces should never read like default toast notifications

### Copy Tone

- Player-facing copy should be diegetic or near-diegetic
- Avoid raw engineering vocabulary like `runtime`, `SQLite`, `pipeline`, `contract`, or `scene transition`
- Use machine-operational language instead of implementation narration

### Developer-Facing Surfaces

- Tools like City Kit Lab are still part of the product quality pipeline
- They should be clear, navigable, and visually coherent even if dev-facing

---

## 7. Accessibility Requirements

Non-negotiable expectations:
- Touch-safe targets (minimum 44x44dp)
- Mobile and desktop readability
- Sufficient contrast over dynamic backgrounds
- Visible non-hover states for all interactive elements
- No critical information encoded by color alone
- Sensible focus order on web
- Reduced reliance on small text for primary actions
- Room for future reduced-motion handling
- `role="button"` and `aria-label` on all interactive elements
- `role="dialog"` and `aria-modal="true"` on modals with focus traps
- `role="radio"` / `role="radiogroup"` with `aria-checked` on selection groups
- `<label>` or `aria-label` on all form inputs
- Focus-visible styles (outline, glow, or border change) for keyboard navigation
- Meaningful alt text on button images that serve as labels

---

## 8. Testing Expectations

Any change to a visible player surface should be backed by:
- Component tests for the surface itself
- Screenshot coverage where stable and useful
- E2E coverage if the flow spans multiple scenes or modals

UI quality is not complete when it "looks okay locally." It is complete when:
- The interaction contract is documented
- The surface is test-backed
- The state it displays is real

---

## 9. Coordination With Runtime Systems

UI should reflect:
- Real save state
- Real world/city state
- Real POI/city progression
- Real simulation status
- Real AI or actor status when exposed

UI should not introduce fake fallback states to hide missing systems. If a system is missing or incomplete, surface that clearly and fix the system rather than masking it.

For settings and other unfinished surfaces:
- Prefer honest states like `Default`, `Pending calibration`, or `Unavailable in this build`
- Do not use fabricated percentages or fake configured values just to make a panel look finished

---

## 10. Known Issues

Issues from the 2026-03-12 playtest report. Items marked FIXED have been resolved. Remaining items are organized by priority.

### P0 -- Critical

**C1. Canvas crash: "Asset module resolution requires a module runtime"**
- `resolveAssetUri()` uses `require()` / Expo asset resolution that doesn't work in the web bundle
- Entire R3F Canvas fails to mount, game world is a solid red background
- Fix direction: Use static imports or `useGLTF.preload()` patterns instead of dynamic `require()` for web

**C2. Simulation crash: "No structural fragment is loaded"**
- Enemy system tries to spawn enemies using a structural fragment that was never loaded (because Canvas crashed first)
- 989 console errors repeating every tick
- Fix direction: Gate `enemySystem` and `simulationTick` behind a "world ready" flag

**C3. All UI layers render simultaneously on world entry**
- Loading overlay, thought overlay, mentor relay, HUD panels, POI tooltip, and error text all appear at once
- Should be sequenced: loading (alone) -> world ready -> thought overlay (alone) -> HUD fade in -> mentor relay -> POI tooltips on interaction

### P1 -- High

**H1. Missing LOAD GAME button on title screen**
- `load_game.png` asset exists but is not rendered

**H2. Zero semantic markup on interactive elements**
- All clickable elements are plain `<div tabindex="0">` with no `role="button"`, no `aria-label`
- Fails WCAG 2.1 Level A (4.1.2 Name, Role, Value)

**H3. Document title is "app"**
- Should be "Syntheteria"

**H4. All images lack alt text**
- Button images need meaningful alt text since they ARE the button labels

**H5. No focus-visible styles**
- Keyboard users get zero visual feedback when tabbing between buttons

**H6. No modal backdrop on New Game modal**
- Background bleeds through, creating visual competition

**H7. Action buttons unreachable without scrolling in New Game modal**
- CANCEL and GENERATE WORLD are off-screen at both desktop and mobile sizes
- No visual scroll indicator exists

**H8. No quick dismiss on New Game modal**
- No X button, no backdrop click-to-close, CANCEL is off-screen

**H9. No focus trap in New Game modal**
- Tab key escapes modal into background elements
- No `role="dialog"`, no `aria-modal="true"`

**H10. Selection options lack radio semantics**
- Option cards are `<div tabindex="0">` with no `role="radio"` or `aria-checked`

**H11. Selected state has extremely low contrast**
- Selected vs unselected is a subtle background brightness shift with a black-on-dark border
- Fails WCAG 1.4.11 (Non-text Contrast)

**H12. Seed input lacks label**
- `<input type="text">` for WORLD SEED has no `aria-label` or linked `<label>`

### P2 -- Medium

**M1. Overlapping text in header area**
- "STORM COMMAND UPLINK" header overlaps with thought overlay text

**M2. SIM CONTROL panel crowded**
- Buttons are horizontally packed with tight spacing, unusable at mobile widths

**M3. Resource strip layout**
- Resource badges don't appear responsive, will overflow or stack poorly on mobile

**M4. Minimap renders during loading**
- Should only appear after the world is ready

**M5. POI tooltip renders during loading**
- Should be deferred until world is interactive

**M6. Deprecation warnings (989 console messages)**
- `shadow*` style props -> use `boxShadow`
- `props.pointerEvents` -> use `style.pointerEvents`
- `useNativeDriver` not supported on web
- `THREE.Clock` deprecated -> use `THREE.Timer`

**M7. Require cycle warning**
- `src/bots/index.ts -> src/bots/startingRoster.ts -> src/bots/index.ts` circular dependency

**M8. Red error background**
- Canvas crash fallback should use the game's dark industrial theme color, not alarm red

---

## 11. Reference Games

Visual and UX references that informed the viewport design:
- **The Battle of Polytopia** -- portrait mode HUD layout, map-first philosophy
- **Civilization Revolution 2** -- tile presentation, zoom, purpose-built mobile design
- **Northgard (mobile)** -- cautionary tale for persistent HUDs crowding play space
- **Hexonia** -- clarity-at-distance lessons
- **Unciv** -- complex 4X working on phone
