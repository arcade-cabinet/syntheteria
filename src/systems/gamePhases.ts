/**
 * Game phase system — 3-phase progression.
 *
 * Awakening -> Expansion -> War
 *
 * Phase triggers (checked each tick):
 * - Awakening -> Expansion: player founds first base, OR player unit exits
 *   city bounds, OR elapsed >= 900s, OR 3+ rooms cleared
 * - Expansion -> War: cult escalation reaches tier 3, OR elapsed >= 2100s
 *
 * Phase transitions emit a pending phase ID so the UI can play the
 * corresponding narrative sequence (EXPANSION_SEQUENCE, WAR_SEQUENCE).
 */

import {
	type GamePhaseId,
	getNextPhase,
	PHASE_DEFS,
} from "../config/phaseDefs";
import { isInsideCityBounds } from "../ecs/cityLayout";
import { Base, Faction, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import { getCurrentTierLevel } from "./cultEscalation";

export type { GamePhaseId };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentPhase: GamePhaseId = "awakening";
let elapsedGameSec = 0;
let pendingTransitionPhaseId: GamePhaseId | null = null;
let pendingTransitionText: string[] | null = null;
let roomsCleared = 0;
let baseFounded = false;

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

/** Record that the player founded a base (Awakening->Expansion trigger). */
export function recordBaseFounded(): void {
	baseFounded = true;
}

/** Reset phase state for a new game */
export function resetPhaseState(): void {
	currentPhase = "awakening";
	elapsedGameSec = 0;
	pendingTransitionPhaseId = null;
	pendingTransitionText = null;
	roomsCleared = 0;
	baseFounded = false;
}

// ---------------------------------------------------------------------------
// Trigger checks
// ---------------------------------------------------------------------------

/** Returns true if any player unit is outside the city bounds. */
function anyPlayerUnitOutsideCity(): boolean {
	for (const entity of world.query(Unit, Faction, Position)) {
		if (entity.get(Faction)!.value !== "player") continue;
		const pos = entity.get(Position)!;
		if (!isInsideCityBounds(pos.x, pos.z)) return true;
	}
	return false;
}

/** Returns true if cult escalation has reached tier 3. */
function cultReachedTier3(): boolean {
	return getCurrentTierLevel() >= 3;
}

/** Returns true if the player has founded at least one base. */
function playerHasBase(): boolean {
	if (baseFounded) return true;
	// Also check ECS for any existing player bases
	for (const entity of world.query(Base, Faction)) {
		if (entity.get(Faction)?.value === "player") {
			baseFounded = true;
			return true;
		}
	}
	return false;
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

	// Condition-based triggers (primary)
	if (nextPhaseId === "expansion") {
		// Awakening -> Expansion: base founded OR unit left city
		shouldTransition = playerHasBase() || anyPlayerUnitOutsideCity();
	} else if (nextPhaseId === "war") {
		shouldTransition = cultReachedTier3();
	}

	// Time-based fallback trigger
	if (!shouldTransition && elapsedGameSec >= nextDef.timeThresholdSec) {
		shouldTransition = true;
	}

	// Early trigger: rooms cleared threshold
	if (
		!shouldTransition &&
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
