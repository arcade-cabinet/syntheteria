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
