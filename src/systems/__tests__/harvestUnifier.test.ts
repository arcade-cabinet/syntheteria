/**
 * Unit tests for harvest unifier — unified API over player and ECS harvesting.
 *
 * Tests cover:
 * - Initialization with delegates
 * - startUnifiedHarvest routes to correct backend
 * - stopUnifiedHarvest cleans up backend tracking
 * - isHarvesting checks correct backend
 * - getBackend returns player/ecs/null
 * - getActiveHarvesters lists all active entities
 * - drainResults returns and clears pending results
 * - pushResult adds to pending queue
 * - Fallback when delegates not initialized
 * - reset() clears everything
 */

import {
	type EcsHarvestDelegate,
	type HarvestRequest,
	type PlayerHarvestDelegate,
	drainResults,
	getActiveHarvesters,
	getBackend,
	initHarvestUnifier,
	isHarvesting,
	pushResult,
	reset,
	startUnifiedHarvest,
	stopUnifiedHarvest,
} from "../harvestUnifier";

// ---------------------------------------------------------------------------
// Mock delegates
// ---------------------------------------------------------------------------

function createPlayerDelegate(
	overrides: Partial<PlayerHarvestDelegate> = {},
): PlayerHarvestDelegate {
	return {
		start: jest.fn(() => true),
		update: jest.fn(() => ({ powderGained: 0, depositRemaining: 0, stopped: false })),
		stop: jest.fn(),
		getState: jest.fn(() => ({ depositId: "dep-1", isActive: true })),
		...overrides,
	};
}

function createEcsDelegate(
	overrides: Partial<EcsHarvestDelegate> = {},
): EcsHarvestDelegate {
	return {
		start: jest.fn(() => true),
		stop: jest.fn(),
		getState: jest.fn(() => ({
			depositId: "dep-1",
			materialType: "iron",
			powderCollected: 10,
		})),
		...overrides,
	};
}

