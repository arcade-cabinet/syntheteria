/**
 * Tests for the tutorial system.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	startTutorial,
	getTutorialState,
	getCurrentStep,
	reportTutorialAction,
	skipCurrentStep,
	skipTutorial,
	isTutorialComplete,
	isTutorialActive,
	getTutorialProgress,
	resetTutorial,
} from "../tutorialSystem";

beforeEach(() => {
	resetTutorial();
});

// ---------------------------------------------------------------------------
// Tutorial lifecycle
// ---------------------------------------------------------------------------

describe("tutorial lifecycle", () => {
	it("starts inactive", () => {
		expect(isTutorialActive()).toBe(false);
		expect(getCurrentStep()).toBeNull();
	});

	it("activates on start", () => {
		startTutorial(100);
		expect(isTutorialActive()).toBe(true);
		expect(getTutorialState().startedAt).toBe(100);
	});

	it("first step is movement", () => {
		startTutorial();
		const step = getCurrentStep();
		expect(step).not.toBeNull();
		expect(step!.id).toBe("move");
	});

	it("has 10 tutorial steps", () => {
		startTutorial();
		expect(getTutorialState().steps).toHaveLength(10);
	});
});

// ---------------------------------------------------------------------------
// Action reporting
// ---------------------------------------------------------------------------

describe("action reporting", () => {
	it("advances progress on matching action", () => {
		startTutorial();
		reportTutorialAction("move", 3);

		const step = getCurrentStep();
		expect(step!.current).toBe(3);
	});

	it("ignores non-matching actions", () => {
		startTutorial();
		const result = reportTutorialAction("craft");
		expect(result).toBe(false);

		const step = getCurrentStep();
		expect(step!.current).toBe(0);
	});

	it("completes step at target", () => {
		startTutorial();
		reportTutorialAction("move", 10);

		// Should advance to next step
		const step = getCurrentStep();
		expect(step!.id).toBe("look");
	});

	it("caps progress at target", () => {
		startTutorial();
		reportTutorialAction("move", 100);

		const state = getTutorialState();
		const moveStep = state.steps[0];
		expect(moveStep.current).toBe(moveStep.completionTarget);
		expect(moveStep.completed).toBe(true);
	});

	it("does nothing when tutorial inactive", () => {
		const result = reportTutorialAction("move");
		expect(result).toBe(false);
	});

	it("progresses through multiple steps", () => {
		startTutorial();

		reportTutorialAction("move", 10); // complete move
		reportTutorialAction("look", 5); // complete look
		reportTutorialAction("harvest", 1); // complete harvest

		const step = getCurrentStep();
		expect(step!.id).toBe("compress");
	});
});

// ---------------------------------------------------------------------------
// Skipping
// ---------------------------------------------------------------------------

describe("skipping", () => {
	it("skipCurrentStep advances to next", () => {
		startTutorial();
		skipCurrentStep();

		const step = getCurrentStep();
		expect(step!.id).toBe("look");
	});

	it("skipped step is marked", () => {
		startTutorial();
		skipCurrentStep();

		const state = getTutorialState();
		expect(state.steps[0].skipped).toBe(true);
		expect(state.steps[0].completed).toBe(true);
	});

	it("skip does nothing when inactive", () => {
		expect(skipCurrentStep()).toBe(false);
	});

	it("skipTutorial ends tutorial immediately", () => {
		startTutorial();
		skipTutorial(500);

		expect(isTutorialActive()).toBe(false);
		expect(isTutorialComplete()).toBe(true);
	});

	it("skipTutorial marks remaining steps as skipped", () => {
		startTutorial();
		reportTutorialAction("move", 10); // complete first step
		skipTutorial();

		const state = getTutorialState();
		expect(state.steps[0].skipped).toBe(false); // completed normally
		expect(state.steps[1].skipped).toBe(true); // remaining are skipped
		expect(state.steps[5].skipped).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

describe("completion", () => {
	it("tutorial completes after all steps", () => {
		startTutorial();
		const actions = [
			["move", 10],
			["look", 5],
			["harvest", 1],
			["compress", 1],
			["grab_cube", 1],
			["furnace_feed", 1],
			["craft", 1],
			["any_building", 1],
			["outpost", 1],
		] as const;

		for (const [key, amount] of actions) {
			reportTutorialAction(key, amount);
		}

		// The last step "complete" auto-completes
		expect(isTutorialComplete()).toBe(true);
		expect(isTutorialActive()).toBe(false);
	});

	it("progress percentage updates", () => {
		startTutorial();
		expect(getTutorialProgress()).toBe(0);

		reportTutorialAction("move", 10);
		expect(getTutorialProgress()).toBe(10); // 1/10

		reportTutorialAction("look", 5);
		expect(getTutorialProgress()).toBe(20); // 2/10
	});

	it("100% progress on completion", () => {
		startTutorial();
		// Skip all steps
		for (let i = 0; i < 10; i++) {
			skipCurrentStep();
		}
		expect(getTutorialProgress()).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// State immutability
// ---------------------------------------------------------------------------

describe("state immutability", () => {
	it("getTutorialState returns copy", () => {
		startTutorial();
		const state1 = getTutorialState();
		const state2 = getTutorialState();
		expect(state1).not.toBe(state2);
		expect(state1.steps).not.toBe(state2.steps);
	});

	it("getCurrentStep returns copy", () => {
		startTutorial();
		const step1 = getCurrentStep();
		const step2 = getCurrentStep();
		expect(step1).not.toBe(step2);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all tutorial state", () => {
		startTutorial();
		reportTutorialAction("move", 10);
		reportTutorialAction("look", 5);

		resetTutorial();

		expect(isTutorialActive()).toBe(false);
		expect(isTutorialComplete()).toBe(false);
		expect(getTutorialProgress()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Step data quality
// ---------------------------------------------------------------------------

describe("step data quality", () => {
	it("all steps have required fields", () => {
		startTutorial();
		const steps = getTutorialState().steps;

		for (const step of steps) {
			expect(step.id).toBeDefined();
			expect(step.title.length).toBeGreaterThan(0);
			expect(step.instruction.length).toBeGreaterThan(0);
			expect(step.otterDialogue.length).toBeGreaterThan(0);
			expect(step.completionTarget).toBeGreaterThan(0);
		}
	});

	it("step IDs are unique", () => {
		startTutorial();
		const ids = getTutorialState().steps.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
