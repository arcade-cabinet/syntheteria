/**
 * Unit tests for cube placement and structural integrity.
 *
 * Covers: placement validation (ground, stacking, occupied, floating),
 * placeCube / removeCube registry operations, getOccupiedSlots,
 * checkStructuralIntegrity BFS, and edge cases.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { gridKey } from "../gridSnap";
import {
	_resetPlacementGrid,
	canPlaceCube,
	checkStructuralIntegrity,
	getCubeAt,
	getOccupiedSlots,
	placeCube,
	removeCube,
} from "../cubePlacement";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetPlacementGrid();
});

// ---------------------------------------------------------------------------
// canPlaceCube — ground level
// ---------------------------------------------------------------------------

describe("canPlaceCube", () => {
	it("returns valid for ground level (y=0)", () => {
		const result = canPlaceCube({ x: 0, y: 0, z: 0 }, new Set());
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it("returns valid for ground level at any x/z", () => {
		const result = canPlaceCube({ x: 5, y: 0, z: -3 }, new Set());
		expect(result.valid).toBe(true);
	});

	// -----------------------------------------------------------------------
	// canPlaceCube — stacking
	// -----------------------------------------------------------------------

	it("returns valid if slot below is occupied (stacking)", () => {
		const below = gridKey({ x: 0, y: 0, z: 0 });
		const occupied = new Set([below]);
		const result = canPlaceCube({ x: 0, y: 1, z: 0 }, occupied);
		expect(result.valid).toBe(true);
	});

	it("returns valid for multi-level stacking", () => {
		const ground = gridKey({ x: 0, y: 0, z: 0 });
		const level1 = gridKey({ x: 0, y: 1, z: 0 });
		const occupied = new Set([ground, level1]);
		const result = canPlaceCube({ x: 0, y: 2, z: 0 }, occupied);
		expect(result.valid).toBe(true);
	});

	// -----------------------------------------------------------------------
	// canPlaceCube — invalid: floating
	// -----------------------------------------------------------------------

	it("returns invalid for floating with no support", () => {
		const result = canPlaceCube({ x: 0, y: 1, z: 0 }, new Set());
		expect(result.valid).toBe(false);
		expect(result.reason).toBeDefined();
	});

	it("returns invalid for floating even with side neighbors", () => {
		// Cube to the side at same level — NOT below
		const sideNeighbor = gridKey({ x: 1, y: 1, z: 0 });
		const occupied = new Set([sideNeighbor]);
		const result = canPlaceCube({ x: 0, y: 1, z: 0 }, occupied);
		expect(result.valid).toBe(false);
	});

	it("returns invalid at y=3 with gap at y=2", () => {
		const ground = gridKey({ x: 0, y: 0, z: 0 });
		const level1 = gridKey({ x: 0, y: 1, z: 0 });
		// Missing y=2, trying to place at y=3
		const occupied = new Set([ground, level1]);
		const result = canPlaceCube({ x: 0, y: 3, z: 0 }, occupied);
		expect(result.valid).toBe(false);
	});

	// -----------------------------------------------------------------------
	// canPlaceCube — invalid: occupied
	// -----------------------------------------------------------------------

	it("returns invalid for already-occupied slot", () => {
		const key = gridKey({ x: 0, y: 0, z: 0 });
		const occupied = new Set([key]);
		const result = canPlaceCube({ x: 0, y: 0, z: 0 }, occupied);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("occupied");
	});

	it("returns invalid for occupied slot even with support below", () => {
		const below = gridKey({ x: 0, y: 0, z: 0 });
		const target = gridKey({ x: 0, y: 1, z: 0 });
		const occupied = new Set([below, target]);
		const result = canPlaceCube({ x: 0, y: 1, z: 0 }, occupied);
		expect(result.valid).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// placeCube
// ---------------------------------------------------------------------------

describe("placeCube", () => {
	it("adds cube to registry and returns true for valid placement", () => {
		const result = placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		expect(result).toBe(true);

		const slots = getOccupiedSlots();
		expect(slots.has(gridKey({ x: 0, y: 0, z: 0 }))).toBe(true);
	});

	it("adds PlacedAt trait data retrievable via getCubeAt", () => {
		placeCube("cube-1", { x: 2, y: 0, z: 3 }, "iron");

		const data = getCubeAt({ x: 2, y: 0, z: 3 });
		expect(data).toBeDefined();
		expect(data!.entityId).toBe("cube-1");
		expect(data!.material).toBe("iron");
		expect(data!.gridCoord).toEqual({ x: 2, y: 0, z: 3 });
	});

	it("returns false for invalid placement (floating)", () => {
		const result = placeCube("cube-1", { x: 0, y: 1, z: 0 }, "scrap_metal");
		expect(result).toBe(false);

		const slots = getOccupiedSlots();
		expect(slots.size).toBe(0);
	});

	it("returns false for already-occupied slot", () => {
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		const result = placeCube("cube-2", { x: 0, y: 0, z: 0 }, "iron");
		expect(result).toBe(false);
	});

	it("allows stacking after ground cube is placed", () => {
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		const result = placeCube("cube-2", { x: 0, y: 1, z: 0 }, "iron");
		expect(result).toBe(true);

		const slots = getOccupiedSlots();
		expect(slots.size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// removeCube
// ---------------------------------------------------------------------------

describe("removeCube", () => {
	it("removes a placed cube from the registry", () => {
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		removeCube({ x: 0, y: 0, z: 0 });

		const slots = getOccupiedSlots();
		expect(slots.size).toBe(0);
	});

	it("is a no-op for an empty slot", () => {
		// Should not throw
		removeCube({ x: 5, y: 5, z: 5 });
		expect(getOccupiedSlots().size).toBe(0);
	});

	it("only removes the targeted cube", () => {
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		placeCube("cube-2", { x: 1, y: 0, z: 0 }, "iron");
		removeCube({ x: 0, y: 0, z: 0 });

		const slots = getOccupiedSlots();
		expect(slots.size).toBe(1);
		expect(slots.has(gridKey({ x: 1, y: 0, z: 0 }))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getOccupiedSlots
// ---------------------------------------------------------------------------

describe("getOccupiedSlots", () => {
	it("returns empty set when no cubes are placed", () => {
		expect(getOccupiedSlots().size).toBe(0);
	});

	it("returns all placed cube keys", () => {
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		placeCube("cube-2", { x: 1, y: 0, z: 0 }, "iron");
		placeCube("cube-3", { x: 0, y: 1, z: 0 }, "copper");

		const slots = getOccupiedSlots();
		expect(slots.size).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// checkStructuralIntegrity
// ---------------------------------------------------------------------------

describe("checkStructuralIntegrity", () => {
	it("returns empty array when all cubes are on ground", () => {
		const occupied = new Set([
			gridKey({ x: 0, y: 0, z: 0 }),
			gridKey({ x: 1, y: 0, z: 0 }),
			gridKey({ x: 2, y: 0, z: 0 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toEqual([]);
	});

	it("returns empty array for a valid stack", () => {
		const occupied = new Set([
			gridKey({ x: 0, y: 0, z: 0 }),
			gridKey({ x: 0, y: 1, z: 0 }),
			gridKey({ x: 0, y: 2, z: 0 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toEqual([]);
	});

	it("returns empty for L-shaped structure connected to ground", () => {
		// Ground row + vertical column
		const occupied = new Set([
			gridKey({ x: 0, y: 0, z: 0 }),
			gridKey({ x: 1, y: 0, z: 0 }),
			gridKey({ x: 1, y: 1, z: 0 }),
			gridKey({ x: 1, y: 2, z: 0 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toEqual([]);
	});

	it("finds floating cubes with no ground connection", () => {
		// Isolated cube at y=2 with nothing below
		const occupied = new Set([
			gridKey({ x: 0, y: 0, z: 0 }),
			gridKey({ x: 5, y: 2, z: 5 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toHaveLength(1);
		expect(unsupported[0]).toEqual({ x: 5, y: 2, z: 5 });
	});

	it("finds cluster of floating cubes", () => {
		// Ground cube + disconnected floating cluster
		const occupied = new Set([
			gridKey({ x: 0, y: 0, z: 0 }),
			// Floating cluster at y=3 (no path to ground)
			gridKey({ x: 10, y: 3, z: 10 }),
			gridKey({ x: 11, y: 3, z: 10 }),
			gridKey({ x: 10, y: 4, z: 10 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toHaveLength(3);
	});

	it("returns empty array for empty grid", () => {
		const unsupported = checkStructuralIntegrity(new Set());
		expect(unsupported).toEqual([]);
	});

	it("handles bridge structures (connected via side adjacency)", () => {
		// Bridge: two pillars connected by a horizontal span
		const occupied = new Set([
			// Left pillar
			gridKey({ x: 0, y: 0, z: 0 }),
			gridKey({ x: 0, y: 1, z: 0 }),
			gridKey({ x: 0, y: 2, z: 0 }),
			// Horizontal bridge at y=2
			gridKey({ x: 1, y: 2, z: 0 }),
			gridKey({ x: 2, y: 2, z: 0 }),
			// Right pillar
			gridKey({ x: 3, y: 2, z: 0 }),
			gridKey({ x: 3, y: 1, z: 0 }),
			gridKey({ x: 3, y: 0, z: 0 }),
		]);
		const unsupported = checkStructuralIntegrity(occupied);
		expect(unsupported).toEqual([]);
	});

	it("detects cubes that become unsupported after removal", () => {
		// Build a stack, remove the middle, check integrity
		placeCube("cube-1", { x: 0, y: 0, z: 0 }, "scrap_metal");
		placeCube("cube-2", { x: 0, y: 1, z: 0 }, "scrap_metal");
		placeCube("cube-3", { x: 0, y: 2, z: 0 }, "scrap_metal");

		// Remove the middle cube
		removeCube({ x: 0, y: 1, z: 0 });

		const unsupported = checkStructuralIntegrity(getOccupiedSlots());
		expect(unsupported).toHaveLength(1);
		expect(unsupported[0]).toEqual({ x: 0, y: 2, z: 0 });
	});
});
