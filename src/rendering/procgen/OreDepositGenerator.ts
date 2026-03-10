/**
 * OreDepositGenerator -- Procedural ore deposit mesh generator.
 *
 * Generates visually distinct ore deposits for each ore type using a combination
 * of deformed geometry and the PanelGeometry system (for scrap iron). Each ore
 * type has a unique silhouette and material treatment:
 *
 *   rock       -- rough irregular boulders (noise-displaced spheres)
 *   scrap_iron -- corroded metal chunks with panel fragments
 *   copper     -- oxidized metallic veins with green patina patches
 *   silicon    -- crystalline geometric formations (octahedrons, tetrahedrons)
 *   titanium   -- smooth metallic surface with geometric facets
 *
 * Usage:
 *   const deposit = generateOreDeposit("copper", 42, "medium");
 *   scene.add(deposit);
 *
 * Deterministic: same (oreType, seed, size) always produces the same mesh.
 */

import * as THREE from "three";
// mergeGeometries imported for future multi-lobe deposits
import type {} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createBoxFromPanels, createPanel, type BoxFaceOptions } from "./PanelGeometry.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DepositSize = "small" | "medium" | "large";

/** Seeded random function: returns [0, 1) deterministically. */
type SeededRandom = () => number;

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
// Ore visual configs
// ---------------------------------------------------------------------------

interface OreVisualConfig {
  primaryColor: string;
  secondaryColor: string;
  emissiveColor: string;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
}

const ORE_VISUALS: Record<string, OreVisualConfig> = {
  rock: {
    primaryColor: "#8B7355",
    secondaryColor: "#6B5B45",
    emissiveColor: "#000000",
    metalness: 0.05,
    roughness: 0.95,
    emissiveIntensity: 0,
  },
  scrap_iron: {
    primaryColor: "#8B4513",
    secondaryColor: "#5A3010",
    emissiveColor: "#331100",
    metalness: 0.6,
    roughness: 0.75,
    emissiveIntensity: 0,
  },
  copper: {
    primaryColor: "#B87333",
    secondaryColor: "#4A8B5E",
    emissiveColor: "#2A4A30",
    metalness: 0.85,
    roughness: 0.35,
    emissiveIntensity: 0.05,
  },
  silicon: {
    primaryColor: "#A0A0C0",
    secondaryColor: "#C0C0E0",
    emissiveColor: "#6060AA",
    metalness: 0.3,
    roughness: 0.1,
    emissiveIntensity: 0.15,
  },
  titanium: {
    primaryColor: "#C0C0C0",
    secondaryColor: "#D8D8E8",
    emissiveColor: "#888899",
    metalness: 0.95,
    roughness: 0.15,
    emissiveIntensity: 0.02,
  },
};

const DEFAULT_ORE_VISUAL: OreVisualConfig = {
  primaryColor: "#808080",
  secondaryColor: "#606060",
  emissiveColor: "#000000",
  metalness: 0.3,
  roughness: 0.7,
  emissiveIntensity: 0,
};

// ---------------------------------------------------------------------------
// Size scaling
// ---------------------------------------------------------------------------

interface SizeSpec {
  /** Base radius / dimension multiplier. */
  scale: number;
  /** Number of sub-elements to compose. */
  clusterCount: number;
}

const SIZE_SPECS: Record<DepositSize, SizeSpec> = {
  small: { scale: 0.4, clusterCount: 2 },
  medium: { scale: 0.7, clusterCount: 4 },
  large: { scale: 1.0, clusterCount: 7 },
};

// ---------------------------------------------------------------------------
// Depletion scale helper
// ---------------------------------------------------------------------------

/**
 * Returns a uniform scale factor [0, 1] based on how depleted a deposit is.
 * The deposit visually shrinks as resources are extracted.
 *
 * @param remaining - Current quantity remaining
 * @param max       - Maximum quantity when full
 * @returns Scale factor from a minimum of 0.15 (nearly gone) to 1.0 (full)
 */
