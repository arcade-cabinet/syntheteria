jest.mock("./turnSystem", () => ({
	getTurnState: jest.fn(() => ({
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
		unitStates: new Map(),
		playerHasActions: true,
	})),
}));

import { getTurnState } from "./turnSystem";
import {
	_reset,
	completeCurrentStep,
	getAllSteps,
	getCurrentStep,
	getTutorialState,
	isStepCompleted,
	skipTutorial,
	subscribeTutorial,
} from "./tutorialSystem";

const mockGetTurnState = getTurnState as jest.Mock;

beforeEach(() => {
	_reset();
	mockGetTurnState.mockReturnValue({
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
		unitStates: new Map(),
		playerHasActions: true,
	});
});

describe("tutorialSystem", () => {
	it("starts active with first step", () => {
		const state = getTutorialState();
		expect(state.active).toBe(true);
		expect(state.skipped).toBe(false);
		expect(state.currentStepIndex).toBe(0);
		expect(state.completedSteps).toHaveLength(0);
	});

	it("returns the first step as current", () => {
		const step = getCurrentStep();
		expect(step).not.toBeNull();
		expect(step!.id).toBe("select_technician");
		expect(step!.instruction).toContain("Field Technician");
	});

	it("advances to next step on complete", () => {
		completeCurrentStep();
		const state = getTutorialState();
		expect(state.currentStepIndex).toBe(1);
		expect(state.completedSteps).toContain("select_technician");

		const step = getCurrentStep();
		expect(step!.id).toBe("harvest_structure");
	});

	it("marks steps as completed", () => {
		completeCurrentStep();
		expect(isStepCompleted("select_technician")).toBe(true);
		expect(isStepCompleted("harvest_structure")).toBe(false);
	});

	it("does not show steps for future turns", () => {
		// Turn 1 has steps 0 and 1
		// Turn 2 has steps 2 and 3
		completeCurrentStep(); // complete step 0
		completeCurrentStep(); // complete step 1
		// Step 2 is turn 2, but we're on turn 1
		const step = getCurrentStep();
		expect(step).toBeNull();
	});

	it("shows turn 2 steps when turn advances", () => {
		completeCurrentStep(); // step 0 (turn 1)
		completeCurrentStep(); // step 1 (turn 1)

		// Advance to turn 2
		mockGetTurnState.mockReturnValue({
			turnNumber: 2,
			phase: "player",
			activeFaction: "player",
			unitStates: new Map(),
			playerHasActions: true,
		});

		const step = getCurrentStep();
		expect(step).not.toBeNull();
		expect(step!.id).toBe("build_lightning_rod");
		expect(step!.turnNumber).toBe(2);
	});

	it("skips the tutorial", () => {
		skipTutorial();
		const state = getTutorialState();
		expect(state.active).toBe(false);
		expect(state.skipped).toBe(true);
		expect(getCurrentStep()).toBeNull();
	});

	it("deactivates when all steps completed", () => {
		const allSteps = getAllSteps();
		// Set turn to max
		mockGetTurnState.mockReturnValue({
			turnNumber: 99,
			phase: "player",
			activeFaction: "player",
			unitStates: new Map(),
			playerHasActions: true,
		});

		for (let i = 0; i < allSteps.length; i++) {
			completeCurrentStep();
		}

		const state = getTutorialState();
		expect(state.active).toBe(false);
		expect(state.completedSteps).toHaveLength(allSteps.length);
	});

	it("notifies listeners on state change", () => {
		const listener = jest.fn();
		const unsub = subscribeTutorial(listener);

		completeCurrentStep();
		expect(listener).toHaveBeenCalledTimes(1);

		skipTutorial();
		expect(listener).toHaveBeenCalledTimes(2);

		unsub();
	});

	it("getAllSteps returns all defined steps", () => {
		const steps = getAllSteps();
		expect(steps.length).toBeGreaterThanOrEqual(5);
		expect(steps[0].id).toBe("select_technician");
	});

	it("does nothing when completing steps after deactivation", () => {
		skipTutorial();
		const listener = jest.fn();
		const unsub = subscribeTutorial(listener);

		completeCurrentStep();
		expect(listener).not.toHaveBeenCalled();

		unsub();
	});
});
