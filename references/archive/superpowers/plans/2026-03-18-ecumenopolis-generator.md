# Ecumenopolis Generator + PBR Texture Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace noise-scattered terrain with a BSP city layout generator and swap procedural GLSL patterns for AmbientCG PBR texture atlases.

**Architecture:** BSP recursive subdivision creates city blocks with walls (structural_mass), corridors (transit_deck), and district-zoned interiors. Abyssal zones snap to block boundaries with grating, bridges, and platform islands. Eight AmbientCG 1K PBR texture packs are composited into a 3x3 atlas (Color/Normal/Roughness/Metalness) sampled by a new floorFrag shader using a per-vertex `floorIndex` attribute. Weight-class traversal controls which units can walk on grating.

**Tech Stack:** TypeScript, Three.js ShaderMaterial, sharp (atlas compositing), Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-18-ecumenopolis-generator-design.md`

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `scripts/build-texture-atlas.ts` | Composite 8 AmbientCG packs into 4 atlas JPGs |
| `src/board/cityLayout.ts` | BSP recursive subdivision → city blocks, walls, corridors |
| `src/board/abyssalStructures.ts` | Bridges, platform islands, docks within abyssal BSP blocks |
| `src/board/connectivity.ts` | Flood-fill reachability guarantee + corridor punching |
| `src/board/__tests__/cityLayout.vitest.ts` | BSP tests |
| `src/board/__tests__/abyssalStructures.vitest.ts` | Abyssal structure tests |
| `src/board/__tests__/connectivity.vitest.ts` | Connectivity tests |
| `src/ecs/terrain/glsl/floorFrag.atlas.glsl` | PBR atlas-sampling fragment shader |
| `src/ecs/terrain/glsl/floorVert.atlas.glsl` | Vertex shader passing floorIndex |

### Modified Files
| File | Changes |
|---|---|
| `src/board/generator.ts` | Replace noise pipeline with cityLayout + abyssal + connectivity |
| `src/board/types.ts` | Add `WeightClass` type |
| `src/board/adjacency.ts` | Weight-aware `isPassableFor()`, movement cost for grating |
| `src/board/grid.ts` | `reachable()` accepts optional weightClass |
| `src/ecs/traits/unit.ts` | Add `weightClass` to UnitStats default |
| `src/ecs/robots/*.ts` | Set weightClass per bot type |
| `src/ecs/terrain/floorShader.ts` | Load atlas textures, new ShaderMaterial |
| `src/ecs/terrain/cluster.ts` | Keep `tileFloorProps()`, remove noise functions (dead code after generator rewrite) |
| `src/rendering/boardGeometry.ts` | Add `floorIndex` per-vertex attribute from board data |
| `src/rendering/BiomeRenderer.tsx` | Use new atlas material |
| `src/rendering/DepthRenderer.tsx` | Abyssal void plane at Y=-0.5, grating layer |

### Deleted Files
| File | Reason |
|---|---|
| `src/ecs/terrain/glsl/patterns/structuralMass.glsl` | Replaced by atlas |
| `src/ecs/terrain/glsl/patterns/abyssalPlatform.glsl` | Replaced by atlas |
| `src/ecs/terrain/glsl/patterns/durasteel.glsl` | Replaced by atlas |
| `src/ecs/terrain/glsl/patterns/transitDeck.glsl` | Replaced by atlas |
| `src/ecs/terrain/glsl/patterns/surfaces.glsl` | Replaced by atlas |

---

## Task 1: Copy AmbientCG Source Textures

**Files:**
- Create: `public/assets/textures/sources/` (8 pack directories)

- [ ] **Step 1: Create source texture directory**

```bash
mkdir -p public/assets/textures/sources
```

- [ ] **Step 2: Copy the 8 AmbientCG packs (Color, NormalGL, Roughness, Metalness maps)**

```bash
SRC=/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG
DST=public/assets/textures/sources

# Verify mount
mount | grep -q /Volumes/home || { echo "NOT MOUNTED"; exit 1; }

for pack in Metal032 Metal038 Concrete007 Concrete034 Asphalt004 Metal025 Metal036 Grate001; do
  mkdir -p "$DST/$pack"
  cp "$SRC/$pack/${pack}_1K-JPG_Color.jpg" "$DST/$pack/"
  cp "$SRC/$pack/${pack}_1K-JPG_NormalGL.jpg" "$DST/$pack/"
  cp "$SRC/$pack/${pack}_1K-JPG_Roughness.jpg" "$DST/$pack/"
  cp "$SRC/$pack/${pack}_1K-JPG_Metalness.jpg" "$DST/$pack/"
done

# Grate001 also needs Opacity map
cp "$SRC/Grate001/Grate001_1K-JPG_Opacity.jpg" "$DST/Grate001/"
```

- [ ] **Step 3: Verify all files copied**

```bash
find public/assets/textures/sources -name "*.jpg" | wc -l
# Expected: 33 (8 packs × 4 maps + 1 opacity)
```

- [ ] **Step 4: Commit**

```bash
git add public/assets/textures/sources/
git commit -m "asset: copy 8 AmbientCG 1K PBR texture packs for floor atlas"
```

---

## Task 2: Build Texture Atlas Script

**Files:**
- Create: `scripts/build-texture-atlas.ts`
- Create: `public/assets/textures/floor_atlas_color.jpg` (generated)
- Create: `public/assets/textures/floor_atlas_normal.jpg` (generated)
- Create: `public/assets/textures/floor_atlas_roughness.jpg` (generated)
- Create: `public/assets/textures/floor_atlas_metalness.jpg` (generated)
- Create: `public/assets/textures/floor_atlas_opacity.jpg` (generated)

- [ ] **Step 1: Install sharp**

```bash
pnpm add -D sharp @types/sharp
```

- [ ] **Step 2: Write atlas build script**

`scripts/build-texture-atlas.ts` — composites 8 source textures + 1 black void into a 3x3 grid (3072x3072). Each atlas cell is 1024x1024.

Atlas cell layout (row-major):
```
0: structural_mass (Metal032)    1: durasteel_span (Metal038)     2: transit_deck (Concrete007)
3: collapsed_zone (Concrete034)  4: dust_district (Asphalt004)    5: bio_district (Metal025)
6: aerostructure (Metal036)      7: abyssal_platform (Grate001)   8: void_pit (solid black)
```

The `floorIndex` attribute in the geometry maps FloorType → cell index (0-8). The fragment shader computes atlas UVs from this index.

```typescript
import sharp from "sharp";
import path from "path";

const SRC = "public/assets/textures/sources";
const OUT = "public/assets/textures";
const CELL = 1024;
const GRID = 3; // 3x3
const SIZE = CELL * GRID; // 3072

// Floor type → atlas cell index (MUST match FLOOR_INDEX_MAP in boardGeometry.ts)
const CELLS: Array<{ pack: string; index: number }> = [
  { pack: "Metal032", index: 0 },    // structural_mass
  { pack: "Metal038", index: 1 },    // durasteel_span
  { pack: "Concrete007", index: 2 }, // transit_deck
  { pack: "Concrete034", index: 3 }, // collapsed_zone
  { pack: "Asphalt004", index: 4 },  // dust_district
  { pack: "Metal025", index: 5 },    // bio_district
  { pack: "Metal036", index: 6 },    // aerostructure
  { pack: "Grate001", index: 7 },    // abyssal_platform
  // index 8 = void_pit (solid black, no source file)
];

const MAP_TYPES = ["Color", "NormalGL", "Roughness", "Metalness"] as const;
const MAP_OUTPUT_NAMES: Record<string, string> = {
  Color: "color",
  NormalGL: "normal",
  Roughness: "roughness",
  Metalness: "metalness",
};

async function buildAtlas(mapType: string) {
  const outputName = MAP_OUTPUT_NAMES[mapType] ?? mapType.toLowerCase();
  const canvas = sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 0, g: 0, b: 0 } },
  });

  const composites: sharp.OverlayOptions[] = [];

  for (const cell of CELLS) {
    const col = cell.index % GRID;
    const row = Math.floor(cell.index / GRID);
    const srcPath = path.join(SRC, cell.pack, `${cell.pack}_1K-JPG_${mapType}.jpg`);

    composites.push({
      input: await sharp(srcPath).resize(CELL, CELL).toBuffer(),
      left: col * CELL,
      top: row * CELL,
    });
  }
  // Cell 8 (void_pit) stays black — the background

  const outPath = path.join(OUT, `floor_atlas_${outputName}.jpg`);
  await canvas.composite(composites).jpeg({ quality: 90 }).toFile(outPath);
  console.log(`  ${outPath}`);
}

async function buildOpacityAtlas() {
  // Only Grate001 (cell 7) has opacity. All others are fully opaque (white).
  const canvas = sharp({
    create: { width: SIZE, height: SIZE, channels: 1, background: { r: 255 } },
  });

  const col = 7 % GRID;
  const row = Math.floor(7 / GRID);
  const srcPath = path.join(SRC, "Grate001", "Grate001_1K-JPG_Opacity.jpg");

  await canvas
    .composite([{
      input: await sharp(srcPath).resize(CELL, CELL).toBuffer(),
      left: col * CELL,
      top: row * CELL,
    }])
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, "floor_atlas_opacity.jpg"));
  console.log(`  ${path.join(OUT, "floor_atlas_opacity.jpg")}`);
}

async function main() {
  console.log("Building floor texture atlases...");
  for (const mapType of MAP_TYPES) {
    await buildAtlas(mapType);
  }
  await buildOpacityAtlas();
  console.log("Done.");
}

main().catch(console.error);
```

- [ ] **Step 3: Run the atlas builder**

```bash
npx tsx scripts/build-texture-atlas.ts
```

Expected: 5 atlas files in `public/assets/textures/`

- [ ] **Step 4: Verify atlas files**

```bash
ls -la public/assets/textures/floor_atlas_*.jpg
# Expected: 5 files, each ~200-600KB
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build-texture-atlas.ts public/assets/textures/floor_atlas_*.jpg
git commit -m "feat: build PBR texture atlas from 8 AmbientCG packs"
```

---

## Task 3: Add floorIndex Attribute to Board Geometry

**Files:**
- Modify: `src/rendering/boardGeometry.ts`
- Modify: `src/ecs/terrain/types.ts` (add FLOOR_INDEX_MAP)

- [ ] **Step 1: Add FLOOR_INDEX_MAP to terrain types**

In `src/ecs/terrain/types.ts`, add after the `FLOOR_DEFS` export:

```typescript
/** FloorType → atlas cell index. Must match scripts/build-texture-atlas.ts layout. */
export const FLOOR_INDEX_MAP: Record<FloorType, number> = {
  structural_mass: 0,
  durasteel_span: 1,
  transit_deck: 2,
  collapsed_zone: 3,
  dust_district: 4,
  bio_district: 5,
  aerostructure: 6,
  abyssal_platform: 7,
  void_pit: 8,
};
```

- [ ] **Step 2: Add floorIndex per-vertex attribute to boardGeometry.ts**

The geometry builder needs access to the board's tile data to look up each tile's floorType and map it to an atlas cell index. Add a `floorIndices` Float32Array alongside `elevations`, populated from `FLOOR_INDEX_MAP[board.tiles[tz][tx].floorType]`. Ghost tiles outside the board use index 8 (void_pit/black).

```typescript
import { FLOOR_INDEX_MAP } from "../ecs/terrain/types";

