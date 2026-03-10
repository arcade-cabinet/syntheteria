/**
 * Unit tests for the grabber system (pick up, drop, throw cubes).
 *
 * Tests cover:
 * - grabCube returns false if cube not Grabbable
 * - grabCube returns false if out of reach (>2.0m)
 * - grabCube returns false if already holding a cube
 * - grabCube creates HeldBy relation on success, body to Kinematic
 * - dropCube removes HeldBy, body to Dynamic
 * - throwCube removes HeldBy, body to Dynamic, applies impulse
 * - getHeldCube returns held cube ID or null
 * - Module state resets between tests
 */

import {
	_resetGrabberState,
	type CubeEntity,
	dropCube,
	getCube,
	getHeldCube,
	grabCube,
	registerCube,
	throwCube,
	unregisterCube,
	type Vec3,
} from "../grabber";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Vec3. */
function vec3(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

/** Create a grabbable cube entity at a given position. */
function makeGrabbableCube(
	id: string,
	position: Vec3 = vec3(),
	material = "iron",
): CubeEntity {
	return {
		id,
		position: { ...position },
		traits: ["Grabbable"],
		material,
	};
}

/** Create a cube entity WITHOUT the Grabbable trait. */
function makeNonGrabbableCube(
	id: string,
	position: Vec3 = vec3(),
	material = "iron",
): CubeEntity {
	return {
		id,
		position: { ...position },
		traits: [],
		material,
	};
}

/** Player origin position. */
const PLAYER_ORIGIN = vec3(0, 0, 0);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetGrabberState();
});

// ---------------------------------------------------------------------------
// grabCube -- Grabbable trait check
// ---------------------------------------------------------------------------

