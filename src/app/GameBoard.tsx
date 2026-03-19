/**
 * GameBoard — React wrapper that mounts a Phaser game into a div.
 *
 * This is the ONLY React component that touches Phaser. It creates a
 * container div, mounts Phaser.Game via useEffect, and cleans up on unmount.
 *
 * All game UI (HUD, modals, overlays) renders as React DOM siblings
 * layered on top of this div.
 */

import { useEffect, useRef } from "react";
import { createGame, updateGameConfig } from "../views/createGame";
import type { GameBoardConfig } from "../views/createGame";
import type { GameSession } from "./types";

interface GameBoardProps {
	session: GameSession;
	onTileClick?: (tileX: number, tileZ: number) => void;
	onUnitSelect?: (entityId: number | null) => void;
}

export function GameBoard({
	session,
	onTileClick,
	onUnitSelect,
}: GameBoardProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<Phaser.Game | null>(null);

	// Mount Phaser game on session change
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !session) return;

		const boardConfig: GameBoardConfig = {
			world: session.world,
			board: session.board,
			boardConfig: session.config,
			onTileClick,
			onUnitSelect,
		};

		const game = createGame(container, boardConfig);
		gameRef.current = game;

		return () => {
			game.destroy(true);
			gameRef.current = null;
		};
	}, [session]); // Recreate game on new session

	// Update callbacks without recreating the game
	useEffect(() => {
		if (!gameRef.current) return;
		updateGameConfig(gameRef.current, { onTileClick, onUnitSelect });
	}, [onTileClick, onUnitSelect]);

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
}
