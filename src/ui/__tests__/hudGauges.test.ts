/**
 * Tests for hudGauges pure functions.
 */

import {
	buildHealthGauge,
	buildPowderGauge,
	buildXPBarInfo,
	fillToCSSPercent,
} from "../hudGauges";

// ─── buildHealthGauge ─────────────────────────────────────────────────────────

describe("buildHealthGauge", () => {
	it("returns full fill when health equals max", () => {
		const gauge = buildHealthGauge(100, 100);
		expect(gauge.fill).toBeCloseTo(1.0);
	});

	it("returns zero fill when health is zero", () => {
		const gauge = buildHealthGauge(0, 100);
		expect(gauge.fill).toBe(0);
	});

	it("returns zero fill when maxHealth is zero", () => {
		const gauge = buildHealthGauge(50, 0);
		expect(gauge.fill).toBe(0);
	});

	it("clamps fill to 0..1 even if health exceeds max", () => {
		const gauge = buildHealthGauge(150, 100);
		expect(gauge.fill).toBe(1);
	});

	it("clamps fill to 0 for negative health", () => {
		const gauge = buildHealthGauge(-10, 100);
		expect(gauge.fill).toBe(0);
	});

	it("returns green color when health > 60%", () => {
		const gauge = buildHealthGauge(70, 100);
		expect(gauge.color).toBe("#00ff88");
	});

	it("returns amber color when health is 30..60%", () => {
		const gauge = buildHealthGauge(45, 100);
		expect(gauge.color).toBe("#ffaa00");
	});

	it("returns red color when health < 30%", () => {
		const gauge = buildHealthGauge(20, 100);
		expect(gauge.color).toBe("#ff4444");
	});

	it("includes health values in label", () => {
		const gauge = buildHealthGauge(75, 100);
		expect(gauge.label).toContain("75");
		expect(gauge.label).toContain("100");
	});

	it("returns correct fill for partial health", () => {
		const gauge = buildHealthGauge(50, 200);
		expect(gauge.fill).toBeCloseTo(0.25);
	});
});

// ─── buildPowderGauge ────────────────────────────────────────────────────────

describe("buildPowderGauge", () => {
	it("returns full fill when powder equals capacity", () => {
		const gauge = buildPowderGauge(60, 60, "scrap_metal");
		expect(gauge.fill).toBeCloseTo(1.0);
	});

	it("returns zero fill when powder is zero", () => {
		const gauge = buildPowderGauge(0, 60, "");
		expect(gauge.fill).toBe(0);
	});

	it("returns zero fill when capacity is zero", () => {
		const gauge = buildPowderGauge(10, 0, "scrap");
		expect(gauge.fill).toBe(0);
	});

	it("clamps fill above 1", () => {
		const gauge = buildPowderGauge(80, 60, "scrap");
		expect(gauge.fill).toBe(1);
	});

	it("returns gold color when full", () => {
		const gauge = buildPowderGauge(60, 60, "scrap");
		expect(gauge.color).toBe("#ffdd00");
	});

	it("returns amber color when partially filled", () => {
		const gauge = buildPowderGauge(30, 60, "scrap");
		expect(gauge.color).toBe("#ffaa00");
	});

	it("returns dim color when nearly empty", () => {
		const gauge = buildPowderGauge(0, 60, "");
		expect(gauge.color).toBe("#ffaa0033");
	});

	it("includes powder type in label when provided", () => {
		const gauge = buildPowderGauge(30, 60, "scrap_metal");
		expect(gauge.label).toContain("scrap metal");
	});

	it("omits type from label when empty", () => {
		const gauge = buildPowderGauge(0, 60, "");
		expect(gauge.label).not.toContain("(");
	});
});

// ─── buildXPBarInfo ──────────────────────────────────────────────────────────

describe("buildXPBarInfo", () => {
	it("returns zero progress at level 0 with no XP", () => {
		const info = buildXPBarInfo(0, 100, 0);
		expect(info.levelProgress).toBe(0);
		expect(info.level).toBe(0);
	});

	it("level 0: first 100 XP fills bar from 0% to 100%", () => {
		// level 0: xpForCurrentLevel=0, xpForNextLevel=100
		const info50 = buildXPBarInfo(50, 50, 0);
		expect(info50.levelProgress).toBeCloseTo(0.5, 5);

		const info100 = buildXPBarInfo(100, 0, 0);
		expect(info100.levelProgress).toBeCloseTo(1.0, 5);
	});

	it("level 1: progress starts fresh after leveling", () => {
		// level 1: xpForCurrentLevel=100, xpForNextLevel=400
		// totalXP=100 means 0 progress into level 1
		const info = buildXPBarInfo(100, 300, 1);
		expect(info.levelProgress).toBeCloseTo(0, 5);
	});

	it("level 1: halfway through", () => {
		// level 1: range 100..400 (300 XP range), halfway at 250
		const info = buildXPBarInfo(250, 150, 1);
		expect(info.levelProgress).toBeCloseTo(0.5, 5);
	});

	it("clamps levelProgress to 1 when at/over threshold", () => {
		const info = buildXPBarInfo(400, 0, 1);
		expect(info.levelProgress).toBe(1);
	});

	it("includes level in label", () => {
		const info = buildXPBarInfo(50, 50, 0);
		expect(info.label).toContain("Level 0");
	});

	it("xpCurrent is non-negative", () => {
		const info = buildXPBarInfo(0, 100, 0);
		expect(info.xpCurrent).toBeGreaterThanOrEqual(0);
	});
});

// ─── fillToCSSPercent ────────────────────────────────────────────────────────

describe("fillToCSSPercent", () => {
	it("converts 0 to 0%", () => {
		expect(fillToCSSPercent(0)).toBe("0%");
	});

	it("converts 1 to 100%", () => {
		expect(fillToCSSPercent(1)).toBe("100%");
	});

	it("converts 0.5 to 50%", () => {
		expect(fillToCSSPercent(0.5)).toBe("50%");
	});

	it("clamps values above 1 to 100%", () => {
		expect(fillToCSSPercent(1.5)).toBe("100%");
	});

	it("clamps negative values to 0%", () => {
		expect(fillToCSSPercent(-0.5)).toBe("0%");
	});

	it("rounds fractional values", () => {
		expect(fillToCSSPercent(0.333)).toBe("33%");
	});

	it("includes percent sign", () => {
		expect(fillToCSSPercent(0.75)).toMatch(/%$/);
	});
});
