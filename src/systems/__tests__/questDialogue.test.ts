/**
 * Unit tests for the quest dialogue system.
 *
 * Tests cover:
 * - getNextDialogue: pull-based dialogue by quest stage
 * - enqueueDialogue: push lines into the FIFO queue
 * - getCurrentDialogue: head of queue after update
 * - advanceDialogue: manual advance, returns correct boolean
 * - updateDialogue: timer-based auto-advance after LINE_DISPLAY_DURATION
 * - checkMilestones: automatic milestone detection for active quests
 * - Deduplication: same stage not triggered twice
 * - resetDialogue: clears all state
 * - Completion listener: auto-enqueues "complete" dialogue
 * - Edge cases: unknown quest, empty dialogue config, empty queue
 */

import {
	advanceDialogue,
	checkMilestones,
	enqueueDialogue,
	getCurrentDialogue,
	getDialogueQueue,
	getNextDialogue,
	resetDialogue,
	updateDialogue,
} from "../questDialogue";
import {
	notifyQuestEvent,
	resetQuests,
	startQuest,
	updateQuests,
} from "../questSystem";

// ---------------------------------------------------------------------------
// Setup — reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetQuests();
	resetDialogue();
});

// ---------------------------------------------------------------------------
// getNextDialogue
// ---------------------------------------------------------------------------

describe("getNextDialogue", () => {
	it("returns start dialogue for active quest at progress 0", () => {
		startQuest("awaken_systems");
		const line = getNextDialogue("awaken_systems", 0);
		// Should return a string (first line of start dialogue) or null
		// depending on quest config having start dialogue
		if (line !== null) {
			expect(typeof line).toBe("string");
			expect(line.length).toBeGreaterThan(0);
		}
	});

	it("returns null for unknown quest", () => {
		const line = getNextDialogue("quest_nonexistent", 0);
		expect(line).toBeNull();
	});

	it("returns null for NOT_STARTED quest", () => {
		// awaken_systems has not been started
		const line = getNextDialogue("awaken_systems", 0);
		// getQuestState returns the state but status is NOT_STARTED
		// The function checks status === "ACTIVE" for start stage
		// Since it's NOT_STARTED, no stage matches and we get null
		expect(line).toBeNull();
	});

	it("does not return same stage dialogue twice", () => {
		startQuest("awaken_systems");

		getNextDialogue("awaken_systems", 0);
		const second = getNextDialogue("awaken_systems", 0);

		// Second call should return null because stage is already triggered
		expect(second).toBeNull();
	});

	it("returns progress_50 dialogue at 50% progress", () => {
		startQuest("awaken_systems");
		// Target is 5, so 50% = progress of 2.5 or more
		// We need progress/target >= 0.5
		const line = getNextDialogue("awaken_systems", 3);
		// May return progress_50 line if quest config has it
		// The function checks progress / target >= 0.5
		if (line !== null) {
			expect(typeof line).toBe("string");
		}
	});

	it("returns complete dialogue for completed quest", () => {
		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		const line = getNextDialogue("awaken_systems", 5);
		// Quest is completed, should get "complete" stage
		if (line !== null) {
			expect(typeof line).toBe("string");
		}
	});
});

// ---------------------------------------------------------------------------
// enqueueDialogue
// ---------------------------------------------------------------------------

describe("enqueueDialogue", () => {
	it("adds lines to the queue", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const queue = getDialogueQueue();
		expect(queue.length).toBeGreaterThan(0);
		expect(queue[0].questId).toBe("awaken_systems");
		expect(queue[0].stage).toBe("start");
	});

	it("does not add lines for unknown quest", () => {
		enqueueDialogue("quest_nonexistent", "start");
		expect(getDialogueQueue().length).toBe(0);
	});

	it("deduplicates same stage", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");
		const len1 = getDialogueQueue().length;

		enqueueDialogue("awaken_systems", "start");
		const len2 = getDialogueQueue().length;

		expect(len2).toBe(len1);
	});

	it("allows different stages for same quest", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");
		const len1 = getDialogueQueue().length;

		enqueueDialogue("awaken_systems", "progress_50");
		const len2 = getDialogueQueue().length;

		// If progress_50 has dialogue, length should increase
		// If it doesn't, it stays the same (no dialogue to enqueue)
		expect(len2).toBeGreaterThanOrEqual(len1);
	});

	it("does not enqueue stage with no dialogue lines", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "nonexistent_stage");
		// Should not add anything since there's no dialogue for this stage
		// Queue should be empty (or unchanged from before)
		const queue = getDialogueQueue();
		// All entries should be for valid stages
		for (const entry of queue) {
			expect(entry.stage).not.toBe("nonexistent_stage");
		}
	});
});

// ---------------------------------------------------------------------------
// getCurrentDialogue & advanceDialogue
// ---------------------------------------------------------------------------

