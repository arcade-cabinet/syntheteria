/**
 * Unit tests for FactionPersonality — bias-to-goal weight mapping and situational modifiers.
 *
 * Covers:
 * - computeBaseWeights: all factions produce weights in [0, 1]
 * - computeBaseWeights: faction biases produce distinct personality profiles
 * - applySituationalModifiers: low resources boosts GATHER + HOARD
 * - applySituationalModifiers: under attack boosts BUILD_DEFENSES, reduces EXPAND + TRADE
 * - applySituationalModifiers: low exploration boosts SCOUT_MAP
 * - applySituationalModifiers: many idle units boosts EXPAND + ATTACK
 * - applySituationalModifiers: behind on tech boosts RESEARCH
 * - applySituationalModifiers: no outposts boosts EXPAND_TERRITORY
 * - applySituationalModifiers: does not exceed 1.0 (capped)
 * - loadFactionWeights: returns null for unknown faction
 * - loadFactionWeights: returns weights for known faction
 */

import {
	computeBaseWeights,
	applySituationalModifiers,
	loadFactionWeights,
	type GovernorBias,
	type CivilizationsConfig,
	type FactionSituation,
} from "../FactionPersonality";
import { CivGoal } from "../GoalTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUniformBias(value: number): GovernorBias {
	return {
		economy: value,
		mining: value,
		military: value,
		defense: value,
		research: value,
		expansion: value,
	};
}

