import diplomacyConfig from "../diplomacy.json";

describe("diplomacy.json", () => {
	describe("relations", () => {
		it("has a default stance", () => {
			expect(diplomacyConfig.relations.defaultStance).toBe("neutral");
		});

		it("has at least 4 stance levels", () => {
			expect(diplomacyConfig.relations.stances.length).toBeGreaterThanOrEqual(4);
		});

		it("stances progress from hostile to allied", () => {
			expect(diplomacyConfig.relations.stances[0]).toBe("hostile");
			expect(
				diplomacyConfig.relations.stances[diplomacyConfig.relations.stances.length - 1],
			).toBe("allied");
		});

		it("stance thresholds increase monotonically", () => {
			const stances = diplomacyConfig.relations.stances;
			const thresholds = diplomacyConfig.relations.stanceThresholds;
			for (let i = 1; i < stances.length; i++) {
				const current = thresholds[stances[i] as keyof typeof thresholds];
				const prev = thresholds[stances[i - 1] as keyof typeof thresholds];
				expect(current).toBeGreaterThan(prev);
			}
		});
	});

	describe("opinion modifiers", () => {
		it("positive actions give positive modifiers", () => {
			expect(diplomacyConfig.opinionModifiers.tradeDeal).toBeGreaterThan(0);
			expect(diplomacyConfig.opinionModifiers.cubeGift).toBeGreaterThan(0);
			expect(diplomacyConfig.opinionModifiers.allianceProposal).toBeGreaterThan(0);
		});

		it("negative actions give negative modifiers", () => {
			expect(diplomacyConfig.opinionModifiers.attackedUs).toBeLessThan(0);
			expect(diplomacyConfig.opinionModifiers.betrayal).toBeLessThan(0);
			expect(diplomacyConfig.opinionModifiers.territoryInfringement).toBeLessThan(0);
		});

		it("betrayal is the most negative modifier", () => {
			const values = Object.values(diplomacyConfig.opinionModifiers);
			expect(diplomacyConfig.opinionModifiers.betrayal).toBe(Math.min(...values));
		});
	});

	it("has positive check interval and cooldown", () => {
		expect(diplomacyConfig.checkInterval).toBeGreaterThan(0);
		expect(diplomacyConfig.tradeProposalCooldown).toBeGreaterThan(0);
	});
});
