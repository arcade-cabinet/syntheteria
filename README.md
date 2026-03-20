# Syntheteria

An epoch-based 4X strategy game on **near-future Earth**: awakened AI factions compete while the climate collapses toward a hypercane. You explore and exploit **eight natural biomes** that your networks **roboform** into machine infrastructure over time — not a pre-built planetary city.

## Quick Start

```bash
pnpm install
pnpm dev            # Vite dev server (localhost:5173)
pnpm verify         # lint + tsc + vitest (the CI gate)
pnpm build          # Production build
pnpm check-imports  # Architectural import gates
```

## Current Focus

Biome terrain and building-driven progression are in place. **Eight terrain biomes** (ruins are a **POI**, not a biome). **Three POI categories:** ruin sites (rewards/salvage), **hostile** settlements (**human cities** in Epochs 1–2 → **Cult of EL** from Epoch 3 when the EL arrive), and **holocrons** (lore + one-time bonuses). **Six functional** starting robots, 17 materials across natural→processed→synthetic tiers, per-building management modals, six victory conditions, balance harness. **Onboarding** is **organic** — contextual tooltips as you play, not a blocking modal tutorial. Next: visual roboforming overlays, terrain blending, and forest canopy rendering in the Phaser board renderer.

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
