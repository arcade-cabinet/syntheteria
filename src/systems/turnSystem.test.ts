import {
	addUnitsToTurnState,
	endPlayerTurn,
	getTurnState,
	hasActionPoints,
	hasAnyPoints,
	hasMovementPoints,
	initializeTurnForUnits,
	registerAIFactionTurnHandler,
	registerEnvironmentPhaseHandler,
	resetTurnSystem,
	spendActionPoint,
	spendMovementPoints,
	subscribeTurnState,
} from "./turnSystem";

beforeEach(() => {
	resetTurnSystem();
});

describe("initializeTurnForUnits", () => {
	it("creates turn state for each unit ID", () => {
		initializeTurnForUnits(["unit_1", "unit_2", "unit_3"]);

		const state = getTurnState();
		expect(state.unitStates.size).toBe(3);
		expect(state.unitStates.has("unit_1")).toBe(true);
		expect(state.unitStates.has("unit_2")).toBe(true);
		expect(state.unitStates.has("unit_3")).toBe(true);
	});

	it("sets base AP and MP for mark level 1", () => {
		initializeTurnForUnits(["unit_1"]);

		const unit = getTurnState().unitStates.get("unit_1")!;
		expect(unit.actionPoints).toBe(2);
		expect(unit.maxActionPoints).toBe(2);
		expect(unit.movementPoints).toBe(3);
		expect(unit.maxMovementPoints).toBe(3);
	});

	it("applies mark level bonus to AP and MP", () => {
		const markLevels = new Map([["unit_1", 4]]);
		initializeTurnForUnits(["unit_1"], markLevels);

		const unit = getTurnState().unitStates.get("unit_1")!;
		// log2(4) = 2, so bonus = 2
		expect(unit.actionPoints).toBe(4);
		expect(unit.movementPoints).toBe(5);
	});

	it("sets playerHasActions to true when units exist", () => {
		initializeTurnForUnits(["unit_1"]);
		expect(getTurnState().playerHasActions).toBe(true);
	});

	it("sets playerHasActions to false when no units", () => {
		initializeTurnForUnits([]);
		expect(getTurnState().playerHasActions).toBe(false);
	});
});

describe("addUnitsToTurnState", () => {
	it("adds units without replacing existing ones", () => {
		initializeTurnForUnits(["player_1", "player_2"]);
		addUnitsToTurnState(["rival_1", "rival_2"]);

		const state = getTurnState();
		expect(state.unitStates.size).toBe(4);
		expect(state.unitStates.has("player_1")).toBe(true);
		expect(state.unitStates.has("player_2")).toBe(true);
		expect(state.unitStates.has("rival_1")).toBe(true);
		expect(state.unitStates.has("rival_2")).toBe(true);
	});

	it("sets base AP and MP for added units", () => {
		addUnitsToTurnState(["rival_1"]);

		const unit = getTurnState().unitStates.get("rival_1")!;
		expect(unit.actionPoints).toBe(2);
		expect(unit.movementPoints).toBe(3);
	});

	it("applies mark level bonus to added units", () => {
		const markLevels = new Map([["rival_1", 8]]);
		addUnitsToTurnState(["rival_1"], markLevels);

		const unit = getTurnState().unitStates.get("rival_1")!;
		// log2(8) = 3
		expect(unit.actionPoints).toBe(5);
		expect(unit.movementPoints).toBe(6);
	});

	it("preserves existing units' spent points", () => {
		initializeTurnForUnits(["player_1"]);
		spendActionPoint("player_1", 1);

		addUnitsToTurnState(["rival_1"]);

		const player = getTurnState().unitStates.get("player_1")!;
		expect(player.actionPoints).toBe(1); // still spent
		expect(player.activated).toBe(true);
	});

	it("rival units get refreshed alongside player units on new turn", () => {
		initializeTurnForUnits(["player_1"]);
		addUnitsToTurnState(["rival_1"]);
		spendActionPoint("rival_1", 1);

		endPlayerTurn();

		const rival = getTurnState().unitStates.get("rival_1")!;
		expect(rival.actionPoints).toBe(rival.maxActionPoints);
		expect(rival.movementPoints).toBe(rival.maxMovementPoints);
	});
});

describe("spendActionPoint", () => {
	it("deducts AP and returns true", () => {
		initializeTurnForUnits(["unit_1"]);
		const result = spendActionPoint("unit_1", 1);

		expect(result).toBe(true);
		expect(getTurnState().unitStates.get("unit_1")!.actionPoints).toBe(1);
	});

	it("returns false when insufficient AP", () => {
		initializeTurnForUnits(["unit_1"]);
		spendActionPoint("unit_1", 1);
		spendActionPoint("unit_1", 1);

		const result = spendActionPoint("unit_1", 1);
		expect(result).toBe(false);
	});

	it("returns false for unknown entity", () => {
		const result = spendActionPoint("nonexistent", 1);
		expect(result).toBe(false);
	});

	it("marks unit as activated", () => {
		initializeTurnForUnits(["unit_1"]);
		expect(getTurnState().unitStates.get("unit_1")!.activated).toBe(false);

		spendActionPoint("unit_1", 1);
		expect(getTurnState().unitStates.get("unit_1")!.activated).toBe(true);
	});

	it("updates playerHasActions when all units exhausted", () => {
		initializeTurnForUnits(["unit_1"]);
		spendActionPoint("unit_1", 1);
		spendActionPoint("unit_1", 1);

		// Still has movement points
		expect(getTurnState().playerHasActions).toBe(true);

		// Exhaust MP too
		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);
		expect(getTurnState().playerHasActions).toBe(false);
	});
});

