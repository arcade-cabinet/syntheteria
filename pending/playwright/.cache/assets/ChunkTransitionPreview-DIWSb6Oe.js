import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { D as DoubleSide } from './react-three-fiber.esm-PzQKdL82.js';
import { g as gridToWorld, S as SECTOR_LATTICE_SIZE } from './sectorCoordinates-Bm5lA-nC.js';
import { T as TestCanvasWrapper } from './testCanvasWrapper-CLb_wOTZ.js';
import './index-COtgIsy1.js';

const FLOOR_COLORS = {
  command_core: 6189957,
  corridor_transit: 7440283,
  fabrication: 8020810,
  storage: 7692623,
  power: 6448522,
  habitation: 5930895,
  breach_exposed: 5264479
};
const VISUAL_CHUNK_SIZE = 8;
const LEFT_ZONE = "command_core";
const RIGHT_ZONE = "fabrication";
const ACCENT_COLORS = {
  command_core: 7336904,
  fabrication: 16172394
};
function ChunkTile({
  q,
  r,
  zone
}) {
  const pos = gridToWorld(q, r);
  const color = FLOOR_COLORS[zone];
  const accent = ACCENT_COLORS[zone] ?? 9168639;
  const plateSize = SECTOR_LATTICE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { position: [pos.x, 0, pos.z], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, -5e-3, 0], receiveShadow: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [plateSize, 0.02, plateSize] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          color,
          roughness: 0.72,
          metalness: 0.08,
          emissive: zone === "command_core" ? 1587258 : 1118481,
          emissiveIntensity: 0.2
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 8e-3, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [plateSize * 0.56, 0.05] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshBasicMaterial",
        {
          color: accent,
          transparent: true,
          opacity: 0.09,
          side: DoubleSide,
          depthWrite: false
        }
      )
    ] })
  ] });
}
function BoundaryLine({
  x,
  depth
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [x, 0.02, depth / 2], rotation: [0, 0, 0], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.06, 0.04, depth] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("meshBasicMaterial", { color: 16751797, transparent: true, opacity: 0.5 })
  ] });
}
function ChunkTransitionPreview() {
  const rows = VISUAL_CHUNK_SIZE;
  const cols = VISUAL_CHUNK_SIZE;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      cells.push({ q, r, zone: LEFT_ZONE });
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let q = cols; q < cols * 2; q++) {
      cells.push({ q, r, zone: RIGHT_ZONE });
    }
  }
  const totalCols = cols * 2;
  const centerX = (totalCols - 1) / 2 * SECTOR_LATTICE_SIZE;
  const centerZ = (rows - 1) / 2 * SECTOR_LATTICE_SIZE;
  const extentX = totalCols * SECTOR_LATTICE_SIZE / 2;
  const boundaryX = (cols - 0.5) * SECTOR_LATTICE_SIZE;
  const gridDepth = rows * SECTOR_LATTICE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    TestCanvasWrapper,
    {
      width: 800,
      height: 600,
      cameraPosition: [centerX, 20, centerZ],
      cameraLookAt: [centerX, 0, centerZ],
      cameraZoom: 800 / (extentX * 2.6),
      children: [
        cells.map(({ q, r, zone }) => /* @__PURE__ */ jsxRuntimeExports.jsx(ChunkTile, { q, r, zone }, `${q},${r}`)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(BoundaryLine, { x: boundaryX, depth: gridDepth })
      ]
    }
  );
}

export { ChunkTransitionPreview };
//# sourceMappingURL=ChunkTransitionPreview-DIWSb6Oe.js.map
