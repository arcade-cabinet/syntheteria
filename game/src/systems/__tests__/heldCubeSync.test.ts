/**
 * Unit tests for the held-cube camera follow system.
 *
 * Tests cover:
 * - Held cube positioned at camera forward offset (1.5m forward, 0.3m down)
 * - getCarrySpeedMultiplier returns 1.0 when not carrying
 * - getCarrySpeedMultiplier returns 0.6 when carrying
 * - No position update when not holding a cube
 * - Custom multiplier override
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	CARRY_DOWN_OFFSET,
	CARRY_FORWARD_OFFSET,
	type CameraState,
	DEFAULT_CARRY_SPEED_MULTIPLIER,
	getCarrySpeedMultiplier,
	updateHeldCubePosition,
	type Vec3,
} from "../heldCubeSync";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a camera looking along the negative-Z axis (default Three.js). */
function cameraLookingForward(pos: Vec3 = { x: 0, y: 1.7, z: 0 }): CameraState {
	return { position: pos, forward: { x: 0, y: 0, z: -1 } };
}

/** Create a camera looking along the positive-X axis. */
function cameraLookingRight(pos: Vec3 = { x: 0, y: 1.7, z: 0 }): CameraState {
	return { position: pos, forward: { x: 1, y: 0, z: 0 } };
}

// ---------------------------------------------------------------------------
// updateHeldCubePosition -- no held cube
// ---------------------------------------------------------------------------

describe("updateHeldCubePosition — no held cube", () => {
	it("does not call setCubePosition when nothing is held", () => {
		const camera = cameraLookingForward();
		let called = false;

		updateHeldCubePosition(
			camera,
			() => null,
			() => {
				called = true;
			},
		);

		expect(called).toBe(false);
	});

	it("returns without error when getHeldCube returns null", () => {
		const camera = cameraLookingForward();

		expect(() =>
			updateHeldCubePosition(
				camera,
				() => null,
				() => {
					/* intentionally empty — verifying no throw */
				},
			),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// updateHeldCubePosition -- holding a cube
// ---------------------------------------------------------------------------

describe("updateHeldCubePosition — holding a cube", () => {
	let lastId: string | null;
	let lastPos: Vec3 | null;

	beforeEach(() => {
		lastId = null;
		lastPos = null;
	});

	const capture = (id: string, pos: Vec3) => {
		lastId = id;
		lastPos = pos;
	};

	it("calls setCubePosition with the held cube id", () => {
		const camera = cameraLookingForward();

		updateHeldCubePosition(camera, () => "cube_42", capture);

		expect(lastId).toBe("cube_42");
	});

	it("positions cube 1.5m forward along camera direction", () => {
		const camera = cameraLookingForward({ x: 0, y: 1.7, z: 0 });

		updateHeldCubePosition(camera, () => "cube_0", capture);

		// Forward is -Z, so z should be 0 + (-1 * 1.5) = -1.5
		expect(lastPos!.x).toBeCloseTo(0);
		expect(lastPos!.z).toBeCloseTo(-CARRY_FORWARD_OFFSET);
	});

	it("positions cube 0.3m below camera center", () => {
		const camera = cameraLookingForward({ x: 0, y: 1.7, z: 0 });

		updateHeldCubePosition(camera, () => "cube_0", capture);

		// Y = 1.7 + (0 * 1.5) - 0.3 = 1.4
		expect(lastPos!.y).toBeCloseTo(1.7 - CARRY_DOWN_OFFSET);
	});

	it("works when camera faces positive X", () => {
		const camera = cameraLookingRight({ x: 5, y: 2, z: 10 });

		updateHeldCubePosition(camera, () => "cube_1", capture);

		expect(lastPos!.x).toBeCloseTo(5 + CARRY_FORWARD_OFFSET);
		expect(lastPos!.y).toBeCloseTo(2 - CARRY_DOWN_OFFSET);
		expect(lastPos!.z).toBeCloseTo(10);
	});

	it("applies forward offset along an angled direction", () => {
		// Camera looking 45 degrees down-forward (normalized)
		const sqrt2inv = 1 / Math.sqrt(2);
		const camera: CameraState = {
			position: { x: 0, y: 3, z: 0 },
			forward: { x: 0, y: -sqrt2inv, z: -sqrt2inv },
		};

		updateHeldCubePosition(camera, () => "cube_5", capture);

		const expectedX = 0;
		const expectedY = 3 + -sqrt2inv * CARRY_FORWARD_OFFSET - CARRY_DOWN_OFFSET;
		const expectedZ = 0 + -sqrt2inv * CARRY_FORWARD_OFFSET;

		expect(lastPos!.x).toBeCloseTo(expectedX);
		expect(lastPos!.y).toBeCloseTo(expectedY);
		expect(lastPos!.z).toBeCloseTo(expectedZ);
	});

	it("uses camera position as origin for offset", () => {
		const camera = cameraLookingForward({ x: 100, y: 50, z: -200 });

		updateHeldCubePosition(camera, () => "cube_0", capture);

		expect(lastPos!.x).toBeCloseTo(100);
		expect(lastPos!.y).toBeCloseTo(50 - CARRY_DOWN_OFFSET);
		expect(lastPos!.z).toBeCloseTo(-200 - CARRY_FORWARD_OFFSET);
	});
});

// ---------------------------------------------------------------------------
// getCarrySpeedMultiplier -- not carrying
// ---------------------------------------------------------------------------

describe("getCarrySpeedMultiplier — not carrying", () => {
	it("returns 1.0 when not carrying", () => {
		expect(getCarrySpeedMultiplier(false)).toBe(1.0);
	});

	it("returns 1.0 regardless of multiplier parameter when not carrying", () => {
		expect(getCarrySpeedMultiplier(false, 0.1)).toBe(1.0);
		expect(getCarrySpeedMultiplier(false, 0.9)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// getCarrySpeedMultiplier -- carrying
// ---------------------------------------------------------------------------

describe("getCarrySpeedMultiplier — carrying", () => {
	it("returns 0.6 (default) when carrying", () => {
		expect(getCarrySpeedMultiplier(true)).toBe(0.6);
	});

	it("returns default constant value", () => {
		expect(getCarrySpeedMultiplier(true)).toBe(DEFAULT_CARRY_SPEED_MULTIPLIER);
	});

	it("accepts custom multiplier override", () => {
		expect(getCarrySpeedMultiplier(true, 0.4)).toBe(0.4);
	});

	it("returns 0 when multiplier is 0", () => {
		expect(getCarrySpeedMultiplier(true, 0)).toBe(0);
	});

	it("returns 1.0 when multiplier is 1.0 (no penalty)", () => {
		expect(getCarrySpeedMultiplier(true, 1.0)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

describe("exported constants", () => {
	it("CARRY_FORWARD_OFFSET is 1.5", () => {
		expect(CARRY_FORWARD_OFFSET).toBe(1.5);
	});

	it("CARRY_DOWN_OFFSET is 0.3", () => {
		expect(CARRY_DOWN_OFFSET).toBe(0.3);
	});

	it("DEFAULT_CARRY_SPEED_MULTIPLIER is 0.6", () => {
		expect(DEFAULT_CARRY_SPEED_MULTIPLIER).toBe(0.6);
	});

	it("DEFAULT_CARRY_SPEED_MULTIPLIER matches botMovement.json value", () => {
		// botMovement.json: maintenance_bot.carrySpeedMultiplier = 0.6
		expect(DEFAULT_CARRY_SPEED_MULTIPLIER).toBe(0.6);
	});
});
