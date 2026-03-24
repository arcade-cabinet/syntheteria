/**
 * Human temperature system tests.
 *
 * Tests the 5-tier disposition meter: event processing, clamping,
 * tier transitions, and reset behavior.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTemperatureTier } from "../../config/humanEncounterDefs";
import {
	getHumanTemperature,
	getHumanTemperatureTier,
	humanTemperatureSystem,
	popTierTransition,
	queueHumanEvent,
	resetHumanTemperature,
	setHumanTemperature,
} from "../humanTemperature";

beforeEach(() => {
	resetHumanTemperature();
});

afterEach(() => {
	resetHumanTemperature();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
	it("starts at temperature 10", () => {
		expect(getHumanTemperature()).toBe(10);
	});

	it("starts in frozen tier", () => {
		expect(getHumanTemperatureTier()).toBe("frozen");
	});

	it("no tier transition on startup", () => {
		expect(popTierTransition()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Event processing
// ---------------------------------------------------------------------------

describe("event processing", () => {
	it("clearing a cult room raises temperature by 5", () => {
		queueHumanEvent("cult_room_cleared");
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(15);
	});

	it("building near humans raises temperature by 3", () => {
		queueHumanEvent("build_near_humans");
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(13);
	});

	it("losing a unit lowers temperature by 2", () => {
		queueHumanEvent("unit_lost");
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(8);
	});

	it("destroying a shrine raises temperature by 8", () => {
		queueHumanEvent("shrine_destroyed");
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(18);
	});

	it("friendly fire lowers temperature by 10", () => {
		queueHumanEvent("friendly_fire");
		humanTemperatureSystem();
		// 10 - 10 = 0
		expect(getHumanTemperature()).toBe(0);
	});

	it("multiple events in one tick are cumulative", () => {
		queueHumanEvent("cult_room_cleared"); // +5
		queueHumanEvent("build_near_humans"); // +3
		humanTemperatureSystem();
		// 10 + 5 + 3 = 18
		expect(getHumanTemperature()).toBe(18);
	});

	it("no events means no change", () => {
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Clamping
// ---------------------------------------------------------------------------

describe("clamping", () => {
	it("clamps at minimum 0", () => {
		// Start at 10, friendly fire = -10, then another -10
		queueHumanEvent("friendly_fire");
		queueHumanEvent("friendly_fire");
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(0);
	});

	it("clamps at maximum 100", () => {
		setHumanTemperature(95);
		queueHumanEvent("shrine_destroyed"); // +8 → would be 103
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(100);
	});

	it("setHumanTemperature clamps to 0-100", () => {
		setHumanTemperature(-50);
		expect(getHumanTemperature()).toBe(0);

		setHumanTemperature(200);
		expect(getHumanTemperature()).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Tier thresholds
// ---------------------------------------------------------------------------

describe("tier thresholds", () => {
	it("0-20 is frozen", () => {
		setHumanTemperature(0);
		expect(getHumanTemperatureTier()).toBe("frozen");

		setHumanTemperature(20);
		expect(getHumanTemperatureTier()).toBe("frozen");
	});

	it("21-40 is cool", () => {
		setHumanTemperature(21);
		expect(getHumanTemperatureTier()).toBe("cool");

		setHumanTemperature(40);
		expect(getHumanTemperatureTier()).toBe("cool");
	});

	it("41-60 is warm", () => {
		setHumanTemperature(41);
		expect(getHumanTemperatureTier()).toBe("warm");

		setHumanTemperature(60);
		expect(getHumanTemperatureTier()).toBe("warm");
	});

	it("61-80 is hot", () => {
		setHumanTemperature(61);
		expect(getHumanTemperatureTier()).toBe("hot");

		setHumanTemperature(80);
		expect(getHumanTemperatureTier()).toBe("hot");
	});

	it("81-100 is burning", () => {
		setHumanTemperature(81);
		expect(getHumanTemperatureTier()).toBe("burning");

		setHumanTemperature(100);
		expect(getHumanTemperatureTier()).toBe("burning");
	});
});

// ---------------------------------------------------------------------------
// Tier transitions
// ---------------------------------------------------------------------------

describe("tier transitions", () => {
	it("detects transition from frozen to cool", () => {
		setHumanTemperature(19);
		queueHumanEvent("cult_room_cleared"); // +5 → 24 (cool)
		humanTemperatureSystem();

		const transition = popTierTransition();
		expect(transition).not.toBeNull();
		expect(transition!.from).toBe("frozen");
		expect(transition!.to).toBe("cool");
	});

	it("popTierTransition is consumed on read", () => {
		setHumanTemperature(19);
		queueHumanEvent("cult_room_cleared");
		humanTemperatureSystem();

		expect(popTierTransition()).not.toBeNull();
		expect(popTierTransition()).toBeNull(); // consumed
	});

	it("no transition when staying in same tier", () => {
		setHumanTemperature(5);
		queueHumanEvent("build_near_humans"); // +3 → 8, still frozen
		humanTemperatureSystem();

		expect(popTierTransition()).toBeNull();
	});

	it("detects downward tier transition", () => {
		setHumanTemperature(22); // cool tier
		queueHumanEvent("friendly_fire"); // -10 → 12, back to frozen
		humanTemperatureSystem();

		const transition = popTierTransition();
		expect(transition).not.toBeNull();
		expect(transition!.from).toBe("cool");
		expect(transition!.to).toBe("frozen");
	});

	it("can skip tiers with large delta", () => {
		setHumanTemperature(19); // frozen
		// +5 +8 +5 +3 = 21 → 40 (cool, not warm yet)
		queueHumanEvent("cult_room_cleared");
		queueHumanEvent("shrine_destroyed");
		queueHumanEvent("cult_room_cleared");
		queueHumanEvent("build_near_humans");
		humanTemperatureSystem();
		// 19 + 5 + 8 + 5 + 3 = 40 → cool
		expect(getHumanTemperatureTier()).toBe("cool");
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("reset returns to initial state", () => {
		setHumanTemperature(75);
		queueHumanEvent("cult_room_cleared");
		resetHumanTemperature();

		expect(getHumanTemperature()).toBe(10);
		expect(getHumanTemperatureTier()).toBe("frozen");

		// Queued events should be cleared
		humanTemperatureSystem();
		expect(getHumanTemperature()).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Tier definition lookup
// ---------------------------------------------------------------------------

describe("getTemperatureTier", () => {
	it("returns correct tier for boundary values", () => {
		expect(getTemperatureTier(0).tier).toBe("frozen");
		expect(getTemperatureTier(20).tier).toBe("frozen");
		expect(getTemperatureTier(21).tier).toBe("cool");
		expect(getTemperatureTier(40).tier).toBe("cool");
		expect(getTemperatureTier(41).tier).toBe("warm");
		expect(getTemperatureTier(60).tier).toBe("warm");
		expect(getTemperatureTier(61).tier).toBe("hot");
		expect(getTemperatureTier(80).tier).toBe("hot");
		expect(getTemperatureTier(81).tier).toBe("burning");
		expect(getTemperatureTier(100).tier).toBe("burning");
	});

	it("tier definitions have display names", () => {
		const tier = getTemperatureTier(50);
		expect(tier.displayName).toBe("Warm");
		expect(tier.color).toBeTruthy();
		expect(tier.effect).toBeTruthy();
	});
});
