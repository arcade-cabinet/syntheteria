# Syntheteria

A 2.5D top-down RTS about an AI awakening in a dead ecumenopolis. You repair broken machines, explore fragmented ruins, and push north to defeat the Cult of EL.

## Tech Stack

- **Engine:** BabylonJS 8.x (WebGPU) + Reactylon 3.x
- **ECS:** Koota 0.6.x
- **AI:** Yuka 0.7.x (GOAP, NavGraph)
- **Build:** Vite 8 + babel-plugin-reactylon
- **UI:** React 19 + shadcn/ui + Tailwind 3
- **Persistence:** @capacitor-community/sqlite + sql.js
- **Audio:** Tone.js
- **Testing:** Vitest (unit + browser, zero mocks)
- **Mobile:** Capacitor

## Running

```bash
pnpm install
pnpm dev          # Vite dev server — localhost:8080
pnpm build        # Production build
pnpm tsc          # Type check
pnpm test         # Unit tests
pnpm test:browser # Browser component tests (headed Chrome)
pnpm lint         # Biome lint
```

## Controls

- **Left-click unit** — Select
- **Left-click ground** — Move selected unit
- **Left-click enemy** — Attack
- **Drag** — Box selection
- **Scroll** — Zoom
- **Right-drag** — Pan camera

All actions are mouse-first. Mobile: tap, two-finger pan, pinch zoom.

## Architecture

Chunk-based infinite world (32×32 tiles), BabylonJS imperative mesh creation, WGSL custom shaders (WebGPU native), Yuka NavGraph pathfinding. Game data in TypeScript const objects under `src/config/`.

See [CLAUDE.md](./CLAUDE.md) and [AGENTS.md](./AGENTS.md) for details.

## License

All rights reserved. This is a proprietary project.
