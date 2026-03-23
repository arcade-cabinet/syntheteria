# Syntheteria — Multi-Agent Orchestration

> **Session start**: Read this file, then follow the protocol in `docs/memory-bank/AGENTS.md`.

**Vite/Capacitor migration (Phases 1–8 done):** Primary build is **Vite** (`pnpm dev`, `pnpm build`). Entry: `src/main.tsx` → **Capacitor SQLite** (init + schema) → **session DB** (sql.js in-memory) → `AppVite.tsx` (R3F scene + DOM UI). **Capacitor** wraps the same build (`pnpm cap:sync`, `pnpm cap:ios`/`cap:android`). R3F-only; Filament and scene snapshot removed. Persistence: Capacitor SQLite (web IndexedDB, native SQLite); session: sql.js. **Expo/RN** deps remain for legacy Jest; new features target the Vite path. Plan: [docs/plans/EXPO_TO_CAPACITOR_MIGRATION.md](docs/plans/EXPO_TO_CAPACITOR_MIGRATION.md).

## Repository Layout

```
syntheteria/
├── CLAUDE.md              # Claude Code behavior contract (Claude-specific)
├── AGENTS.md              # THIS FILE — multi-agent orchestration
├── src/                   # Expo application source
│   ├── ecs/               # Koota ECS traits, game loop
│   ├── systems/           # Game systems (pure logic, no TSX)
│   ├── ai/                # AI: GOAP governors, Yuka steering, agents
│   ├── rendering/         # R3F renderer components (39 total)
│   ├── ui/                # React Native UI panels + HUD
│   ├── world/             # World generation, spatial model, session
│   ├── city/              # City config, runtime, kit lab
│   ├── bots/              # Bot definitions, progression
│   ├── config/            # Runtime config loaders + JSON
│   ├── db/                # Capacitor SQLite + sql.js session; Drizzle schema
│   ├── audio/             # Tone.js spatial audio
│   ├── input/             # Input manager + providers
│   └── pathfinding/       # A* + NavMesh
├── docs/                  # All documentation
│   ├── AGENTS.md          # Documentation index (which doc to read)
│   ├── memory-bank/       # Session context (Cline-style memory bank)
│   ├── design/            # Game design docs (6 files)
│   ├── technical/         # Architecture & implementation (5 files)
│   ├── interface/         # UI & interaction (2 files)
│   ├── plans/             # Execution roadmap (GAMEPLAN_1_0.md)
│   └── archive/           # Completed/obsolete docs
├── assets/                # UI images, models, textures
├── config/                # Build config (metro, babel, tsconfig)
└── tests/                 # Playwright CT (tests/components/), E2E (tests/e2e/)
```

## Session Protocol

1. **Read `docs/memory-bank/AGENTS.md`** — mandatory session start/end protocol
2. **Read `docs/memory-bank/activeContext.md`** — current focus and next steps
3. **Read `docs/memory-bank/progress.md`** — what works, what's broken
4. **Read `docs/AGENTS.md`** — find domain docs relevant to your task
5. **Read relevant domain docs** — use `head -15` on frontmatter to decide

## Core Directives

### Architecture Rules

| Rule | Detail |
|------|--------|
| **Koota owns game state** | ECS traits + systems. TSX reads, never writes. |
| **Systems own logic** | Pure functions in `src/systems/`. No logic in TSX. |
| **Config over code** | All tuning in JSON config files. Never hardcode constants. |
| **Crash on missing assets** | `throw new Error()` — NEVER fallback, NEVER return null. |
| **One source of truth** | Each data domain has exactly ONE authoritative store. |
| **Test before integrate** | Jest tests required before wiring into game loop. |
| **Assets** | Canonical: **`public/assets/`**. Root `assets` is a symlink to `public/assets`. Vite serves at `/assets/...`. Legacy Expo: `resolveAssetUri()`. |

### Hard Bans

