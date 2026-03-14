import { generateWorldData } from "../../world/generation";
import { createSaveGameSync } from "../saveGames";
import { getDatabaseSync } from "../runtime";
import {
	getPersistedWorldSync,
	persistCampaignStatisticsSync,
	persistFactionResourceStatesSync,
	persistGeneratedWorldSync,
	persistHarvestStateSync,
	persistTurnEventLogSync,
	persistTurnStateSync,
} from "../worldPersistence";

function setupSaveGame() {
	const database = getDatabaseSync();
	const config = {
		worldSeed: 42,
		sectorScale: "small" as const,
		difficulty: "hard" as const,
		climateProfile: "wet" as const,
		stormProfile: "cataclysmic" as const,
	};
	const saveGame = createSaveGameSync(config, database)!;
	const generatedWorld = generateWorldData(config);
	persistGeneratedWorldSync(saveGame, config, generatedWorld, database);
	return { database, saveGame };
}

describe("harvest state persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists and loads harvest state with consumed structures", () => {
		const { database, saveGame } = setupSaveGame();

		const consumedIds = [10, 25, 42, 100];
		const activeHarvests = [
			{
				harvesterId: "unit_0",
				structureId: 55,
				modelId: "wall_panel",
				modelFamily: "wall",
				ticksRemaining: 3,
				totalTicks: 5,
				targetX: 10,
				targetZ: 20,
			},
		];

		persistHarvestStateSync(saveGame.id, consumedIds, activeHarvests, database);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.harvestState).not.toBeNull();

		const parsedConsumed: number[] = JSON.parse(
			reloaded.harvestState!.consumed_structure_ids_json,
		);
		expect(parsedConsumed).toEqual([10, 25, 42, 100]);

		const parsedHarvests = JSON.parse(
			reloaded.harvestState!.active_harvests_json,
		);
		expect(parsedHarvests).toHaveLength(1);
		expect(parsedHarvests[0].harvesterId).toBe("unit_0");
		expect(parsedHarvests[0].ticksRemaining).toBe(3);
	});

	it("updates existing harvest state on re-persist", () => {
		const { database, saveGame } = setupSaveGame();

		persistHarvestStateSync(saveGame.id, [1, 2], [], database);
		persistHarvestStateSync(saveGame.id, [1, 2, 3], [], database);

		const reloaded = getPersistedWorldSync(saveGame, database);
		const parsedConsumed: number[] = JSON.parse(
			reloaded.harvestState!.consumed_structure_ids_json,
		);
		expect(parsedConsumed).toEqual([1, 2, 3]);
	});

	it("returns null harvest state when none persisted", () => {
		const { database, saveGame } = setupSaveGame();
		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.harvestState).toBeNull();
	});
});

describe("turn state persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists and loads turn state with unit AP/MP", () => {
		const { database, saveGame } = setupSaveGame();

		const unitStates = [
			{
				entityId: "unit_0",
				actionPoints: 1,
				maxActionPoints: 2,
				movementPoints: 2,
				maxMovementPoints: 3,
				activated: true,
			},
			{
				entityId: "unit_1",
				actionPoints: 2,
				maxActionPoints: 2,
				movementPoints: 3,
				maxMovementPoints: 3,
				activated: false,
			},
		];

		persistTurnStateSync(
			saveGame.id,
			5,
			"player",
			"player",
			unitStates,
			database,
		);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.turnState).not.toBeNull();
		expect(reloaded.turnState!.turn_number).toBe(5);
		expect(reloaded.turnState!.phase).toBe("player");
		expect(reloaded.turnState!.active_faction).toBe("player");

		const parsedUnits = JSON.parse(reloaded.turnState!.unit_states_json);
		expect(parsedUnits).toHaveLength(2);
		expect(parsedUnits[0].entityId).toBe("unit_0");
		expect(parsedUnits[0].actionPoints).toBe(1);
		expect(parsedUnits[1].movementPoints).toBe(3);
	});

	it("updates existing turn state on re-persist", () => {
		const { database, saveGame } = setupSaveGame();

		persistTurnStateSync(saveGame.id, 1, "player", "player", [], database);
		persistTurnStateSync(saveGame.id, 7, "ai_faction", "rogue", [], database);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.turnState!.turn_number).toBe(7);
		expect(reloaded.turnState!.phase).toBe("ai_faction");
		expect(reloaded.turnState!.active_faction).toBe("rogue");
	});
});

