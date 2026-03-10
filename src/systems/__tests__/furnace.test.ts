/**
 * Unit tests for the Furnace entity and hopper input system.
 *
 * Tests cover:
 * - createFurnace spawns entity with correct initial state
 * - Rapier physics body creation via callback
 * - insertCubeIntoFurnace adds material to hopper queue
 * - Hopper rejects inserts when full (5 max)
 * - Cube entity removal via callback on insert
 * - getFurnaceState returns correct snapshot
 * - getAllFurnaces and getFurnace lookups
 * - Module state reset between tests
 */

import {
	_resetFurnaceState,
	createFurnace,
	getAllFurnaces,
	getFurnace,
	getFurnaceState,
	insertCubeIntoFurnace,
} from "../furnace";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePosition(
	x = 0,
	y = 0,
	z = 0,
): { x: number; y: number; z: number } {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetFurnaceState();
});

// ---------------------------------------------------------------------------
// createFurnace -- basic creation
// ---------------------------------------------------------------------------

describe("createFurnace", () => {
	it("creates furnace with correct position", () => {
		const furnace = createFurnace(makePosition(10, 0, 20));

		expect(furnace.position).toEqual({ x: 10, y: 0, z: 20 });
	});

	it("creates furnace with empty hopper", () => {
		const furnace = createFurnace(makePosition());

		expect(furnace.hopperQueue).toEqual([]);
		expect(furnace.maxHopperSize).toBe(5);
	});

	it("creates furnace not processing and powered by default", () => {
		const furnace = createFurnace(makePosition());

		expect(furnace.isProcessing).toBe(false);
		expect(furnace.currentItem).toBeNull();
		expect(furnace.progress).toBe(0);
		expect(furnace.isPowered).toBe(true);
	});

	it("assigns unique IDs to each furnace", () => {
		const f1 = createFurnace(makePosition());
		const f2 = createFurnace(makePosition(5, 0, 5));

		expect(f1.id).not.toBe(f2.id);
		expect(f1.id).toMatch(/^furnace_/);
		expect(f2.id).toMatch(/^furnace_/);
	});

	it("registers furnace in module store", () => {
		const furnace = createFurnace(makePosition(3, 0, 7));

		expect(getFurnace(furnace.id)).toBe(furnace);
		expect(getAllFurnaces()).toHaveLength(1);
	});

	it("accepts custom maxHopperSize", () => {
		const furnace = createFurnace(makePosition(), undefined, 10);

		expect(furnace.maxHopperSize).toBe(10);
	});

	it("copies position to avoid external mutation", () => {
		const pos = makePosition(1, 2, 3);
		const furnace = createFurnace(pos);

		pos.x = 999;
		expect(furnace.position.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// createFurnace -- Rapier physics body
// ---------------------------------------------------------------------------

describe("physics body creation", () => {
	it("calls createPhysicsBody callback with position", () => {
		const mockCreateBody = jest.fn();
		const pos = makePosition(5, 0, 10);

		createFurnace(pos, mockCreateBody);

		expect(mockCreateBody).toHaveBeenCalledTimes(1);
		expect(mockCreateBody).toHaveBeenCalledWith(
			expect.objectContaining({ x: 5, y: 0, z: 10 }),
		);
	});

	it("does not crash when no physics callback provided", () => {
		expect(() => createFurnace(makePosition())).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// insertCubeIntoFurnace -- hopper input
// ---------------------------------------------------------------------------

describe("insertCubeIntoFurnace", () => {
	it("adds material to hopper queue", () => {
		const furnace = createFurnace(makePosition());

		const result = insertCubeIntoFurnace(
			furnace.id,
			"cube_1",
			"scrap_iron",
		);

		expect(result).toBe(true);
		expect(furnace.hopperQueue).toEqual(["scrap_iron"]);
	});

	it("adds multiple materials to hopper in order", () => {
		const furnace = createFurnace(makePosition());

		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");
		insertCubeIntoFurnace(furnace.id, "cube_2", "copper");
		insertCubeIntoFurnace(furnace.id, "cube_3", "silicon");

		expect(furnace.hopperQueue).toEqual(["scrap_iron", "copper", "silicon"]);
	});

	it("returns false when hopper is full (5 max)", () => {
		const furnace = createFurnace(makePosition());

		// Fill hopper to max
		for (let i = 0; i < 5; i++) {
			const result = insertCubeIntoFurnace(
				furnace.id,
				`cube_${i}`,
				"scrap_iron",
			);
			expect(result).toBe(true);
		}

		// 6th insert should fail
		const result = insertCubeIntoFurnace(
			furnace.id,
			"cube_5",
			"scrap_iron",
		);
		expect(result).toBe(false);
		expect(furnace.hopperQueue).toHaveLength(5);
	});

	it("returns false for unknown furnace ID", () => {
		const result = insertCubeIntoFurnace(
			"nonexistent",
			"cube_1",
			"scrap_iron",
		);
		expect(result).toBe(false);
	});

	it("calls removeCubeCallback on successful insert", () => {
		const furnace = createFurnace(makePosition());
		const removeCube = jest.fn();

		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron", removeCube);

		expect(removeCube).toHaveBeenCalledTimes(1);
	});

	it("does not call removeCubeCallback when hopper is full", () => {
		const furnace = createFurnace(makePosition());
		const removeCube = jest.fn();

		// Fill hopper
		for (let i = 0; i < 5; i++) {
			insertCubeIntoFurnace(furnace.id, `cube_${i}`, "scrap_iron");
		}

		// Attempt to insert when full
		insertCubeIntoFurnace(furnace.id, "cube_5", "scrap_iron", removeCube);

		expect(removeCube).not.toHaveBeenCalled();
	});

	it("does not crash when no removeCubeCallback provided", () => {
		const furnace = createFurnace(makePosition());

		expect(() =>
			insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron"),
		).not.toThrow();
	});

	it("respects custom maxHopperSize", () => {
		const furnace = createFurnace(makePosition(), undefined, 2);

		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");
		insertCubeIntoFurnace(furnace.id, "cube_2", "copper");
		const result = insertCubeIntoFurnace(
			furnace.id,
			"cube_3",
			"silicon",
		);

		expect(result).toBe(false);
		expect(furnace.hopperQueue).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// getFurnaceState -- state snapshot
// ---------------------------------------------------------------------------

describe("getFurnaceState", () => {
	it("returns correct state for empty furnace", () => {
		const furnace = createFurnace(makePosition(1, 2, 3));

		const state = getFurnaceState(furnace.id);

		expect(state).not.toBeNull();
		expect(state!.id).toBe(furnace.id);
		expect(state!.hopperContents).toEqual([]);
		expect(state!.hopperSize).toBe(0);
		expect(state!.maxHopperSize).toBe(5);
		expect(state!.isProcessing).toBe(false);
		expect(state!.currentItem).toBeNull();
		expect(state!.progress).toBe(0);
		expect(state!.isPowered).toBe(true);
	});

	it("returns correct state after inserting cubes", () => {
		const furnace = createFurnace(makePosition());

		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");
		insertCubeIntoFurnace(furnace.id, "cube_2", "copper");

		const state = getFurnaceState(furnace.id);

		expect(state!.hopperContents).toEqual(["scrap_iron", "copper"]);
		expect(state!.hopperSize).toBe(2);
	});

	it("returns null for unknown furnace ID", () => {
		const state = getFurnaceState("nonexistent");
		expect(state).toBeNull();
	});

	it("returns a defensive copy of hopper contents", () => {
		const furnace = createFurnace(makePosition());
		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");

		const state = getFurnaceState(furnace.id);
		state!.hopperContents.push("tampered");

		// Original should be unaffected
		expect(furnace.hopperQueue).toEqual(["scrap_iron"]);
	});
});

// ---------------------------------------------------------------------------
// getAllFurnaces / getFurnace
// ---------------------------------------------------------------------------

describe("getAllFurnaces", () => {
	it("returns empty array when no furnaces exist", () => {
		expect(getAllFurnaces()).toEqual([]);
	});

	it("returns all created furnaces", () => {
		createFurnace(makePosition(0, 0, 0));
		createFurnace(makePosition(10, 0, 10));
		createFurnace(makePosition(20, 0, 20));

		expect(getAllFurnaces()).toHaveLength(3);
	});
});

describe("getFurnace", () => {
	it("returns undefined for unknown ID", () => {
		expect(getFurnace("nonexistent")).toBeUndefined();
	});

	it("returns the furnace data for a valid ID", () => {
		const furnace = createFurnace(makePosition(5, 0, 5));

		expect(getFurnace(furnace.id)).toBe(furnace);
	});
});

// ---------------------------------------------------------------------------
// Module state -- reset
// ---------------------------------------------------------------------------

describe("_resetFurnaceState", () => {
	it("clears all furnaces from the store", () => {
		createFurnace(makePosition());
		createFurnace(makePosition(10, 0, 10));

		expect(getAllFurnaces()).toHaveLength(2);

		_resetFurnaceState();

		expect(getAllFurnaces()).toHaveLength(0);
	});

	it("resets ID counter so new furnaces start from 0", () => {
		createFurnace(makePosition());

		_resetFurnaceState();

		const furnace = createFurnace(makePosition());
		expect(furnace.id).toBe("furnace_0");
	});
});
