/**
 * PanelGeometry — Procedural industrial panel mesh generator.
 *
 * Generates beveled rectangular panels with configurable:
 * - width, height, depth
 * - bevel radius (chamfered edges)
 * - inset depth (recessed center for mechanical look)
 * - bolt pattern: "corners" | "edges" | "grid" | "none"
 * - vent slots: horizontal or vertical vent cuts
 * - seam lines: panel join lines
 *
 * Panels can be combined to build complex shapes:
 * - Bot chassis: 4-6 panels arranged as a box
 * - Building walls: large panels with bolt grids
 * - Machine housings: panels with vents and access panels
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanelOptions {
  /** Panel width (X axis). */
  width: number;
  /** Panel height (Y axis). */
  height: number;
  /** Panel thickness / depth (Z axis). */
  depth: number;
  /** Bevel size for chamfered edges. 0 = sharp edges. */
  bevelSize?: number;
  /** Depth of recessed center inset. 0 = no inset. */
  insetDepth?: number;
  /** Border margin around the inset (fraction of smallest panel dimension). */
  insetMargin?: number;
  /** Bolt placement pattern. */
  boltPattern?: "corners" | "edges" | "grid" | "none";
  /** Radius of individual bolt heads. */
  boltRadius?: number;
  /** Number of bolts along each edge (for "grid" pattern, per axis). */
  boltCount?: number;
  /** Number of horizontal vent slots cut into the panel face. */
  ventSlots?: number;
  /** Whether vents run vertically instead of horizontally. */
  ventVertical?: boolean;
  /** Number of horizontal seam lines across the panel face. */
  seamLines?: number;
}

