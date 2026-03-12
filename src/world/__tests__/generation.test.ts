import { createNewGameConfig } from "../config";
import { generateWorldData } from "../generation";

describe("world generation", () => {
	it("is deterministic for the same config", () => {
		const config = createNewGameConfig(1337, {
			mapSize: "standard",
			climateProfile: "temperate",
			stormProfile: "volatile",
		});

		const first = generateWorldData(config);
		const second = generateWorldData(config);

		expect(second).toEqual(first);
	});

	it("changes map dimensions when map size changes", () => {
		const small = generateWorldData(
			createNewGameConfig(9, { mapSize: "small" }),
		);
		const large = generateWorldData(
			createNewGameConfig(9, { mapSize: "large" }),
		);

		expect(small.map.width).toBeLessThan(large.map.width);
		expect(small.tiles.length).toBeLessThan(large.tiles.length);
	});

	it("guarantees key world POIs and reserved city seeds", () => {
		const world = generateWorldData(
			createNewGameConfig(77, {
				mapSize: "standard",
				climateProfile: "wet",
				stormProfile: "cataclysmic",
			}),
		);

		expect(world.pointsOfInterest.map((poi) => poi.type)).toEqual(
			expect.arrayContaining([
				"home_base",
				"coast_mines",
				"science_campus",
				"northern_cult_site",
				"deep_sea_gateway",
			]),
		);
		expect(
			world.cityInstances.every((city) => city.generationStatus === "reserved"),
		).toBe(true);
	});
});
