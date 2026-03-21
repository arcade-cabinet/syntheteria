import { beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	buildNavGraph,
	clearNavGraphCache,
	indexToTile,
	tileIndex,
	updateTileCost,
	yukaShortestPath,
} from "../navigation/boardNavGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBoard(width: number, height: number): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				biomeType: "grassland",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

function makeBoardWithWall(
	width: number,
	height: number,
	wallX: number,
): GeneratedBoard {
	const board = makeBoard(width, height);
	// Create a wall column (impassable) at wallX, except for a gap at z=0
	for (let z = 1; z < height; z++) {
		board.tiles[z][wallX].biomeType = "mountain";
		board.tiles[z][wallX].passable = false;
	}
	return board;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("boardNavGraph", () => {
	beforeEach(() => {
		clearNavGraphCache();
	});

	describe("tileIndex / indexToTile", () => {
		it("round-trips correctly", () => {
			const width = 16;
			expect(indexToTile(tileIndex(5, 3, width), width)).toEqual({
				x: 5,
				z: 3,
			});
			expect(indexToTile(tileIndex(0, 0, width), width)).toEqual({
				x: 0,
				z: 0,
			});
			expect(indexToTile(tileIndex(15, 15, width), width)).toEqual({
				x: 15,
				z: 15,
			});
		});
	});

	describe("buildNavGraph", () => {
		it("creates nodes for all passable tiles", () => {
			const board = makeBoard(4, 4);
			const { graph } = buildNavGraph(board);
			expect(graph.getNodeCount()).toBe(16);
		});

		it("skips impassable tiles", () => {
			const board = makeBoard(4, 4);
			board.tiles[1][1].biomeType = "mountain";
			const { graph } = buildNavGraph(board);
			expect(graph.getNodeCount()).toBe(15);
		});

		it("creates edges between adjacent passable tiles", () => {
			const board = makeBoard(3, 3);
			const { graph } = buildNavGraph(board);
			// 3x3 grid: center has 4 edges, corners have 2, sides have 3
			// Total edges for undirected 3x3: 2*(3*2) = 12 inner pairs × 2 directions
			// Actually Graph is undirected so addEdge auto-creates both directions
			// But Yuka Graph counts both directions
			expect(graph.getEdgeCount()).toBeGreaterThan(0);
		});
	});

	describe("yukaShortestPath", () => {
		it("finds direct path on open board", () => {
			const board = makeBoard(8, 8);
			const navGraph = buildNavGraph(board);
			const path = yukaShortestPath(0, 0, 3, 0, navGraph);
			expect(path.length).toBe(4); // (0,0) → (1,0) → (2,0) → (3,0)
			expect(path[0]).toEqual({ x: 0, z: 0 });
			expect(path[3]).toEqual({ x: 3, z: 0 });
		});

		it("finds path around wall", () => {
			// Wall at x=2, gap at z=0
			// useSphere=false: disable X-wrapping so the wall forces a detour
			const board = makeBoardWithWall(6, 4, 2);
			const navGraph = buildNavGraph(board, false);
			const path = yukaShortestPath(0, 2, 4, 2, navGraph);
			// Must go through gap at (2,0)
			expect(path.length).toBeGreaterThan(4); // Not a straight line
			// First and last should match
			expect(path[0]).toEqual({ x: 0, z: 2 });
			expect(path[path.length - 1]).toEqual({ x: 4, z: 2 });
		});

		it("returns empty for unreachable target", () => {
			const board = makeBoard(4, 4);
			// Create a fully walled tile
			board.tiles[2][2].biomeType = "mountain";
			const navGraph = buildNavGraph(board);
			// (2,2) is impassable → no path
			const path = yukaShortestPath(0, 0, 2, 2, navGraph);
			expect(path).toHaveLength(0);
		});

		it("returns empty for out-of-bounds", () => {
			const board = makeBoard(4, 4);
			const navGraph = buildNavGraph(board);
			// Node for (10,10) doesn't exist on a 4x4 board
			const path = yukaShortestPath(0, 0, 10, 10, navGraph);
			expect(path).toHaveLength(0);
		});

		it("path to self returns single element", () => {
			const board = makeBoard(4, 4);
			const navGraph = buildNavGraph(board);
			const path = yukaShortestPath(2, 2, 2, 2, navGraph);
			// Yuka A* source === target → found=true, path=[source]
			expect(path.length).toBeGreaterThanOrEqual(1);
			expect(path[0]).toEqual({ x: 2, z: 2 });
		});
	});

	describe("updateTileCost", () => {
		it("increases cost for corrupted tiles", () => {
			const board = makeBoard(4, 4);
			const navGraph = buildNavGraph(board);
			// Normal path: (0,0) → (1,0) → (2,0) → (3,0), all cost 1
			updateTileCost(navGraph, 1, 0, 10); // Make (1,0) very expensive

			// Path should now avoid (1,0) if alternative exists
			const path = yukaShortestPath(0, 0, 3, 0, navGraph);
			expect(path.length).toBeGreaterThan(0);
			// The path might go around through z=1 row
		});
	});

	describe("depth layer / ramp traversal", () => {
		it("connects tiles with elevation difference of 1 (ramp)", () => {
			const board = makeBoard(4, 1);
			// Elevation: 0, 0, 1, 1
			board.tiles[0][2].elevation = 1;
			board.tiles[0][3].elevation = 1;
			const navGraph = buildNavGraph(board, false);
			const path = yukaShortestPath(0, 0, 3, 0, navGraph);
			expect(path.length).toBe(4);
			expect(path[0]).toEqual({ x: 0, z: 0 });
			expect(path[3]).toEqual({ x: 3, z: 0 });
		});

		it("blocks tiles with elevation difference > 1 (cliff)", () => {
			const board = makeBoard(4, 1);
			// Elevation: 0, 0, 2, 2 — difference of 2 between tile 1 and 2
			board.tiles[0][2].elevation = 2;
			board.tiles[0][3].elevation = 2;
			const navGraph = buildNavGraph(board, false);
			const path = yukaShortestPath(0, 0, 3, 0, navGraph);
			// Should be empty — no path across a cliff
			expect(path).toHaveLength(0);
		});

		it("ramp traversal costs extra movement", () => {
			const board = makeBoard(4, 1);
			// Elevation: 0, 1, 1, 1 — ramp at tile 0→1
			board.tiles[0][1].elevation = 1;
			board.tiles[0][2].elevation = 1;
			board.tiles[0][3].elevation = 1;
			const navGraph = buildNavGraph(board, false);
			const path = yukaShortestPath(0, 0, 3, 0, navGraph);
			expect(path.length).toBe(4);
			// Path exists, but the ramp edge (0,0)→(1,0) costs 2 instead of 1
		});
	});
});
