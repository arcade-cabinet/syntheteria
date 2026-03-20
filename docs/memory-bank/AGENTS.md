# Syntheteria — Session Protocol

> Every agent session MUST read before starting:
> 1. `AGENTS.md` (root) — architecture rules, agent team, common commands
> 2. `docs/memory-bank/activeContext.md` — CURRENT focus, recent changes, what's next
> 3. `docs/memory-bank/progress.md` — system status dashboard

---

## Documentation Index

| Doc | What's There |
|-----|-------------|
| `docs/GAME_DESIGN.md` | Vision, lore, world model, 4X pillars, biome terrain, economy, bots, factions, visual language |
| `docs/ARCHITECTURE.md` | Tech stack (Phaser + enable3d, R3F, Koota, Capacitor), all packages, ECS patterns, SQLite schema, test strategy |
| `docs/ROADMAP.md` | Phases 1–11 status, Phase 11.8 still open |
| `docs/COMPREHENSIVE_ENGINEERING_PLAN.md` | Single `views/`, reference repos, CivRev2 + POC gates, full test matrix |
| `docs/CLOUD_AGENT_RUNBOOK.md` | Agent entry point: rules, phases A–I (G cancelled), squash branch, all POC/plan links |
| `docs/RENDERING_VISION.md` | Phaser stack, lighting recipe, terrain/ocean/forest/roboforming visual gaps |
| `docs/PHASER_PIVOT_PLAN.md` | Phased migration; Phase 4 cancelled; cleanup done |
| `docs/PHASER_VS_REACT_MATRIX.md` | Phaser vs React DOM ownership |
| `docs/AI_DESIGN.md` | Yuka GOAP architecture |
| `docs/KOOTA_PATTERNS.md` | ECS patterns from official Koota examples |
| `docs/reference-codebases.md` | Where to clone Koota / Phaser / three for doc review |
| `docs/memory-bank/activeContext.md` | CURRENT focus + recent session changes |
| `docs/memory-bank/progress.md` | Per-system status dashboard (130 files, 2282 tests) |
| `docs/memory-bank/systemPatterns.md` | ECS patterns, board patterns, building-driven progression, config registry, render patterns |
| `docs/memory-bank/techContext.md` | Current tech stack summary (Phaser + enable3d, R3F, Capacitor SQLite) |

---

## Session End Protocol

After significant work, update:
- `docs/memory-bank/activeContext.md` — what you did, decisions, next steps
- `docs/memory-bank/progress.md` — if any system status changed

---

## Hard Rules

1. Memory bank files are SUMMARIES — link to domain docs for detail, never duplicate.
2. `activeContext.md` should be <200 lines. Prune old entries.
3. `progress.md` tracks system-level status, not tasks.
4. Never reference anything in `pending/` except as a reference library.
5. `CLAUDE.md` contract wins over everything else.
