import chunksConfig from "../config/chunks.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChunkCoord {
	chunkX: number;
	chunkZ: number;
}

export interface ChunkWorldBounds {
	minX: number;
	minZ: number;
	maxX: number;
	maxZ: number;
}

// ---------------------------------------------------------------------------
// Coordinate mapping
// ---------------------------------------------------------------------------

/**
 * Map a world-space position to the chunk that contains it.
 *
 * Each chunk covers `chunkSize * cellWorldSize` world units along each axis.
 * Negative coordinates are handled via `Math.floor` so the chunk grid extends
 * infinitely in all directions with consistent boundaries.
 */
export function worldToChunk(worldX: number, worldZ: number): ChunkCoord {
	const span = chunksConfig.chunkSize * chunksConfig.cellWorldSize;
	return {
		chunkX: Math.floor(worldX / span),
		chunkZ: Math.floor(worldZ / span),
	};
}

/**
 * Return the world-space axis-aligned bounding box for a given chunk.
 *
 * The AABB spans from (minX, minZ) inclusive to (maxX, maxZ) exclusive, where
 * each side covers `chunkSize * cellWorldSize` world units.
 */
export function chunkToWorldBounds(
	chunkX: number,
	chunkZ: number,
): ChunkWorldBounds {
	const span = chunksConfig.chunkSize * chunksConfig.cellWorldSize;
	return {
		minX: chunkX * span,
		minZ: chunkZ * span,
		maxX: (chunkX + 1) * span,
		maxZ: (chunkZ + 1) * span,
	};
}

// ---------------------------------------------------------------------------
// Deterministic seeding
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic 32-bit seed for a specific chunk.
 *
 * The algorithm hashes the world seed with the chunk coordinates using
 * multiply-xor-shift mixing. The same (worldSeed, chunkX, chunkZ) triple
 * always produces the identical output, and different inputs produce
 * well-distributed distinct values.
 */
export function chunkToSeed(
	worldSeed: number,
	chunkX: number,
	chunkZ: number,
): number {
	// Start with the world seed as an unsigned 32-bit integer
	let h = worldSeed >>> 0;

	// Mix in chunkX
	h = (Math.imul(h ^ (chunkX >>> 0), 0x45d9f3b) + 0x6d2b79f5) >>> 0;

	// Mix in chunkZ
	h = (Math.imul(h ^ (chunkZ >>> 0), 0x119de1f3) + 0x3243f6a8) >>> 0;

	// Final avalanche — ensure all bits influence the result
	h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
	h = Math.imul(h ^ (h >>> 13), 0x49c3a4e7) >>> 0;
	h = (h ^ (h >>> 16)) >>> 0;

	return h;
}

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

/** Offset pairs for the 8 cardinal + diagonal neighbors. */
const ADJACENT_OFFSETS: readonly (readonly [number, number])[] = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
];

/**
 * Return the 8 chunks adjacent to the given chunk coordinate (Moore neighborhood).
 *
 * The result never includes the input chunk itself and contains no duplicates.
 */
export function getAdjacentChunks(
	chunkX: number,
	chunkZ: number,
): ChunkCoord[] {
	return ADJACENT_OFFSETS.map(([dx, dz]) => ({
		chunkX: chunkX + dx,
		chunkZ: chunkZ + dz,
	}));
}
