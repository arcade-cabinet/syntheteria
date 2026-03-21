# Rendering Vision: Syntheteria

> Comprehensive design reference capturing POC findings and visual target for the rendering overhaul.
> Created 2026-03-19 from `poc-roboforming.html` prototype results.

---

## Stack Decision: Phaser + enable3d

The rendering stack is **Phaser 3.90.0 + @enable3d/phaser-extension 0.26.1**.

- **Scene3D** — Phaser scene with embedded Three.js renderer
- **Dual-canvas** — Phaser 2D canvas + Three.js WebGL canvas composited
- **DOM overlay** — HTML elements positioned over the game canvas for labels, HUD, modals

This replaces the R3F/React Three Fiber stack. Phaser provides the game loop, input handling, and scene management; enable3d provides the Three.js bridge for 3D terrain and models.

---

## What the POC Proved

`poc-roboforming.html` demonstrated that **vertex colors + flat shading + good lighting = CivRev2-tier visuals** without PBR textures or HDRI environment maps.

Key validations:
- Vertex-colored terrain with `MeshStandardMaterial({ vertexColors: true, flatShading: true })` looks clean and stylized
- Point lights with saturated colors (cyan, magenta) create atmosphere without environment maps
- FogExp2 at low density sells depth without obscuring gameplay
- GLB models load and render correctly at 2.5x scale with bob-and-weave procedural animation
- 4 models confirmed loading simultaneously without performance issues
- DOM label projection (Vector3.project → screen-space) works for hub names, HP, production counters

---

## Lighting Recipe

These exact values produced the best results in the POC:

| Light | Type | Color | Intensity | Notes |
|-------|------|-------|-----------|-------|
| Ambient | AmbientLight | `0x223344` | 0.6 | Deep blue-grey base, prevents pure-black shadows |
| Sun | DirectionalLight | `0xaaccff` | 0.8 | Cool blue-white, positioned high and angled |
| Accent 1 | PointLight | cyan | varies | Placed near roboformed areas for tech glow |
| Accent 2 | PointLight | magenta | varies | Placed near cult/corrupted zones for contrast |

**Fog:** `FogExp2(0x050a0f, 0.012)` — near-black blue, very low density

**Tone mapping:** NONE. The flat-shaded vertex color style looks best without tone mapping operators. ACESFilmic washes out the saturated accent colors.

---

## Visual Gaps Identified

### 1. Terrain Blending

**Problem:** Hard tile boundaries create visible seams between terrain types (grass→rock, sand→metal). Each tile is a flat-colored quad with no transition.

**Target:** CivRev2-style smooth biome transitions where tile edges blend into neighbors.

**Solutions to evaluate:**
- **Vertex color edge interpolation** — sample neighbor tile colors at shared vertices, average them. Cheapest option, works well for vertex-colored terrain.
- **Height-based splatmap blending** — texture splatmap where blend weights transition at tile boundaries. More complex but allows texture detail.
- **Barycentric shader blending** — Catlike Coding approach using barycentric coordinates for per-fragment blending. Most flexible, most expensive.

