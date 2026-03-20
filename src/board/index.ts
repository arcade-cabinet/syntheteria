/**
 * @package board
 *
 * Deterministic labyrinth board generation and tile grid utilities.
 */

// --- Adjacency & pathfinding ---
export {
	isPassableFor,
	movementCost,
	reachableTiles,
	shortestPath,
	tileNeighbors,
} from "./adjacency";
// --- Generator ---
export { generateBoard } from "./generator";
export type { GridApi } from "./grid";

// --- Grid ---
export { createGridApi, ELEVATION_STEP_M, TILE_SIZE_M } from "./grid";
export { generateLabyrinthBoard } from "./labyrinthGenerator";

// --- Noise ---
export { createNoise2D, seededRng, simplexNoise2D } from "./noise";
// --- Sphere geometry (grid ↔ sphere math) ---
export {
	buildSphereGeometry,
	SEGS,
	sphereModelPlacement,
	sphereModelPlacementWithRotation,
	spherePosToTile,
	sphereRadius,
	tileToSpherePos,
	worldToTileCoords,
} from "./sphere";
// --- Types ---
export type {
	BoardConfig,
	Elevation,
	FloorType,
	GeneratedBoard,
	ResourceMaterial,
	TileData,
	WeightClass,
} from "./types";
