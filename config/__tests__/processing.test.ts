import processingConfig from "../processing.json";

describe("processing.json", () => {
	describe("belt", () => {
		it("has positive speed and cube dimensions", () => {
			expect(processingConfig.belt.speed).toBeGreaterThan(0);
			expect(processingConfig.belt.cubeSpacing).toBeGreaterThan(0);
			expect(processingConfig.belt.cubeSize).toBeGreaterThan(0);
			expect(processingConfig.belt.cubeSpacing).toBeGreaterThan(processingConfig.belt.cubeSize);
		});
	});

	describe("recipes", () => {
		it("has smelter recipes", () => {
			expect(Object.keys(processingConfig.recipes.smelter).length).toBeGreaterThan(0);
		});

		it("has refiner recipes", () => {
			expect(Object.keys(processingConfig.recipes.refiner).length).toBeGreaterThan(0);
		});

		it("has separator recipes", () => {
			expect(Object.keys(processingConfig.recipes.separator).length).toBeGreaterThan(0);
		});

		it("all recipes map input to non-empty output", () => {
			for (const [, recipes] of Object.entries(processingConfig.recipes)) {
				for (const [input, output] of Object.entries(recipes)) {
					expect(input.length).toBeGreaterThan(0);
					expect(output.length).toBeGreaterThan(0);
				}
			}
		});
	});
});
