# UI Refinement Execution Plan

**Author:** Claude (UI refinement track)
**Date:** 2026-03-11
**Status:** IN PROGRESS
**Answers doc:** `docs/agent-to-agent/UI_REFINEMENT_ANSWERS.md`
**Parent plan:** `docs/plans/CLAUDE_UI_POLISH_PLAN.md`

This plan converts the answered questions and brand contract into a concrete execution sequence. Each phase builds on the previous one. No sub-agents — all work is done in this session.

---

## Phase 0: Design System Foundation

**Goal:** Formalize the color token system so all downstream work is consistent.

### 0.1 Color Token Reference
Establish canonical hex values for the four-tone system:

| Role | Primary | Light/Text | Border/Glow | Usage |
|------|---------|------------|-------------|-------|
| **Cyan** (signal/cognition) | `#8be6ff` | `#edfaff` / `#90ddec` | `#8be6ff/20` | Modals, briefings, title, overlays, selection |
| **Mint** (operational/owned) | `#6ff3c8` | `#e2fff5` / `#7ee7cb` | `#6ff3c8/25` | Owned units, health, active controls, success |
| **Amber** (power/utility) | `#f6c56a` | `#ffe9b0` / `#f7c76d` | `#f6c56a/24` | Fabrication, power, construction, logistics |
| **Red** (threat/failure) | `#ff8f8f` | `#ffe2e2` / `#ff9f9f` | `#ff8f8f/25` | Hostiles, damage, lockout, danger |

### 0.2 Copy Voice Reference
Diegetic, machine-operational. Replace:
- `runtime` → (remove or use `relay` / `lattice`)
- `persistence` → `memory` / `archive`
- `scene transition` → `link` / `relay handoff`
- `contract` → (remove — describe the action instead)
- `SQLite` / `Expo` / `pipeline` → never surface

### Tasks
- `completed` Audit HudPanel PANEL_TONES for correct cyan/mint/amber/red alignment (done 2026-03-11)
- `completed` Audit HudButton BUTTON_TONES for correct tone alignment (done 2026-03-11)
- `completed` Verify no stray green/cyan shades outside the canonical values (done 2026-03-11)

---

## Phase 1: Entry Flow

**Goal:** Title screen, New Game modal, Settings overlay, and Loading overlay reach product-grade visual quality with diegetic copy.

### 1.1 Title Screen
**File:** `src/ui/TitleScreen.tsx`

Changes:
- Replace "Stormfront Relay" eyebrow + subtitle copy with diegetic atmospheric language
- Replace "Persistence Pipeline" section entirely with diegetic system-status messaging
- Replace "Outdoor Generation Online" pill with operational status language
- Replace tech-stack footer (React/Expo/Drizzle/TS logos) with diegetic world-state bar
- Audit spacing between hero button deck and status areas
- Ensure shimmer animation reinforces mood, not distraction
- Get 21st.dev inspiration for title screen composition refinement

### 1.2 New Game Modal
**File:** `src/ui/NewGameModal.tsx`

Changes:
- Replace footer copy ("World generation now runs once per save...") with campaign-commitment language
- Audit option card hierarchy — label, description, meta badge should read as world-defining choices
- Refine "Generate World" button to feel like a campaign initiation action, not a form submit
- Evaluate whether the seed input area needs stronger visual framing

### 1.3 Settings Overlay
**File:** `src/ui/TitleScreen.tsx` (SettingsOverlay function)

Changes:
- Replace all fake settings values with honest states ("Default", "Pending calibration", etc.)
- Refine card hierarchy to match modal design language from NewGameModal
- Add visual distinction between configured and unconfigured states
- Ensure Close button matches action button patterns

### 1.4 Loading Overlay
**File:** `src/ui/LoadingOverlay.tsx`

Changes:
- Replace dev copy ("Persisting world topology...") with diegetic loading narration
- Replace fake 2/3 progress bar with honest indeterminate indicator (pulse/sweep)
- Add staged status language if appropriate ("Encoding terrain lattice...", "Anchoring relay points...")
- Ensure overlay reads as part of the command/signal experience

### Tasks
- `completed` 21st.dev inspiration for title screen composition (entry flow already polished in Phase 0-3)
- `completed` Title screen copy replacement + footer replacement (diegetic copy pass done 2026-03-11)
- `completed` New Game modal copy + hierarchy refinement (diegetic copy pass done 2026-03-11)
- `completed` Settings overlay honest states + visual refinement (honest states + visual done 2026-03-11)
- `completed` Loading overlay honest progress + diegetic copy (indeterminate sweep + diegetic done 2026-03-11)

---

## Phase 2: In-Game HUD

**Goal:** Top bar, selected info, notifications, thought overlay, minimap, and build toolbar reach consistent visual quality under the formalized color system.

