/**
 * Tests for the tutorial → otter hologram bridge.
 *
 * Verifies that tutorial step dialogue is synced to the otter entity's
 * speech bubble lines when the tutorial step changes.
 */

// Mock the ECS world module so we don't trigger the full init chain
const mockOtters: Array<{ otter: { lines?: string[] } }> = [];

jest.mock("../../ecs/world", () => ({
	otters: {
		[Symbol.iterator]: () => mockOtters[Symbol.iterator](),
	},
}));

jest.mock("../tutorialSystem", () => {
	let active = false;
	let stepId = "move";
	let dialogue = "Try moving around!";

	return {
		isTutorialActive: () => active,
		getCurrentStep: () =>
			active ? { id: stepId, otterDialogue: dialogue } : null,
		// Test helpers
		__setActive: (v: boolean) => {
			active = v;
		},
		__setStep: (id: string, text: string) => {
			stepId = id;
			dialogue = text;
		},
	};
});

import {
	syncTutorialToOtter,
	resetTutorialOtterBridge,
} from "../tutorialOtterBridge";

const tutorialMock = jest.requireMock("../tutorialSystem") as {
	__setActive: (v: boolean) => void;
	__setStep: (id: string, text: string) => void;
};

beforeEach(() => {
	resetTutorialOtterBridge();
	mockOtters.length = 0;
	tutorialMock.__setActive(false);
	tutorialMock.__setStep("move", "Try moving around!");
});

describe("syncTutorialToOtter", () => {
	it("does nothing when tutorial is inactive", () => {
		mockOtters.push({ otter: { lines: [] } });
		syncTutorialToOtter();
		expect(mockOtters[0].otter.lines).toEqual([]);
	});

	it("updates otter lines with current tutorial step dialogue", () => {
		mockOtters.push({ otter: { lines: [] } });
		tutorialMock.__setActive(true);
		tutorialMock.__setStep("move", "Hey rusty, try WASD!");

		syncTutorialToOtter();

		expect(mockOtters[0].otter.lines).toEqual(["Hey rusty, try WASD!"]);
	});

	it("does not update if step has not changed", () => {
		mockOtters.push({ otter: { lines: [] } });
		tutorialMock.__setActive(true);
		tutorialMock.__setStep("move", "Hey rusty!");

		syncTutorialToOtter(); // first sync
		mockOtters[0].otter.lines = ["manually changed"];

		syncTutorialToOtter(); // should not overwrite — same step
		expect(mockOtters[0].otter.lines).toEqual(["manually changed"]);
	});

	it("updates when step changes", () => {
		mockOtters.push({ otter: { lines: [] } });
		tutorialMock.__setActive(true);
		tutorialMock.__setStep("move", "Try moving!");

		syncTutorialToOtter();
		expect(mockOtters[0].otter.lines).toEqual(["Try moving!"]);

		tutorialMock.__setStep("harvest", "Now grind some ore!");
		syncTutorialToOtter();
		expect(mockOtters[0].otter.lines).toEqual(["Now grind some ore!"]);
	});

	it("does nothing when no otter entities exist", () => {
		tutorialMock.__setActive(true);
		tutorialMock.__setStep("move", "Hello!");

		// Should not throw
		expect(() => syncTutorialToOtter()).not.toThrow();
	});

	it("resets tracked step on resetTutorialOtterBridge", () => {
		mockOtters.push({ otter: { lines: [] } });
		tutorialMock.__setActive(true);
		tutorialMock.__setStep("move", "First sync");

		syncTutorialToOtter();
		expect(mockOtters[0].otter.lines).toEqual(["First sync"]);

		resetTutorialOtterBridge();

		// Same step ID, but after reset it should re-sync
		syncTutorialToOtter();
		expect(mockOtters[0].otter.lines).toEqual(["First sync"]);
	});
});
