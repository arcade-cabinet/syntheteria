# Syntheteria — Session Protocol

> Every agent session MUST read before starting:
> 1. `AGENTS.md` (root) — architecture rules, agent team, common commands
> 2. `docs/memory-bank/activeContext.md` — CURRENT focus, recent changes, what's next
> 3. `docs/memory-bank/progress.md` — system status dashboard

---

## Documentation Index

| Doc | What's There |
|-----|-------------|
| `docs/GAME_DESIGN.md` | Vision, lore, world model, 4X pillars, economy, bots, factions, visual language |
| `docs/ARCHITECTURE.md` | Tech stack, all packages, ECS patterns, SQLite schema, test strategy, `pending/` reference |
| `docs/ROADMAP.md` | Foundation status, P0/P1/P2/P3 work, `pending/` port targets |
| `docs/memory-bank/activeContext.md` | CURRENT focus + recent session changes |
| `docs/memory-bank/progress.md` | Per-system status dashboard |
| `docs/memory-bank/systemPatterns.md` | ECS patterns, board patterns, render patterns |
| `docs/memory-bank/techContext.md` | Current tech stack summary |

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
