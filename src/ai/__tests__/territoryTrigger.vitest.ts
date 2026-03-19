import { beforeEach, describe, expect, it } from "vitest";
import {
	TerritoryTracker,
	getTerritoryTracker,
	resetAllTerritoryTrackers,
	countEnemiesInTerritory,
} from "../triggers/territoryTrigger";

describe("TerritoryTracker", () => {
	let tracker: TerritoryTracker;

	beforeEach(() => {
		tracker = new TerritoryTracker("reclaimers");
	});

	it("tracks claimed tiles", () => {
		tracker.claimTile(5, 5);
		tracker.claimTile(6, 5);
		expect(tracker.size).toBe(2);
		expect(tracker.isInTerritory(5, 5)).toBe(true);
		expect(tracker.isInTerritory(7, 7)).toBe(false);
	});

	it("setTerritory replaces all tiles", () => {
		tracker.claimTile(1, 1);
		tracker.setTerritory(new Set(["5,5", "6,5"]));
		expect(tracker.isInTerritory(1, 1)).toBe(false);
		expect(tracker.isInTerritory(5, 5)).toBe(true);
	});

	it("detects enemy entering territory", () => {
		tracker.setTerritory(new Set(["5,5", "6,5", "7,5"]));

		// First call — establishes baseline positions
		tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 3, tileZ: 3 }],
			1,
		);

		// Second call — enemy moves into territory
		const events = tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 5, tileZ: 5 }],
			2,
		);

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("enemy_entered");
		expect(events[0].entityId).toBe(10);
	});

	it("detects enemy exiting territory", () => {
		tracker.setTerritory(new Set(["5,5"]));

		// Establish enemy inside territory
		tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 5, tileZ: 5 }],
			1,
		);

		// Enemy leaves
		const events = tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 8, tileZ: 8 }],
			2,
		);

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("enemy_exited");
	});

	it("detects own unit leaving territory", () => {
		tracker.setTerritory(new Set(["5,5"]));

		// Establish own unit inside territory
		tracker.detectEvents(
			[{ entityId: 20, factionId: "reclaimers", tileX: 5, tileZ: 5 }],
			1,
		);

		// Own unit leaves
		const events = tracker.detectEvents(
			[{ entityId: 20, factionId: "reclaimers", tileX: 10, tileZ: 10 }],
			2,
		);

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("own_left");
	});

	it("detects own unit returning to territory", () => {
		tracker.setTerritory(new Set(["5,5"]));

		// Unit starts outside
		tracker.detectEvents(
			[{ entityId: 20, factionId: "reclaimers", tileX: 10, tileZ: 10 }],
			1,
		);

		// Unit returns
		const events = tracker.detectEvents(
			[{ entityId: 20, factionId: "reclaimers", tileX: 5, tileZ: 5 }],
			2,
		);

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("own_returned");
	});

	it("no event when unit stays in same zone", () => {
		tracker.setTerritory(new Set(["5,5", "6,5"]));

		tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 5, tileZ: 5 }],
			1,
		);

		const events = tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 6, tileZ: 5 }],
			2,
		);

		// Both positions are inside territory — no enter/exit event
		expect(events).toHaveLength(0);
	});

	it("forgetEntity clears tracking for a unit", () => {
		tracker.setTerritory(new Set(["5,5"]));
		tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 5, tileZ: 5 }],
			1,
		);
		tracker.forgetEntity(10);

		// After forgetting, moving to territory should look like first appearance
		const events = tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 3, tileZ: 3 }],
			2,
		);
		// No previous position known → prevKey is undefined → wasInTerritory = false
		// Current position outside territory → isInTerritory = false → no event
		expect(events).toHaveLength(0);
	});

	it("clear resets everything", () => {
		tracker.claimTile(5, 5);
		tracker.detectEvents(
			[{ entityId: 10, factionId: "player", tileX: 5, tileZ: 5 }],
			1,
		);
		tracker.clear();
		expect(tracker.size).toBe(0);
	});
});

describe("territory registry", () => {
	beforeEach(() => {
		resetAllTerritoryTrackers();
	});

	it("getTerritoryTracker creates and caches per faction", () => {
		const t1 = getTerritoryTracker("reclaimers");
		const t2 = getTerritoryTracker("reclaimers");
		expect(t1).toBe(t2);
		expect(t1.factionId).toBe("reclaimers");
	});

	it("different factions get different trackers", () => {
		const t1 = getTerritoryTracker("reclaimers");
		const t2 = getTerritoryTracker("iron_creed");
		expect(t1).not.toBe(t2);
	});

	it("countEnemiesInTerritory counts correctly", () => {
		const tracker = getTerritoryTracker("reclaimers");
		tracker.setTerritory(new Set(["5,5", "6,5", "7,5"]));

		const count = countEnemiesInTerritory("reclaimers", [
			{ tileX: 5, tileZ: 5 }, // in territory
			{ tileX: 6, tileZ: 5 }, // in territory
			{ tileX: 10, tileZ: 10 }, // outside
		]);
		expect(count).toBe(2);
	});

	it("countEnemiesInTerritory returns 0 for unknown faction", () => {
		expect(countEnemiesInTerritory("unknown_faction", [{ tileX: 5, tileZ: 5 }])).toBe(0);
	});
});
