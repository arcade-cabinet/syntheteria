# terrain/

Biome types, elevation, and terrain shader — defines the visual and gameplay properties of each tile surface.

## Rules
- **Pure TS** — no React, no ECS queries
- **BiomeType is the canonical terrain enum** — used across board, rendering, and systems
- **ResourceMaterial also defined here** — materials that can be mined from biomes
- **GLSL shaders live in `glsl/`** — imported by floorShader.ts
- **Elevation is discrete** — `ELEV_Y` maps elevation names to Y positions

## Public API
- `biomeTypeForTile(seed, x, z)` — determine biome type from seed + position
- `tileBiomeProps(biomeType)` — get visual/gameplay properties for a biome
- `sampleElevation(seed, x, z)` — determine tile elevation
- `tileElevY(elevation)` — elevation name to Y coordinate
- `makeFloorShaderMaterial()` — create the terrain shader material
- `TileBiome` — Koota trait for tile biome data
- `BIOME_DEFS` — definition table for all biome types
- `BIOME_INDEX_MAP` — biome type to atlas index mapping
- `isPassableBiome(type)` — check if biome is walkable
- Types: `BiomeType`, `BiomeDef`, `ResourceMaterial`

## Files
| File | Purpose |
|------|---------|
| cluster.ts | Biome type assignment + geography noise |
| elevationSampler.ts | Elevation sampling + Y coordinate lookup |
| floorShader.ts | Terrain shader material factory |
| traits.ts | `TileBiome` Koota trait |
| types.ts | `BiomeType`, `BiomeDef`, `ResourceMaterial`, `BIOME_DEFS` |
| glsl/ | GLSL shader source files |
