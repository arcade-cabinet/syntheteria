import terrainConfig from "../terrain.json";
import biomesConfig from "../biomes.json";

describe("terrain.json", () => {
	it("has positive world size", () => {
		expect(terrainConfig.worldSize).toBeGreaterThan(0);
	});

	it("water level is between 0 and 1", () => {
		expect(terrainConfig.waterLevel).toBeGreaterThanOrEqual(0);
		expect(terrainConfig.waterLevel).toBeLessThanOrEqual(1);
	});

	it("has positive height parameters", () => {
		expect(terrainConfig.heightLayers).toBeGreaterThan(0);
		expect(terrainConfig.heightScale).toBeGreaterThan(0);
		expect(terrainConfig.terrainFrequency).toBeGreaterThan(0);
	});

	describe("walkCost", () => {
		it("water is impassable (cost 0)", () => {
			expect(terrainConfig.walkCost.water).toBe(0);
		});

		it("normal terrain has base cost 1", () => {
			expect(terrainConfig.walkCost.normal).toBe(1);
		});

		it("rough and steep cost more than normal", () => {
			expect(terrainConfig.walkCost.rough).toBeGreaterThan(terrainConfig.walkCost.normal);
			expect(terrainConfig.walkCost.steep).toBeGreaterThan(terrainConfig.walkCost.rough);
		});

		it("thresholds are between 0 and 1", () => {
			expect(terrainConfig.walkCost.roughThreshold).toBeGreaterThan(0);
			expect(terrainConfig.walkCost.roughThreshold).toBeLessThan(1);
			expect(terrainConfig.walkCost.steepThreshold).toBeGreaterThan(
				terrainConfig.walkCost.roughThreshold,
			);
		});
	});

	describe("biomes", () => {
		it("has at least 4 biomes", () => {
			expect(Object.keys(terrainConfig.biomes).length).toBeGreaterThanOrEqual(4);
		});

		it("each biome has a color", () => {
			for (const [, biome] of Object.entries(terrainConfig.biomes)) {
				expect(typeof biome.color).toBe("string");
				expect(biome.color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});

		it("terrain biome names match biomes.json canonical names", () => {
			const canonicalBiomes = new Set(Object.keys(biomesConfig.biomes));
			for (const name of Object.keys(terrainConfig.biomes)) {
				expect(canonicalBiomes.has(name)).toBe(true);
			}
		});

		it("has all 7 canonical biomes from biomes.json", () => {
			const terrainBiomes = new Set(Object.keys(terrainConfig.biomes));
			for (const name of Object.keys(biomesConfig.biomes)) {
				expect(terrainBiomes.has(name)).toBe(true);
			}
		});
	});
});
