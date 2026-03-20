/**
 * Layer 1 (height mesh) — elevationSampler unit tests.
 *
 * sampleElevation() is the pure-logic bridge between grid data and geometry.
 * Tests cover: exact tile centers, tile boundaries (blending), board corners
 * (clamping), and the full ELEV_Y scale values.
 */

import { describe, expect, it } from "vitest";
import { TILE_SIZE_M } from "../../board/grid";
import type { GeneratedBoard, TileData } from "../../board/types";
import { ELEV_Y, sampleElevation, tileElevY } from "../elevationSampler";

// ── Test board factory ────────────────────────────────────────────────────────

/**
 * Build a minimal GeneratedBoard from a flat elevation grid.
 * `elev[z][x]` maps directly to tiles[z][x].elevation.
 */
function makeBoard(elev: (-1 | 0 | 1 | 2)[][]): GeneratedBoard {
	const height = elev.length;
	const width = elev[0].length;
	const tiles: TileData[][] = elev.map((row, z) =>
		row.map((e, x) => ({
			x,
			z,
			elevation: e,
			passable: true,
			floorType: "grassland",
			resourceMaterial: null,
			resourceAmount: 0,
		})),
	);
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

// ── ELEV_Y scale ──────────────────────────────────────────────────────────────

describe("ELEV_Y scale", () => {
	it("pit (-1) is below ground", () => {
		expect(ELEV_Y[-1]).toBeLessThan(0);
	});

	it("flat (0) is exactly 0", () => {
		expect(ELEV_Y[0]).toBe(0);
	});

	it("raised (1) is above ground", () => {
		expect(ELEV_Y[1]).toBeGreaterThan(0);
	});

	it("high (2) is above raised (1)", () => {
		expect(ELEV_Y[2]).toBeGreaterThan(ELEV_Y[1]);
	});

	it("all four levels are defined", () => {
		for (const k of [-1, 0, 1, 2] as const) {
			expect(typeof ELEV_Y[k]).toBe("number");
		}
	});
});

// ── tileElevY ─────────────────────────────────────────────────────────────────

describe("tileElevY", () => {
	it("returns ELEV_Y for the tile at (tx, tz)", () => {
		const board = makeBoard([
			[0, 1],
			[2, -1],
		]);
		expect(tileElevY(board, 0, 0)).toBe(ELEV_Y[0]);
		expect(tileElevY(board, 1, 0)).toBe(ELEV_Y[1]);
		expect(tileElevY(board, 0, 1)).toBe(ELEV_Y[2]);
		expect(tileElevY(board, 1, 1)).toBe(ELEV_Y[-1]);
	});

	it("clamps negative tx/tz to board edge", () => {
		const board = makeBoard([[1, 0]]);
		expect(tileElevY(board, -1, 0)).toBe(ELEV_Y[1]); // clamps to tx=0
		expect(tileElevY(board, 0, -3)).toBe(ELEV_Y[1]); // clamps to tz=0
	});

	it("clamps out-of-bounds tx/tz to board edge", () => {
		const board = makeBoard([[0, 2]]);
		expect(tileElevY(board, 99, 0)).toBe(ELEV_Y[2]); // clamps to tx=1
	});
});

// ── sampleElevation ───────────────────────────────────────────────────────────

describe("sampleElevation", () => {
	it("at tile center = pure tile elevation", () => {
		const board = makeBoard([
			[0, 1],
			[2, 0],
		]);
		// Tile (1,0) center is at world (1*T, 0*T)
		const T = TILE_SIZE_M;
		expect(sampleElevation(board, 1 * T, 0 * T)).toBeCloseTo(ELEV_Y[1]);
		expect(sampleElevation(board, 0 * T, 1 * T)).toBeCloseTo(ELEV_Y[2]);
	});

	it("at boundary between two same-elevation tiles = that elevation", () => {
		const board = makeBoard([[0, 0, 0]]);
		const T = TILE_SIZE_M;
		// Boundary between tile 0 and tile 1
		expect(sampleElevation(board, 0.5 * T, 0)).toBeCloseTo(ELEV_Y[0]);
	});

	it("at boundary between flat(0) and raised(1) = average", () => {
		const board = makeBoard([[0, 1]]);
		const T = TILE_SIZE_M;
		// The boundary is at x = 0.5*T (between tile 0 and tile 1)
		const result = sampleElevation(board, 0.5 * T, 0);
		const expected = (ELEV_Y[0] + ELEV_Y[1]) / 2;
		expect(result).toBeCloseTo(expected, 5);
	});

	it("at boundary between pit(-1) and high(2) = average", () => {
		const board = makeBoard([[-1, 2]]);
		const T = TILE_SIZE_M;
		const result = sampleElevation(board, 0.5 * T, 0);
		const expected = (ELEV_Y[-1] + ELEV_Y[2]) / 2;
		expect(result).toBeCloseTo(expected, 5);
	});

	it("at board corner (clamped) = corner tile elevation", () => {
		const board = makeBoard([
			[1, 0],
			[0, 0],
		]);
		const T = TILE_SIZE_M;
		// Sample well before tile 0,0 — all 4 neighbors clamp to (0,0)
		const result = sampleElevation(board, -0.4 * T, -0.4 * T);
		expect(result).toBeCloseTo(ELEV_Y[1], 1);
	});

	it("4-corner bilinear blend — center of 2x2 = average of all four", () => {
		const board = makeBoard([
			[0, 2],
			[2, 0],
		]);
		const T = TILE_SIZE_M;
		// Center between all 4 tiles: x=0.5T, z=0.5T
		// Neighbors: (0,0)=0, (1,0)=2, (0,1)=2, (1,1)=0
		// Bilinear at fx=0.5, fz=0.5: (0+2+2+0)/4 = 1.0 wu... wait:
		// e00*(0.5)(0.5) + e10*(0.5)(0.5) + e01*(0.5)(0.5) + e11*(0.5)(0.5)
		// = ELEV_Y[0]*0.25 + ELEV_Y[2]*0.25 + ELEV_Y[2]*0.25 + ELEV_Y[0]*0.25
		// = (ELEV_Y[0] + ELEV_Y[2]) / 2
		const expected = (ELEV_Y[0] + ELEV_Y[2]) / 2;
		const result = sampleElevation(board, 0.5 * T, 0.5 * T);
		expect(result).toBeCloseTo(expected, 5);
	});
});
