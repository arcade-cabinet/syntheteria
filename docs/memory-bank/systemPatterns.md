# System Patterns: Syntheteria (Ground-Up Rewrite)

> ECS patterns and conventions for the `ralph/syntheteria-1-0` branch.
> Full architecture details: `docs/ARCHITECTURE.md`

## Architecture Overview

```
gameDefaults.ts (tunables)  -->  systems (pure logic)  -->  Koota ECS (state)  -->  views/board (Phaser)
                                        |                          |                  views/title (R3F globe)
                                  board/grid.ts             sql.js SQLite
                                  (GridApi)                (persistence)
```

- **Koota ECS** owns all game state.
- **Systems** are pure functions — accept `world: WorldType` param, never import world singleton.
- **views/board** (Phaser + enable3d) renders the match board; **views/title** (R3F) renders the title globe.
- **`gameDefaults.ts`** owns all tunables — never hardcode in systems or renderers.
- **One source of truth per domain** — no dual data stores.
- **No JSON for game data** — all definitions are TypeScript `const` objects.

## Koota ECS Patterns

### Trait Definition

```ts
export const UnitStats = trait({
  hp: 10, maxHp: 10,
  ap: 3,  maxAp: 3,
  attack: 2, defense: 1,
  scanRange: 4,
});
```

### System Signature (always pass world, never import singleton)

```ts
export function highlightSystem(world: WorldType, selectedId: number | null): void {
  for (const entity of world.query(Tile, TileHighlight)) {
    const tile = entity.get(Tile);
    const highlight = entity.get(TileHighlight);
    if (!tile || !highlight) continue; // always null-guard .get() results
    // ...
  }
}
```

### Entity Spawn

```ts
const entity = world.spawn(
  UnitPos({ tileX: 5, tileZ: 5 }),
  UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, attack: 2, defense: 1, scanRange: 4 }),
  UnitFaction({ factionId: "player" }),
);
```

### Entity ID Lookups

Koota has no `world.entity(id)` — build a `Map<number, Entity>` when needed:

```ts
const idMap = new Map<number, Entity>();
for (const entity of world.query(UnitFaction)) {
  idMap.set(entity.id(), entity);
}
const target = idMap.get(selectedId);
```

### Test Cleanup

16 worlds max per process. Always destroy in `afterEach`:

```ts
afterEach(() => { world.destroy(); });
```

## Board Patterns

### GridApi (only public interface into board state)

```ts
const grid = createGridApi(board);
const tile = grid.getTile(x, z);                    // TileData | null
const pos = grid.tileWorldPos(x, z);                 // {wx, wy, wz}
const reachable = grid.reachable(fromX, fromZ, ap); // Set<"x,z">
const path = grid.path(fromX, fromZ, toX, toZ);     // TileData[]
```

Never access `board.tiles[z][x]` directly outside `src/board/`.

### Board Generation

```ts
const board = generateBoard({ width: 32, height: 32, seed: "abc", difficulty: "normal" });
// Deterministic: same seed always produces same board
```

## Resource Pattern

### Salvage as Primary Source

Salvage props (SALVAGE_DEFS) are the primary resource source. Each has:
- `harvestDuration` — ticks to harvest
- `yields` — material-specific yield ranges
- `models` — GLB model IDs for rendering

Floor mining (FLOOR_DEFS) is the backstop for resource deserts.

### Resource Model (TARGET — replaces salvage taxonomy)

Biome-based natural resources → processed materials → synthetic outputs.
See `docs/GAME_DESIGN.md` §5 for the full resource progression vision.
Current salvage and floor mining systems are LEGACY.

### Faction Resource Pool

```ts
// Add resources after harvest completes
addResources(world, factionId, "ferrous_scrap", 3);

// Check if faction can afford a building
canAfford(world, factionId, { ferrous_scrap: 6, alloy_stock: 3 });

// Spend resources
spendResources(world, factionId, "ferrous_scrap", 6);
```

## Building Pattern

### Storm Power Model

Buildings define `powerDelta`:
- Positive = generates/transmits power (storm_transmitter: +5)
- Negative = draws power (motor_pool: -3)
- Zero with storageCapacity = stores power (power_box: stores 20)

### Building-Driven Progression (TARGET)

