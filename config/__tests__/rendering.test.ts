import renderingConfig from "../rendering.json";

describe("rendering.json", () => {
	it("has positive selection ray distance", () => {
		expect(renderingConfig.selectionRayMaxDistance).toBeGreaterThan(0);
	});

	it("shadow map size is a power of 2", () => {
		const size = renderingConfig.shadowMapSize;
		expect(size).toBeGreaterThan(0);
		expect(Math.log2(size) % 1).toBe(0);
	});

	it("max particles is positive", () => {
		expect(renderingConfig.maxParticles).toBeGreaterThan(0);
	});

	it("LOD distances are sorted ascending", () => {
		const lods = renderingConfig.lodDistances;
		expect(lods.length).toBeGreaterThanOrEqual(2);
		for (let i = 1; i < lods.length; i++) {
			expect(lods[i]).toBeGreaterThan(lods[i - 1]);
		}
	});

	describe("unitColors", () => {
		it("has player and enemy colors", () => {
			expect(typeof renderingConfig.unitColors.player).toBe("string");
			expect(typeof renderingConfig.unitColors.enemy).toBe("string");
		});
	});

	describe("fogOfWar", () => {
		it("has positive grid resolution and vision range", () => {
			expect(renderingConfig.fogOfWar.gridResolution).toBeGreaterThan(0);
			expect(renderingConfig.fogOfWar.defaultVisionRange).toBeGreaterThan(0);
		});

		it("explored darkness is between 0 and 1", () => {
			expect(renderingConfig.fogOfWar.exploredDarkness).toBeGreaterThanOrEqual(0);
			expect(renderingConfig.fogOfWar.exploredDarkness).toBeLessThanOrEqual(1);
		});
	});

	describe("terrainPBR", () => {
		it("has valid material properties", () => {
			const mat = renderingConfig.terrainPBR.primaryMaterial;
			expect(mat.metalness).toBeGreaterThanOrEqual(0);
			expect(mat.metalness).toBeLessThanOrEqual(1);
			expect(mat.roughness).toBeGreaterThanOrEqual(0);
			expect(mat.roughness).toBeLessThanOrEqual(1);
		});
	});

	describe("decals", () => {
		it("has at least 3 decal types", () => {
			expect(Object.keys(renderingConfig.decals.types).length).toBeGreaterThanOrEqual(3);
		});

		it("each decal type has valid opacity", () => {
			for (const [, decal] of Object.entries(renderingConfig.decals.types)) {
				expect(decal.opacity).toBeGreaterThan(0);
				expect(decal.opacity).toBeLessThanOrEqual(1);
			}
		});
	});
});
