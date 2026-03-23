import { generateWorldData } from "../../world/generation";
import { createSaveGameSync } from "../saveGames";
import {
	getPersistedWorldSync,
	persistGeneratedWorldSync,
	persistRuntimeWorldStateSync,
} from "../worldPersistence";
import { FakeDatabase } from "./helpers/fakeDatabase";

describe("world persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists and reloads generated world data", () => {
		const database = new FakeDatabase();
		const config = {
			worldSeed: 42,
			mapSize: "small" as const,
			difficulty: "hard" as const,
			climateProfile: "wet" as const,
			stormProfile: "cataclysmic" as const,
		};
		const saveGame = createSaveGameSync(config, database);
		const generatedWorld = generateWorldData(config);

		persistGeneratedWorldSync(saveGame!, config, generatedWorld, database);
		const persisted = getPersistedWorldSync(saveGame!, database);

		expect(persisted.worldMap.width).toBe(generatedWorld.map.width);
		expect(persisted.worldMap.height).toBe(generatedWorld.map.height);
		expect(persisted.tiles).toHaveLength(generatedWorld.tiles.length);
		expect(persisted.pointsOfInterest).toHaveLength(
			generatedWorld.pointsOfInterest.length,
		);
		expect(persisted.cityInstances).toHaveLength(
			generatedWorld.cityInstances.length,
		);
		expect(
			persisted.pointsOfInterest.some((poi) => poi.type === "home_base"),
		).toBe(true);
		expect(persisted.campaignState.active_scene).toBe("world");
		expect(persisted.resourceState.scrap_metal).toBe(0);
		expect(persisted.entities).toHaveLength(2);
		expect(persisted.entities[0]?.entity_id).toBe("unit_0");
		expect(persisted.entities[1]?.building_type).toBe("lightning_rod");
	});

	it("persists runtime campaign state updates", () => {
		const database = new FakeDatabase();
		const config = {
			worldSeed: 42,
			mapSize: "small" as const,
			difficulty: "hard" as const,
			climateProfile: "wet" as const,
			stormProfile: "cataclysmic" as const,
		};
		const saveGame = createSaveGameSync(config, database);
		const generatedWorld = generateWorldData(config);

		persistGeneratedWorldSync(saveGame!, config, generatedWorld, database);
		const persisted = getPersistedWorldSync(saveGame!, database);

		persistRuntimeWorldStateSync(
			{
				saveGameId: saveGame!.id,
				worldMapId: persisted.worldMap.id,
				tick: 120,
				activeScene: "city",
				activeCityInstanceId: persisted.cityInstances[0]?.id ?? null,
				resources: {
					scrapMetal: 12,
					eWaste: 4,
					intactComponents: 1,
				},
				tiles: persisted.tiles.slice(0, 2).map((tile, index) => ({
					q: tile.q,
					r: tile.r,
					fog_state: (index + 1) as 1 | 2,
				})),
				pointsOfInterest: persisted.pointsOfInterest.slice(0, 1).map((poi) => ({
					id: poi.id,
					discovered: 1,
				})),
				cityInstances: persisted.cityInstances.slice(0, 1).map((city) => ({
					id: city.id,
					state: "surveyed" as const,
				})),
				entities: [
					{
						entityId: "unit_0",
						sceneLocation: "world",
						sceneBuildingId: null,
						faction: "player",
						unitType: "maintenance_bot",
						buildingType: null,
						displayName: "Maintenance Bot",
						fragmentId: "world_primary",
						x: 4,
						y: 0,
						z: 5,
						speed: 2,
						selected: true,
						components: [],
						navigation: { path: [], pathIndex: 0, moving: false },
						aiRole: "player_unit",
						aiStateJson: null,
						powered: null,
						operational: null,
						rodCapacity: null,
						currentOutput: null,
						protectionRadius: null,
					},
				],
			},
			database,
		);

		const reloaded = getPersistedWorldSync(saveGame!, database);
		expect(reloaded.campaignState.active_scene).toBe("city");
		expect(reloaded.resourceState.scrap_metal).toBe(12);
		expect(reloaded.pointsOfInterest[0]?.discovered).toBe(1);
		expect(reloaded.cityInstances[0]?.state).toBe("surveyed");
		expect(reloaded.entities).toHaveLength(1);
		expect(reloaded.entities[0]?.x).toBe(4);
		expect(reloaded.entities[0]?.selected).toBe(1);
	});
});
