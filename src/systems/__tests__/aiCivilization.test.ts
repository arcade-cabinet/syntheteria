/**
 * Tests for AI civilization governor system.
 *
 * Tests cover:
 * - Initialization from config (state per faction, governor biases)
 * - Independent resource pools per faction
 * - State machine phases (GATHER → BUILD → EXPAND → DEFEND)
 * - Passive resource harvesting scaled by faction bonuses
 * - Governor decisions every 10 ticks
 * - Building construction, territory expansion, unit production
 * - Threat assessment between factions
 * - Phase transition triggers (cubes threshold, threat threshold, timer)
 * - Reset clears all state
 * - Tech level advancement and cap
 */

jest.mock("../../../config", () => ({
	config: {
		civilizations: {
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
		},
		territory: {
			outpostTiers: [
				{ tier: 1, radius: 10, cubeCost: 20, upgradeCost: 40 },
				{ tier: 2, radius: 20, cubeCost: 40, upgradeCost: 80 },
				{ tier: 3, radius: 35, cubeCost: 80 },
			],
			resourceBonusInTerritory: 1.5,
			buildingCostReduction: 0.8,
			contestationDecayRate: 0.01,
			minimumOutpostSpacing: 15,
		},
	},
}));

import {
	aiCivilizationSystem,
	getAllCivStates,
	getCivState,
	initializeCivilizations,
	resetCivilizations,
} from "../aiCivilization";

