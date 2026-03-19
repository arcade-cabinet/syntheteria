/**
 * @package views
 *
 * Phaser + enable3d game board rendering.
 * NO React dependency — pure Phaser/Three.js.
 *
 * React mounts the game via src/app/GameBoard.tsx (the only React bridge).
 * React ↔ Phaser communication via EventBus.
 */

export { createGame } from "./createGame";
export type { GameBoardConfig } from "./createGame";
export { EventBus } from "./eventBus";
export { WorldScene } from "./scenes/WorldScene";
export { setupWorldLighting, addAccentLight } from "./lighting/worldLighting";
