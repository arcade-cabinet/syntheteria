import { getActiveLocationContext } from "../locationContext";
import type { WorldSessionSnapshot } from "../snapshots";

function createSession(): WorldSessionSnapshot {
	return {
		saveGame: {
			id: 1,
			name: "Location Test",
			world_seed: 4,
			map_size: "small",
			difficulty: "standard",
			climate_profile: "temperate",
			storm_profile: "volatile",
			created_at: 0,
			last_played_at: 0,
			playtime_seconds: 0,
		},
		config: {
			worldSeed: 4,
			mapSize: "small",
			difficulty: "standard",
			climateProfile: "temperate",
			stormProfile: "volatile",
		},
		worldMap: {
			id: 1,
			save_game_id: 1,
			width: 20,
			height: 20,
			map_size: "small",
			climate_profile: "temperate",
			storm_profile: "volatile",
			spawn_q: 0,
			spawn_r: 0,
			generated_at: 0,
		},
		tiles: [],
		pointsOfInterest: [
			{
				id: 1,
				world_map_id: 1,
				type: "science_campus",
				name: "Science Campus",
				q: 2,
				r: 2,
				discovered: 1,
			},
		],
		cityInstances: [
			{
				id: 7,
				world_map_id: 1,
				poi_id: 1,
				name: "Science Campus",
				world_q: 2,
				world_r: 2,
				layout_seed: 55,
				generation_status: "reserved",
				state: "surveyed",
			},
		],
		campaignState: {
			id: 1,
			save_game_id: 1,
			active_scene: "world",
			active_city_instance_id: null,
			current_tick: 0,
			last_synced_at: 0,
		},
		resourceState: {
			id: 1,
			save_game_id: 1,
			scrap_metal: 0,
			e_waste: 0,
			intact_components: 0,
			last_synced_at: 0,
		},
	};
}

describe("locationContext", () => {
	it("resolves world-scene nearby poi context", () => {
		const session = createSession();
		const context = getActiveLocationContext({
			activeCityInstanceId: null,
			activeScene: "world",
			nearbyPoi: {
				cityInstanceId: 7,
				discovered: true,
				distance: 1.2,
				name: "Science Campus",
				poiId: 1,
				poiType: "science_campus",
			},
			session,
		});

		expect(context.activeCity?.id).toBe(7);
		expect(context.poi?.id).toBe(1);
		expect(context.presentation?.badge).toBe("Science Campus");
	});

	it("resolves city-scene active city context", () => {
		const session = createSession();
		const context = getActiveLocationContext({
			activeCityInstanceId: 7,
			activeScene: "city",
			nearbyPoi: null,
			session,
		});

		expect(context.activeCity?.id).toBe(7);
		expect(context.poi?.id).toBe(1);
		expect(context.presentation?.enterLabel).toBe("Inspect Research Wing");
	});

	it("returns empty context without session", () => {
		expect(
			getActiveLocationContext({
				activeCityInstanceId: null,
				activeScene: "world",
				nearbyPoi: null,
				session: null,
			}),
		).toEqual({
			activeCity: null,
			poi: null,
			presentation: null,
		});
	});
});
