/**
 * Unit tests for MemorySystem — persistent bot AI perception memory.
 *
 * Tests cover:
 * - updateMemory: creates, updates, and prunes memory records
 * - getMemories: returns records sorted by confidence, computes decay
 * - getRecentThreats: filters by max age
 * - hasMemoryOf / getMemoryOf: individual record lookup
 * - clearBotMemory / clearAllMemories: cleanup
 * - Confidence decay over time
 * - Visible entities always have confidence 1.0
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		enemies: {
			perception: {
				defaultFOV: 120,
				scoutFOV: 180,
				heavyFOV: 90,
				defaultRange: 15,
				cameraRangeBonus: 10,
				memoryDuration: 30,
				threatThreshold: 0.5,
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	updateMemory,
	getMemories,
	getRecentThreats,
	hasMemoryOf,
	getMemoryOf,
	clearBotMemory,
	clearAllMemories,
	getActiveMemoryCount,
} from "../MemorySystem.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_ID = "bot-1";

function makeLookup(entities: Record<string, { position: { x: number; y: number; z: number }; type: string; faction: string }>) {
	return (id: string) => entities[id] ?? null;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	clearAllMemories();
});

// ---------------------------------------------------------------------------
// updateMemory — basic creation
// ---------------------------------------------------------------------------

describe("updateMemory — creation", () => {
	it("creates memory records for visible entities", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(true);
	});

	it("creates records for multiple visible entities", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
			"enemy-2": { position: { x: 20, y: 0, z: 20 }, type: "utility_drone", faction: "cultist" },
		});

		updateMemory(BOT_ID, ["enemy-1", "enemy-2"], lookup, 0);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(true);
		expect(hasMemoryOf(BOT_ID, "enemy-2")).toBe(true);
	});

	it("skips entities that lookup returns null for", () => {
		const lookup = makeLookup({});

		updateMemory(BOT_ID, ["nonexistent"], lookup, 0);

		expect(hasMemoryOf(BOT_ID, "nonexistent")).toBe(false);
	});

	it("does not create records when visible list is empty", () => {
		const lookup = makeLookup({});

		updateMemory(BOT_ID, [], lookup, 0);

		const memories = getMemories(BOT_ID, 0);
		expect(memories).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// updateMemory — updating existing records
// ---------------------------------------------------------------------------

describe("updateMemory — updates", () => {
	it("updates position when entity is seen again", () => {
		const lookup1 = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup1, 0);

		const lookup2 = makeLookup({
			"enemy-1": { position: { x: 20, y: 0, z: 20 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup2, 5);

		const memory = getMemoryOf(BOT_ID, "enemy-1", 5);
		expect(memory).not.toBeNull();
		expect(memory!.lastSeenPosition.x).toBe(20);
		expect(memory!.lastSeenPosition.z).toBe(20);
	});

	it("updates lastSeenTime when entity is re-seen", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, ["enemy-1"], lookup, 10);

		const memory = getMemoryOf(BOT_ID, "enemy-1", 10);
		expect(memory!.lastSeenTime).toBe(10);
	});

	it("marks previously visible entities as not visible", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		// Next frame, enemy-1 is no longer visible
		updateMemory(BOT_ID, [], lookup, 1);

		const memory = getMemoryOf(BOT_ID, "enemy-1", 1);
		expect(memory).not.toBeNull();
		expect(memory!.visible).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// updateMemory — pruning
// ---------------------------------------------------------------------------

describe("updateMemory — pruning", () => {
	it("prunes memories older than memoryDuration (30s)", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		// 31 seconds later, entity is no longer visible
		updateMemory(BOT_ID, [], lookup, 31);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(false);
	});

	it("does not prune memories within memoryDuration", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 25);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getMemories — confidence computation
// ---------------------------------------------------------------------------

describe("getMemories — confidence", () => {
	it("returns confidence 1.0 for currently visible entities", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		const memories = getMemories(BOT_ID, 0);
		expect(memories).toHaveLength(1);
		expect(memories[0].confidence).toBe(1.0);
	});

	it("decays confidence for non-visible entities", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 1); // now not visible

		const memories = getMemories(BOT_ID, 15);
		expect(memories).toHaveLength(1);
		// confidence = 1 - (15 / 30) = 0.5
		expect(memories[0].confidence).toBeCloseTo(0.5);
	});

	it("returns confidence 0 for fully decayed (excluded from results)", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 1);

		// At exactly memoryDuration, confidence = 1 - (30/30) = 0
		const memories = getMemories(BOT_ID, 30);
		expect(memories).toHaveLength(0);
	});

	it("sorts results by confidence descending", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
			"enemy-2": { position: { x: 20, y: 0, z: 20 }, type: "utility_drone", faction: "cultist" },
		});

		// enemy-1 seen at t=0, enemy-2 seen at t=10
		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, ["enemy-2"], lookup, 10);

		// At t=20: enemy-1 age=20, confidence=(1-20/30)=0.33;
		//          enemy-2 is still visible (confidence=1.0)
		const memories = getMemories(BOT_ID, 20);
		expect(memories.length).toBeGreaterThanOrEqual(1);
		// Most confident first
		expect(memories[0].entityId).toBe("enemy-2");
	});
});

// ---------------------------------------------------------------------------
// getRecentThreats
// ---------------------------------------------------------------------------

describe("getRecentThreats", () => {
	it("returns memories within maxAge", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 1);

		const threats = getRecentThreats(BOT_ID, 5, 3);
		expect(threats).toHaveLength(1);
	});

	it("excludes memories older than maxAge", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 1);

		const threats = getRecentThreats(BOT_ID, 5, 20);
		expect(threats).toHaveLength(0);
	});

	it("returns empty array for unknown bot", () => {
		expect(getRecentThreats("unknown-bot", 10, 0)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getMemoryOf
// ---------------------------------------------------------------------------

describe("getMemoryOf", () => {
	it("returns specific memory record", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		const memory = getMemoryOf(BOT_ID, "enemy-1", 0);
		expect(memory).not.toBeNull();
		expect(memory!.entityId).toBe("enemy-1");
		expect(memory!.faction).toBe("feral");
		expect(memory!.entityType).toBe("maintenance_bot");
	});

	it("returns null for unknown entity", () => {
		expect(getMemoryOf(BOT_ID, "nonexistent", 0)).toBeNull();
	});

	it("returns null for unknown bot", () => {
		expect(getMemoryOf("unknown-bot", "enemy-1", 0)).toBeNull();
	});

	it("returns null when confidence has decayed to zero", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory(BOT_ID, [], lookup, 1);

		// At t=31 (> memoryDuration), confidence <= 0
		expect(getMemoryOf(BOT_ID, "enemy-1", 31)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// hasMemoryOf
// ---------------------------------------------------------------------------

describe("hasMemoryOf", () => {
	it("returns true when bot has memory of entity", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(true);
	});

	it("returns false for unknown entity", () => {
		expect(hasMemoryOf(BOT_ID, "nonexistent")).toBe(false);
	});

	it("returns false for unknown bot", () => {
		expect(hasMemoryOf("unknown-bot", "enemy-1")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// clearBotMemory / clearAllMemories
// ---------------------------------------------------------------------------

describe("memory cleanup", () => {
	it("clearBotMemory removes all memories for a specific bot", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		clearBotMemory(BOT_ID);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(false);
		expect(getMemories(BOT_ID, 0)).toHaveLength(0);
	});

	it("clearBotMemory does not affect other bots", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory("bot-2", ["enemy-1"], lookup, 0);

		clearBotMemory(BOT_ID);

		expect(hasMemoryOf(BOT_ID, "enemy-1")).toBe(false);
		expect(hasMemoryOf("bot-2", "enemy-1")).toBe(true);
	});

	it("clearAllMemories removes everything", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);
		updateMemory("bot-2", ["enemy-1"], lookup, 0);

		clearAllMemories();

		expect(getActiveMemoryCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getActiveMemoryCount
// ---------------------------------------------------------------------------

describe("getActiveMemoryCount", () => {
	it("returns 0 when no bots have memories", () => {
		expect(getActiveMemoryCount()).toBe(0);
	});

	it("returns count of bots with active memories", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory("bot-1", ["enemy-1"], lookup, 0);
		updateMemory("bot-2", ["enemy-1"], lookup, 0);
		updateMemory("bot-3", ["enemy-1"], lookup, 0);

		expect(getActiveMemoryCount()).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles duplicate entity IDs in visible list gracefully", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		updateMemory(BOT_ID, ["enemy-1", "enemy-1"], lookup, 0);

		const memories = getMemories(BOT_ID, 0);
		expect(memories).toHaveLength(1);
	});

	it("handles rapid sequential updates", () => {
		const lookup = makeLookup({
			"enemy-1": { position: { x: 10, y: 0, z: 10 }, type: "maintenance_bot", faction: "feral" },
		});

		for (let t = 0; t < 10; t++) {
			updateMemory(BOT_ID, ["enemy-1"], lookup, t);
		}

		const memory = getMemoryOf(BOT_ID, "enemy-1", 9);
		expect(memory).not.toBeNull();
		expect(memory!.lastSeenTime).toBe(9);
		expect(memory!.visible).toBe(true);
		expect(memory!.confidence).toBe(1.0);
	});

	it("memory position is a copy, not a reference", () => {
		const pos = { x: 10, y: 0, z: 10 };
		const lookup = (id: string) =>
			id === "enemy-1"
				? { position: pos, type: "maintenance_bot", faction: "feral" }
				: null;

		updateMemory(BOT_ID, ["enemy-1"], lookup, 0);

		// Mutate the original
		pos.x = 999;

		const memory = getMemoryOf(BOT_ID, "enemy-1", 0);
		expect(memory!.lastSeenPosition.x).toBe(10); // should be the original value
	});
});
