import discoveriesConfig from "../discoveries.json";

describe("discoveries.json", () => {
	it("has at least 3 discovery types", () => {
		expect(Object.keys(discoveriesConfig.types).length).toBeGreaterThanOrEqual(3);
	});

	it("each type has required fields", () => {
		for (const [, disc] of Object.entries(discoveriesConfig.types)) {
			expect(disc.discoveryReward).toBeDefined();
			expect(typeof disc.discoveryReward.type).toBe("string");
			expect(typeof disc.proximityRange).toBe("number");
			expect(disc.proximityRange).toBeGreaterThan(0);
			expect(typeof disc.scanTime).toBe("number");
			expect(disc.scanTime).toBeGreaterThan(0);
		}
	});

	it("has positive spawn density", () => {
		expect(discoveriesConfig.spawnDensity).toBeGreaterThan(0);
		expect(discoveriesConfig.spawnDensity).toBeLessThan(1);
	});

	it("has positive fog reveal radius", () => {
		expect(discoveriesConfig.fogRevealRadius).toBeGreaterThan(0);
	});
});
