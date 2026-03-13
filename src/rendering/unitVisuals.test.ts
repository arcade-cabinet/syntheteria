import {
	CULTIST_TINT,
	getBadgeColor,
	getBadgeLabel,
	getDamageRatio,
	getDamageVisuals,
	isCultistVisual,
	MARK_BADGE_COLORS,
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

		it("matches MARK_BADGE_COLORS for all valid levels", () => {
			for (let level = 1; level <= 5; level++) {
				expect(getBadgeColor(level)).toBe(MARK_BADGE_COLORS[level]);
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
		it("returns full values at 0 damage", () => {
			const result = getDamageVisuals(0);
			expect(result.opacity).toBe(1.0);
			expect(result.glowIntensity).toBe(1.0);
			expect(result.desaturation).toBe(0.0);
			expect(result.sparking).toBe(false);
		});

		it("returns degraded values at full damage", () => {
			const result = getDamageVisuals(1);
			expect(result.opacity).toBe(0.5);
			expect(result.glowIntensity).toBeCloseTo(0.1);
			expect(result.desaturation).toBeCloseTo(0.8);
			expect(result.sparking).toBe(true);
		});

		it("returns sparking at 50% damage", () => {
			const result = getDamageVisuals(0.5);
			expect(result.sparking).toBe(true);
		});

		it("returns no sparking at 49% damage", () => {
			const result = getDamageVisuals(0.49);
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
			expect(result.opacity).toBe(0.5);
			expect(result.glowIntensity).toBeCloseTo(0.1);
			expect(result.desaturation).toBeCloseTo(0.8);
			expect(result.sparking).toBe(true);
		});

		it("interpolates linearly at 25% damage", () => {
			const result = getDamageVisuals(0.25);
			expect(result.opacity).toBeCloseTo(0.875);
			expect(result.glowIntensity).toBeCloseTo(0.775);
			expect(result.desaturation).toBeCloseTo(0.2);
			expect(result.sparking).toBe(false);
		});
	});

	describe("CULTIST_TINT", () => {
		it("is a valid hex color in the red-purple range", () => {
			expect(CULTIST_TINT).toBe(0xcc2255);
			// Red channel should be dominant
			const r = (CULTIST_TINT >> 16) & 0xff;
			const g = (CULTIST_TINT >> 8) & 0xff;
			expect(r).toBeGreaterThan(g);
		});
	});
});
