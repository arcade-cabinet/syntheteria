# Full 3D Sphere Brainstorm

> Transition from 2.5D isometric board to full 3D on a sphere surface.
> The player is ON the planet, not looking DOWN at a board.

---

## 1. Camera + Rendering Approach

### The Core Shift

Currently: `IsometricCamera` at ~54-76 degrees from zenith, fixed angle, no rotation.
`BoardRenderer` builds a flat mesh with cosine-curvature hack (`CURVE_STRENGTH = 0.0008`).
`StormDome` is a BackSide sphere (r=300) wrapping the board. Player looks DOWN at tiles.

Target: Camera orbits a point ON the sphere surface. Player sees the world from
roughly eye level. The ecumenopolis stretches to the horizon in all directions.
The storm dome is the SKY ABOVE, not a decorative wrapper.

### Camera System: Sphere-Orbiting Strategy Camera

**Reference games:** Planetary Annihilation (free orbit around planet), The Universim
(surface-close with smooth zoom to planet), Before We Leave (hex sphere with tilt),
Supreme Commander (strategic zoom from ground to space), Google Earth (seamless
street-to-orbit).

**Recommended approach: Dual-mode orbit camera with seamless zoom.**

The camera focal point is always a point on the sphere surface. The camera orbits
around this point at a variable distance and polar angle.

| Zoom Level | Distance | Polar Angle | What You See |
|------------|----------|-------------|--------------|
| Street | 5-15 units | 15-30 deg from surface | A few units at near-eye level. Structures tower above. Infrastructure detail visible. |
| Neighborhood | 15-40 units | 30-50 deg | A city block. ~10x10 tiles visible. Good for tactical unit management. |
| District | 40-80 units | 50-65 deg | Multiple blocks. Territory colors visible. Strategic planning range. |
| Planet | 80-300 units | 65-85 deg | Whole hemisphere. Overview mode. Curvature obvious. |

**Implementation plan:**

Replace `IsometricCamera` with `SphereOrbitCamera`:
- Use `OrbitControls` with `enableRotate = true` (azimuth AND elevation).
- The "target" is always projected onto the sphere surface.
- As camera zooms out, polar angle auto-adjusts (closer = more horizontal, farther = more overhead).
- At max zoom, camera is directly above the sphere = traditional 4X overhead view.
- At min zoom, camera is near-horizontal = surface exploration view.

**Azimuth rotation:** Unlike the current locked-angle isometric, rotation is REQUIRED
for a sphere. You need to look in every direction. But compass indicator in HUD keeps
orientation clear.

**Pan:** Dragging rotates the sphere under the camera (like Google Earth). The focal
point slides along the sphere surface. WASD translates along the sphere's local
tangent plane at the focal point.

**Key technical challenges:**
1. OrbitControls target must always lie on the sphere surface (project after every update).
2. Model orientation: every model needs to be oriented along the sphere normal at its
   position. `lookAt(sphereCenter)` with `up = localNorth` for each placed object.
3. Raycasting: currently hits a flat plane. Must raycast against the sphere geometry
   or use analytic ray-sphere intersection.

### Unit Selection at Surface Level

Click-to-select still works, but visual indicators need to be more prominent:

- **Selection ring:** Current `ReadinessRing` (cyan ring at Y=0.15) needs to be
  projected onto the sphere surface and made larger. At surface level, a flat ring
  is barely visible. Consider a cylindrical selection column or billboard sprite.
- **Faction-colored outline:** Post-processing outline shader on selected unit.
  Three.js `OutlinePass` or custom stencil buffer approach.
- **Hover highlight:** When pointer hovers over a unit, show a subtle glow or
  scale-up animation. Currently no hover feedback exists.
- **Name plates:** Billboard text above units showing unit type + faction.
  At surface level, you can't tell units apart by top-down silhouette alone.

### Fog of War from Surface Level

Current: Dark overlay tiles on unexplored areas. Binary explored/unexplored.