export function getDepletionScale(remaining: number, max: number): number {
  if (max <= 0) return 0.15;
  const ratio = Math.max(0, Math.min(1, remaining / max));
  // Minimum visual scale of 0.15 so the deposit never fully vanishes
  return 0.15 + ratio * 0.85;
}

// ---------------------------------------------------------------------------
// Material helpers
// ---------------------------------------------------------------------------

function createOreMaterial(config: OreVisualConfig): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.primaryColor),
    metalness: config.metalness,
    roughness: config.roughness,
  });
  if (config.emissiveIntensity > 0) {
    mat.emissive = new THREE.Color(config.emissiveColor);
    mat.emissiveIntensity = config.emissiveIntensity;
  }
  return mat;
}

function createSecondaryOreMaterial(config: OreVisualConfig): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.secondaryColor),
    metalness: config.metalness * 0.8,
    roughness: Math.min(1, config.roughness + 0.1),
  });
  if (config.emissiveIntensity > 0) {
    mat.emissive = new THREE.Color(config.emissiveColor);
    mat.emissiveIntensity = config.emissiveIntensity * 0.5;
  }
  return mat;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Displace sphere vertices with seeded noise to create irregular boulder shapes.
 */
function displaceGeometry(
  geo: THREE.BufferGeometry,
  rand: SeededRandom,
  amplitude: number,
): void {
  const positions = geo.getAttribute("position");
  const normal = geo.getAttribute("normal");
  for (let i = 0; i < positions.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const displacement = (rand() - 0.5) * 2 * amplitude;
    positions.setX(i, positions.getX(i) + nx * displacement);
    positions.setY(i, positions.getY(i) + ny * displacement);
    positions.setZ(i, positions.getZ(i) + nz * displacement);
  }
  positions.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
}

// ---------------------------------------------------------------------------
// Rock generator
// ---------------------------------------------------------------------------

