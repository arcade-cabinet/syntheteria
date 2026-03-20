# Syntheteria

An epoch-based 4X strategy game. Awakened AI consciousness rebuilding on a storm-wracked future Earth.

## Quick Start

```bash
pnpm install
pnpm dev            # Vite dev server (localhost:5173)
pnpm verify         # lint + tsc + vitest (the CI gate)
pnpm build          # Production build
pnpm check-imports  # Architectural import gates
```

## Current Focus

Biome terrain and building-driven progression are complete. The game has 9 terrain types, 17 materials across natural→processed→synthetic tiers, per-building management modals, 6 victory conditions, and a balance harness for AI-vs-AI playtesting. Next up: visual roboforming overlays, terrain blending, and forest canopy rendering in the Phaser board renderer.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical stack, rendering architecture, ECS patterns, AI systems, and testing strategy.

## Game Design

See [DESIGN.md](DESIGN.md) for the game bible: vision, lore, factions, economy, epochs, bots, and victory conditions.

## Agent Protocol

See [AGENTS.md](AGENTS.md) for package structure, session rules, architecture rules, and common commands.

## Platform Targets

- **Web**: Vite dev server / GitHub Pages
- **Android**: Capacitor (`pnpm build && npx cap sync android`)
- **iOS**: Capacitor (`pnpm build && npx cap sync ios`)

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Vite dev server (localhost:5173) |
| `pnpm verify` | Full CI gate (lint + tsc + vitest) |
| `pnpm build` | Production web build |
| `pnpm test:vitest` | Run Vitest suites (130 files, 2282 tests) |
| `pnpm lint` | Biome lint + format check |
| `pnpm tsc` | TypeScript type check |
| `pnpm check-imports` | Architectural import gates |
| `pnpm cap:sync` | Sync Capacitor platforms |

## Stack

| Layer | Technology |
|-------|------------|
| Bundler | Vite |
| Match Renderer | Phaser 3 + enable3d |
| Title Renderer | React Three Fiber |
| UI | React DOM |
| ECS | Koota |
| AI | Yuka (GOAP + FSM) |
| Database | Capacitor SQLite |
| Testing | Vitest + Biome |
| Mobile | Capacitor |

## Documentation

| File | Contents |
|------|----------|
| [AGENTS.md](AGENTS.md) | Package structure, architecture rules, session protocol |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, rendering, ECS, AI, testing |
| [DESIGN.md](DESIGN.md) | Game design bible |
| [CHANGELOG.md](CHANGELOG.md) | Project status and history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, workflow, code rules |
| [CLAUDE.md](CLAUDE.md) | Agent entry point |

## License

All rights reserved. This is a proprietary project.
