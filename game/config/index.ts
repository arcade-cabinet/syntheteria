// Type-safe JSON config imports
// Using typeof inference so TypeScript knows the exact shape

import unitsConfig from '../../config/units.json';
import buildingsConfig from '../../config/buildings.json';
import beltsConfig from '../../config/belts.json';
import miningConfig from '../../config/mining.json';
import processingConfig from '../../config/processing.json';
import furnaceConfig from '../../config/furnace.json';
import enemiesConfig from '../../config/enemies.json';
import civilizationsConfig from '../../config/civilizations.json';
import technologyConfig from '../../config/technology.json';
import depositsConfig from '../../config/deposits.json';
import powerConfig from '../../config/power.json';
import combatConfig from '../../config/combat.json';
import hackingConfig from '../../config/hacking.json';
import materialsConfig from '../../config/materials.json';
import cubeMaterialsConfig from '../../config/cubeMaterials.json';
import factionVisualsConfig from '../../config/factionVisuals.json';
import botMovementConfig from '../../config/botMovement.json';
import questsConfig from '../../config/quests.json';
import mapPresetsConfig from '../../config/mapPresets.json';
import terrainConfig from '../../config/terrain.json';
import audioConfig from '../../config/audio.json';
import renderingConfig from '../../config/rendering.json';

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
} as const;

export type GameConfig = typeof config;