On a sphere at surface level, fog of war becomes **literal atmospheric fog**:

- **Near fog:** Clear air within scan range. All structures, units, terrain visible.
- **Mid fog:** Beyond scan range, structures fade into haze. Silhouettes visible but
  details lost. Color desaturates toward the storm-dome ambient color.
- **Far fog:** Beyond 2x scan range, everything is obscured. The storm dome's clouds
  blend with the ground haze.
- **Implementation:** Three.js `FogExp2` already exists in the scene. Adjust fog
  density dynamically based on the player faction's explored tiles. Tiles outside
  explored range get a fog multiplier. This is more immersive than a dark overlay.
- **Edge case:** When zoomed to planet view, fog of war returns to a traditional
  overlay (dark areas on the sphere surface). Seamless transition between the two
  representations at medium zoom.

### Minimap

Current: `Minimap` component shows a 2D overhead view with territory colors.

On a sphere:

- **Option A: Mini-globe** in the corner. A small rotating 3D sphere showing the whole
  planet with faction territory colors painted on the surface. Camera position indicated
  by a cone/frustum projected onto the globe. Click the globe to pan the main camera.
  This is the most thematic option.
- **Option B: Mercator projection** — unwrap the sphere to a 2D rectangle. Traditional
  4X minimap. Distortion at poles but familiar to players.
- **Recommendation:** Mini-globe. Syntheteria is set on a sealed planet. The globe
  reinforces "you're on a planet." The globe rotates to match the camera orientation.

### Strategic Zoom (Supreme Commander Style)

The killer feature: seamless zoom from street level to planet view.

- At **street level**, render full-detail GLB models, PBR materials, shadows.
- At **neighborhood level**, reduce detail: no wall surface details, simpler shadows.
- At **district level**, replace individual structures with simplified block geometry
  or colored territory tiles. Units become faction-colored dots.
- At **planet level**, the sphere surface shows only territory colors and major
  landmarks (bases, wormhole). Individual tiles not visible.

This requires an LOD system (see Section 3).

---

## 2. Model Audit: 3D Readiness Assessment

### Robots (9 models) — `/assets/models/robots/`

| Model | File | Role |
|-------|------|------|
| ReconBot | factions/ReconBot.glb | Scout |
| FieldFighter | factions/FieldFighter.glb | Infantry |
| Arachnoid | factions/Arachnoid.glb | Cavalry |
| QuadrupedTank | factions/QuadrupedTank.glb | Ranged |
| Companion-bot | factions/Companion-bot.glb | Support |
| MobileStorageBot | factions/MobileStorageBot.glb | Worker |
| MechaTrooper | cult/MechaTrooper.glb | Cult Infantry |
| MechaGolem | cult/MechaGolem.glb | Cult Ranged |
| Mecha01 | cult/Mecha01.glb | Cult Cavalry |

**3D Surface View Assessment:**

- **Works as-is?** YES. These are full 3D models designed to be viewed from any angle.
  They are the strongest category for the transition.
- **Scaling:** Currently scaled to fill ~90% of a tile (`TILE_SIZE_M * 1.4 / maxExtent`).
  At surface level, robots need to be LARGER relative to structures to be visually
  readable. The current scaling formula in `UnitRenderer.tsx:64` works but the 1.4x
  multiplier may need to increase to ~2.0x for surface-level prominence.
- **Materials:** Use `MeshStandardMaterial` via GLB. Will respond to IBL lighting
  (drei `Environment` preset already in scene). The `applyIndustrialMaterials()`
  darkening used for structures should NOT be applied to robots — they should be
  bright and readable.
- **Faction tinting:** Currently only via `FACTION_COLORS` point light glow at
  Mark III+. At surface level, robots need direct material color tinting or decal
  overlays to distinguish factions. A colored accent pass on specific mesh parts
  (shoulder plates, chassis panels) would be ideal.