// Inside buildBoardGeometry, after the elevations array:
const floorIndices = new Float32Array(totalTiles * vertsPerTile);

// Inside the tile loop, after elevations[ei++]:
const clampedTx = Math.max(0, Math.min(width - 1, tx));
const clampedTz = Math.max(0, Math.min(height - 1, tz));
const ft = board.tiles[clampedTz]?.[clampedTx]?.floorType ?? "void_pit";
const fi = FLOOR_INDEX_MAP[ft] ?? 8;
// Set same index for all vertices of this tile:
// (fi needs to be written vertsPerTile times per tile — use a second index counter)

// At geometry creation:
geometry.setAttribute("floorIndex", new THREE.BufferAttribute(floorIndices, 1));
```

- [ ] **Step 3: Run tsc to verify no errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/ecs/terrain/types.ts src/rendering/boardGeometry.ts
git commit -m "feat: add floorIndex per-vertex attribute to board geometry"
```

---

## Task 4: PBR Atlas Fragment Shader

**Files:**
- Create: `src/ecs/terrain/glsl/floorFrag.atlas.glsl`
- Create: `src/ecs/terrain/glsl/floorVert.atlas.glsl`

- [ ] **Step 1: Write the atlas vertex shader**

`src/ecs/terrain/glsl/floorVert.atlas.glsl`:

