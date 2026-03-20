# Syntheteria Documentation Index

> Read `memory-bank/AGENTS.md` for session start protocol.

## Documentation

| Doc | What's There |
|-----|-------------|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Vision, lore, world model, 4X pillars, biome terrain, 17-material economy, salvage, buildings, storm power, bots, factions, epochs, victory conditions (LEGACY + TARGET) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tech stack (Phaser + enable3d, R3F, Koota, sql.js, Capacitor), all packages, ECS patterns, GLSL shaders, test strategy |
| [ROADMAP.md](ROADMAP.md) | Phases 1–11, Phase 11.8 (improvement overlays) still open |
| [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) | Umbrella plan: single `views/`, Koota/Phaser/Three refs, CivRev2 parity, assets, tests |
| [CLOUD_AGENT_RUNBOOK.md](CLOUD_AGENT_RUNBOOK.md) | **Long-running / cloud agents:** doc index, POC links, phased backlog (A–I done, G cancelled), squash PR workflow |
| [RENDERING_VISION.md](RENDERING_VISION.md) | Phaser stack decision, lighting recipe, terrain/ocean/forest/roboforming visual gaps |
| [PHASER_PIVOT_PLAN.md](PHASER_PIVOT_PLAN.md) | Phased migration plan; Phase 4 (settlements) cancelled; cleanup done |
| [PHASER_VS_REACT_MATRIX.md](PHASER_VS_REACT_MATRIX.md) | Phaser vs React DOM ownership matrix |
| [AI_DESIGN.md](AI_DESIGN.md) | Yuka GOAP architecture, AI faction behavior |
| [KOOTA_PATTERNS.md](KOOTA_PATTERNS.md) | ECS patterns from official Koota examples |
| [reference-codebases.md](reference-codebases.md) | Clone commands for Koota, Phaser, three.js (local review) |

## Memory Bank

| File | What's There |
|------|-------------|
| [memory-bank/AGENTS.md](memory-bank/AGENTS.md) | Session protocol + doc index |
| [memory-bank/activeContext.md](memory-bank/activeContext.md) | Current focus, recent changes, next steps |
| [memory-bank/progress.md](memory-bank/progress.md) | Per-system status dashboard (130 files, 2282 tests) |
| [memory-bank/systemPatterns.md](memory-bank/systemPatterns.md) | ECS patterns, resource/building patterns, building-driven progression, config registry, command UI (legacy radial noted), render patterns |
| [memory-bank/techContext.md](memory-bank/techContext.md) | Current stack summary (Phaser + enable3d, R3F, Capacitor SQLite) |

## Which Doc Do I Read?

| Task involves... | Read |
|-----------------|------|
| Game vision, lore, factions, bots, economy, UI | `GAME_DESIGN.md` |
| Tech stack, ECS patterns, packages, SQLite, tests | `ARCHITECTURE.md` |
| What to build next, phase status | `ROADMAP.md` |
| Rendering stack, visual targets, lighting | `RENDERING_VISION.md` |
| Current focus / what's happening now | `memory-bank/activeContext.md` |
| What works / what's broken | `memory-bank/progress.md` |
| Resource/building/command UI patterns | `memory-bank/systemPatterns.md` |

## Source Packages

| Package | Location | Key Contents |
|---------|----------|-------------|
| Board | `src/board/` | generator (biome noise), adjacency, grid |
| Board Sphere | `src/board/sphere/` | Sphere geometry, tile ↔ sphere conversion |
| Camera | `src/camera/` | IsometricCamera (CivRev2-style), SphereOrbitCamera |
| Traits | `src/traits/` | board, tile, unit, faction, resource, building, salvage, cult |
| Systems | `src/systems/` | 42+ systems: turn, combat, harvest, build, victory, score, diplomacy, etc. |
| Terrain | `src/terrain/` | BiomeType (9), ResourceMaterial (17), GLSL shaders |
| Robots | `src/robots/` | 9 archetypes, placement, marks, specializations |
| Factions | `src/factions/` | 5 factions + 3 cults, relations |
| Config | `src/config/` | 20 config files: gameDefaults, registry, preferences, buildings/, resources/ |
| Balance | `src/balance/` | Headless game runner, aggregator, diagnostics |
| AI | `src/ai/` | Yuka GOAP, fuzzy logic, NavGraph A*, track selection |
| DB | `src/db/` | SQLite schema, GameRepo, sql.js adapter, Capacitor adapter |
| Views (board) | `src/views/board/` | Phaser board + enable3d (match) |
| Views (title) | `src/views/title/` | R3F title globe |
| Input | `src/input/` | BoardInput (select/move/attack), pathPreview |
| UI | `src/ui/` | Globe, Landing, HUD, BuildingModal, overlays, per-building panels |
| Audio | `src/audio/` | audioEngine, sfx (Tone.js), ambience |
| Lib | `src/lib/` | chronometry, particles, fog |
