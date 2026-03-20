import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { g as gridToWorld, S as SECTOR_LATTICE_SIZE } from './sectorCoordinates-Bm5lA-nC.js';
import { T as TestCanvasWrapper } from './testCanvasWrapper-CLb_wOTZ.js';
import './index-COtgIsy1.js';
import './react-three-fiber.esm-PzQKdL82.js';

const FLOOR_COLORS = {
  command_core: 6189957,
  corridor_transit: 7440283,
  fabrication: 8020810,
  storage: 7692623,
  power: 6448522,
  habitation: 5930895,
  breach_exposed: 5264479
};
const GRID_W = 8;
const GRID_H = 8;
const WALL_POSITIONS = [
  // North wall of corridor (r=2)
  { q: 2, r: 2, rotation: 0 },
  { q: 3, r: 2, rotation: 0 },
  { q: 4, r: 2, rotation: 0 },
  { q: 5, r: 2, rotation: 0 },
  // South wall of corridor (r=5)
  { q: 2, r: 5, rotation: 0 },
  { q: 3, r: 5, rotation: 0 },
  { q: 4, r: 5, rotation: 0 },
  { q: 5, r: 5, rotation: 0 },
  // End caps (east/west walls)
  { q: 2, r: 3, rotation: Math.PI / 2 },
  { q: 2, r: 4, rotation: Math.PI / 2 },
  { q: 5, r: 3, rotation: Math.PI / 2 },
  { q: 5, r: 4, rotation: Math.PI / 2 }
];
function FloorTile({ q, r }) {
  const pos = gridToWorld(q, r);
  const isCorridor = q >= 2 && q <= 5 && r >= 2 && r <= 5;
  const zone = isCorridor ? "corridor_transit" : "fabrication";
  const color = FLOOR_COLORS[zone];
  const plateSize = SECTOR_LATTICE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [pos.x, -5e-3, pos.z], receiveShadow: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [plateSize, 0.02, plateSize] }),
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
  ] });
}
function WallSegment({
  q,
  r,
  rotation
}) {
  const pos = gridToWorld(q, r);
  const wallHeight = 1.2;
  const wallThickness = 0.12;
  const wallLength = SECTOR_LATTICE_SIZE * 0.95;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "mesh",
    {
      position: [pos.x, wallHeight / 2, pos.z],
      rotation: [0, rotation, 0],
      castShadow: true,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [wallLength, wallHeight, wallThickness] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 4874098,
            roughness: 0.6,
            metalness: 0.25,
            emissive: 1714742,
            emissiveIntensity: 0.15
          }
        )
      ]
    }
  );
}
function StructurePlacementPreview() {
  const cells = [];
  for (let r = 0; r < GRID_H; r++) {
    for (let q = 0; q < GRID_W; q++) {
      cells.push({ q, r });
    }
  }
  const centerX = (GRID_W - 1) / 2 * SECTOR_LATTICE_SIZE;
  const centerZ = (GRID_H - 1) / 2 * SECTOR_LATTICE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    TestCanvasWrapper,
    {
      width: 800,
      height: 600,
      cameraPosition: [centerX + 6, 12, centerZ + 8],
      cameraLookAt: [centerX, 0.3, centerZ],
      cameraZoom: 50,
      children: [
        cells.map(({ q, r }) => /* @__PURE__ */ jsxRuntimeExports.jsx(FloorTile, { q, r }, `floor_${q},${r}`)),
        WALL_POSITIONS.map(({ q, r, rotation }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          WallSegment,
          {
            q,
            r,
            rotation
          },
          `wall_${q},${r}_${rotation}`
        ))
      ]
    }
  );
}

export { StructurePlacementPreview };
//# sourceMappingURL=StructurePlacementPreview-BvPyEowl.js.map
