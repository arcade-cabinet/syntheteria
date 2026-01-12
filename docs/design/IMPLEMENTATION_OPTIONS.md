# Implementation Options

This document outlines the technology choices and implementation paths for Syntheteria.

## Game Engine Options

### Unity

**Strengths:**
- Mature ecosystem with extensive documentation and community resources
- UI Toolkit provides code-friendly UI development (UXML + USS, similar to HTML/CSS)
- Strong mobile optimization tools and export pipeline
- Well-established patterns for procedural/runtime-generated content
- Better suited for AI-assisted development due to larger documentation base

**Weaknesses:**
- Heavier engine footprint
- C# is more verbose than alternatives
- Trust concerns after 2023 Runtime Fee controversy (since walked back)

**Licensing:**
- Personal: Free under $200K annual revenue
- Pro: $2,200/year/seat above that threshold
- No runtime fees for games under $1M revenue

**Best for:** Teams wanting proven tooling, strong mobile support, and code-first UI workflows.

---

### Godot 4

**Strengths:**
- Completely free and open source (MIT license)
- Lightweight engine, fast iteration
- GDScript is concise and quick to write
- Scene files (.tscn) are human-readable text
- No licensing concerns ever
- Excellent 2D and UI capabilities

**Weaknesses:**
- Smaller ecosystem and community
- Less documentation for edge cases
- Mobile export is capable but less battle-tested than Unity
- Visual editor-centric workflow—harder to work "blind" via code alone

**Licensing:**
- MIT License: Free forever, no restrictions, no revenue caps

**Best for:** Solo developers or small teams prioritizing speed, simplicity, and open source values.

---

### Web-Based (TypeScript + Pixi.js/Phaser)

**Strengths:**
- Cross-platform by default (runs in any browser)
- Easy distribution (no app store approval needed)
- Fast prototyping and iteration
- Good for validating core gameplay before committing to native

**Weaknesses:**
- Performance ceiling on complex simulations
- Mobile browser limitations (battery, performance, input)
- Would require porting to native for full release

**Licensing:**
- All open source libraries

**Best for:** Rapid prototyping, web demos, or testing if the core loop is fun before full commitment.

---

### Custom Engine (Rust/C++ + SDL/Raylib)

**Strengths:**
- Maximum control over performance
- Minimal dependencies
- Educational value

**Weaknesses:**
- Dramatically slower development
- Reinventing solved problems (UI, input, audio, serialization)
- No visual editor

**Best for:** Not recommended for this project.

---

## Recommendation

**Primary recommendation: Unity with UI Toolkit**

Rationale specific to Syntheteria:
1. **UI is the game** — The "mind-space" network visualization is central to the experience. Unity's UI Toolkit (UXML/USS) allows building complex UI programmatically with familiar web-like patterns.
2. **Procedural content** — Drones, networks, and territory all generate at runtime. Unity has mature patterns for this.
3. **Mobile target** — Unity's mobile pipeline is more proven.
4. **AI-assisted development** — Larger documentation base means better support when working with AI coding assistants.

**Alternative: Godot 4**

If licensing philosophy matters or the team prefers GDScript's simplicity. Fully capable engine for this project's scope.

---

## Platform Strategy

### Recommended Approach: PC First, Mobile Second

1. **Prototype on PC** — Validate gameplay with keyboard/mouse
2. **Design for mobile** — Keep UI touch-friendly from the start
3. **Port to mobile** — Once core loop is proven

### Rationale

- Complex strategy games (70+ components, multi-drone management) are historically difficult on mobile
- PC allows faster iteration during development
- Mobile can be a simplification target rather than a constraint

### Mobile Considerations

If targeting mobile from day one:
- Touch targets must be large enough (minimum 44x44 points)
- Multi-drone selection needs careful UX design
- Consider automation as the solution to micro-management on small screens
- Battery and thermal constraints limit simulation complexity

---

## Development Phases

### Phase 1: Minimum Viable Prototype (1-2 weeks)

Goal: Prove the core loop is fun.

Scope:
- Single drone with basic movement
- Camera feed UI (one feed)
- 5-10 components (not 70)
- One resource type
- One enemy type
- Basic territory concept

### Phase 2: Core Systems (4-6 weeks)

Goal: Implement the unique systems.

Scope:
- Network/mind-space visualization
- Multi-drone management with multiple feeds
- Component assembly system (expand to 20-30 components)
- Energy and Compute resource model
- Basic automation framework

### Phase 3: Content & Polish (ongoing)

Goal: Flesh out the game.

Scope:
- Full component library
- Material supply chain
- Three enemy tiers
- Campaign structure (intro, expansion, finale)
- Story integration (memory fragments)

### Phase 4: Platform Expansion

Goal: Reach target platforms.

Scope:
- Mobile port and optimization
- Touch control refinement
- Multiplayer infrastructure (if pursuing)

---

## Multiplayer Considerations

**Recommendation: Defer multiplayer until single-player is solid.**

Multiplayer adds complexity in:
- Network synchronization
- Server infrastructure
- Balancing for PvP
- Victory condition design
- Development and testing time (roughly 2-3x single-player)

The design supports multiplayer, but it's not required for a compelling single-player experience. Ship single-player first, add multiplayer as expansion content.

---

## Open Technical Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Game engine | Unity / Godot | Pending |
| Primary platform | PC / Mobile | Leaning PC-first |
| UI framework | Engine-native / Custom | Depends on engine |
| Save system | JSON / Binary / SQLite | TBD |
| Multiplayer timing | Launch / Post-launch / Never | Leaning post-launch |

---

## Next Steps

1. **Make engine decision** — Unity or Godot, then commit
2. **Set up project structure** — Version control, folder organization, coding standards
3. **Build Phase 1 prototype** — Prove the core loop works
4. **Iterate based on playtesting** — Adjust scope based on what's fun
