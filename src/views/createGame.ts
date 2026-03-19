/**
 * createGame — Phaser.Game factory.
 *
 * Creates and returns a Phaser.Game instance that mounts into the provided
 * container element. Uses enable3d for Three.js integration via Scene3D.
 *
 * This is the ONLY file that creates a Phaser.Game. React calls this from
 * a useEffect in GameBoard.tsx. No React dependency in this file.
 */

import Phaser from "phaser";
import { Canvas, enable3d } from "@enable3d/phaser-extension";
import { WorldScene } from "./scenes/WorldScene";
import type { World } from "koota";
import type { GeneratedBoard } from "../board";
import type { BoardConfig } from "../board";

// ---------------------------------------------------------------------------
// Game config shared with scenes via Phaser registry
// ---------------------------------------------------------------------------

export interface GameBoardConfig {
	world: World;
	board: GeneratedBoard;
	boardConfig: BoardConfig;
	onTileClick?: (tileX: number, tileZ: number) => void;
	onUnitSelect?: (entityId: number | null) => void;
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

	// Phaser registry is the bridge between React and Phaser scenes.
	// Scenes read from registry; React writes to registry.
	game.registry.set("boardConfig", boardConfig);

	return game;
}

/**
 * Update the board config in a running game (e.g., after turn advance).
 * Scenes read this from registry each frame.
 */
export function updateGameConfig(
	game: Phaser.Game,
	config: Partial<GameBoardConfig>,
): void {
	const current = game.registry.get("boardConfig") as GameBoardConfig;
	game.registry.set("boardConfig", { ...current, ...config });
}
