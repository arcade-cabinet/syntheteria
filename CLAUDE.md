# Syntheteria - Development Context

## Project Status

2.5D top-down RTS about an AI awakening in a dead ecumenopolis. BabylonJS + Reactylon rendering with chunk-based infinite world generation. Fully playable with governor-driven automated playtests.

> For quick reference, read this file. For deep architecture details, see [docs/HANDOFF.md](./docs/HANDOFF.md).

---

## Tech Stack

- **Engine:** BabylonJS 8.x (WebGPU) + Reactylon 3.x (React declarative binding)
- **ECS:** Koota 0.6.x (traits, queries, systems)
- **AI:** Yuka 0.7.x (GOAP, NavGraph, Vehicle)
- **Build:** Webpack 5 + babel-plugin-reactylon (sole build system)
- **UI:** React 19 + shadcn/ui + Tailwind CSS 3
- **Platform:** Web-first (mobile via Capacitor)
- **Data:** TypeScript const objects in `src/config/` — no JSON
- **Persistence:** sql.js (ASM build)
- **Testing:** Vitest (unit + browser plugin) + Playwright (E2E)

---

## Running

```bash
pnpm dev          # Webpack dev server — localhost:8080
pnpm tsc          # Type check
pnpm test         # Unit tests (vitest)
pnpm test:browser # Browser component tests (vitest + playwright browser)
pnpm test:e2e     # E2E tests (playwright)
pnpm build        # Production build
pnpm lint         # Biome lint
```

---

## Key Architecture

### Chunk-Based World
- `src/board/chunks.ts` — 32x32 tile chunks, deterministic generation, border gates for cross-chunk connectivity
- `src/board/scene.ts` — imperative BabylonJS mesh creation (NOT per-tile React JSX)
- `src/board/navigation.ts` — Yuka NavGraph per chunk + WorldNavGraph for cross-chunk pathfinding
- `src/board/coords.ts` — unified tile/world/BabylonJS/Yuka coordinate conversions
- `src/board/zones.ts` — geographic zones use absolute WORLD_EXTENT=256, not board-relative

### Game Layer (src/game/)
- `GameCanvas.tsx` — Reactylon Engine+Scene, camera, fog, lights, game loop
- `ChunkManager.ts` — load/unload chunks on camera pan
- `EntityRenderer.ts` — GLB models synced to Koota entities, selection rings, bob animation
- `InputHandler.ts` — mouse-first click-to-select, click-to-move, box selection
- `MoveMarker.ts` — destination indicator on move command
- `BaseMarker.ts` — BabylonJS mesh for base indicators

### Rendering
- PBR materials cached per FloorType in `scene.ts`
- Texture mapping defined in `src/config/floorMaterials.ts` (single source of truth)
- Camera: ArcRotateCamera, locked near-top-down, pan+zoom only
- Fog hides chunk edges — no board size math needed

### UI Layout (src/ui/layout/)
- `GameLayout.tsx` — responsive flex (sidebar desktop, bottom mobile)
- `TopBar.tsx` — resources, speed controls, save/load, audio
- `Sidebar.tsx` — minimap + selection info + action panel
- `Minimap.tsx` — canvas-based minimap with legend + viewport indicator
- `SelectionInfo.tsx` — selected unit/building details
- `ActionPanel.tsx` — context-sensitive action buttons

### Base System
- `src/ecs/traits.ts` — Base trait (name, infrastructure, production, power, storage)
- `src/systems/baseManagement.ts` — founding, production ticks, power, storage
- `src/ui/base/BasePanel.tsx` — side panel for base management

### Game Data
- `src/config/robotDefs.ts` — 6 player robot types x 3 marks
- `src/config/cultDefs.ts` — 3 cult mech types + escalation tiers
- `src/config/models.ts` — unit/building type → GLB path
- `src/config/floorMaterials.ts` — FloorType → PBR texture paths
- `src/config/buildingDefs.ts` — placeable buildings with costs

### ECS (Koota)
- Traits: Unit, Position, Faction, Navigation, UnitComponents, BuildingTrait, Base, EntityId, Fragment, Inventory, ScavengeSite, EngagementRule, HumanTemperature, Hacking, LightningRod
- Systems accept `world: World` param for testability
- Complex data serialized as JSON strings in traits

### AI
- `src/ai/cultBehavior.ts` — CultAgent with Think brain, 3 evaluators (Patrol, Aggro, Escalate)
- `src/ai/governor/PlaytestGovernor.ts` — automated player AI for playtesting

### Simulation (18 systems in gameState.ts simulationTick)
gamePhaseSystem, explorationSystem, fragmentMergeSystem, powerSystem, resourceSystem, repairSystem, fabricationSystem, computeSystem, enemySystem, cultEscalationSystem, cultAISystem, hackingSystem, combatSystem, basePowerTick, baseProductionTick, humanTemperatureSystem, updateDisplayOffsets, governorTick

---

## Design Docs (Engine-Independent, Still Valid)

- `docs/design/GAME_OVERVIEW.md` — 3-phase game loop
- `docs/design/CORE_MECHANICS.md` — fragmented maps, component damage, hacking
- `docs/design/COMBAT.md` — component-based damage
- `docs/design/CONSCIOUSNESS_MODEL.md` — AI consciousness model
- `docs/design/DRONES.md` — starting units
- `docs/story/LORE_OVERVIEW.md` — world lore

---

## Testing

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest (jsdom) | ECS systems, formulas, game logic |
| Browser | Vitest (browser plugin, headed Chrome) | React components, governor playtest |
| E2E | Playwright | Full app lifecycle, governor 100-tick run |

---

## Resources

- [BabylonJS](https://www.babylonjs.com/) — 3D engine
- [Reactylon](https://www.reactylon.com/docs) — React binding for BabylonJS
- [Koota](https://github.com/pmndrs/koota) — ECS for TypeScript
- [Yuka](https://github.com/Mugen87/yuka) — Game AI (GOAP, NavGraph)
- [Vitest](https://vitest.dev/) — Unit testing
- [Playwright](https://playwright.dev/) — E2E testing
