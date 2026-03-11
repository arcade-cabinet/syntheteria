# Documentation — Agent Guide

All project documentation lives here. Design docs describe what the game SHOULD be. Technical docs describe how the code IS.

## Directory Map

| Directory | Contents | When to Go |
|-----------|----------|------------|
| `design/` | Game design documents — mechanics, world, AI, UI, research | Design decisions, gameplay questions, "what should X do?" |
| `technical/` | Architecture deep-dives, core formulas, reference builds | Implementation details, "how does X work in code?" |
| `story/` | Lore overview, narrative design | World-building, faction backstory, quest writing |
| `playtests/` | Playtest reports and findings | UX issues, player experience, balance feedback |

## Root-Level Docs

| Document | Purpose |
|----------|---------|
| `ARCHITECTURE.md` | Tech stack overview, data flow, system inventory (points to `technical/ARCHITECTURE.md` for details) |
| `CONFIG.md` | JSON config system — all 39+ config files, schema, how to add new tunables |
| `CONTRIBUTING.md` | Dev workflow — testing, code style, commit conventions, CI |
| `REMAINING-WORK.md` | Comprehensive task tracker — what's done, what's not, priority order |

## Design Docs

The design directory (`design/`) is the most important subdirectory. It has its own `AGENTS.md` with detailed guidance on 5 domain subdirectories:

- **gameplay/** — core loop, materials, combat, progression, victory conditions
- **world/** — environment, races/factions, alien natives
- **agents/** — AI governor architecture, bot brain design
- **interface/** — HUD, interaction model, onboarding
- **research/** — comparative analysis of other 4X/factory games

See `design/AGENTS.md` for full details.
