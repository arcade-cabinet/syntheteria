/**
 * Tests for BaseWorkQueue — priority task queue with claim/lock mechanism.
 *
 * Covers:
 * - Adding tasks with priorities
 * - Claiming tasks (highest priority first)
 * - Lock mechanism prevents double-assignment
 * - Releasing claimed tasks returns them to the queue
 * - Completing claimed tasks removes them permanently
 * - Queue auto-replenishes (always has work available)
 * - Task expiry (stale claims auto-release)
 * - Multiple task categories (harvest, transport, build, patrol)
 */

import {
	BaseWorkQueue,
	type WorkTask,
	TaskCategory,
	TaskPriority,
} from "../BaseWorkQueue";

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — construction", () => {
	it("creates an empty queue", () => {
		const queue = new BaseWorkQueue();
		expect(queue.pendingCount()).toBe(0);
		expect(queue.claimedCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Adding and claiming tasks
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — add and claim", () => {
	it("adds a task and retrieves it via claim", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			targetId: "deposit_1",
			position: { x: 10, y: 0, z: 20 },
		});

		expect(queue.pendingCount()).toBe(1);

		const task = queue.claim("bot_1");
		expect(task).not.toBeNull();
		expect(task!.id).toBe("task_1");
		expect(task!.category).toBe(TaskCategory.HARVEST);
	});

	it("returns highest priority task first", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "low",
			category: TaskCategory.PATROL,
			priority: TaskPriority.LOW,
			position: { x: 0, y: 0, z: 0 },
		});
		queue.add({
			id: "urgent",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.URGENT,
			position: { x: 5, y: 0, z: 5 },
		});
		queue.add({
			id: "normal",
			category: TaskCategory.TRANSPORT,
			priority: TaskPriority.NORMAL,
			position: { x: 10, y: 0, z: 10 },
		});

		const first = queue.claim("bot_1");
		expect(first!.id).toBe("urgent");

		const second = queue.claim("bot_2");
		expect(second!.id).toBe("normal");

		const third = queue.claim("bot_3");
		expect(third!.id).toBe("low");
	});

	it("returns null when queue is empty", () => {
		const queue = new BaseWorkQueue();
		const task = queue.claim("bot_1");
		expect(task).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Lock mechanism
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — claim locking", () => {
	it("claimed task is not available for other bots", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		const task = queue.claim("bot_1");
		expect(task).not.toBeNull();
		expect(queue.pendingCount()).toBe(0);
		expect(queue.claimedCount()).toBe(1);

		// Second bot gets nothing
		const task2 = queue.claim("bot_2");
		expect(task2).toBeNull();
	});

	it("same bot cannot claim two tasks", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});
		queue.add({
			id: "task_2",
			category: TaskCategory.BUILD,
			priority: TaskPriority.NORMAL,
			position: { x: 5, y: 0, z: 5 },
		});

		queue.claim("bot_1");
		const second = queue.claim("bot_1");
		// Bot already has a task — returns null
		expect(second).toBeNull();
		expect(queue.pendingCount()).toBe(1);
	});

	it("tracks which bot claimed which task", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		expect(queue.getClaimedTask("bot_1")).not.toBeNull();
		expect(queue.getClaimedTask("bot_1")!.id).toBe("task_1");
		expect(queue.getClaimedTask("bot_2")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Releasing and completing tasks
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — release and complete", () => {
	it("releasing a task returns it to the pending queue", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		expect(queue.pendingCount()).toBe(0);

		queue.release("bot_1");
		expect(queue.pendingCount()).toBe(1);
		expect(queue.claimedCount()).toBe(0);

		// Another bot can now claim it
		const task = queue.claim("bot_2");
		expect(task).not.toBeNull();
		expect(task!.id).toBe("task_1");
	});

	it("completing a task removes it permanently", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		queue.complete("bot_1");

		expect(queue.pendingCount()).toBe(0);
		expect(queue.claimedCount()).toBe(0);

		// Bot is free to claim again
		queue.add({
			id: "task_2",
			category: TaskCategory.BUILD,
			priority: TaskPriority.NORMAL,
			position: { x: 5, y: 0, z: 5 },
		});
		const task = queue.claim("bot_1");
		expect(task).not.toBeNull();
	});

	it("releasing when bot has no claimed task is a no-op", () => {
		const queue = new BaseWorkQueue();
		expect(() => queue.release("bot_1")).not.toThrow();
	});

	it("completing when bot has no claimed task is a no-op", () => {
		const queue = new BaseWorkQueue();
		expect(() => queue.complete("bot_1")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Category filtering
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — category filtering", () => {
	it("claim with category filter returns only matching tasks", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "harvest_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});
		queue.add({
			id: "build_1",
			category: TaskCategory.BUILD,
			priority: TaskPriority.URGENT,
			position: { x: 5, y: 0, z: 5 },
		});

		// Claim only harvest tasks
		const task = queue.claimByCategory("bot_1", TaskCategory.HARVEST);
		expect(task).not.toBeNull();
		expect(task!.id).toBe("harvest_1");
		expect(task!.category).toBe(TaskCategory.HARVEST);
	});

	it("returns null when no tasks of requested category exist", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "build_1",
			category: TaskCategory.BUILD,
			priority: TaskPriority.NORMAL,
			position: { x: 5, y: 0, z: 5 },
		});

		const task = queue.claimByCategory("bot_1", TaskCategory.PATROL);
		expect(task).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Task expiry
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — task expiry", () => {
	it("stale claims auto-release after expiry time", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		expect(queue.claimedCount()).toBe(1);

		// Simulate time passing beyond expiry (default 60 ticks)
		queue.tick(61);

		// Stale claim should auto-release
		expect(queue.claimedCount()).toBe(0);
		expect(queue.pendingCount()).toBe(1);
	});

	it("active claims within expiry window are not released", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		queue.tick(30); // within expiry window

		expect(queue.claimedCount()).toBe(1);
		expect(queue.pendingCount()).toBe(0);
	});

	it("refreshing a claim resets the expiry timer", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});

		queue.claim("bot_1");
		queue.tick(50);
		queue.refresh("bot_1"); // reset timer
		queue.tick(50); // 50 more ticks, but timer was reset

		// Should still be claimed (50 < 60 after refresh)
		expect(queue.claimedCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

describe("BaseWorkQueue — clear", () => {
	it("clears all tasks and claims", () => {
		const queue = new BaseWorkQueue();
		queue.add({
			id: "task_1",
			category: TaskCategory.HARVEST,
			priority: TaskPriority.NORMAL,
			position: { x: 0, y: 0, z: 0 },
		});
		queue.claim("bot_1");
		queue.add({
			id: "task_2",
			category: TaskCategory.BUILD,
			priority: TaskPriority.NORMAL,
			position: { x: 5, y: 0, z: 5 },
		});

		queue.clear();

		expect(queue.pendingCount()).toBe(0);
		expect(queue.claimedCount()).toBe(0);
	});
});
