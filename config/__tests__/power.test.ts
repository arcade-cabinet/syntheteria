import powerConfig from "../power.json";

describe("power.json", () => {
	it("has positive storm and rod parameters", () => {
		expect(powerConfig.stormBaseIntensity).toBeGreaterThan(0);
		expect(powerConfig.rodBaseOutput).toBeGreaterThan(0);
		expect(powerConfig.wireMaxCapacity).toBeGreaterThan(0);
		expect(powerConfig.defaultPowerRadius).toBeGreaterThan(0);
	});

	it("wire loss per unit is a small fraction", () => {
		expect(powerConfig.wireLossPerUnit).toBeGreaterThan(0);
		expect(powerConfig.wireLossPerUnit).toBeLessThan(1);
	});

	it("has connectable building types", () => {
		expect(powerConfig.connectableTypes.length).toBeGreaterThanOrEqual(3);
		expect(powerConfig.connectableTypes).toContain("lightning_rod");
		expect(powerConfig.connectableTypes).toContain("furnace");
	});

	it("storm surge chance is a valid probability", () => {
		expect(powerConfig.stormSurgeChance).toBeGreaterThanOrEqual(0);
		expect(powerConfig.stormSurgeChance).toBeLessThanOrEqual(1);
	});

	describe("storm escalation", () => {
		it("has at least 3 phases", () => {
			expect(powerConfig.stormEscalation.phases.length).toBeGreaterThanOrEqual(3);
		});

		it("each phase has required fields", () => {
			for (const phase of powerConfig.stormEscalation.phases) {
				expect(typeof phase.name).toBe("string");
				expect(phase.name.length).toBeGreaterThan(0);
				expect(typeof phase.durationTicks).toBe("number");
				expect(phase.durationTicks).toBeGreaterThan(0);
				expect(typeof phase.intensityMultiplier).toBe("number");
				expect(typeof phase.damageChance).toBe("number");
				expect(phase.damageChance).toBeGreaterThanOrEqual(0);
				expect(phase.damageChance).toBeLessThanOrEqual(1);
			}
		});

		it("has positive lightning strike parameters", () => {
			expect(powerConfig.stormEscalation.lightningStrikeRadius).toBeGreaterThan(0);
			expect(powerConfig.stormEscalation.lightningStrikeDamage).toBeGreaterThan(0);
		});
	});
});
