import beltsConfig from "../belts.json";

describe("belts.json", () => {
	it("has belt tiers", () => {
		const tiers = Object.keys(beltsConfig.tiers);
		expect(tiers.length).toBeGreaterThanOrEqual(2);
	});

	it("each tier has speed and powerCost", () => {
		for (const [name, tier] of Object.entries(beltsConfig.tiers)) {
			expect(typeof tier.speed).toBe("number");
			expect(tier.speed).toBeGreaterThan(0);
			expect(typeof tier.powerCost).toBe("number");
			expect(tier.powerCost).toBeGreaterThanOrEqual(0);
		}
	});

	it("speeds increase across tiers", () => {
		const speeds = Object.values(beltsConfig.tiers).map((t) => t.speed);
		for (let i = 1; i < speeds.length; i++) {
			expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
		}
	});
});
