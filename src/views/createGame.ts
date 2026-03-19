/**
 * createGame — Phaser.Game factory.
 *
 * Creates and returns a Phaser.Game instance that mounts into the provided
 * container element. Uses enable3d for Three.js integration via Scene3D.
 *
 * Communication with React is via EventBus (not registry callbacks).
 * Board data is passed via Phaser registry for scene access.
 *
 * No React dependency in this file.
 */

import Phaser from "phaser";
import { Canvas, enable3d } from "@enable3d/phaser-extension";
import type { World } from "koota";
import type { BoardConfig, GeneratedBoard } from "../board";
import { WorldScene } from "./scenes/WorldScene";

// ---------------------------------------------------------------------------
// Board config — passed to scenes via Phaser registry
// ---------------------------------------------------------------------------

export interface GameBoardConfig {
	world: World;
	board: GeneratedBoard;
	boardConfig: BoardConfig;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGame(
	container: HTMLElement,
	boardConfig: GameBoardConfig,
): Phaser.Game {
	const dpr = window.devicePixelRatio || 1;

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

	// enable3d wraps Phaser.Game creation to inject the Three.js bridge.
	// The callback runs synchronously — game is assigned before enable3d returns.
	const gameRef: { current: Phaser.Game | null } = { current: null };
	enable3d(() => {
		gameRef.current = new Phaser.Game(config);
		return gameRef.current;
	});

	const game = gameRef.current!;

	// Pass board data to scenes via Phaser registry.
	// Scenes access via this.registry.get("boardConfig").
	game.registry.set("boardConfig", boardConfig);

	return game;
}
