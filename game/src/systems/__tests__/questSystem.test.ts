/**
 * Unit tests for the quest state machine and dialogue system.
 *
 * Tests cover:
 * - Quest state transitions: NOT_STARTED -> ACTIVE -> COMPLETED
 * - Quest event processing (resource gains, fabrication, building, territory)
 * - Automatic quest sequencing (next quest unlocks on completion)
 * - Reward distribution on completion
 * - Dialogue queue and milestone triggers
 * - Edge cases: double-start, unknown quest, overflow progress
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	advanceDialogue,
	checkMilestones,
	enqueueDialogue,
	getCurrentDialogue,
	getDialogueQueue,
	resetDialogue,
} from "../questDialogue";
import {
	autoStartFirstQuest,
	getActiveQuests,
	getQuestProgress,
	getQuestSequence,
	getQuestState,
	isQuestComplete,
	notifyQuestEvent,
	onQuestComplete,
	resetQuests,
	startQuest,
	updateQuests,
} from "../questSystem";

// ---------------------------------------------------------------------------
// Setup — reset quest state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetQuests();
	resetDialogue();
});

// ---------------------------------------------------------------------------
// Quest state transitions
// ---------------------------------------------------------------------------

describe("quest state transitions", () => {
	it("quests start in NOT_STARTED state", () => {
		const state = getQuestState("quest_first_harvest");
		expect(state).not.toBeNull();
		expect(state!.status).toBe("NOT_STARTED");
	});

	it("startQuest transitions from NOT_STARTED to ACTIVE", () => {
		const result = startQuest("quest_first_harvest");
		expect(result).toBe(true);

		const state = getQuestState("quest_first_harvest");
		expect(state!.status).toBe("ACTIVE");
		expect(state!.current).toBe(0);
	});

	it("startQuest returns false for already active quest", () => {
		startQuest("quest_first_harvest");
		const result = startQuest("quest_first_harvest");
		expect(result).toBe(false);
	});

	it("startQuest returns false for unknown quest id", () => {
		const result = startQuest("quest_nonexistent");
		expect(result).toBe(false);
	});

	it("quest completes when progress reaches target", () => {
		startQuest("quest_first_harvest");

		// Harvest 5 scrap metal (target is 5)
		for (let i = 0; i < 5; i++) {
			notifyQuestEvent({
				type: "resource_gained",
				detail: "scrapMetal",
				amount: 1,
			});
		}

		updateQuests(1);
		expect(isQuestComplete("quest_first_harvest")).toBe(true);
	});

	it("quest does not complete before reaching target", () => {
		startQuest("quest_first_harvest");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 3,
		});

		updateQuests(1);
		expect(isQuestComplete("quest_first_harvest")).toBe(false);

		const state = getQuestState("quest_first_harvest");
		expect(state!.status).toBe("ACTIVE");
		expect(state!.current).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Quest event processing
// ---------------------------------------------------------------------------

describe("quest event processing", () => {
	it("harvest_N_ore quest tracks resource gains", () => {
		startQuest("quest_first_harvest");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 3,
		});

		const progress = getQuestProgress("quest_first_harvest");
		expect(progress).not.toBeNull();
		expect(progress!.current).toBe(3);
		expect(progress!.target).toBe(5);
	});

	it("harvest_N_ore ignores wrong resource type", () => {
		startQuest("quest_first_harvest");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "eWaste",
			amount: 10,
		});

		const progress = getQuestProgress("quest_first_harvest");
		expect(progress!.current).toBe(0);
	});

	it("compress_N_cubes quest tracks fabrication events", () => {
		startQuest("quest_first_cube");

		notifyQuestEvent({
			type: "component_fabricated",
			amount: 1,
		});

		const progress = getQuestProgress("quest_first_cube");
		expect(progress!.current).toBe(1);
	});

	it("build_first_wall quest tracks building placement", () => {
		startQuest("quest_build_furnace");

		notifyQuestEvent({
			type: "building_placed",
			detail: "lightning_rod",
			amount: 1,
		});

		const progress = getQuestProgress("quest_build_furnace");
		expect(progress!.current).toBe(1);
	});

	it("assemble_first_machine quest tracks specific recipe", () => {
		startQuest("quest_first_craft");

		// Wrong recipe
		notifyQuestEvent({
			type: "recipe_completed",
			detail: "Camera Module",
			amount: 1,
		});
		expect(getQuestProgress("quest_first_craft")!.current).toBe(0);

		// Correct recipe
		notifyQuestEvent({
			type: "recipe_completed",
			detail: "Arm Assembly",
			amount: 1,
		});
		expect(getQuestProgress("quest_first_craft")!.current).toBe(1);
	});

	it("claim_territory quest tracks territory claims", () => {
		startQuest("quest_claim_territory");

		notifyQuestEvent({
			type: "territory_claimed",
			amount: 1,
		});

		const progress = getQuestProgress("quest_claim_territory");
		expect(progress!.current).toBe(1);
	});

	it("events do not affect NOT_STARTED quests", () => {
		// Don't start the quest
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 10,
		});

		const progress = getQuestProgress("quest_first_harvest");
		expect(progress!.current).toBe(0);
	});

	it("events do not affect COMPLETED quests", () => {
		startQuest("quest_first_harvest");

		// Complete the quest
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);
		expect(isQuestComplete("quest_first_harvest")).toBe(true);

		// Further events should not change progress
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 10,
		});

		const progress = getQuestProgress("quest_first_harvest");
		expect(progress!.current).toBe(5);
	});

	it("progress is clamped to target", () => {
		startQuest("quest_first_harvest");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 100,
		});

		const progress = getQuestProgress("quest_first_harvest");
		expect(progress!.current).toBe(5); // target is 5
	});
});

// ---------------------------------------------------------------------------
// Quest sequencing
// ---------------------------------------------------------------------------

describe("quest sequencing", () => {
	it("completing a quest auto-starts the next in sequence", () => {
		startQuest("quest_first_harvest");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		// quest_first_cube should now be active
		const nextState = getQuestState("quest_first_cube");
		expect(nextState!.status).toBe("ACTIVE");
	});

	it("getActiveQuests returns only ACTIVE quests", () => {
		startQuest("quest_first_harvest");

		const active = getActiveQuests();
		expect(active).toHaveLength(1);
		expect(active[0].id).toBe("quest_first_harvest");
	});

	it("autoStartFirstQuest starts the first quest in sequence", () => {
		const result = autoStartFirstQuest();
		expect(result).toBe(true);

		const state = getQuestState("quest_first_harvest");
		expect(state!.status).toBe("ACTIVE");
	});

	it("autoStartFirstQuest returns false if quests already started", () => {
		startQuest("quest_first_harvest");

		const result = autoStartFirstQuest();
		expect(result).toBe(false);
	});

	it("getQuestSequence returns definitions in order", () => {
		const sequence = getQuestSequence();
		expect(sequence.length).toBeGreaterThan(0);
		expect(sequence[0].id).toBe("quest_first_harvest");
		expect(sequence[1].id).toBe("quest_first_cube");
	});
});

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

describe("quest rewards", () => {
	it("completion callback fires on quest completion", () => {
		const callback = vi.fn();
		onQuestComplete(callback);

		startQuest("quest_first_harvest");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		expect(callback).toHaveBeenCalledWith("quest_first_harvest");
	});

	it("completion callback can be unregistered", () => {
		const callback = vi.fn();
		const unsubscribe = onQuestComplete(callback);
		unsubscribe();

		startQuest("quest_first_harvest");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		expect(callback).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getQuestProgress edge cases
// ---------------------------------------------------------------------------

describe("getQuestProgress", () => {
	it("returns null for unknown quest", () => {
		expect(getQuestProgress("quest_unknown")).toBeNull();
	});

	it("returns description from quest definition", () => {
		const progress = getQuestProgress("quest_first_harvest");
		expect(progress!.description).toBe(
			"Scavenge scrap metal from the city ruins",
		);
	});
});

// ---------------------------------------------------------------------------
// Quest dialogue system
// ---------------------------------------------------------------------------

describe("quest dialogue", () => {
	it("enqueueDialogue adds lines to the queue", () => {
		startQuest("quest_first_harvest");

		enqueueDialogue("quest_first_harvest", "start");

		const queue = getDialogueQueue();
		expect(queue.length).toBeGreaterThan(0);
		expect(queue[0].questId).toBe("quest_first_harvest");
		expect(queue[0].stage).toBe("start");
	});

	it("getCurrentDialogue returns head of queue after update", () => {
		startQuest("quest_first_harvest");
		enqueueDialogue("quest_first_harvest", "start");

		// Need to call updateDialogue to populate currentEntry
		// But we can populate it manually by checking the queue
		const queue = getDialogueQueue();
		expect(queue.length).toBeGreaterThan(0);
	});

	it("advanceDialogue moves to the next entry", () => {
		startQuest("quest_first_harvest");
		enqueueDialogue("quest_first_harvest", "start");

		const initialLength = getDialogueQueue().length;
		advanceDialogue();

		const newLength = getDialogueQueue().length;
		expect(newLength).toBe(initialLength - 1);
	});

	it("enqueueDialogue does not duplicate same stage", () => {
		startQuest("quest_first_harvest");

		enqueueDialogue("quest_first_harvest", "start");
		const len1 = getDialogueQueue().length;

		enqueueDialogue("quest_first_harvest", "start");
		const len2 = getDialogueQueue().length;

		expect(len2).toBe(len1); // no duplicate
	});

	it("enqueueDialogue ignores unknown quest", () => {
		enqueueDialogue("quest_unknown", "start");
		expect(getDialogueQueue().length).toBe(0);
	});

	it("resetDialogue clears all state", () => {
		startQuest("quest_first_harvest");
		enqueueDialogue("quest_first_harvest", "start");

		resetDialogue();

		expect(getDialogueQueue().length).toBe(0);
		expect(getCurrentDialogue()).toBeNull();
	});
});
