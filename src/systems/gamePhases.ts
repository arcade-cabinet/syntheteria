/**
 * Game phase system — 3-phase progression.
 *
 * Awakening → Expansion → War
 *
 * Phase triggers (checked each tick):
 * - Awakening → Expansion: elapsed >= 900s OR 3+ rooms cleared
 * - Expansion → War: elapsed >= 2100s
 *
 * Phase transitions store pending transition text so the UI can play
 * the corresponding narrative sequence.
 */

import {
	type GamePhaseId,
	getNextPhase,
	PHASE_DEFS,
} from "../config/phaseDefs";

export type { GamePhaseId };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentPhase: GamePhaseId = "awakening";
let elapsedGameSec = 0;
let pendingTransitionPhaseId: GamePhaseId | null = null;
let pendingTransitionText: string[] | null = null;
let roomsCleared = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get the current game phase ID */
export function getCurrentGamePhase(): GamePhaseId {
	return currentPhase;
}

/** Get elapsed game time in seconds */
export function getPhaseElapsedSec(): number {
	return elapsedGameSec;
}

/** Get the display name of the current phase */
export function getCurrentPhaseDisplayName(): string {
	return PHASE_DEFS[currentPhase].displayName;
}

/** Get the max Mark tier allowed in the current phase */
export function getMaxMarkTier(): number {
	return PHASE_DEFS[currentPhase].maxMarkTier;
}

/** Get the cult escalation tier for the current phase */
export function getPhaseCultTier(): number {
	return PHASE_DEFS[currentPhase].cultEscalationTier;
}

/** Check if a building type is unlocked in the current phase */
export function isBuildingUnlockedInCurrentPhase(
	buildingType: string,
): boolean {
	return PHASE_DEFS[currentPhase].unlockedBuildings.includes(buildingType);
}

/**
 * Pop the pending phase transition ID (the phase that was just entered).
 * Returns null if no transition occurred since last call.
 * Used by App.tsx to determine which narrative sequence to play.
 */
export function popPhaseTransitionId(): GamePhaseId | null {
	const id = pendingTransitionPhaseId;
	pendingTransitionPhaseId = null;
	return id;
}

/**
 * Pop the pending transition text (narrative lines for the phase just entered).
 * Returns null if no transition occurred since last call.
 * Consumed on read — second call returns null until next transition.
 */
export function popTransitionText(): string[] | null {
	const text = pendingTransitionText;
	pendingTransitionText = null;
	return text;
}

/** Get number of rooms cleared (used for early Expansion trigger). */
export function getRoomsCleared(): number {
	return roomsCleared;
}

/** Record that a room was cleared (call when player clears a labyrinth room). */
export function recordRoomCleared(): void {
	roomsCleared++;
}

/** Reset phase state for a new game */
export function resetPhaseState(): void {
	currentPhase = "awakening";
	elapsedGameSec = 0;
	pendingTransitionPhaseId = null;
	pendingTransitionText = null;
	roomsCleared = 0;
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/**
 * Phase system tick. Called once per sim tick.
 *
 * @param deltaSec - Real seconds since last tick (adjusted by game speed)
 */
export function gamePhaseSystem(deltaSec: number): void {
	elapsedGameSec += deltaSec;

	const nextPhaseId = getNextPhase(currentPhase);
	if (!nextPhaseId) return; // already at final phase

	const nextDef = PHASE_DEFS[nextPhaseId];
	let shouldTransition = false;

	// Time-based trigger
	if (elapsedGameSec >= nextDef.timeThresholdSec) {
		shouldTransition = true;
	}

	// Early trigger: rooms cleared threshold
	if (
		nextDef.roomsClearedThreshold !== null &&
		roomsCleared >= nextDef.roomsClearedThreshold
	) {
		shouldTransition = true;
	}

	if (shouldTransition) {
		currentPhase = nextPhaseId;
		pendingTransitionPhaseId = nextPhaseId;
		pendingTransitionText = nextDef.transitionText;
	}
}
