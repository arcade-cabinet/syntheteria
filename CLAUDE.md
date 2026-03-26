# Syntheteria - Development Context

2.5D top-down RTS about an AI awakening in a dead ecumenopolis. BabylonJS + Reactylon game canvas, Koota ECS, Yuka AI.

> **Agents: read [AGENTS.md](./AGENTS.md) first.** Rules, constraints, known issues, source structure.

---

## Running

```bash
pnpm dev          # Vite dev server — localhost:8080
pnpm tsc          # Type check
pnpm test         # Unit tests (vitest)
pnpm test:browser # Browser component tests (vitest + headed Chrome)
pnpm test:e2e     # E2E tests (playwright)
pnpm build        # Production build (vite)
pnpm lint         # Biome lint
```

---

## Docs

**Active:**
- `AGENTS.md` — agentic rules, constraints, key files, source structure
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — status + architecture reference
- `docs/superpowers/plans/2026-03-27-test-plan.md` — test plan
- `docs/design/` — game design (overview, mechanics, combat, consciousness, drones)
- `docs/story/LORE_OVERVIEW.md` — world lore
- `docs/technical/CORE_FORMULAS.md` — math formulas

**Archived:** `docs/archive/` — pre-pivot docs. Do not read unless asked.

---

## Resources

- [BabylonJS](https://www.babylonjs.com/) — 3D engine
- [Reactylon](https://www.reactylon.com/docs) — React binding for BabylonJS
- [Koota](https://github.com/pmndrs/koota) — ECS for TypeScript
- [Yuka](https://github.com/Mugen87/yuka) — Game AI (GOAP, NavGraph)
