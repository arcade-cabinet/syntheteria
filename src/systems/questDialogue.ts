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

import {
	getActiveQuests,
	getQuestProgress,
	getQuestState,
	onQuestComplete,
} from "./questSystem";

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
	const target = def.target;

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

	const lines = def.dialogue[stage];
	if (!lines || lines.length === 0) return null;

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

	const lines = state.definition.dialogue[stage];
	if (!lines || lines.length === 0) return;

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
		return currentEntry !== null;
	}
	currentEntry = null;
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