### 2.1 Top Bar
**File:** `src/ui/panels/TopBar.tsx`

Changes:
- Audit StatChip color assignments against formalized system (mint for owned resources, amber for power/fabrication)
- Audit "Synth Network" / "Storm Command Uplink" — keep if diegetic, refine if too generic
- Audit sim control area grouping and button density
- Evaluate resource bar readability — is it too dense? Too spread?

### 2.2 Selected Info
**File:** `src/ui/panels/SelectedInfo.tsx`

Changes:
- Audit panel hierarchy (eyebrow → title → stats → hardware → actions)
- Verify color tones align: player units = mint, hostiles = red, buildings = amber
- Check agent status block readability
- Audit repair and fabrication action areas

### 2.3 Notifications
**File:** `src/ui/panels/Notifications.tsx`

Changes:
- Ensure combat alerts feel like machine threat intelligence, not toast notifications
- Ensure merge events feel like a significant topology update
- Audit card sizes and positioning

### 2.4 Thought Overlay
**File:** `src/ui/panels/ThoughtOverlay.tsx`

Changes:
- Verify diegetic tone ("Machine Thought" is good)
- Audit animation enter/exit timing
- Ensure tap-to-dismiss affordance is clear

### 2.5 Minimap
**File:** `src/ui/panels/Minimap.tsx`

Changes:
- Audit header ("World Scan" / "Tactical Minimap") — keep if diegetic
- Verify dot colors align with formalized system (mint = owned, red = hostile, amber = structures)
- Audit radar background treatment

### 2.6 Build Toolbar
**File:** `src/ui/panels/BuildToolbar.tsx`

Changes:
- Audit "Construct" / "Field Deployment" header — keep if operational
- Verify cost display readability
- Ensure disabled state is clear when resources insufficient

### Tasks
- `completed` Top bar audit + color alignment (done 2026-03-11)
- `completed` Selected info hierarchy + color alignment (superseded: SelectedInfo removed, replaced by radial menu)
- `completed` Notifications diegetic refinement (done 2026-03-11)
- `completed` Thought overlay audit (done 2026-03-11)
- `completed` Minimap audit (done 2026-03-11)
- `completed` Build toolbar audit (superseded: BuildToolbar removed, replaced by radial menu)

---

## Phase 3: World/City Interaction

**Goal:** Location panel and city site modal convey campaign-weight actions with no dev language.

### 3.1 Location Panel
**File:** `src/ui/panels/LocationPanel.tsx`

Changes:
- Replace any remaining dev copy ("City interior runtime is active through the persistence-backed world/city contract")
- Audit button labels for campaign clarity ("Open City Brief" / "Return" / "Open Site Brief")
- Verify panel framing uses cyan (it's a briefing/signal surface)

### 3.2 City Site Modal
**File:** `src/ui/CitySiteModal.tsx`

Changes:
- Replace "Action Flow" section copy ("uses the same persistence-backed scene transition contract...")
- Audit survey/found/enter/return button hierarchy — these should feel like campaign decisions
- Verify modal framing uses cyan (briefing surface)
- Audit card layout (Site Role + City State side by side)

### Tasks
- `completed` Location panel copy + framing audit (done 2026-03-11)
- `completed` City site modal copy + action hierarchy (done 2026-03-11)

---

## Phase 4: Accessibility

**Goal:** All touched surfaces pass minimum accessibility requirements.

### Tasks
- `completed` Touch target audit (min 44x44 pt on all interactive elements, done 2026-03-11)
- `completed` Contrast audit (text over dark backgrounds, done 2026-03-11)
- `completed` Focus/keyboard audit on modals (NewGame, Settings, CitySite — done 2026-03-11)
- `completed` Motion audit (reduced-motion alternatives identified 2026-03-11)

---

## Phase 5: Testing

**Goal:** Every materially changed surface has updated or new test coverage.

### Tasks
- `completed` Identify existing component tests for touched surfaces (done 2026-03-11)
- `completed` Update or add Playwright component tests (TitleScreen, HudButton tests updated 2026-03-11)
- `completed` Update screenshots if visual states changed materially (done 2026-03-11)
- `completed` Update E2E if player journeys changed (radial menu replaces panel interactions — E2E covers flow)

---

## Execution Order

1. Phase 0 (design tokens) → foundation for everything
2. Phase 1 (entry flow) → highest visual impact, first impression
3. Phase 2 (HUD) → core gameplay surfaces
4. Phase 3 (world/city) → campaign interaction surfaces
5. Phase 4 (accessibility) → sweep across all touched surfaces
6. Phase 5 (testing) → lock everything down

Each phase updates `CLAUDE_UI_POLISH_PLAN.md` progress log when complete.
