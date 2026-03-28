# Syntheteria - Development Context

2.5D top-down RTS about an AI awakening in a dead ecumenopolis. BabylonJS 8 (WebGPU) + Reactylon 3 for all rendering, Koota ECS, Yuka AI.

> **Agents: read [AGENTS.md](./AGENTS.md) first.** Rules, constraints, known issues, source structure.

---

## Running

```bash
pnpm dev          # Vite dev server — localhost:8080
pnpm tsc          # Type check
pnpm test         # Unit tests (vitest)
pnpm test:browser # Browser component tests (vitest + headed Chrome)
pnpm build        # Production build (vite)
pnpm lint         # Biome lint
```

---

## Docs

**Active:**
- `AGENTS.md` — agentic rules, constraints, key files, source structure
- `docs/superpowers/reports/2026-03-26-babylonjs-refactor-report.md` — status + architecture
- `docs/superpowers/plans/2026-03-27-test-plan.md` — test plan
- `docs/design/` — game design (overview, mechanics, combat, consciousness, drones)
- `docs/story/LORE_OVERVIEW.md` — world lore
- `docs/technical/CORE_FORMULAS.md` — math formulas
---

## Resources

- [BabylonJS](https://www.babylonjs.com/) — 3D engine (WebGPU)
- [Reactylon](https://www.reactylon.com/docs) — React binding for BabylonJS
- [BabylonJS WGSL Shaders](https://doc.babylonjs.com/setup/support/webGPU/webGPUWGSL/) — custom shader guide
- [Koota](https://github.com/pmndrs/koota) — ECS for TypeScript
- [Yuka](https://github.com/Mugen87/yuka) — Game AI (GOAP, NavGraph)
