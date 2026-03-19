/**
 * Wall classification unit tests.
 *
 * Tests the pure adjacency-based classification logic.
 * No R3F/Canvas/Three.js needed — just board data in, ClassifiedWall[] out.
 */

import { describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	classifyAllWalls,
	classifyWallTile,
	countByShape,
	type WallShape,
} from "../labyrinth/wallClassification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HALF_PI = Math.PI / 2;

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
		tiles[s.z]![s.x] = makeTile(s.x, s.z, "structural_mass");
	}
	return {
		config: { width, height, seed: "test-seed", difficulty: "normal" },
		tiles,
	};
}

// ---------------------------------------------------------------------------
// classifyWallTile — single tile
// ---------------------------------------------------------------------------

describe("classifyWallTile", () => {
	it("returns null for non-structural tiles", () => {
		const board = makeBoard(4, 4);
		expect(classifyWallTile(board, 1, 1)).toBeNull();
	});

	it("classifies a lone tile as isolated", () => {
		const board = makeBoard(5, 5, [{ x: 2, z: 2 }]);
		const result = classifyWallTile(board, 2, 2);
		expect(result).not.toBeNull();
		expect(result!.shape).toBe("isolated");
		expect(result!.rotation).toBe(0);
	});

	it("classifies a tile at board edge as isolated (OOB = non-wall)", () => {
		const board = makeBoard(5, 5, [{ x: 0, z: 0 }]);
		const result = classifyWallTile(board, 0, 0);
		expect(result!.shape).toBe("isolated");
	});
});

// ---------------------------------------------------------------------------
// Dead ends — 1 wall neighbor
// ---------------------------------------------------------------------------

