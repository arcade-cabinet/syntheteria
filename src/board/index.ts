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
// --- Zone POIs ---
export type { ZonePoiType } from "./labyrinth";
export { ZONE_POI_DEFS } from "./labyrinth";
export { generateLabyrinthBoard } from "./labyrinthGenerator";
// --- Noise ---
export { createNoise2D, seededRng, simplexNoise2D } from "./noise";
// --- Terrain ---
export { floorTypeForTile, geographyValue, seedToFloat } from "./terrain";
// --- Types ---
export type {
	BoardConfig,
	ClimateProfile,
	Elevation,
	FloorType,
	GeneratedBoard,
	ResourceMaterial,
	TileData,
	WeightClass,
} from "./types";
export { CLIMATE_PROFILE_SPECS, FLOOR_DEFS, isPassableFloor } from "./types";
// --- Zones ---
export type { WorldZone } from "./zones";
export { ZONE_PROFILES, zoneCounts, zoneForTile } from "./zones";
