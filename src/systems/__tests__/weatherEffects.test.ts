/**
 * Unit tests for weatherEffects — gameplay modifier bridge for weather states.
 *
 * Tests cover:
 * - getWeatherModifiers for every preset
 * - applyMovementModifier
 * - applyAccuracyModifier
 * - applyCubeDamage
 * - getEffectivePerceptionRange
 * - isLightningBoosted
 * - getWeatherHazardWarning
 * - getVisibilityColor
 * - Unknown / edge-case weather strings
 * - reset()
 */

import {
	getWeatherModifiers,
	applyMovementModifier,
	applyAccuracyModifier,
	applyCubeDamage,
	getEffectivePerceptionRange,
	isLightningBoosted,
	getWeatherHazardWarning,
	getVisibilityColor,
	reset,
	_setOverridePresets,
} from "../weatherEffects";
import type { WeatherPreset } from "../weatherEffects";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// getWeatherModifiers — preset values
// ---------------------------------------------------------------------------

describe("getWeatherModifiers", () => {
	it("clear — all neutral, full visibility, no damage", () => {
		const m = getWeatherModifiers("clear");
		expect(m.movementSpeedMult).toBe(1.0);
		expect(m.visibilityRange).toBe(500);
		expect(m.perceptionRangeMult).toBe(1.0);
		expect(m.lightningChanceMult).toBe(1.0);
		expect(m.combatAccuracyMult).toBe(1.0);
		expect(m.harvestSpeedMult).toBe(1.0);
		expect(m.cubeExposureDamagePerSec).toBe(0);
		expect(m.ambientSoundPreset).toBe("clear");
		expect(m.skyboxTint).toBe("#ffffff");
		expect(m.particleDensity).toBe(0);
	});

	it("cloudy — slight visibility reduction, no other effects", () => {
		const m = getWeatherModifiers("cloudy");
		expect(m.movementSpeedMult).toBe(1.0);
		expect(m.visibilityRange).toBeLessThan(500);
		expect(m.combatAccuracyMult).toBe(1.0);
		expect(m.cubeExposureDamagePerSec).toBe(0);
	});

	it("rain — 0.8 speed, reduced visibility, 0.9 accuracy, 0.1 dmg/s", () => {
		const m = getWeatherModifiers("rain");
		expect(m.movementSpeedMult).toBe(0.8);
		expect(m.visibilityRange).toBeLessThan(500);
		expect(m.combatAccuracyMult).toBe(0.9);
		expect(m.cubeExposureDamagePerSec).toBe(0.1);
	});

	it("storm — 0.6 speed, 0.4-ish visibility, 0.7 accuracy, 3x lightning, 0.5 dmg/s", () => {
		const m = getWeatherModifiers("storm");
		expect(m.movementSpeedMult).toBe(0.6);
		expect(m.visibilityRange).toBe(200);
		expect(m.combatAccuracyMult).toBe(0.7);
		expect(m.lightningChanceMult).toBe(3.0);
		expect(m.cubeExposureDamagePerSec).toBe(0.5);
	});

	it("fog — 1.0 speed, 0.3-ish visibility, 0.5 perception, 0.8 accuracy", () => {
		const m = getWeatherModifiers("fog");
		expect(m.movementSpeedMult).toBe(1.0);
		expect(m.visibilityRange).toBe(150);
		expect(m.perceptionRangeMult).toBe(0.5);
		expect(m.combatAccuracyMult).toBe(0.8);
		expect(m.cubeExposureDamagePerSec).toBe(0);
	});

	it("acid_rain — 0.7 speed, 1.0 dmg/s, corrosion", () => {
		const m = getWeatherModifiers("acid_rain");
		expect(m.movementSpeedMult).toBe(0.7);
		expect(m.cubeExposureDamagePerSec).toBe(1.0);
		expect(m.visibilityRange).toBe(250);
	});

	it("unknown weather falls back to clear", () => {
		const m = getWeatherModifiers("tornado");
		expect(m.movementSpeedMult).toBe(1.0);
		expect(m.visibilityRange).toBe(500);
		expect(m.cubeExposureDamagePerSec).toBe(0);
	});

	it("empty string falls back to clear", () => {
		const m = getWeatherModifiers("");
		expect(m.movementSpeedMult).toBe(1.0);
	});

	it("returns a copy — mutating result does not affect presets", () => {
		const m1 = getWeatherModifiers("storm");
		m1.movementSpeedMult = 999;
		const m2 = getWeatherModifiers("storm");
		expect(m2.movementSpeedMult).toBe(0.6);
	});
});

