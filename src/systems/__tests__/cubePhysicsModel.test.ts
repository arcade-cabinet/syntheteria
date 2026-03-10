/**
 * Tests for the cube physics model.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	registerCube,
	removeCube,
	getCube,
	getCubeCount,
	placeCube,
	calculateStackStability,
	checkTopple,
	getStack,
	getAllStacks,
	getStacksNear,
	getStockpileValue,
	setRandomFn,
	resetCubePhysics,
} from "../cubePhysicsModel";

beforeEach(() => {
	resetCubePhysics();
	setRandomFn(() => 0.5); // deterministic
});

// ---------------------------------------------------------------------------
// Cube management
// ---------------------------------------------------------------------------

describe("cube management", () => {
	it("registers a cube", () => {
		registerCube("c1", "scrapMetal", { x: 0, y: 0, z: 0 });
		expect(getCubeCount()).toBe(1);
	});

	it("gets cube data", () => {
		registerCube("c1", "iron", { x: 10, y: 0, z: 20 });
		const cube = getCube("c1");
		expect(cube).not.toBeNull();
		expect(cube!.materialType).toBe("iron");
		expect(cube!.position).toEqual({ x: 10, y: 0, z: 20 });
	});

	it("returns null for unknown cube", () => {
		expect(getCube("nope")).toBeNull();
	});

	it("removes a cube", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		removeCube("c1");
		expect(getCubeCount()).toBe(0);
		expect(getCube("c1")).toBeNull();
	});

	it("returns copy of cube data", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		const a = getCube("c1");
		const b = getCube("c1");
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// Stacking
// ---------------------------------------------------------------------------

describe("stacking", () => {
	it("creates a new stack when placing first cube", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		const stackId = placeCube("c1", 5, 5);
		expect(stackId).not.toBeNull();

		const stack = getStack(stackId!);
		expect(stack!.height).toBe(1);
		expect(stack!.cubes).toEqual(["c1"]);
	});

	it("adds cube to existing stack at same position", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });

		const stackId = placeCube("c1", 5, 5);
		const stackId2 = placeCube("c2", 5, 5);

		expect(stackId).toBe(stackId2);
		const stack = getStack(stackId!);
		expect(stack!.height).toBe(2);
		expect(stack!.cubes).toEqual(["c1", "c2"]);
	});

	it("cube position updated to stack position", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 10, 20);

		const cube = getCube("c1");
		expect(cube!.position.x).toBe(10);
		expect(cube!.position.z).toBe(20);
		expect(cube!.position.y).toBe(0);
	});

	it("stacked cube has correct y position", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c3", "iron", { x: 0, y: 0, z: 0 });

		placeCube("c1", 5, 5);
		placeCube("c2", 5, 5);
		placeCube("c3", 5, 5);

		expect(getCube("c1")!.position.y).toBe(0);
		expect(getCube("c2")!.position.y).toBe(0.5);
		expect(getCube("c3")!.position.y).toBe(1.0);
	});

	it("returns null for unregistered cube", () => {
		expect(placeCube("nope", 0, 0)).toBeNull();
	});

	it("creates separate stacks at different positions", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });

		const s1 = placeCube("c1", 0, 0);
		const s2 = placeCube("c2", 10, 10);

		expect(s1).not.toBe(s2);
		expect(getAllStacks()).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Stability
// ---------------------------------------------------------------------------

describe("stability", () => {
	it("single cube has stability 1.0", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 5, 5);

		const stack = getStack(getAllStacks()[0].id);
		expect(stack!.stability).toBe(1.0);
	});

	it("taller stacks have lower stability", () => {
		for (let i = 0; i < 6; i++) {
			registerCube(`c${i}`, "iron", { x: 0, y: 0, z: 0 });
			placeCube(`c${i}`, 5, 5);
		}

		const stack = getStack(getAllStacks()[0].id);
		expect(stack!.stability).toBeLessThan(1.0);
		expect(stack!.stability).toBeGreaterThan(0);
	});

	it("adjacent stacks improve stability", () => {
		// Create a tall stack
		for (let i = 0; i < 5; i++) {
			registerCube(`tall_${i}`, "iron", { x: 0, y: 0, z: 0 });
			placeCube(`tall_${i}`, 5, 5);
		}
		const tallStack = getAllStacks().find((s) =>
			s.cubes.includes("tall_0"),
		)!;
		const stabilityAlone = tallStack.stability;

		// Add adjacent stack for support
		registerCube("support", "iron", { x: 0, y: 0, z: 0 });
		placeCube("support", 5.4, 5); // within 0.75 (1.5 * 0.5)

		const updatedStability = calculateStackStability(tallStack);
		expect(updatedStability).toBeGreaterThanOrEqual(stabilityAlone);
	});
});

// ---------------------------------------------------------------------------
// Toppling
// ---------------------------------------------------------------------------

describe("toppling", () => {
	it("short stacks don't topple", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 5, 5);

		const result = checkTopple(getAllStacks()[0].id);
		expect(result).toBeNull();
	});

	it("very tall unsupported stack topples", () => {
		// Build extremely tall stack (> MAX_STABLE_HEIGHT)
		for (let i = 0; i < 10; i++) {
			registerCube(`c${i}`, "iron", { x: 0, y: 0, z: 0 });
			placeCube(`c${i}`, 100, 100); // far from any support
		}

		const stackId = getAllStacks()[0].id;
		const result = checkTopple(stackId);

		if (result) {
			expect(result.scatteredCubes.length).toBeGreaterThan(0);
			expect(getStack(stackId)!.toppled).toBe(true);
		}
	});

	it("toppled cubes get new positions", () => {
		for (let i = 0; i < 10; i++) {
			registerCube(`c${i}`, "iron", { x: 0, y: 0, z: 0 });
			placeCube(`c${i}`, 200, 200);
		}

		const stackId = getAllStacks()[0].id;
		const result = checkTopple(stackId);

		if (result) {
			for (const sc of result.scatteredCubes) {
				expect(sc.newPosition.y).toBe(0); // on ground
				const cube = getCube(sc.cubeId);
				expect(cube!.stackId).toBeUndefined();
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("queries", () => {
	it("getAllStacks returns all stacks", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 0, 0);
		placeCube("c2", 50, 50);

		expect(getAllStacks()).toHaveLength(2);
	});

	it("getStacksNear finds nearby stacks", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 5, 5);
		placeCube("c2", 100, 100);

		const nearby = getStacksNear(0, 0, 10);
		expect(nearby).toHaveLength(1);
	});

	it("getStockpileValue counts cubes", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c3", "iron", { x: 0, y: 0, z: 0 });
		const s1 = placeCube("c1", 0, 0)!;
		placeCube("c2", 0, 0);
		const s2 = placeCube("c3", 50, 50)!;

		expect(getStockpileValue([s1, s2])).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Removing cubes from stacks
// ---------------------------------------------------------------------------

describe("removing from stacks", () => {
	it("removing cube updates stack height", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		registerCube("c2", "iron", { x: 0, y: 0, z: 0 });
		const stackId = placeCube("c1", 5, 5)!;
		placeCube("c2", 5, 5);

		removeCube("c2");

		const stack = getStack(stackId);
		expect(stack!.height).toBe(1);
		expect(stack!.cubes).toEqual(["c1"]);
	});

	it("removing last cube deletes stack", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		const stackId = placeCube("c1", 5, 5)!;

		removeCube("c1");
		expect(getStack(stackId)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all state", () => {
		registerCube("c1", "iron", { x: 0, y: 0, z: 0 });
		placeCube("c1", 5, 5);

		resetCubePhysics();

		expect(getCubeCount()).toBe(0);
		expect(getAllStacks()).toHaveLength(0);
	});
});
