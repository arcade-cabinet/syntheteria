# World Map Generation — `src/world/gen/`

## What This Is

A Civilization-style world map generator, translated to ecumenopolis terms.

| Civ Concept    | Ecumenopolis Equivalent                          |
|----------------|--------------------------------------------------|
| Sky/atmosphere | Dome + storm visible outside (pure backdrop)     |
| Mountains      | Buildings, props, structures (impassable)         |
| Plains/grass   | Metal/concrete/grating floor tiles (walkable)     |
| Hills          | Raised platforms (walkable at elevation)           |
| Forests        | Harvestable resource clusters (impassable)         |
| Water/ocean    | Breach zones (no floor, impassable)                |
| Bridges        | Elevated platforms creating under-passage          |
| Mountain pass  | Gaps in building walls, ramps between levels       |

Everything that happens ON the map (factions, AI, combat, quests, harvesting,
base building) is separate from and downstream of THE MAP itself.

## Architecture

```
f(worldSeed, chunkX, chunkZ) → 8×8 grid of tiles

Each tile:
  - floor: PBR material ID (metal_001, concrete_003, grating_002, etc.)
  - model: model ID from modelDefinitions.json (or null if empty floor)
  - level: 0 (ground), 1 (raised platform), 2 (upper)
  - passable: derived from model.passable + level logic
  - rotation: 0-3 quarter turns
```

### Chunk Generation Pipeline

1. **Hash chunk coords** into a local PRNG: `prng = mulberry32(worldSeed ^ hash(cx, cz))`
2. **Paint floor materials** — vary by distance from chunk center, PRNG noise
3. **Place structures** — the "mountains": walls, columns, pipes form contiguous
   ranges with guaranteed gaps (mountain passes). Density ~20-25% of tiles.
4. **Place resources** — the "forests": harvestable containers, generators, vehicles
   in clusters of 3-7 near structure ranges. Density ~5-8%.
5. **Place platforms** — the "hills/bridges": where structure density would choke
   passage, span elevated platforms over corridors. Columns as supports.
6. **Place ramps** — connect ground to platform level at platform edges.
7. **Validate walkability** — flood-fill from chunk edges to ensure ~70% passable.
   Punch gaps in structures if needed.

### What Gets Stored in SQLite

The baseline chunk is NEVER stored. It regenerates from seed.

SQLite `game_map_tiles` stores ONLY deltas:
- Structures the player harvested (removed)
- Structures the player built (added)
- Faction control changes
- Resource depletion state

Load = regenerate baseline from seed + apply deltas from SQLite.

### Integration Points

| Consumer        | What it reads from the map                       |
|-----------------|--------------------------------------------------|
| Renderer        | Chunk tiles → floor meshes + model instances + pit geometry |
| Pathfinding     | Tile passability + level connections → A* graph   |
| Yuka AI         | Pathfinding results → bot movement decisions      |
| Harvest system  | Model at tile OR floor material → harvest yields from JSON. Floor harvest → pit state |
| Construction    | Empty passable tile → can player build here?      |
| Fog of war      | Chunk discovery state                             |

### Model Catalog (source of truth)

`src/config/modelDefinitions.json` — 212 models with:
- `bounds.height` → clearance calculations for bridges
- `passable` → walkability
- `harvest.yields` → what you get from stripping it
- `elevationProfile` → bridge/ramp/support classification
- `family` → grouping for placement logic (wall, column, pipe, container, etc.)

### 2.5D Elevation

- Level 0: ground (y = 0.0m)
- Level 1: raised (y = 2.5m) — platforms, bridges
- Level 2: upper (y = 5.0m) — tall structures only

Robot clearance: 1.2m minimum to pass under.
Platform at level 1 = 2.5m above ground → always enough clearance.
Max bridge span without visibility gaps: 3 tiles.

### Floor Tiles

Seamless PBR materials from PolyHaven, mapped to 2.0m × 2.0m grid cells.
Materials: metal panels, concrete slabs, industrial grating, rusty plating.
Defined in `tile_definitions` SQLite table, seeded from `floorTextures.json`.

**Floor tiles are harvestable.** Fabricator bots can strip-mine floor tiles → yields materials (heavy_metals, scrap) → tile becomes a pit. Undermaterials (sand, soil, gravel) for pit interiors from `/Volumes/home/assets/2DPhotorealistic`. Each floor material has a FLOOR_* resource pool.