- **Animations:** Currently STATIC. At surface level, static robots look lifeless.
  **Needed: idle animations** (subtle bobbing, head scanning, hydraulic cycling).
  Walk/move animations would also improve movement lerp (currently instant teleport
  with lerp interpolation). Attack animations are nice-to-have.
- **Orientation on sphere:** Must face along sphere surface tangent. Currently placed
  at flat Y. Need `quaternion.setFromUnitVectors(UP, sphereNormal)` for each unit.

**Verdict: Ready for 3D. Need idle animations and sphere-surface orientation.**

### Structures (73 models) — `/assets/models/structures/`

KayKit Sci-Fi modular building set. Walls, columns, floors, roofs, details.

| Sub-category | Count | Models |
|-------------|-------|--------|
| Solid walls | 6 | Wall_1 through Wall_5, Wall_Empty |
| Window walls | 8 | Window_Wall, SmallWindows, LongWindow, ThreeWindows (Side A/B) |
| Door walls | 6 | DoorSingle, DoorDouble, DoorSingleLong, DoorDoubleLong (Side A/B) |
| Standalone doors | 2 | Door_Single, Door_Double |
| Columns | 4 | Column_1 through Column_3, Column_Slim |
| Floor tiles | 7 | FloorTile_Basic (x2), Empty, Side, Corner, InnerCorner, Hallway |
| Roof tiles | 12 | RoofTile_Empty, Plate (x2), Details, SmallVents, Vents, OrangeVent, Pipes (x2), Sides_Pipes, Corner_Pipes, InnerCorner_Pipes |
| Surface details | 26 | Details_Arrow, Basic, Cylinder, Dots, Hexagon, Output, Pipes, Plate, Triangles, Vent, X variants |
| Misc | 2 | Pipes, Staircase |

**3D Surface View Assessment:**

- **Works as-is?** PARTIALLY. These are modular pieces designed for construction.
  From surface level, walls and doors look GREAT — they're full 3D with both sides
  modeled (Side A/B variants exist for this reason). Columns are cylindrical, fine
  from any angle.
- **Floor tiles:** Currently under the camera, barely visible from top-down. On a
  sphere at surface level, floor tiles become the GROUND the player walks on.
  They are MORE visible and MORE important. The 7 floor variants provide good variety.
- **Roof tiles:** Currently above the camera, invisible. On a sphere at surface
  level, roofs are visible when looking at a building from the side or from a
  distance. The 12 roof variants with pipes, vents, and details add excellent
  skyline variety.
- **Surface details (26 models):** These are wall-mounted decorative panels (arrows,
  vents, hexagons, pipes, plates). At surface level, they add enormous visual
  richness to building facades. Currently placed by `StructureRenderer` at structural
  edges. From eye level, these details make buildings look lived-in and industrial.
  **These are a major asset for the 3D transition.**
- **Scaling on sphere:** Walls need to align with sphere surface normals. The
  `StructureRenderer` currently places walls at structural edges with cardinal
  rotations. On a sphere, each wall segment needs orientation along the local
  tangent plane.
- **What's missing:** No interior detail visible through windows. From surface level,
  looking through Window_Wall shows empty space. Interior props (computers, shelves)
  from the salvage set could be placed behind window walls.

**Verdict: Strong for 3D. Wall details and roof tiles become MORE useful. Need
sphere-surface alignment and consider window interiors.**

### Buildings (25 models) — `/assets/models/buildings/`

Space Colony building set. Complete standalone structures.

| Sub-category | Count | Models |
|-------------|-------|--------|
| Base modules | 6 | basemodule_A through E, garage |
| Cargo depots | 3 | cargodepot_A through C |
| Colony homes | 4 | Main_house (1/2/3 lv), Home_colonists |
| Production | 5 | Machine_building_plant, Research_center, Resource_warehouse, Farm, Farm_module |
| Power | 5 | Reactor, Reactor_add, Geothermal_generator, Solar_generator, Solar_panel |
| Drone facilities | 2 | Drone_control_center, Drone_charging_station |

**3D Surface View Assessment:**