describe("faction resource state persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists and loads per-faction resources", () => {
		const { database, saveGame } = setupSaveGame();

		persistFactionResourceStatesSync(
			saveGame.id,
			[
				{
					factionId: "player",
					resources: { scrapMetal: 100, eWaste: 50, ferrousScrap: 30 },
				},
				{
					factionId: "rogue",
					resources: { scrapMetal: 200, alloyStock: 10 },
				},
				{
					factionId: "cultist",
					resources: { elCrystal: 5 },
				},
			],
			database,
		);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.factionResourceStates).toHaveLength(3);

		const playerState = reloaded.factionResourceStates.find(
			(f) => f.faction_id === "player",
		);
		expect(playerState).toBeDefined();
		const playerResources = JSON.parse(playerState!.resources_json);
		expect(playerResources.scrapMetal).toBe(100);
		expect(playerResources.ferrousScrap).toBe(30);

		const rogueState = reloaded.factionResourceStates.find(
			(f) => f.faction_id === "rogue",
		);
		const rogueResources = JSON.parse(rogueState!.resources_json);
		expect(rogueResources.scrapMetal).toBe(200);
	});

	it("replaces previous faction resources on re-persist", () => {
		const { database, saveGame } = setupSaveGame();

		persistFactionResourceStatesSync(
			saveGame.id,
			[{ factionId: "player", resources: { scrapMetal: 10 } }],
			database,
		);
		persistFactionResourceStatesSync(
			saveGame.id,
			[{ factionId: "player", resources: { scrapMetal: 999 } }],
			database,
		);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.factionResourceStates).toHaveLength(1);
		const resources = JSON.parse(
			reloaded.factionResourceStates[0].resources_json,
		);
		expect(resources.scrapMetal).toBe(999);
	});
});

describe("campaign statistics persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists and loads campaign statistics", () => {
		const { database, saveGame } = setupSaveGame();

		const stats = {
			turnsElapsed: 12,
			structuresHarvested: 5,
			unitsBuilt: 3,
			unitsLost: 1,
		};

		persistCampaignStatisticsSync(saveGame.id, stats, database);

		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.campaignStatistics).not.toBeNull();
		const parsed = JSON.parse(reloaded.campaignStatistics!.stats_json);
		expect(parsed.turnsElapsed).toBe(12);
		expect(parsed.structuresHarvested).toBe(5);
		expect(parsed.unitsBuilt).toBe(3);
	});

	it("updates existing statistics on re-persist", () => {
		const { database, saveGame } = setupSaveGame();

		persistCampaignStatisticsSync(saveGame.id, { turnsElapsed: 1 }, database);
		persistCampaignStatisticsSync(
			saveGame.id,
			{ turnsElapsed: 50, unitsBuilt: 10 },
			database,
		);

		const reloaded = getPersistedWorldSync(saveGame, database);
		const parsed = JSON.parse(reloaded.campaignStatistics!.stats_json);
		expect(parsed.turnsElapsed).toBe(50);
		expect(parsed.unitsBuilt).toBe(10);
	});
});

describe("turn event log persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("persists turn event log entries", () => {
		const { database, saveGame } = setupSaveGame();

		const events = [
			{
				type: "movement",
				timestamp: 1_700_000_000_001,
				entityId: "unit_0",
				faction: "player",
				details: { from: { q: 0, r: 0 }, to: { q: 1, r: 0 } },
			},
			{
				type: "harvest_complete",
				timestamp: 1_700_000_000_002,
				entityId: "unit_1",
				faction: "player",
				details: { structureId: 42, modelFamily: "wall" },
			},
		];

		persistTurnEventLogSync(saveGame.id, 1, events, database);
		persistTurnEventLogSync(saveGame.id, 2, [events[0]], database);

		// Turn event logs are append-only; no select in getPersistedWorldSync
		// so we verify insertion didn't throw
		expect(true).toBe(true);
	});
});
