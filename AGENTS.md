# Syntheteria — Agent Guide

First-person 4X factory game on a machine planet. Physical cube economy, AI civilizations, first-person factory building.

## Directory Map

| Directory | What's There | When to Go |
|-----------|-------------|------------|
| `docs/` | All project documentation | Design questions, architecture, config reference, lore |
| `.claude/agents/` | 6 specialist agent definitions | Agent team orchestration |
| `config/` | 39+ JSON tunables | Game balance, recipes, tech tree, combat stats |
| `src/` | All game source code | Implementation, debugging, testing |
| `tests/e2e/` | Playwright E2E tests | Browser-level verification |

## Agent Team

Six specialist agents defined in `.claude/agents/`:

| Agent | Domain | Key Files |
|-------|--------|-----------|
| `systems-engineer` | ECS, physics, game loop, harvesting, belts, combat, economy | `src/systems/`, `src/ecs/` |
| `ai-engineer` | GOAP governors, Vehicle steering, NavMesh, bot brains, perception | `src/ai/` |
| `frontend-designer` | Title screen, pregame, HUD, menus, settings, accessibility | `src/ui/`, `src/input/` |
| `rendering-engineer` | PBR materials, procedural geometry, instancing, shaders, LOD | `src/rendering/` |
| `audio-engineer` | Tone.js spatial audio, procedural SFX, ambient, adaptive music | `src/audio/` |
| `config-docs` | JSON config, schema validation, docs, CI pipeline | `config/`, `docs/`, `.github/` |

## Quick Start

- **"What does the game do?"** → `docs/design/` (see `docs/AGENTS.md`)
- **"How is the code structured?"** → `docs/ARCHITECTURE.md` + `docs/technical/`
- **"How do I change game balance?"** → `docs/CONFIG.md` + `config/index.ts`
- **"What's left to build?"** → `docs/REMAINING-WORK.md`
- **"How do I contribute?"** → `docs/CONTRIBUTING.md`