beforeEach(() => {
	resetCivilizations();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("initializeCivilizations", () => {
	it("creates states for all configured civilizations", () => {
		initializeCivilizations();

		const states = getAllCivStates();
		expect(states.length).toBe(2);
		expect(states.map((s) => s.civId).sort()).toEqual([
			"reclaimers",
			"volt_collective",
		]);
	});

	it("sets initial resources", () => {
		initializeCivilizations();

		const reclaimers = getCivState("reclaimers");
		expect(reclaimers).toBeDefined();
		expect(reclaimers!.resources.cubes).toBe(0);
		expect(reclaimers!.resources.units).toBe(3);
		expect(reclaimers!.resources.buildings).toBe(1);
		expect(reclaimers!.resources.territories).toBe(1);
	});

	it("loads governor bias from config", () => {
		initializeCivilizations();

		const reclaimers = getCivState("reclaimers");
		expect(reclaimers!.bias.economy).toBe(1.5);
		expect(reclaimers!.bias.mining).toBe(1.3);
		expect(reclaimers!.bias.military).toBe(0.8);

		const volt = getCivState("volt_collective");
		expect(volt!.bias.military).toBe(1.5);
		expect(volt!.bias.expansion).toBe(1.3);
	});

	it("starts in GATHER phase", () => {
		initializeCivilizations();

		const reclaimers = getCivState("reclaimers");
		expect(reclaimers!.phase).toBe("GATHER");
		expect(reclaimers!.phaseTimer).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Tick behavior
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — tick", () => {
	beforeEach(() => {
		initializeCivilizations();
	});

	it("increments ticksAlive each tick", () => {
		aiCivilizationSystem();
		const state = getCivState("reclaimers")!;
		expect(state.ticksAlive).toBe(1);

		aiCivilizationSystem();
		expect(state.ticksAlive).toBe(2);
	});

	it("increments phaseTimer each tick", () => {
		const state = getCivState("reclaimers")!;
		expect(state.phaseTimer).toBe(0);

		aiCivilizationSystem();
		expect(state.phaseTimer).toBe(1);

		aiCivilizationSystem();
		expect(state.phaseTimer).toBe(2);
	});

	it("provides passive income from territories", () => {
		const state = getCivState("reclaimers")!;
		const initialCubes = state.resources.cubes;

		aiCivilizationSystem();

		expect(state.resources.cubes).toBeGreaterThanOrEqual(initialCubes);
	});

	it("passive harvest scales with territory count and economy bias", () => {
		const state = getCivState("reclaimers")!;
		state.resources.territories = 10;
		state.resources.cubes = 0;

		aiCivilizationSystem();

		// harvestRate = territories * 0.1 * bias.economy = 10 * 0.1 * 1.5 = 1.5 → round(1.5) = 2
		expect(state.resources.cubes).toBe(2);
	});

	it("factions have independent resource pools", () => {
		const reclaimers = getCivState("reclaimers")!;
		const volt = getCivState("volt_collective")!;

		reclaimers.resources.territories = 10;
		volt.resources.territories = 1;
		reclaimers.resources.cubes = 0;
		volt.resources.cubes = 0;

		aiCivilizationSystem();

		// Reclaimers should have more cubes due to more territories
		expect(reclaimers.resources.cubes).toBeGreaterThan(volt.resources.cubes);
	});
});

// ---------------------------------------------------------------------------
// Governor decisions
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — decisions", () => {
	beforeEach(() => {
		initializeCivilizations();
	});

	it("makes decisions every 10 ticks", () => {
		const state = getCivState("reclaimers")!;
		expect(state.lastDecision).toBeNull();

		for (let i = 0; i < 9; i++) {
			aiCivilizationSystem();
		}
		expect(state.lastDecision).toBeNull();

		aiCivilizationSystem();
		expect(state.lastDecision).not.toBeNull();
		expect(state.lastDecision!.priority).toBeDefined();
		expect(state.lastDecision!.action).toBeDefined();
		expect(state.lastDecision!.score).toBeGreaterThanOrEqual(0);
	});

	it("reclaimers prioritize economy/mining (high bias)", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		const decision = state.lastDecision!;
		expect(["economy", "mining"]).toContain(decision.priority);
	});

	it("volt_collective leans toward military when threatened", () => {
		const state = getCivState("volt_collective")!;
		state.threatLevel = 0.8;
		state.resources.cubes = 50;

		state.bias.military = 10;
		state.bias.economy = 0.1;
		state.bias.mining = 0.1;
		state.bias.defense = 0.1;
		state.bias.research = 0.1;
		state.bias.expansion = 0.1;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		const decision = state.lastDecision!;
		expect(decision.priority).toBe("military");
	});
});

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — actions", () => {
	beforeEach(() => {
		initializeCivilizations();
	});

	it("economy action harvests cubes based on territories", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 0;
		state.resources.territories = 5;

		state.bias.economy = 10;
		state.bias.mining = 2.0;
		state.bias.military = 0;
		state.bias.defense = 0;
		state.bias.research = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.resources.cubes).toBeGreaterThan(0);
	});

	it("military action produces units and costs cubes", () => {
		const state = getCivState("volt_collective")!;
		state.resources.cubes = 100;
		state.threatLevel = 1;
		const initialUnits = state.resources.units;

		state.bias.military = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.defense = 0;
		state.bias.research = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.resources.units).toBe(initialUnits + 1);
		expect(state.resources.cubes).toBeLessThan(100);
	});

	it("expansion action claims territory", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 100;
		state.resources.territories = 0;
		const initialTerritories = state.resources.territories;

		state.bias.expansion = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.military = 0;
		state.bias.defense = 0;
		state.bias.research = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.resources.territories).toBe(initialTerritories + 1);
	});

	it("research action advances tech level", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 100;
		const initialTech = state.techLevel;

		state.bias.research = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.military = 0;
		state.bias.defense = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.techLevel).toBe(initialTech + 1);
	});

	it("tech level caps at 4", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 10000;
		state.techLevel = 4;

		state.bias.research = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.military = 0;
		state.bias.defense = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.techLevel).toBe(4);
	});

	it("defense action builds defenses and costs cubes", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 100;
		state.threatLevel = 1;
		const initialBuildings = state.resources.buildings;

		state.bias.defense = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.military = 0;
		state.bias.research = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		expect(state.resources.buildings).toBe(initialBuildings + 1);
		expect(state.resources.cubes).toBeLessThan(100);
	});
});

