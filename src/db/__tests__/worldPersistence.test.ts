import { defaultResourcePool } from "../../systems/resources";
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
			sectorScale: "small" as const,
			difficulty: "hard" as const,
			climateProfile: "wet" as const,
			stormProfile: "cataclysmic" as const,
		};
		const saveGame = createSaveGameSync(config, database);
		const generatedWorld = generateWorldData(config);

		persistGeneratedWorldSync(saveGame!, config, generatedWorld, database);
		const persisted = getPersistedWorldSync(saveGame!, database);

		expect(persisted.ecumenopolis.width).toBe(
			generatedWorld.ecumenopolis.width,
		);
		expect(persisted.ecumenopolis.height).toBe(
			generatedWorld.ecumenopolis.height,
		);
		expect(persisted.sectorCells).toHaveLength(
			generatedWorld.sectorCells.length,
		);
		expect(persisted.sectorStructures).toHaveLength(
			generatedWorld.sectorStructures.length,
		);
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
		expect(persisted.entities).toHaveLength(10);
		const unit = persisted.entities.find(
			(entity) => entity.entity_id === "unit_0",
		);
		const hauler = persisted.entities.find(
			(entity) => entity.bot_archetype_id === "relay_hauler",
		);
		const fabricator = persisted.entities.find(
			(entity) => entity.bot_archetype_id === "fabrication_rig",
		);
		const engineer = persisted.entities.find(
			(entity) => entity.bot_archetype_id === "defense_sentry",
		);
		const fighter = persisted.entities.find(
			(entity) => entity.bot_archetype_id === "assault_strider",
		);
		const rod = persisted.entities.find(
			(entity) => entity.building_type === "lightning_rod",
		);
		const rivalCluster = persisted.entities.filter(
			(entity) => entity.faction === "rogue",
		);
		const cultCluster = persisted.entities.filter(
			(entity) => entity.faction === "cultist",
		);
		expect(unit?.entity_id).toBe("unit_0");
		expect(unit?.bot_archetype_id).toBe("field_technician");
		expect(unit?.mark_level).toBe(1);
		expect(unit?.speech_profile).toBe("mentor");
		expect(unit?.selected).toBe(1);
		expect(hauler?.unit_type).toBe("mecha_scout");
		expect(fabricator?.unit_type).toBe("fabrication_unit");
		expect(engineer?.unit_type).toBe("mecha_golem");
		expect(fighter?.unit_type).toBe("field_fighter");
		expect(rod?.building_type).toBe("lightning_rod");
		expect(rivalCluster).toHaveLength(2);
		expect(cultCluster).toHaveLength(2);
		expect(
			rivalCluster.every((entity) => entity.ai_role === "hostile_machine"),
		).toBe(true);
		expect(cultCluster.every((entity) => entity.ai_role === "cultist")).toBe(
			true,
		);
		expect(
			persisted.sectorStructures.some(
				(structure) => structure.source === "landmark",
			),
		).toBe(true);
	});

	it("persists runtime campaign state updates", () => {
		const database = new FakeDatabase();
		const config = {
			worldSeed: 42,
			sectorScale: "small" as const,
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
				ecumenopolisId: persisted.ecumenopolis.id,
				tick: 120,
				activeScene: "city",
				activeCityInstanceId: persisted.cityInstances[0]?.id ?? null,
				resources: {
					scrapMetal: 12,
					eWaste: 4,
					intactComponents: 1,
				},
				sectorCells: persisted.sectorCells.slice(0, 2).map((tile, index) => ({
					q: tile.q,
					r: tile.r,
					discovery_state: (index + 1) as 1 | 2,
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
						botArchetypeId: "field_technician",
						markLevel: 1,
						speechProfile: "mentor",
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
		const unit = reloaded.entities.find(
			(entity) => entity.entity_id === "unit_0",
		);
		expect(unit?.x).toBe(4);
		expect(unit?.selected).toBe(1);
		expect(unit?.bot_archetype_id).toBe("field_technician");
		expect(unit?.mark_level).toBe(1);
		expect(unit?.speech_profile).toBe("mentor");
	});
});
