# Interface Design — Agent Guide

How the player interacts with the game. HUD, input, menus, onboarding.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `UI.md` | HUD layout, pregame lobby, menus, bezel overlay, design system | Resource bar, bot status, speed controls, pause menu, settings, save/load, ARIA accessibility. |
| `INTERACTION.md` | Contextual actions, radial menus, raycasting, build mode, FPS controls | Click-anything interaction model, ObjectSelectionSystem, emissive highlight, action menus per entity type. |
| `ONBOARDING.md` | Tutorial phases, otter hologram guidance, first-5-minutes pacing | No tutorial popups — otter holograms appear in-world to guide actions. Progressive disclosure of mechanics. |

## Config Files

| Config | Controls |
|--------|----------|
| `config/quests.json` | Onboarding quest sequence, otter dialogue |
| `config/rendering.json` | UI rendering params, hologram visual treatment |

## Key Concepts

- **Contextual, not tools** — no equipped tool. Click any object → emissive highlight → radial menu shows available actions for THAT object.
- **Bezel frame** — retro CRT-style frame around the viewport. Displays bot name, resources, power, equipped state.
- **Machine vision** — HUD elements are holographic projections, not traditional UI. Scan lines, flicker, data corruption when camera is damaged.
- **Mobile support** — nipplejs virtual joystick, action buttons, tablet-optimized layout.
- **Accessibility** — ARIA labels, keyboard navigation, aria-live regions, safe areas.

## Source Code

| Path | Purpose |
|------|---------|
| `src/ui/Bezel.tsx` | CRT bezel frame component |
| `src/ui/FPSHUD.tsx` | Main game HUD overlay |
| `src/ui/ObjectActionMenu.tsx` | Context-sensitive radial menu |
| `src/input/FPSInput.tsx` | Keyboard/mouse/touch input handler |
| `src/input/ObjectSelectionSystem.tsx` | Rapier raycast → entity selection |
