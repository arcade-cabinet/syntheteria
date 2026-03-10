/**
 * BotParts — Helper functions for procedural bot body part generation.
 *
 * Each function builds a THREE.Group for a specific body part (chassis, head,
 * arm, leg, tread, antenna) using the PanelGeometry system. Style parameters
 * control bolt patterns, vent slots, insets, and materials to create
 * faction-distinct visual identities.
 *
 * All functions accept a `FactionStyle` object derived from config/factionVisuals.json
 * and a seeded random function for deterministic variation.
 */

import * as THREE from "three";
import {
  createBoxFromPanels,
  createPanel,
  type BoxFaceOptions,
  type PanelOptions,
} from "./PanelGeometry.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Faction style parameters loaded from config/factionVisuals.json. */
export interface FactionStyle {
  chassisStyle: string;
  headStyle: string;
  armStyle: string;
  locomotion: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emissiveColor: string;
  metalness: number;
  roughness: number;
  rustLevel?: number;
  emissiveGlow?: number;
  anodized?: boolean;
  brushedMetal?: boolean;
  boltPattern: "corners" | "edges" | "grid" | "none";
  panelInset: number;
  ventSlots: number;
  ventVertical?: boolean;
  seamLines: number;
  damageFraction?: number;
}

/** Seeded random function: returns [0, 1) deterministically. */
export type SeededRandom = () => number;

// ---------------------------------------------------------------------------
// Material creation
// ---------------------------------------------------------------------------

/** Create the primary body material for a faction. */
export function createBodyMaterial(style: FactionStyle): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.primaryColor),
    metalness: style.metalness,
    roughness: style.roughness,
  });

  if (style.emissiveGlow && style.emissiveGlow > 0) {
    mat.emissive = new THREE.Color(style.emissiveColor);
    mat.emissiveIntensity = style.emissiveGlow;
  }

  return mat;
}

/** Create the accent material for highlights, joints, and details. */
export function createAccentMaterial(style: FactionStyle): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.accentColor),
    metalness: Math.min(1, style.metalness + 0.1),
    roughness: Math.max(0, style.roughness - 0.1),
    emissive: new THREE.Color(style.emissiveColor),
    emissiveIntensity: style.emissiveGlow ?? 0.05,
  });
}

/** Create a secondary material for the chassis underside, treads, etc. */
export function createSecondaryMaterial(style: FactionStyle): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.secondaryColor),
    metalness: style.metalness * 0.8,
    roughness: Math.min(1, style.roughness + 0.15),
  });
}

/** Create a sensor/camera lens material with emissive glow. */
export function createSensorMaterial(style: FactionStyle): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.accentColor),
    metalness: 0.2,
    roughness: 0.1,
    emissive: new THREE.Color(style.accentColor),
    emissiveIntensity: 0.4,
  });
}

// ---------------------------------------------------------------------------
// Panel option helpers
// ---------------------------------------------------------------------------

function basePanelOpts(style: FactionStyle): Partial<PanelOptions> {
  return {
    boltPattern: style.boltPattern,
    insetDepth: style.panelInset,
    insetMargin: 0.1,
    seamLines: style.seamLines,
    ventSlots: style.ventSlots,
    ventVertical: style.ventVertical ?? false,
  };
}

// ---------------------------------------------------------------------------
// Chassis
// ---------------------------------------------------------------------------

/**
 * Create a box chassis assembled from panels.
 *
 * @param width  - Chassis width (X axis)
 * @param height - Chassis height (Y axis)
 * @param depth  - Chassis depth (Z axis)
 * @param style  - Faction style parameters
 * @param rand   - Seeded random function
 * @returns THREE.Group containing the chassis mesh
 */
