/**
 * Tests for the command queue system.
 *
 * Tests cover:
 * - enqueueCommand creates commands with correct fields
 * - processCommands executes highest priority first
 * - processCommands respects maxPerTick limit
 * - FIFO ordering within same priority
 * - Command status transitions: pending -> executing -> completed/failed
 * - Handler exceptions mark commands as failed
 * - cancelCommand removes pending commands
 * - getCommandHistory returns most-recent-first
 * - History buffer capped at 200
 * - getPendingCount and getQueueLength
 * - processBatch atomic execution (all-or-nothing)
 * - reset clears all state
 * - Edge cases: empty queue, no handler, double cancel
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	type Command,
	type CommandHandler,
	type CommandPriority,
	type CommandType,
	cancelCommand,
	enqueueCommand,
	getCommandHistory,
	getPendingCount,
	getQueueLength,
	processBatch,
	processCommands,
	reset,
	setCommandHandler,
} from "../commandQueue";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function enqueue(
	type: CommandType = "player_action",
	priority: CommandPriority = 1,
	payload: Record<string, unknown> = {},
	createdTick = 0,
): Command {
	return enqueueCommand(type, priority, payload, createdTick);
}

/** A handler that records which commands it ran. */
function trackingHandler(): { calls: Command[]; handler: CommandHandler } {
	const calls: Command[] = [];
	const handler: CommandHandler = (cmd) => {
		calls.push({ ...cmd });
	};
	return { calls, handler };
}

// ---------------------------------------------------------------------------
// enqueueCommand
// ---------------------------------------------------------------------------

