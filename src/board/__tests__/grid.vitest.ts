import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import { createGridApi, ELEVATION_STEP_M, TILE_SIZE_M } from "../grid";
import type { GeneratedBoard, TileData } from "../types";

// ─── helpers ───────────────────────────────────────────────────────────────

/** 8×8 board generated with a fixed seed for deterministic tests. */
function makeBoard(): GeneratedBoard {
	return generateBoard({
		width: 8,
		height: 8,
		seed: "test",
		difficulty: "normal",
	});
}

/**
 * Build a fully-passable synthetic board of the given dimensions.
 * Every tile is ground, elevation 0, passable = true.
 * This lets reachable/path tests make precise assertions without depending on
 * the noise-based generator's passability layout.
 */
function makePassableBoard(width: number, height: number): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				floorType: "durasteel_span",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "passable", difficulty: "normal" },
		tiles,
	};
}

// ─── width / height ─────────────────────────────────────────────────────────

describe("createGridApi — dimensions", () => {
	it("width matches board config", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		expect(grid.width).toBe(board.config.width);
	});

	it("height matches board config", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		expect(grid.height).toBe(board.config.height);
	});

	it("tileSizeM is always 2.0", () => {
		const grid = createGridApi(makeBoard());
		expect(grid.tileSizeM).toBe(TILE_SIZE_M);
		expect(grid.tileSizeM).toBe(2.0);
	});
});

// ─── getTile ────────────────────────────────────────────────────────────────

describe("createGridApi — getTile", () => {
	it("returns null for negative x", () => {
		const grid = createGridApi(makeBoard());
		expect(grid.getTile(-1, 0)).toBeNull();
	});

	it("returns null for negative z", () => {
		const grid = createGridApi(makeBoard());
		expect(grid.getTile(0, -1)).toBeNull();
	});

	it("returns null when x >= width", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		expect(grid.getTile(board.config.width, 0)).toBeNull();
	});

	it("returns null when z >= height", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		expect(grid.getTile(0, board.config.height)).toBeNull();
	});

	it("returns a tile for valid in-bounds coords", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		const tile = grid.getTile(0, 0);
		expect(tile).not.toBeNull();
		expect(tile!.x).toBe(0);
		expect(tile!.z).toBe(0);
	});
});

// ─── tileWorldPos ───────────────────────────────────────────────────────────

describe("createGridApi — tileWorldPos", () => {
	it("wx = x * 2 for any in-bounds tile", () => {
		const board = makeBoard();
		const grid = createGridApi(board);

		for (let x = 0; x < board.config.width; x++) {
			const { wx } = grid.tileWorldPos(x, 0);
			expect(wx).toBe(x * 2);
		}
	});

	it("wz = z * 2 for any in-bounds tile", () => {
		const board = makeBoard();
		const grid = createGridApi(board);

		for (let z = 0; z < board.config.height; z++) {
			const { wz } = grid.tileWorldPos(0, z);
			expect(wz).toBe(z * 2);
		}
	});

	it("wy = tile.elevation * 0.4", () => {
		const board = makeBoard();
		const grid = createGridApi(board);

		for (let z = 0; z < board.config.height; z++) {
			for (let x = 0; x < board.config.width; x++) {
				const tile = board.tiles[z][x];
				const { wy } = grid.tileWorldPos(x, z);
				expect(wy).toBeCloseTo(tile.elevation * ELEVATION_STEP_M);
			}
		}
	});

	it("OOB coords return wy = 0 (getTile returns null → elevation defaults to 0)", () => {
		const grid = createGridApi(makeBoard());
		// OOB x
		expect(grid.tileWorldPos(100, 0).wy).toBe(0);
		// OOB z
		expect(grid.tileWorldPos(0, 100).wy).toBe(0);
		// negative coords
		expect(grid.tileWorldPos(-1, -1).wy).toBe(0);
	});
});

// ─── worldToTile ────────────────────────────────────────────────────────────

