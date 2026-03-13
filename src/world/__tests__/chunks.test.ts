import chunksConfig from "../../config/chunks.json";
import {
	chunkToSeed,
	chunkToWorldBounds,
	getAdjacentChunks,
	worldToChunk,
} from "../chunks";

const SPAN = chunksConfig.chunkSize * chunksConfig.cellWorldSize;

// ---------------------------------------------------------------------------
// worldToChunk
// ---------------------------------------------------------------------------

describe("worldToChunk", () => {
	it("maps the origin to chunk (0, 0)", () => {
		expect(worldToChunk(0, 0)).toEqual({ chunkX: 0, chunkZ: 0 });
	});

	it("maps positions inside chunk 0 to chunk (0, 0)", () => {
		expect(worldToChunk(1, 1)).toEqual({ chunkX: 0, chunkZ: 0 });
		expect(worldToChunk(SPAN - 0.01, SPAN - 0.01)).toEqual({
			chunkX: 0,
			chunkZ: 0,
		});
	});

	it("maps the exact boundary to the next chunk", () => {
		expect(worldToChunk(SPAN, 0)).toEqual({ chunkX: 1, chunkZ: 0 });
		expect(worldToChunk(0, SPAN)).toEqual({ chunkX: 0, chunkZ: 1 });
		expect(worldToChunk(SPAN, SPAN)).toEqual({ chunkX: 1, chunkZ: 1 });
	});

	it("handles negative coordinates", () => {
		expect(worldToChunk(-1, 0)).toEqual({ chunkX: -1, chunkZ: 0 });
		expect(worldToChunk(0, -1)).toEqual({ chunkX: 0, chunkZ: -1 });
		expect(worldToChunk(-SPAN, -SPAN)).toEqual({ chunkX: -1, chunkZ: -1 });
	});

	it("handles large positive coordinates", () => {
		const result = worldToChunk(SPAN * 100, SPAN * 200);
		expect(result).toEqual({ chunkX: 100, chunkZ: 200 });
	});

	it("handles large negative coordinates", () => {
		const result = worldToChunk(-SPAN * 50, -SPAN * 75);
		expect(result).toEqual({ chunkX: -50, chunkZ: -75 });
	});

	it("handles fractional positions inside negative chunks", () => {
		// Just past the boundary into -1
		expect(worldToChunk(-0.01, -0.01)).toEqual({ chunkX: -1, chunkZ: -1 });
	});
});

// ---------------------------------------------------------------------------
// chunkToWorldBounds
// ---------------------------------------------------------------------------

describe("chunkToWorldBounds", () => {
	it("returns correct AABB for the origin chunk", () => {
		const bounds = chunkToWorldBounds(0, 0);
		expect(bounds).toEqual({
			minX: 0,
			minZ: 0,
			maxX: SPAN,
			maxZ: SPAN,
		});
	});

	it("returns correct AABB for a positive chunk", () => {
		const bounds = chunkToWorldBounds(2, 3);
		expect(bounds).toEqual({
			minX: 2 * SPAN,
			minZ: 3 * SPAN,
			maxX: 3 * SPAN,
			maxZ: 4 * SPAN,
		});
	});

	it("returns correct AABB for a negative chunk", () => {
		const bounds = chunkToWorldBounds(-1, -2);
		expect(bounds).toEqual({
			minX: -1 * SPAN,
			minZ: -2 * SPAN,
			maxX: 0,
			maxZ: -1 * SPAN,
		});
	});

	it("bounds width and height match config chunk span", () => {
		const bounds = chunkToWorldBounds(5, -3);
		expect(bounds.maxX - bounds.minX).toBe(SPAN);
		expect(bounds.maxZ - bounds.minZ).toBe(SPAN);
	});

	it("worldToChunk and chunkToWorldBounds are consistent", () => {
		// A point inside a chunk should map back to a bounds that contains it
		const worldX = 25.5;
		const worldZ = -13.7;
		const chunk = worldToChunk(worldX, worldZ);
		const bounds = chunkToWorldBounds(chunk.chunkX, chunk.chunkZ);
		expect(worldX).toBeGreaterThanOrEqual(bounds.minX);
		expect(worldX).toBeLessThan(bounds.maxX);
		expect(worldZ).toBeGreaterThanOrEqual(bounds.minZ);
		expect(worldZ).toBeLessThan(bounds.maxZ);
	});
});

