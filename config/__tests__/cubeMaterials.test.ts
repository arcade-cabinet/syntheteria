import cubeMaterialsConfig from "../cubeMaterials.json";

describe("cubeMaterials.json", () => {
	const materials = Object.entries(cubeMaterialsConfig);

	it("has at least 8 cube material types", () => {
		expect(materials.length).toBeGreaterThanOrEqual(8);
	});

	it("each material has required fields", () => {
		for (const [id, mat] of materials) {
			expect(typeof mat.name).toBe("string");
			expect(mat.name.length).toBeGreaterThan(0);
			expect(typeof mat.value).toBe("number");
			expect(mat.value).toBeGreaterThanOrEqual(0);
			expect(typeof mat.color).toBe("string");
			expect(mat.color).toMatch(/^0x[0-9a-f]{6}$/i);
			expect(typeof mat.glowColor).toBe("string");
			expect(typeof mat.category).toBe("string");
			expect(typeof mat.durability).toBe("number");
			expect(mat.durability).toBeGreaterThan(0);
			expect(typeof mat.weight).toBe("number");
			expect(mat.weight).toBeGreaterThan(0);
			expect(typeof mat.description).toBe("string");
			expect(mat.description.length).toBeGreaterThan(10);
		}
	});

	it("values increase for rarer materials", () => {
		expect(cubeMaterialsConfig.scrap.value).toBeLessThan(cubeMaterialsConfig.titanium.value);
		expect(cubeMaterialsConfig.iron.value).toBeLessThan(cubeMaterialsConfig.steel.value);
	});

	it("categories are from expected set", () => {
		const validCategories = ["metal", "mineral", "advanced", "electronic", "organic", "rare"];
		for (const [, mat] of materials) {
			expect(validCategories).toContain(mat.category);
		}
	});

	it("processor is most valuable electronic", () => {
		const electronics = materials.filter(([, m]) => m.category === "electronic");
		const maxValue = Math.max(...electronics.map(([, m]) => m.value));
		expect(cubeMaterialsConfig.processor.value).toBe(maxValue);
	});
});
