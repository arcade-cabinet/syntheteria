/**
 * Game phase system — 3-phase progression.
 *
 * Awakening → Expansion → War
 *
 * Phases advance by time thresholds or player conditions (rooms cleared).
 * Phase transitions unlock buildings, Mark tiers, and cult escalation tiers.
 * The current phase is stored as module state and exposed via getters.
 */

import {
	type GamePhaseId,
	getNextPhase,
	PHASE_DEFS,
} from "../config/phaseDefs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentPhase: GamePhaseId = "awakening";
let elapsedGameSec = 0;
let roomsCleared = 0;
let pendingTransitionText: string[] | null = null;

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

/** Record that a room was cleared (for early Expansion trigger) */
export function recordRoomCleared(): void {
	roomsCleared++;
}

/** Get the number of rooms cleared */
export function getRoomsCleared(): number {
	return roomsCleared;
}

/**
 * Pop any pending transition text (narrative to show on phase change).
 * Returns null if no transition occurred since last call.
 */
export function popTransitionText(): string[] | null {
	const text = pendingTransitionText;
	pendingTransitionText = null;
	return text;
}

/** Reset phase state for a new game */
export function resetPhaseState(): void {
	currentPhase = "awakening";
	elapsedGameSec = 0;
	roomsCleared = 0;
	pendingTransitionText = null;
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

	// Check time threshold
	const timeReached = elapsedGameSec >= nextDef.timeThresholdSec;

	// Check optional early-trigger condition
	const earlyTrigger =
		nextDef.roomsClearedThreshold !== null &&
		roomsCleared >= nextDef.roomsClearedThreshold;

	if (timeReached || earlyTrigger) {
		currentPhase = nextPhaseId;
		pendingTransitionText = nextDef.transitionText;
	}
}
