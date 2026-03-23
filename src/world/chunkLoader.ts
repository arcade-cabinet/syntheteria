import chunksConfig from "../config/chunks.json";
import { type ChunkCoord, worldToChunk } from "./chunks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChunkState = "loading" | "ready" | "unloading";

export interface LoadedChunk {
	chunkX: number;
	chunkZ: number;
	state: ChunkState;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Canonical string key for a chunk coordinate pair. */
export function chunkKey(chunkX: number, chunkZ: number): string {
	return `${chunkX},${chunkZ}`;
}

/**
 * The primary store of every chunk the loader is tracking.
 * Values cycle through loading -> ready -> unloading before removal.
 */
const loadedChunks = new Map<string, LoadedChunk>();

/**
 * The last camera chunk the loader processed. Stored so we only recompute
 * the desired chunk set when the camera actually enters a new chunk.
 */
let lastCameraChunk: ChunkCoord | null = null;

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

/** Load radius in chunk units (from config, with fallback). */
function getLoadRadius(): number {
	return (chunksConfig as Record<string, number>).loadRadius ?? 3;
}

/** Unload radius in chunk units (from config, with fallback). */
function getUnloadRadius(): number {
	return (chunksConfig as Record<string, number>).unloadRadius ?? 5;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute the set of chunk coordinates within `radius` of a center chunk
 * (Chebyshev / square neighborhood). The center chunk is always included.
 */
export function getChunksInRadius(
	centerX: number,
	centerZ: number,
	radius: number,
): ChunkCoord[] {
	const result: ChunkCoord[] = [];
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			result.push({ chunkX: centerX + dx, chunkZ: centerZ + dz });
		}
	}
	return result;
}

/**
 * Chebyshev distance between two chunk coordinates.
 */
