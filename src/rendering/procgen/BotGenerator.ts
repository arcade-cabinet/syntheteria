/**
 * BotGenerator — Procedural bot mesh generator with faction-distinct styles.
 *
 * Assembles complete bot meshes from BotParts (chassis, head, arms, legs/treads,
 * antenna) using panel geometry. Each faction has a unique visual identity
 * driven by config/factionVisuals.json.
 *
 * Usage:
 *   const botGroup = generateBotMesh("maintenance_bot", "reclaimers", 42);
 *   scene.add(botGroup);
 *
 * Deterministic: same (botType, faction, seed) always produces the same mesh.
 */

import * as THREE from "three";
import {
  createAntenna,
  createArm,
  createChassis,
  createHead,
  createLeg,
  createTread,
  disposeBotGroup,
  type FactionStyle,
  type SeededRandom,
} from "./BotParts.ts";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

/**
 * Create a seeded pseudo-random number generator using the mulberry32 algorithm.
 * Returns a function that produces deterministic values in [0, 1).
 */
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
// Faction style lookup
// ---------------------------------------------------------------------------

/**
 * Faction visual styles derived from config/factionVisuals.json.
 * Embedded here as TypeScript to avoid resolveJsonModule dependency.
 * Keep in sync with config/factionVisuals.json if that file changes.
 */
const factionVisuals: Record<string, Partial<FactionStyle>> = {
  player: {
    chassisStyle: "angular",
    headStyle: "dome",
    armStyle: "clamp",
    locomotion: "legs",
    primaryColor: "#7B6B4F",
    secondaryColor: "#A0926B",
    accentColor: "#DAA520",
    emissiveColor: "#443300",
    metalness: 0.6,
    roughness: 0.7,
    rustLevel: 0.5,
    boltPattern: "corners",
    panelInset: 0.01,
    ventSlots: 0,
    seamLines: 2,
  },
  reclaimers: {
    chassisStyle: "angular",
    headStyle: "dome",
    armStyle: "clamp",
    locomotion: "treads",
    primaryColor: "#8B4513",
    secondaryColor: "#A0926B",
    accentColor: "#DAA520",
    emissiveColor: "#442200",
    metalness: 0.55,
    roughness: 0.75,
    rustLevel: 0.4,
    boltPattern: "edges",
    panelInset: 0.012,
    ventSlots: 0,
    seamLines: 3,
  },
  volt_collective: {
    chassisStyle: "sleek",
    headStyle: "visor",
    armStyle: "probe",
    locomotion: "hover",
    primaryColor: "#1A2A4A",
    secondaryColor: "#2A3A5A",
    accentColor: "#4499FF",
    emissiveColor: "#2266FF",
    metalness: 0.9,
    roughness: 0.15,
    emissiveGlow: 0.3,
    boltPattern: "none",
    panelInset: 0.02,
    ventSlots: 0,
    seamLines: 0,
  },
  signal_choir: {
    chassisStyle: "rounded",
    headStyle: "antenna_cluster",
    armStyle: "tendril",
    locomotion: "legs",
    primaryColor: "#2A4A2A",
    secondaryColor: "#3A5A3A",
    accentColor: "#88DD44",
    emissiveColor: "#44AA22",
    metalness: 0.7,
    roughness: 0.35,
    anodized: true,
    boltPattern: "grid",
    panelInset: 0.008,
    ventSlots: 4,
    ventVertical: true,
    seamLines: 1,
  },
  iron_creed: {
    chassisStyle: "blocky",
    headStyle: "sensor_array",
    armStyle: "heavy_arm",
    locomotion: "tracks",
    primaryColor: "#3A1A1A",
    secondaryColor: "#4A2A2A",
    accentColor: "#CC3333",
    emissiveColor: "#661111",
    metalness: 0.85,
    roughness: 0.3,
    brushedMetal: true,
    boltPattern: "grid",
    panelInset: 0.015,
    ventSlots: 0,
    seamLines: 2,
  },
  feral: {
    chassisStyle: "angular",
    headStyle: "dome",
    armStyle: "clamp",
    locomotion: "legs",
    primaryColor: "#5A5040",
    secondaryColor: "#6A6050",
    accentColor: "#887744",
    emissiveColor: "#332200",
    metalness: 0.4,
    roughness: 0.85,
    rustLevel: 0.7,
    boltPattern: "corners",
    panelInset: 0.005,
    ventSlots: 0,
    seamLines: 1,
    damageFraction: 0.3,
  },
};

const DEFAULT_STYLE: FactionStyle = {
  chassisStyle: "angular",
  headStyle: "dome",
  armStyle: "clamp",
  locomotion: "legs",
  primaryColor: "#888888",
  secondaryColor: "#666666",
  accentColor: "#AAAAAA",
  emissiveColor: "#333333",
  metalness: 0.6,
  roughness: 0.5,
  boltPattern: "corners",
  panelInset: 0.01,
  ventSlots: 0,
  seamLines: 1,
};

