import depositsConfig from "../deposits.json";

describe("deposits.json", () => {
	it("has positive spawn density", () => {
		expect(depositsConfig.spawnDensity).toBeGreaterThan(0);
		expect(depositsConfig.spawnDensity).toBeLessThan(1);
	});

	it("has positive min distance between deposits", () => {
		expect(depositsConfig.minDistanceBetween).toBeGreaterThan(0);
	});

	describe("deposit types", () => {
		const types = Object.entries(depositsConfig.types);

		it("has at least 5 deposit types", () => {
			expect(types.length).toBeGreaterThanOrEqual(5);
		});

		it("each type has required fields", () => {
			for (const [name, deposit] of types) {
				expect(typeof deposit.frequency).toBe("number");
				expect(deposit.frequency).toBeGreaterThan(0);
				expect(deposit.frequency).toBeLessThanOrEqual(1);
				expect(deposit.yieldRange).toHaveLength(2);
				expect(deposit.yieldRange[0]).toBeLessThan(deposit.yieldRange[1]);
				expect(typeof deposit.tier).toBe("number");
				expect(deposit.tier).toBeGreaterThanOrEqual(1);
				expect(Array.isArray(deposit.biomePreference)).toBe(true);
				expect(deposit.biomePreference.length).toBeGreaterThan(0);
				expect(typeof deposit.description).toBe("string");
			}
		});

		it("frequencies sum to approximately 1", () => {
			const total = types.reduce((sum, [, d]) => sum + d.frequency, 0);
			expect(total).toBeGreaterThan(0.8);
			expect(total).toBeLessThanOrEqual(1.01);
		});

		it("tiers increase for rarer materials", () => {
			expect(depositsConfig.types.rock.tier).toBeLessThanOrEqual(
				depositsConfig.types.titanium.tier,
			);
			expect(depositsConfig.types.titanium.tier).toBeLessThanOrEqual(
				depositsConfig.types.quantum_crystal.tier,
			);
		});
	});

	describe("biome multipliers", () => {
		it("has multipliers for each biome", () => {
			const biomes = Object.keys(depositsConfig.biomeMultipliers);
			expect(biomes.length).toBeGreaterThanOrEqual(3);
		});

		it("all multiplier values are positive", () => {
			for (const biomeMultipliers of Object.values(depositsConfig.biomeMultipliers)) {
				for (const mult of Object.values(biomeMultipliers)) {
					expect(mult).toBeGreaterThan(0);
				}
			}
		});

		it("multiplier ore types reference valid deposit types", () => {
			const validTypes = Object.keys(depositsConfig.types);
			for (const [, biomeMultipliers] of Object.entries(depositsConfig.biomeMultipliers)) {
				for (const oreType of Object.keys(biomeMultipliers)) {
					expect(validTypes).toContain(oreType);
				}
			}
		});
	});

	describe("scavenging", () => {
		it("has positive range and spacing", () => {
			expect(depositsConfig.scavenging.autoScavengeRange).toBeGreaterThan(0);
			expect(depositsConfig.scavenging.gridSpacing).toBeGreaterThan(0);
		});

		it("spawn chance is a valid probability", () => {
			expect(depositsConfig.scavenging.spawnChance).toBeGreaterThan(0);
			expect(depositsConfig.scavenging.spawnChance).toBeLessThanOrEqual(1);
		});

		it("scavenging types have valid amounts", () => {
			for (const [, scavType] of Object.entries(depositsConfig.scavenging.types)) {
				expect(scavType.chance).toBeGreaterThan(0);
				expect(scavType.chance).toBeLessThanOrEqual(1);
				expect(scavType.amountMin).toBeGreaterThan(0);
				expect(scavType.amountMax).toBeGreaterThanOrEqual(scavType.amountMin);
			}
		});
	});
});
