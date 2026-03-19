# Syntheteria — Multi-Agent Orchestration

> **Session start**: Read this file, then `docs/memory-bank/activeContext.md`.
> **NEVER reference `pending/`** — it is the old game, quarantined permanently.

---

## What This Is

A **fixed-board 4X strategy game** on future Earth (the ecumenopolis). Ground-up rewrite on `ralph/syntheteria-1-0`.
The old infinite-map ecumenopolis game is in `pending/` (excluded from tsconfig + biome).

**Primary build:** `pnpm dev` (Vite). **Tests:** `pnpm test:vitest`. **Lint + tsc:** `pnpm verify`.

---

## Repository Layout

```
syntheteria/
├── CLAUDE.md                  # Claude Code behavior contract
├── AGENTS.md                  # THIS FILE — multi-agent orchestration
├── src/
│   ├── main.tsx               # Entry + Root: screen state machine (landing → generating → game)
│   ├── board/                 # Fixed-size deterministic board generator
│   ├── camera/                # IsometricCamera (CivRev2-style)
│   ├── ecs/
│   │   ├── traits/            # board, tile, unit, faction, resource, building, salvage, cult
│   │   ├── terrain/           # FloorType (9 substrates), ResourceMaterial (13 types), GLSL shaders
│   │   ├── robots/            # 9 archetypes, placement flags, marks, specializations (14 tracks)
│   │   ├── factions/          # 5 factions + 3 cults, relations
│   │   ├── buildings/         # 15 faction buildings + 6 cult structures
│   │   ├── resources/         # 10 salvage types with yield tables
│   │   └── systems/           # 40+ systems (movement, combat, economy, AI, cult, specialization, etc.)
│   ├── ai/                    # Yuka GOAP, fuzzy logic, NavGraph, track selection
│   ├── systems/               # radialMenu state machine, radialProviders
│   ├── audio/                 # Tone.js synth pooling, SFX, ambient storm
│   ├── db/                    # SQLite schema + GameRepo (sql.js adapter)
│   ├── rendering/             # BoardRenderer, DepthRenderer, UnitRenderer, StormDome, MinedPitRenderer
│   ├── input/                 # BoardInput (click-to-select/move/attack)
│   ├── ui/
│   │   ├── landing/           # LandingScreen, NewGameModal, SettingsModal, TitleMenuScene
│   │   └── game/              # GameScreen, HUD, RadialMenu, GarageModal, info panels
│   ├── config/                # gameDefaults.ts, techTreeDefs.ts
│   └── world/                 # Config wiring, world initialization
├── docs/
│   ├── AGENTS.md              # Documentation index (what to read for each task)
│   ├── ARCHITECTURE.md        # Tech stack, all packages, ECS patterns, test strategy
│   ├── GAME_DESIGN.md         # Vision, lore, world model, economy, bots, factions
│   ├── ROADMAP.md             # Foundation status, what's next
│   └── memory-bank/           # Session context — read these every session
│       ├── activeContext.md   # CURRENT focus, recent changes, what's next
│       └── progress.md        # System status dashboard
├── public/
│   ├── assets/models/         # 360 curated GLB models
│   └── assets/textures/       # PBR atlas textures (AmbientCG)
├── pending/                   # OLD GAME — quarantined, never touch
└── tests/                     # Playwright E2E + Vitest browser CT
```

---

## Session Protocol

Every agent session must:
1. Read `docs/memory-bank/activeContext.md` — current focus and state
2. Read `docs/memory-bank/progress.md` — what works and what doesn't
3. Check `docs/ARCHITECTURE.md` — if your task involves design or ECS patterns
4. Run `pnpm test:vitest` — verify all tests pass before starting
5. **Never** read or reference anything in `pending/`

---

## Architecture Rules

| Rule | Detail |
|------|--------|
| No JSON for game data | All models/factions/robots/buildings are TypeScript `const` objects |
| Systems accept `world` param | Never use world singleton — enables clean test isolation |
| All tunables in `gameDefaults.ts` | No magic numbers in system or rendering code |
| `pending/` is permanent | Nothing from there gets resurrected |
| SQLite is non-fatal | DB failures don't crash — ECS runs in memory |
| ECS `.get()` returns undefined | Always null-guard: `const x = e.get(Trait); if (!x) continue;` |
| No `world.entity(id)` in Koota | Rebuild `Map<id, Entity>` per-operation when needed |
| Salvage = primary resource | Floor mining is the backstop, not the main economy |
| Storm = power grid | Storm transmitters tap the perpetual storm for power |

---

## Agent Team

Agents for this codebase:

| Agent | Domain | When to use |
|-------|--------|-------------|
| `board-agent` | `src/board/` | Board gen, noise, adjacency, GridApi, depth stacking |
| `ecs-agent` | `src/ecs/` | Traits, systems, robots, factions, buildings, salvage, resources |
| `db-agent` | `src/db/` | Schema, migrations, GameRepo, sql.js adapter |
| `rendering-agent` | `src/rendering/` | BoardRenderer, DepthRenderer, UnitRenderer, StormDome, future GLB |
| `ui-agent` | `src/ui/`, `src/input/`, `src/systems/` | Landing, modals, HUD, RadialMenu, BoardInput |
| `integration-agent` | `src/main.tsx`, `src/ui/game/GameScreen.tsx` | Wire packages together |

---

## Common Commands

```bash
pnpm dev                 # Vite dev server (http://localhost:5173)
pnpm dev --host          # Expose on LAN
pnpm build               # Production build
pnpm test:vitest         # Run all Vitest suites (~124 suites, 2171 tests)
pnpm tsc                 # TypeScript check (pnpm tsc --noEmit)
pnpm lint                # Biome lint + format check
pnpm verify              # lint + tsc + test (all gates)
```

---

## Validation (before any PR or merge)

```
pnpm verify — all gates must pass
  Biome lint: 0 errors, 0 warnings
  TypeScript: 0 errors
  Vitest: all suites passing
```