- **Works as-is?** YES. These are complete 3D buildings designed for sci-fi colony
  games. They have proper silhouettes from all angles. The multi-level Main_house
  variants (1lv, 2lv, 3lv) provide vertical variety that is invisible from top-down
  but dramatic from surface level.
- **Scaling:** Currently scaled to fill 90% of a tile (`TILE_SIZE_M * 0.9 / maxExtent`
  in `BuildingRenderer.tsx:59`). At surface level, buildings should be TALLER — they
  define the skyline. The 0.9x fill factor may need to increase, or buildings could
  span multiple tiles for larger footprints.
- **Materials:** GLB-embedded. Will respond to IBL. May need the same industrial
  darkening treatment as structures (`applyIndustrialMaterials`).
- **Interior detail:** Some buildings (Main_house, Research_center) likely have
  window openings. From surface level, visible interiors add immersion. Worth
  checking in Blender whether any have interior geometry.
- **Orientation:** Must align to sphere surface normal. Building "up" must point
  away from sphere center.

**Verdict: Excellent for 3D. These are the strongest building assets. Multi-level
variants create a real skyline.**

### Props/Salvage (~90 models) — `/assets/models/props/`, `city/`, `industrial/`

Split across three directories: city props (KayKit), industrial props (sci-fi blend),
and general props (Space Colony).

| Sub-category | Source | Count | Examples |
|-------------|--------|-------|---------|
| City props | city/ | 16 | Chest, Container, Crate, Computer, Pod, Statue, Teleporter, Laser |
| Industrial | industrial/ | 22 | Barrel, Computer, Conveyor, Scanner, TV, Chimney, Robot Arms |
| Props pack | props/ | 33 | Cargo, Containers, Shelves, Vessels, Landers, Drones, Tracks, Roof modules |

**3D Surface View Assessment:**

- **Works as-is?** YES. These are 3D objects designed to populate environments.
  At surface level, they add the visual density that makes the ecumenopolis feel
  like a real place rather than a board game.
- **Scaling:** Currently at 80% of tile (`TILE_SIZE_M * 0.8 / maxExtent` in
  `SalvageRenderer.tsx:43`). Some props (barrels, crates) should be much smaller
  than a tile. Others (landers, transporters) could be larger. Need per-category
  scale factors rather than one-size-fits-all.
- **Key surface-level props:**
  - **Conveyors, robot arms, scanners:** Perfect for creating industrial corridors
    that the player walks through. Currently just salvage loot — could also be
    environmental decoration.
  - **TVs, computers:** Add to interior spaces behind window walls.
  - **Barrels, crates, containers:** Stack and cluster for warehouse/storage areas.
  - **Drones, landers, transporters:** Larger props that create landmarks visible
    from a distance.
  - **Roof modules, solar panels:** Already named for rooftop placement.
- **What's missing:** Scale variety. Currently all props normalize to the same
  tile fraction. Need small/medium/large scale categories.

**Verdict: Strong for 3D. Need per-model scale tuning and potential dual use as
both salvage loot AND environmental decoration.**

### Infrastructure (~48 models) — `/assets/models/infrastructure/`

| Sub-category | Count | Models |
|-------------|-------|--------|
| Pipes | 11 | straight, corner, cross, split, end, entrance, ring, supportHigh/Low, industrial_pipes, airduct |
| Supports/Cables | 6 | Support, Support_Long, Cable_Long, Cable_Thick, structure_low, structure_tall |
| Gateways | 6 | Connecting_gateway (regular, corner, long), Section, Section_door, Cross_section |
| Monorail | 4 | trackStraight, trackCornerLarge, trackSlope, trackSupport |
| Tunnels | 2 | tunnel_straight_A, tunnel_straight_B |
| Antennas | 6 | Antenna_1, Antenna_2, satelliteDish (x3), machine_wireless |
| Lights | 3 | lights, street_lamp, industrial_wall_lamp |
| Power | 7 | power_box, solarpanel, windturbine, machine_generator (x2), exterior_aircon, drill_structure |
| Landing pads | 2 | landingpad_small, landingpad_large |
| Decon | 1 | Decontamination_section |

