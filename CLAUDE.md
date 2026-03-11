# Syntheteria - Development Context

## Project Status

**First-person 4X on a machine planet.** You are a broken robot. You grind ore veins into powder, compress it into physical cubes, carry cubes to your furnace, and craft tools, bots, and buildings. Expand your territory, defend your cube stockpiles, and compete against AI civilizations governed by Yuka GOAP for control of the planet.

### Current State: Architecture Migration

The prototype has working FPS camera, factory systems (belts, wires, mining, processing), combat, hacking, and procedural terrain. We are migrating to:

- **Koota ECS** (from Miniplex) — trait-based SoA storage, relations, reactive queries, change detection
- **Expo SDK 55 + Metro** (from Vite) — native iOS/Android builds, static JSON config imports
- **Yuka AI** — GOAP governors for AI civilizations, Vehicle steering for bot movement, NavMesh pathfinding
- **JSON config/tunables** — all game balance externalized to editable JSON files
- **Contextual interaction** — every object is clickable with radial action menu (replaces tool system)
- **Physical cube economy** — resources are physical rigid body cubes, not abstract counters

### Design Documents

All architecture and design decisions are documented in `docs/design/`:

| GDD | Topic |
|-----|-------|
| 002 | Koota ECS + Expo/Metro + JSON config migration |
| 003 | 4X framework, contextual interaction, Yuka governors, race selection |
| 004 | Core game loop — harvesting, cubes, compression, furnace |
| 005 | Visual identity — procedural mechanical generation, Yuka vehicles, PBR art direction |

**These GDDs are the source of truth for all design decisions.**

---

## Vision

### The Game in One Paragraph

You awaken as a broken robot on a machine planet. Your only tool is a Harvester — a grinding arm. Walk up to a scrap ore vein jutting from rusted terrain, hold the button, watch particles spiral into your body. When full, compress: screen shakes, pressure gauges spike, and a physical cube of scrap metal ejects at your feet. Grab it. Carry it to your furnace — the one machine you start with. Drop the cube in the hopper. Tap the furnace. Craft a Grabber arm, a better drill, a conveyor belt. Automate. Expand. Build walls before the other civilizations raid your cube pile. This is a first-person 4X where your wealth is the physical stack of cubes sitting outside your base, visible to everyone.

### The 4X Pillars

| Pillar | Mechanic |
|--------|----------|
| **eXplore** | Fog of war, terrain scanning, discovering resource deposits and ruins |
| **eXpand** | Claim territory with outposts, extend power/signal networks |
| **eXploit** | Grind → Compress → Carry → Process → Fabricate → Build |
| **eXterminate** | FPS combat, bot armies, hacking enemy infrastructure, cube raiding |

### Core Loop

```
Grind ore deposit → Powder fills capacity gauge
    → Compress (screen shake, pressure/heat HUD)
    → Physical cube ejects
    → Grab cube → Carry to furnace hopper
    → Tap furnace → Radial menu → Select recipe
    → Furnace processes → Item slides out
    → Install on bot / Place in world / Feed to next machine
```

### Material States

1. **Raw Deposits** — organic geological formations protruding from terrain (NOT cubes)
2. **Powder** — internal to bot, shown on HUD capacity bar
3. **Cubes** — physical 0.5m rigid bodies, grab/stack/carry/drop, raid-able by enemies

### Civilizations

| Race | Style | Governor Bias |
|------|-------|--------------|
| Reclaimers | Scavenger economy, rusted iron aesthetic | +Economy, +Mining |
| Volt Collective | Lightning aggressors, chrome + heat-blue | +Military, +Expand |
| Signal Choir | Hive-mind hackers, anodized aluminum | +Research, +Hacking |
| Iron Creed | Fortress builders, brushed steel | +Defense, +Walls |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| 3D Engine | React Three Fiber + Three.js | Rendering, camera, materials |
| ECS | **Koota** (migrating from Miniplex) | Trait-based entities, reactive queries, relations |
| Physics | Rapier (`@react-three/rapier`) | Collisions, rigid bodies, raycasting for interaction |
| AI | **Yuka** | GOAP governors, Vehicle steering, NavMesh, perception |
| Audio | Tone.js | Spatial audio, procedural sound effects |
| Animation | anime.js | UI animations, transitions |
| Mobile Input | nipplejs | Virtual joystick for mobile FPS |
| Persistence | expo-sqlite + Drizzle ORM (native), IndexedDB (web) | Cross-platform save/load |
| Bundler | **Expo SDK 55 + Metro** (migrating from Vite) | Native builds, static JSON imports |
| Lint | Biome | Code quality |
| Test | Vitest + Playwright | Unit + E2E |

