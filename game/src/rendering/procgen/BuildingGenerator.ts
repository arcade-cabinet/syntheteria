/**
 * BuildingGenerator -- Procedural building mesh generator using PanelGeometry.
 *
 * Generates visually distinct buildings for each building type using the panel
 * system for industrial-looking surfaces. Faction colors are applied to accent
 * panels for visual ownership cues. Each building has an interaction point
 * indicator (glowing spot marking where the player clicks to interact).
 *
 * Building types:
 *   lightning_rod    -- tall thin structure with conductor sphere on top
 *   fabrication_unit -- wide industrial box with conveyor detail and access panel
 *   furnace          -- squat box with chimney, hopper slot, and emissive glow
 *   miner            -- box base with protruding drill arm
 *   processor        -- compact box with vent grid and status indicators
 *   outpost          -- elevated platform on legs with antenna
 *   turret           -- rotating base with barrel assembly
 *
 * Usage:
 *   const building = generateBuilding("furnace", "reclaimers", 42);
 *   scene.add(building);
 *
 * Deterministic: same (buildingType, faction, seed) always produces the same mesh.
 */

import * as THREE from "three";
import {
  createBoxFromPanels,
  createPanel,
  type BoxFaceOptions,
} from "./PanelGeometry.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Seeded random function: returns [0, 1) deterministically. */
type SeededRandom = () => number;

interface FactionColors {
  primary: string;
  secondary: string;
  accent: string;
  emissive: string;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function createSeededRandom(seed: number): SeededRandom {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Faction color lookup
// ---------------------------------------------------------------------------

const FACTION_COLORS: Record<string, FactionColors> = {
  player: {
    primary: "#7B6B4F",
    secondary: "#A0926B",
    accent: "#DAA520",
    emissive: "#443300",
  },
  reclaimers: {
    primary: "#8B4513",
    secondary: "#A0926B",
    accent: "#DAA520",
    emissive: "#442200",
  },
  volt_collective: {
    primary: "#1A2A4A",
    secondary: "#2A3A5A",
    accent: "#4499FF",
    emissive: "#2266FF",
  },
  signal_choir: {
    primary: "#2A4A2A",
    secondary: "#3A5A3A",
    accent: "#88DD44",
    emissive: "#44AA22",
  },
  iron_creed: {
    primary: "#3A1A1A",
    secondary: "#4A2A2A",
    accent: "#CC3333",
    emissive: "#661111",
  },
  feral: {
    primary: "#5A5040",
    secondary: "#6A6050",
    accent: "#887744",
    emissive: "#332200",
  },
};

const DEFAULT_FACTION_COLORS: FactionColors = {
  primary: "#666666",
  secondary: "#888888",
  accent: "#AAAAAA",
  emissive: "#333333",
};

function getFactionColors(faction: string): FactionColors {
  return FACTION_COLORS[faction] ?? DEFAULT_FACTION_COLORS;
}

// ---------------------------------------------------------------------------
// Material helpers
// ---------------------------------------------------------------------------

function createBodyMat(colors: FactionColors): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.primary),
    metalness: 0.7,
    roughness: 0.5,
  });
}

function createAccentMat(colors: FactionColors): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.accent),
    metalness: 0.8,
    roughness: 0.3,
    emissive: new THREE.Color(colors.emissive),
    emissiveIntensity: 0.1,
  });
}

function createSecondaryMat(colors: FactionColors): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.secondary),
    metalness: 0.6,
    roughness: 0.6,
  });
}

function createGlowMat(color: string, intensity: number = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.2,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
  });
}

// ---------------------------------------------------------------------------
// Interaction point indicator
// ---------------------------------------------------------------------------

/**
 * Create an interaction point indicator -- a small glowing sphere
 * that marks where the player clicks to interact with the building.
 */
function createInteractionPoint(
  colors: FactionColors,
  position: THREE.Vector3,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.06, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.accent),
    metalness: 0.1,
    roughness: 0.1,
    emissive: new THREE.Color(colors.accent),
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "interaction_point";
  mesh.position.copy(position);
  return mesh;
}

