/**
 * turnEvents — module-level event log store.
 *
 * Systems call pushTurnEvent() to log game events.
 * TurnLog component subscribes and renders them.
 */

export interface TurnEvent {
	readonly turn: number;
	readonly message: string;
	readonly timestamp: number;
}

const MAX_EVENTS = 100;
let events: TurnEvent[] = [];
let currentTurn = 1;

type Listener = () => void;
const listeners = new Set<Listener>();

export function setCurrentTurn(turn: number): void {
	currentTurn = turn;
}

export function pushTurnEvent(message: string): void {
	events.push({ turn: currentTurn, message, timestamp: Date.now() });
	if (events.length > MAX_EVENTS) {
		events = events.slice(-MAX_EVENTS);
	}
	for (const fn of listeners) fn();
}

export function getTurnEvents(): readonly TurnEvent[] {
	return events;
}

export function clearTurnEvents(): void {
	events = [];
	for (const fn of listeners) fn();
}

export function subscribeTurnEvents(fn: Listener): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
