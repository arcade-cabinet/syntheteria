/**
 * @package board
 *
 * Deterministic labyrinth board generation and tile grid utilities.
 */

// --- Generator ---
export { generateBoard } from "./generator";
export { generateLabyrinthBoard } from "./labyrinthGenerator";

// --- Adjacency & pathfinding ---
export {
	isPassableFor,
	movementCost,
	tileNeighbors,
	reachableTiles,
	shortestPath,
} from "./adjacency";

// --- Grid ---
export { TILE_SIZE_M, ELEVATION_STEP_M, createGridApi } from "./grid";
export type { GridApi } from "./grid";

// --- Noise ---
export { seededRng, createNoise2D, simplexNoise2D } from "./noise";

// --- Types ---
export type {
	FloorType,
	ResourceMaterial,
	Elevation,
	WeightClass,
	TileData,
	BoardConfig,
	GeneratedBoard,
} from "./types";
