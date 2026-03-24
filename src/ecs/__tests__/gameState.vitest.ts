/**
 * Tests for the game state manager — speed controls, pause, simulation tick,
 * and the useSyncExternalStore bridge (subscribe/getSnapshot).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getGameSpeed,
	getSnapshot,
	isPaused,
	setGameSpeed,
	simulationTick,
	subscribe,
	togglePause,
} from "../gameState";

// Reset state between tests by toggling pause off and resetting speed
beforeEach(() => {
	// Ensure unpaused at speed 1
	if (isPaused()) togglePause();
	setGameSpeed(1);
});

// ---------------------------------------------------------------------------
// Speed controls
// ---------------------------------------------------------------------------

describe("setGameSpeed / getGameSpeed", () => {
	it("defaults to speed 1", () => {
		expect(getGameSpeed()).toBe(1);
	});

	it("sets speed within valid range", () => {
		setGameSpeed(2);
		expect(getGameSpeed()).toBe(2);

		setGameSpeed(0.5);
		expect(getGameSpeed()).toBe(0.5);

		setGameSpeed(4);
		expect(getGameSpeed()).toBe(4);
	});

	it("clamps speed below minimum (0.5)", () => {
		setGameSpeed(0.1);
		expect(getGameSpeed()).toBe(0.5);

		setGameSpeed(0);
		expect(getGameSpeed()).toBe(0.5);

		setGameSpeed(-1);
		expect(getGameSpeed()).toBe(0.5);
	});

	it("clamps speed above maximum (4)", () => {
		setGameSpeed(10);
		expect(getGameSpeed()).toBe(4);

		setGameSpeed(100);
		expect(getGameSpeed()).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------

describe("togglePause / isPaused", () => {
	it("starts unpaused", () => {
		expect(isPaused()).toBe(false);
	});

	it("toggles pause on and off", () => {
		togglePause();
		expect(isPaused()).toBe(true);

		togglePause();
		expect(isPaused()).toBe(false);
	});

	it("getGameSpeed returns 0 when paused", () => {
		setGameSpeed(2);
		togglePause();
		expect(getGameSpeed()).toBe(0);
	});

	it("getGameSpeed restores after unpause", () => {
		setGameSpeed(2);
		togglePause();
		expect(getGameSpeed()).toBe(0);

		togglePause();
		expect(getGameSpeed()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Simulation tick
// ---------------------------------------------------------------------------

describe("simulationTick", () => {
	it("increments tick counter", () => {
		const before = getSnapshot().tick;
		simulationTick();
		expect(getSnapshot().tick).toBe(before + 1);
	});

	it("does not tick when paused", () => {
		togglePause();
		const before = getSnapshot().tick;
		simulationTick();
		expect(getSnapshot().tick).toBe(before);
	});
});

// ---------------------------------------------------------------------------
// Subscribe / getSnapshot (useSyncExternalStore bridge)
// ---------------------------------------------------------------------------

describe("subscribe / getSnapshot", () => {
	it("subscribe returns an unsubscribe function", () => {
		const listener = vi.fn();
		const unsubscribe = subscribe(listener);
		expect(typeof unsubscribe).toBe("function");
		unsubscribe();
	});

	it("notifies listeners on speed change", () => {
		const listener = vi.fn();
		const unsub = subscribe(listener);

		setGameSpeed(2);
		expect(listener).toHaveBeenCalled();

		unsub();
	});

	it("notifies listeners on pause toggle", () => {
		const listener = vi.fn();
		const unsub = subscribe(listener);

		togglePause();
		expect(listener).toHaveBeenCalled();

		// Clean up
		togglePause();
		unsub();
	});

	it("notifies listeners on simulation tick", () => {
		const listener = vi.fn();
		const unsub = subscribe(listener);

		simulationTick();
		expect(listener).toHaveBeenCalled();

		unsub();
	});

	it("does not notify after unsubscribe", () => {
		const listener = vi.fn();
		const unsub = subscribe(listener);
		unsub();

		setGameSpeed(2);
		expect(listener).not.toHaveBeenCalled();
	});

	it("getSnapshot returns cached snapshot on repeated calls", () => {
		const a = getSnapshot();
		const b = getSnapshot();
		expect(a).toBe(b); // same reference
	});

	it("getSnapshot returns new reference after state change", () => {
		const a = getSnapshot();
		setGameSpeed(2);
		const b = getSnapshot();
		expect(a).not.toBe(b);
		expect(b.gameSpeed).toBe(2);
	});

	it("snapshot includes all 5 speed settings", () => {
		const speeds = [0.5, 1, 2, 4];
		for (const speed of speeds) {
			setGameSpeed(speed);
			expect(getSnapshot().gameSpeed).toBe(speed);
		}

		// Pause = gameSpeed still shows internal speed, paused flag is separate
		setGameSpeed(1);
		togglePause();
		const snap = getSnapshot();
		expect(snap.paused).toBe(true);
		expect(snap.gameSpeed).toBe(1); // internal speed preserved
	});
});
