import { FakeDatabase } from "../../db/__tests__/helpers/fakeDatabase";
import { initializeDatabaseSync } from "../../db/bootstrap";
import { setWorldPersistenceDatabaseResolver } from "../../db/worldPersistence";
import { foundCitySite, surveyCitySite } from "../poiActions";
import { resetRuntimeState } from "../runtimeState";
import { clearActiveWorldSession, setActiveWorldSession } from "../session";

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
				sector_scale: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				sectorScale: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			ecumenopolis: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				sector_scale: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_sector_id: "command_arcology",
				spawn_anchor_key: "0,0",
				generated_at: 0,
			},
			sectorCells: [],
			sectorStructures: [],
			pointsOfInterest: [],
			cityInstances: [
				{
					id: 7,
					ecumenopolis_id: 1,
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
				sector_scale: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				sectorScale: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			ecumenopolis: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				sector_scale: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_sector_id: "command_arcology",
				spawn_anchor_key: "0,0",
				generated_at: 0,
			},
			sectorCells: [],
			sectorStructures: [],
			pointsOfInterest: [],
			cityInstances: [
				{
					id: 8,
					ecumenopolis_id: 1,
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
