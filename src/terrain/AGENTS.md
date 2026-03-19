# terrain/

Floor types, elevation, and terrain shader — defines the visual and gameplay properties of each tile surface.

## Rules
- **Pure TS** — no React, no ECS queries
- **FloorType is the canonical terrain enum** — used across board, rendering, and systems
- **ResourceMaterial also defined here** — materials that can be mined from floors
- **GLSL shaders live in `glsl/`** — imported by floorShader.ts
- **Elevation is discrete** — `ELEV_Y` maps elevation names to Y positions

## Public API
- `floorTypeForTile(seed, x, z)` — determine floor type from seed + position
- `tileFloorProps(floorType)` — get visual/gameplay properties for a floor
- `sampleElevation(seed, x, z)` — determine tile elevation
- `tileElevY(elevation)` — elevation name to Y coordinate
- `makeFloorShaderMaterial()` — create the terrain shader material
- `TileFloor` — Koota trait for tile floor data
- `FLOOR_DEFS` — definition table for all floor types
- `FLOOR_INDEX_MAP` — floor type to atlas index mapping
- `isPassableFloor(type)` — check if floor is walkable
- Types: `FloorType`, `FloorDef`, `ResourceMaterial`

## Files
| File | Purpose |
|------|---------|
| cluster.ts | Floor type assignment + geography noise |
| elevationSampler.ts | Elevation sampling + Y coordinate lookup |
| floorShader.ts | Terrain shader material factory |
| traits.ts | `TileFloor` Koota trait |
| types.ts | `FloorType`, `FloorDef`, `ResourceMaterial`, `FLOOR_DEFS` |
| glsl/ | GLSL shader source files |
