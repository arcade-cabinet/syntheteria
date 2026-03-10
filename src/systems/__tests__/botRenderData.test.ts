/**
 * Unit tests for the bot render data system.
 *
 * Tests cover:
 * - Registration and unregistration
 * - Transform updates (position, rotation, velocity)
 * - Animation state transitions
 * - Health bar calculations
 * - Status effects
 * - Faction material lookups
 * - Player bot tracking
 * - Spatial queries (getBotsInRange)
 * - Faction filtering (getBotsByFaction)
 * - Bot count
 * - Reset / test isolation
 * - Error handling for invalid operations
 * - Snapshot isolation (returned data is a copy, not a reference)
 */

import {
	registerBot,
	unregisterBot,
	updateBotTransform,
	setBotAnimation,
	setBotHealth,
	setBotStatus,
	collectBotRenderData,
	setPlayerBot,
	getPlayerBot,
	getFactionMaterial,
	getBotsInRange,
	getBotsByFaction,
	getBotCount,
	reset,
} from "../botRenderData";
import type {
	Faction,
	BotType,
	AnimState,
	StatusEffect,
	Vec3,
	BotRenderInfo,
} from "../botRenderData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x: number, y: number, z: number): Vec3 {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registerBot", () => {
	it("registers a bot and makes it available via collectBotRenderData", () => {
		registerBot("bot1", "reclaimers", pos(1, 0, 2), "worker");
		const data = collectBotRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].botId).toBe("bot1");
		expect(data[0].faction).toBe("reclaimers");
		expect(data[0].botType).toBe("worker");
		expect(data[0].position).toEqual(pos(1, 0, 2));
	});

	it("assigns default values on registration", () => {
		registerBot("bot1", "iron_creed", pos(0, 0, 0), "scout");
		const data = collectBotRenderData();
		expect(data[0].animState).toBe("idle");
		expect(data[0].healthPercent).toBe(1);
		expect(data[0].statusEffects).toEqual([]);
		expect(data[0].isPlayerControlled).toBe(false);
		expect(data[0].rotation).toEqual(pos(0, 0, 0));
		expect(data[0].velocity).toEqual(pos(0, 0, 0));
	});

	it("generates a default nameplate from botType and botId", () => {
		registerBot("a7", "signal_choir", pos(0, 0, 0), "harvester");
		const data = collectBotRenderData();
		expect(data[0].nameplate).toBe("harvester-a7");
	});

	it("throws when registering a duplicate botId", () => {
		registerBot("dup", "reclaimers", pos(0, 0, 0), "worker");
		expect(() =>
			registerBot("dup", "iron_creed", pos(1, 1, 1), "soldier"),
		).toThrow("Bot already registered: dup");
	});

	it("can register multiple bots", () => {
		registerBot("b1", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("b2", "volt_collective", pos(5, 0, 5), "scout");
		registerBot("b3", "signal_choir", pos(10, 0, 10), "builder");
		expect(getBotCount()).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Unregistration
// ---------------------------------------------------------------------------

describe("unregisterBot", () => {
	it("removes a bot from the registry", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		unregisterBot("bot1");
		expect(getBotCount()).toBe(0);
		expect(collectBotRenderData()).toEqual([]);
	});

	it("throws when unregistering an unknown botId", () => {
		expect(() => unregisterBot("ghost")).toThrow("Bot not registered: ghost");
	});

	it("clears player reference when the player bot is unregistered", () => {
		registerBot("p1", "iron_creed", pos(0, 0, 0), "soldier");
		setPlayerBot("p1");
		unregisterBot("p1");
		expect(getPlayerBot()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Transform updates
// ---------------------------------------------------------------------------

describe("updateBotTransform", () => {
	it("updates position, rotation, and velocity", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		updateBotTransform(
			"bot1",
			pos(10, 1, 20),
			pos(0, 1.57, 0),
			pos(3, 0, 4),
		);
		const data = collectBotRenderData();
		expect(data[0].position).toEqual(pos(10, 1, 20));
		expect(data[0].rotation).toEqual(pos(0, 1.57, 0));
		expect(data[0].velocity).toEqual(pos(3, 0, 4));
	});

	it("throws for an unregistered bot", () => {
		expect(() =>
			updateBotTransform("nope", pos(0, 0, 0), pos(0, 0, 0), pos(0, 0, 0)),
		).toThrow("Bot not registered: nope");
	});

	it("copies input vectors (mutation-safe)", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		const p = pos(5, 0, 5);
		updateBotTransform("bot1", p, pos(0, 0, 0), pos(0, 0, 0));
		p.x = 999;
		const data = collectBotRenderData();
		expect(data[0].position.x).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Animation state
// ---------------------------------------------------------------------------

describe("setBotAnimation", () => {
	it("sets the animation state", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotAnimation("bot1", "walking");
		expect(collectBotRenderData()[0].animState).toBe("walking");
	});

	it("can cycle through all animation states", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		const states: AnimState[] = [
			"idle",
			"walking",
			"harvesting",
			"combat",
			"damaged",
			"dead",
		];
		for (const state of states) {
			setBotAnimation("bot1", state);
			expect(collectBotRenderData()[0].animState).toBe(state);
		}
	});

	it("throws for an unregistered bot", () => {
		expect(() => setBotAnimation("nope", "idle")).toThrow(
			"Bot not registered: nope",
		);
	});
});

// ---------------------------------------------------------------------------
// Health bar
// ---------------------------------------------------------------------------

describe("setBotHealth", () => {
	it("calculates healthPercent as current / max", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotHealth("bot1", 30, 100);
		expect(collectBotRenderData()[0].healthPercent).toBeCloseTo(0.3);
	});

	it("returns 0 when max is 0 (no division by zero)", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotHealth("bot1", 50, 0);
		expect(collectBotRenderData()[0].healthPercent).toBe(0);
	});

	it("allows current > max (overheal)", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotHealth("bot1", 150, 100);
		expect(collectBotRenderData()[0].healthPercent).toBeCloseTo(1.5);
	});

	it("throws for negative max", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		expect(() => setBotHealth("bot1", 10, -5)).toThrow(
			"Max health cannot be negative",
		);
	});

	it("throws for an unregistered bot", () => {
		expect(() => setBotHealth("nope", 10, 100)).toThrow(
			"Bot not registered: nope",
		);
	});
});

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------

describe("setBotStatus", () => {
	it("sets status effects array", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotStatus("bot1", ["poison", "hacked"]);
		const effects = collectBotRenderData()[0].statusEffects;
		expect(effects).toEqual(["poison", "hacked"]);
	});

	it("replaces the previous status effects", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotStatus("bot1", ["stunned"]);
		setBotStatus("bot1", ["burning", "frozen"]);
		expect(collectBotRenderData()[0].statusEffects).toEqual([
			"burning",
			"frozen",
		]);
	});

	it("can clear status effects with an empty array", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		setBotStatus("bot1", ["poison"]);
		setBotStatus("bot1", []);
		expect(collectBotRenderData()[0].statusEffects).toEqual([]);
	});

	it("copies input array (mutation-safe)", () => {
		registerBot("bot1", "reclaimers", pos(0, 0, 0), "worker");
		const effects: StatusEffect[] = ["poison"];
		setBotStatus("bot1", effects);
		effects.push("hacked");
		expect(collectBotRenderData()[0].statusEffects).toEqual(["poison"]);
	});

	it("throws for an unregistered bot", () => {
		expect(() => setBotStatus("nope", [])).toThrow(
			"Bot not registered: nope",
		);
	});
});