export interface PanelPlacement {
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface BoxFaceOptions {
  front?: Partial<PanelOptions>;
  back?: Partial<PanelOptions>;
  left?: Partial<PanelOptions>;
  right?: Partial<PanelOptions>;
  top?: Partial<PanelOptions>;
  bottom?: Partial<PanelOptions>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PANEL: Required<PanelOptions> = {
  width: 1,
  height: 1,
  depth: 0.05,
  bevelSize: 0.02,
  insetDepth: 0.01,
  insetMargin: 0.08,
  boltPattern: "corners",
  boltRadius: 0.015,
  boltCount: 3,
  ventSlots: 0,
  ventVertical: false,
  seamLines: 0,
};

// Cached bolt geometry (created once, cloned per placement)
let _cachedBoltGeo: THREE.BufferGeometry | null = null;

// ---------------------------------------------------------------------------
// Bolt geometry
// ---------------------------------------------------------------------------

/**
 * Creates a bolt head: short cylinder + hemisphere dome cap.
 * Looks like a hex bolt from above (6-sided cylinder).
 */
export function createBoltGeometry(radius: number): THREE.BufferGeometry {
  const height = radius * 0.6;
  const segments = 6; // hex bolt look

  // Bolt shaft (short cylinder)
  const shaft = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segments,
  );
  // Move the cylinder so its base is at Y=0
  shaft.translate(0, height / 2, 0);

  // Dome cap (hemisphere on top)
  const dome = new THREE.SphereGeometry(
    radius * 0.85,
    segments,
    4,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  dome.translate(0, height, 0);

  const merged = mergeGeometries([shaft, dome]);
  if (!merged) {
    // Fallback: just return the shaft
    return shaft;
  }

  // Clean up source geometries
  shaft.dispose();
  dome.dispose();

  return merged;
}

/**
 * Returns a cached bolt geometry at default size (radius=1).
 * Scale at placement time for different bolt sizes.
 */
function getCachedBoltGeo(): THREE.BufferGeometry {
  if (!_cachedBoltGeo) {
    _cachedBoltGeo = createBoltGeometry(1);
  }
  return _cachedBoltGeo;
}

// ---------------------------------------------------------------------------
// Panel creation
// ---------------------------------------------------------------------------

/**
 * Generate a single industrial panel with beveled edges, center inset,
 * bolt details, vent slots, and seam lines.
 *
 * The panel lies in the XY plane with Z being the thickness/depth direction.
 * The front face points toward +Z.
 */
export function createPanel(opts: PanelOptions): THREE.BufferGeometry {
  const o = { ...DEFAULT_PANEL, ...opts };
  const parts: THREE.BufferGeometry[] = [];

  // --- Main panel body ---
  if (o.bevelSize > 0 && o.bevelSize < Math.min(o.width, o.height) / 2) {
    parts.push(createBeveledBox(o.width, o.height, o.depth, o.bevelSize));
  } else {
    parts.push(new THREE.BoxGeometry(o.width, o.height, o.depth));
  }

  // --- Center inset (recessed rectangle on the front face) ---
  if (o.insetDepth > 0 && o.insetMargin > 0) {
    const margin = o.insetMargin * Math.min(o.width, o.height);
    const insetW = o.width - margin * 2;
    const insetH = o.height - margin * 2;

    if (insetW > 0.001 && insetH > 0.001) {
      const insetGeo = new THREE.BoxGeometry(
        insetW,
        insetH,
        o.insetDepth,
      );
      // Position it so it sits recessed into the front face
      // Front face of panel is at z = depth/2
      // Inset should be slightly recessed from the front face
      insetGeo.translate(0, 0, o.depth / 2 - o.insetDepth / 2 + 0.001);
      parts.push(insetGeo);
    }
  }

  // --- Bolt positions ---
  if (o.boltPattern !== "none" && o.boltRadius > 0) {
    const boltPositions = computeBoltPositions(o);
    const baseBoltGeo = getCachedBoltGeo();

    for (const pos of boltPositions) {
      const bolt = baseBoltGeo.clone();
      // Scale to desired radius
      bolt.scale(o.boltRadius, o.boltRadius, o.boltRadius);
      // Rotate so bolt sticks out of front face (+Z)
      bolt.rotateX(-Math.PI / 2);
      // Position on front face
      bolt.translate(pos.x, pos.y, o.depth / 2);
      parts.push(bolt);
    }
  }

  // --- Vent slots ---
  if (o.ventSlots > 0) {
    const ventGeos = createVentSlots(o);
    parts.push(...ventGeos);
  }

  // --- Seam lines ---
  if (o.seamLines > 0) {
    const seamGeos = createSeamLines(o);
    parts.push(...seamGeos);
  }

  // Merge everything into a single BufferGeometry
  const result = mergeGeometries(parts);
  if (!result) {
    // Fallback: return a simple box
    return new THREE.BoxGeometry(o.width, o.height, o.depth);
  }

  // Dispose intermediate geometries
  for (const p of parts) {
    p.dispose();
  }

  result.computeBoundingBox();
  return result;
}

// ---------------------------------------------------------------------------
// Beveled box
// ---------------------------------------------------------------------------

/**
 * Creates a box with chamfered (beveled) edges by constructing geometry
 * from a shape extrusion with bevel. This gives each panel a machined look.
 */
function createBeveledBox(
  width: number,
  height: number,
  depth: number,
  bevelSize: number,
): THREE.BufferGeometry {
  // Create the cross-section shape (rectangle with rounded corners)
  const hw = width / 2 - bevelSize;
  const hh = height / 2 - bevelSize;
  const shape = new THREE.Shape();

  // Start at bottom-left, going clockwise
  shape.moveTo(-hw, -(hh + bevelSize));
  shape.lineTo(hw, -(hh + bevelSize));
  // Bottom-right bevel
  shape.lineTo(hw + bevelSize, -hh);
  shape.lineTo(hw + bevelSize, hh);
  // Top-right bevel
  shape.lineTo(hw, hh + bevelSize);
  shape.lineTo(-hw, hh + bevelSize);
  // Top-left bevel
  shape.lineTo(-(hw + bevelSize), hh);
  shape.lineTo(-(hw + bevelSize), -hh);
  // Bottom-left bevel
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: depth,
    bevelEnabled: false,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center in Z: extrude goes from 0 to depth, shift to -depth/2 to depth/2
  geo.translate(0, 0, -depth / 2);

  return geo;
}

// ---------------------------------------------------------------------------
// Bolt position computation
// ---------------------------------------------------------------------------

function computeBoltPositions(
  o: Required<PanelOptions>,
): THREE.Vector2[] {
  const positions: THREE.Vector2[] = [];
  const marginX = o.width * 0.1;
  const marginY = o.height * 0.1;

  const innerW = o.width - marginX * 2;
  const innerH = o.height - marginY * 2;

  switch (o.boltPattern) {
    case "corners": {
      // One bolt near each corner
      positions.push(new THREE.Vector2(-innerW / 2, -innerH / 2));
      positions.push(new THREE.Vector2(innerW / 2, -innerH / 2));
      positions.push(new THREE.Vector2(-innerW / 2, innerH / 2));
      positions.push(new THREE.Vector2(innerW / 2, innerH / 2));
      break;
    }
    case "edges": {
      // Bolts along all four edges
      const count = Math.max(2, o.boltCount);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = -innerW / 2 + innerW * t;
        // Top and bottom edges
        positions.push(new THREE.Vector2(x, -innerH / 2));
        positions.push(new THREE.Vector2(x, innerH / 2));
      }
      for (let i = 1; i < count - 1; i++) {
        const t = i / (count - 1);
        const y = -innerH / 2 + innerH * t;
        // Left and right edges (skip corners, already placed)
        positions.push(new THREE.Vector2(-innerW / 2, y));
        positions.push(new THREE.Vector2(innerW / 2, y));
      }
      break;
    }
    case "grid": {
      // Regular grid of bolts
      const cols = Math.max(2, o.boltCount);
      const rows = Math.max(2, Math.round(cols * (o.height / o.width)));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tx = cols === 1 ? 0.5 : col / (cols - 1);
          const ty = rows === 1 ? 0.5 : row / (rows - 1);
          positions.push(
            new THREE.Vector2(
              -innerW / 2 + innerW * tx,
              -innerH / 2 + innerH * ty,
            ),
          );
        }
      }
      break;
    }
    case "none":
      break;
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Vent slots
// ---------------------------------------------------------------------------

/**
 * Creates vent slot geometry — thin rectangular indentations on the panel face.
 * These are slightly recessed strips that read as ventilation openings.
 */
function createVentSlots(o: Required<PanelOptions>): THREE.BufferGeometry[] {
  const vents: THREE.BufferGeometry[] = [];
  const count = o.ventSlots;

  if (o.ventVertical) {
    // Vertical vents
    const ventH = o.height * 0.6;
    const ventW = Math.min(o.width * 0.04, 0.02);
    const totalSpan = o.width * 0.5;
    const spacing = count > 1 ? totalSpan / (count - 1) : 0;
    const startX = count > 1 ? -totalSpan / 2 : 0;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      const vent = new THREE.BoxGeometry(ventW, ventH, o.depth * 0.3);
      vent.translate(x, 0, o.depth / 2 - o.depth * 0.15 + 0.001);
      vents.push(vent);
    }
  } else {
    // Horizontal vents
    const ventW = o.width * 0.6;
    const ventH = Math.min(o.height * 0.04, 0.02);
    const totalSpan = o.height * 0.5;
    const spacing = count > 1 ? totalSpan / (count - 1) : 0;
    const startY = count > 1 ? -totalSpan / 2 : 0;

    for (let i = 0; i < count; i++) {
      const y = startY + i * spacing;
      const vent = new THREE.BoxGeometry(ventW, ventH, o.depth * 0.3);
      vent.translate(0, y, o.depth / 2 - o.depth * 0.15 + 0.001);
      vents.push(vent);
    }
  }

