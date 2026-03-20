/**
 * WorldGrid — the ONE query interface for the ecumenopolis map.
 *
 * Every consumer (renderer, pathfinding, Yuka AI, harvest, construction,
 * fog of war) reads map data through this module. Nothing else.
 *
 * Internally it manages a chunk cache: chunks are generated on demand
 * via `loadChunk()` (deterministic from seed + SQLite deltas), cached
 * in memory, and evicted by distance from a "focus" position.
 *
 * The grid is 2.5D: tiles have a `level` (0/1/2). Pathfinding operates
 * within a single level unless a ramp connects two levels. Bridges at
 * level 1 create passable tiles above ground-level structures.
 */

import { getChunksConfig } from "../../db/gameConfig";
import type { SyncDatabase } from "../../db/types";
import { loadChunk } from "./persist";
import {
	CHUNK_SIZE,
	chunkKey,
	chunkTileIndex,
	FOUR_DIRS,
	type MapChunk,
	type MapTile,
	TILE_SIZE,
	tileKey,
	tileToChunk,
} from "./types";

// ─── Configuration (read from DB at init) ─────────────────────────────────────

let loadRadius = 3;
let unloadRadius = 5;

// ─── Chunk Cache ────────────────────────────────────────────────────────────

const chunkCache = new Map<string, MapChunk>();

/** Last focus chunk — used for LRU-style eviction */
let focusCX = 0;
let focusCZ = 0;

/** Current world state (set via init) */
let currentDb: SyncDatabase | null = null;
let currentWorldSeed = 42;
let currentSaveGameId = 0;

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Initialize WorldGrid with the current game session.
 * Call once when a game loads (new game or save game).
 * Reads loadRadius/unloadRadius from game_config when db is provided.
 */
export function initWorldGrid(
	db: SyncDatabase | null,
	worldSeed: number,
	saveGameId: number,
): void {
	currentDb = db;
	currentWorldSeed = worldSeed;
	currentSaveGameId = saveGameId;
	chunkCache.clear();
	focusCX = 0;
	focusCZ = 0;

	if (db) {
		const config = getChunksConfig(db);
		if (config) {
			loadRadius = config.loadRadius;
			unloadRadius = config.unloadRadius;
		}
	}
}

/**
 * Reset all state. Call in tests and on game exit.
 */
export function resetWorldGrid(): void {
	chunkCache.clear();
	currentDb = null;
	currentWorldSeed = 42;
	currentSaveGameId = 0;
	focusCX = 0;
	focusCZ = 0;
}

// ─── Chunk Management ───────────────────────────────────────────────────────

/**
 * Ensure a chunk is loaded into the cache.
 * If already cached, returns immediately. Otherwise generates + applies deltas.
 */
function ensureChunk(cx: number, cz: number): MapChunk {
	if (!currentDb) {
		throw new Error(
			"WorldGrid not initialized. Call initWorldGrid(db, worldSeed, saveGameId) before loading chunks.",
		);
	}
	const key = chunkKey(cx, cz);
	let chunk = chunkCache.get(key);
	if (!chunk) {
		chunk = loadChunk(currentDb, currentWorldSeed, currentSaveGameId, cx, cz);
		chunkCache.set(key, chunk);
	}
	return chunk;
}

/**
 * Get a chunk (loading it if necessary).
 */
export function getChunk(cx: number, cz: number): MapChunk {
	return ensureChunk(cx, cz);
}

/**
 * Update focus position (in world coords). Loads nearby chunks, evicts distant ones.
 * Call each frame or when the camera moves significantly.
 */
export function updateFocus(worldX: number, worldZ: number): void {
	const { cx, cz } = tileToChunk(
		Math.floor(worldX / TILE_SIZE),
		Math.floor(worldZ / TILE_SIZE),
	);
	focusCX = cx;
	focusCZ = cz;

	// Load chunks within radius
	for (let dz = -loadRadius; dz <= loadRadius; dz++) {
		for (let dx = -loadRadius; dx <= loadRadius; dx++) {
			ensureChunk(cx + dx, cz + dz);
		}
	}

	// Evict chunks outside unload radius
	for (const [key, chunk] of chunkCache) {
		const dist = Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cz - cz));
		if (dist > unloadRadius) {
			chunkCache.delete(key);
		}
	}
}

/**
 * Get all currently loaded chunks. Used by renderer to know what to draw.
 */
export function getLoadedChunks(): MapChunk[] {
	return Array.from(chunkCache.values());
}

/**
 * Force-reload a chunk (e.g., after a player action writes a delta).
 */
export function invalidateChunk(cx: number, cz: number): void {
	const key = chunkKey(cx, cz);
	chunkCache.delete(key);
	// Re-load if it was within focus range
	const dist = Math.max(Math.abs(cx - focusCX), Math.abs(cz - focusCZ));
	if (dist <= loadRadius) {
		ensureChunk(cx, cz);
	}
}

// ─── Tile Queries ───────────────────────────────────────────────────────────

/**
 * Get a tile by world grid coordinates and level.
 * Level defaults to 0 (ground). For bridges, query level 1.
 */
