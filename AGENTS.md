# Syntheteria — Multi-Agent Orchestration

> **Session start**: Read this file, then [CHANGELOG.md](CHANGELOG.md) and [README.md](README.md).
> **NEVER reference `pending/`** — it is the old game, quarantined permanently.

---

## What This Is

An **epoch-based 4X strategy game** on Earth. You BUILD the ecumenopolis as climate deteriorates toward an inevitable hypercane. CivRev2-style isometric presentation. Globe is landing page only.

**Primary build:** `pnpm dev` (Vite). **Tests:** `pnpm test:vitest`. **Lint + tsc:** `pnpm verify`.

---

## Package Structure (MANDATORY)

Every directory under `src/` is a **self-contained package** following these rules:

### Rules

1. **Logic in `.ts`, presentation in `.tsx`, shaders in `.glsl`** — never mix
2. **Every package has `index.ts`** — exports ONLY the public API
3. **Consumers import from the package, NEVER from internal files**
   - Good: `import { Building } from "../traits"`
   - Bad: `import { Building } from "../traits/building"`
4. **Tests colocated in `__tests__/`** inside their owning package
5. **No cross-cutting deep imports** — packages communicate through their public APIs
6. **Systems accept `world: World` param** — never use a world singleton
7. **Config is data, not code** — all tunables in `src/config/`, never hardcoded

### File Size Limits

| Threshold | Action |
|-----------|--------|
| > 300 LOC | Consider splitting into submodules |
| > 500 LOC | Must split — create subpackage with own `index.ts` |
| > 1000 LOC | Absolute max — if you see this, stop and refactor |

### Package Map

```
src/
├── app/                # App shell — session lifecycle, debug bridge, HUD data
├── traits/             # ALL Koota trait definitions
├── systems/            # ALL Koota systems (one per file)
├── ai/                 # Yuka GOAP: agents/, fsm/, goals/, navigation/, steering/
├── board/              # Overworld generator, tile grid, adjacency, sphere/ (geometry + placement)
├── factions/           # Faction definitions, init, relations
├── robots/             # Archetypes, placement, specializations
├── terrain/            # Biome types, elevation, GLSL shaders
├── narrative/          # Speech profiles
├── config/             # Tunables, tech tree, recipes; subpackages buildings/, resources/; models.ts (GLB paths)
├── audio/              # Tone.js SFX + ambience
├── camera/             # Camera controllers
├── db/                 # SQLite schema + GameRepo
├── views/              # ALL rendering entrypoints
│   ├── title/          # R3F title + generating globe (TSX) — migrated from src/view/
│   └── board/          # Phaser + enable3d match board (pure TS)
├── ui/                 # React DOM: Globe composes views/title; HUD, landing/, game/
├── input/              # Board interaction + pathPreview.ts (move preview state)
├── world/              # New-game config (hub-and-spoke); building actions use per-building modals (no city screen)
├── balance/            # Balance harness — simulated runs, aggregation, diagnostics
├── lib/                # Shared utilities: chronometry.ts, fog/, particles/, uuid
├── types/              # Shared type declarations
├── init-world.ts       # World initialization from board
├── create-world.ts     # Koota world factory
├── seed.ts             # Seed phrase generation
└── main.tsx            # Entry point (thin — delegates to app/)
```

---

## Architecture Rules

| Rule | Detail |
|------|--------|
| No JSON for game data | All config is TypeScript `const` objects in `src/config/` |
| Systems accept `world` param | Never use world singleton — enables test isolation |
| All tunables in config files | No magic numbers in systems or renderers |
| `pending/` is permanent quarantine | Nothing gets resurrected from it |
| SQLite is non-fatal | DB failures don't crash — ECS runs in memory |
| ECS `.get()` returns undefined | Always null-guard: `if (!x) continue;` |
| No `world.entity(id)` in Koota | Use `Map<id, Entity>` per-operation when needed |
| Package index exports only | No deep imports across package boundaries |
| Robots use procedural animation | Bob-and-weave Wall-E style in code, NOT Blender rigging |
| No faction tint on models | Models render with original textures, faction shown via ground disc |

---

## Session Protocol

Every agent session must:
1. Read [CHANGELOG.md](CHANGELOG.md) — current project status
2. Read [README.md](README.md) — active context and quick start
3. Check this file — package structure rules above
4. Run `pnpm test:vitest` — verify all tests pass before starting
5. **Never** read or reference anything in `pending/`

---

## Koota Patterns (from official examples)

