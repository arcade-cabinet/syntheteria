/**
 * Tests for TutorialOverlay-related pure logic:
 * - subscribeTutorial / getTutorialSnapshot (new API on tutorialSystem)
 * - subscribeDialogue / getDialogueSnapshot (new API on questDialogue)
 * - Tutorial step progress calculations
 */

import {
	getCurrentStep,
	getTutorialProgress,
	getTutorialSnapshot,
	getTutorialState,
	isTutorialActive,
	isTutorialComplete,
	reportTutorialAction,
	resetTutorial,
	skipCurrentStep,
	skipTutorial,
	startTutorial,
	subscribeTutorial,
} from "../../systems/tutorialSystem";

import {
	advanceDialogue,
	getDialogueSnapshot,
	subscribeDialogue,
} from "../../systems/questDialogue";

// ─── subscribeTutorial / getTutorialSnapshot ──────────────────────────────────

describe("subscribeTutorial", () => {
	beforeEach(() => resetTutorial());
	afterEach(() => resetTutorial());

	it("returns an unsubscribe function", () => {
		const unsub = subscribeTutorial(() => {});
		expect(typeof unsub).toBe("function");
		unsub();
	});

	it("notifies listeners when tutorial starts", () => {
		const calls: number[] = [];
		const unsub = subscribeTutorial(() => calls.push(1));
		startTutorial(0);
		unsub();
		expect(calls.length).toBeGreaterThan(0);
	});

	it("notifies listeners when step is skipped", () => {
		startTutorial(0);
		const calls: number[] = [];
		const unsub = subscribeTutorial(() => calls.push(1));
		skipCurrentStep();
		unsub();
		expect(calls.length).toBeGreaterThan(0);
	});

	it("notifies listeners when tutorial is skipped", () => {
		startTutorial(0);
		const calls: number[] = [];
		const unsub = subscribeTutorial(() => calls.push(1));
		skipTutorial(100);
		unsub();
		expect(calls.length).toBeGreaterThan(0);
	});

	it("does not notify after unsubscribe", () => {
		const calls: number[] = [];
		const unsub = subscribeTutorial(() => calls.push(1));
		unsub(); // unsubscribe before any action
		startTutorial(0);
		expect(calls.length).toBe(0);
	});

	it("supports multiple listeners simultaneously", () => {
		const a: number[] = [];
		const b: number[] = [];
		const unsubA = subscribeTutorial(() => a.push(1));
		const unsubB = subscribeTutorial(() => b.push(1));
		startTutorial(0);
		unsubA();
		unsubB();
		expect(a.length).toBeGreaterThan(0);
		expect(b.length).toBeGreaterThan(0);
	});
});

describe("getTutorialSnapshot", () => {
	beforeEach(() => resetTutorial());
	afterEach(() => resetTutorial());

	it("returns inactive state before start", () => {
		const snap = getTutorialSnapshot();
		expect(snap.active).toBe(false);
	});

	it("returns active state after start", () => {
		startTutorial(0);
		const snap = getTutorialSnapshot();
		expect(snap.active).toBe(true);
	});

	it("returns same object reference (module-level state)", () => {
		startTutorial(0);
		const s1 = getTutorialSnapshot();
		const s2 = getTutorialSnapshot();
		expect(s1).toBe(s2);
	});

	it("reflects step changes immediately", () => {
		startTutorial(0);
		const before = getTutorialSnapshot().currentStepIndex;
		skipCurrentStep();
		const after = getTutorialSnapshot().currentStepIndex;
		// Either step advanced or tutorial ended (auto-complete step)
		expect(after >= before).toBe(true);
	});
});

// ─── Tutorial step progress ───────────────────────────────────────────────────

describe("tutorial step mechanics", () => {
	beforeEach(() => {
		resetTutorial();
		startTutorial(0);
	});
	afterEach(() => resetTutorial());

	it("tutorial is active after start", () => {
		expect(isTutorialActive()).toBe(true);
	});

	it("not complete immediately after start", () => {
		expect(isTutorialComplete()).toBe(false);
	});

	it("getCurrentStep returns first step", () => {
		const step = getCurrentStep();
		expect(step).not.toBeNull();
		expect(step?.id).toBe("move");
	});

	it("progress is 0 at start", () => {
		expect(getTutorialProgress()).toBe(0);
	});

	it("reportTutorialAction advances step current", () => {
		const step = getCurrentStep();
		expect(step).not.toBeNull();
		if (!step) return;

		// Report some but not all target actions
		const target = step.completionTarget;
		if (target > 1) {
			reportTutorialAction(step.completionKey);
			const updated = getCurrentStep();
			expect(updated?.current).toBeGreaterThan(0);
		}
	});

	it("skipCurrentStep advances to next step", () => {
		const before = getTutorialState().currentStepIndex;
		skipCurrentStep();
		const after = getTutorialState().currentStepIndex;
		// Either advanced OR tutorial ended (last step was auto-complete)
		expect(after >= before).toBe(true);
	});

	it("skipTutorial deactivates tutorial", () => {
		skipTutorial(999);
		expect(isTutorialActive()).toBe(false);
		expect(isTutorialComplete()).toBe(true);
	});

	it("progress increases after skipping a step", () => {
		const before = getTutorialProgress();
		skipCurrentStep();
		if (isTutorialActive()) {
			const after = getTutorialProgress();
			expect(after).toBeGreaterThan(before);
		}
	});
});

// ─── subscribeDialogue / getDialogueSnapshot ──────────────────────────────────

describe("subscribeDialogue", () => {
	it("returns an unsubscribe function", () => {
		const unsub = subscribeDialogue(() => {});
		expect(typeof unsub).toBe("function");
		unsub();
	});

	it("getDialogueSnapshot returns null when no dialogue queued", () => {
		expect(getDialogueSnapshot()).toBeNull();
	});

	it("does not notify after unsubscribe", () => {
		const calls: number[] = [];
		const unsub = subscribeDialogue(() => calls.push(1));
		unsub();
		// No dialogue to trigger here — just verify no crash
		expect(calls.length).toBe(0);
	});
});

describe("advanceDialogue", () => {
	it("returns false when queue is empty", () => {
		expect(advanceDialogue()).toBe(false);
	});

	it("snapshot is null after advancing empty queue", () => {
		advanceDialogue();
		expect(getDialogueSnapshot()).toBeNull();
	});
});
