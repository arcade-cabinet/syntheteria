/**
 * Tests for GOAP planner and action types.
 *
 * Covers:
 * - BUG 3 FIX: BasicHarvest has no preconditions (always available)
 * - BUG 3 FIX: ProduceUnit bridges resource→unit gap
 * - BUG 3 FIX: Planner can find a plan from empty world state
 * - Planner prefers lower-cost actions when preconditions are met
 * - Planner returns null when goal is truly unreachable
 * - All action chains are reachable from realistic starting states
 */

import {
	ALL_ACTIONS,
	BasicHarvest,
	ProduceUnit,
	SendScoutParty,
	AssignMiners,
	BuildOutpost,
	BuildWalls,
	HoardCubes,
	LaunchRaid,
	ResearchTech,
	TradeOffer,
	WorldStateKey,
	type WorldState,
} from "../ActionTypes";
import { planActions } from "../GOAPPlanner";

// ---------------------------------------------------------------------------
// BUG 3 FIX: BasicHarvest and ProduceUnit
// ---------------------------------------------------------------------------

describe("BUG 3 FIX — BasicHarvest action", () => {
	it("has no preconditions", () => {
		expect(Object.keys(BasicHarvest.preconditions)).toHaveLength(0);
	});

	it("produces HAS_RESOURCES and RESOURCES_GATHERED effects", () => {
		expect(BasicHarvest.effects[WorldStateKey.HAS_RESOURCES]).toBe(true);
		expect(BasicHarvest.effects[WorldStateKey.RESOURCES_GATHERED]).toBe(true);
	});

	it("has higher cost than AssignMiners so planner prefers specialized actions", () => {
		expect(BasicHarvest.cost).toBeGreaterThanOrEqual(AssignMiners.cost);
	});

	it("is included in ALL_ACTIONS", () => {
		expect(ALL_ACTIONS).toContain(BasicHarvest);
	});
});

describe("BUG 3 FIX — ProduceUnit action", () => {
	it("requires HAS_RESOURCES", () => {
		expect(ProduceUnit.preconditions[WorldStateKey.HAS_RESOURCES]).toBe(true);
	});

	it("produces HAS_IDLE_UNITS", () => {
		expect(ProduceUnit.effects[WorldStateKey.HAS_IDLE_UNITS]).toBe(true);
	});

	it("is included in ALL_ACTIONS", () => {
		expect(ALL_ACTIONS).toContain(ProduceUnit);
	});
});

// ---------------------------------------------------------------------------
// BUG 3 FIX: Planner can find plans from empty world state
// ---------------------------------------------------------------------------

describe("BUG 3 FIX — planner reachability from empty state", () => {
	const emptyState: WorldState = {};

	it("finds a plan for RESOURCES_GATHERED from empty state", () => {
		const goal: WorldState = { [WorldStateKey.RESOURCES_GATHERED]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		expect(plan!.length).toBeGreaterThan(0);
		// Should use BasicHarvest since it has no preconditions
		expect(plan!.some((a) => a.name === "basic_harvest")).toBe(true);
	});

	it("finds a plan for TERRITORY_EXPANDED from empty state", () => {
		const goal: WorldState = { [WorldStateKey.TERRITORY_EXPANDED]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		expect(plan!.length).toBeGreaterThan(0);
		// Should chain: BasicHarvest → ProduceUnit → SendScoutParty → BuildOutpost
		// (or similar path through the action graph)
	});

	it("finds a plan for MAP_SCOUTED from empty state", () => {
		const goal: WorldState = { [WorldStateKey.MAP_SCOUTED]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		// Needs idle units → BasicHarvest + ProduceUnit + SendScoutParty
	});

	it("finds a plan for CUBES_HOARDED from empty state", () => {
		const goal: WorldState = { [WorldStateKey.CUBES_HOARDED]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		// BasicHarvest → ProduceUnit → AssignMiners → HoardCubes
	});

	it("finds a plan for TECH_RESEARCHED from empty state", () => {
		const goal: WorldState = { [WorldStateKey.TECH_RESEARCHED]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		// BasicHarvest → ResearchTech
	});

	it("finds a plan for DEFENSES_BUILT from empty state", () => {
		const goal: WorldState = { [WorldStateKey.DEFENSES_BUILT]: true };
		const plan = planActions(emptyState, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		// BasicHarvest → ProduceUnit → SendScoutParty → BuildOutpost → BuildWalls
	});
});

// ---------------------------------------------------------------------------
// Planner prefers cheaper actions
// ---------------------------------------------------------------------------

describe("GOAP planner — cost optimization", () => {
	it("prefers AssignMiners over BasicHarvest when idle units exist", () => {
		const state: WorldState = { [WorldStateKey.HAS_IDLE_UNITS]: true };
		const goal: WorldState = { [WorldStateKey.RESOURCES_GATHERED]: true };
		const plan = planActions(state, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		expect(plan!.length).toBe(1);
		// AssignMiners has lower cost than BasicHarvest and produces RESOURCES_GATHERED
		expect(plan![0].name).toBe("assign_miners");
	});

	it("returns empty plan when goal is already satisfied", () => {
		const state: WorldState = { [WorldStateKey.RESOURCES_GATHERED]: true };
		const goal: WorldState = { [WorldStateKey.RESOURCES_GATHERED]: true };
		const plan = planActions(state, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		expect(plan!).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Planner with realistic starting states
// ---------------------------------------------------------------------------

describe("GOAP planner — realistic initial states", () => {
	it("plans from a state with idle units and resources", () => {
		const state: WorldState = {
			[WorldStateKey.HAS_IDLE_UNITS]: true,
			[WorldStateKey.HAS_RESOURCES]: true,
		};
		const goal: WorldState = { [WorldStateKey.TERRITORY_EXPANDED]: true };
		const plan = planActions(state, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		// Should include scouting then building outpost
		expect(plan!.some((a) => a.name === "send_scout_party")).toBe(true);
		expect(plan!.some((a) => a.name === "build_outpost")).toBe(true);
	});

	it("plans ATTACK_LAUNCHED when enemy target exists", () => {
		const state: WorldState = {
			[WorldStateKey.HAS_IDLE_UNITS]: true,
			[WorldStateKey.HAS_ENEMY_TARGET]: true,
		};
		const goal: WorldState = { [WorldStateKey.ATTACK_LAUNCHED]: true };
		const plan = planActions(state, goal, ALL_ACTIONS);

		expect(plan).not.toBeNull();
		expect(plan!.length).toBe(1);
		expect(plan![0].name).toBe("launch_raid");
	});

	it("returns null for TRADE_COMPLETE without trade partner (truly unreachable)", () => {
		// No action in the catalog produces HAS_TRADE_PARTNER,
		// so this goal is genuinely unreachable
		const state: WorldState = {};
		const goal: WorldState = { [WorldStateKey.TRADE_COMPLETE]: true };
		const plan = planActions(state, goal, ALL_ACTIONS);

		// BasicHarvest gives HAS_RESOURCES, but no action produces HAS_TRADE_PARTNER
		expect(plan).toBeNull();
	});
});