---

## Architecture

```
syntheteria/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root: WorldProvider, fonts, persistence
│   ├── +html.tsx               # Web: SharedArrayBuffer headers
│   ├── index.tsx               # Title screen
│   └── game/
│       └── index.tsx           # Game: Canvas + HUD + controls
├── config/                     # JSON tunables (ALL game balance here)
│   ├── index.ts                # Type-safe JSON imports (typeof inference)
│   ├── units.json              # Bot types, speeds, components
│   ├── buildings.json          # Building types, power requirements
│   ├── processing.json         # Smelter/refiner/separator recipes + belt config
│   ├── mining.json             # Extraction rates per ore type
│   ├── cubeMaterials.json      # Cube material game balance (name, value, color)
│   ├── civilizations.json      # Race definitions + governor profiles
│   ├── technology.json         # Tech tree tiers and unlocks
│   ├── terrain.json            # Heightfield, zone colors, deposits
│   ├── power.json              # Lightning rods, wire limits, storm
│   ├── combat.json             # Damage, ranges, cooldowns
│   ├── hacking.json            # Compute costs, hack speeds
│   ├── quests.json             # Otter hologram quest progression
│   ├── mapPresets.json         # Map generation presets
│   ├── audio.json              # Volume levels, ambient layers
│   └── rendering.json          # Material params, LOD, particles
├── src/                        # Game logic (all source code)
│   ├── ai/                     # Yuka GOAP AI
│   │   └── goap/               # CivilizationGovernor, evaluators
│   ├── audio/                  # Tone.js spatial audio
│   ├── ecs/                    # Miniplex ECS (migrating to Koota)
│   │   ├── world.ts            # ECS world instance
│   │   ├── types.ts            # Entity type definitions
│   │   ├── gameState.ts        # Global game state (speed, tick)
│   │   └── seed.ts             # Seeded RNG
│   ├── input/                  # FPS camera, object selection, mobile
│   │   ├── FPSInput.tsx        # Keyboard/mouse + touch controls
│   │   └── ObjectSelectionSystem.tsx  # Rapier raycast → radial menu
│   ├── physics/                # Rapier WASM setup
│   ├── rendering/              # Three.js rendering
│   │   ├── materials/          # PBR material system
│   │   │   ├── MaterialFactory.ts      # Composable PBR from texture sets
│   │   │   ├── CubeMaterialProvider.tsx # Per-cube PBR materials
│   │   │   └── cubePBRMaterials.json   # PBR texture configs (separate from game balance)
│   │   ├── procgen/            # Procedural geometry generators
│   │   └── shaders/            # Custom GLSL shaders
│   ├── save/                   # IndexedDB persistence (web)
│   ├── systems/                # ECS systems (game logic)
│   │   ├── beltTransport.ts    # Physical cube belt movement
│   │   ├── beltRouting.ts      # Belt-to-belt/machine connections
│   │   ├── processing.ts       # Smelter/refiner recipes
│   │   ├── mining.ts           # Ore extraction
│   │   ├── power.ts            # Lightning rod power network
│   │   ├── hacking.ts          # Compute-based hacking
│   │   ├── combat.ts           # FPS combat
│   │   ├── grabber.ts          # Cube grab/carry/drop
│   │   ├── resources.ts        # Resource pool tracking
│   │   └── __tests__/          # Jest unit tests (7,594 tests)
│   └── ui/                     # React HUD components
│       ├── FPSHUD.tsx          # Main game HUD overlay
│       ├── Bezel.tsx           # Retro CRT bezel frame
│       └── ObjectActionMenu.tsx # Context-sensitive radial menu
├── public/                     # Static assets served by Vite
│   └── textures/materials/     # PBR texture maps (Git LFS)
├── assets/                     # GLB models (Git LFS)
├── docs/design/                # GDD design documents (002-005)
├── tests/                      # E2E Playwright tests
├── .gitattributes              # Git LFS tracking (*.glb, *.exr, *.jpg, *.png)
├── .github/workflows/          # CI (ci.yml) + Deploy (deploy.yml)
├── package.json                # "syntheteria" — deps, scripts
├── vite.config.ts              # Vite bundler config
├── tsconfig.json               # TypeScript config
├── biome.json                  # Biome linter config
├── app.json                    # Expo config
├── metro.config.js             # Metro config (for future native builds)
└── babel.config.js             # Babel config (expo preset)
```

