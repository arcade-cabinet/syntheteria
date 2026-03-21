# Spherical World Map — What's Missing

> The board IS a sphere. Not a flat plane hacked to look curved.
> The game world is an ecumenopolis — a city covering the ENTIRE PLANET.
> The board geometry is a SphereGeometry. Tiles have lat/long coordinates.
> The camera orbits the sphere. "Panning" rotates the globe.
> At game zoom, the curvature is subtle. Zoom out and you see the whole planet.

---

## Current State (WRONG APPROACH)

The board is a flat PlaneGeometry with a cosine displacement hack to fake curvature.
This is fundamentally wrong. You cannot make a plane into a sphere with hacks.
The result is a flat rectangle floating in space that looks like a board game.

## Correct Approach: ACTUAL Sphere

The game world IS a sphere. Not a plane pretending to be one.

### Architecture

1. **Board geometry = SphereGeometry**
   - Replace `buildBoardGeometry()` (flat plane + cosine hack) with actual `THREE.SphereGeometry`
   - Sphere radius determined by board size: e.g., 64x64 board → R = 64 / (2π) ≈ 10 world units
   - Tile grid maps to lat/long on the sphere surface
   - At game zoom (close), the curvature is subtle — corridors are still corridors
   - At max zoom-out, you see the whole planet

2. **Coordinate system = (lat, long) not (x, z)**
   - Each tile has a latitude and longitude instead of flat x, z
   - The generator produces a flat grid that's MAPPED onto the sphere
   - Equirectangular projection: x → longitude, z → latitude
   - Tile (0,0) = one pole, tile (W,H) = opposite pole (or equatorial band for partial coverage)
   - All game logic uses (lat, long) internally; the renderer projects to 3D sphere positions

3. **Camera orbits the sphere center**
   - Camera position = point at distance `orbitRadius` from sphere center
   - "Panning" = rotating the camera around the sphere (azimuth + polar angle)
   - Zoom = changing `orbitRadius`
   - OrbitControls with `target = (0,0,0)` (sphere center), rotation enabled, pan DISABLED
   - The world spins under you when you drag

4. **No edges, no wrapping needed, no ghost tiles**
   - It's a sphere. There are no edges. You orbit around it.
   - Delete GHOST tiles entirely — the sphere surface IS the world
   - East-west wrapping is automatic (it's a sphere)
   - North-south: the storm dome poles can be special zones (wormhole eye at north pole)

5. **PBR textures on the sphere**
   - Same atlas textures, applied to the sphere surface
   - UV mapping: equirectangular (longitude → U, latitude → V)
   - The floorIndex attribute works the same way — each vertex knows its biome
   - Normal maps need adjustment for sphere surface normals

6. **Title → Game Transition (THE SPECTACLE)**
   - Landing page shows Earth with recognizable continents — NOT the ecumenopolis yet
   - Player hits New Game, picks seed/settings
   - On INITIALIZE: the ecumenopolis growth animation plays LIVE
   - Machine lattice spreads from continents outward, consuming the planet
   - Storm dome seals over the globe as the lattice completes
   - Labyrinth generates in sync with the visual growth (seeded by chosen phrase)
   - Camera simultaneously zooms toward the surface
   - Transition ends: you're on the sphere surface, playing
   - No loading screen — the generation IS the cinematic
   - `uGrowth` uniform drives the visual: 0 = Earth continents, 1 = full ecumenopolis

7. **Storm dome = the sky viewed FROM INSIDE the sphere**
   - The player is ON the sphere surface looking UP at the storm dome
   - The HDRI sky IS the inside of the storm dome
   - The wormhole eye at zenith is always directly overhead
   - This is lore-accurate: you're an AI on Earth's surface, looking up at the sealed dome

7. **Labyrinth structures on sphere surface**
   - GLB wall/column/floor models placed at sphere surface positions
   - Each model's position = lat/long projected to 3D point on sphere
   - Each model oriented tangent to the sphere surface (not aligned to world Y-up)
   - At game zoom, the orientation difference is imperceptible

### What Changes

| Component | Current (flat) | Correct (sphere) |
|-----------|---------------|-----------------|
| Board geometry | PlaneGeometry + cosine hack | SphereGeometry |
| Coordinates | (x, z) flat | (lat, long) → 3D sphere point |
| Camera | OrbitControls PAN | OrbitControls ROTATE around sphere center |
| Wrapping | Ghost tiles + HDRI background | Automatic (sphere has no edges) |
| GHOST tiles | 30 extra rows of void | Deleted — sphere IS the world |
| Edges | Visible rectangle boundary | None — continuous sphere surface |
| Sky | HDRI environment map | Same, but represents dome interior viewed from surface |
| Tile addressing | Direct (x, z) array | (lat, long) → (x, z) via projection |
| boardGeometry.ts | buildBoardGeometry() with cosine Y | buildSphereGeometry() mapping grid to sphere |
| IsometricCamera | PAN mode, flat target | ROTATE mode, target = sphere center |

### What DOESN'T Change

- All ECS systems (they operate on tile coordinates, not 3D positions)
- Board generator (produces flat grid — projection is a rendering concern)
- Game logic, AI, combat, economy — all coordinate-based, not position-based
- PBR atlas textures (same materials)
- GLB models (same assets, different placement)
- UI (HUD, radial menu, tooltips — all DOM overlay)
- Tests (all test game logic, not rendering)

### Implementation Steps

1. **Create `buildSphereGeometry(board)`** — maps the tile grid onto a SphereGeometry
   - For each tile (x, z), compute (lat, long) via equirectangular projection
   - For each vertex, compute 3D position on sphere: `(R*cos(lat)*cos(long), R*sin(lat), R*cos(lat)*sin(long))`
   - Assign floorIndex attribute per vertex (same as current)
   - Assign normal = normalize(position) (outward from sphere center)

2. **Update IsometricCamera** — orbit around sphere center
   - Target = (0, 0, 0) (sphere center)
   - Enable rotation, disable pan
   - Min/max distance = zoom bounds
   - Polar angle clamped to ~30-80° from equator (game viewing range)

3. **Update model placement** — units, buildings, salvage, structures
   - Convert (tileX, tileZ) → (lat, long) → 3D position on sphere
   - Orient models tangent to sphere surface (lookAt from sphere center)

4. **Update raycasting / input** — click on sphere surface → tile coordinates
   - Raycast hits sphere → get 3D position → convert to (lat, long) → (tileX, tileZ)

5. **Delete ghost tiles, cosine curvature hack, CURVE_STRENGTH constant**

6. **Update fog of war** — works on sphere geometry, same visibility logic
