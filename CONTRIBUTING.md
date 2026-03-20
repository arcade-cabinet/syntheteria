# Contributing to Syntheteria

## Setup

```bash
pnpm install
pnpm dev        # Vite dev server (localhost:5173)
```

## Validation

Always run before committing:

```bash
pnpm verify       # lint + tsc + vitest — required CI gate
```

Individual checks:

```bash
pnpm lint         # Biome lint + format
pnpm tsc          # TypeScript type check
pnpm test:vitest  # Vitest unit tests
pnpm check-imports # Architectural boundary gates
```

## Git Workflow

- Feature branches off `main`
- Squash merge PRs
- Never force-push `main`
- Run `pnpm verify` before push

## Code Rules

- **Package index imports only** — no deep cross-package paths
- **Systems accept `world: World` param** — no singletons
- **Config is data, not code** — all tunables in `src/config/`
- **No magic numbers** — everything in config files
- **Logic in `.ts`, presentation in `.tsx`** — never mix
- **Files < 500 LOC** (300 preferred) — split oversized files
- **Tests colocated** in `__tests__/` inside owning package

## Package Structure

Every `src/` directory is a self-contained package:

1. Must have `index.ts` — exports only the public API
2. Must have `__tests__/` — colocated tests
3. Consumers import from the package, never from internal files

See [AGENTS.md](AGENTS.md) for the full package map and rules.

## Testing

- `pnpm test:vitest` — unit and integration tests (130 files, 2282 tests)
- `pnpm check-imports` — architectural rules enforcement
- Balance harness: `vitest run src/balance/__tests__/balanceHarness.vitest.ts`
- Playwright CT: `xvfb-run -a pnpm test:ct` (optional, needs display server)

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical reference.

## Game design

Canonical setting, epochs, POI model, and onboarding live in [DESIGN.md](DESIGN.md) — **near-future Earth**, eight biomes, human→cult antagonist arc, holocrons, organic tooltips.
