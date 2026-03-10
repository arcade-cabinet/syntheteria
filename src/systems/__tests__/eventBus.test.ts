/**
 * Tests for the event bus system.
 *
 * Tests cover:
 * - subscribe/emit for each event type
 * - Priority ordering (high fires before normal before low)
 * - One-shot listeners auto-unsubscribe after first trigger
 * - Unsubscribe removes a specific listener
 * - Event history recording and getRecentEvents queries
 * - History buffer cap (oldest events evicted)
 * - emitMany fires events in order
 * - getRecentEvents with type filter and count limit
 * - reset clears all listeners and history
 * - Listeners added during emit do not fire for the current event
 * - Unsubscribing a non-existent callback is a no-op
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	type CombatKillEvent,
	type GameEvent,
	type GameEventType,
	type ResourceGatheredEvent,
	emit,
	emitMany,
	getMaxHistorySize,
	getRecentEvents,
	reset,
	setMaxHistorySize,
	subscribe,
	unsubscribe,
} from "../eventBus";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCombatKill(overrides: Partial<CombatKillEvent> = {}): CombatKillEvent {
	return {
		type: "combat_kill",
		attackerId: "attacker_1",
		targetId: "target_1",
		weaponType: "harvester",
		tick: 100,
		...overrides,
	};
}

function makeResourceGathered(
	overrides: Partial<ResourceGatheredEvent> = {},
): ResourceGatheredEvent {
	return {
		type: "resource_gathered",
		resourceType: "scrapMetal",
		amount: 10,
		sourceId: "vein_1",
		tick: 50,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// subscribe / emit basics
// ---------------------------------------------------------------------------

describe("eventBus — subscribe and emit", () => {
	it("calls the listener when a matching event is emitted", () => {
		const callback = jest.fn();
		subscribe("combat_kill", callback);

		const event = makeCombatKill();
		emit(event);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(event);
	});

	it("does not call listeners subscribed to a different event type", () => {
		const callback = jest.fn();
		subscribe("quest_complete", callback);

		emit(makeCombatKill());

		expect(callback).not.toHaveBeenCalled();
	});

	it("supports multiple listeners for the same event type", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		subscribe("combat_kill", cb1);
		subscribe("combat_kill", cb2);

		emit(makeCombatKill());

		expect(cb1).toHaveBeenCalledTimes(1);
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	it("delivers the correct payload fields for each event type", () => {
		const callback = jest.fn();
		subscribe("resource_gathered", callback);

		const event = makeResourceGathered({ amount: 42 });
		emit(event);

		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "resource_gathered",
				amount: 42,
				resourceType: "scrapMetal",
			}),
		);
	});

	it("supports all 10 event types", () => {
		const types: GameEventType[] = [
			"combat_kill",
			"quest_complete",
			"resource_gathered",
			"building_placed",
			"tech_researched",
			"territory_claimed",
			"cube_stolen",
			"storm_strike",
			"diplomacy_changed",
			"discovery_found",
		];

		const callbacks: Record<string, jest.Mock> = {};
		for (const t of types) {
			callbacks[t] = jest.fn();
			subscribe(t, callbacks[t]);
		}

		// Emit one of each.
		const events: GameEvent[] = [
			makeCombatKill(),
			{
				type: "quest_complete",
				questId: "q1",
				rewardItems: ["tool"],
				tick: 1,
			},
			makeResourceGathered(),
			{
				type: "building_placed",
				buildingType: "furnace",
				buildingId: "b1",
				position: { x: 0, y: 0, z: 0 },
				tick: 1,
			},
			{
				type: "tech_researched",
				techId: "t1",
				tier: 1,
				tick: 1,
			},
			{
				type: "territory_claimed",
				territoryId: "zone_1",
				factionId: "reclaimers",
				tick: 1,
			},
			{
				type: "cube_stolen",
				cubeId: "c1",
				thiefFactionId: "volt_collective",
				victimFactionId: "player",
				materialType: "iron",
				tick: 1,
			},
			{
				type: "storm_strike",
				position: { x: 5, y: 0, z: 5 },
				damage: 20,
				tick: 1,
			},
			{
				type: "diplomacy_changed",
				factionA: "player",
				factionB: "iron_creed",
				previousStance: "neutral",
				newStance: "friendly",
				tick: 1,
			},
			{
				type: "discovery_found",
				discoveryId: "d1",
				discoveryType: "ruin",
				position: { x: 10, y: 0, z: 10 },
				tick: 1,
			},
		];

		emitMany(events);

		for (const t of types) {
			expect(callbacks[t]).toHaveBeenCalledTimes(1);
		}
	});
});

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

describe("eventBus — priority", () => {
	it("high priority listeners fire before normal", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("normal"), { priority: "normal" });
		subscribe("combat_kill", () => order.push("high"), { priority: "high" });

		emit(makeCombatKill());

		expect(order).toEqual(["high", "normal"]);
	});

	it("normal priority listeners fire before low", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("low"), { priority: "low" });
		subscribe("combat_kill", () => order.push("normal"), { priority: "normal" });

		emit(makeCombatKill());

		expect(order).toEqual(["normal", "low"]);
	});

	it("full priority ordering: high > normal > low", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("low"), { priority: "low" });
		subscribe("combat_kill", () => order.push("high"), { priority: "high" });
		subscribe("combat_kill", () => order.push("normal"), { priority: "normal" });

		emit(makeCombatKill());

		expect(order).toEqual(["high", "normal", "low"]);
	});

	it("multiple listeners at the same priority fire in subscription order", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("first"), { priority: "normal" });
		subscribe("combat_kill", () => order.push("second"), { priority: "normal" });

		emit(makeCombatKill());

		expect(order).toEqual(["first", "second"]);
	});

	it("defaults to normal priority when not specified", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("default"));
		subscribe("combat_kill", () => order.push("low"), { priority: "low" });
		subscribe("combat_kill", () => order.push("high"), { priority: "high" });

		emit(makeCombatKill());

		expect(order).toEqual(["high", "default", "low"]);
	});
});

// ---------------------------------------------------------------------------
// One-shot listeners
// ---------------------------------------------------------------------------

describe("eventBus — one-shot", () => {
	it("one-shot listener fires once then auto-unsubscribes", () => {
		const callback = jest.fn();
		subscribe("combat_kill", callback, { once: true });

		emit(makeCombatKill());
		emit(makeCombatKill());

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("one-shot does not affect other listeners on the same event", () => {
		const onceCallback = jest.fn();
		const permanentCallback = jest.fn();

		subscribe("combat_kill", onceCallback, { once: true });
		subscribe("combat_kill", permanentCallback);

		emit(makeCombatKill());
		emit(makeCombatKill());

		expect(onceCallback).toHaveBeenCalledTimes(1);
		expect(permanentCallback).toHaveBeenCalledTimes(2);
	});

	it("one-shot with high priority fires in correct order", () => {
		const order: string[] = [];

		subscribe("combat_kill", () => order.push("normal"));
		subscribe("combat_kill", () => order.push("high_once"), {
			priority: "high",
			once: true,
		});

		emit(makeCombatKill());

		expect(order).toEqual(["high_once", "normal"]);

		// Second emit — the high-priority once listener is gone.
		order.length = 0;
		emit(makeCombatKill());

		expect(order).toEqual(["normal"]);
	});
});

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

describe("eventBus — unsubscribe", () => {
	it("unsubscribe removes a specific listener", () => {
		const callback = jest.fn();
		subscribe("combat_kill", callback);

		unsubscribe("combat_kill", callback);
		emit(makeCombatKill());

		expect(callback).not.toHaveBeenCalled();
	});

	it("unsubscribing one listener does not affect others", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		subscribe("combat_kill", cb1);
		subscribe("combat_kill", cb2);

		unsubscribe("combat_kill", cb1);
		emit(makeCombatKill());

		expect(cb1).not.toHaveBeenCalled();
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	it("unsubscribing a non-existent callback is a no-op", () => {
		const callback = jest.fn();
		expect(() => unsubscribe("combat_kill", callback)).not.toThrow();
	});

	it("unsubscribing from a type with no listeners is a no-op", () => {
		const callback = jest.fn();
		expect(() => unsubscribe("quest_complete", callback)).not.toThrow();
	});

	it("subscribe returns an unsubscribe function", () => {
		const callback = jest.fn();
		const unsub = subscribe("combat_kill", callback);

		unsub();
		emit(makeCombatKill());

		expect(callback).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Event history
// ---------------------------------------------------------------------------

describe("eventBus — event history", () => {
	it("records emitted events in history", () => {
		emit(makeCombatKill());
		emit(makeResourceGathered());

		const recent = getRecentEvents();
		expect(recent).toHaveLength(2);
	});

	it("returns events in most-recent-first order", () => {
		emit(makeCombatKill({ tick: 1 }));
		emit(makeResourceGathered({ tick: 2 }));

		const recent = getRecentEvents();
		expect(recent[0].type).toBe("resource_gathered");
		expect(recent[1].type).toBe("combat_kill");
	});

	it("filters by event type", () => {
		emit(makeCombatKill());
		emit(makeResourceGathered());
		emit(makeCombatKill({ tick: 200 }));

		const kills = getRecentEvents("combat_kill");
		expect(kills).toHaveLength(2);
		for (const e of kills) {
			expect(e.type).toBe("combat_kill");
		}
	});

	it("limits results with count parameter", () => {
		emit(makeCombatKill({ tick: 1 }));
		emit(makeCombatKill({ tick: 2 }));
		emit(makeCombatKill({ tick: 3 }));

		const recent = getRecentEvents(undefined, 2);
		expect(recent).toHaveLength(2);
		// Most recent first.
		expect(recent[0].tick).toBe(3);
		expect(recent[1].tick).toBe(2);
	});

	it("combines type filter and count", () => {
		emit(makeCombatKill({ tick: 1 }));
		emit(makeResourceGathered({ tick: 2 }));
		emit(makeCombatKill({ tick: 3 }));
		emit(makeCombatKill({ tick: 4 }));

		const recent = getRecentEvents("combat_kill", 2);
		expect(recent).toHaveLength(2);
		expect(recent[0].tick).toBe(4);
		expect(recent[1].tick).toBe(3);
	});

	it("returns empty array when no events recorded", () => {
		expect(getRecentEvents()).toEqual([]);
	});

	it("returns empty when filtering for type with no events", () => {
		emit(makeCombatKill());
		expect(getRecentEvents("quest_complete")).toEqual([]);
	});

	it("count of 0 returns empty array", () => {
		emit(makeCombatKill());
		expect(getRecentEvents(undefined, 0)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// History buffer cap
// ---------------------------------------------------------------------------

describe("eventBus — history cap", () => {
	it("trims history to maxHistorySize", () => {
		setMaxHistorySize(5);

		for (let i = 0; i < 10; i++) {
			emit(makeCombatKill({ tick: i }));
		}

		const recent = getRecentEvents();
		expect(recent).toHaveLength(5);
		// Should keep the most recent 5 (ticks 5-9).
		expect(recent[0].tick).toBe(9);
		expect(recent[4].tick).toBe(5);
	});

	it("setMaxHistorySize trims existing history", () => {
		for (let i = 0; i < 20; i++) {
			emit(makeCombatKill({ tick: i }));
		}

		setMaxHistorySize(3);
		const recent = getRecentEvents();
		expect(recent).toHaveLength(3);
	});

	it("setMaxHistorySize enforces minimum of 1", () => {
		setMaxHistorySize(0);
		expect(getMaxHistorySize()).toBe(1);

		setMaxHistorySize(-5);
		expect(getMaxHistorySize()).toBe(1);
	});

	it("default maxHistorySize is 100", () => {
		expect(getMaxHistorySize()).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// emitMany
// ---------------------------------------------------------------------------

describe("eventBus — emitMany", () => {
	it("emits all events in order", () => {
		const received: GameEvent[] = [];
		subscribe("combat_kill", (e) => received.push(e));
		subscribe("resource_gathered", (e) => received.push(e));

		emitMany([
			makeCombatKill({ tick: 1 }),
			makeResourceGathered({ tick: 2 }),
			makeCombatKill({ tick: 3 }),
		]);

		expect(received).toHaveLength(3);
		expect(received[0].tick).toBe(1);
		expect(received[1].tick).toBe(2);
		expect(received[2].tick).toBe(3);
	});

	it("empty array does not throw", () => {
		expect(() => emitMany([])).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("eventBus — reset", () => {
	it("clears all listeners", () => {
		const callback = jest.fn();
		subscribe("combat_kill", callback);

		reset();
		emit(makeCombatKill());

		expect(callback).not.toHaveBeenCalled();
	});

	it("clears event history", () => {
		emit(makeCombatKill());
		expect(getRecentEvents()).toHaveLength(1);

		reset();
		expect(getRecentEvents()).toHaveLength(0);
	});

	it("resets maxHistorySize to 100", () => {
		setMaxHistorySize(5);
		reset();
		expect(getMaxHistorySize()).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("eventBus — edge cases", () => {
	it("emitting with no listeners does not throw", () => {
		expect(() => emit(makeCombatKill())).not.toThrow();
	});

	it("event is still recorded in history even with no listeners", () => {
		emit(makeCombatKill());
		expect(getRecentEvents()).toHaveLength(1);
	});

	it("listener can safely unsubscribe during its own callback", () => {
		const callback = jest.fn(() => {
			unsubscribe("combat_kill", callback);
		});
		subscribe("combat_kill", callback);

		emit(makeCombatKill());
		emit(makeCombatKill());

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("listener added during emit is not called for the current event", () => {
		const lateCallback = jest.fn();
		const earlyCallback = jest.fn(() => {
			subscribe("combat_kill", lateCallback);
		});

		subscribe("combat_kill", earlyCallback);
		emit(makeCombatKill());

		// earlyCallback fired, but lateCallback should not fire for this emit.
		expect(earlyCallback).toHaveBeenCalledTimes(1);
		expect(lateCallback).not.toHaveBeenCalled();

		// On the next emit, lateCallback should fire.
		emit(makeCombatKill());
		expect(lateCallback).toHaveBeenCalledTimes(1);
	});
});
