/**
 * src/world/gen/ — Ecumenopolis World Map Generation
 *
 * The ONE source of truth for map data. Every consumer reads through WorldGrid.
 *
 * Architecture:
 *   types.ts     — MapTile, MapChunk, TileDelta, grid constants
 *   chunkGen.ts  — f(worldSeed, cx, cz) → MapChunk (deterministic, no DB)
 *   persist.ts   — SQLite delta persistence (write/read/apply)
 *   worldGrid.ts — In-memory query interface + pathfinding (THE public API)
 *
 * Usage:
 *   import { initWorldGrid, getTile, findPath, updateFocus } from "../world/gen";
 */

// ─── Types (consumers need these for type annotations) ──────────────────────

export type {
	FloorMaterial,
	MapChunk,
	MapTile,
	TileDelta,
} from "./types";

export {
	CHUNK_SIZE,
	chunkKey,
	chunkOrigin,
	chunkTileIndex,
	FLOOR_MATERIALS,
	FOUR_DIRS,
	LEVEL_HEIGHTS,
	LEVEL_STEP,
	MAX_BRIDGE_SPAN,
	MAX_LEVEL,
	ROBOT_CLEARANCE,
	TILE_SIZE,
	tileKey,
	tileKey3D,
	tileToChunk,
} from "./types";

// ─── WorldGrid (THE public API) ─────────────────────────────────────────────

export type { PathResult } from "./worldGrid";
export {
	// Pathfinding
	findPath,
	// Chunk management
	getChunk,
	getLoadedChunks,
	getNeighbors,
	getPassableNeighbors,
	getReachable,
	// Tile queries
	getTile,
	getTileAnyLevel,
	// Lifecycle
	initWorldGrid,
	invalidateChunk,
	isPassable,
	// Compatibility
	isPassableAtWorldPosition,
	resetWorldGrid,
	tileToWorld,
	updateFocus,
	// Coordinate conversion
	worldToTile,
} from "./worldGrid";

// ─── Lower-level (for advanced consumers like save/load) ────────────────────

export { generateChunk } from "./chunkGen";
export { getWorldSeed, loadChunkDeltas, writeTileDelta } from "./persist";
