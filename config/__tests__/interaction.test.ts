import interactionConfig from "../interaction.json";

describe("interaction.json", () => {
	describe("maxRangeByType", () => {
		it("has range values for core entity types", () => {
			expect(interactionConfig.maxRangeByType.ore_deposit).toBeGreaterThan(0);
			expect(interactionConfig.maxRangeByType.cube).toBeGreaterThan(0);
			expect(interactionConfig.maxRangeByType.furnace).toBeGreaterThan(0);
			expect(interactionConfig.maxRangeByType.building).toBeGreaterThan(0);
			expect(interactionConfig.maxRangeByType.bot).toBeGreaterThan(0);
			expect(interactionConfig.maxRangeByType.enemy).toBeGreaterThan(0);
		});

		it("enemy has longest range", () => {
			const maxRange = Math.max(
				...Object.values(interactionConfig.maxRangeByType),
			);
			expect(interactionConfig.maxRangeByType.enemy).toBe(maxRange);
		});
	});

	describe("actionsByType", () => {
		it("has actions for each entity type with ranges", () => {
			const typesWithRanges = Object.keys(interactionConfig.maxRangeByType);
			for (const type of typesWithRanges) {
				const actions = interactionConfig.actionsByType[type as keyof typeof interactionConfig.actionsByType];
				expect(actions).toBeDefined();
				expect(actions.length).toBeGreaterThan(0);
			}
		});

		it("each action has id and label", () => {
			for (const [, actions] of Object.entries(interactionConfig.actionsByType)) {
				for (const action of actions) {
					expect(typeof action.id).toBe("string");
					expect(typeof action.label).toBe("string");
				}
			}
		});

		it("cube actions include grab", () => {
			expect(interactionConfig.actionsByType.cube.some((a) => a.id === "grab")).toBe(true);
		});

		it("enemy actions include attack and hack", () => {
			const enemyIds = interactionConfig.actionsByType.enemy.map((a) => a.id);
			expect(enemyIds).toContain("attack");
			expect(enemyIds).toContain("hack");
		});
	});

	it("has positive radial menu radius", () => {
		expect(interactionConfig.radialMenuRadius).toBeGreaterThan(0);
	});

	it("has positive highlight intensity", () => {
		expect(interactionConfig.highlightIntensity).toBeGreaterThan(0);
		expect(interactionConfig.highlightIntensity).toBeLessThanOrEqual(1);
	});
});
