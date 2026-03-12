import { getCitySiteViewModel } from "../citySiteActions";
import type { CityRuntimeSnapshot, NearbyPoiContext } from "../snapshots";

function createContext(poiType: NearbyPoiContext["poiType"]): NearbyPoiContext {
	return {
		cityInstanceId: 9,
		discovered: true,
		distance: 1.4,
		name: "Test Site",
		poiId: 2,
		poiType,
	};
}

function createCity(state: CityRuntimeSnapshot["state"]): CityRuntimeSnapshot {
	return {
		id: 9,
		world_map_id: 1,
		poi_id: 2,
		name: "Test Site",
		world_q: 3,
		world_r: 3,
		layout_seed: 88,
		generation_status: "reserved",
		state,
	};
}

describe("citySiteActions", () => {
	it("offers survey and found actions for latent claimable sites", () => {
		const viewModel = getCitySiteViewModel({
			city: createCity("latent"),
			context: createContext("science_campus"),
			mode: "world",
		});

		expect(viewModel.actions.map((action) => action.id)).toEqual([
			"survey",
			"found",
		]);
		expect(viewModel.cityStatus).toBe("Unsurveyed Shell");
	});

	it("offers enter and return inside founded city scenes", () => {
		const viewModel = getCitySiteViewModel({
			city: createCity("founded"),
			context: createContext("home_base"),
			mode: "city",
		});

		expect(viewModel.actions.map((action) => action.id)).toEqual([
			"enter",
			"return",
		]);
		expect(viewModel.cityStatus).toBe("Founded City");
	});

	it("blocks founding for hostile sites", () => {
		const viewModel = getCitySiteViewModel({
			city: createCity("surveyed"),
			context: createContext("northern_cult_site"),
			mode: "world",
		});

		expect(viewModel.actions.map((action) => action.id)).toEqual(["enter"]);
		expect(viewModel.presentation.foundationLabel).toBe("Cannot Found");
	});
});
