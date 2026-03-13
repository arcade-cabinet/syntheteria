/**
 * Autosave System — automatically saves every N turns after the environment phase.
 *
 * Registers an environment phase handler that triggers a non-blocking save
 * after the configured interval. Pushes an "Autosaved" notification via
 * the notification store so the UI can show a brief toast.
 *
 * Default interval: every 5 turns.
 */

import { type SaveAllResult, saveAllStateSync } from "../db/saveAllState";
import { registerEnvironmentPhaseHandler } from "./turnSystem";

// ─── Configuration ───────────────────────────────────────────────────────────

const AUTOSAVE_INTERVAL = 5;

// ─── Notification callback ───────────────────────────────────────────────────

export type AutosaveNotifyFn = (result: SaveAllResult) => void;

let notifyCallback: AutosaveNotifyFn | null = null;

/**
 * Set a callback that fires after each autosave attempt.
 * The UI layer uses this to show a toast notification.
 */
export function setAutosaveNotify(cb: AutosaveNotifyFn | null) {
	notifyCallback = cb;
}

// ─── Enable / Disable ────────────────────────────────────────────────────────

let enabled = true;

export function setAutosaveEnabled(value: boolean) {
	enabled = value;
}

export function isAutosaveEnabled(): boolean {
	return enabled;
}

// ─── Handler Registration ────────────────────────────────────────────────────

registerEnvironmentPhaseHandler((turnNumber) => {
	if (!enabled) return;
	if (turnNumber % AUTOSAVE_INTERVAL !== 0) return;

	// Use setTimeout(0) to avoid blocking the turn resolution
	setTimeout(() => {
		const result = saveAllStateSync();
		if (notifyCallback) {
			notifyCallback(result);
		}
	}, 0);
});
