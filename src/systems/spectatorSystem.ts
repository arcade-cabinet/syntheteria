/**
 * Spectator system — AI-vs-AI observation mode.
 *
 * When spectator mode is active:
 *   - FPSCamera and FPSInput are disabled
 *   - TopDownCamera takes over (free pan/zoom)
 *   - SpectatorHUD shows speed controls and faction labels
 *   - Game simulation continues normally
 *
 * Activated from the title screen "SPECTATE" button or via
 * setSpectatorMode(true) before game launch.
 *
 * Speed presets: 0.5x, 1x, 2x, 4x (clamped to setGameSpeed range).
 */

import { setGameSpeed } from "../ecs/gameState";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _spectatorActive = false;
let _spectatorSpeed = 1.0;

const _listeners = new Set<() => void>();

function notify(): void {
	for (const fn of _listeners) fn();
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export interface SpectatorSnapshot {
	active: boolean;
	speed: number;
}

let _snapshot: SpectatorSnapshot = { active: false, speed: 1.0 };

function refreshSnapshot(): void {
	_snapshot = { active: _spectatorActive, speed: _spectatorSpeed };
	notify();
}

/** Subscribe to spectator state changes (useSyncExternalStore API). */
export function subscribeSpectator(callback: () => void): () => void {
	_listeners.add(callback);
	return () => _listeners.delete(callback);
}

/** Stable snapshot for useSyncExternalStore. */
export function getSpectatorSnapshot(): SpectatorSnapshot {
	return _snapshot;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Enter or exit spectator mode. */
export function setSpectatorMode(active: boolean): void {
	_spectatorActive = active;
	if (!active) {
		// Reset speed to normal on exit
		_spectatorSpeed = 1.0;
		setGameSpeed(1.0);
	}
	refreshSnapshot();
}

/** True when spectator mode is active. */
export function isSpectatorActive(): boolean {
	return _spectatorActive;
}

/** Set simulation speed (0.5–4.0). Clamped to game engine limits. */
export function setSpectatorSpeed(speed: number): void {
	_spectatorSpeed = Math.max(0.5, Math.min(4.0, speed));
	setGameSpeed(_spectatorSpeed);
	refreshSnapshot();
}

/** Get the current spectator simulation speed. */
export function getSpectatorSpeed(): number {
	return _spectatorSpeed;
}

/** Available speed presets for the HUD controls. */
export const SPEED_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
	{ label: "0.5×", value: 0.5 },
	{ label: "1×", value: 1.0 },
	{ label: "2×", value: 2.0 },
	{ label: "4×", value: 4.0 },
];

/** Reset for tests and menu returns. */
export function resetSpectator(): void {
	_spectatorActive = false;
	_spectatorSpeed = 1.0;
	_snapshot = { active: false, speed: 1.0 };
	notify();
}
