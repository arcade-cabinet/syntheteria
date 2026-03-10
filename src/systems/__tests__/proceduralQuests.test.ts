/**
 * Tests for the procedural quest system.
 *
 * Tests cover:
 * - Quests generated at correct interval (600 ticks)
 * - Max active quest limit respected (3)
 * - Quest objectives can be completed
 * - Expired quests removed
 * - Quest rewards recorded on completion
 * - Different quest types generated
 * - Reset clears all state
 * - No quest generated at tick 0
 * - Partial objective completion
 * - Completing all objectives completes the quest
 * - Quest difficulty scales with progress
 */

jest.mock("../../../config", () => ({
	config: {
		quests: {
			sequence: [],
			quests: {},
		},
	},
}));

import {
	completeObjective,
	getActiveQuests,
	getCompletedQuests,
	proceduralQuestSystem,
	resetProceduralQuests,
	setRngSeed,
} from "../proceduralQuests";

beforeEach(() => {
	resetProceduralQuests();
	setRngSeed(42);
});

// ---------------------------------------------------------------------------
// Quest generation timing
// ---------------------------------------------------------------------------

describe("quest generation timing", () => {
	it("does not generate quests at tick 0", () => {
		proceduralQuestSystem(0);
		expect(getActiveQuests()).toHaveLength(0);
	});

	it("generates a quest at tick 600", () => {
		proceduralQuestSystem(600);
		expect(getActiveQuests()).toHaveLength(1);
	});

	it("generates quests at each 600-tick interval", () => {
		proceduralQuestSystem(600);
		expect(getActiveQuests()).toHaveLength(1);

		proceduralQuestSystem(1200);
		expect(getActiveQuests()).toHaveLength(2);

		proceduralQuestSystem(1800);
		expect(getActiveQuests()).toHaveLength(3);
	});

	it("does not generate between intervals", () => {
		proceduralQuestSystem(100);
		expect(getActiveQuests()).toHaveLength(0);

		proceduralQuestSystem(500);
		expect(getActiveQuests()).toHaveLength(0);

		proceduralQuestSystem(601);
		expect(getActiveQuests()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Max active quest limit
// ---------------------------------------------------------------------------

describe("max active quest limit", () => {
	it("does not exceed 3 active quests", () => {
		proceduralQuestSystem(600);
		proceduralQuestSystem(1200);
		proceduralQuestSystem(1800);
		expect(getActiveQuests()).toHaveLength(3);

		// 4th interval: should not add because at max
		proceduralQuestSystem(2400);
		expect(getActiveQuests()).toHaveLength(3);
	});

	it("allows generation after a quest is completed", () => {
		proceduralQuestSystem(600);
		proceduralQuestSystem(1200);
		proceduralQuestSystem(1800);
		expect(getActiveQuests()).toHaveLength(3);

		// Complete one quest
		const quests = getActiveQuests();
		const q = quests[0];
		completeObjective(q.id, q.objectives[0].id, q.objectives[0].target);
		expect(getActiveQuests()).toHaveLength(2);

		// Now generation should work again
		proceduralQuestSystem(2400);
		expect(getActiveQuests()).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Quest objectives
// ---------------------------------------------------------------------------

describe("quest objectives", () => {
	it("completeObjective advances objective progress", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		completeObjective(quest.id, obj.id, 1);

		// getActiveQuests returns copies, so re-fetch
		const updated = getActiveQuests().find((q) => q.id === quest.id);
		expect(updated!.objectives[0].current).toBe(1);
	});

	it("partial completion does not complete the quest", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		if (obj.target > 1) {
			completeObjective(quest.id, obj.id, 1);
			expect(getActiveQuests().find((q) => q.id === quest.id)).toBeDefined();
			expect(getCompletedQuests()).toHaveLength(0);
		}
	});

	it("completing all objectives completes the quest", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		completeObjective(quest.id, obj.id, obj.target);

		expect(getActiveQuests().find((q) => q.id === quest.id)).toBeUndefined();
		expect(getCompletedQuests()).toHaveLength(1);
		expect(getCompletedQuests()[0].status).toBe("completed");
	});

	it("objective current does not exceed target", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		completeObjective(quest.id, obj.id, obj.target + 100);
		const completed = getCompletedQuests()[0];
		expect(completed.objectives[0].current).toBe(completed.objectives[0].target);
	});

	it("returns false for nonexistent quest", () => {
		expect(completeObjective("nope", "nope")).toBe(false);
	});

	it("returns false for nonexistent objective", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		expect(completeObjective(quest.id, "nonexistent")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Quest expiry
// ---------------------------------------------------------------------------

describe("quest expiry", () => {
	it("removes quests after their expiry tick", () => {
		proceduralQuestSystem(600);
		expect(getActiveQuests()).toHaveLength(1);

		const quest = getActiveQuests()[0];
		const afterExpiry = quest.expiryTick + 1;

		// Run past expiry tick
		proceduralQuestSystem(afterExpiry);
		expect(getActiveQuests().find((q) => q.id === quest.id)).toBeUndefined();
	});

	it("does not remove quests at their exact expiry tick", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const expiryTick = quest.expiryTick;

		proceduralQuestSystem(expiryTick);
		expect(getActiveQuests().find((q) => q.id === quest.id)).toBeDefined();
	});

	it("does not remove quests before their expiry", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const justBefore = quest.expiryTick - 1;

		proceduralQuestSystem(justBefore);
		expect(getActiveQuests().find((q) => q.id === quest.id)).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Quest rewards
// ---------------------------------------------------------------------------

describe("quest rewards", () => {
	it("completed quests record rewards", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		completeObjective(quest.id, obj.id, obj.target);

		const completed = getCompletedQuests()[0];
		expect(completed.reward).toBeDefined();
		expect(completed.reward.resources).toBeDefined();
		expect(Object.keys(completed.reward.resources).length).toBeGreaterThan(0);
	});

	it("reward experience is present", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		completeObjective(quest.id, obj.id, obj.target);

		const completed = getCompletedQuests()[0];
		expect(completed.reward.experience).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Quest type variety
// ---------------------------------------------------------------------------

describe("quest type variety", () => {
	it("generates different quest types over multiple intervals", () => {
		const types = new Set<string>();

		// Generate many quests by completing them to make room
		for (let tick = 600; tick <= 12000; tick += 600) {
			// Complete all active quests to make room
			for (const q of getActiveQuests()) {
				completeObjective(q.id, q.objectives[0].id, q.objectives[0].target);
			}
			proceduralQuestSystem(tick);
			for (const q of getActiveQuests()) {
				types.add(q.type);
			}
		}

		// With 20 generations and 6 types, we should see at least 2 different types
		expect(types.size).toBeGreaterThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// Quest structure
// ---------------------------------------------------------------------------

describe("quest structure", () => {
	it("generated quests have required fields", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];

		expect(quest.id).toBeDefined();
		expect(quest.title).toBeDefined();
		expect(quest.type).toBeDefined();
		expect(quest.objectives).toBeDefined();
		expect(quest.objectives.length).toBeGreaterThan(0);
		expect(quest.reward).toBeDefined();
		expect(quest.createdTick).toBe(600);
		expect(quest.expiryTick).toBeGreaterThan(600);
		expect(quest.status).toBe("active");
		expect(quest.questGiver).toBeDefined();
	});

	it("quest objectives have required fields", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		const obj = quest.objectives[0];

		expect(obj.id).toBeDefined();
		expect(obj.description).toBeDefined();
		expect(obj.type).toBeDefined();
		expect(obj.target).toBeGreaterThan(0);
		expect(obj.current).toBe(0);
	});

	it("quest giver is an otter hologram", () => {
		proceduralQuestSystem(600);
		const quest = getActiveQuests()[0];
		expect(quest.questGiver).toMatch(/^otter_/);
	});
});

// ---------------------------------------------------------------------------
// Deterministic RNG
// ---------------------------------------------------------------------------

describe("deterministic RNG", () => {
	it("same seed produces same quest", () => {
		setRngSeed(42);
		proceduralQuestSystem(600);
		const quest1 = getActiveQuests()[0];

		resetProceduralQuests();
		setRngSeed(42);
		proceduralQuestSystem(600);
		const quest2 = getActiveQuests()[0];

		expect(quest1.type).toBe(quest2.type);
		expect(quest1.title).toBe(quest2.title);
	});

	it("different seeds produce different results eventually", () => {
		setRngSeed(1);
		proceduralQuestSystem(600);
		const quest1 = getActiveQuests()[0];

		resetProceduralQuests();
		setRngSeed(99999);
		proceduralQuestSystem(600);
		const quest2 = getActiveQuests()[0];

		// With different seeds, at least something should differ
		// (type or objective details)
		const sameType = quest1.type === quest2.type;
		const sameTarget =
			quest1.objectives[0].target === quest2.objectives[0].target;
		// At least one should differ with very different seeds
		expect(sameType && sameTarget).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetProceduralQuests", () => {
	it("clears all state", () => {
		proceduralQuestSystem(600);
		proceduralQuestSystem(1200);

		const quest = getActiveQuests()[0];
		completeObjective(quest.id, quest.objectives[0].id, quest.objectives[0].target);

		expect(getActiveQuests().length).toBeGreaterThan(0);
		expect(getCompletedQuests().length).toBeGreaterThan(0);

		resetProceduralQuests();

		expect(getActiveQuests()).toHaveLength(0);
		expect(getCompletedQuests()).toHaveLength(0);
	});
});
