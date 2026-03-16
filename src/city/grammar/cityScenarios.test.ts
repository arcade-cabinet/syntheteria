import { CITY_LAYOUT_SCENARIOS } from "./cityScenarios";

describe("city layout scenarios", () => {
	it("defines deterministic scenario fixtures for the city lab", () => {
		expect(CITY_LAYOUT_SCENARIOS.map((scenario) => scenario.id)).toEqual(
			expect.arrayContaining([
				"minimal_base",
				"corridor_facility",
				"storage_block",
			]),
		);
	});

	it("includes non-empty placements for every scenario", () => {
		for (const scenario of CITY_LAYOUT_SCENARIOS) {
			expect(scenario.placements.length).toBeGreaterThan(0);
		}
	});
});
