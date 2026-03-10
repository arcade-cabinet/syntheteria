/**
 * Tests for the bot fleet manager.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	registerBot,
	destroyBot,
	removeBot,
	setBotStatus,
	updateBotPosition,
	assignBot,
	unassignBot,
	getBot,
	getFactionBots,
	getFactionBotsByType,
	getFleetStats,
	getIdleBots,
	getBotsNear,
	getTotalBotCount,
	resetBotFleet,
} from "../botFleetManager";

beforeEach(() => {
	resetBotFleet();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registration", () => {
	it("registers a bot and returns id", () => {
		const id = registerBot("player", "maintenance_bot", { x: 10, z: 20 }, 0);
		expect(id).toBeDefined();
		expect(typeof id).toBe("string");
	});

	it("bot is active after registration", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		const bot = getBot(id);
		expect(bot!.status).toBe("active");
		expect(bot!.faction).toBe("player");
	});

	it("registers with custom id", () => {
		const id = registerBot("player", "heavy_bot", { x: 0, z: 0 }, 0, "custom-1");
		expect(id).toBe("custom-1");
	});

	it("tracks created tick", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 42);
		expect(getBot(id)!.createdTick).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// Destruction
// ---------------------------------------------------------------------------

describe("destruction", () => {
	it("destroys a bot", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		destroyBot(id, 100);
		expect(getBot(id)!.status).toBe("destroyed");
		expect(getBot(id)!.destroyedTick).toBe(100);
	});

	it("destroyBot returns false for unknown", () => {
		expect(destroyBot("nope", 0)).toBe(false);
	});

	it("removeBot permanently deletes", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		removeBot(id);
		expect(getBot(id)).toBeNull();
	});

	it("destroyed bots excluded from faction queries", () => {
		const id1 = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "heavy_bot", { x: 10, z: 10 }, 0);
		destroyBot(id1, 50);

		const bots = getFactionBots("player");
		expect(bots).toHaveLength(1);
		expect(bots[0].type).toBe("heavy_bot");
	});
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

describe("status management", () => {
	it("sets bot status", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		setBotStatus(id, "damaged");
		expect(getBot(id)!.status).toBe("damaged");
	});

	it("cannot set status on destroyed bot", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		destroyBot(id, 0);
		expect(setBotStatus(id, "active")).toBe(false);
	});

	it("returns false for unknown bot", () => {
		expect(setBotStatus("nope", "idle")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

describe("position", () => {
	it("updates position", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		updateBotPosition(id, 50, 60);
		expect(getBot(id)!.position).toEqual({ x: 50, z: 60 });
	});

	it("returns false for unknown", () => {
		expect(updateBotPosition("nope", 0, 0)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

describe("assignment", () => {
	it("assigns task to bot", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		setBotStatus(id, "idle");
		assignBot(id, "harvest_ore_1");
		expect(getBot(id)!.assignment).toBe("harvest_ore_1");
		expect(getBot(id)!.status).toBe("active");
	});

	it("unassign sets to idle", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		assignBot(id, "patrol");
		unassignBot(id);
		expect(getBot(id)!.assignment).toBeUndefined();
		expect(getBot(id)!.status).toBe("idle");
	});

	it("cannot assign destroyed bot", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		destroyBot(id, 0);
		expect(assignBot(id, "patrol")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("queries", () => {
	it("getFactionBots returns faction bots", () => {
		registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "heavy_bot", { x: 10, z: 0 }, 0);
		registerBot("reclaimers", "maintenance_bot", { x: 20, z: 0 }, 0);

		expect(getFactionBots("player")).toHaveLength(2);
		expect(getFactionBots("reclaimers")).toHaveLength(1);
	});

	it("getFactionBotsByType filters by type", () => {
		registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "heavy_bot", { x: 10, z: 0 }, 0);
		registerBot("player", "maintenance_bot", { x: 20, z: 0 }, 0);

		expect(getFactionBotsByType("player", "maintenance_bot")).toHaveLength(2);
		expect(getFactionBotsByType("player", "heavy_bot")).toHaveLength(1);
	});

	it("getIdleBots returns idle bots", () => {
		const id1 = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "heavy_bot", { x: 10, z: 0 }, 0);

		setBotStatus(id1, "idle");

		expect(getIdleBots("player")).toHaveLength(1);
		expect(getIdleBots("player")[0].id).toBe(id1);
	});

	it("getBotsNear finds nearby bots", () => {
		registerBot("player", "maintenance_bot", { x: 5, z: 5 }, 0);
		registerBot("player", "heavy_bot", { x: 100, z: 100 }, 0);

		const nearby = getBotsNear(0, 0, 10);
		expect(nearby).toHaveLength(1);
	});

	it("getBotsNear filters by faction", () => {
		registerBot("player", "maintenance_bot", { x: 5, z: 5 }, 0);
		registerBot("reclaimers", "maintenance_bot", { x: 5, z: 5 }, 0);

		const nearby = getBotsNear(0, 0, 10, "player");
		expect(nearby).toHaveLength(1);
		expect(nearby[0].faction).toBe("player");
	});

	it("getTotalBotCount counts living bots", () => {
		const id1 = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("reclaimers", "maintenance_bot", { x: 0, z: 0 }, 0);
		expect(getTotalBotCount()).toBe(2);

		destroyBot(id1, 0);
		expect(getTotalBotCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Fleet stats
// ---------------------------------------------------------------------------

describe("fleet stats", () => {
	it("computes correct stats", () => {
		const id1 = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "maintenance_bot", { x: 10, z: 0 }, 0);
		const id3 = registerBot("player", "heavy_bot", { x: 20, z: 0 }, 0);

		setBotStatus(id1, "idle");
		setBotStatus(id3, "damaged");

		const stats = getFleetStats("player");
		expect(stats.totalBots).toBe(3);
		expect(stats.activeBots).toBe(1);
		expect(stats.idleBots).toBe(1);
		expect(stats.damagedBots).toBe(1);
		expect(stats.botsByType.maintenance_bot).toBe(2);
		expect(stats.botsByType.heavy_bot).toBe(1);
	});

	it("empty stats for unknown faction", () => {
		const stats = getFleetStats("unknown");
		expect(stats.totalBots).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("immutability", () => {
	it("getBot returns copy", () => {
		const id = registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		const b1 = getBot(id);
		const b2 = getBot(id);
		expect(b1).not.toBe(b2);
	});

	it("getBot returns null for unknown", () => {
		expect(getBot("nope")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all bots", () => {
		registerBot("player", "maintenance_bot", { x: 0, z: 0 }, 0);
		registerBot("player", "heavy_bot", { x: 0, z: 0 }, 0);

		resetBotFleet();

		expect(getTotalBotCount()).toBe(0);
		expect(getFactionBots("player")).toHaveLength(0);
	});
});
