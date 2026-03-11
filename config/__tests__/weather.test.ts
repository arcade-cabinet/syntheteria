import weatherConfig from "../weather.json";

describe("weather.json", () => {
	const stateNames = Object.keys(weatherConfig.states);

	it("has at least 4 weather states", () => {
		expect(stateNames.length).toBeGreaterThanOrEqual(4);
	});

	it("includes clear and storm states", () => {
		expect(weatherConfig.states.clear).toBeDefined();
		expect(weatherConfig.states.storm).toBeDefined();
	});

	it("each state has required modifier fields", () => {
		for (const [, state] of Object.entries(weatherConfig.states)) {
			expect(typeof state.visibilityRange).toBe("number");
			expect(state.visibilityRange).toBeGreaterThan(0);
			expect(state.visibilityRange).toBeLessThanOrEqual(1);
			expect(typeof state.movementSpeedModifier).toBe("number");
			expect(state.movementSpeedModifier).toBeGreaterThan(0);
			expect(typeof state.damageModifier).toBe("number");
			expect(typeof state.powerGenerationModifier).toBe("number");
			expect(typeof state.lightningStrikeChance).toBe("number");
			expect(state.lightningStrikeChance).toBeGreaterThanOrEqual(0);
			expect(state.lightningStrikeChance).toBeLessThanOrEqual(1);
		}
	});

	it("clear state has full visibility and no damage", () => {
		expect(weatherConfig.states.clear.visibilityRange).toBe(1);
		expect(weatherConfig.states.clear.damageModifier).toBe(0);
		expect(weatherConfig.states.clear.lightningStrikeChance).toBe(0);
	});

	describe("transition weights", () => {
		it("has transition weights for each state", () => {
			for (const state of stateNames) {
				expect(weatherConfig.transitionWeights[state as keyof typeof weatherConfig.transitionWeights]).toBeDefined();
			}
		});

		it("each state can transition to all other states", () => {
			for (const [, weights] of Object.entries(weatherConfig.transitionWeights)) {
				for (const targetState of stateNames) {
					expect(typeof (weights as Record<string, number>)[targetState]).toBe("number");
				}
			}
		});
	});

	it("has positive transition interval", () => {
		expect(weatherConfig.transitionIntervalTicks).toBeGreaterThan(0);
	});

	it("acid rain has protection types", () => {
		expect(weatherConfig.acidRainProtectionTypes.length).toBeGreaterThan(0);
	});
});
