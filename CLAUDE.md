# Syntheteria - Development Context

## Project Status

2.5D top-down RTS about an AI awakening in a dead ecumenopolis. Pivoted to BabylonJS + Reactylon rendering with chunk-based infinite world generation. POC validated and rendering at localhost:3001.

**Full architecture details: [docs/HANDOFF.md](./docs/HANDOFF.md)**

---

## Tech Stack

- **Engine:** BabylonJS 8.x (WebGPU) + Reactylon 3.x (React declarative binding)
- **ECS:** Koota 0.6.x (traits, queries, systems)
- **AI:** Yuka 0.7.x (GOAP, NavGraph, Vehicle)
- **Build:** Vite 8 (main app) + Webpack 5 (POC, requires babel-plugin-reactylon)
- **Platform:** Web-first (mobile via Capacitor)
- **Data:** TypeScript const objects in `src/config/` — no JSON
- **Persistence:** sql.js (ASM build)
- **Testing:** Vitest (unit) + Playwright (E2E)

---

## Running

```bash
pnpm dev          # Main app — localhost:5173
pnpm dev:poc      # BabylonJS POC — localhost:3001
pnpm tsc          # Type check
pnpm test         # Unit tests
pnpm lint         # Biome lint
```

---

## Key Architecture

### Chunk-Based World
- `src/board/chunks.ts` — 32x32 tile chunks, deterministic generation, border gates for cross-chunk connectivity
- `src/board/scene.ts` — imperative BabylonJS mesh creation (NOT per-tile React JSX)
- `src/board/navigation.ts` — Yuka NavGraph per chunk
- `src/board/coords.ts` — unified tile/world/BabylonJS/Yuka coordinate conversions
- `src/board/zones.ts` — geographic zones use absolute WORLD_EXTENT=256, not board-relative

### Rendering
- PBR materials cached per FloorType in `scene.ts`
- Texture mapping defined in `src/config/floorMaterials.ts` (single source of truth)
- Camera: ArcRotateCamera, locked near-top-down, pan+zoom only
- Fog hides chunk edges — no board size math needed

### Game Data
- `src/config/robotDefs.ts` — 6 player robot types x 3 marks
- `src/config/cultDefs.ts` — 3 cult mech types + escalation tiers
- `src/config/models.ts` — unit/building type → GLB path
- `src/config/floorMaterials.ts` — FloorType → PBR texture paths
- `src/config/buildingDefs.ts` — placeable buildings with costs

### ECS (Koota)
- Traits: Unit, Position, Faction, Navigation, UnitComponents, BuildingTrait
- Systems accept `world: World` param for testability
- Complex data serialized as JSON strings in traits

### AI (Yuka GOAP)
- `src/ai/cultBehavior.ts` — CultAgent with Think brain, 3 evaluators
- PatrolGoal, AggroGoal, EscalateGoal

---

## What Needs Work

### Immediate
- Wire Koota ECS into POC (entities from chunks)
- Yuka nav graph cross-chunk pathfinding
- Robot sprite sheets (3d-to-2d pipeline)
- Fog of war

### Short Term
- Combat loop in chunk world
- Cult enemy spawning in enemy zones
- Save/load (chunk deltas to IndexedDB)

### Medium Term
- Hacking system
- Signal/compute network
- Audio (Tone.js)

### Migrate Away From
- `src/rendering/` — old R3F renderers (replaced by `src/board/scene.ts`)
- `src/camera/` — old R3F cameras (replaced by BJS ArcRotateCamera)
- `src/input/` — old R3F input (replaced by BJS camera controls)
- `src/systems/navmesh.ts` — old grid nav (replaced by `src/board/navigation.ts`)

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
| Unit | Vitest | ECS systems, formulas, game logic |
| Integration | Vitest + testing-library | React components |
| E2E | Playwright | Full gameplay in browser |

---

## Resources

- [BabylonJS](https://www.babylonjs.com/) — 3D engine
- [Reactylon](https://www.reactylon.com/docs) — React binding for BabylonJS
- [Koota](https://github.com/pmndrs/koota) — ECS for TypeScript
- [Yuka](https://github.com/Mugen87/yuka) — Game AI (GOAP, NavGraph)
- [Vitest](https://vitest.dev/) — Unit testing
- [Playwright](https://playwright.dev/) — E2E testing
