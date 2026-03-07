# Implementation Options

This document outlines the technology choices and implementation paths for Syntheteria.

## Visual Direction (Resolved)

The game uses a **2.5D/3D top-down view** with a fragmented map exploration system. Key visual elements:

- Top-down perspective with the ability to zoom and pan
- Fragmented map pieces floating in void (disconnected until robots find each other)
- Perpetual storm sky with visible wormhole
- Lightning effects (rods, random strikes, cultist attacks)
- Text/consciousness overlay for AI interactions
- Both detailed maps (camera robots) and abstract wireframe maps (blind robots)

This is not an abstract UI game — it requires actual world rendering with 2.5D/3D environments.

---

## Game Engine Options

### Unity

**Strengths:**
- Mature ecosystem with extensive documentation
- Strong mobile optimization tools and export pipeline
- Better 3D rendering tools and frame debugging
- Well-established patterns for procedural/runtime-generated content
- Larger documentation base for AI-assisted development

**Weaknesses:**
- Heavier engine footprint
- C# is more verbose
- Trust concerns after 2023 Runtime Fee controversy (since walked back)

**Licensing:**
- Personal: Free under $200K annual revenue
- Pro: $2,200/year/seat above that threshold

**Best for:** The 2.5D/3D rendering needs, strong mobile support, and proven tooling.

---

### Godot 4

**Strengths:**
- Completely free and open source (MIT license)
- Lightweight engine, fast iteration
- Scene files (.tscn) are human-readable text — better for AI-assisted development
- No licensing concerns ever
- Simple headless CI (`--headless`)

**Weaknesses:**
- Smaller ecosystem and community
- Less documentation for edge cases
- Mobile export less battle-tested than Unity
- 3D tooling still improving (though adequate for 2.5D top-down)

**Best for:** AI-assisted development, open source values, rapid prototyping. The 2.5D top-down view is well within Godot's 3D capabilities.

---

### Decision Status: Pending

Both engines can handle the 2.5D/3D top-down view with fragmented maps. The visual direction no longer blocks the engine choice — either engine is viable.

**Factors still favoring Godot:** Text-based scenes, free forever, simpler CI, better for agentic development
**Factors still favoring Unity:** More mature 3D tools, better mobile optimization, larger ecosystem

---

## Platform Strategy

### Both Equally (PC + Mobile)

The 2.5D top-down view with touch-friendly controls should work on both:
- **PC:** Mouse/keyboard, detailed interactions, full screen real estate
- **Mobile:** Touch controls, simplified interactions, adapted UI layout

### Design Considerations

- Touch targets must be large enough (minimum 44x44 points)
- Multi-robot selection needs careful UX for touch
- Pause/speed controls work well on both platforms
- Automation reduces micro-management burden on mobile

---

## Development Phases

### Phase 1: Minimum Viable Prototype

Goal: Prove the core loop is fun.

Scope:
- A few robots in a small area
- Basic movement and camera-based mapping
- Fragmented map system (the signature mechanic)
- Simple repair/fabrication
- One enemy type (wandering cultist)

### Phase 2: Core Systems

Goal: Implement the unique systems.

Scope:
- Full map fragment/merge system
- Lightning rod power infrastructure
- Component assembly and repair
- Hacking mechanic
- Multiple robot types
- Energy and Compute resource model

### Phase 3: Content & World

Goal: Flesh out the game.

Scope:
- Full world map (city, coast, mines, science campus, north)
- Cultist progression (wanderers → war parties → assaults)
- Deep-sea mining
- Story integration (memory fragments, observatory, cult leader)
- Science campus content

### Phase 4: Polish & Platform

Goal: Ship the game.

Scope:
- Mobile port and optimization (or simultaneous if built from start)
- Balance tuning
- Full story arc completion
- Performance optimization for large armies/maps

---

## Testing Strategy (Either Engine)

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | GdUnit4 (Godot) / NUnit (Unity) | Component stats, formulas, game logic |
| Integration | GodotTestDriver / Play Mode Tests | Scene interactions, systems |
| E2E | Custom bot scripts | Full gameplay loops |
| CI | gdUnit4-action / GameCI | Automated on every commit |

---

## Open Technical Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Game engine | Unity / Godot | Pending (either viable) |
| Visual style detail | Low-poly / Pixel art / Clean minimal | TBD |
| Save system | JSON / Binary / SQLite | TBD |
| Multiplayer timing | Post-launch (procedural world) | Deferred |

---

## Next Steps

1. **Choose engine** — either is viable; pick and commit
2. **Build Phase 1 prototype** — fragmented map system is the key test
3. **Iterate based on playtesting** — adjust scope based on what's fun
4. **Determine visual style detail** — low-poly, pixel art, or clean minimal
