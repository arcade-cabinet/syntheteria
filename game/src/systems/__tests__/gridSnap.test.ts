/**
 * Unit tests for the grid snap math utility.
 *
 * Tests cover:
 * - snapToGrid: world position → grid index conversion
 * - gridToWorld: grid index → world center position
 * - Round-trip consistency (snapToGrid ↔ gridToWorld)
 * - getAdjacentSlots: returns exactly 6 face-adjacent positions
 * - gridKey: deterministic string key generation
 * - isSlotOccupied: occupancy checks against a Set<string>
 * - Edge cases: negative coordinates, zero, large values
 */

import { describe, expect, it } from "vitest";
import {
	GRID_SIZE,
	type GridCoord,
	getAdjacentSlots,
	gridKey,
	gridToWorld,
	isSlotOccupied,
	snapToGrid,
} from "../gridSnap";

// ---------------------------------------------------------------------------
// snapToGrid
// ---------------------------------------------------------------------------

describe("snapToGrid", () => {
	it("snaps exact grid center to correct index", () => {
		expect(snapToGrid({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("snaps exact multiples of GRID_SIZE", () => {
		expect(snapToGrid({ x: 0.5, y: 1.0, z: 1.5 })).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("rounds to nearest grid cell", () => {
		// 0.3 / 0.5 = 0.6 → rounds to 1
		expect(snapToGrid({ x: 0.3, y: 0.1, z: 0.4 })).toEqual({ x: 1, y: 0, z: 1 });
	});

	it("handles negative coordinates", () => {
		expect(snapToGrid({ x: -0.5, y: -1.0, z: -1.5 })).toEqual({ x: -1, y: -2, z: -3 });
	});

	it("handles negative values that round toward zero", () => {
		// -0.1 / 0.5 = -0.2 → rounds to 0
		expect(snapToGrid({ x: -0.1, y: -0.1, z: -0.1 })).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("handles large coordinates", () => {
		expect(snapToGrid({ x: 100, y: 200, z: 300 })).toEqual({ x: 200, y: 400, z: 600 });
	});
});

// ---------------------------------------------------------------------------
// gridToWorld
// ---------------------------------------------------------------------------

describe("gridToWorld", () => {
	it("converts grid origin to world origin", () => {
		expect(gridToWorld({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("converts positive grid indices to world positions", () => {
		expect(gridToWorld({ x: 1, y: 2, z: 3 })).toEqual({ x: 0.5, y: 1.0, z: 1.5 });
	});

	it("converts negative grid indices to world positions", () => {
		expect(gridToWorld({ x: -2, y: -4, z: -6 })).toEqual({ x: -1.0, y: -2.0, z: -3.0 });
	});
});

// ---------------------------------------------------------------------------
// Round-trip: snapToGrid ↔ gridToWorld
// ---------------------------------------------------------------------------

describe("snapToGrid ↔ gridToWorld round-trip", () => {
	it("round-trips from a grid-aligned world position", () => {
		const worldPos = { x: 1.5, y: 2.0, z: -0.5 };
		const grid = snapToGrid(worldPos);
		const backToWorld = gridToWorld(grid);
		expect(backToWorld.x).toBeCloseTo(worldPos.x);
		expect(backToWorld.y).toBeCloseTo(worldPos.y);
		expect(backToWorld.z).toBeCloseTo(worldPos.z);
	});

	it("round-trips from grid coords back to the same grid coords", () => {
		const coord: GridCoord = { x: 5, y: -3, z: 10 };
		const world = gridToWorld(coord);
		const backToGrid = snapToGrid(world);
		expect(backToGrid).toEqual(coord);
	});

	it("snapToGrid is idempotent via round-trip", () => {
		const worldPos = { x: 0.37, y: 1.12, z: -0.63 };
		const first = snapToGrid(worldPos);
		const snappedWorld = gridToWorld(first);
		const second = snapToGrid(snappedWorld);
		expect(second).toEqual(first);
	});
});

// ---------------------------------------------------------------------------
// getAdjacentSlots
// ---------------------------------------------------------------------------

describe("getAdjacentSlots", () => {
	it("returns exactly 6 adjacent positions", () => {
		const adj = getAdjacentSlots({ x: 0, y: 0, z: 0 });
		expect(adj).toHaveLength(6);
	});

	it("returns the 6 face-adjacent positions for the origin", () => {
		const adj = getAdjacentSlots({ x: 0, y: 0, z: 0 });
		const keys = adj.map(gridKey);
		expect(keys).toContain("1,0,0");
		expect(keys).toContain("-1,0,0");
		expect(keys).toContain("0,1,0");
		expect(keys).toContain("0,-1,0");
		expect(keys).toContain("0,0,1");
		expect(keys).toContain("0,0,-1");
	});

	it("returns correct neighbors for a non-origin coordinate", () => {
		const coord: GridCoord = { x: 3, y: 5, z: -2 };
		const adj = getAdjacentSlots(coord);
		const keys = adj.map(gridKey);
		expect(keys).toContain("4,5,-2");
		expect(keys).toContain("2,5,-2");
		expect(keys).toContain("3,6,-2");
		expect(keys).toContain("3,4,-2");
		expect(keys).toContain("3,5,-1");
		expect(keys).toContain("3,5,-3");
	});

	it("does not include the original coordinate", () => {
		const coord: GridCoord = { x: 1, y: 2, z: 3 };
		const adj = getAdjacentSlots(coord);
		const keys = adj.map(gridKey);
		expect(keys).not.toContain(gridKey(coord));
	});

	it("does not include diagonal positions", () => {
		const adj = getAdjacentSlots({ x: 0, y: 0, z: 0 });
		const keys = adj.map(gridKey);
		// Diagonals like (1,1,0) should not appear
		expect(keys).not.toContain("1,1,0");
		expect(keys).not.toContain("1,0,1");
		expect(keys).not.toContain("1,1,1");
	});
});

// ---------------------------------------------------------------------------
// gridKey
// ---------------------------------------------------------------------------

describe("gridKey", () => {
	it("produces a comma-separated string", () => {
		expect(gridKey({ x: 1, y: 2, z: 3 })).toBe("1,2,3");
	});

	it("handles negative values", () => {
		expect(gridKey({ x: -1, y: -2, z: -3 })).toBe("-1,-2,-3");
	});

	it("handles zero", () => {
		expect(gridKey({ x: 0, y: 0, z: 0 })).toBe("0,0,0");
	});

	it("produces distinct keys for distinct coordinates", () => {
		const a = gridKey({ x: 1, y: 2, z: 3 });
		const b = gridKey({ x: 3, y: 2, z: 1 });
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// isSlotOccupied
// ---------------------------------------------------------------------------

describe("isSlotOccupied", () => {
	it("returns false for an empty set", () => {
		const occupied = new Set<string>();
		expect(isSlotOccupied({ x: 0, y: 0, z: 0 }, occupied)).toBe(false);
	});

	it("returns true when the slot is in the set", () => {
		const occupied = new Set<string>(["1,2,3"]);
		expect(isSlotOccupied({ x: 1, y: 2, z: 3 }, occupied)).toBe(true);
	});

	it("returns false when a different slot is in the set", () => {
		const occupied = new Set<string>(["1,2,3"]);
		expect(isSlotOccupied({ x: 4, y: 5, z: 6 }, occupied)).toBe(false);
	});

	it("works with multiple occupied slots", () => {
		const occupied = new Set<string>(["0,0,0", "1,0,0", "0,1,0"]);
		expect(isSlotOccupied({ x: 0, y: 0, z: 0 }, occupied)).toBe(true);
		expect(isSlotOccupied({ x: 1, y: 0, z: 0 }, occupied)).toBe(true);
		expect(isSlotOccupied({ x: 0, y: 1, z: 0 }, occupied)).toBe(true);
		expect(isSlotOccupied({ x: 0, y: 0, z: 1 }, occupied)).toBe(false);
	});

	it("correctly uses gridKey format for lookups", () => {
		const coord: GridCoord = { x: -3, y: 7, z: 0 };
		const occupied = new Set<string>([gridKey(coord)]);
		expect(isSlotOccupied(coord, occupied)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// GRID_SIZE constant
// ---------------------------------------------------------------------------

describe("GRID_SIZE", () => {
	it("is 0.5 meters", () => {
		expect(GRID_SIZE).toBe(0.5);
	});
});