function makeTestConfig(): CivilizationsConfig {
	return {
		reclaimers: {
			name: "Reclaimers",
			description: "Test faction",
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
			description: "Test faction",
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
}

function makeNeutralSituation(): FactionSituation {
	return {
		resourceLevel: 0.5,
		explorationLevel: 0.5,
		idleUnits: 2,
		totalUnits: 5,
		underAttack: false,
		outpostCount: 2,
		techTier: 2,
		maxTechTier: 4,
	};
}

// ---------------------------------------------------------------------------
// computeBaseWeights
// ---------------------------------------------------------------------------

describe("computeBaseWeights — value ranges", () => {
	it("all weights are in [0, 1] range for high uniform bias", () => {
		const weights = computeBaseWeights(makeUniformBias(1.5));
		for (const goal of Object.values(CivGoal)) {
			expect(weights[goal]).toBeGreaterThanOrEqual(0);
			expect(weights[goal]).toBeLessThanOrEqual(1);
		}
	});

	it("all weights are in [0, 1] range for low uniform bias", () => {
		const weights = computeBaseWeights(makeUniformBias(0.7));
		for (const goal of Object.values(CivGoal)) {
			expect(weights[goal]).toBeGreaterThanOrEqual(0);
			expect(weights[goal]).toBeLessThanOrEqual(1);
		}
	});

	it("produces weights for every CivGoal", () => {
		const weights = computeBaseWeights(makeUniformBias(1.0));
		for (const goal of Object.values(CivGoal)) {
			expect(weights[goal]).toBeDefined();
			expect(typeof weights[goal]).toBe("number");
		}
	});
});

describe("computeBaseWeights — faction differentiation", () => {
	it("economy-heavy faction scores GATHER_RESOURCES higher than military-heavy", () => {
		const economyBias: GovernorBias = {
			economy: 1.5,
			mining: 1.5,
			military: 0.7,
			defense: 0.7,
			research: 0.7,
			expansion: 0.7,
		};
		const militaryBias: GovernorBias = {
			economy: 0.7,
			mining: 0.7,
			military: 1.5,
			defense: 1.5,
			research: 0.7,
			expansion: 0.7,
		};

		const economyWeights = computeBaseWeights(economyBias);
		const militaryWeights = computeBaseWeights(militaryBias);

		expect(economyWeights[CivGoal.GATHER_RESOURCES]).toBeGreaterThan(
			militaryWeights[CivGoal.GATHER_RESOURCES],
		);
	});

	it("military-heavy faction scores ATTACK_ENEMY higher than economy-heavy", () => {
		const economyBias: GovernorBias = {
			economy: 1.5,
			mining: 1.5,
			military: 0.7,
			defense: 0.7,
			research: 0.7,
			expansion: 0.7,
		};
		const militaryBias: GovernorBias = {
			economy: 0.7,
			mining: 0.7,
			military: 1.5,
			defense: 0.7,
			research: 0.7,
			expansion: 1.5,
		};

		const economyWeights = computeBaseWeights(economyBias);
		const militaryWeights = computeBaseWeights(militaryBias);

		expect(militaryWeights[CivGoal.ATTACK_ENEMY]).toBeGreaterThan(
			economyWeights[CivGoal.ATTACK_ENEMY],
		);
	});

	it("research-heavy faction scores RESEARCH_TECH higher than military-heavy", () => {
		const researchBias: GovernorBias = {
			economy: 0.7,
			mining: 0.7,
			military: 0.7,
			defense: 0.7,
			research: 1.5,
			expansion: 0.7,
		};
		const militaryBias: GovernorBias = {
			economy: 0.7,
			mining: 0.7,
			military: 1.5,
			defense: 0.7,
			research: 0.7,
			expansion: 0.7,
		};

		const researchWeights = computeBaseWeights(researchBias);
		const militaryWeights = computeBaseWeights(militaryBias);

		expect(researchWeights[CivGoal.RESEARCH_TECH]).toBeGreaterThan(
			militaryWeights[CivGoal.RESEARCH_TECH],
		);
	});

	it("Reclaimers (economy+mining) outweigh Volt Collective on GATHER_RESOURCES", () => {
		const config = makeTestConfig();
		const reclaimersWeights = computeBaseWeights(config.reclaimers.governorBias);
		const voltWeights = computeBaseWeights(config.volt_collective.governorBias);

		expect(reclaimersWeights[CivGoal.GATHER_RESOURCES]).toBeGreaterThan(
			voltWeights[CivGoal.GATHER_RESOURCES],
		);
	});

	it("Volt Collective (military+expansion) outweigh Reclaimers on ATTACK_ENEMY", () => {
		const config = makeTestConfig();
		const reclaimersWeights = computeBaseWeights(config.reclaimers.governorBias);
		const voltWeights = computeBaseWeights(config.volt_collective.governorBias);

		expect(voltWeights[CivGoal.ATTACK_ENEMY]).toBeGreaterThan(
			reclaimersWeights[CivGoal.ATTACK_ENEMY],
		);
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — resource level
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — low resources", () => {
	it("boosts GATHER_RESOURCES when resourceLevel < 0.3", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const lowResource: FactionSituation = { resourceLevel: 0.1 };
		const modified = applySituationalModifiers(base, lowResource);

		expect(modified[CivGoal.GATHER_RESOURCES]).toBeGreaterThan(
			base[CivGoal.GATHER_RESOURCES],
		);
	});

	it("boosts HOARD_CUBES when resourceLevel < 0.3", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const lowResource: FactionSituation = { resourceLevel: 0.05 };
		const modified = applySituationalModifiers(base, lowResource);

		expect(modified[CivGoal.HOARD_CUBES]).toBeGreaterThan(
			base[CivGoal.HOARD_CUBES],
		);
	});

	it("does not boost gathering when resourceLevel >= 0.3", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const highResource: FactionSituation = { resourceLevel: 0.3 };
		const modified = applySituationalModifiers(base, highResource);

		// Should NOT boost (resourceLevel is exactly on the threshold)
		expect(modified[CivGoal.GATHER_RESOURCES]).toBe(base[CivGoal.GATHER_RESOURCES]);
	});

	it("does not reduce gathering goals when resources are plentiful", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const plentiful: FactionSituation = { resourceLevel: 0.9 };
		const modified = applySituationalModifiers(base, plentiful);

		expect(modified[CivGoal.GATHER_RESOURCES]).toBe(base[CivGoal.GATHER_RESOURCES]);
	});

	it("caps boosted values at 1.0", () => {
		const highBias: GovernorBias = {
			economy: 1.5,
			mining: 1.5,
			military: 0.7,
			defense: 0.7,
			research: 0.7,
			expansion: 0.7,
		};
		const base = computeBaseWeights(highBias);

		const crisis: FactionSituation = { resourceLevel: 0.0 };
		const modified = applySituationalModifiers(base, crisis);

		for (const goal of Object.values(CivGoal)) {
			expect(modified[goal]).toBeLessThanOrEqual(1.0);
		}
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — under attack
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — under attack", () => {
	it("boosts BUILD_DEFENSES when underAttack is true", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const attack: FactionSituation = { underAttack: true };
		const modified = applySituationalModifiers(base, attack);

		expect(modified[CivGoal.BUILD_DEFENSES]).toBeGreaterThan(
			base[CivGoal.BUILD_DEFENSES],
		);
	});

	it("reduces EXPAND_TERRITORY when under attack", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const attack: FactionSituation = { underAttack: true };
		const modified = applySituationalModifiers(base, attack);

		expect(modified[CivGoal.EXPAND_TERRITORY]).toBeLessThan(
			base[CivGoal.EXPAND_TERRITORY],
		);
	});

	it("reduces TRADE when under attack", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const attack: FactionSituation = { underAttack: true };
		const modified = applySituationalModifiers(base, attack);

		expect(modified[CivGoal.TRADE]).toBeLessThan(base[CivGoal.TRADE]);
	});

	it("does not boost defenses when not under attack", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const peaceful: FactionSituation = { underAttack: false };
		const modified = applySituationalModifiers(base, peaceful);

		expect(modified[CivGoal.BUILD_DEFENSES]).toBe(base[CivGoal.BUILD_DEFENSES]);
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — exploration level
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — low exploration", () => {
	it("boosts SCOUT_MAP when explorationLevel < 0.4", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const unexplored: FactionSituation = { explorationLevel: 0.1 };
		const modified = applySituationalModifiers(base, unexplored);

		expect(modified[CivGoal.SCOUT_MAP]).toBeGreaterThan(base[CivGoal.SCOUT_MAP]);
	});

	it("does not boost scouting when explorationLevel >= 0.4", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const explored: FactionSituation = { explorationLevel: 0.4 };
		const modified = applySituationalModifiers(base, explored);

		expect(modified[CivGoal.SCOUT_MAP]).toBe(base[CivGoal.SCOUT_MAP]);
	});

	it("does not reduce scouting when well-explored", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const wellExplored: FactionSituation = { explorationLevel: 1.0 };
		const modified = applySituationalModifiers(base, wellExplored);

		expect(modified[CivGoal.SCOUT_MAP]).toBe(base[CivGoal.SCOUT_MAP]);
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — idle units
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — many idle units", () => {
	it("boosts EXPAND_TERRITORY when idle ratio > 0.5", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const manyIdle: FactionSituation = { idleUnits: 4, totalUnits: 5 };
		const modified = applySituationalModifiers(base, manyIdle);

		expect(modified[CivGoal.EXPAND_TERRITORY]).toBeGreaterThan(
			base[CivGoal.EXPAND_TERRITORY],
		);
	});

	it("boosts ATTACK_ENEMY when idle ratio > 0.5", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const manyIdle: FactionSituation = { idleUnits: 4, totalUnits: 5 };
		const modified = applySituationalModifiers(base, manyIdle);

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeGreaterThan(
			base[CivGoal.ATTACK_ENEMY],
		);
	});

	it("does not boost when idle ratio <= 0.5", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const fewIdle: FactionSituation = { idleUnits: 2, totalUnits: 5 };
		const modified = applySituationalModifiers(base, fewIdle);

		// Idle ratio is 0.4, below threshold
		expect(modified[CivGoal.EXPAND_TERRITORY]).toBe(base[CivGoal.EXPAND_TERRITORY]);
		expect(modified[CivGoal.ATTACK_ENEMY]).toBe(base[CivGoal.ATTACK_ENEMY]);
	});

	it("does not boost when totalUnits is 0 (avoids division by zero)", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const noUnits: FactionSituation = { idleUnits: 0, totalUnits: 0 };
		const modified = applySituationalModifiers(base, noUnits);

		// Should not change weights (guard against totalUnits = 0)
		expect(modified[CivGoal.EXPAND_TERRITORY]).toBe(base[CivGoal.EXPAND_TERRITORY]);
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — tech tier
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — behind on tech", () => {
	it("boosts RESEARCH_TECH when techProgress < 0.5", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const behindOnTech: FactionSituation = { techTier: 0, maxTechTier: 4 };
		const modified = applySituationalModifiers(base, behindOnTech);

		expect(modified[CivGoal.RESEARCH_TECH]).toBeGreaterThan(
			base[CivGoal.RESEARCH_TECH],
		);
	});

	it("does not boost research when techProgress >= 0.5", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const atMaxTech: FactionSituation = { techTier: 3, maxTechTier: 4 };
		const modified = applySituationalModifiers(base, atMaxTech);

		expect(modified[CivGoal.RESEARCH_TECH]).toBe(base[CivGoal.RESEARCH_TECH]);
	});

	it("does not crash when maxTechTier is 0", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const zeroTech: FactionSituation = { techTier: 0, maxTechTier: 0 };
		expect(() => applySituationalModifiers(base, zeroTech)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — outpost count
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — no outposts", () => {
	it("boosts EXPAND_TERRITORY when outpostCount is 0", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const noOutposts: FactionSituation = { outpostCount: 0 };
		const modified = applySituationalModifiers(base, noOutposts);

		expect(modified[CivGoal.EXPAND_TERRITORY]).toBeGreaterThan(
			base[CivGoal.EXPAND_TERRITORY],
		);
	});

	it("does not boost expand when outpost count is > 0", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const hasOutposts: FactionSituation = { outpostCount: 2 };
		const modified = applySituationalModifiers(base, hasOutposts);

		expect(modified[CivGoal.EXPAND_TERRITORY]).toBe(base[CivGoal.EXPAND_TERRITORY]);
	});
});

