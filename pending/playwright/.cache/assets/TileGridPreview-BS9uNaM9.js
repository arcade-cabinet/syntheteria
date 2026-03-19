import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { T as TILE_SIZE, C as CHUNK_SIZE, F as FLOOR_MATERIALS } from './index-COtgIsy1.js';
import { T as TestCanvasWrapper } from './testCanvasWrapper-CLb_wOTZ.js';
import './react-three-fiber.esm-PzQKdL82.js';

function tileToWorld(x, z) {
  return {
    worldX: x * TILE_SIZE + TILE_SIZE / 2,
    worldZ: z * TILE_SIZE + TILE_SIZE / 2
  };
}
const FLOOR_COLORS = {
  metal_panel: 6189957,
  concrete_slab: 7440283,
  industrial_grating: 8020810,
  rusty_plating: 7692623,
  corroded_steel: 6448522
};
function FloorTile({ tile }) {
  const { worldX, worldZ } = tileToWorld(tile.x, tile.z);
  const color = FLOOR_COLORS[tile.floorMaterial] ?? FLOOR_COLORS.metal_panel;
  const y = tile.level * 2.5;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("group", { position: [worldX, y, worldZ], children: /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, -5e-3, 0], receiveShadow: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [TILE_SIZE, 0.02, TILE_SIZE] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "meshStandardMaterial",
      {
        color,
        roughness: 0.72,
        metalness: 0.08,
        emissive: 1118481,
        emissiveIntensity: 0.2
      }
    )
  ] }) });
}
function TileGridPreview() {
  const tiles = [];
  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const mat = FLOOR_MATERIALS[(x + z) % FLOOR_MATERIALS.length];
      tiles.push({
        x,
        z,
        level: 0,
        elevationY: 0,
        clearanceAbove: 100,
        floorMaterial: mat,
        modelId: null,
        modelLayer: null,
        rotation: 0,
        passable: true,
        isBridge: false,
        isRamp: false
      });
    }
  }
  const centerX = CHUNK_SIZE * TILE_SIZE / 2;
  const centerZ = CHUNK_SIZE * TILE_SIZE / 2;
  const extentX = CHUNK_SIZE * TILE_SIZE / 2;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TestCanvasWrapper,
    {
      width: 800,
      height: 600,
      cameraPosition: [centerX, 20, centerZ],
      cameraLookAt: [centerX, 0, centerZ],
      cameraZoom: 800 / (extentX * 2.4),
      children: tiles.map((tile) => /* @__PURE__ */ jsxRuntimeExports.jsx(FloorTile, { tile }, `${tile.x},${tile.z}`))
    }
  );
}

export { TileGridPreview };
//# sourceMappingURL=TileGridPreview-BS9uNaM9.js.map