/**
 * Look up the faction style from config, falling back to defaults.
 * Unknown factions get the default neutral style.
 */
function getFactionStyle(faction: string): FactionStyle {
  const config = factionVisuals[faction];
  if (!config) {
    return { ...DEFAULT_STYLE };
  }
  return { ...DEFAULT_STYLE, ...config };
}

// ---------------------------------------------------------------------------
// Bot type dimensions
// ---------------------------------------------------------------------------

interface BotTypeSpec {
  chassisWidth: number;
  chassisHeight: number;
  chassisDepth: number;
  headSize: number;
  hasArms: boolean;
  armLength: number;
  armSegments: number;
  legLength: number;
  hasAntenna: boolean;
  antennaHeight: number;
}

const BOT_TYPE_SPECS: Record<string, BotTypeSpec> = {
  maintenance_bot: {
    chassisWidth: 0.5,
    chassisHeight: 0.4,
    chassisDepth: 0.35,
    headSize: 0.22,
    hasArms: true,
    armLength: 0.35,
    armSegments: 2,
    legLength: 0.3,
    hasAntenna: false,
    antennaHeight: 0,
  },
  utility_drone: {
    chassisWidth: 0.4,
    chassisHeight: 0.3,
    chassisDepth: 0.3,
    headSize: 0.18,
    hasArms: false,
    armLength: 0,
    armSegments: 0,
    legLength: 0.25,
    hasAntenna: true,
    antennaHeight: 0.25,
  },
  fabrication_unit: {
    chassisWidth: 0.7,
    chassisHeight: 0.55,
    chassisDepth: 0.5,
    headSize: 0.25,
    hasArms: true,
    armLength: 0.45,
    armSegments: 3,
    legLength: 0,
    hasAntenna: false,
    antennaHeight: 0,
  },
  scout_bot: {
    chassisWidth: 0.35,
    chassisHeight: 0.25,
    chassisDepth: 0.25,
    headSize: 0.2,
    hasArms: false,
    armLength: 0,
    armSegments: 0,
    legLength: 0.25,
    hasAntenna: true,
    antennaHeight: 0.3,
  },
  heavy_bot: {
    chassisWidth: 0.65,
    chassisHeight: 0.5,
    chassisDepth: 0.45,
    headSize: 0.2,
    hasArms: true,
    armLength: 0.4,
    armSegments: 2,
    legLength: 0,
    hasAntenna: false,
    antennaHeight: 0,
  },
  signal_relay: {
    chassisWidth: 0.4,
    chassisHeight: 0.35,
    chassisDepth: 0.3,
    headSize: 0.2,
    hasArms: false,
    armLength: 0,
    armSegments: 0,
    legLength: 0.3,
    hasAntenna: true,
    antennaHeight: 0.4,
  },
};

/** Default spec for unknown bot types. */
const DEFAULT_SPEC: BotTypeSpec = {
  chassisWidth: 0.45,
  chassisHeight: 0.35,
  chassisDepth: 0.3,
  headSize: 0.2,
  hasArms: true,
  armLength: 0.3,
  armSegments: 2,
  legLength: 0.3,
  hasAntenna: false,
  antennaHeight: 0,
};

function getBotSpec(botType: string): BotTypeSpec {
  return BOT_TYPE_SPECS[botType] ?? { ...DEFAULT_SPEC };
}

// ---------------------------------------------------------------------------
// Feral damage pass
// ---------------------------------------------------------------------------

/**
 * Apply visual damage to a feral bot: randomly hide some children,
 * tint remaining parts with discoloration.
 */
