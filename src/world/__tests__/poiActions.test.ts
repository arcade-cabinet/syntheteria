import { FakeDatabase } from "../../db/__tests__/helpers/fakeDatabase";
import { initializeDatabaseSync } from "../../db/bootstrap";
import { setWorldPersistenceDatabaseResolver } from "../../db/worldPersistence";
import { resetRuntimeState } from "../runtimeState";
import { clearActiveWorldSession, setActiveWorldSession } from "../session";
import { foundCitySite, surveyCitySite } from "../poiActions";

describe("poiActions", () => {
	const database = new FakeDatabase();

	beforeEach(() => {
		initializeDatabaseSync(database);
		setWorldPersistenceDatabaseResolver(() => database);
	});

	afterEach(() => {
		clearActiveWorldSession();
		resetRuntimeState();
		setWorldPersistenceDatabaseResolver(null);
	});

	it("surveys a latent city without founding it", () => {
		setActiveWorldSession({
			saveGame: {
				id: 1,
				name: "Survey Test",
				world_seed: 1,
				map_size: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				mapSize: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			worldMap: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				map_size: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_q: 0,
				spawn_r: 0,
				generated_at: 0,
			},
			tiles: [],
			pointsOfInterest: [],
			cityInstances: [
				{
					id: 7,
					world_map_id: 1,
					poi_id: 1,
					name: "Science Campus",
					world_q: 2,
					world_r: 3,
					layout_seed: 77,
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
		});

		expect(surveyCitySite(7).state).toBe("surveyed");
	});

	it("founds a surveyed city", () => {
		setActiveWorldSession({
			saveGame: {
				id: 1,
				name: "Found Test",
				world_seed: 1,
				map_size: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				mapSize: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			worldMap: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				map_size: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_q: 0,
				spawn_r: 0,
				generated_at: 0,
			},
			tiles: [],
			pointsOfInterest: [],
			cityInstances: [
				{
					id: 8,
					world_map_id: 1,
					poi_id: 1,
					name: "Coast Mines",
					world_q: -2,
					world_r: 5,
					layout_seed: 88,
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
		});

		expect(foundCitySite(8).state).toBe("founded");
	});
});
