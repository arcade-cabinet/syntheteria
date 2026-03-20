/**
 * @package views
 *
 * Phaser + enable3d game board rendering.
 * NO React dependency — pure Phaser/Three.js.
 *
 * React mounts the game via src/app/GameBoard.tsx (the only React bridge).
 * React ↔ Phaser communication via EventBus.
 */

export type { GameBoardConfig } from "./createGame";
export { createGame } from "./createGame";
export { EventBus } from "./eventBus";
// --- Lighting ---
export {
	applyEpochAtmosphere,
	getCurrentAtmosphereEpoch,
	getEpochAtmosphereParams,
	resetEpochAtmosphere,
} from "./lighting/epochAtmosphere";
export { addAccentLight, setupWorldLighting } from "./lighting/worldLighting";
// --- Roboform overlay ---
export type { RoboformTile } from "./renderers/roboformOverlay";
export {
	clearRoboformData,
	createRoboformOverlay,
	destroyRoboformOverlay,
	getRoboformLevel,
	getRoboformSnapshot,
	setRoboformLevel,
	updateRoboformOverlay,
} from "./renderers/roboformOverlay";
export { WorldScene } from "./scenes/WorldScene";
