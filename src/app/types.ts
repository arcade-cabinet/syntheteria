/**
 * Shared types for the app layer.
 */

import type { BoardConfig, GeneratedBoard } from "../board";
import type { WorldType } from "../create-world";
import type { GlobePhase } from "../ui";
import type { NewGameConfig } from "../world/config";

export type Phase = GlobePhase;

export interface GameSession {
	config: BoardConfig;
	gameId: string;
	board: GeneratedBoard;
	world: WorldType;
	newGameConfig?: NewGameConfig;
	spawnTile?: { x: number; z: number };
}
