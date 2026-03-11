/**
 * Quest system — drives the narrative quest progression tied to SABLE's trust
 * arc. Quests are organized into quest lines (acts), each associated with a
 * trust stage. Each quest has multiple objectives that track independently.
 *
 * Config: config/quests.json
 * Structure: trustArc → stages, questLines → quests → objectives
 *
 * Objective types match game events:
 *   harvest_ore, compress_cubes, furnace_craft, stack_cubes, build_structure,
 *   build_wall, transport_cube_on_belt, defeat_enemies, discover_deposit,
 *   ship_cubes, explore_biome, discover_faction, observe_faction,
 *   encounter_entity, scan_structure, listen_to_dialogue, repair_structure,
 *   interact_structure, experience_vision, make_choice, etc.
 */

import questConfig from "../../config/quests.json";
import { addResource, onResourceGain, type ResourcePool } from "./resources";

// ---------------------------------------------------------------------------
// Types — match the quests.json structure directly
// ---------------------------------------------------------------------------

export type QuestStatus = "NOT_STARTED" | "ACTIVE" | "COMPLETED";

export interface QuestObjective {
	type: string;
	target: number;
	description?: string;
	resource?: string;
	buildingType?: string;
	recipe?: string;
	biome?: string;
	entity?: string;
	structure?: string;
}

export interface QuestRewards {
	blueprints: string[];
	tech: string[];
	reinforcements: string[];
	items: string[];
}

export interface QuestDefinition {
	id: string;
	name: string;
	description: string;
	prerequisites: string[];
	objectives: QuestObjective[];
	rewards: QuestRewards;
	otterProjection: string;
	dialogueKeys: string[];
	/** Which quest line (act) this quest belongs to */
	questLineId: string;
	/** Which trust stage this quest line maps to */
	trustStage: string;
}

export interface ObjectiveState {
	current: number;
	target: number;
	completed: boolean;
}

export interface QuestState {
	id: string;
	status: QuestStatus;
	objectiveStates: ObjectiveState[];
	definition: QuestDefinition;
}

export interface QuestProgress {
	current: number;
	target: number;
	description: string;
}

// ---------------------------------------------------------------------------
// Events — game systems notify the quest system
// ---------------------------------------------------------------------------

export type QuestEventType =
	| "resource_gained"
	| "component_fabricated"
	| "building_placed"
	| "recipe_completed"
	| "territory_claimed"
	| "feral_defeated"
	| "cube_compressed"
	| "cube_stacked"
	| "cube_transported"
	| "cube_shipped"
	| "deposit_discovered"
	| "biome_explored"
	| "faction_discovered"
	| "faction_observed"
	| "entity_encountered"
	| "entity_observed"
	| "structure_scanned"
	| "structure_repaired"
	| "structure_interacted"
	| "dialogue_listened"
	| "vision_experienced"
	| "choice_made"
	| "wall_built"
	| "structure_defended";

export interface QuestEvent {
	type: QuestEventType;
	detail?: string;
	amount?: number;
}

// ---------------------------------------------------------------------------
// Event → objective type mapping
// ---------------------------------------------------------------------------

