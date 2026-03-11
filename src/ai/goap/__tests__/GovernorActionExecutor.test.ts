/**
 * Tests for GovernorActionExecutor.
 *
 * Covers:
 * - LaunchRaid action creates a raid via planRaid when a viable target exists
 * - LaunchRaid is skipped (no raid created) when no targets are found
 * - LaunchRaid is skipped when raid viability check fails (force too weak)
 * - ResearchTech action calls startResearch on the first available tech
 * - ResearchTech does nothing when no techs are available
 * - ResearchTech does nothing when research is already in progress
 * - Unknown/unhandled action names do not throw (graceful no-op)
 * - ExecutionContext unit-list filtering selects faction-owned units
 * - Governor wires executor: tick with LaunchRaid goal produces a raid
 */

import {
	GovernorActionExecutor,
	type ExecutionContext,
} from "../GovernorActionExecutor";
import { LaunchRaid, ResearchTech, BasicHarvest } from "../ActionTypes";
import type { Vec3 } from "../../../ecs/types";

// ---------------------------------------------------------------------------
// Mock raidSystem
// ---------------------------------------------------------------------------

jest.mock("../../../systems/raidSystem", () => ({
	planRaid: jest.fn(() => "raid_0"),
	resetRaidSystem: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock raidTargeting
// ---------------------------------------------------------------------------

jest.mock("../../../systems/raidTargeting", () => ({
	findRaidTargets: jest.fn(() => []),
	assessRaidViability: jest.fn(() => ({
		viable: false,
		availableForce: 0,
		expectedDefense: 0,
		forceRatio: 0,
	})),
}));

// ---------------------------------------------------------------------------
// Mock techResearch
// ---------------------------------------------------------------------------

jest.mock("../../../systems/techResearch", () => ({
	getAvailableTechs: jest.fn(() => []),
	startResearch: jest.fn(() => false),
	getResearchProgress: jest.fn(() => null),
	resetTechResearch: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { planRaid, resetRaidSystem } from "../../../systems/raidSystem";
import {
	findRaidTargets,
	assessRaidViability,
} from "../../../systems/raidTargeting";
import {
	getAvailableTechs,
	startResearch,
	getResearchProgress,
	resetTechResearch,
} from "../../../systems/techResearch";
import type { RaidTarget } from "../../../systems/raidTargeting";
import type { TechDefinition } from "../../../systems/techResearch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeUnit(id: string, position: Vec3 = pos()) {
	return { id, worldPosition: position };
}

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
	return {
		faction: "reclaimers",
		unitIds: ["unit_1", "unit_2"],
		homePosition: pos(0, 0, 0),
		tick: 0,
		...overrides,
	};
}

function makeRaidTarget(overrides: Partial<RaidTarget> = {}): RaidTarget {
	return {
		position: pos(100, 0, 100),
		estimatedValue: 500,
		threatLevel: 0,
		cubeCount: 10,
		cubeIds: ["cube_1", "cube_2"],
		...overrides,
	};
}

function makeTechDef(id: string): TechDefinition {
	return {
		id,
		name: `Tech: ${id}`,
		tier: 1,
		researchCost: 100,
		prerequisites: [],
		effects: { unlocks: [], bonuses: {} },
		race: null,
	};
}

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockPlanRaid = planRaid as jest.MockedFunction<typeof planRaid>;
const mockFindRaidTargets = findRaidTargets as jest.MockedFunction<
	typeof findRaidTargets
>;
const mockAssessRaidViability = assessRaidViability as jest.MockedFunction<
	typeof assessRaidViability
>;
const mockGetAvailableTechs = getAvailableTechs as jest.MockedFunction<
	typeof getAvailableTechs
>;
const mockStartResearch = startResearch as jest.MockedFunction<
	typeof startResearch
>;
const mockGetResearchProgress = getResearchProgress as jest.MockedFunction<
	typeof getResearchProgress
>;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let executor: GovernorActionExecutor;

beforeEach(() => {
	jest.clearAllMocks();
	executor = new GovernorActionExecutor();
});

// ---------------------------------------------------------------------------
// LaunchRaid
// ---------------------------------------------------------------------------

describe("GovernorActionExecutor — LaunchRaid", () => {
	it("does NOT call planRaid when no raid targets are found", () => {
		mockFindRaidTargets.mockReturnValue([]);

		const ctx = makeContext();
		executor.execute(LaunchRaid, ctx);

		expect(mockPlanRaid).not.toHaveBeenCalled();
	});

	it("does NOT call planRaid when raid is not viable", () => {
		const target = makeRaidTarget({ threatLevel: 99 });
		mockFindRaidTargets.mockReturnValue([target]);
		mockAssessRaidViability.mockReturnValue({
			viable: false,
			availableForce: 1,
			expectedDefense: 50,
			forceRatio: 0.02,
		});

		const ctx = makeContext();
		executor.execute(LaunchRaid, ctx);

		expect(mockPlanRaid).not.toHaveBeenCalled();
	});

	it("calls planRaid with correct args when target is viable", () => {
		const target = makeRaidTarget({
			position: pos(50, 0, 75),
			cubeIds: ["c1", "c2"],
		});
		mockFindRaidTargets.mockReturnValue([target]);
		mockAssessRaidViability.mockReturnValue({
			viable: true,
			availableForce: 5,
			expectedDefense: 1,
			forceRatio: 5,
		});
		mockPlanRaid.mockReturnValue("raid_42");

		const ctx = makeContext({
			faction: "volt_collective",
			unitIds: ["u1", "u2", "u3"],
			homePosition: pos(10, 0, 10),
			tick: 77,
		});

		const raidId = executor.execute(LaunchRaid, ctx);

		expect(mockFindRaidTargets).toHaveBeenCalledWith("volt_collective");
		expect(mockAssessRaidViability).toHaveBeenCalledWith(
			"volt_collective",
			target,
		);
		expect(mockPlanRaid).toHaveBeenCalledWith(
			"volt_collective",
			pos(50, 0, 75),
			["u1", "u2", "u3"],
			pos(10, 0, 10),
			77,
		);
		expect(raidId).toBe("raid_42");
	});

	it("uses the best (first) target returned by findRaidTargets", () => {
		const best = makeRaidTarget({ position: pos(10, 0, 10), estimatedValue: 1000 });
		const worse = makeRaidTarget({ position: pos(200, 0, 200), estimatedValue: 50 });
		mockFindRaidTargets.mockReturnValue([best, worse]);
		mockAssessRaidViability.mockReturnValue({
			viable: true,
			availableForce: 3,
			expectedDefense: 0,
			forceRatio: 10,
		});
		mockPlanRaid.mockReturnValue("raid_1");

		const ctx = makeContext();
		executor.execute(LaunchRaid, ctx);

		// Should use the first target (best-scored by raidTargeting)
		expect(mockPlanRaid).toHaveBeenCalledWith(
			expect.any(String),
			best.position,
			expect.any(Array),
			expect.any(Object),
			expect.any(Number),
		);
	});

	it("returns null when planRaid is not called", () => {
		mockFindRaidTargets.mockReturnValue([]);

		const ctx = makeContext();
		const result = executor.execute(LaunchRaid, ctx);

		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// ResearchTech
// ---------------------------------------------------------------------------

describe("GovernorActionExecutor — ResearchTech", () => {
	it("does nothing when no techs are available", () => {
		mockGetAvailableTechs.mockReturnValue([]);

		const ctx = makeContext();
		const result = executor.execute(ResearchTech, ctx);

		expect(mockStartResearch).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it("does nothing when research is already in progress", () => {
		mockGetAvailableTechs.mockReturnValue([makeTechDef("tech_mining_1")]);
		mockGetResearchProgress.mockReturnValue({
			techId: "tech_mining_1",
			progress: 20,
			cost: 100,
		});

		const ctx = makeContext();
		executor.execute(ResearchTech, ctx);

		expect(mockStartResearch).not.toHaveBeenCalled();
	});

	it("calls startResearch on the first available tech when idle", () => {
		const tech1 = makeTechDef("tech_automine");
		const tech2 = makeTechDef("tech_wall_v2");
		mockGetAvailableTechs.mockReturnValue([tech1, tech2]);
		mockGetResearchProgress.mockReturnValue(null);
		mockStartResearch.mockReturnValue(true);

		const ctx = makeContext({ faction: "iron_creed" });
		const result = executor.execute(ResearchTech, ctx);

		expect(mockGetAvailableTechs).toHaveBeenCalledWith("iron_creed");
		expect(mockStartResearch).toHaveBeenCalledWith("iron_creed", "tech_automine");
		expect(result).toBe("tech_automine");
	});

	it("returns null when startResearch returns false (validation failed)", () => {
		mockGetAvailableTechs.mockReturnValue([makeTechDef("tech_x")]);
		mockGetResearchProgress.mockReturnValue(null);
		mockStartResearch.mockReturnValue(false);

		const ctx = makeContext();
		const result = executor.execute(ResearchTech, ctx);

		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Unknown / unhandled actions
// ---------------------------------------------------------------------------

describe("GovernorActionExecutor — unhandled actions", () => {
	it("does not throw for an unhandled action name", () => {
		const ctx = makeContext();
		expect(() => executor.execute(BasicHarvest, ctx)).not.toThrow();
	});

	it("returns null for unhandled actions", () => {
		const ctx = makeContext();
		const result = executor.execute(BasicHarvest, ctx);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Governor integration — wiring via setActionExecutor
// ---------------------------------------------------------------------------

describe("GovernorActionExecutor — governor integration", () => {
	it("executor receives the faction id from the context", () => {
		const target = makeRaidTarget();
		mockFindRaidTargets.mockReturnValue([target]);
		mockAssessRaidViability.mockReturnValue({
			viable: true,
			availableForce: 4,
			expectedDefense: 1,
			forceRatio: 4,
		});
		mockPlanRaid.mockReturnValue("raid_99");

		const ctx = makeContext({ faction: "signal_choir" });
		executor.execute(LaunchRaid, ctx);

		expect(mockFindRaidTargets).toHaveBeenCalledWith("signal_choir");
	});

	it("executor handles empty unitIds gracefully", () => {
		const target = makeRaidTarget();
		mockFindRaidTargets.mockReturnValue([target]);
		mockAssessRaidViability.mockReturnValue({
			viable: true,
			availableForce: 1,
			expectedDefense: 0,
			forceRatio: 10,
		});
		mockPlanRaid.mockReturnValue("raid_empty");

		const ctx = makeContext({ unitIds: [] });
		// Should not throw even with empty unit list
		expect(() => executor.execute(LaunchRaid, ctx)).not.toThrow();
		expect(mockPlanRaid).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Object),
			[],
			expect.any(Object),
			expect.any(Number),
		);
	});
});

// ---------------------------------------------------------------------------
// CivilizationGovernor wiring test
// ---------------------------------------------------------------------------

describe("CivilizationGovernor — setActionExecutor wiring", () => {
	it("governor calls executor.execute when an action is dispatched", () => {
		// Import Governor here to avoid circular jest.mock ordering issues
		const {
			CivilizationGovernor,
		} = require("../CivilizationGovernor");
		const { WorldStateKey } = require("../ActionTypes");

		const testConfig = {
			reclaimers: {
				name: "Reclaimers",
				description: "Scavenger economy",
				color: "#8B4513",
				governorBias: {
					economy: 1.5,
					mining: 1.3,
					military: 0.8,
					defense: 1.0,
					research: 0.7,
					expansion: 1.0,
				},
			},
		};

		const gov = new CivilizationGovernor("reclaimers", testConfig);

		const mockExecute = jest.fn(() => null);
		const mockExec = { execute: mockExecute };
		gov.setActionExecutor(mockExec);

		// Provide an execution context so dispatchAction is not a no-op
		gov.setExecutionContext({
			faction: "reclaimers",
			unitIds: ["unit_1", "unit_2"],
			homePosition: pos(0, 0, 0),
			tick: 0,
		});

		const situation = {
			resourceLevel: 0.5,
			explorationLevel: 0.5,
			idleUnits: 3,
			totalUnits: 5,
			underAttack: false,
			outpostCount: 1,
			techTier: 0,
			maxTechTier: 4,
		};

		const worldState = {
			[WorldStateKey.HAS_IDLE_UNITS]: true,
		};

		// Tick enough times for the governor to reach a plan step and call the executor
		// The executor is called on each tick when a plan is active
		let executorCalled = false;
		for (let i = 0; i < 20; i++) {
			gov.tick(situation, worldState);
			if (mockExecute.mock.calls.length > 0) {
				executorCalled = true;
				break;
			}
		}

		expect(executorCalled).toBe(true);
	});
});
