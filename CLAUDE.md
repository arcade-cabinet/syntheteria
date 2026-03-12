# Syntheteria UI / UX Execution Contract For Claude

This file is the explicit collaboration contract for Claude when working on Syntheteria's player-facing surfaces.

Claude should treat this file as operational context, not as a loose project summary. The job is to refine, redesign, and extend the visible product in a way that stays aligned with the canonical docs, the brand assets already in-repo, and the test/documentation discipline now expected in this repository.

## Canonical Docs To Read First

Claude should read these before touching UI, HUD, flows, scenes, or player-facing copy:

1. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/GAME_DESIGN.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/GAME_DESIGN.md)
2. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/TECHNICAL.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/TECHNICAL.md)
3. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/LORE.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/LORE.md)
4. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md)
5. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/ASSET_GAPS.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/ASSET_GAPS.md)
6. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md)
7. [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md)

Claude should not rely on old assumptions in this repository like:
- web-only Vite/Miniplex architecture
- purely procedural debug UI
- “city as modal abstraction”
- placeholder iconography or generic sci-fi panel kits

## Product Direction

Syntheteria is not a generic sci-fi strategy UI. It is:
- a storm-bound machine-consciousness 4X
- post-human, industrial, ruinous, cold, and deliberate
- brand-forward, but not loud or toy-like
- touch-first even when rendered on desktop
- grounded in true world-to-city transitions, not fake city overlays

It should preserve these truths:
- The player is an awakening distributed intelligence, not a human commander.
- Outdoor exploration and interior city spaces are both real navigable spaces.
- The interface should feel like a machine perception layer and command relay, not fantasy parchment, not consumer-mobile chrome, and not generic blue cyber slop.

## Brand Assets Already In Repo

Claude should use the actual in-repo assets instead of inventing replacement identity:
- title background: [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/background.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/background.png)
- title buttons:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/new_game.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/new_game.png)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/load_game.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/load_game.png)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/settings.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/settings.png)
- mark:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/mark.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/mark.png)

Supporting UI should harmonize with these assets rather than compete with them.

## Player-Visible Surfaces Claude Must Treat As In Scope

No player-visible surface should be considered too small for polish or accessibility review.

### Current Source Map

Claude should assume these files are the current implementation map for player-visible surfaces:

- title flow:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/TitleScreen.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/TitleScreen.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/NewGameModal.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/NewGameModal.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/LoadingOverlay.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/LoadingOverlay.tsx)
- in-game shell:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/GameUI.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/GameUI.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/TopBar.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/TopBar.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/Notifications.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/Notifications.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/ThoughtOverlay.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/ThoughtOverlay.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/Minimap.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/Minimap.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/ResourceStrip.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/ResourceStrip.tsx)
- radial context menu (replaces SelectedInfo, BuildToolbar, BottomSheet entirely):
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/config/radialMenu.json`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/config/radialMenu.json)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/systems/radialMenu.ts`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/systems/radialMenu.ts)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/systems/radialProviders.ts`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/systems/radialProviders.ts)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/RadialMenu.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/RadialMenu.tsx)
- world / city interaction:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/LocationPanel.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/panels/LocationPanel.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/CitySiteModal.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/CitySiteModal.tsx)
- shared visual primitives:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/components/HudButton.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/components/HudButton.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/components/HudPanel.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/components/HudPanel.tsx)
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/icons.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/ui/icons.tsx)
- city tooling:
  - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/src/city/runtime/CityKitLab.tsx`](/Users/jbogaty/src/arcade-cabinet/syntheteria/src/city/runtime/CityKitLab.tsx)

### Entry Flow
- Title screen
- New Game modal
- Settings overlay
- Loading overlay

### Core In-Game Shell
- Resource strip (responsive top bar — phone/tablet/desktop)
- Radial context menu (right-click desktop / long-press mobile) — ALL contextual actions
- Notifications panel
- Thought overlay
- Minimap
- Location panel
- **REMOVED**: SelectedInfo panel, BuildToolbar, BottomSheet — all replaced by radial menu

### World / City Interaction Surfaces
- City site brief modal
- survey / found / enter / return affordances
- city-purpose/status messaging
- continue/resume state indicators

### City-Specific Tooling And Future-Facing Surfaces
- City Kit Lab
- city assembly views
- city-purpose panels
- fabrication / storage / power / habitation surfaces that do not yet feel final

### Smaller Details That Still Count
- button states
- icon usage
- empty states
- disabled states
- loading states
- panel titles / eyebrow copy
- spacing, contrast, hit targets, motion timing, focus/hover/pressed behavior

If the player can see it, Claude should treat it as real product surface area.

