import { describe, expect, it } from "vitest";
import { checkBreach, type GridCoord } from "../breachDetection.ts";

/** Helper — builds a straight wall along the X axis at y=0, z=0. */
function wallLine(startX: number, endX: number): GridCoord[] {
	const cubes: GridCoord[] = [];
	for (let x = startX; x <= endX; x++) {
		cubes.push({ x, y: 0, z: 0 });
	}
	return cubes;
}

describe("breachDetection", () => {
	// -----------------------------------------------------------------------
	// No breach — intact wall
	// -----------------------------------------------------------------------

	describe("intact wall", () => {
		it("reports no breach for a contiguous wall", () => {
			const wall = wallLine(0, 9); // 10 cubes in a row
			const result = checkBreach(wall);
			expect(result.breached).toBe(false);
			expect(result.gapPositions).toHaveLength(0);
			expect(result.disconnectedSections).toHaveLength(1);
			expect(result.disconnectedSections[0]).toHaveLength(10);
		});

		it("reports no breach for a single cube", () => {
			const wall = [{ x: 0, y: 0, z: 0 }];
			const result = checkBreach(wall);
			expect(result.breached).toBe(false);
			expect(result.disconnectedSections).toHaveLength(1);
		});

		it("reports no breach for an L-shaped wall", () => {
			const cubes: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 1, y: 0, z: 0 },
				{ x: 2, y: 0, z: 0 },
				{ x: 2, y: 0, z: 1 },
				{ x: 2, y: 0, z: 2 },
			];
			const result = checkBreach(cubes);
			expect(result.breached).toBe(false);
			expect(result.disconnectedSections).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// Breach — middle cube destroyed
	// -----------------------------------------------------------------------

	describe("breach when middle cube destroyed", () => {
		it("detects breach when the middle cube of a 3-cube wall is removed", () => {
			// Full wall: x=0,1,2 — remove x=1
			const fullWall = wallLine(0, 2);
			const surviving = fullWall.filter((c) => c.x !== 1);

			const result = checkBreach(surviving, fullWall);
			expect(result.breached).toBe(true);
			expect(result.gapPositions).toHaveLength(1);
			expect(result.gapPositions[0]).toEqual({ x: 1, y: 0, z: 0 });
			expect(result.disconnectedSections).toHaveLength(2);
		});

		it("detects breach from connectivity alone (no expectedPositions)", () => {
			// Two separate groups: x=0 and x=2 (gap at x=1 is implicit)
			const surviving: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 2, y: 0, z: 0 },
			];

			const result = checkBreach(surviving);
			expect(result.breached).toBe(true);
			expect(result.disconnectedSections).toHaveLength(2);
		});

		it("finds the correct gap position", () => {
			const fullWall = wallLine(0, 4); // 5 cubes
			// Remove cube at x=2
			const surviving = fullWall.filter((c) => c.x !== 2);

			const result = checkBreach(surviving, fullWall);
			expect(result.gapPositions).toEqual([{ x: 2, y: 0, z: 0 }]);
			expect(result.disconnectedSections).toHaveLength(2);
			// Section 1: x=0,1 — Section 2: x=3,4
			const sizes = result.disconnectedSections
				.map((s) => s.length)
				.sort((a, b) => a - b);
			expect(sizes).toEqual([2, 2]);
		});
	});

	// -----------------------------------------------------------------------
	// Multiple breaches
	// -----------------------------------------------------------------------

	describe("multiple breaches", () => {
		it("detects two gaps in a 7-cube wall", () => {
			const fullWall = wallLine(0, 6); // 7 cubes
			// Remove x=2 and x=5 — creates 3 sections: [0,1], [3,4], [6]
			const surviving = fullWall.filter((c) => c.x !== 2 && c.x !== 5);

			const result = checkBreach(surviving, fullWall);
			expect(result.breached).toBe(true);
			expect(result.gapPositions).toHaveLength(2);
			expect(result.disconnectedSections).toHaveLength(3);

			const sizes = result.disconnectedSections
				.map((s) => s.length)
				.sort((a, b) => a - b);
			expect(sizes).toEqual([1, 2, 2]);
		});

		it("detects adjacent gaps", () => {
			const fullWall = wallLine(0, 4); // 5 cubes
			// Remove x=1 and x=2 — two adjacent gaps
			const surviving = fullWall.filter((c) => c.x !== 1 && c.x !== 2);

			const result = checkBreach(surviving, fullWall);
			expect(result.breached).toBe(true);
			expect(result.gapPositions).toHaveLength(2);
			expect(result.disconnectedSections).toHaveLength(2);
		});
	});

	// -----------------------------------------------------------------------
	// Single-cube wall
	// -----------------------------------------------------------------------

	describe("single-cube wall", () => {
		it("no breach when the single cube is present", () => {
			const wall = [{ x: 5, y: 0, z: 5 }];
			const result = checkBreach(wall, wall);
			expect(result.breached).toBe(false);
			expect(result.gapPositions).toHaveLength(0);
			expect(result.disconnectedSections).toHaveLength(1);
		});

		it("breach when the single cube is destroyed", () => {
			const fullWall = [{ x: 5, y: 0, z: 5 }];
			const surviving: GridCoord[] = [];

			const result = checkBreach(surviving, fullWall);
			expect(result.breached).toBe(true);
			expect(result.gapPositions).toHaveLength(1);
			expect(result.disconnectedSections).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// 3D walls (vertical / multi-layer)
	// -----------------------------------------------------------------------

	describe("3D walls", () => {
		it("detects connectivity through Y axis", () => {
			// Vertical stack: y=0,1,2 at x=0,z=0
			const wall: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 0, y: 1, z: 0 },
				{ x: 0, y: 2, z: 0 },
			];
			const result = checkBreach(wall);
			expect(result.breached).toBe(false);
			expect(result.disconnectedSections).toHaveLength(1);
		});

		it("detects breach in vertical wall", () => {
			// Remove middle of vertical stack
			const full: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 0, y: 1, z: 0 },
				{ x: 0, y: 2, z: 0 },
			];
			const surviving = full.filter((c) => c.y !== 1);

			const result = checkBreach(surviving, full);
			expect(result.breached).toBe(true);
			expect(result.disconnectedSections).toHaveLength(2);
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe("edge cases", () => {
		it("empty wall list with no expectations is not a breach", () => {
			const result = checkBreach([]);
			expect(result.breached).toBe(false);
			expect(result.disconnectedSections).toHaveLength(0);
		});

		it("removing end cube does not disconnect the wall", () => {
			const fullWall = wallLine(0, 4);
			// Remove x=0 (end piece)
			const surviving = fullWall.filter((c) => c.x !== 0);

			const result = checkBreach(surviving);
			// Still one contiguous section
			expect(result.disconnectedSections).toHaveLength(1);
			// But with expectedPositions, it's a breach (gap exists)
			const resultWithExpected = checkBreach(surviving, fullWall);
			expect(resultWithExpected.breached).toBe(true);
			expect(resultWithExpected.gapPositions).toHaveLength(1);
			// Still only one connected section though
			expect(resultWithExpected.disconnectedSections).toHaveLength(1);
		});

		it("2x2 block is fully connected", () => {
			const cubes: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 1, y: 0, z: 0 },
				{ x: 0, y: 0, z: 1 },
				{ x: 1, y: 0, z: 1 },
			];
			const result = checkBreach(cubes);
			expect(result.breached).toBe(false);
			expect(result.disconnectedSections).toHaveLength(1);
		});

		it("diagonal cubes are NOT connected (6-connected, not 26)", () => {
			const cubes: GridCoord[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 1, y: 0, z: 1 }, // diagonal — not face-adjacent
			];
			const result = checkBreach(cubes);
			expect(result.breached).toBe(true);
			expect(result.disconnectedSections).toHaveLength(2);
		});
	});
});