**References:**
- [Catlike Coding — Hex Map: Blending](https://catlikecoding.com/unity/tutorials/hex-map/part-2/)
- [Game Developer — Splatmap Terrain Blending](https://www.gamedeveloper.com/)
- Godot barycentric shader tutorials

### 2. Forest Canopy

**Problem:** Individual scattered tree models look sparse and unconvincing. Real forests read as a continuous canopy mass, not discrete objects.

**Target:** Polytopia / CivRev2 forest tiles where trees merge into a single "forest blob."

**Solutions to evaluate:**
- **Canopy blob mesh** — single merged convex mesh per forest tile, vertex-colored green, with 2-3 accent tree trunks poking through for silhouette variety
- **Ground-painted texture + accent trees** — dark green ground texture on forest tiles with a few scattered tree models for 3D depth
- **Billboard clusters** — camera-facing quads with tree cluster textures (cheapest, least convincing)

### 3. Elevation Drama

**Problem:** Sine noise produces smooth, subtle elevation changes. Hills and mountains don't read as distinct landforms.

**Target:** Chunky discrete platforms — hills are clearly raised plateaus, mountains are prominent 3D prominences that cast shadows and block line of sight.

**Solutions to evaluate:**
- **Discrete elevation levels** — quantize noise to 3-4 height steps (flat, hill, mountain, peak). Each step is a distinct plateau with cliff faces.
- **Extruded geometry** — mountain tiles get additional vertical geometry (cliff walls, stepped terraces) rather than just raised vertices.
- **Shadow-casting prominences** — ensure mountains cast long directional shadows to emphasize height difference even in top-down view.

### 4. Ocean Layers

Two distinct ocean types required:

#### Open Ocean (deep water between landmasses)
- Deep dark plane extending to horizon
- Subtle wave animation (vertex displacement or shader)
- Color: very dark blue/black (`0x050a14`)

#### Grid-Covered Ocean (explorable shallow areas)
- **Metallic grating mesh** — crosshatch pattern from `poc.html` using canvas-generated texture
- Shadow-casting grating over deep blue water underneath
- Deep blue underlighting (point lights below grating surface)
- Represents the machine lattice's ocean-floor infrastructure
- Player units can traverse this surface

---

## Roboforming Progression

5 levels of terrain transformation as factions develop tiles:

| Level | Name | Visual | Vertex Colors |
|-------|------|--------|---------------|
| 0 | Natural | Raw terrain (grass, rock, sand) | Original biome colors |
| 1 | Graded | Flattened, cleared vegetation | Desaturated earth tones |
| 2 | Paved | Smooth surface, basic infrastructure | Grey concrete with gridlines |
| 3 | Plated | Metal panels, conduit channels | Steel grey + faction accent |
| 4 | Armored | Fortified plating, turret mounts | Dark alloy + glowing faction trim |

Transitions between levels use vertex color interpolation — a tile at level 2.5 blends between Paved and Plated colors. The faction accent color appears at level 3+ as colored edge trim or glowing inset lines.

---

## Two-Landmass Concept

The game world has two major land areas separated by ocean:

1. **Ecumenopolis landmass** — fully roboformed, metal-plated, covered in faction infrastructure. This is where the player starts. Dense urban machine landscape, level 3-4 roboforming everywhere.

2. **Natural landmass** — early-stage terrain, mostly level 0-1. Forest canopies, rocky mountains, natural biomes. Expansion target with resource-rich but undeveloped territory.

3. **Ocean between** — combination of open ocean (impassable deep water) and grid-covered ocean (traversable machine lattice infrastructure with metallic grating).

This creates a natural early/mid/late game progression: start in the ecumenopolis → expand across the grating → colonize the natural landmass.

---

## Camera

- **Orthographic isometric** — no perspective distortion, classic strategy game view
- **Drag-pan** — click and drag to pan the camera across the map
- **Scroll-zoom** — mouse wheel zooms in/out
- **WASD rotate** — keyboard rotates the camera around the center point
- No free orbit — camera stays in isometric projection at all times

---

## DOM Label Projection

HUD labels (hub name, HP, production queue) are HTML elements positioned in screen space:

```typescript
// Project 3D world position to screen coordinates
const screenPos = worldPosition.clone().project(camera);
const x = (screenPos.x * 0.5 + 0.5) * canvas.width;
const y = (-screenPos.y * 0.5 + 0.5) * canvas.height;
// Position DOM element at (x, y)
```

This follows the CivRev2 approach: 3D world with DOM-overlay labels. Labels are always readable regardless of zoom level and can use standard CSS for styling.

---

## Model Placement

- GLB models rendered at **2.5x scale** relative to tile size
- **Bob-and-weave animation** — procedural sine-based oscillation for idle units (Wall-E style)
- 4 models confirmed loading simultaneously in POC without frame drops
- Models use original textures — **no faction tint** on robot meshes (faction identity via UI labels and base structures)

---

## POC Artifacts

| File | Purpose |
|------|---------|
| `poc-roboforming.html` | Primary POC — vertex colors, lighting, model loading, roboforming levels |
| `poc.html` | Ocean grating prototype — canvas crosshatch texture, shadow-casting metallic mesh |
| `poc_real_world.html` | Real-world terrain reference — natural biome colors and elevation |
| `poc-isometric.html` | Camera setup reference — orthographic isometric projection |

---

## Reference Material

### Games (visual targets)
- **Civilization Revolution 2** — primary visual target. Stylized 3D, clean terrain, readable from zoom. DOM-style labels over 3D world.
- **Polytopia** — forest canopy blobs, discrete elevation, clean low-poly aesthetic.
- **Humankind** — terrain blending between biomes, dramatic elevation changes.

### Technical references
- [Catlike Coding — Hex Map Blending](https://catlikecoding.com/unity/tutorials/hex-map/) — vertex color interpolation at cell boundaries
- [Godot Barycentric Shader](https://docs.godotengine.org/) — per-fragment blending using barycentric coordinates
- [Game Developer — Splatmap Terrain](https://www.gamedeveloper.com/) — texture splatmap approach for biome transitions

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| phaser | 3.90.0 | Game framework — loop, input, scenes |
| @enable3d/phaser-extension | 0.26.1 | Three.js bridge for Phaser scenes |
