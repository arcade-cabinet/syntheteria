import assetMappingConfig from "../assetMapping.json";

describe("assetMapping.json", () => {
	it("has building asset mappings", () => {
		expect(assetMappingConfig.buildings).toBeDefined();
		expect(Object.keys(assetMappingConfig.buildings).length).toBeGreaterThanOrEqual(3);
	});

	it("each building mapping has models array", () => {
		for (const [, building] of Object.entries(assetMappingConfig.buildings)) {
			expect(Array.isArray(building.models)).toBe(true);
			expect(building.models.length).toBeGreaterThan(0);
			expect(typeof building.description).toBe("string");
		}
	});

	it("has infrastructure mappings", () => {
		expect(assetMappingConfig.infrastructure).toBeDefined();
		expect(Object.keys(assetMappingConfig.infrastructure).length).toBeGreaterThan(0);
	});

	it("has terrain mappings", () => {
		expect(assetMappingConfig.terrain).toBeDefined();
	});

	it("has faction visual overrides for all 4 factions", () => {
		const factions = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"];
		for (const faction of factions) {
			expect(
				assetMappingConfig.factionVisualOverrides[
					faction as keyof typeof assetMappingConfig.factionVisualOverrides
				],
			).toBeDefined();
		}
	});

	it("model paths end in .glb", () => {
		for (const [, building] of Object.entries(assetMappingConfig.buildings)) {
			for (const model of building.models) {
				expect(model).toMatch(/\.glb$/);
			}
		}
	});
});