// ---------------------------------------------------------------------------
// applySituationalModifiers — neutral situation (no changes)
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — neutral situation", () => {
	it("does not change weights with neutral/empty situation", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);

		const neutral: FactionSituation = {};
		const modified = applySituationalModifiers(base, neutral);

		for (const goal of Object.values(CivGoal)) {
			expect(modified[goal]).toBe(base[goal]);
		}
	});

	it("returns a new object (does not mutate base weights)", () => {
		const bias = makeUniformBias(1.0);
		const base = computeBaseWeights(bias);
		const originalGather = base[CivGoal.GATHER_RESOURCES];

		const situation: FactionSituation = { resourceLevel: 0.1 };
		applySituationalModifiers(base, situation);

		// base should be unchanged
		expect(base[CivGoal.GATHER_RESOURCES]).toBe(originalGather);
	});
});

// ---------------------------------------------------------------------------
// loadFactionWeights
// ---------------------------------------------------------------------------

describe("loadFactionWeights", () => {
	const config = makeTestConfig();

	it("returns weights for a known faction", () => {
		const weights = loadFactionWeights(config, "reclaimers");
		expect(weights).not.toBeNull();
		expect(typeof weights![CivGoal.GATHER_RESOURCES]).toBe("number");
	});

	it("returns weights for all four real factions", () => {
		const fullConfig: CivilizationsConfig = {
			reclaimers: {
				name: "Reclaimers",
				description: "",
				color: "#000",
				governorBias: { economy: 1.5, mining: 1.3, military: 0.8, defense: 1.0, research: 0.7, expansion: 1.0 },
			},
			volt_collective: {
				name: "Volt Collective",
				description: "",
				color: "#000",
				governorBias: { economy: 0.8, mining: 1.0, military: 1.5, defense: 0.9, research: 1.0, expansion: 1.3 },
			},
			signal_choir: {
				name: "Signal Choir",
				description: "",
				color: "#000",
				governorBias: { economy: 1.0, mining: 0.8, military: 0.7, defense: 1.0, research: 1.5, expansion: 0.9 },
			},
			iron_creed: {
				name: "Iron Creed",
				description: "",
				color: "#000",
				governorBias: { economy: 1.0, mining: 1.0, military: 1.0, defense: 1.5, research: 0.8, expansion: 0.7 },
			},
		};

		for (const factionId of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			const weights = loadFactionWeights(fullConfig, factionId);
			expect(weights).not.toBeNull();
		}
	});

	it("returns null for unknown faction", () => {
		const weights = loadFactionWeights(config, "nonexistent_faction");
		expect(weights).toBeNull();
	});

	it("weights from reclaimers are distinct from volt_collective", () => {
		const reclaimersWeights = loadFactionWeights(config, "reclaimers")!;
		const voltWeights = loadFactionWeights(config, "volt_collective")!;

		// At least one goal should differ between the two factions
		const hasDifference = Object.values(CivGoal).some(
			(goal) => Math.abs(reclaimersWeights[goal] - voltWeights[goal]) > 0.01,
		);
		expect(hasDifference).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Faction-specific strategy overrides
// ---------------------------------------------------------------------------

describe("applySituationalModifiers — Reclaimers strategy (hoard)", () => {
	const reclaimersBias: GovernorBias = {
		economy: 1.2,
		mining: 1.3,
		military: 0.8,
		defense: 1.0,
		research: 0.7,
		expansion: 1.0,
	};

	it("boosts HOARD_CUBES when resources are plentiful (>= 0.4)", () => {
		const base = computeBaseWeights(reclaimersBias);
		const baseHoard = base[CivGoal.HOARD_CUBES];

		const situation: FactionSituation = { resourceLevel: 0.6 };
		const modified = applySituationalModifiers(base, situation, "reclaimers");

		expect(modified[CivGoal.HOARD_CUBES]).toBeGreaterThan(baseHoard);
	});

	it("reduces ATTACK_ENEMY when resources are plentiful", () => {
		const base = computeBaseWeights(reclaimersBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const situation: FactionSituation = { resourceLevel: 0.7 };
		const modified = applySituationalModifiers(base, situation, "reclaimers");

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeLessThan(baseAttack);
	});

	it("does NOT boost HOARD_CUBES when resources are scarce (< 0.4)", () => {
		const base = computeBaseWeights(reclaimersBias);
		const baseHoard = base[CivGoal.HOARD_CUBES];

		// Scarce resources — no hoard boost (universal low-resource modifier applies instead)
		const situation: FactionSituation = { resourceLevel: 0.2 };
		const modified = applySituationalModifiers(base, situation, "reclaimers");

		// HOARD_CUBES may be boosted by the universal low-resource pass, but NOT by faction strategy
		// We just verify it's not boosted by a LARGER amount than the universal pass alone would produce
		const universalOnly = applySituationalModifiers(base, situation);
		expect(modified[CivGoal.HOARD_CUBES]).toBeCloseTo(
			universalOnly[CivGoal.HOARD_CUBES],
			5,
		);
	});
});

describe("applySituationalModifiers — Volt Collective strategy (aggressor)", () => {
	const voltBias: GovernorBias = {
		economy: 0.8,
		mining: 1.0,
		military: 1.5,
		defense: 0.9,
		research: 1.0,
		expansion: 1.3,
	};

	it("boosts ATTACK_ENEMY when enemy stockpile value is high", () => {
		const base = computeBaseWeights(voltBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const situation: FactionSituation = { enemyStockpileValue: 1000 };
		const modified = applySituationalModifiers(base, situation, "volt_collective");

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeGreaterThan(baseAttack);
	});

	it("does not boost ATTACK_ENEMY when enemy stockpile value is 0", () => {
		const base = computeBaseWeights(voltBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const situation: FactionSituation = { enemyStockpileValue: 0 };
		const modified = applySituationalModifiers(base, situation, "volt_collective");

		// No wealth → no raid boost (but TRADE is still penalized)
		expect(modified[CivGoal.ATTACK_ENEMY]).toBe(baseAttack);
	});

	it("always reduces TRADE weight", () => {
		const base = computeBaseWeights(voltBias);
		const baseTrade = base[CivGoal.TRADE];

		const situation: FactionSituation = {};
		const modified = applySituationalModifiers(base, situation, "volt_collective");

		expect(modified[CivGoal.TRADE]).toBeLessThan(baseTrade);
	});

	it("attack boost is capped at 1.0", () => {
		const base = computeBaseWeights(voltBias);

		const situation: FactionSituation = { enemyStockpileValue: 999999 };
		const modified = applySituationalModifiers(base, situation, "volt_collective");

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeLessThanOrEqual(1.0);
	});
});

describe("applySituationalModifiers — Signal Choir strategy (hacker)", () => {
	const signalBias: GovernorBias = {
		economy: 1.0,
		mining: 0.8,
		military: 0.7,
		defense: 1.0,
		research: 1.5,
		expansion: 0.9,
	};

	it("always boosts RESEARCH_TECH regardless of situation", () => {
		const base = computeBaseWeights(signalBias);
		const baseResearch = base[CivGoal.RESEARCH_TECH];

		const neutral: FactionSituation = {};
		const modified = applySituationalModifiers(base, neutral, "signal_choir");

		expect(modified[CivGoal.RESEARCH_TECH]).toBeGreaterThan(baseResearch);
	});

	it("reduces ATTACK_ENEMY (Signal Choir avoids raw combat)", () => {
		const base = computeBaseWeights(signalBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const situation: FactionSituation = {};
		const modified = applySituationalModifiers(base, situation, "signal_choir");

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeLessThan(baseAttack);
	});

	it("boosts ATTACK_ENEMY when hackable targets are nearby (hacking offensive)", () => {
		const base = computeBaseWeights(signalBias);
		const noHackSituation: FactionSituation = { hackableTargetsNearby: false };
		const hackSituation: FactionSituation = { hackableTargetsNearby: true };

		const noHackMod = applySituationalModifiers(base, noHackSituation, "signal_choir");
		const hackMod = applySituationalModifiers(base, hackSituation, "signal_choir");

		// Attack should be higher when hackable targets are present
		expect(hackMod[CivGoal.ATTACK_ENEMY]).toBeGreaterThan(
			noHackMod[CivGoal.ATTACK_ENEMY],
		);
	});
});

describe("applySituationalModifiers — Iron Creed strategy (fortress)", () => {
	const ironBias: GovernorBias = {
		economy: 1.0,
		mining: 1.0,
		military: 1.0,
		defense: 1.5,
		research: 0.8,
		expansion: 0.7,
	};

	it("boosts BUILD_DEFENSES when wall count is below comfort threshold (4)", () => {
		const base = computeBaseWeights(ironBias);
		const baseDefense = base[CivGoal.BUILD_DEFENSES];

		const situation: FactionSituation = { ownWallCount: 1 };
		const modified = applySituationalModifiers(base, situation, "iron_creed");

		expect(modified[CivGoal.BUILD_DEFENSES]).toBeGreaterThan(baseDefense);
	});

	it("suppresses ATTACK_ENEMY when under-fortified", () => {
		const base = computeBaseWeights(ironBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const situation: FactionSituation = { ownWallCount: 0 };
		const modified = applySituationalModifiers(base, situation, "iron_creed");

		expect(modified[CivGoal.ATTACK_ENEMY]).toBeLessThan(baseAttack);
	});

	it("suppresses EXPAND_TERRITORY when under-fortified", () => {
		const base = computeBaseWeights(ironBias);
		const baseExpand = base[CivGoal.EXPAND_TERRITORY];

		const situation: FactionSituation = { ownWallCount: 2 };
		const modified = applySituationalModifiers(base, situation, "iron_creed");

		expect(modified[CivGoal.EXPAND_TERRITORY]).toBeLessThan(baseExpand);
	});

	it("does NOT suppress attack when adequately fortified (>= 4 walls)", () => {
		const base = computeBaseWeights(ironBias);
		const baseAttack = base[CivGoal.ATTACK_ENEMY];

		const wellFortified: FactionSituation = { ownWallCount: 5 };
		const modified = applySituationalModifiers(base, wellFortified, "iron_creed");

		// No under-fortified suppression; TRADE penalty still applies
		// Attack should be >= baseAttack * 0.6 (only TRADE penalty path, not the wall block)
		expect(modified[CivGoal.ATTACK_ENEMY]).toBeCloseTo(baseAttack, 5);
	});

	it("always reduces TRADE weight", () => {
		const base = computeBaseWeights(ironBias);
		const baseTrade = base[CivGoal.TRADE];

		const situation: FactionSituation = { ownWallCount: 10 };
		const modified = applySituationalModifiers(base, situation, "iron_creed");

		expect(modified[CivGoal.TRADE]).toBeLessThan(baseTrade);
	});
});

describe("applySituationalModifiers — faction override is additive with universal modifiers", () => {
	it("Volt Collective under attack still boosts BUILD_DEFENSES (universal) + reduces TRADE (faction)", () => {
		const voltBias: GovernorBias = {
			economy: 0.8,
			mining: 1.0,
			military: 1.5,
			defense: 0.9,
			research: 1.0,
			expansion: 1.3,
		};
		const base = computeBaseWeights(voltBias);
		const baseTrade = base[CivGoal.TRADE];
		const baseDefense = base[CivGoal.BUILD_DEFENSES];

		const situation: FactionSituation = { underAttack: true };
		const modified = applySituationalModifiers(base, situation, "volt_collective");

		// Universal under-attack modifier boosts BUILD_DEFENSES
		expect(modified[CivGoal.BUILD_DEFENSES]).toBeGreaterThan(baseDefense);
		// Faction-specific modifier reduces TRADE further (stacks with universal attack penalty)
		expect(modified[CivGoal.TRADE]).toBeLessThan(baseTrade * 0.3); // 0.3 (universal) * 0.4 (volt) < baseTrade * 0.3
	});

	it("unknown faction does not apply any overrides beyond universal modifiers", () => {
		const bias: GovernorBias = {
			economy: 1.0,
			mining: 1.0,
			military: 1.0,
			defense: 1.0,
			research: 1.0,
			expansion: 1.0,
		};
		const base = computeBaseWeights(bias);
		const situation: FactionSituation = { resourceLevel: 0.5 };

		const withUnknown = applySituationalModifiers(base, situation, "xenos");
		const withoutFaction = applySituationalModifiers(base, situation);

		for (const goal of Object.values(CivGoal)) {
			expect(withUnknown[goal]).toBeCloseTo(withoutFaction[goal], 10);
		}
	});
});