export function chunkDistance(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

// ---------------------------------------------------------------------------
// Chunk lifecycle callbacks
// ---------------------------------------------------------------------------

/**
 * User-supplied callback invoked when a chunk transitions to "loading".
 * The returned promise (if any) is awaited before the chunk moves to "ready".
 */
let onChunkLoad: ((coord: ChunkCoord) => Promise<void> | void) | null = null;

/**
 * User-supplied callback invoked when a chunk transitions to "unloading".
 * The returned promise (if any) is awaited before the chunk is removed.
 */
let onChunkUnload: ((coord: ChunkCoord) => Promise<void> | void) | null = null;

/**
 * Register callbacks for chunk lifecycle events.
 * Both are optional — pass `null` to clear.
 */
export function setChunkCallbacks(
	load: ((coord: ChunkCoord) => Promise<void> | void) | null,
	unload: ((coord: ChunkCoord) => Promise<void> | void) | null,
): void {
	onChunkLoad = load;
	onChunkUnload = unload;
}

// ---------------------------------------------------------------------------
// Core update logic
// ---------------------------------------------------------------------------

/**
 * Determine which chunks should be loaded/unloaded based on a new camera
 * chunk position. Returns the set of chunks to load and unload.
 *
 * Pure function — does not mutate state. Used by `updateChunkLoader` and
 * directly in tests.
 */
export function computeChunkDelta(
	cameraChunk: ChunkCoord,
	currentlyLoaded: ReadonlyMap<string, LoadedChunk>,
	loadRadius: number,
	unloadRadius: number,
): { toLoad: ChunkCoord[]; toUnload: ChunkCoord[] } {
	const desired = getChunksInRadius(
		cameraChunk.chunkX,
		cameraChunk.chunkZ,
		loadRadius,
	);

	// Chunks that should be loaded but are not yet tracked (or were unloading)
	const toLoad: ChunkCoord[] = [];
	for (const coord of desired) {
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		const existing = currentlyLoaded.get(key);
		if (!existing || existing.state === "unloading") {
			toLoad.push(coord);
		}
	}

	// Chunks that are currently loaded but outside the unload radius
	const toUnload: ChunkCoord[] = [];
	for (const [, chunk] of currentlyLoaded) {
		if (chunk.state === "unloading") continue;
		const dist = chunkDistance(
			chunk.chunkX,
			chunk.chunkZ,
			cameraChunk.chunkX,
			cameraChunk.chunkZ,
		);
		if (dist > unloadRadius) {
			toUnload.push({ chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
		}
	}

	return { toLoad, toUnload };
}

/**
 * Main per-frame update. Call with the camera's world-space X/Z position.
 *
 * The function is designed to be non-blocking: chunk load/unload callbacks
 * run asynchronously and the chunk map updates optimistically (state moves
 * to "loading"/"unloading" immediately, then settles to "ready"/removed
 * once the callback resolves).
 *
 * Returns `true` if the camera moved to a new chunk this frame.
 */
export function updateChunkLoader(
	cameraWorldX: number,
	cameraWorldZ: number,
): boolean {
	const cameraChunk = worldToChunk(cameraWorldX, cameraWorldZ);

	// Early-out: camera hasn't crossed a chunk boundary
	if (
		lastCameraChunk !== null &&
		lastCameraChunk.chunkX === cameraChunk.chunkX &&
		lastCameraChunk.chunkZ === cameraChunk.chunkZ
	) {
		return false;
	}

	lastCameraChunk = cameraChunk;

	const { toLoad, toUnload } = computeChunkDelta(
		cameraChunk,
		loadedChunks,
		getLoadRadius(),
		getUnloadRadius(),
	);

	// --- Begin loading new chunks (async, non-blocking) ---
	for (const coord of toLoad) {
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		loadedChunks.set(key, {
			chunkX: coord.chunkX,
			chunkZ: coord.chunkZ,
			state: "loading",
		});

		if (onChunkLoad) {
			const result = onChunkLoad(coord);
			if (result && typeof result.then === "function") {
				result.then(() => {
					const entry = loadedChunks.get(key);
					if (entry && entry.state === "loading") {
						entry.state = "ready";
					}
				});
			} else {
				const entry = loadedChunks.get(key);
				if (entry && entry.state === "loading") {
					entry.state = "ready";
				}
			}
		} else {
			// No callback — immediately ready
			const entry = loadedChunks.get(key);
			if (entry) {
				entry.state = "ready";
			}
		}
	}

	// --- Begin unloading distant chunks (async, non-blocking) ---
	for (const coord of toUnload) {
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		const entry = loadedChunks.get(key);
		if (!entry) continue;
		entry.state = "unloading";

		if (onChunkUnload) {
			const result = onChunkUnload(coord);
			if (result && typeof result.then === "function") {
				result.then(() => {
					// Only remove if still in "unloading" (could have been re-loaded)
					const current = loadedChunks.get(key);
					if (current && current.state === "unloading") {
						loadedChunks.delete(key);
					}
				});
			} else {
				loadedChunks.delete(key);
			}
		} else {
			loadedChunks.delete(key);
		}
	}

	return true;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/**
 * Return a snapshot of all currently tracked chunks (loading, ready, or
 * unloading).
 */
export function getLoadedChunks(): ReadonlyMap<string, LoadedChunk> {
	return loadedChunks;
}

/**
 * Check whether a specific chunk is loaded (state === "ready").
 */
export function isChunkLoaded(chunkX: number, chunkZ: number): boolean {
	const entry = loadedChunks.get(chunkKey(chunkX, chunkZ));
	return entry !== undefined && entry.state === "ready";
}

/**
 * Check whether a specific chunk is tracked at all (any state).
 */
export function isChunkTracked(chunkX: number, chunkZ: number): boolean {
	return loadedChunks.has(chunkKey(chunkX, chunkZ));
}

/**
 * Get the state of a specific chunk, or `null` if not tracked.
 */
export function getChunkState(
	chunkX: number,
	chunkZ: number,
): ChunkState | null {
	const entry = loadedChunks.get(chunkKey(chunkX, chunkZ));
	return entry ? entry.state : null;
}

/**
 * Return the last chunk coordinate the camera was in, or `null` if the
 * loader has never been updated.
 */
export function getLastCameraChunk(): ChunkCoord | null {
	return lastCameraChunk;
}

// ---------------------------------------------------------------------------
// Reset (for tests and game restarts)
// ---------------------------------------------------------------------------

/**
 * Clear all chunk loader state. Call on game restart or in test teardown.
 */
export function resetChunkLoader(): void {
	loadedChunks.clear();
	lastCameraChunk = null;
	onChunkLoad = null;
	onChunkUnload = null;
}
