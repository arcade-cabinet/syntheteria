/**
 * Unit tests for the screen shake system.
 *
 * Tests cover:
 * - Preset factory methods return correct ShakeConfig values
 * - triggerShake returns unique IDs and creates active shakes
 * - triggerShakePreset dispatches to registered presets
 * - updateShakes advances elapsed time and computes output
 * - Decay curves: linear, exponential, none
 * - Multiple overlapping shakes combine additively
 * - Finished shakes are removed automatically
 * - cancelShake / cancelAllShakes
 * - Screen flash (triggerFlash, decay, color)
 * - Global shake multiplier (setShakeMultiplier / getShakeMultiplier)
 * - Output clamping prevents extreme values
 * - reset() clears all state
 */

import {
	type ShakeConfig,
	type ShakeOutput,
	cancelAllShakes,
	cancelShake,
	createCompressionShake,
	createCubeDropShake,
	createDamageShake,
	createExplosionShake,
	createFootstepShake,
	createMiningShake,
	getActiveShakeCount,
	getShakeMultiplier,
	reset,
	setShakeMultiplier,
	triggerFlash,
	triggerShake,
	triggerShakePreset,
	updateShakes,
} from "../screenShake";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Preset factory methods
// ---------------------------------------------------------------------------

describe("preset factory methods", () => {
	it("createCompressionShake returns valid ShakeConfig", () => {
		const c = createCompressionShake();
		expect(c.intensity).toBeGreaterThan(0);
		expect(c.intensity).toBeLessThanOrEqual(1);
		expect(c.frequency).toBeGreaterThan(0);
		expect(c.duration).toBeGreaterThan(0);
		expect(["linear", "exponential", "none"]).toContain(c.decayType);
	});

	it("createDamageShake is high-intensity, short, exponential", () => {
		const c = createDamageShake();
		expect(c.intensity).toBeGreaterThanOrEqual(0.3);
		expect(c.duration).toBeLessThanOrEqual(0.5);
		expect(c.decayType).toBe("exponential");
	});

	it("createExplosionShake is high-intensity, longer, linear", () => {
		const c = createExplosionShake();
		expect(c.intensity).toBeGreaterThanOrEqual(0.7);
		expect(c.duration).toBeGreaterThanOrEqual(0.8);
		expect(c.decayType).toBe("linear");
	});

	it("createFootstepShake is very low intensity", () => {
		const c = createFootstepShake();
		expect(c.intensity).toBeLessThanOrEqual(0.05);
		expect(c.duration).toBeLessThanOrEqual(0.2);
	});

	it("createMiningShake is medium intensity", () => {
		const c = createMiningShake();
		expect(c.intensity).toBeGreaterThan(0.1);
		expect(c.intensity).toBeLessThan(0.5);
	});

	it("createCubeDropShake is a brief thud", () => {
		const c = createCubeDropShake();
		expect(c.intensity).toBeGreaterThan(0);
		expect(c.duration).toBeLessThanOrEqual(0.3);
		expect(c.decayType).toBe("exponential");
	});

	it("each preset returns a fresh object (not shared reference)", () => {
		const a = createDamageShake();
		const b = createDamageShake();
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});
});

// ---------------------------------------------------------------------------
// triggerShake
// ---------------------------------------------------------------------------

