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
	MapTile,
	MapChunk,
	TileDelta,
	FloorMaterial,
} from "./types";

export {
	TILE_SIZE,
	CHUNK_SIZE,
	LEVEL_HEIGHTS,
	LEVEL_STEP,
	MAX_LEVEL,
	ROBOT_CLEARANCE,
	MAX_BRIDGE_SPAN,
	FLOOR_MATERIALS,
	tileKey,
	tileKey3D,
	chunkKey,
	tileToChunk,
	chunkOrigin,
	chunkTileIndex,
	FOUR_DIRS,
} from "./types";

// ─── WorldGrid (THE public API) ─────────────────────────────────────────────

export {
	// Lifecycle
	initWorldGrid,
	resetWorldGrid,
	// Chunk management
	getChunk,
	updateFocus,
	getLoadedChunks,
	invalidateChunk,
	// Tile queries
	getTile,
	getTileAnyLevel,
	isPassable,
	getNeighbors,
	getPassableNeighbors,
	// Coordinate conversion
	worldToTile,
	tileToWorld,
	// Pathfinding
	findPath,
	getReachable,
	// Compatibility
	isPassableAtWorldPosition,
} from "./worldGrid";

export type { PathResult } from "./worldGrid";

// ─── Lower-level (for advanced consumers like save/load) ────────────────────

export { generateChunk } from "./chunkGen";
export { writeTileDelta, loadChunkDeltas, getWorldSeed } from "./persist";
