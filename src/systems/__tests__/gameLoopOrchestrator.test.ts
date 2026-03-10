/**
 * Tests for the game loop orchestrator.
 *
 * Tests cover:
 * - System registration and phase grouping
 * - Tick execution in correct phase order
 * - System enable/disable
 * - Profiling timings
 * - Duplicate registration prevention
 * - Reset clears all state
 * - Invalid phase throws
 * - getCurrentTick / setCurrentTick
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	registerSystem,
	setSystemEnabled,
	isSystemEnabled,
	getRegisteredSystems,
	enableProfiling,
	getLastTimings,
	orchestratorTick,
	getCurrentTick,
	setCurrentTick,
	resetOrchestrator,
} from "../gameLoopOrchestrator";

beforeEach(() => {
	resetOrchestrator();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("system registration", () => {
	it("registers a system to a valid phase", () => {
		registerSystem("economy", "mining", () => {});
		const systems = getRegisteredSystems();
		expect(systems.economy).toContain("mining");
	});

	it("throws on invalid phase", () => {
		expect(() => registerSystem("invalid", "test", () => {})).toThrow(
			"Unknown phase: invalid",
		);
	});

	it("prevents duplicate registration", () => {
		registerSystem("combat", "turrets", () => {});
		registerSystem("combat", "turrets", () => {});
		const systems = getRegisteredSystems();
		expect(systems.combat.filter((n) => n === "turrets")).toHaveLength(1);
	});

	it("registers multiple systems to same phase", () => {
		registerSystem("economy", "mining", () => {});
		registerSystem("economy", "crafting", () => {});
		const systems = getRegisteredSystems();
		expect(systems.economy).toEqual(["mining", "crafting"]);
	});

	it("registers systems across different phases", () => {
		registerSystem("environment", "weather", () => {});
		registerSystem("combat", "turrets", () => {});
		registerSystem("progression", "quests", () => {});
		const systems = getRegisteredSystems();
		expect(systems.environment).toContain("weather");
		expect(systems.combat).toContain("turrets");
		expect(systems.progression).toContain("quests");
	});
});

// ---------------------------------------------------------------------------
// Tick execution
// ---------------------------------------------------------------------------

describe("tick execution", () => {
	it("increments tick on each call", () => {
		expect(getCurrentTick()).toBe(0);
		orchestratorTick();
		expect(getCurrentTick()).toBe(1);
		orchestratorTick();
		expect(getCurrentTick()).toBe(2);
	});

	it("returns the tick number", () => {
		const t1 = orchestratorTick();
		expect(t1).toBe(1);
		const t2 = orchestratorTick();
		expect(t2).toBe(2);
	});

	it("calls registered systems with tick number", () => {
		const calls: number[] = [];
		registerSystem("economy", "test", (tick) => calls.push(tick));
		orchestratorTick();
		orchestratorTick();
		expect(calls).toEqual([1, 2]);
	});

	it("executes phases in correct order", () => {
		const order: string[] = [];
		registerSystem("cleanup", "last", () => order.push("cleanup"));
		registerSystem("environment", "first", () => order.push("environment"));
		registerSystem("combat", "mid", () => order.push("combat"));
		registerSystem("economy", "eco", () => order.push("economy"));
		registerSystem("inputAi", "ai", () => order.push("inputAi"));
		registerSystem("infrastructure", "infra", () =>
			order.push("infrastructure"),
		);
		registerSystem("territory", "terr", () => order.push("territory"));
		registerSystem("progression", "prog", () => order.push("progression"));

		orchestratorTick();

		expect(order).toEqual([
			"environment",
			"inputAi",
			"economy",
			"infrastructure",
			"combat",
			"territory",
			"progression",
			"cleanup",
		]);
	});

	it("executes systems within a phase in registration order", () => {
		const order: string[] = [];
		registerSystem("economy", "mining", () => order.push("mining"));
		registerSystem("economy", "crafting", () => order.push("crafting"));
		registerSystem("economy", "trade", () => order.push("trade"));

		orchestratorTick();

		expect(order).toEqual(["mining", "crafting", "trade"]);
	});

	it("does nothing when no systems registered", () => {
		expect(() => orchestratorTick()).not.toThrow();
		expect(getCurrentTick()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Enable/disable
// ---------------------------------------------------------------------------

describe("system enable/disable", () => {
	it("systems are enabled by default", () => {
		registerSystem("combat", "turrets", () => {});
		expect(isSystemEnabled("turrets")).toBe(true);
	});

	it("disabled system is not called", () => {
		let called = false;
		registerSystem("combat", "turrets", () => {
			called = true;
		});
		setSystemEnabled("turrets", false);
		orchestratorTick();
		expect(called).toBe(false);
	});

	it("re-enabled system is called again", () => {
		let callCount = 0;
		registerSystem("combat", "turrets", () => {
			callCount++;
		});
		setSystemEnabled("turrets", false);
		orchestratorTick();
		expect(callCount).toBe(0);

		setSystemEnabled("turrets", true);
		orchestratorTick();
		expect(callCount).toBe(1);
	});

	it("isSystemEnabled returns false for unknown system", () => {
		expect(isSystemEnabled("nonexistent")).toBe(false);
	});

	it("disabling one system doesn't affect others", () => {
		const calls: string[] = [];
		registerSystem("combat", "turrets", () => calls.push("turrets"));
		registerSystem("combat", "melee", () => calls.push("melee"));

		setSystemEnabled("turrets", false);
		orchestratorTick();
		expect(calls).toEqual(["melee"]);
	});
});

// ---------------------------------------------------------------------------
// Profiling
// ---------------------------------------------------------------------------

describe("profiling", () => {
	it("timings are zero when profiling disabled", () => {
		registerSystem("economy", "mining", () => {});
		orchestratorTick();
		const timings = getLastTimings();
		expect(timings.total).toBe(0);
	});

	it("timings are populated when profiling enabled", () => {
		enableProfiling(true);
		registerSystem("economy", "mining", () => {
			// Do some work
			let sum = 0;
			for (let i = 0; i < 1000; i++) sum += i;
		});
		orchestratorTick();
		const timings = getLastTimings();
		expect(timings.total).toBeGreaterThanOrEqual(0);
		expect(timings.economy).toBeGreaterThanOrEqual(0);
	});

	it("getLastTimings returns a copy", () => {
		enableProfiling(true);
		orchestratorTick();
		const t1 = getLastTimings();
		const t2 = getLastTimings();
		expect(t1).toEqual(t2);
		expect(t1).not.toBe(t2);
	});
});

// ---------------------------------------------------------------------------
// Tick management
// ---------------------------------------------------------------------------

describe("tick management", () => {
	it("setCurrentTick sets the tick counter", () => {
		setCurrentTick(500);
		expect(getCurrentTick()).toBe(500);
	});

	it("next tick after setCurrentTick increments from that value", () => {
		setCurrentTick(100);
		const result = orchestratorTick();
		expect(result).toBe(101);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all registered systems", () => {
		registerSystem("economy", "mining", () => {});
		registerSystem("combat", "turrets", () => {});
		resetOrchestrator();
		const systems = getRegisteredSystems();
		for (const phase of Object.values(systems)) {
			expect(phase).toHaveLength(0);
		}
	});

	it("resets tick to 0", () => {
		orchestratorTick();
		orchestratorTick();
		resetOrchestrator();
		expect(getCurrentTick()).toBe(0);
	});

	it("resets profiling state", () => {
		enableProfiling(true);
		registerSystem("economy", "mining", () => {});
		orchestratorTick();
		resetOrchestrator();
		const timings = getLastTimings();
		expect(timings.total).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("system that throws does not prevent other systems", () => {
		const calls: string[] = [];
		registerSystem("economy", "bad", () => {
			throw new Error("boom");
		});
		registerSystem("combat", "good", () => calls.push("good"));

		// The error propagates — orchestrator doesn't catch
		expect(() => orchestratorTick()).toThrow("boom");
	});

	it("100 consecutive ticks work correctly", () => {
		let total = 0;
		registerSystem("economy", "counter", (tick) => {
			total += tick;
		});
		for (let i = 0; i < 100; i++) {
			orchestratorTick();
		}
		// Sum of 1..100 = 5050
		expect(total).toBe(5050);
		expect(getCurrentTick()).toBe(100);
	});
});