function makeRequest(overrides: Partial<HarvestRequest> = {}): HarvestRequest {
	return {
		entityId: "player-1",
		depositId: "dep-1",
		isPlayerControlled: true,
		position: { x: 0, y: 0, z: 0 },
		depositPosition: { x: 1, y: 0, z: 0 },
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("initHarvestUnifier", () => {
	it("registers delegates without error", () => {
		const player = createPlayerDelegate();
		const ecs = createEcsDelegate();
		expect(() => initHarvestUnifier(player, ecs)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// startUnifiedHarvest — routing
// ---------------------------------------------------------------------------

describe("startUnifiedHarvest", () => {
	it("routes player-controlled entity to player delegate", () => {
		const player = createPlayerDelegate();
		const ecs = createEcsDelegate();
		initHarvestUnifier(player, ecs);

		const result = startUnifiedHarvest(makeRequest({ isPlayerControlled: true }));
		expect(result).toBe(true);
		expect(player.start).toHaveBeenCalled();
		expect(ecs.start).not.toHaveBeenCalled();
	});

	it("routes AI entity to ECS delegate", () => {
		const player = createPlayerDelegate();
		const ecs = createEcsDelegate();
		initHarvestUnifier(player, ecs);

		const result = startUnifiedHarvest(
			makeRequest({ entityId: "bot-1", isPlayerControlled: false }),
		);
		expect(result).toBe(true);
		expect(ecs.start).toHaveBeenCalledWith("bot-1", "dep-1", undefined);
		expect(player.start).not.toHaveBeenCalled();
	});

	it("records backend for entity on success", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest());
		expect(getBackend("player-1")).toBe("player");
	});

	it("records ecs backend for AI entity", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest({ entityId: "bot-1", isPlayerControlled: false }));
		expect(getBackend("bot-1")).toBe("ecs");
	});

	it("returns false when player delegate fails to start", () => {
		const player = createPlayerDelegate({ start: jest.fn(() => false) });
		initHarvestUnifier(player, createEcsDelegate());
		const result = startUnifiedHarvest(makeRequest());
		expect(result).toBe(false);
		expect(getBackend("player-1")).toBeNull();
	});

	it("returns false when no delegates initialized", () => {
		const result = startUnifiedHarvest(makeRequest());
		expect(result).toBe(false);
	});

	it("passes harvest range to player delegate", () => {
		const player = createPlayerDelegate();
		initHarvestUnifier(player, createEcsDelegate());
		startUnifiedHarvest(makeRequest({ harvestRange: 5.0 }));
		expect(player.start).toHaveBeenCalledWith(
			"dep-1",
			expect.any(Object),
			expect.any(Function),
			5.0,
		);
	});

	it("passes powder capacity to ECS delegate", () => {
		const ecs = createEcsDelegate();
		initHarvestUnifier(createPlayerDelegate(), ecs);
		startUnifiedHarvest(
			makeRequest({ entityId: "bot-1", isPlayerControlled: false, powderCapacity: 50 }),
		);
		expect(ecs.start).toHaveBeenCalledWith("bot-1", "dep-1", 50);
	});
});

// ---------------------------------------------------------------------------
// stopUnifiedHarvest
// ---------------------------------------------------------------------------

describe("stopUnifiedHarvest", () => {
	it("stops player delegate and removes tracking", () => {
		const player = createPlayerDelegate();
		initHarvestUnifier(player, createEcsDelegate());
		startUnifiedHarvest(makeRequest());
		stopUnifiedHarvest("player-1");
		expect(player.stop).toHaveBeenCalled();
		expect(getBackend("player-1")).toBeNull();
	});

	it("stops ECS delegate and removes tracking", () => {
		const ecs = createEcsDelegate();
		initHarvestUnifier(createPlayerDelegate(), ecs);
		startUnifiedHarvest(makeRequest({ entityId: "bot-1", isPlayerControlled: false }));
		stopUnifiedHarvest("bot-1");
		expect(ecs.stop).toHaveBeenCalledWith("bot-1");
		expect(getBackend("bot-1")).toBeNull();
	});

	it("is safe for unknown entity", () => {
		expect(() => stopUnifiedHarvest("nobody")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// isHarvesting
// ---------------------------------------------------------------------------

describe("isHarvesting", () => {
	it("returns true for active player harvesting", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest());
		expect(isHarvesting("player-1")).toBe(true);
	});

	it("returns true for active ECS harvesting", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest({ entityId: "bot-1", isPlayerControlled: false }));
		expect(isHarvesting("bot-1")).toBe(true);
	});

	it("returns false for unknown entity", () => {
		expect(isHarvesting("nobody")).toBe(false);
	});

	it("returns false when player delegate reports inactive", () => {
		const player = createPlayerDelegate({
			getState: jest.fn(() => ({ depositId: "d", isActive: false })),
		});
		initHarvestUnifier(player, createEcsDelegate());
		startUnifiedHarvest(makeRequest());
		expect(isHarvesting("player-1")).toBe(false);
	});

	it("returns false when ECS delegate reports null state", () => {
		const ecs = createEcsDelegate({
			getState: jest.fn(() => null),
		});
		initHarvestUnifier(createPlayerDelegate(), ecs);
		startUnifiedHarvest(makeRequest({ entityId: "bot-1", isPlayerControlled: false }));
		expect(isHarvesting("bot-1")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getActiveHarvesters
// ---------------------------------------------------------------------------

describe("getActiveHarvesters", () => {
	it("returns empty array initially", () => {
		expect(getActiveHarvesters()).toEqual([]);
	});

	it("returns all active entity IDs", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest({ entityId: "p1" }));
		startUnifiedHarvest(makeRequest({ entityId: "b1", isPlayerControlled: false }));
		const active = getActiveHarvesters();
		expect(active).toContain("p1");
		expect(active).toContain("b1");
		expect(active).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// drainResults / pushResult
// ---------------------------------------------------------------------------

describe("drainResults / pushResult", () => {
	it("returns empty array initially", () => {
		expect(drainResults()).toEqual([]);
	});

	it("pushResult adds to pending queue", () => {
		pushResult({
			powderGained: 5,
			depositRemaining: 95,
			stopped: false,
			materialType: "iron",
			entityId: "player-1",
		});
		const results = drainResults();
		expect(results).toHaveLength(1);
		expect(results[0].powderGained).toBe(5);
	});

	it("drainResults clears the queue", () => {
		pushResult({
			powderGained: 5,
			depositRemaining: 95,
			stopped: false,
			materialType: "iron",
			entityId: "player-1",
		});
		drainResults();
		expect(drainResults()).toEqual([]);
	});

	it("accumulates multiple results", () => {
		pushResult({ powderGained: 1, depositRemaining: 99, stopped: false, materialType: "iron", entityId: "a" });
		pushResult({ powderGained: 2, depositRemaining: 98, stopped: false, materialType: "copper", entityId: "b" });
		const results = drainResults();
		expect(results).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears backend tracking", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		startUnifiedHarvest(makeRequest());
		reset();
		expect(getBackend("player-1")).toBeNull();
		expect(getActiveHarvesters()).toEqual([]);
	});

	it("clears pending results", () => {
		pushResult({ powderGained: 1, depositRemaining: 0, stopped: true, materialType: "iron", entityId: "x" });
		reset();
		expect(drainResults()).toEqual([]);
	});

	it("clears delegates (subsequent starts return false)", () => {
		initHarvestUnifier(createPlayerDelegate(), createEcsDelegate());
		reset();
		expect(startUnifiedHarvest(makeRequest())).toBe(false);
	});
});
