/**
 * Unit tests for stormSystem — 5-phase storm escalation,
 * wealth-based raid strength formula, per-faction aggression timers.
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

const mockStormPacing = {
	phases: [
		{
			id: "calm",
			minGameTick: 0,
			raidCooldownTicks: 1200,
			raidWealthMultiplier: 0.5,
			aggressionMultiplier: 0.5,
			stormIntensity: 0.0,
		},
		{
			id: "rising",
			minGameTick: 3000,
			raidCooldownTicks: 900,
			raidWealthMultiplier: 0.8,
			aggressionMultiplier: 0.75,
			stormIntensity: 0.25,
		},
		{
			id: "active",
			minGameTick: 7500,
			raidCooldownTicks: 600,
			raidWealthMultiplier: 1.0,
			aggressionMultiplier: 1.0,
			stormIntensity: 0.5,
		},
		{
			id: "intense",
			minGameTick: 15000,
			raidCooldownTicks: 400,
			raidWealthMultiplier: 1.25,
			aggressionMultiplier: 1.5,
			stormIntensity: 0.75,
		},
		{
			id: "endgame",
			minGameTick: 30000,
			raidCooldownTicks: 200,
			raidWealthMultiplier: 1.75,
			aggressionMultiplier: 2.0,
			stormIntensity: 1.0,
		},
	],
	raidStrengthWeights: {
		cubeCountFactor: 0.5,
		buildingCountFactor: 2.0,
		techLevelFactor: 10.0,
	},
	aggressionCooldownTicksBase: 1200,
	aggressionEventTypes: ["raid", "probe", "siege"],
};

jest.mock("../../../config", () => ({
	config: {
		combat: {
			stormPacing: mockStormPacing,
			raid: {
				factionAggression: {
					reclaimers: { aggressionMod: 0.7 },
					volt_collective: { aggressionMod: 1.5 },
					signal_choir: { aggressionMod: 1.0 },
					iron_creed: { aggressionMod: 0.5 },
				},
			},
		},
	},
}));

import {
	stormSystem,
	resetStormSystem,
	getCurrentPhase,
	getCurrentPhaseIndex,
	getPhaseIndexForTick,
	calculateRaidStrength,
	calculateBaseRaidStrength,
	registerFactionAggression,
	getFactionAggressionState,
	getAllAggressionStates,
	isFactionReadyToAggress,
	consumeAggressionReady,
} from "../stormSystem";

beforeEach(() => {
	resetStormSystem();
});

// ---------------------------------------------------------------------------
// Phase escalation
// ---------------------------------------------------------------------------

describe("stormSystem — phase escalation", () => {
	it("starts in phase 0 (calm)", () => {
		expect(getCurrentPhaseIndex()).toBe(0);
		expect(getCurrentPhase().id).toBe("calm");
	});

	it("getPhaseIndexForTick returns 0 for tick 0", () => {
		expect(getPhaseIndexForTick(0)).toBe(0);
	});

	it("getPhaseIndexForTick returns 1 for tick 3000", () => {
		expect(getPhaseIndexForTick(3000)).toBe(1);
	});

	it("getPhaseIndexForTick returns 2 for tick 7500", () => {
		expect(getPhaseIndexForTick(7500)).toBe(2);
	});

	it("getPhaseIndexForTick returns 3 for tick 15000", () => {
		expect(getPhaseIndexForTick(15000)).toBe(3);
	});

	it("getPhaseIndexForTick returns 4 for tick 30000", () => {
		expect(getPhaseIndexForTick(30000)).toBe(4);
	});

	it("getPhaseIndexForTick returns 1 for tick between 3000 and 7499", () => {
		expect(getPhaseIndexForTick(5000)).toBe(1);
	});

	it("getPhaseIndexForTick returns highest phase for very large tick", () => {
		expect(getPhaseIndexForTick(999999)).toBe(4);
	});

	it("stormSystem tick updates current phase", () => {
		stormSystem(7500);
		expect(getCurrentPhaseIndex()).toBe(2);
		expect(getCurrentPhase().id).toBe("active");
	});

	it("stormSystem tick advances to endgame phase", () => {
		stormSystem(30000);
		expect(getCurrentPhaseIndex()).toBe(4);
		expect(getCurrentPhase().id).toBe("endgame");
	});

	it("phase properties match config", () => {
		stormSystem(15000);
		const phase = getCurrentPhase();
		expect(phase.raidCooldownTicks).toBe(400);
		expect(phase.raidWealthMultiplier).toBe(1.25);
		expect(phase.aggressionMultiplier).toBe(1.5);
		expect(phase.stormIntensity).toBe(0.75);
	});

	it("phase does not regress on lower tick", () => {
		stormSystem(30000); // set to endgame
		stormSystem(0); // cannot go back
		// Phase updates to what tick 0 maps to (calm = 0)
		expect(getCurrentPhaseIndex()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Raid strength formula
// ---------------------------------------------------------------------------

describe("stormSystem — calculateRaidStrength", () => {
	it("base formula: cubeCount*0.5 + buildingCount*2 + techLevel*10", () => {
		// In phase 0 (calm), raidWealthMultiplier = 0.5
		stormSystem(0);
		// 10*0.5 + 5*2 + 1*10 = 5 + 10 + 10 = 25, * 0.5 = 12.5
		expect(calculateRaidStrength({ cubeCount: 10, buildingCount: 5, techLevel: 1 })).toBe(12.5);
	});

	it("scales with active phase multiplier", () => {
		stormSystem(7500); // active phase, multiplier = 1.0
		// 10*0.5 + 5*2 + 1*10 = 25
		expect(calculateRaidStrength({ cubeCount: 10, buildingCount: 5, techLevel: 1 })).toBe(25);
	});

	it("endgame multiplier amplifies strength", () => {
		stormSystem(30000); // endgame, multiplier = 1.75
		// 20*0.5 + 4*2 + 2*10 = 10+8+20 = 38, * 1.75 = 66.5
		expect(calculateRaidStrength({ cubeCount: 20, buildingCount: 4, techLevel: 2 })).toBe(66.5);
	});

	it("zero inputs produce zero strength", () => {
		stormSystem(7500);
		expect(calculateRaidStrength({ cubeCount: 0, buildingCount: 0, techLevel: 0 })).toBe(0);
	});

	it("calculateBaseRaidStrength ignores phase multiplier", () => {
		stormSystem(30000); // endgame multiplier 1.75
		// 10*0.5 + 5*2 + 1*10 = 25 — no multiplier applied
		expect(calculateBaseRaidStrength({ cubeCount: 10, buildingCount: 5, techLevel: 1 })).toBe(25);
	});

	it("tech level dominates at high values", () => {
		stormSystem(7500);
		// techLevel=10 contributes 100, vs cubeCount=100 contributing 50
		const strength = calculateRaidStrength({ cubeCount: 100, buildingCount: 0, techLevel: 10 });
		expect(strength).toBe(100 * 0.5 + 0 + 10 * 10.0); // 50 + 100 = 150
	});
});

// ---------------------------------------------------------------------------
// Aggression timers
// ---------------------------------------------------------------------------

describe("stormSystem — aggression timers", () => {
	it("registerFactionAggression creates state with base cooldown", () => {
		registerFactionAggression("reclaimers");
		const state = getFactionAggressionState("reclaimers");
		expect(state).toBeDefined();
		expect(state!.faction).toBe("reclaimers");
		expect(state!.cooldownTicksRemaining).toBe(1200);
		expect(state!.isReady).toBe(false);
	});

	it("registerFactionAggression is idempotent", () => {
		registerFactionAggression("reclaimers");
		registerFactionAggression("reclaimers"); // second call
		const all = getAllAggressionStates();
		expect(all.filter((s) => s.faction === "reclaimers")).toHaveLength(1);
	});

	it("isFactionReadyToAggress returns false initially", () => {
		registerFactionAggression("reclaimers");
		expect(isFactionReadyToAggress("reclaimers")).toBe(false);
	});

	it("isFactionReadyToAggress returns false for unknown faction", () => {
		expect(isFactionReadyToAggress("unknown_faction")).toBe(false);
	});

	it("cooldown ticks down during stormSystem ticks", () => {
		registerFactionAggression("reclaimers");
		stormSystem(1);
		stormSystem(2);
		stormSystem(3);
		const state = getFactionAggressionState("reclaimers");
		expect(state!.cooldownTicksRemaining).toBe(1197); // 1200 - 3
	});

	it("becomes ready when cooldown reaches 0", () => {
		registerFactionAggression("volt_collective");
		// Tick 1200 times
		for (let t = 1; t <= 1200; t++) {
			stormSystem(t);
		}
		expect(isFactionReadyToAggress("volt_collective")).toBe(true);
	});

	it("does not tick below 0 when already ready", () => {
		registerFactionAggression("signal_choir");
		for (let t = 1; t <= 1200; t++) {
			stormSystem(t);
		}
		const stateBefore = getFactionAggressionState("signal_choir")!;
		const ticksBefore = stateBefore.cooldownTicksRemaining;
		stormSystem(1201);
		const stateAfter = getFactionAggressionState("signal_choir")!;
		expect(stateAfter.cooldownTicksRemaining).toBe(ticksBefore);
	});

	it("consumeAggressionReady returns false when not ready", () => {
		registerFactionAggression("iron_creed");
		expect(consumeAggressionReady("iron_creed", 100)).toBe(false);
	});

	it("consumeAggressionReady returns true and resets when ready", () => {
		registerFactionAggression("reclaimers");
		// Force ready
		for (let t = 1; t <= 1200; t++) {
			stormSystem(t);
		}
		expect(isFactionReadyToAggress("reclaimers")).toBe(true);

		const consumed = consumeAggressionReady("reclaimers", 1200);
		expect(consumed).toBe(true);
		expect(isFactionReadyToAggress("reclaimers")).toBe(false);
	});

	it("consumeAggressionReady increments totalEvents", () => {
		registerFactionAggression("volt_collective");
		for (let t = 1; t <= 1200; t++) {
			stormSystem(t);
		}
		consumeAggressionReady("volt_collective", 1200);
		const state = getFactionAggressionState("volt_collective")!;
		expect(state.totalEvents).toBe(1);
	});

	it("consumeAggressionReady sets lastEventTick", () => {
		registerFactionAggression("signal_choir");
		for (let t = 1; t <= 1200; t++) {
			stormSystem(t);
		}
		consumeAggressionReady("signal_choir", 1200);
		expect(getFactionAggressionState("signal_choir")!.lastEventTick).toBe(1200);
	});

	it("all factions can be registered and tracked independently", () => {
		const factions = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"];
		for (const f of factions) {
			registerFactionAggression(f);
		}
		expect(getAllAggressionStates()).toHaveLength(4);
	});
});

// ---------------------------------------------------------------------------
// Phase × aggression interaction
// ---------------------------------------------------------------------------

describe("stormSystem — phase affects aggression cooldown after consume", () => {
	it("higher phase aggressionMultiplier yields shorter cooldown after consume", () => {
		registerFactionAggression("volt_collective");

		// Advance to active phase (aggressionMultiplier = 1.0)
		stormSystem(7500);
		for (let t = 7501; t <= 8700; t++) {
			stormSystem(t);
		}
		expect(isFactionReadyToAggress("volt_collective")).toBe(true);
		consumeAggressionReady("volt_collective", 8700);
		const activePhaseCD = getFactionAggressionState("volt_collective")!.cooldownTicksRemaining;

		// Reset and advance to endgame (aggressionMultiplier = 2.0)
		resetStormSystem();
		registerFactionAggression("volt_collective");
		stormSystem(30000);
		for (let t = 30001; t <= 31200; t++) {
			stormSystem(t);
		}
		expect(isFactionReadyToAggress("volt_collective")).toBe(true);
		consumeAggressionReady("volt_collective", 31200);
		const endgamePhaseCD = getFactionAggressionState("volt_collective")!.cooldownTicksRemaining;

		// Endgame should have shorter cooldown than active
		expect(endgamePhaseCD).toBeLessThan(activePhaseCD);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("stormSystem — reset", () => {
	it("clears phase index to 0", () => {
		stormSystem(30000);
		resetStormSystem();
		expect(getCurrentPhaseIndex()).toBe(0);
	});

	it("clears all aggression states", () => {
		registerFactionAggression("reclaimers");
		registerFactionAggression("volt_collective");
		resetStormSystem();
		expect(getAllAggressionStates()).toHaveLength(0);
	});
});
