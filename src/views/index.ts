/**
 * @package views
 *
 * Phaser + enable3d game board rendering.
 * NO React dependency — pure Phaser/Three.js.
 *
 * React mounts the game via src/app/GameBoard.tsx (the only React bridge).
 * React ↔ Phaser communication via EventBus.
 */

export type { GameBoardConfig } from "./board/createGame";
export { createGame } from "./board/createGame";
export { EventBus } from "./board/eventBus";
// --- Lighting ---
export {
	applyEpochAtmosphere,
	getCurrentAtmosphereEpoch,
	getEpochAtmosphereParams,
	resetEpochAtmosphere,
} from "./board/lighting/epochAtmosphere";
export {
	addAccentLight,
	setupWorldLighting,
} from "./board/lighting/worldLighting";
// --- Roboform overlay ---
export type { RoboformTile } from "./board/renderers/roboformOverlay";
export {
	clearRoboformData,
	createRoboformOverlay,
	destroyRoboformOverlay,
	getRoboformLevel,
	getRoboformSnapshot,
	setRoboformLevel,
	updateRoboformOverlay,
} from "./board/renderers/roboformOverlay";
export { WorldScene } from "./board/scenes/WorldScene";
