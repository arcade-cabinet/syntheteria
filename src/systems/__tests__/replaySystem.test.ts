/**
 * Tests for the replay recording system.
 *
 * Tests cover:
 * - startRecording / stopRecording / isRecording state management
 * - recordEvent only captures while recording is active
 * - getReplayData returns chronological copy
 * - getEventsForTick filters by tick
 * - getEventsByType filters by event type string
 * - replayLength returns total count
 * - exportReplay serialises to JSON
 * - importReplay deserialises and replaces buffer
 * - importReplay rejects invalid JSON and non-array data
 * - Memory cap: oldest events dropped when exceeding 10 000
 * - setMaxEvents / getMaxEvents configuration
 * - Optional entityId field
 * - reset clears all state
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	type ReplayEvent,
	exportReplay,
	getEventsByType,
	getEventsForTick,
	getMaxEvents,
	getReplayData,
	importReplay,
	isRecording,
	recordEvent,
	replayLength,
	reset,
	setMaxEvents,
	startRecording,
	stopRecording,
} from "../replaySystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Recording control
// ---------------------------------------------------------------------------

describe("replaySystem -- recording control", () => {
	it("is not recording by default", () => {
		expect(isRecording()).toBe(false);
	});

	it("startRecording sets isRecording to true", () => {
		startRecording();
		expect(isRecording()).toBe(true);
	});

	it("stopRecording sets isRecording to false", () => {
		startRecording();
		stopRecording();
		expect(isRecording()).toBe(false);
	});

	it("startRecording while already recording is a no-op", () => {
		startRecording();
		startRecording();
		expect(isRecording()).toBe(true);
	});

	it("stopRecording while not recording is a no-op", () => {
		stopRecording();
		expect(isRecording()).toBe(false);
	});

	it("stopRecording preserves already-recorded events", () => {
		startRecording();
		recordEvent("test", { x: 1 }, 1);
		stopRecording();

		expect(replayLength()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// recordEvent
// ---------------------------------------------------------------------------

describe("replaySystem -- recordEvent", () => {
	it("records an event with correct fields", () => {
		startRecording();
		recordEvent("cube_placed", { material: "iron" }, 10, "entity_42");

		const data = getReplayData();
		expect(data).toHaveLength(1);
		expect(data[0]).toEqual({
			tick: 10,
			eventType: "cube_placed",
			data: { material: "iron" },
			entityId: "entity_42",
		});
	});

	it("does not record when not recording", () => {
		recordEvent("test", {}, 1);
		expect(replayLength()).toBe(0);
	});

	it("resumes recording after stop/start", () => {
		startRecording();
		recordEvent("a", {}, 1);
		stopRecording();
		recordEvent("b", {}, 2);
		startRecording();
		recordEvent("c", {}, 3);

		expect(replayLength()).toBe(2);
		const types = getReplayData().map((e) => e.eventType);
		expect(types).toEqual(["a", "c"]);
	});

	it("entityId is optional", () => {
		startRecording();
		recordEvent("test", { v: 1 }, 5);

		const data = getReplayData();
		expect(data[0].entityId).toBeUndefined();
	});

	it("preserves complex payload data", () => {
		startRecording();
		const payload = {
			position: { x: 1, y: 2, z: 3 },
			items: ["a", "b"],
			nested: { deep: true },
		};
		recordEvent("complex", payload, 1);

		expect(getReplayData()[0].data).toEqual(payload);
	});
});

// ---------------------------------------------------------------------------
// getReplayData
// ---------------------------------------------------------------------------

describe("replaySystem -- getReplayData", () => {
	it("returns events in chronological order", () => {
		startRecording();
		recordEvent("first", {}, 1);
		recordEvent("second", {}, 2);
		recordEvent("third", {}, 3);

		const data = getReplayData();
		expect(data.map((e) => e.eventType)).toEqual(["first", "second", "third"]);
	});

	it("returns a copy, not a reference to the internal buffer", () => {
		startRecording();
		recordEvent("test", {}, 1);

		const data = getReplayData();
		data.push({ tick: 99, eventType: "injected", data: {} });

		expect(replayLength()).toBe(1);
	});

	it("returns empty array when nothing recorded", () => {
		expect(getReplayData()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getEventsForTick
// ---------------------------------------------------------------------------

describe("replaySystem -- getEventsForTick", () => {
	it("returns only events at the specified tick", () => {
		startRecording();
		recordEvent("a", {}, 1);
		recordEvent("b", {}, 2);
		recordEvent("c", {}, 2);
		recordEvent("d", {}, 3);

		const atTick2 = getEventsForTick(2);
		expect(atTick2).toHaveLength(2);
		expect(atTick2.map((e) => e.eventType)).toEqual(["b", "c"]);
	});

	it("returns empty array for tick with no events", () => {
		startRecording();
		recordEvent("a", {}, 1);
		expect(getEventsForTick(999)).toEqual([]);
	});

	it("returns empty array when buffer is empty", () => {
		expect(getEventsForTick(1)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getEventsByType
// ---------------------------------------------------------------------------

describe("replaySystem -- getEventsByType", () => {
	it("returns only events matching the type", () => {
		startRecording();
		recordEvent("combat_hit", { dmg: 10 }, 1);
		recordEvent("cube_placed", {}, 2);
		recordEvent("combat_hit", { dmg: 5 }, 3);

		const hits = getEventsByType("combat_hit");
		expect(hits).toHaveLength(2);
		for (const e of hits) {
			expect(e.eventType).toBe("combat_hit");
		}
	});

	it("returns empty for non-existent type", () => {
		startRecording();
		recordEvent("a", {}, 1);
		expect(getEventsByType("nonexistent")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// replayLength
// ---------------------------------------------------------------------------

describe("replaySystem -- replayLength", () => {
	it("returns 0 when empty", () => {
		expect(replayLength()).toBe(0);
	});

	it("increases with each recorded event", () => {
		startRecording();
		recordEvent("a", {}, 1);
		expect(replayLength()).toBe(1);
		recordEvent("b", {}, 2);
		expect(replayLength()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// exportReplay / importReplay
// ---------------------------------------------------------------------------

describe("replaySystem -- export/import", () => {
	it("exportReplay returns valid JSON string", () => {
		startRecording();
		recordEvent("test", { val: 42 }, 1, "e1");

		const json = exportReplay();
		const parsed = JSON.parse(json);

		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].eventType).toBe("test");
		expect(parsed[0].data.val).toBe(42);
	});

	it("importReplay replaces existing buffer", () => {
		startRecording();
		recordEvent("old", {}, 1);

		const imported: ReplayEvent[] = [
			{ tick: 10, eventType: "imported_a", data: {} },
			{ tick: 20, eventType: "imported_b", data: { x: 1 } },
		];
		importReplay(JSON.stringify(imported));

		expect(replayLength()).toBe(2);
		expect(getReplayData()[0].eventType).toBe("imported_a");
	});

	it("round-trips correctly", () => {
		startRecording();
		recordEvent("alpha", { n: 1 }, 5, "e1");
		recordEvent("beta", { n: 2 }, 10);

		const json = exportReplay();
		reset();
		importReplay(json);

		const data = getReplayData();
		expect(data).toHaveLength(2);
		expect(data[0].eventType).toBe("alpha");
		expect(data[0].entityId).toBe("e1");
		expect(data[1].eventType).toBe("beta");
	});

	it("importReplay throws on malformed JSON", () => {
		expect(() => importReplay("{not valid")).toThrow();
	});

	it("importReplay throws on non-array JSON", () => {
		expect(() => importReplay('{"not": "array"}')).toThrow(/expected a JSON array/);
	});

	it("importReplay does not change recording state", () => {
		startRecording();
		importReplay("[]");
		expect(isRecording()).toBe(true);

		stopRecording();
		importReplay("[]");
		expect(isRecording()).toBe(false);
	});

	it("exportReplay returns empty array JSON when no events", () => {
		expect(exportReplay()).toBe("[]");
	});
});

// ---------------------------------------------------------------------------
// Memory cap
// ---------------------------------------------------------------------------

describe("replaySystem -- memory cap", () => {
	it("default max is 10000", () => {
		expect(getMaxEvents()).toBe(10_000);
	});

	it("drops oldest events when exceeding max", () => {
		setMaxEvents(5);
		startRecording();

		for (let i = 0; i < 8; i++) {
			recordEvent("evt", { i }, i);
		}

		expect(replayLength()).toBe(5);

		const data = getReplayData();
		// Oldest kept should be i=3 (0,1,2 evicted).
		expect(data[0].data.i).toBe(3);
		expect(data[4].data.i).toBe(7);
	});

	it("setMaxEvents trims existing buffer", () => {
		startRecording();
		for (let i = 0; i < 20; i++) {
			recordEvent("evt", { i }, i);
		}
		expect(replayLength()).toBe(20);

		setMaxEvents(5);
		expect(replayLength()).toBe(5);

		// Most recent 5 retained.
		const data = getReplayData();
		expect(data[0].data.i).toBe(15);
	});

	it("setMaxEvents enforces minimum of 1", () => {
		setMaxEvents(0);
		expect(getMaxEvents()).toBe(1);

		setMaxEvents(-10);
		expect(getMaxEvents()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("replaySystem -- reset", () => {
	it("clears recorded events", () => {
		startRecording();
		recordEvent("test", {}, 1);
		reset();
		expect(replayLength()).toBe(0);
	});

	it("stops recording", () => {
		startRecording();
		reset();
		expect(isRecording()).toBe(false);
	});

	it("resets maxEvents to 10000", () => {
		setMaxEvents(50);
		reset();
		expect(getMaxEvents()).toBe(10_000);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("replaySystem -- edge cases", () => {
	it("records events at tick 0", () => {
		startRecording();
		recordEvent("start", {}, 0);

		expect(getEventsForTick(0)).toHaveLength(1);
	});

	it("handles empty string event types", () => {
		startRecording();
		recordEvent("", { empty: true }, 1);

		expect(getEventsByType("")).toHaveLength(1);
	});

	it("handles empty payload", () => {
		startRecording();
		recordEvent("minimal", {}, 1);

		expect(getReplayData()[0].data).toEqual({});
	});

	it("multiple events at same tick are preserved in order", () => {
		startRecording();
		recordEvent("a", {}, 5);
		recordEvent("b", {}, 5);
		recordEvent("c", {}, 5);

		const atTick5 = getEventsForTick(5);
		expect(atTick5.map((e) => e.eventType)).toEqual(["a", "b", "c"]);
	});
});
