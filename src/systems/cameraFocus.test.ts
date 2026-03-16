import {
	_resetCameraFocus,
	cancelCameraFocus,
	isCameraFocusActive,
	requestCameraFocus,
	updateCameraFocus,
} from "./cameraFocus";

beforeEach(() => {
	_resetCameraFocus();
});

describe("requestCameraFocus", () => {
	it("creates a pending focus that becomes active on next update", () => {
		requestCameraFocus(10, 20, null, 0.5);
		expect(isCameraFocusActive()).toBe(true);

		const result = updateCameraFocus(0, 0, 18, 0);
		expect(result).not.toBeNull();
		expect(result!.x).toBe(0); // at t=0, still at start
		expect(result!.z).toBe(0);
	});

	it("replaces a previous pending focus", () => {
		requestCameraFocus(10, 20, null, 0.5);
		requestCameraFocus(30, 40, null, 0.5);

		// Promote to active
		const result = updateCameraFocus(0, 0, 18, 0.5);
		expect(result).not.toBeNull();
		// After 0.5s with 0.5 duration, should be complete at target 30,40
		expect(result!.x).toBe(30);
		expect(result!.z).toBe(40);
		expect(result!.done).toBe(true);
	});
});

describe("updateCameraFocus", () => {
	it("returns null when no focus is active", () => {
		const result = updateCameraFocus(0, 0, 18, 0.016);
		expect(result).toBeNull();
	});

	it("interpolates position over duration", () => {
		requestCameraFocus(10, 20, null, 1.0);

		// At t=0
		const r0 = updateCameraFocus(0, 0, 18, 0);
		expect(r0).not.toBeNull();
		expect(r0!.x).toBeCloseTo(0, 1);
		expect(r0!.z).toBeCloseTo(0, 1);
		expect(r0!.done).toBe(false);

		// At t=0.5 (halfway through 1.0s duration)
		const r1 = updateCameraFocus(0, 0, 18, 0.5);
		expect(r1).not.toBeNull();
		expect(r1!.x).toBeGreaterThan(0);
		expect(r1!.x).toBeLessThan(10);
		expect(r1!.done).toBe(false);

		// At t=1.0 (complete)
		const r2 = updateCameraFocus(0, 0, 18, 0.5);
		expect(r2).not.toBeNull();
		expect(r2!.x).toBe(10);
		expect(r2!.z).toBe(20);
		expect(r2!.done).toBe(true);
	});

	it("handles zoom transitions", () => {
		requestCameraFocus(0, 0, 40, 1.0);

		// At start
		const r0 = updateCameraFocus(0, 0, 18, 0);
		expect(r0).not.toBeNull();
		expect(r0!.zoom).toBeCloseTo(18, 1);

		// Complete
		const r1 = updateCameraFocus(0, 0, 18, 1.0);
		expect(r1).not.toBeNull();
		expect(r1!.zoom).toBe(40);
		expect(r1!.done).toBe(true);
	});

	it("keeps current zoom when zoom is null", () => {
		requestCameraFocus(10, 20, null, 0.5);

		// Complete immediately
		const result = updateCameraFocus(0, 0, 25, 0.5);
		expect(result).not.toBeNull();
		expect(result!.zoom).toBe(25);
	});

	it("returns null after focus completes", () => {
		requestCameraFocus(10, 20, null, 0.1);
		updateCameraFocus(0, 0, 18, 0.1); // Complete it
		const after = updateCameraFocus(0, 0, 18, 0.016);
		expect(after).toBeNull();
	});
});

describe("cancelCameraFocus", () => {
	it("cancels pending focus", () => {
		requestCameraFocus(10, 20, null, 0.5);
		cancelCameraFocus();
		expect(isCameraFocusActive()).toBe(false);

		const result = updateCameraFocus(0, 0, 18, 0.016);
		expect(result).toBeNull();
	});

	it("cancels active focus mid-transition", () => {
		requestCameraFocus(10, 20, null, 1.0);
		updateCameraFocus(0, 0, 18, 0.1); // Start transition

		cancelCameraFocus();
		expect(isCameraFocusActive()).toBe(false);

		const result = updateCameraFocus(0, 0, 18, 0.016);
		expect(result).toBeNull();
	});
});

describe("isCameraFocusActive", () => {
	it("returns false initially", () => {
		expect(isCameraFocusActive()).toBe(false);
	});

	it("returns true when pending", () => {
		requestCameraFocus(10, 20, null, 0.5);
		expect(isCameraFocusActive()).toBe(true);
	});

	it("returns true during transition", () => {
		requestCameraFocus(10, 20, null, 1.0);
		updateCameraFocus(0, 0, 18, 0.1);
		expect(isCameraFocusActive()).toBe(true);
	});

	it("returns false after completion", () => {
		requestCameraFocus(10, 20, null, 0.1);
		updateCameraFocus(0, 0, 18, 0.1);
		expect(isCameraFocusActive()).toBe(false);
	});
});
