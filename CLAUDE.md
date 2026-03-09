# Syntheteria - Development Context

## Project Status

**3D first-person factory planet game** — you ARE a broken robot on the surface of a machine planet. Explore, mine, build conveyor belts and wire networks, fabricate components, expand your factory across the planet.

Phase 1 FPS foundation is implemented: first-person camera, direct bot control, building collision, bot switching (consciousness transfer), bezel UI frame, mobile controls (nipplejs joystick, radial tool menu, action buttons), Rapier physics integration, Tone.js spatial audio.

### Implemented Systems
- **FPS Camera** — pointer lock mouse look, WASD movement, building collision with axis-sliding
- **Bot switching** — Q key transfers consciousness between owned bots, preserves yaw
- **Mobile controls** — nipplejs joystick (left), radial tool menu (bottom center), action buttons (right)
- **Bezel UI** — frames gameplay viewport; top bar shows resources/power/storm, bottom shows equipped tool and hints; handles device notches via CSS safe-area-inset
- **Rapier physics** — WASM physics engine with building colliders, ground plane, kinematic player body
- **Tone.js audio** — storm ambience (brown noise + AutoFilter), lightning strikes, metal impacts, machinery hum, UI beeps
- **Tool system** — 6 tools (scanner, repair, welder, fabricator, builder, salvager) with radial selection menu
- **ECS game logic** — Miniplex entities with playerControlled component, unit components, power, resources, fabrication, combat
- **Procedural city** — labyrinthine buildings block FPS movement, instanced mesh rendering
- **Procedural terrain** — heightfield with machine planet colors
- **Power system** — lightning rods, storm intensity, power distribution
- **Resource scavenging** — scrap metal, e-waste, intact components
- **Fabrication** — 5 recipes, power dependency
- **Combat** — component-based damage (parts break, not HP)
- **Feral enemy AI** — patrol and aggro behavior
- **Title screen** — glitch effect, direct to FPS gameplay (no narration walls)

---

## Vision Summary

You awaken as a broken robot on the surface of a machine planet. First person. You see through a damaged camera sensor — glitchy, scan-lined. Your arms don't work. Nearby, another bot has arms but no camera. Together, you're functional. From there: explore the machine planet, mine raw resources, build conveyor belts and processing chains, fabricate increasingly complex components, construct more bots, and expand your factory network across the planet's surface.

**Primary view:** 3D first-person (you ARE the bot)
**Setting:** Machine planet — corroded metal terrain, slag heaps, cable forests, processor graveyards
**Core loop:** Explore → Mine → Transport (belts) → Process → Fabricate → Build → Expand
**Story:** Organic discovery — holographic logs, otter encounters, no forced narration
**Enemies:** Feral machines, cultists with lightning powers, rogue AIs
**Victory:** Defeat the Cult of EL, launch through the wormhole

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| 3D Engine | React Three Fiber + Three.js | Rendering, camera, materials |
| ECS | Miniplex | Game logic, entities, queries |
| Physics | Rapier (`@dimforge/rapier3d-compat`) | Collisions, rigid bodies, raycasting |
| Audio | Tone.js | Spatial audio, procedural sound effects |
| Animation | anime.js | UI animations, transitions |
| Mobile Input | nipplejs | Virtual joystick for mobile FPS |
| Save/Load | Drizzle ORM + expo-sqlite (planned) | Cross-platform persistence |
| Build | Vite + TypeScript | Hot reload, fast builds |
| Lint | Biome | Code quality |
| Test | Vitest + Playwright | Unit + E2E |

### Why R3F (not Babylon/native engine)
- Web-native: runs in any browser, no app store gatekeeping
- AI-assisted dev: all code is text TypeScript/JSX — fully readable
- Hot reload, instant deploy
- Expo-compatible for React Native if needed later
- Free forever

---

## Architecture

