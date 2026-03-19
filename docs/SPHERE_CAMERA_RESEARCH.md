# Sphere-Based Strategy Game Research

> Games that play on spheres/globes — what works, what doesn't, what fits Syntheteria.

---

## Reference Games

### Planetary Annihilation (2014) — Full RTS on Spheres
- Camera: free orbit around planet at any angle
- Zoom: seamless from full orbit view to individual unit level
- Building: place structures directly on sphere surface, they snap tangent
- Navigation: drag rotates the planet, scroll zooms orbit distance
- Multiple planets in same match
- **Pro:** Orbital-to-surface zoom is seamless and dramatic
- **Con:** At extreme zoom, curvature makes unit selection awkward on small planets
- **Relevance:** High — proves real-time strategy works on spheres

### The Universim (2024) — God Game on Small Planet
- Camera: orbit around planet center
- Building: snap to sphere surface
- "Small planet" feel — at medium zoom you see the whole thing
- Population walks across sphere surface naturally
- **Pro:** Charming, readable, intuitive
- **Con:** Small planet = no "infinite world" feel
- **Relevance:** Medium — our planet should feel LARGE (ecumenopolis, not asteroid)

### Before We Leave (2020) — Hex City Builder on Small Planets
- Hex grid MAPPED ONTO sphere — proves tile grids work on spheres
- Camera orbits around planet
- Very readable at game zoom
- Multiple planets you expand to
- **Pro:** Proves hex/square tile grids render well on sphere geometry
- **Con:** Small planet, no "horizon curving away" drama
- **Relevance:** HIGH — closest to our use case (tile-based strategy on sphere)

### Civilization Revolution 1&2 (2008/2014) — The Original Reference
- Flat tile grid with cylindrical curvature baked in
- Camera pans (wraps east-west), bounded north-south
- Surface curves away at horizon creating depth
- NOT actually a sphere — curved plane hack
- **Pro:** Curvature creates depth, wrapping creates infinity
- **Con:** Visible top/bottom boundaries, still fundamentally a flat map
- **Relevance:** What we're currently trying to emulate (badly)

### Spore (2008) — Creature/Civ Game, Planet Phase
- Civilization stage on a small globe
- Camera orbits freely, units walk on sphere
- Buildings snap to surface
- **Pro:** Simple and intuitive
- **Con:** Very simplified compared to real 4X

### Google Earth — Gold Standard for Sphere Navigation
- Seamless zoom from space to street level
- Drag to rotate globe
- At close zoom = flat map feel. At far zoom = clearly sphere.
- **Pro:** Seamless LOD, intuitive controls, the feel we want
- **Relevance:** Navigation model to study — smooth orbit + zoom

---

## Approach Analysis for Syntheteria

### What Syntheteria Needs
- Turn-based 4X (not real-time tracking)
- See ~20-30 tiles around units at game zoom
- Select individual units, buildings, tiles
- Storm dome overhead (player is INSIDE the dome)
- Wormhole eye at zenith (always above)
- Labyrinth corridors and rooms readable at game zoom
- The surface is ALL city — no ocean, no terrain variety (ecumenopolis)

### Recommended: Planetary Annihilation + Before We Leave Hybrid

**Planet radius:** Large. At game zoom, curvature is subtle — just visible at the horizon. You feel like you're on a vast planet, not a tiny asteroid. R = large enough that a 64-tile board subtends ~60-90° of the sphere.

**Camera system:**
- Orbit around planet center (like PA and Universim)
- Drag = rotate planet under camera (not pan on flat plane)
- Scroll = zoom (change orbit radius)
- Close zoom: surface fills screen, curvature barely perceptible, labyrinth corridors readable
- Medium zoom: visible horizon curve, can see multiple districts
- Far zoom: significant chunk of planet visible, labyrinth resolves to procedural texture

**Coordinate system on sphere:**
- Tiles are NOT visual shapes. They are GPS coordinates (lat/long) — invisible data points.
- No requirement for square or hex visual shapes.
- Models snap to GPS positions on the sphere surface.
- The labyrinth generator outputs a CONNECTIVITY GRAPH: which positions are walls, passable, connected.
- A "corridor" = connected GPS points. Renderer draws corridor-shaped mesh between them on the sphere.
- A "room" = region defined by boundary coordinates. Renderer fills with floor mesh, walls at boundary.
- The visual SHAPE of structures adapts to the sphere surface — no tile grid artifacts.
- At game zoom, the surface looks like an industrial city. Not a grid of tiles.

**LOD transition (like Google Earth):**
- Far: procedural ecumenopolis shader (already built for title screen)
- Medium: PBR atlas textures per biome region
- Close: PBR textures + GLB structure models + units
- Blend between LODs based on camera distance

**Storm dome:**
- BackSide sphere around the planet (already built for title screen)
- At surface level, the dome is the sky — you look UP and see storm clouds
- Wormhole eye at zenith = the north pole of the storm sphere
- Lightning effects play on the dome interior

### What Changes from Current Architecture

| Component | Current | Sphere |
|-----------|---------|--------|
| Board geometry | Flat plane + cosine hack | SphereGeometry with tile UV mapping |
| Camera | OrbitControls PAN mode | OrbitControls ROTATE mode, target = sphere center |
| "Panning" | Camera translates | Planet rotates under camera |
| Board edges | Ghost tiles + HDRI + fog | None — sphere has no edges |
| Coordinates | (x, z) flat | (lat, long) → 3D sphere position |
| Title → Game | Separate scenes | Same sphere, camera zooms in |
| Storm dome | Separate BackSide sphere in GameScreen | Same storm sphere from title, now you're INSIDE it |
| Fog | FogExp2 on flat plane | Distance-based on sphere surface (fog at horizon = natural) |
| Horizon | Board edge fades to HDRI | City surface curves over the horizon — MORE city, not sky |

### What DOESN'T Change
- All ECS systems, game logic, AI — coordinate-based
- Board generator — produces flat grid, projection is rendering
- PBR atlas textures
- GLB models
- UI overlay
- Tests

---

## Implementation Phases

### Phase 1: Sphere Geometry + Camera (Core)
- Replace `buildBoardGeometry()` with sphere projection
- Switch camera to orbit mode (target = sphere center)
- Delete ghost tiles, curvature hack, CURVE_STRENGTH
- Verify: labyrinth is readable on sphere at game zoom

### Phase 2: Title → Game Transition
- Landing page: Earth continents (uGrowth=0)
- INITIALIZE: ecumenopolis growth cinematic (uGrowth 0→1)
- Camera zooms to surface during growth
- Same sphere throughout — no scene switch

### Phase 3: LOD System
- Far zoom: procedural shader (title screen quality)
- Close zoom: PBR atlas + GLB models
- Smooth blend between LODs

### Phase 4: Storm Dome Integration
- Reuse title screen storm sphere as game sky
- Player is INSIDE the dome
- Wormhole eye visible at zenith from surface
- Lightning illuminates the surface periodically
