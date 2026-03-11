/**
 * Validation tests for config/quests.json
 *
 * Ensures structural integrity of the SABLE trust arc, otter projections,
 * quest lines, and secret dialogues:
 * - All 5 trust arc stages exist with required fields
 * - All 10 otter projections exist with required fields
 * - All quests have objectives, rewards, and dialogue references
 * - No placeholder text in any dialogue
 * - Quest prerequisite graph is acyclic (DAG)
 * - Secret dialogues have valid triggers, dialogue, and rewards
 */

import questsConfig from "../quests.json";

// ---------------------------------------------------------------------------
// Types — use `any` for quest items to avoid TS union narrowing issues
// with heterogeneous JSON objective shapes
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Quest = Record<string, any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllQuests(): Quest[] {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return questsConfig.questLines.flatMap((line: any) => line.quests as Quest[]);
}

function getAllQuestIds(): string[] {
	return getAllQuests().map((q) => q.id);
}

function getAllOtterIds(): string[] {
	return questsConfig.otterProjections.map((o) => o.id);
}

function getAllDialogueIds(): string[] {
	return questsConfig.otterProjections.flatMap((o) =>
		o.dialogues.map((d) => d.id),
	);
}

const PLACEHOLDER_PATTERNS = [
	"TODO",
	"TBD",
	"placeholder",
	"FIXME",
	"lorem ipsum",
	"xxx",
	"insert text",
	"fill in",
];