// ---------------------------------------------------------------------------
// chunkToSeed — determinism
// ---------------------------------------------------------------------------

describe("chunkToSeed", () => {
	const WORLD_SEED = 42;

	it("returns the same seed for the same inputs", () => {
		const a = chunkToSeed(WORLD_SEED, 3, 7);
		const b = chunkToSeed(WORLD_SEED, 3, 7);
		expect(a).toBe(b);
	});

	it("returns different seeds for different chunk coordinates", () => {
		const seeds = new Set<number>();
		for (let x = -2; x <= 2; x++) {
			for (let z = -2; z <= 2; z++) {
				seeds.add(chunkToSeed(WORLD_SEED, x, z));
			}
		}
		// All 25 chunks should produce distinct seeds
		expect(seeds.size).toBe(25);
	});

	it("returns different seeds for different world seeds", () => {
		const a = chunkToSeed(1, 0, 0);
		const b = chunkToSeed(2, 0, 0);
		expect(a).not.toBe(b);
	});

	it("is order-sensitive for chunkX vs chunkZ", () => {
		const a = chunkToSeed(WORLD_SEED, 1, 2);
		const b = chunkToSeed(WORLD_SEED, 2, 1);
		expect(a).not.toBe(b);
	});

	it("returns a 32-bit unsigned integer", () => {
		const seed = chunkToSeed(WORLD_SEED, -100, 999);
		expect(seed).toBeGreaterThanOrEqual(0);
		expect(seed).toBeLessThanOrEqual(0xffffffff);
		expect(Number.isInteger(seed)).toBe(true);
	});

	it("handles zero coordinates", () => {
		const seed = chunkToSeed(WORLD_SEED, 0, 0);
		expect(typeof seed).toBe("number");
		expect(Number.isInteger(seed)).toBe(true);
	});

	it("handles negative coordinates deterministically", () => {
		const a = chunkToSeed(WORLD_SEED, -5, -10);
		const b = chunkToSeed(WORLD_SEED, -5, -10);
		expect(a).toBe(b);
	});
});

// ---------------------------------------------------------------------------
// getAdjacentChunks
// ---------------------------------------------------------------------------

describe("getAdjacentChunks", () => {
	it("returns exactly 8 neighbors", () => {
		const neighbors = getAdjacentChunks(0, 0);
		expect(neighbors).toHaveLength(8);
	});

	it("does not include the input chunk itself", () => {
		const neighbors = getAdjacentChunks(5, 5);
		const hasSelf = neighbors.some((n) => n.chunkX === 5 && n.chunkZ === 5);
		expect(hasSelf).toBe(false);
	});

	it("contains no duplicates", () => {
		const neighbors = getAdjacentChunks(0, 0);
		const keys = neighbors.map((n) => `${n.chunkX},${n.chunkZ}`);
		expect(new Set(keys).size).toBe(8);
	});

	it("returns the correct Moore neighborhood at the origin", () => {
		const neighbors = getAdjacentChunks(0, 0);
		const expected = [
			{ chunkX: -1, chunkZ: -1 },
			{ chunkX: 0, chunkZ: -1 },
			{ chunkX: 1, chunkZ: -1 },
			{ chunkX: -1, chunkZ: 0 },
			{ chunkX: 1, chunkZ: 0 },
			{ chunkX: -1, chunkZ: 1 },
			{ chunkX: 0, chunkZ: 1 },
			{ chunkX: 1, chunkZ: 1 },
		];
		expect(neighbors).toEqual(expect.arrayContaining(expected));
		expect(expected).toEqual(expect.arrayContaining(neighbors));
	});

	it("offsets correctly from a non-origin chunk", () => {
		const neighbors = getAdjacentChunks(10, -3);
		for (const n of neighbors) {
			const dx = Math.abs(n.chunkX - 10);
			const dz = Math.abs(n.chunkZ - -3);
			expect(dx).toBeLessThanOrEqual(1);
			expect(dz).toBeLessThanOrEqual(1);
			// Must not be (0,0) offset
			expect(dx + dz).toBeGreaterThan(0);
		}
	});
});