  return vents;
}

// ---------------------------------------------------------------------------
// Seam lines
// ---------------------------------------------------------------------------

/**
 * Creates thin raised strips that simulate panel join seam lines.
 */
function createSeamLines(o: Required<PanelOptions>): THREE.BufferGeometry[] {
  const seams: THREE.BufferGeometry[] = [];
  const count = o.seamLines;
  const seamHeight = Math.min(o.depth * 0.15, 0.005);
  const seamThickness = Math.min(o.height * 0.01, 0.003);

  const totalSpan = o.height * 0.8;
  const spacing = count > 1 ? totalSpan / (count + 1) : totalSpan / 2;

  for (let i = 0; i < count; i++) {
    const y = -totalSpan / 2 + spacing * (i + 1);
    const seam = new THREE.BoxGeometry(
      o.width * 0.95,
      seamThickness,
      seamHeight,
    );
    seam.translate(0, y, o.depth / 2 + seamHeight / 2);
    seams.push(seam);
  }

  return seams;
}

// ---------------------------------------------------------------------------
// Panel combination
// ---------------------------------------------------------------------------

/**
 * Takes an array of positioned panels and merges them into a single
 * BufferGeometry. Useful for building complex shapes from multiple panels.
 */
export function combinePanels(
  panels: PanelPlacement[],
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const tempMatrix = new THREE.Matrix4();
  const tempQuat = new THREE.Quaternion();

  for (const panel of panels) {
    const geo = panel.geometry.clone();
    tempQuat.setFromEuler(panel.rotation);
    tempMatrix.compose(panel.position, tempQuat, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(tempMatrix);
    parts.push(geo);
  }

  const merged = mergeGeometries(parts);

  // Dispose clones
  for (const p of parts) {
    p.dispose();
  }

  if (!merged) {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  merged.computeBoundingBox();
  merged.computeVertexNormals();
  return merged;
}

// ---------------------------------------------------------------------------
// Box from panels (convenience)
// ---------------------------------------------------------------------------

/**
 * Creates a box assembled from 6 panels — like a robot chassis or machine housing.
 * Each face can have different panel options (front might have vents, sides bolts, etc.).
 *
 * @param w - Box width (X)
 * @param h - Box height (Y)
 * @param d - Box depth (Z)
 * @param faceOptions - Per-face panel option overrides
 * @returns Merged BufferGeometry of all 6 panels
 */
export function createBoxFromPanels(
  w: number,
  h: number,
  d: number,
  faceOptions?: BoxFaceOptions,
): THREE.BufferGeometry {
  const panelDepth = Math.min(w, h, d) * 0.06;
  const placements: PanelPlacement[] = [];

  // --- Front face (+Z) ---
  const frontOpts: PanelOptions = {
    width: w,
    height: h,
    depth: panelDepth,
    ...faceOptions?.front,
  };
  placements.push({
    geometry: createPanel(frontOpts),
    position: new THREE.Vector3(0, 0, d / 2),
    rotation: new THREE.Euler(0, 0, 0),
  });

  // --- Back face (-Z) ---
  const backOpts: PanelOptions = {
    width: w,
    height: h,
    depth: panelDepth,
    ...faceOptions?.back,
  };
  placements.push({
    geometry: createPanel(backOpts),
    position: new THREE.Vector3(0, 0, -d / 2),
    rotation: new THREE.Euler(0, Math.PI, 0),
  });

  // --- Right face (+X) ---
  const rightOpts: PanelOptions = {
    width: d,
    height: h,
    depth: panelDepth,
    ...faceOptions?.right,
  };
  placements.push({
    geometry: createPanel(rightOpts),
    position: new THREE.Vector3(w / 2, 0, 0),
    rotation: new THREE.Euler(0, Math.PI / 2, 0),
  });

  // --- Left face (-X) ---
  const leftOpts: PanelOptions = {
    width: d,
    height: h,
    depth: panelDepth,
    ...faceOptions?.left,
  };
  placements.push({
    geometry: createPanel(leftOpts),
    position: new THREE.Vector3(-w / 2, 0, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  });

  // --- Top face (+Y) ---
  const topOpts: PanelOptions = {
    width: w,
    height: d,
    depth: panelDepth,
    ...faceOptions?.top,
  };
  placements.push({
    geometry: createPanel(topOpts),
    position: new THREE.Vector3(0, h / 2, 0),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
  });

  // --- Bottom face (-Y) ---
  const bottomOpts: PanelOptions = {
    width: w,
    height: d,
    depth: panelDepth,
    ...faceOptions?.bottom,
  };
  placements.push({
    geometry: createPanel(bottomOpts),
    position: new THREE.Vector3(0, -h / 2, 0),
    rotation: new THREE.Euler(Math.PI / 2, 0, 0),
  });

  return combinePanels(placements);
}
