import {
	executePlayerAutoTurn,
	getGovernorForFaction,
	getLastTurnResult,
	getPlayerGovernor,
	getTurnResults,
	initializeFactionGovernors,
	isAutoPlayMode,
	RIVAL_FACTIONS,
	resetFactionGovernors,
	setAutoPlayMode,
} from "./factionGovernors";

// ─── Mock PlayerGovernor ─────────────────────────────────────────────────────

const mockExecuteTurnCalls: Array<{ factionId: string; turnNumber: number }> =
	[];

jest.mock("./PlayerGovernor", () => ({
	PlayerGovernor: class MockPlayerGovernor {
		readonly factionId: string;
		constructor(factionId: string) {
			this.factionId = factionId;
		}
		executeTurn(turnNumber: number) {
			mockExecuteTurnCalls.push({
				factionId: this.factionId,
				turnNumber,
			});
			return {
				factionId: this.factionId,
				turnNumber,
				decisions: [],
			};
		}
	},
}));

const mockRegisteredHandlers: Array<
	(factionId: string, turnNumber: number) => void
> = [];

jest.mock("../../systems/turnSystem", () => ({
	registerAIFactionTurnHandler: (
		handler: (factionId: string, turnNumber: number) => void,
	) => {
		mockRegisteredHandlers.push(handler);
	},
	initializeTurnForUnits: jest.fn(),
}));

jest.mock("../../systems/factionEconomy", () => ({
	getFactionResources: () => ({
		scrapMetal: 0,
		eWaste: 0,
		intactComponents: 0,
	}),
}));

jest.mock("../../systems/buildingPlacement", () => ({
	BUILDING_COSTS: {},
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockExecuteTurnCalls.length = 0;
	mockRegisteredHandlers.length = 0;
	resetFactionGovernors();
});

describe("faction governors", () => {
	describe("rival factions", () => {
		it("defines 3 rival factions", () => {
			expect(RIVAL_FACTIONS.length).toBe(3);
			expect(RIVAL_FACTIONS.map((f) => f.factionName)).toEqual([
				"reclaimers",
				"volt_collective",
				"iron_creed",
			]);
		});

		it("each faction has unique economy ID", () => {
			const ids = RIVAL_FACTIONS.map((f) => f.economyId);
			expect(new Set(ids).size).toBe(3);
		});
	});

	describe("initializeFactionGovernors", () => {
		it("creates governor instances for all rival factions", () => {
			initializeFactionGovernors();

			expect(getGovernorForFaction("reclaimers")).not.toBeNull();
			expect(getGovernorForFaction("volt_collective")).not.toBeNull();
			expect(getGovernorForFaction("iron_creed")).not.toBeNull();
		});

		it("returns null for unknown factions", () => {
			initializeFactionGovernors();
			expect(getGovernorForFaction("unknown")).toBeNull();
		});

		it("governors have correct faction IDs", () => {
			initializeFactionGovernors();

			expect(getGovernorForFaction("reclaimers")!.factionId).toBe("rogue");
			expect(getGovernorForFaction("volt_collective")!.factionId).toBe("feral");
			expect(getGovernorForFaction("iron_creed")!.factionId).toBe("cultist");
		});
	});

	describe("registerFactionTurnHandler", () => {
		it("registers a handler with the turn system", () => {
			const { registerFactionTurnHandler } = require("./factionGovernors");
			registerFactionTurnHandler();
			expect(mockRegisteredHandlers.length).toBe(1);
		});

		it("handler calls governor executeTurn for known factions", () => {
			const { registerFactionTurnHandler } = require("./factionGovernors");
			initializeFactionGovernors();
			registerFactionTurnHandler();

			const handler = mockRegisteredHandlers[mockRegisteredHandlers.length - 1];
			handler("reclaimers", 5);

			expect(mockExecuteTurnCalls.length).toBe(1);
			expect(mockExecuteTurnCalls[0].factionId).toBe("rogue");
			expect(mockExecuteTurnCalls[0].turnNumber).toBe(5);
		});

		it("handler is no-op for unknown factions", () => {
			const { registerFactionTurnHandler } = require("./factionGovernors");
			initializeFactionGovernors();
			registerFactionTurnHandler();

			const handler = mockRegisteredHandlers[mockRegisteredHandlers.length - 1];
			handler("unknown_faction", 1);

			expect(mockExecuteTurnCalls.length).toBe(0);
		});

		it("stores turn results from each faction", () => {
			const { registerFactionTurnHandler } = require("./factionGovernors");
			initializeFactionGovernors();
			registerFactionTurnHandler();

			const handler = mockRegisteredHandlers[mockRegisteredHandlers.length - 1];
			handler("reclaimers", 1);
			handler("volt_collective", 1);
			handler("iron_creed", 1);

			expect(getTurnResults().length).toBe(3);
		});
	});

	describe("auto-play mode", () => {
		it("starts disabled", () => {
			expect(isAutoPlayMode()).toBe(false);
			expect(getPlayerGovernor()).toBeNull();
		});

		it("can be enabled", () => {
			setAutoPlayMode(true);
			expect(isAutoPlayMode()).toBe(true);
			expect(getPlayerGovernor()).not.toBeNull();
			expect(getPlayerGovernor()!.factionId).toBe("player");
		});

		it("can be disabled", () => {
			setAutoPlayMode(true);
			setAutoPlayMode(false);
			expect(isAutoPlayMode()).toBe(false);
			expect(getPlayerGovernor()).toBeNull();
		});

		it("executePlayerAutoTurn runs the player governor", () => {
			setAutoPlayMode(true);
			const result = executePlayerAutoTurn(7);

			expect(result).not.toBeNull();
			expect(result!.factionId).toBe("player");
			expect(result!.turnNumber).toBe(7);
		});

		it("executePlayerAutoTurn returns null when disabled", () => {
			const result = executePlayerAutoTurn(1);
			expect(result).toBeNull();
		});

		it("auto-play turn results are stored", () => {
			setAutoPlayMode(true);
			executePlayerAutoTurn(1);
			executePlayerAutoTurn(2);

			expect(getTurnResults().length).toBe(2);
		});
	});

	describe("turn results", () => {
		it("getLastTurnResult finds most recent for a faction", () => {
			const { registerFactionTurnHandler } = require("./factionGovernors");
			initializeFactionGovernors();
			registerFactionTurnHandler();

			const handler = mockRegisteredHandlers[mockRegisteredHandlers.length - 1];
			handler("reclaimers", 1);
			handler("reclaimers", 2);

			const last = getLastTurnResult("reclaimers");
			expect(last).not.toBeNull();
			expect(last!.turnNumber).toBe(2);
		});

		it("getLastTurnResult returns null for unknown faction", () => {
			expect(getLastTurnResult("nonexistent")).toBeNull();
		});
	});

	describe("reset", () => {
		it("clears all state", () => {
			initializeFactionGovernors();
			setAutoPlayMode(true);
			executePlayerAutoTurn(1);

			resetFactionGovernors();

			expect(getGovernorForFaction("reclaimers")).toBeNull();
			expect(isAutoPlayMode()).toBe(false);
			expect(getPlayerGovernor()).toBeNull();
			expect(getTurnResults().length).toBe(0);
		});
	});
});