```glsl
attribute float elevation;
attribute float floorIndex;

uniform vec2  uBoardCenter;
uniform float uCurve;
uniform float uBoardWidth;

varying vec2  vWorldXZ;
varying float vFogDepth;
varying vec3  vWorldNormal;
varying float vFloorIndex;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  worldPos.y += elevation;

  vWorldXZ     = worldPos.xz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vFloorIndex  = floorIndex;

  vec4 mvPosition = viewMatrix * worldPos;
  vFogDepth = -mvPosition.z;

  gl_Position = projectionMatrix * mvPosition;
}
```

- [ ] **Step 2: Write the atlas fragment shader**

`src/ecs/terrain/glsl/floorFrag.atlas.glsl`:

```glsl
precision mediump float;

uniform sampler2D uColorAtlas;
uniform sampler2D uNormalAtlas;
uniform sampler2D uRoughnessAtlas;
uniform sampler2D uMetalnessAtlas;
uniform sampler2D uOpacityAtlas;

uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  fogColor;
uniform float fogDensity;
uniform float uTileSize;

varying vec2  vWorldXZ;
varying float vFogDepth;
varying vec3  vWorldNormal;
varying float vFloorIndex;

const float GRID_SIZE = 3.0; // 3x3 atlas

vec2 atlasUV(vec2 worldXZ, float cellIndex) {
  // Tile the texture within each cell at 1 repeat per tile
  vec2 tileUV = fract(worldXZ / uTileSize);

  // Cell position in atlas grid
  float col = mod(cellIndex, GRID_SIZE);
  float row = floor(cellIndex / GRID_SIZE);

  // Scale UV into cell and offset
  vec2 cellOrigin = vec2(col, row) / GRID_SIZE;
  vec2 cellSize = vec2(1.0 / GRID_SIZE);

  // Small inset to prevent bleeding at cell edges
  vec2 inset = cellSize * 0.005;
  return cellOrigin + inset + tileUV * (cellSize - 2.0 * inset);
}

void main() {
  float idx = floor(vFloorIndex + 0.5);
  vec2 uv = atlasUV(vWorldXZ, idx);

  vec4 albedo = texture2D(uColorAtlas, uv);
  float roughness = texture2D(uRoughnessAtlas, uv).r;
  float metalness = texture2D(uMetalnessAtlas, uv).r;

  // Opacity cutout for grating (cell 7 = abyssal_platform)
  if (idx > 6.5 && idx < 7.5) {
    float opacity = texture2D(uOpacityAtlas, uv).r;
    if (opacity < 0.5) discard;
  }

  // Simple PBR-ish lighting: non-metallic diffuse + metallic specular approximation
  vec3 N = normalize(vWorldNormal);
  float NdotL = max(dot(N, normalize(uSunDir)), 0.0);

  // Diffuse contribution (dielectric)
  vec3 diffuse = albedo.rgb * (1.0 - metalness);
  // Metallic reflection approximation
  vec3 specular = albedo.rgb * metalness * pow(NdotL, 4.0) * 0.5;

  vec3 ambient = vec3(0.40, 0.38, 0.36);
  vec3 hemi = mix(vec3(0.22, 0.20, 0.18), vec3(0.82, 0.78, 0.72), N.y * 0.5 + 0.5) * 0.5;

  vec3 lit = diffuse * (ambient + hemi + uSunColor * NdotL * 1.2) + specular;

  // Reinhard tone map
  lit = lit / (lit + vec3(1.6));

  // Fog
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  lit = mix(lit, fogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(lit, 1.0);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ecs/terrain/glsl/floorFrag.atlas.glsl src/ecs/terrain/glsl/floorVert.atlas.glsl
git commit -m "feat: PBR atlas vertex + fragment shaders"
```

