/**
 * Transient movement feedback messages.
 * Shown briefly when a move command fails (no path, insufficient MP).
 */

export interface MovementToast {
	message: string;
	timestamp: number;
}

const TOAST_DURATION_MS = 2000;

let currentToast: MovementToast | null = null;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

export function showMovementToast(message: string): void {
	currentToast = { message, timestamp: Date.now() };
	notify();
	setTimeout(() => {
		if (currentToast?.message === message) {
			currentToast = null;
			notify();
		}
	}, TOAST_DURATION_MS);
}

export function getMovementToast(): MovementToast | null {
	if (currentToast && Date.now() - currentToast.timestamp > TOAST_DURATION_MS) {
		currentToast = null;
	}
	return currentToast;
}

export function subscribeMovementToast(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function _resetMovementFeedback(): void {
	currentToast = null;
}
