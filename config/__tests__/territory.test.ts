import territoryConfig from "../territory.json";

describe("territory.json", () => {
	it("has outpost tiers", () => {
		expect(territoryConfig.outpostTiers.length).toBeGreaterThanOrEqual(2);
	});

	it("outpost tiers have increasing radius", () => {
		for (let i = 1; i < territoryConfig.outpostTiers.length; i++) {
			expect(territoryConfig.outpostTiers[i].radius).toBeGreaterThan(
				territoryConfig.outpostTiers[i - 1].radius,
			);
		}
	});

	it("each tier has required fields", () => {
		for (const tier of territoryConfig.outpostTiers) {
			expect(typeof tier.tier).toBe("number");
			expect(tier.tier).toBeGreaterThan(0);
			expect(typeof tier.radius).toBe("number");
			expect(tier.radius).toBeGreaterThan(0);
			expect(typeof tier.cubeCost).toBe("number");
			expect(tier.cubeCost).toBeGreaterThan(0);
		}
	});

	it("has positive resource and cost modifiers", () => {
		expect(territoryConfig.resourceBonusInTerritory).toBeGreaterThan(1);
		expect(territoryConfig.buildingCostReduction).toBeGreaterThan(0);
		expect(territoryConfig.buildingCostReduction).toBeLessThan(1);
	});

	it("has positive minimum outpost spacing", () => {
		expect(territoryConfig.minimumOutpostSpacing).toBeGreaterThan(0);
	});
});
