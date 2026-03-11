import inventoryConfig from "../inventory.json";

describe("inventory.json", () => {
	it("has positive default slots and max weight", () => {
		expect(inventoryConfig.defaultSlots).toBeGreaterThan(0);
		expect(inventoryConfig.maxWeight).toBeGreaterThan(0);
	});

	it("min speed multiplier is between 0 and 1", () => {
		expect(inventoryConfig.minSpeedMultiplier).toBeGreaterThan(0);
		expect(inventoryConfig.minSpeedMultiplier).toBeLessThan(1);
	});

	it("has at least 5 item types", () => {
		expect(Object.keys(inventoryConfig.items).length).toBeGreaterThanOrEqual(5);
	});

	it("each item has required fields", () => {
		for (const [, item] of Object.entries(inventoryConfig.items)) {
			expect(typeof item.category).toBe("string");
			expect(typeof item.weight).toBe("number");
			expect(item.weight).toBeGreaterThan(0);
			expect(typeof item.maxStack).toBe("number");
			expect(item.maxStack).toBeGreaterThan(0);
		}
	});

	it("categories are from expected set", () => {
		const validCategories = ["cube", "tool", "component"];
		for (const [, item] of Object.entries(inventoryConfig.items)) {
			expect(validCategories).toContain(item.category);
		}
	});

	it("tools stack to 1", () => {
		const tools = Object.values(inventoryConfig.items).filter((i) => i.category === "tool");
		for (const tool of tools) {
			expect(tool.maxStack).toBe(1);
		}
	});
});