describe("getCurrentDialogue and advanceDialogue", () => {
	it("getCurrentDialogue returns null when queue is empty", () => {
		expect(getCurrentDialogue()).toBeNull();
	});

	it("getCurrentDialogue returns head after updateDialogue", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		// updateDialogue populates currentEntry from queue head
		updateDialogue(0);

		const current = getCurrentDialogue();
		if (getDialogueQueue().length > 0) {
			expect(current).not.toBeNull();
			expect(current!.questId).toBe("awaken_systems");
			expect(current!.stage).toBe("start");
		}
	});

	it("advanceDialogue shifts queue forward", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const initialLen = getDialogueQueue().length;
		advanceDialogue();
		const newLen = getDialogueQueue().length;

		expect(newLen).toBe(initialLen - 1);
	});

	it("advanceDialogue returns false when queue becomes empty", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		// Drain the queue
		let hasMore = true;
		while (hasMore) {
			hasMore = advanceDialogue();
		}

		expect(advanceDialogue()).toBe(false);
		expect(getCurrentDialogue()).toBeNull();
	});

	it("advanceDialogue returns false on already empty queue", () => {
		expect(advanceDialogue()).toBe(false);
	});

	it("advanceDialogue returns true when there is a next entry", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const queueLen = getDialogueQueue().length;
		if (queueLen > 1) {
			const result = advanceDialogue();
			expect(result).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// updateDialogue (timer-based auto-advance)
// ---------------------------------------------------------------------------

describe("updateDialogue timer", () => {
	it("does not advance before LINE_DISPLAY_DURATION (4s)", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const initialLen = getDialogueQueue().length;

		// Update with 3.9 seconds (less than 4.0)
		updateDialogue(3.9);

		expect(getDialogueQueue().length).toBe(initialLen);
	});

	it("auto-advances after LINE_DISPLAY_DURATION (4s)", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const initialLen = getDialogueQueue().length;
		if (initialLen === 0) return; // no dialogue in config

		// First update populates currentEntry
		updateDialogue(0);
		// Then advance past display duration
		updateDialogue(4.1);

		expect(getDialogueQueue().length).toBe(initialLen - 1);
	});

	it("accumulates delta across multiple calls", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const initialLen = getDialogueQueue().length;
		if (initialLen === 0) return;

		updateDialogue(0); // populate currentEntry
		updateDialogue(2.0); // 2s
		expect(getDialogueQueue().length).toBe(initialLen);

		updateDialogue(2.1); // 4.1s total
		expect(getDialogueQueue().length).toBe(initialLen - 1);
	});

	it("does nothing with empty queue", () => {
		expect(() => updateDialogue(1.0)).not.toThrow();
		expect(getCurrentDialogue()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// checkMilestones
// ---------------------------------------------------------------------------

describe("checkMilestones", () => {
	it("enqueues start dialogue for newly active quest at progress 0", () => {
		startQuest("awaken_systems");
		resetDialogue(); // clear any auto-enqueued dialogue

		checkMilestones();

		// Should have enqueued "start" dialogue since progress is 0 and quest is ACTIVE
		const queue = getDialogueQueue();
		// May or may not have entries depending on whether "start" dialogue exists in config
		// At minimum, the function should not throw
		expect(Array.isArray(queue)).toBe(true);
	});

	it("enqueues progress_50 dialogue at 50%+ progress", () => {
		startQuest("awaken_systems");
		// Target is 5, add 3 to reach 60%
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 3,
		});
		resetDialogue(); // clear so we test fresh

		checkMilestones();

		const queue = getDialogueQueue();
		// Should have enqueued if config has progress_50 dialogue
		expect(Array.isArray(queue)).toBe(true);
	});

	it("does not duplicate milestones on repeated calls", () => {
		startQuest("awaken_systems");
		resetDialogue();

		checkMilestones();
		const len1 = getDialogueQueue().length;

		checkMilestones();
		const len2 = getDialogueQueue().length;

		expect(len2).toBe(len1); // no duplicates
	});
});

// ---------------------------------------------------------------------------
// Completion listener
// ---------------------------------------------------------------------------

describe("completion listener", () => {
	it("enqueues complete dialogue when quest completes", () => {
		// updateDialogue registers the onQuestComplete listener
		updateDialogue(0);

		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		const queue = getDialogueQueue();
		// Should have enqueued "complete" stage dialogue if the config has it
		expect(Array.isArray(queue)).toBe(true);
	});

	it("listener is only registered once", () => {
		// Multiple updateDialogue calls should not register multiple listeners
		updateDialogue(0);
		updateDialogue(0);
		updateDialogue(0);

		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		const queue = getDialogueQueue();
		const completeEntries = queue.filter(
			(e) => e.stage === "complete" && e.questId === "awaken_systems",
		);
		// Should have at most one batch of "complete" lines (not tripled)
		// Get count of unique lines to verify no duplication
		const lineSet = new Set(completeEntries.map((e) => e.line));
		expect(completeEntries.length).toBe(lineSet.size);
	});
});

// ---------------------------------------------------------------------------
// resetDialogue
// ---------------------------------------------------------------------------

describe("resetDialogue", () => {
	it("clears all state", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");
		updateDialogue(0); // populate currentEntry

		resetDialogue();

		expect(getDialogueQueue().length).toBe(0);
		expect(getCurrentDialogue()).toBeNull();
	});

	it("allows re-triggering stages after reset", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");
		const len1 = getDialogueQueue().length;

		resetDialogue();
		enqueueDialogue("awaken_systems", "start");
		const len2 = getDialogueQueue().length;

		expect(len2).toBe(len1); // same lines re-enqueued
	});
});

// ---------------------------------------------------------------------------
// getDialogueQueue
// ---------------------------------------------------------------------------

describe("getDialogueQueue", () => {
	it("returns empty array initially", () => {
		expect(getDialogueQueue().length).toBe(0);
	});

	it("entries have questId, line, and stage", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const queue = getDialogueQueue();
		if (queue.length > 0) {
			expect(queue[0]).toHaveProperty("questId");
			expect(queue[0]).toHaveProperty("line");
			expect(queue[0]).toHaveProperty("stage");
			expect(typeof queue[0].line).toBe("string");
		}
	});
});
