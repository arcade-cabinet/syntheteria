import {
	getAvailableTracksForArchetype,
	getCanonicalMarkMultiplier,
	getMarkAPBonus,
	getMarkMPBonus,
	resolveBotProgressionSummary,
	resolveBotSpeed,
	resolveMarkMultiplier,
	resolveRoleMarkEffect,
	resolveTrackMultiplier,
	resolveUpgradePotential,
} from "./progression";

describe("bot progression", () => {
	it("grows with diminishing logarithmic returns", () => {
		const markTwo = resolveMarkMultiplier(2, "mobility");
		const markThree = resolveMarkMultiplier(3, "mobility");
		const markTen = resolveMarkMultiplier(10, "mobility");
		const markEleven = resolveMarkMultiplier(11, "mobility");

		expect(markTwo).toBeGreaterThan(1);
		expect(markTen).toBeGreaterThan(markTwo);
		expect(markEleven - markTen).toBeLessThan(markThree - markTwo);
	});

	it("exposes archetype upgrade tracks for future AI/gameplay systems", () => {
		expect(
			getAvailableTracksForArchetype("field_technician").map(
				(track) => track.id,
			),
		).toEqual(["mobility", "surveying", "repair", "relay"]);
	});

	it("resolves upgraded bot speed from chassis plus mark growth", () => {
		expect(
			resolveBotSpeed({
				unitType: "maintenance_bot",
				markLevel: 5,
			}),
		).toBeGreaterThan(3);
	});

	it("surfaces next-mark upgrade potential for deterministic UI and balancing", () => {
		const potential = resolveUpgradePotential({
			archetypeId: "assault_strider",
			markLevel: 3,
		});

		expect(potential.length).toBe(4);
		expect(potential[0]?.nextMarkMultiplier).toBeGreaterThan(1);
	});

	it("lets an explicitly leveled track outrun the base mark level", () => {
		const baseline = resolveTrackMultiplier({
			markLevel: 3,
			trackId: "relay",
		});
		const focused = resolveTrackMultiplier({
			markLevel: 3,
			trackId: "relay",
			trackLevel: 6,
		});

		expect(focused).toBeGreaterThan(baseline);
	});

	it("builds a deterministic progression summary for roster UI and balancing", () => {
		const summary = resolveBotProgressionSummary({
			unitType: "mecha_golem",
			archetypeId: "defense_sentry",
			markLevel: 4,
			trackLevels: {
				defense: 6,
				assault: 5,
			},
		});

		expect(summary.focusTrackId).toBe("defense");
		expect(summary.trackSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "defense",
					currentLevel: 6,
				}),
				expect.objectContaining({
					id: "assault",
					currentLevel: 5,
				}),
			]),
		);
	});
});

describe("canonical Mark multiplier table (task #47)", () => {
	it("matches the BOT_AND_ECONOMY_REDESIGN spec", () => {
		expect(getCanonicalMarkMultiplier(1)).toBe(1.0);
		expect(getCanonicalMarkMultiplier(2)).toBe(1.8);
		expect(getCanonicalMarkMultiplier(3)).toBe(3.0);
		expect(getCanonicalMarkMultiplier(4)).toBe(5.0);
		expect(getCanonicalMarkMultiplier(5)).toBe(8.0);
	});

	it("clamps Mark 0 to Mark 1 (1.0x)", () => {
		expect(getCanonicalMarkMultiplier(0)).toBe(1.0);
		expect(getCanonicalMarkMultiplier(-1)).toBe(1.0);
	});

	it("extrapolates beyond Mark V logarithmically", () => {
		const markSix = getCanonicalMarkMultiplier(6);
		const markEight = getCanonicalMarkMultiplier(8);
		const markTen = getCanonicalMarkMultiplier(10);
		const markTwelve = getCanonicalMarkMultiplier(12);
		expect(markSix).toBeGreaterThan(8.0);
		expect(markTen).toBeGreaterThan(markEight);
		// Diminishing returns: later increments are smaller
		expect(markTwelve - markTen).toBeLessThan(markTen - markEight);
	});
});

describe("role Mark effects (task #47)", () => {
	it("each role maps to a specific stat", () => {
		expect(resolveRoleMarkEffect("technician", 1).stat).toBe("repair speed");
		expect(resolveRoleMarkEffect("scout", 1).stat).toBe("vision radius");
		expect(resolveRoleMarkEffect("striker", 1).stat).toBe("melee damage");
		expect(resolveRoleMarkEffect("fabricator", 1).stat).toBe(
			"build/harvest speed",
		);
		expect(resolveRoleMarkEffect("guardian", 1).stat).toBe("damage reduction");
		expect(resolveRoleMarkEffect("hauler", 1).stat).toBe("cargo capacity");
	});

	it("multiplier scales with Mark level", () => {
		const mark1 = resolveRoleMarkEffect("striker", 1);
		const mark3 = resolveRoleMarkEffect("striker", 3);
		const mark5 = resolveRoleMarkEffect("striker", 5);

		expect(mark1.multiplier).toBe(1.0);
		expect(mark3.multiplier).toBe(3.0);
		expect(mark5.multiplier).toBe(8.0);
	});

	it("includes human-readable description", () => {
		const effect = resolveRoleMarkEffect("fabricator", 3);
		expect(effect.description).toBe("Build/harvest speed x3.0");
	});
});

describe("AP/MP Mark bonus (task #47)", () => {
	it("Mark I gives +0 bonus (floor(log2(1)) = 0)", () => {
		expect(getMarkAPBonus(1)).toBe(0);
		expect(getMarkMPBonus(1)).toBe(0);
	});

	it("Mark II gives +1 bonus (floor(log2(2)) = 1)", () => {
		expect(getMarkAPBonus(2)).toBe(1);
		expect(getMarkMPBonus(2)).toBe(1);
	});

	it("Mark IV gives +2 bonus (floor(log2(4)) = 2)", () => {
		expect(getMarkAPBonus(4)).toBe(2);
		expect(getMarkMPBonus(4)).toBe(2);
	});

	it("Mark V gives +2 bonus (floor(log2(5)) = 2)", () => {
		expect(getMarkAPBonus(5)).toBe(2);
		expect(getMarkMPBonus(5)).toBe(2);
	});

	it("clamps mark 0 to 1 (no negative bonus)", () => {
		expect(getMarkAPBonus(0)).toBe(0);
		expect(getMarkMPBonus(0)).toBe(0);
	});
});
