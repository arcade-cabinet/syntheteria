/**
 * @module tutorialSystem
 *
 * Guided 3-turn onboarding flow. Walks the player through select unit, harvest,
 * build, end turn, and explore. Each step has instruction text and an optional
 * world-space objective marker. Skippable at any time.
 *
 * @exports TutorialStep / TutorialState - Step and state types
 * @exports getCurrentStep / getTutorialState / getAllSteps - State access
 * @exports completeCurrentStep / skipTutorial - Step progression
 * @exports isStepCompleted - Completion check
 * @exports subscribeTutorial - State change listener
 * @exports _reset - Reset for new game
 *
 * @dependencies turnSystem (getTurnState)
 * @consumers TutorialOverlay
 */

import { getTurnState } from "./turnSystem";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TutorialStep {
	id: string;
	turnNumber: number;
	instruction: string;
	/** Brief label for the objective marker */
	markerLabel: string | null;
	/** World-space position for the objective marker (null = no marker) */
	targetWorldPosition: { x: number; z: number } | null;
}

export interface TutorialState {
	active: boolean;
	skipped: boolean;
	currentStepIndex: number;
	completedSteps: string[];
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS: TutorialStep[] = [
	{
		id: "select_technician",
		turnNumber: 1,
		instruction: "Select your Field Technician",
		markerLabel: "Unit",
		targetWorldPosition: null, // dynamically resolved
	},
	{
		id: "harvest_structure",
		turnNumber: 1,
		instruction: "Click a nearby structure to harvest resources",
		markerLabel: "Structure",
		targetWorldPosition: null,
	},
	{
		id: "build_lightning_rod",
		turnNumber: 2,
		instruction: "Build a Lightning Rod for power",
		markerLabel: "Build",
		targetWorldPosition: null,
	},
	{
		id: "end_turn",
		turnNumber: 2,
		instruction: "End your turn to let the world advance",
		markerLabel: null,
		targetWorldPosition: null,
	},
	{
		id: "explore_sector",
		turnNumber: 3,
		instruction: "Move a unit to explore the nearby sector",
		markerLabel: "Explore",
		targetWorldPosition: null,
	},
];

// ─── State ───────────────────────────────────────────────────────────────────

let state: TutorialState = {
	active: false,
	skipped: false,
	currentStepIndex: 0,
	completedSteps: [],
};

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeTutorial(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getTutorialState(): TutorialState {
	return state;
}

/**
 * Get the current tutorial step, or null if tutorial is inactive/complete.
 */
export function getCurrentStep(): TutorialStep | null {
	if (!state.active || state.skipped) return null;
	if (state.currentStepIndex >= TUTORIAL_STEPS.length) return null;

	const step = TUTORIAL_STEPS[state.currentStepIndex];
	// Only show steps for the current turn or earlier
	const turn = getTurnState().turnNumber;
	if (step.turnNumber > turn) return null;

	return step;
}

/**
 * Complete the current tutorial step and advance to the next.
 */
export function completeCurrentStep() {
	if (!state.active || state.skipped) return;
	if (state.currentStepIndex >= TUTORIAL_STEPS.length) return;

	const step = TUTORIAL_STEPS[state.currentStepIndex];
	state = {
		...state,
		completedSteps: [...state.completedSteps, step.id],
		currentStepIndex: state.currentStepIndex + 1,
	};

	// Auto-deactivate when all steps done
	if (state.currentStepIndex >= TUTORIAL_STEPS.length) {
		state = { ...state, active: false };
	}

	notify();
}

/**
 * Skip the entire tutorial.
 */
export function skipTutorial() {
	state = { ...state, active: false, skipped: true };
	notify();
}

/**
 * Check if a specific step has been completed.
 */
export function isStepCompleted(stepId: string): boolean {
	return state.completedSteps.includes(stepId);
}

/**
 * Get all tutorial steps (for UI rendering).
 */
export function getAllSteps(): TutorialStep[] {
	return TUTORIAL_STEPS;
}

/**
 * Reset — call on new game.
 */
export function _reset() {
	state = {
		active: true,
		skipped: false,
		currentStepIndex: 0,
		completedSteps: [],
	};
}
