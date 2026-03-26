# Syntheteria — Deep Architecture Reference

> Quick overview: [CLAUDE.md](/CLAUDE.md). Agent rules: [AGENTS.md](/AGENTS.md).

---

## Chunk-Based World

The world is an infinite grid of **chunks** (32×32 tiles, `TILE_SIZE_M = 2.0`). Chunks generate on demand as the camera pans. Same seed + chunk coords = identical output.

### Generation Pipeline (per chunk)

1. **Room placement** — seeded by `${worldSeed}_c${cx}_${cz}_labyrinth`
2. **Growing Tree maze fill** — corridors between rooms
3. **Border gate opening** — deterministic passable tiles at chunk edges (seeded by edge coords so adjacent chunks share gates)
4. **Region connectivity** — flood-fill + union-find
5. **Dead-end pruning + bridges/tunnels**
6. **Re-open border gates** — in case pruning closed them
7. **Zone floor assignment** — absolute world coords via `WORLD_EXTENT = 256`
8. **Resource scatter** — zone-aware distribution
9. **Zone stamping** — every tile gets its geographic zone

### Border Gates

Each chunk edge has 4 deterministic gate positions. Seed for a horizontal edge: `${worldSeed}_edge_h_${cx}_${cz}`. Both adjacent chunks compute identical gates.

### Zones

Fixed reference frame: `WORLD_EXTENT = 256`. Tile at `(x, z)` normalizes to `(x/256, z/256)` and maps to zones:
- **City** — center
- **Coast** — east/south
- **Campus** — southwest
- **Enemy/Cult** — north

---

## Rendering

### Imperative Mesh Creation

`src/board/scene.ts` creates BabylonJS meshes directly — NOT React JSX per tile:

```typescript
const chunkMeshes = populateChunkScene(chunk, scene);
disposeChunkMeshes(chunkMeshes); // when chunk scrolls out
```

### Materials

- PBR materials cached per FloorType (one instance shared across all tiles)
- `src/config/floorMaterials.ts` is the single source of truth
- 8 floor types + structural_mass walls + void_pit
- Wall height varies by tile hash for visual interest

### Camera

ArcRotateCamera: beta ~1° (near-vertical), alpha locked -90°, pan+zoom only, zero inertia, radius 20-100.

**Known issue:** beta=1° gives no depth perception. Needs 20-30° for 2.5D feel.

### Fog

Exponential (mode 2), density 0.015, color `#03070b`. Large ground plane at fog color prevents visible edges.

---

## Navigation (Yuka)

`src/board/navigation.ts`:
- One NavGraph node per passable tile at world-space center
- 8-directional edges (4 cardinal + 4 diagonal)
- Edge cost = distance × (1 + elevation_delta × 1.5)
- `WorldNavGraph` merges per-chunk graphs at shared border gates

### Coordinates (`src/board/coords.ts`)

- `tileToWorldX/Z()`, `worldToTileX/Z()` — tile ↔ world
- `tileToBabylon()`, `tileToYuka()` — tile → engine Vector3
- `babylonToYuka()`, `yukaToBabylon()` — cross-engine
- `tileToChunk()`, `chunkOrigin()` — tile ↔ chunk grid

---

## ECS (Koota)

Traits in `src/ecs/traits.ts`:

| Trait | Key Fields |
|-------|-----------|
| Position | x, y, z |
| Unit | unitType, displayName, speed, selected, mark |
| Faction | player \| cultist \| rogue \| feral |
| Navigation | pathJson, pathIndex, moving |
| UnitComponents | componentsJson (camera/arms/legs/power_cell) |
| BuildingTrait | buildingType, powered, operational |
| Base | name, tileX, tileZ, factionId, infrastructure, production, power, storage |
| Fragment | fragmentId (fog-of-war group) |
| EntityId | string ID for mesh↔entity mapping |
| ScavengeSite | materialType, amountPerScavenge, remaining |
| LightningRod | rodCapacity, currentOutput, protectionRadius |
| EngagementRule | attack \| defend \| flee \| hold |
| HumanTemperature | global 0-100 disposition meter |
| Hacking | hack target and progress |
| Inventory | per-unit material inventory (JSON) |

Complex data uses JSON string serialization. Systems accept `world: World` param.

---

## Simulation Loop

`src/ecs/gameState.ts` → `simulationTick()` runs 18 systems:

gamePhaseSystem → explorationSystem → fragmentMergeSystem → powerSystem → resourceSystem → repairSystem → fabricationSystem → computeSystem → enemySystem → cultEscalationSystem → cultAISystem → hackingSystem → combatSystem → basePowerTick → baseProductionTick → humanTemperatureSystem → updateDisplayOffsets → governorTick

Each wrapped in `runSystem()` for error isolation. Movement runs per-frame (not per-tick).

---

## AI (Yuka GOAP)

`src/ai/cultBehavior.ts`: `CultAgent extends Vehicle` with `Think<CultAgent>` brain.
3 evaluators: PatrolGoal, AggroGoal, EscalateGoal.

`src/ai/governor/PlaytestGovernor.ts`: automated player AI for testing.
Priority: attack > scavenge > found base > explore.

---

## Assets

### PBR Textures
`public/assets/textures/pbr/` — AmbientCG 1K JPG (concrete/, corrugated_steel/, metal/).

### GLB Models
`public/assets/models/robots/`:
- `factions/` — Companion-bot, ReconBot, MobileStorageBot
- `cult/` — Mecha01, MechaGolem, MechaTrooper

Model path registry: `src/config/models.ts`.
