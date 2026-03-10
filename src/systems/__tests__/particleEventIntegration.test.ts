/**
 * Unit tests for the particle event integration system.
 *
 * Tests cover:
 * - Initialization sets up subscriptions for all mapped event types
 * - Teardown removes all subscriptions
 * - Each mapped event type produces the correct particle action
 * - Position extraction from events that carry position data
 * - Direction extraction for cube_thrown events
 * - Events without position produce undefined position
 * - drainPendingParticles returns and clears the queue
 * - Multiple events queue in order
 * - Double-init is a no-op
 * - Teardown before init is safe
 * - Reset clears everything
 * - weather_change does NOT produce particles
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubscribe = jest.fn<() => void, [string, (...args: unknown[]) => void, ...unknown[]]>();
const mockUnsubscribes: Array<jest.Mock> = [];

jest.mock("../eventBus", () => ({
	subscribe: (...args: unknown[]) => {
		const unsub = jest.fn();
		mockUnsubscribes.push(unsub);
		mockSubscribe(...(args as Parameters<typeof mockSubscribe>));
		return unsub;
	},
}));

import {
	initParticleEventIntegration,
	teardownParticleEventIntegration,
	drainPendingParticles,
	getSubscriptionCount,
	isInitialized,
	reset,
} from "../particleEventIntegration";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate an event by calling the listener that was registered for a given event type. */
function simulateEvent(eventType: string, payload: Record<string, unknown>): void {
	const call = mockSubscribe.mock.calls.find((c) => c[0] === eventType);
	if (!call) {
		throw new Error(`No subscription found for event type "${eventType}"`);
	}
	const listener = call[1] as (event: Record<string, unknown>) => void;
	listener({ type: eventType, ...payload });
}

/** Get all event types that were subscribed to. */
function getSubscribedEventTypes(): string[] {
	return mockSubscribe.mock.calls.map((c) => c[0] as string);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
	mockSubscribe.mockClear();
	mockUnsubscribes.length = 0;
});

afterEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("particleEventIntegration — initialization", () => {
	it("sets up subscriptions for all mapped event types", () => {
		initParticleEventIntegration();

		const subscribedTypes = getSubscribedEventTypes();
		expect(subscribedTypes).toContain("harvest_started");
		expect(subscribedTypes).toContain("harvest_complete");
		expect(subscribedTypes).toContain("compression_started");
		expect(subscribedTypes).toContain("cube_spawned");
		expect(subscribedTypes).toContain("cube_dropped");
		expect(subscribedTypes).toContain("cube_thrown");
		expect(subscribedTypes).toContain("damage_taken");
		expect(subscribedTypes).toContain("entity_death");
		expect(subscribedTypes).toContain("combat_kill");
		expect(subscribedTypes).toContain("building_placed");
		expect(subscribedTypes).toContain("storm_strike");
	});

	it("subscribes to exactly 11 event types", () => {
		initParticleEventIntegration();
		expect(mockSubscribe).toHaveBeenCalledTimes(11);
	});

	it("marks the system as initialized", () => {
		expect(isInitialized()).toBe(false);
		initParticleEventIntegration();
		expect(isInitialized()).toBe(true);
	});

	it("double-init is a no-op", () => {
		initParticleEventIntegration();
		const firstCount = mockSubscribe.mock.calls.length;

		initParticleEventIntegration();
		expect(mockSubscribe.mock.calls.length).toBe(firstCount);
	});

	it("reports correct subscription count after init", () => {
		initParticleEventIntegration();
		expect(getSubscriptionCount()).toBe(11);
	});
});

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

