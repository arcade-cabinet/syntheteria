# Syntheteria — Multi-Agent Orchestration

> **Session start**: Read this file, then `docs/memory-bank/activeContext.md`.
> **NEVER reference `pending/`** — it is the old game, quarantined permanently.

---

## What This Is

A **sphere-world 4X strategy game** on future Earth (the ecumenopolis). Ground-up rewrite on `docs/syntheteria-1-0-done`.
The old infinite-map ecumenopolis game is in `pending/` (excluded from tsconfig + biome).

**Primary build:** `pnpm dev` (Vite). **Tests:** `pnpm test:vitest`. **Lint + tsc:** `pnpm verify`.

---

## Repository Layout

```
syntheteria/
├── CLAUDE.md                  # Claude Code behavior contract
├── AGENTS.md                  # THIS FILE — multi-agent orchestration
├── src/                       # 344 source files
│   ├── main.tsx               # Entry + Root: phase state machine (title → setup → generating → playing)
│   ├── board/                 # Fixed-size deterministic board generator (14 files)
│   ├── camera/                # SphereOrbitCamera (sphere world)
│   ├── ecs/
│   │   ├── traits/            # board, tile, unit, faction, resource, building, salvage, cult
│   │   ├── terrain/           # FloorType (9 substrates), ResourceMaterial (13 types), GLSL shaders
│   │   ├── robots/            # 9 archetypes, placement flags, marks, specializations (14 tracks)
│   │   ├── factions/          # 5 factions + 3 cults, relations
│   │   ├── buildings/         # 15 faction buildings + 6 cult structures
│   │   ├── resources/         # 10 salvage types with yield tables
│   │   └── systems/           # 42 systems (movement, combat, economy, AI, cult, specialization, etc.)
│   ├── ai/                    # Yuka GOAP: agents/, fuzzy/, goals/, navigation/, perception/, runtime/, triggers/
│   ├── systems/               # radialMenu state machine, radialProviders
│   ├── audio/                 # audioEngine, sfx (Tone.js), ambience (storm loop)
│   ├── db/                    # SQLite schema + GameRepo (sql.js adapter)
│   ├── rendering/             # 20+ renderers, sphere placement, globe/, particles/, sky/, glsl/
│   ├── input/                 # BoardInput (click-to-select/move/attack)
│   ├── ui/
│   │   ├── Globe.tsx          # ONE persistent R3F Canvas across all phases (primary scene container)
│   │   ├── landing/           # LandingScreen, NewGameModal, SettingsModal, title/
│   │   └── game/              # HUD, RadialMenu, GarageModal, overlays, panels (26 files)
│   ├── config/                # 11 TypeScript const definition files (gameDefaults, techTree, etc.)
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
| All tunables in config files | No magic numbers in system or rendering code (11 config files) |
| `pending/` is permanent | Nothing from there gets resurrected |
| SQLite is non-fatal | DB failures don't crash — ECS runs in memory |
| ECS `.get()` returns undefined | Always null-guard: `const x = e.get(Trait); if (!x) continue;` |
| No `world.entity(id)` in Koota | Rebuild `Map<id, Entity>` per-operation when needed |
| Salvage = primary resource | Floor mining is the backstop, not the main economy |
| Storm = power grid | Storm transmitters tap the perpetual storm for power |
| Tiles = GPS coordinates | Each (x,z) is a DB record, `explored` is topmost gatekeeper |
| Globe.tsx = ONE Canvas | Single persistent R3F Canvas across all phases |
| Overlay vs diegetic UI | Overlay (HUD, modals) = DOM. Diegetic (speech, status bars) = in-Canvas |

---

## Agent Team

Agents for this codebase:

| Agent | Domain | When to use |
|-------|--------|-------------|
| `board-agent` | `src/board/` | Board gen, noise, adjacency, GridApi, depth stacking |
| `ecs-agent` | `src/ecs/` | Traits, systems, robots, factions, buildings, salvage, resources |
| `db-agent` | `src/db/` | Schema, migrations, GameRepo, sql.js adapter |
| `rendering-agent` | `src/rendering/` | Renderers, sphere geometry, globe/, particles/, GLSL |
| `ui-agent` | `src/ui/`, `src/input/`, `src/systems/` | Globe.tsx, landing, game overlays, HUD, BoardInput |
| `integration-agent` | `src/main.tsx`, `src/ui/Globe.tsx` | Wire packages together, phase transitions |

---

## Common Commands

```bash
pnpm dev                 # Vite dev server (http://localhost:5173)
pnpm dev --host          # Expose on LAN
pnpm build               # Production build
pnpm test:vitest         # Run all Vitest suites (131 suites, 2239 tests)
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
  Vitest: 131 suites, 2239 tests passing
```
