/**
 * Production error handling — assert + throw, never swallow + continue.
 *
 * GameError carries structured context: which system failed, what entity
 * was involved, and a snapshot of relevant state. The DebugOverlay and
 * ErrorBoundary both consume this.
 */

export class GameError extends Error {
	readonly system: string;
	readonly entityId?: string;
	readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		system: string,
		options?: {
			entityId?: string;
			context?: Record<string, unknown>;
			cause?: unknown;
		},
	) {
		super(`[${system}] ${message}`, { cause: options?.cause });
		this.name = "GameError";
		this.system = system;
		this.entityId = options?.entityId;
		this.context = options?.context;
	}
}

/**
 * Assert a condition is truthy. Throws GameError with context on failure.
 * Use this instead of silent `if (!x) return` for required data.
 */
export function gameAssert(
	condition: unknown,
	message: string,
	system: string,
	context?: Record<string, unknown>,
): asserts condition {
	if (!condition) {
		throw new GameError(message, system, { context });
	}
}

// --- Error log ring buffer (last N errors for DebugOverlay) ---

export interface ErrorLogEntry {
	timestamp: number;
	message: string;
	system: string;
	entityId?: string;
	stack?: string;
}

const MAX_LOG_ENTRIES = 20;
const errorLog: ErrorLogEntry[] = [];
const errorListeners = new Set<() => void>();

export function logError(error: unknown): void {
	const entry: ErrorLogEntry = {
		timestamp: Date.now(),
		message: "Unknown error",
		system: "unknown",
	};

	if (error instanceof GameError) {
		entry.message = error.message;
		entry.system = error.system;
		entry.entityId = error.entityId;
		entry.stack = error.stack;
	} else if (error instanceof Error) {
		entry.message = error.message;
		entry.stack = error.stack;
	} else {
		entry.message = String(error);
	}

	errorLog.push(entry);
	if (errorLog.length > MAX_LOG_ENTRIES) {
		errorLog.shift();
	}

	// Also log to console for dev tools
	console.error(`[GameError] ${entry.message}`, error);

	for (const listener of errorListeners) {
		listener();
	}
}

export function getErrorLog(): readonly ErrorLogEntry[] {
	return errorLog;
}

export function subscribeErrors(listener: () => void): () => void {
	errorListeners.add(listener);
	return () => errorListeners.delete(listener);
}

export function clearErrorLog(): void {
	errorLog.length = 0;
	for (const listener of errorListeners) {
		listener();
	}
}
