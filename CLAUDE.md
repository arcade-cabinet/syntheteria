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

## Engine Decision: Unity vs Godot

### Decision Status: Pending (either viable)

The 2.5D/3D top-down view with fragmented maps works in both engines.

| Factor | Godot | Unity |
|--------|-------|-------|
| **Agentic development** | Better - text-based scenes AI can read/verify | Worse - binary scene files |
| **Graphics debugging** | Limited | Excellent (Frame Debugger, PIX, RenderDoc) |
| **Mobile** | Adequate, less battle-tested | Industry standard |
| **3D tooling** | Adequate for 2.5D top-down | Mature |
| **Cost** | Free forever | Free under $200K, then $2,200/seat/year |
| **CI** | Simple (`--headless`) | Needs license management |

### Key Insight: Visual Verification Limit

AI-assisted development works well for:
- Game logic, formulas, data structures
- Scene structure (in Godot - text-based)
- Unit tests, integration tests

AI-assisted development **cannot** verify:
- Visual output quality
- Aesthetic quality
- Visual glitches or artifacts

---

## Current Design Decisions

- **Platform:** PC and mobile equally
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

## Testing Strategy (Either Engine)

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | GdUnit4 (Godot) / NUnit (Unity) | Component stats, formulas, game logic |
| Integration | GodotTestDriver / Play Mode Tests | Scene interactions, systems |
| E2E | Custom bot scripts | Full gameplay loops |
| CI | gdUnit4-action / GameCI | Automated on every commit |

---

## Next Steps

1. **Choose engine** — either is viable; pick and commit
2. **Build Phase 1 prototype** — fragmented map system is the key test
3. **Redesign component data** for the new setting
4. **Determine art style** — low-poly, pixel art, or clean minimal
5. **Build vertical slice** — one gameplay loop end-to-end

---

## Resources

- [GdUnit4](https://github.com/MikeSchulze/gdUnit4) - Godot testing
- [GodotTestDriver](https://github.com/chickensoft-games/GodotTestDriver) - Godot integration testing
- [Unity Frame Debugger](https://docs.unity3d.com/6000.2/Documentation/Manual/FrameDebugger.html)
- [Unity Test Framework](https://docs.unity3d.com/Packages/com.unity.test-framework@2.0/manual/index.html)
