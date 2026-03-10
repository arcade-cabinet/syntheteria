/**
 * Ordered command execution queue.
 *
 * Commands are queued with a type and priority, then executed in priority
 * order (highest first) during each game tick. Supports cancellation,
 * batch execution, and a rolling history of recent commands.
 *
 * Command types:
 *   - player_action: direct player input (move, interact, build)
 *   - ai_order: AI governor / unit brain decisions
 *   - system_event: engine-generated events (spawn, despawn, weather)
 *   - deferred: delayed actions scheduled for future execution
 *
 * No external config dependency — this is infrastructure, not game logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandType = "player_action" | "ai_order" | "system_event" | "deferred";

export type CommandPriority = 0 | 1 | 2 | 3;

export type CommandStatus = "pending" | "executing" | "completed" | "failed";

export interface Command {
	id: string;
	type: CommandType;
	priority: CommandPriority;
	payload: Record<string, unknown>;
	createdTick: number;
	executedTick: number | null;
	status: CommandStatus;
}

/** Result returned by processCommands and processBatch. */
export interface ProcessResult {
	executed: number;
	failed: number;
}

/** Handler function that executes a command's payload. */
export type CommandHandler = (command: Command) => void;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Monotonically increasing command ID counter. */
let nextId = 1;

/** Pending commands awaiting execution. */
let queue: Command[] = [];

/** Circular history of recently executed commands. */
let history: Command[] = [];

/** Maximum number of commands to retain in history. */
const MAX_HISTORY = 200;

/** Registered handler called for each command during execution. */
let handler: CommandHandler | null = null;

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------

/**
 * Register the function that will be called to execute each command.
 * Only one handler is active at a time; calling again replaces the previous.
 */
export function setCommandHandler(fn: CommandHandler): void {
	handler = fn;
}

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

/**
 * Add a command to the queue.
 *
 * @param type       - The command category.
 * @param priority   - 0=low, 1=normal, 2=high, 3=critical.
 * @param payload    - Arbitrary serialisable data for the handler.
 * @param createdTick - The game tick when this command was created (default 0).
 * @returns The newly created Command object.
 */
export function enqueueCommand(
	type: CommandType,
	priority: CommandPriority,
	payload: Record<string, unknown>,
	createdTick = 0,
): Command {
	const command: Command = {
		id: `cmd_${nextId++}`,
		type,
		priority,
		payload,
		createdTick,
		executedTick: null,
		status: "pending",
	};

	queue.push(command);
	return command;
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

/**
 * Execute up to `maxPerTick` pending commands, highest priority first.
 * Commands at the same priority level execute in FIFO order.
 *
 * @param currentTick - The game tick number used to stamp executed commands.
 * @param maxPerTick  - Maximum commands to process this tick (default 10).
 * @returns Count of executed and failed commands.
 */
export function processCommands(currentTick: number, maxPerTick = 10): ProcessResult {
	// Stable sort: highest priority first, then insertion order (FIFO).
	queue.sort((a, b) => b.priority - a.priority);

	const toProcess = queue.splice(0, maxPerTick);
	let executed = 0;
	let failed = 0;

	for (const cmd of toProcess) {
		cmd.status = "executing";
		cmd.executedTick = currentTick;

		try {
			if (handler) {
				handler(cmd);
			}
			cmd.status = "completed";
			executed++;
		} catch {
			cmd.status = "failed";
			failed++;
		}

		pushHistory(cmd);
	}

	return { executed, failed };
}

/**
 * Execute an array of commands atomically (all-or-nothing).
 * If any command's handler throws, remaining commands are not executed
 * and all commands in the batch are marked as failed.
 *
 * @param commands - Array of pre-built Command objects to execute.
 * @param currentTick - The game tick number.
 * @returns Count of executed and failed commands.
 */
export function processBatch(
	commands: Command[],
	currentTick: number,
): ProcessResult {
	if (commands.length === 0) {
		return { executed: 0, failed: 0 };
	}

	const results: Command[] = [];
	let batchFailed = false;

	for (const cmd of commands) {
		cmd.status = "executing";
		cmd.executedTick = currentTick;

		try {
			if (!batchFailed && handler) {
				handler(cmd);
			}
			if (!batchFailed) {
				cmd.status = "completed";
			} else {
				cmd.status = "failed";
			}
		} catch {
			batchFailed = true;
			cmd.status = "failed";
		}

		results.push(cmd);
	}

	// If the batch failed, mark all previously-completed commands as failed too.
	if (batchFailed) {
		for (const cmd of results) {
			cmd.status = "failed";
			pushHistory(cmd);
		}
		return { executed: 0, failed: results.length };
	}

	for (const cmd of results) {
		pushHistory(cmd);
	}

	return { executed: results.length, failed: 0 };
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * Remove a pending command from the queue by ID.
 *
 * @returns `true` if the command was found and removed, `false` otherwise.
 */
export function cancelCommand(id: string): boolean {
	const index = queue.findIndex((cmd) => cmd.id === id);
	if (index === -1) return false;

	queue.splice(index, 1);
	return true;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/**
 * Retrieve the most recent executed commands.
 *
 * @param count - Number of commands to return (default: all history).
 * @returns Commands in most-recent-first order.
 */
export function getCommandHistory(count?: number): Command[] {
	const reversed = [...history].reverse();
	if (count !== undefined && count >= 0) {
		return reversed.slice(0, count);
	}
	return reversed;
}

// ---------------------------------------------------------------------------
// Queue inspection
// ---------------------------------------------------------------------------

/**
 * Number of commands currently pending in the queue.
 */
export function getPendingCount(): number {
	return queue.filter((cmd) => cmd.status === "pending").length;
}

/**
 * Total length of the queue (including any non-pending entries,
 * though in normal operation these will all be pending).
 */
export function getQueueLength(): number {
	return queue.length;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Push a command into the history buffer, evicting the oldest entry if
 * the buffer exceeds MAX_HISTORY.
 */
function pushHistory(cmd: Command): void {
	history.push(cmd);
	if (history.length > MAX_HISTORY) {
		history = history.slice(history.length - MAX_HISTORY);
	}
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all queued commands, history, and the registered handler.
 * Primarily for test isolation.
 */
export function reset(): void {
	queue = [];
	history = [];
	nextId = 1;
	handler = null;
}