const EVENT_TO_OBJECTIVE: Record<QuestEventType, string[]> = {
	resource_gained: ["harvest_ore"],
	cube_compressed: ["compress_cubes"],
	component_fabricated: ["furnace_craft"],
	cube_stacked: ["stack_cubes"],
	building_placed: ["build_structure"],
	wall_built: ["build_wall"],
	cube_transported: ["transport_cube_on_belt"],
	feral_defeated: ["defeat_enemies"],
	deposit_discovered: ["discover_deposit"],
	cube_shipped: ["ship_cubes"],
	biome_explored: ["explore_biome"],
	faction_discovered: ["discover_faction"],
	faction_observed: ["observe_faction"],
	entity_encountered: ["encounter_entity"],
	entity_observed: ["observe_entity"],
	structure_scanned: ["scan_structure"],
	dialogue_listened: ["listen_to_dialogue"],
	structure_repaired: ["repair_structure"],
	structure_interacted: ["interact_structure"],
	vision_experienced: ["experience_vision"],
	choice_made: ["make_choice"],
	recipe_completed: ["furnace_craft"],
	territory_claimed: ["build_structure"],
	structure_defended: ["defend_structure"],
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const questDefinitions: QuestDefinition[] = [];
const questStates: Map<string, QuestState> = new Map();
const completionCallbacks: Array<(questId: string) => void> = [];
let initialized = false;
let resourceUnsubscribe: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Config types — mirror quests.json top-level structure
// ---------------------------------------------------------------------------

interface QuestConfigLine {
	id: string;
	name: string;
	trustStage: string;
	description: string;
	quests: Array<{
		id: string;
		name: string;
		description: string;
		prerequisites: string[];
		objectives: Array<{
			type: string;
			target: number;
			description?: string;
			resource?: string;
			buildingType?: string;
			recipe?: string;
			biome?: string;
			entity?: string;
			structure?: string;
		}>;
		rewards: {
			blueprints: string[];
			tech: string[];
			reinforcements: string[];
			items: string[];
		};
		otterProjection: string;
		dialogueKeys: string[];
	}>;
}

interface QuestConfig {
	questLines: QuestConfigLine[];
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function loadDefinitions(): void {
	if (initialized) return;
	initialized = true;

	resourceUnsubscribe = onResourceGain((type, amount) => {
		notifyQuestEvent({ type: "resource_gained", detail: type, amount });
	});

	const config = questConfig as unknown as QuestConfig;

	for (const line of config.questLines) {
		for (const quest of line.quests) {
			const definition: QuestDefinition = {
				id: quest.id,
				name: quest.name,
				description: quest.description,
				prerequisites: quest.prerequisites,
				objectives: quest.objectives.map((o) => ({
					type: o.type,
					target: o.target,
					description: o.description,
					resource: o.resource,
					buildingType: o.buildingType,
					recipe: o.recipe,
					biome: o.biome,
					entity: o.entity,
					structure: o.structure,
				})),
				rewards: {
					blueprints: quest.rewards?.blueprints ?? [],
					tech: quest.rewards?.tech ?? [],
					reinforcements: quest.rewards?.reinforcements ?? [],
					items: quest.rewards?.items ?? [],
				},
				otterProjection: quest.otterProjection,
				dialogueKeys: quest.dialogueKeys,
				questLineId: line.id,
				trustStage: line.trustStage,
			};

			questDefinitions.push(definition);
			questStates.set(quest.id, {
				id: quest.id,
				status: "NOT_STARTED",
				objectiveStates: quest.objectives.map((o) => ({
					current: 0,
					target: o.target,
					completed: false,
				})),
				definition,
			});
		}
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startQuest(questId: string): boolean {
	loadDefinitions();

	const state = questStates.get(questId);
	if (!state) return false;
	if (state.status !== "NOT_STARTED") return false;

	// Check prerequisites
	for (const prereqId of state.definition.prerequisites) {
		const prereq = questStates.get(prereqId);
		if (!prereq || prereq.status !== "COMPLETED") return false;
	}

	state.status = "ACTIVE";
	for (const os of state.objectiveStates) {
		os.current = 0;
		os.completed = false;
	}
	return true;
}

export function notifyQuestEvent(event: QuestEvent): void {
	loadDefinitions();

	for (const state of questStates.values()) {
		if (state.status !== "ACTIVE") continue;
		advanceQuest(state, event);
	}
}

export function updateQuests(_delta: number): void {
	loadDefinitions();

	for (const state of questStates.values()) {
		if (state.status !== "ACTIVE") continue;

		const allComplete = state.objectiveStates.every((os) => os.completed);
		if (allComplete) {
			completeQuest(state);
		}
	}
}

export function getActiveQuests(): QuestState[] {
	loadDefinitions();
	return Array.from(questStates.values()).filter((q) => q.status === "ACTIVE");
}

export function getQuestProgress(questId: string): QuestProgress | null {
	loadDefinitions();

	const state = questStates.get(questId);
	if (!state) return null;

	// Aggregate progress across all objectives
	const totalTarget = state.objectiveStates.reduce(
		(sum, os) => sum + os.target,
		0,
	);
	const totalCurrent = state.objectiveStates.reduce(
		(sum, os) => sum + Math.min(os.current, os.target),
		0,
	);

	return {
		current: totalCurrent,
		target: totalTarget,
		description: state.definition.description,
	};
}

export function isQuestComplete(questId: string): boolean {
	loadDefinitions();
	const state = questStates.get(questId);
	return state?.status === "COMPLETED";
}

export function getQuestState(questId: string): QuestState | null {
	loadDefinitions();
	return questStates.get(questId) ?? null;
}

export function getQuestSequence(): readonly QuestDefinition[] {
	loadDefinitions();
	return questDefinitions;
}

export function onQuestComplete(
	callback: (questId: string) => void,
): () => void {
	completionCallbacks.push(callback);
	return () => {
		const idx = completionCallbacks.indexOf(callback);
		if (idx !== -1) completionCallbacks.splice(idx, 1);
	};
}

export function autoStartFirstQuest(): boolean {
	loadDefinitions();

	for (const state of questStates.values()) {
		if (state.status !== "NOT_STARTED") return false;
	}

	if (questDefinitions.length > 0) {
		return startQuest(questDefinitions[0].id);
	}
	return false;
}

export function resetQuests(): void {
	questStates.clear();
	questDefinitions.length = 0;
	completionCallbacks.length = 0;
	if (resourceUnsubscribe) {
		resourceUnsubscribe();
		resourceUnsubscribe = null;
	}
	initialized = false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function advanceQuest(state: QuestState, event: QuestEvent): void {
	const matchingObjectiveTypes = EVENT_TO_OBJECTIVE[event.type] ?? [];

	for (let i = 0; i < state.definition.objectives.length; i++) {
		const objective = state.definition.objectives[i];
		const objState = state.objectiveStates[i];

		if (objState.completed) continue;
		if (!matchingObjectiveTypes.includes(objective.type)) continue;

		// Check detail match (resource, building type, etc.)
		if (objective.resource && event.detail !== objective.resource) continue;
		if (objective.buildingType && event.detail !== objective.buildingType)
			continue;
		if (objective.recipe && event.detail !== objective.recipe) continue;
		if (objective.biome && event.detail !== objective.biome) continue;
		if (objective.entity && event.detail !== objective.entity) continue;
		if (objective.structure && event.detail !== objective.structure) continue;

		objState.current += event.amount ?? 1;
		if (objState.current >= objState.target) {
			objState.current = objState.target;
			objState.completed = true;
		}
	}
}

function completeQuest(state: QuestState): void {
	state.status = "COMPLETED";

	// Award item rewards as resources where applicable
	const rewards = state.definition.rewards;
	for (const item of rewards.items) {
		addResource(item as keyof ResourcePool, 1);
	}

	// Notify listeners
	for (const cb of completionCallbacks) {
		cb(state.id);
	}

	// Auto-start next quest in sequence (within same quest line)
	const idx = questDefinitions.findIndex((d) => d.id === state.id);
	if (idx >= 0 && idx < questDefinitions.length - 1) {
		const next = questDefinitions[idx + 1];
		// Only auto-start if it's in the same quest line and prerequisites are met
		if (next.questLineId === state.definition.questLineId) {
			startQuest(next.id);
		}
	}
}
