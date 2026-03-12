import {
	getAvailableTracksForArchetype,
	resolveBotProgressionSummary,
	resolveBotSpeed,
	resolveMarkMultiplier,
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
			archetypeId: "substation_engineer",
			markLevel: 4,
			trackLevels: {
				founding: 6,
				defense: 5,
			},
		});

		expect(summary.focusTrackId).toBe("founding");
		expect(summary.trackSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "founding",
					currentLevel: 6,
				}),
				expect.objectContaining({
					id: "defense",
					currentLevel: 5,
				}),
			]),
		);
	});
});
