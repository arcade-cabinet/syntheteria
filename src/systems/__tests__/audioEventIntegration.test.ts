/**
 * Tests for audioEventIntegration.ts — the bridge between the typed event
 * bus and the audio feedback system.
 *
 * Verifies that:
 *  - initAudioEventIntegration subscribes to all mapped event types
 *  - teardownAudioEventIntegration removes all subscriptions
 *  - Each event type produces the correct audio action string
 *  - drainPendingActions returns accumulated actions and clears the queue
 *  - reset clears subscriptions and pending queue
 *  - Idempotent init (calling init twice does not double-subscribe)
 */

jest.mock("../eventBus");

import {
	subscribe as mockSubscribe,
	unsubscribe as mockUnsubscribe,
} from "../eventBus";

import {
	initAudioEventIntegration,
	teardownAudioEventIntegration,
	drainPendingActions,
	getActiveSubscriptionCount,
	getSubscribedEventTypes,
	getMappedEventCount,
	getActionForEvent,
	reset,
} from "../audioEventIntegration";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * After calling initAudioEventIntegration(), the mocked `subscribe` will have
 * been called once per mapped event type.  This helper finds the callback
 * registered for `eventType` and invokes it with a minimal event payload so
 * we can inspect what action string is queued.
 */
function simulateEvent(eventType: string): void {
	const calls = (mockSubscribe as jest.Mock).mock.calls;
	const match = calls.find(([type]: [string]) => type === eventType);
	if (!match) {
		throw new Error(
			`No subscription found for event type "${eventType}". ` +
				`Registered types: ${calls.map(([t]: [string]) => t).join(", ")}`,
		);
	}
	// match[1] is the callback
	const callback = match[1] as (event: { type: string }) => void;
	callback({ type: eventType });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
	(mockSubscribe as jest.Mock).mockClear();
	(mockUnsubscribe as jest.Mock).mockClear();
});

// ---------------------------------------------------------------------------
// Mapping table — source of truth for all event→action assertions
// ---------------------------------------------------------------------------

const EXPECTED_MAPPINGS: Array<[string, string]> = [
	["harvest_started", "harvest_start"],
	["harvest_complete", "harvest_complete"],
	["compression_started", "compression_start"],
	["cube_spawned", "cube_eject"],
	["cube_grabbed", "cube_grab"],
	["cube_dropped", "cube_drop"],
	["cube_thrown", "cube_throw"],
	["furnace_deposit", "furnace_deposit"],
	["smelting_complete", "furnace_complete"],
	["damage_taken", "damage_hit"],
	["entity_death", "entity_death"],
	["combat_kill", "combat_kill"],
	["building_placed", "building_place"],
	["tech_researched", "tech_unlock"],
	["achievement_unlocked", "achievement_unlock"],
	["level_up", "level_up"],
	["weather_change", "weather_transition"],
];

// ---------------------------------------------------------------------------
// initAudioEventIntegration
// ---------------------------------------------------------------------------

describe("initAudioEventIntegration", () => {
	it("subscribes to all 17 mapped event types", () => {
		initAudioEventIntegration();

		expect(mockSubscribe).toHaveBeenCalledTimes(17);
	});

	it("passes a callback function for each subscription", () => {
		initAudioEventIntegration();

		for (const call of (mockSubscribe as jest.Mock).mock.calls) {
			expect(typeof call[1]).toBe("function");
		}
	});

	it("subscribes to each expected event type exactly once", () => {
		initAudioEventIntegration();

		const subscribedTypes = (mockSubscribe as jest.Mock).mock.calls.map(
			([type]: [string]) => type,
		);

		for (const [eventType] of EXPECTED_MAPPINGS) {
			expect(subscribedTypes).toContain(eventType);
		}
	});

	it("tracks active subscription count", () => {
		expect(getActiveSubscriptionCount()).toBe(0);

		initAudioEventIntegration();

		expect(getActiveSubscriptionCount()).toBe(17);
	});

	it("reports subscribed event types", () => {
		initAudioEventIntegration();

		const types = getSubscribedEventTypes();
		expect(types).toHaveLength(17);
		for (const [eventType] of EXPECTED_MAPPINGS) {
			expect(types).toContain(eventType);
		}
	});

	it("is idempotent — calling init twice does not double-subscribe", () => {
		initAudioEventIntegration();
		initAudioEventIntegration();

		// The second call should teardown first, so total subscribe calls = 34
		// but active subscriptions should still be 17.
		expect(getActiveSubscriptionCount()).toBe(17);
		// The first batch was unsubscribed, then re-subscribed.
		expect(mockUnsubscribe).toHaveBeenCalledTimes(17);
	});
});

// ---------------------------------------------------------------------------
// teardownAudioEventIntegration
// ---------------------------------------------------------------------------

