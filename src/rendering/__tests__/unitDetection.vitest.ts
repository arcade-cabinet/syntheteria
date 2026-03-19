import { describe, expect, it } from "vitest";
import { isUnitDetected } from "../unitDetection";

describe("unitDetection", () => {
	describe("isUnitDetected", () => {
		const scanners = [
			{ x: 5, z: 5, range: 3 },
			{ x: 20, z: 20, range: 5 },
		];

		it("detects a unit within scan range (Manhattan)", () => {
			expect(isUnitDetected(5, 5, scanners)).toBe(true); // distance 0
			expect(isUnitDetected(6, 7, scanners)).toBe(true); // distance 3
			expect(isUnitDetected(3, 5, scanners)).toBe(true); // distance 2
		});

		it("does not detect a unit outside all scan ranges", () => {
			expect(isUnitDetected(0, 0, scanners)).toBe(false); // far from both
			expect(isUnitDetected(9, 5, scanners)).toBe(false); // distance 4 from first, far from second
		});

		it("detects within second scanner range", () => {
			expect(isUnitDetected(22, 23, scanners)).toBe(true); // distance 5 from scanner 2
			expect(isUnitDetected(25, 25, scanners)).toBe(false); // distance 10 from scanner 2
		});

		it("returns false for empty scanner list", () => {
			expect(isUnitDetected(5, 5, [])).toBe(false);
		});

		it("boundary: exactly at scan range is detected", () => {
			expect(isUnitDetected(8, 5, scanners)).toBe(true); // distance 3 = range
		});

		it("boundary: one tile outside scan range is not detected", () => {
			expect(isUnitDetected(9, 5, scanners)).toBe(false); // distance 4 > range 3
		});
	});
});
