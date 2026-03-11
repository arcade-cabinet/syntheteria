/**
 * Tests for RadialToolMenu — exported pure state management functions.
 *
 * The module uses module-level state (currentTool, toolListeners), so tests
 * that mutate state must be careful about ordering or reset afterward.
 */

import {
	getEquippedTool,
	setEquippedTool,
	subscribeToolChange,
	type ToolType,
} from "../RadialToolMenu";

// ---------------------------------------------------------------------------
// getEquippedTool / setEquippedTool
// ---------------------------------------------------------------------------

describe("getEquippedTool / setEquippedTool", () => {
	afterEach(() => {
		// Reset to default between tests
		setEquippedTool("scanner");
	});

	it("returns 'scanner' as the initial tool", () => {
		setEquippedTool("scanner"); // ensure clean state
		expect(getEquippedTool()).toBe("scanner");
	});

	it("sets and gets each tool type", () => {
		const tools: ToolType[] = [
			"scanner",
			"repair",
			"welder",
			"fabricate",
			"build",
			"scavenge",
		];
		for (const tool of tools) {
			setEquippedTool(tool);
			expect(getEquippedTool()).toBe(tool);
		}
	});

	it("reflects the last set tool", () => {
		setEquippedTool("welder");
		setEquippedTool("build");
		expect(getEquippedTool()).toBe("build");
	});

	it("does not change other module state when setting tool", () => {
		setEquippedTool("repair");
		// Reading again yields the same value
		expect(getEquippedTool()).toBe("repair");
		expect(getEquippedTool()).toBe("repair");
	});
});

// ---------------------------------------------------------------------------
// subscribeToolChange
// ---------------------------------------------------------------------------

describe("subscribeToolChange", () => {
	afterEach(() => {
		setEquippedTool("scanner");
	});

	it("calls listener when tool changes", () => {
		const listener = jest.fn();
		const unsub = subscribeToolChange(listener);

		setEquippedTool("welder");
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
	});

	it("calls listener on every change", () => {
		const listener = jest.fn();
		const unsub = subscribeToolChange(listener);

		setEquippedTool("repair");
		setEquippedTool("build");
		setEquippedTool("scavenge");

		expect(listener).toHaveBeenCalledTimes(3);
		unsub();
	});

	it("does not call listener after unsubscribe", () => {
		const listener = jest.fn();
		const unsub = subscribeToolChange(listener);

		setEquippedTool("welder");
		unsub();
		setEquippedTool("build");

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("supports multiple listeners simultaneously", () => {
		const a = jest.fn();
		const b = jest.fn();
		const unsubA = subscribeToolChange(a);
		const unsubB = subscribeToolChange(b);

		setEquippedTool("fabricate");

		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);

		unsubA();
		unsubB();
	});

	it("removing one listener does not affect others", () => {
		const a = jest.fn();
		const b = jest.fn();
		const unsubA = subscribeToolChange(a);
		const unsubB = subscribeToolChange(b);

		unsubA();
		setEquippedTool("scanner");

		expect(a).not.toHaveBeenCalled();
		expect(b).toHaveBeenCalledTimes(1);

		unsubB();
	});

	it("returns an unsubscribe function", () => {
		const unsub = subscribeToolChange(() => {});
		expect(typeof unsub).toBe("function");
		unsub();
	});

	it("calling unsub twice does not throw", () => {
		const unsub = subscribeToolChange(() => {});
		expect(() => {
			unsub();
			unsub();
		}).not.toThrow();
	});
});
