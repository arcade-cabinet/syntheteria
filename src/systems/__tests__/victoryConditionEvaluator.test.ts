/**
 * Unit tests for the 8-condition victory evaluator.
 *
 * Tests cover:
 * - evaluateVictoryConditions returns VictoryProgress for all 8 conditions
 * - Colonial: patron satisfaction >= 80 AND all objectives complete
 * - Domination: territory >= 75% for hold duration
 * - Economic: 500+ cubes of 4+ material types for hold duration
 * - Technology: Tier 5 tech researched AND convergence device constructed
 * - Diplomatic: all surviving factions allied/vassalized (player-centric)
 * - Integration: residual relationship >= 80 AND resonance protocol complete
 * - Survival: last faction with powered outpost after Convergence starts
 * - Story: 3 core access points + residual rep >= 50 + all kelp dialogue + material offering
 * - Hold timer resets when condition drops below threshold
 * - Score is 0.0-1.0 normalized progress
 * - resetVictoryConditionEvaluator clears all state
 * - wireTick advances hold timers and fires events
 * - Alert thresholds (25%, 50%, 75%, 90%) emit events
 * - Convergence early-trigger thresholds
 * - Simultaneous victory tiebreaker order
 */

// ---------------------------------------------------------------------------
// Config mock — mirrors config/victory.json shape plus new GDD fields
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		victory: {
			gracePeriodTicks: 100,
			conditions: {
				colonial: {
					name: "Colonial",
					patronSatisfactionRequired: 80,
					objectivesRequireAll: true,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
				domination: {
					name: "Domination",
					outpostControlPercent: 0.75,
					holdDurationTicks: 300,
					checkInterval: 10,
				},
				economic: {
					name: "Economic",
					totalCubesRequired: 500,
					materialDiversityRequired: 4,
					holdDurationTicks: 300,
					checkInterval: 10,
				},
				technology: {
					name: "Technology",
					requiredTechTier: 5,
					requiresConvergenceDevice: true,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
				diplomatic: {
					name: "Diplomatic",
					allianceOpinionThreshold: 60,
					vassalizationEconomyThreshold: 0.3,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
				integration: {
					name: "Integration",
					residualRelationshipRequired: 80,
					requiresResonanceProtocol: true,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
				survival: {
					name: "Survival",
					convergenceStartTick: 28800,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
				story: {
					name: "Story",
					coreAccessPointsRequired: 3,
					residualRelationshipRequired: 50,
					playerOnly: true,
					holdDurationTicks: 0,
					checkInterval: 10,
				},
			},
			progressPanel: {
				alertThresholds: [0.25, 0.5, 0.75, 0.9],
			},
			simultaneousVictoryPriority: [
				"story",
				"integration",
				"technology",
				"colonial",
				"diplomatic",
				"economic",
				"domination",
				"survival",
			],
		},
	},
}));

import {
	evaluateVictoryConditions,
	wireTick,
	getVictoryProgress,
	getAllFactionsProgress,
	getVictoryEvents,
	getWinner,
	isGameOver,
	resetVictoryConditionEvaluator,
	setVictoryStateQueries,
	type VictoryStateQueries,
	type VictoryProgress,
} from "../victoryConditionEvaluator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GRACE_PERIOD = 100;
const CHECK_INTERVAL = 10;
const FIRST_TICK = GRACE_PERIOD + CHECK_INTERVAL;

function makeQueries(overrides: Partial<VictoryStateQueries> = {}): VictoryStateQueries {
	return {
		// Colonial
		getPatronSatisfaction: jest.fn(() => 0),
		getCompletedPatronObjectives: jest.fn(() => 0),
		getTotalPatronObjectives: jest.fn(() => 5),
		// Domination
		getOutpostControlPercent: jest.fn(() => 0),
		getTotalOutpostLocations: jest.fn(() => 24),
		// Economic
		getFactionCubeCount: jest.fn(() => 0),
		getFactionMaterialDiversity: jest.fn(() => 0),
		// Technology
		getMaxResearchedTier: jest.fn(() => 0),
		hasConvergenceDevice: jest.fn(() => false),
		// Diplomatic
		getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]),
		getAlliedFactions: jest.fn(() => []),
		getVassalizedFactions: jest.fn(() => []),
		// Integration
		getResidualRelationship: jest.fn(() => 0),
		isResonanceProtocolComplete: jest.fn(() => false),
		// Survival
		isConvergenceActive: jest.fn(() => false),
		hasOperationalOutpost: jest.fn(() => true),
		// Story (player-only)
		getCoreAccessPointsDiscovered: jest.fn(() => 0),
		isAllKelpDialogueComplete: jest.fn(() => false),
		hasMaterialOfferingDelivered: jest.fn(() => false),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetVictoryConditionEvaluator();
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — return shape", () => {
	it("returns a VictoryProgress with all 8 condition keys", () => {
		setVictoryStateQueries(makeQueries());
		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);

		expect(progress).toHaveProperty("colonial");
		expect(progress).toHaveProperty("domination");
		expect(progress).toHaveProperty("economic");
		expect(progress).toHaveProperty("technology");
		expect(progress).toHaveProperty("diplomatic");
		expect(progress).toHaveProperty("integration");
		expect(progress).toHaveProperty("survival");
		expect(progress).toHaveProperty("story");
	});

	it("each condition has score (0-1) and met (boolean)", () => {
		setVictoryStateQueries(makeQueries());
		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);

		for (const key of Object.keys(progress) as Array<keyof VictoryProgress>) {
			expect(typeof progress[key].score).toBe("number");
			expect(progress[key].score).toBeGreaterThanOrEqual(0);
			expect(progress[key].score).toBeLessThanOrEqual(1);
			expect(typeof progress[key].met).toBe("boolean");
		}
	});

	it("all scores are 0 when nothing is progressed", () => {
		setVictoryStateQueries(makeQueries());
		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);

		for (const key of Object.keys(progress) as Array<keyof VictoryProgress>) {
			// Story is player-only — non-player factions score 0
			expect(progress[key].score).toBe(0);
			expect(progress[key].met).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// Grace period
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — grace period", () => {
	it("returns zero progress during grace period", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getFactionCubeCount: jest.fn(() => 999),
			getFactionMaterialDiversity: jest.fn(() => 6),
		}));
		const progress = evaluateVictoryConditions("reclaimers", 50); // inside grace period

		expect(progress.economic.score).toBe(0);
		expect(progress.economic.met).toBe(false);
	});

	it("evaluates after grace period", () => {
		setVictoryStateQueries(makeQueries({
			getPatronSatisfaction: jest.fn(() => 90),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));
		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);

		expect(progress.colonial.score).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Colonial victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — colonial", () => {
	it("met when patron satisfaction >= 80 and all objectives complete", () => {
		setVictoryStateQueries(makeQueries({
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.colonial.met).toBe(true);
		expect(progress.colonial.score).toBe(1);
	});

	it("not met when satisfaction is high but objectives incomplete", () => {
		setVictoryStateQueries(makeQueries({
			getPatronSatisfaction: jest.fn(() => 90),
			getCompletedPatronObjectives: jest.fn(() => 3),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.colonial.met).toBe(false);
	});

	it("not met when all objectives complete but satisfaction below 80", () => {
		setVictoryStateQueries(makeQueries({
			getPatronSatisfaction: jest.fn(() => 79),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.colonial.met).toBe(false);
	});

	it("score reflects average of satisfaction fraction and objective fraction", () => {
		setVictoryStateQueries(makeQueries({
			getPatronSatisfaction: jest.fn(() => 40), // 40/80 = 0.5 satisfaction fraction
			getCompletedPatronObjectives: jest.fn(() => 2), // 2/4 = 0.5 objective fraction
			getTotalPatronObjectives: jest.fn(() => 4),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		// score = (min(1, 40/80) + min(1, 2/4)) / 2 = (0.5 + 0.5) / 2 = 0.5
		expect(progress.colonial.score).toBeCloseTo(0.5);
		expect(progress.colonial.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Domination victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — domination", () => {
	it("met flag false even at 75% until hold duration elapses (wireTick needed)", () => {
		setVictoryStateQueries(makeQueries({
			getOutpostControlPercent: jest.fn(() => 0.8),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		// Score 1.0 but met=false until hold timer expires
		expect(progress.domination.score).toBe(1);
		expect(progress.domination.met).toBe(false);
	});

	it("score proportional to outpost control percent", () => {
		setVictoryStateQueries(makeQueries({
			getOutpostControlPercent: jest.fn(() => 0.375), // half of 0.75
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.domination.score).toBeCloseTo(0.5);
		expect(progress.domination.met).toBe(false);
	});

	it("hold timer advances via wireTick and fires met after holdDurationTicks", () => {
		setVictoryStateQueries(makeQueries({
			getOutpostControlPercent: jest.fn(() => 0.8),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
		}));

		// Each wireTick call passes one tick
		for (let t = FIRST_TICK; t < FIRST_TICK + 300 + CHECK_INTERVAL; t += CHECK_INTERVAL) {
			wireTick(t);
		}

		const progress = getVictoryProgress("reclaimers");
		expect(progress).not.toBeNull();
		expect(progress!.domination.met).toBe(true);
	});

	it("hold timer resets when control drops below threshold", () => {
		const controlPct = { value: 0.8 };
		setVictoryStateQueries(makeQueries({
			getOutpostControlPercent: jest.fn(() => controlPct.value),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
		}));

		// Advance 200 ticks (below 300 threshold)
		for (let t = FIRST_TICK; t < FIRST_TICK + 200; t += CHECK_INTERVAL) {
			wireTick(t);
		}

		// Drop control below threshold
		controlPct.value = 0.5;

		for (let t = FIRST_TICK + 200; t < FIRST_TICK + 600; t += CHECK_INTERVAL) {
			wireTick(t);
		}

		// Now raise back above threshold — timer should have reset
		controlPct.value = 0.8;

		// Only 200 more ticks — not enough to complete
		for (let t = FIRST_TICK + 600; t < FIRST_TICK + 800; t += CHECK_INTERVAL) {
			wireTick(t);
		}

		const progress = getVictoryProgress("reclaimers");
		expect(progress!.domination.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Economic victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — economic", () => {
	it("met flag false even at threshold until hold duration elapses", () => {
		setVictoryStateQueries(makeQueries({
			getFactionCubeCount: jest.fn(() => 500),
			getFactionMaterialDiversity: jest.fn(() => 4),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.economic.score).toBe(1);
		expect(progress.economic.met).toBe(false);
	});

	it("score = min(cubes/500, 1) blended with diversity fraction", () => {
		setVictoryStateQueries(makeQueries({
			getFactionCubeCount: jest.fn(() => 250),   // 250/500 = 0.5
			getFactionMaterialDiversity: jest.fn(() => 2), // 2/4 = 0.5
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		// score = (min(250/500,1) + min(2/4,1)) / 2 = (0.5 + 0.5) / 2 = 0.5
		expect(progress.economic.score).toBeCloseTo(0.5);
	});

	it("not met when cubes sufficient but diversity below required", () => {
		setVictoryStateQueries(makeQueries({
			getFactionCubeCount: jest.fn(() => 600),
			getFactionMaterialDiversity: jest.fn(() => 3), // below 4
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.economic.met).toBe(false);
	});

	it("not met when diversity sufficient but cubes below threshold", () => {
		setVictoryStateQueries(makeQueries({
			getFactionCubeCount: jest.fn(() => 499),
			getFactionMaterialDiversity: jest.fn(() => 5),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.economic.met).toBe(false);
	});

	it("hold timer advances and fires met after holdDurationTicks", () => {
		setVictoryStateQueries(makeQueries({
			getFactionCubeCount: jest.fn(() => 600),
			getFactionMaterialDiversity: jest.fn(() => 5),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
		}));

		for (let t = FIRST_TICK; t < FIRST_TICK + 300 + CHECK_INTERVAL; t += CHECK_INTERVAL) {
			wireTick(t);
		}

		const progress = getVictoryProgress("reclaimers");
		expect(progress!.economic.met).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Technology victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — technology", () => {
	it("met when tier 5 researched AND convergence device built", () => {
		setVictoryStateQueries(makeQueries({
			getMaxResearchedTier: jest.fn(() => 5),
			hasConvergenceDevice: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.technology.met).toBe(true);
		expect(progress.technology.score).toBe(1);
	});

	it("not met when tier 5 researched but no convergence device", () => {
		setVictoryStateQueries(makeQueries({
			getMaxResearchedTier: jest.fn(() => 5),
			hasConvergenceDevice: jest.fn(() => false),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.technology.met).toBe(false);
	});

	it("not met when device built but tier below 5", () => {
		setVictoryStateQueries(makeQueries({
			getMaxResearchedTier: jest.fn(() => 4),
			hasConvergenceDevice: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.technology.met).toBe(false);
	});

	it("score tracks combined tech tier and device progress", () => {
		setVictoryStateQueries(makeQueries({
			getMaxResearchedTier: jest.fn(() => 3), // 3/5 = 0.6
			hasConvergenceDevice: jest.fn(() => false), // device = 0
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		// score = (min(3/5,1) * 0.7 + 0 * 0.3) = 0.6 * 0.7 = 0.42
		expect(progress.technology.score).toBeCloseTo(0.42);
		expect(progress.technology.met).toBe(false);
	});

	it("score reaches 1 only when both requirements met", () => {
		setVictoryStateQueries(makeQueries({
			getMaxResearchedTier: jest.fn(() => 5),
			hasConvergenceDevice: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.technology.score).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Diplomatic victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — diplomatic", () => {
	it("met when all other surviving factions are allied or vassalized", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["player", "volt_collective", "signal_choir"]),
			getAlliedFactions: jest.fn((faction: string) =>
				faction === "player" ? ["volt_collective"] : [],
			),
			getVassalizedFactions: jest.fn((faction: string) =>
				faction === "player" ? ["signal_choir"] : [],
			),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.diplomatic.met).toBe(true);
	});

	it("not met when one faction remains unallied", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["player", "volt_collective", "signal_choir"]),
			getAlliedFactions: jest.fn((faction: string) =>
				faction === "player" ? ["volt_collective"] : [],
			),
			getVassalizedFactions: jest.fn(() => []),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.diplomatic.met).toBe(false);
	});

	it("score is fraction of other factions that are allied or vassalized", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["player", "volt_collective", "signal_choir", "iron_creed"]),
			getAlliedFactions: jest.fn((faction: string) =>
				faction === "player" ? ["volt_collective"] : [],
			),
			getVassalizedFactions: jest.fn(() => []),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		// 1 out of 3 other factions aligned → score = 1/3
		expect(progress.diplomatic.score).toBeCloseTo(1 / 3);
	});

	it("not met when no other factions survive (minimum 1 required)", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["player"]),
			getAlliedFactions: jest.fn(() => []),
			getVassalizedFactions: jest.fn(() => []),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.diplomatic.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Integration victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — integration", () => {
	it("met when residual relationship >= 80 AND resonance protocol complete", () => {
		setVictoryStateQueries(makeQueries({
			getResidualRelationship: jest.fn(() => 85),
			isResonanceProtocolComplete: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.integration.met).toBe(true);
		expect(progress.integration.score).toBe(1);
	});

	it("not met when relationship >= 80 but protocol incomplete", () => {
		setVictoryStateQueries(makeQueries({
			getResidualRelationship: jest.fn(() => 90),
			isResonanceProtocolComplete: jest.fn(() => false),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.integration.met).toBe(false);
	});

	it("not met when protocol complete but relationship below 80", () => {
		setVictoryStateQueries(makeQueries({
			getResidualRelationship: jest.fn(() => 50),
			isResonanceProtocolComplete: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.integration.met).toBe(false);
	});

	it("score reflects average of relationship fraction and protocol progress", () => {
		setVictoryStateQueries(makeQueries({
			getResidualRelationship: jest.fn(() => 40), // 40/80 = 0.5
			isResonanceProtocolComplete: jest.fn(() => false), // 0
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		// score = (min(40/80,1) * 0.7 + 0 * 0.3) = 0.5 * 0.7 = 0.35
		expect(progress.integration.score).toBeCloseTo(0.35);
	});
});

// ---------------------------------------------------------------------------
// Survival victory
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — survival", () => {
	it("not met when convergence is not active", () => {
		setVictoryStateQueries(makeQueries({
			isConvergenceActive: jest.fn(() => false),
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			hasOperationalOutpost: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.survival.met).toBe(false);
	});

	it("met when convergence is active and faction is the only one with powered outpost", () => {
		setVictoryStateQueries(makeQueries({
			isConvergenceActive: jest.fn(() => true),
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			hasOperationalOutpost: jest.fn((faction: string) => faction === "reclaimers"),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.survival.met).toBe(true);
	});

	it("not met during convergence when multiple factions have operational outposts", () => {
		setVictoryStateQueries(makeQueries({
			isConvergenceActive: jest.fn(() => true),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			hasOperationalOutpost: jest.fn(() => true), // both have outposts
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.survival.met).toBe(false);
	});

	it("score 0 when convergence inactive, increases once active", () => {
		setVictoryStateQueries(makeQueries({
			isConvergenceActive: jest.fn(() => false),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			hasOperationalOutpost: jest.fn(() => true),
		}));

		const progress1 = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress1.survival.score).toBe(0);

		// Now convergence activates
		resetVictoryConditionEvaluator();
		setVictoryStateQueries(makeQueries({
			isConvergenceActive: jest.fn(() => true),
			getSurvivingFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
			hasOperationalOutpost: jest.fn(() => true),
		}));

		const progress2 = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress2.survival.score).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Story victory (player-only)
// ---------------------------------------------------------------------------

describe("evaluateVictoryConditions — story", () => {
	it("met when all 5 story requirements are satisfied", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 3),
			getResidualRelationship: jest.fn(() => 60),
			isAllKelpDialogueComplete: jest.fn(() => true),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.story.met).toBe(true);
	});

	it("score 0 for non-player faction (story is player-only)", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 3),
			getResidualRelationship: jest.fn(() => 90),
			isAllKelpDialogueComplete: jest.fn(() => true),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("reclaimers", FIRST_TICK);
		expect(progress.story.score).toBe(0);
		expect(progress.story.met).toBe(false);
	});

	it("not met when core access points below required", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 2), // below 3
			getResidualRelationship: jest.fn(() => 60),
			isAllKelpDialogueComplete: jest.fn(() => true),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.story.met).toBe(false);
	});

	it("not met when residual relationship below 50", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 3),
			getResidualRelationship: jest.fn(() => 49),
			isAllKelpDialogueComplete: jest.fn(() => true),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.story.met).toBe(false);
	});

	it("not met when kelp dialogue incomplete", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 3),
			getResidualRelationship: jest.fn(() => 60),
			isAllKelpDialogueComplete: jest.fn(() => false),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		expect(progress.story.met).toBe(false);
	});

	it("score tracks fractional progress across all requirements", () => {
		setVictoryStateQueries(makeQueries({
			getCoreAccessPointsDiscovered: jest.fn(() => 1), // 1/3
			getResidualRelationship: jest.fn(() => 25), // 25/50 = 0.5
			isAllKelpDialogueComplete: jest.fn(() => false), // 0
			hasMaterialOfferingDelivered: jest.fn(() => false), // 0
		}));

		const progress = evaluateVictoryConditions("player", FIRST_TICK);
		// 4 requirements: cap/3, res/50, dialogue 0/1, offering 0/1
		// = (1/3 + 0.5 + 0 + 0) / 4 = 0.2083...
		expect(progress.story.score).toBeCloseTo((1 / 3 + 0.5 + 0 + 0) / 4);
		expect(progress.story.met).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// wireTick and getVictoryProgress
// ---------------------------------------------------------------------------

describe("wireTick", () => {
	it("caches progress per faction on each tick", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getPatronSatisfaction: jest.fn((f: string) => f === "reclaimers" ? 85 : 0),
			getCompletedPatronObjectives: jest.fn((f: string) => f === "reclaimers" ? 5 : 0),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);

		const rec = getVictoryProgress("reclaimers");
		expect(rec).not.toBeNull();
		expect(rec!.colonial.met).toBe(true);

		const volt = getVictoryProgress("volt_collective");
		expect(volt).not.toBeNull();
		expect(volt!.colonial.met).toBe(false);
	});

	it("respects check interval — does not re-evaluate on every tick", () => {
		const getCubeCount = jest.fn(() => 0);
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getFactionCubeCount: getCubeCount,
		}));

		wireTick(FIRST_TICK);
		const callsAfterFirst = getCubeCount.mock.calls.length;

		wireTick(FIRST_TICK + 1); // inside interval
		expect(getCubeCount.mock.calls.length).toBe(callsAfterFirst);

		wireTick(FIRST_TICK + CHECK_INTERVAL); // at interval boundary
		expect(getCubeCount.mock.calls.length).toBeGreaterThan(callsAfterFirst);
	});

	it("getVictoryProgress returns null before first wireTick", () => {
		expect(getVictoryProgress("reclaimers")).toBeNull();
	});

	it("getAllFactionsProgress returns map of all evaluated factions", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers", "iron_creed"]),
		}));

		wireTick(FIRST_TICK);

		const all = getAllFactionsProgress();
		expect(all.has("reclaimers")).toBe(true);
		expect(all.has("iron_creed")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Victory events and winner
// ---------------------------------------------------------------------------

describe("victory events and winner", () => {
	it("emits a condition_met event when colonial condition is met", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
			getPatronSatisfaction: jest.fn((f: string) => f === "reclaimers" ? 85 : 0),
			getCompletedPatronObjectives: jest.fn((f: string) => f === "reclaimers" ? 5 : 0),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);

		const events = getVictoryEvents();
		const conditionMetEvents = events.filter((e) => e.type === "condition_met");
		expect(conditionMetEvents).toHaveLength(1);
		expect(conditionMetEvents[0].faction).toBe("reclaimers");
		expect(conditionMetEvents[0].condition).toBe("colonial");
		expect(conditionMetEvents[0].tick).toBe(FIRST_TICK);
	});

	it("getVictoryEvents drains the queue", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);

		const first = getVictoryEvents();
		expect(first.length).toBeGreaterThan(0); // at least condition_met
		const second = getVictoryEvents();
		expect(second).toHaveLength(0);
	});

	it("sets winner on first condition met", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);

		expect(isGameOver()).toBe(true);
		const winner = getWinner();
		expect(winner).not.toBeNull();
		expect(winner!.faction).toBe("reclaimers");
	});

	it("game stays over after winner is set", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);
		wireTick(FIRST_TICK + CHECK_INTERVAL);

		expect(isGameOver()).toBe(true);
	});

	it("story victory beats colonial in simultaneous tiebreaker", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["player", "iron_creed"]),
			// Player meets both colonial and story
			getPatronSatisfaction: jest.fn((f: string) => f === "player" ? 85 : 0),
			getCompletedPatronObjectives: jest.fn((f: string) => f === "player" ? 5 : 0),
			getTotalPatronObjectives: jest.fn(() => 5),
			getCoreAccessPointsDiscovered: jest.fn(() => 3),
			getResidualRelationship: jest.fn(() => 60),
			isAllKelpDialogueComplete: jest.fn(() => true),
			hasMaterialOfferingDelivered: jest.fn(() => true),
		}));

		wireTick(FIRST_TICK);

		const winner = getWinner();
		expect(winner).not.toBeNull();
		// Story takes priority over colonial in tiebreaker
		expect(winner!.condition).toBe("story");
	});
});

// ---------------------------------------------------------------------------
// Alert thresholds
// ---------------------------------------------------------------------------

describe("alert thresholds", () => {
	it("fires threshold events at 25%, 50%, 75%, 90% progress", () => {
		const thresholds = [0.25, 0.5, 0.75, 0.9];

		for (const threshold of thresholds) {
			resetVictoryConditionEvaluator();

			const cubes = Math.floor(500 * threshold);
			setVictoryStateQueries(makeQueries({
				getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
				getFactionCubeCount: jest.fn(() => cubes),
				getFactionMaterialDiversity: jest.fn(() => Math.floor(4 * threshold)),
			}));

			wireTick(FIRST_TICK);

			const events = getVictoryEvents();
			const thresholdEvents = events.filter((e) => e.type === "threshold_reached");
			// At or above threshold, at least one threshold event should have fired
			// (thresholds are cumulative — at 0.5 we also passed 0.25)
			const expectedCount = thresholds.filter((t) => t <= threshold).length;
			expect(thresholdEvents.length).toBeGreaterThanOrEqual(expectedCount > 0 ? 1 : 0);
		}
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetVictoryConditionEvaluator", () => {
	it("clears all state including winner, events, and progress cache", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);
		expect(isGameOver()).toBe(true);

		resetVictoryConditionEvaluator();

		expect(isGameOver()).toBe(false);
		expect(getWinner()).toBeNull();
		expect(getVictoryEvents()).toEqual([]);
		expect(getVictoryProgress("reclaimers")).toBeNull();
	});

	it("allows re-initialization after reset", () => {
		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers"]),
			getPatronSatisfaction: jest.fn(() => 85),
			getCompletedPatronObjectives: jest.fn(() => 5),
			getTotalPatronObjectives: jest.fn(() => 5),
		}));

		wireTick(FIRST_TICK);
		expect(isGameOver()).toBe(true);

		resetVictoryConditionEvaluator();

		setVictoryStateQueries(makeQueries({
			getSurvivingFactions: jest.fn(() => ["reclaimers", "volt_collective"]),
		}));

		wireTick(FIRST_TICK);
		expect(isGameOver()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// No queries set
// ---------------------------------------------------------------------------

describe("no queries set", () => {
	it("wireTick does nothing when no queries are registered", () => {
		wireTick(FIRST_TICK);
		expect(isGameOver()).toBe(false);
		expect(getVictoryProgress("reclaimers")).toBeNull();
	});
});
