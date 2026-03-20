/**
 * GameBoard — React wrapper that mounts a Phaser game into a div.
 *
 * This is the ONLY React component that touches Phaser.
 * Communication: React ↔ Phaser via EventBus (Phaser EventEmitter).
 */

import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import type { GameBoardConfig } from "../views/createGame";
import { createGame } from "../views/createGame";
import { EventBus } from "../views/eventBus";
import type { GameSession } from "./types";

export interface GameBoardRef {
	game: Phaser.Game | null;
}

interface GameBoardProps {
	session: GameSession;
	onSceneReady?: () => void;
	onTileClick?: (tileX: number, tileZ: number) => void;
	onUnitSelect?: (entityId: number | null) => void;
}

export const GameBoard = forwardRef<GameBoardRef, GameBoardProps>(
	function GameBoard(
		{ session, onSceneReady, onTileClick, onUnitSelect },
		ref,
	) {
		const containerRef = useRef<HTMLDivElement>(null);
		const gameRef = useRef<Phaser.Game | null>(null);
		const callbacksRef = useRef({ onSceneReady, onTileClick, onUnitSelect });
		callbacksRef.current = { onSceneReady, onTileClick, onUnitSelect };

		useLayoutEffect(() => {
			const container = containerRef.current;
			if (!container || !session) return;

			// Register EventBus listeners BEFORE creating the game
			// so we catch scene-ready even if it fires during init
			const handleSceneReady = () => callbacksRef.current.onSceneReady?.();
			const handleTileClick = (x: number, z: number) =>
				callbacksRef.current.onTileClick?.(x, z);
			const handleUnitSelect = (id: number | null) =>
				callbacksRef.current.onUnitSelect?.(id);

			EventBus.on("scene-ready", handleSceneReady);
			EventBus.on("tile-clicked", handleTileClick);
			EventBus.on("unit-selected", handleUnitSelect);

			const boardConfig: GameBoardConfig = {
				world: session.world,
				board: session.board,
				boardConfig: session.config,
			};

			const game = createGame(container, boardConfig);
			gameRef.current = game;

			if (typeof ref === "function") {
				ref({ game });
			} else if (ref) {
				ref.current = { game };
			}

			return () => {
				EventBus.off("scene-ready", handleSceneReady);
				EventBus.off("tile-clicked", handleTileClick);
				EventBus.off("unit-selected", handleUnitSelect);
				game.destroy(true);
				gameRef.current = null;
				if (typeof ref === "function") {
					ref(null);
				} else if (ref) {
					ref.current = null;
				}
			};
		}, [session, ref]);

		return (
			<div
				ref={containerRef}
				data-testid="game-board"
				style={{
					position: "absolute",
					inset: 0,
					zIndex: 1,
				}}
			/>
		);
	},
);
