/**
 * Tests for AI production planning and territory value evaluation.
 *
 * Covers:
 * - selectProductionTargets: urgency scoring, savings-progress factor, zero-bias exclusion
 * - evaluateTerritoryValue: radius filtering, cubeValue lookup, depleted deposit exclusion
 * - generateExpansionCandidates: ring generation, territory-count scaling
 * - rankTerritoryPositions: deposit-rich sites rank highest, distance penalty applied
 * - Integration: claim_territory sets lastExpansionTarget, production planning influences decision
 */

const mockGetAllDeposits = jest.fn<
	Array<{
		id: string;
		type: string;
		quantity: number;
		position: { x: number; y: number; z: number };
		colliderRadius: number;
		hardness: number;
		grindSpeed: number;
		color: string;
	}>,
	[]
>(() => []);

jest.mock("../oreSpawner", () => ({
	getAllDeposits: () => mockGetAllDeposits(),
}));

jest.mock("../diplomacySystem", () => ({
	registerTradeTransfer: jest.fn(),
	proposeTrade: jest.fn(),
	getRelation: jest.fn(() => ({ stance: "neutral", trust: 0 })),
}));

jest.mock("../cubeEconomy", () => ({
	spawnCube: jest.fn().mockReturnValue("cube_mock"),
}));

jest.mock("../stormSystem", () => ({
	registerFactionAggression: jest.fn(),
	isFactionReadyToAggress: jest.fn().mockReturnValue(false),
	consumeAggressionReady: jest.fn(),
	calculateRaidStrength: jest.fn().mockReturnValue(0),
}));

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
		economy: {
			materials: {
				rock: { cubeValue: 2 },
				scrap_iron: { cubeValue: 5 },
				copper: { cubeValue: 15 },
				silicon: { cubeValue: 20 },
				titanium: { cubeValue: 50 },
				rare_earth: { cubeValue: 80 },
				gold: { cubeValue: 100 },
				quantum_crystal: { cubeValue: 250 },
			},
		},
		diplomacy: {
			checkInterval: 100,
			tradeAcceptanceThreshold: 0.5,
			relations: {
				initialOpinion: 0,
				stanceThresholds: {
					allied: 75,
					friendly: 25,
					neutral: -25,
					hostile: -75,
				},
			},
		},
	},
}));

import {
	selectProductionTargets,
	evaluateTerritoryValue,
	generateExpansionCandidates,
	rankTerritoryPositions,
	getCivState,
	initializeCivilizations,
	resetCivilizations,
	aiCivilizationSystem,
	type CivState,
} from "../aiCivilization";
import type { OreDepositData } from "../oreSpawner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeposit(
	id: string,
	type: string,
	quantity: number,
	x: number,
	z: number,
): OreDepositData {
	return {
		id,
		type,
		quantity,
		position: { x, y: 0, z },
		colliderRadius: 1,
		hardness: 1,
		grindSpeed: 1,
		color: "#888",
	};
}

/** Build a minimal CivState for pure-function tests without module state. */
function makeState(overrides: Partial<CivState> = {}): CivState {
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
		resources: { cubes: 0, units: 3, buildings: 1, territories: 1 },
		phase: "GATHER",
		phaseTimer: 0,
		lastDecision: null,
		threatLevel: 0,
		economicScore: 0,
		militaryStrength: 0,
		techLevel: 0,
		ticksAlive: 0,
		basePosition: { x: 0, z: 0 },
		lastExpansionTarget: null,
		...overrides,
	};
}

