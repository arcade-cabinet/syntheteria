import { describe, expect, it } from "vitest";
import {
	gradientVisForDistance,
	MAX_GRADIENT_DIST,
} from "../FogOfWarRenderer";

describe("fog gradient", () => {
	describe("gradientVisForDistance", () => {
		it("returns 255 for distance 0 (explored tile)", () => {
			expect(gradientVisForDistance(0)).toBe(255);
		});

		it("returns 153 at distance 1 (near edge — 40% fog)", () => {
			expect(gradientVisForDistance(1)).toBe(153);
		});

		it("returns 102 at distance 3 (60% fog)", () => {
			expect(gradientVisForDistance(3)).toBe(102);
		});

		it("decreases monotonically from distance 1 to 8", () => {
			let prev = gradientVisForDistance(1);
			for (let d = 2; d <= 8; d++) {
				const curr = gradientVisForDistance(d);
				expect(curr).toBeLessThanOrEqual(prev);
				prev = curr;
			}
		});

		it("returns 38 at distance 8 (85% fog)", () => {
			expect(gradientVisForDistance(8)).toBe(38);
		});

		it("returns 0 for distances beyond MAX_GRADIENT_DIST", () => {
			expect(gradientVisForDistance(MAX_GRADIENT_DIST + 1)).toBe(0);
			expect(gradientVisForDistance(20)).toBe(0);
		});

		it("never returns negative values", () => {
			for (let d = 0; d <= 50; d++) {
				expect(gradientVisForDistance(d)).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("gradient bands match spec", () => {
		it("dist 1-3 maps to 40-60% fog (vis 153-102)", () => {
			for (let d = 1; d <= 3; d++) {
				const vis = gradientVisForDistance(d);
				expect(vis).toBeGreaterThanOrEqual(102);
				expect(vis).toBeLessThanOrEqual(153);
			}
		});

		it("dist 4-8 maps to 60-85% fog (vis 102-38)", () => {
			for (let d = 4; d <= 8; d++) {
				const vis = gradientVisForDistance(d);
				expect(vis).toBeGreaterThanOrEqual(38);
				expect(vis).toBeLessThanOrEqual(102);
			}
		});

		it("transition at boundary dist 3→4 is continuous", () => {
			const at3 = gradientVisForDistance(3);
			const at4 = gradientVisForDistance(4);
			// Both should be 102 at the boundary
			expect(at3).toBe(102);
			expect(at4).toBe(102);
		});
	});
});
