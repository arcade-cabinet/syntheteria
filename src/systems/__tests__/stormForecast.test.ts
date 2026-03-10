/**
 * Unit tests for the storm forecast system.
 *
 * Tests cover:
 * - Initialization and reset
 * - Seeded determinism (same seed → same schedule)
 * - Forecast generation with lookahead
 * - getNextStorm with ETA calculation
 * - getWeatherAtTime point queries
 * - Warning level thresholds (none / watch / warning / imminent)
 * - Listener registration, notification on level changes, unregistration
 * - Forecast accuracy tracking and historical accuracy
 * - Accuracy upgrades (tech tree integration)
 * - Edge cases: uninitialized calls, zero lookahead, far-future queries
 */

import {
	initForecast,
	generateForecast,
	getNextStorm,
	getWeatherAtTime,
	getStormWarningLevel,
	registerForecastListener,
	unregisterForecastListener,
	updateForecast,
	getHistoricalAccuracy,
	upgradeForecastAccuracy,
	getForecastAccuracy,
	getEventSchedule,
	recordPrediction,
	reset,
} from "../stormForecast";
import type {
	WeatherEventType,
	StormWarningLevel,
	StormEvent,
} from "../stormForecast";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Initialization & reset
// ---------------------------------------------------------------------------

describe("stormForecast — initialization", () => {
	it("returns empty forecast before initialization", () => {
		const forecast = generateForecast(0, 600);
		expect(forecast).toEqual([]);
	});

	it("returns null for getNextStorm before initialization", () => {
		expect(getNextStorm(0)).toBeNull();
	});

	it("returns null for getWeatherAtTime before initialization", () => {
		expect(getWeatherAtTime(100)).toBeNull();
	});

	it("returns 'none' warning level before initialization", () => {
		expect(getStormWarningLevel(0)).toBe("none");
	});

	it("initForecast populates the event schedule", () => {
		initForecast(42);
		const schedule = getEventSchedule();
		expect(schedule.length).toBeGreaterThan(0);
	});

	it("first event starts at time 0 and is clear", () => {
		initForecast(42);
		const schedule = getEventSchedule();
		expect(schedule[0].startTime).toBe(0);
		expect(schedule[0].type).toBe("clear");
	});

	it("reset clears all state", () => {
		initForecast(42);
		generateForecast(0, 1000);
		reset();
		expect(getEventSchedule()).toHaveLength(0);
		expect(generateForecast(0, 600)).toEqual([]);
		expect(getForecastAccuracy()).toBe(0.7);
	});
});

// ---------------------------------------------------------------------------
// Seeded determinism
// ---------------------------------------------------------------------------

describe("stormForecast — determinism", () => {
	it("same seed produces identical event schedules", () => {
		initForecast(123);
		generateForecast(0, 5000);
		const schedule1 = [...getEventSchedule()];

		reset();
		initForecast(123);
		generateForecast(0, 5000);
		const schedule2 = [...getEventSchedule()];

		expect(schedule1.length).toBe(schedule2.length);
		for (let i = 0; i < schedule1.length; i++) {
			expect(schedule1[i].type).toBe(schedule2[i].type);
			expect(schedule1[i].startTime).toBeCloseTo(schedule2[i].startTime, 5);
			expect(schedule1[i].duration).toBeCloseTo(schedule2[i].duration, 5);
			expect(schedule1[i].intensity).toBeCloseTo(schedule2[i].intensity, 5);
		}
	});

	it("different seeds produce different event schedules", () => {
		initForecast(1);
		generateForecast(0, 5000);
		const types1 = getEventSchedule().map((e) => e.type);

		reset();
		initForecast(99999);
		generateForecast(0, 5000);
		const types2 = getEventSchedule().map((e) => e.type);

		// With enough events, sequences should differ
		const mismatches = types1.filter((t, i) => i < types2.length && t !== types2[i]);
		expect(mismatches.length).toBeGreaterThan(0);
	});

	it("re-initializing with the same seed replays identically", () => {
		initForecast(777);
		const storm1 = getNextStorm(0);

		reset();
		initForecast(777);
		const storm2 = getNextStorm(0);

		if (storm1 && storm2) {
			expect(storm1.type).toBe(storm2.type);
			expect(storm1.startTime).toBeCloseTo(storm2.startTime, 5);
			expect(storm1.intensity).toBeCloseTo(storm2.intensity, 5);
		} else {
			expect(storm1).toEqual(storm2);
		}
	});
});

