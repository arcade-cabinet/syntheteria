/**
 * Turn Event Log — Structured log of all actions per turn.
 *
 * Records every gameplay action during a turn as structured JSON.
 * Feeds the playtest report and enables replay analysis.
 *
 * Events are organized by turn number. At the end of each turn,
 * the current turn's events are finalized and a new accumulator starts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type TurnEventType =
	| "movement"
	| "harvest_start"
	| "harvest_complete"
	| "combat"
	| "hacking"
	| "exploration"
	| "construction"
	| "fabrication"
	| "repair"
	| "survey"
	| "establish"
	| "turn_end"
	| "unit_destroyed"
	| "unit_captured"
	| "environment"
	| "ai_faction_turn"
	| "cultist_spawn"
	| "cultist_attack"
	| "research_complete"
	| "wormhole_stage"
	| "victory";

export interface TurnEvent {
	type: TurnEventType;
	timestamp: number;
	entityId: string | null;
	faction: string;
	details: Record<string, unknown>;
}

export interface TurnLog {
	turnNumber: number;
	events: TurnEvent[];
}

// ─── State ───────────────────────────────────────────────────────────────────

let currentTurn = 1;
let currentEvents: TurnEvent[] = [];
const completedTurns: TurnLog[] = [];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Log an event for the current turn.
 */
export function logTurnEvent(
	type: TurnEventType,
	entityId: string | null,
	faction: string,
	details: Record<string, unknown> = {},
) {
	currentEvents.push({
		type,
		timestamp: Date.now(),
		entityId,
		faction,
		details,
	});
}

/**
 * Finalize the current turn's events and advance to the next turn.
 */
export function finalizeTurn() {
	completedTurns.push({
		turnNumber: currentTurn,
		events: [...currentEvents],
	});
	currentEvents = [];
	currentTurn++;
}

/**
 * Get events for the current (incomplete) turn.
 */
export function getCurrentTurnEvents(): readonly TurnEvent[] {
	return currentEvents;
}

/**
 * Get all completed turn logs.
 */
export function getCompletedTurnLogs(): readonly TurnLog[] {
	return completedTurns;
}

/**
 * Get the current turn number.
 */
export function getCurrentTurnNumber(): number {
	return currentTurn;
}

/**
 * Get a specific completed turn's log by turn number.
 */
export function getTurnLog(turnNumber: number): TurnLog | undefined {
	return completedTurns.find((log) => log.turnNumber === turnNumber);
}

/**
 * Rehydrate turn event log from persisted state.
 */
export function rehydrateTurnEventLog(
	turnNumber: number,
	logs: TurnLog[],
) {
	completedTurns.length = 0;
	for (const log of logs) {
		completedTurns.push(log);
	}
	currentTurn = turnNumber;
	currentEvents = [];
}

/**
 * Reset turn event log — call on new game.
 */
export function resetTurnEventLog() {
	currentTurn = 1;
	currentEvents = [];
	completedTurns.length = 0;
}
