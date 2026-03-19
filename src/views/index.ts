/**
 * @package views
 *
 * Phaser + enable3d game board rendering.
 * NO React dependency — pure Phaser/Three.js.
 *
 * React mounts the game via src/app/GameBoard.tsx (the only React bridge).
 * This package contains scenes, renderers, lighting, camera, and input.
 */

export { createGame, updateGameConfig } from "./createGame";
export type { GameBoardConfig } from "./createGame";
export { WorldScene } from "./scenes/WorldScene";
export {
	setupWorldLighting,
	addAccentLight,
} from "./lighting/worldLighting";