---

## Task 5: Wire Atlas Material into FloorShader + BiomeRenderer

**Files:**
- Modify: `src/ecs/terrain/floorShader.ts`
- Modify: `src/rendering/BiomeRenderer.tsx`

- [ ] **Step 1: Rewrite floorShader.ts to load atlas textures**

Replace the procedural ShaderMaterial with one that loads the 5 atlas textures and uses the new atlas shaders. Use `THREE.TextureLoader` to load `floor_atlas_color.jpg`, `floor_atlas_normal.jpg`, `floor_atlas_roughness.jpg`, `floor_atlas_metalness.jpg`, `floor_atlas_opacity.jpg`. Set `wrapS/wrapT = ClampToEdgeWrapping`, `minFilter = LinearMipMapLinearFilter`.

The material uniforms include `uTileSize` (= TILE_SIZE_M = 2.0) so the shader can compute per-tile UV tiling.

- [ ] **Step 2: Update BiomeRenderer to use new material**

BiomeRenderer calls `makeFloorShaderMaterial()` — the API stays the same, just the internals change. Verify BiomeRenderer still sets `uBoardWidth` uniform (needed for curvature).

- [ ] **Step 3: Delete old procedural pattern files**

```bash
rm src/ecs/terrain/glsl/patterns/structuralMass.glsl
rm src/ecs/terrain/glsl/patterns/abyssalPlatform.glsl
rm src/ecs/terrain/glsl/patterns/durasteel.glsl
rm src/ecs/terrain/glsl/patterns/transitDeck.glsl
rm src/ecs/terrain/glsl/patterns/surfaces.glsl
rmdir src/ecs/terrain/glsl/patterns
```