describe("triggerShake", () => {
	it("returns a string ID", () => {
		const id = triggerShake(createDamageShake());
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	it("returns unique IDs for each call", () => {
		const id1 = triggerShake(createDamageShake());
		const id2 = triggerShake(createDamageShake());
		expect(id1).not.toBe(id2);
	});

	it("increments active shake count", () => {
		expect(getActiveShakeCount()).toBe(0);
		triggerShake(createDamageShake());
		expect(getActiveShakeCount()).toBe(1);
		triggerShake(createExplosionShake());
		expect(getActiveShakeCount()).toBe(2);
	});

	it("copies the config (mutation-safe)", () => {
		const config = createDamageShake();
		triggerShake(config);
		config.intensity = 999;
		// The shake should still use the original intensity
		const output = updateShakes(0.001);
		expect(Math.abs(output.offsetX)).toBeLessThan(10);
	});
});

// ---------------------------------------------------------------------------
// triggerShakePreset
// ---------------------------------------------------------------------------

describe("triggerShakePreset", () => {
	it("triggers a shake from a named preset", () => {
		const id = triggerShakePreset("damage");
		expect(typeof id).toBe("string");
		expect(getActiveShakeCount()).toBe(1);
	});

	it("throws for unknown preset name", () => {
		expect(() => triggerShakePreset("nonexistent")).toThrow(
			/unknown shake preset/i,
		);
	});

	it("supports all built-in presets", () => {
		const names = [
			"compression",
			"damage",
			"explosion",
			"footstep",
			"mining",
			"cubeDrop",
		];
		for (const name of names) {
			reset();
			const id = triggerShakePreset(name);
			expect(typeof id).toBe("string");
			expect(getActiveShakeCount()).toBe(1);
		}
	});
});

// ---------------------------------------------------------------------------
// updateShakes — basic output
// ---------------------------------------------------------------------------

describe("updateShakes — basic output", () => {
	it("returns zero output when no shakes are active", () => {
		const output = updateShakes(0.016);
		expect(output.offsetX).toBe(0);
		expect(output.offsetY).toBe(0);
		expect(output.rotation).toBe(0);
		expect(output.flashIntensity).toBe(0);
	});

	it("returns non-zero offsets when a shake is active", () => {
		triggerShake(createDamageShake());
		const output = updateShakes(0.01);
		const magnitude = Math.abs(output.offsetX) + Math.abs(output.offsetY);
		expect(magnitude).toBeGreaterThan(0);
	});

	it("returns ShakeOutput with all expected fields", () => {
		triggerShake(createDamageShake());
		const output = updateShakes(0.01);
		expect(output).toHaveProperty("offsetX");
		expect(output).toHaveProperty("offsetY");
		expect(output).toHaveProperty("rotation");
		expect(output).toHaveProperty("flashIntensity");
		expect(output).toHaveProperty("flashColor");
		expect(typeof output.flashColor).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// Decay curves
// ---------------------------------------------------------------------------

describe("decay curves", () => {
	it("linear decay reduces intensity over time", () => {
		const config: ShakeConfig = {
			intensity: 1.0,
			frequency: 10,
			duration: 1.0,
			decayType: "linear",
		};
		triggerShake(config);

		const earlyOutput = updateShakes(0.1);
		const earlyMag =
			Math.abs(earlyOutput.offsetX) + Math.abs(earlyOutput.offsetY);

		reset();
		triggerShake(config);
		// Advance to near the end
		const lateOutput = updateShakes(0.9);
		const lateMag =
			Math.abs(lateOutput.offsetX) + Math.abs(lateOutput.offsetY);

		// Early shake should be stronger than late shake
		expect(earlyMag).toBeGreaterThan(lateMag);
	});

	it("exponential decay reduces faster than linear", () => {
		const linearConfig: ShakeConfig = {
			intensity: 1.0,
			frequency: 10,
			duration: 2.0,
			decayType: "linear",
		};
		const expConfig: ShakeConfig = {
			intensity: 1.0,
			frequency: 10,
			duration: 2.0,
			decayType: "exponential",
		};

		// Measure at t=1.0 (halfway for linear = 0.5, exp(-3) ~ 0.05)
		triggerShake(expConfig);
		const expOutput = updateShakes(1.0);
		const expMag =
			Math.abs(expOutput.offsetX) + Math.abs(expOutput.offsetY);

		reset();
		triggerShake(linearConfig);
		const linOutput = updateShakes(1.0);
		const linMag =
			Math.abs(linOutput.offsetX) + Math.abs(linOutput.offsetY);

		// Exponential should be significantly weaker at halfway point
		expect(expMag).toBeLessThan(linMag);
	});

	it("none decay maintains full intensity throughout", () => {
		const config: ShakeConfig = {
			intensity: 0.5,
			frequency: 10,
			duration: 2.0,
			decayType: "none",
		};

		triggerShake(config);
		// Sample at two time points — both should have the same effective intensity range
		// We check that the shake is still producing output near the end
		updateShakes(0.1);
		// Advance further
		const output = updateShakes(1.5);
		const mag = Math.abs(output.offsetX) + Math.abs(output.offsetY);
		expect(mag).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Multiple overlapping shakes
// ---------------------------------------------------------------------------

describe("multiple overlapping shakes", () => {
	it("combines two shakes additively", () => {
		const config: ShakeConfig = {
			intensity: 0.5,
			frequency: 10,
			duration: 1.0,
			decayType: "none",
		};

		// Single shake
		triggerShake(config);
		const singleOutput = updateShakes(0.05);
		const singleMag =
			Math.abs(singleOutput.offsetX) + Math.abs(singleOutput.offsetY);

		reset();

		// Two shakes
		triggerShake(config);
		triggerShake(config);
		const doubleOutput = updateShakes(0.05);
		const doubleMag =
			Math.abs(doubleOutput.offsetX) + Math.abs(doubleOutput.offsetY);

		// Double should generally produce larger combined magnitude
		// (they might partially cancel on some axes, so we just check it's different)
		expect(doubleMag).not.toBe(singleMag);
	});

	it("each shake is tracked independently", () => {
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 0.5,
			decayType: "linear",
		});
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 2.0,
			decayType: "linear",
		});

		expect(getActiveShakeCount()).toBe(2);

		// After 0.6s, the short one should be gone
		updateShakes(0.6);
		expect(getActiveShakeCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Finished shake removal
// ---------------------------------------------------------------------------

describe("finished shake removal", () => {
	it("removes a shake when elapsed >= duration", () => {
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 0.5,
			decayType: "linear",
		});
		expect(getActiveShakeCount()).toBe(1);

		updateShakes(0.5);
		expect(getActiveShakeCount()).toBe(0);
	});

	it("removes shake when delta overshoots duration", () => {
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 0.3,
			decayType: "linear",
		});

		updateShakes(10.0);
		expect(getActiveShakeCount()).toBe(0);
	});

	it("returns zero output after all shakes finish", () => {
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 0.1,
			decayType: "linear",
		});

		updateShakes(0.2);
		const output = updateShakes(0.016);

		expect(output.offsetX).toBe(0);
		expect(output.offsetY).toBe(0);
		expect(output.rotation).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// cancelShake / cancelAllShakes
// ---------------------------------------------------------------------------

describe("cancelShake", () => {
	it("removes a specific shake by ID", () => {
		const id1 = triggerShake(createDamageShake());
		const id2 = triggerShake(createExplosionShake());
		expect(getActiveShakeCount()).toBe(2);

		cancelShake(id1);
		expect(getActiveShakeCount()).toBe(1);

		// The remaining shake should still be the explosion
		cancelShake(id2);
		expect(getActiveShakeCount()).toBe(0);
	});

	it("does nothing for an unknown ID", () => {
		triggerShake(createDamageShake());
		cancelShake("shake_nonexistent");
		expect(getActiveShakeCount()).toBe(1);
	});
});

describe("cancelAllShakes", () => {
	it("removes all active shakes", () => {
		triggerShake(createDamageShake());
		triggerShake(createExplosionShake());
		triggerShake(createMiningShake());
		expect(getActiveShakeCount()).toBe(3);

		cancelAllShakes();
		expect(getActiveShakeCount()).toBe(0);
	});

	it("returns zero output after cancel", () => {
		triggerShake(createExplosionShake());
		cancelAllShakes();

		const output = updateShakes(0.016);
		expect(output.offsetX).toBe(0);
		expect(output.offsetY).toBe(0);
		expect(output.rotation).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Screen flash
// ---------------------------------------------------------------------------

describe("triggerFlash", () => {
	it("produces flash intensity in output", () => {
		triggerFlash("#ff0000", 0.8, 0.5);
		const output = updateShakes(0.01);
		expect(output.flashIntensity).toBeGreaterThan(0);
	});

	it("sets correct flash color", () => {
		triggerFlash("#ff0000", 0.8, 0.5);
		const output = updateShakes(0.01);
		expect(output.flashColor).toBe("#ff0000");
	});

	it("flash decays linearly to zero", () => {
		triggerFlash("#ffffff", 1.0, 0.5);
		const earlyOutput = updateShakes(0.05);
		const earlyFlash = earlyOutput.flashIntensity;

		const lateOutput = updateShakes(0.4);
		const lateFlash = lateOutput.flashIntensity;

		expect(earlyFlash).toBeGreaterThan(lateFlash);
	});

	it("flash intensity reaches zero after duration", () => {
		triggerFlash("#ffffff", 1.0, 0.3);
		updateShakes(0.35);
		const output = updateShakes(0.016);
		expect(output.flashIntensity).toBe(0);
	});

	it("flash does not exceed 1.0", () => {
		triggerFlash("#ffffff", 5.0, 0.5);
		const output = updateShakes(0.001);
		expect(output.flashIntensity).toBeLessThanOrEqual(1.0);
	});
});

// ---------------------------------------------------------------------------
// Global shake multiplier
// ---------------------------------------------------------------------------

describe("setShakeMultiplier / getShakeMultiplier", () => {
	it("defaults to 1.0", () => {
		expect(getShakeMultiplier()).toBe(1.0);
	});

	it("scales shake output intensity", () => {
		const config: ShakeConfig = {
			intensity: 0.5,
			frequency: 10,
			duration: 1.0,
			decayType: "none",
		};

		// Full multiplier
		triggerShake(config);
		const fullOutput = updateShakes(0.05);
		const fullMag =
			Math.abs(fullOutput.offsetX) + Math.abs(fullOutput.offsetY);

		reset();

		// Half multiplier
		setShakeMultiplier(0.5);
		triggerShake(config);
		const halfOutput = updateShakes(0.05);
		const halfMag =
			Math.abs(halfOutput.offsetX) + Math.abs(halfOutput.offsetY);

		expect(halfMag).toBeCloseTo(fullMag * 0.5, 4);
	});

	it("multiplier of 0 produces zero output", () => {
		setShakeMultiplier(0);
		triggerShake(createExplosionShake());
		const output = updateShakes(0.05);
		expect(output.offsetX).toBe(0);
		expect(output.offsetY).toBe(0);
		expect(output.rotation).toBe(0);
	});

	it("clamps negative multiplier to 0", () => {
		setShakeMultiplier(-1);
		expect(getShakeMultiplier()).toBe(0);
	});

	it("allows multiplier greater than 1", () => {
		setShakeMultiplier(2.0);
		expect(getShakeMultiplier()).toBe(2.0);
	});
});

// ---------------------------------------------------------------------------
// Output clamping
// ---------------------------------------------------------------------------

describe("output clamping", () => {
	it("caps combined offset to prevent extreme values", () => {
		// Trigger many high-intensity shakes simultaneously
		for (let i = 0; i < 20; i++) {
			triggerShake({
				intensity: 1.0,
				frequency: 10,
				duration: 2.0,
				decayType: "none",
			});
		}

		const output = updateShakes(0.05);
		expect(Math.abs(output.offsetX)).toBeLessThanOrEqual(2.0);
		expect(Math.abs(output.offsetY)).toBeLessThanOrEqual(2.0);
	});

	it("caps combined rotation", () => {
		for (let i = 0; i < 20; i++) {
			triggerShake({
				intensity: 1.0,
				frequency: 10,
				duration: 2.0,
				decayType: "none",
			});
		}

		const output = updateShakes(0.05);
		expect(Math.abs(output.rotation)).toBeLessThanOrEqual(0.15);
	});
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all active shakes", () => {
		triggerShake(createDamageShake());
		triggerShake(createExplosionShake());
		reset();
		expect(getActiveShakeCount()).toBe(0);
	});

	it("resets shake ID counter", () => {
		triggerShake(createDamageShake());
		triggerShake(createDamageShake());
		reset();

		const id = triggerShake(createDamageShake());
		expect(id).toBe("shake_0");
	});

	it("resets global multiplier to 1.0", () => {
		setShakeMultiplier(0.5);
		reset();
		expect(getShakeMultiplier()).toBe(1.0);
	});

	it("clears active flash", () => {
		triggerFlash("#ff0000", 1.0, 1.0);
		reset();
		const output = updateShakes(0.01);
		expect(output.flashIntensity).toBe(0);
	});

	it("allows fresh shakes after reset", () => {
		triggerShake(createDamageShake());
		reset();

		triggerShake(createExplosionShake());
		expect(getActiveShakeCount()).toBe(1);
		const output = updateShakes(0.05);
		expect(
			Math.abs(output.offsetX) + Math.abs(output.offsetY),
		).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getActiveShakeCount
// ---------------------------------------------------------------------------

describe("getActiveShakeCount", () => {
	it("returns 0 when no shakes are active", () => {
		expect(getActiveShakeCount()).toBe(0);
	});

	it("tracks additions", () => {
		triggerShake(createDamageShake());
		expect(getActiveShakeCount()).toBe(1);
	});

	it("tracks removals after expiry", () => {
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 0.1,
			decayType: "linear",
		});
		triggerShake({
			intensity: 0.5,
			frequency: 10,
			duration: 1.0,
			decayType: "linear",
		});

		updateShakes(0.15);
		expect(getActiveShakeCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles zero delta gracefully", () => {
		triggerShake(createDamageShake());
		const output = updateShakes(0);
		expect(output).toBeDefined();
		expect(getActiveShakeCount()).toBe(1);
	});

	it("handles very large delta", () => {
		triggerShake(createDamageShake());
		updateShakes(1000);
		expect(getActiveShakeCount()).toBe(0);
	});

	it("handles very small intensity", () => {
		triggerShake({
			intensity: 0.0001,
			frequency: 10,
			duration: 1.0,
			decayType: "none",
		});
		const output = updateShakes(0.05);
		expect(Math.abs(output.offsetX)).toBeLessThan(0.01);
		expect(Math.abs(output.offsetY)).toBeLessThan(0.01);
	});

	it("flash and shake are independent", () => {
		triggerFlash("#ff0000", 1.0, 0.5);
		const output = updateShakes(0.01);
		// Flash should be active, but no shake offsets
		expect(output.flashIntensity).toBeGreaterThan(0);
		expect(output.offsetX).toBe(0);
		expect(output.offsetY).toBe(0);
	});
});
