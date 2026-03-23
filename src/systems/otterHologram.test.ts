import {
	dismissHologram,
	getActiveHologramMessage,
	getDisplayProgress,
	getHologramVisuals,
	hasTriggered,
	isHologramActive,
	resetOtterHologram,
	tickHologram,
	triggerHologram,
} from "./otterHologram";

beforeEach(() => {
	resetOtterHologram();
});

describe("trigger system", () => {
	test("triggering shows a message", () => {
		triggerHologram("first_turn");
		expect(isHologramActive()).toBe(true);
		const msg = getActiveHologramMessage();
		expect(msg).not.toBeNull();
		expect(msg!.title).toBe("Patron Contact");
		expect(msg!.trigger).toBe("first_turn");
	});

	test("each trigger fires at most once", () => {
		triggerHologram("first_turn");
		dismissHologram();
		triggerHologram("first_turn");
		expect(isHologramActive()).toBe(false);
		expect(hasTriggered("first_turn")).toBe(true);
	});

	test("hasTriggered tracks fired triggers", () => {
		expect(hasTriggered("first_turn")).toBe(false);
		triggerHologram("first_turn");
		expect(hasTriggered("first_turn")).toBe(true);
	});
});

describe("message priority", () => {
	test("higher priority preempts current message", () => {
		triggerHologram("storm_surge"); // priority 6
		expect(getActiveHologramMessage()!.trigger).toBe("storm_surge");

		triggerHologram("first_turn"); // priority 10 — should preempt
		expect(getActiveHologramMessage()!.trigger).toBe("first_turn");
	});

	test("lower priority queues behind current", () => {
		triggerHologram("first_turn"); // priority 10
		triggerHologram("storm_surge"); // priority 6 — should queue

		expect(getActiveHologramMessage()!.trigger).toBe("first_turn");
		dismissHologram();
		expect(getActiveHologramMessage()!.trigger).toBe("storm_surge");
	});
});

describe("dismissal", () => {
	test("dismissHologram clears active message", () => {
		triggerHologram("first_turn");
		dismissHologram();
		expect(isHologramActive()).toBe(false);
	});

	test("dismissHologram shows next queued message", () => {
		triggerHologram("first_turn");
		triggerHologram("first_harvest");
		dismissHologram();
		const msg = getActiveHologramMessage();
		expect(msg).not.toBeNull();
		expect(msg!.trigger).toBe("first_harvest");
	});
});

describe("auto-dismiss timer", () => {
	test("tickHologram auto-dismisses after duration", () => {
		triggerHologram("first_turn");
		expect(isHologramActive()).toBe(true);

		// Tick past the display duration
		tickHologram(10);
		expect(isHologramActive()).toBe(false);
	});

	test("getDisplayProgress decreases over time", () => {
		triggerHologram("first_turn");
		expect(getDisplayProgress()).toBeCloseTo(1, 0);

		tickHologram(4);
		const progress = getDisplayProgress();
		expect(progress).toBeLessThan(1);
		expect(progress).toBeGreaterThan(0);
	});
});

describe("visual config", () => {
	test("getHologramVisuals returns expected properties", () => {
		const visuals = getHologramVisuals();
		expect(visuals.color).toHaveLength(3);
		expect(visuals.scanlineSpeed).toBeGreaterThan(0);
		expect(visuals.flickerRate).toBeGreaterThan(0);
		expect(visuals.displayDuration).toBeGreaterThan(0);
	});
});

describe("reset", () => {
	test("resetOtterHologram clears all state", () => {
		triggerHologram("first_turn");
		triggerHologram("first_harvest");
		resetOtterHologram();

		expect(isHologramActive()).toBe(false);
		expect(hasTriggered("first_turn")).toBe(false);
	});
});
