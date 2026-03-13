/**
 * @module chunkDiscovery
 *
 * Chunk-scoped fog-of-war discovery state for infinite world support.
 * Discovery is stored per chunk as a Map<chunkKey, Set<cellKey>>. When chunks
 * load/unload, their discovery state is persisted to an in-memory cache so
 * re-entering a chunk restores previous exploration.
 *
 * @exports discoverCell - Mark a cell as discovered in the correct chunk
 * @exports isCellDiscovered - Check whether a cell has been discovered
 * @exports getChunkDiscoveryState - Return the discovery set for a chunk
 * @exports onChunkLoad - Restore discovery state when a chunk loads
 * @exports onChunkUnload - Persist discovery state when a chunk unloads
 * @exports resetChunkDiscovery - Clear all state (for tests)
 *
 * @dependencies world/chunks (worldToChunk), config/chunks.json
 */

import chunksConfig from "../config/chunks.json";
import { worldToChunk } from "./chunks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discovery detail level: 1 = abstract (no camera), 2 = detailed (camera). */
export type ChunkDiscoveryLevel = 1 | 2;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Key for a chunk: "chunkX,chunkZ" */
function chunkKey(chunkX: number, chunkZ: number): string {
	return `${chunkX},${chunkZ}`;
}

/** Key for a cell within a chunk: "localX,localZ" */
function cellKey(worldX: number, worldZ: number): string {
	return `${worldX},${worldZ}`;
}

/**
 * Active discovery state for loaded chunks.
 * Maps chunkKey -> Map<cellKey, discoveryLevel>.
 * Using a Map (not Set) so we can track abstract vs detailed discovery.
 */
const activeChunks = new Map<string, Map<string, ChunkDiscoveryLevel>>();

/**
 * Cache for unloaded chunks. Same structure as activeChunks.
 * When a chunk unloads its state moves here; when it loads, state moves back.
 */
const cache = new Map<string, Map<string, ChunkDiscoveryLevel>>();

// ---------------------------------------------------------------------------
// Chunk lifecycle
// ---------------------------------------------------------------------------

/**
 * Restore discovery state when a chunk loads. If the chunk was previously
 * explored and cached, its state is restored. Otherwise it starts undiscovered.
 */
export function onChunkLoad(chunkX: number, chunkZ: number): void {
	const key = chunkKey(chunkX, chunkZ);
	if (activeChunks.has(key)) return; // already loaded

	const cached = cache.get(key);
	if (cached) {
		activeChunks.set(key, cached);
		cache.delete(key);
	} else {
		activeChunks.set(key, new Map());
	}
}

/**
 * Persist discovery state when a chunk unloads. Moves its state into the
 * cache so it survives the unload/reload cycle.
 */
export function onChunkUnload(chunkX: number, chunkZ: number): void {
	const key = chunkKey(chunkX, chunkZ);
	const state = activeChunks.get(key);
	if (!state) return;

	if (state.size > 0) {
		cache.set(key, state);
	}
	activeChunks.delete(key);
}

// ---------------------------------------------------------------------------
// Discovery operations
// ---------------------------------------------------------------------------

/**
 * Ensure a chunk's state map exists (in active or cache), returning it.
 * If the chunk is neither active nor cached, we create a new entry in
 * activeChunks so discovery can proceed even for unloaded chunks.
 */
function ensureChunkState(
	chunkX: number,
	chunkZ: number,
): Map<string, ChunkDiscoveryLevel> {
	const key = chunkKey(chunkX, chunkZ);

	const active = activeChunks.get(key);
	if (active) return active;

	const cached = cache.get(key);
	if (cached) return cached;

	// Chunk not yet tracked — create in cache so it persists even if unloaded
	const fresh = new Map<string, ChunkDiscoveryLevel>();
	cache.set(key, fresh);
	return fresh;
}

/**
 * Mark a world-space cell as discovered. The cell is filed into the correct
 * chunk automatically. Discovery level only increases (abstract -> detailed),
 * never decreases.
 */
export function discoverCell(
	worldX: number,
	worldZ: number,
	level: ChunkDiscoveryLevel = 1,
): void {
	const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
	const state = ensureChunkState(chunkX, chunkZ);
	const key = cellKey(worldX, worldZ);
	const current = state.get(key);
	if (!current || current < level) {
		state.set(key, level);
	}
}

/**
 * Check whether a world-space cell has been discovered in any loaded or
 * cached chunk.
 */
export function isCellDiscovered(worldX: number, worldZ: number): boolean {
	const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
	const key = chunkKey(chunkX, chunkZ);
	const cKey = cellKey(worldX, worldZ);

	const active = activeChunks.get(key);
	if (active?.has(cKey)) return true;

	const cached = cache.get(key);
	if (cached?.has(cKey)) return true;

	return false;
}

/**
 * Get the discovery level for a specific cell, or 0 if undiscovered.
 */
export function getCellDiscoveryLevel(
	worldX: number,
	worldZ: number,
): 0 | ChunkDiscoveryLevel {
	const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
	const key = chunkKey(chunkX, chunkZ);
	const cKey = cellKey(worldX, worldZ);

	const active = activeChunks.get(key);
	if (active) {
		const level = active.get(cKey);
		if (level !== undefined) return level;
	}

	const cached = cache.get(key);
	if (cached) {
		const level = cached.get(cKey);
		if (level !== undefined) return level;
	}

	return 0;
}

/**
 * Return the discovery set for a chunk. Returns a ReadonlyMap of cellKey ->
 * discovery level. Returns an empty map if the chunk has no discovery data.
 */
export function getChunkDiscoveryState(
	chunkX: number,
	chunkZ: number,
): ReadonlyMap<string, ChunkDiscoveryLevel> {
	const key = chunkKey(chunkX, chunkZ);
	const active = activeChunks.get(key);
	if (active) return active;

	const cached = cache.get(key);
	if (cached) return cached;

	return new Map();
}

// ---------------------------------------------------------------------------
// Vision helper
// ---------------------------------------------------------------------------

/**
 * Reveal all cells within a vision radius around a world position.
 * Vision crosses chunk boundaries — cells in adjacent chunks are discovered
 * as expected.
 *
 * @param centerX - World X coordinate of the observer
 * @param centerZ - World Z coordinate of the observer
 * @param radius - Vision radius in world units
 * @param level - Discovery detail level (1 = abstract, 2 = detailed)
 */
export function revealVision(
	centerX: number,
	centerZ: number,
	radius: number,
	level: ChunkDiscoveryLevel = 1,
): void {
	const cellSize = chunksConfig.cellWorldSize;
	const r = Math.ceil(radius / cellSize);
	for (let dz = -r; dz <= r; dz++) {
		for (let dx = -r; dx <= r; dx++) {
			const wx = centerX + dx * cellSize;
			const wz = centerZ + dz * cellSize;
			const distSq =
				dx * cellSize * (dx * cellSize) + dz * cellSize * (dz * cellSize);
			if (distSq > radius * radius) continue;
			discoverCell(wx, wz, level);
		}
	}
}

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

/**
 * Clear all discovery state — active chunks and cache.
 */
export function resetChunkDiscovery(): void {
	activeChunks.clear();
	cache.clear();
}