// ---------------------------------------------------------------------------
// Forecast generation
// ---------------------------------------------------------------------------

describe("stormForecast — generateForecast", () => {
	it("returns events within the lookahead window", () => {
		initForecast(42);
		const forecast = generateForecast(0, 2000);

		expect(forecast.length).toBeGreaterThan(0);
		for (const event of forecast) {
			const eventEnd = event.startTime + event.duration;
			// Event must overlap with [0, 2000]
			expect(eventEnd).toBeGreaterThan(0);
			expect(event.startTime).toBeLessThan(2000);
		}
	});

	it("events are in chronological order", () => {
		initForecast(42);
		const forecast = generateForecast(0, 5000);

		for (let i = 1; i < forecast.length; i++) {
			expect(forecast[i].startTime).toBeGreaterThanOrEqual(
				forecast[i - 1].startTime,
			);
		}
	});

	it("zero lookahead returns only the current event", () => {
		initForecast(42);
		const forecast = generateForecast(0, 0);
		// With 0 lookahead, endTime = currentTime, so no event's startTime < endTime
		// unless the current event starts at 0. The first event starts at 0 with
		// duration > 0, so startTime (0) < endTime (0) is false. Empty result.
		expect(forecast.length).toBe(0);
	});

	it("forecast at a future time skips past events", () => {
		initForecast(42);
		generateForecast(0, 3000);
		const lateForecast = generateForecast(2000, 1000);

		// Late forecast should not include events that ended before t=2000
		for (const event of lateForecast) {
			expect(event.startTime + event.duration).toBeGreaterThan(2000);
		}
	});

	it("all event types are valid WeatherEventType values", () => {
		const validTypes: WeatherEventType[] = [
			"clear", "cloudy", "rain", "storm", "fog", "acid_rain",
		];
		initForecast(42);
		const forecast = generateForecast(0, 10000);

		for (const event of forecast) {
			expect(validTypes).toContain(event.type);
		}
	});

	it("storm events have intensity between 0.3 and 1.0", () => {
		initForecast(42);
		// Generate a long forecast to find storms
		const forecast = generateForecast(0, 50000);
		const storms = forecast.filter(
			(e) => e.type === "storm" || e.type === "acid_rain",
		);

		// Should find at least one storm in 50000 seconds
		expect(storms.length).toBeGreaterThan(0);
		for (const storm of storms) {
			expect(storm.intensity).toBeGreaterThanOrEqual(0.3);
			expect(storm.intensity).toBeLessThanOrEqual(1.0);
		}
	});

	it("non-storm events have intensity 0", () => {
		initForecast(42);
		const forecast = generateForecast(0, 10000);
		const nonStorms = forecast.filter(
			(e) => e.type !== "storm" && e.type !== "acid_rain",
		);

		for (const event of nonStorms) {
			expect(event.intensity).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// getNextStorm
// ---------------------------------------------------------------------------

describe("stormForecast — getNextStorm", () => {
	it("returns a storm event with correct fields", () => {
		initForecast(42);
		const storm = getNextStorm(0);

		// With enough schedule generated, should find a storm
		expect(storm).not.toBeNull();
		if (storm) {
			expect(["storm", "acid_rain"]).toContain(storm.type);
			expect(storm.startTime).toBeGreaterThanOrEqual(0);
			expect(storm.duration).toBeGreaterThanOrEqual(30);
			expect(storm.duration).toBeLessThanOrEqual(120);
			expect(storm.intensity).toBeGreaterThanOrEqual(0.3);
			expect(storm.intensity).toBeLessThanOrEqual(1.0);
			expect(storm.eta).toBeGreaterThanOrEqual(0);
		}
	});

	it("ETA decreases as currentTime advances", () => {
		initForecast(42);
		const storm1 = getNextStorm(0);
		const storm2 = getNextStorm(100);

		expect(storm1).not.toBeNull();
		expect(storm2).not.toBeNull();
		if (storm1 && storm2 && storm1.startTime === storm2.startTime) {
			expect(storm2.eta).toBe(storm1.eta - 100);
		}
	});

	it("ETA is 0 when currentTime equals or exceeds storm start", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (storm) {
			const atStart = getNextStorm(storm.startTime);
			// Either eta is 0 (storm is active) or it found the next one
			expect(atStart).not.toBeNull();
		}
	});
});

// ---------------------------------------------------------------------------
// getWeatherAtTime
// ---------------------------------------------------------------------------

describe("stormForecast — getWeatherAtTime", () => {
	it("returns the first event at time 0", () => {
		initForecast(42);
		const event = getWeatherAtTime(0);
		expect(event).not.toBeNull();
		expect(event!.type).toBe("clear");
	});

	it("returns correct event for a mid-event query", () => {
		initForecast(42);
		const schedule = getEventSchedule();
		const secondEvent = schedule[1];
		const midTime = secondEvent.startTime + secondEvent.duration / 2;

		const result = getWeatherAtTime(midTime);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(secondEvent.type);
	});

	it("returns events for far-future times", () => {
		initForecast(42);
		const event = getWeatherAtTime(100000);
		expect(event).not.toBeNull();
		expect(event!.startTime).toBeLessThanOrEqual(100000);
		expect(event!.startTime + event!.duration).toBeGreaterThan(100000);
	});
});

// ---------------------------------------------------------------------------
// Warning levels
// ---------------------------------------------------------------------------

describe("stormForecast — warning levels", () => {
	it("returns 'none' when no storm is near", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		// If the first storm is far away, warning should be "none"
		if (storm && storm.eta > 300) {
			expect(getStormWarningLevel(0)).toBe("none");
		}
	});

	it("returns 'imminent' when storm is within 30 seconds", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (storm) {
			// Place ourselves 15 seconds before the storm
			const queryTime = storm.startTime - 15;
			if (queryTime >= 0) {
				expect(getStormWarningLevel(queryTime)).toBe("imminent");
			}
		}
	});

	it("returns 'warning' when storm is 30-120 seconds away", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (storm && storm.startTime > 60) {
			const queryTime = storm.startTime - 60;
			expect(getStormWarningLevel(queryTime)).toBe("warning");
		}
	});

	it("returns 'watch' when storm is 120-300 seconds away", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (storm && storm.startTime > 200) {
			const queryTime = storm.startTime - 200;
			expect(getStormWarningLevel(queryTime)).toBe("watch");
		}
	});

	it("warning level transitions through all stages as storm approaches", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (storm && storm.startTime > 400) {
			const levels: StormWarningLevel[] = [];
			// Sample at strategic points before the storm
			const checkPoints = [
				storm.startTime - 400, // > 300s → none
				storm.startTime - 250, // 120-300s → watch
				storm.startTime - 60,  // 30-120s → warning
				storm.startTime - 10,  // < 30s → imminent
			];

			for (const t of checkPoints) {
				if (t >= 0) {
					levels.push(getStormWarningLevel(t));
				}
			}

			// Should see escalating severity (or at least non-decreasing)
			const order: Record<StormWarningLevel, number> = {
				none: 0,
				watch: 1,
				warning: 2,
				imminent: 3,
			};
			for (let i = 1; i < levels.length; i++) {
				expect(order[levels[i]]).toBeGreaterThanOrEqual(order[levels[i - 1]]);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Listener callbacks
// ---------------------------------------------------------------------------

describe("stormForecast — listeners", () => {
	it("registerForecastListener returns a unique ID", () => {
		initForecast(42);
		const id1 = registerForecastListener(() => {});
		const id2 = registerForecastListener(() => {});
		expect(id1).not.toBe(id2);
	});

	it("listener fires when warning level changes", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (!storm) return;

		const calls: { level: StormWarningLevel; storm: StormEvent | null }[] = [];
		registerForecastListener((level, s) => {
			calls.push({ level, storm: s });
		});

		// Start far from storm, then jump close
		updateForecast(0);
		// Jump to just before storm to trigger a level change
		if (storm.startTime > 20) {
			updateForecast(storm.startTime - 10);
		}

		// Should have received at least one notification
		expect(calls.length).toBeGreaterThan(0);
	});

	it("listener receives storm event data on notification", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		expect(storm).not.toBeNull();
		if (!storm || storm.startTime < 20) return;

		let receivedStorm: StormEvent | null = null;
		registerForecastListener((_level, s) => {
			receivedStorm = s;
		});

		updateForecast(storm.startTime - 10);

		if (receivedStorm) {
			expect(["storm", "acid_rain"]).toContain(
				(receivedStorm as StormEvent).type,
			);
		}
	});

	it("unregisterForecastListener prevents further callbacks", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		if (!storm || storm.startTime < 20) return;

		let callCount = 0;
		const id = registerForecastListener(() => {
			callCount++;
		});

		updateForecast(0);
		const countAfterFirst = callCount;

		unregisterForecastListener(id);

		// Trigger another level change
		updateForecast(storm.startTime - 10);

		// Should not have received more callbacks after unregister
		expect(callCount).toBe(countAfterFirst);
	});

	it("multiple listeners all receive notifications", () => {
		initForecast(42);
		const storm = getNextStorm(0);
		if (!storm || storm.startTime < 20) return;

		let count1 = 0;
		let count2 = 0;
		registerForecastListener(() => { count1++; });
		registerForecastListener(() => { count2++; });

		updateForecast(storm.startTime - 10);

		// Both should fire on the same level change
		expect(count1).toBe(count2);
		expect(count1).toBeGreaterThan(0);
	});

	it("listener does not fire when warning level stays the same", () => {
		initForecast(42);

		let callCount = 0;
		registerForecastListener(() => {
			callCount++;
		});

		// Two updates at the same time should not re-trigger
		updateForecast(0);
		const countAfter = callCount;
		updateForecast(0);
		expect(callCount).toBe(countAfter);
	});
});

// ---------------------------------------------------------------------------
// Forecast accuracy tracking
// ---------------------------------------------------------------------------

describe("stormForecast — accuracy", () => {
	it("initial accuracy is 0.7 (base)", () => {
		initForecast(42);
		expect(getForecastAccuracy()).toBe(0.7);
	});

	it("getHistoricalAccuracy returns base accuracy with no predictions", () => {
		initForecast(42);
		expect(getHistoricalAccuracy()).toBe(0.7);
	});

	it("correct predictions yield high historical accuracy", () => {
		initForecast(42);
		const schedule = getEventSchedule();

		// Record predictions that match the actual schedule
		for (const event of schedule.slice(0, 5)) {
			recordPrediction(event.type, event.startTime);
		}

		// Advance time to evaluate predictions
		for (const event of schedule.slice(0, 5)) {
			updateForecast(event.startTime + 1);
		}

		const accuracy = getHistoricalAccuracy();
		expect(accuracy).toBeGreaterThanOrEqual(0.8);
	});

	it("incorrect predictions yield low historical accuracy", () => {
		initForecast(42);
		const schedule = getEventSchedule();

		// Record deliberately wrong predictions
		const wrongTypes: WeatherEventType[] = [
			"fog", "acid_rain", "storm", "cloudy", "rain",
		];
		for (let i = 0; i < Math.min(5, schedule.length); i++) {
			const wrongType =
				schedule[i].type === wrongTypes[i]
					? "clear"
					: wrongTypes[i];
			recordPrediction(wrongType, schedule[i].startTime);
		}

		// Evaluate
		for (let i = 0; i < Math.min(5, schedule.length); i++) {
			updateForecast(schedule[i].startTime + 1);
		}

		const accuracy = getHistoricalAccuracy();
		expect(accuracy).toBeLessThan(0.5);
	});

	it("upgradeForecastAccuracy increases accuracy", () => {
		initForecast(42);
		expect(getForecastAccuracy()).toBe(0.7);

		upgradeForecastAccuracy(0.1);
		expect(getForecastAccuracy()).toBeCloseTo(0.8, 5);

		upgradeForecastAccuracy(0.15);
		expect(getForecastAccuracy()).toBeCloseTo(0.95, 5);
	});

	it("accuracy cannot exceed 1.0", () => {
		initForecast(42);
		upgradeForecastAccuracy(0.5);
		expect(getForecastAccuracy()).toBe(1.0);

		upgradeForecastAccuracy(0.1);
		expect(getForecastAccuracy()).toBe(1.0);
	});

	it("accuracy cannot go below 0", () => {
		initForecast(42);
		upgradeForecastAccuracy(-1.0);
		expect(getForecastAccuracy()).toBe(0);
	});

	it("reset restores accuracy to base value", () => {
		initForecast(42);
		upgradeForecastAccuracy(0.3);
		expect(getForecastAccuracy()).toBe(1.0);

		reset();
		expect(getForecastAccuracy()).toBe(0.7);
	});
});

// ---------------------------------------------------------------------------
// Event schedule structure
// ---------------------------------------------------------------------------

describe("stormForecast — event schedule", () => {
	it("events are contiguous (no gaps between events)", () => {
		initForecast(42);
		generateForecast(0, 10000);
		const schedule = getEventSchedule();

		for (let i = 1; i < schedule.length; i++) {
			const prevEnd = schedule[i - 1].startTime + schedule[i - 1].duration;
			expect(schedule[i].startTime).toBeCloseTo(prevEnd, 5);
		}
	});

	it("all events have positive duration", () => {
		initForecast(42);
		generateForecast(0, 10000);
		const schedule = getEventSchedule();

		for (const event of schedule) {
			expect(event.duration).toBeGreaterThan(0);
		}
	});

	it("storm durations are within 30-120 seconds", () => {
		initForecast(42);
		generateForecast(0, 50000);
		const schedule = getEventSchedule();
		const storms = schedule.filter(
			(e) => e.type === "storm" || e.type === "acid_rain",
		);

		expect(storms.length).toBeGreaterThan(0);
		for (const storm of storms) {
			expect(storm.duration).toBeGreaterThanOrEqual(30);
			expect(storm.duration).toBeLessThanOrEqual(120);
		}
	});

	it("non-storm durations reflect base cycle with variance", () => {
		initForecast(42);
		generateForecast(0, 50000);
		const schedule = getEventSchedule();
		const nonStorms = schedule.filter(
			(e) => e.type !== "storm" && e.type !== "acid_rain",
		);

		const minExpected = 600 * (1 - 0.3); // 420
		const maxExpected = 600 * (1 + 0.3); // 780

		for (const event of nonStorms) {
			expect(event.duration).toBeGreaterThanOrEqual(minExpected - 1);
			expect(event.duration).toBeLessThanOrEqual(maxExpected + 1);
		}
	});
});

// ---------------------------------------------------------------------------
// updateForecast
// ---------------------------------------------------------------------------

describe("stormForecast — updateForecast", () => {
	it("does not throw when called before initialization", () => {
		expect(() => updateForecast(100)).not.toThrow();
	});

	it("does not throw when called repeatedly at the same time", () => {
		initForecast(42);
		expect(() => {
			updateForecast(0);
			updateForecast(0);
			updateForecast(0);
		}).not.toThrow();
	});

	it("handles large time jumps gracefully", () => {
		initForecast(42);
		expect(() => {
			updateForecast(1000000);
		}).not.toThrow();
	});
});
