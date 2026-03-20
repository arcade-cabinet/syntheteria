/**
 * createGame — Phaser.Game factory.
 *
 * Creates a Phaser.Game that mounts into the provided container.
 * Uses enable3d for Three.js integration via Scene3D.
 *
 * Board config is stored as a module-level singleton that WorldScene
 * reads in create(). This avoids the async timing issue with enable3d.
 *
 * No React dependency in this file.
 */

import Phaser from "phaser";
import { Canvas, enable3d } from "@enable3d/phaser-extension";
import type { World } from "koota";
import type { BoardConfig, GeneratedBoard } from "../board";
import { WorldScene } from "./scenes/WorldScene";

// ---------------------------------------------------------------------------
// Board config — module-level singleton, read by WorldScene
// ---------------------------------------------------------------------------

export interface GameBoardConfig {
	world: World;
	board: GeneratedBoard;
	boardConfig: BoardConfig;
}

let _currentBoardConfig: GameBoardConfig | null = null;

/** Called by WorldScene.create() to get the board config. */
export function getBoardConfig(): GameBoardConfig | null {
	return _currentBoardConfig;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGame(
	container: HTMLElement,
	boardConfig: GameBoardConfig,
): Phaser.Game {
	const dpr = window.devicePixelRatio || 1;

	// Store config for WorldScene to read during create()
	_currentBoardConfig = boardConfig;

	// Assign an ID so Phaser can find the container
	if (!container.id) container.id = `phaser-board-${Date.now()}`;

	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.WEBGL,
		transparent: true,
		scale: {
			mode: Phaser.Scale.RESIZE,
			parent: container.id,
			width: container.clientWidth * dpr,
			height: container.clientHeight * dpr,
		},
		scene: [WorldScene],
		...Canvas({ parent: container.id }),
	};

	// enable3d wraps Phaser.Game creation — the callback may run async
	// so we don't try to access the game instance afterward.
	// WorldScene reads _currentBoardConfig in create().
	const game = new Phaser.Game(config);
	enable3d(() => game);

	return game;
}
