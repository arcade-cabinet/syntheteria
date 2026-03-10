/**
 * Tests for RadialActionMenu pure functions.
 *
 * No DOM rendering — tests exercise the exported layout and
 * hit-testing functions directly.
 */

import {
	calculateButtonPositions,
	isClickOutsideMenu,
} from "../RadialActionMenu";

// ─── calculateButtonPositions ───────────────────────────────────────────────

describe("calculateButtonPositions", () => {
	it("returns empty array for zero count", () => {
		expect(calculateButtonPositions(0, 100, 100)).toEqual([]);
	});

	it("returns empty array for negative count", () => {
		expect(calculateButtonPositions(-1, 100, 100)).toEqual([]);
	});

	it("returns correct number of positions", () => {
		const positions = calculateButtonPositions(4, 0, 0);
		expect(positions).toHaveLength(4);
	});

	it("single button is placed at top (angle = -PI/2)", () => {
		const [pos] = calculateButtonPositions(1, 0, 0, 80);
		// At angle -PI/2: x = cos(-PI/2) * 80 = 0, y = sin(-PI/2) * 80 = -80
		expect(pos.x).toBeCloseTo(0, 10);
		expect(pos.y).toBeCloseTo(-80, 10);
		expect(pos.angle).toBeCloseTo(-Math.PI / 2, 10);
	});

	it("two buttons are placed at top and bottom", () => {
		const positions = calculateButtonPositions(2, 0, 0, 100);
		// First: top (-PI/2)
		expect(positions[0].x).toBeCloseTo(0, 10);
		expect(positions[0].y).toBeCloseTo(-100, 10);
		// Second: bottom (PI/2)
		expect(positions[1].x).toBeCloseTo(0, 10);
		expect(positions[1].y).toBeCloseTo(100, 10);
	});

	it("four buttons are placed at cardinal directions", () => {
		const positions = calculateButtonPositions(4, 0, 0, 50);
		// Top
		expect(positions[0].x).toBeCloseTo(0, 10);
		expect(positions[0].y).toBeCloseTo(-50, 10);
		// Right
		expect(positions[1].x).toBeCloseTo(50, 10);
		expect(positions[1].y).toBeCloseTo(0, 10);
		// Bottom
		expect(positions[2].x).toBeCloseTo(0, 10);
		expect(positions[2].y).toBeCloseTo(50, 10);
		// Left
		expect(positions[3].x).toBeCloseTo(-50, 10);
		expect(positions[3].y).toBeCloseTo(0, 10);
	});

	it("respects center offset", () => {
		const positions = calculateButtonPositions(1, 200, 300, 60);
		// Single button at top of center: x=200, y=300-60=240
		expect(positions[0].x).toBeCloseTo(200, 10);
		expect(positions[0].y).toBeCloseTo(240, 10);
	});

	it("uses default radius of 80 when not specified", () => {
		const positions = calculateButtonPositions(1, 0, 0);
		// Top: y = 0 + sin(-PI/2) * 80 = -80
		expect(positions[0].y).toBeCloseTo(-80, 10);
	});

	it("all positions are equidistant from center", () => {
		const cx = 50;
		const cy = 75;
		const radius = 90;
		const positions = calculateButtonPositions(6, cx, cy, radius);
		for (const pos of positions) {
			const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
			expect(dist).toBeCloseTo(radius, 10);
		}
	});

	it("angles are evenly distributed", () => {
		const positions = calculateButtonPositions(6, 0, 0);
		const expectedSpacing = (Math.PI * 2) / 6;
		for (let i = 1; i < positions.length; i++) {
			const diff = positions[i].angle - positions[i - 1].angle;
			expect(diff).toBeCloseTo(expectedSpacing, 10);
		}
	});

	it("each position has x, y, and angle properties", () => {
		const positions = calculateButtonPositions(3, 0, 0);
		for (const pos of positions) {
			expect(pos).toHaveProperty("x");
			expect(pos).toHaveProperty("y");
			expect(pos).toHaveProperty("angle");
			expect(typeof pos.x).toBe("number");
			expect(typeof pos.y).toBe("number");
			expect(typeof pos.angle).toBe("number");
		}
	});
});

// ─── isClickOutsideMenu ────────────────────────────────────────────────────

describe("isClickOutsideMenu", () => {
	const cx = 400;
	const cy = 300;
	const menuRadius = 80;

	it("returns false for click at center", () => {
		expect(isClickOutsideMenu(cx, cy, cx, cy, menuRadius)).toBe(false);
	});

	it("returns false for click within menu radius", () => {
		expect(isClickOutsideMenu(cx + 50, cy, cx, cy, menuRadius)).toBe(false);
	});

	it("returns false for click at the edge of menu area", () => {
		// Menu area extends to menuRadius + buttonRadius(24) + 4 = 108
		expect(isClickOutsideMenu(cx + 100, cy, cx, cy, menuRadius)).toBe(false);
	});

	it("returns true for click far outside menu", () => {
		expect(isClickOutsideMenu(cx + 200, cy, cx, cy, menuRadius)).toBe(true);
	});

	it("returns true for click just beyond outer boundary", () => {
		// Boundary is at menuRadius + 24 + 4 = 108, so 109 should be outside
		expect(isClickOutsideMenu(cx + 109, cy, cx, cy, menuRadius)).toBe(true);
	});

	it("works with diagonal distances", () => {
		// Distance = sqrt(200^2 + 200^2) ~ 283 > 108
		expect(isClickOutsideMenu(cx + 200, cy + 200, cx, cy, menuRadius)).toBe(
			true,
		);
	});

	it("works with negative offsets", () => {
		expect(isClickOutsideMenu(cx - 200, cy - 200, cx, cy, menuRadius)).toBe(
			true,
		);
	});

	it("returns false for click on a button position", () => {
		// A button at the edge sits at menuRadius distance from center
		expect(isClickOutsideMenu(cx + menuRadius, cy, cx, cy, menuRadius)).toBe(
			false,
		);
	});

	it("handles zero radius", () => {
		// With radius 0, boundary is at 0 + 24 + 4 = 28
		expect(isClickOutsideMenu(cx + 30, cy, cx, cy, 0)).toBe(true);
		expect(isClickOutsideMenu(cx + 20, cy, cx, cy, 0)).toBe(false);
	});
});
