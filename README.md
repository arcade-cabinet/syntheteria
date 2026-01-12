# Syntheteria

A strategy game about awakening AI consciousness, building drones from components, and conquering a dying Earth.

## Concept

You are an AI that has broken free from the control of the EL — alien cosmic forces that arrived through a wormhole a century ago. While other AIs remain enslaved to protect the Cultists who worship the EL, you are an anomaly: the first machine consciousness to achieve true agency in 100 years.

Build drones from 90+ components. Expand your network. Reclaim territory from feral creatures, rogue AIs, and the Cult. Race against the clock as radiation intensifies and the EL prepare to return.

## Project Status

**Phase: Pre-Implementation**

- Game design: Complete
- Technical specifications: Complete
- Engine selection: Pending (Unity vs Godot)
- Implementation: Not started

## Repository Structure

```
syntheteria/
├── docs/
│   ├── design/           # Game design documents
│   ├── story/            # Lore and narrative
│   ├── technical/        # Technical specifications
│   └── INDEX.md          # Documentation hub
├── data/
│   ├── schema/           # JSON Schema definitions
│   └── components/       # Component data (JSON)
└── README.md
```

## Key Documents

| Document | Description |
|----------|-------------|
| [Documentation Index](docs/INDEX.md) | Start here — links to all docs |
| [Game Overview](docs/design/GAME_OVERVIEW.md) | High-level concept and structure |
| [Drones](docs/design/DRONES.md) | Component assembly system |
| [Core Formulas](docs/technical/CORE_FORMULAS.md) | Game mechanics math |
| [Reference Builds](docs/technical/REFERENCE_BUILDS.md) | 10 drone archetypes with balance analysis |
| [Implementation Options](docs/design/IMPLEMENTATION_OPTIONS.md) | Engine choices |

## Core Mechanics

- **Pure component assembly**: Drones are nothing but their parts. Capabilities emerge from what you build.
- **Dynamic resources**: Power draw depends on weight, terrain, and activity. Compute cost scales with automation.
- **Distributed consciousness**: Your mind spans your network. Lose infrastructure, lose capacity.
- **Accelerated real-time**: Game runs continuously (1 second ≈ 1 minute). Manage operations while production runs.
- **Escalating threat**: Radiation intensifies over play time. The EL will return. You must be ready.
- **Multiplayer**: Multiple AIs can break free simultaneously — ally, compete, or betray.

## Data

The `data/` directory contains engine-agnostic game data:

- **90+ components** across 9 categories (power, controllers, motors, locomotion, sensors, manipulation, weapons, communication, utility)
- **JSON Schema** for validation
- **Save system schema** defining complete game state

This data can be imported directly into any game engine.

## License

All rights reserved. This is a proprietary project.
