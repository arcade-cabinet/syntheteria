/**
 * Quest dialogue system — manages otter speech lines tied to quest
 * progression stages.
 *
 * Otters speak when a quest starts, at progress milestones (e.g. 50%),
 * and on completion. Lines are read from config/quests.json dialogue
 * entries.
 *
 * The system maintains a FIFO queue so otters don't interrupt each
 * other — each line is shown for a minimum duration before the next
 * can appear.
 */

import questConfig from "../../config/quests.json";
import {
	getActiveQuests,
	getQuestProgress,
	getQuestState,
	onQuestComplete,
} from "./questSystem";

// ---------------------------------------------------------------------------
// Dialogue lookup — resolve dialogueKeys to actual lines via otterProjections
// ---------------------------------------------------------------------------

interface OtterDialogue {
	id: string;
	trigger: string;
	lines: string[];
}

/** Cache mapping dialogueKey id → dialogue entry from otterProjections. */
const dialogueLookup: Map<string, OtterDialogue> = new Map();
let lookupBuilt = false;

function buildDialogueLookup(): void {
	if (lookupBuilt) return;
	lookupBuilt = true;

	const config = questConfig as { otterProjections?: Array<{ dialogues?: OtterDialogue[] }> };
	if (!config.otterProjections) return;

	for (const otter of config.otterProjections) {
		if (!otter.dialogues) continue;
		for (const d of otter.dialogues) {
			dialogueLookup.set(d.id, d);
		}
	}
}

/**
 * Resolve dialogue lines for a quest at a given stage by looking up
 * dialogueKeys in the otterProjections config.
 *
 * Stage-to-trigger mapping:
 *   "start"       → trigger prefix "quest_start:<questId>"
 *   "progress_50" → trigger prefix "quest_progress:<questId>" (or fallback to start lines)
 *   "complete"    → trigger prefix "quest_complete:<questId>"
 */
