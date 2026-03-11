import hazardsConfig from "../environmentHazards.json";
import biomesConfig from "../biomes.json";

describe("environmentHazards.json", () => {
	const hazardTypes = Object.entries(hazardsConfig.hazardTypes);

	it("has at least 4 hazard types", () => {
		expect(hazardTypes.length).toBeGreaterThanOrEqual(4);
	});

	it("each hazard has required fields", () => {
		for (const [, hazard] of hazardTypes) {
			expect(typeof hazard.damagePerTick).toBe("number");
			expect(hazard.damagePerTick).toBeGreaterThanOrEqual(0);
			expect(typeof hazard.movementModifier).toBe("number");
			expect(hazard.movementModifier).toBeGreaterThanOrEqual(0);
			expect(typeof hazard.defaultRadius).toBe("number");
			expect(hazard.defaultRadius).toBeGreaterThan(0);
			expect(typeof hazard.defaultIntensity).toBe("number");
			expect(typeof hazard.defaultDurationTicks).toBe("number");
			expect(hazard.defaultDurationTicks).toBeGreaterThan(0);
			expect(typeof hazard.color).toBe("string");
			expect(hazard.color).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("scrap_storm drops resources", () => {
		expect(hazardsConfig.hazardTypes.scrap_storm.dropsResources).toBe(true);
		expect(hazardsConfig.hazardTypes.scrap_storm.resourceDropTypes!.length).toBeGreaterThan(0);
	});

	it("has positive spawn parameters", () => {
		expect(hazardsConfig.spawnIntervalTicks).toBeGreaterThan(0);
		expect(hazardsConfig.maxActiveHazards).toBeGreaterThan(0);
		expect(hazardsConfig.spawnChancePerInterval).toBeGreaterThan(0);
		expect(hazardsConfig.spawnChancePerInterval).toBeLessThanOrEqual(1);
	});

	it("hazard type names align with biomes.json terrain hazard names", () => {
		// biomes.json terrain.hazards defines the canonical in-game hazard names
		const biomeHazardNames = new Set(Object.keys(biomesConfig.terrain.hazards));
		const envHazardNames = Object.keys(hazardsConfig.hazardTypes);
		// Every environmentHazards type should either be in biomes.json or be a
		// well-known extension (scrap_storm is a weather-driven dynamic event)
		const allowedExtensions = new Set(["scrap_storm"]);
		for (const name of envHazardNames) {
			const isCanonical = biomeHazardNames.has(name);
			const isExtension = allowedExtensions.has(name);
			expect(isCanonical || isExtension).toBe(true);
		}
	});

	it("no stale hazard types from old design (no radiation_zone, no toxic_spill)", () => {
		const names = Object.keys(hazardsConfig.hazardTypes);
		expect(names).not.toContain("radiation_zone");
		expect(names).not.toContain("toxic_spill");
		expect(names).not.toContain("unstable_ground");
	});
});