describe("grabCube — Grabbable trait check", () => {
	it("returns false if cube does not have Grabbable trait", () => {
		const cube = makeNonGrabbableCube("cube_0");
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("returns false if cube ID is not registered", () => {
		const result = grabCube("nonexistent", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("does not modify traits when grab fails due to missing Grabbable", () => {
		const cube = makeNonGrabbableCube("cube_0");
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);

		const stored = getCube("cube_0");
		expect(stored!.traits).not.toContain("HeldBy");
		expect(stored!.traits).not.toContain("Grabbable");
	});
});

// ---------------------------------------------------------------------------
// grabCube -- distance check
// ---------------------------------------------------------------------------

describe("grabCube — distance check", () => {
	it("returns false if cube is more than 2.0m away", () => {
		const cube = makeGrabbableCube("cube_0", vec3(3, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("returns false if cube is exactly at 2.0m + epsilon", () => {
		// Distance = sqrt(2.001^2) = 2.001 > 2.0
		const cube = makeGrabbableCube("cube_0", vec3(2.001, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("returns true if cube is exactly at 2.0m", () => {
		const cube = makeGrabbableCube("cube_0", vec3(2.0, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(true);
	});

	it("returns true if cube is within reach", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1.0, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(true);
	});

	it("returns true if cube is at same position as player", () => {
		const cube = makeGrabbableCube("cube_0", vec3(0, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(true);
	});

	it("checks 3D distance, not just one axis", () => {
		// Distance = sqrt(1.2^2 + 1.2^2 + 1.2^2) = ~2.078 > 2.0
		const cube = makeGrabbableCube("cube_0", vec3(1.2, 1.2, 1.2));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("does not modify traits when out of reach", () => {
		const cube = makeGrabbableCube("cube_0", vec3(5, 0, 0));
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);

		const stored = getCube("cube_0");
		expect(stored!.traits).toContain("Grabbable");
		expect(stored!.traits).not.toContain("HeldBy");
	});
});

// ---------------------------------------------------------------------------
// grabCube -- already holding
// ---------------------------------------------------------------------------

describe("grabCube — already holding a cube", () => {
	it("returns false if player is already holding a cube", () => {
		const cube1 = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		const cube2 = makeGrabbableCube("cube_1", vec3(1, 0, 0));
		registerCube(cube1);
		registerCube(cube2);

		grabCube("cube_0", PLAYER_ORIGIN);
		const result = grabCube("cube_1", PLAYER_ORIGIN);

		expect(result).toBe(false);
	});

	it("does not modify second cube traits when already holding", () => {
		const cube1 = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		const cube2 = makeGrabbableCube("cube_1", vec3(1, 0, 0));
		registerCube(cube1);
		registerCube(cube2);

		grabCube("cube_0", PLAYER_ORIGIN);
		grabCube("cube_1", PLAYER_ORIGIN);

		const stored = getCube("cube_1");
		expect(stored!.traits).toContain("Grabbable");
		expect(stored!.traits).not.toContain("HeldBy");
	});
});

// ---------------------------------------------------------------------------
// grabCube -- success
// ---------------------------------------------------------------------------

describe("grabCube — successful grab", () => {
	it("returns true when all conditions are met", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(true);
	});

	it("adds HeldBy trait to the cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);

		const stored = getCube("cube_0");
		expect(stored!.traits).toContain("HeldBy");
	});

	it("removes Grabbable trait from the cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);

		const stored = getCube("cube_0");
		expect(stored!.traits).not.toContain("Grabbable");
	});

	it("sets heldCubeId to the grabbed cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);

		expect(getHeldCube()).toBe("cube_0");
	});

	it("calls setKinematic callback with cube ID", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		const setKinematic = jest.fn();

		grabCube("cube_0", PLAYER_ORIGIN, { setKinematic });

		expect(setKinematic).toHaveBeenCalledTimes(1);
		expect(setKinematic).toHaveBeenCalledWith("cube_0");
	});

	it("does not crash when no callbacks provided", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		expect(() => grabCube("cube_0", PLAYER_ORIGIN)).not.toThrow();
	});

	it("does not call setKinematic when grab fails", () => {
		const cube = makeGrabbableCube("cube_0", vec3(5, 0, 0)); // out of reach
		registerCube(cube);
		const setKinematic = jest.fn();

		grabCube("cube_0", PLAYER_ORIGIN, { setKinematic });

		expect(setKinematic).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// dropCube
// ---------------------------------------------------------------------------

describe("dropCube", () => {
	it("returns false if not holding a cube", () => {
		const result = dropCube(vec3(0, 0, 0));

		expect(result).toBe(false);
	});

	it("returns true when holding a cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		const result = dropCube(vec3(2, 0, 0));

		expect(result).toBe(true);
	});

	it("removes HeldBy trait from cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		dropCube(vec3(2, 0, 0));

		const stored = getCube("cube_0");
		expect(stored!.traits).not.toContain("HeldBy");
	});

	it("restores Grabbable trait to cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		dropCube(vec3(2, 0, 0));

		const stored = getCube("cube_0");
		expect(stored!.traits).toContain("Grabbable");
	});

	it("sets cube position to dropPosition", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		dropCube(vec3(5, 1, 3));

		const stored = getCube("cube_0");
		expect(stored!.position).toEqual({ x: 5, y: 1, z: 3 });
	});

	it("clears heldCubeId", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		dropCube(vec3(2, 0, 0));

		expect(getHeldCube()).toBeNull();
	});

	it("calls setDynamic callback with cube ID", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		const setDynamic = jest.fn();

		dropCube(vec3(2, 0, 0), { setDynamic });

		expect(setDynamic).toHaveBeenCalledTimes(1);
		expect(setDynamic).toHaveBeenCalledWith("cube_0");
	});

	it("does not crash when no callbacks provided", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		expect(() => dropCube(vec3(2, 0, 0))).not.toThrow();
	});

	it("allows grabbing another cube after drop", () => {
		const cube1 = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		const cube2 = makeGrabbableCube("cube_1", vec3(1, 0, 0));
		registerCube(cube1);
		registerCube(cube2);

		grabCube("cube_0", PLAYER_ORIGIN);
		dropCube(vec3(3, 0, 0));
		const result = grabCube("cube_1", PLAYER_ORIGIN);

		expect(result).toBe(true);
		expect(getHeldCube()).toBe("cube_1");
	});

	it("can re-grab a dropped cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);

		grabCube("cube_0", PLAYER_ORIGIN);
		// Use snapToStack: false to skip stacking, which removes Grabbable
		dropCube(vec3(1, 0, 0), undefined, { snapToStack: false });
		const result = grabCube("cube_0", PLAYER_ORIGIN);

		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// throwCube
// ---------------------------------------------------------------------------

describe("throwCube", () => {
	it("returns false if not holding a cube", () => {
		const result = throwCube(vec3(1, 0, 0), 10);

		expect(result).toBe(false);
	});

	it("returns true when holding a cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		const result = throwCube(vec3(1, 0, 0), 10);

		expect(result).toBe(true);
	});

	it("removes HeldBy trait from cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		throwCube(vec3(1, 0, 0), 10);

		const stored = getCube("cube_0");
		expect(stored!.traits).not.toContain("HeldBy");
	});

	it("restores Grabbable trait to cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		throwCube(vec3(1, 0, 0), 10);

		const stored = getCube("cube_0");
		expect(stored!.traits).toContain("Grabbable");
	});

	it("clears heldCubeId", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		throwCube(vec3(1, 0, 0), 10);

		expect(getHeldCube()).toBeNull();
	});

	it("calls setDynamic callback with cube ID", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		const setDynamic = jest.fn();

		throwCube(vec3(1, 0, 0), 10, { setDynamic });

		expect(setDynamic).toHaveBeenCalledTimes(1);
		expect(setDynamic).toHaveBeenCalledWith("cube_0");
	});

	it("calls applyImpulse with direction * force", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		const applyImpulse = jest.fn();

		throwCube(vec3(1, 0, 0), 10, { applyImpulse });

		expect(applyImpulse).toHaveBeenCalledTimes(1);
		expect(applyImpulse).toHaveBeenCalledWith("cube_0", {
			x: 10,
			y: 0,
			z: 0,
		});
	});

	it("applies impulse with correct direction scaling", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		const applyImpulse = jest.fn();

		throwCube(vec3(0, 1, 0.5), 20, { applyImpulse });

		expect(applyImpulse).toHaveBeenCalledWith("cube_0", {
			x: 0,
			y: 20,
			z: 10,
		});
	});

	it("does not crash when no callbacks provided", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		expect(() => throwCube(vec3(1, 0, 0), 10)).not.toThrow();
	});

	it("allows grabbing another cube after throw", () => {
		const cube1 = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		const cube2 = makeGrabbableCube("cube_1", vec3(1, 0, 0));
		registerCube(cube1);
		registerCube(cube2);

		grabCube("cube_0", PLAYER_ORIGIN);
		throwCube(vec3(1, 0, 0), 10);
		const result = grabCube("cube_1", PLAYER_ORIGIN);

		expect(result).toBe(true);
		expect(getHeldCube()).toBe("cube_1");
	});
});

// ---------------------------------------------------------------------------
// getHeldCube
// ---------------------------------------------------------------------------

describe("getHeldCube", () => {
	it("returns null when not holding anything", () => {
		expect(getHeldCube()).toBeNull();
	});

	it("returns cube ID when holding a cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		expect(getHeldCube()).toBe("cube_0");
	});

	it("returns null after dropping", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		dropCube(vec3(2, 0, 0));

		expect(getHeldCube()).toBeNull();
	});

	it("returns null after throwing", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);
		throwCube(vec3(1, 0, 0), 10);

		expect(getHeldCube()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("cube registry", () => {
	it("registerCube stores a defensive copy", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 2, 3));
		registerCube(cube);

		cube.position.x = 999;
		cube.traits.push("Tampered");

		const stored = getCube("cube_0");
		expect(stored!.position.x).toBe(1);
		expect(stored!.traits).not.toContain("Tampered");
	});

	it("unregisterCube removes cube from registry", () => {
		const cube = makeGrabbableCube("cube_0");
		registerCube(cube);

		unregisterCube("cube_0");

		expect(getCube("cube_0")).toBeUndefined();
	});

	it("unregisterCube clears heldCubeId if held cube is unregistered", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		unregisterCube("cube_0");

		expect(getHeldCube()).toBeNull();
	});

	it("getCube returns undefined for unknown ID", () => {
		expect(getCube("nonexistent")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// _resetGrabberState
// ---------------------------------------------------------------------------

describe("_resetGrabberState", () => {
	it("clears held cube", () => {
		const cube = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube);
		grabCube("cube_0", PLAYER_ORIGIN);

		_resetGrabberState();

		expect(getHeldCube()).toBeNull();
	});

	it("clears cube registry", () => {
		const cube = makeGrabbableCube("cube_0");
		registerCube(cube);

		_resetGrabberState();

		expect(getCube("cube_0")).toBeUndefined();
	});

	it("allows fresh state after reset", () => {
		const cube1 = makeGrabbableCube("cube_0", vec3(1, 0, 0));
		registerCube(cube1);
		grabCube("cube_0", PLAYER_ORIGIN);

		_resetGrabberState();

		const cube2 = makeGrabbableCube("cube_1", vec3(1, 0, 0));
		registerCube(cube2);
		const result = grabCube("cube_1", PLAYER_ORIGIN);

		expect(result).toBe(true);
		expect(getHeldCube()).toBe("cube_1");
	});
});
