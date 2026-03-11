import progressionConfig from "../progression.json";

describe("progression.json", () => {
	it("has positive xp divisor", () => {
		expect(progressionConfig.xpDivisor).toBeGreaterThan(0);
	});

	describe("xpRewards", () => {
		it("has all reward types", () => {
			expect(typeof progressionConfig.xpRewards.quest).toBe("number");
			expect(typeof progressionConfig.xpRewards.craft).toBe("number");
			expect(typeof progressionConfig.xpRewards.discovery).toBe("number");
			expect(typeof progressionConfig.xpRewards.battle).toBe("number");
		});

		it("all rewards are positive", () => {
			for (const xp of Object.values(progressionConfig.xpRewards)) {
				expect(xp).toBeGreaterThan(0);
			}
		});

		it("quest gives more XP than crafting", () => {
			expect(progressionConfig.xpRewards.quest).toBeGreaterThan(
				progressionConfig.xpRewards.craft,
			);
		});
	});

	describe("levelBonuses", () => {
		it("has positive per-level bonuses", () => {
			expect(progressionConfig.levelBonuses.miningSpeedPerLevel).toBeGreaterThan(0);
			expect(progressionConfig.levelBonuses.movementSpeedPerLevel).toBeGreaterThan(0);
			expect(progressionConfig.levelBonuses.inventorySlotsPerLevel).toBeGreaterThan(0);
		});
	});

	describe("levelUnlocks", () => {
		it("has at least 5 level unlock tiers", () => {
			expect(Object.keys(progressionConfig.levelUnlocks).length).toBeGreaterThanOrEqual(5);
		});

		it("each level has recipes, buildings, and abilities", () => {
			for (const [, unlocks] of Object.entries(progressionConfig.levelUnlocks)) {
				expect(Array.isArray(unlocks.recipes)).toBe(true);
				expect(Array.isArray(unlocks.buildings)).toBe(true);
				expect(Array.isArray(unlocks.abilities)).toBe(true);
			}
		});

		it("level 1 unlocks basic recipes", () => {
			expect(progressionConfig.levelUnlocks["1"].recipes.length).toBeGreaterThan(0);
		});
	});
});
