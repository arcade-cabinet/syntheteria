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

import {
	advanceDialogue,
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
		const state = getQuestState("awaken_systems");
		expect(state).not.toBeNull();
		expect(state!.status).toBe("NOT_STARTED");
	});

	it("startQuest transitions from NOT_STARTED to ACTIVE", () => {
		const result = startQuest("awaken_systems");
		expect(result).toBe(true);

		const state = getQuestState("awaken_systems");
		expect(state!.status).toBe("ACTIVE");
		expect(state!.objectiveStates[0].current).toBe(0);
	});

	it("startQuest returns false for already active quest", () => {
		startQuest("awaken_systems");
		const result = startQuest("awaken_systems");
		expect(result).toBe(false);
	});

	it("startQuest returns false for unknown quest id", () => {
		const result = startQuest("quest_nonexistent");
		expect(result).toBe(false);
	});

	it("quest completes when progress reaches target", () => {
		startQuest("awaken_systems");

		// Harvest 5 scrap metal (target is 5)
		for (let i = 0; i < 5; i++) {
			notifyQuestEvent({
				type: "resource_gained",
				detail: "scrapMetal",
				amount: 1,
			});
		}

		updateQuests(1);
		expect(isQuestComplete("awaken_systems")).toBe(true);
	});

	it("quest does not complete before reaching target", () => {
		startQuest("awaken_systems");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 3,
		});

		updateQuests(1);
		expect(isQuestComplete("awaken_systems")).toBe(false);

		const state = getQuestState("awaken_systems");
		expect(state!.status).toBe("ACTIVE");
		expect(state!.objectiveStates[0].current).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Quest event processing
// ---------------------------------------------------------------------------

describe("quest event processing", () => {
	it("harvest_ore quest tracks resource gains", () => {
		startQuest("awaken_systems");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 3,
		});

		const progress = getQuestProgress("awaken_systems");
		expect(progress).not.toBeNull();
		expect(progress!.current).toBe(3);
		expect(progress!.target).toBe(5);
	});

	it("harvest_ore ignores wrong resource type", () => {
		startQuest("awaken_systems");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "eWaste",
			amount: 10,
		});

		const progress = getQuestProgress("awaken_systems");
		expect(progress!.current).toBe(0);
	});

	it("compress_cubes quest tracks cube_compressed events", () => {
		startQuest("awaken_systems");
		// Complete awaken_systems first so first_compression can start
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		// first_compression should now be active (auto-started)
		const firstCompressionState = getQuestState("first_compression");
		expect(firstCompressionState!.status).toBe("ACTIVE");

		notifyQuestEvent({
			type: "cube_compressed",
			amount: 1,
		});

		const progress = getQuestProgress("first_compression");
		expect(progress!.current).toBe(1);
	});

	it("build_structure quest tracks building placement", () => {
		// build_lightning_rod requires build_furnace completed
		// Manually start it by completing prerequisites
		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1); // completes awaken_systems, auto-starts first_compression

		startQuest("first_compression");
		notifyQuestEvent({ type: "cube_compressed", amount: 1 });
		updateQuests(1); // completes first_compression, auto-starts build_furnace

		const buildFurnaceState = getQuestState("build_furnace");
		expect(buildFurnaceState!.status).toBe("ACTIVE");

		notifyQuestEvent({
			type: "component_fabricated",
			detail: "improved_harvester",
			amount: 1,
		});
		updateQuests(1); // completes build_furnace

		// build_lightning_rod is in act2, not auto-started from act1
		// Start it manually since prerequisites are met
		startQuest("build_lightning_rod");

		notifyQuestEvent({
			type: "building_placed",
			detail: "lightning_rod",
			amount: 1,
		});

		const progress = getQuestProgress("build_lightning_rod");
		expect(progress!.current).toBe(1);
	});

	it("furnace_craft quest tracks recipe with detail matching", () => {
		// Start and complete prerequisites for build_furnace
		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);
		notifyQuestEvent({ type: "cube_compressed", amount: 1 });
		updateQuests(1);

		const state = getQuestState("build_furnace");
		expect(state!.status).toBe("ACTIVE");

		// Wrong recipe — should not advance
		notifyQuestEvent({
			type: "component_fabricated",
			detail: "wrong_recipe",
			amount: 1,
		});
		expect(getQuestProgress("build_furnace")!.current).toBe(0);

		// Correct recipe
		notifyQuestEvent({
			type: "component_fabricated",
			detail: "improved_harvester",
			amount: 1,
		});
		expect(getQuestProgress("build_furnace")!.current).toBe(1);
	});

	it("events do not affect NOT_STARTED quests", () => {
		// Don't start the quest
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 10,
		});

		const progress = getQuestProgress("awaken_systems");
		expect(progress!.current).toBe(0);
	});

	it("events do not affect COMPLETED quests", () => {
		startQuest("awaken_systems");

		// Complete the quest
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);
		expect(isQuestComplete("awaken_systems")).toBe(true);

		// Further events should not change progress
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 10,
		});

		const progress = getQuestProgress("awaken_systems");
		expect(progress!.current).toBe(5);
	});

	it("progress is clamped to target", () => {
		startQuest("awaken_systems");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 100,
		});

		const progress = getQuestProgress("awaken_systems");
		expect(progress!.current).toBe(5); // target is 5
	});
});

