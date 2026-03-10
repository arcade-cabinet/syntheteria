/**
 * Tests for the diplomacy system.
 *
 * Tests cover:
 * - Default stance is neutral with opinion 0
 * - Opinion modifiers change opinion and stance correctly
 * - Stance thresholds (hostile at -50, allied at +60)
 * - Opinion decays toward neutral
 * - Trade proposals: creation, acceptance, rejection
 * - AI trade proposal logic (friendly factions propose trades)
 * - Relations are independent per pair
 * - Reset clears all state
 * - Event chains (attack -> hostile -> more attacks)
 * - Trade cooldown enforcement
 * - Opinion clamping at -100 and +100
 */

jest.mock("../../../config", () => ({
	config: {
		diplomacy: {
			relations: {
				defaultStance: "neutral",
				stances: [
					"hostile",
					"unfriendly",
					"neutral",
					"friendly",
					"allied",
				],
				stanceThresholds: {
					hostile: -50,
					unfriendly: -20,
					neutral: 0,
					friendly: 30,
					allied: 60,
				},
			},
			opinionModifiers: {
				tradeDeal: 15,
				brokenTrade: -25,
				attackedUs: -40,
				sharedEnemy: 10,
				territoryInfringement: -15,
				cubeGift: 5,
				allianceProposal: 20,
				betrayal: -60,
			},
			tradeRatios: {
				scrapMetal_to_eWaste: 2,
				eWaste_to_intactComponents: 3,
				scrapMetal_to_intactComponents: 5,
			},
			checkInterval: 300,
			decayRate: 0.01,
			tradeProposalCooldown: 600,
		},
	},
}));

import {
	acceptTrade,
	adjustOpinion,
	decayOpinions,
	diplomacySystem,
	getActiveTradeProposals,
	getAllRelations,
	getRelation,
	modifyOpinion,
	proposeTrade,
	rejectTrade,
	resetDiplomacy,
} from "../diplomacySystem";

beforeEach(() => {
	resetDiplomacy();
});

// ---------------------------------------------------------------------------
// Default relations
// ---------------------------------------------------------------------------

