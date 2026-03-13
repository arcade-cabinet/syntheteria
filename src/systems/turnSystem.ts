/**
 * Turn System — Civilization-style turn-based gameplay.
 *
 * Replaces the real-time simulation tick with a turn structure:
 *   1. Player turn: each unit gets Action Points (AP) and Movement Points (MP)
 *   2. Units with remaining AP/MP show an emissive glow ring
 *   3. Player performs actions until all AP/MP spent or clicks "End Turn"
 *   4. AI opponent factions take their turns sequentially
 *   5. New turn begins with refreshed AP/MP
 *
 * The turn system coexists with the existing simulation tick —
 * systems that need continuous updates (weather, lightning, rendering)
 * still tick, but gameplay actions are gated by AP/MP.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UnitTurnState {
	entityId: string;
	/** Action points remaining this turn (harvest, build, repair, attack, hack) */
	actionPoints: number;
	/** Maximum action points per turn */
	maxActionPoints: number;
	/** Movement points remaining this turn */
	movementPoints: number;
	/** Maximum movement points per turn */
	maxMovementPoints: number;
	/** Whether this unit has been activated (selected) this turn */
	activated: boolean;
}

export type TurnPhase = "player" | "ai_faction" | "environment";

export interface TurnState {
	/** Current turn number (starts at 1) */
	turnNumber: number;
	/** Current phase within the turn */
	phase: TurnPhase;
	/** Which faction is currently acting (during ai_faction phase) */
	activeFaction: string;
	/** Per-unit turn state */
	unitStates: Map<string, UnitTurnState>;
	/** Whether any player unit has remaining actions */
	playerHasActions: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Base action points per turn (before Mark modifiers) */
const BASE_ACTION_POINTS = 2;
/** Base movement points per turn (before Mark modifiers) */
const BASE_MOVEMENT_POINTS = 3;

// ─── State ───────────────────────────────────────────────────────────────────

let turnState: TurnState = {
	turnNumber: 1,
	phase: "player",
	activeFaction: "player",
	unitStates: new Map(),
	playerHasActions: true,
};

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getTurnState(): TurnState {
	return turnState;
}

export function subscribeTurnState(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Initialize turn state for all player units at game start or turn begin.
 */
export function initializeTurnForUnits(
	unitIds: string[],
	markLevels?: Map<string, number>,
) {
	const unitStates = new Map<string, UnitTurnState>();

	for (const id of unitIds) {
		const markLevel = markLevels?.get(id) ?? 1;
		// Mark progression gives logarithmic bonus to AP/MP
		const markBonus = Math.floor(Math.log2(markLevel));

		unitStates.set(id, {
			entityId: id,
			actionPoints: BASE_ACTION_POINTS + markBonus,
			maxActionPoints: BASE_ACTION_POINTS + markBonus,
			movementPoints: BASE_MOVEMENT_POINTS + markBonus,
			maxMovementPoints: BASE_MOVEMENT_POINTS + markBonus,
			activated: false,
		});
	}

	turnState = {
		...turnState,
		unitStates,
		playerHasActions: unitIds.length > 0,
	};
	notify();
}

/**
 * Spend an action point for a unit. Returns false if insufficient AP.
 */
export function spendActionPoint(entityId: string, cost = 1): boolean {
	const unit = turnState.unitStates.get(entityId);
	if (!unit || unit.actionPoints < cost) return false;

	unit.actionPoints -= cost;
	unit.activated = true;
	updatePlayerHasActions();
	notify();
	return true;
}

/**
 * Spend movement points for a unit. Returns false if insufficient MP.
 */
export function spendMovementPoints(entityId: string, cost = 1): boolean {
	const unit = turnState.unitStates.get(entityId);
	if (!unit || unit.movementPoints < cost) return false;

	unit.movementPoints -= cost;
	unit.activated = true;
	updatePlayerHasActions();
	notify();
	return true;
}

/**
 * Check if a unit has remaining action points.
 */
export function hasActionPoints(entityId: string): boolean {
	const unit = turnState.unitStates.get(entityId);
	return !!unit && unit.actionPoints > 0;
}

/**
 * Check if a unit has remaining movement points.
 */
export function hasMovementPoints(entityId: string): boolean {
	const unit = turnState.unitStates.get(entityId);
	return !!unit && unit.movementPoints > 0;
}

/**
 * Check if a unit has any remaining points (action OR movement).
 */
export function hasAnyPoints(entityId: string): boolean {
	return hasActionPoints(entityId) || hasMovementPoints(entityId);
}

/**
 * Get the unit turn state for rendering (glow rings, etc.)
 */
export function getUnitTurnState(entityId: string): UnitTurnState | undefined {
	return turnState.unitStates.get(entityId);
}

/**
 * End the player's turn. Triggers AI faction turns, then starts new turn.
 */
export function endPlayerTurn() {
	if (turnState.phase !== "player") return;

	// AI faction phase (simplified — runs immediately for now)
	turnState = {
		...turnState,
		phase: "ai_faction",
		activeFaction: "rival_machine",
	};
	notify();

	// TODO: AI faction actions would go here
	// For now, skip straight to environment phase

	// Environment phase (storm, weather, cultist pressure)
	turnState = {
		...turnState,
		phase: "environment",
		activeFaction: "environment",
	};
	notify();

	// New turn
	startNewTurn();
}

/**
 * Start a new turn — refresh all unit AP/MP.
 */
function startNewTurn() {
	const nextTurn = turnState.turnNumber + 1;

	// Refresh all unit states
	for (const [_id, unit] of turnState.unitStates) {
		unit.actionPoints = unit.maxActionPoints;
		unit.movementPoints = unit.maxMovementPoints;
		unit.activated = false;
	}

	turnState = {
		...turnState,
		turnNumber: nextTurn,
		phase: "player",
		activeFaction: "player",
		playerHasActions: turnState.unitStates.size > 0,
	};
	notify();
}

function updatePlayerHasActions() {
	let hasActions = false;
	for (const [_, unit] of turnState.unitStates) {
		if (unit.actionPoints > 0 || unit.movementPoints > 0) {
			hasActions = true;
			break;
		}
	}
	turnState.playerHasActions = hasActions;
}

/**
 * Reset turn state — call on new game.
 */
export function resetTurnSystem() {
	turnState = {
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
		unitStates: new Map(),
		playerHasActions: true,
	};
}