export function getTile(x: number, z: number, level = 0): MapTile | null {
	const { cx, cz } = tileToChunk(x, z);
	const chunk = ensureChunk(cx, cz);
	const localX = x - cx * CHUNK_SIZE;
	const localZ = z - cz * CHUNK_SIZE;

	if (
		localX < 0 ||
		localX >= CHUNK_SIZE ||
		localZ < 0 ||
		localZ >= CHUNK_SIZE
	) {
		return null;
	}

	const idx = chunkTileIndex(localX, localZ);
	const tile = chunk.tiles[idx];
	if (!tile) return null;

	// If querying a specific level, only return if tile is at that level
	if (tile.level !== level) return null;
	return tile;
}

/**
 * Get whatever tile exists at (x, z) regardless of level.
 * Returns the tile as stored in the chunk.
 */
export function getTileAnyLevel(x: number, z: number): MapTile | null {
	const { cx, cz } = tileToChunk(x, z);
	const chunk = ensureChunk(cx, cz);
	const localX = x - cx * CHUNK_SIZE;
	const localZ = z - cz * CHUNK_SIZE;

	if (
		localX < 0 ||
		localX >= CHUNK_SIZE ||
		localZ < 0 ||
		localZ >= CHUNK_SIZE
	) {
		return null;
	}

	return chunk.tiles[chunkTileIndex(localX, localZ)] ?? null;
}

/**
 * Is a tile passable at (x, z, level)?
 */
export function isPassable(x: number, z: number, level = 0): boolean {
	const tile = getTile(x, z, level);
	return tile?.passable ?? false;
}

/**
 * Get the 4-directional neighbors of a tile at the same level.
 * Handles chunk boundaries by loading adjacent chunks.
 */
export function getNeighbors(x: number, z: number, level = 0): MapTile[] {
	const results: MapTile[] = [];
	for (const [dx, dz] of FOUR_DIRS) {
		const tile = getTile(x + dx, z + dz, level);
		if (tile) results.push(tile);
	}
	return results;
}

/**
 * Get passable neighbors — the ones a robot can actually walk to.
 * Includes same-level walkable tiles and ramp connections to adjacent levels.
 */
export function getPassableNeighbors(
	x: number,
	z: number,
	level = 0,
): MapTile[] {
	const results: MapTile[] = [];

	for (const [dx, dz] of FOUR_DIRS) {
		const nx = x + dx;
		const nz = z + dz;

		// Check same level
		const sameLevel = getTile(nx, nz, level);
		if (sameLevel?.passable) {
			results.push(sameLevel);
			continue;
		}

		// Check if current tile is a ramp — can transition to level ± 1
		const currentTile = getTile(x, z, level);
		if (currentTile?.isRamp) {
			// Can go up or down one level
			for (const adjLevel of [level - 1, level + 1]) {
				if (adjLevel >= 0 && adjLevel <= 2) {
					const adj = getTile(nx, nz, adjLevel);
					if (adj?.passable) results.push(adj);
				}
			}
			continue;
		}

		// Check if neighbor is a ramp at adjacent level — can step onto it
		for (const adjLevel of [level - 1, level + 1]) {
			if (adjLevel >= 0 && adjLevel <= 2) {
				const adj = getTile(nx, nz, adjLevel);
				if (adj?.isRamp && adj.passable) results.push(adj);
			}
		}
	}

	return results;
}

// ─── World ↔ Grid Conversion ────────────────────────────────────────────────

/**
 * Convert world position (meters) to tile grid coordinates.
 */
export function worldToTile(
	worldX: number,
	worldZ: number,
): { x: number; z: number } {
	return {
		x: Math.floor(worldX / TILE_SIZE),
		z: Math.floor(worldZ / TILE_SIZE),
	};
}

/**
 * Convert tile grid coordinates to world center position (meters).
 */
export function tileToWorld(
	x: number,
	z: number,
): { worldX: number; worldZ: number } {
	return {
		worldX: x * TILE_SIZE + TILE_SIZE / 2,
		worldZ: z * TILE_SIZE + TILE_SIZE / 2,
	};
}

// ─── A* Pathfinding ─────────────────────────────────────────────────────────

export interface PathResult {
	/** Sequence of tile coordinates (excludes start, includes goal) */
	path: { x: number; z: number; level: number }[];
	/** Total movement cost */
	cost: number;
	/** Whether a valid path was found */
	valid: boolean;
}

const EMPTY_PATH: PathResult = { path: [], cost: 0, valid: false };

interface AStarNode {
	x: number;
	z: number;
	level: number;
	g: number;
	f: number;
	parent: string | null;
}

function nodeKey(x: number, z: number, level: number): string {
	return `${x},${z},${level}`;
}