export function createChassis(
  width: number,
  height: number,
  depth: number,
  style: FactionStyle,
  rand: SeededRandom,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "chassis";

  const base = basePanelOpts(style);

  // Vary bolt count slightly per seed
  const boltCount = 2 + Math.floor(rand() * 3);

  const faceOptions: BoxFaceOptions = {
    front: {
      ...base,
      boltCount,
      ventSlots: style.ventSlots > 0 ? Math.max(1, Math.floor(style.ventSlots * 0.5)) : 0,
    },
    back: {
      ...base,
      boltCount,
      ventSlots: style.ventSlots,
      ventVertical: style.ventVertical,
    },
    left: {
      ...base,
      boltCount: Math.max(2, boltCount - 1),
      seamLines: Math.max(0, style.seamLines - 1),
    },
    right: {
      ...base,
      boltCount: Math.max(2, boltCount - 1),
      seamLines: Math.max(0, style.seamLines - 1),
    },
    top: {
      ...base,
      boltPattern: style.boltPattern === "none" ? "none" : "corners",
      ventSlots: 0,
      seamLines: 0,
    },
    bottom: {
      ...base,
      boltPattern: "none",
      insetDepth: 0,
      ventSlots: 0,
      seamLines: 0,
    },
  };

  const geo = createBoxFromPanels(width, height, depth, faceOptions);
  const mesh = new THREE.Mesh(geo, createBodyMaterial(style));
  mesh.name = "chassis_body";
  group.add(mesh);

  // Rust/damage: add randomized discolored patches for reclaimers/player/feral
  if (style.rustLevel && style.rustLevel > 0.2) {
    const patchCount = Math.floor(rand() * 3) + 1;
    const patchMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.primaryColor).offsetHSL(
        0.02 * (rand() - 0.5),
        -0.1,
        -0.15,
      ),
      metalness: style.metalness * 0.5,
      roughness: Math.min(1, style.roughness + 0.3),
    });

    for (let i = 0; i < patchCount; i++) {
      const patchW = width * (0.15 + rand() * 0.25);
      const patchH = height * (0.15 + rand() * 0.25);
      const patchGeo = new THREE.PlaneGeometry(patchW, patchH);
      const patch = new THREE.Mesh(patchGeo, patchMat);
      patch.name = `rust_patch_${i}`;

      // Place on a random face
      const face = Math.floor(rand() * 4);
      const offsetX = (rand() - 0.5) * width * 0.4;
      const offsetY = (rand() - 0.5) * height * 0.4;

      switch (face) {
        case 0: // front
          patch.position.set(offsetX, offsetY, depth / 2 + 0.002);
          break;
        case 1: // back
          patch.position.set(offsetX, offsetY, -depth / 2 - 0.002);
          patch.rotation.y = Math.PI;
          break;
        case 2: // left
          patch.position.set(-width / 2 - 0.002, offsetY, (rand() - 0.5) * depth * 0.4);
          patch.rotation.y = -Math.PI / 2;
          break;
        case 3: // right
          patch.position.set(width / 2 + 0.002, offsetY, (rand() - 0.5) * depth * 0.4);
          patch.rotation.y = Math.PI / 2;
          break;
      }

      group.add(patch);
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

/**
 * Create a head unit with sensor/camera on the front face.
 *
 * @param size       - Base dimension for the head cube
 * @param sensorType - Sensor style: "camera" | "visor" | "antenna_cluster" | "sensor_array"
 * @param style      - Faction style parameters
 * @param rand       - Seeded random function
 * @returns THREE.Group containing the head mesh and sensor detail
 */
export function createHead(
  size: number,
  sensorType: string,
  style: FactionStyle,
  rand: SeededRandom,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "head";

  const headW = size;
  const headH = size * (0.7 + rand() * 0.3);
  const headD = size * (0.6 + rand() * 0.2);

  const base = basePanelOpts(style);

  // Head box with sensor panel on front
  const faceOptions: BoxFaceOptions = {
    front: {
      ...base,
      boltPattern: "corners",
      insetDepth: style.panelInset * 1.5,
      insetMargin: 0.15,
    },
    back: { ...base, boltPattern: "none", insetDepth: 0 },
    left: { ...base, boltPattern: "none", seamLines: 0 },
    right: { ...base, boltPattern: "none", seamLines: 0 },
    top: { ...base, boltPattern: "none", insetDepth: 0, seamLines: 0 },
    bottom: { ...base, boltPattern: "none", insetDepth: 0, seamLines: 0 },
  };

  const headGeo = createBoxFromPanels(headW, headH, headD, faceOptions);
  const headMesh = new THREE.Mesh(headGeo, createBodyMaterial(style));
  headMesh.name = "head_body";
  group.add(headMesh);

  // Sensor detail on front face
  const sensorMat = createSensorMaterial(style);

  switch (sensorType) {
    case "visor": {
      // Wide horizontal visor band
      const visorW = headW * 0.8;
      const visorH = headH * 0.25;
      const visorGeo = new THREE.BoxGeometry(visorW, visorH, 0.02);
      const visor = new THREE.Mesh(visorGeo, sensorMat);
      visor.name = "visor";
      visor.position.set(0, headH * 0.1, headD / 2 + 0.01);
      group.add(visor);
      break;
    }
    case "antenna_cluster": {
      // Multiple small antennas on top
      const antennaCount = 2 + Math.floor(rand() * 3);
      const antennaMat = createAccentMaterial(style);
      for (let i = 0; i < antennaCount; i++) {
        const ax = (rand() - 0.5) * headW * 0.6;
        const az = (rand() - 0.5) * headD * 0.6;
        const aHeight = size * (0.3 + rand() * 0.4);
        const antennaGeo = new THREE.CylinderGeometry(0.008, 0.012, aHeight, 4);
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.name = `head_antenna_${i}`;
        antenna.position.set(ax, headH / 2 + aHeight / 2, az);
        group.add(antenna);
      }
      // Camera lens
      const lensGeo = new THREE.SphereGeometry(size * 0.12, 8, 8);
      const lens = new THREE.Mesh(lensGeo, sensorMat);
      lens.name = "camera_lens";
      lens.position.set(0, 0, headD / 2 + 0.01);
      group.add(lens);
      break;
    }
    case "sensor_array": {
      // Grid of small sensor dots
      const rows = 2;
      const cols = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = ((c / (cols - 1)) - 0.5) * headW * 0.5;
          const sy = ((r / (rows - 1)) - 0.5) * headH * 0.3 + headH * 0.1;
          const dotGeo = new THREE.SphereGeometry(size * 0.04, 6, 6);
          const dot = new THREE.Mesh(dotGeo, sensorMat);
          dot.name = `sensor_dot_${r}_${c}`;
          dot.position.set(sx, sy, headD / 2 + 0.005);
          group.add(dot);
        }
      }
      break;
    }
    case "dome":
    default: {
      // Single camera dome / eye
      const domeGeo = new THREE.SphereGeometry(size * 0.15, 8, 8);
      const dome = new THREE.Mesh(domeGeo, sensorMat);
      dome.name = "camera_dome";
      dome.position.set(0, headH * 0.05, headD / 2 + 0.01);
      group.add(dome);

      // Mounting ring around camera
      const ringGeo = new THREE.TorusGeometry(size * 0.16, size * 0.02, 6, 12);
      const ring = new THREE.Mesh(ringGeo, createAccentMaterial(style));
      ring.name = "camera_ring";
      ring.position.set(0, headH * 0.05, headD / 2 + 0.005);
      group.add(ring);
      break;
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Arms
// ---------------------------------------------------------------------------

/**
 * Create an arm from jointed cylindrical segments wrapped with panel details.
 *
 * @param length   - Total arm length
 * @param segments - Number of arm segments (2 or 3)
 * @param style    - Faction style parameters
 * @param rand     - Seeded random function
 * @param side     - "left" or "right" for mirroring
 * @returns THREE.Group containing the arm mesh
 */
export function createArm(
  length: number,
  segments: number,
  style: FactionStyle,
  rand: SeededRandom,
  side: "left" | "right" = "left",
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arm_${side}`;

  const segmentLength = length / segments;
  const bodyMat = createBodyMaterial(style);
  const jointMat = createAccentMaterial(style);
  const armRadius = 0.03 + rand() * 0.02;

  let yOffset = 0;

  for (let i = 0; i < segments; i++) {
    // Arm segment (cylinder)
    const segGeo = new THREE.CylinderGeometry(
      armRadius * (1 - i * 0.1),
      armRadius * (1 - (i + 1) * 0.05),
      segmentLength,
      6,
    );
    const seg = new THREE.Mesh(segGeo, bodyMat);
    seg.name = `arm_segment_${i}`;
    seg.position.set(0, yOffset - segmentLength / 2, 0);
    group.add(seg);

    // Joint sphere between segments
    if (i < segments - 1) {
      const jointGeo = new THREE.SphereGeometry(armRadius * 1.3, 6, 6);
      const joint = new THREE.Mesh(jointGeo, jointMat);
      joint.name = `arm_joint_${i}`;
      joint.position.set(0, yOffset - segmentLength, 0);
      group.add(joint);
    }

    // Panel wrap detail on each segment
    if (style.boltPattern !== "none") {
      const panelOpts: PanelOptions = {
        width: armRadius * 3,
        height: segmentLength * 0.6,
        depth: 0.01,
        boltPattern: "corners",
        boltRadius: 0.006,
        insetDepth: 0.003,
        insetMargin: 0.15,
        seamLines: 0,
        ventSlots: 0,
      };
      const panelGeo = createPanel(panelOpts);
      const panel = new THREE.Mesh(panelGeo, bodyMat);
      panel.name = `arm_panel_${i}`;
      panel.position.set(
        side === "left" ? -armRadius - 0.005 : armRadius + 0.005,
        yOffset - segmentLength / 2,
        0,
      );
      panel.rotation.y = side === "left" ? -Math.PI / 2 : Math.PI / 2;
      group.add(panel);
    }

    yOffset -= segmentLength;
  }

  // End effector
  switch (style.armStyle) {
    case "clamp": {
      // Two-prong clamp
      const clampMat = createSecondaryMaterial(style);
      for (const dx of [-1, 1]) {
        const clampGeo = new THREE.BoxGeometry(armRadius * 0.6, segmentLength * 0.3, armRadius * 0.4);
        const clamp = new THREE.Mesh(clampGeo, clampMat);
        clamp.name = `clamp_${dx > 0 ? "right" : "left"}`;
        clamp.position.set(dx * armRadius * 0.8, yOffset - segmentLength * 0.15, 0);
        group.add(clamp);
      }
      break;
    }
    case "probe": {
      // Thin probe tip with glow
      const probeGeo = new THREE.ConeGeometry(armRadius * 0.4, segmentLength * 0.4, 4);
      const probe = new THREE.Mesh(probeGeo, createSensorMaterial(style));
      probe.name = "probe_tip";
      probe.position.set(0, yOffset - segmentLength * 0.2, 0);
      probe.rotation.z = Math.PI;
      group.add(probe);
      break;
    }
    case "tendril": {
      // Tapered flexible end
      const tendrilGeo = new THREE.ConeGeometry(armRadius * 0.8, segmentLength * 0.5, 5);
      const tendril = new THREE.Mesh(tendrilGeo, jointMat);
      tendril.name = "tendril_tip";
      tendril.position.set(0, yOffset - segmentLength * 0.25, 0);
      tendril.rotation.z = Math.PI;
      group.add(tendril);
      break;
    }
    case "heavy_arm": {
      // Blocky fist
      const fistGeo = new THREE.BoxGeometry(armRadius * 2.5, armRadius * 2.5, armRadius * 2);
      const fist = new THREE.Mesh(fistGeo, bodyMat);
      fist.name = "fist";
      fist.position.set(0, yOffset - armRadius * 1.25, 0);
      group.add(fist);
      break;
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

/**
 * Create a jointed leg from panel-wrapped segments.
 *
 * @param length - Total leg length
 * @param style  - Faction style parameters
 * @param rand   - Seeded random function
 * @param side   - "left" or "right" for mirroring
 * @returns THREE.Group containing the leg mesh
 */
export function createLeg(
  length: number,
  style: FactionStyle,
  rand: SeededRandom,
  side: "left" | "right" = "left",
): THREE.Group {
  const group = new THREE.Group();
  group.name = `leg_${side}`;

  const bodyMat = createBodyMaterial(style);
  const jointMat = createAccentMaterial(style);
  const legRadius = 0.04 + rand() * 0.02;

  // Upper leg
  const upperLen = length * 0.5;
  const upperGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, upperLen, 6);
  const upper = new THREE.Mesh(upperGeo, bodyMat);
  upper.name = "upper_leg";
  upper.position.set(0, -upperLen / 2, 0);
  group.add(upper);

  // Knee joint
  const kneeGeo = new THREE.SphereGeometry(legRadius * 1.4, 6, 6);
  const knee = new THREE.Mesh(kneeGeo, jointMat);
  knee.name = "knee";
  knee.position.set(0, -upperLen, 0);
  group.add(knee);

  // Lower leg
  const lowerLen = length * 0.5;
  const lowerGeo = new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.7, lowerLen, 6);
  const lower = new THREE.Mesh(lowerGeo, bodyMat);
  lower.name = "lower_leg";
  lower.position.set(0, -upperLen - lowerLen / 2, 0);
  group.add(lower);

  // Foot pad
  const footGeo = new THREE.BoxGeometry(legRadius * 2.5, legRadius * 0.6, legRadius * 3);
  const foot = new THREE.Mesh(footGeo, createSecondaryMaterial(style));
  foot.name = "foot";
  foot.position.set(0, -length - legRadius * 0.3, legRadius * 0.5);
  group.add(foot);

  // Panel detail on upper leg
  const panelOpts: PanelOptions = {
    width: legRadius * 3,
    height: upperLen * 0.7,
    depth: 0.01,
    boltPattern: style.boltPattern === "none" ? "none" : "corners",
    boltRadius: 0.005,
    insetDepth: style.panelInset * 0.5,
    insetMargin: 0.12,
    seamLines: 0,
    ventSlots: 0,
  };
  const panelGeo = createPanel(panelOpts);
  const panel = new THREE.Mesh(panelGeo, bodyMat);
  panel.name = "leg_panel";
  panel.position.set(
    side === "left" ? -legRadius - 0.005 : legRadius + 0.005,
    -upperLen / 2,
    0,
  );
  panel.rotation.y = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  group.add(panel);

  return group;
}

// ---------------------------------------------------------------------------
// Treads / Tracks
// ---------------------------------------------------------------------------

/**
 * Create a tread/track assembly from wide flat panels.
 *
 * @param width  - Tread width
 * @param length - Tread length (Z extent)
 * @param style  - Faction style parameters
 * @param rand   - Seeded random function
 * @param side   - "left" or "right" for mirroring
 * @returns THREE.Group containing the tread mesh
 */
export function createTread(
  width: number,
  length: number,
  style: FactionStyle,
  rand: SeededRandom,
  side: "left" | "right" = "left",
): THREE.Group {
  const group = new THREE.Group();
  group.name = `tread_${side}`;

  const height = width * (0.45 + rand() * 0.1);
  const bodyMat = createSecondaryMaterial(style);

  // Main tread body
  const treadGeo = new THREE.BoxGeometry(width, height, length);
  const tread = new THREE.Mesh(treadGeo, bodyMat);
  tread.name = "tread_body";
  group.add(tread);

  // Tread grooves (horizontal lines)
  const grooveCount = Math.max(3, Math.floor(length / 0.08));
  const grooveMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(style.primaryColor).offsetHSL(0, 0, -0.1),
    metalness: style.metalness * 0.7,
    roughness: Math.min(1, style.roughness + 0.2),
  });

  for (let i = 0; i < grooveCount; i++) {
    const gz = -length / 2 + (length / (grooveCount + 1)) * (i + 1);
    const grooveGeo = new THREE.BoxGeometry(width + 0.002, height * 0.15, 0.008);
    const groove = new THREE.Mesh(grooveGeo, grooveMat);
    groove.name = `groove_${i}`;
    groove.position.set(0, -height * 0.3, gz);
    group.add(groove);
  }

  // Side panel
  const panelOpts: PanelOptions = {
    width: length * 0.8,
    height: height * 0.7,
    depth: 0.012,
    boltPattern: style.boltPattern === "none" ? "none" : "edges",
    boltRadius: 0.005,
    boltCount: 3,
    insetDepth: style.panelInset,
    insetMargin: 0.1,
    seamLines: 1,
    ventSlots: 0,
  };
  const panelGeo = createPanel(panelOpts);
  const panel = new THREE.Mesh(panelGeo, createBodyMaterial(style));
  panel.name = "tread_panel";
  const panelX = side === "left" ? -width / 2 - 0.007 : width / 2 + 0.007;
  panel.position.set(panelX, 0, 0);
  panel.rotation.y = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  group.add(panel);

  // Wheel circles (front and rear)
  const wheelMat = createAccentMaterial(style);
  for (const dz of [-1, 1]) {
    const wheelGeo = new THREE.CylinderGeometry(height * 0.4, height * 0.4, width * 0.3, 8);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.name = `wheel_${dz > 0 ? "front" : "rear"}`;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -height * 0.05, dz * length * 0.35);
    group.add(wheel);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Antenna
// ---------------------------------------------------------------------------

/**
 * Create an antenna assembly (thin cylinder + sphere tip).
 *
 * @param height - Antenna height
 * @param style  - Faction style parameters
 * @param rand   - Seeded random function
 * @returns THREE.Group containing the antenna mesh
 */
export function createAntenna(
  height: number,
  style: FactionStyle,
  rand: SeededRandom,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "antenna";

  const bodyMat = createAccentMaterial(style);
  const tipMat = createSensorMaterial(style);

  // Main shaft
  const shaftRadius = 0.008 + rand() * 0.006;
  const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius * 1.5, height, 4);
  const shaft = new THREE.Mesh(shaftGeo, bodyMat);
  shaft.name = "antenna_shaft";
  shaft.position.set(0, height / 2, 0);
  group.add(shaft);

  // Tip sphere
  const tipGeo = new THREE.SphereGeometry(shaftRadius * 2.5, 6, 6);
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.name = "antenna_tip";
  tip.position.set(0, height, 0);
  group.add(tip);

  // Optional cross-bar for signal_choir
  if (style.headStyle === "antenna_cluster") {
    const barLen = height * 0.3;
    const barGeo = new THREE.CylinderGeometry(shaftRadius * 0.6, shaftRadius * 0.6, barLen, 4);
    const bar = new THREE.Mesh(barGeo, bodyMat);
    bar.name = "antenna_crossbar";
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, height * 0.7, 0);
    group.add(bar);

    // Small tip spheres at crossbar ends
    for (const dx of [-1, 1]) {
      const sTipGeo = new THREE.SphereGeometry(shaftRadius * 1.5, 4, 4);
      const sTip = new THREE.Mesh(sTipGeo, tipMat);
      sTip.name = `crossbar_tip_${dx > 0 ? "right" : "left"}`;
      sTip.position.set(dx * barLen / 2, height * 0.7, 0);
      group.add(sTip);
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Recursively dispose all geometries and materials in a group hierarchy.
 * Call this when removing a bot mesh to free GPU memory.
 */
export function disposeBotGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        for (const mat of child.material) {
          mat.dispose();
        }
      } else {
        child.material.dispose();
      }
    }
  });
}
