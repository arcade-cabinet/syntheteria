/**
 * Tests for BaseAgent — autonomous settlement agent with local event bus.
 *
 * Covers:
 * - Construction with base ID and position
 * - Tick scans local state and populates work queues
 * - Emits events for unmet needs (harvest_needed, transport_needed, etc.)
 * - Bots claim tasks from the Base's work queue
 * - Multiple bases operate independently
 * - Defense alerts when threats detected
 * - Work queue always has tasks (NO BOT EVER IDLES)
 */

import { BaseAgent, type BaseLocalState, BaseEventType } from "../BaseAgent";
import { TaskCategory } from "../BaseWorkQueue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefaultState(): BaseLocalState {
	return {
		baseId: "base_1",
		factionId: "reclaimers",
		position: { x: 0, y: 0, z: 0 },
		cubeStockpile: 5,
		nearbyDeposits: [
			{ depositId: "dep_1", position: { x: 10, y: 0, z: 0 }, oreType: "scrap_metal", remainingYield: 100 },
			{ depositId: "dep_2", position: { x: -5, y: 0, z: 15 }, oreType: "e_waste", remainingYield: 50 },
		],
		nearbyThreats: [],
		idleBotIds: ["bot_1", "bot_2"],
		assignedBotIds: ["bot_1", "bot_2", "bot_3"],
		pendingBuildOrders: [],
		furnaceReady: false,
		patrolRadius: 20,
	};
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("BaseAgent — construction", () => {
	it("creates a base agent with ID and position", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		expect(agent.baseId).toBe("base_1");
		expect(agent.factionId).toBe("reclaimers");
	});

	it("starts with empty work queue", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		expect(agent.workQueue.pendingCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Tick — scanning state and emitting events
// ---------------------------------------------------------------------------

describe("BaseAgent — tick populates work queue", () => {
	it("generates harvest tasks for nearby deposits", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state = makeDefaultState();

		agent.tick(state);

		// Should have at least one harvest task for each deposit
		expect(agent.workQueue.pendingCount()).toBeGreaterThan(0);
	});

	it("generates patrol tasks when no threats present", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state = makeDefaultState();

		agent.tick(state);

		// Should include patrol tasks
		const task = agent.workQueue.claimByCategory("bot_x", TaskCategory.PATROL);
		expect(task).not.toBeNull();
	});

	it("generates defense tasks when threats are present", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state: BaseLocalState = {
			...makeDefaultState(),
			nearbyThreats: [
				{ entityId: "enemy_1", position: { x: 15, y: 0, z: 0 }, threatLevel: 0.8 },
			],
		};

		agent.tick(state);

		// Should have defense tasks
		const task = agent.workQueue.claimByCategory("bot_x", TaskCategory.DEFENSE);
		expect(task).not.toBeNull();
	});

	it("generates build tasks when build orders are pending", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state: BaseLocalState = {
			...makeDefaultState(),
			pendingBuildOrders: [
				{ buildingType: "wall", position: { x: 5, y: 0, z: 5 } },
			],
		};

		agent.tick(state);

		const task = agent.workQueue.claimByCategory("bot_x", TaskCategory.BUILD);
		expect(task).not.toBeNull();
	});

	it("generates transport tasks when furnace is ready and cubes are available", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state: BaseLocalState = {
			...makeDefaultState(),
			furnaceReady: true,
			cubeStockpile: 10,
		};

		agent.tick(state);

		const task = agent.workQueue.claimByCategory("bot_x", TaskCategory.TRANSPORT);
		expect(task).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Event emission
// ---------------------------------------------------------------------------

describe("BaseAgent — local event emission", () => {
	it("emits events that listeners can receive", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const received: string[] = [];

		agent.on(BaseEventType.HARVEST_NEEDED, (event) => {
			received.push(event.type);
		});

		agent.tick(makeDefaultState());

		expect(received.length).toBeGreaterThan(0);
		expect(received[0]).toBe(BaseEventType.HARVEST_NEEDED);
	});

	it("emits defense_alert when threats are near", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const received: string[] = [];

		agent.on(BaseEventType.DEFENSE_ALERT, (event) => {
			received.push(event.type);
		});

		const state: BaseLocalState = {
			...makeDefaultState(),
			nearbyThreats: [
				{ entityId: "enemy_1", position: { x: 15, y: 0, z: 0 }, threatLevel: 0.8 },
			],
		};

		agent.tick(state);

		expect(received.length).toBeGreaterThan(0);
	});

	it("removes listener via returned unsubscribe function", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const callback = jest.fn();

		const unsub = agent.on(BaseEventType.HARVEST_NEEDED, callback);
		unsub();

		agent.tick(makeDefaultState());

		expect(callback).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Guaranteed work — NO BOT EVER IDLES
// ---------------------------------------------------------------------------

describe("BaseAgent — guaranteed work", () => {
	it("always has claimable tasks after tick (no empty queue)", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state = makeDefaultState();

		agent.tick(state);

		// There should always be work: harvest, patrol, or transport
		const task = agent.workQueue.claim("idle_bot");
		expect(task).not.toBeNull();
	});

	it("patrol tasks are always generated as fallback work", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		// Even with no deposits, no threats, no build orders
		const state: BaseLocalState = {
			...makeDefaultState(),
			nearbyDeposits: [],
			nearbyThreats: [],
			pendingBuildOrders: [],
			furnaceReady: false,
		};

		agent.tick(state);

		// Patrol should always exist as guaranteed fallback work
		expect(agent.workQueue.pendingCount()).toBeGreaterThan(0);
		const task = agent.workQueue.claim("idle_bot");
		expect(task).not.toBeNull();
		expect(task!.category).toBe(TaskCategory.PATROL);
	});
});

// ---------------------------------------------------------------------------
// Multiple bases
// ---------------------------------------------------------------------------

describe("BaseAgent — multiple bases independent", () => {
	it("two bases have separate work queues", () => {
		const base1 = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const base2 = new BaseAgent("base_2", "reclaimers", { x: 100, y: 0, z: 100 });

		base1.tick(makeDefaultState());
		// base2 not ticked — should have no tasks

		expect(base1.workQueue.pendingCount()).toBeGreaterThan(0);
		expect(base2.workQueue.pendingCount()).toBe(0);
	});

	it("events on one base do not leak to another", () => {
		const base1 = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const base2 = new BaseAgent("base_2", "reclaimers", { x: 100, y: 0, z: 100 });
		const cb1 = jest.fn();
		const cb2 = jest.fn();

		base1.on(BaseEventType.HARVEST_NEEDED, cb1);
		base2.on(BaseEventType.HARVEST_NEEDED, cb2);

		base1.tick(makeDefaultState());

		expect(cb1).toHaveBeenCalled();
		expect(cb2).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("BaseAgent — reset", () => {
	it("clears work queue and event listeners", () => {
		const agent = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const callback = jest.fn();
		agent.on(BaseEventType.HARVEST_NEEDED, callback);

		agent.tick(makeDefaultState());
		expect(agent.workQueue.pendingCount()).toBeGreaterThan(0);

		const callsBeforeReset = callback.mock.calls.length;
		expect(callsBeforeReset).toBeGreaterThan(0);

		agent.reset();

		expect(agent.workQueue.pendingCount()).toBe(0);

		// Callback should not fire after reset — listeners were cleared
		agent.tick(makeDefaultState());
		expect(callback).toHaveBeenCalledTimes(callsBeforeReset);
	});
});
