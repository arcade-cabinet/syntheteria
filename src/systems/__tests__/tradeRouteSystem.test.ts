/**
 * Tests for the trade route system.
 *
 * Tests cover:
 * - Route creation (success and duplicate prevention)
 * - Route cancellation
 * - Pause and resume lifecycle
 * - Trade trip execution at intervals
 * - Revenue tracking per route
 * - Diplomatic stance auto-pause
 * - Territorial disruption
 * - Disruption recovery (reactivation)
 * - Faction route queries
 * - Route status counts
 * - Transfer handler integration
 * - Reset clears all state
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
	cancelTradeRoute,
	createTradeRoute,
	getAllTradeRoutes,
	getFactionTradeRevenue,
	getRoutesByFaction,
	getRouteStatusCounts,
	getTradeRoute,
	pauseTradeRoute,
	resetTradeRoutes,
	resumeTradeRoute,
	setDisruptionChecker,
	setStanceResolver,
	setTransferHandler,
	tradeRouteSystem,
} from "../tradeRouteSystem";

beforeEach(() => {
	resetTradeRoutes();
});

// ---------------------------------------------------------------------------
// Route creation
// ---------------------------------------------------------------------------

describe("createTradeRoute", () => {
	it("creates a route and returns its id", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
			0,
		);
		expect(id).not.toBeNull();

		const route = getTradeRoute(id!);
		expect(route).toBeDefined();
		expect(route!.fromFaction).toBe("reclaimers");
		expect(route!.toFaction).toBe("iron_creed");
		expect(route!.fromOutpost).toBe("outpost_1");
		expect(route!.toOutpost).toBe("outpost_2");
		expect(route!.resourceType).toBe("scrapMetal");
		expect(route!.amountPerTrip).toBe(5);
		expect(route!.tripInterval).toBe(100);
		expect(route!.status).toBe("active");
		expect(route!.totalTrips).toBe(0);
		expect(route!.totalAmountTransferred).toBe(0);
		expect(route!.revenue).toBe(0);
	});

	it("prevents duplicate routes between same outposts for same resource", () => {
		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		const duplicate = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			10,
			200,
		);
		expect(duplicate).toBeNull();
	});

	it("allows different resource types between same outposts", () => {
		const id1 = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		const id2 = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"eWaste",
			3,
			100,
		);
		expect(id1).not.toBeNull();
		expect(id2).not.toBeNull();
		expect(id1).not.toBe(id2);
	});

	it("allows same resource between different outposts", () => {
		const id1 = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		const id2 = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_3",
			"outpost_4",
			"scrapMetal",
			5,
			100,
		);
		expect(id1).not.toBeNull();
		expect(id2).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Route cancellation
// ---------------------------------------------------------------------------

describe("cancelTradeRoute", () => {
	it("removes a route and returns true", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		const result = cancelTradeRoute(id);
		expect(result).toBe(true);
		expect(getTradeRoute(id)).toBeUndefined();
	});

	it("returns false for non-existent route", () => {
		expect(cancelTradeRoute("nonexistent")).toBe(false);
	});

	it("route no longer appears in getAllTradeRoutes after cancellation", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		cancelTradeRoute(id);
		expect(getAllTradeRoutes()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Pause and resume
// ---------------------------------------------------------------------------

describe("pause and resume", () => {
	it("pauses an active route", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		const result = pauseTradeRoute(id);
		expect(result).toBe(true);
		expect(getTradeRoute(id)!.status).toBe("paused");
	});

	it("resumes a paused route", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		pauseTradeRoute(id);
		const result = resumeTradeRoute(id);
		expect(result).toBe(true);
		expect(getTradeRoute(id)!.status).toBe("active");
	});

	it("cannot pause a paused route", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		pauseTradeRoute(id);
		expect(pauseTradeRoute(id)).toBe(false);
	});

	it("cannot resume an active route", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;
		expect(resumeTradeRoute(id)).toBe(false);
	});

	it("pause returns false for non-existent route", () => {
		expect(pauseTradeRoute("nonexistent")).toBe(false);
	});

	it("resume returns false for non-existent route", () => {
		expect(resumeTradeRoute("nonexistent")).toBe(false);
	});

	it("paused routes are not processed by system tick", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;
		pauseTradeRoute(id);

		tradeRouteSystem(10);
		tradeRouteSystem(20);

		expect(getTradeRoute(id)!.totalTrips).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Trade trip execution
// ---------------------------------------------------------------------------

describe("trade trip execution", () => {
	it("executes a trip when interval elapses", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);

		const route = getTradeRoute(id)!;
		expect(route.totalTrips).toBe(1);
		expect(route.totalAmountTransferred).toBe(5);
		expect(route.lastTripTick).toBe(10);
	});

	it("does not execute trip before interval", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(5);
		expect(getTradeRoute(id)!.totalTrips).toBe(0);
	});

	it("accumulates multiple trips over time", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10); // trip 1
		tradeRouteSystem(20); // trip 2
		tradeRouteSystem(30); // trip 3

		const route = getTradeRoute(id)!;
		expect(route.totalTrips).toBe(3);
		expect(route.totalAmountTransferred).toBe(15);
	});

	it("tracks revenue per trip", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		const route = getTradeRoute(id)!;
		// Revenue = amountPerTrip * resource value (default 1 if not in tradeRatios)
		expect(route.revenue).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Diplomatic stance auto-pause
// ---------------------------------------------------------------------------

describe("diplomatic stance integration", () => {
	it("auto-pauses route when stance drops below friendly", () => {
		setStanceResolver(() => 10); // neutral (below friendly threshold of 30)

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("paused");
		expect(getTradeRoute(id)!.totalTrips).toBe(0);
	});

	it("routes remain active when stance is friendly or above", () => {
		setStanceResolver(() => 50); // friendly

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("active");
		expect(getTradeRoute(id)!.totalTrips).toBe(1);
	});

	it("routes are active when stance is exactly at friendly threshold", () => {
		setStanceResolver(() => 30); // exactly friendly

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("active");
	});

	it("hostile stance auto-pauses routes", () => {
		setStanceResolver(() => -60); // hostile

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("paused");
	});

	it("no stance resolver means no auto-pause", () => {
		// stanceResolver is null after reset
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("active");
	});
});

// ---------------------------------------------------------------------------
// Territorial disruption
// ---------------------------------------------------------------------------

describe("territorial disruption", () => {
	it("disrupts route when territory is contested", () => {
		setDisruptionChecker(() => true);

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("disrupted");
		expect(getTradeRoute(id)!.totalTrips).toBe(0);
	});

	it("reactivates route when disruption clears", () => {
		let disrupted = true;
		setDisruptionChecker(() => disrupted);

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("disrupted");

		// Territory clears
		disrupted = false;
		tradeRouteSystem(20);
		expect(getTradeRoute(id)!.status).toBe("active");
	});

	it("disrupted routes do not execute trips", () => {
		setDisruptionChecker(() => true);

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		tradeRouteSystem(20);
		expect(getTradeRoute(id)!.totalTrips).toBe(0);
	});

	it("stance check runs before disruption check", () => {
		setStanceResolver(() => -60); // hostile
		setDisruptionChecker(() => true);

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		// Stance check pauses before disruption check runs
		expect(getTradeRoute(id)!.status).toBe("paused");
	});
});

// ---------------------------------------------------------------------------
// Transfer handler
// ---------------------------------------------------------------------------

describe("transfer handler", () => {
	it("calls transfer handler on each trip", () => {
		const handler = jest.fn().mockReturnValue(true);
		setTransferHandler(handler);

		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		);

		tradeRouteSystem(10);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				fromFaction: "reclaimers",
				toFaction: "iron_creed",
				resourceType: "scrapMetal",
				amountPerTrip: 5,
			}),
		);
	});

	it("does not count trip if transfer handler returns false", () => {
		setTransferHandler(() => false);

		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		const route = getTradeRoute(id)!;
		expect(route.totalTrips).toBe(0);
		expect(route.totalAmountTransferred).toBe(0);
		expect(route.revenue).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Faction queries
// ---------------------------------------------------------------------------

describe("faction queries", () => {
	it("getRoutesByFaction returns routes where faction is sender or receiver", () => {
		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		createTradeRoute(
			"volt_collective",
			"reclaimers",
			"outpost_3",
			"outpost_4",
			"eWaste",
			3,
			100,
		);
		createTradeRoute(
			"volt_collective",
			"iron_creed",
			"outpost_5",
			"outpost_6",
			"scrapMetal",
			2,
			100,
		);

		const reclaimerRoutes = getRoutesByFaction("reclaimers");
		expect(reclaimerRoutes).toHaveLength(2);

		const voltRoutes = getRoutesByFaction("volt_collective");
		expect(voltRoutes).toHaveLength(2);

		const ironRoutes = getRoutesByFaction("iron_creed");
		expect(ironRoutes).toHaveLength(2);
	});

	it("returns empty array for faction with no routes", () => {
		expect(getRoutesByFaction("signal_choir")).toEqual([]);
	});

	it("getFactionTradeRevenue sums revenue across all routes", () => {
		const id1 = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;
		const id2 = createTradeRoute(
			"volt_collective",
			"reclaimers",
			"outpost_3",
			"outpost_4",
			"scrapMetal",
			3,
			10,
			0,
		)!;

		tradeRouteSystem(10);

		const revenue = getFactionTradeRevenue("reclaimers");
		const route1 = getTradeRoute(id1)!;
		const route2 = getTradeRoute(id2)!;
		expect(revenue).toBe(route1.revenue + route2.revenue);
	});

	it("getRouteStatusCounts returns counts per status", () => {
		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		const id2 = createTradeRoute(
			"reclaimers",
			"volt_collective",
			"outpost_3",
			"outpost_4",
			"eWaste",
			3,
			100,
		)!;
		pauseTradeRoute(id2);

		const counts = getRouteStatusCounts("reclaimers");
		expect(counts.active).toBe(1);
		expect(counts.paused).toBe(1);
		expect(counts.disrupted).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getAllTradeRoutes
// ---------------------------------------------------------------------------

describe("getAllTradeRoutes", () => {
	it("returns all routes as copies", () => {
		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		createTradeRoute(
			"volt_collective",
			"iron_creed",
			"outpost_3",
			"outpost_4",
			"eWaste",
			3,
			100,
		);

		const all = getAllTradeRoutes();
		expect(all).toHaveLength(2);

		// Verify they are copies
		all[0].amountPerTrip = 99999;
		const fresh = getAllTradeRoutes();
		expect(fresh[0].amountPerTrip).not.toBe(99999);
	});

	it("returns empty array when no routes exist", () => {
		expect(getAllTradeRoutes()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getTradeRoute
// ---------------------------------------------------------------------------

describe("getTradeRoute", () => {
	it("returns undefined for non-existent route", () => {
		expect(getTradeRoute("nonexistent")).toBeUndefined();
	});

	it("returns a copy (no mutation)", () => {
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		)!;

		const route = getTradeRoute(id)!;
		route.amountPerTrip = 99999;

		expect(getTradeRoute(id)!.amountPerTrip).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetTradeRoutes", () => {
	it("clears all routes and state", () => {
		createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		setStanceResolver(() => 50);
		setDisruptionChecker(() => false);
		setTransferHandler(() => true);

		resetTradeRoutes();

		expect(getAllTradeRoutes()).toEqual([]);
		// After reset, new route ids should restart from 0
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			100,
		);
		expect(id).toBe("route_0");
	});

	it("clears integration hooks after reset", () => {
		// Set a stance resolver that would pause routes
		setStanceResolver(() => -60);

		resetTradeRoutes();

		// After reset, no stance resolver — route should stay active
		const id = createTradeRoute(
			"reclaimers",
			"iron_creed",
			"outpost_1",
			"outpost_2",
			"scrapMetal",
			5,
			10,
			0,
		)!;

		tradeRouteSystem(10);
		expect(getTradeRoute(id)!.status).toBe("active");
	});
});
