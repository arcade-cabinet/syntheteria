/**
 * Quest state machine — tracks quest progression from NOT_STARTED through
 * ACTIVE to COMPLETED.
 *
 * Quest definitions are loaded from config/quests.json. The system checks
 * completion conditions each tick and awards rewards on completion.
 *
 * Quest types:
 * - harvest_N_ore      — collect N of a specific resource
 * - compress_N_cubes   — fabricate N components (any recipe)
 * - build_first_wall   — place a specific building type
 * - assemble_first_machine — fabricate a specific recipe
 * - claim_territory    — establish N territories
 */

import questConfig from "../../../config/quests.json";
import { addResource, onResourceGain, type ResourcePool } from "./resources";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestStatus = "NOT_STARTED" | "ACTIVE" | "COMPLETED";

export type QuestType =
	| "harvest_N_ore"
	| "compress_N_cubes"
	| "build_first_wall"
	| "assemble_first_machine"
	| "claim_territory";

export interface QuestDefinition {
	id: string;
	name: string;
	description: string;
	type: QuestType;
	target: number;
	/** For harvest_N_ore — which resource key to track */
	resource?: string;
	/** For build_first_wall — which building type */
	buildingType?: string;
	/** For assemble_first_machine — which recipe name */
	recipe?: string;
	/** Resources awarded on completion */
	reward: Partial<Record<keyof ResourcePool, number>>;
	/** Dialogue lines keyed by stage */
	dialogue: Record<string, string[]>;
}

export interface QuestState {
	id: string;
	status: QuestStatus;
	current: number;
	definition: QuestDefinition;
}

export interface QuestProgress {
	current: number;
	target: number;
	description: string;
}

// ---------------------------------------------------------------------------
// Event listeners — external systems notify the quest system of events
// ---------------------------------------------------------------------------

export type QuestEventType =
	| "resource_gained"
	| "component_fabricated"
	| "building_placed"
	| "recipe_completed"
	| "territory_claimed"
	| "feral_defeated";

