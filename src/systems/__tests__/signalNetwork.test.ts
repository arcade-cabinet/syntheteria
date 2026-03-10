/**
 * Unit tests for the signal network system.
 *
 * Tests cover:
 * - BFS signal propagation from player bots
 * - Signal strength degradation with distance
 * - Relay range checks
 * - Global compute pool feeding
 * - Edge cases: isolated relays, overlapping signals, max distance
 * - isInSignalRange utility
 * - No active player bot fallback
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted runs before vi.mock factory hoisting
// ---------------------------------------------------------------------------

const { mockWorld, mockPlayerBots, mockSignalRelays, mockWires } = vi.hoisted(
	() => ({
		mockWorld: [] as any[],
		mockPlayerBots: [] as any[],
		mockSignalRelays: [] as any[],
		mockWires: [] as any[],
	}),
);

vi.mock("../../ecs/world", () => ({
	world: mockWorld,
	playerBots: mockPlayerBots,
	signalRelays: mockSignalRelays,
	wires: mockWires,
}));

import {
	getGlobalCompute,
	isInSignalRange,
	signalNetworkSystem,
} from "../signalNetwork";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entityIdCounter = 0;

function makeRelay(opts: {
	id?: string;
	x: number;
	z: number;
	signalRange?: number;
}) {
	const id = opts.id ?? `relay_${++entityIdCounter}`;
	const entity = {
		id,
		faction: "player" as const,
		worldPosition: { x: opts.x, y: 0, z: opts.z },
		signalRelay: {
			signalRange: opts.signalRange ?? 10,
			connectedTo: [],
			signalStrength: 0,
		},
	};
	mockWorld.push(entity);
	mockSignalRelays.push(entity);
	return entity;
}

function makePlayerBot(opts: {
	x: number;
	z: number;
	isActive?: boolean;
}) {
	const id = `player_${++entityIdCounter}`;
	const entity = {
		id,
		faction: "player" as const,
		worldPosition: { x: opts.x, y: 0, z: opts.z },
		playerControlled: { isActive: opts.isActive ?? true, yaw: 0, pitch: 0 },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: [],
		},
	};
	mockPlayerBots.push(entity);
	return entity;
}

function makeSignalWire(fromId: string, toId: string) {
	const id = `wire_${++entityIdCounter}`;
	const entity = {
		id,
		faction: "player" as const,
		wire: {
			wireType: "signal" as const,
			fromEntityId: fromId,
			toEntityId: toId,
			length: 1,
			currentLoad: 0,
			maxCapacity: 1,
		},
	};
	mockWorld.push(entity);
	mockWires.push(entity);
	return entity;
}

function makePowerWire(fromId: string, toId: string) {
	const id = `wire_${++entityIdCounter}`;
	const entity = {
		id,
		faction: "player" as const,
		wire: {
			wireType: "power" as const,
			fromEntityId: fromId,
			toEntityId: toId,
			length: 1,
			currentLoad: 0,
			maxCapacity: 1,
		},
	};
	mockWorld.push(entity);
	mockWires.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	entityIdCounter = 0;
	mockWorld.length = 0;
	mockPlayerBots.length = 0;
	mockSignalRelays.length = 0;
	mockWires.length = 0;
});

afterEach(() => {
	mockWorld.length = 0;
	mockPlayerBots.length = 0;
	mockSignalRelays.length = 0;
	mockWires.length = 0;
});

// ---------------------------------------------------------------------------
// Basic signal propagation from player bot to nearby relay
// ---------------------------------------------------------------------------

describe("signal propagation — basic", () => {
	it("connects a relay within range of the player bot", () => {
		makePlayerBot({ x: 0, z: 0 });
		const relay = makeRelay({ x: 5, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// strength = max(0, 1 - 5/10) = 0.5
		expect(relay.signalRelay.signalStrength).toBeCloseTo(0.5);
	});

	it("does not connect a relay outside range of the player bot", () => {
		makePlayerBot({ x: 0, z: 0 });
		const relay = makeRelay({ x: 15, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// strength = max(0, 1 - 15/10) = max(0, -0.5) = 0
		// Since 0 <= 0.1, relay is not connected
		expect(relay.signalRelay.signalStrength).toBe(0);
	});

	it("resets relay strengths each tick", () => {
		makePlayerBot({ x: 0, z: 0 });
		const relay = makeRelay({ x: 5, z: 0, signalRange: 10 });

		signalNetworkSystem();
		expect(relay.signalRelay.signalStrength).toBeCloseTo(0.5);

		// Remove player bot — relay should reset
		mockPlayerBots.length = 0;
		signalNetworkSystem();

		expect(relay.signalRelay.signalStrength).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Signal strength degradation with distance
// ---------------------------------------------------------------------------

describe("signal strength degradation", () => {
	it("strength is 1.0 at distance 0 (relay at player position)", () => {
		makePlayerBot({ x: 0, z: 0 });
		const relay = makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// strength = 1 - 0/10 = 1.0
		expect(relay.signalRelay.signalStrength).toBeCloseTo(1.0);
	});

	it("strength degrades linearly with distance", () => {
		makePlayerBot({ x: 0, z: 0 });
		const near = makeRelay({ id: "near", x: 2, z: 0, signalRange: 10 });
		const mid = makeRelay({ id: "mid", x: 5, z: 0, signalRange: 10 });
		const far = makeRelay({ id: "far", x: 8, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// near: 1 - 2/10 = 0.8
		expect(near.signalRelay.signalStrength).toBeCloseTo(0.8);
		// mid: 1 - 5/10 = 0.5
		expect(mid.signalRelay.signalStrength).toBeCloseTo(0.5);
		// far: 1 - 8/10 = 0.2
		expect(far.signalRelay.signalStrength).toBeCloseTo(0.2);
	});

	it("relay with strength <= 0.1 is not connected", () => {
		makePlayerBot({ x: 0, z: 0 });
		// Distance 9 => strength = 1 - 9/10 = 0.1 — exactly at threshold
		const borderline = makeRelay({ id: "borderline", x: 9, z: 0, signalRange: 10 });
		// Distance 9.5 => strength = 1 - 9.5/10 = 0.05 — below threshold
		const tooWeak = makeRelay({ id: "tooWeak", x: 9.5, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// 0.1 is NOT > 0.1, so borderline should NOT be connected
		expect(borderline.signalRelay.signalStrength).toBe(0);
		// 0.05 < 0.1, not connected
		expect(tooWeak.signalRelay.signalStrength).toBe(0);
	});

	it("relay just above 0.1 threshold is connected", () => {
		makePlayerBot({ x: 0, z: 0 });
		// Distance 8.9 => strength = 1 - 8.9/10 = 0.11 — above threshold
		const above = makeRelay({ x: 8.9, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(above.signalRelay.signalStrength).toBeCloseTo(0.11);
	});
});

// ---------------------------------------------------------------------------
// BFS propagation through relay chains
// ---------------------------------------------------------------------------

describe("BFS propagation through relay chains", () => {
	it("propagates signal through a chain of relays connected by proximity", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Chain: player(0) -> relay1(5) -> relay2(10)
		// relay1 is within range 10 of player and relay2
		// relay2 is NOT within range of player (dist=10, strength=0, not > 0.1)
		// but relay2 IS within range of relay1 (dist=5, both have range 10)
		const relay1 = makeRelay({ id: "r1", x: 5, z: 0, signalRange: 10 });
		const relay2 = makeRelay({ id: "r2", x: 10, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// relay1: direct from player: 1 - 5/10 = 0.5
		expect(relay1.signalRelay.signalStrength).toBeCloseTo(0.5);

		// relay2: propagated from relay1
		// dist between relay1(5,0) and relay2(10,0) = 5
		// strength = relay1.strength * (1 - dist/relay2.range) = 0.5 * (1 - 5/10) = 0.25
		expect(relay2.signalRelay.signalStrength).toBeCloseTo(0.25);
	});

	it("propagates through a chain connected by signal wires", () => {
		makePlayerBot({ x: 0, z: 0 });

		// relay1: near player. dist=3, range=5 => direct strength = 1-3/5 = 0.4
		// relay2: far from player. dist=20, range=50.
		//   Direct seed: 1-20/50 = 0.6 > 0.1 => would be seeded directly.
		//   To truly test wire-only propagation, relay2 must be beyond its own
		//   direct seed range. Use range=15: 1-20/15 = -0.33 => 0, not seeded.
		//   Proximity: dist between r1(3,0) and r2(20,0) = 17.
		//   min(5, 15) = 5. 17 > 5 => NOT spatial neighbors.
		//   Wire BFS: strength = 0.4 * (1 - 17/15) => 0.4 * (-0.133) => 0.
		//   Range 15 is too small. Use range=50:
		//   Direct seed: 1-20/50 = 0.6 (still seeded directly!)
		//   Use dist=100, range=5: 1-100/5 => 0 (not seeded).
		//   Proximity: min(5,5)=5, dist=97 > 5 (not neighbors).
		//   Wire BFS: 0.4 * (1-97/5) < 0 (too far for BFS too).
		//
		// The fundamental constraint is: relay2.range must be > dist(r1,r2) for
		// BFS propagation, but also > dist(player,r2) for direct seeding check.
		// To avoid direct seeding, we need dist(player,r2) > r2.range * 0.9.
		// Use relay2 at (20,0) with range=22:
		//   Direct: 1-20/22 = 0.09 <= 0.1 => NOT seeded directly.
		//   Proximity: min(5,22) = 5, dist=17 > 5 => NOT neighbors.
		//   Wire BFS: 0.4 * (1-17/22) = 0.4 * 0.2273 = 0.0909 <= 0.1 => NOT connected.
		// Still too weak! Use relay2 at (12,0) with range=14:
		//   Direct: 1-12/14 = 0.143 > 0.1 => seeded. Nope.
		// Use relay2 at (12,0) with range=13:
		//   Direct: 1-12/13 = 0.077 <= 0.1 => NOT seeded.
		//   Proximity: min(5,13) = 5, dist=9 > 5 => NOT neighbors.
		//   Wire BFS: 0.4 * (1-9/13) = 0.4 * 0.3077 = 0.123 > 0.1 => CONNECTED!
		const relay1 = makeRelay({ id: "r1", x: 3, z: 0, signalRange: 5 });
		const relay2 = makeRelay({ id: "r2", x: 12, z: 0, signalRange: 13 });
		makeSignalWire("r1", "r2");

		signalNetworkSystem();

		// relay1: 1 - 3/5 = 0.4
		expect(relay1.signalRelay.signalStrength).toBeCloseTo(0.4);

		// relay2 via BFS from relay1:
		// dist(r1, r2) = 9, strength = 0.4 * (1 - 9/13) = 0.4 * (4/13) ~ 0.123
		expect(relay2.signalRelay.signalStrength).toBeCloseTo(0.4 * (4 / 13));
		expect(relay2.signalRelay.signalStrength).toBeGreaterThan(0.1);
	});

	it("does not propagate through power wires (only signal wires)", () => {
		makePlayerBot({ x: 0, z: 0 });

		const relay1 = makeRelay({ id: "r1", x: 3, z: 0, signalRange: 5 });
		// relay2 out of proximity range of relay1 (dist=50, range=5)
		const relay2 = makeRelay({ id: "r2", x: 53, z: 0, signalRange: 5 });
		makePowerWire("r1", "r2"); // power, not signal

		signalNetworkSystem();

		expect(relay1.signalRelay.signalStrength).toBeCloseTo(0.4);
		// relay2 should not be connected — no signal wire, out of proximity
		expect(relay2.signalRelay.signalStrength).toBe(0);
	});

	it("uses minimum of both relays' ranges for proximity edges", () => {
		makePlayerBot({ x: 0, z: 0 });

		// relay1 has range 20, relay2 has range 5
		// They are 8 apart — within relay1's range but NOT relay2's range
		// The code uses Math.min(a.range, b.range) = 5
		// Distance 8 > 5, so they should NOT be spatial neighbors
		const relay1 = makeRelay({ id: "r1", x: 3, z: 0, signalRange: 20 });
		const relay2 = makeRelay({ id: "r2", x: 11, z: 0, signalRange: 5 });

		signalNetworkSystem();

		expect(relay1.signalRelay.signalStrength).toBeGreaterThan(0.1);
		// relay2 is at dist 11 from player with range 5: 1 - 11/5 < 0, not connected directly
		// And not reachable from relay1 via proximity (dist 8 > min(20,5) = 5)
		expect(relay2.signalRelay.signalStrength).toBe(0);
	});

	it("BFS does not revisit already-visited relays", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Triangle: r1 <-> r2 <-> r3 <-> r1
		const r1 = makeRelay({ id: "r1", x: 3, z: 0, signalRange: 10 });
		const r2 = makeRelay({ id: "r2", x: 6, z: 0, signalRange: 10 });
		const r3 = makeRelay({ id: "r3", x: 4, z: 3, signalRange: 10 });

		signalNetworkSystem();

		// All three should be connected — no infinite loops
		expect(r1.signalRelay.signalStrength).toBeGreaterThan(0.1);
		expect(r2.signalRelay.signalStrength).toBeGreaterThan(0.1);
		expect(r3.signalRelay.signalStrength).toBeGreaterThan(0.1);
	});
});

// ---------------------------------------------------------------------------
// Global compute pool
// ---------------------------------------------------------------------------

describe("global compute pool", () => {
	it("sums connected relay strengths * 10", () => {
		makePlayerBot({ x: 0, z: 0 });

		// relay at distance 0 => strength 1.0 => contributes 10
		makeRelay({ id: "r1", x: 0, z: 0, signalRange: 10 });
		// relay at distance 5 => strength 0.5 => contributes 5
		makeRelay({ id: "r2", x: 5, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// Total = 10 + 5 = 15
		expect(getGlobalCompute()).toBeCloseTo(15);
	});

	it("returns 0 when no relays are connected", () => {
		makePlayerBot({ x: 0, z: 0 });
		// Relay too far away
		makeRelay({ x: 100, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(getGlobalCompute()).toBe(0);
	});

	it("returns 0 when no player bots exist", () => {
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(getGlobalCompute()).toBe(0);
	});

	it("does not count disconnected relays", () => {
		makePlayerBot({ x: 0, z: 0 });

		const connected = makeRelay({ id: "near", x: 3, z: 0, signalRange: 10 });
		const disconnected = makeRelay({ id: "far", x: 100, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(connected.signalRelay.signalStrength).toBeGreaterThan(0.1);
		expect(disconnected.signalRelay.signalStrength).toBe(0);

		// Only the connected relay contributes
		const expectedCompute = connected.signalRelay.signalStrength * 10;
		expect(getGlobalCompute()).toBeCloseTo(expectedCompute);
	});

	it("includes compute from relays reached via BFS chain", () => {
		makePlayerBot({ x: 0, z: 0 });

		const r1 = makeRelay({ id: "r1", x: 3, z: 0, signalRange: 10 });
		const r2 = makeRelay({ id: "r2", x: 8, z: 0, signalRange: 10 });

		signalNetworkSystem();

		const r1Compute = r1.signalRelay.signalStrength * 10;
		const r2Compute = r2.signalRelay.signalStrength * 10;
		expect(getGlobalCompute()).toBeCloseTo(r1Compute + r2Compute);
	});

	it("resets compute each tick", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();
		const firstCompute = getGlobalCompute();
		expect(firstCompute).toBeCloseTo(10);

		// Remove all relays
		mockSignalRelays.length = 0;
		signalNetworkSystem();

		expect(getGlobalCompute()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Multiple player bots as signal sources
// ---------------------------------------------------------------------------

describe("multiple player bots", () => {
	it("uses best strength from nearest player bot", () => {
		makePlayerBot({ x: 0, z: 0 }); // close
		makePlayerBot({ x: 100, z: 0 }); // far

		const relay = makeRelay({ x: 3, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// Strength from nearest bot: 1 - 3/10 = 0.7
		expect(relay.signalRelay.signalStrength).toBeCloseTo(0.7);
	});

	it("ignores inactive player bots", () => {
		makePlayerBot({ x: 0, z: 0, isActive: false }); // inactive, nearby
		makePlayerBot({ x: 8, z: 0, isActive: true }); // active, farther

		const relay = makeRelay({ x: 5, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// Only active bot at (8,0) matters; distance to relay at (5,0) = 3
		// strength = 1 - 3/10 = 0.7
		expect(relay.signalRelay.signalStrength).toBeCloseTo(0.7);
	});

	it("returns early with no compute when no active player bots exist", () => {
		makePlayerBot({ x: 0, z: 0, isActive: false });
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(getGlobalCompute()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Isolated relays
// ---------------------------------------------------------------------------

describe("edge cases — isolated relays", () => {
	it("relay far from player and all other relays remains disconnected", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ id: "near", x: 3, z: 0, signalRange: 10 });
		const isolated = makeRelay({ id: "isolated", x: 200, z: 200, signalRange: 5 });

		signalNetworkSystem();

		expect(isolated.signalRelay.signalStrength).toBe(0);
	});

	it("single relay with no player bots has zero strength", () => {
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(getGlobalCompute()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Overlapping signals
// ---------------------------------------------------------------------------

describe("edge cases — overlapping signals", () => {
	it("relay reachable from two paths gets first BFS visit strength", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Two paths to reach relay3:
		// Path 1: player -> r1(2,0) -> r3(6,0) via proximity
		// Path 2: player -> r2(0,2) -> r3(6,0) via wire
		// r1 is closer to r3, so BFS should visit via r1 first
		makeRelay({ id: "r1", x: 2, z: 0, signalRange: 10 });
		makeRelay({ id: "r2", x: 0, z: 2, signalRange: 10 });
		const r3 = makeRelay({ id: "r3", x: 6, z: 0, signalRange: 10 });
		makeSignalWire("r2", "r3");

		signalNetworkSystem();

		// r3 should have some signal strength (reached via BFS)
		expect(r3.signalRelay.signalStrength).toBeGreaterThan(0.1);
	});

	it("two relays at same position get same strength", () => {
		makePlayerBot({ x: 0, z: 0 });

		const r1 = makeRelay({ id: "r1", x: 5, z: 0, signalRange: 10 });
		const r2 = makeRelay({ id: "r2", x: 5, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(r1.signalRelay.signalStrength).toBeCloseTo(r2.signalRelay.signalStrength);
	});
});

// ---------------------------------------------------------------------------
// Max distance / edge-of-range behavior
// ---------------------------------------------------------------------------

describe("edge cases — max distance", () => {
	it("relay exactly at max range has zero strength (not connected)", () => {
		makePlayerBot({ x: 0, z: 0 });
		const relay = makeRelay({ x: 10, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// strength = 1 - 10/10 = 0, not > 0.1
		expect(relay.signalRelay.signalStrength).toBe(0);
	});

	it("long chain loses signal strength progressively", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Chain of relays each 4 units apart, range 10
		const r1 = makeRelay({ id: "r1", x: 4, z: 0, signalRange: 10 });
		const r2 = makeRelay({ id: "r2", x: 8, z: 0, signalRange: 10 });
		const r3 = makeRelay({ id: "r3", x: 12, z: 0, signalRange: 10 });
		const r4 = makeRelay({ id: "r4", x: 16, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// Each relay should have progressively weaker signal
		expect(r1.signalRelay.signalStrength).toBeGreaterThan(
			r2.signalRelay.signalStrength,
		);
		expect(r2.signalRelay.signalStrength).toBeGreaterThan(
			r3.signalRelay.signalStrength,
		);
		expect(r3.signalRelay.signalStrength).toBeGreaterThanOrEqual(
			r4.signalRelay.signalStrength,
		);
	});

	it("chain eventually drops below 0.1 threshold", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Range 5, spacing 4 — degrades quickly
		const r1 = makeRelay({ id: "r1", x: 4, z: 0, signalRange: 5 });
		const r2 = makeRelay({ id: "r2", x: 8, z: 0, signalRange: 5 });
		const r3 = makeRelay({ id: "r3", x: 12, z: 0, signalRange: 5 });

		signalNetworkSystem();

		// r1: 1 - 4/5 = 0.2 (connected)
		expect(r1.signalRelay.signalStrength).toBeCloseTo(0.2);
		// r2: 0.2 * (1 - 4/5) = 0.2 * 0.2 = 0.04 (below 0.1, NOT connected)
		expect(r2.signalRelay.signalStrength).toBe(0);
		// r3: unreachable
		expect(r3.signalRelay.signalStrength).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isInSignalRange
// ---------------------------------------------------------------------------

describe("isInSignalRange", () => {
	it("returns true for position within range of a connected relay", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(isInSignalRange(5, 5)).toBe(true);
	});

	it("returns false for position outside range of all connected relays", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ x: 0, z: 0, signalRange: 10 });

		signalNetworkSystem();

		expect(isInSignalRange(100, 100)).toBe(false);
	});

	it("returns false when no relays are connected", () => {
		makePlayerBot({ x: 0, z: 0 });

		signalNetworkSystem();

		expect(isInSignalRange(0, 0)).toBe(false);
	});

	it("returns true when within range of any connected relay (not just the nearest)", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ id: "r1", x: 0, z: 0, signalRange: 5 }); // covers (0..5, 0..5)
		makeRelay({ id: "r2", x: 20, z: 0, signalRange: 5 }); // won't be connected

		signalNetworkSystem();

		// Within r1's range
		expect(isInSignalRange(3, 0)).toBe(true);
		// Outside r1's range, r2 is not connected
		expect(isInSignalRange(20, 0)).toBe(false);
	});

	it("considers relays reached via BFS chain", () => {
		makePlayerBot({ x: 0, z: 0 });
		makeRelay({ id: "r1", x: 5, z: 0, signalRange: 10 });
		// r2 is reached via BFS from r1 (within proximity range)
		makeRelay({ id: "r2", x: 10, z: 0, signalRange: 10 });

		signalNetworkSystem();

		// Position (15, 0) is within r2's range (dist=5 <= 10)
		expect(isInSignalRange(15, 0)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Wire graph building
// ---------------------------------------------------------------------------

describe("signal wire graph", () => {
	it("connects relays that share a signal wire even if out of proximity range", () => {
		makePlayerBot({ x: 0, z: 0 });

		// r1 near player: dist=1, range=3 => strength = 1-1/3 = 0.667
		// r2 far from player: dist=9, range=10.
		//   Direct seed: 1-9/10 = 0.1, NOT > 0.1 threshold => not seeded.
		//   Proximity: min(3,10) = 3, dist(r1,r2) = 8 > 3 => not neighbors.
		//   Wire BFS: 0.667 * (1 - 8/10) = 0.667 * 0.2 = 0.133 > 0.1 => connected!
		const r1 = makeRelay({ id: "r1", x: 1, z: 0, signalRange: 3 });
		const r2 = makeRelay({ id: "r2", x: 9, z: 0, signalRange: 10 });
		makeSignalWire("r1", "r2");

		signalNetworkSystem();

		// r1: directly seeded with strength 0.667
		expect(r1.signalRelay.signalStrength).toBeCloseTo(0.667, 2);
		// r2: reached via wire BFS from r1
		expect(r2.signalRelay.signalStrength).toBeCloseTo(0.133, 2);
	});

	it("bidirectional wire allows propagation in both directions", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Wire from r2 to r1 (reverse direction) — graph is bidirectional
		// so r1 can still propagate to r2 even though wire is "r2 -> r1".
		// Same geometry as above: r1 near player, r2 only reachable via wire.
		const r1 = makeRelay({ id: "r1", x: 1, z: 0, signalRange: 3 });
		const r2 = makeRelay({ id: "r2", x: 9, z: 0, signalRange: 10 });
		makeSignalWire("r2", "r1"); // reversed

		signalNetworkSystem();

		// r1 still gets connected directly from player
		expect(r1.signalRelay.signalStrength).toBeGreaterThan(0.1);
		// r2 should still be reachable via the wire (graph is bidirectional)
		expect(r2.signalRelay.signalStrength).toBeGreaterThan(0.1);
	});
});

// ---------------------------------------------------------------------------
// No player bots — early return
// ---------------------------------------------------------------------------

describe("no player bots", () => {
	it("resets all relay strengths to 0 when no player bots", () => {
		const relay = makeRelay({ x: 0, z: 0, signalRange: 10 });
		relay.signalRelay.signalStrength = 0.8; // leftover from previous tick

		signalNetworkSystem();

		expect(relay.signalRelay.signalStrength).toBe(0);
		expect(getGlobalCompute()).toBe(0);
	});

	it("handles empty world gracefully", () => {
		signalNetworkSystem();
		expect(getGlobalCompute()).toBe(0);
	});
});
