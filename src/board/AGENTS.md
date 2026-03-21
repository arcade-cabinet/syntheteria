# board/

Deterministic labyrinth board generation and tile grid utilities.

## Rules
- **Pure TS** — no React, no rendering, no ECS queries
- Board is generated from a seed — same seed = same board
- All functions are pure (input → output, no global state)
- Exports via `index.ts`

## Public API
- `generateBoard(config)` → `GeneratedBoard`
- `getAdjacent(x, z, board)` → neighbor tiles
- `reachableTiles(x, z, range, board)` → set of reachable coordinates
- `movementCost(from, to)` → cost in MP
- Types: `BoardConfig`, `GeneratedBoard`, `TileData`, `BiomeType`

## Key Files
| File | Purpose |
|------|---------|
| generator.ts | Main board generator entry point |
| labyrinth.ts | Rooms-and-Mazes labyrinth algorithm |
| adjacency.ts | Tile neighbor + reachability queries |
| grid.ts | Grid constants (TILE_SIZE_M) |
| noise.ts | Seeded Perlin noise |
| types.ts | BoardConfig, GeneratedBoard, TileData |
