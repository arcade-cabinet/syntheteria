const DEFAULT_NEW_GAME_CONFIG = {
  sectorScale: "standard",
  difficulty: "standard",
  climateProfile: "temperate",
  stormProfile: "volatile"
};
const SECTOR_SCALE_SPECS = {
  small: {
    width: 28,
    height: 28,
    label: "Small",
    description: "Fast start, tighter district lattice, shorter campaigns."
  },
  standard: {
    width: 40,
    height: 40,
    label: "Standard",
    description: "Default intended experience with balanced district breadth."
  },
  large: {
    width: 56,
    height: 56,
    label: "Large",
    description: "Broader machine-world, slower expansion, wider sector variety."
  }
};
const DIFFICULTY_LABELS = {
  story: "Story",
  standard: "Standard",
  hard: "Hard"
};
const CLIMATE_PROFILE_SPECS = {
  temperate: {
    label: "Temperate",
    description: "Balanced coastlines, meadow belts, and moderate uplands.",
    waterLevel: 0.35,
    sandLevel: 0.45,
    mountainLevel: 0.7,
    grassMoistureLevel: 0.5,
    elevationBias: 0,
    moistureBias: 0
  },
  wet: {
    label: "Wet",
    description: "Floodplains, broad rivers, and saturated grasslands.",
    waterLevel: 0.4,
    sandLevel: 0.5,
    mountainLevel: 0.74,
    grassMoistureLevel: 0.42,
    elevationBias: -0.03,
    moistureBias: 0.16
  },
  arid: {
    label: "Arid",
    description: "Dry basins, canyon margins, and sparse green zones.",
    waterLevel: 0.28,
    sandLevel: 0.58,
    mountainLevel: 0.72,
    grassMoistureLevel: 0.7,
    elevationBias: 0.04,
    moistureBias: -0.2
  },
  frozen: {
    label: "Frozen",
    description: "Cold waters, exposed ridgelines, and austere plains.",
    waterLevel: 0.38,
    sandLevel: 0.46,
    mountainLevel: 0.64,
    grassMoistureLevel: 0.58,
    elevationBias: 0.06,
    moistureBias: -0.05
  }
};
const STORM_PROFILE_SPECS = {
  stable: {
    label: "Stable",
    description: "Calmer cycles with fewer extreme surges.",
    baseStormIntensity: 0.55,
    stormOscillation: 0.14,
    stormSurgeMax: 0.16
  },
  volatile: {
    label: "Volatile",
    description: "Default storm pressure with recurring surges.",
    baseStormIntensity: 0.7,
    stormOscillation: 0.2,
    stormSurgeMax: 0.3
  },
  cataclysmic: {
    label: "Cataclysmic",
    description: "Violent arcs and sustained infrastructure stress.",
    baseStormIntensity: 0.92,
    stormOscillation: 0.28,
    stormSurgeMax: 0.42
  }
};
function createNewGameConfig(worldSeed, overrides = {}) {
  return {
    worldSeed: worldSeed >>> 0,
    ...DEFAULT_NEW_GAME_CONFIG,
    ...overrides
  };
}
function getSectorScaleSpec(sectorScale) {
  return SECTOR_SCALE_SPECS[sectorScale];
}
function getClimateProfileSpec(climateProfile) {
  return CLIMATE_PROFILE_SPECS[climateProfile];
}
function getStormProfileSpec(stormProfile) {
  return STORM_PROFILE_SPECS[stormProfile];
}

export { CLIMATE_PROFILE_SPECS as C, DIFFICULTY_LABELS as D, SECTOR_SCALE_SPECS as S, STORM_PROFILE_SPECS as a, createNewGameConfig as c, getStormProfileSpec as g };
//# sourceMappingURL=config-DqmIuxQs.js.map
