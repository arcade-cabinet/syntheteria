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

## Architecture (Target)

```
syntheteria/
├── app/                        # Expo Router
│   ├── _layout.tsx             # Root: WorldProvider, fonts, persistence
│   ├── +html.tsx               # Web: SharedArrayBuffer headers
│   ├── index.tsx               # Title screen
│   ├── setup/
│   │   ├── index.tsx           # Race selection
│   │   └── map.tsx             # Map customization
│   └── game/
│       └── index.tsx           # Game: Canvas + HUD + controls
├── config/                     # JSON tunables (ALL game balance here)
│   ├── units.json              # Bot types, speeds, components
│   ├── buildings.json          # Building types, power requirements
│   ├── belts.json              # Belt tier speeds
│   ├── mining.json             # Extraction rates per ore type
│   ├── processing.json         # Smelter/refiner/separator recipes
│   ├── furnace.json            # Furnace recipes per tech tier
│   ├── enemies.json            # Enemy stats per type
│   ├── civilizations.json      # Race definitions + governor profiles
│   ├── technology.json         # Tech tree tiers and unlocks
│   ├── deposits.json           # Ore deposit placement rules
│   ├── power.json              # Lightning rods, wire limits, storm
│   ├── combat.json             # Damage, ranges, cooldowns
│   ├── hacking.json            # Compute costs, hack speeds
│   ├── materials.json          # PBR material palette specs
│   ├── cubeMaterials.json      # Per-cube PBR treatments
│   ├── factionVisuals.json     # Per-race visual identity
│   ├── botMovement.json        # Yuka Vehicle configs per bot type
│   ├── quests.json             # Otter hologram quest progression
│   ├── mapPresets.json         # Map generation presets
│   ├── terrain.json            # Heightfield, zone colors, deposits
│   ├── audio.json              # Volume levels, ambient layers
│   └── rendering.json          # Material params, LOD, particles
├── game/                       # Game logic
│   ├── config/
│   │   └── index.ts            # Type-safe JSON imports (typeof inference)
│   ├── ecs/
│   │   ├── world.ts            # Koota world + world traits (GameTime, ResourcePool, etc.)
│   │   ├── traits/
│   │   │   ├── core.ts         # Position, Faction, IsPlayerControlled
│   │   │   ├── unit.ts         # Unit, Building, LightningRod
│   │   │   ├── factory.ts      # Belt, Wire, Miner, Processor + relations
│   │   │   ├── materials.ts    # OreDeposit, MaterialCube, PowderStorage, Hopper
│   │   │   └── ai.ts           # Hackable, SignalRelay, Automation, Otter, Hologram
│   │   ├── actions.ts          # createActions: spawn/destroy bundles
│   │   └── Provider.tsx        # WorldProvider wrapper
│   ├── ai/
│   │   ├── governor/           # Yuka GOAP civilization governors
│   │   │   ├── entity.ts       # CivGovernorEntity (GameEntity + Think)
│   │   │   ├── evaluators.ts   # Expand/Economy/Military/Defense/Research/Diplomacy
│   │   │   └── CivilizationGovernor.ts
│   │   ├── unit/               # Yuka GOAP unit-level AI
│   │   │   ├── entity.ts       # UnitBrainEntity
│   │   │   └── evaluators.ts   # Patrol/Attack/Flee/Guard
│   │   ├── vehicles/           # Yuka Vehicle + steering
│   │   │   └── VehicleManager.ts
│   │   ├── navigation/         # Yuka NavMesh pathfinding
│   │   └── perception/         # Yuka Vision + MemorySystem
│   ├── systems/                # ECS systems (Koota queries)
│   ├── input/                  # FPS camera, object selection, mobile controls
│   │   ├── FPSCamera.tsx
│   │   ├── ObjectSelectionSystem.tsx  # Rapier raycast → highlight → radial menu
│   │   └── FPSMovement.ts
│   ├── audio/                  # Tone.js audio
│   ├── rendering/
│   │   ├── procgen/            # Procedural geometry generators
│   │   │   ├── PanelGeometry.ts    # Beveled panels with insets, bolts, vents
│   │   │   ├── BotGenerator.ts     # Panel-assembled bot meshes
│   │   │   ├── BuildingGenerator.ts # Procedural machine buildings
│   │   │   └── DepositGenerator.ts  # Organic ore deposit meshes
│   │   ├── SelectionHighlight.tsx  # Emissive glow on hover/select
│   │   ├── BotRenderer.tsx         # Procedural bots (replaces UnitRenderer)
│   │   ├── CubeRenderer.tsx        # Instanced PBR material cubes
│   │   ├── DepositRenderer.tsx     # Organic ore deposit rendering
│   │   └── materials/
│   │       ├── MaterialFactory.ts  # Composable PBR from JSON specs
│   │       └── NormalMapComposer.ts # Layered bolt/seam/vent/hex details
│   ├── physics/                # Rapier WASM
│   ├── save/                   # Drizzle ORM + expo-sqlite / IndexedDB
│   └── ui/
│       ├── Bezel.tsx
│       ├── FPSHUD.tsx
│       ├── ObjectActionMenu.tsx    # Context-sensitive radial per clicked object
│       ├── InventoryView.tsx
│       ├── MobileControls.tsx
│       └── TitleScreen.tsx
├── app.json                    # Expo config
├── metro.config.js             # Metro: WASM + GLB assets, tslib fix
├── babel.config.js             # babel-preset-expo
└── tsconfig.json               # Extends expo/tsconfig.base
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

### Architecture Migration (Critical Path)
- [ ] Expo project scaffolding (app/, app.json, metro.config.js)
- [ ] Koota ECS: define all traits, create world, migrate systems one at a time
- [ ] JSON config: create config/ directory, externalize all hardcoded values
- [ ] Yuka: Vehicle system for bot movement, NavMesh for pathfinding
- [ ] Contextual interaction: ObjectSelectionSystem + ObjectActionMenu

### Core Loop (High Priority)
- [ ] OreDeposit trait + procedural deposit renderer (organic shapes)
- [ ] Harvester mechanic (grind → particles → powder gauge)
- [ ] Compression mechanic (screen shake, pressure/heat overlay, cube ejects)
- [ ] MaterialCube as physical Rapier rigid body with PBR material
- [ ] Grabber tool (magnetic beam, carry/drop/throw cubes)
- [ ] Furnace machine (hopper input, radial recipe menu, output slot)
- [ ] Belt transport of physical cubes (not abstract items)

### Visual Identity (High Priority)
- [ ] Panel-based procedural geometry (PanelGeometry.ts)
- [ ] BotGenerator: faction-distinct bots with panels, bolts, vents, chrome
- [ ] MaterialFactory: composable PBR from JSON material specs
- [ ] NormalMapComposer: layered detail (bolts, seams, vents, hex patterns)
- [ ] Cube materials: each ore type has unique PBR treatment
- [ ] Replace all meshLambertMaterial with MeshStandardMaterial

### 4X Systems (Medium Priority)
- [ ] CivilizationGovernor with Yuka GOAP evaluators
- [ ] Territory claiming (outposts, claim radius, border visualization)
- [ ] Fog of war (hidden/explored/visible)
- [ ] Race selection + map customization pregame screens
- [ ] Tech tree progression (config/technology.json)
- [ ] AI civilization economics (harvest → compress → carry → build)

### Polish
- [ ] Otter hologram quest system (config/quests.json)
- [ ] Formation movement (Yuka OffsetPursuit + Separation)
- [ ] Cube stacking physics (snap grid, topple when unstable)
- [ ] Raid/theft mechanics (grab enemy cubes, defend stockpiles)
- [ ] Instanced rendering for performance at scale

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