function applyFeralDamage(group: THREE.Group, rand: SeededRandom, fraction: number): void {
  const children = [...group.children];
  for (const child of children) {
    if (child instanceof THREE.Group) {
      // Chance to remove entire sub-groups (missing arm, leg, etc.)
      if (child.name.startsWith("arm_") || child.name.startsWith("leg_")) {
        if (rand() < fraction) {
          group.remove(child);
          disposeBotGroup(child);
          continue;
        }
      }
      // Recurse into sub-groups
      applyFeralDamage(child, rand, fraction * 0.5);
    } else if (child instanceof THREE.Mesh) {
      // Random slight color shift
      if (rand() < fraction && child.material instanceof THREE.MeshStandardMaterial) {
        child.material = child.material.clone();
        child.material.color.offsetHSL(
          (rand() - 0.5) * 0.08,
          -rand() * 0.15,
          -rand() * 0.1,
        );
        child.material.roughness = Math.min(1, child.material.roughness + rand() * 0.3);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Player/Reclaimers mismatched panels pass
// ---------------------------------------------------------------------------

/**
 * For scrap-aesthetic factions (player, reclaimers): randomize individual
 * panel colors to create a "built from salvage" look.
 */
function applyScrapVariation(group: THREE.Group, rand: SeededRandom, intensity: number): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (rand() < intensity) {
        child.material = child.material.clone();
        child.material.color.offsetHSL(
          (rand() - 0.5) * 0.06,
          (rand() - 0.5) * 0.08,
          (rand() - 0.5) * 0.12,
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete bot mesh for the given type, faction, and seed.
 *
 * The returned THREE.Group is centered with Y=0 at the ground plane.
 * Deterministic: identical inputs always produce the same output.
 *
 * @param botType - Bot type key (e.g. "maintenance_bot", "heavy_bot")
 * @param faction - Faction key (e.g. "reclaimers", "volt_collective", "feral")
 * @param seed    - Integer seed for deterministic randomization
 * @returns THREE.Group containing the complete bot mesh hierarchy
 */
export function generateBotMesh(
  botType: string,
  faction: string,
  seed: number,
): THREE.Group {
  const rand = createSeededRandom(seed);
  const style = getFactionStyle(faction);
  const spec = getBotSpec(botType);

  const bot = new THREE.Group();
  bot.name = `bot_${botType}_${faction}_${seed}`;

  // Slight random scale variation per-seed
  const scaleVar = 0.95 + rand() * 0.1;

  // -- Locomotion (bottom) --
  let locomotionHeight: number;
  const useLegs = style.locomotion === "legs" && spec.legLength > 0;
  const useTreads = style.locomotion === "treads" || style.locomotion === "tracks" || style.locomotion === "hover";

  if (useLegs) {
    // Legs
    const legSpacing = spec.chassisWidth * 0.45;
    const leftLeg = createLeg(spec.legLength, style, rand, "left");
    leftLeg.position.set(-legSpacing, 0, 0);
    bot.add(leftLeg);

    const rightLeg = createLeg(spec.legLength, style, rand, "right");
    rightLeg.position.set(legSpacing, 0, 0);
    bot.add(rightLeg);

    locomotionHeight = spec.legLength;
  } else if (useTreads || spec.legLength === 0) {
    // Treads/tracks
    const treadW = spec.chassisWidth * 0.2;
    const treadL = spec.chassisDepth * 1.2;
    const treadSpacing = spec.chassisWidth * 0.5 + treadW * 0.5;

    const leftTread = createTread(treadW, treadL, style, rand, "left");
    leftTread.position.set(-treadSpacing, 0, 0);
    bot.add(leftTread);

    const rightTread = createTread(treadW, treadL, style, rand, "right");
    rightTread.position.set(treadSpacing, 0, 0);
    bot.add(rightTread);

    locomotionHeight = treadW * 0.5;
  } else {
    locomotionHeight = 0.05;
  }

  // -- Chassis (center body) --
  const chassisY = locomotionHeight + spec.chassisHeight / 2;
  const chassis = createChassis(
    spec.chassisWidth,
    spec.chassisHeight,
    spec.chassisDepth,
    style,
    rand,
  );
  chassis.position.set(0, chassisY, 0);
  bot.add(chassis);

  // -- Head (on top of chassis) --
  const headY = chassisY + spec.chassisHeight / 2 + spec.headSize * 0.4;
  const head = createHead(spec.headSize, style.headStyle, style, rand);
  head.position.set(0, headY, spec.chassisDepth * 0.05);
  bot.add(head);

  // -- Arms (on chassis sides) --
  if (spec.hasArms) {
    const armAttachY = chassisY + spec.chassisHeight * 0.2;
    const armSpacing = spec.chassisWidth / 2 + 0.02;

    const leftArm = createArm(spec.armLength, spec.armSegments, style, rand, "left");
    leftArm.position.set(-armSpacing, armAttachY, 0);
    bot.add(leftArm);

    const rightArm = createArm(spec.armLength, spec.armSegments, style, rand, "right");
    rightArm.position.set(armSpacing, armAttachY, 0);
    bot.add(rightArm);
  }

  // -- Antenna (if applicable) --
  if (spec.hasAntenna && spec.antennaHeight > 0) {
    const antenna = createAntenna(spec.antennaHeight, style, rand);
    const antennaX = (rand() - 0.5) * spec.chassisWidth * 0.3;
    antenna.position.set(
      antennaX,
      headY + spec.headSize * 0.35,
      0,
    );
    bot.add(antenna);
  }

  // -- Post-processing passes --

  // Feral damage
  if (faction === "feral" && style.damageFraction) {
    applyFeralDamage(bot, rand, style.damageFraction);
  }

  // Scrap variation for player/reclaimers
  if (faction === "player" || faction === "reclaimers") {
    applyScrapVariation(bot, rand, style.rustLevel ?? 0.3);
  }

  // Apply overall scale variation
  bot.scale.setScalar(scaleVar);

  return bot;
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Dispose all geometries and materials in a bot mesh group.
 * Re-exported from BotParts for convenience.
 */
export { disposeBotGroup } from "./BotParts.ts";
