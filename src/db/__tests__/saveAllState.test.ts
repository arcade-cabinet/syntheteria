import { createSaveGameSync } from "../saveGames";
import {
	getPersistedWorldSync,
	persistGeneratedWorldSync,
} from "../worldPersistence";
import { saveAllStateSync } from "../saveAllState";
import { generateWorldData } from "../../world/generation";
import { FakeDatabase } from "./helpers/fakeDatabase";
import { setWorldPersistenceDatabaseResolver } from "../worldPersistence";
import * as session from "../../world/session";
import * as runtimeState from "../../world/runtimeState";
import * as resources from "../../systems/resources";
import * as turnSystem from "../../systems/turnSystem";
import * as harvestSystem from "../../systems/harvestSystem";
import * as factionEconomy from "../../systems/factionEconomy";
import * as campaignStats from "../../systems/campaignStats";
import * as entityPersistence from "../../world/entityPersistence";

function setupSaveGame() {
	const database = new FakeDatabase();
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
	const persisted = getPersistedWorldSync(saveGame, database);
	return { database, saveGame, config, persisted };
}

describe("saveAllStateSync", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("returns error when no active session", () => {
		jest.spyOn(session, "getActiveWorldSession").mockReturnValue(null);

		const result = saveAllStateSync();
		expect(result.success).toBe(false);
		expect(result.error).toBe("No active session");
	});

	it("persists all runtime state in one call", () => {
		const { database, saveGame, persisted } = setupSaveGame();

		// Set up the database resolver so saveAllState uses our fake database
		setWorldPersistenceDatabaseResolver(() => database);

		// Mock the active session
		jest.spyOn(session, "getActiveWorldSession").mockReturnValue({
			saveGame,
			config: persisted.config,
			ecumenopolis: persisted.ecumenopolis,
			sectorCells: persisted.sectorCells,
			sectorStructures: persisted.sectorStructures,
			pointsOfInterest: persisted.pointsOfInterest,
			cityInstances: persisted.cityInstances,
			campaignState: persisted.campaignState,
			resourceState: persisted.resourceState,
		});

		// Mock runtime state
		jest.spyOn(runtimeState, "getRuntimeState").mockReturnValue({
			activeScene: "world",
			activeCityInstanceId: null,
			currentTick: 42,
			cityKitLabOpen: false,
			citySiteModalOpen: false,
			citySiteModalContext: null,
			districtEvents: [],
			nearbyPoi: null,
			resources: resources.defaultResourcePool(),
		});

		// Mock resources
		jest.spyOn(resources, "getResources").mockReturnValue(
			resources.defaultResourcePool({ scrapMetal: 50, eWaste: 25 }),
		);

		// Mock turn state
		const unitStates = new Map();
		unitStates.set("unit_0", {
			entityId: "unit_0",
			actionPoints: 1,
			maxActionPoints: 2,
			movementPoints: 2,
			maxMovementPoints: 3,
			activated: true,
		});
		jest.spyOn(turnSystem, "getTurnState").mockReturnValue({
			turnNumber: 7,
			phase: "player",
			activeFaction: "player",
			unitStates,
			playerHasActions: true,
		});

		// Mock harvest state
		jest
			.spyOn(harvestSystem, "getConsumedStructureIds")
			.mockReturnValue(new Set([10, 20]));
		jest.spyOn(harvestSystem, "getActiveHarvests").mockReturnValue([]);

		// Mock faction economy
		const factionResources = new Map<
			factionEconomy.EconomyFactionId,
			resources.ResourcePool
		>();
		factionResources.set(
			"player",
			resources.defaultResourcePool({ scrapMetal: 50 }),
		);
		factionResources.set(
			"rogue",
			resources.defaultResourcePool({ scrapMetal: 100 }),
		);
		jest
			.spyOn(factionEconomy, "getAllFactionResources")
			.mockReturnValue(factionResources);

		// Mock campaign stats
		jest.spyOn(campaignStats, "getCampaignStats").mockReturnValue({
			turnsElapsed: 7,
			structuresHarvested: 3,
			materialsGathered: {},
			cellsDiscovered: 10,
			totalCells: 100,
			unitsBuilt: 2,
			unitsLost: 0,
			unitsHacked: 0,
			structuresBuilt: 1,
			cultistIncursionsSurvived: 0,
			cultistsDestroyed: 0,
			buildingsDestroyed: 0,
			lightningStrikesReceived: 0,
			totalCombatEngagements: 0,
			peakTerritorySize: 5,
		});

		// Mock entity persistence
		jest
			.spyOn(entityPersistence, "capturePersistableWorldEntities")
			.mockReturnValue([]);

		const result = saveAllStateSync();

		expect(result.success).toBe(true);
		expect(result.saveGameId).toBe(saveGame.id);
		expect(result.turnNumber).toBe(7);

		// Verify persisted data
		const reloaded = getPersistedWorldSync(saveGame, database);
		expect(reloaded.resourceState.scrap_metal).toBe(50);
		expect(reloaded.resourceState.e_waste).toBe(25);
		expect(reloaded.turnState).not.toBeNull();
		expect(reloaded.turnState!.turn_number).toBe(7);
		expect(reloaded.harvestState).not.toBeNull();
		expect(reloaded.factionResourceStates.length).toBeGreaterThanOrEqual(2);
		expect(reloaded.campaignStatistics).not.toBeNull();

		// Clean up
		setWorldPersistenceDatabaseResolver(null);
	});
});
