// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRegisteredAIHandlers: Array<
	(factionId: string, turnNumber: number) => void
> = [];
const mockRegisteredEnvHandlers: Array<(turnNumber: number) => void> = [];
const mockLogTurnEvent = jest.fn();
const mockRegisterFactionTurnHandler = jest.fn();
const mockGetGovernorForFaction = jest.fn();

jest.mock("./turnSystem", () => ({
	registerAIFactionTurnHandler: (
		handler: (factionId: string, turnNumber: number) => void,
	) => {
		mockRegisteredAIHandlers.push(handler);
	},
	registerEnvironmentPhaseHandler: (handler: (turnNumber: number) => void) => {
		mockRegisteredEnvHandlers.push(handler);
	},
	subscribeTurnState: jest.fn(),
	getTurnState: jest.fn(() => ({
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
	})),
}));

jest.mock("./turnPhaseEvents", () => ({
	detectPhaseTransition: jest.fn(),
}));

jest.mock("./turnEventLog", () => ({
	logTurnEvent: (...args: unknown[]) => mockLogTurnEvent(...args),
}));

jest.mock("./power", () => ({
	getPowerSnapshot: () => ({ stormIntensity: 0.5 }),
}));

jest.mock("../ai/governor/factionGovernors", () => ({
	registerFactionTurnHandler: (...args: unknown[]) =>
		mockRegisterFactionTurnHandler(...args),
	getGovernorForFaction: (...args: unknown[]) =>
		mockGetGovernorForFaction(...args),
}));

const mockCultistIncursionSystem = jest.fn(() => ({
	spawnEvents: [],
	attackEvents: [],
}));
jest.mock("./cultistIncursion", () => ({
	cultistIncursionSystem: () => mockCultistIncursionSystem(),
}));

const mockMotorPoolTurnTick = jest.fn();
jest.mock("./motorPool", () => ({
	motorPoolTurnTick: () => mockMotorPoolTurnTick(),
}));

const mockAdvanceConstructionTurn = jest.fn();
jest.mock("./constructionVisualization", () => ({
	advanceConstructionTurn: () => mockAdvanceConstructionTurn(),
}));

jest.mock("./aiActionVisualization", () => ({
	initAIActionVisualization: jest.fn(),
}));

jest.mock("./markUpgrade", () => ({
	markUpgradeTurnTick: jest.fn(),
}));

jest.mock("./techTree", () => ({
	advanceResearch: jest.fn(() => null),
}));

jest.mock("./otterHologram", () => ({
	triggerHologram: jest.fn(),
}));

jest.mock("./territorySystem", () => ({
	forceRecalculate: jest.fn(),
}));

jest.mock("./victoryConditions", () => ({
	checkVictoryConditions: jest.fn(() => null),
}));

jest.mock("./wormhole", () => ({
	getWormholeState: jest.fn(() => null),
	advanceWormholeStage: jest.fn(() => false),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockRegisteredAIHandlers.length = 0;
	mockRegisteredEnvHandlers.length = 0;
	mockRegisterFactionTurnHandler.mockClear();
	mockGetGovernorForFaction.mockClear();
	mockLogTurnEvent.mockClear();
	mockCultistIncursionSystem.mockClear();
	mockMotorPoolTurnTick.mockClear();
	mockAdvanceConstructionTurn.mockClear();
	mockCultistIncursionSystem.mockReturnValue({
		spawnEvents: [],
		attackEvents: [],
	});
	jest.resetModules();
});

describe("turnPhaseHandlers", () => {
	it("calls registerFactionTurnHandler on import", () => {
		require("./turnPhaseHandlers");
		expect(mockRegisterFactionTurnHandler).toHaveBeenCalledTimes(1);
	});

	it("registers an AI faction turn handler", () => {
		require("./turnPhaseHandlers");
		expect(mockRegisteredAIHandlers.length).toBeGreaterThanOrEqual(1);
	});

	it("registers an environment phase handler", () => {
		require("./turnPhaseHandlers");
		expect(mockRegisteredEnvHandlers.length).toBe(1);
	});

	it("AI handler logs event with governor status", () => {
		mockGetGovernorForFaction.mockReturnValue({ factionId: "rogue" });
		require("./turnPhaseHandlers");

		const handler =
			mockRegisteredAIHandlers[mockRegisteredAIHandlers.length - 1];
		handler("reclaimers", 3);

		expect(mockLogTurnEvent).toHaveBeenCalledWith(
			"ai_faction_turn",
			null,
			"reclaimers",
			{ turnNumber: 3, decisionCount: "governor_active" },
		);
	});

	it("AI handler logs no_governor for unknown factions", () => {
		mockGetGovernorForFaction.mockReturnValue(null);
		require("./turnPhaseHandlers");

		const handler =
			mockRegisteredAIHandlers[mockRegisteredAIHandlers.length - 1];
		handler("signal_choir", 2);

		expect(mockLogTurnEvent).toHaveBeenCalledWith(
			"ai_faction_turn",
			null,
			"signal_choir",
			{ turnNumber: 2, decisionCount: "no_governor" },
		);
	});

	it("environment handler logs storm intensity", () => {
		require("./turnPhaseHandlers");

		const handler = mockRegisteredEnvHandlers[0];
		handler(5);

		expect(mockLogTurnEvent).toHaveBeenCalledWith(
			"environment",
			null,
			"environment",
			{ turnNumber: 5, stormIntensity: 0.5 },
		);
	});
});