```
game/src/
├── audio/          # Tone.js spatial audio system
│   ├── SpatialAudio.ts    # Sound effects: storm, lightning, impacts, UI
│   └── AudioSystem.tsx    # R3F component that hooks audio to game state
├── ecs/            # Entity-Component-System (engine-agnostic)
│   ├── types.ts           # Entity types, components (playerControlled, unit, building, etc.)
│   ├── world.ts           # Miniplex world, archetype queries, getActivePlayerBot()
│   ├── factory.ts         # Entity spawning (spawnUnit, spawnOtter, etc.)
│   ├── terrain.ts         # Procedural terrain heightfield
│   ├── cityLayout.ts      # Procedural city buildings
│   └── gameState.ts       # Game speed, resources, power, combat events
├── input/          # FPS input handling
│   ├── FPSCamera.tsx      # Pointer lock, WASD, touch look, bot switching
│   └── FPSInput.tsx       # E to interact, click to place, building mode
├── physics/        # Rapier WASM physics
│   ├── PhysicsWorld.ts    # Init, colliders, rigid bodies, raycasting
│   └── PhysicsSystem.tsx  # R3F component: steps physics, syncs bot position
├── rendering/      # Three.js renderers (terrain, city, units, sky, otters)
├── systems/        # ECS systems (movement, navmesh, resources, combat, etc.)
├── ui/             # React UI overlays
│   ├── Bezel.tsx          # Viewport frame with safe-area handling
│   ├── FPSHUD.tsx         # Crosshair, bot status, resources, combat notifications
│   ├── MobileControls.tsx # Joystick + tool view + action buttons container
│   ├── MobileJoystick.tsx # nipplejs integration
│   ├── RadialToolMenu.tsx # SVG radial tool selector
│   ├── EquippedToolView.tsx # Bottom-center equipped tool + action buttons
│   └── TitleScreen.tsx    # Glitch title, game start
└── App.tsx         # Main: Bezel → Canvas → 3D scene + HUD + mobile controls
```

---

## Current Design Decisions

- **Engine:** R3F + Three.js + Miniplex ECS (TypeScript)
- **Platform:** PC primary (FPS), mobile secondary (virtual sticks + bezel UI)
- **View:** 3D first-person — you are the bot
- **Navigation:** Direct WASD for player bot; navmesh A* for NPC bots
- **Collision:** Building collision via `isInsideBuilding()` with axis-sliding
- **Power:** Lightning rods + wire networks (planned)
- **Resources:** Mining drills → conveyor belts → processors → fabrication (planned)
- **Combat:** Component-based damage from first person
- **Art style:** PBR procedural materials (planned: rusted metal, circuit traces, emissive glow)
- **Sprites:** Holographic projections (billboard behavior is correct for holograms)
- **Story:** Organic discovery — no forced narration
- **Mobile:** Bezel UI frames viewport, nipplejs joystick, radial tool menu, action buttons

---

## What Needs Work

### Factory Systems (Major — Next Priority)
- Conveyor belt ECS components, placement, rendering, transport logic
- Wire ECS components, placement, catenary rendering, power flow
- Mining drill buildings (extract → belt output)
- Processor buildings (smelter, refiner — belt in/out)
- Expanded fabrication (belt-fed input, belt output)

### PBR Ground-Level Rendering (Major)
- Procedural PBR materials (rusted steel, circuit board, rubber belt)
- Rebuild renderers for eye-level detail
- Holographic projection shader for otter sprites and data displays

### Gameplay Systems (Major)
- **Hacking system** — core mechanic, not yet implemented
- **Cultist enemies** — humans with lightning powers
- **Signal/compute network** — global compute pool, BFS connectivity
- **Save/load** — Drizzle ORM + expo-sqlite persistence

### Polish
- Expo SDK 55 setup for native mobile deployment
- More procedural sound effects (belt movement, mining, fabrication)
- anime.js UI transitions
- Device detection for mobile vs desktop control schemes

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

### Phase 2: Factory Systems
1. **Conveyor belts** — placement, rendering, item transport
2. **Power wires** — catenary cables, visible power flow
3. **Mining drills** — resource extraction to belt output
4. **Processors** — belt-in, transform, belt-out
5. **Expanded fabrication** — more recipes, belt integration

### Phase 3: PBR + Ground-Level Detail
6. **PBR materials** — procedural textures for metal, circuit, belt surfaces
7. **Eye-level buildings** — rebuild CityRenderer for walkable scale
8. **Eye-level bots** — rebuild UnitRenderer with detail
9. **Holographic projections** — otter sprites as holograms with shader effects

### Phase 4: Gameplay Expansion
10. **Hacking system** — signal link + technique + compute
11. **Cultist enemies** — lightning-wielding humans
12. **Signal/compute network** — BFS connectivity
13. **Save/load** — Drizzle ORM + expo-sqlite
14. **Expo native deployment** — React Native + Expo SDK 55

---

## Resources

- [React Three Fiber](https://r3f.docs.pmnd.rs/) - React renderer for Three.js
- [Miniplex](https://github.com/hmans/miniplex) - ECS for TypeScript
- [drei](https://github.com/pmndrs/drei) - R3F helpers and abstractions
- [Rapier](https://rapier.rs/) - Physics engine (WASM)
- [Tone.js](https://tonejs.github.io/) - Web audio synthesis
- [nipplejs](https://yoannmoi.net/nipplejs/) - Virtual joystick
- [anime.js](https://animejs.com/) - Animation library
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E browser testing
