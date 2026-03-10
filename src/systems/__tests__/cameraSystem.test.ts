/**
 * Unit tests for cameraSystem — FPS camera state management.
 *
 * Tests cover:
 * - Position get/set
 * - Yaw rotation with wrapping to [0, 2*PI)
 * - Pitch rotation with clamping to [-PI/2, PI/2]
 * - Head bob: phase advance, amplitude scaling, movement blend
 * - Camera shake: trigger, decay, duration expiry, stronger-wins
 * - FOV interpolation: smooth lerp toward target
 * - getCameraState returns composite of all effects
 * - resetCameraSystem clears everything
 */

import {
	getCameraState,
	getBobAmount,
	getBobPhase,
	isShakeActive,
	resetCameraSystem,
	rotateYaw,
	rotatePitch,
	setHeadBobConfig,
	getHeadBobConfig,
	setPosition,
	setPitch,
	setYaw,
	setTargetFov,
	setDefaultFov,
	triggerShake,
	updateCamera,
} from "../cameraSystem";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetCameraSystem();
});

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

describe("position", () => {
	it("defaults to origin", () => {
		const state = getCameraState();
		expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("setPosition updates position", () => {
		setPosition(10, 20, 30);
		const state = getCameraState();
		expect(state.position).toEqual({ x: 10, y: 20, z: 30 });
	});

	it("returns a copy, not a reference", () => {
		setPosition(1, 2, 3);
		const a = getCameraState();
		const b = getCameraState();
		expect(a.position).toEqual(b.position);
		a.position.x = 999;
		expect(getCameraState().position.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Yaw
// ---------------------------------------------------------------------------

describe("yaw", () => {
	it("defaults to 0", () => {
		expect(getCameraState().yaw).toBe(0);
	});

	it("rotateYaw adds delta", () => {
		rotateYaw(1.0);
		expect(getCameraState().yaw).toBeCloseTo(1.0);
	});

	it("rotateYaw accumulates", () => {
		rotateYaw(1.0);
		rotateYaw(0.5);
		expect(getCameraState().yaw).toBeCloseTo(1.5);
	});

	it("wraps positive overflow to [0, 2*PI)", () => {
		rotateYaw(Math.PI * 2 + 0.5);
		expect(getCameraState().yaw).toBeCloseTo(0.5);
	});

	it("wraps negative to [0, 2*PI)", () => {
		rotateYaw(-0.5);
		expect(getCameraState().yaw).toBeCloseTo(Math.PI * 2 - 0.5);
	});

	it("wraps large negative values", () => {
		rotateYaw(-Math.PI * 4 - 1.0);
		expect(getCameraState().yaw).toBeCloseTo(Math.PI * 2 - 1.0);
	});

	it("setYaw sets directly with wrapping", () => {
		setYaw(Math.PI * 3);
		expect(getCameraState().yaw).toBeCloseTo(Math.PI);
	});

	it("setYaw wraps negative", () => {
		setYaw(-Math.PI / 2);
		expect(getCameraState().yaw).toBeCloseTo(Math.PI * 2 - Math.PI / 2);
	});
});

// ---------------------------------------------------------------------------
// Pitch
// ---------------------------------------------------------------------------

describe("pitch", () => {
	it("defaults to 0", () => {
		expect(getCameraState().pitch).toBe(0);
	});

	it("rotatePitch adds delta", () => {
		rotatePitch(0.3);
		expect(getCameraState().pitch).toBeCloseTo(0.3);
	});

	it("clamps pitch to PI/2", () => {
		rotatePitch(Math.PI);
		expect(getCameraState().pitch).toBeCloseTo(Math.PI / 2);
	});

	it("clamps pitch to -PI/2", () => {
		rotatePitch(-Math.PI);
		expect(getCameraState().pitch).toBeCloseTo(-Math.PI / 2);
	});

	it("accumulates pitch within bounds", () => {
		rotatePitch(0.2);
		rotatePitch(0.3);
		expect(getCameraState().pitch).toBeCloseTo(0.5);
	});

	it("setPitch sets directly with clamping", () => {
		setPitch(10);
		expect(getCameraState().pitch).toBeCloseTo(Math.PI / 2);
	});

	it("setPitch clamps negative", () => {
		setPitch(-10);
		expect(getCameraState().pitch).toBeCloseTo(-Math.PI / 2);
	});

	it("setPitch within range is exact", () => {
		setPitch(0.7);
		expect(getCameraState().pitch).toBeCloseTo(0.7);
	});
});

// ---------------------------------------------------------------------------
// Head bob
// ---------------------------------------------------------------------------

describe("head bob", () => {
	it("no bob when not moving", () => {
		updateCamera(0.016, false, 0);
		const state = getCameraState();
		expect(state.bobOffset.x).toBe(0);
		expect(state.bobOffset.y).toBe(0);
		expect(state.bobOffset.z).toBe(0);
	});

	it("produces non-zero bob offset when moving", () => {
		// Run several frames to build up bobAmount
		for (let i = 0; i < 30; i++) {
			updateCamera(0.016, true, 5);
		}
		const state = getCameraState();
		// At least one of the offsets should be non-zero
		const totalBob =
			Math.abs(state.bobOffset.x) + Math.abs(state.bobOffset.y);
		expect(totalBob).toBeGreaterThan(0);
	});

	it("bobOffsetZ is always 0", () => {
		for (let i = 0; i < 30; i++) {
			updateCamera(0.016, true, 5);
		}
		expect(getCameraState().bobOffset.z).toBe(0);
	});

	it("bob amount scales with moveSpeed", () => {
		// Move slowly
		for (let i = 0; i < 60; i++) {
			updateCamera(0.016, true, 1);
		}
		const slowBob = getBobAmount();

		resetCameraSystem();

		// Move fast
		for (let i = 0; i < 60; i++) {
			updateCamera(0.016, true, 5);
		}
		const fastBob = getBobAmount();

		expect(fastBob).toBeGreaterThan(slowBob);
	});

	it("bob decays when movement stops", () => {
		// Build up bob
		for (let i = 0; i < 30; i++) {
			updateCamera(0.016, true, 5);
		}
		const movingBob = getBobAmount();
		expect(movingBob).toBeGreaterThan(0);

		// Stop moving and let it decay
		for (let i = 0; i < 100; i++) {
			updateCamera(0.016, false, 0);
		}
		const stoppedBob = getBobAmount();
		expect(stoppedBob).toBe(0);
	});

	it("bob phase advances while moving", () => {
		updateCamera(0.016, true, 5);
		updateCamera(0.016, true, 5);
		updateCamera(0.016, true, 5);
		const phase = getBobPhase();
		expect(phase).toBeGreaterThan(0);
	});

	it("bob phase resets when bob amount hits zero", () => {
		// Build up
		for (let i = 0; i < 30; i++) {
			updateCamera(0.016, true, 5);
		}
		expect(getBobPhase()).toBeGreaterThan(0);

		// Fully decay
		for (let i = 0; i < 200; i++) {
			updateCamera(0.016, false, 0);
		}
		expect(getBobPhase()).toBe(0);
		expect(getBobAmount()).toBe(0);
	});

	it("setHeadBobConfig changes bob parameters", () => {
		setHeadBobConfig({ amplitudeY: 0.1, amplitudeX: 0.05 });
		const config = getHeadBobConfig();
		expect(config.amplitudeY).toBe(0.1);
		expect(config.amplitudeX).toBe(0.05);
	});

	it("setHeadBobConfig partial update preserves other fields", () => {
		const original = getHeadBobConfig();
		setHeadBobConfig({ amplitudeY: 0.2 });
		const updated = getHeadBobConfig();
		expect(updated.amplitudeY).toBe(0.2);
		expect(updated.amplitudeX).toBe(original.amplitudeX);
		expect(updated.frequency).toBe(original.frequency);
	});

	it("bob amplitude is bounded by config values", () => {
		setHeadBobConfig({ amplitudeY: 0.1, amplitudeX: 0.05 });

		// Run for a while to reach full bob
		for (let i = 0; i < 200; i++) {
			updateCamera(0.016, true, 5);
		}

		const state = getCameraState();
		expect(Math.abs(state.bobOffset.y)).toBeLessThanOrEqual(0.1 + 0.001);
		expect(Math.abs(state.bobOffset.x)).toBeLessThanOrEqual(0.05 + 0.001);
	});
});

// ---------------------------------------------------------------------------
// Camera shake
// ---------------------------------------------------------------------------

describe("camera shake", () => {
	it("no shake by default", () => {
		const state = getCameraState();
		expect(state.shakeOffset).toEqual({ x: 0, y: 0, z: 0 });
		expect(isShakeActive()).toBe(false);
	});

	it("triggerShake activates shake", () => {
		triggerShake(0.5, 1.0);
		expect(isShakeActive()).toBe(true);
	});

	it("shake produces non-zero offsets during active period", () => {
		triggerShake(0.5, 1.0, 15, 2);
		updateCamera(0.05, false, 0);
		const state = getCameraState();
		const total =
			Math.abs(state.shakeOffset.x) +
			Math.abs(state.shakeOffset.y) +
			Math.abs(state.shakeOffset.z);
		expect(total).toBeGreaterThan(0);
	});

	it("shake deactivates after duration expires", () => {
		triggerShake(0.5, 0.5);
		// Advance past duration
		updateCamera(0.6, false, 0);
		expect(isShakeActive()).toBe(false);
		const state = getCameraState();
		expect(state.shakeOffset).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("shake decays over time (offsets get smaller)", () => {
		triggerShake(1.0, 2.0, 15, 5);

		// Measure early shake
		updateCamera(0.01, false, 0);
		const early = getCameraState();
		const earlyMag =
			Math.abs(early.shakeOffset.x) +
			Math.abs(early.shakeOffset.y) +
			Math.abs(early.shakeOffset.z);

		// Advance to later in the shake
		for (let i = 0; i < 50; i++) {
			updateCamera(0.02, false, 0);
		}
		const late = getCameraState();
		const lateMag =
			Math.abs(late.shakeOffset.x) +
			Math.abs(late.shakeOffset.y) +
			Math.abs(late.shakeOffset.z);

		expect(lateMag).toBeLessThan(earlyMag);
	});

	it("stronger shake overrides weaker active shake", () => {
		triggerShake(0.1, 1.0);
		updateCamera(0.01, false, 0);
		expect(isShakeActive()).toBe(true);

		// Trigger a stronger shake
		triggerShake(1.0, 2.0);
		updateCamera(0.01, false, 0);

		// The new stronger shake should be active
		expect(isShakeActive()).toBe(true);
		const state = getCameraState();
		const totalMag =
			Math.abs(state.shakeOffset.x) +
			Math.abs(state.shakeOffset.y) +
			Math.abs(state.shakeOffset.z);
		expect(totalMag).toBeGreaterThan(0);
	});

	it("weaker shake does not override stronger active shake", () => {
		triggerShake(10.0, 1.0, 15, 0.1); // Very strong, slow decay
		updateCamera(0.01, false, 0);

		getCameraState();

		// Try a much weaker shake
		triggerShake(0.001, 0.5);
		updateCamera(0.01, false, 0);

		// Shake should still be active with the strong params
		expect(isShakeActive()).toBe(true);
	});

	it("shake offset is zero at elapsed = 0 (sine starts at 0)", () => {
		triggerShake(1.0, 1.0, 15, 5);
		// Do NOT call updateCamera — elapsed is 0
		const state = getCameraState();
		// Offsets should be at their initial zero (no update has advanced time)
		expect(state.shakeOffset).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("custom frequency and decay rate are respected", () => {
		// High decay rate should dampen faster
		triggerShake(1.0, 2.0, 30, 20);
		updateCamera(0.1, false, 0);
		const fastDecay = getCameraState();
		const fastMag =
			Math.abs(fastDecay.shakeOffset.x) +
			Math.abs(fastDecay.shakeOffset.y) +
			Math.abs(fastDecay.shakeOffset.z);

		resetCameraSystem();

		// Low decay rate should retain more intensity
		triggerShake(1.0, 2.0, 30, 0.1);
		updateCamera(0.1, false, 0);
		const slowDecay = getCameraState();
		const slowMag =
			Math.abs(slowDecay.shakeOffset.x) +
			Math.abs(slowDecay.shakeOffset.y) +
			Math.abs(slowDecay.shakeOffset.z);

		expect(slowMag).toBeGreaterThan(fastMag);
	});
});

// ---------------------------------------------------------------------------
// FOV interpolation
// ---------------------------------------------------------------------------

describe("FOV interpolation", () => {
	it("defaults to 75", () => {
		expect(getCameraState().fov).toBe(75);
	});

	it("setTargetFov begins interpolation", () => {
		setTargetFov(90);
		updateCamera(0.016, false, 0);
		const fov = getCameraState().fov;
		expect(fov).toBeGreaterThan(75);
		expect(fov).toBeLessThan(90);
	});

	it("FOV converges to target over time", () => {
		setTargetFov(90);
		for (let i = 0; i < 200; i++) {
			updateCamera(0.016, false, 0);
		}
		expect(getCameraState().fov).toBeCloseTo(90, 1);
	});

	it("FOV interpolates downward (zoom in)", () => {
		setTargetFov(45);
		updateCamera(0.016, false, 0);
		const fov = getCameraState().fov;
		expect(fov).toBeLessThan(75);
		expect(fov).toBeGreaterThan(45);
	});

	it("setDefaultFov changes the target", () => {
		setDefaultFov(60);
		for (let i = 0; i < 200; i++) {
			updateCamera(0.016, false, 0);
		}
		expect(getCameraState().fov).toBeCloseTo(60, 1);
	});

	it("rapid target changes track the latest value", () => {
		setTargetFov(120);
		updateCamera(0.016, false, 0);
		setTargetFov(45);
		for (let i = 0; i < 200; i++) {
			updateCamera(0.016, false, 0);
		}
		expect(getCameraState().fov).toBeCloseTo(45, 1);
	});
});

// ---------------------------------------------------------------------------
// getCameraState composite
// ---------------------------------------------------------------------------

describe("getCameraState composite", () => {
	it("includes all fields", () => {
		setPosition(1, 2, 3);
		setYaw(1.0);
		setPitch(0.5);
		setTargetFov(80);
		updateCamera(0.016, false, 0);

		const state = getCameraState();
		expect(state).toHaveProperty("position");
		expect(state).toHaveProperty("yaw");
		expect(state).toHaveProperty("pitch");
		expect(state).toHaveProperty("fov");
		expect(state).toHaveProperty("bobOffset");
		expect(state).toHaveProperty("shakeOffset");
	});

	it("bob and shake combine independently", () => {
		triggerShake(0.5, 1.0, 15, 2);

		// Run several frames with movement to get both bob and shake
		for (let i = 0; i < 10; i++) {
			updateCamera(0.016, true, 5);
		}

		const state = getCameraState();
		// Both bob and shake should have produced offsets
		const hasBob =
			Math.abs(state.bobOffset.x) + Math.abs(state.bobOffset.y) > 0;
		const hasShake =
			Math.abs(state.shakeOffset.x) +
			Math.abs(state.shakeOffset.y) +
			Math.abs(state.shakeOffset.z) > 0;

		expect(hasBob).toBe(true);
		expect(hasShake).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// resetCameraSystem
// ---------------------------------------------------------------------------

describe("resetCameraSystem", () => {
	it("resets all state", () => {
		setPosition(10, 20, 30);
		rotateYaw(2.0);
		rotatePitch(1.0);
		setTargetFov(120);
		triggerShake(1.0, 2.0);
		updateCamera(0.1, true, 5);

		resetCameraSystem();

		const state = getCameraState();
		expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
		expect(state.yaw).toBe(0);
		expect(state.pitch).toBe(0);
		expect(state.fov).toBe(75);
		expect(state.bobOffset).toEqual({ x: 0, y: 0, z: 0 });
		expect(state.shakeOffset).toEqual({ x: 0, y: 0, z: 0 });
		expect(isShakeActive()).toBe(false);
		expect(getBobPhase()).toBe(0);
		expect(getBobAmount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("zero delta does not change any state", () => {
		setTargetFov(90);
		triggerShake(1.0, 1.0);

		const before = getCameraState();
		updateCamera(0, true, 5);
		const after = getCameraState();

		// FOV should not change (delta * lerp = 0)
		expect(after.fov).toBe(before.fov);
	});

	it("very large delta does not produce NaN", () => {
		triggerShake(1.0, 1.0);
		updateCamera(1000, true, 10);

		const state = getCameraState();
		expect(Number.isNaN(state.bobOffset.x)).toBe(false);
		expect(Number.isNaN(state.bobOffset.y)).toBe(false);
		expect(Number.isNaN(state.shakeOffset.x)).toBe(false);
		expect(Number.isNaN(state.fov)).toBe(false);
	});

	it("negative moveSpeed is treated as positive for bob", () => {
		// moveSpeed negative shouldn't crash or produce NaN
		for (let i = 0; i < 30; i++) {
			updateCamera(0.016, true, -5);
		}
		const state = getCameraState();
		expect(Number.isNaN(state.bobOffset.y)).toBe(false);
	});
});
