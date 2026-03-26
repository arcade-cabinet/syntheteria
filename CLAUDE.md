# Syntheteria - Development Context

2.5D top-down RTS about an AI awakening in a dead ecumenopolis. BabylonJS + Reactylon game canvas, R3F landing page globe, Koota ECS, Yuka AI.

> **Agents: read [AGENTS.md](./AGENTS.md) first.** It has rules, constraints, known issues, and source structure.
> **Deep architecture: read [docs/HANDOFF.md](./docs/HANDOFF.md).** Chunk system, rendering, ECS, navigation, zones.

---

## Running

```bash
pnpm dev          # Webpack dev server — localhost:8080
pnpm tsc          # Type check
pnpm test         # Unit tests (vitest)
pnpm test:browser # Browser component tests (vitest + headed Chrome)
pnpm test:e2e     # E2E tests (playwright)
pnpm build        # Production build
pnpm lint         # Biome lint
```

---

## Docs

**Active (read these):**
- `AGENTS.md` — agentic rules, constraints, key files, source structure
- `docs/HANDOFF.md` — deep architecture reference
- `docs/design/` — game design (overview, mechanics, combat, consciousness, drones)
- `docs/story/LORE_OVERVIEW.md` — world lore
- `docs/technical/CORE_FORMULAS.md` — math formulas
- `docs/superpowers/reports/` — session reports

**Archived:** `docs/archive/` — 22 pre-pivot docs. Do not read unless asked.

---

## Resources

- [BabylonJS](https://www.babylonjs.com/) — 3D engine
- [Reactylon](https://www.reactylon.com/docs) — React binding for BabylonJS
- [Koota](https://github.com/pmndrs/koota) — ECS for TypeScript
- [Yuka](https://github.com/Mugen87/yuka) — Game AI (GOAP, NavGraph)