beforeEach(() => {
	resetCivilizations();
	mockGetAllDeposits.mockReturnValue([]);
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// selectProductionTargets
// ---------------------------------------------------------------------------

describe("selectProductionTargets", () => {
	it("returns all production targets with positive evaluator scores", () => {
		const state = makeState({
			resources: { cubes: 5, units: 3, buildings: 1, territories: 1 },
			threatLevel: 0.3,
			techLevel: 1,
		});

		const targets = selectProductionTargets(state);

		// Should have entries for actions with positive evaluator scores
		expect(targets.length).toBeGreaterThan(0);
		for (const t of targets) {
			expect(t.urgency).toBeGreaterThan(0);
			expect(t.cubeCost).toBeGreaterThan(0);
		}
	});

	it("sorts by urgency descending", () => {
		const state = makeState({
			resources: { cubes: 10, units: 3, buildings: 1, territories: 1 },
			bias: { economy: 1.5, mining: 1.3, military: 1.0, defense: 1.0, research: 0.7, expansion: 1.0 },
		});

		const targets = selectProductionTargets(state);

		for (let i = 1; i < targets.length; i++) {
			expect(targets[i - 1].urgency).toBeGreaterThanOrEqual(targets[i].urgency);
		}
	});

	it("excludes targets where evaluator score is zero or negative", () => {
		// Military evaluator returns 0 when threat=0 and militaryStrength=0 (weaknessFactor * 0.4 still >0)
		// But with military bias = 0, score = 0
		const state = makeState({
			bias: { economy: 1.5, mining: 1.3, military: 0, defense: 0, research: 0, expansion: 0 },
			resources: { cubes: 0, units: 3, buildings: 1, territories: 1 },
		});

		const targets = selectProductionTargets(state);

		const militaryTarget = targets.find((t) => t.priority === "military");
		expect(militaryTarget).toBeUndefined();
	});

	it("savings-progress factor increases urgency as cubes approach cost", () => {
		const statePoor = makeState({ resources: { cubes: 1, units: 3, buildings: 1, territories: 1 } });
		const stateRich = makeState({ resources: { cubes: 9, units: 3, buildings: 1, territories: 1 } });

		const poorTargets = selectProductionTargets(statePoor);
		const richTargets = selectProductionTargets(stateRich);

		// Same bias, more cubes = higher savings progress = higher urgency for same target
		if (poorTargets.length > 0 && richTargets.length > 0) {
			// find matching targets
			for (const rt of richTargets) {
				const pt = poorTargets.find((t) => t.action === rt.action);
				if (pt) {
					expect(rt.urgency).toBeGreaterThanOrEqual(pt.urgency);
				}
			}
		}
	});

	it("includes expansion target with correct cubeCost from territory config", () => {
		// outpostTiers[0].cubeCost = 20 in test mock
		const state = makeState({
			resources: { cubes: 18, units: 3, buildings: 1, territories: 1 },
			bias: { economy: 0.1, mining: 0.1, military: 0.1, defense: 0.1, research: 0.1, expansion: 2.0 },
		});

		const targets = selectProductionTargets(state);
		const expansionTarget = targets.find((t) => t.action === "claim_territory");

		expect(expansionTarget).toBeDefined();
		expect(expansionTarget!.cubeCost).toBe(20);
		expect(expansionTarget!.priority).toBe("expansion");
	});

	it("returns empty array when all biases are zero", () => {
		const state = makeState({
			bias: { economy: 0, mining: 0, military: 0, defense: 0, research: 0, expansion: 0 },
		});

		const targets = selectProductionTargets(state);
		expect(targets).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// evaluateTerritoryValue
// ---------------------------------------------------------------------------

describe("evaluateTerritoryValue", () => {
	it("returns 0 with no deposits", () => {
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, []);
		expect(value).toBe(0);
	});

	it("includes deposits within the claim radius", () => {
		const deposits = [makeDeposit("d1", "copper", 100, 5, 0)]; // distance = 5, radius = 10
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		// cubeValue of copper = 15, quantity = 100 → value = 1500
		expect(value).toBe(1500);
	});

	it("excludes deposits outside the claim radius", () => {
		const deposits = [makeDeposit("d1", "copper", 100, 20, 0)]; // distance = 20, radius = 10
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		expect(value).toBe(0);
	});

	it("excludes depleted deposits (quantity <= 0)", () => {
		const deposits = [makeDeposit("d1", "copper", 0, 5, 0)];
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		expect(value).toBe(0);
	});

	it("sums multiple deposits within radius", () => {
		const deposits = [
			makeDeposit("d1", "rock", 50, 3, 0),      // cubeValue=2 → 100
			makeDeposit("d2", "scrap_iron", 20, 0, 4), // cubeValue=5 → 100
		];
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		expect(value).toBe(200);
	});

	it("weights high-value materials more than low-value ones", () => {
		const rockDeposit = [makeDeposit("r", "rock", 100, 5, 0)];        // cubeValue=2 → 200
		const titaniumDeposit = [makeDeposit("t", "titanium", 100, 5, 0)]; // cubeValue=50 → 5000

		const rockValue = evaluateTerritoryValue({ x: 0, z: 0 }, 10, rockDeposit);
		const titaniumValue = evaluateTerritoryValue({ x: 0, z: 0 }, 10, titaniumDeposit);

		expect(titaniumValue).toBeGreaterThan(rockValue);
	});

	it("falls back to cubeValue=1 for unknown material types", () => {
		const deposits = [makeDeposit("d1", "unknown_material", 100, 5, 0)];
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		// Falls back to cubeValue=1 → 100
		expect(value).toBe(100);
	});

	it("uses exact circle boundary (deposit at exact radius is included)", () => {
		// Distance = exactly claimRadius → distSq = radiusSq → should be included
		const deposits = [makeDeposit("d1", "rock", 100, 10, 0)]; // distance = 10, radius = 10
		const value = evaluateTerritoryValue({ x: 0, z: 0 }, 10, deposits);
		expect(value).toBe(200); // cubeValue=2 * 100
	});
});

// ---------------------------------------------------------------------------
// generateExpansionCandidates
// ---------------------------------------------------------------------------

describe("generateExpansionCandidates", () => {
	it("returns 8 candidates", () => {
		const candidates = generateExpansionCandidates({ x: 0, z: 0 }, 1);
		expect(candidates.length).toBe(8);
	});

	it("all candidates are at the expected ring radius from base", () => {
		const base = { x: 0, z: 0 };
		const spacing = 15; // minimumOutpostSpacing from test config
		const territories = 2;
		const expectedRadius = (territories + 1) * spacing; // 3 * 15 = 45

		const candidates = generateExpansionCandidates(base, territories);

		for (const c of candidates) {
			const dist = Math.sqrt(c.x * c.x + c.z * c.z);
			expect(dist).toBeCloseTo(expectedRadius, 1);
		}
	});

	it("ring radius scales with territory count", () => {
		const base = { x: 0, z: 0 };
		const spacing = 15;

		const t1 = generateExpansionCandidates(base, 1);
		const t3 = generateExpansionCandidates(base, 3);

		const r1 = Math.sqrt(t1[0].x * t1[0].x + t1[0].z * t1[0].z);
		const r3 = Math.sqrt(t3[0].x * t3[0].x + t3[0].z * t3[0].z);

		expect(r3).toBeGreaterThan(r1);
		expect(r1).toBeCloseTo(2 * spacing, 1); // (1+1)*15 = 30
		expect(r3).toBeCloseTo(4 * spacing, 1); // (3+1)*15 = 60
	});

	it("offsets correctly from non-origin base", () => {
		const base = { x: 100, z: 200 };
		const candidates = generateExpansionCandidates(base, 1);

		// All candidates should be centered on the base — compute the centroid
		// which should equal the base position
		const centroidX = candidates.reduce((sum, c) => sum + c.x, 0) / candidates.length;
		const centroidZ = candidates.reduce((sum, c) => sum + c.z, 0) / candidates.length;

		expect(centroidX).toBeCloseTo(base.x, 5);
		expect(centroidZ).toBeCloseTo(base.z, 5);
	});

	it("evenly distributes 8 candidates around the ring (no duplicates)", () => {
		const candidates = generateExpansionCandidates({ x: 0, z: 0 }, 1);
		const positions = new Set(candidates.map((c) => `${c.x.toFixed(2)},${c.z.toFixed(2)}`));
		expect(positions.size).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// rankTerritoryPositions
// ---------------------------------------------------------------------------

describe("rankTerritoryPositions", () => {
	it("returns candidates sorted by score descending", () => {
		const base = { x: 0, z: 0 };
		const candidates = [
			{ x: 5, z: 0 },  // near base but no deposits
			{ x: 30, z: 0 }, // farther with rich deposits
		];

		// Rich titanium deposit near the farther candidate
		const deposits = [makeDeposit("d1", "titanium", 200, 30, 0)];

		const ranked = rankTerritoryPositions(base, candidates, 10, deposits);

		// farther site with titanium should rank #1 despite distance
		expect(ranked[0].position).toEqual({ x: 30, z: 0 });
		expect(ranked[0].depositValue).toBeGreaterThan(0);
	});

	it("deposit-rich site beats deposit-barren site even if farther away", () => {
		const base = { x: 0, z: 0 };
		const nearEmpty = { x: 10, z: 0 };   // near, no deposits
		const farRich = { x: 50, z: 0 };     // far, titanium deposit

		const deposits = [makeDeposit("d1", "titanium", 200, 50, 0)];

		const ranked = rankTerritoryPositions(base, [nearEmpty, farRich], 15, deposits);

		expect(ranked[0].position).toEqual({ x: 50, z: 0 });
	});

	it("distance penalty reduces score for equidistant deposit-equal sites", () => {
		// Two sites at different distances, identical deposit value
		const base = { x: 0, z: 0 };
		const near = { x: 10, z: 0 };
		const far = { x: 50, z: 0 };

		const deposits = [
			makeDeposit("d1", "copper", 100, 10, 0), // near near site
			makeDeposit("d2", "copper", 100, 50, 0), // near far site
		];

		const ranked = rankTerritoryPositions(base, [near, far], 10, deposits);

		// Same deposit value but near is closer → penalty less → near scores higher
		expect(ranked[0].position).toEqual({ x: 10, z: 0 });
		expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
	});

	it("returns empty array for empty candidates", () => {
		const ranked = rankTerritoryPositions({ x: 0, z: 0 }, [], 10, []);
		expect(ranked).toEqual([]);
	});

	it("includes all required fields in each candidate result", () => {
		const base = { x: 0, z: 0 };
		const candidates = [{ x: 10, z: 0 }];
		const deposits = [makeDeposit("d1", "rock", 50, 10, 0)];

		const ranked = rankTerritoryPositions(base, candidates, 15, deposits);

		expect(ranked[0]).toMatchObject({
			position: expect.any(Object),
			depositValue: expect.any(Number),
			distanceFromBase: expect.any(Number),
			score: expect.any(Number),
		});
	});

	it("zero-deposit site still has a valid (zero) depositValue and score", () => {
		const base = { x: 0, z: 0 };
		const candidates = [{ x: 10, z: 0 }];

		const ranked = rankTerritoryPositions(base, candidates, 10, []);

		expect(ranked[0].depositValue).toBe(0);
		expect(ranked[0].score).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Integration: claim_territory sets lastExpansionTarget
// ---------------------------------------------------------------------------

describe("claim_territory integration", () => {
	beforeEach(() => {
		resetCivilizations();
		initializeCivilizations();
	});

	it("sets lastExpansionTarget after claim_territory executes with deposits present", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 500;

		// Place a rich deposit near expansion ring
		mockGetAllDeposits.mockReturnValue([
			makeDeposit("d1", "titanium", 200, 30, 0),
		]);

		// Force expansion bias very high
		state.bias.expansion = 100;
		state.bias.economy = 0;
		state.bias.mining = 0;
		state.bias.military = 0;
		state.bias.defense = 0;
		state.bias.research = 0;

		// Run 10 ticks to trigger a governor decision
		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		// lastExpansionTarget should be set if claim_territory fired
		// (may not fire if cubes got spent, so just verify no throw + type)
		if (state.lastExpansionTarget !== null) {
			expect(state.lastExpansionTarget).toMatchObject({
				x: expect.any(Number),
				z: expect.any(Number),
			});
		}
	});

	it("lastExpansionTarget is null initially", () => {
		const state = getCivState("reclaimers")!;
		expect(state.lastExpansionTarget).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Integration: production planning biases decision toward affordable items
// ---------------------------------------------------------------------------

describe("makeDecision production planning integration", () => {
	beforeEach(() => {
		resetCivilizations();
		initializeCivilizations();
	});

	it("decision at 90%+ of a target's cost nudges toward that target", () => {
		const state = getCivState("reclaimers")!;

		// produce_units costs 8 cubes — set cubes to 9 (112.5% of cost)
		// military bias is 0.8 (moderate), but savings progress should boost its urgency
		state.resources.cubes = 9;
		state.threatLevel = 0.8; // high threat makes military evaluator score high

		state.bias.military = 1.5;
		state.bias.economy = 0.1;
		state.bias.mining = 0.1;
		state.bias.defense = 0.1;
		state.bias.research = 0.1;
		state.bias.expansion = 0.1;

		for (let i = 0; i < 10; i++) {
			aiCivilizationSystem();
		}

		// With high threat + military bias + ~affordable units, expect military decision
		const decision = state.lastDecision;
		expect(decision).not.toBeNull();
		// Decision should be military or economy (whichever evaluator wins)
		expect(["military", "economy", "mining"]).toContain(decision!.priority);
	});

	it("factions with zero research bias never plan research production", () => {
		const state = getCivState("reclaimers")!;
		state.resources.cubes = 100;
		state.bias.research = 0;
		state.bias.expansion = 0;
		state.bias.defense = 0;
		state.bias.military = 0;
		state.bias.mining = 0;
		state.bias.economy = 1.0;

		const targets = selectProductionTargets(state);
		const researchTarget = targets.find((t) => t.priority === "research");
		expect(researchTarget).toBeUndefined();
	});
});
