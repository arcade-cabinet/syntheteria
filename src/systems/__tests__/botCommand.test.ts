/**
 * Tests for the bot command system.
 *
 * Tests cover:
 * - Bot registration and unregistration
 * - Command issuance and validation
 * - Patrol waypoint advancement
 * - Guard range enforcement
 * - Follow distance checks
 * - Command events tracking
 * - Multi-bot management
 * - Faction filtering
 * - Edge cases
 */

jest.mock("../../../config", () => ({
	config: {
		botMovement: {
			automation: {
				guardRange: 8,
				followDistance: 3,
				waypointReachThreshold: 2,
				guardReturnThreshold: 3,
				guardPathCooldown: 0.3,
				followPathCooldown: 0.5,
				workPathCooldown: 0.5,
				patrolPathCooldown: 0.5,
				idleYawChangeChance: 0.01,
				idleYawChangeAmount: 0.5,
			},
		},
	},
}));

import {
	advancePatrol,
	botCommandSystem,
	checkFollowDistance,
	checkGuardReturn,
	getBotCommand,
	getBotsByCommand,
	getBotsByFaction,
	getCommandEvents,
	issueCommand,
	registerBot,
	resetBotCommands,
	unregisterBot,
	updateBotPosition,
} from "../botCommand";

beforeEach(() => {
	resetBotCommands();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("bot registration", () => {
	it("registers a bot with idle command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const cmd = getBotCommand("bot_1");
		expect(cmd).not.toBeNull();
		expect(cmd!.type).toBe("idle");
	});

	it("unregisters a bot", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		unregisterBot("bot_1");
		expect(getBotCommand("bot_1")).toBeNull();
	});

	it("returns null for unregistered bot", () => {
		expect(getBotCommand("nonexistent")).toBeNull();
	});

	it("updates bot position", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		updateBotPosition("bot_1", 10, 20);
		const bots = getBotsByFaction("reclaimers");
		expect(bots[0].x).toBe(10);
		expect(bots[0].z).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// Command issuance
// ---------------------------------------------------------------------------

describe("command issuance", () => {
	it("issues a harvest command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "harvest", {
			depositId: "deposit_1",
		});
		expect(result).toBe(true);
		expect(getBotCommand("bot_1")!.type).toBe("harvest");
	});

	it("issues a guard command with position", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "guard", {
			position: { x: 10, z: 10 },
		});
		expect(result).toBe(true);
		expect(getBotCommand("bot_1")!.type).toBe("guard");
	});

	it("issues a patrol command with waypoints", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "patrol", {
			waypoints: [
				{ x: 0, z: 0 },
				{ x: 10, z: 0 },
				{ x: 10, z: 10 },
			],
		});
		expect(result).toBe(true);
		expect(getBotCommand("bot_1")!.type).toBe("patrol");
	});

	it("issues a follow command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "follow", {
			entityId: "player",
		});
		expect(result).toBe(true);
	});

	it("issues a carry command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "carry", {
			cubeId: "cube_1",
		});
		expect(result).toBe(true);
	});

	it("issues an attack command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		const result = issueCommand("bot_1", "attack", {
			entityId: "enemy_1",
		});
		expect(result).toBe(true);
	});

	it("issues idle command with no target", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "harvest", { depositId: "d1" });
		const result = issueCommand("bot_1", "idle");
		expect(result).toBe(true);
		expect(getBotCommand("bot_1")!.type).toBe("idle");
	});

	it("replaces current command", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "harvest", { depositId: "d1" });
		issueCommand("bot_1", "guard", { position: { x: 5, z: 5 } });
		expect(getBotCommand("bot_1")!.type).toBe("guard");
	});

	it("returns false for unregistered bot", () => {
		expect(issueCommand("nonexistent", "idle")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Command validation
// ---------------------------------------------------------------------------

describe("command validation", () => {
	beforeEach(() => {
		registerBot("bot_1", "reclaimers", 0, 0);
	});

	it("rejects patrol without waypoints", () => {
		expect(issueCommand("bot_1", "patrol")).toBe(false);
		expect(issueCommand("bot_1", "patrol", { waypoints: [] })).toBe(false);
	});

	it("rejects guard without position or entity", () => {
		expect(issueCommand("bot_1", "guard")).toBe(false);
	});

	it("rejects follow without position or entity", () => {
		expect(issueCommand("bot_1", "follow")).toBe(false);
	});

	it("rejects harvest without deposit", () => {
		expect(issueCommand("bot_1", "harvest")).toBe(false);
	});

	it("rejects carry without cube", () => {
		expect(issueCommand("bot_1", "carry")).toBe(false);
	});

	it("rejects attack without entity", () => {
		expect(issueCommand("bot_1", "attack")).toBe(false);
	});

	it("keeps previous command when validation fails", () => {
		issueCommand("bot_1", "guard", { position: { x: 5, z: 5 } });
		issueCommand("bot_1", "patrol"); // fails
		expect(getBotCommand("bot_1")!.type).toBe("guard");
	});
});

// ---------------------------------------------------------------------------
// Patrol waypoints
// ---------------------------------------------------------------------------

describe("patrol waypoints", () => {
	it("returns current waypoint", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "patrol", {
			waypoints: [
				{ x: 10, z: 0 },
				{ x: 10, z: 10 },
				{ x: 0, z: 10 },
			],
		});

		const wp = advancePatrol("bot_1");
		expect(wp).toEqual({ x: 10, z: 0 });
	});

	it("advances to next waypoint when close enough", () => {
		registerBot("bot_1", "reclaimers", 9, 0); // close to waypoint (10,0)
		issueCommand("bot_1", "patrol", {
			waypoints: [
				{ x: 10, z: 0 },
				{ x: 10, z: 10 },
			],
		});

		const wp = advancePatrol("bot_1");
		// Distance from (9,0) to (10,0) = 1, threshold = 2, so should advance
		expect(wp).toEqual({ x: 10, z: 10 });
	});

	it("loops back to first waypoint after last", () => {
		registerBot("bot_1", "reclaimers", 10, 9); // close to (10,10)
		issueCommand("bot_1", "patrol", {
			waypoints: [
				{ x: 10, z: 0 },
				{ x: 10, z: 10 },
			],
		});

		// Advance to waypoint 1
		updateBotPosition("bot_1", 9, 0);
		advancePatrol("bot_1");

		// Now close to waypoint 1 (10,10)
		updateBotPosition("bot_1", 10, 9);
		const wp = advancePatrol("bot_1");
		expect(wp).toEqual({ x: 10, z: 0 }); // looped back
	});

	it("returns null for non-patrol bot", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		expect(advancePatrol("bot_1")).toBeNull();
	});

	it("returns null for unregistered bot", () => {
		expect(advancePatrol("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Guard distance
// ---------------------------------------------------------------------------

describe("guard distance", () => {
	it("returns null when within guard range", () => {
		registerBot("bot_1", "reclaimers", 5, 5);
		issueCommand("bot_1", "guard", { position: { x: 5, z: 5 } });

		expect(checkGuardReturn("bot_1")).toBeNull();
	});

	it("returns guard position when outside range", () => {
		registerBot("bot_1", "reclaimers", 20, 20);
		issueCommand("bot_1", "guard", { position: { x: 5, z: 5 } });

		const returnPos = checkGuardReturn("bot_1");
		expect(returnPos).toEqual({ x: 5, z: 5 });
	});

	it("returns null at exactly guard range", () => {
		registerBot("bot_1", "reclaimers", 13, 5); // dist from (5,5) = 8 = GUARD_RANGE
		issueCommand("bot_1", "guard", { position: { x: 5, z: 5 } });

		expect(checkGuardReturn("bot_1")).toBeNull();
	});

	it("returns null for non-guard bot", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		expect(checkGuardReturn("bot_1")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Follow distance
// ---------------------------------------------------------------------------

describe("follow distance", () => {
	it("returns null when within follow distance", () => {
		registerBot("bot_1", "reclaimers", 5, 5);
		issueCommand("bot_1", "follow", { entityId: "player" });

		expect(checkFollowDistance("bot_1", 6, 5)).toBeNull();
	});

	it("returns target position when too far", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "follow", { entityId: "player" });

		const target = checkFollowDistance("bot_1", 10, 10);
		expect(target).toEqual({ x: 10, z: 10 });
	});

	it("returns null for non-follow bot", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		expect(checkFollowDistance("bot_1", 10, 10)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Command events
// ---------------------------------------------------------------------------

describe("command events", () => {
	it("records command changes", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "harvest", { depositId: "d1" });

		const events = getCommandEvents();
		expect(events).toHaveLength(1);
		expect(events[0].botId).toBe("bot_1");
		expect(events[0].previousCommand).toBe("idle");
		expect(events[0].newCommand).toBe("harvest");
	});

	it("drains event queue", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "harvest", { depositId: "d1" });

		getCommandEvents(); // drain
		expect(getCommandEvents()).toHaveLength(0);
	});

	it("records multiple events", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		registerBot("bot_2", "reclaimers", 0, 0);

		issueCommand("bot_1", "harvest", { depositId: "d1" });
		issueCommand("bot_2", "guard", { position: { x: 5, z: 5 } });

		const events = getCommandEvents();
		expect(events).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Multi-bot queries
// ---------------------------------------------------------------------------

describe("multi-bot queries", () => {
	it("getBotsByCommand filters by command type", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		registerBot("bot_2", "reclaimers", 10, 0);
		registerBot("bot_3", "reclaimers", 20, 0);

		issueCommand("bot_1", "harvest", { depositId: "d1" });
		issueCommand("bot_2", "harvest", { depositId: "d2" });
		issueCommand("bot_3", "guard", { position: { x: 0, z: 0 } });

		const harvesters = getBotsByCommand("harvest");
		expect(harvesters).toHaveLength(2);

		const guards = getBotsByCommand("guard");
		expect(guards).toHaveLength(1);

		const idle = getBotsByCommand("idle");
		expect(idle).toHaveLength(0);
	});

	it("getBotsByFaction filters by faction", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		registerBot("bot_2", "reclaimers", 10, 0);
		registerBot("bot_3", "volt_collective", 20, 0);

		expect(getBotsByFaction("reclaimers")).toHaveLength(2);
		expect(getBotsByFaction("volt_collective")).toHaveLength(1);
		expect(getBotsByFaction("signal_choir")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

describe("botCommandSystem tick", () => {
	it("advances patrol waypoints during tick", () => {
		registerBot("bot_1", "reclaimers", 9, 0);
		issueCommand("bot_1", "patrol", {
			waypoints: [
				{ x: 10, z: 0 },
				{ x: 20, z: 0 },
			],
		});

		botCommandSystem(1);

		// Bot was at (9,0), close to waypoint 0 (10,0), should have advanced
		const cmd = getBotCommand("bot_1");
		expect(cmd!.waypointIndex).toBe(1);
	});

	it("does not crash with no bots", () => {
		expect(() => botCommandSystem(1)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetBotCommands", () => {
	it("clears all state", () => {
		registerBot("bot_1", "reclaimers", 0, 0);
		issueCommand("bot_1", "harvest", { depositId: "d1" });

		resetBotCommands();

		expect(getBotCommand("bot_1")).toBeNull();
		expect(getCommandEvents()).toHaveLength(0);
		expect(getBotsByCommand("harvest")).toHaveLength(0);
	});
});
