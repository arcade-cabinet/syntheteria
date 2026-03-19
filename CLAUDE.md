# Syntheteria — Claude Code Contract

> **MANDATORY**: Before doing ANY work, read `AGENTS.md` (root) for package structure rules.

## Session Start Checklist

1. Read `AGENTS.md` — package structure, architecture rules, hard bans
2. Read `docs/memory-bank/activeContext.md` — current focus, recent changes, next steps
3. Read `docs/memory-bank/progress.md` — system status dashboard
4. Confirm: "I have read the memory bank and understand current project state."

## Package Structure Standards (ENFORCED)

These are NOT suggestions. Every file must follow them.

### Import Rules

```typescript
// CORRECT — import from package index
import { Building, Powered } from "../traits";
import { advanceTurn } from "../systems";
import { generateBoard } from "../board";

// WRONG — deep import into package internals
import { Building } from "../traits/building";
import { advanceTurn } from "../systems/turnSystem";
import { generateBoard } from "../board/generator";
```

### File Organization

| Concern | File type | Location |
|---------|-----------|----------|
| Game logic | `.ts` | `src/systems/`, domain packages |
| Trait definitions | `.ts` | `src/traits/` |
| React components | `.tsx` | `src/ui/`, `src/app/` |
| Shaders | `.glsl` | `src/terrain/glsl/`, `src/rendering/glsl/` |
| Config/data | `.ts` | `src/config/` |
| Tests | `.vitest.ts` | `__tests__/` inside owning package |

### Every Package Must Have

1. `index.ts` — public API exports only
2. `__tests__/` — colocated tests
3. Clear single responsibility
4. < 500 LOC per file (300 preferred)

## Claude-Specific Behavior

### Progress Communication

1. **Update `docs/memory-bank/activeContext.md`** after significant work
2. **Update `docs/memory-bank/progress.md`** if system status changed
3. Never leave stale context — if you changed something, update the docs

### Testing Ownership

If Claude changes a visible flow, it must:
1. Update or add Vitest coverage for the touched system
2. Tests live in `__tests__/` inside the package that owns the code

Test commands:
- `pnpm test:vitest` — all Vitest suites
- `pnpm test:ct` — Playwright component tests
- `pnpm test:e2e` — Playwright E2E
- `pnpm verify` — lint + tsc + test (all gates)

### What Claude Should Prefer

- Package index imports over deep file imports
- Pure TS logic over TSX for non-visual code
- `src/config/` tunables over hardcoded values
- Systems that accept `world: World` param
- One source of truth per data domain
- Procedural animation (Wall-E bob-and-weave) over Blender rigging
- CivRev2-style DOM labels over in-canvas text
- Isometric perspective camera over sphere orbit

### What Claude Should Avoid

- Deep imports across package boundaries
- TSX files outside `src/ui/` and `src/app/`
- Files over 500 LOC without splitting
- Referencing anything in `pending/`
- Using `world.entity(id)` — Koota has no such API
- Silent fallbacks that hide bugs
- Faction tint on robot models (models render with original textures)

## Documentation

| Domain | Location |
|--------|----------|
| Package structure, architecture rules | `AGENTS.md` |
| Game design, lore, factions, economy | `docs/GAME_DESIGN.md` |
| Tech stack, packages, tests | `docs/ARCHITECTURE.md` |
| AI systems | `docs/AI_DESIGN.md` |
| Current focus and session state | `docs/memory-bank/activeContext.md` |
| System status dashboard | `docs/memory-bank/progress.md` |
