import {
	DEFAULT_SPACING,
	FormationType,
	getOffsets,
} from "../FormationPatterns.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(actual: number, expected: number, epsilon = 0.001): void {
	expect(Math.abs(actual - expected)).toBeLessThan(epsilon);
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("getOffsets edge cases", () => {
	it("returns empty array for count 0", () => {
		expect(getOffsets(FormationType.LINE, 0)).toEqual([]);
	});

	it("returns leader-only offset for count 1", () => {
		for (const type of Object.values(FormationType)) {
			const offsets = getOffsets(type, 1);
			expect(offsets).toHaveLength(1);
			expect(offsets[0]).toEqual({ x: 0, y: 0, z: 0 });
		}
	});

	it("leader offset is always (0,0,0) regardless of formation type or count", () => {
		for (const type of Object.values(FormationType)) {
			for (const count of [2, 5, 10]) {
				const offsets = getOffsets(type, count);
				expect(offsets[0]).toEqual({ x: 0, y: 0, z: 0 });
			}
		}
	});

	it("returns correct number of offsets", () => {
		for (const type of Object.values(FormationType)) {
			for (const count of [1, 3, 7, 12]) {
				expect(getOffsets(type, count)).toHaveLength(count);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// LINE formation
// ---------------------------------------------------------------------------

describe("LINE formation", () => {
	const spacing = DEFAULT_SPACING.lineSpacing; // 2

	it("places followers alternating left and right", () => {
		const offsets = getOffsets(FormationType.LINE, 5);

		// Index 1: right (positive x)
		expect(offsets[1].x).toBeGreaterThan(0);
		// Index 2: left (negative x)
		expect(offsets[2].x).toBeLessThan(0);
		// Index 3: right, further out
		expect(offsets[3].x).toBeGreaterThan(offsets[1].x);
		// Index 4: left, further out
		expect(offsets[4].x).toBeLessThan(offsets[2].x);
	});

	it("uses correct spacing between members", () => {
		const offsets = getOffsets(FormationType.LINE, 5);

		approx(offsets[1].x, spacing); // 1 * spacing
		approx(offsets[2].x, -spacing); // -1 * spacing
		approx(offsets[3].x, 2 * spacing); // 2 * spacing
		approx(offsets[4].x, -2 * spacing); // -2 * spacing
	});

	it("keeps all members on the same z-plane (no depth offset)", () => {
		const offsets = getOffsets(FormationType.LINE, 6);
		for (const offset of offsets) {
			expect(offset.z).toBe(0);
			expect(offset.y).toBe(0);
		}
	});

	it("respects custom spacing", () => {
		const customSpacing = 5;
		const offsets = getOffsets(FormationType.LINE, 3, {
			lineSpacing: customSpacing,
		});

		approx(offsets[1].x, customSpacing);
		approx(offsets[2].x, -customSpacing);
	});
});

// ---------------------------------------------------------------------------
// WEDGE formation
// ---------------------------------------------------------------------------

describe("WEDGE formation", () => {
	const spacing = DEFAULT_SPACING.wedgeSpacing; // 2

	it("places followers behind and to the sides of the leader", () => {
		const offsets = getOffsets(FormationType.WEDGE, 5);

		for (let i = 1; i < 5; i++) {
			// All followers should be behind the leader (negative z).
			expect(offsets[i].z).toBeLessThan(0);
			// All followers should have non-zero x offset.
			expect(offsets[i].x).not.toBe(0);
		}
	});

	it("creates a V-shape: deeper rows are farther apart laterally", () => {
		const offsets = getOffsets(FormationType.WEDGE, 5);

		// First row (indices 1,2) should be closer together than second (3,4).
		const row1Width = Math.abs(offsets[1].x) + Math.abs(offsets[2].x);
		const row2Width = Math.abs(offsets[3].x) + Math.abs(offsets[4].x);
		expect(row2Width).toBeGreaterThan(row1Width);
	});

	it("uses correct spacing values", () => {
		const offsets = getOffsets(FormationType.WEDGE, 5);

		// Index 1: right side, rank 1
		approx(offsets[1].x, spacing);
		approx(offsets[1].z, -spacing);

		// Index 2: left side, rank 1
		approx(offsets[2].x, -spacing);
		approx(offsets[2].z, -spacing);

		// Index 3: right side, rank 2
		approx(offsets[3].x, 2 * spacing);
		approx(offsets[3].z, -2 * spacing);
	});

	it("respects custom spacing", () => {
		const customSpacing = 3;
		const offsets = getOffsets(FormationType.WEDGE, 3, {
			wedgeSpacing: customSpacing,
		});

		approx(offsets[1].x, customSpacing);
		approx(offsets[1].z, -customSpacing);
	});
});

// ---------------------------------------------------------------------------
// COLUMN formation
// ---------------------------------------------------------------------------

describe("COLUMN formation", () => {
	const spacing = DEFAULT_SPACING.columnSpacing; // 1.5

	it("places all followers directly behind the leader", () => {
		const offsets = getOffsets(FormationType.COLUMN, 5);

		for (let i = 1; i < 5; i++) {
			expect(offsets[i].x).toBe(0);
			expect(offsets[i].z).toBeLessThan(0);
		}
	});

	it("uses correct spacing between members", () => {
		const offsets = getOffsets(FormationType.COLUMN, 4);

		approx(offsets[1].z, -spacing);
		approx(offsets[2].z, -2 * spacing);
		approx(offsets[3].z, -3 * spacing);
	});

	it("maintains single file (x = 0 for all)", () => {
		const offsets = getOffsets(FormationType.COLUMN, 8);
		for (const offset of offsets) {
			expect(offset.x).toBe(0);
			expect(offset.y).toBe(0);
		}
	});

	it("respects custom spacing", () => {
		const customSpacing = 4;
		const offsets = getOffsets(FormationType.COLUMN, 3, {
			columnSpacing: customSpacing,
		});

		approx(offsets[1].z, -customSpacing);
		approx(offsets[2].z, -2 * customSpacing);
	});
});

// ---------------------------------------------------------------------------
// CIRCLE formation
// ---------------------------------------------------------------------------

describe("CIRCLE formation", () => {
	const radius = DEFAULT_SPACING.circleRadius; // 3

	it("places all followers at the configured radius from center", () => {
		const offsets = getOffsets(FormationType.CIRCLE, 5);

		for (let i = 1; i < 5; i++) {
			const dist = Math.sqrt(
				offsets[i].x * offsets[i].x + offsets[i].z * offsets[i].z,
			);
			approx(dist, radius);
		}
	});

	it("distributes followers evenly around the circle", () => {
		const count = 5;
		const offsets = getOffsets(FormationType.CIRCLE, count);
		const followerCount = count - 1;

		// Calculate angles of each follower.
		const angles = offsets.slice(1).map((o) => Math.atan2(o.z, o.x));

		// Check that angular gaps between consecutive followers are equal.
		const expectedGap = (Math.PI * 2) / followerCount;
		for (let i = 0; i < angles.length - 1; i++) {
			let gap = angles[i + 1] - angles[i];
			// Normalize to [0, 2*PI].
			if (gap < 0) gap += Math.PI * 2;
			approx(gap, expectedGap);
		}
	});

	it("respects custom radius", () => {
		const customRadius = 7;
		const offsets = getOffsets(FormationType.CIRCLE, 4, {
			circleRadius: customRadius,
		});

		for (let i = 1; i < 4; i++) {
			const dist = Math.sqrt(
				offsets[i].x * offsets[i].x + offsets[i].z * offsets[i].z,
			);
			approx(dist, customRadius);
		}
	});

	it("handles 2 members (leader + 1 follower)", () => {
		const offsets = getOffsets(FormationType.CIRCLE, 2);
		expect(offsets).toHaveLength(2);
		expect(offsets[0]).toEqual({ x: 0, y: 0, z: 0 });

		const dist = Math.sqrt(
			offsets[1].x * offsets[1].x + offsets[1].z * offsets[1].z,
		);
		approx(dist, radius);
	});

	it("y offset is always 0 (2D plane)", () => {
		const offsets = getOffsets(FormationType.CIRCLE, 8);
		for (const offset of offsets) {
			expect(offset.y).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Spacing overrides
// ---------------------------------------------------------------------------

describe("custom spacing overrides", () => {
	it("only overrides specified values, keeps defaults for the rest", () => {
		// Override only lineSpacing, other values should remain default.
		const lineOffsets = getOffsets(FormationType.LINE, 3, {
			lineSpacing: 10,
		});
		approx(lineOffsets[1].x, 10);

		// Circle should still use the default radius.
		const circleOffsets = getOffsets(FormationType.CIRCLE, 3, {
			lineSpacing: 10,
		});
		for (let i = 1; i < 3; i++) {
			const dist = Math.sqrt(
				circleOffsets[i].x * circleOffsets[i].x +
					circleOffsets[i].z * circleOffsets[i].z,
			);
			approx(dist, DEFAULT_SPACING.circleRadius);
		}
	});
});
