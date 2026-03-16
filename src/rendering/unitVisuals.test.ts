import { parseHexColor, unitVisualsConfig } from "../config/unitVisuals";
import {
	getBadgeColor,
	getBadgeLabel,
	getCultistVisualConfig,
	getDamageRatio,
	getDamageVisuals,
	isCultistVisual,
} from "./unitVisuals";

describe("unitVisuals", () => {
	describe("getBadgeColor", () => {
		it("returns white for Mark I", () => {
			expect(getBadgeColor(1)).toBe(0xffffff);
		});

		it("returns green for Mark II", () => {
			expect(getBadgeColor(2)).toBe(0x44ff44);
		});

		it("returns blue for Mark III", () => {
			expect(getBadgeColor(3)).toBe(0x4488ff);
		});

		it("returns purple for Mark IV", () => {
			expect(getBadgeColor(4)).toBe(0xaa44ff);
		});

		it("returns gold for Mark V", () => {
			expect(getBadgeColor(5)).toBe(0xffd700);
		});

		it("returns null for level 0", () => {
			expect(getBadgeColor(0)).toBeNull();
		});

		it("returns null for level 6", () => {
			expect(getBadgeColor(6)).toBeNull();
		});

		it("returns null for negative level", () => {
			expect(getBadgeColor(-1)).toBeNull();
		});

		it("matches config markBadgeColors for all valid levels", () => {
			for (let level = 1; level <= 5; level++) {
				const hex = unitVisualsConfig.markBadgeColors[String(level)];
				expect(hex).toBeDefined();
				expect(getBadgeColor(level)).toBe(parseHexColor(hex!));
			}
		});
	});

	describe("getBadgeLabel", () => {
		it("returns I for Mark 1", () => {
			expect(getBadgeLabel(1)).toBe("I");
		});

		it("returns II for Mark 2", () => {
			expect(getBadgeLabel(2)).toBe("II");
		});

		it("returns III for Mark 3", () => {
			expect(getBadgeLabel(3)).toBe("III");
		});

		it("returns IV for Mark 4", () => {
			expect(getBadgeLabel(4)).toBe("IV");
		});

		it("returns V for Mark 5", () => {
			expect(getBadgeLabel(5)).toBe("V");
		});

		it("returns null for invalid levels", () => {
			expect(getBadgeLabel(0)).toBeNull();
			expect(getBadgeLabel(6)).toBeNull();
			expect(getBadgeLabel(-1)).toBeNull();
		});
	});

	describe("getDamageRatio", () => {
		it("returns 0 for all functional components", () => {
			const components = [
				{ functional: true },
				{ functional: true },
				{ functional: true },
			];
			expect(getDamageRatio(components)).toBe(0);
		});

		it("returns 1 for all broken components", () => {
			const components = [{ functional: false }, { functional: false }];
			expect(getDamageRatio(components)).toBe(1);
		});

		it("returns 0.5 for half broken components", () => {
			const components = [{ functional: true }, { functional: false }];
			expect(getDamageRatio(components)).toBe(0.5);
		});

		it("returns 0 for empty component list", () => {
			expect(getDamageRatio([])).toBe(0);
		});

		it("calculates correctly for 1/3 broken", () => {
			const components = [
				{ functional: true },
				{ functional: true },
				{ functional: false },
			];
			expect(getDamageRatio(components)).toBeCloseTo(1 / 3);
		});
	});

	describe("isCultistVisual", () => {
		it("returns true for cultist faction", () => {
			expect(isCultistVisual("cultist")).toBe(true);
		});

		it("returns true for rogue faction", () => {
			expect(isCultistVisual("rogue")).toBe(true);
		});

		it("returns false for player faction", () => {
			expect(isCultistVisual("player")).toBe(false);
		});

		it("returns false for feral faction", () => {
			expect(isCultistVisual("feral")).toBe(false);
		});

		it("returns false for wildlife faction", () => {
			expect(isCultistVisual("wildlife")).toBe(false);
		});
	});

	describe("getDamageVisuals", () => {
		const d = unitVisualsConfig.damageVisuals;

		it("returns full values at 0 damage", () => {
			const result = getDamageVisuals(0);
			expect(result.opacity).toBe(1.0);
			expect(result.glowIntensity).toBe(1.0);
			expect(result.desaturation).toBe(0.0);
			expect(result.sparking).toBe(false);
		});

		it("returns degraded values at full damage", () => {
			const result = getDamageVisuals(1);
			expect(result.opacity).toBe(d.opacityMin);
			expect(result.glowIntensity).toBeCloseTo(d.glowIntensityMin);
			expect(result.desaturation).toBeCloseTo(d.desaturationMax);
			expect(result.sparking).toBe(true);
		});

		it("returns sparking at threshold", () => {
			const result = getDamageVisuals(d.sparkingThreshold);
			expect(result.sparking).toBe(true);
		});

		it("returns no sparking just below threshold", () => {
			const result = getDamageVisuals(d.sparkingThreshold - 0.01);
			expect(result.sparking).toBe(false);
		});

		it("clamps damage ratio below 0", () => {
			const result = getDamageVisuals(-0.5);
			expect(result.opacity).toBe(1.0);
			expect(result.glowIntensity).toBe(1.0);
			expect(result.desaturation).toBe(0.0);
			expect(result.sparking).toBe(false);
		});

		it("clamps damage ratio above 1", () => {
			const result = getDamageVisuals(1.5);
			expect(result.opacity).toBe(d.opacityMin);
			expect(result.glowIntensity).toBeCloseTo(d.glowIntensityMin);
			expect(result.desaturation).toBeCloseTo(d.desaturationMax);
			expect(result.sparking).toBe(true);
		});

		it("interpolates at 25% damage", () => {
			const result = getDamageVisuals(0.25);
			expect(result.opacity).toBeGreaterThan(d.opacityMin);
			expect(result.opacity).toBeLessThanOrEqual(1);
			expect(result.glowIntensity).toBeGreaterThan(d.glowIntensityMin);
			expect(result.desaturation).toBeCloseTo(0.25 * d.desaturationMax);
			expect(result.sparking).toBe(false);
		});
	});

	describe("getCultistVisualConfig", () => {
		it("returns tint in red-purple range from config", () => {
			const cfg = getCultistVisualConfig();
			expect(cfg.tint).toBe(0xcc2255);
			const r = (cfg.tint >> 16) & 0xff;
			const g = (cfg.tint >> 8) & 0xff;
			expect(r).toBeGreaterThan(g);
		});
	});
});
