import { f as floorTexturesConfigJson } from './index-COtgIsy1.js';

const floorTexturesConfig = floorTexturesConfigJson;
const CommandAO = "/assets/materials/floors/command_core/ao.jpg";
const CommandColor = "/assets/materials/floors/command_core/color.jpg";
const CommandHeight = "/assets/materials/floors/command_core/height.jpg";
const CommandNormal = "/assets/materials/floors/command_core/normal.jpg";
const CommandRoughness = "/assets/materials/floors/command_core/roughness.jpg";
const CorridorColor = "/assets/materials/floors/corridor_transit/color.jpg";
const CorridorHeight = "/assets/materials/floors/corridor_transit/height.jpg";
const CorridorNormal = "/assets/materials/floors/corridor_transit/normal.jpg";
const CorridorRoughness = "/assets/materials/floors/corridor_transit/roughness.jpg";
const FabricationAO = "/assets/materials/floors/fabrication/ao.jpg";
const FabricationColor = "/assets/materials/floors/fabrication/color.jpg";
const FabricationHeight = "/assets/materials/floors/fabrication/height.jpg";
const FabricationNormal = "/assets/materials/floors/fabrication/normal.jpg";
const FabricationRoughness = "/assets/materials/floors/fabrication/roughness.jpg";
const HabitationAO = "/assets/materials/floors/habitation/ao.jpg";
const HabitationColor = "/assets/materials/floors/habitation/color.jpg";
const HabitationHeight = "/assets/materials/floors/habitation/height.jpg";
const HabitationNormal = "/assets/materials/floors/habitation/normal.jpg";
const HabitationRoughness = "/assets/materials/floors/habitation/roughness.jpg";
const floorZoneIds = Object.keys(
  floorTexturesConfig.zones
);
const floorTextureAssets = {
  command_core: {
    color: CommandColor,
    normal: CommandNormal,
    roughness: CommandRoughness,
    ao: CommandAO,
    height: CommandHeight
  },
  fabrication: {
    color: FabricationColor,
    normal: FabricationNormal,
    roughness: FabricationRoughness,
    ao: FabricationAO,
    height: FabricationHeight
  },
  corridor_transit: {
    color: CorridorColor,
    normal: CorridorNormal,
    roughness: CorridorRoughness,
    height: CorridorHeight
  },
  habitation: {
    color: HabitationColor,
    normal: HabitationNormal,
    roughness: HabitationRoughness,
    ao: HabitationAO,
    height: HabitationHeight
  }
};
function getFloorTextureSet(zoneId) {
  const textureSet = floorTextureAssets[zoneId];
  if (!textureSet) {
    throw new Error(
      `No floor texture set configured for zone "${zoneId}". Available zones: ${floorZoneIds.join(", ")}`
    );
  }
  return textureSet;
}
function getFloorZoneLabel(zoneId) {
  const zone = floorTexturesConfig.zones[zoneId];
  if (!zone) {
    throw new Error(
      `No floor zone label for "${zoneId}" in floorTextures.json`
    );
  }
  return zone.label;
}

const FLOOR_MATERIAL_PRESETS = [
  {
    id: "command_concrete",
    label: "Command Concrete",
    sourceLibraryPath: "/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/Concrete041B",
    baseFamily: "concrete",
    surfaceStyle: "industrial_plain",
    zoneAffinity: ["core", "corridor", "habitation"],
    useCases: ["default traversal floor", "sealed shell sectors"],
    textureSet: floorTextureAssets.command_core,
    textureRepeat: [1.5, 1.5]
  },
  {
    id: "fabrication_plate",
    label: "Fabrication Plate",
    sourceLibraryPath: "/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/DiamondPlate006B",
    baseFamily: "diamond_plate",
    surfaceStyle: "reinforced_plate",
    zoneAffinity: ["fabrication", "power", "storage"],
    useCases: ["heavy machinery floor", "load-bearing assembly zones"],
    textureSet: floorTextureAssets.fabrication,
    textureRepeat: [1.25, 1.25]
  },
  {
    id: "service_walkway",
    label: "Service Walkway",
    sourceLibraryPath: "/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/MetalWalkway008",
    baseFamily: "metal_walkway",
    surfaceStyle: "maintenance_grid",
    zoneAffinity: ["corridor", "power", "fabrication"],
    useCases: ["catwalks", "maintenance spines", "transit decks"],
    textureSet: floorTextureAssets.corridor_transit,
    textureRepeat: [1.1, 1.1]
  },
  {
    id: "painted_habitation",
    label: "Painted Habitation Deck",
    sourceLibraryPath: "/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/PaintedMetal006",
    baseFamily: "painted_metal",
    surfaceStyle: "painted_service",
    zoneAffinity: ["habitation", "core"],
    useCases: ["cleaner interior rooms", "reclaimed civic zones"],
    textureSet: floorTextureAssets.habitation,
    textureRepeat: [1.35, 1.35]
  }
];
function getFloorMaterialsForZone(zone) {
  return FLOOR_MATERIAL_PRESETS.filter(
    (preset) => preset.zoneAffinity.includes(zone)
  );
}
function getDefaultFloorMaterialForZone(zone) {
  const materials = getFloorMaterialsForZone(zone);
  if (materials.length === 0) {
    throw new Error(
      `No floor material preset configured for zone "${zone}". Add a preset with zoneAffinity including "${zone}" to FLOOR_MATERIAL_PRESETS.`
    );
  }
  return materials[0];
}

export { FLOOR_MATERIAL_PRESETS as F, getDefaultFloorMaterialForZone as g };
//# sourceMappingURL=floorMaterialPresets-LMzl77Ms.js.map