// ---------------------------------------------------------------------------
// collectBotRenderData
// ---------------------------------------------------------------------------

describe("collectBotRenderData", () => {
	it("returns an empty array when no bots are registered", () => {
		expect(collectBotRenderData()).toEqual([]);
	});

	it("returns render info for all registered bots", () => {
		registerBot("a", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("b", "volt_collective", pos(1, 0, 1), "scout");
		const data = collectBotRenderData();
		expect(data).toHaveLength(2);
		const ids = data.map((d) => d.botId).sort();
		expect(ids).toEqual(["a", "b"]);
	});

	it("returns snapshot copies (mutating returned data does not affect state)", () => {
		registerBot("bot1", "reclaimers", pos(5, 0, 5), "worker");
		const data = collectBotRenderData();
		data[0].position.x = 999;
		data[0].statusEffects = ["hacked" as StatusEffect];
		const fresh = collectBotRenderData();
		expect(fresh[0].position.x).toBe(5);
		expect(fresh[0].statusEffects).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Player bot
// ---------------------------------------------------------------------------

describe("setPlayerBot / getPlayerBot", () => {
	it("marks a bot as player-controlled", () => {
		registerBot("p1", "reclaimers", pos(0, 0, 0), "worker");
		setPlayerBot("p1");
		const info = getPlayerBot();
		expect(info).not.toBeNull();
		expect(info!.botId).toBe("p1");
		expect(info!.isPlayerControlled).toBe(true);
	});

	it("reflects isPlayerControlled in collectBotRenderData", () => {
		registerBot("p1", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("n1", "iron_creed", pos(1, 0, 1), "soldier");
		setPlayerBot("p1");
		const data = collectBotRenderData();
		const p = data.find((d) => d.botId === "p1")!;
		const n = data.find((d) => d.botId === "n1")!;
		expect(p.isPlayerControlled).toBe(true);
		expect(n.isPlayerControlled).toBe(false);
	});

	it("returns null when no player bot is set", () => {
		expect(getPlayerBot()).toBeNull();
	});

	it("only one bot can be the player at a time", () => {
		registerBot("a", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("b", "iron_creed", pos(1, 0, 1), "soldier");
		setPlayerBot("a");
		setPlayerBot("b");
		expect(getPlayerBot()!.botId).toBe("b");
		const data = collectBotRenderData();
		expect(data.find((d) => d.botId === "a")!.isPlayerControlled).toBe(false);
		expect(data.find((d) => d.botId === "b")!.isPlayerControlled).toBe(true);
	});

	it("throws when setting an unregistered bot as player", () => {
		expect(() => setPlayerBot("nope")).toThrow("Bot not registered: nope");
	});
});

// ---------------------------------------------------------------------------
// Faction materials
// ---------------------------------------------------------------------------

describe("getFactionMaterial", () => {
	it("returns reclaimers material (rusted iron)", () => {
		const mat = getFactionMaterial("reclaimers");
		expect(mat.color).toBe("#8B6914");
		expect(mat.roughness).toBe(0.7);
		expect(mat.metalness).toBe(0.4);
		expect(mat.emissive).toBeUndefined();
	});

	it("returns volt_collective material (chrome + heat-blue)", () => {
		const mat = getFactionMaterial("volt_collective");
		expect(mat.color).toBe("#C0C0C0");
		expect(mat.roughness).toBe(0.2);
		expect(mat.metalness).toBe(0.9);
		expect(mat.emissive).toBe("#001133");
	});

	it("returns signal_choir material (anodized aluminum)", () => {
		const mat = getFactionMaterial("signal_choir");
		expect(mat.color).toBe("#9090B0");
		expect(mat.roughness).toBe(0.3);
		expect(mat.metalness).toBe(0.6);
		expect(mat.emissive).toBe("#1A0033");
	});

	it("returns iron_creed material (brushed steel)", () => {
		const mat = getFactionMaterial("iron_creed");
		expect(mat.color).toBe("#707070");
		expect(mat.roughness).toBe(0.4);
		expect(mat.metalness).toBe(0.8);
		expect(mat.emissive).toBeUndefined();
	});

	it("returns a copy (mutating result does not affect palette)", () => {
		const mat = getFactionMaterial("reclaimers");
		mat.color = "#000000";
		expect(getFactionMaterial("reclaimers").color).toBe("#8B6914");
	});

	it("attaches correct faction material in BotRenderInfo", () => {
		registerBot("bot1", "volt_collective", pos(0, 0, 0), "scout");
		const data = collectBotRenderData();
		expect(data[0].factionMaterial.color).toBe("#C0C0C0");
		expect(data[0].factionMaterial.emissive).toBe("#001133");
	});
});

// ---------------------------------------------------------------------------
// Spatial query
// ---------------------------------------------------------------------------

describe("getBotsInRange", () => {
	it("returns bots within the given radius", () => {
		registerBot("near", "reclaimers", pos(1, 0, 1), "worker");
		registerBot("far", "iron_creed", pos(100, 0, 100), "soldier");
		const results = getBotsInRange(pos(0, 0, 0), 5);
		expect(results).toHaveLength(1);
		expect(results[0].botId).toBe("near");
	});

	it("includes bots exactly on the radius boundary", () => {
		registerBot("edge", "reclaimers", pos(5, 0, 0), "worker");
		const results = getBotsInRange(pos(0, 0, 0), 5);
		expect(results).toHaveLength(1);
	});

	it("returns results sorted nearest-first", () => {
		registerBot("mid", "reclaimers", pos(3, 0, 0), "worker");
		registerBot("close", "reclaimers", pos(1, 0, 0), "scout");
		registerBot("far", "reclaimers", pos(4, 0, 0), "soldier");
		const results = getBotsInRange(pos(0, 0, 0), 10);
		expect(results.map((r) => r.botId)).toEqual(["close", "mid", "far"]);
	});

	it("returns empty array when no bots are in range", () => {
		registerBot("faraway", "reclaimers", pos(100, 100, 100), "worker");
		expect(getBotsInRange(pos(0, 0, 0), 5)).toEqual([]);
	});

	it("returns empty array when no bots are registered", () => {
		expect(getBotsInRange(pos(0, 0, 0), 100)).toEqual([]);
	});

	it("uses 3D Euclidean distance (Y axis matters)", () => {
		registerBot("high", "reclaimers", pos(0, 10, 0), "worker");
		// distance = 10, radius = 5: should NOT be included
		expect(getBotsInRange(pos(0, 0, 0), 5)).toEqual([]);
		// distance = 10, radius = 10: should be included
		expect(getBotsInRange(pos(0, 0, 0), 10)).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Faction filtering
// ---------------------------------------------------------------------------

describe("getBotsByFaction", () => {
	it("returns only bots of the specified faction", () => {
		registerBot("r1", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("r2", "reclaimers", pos(1, 0, 1), "harvester");
		registerBot("v1", "volt_collective", pos(2, 0, 2), "scout");
		const result = getBotsByFaction("reclaimers");
		expect(result).toHaveLength(2);
		expect(result.every((r) => r.faction === "reclaimers")).toBe(true);
	});

	it("returns empty array for a faction with no bots", () => {
		registerBot("r1", "reclaimers", pos(0, 0, 0), "worker");
		expect(getBotsByFaction("signal_choir")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Bot count
// ---------------------------------------------------------------------------

describe("getBotCount", () => {
	it("returns 0 when no bots are registered", () => {
		expect(getBotCount()).toBe(0);
	});

	it("tracks registrations and unregistrations", () => {
		registerBot("a", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("b", "iron_creed", pos(1, 0, 1), "soldier");
		expect(getBotCount()).toBe(2);
		unregisterBot("a");
		expect(getBotCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all bots and player reference", () => {
		registerBot("a", "reclaimers", pos(0, 0, 0), "worker");
		registerBot("b", "iron_creed", pos(1, 0, 1), "soldier");
		setPlayerBot("a");
		reset();
		expect(getBotCount()).toBe(0);
		expect(getPlayerBot()).toBeNull();
		expect(collectBotRenderData()).toEqual([]);
	});

	it("allows re-registration after reset", () => {
		registerBot("a", "reclaimers", pos(0, 0, 0), "worker");
		reset();
		registerBot("a", "volt_collective", pos(5, 0, 5), "scout");
		expect(getBotCount()).toBe(1);
		expect(collectBotRenderData()[0].faction).toBe("volt_collective");
	});
});
