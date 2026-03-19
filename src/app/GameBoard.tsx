/**
 * GameBoard — React wrapper that mounts a Phaser game into a div.
 *
 * This is the ONLY React component that touches Phaser. It creates a
 * container div, mounts Phaser.Game via useLayoutEffect (synchronous,
 * per official Phaser+React template), and cleans up on unmount.
 *
 * Communication: React ↔ Phaser via EventBus (Phaser EventEmitter).
 * React listens for scene-ready, tile-clicked, etc.
 * React emits end-turn, select-unit, etc.
 *
 * All game UI (HUD, modals, overlays) renders as React DOM siblings
 * layered on top of this div.
 */

import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import { createGame } from "../views/createGame";
import type { GameBoardConfig } from "../views/createGame";
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
	function GameBoard({ session, onSceneReady, onTileClick, onUnitSelect }, ref) {
		const containerRef = useRef<HTMLDivElement>(null);
		const gameRef = useRef<Phaser.Game | null>(null);

		// Mount Phaser game synchronously (useLayoutEffect per official template)
		useLayoutEffect(() => {
			const container = containerRef.current;
			if (!container || !session) return;

			const boardConfig: GameBoardConfig = {
				world: session.world,
				board: session.board,
				boardConfig: session.config,
			};

			const game = createGame(container, boardConfig);
			gameRef.current = game;

			// Expose ref to parent
			if (typeof ref === "function") {
				ref({ game });
			} else if (ref) {
				ref.current = { game };
			}

			return () => {
				game.destroy(true);
				gameRef.current = null;
				if (typeof ref === "function") {
					ref(null);
				} else if (ref) {
					ref.current = null;
				}
			};
		}, [session, ref]);

		// EventBus listeners — Phaser → React
		useEffect(() => {
			const handleSceneReady = () => onSceneReady?.();
			const handleTileClick = (x: number, z: number) => onTileClick?.(x, z);
			const handleUnitSelect = (id: number | null) => onUnitSelect?.(id);

			EventBus.on("scene-ready", handleSceneReady);
			EventBus.on("tile-clicked", handleTileClick);
			EventBus.on("unit-selected", handleUnitSelect);

			return () => {
				EventBus.off("scene-ready", handleSceneReady);
				EventBus.off("tile-clicked", handleTileClick);
				EventBus.off("unit-selected", handleUnitSelect);
			};
		}, [onSceneReady, onTileClick, onUnitSelect]);

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
