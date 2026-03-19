/**
 * Board generator — public API.
 *
 * Delegates to the Rooms-and-Mazes labyrinth pipeline
 * (labyrinthGenerator.ts). Same interface as before: BoardConfig → GeneratedBoard.
 *
 * The old BSP city layout generator code has been replaced.
 */

import { generateLabyrinthBoard } from "./labyrinthGenerator";
import type { BoardConfig, GeneratedBoard } from "./types";

/**
 * Generate a game board from a configuration.
 *
 * Uses the 6-phase Rooms-and-Mazes labyrinth pipeline:
 *   Phase 1: Room placement (faction starts, cult POIs, scatter rooms)
 *   Phase 2: Growing Tree maze fill between rooms
 *   Phase 3: Region connectivity + loop creation
 *   Phase 4: Dead end pruning + bridges/tunnels + column markers
 *   Phase 5: Abyssal zones + platform connective tissue
 *   Phase 6: Zone floor assignment + resource scatter + player start
 *
 * Deterministic: same seed = identical output.
 */
export function generateBoard(config: BoardConfig): GeneratedBoard {
	return generateLabyrinthBoard(config);
}
