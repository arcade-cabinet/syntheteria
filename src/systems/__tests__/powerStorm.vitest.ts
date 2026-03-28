/**
 * Tests for storm intensity clamping (US-3.2 / US-6.2).
 */

import { describe, expect, it } from "vitest";
import { getStormIntensity, powerSystem } from "../power";

describe("storm intensity (US-3.2 / US-6.2)", () => {
	it("storm intensity stays within 0.5-1.0 range", () => {
		// Run power system for many ticks and check intensity
		for (let tick = 0; tick < 500; tick++) {
			powerSystem(tick);
			const intensity = getStormIntensity();
			expect(intensity).toBeGreaterThanOrEqual(0.5);
			expect(intensity).toBeLessThanOrEqual(1.0);
		}
	});

	it("storm intensity never exceeds 100%", () => {
		// The old code had stormIntensity = Math.min(1.5, ...) which allowed > 1.0
		for (let tick = 0; tick < 1000; tick++) {
			powerSystem(tick);
			const intensity = getStormIntensity();
			expect(intensity).toBeLessThanOrEqual(1.0);
		}
	});
});
