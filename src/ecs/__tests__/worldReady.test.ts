import {
	getSnapshot,
	isWorldReady,
	resetGameState,
	setWorldReady,
	simulationTick,
} from "../gameState";

// Mock all systems that simulationTick calls so we can detect invocations
const mockEnemySystem = jest.fn();
const mockAiSystem = jest.fn();
const mockGovernorSystem = jest.fn();
const mockMovementSystem = jest.fn();
const mockExplorationSystem = jest.fn();
const mockFragmentMergeSystem = jest.fn(() => []);
const mockPowerSystem = jest.fn();
const mockWeatherSystem = jest.fn();
const mockLightningSystem = jest.fn();
const mockSignalNetworkSystem = jest.fn();
const mockNetworkOverlaySystem = jest.fn();
const mockResourceSystem = jest.fn();
const mockHarvestSystem = jest.fn();
const mockRepairSystem = jest.fn();
const mockFabricationSystem = jest.fn();
const mockCombatSystem = jest.fn();
const mockHackingSystem = jest.fn();
const mockHackingCaptureSystem = jest.fn();
const mockMotorPoolUpgradeSystem = jest.fn();
const mockTerritorySystem = jest.fn();
const mockNarrativeSystem = jest.fn();
const mockBotSpeechSystem = jest.fn();
const mockPoiSystem = jest.fn();
const mockPersistenceSystem = jest.fn();
const mockUpdateDisplayOffsets = jest.fn();

jest.mock("../../systems/enemies", () => ({
	enemySystem: () => mockEnemySystem(),
}));
jest.mock("../../ai", () => ({
	aiSystem: (...args: unknown[]) => mockAiSystem(...args),
}));
jest.mock("../../systems/governorSystem", () => ({
	governorSystem: (...args: unknown[]) => mockGovernorSystem(...args),
}));
jest.mock("../../systems/movement", () => ({
	movementSystem: (...args: unknown[]) => mockMovementSystem(...args),
}));
jest.mock("../../systems/exploration", () => ({
	explorationSystem: () => mockExplorationSystem(),
}));
jest.mock("../../systems/fragmentMerge", () => ({
	fragmentMergeSystem: () => mockFragmentMergeSystem(),
}));
jest.mock("../../systems/power", () => ({
	powerSystem: (...args: unknown[]) => mockPowerSystem(...args),
	getPowerSnapshot: () => ({
		totalGeneration: 0,
		totalDemand: 0,
		stormIntensity: 1,
		rodCount: 0,
		poweredBuildingCount: 0,
	}),
}));
jest.mock("../../systems/weather", () => ({
	weatherSystem: (...args: unknown[]) => mockWeatherSystem(...args),
	getWeatherSnapshot: () => ({
		stormIntensity: 0,
		windDirection: 0,
		windSpeed: 0,
		precipitation: 0,
		visibility: 1,
	}),
	resetWeatherSystem: jest.fn(),
}));
jest.mock("../../systems/lightning", () => ({
	lightningSystem: (...args: unknown[]) => mockLightningSystem(...args),
	resetLightningSystem: jest.fn(),
}));
jest.mock("../../systems/signalNetworkSystem", () => ({
	signalNetworkSystem: () => mockSignalNetworkSystem(),
}));
jest.mock("../../systems/networkOverlay", () => ({
	networkOverlaySystem: (...args: unknown[]) =>
		mockNetworkOverlaySystem(...args),
	resetNetworkOverlay: jest.fn(),
}));
jest.mock("../../systems/resources", () => ({
	resourceSystem: () => mockResourceSystem(),
	getResources: () => ({ scrapMetal: 0, eWaste: 0, intactComponents: 0 }),
}));
jest.mock("../../systems/harvestSystem", () => ({
	harvestSystem: (...args: unknown[]) => mockHarvestSystem(...args),
	resetHarvestSystem: jest.fn(),
}));
jest.mock("../../systems/repair", () => ({
	repairSystem: () => mockRepairSystem(),
}));
jest.mock("../../systems/fabrication", () => ({
	fabricationSystem: () => mockFabricationSystem(),
	getActiveJobs: () => [],
}));
jest.mock("../../systems/combat", () => ({
	combatSystem: () => mockCombatSystem(),
	getLastCombatEvents: () => [],
}));
jest.mock("../../systems/hacking", () => ({
	hackingSystem: () => mockHackingSystem(),
}));
jest.mock("../../systems/hackingSystem", () => ({
	hackingCaptureSystem: () => mockHackingCaptureSystem(),
}));
jest.mock("../../systems/motorPool", () => ({
	motorPoolUpgradeSystem: () => mockMotorPoolUpgradeSystem(),
}));
jest.mock("../../systems/territorySystem", () => ({
	territorySystem: () => mockTerritorySystem(),
	resetTerritorySystem: jest.fn(),
}));
jest.mock("../../systems/narrative", () => ({
	narrativeSystem: () => mockNarrativeSystem(),
	getActiveThought: () => null,
}));
jest.mock("../../systems/botSpeech", () => ({
	botSpeechSystem: (...args: unknown[]) => mockBotSpeechSystem(...args),
}));
jest.mock("../../world/poiSystem", () => ({
	poiSystem: () => mockPoiSystem(),
}));
jest.mock("../../world/persistenceSystem", () => ({
	persistenceSystem: (...args: unknown[]) => mockPersistenceSystem(...args),
}));
jest.mock("../../world/structuralSpace", () => ({
	getStructuralFragments: () => [],
	updateDisplayOffsets: () => mockUpdateDisplayOffsets(),
}));
jest.mock("../../world/runtimeState", () => ({
	getRuntimeState: () => ({
		activeScene: "world",
		activeCityInstanceId: null,
		cityKitLabOpen: false,
		nearbyPoi: null,
		currentTick: 0,
	}),
	setRuntimeTick: jest.fn(),
	subscribeRuntimeState: jest.fn(() => () => {}),
}));
jest.mock("../../world/session", () => ({
	getActiveWorldSession: () => ({}),
}));
jest.mock("../../world/snapshots", () => ({}));
jest.mock("../traits", () => ({
	Identity: Symbol("Identity"),
}));
jest.mock("../world", () => ({
	units: [],
}));