// ---------------------------------------------------------------------------
// applyMovementModifier
// ---------------------------------------------------------------------------

describe("applyMovementModifier", () => {
	it("clear does not modify speed", () => {
		expect(applyMovementModifier(10, "clear")).toBe(10);
	});

	it("rain reduces speed to 80%", () => {
		expect(applyMovementModifier(10, "rain")).toBeCloseTo(8.0);
	});

	it("storm reduces speed to 60%", () => {
		expect(applyMovementModifier(10, "storm")).toBeCloseTo(6.0);
	});

	it("fog does not reduce speed", () => {
		expect(applyMovementModifier(10, "fog")).toBe(10);
	});

	it("acid_rain reduces speed to 70%", () => {
		expect(applyMovementModifier(10, "acid_rain")).toBeCloseTo(7.0);
	});

	it("zero base speed stays zero", () => {
		expect(applyMovementModifier(0, "storm")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// applyAccuracyModifier
// ---------------------------------------------------------------------------

describe("applyAccuracyModifier", () => {
	it("clear does not modify accuracy", () => {
		expect(applyAccuracyModifier(1.0, "clear")).toBe(1.0);
	});

	it("rain reduces accuracy to 90%", () => {
		expect(applyAccuracyModifier(1.0, "rain")).toBeCloseTo(0.9);
	});

	it("storm reduces accuracy to 70%", () => {
		expect(applyAccuracyModifier(1.0, "storm")).toBeCloseTo(0.7);
	});

	it("fog reduces accuracy to 80%", () => {
		expect(applyAccuracyModifier(1.0, "fog")).toBeCloseTo(0.8);
	});

	it("stacks with non-1.0 base accuracy", () => {
		// base 0.8 * storm 0.7 = 0.56
		expect(applyAccuracyModifier(0.8, "storm")).toBeCloseTo(0.56);
	});
});

// ---------------------------------------------------------------------------
// applyCubeDamage
// ---------------------------------------------------------------------------

describe("applyCubeDamage", () => {
	it("clear weather deals zero damage", () => {
		expect(applyCubeDamage(10, true, "clear", 1.0)).toBe(0);
	});

	it("storm deals 0.5 dmg/s per exposed cube", () => {
		// 5 cubes * 0.5 dmg/s * 2s = 5.0
		expect(applyCubeDamage(5, true, "storm", 2.0)).toBeCloseTo(5.0);
	});

	it("acid_rain deals 1.0 dmg/s per exposed cube", () => {
		// 3 cubes * 1.0 dmg/s * 1s = 3.0
		expect(applyCubeDamage(3, true, "acid_rain", 1.0)).toBeCloseTo(3.0);
	});

	it("rain deals 0.1 dmg/s per exposed cube", () => {
		// 10 cubes * 0.1 * 5s = 5.0
		expect(applyCubeDamage(10, true, "rain", 5.0)).toBeCloseTo(5.0);
	});

	it("covered cubes take no damage", () => {
		expect(applyCubeDamage(10, false, "storm", 10)).toBe(0);
	});

	it("zero cubes means zero damage", () => {
		expect(applyCubeDamage(0, true, "acid_rain", 1.0)).toBe(0);
	});

	it("negative delta returns zero", () => {
		expect(applyCubeDamage(5, true, "storm", -1)).toBe(0);
	});

	it("zero delta returns zero", () => {
		expect(applyCubeDamage(5, true, "storm", 0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getEffectivePerceptionRange
// ---------------------------------------------------------------------------

describe("getEffectivePerceptionRange", () => {
	it("clear does not modify perception", () => {
		expect(getEffectivePerceptionRange(100, "clear")).toBe(100);
	});

	it("fog halves perception range", () => {
		expect(getEffectivePerceptionRange(100, "fog")).toBeCloseTo(50);
	});

	it("storm reduces perception to 60%", () => {
		expect(getEffectivePerceptionRange(100, "storm")).toBeCloseTo(60);
	});

	it("zero base range stays zero", () => {
		expect(getEffectivePerceptionRange(0, "fog")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isLightningBoosted
// ---------------------------------------------------------------------------

describe("isLightningBoosted", () => {
	it("storm is lightning-boosted (3x)", () => {
		expect(isLightningBoosted("storm")).toBe(true);
	});

	it("clear is NOT lightning-boosted", () => {
		expect(isLightningBoosted("clear")).toBe(false);
	});

	it("rain is NOT lightning-boosted (1.5x < 2.0)", () => {
		expect(isLightningBoosted("rain")).toBe(false);
	});

	it("fog is NOT lightning-boosted", () => {
		expect(isLightningBoosted("fog")).toBe(false);
	});

	it("acid_rain is NOT lightning-boosted (1.5x < 2.0)", () => {
		expect(isLightningBoosted("acid_rain")).toBe(false);
	});

	it("unknown weather is NOT lightning-boosted", () => {
		expect(isLightningBoosted("blizzard")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getWeatherHazardWarning
// ---------------------------------------------------------------------------

describe("getWeatherHazardWarning", () => {
	it("storm returns cube protection warning", () => {
		const w = getWeatherHazardWarning("storm");
		expect(w).not.toBeNull();
		expect(w).toContain("cube");
	});

	it("acid_rain returns corrosion warning", () => {
		const w = getWeatherHazardWarning("acid_rain");
		expect(w).not.toBeNull();
		expect(w).toContain("corrosion");
	});

	it("fog returns perception warning", () => {
		const w = getWeatherHazardWarning("fog");
		expect(w).not.toBeNull();
		expect(w).toContain("perception");
	});

	it("clear returns null (no hazard)", () => {
		expect(getWeatherHazardWarning("clear")).toBeNull();
	});

	it("cloudy returns null (no hazard)", () => {
		expect(getWeatherHazardWarning("cloudy")).toBeNull();
	});

	it("rain returns null (no hazard warning)", () => {
		expect(getWeatherHazardWarning("rain")).toBeNull();
	});

	it("unknown weather returns null", () => {
		expect(getWeatherHazardWarning("tornado")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getVisibilityColor
// ---------------------------------------------------------------------------

describe("getVisibilityColor", () => {
	it("clear returns white fog and tint", () => {
		const c = getVisibilityColor("clear");
		expect(c.fog).toBe("#ffffff");
		expect(c.tint).toBe("#ffffff");
	});

	it("storm returns dark fog and tint", () => {
		const c = getVisibilityColor("storm");
		expect(c.fog).toBe("#334455");
		expect(c.tint).toBe("#445566");
	});

	it("fog returns bluish-gray colors", () => {
		const c = getVisibilityColor("fog");
		expect(c.fog).toBe("#99aabb");
		expect(c.tint).toBe("#aabbcc");
	});

	it("acid_rain returns greenish tint", () => {
		const c = getVisibilityColor("acid_rain");
		expect(c.fog).toBe("#556633");
		expect(c.tint).toBe("#667744");
	});

	it("unknown weather falls back to clear colors", () => {
		const c = getVisibilityColor("hailstorm");
		expect(c.fog).toBe("#ffffff");
		expect(c.tint).toBe("#ffffff");
	});

	it("returns a copy — mutations don't leak", () => {
		const c1 = getVisibilityColor("storm");
		c1.fog = "#000000";
		const c2 = getVisibilityColor("storm");
		expect(c2.fog).toBe("#334455");
	});
});

// ---------------------------------------------------------------------------
// reset and override
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears preset overrides", () => {
		_setOverridePresets({
			clear: {
				movementSpeedMult: 0.1,
				visibilityRange: 10,
				perceptionRangeMult: 0.1,
				lightningChanceMult: 0.1,
				combatAccuracyMult: 0.1,
				harvestSpeedMult: 0.1,
				cubeExposureDamagePerSec: 99,
				ambientSoundPreset: "test",
				skyboxTint: "#000000",
				particleDensity: 99,
			},
		});
		expect(getWeatherModifiers("clear").movementSpeedMult).toBe(0.1);

		reset();
		expect(getWeatherModifiers("clear").movementSpeedMult).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Cross-cutting: every preset has required fields
// ---------------------------------------------------------------------------

describe("all presets have complete modifier fields", () => {
	const ALL_PRESETS: WeatherPreset[] = [
		"clear",
		"cloudy",
		"rain",
		"storm",
		"fog",
		"acid_rain",
	];

	for (const preset of ALL_PRESETS) {
		it(`${preset} has all required fields`, () => {
			const m = getWeatherModifiers(preset);
			expect(typeof m.movementSpeedMult).toBe("number");
			expect(typeof m.visibilityRange).toBe("number");
			expect(typeof m.perceptionRangeMult).toBe("number");
			expect(typeof m.lightningChanceMult).toBe("number");
			expect(typeof m.combatAccuracyMult).toBe("number");
			expect(typeof m.harvestSpeedMult).toBe("number");
			expect(typeof m.cubeExposureDamagePerSec).toBe("number");
			expect(typeof m.ambientSoundPreset).toBe("string");
			expect(typeof m.skyboxTint).toBe("string");
			expect(typeof m.particleDensity).toBe("number");
		});
	}
});
