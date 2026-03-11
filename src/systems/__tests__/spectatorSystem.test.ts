/**
 * Unit tests for spectatorSystem.ts
 *
 * Tests state machine: active/inactive, speed clamping, useSyncExternalStore
 * subscriber protocol, and reset behaviour.
 */

import {
	getSpectatorSnapshot,
	getSpectatorSpeed,
	isSpectatorActive,
	resetSpectator,
	setSpectatorMode,
	setSpectatorSpeed,
	SPEED_PRESETS,
	subscribeSpectator,
} from "../spectatorSystem";

// Mock gameState so setGameSpeed doesn't require a live ECS world
jest.mock("../../ecs/gameState", () => ({
	setGameSpeed: jest.fn(),
}));

import { setGameSpeed } from "../../ecs/gameState";
const mockSetGameSpeed = setGameSpeed as jest.MockedFunction<typeof setGameSpeed>;

afterEach(() => {
	resetSpectator();
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
	it("is inactive by default", () => {
		expect(isSpectatorActive()).toBe(false);
	});

	it("has speed 1.0 by default", () => {
		expect(getSpectatorSpeed()).toBe(1.0);
	});

	it("snapshot reflects defaults", () => {
		const snap = getSpectatorSnapshot();
		expect(snap.active).toBe(false);
		expect(snap.speed).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// setSpectatorMode
// ---------------------------------------------------------------------------

describe("setSpectatorMode", () => {
	it("activates spectator mode", () => {
		setSpectatorMode(true);
		expect(isSpectatorActive()).toBe(true);
		expect(getSpectatorSnapshot().active).toBe(true);
	});

	it("deactivates spectator mode", () => {
		setSpectatorMode(true);
		setSpectatorMode(false);
		expect(isSpectatorActive()).toBe(false);
		expect(getSpectatorSnapshot().active).toBe(false);
	});

	it("resets speed to 1.0 on deactivation", () => {
		setSpectatorMode(true);
		setSpectatorSpeed(4.0);
		setSpectatorMode(false);
		expect(getSpectatorSpeed()).toBe(1.0);
		expect(getSpectatorSnapshot().speed).toBe(1.0);
	});

	it("calls setGameSpeed(1.0) on deactivation", () => {
		setSpectatorMode(true);
		setSpectatorSpeed(2.0);
		mockSetGameSpeed.mockClear();
		setSpectatorMode(false);
		expect(mockSetGameSpeed).toHaveBeenCalledWith(1.0);
	});

	it("notifies subscribers on activation", () => {
		const cb = jest.fn();
		const unsub = subscribeSpectator(cb);
		setSpectatorMode(true);
		expect(cb).toHaveBeenCalledTimes(1);
		unsub();
	});

	it("notifies subscribers on deactivation", () => {
		setSpectatorMode(true);
		const cb = jest.fn();
		const unsub = subscribeSpectator(cb);
		setSpectatorMode(false);
		expect(cb).toHaveBeenCalledTimes(1);
		unsub();
	});
});

// ---------------------------------------------------------------------------
// setSpectatorSpeed
// ---------------------------------------------------------------------------

describe("setSpectatorSpeed", () => {
	it("sets speed and reflects in snapshot", () => {
		setSpectatorMode(true);
		setSpectatorSpeed(2.0);
		expect(getSpectatorSpeed()).toBe(2.0);
		expect(getSpectatorSnapshot().speed).toBe(2.0);
	});

	it("clamps speed at minimum 0.5", () => {
		setSpectatorSpeed(0.1);
		expect(getSpectatorSpeed()).toBe(0.5);
	});

	it("clamps speed at maximum 4.0", () => {
		setSpectatorSpeed(99);
		expect(getSpectatorSpeed()).toBe(4.0);
	});

	it("calls setGameSpeed with clamped value", () => {
		setSpectatorSpeed(2.0);
		expect(mockSetGameSpeed).toHaveBeenCalledWith(2.0);
	});

	it("notifies subscribers on speed change", () => {
		const cb = jest.fn();
		const unsub = subscribeSpectator(cb);
		setSpectatorSpeed(4.0);
		expect(cb).toHaveBeenCalledTimes(1);
		unsub();
	});
});

// ---------------------------------------------------------------------------
// SPEED_PRESETS
// ---------------------------------------------------------------------------

describe("SPEED_PRESETS", () => {
	it("has four presets", () => {
		expect(SPEED_PRESETS).toHaveLength(4);
	});

	it("includes 0.5x, 1x, 2x, 4x", () => {
		const values = SPEED_PRESETS.map((p) => p.value);
		expect(values).toEqual([0.5, 1.0, 2.0, 4.0]);
	});

	it("all values are within the clamp range", () => {
		for (const preset of SPEED_PRESETS) {
			expect(preset.value).toBeGreaterThanOrEqual(0.5);
			expect(preset.value).toBeLessThanOrEqual(4.0);
		}
	});

	it("all presets have a label string", () => {
		for (const preset of SPEED_PRESETS) {
			expect(typeof preset.label).toBe("string");
			expect(preset.label.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// subscribeSpectator / useSyncExternalStore protocol
// ---------------------------------------------------------------------------

describe("subscribeSpectator", () => {
	it("returns an unsubscribe function", () => {
		const unsub = subscribeSpectator(() => {});
		expect(typeof unsub).toBe("function");
		unsub();
	});

	it("stops notifying after unsubscribe", () => {
		const cb = jest.fn();
		const unsub = subscribeSpectator(cb);
		unsub();
		setSpectatorMode(true);
		expect(cb).not.toHaveBeenCalled();
	});

	it("snapshot reference changes on each update", () => {
		const snap1 = getSpectatorSnapshot();
		setSpectatorMode(true);
		const snap2 = getSpectatorSnapshot();
		expect(snap2).not.toBe(snap1);
	});

	it("snapshot is stable between updates", () => {
		const snap1 = getSpectatorSnapshot();
		const snap2 = getSpectatorSnapshot();
		expect(snap1).toBe(snap2);
	});
});

// ---------------------------------------------------------------------------
// resetSpectator
// ---------------------------------------------------------------------------

describe("resetSpectator", () => {
	it("resets all state to defaults", () => {
		setSpectatorMode(true);
		setSpectatorSpeed(4.0);
		resetSpectator();
		expect(isSpectatorActive()).toBe(false);
		expect(getSpectatorSpeed()).toBe(1.0);
	});

	it("resets snapshot to defaults", () => {
		setSpectatorMode(true);
		setSpectatorSpeed(2.0);
		resetSpectator();
		const snap = getSpectatorSnapshot();
		expect(snap.active).toBe(false);
		expect(snap.speed).toBe(1.0);
	});

	it("notifies subscribers on reset", () => {
		const cb = jest.fn();
		const unsub = subscribeSpectator(cb);
		resetSpectator();
		expect(cb).toHaveBeenCalledTimes(1);
		unsub();
	});
});