describe("particleEventIntegration — teardown", () => {
	it("calls all unsubscribe functions", () => {
		initParticleEventIntegration();
		const unsubs = [...mockUnsubscribes];

		teardownParticleEventIntegration();

		for (const unsub of unsubs) {
			expect(unsub).toHaveBeenCalledTimes(1);
		}
	});

	it("clears subscription count", () => {
		initParticleEventIntegration();
		expect(getSubscriptionCount()).toBe(11);

		teardownParticleEventIntegration();
		expect(getSubscriptionCount()).toBe(0);
	});

	it("marks system as not initialized", () => {
		initParticleEventIntegration();
		teardownParticleEventIntegration();
		expect(isInitialized()).toBe(false);
	});

	it("teardown before init is safe", () => {
		expect(() => teardownParticleEventIntegration()).not.toThrow();
		expect(getSubscriptionCount()).toBe(0);
	});

	it("allows re-init after teardown", () => {
		initParticleEventIntegration();
		teardownParticleEventIntegration();
		mockSubscribe.mockClear();
		mockUnsubscribes.length = 0;

		initParticleEventIntegration();
		expect(mockSubscribe).toHaveBeenCalledTimes(11);
		expect(isInitialized()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Event → particle action mapping
// ---------------------------------------------------------------------------

describe("particleEventIntegration — event to particle mapping", () => {
	beforeEach(() => {
		initParticleEventIntegration();
	});

	it("harvest_started → harvest_sparks", () => {
		simulateEvent("harvest_started", { entityId: "e1", depositId: "d1", materialType: "iron", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("harvest_sparks");
	});

	it("harvest_complete → harvest_burst", () => {
		simulateEvent("harvest_complete", { entityId: "e1", depositId: "d1", materialType: "iron", powderGained: 10, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("harvest_burst");
	});

	it("compression_started → compression_steam", () => {
		simulateEvent("compression_started", { entityId: "e1", materialType: "iron", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("compression_steam");
	});

	it("cube_spawned → cube_spawn_burst", () => {
		simulateEvent("cube_spawned", { cubeId: "c1", materialType: "iron", position: { x: 1, y: 2, z: 3 }, source: "compression", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("cube_spawn_burst");
	});

	it("cube_dropped → cube_impact_dust", () => {
		simulateEvent("cube_dropped", { cubeId: "c1", entityId: "e1", position: { x: 4, y: 5, z: 6 }, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("cube_impact_dust");
	});

	it("cube_thrown → cube_trail", () => {
		simulateEvent("cube_thrown", { cubeId: "c1", entityId: "e1", direction: { x: 0, y: 0, z: 1 }, force: 10, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("cube_trail");
	});

	it("damage_taken → damage_sparks", () => {
		simulateEvent("damage_taken", { targetId: "t1", sourceId: "s1", amount: 5, damageType: "kinetic", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("damage_sparks");
	});

	it("entity_death → death_explosion", () => {
		simulateEvent("entity_death", { entityId: "e1", killedBy: "k1", entityType: "bot", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("death_explosion");
	});

	it("combat_kill → kill_burst", () => {
		simulateEvent("combat_kill", { attackerId: "a1", targetId: "t1", weaponType: "laser", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("kill_burst");
	});

	it("building_placed → build_dust", () => {
		simulateEvent("building_placed", { buildingType: "wall", buildingId: "b1", position: { x: 7, y: 8, z: 9 }, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("build_dust");
	});

	it("storm_strike → lightning_strike", () => {
		simulateEvent("storm_strike", { position: { x: 10, y: 11, z: 12 }, damage: 20, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles).toHaveLength(1);
		expect(particles[0].action).toBe("lightning_strike");
	});
});

// ---------------------------------------------------------------------------
// Position extraction
// ---------------------------------------------------------------------------

describe("particleEventIntegration — position extraction", () => {
	beforeEach(() => {
		initParticleEventIntegration();
	});

	it("extracts position from cube_spawned event", () => {
		simulateEvent("cube_spawned", { cubeId: "c1", materialType: "iron", position: { x: 1, y: 2, z: 3 }, source: "compression", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("extracts position from cube_dropped event", () => {
		simulateEvent("cube_dropped", { cubeId: "c1", entityId: "e1", position: { x: 4, y: 5, z: 6 }, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toEqual({ x: 4, y: 5, z: 6 });
	});

	it("extracts position from building_placed event", () => {
		simulateEvent("building_placed", { buildingType: "wall", buildingId: "b1", position: { x: 7, y: 8, z: 9 }, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toEqual({ x: 7, y: 8, z: 9 });
	});

	it("extracts position from storm_strike event", () => {
		simulateEvent("storm_strike", { position: { x: 10, y: 11, z: 12 }, damage: 20, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toEqual({ x: 10, y: 11, z: 12 });
	});

	it("extracts direction as position from cube_thrown event", () => {
		simulateEvent("cube_thrown", { cubeId: "c1", entityId: "e1", direction: { x: 0, y: 1, z: 0 }, force: 10, tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toEqual({ x: 0, y: 1, z: 0 });
	});

	it("compression_started has no position (player-relative)", () => {
		simulateEvent("compression_started", { entityId: "e1", materialType: "iron", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toBeUndefined();
	});

	it("damage_taken has no position", () => {
		simulateEvent("damage_taken", { targetId: "t1", sourceId: "s1", amount: 5, damageType: "kinetic", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toBeUndefined();
	});

	it("entity_death has no position", () => {
		simulateEvent("entity_death", { entityId: "e1", killedBy: "k1", entityType: "bot", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toBeUndefined();
	});

	it("combat_kill has no position", () => {
		simulateEvent("combat_kill", { attackerId: "a1", targetId: "t1", weaponType: "laser", tick: 1 });
		const particles = drainPendingParticles();
		expect(particles[0].position).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// drainPendingParticles behavior
// ---------------------------------------------------------------------------

describe("particleEventIntegration — drain behavior", () => {
	beforeEach(() => {
		initParticleEventIntegration();
	});

	it("returns empty array when no events have fired", () => {
		const particles = drainPendingParticles();
		expect(particles).toEqual([]);
	});

	it("clears the queue after draining", () => {
		simulateEvent("damage_taken", { targetId: "t1", sourceId: "s1", amount: 5, damageType: "kinetic", tick: 1 });

		const first = drainPendingParticles();
		expect(first).toHaveLength(1);

		const second = drainPendingParticles();
		expect(second).toEqual([]);
	});

	it("queues multiple events in order", () => {
		simulateEvent("damage_taken", { targetId: "t1", sourceId: "s1", amount: 5, damageType: "kinetic", tick: 1 });
		simulateEvent("combat_kill", { attackerId: "a1", targetId: "t1", weaponType: "laser", tick: 2 });
		simulateEvent("storm_strike", { position: { x: 1, y: 2, z: 3 }, damage: 20, tick: 3 });

		const particles = drainPendingParticles();
		expect(particles).toHaveLength(3);
		expect(particles[0].action).toBe("damage_sparks");
		expect(particles[1].action).toBe("kill_burst");
		expect(particles[2].action).toBe("lightning_strike");
	});
});

// ---------------------------------------------------------------------------
// weather_change exclusion
// ---------------------------------------------------------------------------

describe("particleEventIntegration — excluded events", () => {
	it("does NOT subscribe to weather_change", () => {
		initParticleEventIntegration();
		const subscribedTypes = getSubscribedEventTypes();
		expect(subscribedTypes).not.toContain("weather_change");
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("particleEventIntegration — reset", () => {
	it("clears subscriptions and queue", () => {
		initParticleEventIntegration();
		simulateEvent("damage_taken", { targetId: "t1", sourceId: "s1", amount: 5, damageType: "kinetic", tick: 1 });

		reset();

		expect(getSubscriptionCount()).toBe(0);
		expect(isInitialized()).toBe(false);
		expect(drainPendingParticles()).toEqual([]);
	});

	it("reset is idempotent", () => {
		expect(() => {
			reset();
			reset();
			reset();
		}).not.toThrow();
	});
});
