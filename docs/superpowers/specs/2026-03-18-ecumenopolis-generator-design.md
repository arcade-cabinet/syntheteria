# Ecumenopolis Generator + PBR Texture Pipeline

**Date:** 2026-03-18
**Status:** Design — pending approval
**Scope:** Board generator rewrite, AmbientCG texture integration, abyssal platform rules, unit traversal

---

## 1. Problem Statement

The current board generator scatters floor types using layered Perlin noise with threshold bands. This produces random terrain with no structural coherence — it reads as "colored noise" not "planet-wide city." An ecumenopolis is a city that covers the entire planet. Every tile should feel like it belongs to an urban structure: streets between buildings, plazas at intersections, districts with character, infrastructure corridors, and sealed ocean zones with grating and bridges.

Additionally, the procedural GLSL patterns (hand-painted vec3 colors in fragment shaders) lack material depth. They're flat and samey under any lighting. Replacing them with real PBR textures from AmbientCG gives us normals, roughness, metalness, and displacement — the industrial detail that sells "machine city."

---

## 2. City Layout Generator

### 2.1 Algorithm: Recursive Block Subdivision

Replace noise-based terrain assignment with a structural city layout generator that produces recognizable urban geometry.

**Phase 1 — Macro Grid (Districts)**
- Divide the board into rectangular districts using recursive binary space partitioning (BSP)
- Minimum district size: 6x6 tiles. Maximum: 16x16.
- Each split creates a corridor (street) between the two halves: 1-2 tiles wide
- Corridors are always `transit_deck` (asphalt/concrete walkways)
- BSP depth: 3-5 levels depending on board size (44x44 = 3, 64x64 = 4, 96x96 = 5)

**Phase 2 — Block Interiors**
- Each terminal BSP leaf is a "city block"
- Block perimeter: `structural_mass` walls (1 tile thick) — these are the buildings
- Block interior: fill varies by district type (see 2.2)
- Leave 1-2 tile gaps in walls for doorways/access points (guaranteed at least 2 per block)
- Corner tiles of blocks are always `structural_mass` (structural pillars)

**Phase 3 — Street Network**
- BSP corridors form the primary street grid
- All corridor tiles: `transit_deck` (passable, concrete texture)
- Intersections (where corridors cross): `durasteel_span` (wider metal platform)
- Dead-end corridors get a small plaza (2x2 `durasteel_span`)

**Phase 4 — District Zoning**
Each BSP leaf gets assigned a zone type based on a seeded shuffle:
- **Industrial** (30%): interior = `durasteel_span`, scattered `collapsed_zone` rubble
- **Residential/Bio** (20%): interior = `bio_district`, overgrown old hab blocks
- **Dust/Abandoned** (20%): interior = `dust_district`, wind-scoured ash
- **Aero/Upper** (15%): interior = `aerostructure`, exposed upper platforms
- **Open/Plaza** (15%): interior = all `durasteel_span`, no interior walls — rare open spaces

**Phase 5 — Abyssal Zones (Geography Layer)**
- Geography noise (existing) determines which areas are "former ocean"
- Abyssal zones REPLACE entire BSP blocks — they don't blend into land blocks
- Coastline: the transition from land to abyssal follows BSP block boundaries (clean edges, not noise gradient)
- Within abyssal zones: grating floor with platform structures on top (see Section 4)

