/**
 * Procgen barrel exports -- all procedural generation modules.
 *
 * Usage:
 *   import { createPanel, generateBotMesh, generateOreDeposit, generateBuilding } from './rendering/procgen';
 */

// Panel geometry primitives
export {
  createBoltGeometry,
  createBoxFromPanels,
  createPanel,
  combinePanels,
  type BoxFaceOptions,
  type PanelOptions,
  type PanelPlacement,
} from "./PanelGeometry.ts";

// Bot parts and generation
export {
  createAccentMaterial,
  createAntenna,
  createArm,
  createBodyMaterial,
  createChassis,
  createHead,
  createLeg,
  createSecondaryMaterial,
  createSensorMaterial,
  createTread,
  disposeBotGroup,
  type FactionStyle,
  type SeededRandom,
} from "./BotParts.ts";

export { generateBotMesh } from "./BotGenerator.ts";

// Ore deposit generation
export {
  generateOreDeposit,
  getDepletionScale,
  disposeDepositGroup,
  type DepositSize,
} from "./OreDepositGenerator.ts";

// Building generation
export {
  generateBuilding,
  disposeBuildingGroup,
} from "./BuildingGenerator.ts";
