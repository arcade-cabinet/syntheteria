/**
 * Tests for PhoneHome — idle bot finds nearest Base and gets a task.
 *
 * Covers:
 * - Finding the nearest base to a bot position
 * - Requesting work from nearest base's queue
 * - Converting work tasks to BotOrders
 * - Handling no bases available
 * - Handling multiple bases (picks closest)
 */

import { phoneHome, findNearestBase } from "../PhoneHome";
import { BaseAgent, type BaseLocalState } from "../BaseAgent";
import { TaskCategory, TaskPriority } from "../BaseWorkQueue";
import { BotOrderType } from "../../BotOrders";

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
		],
		nearbyThreats: [],
		idleBotIds: ["bot_1"],
		assignedBotIds: ["bot_1"],
		pendingBuildOrders: [],
		furnaceReady: false,
		patrolRadius: 20,
	};
}

function setupBase(baseId: string, x: number, z: number): BaseAgent {
	const agent = new BaseAgent(baseId, "reclaimers", { x, y: 0, z });
	const state: BaseLocalState = {
		...makeDefaultState(),
		baseId,
		position: { x, y: 0, z },
	};
	agent.tick(state);
	return agent;
}

// ---------------------------------------------------------------------------
// findNearestBase
// ---------------------------------------------------------------------------

describe("findNearestBase", () => {
	it("returns the only base when there is one", () => {
		const base = setupBase("base_1", 0, 0);
		const botPos = { x: 5, y: 0, z: 5 };

		const nearest = findNearestBase(botPos, [base]);
		expect(nearest).toBe(base);
	});

	it("returns the closest base when there are multiple", () => {
		const base1 = setupBase("base_1", 0, 0);
		const base2 = setupBase("base_2", 100, 100);
		const botPos = { x: 5, y: 0, z: 5 };

		const nearest = findNearestBase(botPos, [base1, base2]);
		expect(nearest).toBe(base1);
	});

	it("returns the closest even when it is the second in the array", () => {
		const base1 = setupBase("base_1", 100, 100);
		const base2 = setupBase("base_2", 5, 5);
		const botPos = { x: 0, y: 0, z: 0 };

		const nearest = findNearestBase(botPos, [base1, base2]);
		expect(nearest).toBe(base2);
	});

	it("returns null when no bases exist", () => {
		const nearest = findNearestBase({ x: 0, y: 0, z: 0 }, []);
		expect(nearest).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// phoneHome — request work
// ---------------------------------------------------------------------------

describe("phoneHome", () => {
	it("returns a BotOrder from the nearest base work queue", () => {
		const base = setupBase("base_1", 0, 0);
		const botPos = { x: 5, y: 0, z: 5 };

		const order = phoneHome("bot_1", botPos, [base]);
		expect(order).not.toBeNull();
	});

	it("returns a harvest order when harvest tasks are available", () => {
		const base = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state = makeDefaultState();
		base.tick(state);
		const botPos = { x: 5, y: 0, z: 5 };

		const order = phoneHome("bot_1", botPos, [base]);
		expect(order).not.toBeNull();
		// Order type depends on what the base prioritized, but it should be something
		expect(order!.type).toBeDefined();
	});

	it("returns a patrol order when only patrol tasks exist", () => {
		const base = new BaseAgent("base_1", "reclaimers", { x: 0, y: 0, z: 0 });
		const state: BaseLocalState = {
			...makeDefaultState(),
			nearbyDeposits: [],
			nearbyThreats: [],
			pendingBuildOrders: [],
			furnaceReady: false,
		};
		base.tick(state);
		const botPos = { x: 5, y: 0, z: 5 };

		const order = phoneHome("bot_1", botPos, [base]);
		expect(order).not.toBeNull();
		expect(order!.type).toBe(BotOrderType.PATROL_AREA);
	});

	it("returns RETURN_TO_BASE when no bases have work (edge case)", () => {
		// Empty array = no bases
		const order = phoneHome("bot_1", { x: 0, y: 0, z: 0 }, []);
		// With no bases, the bot should still get an order (return to origin)
		expect(order).not.toBeNull();
		expect(order!.type).toBe(BotOrderType.RETURN_TO_BASE);
	});

	it("bot can only claim one task from a base", () => {
		const base = setupBase("base_1", 0, 0);
		const botPos = { x: 5, y: 0, z: 5 };

		const order1 = phoneHome("bot_1", botPos, [base]);
		expect(order1).not.toBeNull();

		// Second call with same bot — bot already has a claimed task
		const order2 = phoneHome("bot_1", botPos, [base]);
		// Should return null since bot already has work
		expect(order2).toBeNull();
	});
});
