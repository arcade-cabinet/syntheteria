import hazardsConfig from "../environmentHazards.json";

describe("environmentHazards.json", () => {
	const hazardTypes = Object.entries(hazardsConfig.hazardTypes);

	it("has at least 4 hazard types", () => {
		expect(hazardTypes.length).toBeGreaterThanOrEqual(4);
	});

	it("each hazard has required fields", () => {
		for (const [, hazard] of hazardTypes) {
			expect(typeof hazard.damagePerTick).toBe("number");
			expect(hazard.damagePerTick).toBeGreaterThanOrEqual(0);
			expect(typeof hazard.movementModifier).toBe("number");
			expect(hazard.movementModifier).toBeGreaterThan(0);
			expect(typeof hazard.defaultRadius).toBe("number");
			expect(hazard.defaultRadius).toBeGreaterThan(0);
			expect(typeof hazard.defaultIntensity).toBe("number");
			expect(typeof hazard.defaultDurationTicks).toBe("number");
			expect(hazard.defaultDurationTicks).toBeGreaterThan(0);
			expect(typeof hazard.color).toBe("string");
			expect(hazard.color).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("scrap_storm drops resources", () => {
		expect(hazardsConfig.hazardTypes.scrap_storm.dropsResources).toBe(true);
		expect(hazardsConfig.hazardTypes.scrap_storm.resourceDropTypes!.length).toBeGreaterThan(0);
	});

	it("has positive spawn parameters", () => {
		expect(hazardsConfig.spawnIntervalTicks).toBeGreaterThan(0);
		expect(hazardsConfig.maxActiveHazards).toBeGreaterThan(0);
		expect(hazardsConfig.spawnChancePerInterval).toBeGreaterThan(0);
		expect(hazardsConfig.spawnChancePerInterval).toBeLessThanOrEqual(1);
	});
});
