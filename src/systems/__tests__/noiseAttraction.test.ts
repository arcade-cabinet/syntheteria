/**
 * Unit tests for the noise attraction system.
 *
 * Tests cover:
 * - Noise emission from all action types and tool tiers
 * - Noise presets match specified levels/radii/durations
 * - Noise event lifecycle (creation, expiration, pruning)
 * - Inverse-square distance falloff
 * - Multiple noise sources combine (capped at 1.0)
 * - Listener registration, unregistration, and position updates
 * - getListenersInRange respects both noise radius and hearing range
 * - getAttractedEnemies filters by threshold and radius
 * - Global noise multiplier affects emission
 * - Reset clears all state
 * - Skill ceiling mechanics: storms mask noise, higher tiers are louder
 */

import {
	NOISE_PRESETS,
	type Vec3,
	emitNoise,
	emitNoiseFromPreset,
	getActiveNoiseEvents,
	getAttractedEnemies,
	getListenersInRange,
	getNoiseAtPosition,
	getNoiseMultiplier,
	registerListener,
	reset,
	setCurrentTime,
	setNoiseMultiplier,
	unregisterListener,
	updateListenerPosition,
	updateNoiseEvents,
} from "../noiseAttraction";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Noise presets — verify specified values
// ---------------------------------------------------------------------------

