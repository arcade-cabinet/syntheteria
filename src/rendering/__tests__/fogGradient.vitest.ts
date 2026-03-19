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

		it("returns 178 at distance 1 (near edge — 30% fog)", () => {
			expect(gradientVisForDistance(1)).toBe(178);
		});

		it("returns 102 at distance 4 (60% fog)", () => {
			expect(gradientVisForDistance(4)).toBe(102);
		});

		it("decreases monotonically from distance 1 to 16", () => {
			let prev = gradientVisForDistance(1);
			for (let d = 2; d <= 16; d++) {
				const curr = gradientVisForDistance(d);
				expect(curr).toBeLessThanOrEqual(prev);
				prev = curr;
			}
		});

		it("returns 38 at distance 12 (85% fog)", () => {
			expect(gradientVisForDistance(12)).toBe(38);
		});

		it("returns 15 for distances beyond MAX_GRADIENT_DIST (never fully black)", () => {
			expect(gradientVisForDistance(MAX_GRADIENT_DIST + 1)).toBe(15);
			expect(gradientVisForDistance(50)).toBe(15);
		});

		it("never returns negative values", () => {
			for (let d = 0; d <= 50; d++) {
				expect(gradientVisForDistance(d)).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("gradient bands match spec", () => {
		it("dist 1-4 maps to 30-60% fog (vis 178-102)", () => {
			for (let d = 1; d <= 4; d++) {
				const vis = gradientVisForDistance(d);
				expect(vis).toBeGreaterThanOrEqual(102);
				expect(vis).toBeLessThanOrEqual(178);
			}
		});

		it("dist 5-12 maps to 60-85% fog (vis 102-38)", () => {
			for (let d = 5; d <= 12; d++) {
				const vis = gradientVisForDistance(d);
				expect(vis).toBeGreaterThanOrEqual(38);
				expect(vis).toBeLessThanOrEqual(102);
			}
		});

		it("transition at boundary dist 4→5 is continuous", () => {
			const at4 = gradientVisForDistance(4);
			const at5 = gradientVisForDistance(5);
			// Both should be 102 at the boundary
			expect(at4).toBe(102);
			expect(at5).toBe(102);
		});

		it("MAX_GRADIENT_DIST is 16", () => {
			expect(MAX_GRADIENT_DIST).toBe(16);
		});

		it("tiles beyond gradient still get ambient glow (vis=15)", () => {
			expect(gradientVisForDistance(20)).toBe(15);
			expect(gradientVisForDistance(100)).toBe(15);
		});
	});
});
