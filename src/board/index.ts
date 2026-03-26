/**
 * @package board
 *
 * Deterministic labyrinth board generation, tile grid utilities,
 * BabylonJS scene population, and Yuka navigation graph building.
 */

// --- Adjacency & pathfinding ---
export {
	isPassableFor,
	movementCost,
	reachableTiles,
	shortestPath,
	tileNeighbors,
} from "./adjacency";
// --- Chunks ---
export type { Chunk, ChunkKey } from "./chunks";
export { CHUNK_SIZE, chunkKey, generateChunk } from "./chunks";
// --- Coordinates ---
export {
	babylonToYuka,
	chunkOrigin,
	ELEVATION_STEP_M as ELEV_M,
	TILE_SIZE_M as TILE_M,
	tileToBabylon,
	tileToChunk,
	tileToWorldX,
	tileToWorldY,
	tileToWorldZ,
	tileToYuka,
	worldToBabylon,
	worldToTileX,
	worldToTileZ,
	worldToYuka,
	yukaToBabylon,
} from "./coords";
// --- Generator ---
export { generateBoard } from "./generator";
export type { GridApi } from "./grid";

// --- Grid ---
export { createGridApi, ELEVATION_STEP_M, TILE_SIZE_M } from "./grid";
// --- Zone POIs ---
export type { ZonePoiType } from "./labyrinth";
export { ZONE_POI_DEFS } from "./labyrinth";
export { generateLabyrinthBoard } from "./labyrinthGenerator";
// --- Navigation (Yuka) ---
export type { ChunkNavGraph, WorldNavGraph } from "./navigation";
export {
	buildChunkNavGraph,
	connectChunkGraphs,
	createWorldNavGraph,
	mergeChunkIntoWorld,
} from "./navigation";
// --- Noise ---
export {
	createDualRng,
	createNoise2D,
	fnv1a,
	seededRng,
	simplexNoise2D,
} from "./noise";
// --- Scene (BabylonJS) ---
export type { ChunkMeshes } from "./scene";
export { disposeChunkMeshes, populateChunkScene } from "./scene";
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
export {
	WORLD_EXTENT,
	ZONE_PROFILES,
	zoneAtWorldPos,
	zoneCounts,
	zoneForTile,
} from "./zones";
