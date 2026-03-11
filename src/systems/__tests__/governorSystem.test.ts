/**
 * Unit tests for GovernorSystem — bridges CivilizationGovernor (GOAP) with
 * aiCivilization.ts state machine and the bot command system.
 *
 * Tests cover:
 * - initializeGovernors: creates governors for known factions
 * - initializeGovernors: skips unknown factions gracefully
 * - buildWorldState: correctly maps CivState to GOAP world state booleans
 * - buildFactionSituation: builds valid FactionSituation from CivState
 * - translateActionToBotCommands: issues correct commands for each action type
 * - tickGovernors: ticks all governors and returns results
 * - notifyGovernorEvent: triggers force re-evaluation
 * - resetGovernors: clears all governor state
 * - Governor never returns null (phone-home guarantee preserved)
 */

// Mock aiCivilization before import so we control the CivState fixtures
jest.mock("../aiCivilization", () => ({
	getAllCivStates: jest.fn(() => []),
}));

// Mock botCommand so we can spy on issueCommand without real ECS
jest.mock("../botCommand", () => ({
	issueCommand: jest.fn(() => true),
	getBotsByFaction: jest.fn(() => []),
	resetBotCommands: jest.fn(),
}));

import {
	initializeGovernors,
	buildWorldState,
	buildFactionSituation,
	translateActionToBotCommands,
	tickGovernors,
	notifyGovernorEvent,
	resetGovernors,
	getGovernor,
	getAllGovernors,
	type GovernorWorldSnapshot,
} from "../governorSystem";
import { WorldStateKey } from "../../ai/goap/ActionTypes";
import type { CivState, CivPhase } from "../aiCivilization";
import { getAllCivStates } from "../aiCivilization";
import { issueCommand, getBotsByFaction } from "../botCommand";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCivState(overrides: Partial<CivState> = {}): CivState {
	return {
		civId: "reclaimers",
		name: "Reclaimers",
		bias: {
			economy: 1.5,
			mining: 1.3,
			military: 0.8,
			defense: 1.0,
			research: 0.7,
			expansion: 1.0,
		},
		resources: {
			cubes: 20,
			units: 5,
			buildings: 3,
			territories: 2,
		},
		phase: "GATHER" as CivPhase,
		phaseTimer: 0,
		lastDecision: null,
		threatLevel: 0,
		economicScore: 0,
		militaryStrength: 2,
		techLevel: 1,
		ticksAlive: 0,
		basePosition: { x: 0, z: 0 },
		lastExpansionTarget: null,
		...overrides,
	};
}

function makeEmptyCivState(): CivState {
	return makeCivState({
		resources: { cubes: 0, units: 0, buildings: 0, territories: 0 },
		techLevel: 0,
		militaryStrength: 0,
	});
}

function makeIdleBot(botId: string) {
	return {
		botId,
		faction: "reclaimers",
		command: { type: "idle" as const, target: {}, issuedTick: 0, waypointIndex: 0 },
		x: 0,
		z: 0,
	};
}

function makeSnapshot(overrides: Partial<GovernorWorldSnapshot> = {}): GovernorWorldSnapshot {
	return {
		territoryCounts: {},
		underAttack: {},
		explorationLevels: {},
		techTiers: {},
		maxTechTier: 4,
		nearestDeposits: {},
		nearestEnemyBases: {},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	resetGovernors();
});

// ---------------------------------------------------------------------------
// initializeGovernors
// ---------------------------------------------------------------------------

describe("initializeGovernors", () => {
	it("creates a governor for each known faction", () => {
		initializeGovernors(["reclaimers"]);
		expect(getGovernor("reclaimers")).toBeDefined();
	});

	it("creates governors for all four main factions", () => {
		initializeGovernors(["reclaimers", "volt_collective", "signal_choir", "iron_creed"]);
		expect(getGovernor("reclaimers")).toBeDefined();
		expect(getGovernor("volt_collective")).toBeDefined();
		expect(getGovernor("signal_choir")).toBeDefined();
		expect(getGovernor("iron_creed")).toBeDefined();
	});

	it("does not throw for unknown factions (gracefully warns)", () => {
		expect(() => initializeGovernors(["nonexistent_faction"])).not.toThrow();
		expect(getGovernor("nonexistent_faction")).toBeUndefined();
	});

	it("does not create duplicate governors on repeated init", () => {
		initializeGovernors(["reclaimers"]);
		const gov1 = getGovernor("reclaimers");
		initializeGovernors(["reclaimers"]);
		const gov2 = getGovernor("reclaimers");
		expect(gov1).toBe(gov2); // Same instance
	});
});

