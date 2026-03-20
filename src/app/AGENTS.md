# app/

App shell — session lifecycle (new/load/save), debug bridge, and HUD data readers.

## Rules
- **Session functions are async** — `createNewGame`, `loadGame`, `saveGame` return promises
- **Debug bridge is dev-only** — `installDebugBridge()` exposes internals on `window`
- **HUD data readers are pure** — read ECS state, return plain objects for React
- **No React components** — app/ is logic only, UI lives in `ui/`

## Public API
- `createNewGame(config)` — create a new game session
- `loadGame(gameId)` — load a saved game
- `saveGame(session)` — persist current game to SQLite
- `installDebugBridge(ctx)` — attach debug tools to window (dev mode)
- `readPlayerAp(world)` — current player action points
- `getProductionQueue(world)` — fabrication queue for HUD
- `getCurrentResearchForHUD(world)` — active research for HUD
- `Phase` — app phase type (`title | setup | generating | playing`)
- `GameSession` — runtime session interface

## Files
| File | Purpose |
|------|---------|
| session.ts | New game, load, save lifecycle |
| debug.ts | Debug bridge for dev console |
| hudData.ts | HUD data reader functions |
| types.ts | Phase, GameSession types |
