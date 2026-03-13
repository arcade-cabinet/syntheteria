# Frontend Playtest Report — 2026-03-12

Performed via Chrome DevTools MCP at 1280x800 (desktop) and 390x844 (mobile).

---

## CRITICAL: Runtime Crashes (P0)

### C1. Canvas crash: "Asset module resolution requires a module runtime"
- **Source**: `assetUri.ts:31` called from `StructuralFloorRenderer.tsx:156`
- **Impact**: Entire R3F Canvas fails to mount. ErrorBoundary catches it but the game world is a solid red background. No 3D content renders.
- **Root cause**: `resolveAssetUri()` uses `require()` or Expo asset resolution that doesn't work in the web bundle. Metro wraps modules differently for web — `require()` calls to `.glb` or texture assets fail when the Metro asset registry isn't initialized.
- **Fix direction**: Use static imports or `useGLTF.preload()` patterns instead of dynamic `require()` for web. Or add a web-specific fallback in `assetUri.ts`.

### C2. Simulation crash: "No structural fragment is loaded"
- **Source**: `structuralSpace.ts:116` called from `enemies.ts:72` → `enemySystem` → `simulationTick`
- **Impact**: 989 console errors (repeating every tick). The enemy system tries to spawn enemies using a structural fragment that was never loaded because the Canvas crashed first.
- **Root cause**: The simulation tick runs regardless of whether the 3D scene mounted. There's no guard checking "did the world actually load?" before running gameplay systems.
- **Fix direction**: Gate `enemySystem` and `simulationTick` behind a "world ready" flag that only flips when the Canvas and structural fragment both loaded successfully.

---

## CRITICAL: UI State Layering (P0)

### C3. All UI layers render simultaneously on world entry
When GENERATE WORLD is clicked, the following all appear at once:
1. **Loading overlay** ("CAMPAIGN INITIALIZATION / STABILIZING STRUCTURAL FEED") — center
2. **Thought overlay** ("... VOID. SILENCE. I AM. BUT WHAT AM I?") — top-left
3. **Mentor relay** text block — below thought overlay
4. **HUD panels**: resource strip, SIM CONTROL, minimap, SYNTH NETWORK header
5. **POI tooltip** ("COAST MINES") — right side
6. **Error text** ("Render Error: Asset module resolution...") — top

These should be sequenced:
1. Loading overlay (alone, full-screen with backdrop)
2. On load complete → dismiss loading → show world
3. Brief pause → thought overlay fades in (alone, no HUD yet)
4. On thought dismiss → HUD elements fade in
5. Mentor relay after HUD settles
6. POI tooltips only on hover/tap

Currently there is zero sequencing — everything fights for attention.

---

## HIGH: Title Screen Issues (P1)

### H1. Missing LOAD GAME button
Only NEW GAME and SETTINGS are rendered. The `load_game.png` asset exists at `assets/ui/buttons/load_game.png` but is not shown on the title screen. Players with saved campaigns cannot load them.

### H2. Zero semantic markup on all interactive elements
Every clickable element is a plain `<div tabindex="0">` with:
- No `role="button"`
- No `aria-label`
- No associated text content (button images are in sibling elements, disconnected from the click target)

Screen readers will announce these as empty/generic elements. This fails WCAG 2.1 Level A (4.1.2 Name, Role, Value).

### H3. Document title is "app"
Should be "Syntheteria" for browser tabs, bookmarks, window managers, and assistive technology.

### H4. All images lack alt text
`background.png`, `new_game.png`, `settings.png` all have `alt=""`. Button images need meaningful alt text since they ARE the button labels (e.g., `alt="New Game"`).

### H5. No focus-visible styles
Keyboard users get zero visual feedback when tabbing between buttons. No outline, glow, border change, or any indicator of focus state.

---

## HIGH: New Game Modal Issues (P1)

### H6. No modal backdrop
The modal renders over the title screen without a semi-transparent backdrop. The background cityscape, title buttons, MEMORY LATTICE info strip, and status cards all bleed through behind the modal. This creates visual competition and makes the modal feel ungrounded.

### H7. Action buttons unreachable without scrolling
At 1280x800 desktop: CANCEL and GENERATE WORLD are at y=1098 but viewport height is 559px. Users must scroll ~540px to reach the only way to proceed or dismiss the modal. No visual scroll indicator exists.

At 390x844 mobile: Even worse — CLIMATE PATTERN, STORM INTENSITY, and action buttons are all below the fold with no hint they exist.

### H8. No quick dismiss
No X button, no backdrop click-to-close, and CANCEL is off-screen. If a user opens the modal accidentally (especially on mobile), they're stuck scrolling through 4 option groups before they can dismiss.

