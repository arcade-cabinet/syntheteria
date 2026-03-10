/**
 * Unit tests for the storm escalation system.
 *
 * Tests cover:
 * - Phase transitions at correct tick counts
 * - Escalation level increases over time
 * - Lightning strikes during active/surge phases only
 * - No damage during calm/aftermath
 * - Storm phase cycling
 * - Reset clears state
 * - Escalation level caps at max
 * - Lightning rod absorption
 */

import {
	getStormEvents,
	getStormState,
	resetStormEscalation,
	setApplyDamage,
	setGetBuildings,
	setRandomFn,
	stormEscalationSystem,
} from "../stormEscalation";
import type { BuildingInfo } from "../stormEscalation";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetStormEscalation();
});

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

describe("storm — phase transitions", () => {
	it("starts in calm phase at index 0", () => {
		const state = getStormState();
		expect(state.phaseName).toBe("calm");
		expect(state.phaseIndex).toBe(0);
		expect(state.phaseTimer).toBe(0);
	});

	it("transitions from calm to brewing after 600 ticks", () => {
		// Calm phase has durationTicks: 600
		for (let i = 0; i < 600; i++) {
			stormEscalationSystem(i);
		}
		// At tick 600, phaseTimer reaches 600 and transition occurs
		const state = getStormState();
		expect(state.phaseName).toBe("brewing");
		expect(state.phaseIndex).toBe(1);
	});

	it("transitions through multiple phases in order", () => {
		// calm: 600, brewing: 300, active: 400
		// After 600 + 300 = 900 ticks, should be in active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
		}
		const state = getStormState();
		expect(state.phaseName).toBe("active");
		expect(state.phaseIndex).toBe(2);
	});

	it("timer resets on phase transition", () => {
		// Advance past calm phase (600 ticks)
		for (let i = 0; i < 601; i++) {
			stormEscalationSystem(i);
		}
		const state = getStormState();
		expect(state.phaseName).toBe("brewing");
		// Timer should be small (1 tick into brewing)
		expect(state.phaseTimer).toBeLessThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// Storm phase cycling
// ---------------------------------------------------------------------------

describe("storm — phase cycling", () => {
	it("cycles back to calm after aftermath", () => {
		// Total cycle: calm(600) + brewing(300) + active(400) + surge(100) + aftermath(200) = 1600
		let tick = 0;
		for (let i = 0; i < 1600; i++) {
			stormEscalationSystem(tick++);
		}
		const state = getStormState();
		expect(state.phaseName).toBe("calm");
		expect(state.phaseIndex).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Escalation level
// ---------------------------------------------------------------------------

describe("storm — escalation level", () => {
	it("starts at 0 escalation", () => {
		stormEscalationSystem(0);
		const state = getStormState();
		expect(state.escalationLevel).toBe(0);
	});

	it("increases over time based on escalation rate", () => {
		// escalationRate = 0.001, so at tick 1000, escalation = 1.0
		stormEscalationSystem(1000);
		const state = getStormState();
		expect(state.escalationLevel).toBeCloseTo(1.0, 5);
	});

	it("caps at maxEscalationLevel (3)", () => {
		// At tick 5000, escalation would be 5.0 but capped at 3
		stormEscalationSystem(5000);
		const state = getStormState();
		expect(state.escalationLevel).toBe(3);
	});

	it("escalation stays at max when far past cap", () => {
		stormEscalationSystem(10000);
		const state = getStormState();
		expect(state.escalationLevel).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Lightning strikes — damaging phases
// ---------------------------------------------------------------------------

describe("storm — lightning strikes", () => {
	it("generates no strikes during calm phase", () => {
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "fabrication_unit" },
		];
		setGetBuildings(() => buildings);
		setRandomFn(() => 0); // Always triggers

		// Calm phase — damageChance = 0
		stormEscalationSystem(0);
		const events = getStormEvents();
		expect(events).toHaveLength(0);
	});

	it("generates strikes during active phase when random passes", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 5, z: 5, type: "fabrication_unit" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0); // Always triggers chance and picks index 0

		// Advance into active phase: calm(600) + brewing(300) = 900 ticks
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents(); // drain events
		}

		// Now in active phase — this tick should produce a strike
		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);
		expect(damageFn).toHaveBeenCalled();
	});

	it("generates strikes during surge phase", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "miner" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0);

		// Advance into surge phase: calm(600) + brewing(300) + active(400) = 1300
		let tick = 0;
		for (let i = 0; i < 1300; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("generates no strikes during aftermath phase", () => {
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "fabrication_unit" },
		];
		setGetBuildings(() => buildings);
		setRandomFn(() => 0);

		// Advance into aftermath: calm(600) + brewing(300) + active(400) + surge(100) = 1400
		let tick = 0;
		for (let i = 0; i < 1400; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events).toHaveLength(0);
	});

	it("does not strike when random exceeds damage chance", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "miner" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0.99); // Always fails chance check

		// Advance to active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events).toHaveLength(0);
		expect(damageFn).not.toHaveBeenCalled();
	});

	it("does not strike when no buildings exist", () => {
		setGetBuildings(() => []);
		setRandomFn(() => 0);

		// Advance to active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Lightning rod absorption
// ---------------------------------------------------------------------------

describe("storm — lightning rod absorption", () => {
	it("rod absorbs strike targeting nearby building", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "miner1", x: 0, z: 0, type: "miner" },
			{ id: "rod1", x: 3, z: 0, type: "lightning_rod" }, // within radius 5
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0); // Triggers strike on first building (index 0)

		// Advance to active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events.length).toBe(1);
		expect(events[0].absorbedByRod).toBe(true);
		expect(events[0].damage).toBe(0);
		expect(damageFn).not.toHaveBeenCalled();
	});

	it("rod does not absorb strike on itself", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "rod1", x: 0, z: 0, type: "lightning_rod" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0);

		// Advance to active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events.length).toBe(1);
		// The rod IS the target, so rod === target, no absorption
		expect(events[0].absorbedByRod).toBe(false);
		expect(events[0].damage).toBeGreaterThan(0);
		expect(damageFn).toHaveBeenCalled();
	});

	it("strike hits building when no rod is nearby", () => {
		const damageFn = jest.fn();
		const buildings: BuildingInfo[] = [
			{ id: "miner1", x: 0, z: 0, type: "miner" },
			{ id: "rod1", x: 100, z: 100, type: "lightning_rod" }, // far away
		];
		setGetBuildings(() => buildings);
		setApplyDamage(damageFn);
		setRandomFn(() => 0);

		// Advance to active phase
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}

		stormEscalationSystem(tick);
		const events = getStormEvents();
		expect(events.length).toBe(1);
		expect(events[0].absorbedByRod).toBe(false);
		expect(events[0].damage).toBeGreaterThan(0);
		expect(damageFn).toHaveBeenCalledWith("miner1", expect.any(Number));
	});
});