function chebyshev(ax: number, az: number, bx: number, bz: number): number {
	return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

/**
 * A* pathfinding on the world grid.
 *
 * Operates on the tile grid with 2.5D level transitions via ramps.
 * Cost = 1.0 per tile (can be enhanced with floor-material-based costs later).
 *
 * @param maxNodes — safety limit to prevent runaway searches (default 500)
 */
export function findPath(
	fromX: number,
	fromZ: number,
	fromLevel: number,
	toX: number,
	toZ: number,
	toLevel: number,
	maxNodes = 500,
): PathResult {
	// Validate start and goal
	if (!isPassable(fromX, fromZ, fromLevel) || !isPassable(toX, toZ, toLevel)) {
		return EMPTY_PATH;
	}

	const goalKey = nodeKey(toX, toZ, toLevel);
	const startKey = nodeKey(fromX, fromZ, fromLevel);

	if (startKey === goalKey) {
		return { path: [], cost: 0, valid: true };
	}

	const open: AStarNode[] = [
		{
			x: fromX,
			z: fromZ,
			level: fromLevel,
			g: 0,
			f: chebyshev(fromX, fromZ, toX, toZ),
			parent: null,
		},
	];
	const closed = new Map<string, AStarNode>();

	while (open.length > 0 && closed.size < maxNodes) {
		// Find lowest f-score in open set
		let bestIdx = 0;
		for (let i = 1; i < open.length; i++) {
			if (open[i]!.f < open[bestIdx]!.f) bestIdx = i;
		}
		const current = open.splice(bestIdx, 1)[0]!;
		const currentKey = nodeKey(current.x, current.z, current.level);

		if (closed.has(currentKey)) continue;
		closed.set(currentKey, current);

		if (currentKey === goalKey) {
			return reconstructPath(closed, goalKey);
		}

		// Expand passable neighbors (includes level transitions via ramps)
		const neighbors = getPassableNeighbors(current.x, current.z, current.level);
		for (const neighbor of neighbors) {
			const nKey = nodeKey(neighbor.x, neighbor.z, neighbor.level);
			if (closed.has(nKey)) continue;

			const g = current.g + 1.0; // Uniform cost for now
			const f = g + chebyshev(neighbor.x, neighbor.z, toX, toZ);
			open.push({
				x: neighbor.x,
				z: neighbor.z,
				level: neighbor.level,
				g,
				f,
				parent: currentKey,
			});
		}
	}

	return EMPTY_PATH;
}

function reconstructPath(
	closed: Map<string, AStarNode>,
	goalKey: string,
): PathResult {
	const path: { x: number; z: number; level: number }[] = [];
	let key: string | null = goalKey;
	let totalCost = 0;

	const goalNode = closed.get(goalKey);
	if (goalNode) totalCost = goalNode.g;

	while (key) {
		const node = closed.get(key);
		if (!node) break;
		if (node.parent !== null) {
			path.unshift({ x: node.x, z: node.z, level: node.level });
		}
		key = node.parent;
	}

	return { path, cost: totalCost, valid: path.length > 0 };
}

/**
 * Find all tiles reachable from a starting position within a movement point budget.
 * Used for movement highlighting (Civ-style blue overlay).
 */
export function getReachable(
	fromX: number,
	fromZ: number,
	fromLevel: number,
	maxCost: number,
): Map<string, { x: number; z: number; level: number; cost: number }> {
	const visited = new Map<
		string,
		{ x: number; z: number; level: number; cost: number }
	>();

	if (!isPassable(fromX, fromZ, fromLevel)) {
		return visited;
	}

	const open: { x: number; z: number; level: number; cost: number }[] = [
		{ x: fromX, z: fromZ, level: fromLevel, cost: 0 },
	];

	while (open.length > 0) {
		// Dijkstra — pick lowest cost
		let bestIdx = 0;
		for (let i = 1; i < open.length; i++) {
			if (open[i]!.cost < open[bestIdx]!.cost) bestIdx = i;
		}
		const current = open.splice(bestIdx, 1)[0]!;
		const key = nodeKey(current.x, current.z, current.level);

		if (visited.has(key)) continue;
		visited.set(key, current);

		const neighbors = getPassableNeighbors(current.x, current.z, current.level);
		for (const neighbor of neighbors) {
			const nKey = nodeKey(neighbor.x, neighbor.z, neighbor.level);
			if (visited.has(nKey)) continue;
			const nextCost = current.cost + 1.0;
			if (nextCost <= maxCost) {
				open.push({
					x: neighbor.x,
					z: neighbor.z,
					level: neighbor.level,
					cost: nextCost,
				});
			}
		}
	}

	// Remove start position from results
	visited.delete(nodeKey(fromX, fromZ, fromLevel));
	return visited;
}

// ─── Compatibility shim (for structuralSpace.ts consumers during migration) ─

/**
 * Check if a world position (meters) is passable.
 * Drop-in replacement for structuralSpace.isPassableAtWorldPosition().
 */
export function isPassableAtWorldPosition(
	worldX: number,
	worldZ: number,
): boolean {
	const { x, z } = worldToTile(worldX, worldZ);
	// Check ground level first, then any level
	if (isPassable(x, z, 0)) return true;
	const tile = getTileAnyLevel(x, z);
	return tile?.passable ?? false;
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

export const _test = {
	getChunkCache: () => chunkCache,
	getFocusChunk: () => ({ cx: focusCX, cz: focusCZ }),
};