function generateRockDeposit(
  rand: SeededRandom,
  sizeSpec: SizeSpec,
  config: OreVisualConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "deposit_rock";
  const mat = createOreMaterial(config);
  const matAlt = createSecondaryOreMaterial(config);

  for (let i = 0; i < sizeSpec.clusterCount; i++) {
    const r = sizeSpec.scale * (0.2 + rand() * 0.3);
    const segments = 6 + Math.floor(rand() * 4);
    const geo = new THREE.SphereGeometry(r, segments, segments);
    displaceGeometry(geo, rand, r * 0.35);

    const mesh = new THREE.Mesh(geo, rand() > 0.5 ? mat : matAlt);
    mesh.name = `boulder_${i}`;

    // Cluster boulders near center with slight randomness
    const spread = sizeSpec.scale * 0.5;
    mesh.position.set(
      (rand() - 0.5) * spread,
      r * 0.3 + rand() * r * 0.2,
      (rand() - 0.5) * spread,
    );
    mesh.rotation.set(
      rand() * Math.PI,
      rand() * Math.PI,
      rand() * Math.PI,
    );

    group.add(mesh);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Scrap iron generator
// ---------------------------------------------------------------------------

function generateScrapIronDeposit(
  rand: SeededRandom,
  sizeSpec: SizeSpec,
  config: OreVisualConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "deposit_scrap_iron";
  const mat = createOreMaterial(config);
  const rustMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.primaryColor).offsetHSL(0.02, -0.1, -0.15),
    metalness: config.metalness * 0.4,
    roughness: Math.min(1, config.roughness + 0.2),
  });

  for (let i = 0; i < sizeSpec.clusterCount; i++) {
    const type = Math.floor(rand() * 3);
    const s = sizeSpec.scale;
    const spread = s * 0.6;

    let mesh: THREE.Mesh;

    if (type === 0) {
      // Panel fragment -- uses the panel system
      const panelW = s * (0.15 + rand() * 0.25);
      const panelH = s * (0.15 + rand() * 0.25);
      const panelGeo = createPanel({
        width: panelW,
        height: panelH,
        depth: 0.02 * s,
        boltPattern: rand() > 0.5 ? "corners" : "none",
        boltRadius: 0.008 * s,
        insetDepth: rand() > 0.5 ? 0.005 * s : 0,
        insetMargin: 0.1,
        seamLines: rand() > 0.5 ? 1 : 0,
        ventSlots: 0,
      });
      mesh = new THREE.Mesh(panelGeo, rand() > 0.4 ? mat : rustMat);
      mesh.name = `panel_fragment_${i}`;
    } else if (type === 1) {
      // Bent metal chunk -- deformed box
      const chunkW = s * (0.08 + rand() * 0.15);
      const chunkH = s * (0.05 + rand() * 0.1);
      const chunkD = s * (0.08 + rand() * 0.15);
      const geo = new THREE.BoxGeometry(chunkW, chunkH, chunkD);
      displaceGeometry(geo, rand, chunkH * 0.3);
      mesh = new THREE.Mesh(geo, mat);
      mesh.name = `chunk_${i}`;
    } else {
      // Broken machinery piece -- small panel box
      const boxSize = s * (0.1 + rand() * 0.12);
      const faceOpts: BoxFaceOptions = {
        front: {
          boltPattern: "corners",
          boltRadius: 0.005 * s,
          insetDepth: 0.003 * s,
          ventSlots: rand() > 0.6 ? 2 : 0,
          seamLines: 0,
        },
      };
      const boxGeo = createBoxFromPanels(
        boxSize,
        boxSize * (0.6 + rand() * 0.4),
        boxSize * (0.6 + rand() * 0.4),
        faceOpts,
      );
      mesh = new THREE.Mesh(boxGeo, rustMat);
      mesh.name = `machinery_${i}`;
    }

    mesh.position.set(
      (rand() - 0.5) * spread,
      mesh.geometry.boundingBox
        ? (mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y) * 0.3
        : 0.05,
      (rand() - 0.5) * spread,
    );
    mesh.rotation.set(
      (rand() - 0.5) * 0.6,
      rand() * Math.PI * 2,
      (rand() - 0.5) * 0.4,
    );

    group.add(mesh);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Copper generator
// ---------------------------------------------------------------------------

function generateCopperDeposit(
  rand: SeededRandom,
  sizeSpec: SizeSpec,
  config: OreVisualConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "deposit_copper";

  const copperMat = createOreMaterial(config);
  // Green patina material
  const patinaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4A8B5E"),
    metalness: 0.5,
    roughness: 0.6,
    emissive: new THREE.Color("#1A3A20"),
    emissiveIntensity: 0.03,
  });
  // Dark host rock material
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#5A5045"),
    metalness: 0.1,
    roughness: 0.9,
  });

  // Base rock mass
  const baseR = sizeSpec.scale * 0.35;
  const baseGeo = new THREE.SphereGeometry(baseR, 8, 7);
  displaceGeometry(baseGeo, rand, baseR * 0.25);
  const baseMesh = new THREE.Mesh(baseGeo, rockMat);
  baseMesh.name = "host_rock";
  baseMesh.position.set(0, baseR * 0.4, 0);
  group.add(baseMesh);

  // Copper veins -- elongated deformed spheroids emerging from rock
  const veinCount = Math.max(2, sizeSpec.clusterCount - 1);
  for (let i = 0; i < veinCount; i++) {
    const veinLen = sizeSpec.scale * (0.15 + rand() * 0.2);
    const veinR = sizeSpec.scale * (0.03 + rand() * 0.05);
    const veinGeo = new THREE.CylinderGeometry(veinR, veinR * 0.6, veinLen, 5);
    displaceGeometry(veinGeo, rand, veinR * 0.4);

    const usesPatina = rand() > 0.5;
    const mesh = new THREE.Mesh(veinGeo, usesPatina ? patinaMat : copperMat);
    mesh.name = `vein_${i}`;

    // Position veins emerging from the base rock surface
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI * 0.6;
    mesh.position.set(
      Math.sin(theta) * Math.cos(phi) * baseR * 0.5,
      baseR * 0.3 + Math.sin(phi) * baseR * 0.4,
      Math.cos(theta) * Math.cos(phi) * baseR * 0.5,
    );
    mesh.rotation.set(
      (rand() - 0.5) * 1.2,
      rand() * Math.PI * 2,
      (rand() - 0.5) * 1.2,
    );

    group.add(mesh);
  }

  // Patina patches -- thin planes on the rock surface
  const patchCount = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < patchCount; i++) {
    const patchR = sizeSpec.scale * (0.06 + rand() * 0.08);
    const patchGeo = new THREE.CircleGeometry(patchR, 6);
    const patch = new THREE.Mesh(patchGeo, patinaMat);
    patch.name = `patina_${i}`;

    const angle = rand() * Math.PI * 2;
    patch.position.set(
      Math.cos(angle) * baseR * 0.7,
      baseR * 0.3 + (rand() - 0.3) * baseR * 0.5,
      Math.sin(angle) * baseR * 0.7,
    );
    patch.lookAt(0, baseR * 0.4, 0);
    patch.rotateZ(rand() * Math.PI);

    group.add(patch);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Silicon generator
// ---------------------------------------------------------------------------

function generateSiliconDeposit(
  rand: SeededRandom,
  sizeSpec: SizeSpec,
  config: OreVisualConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "deposit_silicon";

  const crystalMat = createOreMaterial(config);
  crystalMat.transparent = true;
  crystalMat.opacity = 0.85;

  const innerMat = createSecondaryOreMaterial(config);
  innerMat.transparent = true;
  innerMat.opacity = 0.7;

  for (let i = 0; i < sizeSpec.clusterCount; i++) {
    const crystalGroup = new THREE.Group();
    crystalGroup.name = `crystal_${i}`;

    const h = sizeSpec.scale * (0.15 + rand() * 0.25);
    const r = sizeSpec.scale * (0.04 + rand() * 0.06);

    // Choose between octahedron and tetrahedron
    const shapeType = rand() > 0.5 ? "octa" : "tetra";
    let geo: THREE.BufferGeometry;

    if (shapeType === "octa") {
      geo = new THREE.OctahedronGeometry(r);
      // Stretch vertically for crystal column look
      geo.scale(1, h / r, 1);
    } else {
      geo = new THREE.TetrahedronGeometry(r);
      geo.scale(1, h / r, 1);
    }

    const crystal = new THREE.Mesh(geo, rand() > 0.4 ? crystalMat : innerMat);
    crystal.name = `crystal_shape_${i}`;
    crystalGroup.add(crystal);

    // Position: upright crystals emerging from ground
    const spread = sizeSpec.scale * 0.4;
    crystalGroup.position.set(
      (rand() - 0.5) * spread,
      h * 0.4,
      (rand() - 0.5) * spread,
    );
    // Slight tilt for natural cluster look
    crystalGroup.rotation.set(
      (rand() - 0.5) * 0.3,
      rand() * Math.PI * 2,
      (rand() - 0.5) * 0.3,
    );

    group.add(crystalGroup);
  }

  // Small accent crystals around the base
  const accentCount = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < accentCount; i++) {
    const accentR = sizeSpec.scale * (0.02 + rand() * 0.03);
    const accentH = sizeSpec.scale * (0.06 + rand() * 0.08);
    const accentGeo = new THREE.OctahedronGeometry(accentR);
    accentGeo.scale(1, accentH / accentR, 1);

    const accent = new THREE.Mesh(accentGeo, innerMat);
    accent.name = `accent_crystal_${i}`;
    const spread = sizeSpec.scale * 0.5;
    accent.position.set(
      (rand() - 0.5) * spread,
      accentH * 0.3,
      (rand() - 0.5) * spread,
    );
    accent.rotation.set(
      (rand() - 0.5) * 0.4,
      rand() * Math.PI * 2,
      (rand() - 0.5) * 0.4,
    );
    group.add(accent);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Titanium generator
// ---------------------------------------------------------------------------

function generateTitaniumDeposit(
  rand: SeededRandom,
  sizeSpec: SizeSpec,
  config: OreVisualConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "deposit_titanium";

  const titanMat = createOreMaterial(config);
  const facetMat = createSecondaryOreMaterial(config);

  // Main body: dodecahedron with smooth metallic finish
  const mainR = sizeSpec.scale * 0.3;
  const mainGeo = new THREE.DodecahedronGeometry(mainR, 0);
  const main = new THREE.Mesh(mainGeo, titanMat);
  main.name = "titanium_body";
  main.position.set(0, mainR * 0.6, 0);
  main.rotation.set(rand() * 0.3, rand() * Math.PI, rand() * 0.3);
  group.add(main);

  // Faceted satellite chunks
  const chunkCount = Math.max(1, sizeSpec.clusterCount - 2);
  for (let i = 0; i < chunkCount; i++) {
    const chunkR = sizeSpec.scale * (0.08 + rand() * 0.12);
    // Alternate between icosahedron and dodecahedron for variety
    const chunkGeo = rand() > 0.5
      ? new THREE.IcosahedronGeometry(chunkR, 0)
      : new THREE.DodecahedronGeometry(chunkR, 0);

    const chunk = new THREE.Mesh(chunkGeo, rand() > 0.4 ? titanMat : facetMat);
    chunk.name = `facet_chunk_${i}`;

    const spread = sizeSpec.scale * 0.45;
    chunk.position.set(
      (rand() - 0.5) * spread,
      chunkR * 0.5 + rand() * chunkR * 0.3,
      (rand() - 0.5) * spread,
    );
    chunk.rotation.set(
      rand() * Math.PI,
      rand() * Math.PI,
      rand() * Math.PI,
    );

    group.add(chunk);
  }

  // Flat geometric facet planes -- reflective shards lying around
  const shardCount = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < shardCount; i++) {
    const shardSize = sizeSpec.scale * (0.05 + rand() * 0.08);
    const shardGeo = new THREE.PlaneGeometry(shardSize, shardSize * (0.6 + rand() * 0.8));
    const shard = new THREE.Mesh(shardGeo, facetMat);
    shard.name = `shard_${i}`;

    const spread = sizeSpec.scale * 0.5;
    shard.position.set(
      (rand() - 0.5) * spread,
      0.005 + rand() * 0.02,
      (rand() - 0.5) * spread,
    );
    shard.rotation.set(
      -Math.PI / 2 + (rand() - 0.5) * 0.4,
      rand() * Math.PI * 2,
      0,
    );

    group.add(shard);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a procedural ore deposit mesh for the given ore type.
 *
 * The returned THREE.Group is centered with Y=0 at the ground plane.
 * Deterministic: identical inputs always produce the same output.
 *
 * @param oreType - Ore type key: "rock", "scrap_iron", "copper", "silicon", "titanium"
 * @param seed    - Integer seed for deterministic randomization
 * @param size    - Deposit size: "small", "medium", "large"
 * @returns THREE.Group containing the complete deposit mesh hierarchy
 */
export function generateOreDeposit(
  oreType: string,
  seed: number,
  size: DepositSize = "medium",
): THREE.Group {
  const rand = createSeededRandom(seed);
  const config = ORE_VISUALS[oreType] ?? DEFAULT_ORE_VISUAL;
  const sizeSpec = SIZE_SPECS[size];

  let deposit: THREE.Group;

  switch (oreType) {
    case "rock":
      deposit = generateRockDeposit(rand, sizeSpec, config);
      break;
    case "scrap_iron":
      deposit = generateScrapIronDeposit(rand, sizeSpec, config);
      break;
    case "copper":
      deposit = generateCopperDeposit(rand, sizeSpec, config);
      break;
    case "silicon":
      deposit = generateSiliconDeposit(rand, sizeSpec, config);
      break;
    case "titanium":
      deposit = generateTitaniumDeposit(rand, sizeSpec, config);
      break;
    default:
      // Unknown ore type: fall back to rock-like generation
      deposit = generateRockDeposit(rand, sizeSpec, config);
      deposit.name = `deposit_${oreType}`;
      break;
  }

  // Apply slight random Y rotation for variety even with same seed/type combo
  deposit.rotation.y = rand() * Math.PI * 2;

  return deposit;
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Recursively dispose all geometries and materials in a deposit group.
 * Call this when removing a deposit mesh to free GPU memory.
 */
export function disposeDepositGroup(group: THREE.Group): void {
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