**3D Surface View Assessment:**

- **Works as-is?** YES. This is the BEST category for the 3D transition.
  Infrastructure models are designed to fill corridors and outdoor spaces. At surface
  level, pipe networks running along walls, cables spanning between structures,
  monorail tracks overhead, and street lamps lighting corridors create the
  dense industrial atmosphere that IS the ecumenopolis.
- **Pipes:** 11 variants including corners, crosses, splits, supports. These can
  form connected pipe networks running along corridor walls and ceilings. At
  surface level, they create visual overhead that frames the player's view.
- **Gateways:** Connecting_gateway models are corridor connectors. From surface
  level, walking through a gateway feels like entering a new district.
- **Monorail:** 4 track segments (straight, corner, slope, support). An overhead
  monorail system is invisible from top-down but creates dramatic visual depth from
  surface level. These are a major untapped asset.
- **Antennas/dishes:** Rooftop and structure-top decorations. From surface level,
  they create a rich skyline with communication arrays and sensor dishes.
- **Lights:** Street lamps and wall lamps. At surface level, these could be actual
  light sources (point lights or spotlights), not just decorative geometry.
- **Missing renderer:** There is NO `InfrastructureRenderer` yet. These models
  are defined in `modelPaths.ts` but not placed in the scene. Building one is a
  prerequisite for both the current 2.5D view and the 3D transition.

**Verdict: Perfect for 3D. Highest-impact category. Needs a renderer to be built.
Pipe networks, monorail tracks, and street lamps transform the surface view.**

### Exploration (15 models) — `/assets/models/exploration/`

| Sub-category | Count | Models |
|-------------|-------|--------|
| Collectibles | 3 | Collectible_Gear, Collectible_Board, Lootbox |
| Terrain features | 10 | crater (x2), meteor (x2), rock_crystals (x3), rocks_small (x2), bones |
| Hangars | 2 | hangar_largeA, hangar_smallA |

**3D Surface View Assessment:**

- **Works as-is?** YES. Terrain features (craters, meteors, crystal formations)
  are visible from any angle. From surface level, a large crystal formation or
  meteor crater becomes a dramatic landmark.
- **Hangars:** These are large enclosed structures. From surface level, they're
  significant landmarks that the player can approach and explore.
- **Scaling:** Craters and rock formations may need to be larger on the sphere
  surface to be visible at surface-level camera distances.

**Verdict: Ready for 3D. Exploration landmarks are more impactful from surface level.**

### Structural Platforms (15 models) — `/assets/models/structural/`

| Sub-category | Count | Models |
|-------------|-------|--------|
| Platforms | 4 | platform_center, corner, large, high |
| Columns | 3 | Column_Simple, MetalSupport, Pipes |
| Props | 3 | Prop_Vent_Big, Vent_Small, AccessPoint |
| Supports | 4 | supports_high, supports_low, structure_detailed, structure_closed |
| Base | 1 | structure (generic) |

**3D Surface View Assessment:**

- **Works as-is?** YES. Platforms and supports create vertical layering. From
  surface level, elevated walkways with support columns underneath create dramatic
  multi-level environments.
- **Key for 3D:** The platform models enable elevated walkways, catwalks, and
  bridges between structures. Currently placed by the depth system for elevation
  transitions. On a sphere, these create the vertical density of an ecumenopolis.
- **Columns:** Three column variants (Simple, MetalSupport, Pipes) support elevated
  platforms. From surface level, walking under elevated platforms with columns
  creates a very immersive "underground city" feel.

**Verdict: Excellent for 3D. Vertical layering is invisible from top-down but
transformative from surface level.**

### Defense (18 models) — `/assets/models/defense/`

