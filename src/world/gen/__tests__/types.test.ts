/**
 * Tests for types.ts helper functions and constants.
 */

import {
	CHUNK_SIZE,
	TILE_SIZE,
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
} from "../types";
import chunksConfig from "../../../config/chunks.json";

describe("grid constants", () => {
	it("TILE_SIZE matches chunks.json cellWorldSize", () => {
		expect(TILE_SIZE).toBe(chunksConfig.cellWorldSize);
	});

	it("CHUNK_SIZE matches chunks.json chunkSize", () => {
		expect(CHUNK_SIZE).toBe(chunksConfig.chunkSize);
	});

	it("LEVEL_HEIGHTS are evenly spaced by LEVEL_STEP", () => {
		for (let i = 1; i < LEVEL_HEIGHTS.length; i++) {
			expect(LEVEL_HEIGHTS[i] - LEVEL_HEIGHTS[i - 1]).toBeCloseTo(LEVEL_STEP);
		}
	});

	it("MAX_LEVEL is consistent with LEVEL_HEIGHTS", () => {
		expect(MAX_LEVEL).toBe(LEVEL_HEIGHTS.length - 1);
	});

	it("ROBOT_CLEARANCE is positive and less than LEVEL_STEP", () => {
		expect(ROBOT_CLEARANCE).toBeGreaterThan(0);
		expect(ROBOT_CLEARANCE).toBeLessThan(LEVEL_STEP);
	});

	it("MAX_BRIDGE_SPAN is a positive integer", () => {
		expect(MAX_BRIDGE_SPAN).toBeGreaterThan(0);
		expect(Number.isInteger(MAX_BRIDGE_SPAN)).toBe(true);
	});

	it("FLOOR_MATERIALS has at least 2 materials", () => {
		expect(FLOOR_MATERIALS.length).toBeGreaterThanOrEqual(2);
	});

	it("FOUR_DIRS contains exactly 4 cardinal directions", () => {
		expect(FOUR_DIRS.length).toBe(4);
		const expected = new Set(["0,-1", "1,0", "0,1", "-1,0"]);
		const actual = new Set(FOUR_DIRS.map(([dx, dz]) => `${dx},${dz}`));
		expect(actual).toEqual(expected);
	});
});

describe("tileKey / tileKey3D / chunkKey", () => {
	it("tileKey produces 'x,z' format", () => {
		expect(tileKey(3, 7)).toBe("3,7");
		expect(tileKey(-1, -2)).toBe("-1,-2");
		expect(tileKey(0, 0)).toBe("0,0");
	});

	it("tileKey3D produces 'x,z,level' format", () => {
		expect(tileKey3D(3, 7, 1)).toBe("3,7,1");
		expect(tileKey3D(0, 0, 0)).toBe("0,0,0");
	});

	it("chunkKey produces 'cx,cz' format", () => {
		expect(chunkKey(2, 5)).toBe("2,5");
		expect(chunkKey(-1, 0)).toBe("-1,0");
	});
});

describe("tileToChunk", () => {
	it("maps tile (0,0) to chunk (0,0)", () => {
		expect(tileToChunk(0, 0)).toEqual({ cx: 0, cz: 0 });
	});

	it("maps last tile in chunk to same chunk", () => {
		expect(tileToChunk(CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toEqual({ cx: 0, cz: 0 });
	});

	it("maps first tile of next chunk correctly", () => {
		expect(tileToChunk(CHUNK_SIZE, 0)).toEqual({ cx: 1, cz: 0 });
		expect(tileToChunk(0, CHUNK_SIZE)).toEqual({ cx: 0, cz: 1 });
	});

	it("handles negative tile coordinates", () => {
		expect(tileToChunk(-1, -1)).toEqual({ cx: -1, cz: -1 });
		expect(tileToChunk(-CHUNK_SIZE, 0)).toEqual({ cx: -1, cz: 0 });
	});
});

describe("chunkOrigin", () => {
	it("chunk (0,0) origin is tile (0,0)", () => {
		expect(chunkOrigin(0, 0)).toEqual({ x: 0, z: 0 });
	});

	it("chunk (1,2) origin is tile (CHUNK_SIZE, 2*CHUNK_SIZE)", () => {
		expect(chunkOrigin(1, 2)).toEqual({ x: CHUNK_SIZE, z: 2 * CHUNK_SIZE });
	});

	it("chunkOrigin and tileToChunk are inverses at origins", () => {
		for (let cx = -3; cx <= 3; cx++) {
			for (let cz = -3; cz <= 3; cz++) {
				const origin = chunkOrigin(cx, cz);
				const back = tileToChunk(origin.x, origin.z);
				expect(back).toEqual({ cx, cz });
			}
		}
	});
});

describe("chunkTileIndex", () => {
	it("(0,0) maps to index 0", () => {
		expect(chunkTileIndex(0, 0)).toBe(0);
	});

	it("(CHUNK_SIZE-1, CHUNK_SIZE-1) maps to last index", () => {
		expect(chunkTileIndex(CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toBe(
			CHUNK_SIZE * CHUNK_SIZE - 1,
		);
	});

	it("is row-major: index = z * CHUNK_SIZE + x", () => {
		for (let z = 0; z < CHUNK_SIZE; z++) {
			for (let x = 0; x < CHUNK_SIZE; x++) {
				expect(chunkTileIndex(x, z)).toBe(z * CHUNK_SIZE + x);
			}
		}
	});

	it("every (x, z) pair produces a unique index", () => {
		const seen = new Set<number>();
		for (let z = 0; z < CHUNK_SIZE; z++) {
			for (let x = 0; x < CHUNK_SIZE; x++) {
				const idx = chunkTileIndex(x, z);
				expect(seen.has(idx)).toBe(false);
				seen.add(idx);
			}
		}
		expect(seen.size).toBe(CHUNK_SIZE * CHUNK_SIZE);
	});
});
