# Syntheteria — Project Structure

```
app/                    # Expo Router screens (file-based routing)
  _layout.tsx           # Root layout: providers, fonts, persistence
  +html.tsx             # Web: SharedArrayBuffer headers
  index.tsx             # Title screen
  game/index.tsx        # Game screen: Canvas + HUD + controls

config/                 # JSON tunables — ALL game balance here (40+ files)
  index.ts              # Type-safe config loader (typeof inference)
  __tests__/            # Schema validation + cross-reference tests
  *.json                # mining, furnace, combat, buildings, belts, tech, etc.

src/                    # All game source code
  ai/                   # Yuka AI: GOAP governors, Vehicle steering, NavMesh, perception
    goap/               # CivilizationGovernor, GOAPPlanner, evaluators
  audio/                # Tone.js: spatial audio, procedural SFX, adaptive music
  ecs/                  # Miniplex ECS world, entity types, game state, seed RNG
    koota/              # Koota migration bridge (in progress)
  input/                # FPS camera, mouse/keyboard, mobile touch, object selection
  physics/              # Rapier WASM setup, physics world
  rendering/            # Three.js / R3F visual components
    materials/          # PBR material system (MaterialFactory, CubeMaterialProvider)
    procgen/            # Procedural geometry (panels, bots, deposits, buildings)
    shaders/            # Custom GLSL shaders
  save/                 # Persistence (IndexedDB web, expo-sqlite native)
  systems/              # ECS game systems (~120 files): core loop, combat, economy, etc.
    __tests__/          # Unit tests for systems
  ui/                   # React HUD components: menus, overlays, settings

ecs/                    # Koota trait definitions (migration target)
  traits/

docs/                   # Documentation
  design/               # GDD design documents (source of truth)
  technical/            # Architecture, formulas
  story/                # Lore and narrative
  plans/                # Implementation plans

assets/                 # Binary assets (Git LFS): textures, HDRI, models
tests/                  # Playwright E2E tests
scripts/                # Build/utility scripts
```

## Key Patterns

- `app/` is Expo Router (file-based routing), `src/` is all game logic
- `config/` is strictly JSON data, never code logic — systems import from `config/index.ts`
- `src/systems/` is the largest directory (~120 system files), each a pure function module
- `docs/design/` GDDs are authoritative for design decisions
- Binary assets tracked via Git LFS (*.glb, *.exr, *.jpg, *.png)
