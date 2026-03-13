import {
	finalizeTurn,
	getCompletedTurnLogs,
	getCurrentTurnEvents,
	getCurrentTurnNumber,
	getTurnLog,
	logTurnEvent,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "../turnEventLog";

describe("turnEventLog", () => {
	beforeEach(() => {
		resetTurnEventLog();
	});

	it("starts at turn 1 with no events", () => {
		expect(getCurrentTurnNumber()).toBe(1);
		expect(getCurrentTurnEvents()).toHaveLength(0);
		expect(getCompletedTurnLogs()).toHaveLength(0);
	});

	it("logs events for the current turn", () => {
		logTurnEvent("movement", "unit_0", "player", { from: { q: 0, r: 0 } });
		logTurnEvent("harvest_start", "unit_1", "player", { structureId: 42 });

		expect(getCurrentTurnEvents()).toHaveLength(2);
		expect(getCurrentTurnEvents()[0].type).toBe("movement");
		expect(getCurrentTurnEvents()[1].entityId).toBe("unit_1");
	});

	it("finalizes a turn and starts the next", () => {
		logTurnEvent("movement", "unit_0", "player");
		finalizeTurn();

		expect(getCurrentTurnNumber()).toBe(2);
		expect(getCurrentTurnEvents()).toHaveLength(0);
		expect(getCompletedTurnLogs()).toHaveLength(1);
		expect(getCompletedTurnLogs()[0].turnNumber).toBe(1);
		expect(getCompletedTurnLogs()[0].events).toHaveLength(1);
	});

	it("retrieves a specific turn log by number", () => {
		logTurnEvent("movement", "unit_0", "player");
		finalizeTurn();
		logTurnEvent("combat", "unit_1", "rogue");
		finalizeTurn();

		const turn1 = getTurnLog(1);
		expect(turn1).toBeDefined();
		expect(turn1!.events[0].type).toBe("movement");

		const turn2 = getTurnLog(2);
		expect(turn2).toBeDefined();
		expect(turn2!.events[0].type).toBe("combat");

		expect(getTurnLog(3)).toBeUndefined();
	});

	it("rehydrates from persisted state", () => {
		const logs = [
			{
				turnNumber: 1,
				events: [
					{
						type: "movement" as const,
						timestamp: 1000,
						entityId: "unit_0",
						faction: "player",
						details: {},
					},
				],
			},
			{
				turnNumber: 2,
				events: [
					{
						type: "combat" as const,
						timestamp: 2000,
						entityId: "unit_1",
						faction: "rogue",
						details: { damage: 5 },
					},
				],
			},
		];

		rehydrateTurnEventLog(3, logs);

		expect(getCurrentTurnNumber()).toBe(3);
		expect(getCurrentTurnEvents()).toHaveLength(0);
		expect(getCompletedTurnLogs()).toHaveLength(2);
		expect(getTurnLog(1)!.events[0].entityId).toBe("unit_0");
	});
});