Follow the patterns from [koota examples](https://github.com/pmndrs/koota/tree/main/examples):

- **Traits** — defined in `src/traits/`, one file per domain, all re-exported via `index.ts`
- **Systems** — one system per file in `src/systems/`, pure functions accepting `(world: World)`
- **Actions** — imperative world mutations (spawn, destroy, modify) in dedicated files
- **Sim/View split** — `traits/` + `systems/` never import `views/`; rendering adapters live under **`src/views/`** only (`title/` = R3F, `board/` = Phaser). Legacy **`src/view/`** is deleted — content migrated to `src/views/title/`.

---

## Common Commands

```bash
pnpm dev                 # Vite dev server (http://localhost:5173)
pnpm build               # Production build
pnpm test:vitest         # Run all Vitest suites
pnpm tsc                 # TypeScript check
pnpm lint                # Biome lint + format check
pnpm verify              # lint + tsc + test (all gates)
```

---

## Validation (before any commit)

```
pnpm verify — required gates (matches core CI checks: lint + tsc + Vitest)
  Biome lint: 0 errors
  TypeScript: 0 errors
  Vitest (node): 130 test files, 2282 tests, all passing

pnpm verify:with-ct — optional; browser CT may still need preview path updates.
  CI runs test:ct with continue-on-error: true.
```
Playwright runs **headed** (`headless: false`); in CI, `xvfb-run -a` provides a virtual display.

## Agent Roles

### Registered Agents (`.claude/agents/`)

| Agent | Scope | Key Domains |
|-------|-------|-------------|
| **systems-engineer** | ECS systems, game loop, Koota traits | `src/systems/`, `src/ecs/` |
| **ai-engineer** | AI behavior, GOAP, steering, pathfinding | `src/ai/`, `src/systems/governor*` |
| **frontend-designer** | UI panels, HUD, modals, mobile layout | `src/ui/`, `src/input/` |
| **rendering-engineer** | R3F title scene, Phaser board, materials, shaders | `src/views/title/`, `src/views/board/` |
| **audio-engineer** | Spatial audio, SFX, adaptive music | `src/audio/` |
| **config-docs** | Config files, documentation, CI | `docs/`, `config/`, `.github/` |

### Merge Order (Multi-Agent)

When agents work in parallel on isolated worktrees:

1. **systems-engineer** first — foundational ECS changes
2. **ai-engineer** second — depends on ECS types
3. **rendering-engineer** third — depends on ECS + world state
4. **frontend-designer** fourth — depends on system APIs
5. **audio-engineer** fifth — depends on event system
6. **config-docs** last — documents what changed

### Worktree Protocol

All parallel agent work uses git worktrees:
1. Create worktree per agent: `.claude/worktrees/<agent>-<ticket>`
2. Each agent works exclusively in its worktree
3. Merge back one at a time to primary branch
4. Never run two agents on same worktree

## Key System Files

| System | File | Purpose |
|--------|------|---------|
| Turn system | `src/systems/turnSystem.ts` | `advanceTurn` — combat, AI, moves, environment phase, AP refresh, epoch hooks, victory check |
| Resources | `src/systems/resourceSystem.ts` | Material pools, add/spend |
| Harvest | `src/systems/harvestSystem.ts` | Structure → materials pipeline |
| Building placement | `src/systems/buildingPlacement.ts` | Starter placement, adjacency |
| Combat | `src/systems/attackSystem.ts` | Attack resolution |
| Research | `src/systems/researchSystem.ts` | Tech queue, effects |
| Diplomacy | `src/systems/diplomacySystem.ts` | Standing, trade, alliances |
| Victory | `src/systems/victorySystem.ts` | Win / lose / draw conditions |
| Exploration | `src/systems/fogRevealSystem.ts` | Fog of war reveal |
| World Gen | `src/board/generator.ts` | Procedural overworld board from seed |
| Building Upgrade | `src/systems/buildingUpgradeSystem.ts` | Per-building tier upgrade jobs |
| Analysis System | `src/systems/analysisSystem.ts` | Analysis node acceleration for upgrades |
| Score System | `src/systems/scoreSystem.ts` | Weighted faction score (e.g. turn-cap victory) |
| Balance Harness | `src/balance/index.ts` | Simulated runs, aggregation, balance diagnostics |
| Config Registry | `src/config/registry.ts` | Unified typed config API + test overrides |
| Board terrain | `src/views/title/renderers/BoardRenderer.tsx` | Height + biome sphere mesh |
| Game HUD | `src/ui/game/HUD.tsx` | Top bar, resources, turn |
| App Entry (Vite) | `src/main.tsx` → `src/app/App.tsx` | React root, session lifecycle, game shell |
| App Entry (legacy Expo) | `pending/App.tsx` | Quarantined legacy RN path — do not use |

## Documentation Structure

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) | Package structure, architecture rules, session protocol |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, rendering, ECS, AI, testing |
| [DESIGN.md](DESIGN.md) | Game design bible — vision, lore, factions, economy |
| [CHANGELOG.md](CHANGELOG.md) | Project status and history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, workflow, code rules |
| [README.md](README.md) | Quick start and active context |
| [references/](references/) | Archived docs, POC files, design references |

## Cursor Cloud specific instructions

### Services

Syntheteria is fully client-side — **no external backend, database, or Docker services are needed**. The only process to run is the Vite dev server (`pnpm dev`, port 5173). Capacitor SQLite and sql.js operate entirely in-browser.

### Running checks

All validation commands are documented in the Validation table above. Quick reference:

- **Lint**: `pnpm lint` (Biome)
- **Type check**: `pnpm tsc`
- **Unit tests**: `pnpm test` / `pnpm test:vitest` (Vitest — 130 test files / 2282 tests)
- **Vitest**: same as above; entrypoint is `vitest run` via `package.json`
- **Playwright CT**: `xvfb-run -a pnpm test:ct` (headed; requires `xvfb-run` in headless VMs). Many CT tests fail in Cloud VMs because the R3F 3D scenes require GPU/WebGL capabilities not available in software-rendered environments.
- **Full local gate**: `pnpm verify` (lint + tsc + Vitest). CI also runs `check-imports` and `pnpm build`; component tests are a separate job (`test:ct`, continue-on-error).

### Gotchas

- `pnpm install` may warn about ignored build scripts for `better-sqlite3` and `sharp`. These do not block `pnpm dev`, `pnpm build`, Jest, or Vitest. They may affect `drizzle-kit` or Playwright screenshot comparison respectively.
- Playwright tests run **headed** (`headless: false` in config). Always wrap with `xvfb-run -a` in headless Cloud VMs.
- After clicking "New Game" in the browser, the game requires 3D model assets (`.glb` files in `public/assets/`) and WebGL. If the environment lacks GPU support or models are missing, the game scene will crash on asset load (intentional fail-hard behavior per architecture rules).