| Banned | Use Instead |
|--------|-------------|
| (Vite/Vitest now used for primary build; Jest retained for existing tests) | — |
| Miniplex | Koota |
| Raw Web Audio | Tone.js |
| Raw CSS | NativeWind v4 |
| Math.random() | gameplayRandom / scopedRNG |
| `export default` | Named exports only |
| npm / yarn | pnpm |
| ESLint / Prettier | Biome |

### Validation

```bash
pnpm verify        # Full CI: lint + tsc + test + test:ct
pnpm lint          # Biome check
pnpm lint:fix      # Biome autofix
pnpm tsc           # TypeScript check (tsc --noEmit)
pnpm dev           # Vite dev server (primary)
pnpm build         # Vite build
pnpm test          # Jest (unit + component)
pnpm test:ct       # Playwright component tests (headed; tests/components/)
pnpm test:e2e      # Playwright E2E (headed; tests/e2e/; CI uses xvfb-run)
pnpm test:vitest   # Vitest (*.vitest.ts)
```

Playwright runs **headed** (`headless: false`); in CI, `xvfb-run -a` provides a virtual display. Done checklist: [docs/plans/IS_THE_GAME_DONE.md](docs/plans/IS_THE_GAME_DONE.md).

## Agent Roles

### Registered Agents (`.claude/agents/`)

| Agent | Scope | Key Domains |
|-------|-------|-------------|
| **systems-engineer** | ECS systems, game loop, Koota traits | `src/systems/`, `src/ecs/` |
| **ai-engineer** | AI behavior, GOAP, steering, pathfinding | `src/ai/`, `src/systems/governor*` |
| **frontend-designer** | UI panels, HUD, modals, mobile layout | `src/ui/`, `src/input/` |
| **rendering-engineer** | R3F renderers, materials, shaders | `src/rendering/` |
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
| Game Loop | `src/ecs/gameState.ts` | 60fps tick, 21 systems, 8 phases |
| Turn System | `src/systems/turnSystem.ts` | AP/MP per unit, turn phases |
| Resources | `src/systems/resources.ts` | 11 material types, add/spend |
| Harvest | `src/systems/harvestSystem.ts` | Structure → materials pipeline |
| Building | `src/systems/buildingPlacement.ts` | 7 building types, adjacency |
| Combat | `src/systems/combat.ts` | Component damage, formations |
| Tech Tree | `src/systems/techTree.ts` | Research DAG, effects |
| Diplomacy | `src/systems/diplomacy.ts` | Standing, trade, alliances |
| Victory | `src/systems/victoryConditions.ts` | 3 win paths |
| Exploration | `src/systems/exploration.ts` | Fog of war, vision radius |
| World Gen | `src/world/generation.ts` | Procedural ecumenopolis |
| Radial Menu | `src/systems/radialMenu.ts` | Context menu state |
| Floor Render | `src/rendering/StructuralFloorRenderer.tsx` | PBR textured floors |
| Game HUD | `src/ui/panels/GameHUD.tsx` (RN), `src/ui/dom/GameHUDDom.tsx` (Vite) | Top bar, resources, turn |
| App Entry (Vite) | `src/main.tsx` → `AppVite.tsx` | Capacitor SQLite + session DB, R3F scene, DOM HUD |
| App Entry (Expo) | `App.tsx` | Legacy Expo/RN path; 39 renderers |

## Documentation Structure

All docs live under `docs/`. See [docs/AGENTS.md](docs/AGENTS.md) for the full index.

| Layer | Purpose | Files |
|-------|---------|-------|
| **Memory Bank** | Session bootstrap — read first | 7 files in `docs/memory-bank/` |
| **Design** | What the game IS | 6 files in `docs/design/` |
| **Technical** | How it's built | 5 files in `docs/technical/` |
| **Interface** | Player-facing surfaces | 2 files in `docs/interface/` |
| **Execution** | Roadmap | `docs/plans/GAMEPLAN_1_0.md` |