// ---------------------------------------------------------------------------
// Threat assessment
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — threat", () => {
	beforeEach(() => {
		initializeCivilizations();
	});

	it("threat assessment updates based on military balance", () => {
		const reclaimers = getCivState("reclaimers")!;
		const volt = getCivState("volt_collective")!;

		volt.militaryStrength = 20;
		reclaimers.militaryStrength = 2;

		aiCivilizationSystem();

		expect(reclaimers.threatLevel).toBeGreaterThan(0);
	});

	it("threat decays over time when military balance equalizes", () => {
		const reclaimers = getCivState("reclaimers")!;
		const volt = getCivState("volt_collective")!;

		// Initial high threat
		volt.militaryStrength = 20;
		reclaimers.militaryStrength = 2;
		reclaimers.threatLevel = 0.8;

		// Equalize military
		reclaimers.militaryStrength = 20;

		// Threat should decay (exponential smoothing: 0.8 * old + 0.2 * new)
		aiCivilizationSystem();
		expect(reclaimers.threatLevel).toBeLessThan(0.8);
	});

	it("no threat when faction has equal or greater military strength", () => {
		const reclaimers = getCivState("reclaimers")!;
		const volt = getCivState("volt_collective")!;

		reclaimers.militaryStrength = 20;
		volt.militaryStrength = 10;
		reclaimers.threatLevel = 0;

		aiCivilizationSystem();

		// No new threat (reclaimers are stronger), old threat was 0
		expect(reclaimers.threatLevel).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Phase transitions (state machine)
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — phases", () => {
	beforeEach(() => {
		initializeCivilizations();
	});

	it("starts in GATHER phase", () => {
		const state = getCivState("reclaimers")!;
		expect(state.phase).toBe("GATHER");
	});

	it("transitions from GATHER to BUILD when cubes exceed threshold", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 10; // BUILD_THRESHOLD

		aiCivilizationSystem();

		expect(state.phase).toBe("BUILD");
		expect(state.phaseTimer).toBe(0);
	});

	it("auto-transitions after phase duration (50 ticks)", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 0; // not enough to trigger early transition

		for (let i = 0; i < 50; i++) {
			aiCivilizationSystem();
		}

		// After 50 ticks, should have auto-transitioned from GATHER
		expect(state.phase).not.toBe("GATHER");
	});

	it("forces DEFEND phase when threat is high", () => {
		const state = getCivState("reclaimers")!;
		const volt = getCivState("volt_collective")!;

		// Create massive military imbalance so threat stays high after updateThreatLevel
		volt.militaryStrength = 50;
		state.militaryStrength = 0;
		state.threatLevel = 0.6; // above DEFEND_THREAT_THRESHOLD (0.5)

		aiCivilizationSystem();

		expect(state.phase).toBe("DEFEND");
	});

	it("cycles through phases: GATHER → BUILD → EXPAND → DEFEND → GATHER", () => {
		const state = getCivState("reclaimers")!;

		// Force transitions by setting phaseTimer to threshold
		state.phaseTimer = 50;
		aiCivilizationSystem();
		expect(state.phase).toBe("BUILD");

		state.phaseTimer = 50;
		aiCivilizationSystem();
		expect(state.phase).toBe("EXPAND");

		state.phaseTimer = 50;
		aiCivilizationSystem();
		expect(state.phase).toBe("DEFEND");

		state.phaseTimer = 50;
		aiCivilizationSystem();
		expect(state.phase).toBe("GATHER");
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetCivilizations", () => {
	it("clears all state", () => {
		initializeCivilizations();
		expect(getAllCivStates().length).toBe(2);

		resetCivilizations();
		expect(getAllCivStates()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("aiCivilizationSystem — edge cases", () => {
	it("runs safely with no civilizations initialized", () => {
		expect(() => aiCivilizationSystem()).not.toThrow();
		expect(getAllCivStates()).toEqual([]);
	});

	it("actions are no-op when insufficient cubes", () => {
		initializeCivilizations();
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 0;
		const initialUnits = state.resources.units;

		state.bias.military = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.defense = 0;
		state.bias.research = 0;
		state.bias.expansion = 0;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		// Can't afford units (costs 8 cubes), passive harvest gave some cubes but not enough
		// Units should be unchanged since harvest is slow at 1 territory
		expect(state.resources.units).toBe(initialUnits);
	});

	it("getCivState returns undefined for unknown faction", () => {
		initializeCivilizations();
		expect(getCivState("nonexistent")).toBeUndefined();
	});
});
