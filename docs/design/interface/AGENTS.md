# Interface Design -- Agent Guide

How the player interacts with the game. HUD, input, menus, onboarding.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `UI.md` | HUD layout, pregame lobby, menus, bezel overlay, design system | Two palettes (amber/chrome menu vs. faction-colored HUD), all component files, component tree, ARIA accessibility, config references. |
| `INTERACTION.md` | Contextual actions, radial menus, raycasting, build mode, FPS controls | Click-anything interaction model, ObjectSelectionSystem, emissive highlight, action menus per entity type, action dispatch routing. |
| `ONBOARDING.md` | Tutorial phases, otter hologram guidance, first-5-minutes pacing | No tutorial popups -- otter holograms appear in-world to guide actions. Progressive disclosure of mechanics. |

## Config Files

| Config | Controls |
|--------|----------|
| `config/quests.json` | Onboarding quest sequence, otter dialogue |
| `config/interaction.json` | Entity interaction ranges, actions per type, radial menu radius/animation |
| `config/inventory.json` | Item categories, weights, max stacks, slot count and weight limit |
| `config/rendering.json` | UI rendering params, hologram visual treatment |
| `config/civilizations.json` | Faction colors used for HUD faction-color override |

## Key Concepts

- **Contextual, not equip** -- no explicit tool equip for world interactions. Click any object and a radial menu shows available actions for THAT object in THAT context.
- **Tool menu coexists** -- `RadialToolMenu` / `EquippedToolView` still exist for player stance/capability selection (used by mobile controls and inventory view). This is separate from world-object interaction.
- **Two palettes** -- menu screens (title, pregame, pause) use amber/chrome (`designTokens.ts` `menu.*`). In-game HUD uses faction-colored machine vision (`hud.*`). Both defined in `src/ui/designTokens.ts`.
- **Bezel frame** -- retro CRT-style frame around the viewport. Displays bot name, resources, power, equipped state.
- **Machine vision** -- HUD elements are holographic projections, not traditional UI. Scan lines, flicker, data corruption when camera is damaged.
- **Mobile support** -- nipplejs virtual joystick, action buttons, tablet-optimized layout.
- **Accessibility** -- ARIA labels, keyboard navigation, aria-live regions, safe areas.

## Source Code -- UI Components

| Path | Purpose |
|------|---------|
| `src/ui/designTokens.ts` | Shared palette constants (menu amber/chrome + HUD faction-green) and `MIN_TOUCH_TARGET` |
| `src/ui/TitleScreen.tsx` | Title screen -- "SYNTHETERIA" branding, NEW GAME / CONTINUE buttons |
| `src/ui/PregameScreen.tsx` | Tabbed pregame lobby shell (PATRON / MAP / RIVALS / SETTINGS) |
| `src/ui/FactionSelect.tsx` | Patron/faction selection cards tab |
| `src/ui/MapConfig.tsx` | Map size, type, density, biome sliders, seed, preview tab |
| `src/ui/OpponentConfig.tsx` | Rival colony setup tab |
| `src/ui/SettingsScreen.tsx` | Victory conditions, difficulty, game rules tab |
| `src/ui/LoadingScreen.tsx` | 14-step initialization with typewriter progress |
| `src/ui/Bezel.tsx` | CRT bezel frame component |
| `src/ui/FPSHUD.tsx` | Main game HUD overlay (crosshair, resources, speed controls, bot status) |
| `src/ui/CoreLoopHUD.tsx` | Core loop state HUD (powder storage, compression bar, furnace status, held cube) |
| `src/ui/GameUI.tsx` | RTS-style overlay (unit/building panels, build toolbar, minimap, fab shortcut) |
| `src/ui/PowerOverlay.tsx` | Power grid status (generation/demand bar, warnings, selected building detail) |
| `src/ui/QuestPanel.tsx` | Quest tracker, otter dialogue, completion notification |
| `src/ui/TechTreePanel.tsx` | Tech tree node graph, toggle button, prerequisite SVG lines |
| `src/ui/InventoryView.tsx` | Tab-toggled full-screen inventory modal (components, resources, tool, network) |
| `src/ui/ObjectActionMenu.tsx` | In-game wiring of RadialActionMenu to ECS selection state |
| `src/ui/RadialActionMenu.tsx` | Pure layout/hit-testing radial menu SVG component |
| `src/ui/RadialToolMenu.tsx` | Tool selection radial menu (player stance) |
| `src/ui/EquippedToolView.tsx` | Bottom-center tool display + mobile action button cluster |
| `src/ui/MobileControls.tsx` | Mobile overlay container (joystick + tool view + action buttons) |
| `src/ui/MobileJoystick.tsx` | nipplejs virtual joystick |
| `src/ui/PauseMenu.tsx` | ESC-triggered pause overlay |
| `src/ui/SaveLoadMenu.tsx` | Save/load slot picker |
| `src/ui/GameOverScreen.tsx` | Victory ("SYNTHETERIA RECLAIMED") / defeat ("SYSTEMS OFFLINE") overlay |
| `src/ui/ErrorBoundary.tsx` | React error boundary -- "SYSTEM FAULT" with RETRY / REBOOT |

## Source Code -- Input

| Path | Purpose |
|------|---------|
| `src/input/FPSInput.tsx` | Keyboard/mouse/touch input handler (WASD, E, F, C, G, Q, ESC) |
| `src/input/ObjectSelectionSystem.tsx` | Rapier raycast -- entity selection, three-strategy cascade |
| `src/input/selectionState.ts` | Reactive pub/sub store for selected entity |
| `src/input/raycastUtils.ts` | Rapier ray utility, collider-to-entity registry |