function resolveDialogueLines(
	questId: string,
	dialogueKeys: string[],
	stage: string,
): string[] {
	buildDialogueLookup();

	// Map stage to expected trigger prefix
	const triggerPrefix =
		stage === "start"
			? `quest_start:${questId}`
			: stage === "complete"
				? `quest_complete:${questId}`
				: stage === "progress_50"
					? `quest_progress:${questId}`
					: null;

	// Look through the quest's dialogueKeys for a matching trigger
	for (const key of dialogueKeys) {
		const entry = dialogueLookup.get(key);
		if (!entry) continue;

		if (triggerPrefix && entry.trigger === triggerPrefix) {
			return entry.lines;
		}
	}

	// For "start" stage, fall back to the first dialogueKey's lines
	// (most quests only have one dialogueKey mapped to quest_start)
	if (stage === "start" && dialogueKeys.length > 0) {
		const entry = dialogueLookup.get(dialogueKeys[0]);
		if (entry) return entry.lines;
	}

	return [];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogueEntry {
	questId: string;
	line: string;
	stage: string; // "start" | "progress_50" | "complete" | etc.
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Ordered queue of lines to display. */
const dialogueQueue: DialogueEntry[] = [];

/** Tracks which stage dialogue has already been triggered per quest. */
const triggeredStages: Map<string, Set<string>> = new Map();

/** How long (seconds) each line is displayed before advancing. */
const LINE_DISPLAY_DURATION = 4.0;

/** Accumulated time for current line display. */
let displayTimer = 0;

/** Currently displayed entry (head of queue). */
let currentEntry: DialogueEntry | null = null;

/** Whether the completion listener has been registered. */
let listenerRegistered = false;

/** useSyncExternalStore-compatible listeners for dialogue changes. */
const dialogueListeners = new Set<() => void>();

function notifyDialogue(): void {
	for (const fn of dialogueListeners) fn();
}

/** Subscribe to dialogue state changes (useSyncExternalStore API). */
export function subscribeDialogue(callback: () => void): () => void {
	dialogueListeners.add(callback);
	return () => dialogueListeners.delete(callback);
}

/** Stable snapshot accessor for useSyncExternalStore. */
export function getDialogueSnapshot(): DialogueEntry | null {
	return currentEntry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the next dialogue line for a given quest and progress.
 * Returns null if no new dialogue is available.
 *
 * This is a pull-based interface for systems that want to check dialogue
 * without using the queue.
 */
export function getNextDialogue(
	questId: string,
	progress: number,
): string | null {
	const state = getQuestState(questId);
	if (!state) return null;

	const def = state.definition;
	// Aggregate target from all objectives
	const target = state.objectiveStates.reduce(
		(sum, os) => sum + os.target,
		0,
	);

	// Determine which stage we're in
	let stage: string;
	if (state.status === "COMPLETED") {
		stage = "complete";
	} else if (target > 0 && progress / target >= 0.5) {
		stage = "progress_50";
	} else if (state.status === "ACTIVE" && progress === 0) {
		stage = "start";
	} else {
		return null;
	}

	// Check if this stage has dialogue and hasn't been shown
	const triggered = getTriggered(questId);
	if (triggered.has(stage)) return null;

	const lines = resolveDialogueLines(questId, def.dialogueKeys, stage);
	if (lines.length === 0) return null;

	// Mark as shown and return the first line
	triggered.add(stage);
	return lines[0];
}

/**
 * Enqueue dialogue lines for a quest stage. Called by the quest system
 * when events trigger dialogue (quest start, milestone, completion).
 */
export function enqueueDialogue(questId: string, stage: string): void {
	const state = getQuestState(questId);
	if (!state) return;

	const triggered = getTriggered(questId);
	if (triggered.has(stage)) return;

	const lines = resolveDialogueLines(
		questId,
		state.definition.dialogueKeys,
		stage,
	);
	if (lines.length === 0) return;

	triggered.add(stage);
	for (const line of lines) {
		dialogueQueue.push({ questId, line, stage });
	}
}

/**
 * Get the currently displayed dialogue entry, or null if the queue is empty.
 */
export function getCurrentDialogue(): DialogueEntry | null {
	return currentEntry;
}

/**
 * Get the full dialogue queue (for debugging or UI display).
 */
export function getDialogueQueue(): readonly DialogueEntry[] {
	return dialogueQueue;
}

/**
 * Advance to the next dialogue entry. Called by UI on click/tap.
 * Returns true if there was a next entry to advance to.
 */
export function advanceDialogue(): boolean {
	if (dialogueQueue.length > 0) {
		dialogueQueue.shift();
		displayTimer = 0;
		currentEntry = dialogueQueue.length > 0 ? dialogueQueue[0] : null;
		notifyDialogue();
		return currentEntry !== null;
	}
	currentEntry = null;
	notifyDialogue();
	return false;
}

/**
 * Update dialogue timer. Called once per frame (not tick) with delta in seconds.
 * Automatically advances dialogue after LINE_DISPLAY_DURATION.
 */
export function updateDialogue(delta: number): void {
	ensureListenerRegistered();

	// Populate current entry from queue head
	if (!currentEntry && dialogueQueue.length > 0) {
		currentEntry = dialogueQueue[0];
		displayTimer = 0;
		notifyDialogue();
	}

	if (!currentEntry) return;

	displayTimer += delta;
	if (displayTimer >= LINE_DISPLAY_DURATION) {
		advanceDialogue();
	}

	// Check active quests for milestone dialogue triggers
	checkMilestones();
}

/**
 * Check active quests and enqueue any milestone dialogue that hasn't
 * been triggered yet.
 */
export function checkMilestones(): void {
	for (const quest of getActiveQuests()) {
		const progress = getQuestProgress(quest.id);
		if (!progress) continue;

		const ratio = progress.target > 0 ? progress.current / progress.target : 0;

		// Check start dialogue (when quest first becomes active)
		if (quest.status === "ACTIVE" && progress.current === 0) {
			enqueueDialogue(quest.id, "start");
		}

		// Check 50% milestone
		if (ratio >= 0.5) {
			enqueueDialogue(quest.id, "progress_50");
		}
	}
}

/**
 * Reset all dialogue state. Primarily for testing.
 */
export function resetDialogue(): void {
	dialogueQueue.length = 0;
	triggeredStages.clear();
	displayTimer = 0;
	currentEntry = null;
	listenerRegistered = false;
	dialogueLookup.clear();
	lookupBuilt = false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getTriggered(questId: string): Set<string> {
	let set = triggeredStages.get(questId);
	if (!set) {
		set = new Set();
		triggeredStages.set(questId, set);
	}
	return set;
}

function ensureListenerRegistered(): void {
	if (listenerRegistered) return;
	listenerRegistered = true;

	onQuestComplete((questId) => {
		enqueueDialogue(questId, "complete");
	});
}
