/**
 * Tests for hdriConfig — HDRI preset selection and configuration.
 *
 * Pure functions — no mocking needed.
 */

import {
	HDRI_PRESETS,
	DEFAULT_HDRI,
	getHdriForStormIntensity,
	type HdriPresetKey,
} from "../hdriConfig";

describe("HDRI_PRESETS", () => {
	it("has at least 5 presets", () => {
		expect(Object.keys(HDRI_PRESETS).length).toBeGreaterThanOrEqual(5);
	});

	it("every preset has required fields", () => {
		for (const [key, preset] of Object.entries(HDRI_PRESETS)) {
			expect(preset.label).toBeTruthy();
			expect(preset.file).toBeTruthy();
			expect(typeof preset.backgroundIntensity).toBe("number");
			expect(typeof preset.environmentIntensity).toBe("number");
			// Sanity check: intensities are in reasonable range
			expect(preset.backgroundIntensity).toBeGreaterThanOrEqual(0);
			expect(preset.backgroundIntensity).toBeLessThanOrEqual(2);
			expect(preset.environmentIntensity).toBeGreaterThanOrEqual(0);
			expect(preset.environmentIntensity).toBeLessThanOrEqual(2);
		}
	});

	it("every preset file path is a string starting with /", () => {
		for (const preset of Object.values(HDRI_PRESETS)) {
			expect(preset.file.startsWith("/")).toBe(true);
		}
	});

	it("storm_overcast preset exists", () => {
		expect(HDRI_PRESETS.storm_overcast).toBeDefined();
	});

	it("storm_dramatic preset exists", () => {
		expect(HDRI_PRESETS.storm_dramatic).toBeDefined();
	});
});

describe("DEFAULT_HDRI", () => {
	it("is a valid preset key", () => {
		expect(HDRI_PRESETS[DEFAULT_HDRI]).toBeDefined();
	});

	it("is storm_overcast (primary aesthetic)", () => {
		expect(DEFAULT_HDRI).toBe("storm_overcast");
	});
});

describe("getHdriForStormIntensity", () => {
	it("returns storm_dramatic for intensity >= 1.2", () => {
		expect(getHdriForStormIntensity(1.2)).toBe("storm_dramatic");
		expect(getHdriForStormIntensity(1.5)).toBe("storm_dramatic");
	});

	it("returns storm_overcast for intensity 0.9 to 1.2", () => {
		expect(getHdriForStormIntensity(0.9)).toBe("storm_overcast");
		expect(getHdriForStormIntensity(1.0)).toBe("storm_overcast");
		expect(getHdriForStormIntensity(1.19)).toBe("storm_overcast");
	});

	it("returns overcast_heavy for intensity 0.6 to 0.9", () => {
		expect(getHdriForStormIntensity(0.6)).toBe("overcast_heavy");
		expect(getHdriForStormIntensity(0.75)).toBe("overcast_heavy");
	});

	it("returns evening_cloudy for intensity 0.3 to 0.6", () => {
		expect(getHdriForStormIntensity(0.3)).toBe("evening_cloudy");
		expect(getHdriForStormIntensity(0.45)).toBe("evening_cloudy");
	});

	it("returns day_industrial for intensity below 0.3", () => {
		expect(getHdriForStormIntensity(0)).toBe("day_industrial_003");
		expect(getHdriForStormIntensity(0.1)).toBe("day_industrial_003");
		expect(getHdriForStormIntensity(0.29)).toBe("day_industrial_003");
	});

	it("always returns a valid preset key", () => {
		const intensities = [0, 0.1, 0.3, 0.6, 0.9, 1.2, 1.5];
		for (const i of intensities) {
			const key = getHdriForStormIntensity(i);
			expect(HDRI_PRESETS[key as HdriPresetKey]).toBeDefined();
		}
	});

	it("handles negative intensity (no storm)", () => {
		const key = getHdriForStormIntensity(-1);
		expect(HDRI_PRESETS[key as HdriPresetKey]).toBeDefined();
	});
});
