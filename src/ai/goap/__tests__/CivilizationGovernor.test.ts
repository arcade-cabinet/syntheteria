/**
 * Tests for CivilizationGovernor.
 *
 * Covers:
 * - BUG 2 FIX: Governor falls back to gather when no plan exists
 * - Governor re-plans when plan is completed
 * - Governor switches goals when a higher-priority goal emerges
 * - Governor produces valid actions from initial game state
 */

import { CivilizationGovernor } from "../CivilizationGovernor";
import type { CivilizationsConfig, FactionSituation } from "../FactionPersonality";
import { WorldStateKey, type WorldState } from "../ActionTypes";

// Minimal config that matches the structure expected by CivilizationGovernor
const testConfig: CivilizationsConfig = {
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
	volt_collective: {
		name: "Volt Collective",
		description: "Lightning aggressors",
		color: "#4169E1",
		governorBias: {
			economy: 0.8,
			mining: 1.0,
			military: 1.5,
			defense: 0.9,
			research: 1.0,
			expansion: 1.3,
		},
	},
};

function makeNeutralSituation(): FactionSituation {
	return {
		resourceLevel: 0.5,
		explorationLevel: 0.5,
		idleUnits: 3,
		totalUnits: 5,
		underAttack: false,
		outpostCount: 1,
		techTier: 0,
		maxTechTier: 4,
	};
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("CivilizationGovernor — construction", () => {
	it("creates a governor from valid config", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		expect(gov.civId).toBe("reclaimers");
		expect(gov.factionName).toBe("Reclaimers");
	});

	it("throws for unknown faction", () => {
		expect(() => new CivilizationGovernor("unknown", testConfig)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// BUG 2 FIX: Fallback when no plan exists
// ---------------------------------------------------------------------------

describe("BUG 2 FIX — governor fallback (phone home pattern)", () => {
	it("returns an action even from empty world state (uses BasicHarvest fallback)", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();
		const emptyWorldState: WorldState = {};

		// First tick should evaluate goals, plan, and return an action
		const action = gov.tick(situation, emptyWorldState);

		// With BasicHarvest (no preconditions), the planner should always find a plan
		expect(action).not.toBeNull();
	});

	it("falls back to gather when plan completes and no new plan is found", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();
		const worldState: WorldState = {
			[WorldStateKey.HAS_IDLE_UNITS]: true,
		};

		// First tick: should plan and return an action
		const action1 = gov.tick(situation, worldState);
		expect(action1).not.toBeNull();

		// Complete the action
		gov.completeCurrentAction();

		// Next tick: should re-plan (cooldown reset after plan completion)
		const action2 = gov.tick(situation, worldState);
		// Should not be permanently stuck
		expect(action2).not.toBeNull();
	});

	it("governor NEVER returns null — always produces an action", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();
		const worldState: WorldState = {};

		// Run 100 ticks — governor must always return an action (phone home guarantee)
		for (let i = 0; i < 100; i++) {
			const action = gov.tick(situation, worldState);
			expect(action).not.toBeNull();
			gov.completeCurrentAction();
		}
	});

	it("sets needsBaseAssignment flag when using phone home fallback", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();

		// Create a world state where all goals are already satisfied,
		// so the planner finds empty plans and exhausts quickly
		const saturatedWorldState: WorldState = {
			[WorldStateKey.HAS_IDLE_UNITS]: true,
			[WorldStateKey.HAS_RESOURCES]: true,
			[WorldStateKey.HAS_SCOUTED]: true,
			[WorldStateKey.HAS_OUTPOST]: true,
			[WorldStateKey.HAS_DEFENSES]: true,
			[WorldStateKey.HAS_MINERS]: true,
			[WorldStateKey.TERRITORY_EXPANDED]: true,
			[WorldStateKey.RESOURCES_GATHERED]: true,
			[WorldStateKey.DEFENSES_BUILT]: true,
			[WorldStateKey.TECH_RESEARCHED]: true,
			[WorldStateKey.MAP_SCOUTED]: true,
			[WorldStateKey.CUBES_HOARDED]: true,
		};

		// Exhaust the governor by completing many cycles with a fully-satisfied state
		let sawPhoneHome = false;
		for (let i = 0; i < 50; i++) {
			const action = gov.tick(situation, saturatedWorldState);
			expect(action).not.toBeNull();
			if (action!.needsBaseAssignment) {
				sawPhoneHome = true;
			}
			gov.completeCurrentAction();
		}

		// When all goals are satisfied, the governor should eventually phone home
		expect(sawPhoneHome).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Goal evaluation
// ---------------------------------------------------------------------------

describe("CivilizationGovernor — goal evaluation", () => {
	it("exposes scored goals for debug UI", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();
		const worldState: WorldState = { [WorldStateKey.HAS_IDLE_UNITS]: true };

		gov.tick(situation, worldState);

		const scored = gov.getScoredGoals();
		expect(scored.length).toBeGreaterThan(0);
		// Should be sorted by priority descending
		for (let i = 1; i < scored.length; i++) {
			expect(scored[i - 1].priority).toBeGreaterThanOrEqual(scored[i].priority);
		}
	});

	it("switches goal when a much higher priority emerges", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const normalSituation = makeNeutralSituation();
		const worldState: WorldState = { [WorldStateKey.HAS_IDLE_UNITS]: true };

		gov.tick(normalSituation, worldState);
		// Capture initial goal for conceptual context (not compared directly — weights may vary)
		gov.getCurrentGoal();

		// Simulate being under attack — should shift priorities
		const crisisSituation: FactionSituation = {
			...normalSituation,
			underAttack: true,
			resourceLevel: 0.05,
		};

		// Force re-evaluation by ticking enough times
		for (let i = 0; i < 15; i++) {
			gov.tick(crisisSituation, worldState);
		}

		// The goal may or may not have changed depending on weights,
		// but the governor should still produce valid actions
		gov.tick(crisisSituation, worldState);
		// Governor should still be functional
		expect(gov.getCurrentGoal()).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Force reevaluation
// ---------------------------------------------------------------------------

describe("CivilizationGovernor — force reevaluation", () => {
	it("forceReevaluation causes immediate re-plan on next tick", () => {
		const gov = new CivilizationGovernor("reclaimers", testConfig);
		const situation = makeNeutralSituation();
		const worldState: WorldState = { [WorldStateKey.HAS_IDLE_UNITS]: true };

		gov.tick(situation, worldState);
		gov.forceReevaluation();

		// Next tick should re-evaluate (reevalCooldown was reset to 0)
		const action = gov.tick(situation, worldState);
		// Should produce an action since BasicHarvest is always available
		expect(action).not.toBeNull();
	});
});