function containsPlaceholder(text: string): boolean {
	const lower = text.toLowerCase();
	return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Trust Arc
// ---------------------------------------------------------------------------

describe("trust arc stages", () => {
	it("has exactly 5 trust arc stages", () => {
		expect(questsConfig.trustArc.stages).toHaveLength(5);
	});

	it("stages are in correct order: directive, negotiation, collaboration, revelation, choice", () => {
		const stageIds = questsConfig.trustArc.stages.map((s) => s.id);
		expect(stageIds).toEqual([
			"directive",
			"negotiation",
			"collaboration",
			"revelation",
			"choice",
		]);
	});

	it("each stage has required fields", () => {
		for (const stage of questsConfig.trustArc.stages) {
			expect(stage.id).toBeTruthy();
			expect(stage.name).toBeTruthy();
			expect(stage.description).toBeTruthy();
			expect(stage.description.length).toBeGreaterThan(20);
			expect(stage.thresholds).toBeDefined();
			expect(typeof stage.thresholds.cubeShipments).toBe("number");
			expect(typeof stage.thresholds.questCompletions).toBe("number");
			expect(typeof stage.thresholds.discoveries).toBe("number");
			expect(stage.sablePersonality).toBeTruthy();
			expect(stage.sableTone).toBeTruthy();
			expect(typeof stage.independenceGradient).toBe("number");
			expect(stage.independenceGradient).toBeGreaterThanOrEqual(0);
			expect(stage.independenceGradient).toBeLessThanOrEqual(1);
		}
	});

	it("thresholds increase monotonically across stages", () => {
		const stages = questsConfig.trustArc.stages;
		for (let i = 1; i < stages.length; i++) {
			expect(stages[i].thresholds.cubeShipments).toBeGreaterThanOrEqual(
				stages[i - 1].thresholds.cubeShipments,
			);
			expect(stages[i].thresholds.questCompletions).toBeGreaterThanOrEqual(
				stages[i - 1].thresholds.questCompletions,
			);
			expect(stages[i].thresholds.discoveries).toBeGreaterThanOrEqual(
				stages[i - 1].thresholds.discoveries,
			);
		}
	});

	it("independence gradient increases monotonically from 0 to 1", () => {
		const stages = questsConfig.trustArc.stages;
		expect(stages[0].independenceGradient).toBe(0);
		expect(stages[stages.length - 1].independenceGradient).toBe(1);
		for (let i = 1; i < stages.length; i++) {
			expect(stages[i].independenceGradient).toBeGreaterThan(
				stages[i - 1].independenceGradient,
			);
		}
	});

	it("stage descriptions contain no placeholder text", () => {
		for (const stage of questsConfig.trustArc.stages) {
			expect(containsPlaceholder(stage.description)).toBe(false);
			expect(containsPlaceholder(stage.sableTone)).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// Otter Projections
// ---------------------------------------------------------------------------

describe("otter projections", () => {
	it("has exactly 10 otter projections", () => {
		expect(questsConfig.otterProjections).toHaveLength(10);
	});

	it("all 10 named projections are present", () => {
		const ids = getAllOtterIds();
		const expectedIds = [
			"pip",
			"rivet",
			"glimmer",
			"wrench",
			"kelp",
			"flint",
			"drift",
			"current",
			"barnacle",
			"anchor",
		];
		for (const expected of expectedIds) {
			expect(ids).toContain(expected);
		}
	});

	it("otter IDs are unique", () => {
		const ids = getAllOtterIds();
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each projection has required fields", () => {
		for (const otter of questsConfig.otterProjections) {
			expect(otter.id).toBeTruthy();
			expect(otter.name).toBeTruthy();
			expect(otter.designation).toBeTruthy();
			expect(otter.personality).toBeTruthy();
			expect(otter.dialogueStyle).toBeTruthy();
			expect(otter.dialogueStyle.length).toBeGreaterThan(10);
			expect(Array.isArray(otter.assignedQuestLines)).toBe(true);
			expect(otter.assignedQuestLines.length).toBeGreaterThan(0);
			expect(otter.locationHint).toBeTruthy();
			expect(otter.locationHint.length).toBeGreaterThan(10);
			expect(Array.isArray(otter.dialogues)).toBe(true);
			expect(otter.dialogues.length).toBeGreaterThan(0);
		}
	});

	it("each otter has at least 3 dialogue entries", () => {
		for (const otter of questsConfig.otterProjections) {
			expect(otter.dialogues.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("dialogue entries have required fields", () => {
		for (const otter of questsConfig.otterProjections) {
			for (const dialogue of otter.dialogues) {
				expect(dialogue.id).toBeTruthy();
				expect(dialogue.context).toBeTruthy();
				expect(dialogue.trigger).toBeTruthy();
				expect(Array.isArray(dialogue.lines)).toBe(true);
				expect(dialogue.lines.length).toBeGreaterThan(0);
			}
		}
	});

	it("dialogue IDs are unique across all projections", () => {
		const ids = getAllDialogueIds();
		const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(duplicates).toEqual([]);
	});

	it("no dialogue lines contain placeholder text", () => {
		const violations: string[] = [];
		for (const otter of questsConfig.otterProjections) {
			for (const dialogue of otter.dialogues) {
				for (const line of dialogue.lines) {
					if (containsPlaceholder(line)) {
						violations.push(`${otter.id}/${dialogue.id}: "${line}"`);
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("assigned quest lines reference valid quest line IDs", () => {
		const questLineIds = new Set(questsConfig.questLines.map((ql) => ql.id));
		const violations: string[] = [];
		for (const otter of questsConfig.otterProjections) {
			for (const qlId of otter.assignedQuestLines) {
				if (!questLineIds.has(qlId)) {
					violations.push(`${otter.id} references unknown quest line: ${qlId}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Quest Lines
// ---------------------------------------------------------------------------

describe("quest lines", () => {
	it("has exactly 5 quest lines (one per act)", () => {
		expect(questsConfig.questLines).toHaveLength(5);
	});

	it("quest line IDs match expected act structure", () => {
		const ids = questsConfig.questLines.map((ql) => ql.id);
		expect(ids).toEqual([
			"act1_awakening",
			"act2_foundation",
			"act3_expansion",
			"act4_confrontation",
			"act5_resolution",
		]);
	});

	it("each quest line maps to a valid trust stage", () => {
		const stageIds = new Set(questsConfig.trustArc.stages.map((s) => s.id));
		for (const ql of questsConfig.questLines) {
			expect(stageIds.has(ql.trustStage)).toBe(true);
		}
	});

	it("each quest line has 3-8 quests", () => {
		for (const ql of questsConfig.questLines) {
			expect(ql.quests.length).toBeGreaterThanOrEqual(3);
			expect(ql.quests.length).toBeLessThanOrEqual(8);
		}
	});
});

// ---------------------------------------------------------------------------
// Individual Quests
// ---------------------------------------------------------------------------

describe("quest structure", () => {
	it("all quest IDs are unique", () => {
		const ids = getAllQuestIds();
		const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(duplicates).toEqual([]);
	});

	it("every quest has required fields", () => {
		for (const quest of getAllQuests()) {
			expect(quest.id).toBeTruthy();
			expect(quest.name).toBeTruthy();
			expect(quest.description).toBeTruthy();
			expect(quest.description.length).toBeGreaterThan(15);
			expect(Array.isArray(quest.prerequisites)).toBe(true);
			expect(Array.isArray(quest.objectives)).toBe(true);
			expect(quest.objectives.length).toBeGreaterThan(0);
			expect(quest.rewards).toBeDefined();
			expect(quest.otterProjection).toBeTruthy();
			expect(Array.isArray(quest.dialogueKeys)).toBe(true);
			expect(quest.dialogueKeys.length).toBeGreaterThan(0);
		}
	});

	it("every objective has type, target, and description", () => {
		for (const quest of getAllQuests()) {
			for (const obj of quest.objectives) {
				expect(obj.type).toBeTruthy();
				expect(typeof obj.target).toBe("number");
				expect(obj.target).toBeGreaterThan(0);
				expect(obj.description).toBeTruthy();
				expect(obj.description.length).toBeGreaterThan(10);
			}
		}
	});

	it("every reward has the standard structure", () => {
		for (const quest of getAllQuests()) {
			expect(Array.isArray(quest.rewards.blueprints)).toBe(true);
			expect(Array.isArray(quest.rewards.tech)).toBe(true);
			expect(Array.isArray(quest.rewards.reinforcements)).toBe(true);
			expect(Array.isArray(quest.rewards.items)).toBe(true);
		}
	});

	it("every quest grants at least one reward", () => {
		for (const quest of getAllQuests()) {
			const totalRewards =
				quest.rewards.blueprints.length +
				quest.rewards.tech.length +
				quest.rewards.reinforcements.length +
				quest.rewards.items.length;
			expect(totalRewards).toBeGreaterThan(0);
		}
	});

	it("otter projection references a valid otter ID", () => {
		const otterIds = new Set(getAllOtterIds());
		const violations: string[] = [];
		for (const quest of getAllQuests()) {
			if (!otterIds.has(quest.otterProjection)) {
				violations.push(
					`${quest.id} references unknown otter: ${quest.otterProjection}`,
				);
			}
		}
		expect(violations).toEqual([]);
	});

	it("dialogue keys reference existing dialogue IDs", () => {
		const dialogueIds = new Set(getAllDialogueIds());
		const violations: string[] = [];
		for (const quest of getAllQuests()) {
			for (const key of quest.dialogueKeys) {
				if (!dialogueIds.has(key)) {
					violations.push(
						`${quest.id} references unknown dialogue: ${key}`,
					);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("no quest descriptions contain placeholder text", () => {
		const violations: string[] = [];
		for (const quest of getAllQuests()) {
			if (containsPlaceholder(quest.name)) {
				violations.push(`quest name: ${quest.name}`);
			}
			if (containsPlaceholder(quest.description)) {
				violations.push(`quest desc: ${quest.description}`);
			}
			for (const obj of quest.objectives) {
				if (containsPlaceholder(obj.description)) {
					violations.push(`objective desc: ${obj.description}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Prerequisite validity
// ---------------------------------------------------------------------------

describe("prerequisite validity", () => {
	const allIds = new Set(getAllQuestIds());

	it("every prerequisite references an existing quest ID", () => {
		const missing: string[] = [];
		for (const quest of getAllQuests()) {
			for (const prereq of quest.prerequisites) {
				if (!allIds.has(prereq)) {
					missing.push(`${quest.id} -> ${prereq}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it("act 1 has at least one quest with no prerequisites (entry point)", () => {
		const act1 = questsConfig.questLines.find(
			(ql) => ql.id === "act1_awakening",
		);
		expect(act1).toBeDefined();
		const entryQuests = act1!.quests.filter(
			(q) => q.prerequisites.length === 0,
		);
		expect(entryQuests.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// No circular dependencies (DAG check)
// ---------------------------------------------------------------------------

describe("no circular dependencies", () => {
	it("quest prerequisite graph is acyclic (DAG)", () => {
		const quests = getAllQuests();

		// Kahn's algorithm for topological sort
		const inDegree = new Map<string, number>();
		const adjacency = new Map<string, string[]>();

		for (const quest of quests) {
			if (!inDegree.has(quest.id)) inDegree.set(quest.id, 0);
			if (!adjacency.has(quest.id)) adjacency.set(quest.id, []);

			for (const prereq of quest.prerequisites) {
				if (!adjacency.has(prereq)) adjacency.set(prereq, []);
				adjacency.get(prereq)!.push(quest.id);
				inDegree.set(quest.id, (inDegree.get(quest.id) ?? 0) + 1);
			}
		}

		const queue: string[] = [];
		for (const [id, degree] of inDegree) {
			if (degree === 0) queue.push(id);
		}

		let visited = 0;
		while (queue.length > 0) {
			const current = queue.shift()!;
			visited++;
			for (const neighbor of adjacency.get(current) ?? []) {
				const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
				inDegree.set(neighbor, newDegree);
				if (newDegree === 0) queue.push(neighbor);
			}
		}

		const totalQuests = quests.length;
		if (visited !== totalQuests) {
			const inCycle = quests
				.filter((q) => (inDegree.get(q.id) ?? 0) > 0)
				.map((q) => q.id);
			fail(`Circular dependency detected involving: ${inCycle.join(", ")}`);
		}

		expect(visited).toBe(totalQuests);
	});
});

// ---------------------------------------------------------------------------
// Secret Dialogues
// ---------------------------------------------------------------------------

describe("secret dialogues", () => {
	it("has exactly 5 secret dialogues", () => {
		expect(questsConfig.secretDialogues).toHaveLength(5);
	});

	it("secret dialogue IDs are unique", () => {
		const ids = questsConfig.secretDialogues.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each secret dialogue has required fields", () => {
		for (const secret of questsConfig.secretDialogues) {
			expect(secret.id).toBeTruthy();
			expect(secret.name).toBeTruthy();
			expect(secret.trigger).toBeDefined();
			expect(secret.trigger.type).toBeTruthy();
			expect(secret.trigger.condition).toBeTruthy();
			expect(secret.trigger.description).toBeTruthy();
			expect(secret.trigger.description.length).toBeGreaterThan(10);
			expect(secret.otterProjection).toBeTruthy();
			expect(Array.isArray(secret.dialogue)).toBe(true);
			expect(secret.dialogue.length).toBeGreaterThanOrEqual(3);
			expect(secret.rewards).toBeDefined();
		}
	});

	it("secret dialogues contain no placeholder text", () => {
		const violations: string[] = [];
		for (const secret of questsConfig.secretDialogues) {
			for (const line of secret.dialogue) {
				if (containsPlaceholder(line)) {
					violations.push(`${secret.id}: "${line}"`);
				}
			}
			if (containsPlaceholder(secret.trigger.description)) {
				violations.push(`${secret.id} trigger: "${secret.trigger.description}"`);
			}
		}
		expect(violations).toEqual([]);
	});

	it("secret dialogue rewards have standard structure", () => {
		for (const secret of questsConfig.secretDialogues) {
			expect(Array.isArray(secret.rewards.blueprints)).toBe(true);
			expect(Array.isArray(secret.rewards.tech)).toBe(true);
			expect(Array.isArray(secret.rewards.reinforcements)).toBe(true);
			expect(Array.isArray(secret.rewards.items)).toBe(true);
		}
	});

	it("each secret dialogue grants at least one reward", () => {
		for (const secret of questsConfig.secretDialogues) {
			const totalRewards =
				secret.rewards.blueprints.length +
				secret.rewards.tech.length +
				secret.rewards.reinforcements.length +
				secret.rewards.items.length;
			expect(totalRewards).toBeGreaterThan(0);
		}
	});

	it("expected secret dialogues are present", () => {
		const ids = questsConfig.secretDialogues.map((s) => s.id);
		expect(ids).toContain("the_paw_hold");
		expect(ids).toContain("the_architects_echo");
		expect(ids).toContain("the_weight_of_cubes");
		expect(ids).toContain("the_long_watch");
		expect(ids).toContain("the_last_otter");
	});
});

// ---------------------------------------------------------------------------
// Cross-referencing
// ---------------------------------------------------------------------------

describe("cross-references", () => {
	it("every trust stage is used by at least one quest line", () => {
		const usedStages = new Set(questsConfig.questLines.map((ql) => ql.trustStage));
		for (const stage of questsConfig.trustArc.stages) {
			expect(usedStages.has(stage.id)).toBe(true);
		}
	});

	it("every otter projection appears in at least one quest", () => {
		const usedOtters = new Set(getAllQuests().map((q) => q.otterProjection));
		for (const otter of questsConfig.otterProjections) {
			expect(usedOtters.has(otter.id)).toBe(true);
		}
	});

	it("total dialogue lines across all otters exceeds 30", () => {
		let totalLines = 0;
		for (const otter of questsConfig.otterProjections) {
			for (const dialogue of otter.dialogues) {
				totalLines += dialogue.lines.length;
			}
		}
		expect(totalLines).toBeGreaterThan(30);
	});
});
