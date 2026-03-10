/**
 * Unit tests for wall auto-placement from stockpile.
 *
 * Covers: placing cubes at wall slots from stockpile, material
 * filtering, zero-stockpile handling, PlacedAt trait assignment,
 * and the buildWall convenience wrapper.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GridCoord } from "../gridSnap";
import { _resetPlacementGrid, getCubeAt } from "../cubePlacement";
import {
	type StockpileCube,
	buildWall,
	placeWall,
} from "../wallPlacement";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetPlacementGrid();
});

// ---------------------------------------------------------------------------
// Helper: make a stockpile of N cubes with a given material
// ---------------------------------------------------------------------------

function makeStockpile(
	material: string,
	count: number,
	idPrefix = "cube",
): StockpileCube[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `${idPrefix}-${i}`,
		material,
	}));
}

// ---------------------------------------------------------------------------
// placeWall — basic placement
// ---------------------------------------------------------------------------

describe("placeWall", () => {
	it("places cubes at each slot from wall plan", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
			{ x: 2, y: 0, z: 0 },
		];
		const stockpile = makeStockpile("scrap_metal", 3);

		const result = placeWall(slots, "scrap_metal", stockpile);

		expect(result.placed).toBe(3);
		expect(result.failed).toBe(0);
		expect(result.placedCubeIds).toEqual(["cube-0", "cube-1", "cube-2"]);
	});

	it("cubes consumed from stockpile in order", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		];
		const stockpile: StockpileCube[] = [
			{ id: "first", material: "iron" },
			{ id: "second", material: "iron" },
			{ id: "third", material: "iron" },
		];

		const result = placeWall(slots, "iron", stockpile);

		expect(result.placed).toBe(2);
		expect(result.placedCubeIds).toEqual(["first", "second"]);
	});

	it("returns correct placed/failed counts with partial stockpile", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
			{ x: 2, y: 0, z: 0 },
			{ x: 3, y: 0, z: 0 },
			{ x: 4, y: 0, z: 0 },
		];
		const stockpile = makeStockpile("scrap_metal", 3);

		const result = placeWall(slots, "scrap_metal", stockpile);

		expect(result.placed).toBe(3);
		expect(result.failed).toBe(2);
		expect(result.placedCubeIds).toHaveLength(3);
	});

	// -----------------------------------------------------------------------
	// Material filtering
	// -----------------------------------------------------------------------

	it("skips wrong-material cubes in stockpile", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		];
		const stockpile: StockpileCube[] = [
			{ id: "wrong-1", material: "copper" },
			{ id: "right-1", material: "iron" },
			{ id: "wrong-2", material: "gold" },
			{ id: "right-2", material: "iron" },
		];

		const result = placeWall(slots, "iron", stockpile);

		expect(result.placed).toBe(2);
		expect(result.failed).toBe(0);
		expect(result.placedCubeIds).toEqual(["right-1", "right-2"]);
	});

	it("fails all slots when stockpile has only wrong material", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		];
		const stockpile = makeStockpile("copper", 5);

		const result = placeWall(slots, "iron", stockpile);

		expect(result.placed).toBe(0);
		expect(result.failed).toBe(2);
		expect(result.placedCubeIds).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// Zero stockpile
	// -----------------------------------------------------------------------

	it("zero stockpile returns placed 0 and failed equals slot count", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
			{ x: 2, y: 0, z: 0 },
		];

		const result = placeWall(slots, "scrap_metal", []);

		expect(result.placed).toBe(0);
		expect(result.failed).toBe(3);
		expect(result.placedCubeIds).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// PlacedAt trait
	// -----------------------------------------------------------------------

	it("each placed cube gets PlacedAt trait via placement registry", () => {
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		];
		const stockpile = makeStockpile("iron", 2);

		placeWall(slots, "iron", stockpile);

		// Verify cubes are registered in the placement grid
		const cube0 = getCubeAt({ x: 0, y: 0, z: 0 });
		expect(cube0).toBeDefined();
		expect(cube0!.entityId).toBe("cube-0");
		expect(cube0!.material).toBe("iron");
		expect(cube0!.gridCoord).toEqual({ x: 0, y: 0, z: 0 });

		const cube1 = getCubeAt({ x: 1, y: 0, z: 0 });
		expect(cube1).toBeDefined();
		expect(cube1!.entityId).toBe("cube-1");
		expect(cube1!.material).toBe("iron");
		expect(cube1!.gridCoord).toEqual({ x: 1, y: 0, z: 0 });
	});

	// -----------------------------------------------------------------------
	// Stacking (multi-height wall)
	// -----------------------------------------------------------------------

	it("places cubes in stacking order (ground first, then up)", () => {
		// Wall slots must be ordered bottom-up for stacking to work
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 2, z: 0 },
		];
		const stockpile = makeStockpile("scrap_metal", 3);

		const result = placeWall(slots, "scrap_metal", stockpile);

		expect(result.placed).toBe(3);
		expect(result.failed).toBe(0);
	});

	// -----------------------------------------------------------------------
	// Injectable placeCubeFn
	// -----------------------------------------------------------------------

	it("uses injected placeCubeFn when provided", () => {
		const mockPlaceCube = vi.fn().mockReturnValue(true);
		const slots: GridCoord[] = [{ x: 0, y: 0, z: 0 }];
		const stockpile = makeStockpile("iron", 1);

		placeWall(slots, "iron", stockpile, mockPlaceCube);

		expect(mockPlaceCube).toHaveBeenCalledWith(
			"cube-0",
			{ x: 0, y: 0, z: 0 },
			"iron",
		);
	});

	it("counts as failed when placeCubeFn returns false", () => {
		const mockPlaceCube = vi.fn().mockReturnValue(false);
		const slots: GridCoord[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		];
		const stockpile = makeStockpile("iron", 2);

		const result = placeWall(slots, "iron", stockpile, mockPlaceCube);

		expect(result.placed).toBe(0);
		expect(result.failed).toBe(2);
		expect(result.placedCubeIds).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// Does not mutate stockpile
	// -----------------------------------------------------------------------

	it("does not mutate the input stockpile array", () => {
		const slots: GridCoord[] = [{ x: 0, y: 0, z: 0 }];
		const stockpile = makeStockpile("iron", 3);
		const originalLength = stockpile.length;

		placeWall(slots, "iron", stockpile);

		expect(stockpile).toHaveLength(originalLength);
	});

	// -----------------------------------------------------------------------
	// Empty slots
	// -----------------------------------------------------------------------

	it("returns zero counts for empty wall slots", () => {
		const stockpile = makeStockpile("iron", 5);

		const result = placeWall([], "iron", stockpile);

		expect(result.placed).toBe(0);
		expect(result.failed).toBe(0);
		expect(result.placedCubeIds).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// buildWall — convenience wrapper
// ---------------------------------------------------------------------------

describe("buildWall", () => {
	it("builds a simple horizontal wall", () => {
		// Wall from (0,0) to (2,0) with height 1 = 3 slots
		const stockpile = makeStockpile("scrap_metal", 3);

		const result = buildWall(0, 0, 2, 0, 1, "scrap_metal", stockpile);

		expect(result.placed).toBe(3);
		expect(result.failed).toBe(0);
	});

	it("builds a wall with height > 1", () => {
		// Wall from (0,0) to (1,0) with height 2 = 4 slots (2 columns x 2 high)
		const stockpile = makeStockpile("iron", 4);

		const result = buildWall(0, 0, 1, 0, 2, "iron", stockpile);

		expect(result.placed).toBe(4);
		expect(result.failed).toBe(0);
	});

	it("partially builds when stockpile is insufficient", () => {
		// Wall from (0,0) to (3,0) with height 1 = 4 slots, only 2 cubes
		const stockpile = makeStockpile("iron", 2);

		const result = buildWall(0, 0, 3, 0, 1, "iron", stockpile);

		expect(result.placed).toBe(2);
		expect(result.failed).toBe(2);
	});

	it("uses injected placeCubeFn", () => {
		const mockPlaceCube = vi.fn().mockReturnValue(true);
		const stockpile = makeStockpile("iron", 1);

		buildWall(0, 0, 0, 0, 1, "iron", stockpile, mockPlaceCube);

		expect(mockPlaceCube).toHaveBeenCalledTimes(1);
	});

	it("single-point wall with height 1 places exactly 1 cube", () => {
		const stockpile = makeStockpile("scrap_metal", 1);

		const result = buildWall(5, 5, 5, 5, 1, "scrap_metal", stockpile);

		expect(result.placed).toBe(1);
		expect(result.failed).toBe(0);
	});
});