describe("dead_end classification", () => {
	it("wall to north only → dead_end", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 }, // north neighbor
			{ x: 2, z: 2 }, // tile under test
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("dead_end");
	});

	it("wall to south only → dead_end", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 2 },
			{ x: 2, z: 3 }, // south neighbor
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("dead_end");
	});

	it("wall to east only → dead_end", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 }, // east neighbor
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("dead_end");
	});

	it("wall to west only → dead_end", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 2 },
			{ x: 1, z: 2 }, // west neighbor
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("dead_end");
	});

	it("dead ends have distinct rotations per direction", () => {
		// Build 4 separate boards to test each dead-end direction
		const directions = [
			{ neighbor: { x: 2, z: 1 }, label: "N" }, // neighbor to north
			{ neighbor: { x: 3, z: 2 }, label: "E" }, // neighbor to east
			{ neighbor: { x: 2, z: 3 }, label: "S" }, // neighbor to south
			{ neighbor: { x: 1, z: 2 }, label: "W" }, // neighbor to west
		];

		const rotations = new Set<number>();
		for (const dir of directions) {
			const board = makeBoard(5, 5, [{ x: 2, z: 2 }, dir.neighbor]);
			const result = classifyWallTile(board, 2, 2);
			expect(result!.shape).toBe("dead_end");
			rotations.add(result!.rotation);
		}

		// All 4 dead-end directions should produce 4 distinct rotations
		expect(rotations.size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// Straight — 2 opposite wall neighbors
// ---------------------------------------------------------------------------

describe("straight classification", () => {
	it("N+S neighbors → straight", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 },
			{ x: 2, z: 2 },
			{ x: 2, z: 3 },
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("straight");
		expect(result!.rotation).toBe(0); // N-S run
	});

	it("E+W neighbors → straight with 90° rotation", () => {
		const board = makeBoard(5, 5, [
			{ x: 1, z: 2 },
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("straight");
		expect(result!.rotation).toBeCloseTo(HALF_PI);
	});
});

// ---------------------------------------------------------------------------
// Corner — 2 adjacent wall neighbors
// ---------------------------------------------------------------------------

describe("corner classification", () => {
	it("N+E neighbors → corner", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 }, // north
			{ x: 2, z: 2 }, // tile
			{ x: 3, z: 2 }, // east
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("corner");
		expect(result!.rotation).toBe(0);
	});

	it("E+S neighbors → corner rotated 90°", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 }, // east
			{ x: 2, z: 3 }, // south
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("corner");
		expect(result!.rotation).toBeCloseTo(HALF_PI);
	});

	it("S+W neighbors → corner rotated 180°", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 2 },
			{ x: 2, z: 3 }, // south
			{ x: 1, z: 2 }, // west
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("corner");
		expect(result!.rotation).toBeCloseTo(Math.PI);
	});

	it("N+W neighbors → corner rotated 270°", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 }, // north
			{ x: 2, z: 2 },
			{ x: 1, z: 2 }, // west
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("corner");
		expect(result!.rotation).toBeCloseTo(3 * HALF_PI);
	});

	it("all 4 corner orientations produce distinct rotations", () => {
		const configs = [
			[
				{ x: 2, z: 1 },
				{ x: 3, z: 2 },
			], // N+E
			[
				{ x: 3, z: 2 },
				{ x: 2, z: 3 },
			], // E+S
			[
				{ x: 2, z: 3 },
				{ x: 1, z: 2 },
			], // S+W
			[
				{ x: 2, z: 1 },
				{ x: 1, z: 2 },
			], // N+W
		];

		const rotations: number[] = [];
		for (const neighbors of configs) {
			const board = makeBoard(5, 5, [{ x: 2, z: 2 }, ...neighbors]);
			const result = classifyWallTile(board, 2, 2);
			expect(result!.shape).toBe("corner");
			rotations.push(result!.rotation);
		}

		// 4 distinct rotations
		expect(new Set(rotations.map((r) => r.toFixed(4))).size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// T-junction — 3 wall neighbors
// ---------------------------------------------------------------------------

describe("t_junction classification", () => {
	it("N+E+S neighbors → t_junction (open west)", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 },
			{ x: 3, z: 2 },
			{ x: 2, z: 2 },
			{ x: 2, z: 3 },
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("t_junction");
	});

	it("E+S+W neighbors → t_junction (open north)", () => {
		const board = makeBoard(5, 5, [
			{ x: 3, z: 2 },
			{ x: 2, z: 2 },
			{ x: 2, z: 3 },
			{ x: 1, z: 2 },
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("t_junction");
	});

	it("all 4 T-junction orientations produce distinct rotations", () => {
		const configs = [
			[
				{ x: 2, z: 1 },
				{ x: 3, z: 2 },
				{ x: 2, z: 3 },
			], // N+E+S
			[
				{ x: 3, z: 2 },
				{ x: 2, z: 3 },
				{ x: 1, z: 2 },
			], // E+S+W
			[
				{ x: 2, z: 1 },
				{ x: 2, z: 3 },
				{ x: 1, z: 2 },
			], // N+S+W
			[
				{ x: 2, z: 1 },
				{ x: 3, z: 2 },
				{ x: 1, z: 2 },
			], // N+E+W
		];

		const rotations: number[] = [];
		for (const neighbors of configs) {
			const board = makeBoard(5, 5, [{ x: 2, z: 2 }, ...neighbors]);
			const result = classifyWallTile(board, 2, 2);
			expect(result!.shape).toBe("t_junction");
			rotations.push(result!.rotation);
		}

		expect(new Set(rotations.map((r) => r.toFixed(4))).size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// Crossroad — 4 wall neighbors
// ---------------------------------------------------------------------------

describe("crossroad classification", () => {
	it("all 4 neighbors → crossroad", () => {
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 },
			{ x: 3, z: 2 },
			{ x: 2, z: 2 },
			{ x: 2, z: 3 },
			{ x: 1, z: 2 },
		]);
		const result = classifyWallTile(board, 2, 2);
		expect(result!.shape).toBe("crossroad");
		expect(result!.rotation).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// classifyAllWalls — bulk classification
// ---------------------------------------------------------------------------

describe("classifyAllWalls", () => {
	it("returns empty array for board with no structural tiles", () => {
		const board = makeBoard(4, 4);
		expect(classifyAllWalls(board)).toHaveLength(0);
	});

	it("classifies all structural_mass tiles", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
		]);
		const walls = classifyAllWalls(board);
		expect(walls).toHaveLength(3);
	});

	it("respects explored set (fog of war)", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
		]);
		const explored = new Set(["2,2", "3,2"]); // (2,3) not explored
		const walls = classifyAllWalls(board, explored);
		expect(walls).toHaveLength(2);
		expect(walls.find((w) => w.x === 2 && w.z === 3)).toBeUndefined();
	});

	it("L-shaped corridor wall produces expected shapes", () => {
		// L-shape: horizontal then turns down
		//   . W W W .
		//   . . . W .
		//   . . . W .
		const board = makeBoard(5, 5, [
			{ x: 1, z: 0 },
			{ x: 2, z: 0 },
			{ x: 3, z: 0 },
			{ x: 3, z: 1 },
			{ x: 3, z: 2 },
		]);
		const walls = classifyAllWalls(board);
		const counts = countByShape(walls);

		// (1,0) = dead_end (only east neighbor)
		// (2,0) = straight (east+west)
		// (3,0) = corner (west+south)
		// (3,1) = straight (north+south)
		// (3,2) = dead_end (only north neighbor)
		expect(counts.dead_end).toBe(2);
		expect(counts.straight).toBe(2);
		expect(counts.corner).toBe(1);
	});

	it("plus/cross shape produces expected shapes", () => {
		//   . W .
		//   W W W
		//   . W .
		const board = makeBoard(5, 5, [
			{ x: 2, z: 1 },
			{ x: 1, z: 2 },
			{ x: 2, z: 2 },
			{ x: 3, z: 2 },
			{ x: 2, z: 3 },
		]);
		const walls = classifyAllWalls(board);
		const counts = countByShape(walls);

		// Center (2,2) = crossroad (all 4 neighbors)
		// Arms: 4 dead_ends
		expect(counts.crossroad).toBe(1);
		expect(counts.dead_end).toBe(4);
	});

	it("T-shape produces expected shapes", () => {
		//   W W W
		//   . W .
		//   . W .
		const board = makeBoard(5, 5, [
			{ x: 1, z: 0 },
			{ x: 2, z: 0 },
			{ x: 3, z: 0 },
			{ x: 2, z: 1 },
			{ x: 2, z: 2 },
		]);
		const walls = classifyAllWalls(board);
		const counts = countByShape(walls);

		// (1,0) = dead_end
		// (2,0) = t_junction (west, east, south neighbors)
		// (3,0) = dead_end
		// (2,1) = straight (north+south)
		// (2,2) = dead_end
		expect(counts.t_junction).toBe(1);
		expect(counts.straight).toBe(1);
		expect(counts.dead_end).toBe(3);
	});

	it("3x3 solid block has correct shape distribution", () => {
		const structuralTiles: Array<{ x: number; z: number }> = [];
		for (let z = 1; z <= 3; z++) {
			for (let x = 1; x <= 3; x++) {
				structuralTiles.push({ x, z });
			}
		}
		const board = makeBoard(5, 5, structuralTiles);
		const walls = classifyAllWalls(board);
		const counts = countByShape(walls);

		// 4 corners (2 adjacent neighbors each): (1,1), (3,1), (1,3), (3,3)
		// 4 edge midpoints (3 neighbors each = t_junction): (2,1), (1,2), (3,2), (2,3)
		// 1 center (4 neighbors = crossroad): (2,2)
		expect(walls).toHaveLength(9);
		expect(counts.corner).toBe(4);
		expect(counts.t_junction).toBe(4);
		expect(counts.crossroad).toBe(1);
	});

	it("single tile row classifies as dead_end + straights + dead_end", () => {
		// Horizontal run: W W W W W
		const board = makeBoard(7, 3, [
			{ x: 1, z: 1 },
			{ x: 2, z: 1 },
			{ x: 3, z: 1 },
			{ x: 4, z: 1 },
			{ x: 5, z: 1 },
		]);
		const walls = classifyAllWalls(board);
		const counts = countByShape(walls);

		expect(walls).toHaveLength(5);
		expect(counts.dead_end).toBe(2); // endpoints
		expect(counts.straight).toBe(3); // middle tiles
	});
});

// ---------------------------------------------------------------------------
// countByShape
// ---------------------------------------------------------------------------

describe("countByShape", () => {
	it("returns all zeros for empty input", () => {
		const counts = countByShape([]);
		for (const shape of [
			"isolated",
			"dead_end",
			"straight",
			"corner",
			"t_junction",
			"crossroad",
		] as WallShape[]) {
			expect(counts[shape]).toBe(0);
		}
	});
});
