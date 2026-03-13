/**
 * Chunk Instance Buffers — pure logic for partitioning building data
 * by chunk and managing per-chunk instance buffer lifecycle.
 *
 * This module is deliberately free of Three.js or R3F imports so that
 * all partitioning and lifecycle logic can be unit-tested without a
 * WebGL context.
 *
 * @exports BuildingData - Per-building rendering data
 * @exports ChunkBuildingBuffer - Per-chunk buffer state
 * @exports partitionBuildingsByChunk - Partition buildings into chunk buckets
 * @exports ChunkBufferManager - Stateful manager for chunk lifecycle
 *
 * @dependencies world/chunks (worldToChunk, chunkToWorldBounds)
 * @consumers InstancedBuildingRenderer
 */

import chunksConfig from "../config/chunks.json";
import { chunkKey } from "../world/chunkLoader";
import type { ChunkCoord, ChunkWorldBounds } from "../world/chunks";
import { chunkToWorldBounds, worldToChunk } from "../world/chunks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildingData {
	x: number;
	y: number;
	z: number;
	faction: string;
	buildingType: string;
	operational: boolean;
}

/**
 * Per-chunk buffer state. The `buildings` array holds the subset of
 * buildings that fall within this chunk's world bounds.
 */
export interface ChunkBuildingBuffer {
	chunkX: number;
	chunkZ: number;
	bounds: ChunkWorldBounds;
	buildings: BuildingData[];
	/** Number of buildings currently populated (may differ from buildings.length during updates) */
	instanceCount: number;
}

// ---------------------------------------------------------------------------
// Max instances per chunk — derived from config
// ---------------------------------------------------------------------------

/**
 * Maximum instance count per chunk. With 8x8 cells of 2 world units each,
 * a chunk covers 16x16 = 256 square world units. Allowing up to 64
 * buildings per chunk is generous for typical density.
 */
export const MAX_INSTANCES_PER_CHUNK = 64;

// ---------------------------------------------------------------------------
// Pure partitioning logic
// ---------------------------------------------------------------------------

/**
 * Test whether a world-space position falls within a chunk's AABB.
 * The AABB is [minX, maxX) x [minZ, maxZ) — inclusive min, exclusive max.
 */
export function isInChunkBounds(
	x: number,
	z: number,
	bounds: ChunkWorldBounds,
): boolean {
	return (
		x >= bounds.minX && x < bounds.maxX && z >= bounds.minZ && z < bounds.maxZ
	);
}

/**
 * Partition an array of buildings into per-chunk buckets.
 *
 * Returns a Map keyed by chunk key string ("chunkX,chunkZ") with
 * arrays of buildings that fall within each chunk's bounds.
 *
 * Buildings outside any tracked chunk are silently dropped.
 *
 * @param allBuildings - Full list of visible buildings
 * @param loadedChunkKeys - Set of chunk keys currently loaded
 */
export function partitionBuildingsByChunk(
	allBuildings: readonly BuildingData[],
	loadedChunkKeys: ReadonlySet<string>,
): Map<string, BuildingData[]> {
	const result = new Map<string, BuildingData[]>();

	// Pre-populate empty arrays for all loaded chunks
	for (const key of loadedChunkKeys) {
		result.set(key, []);
	}

	for (const bldg of allBuildings) {
		const coord = worldToChunk(bldg.x, bldg.z);
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		const bucket = result.get(key);
		if (bucket) {
			bucket.push(bldg);
		}
		// Buildings in unloaded chunks are dropped
	}

	return result;
}

// ---------------------------------------------------------------------------
// ChunkBufferManager — stateful manager for chunk buffer lifecycle
// ---------------------------------------------------------------------------

/**
 * Manages per-chunk instance buffers. The renderer creates one of these
 * and wires it to chunk load/unload callbacks.
 *
 * On chunk load: creates a ChunkBuildingBuffer with empty buildings array.
 * On chunk unload: removes the buffer (the renderer disposes the GPU resources).
 * On building refresh: partitions buildings into existing buffers.
 */
export class ChunkBufferManager {
	private readonly buffers = new Map<string, ChunkBuildingBuffer>();

	/** Callback invoked when a new buffer is created (chunk loaded). */
	onBufferCreated: ((key: string, buffer: ChunkBuildingBuffer) => void) | null =
		null;

	/** Callback invoked when a buffer is about to be removed (chunk unloading). */
	onBufferRemoved: ((key: string) => void) | null = null;

	/**
	 * Handle a chunk load event. Creates a new empty buffer.
	 */
	handleChunkLoad(coord: ChunkCoord): void {
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		const bounds = chunkToWorldBounds(coord.chunkX, coord.chunkZ);
		const buffer: ChunkBuildingBuffer = {
			chunkX: coord.chunkX,
			chunkZ: coord.chunkZ,
			bounds,
			buildings: [],
			instanceCount: 0,
		};
		this.buffers.set(key, buffer);
		this.onBufferCreated?.(key, buffer);
	}

	/**
	 * Handle a chunk unload event. Removes the buffer.
	 */
	handleChunkUnload(coord: ChunkCoord): void {
		const key = chunkKey(coord.chunkX, coord.chunkZ);
		if (this.buffers.has(key)) {
			this.onBufferRemoved?.(key);
			this.buffers.delete(key);
		}
	}

	/**
	 * Update all buffers with a fresh building list.
	 * Partitions buildings across loaded chunks and updates each buffer.
	 */
	updateBuildings(allBuildings: readonly BuildingData[]): void {
		const loadedKeys = new Set(this.buffers.keys());
		const partitioned = partitionBuildingsByChunk(allBuildings, loadedKeys);

		for (const [key, buffer] of this.buffers) {
			const chunkBuildings = partitioned.get(key) ?? [];
			buffer.buildings = chunkBuildings.slice(0, MAX_INSTANCES_PER_CHUNK);
			buffer.instanceCount = buffer.buildings.length;
		}
	}

	/**
	 * Get a snapshot of all current buffers. The map is a shallow copy;
	 * the buffers themselves are references.
	 */
	getBuffers(): ReadonlyMap<string, ChunkBuildingBuffer> {
		return this.buffers;
	}

	/**
	 * Get a specific buffer by chunk key.
	 */
	getBuffer(key: string): ChunkBuildingBuffer | undefined {
		return this.buffers.get(key);
	}

	/**
	 * Get the total number of tracked chunks.
	 */
	get chunkCount(): number {
		return this.buffers.size;
	}

	/**
	 * Clear all buffers. Call on game restart or test teardown.
	 */
	reset(): void {
		// Fire removal callbacks for all existing buffers
		for (const key of this.buffers.keys()) {
			this.onBufferRemoved?.(key);
		}
		this.buffers.clear();
		this.onBufferCreated = null;
		this.onBufferRemoved = null;
	}
}