function clearAllSystemMocks() {
	mockEnemySystem.mockClear();
	mockAiSystem.mockClear();
	mockGovernorSystem.mockClear();
	mockMovementSystem.mockClear();
	mockExplorationSystem.mockClear();
	mockFragmentMergeSystem.mockClear();
	mockPowerSystem.mockClear();
	mockWeatherSystem.mockClear();
	mockLightningSystem.mockClear();
	mockSignalNetworkSystem.mockClear();
	mockNetworkOverlaySystem.mockClear();
	mockResourceSystem.mockClear();
	mockHarvestSystem.mockClear();
	mockRepairSystem.mockClear();
	mockFabricationSystem.mockClear();
	mockCombatSystem.mockClear();
	mockHackingSystem.mockClear();
	mockHackingCaptureSystem.mockClear();
	mockMotorPoolUpgradeSystem.mockClear();
	mockTerritorySystem.mockClear();
	mockNarrativeSystem.mockClear();
	mockBotSpeechSystem.mockClear();
	mockPoiSystem.mockClear();
	mockPersistenceSystem.mockClear();
	mockUpdateDisplayOffsets.mockClear();
}

describe("worldReady gate (US-017)", () => {
	beforeEach(() => {
		resetGameState();
		clearAllSystemMocks();
	});

	it("defaults worldReady to false", () => {
		expect(isWorldReady()).toBe(false);
		expect(getSnapshot().worldReady).toBe(false);
	});

	it("setWorldReady toggles the flag", () => {
		setWorldReady(true);
		expect(isWorldReady()).toBe(true);
		expect(getSnapshot().worldReady).toBe(true);

		setWorldReady(false);
		expect(isWorldReady()).toBe(false);
		expect(getSnapshot().worldReady).toBe(false);
	});

	it("resetGameState resets worldReady to false", () => {
		setWorldReady(true);
		resetGameState();
		expect(isWorldReady()).toBe(false);
	});

	it("simulationTick skips all world systems when worldReady is false", () => {
		// worldReady defaults to false
		simulationTick();

		expect(mockEnemySystem).not.toHaveBeenCalled();
		expect(mockAiSystem).not.toHaveBeenCalled();
		expect(mockGovernorSystem).not.toHaveBeenCalled();
		expect(mockMovementSystem).not.toHaveBeenCalled();
		expect(mockExplorationSystem).not.toHaveBeenCalled();
		expect(mockFragmentMergeSystem).not.toHaveBeenCalled();
		expect(mockPowerSystem).not.toHaveBeenCalled();
		expect(mockWeatherSystem).not.toHaveBeenCalled();
		expect(mockLightningSystem).not.toHaveBeenCalled();
		expect(mockSignalNetworkSystem).not.toHaveBeenCalled();
		expect(mockNetworkOverlaySystem).not.toHaveBeenCalled();
		expect(mockResourceSystem).not.toHaveBeenCalled();
		expect(mockHarvestSystem).not.toHaveBeenCalled();
		expect(mockRepairSystem).not.toHaveBeenCalled();
		expect(mockFabricationSystem).not.toHaveBeenCalled();
		expect(mockCombatSystem).not.toHaveBeenCalled();
		expect(mockHackingSystem).not.toHaveBeenCalled();
		expect(mockHackingCaptureSystem).not.toHaveBeenCalled();
		expect(mockMotorPoolUpgradeSystem).not.toHaveBeenCalled();
		expect(mockTerritorySystem).not.toHaveBeenCalled();
		expect(mockNarrativeSystem).not.toHaveBeenCalled();
		expect(mockBotSpeechSystem).not.toHaveBeenCalled();
		expect(mockPoiSystem).not.toHaveBeenCalled();
		expect(mockPersistenceSystem).not.toHaveBeenCalled();
		expect(mockUpdateDisplayOffsets).not.toHaveBeenCalled();
	});

	it("simulationTick still increments tick when worldReady is false", () => {
		simulationTick();
		expect(getSnapshot().tick).toBe(1);

		simulationTick();
		expect(getSnapshot().tick).toBe(2);
	});

	it("simulationTick runs all systems when worldReady is true", () => {
		setWorldReady(true);
		simulationTick();

		expect(mockEnemySystem).toHaveBeenCalledTimes(1);
		expect(mockAiSystem).toHaveBeenCalledTimes(1);
		expect(mockGovernorSystem).toHaveBeenCalledTimes(1);
		expect(mockMovementSystem).toHaveBeenCalledTimes(1);
		expect(mockExplorationSystem).toHaveBeenCalledTimes(1);
		expect(mockFragmentMergeSystem).toHaveBeenCalledTimes(1);
		expect(mockPowerSystem).toHaveBeenCalledTimes(1);
		expect(mockWeatherSystem).toHaveBeenCalledTimes(1);
		expect(mockLightningSystem).toHaveBeenCalledTimes(1);
		expect(mockSignalNetworkSystem).toHaveBeenCalledTimes(1);
		expect(mockNetworkOverlaySystem).toHaveBeenCalledTimes(1);
		expect(mockResourceSystem).toHaveBeenCalledTimes(1);
		expect(mockHarvestSystem).toHaveBeenCalledTimes(1);
		expect(mockRepairSystem).toHaveBeenCalledTimes(1);
		expect(mockFabricationSystem).toHaveBeenCalledTimes(1);
		expect(mockCombatSystem).toHaveBeenCalledTimes(1);
		expect(mockHackingSystem).toHaveBeenCalledTimes(1);
		expect(mockHackingCaptureSystem).toHaveBeenCalledTimes(1);
		expect(mockMotorPoolUpgradeSystem).toHaveBeenCalledTimes(1);
		expect(mockTerritorySystem).toHaveBeenCalledTimes(1);
		expect(mockNarrativeSystem).toHaveBeenCalledTimes(1);
		expect(mockBotSpeechSystem).toHaveBeenCalledTimes(1);
		expect(mockPoiSystem).toHaveBeenCalledTimes(1);
		expect(mockPersistenceSystem).toHaveBeenCalledTimes(1);
		expect(mockUpdateDisplayOffsets).toHaveBeenCalledTimes(1);
	});

	it("notifies listeners even when worldReady is false", () => {
		const listener = jest.fn();
		const unsubscribe = (
			require("../gameState") as typeof import("../gameState")
		).subscribe(listener);

		simulationTick();
		expect(listener).toHaveBeenCalled();

		unsubscribe();
	});
});
