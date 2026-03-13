/**
 * @module turnSystem
 *
 * Civilization-style turn-based AP/MP system. Gates all gameplay actions (harvest,
 * build, move, attack) behind per-unit Action Points and Movement Points that
 * refresh each turn. Sequences player -> AI factions -> environment phases.
 *
 * @exports TurnState / UnitTurnState / TurnPhase - Core state types
 * @exports getTurnState / subscribeTurnState - Read and observe turn state
 * @exports initializeTurnForUnits / addUnitsToTurnState - Set up unit AP/MP pools
 * @exports spendActionPoint / spendMovementPoints - Consume AP/MP for actions
 * @exports hasActionPoints / hasMovementPoints / hasAnyPoints - Point availability checks
 * @exports getUnitTurnState - Per-unit state for rendering (glow rings)
 * @exports endPlayerTurn - Trigger AI faction turns, environment phase, then new turn
 * @exports registerAIFactionTurnHandler / registerEnvironmentPhaseHandler - Phase hooks
 * @exports resetTurnSystem / rehydrateTurnState - Reset and save/load support
 *
 * @dependencies narrative (queueThought), resourceDeltas (finalizeTurnDeltas),
 *   turnEventLog (finalizeTurn, logTurnEvent)
 * @consumers combat, movement, clickToMove, moveCommand, hacking, harvestSystem,
 *   unitSelection, victoryConditions, tutorialSystem, tooltipSystem, factionSpawning,
 *   turnPhaseHandlers, turnPhaseEvents, autosave, keyboardShortcuts, radialProviders,
 *   playtestBridge, DiplomacyModal, GameHUD, VictoryOverlay, GlowRingRenderer,
 *   ActionRangeRenderer, MovementOverlayRenderer, UnitRosterPanel, UnitInput,
 *   PlayerGovernor, factionGovernors, audioHooks, saveAllState, initialization,
 *   persistenceSystem, cultistIncursion, turretAutoAttack, UnitRenderer
 */

import { queueThought } from "./narrative";
import { finalizeTurnDeltas } from "./resourceDeltas";
import { finalizeTurn, logTurnEvent } from "./turnEventLog";

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
 * Add units to the existing turn state without replacing current entries.
 * Used to register rival faction units alongside player units.
 */
export function addUnitsToTurnState(
	unitIds: string[],
	markLevels?: Map<string, number>,
) {
	for (const id of unitIds) {
		const markLevel = markLevels?.get(id) ?? 1;
		const markBonus = Math.floor(Math.log2(markLevel));

		turnState.unitStates.set(id, {
			entityId: id,
			actionPoints: BASE_ACTION_POINTS + markBonus,
			maxActionPoints: BASE_ACTION_POINTS + markBonus,
			movementPoints: BASE_MOVEMENT_POINTS + markBonus,
			maxMovementPoints: BASE_MOVEMENT_POINTS + markBonus,
			activated: false,
		});
	}
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

// ─── AI Faction Turn Hooks ──────────────────────────────────────────────────

/** Known AI factions — each takes a turn sequentially after the player. */
const AI_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];

export type AIFactionTurnHandler = (
	factionId: string,
	turnNumber: number,
) => void;
export type EnvironmentPhaseHandler = (turnNumber: number) => void;

const aiFactionTurnHandlers: AIFactionTurnHandler[] = [];
const environmentPhaseHandlers: EnvironmentPhaseHandler[] = [];

/**
 * Register a handler that runs for each AI faction during their turn.
 * Handlers are called sequentially per faction.
 */
export function registerAIFactionTurnHandler(handler: AIFactionTurnHandler) {
	aiFactionTurnHandlers.push(handler);
}

/**
 * Register a handler that runs during the environment phase.
 */
export function registerEnvironmentPhaseHandler(
	handler: EnvironmentPhaseHandler,
) {
	environmentPhaseHandlers.push(handler);
}

/**
 * End the player's turn. Triggers AI faction turns, then environment phase, then new turn.
 */
export function endPlayerTurn() {
	if (turnState.phase !== "player") return;

	queueThought("turn_awareness");

	// AI faction phase — each faction takes a sequential turn
	turnState = {
		...turnState,
		phase: "ai_faction",
	};

	for (const factionId of AI_FACTIONS) {
		turnState = {
			...turnState,
			activeFaction: factionId,
		};
		notify();

		// Run all registered AI turn handlers for this faction
		for (const handler of aiFactionTurnHandlers) {
			handler(factionId, turnState.turnNumber);
		}
	}

	// Environment phase (storm, weather, cultist pressure)
	turnState = {
		...turnState,
		phase: "environment",
		activeFaction: "environment",
	};
	notify();

	// Run all registered environment phase handlers
	for (const handler of environmentPhaseHandlers) {
		handler(turnState.turnNumber);
	}

	// Snapshot resource deltas before resetting for new turn
	finalizeTurnDeltas();

	// Log turn_end and finalize the turn's event log
	logTurnEvent("turn_end", null, "system", {
		turnNumber: turnState.turnNumber,
		totalUnits: turnState.unitStates.size,
	});
	finalizeTurn();

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

/**
 * Rehydrate turn state from a save.
 */
export function rehydrateTurnState(saved: {
	turnNumber: number;
	phase: TurnPhase;
	activeFaction: string;
	unitStates: UnitTurnState[];
}) {
	const unitStates = new Map<string, UnitTurnState>();
	for (const u of saved.unitStates) {
		unitStates.set(u.entityId, { ...u });
	}
	turnState = {
		turnNumber: saved.turnNumber,
		phase: saved.phase,
		activeFaction: saved.activeFaction,
		unitStates,
		playerHasActions: false,
	};
	updatePlayerHasActions();
	notify();
}