---

## Design Decisions

- **Engine:** R3F + Three.js + Koota ECS + Yuka AI (TypeScript)
- **Platform:** Expo SDK 55 — web, iOS, Android from one codebase
- **View:** 3D first-person — you ARE the bot
- **Interaction:** Contextual — click any object → emissive highlight → radial action menu
- **No tool system:** Actions depend on what you click, not what you "equip"
- **Economy:** Physical cubes — your wealth is visible, steal-able, raid-able
- **AI:** Yuka GOAP governors evaluate strategic goals; Yuka Vehicles steer bots
- **Movement:** Yuka Vehicle with velocity/acceleration/steering behaviors (not teleporting)
- **Pathfinding:** Yuka NavMesh (replaces grid A*)
- **Art style:** Industrial mechanical PBR — panels, bolts, chrome, rust, NOT flat colored cubes
- **Procedural geometry:** Panel-based construction for bots/buildings, organic noise for deposits
- **Factions:** 4 races with distinct visual identity (materials, locomotion, head styles)
- **Config:** Every tunable in JSON — balance changes never require code changes
- **Story:** Otter holograms as quest guides — organic discovery, no forced narration
- **Save/Load:** expo-sqlite on native, IndexedDB on web, Koota serialization

---

## What Needs Work

**See `docs/REMAINING-WORK.md` for the single source of truth — 80 items across 12 workstreams.**

Critical path summary:
1. **Rendering pipeline** — Wire procgen generators (PanelGeometry, BotGenerator, InstancedCubeRenderer) into live R3F scene
2. **AI economy** — AI must produce real physical cube entities, not abstract counters
3. **AI combat** — Remove faction filter, enable multi-faction warfare, connect raid system
4. **Faction differentiation** — Unique units, buildings, visual identity per race
5. **Victory & pacing** — Evaluate victory conditions, storm escalation, wealth-based raid scaling

---

## Testing Strategy

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Jest + ts-jest | ECS systems, formulas, game logic |
| Integration | Jest + @testing-library/react | React components, state bridge |
| E2E | Playwright | Full gameplay loops in browser |
| CI | GitHub Actions | Automated on every commit |

---

## Resources

- [Koota](https://github.com/pmndrs/koota) — Trait-based ECS (pmndrs)
- [Yuka](https://github.com/Mugen87/yuka) — Game AI: GOAP, steering, navmesh, perception
- [React Three Fiber](https://r3f.docs.pmnd.rs/) — React renderer for Three.js
- [drei](https://github.com/pmndrs/drei) — R3F helpers
- [Rapier](https://rapier.rs/) — Physics engine (WASM)
- [Tone.js](https://tonejs.github.io/) — Web audio synthesis
- [Expo](https://expo.dev/) — React Native + Web framework
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe SQL
- [nipplejs](https://yoannmoi.net/nipplejs/) — Virtual joystick
- [anime.js](https://animejs.com/) — Animation library
- [Vitest](https://vitest.dev/) — Unit testing
- [Playwright](https://playwright.dev/) — E2E browser testing
