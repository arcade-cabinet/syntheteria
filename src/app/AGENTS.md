# app/

Application shell — session lifecycle, debug bridge, HUD data, and the root React component.

## Rules
- **Thin orchestration** — app/ composes packages, it doesn't implement game logic
- **Import from package indexes** — `from "../traits"` not `from "../traits/building"`
- **No ECS queries in React components** — use hudData.ts functions instead
- **Session operations are async** — create/save/load return Promises

## Public API
- `createNewGame(config, repo)` → `GameSession`
- `loadGame(gameId, repo)` → `GameSession | null`
- `saveGame(session, repo)` → void
- `installDebugBridge(ctx)` → void (Playwright E2E)
- `readPlayerAp(world)` → number
- `getProductionQueue(world)` → `ProductionQueueItem[]`
- `getCurrentResearchForHUD(world)` → `CurrentResearch | null`

## Files
| File | Purpose |
|------|---------|
| types.ts | GameSession, Phase types |
| session.ts | create/save/load game (pure async, no React) |
| debug.ts | Playwright debug bridge (window.__syntheteria) |
| hudData.ts | Read-only ECS queries for HUD display |
| App.tsx | Root React component (thin shell) — TODO |
