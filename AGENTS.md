# Syntheteria — Multi-Agent Orchestration

> **Session start**: Read this file, then `docs/memory-bank/activeContext.md`.
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
├── board/              # Labyrinth generator, tile grid, adjacency
├── buildings/          # Building definitions + cult structures
├── factions/           # Faction definitions, init, relations
├── robots/             # Archetypes, placement, specializations
├── terrain/            # Floor types, elevation, GLSL shaders
├── resources/          # Salvage type definitions
├── narrative/          # Speech profiles
├── config/             # 11 game data files (tunables, tech tree, recipes, etc.)
├── audio/              # Tone.js SFX + ambience
├── camera/             # Camera controllers
├── db/                 # SQLite schema + GameRepo
├── rendering/          # Pure TS: geometry, placement, materials, model paths (no TSX)
├── view/               # R3F renderer components: renderers/, effects/, overlays/, globe/
├── ui/                 # React DOM components: Globe, landing/, game/ overlays
├── input/              # Board interaction (click, drag, select)
├── world/              # Config wiring
├── lib/                # Shared utilities
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
1. Read `docs/memory-bank/activeContext.md` — current focus and state
2. Read `docs/memory-bank/progress.md` — what works and what doesn't
3. Check this file — package structure rules above
4. Run `pnpm test:vitest` — verify all tests pass before starting
5. **Never** read or reference anything in `pending/`

---

## Koota Patterns (from official examples)

Follow the patterns from [koota examples](https://github.com/pmndrs/koota/tree/main/examples):

- **Traits** — defined in `src/traits/`, one file per domain, all re-exported via `index.ts`
- **Systems** — one system per file in `src/systems/`, pure functions accepting `(world: World)`
- **Actions** — imperative world mutations (spawn, destroy, modify) in dedicated files
- **Sim/View split** — simulation (traits/systems) is completely decoupled from rendering (view)

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
pnpm verify — all gates must pass
  Biome lint: 0 errors
  TypeScript: 0 errors
  Vitest: 143 suites, 2440 tests passing
```
