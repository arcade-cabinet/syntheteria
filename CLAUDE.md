# Syntheteria - Development Context

## Project Status

Pre-implementation strategy game about awakening AI consciousness in a post-apocalyptic industrial city. Design documents aligned to vision, engine selection pending, component data needs redesign.

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
- **Fragmented map system:** Custom chunk-based renderer maps directly to the game's core mechanic
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
- **Primary view:** 2.5D/3D top-down with fragmented map exploration
- **Exploration:** Disconnected map fragments merge when robots find each other
- **Power:** Lightning rods drawing from perpetual storm
- **Time model:** Flexible real-time with pause/speed controls (RTS-style)
- **Multiplayer:** Eventually (procedural world), beyond current scope — single-player focus
- **Enemies:** Cultists (lightning powers), enslaved machines, rogue AIs
- **Hacking:** Can take over any machine (link + technique + compute), never humans
- **Art style:** TBD (low-poly, pixel art, or clean minimal)

---

## What Needs Work

### Component Data (Major)
The old component JSON data (101 components across 9 categories) has been deleted. New component data needs to be designed for the setting:
- Lightning rod connections and storm energy capacitors as power sources
- Components appropriate for the industrial city, coastal mines, deep-sea mining
- Weapons balanced against cultists with supernatural powers

### Technical Docs (Moderate)
- CORE_FORMULAS.md needs updating for new time model and power system
- REFERENCE_BUILDS.md needs rewrite once new components are designed

### Open Questions (11 new)
See OPEN_QUESTIONS.md — the redesign created 11 new questions about specifics.

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

1. **Scaffold project** — Vite + R3F + Miniplex + TypeScript
2. **Build Phase 1 prototype** — chunk grid, fragment system, void rendering (mobile-first)
3. **Redesign component data** for the new setting
4. **Determine art style** — low-poly, pixel art, or clean minimal
5. **Build vertical slice** — one gameplay loop end-to-end

---

## Resources

- [React Three Fiber](https://r3f.docs.pmnd.rs/) - React renderer for Three.js
- [Miniplex](https://github.com/hmans/miniplex) - ECS for TypeScript
- [drei](https://github.com/pmndrs/drei) - R3F helpers and abstractions
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E browser testing
