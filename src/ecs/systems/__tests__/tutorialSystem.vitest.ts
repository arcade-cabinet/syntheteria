import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetTutorial,
	completeCurrentStep,
	getAllSteps,
	getCurrentStep,
	getTutorialState,
	isStepCompleted,
	skipTutorial,
	subscribeTutorial,
} from "../tutorialSystem";

beforeEach(() => {
	_resetTutorial();
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
		const step = getCurrentStep(1);
		expect(step).not.toBeNull();
		expect(step!.id).toBe("select_technician");
		expect(step!.instruction).toContain("Field Technician");
	});

	it("advances to next step on complete", () => {
		completeCurrentStep();
		const state = getTutorialState();
		expect(state.currentStepIndex).toBe(1);
		expect(state.completedSteps).toContain("select_technician");

		const step = getCurrentStep(1);
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
		// Step 2 is turn 2, but we pass turn 1
		const step = getCurrentStep(1);
		expect(step).toBeNull();
	});

	it("shows turn 2 steps when turn advances", () => {
		completeCurrentStep(); // step 0 (turn 1)
		completeCurrentStep(); // step 1 (turn 1)

		// Now pass turn 2
		const step = getCurrentStep(2);
		expect(step).not.toBeNull();
		expect(step!.id).toBe("build_lightning_rod");
		expect(step!.turnNumber).toBe(2);
	});

	it("skips the tutorial", () => {
		skipTutorial();
		const state = getTutorialState();
		expect(state.active).toBe(false);
		expect(state.skipped).toBe(true);
		expect(getCurrentStep(1)).toBeNull();
	});

	it("deactivates when all steps completed", () => {
		const allSteps = getAllSteps();

		for (let i = 0; i < allSteps.length; i++) {
			completeCurrentStep();
		}

		const state = getTutorialState();
		expect(state.active).toBe(false);
		expect(state.completedSteps).toHaveLength(allSteps.length);
	});

	it("notifies listeners on state change", () => {
		const listener = vi.fn();
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
		expect(steps[0]!.id).toBe("select_technician");
	});

	it("does nothing when completing steps after deactivation", () => {
		skipTutorial();
		const listener = vi.fn();
		const unsub = subscribeTutorial(listener);

		completeCurrentStep();
		expect(listener).not.toHaveBeenCalled();

		unsub();
	});
});