describe("default relations", () => {
	it("returns neutral stance for unknown faction pair", () => {
		const rel = getRelation("reclaimers", "volt_collective");
		expect(rel.opinion).toBe(0);
		expect(rel.stance).toBe("neutral");
	});

	it("returns neutral stance for player vs AI", () => {
		const rel = getRelation("player", "iron_creed");
		expect(rel.stance).toBe("neutral");
		expect(rel.opinion).toBe(0);
	});

	it("getAllRelations returns empty when no opinions set", () => {
		expect(getAllRelations()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Opinion modifiers
// ---------------------------------------------------------------------------

describe("modifyOpinion", () => {
	it("tradeDeal increases opinion by 15", () => {
		modifyOpinion("reclaimers", "iron_creed", "tradeDeal");
		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBe(15);
	});

	it("attackedUs decreases opinion by 40", () => {
		modifyOpinion("player", "volt_collective", "attackedUs");
		const rel = getRelation("player", "volt_collective");
		expect(rel.opinion).toBe(-40);
	});

	it("multiple modifiers stack", () => {
		modifyOpinion("reclaimers", "iron_creed", "tradeDeal"); // +15
		modifyOpinion("reclaimers", "iron_creed", "tradeDeal"); // +15
		modifyOpinion("reclaimers", "iron_creed", "cubeGift"); // +5
		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBe(35);
		expect(rel.stance).toBe("friendly");
	});

	it("pair key is order-independent", () => {
		modifyOpinion("reclaimers", "iron_creed", "tradeDeal");
		const relAB = getRelation("reclaimers", "iron_creed");
		const relBA = getRelation("iron_creed", "reclaimers");
		expect(relAB.opinion).toBe(relBA.opinion);
	});
});

// ---------------------------------------------------------------------------
// Stance thresholds
// ---------------------------------------------------------------------------

describe("stance thresholds", () => {
	it("hostile at opinion <= -50", () => {
		adjustOpinion("player", "volt_collective", -50);
		expect(getRelation("player", "volt_collective").stance).toBe("hostile");
	});

	it("unfriendly at opinion -20", () => {
		adjustOpinion("player", "volt_collective", -20);
		expect(getRelation("player", "volt_collective").stance).toBe(
			"unfriendly",
		);
	});

	it("neutral at opinion 0", () => {
		expect(getRelation("player", "volt_collective").stance).toBe("neutral");
	});

	it("friendly at opinion 30", () => {
		adjustOpinion("player", "volt_collective", 30);
		expect(getRelation("player", "volt_collective").stance).toBe("friendly");
	});

	it("allied at opinion 60", () => {
		adjustOpinion("player", "volt_collective", 60);
		expect(getRelation("player", "volt_collective").stance).toBe("allied");
	});

	it("opinion between unfriendly and hostile thresholds is unfriendly", () => {
		adjustOpinion("player", "volt_collective", -35);
		expect(getRelation("player", "volt_collective").stance).toBe(
			"unfriendly",
		);
	});

	it("opinion between neutral and friendly thresholds is neutral", () => {
		adjustOpinion("player", "volt_collective", 15);
		expect(getRelation("player", "volt_collective").stance).toBe("neutral");
	});
});

// ---------------------------------------------------------------------------
// Opinion decay
// ---------------------------------------------------------------------------

describe("opinion decay", () => {
	it("positive opinion decays toward 0", () => {
		adjustOpinion("reclaimers", "iron_creed", 50);
		decayOpinions();
		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBeLessThan(50);
		expect(rel.opinion).toBeGreaterThan(0);
	});

	it("negative opinion decays toward 0", () => {
		adjustOpinion("reclaimers", "iron_creed", -50);
		decayOpinions();
		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBeGreaterThan(-50);
		expect(rel.opinion).toBeLessThan(0);
	});

	it("opinion of 0 does not change", () => {
		adjustOpinion("reclaimers", "iron_creed", 0);
		decayOpinions();
		// Opinion was never set above 0 explicitly, but let's set it to ensure
		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBe(0);
	});

	it("decay rate is proportional to absolute opinion", () => {
		adjustOpinion("player", "reclaimers", 100);
		adjustOpinion("player", "iron_creed", 50);

		decayOpinions();

		const relHigh = getRelation("player", "reclaimers");
		const relLow = getRelation("player", "iron_creed");

		// 100 decays by 0.01 * 100 = 1, 50 decays by 0.01 * 50 = 0.5
		expect(relHigh.opinion).toBeCloseTo(99);
		expect(relLow.opinion).toBeCloseTo(49.5);
	});
});

// ---------------------------------------------------------------------------
// Trade proposals
// ---------------------------------------------------------------------------

describe("trade proposals", () => {
	it("creates a trade proposal", () => {
		const id = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		);
		expect(id).not.toBeNull();

		const proposals = getActiveTradeProposals();
		expect(proposals).toHaveLength(1);
		expect(proposals[0].from).toBe("reclaimers");
		expect(proposals[0].to).toBe("iron_creed");
		expect(proposals[0].status).toBe("pending");
	});

	it("accepts a trade proposal and modifies opinion", () => {
		const id = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		)!;
		const result = acceptTrade(id);
		expect(result).toBe(true);

		const proposals = getActiveTradeProposals();
		expect(proposals).toHaveLength(0);

		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBe(15); // tradeDeal modifier
	});

	it("rejects a trade proposal without opinion change", () => {
		const id = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		)!;
		const result = rejectTrade(id);
		expect(result).toBe(true);

		const proposals = getActiveTradeProposals();
		expect(proposals).toHaveLength(0);

		const rel = getRelation("reclaimers", "iron_creed");
		expect(rel.opinion).toBe(0);
	});

	it("returns false when accepting non-existent proposal", () => {
		expect(acceptTrade("nonexistent")).toBe(false);
	});

	it("returns false when rejecting non-existent proposal", () => {
		expect(rejectTrade("nonexistent")).toBe(false);
	});

	it("enforces trade proposal cooldown", () => {
		const id1 = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		);
		expect(id1).not.toBeNull();

		// Try again within cooldown (600 ticks)
		const id2 = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 5 },
			{ eWaste: 2 },
			100,
		);
		expect(id2).toBeNull();

		// After cooldown
		const id3 = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 5 },
			{ eWaste: 2 },
			600,
		);
		expect(id3).not.toBeNull();
	});

	it("cannot accept an already-accepted proposal", () => {
		const id = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		)!;
		acceptTrade(id);
		expect(acceptTrade(id)).toBe(false);
	});

	it("cannot reject an already-rejected proposal", () => {
		const id = proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		)!;
		rejectTrade(id);
		expect(rejectTrade(id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// AI trade proposals
// ---------------------------------------------------------------------------

describe("AI diplomacy decisions", () => {
	it("AI factions propose trades to friendly factions at check interval", () => {
		// Make reclaimers friendly with iron_creed
		adjustOpinion("reclaimers", "iron_creed", 35);

		// Run at check interval (300)
		diplomacySystem(300);

		const proposals = getActiveTradeProposals();
		// At least one proposal from reclaimers to iron_creed (or vice versa)
		const relevantProposals = proposals.filter(
			(p) =>
				(p.from === "reclaimers" && p.to === "iron_creed") ||
				(p.from === "iron_creed" && p.to === "reclaimers"),
		);
		expect(relevantProposals.length).toBeGreaterThan(0);
	});

	it("AI factions do not propose trades to hostile factions", () => {
		adjustOpinion("reclaimers", "iron_creed", -60);

		diplomacySystem(300);

		const proposals = getActiveTradeProposals();
		const relevantProposals = proposals.filter(
			(p) =>
				(p.from === "reclaimers" && p.to === "iron_creed") ||
				(p.from === "iron_creed" && p.to === "reclaimers"),
		);
		expect(relevantProposals).toHaveLength(0);
	});

	it("does nothing when not on check interval", () => {
		adjustOpinion("reclaimers", "iron_creed", 35);
		diplomacySystem(1); // not on interval
		expect(getActiveTradeProposals()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Independent relations
// ---------------------------------------------------------------------------

describe("relation independence", () => {
	it("modifying A-B does not affect A-C", () => {
		modifyOpinion("reclaimers", "iron_creed", "tradeDeal");
		modifyOpinion("reclaimers", "volt_collective", "attackedUs");

		expect(getRelation("reclaimers", "iron_creed").opinion).toBe(15);
		expect(getRelation("reclaimers", "volt_collective").opinion).toBe(-40);
	});

	it("each faction pair is tracked separately", () => {
		adjustOpinion("reclaimers", "iron_creed", 50);
		adjustOpinion("reclaimers", "volt_collective", -30);
		adjustOpinion("iron_creed", "volt_collective", 10);

		expect(getRelation("reclaimers", "iron_creed").opinion).toBe(50);
		expect(getRelation("reclaimers", "volt_collective").opinion).toBe(-30);
		expect(getRelation("iron_creed", "volt_collective").opinion).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Event chains
// ---------------------------------------------------------------------------

describe("event chains", () => {
	it("repeated attacks push toward hostile", () => {
		modifyOpinion("player", "volt_collective", "attackedUs"); // -40
		expect(getRelation("player", "volt_collective").stance).toBe(
			"unfriendly",
		);

		modifyOpinion("player", "volt_collective", "attackedUs"); // -80
		expect(getRelation("player", "volt_collective").stance).toBe("hostile");
	});

	it("betrayal immediately shifts stance", () => {
		adjustOpinion("player", "reclaimers", 50); // friendly
		expect(getRelation("player", "reclaimers").stance).toBe("friendly");

		modifyOpinion("player", "reclaimers", "betrayal"); // -60 = 50 - 60 = -10
		expect(getRelation("player", "reclaimers").opinion).toBe(-10);
		expect(getRelation("player", "reclaimers").stance).toBe("unfriendly");
	});

	it("trade and gifts can rebuild relations", () => {
		adjustOpinion("player", "reclaimers", -30); // unfriendly
		expect(getRelation("player", "reclaimers").stance).toBe("unfriendly");

		modifyOpinion("player", "reclaimers", "tradeDeal"); // +15 = -15
		modifyOpinion("player", "reclaimers", "tradeDeal"); // +15 = 0
		modifyOpinion("player", "reclaimers", "cubeGift"); // +5 = 5
		expect(getRelation("player", "reclaimers").opinion).toBe(5);
		expect(getRelation("player", "reclaimers").stance).toBe("neutral");
	});
});

// ---------------------------------------------------------------------------
// Opinion clamping
// ---------------------------------------------------------------------------

describe("opinion clamping", () => {
	it("clamps at -100", () => {
		adjustOpinion("player", "volt_collective", -200);
		expect(getRelation("player", "volt_collective").opinion).toBe(-100);
	});

	it("clamps at +100", () => {
		adjustOpinion("player", "reclaimers", 200);
		expect(getRelation("player", "reclaimers").opinion).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetDiplomacy", () => {
	it("clears all opinion state", () => {
		adjustOpinion("player", "reclaimers", 50);
		proposeTrade(
			"reclaimers",
			"iron_creed",
			{ scrapMetal: 10 },
			{ eWaste: 5 },
			0,
		);

		resetDiplomacy();

		expect(getRelation("player", "reclaimers").opinion).toBe(0);
		expect(getAllRelations()).toEqual([]);
		expect(getActiveTradeProposals()).toEqual([]);
	});
});
