import {
	findCityForPoi,
	findNearbyPoiContext,
	markDiscoveredPoisNearPosition,
} from "../poiSession";
import type { WorldSessionSnapshot } from "../snapshots";

function createSession(): WorldSessionSnapshot {
	return {
		saveGame: {
			id: 1,
			name: "Session Test",
			world_seed: 7,
			map_size: "small",
			difficulty: "standard",
			climate_profile: "temperate",
			storm_profile: "volatile",
			created_at: 0,
			last_played_at: 0,
			playtime_seconds: 0,
		},
		config: {
			worldSeed: 7,
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
				r: 1,
				discovered: 0,
			},
			{
				id: 2,
				world_map_id: 1,
				type: "coast_mines",
				name: "Coast Mines",
				q: 10,
				r: 10,
				discovered: 0,
			},
		],
		cityInstances: [
			{
				id: 9,
				world_map_id: 1,
				poi_id: 1,
				name: "Science Campus",
				world_q: 2,
				world_r: 1,
				layout_seed: 99,
				generation_status: "reserved",
				state: "latent",
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

describe("poiSession", () => {
	it("finds the linked city instance for a poi", () => {
		expect(findCityForPoi(createSession(), 1)?.id).toBe(9);
		expect(findCityForPoi(createSession(), 999)).toBeNull();
	});

	it("marks nearby pois as discovered", () => {
		const session = createSession();
		markDiscoveredPoisNearPosition(session, { x: 0, z: 0 });

		expect(session.pointsOfInterest[0]?.discovered).toBe(1);
		expect(session.pointsOfInterest[1]?.discovered).toBe(0);
	});

	it("builds the nearest nearby-poi context", () => {
		const session = createSession();
		markDiscoveredPoisNearPosition(session, { x: 1, z: 1 });

		expect(findNearbyPoiContext(session, { x: 1, z: 1 })).toMatchObject({
			cityInstanceId: 9,
			name: "Science Campus",
			poiId: 1,
			poiType: "science_campus",
			discovered: true,
		});
	});
});
