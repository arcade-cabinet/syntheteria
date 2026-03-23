# Syntheteria - UI Concept: 2.5D Top-Down with Fragmented Exploration

## Design Philosophy

The player experiences the world through a **2.5D/3D top-down view** combined with **text cues and options** for consciousness-level interactions. You are an AI reaching out into the world through machines — the interface reflects both your abstract consciousness and the physical reality your robots inhabit.

### Core Principle
> "Your world is only as complete as what your machines have seen. Everything else is void."

---

## Visual Identity

### The Top-Down View

The primary game view is a 2.5D or 3D top-down perspective showing:
- Your explored terrain and structures
- Your robots and their current activities
- Environmental effects (lightning, storm, wormhole glow)
- Enemy units when detected by sensors

### Text and Consciousness Layer

Overlaid on the world view is a text/UI layer representing your consciousness:
- Text cues when connecting to new machines
- Options and commands for robot control
- Status information from your network
- Story elements and discoveries

---

## Exploration and Mapping

### Fragmented Maps

This is the game's signature visual mechanic. The overhead view shows **explored areas as floating fragments** surrounded by void:

- Each robot generates its own map piece as it moves
- Camera-equipped robots produce **clear, detailed maps** (full visual representation)
- Robots without cameras produce **abstract maps** (walls and obstacles only, no visual detail)
- Map fragments float near each other but are **disconnected** — no indication of relative distance or orientation

### Map Merging

When two previously separated robots physically encounter each other:
- Their map fragments **snap together**, connecting into a unified piece
- The player gains understanding of how these areas relate spatially
- This is deeply satisfying and creates natural exploration motivation

### Visual Representation

**Explored areas:** Rendered terrain, structures, objects in the 2.5D view
**Abstract-mapped areas:** Wireframe or schematic representation (walls without texture)
**Unexplored areas:** Void/darkness
**Fog of war:** Areas previously explored but not currently observed may fade or become less detailed

---

## Camera and Focus

### Default View: Strategic Overview

- Top-down view of your explored world
- All active robots visible as units on the map
- Zoom in/out for strategic or tactical focus
- Pan across your territory

### Robot Focus

- Click/select a robot to center the view on it
- If the robot has a camera, the surrounding area is rendered in detail
- Can look through a robot's camera for first-person perspective (useful for detailed inspection)
- Multiple feeds can be displayed simultaneously as picture-in-picture

### Automation View

- Set up automation rules and watch robots execute them
- Player chooses their level of engagement — micro-manage everything or set rules and observe
- Automation configuration through a visual interface (engagement rules, patrol routes, behavior priorities)

---

## The Perpetual Storm

### Sky and Atmosphere

- The sky is never visible — only the churning perpetual storm
- The wormhole pulses through the storm clouds, sending energy waves earthward
- Lightning strikes are visible events — both from lightning rods (power) and random strikes (danger)

### Inside the City

- Lightning rods capture storm energy — visual arcs of electricity hitting rods
- The city feels sheltered despite the oppressive sky
- Storm intensity may vary, affecting power generation

### Outside the City

- Lightning strikes randomly, creating environmental hazard
- Units can be damaged by strikes
- The further from the city, the more exposed and dangerous

---

## Visual Progression

### Early Game: Fragments in the Void

- Small disconnected map pieces floating in darkness
- Limited robot feeds, mostly abstract/wireframe
- Feels constrained, isolated, uncertain
- Text-heavy as you communicate with machines

### Mid Game: Connected Territory

- Large merged map showing the city and surrounding areas
- Multiple robot feeds, clear visual representation
- Expanding view as robots venture further
- Interface feels capable, growing

### Late Game: War Map

- Full strategic overview of the world
- Army-scale unit management
- Threat indicators from cultist territory
- The map is mostly connected but enemy territory remains foggy

---

## The Wormhole

The wormhole is always visible in the sky through the storm. It serves as:
- A constant visual reminder of the alien threat
- An environmental element (pulsating, sending energy waves)
- A narrative focal point (what is it? what comes through?)
- The game's final destination (ending: launch through it)

---

## Inspirations

- **Duskers** — Drone control through limited interfaces, fog of war, tension from the unknown
- **SOMA** — Abstract consciousness themes
- **Hacknet** — Terminal/data-driven interface elements
- **RTS games** — Top-down strategic view, unit management
- **FTL** — Managing systems under pressure, text-based events

---

## Technical Considerations

- **Rendering:** 2.5D/3D top-down with dynamic fog of war and fragmented map system
- **Performance:** Map fragments need efficient rendering — only render visible/nearby fragments
- **Platform:** Must work on both PC (mouse/keyboard) and mobile (touch) equally well
- **Scalability:** Late game may have hundreds of units and large explored areas

---

## Open Design Questions

1. How do Energy and Compute constraints manifest visually in the interface?
2. What does combat look like in the top-down view? Unit animations? Health indicators?
3. How do we represent the passage of time when the player uses speed controls?
4. What visual language represents the EL's influence and Cultist supernatural powers?
5. How detailed should the 2.5D world be? Low-poly stylized? Pixel art? Clean/minimal?
6. How does the abstract map (from camera-less robots) look distinct from the detailed map?