| Sub-category | Count | Models |
|-------------|-------|--------|
| Turrets | 5 | Turret_Cannon, Turret_Gun, Turret_GunDouble, turret_single, turret_double |
| Barriers | 8 | wall-low, Fence, chainlink_fence, concrete_barrier, barricade-window (x2), barricade-doorway (x2) |
| Gates | 2 | gate_simple, gate_complex |
| Misc | 3 | Sign_Corner_Hazard, security_camera |

**3D Surface View Assessment:**

- **Works as-is?** YES. Defense models are designed for 3D environments.
- **Turrets:** From surface level, turrets mounted on walls and rooftops are
  intimidating and clearly communicate "defended area." They have good silhouettes.
- **Barriers:** Barricades, fences, and low walls are eye-height obstacles. From
  surface level, they define defended perimeters and choke points. The barricade
  models with window and doorway cutouts suggest defensive positions.
- **Gates:** Entry points to defended areas. From surface level, approaching a
  gate complex with turrets overhead creates a strong visual moment.
- **Security cameras:** At surface level, these are small but atmospherically
  important. They suggest surveillance and control.

**Verdict: Strong for 3D. Defense structures become more meaningful from
surface level. Turrets on walls and gates create impactful visual moments.**

### Logistics (11 models) — `/assets/models/logistics/`

| Sub-category | Count | Models |
|-------------|-------|--------|
| Boxes | 4 | box-small, wide, large, long |
| Craft | 3 | craft_cargoA, cargoB, miner |
| Doors | 3 | door-wide-open, door-wide-closed, rollershutter_door |
| Vehicle | 1 | rover |

**3D Surface View Assessment:**

- **Works as-is?** YES. Boxes are generic props. Craft models (cargo ships, miner)
  are parked vehicles that add visual variety. The rover is a ground vehicle.
- **Doors:** The wide door and rollershutter models are warehouse/hangar doors. From
  surface level, open doors invite exploration while closed doors suggest barriers.
- **Craft:** Parked cargo ships at landing pads create excellent surface-level
  landmarks. Combined with `landingpad_large/small` from infrastructure, they
  create spaceport zones.

**Verdict: Ready for 3D. Combine craft + landing pads for spaceport areas.**

---

## 3. Blender Pipeline Work Needed

### 3.1 LOD System (Critical for Performance)

At surface level, the camera can potentially see hundreds of models at once, with
nearby models at high detail and distant models as dots. Current approach: every
model loads at full detail. This will not scale.

**LOD strategy (3 tiers):**

| Tier | Distance | Render |
|------|----------|--------|
| LOD0 | 0-30 units | Full GLB model, PBR materials, shadows |
| LOD1 | 30-80 units | Simplified geometry (50% poly count), no shadows |
| LOD2 | 80+ units | Colored box/billboard sprite, no geometry |

**Pipeline work:**
- Each GLB model needs LOD1 variant (Blender Decimate modifier, 50% reduction).
- LOD2 can be generated procedurally (bounding box + average color).
- Three.js `LOD` object handles distance-based switching natively.
- For 360 models, this is ~360 Blender batch operations. Script with headless Blender.

**Estimated effort:** 1-2 days for the batch decimation script + integration.

### 3.2 UV/Material Fixes for IBL Lighting

**Current state:** Most models use embedded PBR materials (metallic-roughness) from
their source packs (KayKit, Space Colony, sci-fi blends). These respond to IBL
via the drei `Environment` preset already in the scene.

**Potential issues on sphere:**
- `applyIndustrialMaterials()` in `StructureRenderer.tsx:51` darkens ALL structure
  materials uniformly (`multiplyScalar(0.35)`). On a sphere with IBL, this may make
  structures too dark when lit from the side. Need to test with sphere lighting.
- Some KayKit models have very flat albedo (designed for stylized rendering). Under
  realistic IBL, they may look washed out. Consider adding slight roughness/metalness
  variation per material.
- All GLBs have embedded textures (confirmed by pipeline). No separate texture
  loading needed.

**Pipeline work:** Mostly runtime material adjustments, not Blender work. Test each
category under sphere IBL lighting and tune material parameters.