### H9. No focus trap
Tab key escapes the modal into background title screen elements. The modal has no `role="dialog"`, no `aria-modal="true"`, and no focus containment.

### H10. Selection options lack radio semantics
SECTOR SCALE, DIFFICULTY, CLIMATE PATTERN, and STORM INTENSITY option cards are all `<div tabindex="0">` with:
- No `role="radio"` or `role="option"`
- No `aria-selected` or `aria-checked`
- No `role="radiogroup"` on the container

Users can't tell which option is selected via keyboard or screen reader.

### H11. Selected state has extremely low contrast
- **Selected**: `background: rgb(14, 36, 48)` with `border: 1px solid rgb(0, 0, 0)`
- **Unselected**: `background: rgba(9, 19, 27, 0.7)` with `border: 1px solid rgba(255, 255, 255, 0.1)`

The difference is a subtle background brightness shift. No checkmark, no glow, no highlight. A black border on a dark background is invisible. Fails WCAG 1.4.11 (Non-text Contrast).

### H12. Seed input lacks label
The `<input type="text">` for WORLD SEED has no `aria-label`, no linked `<label>`, and the "WORLD SEED" text is a disconnected sibling StaticText node.

---

## MEDIUM: In-Game HUD Issues (P2)

### M1. Overlapping text in header area
"STORM COMMAND UPLINK" header text overlaps with the thought overlay text ("... VOID. SILENCE. I AM. BUT WHAT AM I?"). Both compete for the top-left quadrant.

### M2. SIM CONTROL panel crowded
CITY LAB, 0.5X, 1X, 2X, PAUSE buttons are horizontally packed in the top-right with very tight spacing. At mobile widths this will be completely unusable.

### M3. Resource strip layout
SCRAP, E-WASTE, PARTS, STORM, POWER are rendered as individual badges. At desktop width they're positioned mid-screen. The layout doesn't appear responsive — at mobile widths they'll likely overflow or stack poorly.

### M4. Minimap renders during loading
The SECTOR SCAN / COMMAND GRID minimap panel renders in the bottom-right even while the loading overlay is showing. This is premature — the minimap should only appear after the world is ready.

### M5. POI tooltip renders during loading
"COAST MINES" tooltip/briefing appears at right side during loading. Should be deferred until world is interactive.

---

## MEDIUM: General Polish (P2)

### M6. Deprecation warnings (989 console messages)
- `shadow*` style props deprecated → use `boxShadow`
- `props.pointerEvents` deprecated → use `style.pointerEvents`
- `useNativeDriver` not supported on web → falls back to JS animation
- `THREE.Clock` deprecated → use `THREE.Timer`

These generate noise in console and may affect performance.

### M7. Require cycle warning
`src/bots/index.ts → src/bots/startingRoster.ts → src/bots/index.ts` — circular dependency that could cause initialization order issues.

### M8. Red error background
When Canvas crashes, the fallback is a solid red (#ff0000-ish) background. This should be the game's dark industrial theme color (e.g., `rgb(9, 19, 27)`) not alarm red.

---

## Inventory of What Works

- Title screen background image renders correctly
- NEW GAME and SETTINGS branded button images display properly
- Title screen copy ("SIGNAL RELAY // ACTIVE", subtitle) is well-written and on-brand
- Bottom status strip (STORM / DIRECTIVE / ARCHIVE) has nice data dashboard feel
- New Game modal option cards have good content — descriptions are clear and informative
- Seed generation ("bare-stark-stack") produces evocative procedural names
- RANDOMIZE button placement next to seed input is intuitive
- Two-column layout for options at desktop width is a good density choice
- The thought overlay copy ("... VOID. SILENCE. I AM. BUT WHAT AM I?") is excellent first-contact narrative
- HUD information architecture (resources, sim control, minimap) has the right pieces
- Minimap with COMMAND GRID / NETWORK tabs shows strategic depth

---

## Priority Fix Order

1. **C1 + C2**: Fix Canvas crash and simulation guard — nothing else matters if the game can't render
2. **C3**: Sequence UI layers — loading → world → thought → HUD → tooltips
3. **H7 + H8**: Make modal scrollable with visible indicator, add X/close button, add backdrop
4. **H1**: Restore LOAD GAME button
5. **H2 + H4 + H5 + H9 + H10 + H11 + H12**: Accessibility pass — ARIA roles, labels, focus trap, selection states
6. **H3 + H6**: Document title, modal backdrop
7. **M1-M5**: HUD layout and timing polish
8. **M6-M8**: Console cleanup, error background, deprecation fixes
