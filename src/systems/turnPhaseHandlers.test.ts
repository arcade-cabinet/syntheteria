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

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockRegisteredAIHandlers.length = 0;
	mockRegisteredEnvHandlers.length = 0;
	mockRegisterFactionTurnHandler.mockClear();
	mockGetGovernorForFaction.mockClear();
	mockLogTurnEvent.mockClear();
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
