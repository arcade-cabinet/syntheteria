# Implementation Options

> **Note (2026-03-25):** This document is historical. The final engine choice is BabylonJS 8 + Reactylon 3 + Webpack 5. See [CLAUDE.md](../../CLAUDE.md) for current architecture.

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

### Custom Web Engine (React Three Fiber + Three.js + Miniplex ECS)

**Strengths:**
- Mobile-first web delivery — runs in any browser, no app store
- All code is text (TypeScript/JSX) — fully AI-readable and verifiable
- Custom chunk renderer maps directly to the fragmented map mechanic
- Free forever, no licensing at any scale
- Vite hot reload for instant iteration
- Standard web CI tooling (Vitest, Playwright, GitHub Actions)

**Weaknesses:**
- Must build more systems from scratch (no built-in physics, animation editor)
- 3D performance ceiling lower than native engines for extreme scenes
- Mobile WebGL has device-specific quirks

See: [ARCHITECTURE.md](../technical/ARCHITECTURE.md) for full technical design.

---

### Decision Status: Decided — Custom Web Engine

The custom R3F/Three.js/ECS stack was chosen over Unity and Godot for mobile-first delivery, full AI-assisted development compatibility, and direct alignment with the fragmented map system.

---

## Platform Strategy

### Mobile-First, Also PC

The game is a web app. Touch is the primary input. Desktop mouse/keyboard is an enhancement.

- **Mobile:** Touch controls are the default. UI sized for fingers. 30fps target on mid-range phones.
- **PC:** Mouse/keyboard adds precision (box select, hotkeys). 60fps target.

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

## Testing Strategy

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | ECS systems, formulas, game logic |
| Integration | Vitest + @testing-library/react | React components, state bridge |
| E2E | Playwright | Full gameplay loops in browser |
| CI | GitHub Actions | Automated on every commit |

---

## Open Technical Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Game engine | Custom (R3F + Three.js + Miniplex ECS) | **Decided** |
| Visual style detail | Low-poly / Pixel art / Clean minimal | TBD |
| Save system | IndexedDB (primary) + localStorage (fallback) | Decided |
| Multiplayer timing | Post-launch (procedural world) | Deferred |

---

## Next Steps

1. **Scaffold project** — Vite + R3F + Miniplex + TypeScript
2. **Build Phase 1 prototype** — fragmented map system is the key test
3. **Iterate based on playtesting** — adjust scope based on what's fun
4. **Determine visual style detail** — low-poly, pixel art, or clean minimal