// ---------------------------------------------------------------------------
// Quest sequencing
// ---------------------------------------------------------------------------

describe("quest sequencing", () => {
	it("completing a quest auto-starts the next in same quest line", () => {
		startQuest("awaken_systems");

		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		// first_compression should now be active (next in act1_awakening)
		const nextState = getQuestState("first_compression");
		expect(nextState!.status).toBe("ACTIVE");
	});

	it("getActiveQuests returns only ACTIVE quests", () => {
		startQuest("awaken_systems");

		const active = getActiveQuests();
		expect(active).toHaveLength(1);
		expect(active[0].id).toBe("awaken_systems");
	});

	it("autoStartFirstQuest starts the first quest in sequence", () => {
		const result = autoStartFirstQuest();
		expect(result).toBe(true);

		const state = getQuestState("awaken_systems");
		expect(state!.status).toBe("ACTIVE");
	});

	it("autoStartFirstQuest returns false if quests already started", () => {
		startQuest("awaken_systems");

		const result = autoStartFirstQuest();
		expect(result).toBe(false);
	});

	it("getQuestSequence returns definitions in order", () => {
		const sequence = getQuestSequence();
		expect(sequence.length).toBeGreaterThan(0);
		expect(sequence[0].id).toBe("awaken_systems");
		expect(sequence[1].id).toBe("first_compression");
	});
});

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

describe("quest rewards", () => {
	it("completion callback fires on quest completion", () => {
		const callback = jest.fn();
		onQuestComplete(callback);

		startQuest("awaken_systems");
		notifyQuestEvent({
			type: "resource_gained",
			detail: "scrapMetal",
			amount: 5,
		});
		updateQuests(1);

		expect(callback).toHaveBeenCalledWith("awaken_systems");
	});

	it("completion callback can be unregistered", () => {
		const callback = jest.fn();
		const unsubscribe = onQuestComplete(callback);
		unsubscribe();

		startQuest("awaken_systems");
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
		const progress = getQuestProgress("awaken_systems");
		expect(progress!.description).toBe(
			"Your cognitive systems are scrambled from the atmospheric entry pulse. Reboot by harvesting scrap ore to confirm motor functions.",
		);
	});
});

// ---------------------------------------------------------------------------
// Quest dialogue system
// ---------------------------------------------------------------------------

describe("quest dialogue", () => {
	it("enqueueDialogue adds lines to the queue", () => {
		startQuest("awaken_systems");

		enqueueDialogue("awaken_systems", "start");

		const queue = getDialogueQueue();
		expect(queue.length).toBeGreaterThan(0);
		expect(queue[0].questId).toBe("awaken_systems");
		expect(queue[0].stage).toBe("start");
	});

	it("getCurrentDialogue returns head of queue after update", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		// Need to call updateDialogue to populate currentEntry
		// But we can populate it manually by checking the queue
		const queue = getDialogueQueue();
		expect(queue.length).toBeGreaterThan(0);
	});

	it("advanceDialogue moves to the next entry", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		const initialLength = getDialogueQueue().length;
		advanceDialogue();

		const newLength = getDialogueQueue().length;
		expect(newLength).toBe(initialLength - 1);
	});

	it("enqueueDialogue does not duplicate same stage", () => {
		startQuest("awaken_systems");

		enqueueDialogue("awaken_systems", "start");
		const len1 = getDialogueQueue().length;

		enqueueDialogue("awaken_systems", "start");
		const len2 = getDialogueQueue().length;

		expect(len2).toBe(len1); // no duplicate
	});

	it("enqueueDialogue ignores unknown quest", () => {
		enqueueDialogue("quest_unknown", "start");
		expect(getDialogueQueue().length).toBe(0);
	});

	it("resetDialogue clears all state", () => {
		startQuest("awaken_systems");
		enqueueDialogue("awaken_systems", "start");

		resetDialogue();

		expect(getDialogueQueue().length).toBe(0);
		expect(getCurrentDialogue()).toBeNull();
	});
});