describe("createGridApi — worldToTile", () => {
	it("round-trips with tileWorldPos for all valid tiles", () => {
		const board = makeBoard();
		const grid = createGridApi(board);

		for (let z = 0; z < board.config.height; z++) {
			for (let x = 0; x < board.config.width; x++) {
				const { wx, wz } = grid.tileWorldPos(x, z);
				const result = grid.worldToTile(wx, wz);
				expect(result).not.toBeNull();
				expect(result!.x).toBe(x);
				expect(result!.z).toBe(z);
			}
		}
	});

	it("returns null for negative wx", () => {
		const grid = createGridApi(makeBoard());
		expect(grid.worldToTile(-0.1, 0)).toBeNull();
	});

	it("returns null for negative wz", () => {
		const grid = createGridApi(makeBoard());
		expect(grid.worldToTile(0, -0.1)).toBeNull();
	});

	it("returns null for wx >= width * 2", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		expect(grid.worldToTile(board.config.width * 2, 0)).toBeNull();
	});
});

// ─── findTiles ──────────────────────────────────────────────────────────────

describe("createGridApi — findTiles", () => {
	it("returns all tiles matching a predicate", () => {
		const board = makeBoard();
		const grid = createGridApi(board);

		const passableTiles = grid.findTiles((t) => t.passable);
		let expectedCount = 0;
		for (let z = 0; z < board.config.height; z++) {
			for (let x = 0; x < board.config.width; x++) {
				if (board.tiles[z][x].passable) expectedCount++;
			}
		}
		expect(passableTiles.length).toBe(expectedCount);
	});

	it("returns empty array when no tiles match", () => {
		const grid = createGridApi(makeBoard());
		// No tile will have this fictional resource type
		const result = grid.findTiles(
			(t) => t.resourceMaterial === ("unobtanium" as never),
		);
		expect(result).toHaveLength(0);
	});
});

// ─── tilesInRange ────────────────────────────────────────────────────────────

describe("createGridApi — tilesInRange", () => {
	it("range 0 from center returns only that tile", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		const cx = Math.floor(board.config.width / 2);
		const cz = Math.floor(board.config.height / 2);

		const tiles = grid.tilesInRange(cx, cz, 0);
		expect(tiles).toHaveLength(1);
		expect(tiles[0].x).toBe(cx);
		expect(tiles[0].z).toBe(cz);
	});

	it("range 1 from (0,0) returns tiles where Manhattan distance <= 1 (corner: at most 3)", () => {
		const grid = createGridApi(makeBoard());
		const tiles = grid.tilesInRange(0, 0, 1);

		// All returned tiles must satisfy |x| + |z| <= 1
		for (const tile of tiles) {
			expect(Math.abs(tile.x) + Math.abs(tile.z)).toBeLessThanOrEqual(1);
		}

		// From a corner, only (0,0), (1,0), (0,1) are within the board — max 3
		expect(tiles.length).toBeLessThanOrEqual(3);
		expect(tiles.length).toBeGreaterThanOrEqual(1);
	});
});

// ─── reachable ───────────────────────────────────────────────────────────────

describe("createGridApi — reachable", () => {
	it("returns a Set<string>", () => {
		const board = makeBoard();
		const grid = createGridApi(board);
		const cx = Math.floor(board.config.width / 2);
		const cz = Math.floor(board.config.height / 2);

		const result = grid.reachable(cx, cz, 1);
		expect(result).toBeInstanceOf(Set);
	});

	it("on a fully passable board, center tile with 1 step reaches 4 cardinal neighbors", () => {
		// Use a synthetic 5×5 all-passable board to guarantee neighbor passability
		const board = makePassableBoard(5, 5);
		const grid = createGridApi(board);
		const cx = 2;
		const cz = 2; // center of 5×5

		const result = grid.reachable(cx, cz, 1);
		// Center + 4 neighbors = 5 tiles
		expect(result.size).toBe(5);
		expect(result.has("2,2")).toBe(true); // start
		expect(result.has("2,1")).toBe(true); // north
		expect(result.has("2,3")).toBe(true); // south
		expect(result.has("3,2")).toBe(true); // east
		expect(result.has("1,2")).toBe(true); // west
	});
});

// ─── path ────────────────────────────────────────────────────────────────────

describe("createGridApi — path", () => {
	it("returns a tile array from (0,0) to (2,0) on a fully passable board", () => {
		const board = makePassableBoard(8, 8);
		const grid = createGridApi(board);

		const result = grid.path(0, 0, 2, 0);

		// A* finds a 3-tile path: (0,0)→(1,0)→(2,0)
		expect(result.length).toBe(3);
		expect(result[0].x).toBe(0);
		expect(result[0].z).toBe(0);
		expect(result[result.length - 1].x).toBe(2);
		expect(result[result.length - 1].z).toBe(0);
	});
});