**Estimated effort:** 0.5 days testing, material parameter tuning in renderers.

### 3.3 Robot Animations (High Impact)

**Current state:** All 9 robot models are STATIC meshes. No armature, no animations.
The `UnitRenderer` uses `Clone` and position lerp for movement.

**Needed animations (priority order):**

1. **Idle** (all 9 models) — subtle motion so robots don't look frozen. Hydraulic
   cycling, head scanning, weight shifting. 2-4 second loop. **HIGH PRIORITY.**
2. **Walk/move** (all 9) — leg/wheel/hover movement during position lerp. Currently
   the model teleports along the lerp path. With walk animation, movement feels
   natural. **HIGH PRIORITY.**
3. **Attack** (6 faction models) — weapon fire, melee strike. Currently attack is
   a number that resolves instantly. With animation, combat is dramatic. **MEDIUM.**
4. **Death** (all 9) — collapse, explosion, power-down. Currently entities just
   disappear. **MEDIUM.**
5. **Fabrication** (worker only) — building animation when placing structures. **LOW.**

**Pipeline work:**
- Each model needs rigging (armature setup) in Blender.
- Animation clips exported as GLB actions.
- Runtime: replace `Clone` with `useAnimations` from drei. Switch clips based on
  unit state (idle, moving, attacking, dying).
- The Arachnoid (cavalry) and QuadrupedTank (ranged) have multi-leg rigs that are
  more complex to animate. Start with bipedal models (FieldFighter, MechaTrooper).

**Estimated effort:** 2-4 days per model for rigging + animation. 9 models = 3-5
weeks of focused Blender work. Consider starting with idle + walk for the 6 faction
bots (most visible) and deferring cult mechs.

### 3.4 Building Interiors

**Current state:** Buildings are solid shells. Some have window openings but no
interior geometry.

**For surface-level view:** Looking through windows shows empty voids. This breaks
immersion.

**Options (least to most effort):**
1. **Dark interior shader:** Apply a dark emissive material to the inside of window
   openings. Suggests a lit interior without geometry. **Cheapest, looks decent.**
2. **Interior plane with texture:** A flat textured quad behind each window showing
   a stylized interior scene (computer screens, shelves). Billboard approach. **Medium.**
3. **Actual interior geometry:** Place salvage props (computers, shelves, pods)
   inside building shells. Most immersive but highest performance cost. **Expensive.**

**Recommendation:** Option 1 (dark interior shader) for v1. Option 2 for polish pass.

**Estimated effort:** Option 1: 0.5 days. Option 2: 1-2 days.

### 3.5 New Models Needed

**Sphere-specific models that don't exist yet:**

| Model | Purpose | Priority |
|-------|---------|----------|
| Sphere-surface ramps | Transitions between elevation layers on curved surface | HIGH |
| Vertical structure connectors | Bridges/skyways between elevated platforms at height | HIGH |
| Curved pipe segments | Pipes that follow sphere curvature for long runs | MEDIUM |
| Foundation/base plates | Flat plates that sit flush on sphere surface (compensate curvature) | MEDIUM |
| Atmospheric particles | Volumetric fog patches, steam vents, dust clouds | LOW (shader) |
| District boundary markers | Visual indicators of district zones from surface level | LOW |

**Ramp models are the highest priority.** The current `Staircase.glb` model is
designed for flat-board elevation transitions (depth 0 to depth 1). On a sphere,
elevation transitions happen on a curved surface. The staircase model needs a curved
variant or the placement code needs to bend it to match local sphere curvature.

**Vertical connectors:** Currently `platform_high` and `supports_high` provide
elevated walkways. On a sphere, these need to connect between sphere-surface
structures at different altitudes. Skyway/bridge models that span gaps would make
the ecumenopolis feel vertically dense.

### 3.6 Texture Status

**All 360 GLBs have embedded textures.** Confirmed by the asset pipeline convention
(packed via Blender export). No separate texture loading needed.

