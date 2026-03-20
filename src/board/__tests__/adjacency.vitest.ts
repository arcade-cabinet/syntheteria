import { describe, expect, it } from "vitest";
import { reachableTiles, shortestPath, tileNeighbors } from "../adjacency";
import { generateBoard } from "../generator";
import type { BoardConfig, GeneratedBoard, TileData } from "../types";

const DEFAULT_CONFIG: BoardConfig = {
	width: 32,
	height: 32,
	seed: "adjacency-test-seed",
	difficulty: "normal",
};

function getBoard(): GeneratedBoard {
	return generateBoard(DEFAULT_CONFIG);
}

describe("tileNeighbors", () => {
	it("returns max 4 tiles, min 0", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);
		const neighbors = tileNeighbors(cx, cz, board);

		expect(neighbors.length).toBeGreaterThanOrEqual(0);
		expect(neighbors.length).toBeLessThanOrEqual(4);
	});

	it("only returns passable tiles", () => {
		const board = getBoard();
		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width; x++) {
				const neighbors = tileNeighbors(x, z, board);
				for (const n of neighbors) {
					expect(n.passable).toBe(true);
				}
			}
		}
	});

	it("corner tile (0,0) has at most 2 neighbors", () => {
		const board = getBoard();
		const neighbors = tileNeighbors(0, 0, board);
		expect(neighbors.length).toBeLessThanOrEqual(2);
	});
});

describe("reachableTiles", () => {
	it("reachableTiles(center, 0, board) returns Set with just center key", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);
		const result = reachableTiles(cx, cz, 0, board);

		expect(result.size).toBe(1);
		expect(result.has(`${cx},${cz}`)).toBe(true);
	});

	it("reachableTiles(center, 1, board) includes at least the start", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);
		const result = reachableTiles(cx, cz, 1, board);

		expect(result.has(`${cx},${cz}`)).toBe(true);
		expect(result.size).toBeGreaterThanOrEqual(1);
	});

	it("always includes start tile", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);

		for (const steps of [0, 1, 3, 10]) {
			const result = reachableTiles(cx, cz, steps, board);
			expect(result.has(`${cx},${cz}`)).toBe(true);
		}
	});
});

describe("shortestPath", () => {
	it("returns [] on isolated impassable tile", () => {
		const board = getBoard();
		// Find an impassable tile
		let impassable: TileData | null = null;
		for (let z = 0; z < DEFAULT_CONFIG.height && !impassable; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width && !impassable; x++) {
				if (!board.tiles[z][x].passable) {
					impassable = board.tiles[z][x];
				}
			}
		}

		if (impassable) {
			const path = shortestPath(
				impassable.x,
				impassable.z,
				impassable.x,
				impassable.z,
				board,
			);
			expect(path).toEqual([]);
		}
	});

	it("shortestPath(x,z,x,z,...) returns [tile] (path to self)", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);
		const path = shortestPath(cx, cz, cx, cz, board);

		expect(path.length).toBe(1);
		expect(path[0].x).toBe(cx);
		expect(path[0].z).toBe(cz);
	});

	it("finds a path between two passable tiles", () => {
		const board = getBoard();
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height / 2);

		// Find another passable tile nearby
		const neighbors = tileNeighbors(cx, cz, board);
		if (neighbors.length > 0) {
			const target = neighbors[0];
			const path = shortestPath(cx, cz, target.x, target.z, board);

			expect(path.length).toBe(2);
			expect(path[0].x).toBe(cx);
			expect(path[0].z).toBe(cz);
			expect(path[path.length - 1].x).toBe(target.x);
			expect(path[path.length - 1].z).toBe(target.z);
		}
	});
});
