import {
	finalizeTurn,
	getCompletedTurnLogs,
	getCurrentTurnEvents,
	getCurrentTurnNumber,
	getTurnLog,
	logTurnEvent,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "./turnEventLog";

beforeEach(() => {
	resetTurnEventLog();
});

describe("logTurnEvent", () => {
	it("records events for the current turn", () => {
		logTurnEvent("movement", "unit_1", "player", { toQ: 3, toR: 4 });
		logTurnEvent("combat", "unit_2", "player", { action: "attack" });

		const events = getCurrentTurnEvents();
		expect(events).toHaveLength(2);
		expect(events[0].type).toBe("movement");
		expect(events[0].entityId).toBe("unit_1");
		expect(events[0].faction).toBe("player");
		expect(events[0].details).toEqual({ toQ: 3, toR: 4 });
		expect(events[1].type).toBe("combat");
	});

	it("records timestamp on each event", () => {
		const before = Date.now();
		logTurnEvent("movement", "unit_1", "player");
		const after = Date.now();

		const event = getCurrentTurnEvents()[0];
		expect(event.timestamp).toBeGreaterThanOrEqual(before);
		expect(event.timestamp).toBeLessThanOrEqual(after);
	});

	it("allows null entityId for system events", () => {
		logTurnEvent("turn_end", null, "system", { turnNumber: 1 });

		const event = getCurrentTurnEvents()[0];
		expect(event.entityId).toBeNull();
	});
});

describe("finalizeTurn", () => {
	it("moves current events to completed log and increments turn", () => {
		logTurnEvent("movement", "unit_1", "player");
		logTurnEvent("combat", "unit_1", "player");

		expect(getCurrentTurnNumber()).toBe(1);

		finalizeTurn();

		expect(getCurrentTurnNumber()).toBe(2);
		expect(getCurrentTurnEvents()).toHaveLength(0);

		const completed = getCompletedTurnLogs();
		expect(completed).toHaveLength(1);
		expect(completed[0].turnNumber).toBe(1);
		expect(completed[0].events).toHaveLength(2);
	});

	it("accumulates multiple completed turns", () => {
		logTurnEvent("movement", "unit_1", "player");
		finalizeTurn();

		logTurnEvent("harvest_start", "unit_2", "player");
		logTurnEvent("harvest_complete", "unit_2", "player");
		finalizeTurn();

		logTurnEvent("combat", "unit_3", "player");
		finalizeTurn();

		const completed = getCompletedTurnLogs();
		expect(completed).toHaveLength(3);
		expect(completed[0].turnNumber).toBe(1);
		expect(completed[0].events).toHaveLength(1);
		expect(completed[1].turnNumber).toBe(2);
		expect(completed[1].events).toHaveLength(2);
		expect(completed[2].turnNumber).toBe(3);
		expect(completed[2].events).toHaveLength(1);
	});

	it("handles empty turn with no events", () => {
		finalizeTurn();

		const completed = getCompletedTurnLogs();
		expect(completed).toHaveLength(1);
		expect(completed[0].events).toHaveLength(0);
	});
});

describe("getTurnLog", () => {
	it("retrieves a specific completed turn by number", () => {
		logTurnEvent("movement", "unit_1", "player");
		finalizeTurn();

		logTurnEvent("combat", "unit_2", "player");
		finalizeTurn();

		const log = getTurnLog(1);
		expect(log).toBeDefined();
		expect(log!.turnNumber).toBe(1);
		expect(log!.events[0].type).toBe("movement");

		const log2 = getTurnLog(2);
		expect(log2).toBeDefined();
		expect(log2!.events[0].type).toBe("combat");
	});

	it("returns undefined for non-existent turn", () => {
		expect(getTurnLog(99)).toBeUndefined();
	});
});

describe("rehydrateTurnEventLog", () => {
	it("restores from persisted state", () => {
		const logs = [
			{
				turnNumber: 1,
				events: [
					{
						type: "movement" as const,
						timestamp: 1000,
						entityId: "unit_1",
						faction: "player",
						details: { toQ: 1, toR: 2 },
					},
				],
			},
			{
				turnNumber: 2,
				events: [
					{
						type: "combat" as const,
						timestamp: 2000,
						entityId: "unit_2",
						faction: "player",
						details: { action: "attack" },
					},
				],
			},
		];

		rehydrateTurnEventLog(3, logs);

		expect(getCurrentTurnNumber()).toBe(3);
		expect(getCompletedTurnLogs()).toHaveLength(2);
		expect(getCurrentTurnEvents()).toHaveLength(0);
	});
});

describe("resetTurnEventLog", () => {
	it("clears all state", () => {
		logTurnEvent("movement", "unit_1", "player");
		finalizeTurn();
		logTurnEvent("combat", "unit_2", "player");

		resetTurnEventLog();

		expect(getCurrentTurnNumber()).toBe(1);
		expect(getCurrentTurnEvents()).toHaveLength(0);
		expect(getCompletedTurnLogs()).toHaveLength(0);
	});
});

describe("event type coverage", () => {
	it("supports all defined event types", () => {
		const types = [
			"movement",
			"harvest_start",
			"harvest_complete",
			"combat",
			"hacking",
			"exploration",
			"construction",
			"fabrication",
			"repair",
			"survey",
			"establish",
			"turn_end",
			"unit_destroyed",
			"unit_captured",
			"environment",
			"ai_faction_turn",
		] as const;

		for (const type of types) {
			logTurnEvent(type, null, "test");
		}

		expect(getCurrentTurnEvents()).toHaveLength(types.length);
	});
});
