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
	TILE_SIZE_M as TILE_M,
	ELEVATION_STEP_M as ELEV_M,
	tileToWorldX,
	tileToWorldZ,
	tileToWorldY,
	worldToTileX,
	worldToTileZ,
	tileToChunk,
	chunkOrigin,
	tileToBabylon,
	worldToBabylon,
	tileToYuka,
	worldToYuka,
	babylonToYuka,
	yukaToBabylon,
} from "./coords";
// --- Generator ---
export { generateBoard } from "./generator";
export type { GridApi } from "./grid";

// --- Grid ---
export { createGridApi, ELEVATION_STEP_M, TILE_SIZE_M } from "./grid";
// --- Navigation (Yuka) ---
export type { ChunkNavGraph } from "./navigation";
export { buildChunkNavGraph, connectChunkGraphs } from "./navigation";
// --- Scene (BabylonJS) ---
export type { ChunkMeshes } from "./scene";
export { populateChunkScene, disposeChunkMeshes } from "./scene";
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
export { WORLD_EXTENT, ZONE_PROFILES, zoneAtWorldPos, zoneCounts, zoneForTile } from "./zones";
