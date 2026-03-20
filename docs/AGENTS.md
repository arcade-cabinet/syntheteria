# Syntheteria Documentation Index

> Read `memory-bank/AGENTS.md` for session start protocol.

## Documentation

| Doc | What's There |
|-----|-------------|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Vision, lore, world model, 4X pillars, 13-material economy, salvage, buildings, storm power, bots, factions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tech stack, all packages (incl. buildings/, resources/, systems/), ECS patterns, GLSL shaders, test strategy |
| [ROADMAP.md](ROADMAP.md) | Phase 1-2 DONE, Phase 3 in progress (world population + GLB rendering) |
| [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) | Umbrella plan: single `views/`, Koota/Phaser/Three refs, CivRev2 parity, assets, tests |
| [CLOUD_AGENT_RUNBOOK.md](CLOUD_AGENT_RUNBOOK.md) | **Long-running / cloud agents:** doc index, POC links, phased backlog, squash PR workflow |
| [reference-codebases.md](reference-codebases.md) | Clone commands for Koota, Phaser, three.js (local review) |

## Memory Bank

| File | What's There |
|------|-------------|
| [memory-bank/AGENTS.md](memory-bank/AGENTS.md) | Session protocol + doc index |
| [memory-bank/activeContext.md](memory-bank/activeContext.md) | Current focus, recent changes, next steps |
| [memory-bank/progress.md](memory-bank/progress.md) | Per-system status dashboard |
| [memory-bank/systemPatterns.md](memory-bank/systemPatterns.md) | ECS patterns, resource/building patterns, command UI (legacy radial noted), render patterns |
| [memory-bank/techContext.md](memory-bank/techContext.md) | Current stack summary |

## Which Doc Do I Read?

| Task involves... | Read |
|-----------------|------|
| Game vision, lore, factions, bots, economy, UI | `GAME_DESIGN.md` |
| Tech stack, ECS patterns, packages, SQLite, tests | `ARCHITECTURE.md` |
| What to build next, phase status | `ROADMAP.md` |
| Current focus / what's happening now | `memory-bank/activeContext.md` |
| What works / what's broken | `memory-bank/progress.md` |
| Resource/building/command UI patterns | `memory-bank/systemPatterns.md` |

## Source Packages

| Package | Location | Key Contents |
|---------|----------|-------------|
| Board | `src/board/` | generator, noise, adjacency, grid, depth |
| Camera | `src/camera/` | IsometricCamera (CivRev2-style) |
| ECS core | `src/ecs/traits/` | board, tile, unit, faction, resource, building, salvage, cult |
| Terrain | `src/ecs/terrain/` | FloorType (9), ResourceMaterial (13), GLSL shaders |
| Robots | `src/ecs/robots/` | 9 archetypes, placement, marks |
| Factions | `src/ecs/factions/` | 5 factions + 3 cults, relations |
| Buildings | `src/ecs/buildings/` | 8 faction buildings, 4 cult structures |
| Resources | `src/ecs/resources/` | 5 salvage types with yield tables |
| Systems | `src/ecs/systems/` | movement, highlight, turn, attack, harvest, resource, AI, cultist |
| Command UI | `src/systems/` + `src/ui/game/` | **Target:** Civ VI–style strip/inspector; **legacy:** radialMenu + RadialMenu.tsx |
| DB | `src/db/` | SQLite schema, GameRepo, sql.js adapter |
| Rendering | `src/views/board/` + `src/views/title/` | Phaser board + R3F title globe (`src/rendering/` **deleted**) |
| Input | `src/input/` | BoardInput (select/move/attack) |
| UI | `src/ui/` | Landing, NewGameModal, Settings, GameScreen, HUD, command panels (legacy RadialMenu until removed) |
| Config | `src/config/` | gameDefaults.ts |
