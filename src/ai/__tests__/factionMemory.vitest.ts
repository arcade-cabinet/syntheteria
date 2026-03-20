import { beforeEach, describe, expect, it } from "vitest";
import {
	FactionMemory,
	getFactionMemory,
	resetAllFactionMemories,
	updateFactionPerception,
} from "../perception/factionMemory";

describe("FactionMemory", () => {
	let memory: FactionMemory;

	beforeEach(() => {
		memory = new FactionMemory(5);
	});

	it("records a sighting", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		expect(memory.size).toBe(1);
	});

	it("updates position on re-sight", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.recordSighting(10, "player", 6, 5, 2);
		const records = memory.getValidRecords(2);
		expect(records).toHaveLength(1);
		expect(records[0].tileX).toBe(6);
		expect(records[0].turnSeen).toBe(2);
	});

	it("prunes stale records", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.pruneStale(10); // Turn 10, memorySpan 5 → 10-1=9 > 5 → prune
		expect(memory.size).toBe(0);
	});

	it("keeps fresh records", () => {
		memory.recordSighting(10, "player", 5, 5, 5);
		memory.pruneStale(8); // Turn 8, 8-5=3 ≤ 5 → keep
		expect(memory.size).toBe(1);
	});

	it("getValidRecords filters by memorySpan", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.recordSighting(20, "iron_creed", 8, 8, 5);
		const valid = memory.getValidRecords(7);
		// Record 10: 7-1=6 > 5 → expired
		// Record 20: 7-5=2 ≤ 5 → valid
		expect(valid).toHaveLength(1);
		expect(valid[0].entityId).toBe(20);
	});

	it("beginTurnUpdate marks all as not visible", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		expect(memory.getVisibleRecords()).toHaveLength(1);
		memory.beginTurnUpdate();
		expect(memory.getVisibleRecords()).toHaveLength(0);
	});

	it("getRememberedRecords returns stale-but-valid sightings", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.beginTurnUpdate();
		const remembered = memory.getRememberedRecords(3);
		expect(remembered).toHaveLength(1);
		expect(remembered[0].currentlyVisible).toBe(false);
	});

	it("forgetEntity removes a specific record", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.recordSighting(20, "iron_creed", 8, 8, 1);
		memory.forgetEntity(10);
		expect(memory.size).toBe(1);
	});

	it("clear removes all records", () => {
		memory.recordSighting(10, "player", 5, 5, 1);
		memory.recordSighting(20, "iron_creed", 8, 8, 1);
		memory.clear();
		expect(memory.size).toBe(0);
	});
});

describe("updateFactionPerception", () => {
	beforeEach(() => {
		resetAllFactionMemories();
	});

	it("records enemies within scan range", () => {
		const myUnits = [{ tileX: 5, tileZ: 5, scanRange: 4 }];
		const allEnemies = [
			{ entityId: 10, factionId: "player", tileX: 7, tileZ: 5 }, // dist=2, in range
			{ entityId: 20, factionId: "player", tileX: 15, tileZ: 15 }, // dist=20, out of range
		];

		updateFactionPerception("reclaimers", myUnits, allEnemies, 1);

		const memory = getFactionMemory("reclaimers");
		const records = memory.getValidRecords(1);
		expect(records).toHaveLength(1);
		expect(records[0].entityId).toBe(10);
	});

	it("multiple units share faction memory", () => {
		const myUnits = [
			{ tileX: 0, tileZ: 0, scanRange: 3 },
			{ tileX: 10, tileZ: 10, scanRange: 3 },
		];
		const allEnemies = [
			{ entityId: 10, factionId: "player", tileX: 2, tileZ: 0 }, // near unit 1
			{ entityId: 20, factionId: "player", tileX: 11, tileZ: 10 }, // near unit 2
		];

		updateFactionPerception("reclaimers", myUnits, allEnemies, 1);

		const memory = getFactionMemory("reclaimers");
		expect(memory.getValidRecords(1)).toHaveLength(2);
	});

	it("prunes expired records automatically", () => {
		const myUnits = [{ tileX: 5, tileZ: 5, scanRange: 4 }];
		const allEnemies = [
			{ entityId: 10, factionId: "player", tileX: 7, tileZ: 5 },
		];

		updateFactionPerception("reclaimers", myUnits, allEnemies, 1);

		// On turn 10, with default memorySpan=5, turn 1 record is stale
		updateFactionPerception("reclaimers", [], [], 10);

		const memory = getFactionMemory("reclaimers");
		expect(memory.getValidRecords(10)).toHaveLength(0);
	});
});
