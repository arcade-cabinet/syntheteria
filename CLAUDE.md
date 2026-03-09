# Syntheteria - Development Context

## Project Status

**MAJOR REDESIGN IN PROGRESS** — Pivoting from 2.5D top-down strategy to **3D first-person factory planet exploration/building game.**

Previous Phase 2 prototype exists with working ECS, terrain, power, fabrication, combat, and pathfinding systems. These are being restructured for FPS view and factory mechanics (conveyor belts, wires, mining, processing).

See: [FACTORY_PLANET_FPS_REDESIGN.md](./docs/design/FACTORY_PLANET_FPS_REDESIGN.md) for the full design vision.

### Core Systems (Carry Forward)
- Miniplex ECS with component-based entities
- Procedural terrain generation (reinterpret for machine planet surface)
- Power system with storm intensity and lightning rods (add physical wire networks)
- Resource system (expand from scavenging to mining → belt transport → processing → fabrication)
- Fabrication system (belt-fed input/output)
- Component-based combat (damage breaks parts, not HP bars)
- Feral enemy AI with patrol and aggro behavior
- Pathfinding/navmesh (for NPC bots; player uses direct FPS control)
- Game state tick loop

### Systems Being Replaced
- Top-down camera → FPS camera (pointer lock, WASD, attached to player bot)
- Click-to-select unit input → Direct first-person bot control + consciousness transfer
- Bird's-eye unit/building rendering → Ground-level PBR rendering
- Billboard otter sprites → Holographic projection system (Star Wars style)
- 9-screen narration intro → Organic story discovery through exploration
- Minimap/selection panels → FPS HUD

---

## Vision Summary

You awaken as a broken robot on the surface of a machine planet. First person. You see through a damaged camera sensor — glitchy, scan-lined. Your arms don't work. Nearby, another bot has arms but no camera. Together, you're functional. From there: explore the machine planet, mine raw resources, build conveyor belts and processing chains, fabricate increasingly complex components, construct more bots, and expand your factory network across the planet's surface.

**Primary view:** 3D first-person (you ARE the bot)
**Setting:** Machine planet — terrain is corroded metal, slag heaps, cable forests, processor graveyards
**Core loop:** Explore → Mine → Transport (belts) → Process → Fabricate → Build → Expand
**Story:** Unfolds organically through exploration, holographic logs, otter encounters — no forced narration
**Enemies:** Feral machines, cultists with lightning powers, rogue AIs
**Victory:** Defeat the Cult of EL, launch through the wormhole

---

## Engine Decision: Custom (R3F + Three.js + ECS)

### Decision Status: Decided — Custom web engine

Using React Three Fiber, Three.js, and Miniplex ECS. No Unity, no Godot.

**Rationale:**
- **Web-native:** Runs in any browser — no app store gatekeeping
- **AI-assisted development:** All code is text (TypeScript, JSX) — fully readable and verifiable by AI
- **FPS + factory systems:** R3F handles first-person cameras, PBR materials, instanced belt/wire rendering
- **Free forever:** No licensing costs at any scale
- **Iteration speed:** Hot reload, instant deploy, no compile step for logic changes

**Trade-offs accepted:**
- Must build more from scratch (no built-in physics, animation, etc.)
- 3D performance ceiling lower than native engines for extreme scenes
- Mobile WebGL has device-specific quirks to handle
- FPS pointer lock has browser-specific behavior

See: [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md) for technical design (being updated for FPS).

---

## Current Design Decisions

- **Engine:** Custom — React Three Fiber + Three.js + Miniplex ECS (TypeScript)
- **Platform:** PC primary (FPS), mobile secondary (virtual sticks)
- **Primary view:** 3D first-person — you are the bot
- **Navigation:** Direct WASD control for player bot; navmesh A* for NPC bots
- **Exploration:** Walk the machine planet surface, discover regions organically
- **Power:** Lightning rods + physical wire networks with catenary cable rendering
- **Resources:** Mining drills → conveyor belts → processors → fabrication units
- **Combat:** Component-based damage from first person
- **Enemies:** Feral machines, cultists with lightning powers
- **Building:** First-person placement of belts, wires, miners, processors, fabrication units
- **Art style:** PBR procedural materials (rusted metal, circuit traces, emissive glow)
- **Sprites:** Holographic projections (billboard behavior is correct for holograms)
- **Story:** Organic discovery — no forced narration screens
- **Multiplayer:** Future scope — multiple bots on same planet

---

## What Needs Work

### FPS Foundation (Critical — Current Priority)
- Replace `TopDownCamera` with `FPSCamera` (pointer lock, WASD, bot-attached)
- Replace `UnitInput` with FPS direct control
- Add `PlayerControlled` component to ECS
- Building collision for FPS movement
- Bot switching (consciousness transfer between owned bots)

### Factory Systems (Major)
- Conveyor belt ECS components, placement, rendering, transport logic
- Wire ECS components, placement, catenary rendering, power flow
- Mining drill buildings (extract → belt output)
- Processor buildings (smelter, refiner — belt in/out)
- Expanded fabrication (belt-fed input, belt output)

### PBR Ground-Level Rendering (Major)
- Procedural PBR materials (rusted steel, circuit board, rubber belt, etc.)
- Rebuild renderers for eye-level detail
- Holographic projection shader for otter sprites and data displays

### Gameplay Systems (Major)
- **Hacking system** — core mechanic, not yet implemented
- **Cultist enemies** — humans with lightning powers
- **Signal/compute network** — global compute pool, BFS connectivity
- **Save/load** — IndexedDB persistence
- **Audio** — storm ambience, machinery sounds, combat

### Organic Story
- Remove forced narration overlay
- Story discovery through holographic logs, otter encounters, environmental details
- Tutorial through gameplay, not text walls

---

## Testing Strategy

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | ECS systems, formulas, game logic |
| Integration | Vitest + @testing-library/react | React components, state bridge |
| E2E | Playwright | Full gameplay loops in browser |
| CI | GitHub Actions | Automated on every commit |

---

## Next Steps

### Phase 1: FPS Foundation
1. **FPS Camera** — pointer lock, WASD movement, attached to player bot
2. **Direct bot control** — replace click-to-select with first-person embodiment
3. **Building collision** — can't walk through structures
4. **Bot switching** — transfer consciousness between bots (Q key)

### Phase 2: Ground-Level Rendering
5. **PBR materials** — procedural textures for metal, circuit, belt surfaces
6. **Eye-level buildings** — rebuild CityRenderer for walkable scale
7. **Eye-level bots** — rebuild UnitRenderer with detail
8. **Holographic projections** — otter sprites as holograms with shader effects

### Phase 3: Factory Systems
9. **Conveyor belts** — placement, rendering, item transport
10. **Power wires** — catenary cables, visible power flow
11. **Mining drills** — resource extraction to belt output
12. **Processors** — belt-in, transform, belt-out
13. **Expanded fabrication** — more recipes, belt integration

### Phase 4: Gameplay Expansion
14. **Hacking system** — signal link + technique + compute
15. **Cultist enemies** — lightning-wielding humans
16. **Signal/compute network** — BFS connectivity
17. **Save/load** — IndexedDB persistence
18. **Audio** — storm, machinery, combat

---

## Resources

- [React Three Fiber](https://r3f.docs.pmnd.rs/) - React renderer for Three.js
- [Miniplex](https://github.com/hmans/miniplex) - ECS for TypeScript
- [drei](https://github.com/pmndrs/drei) - R3F helpers and abstractions
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E browser testing