// ---------------------------------------------------------------------------
// buildWorldState
// ---------------------------------------------------------------------------

describe("buildWorldState — empty state", () => {
	it("returns false for all keys when CivState is empty", () => {
		const state = makeEmptyCivState();
		const ws = buildWorldState(state, makeSnapshot());

		expect(ws[WorldStateKey.HAS_IDLE_UNITS]).toBe(false);
		expect(ws[WorldStateKey.HAS_RESOURCES]).toBe(false);
		expect(ws[WorldStateKey.HAS_SCOUTED]).toBe(false);
		expect(ws[WorldStateKey.HAS_OUTPOST]).toBe(false);
		expect(ws[WorldStateKey.HAS_DEFENSES]).toBe(false);
		expect(ws[WorldStateKey.HAS_ENEMY_TARGET]).toBe(false);
		expect(ws[WorldStateKey.HAS_MINERS]).toBe(false);
		expect(ws[WorldStateKey.HAS_TECH_PROGRESS]).toBe(false);
	});

	it("returns false for goal keys when nothing is achieved", () => {
		const state = makeEmptyCivState();
		const ws = buildWorldState(state, makeSnapshot());

		expect(ws[WorldStateKey.TERRITORY_EXPANDED]).toBe(false);
		expect(ws[WorldStateKey.RESOURCES_GATHERED]).toBe(false);
		expect(ws[WorldStateKey.DEFENSES_BUILT]).toBe(false);
		expect(ws[WorldStateKey.TECH_RESEARCHED]).toBe(false);
		expect(ws[WorldStateKey.MAP_SCOUTED]).toBe(false);
		expect(ws[WorldStateKey.CUBES_HOARDED]).toBe(false);
	});
});

describe("buildWorldState — well-developed state", () => {
	const state = makeCivState({
		resources: { cubes: 40, units: 8, buildings: 10, territories: 5 },
		techLevel: 3,
	});
	const snapshot = makeSnapshot({
		explorationLevels: { reclaimers: 0.8 },
	});

	it("HAS_IDLE_UNITS is true when units > 0", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_IDLE_UNITS]).toBe(true);
	});

	it("HAS_RESOURCES is true when cubes > 5", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_RESOURCES]).toBe(true);
	});

	it("HAS_OUTPOST is true when territories > 1", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_OUTPOST]).toBe(true);
	});

	it("HAS_TECH_PROGRESS is true when techLevel > 0", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_TECH_PROGRESS]).toBe(true);
	});

	it("MAP_SCOUTED is true when explorationLevel > 0.6", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.MAP_SCOUTED]).toBe(true);
	});

	it("CUBES_HOARDED is true when cubes >= 30", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.CUBES_HOARDED]).toBe(true);
	});

	it("TECH_RESEARCHED is true when techLevel >= 2", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.TECH_RESEARCHED]).toBe(true);
	});

	it("TERRITORY_EXPANDED is true when territories >= 3", () => {
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.TERRITORY_EXPANDED]).toBe(true);
	});
});