- [ ] **Step 4: Rename shader files**

```bash
mv src/ecs/terrain/glsl/floorFrag.glsl src/ecs/terrain/glsl/floorFrag.procedural.glsl.bak
mv src/ecs/terrain/glsl/floorVert.glsl src/ecs/terrain/glsl/floorVert.procedural.glsl.bak
mv src/ecs/terrain/glsl/floorFrag.atlas.glsl src/ecs/terrain/glsl/floorFrag.glsl
mv src/ecs/terrain/glsl/floorVert.atlas.glsl src/ecs/terrain/glsl/floorVert.glsl
```

- [ ] **Step 5: Update floorShader.ts imports**

The GLSL imports (`import FRAG from "./glsl/floorFrag.glsl"`) now point to the atlas versions (same filenames after rename).

- [ ] **Step 6: Run dev server, verify textures render**

```bash
pnpm dev
# Open browser, start new game, confirm floor textures appear
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace procedural floor patterns with PBR texture atlas"
```

---

## Task 6: BSP City Layout Generator

**Files:**
- Create: `src/board/cityLayout.ts`
- Create: `src/board/__tests__/cityLayout.vitest.ts`

- [ ] **Step 1: Write failing tests for BSP subdivision**

`src/board/__tests__/cityLayout.vitest.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { generateCityLayout, type CityBlock } from "../cityLayout";

describe("generateCityLayout", () => {
  it("produces blocks that cover the entire board", () => {
    const blocks = generateCityLayout(32, 32, "test-seed");
    // Every tile should be covered by exactly one block
    const covered = new Set<string>();
    for (const block of blocks) {
      for (let z = block.z; z < block.z + block.h; z++) {
        for (let x = block.x; x < block.x + block.w; x++) {
          const key = `${x},${z}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }
    expect(covered.size).toBe(32 * 32);
  });

  it("all blocks are at least 6x6", () => {
    const blocks = generateCityLayout(64, 64, "test-seed");
    for (const block of blocks) {
      expect(block.w).toBeGreaterThanOrEqual(6);
      expect(block.h).toBeGreaterThanOrEqual(6);
    }
  });

  it("all blocks have a zone type assigned", () => {
    const blocks = generateCityLayout(32, 32, "test-seed");
    for (const block of blocks) {
      expect(block.zone).toBeDefined();
      expect(["industrial", "bio", "dust", "aero", "plaza"]).toContain(block.zone);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateCityLayout(32, 32, "same-seed");
    const b = generateCityLayout(32, 32, "same-seed");
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/board/__tests__/cityLayout.vitest.ts
# Expected: FAIL — module not found
```

- [ ] **Step 3: Implement BSP city layout generator**

`src/board/cityLayout.ts`:

Core algorithm:
1. Start with one rectangle covering the full board
2. Recursively split (alternate horizontal/vertical) with a 1-2 tile corridor gap
3. Stop when a child would be smaller than MIN_BLOCK_SIZE (6)
4. Assign zone types to terminal leaves using seeded shuffle
5. Return array of `CityBlock` objects

```typescript
export type BlockZone = "industrial" | "bio" | "dust" | "aero" | "plaza";

export interface CityBlock {
  x: number; z: number; // top-left corner
  w: number; h: number; // dimensions
  zone: BlockZone;
  isAbyssal: boolean; // replaced by grating in Phase 5
}

export function generateCityLayout(
  width: number, height: number, seed: string
): CityBlock[] { ... }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/board/__tests__/cityLayout.vitest.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/board/cityLayout.ts src/board/__tests__/cityLayout.vitest.ts
git commit -m "feat: BSP city layout generator with zone assignment"
```

---

## Task 7: Stamp City Blocks onto Board Tiles

**Files:**
- Modify: `src/board/generator.ts`

- [ ] **Step 1: Write failing test — generated board has structural_mass perimeter**

Add to existing generator tests: a generated board should have structural_mass tiles forming block perimeters, with doorway gaps.

- [ ] **Step 2: Rewrite generateBoard to use cityLayout**

Replace the noise-based floor assignment with:
1. Call `generateCityLayout(width, height, seed)` to get blocks
2. For each block: stamp `structural_mass` on perimeter (walls), leaving 2+ doorways
3. Fill interior with the block's zone floor type
4. Stamp corridors between blocks as `transit_deck`
5. Mark intersections as `durasteel_span`

Keep existing: elevation noise pass (for terrain height variation within blocks), bridge promotion (with the 1-wide constraint), resource scatter, and center tile forcing.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

- [ ] **Step 4: Visual check — start game, see city blocks**

```bash
pnpm dev
# Open browser, start new game, confirm visible block/corridor structure
```

- [ ] **Step 5: Commit**

```bash
git add src/board/generator.ts
git commit -m "feat: stamp BSP city blocks onto board — walls, corridors, doorways"
```

---

## Task 8: Abyssal Zones — Snap to Block Boundaries

**Files:**
- Modify: `src/board/generator.ts`
- Modify: `src/board/cityLayout.ts`

- [ ] **Step 1: Add geography noise to mark blocks as abyssal**

After BSP subdivision but before floor assignment, evaluate geography noise at each block's center. If above threshold (based on `climateProfile.waterLevel`), mark the block `isAbyssal = true`.

- [ ] **Step 2: Abyssal blocks get grating floor**

All tiles in an abyssal block: `floorType = "abyssal_platform"`, `elevation = -1`, `passable = false` (for non-light units — passability will be weight-aware after Task 11).

- [ ] **Step 3: Coastline is clean — block boundaries**

The transition from land to abyssal follows block edges. No noise-gradient bleeding.

- [ ] **Step 4: Test — abyssal blocks have uniform floorType**

```typescript
it("abyssal blocks are entirely abyssal_platform", () => {
  // Generate with high waterLevel to guarantee abyssal blocks
  const board = generateBoard({ width: 44, height: 44, seed: "abyssal-test", difficulty: "normal", climateProfile: "wet" });
  // Find tiles at abyssal elevation
  const abyssalTiles = board.tiles.flat().filter(t => t.elevation === -1);
  for (const t of abyssalTiles) {
    expect(t.floorType).toBe("abyssal_platform");
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add src/board/generator.ts src/board/cityLayout.ts
git commit -m "feat: abyssal zones snap to BSP block boundaries"
```

---

## Task 9: Abyssal Structures — Bridges, Platforms, Docks

**Files:**
- Create: `src/board/abyssalStructures.ts`
- Create: `src/board/__tests__/abyssalStructures.vitest.ts`
- Modify: `src/board/generator.ts`

- [ ] **Step 1: Write failing tests**

Test that abyssal zones contain spanning bridges (1 wide, connecting land blocks), platform islands (up to 3x3), and docks at coastline edges.

- [ ] **Step 2: Implement abyssal structure placement**

```typescript
export function placeAbyssalStructures(
  tiles: TileData[][],
  blocks: CityBlock[],
  width: number, height: number,
  rng: () => number,
): void { ... }
```

Logic:
- Find pairs of land blocks separated by abyssal blocks → connect with 1-wide bridges
- Place 2-4 platform islands (2x3 or 3x3 `durasteel_span` at elevation 1) within large abyssal zones
- Place docks (1-2 wide, 2-4 tiles long) extending from land block edges into adjacent abyssal blocks

- [ ] **Step 3: Wire into generator.ts**

Call `placeAbyssalStructures()` after abyssal zone assignment.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/board/__tests__/abyssalStructures.vitest.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/board/abyssalStructures.ts src/board/__tests__/abyssalStructures.vitest.ts src/board/generator.ts
git commit -m "feat: abyssal bridges, platform islands, docks"
```

---

## Task 10: Connectivity Guarantee

**Files:**
- Create: `src/board/connectivity.ts`
- Create: `src/board/__tests__/connectivity.vitest.ts`
- Modify: `src/board/generator.ts`

- [ ] **Step 1: Write failing test — all passable tiles reachable from spawn**

```typescript
it("all passable tiles are reachable from board center", () => {
  const board = generateBoard({ width: 32, height: 32, seed: "conn-test", difficulty: "normal" });
  const cx = 16, cz = 16;
  const reachable = floodFill(board, cx, cz);
  const passable = board.tiles.flat().filter(t => t.passable);
  expect(reachable.size).toBe(passable.length);
});
```

- [ ] **Step 2: Implement flood-fill + corridor punching**

```typescript
export function ensureConnectivity(tiles: TileData[][], spawnX: number, spawnZ: number): void {
  // Flood fill from spawn
  // Find unreachable passable tiles
  // For each unreachable cluster: find nearest reachable tile, punch a corridor through walls
}
```

- [ ] **Step 3: Wire into generator.ts after structure placement**

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/board/__tests__/connectivity.vitest.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/board/connectivity.ts src/board/__tests__/connectivity.vitest.ts src/board/generator.ts
git commit -m "feat: connectivity guarantee — flood-fill + corridor punching"
```

---

## Task 11: Weight-Class Traversal

**Files:**
- Modify: `src/board/types.ts`
- Modify: `src/board/adjacency.ts`
- Modify: `src/ecs/traits/unit.ts`
- Modify: `src/ecs/robots/ScoutBot.ts`
- Modify: `src/ecs/robots/SentinelBot.ts`
- Modify: `src/ecs/robots/CavalryBot.ts`
- Modify: `src/ecs/robots/GuardBot.ts`
- Modify: `src/ecs/robots/BuilderBot.ts`
- Modify: `src/ecs/robots/HarvesterBot.ts`

- [ ] **Step 1: Add WeightClass type**

In `src/board/types.ts`:

```typescript
export type WeightClass = "light" | "medium" | "heavy";
```

- [ ] **Step 2: Add weightClass to UnitStats trait**

In `src/ecs/traits/unit.ts`, add `weightClass: "medium" as WeightClass` to UnitStats defaults.

- [ ] **Step 3: Set weightClass per robot type**

| Robot | Weight |
|---|---|
| Scout | `light` |
| Infantry | `medium` |
| Cavalry | `medium` |
| Ranged | `heavy` |
| Support | `medium` |
| Worker | `heavy` |

- [ ] **Step 4: Add weight-aware passability to adjacency.ts**

```typescript
export function isPassableFor(tile: TileData, weightClass: WeightClass): boolean {
  if (tile.floorType === "void_pit" || tile.floorType === "structural_mass") return false;
  if (tile.floorType === "abyssal_platform" && weightClass !== "light") return false;
  return true;
}

export function movementCost(tile: TileData, weightClass: WeightClass): number {
  if (tile.floorType === "abyssal_platform" && weightClass === "light") return 2;
  return 1;
}
```

- [ ] **Step 5: Update reachableTiles BFS to use weight-aware cost**

Modify `reachableTiles()` to accept optional `weightClass` parameter. Use `isPassableFor()` instead of `tile.passable`, and `movementCost()` instead of hardcoded 1.

- [ ] **Step 6: Write tests for grating traversal**

```typescript
it("light units can traverse abyssal_platform at 2 AP cost", () => { ... });
it("medium units cannot traverse abyssal_platform", () => { ... });
```

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

- [ ] **Step 8: Commit**

```bash
git add src/board/types.ts src/board/adjacency.ts src/ecs/traits/unit.ts src/ecs/robots/*.ts
git commit -m "feat: weight-class traversal — scouts walk on grating at 2 AP"
```

---

## Task 12: Abyssal Void Plane + Grating Visual Layer

**Files:**
- Modify: `src/rendering/DepthRenderer.tsx`

- [ ] **Step 1: Add void plane at Y=-0.5 under abyssal tiles**

In DepthRenderer, for tiles with `elevation === -1` (abyssal), render a dark void plane at Y=-0.5. Near-black color with faint bioluminescent shimmer (reuse existing abyssal void code if present, or add new).

- [ ] **Step 2: Grating layer rendered by BiomeRenderer at Y=0**

The atlas shader already handles grating via the opacity cutout (cell 7). The BiomeRenderer mesh at Y=0.001 shows the grating with see-through gaps. Platforms above at Y=0.4 are handled by DepthRenderer bridges.

- [ ] **Step 3: Visual check**

Start a game with "Archipelago" geography (high water level). Verify:
- Dark void visible through grating gaps
- Platform islands sit above grating
- Bridges span between land blocks

- [ ] **Step 4: Commit**

```bash
git add src/rendering/DepthRenderer.tsx
git commit -m "feat: abyssal void plane + grating opacity visual layering"
```

---

## Task 13: Integration Testing + Visual QA

**Files:**
- Modify: `tests/e2e/player-turn.spec.ts`

- [ ] **Step 1: Add E2E test — game starts with city structure visible**

Verify canvas renders without errors, board has structural tiles, and at least one corridor is accessible.

- [ ] **Step 2: Run full verification gate**

```bash
pnpm verify  # lint + tsc + test:vitest + test:ct
```

- [ ] **Step 3: Run E2E tests**

```bash
pnpm test:e2e
```

- [ ] **Step 4: Visual QA with Chrome DevTools MCP**

Take screenshots at 3 zoom levels. Verify:
- City blocks visible with wall perimeters
- Corridors between blocks
- Textures render (not flat colors)
- Abyssal grating visible (if present in seed)
- Robots visible and selectable

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: ecumenopolis generator complete — BSP city layout + PBR textures"
```
