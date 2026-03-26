export function fnv1a(str: string): number {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function seededRng(seed: string): () => number {
	return mulberry32(fnv1a(seed));
}

/**
 * Create two independent RNG streams from a single master seed.
 * - mapRng: for terrain generation, biome placement, salvage positions
 * - gameplayRng: for combat rolls, scavenge yields, storm timing
 *
 * Each stream uses the same Mulberry32 algorithm but derives its initial
 * state from a different FNV-1a hash of the master seed.
 */
export function createDualRng(masterSeed: number): {
	mapRng: () => number;
	gameplayRng: () => number;
} {
	// Derive two independent seeds via FNV-1a with different prefixes
	const mapHash = fnv1a(`map:${masterSeed}`);
	const gameplayHash = fnv1a(`gameplay:${masterSeed}`);

	return {
		mapRng: mulberry32(mapHash),
		gameplayRng: mulberry32(gameplayHash),
	};
}

function hashGrid(ix: number, iz: number, seedOffset: number): number {
	let hash = 2166136261 ^ seedOffset;
	hash ^= ix & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (ix >>> 8) & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (ix >>> 16) & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (ix >>> 24) & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= iz & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (iz >>> 8) & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (iz >>> 16) & 0xff;
	hash = Math.imul(hash, 16777619);
	hash ^= (iz >>> 24) & 0xff;
	hash = Math.imul(hash, 16777619);
	return (hash >>> 0) / 4294967296;
}

/**
 * Creates a 2D value noise sampler bound to a specific seed offset.
 * Call this once per noise layer, then use the returned function for all tiles.
 */
export function createNoise2D(
	rng: () => number,
): (x: number, z: number) => number {
	const seedOffset = (rng() * 4294967296) >>> 0;

	return (x: number, z: number): number => {
		const ix = Math.floor(x);
		const iz = Math.floor(z);
		const fx = x - ix;
		const fz = z - iz;

		const sx = fx * fx * (3 - 2 * fx);
		const sz = fz * fz * (3 - 2 * fz);

		const v00 = hashGrid(ix, iz, seedOffset);
		const v10 = hashGrid(ix + 1, iz, seedOffset);
		const v01 = hashGrid(ix, iz + 1, seedOffset);
		const v11 = hashGrid(ix + 1, iz + 1, seedOffset);

		const top = v00 + sx * (v10 - v00);
		const bottom = v01 + sx * (v11 - v01);

		return top + sz * (bottom - top);
	};
}

/**
 * 2D value noise with bilinear interpolation.
 * Uses rng to derive a seed offset, making output seed-dependent.
 * Note: consumes one rng() call per invocation. For batch usage, prefer createNoise2D.
 * Returns a value in [0, 1].
 */
export function simplexNoise2D(
	x: number,
	z: number,
	rng: () => number,
): number {
	return createNoise2D(rng)(x, z);
}
