import {
	type FactionActivityEvent,
	getFactionActivity,
	getFactionActivityFeed,
	getRecentFactionActivity,
	recordFactionActivity,
	resetFactionActivityFeed,
} from "../factionActivityFeed";

describe("factionActivityFeed", () => {
	beforeEach(() => {
		resetFactionActivityFeed();
	});

	it("starts with an empty feed", () => {
		expect(getFactionActivityFeed()).toHaveLength(0);
	});

	it("records and retrieves events", () => {
		const event: FactionActivityEvent = {
			turn: 10,
			faction: "reclaimers",
			action: "build",
			position: { x: 5, z: 10 },
			detail: "fabrication_unit",
		};
		recordFactionActivity(event);

		const feed = getFactionActivityFeed();
		expect(feed).toHaveLength(1);
		expect(feed[0]).toEqual(event);
	});

	it("returns events in chronological order", () => {
		recordFactionActivity({
			turn: 1,
			faction: "reclaimers",
			action: "harvest",
			position: { x: 0, z: 0 },
		});
		recordFactionActivity({
			turn: 2,
			faction: "volt_collective",
			action: "build",
			position: { x: 5, z: 5 },
		});
		recordFactionActivity({
			turn: 3,
			faction: "signal_choir",
			action: "scout",
			position: { x: 10, z: 10 },
		});

		const feed = getFactionActivityFeed();
		expect(feed).toHaveLength(3);
		expect(feed[0].turn).toBe(1);
		expect(feed[1].turn).toBe(2);
		expect(feed[2].turn).toBe(3);
	});

	it("getRecentFactionActivity returns last N events", () => {
		for (let i = 0; i < 10; i++) {
			recordFactionActivity({
				turn: i,
				faction: "reclaimers",
				action: "harvest",
				position: { x: i, z: i },
			});
		}

		const recent = getRecentFactionActivity(3);
		expect(recent).toHaveLength(3);
		expect(recent[0].turn).toBe(7);
		expect(recent[1].turn).toBe(8);
		expect(recent[2].turn).toBe(9);
	});

	it("getFactionActivity filters by faction", () => {
		recordFactionActivity({
			turn: 1,
			faction: "reclaimers",
			action: "build",
			position: { x: 0, z: 0 },
		});
		recordFactionActivity({
			turn: 2,
			faction: "volt_collective",
			action: "harvest",
			position: { x: 5, z: 5 },
		});
		recordFactionActivity({
			turn: 3,
			faction: "reclaimers",
			action: "expand",
			position: { x: 2, z: 2 },
		});

		const reclaimerEvents = getFactionActivity("reclaimers");
		expect(reclaimerEvents).toHaveLength(2);
		expect(reclaimerEvents.every((e) => e.faction === "reclaimers")).toBe(true);
	});

	it("trims feed at MAX_FEED_SIZE (200)", () => {
		for (let i = 0; i < 250; i++) {
			recordFactionActivity({
				turn: i,
				faction: "iron_creed",
				action: "harvest",
				position: { x: 0, z: 0 },
			});
		}

		const feed = getFactionActivityFeed();
		expect(feed.length).toBeLessThanOrEqual(200);
		// Should keep the most recent events
		expect(feed[feed.length - 1].turn).toBe(249);
	});

	it("resetFactionActivityFeed clears the feed", () => {
		recordFactionActivity({
			turn: 1,
			faction: "reclaimers",
			action: "build",
			position: { x: 0, z: 0 },
		});
		expect(getFactionActivityFeed()).toHaveLength(1);

		resetFactionActivityFeed();
		expect(getFactionActivityFeed()).toHaveLength(0);
	});
});
