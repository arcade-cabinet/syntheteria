/**
 * Tutorial → Otter hologram bridge.
 *
 * Syncs tutorial step dialogue to the nearest otter entity's speech bubble.
 * Call `syncTutorialToOtter()` each tick (or on step change) to keep the
 * otter hologram's lines in sync with the current tutorial step.
 *
 * This is the missing pipe between:
 *   tutorialSystem.ts (produces otterDialogue per step)
 *   OtterRenderer.tsx (reads entity.otter.lines for speech bubbles)
 *
 * NOTE: Accesses the ECS world lazily (inside function body) to avoid
 * triggering the full world initialization chain at import time, which
 * breaks test suites that mock config differently.
 */

import { getCurrentStep, isTutorialActive } from "./tutorialSystem";

/** Track which step was last synced to avoid redundant writes. */
let lastSyncedStepId: string | null = null;

/**
 * Sync the current tutorial step's dialogue to the first otter entity.
 *
 * When the tutorial step changes, this updates the otter's `lines` array
 * so the OtterRenderer displays the new dialogue in the speech bubble.
 *
 * Call this from the game loop tick or wherever tutorial progress is checked.
 */
export function syncTutorialToOtter(): void {
	if (!isTutorialActive()) return;

	const step = getCurrentStep();
	if (!step) return;

	// Only update when the step actually changed
	if (step.id === lastSyncedStepId) return;
	lastSyncedStepId = step.id;

	// Lazy import to avoid module-level initialization cascade
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { otters } = require("../ecs/world") as typeof import("../ecs/world");

	// Find the first otter entity (Pip — the tutorial guide)
	const otterArray = Array.from(otters);
	if (otterArray.length === 0) return;

	const pip = otterArray[0];
	pip.otter.lines = [step.otterDialogue];
}

/**
 * Reset bridge state (for new game / tests).
 */
export function resetTutorialOtterBridge(): void {
	lastSyncedStepId = null;
}
