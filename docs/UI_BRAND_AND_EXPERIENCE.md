# UI Brand And Experience Contract

This document defines the player-facing design language for Syntheteria. It is the canonical reference for UI polish, interaction tone, accessibility expectations, and flow design.

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

## 2. Core Mood

The emotional register should be:
- cold
- deliberate
- eerie
- infrastructural
- resilient rather than triumphant

The interface is a projection of machine perception and command authority. It is not neutral chrome. It is part of the fiction.

## 3. Visual Language

### Base Palette
- deep graphite and oil-dark blue for panel mass
- muted steel/industrial tones for support surfaces
- cyan for signal, focus, selection, and intelligence glow
- mint for owned/healthy/active operational state
- amber for fabrication, power, and utility
- restrained red for failure, danger, hostile pressure

The cyan/mint split is intentional:
- `cyan` frames machine cognition, signal, overlays, and interaction focus
- `mint` marks stable operational ownership, health, and active command readiness
- these should not blur into arbitrary green/cyan drift

### Surface Treatment
- thin engineered borders
- layered panels with subtle depth
- selective glow rails, scanline hints, and signal motifs
- controlled gradients instead of flat blocks
- limited texture noise

### Motion
- staggered reveals where useful
- soft shimmer or pulse for high-energy surfaces
- crisp hover/press/focus response
- avoid constant busy motion
- animation should reinforce state changes, not distract from them

### Typography
- technical, deliberate, readable
- uppercase labels only where the hierarchy benefits from it
- longer descriptive text should remain highly legible and low-drama
- do not overcompress everything into tiny diagnostic type

## 4. Brand Assets

Primary assets currently in use:
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/background.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/background.png)
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/mark.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/mark.png)
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/new_game.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/new_game.png)
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/load_game.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/load_game.png)
- [`/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/settings.png`](/Users/jbogaty/src/arcade-cabinet/syntheteria/assets/ui/buttons/settings.png)

These assets establish the direction. Supporting UI should harmonize with them rather than compete with them.

## 5. Major Player Flows

### Title Flow
- the background art should remain visually dominant in the center
- primary interaction should live in the upper band
- `New Game` is the main call to action
- `Continue` appears only when persisted saves exist
- `Settings` should remain visible and distinct

### New Game Flow
- seed, map size, difficulty, climate, and storm profile must feel like meaningful campaign commitments
- the modal should read as a world-initialization ritual, not a generic form
- copy should reinforce deterministic world generation and campaign persistence

### Loading Flow
- loading overlays should feel integrated with the command/signal language
- loading should communicate what the game is doing
- do not leave players staring at empty transitions
- do not present fake deterministic progress if the runtime does not expose real progress
- prefer indeterminate or staged progress language over dishonest percentages

### World HUD
- top bar should communicate command status, resources, pressure, and simulation control cleanly
- selected-unit and location context should be readable without flooding the screen
- world interactions should feel operational, not menu-driven

### World -> City Flow
- surveying, founding, entering, and returning must feel like campaign actions, not temporary view toggles
- city status should communicate role and progression clearly
- transitions should reinforce that cities are real spaces in the campaign

### City Runtime
- cities should read as operational interior spaces
- UI should support future fabrication, storage, power, habitation, and service loops
- the player should understand where they are and why the space matters

## 6. Component-Level Requirements

### Buttons
- strong state readability
- hover, focus, pressed, and disabled states
- no button should depend on art alone to be understandable
- primary, secondary, and danger actions must be visually distinct
- active/healthy/owned action states may lean mint
- modal/briefing/signal framing may lean cyan

### Panels
- title, eyebrow, body, and actions should have clear hierarchy
- panels over 3D scenes need strong backdrop control
- panel density should stay high-signal, not cramped

### Modals
- every modal needs a clear reason to exist
- every modal should contain real actions or information
- modal layering should preserve context without sacrificing legibility

### Notifications / Thought Overlay
- narration and machine-thought moments should feel diegetic
- these surfaces should never read like default toast notifications

### Copy Tone
- player-facing copy should be diegetic or near-diegetic
- avoid raw engineering vocabulary like `runtime`, `SQLite`, `pipeline`, `contract`, or `scene transition`
- use machine-operational language instead of implementation narration

### Developer-Facing Surfaces
- tools like City Kit Lab are still part of the product quality pipeline
- they should be clear, navigable, and visually coherent even if dev-facing

## 7. Accessibility Requirements

Non-negotiable expectations:
- touch-safe targets
- mobile and desktop readability
- sufficient contrast over dynamic backgrounds
- visible non-hover states
- no critical information encoded by color alone
- sensible focus order on web
- reduced reliance on small text for primary actions
- room for future reduced-motion handling

## 8. Testing Expectations For UI Work

Any change to a visible player surface should be backed by:
- component tests for the surface itself
- screenshot coverage where stable and useful
- E2E coverage if the flow spans multiple scenes or modals

UI quality is not complete when it “looks okay locally.” It is complete when:
- the interaction contract is documented
- the surface is test-backed
- the state it displays is real

## 9. Current Priority Surfaces

The highest-priority polish targets right now are:
- title screen
- New Game modal
- settings overlay
- loading overlay
- top bar
- selected-unit info
- location panel
- city site modal
- city entry / return flow
- City Kit Lab readability and navigation

## 10. Coordination With Runtime Systems

UI should reflect:
- real save state
- real world/city state
- real POI/city progression
- real simulation status
- real AI or actor status when exposed

UI should not introduce fake fallback states to hide missing systems. If a system is missing or incomplete, surface that clearly and fix the system rather than masking it.

For settings and other unfinished surfaces:
- prefer honest states like `Default`, `Pending calibration`, or `Unavailable in this build`
- do not use fabricated percentages or fake configured values just to make a panel look finished
