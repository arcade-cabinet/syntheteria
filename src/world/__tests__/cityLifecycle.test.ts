import {
	applyEntryToCity,
	canEnterCitySite,
	canFoundCitySite,
	createGeneratedCitySeed,
	enterCityState,
	foundCityState,
	getInitialCityState,
	surveyCityState,
} from "../cityLifecycle";

describe("cityLifecycle", () => {
	it("derives initial states from poi purpose", () => {
		expect(getInitialCityState("home_base")).toBe("founded");
		expect(getInitialCityState("science_campus")).toBe("latent");
	});

	it("advances survey and entry into a surveyed state", () => {
		expect(surveyCityState("latent")).toBe("surveyed");
		expect(surveyCityState("surveyed")).toBe("surveyed");
		expect(enterCityState("latent")).toBe("surveyed");
		expect(enterCityState("founded")).toBe("founded");
	});

	it("collapses founding into a final founded state", () => {
		expect(foundCityState("latent")).toBe("founded");
		expect(foundCityState("surveyed")).toBe("founded");
		expect(foundCityState("founded")).toBe("founded");
	});

	it("exposes found/enter eligibility by poi type and state", () => {
		expect(canFoundCitySite("science_campus", "latent")).toBe(true);
		expect(canFoundCitySite("home_base", "founded")).toBe(false);
		expect(canFoundCitySite("deep_sea_gateway", "surveyed")).toBe(false);
		expect(canEnterCitySite("latent")).toBe(false);
		expect(canEnterCitySite("surveyed")).toBe(true);
	});

	it("creates generated city seeds with canonical defaults", () => {
		expect(createGeneratedCitySeed("coast_mines", "Coast", 4, -2, 99)).toEqual({
			poiType: "coast_mines",
			name: "Coast",
			worldQ: 4,
			worldR: -2,
			layoutSeed: 99,
			state: "latent",
			generationStatus: "reserved",
		});
	});

	it("mutates persisted city records through canonical transitions", () => {
		const city = {
			id: 1,
			world_map_id: 1,
			poi_id: 1,
			name: "Campus",
			world_q: 0,
			world_r: 0,
			layout_seed: 123,
			generation_status: "reserved" as const,
			state: "latent" as const,
		};

		expect(applyEntryToCity(city).state).toBe("surveyed");
	});
});