// ---------------------------------------------------------------------------
// Lightning rod
// ---------------------------------------------------------------------------

function generateLightningRod(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_lightning_rod";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);
  const conductorMat = createGlowMat(colors.accent, 0.4);

  // Base platform -- small panel box
  const baseW = 0.6;
  const baseH = 0.2;
  const baseD = 0.6;
  const baseFaces: BoxFaceOptions = {
    front: { boltPattern: "corners", boltRadius: 0.01, insetDepth: 0.008 },
    back: { boltPattern: "corners", boltRadius: 0.01, insetDepth: 0.008 },
    left: { boltPattern: "corners", boltRadius: 0.01 },
    right: { boltPattern: "corners", boltRadius: 0.01 },
    top: { boltPattern: "grid", boltCount: 2, boltRadius: 0.008, insetDepth: 0.006 },
    bottom: { boltPattern: "none", insetDepth: 0 },
  };
  const baseGeo = createBoxFromPanels(baseW, baseH, baseD, baseFaces);
  const baseMesh = new THREE.Mesh(baseGeo, bodyMat);
  baseMesh.name = "base";
  baseMesh.position.set(0, baseH / 2, 0);
  group.add(baseMesh);

  // Main pole -- tall thin cylinder
  const poleH = 1.6 + rand() * 0.4;
  const poleR = 0.04;
  const poleGeo = new THREE.CylinderGeometry(poleR, poleR * 1.3, poleH, 6);
  const pole = new THREE.Mesh(poleGeo, accentMat);
  pole.name = "pole";
  pole.position.set(0, baseH + poleH / 2, 0);
  group.add(pole);

  // Accent ring bands along the pole
  const ringCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < ringCount; i++) {
    const ringY = baseH + poleH * ((i + 1) / (ringCount + 1));
    const ringGeo = new THREE.TorusGeometry(poleR * 2, poleR * 0.4, 4, 8);
    const ring = new THREE.Mesh(ringGeo, bodyMat);
    ring.name = `ring_${i}`;
    ring.position.set(0, ringY, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // Cross-arms near top for lightning attraction
  const armY = baseH + poleH * 0.8;
  const armLen = 0.3 + rand() * 0.15;
  for (const dx of [-1, 1]) {
    const armGeo = new THREE.CylinderGeometry(poleR * 0.5, poleR * 0.5, armLen, 4);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    arm.name = `cross_arm_${dx > 0 ? "right" : "left"}`;
    arm.rotation.z = Math.PI / 2;
    arm.position.set(dx * armLen / 2, armY, 0);
    group.add(arm);

    // Small tip sphere
    const tipGeo = new THREE.SphereGeometry(poleR * 1.2, 6, 6);
    const tip = new THREE.Mesh(tipGeo, conductorMat);
    tip.name = `arm_tip_${dx > 0 ? "right" : "left"}`;
    tip.position.set(dx * armLen, armY, 0);
    group.add(tip);
  }

  // Conductor sphere on top
  const sphereR = 0.1 + rand() * 0.04;
  const sphereGeo = new THREE.SphereGeometry(sphereR, 12, 12);
  const sphere = new THREE.Mesh(sphereGeo, conductorMat);
  sphere.name = "conductor_sphere";
  sphere.position.set(0, baseH + poleH + sphereR * 0.5, 0);
  group.add(sphere);

  // Interaction point on the base
  group.add(createInteractionPoint(colors, new THREE.Vector3(0.35, baseH * 0.5, 0.35)));

  return group;
}

// ---------------------------------------------------------------------------
// Fabrication unit
// ---------------------------------------------------------------------------

function generateFabricationUnit(
  _rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_fabrication_unit";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);
  const secondaryMat = createSecondaryMat(colors);

  // Main body -- wide industrial box
  const w = 1.2;
  const h = 0.8;
  const d = 0.9;
  const faces: BoxFaceOptions = {
    front: {
      boltPattern: "edges",
      boltRadius: 0.012,
      boltCount: 4,
      insetDepth: 0.012,
      insetMargin: 0.08,
      ventSlots: 3,
      seamLines: 1,
    },
    back: {
      boltPattern: "corners",
      boltRadius: 0.01,
      insetDepth: 0.008,
      ventSlots: 4,
      seamLines: 2,
    },
    left: {
      boltPattern: "edges",
      boltRadius: 0.01,
      boltCount: 3,
      insetDepth: 0.01,
      seamLines: 1,
    },
    right: {
      boltPattern: "edges",
      boltRadius: 0.01,
      boltCount: 3,
      insetDepth: 0.01,
      seamLines: 1,
    },
    top: {
      boltPattern: "grid",
      boltCount: 3,
      boltRadius: 0.008,
      insetDepth: 0.008,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const bodyGeo = createBoxFromPanels(w, h, d, faces);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = "body";
  body.position.set(0, h / 2, 0);
  group.add(body);

  // Access panel on front (accent colored)
  const accessW = w * 0.35;
  const accessH = h * 0.5;
  const accessGeo = createPanel({
    width: accessW,
    height: accessH,
    depth: 0.025,
    boltPattern: "corners",
    boltRadius: 0.008,
    insetDepth: 0.01,
    insetMargin: 0.12,
    seamLines: 0,
    ventSlots: 0,
  });
  const accessPanel = new THREE.Mesh(accessGeo, accentMat);
  accessPanel.name = "access_panel";
  accessPanel.position.set(w * 0.2, h * 0.45, d / 2 + 0.013);
  group.add(accessPanel);

  // Conveyor slot on the side
  const slotW = 0.04;
  const slotH = h * 0.3;
  const slotD = d * 0.6;
  const slotGeo = new THREE.BoxGeometry(slotW, slotH, slotD);
  const slot = new THREE.Mesh(slotGeo, secondaryMat);
  slot.name = "conveyor_slot";
  slot.position.set(w / 2 + slotW / 2, h * 0.35, 0);
  group.add(slot);

  // Status indicator light on top
  const lightGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6);
  const light = new THREE.Mesh(lightGeo, createGlowMat(colors.accent, 0.6));
  light.name = "status_light";
  light.position.set(w * 0.3, h + 0.03, d * 0.3);
  group.add(light);

  // Interaction point
  group.add(createInteractionPoint(colors, new THREE.Vector3(-w * 0.3, h * 0.4, d / 2 + 0.1)));

  return group;
}

// ---------------------------------------------------------------------------
// Furnace
// ---------------------------------------------------------------------------

function generateFurnace(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_furnace";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);

  // Squat main body
  const w = 0.9;
  const h = 0.6;
  const d = 0.8;
  const faces: BoxFaceOptions = {
    front: {
      boltPattern: "edges",
      boltRadius: 0.012,
      boltCount: 3,
      insetDepth: 0.015,
      insetMargin: 0.1,
      seamLines: 2,
      ventSlots: 0,
    },
    back: {
      boltPattern: "corners",
      boltRadius: 0.01,
      ventSlots: 3,
      seamLines: 1,
    },
    left: {
      boltPattern: "corners",
      boltRadius: 0.01,
      insetDepth: 0.01,
      seamLines: 1,
    },
    right: {
      boltPattern: "corners",
      boltRadius: 0.01,
      insetDepth: 0.01,
      seamLines: 1,
    },
    top: {
      boltPattern: "grid",
      boltCount: 2,
      boltRadius: 0.008,
      insetDepth: 0.01,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const bodyGeo = createBoxFromPanels(w, h, d, faces);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = "body";
  body.position.set(0, h / 2, 0);
  group.add(body);

  // Chimney -- tall cylinder on top-back
  const chimneyR = 0.08 + rand() * 0.03;
  const chimneyH = 0.5 + rand() * 0.3;
  const chimneyGeo = new THREE.CylinderGeometry(chimneyR, chimneyR * 1.1, chimneyH, 8);
  const chimney = new THREE.Mesh(chimneyGeo, createSecondaryMat(colors));
  chimney.name = "chimney";
  chimney.position.set(w * 0.15, h + chimneyH / 2, -d * 0.25);
  group.add(chimney);

  // Chimney cap ring
  const capGeo = new THREE.TorusGeometry(chimneyR * 1.2, chimneyR * 0.2, 4, 8);
  const cap = new THREE.Mesh(capGeo, bodyMat);
  cap.name = "chimney_cap";
  cap.position.set(w * 0.15, h + chimneyH, -d * 0.25);
  cap.rotation.x = Math.PI / 2;
  group.add(cap);

  // Hopper slot on front -- recessed dark opening
  const hopperW = w * 0.4;
  const hopperH = h * 0.35;
  const hopperGeo = new THREE.BoxGeometry(hopperW, hopperH, 0.08);
  const hopperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1A1008"),
    metalness: 0.3,
    roughness: 0.9,
  });
  const hopper = new THREE.Mesh(hopperGeo, hopperMat);
  hopper.name = "hopper_slot";
  hopper.position.set(0, h * 0.35, d / 2 + 0.01);
  group.add(hopper);

  // Hopper frame (accent colored)
  const frameW = hopperW + 0.04;
  const frameH = hopperH + 0.04;
  const frameGeo = createPanel({
    width: frameW,
    height: frameH,
    depth: 0.02,
    boltPattern: "corners",
    boltRadius: 0.006,
    insetDepth: 0,
    insetMargin: 0,
    seamLines: 0,
    ventSlots: 0,
  });
  const frame = new THREE.Mesh(frameGeo, accentMat);
  frame.name = "hopper_frame";
  frame.position.set(0, h * 0.35, d / 2 + 0.015);
  group.add(frame);

  // Emissive glow inside -- simulates heat
  const glowGeo = new THREE.PlaneGeometry(hopperW * 0.8, hopperH * 0.6);
  const glowMat = createGlowMat("#FF4400", 0.8);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = "furnace_glow";
  glow.position.set(0, h * 0.35, d / 2 - 0.03);
  group.add(glow);

  // Interaction point
  group.add(createInteractionPoint(colors, new THREE.Vector3(-w * 0.35, h * 0.3, d / 2 + 0.1)));

  return group;
}

// ---------------------------------------------------------------------------
// Miner
// ---------------------------------------------------------------------------

function generateMiner(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_miner";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);
  const secondaryMat = createSecondaryMat(colors);

  // Box base
  const w = 0.8;
  const h = 0.5;
  const d = 0.7;
  const faces: BoxFaceOptions = {
    front: {
      boltPattern: "edges",
      boltRadius: 0.01,
      boltCount: 3,
      insetDepth: 0.01,
      seamLines: 1,
      ventSlots: 2,
    },
    back: {
      boltPattern: "corners",
      boltRadius: 0.01,
      insetDepth: 0.008,
      seamLines: 1,
    },
    left: {
      boltPattern: "corners",
      boltRadius: 0.008,
      seamLines: 1,
    },
    right: {
      boltPattern: "corners",
      boltRadius: 0.008,
      seamLines: 1,
    },
    top: {
      boltPattern: "grid",
      boltCount: 2,
      boltRadius: 0.006,
      insetDepth: 0.006,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const bodyGeo = createBoxFromPanels(w, h, d, faces);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = "body";
  body.position.set(0, h / 2, 0);
  group.add(body);

  // Drill arm -- extends from the front of the box base
  const drillArmLen = 0.5 + rand() * 0.2;
  const drillArmR = 0.05;

  // Arm housing (angled downward)
  const armGeo = new THREE.CylinderGeometry(drillArmR, drillArmR * 0.8, drillArmLen, 6);
  const arm = new THREE.Mesh(armGeo, secondaryMat);
  arm.name = "drill_arm";
  // Rotate so it angles forward and down
  arm.rotation.z = Math.PI * 0.15;
  arm.rotation.x = -Math.PI * 0.1;
  arm.position.set(0, h * 0.6, d / 2 + drillArmLen * 0.35);
  group.add(arm);

  // Joint at arm base
  const jointGeo = new THREE.SphereGeometry(drillArmR * 1.5, 6, 6);
  const joint = new THREE.Mesh(jointGeo, accentMat);
  joint.name = "drill_joint";
  joint.position.set(0, h * 0.7, d / 2 + 0.02);
  group.add(joint);

  // Drill bit -- cone at the end
  const bitLen = 0.12 + rand() * 0.06;
  const bitR = drillArmR * 1.3;
  const bitGeo = new THREE.ConeGeometry(bitR, bitLen, 8);
  const bit = new THREE.Mesh(bitGeo, accentMat);
  bit.name = "drill_bit";
  bit.rotation.x = Math.PI; // Point downward
  bit.position.set(0, h * 0.2, d / 2 + drillArmLen * 0.65);
  group.add(bit);

  // Spiral grooves on drill bit
  const spiralGeo = new THREE.TorusGeometry(bitR * 0.7, bitR * 0.1, 3, 12, Math.PI * 3);
  const spiral = new THREE.Mesh(spiralGeo, secondaryMat);
  spiral.name = "drill_spiral";
  spiral.position.copy(bit.position);
  spiral.rotation.x = Math.PI / 2;
  group.add(spiral);

  // Panel detail on arm
  const armPanelGeo = createPanel({
    width: drillArmLen * 0.5,
    height: drillArmR * 3,
    depth: 0.01,
    boltPattern: "corners",
    boltRadius: 0.005,
    insetDepth: 0.004,
    insetMargin: 0.1,
    seamLines: 0,
    ventSlots: 0,
  });
  const armPanel = new THREE.Mesh(armPanelGeo, bodyMat);
  armPanel.name = "arm_panel";
  armPanel.position.set(drillArmR + 0.01, h * 0.55, d / 2 + drillArmLen * 0.3);
  armPanel.rotation.y = Math.PI / 2;
  group.add(armPanel);

  // Interaction point
  group.add(createInteractionPoint(colors, new THREE.Vector3(-w * 0.35, h * 0.3, 0)));

  return group;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

function generateProcessor(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_processor";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);

  // Compact box body
  const w = 0.7;
  const h = 0.6;
  const d = 0.6;
  const faces: BoxFaceOptions = {
    front: {
      boltPattern: "grid",
      boltCount: 3,
      boltRadius: 0.008,
      insetDepth: 0.012,
      insetMargin: 0.08,
      ventSlots: 5,
      seamLines: 0,
    },
    back: {
      boltPattern: "edges",
      boltRadius: 0.008,
      boltCount: 3,
      ventSlots: 5,
      seamLines: 1,
    },
    left: {
      boltPattern: "corners",
      boltRadius: 0.008,
      ventSlots: 3,
      ventVertical: true,
      seamLines: 1,
    },
    right: {
      boltPattern: "corners",
      boltRadius: 0.008,
      ventSlots: 3,
      ventVertical: true,
      seamLines: 1,
    },
    top: {
      boltPattern: "grid",
      boltCount: 2,
      boltRadius: 0.006,
      insetDepth: 0.01,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const bodyGeo = createBoxFromPanels(w, h, d, faces);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = "body";
  body.position.set(0, h / 2, 0);
  group.add(body);

  // Status indicator lights on front -- row of small dots
  const indicatorCount = 3 + Math.floor(rand() * 3);
  const indicatorSpan = w * 0.5;
  for (let i = 0; i < indicatorCount; i++) {
    const t = indicatorCount === 1 ? 0.5 : i / (indicatorCount - 1);
    const x = -indicatorSpan / 2 + indicatorSpan * t;
    const dotGeo = new THREE.SphereGeometry(0.012, 4, 4);
    const dotColor = i === 0 ? colors.accent : (rand() > 0.6 ? colors.accent : "#444444");
    const dot = new THREE.Mesh(dotGeo, createGlowMat(dotColor, i === 0 ? 0.5 : 0.2));
    dot.name = `indicator_${i}`;
    dot.position.set(x, h * 0.8, d / 2 + 0.01);
    group.add(dot);
  }

  // Input/output ports on sides
  for (const side of [-1, 1]) {
    const portGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 6);
    const port = new THREE.Mesh(portGeo, accentMat);
    port.name = `port_${side > 0 ? "right" : "left"}`;
    port.rotation.z = Math.PI / 2;
    port.position.set(side * (w / 2 + 0.015), h * 0.35, 0);
    group.add(port);
  }

  // Interaction point
  group.add(createInteractionPoint(colors, new THREE.Vector3(0, h * 0.4, d / 2 + 0.1)));

  return group;
}

// ---------------------------------------------------------------------------
// Outpost
// ---------------------------------------------------------------------------

function generateOutpost(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_outpost";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);
  const secondaryMat = createSecondaryMat(colors);

  // Support legs -- four cylinders
  const legH = 0.5 + rand() * 0.2;
  const legR = 0.04;
  const platformW = 1.0;
  const platformD = 0.8;

  for (let lx = -1; lx <= 1; lx += 2) {
    for (let lz = -1; lz <= 1; lz += 2) {
      const legGeo = new THREE.CylinderGeometry(legR, legR * 1.2, legH, 4);
      const leg = new THREE.Mesh(legGeo, secondaryMat);
      leg.name = `leg_${lx > 0 ? "r" : "l"}_${lz > 0 ? "f" : "b"}`;
      leg.position.set(
        lx * (platformW / 2 - legR * 2),
        legH / 2,
        lz * (platformD / 2 - legR * 2),
      );
      group.add(leg);

      // Foot pad
      const footGeo = new THREE.CylinderGeometry(legR * 2, legR * 2.5, 0.02, 6);
      const foot = new THREE.Mesh(footGeo, bodyMat);
      foot.name = `foot_${lx > 0 ? "r" : "l"}_${lz > 0 ? "f" : "b"}`;
      foot.position.set(leg.position.x, 0.01, leg.position.z);
      group.add(foot);
    }
  }

  // Elevated platform
  const platH = 0.25;
  const platFaces: BoxFaceOptions = {
    front: {
      boltPattern: "edges",
      boltRadius: 0.01,
      boltCount: 4,
      insetDepth: 0.01,
      seamLines: 1,
    },
    back: {
      boltPattern: "edges",
      boltRadius: 0.01,
      boltCount: 4,
      insetDepth: 0.01,
      seamLines: 1,
    },
    left: {
      boltPattern: "corners",
      boltRadius: 0.008,
      insetDepth: 0.008,
    },
    right: {
      boltPattern: "corners",
      boltRadius: 0.008,
      insetDepth: 0.008,
    },
    top: {
      boltPattern: "grid",
      boltCount: 3,
      boltRadius: 0.006,
      insetDepth: 0.006,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const platGeo = createBoxFromPanels(platformW, platH, platformD, platFaces);
  const plat = new THREE.Mesh(platGeo, bodyMat);
  plat.name = "platform";
  plat.position.set(0, legH + platH / 2, 0);
  group.add(plat);

  // Antenna on top
  const antennaH = 0.4 + rand() * 0.2;
  const antennaR = 0.015;
  const antennaGeo = new THREE.CylinderGeometry(antennaR, antennaR * 1.3, antennaH, 4);
  const antenna = new THREE.Mesh(antennaGeo, accentMat);
  antenna.name = "antenna";
  antenna.position.set(
    (rand() - 0.5) * platformW * 0.3,
    legH + platH + antennaH / 2,
    (rand() - 0.5) * platformD * 0.3,
  );
  group.add(antenna);

  // Antenna tip sphere
  const tipGeo = new THREE.SphereGeometry(antennaR * 3, 6, 6);
  const tip = new THREE.Mesh(tipGeo, createGlowMat(colors.accent, 0.4));
  tip.name = "antenna_tip";
  tip.position.set(antenna.position.x, legH + platH + antennaH, antenna.position.z);
  group.add(tip);

  // Railing posts on platform edge
  const railH = 0.15;
  const postR = 0.01;
  const railPositions: [number, number][] = [
    [-platformW / 2, -platformD / 2],
    [platformW / 2, -platformD / 2],
    [-platformW / 2, platformD / 2],
    [platformW / 2, platformD / 2],
  ];
  for (let i = 0; i < railPositions.length; i++) {
    const [rx, rz] = railPositions[i];
    const postGeo = new THREE.CylinderGeometry(postR, postR, railH, 4);
    const post = new THREE.Mesh(postGeo, secondaryMat);
    post.name = `rail_post_${i}`;
    post.position.set(rx, legH + platH + railH / 2, rz);
    group.add(post);
  }

  // Interaction point at base
  group.add(createInteractionPoint(colors, new THREE.Vector3(0, legH * 0.5, platformD / 2 + 0.1)));

  return group;
}

// ---------------------------------------------------------------------------
// Turret
// ---------------------------------------------------------------------------

function generateTurret(
  rand: SeededRandom,
  colors: FactionColors,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_turret";

  const bodyMat = createBodyMat(colors);
  const accentMat = createAccentMat(colors);
  const secondaryMat = createSecondaryMat(colors);

  // Rotating base -- squat cylinder
  const baseR = 0.35;
  const baseH = 0.2;
  const baseGeo = new THREE.CylinderGeometry(baseR, baseR * 1.15, baseH, 8);
  const base = new THREE.Mesh(baseGeo, bodyMat);
  base.name = "base";
  base.position.set(0, baseH / 2, 0);
  group.add(base);

  // Turret housing -- panel box sitting on the base
  const housingW = 0.4;
  const housingH = 0.3;
  const housingD = 0.35;
  const housingFaces: BoxFaceOptions = {
    front: {
      boltPattern: "corners",
      boltRadius: 0.008,
      insetDepth: 0.01,
      insetMargin: 0.1,
      seamLines: 1,
    },
    back: {
      boltPattern: "corners",
      boltRadius: 0.008,
      ventSlots: 2,
    },
    left: {
      boltPattern: "corners",
      boltRadius: 0.006,
    },
    right: {
      boltPattern: "corners",
      boltRadius: 0.006,
    },
    top: {
      boltPattern: "grid",
      boltCount: 2,
      boltRadius: 0.005,
      insetDepth: 0.006,
    },
    bottom: {
      boltPattern: "none",
      insetDepth: 0,
    },
  };
  const housingGeo = createBoxFromPanels(housingW, housingH, housingD, housingFaces);
  const housing = new THREE.Mesh(housingGeo, bodyMat);
  housing.name = "housing";
  housing.position.set(0, baseH + housingH / 2, 0);
  group.add(housing);

  // Barrel assembly -- twin barrels extending forward
  const barrelLen = 0.4 + rand() * 0.15;
  const barrelR = 0.025;
  const barrelSpacing = 0.06;

  for (const dx of [-1, 1]) {
    const barrelGeo = new THREE.CylinderGeometry(barrelR, barrelR * 0.8, barrelLen, 6);
    const barrel = new THREE.Mesh(barrelGeo, secondaryMat);
    barrel.name = `barrel_${dx > 0 ? "right" : "left"}`;
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(
      dx * barrelSpacing,
      baseH + housingH * 0.55,
      housingD / 2 + barrelLen / 2,
    );
    group.add(barrel);

    // Barrel tip
    const tipGeo = new THREE.CylinderGeometry(barrelR * 1.2, barrelR * 1.2, 0.02, 6);
    const tip = new THREE.Mesh(tipGeo, accentMat);
    tip.name = `barrel_tip_${dx > 0 ? "right" : "left"}`;
    tip.rotation.x = Math.PI / 2;
    tip.position.set(
      dx * barrelSpacing,
      baseH + housingH * 0.55,
      housingD / 2 + barrelLen + 0.01,
    );
    group.add(tip);
  }

  // Barrel housing shroud
  const shroudGeo = new THREE.BoxGeometry(barrelSpacing * 3, housingH * 0.4, 0.05);
  const shroud = new THREE.Mesh(shroudGeo, bodyMat);
  shroud.name = "barrel_shroud";
  shroud.position.set(0, baseH + housingH * 0.55, housingD / 2 + 0.025);
  group.add(shroud);

  // Rotation ring between base and housing
  const ringGeo = new THREE.TorusGeometry(baseR * 0.7, 0.02, 4, 12);
  const ring = new THREE.Mesh(ringGeo, accentMat);
  ring.name = "rotation_ring";
  ring.position.set(0, baseH, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Interaction point at rear
  group.add(createInteractionPoint(
    colors,
    new THREE.Vector3(0, baseH + housingH * 0.3, -housingD / 2 - 0.15),
  ));

  return group;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a procedural building mesh for the given building type and faction.
 *
 * The returned THREE.Group is centered with Y=0 at the ground plane.
 * Deterministic: identical inputs always produce the same output.
 *
 * @param buildingType - Building type key (e.g. "lightning_rod", "furnace")
 * @param faction      - Faction key (e.g. "player", "reclaimers")
 * @param seed         - Integer seed for deterministic randomization
 * @returns THREE.Group containing the complete building mesh hierarchy
 */
export function generateBuilding(
  buildingType: string,
  faction: string,
  seed: number,
): THREE.Group {
  const rand = createSeededRandom(seed);
  const colors = getFactionColors(faction);

  let building: THREE.Group;

  switch (buildingType) {
    case "lightning_rod":
      building = generateLightningRod(rand, colors);
      break;
    case "fabrication_unit":
      building = generateFabricationUnit(rand, colors);
      break;
    case "furnace":
      building = generateFurnace(rand, colors);
      break;
    case "miner":
      building = generateMiner(rand, colors);
      break;
    case "processor":
      building = generateProcessor(rand, colors);
      break;
    case "outpost":
      building = generateOutpost(rand, colors);
      break;
    case "turret":
      building = generateTurret(rand, colors);
      break;
    default:
      // Unknown building type: generate a generic panel box
      building = generateGenericBuilding(rand, colors, buildingType);
      break;
  }

  return building;
}

// ---------------------------------------------------------------------------
// Generic fallback
// ---------------------------------------------------------------------------

function generateGenericBuilding(
  rand: SeededRandom,
  colors: FactionColors,
  buildingType: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `building_${buildingType}`;

  const w = 0.6 + rand() * 0.4;
  const h = 0.4 + rand() * 0.4;
  const d = 0.5 + rand() * 0.3;

  const faces: BoxFaceOptions = {
    front: {
      boltPattern: "corners",
      boltRadius: 0.01,
      insetDepth: 0.01,
      seamLines: 1,
    },
    back: { boltPattern: "corners", boltRadius: 0.01 },
    left: { boltPattern: "corners", boltRadius: 0.008 },
    right: { boltPattern: "corners", boltRadius: 0.008 },
    top: { boltPattern: "grid", boltCount: 2, boltRadius: 0.006 },
    bottom: { boltPattern: "none", insetDepth: 0 },
  };

  const bodyGeo = createBoxFromPanels(w, h, d, faces);
  const body = new THREE.Mesh(bodyGeo, createBodyMat(colors));
  body.name = "body";
  body.position.set(0, h / 2, 0);
  group.add(body);

  group.add(createInteractionPoint(colors, new THREE.Vector3(0, h * 0.4, d / 2 + 0.1)));

  return group;
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Recursively dispose all geometries and materials in a building group.
 * Call this when removing a building mesh to free GPU memory.
 */
export function disposeBuildingGroup(group: THREE.Group): void {
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
