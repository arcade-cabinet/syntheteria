// Type-safe JSON config imports
// Using typeof inference so TypeScript knows the exact shape

import unitsConfig from './units.json';
import buildingsConfig from './buildings.json';
import beltsConfig from './belts.json';
import miningConfig from './mining.json';
import processingConfig from './processing.json';
import furnaceConfig from './furnace.json';
import enemiesConfig from './enemies.json';
import civilizationsConfig from './civilizations.json';
import technologyConfig from './technology.json';
import depositsConfig from './deposits.json';
import powerConfig from './power.json';
import combatConfig from './combat.json';
import hackingConfig from './hacking.json';
import materialsConfig from './materials.json';
import cubeMaterialsConfig from './cubeMaterials.json';
import factionVisualsConfig from './factionVisuals.json';
import botMovementConfig from './botMovement.json';
import questsConfig from './quests.json';
import mapPresetsConfig from './mapPresets.json';
import terrainConfig from './terrain.json';
import audioConfig from './audio.json';
import renderingConfig from './rendering.json';
import territoryConfig from './territory.json';
import textureMappingConfig from './textureMapping.json';
import botAutomationConfig from './botAutomation.json';

export const config = {
  units: unitsConfig,
  buildings: buildingsConfig,
  belts: beltsConfig,
  mining: miningConfig,
  processing: processingConfig,
  furnace: furnaceConfig,
  enemies: enemiesConfig,
  civilizations: civilizationsConfig,
  technology: technologyConfig,
  deposits: depositsConfig,
  power: powerConfig,
  combat: combatConfig,
  hacking: hackingConfig,
  materials: materialsConfig,
  cubeMaterials: cubeMaterialsConfig,
  factionVisuals: factionVisualsConfig,
  botMovement: botMovementConfig,
  quests: questsConfig,
  mapPresets: mapPresetsConfig,
  terrain: terrainConfig,
  audio: audioConfig,
  rendering: renderingConfig,
  territory: territoryConfig,
  textureMapping: textureMappingConfig,
  botAutomation: botAutomationConfig,
} as const;

export type GameConfig = typeof config;
