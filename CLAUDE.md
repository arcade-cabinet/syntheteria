# Syntheteria — Claude Code Contract

> **MANDATORY**: Before doing ANY work, read `AGENTS.md` (root), then follow the session
> protocol in `docs/memory-bank/AGENTS.md`. This ensures you have current project context.

## Session Start Checklist

1. Read `AGENTS.md` — multi-agent orchestration, architecture rules, hard bans
2. Read `docs/memory-bank/AGENTS.md` — session protocol
3. Read `docs/memory-bank/activeContext.md` — current focus, recent changes, next steps
4. Read `docs/memory-bank/progress.md` — system status dashboard
5. Read `docs/AGENTS.md` — find domain docs relevant to your task
6. Confirm: "I have read the memory bank and understand current project state."

## Claude-Specific Behavior

### .claude/ Directory

```
.claude/
├── settings.json          # PostToolUse hook for typecheck on Edit/Write
├── agents/                # 6 specialized agent definitions
├── commands/              # Slash commands
└── hooks/                 # Pre-commit quality gates
```

### Progress Communication

Claude communicates progress through repository state:

1. **Update `docs/memory-bank/activeContext.md`** after significant work
2. **Update `docs/memory-bank/progress.md`** if system status changed
3. **Update relevant domain doc** if design/architecture changed
4. Never leave stale context — if you changed something, update the docs

### Testing Ownership

If Claude changes a visible flow, it must:
1. Update or add component-level test coverage for the touched surface
2. Add E2E coverage if the change affects a multi-step player flow
3. Not leave stale tests that describe old UI

Test roots:
- Component tests: `tests/components/`
- Browser E2E: `tests/e2e/`
- System tests: `src/systems/__tests__/`

### Brand Assets In Repo

Use these — don't invent replacements:
- Title background: `assets/ui/background.png`
- Title buttons: `assets/ui/buttons/{new_game,load_game,settings}.png`
- Mark: `assets/ui/mark.png`

### UI Source Map

Key player-visible files:
- Title: `src/ui/TitleScreen.tsx`, `NewGameModal.tsx`, `LoadingOverlay.tsx`
- HUD: `src/ui/GameUI.tsx`, `panels/GameHUD.tsx`, `panels/TopBar.tsx`
- Radial: `src/ui/RadialMenu.tsx`, `src/systems/radialMenu.ts`, `src/systems/radialProviders.ts`
- City: `src/ui/CitySiteOverlay.tsx`, `src/city/runtime/CityKitLab.tsx`
- Shared: `src/ui/components/HudButton.tsx`, `HudPanel.tsx`, `icons.tsx`

### What Claude Should Prefer

- Real UI flows over mockups
- Component-tested surfaces over screenshots alone
- Config-driven assets over hardcoded imports
- Hard crashes on missing assets over silent fallbacks
- Emergent bot speech over scripted story blocks
- One source of truth per data domain

### What Claude Should Avoid

- Generic sci-fi panel kits that ignore brand identity
- Placeholder copy or stub affordances where real state exists
- Silent fallbacks that hide bugs
- Changing visual direction without updating docs
- Duplicating data stores (the floor renderer dual-store bug is the canonical example)
- Adding `?? null`, `|| fallback`, or empty `catch` blocks in asset loading

## Documentation Pointers

All game design, architecture, and interface docs are in `docs/` organized by domain.
See `docs/AGENTS.md` for the complete index with summaries.

| Domain | Location | What's There |
|--------|----------|-------------|
| Memory bank | `docs/memory-bank/` | Session context, status, patterns |
| Game design | `docs/design/` | Vision, lore, factions, economy, bots |
| Technical | `docs/technical/` | Architecture, world, AI, assets, rendering |
| Interface | `docs/interface/` | UI design, input model |
| Execution | `docs/plans/GAMEPLAN_1_0.md` | 6-phase roadmap |
| Archive | `docs/archive/` | Old plans (reference only) |
