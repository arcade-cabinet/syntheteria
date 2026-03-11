import mapPresetsConfig from "../mapPresets.json";

describe("mapPresets.json", () => {
	const presetIds = ["standard", "abundant", "hostile", "marathon", "duel", "survival"] as const;

	it("has all 6 presets", () => {
		for (const id of presetIds) {
			expect(mapPresetsConfig[id]).toBeDefined();
		}
	});

	it("each preset has required fields", () => {
		for (const id of presetIds) {
			const preset = mapPresetsConfig[id];
			expect(typeof preset.name).toBe("string");
			expect(typeof preset.description).toBe("string");
			expect(preset.description.length).toBeGreaterThan(10);
			expect(typeof preset.worldSize).toBe("number");
			expect(preset.worldSize).toBeGreaterThan(0);
			expect(typeof preset.oreAbundance).toBe("number");
			expect(preset.oreAbundance).toBeGreaterThan(0);
			expect(typeof preset.enemyDensity).toBe("number");
			expect(preset.enemyDensity).toBeGreaterThanOrEqual(0);
			expect(typeof preset.aiOpponents).toBe("number");
			expect(preset.aiOpponents).toBeGreaterThanOrEqual(0);
			expect(typeof preset.stormSeverity).toBe("number");
			expect(typeof preset.startingResources).toBe("string");
		}
	});

	it("starting resource tiers exist in startingResources lookup", () => {
		const validTiers = Object.keys(mapPresetsConfig.startingResources);
		for (const id of presetIds) {
			expect(validTiers).toContain(mapPresetsConfig[id].startingResources);
		}
	});

	it("startingResources tiers have resource amounts", () => {
		for (const [, tier] of Object.entries(mapPresetsConfig.startingResources)) {
			expect(typeof tier.scrapMetal).toBe("number");
			expect(tier.scrapMetal).toBeGreaterThanOrEqual(0);
		}
	});

	it("marathon has largest world size", () => {
		expect(mapPresetsConfig.marathon.worldSize).toBeGreaterThan(
			mapPresetsConfig.standard.worldSize,
		);
	});

	it("survival has no AI opponents", () => {
		expect(mapPresetsConfig.survival.aiOpponents).toBe(0);
	});

	describe("navmesh", () => {
		it("has positive nav step", () => {
			expect(mapPresetsConfig.navmesh.navStep).toBeGreaterThan(0);
		});

		it("has max A* nodes limit", () => {
			expect(mapPresetsConfig.navmesh.maxAStarNodes).toBeGreaterThan(0);
		});
	});
});
