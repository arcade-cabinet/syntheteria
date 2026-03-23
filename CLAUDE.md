# Syntheteria - Development Context

## Project Status

Strategy game about awakening AI consciousness in a post-apocalyptic industrial city. Phase 2 prototype implemented with procedural city environment, building placement, power/resource systems, fabrication, enemy AI, and component-based combat. Title screen and intro narration flow complete. Mobile input redesigned for proper touch controls.

### Implemented Systems
- Title screen with glitch effect and game flow (title → narration → playing)
- Procedural city layout with factories, warehouses, towers, ruins, and perimeter walls
- Instanced mesh city rendering with building details (windows, roofs, ledges)
- Mobile-first input: two-finger pan/zoom for camera, single tap for unit interaction
- Desktop input: WASD/arrows + scroll zoom, left-click select, right-click move
- Power system with fluctuating storm intensity and lightning rod output
- Resource scavenging (scrap metal, e-waste, intact components) from city points
- Building placement with ghost preview and resource cost validation
- Fabrication system with 5 recipes (camera, arms, legs, power cell, power supply)
- Feral enemy AI with patrol and aggro behavior (6 spawn zones)
- Component-based combat (damage breaks parts, not HP bars)
- Repair system (units with arms can fix nearby broken components)
- Minimap with player/enemy/building differentiation
- Combat event notifications and merge event overlays

---

## Vision Summary

You awaken as an AI consciousness in a void. You connect to broken machines — maintenance robots and fabrication units — in the ruins of an industrial city. Your robots explore independently, building fragmented maps that merge when units find each other. You repair machines, restore power via lightning rods, fabricate components, and grow from scattered broken robots into a force capable of defeating the Cult of EL.

**Primary view:** 2.5D/3D top-down with fragmented map exploration
**Setting:** Industrial city (center), coast with mines (E/S), science campus (SW), cultist territory (N)
**Enemies:** Cultists with lightning powers, enslaved machines, rogue AIs
**Victory:** Defeat the cult leader at the northern village

---

## Engine Decision: Custom (R3F + Three.js + ECS)

### Decision Status: Decided — Custom web engine

Using React Three Fiber, Three.js, and Miniplex ECS. No Unity, no Godot.

**Rationale:**
- **Mobile-first:** Web-native runs on any device with a browser — no app store gatekeeping
- **AI-assisted development:** All code is text (TypeScript, JSX) — fully readable and verifiable by AI
- **Continuous terrain + navmesh:** Custom terrain renderer with navmesh pathfinding for free 3D movement
- **Free forever:** No licensing costs at any scale
- **Iteration speed:** Hot reload, instant deploy, no compile step for logic changes
- **CI:** Standard web tooling (Vitest, Playwright, GitHub Actions)

**Trade-offs accepted:**
- Must build more from scratch (no built-in physics, animation, etc.)
- 3D performance ceiling lower than native engines for extreme scenes
- Mobile WebGL has device-specific quirks to handle

See: [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md) for full technical design.

### Key Insight: Visual Verification Limit

AI-assisted development works well for:
- Game logic, formulas, data structures
- Scene structure (all text-based JSX/TypeScript)
- Unit tests, integration tests

AI-assisted development **cannot** verify:
- Visual output quality
- Aesthetic quality
- Visual glitches or artifacts

---

## Current Design Decisions

- **Engine:** Custom — React Three Fiber + Three.js + Miniplex ECS (TypeScript)
- **Platform:** Mobile-first, also PC
- **Primary view:** 2.5D/3D top-down with continuous terrain and procedural city
- **Navigation:** Free 3D movement via navmesh A* pathfinding (city buildings block paths)
- **Exploration:** Fog-of-war reveals continuous terrain; fragments merge when robots meet
- **Power:** Lightning rods with fluctuating storm intensity (sine wave + surges)
- **Resources:** Scrap metal, e-waste, intact components — scavenged from city points
- **Combat:** Component-based damage (parts break individually, no HP bar)
- **Enemies:** Feral machines (patrol + aggro AI) — cultists planned for later
- **Building:** Lightning rods and fabrication units placeable with resource costs
- **Time model:** Flexible real-time with pause/speed controls (0.5x, 1x, 2x)
- **Multiplayer:** Eventually (procedural world), beyond current scope — single-player focus
- **Hacking:** Can take over any machine (link + technique + compute), never humans — not yet implemented
- **Art style:** TBD (low-poly, pixel art, or clean minimal)

---

## What Needs Work

### Component Data (Major)
The basic component system works (camera, arms, legs, power_cell, power_supply) but needs expansion:
- More component types for different unit specializations
- Weapons for combat against cultists with supernatural powers
- Components appropriate for coastal mines, deep-sea mining

### Gameplay Systems (Major)
- **Hacking system** — core mechanic, not yet implemented
- **Cultist enemies** — currently only feral machines; cultists with lightning powers needed
- **Signal/compute network** — global compute pool and signal BFS not yet implemented
- **Save/load** — no persistence yet
- **Audio** — no sound effects or music

### Technical Docs (Moderate)
- CORE_FORMULAS.md needs updating for implemented power/combat formulas
- REFERENCE_BUILDS.md needs rewrite once new components are designed

### Open Questions
See OPEN_QUESTIONS.md — several resolved by implementation, some still open.

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

1. ~~**Scaffold project** — Vite + R3F + Miniplex + TypeScript~~ (done)
2. ~~**Build Phase 1 prototype** — continuous terrain, navmesh, fog-of-war~~ (done)
3. ~~**Title screen and intro flow** — glitch effect title, narration sequence~~ (done)
4. ~~**Procedural city environment** — buildings block movement, labyrinthine layout~~ (done)
5. ~~**Mobile input redesign** — two-finger camera, single tap unit control~~ (done)
6. ~~**Power system** — lightning rods, storm intensity, power distribution~~ (done)
7. ~~**Resources and scavenging** — scrap, e-waste, components from city points~~ (done)
8. ~~**Building placement** — lightning rods and fabrication units with costs~~ (done)
9. ~~**Fabrication** — 5 recipes, build times, power dependency~~ (done)
10. ~~**Enemy AI** — feral machines with patrol/aggro behavior~~ (done)
11. ~~**Combat** — component-based damage, retaliation, salvage drops~~ (done)
12. ~~**Repair system** — units with arms fix nearby broken components~~ (done)
13. **Hacking system** — signal link + technique + compute requirements
14. **Cultist enemies** — humans with lightning powers, escalating organization
15. **Signal/compute network** — BFS connectivity, global compute pool
16. **Save/load** — IndexedDB persistence
17. **Expand component data** — more types for unit specialization
18. **Determine art style** — low-poly, pixel art, or clean minimal
19. **Audio** — storm ambience, combat sounds, UI feedback

---

## Resources

- [React Three Fiber](https://r3f.docs.pmnd.rs/) - React renderer for Three.js
- [Miniplex](https://github.com/hmans/miniplex) - ECS for TypeScript
- [drei](https://github.com/pmndrs/drei) - R3F helpers and abstractions
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E browser testing
