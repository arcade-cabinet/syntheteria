# Syntheteria — Claude Code Contract

> **MANDATORY**: Before doing ANY work, read `AGENTS.md` (root), then follow the session
> protocol in `docs/memory-bank/AGENTS.md`. This ensures you have current project context.

## Session Start Checklist

1. Read `AGENTS.md` — multi-agent orchestration, architecture rules, hard bans
2. Read `docs/memory-bank/AGENTS.md` — session protocol
3. Read `docs/memory-bank/activeContext.md` — current focus, recent changes, next steps
4. Read `docs/memory-bank/progress.md` — system status dashboard
5. Confirm: "I have read the memory bank and understand current project state."

## Claude-Specific Behavior

### .claude/ Directory

```
.claude/
├── settings.json          # PostToolUse hook for typecheck on Edit/Write
├── agents/                # 6 specialized agent definitions
└── commands/              # Slash commands
```

### Progress Communication

1. **Update `docs/memory-bank/activeContext.md`** after significant work
2. **Update `docs/memory-bank/progress.md`** if system status changed
3. **Update relevant domain doc** if design/architecture changed
4. Never leave stale context — if you changed something, update the docs

### Testing Ownership

If Claude changes a visible flow, it must:
1. Update or add Vitest coverage for the touched system
2. Not leave stale tests that describe old UI

Test roots (all Vitest — no Jest in this project):
- Unit/system: `src/**/__tests__/*.vitest.{ts,tsx}` — `pnpm test:vitest`
- UI component: `src/ui/__tests__/*.vitest.tsx` — `pnpm test:vitest`
- Playwright CT (browser): `tests/components/*.browser.test.tsx` — `pnpm test:ct`
- Playwright E2E: `tests/e2e/*.spec.ts` — `pnpm test:e2e`
- Full gate: `pnpm verify` (lint + tsc + test:vitest + test:ct)

### UI Source Map (ground-up rewrite)

Key player-visible files:
- Globe (ONE Canvas): `src/ui/Globe.tsx` — persistent across all phases
- Title/Landing: `src/ui/landing/LandingScreen.tsx`, `NewGameModal.tsx`
- Game HUD: `src/ui/game/HUD.tsx`, `src/ui/game/RadialMenu.tsx`, `src/ui/game/GarageModal.tsx`
- Overlays: `src/ui/game/TechTreeOverlay.tsx`, `DiplomacyOverlay.tsx`, `UnitRosterOverlay.tsx`
- Input: `src/input/BoardInput.tsx`
- Camera: `src/camera/SphereOrbitCamera.tsx`, `src/camera/IsometricCamera.tsx`
- Renderers: `src/rendering/BoardRenderer.tsx`, `HighlightRenderer.tsx`, `UnitRenderer.tsx`
- Sphere: `src/rendering/boardGeometry.ts`, `src/rendering/spherePlacement.ts`
- Globe title: `src/rendering/globe/` (GlobeWithCities, Hypercane, StormClouds, Lightning)

### What Claude Should Prefer

- Real UI flows over mockups
- `gameDefaults.ts` tunables over hardcoded values
- TypeScript `const` objects over JSON configs
- ECS traits over module-level state
- Systems that accept `world` param over world singleton import
- One source of truth per data domain

### What Claude Should Avoid

- Referencing anything in `pending/` except as read-only reference
- Adding magic numbers to systems or renderers
- Using `world.entity(id)` — Koota has no such API
- Silent fallbacks that hide bugs
- Infinite grid / chunk streaming architecture — we use fixed board
- Sectors, cities, or modal city screens — base building is on the world map

## Documentation

| Domain | Location |
|--------|----------|
| Game design, lore, factions, bots, economy, UI | `docs/GAME_DESIGN.md` |
| Tech stack, packages, ECS patterns, tests | `docs/ARCHITECTURE.md` |
| What to build next, porting from `pending/` | `docs/ROADMAP.md` |
| Current focus and session state | `docs/memory-bank/activeContext.md` |
| System status dashboard | `docs/memory-bank/progress.md` |