describe("commandQueue -- enqueueCommand", () => {
	it("creates a command with correct fields", () => {
		const cmd = enqueue("ai_order", 2, { target: "base" }, 10);

		expect(cmd.id).toMatch(/^cmd_\d+$/);
		expect(cmd.type).toBe("ai_order");
		expect(cmd.priority).toBe(2);
		expect(cmd.payload).toEqual({ target: "base" });
		expect(cmd.createdTick).toBe(10);
		expect(cmd.executedTick).toBeNull();
		expect(cmd.status).toBe("pending");
	});

	it("assigns unique IDs to each command", () => {
		const a = enqueue();
		const b = enqueue();
		const c = enqueue();

		expect(new Set([a.id, b.id, c.id]).size).toBe(3);
	});

	it("supports all command types", () => {
		const types: CommandType[] = ["player_action", "ai_order", "system_event", "deferred"];
		for (const t of types) {
			const cmd = enqueue(t);
			expect(cmd.type).toBe(t);
		}
	});

	it("supports all priority levels", () => {
		const priorities: CommandPriority[] = [0, 1, 2, 3];
		for (const p of priorities) {
			const cmd = enqueue("player_action", p);
			expect(cmd.priority).toBe(p);
		}
	});

	it("defaults createdTick to 0", () => {
		const cmd = enqueueCommand("player_action", 1, {});
		expect(cmd.createdTick).toBe(0);
	});

	it("increments queue length", () => {
		expect(getQueueLength()).toBe(0);
		enqueue();
		expect(getQueueLength()).toBe(1);
		enqueue();
		expect(getQueueLength()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// processCommands — priority ordering
// ---------------------------------------------------------------------------

describe("commandQueue -- processCommands priority", () => {
	it("executes highest priority first", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		enqueue("player_action", 0, { label: "low" });
		enqueue("player_action", 3, { label: "critical" });
		enqueue("player_action", 1, { label: "normal" });
		enqueue("player_action", 2, { label: "high" });

		processCommands(1);

		const labels = calls.map((c) => c.payload.label);
		expect(labels).toEqual(["critical", "high", "normal", "low"]);
	});

	it("preserves FIFO within same priority", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		enqueue("player_action", 1, { order: 1 });
		enqueue("player_action", 1, { order: 2 });
		enqueue("player_action", 1, { order: 3 });

		processCommands(1);

		const orders = calls.map((c) => c.payload.order);
		expect(orders).toEqual([1, 2, 3]);
	});
});

// ---------------------------------------------------------------------------
// processCommands — maxPerTick
// ---------------------------------------------------------------------------

describe("commandQueue -- processCommands maxPerTick", () => {
	it("limits execution to maxPerTick", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		for (let i = 0; i < 5; i++) {
			enqueue("player_action", 1, { i });
		}

		processCommands(1, 3);

		expect(calls).toHaveLength(3);
		expect(getQueueLength()).toBe(2);
	});

	it("defaults maxPerTick to 10", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		for (let i = 0; i < 15; i++) {
			enqueue();
		}

		processCommands(1);

		expect(calls).toHaveLength(10);
		expect(getQueueLength()).toBe(5);
	});

	it("processes all when queue is smaller than maxPerTick", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		enqueue();
		enqueue();

		processCommands(1, 100);

		expect(calls).toHaveLength(2);
		expect(getQueueLength()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// processCommands — status transitions
// ---------------------------------------------------------------------------

describe("commandQueue -- command status", () => {
	it("marks commands as completed after successful execution", () => {
		setCommandHandler(() => {});

		enqueue();
		const result = processCommands(5);

		expect(result.executed).toBe(1);
		expect(result.failed).toBe(0);

		const history = getCommandHistory(1);
		expect(history[0].status).toBe("completed");
		expect(history[0].executedTick).toBe(5);
	});

	it("marks commands as failed when handler throws", () => {
		setCommandHandler(() => {
			throw new Error("boom");
		});

		enqueue();
		const result = processCommands(1);

		expect(result.executed).toBe(0);
		expect(result.failed).toBe(1);

		const history = getCommandHistory(1);
		expect(history[0].status).toBe("failed");
	});

	it("continues processing after a failure", () => {
		let callCount = 0;
		setCommandHandler(() => {
			callCount++;
			if (callCount === 2) throw new Error("fail second");
		});

		enqueue("player_action", 1, { n: 1 });
		enqueue("player_action", 1, { n: 2 });
		enqueue("player_action", 1, { n: 3 });

		const result = processCommands(1);

		expect(result.executed).toBe(2);
		expect(result.failed).toBe(1);
	});

	it("stamps executedTick on processed commands", () => {
		setCommandHandler(() => {});

		enqueue();
		processCommands(42);

		const history = getCommandHistory(1);
		expect(history[0].executedTick).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// processCommands — no handler
// ---------------------------------------------------------------------------

describe("commandQueue -- no handler", () => {
	it("processes commands as completed when no handler is set", () => {
		enqueue();
		const result = processCommands(1);

		expect(result.executed).toBe(1);
		expect(result.failed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// processCommands — empty queue
// ---------------------------------------------------------------------------

describe("commandQueue -- empty queue", () => {
	it("returns zero counts on empty queue", () => {
		const result = processCommands(1);
		expect(result.executed).toBe(0);
		expect(result.failed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// processCommands — result object
// ---------------------------------------------------------------------------

describe("commandQueue -- ProcessResult", () => {
	it("returns correct executed and failed counts", () => {
		let n = 0;
		setCommandHandler(() => {
			n++;
			if (n % 2 === 0) throw new Error("even fail");
		});

		for (let i = 0; i < 4; i++) enqueue();

		const result = processCommands(1);
		expect(result.executed).toBe(2);
		expect(result.failed).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// cancelCommand
// ---------------------------------------------------------------------------

describe("commandQueue -- cancelCommand", () => {
	it("removes a pending command by ID", () => {
		const cmd = enqueue();
		expect(getQueueLength()).toBe(1);

		const removed = cancelCommand(cmd.id);
		expect(removed).toBe(true);
		expect(getQueueLength()).toBe(0);
	});

	it("returns false for unknown ID", () => {
		expect(cancelCommand("cmd_999")).toBe(false);
	});

	it("returns false when queue is empty", () => {
		expect(cancelCommand("cmd_1")).toBe(false);
	});

	it("does not affect other commands", () => {
		const a = enqueue("player_action", 1, { label: "a" });
		enqueue("player_action", 1, { label: "b" });

		cancelCommand(a.id);

		expect(getQueueLength()).toBe(1);

		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);
		processCommands(1);

		expect(calls[0].payload.label).toBe("b");
	});

	it("cannot cancel an already-executed command", () => {
		setCommandHandler(() => {});
		const cmd = enqueue();
		processCommands(1);

		// Command is no longer in the queue.
		expect(cancelCommand(cmd.id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getCommandHistory
// ---------------------------------------------------------------------------

describe("commandQueue -- getCommandHistory", () => {
	it("returns most-recent-first", () => {
		setCommandHandler(() => {});

		enqueue("player_action", 1, { n: 1 });
		enqueue("player_action", 1, { n: 2 });
		enqueue("player_action", 1, { n: 3 });
		processCommands(1);

		const hist = getCommandHistory();
		expect(hist[0].payload.n).toBe(3);
		expect(hist[1].payload.n).toBe(2);
		expect(hist[2].payload.n).toBe(1);
	});

	it("limits results with count parameter", () => {
		setCommandHandler(() => {});

		for (let i = 0; i < 10; i++) enqueue();
		processCommands(1);

		expect(getCommandHistory(3)).toHaveLength(3);
	});

	it("returns all when count exceeds history length", () => {
		setCommandHandler(() => {});

		enqueue();
		enqueue();
		processCommands(1);

		expect(getCommandHistory(100)).toHaveLength(2);
	});

	it("returns empty array when no commands have been executed", () => {
		expect(getCommandHistory()).toEqual([]);
	});

	it("count of 0 returns empty array", () => {
		setCommandHandler(() => {});
		enqueue();
		processCommands(1);

		expect(getCommandHistory(0)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// History buffer cap
// ---------------------------------------------------------------------------

describe("commandQueue -- history cap", () => {
	it("caps history at 200 entries", () => {
		setCommandHandler(() => {});

		for (let i = 0; i < 250; i++) {
			enqueue("player_action", 1, { i });
		}
		processCommands(1, 250);

		const hist = getCommandHistory();
		expect(hist).toHaveLength(200);

		// Most recent should be the last-enqueued (i=249).
		expect(hist[0].payload.i).toBe(249);
	});

	it("retains the most recent entries when cap is exceeded", () => {
		setCommandHandler(() => {});

		for (let i = 0; i < 210; i++) {
			enqueue("player_action", 1, { i });
		}
		processCommands(1, 210);

		const hist = getCommandHistory();
		// Oldest kept should be i=10 (0..9 evicted).
		expect(hist[hist.length - 1].payload.i).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// getPendingCount / getQueueLength
// ---------------------------------------------------------------------------

describe("commandQueue -- queue inspection", () => {
	it("getPendingCount matches enqueued commands", () => {
		enqueue();
		enqueue();
		enqueue();

		expect(getPendingCount()).toBe(3);
	});

	it("getPendingCount decreases after processing", () => {
		setCommandHandler(() => {});
		enqueue();
		enqueue();

		processCommands(1, 1);

		expect(getPendingCount()).toBe(1);
	});

	it("getQueueLength starts at 0", () => {
		expect(getQueueLength()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// processBatch
// ---------------------------------------------------------------------------

describe("commandQueue -- processBatch", () => {
	it("executes all commands in the batch", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		const cmds = [
			enqueueCommand("player_action", 1, { a: 1 }),
			enqueueCommand("player_action", 1, { b: 2 }),
		];

		const result = processBatch(cmds, 5);

		expect(result.executed).toBe(2);
		expect(result.failed).toBe(0);
		expect(calls).toHaveLength(2);
	});

	it("stamps executedTick on batch commands", () => {
		setCommandHandler(() => {});

		const cmds = [
			enqueueCommand("system_event", 1, {}),
		];

		processBatch(cmds, 99);

		expect(cmds[0].executedTick).toBe(99);
	});

	it("marks ALL commands as failed if any handler throws (atomic)", () => {
		let callCount = 0;
		setCommandHandler(() => {
			callCount++;
			if (callCount === 2) throw new Error("fail");
		});

		const cmds = [
			enqueueCommand("player_action", 1, { n: 1 }),
			enqueueCommand("player_action", 1, { n: 2 }),
			enqueueCommand("player_action", 1, { n: 3 }),
		];

		const result = processBatch(cmds, 1);

		expect(result.executed).toBe(0);
		expect(result.failed).toBe(3);

		// All commands should be marked failed.
		for (const cmd of cmds) {
			expect(cmd.status).toBe("failed");
		}
	});

	it("does not execute remaining commands after a failure", () => {
		const executed: number[] = [];
		let callCount = 0;
		setCommandHandler((cmd) => {
			callCount++;
			if (callCount === 2) throw new Error("fail");
			executed.push(cmd.payload.n as number);
		});

		const cmds = [
			enqueueCommand("player_action", 1, { n: 1 }),
			enqueueCommand("player_action", 1, { n: 2 }),
			enqueueCommand("player_action", 1, { n: 3 }),
		];

		processBatch(cmds, 1);

		// Only the first was successfully executed before the failure.
		expect(executed).toEqual([1]);
	});

	it("records batch commands in history", () => {
		setCommandHandler(() => {});

		const cmds = [
			enqueueCommand("player_action", 1, { x: 1 }),
			enqueueCommand("player_action", 1, { x: 2 }),
		];

		processBatch(cmds, 1);

		expect(getCommandHistory()).toHaveLength(2);
	});

	it("handles empty batch gracefully", () => {
		const result = processBatch([], 1);
		expect(result.executed).toBe(0);
		expect(result.failed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("commandQueue -- reset", () => {
	it("clears the queue", () => {
		enqueue();
		enqueue();
		reset();
		expect(getQueueLength()).toBe(0);
	});

	it("clears history", () => {
		setCommandHandler(() => {});
		enqueue();
		processCommands(1);
		expect(getCommandHistory()).toHaveLength(1);

		reset();
		expect(getCommandHistory()).toHaveLength(0);
	});

	it("resets command ID counter", () => {
		enqueue();
		reset();
		const cmd = enqueue();
		expect(cmd.id).toBe("cmd_1");
	});

	it("clears the handler", () => {
		const spy = jest.fn();
		setCommandHandler(spy);
		reset();

		enqueue();
		processCommands(1);

		expect(spy).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("commandQueue -- edge cases", () => {
	it("multiple processCommands calls drain the queue incrementally", () => {
		setCommandHandler(() => {});

		for (let i = 0; i < 5; i++) enqueue();

		processCommands(1, 2);
		expect(getQueueLength()).toBe(3);

		processCommands(2, 2);
		expect(getQueueLength()).toBe(1);

		processCommands(3, 2);
		expect(getQueueLength()).toBe(0);
	});

	it("mixed priorities across multiple ticks", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		enqueue("player_action", 0, { label: "low" });
		enqueue("player_action", 3, { label: "critical" });

		processCommands(1, 1);

		// Critical should run first.
		expect(calls[0].payload.label).toBe("critical");

		// Low is still in queue.
		expect(getQueueLength()).toBe(1);

		processCommands(2, 1);
		expect(calls[1].payload.label).toBe("low");
	});

	it("enqueue after partial process works correctly", () => {
		const { calls, handler } = trackingHandler();
		setCommandHandler(handler);

		enqueue("player_action", 1, { wave: 1 });
		processCommands(1, 10);

		enqueue("player_action", 1, { wave: 2 });
		processCommands(2, 10);

		expect(calls).toHaveLength(2);
		expect(calls[0].payload.wave).toBe(1);
		expect(calls[1].payload.wave).toBe(2);
	});
});