// ---------------------------------------------------------------------------
// Storm events
// ---------------------------------------------------------------------------

describe("storm — event management", () => {
	it("getStormEvents drains the event queue", () => {
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "miner" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(() => {});
		setRandomFn(() => 0);

		// Advance to active phase and produce a strike
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
			getStormEvents();
		}
		stormEscalationSystem(tick);

		const events1 = getStormEvents();
		expect(events1.length).toBeGreaterThan(0);

		// Second call should return empty
		const events2 = getStormEvents();
		expect(events2).toHaveLength(0);
	});

	it("events from different ticks do not accumulate", () => {
		setGetBuildings(() => []);
		setRandomFn(() => 0);

		stormEscalationSystem(0);
		stormEscalationSystem(1);
		const events = getStormEvents();
		// Calm phase — no events
		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Intensity multiplier
// ---------------------------------------------------------------------------

describe("storm — intensity multiplier", () => {
	it("calm phase has 0.5 intensity multiplier", () => {
		stormEscalationSystem(0);
		const state = getStormState();
		expect(state.intensityMultiplier).toBe(0.5);
	});

	it("active phase has 1.2 intensity multiplier", () => {
		// Advance to active: calm(600) + brewing(300) = 900
		let tick = 0;
		for (let i = 0; i < 900; i++) {
			stormEscalationSystem(tick++);
		}
		stormEscalationSystem(tick);
		const state = getStormState();
		expect(state.intensityMultiplier).toBe(1.2);
	});

	it("surge phase has 2.0 intensity multiplier", () => {
		// Advance to surge: calm(600) + brewing(300) + active(400) = 1300
		let tick = 0;
		for (let i = 0; i < 1300; i++) {
			stormEscalationSystem(tick++);
		}
		stormEscalationSystem(tick);
		const state = getStormState();
		expect(state.intensityMultiplier).toBe(2.0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("storm — reset", () => {
	it("reset clears all state back to initial", () => {
		// Advance some ticks
		for (let i = 0; i < 700; i++) {
			stormEscalationSystem(i);
		}

		resetStormEscalation();

		const state = getStormState();
		expect(state.phaseName).toBe("calm");
		expect(state.phaseIndex).toBe(0);
		expect(state.phaseTimer).toBe(0);
		expect(state.escalationLevel).toBe(0);
	});

	it("reset clears pending events", () => {
		const buildings: BuildingInfo[] = [
			{ id: "b1", x: 0, z: 0, type: "miner" },
		];
		setGetBuildings(() => buildings);
		setApplyDamage(() => {});
		setRandomFn(() => 0);

		// Advance to active phase and produce events
		let tick = 0;
		for (let i = 0; i < 901; i++) {
			stormEscalationSystem(tick++);
		}

		resetStormEscalation();
		const events = getStormEvents();
		expect(events).toHaveLength(0);
	});

	it("reset restores default hooks", () => {
		const customFn = jest.fn();
		setApplyDamage(customFn);
		resetStormEscalation();

		// After reset, applyDamage should be the default no-op
		// We verify indirectly: advance to active phase with buildings,
		// the custom fn should NOT be called
		setGetBuildings(() => [
			{ id: "b1", x: 0, z: 0, type: "miner" },
		]);
		setRandomFn(() => 0);

		let tick = 0;
		for (let i = 0; i < 901; i++) {
			stormEscalationSystem(tick++);
		}

		expect(customFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("storm — edge cases", () => {
	it("runs safely with no buildings registered", () => {
		setRandomFn(() => 0);
		expect(() => stormEscalationSystem(0)).not.toThrow();
	});

	it("handles single-building scenario", () => {
		const damageFn = jest.fn();
		setGetBuildings(() => [{ id: "solo", x: 0, z: 0, type: "miner" }]);
		setApplyDamage(damageFn);
		setRandomFn(() => 0);

		// Advance to active
		let tick = 0;
		for (let i = 0; i < 901; i++) {
			stormEscalationSystem(tick++);
		}

		const events = getStormEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);
	});
});