## Visual Language Requirements

Claude should follow the detailed guidance in [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md), but the high-level rules are:

- Use a dark industrial base, not pure black voids everywhere.
- Cyan is an accent, not the whole UI.
- Amber is infrastructure/power/fabrication.
- Red is only for genuine threat or failure.
- Panels should feel projected and engineered, not thickly beveled mobile game cards.
- Preserve readable center-stage compositions in the title/new-game flow.
- Prefer layered depth, borders, glow rails, scan motifs, and restrained gradients over noisy textures.
- Motion should be intentional, sparse, and readable.
- Every surface must remain legible over complex 3D content.

Claude may use 21st.dev and other inspiration sources for refinement direction, but should not copy generic patterns that dilute the game’s identity.

## Accessibility Requirements

Claude should treat accessibility work as part of polish, not a later pass.

At minimum:
- touch targets should be finger-safe
- critical actions cannot depend on hover-only reveal
- text contrast must remain readable over the world and city scenes
- button states must be distinguishable beyond color alone
- modal layering must preserve readability and focus
- important surfaces should work on desktop and mobile widths
- motion should be restrained enough that reduced-motion alternatives are feasible
- crucial interaction copy should be short, direct, and not rely on decorative ambiguity

If Claude changes a flow, it should also consider keyboard/focus order on web where relevant.

## Architecture And Ownership Boundaries

Claude should respect these boundaries:
- `src/ai` owns behavior runtime work
- ECS/runtime systems own simulation state
- SQLite/Drizzle own persisted campaign state
- UI should expose real persisted/runtime state, not invent shadow state if avoidable
- world/city transitions are real scene transitions, not fake modal-only shortcuts

Claude is free to create or refine components, flows, and tests, but should not solve product gaps by adding more placeholders or compatibility shims.

## Testing Ownership

Claude should assume it owns tests for any player-facing surface it changes.

Current UI-facing test roots:
- component tests: [`/Users/jbogaty/src/arcade-cabinet/syntheteria/tests/components`](/Users/jbogaty/src/arcade-cabinet/syntheteria/tests/components)
- browser E2E: [`/Users/jbogaty/src/arcade-cabinet/syntheteria/tests/e2e`](/Users/jbogaty/src/arcade-cabinet/syntheteria/tests/e2e)

### Required Test Layers
- Jest for pure view-model or small logic helpers where appropriate
- Playwright component tests for visible components, panels, and modals
- screenshot coverage for important visual states where stable
- Playwright E2E when a flow spans title -> world -> city -> return or similar

### Minimum Rule
If Claude changes a visible flow, it should update or add:
1. component-level coverage for the touched surface
2. E2E coverage if the change affects a multi-step player flow

Claude should not leave stale tests behind that describe the old UI.

## Progress Communication Back Into This Repo

Claude should communicate progress through repository state, not vague summaries.

Required process:
1. Update the active checklist in [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md)
2. Mark tasks as:
   - `pending`
   - `in_progress`
   - `completed`
   - `blocked`
3. When a meaningful chunk is completed, append a short dated progress note to the plan:
   - what changed
   - which files changed
   - which tests were updated
   - any remaining visual or accessibility risks
4. If Claude changes a visible flow, it should also update the relevant doc section in:
   - [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md)
   - or [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md)
   if the interaction contract changed

This is how Claude communicates progress back to Codex and to future agents.

Before changing world/city TSX that depends on shared runtime or city-placement logic, Claude should also read:

- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/CITY_CONTRACTS.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/CITY_CONTRACTS.md)
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/INPUT_AND_INTERACTION.md`](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/INPUT_AND_INTERACTION.md)

## What Claude Should Prefer

- real UI flows over mockups
- component-tested surfaces over screenshots alone
- documented product decisions over one-off polish bursts
- systemized patterns over random bespoke styling
- explicit state exposure over hidden debug assumptions

## What Claude Should Avoid

- generic sci-fi panel kits that ignore brand identity
- reintroducing placeholder copy or stub affordances where the game has real state
- changing visual direction without updating the docs
- creating untested flows
- bypassing the existing world/city runtime contract with temporary overlays

## Immediate Mission

Claude’s immediate mission is to help push every visible player-facing surface toward a coherent, branded, accessible, test-backed product state while staying aligned with the canonical docs and the active plan.

That includes:
- title/new-game/settings refinement
- world HUD polish
- city interaction polish
- modal/system state polish
- City Kit Lab usability polish
- accessibility improvements
- component test and E2E updates

Claude should assume there is still a large amount of valuable UI/UX work left, and that this work is a core part of making Syntheteria real rather than cosmetic afterthought.