PBR atlas textures for the terrain shader live in `/assets/textures/` (8 AmbientCG
packs). These are for the board surface, not for models. On a sphere, the terrain
shader needs adaptation:

- Current: UV-based tiling on flat geometry.
- Sphere: Triplanar projection to avoid UV distortion at poles. Or cubemap projection.
- The existing PBR atlas shader in `heightMaterial.ts` uses custom GLSL with `uCurve`
  for the cosine hack. On a sphere, this shader needs a full rewrite for spherical
  UV mapping.

### 3.7 Summary of Pipeline Priorities

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| InfrastructureRenderer (code, not Blender) | HIGH — 48 models unused | 2-3 days | P0 |
| LOD generation (batch Blender script) | HIGH — performance gating | 1-2 days | P0 |
| Robot idle animations (6 faction bots) | HIGH — lifeless at surface level | 2-3 weeks | P1 |
| Sphere-surface model orientation (code) | HIGH — everything tilts wrong | 1-2 days | P0 |
| Robot walk animations (6 faction bots) | MEDIUM — movement feels fake | 2-3 weeks | P1 |
| Terrain shader rewrite for sphere UVs | HIGH — ground looks broken | 3-5 days | P0 |
| Per-model scale tuning | MEDIUM — props too uniform | 1 day | P1 |
| Dark interior shader for windows | LOW — cosmetic | 0.5 days | P2 |
| Robot attack/death animations | MEDIUM — combat feels flat | 2-3 weeks | P2 |
| New sphere-surface ramp models | MEDIUM — elevation transitions | 1-2 days | P1 |
| Vertical skyway/bridge models | LOW — polish | 1-2 days | P2 |

---

## 4. Architecture Migration Plan

### What Changes

| System | Current | Sphere |
|--------|---------|--------|
| Board geometry | `buildBoardGeometry()` flat mesh + cosine hack | `buildSphereGeometry()` tiles mapped to SphereGeometry |
| Camera | `IsometricCamera` fixed-angle pan/zoom | `SphereOrbitCamera` free orbit + seamless zoom |
| Model placement | `position={[x * TILE_SIZE_M, y, z * TILE_SIZE_M]}` | Position on sphere surface + orientation to normal |
| Raycasting | `ray.intersectPlane(groundPlane)` | `ray.intersectSphere(sphere)` or raycast geometry |
| Fog of war | Binary explored/unexplored overlay | Distance-based atmospheric fog + overlay hybrid |
| Terrain shader | `heightMaterial.ts` with `uCurve` cosine | Spherical UV projection, triplanar texturing |
| StormDome | BackSide sphere r=300, decorative | SKY sphere, player is INSIDE looking up |
| Minimap | 2D overhead rectangle | Mini-globe in corner |
| Highlights | Flat ring geometry at Y=0 | Ring conforming to sphere surface |

### What Stays the Same

- ECS (Koota traits, systems, queries) — game logic is geometry-agnostic.
- Model registry (`modelPaths.ts`) — paths don't change.
- Click-to-select state machine — just the raycast target changes.
- Faction colors, combat, economy, AI, save/load — all logic layers.
- GLB models themselves — no modification needed (except animations).

### Migration Order

1. **SPHERE-1:** `buildSphereGeometry()` — map tile grid to sphere
2. **SPHERE-2:** `SphereOrbitCamera` — replace IsometricCamera
3. **SPHERE-3:** Model placement — all renderers snap to sphere surface
4. **SPHERE-4:** Raycasting — click on sphere to get tile coordinates
5. **InfrastructureRenderer** — place the 48 unused infrastructure models
6. **LOD system** — performance gatekeeping for surface-level view
7. **Storm dome as sky** — player looks UP at storm, not at a decorative wrapper
8. **Fog of war on sphere** — atmospheric + overlay hybrid
9. **Robot animations** — idle + walk minimum viable
10. **Strategic zoom** — seamless street-to-planet camera transition