describe("noise presets", () => {
	it("harvesting_basic: 0.3 level, 15m radius", () => {
		const p = NOISE_PRESETS.harvesting_basic;
		expect(p.noiseLevel).toBe(0.3);
		expect(p.noiseRadius).toBe(15);
	});

	it("harvesting_improved: 0.5 level, 25m radius", () => {
		const p = NOISE_PRESETS.harvesting_improved;
		expect(p.noiseLevel).toBe(0.5);
		expect(p.noiseRadius).toBe(25);
	});

	it("harvesting_advanced: 0.7 level, 40m radius", () => {
		const p = NOISE_PRESETS.harvesting_advanced;
		expect(p.noiseLevel).toBe(0.7);
		expect(p.noiseRadius).toBe(40);
	});

	it("compression: 0.8 level, 30m radius", () => {
		const p = NOISE_PRESETS.compression;
		expect(p.noiseLevel).toBe(0.8);
		expect(p.noiseRadius).toBe(30);
	});

	it("combat_melee: 0.4 level, 20m radius", () => {
		const p = NOISE_PRESETS.combat_melee;
		expect(p.noiseLevel).toBe(0.4);
		expect(p.noiseRadius).toBe(20);
	});

	it("combat_ranged: 0.6 level, 50m radius", () => {
		const p = NOISE_PRESETS.combat_ranged;
		expect(p.noiseLevel).toBe(0.6);
		expect(p.noiseRadius).toBe(50);
	});

	it("building: 0.2 level, 10m radius", () => {
		const p = NOISE_PRESETS.building;
		expect(p.noiseLevel).toBe(0.2);
		expect(p.noiseRadius).toBe(10);
	});

	it("movement_normal: 0.05 level, 5m radius", () => {
		const p = NOISE_PRESETS.movement_normal;
		expect(p.noiseLevel).toBe(0.05);
		expect(p.noiseRadius).toBe(5);
	});

	it("movement_sprint: 0.15 level, 10m radius", () => {
		const p = NOISE_PRESETS.movement_sprint;
		expect(p.noiseLevel).toBe(0.15);
		expect(p.noiseRadius).toBe(10);
	});

	it("furnace_running: 0.3 level, 20m radius", () => {
		const p = NOISE_PRESETS.furnace_running;
		expect(p.noiseLevel).toBe(0.3);
		expect(p.noiseRadius).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// emitNoise — tier resolution
// ---------------------------------------------------------------------------

describe("emitNoise", () => {
	it("returns a unique noise ID", () => {
		const id1 = emitNoise("player", pos(), "harvesting", 0, 0);
		const id2 = emitNoise("player", pos(), "harvesting", 0, 0);
		expect(id1).not.toBe(id2);
	});

	it("creates a noise event for basic harvesting (tier 0)", () => {
		emitNoise("player", pos(5, 0, 5), "harvesting", 0, 10.0);
		const events = getActiveNoiseEvents();
		expect(events).toHaveLength(1);
		expect(events[0].noiseLevel).toBe(0.3);
		expect(events[0].noiseRadius).toBe(15);
		expect(events[0].type).toBe("harvesting");
		expect(events[0].sourceId).toBe("player");
		expect(events[0].startTime).toBe(10.0);
	});

	it("tier 2 harvesting uses improved preset", () => {
		emitNoise("player", pos(), "harvesting", 2, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.5);
		expect(events[0].noiseRadius).toBe(25);
	});

	it("tier 3 harvesting uses advanced preset", () => {
		emitNoise("player", pos(), "harvesting", 3, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.7);
		expect(events[0].noiseRadius).toBe(40);
	});

	it("unknown high tier defaults to advanced", () => {
		emitNoise("player", pos(), "harvesting", 99, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.7);
	});

	it("combat tier 0 resolves to melee", () => {
		emitNoise("player", pos(), "combat", 0, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.4);
		expect(events[0].noiseRadius).toBe(20);
	});

	it("combat tier 1 resolves to ranged", () => {
		emitNoise("player", pos(), "combat", 1, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.6);
		expect(events[0].noiseRadius).toBe(50);
	});

	it("movement tier 0 resolves to normal", () => {
		emitNoise("player", pos(), "movement", 0, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.05);
	});

	it("movement tier 1 resolves to sprint", () => {
		emitNoise("player", pos(), "movement", 1, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.15);
	});

	it("compression always uses the compression preset", () => {
		emitNoise("player", pos(), "compression", 0, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0.8);
		expect(events[0].noiseRadius).toBe(30);
	});

	it("copies position (does not hold reference)", () => {
		const p = pos(1, 2, 3);
		emitNoise("player", p, "building", 0, 0);
		p.x = 999;
		const events = getActiveNoiseEvents();
		expect(events[0].position.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// emitNoiseFromPreset
// ---------------------------------------------------------------------------

describe("emitNoiseFromPreset", () => {
	it("emits furnace_running noise directly from preset", () => {
		emitNoiseFromPreset("furnace_1", pos(10, 0, 10), "furnace_running", 5.0);
		const events = getActiveNoiseEvents();
		expect(events).toHaveLength(1);
		expect(events[0].noiseLevel).toBe(0.3);
		expect(events[0].noiseRadius).toBe(20);
		expect(events[0].type).toBe("building");
		expect(events[0].sourceId).toBe("furnace_1");
	});
});

// ---------------------------------------------------------------------------
// updateNoiseEvents — expiration
// ---------------------------------------------------------------------------

describe("updateNoiseEvents", () => {
	it("prunes events past their duration", () => {
		emitNoise("player", pos(), "compression", 0, 0); // duration 0.5s
		expect(getActiveNoiseEvents()).toHaveLength(1);

		const pruned = updateNoiseEvents(0.5);
		expect(pruned).toBe(1);
		expect(getActiveNoiseEvents()).toHaveLength(0);
	});

	it("keeps events that have not expired", () => {
		emitNoise("player", pos(), "harvesting", 0, 0); // duration 1.0s
		updateNoiseEvents(0.5);
		expect(getActiveNoiseEvents()).toHaveLength(1);
	});

	it("handles mixed expired and active events", () => {
		emitNoise("player", pos(), "compression", 0, 0); // 0.5s
		emitNoise("player", pos(), "harvesting", 0, 0); // 1.0s

		const pruned = updateNoiseEvents(0.6);
		expect(pruned).toBe(1);
		expect(getActiveNoiseEvents()).toHaveLength(1);
	});

	it("returns 0 when nothing to prune", () => {
		emitNoise("player", pos(), "harvesting", 0, 0);
		const pruned = updateNoiseEvents(0.1);
		expect(pruned).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getNoiseAtPosition — distance falloff
// ---------------------------------------------------------------------------

describe("getNoiseAtPosition", () => {
	it("returns full noise level at the source", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 0, 0);
		const level = getNoiseAtPosition(pos(0, 0, 0), 0);
		expect(level).toBeCloseTo(0.3);
	});

	it("returns 0 outside the noise radius", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 0, 0); // 15m radius
		const level = getNoiseAtPosition(pos(20, 0, 0), 0);
		expect(level).toBe(0);
	});

	it("returns 0 exactly at the radius boundary", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 0, 0); // 15m radius
		const level = getNoiseAtPosition(pos(15, 0, 0), 0);
		expect(level).toBe(0);
	});

	it("falls off with inverse-square within radius", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 0, 0); // 0.3 level, 15m radius

		// At half radius (7.5m): contribution = 0.3 * (1 - (7.5/15)^2) = 0.3 * 0.75 = 0.225
		const level = getNoiseAtPosition(pos(7.5, 0, 0), 0);
		expect(level).toBeCloseTo(0.225);
	});

	it("combines multiple noise sources (additive)", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 0, 0); // 0.3
		emitNoise("bot_1", pos(0, 0, 0), "building", 0, 0); // 0.2
		const level = getNoiseAtPosition(pos(0, 0, 0), 0);
		expect(level).toBeCloseTo(0.5);
	});

	it("caps combined noise at 1.0", () => {
		// Emit several loud noises at the same spot
		emitNoise("p1", pos(0, 0, 0), "compression", 0, 0); // 0.8
		emitNoise("p2", pos(0, 0, 0), "harvesting", 3, 0); // 0.7
		const level = getNoiseAtPosition(pos(0, 0, 0), 0);
		expect(level).toBe(1.0);
	});

	it("ignores expired events", () => {
		emitNoise("player", pos(0, 0, 0), "compression", 0, 0); // duration 0.5s
		// Query at t=1.0 — event expired
		const level = getNoiseAtPosition(pos(0, 0, 0), 1.0);
		expect(level).toBe(0);
	});

	it("returns 0 when no events exist", () => {
		const level = getNoiseAtPosition(pos(5, 5, 5), 0);
		expect(level).toBe(0);
	});

	it("uses 3D distance for falloff", () => {
		emitNoise("player", pos(0, 0, 0), "combat", 1, 0); // 0.6 level, 50m radius

		// 3D distance: sqrt(3^2 + 4^2 + 0^2) = 5
		// Ratio = 5/50 = 0.1
		// Contribution = 0.6 * (1 - 0.01) = 0.594
		const level = getNoiseAtPosition(pos(3, 4, 0), 0);
		expect(level).toBeCloseTo(0.594);
	});
});

// ---------------------------------------------------------------------------
// Listener registration
// ---------------------------------------------------------------------------

describe("listener registration", () => {
	it("registerListener adds a listener", () => {
		registerListener("enemy_1", pos(10, 0, 10), 30, "feral");
		const inRange = getListenersInRange(pos(10, 0, 10), 50);
		expect(inRange).toHaveLength(1);
		expect(inRange[0].entityId).toBe("enemy_1");
	});

	it("unregisterListener removes a listener", () => {
		registerListener("enemy_1", pos(10, 0, 10), 30, "feral");
		unregisterListener("enemy_1");
		const inRange = getListenersInRange(pos(10, 0, 10), 50);
		expect(inRange).toHaveLength(0);
	});

	it("unregisterListener is safe for nonexistent ID", () => {
		expect(() => unregisterListener("nobody")).not.toThrow();
	});

	it("updateListenerPosition moves a listener", () => {
		registerListener("enemy_1", pos(0, 0, 0), 10, "feral");
		updateListenerPosition("enemy_1", pos(100, 0, 100));

		// Original position should no longer find the listener in a small radius
		const near = getListenersInRange(pos(0, 0, 0), 5);
		expect(near).toHaveLength(0);

		// New position should find it
		const far = getListenersInRange(pos(100, 0, 100), 15);
		expect(far).toHaveLength(1);
	});

	it("copies position on register (does not hold reference)", () => {
		const p = pos(5, 0, 5);
		registerListener("enemy_1", p, 20, "feral");
		p.x = 999;
		const inRange = getListenersInRange(pos(5, 0, 5), 1);
		expect(inRange).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// getListenersInRange
// ---------------------------------------------------------------------------

describe("getListenersInRange", () => {
	it("returns listeners within noise radius and hearing range", () => {
		registerListener("e1", pos(5, 0, 0), 20, "feral");
		registerListener("e2", pos(100, 0, 0), 20, "feral");
		const results = getListenersInRange(pos(0, 0, 0), 15);
		expect(results).toHaveLength(1);
		expect(results[0].entityId).toBe("e1");
	});

	it("uses the smaller of noise radius and hearing range", () => {
		// Listener has short hearing range (5m), noise radius is 50m
		registerListener("deaf_bot", pos(10, 0, 0), 5, "feral");
		const results = getListenersInRange(pos(0, 0, 0), 50);
		// Distance is 10m, but hearing range is only 5m -> out of range
		expect(results).toHaveLength(0);
	});

	it("returns empty array when no listeners registered", () => {
		const results = getListenersInRange(pos(0, 0, 0), 100);
		expect(results).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getAttractedEnemies
// ---------------------------------------------------------------------------

describe("getAttractedEnemies", () => {
	it("returns enemies where noise at their position exceeds threshold", () => {
		// Emit a loud noise at origin
		emitNoise("player", pos(0, 0, 0), "compression", 0, 0); // 0.8 level, 30m radius
		setCurrentTime(0);

		// Place enemy nearby — will hear the noise
		registerListener("enemy_1", pos(5, 0, 0), 50, "feral");
		// Place enemy far away — won't hear it
		registerListener("enemy_2", pos(100, 0, 0), 50, "feral");

		const attracted = getAttractedEnemies(pos(0, 0, 0), 200, 0.1);
		expect(attracted).toHaveLength(1);
		expect(attracted[0].entityId).toBe("enemy_1");
	});

	it("returns enemies sorted by distance (closest first)", () => {
		emitNoise("player", pos(0, 0, 0), "harvesting", 3, 0); // 0.7 level, 40m radius
		setCurrentTime(0);

		registerListener("far", pos(10, 0, 0), 50, "feral");
		registerListener("close", pos(3, 0, 0), 50, "feral");
		registerListener("mid", pos(7, 0, 0), 50, "feral");

		const attracted = getAttractedEnemies(pos(0, 0, 0), 200, 0.01);
		expect(attracted[0].entityId).toBe("close");
		expect(attracted[1].entityId).toBe("mid");
		expect(attracted[2].entityId).toBe("far");
	});

	it("excludes enemies outside the search radius", () => {
		emitNoise("player", pos(0, 0, 0), "compression", 0, 0);
		setCurrentTime(0);

		registerListener("enemy_1", pos(5, 0, 0), 50, "feral");

		// Search radius only 3m — enemy at 5m is outside
		const attracted = getAttractedEnemies(pos(0, 0, 0), 3, 0.01);
		expect(attracted).toHaveLength(0);
	});

	it("excludes enemies where noise is below threshold", () => {
		emitNoise("player", pos(0, 0, 0), "movement", 0, 0); // 0.05 level, 5m radius
		setCurrentTime(0);

		registerListener("enemy_1", pos(3, 0, 0), 50, "feral");

		// Noise at 3m: 0.05 * (1 - (3/5)^2) = 0.05 * 0.64 = 0.032
		// Threshold 0.5 — not attracted
		const attracted = getAttractedEnemies(pos(0, 0, 0), 50, 0.5);
		expect(attracted).toHaveLength(0);
	});

	it("returns distanceToNoise for each attracted enemy", () => {
		emitNoise("player", pos(0, 0, 0), "compression", 0, 0);
		setCurrentTime(0);

		registerListener("enemy_1", pos(3, 4, 0), 50, "feral");

		const attracted = getAttractedEnemies(pos(0, 0, 0), 50, 0.01);
		expect(attracted[0].distanceToNoise).toBeCloseTo(5); // 3-4-5 triangle
	});
});

// ---------------------------------------------------------------------------
// Global noise multiplier
// ---------------------------------------------------------------------------

describe("noise multiplier", () => {
	it("defaults to 1.0", () => {
		expect(getNoiseMultiplier()).toBe(1.0);
	});

	it("setNoiseMultiplier changes the multiplier", () => {
		setNoiseMultiplier(0.5);
		expect(getNoiseMultiplier()).toBe(0.5);
	});

	it("multiplier reduces noise level on emission", () => {
		setNoiseMultiplier(0.5);
		emitNoise("player", pos(), "harvesting", 0, 0);
		const events = getActiveNoiseEvents();
		// 0.3 * 0.5 = 0.15
		expect(events[0].noiseLevel).toBeCloseTo(0.15);
	});

	it("multiplier reduces noise radius on emission", () => {
		setNoiseMultiplier(0.5);
		emitNoise("player", pos(), "harvesting", 0, 0);
		const events = getActiveNoiseEvents();
		// 15 * 0.5 = 7.5
		expect(events[0].noiseRadius).toBeCloseTo(7.5);
	});

	it("multiplier of 0 silences all noise", () => {
		setNoiseMultiplier(0);
		emitNoise("player", pos(), "compression", 0, 0);
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(0);
		expect(events[0].noiseRadius).toBe(0);
	});

	it("negative multiplier is clamped to 0", () => {
		setNoiseMultiplier(-1);
		expect(getNoiseMultiplier()).toBe(0);
	});

	it("noise level is capped at 1.0 even with high multiplier", () => {
		setNoiseMultiplier(5.0);
		emitNoise("player", pos(), "compression", 0, 0); // 0.8 * 5 = 4.0 -> cap 1.0
		const events = getActiveNoiseEvents();
		expect(events[0].noiseLevel).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Skill ceiling: better drills louder, storms mask noise
// ---------------------------------------------------------------------------

describe("skill ceiling mechanics", () => {
	it("advanced drill is louder than basic drill", () => {
		emitNoise("p1", pos(), "harvesting", 0, 0); // basic
		emitNoise("p2", pos(100, 0, 0), "harvesting", 3, 0); // advanced

		const events = getActiveNoiseEvents();
		const basic = events.find((e) => e.sourceId === "p1")!;
		const advanced = events.find((e) => e.sourceId === "p2")!;

		expect(advanced.noiseLevel).toBeGreaterThan(basic.noiseLevel);
		expect(advanced.noiseRadius).toBeGreaterThan(basic.noiseRadius);
	});

	it("storm weather (multiplier 0.3) dramatically reduces noise propagation", () => {
		// Normal: compression = 0.8 level, 30m radius
		emitNoise("normal", pos(), "compression", 0, 0);

		reset();

		// Storm: multiplier reduces everything
		setNoiseMultiplier(0.3);
		emitNoise("storm", pos(), "compression", 0, 0);

		const events = getActiveNoiseEvents();
		// 0.8 * 0.3 = 0.24 level, 30 * 0.3 = 9m radius
		expect(events[0].noiseLevel).toBeCloseTo(0.24);
		expect(events[0].noiseRadius).toBeCloseTo(9);
	});

	it("harvesting during a storm makes an advanced drill as quiet as a basic drill in clear weather", () => {
		// Advanced drill in storm (mult 0.3): 0.7 * 0.3 = 0.21 level
		setNoiseMultiplier(0.3);
		emitNoise("storm_player", pos(), "harvesting", 3, 0);

		const stormEvents = getActiveNoiseEvents();
		const stormLevel = stormEvents[0].noiseLevel;

		// Basic drill in clear weather: 0.3 level
		// Storm advanced (0.21) < clear basic (0.3)
		expect(stormLevel).toBeLessThan(0.3);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all noise events", () => {
		emitNoise("player", pos(), "harvesting", 0, 0);
		emitNoise("player", pos(), "compression", 0, 0);
		reset();
		expect(getActiveNoiseEvents()).toHaveLength(0);
	});

	it("clears all listeners", () => {
		registerListener("e1", pos(), 20, "feral");
		registerListener("e2", pos(), 30, "feral");
		reset();
		expect(getListenersInRange(pos(), 1000)).toHaveLength(0);
	});

	it("resets noise multiplier to 1.0", () => {
		setNoiseMultiplier(0.5);
		reset();
		expect(getNoiseMultiplier()).toBe(1.0);
	});

	it("resets noise ID counter (IDs start fresh)", () => {
		emitNoise("player", pos(), "harvesting", 0, 0);
		reset();
		const id = emitNoise("player", pos(), "harvesting", 0, 0);
		expect(id).toBe("noise_0");
	});
});
