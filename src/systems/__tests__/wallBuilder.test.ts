/**
 * Unit tests for the wall line calculator (Bresenham).
 *
 * Verifies that calculateWallLine produces correct grid slots for
 * horizontal, vertical, diagonal, and single-point walls, and that
 * getWallCost returns the matching count.
 */

import type { GridCoord } from "../gridSnap";
import { calculateWallLine, getWallCost } from "../wallBuilder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract unique XZ footprint cells from a slot list. */
function uniqueFootprint(slots: GridCoord[]): Array<{ x: number; z: number }> {
	const seen = new Set<string>();
	const result: Array<{ x: number; z: number }> = [];
	for (const s of slots) {
		const key = `${s.x},${s.z}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push({ x: s.x, z: s.z });
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// calculateWallLine — horizontal
// ---------------------------------------------------------------------------

describe("calculateWallLine", () => {
	describe("horizontal line", () => {
		it("(0,0) to (5,0) height 3 returns 18 slots", () => {
			const slots = calculateWallLine(0, 0, 5, 0, 3);
			expect(slots).toHaveLength(18);
		});

		it("covers 6 footprint cells along X axis", () => {
			const slots = calculateWallLine(0, 0, 5, 0, 3);
			const footprint = uniqueFootprint(slots);
			expect(footprint).toHaveLength(6);
			for (let x = 0; x <= 5; x++) {
				expect(footprint).toContainEqual({ x, z: 0 });
			}
		});

		it("each footprint cell has Y levels 0, 1, 2", () => {
			const slots = calculateWallLine(0, 0, 5, 0, 3);
			for (let x = 0; x <= 5; x++) {
				for (let y = 0; y < 3; y++) {
					expect(slots).toContainEqual({ x, y, z: 0 });
				}
			}
		});

		it("works in negative X direction", () => {
			const slots = calculateWallLine(5, 0, 0, 0, 2);
			expect(slots).toHaveLength(12);
			const footprint = uniqueFootprint(slots);
			expect(footprint).toHaveLength(6);
		});
	});

	// ---------------------------------------------------------------------------
	// calculateWallLine — vertical (along Z)
	// ---------------------------------------------------------------------------

	describe("vertical line (along Z axis)", () => {
		it("(0,0) to (0,4) height 2 returns 10 slots", () => {
			const slots = calculateWallLine(0, 0, 0, 4, 2);
			expect(slots).toHaveLength(10);
		});

		it("covers 5 footprint cells along Z axis", () => {
			const slots = calculateWallLine(0, 0, 0, 4, 1);
			const footprint = uniqueFootprint(slots);
			expect(footprint).toHaveLength(5);
			for (let z = 0; z <= 4; z++) {
				expect(footprint).toContainEqual({ x: 0, z });
			}
		});
	});

	// ---------------------------------------------------------------------------
	// calculateWallLine — diagonal
	// ---------------------------------------------------------------------------

	describe("diagonal line", () => {
		it("handles 45-degree diagonal correctly", () => {
			const slots = calculateWallLine(0, 0, 3, 3, 1);
			const footprint = uniqueFootprint(slots);
			// Bresenham 45 degrees: (0,0),(1,1),(2,2),(3,3) = 4 cells
			expect(footprint).toHaveLength(4);
			expect(footprint).toContainEqual({ x: 0, z: 0 });
			expect(footprint).toContainEqual({ x: 1, z: 1 });
			expect(footprint).toContainEqual({ x: 2, z: 2 });
			expect(footprint).toContainEqual({ x: 3, z: 3 });
		});

		it("handles steep diagonal (more Z than X)", () => {
			const slots = calculateWallLine(0, 0, 2, 5, 1);
			const footprint = uniqueFootprint(slots);
			// Should have 6 cells (max(|dx|,|dz|) + 1 = 6)
			expect(footprint).toHaveLength(6);
			// Start and end should be present
			expect(footprint).toContainEqual({ x: 0, z: 0 });
			expect(footprint).toContainEqual({ x: 2, z: 5 });
		});

		it("handles gentle diagonal (more X than Z)", () => {
			const slots = calculateWallLine(0, 0, 5, 2, 1);
			const footprint = uniqueFootprint(slots);
			// Should have 6 cells (max(|dx|,|dz|) + 1 = 6)
			expect(footprint).toHaveLength(6);
			expect(footprint).toContainEqual({ x: 0, z: 0 });
			expect(footprint).toContainEqual({ x: 5, z: 2 });
		});

		it("handles negative diagonal direction", () => {
			const slots = calculateWallLine(3, 3, 0, 0, 1);
			const footprint = uniqueFootprint(slots);
			expect(footprint).toHaveLength(4);
			expect(footprint).toContainEqual({ x: 0, z: 0 });
			expect(footprint).toContainEqual({ x: 3, z: 3 });
		});

		it("handles mixed-sign diagonal", () => {
			const slots = calculateWallLine(0, 0, -3, 3, 1);
			const footprint = uniqueFootprint(slots);
			expect(footprint).toHaveLength(4);
			expect(footprint).toContainEqual({ x: 0, z: 0 });
			expect(footprint).toContainEqual({ x: -3, z: 3 });
		});
	});

	// ---------------------------------------------------------------------------
	// calculateWallLine — single point
	// ---------------------------------------------------------------------------

	describe("single-point wall (start equals end)", () => {
		it("returns height slots for a single column", () => {
			const slots = calculateWallLine(5, 5, 5, 5, 4);
			expect(slots).toHaveLength(4);
		});

		it("all slots share the same XZ coordinate", () => {
			const slots = calculateWallLine(5, 5, 5, 5, 3);
			for (const slot of slots) {
				expect(slot.x).toBe(5);
				expect(slot.z).toBe(5);
			}
		});

		it("Y levels go from 0 to height-1", () => {
			const slots = calculateWallLine(5, 5, 5, 5, 3);
			expect(slots).toContainEqual({ x: 5, y: 0, z: 5 });
			expect(slots).toContainEqual({ x: 5, y: 1, z: 5 });
			expect(slots).toContainEqual({ x: 5, y: 2, z: 5 });
		});

		it("height 1 returns exactly 1 slot", () => {
			const slots = calculateWallLine(0, 0, 0, 0, 1);
			expect(slots).toHaveLength(1);
			expect(slots[0]).toEqual({ x: 0, y: 0, z: 0 });
		});
	});

	// ---------------------------------------------------------------------------
	// calculateWallLine — height parameter
	// ---------------------------------------------------------------------------

	describe("height parameter", () => {
		it("height 1 returns only ground level", () => {
			const slots = calculateWallLine(0, 0, 2, 0, 1);
			expect(slots).toHaveLength(3);
			for (const slot of slots) {
				expect(slot.y).toBe(0);
			}
		});

		it("height 5 produces 5 layers per footprint cell", () => {
			const slots = calculateWallLine(0, 0, 0, 0, 5);
			expect(slots).toHaveLength(5);
			for (let y = 0; y < 5; y++) {
				expect(slots).toContainEqual({ x: 0, y, z: 0 });
			}
		});

		it("total slots = footprint cells * height", () => {
			// (0,0) to (3,0) = 4 footprint cells, height 4 = 16 total
			const slots = calculateWallLine(0, 0, 3, 0, 4);
			expect(slots).toHaveLength(16);
		});
	});
});

// ---------------------------------------------------------------------------
// getWallCost
// ---------------------------------------------------------------------------

describe("getWallCost", () => {
	it("returns the same count as calculateWallLine length", () => {
		expect(getWallCost(0, 0, 5, 0, 3)).toBe(18);
		expect(getWallCost(0, 0, 3, 3, 2)).toBe(8);
		expect(getWallCost(5, 5, 5, 5, 4)).toBe(4);
	});

	it("returns exact slot count for single point", () => {
		expect(getWallCost(0, 0, 0, 0, 1)).toBe(1);
		expect(getWallCost(0, 0, 0, 0, 10)).toBe(10);
	});

	it("returns exact slot count for horizontal line", () => {
		// 6 cells * 3 height = 18
		expect(getWallCost(0, 0, 5, 0, 3)).toBe(18);
	});
});