**Phase 6 — Elevation**
- `structural_mass` tiles: elevation 1 (they're walls/buildings, raised above walkways)
- Street/corridor tiles: elevation 0
- Abyssal grating: elevation -1 (below walkway level, see-through grates)
- Bridge tiles over abyssal: elevation 1, max 1 cell wide (existing constraint)

### 2.2 Connectivity Guarantee

After generation, run a flood-fill from the player spawn. Any passable tile NOT reachable gets a corridor punched through the nearest wall to connect it. No orphan areas.

### 2.3 Spawn Placement

- Player spawn: center of a large Industrial or Plaza district
- AI faction spawns: centers of districts in opposite quadrants (existing terrain-affinity logic applies, but now districts have character)
- Cult POI spawns: placed in Abandoned/Dust districts (thematically appropriate)

---

## 3. PBR Texture Pipeline

### 3.1 Texture Selection (AmbientCG 1K-JPG)

Each floor type maps to exactly one AmbientCG material pack. Maps used: Color, NormalGL, Roughness, Metalness. (Displacement deferred — adds vertex complexity.)

| Floor Type | AmbientCG Pack | Visual Character |
|---|---|---|
| `structural_mass` | **Metal032** | Brushed steel walls — clean industrial |
| `durasteel_span` | **Metal038** | Dark galvanized steel — workhorse floor |
| `transit_deck` | **Concrete007** | Poured concrete with panel lines — city streets |
| `collapsed_zone` | **Concrete034** | Rough patchy concrete — rubble fields |
| `dust_district` | **Asphalt004** | Fine-grain asphalt — wind-scoured surfaces |
| `bio_district` | **Metal025** | Corroded rust — organic decay on metal |
| `aerostructure` | **Metal036** | Dark weathered steel — storm-exposed |
| `abyssal_platform` | **Grate001** | Steel grating with opacity — see-through to void |
| `void_pit` | (no texture — pure black void below grating) | |

### 3.2 Texture Atlas Strategy

Ship 9 textures (8 floor types + void black) as a 3x3 texture atlas (3072x3072 at 1K per tile). Single texture bind, single draw call. The fragment shader uses the existing `TileFloor.floorIndex` attribute to select the UV region.

**Build step:** A Node script (`scripts/build-texture-atlas.ts`) composites the 9 Color maps into one atlas, and similarly for Normal/Roughness/Metalness. Output: 4 atlas files in `public/assets/textures/`:
- `floor_atlas_color.jpg`
- `floor_atlas_normal.jpg`
- `floor_atlas_roughness.jpg`
- `floor_atlas_metalness.jpg`

### 3.3 Shader Changes

Replace the procedural `floorFrag.glsl` (and all `patterns/*.glsl` includes) with a PBR texture-sampling shader:

```glsl
// Per-vertex attribute from TileFloor: which atlas cell (0-8)
attribute float floorIndex;

// In fragment shader:
vec2 atlasUV = computeAtlasUV(vWorldXZ, floorIndex, 3.0); // 3x3 grid
vec4 albedo = texture2D(uColorAtlas, atlasUV);
vec3 normal = texture2D(uNormalAtlas, atlasUV).rgb * 2.0 - 1.0;
float roughness = texture2D(uRoughnessAtlas, atlasUV).r;
float metalness = texture2D(uMetalnessAtlas, atlasUV).r;
```

Lighting uses the existing `applyLighting()` function but now receives PBR inputs instead of flat vec3 colors. The Reinhard tone mapping stays.

### 3.4 Abyssal Grating Special Case

`Grate001` has an **Opacity map** (`Grate001_1K-JPG_Opacity.jpg`). The fragment shader uses this for alpha cutout:
```glsl
float opacity = texture2D(uOpacityAtlas, atlasUV).r;
if (opacity < 0.5) discard; // see-through gaps in grating
```

Below the grating, a dark blue-black plane at Y=-0.5 represents the sealed ocean void (existing `void_pit` rendering).

---

## 4. Abyssal Platform Rules

Abyssal zones are former ocean — steel grating over dark void. But structures STILL exist over the abyss. The rules:

### 4.1 Abyssal Substructures

Within abyssal BSP blocks, the generator places platform clusters:
- **Spanning bridges**: 1 tile wide, connecting land blocks across abyssal gaps. Can be long (5-15 tiles). These are `durasteel_span` at elevation 1 over grating at elevation -1.
- **Platform islands**: 2x3 or 3x3 clusters of `durasteel_span` at elevation 1, with `structural_mass` corners as support pylons. These are mini-outposts on the abyss.
- **Dock structures**: Along coastline edges (land→abyssal transition), 1-2 tile wide docks extend 2-4 tiles into the abyssal zone.

### 4.2 Width Rules

- **Land bridges** (over abyssal): max 1 tile wide. Units underneath always visible.
- **Platform islands** (over abyssal): up to 3x3. Exception to the 1-wide bridge rule because they represent actual structures built on the sealed ocean. Units on the grating below are at elevation -1 and visually distinct.
- **Land-side bridges** (between buildings): max 1 tile wide (existing constraint).

### 4.3 Visual Layering

For abyssal zones, 3 visual layers stack:
1. **Bottom** (Y=-0.5): dark void plane (near-black with faint bioluminescent shimmer)
2. **Grating** (Y=0): `Grate001` texture with opacity cutout — you can see the void through the gaps
3. **Platform** (Y=0.4): `durasteel_span` solid platforms where structures exist

---

## 5. Unit Traversal Rules

### 5.1 Weight Classes

Add a `weightClass` field to `UnitStats`:

| Weight | Units | Grating? | Bridge? | Notes |
|---|---|---|---|---|
| `light` | Scout | YES | YES | Can walk directly on abyssal grating |
| `medium` | Infantry, Cavalry, Support | NO | YES | Must use bridges/platforms over abyss |
| `heavy` | Ranged, Worker | NO | YES | Must use bridges/platforms over abyss |

### 5.2 Passability Changes

Current: `isPassableFloor(t)` returns false for `void_pit` and `structural_mass`.

New: `isPassable(t, weightClass)`:
- `void_pit`: always impassable
- `structural_mass`: always impassable (it's a wall)
- `abyssal_platform` (grating): passable for `light` only; others need a platform at elevation 1 above it
- All other floor types: passable for all weights

### 5.3 Movement Cost

Grating traversal for light units costs 2 AP per tile (hazardous footing) vs 1 AP for normal tiles. Bridge/platform tiles cost 1 AP as normal.

---

## 6. Files Changed

### New Files
- `scripts/build-texture-atlas.ts` — AmbientCG → atlas compositor
- `public/assets/textures/floor_atlas_*.jpg` — 4 PBR atlas files (generated)
- `src/board/cityLayout.ts` — BSP city layout generator
- `src/board/abyssalStructures.ts` — platform/bridge placement within abyssal zones
- `src/board/connectivity.ts` — flood-fill connectivity guarantee

### Modified Files
- `src/board/generator.ts` — replace noise scatter with city layout pipeline
- `src/board/types.ts` — add `weightClass` to traversal types
- `src/board/adjacency.ts` — weight-aware passability and movement cost
- `src/ecs/terrain/floorShader.ts` — PBR atlas material instead of procedural
- `src/ecs/terrain/glsl/floorFrag.glsl` — texture atlas sampling + PBR lighting
- `src/ecs/terrain/glsl/floorVert.glsl` — pass atlas index to fragment
- `src/ecs/traits/unit.ts` — add `weightClass` to UnitStats
- `src/ecs/robots/*.ts` — set weightClass per bot type
- `src/rendering/DepthRenderer.tsx` — abyssal void plane + grating layer
- `src/rendering/BiomeRenderer.tsx` — swap procedural material for atlas material

### Deleted Files
- `src/ecs/terrain/glsl/patterns/*.glsl` — all 5 procedural pattern files (replaced by atlas textures)

---

## 7. Implementation Order

1. **Texture pipeline** — build-atlas script, copy AmbientCG sources, generate atlas files
2. **Atlas shader** — replace procedural floorFrag with PBR atlas sampling
3. **City layout generator** — BSP subdivision, block walls, corridors, doorways
4. **District zoning** — assign interior floor types per block zone
5. **Abyssal zones** — coastline snapping to block boundaries, grating layer
6. **Abyssal structures** — bridges, platform islands, docks
7. **Connectivity guarantee** — flood-fill + corridor punching
8. **Weight-class traversal** — UnitStats.weightClass, movement cost, passability
9. **Visual polish** — grating opacity cutout, void shimmer, platform shadows

---

## 8. AmbientCG Source Files (Copy List)

All from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/`. For each pack, copy:
`*_Color.jpg`, `*_NormalGL.jpg`, `*_Roughness.jpg`, `*_Metalness.jpg`

Plus for Grate001: `*_Opacity.jpg`

| Pack | Role |
|---|---|
| Metal032 | structural_mass (brushed steel walls) |
| Metal038 | durasteel_span (dark galvanized floor) |
| Concrete007 | transit_deck (poured concrete streets) |
| Concrete034 | collapsed_zone (rough rubble) |
| Asphalt004 | dust_district (wind-scoured surface) |
| Metal025 | bio_district (corroded rust/organic decay) |
| Metal036 | aerostructure (dark weathered storm steel) |
| Grate001 | abyssal_platform (steel grating + opacity) |

Total texture disk: ~8 source packs x 4 maps x ~200KB = ~6.4MB source, compresses to ~3MB atlas set.
