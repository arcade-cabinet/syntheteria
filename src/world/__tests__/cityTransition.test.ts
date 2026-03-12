import { FakeDatabase } from "../../db/__tests__/helpers/fakeDatabase";
import { initializeDatabaseSync } from "../../db/bootstrap";
import { createSaveGameSync } from "../../db/saveGames";
import {
	persistGeneratedWorldSync,
	setWorldPersistenceDatabaseResolver,
} from "../../db/worldPersistence";
import {
	enterCityInstance,
	getActiveCityInstance,
	returnToWorld,
} from "../cityTransition";
import { getRuntimeState, resetRuntimeState } from "../runtimeState";
import { clearActiveWorldSession, setActiveWorldSession } from "../session";

describe("cityTransition", () => {
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

	it("switches between world and city scenes using a persisted city instance", () => {
		const saveGame = createSaveGameSync({ worldSeed: 1 }, database)!;
		persistGeneratedWorldSync(
			saveGame,
			{
				worldSeed: 1,
				mapSize: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			{
				map: {
					width: 40,
					height: 40,
					spawnQ: 0,
					spawnR: 0,
				},
				tiles: [],
				pointsOfInterest: [],
				cityInstances: [
					{
						poiType: "home_base",
						name: "Relay Home Base",
						worldQ: 0,
						worldR: 0,
						layoutSeed: 22,
						state: "latent",
						generationStatus: "reserved",
					},
				],
			},
			database,
		);

		setActiveWorldSession({
			saveGame,
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
					id: 1,
					world_map_id: 1,
					poi_id: null,
					name: "Relay Home Base",
					world_q: 0,
					world_r: 0,
					layout_seed: 22,
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

		enterCityInstance(1);
		expect(getRuntimeState().activeScene).toBe("city");
		expect(getActiveCityInstance()?.id).toBe(1);

		returnToWorld();
		expect(getRuntimeState().activeScene).toBe("world");
		expect(getRuntimeState().activeCityInstanceId).toBeNull();
	});
});
