/**
 * Structure helper unit tests.
 *
 * Tests the pure geometry-detection functions — no R3F/Canvas needed.
 */

import { describe, expect, it } from "vitest";
import { TILE_SIZE_M } from "../../board/grid";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	getColumnPositions,
	getInteriorTiles,
	getStructuralEdges,
	wallHeight,
} from "../structureHelpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(
	x: number,
	z: number,
	floorType: TileData["floorType"] = "durasteel_span",
): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable: floorType !== "void_pit" && floorType !== "structural_mass",
		floorType,
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

function makeBoard(
	width: number,
	height: number,
	structuralTiles: Array<{ x: number; z: number }> = [],
): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z));
		}
		tiles.push(row);
	}
	for (const s of structuralTiles) {
		tiles[s.z][s.x] = makeTile(s.x, s.z, "structural_mass");
	}
	return {
		config: { width, height, seed: "test-seed", difficulty: "normal" },
		tiles,
	};
}

// ---------------------------------------------------------------------------
// getStructuralEdges
// ---------------------------------------------------------------------------

describe("getStructuralEdges", () => {
	it("returns no edges when no structural tiles exist", () => {
		const board = makeBoard(4, 4);
		expect(getStructuralEdges(board)).toHaveLength(0);
	});

	it("structural_mass next to durasteel_span produces edge", () => {
		const board = makeBoard(4, 4, [{ x: 1, z: 1 }]);
		const edges = getStructuralEdges(board);
		expect(edges).toHaveLength(4);
		const dirs = edges.map((e) => e.edge).sort();
		expect(dirs).toEqual(["east", "north", "south", "west"]);
	});

	it("no edge between two adjacent structural_mass tiles", () => {
		const board = makeBoard(4, 4, [
			{ x: 1, z: 1 },
			{ x: 2, z: 1 },
		]);
		const edges = getStructuralEdges(board);
		const tile1Edges = edges.filter((e) => e.x === 1 && e.z === 1);
		const tile2Edges = edges.filter((e) => e.x === 2 && e.z === 1);
		expect(tile1Edges.map((e) => e.edge)).not.toContain("east");
		expect(tile2Edges.map((e) => e.edge)).not.toContain("west");
	});

	it("board edge counts as non-structural (out of bounds)", () => {
		const board = makeBoard(4, 4, [{ x: 0, z: 0 }]);
		const edges = getStructuralEdges(board);
		expect(edges).toHaveLength(4);
	});

	it("2x2 structural block has 8 exterior edges", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
			{ x: 3, z: 3 },
		]);
		const edges = getStructuralEdges(board);
		expect(edges).toHaveLength(8);
	});
});

// ---------------------------------------------------------------------------
// getColumnPositions
// ---------------------------------------------------------------------------

describe("getColumnPositions", () => {
	it("returns no columns when no structural tiles exist", () => {
		const board = makeBoard(4, 4);
		expect(getColumnPositions(board)).toHaveLength(0);
	});

	it("single structural tile produces no columns (each corner shared by only 1)", () => {
		const board = makeBoard(4, 4, [{ x: 2, z: 2 }]);
		expect(getColumnPositions(board)).toHaveLength(0);
	});

	it("two adjacent horizontal tiles share 2 corners → 2 columns", () => {
		const board = makeBoard(4, 4, [
			{ x: 1, z: 1 },
			{ x: 2, z: 1 },
		]);
		const cols = getColumnPositions(board);
		expect(cols).toHaveLength(2);
	});

	it("2x2 block produces 4 columns at inner corner + shared edges", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
			{ x: 3, z: 3 },
		]);
		const cols = getColumnPositions(board);
		expect(cols).toHaveLength(5);
	});

	it("column positions are in world-space coordinates", () => {
		const board = makeBoard(4, 4, [
			{ x: 1, z: 1 },
			{ x: 2, z: 1 },
		]);
		const cols = getColumnPositions(board);
		const half = TILE_SIZE_M / 2;
		const expectedX = 2 * TILE_SIZE_M - half;
		const expectedTop = 1 * TILE_SIZE_M - half;
		const expectedBottom = 2 * TILE_SIZE_M - half;

		const worldXs = cols.map((c) => c.x);
		const worldZs = cols.map((c) => c.z);

		expect(worldXs).toContain(expectedX);
		expect(worldZs).toContain(expectedTop);
		expect(worldZs).toContain(expectedBottom);
	});
});

// ---------------------------------------------------------------------------
// getInteriorTiles
// ---------------------------------------------------------------------------

describe("getInteriorTiles", () => {
	it("returns no interior for a single structural tile", () => {
		const board = makeBoard(4, 4, [{ x: 2, z: 2 }]);
		expect(getInteriorTiles(board)).toHaveLength(0);
	});

	it("returns no interior for a 2x2 block (no tile has all 4 cardinal neighbors structural)", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
			{ x: 3, z: 3 },
		]);
		expect(getInteriorTiles(board)).toHaveLength(0);
	});

	it("center of a 3x3 block is interior", () => {
		const structuralTiles = [];
		for (let z = 1; z <= 3; z++) {
			for (let x = 1; x <= 3; x++) {
				structuralTiles.push({ x, z });
			}
		}
		const board = makeBoard(6, 6, structuralTiles);
		const interior = getInteriorTiles(board);
		expect(interior).toHaveLength(1);
		expect(interior[0]).toEqual({ x: 2, z: 2 });
	});

	it("cross shape has interior tile at center", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 1 },
			{ x: 1, z: 2 },
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
		]);
		const interior = getInteriorTiles(board);
		expect(interior).toHaveLength(1);
		expect(interior[0]).toEqual({ x: 2, z: 2 });
	});
});

// ---------------------------------------------------------------------------
// wallHeight
// ---------------------------------------------------------------------------

describe("wallHeight", () => {
	it("returns a height between BASE and BASE + VARIATION", () => {
		const h = wallHeight("test-seed", 5, 7);
		expect(h).toBeGreaterThanOrEqual(2.5);
		expect(h).toBeLessThanOrEqual(4.5);
	});

	it("is deterministic for the same seed and position", () => {
		const h1 = wallHeight("seed-a", 3, 4);
		const h2 = wallHeight("seed-a", 3, 4);
		expect(h1).toBe(h2);
	});

	it("varies with different positions", () => {
		const h1 = wallHeight("test", 0, 0);
		const h2 = wallHeight("test", 10, 10);
		expect(h1).not.toBe(h2);
	});

	it("varies with different seeds", () => {
		const h1 = wallHeight("seed-a", 5, 5);
		const h2 = wallHeight("seed-b", 5, 5);
		expect(h1).not.toBe(h2);
	});
});
