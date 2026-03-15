---
title: "Documentation Index"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "Navigation index for all Syntheteria documentation — start here after memory bank"
---

# Syntheteria Documentation Index

> **Read `memory-bank/AGENTS.md` first** for session start protocol.
> This file is the index. Domain docs are the detail.

## Quick Start for Agents

1. Read [memory-bank/AGENTS.md](memory-bank/AGENTS.md) — session protocol
2. Read [memory-bank/activeContext.md](memory-bank/activeContext.md) — what's happening now
3. Read [memory-bank/progress.md](memory-bank/progress.md) — system status dashboard
4. Read this file — find the domain docs relevant to your task
5. Use `head -15 <file>` on any domain doc to read its frontmatter summary before committing to a full read

## Frontmatter Convention

Every document under `docs/` has YAML frontmatter:

```yaml
---
title: "Document Title"
domain: design | technical | interface | meta
status: canonical | reference | archived
last_updated: 2026-03-14
summary: "One-line description — agent can decide relevance from this"
depends_on: []
planned_work: []
---
```

## Domain Map

### Memory Bank (`memory-bank/`)

Executive summaries for session bootstrap. Read these FIRST.

| File | Summary |
|------|---------|
| [AGENTS.md](memory-bank/AGENTS.md) | Session start/end protocol, update rules |
| [projectbrief.md](memory-bank/projectbrief.md) | What is Syntheteria, non-negotiable requirements |
| [productContext.md](memory-bank/productContext.md) | Why it exists, UX goals, target experience |
| [activeContext.md](memory-bank/activeContext.md) | Current focus, recent changes, next steps |
| [systemPatterns.md](memory-bank/systemPatterns.md) | Architecture patterns, ECS, game loop, AI stack |
| [techContext.md](memory-bank/techContext.md) | Tech stack, build commands, constraints |
| [progress.md](memory-bank/progress.md) | System status dashboard, known issues, metrics |

### Design (`design/`)

Game design — what the game IS. What the player experiences.

| File | Summary |
|------|---------|
| [GAME_DESIGN.md](design/GAME_DESIGN.md) | Core vision, 4X pillars, game phases, progression |
| [LORE.md](design/LORE.md) | 140-year timeline, Earth history, EL, cultists |
| [FACTIONS.md](design/FACTIONS.md) | Campaign arc, 4 rival factions, cultist pressure, victory paths |
| [ECONOMY.md](design/ECONOMY.md) | Turn system (AP/MP), 11 materials, harvest flow, Motor Pool |
| [BOTS.md](design/BOTS.md) | 9 chassis, archetypes, Mark I-V, speech profiles |
| [OPEN_QUESTIONS.md](design/OPEN_QUESTIONS.md) | Unresolved design decisions |

### Technical (`technical/`)

How the game is built. Architecture and implementation.

| File | Summary |
|------|---------|
| [ARCHITECTURE.md](technical/ARCHITECTURE.md) | Stack, ECS structure, persistence, hard rules |
| [WORLD_SYSTEMS.md](technical/WORLD_SYSTEMS.md) | Spatial model, sectors, chunk architecture, city contracts |
| [AI_SYSTEMS.md](technical/AI_SYSTEMS.md) | GOAP governors, Yuka steering, NavMesh, AI packages |
| [ASSETS.md](technical/ASSETS.md) | 91 city GLBs, 9 robot chassis, gaps, ingestion pipeline |
| [RENDERING.md](technical/RENDERING.md) | 39 renderers, storm system, floor zones, performance |
| [RENDERING_BACKENDS.md](technical/RENDERING_BACKENDS.md) | WebGPU (web) + Filament (mobile) target architecture, abstraction, migration |

### Interface (`interface/`)

Player-facing surfaces. Visual language and interaction model.

| File | Summary |
|------|---------|
| [UI_DESIGN.md](interface/UI_DESIGN.md) | Brand identity, palette, mobile viewport, components, a11y |
| [INPUT.md](interface/INPUT.md) | Radial menu (sole context surface), input mappings, zoom tiers |

### Execution (`plans/`)

| File | Summary |
|------|---------|
| [GAMEPLAN_1_0.md](plans/GAMEPLAN_1_0.md) | Comprehensive assessment + 6-phase roadmap (single source of truth for execution) |
| [EXPO_TO_CAPACITOR_MIGRATION.md](plans/EXPO_TO_CAPACITOR_MIGRATION.md) | **Migration plan:** Expo/RN/Filament → Capacitor + Vite + R3F only; assets in public; @capacitor-community/sqlite |
| [PLAYWRIGHT_TO_MAESTRO_MIGRATION.md](plans/PLAYWRIGHT_TO_MAESTRO_MIGRATION.md) | E2E pivot: Maestro + RNTL + @react-three/test-renderer |
| [MAESTRO_PLAYTESTING.md](plans/MAESTRO_PLAYTESTING.md) | How to run Maestro flows, web vs native, verification status |
| [COMPREHENSIVE_AUDIT_2026-03.md](plans/COMPREHENSIVE_AUDIT_2026-03.md) | Full codebase vs docs/PRD/GAMEPLAN audit |
| [NICE_TO_HAVES.md](plans/NICE_TO_HAVES.md) | Consolidated optional, P2, and deferred items |
| [PR_CHECKLIST.md](plans/PR_CHECKLIST.md) | Checklist for creating and merging the 1.0 PR |
| [TASK_LIST.md](plans/TASK_LIST.md) | **Remaining work** with dependencies (docs, E2E, assets commit, verification, PR) |

### Archive (`archive/`)

Completed, obsolete, or superseded documents. Reference only — do not use for planning.

## Which Doc Do I Read?

| If your task involves... | Read |
|--------------------------|------|
| Core gameplay, 4X design | `design/GAME_DESIGN.md` |
| World history, lore, setting | `design/LORE.md` |
| Factions, campaign, victory | `design/FACTIONS.md` |
| Resources, turns, economy, building | `design/ECONOMY.md` |
| Bot types, marks, upgrades, speech | `design/BOTS.md` |
| Tech stack, ECS, persistence, rules | `technical/ARCHITECTURE.md` |
| World generation, chunks, spatial model | `technical/WORLD_SYSTEMS.md` |
| AI behavior, GOAP, steering | `technical/AI_SYSTEMS.md` |
| 3D models, textures, asset pipeline | `technical/ASSETS.md` |
| Renderers, storm, floor, particles | `technical/RENDERING.md` |
| UI layout, colors, components, a11y | `interface/UI_DESIGN.md` |
| Input mapping, radial menu, zoom | `interface/INPUT.md` |
| Current status, what to do next | `memory-bank/activeContext.md` |
| What works / what's broken | `memory-bank/progress.md` |
| E2E testing, Maestro flows, web vs native | `plans/MAESTRO_PLAYTESTING.md` |
| Migrating off Expo/RN to Capacitor + Vite + R3F | `plans/EXPO_TO_CAPACITOR_MIGRATION.md` |
