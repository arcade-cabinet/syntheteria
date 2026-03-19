/**
 * Turn Phase Events — observable event stream for turn transitions.
 *
 * The turn system fires phase changes synchronously.
 * This module captures those transitions as discrete events that UI
 * components can subscribe to for visual feedback (screen flash,
 * phase labels, AI action highlights).
 *
 * Events are ephemeral — they are consumed and cleared, not stored.
 *
 * Ported from pending/systems/turnPhaseEvents.ts — TurnPhase inlined.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type TurnPhase = "player" | "ai_faction" | "environment";

export interface TurnPhaseEvent {
	type: "phase_change";
	fromPhase: TurnPhase | null;
	toPhase: TurnPhase;
	turnNumber: number;
	/** Which AI faction is active (only set during ai_faction phase) */
	activeFaction: string | null;
	timestamp: number;
}

export interface TurnEndEvent {
	type: "turn_end";
	/** The turn that just ended */
	turnNumber: number;
	timestamp: number;
}

export interface NewTurnEvent {
	type: "new_turn";
	/** The new turn number */
	turnNumber: number;
	timestamp: number;
}

export type TurnEvent = TurnPhaseEvent | TurnEndEvent | NewTurnEvent;

export type TurnEventListener = (event: TurnEvent) => void;

// ─── State ──────────────────────────────────────────────────────────────────

const listeners = new Set<TurnEventListener>();
let lastPhase: TurnPhase | null = null;
let lastTurnNumber = 0;
let _lastFaction = "";

// ─── Public API ─────────────────────────────────────────────────────────────

export function subscribeTurnPhaseEvents(listener: TurnEventListener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Emit a turn event to all listeners.
 */
export function emitTurnPhaseEvent(event: TurnEvent) {
	for (const listener of listeners) {
		listener(event);
	}
}

/**
 * Called by the turn system subscriber to detect and emit phase transitions.
 * Should be called whenever turn state changes.
 */
export function detectPhaseTransition(
	phase: TurnPhase,
	turnNumber: number,
	activeFaction: string,
) {
	const now = performance.now();

	// Detect new turn
	if (turnNumber > lastTurnNumber && lastTurnNumber > 0) {
		emitTurnPhaseEvent({
			type: "turn_end",
			turnNumber: lastTurnNumber,
			timestamp: now,
		});
		emitTurnPhaseEvent({
			type: "new_turn",
			turnNumber,
			timestamp: now,
		});
	}

	// Detect phase change
	if (phase !== lastPhase || activeFaction !== _lastFaction) {
		emitTurnPhaseEvent({
			type: "phase_change",
			fromPhase: lastPhase,
			toPhase: phase,
			turnNumber,
			activeFaction: phase === "ai_faction" ? activeFaction : null,
			timestamp: now,
		});
	}

	lastPhase = phase;
	lastTurnNumber = turnNumber;
	_lastFaction = activeFaction;
}

/**
 * Reset for testing.
 */
export function _resetTurnPhaseEvents() {
	listeners.clear();
	lastPhase = null;
	lastTurnNumber = 0;
	_lastFaction = "";
}
