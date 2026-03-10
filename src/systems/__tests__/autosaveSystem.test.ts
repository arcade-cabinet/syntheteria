/**
 * Unit tests for the autosave system.
 *
 * Tests cover:
 * - autosaveSystem tick function: triggers at correct interval
 * - Callback registration and invocation
 * - Pause awareness: ticks while paused are not counted
 * - Manual save: triggers immediately and resets timer
 * - Slot rotation: cycles through maxSlots
 * - Configuration: interval, max slots
 * - Enable/disable
 * - Query functions: getLastAutosaveTick, getNextAutosaveTick, etc.
 * - _resetAutosaveState: clears everything
 */

import {
	_resetAutosaveState,
	autosaveSystem,
	clearAutosaveCallback,
	getAutosaveInterval,
	getAutosaveState,
	getCurrentSlot,
	getLastAutosaveTick,
	getMaxAutosaveSlots,
	getNextAutosaveTick,
	getTicksSinceLastSave,
	isAutosaveEnabled,
	isAutosavePaused,
	pauseAutosave,
	resumeAutosave,
	setAutosaveCallback,
	setAutosaveEnabled,
	setAutosaveInterval,
	setMaxAutosaveSlots,
	triggerManualSave,
} from "../autosaveSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetAutosaveState();
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe("default state", () => {
	it("has default interval of 300 ticks", () => {
		expect(getAutosaveInterval()).toBe(300);
	});

	it("has default max slots of 3", () => {
		expect(getMaxAutosaveSlots()).toBe(3);
	});

	it("starts at slot 0", () => {
		expect(getCurrentSlot()).toBe(0);
	});

	it("is enabled by default", () => {
		expect(isAutosaveEnabled()).toBe(true);
	});

	it("is not paused by default", () => {
		expect(isAutosavePaused()).toBe(false);
	});

	it("has lastSaveTick of 0", () => {
		expect(getLastAutosaveTick()).toBe(0);
	});

	it("has 0 ticks since last save", () => {
		expect(getTicksSinceLastSave()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// autosaveSystem tick
// ---------------------------------------------------------------------------

describe("autosaveSystem", () => {
	it("does not trigger before interval is reached", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		for (let i = 1; i < 300; i++) {
			expect(autosaveSystem(i)).toBe(false);
		}
		expect(cb).not.toHaveBeenCalled();
	});

	it("triggers exactly at interval", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		// Tick 299 times (1 through 299) — no trigger
		for (let i = 1; i < 300; i++) {
			autosaveSystem(i);
		}
		expect(cb).not.toHaveBeenCalled();

		// Tick 300 — trigger
		const result = autosaveSystem(300);
		expect(result).toBe(true);
		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(0); // slot 0
	});

	it("triggers again after another full interval", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		// First trigger at tick 300
		for (let i = 1; i <= 300; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(1);

		// Second trigger after another 300 ticks
		for (let i = 301; i <= 600; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(2);
		expect(cb).toHaveBeenLastCalledWith(1); // slot 1
	});

	it("does not crash without a callback registered", () => {
		for (let i = 1; i <= 300; i++) {
			autosaveSystem(i);
		}
		// Should trigger but not crash
		expect(getLastAutosaveTick()).toBe(300);
	});

	it("returns false when disabled", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveEnabled(false);

		for (let i = 1; i <= 500; i++) {
			expect(autosaveSystem(i)).toBe(false);
		}
		expect(cb).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Pause awareness
// ---------------------------------------------------------------------------

describe("pause awareness", () => {
	it("does not count ticks while paused", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		// Tick 100 times
		for (let i = 1; i <= 100; i++) {
			autosaveSystem(i);
		}
		expect(getTicksSinceLastSave()).toBe(100);

		// Pause for 200 ticks
		pauseAutosave();
		for (let i = 101; i <= 300; i++) {
			autosaveSystem(i);
		}
		expect(getTicksSinceLastSave()).toBe(100); // unchanged

		// Resume and tick 200 more — should trigger at 300 total ticks counted
		resumeAutosave();
		for (let i = 301; i <= 500; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(1);
		expect(getTicksSinceLastSave()).toBe(0); // reset after save
	});

	it("returns false while paused even at interval", () => {
		pauseAutosave();
		for (let i = 1; i <= 500; i++) {
			expect(autosaveSystem(i)).toBe(false);
		}
	});

	it("isAutosavePaused reflects state", () => {
		expect(isAutosavePaused()).toBe(false);
		pauseAutosave();
		expect(isAutosavePaused()).toBe(true);
		resumeAutosave();
		expect(isAutosavePaused()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Manual save
// ---------------------------------------------------------------------------

describe("triggerManualSave", () => {
	it("invokes the callback immediately", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		triggerManualSave(50);
		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(0); // slot 0
	});

	it("resets the autosave timer", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		// Tick 200 times
		for (let i = 1; i <= 200; i++) {
			autosaveSystem(i);
		}
		expect(getTicksSinceLastSave()).toBe(200);

		// Manual save resets
		triggerManualSave(200);
		expect(getTicksSinceLastSave()).toBe(0);
		expect(getLastAutosaveTick()).toBe(200);
	});

	it("advances the slot", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);

		expect(getCurrentSlot()).toBe(0);
		triggerManualSave(10);
		expect(getCurrentSlot()).toBe(1);
		triggerManualSave(20);
		expect(getCurrentSlot()).toBe(2);
	});

	it("returns the slot index used for the save", () => {
		setAutosaveCallback(jest.fn());

		expect(triggerManualSave(10)).toBe(0);
		expect(triggerManualSave(20)).toBe(1);
		expect(triggerManualSave(30)).toBe(2);
	});

	it("next autosave respects the reset timer", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveInterval(100);

		// Tick 50 times
		for (let i = 1; i <= 50; i++) {
			autosaveSystem(i);
		}

		// Manual save resets timer
		triggerManualSave(50);
		expect(cb).toHaveBeenCalledTimes(1);

		// Need another 100 ticks (not 50) for next autosave
		for (let i = 51; i <= 100; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(1); // no trigger yet

		for (let i = 101; i <= 150; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(2); // now triggers
	});
});

// ---------------------------------------------------------------------------
// Slot rotation
// ---------------------------------------------------------------------------

describe("slot rotation", () => {
	it("cycles through slots 0, 1, 2, then wraps to 0", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveInterval(10);

		const _slots: number[] = [];
		for (let i = 1; i <= 40; i++) {
			autosaveSystem(i);
		}
		// 4 saves at ticks 10, 20, 30, 40
		expect(cb).toHaveBeenCalledTimes(4);
		expect(cb.mock.calls[0][0]).toBe(0);
		expect(cb.mock.calls[1][0]).toBe(1);
		expect(cb.mock.calls[2][0]).toBe(2);
		expect(cb.mock.calls[3][0]).toBe(0); // wrapped
	});

	it("respects custom maxSlots", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveInterval(10);
		setMaxAutosaveSlots(2);

		for (let i = 1; i <= 30; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(3);
		expect(cb.mock.calls[0][0]).toBe(0);
		expect(cb.mock.calls[1][0]).toBe(1);
		expect(cb.mock.calls[2][0]).toBe(0); // wrapped at 2
	});
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe("setAutosaveInterval", () => {
	it("changes the interval", () => {
		setAutosaveInterval(600);
		expect(getAutosaveInterval()).toBe(600);
	});

	it("floors fractional values", () => {
		setAutosaveInterval(150.7);
		expect(getAutosaveInterval()).toBe(150);
	});

	it("ignores zero", () => {
		setAutosaveInterval(0);
		expect(getAutosaveInterval()).toBe(300); // unchanged
	});

	it("ignores negative values", () => {
		setAutosaveInterval(-100);
		expect(getAutosaveInterval()).toBe(300);
	});

	it("ignores Infinity", () => {
		setAutosaveInterval(Infinity);
		expect(getAutosaveInterval()).toBe(300);
	});
});

describe("setMaxAutosaveSlots", () => {
	it("changes the max slots", () => {
		setMaxAutosaveSlots(5);
		expect(getMaxAutosaveSlots()).toBe(5);
	});

	it("floors fractional values", () => {
		setMaxAutosaveSlots(2.9);
		expect(getMaxAutosaveSlots()).toBe(2);
	});

	it("ignores zero", () => {
		setMaxAutosaveSlots(0);
		expect(getMaxAutosaveSlots()).toBe(3); // unchanged
	});

	it("ignores negative values", () => {
		setMaxAutosaveSlots(-1);
		expect(getMaxAutosaveSlots()).toBe(3);
	});

	it("wraps current slot if it exceeds new max", () => {
		setAutosaveCallback(jest.fn());
		triggerManualSave(1); // slot 0 -> now at 1
		triggerManualSave(2); // slot 1 -> now at 2
		expect(getCurrentSlot()).toBe(2);

		setMaxAutosaveSlots(2); // max is now 2, current=2 wraps to 0
		expect(getCurrentSlot()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Enable/disable
// ---------------------------------------------------------------------------

describe("enable/disable", () => {
	it("disabling prevents autosaves", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveEnabled(false);

		for (let i = 1; i <= 400; i++) {
			autosaveSystem(i);
		}
		expect(cb).not.toHaveBeenCalled();
	});

	it("re-enabling allows autosaves again", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		setAutosaveInterval(10);

		setAutosaveEnabled(false);
		for (let i = 1; i <= 20; i++) {
			autosaveSystem(i);
		}
		expect(cb).not.toHaveBeenCalled();

		setAutosaveEnabled(true);
		for (let i = 21; i <= 30; i++) {
			autosaveSystem(i);
		}
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("isAutosaveEnabled reflects state", () => {
		expect(isAutosaveEnabled()).toBe(true);
		setAutosaveEnabled(false);
		expect(isAutosaveEnabled()).toBe(false);
		setAutosaveEnabled(true);
		expect(isAutosaveEnabled()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Callback management
// ---------------------------------------------------------------------------

describe("callback management", () => {
	it("clearAutosaveCallback removes the callback", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		clearAutosaveCallback();

		setAutosaveInterval(5);
		for (let i = 1; i <= 5; i++) {
			autosaveSystem(i);
		}
		expect(cb).not.toHaveBeenCalled();
		// But the save should still "happen" internally
		expect(getLastAutosaveTick()).toBe(5);
	});

	it("replaces previous callback", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		setAutosaveCallback(cb1);
		setAutosaveCallback(cb2);

		setAutosaveInterval(5);
		for (let i = 1; i <= 5; i++) {
			autosaveSystem(i);
		}
		expect(cb1).not.toHaveBeenCalled();
		expect(cb2).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

describe("query functions", () => {
	it("getLastAutosaveTick returns the tick of last save", () => {
		setAutosaveCallback(jest.fn());
		setAutosaveInterval(10);

		for (let i = 1; i <= 10; i++) {
			autosaveSystem(i);
		}
		expect(getLastAutosaveTick()).toBe(10);
	});

	it("getNextAutosaveTick returns lastSaveTick + interval", () => {
		expect(getNextAutosaveTick()).toBe(300); // 0 + 300

		setAutosaveCallback(jest.fn());
		setAutosaveInterval(100);
		for (let i = 1; i <= 100; i++) {
			autosaveSystem(i);
		}
		expect(getNextAutosaveTick()).toBe(200); // 100 + 100
	});

	it("getTicksSinceLastSave tracks accumulated ticks", () => {
		setAutosaveCallback(jest.fn());

		for (let i = 1; i <= 50; i++) {
			autosaveSystem(i);
		}
		expect(getTicksSinceLastSave()).toBe(50);
	});

	it("getAutosaveState returns a snapshot", () => {
		const state = getAutosaveState();
		expect(state.interval).toBe(300);
		expect(state.enabled).toBe(true);
		expect(state.paused).toBe(false);
		expect(state.maxSlots).toBe(3);
	});

	it("getAutosaveState snapshot is not the internal object", () => {
		const s1 = getAutosaveState();
		const s2 = getAutosaveState();
		expect(s1).not.toBe(s2);
		expect(s1).toEqual(s2);
	});
});

// ---------------------------------------------------------------------------
// _resetAutosaveState
// ---------------------------------------------------------------------------

describe("_resetAutosaveState", () => {
	it("resets all state to defaults", () => {
		setAutosaveCallback(jest.fn());
		setAutosaveInterval(50);
		setMaxAutosaveSlots(5);
		pauseAutosave();
		setAutosaveEnabled(false);

		for (let i = 1; i <= 30; i++) {
			autosaveSystem(i); // won't tick (disabled) but call it anyway
		}

		_resetAutosaveState();

		expect(getAutosaveInterval()).toBe(300);
		expect(getMaxAutosaveSlots()).toBe(3);
		expect(getCurrentSlot()).toBe(0);
		expect(isAutosaveEnabled()).toBe(true);
		expect(isAutosavePaused()).toBe(false);
		expect(getLastAutosaveTick()).toBe(0);
		expect(getTicksSinceLastSave()).toBe(0);
	});

	it("clears the callback", () => {
		const cb = jest.fn();
		setAutosaveCallback(cb);
		_resetAutosaveState();

		setAutosaveInterval(5);
		for (let i = 1; i <= 5; i++) {
			autosaveSystem(i);
		}
		expect(cb).not.toHaveBeenCalled();
	});
});
