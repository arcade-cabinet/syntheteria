import {
	_resetTurnPhaseEvents,
	detectPhaseTransition,
	subscribeTurnEvents,
	type TurnEvent,
} from "./turnPhaseEvents";

beforeEach(() => {
	_resetTurnPhaseEvents();
});

describe("subscribeTurnEvents", () => {
	it("notifies listeners on events", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");

		expect(events.length).toBe(1);
		expect(events[0].type).toBe("phase_change");
	});

	it("unsubscribe stops notifications", () => {
		const events: TurnEvent[] = [];
		const unsub = subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		expect(events.length).toBe(1);

		unsub();
		detectPhaseTransition("ai_faction", 1, "reclaimers");
		expect(events.length).toBe(1); // no new event
	});
});

describe("detectPhaseTransition", () => {
	it("emits phase_change on phase transition", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		// Initial state
		detectPhaseTransition("player", 1, "player");
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("phase_change");

		const phaseChange = events[0] as Extract<TurnEvent, { type: "phase_change" }>;
		expect(phaseChange.fromPhase).toBeNull(); // first call
		expect(phaseChange.toPhase).toBe("player");
	});

	it("emits phase_change when phase changes", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		events.length = 0; // clear initial

		detectPhaseTransition("ai_faction", 1, "reclaimers");
		expect(events.length).toBe(1);

		const event = events[0] as Extract<TurnEvent, { type: "phase_change" }>;
		expect(event.fromPhase).toBe("player");
		expect(event.toPhase).toBe("ai_faction");
		expect(event.activeFaction).toBe("reclaimers");
	});

	it("emits phase_change on faction change within ai_faction phase", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		detectPhaseTransition("ai_faction", 1, "reclaimers");
		events.length = 0;

		detectPhaseTransition("ai_faction", 1, "volt_collective");
		expect(events.length).toBe(1);

		const event = events[0] as Extract<TurnEvent, { type: "phase_change" }>;
		expect(event.toPhase).toBe("ai_faction");
		expect(event.activeFaction).toBe("volt_collective");
	});

	it("emits turn_end and new_turn on turn number change", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		events.length = 0;

		detectPhaseTransition("player", 2, "player");

		const types = events.map((e) => e.type);
		expect(types).toContain("turn_end");
		expect(types).toContain("new_turn");

		const turnEnd = events.find((e) => e.type === "turn_end") as Extract<
			TurnEvent,
			{ type: "turn_end" }
		>;
		expect(turnEnd.turnNumber).toBe(1);

		const newTurn = events.find((e) => e.type === "new_turn") as Extract<
			TurnEvent,
			{ type: "new_turn" }
		>;
		expect(newTurn.turnNumber).toBe(2);
	});

	it("does not emit duplicate phase_change for same state", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		const count1 = events.length;

		detectPhaseTransition("player", 1, "player");
		expect(events.length).toBe(count1); // no duplicate
	});

	it("sets activeFaction to null for non-ai phases", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");

		const event = events[0] as Extract<TurnEvent, { type: "phase_change" }>;
		expect(event.activeFaction).toBeNull();
	});

	it("sets activeFaction for ai_faction phase", () => {
		const events: TurnEvent[] = [];
		subscribeTurnEvents((e) => events.push(e));

		detectPhaseTransition("player", 1, "player");
		events.length = 0;

		detectPhaseTransition("ai_faction", 1, "signal_choir");

		const event = events[0] as Extract<TurnEvent, { type: "phase_change" }>;
		expect(event.activeFaction).toBe("signal_choir");
	});
});
