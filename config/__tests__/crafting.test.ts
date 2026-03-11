import craftingConfig from "../crafting.json";

describe("crafting.json", () => {
	it("has positive default craft range", () => {
		expect(craftingConfig.defaultCraftRange).toBeGreaterThan(0);
	});

	it("has at least 4 recipes", () => {
		expect(craftingConfig.recipes.length).toBeGreaterThanOrEqual(4);
	});

	it("each recipe has required fields", () => {
		for (const recipe of craftingConfig.recipes) {
			expect(typeof recipe.id).toBe("string");
			expect(recipe.id.length).toBeGreaterThan(0);
			expect(typeof recipe.name).toBe("string");
			expect(recipe.name.length).toBeGreaterThan(0);
			expect(Array.isArray(recipe.inputs)).toBe(true);
			expect(recipe.inputs.length).toBeGreaterThan(0);
			expect(typeof recipe.outputItemId).toBe("string");
			expect(typeof recipe.outputCount).toBe("number");
			expect(recipe.outputCount).toBeGreaterThan(0);
			expect(typeof recipe.craftTicks).toBe("number");
			expect(recipe.craftTicks).toBeGreaterThan(0);
		}
	});

	it("each input has itemId and count", () => {
		for (const recipe of craftingConfig.recipes) {
			for (const input of recipe.inputs) {
				expect(typeof input.itemId).toBe("string");
				expect(typeof input.count).toBe("number");
				expect(input.count).toBeGreaterThan(0);
			}
		}
	});

	it("recipe IDs are unique", () => {
		const ids = craftingConfig.recipes.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
