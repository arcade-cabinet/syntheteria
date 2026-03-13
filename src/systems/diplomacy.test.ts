import {
	acceptTrade,
	ALL_DIPLOMACY_FACTIONS,
	applyDiplomacyEvent,
	areAllied,
	areAtWar,
	expireTradeOffers,
	getAllFactionProfiles,
	getFactionProfile,
	getPendingTrades,
	getRecentEvents,
	getStanding,
	getStandingDisplay,
	getStandingLevel,
	modifyStanding,
	proposeTrade,
	rejectTrade,
	resetDiplomacy,
} from "./diplomacy";

beforeEach(() => {
	resetDiplomacy();
});

describe("faction profiles", () => {
	test("returns profile for all factions", () => {
		for (const factionId of ALL_DIPLOMACY_FACTIONS) {
			const profile = getFactionProfile(factionId);
			expect(profile).toBeDefined();
			expect(profile.displayName).toBeTruthy();
			expect(profile.color).toBeTruthy();
		}
	});

	test("getAllFactionProfiles returns all profiles", () => {
		const profiles = getAllFactionProfiles();
		expect(Object.keys(profiles)).toHaveLength(ALL_DIPLOMACY_FACTIONS.length);
	});
});

describe("standings", () => {
	test("default standing is 0 (neutral)", () => {
		expect(getStanding("player", "reclaimers")).toBe(0);
	});

	test("standing with self is always 100", () => {
		expect(getStanding("player", "player")).toBe(100);
	});

	test("modifyStanding changes the value", () => {
		modifyStanding("player", "reclaimers", 15, 1, "trade_completed");
		expect(getStanding("player", "reclaimers")).toBe(15);
	});

	test("modifyStanding is symmetric", () => {
		modifyStanding("player", "reclaimers", 20, 1, "test");
		// Same key regardless of argument order
		expect(getStanding("reclaimers", "player")).toBe(20);
	});

	test("standings clamp to [-100, 100]", () => {
		modifyStanding("player", "iron_creed", -200, 1, "test");
		expect(getStanding("player", "iron_creed")).toBe(-100);

		modifyStanding("player", "reclaimers", 200, 1, "test");
		expect(getStanding("player", "reclaimers")).toBe(100);
	});
});

describe("standing levels", () => {
	test("neutral at 0", () => {
		expect(getStandingLevel("player", "reclaimers")).toBe("neutral");
	});

	test("hostile at -60", () => {
		modifyStanding("player", "iron_creed", -60, 1, "test");
		expect(getStandingLevel("player", "iron_creed")).toBe("hostile");
	});

	test("unfriendly at -25", () => {
		modifyStanding("player", "iron_creed", -25, 1, "test");
		expect(getStandingLevel("player", "iron_creed")).toBe("unfriendly");
	});

	test("cordial at 30", () => {
		modifyStanding("player", "reclaimers", 30, 1, "test");
		expect(getStandingLevel("player", "reclaimers")).toBe("cordial");
	});

	test("allied at 60", () => {
		modifyStanding("player", "reclaimers", 60, 1, "test");
		expect(getStandingLevel("player", "reclaimers")).toBe("allied");
	});
});

describe("standing display", () => {
	test("returns label, color, and value", () => {
		const display = getStandingDisplay("player", "reclaimers");
		expect(display.label).toBe("Neutral");
		expect(display.color).toBeTruthy();
		expect(display.value).toBe(0);
	});
});

describe("areAtWar / areAllied", () => {
	test("areAtWar when hostile", () => {
		modifyStanding("player", "iron_creed", -60, 1, "test");
		expect(areAtWar("player", "iron_creed")).toBe(true);
		expect(areAllied("player", "iron_creed")).toBe(false);
	});

	test("areAllied when standing high", () => {
		modifyStanding("player", "reclaimers", 60, 1, "test");
		expect(areAllied("player", "reclaimers")).toBe(true);
		expect(areAtWar("player", "reclaimers")).toBe(false);
	});
});

describe("diplomacy events", () => {
	test("applyDiplomacyEvent changes standing", () => {
		applyDiplomacyEvent("trade_completed", "player", "reclaimers", 1);
		expect(getStanding("player", "reclaimers")).toBe(5);
	});

	test("getRecentEvents tracks events", () => {
		applyDiplomacyEvent("unit_attacked", "player", "iron_creed", 3);
		const events = getRecentEvents();
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("unit_attacked");
		expect(events[0].standingChange).toBe(-20);
	});
});

describe("trade offers", () => {
	test("proposeTrade creates a pending offer", () => {
		proposeTrade({
			from: "reclaimers",
			to: "player",
			offering: [{ resource: "heavy_metals", amount: 5 }],
			requesting: [{ resource: "microchips", amount: 3 }],
			turnProposed: 1,
			expiresIn: 3,
		});

		const trades = getPendingTrades("player");
		expect(trades).toHaveLength(1);
		expect(trades[0].from).toBe("reclaimers");
	});

	test("acceptTrade removes offer and improves standing", () => {
		proposeTrade({
			from: "reclaimers",
			to: "player",
			offering: [{ resource: "heavy_metals", amount: 5 }],
			requesting: [{ resource: "microchips", amount: 3 }],
			turnProposed: 1,
			expiresIn: 3,
		});

		const trades = getPendingTrades("player");
		const result = acceptTrade(trades[0].id, 2);
		expect(result).toBe(true);
		expect(getPendingTrades("player")).toHaveLength(0);
		// Standing should be positive from propose + accept
		expect(getStanding("player", "reclaimers")).toBeGreaterThan(0);
	});

	test("rejectTrade removes offer and hurts standing", () => {
		proposeTrade({
			from: "iron_creed",
			to: "player",
			offering: [{ resource: "scrap", amount: 2 }],
			requesting: [{ resource: "uranics", amount: 1 }],
			turnProposed: 1,
			expiresIn: 3,
		});

		const trades = getPendingTrades("player");
		// Standing was boosted by proposal (+3)
		const standingBefore = getStanding("player", "iron_creed");
		rejectTrade(trades[0].id, 2);
		const standingAfter = getStanding("player", "iron_creed");
		expect(standingAfter).toBeLessThan(standingBefore);
	});

	test("expireTradeOffers removes old offers", () => {
		proposeTrade({
			from: "reclaimers",
			to: "player",
			offering: [{ resource: "heavy_metals", amount: 5 }],
			requesting: [{ resource: "microchips", amount: 3 }],
			turnProposed: 1,
			expiresIn: 2,
		});

		expect(getPendingTrades("player")).toHaveLength(1);
		expireTradeOffers(2); // Not yet expired
		expect(getPendingTrades("player")).toHaveLength(1);
		expireTradeOffers(3); // Should expire (turnProposed 1 + expiresIn 2 = turn 3)
		expect(getPendingTrades("player")).toHaveLength(0);
	});

	test("acceptTrade returns false for nonexistent trade", () => {
		expect(acceptTrade("fake_id", 1)).toBe(false);
	});
});
