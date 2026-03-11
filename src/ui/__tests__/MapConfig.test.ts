/**
 * Tests for MapConfig — DEFAULT_MAP_SETTINGS constant and MapSettings shape.
 *
 * The MapConfig component's seed phrase uses randomSeed() at module load,
 * so we validate shape and field constraints without relying on a specific phrase.
 */

import { DEFAULT_MAP_SETTINGS, type MapSettings } from "../MapConfig";

describe("DEFAULT_MAP_SETTINGS", () => {
	it("has mapSize of 'medium'", () => {
		expect(DEFAULT_MAP_SETTINGS.mapSize).toBe("medium");
	});

	it("has oreDensity of 'normal'", () => {
		expect(DEFAULT_MAP_SETTINGS.oreDensity).toBe("normal");
	});

	it("has stormIntensity of 'moderate'", () => {
		expect(DEFAULT_MAP_SETTINGS.stormIntensity).toBe("moderate");
	});

	it("has startingResources of 'standard'", () => {
		expect(DEFAULT_MAP_SETTINGS.startingResources).toBe("standard");
	});

	it("has a non-empty seedPhrase string", () => {
		expect(typeof DEFAULT_MAP_SETTINGS.seedPhrase).toBe("string");
		expect(DEFAULT_MAP_SETTINGS.seedPhrase.length).toBeGreaterThan(0);
	});

	it("seedPhrase is in adj-adj-noun format", () => {
		const parts = DEFAULT_MAP_SETTINGS.seedPhrase.split("-");
		expect(parts.length).toBe(3);
		for (const part of parts) {
			expect(part.length).toBeGreaterThan(0);
		}
	});

	it("all required MapSettings keys are present", () => {
		const keys: (keyof MapSettings)[] = [
			"mapSize",
			"oreDensity",
			"stormIntensity",
			"startingResources",
			"seedPhrase",
		];
		for (const key of keys) {
			expect(DEFAULT_MAP_SETTINGS).toHaveProperty(key);
		}
	});
});

// ---------------------------------------------------------------------------
// MapSettings type validation through valid values
// ---------------------------------------------------------------------------

describe("MapSettings valid values", () => {
	it("mapSize accepts small/medium/large", () => {
		const sizes: MapSettings["mapSize"][] = ["small", "medium", "large"];
		for (const size of sizes) {
			const settings: MapSettings = { ...DEFAULT_MAP_SETTINGS, mapSize: size };
			expect(settings.mapSize).toBe(size);
		}
	});

	it("oreDensity accepts sparse/normal/rich", () => {
		const densities: MapSettings["oreDensity"][] = [
			"sparse",
			"normal",
			"rich",
		];
		for (const density of densities) {
			const settings: MapSettings = {
				...DEFAULT_MAP_SETTINGS,
				oreDensity: density,
			};
			expect(settings.oreDensity).toBe(density);
		}
	});

	it("stormIntensity accepts calm/moderate/violent", () => {
		const intensities: MapSettings["stormIntensity"][] = [
			"calm",
			"moderate",
			"violent",
		];
		for (const intensity of intensities) {
			const settings: MapSettings = {
				...DEFAULT_MAP_SETTINGS,
				stormIntensity: intensity,
			};
			expect(settings.stormIntensity).toBe(intensity);
		}
	});

	it("startingResources accepts minimal/standard/abundant", () => {
		const resources: MapSettings["startingResources"][] = [
			"minimal",
			"standard",
			"abundant",
		];
		for (const resource of resources) {
			const settings: MapSettings = {
				...DEFAULT_MAP_SETTINGS,
				startingResources: resource,
			};
			expect(settings.startingResources).toBe(resource);
		}
	});

	it("settings object can be spread to override individual fields", () => {
		const custom: MapSettings = {
			...DEFAULT_MAP_SETTINGS,
			mapSize: "large",
			oreDensity: "rich",
		};
		expect(custom.mapSize).toBe("large");
		expect(custom.oreDensity).toBe("rich");
		// other fields unchanged
		expect(custom.stormIntensity).toBe(DEFAULT_MAP_SETTINGS.stormIntensity);
		expect(custom.startingResources).toBe(
			DEFAULT_MAP_SETTINGS.startingResources,
		);
	});
});
