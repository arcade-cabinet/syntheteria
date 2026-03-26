# Syntheteria

A 2.5D top-down RTS about an AI awakening in a dead ecumenopolis. You repair broken machines, explore fragmented ruins, and push north to defeat the Cult of EL.

## Tech Stack

- **Engine:** BabylonJS 8.x (WebGPU) + Reactylon 3.x (React declarative binding)
- **ECS:** Koota 0.6.x (traits, queries, systems)
- **AI:** Yuka 0.7.x (GOAP, NavGraph, Vehicle)
- **Build:** Webpack 5 (requires babel-plugin-reactylon)
- **Platform:** Web-first (mobile via Capacitor)
- **Persistence:** sql.js (ASM build)
- **Testing:** Vitest (unit) + Playwright (E2E)

## Running

```bash
pnpm install
pnpm dev          # Dev server — localhost:8080
pnpm build        # Production build
pnpm tsc          # Type check
pnpm test         # Unit tests
pnpm lint         # Biome lint
```

## Controls

**Desktop:**
- `WASD` / Arrow keys — Pan camera
- Scroll wheel — Zoom in/out
- Left-click — Select unit / click ground to move
- Right-click — Move selected unit
- `Escape` — Cancel building placement

**Mobile:**
- Single tap — Select unit / tap ground to move
- Two-finger drag — Pan camera
- Pinch — Zoom in/out

## Architecture

The game uses chunk-based infinite world generation with 32x32 tile chunks, BabylonJS imperative mesh creation (not per-tile React JSX), and Yuka NavGraph pathfinding. Game data lives in TypeScript const objects under `src/config/`.

For full architecture details, see [CLAUDE.md](./CLAUDE.md) and [docs/HANDOFF.md](./docs/HANDOFF.md).

## License

All rights reserved. This is a proprietary project.
