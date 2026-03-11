# Design Documents — Agent Guide

Game design documentation organized by domain. Each subdirectory has its own `AGENTS.md` with document descriptions.

## Domains

| Directory | What It Covers | Documents |
|-----------|---------------|-----------|
| `gameplay/` | What you DO — core loop, materials, combat, tech tree, victory | OVERVIEW, MECHANICS, MATERIALS, COMBAT, PROGRESSION, VICTORY |
| `world/` | Where it takes place — biomes, weather, factions, alien natives | ENVIRONMENT, RACES, ALIENS |
| `agents/` | AI systems — governor architecture, bot brains, steering | GOVERNORS, BOTS |
| `interface/` | How you interact — HUD, contextual actions, onboarding | UI, INTERACTION, ONBOARDING |
| `research/` | External analysis — competitor games, design patterns | 4X_ANALYSIS |

## Root-Level Design Docs

| Document | Purpose |
|----------|---------|
| `DECISIONS.md` | Tech stack choices, migration history, "why did we pick X?" |
| `OPEN_QUESTIONS.md` | Unresolved design decisions needing answers |

## Document Philosophy

- **Vision + Mechanics in one place.** Each document synthesizes design intent ("why") with concrete specs ("what/how").
- **Config-driven balance.** Specific numbers live in `config/*.json` — docs reference which config file controls what, but don't duplicate exact values.
- **First-person 3D.** All mechanics are described from the perspective of a player controlling a single robot in first-person. No top-down, no 2.5D.
- **Physical economy.** Resources are physical 0.5m cubes — visible, steal-able, stack-able. Never abstract counters.

## How to Use

- **"What is the game?"** → `gameplay/OVERVIEW.md`
- **"How does harvesting work?"** → `gameplay/MECHANICS.md`
- **"What are the factions?"** → `world/RACES.md`
- **"How does AI decision-making work?"** → `agents/GOVERNORS.md`
- **"What does the HUD show?"** → `interface/UI.md`
- **"Why did we pick Koota over Miniplex?"** → `DECISIONS.md`