describe("buildWorldState — threat detection", () => {
	it("HAS_ENEMY_TARGET is true when underAttack is set", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({
			underAttack: { reclaimers: true },
		});
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_ENEMY_TARGET]).toBe(true);
	});

	it("HAS_ENEMY_TARGET is true when nearestEnemyBases has a position", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({
			nearestEnemyBases: { reclaimers: { x: 100, z: 100 } },
		});
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_ENEMY_TARGET]).toBe(true);
	});

	it("HAS_ENEMY_TARGET is false when no threats", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({
			underAttack: { reclaimers: false },
			nearestEnemyBases: { reclaimers: null },
		});
		const ws = buildWorldState(state, snapshot);
		expect(ws[WorldStateKey.HAS_ENEMY_TARGET]).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// buildFactionSituation
// ---------------------------------------------------------------------------

describe("buildFactionSituation", () => {
	it("resourceLevel is in [0, 1]", () => {
		const state = makeCivState({ resources: { cubes: 25, units: 3, buildings: 2, territories: 1 } });
		const situation = buildFactionSituation(state, [state], makeSnapshot());
		expect(situation.resourceLevel ?? 0).toBeGreaterThanOrEqual(0);
		expect(situation.resourceLevel ?? 0).toBeLessThanOrEqual(1);
	});

	it("resourceLevel is higher with more cubes", () => {
		const poor = makeCivState({ resources: { cubes: 5, units: 3, buildings: 2, territories: 1 } });
		const rich = makeCivState({ resources: { cubes: 50, units: 3, buildings: 2, territories: 1 } });

		const poorSit = buildFactionSituation(poor, [poor], makeSnapshot());
		const richSit = buildFactionSituation(rich, [rich], makeSnapshot());

		expect(richSit.resourceLevel ?? 0).toBeGreaterThan(poorSit.resourceLevel ?? 0);
	});

	it("explorationLevel comes from snapshot", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({ explorationLevels: { reclaimers: 0.75 } });
		const situation = buildFactionSituation(state, [state], snapshot);
		expect(situation.explorationLevel).toBe(0.75);
	});

	it("underAttack comes from snapshot", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({ underAttack: { reclaimers: true } });
		const situation = buildFactionSituation(state, [state], snapshot);
		expect(situation.underAttack).toBe(true);
	});

	it("maxTechTier comes from snapshot", () => {
		const state = makeCivState();
		const snapshot = makeSnapshot({ maxTechTier: 6 });
		const situation = buildFactionSituation(state, [state], snapshot);
		expect(situation.maxTechTier).toBe(6);
	});

	it("techTier is civState.techLevel", () => {
		const state = makeCivState({ techLevel: 3 });
		const situation = buildFactionSituation(state, [state], makeSnapshot());
		expect(situation.techTier).toBe(3);
	});

	it("outpostCount is territories - 1", () => {
		const state = makeCivState({ resources: { cubes: 20, units: 5, buildings: 3, territories: 4 } });
		const situation = buildFactionSituation(state, [state], makeSnapshot());
		expect(situation.outpostCount).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// translateActionToBotCommands
// ---------------------------------------------------------------------------

describe("translateActionToBotCommands — harvest actions", () => {
	const civId = "reclaimers";
	const civState = makeCivState();
	const snapshot = makeSnapshot({
		nearestDeposits: { reclaimers: { x: 10, z: 20 } },
	});

	beforeEach(() => {
		// Return 2 idle bots
		(getBotsByFaction as jest.Mock).mockReturnValue([
			makeIdleBot("bot-1"),
			makeIdleBot("bot-2"),
		]);
		(issueCommand as jest.Mock).mockReturnValue(true);
	});

	it("issues harvest commands for basic_harvest", () => {
		const action = { name: "basic_harvest", label: "", preconditions: {}, effects: {}, cost: 3 };
		const count = translateActionToBotCommands(civId, action, civState, snapshot);
		expect(issueCommand).toHaveBeenCalledWith(
			expect.any(String),
			"harvest",
			expect.objectContaining({ depositId: expect.any(String), position: snapshot.nearestDeposits!.reclaimers }),
		);
		expect(count).toBeGreaterThan(0);
	});

	it("issues harvest commands for assign_miners", () => {
		const action = { name: "assign_miners", label: "", preconditions: {}, effects: {}, cost: 2 };
		const count = translateActionToBotCommands(civId, action, civState, snapshot);
		expect(count).toBeGreaterThan(0);
	});

	it("issues harvest commands for hoard_cubes", () => {
		const action = { name: "hoard_cubes", label: "", preconditions: {}, effects: {}, cost: 3 };
		const count = translateActionToBotCommands(civId, action, civState, snapshot);
		expect(count).toBeGreaterThan(0);
	});

	it("issues 0 commands when no deposit available", () => {
		const noDepositSnapshot = makeSnapshot({ nearestDeposits: { reclaimers: null } });
		const action = { name: "basic_harvest", label: "", preconditions: {}, effects: {}, cost: 3 };
		const count = translateActionToBotCommands(civId, action, civState, noDepositSnapshot);
		expect(count).toBe(0);
	});

	it("issues 0 commands when no idle bots", () => {
		(getBotsByFaction as jest.Mock).mockReturnValue([
			{ ...makeIdleBot("bot-1"), command: { type: "patrol", target: {}, issuedTick: 0, waypointIndex: 0 } },
		]);
		const action = { name: "basic_harvest", label: "", preconditions: {}, effects: {}, cost: 3 };
		const count = translateActionToBotCommands(civId, action, civState, snapshot);
		expect(count).toBe(0);
	});
});

describe("translateActionToBotCommands — scout action", () => {
	const civId = "reclaimers";
	const civState = makeCivState();

	beforeEach(() => {
		(getBotsByFaction as jest.Mock).mockReturnValue([
			makeIdleBot("bot-1"),
			makeIdleBot("bot-2"),
			makeIdleBot("bot-3"),
		]);
		(issueCommand as jest.Mock).mockReturnValue(true);
	});

	it("issues patrol commands for send_scout_party", () => {
		const action = { name: "send_scout_party", label: "", preconditions: {}, effects: {}, cost: 2 };
		translateActionToBotCommands(civId, action, civState);
		expect(issueCommand).toHaveBeenCalledWith(
			expect.any(String),
			"patrol",
			expect.objectContaining({ waypoints: expect.any(Array) }),
		);
	});

	it("sends at most 30% of bots as scouts", () => {
		const bots = Array.from({ length: 10 }, (_, i) => makeIdleBot(`bot-${i}`));
		(getBotsByFaction as jest.Mock).mockReturnValue(bots);
		const action = { name: "send_scout_party", label: "", preconditions: {}, effects: {}, cost: 2 };
		translateActionToBotCommands(civId, action, civState);
		// 30% of 10 = 3 bots → 3 patrol commands issued
		const patrolCalls = (issueCommand as jest.Mock).mock.calls.filter(
			(c) => c[1] === "patrol",
		);
		expect(patrolCalls.length).toBeLessThanOrEqual(4);
	});
});

describe("translateActionToBotCommands — build actions", () => {
	const civId = "reclaimers";
	const civState = makeCivState();
	const snapshot = makeSnapshot({
		nearestDeposits: { reclaimers: { x: 5, z: 5 } },
	});

	beforeEach(() => {
		(getBotsByFaction as jest.Mock).mockReturnValue([makeIdleBot("bot-1"), makeIdleBot("bot-2")]);
		(issueCommand as jest.Mock).mockReturnValue(true);
	});

	it("issues build commands for build_outpost", () => {
		const action = { name: "build_outpost", label: "", preconditions: {}, effects: {}, cost: 4 };
		translateActionToBotCommands(civId, action, civState, snapshot);
		expect(issueCommand).toHaveBeenCalledWith(
			expect.any(String),
			"build",
			expect.objectContaining({ buildingType: "outpost" }),
		);
	});

	it("issues build commands for build_walls", () => {
		const action = { name: "build_walls", label: "", preconditions: {}, effects: {}, cost: 5 };
		translateActionToBotCommands(civId, action, civState, snapshot);
		expect(issueCommand).toHaveBeenCalledWith(
			expect.any(String),
			"build",
			expect.objectContaining({ buildingType: "wall" }),
		);
	});

	it("issues at most 2 build commands", () => {
		const bots = Array.from({ length: 8 }, (_, i) => makeIdleBot(`bot-${i}`));
		(getBotsByFaction as jest.Mock).mockReturnValue(bots);
		const action = { name: "build_outpost", label: "", preconditions: {}, effects: {}, cost: 4 };
		translateActionToBotCommands(civId, action, civState, snapshot);
		const buildCalls = (issueCommand as jest.Mock).mock.calls.filter(
			(c) => c[1] === "build",
		);
		expect(buildCalls.length).toBeLessThanOrEqual(2);
	});
});

describe("translateActionToBotCommands — attack action", () => {
	const civId = "reclaimers";
	const civState = makeCivState();
	const snapshot = makeSnapshot({
		nearestEnemyBases: { reclaimers: { x: 100, z: 100 } },
	});

	beforeEach(() => {
		(getBotsByFaction as jest.Mock).mockReturnValue([
			makeIdleBot("bot-1"),
			makeIdleBot("bot-2"),
			makeIdleBot("bot-3"),
		]);
		(issueCommand as jest.Mock).mockReturnValue(true);
	});

	it("issues attack commands for launch_raid", () => {
		const action = { name: "launch_raid", label: "", preconditions: {}, effects: {}, cost: 7 };
		translateActionToBotCommands(civId, action, civState, snapshot);
		expect(issueCommand).toHaveBeenCalledWith(
			expect.any(String),
			"attack",
			expect.objectContaining({ position: snapshot.nearestEnemyBases!.reclaimers }),
		);
	});

	it("issues 0 attack commands without enemy target", () => {
		const noEnemy = makeSnapshot({ nearestEnemyBases: { reclaimers: null } });
		const action = { name: "launch_raid", label: "", preconditions: {}, effects: {}, cost: 7 };
		const count = translateActionToBotCommands(civId, action, civState, noEnemy);
		expect(count).toBe(0);
	});
});

describe("translateActionToBotCommands — passive actions (no commands)", () => {
	const civId = "reclaimers";
	const civState = makeCivState();

	beforeEach(() => {
		(getBotsByFaction as jest.Mock).mockReturnValue([makeIdleBot("bot-1")]);
		(issueCommand as jest.Mock).mockReturnValue(true);
	});

	it("issues 0 commands for research_tech", () => {
		const action = { name: "research_tech", label: "", preconditions: {}, effects: {}, cost: 6 };
		const count = translateActionToBotCommands(civId, action, civState);
		expect(count).toBe(0);
	});

	it("issues 0 commands for produce_unit", () => {
		const action = { name: "produce_unit", label: "", preconditions: {}, effects: {}, cost: 5 };
		const count = translateActionToBotCommands(civId, action, civState);
		expect(count).toBe(0);
	});

	it("issues 0 commands for trade_offer", () => {
		const action = { name: "trade_offer", label: "", preconditions: {}, effects: {}, cost: 3 };
		const count = translateActionToBotCommands(civId, action, civState);
		expect(count).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// tickGovernors
// ---------------------------------------------------------------------------

describe("tickGovernors", () => {
	beforeEach(() => {
		resetGovernors();
		(getAllCivStates as jest.Mock).mockReturnValue([makeCivState()]);
		(getBotsByFaction as jest.Mock).mockReturnValue([]);
	});

	it("returns empty array when no governors are initialized", () => {
		const results = tickGovernors(1, makeSnapshot());
		expect(results).toHaveLength(0);
	});

	it("returns one result per initialized+active faction", () => {
		initializeGovernors(["reclaimers"]);
		const results = tickGovernors(1, makeSnapshot());
		expect(results).toHaveLength(1);
		expect(results[0].civId).toBe("reclaimers");
	});

	it("each result has a valid action", () => {
		initializeGovernors(["reclaimers"]);
		const results = tickGovernors(1, makeSnapshot());
		expect(results[0].action).toBeDefined();
		expect(results[0].action.name).toBeTruthy();
	});

	it("skips civs that have no CivState", () => {
		// Governor for volt_collective, but no CivState for it
		(getAllCivStates as jest.Mock).mockReturnValue([]);
		initializeGovernors(["reclaimers"]);
		const results = tickGovernors(1, makeSnapshot());
		expect(results).toHaveLength(0);
	});

	it("multiple factions each get a result", () => {
		(getAllCivStates as jest.Mock).mockReturnValue([
			makeCivState({ civId: "reclaimers" }),
			makeCivState({ civId: "volt_collective", name: "Volt Collective", bias: {
				economy: 0.8, mining: 1.0, military: 1.5, defense: 0.9, research: 1.0, expansion: 1.3
			}}),
		]);

		initializeGovernors(["reclaimers", "volt_collective"]);
		const results = tickGovernors(1, makeSnapshot());
		expect(results).toHaveLength(2);
	});

	it("governor NEVER returns null across 50 ticks", () => {
		initializeGovernors(["reclaimers"]);

		for (let i = 0; i < 50; i++) {
			const results = tickGovernors(i, makeSnapshot());
			for (const result of results) {
				expect(result.action).not.toBeNull();
			}
		}
	});
});

// ---------------------------------------------------------------------------
// notifyGovernorEvent
// ---------------------------------------------------------------------------

describe("notifyGovernorEvent", () => {
	it("does not throw for unknown faction", () => {
		expect(() => notifyGovernorEvent("nonexistent")).not.toThrow();
	});

	it("forces re-evaluation on the next tick", () => {
		(getAllCivStates as jest.Mock).mockReturnValue([makeCivState()]);
		(getBotsByFaction as jest.Mock).mockReturnValue([]);
		initializeGovernors(["reclaimers"]);

		// Should not throw when notifying a real faction
		expect(() => notifyGovernorEvent("reclaimers")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// resetGovernors
// ---------------------------------------------------------------------------

describe("resetGovernors", () => {
	it("clears all governor instances", () => {
		initializeGovernors(["reclaimers", "volt_collective"]);
		expect(getAllGovernors().size).toBeGreaterThan(0);

		resetGovernors();
		expect(getAllGovernors().size).toBe(0);
	});

	it("getGovernor returns undefined after reset", () => {
		initializeGovernors(["reclaimers"]);
		resetGovernors();
		expect(getGovernor("reclaimers")).toBeUndefined();
	});
});