Each building has internal upgrade tiers (1→3). Buildings unlock other buildings.
Research Lab becomes "Analysis Node" (passive accelerator). See `docs/GAME_DESIGN.md` §7.

### Building Traits

A building entity carries multiple traits based on its type:
- `Building` — always present (type, position, faction, HP)
- `PowerGrid` — if it participates in the power network
- `SignalNode` — if it extends signal range (relay towers)
- `TurretStats` — if it has combat capability (defense turrets)
- `BotFabricator` — if it produces bots (motor pools)
- `StorageCapacity` — if it stores resources

## Render Pattern

R3F components query ECS and render geometry. Example pattern:

```tsx
export function HighlightRenderer({ world }: { world: WorldType }) {
  return (
    <>
      {world.query(Tile, TileHighlight)
        .filter(e => (e.get(TileHighlight)?.emissive ?? 0) > 0)
        .map(e => {
          const tile = e.get(Tile)!;
          const h = e.get(TileHighlight)!;
          return (
            <mesh key={e.id()} position={[tile.x * TILE_SIZE_M, 0.01, tile.z * TILE_SIZE_M]}>
              <planeGeometry />
              <meshStandardMaterial emissive={h.color} emissiveIntensity={h.emissive} />
            </mesh>
          );
        })}
    </>
  );
}
```

## Command UI Pattern (target) — Civ VI–style + per-building modals

**Radial menu is deprecated** as the product direction. **Target:** contextual **action strip /
inspector** (React DOM) driven by the same selection context the game already uses; **specialized
units and buildings** show **filtered** actions (fabricator vs recon vs combat), with heavy flows
(build queue, tech, diplomacy) in **per-building management modals** (extending the GarageModal
pattern to every building type) and **panels**. Use **Civilization VI (especially mobile)** as
the reference for **dense but legible** layouts, not CivRev2’s minimal radial.

### Legacy: dual-ring radial (to retire)

`radialMenu.ts` + `registerRadialProvider` + `RadialMenu.tsx` remain until replaced. **Do not** add
new radial-only UX; wire new surfaces to existing **execute** paths (ECS commands).

## SQLite Pattern (non-fatal)

DB failures never crash the game — ECS runs in memory:

```ts
if (repo) {
  try {
    await repo.saveTiles(gameId, flatTiles);
  } catch (err) {
    console.warn("[main] DB write failed (non-fatal):", err);
  }
}
```

## Building System Pattern (Wave 2)

All building systems follow the same pattern:
1. Query powered buildings of a specific type: `world.query(Building, Powered)`
2. Filter by `buildingType`
3. Perform the building's function (repair, attack, fabricate, etc.)
4. Wire into `runEnvironmentPhase()` in turnSystem.ts

### Environment Phase Order (turnSystem.ts)

```
runPowerGrid(world)      — charge/drain power grid, set Powered trait
runSignalNetwork(world)  — compute relay coverage, penalize uncovered units
runRepairs(world)        — heal friendly units near powered maintenance bays
runSynthesis(world)      — tick fusion recipes, deposit outputs
runFabrication(world)    — tick bot build queues, spawn on completion
runTurrets(world)        — powered turrets fire on nearest hostile
checkCultistSpawn(...)   — escalation + wave spawning
```

### Fabrication Pattern (queue-based systems)

Systems like fabrication and synthesis use a separate **job entity** (e.g. `FabricationJob` trait)
to track in-progress work. The pattern:
1. `queueX()` — validate preconditions, deduct resources, spawn job entity
2. `runX()` — tick jobs each turn, complete on countdown, clean up orphans

## Rule Summary

| Rule | Detail |
|------|--------|
| Systems accept `world` param | Never `import { world }` singleton |
| `.get()` always null-guard | `const x = e.get(Trait); if (!x) continue;` |
| No `world.entity(id)` | Rebuild `Map<id, Entity>` per-operation |
| 16 worlds max | `world.destroy()` in `afterEach` |
| No JSON for game data | TypeScript `const` objects only |
| All tunables in `gameDefaults.ts` | No magic numbers in systems/renderers |
| GridApi only | Never access `board.tiles[][]` outside `src/board/` |
| SQLite is non-fatal | DB failures don't crash, ECS runs in memory |
| Salvage = primary resource | Floor mining is backstop only (LEGACY — target: biome resources) |
| Storm = power grid | transmitters tap storm, power boxes store charge |
