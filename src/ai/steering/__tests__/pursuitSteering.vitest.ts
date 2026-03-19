import { describe, expect, it } from "vitest";
import {
	computeInterceptTarget,
	shouldUsePursuit,
} from "../pursuitSteering";

describe("computeInterceptTarget", () => {
	it("returns current position when target is stationary", () => {
		const result = computeInterceptTarget(0, 0, 10, 10, 0, 0, 32, 32);
		expect(result).toEqual({ x: 10, z: 10 });
	});

	it("predicts ahead when target is moving", () => {
		// Target at (10, 10) heading right (+1, 0)
		// Distance = 10, lookAhead = floor(10/3) = 3
		const result = computeInterceptTarget(0, 10, 10, 10, 1, 0, 32, 32);
		expect(result.x).toBe(13); // 10 + 1*3
		expect(result.z).toBe(10);
	});

	it("clamps predicted position to board bounds", () => {
		// Target at (30, 30) heading right and down in a 32x32 board
		const result = computeInterceptTarget(0, 0, 30, 30, 1, 1, 32, 32);
		expect(result.x).toBeLessThanOrEqual(31);
		expect(result.z).toBeLessThanOrEqual(31);
	});

	it("limits look-ahead to 4 turns max", () => {
		// Very far away: dist = 20+20 = 40, lookAhead = min(4, floor(40/3)) = 4
		const result = computeInterceptTarget(0, 0, 20, 20, 1, 0, 32, 32);
		expect(result.x).toBe(24); // 20 + 1*4
	});

	it("predicts at least 1 turn ahead for close targets", () => {
		// Close target: dist = 3+0 = 3, lookAhead = max(1, floor(3/3)) = 1
		const result = computeInterceptTarget(5, 5, 8, 5, 1, 0, 32, 32);
		expect(result.x).toBe(9); // 8 + 1*1
	});

	it("handles diagonal movement", () => {
		const result = computeInterceptTarget(0, 0, 10, 10, 1, 1, 32, 32);
		// lookAhead = floor(20/3) = 6 → clamped to 4
		expect(result.x).toBe(14); // 10 + 1*4
		expect(result.z).toBe(14); // 10 + 1*4
	});
});

describe("shouldUsePursuit", () => {
	it("returns false when target is stationary", () => {
		expect(shouldUsePursuit(0, 0, 10, 10, 0, 0)).toBe(false);
	});

	it("returns false when target is adjacent (dist <= 2)", () => {
		expect(shouldUsePursuit(5, 5, 6, 5, 1, 0)).toBe(false);
	});

	it("returns true when target is fleeing (moving away)", () => {
		// Chaser at (0,0), target at (5,5) heading right (+1,0)
		// toChase = (-5,-5), heading = (1,0), dot = -5 < 0 → fleeing
		expect(shouldUsePursuit(0, 0, 5, 5, 1, 0)).toBe(true);
	});

	it("returns false when target is moving toward chaser", () => {
		// Chaser at (10,10), target at (5,5) heading right (+1,0)
		// toChase = (5,5), heading = (1,0), dot = 5 > 0 → approaching
		expect(shouldUsePursuit(10, 10, 5, 5, 1, 0)).toBe(false);
	});

	it("returns true when target is moving perpendicular", () => {
		// Chaser at (0,5), target at (5,5) heading up (0,-1)
		// toChase = (-5,0), heading = (0,-1), dot = 0 → perpendicular
		expect(shouldUsePursuit(0, 5, 5, 5, 0, -1)).toBe(true);
	});

	it("returns false when close even if fleeing", () => {
		// Chaser at (4,5), target at (5,5) heading right — dist=1
		expect(shouldUsePursuit(4, 5, 5, 5, 1, 0)).toBe(false);
	});
});
