import victoryConfig from "../victory.json";

describe("victory.json", () => {
	const conditions = Object.entries(victoryConfig.conditions);

	it("has at least 4 victory conditions", () => {
		expect(conditions.length).toBeGreaterThanOrEqual(4);
	});

	it("each condition has name, description, and check interval", () => {
		for (const [, condition] of conditions) {
			expect(typeof condition.name).toBe("string");
			expect(condition.name.length).toBeGreaterThan(0);
			expect(typeof condition.description).toBe("string");
			expect(condition.description.length).toBeGreaterThan(10);
			expect(typeof condition.checkInterval).toBe("number");
			expect(condition.checkInterval).toBeGreaterThan(0);
		}
	});

	it("has economic condition with cube threshold", () => {
		expect(victoryConfig.conditions.economic.cubeThreshold).toBeGreaterThan(0);
	});

	it("has military condition requiring elimination", () => {
		expect(victoryConfig.conditions.military.eliminationRequired).toBe(true);
	});

	it("has scientific condition with tier requirement", () => {
		expect(victoryConfig.conditions.scientific.requiredTier).toBeGreaterThan(0);
	});

	it("has positive grace period", () => {
		expect(victoryConfig.gracePeriodTicks).toBeGreaterThan(0);
	});
});