describe("teardownAudioEventIntegration", () => {
	it("calls unsubscribe for every active subscription", () => {
		initAudioEventIntegration();
		(mockUnsubscribe as jest.Mock).mockClear();

		teardownAudioEventIntegration();

		expect(mockUnsubscribe).toHaveBeenCalledTimes(17);
	});

	it("clears active subscription count to zero", () => {
		initAudioEventIntegration();
		teardownAudioEventIntegration();

		expect(getActiveSubscriptionCount()).toBe(0);
	});

	it("passes the same callback reference used during subscribe", () => {
		initAudioEventIntegration();

		// Collect the callbacks passed to subscribe.
		const subscribeCallbacks = new Map<string, unknown>();
		for (const [type, cb] of (mockSubscribe as jest.Mock).mock.calls) {
			subscribeCallbacks.set(type as string, cb);
		}

		teardownAudioEventIntegration();

		// Each unsubscribe call should use the matching callback.
		for (const [type, cb] of (mockUnsubscribe as jest.Mock).mock.calls) {
			expect(cb).toBe(subscribeCallbacks.get(type as string));
		}
	});

	it("is safe to call without prior init", () => {
		expect(() => teardownAudioEventIntegration()).not.toThrow();
		expect(mockUnsubscribe).not.toHaveBeenCalled();
	});

	it("is safe to call twice", () => {
		initAudioEventIntegration();
		teardownAudioEventIntegration();

		(mockUnsubscribe as jest.Mock).mockClear();
		teardownAudioEventIntegration();

		expect(mockUnsubscribe).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Event → audio action mapping (per-event tests)
// ---------------------------------------------------------------------------

describe("event-to-action mapping", () => {
	beforeEach(() => {
		initAudioEventIntegration();
	});

	it.each(EXPECTED_MAPPINGS)(
		"event '%s' queues action '%s'",
		(eventType, expectedAction) => {
			simulateEvent(eventType);

			const actions = drainPendingActions();
			expect(actions).toEqual([expectedAction]);
		},
	);
});

// ---------------------------------------------------------------------------
// drainPendingActions
// ---------------------------------------------------------------------------

describe("drainPendingActions", () => {
	beforeEach(() => {
		initAudioEventIntegration();
	});

	it("returns empty array when no events have fired", () => {
		expect(drainPendingActions()).toEqual([]);
	});

	it("returns all queued actions in order", () => {
		simulateEvent("harvest_started");
		simulateEvent("cube_spawned");
		simulateEvent("combat_kill");

		const actions = drainPendingActions();
		expect(actions).toEqual(["harvest_start", "cube_eject", "combat_kill"]);
	});

	it("clears the queue after draining", () => {
		simulateEvent("harvest_started");
		drainPendingActions();

		expect(drainPendingActions()).toEqual([]);
	});

	it("accumulates actions across multiple events before drain", () => {
		simulateEvent("cube_grabbed");
		simulateEvent("cube_dropped");

		const actions = drainPendingActions();
		expect(actions).toHaveLength(2);
	});

	it("handles duplicate events correctly", () => {
		simulateEvent("damage_taken");
		simulateEvent("damage_taken");
		simulateEvent("damage_taken");

		const actions = drainPendingActions();
		expect(actions).toEqual(["damage_hit", "damage_hit", "damage_hit"]);
	});
});

// ---------------------------------------------------------------------------
// getActionForEvent
// ---------------------------------------------------------------------------

describe("getActionForEvent", () => {
	it("returns the mapped action for a known event type", () => {
		expect(getActionForEvent("harvest_started")).toBe("harvest_start");
		expect(getActionForEvent("cube_spawned")).toBe("cube_eject");
		expect(getActionForEvent("weather_change")).toBe("weather_transition");
	});

	it("returns null for an unmapped event type", () => {
		expect(getActionForEvent("player_respawn")).toBeNull();
		expect(getActionForEvent("territory_claimed")).toBeNull();
		expect(getActionForEvent("discovery_found")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getMappedEventCount
// ---------------------------------------------------------------------------

describe("getMappedEventCount", () => {
	it("returns 17 for the hardcoded mapping table", () => {
		expect(getMappedEventCount()).toBe(17);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears pending actions", () => {
		initAudioEventIntegration();
		simulateEvent("harvest_started");

		reset();

		expect(drainPendingActions()).toEqual([]);
	});

	it("removes all subscriptions", () => {
		initAudioEventIntegration();
		(mockUnsubscribe as jest.Mock).mockClear();

		reset();

		expect(mockUnsubscribe).toHaveBeenCalledTimes(17);
		expect(getActiveSubscriptionCount()).toBe(0);
	});

	it("allows re-initialization after reset", () => {
		initAudioEventIntegration();
		reset();
		(mockSubscribe as jest.Mock).mockClear();

		initAudioEventIntegration();

		expect(mockSubscribe).toHaveBeenCalledTimes(17);
		expect(getActiveSubscriptionCount()).toBe(17);
	});

	it("is safe to call when already clean", () => {
		expect(() => reset()).not.toThrow();
		expect(getActiveSubscriptionCount()).toBe(0);
		expect(drainPendingActions()).toEqual([]);
	});
});
