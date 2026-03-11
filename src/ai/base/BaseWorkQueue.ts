/**
 * BaseWorkQueue — priority task queue with claim/lock mechanism.
 *
 * Each Base settlement maintains a work queue. Bots "phone home" to their
 * nearest Base and claim tasks from its queue. The lock mechanism prevents
 * double-assignment: once a bot claims a task, no other bot can take it.
 *
 * Tasks auto-expire if not completed within a time window, returning to
 * the pending queue so another bot can pick them up.
 *
 * Key property: the Base always has work. Harvest tasks for nearby deposits,
 * patrol routes around the perimeter, transport tasks for cube logistics.
 * NO BOT EVER IDLES.
 */

import type { Vec3 } from "../../ecs/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const TaskCategory = {
	HARVEST: "harvest",
	TRANSPORT: "transport",
	BUILD: "build",
	PATROL: "patrol",
	DEFENSE: "defense",
} as const;
export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

export const TaskPriority = {
	LOW: 0,
	NORMAL: 1,
	HIGH: 2,
	URGENT: 3,
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface WorkTask {
	/** Unique task identifier */
	id: string;
	/** What kind of work this is */
	category: TaskCategory;
	/** Higher priority tasks are claimed first */
	priority: TaskPriority;
	/** Optional target entity ID (deposit, building, enemy) */
	targetId?: string;
	/** World-space position relevant to the task */
	position: Vec3;
	/** Optional metadata */
	data?: Record<string, unknown>;
}

interface ClaimedEntry {
	task: WorkTask;
	botId: string;
	/** Tick count when the claim was made */
	claimedAtTick: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ticks before a stale claim auto-releases */
const DEFAULT_CLAIM_EXPIRY = 60;

// ---------------------------------------------------------------------------
// BaseWorkQueue
// ---------------------------------------------------------------------------

export class BaseWorkQueue {
	/** Tasks waiting to be claimed, sorted by priority descending */
	private pending: WorkTask[] = [];

	/** Tasks currently claimed by bots */
	private claimed: Map<string, ClaimedEntry> = new Map();

	/** Current tick counter for expiry tracking */
	private currentTick = 0;

	/** How many ticks before a claim expires */
	private readonly claimExpiry: number;

	constructor(claimExpiry = DEFAULT_CLAIM_EXPIRY) {
		this.claimExpiry = claimExpiry;
	}

	// -----------------------------------------------------------------------
	// Adding tasks
	// -----------------------------------------------------------------------

	/**
	 * Add a task to the pending queue.
	 * Maintains sorted order by priority (highest first).
	 */
	add(task: WorkTask): void {
		this.pending.push(task);
		this.pending.sort((a, b) => b.priority - a.priority);
	}

	// -----------------------------------------------------------------------
	// Claiming tasks
	// -----------------------------------------------------------------------

	/**
	 * Claim the highest-priority pending task for a bot.
	 * Returns null if the queue is empty or the bot already has a claimed task.
	 */
	claim(botId: string): WorkTask | null {
		// Bot already has a task — one task per bot
		if (this.claimed.has(botId)) {
			return null;
		}

		if (this.pending.length === 0) {
			return null;
		}

		const task = this.pending.shift()!;
		this.claimed.set(botId, {
			task,
			botId,
			claimedAtTick: this.currentTick,
		});
		return task;
	}

	/**
	 * Claim the highest-priority pending task matching a specific category.
	 * Returns null if no matching tasks exist or bot already has a task.
	 */
	claimByCategory(botId: string, category: TaskCategory): WorkTask | null {
		if (this.claimed.has(botId)) {
			return null;
		}

		const index = this.pending.findIndex((t) => t.category === category);
		if (index === -1) {
			return null;
		}

		const task = this.pending.splice(index, 1)[0];
		this.claimed.set(botId, {
			task,
			botId,
			claimedAtTick: this.currentTick,
		});
		return task;
	}

	/**
	 * Get the task currently claimed by a bot, or null.
	 */
	getClaimedTask(botId: string): WorkTask | null {
		const entry = this.claimed.get(botId);
		return entry ? entry.task : null;
	}

	// -----------------------------------------------------------------------
	// Releasing and completing
	// -----------------------------------------------------------------------

	/**
	 * Release a claimed task back to the pending queue.
	 * Called when a bot is reassigned or destroyed.
	 */
	release(botId: string): void {
		const entry = this.claimed.get(botId);
		if (!entry) return;

		this.claimed.delete(botId);
		this.add(entry.task);
	}

	/**
	 * Mark a claimed task as completed — removes it permanently.
	 * The bot is freed to claim another task.
	 */
	complete(botId: string): void {
		this.claimed.delete(botId);
	}

	/**
	 * Refresh a bot's claim timer, preventing expiry.
	 * Called when a bot confirms it is still working on its task.
	 */
	refresh(botId: string): void {
		const entry = this.claimed.get(botId);
		if (entry) {
			entry.claimedAtTick = this.currentTick;
		}
	}

	// -----------------------------------------------------------------------
	// Tick — expiry processing
	// -----------------------------------------------------------------------

	/**
	 * Advance the internal tick counter and expire stale claims.
	 * @param ticks Number of ticks to advance (usually 1 per game tick)
	 */
	tick(ticks = 1): void {
		this.currentTick += ticks;

		// Check for expired claims
		for (const [botId, entry] of this.claimed) {
			if (this.currentTick - entry.claimedAtTick >= this.claimExpiry) {
				this.claimed.delete(botId);
				this.add(entry.task);
			}
		}
	}

	// -----------------------------------------------------------------------
	// Queries
	// -----------------------------------------------------------------------

	/** Number of tasks waiting to be claimed */
	pendingCount(): number {
		return this.pending.length;
	}

	/** Number of tasks currently claimed by bots */
	claimedCount(): number {
		return this.claimed.size;
	}

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	/** Clear only pending (unclaimed) tasks — claimed tasks stay intact */
	clearPending(): void {
		this.pending = [];
	}

	/** Clear all tasks and claims */
	clear(): void {
		this.pending = [];
		this.claimed.clear();
	}
}
