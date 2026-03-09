# Syntheteria - Development Context

## Project Status

**3D first-person factory planet game** — you ARE a broken robot on the surface of a machine planet. Explore, mine, build conveyor belts and wire networks, fabricate components, expand your factory across the planet.

All core systems implemented: FPS camera/input, factory loop (belts, wires, mining, processing), hacking with signal network, cultist AI, bot automation, save/load, procedural PBR materials, holographic projections, camera damage effects, flashlight, inventory overlay, factory audio.

### Implemented Systems
- **FPS Camera** — pointer lock mouse look, WASD movement, building collision with axis-sliding
- **Bot switching** — Q key transfers consciousness between owned bots, preserves yaw
- **Mobile controls** — nipplejs joystick (left), radial tool menu (bottom center), action buttons (right)
- **Bezel UI** — frames gameplay viewport; top bar shows resources/power/storm, bottom shows equipped tool and hints; handles device notches via CSS safe-area-inset
- **Rapier physics** — WASM physics engine with building colliders, ground plane, kinematic player body
- **Tone.js audio** — storm ambience (brown noise + AutoFilter), lightning strikes, metal impacts, machinery hum, UI beeps
- **Factory audio** — belt hum, mining drill, processing sparks, fabrication completion sounds
- **Tool system** — 6 tools (scanner, repair, welder, fabricator, builder, salvager) with radial selection menu
- **ECS game logic** — Miniplex entities with playerControlled, unit, building, belt, wire, miner, processor, hackable, automation, hologram, signalRelay components
- **Procedural city** — labyrinthine buildings block FPS movement, instanced mesh rendering
- **Procedural terrain** — heightfield with machine planet colors
- **Power system** — lightning rods, storm intensity, power distribution via wire networks
- **Wire network** — BFS power distribution from lightning rods through power wires, signal propagation via signal wires; catenary curve rendering with glow and spark particles on overload
- **Resource scavenging** — scrap metal, e-waste, intact components
- **Mining** — mining drill buildings extract resources from terrain deposits
- **Processing** — smelter, refiner, separator buildings transform raw materials
- **Belt transport** — conveyor belts with auto-linking, item transport, animated rendering with BeltMaterial
- **Fabrication** — 5 recipes, power dependency
- **Combat** — component-based damage from first person (parts break, not HP), FPS raycasting
- **Hacking** — proximity-based, requires compute from signal network, progress bar, converts entities to player faction
- **Signal network** — BFS signal propagation from player bots through relays, global compute pool
- **Feral enemy AI** — patrol and aggro behavior
- **Cultist AI** — cultists with lightning attacks, patrol/chase/flee behavior, escalating groups
- **Bot automation** — 5 routines (idle, patrol, guard, follow, work) with navmesh pathfinding
- **Camera effects** — glitch/static/interference when camera component is damaged
- **Flashlight** — SpotLight attached to camera, toggled with F key, requires power cell
- **Inventory** — Tab key overlay showing components, resources, equipped tool, network status
- **Holographic projections** — custom shader for holographic otter displays with emitter pads
- **PBR materials** — procedural textures for rusted metal, circuit board, conveyor belt, terrain zones (foundry, slag, cable, processor)
- **Save/load** — serialize/deserialize entire ECS world, IndexedDB persistence
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
| Save/Load | IndexedDB (browser), Drizzle ORM + expo-sqlite (planned native) | Cross-platform persistence |
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
├── audio/          # Sound systems
│   ├── SpatialAudio.ts    # Storm, lightning, impacts, UI beeps
│   ├── AudioSystem.tsx    # R3F component: hooks audio to game state
│   └── FactoryAudio.ts   # Belt hum, mining, processing, fabrication sounds
├── ecs/            # Entity-Component-System (engine-agnostic)
│   ├── types.ts           # Entity types, all components
│   ├── world.ts           # Miniplex world, archetype queries
│   ├── factory.ts         # Entity spawning (units, otters, buildings)
│   ├── beltFactory.ts     # Belt placement, removal, auto-linking
│   ├── wireFactory.ts     # Wire placement between entities
│   ├── factoryBuildings.ts # Miner/processor factory functions
│   ├── terrain.ts         # Procedural terrain heightfield
│   ├── cityLayout.ts      # Procedural city buildings
│   ├── gameState.ts       # Simulation tick, game speed, snapshot bridge
│   └── seed.ts            # World seed management
├── input/          # FPS input handling
│   ├── FPSCamera.tsx      # Pointer lock, WASD, touch look, bot switching
│   ├── FPSInput.tsx       # E to interact, click to place, building mode
│   └── FPSMovement.ts     # Jump, gravity, walk bob
├── physics/        # Rapier WASM physics
│   ├── PhysicsWorld.ts    # Init, colliders, rigid bodies, raycasting
│   └── PhysicsSystem.tsx  # R3F component: steps physics, syncs bot
├── rendering/      # Three.js renderers
│   ├── BeltRenderer.tsx   # Conveyor belts with animated items
│   ├── CameraEffects.tsx  # Glitch/static when camera damaged
│   ├── CityRenderer.tsx   # Instanced city buildings
│   ├── FactoryRenderer.tsx # Miners and processors
│   ├── Flashlight.tsx     # SpotLight on camera (F key)
│   ├── HologramRenderer.tsx # Holographic otter projections
│   ├── HolographicShader.ts # Custom holographic ShaderMaterial
│   ├── LandscapeProps.tsx # Terrain decorations
│   ├── OtterRenderer.tsx  # Otter billboard sprites
│   ├── StormSky.tsx       # Dynamic storm sky
│   ├── TerrainRenderer.tsx # Terrain mesh
│   ├── UnitRenderer.tsx   # Bot models
│   ├── WireRenderer.tsx   # Catenary cable rendering + spark FX
│   └── materials/         # Procedural PBR materials
│       ├── MetalMaterial.ts   # Rusted metal with plate seams
│       ├── CircuitMaterial.ts # Circuit board traces
│       ├── BeltMaterial.ts    # Animated conveyor surface
│       └── TerrainMaterial.ts # Zone variants (foundry/slag/cable/processor)
├── save/           # Persistence
│   ├── saveLoad.ts        # Serialize/deserialize ECS, IndexedDB CRUD
│   └── schema.ts          # Drizzle ORM schema (for future native)
├── systems/        # ECS systems
│   ├── beltTransport.ts   # Belt item movement (frame-based)
│   ├── botAutomation.ts   # Bot routines: idle/patrol/guard/follow/work
│   ├── combat.ts          # Component-based damage
│   ├── cultistAI.ts       # Cultist patrol/chase/lightning attacks
│   ├── enemies.ts         # Feral machine AI
│   ├── exploration.ts     # Fog-of-war terrain reveal
│   ├── fabrication.ts     # Build recipes
│   ├── fpsCombat.ts       # FPS raycasting combat
│   ├── fragmentMerge.ts   # Map fragment merging
│   ├── hacking.ts         # Hack entities with compute power
│   ├── mining.ts          # Mining drill extraction
│   ├── movement.ts        # Path-following movement
│   ├── navmesh.ts         # A* pathfinding graph
│   ├── otters.ts          # Otter NPC behavior
│   ├── power.ts           # Lightning rod power + storm
│   ├── processing.ts      # Smelter/refiner/separator recipes
│   ├── repair.ts          # Component repair
│   ├── resources.ts       # Resource scavenging
│   ├── signalNetwork.ts   # BFS signal propagation + compute pool
│   └── wireNetwork.ts     # BFS power/signal distribution via wires
├── ui/             # React UI overlays
│   ├── Bezel.tsx          # Viewport frame with safe-area handling
│   ├── FPSHUD.tsx         # Crosshair, status, combat notifications
│   ├── InventoryView.tsx  # Tab key system inventory overlay
│   ├── MobileControls.tsx # Joystick + tool view + action buttons
│   ├── MobileJoystick.tsx # nipplejs integration
│   ├── RadialToolMenu.tsx # SVG radial tool selector
│   ├── EquippedToolView.tsx # Equipped tool indicator + action buttons
│   └── TitleScreen.tsx    # Glitch title, game start
└── App.tsx         # Main: Bezel → Canvas → 3D scene + systems + HUD
```

---

## Current Design Decisions

- **Engine:** R3F + Three.js + Miniplex ECS (TypeScript)
- **Platform:** PC primary (FPS), mobile secondary (virtual sticks + bezel UI)
- **View:** 3D first-person — you are the bot
- **Navigation:** Direct WASD for player bot; navmesh A* for NPC bots
- **Collision:** Building collision via `isInsideBuilding()` with axis-sliding
- **Power:** Lightning rods → power wires (BFS distribution) → buildings
- **Resources:** Mining drills → conveyor belts → processors → fabrication
- **Combat:** Component-based damage from first person (raycasting)
- **Hacking:** Proximity + compute power from signal relay network
- **Art style:** PBR procedural materials (rusted metal, circuit traces, emissive glow)
- **Sprites:** Holographic projections (billboard behavior is correct for holograms)
- **Story:** Organic discovery — no forced narration
- **Mobile:** Bezel UI frames viewport, nipplejs joystick, radial tool menu, action buttons
- **Save/Load:** IndexedDB in browser, Drizzle ORM + expo-sqlite planned for native

---

## What Needs Work

### Integration & Testing (High Priority)
- Test all new systems together in gameplay
- Add test entity spawns (miners, processors, belts, wires, relays, cultists) to initializeWorld
- Verify FPS combat raycasting works with new entity types
- E2E tests for factory loop (mine → belt → process → fabricate)

### Polish (Medium Priority)
- Expo SDK 55 setup for native mobile deployment
- anime.js UI transitions for inventory, tool switching
- More component types for unit specialization
- Weapon components for cultist combat
- Expanded processing/fabrication recipes

### Art & UX (Medium Priority)
- Apply procedural PBR materials to terrain and buildings
- Improve bot models with detail geometry
- Sound effect tuning and ambient audio layers
- Cultist visual design

### Open Questions
- Final art style direction (low-poly vs clean minimal)
- Multiplayer architecture (eventual)
- Mobile performance optimization thresholds

---

## Testing Strategy

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | ECS systems, formulas, game logic |
| Integration | Vitest + @testing-library/react | React components, state bridge |
| E2E | Playwright | Full gameplay loops in browser |
| CI | GitHub Actions | Automated on every commit |

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
