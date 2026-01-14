# Syntheteria - Development Context

## Project Status

Pre-implementation strategy game about awakening AI consciousness on post-apocalyptic Earth. Design documents complete, engine selection pending.

---

## Engine Decision: Unity vs Godot

### The Core Tradeoff

| Factor | Godot | Unity |
|--------|-------|-------|
| **Agentic development** | Better - text-based scenes AI can read/verify | Worse - binary scene files |
| **Graphics debugging (human)** | Limited | Excellent (Frame Debugger, PIX, RenderDoc) |
| **Mobile** | Adequate, less battle-tested | Industry standard, 70% market share |
| **Testing ecosystem** | Good (GdUnit4, GUT, GodotTestDriver) | More mature (NUnit-based) |
| **Headless CI** | Simple (`--headless`) | Works but needs license management |
| **Cost** | Free forever | Free under $200K, then $2,200/seat/year |
| **3D tooling** | Improving | Mature |

### Key Insight: Visual Verification Limit

AI-assisted development works well for:
- Game logic, formulas, data structures
- Scene structure (in Godot - text-based)
- Unit tests, integration tests
- Code that can be verified by running

AI-assisted development **cannot** verify:
- Procedural graphics output ("does this look like a brick?")
- Aesthetic quality
- Visual glitches or artifacts

This is engine-agnostic. Procedural graphics require human eyes.

### Switching Engines Mid-Project

**Not recommended.** Code requires full rewrite (different languages, architectures). Assets partially transfer. Do it between milestones if you must, test with a vertical slice first.

---

## Blocking Decision: Visual Style

Engine choice depends on answering these questions:

### 1. How abstract is "abstract"?

The UI concept describes a "mind space" / network visualization. But what does that mean technically?

- **Option A:** Mostly 2D UI - nodes, lines, data feeds, terminal-style interfaces (like Hacknet, Uplink)
- **Option B:** 3D network visualization floating in space
- **Option C:** Abstract overlay on top of a rendered 3D world

### 2. What do drone camera feeds show?

When the player focuses on a drone and looks through its camera:

- **Option A:** Stylized/simplified representation (low-poly, wireframe, data visualization)
- **Option B:** Full 3D rendered environment
- **Option C:** 2D representation with depth cues

### 3. How much of the world needs to be "rendered"?

- Is combat shown as abstract data (health bars, network diagrams)?
- Or as visual action in a 3D space?
- Do facilities/territories need 3D representation, or are they nodes on a map?

### 4. Combat visualization

Listed as open question in UI_CONCEPT.md. Abstract data representation or visual action?

---

## Recommendation Framework

**If the game is primarily UI/data visualization:**
- Network nodes as shapes
- Drone feeds are stylized/simple
- Combat is abstract
- **Godot is the better choice** - text-based scenes, simpler for agentic dev, free

**If the game needs significant 3D rendering:**
- Full 3D environments in drone feeds
- Visual combat sequences
- Rendered facilities/territories
- **Unity is the better choice** - superior debugging, mobile optimization, mature 3D

---

## Current Design Decisions (from docs)

- **Platform:** Mobile-first, PC fallback
- **Primary view:** Abstract digital consciousness / network visualization
- **Art direction:** "Stylized/Abstract or Clean/Minimal" (partial - needs refinement)
- **Inspirations:** Hacknet, Duskers, Uplink, SOMA, Observer
- **Time model:** Accelerated real-time (1 sec = 1 game minute)
- **Multiplayer:** Supported (multiple freed AIs)

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

1. **Decide visual style** - answer the questions above
2. **Create a visual prototype** - even rough mockups/sketches help clarify intent
3. **Choose engine** based on visual requirements
4. **Build vertical slice** - one gameplay loop end-to-end

---

## Resources

- [GdUnit4](https://github.com/MikeSchulze/gdUnit4) - Godot testing
- [GodotTestDriver](https://github.com/chickensoft-games/GodotTestDriver) - Godot integration testing
- [Unity Frame Debugger](https://docs.unity3d.com/6000.2/Documentation/Manual/FrameDebugger.html)
- [Unity Test Framework](https://docs.unity3d.com/Packages/com.unity.test-framework@2.0/manual/index.html)