export interface QuestEvent {
	type: QuestEventType;
	/** Resource key, building type, or recipe name depending on event */
	detail?: string;
	amount?: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const questDefinitions: QuestDefinition[] = [];
const questStates: Map<string, QuestState> = new Map();
const completionCallbacks: Array<(questId: string) => void> = [];
let initialized = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let resourceUnsubscribe: (() => void) | null = null;

function loadDefinitions(): void {
	if (initialized) return;
	initialized = true;

	// Subscribe to resource scavenging events
	resourceUnsubscribe = onResourceGain((type, amount) => {
		notifyQuestEvent({ type: "resource_gained", detail: type, amount });
	});

	const config = questConfig as {
		sequence: string[];
		quests: Record<string, Omit<QuestDefinition, "id">>;
	};

	for (const questId of config.sequence) {
		const def = config.quests[questId];
		if (!def) continue;

		const definition: QuestDefinition = {
			id: questId,
			name: def.name,
			description: def.description,
			type: def.type as QuestType,
			target: def.target,
			resource: (def as Record<string, unknown>).resource as string | undefined,
			buildingType: (def as Record<string, unknown>).buildingType as
				| string
				| undefined,
			recipe: (def as Record<string, unknown>).recipe as string | undefined,
			reward: def.reward as Partial<Record<keyof ResourcePool, number>>,
			dialogue: def.dialogue,
		};

		questDefinitions.push(definition);
		questStates.set(questId, {
			id: questId,
			status: "NOT_STARTED",
			current: 0,
			definition,
		});
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start a quest. Returns true if the quest was successfully started.
 * A quest can only be started if it is in NOT_STARTED state.
 */
export function startQuest(questId: string): boolean {
	loadDefinitions();

	const state = questStates.get(questId);
	if (!state) return false;
	if (state.status !== "NOT_STARTED") return false;

	state.status = "ACTIVE";
	state.current = 0;
	return true;
}

/**
 * Process a game event that may advance quest progress.
 * Called by other systems when relevant events occur.
 */
export function notifyQuestEvent(event: QuestEvent): void {
	loadDefinitions();

	for (const state of questStates.values()) {
		if (state.status !== "ACTIVE") continue;
		advanceQuest(state, event);
	}
}

/**
 * Check and update all active quests. Called once per simulation tick.
 * Handles completion and unlocking of next quests in sequence.
 */
export function updateQuests(_delta: number): void {
	loadDefinitions();

	for (const state of questStates.values()) {
		if (state.status !== "ACTIVE") continue;

		if (state.current >= state.definition.target) {
			completeQuest(state);
		}
	}
}

/**
 * Get all currently active quests.
 */
export function getActiveQuests(): QuestState[] {
	loadDefinitions();
	return Array.from(questStates.values()).filter((q) => q.status === "ACTIVE");
}

/**
 * Get progress info for a specific quest.
 */
export function getQuestProgress(questId: string): QuestProgress | null {
	loadDefinitions();

	const state = questStates.get(questId);
	if (!state) return null;

	return {
		current: state.current,
		target: state.definition.target,
		description: state.definition.description,
	};
}

/**
 * Check whether a quest has been completed.
 */
export function isQuestComplete(questId: string): boolean {
	loadDefinitions();
	const state = questStates.get(questId);
	return state?.status === "COMPLETED";
}

/**
 * Get the state of a specific quest.
 */
export function getQuestState(questId: string): QuestState | null {
	loadDefinitions();
	return questStates.get(questId) ?? null;
}

/**
 * Get all quest definitions in sequence order.
 */
export function getQuestSequence(): readonly QuestDefinition[] {
	loadDefinitions();
	return questDefinitions;
}

/**
 * Register a callback that fires when any quest completes.
 * Used by the dialogue system to trigger otter speech.
 */
export function onQuestComplete(
	callback: (questId: string) => void,
): () => void {
	completionCallbacks.push(callback);
	return () => {
		const idx = completionCallbacks.indexOf(callback);
		if (idx !== -1) completionCallbacks.splice(idx, 1);
	};
}

/**
 * Auto-start the first quest if none are active and none completed.
 * Call this once after world setup.
 */
export function autoStartFirstQuest(): boolean {
	loadDefinitions();

	// If any quest is active or completed, don't auto-start
	for (const state of questStates.values()) {
		if (state.status !== "NOT_STARTED") return false;
	}

	if (questDefinitions.length > 0) {
		return startQuest(questDefinitions[0].id);
	}
	return false;
}

/**
 * Reset all quest state. Primarily for testing.
 */
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
	const def = state.definition;

	switch (def.type) {
		case "harvest_N_ore":
			if (event.type === "resource_gained" && event.detail === def.resource) {
				state.current += event.amount ?? 1;
			}
			if (
				event.type === "feral_defeated" &&
				def.resource === "feralsDefeated"
			) {
				state.current += event.amount ?? 1;
			}
			break;

		case "compress_N_cubes":
			if (event.type === "component_fabricated") {
				state.current += event.amount ?? 1;
			}
			break;

		case "build_first_wall":
			if (
				event.type === "building_placed" &&
				event.detail === def.buildingType
			) {
				state.current += event.amount ?? 1;
			}
			break;

		case "assemble_first_machine":
			if (event.type === "recipe_completed" && event.detail === def.recipe) {
				state.current += event.amount ?? 1;
			}
			break;

		case "claim_territory":
			if (event.type === "territory_claimed") {
				state.current += event.amount ?? 1;
			}
			break;
	}

	// Clamp to target
	if (state.current > state.definition.target) {
		state.current = state.definition.target;
	}
}

function completeQuest(state: QuestState): void {
	state.status = "COMPLETED";

	// Award rewards
	const reward = state.definition.reward;
	for (const [key, amount] of Object.entries(reward)) {
		if (amount && amount > 0) {
			addResource(key as keyof ResourcePool, amount);
		}
	}

	// Notify listeners
	for (const cb of completionCallbacks) {
		cb(state.id);
	}

	// Unlock next quest in sequence
	const idx = questDefinitions.findIndex((d) => d.id === state.id);
	if (idx >= 0 && idx < questDefinitions.length - 1) {
		const nextId = questDefinitions[idx + 1].id;
		startQuest(nextId);
	}
}