describe("spendMovementPoints", () => {
	it("deducts MP and returns true", () => {
		initializeTurnForUnits(["unit_1"]);
		const result = spendMovementPoints("unit_1", 1);

		expect(result).toBe(true);
		expect(getTurnState().unitStates.get("unit_1")!.movementPoints).toBe(2);
	});

	it("returns false when insufficient MP", () => {
		initializeTurnForUnits(["unit_1"]);
		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);

		const result = spendMovementPoints("unit_1", 1);
		expect(result).toBe(false);
	});
});

describe("hasActionPoints / hasMovementPoints / hasAnyPoints", () => {
	it("returns true when points available", () => {
		initializeTurnForUnits(["unit_1"]);
		expect(hasActionPoints("unit_1")).toBe(true);
		expect(hasMovementPoints("unit_1")).toBe(true);
		expect(hasAnyPoints("unit_1")).toBe(true);
	});

	it("returns false after all points spent", () => {
		initializeTurnForUnits(["unit_1"]);
		spendActionPoint("unit_1", 1);
		spendActionPoint("unit_1", 1);
		expect(hasActionPoints("unit_1")).toBe(false);
		expect(hasAnyPoints("unit_1")).toBe(true); // still has MP

		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);
		spendMovementPoints("unit_1", 1);
		expect(hasMovementPoints("unit_1")).toBe(false);
		expect(hasAnyPoints("unit_1")).toBe(false);
	});

	it("returns false for unknown entity", () => {
		expect(hasActionPoints("unknown")).toBe(false);
		expect(hasMovementPoints("unknown")).toBe(false);
		expect(hasAnyPoints("unknown")).toBe(false);
	});
});

describe("endPlayerTurn", () => {
	it("cycles through AI factions then environment then new turn", () => {
		initializeTurnForUnits(["unit_1"]);
		const phases: string[] = [];
		const factions: string[] = [];

		subscribeTurnState(() => {
			phases.push(getTurnState().phase);
			factions.push(getTurnState().activeFaction);
		});

		endPlayerTurn();

		// Should have gone through: ai_faction (x4 factions), environment, player
		expect(phases).toContain("ai_faction");
		expect(phases).toContain("environment");
		expect(phases[phases.length - 1]).toBe("player");
		expect(factions).toContain("reclaimers");
		expect(factions).toContain("volt_collective");
		expect(factions).toContain("signal_choir");
		expect(factions).toContain("iron_creed");
		expect(factions).toContain("environment");
	});

	it("increments turn number", () => {
		initializeTurnForUnits(["unit_1"]);
		expect(getTurnState().turnNumber).toBe(1);

		endPlayerTurn();
		expect(getTurnState().turnNumber).toBe(2);

		endPlayerTurn();
		expect(getTurnState().turnNumber).toBe(3);
	});

	it("refreshes AP and MP on new turn", () => {
		initializeTurnForUnits(["unit_1"]);
		spendActionPoint("unit_1", 1);
		spendMovementPoints("unit_1", 2);

		endPlayerTurn();

		const unit = getTurnState().unitStates.get("unit_1")!;
		expect(unit.actionPoints).toBe(unit.maxActionPoints);
		expect(unit.movementPoints).toBe(unit.maxMovementPoints);
		expect(unit.activated).toBe(false);
	});

	it("does nothing if not in player phase", () => {
		initializeTurnForUnits(["unit_1"]);
		endPlayerTurn(); // turn 1 -> turn 2

		// Now in player phase of turn 2. End again.
		endPlayerTurn(); // turn 2 -> turn 3
		expect(getTurnState().turnNumber).toBe(3);
	});

	it("calls AI faction turn handlers for each faction", () => {
		const calls: string[] = [];
		registerAIFactionTurnHandler((factionId) => {
			calls.push(factionId);
		});

		initializeTurnForUnits(["unit_1"]);
		endPlayerTurn();

		expect(calls).toEqual([
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		]);
	});

	it("calls environment phase handlers", () => {
		let called = false;
		let turnNum = 0;
		registerEnvironmentPhaseHandler((turnNumber) => {
			called = true;
			turnNum = turnNumber;
		});

		initializeTurnForUnits(["unit_1"]);
		endPlayerTurn();

		expect(called).toBe(true);
		expect(turnNum).toBe(1);
	});
});

describe("subscribeTurnState", () => {
	it("notifies on state changes", () => {
		let notifyCount = 0;
		const unsub = subscribeTurnState(() => {
			notifyCount++;
		});

		initializeTurnForUnits(["unit_1"]);
		expect(notifyCount).toBe(1);

		spendActionPoint("unit_1", 1);
		expect(notifyCount).toBe(2);

		unsub();
		spendActionPoint("unit_1", 1);
		expect(notifyCount).toBe(2); // no change after unsub
	});
});

describe("resetTurnSystem", () => {
	it("resets to initial state", () => {
		initializeTurnForUnits(["unit_1", "unit_2"]);
		spendActionPoint("unit_1", 1);
		endPlayerTurn();

		resetTurnSystem();

		const state = getTurnState();
		expect(state.turnNumber).toBe(1);
		expect(state.phase).toBe("player");
		expect(state.activeFaction).toBe("player");
		expect(state.unitStates.size).toBe(0);
		expect(state.playerHasActions).toBe(true);
	});
});
