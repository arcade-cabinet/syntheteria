/**
 * Tests for the spatial index system.
 *
 * Tests cover:
 * - Entity insertion and removal
 * - Radius queries return correct entities
 * - Rectangle queries
 * - Nearest entity query
 * - Cell transitions when entities move
 * - Empty grid queries
 * - Large entity counts
 * - Edge cases (zero radius, entity at exact boundary)
 * - Custom cell sizes
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	updateEntity,
	removeEntity,
	queryRadius,
	queryNearest,
	queryRect,
	getEntityCount,
	getCellCount,
	hasEntity,
	getEntityPosition,
	setCellSize,
	getCellSize,
	resetSpatialIndex,
} from "../spatialIndex";

beforeEach(() => {
	resetSpatialIndex();
});

// ---------------------------------------------------------------------------
// Entity management
// ---------------------------------------------------------------------------

describe("entity management", () => {
	it("inserts an entity", () => {
		updateEntity("bot1", 10, 20);
		expect(hasEntity("bot1")).toBe(true);
		expect(getEntityCount()).toBe(1);
	});

	it("removes an entity", () => {
		updateEntity("bot1", 10, 20);
		removeEntity("bot1");
		expect(hasEntity("bot1")).toBe(false);
		expect(getEntityCount()).toBe(0);
	});

	it("removes nonexistent entity without error", () => {
		expect(() => removeEntity("nope")).not.toThrow();
	});

	it("tracks entity position", () => {
		updateEntity("bot1", 10, 20);
		expect(getEntityPosition("bot1")).toEqual({ x: 10, z: 20 });
	});

	it("returns null for unknown entity position", () => {
		expect(getEntityPosition("nope")).toBeNull();
	});

	it("updates entity position", () => {
		updateEntity("bot1", 10, 20);
		updateEntity("bot1", 30, 40);
		expect(getEntityPosition("bot1")).toEqual({ x: 30, z: 40 });
	});

	it("tracks multiple entities", () => {
		updateEntity("a", 0, 0);
		updateEntity("b", 100, 100);
		updateEntity("c", 200, 200);
		expect(getEntityCount()).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Cell management
// ---------------------------------------------------------------------------

describe("cell management", () => {
	it("entities in same cell share one cell", () => {
		setCellSize(100);
		updateEntity("a", 10, 10);
		updateEntity("b", 20, 20);
		expect(getCellCount()).toBe(1);
	});

	it("entities in different cells use different cells", () => {
		setCellSize(10);
		updateEntity("a", 5, 5);
		updateEntity("b", 15, 15);
		expect(getCellCount()).toBe(2);
	});

	it("moving entity across cell boundary updates cells", () => {
		setCellSize(10);
		updateEntity("a", 5, 5); // cell (0,0)
		expect(getCellCount()).toBe(1);

		updateEntity("a", 15, 5); // cell (1,0)
		expect(getCellCount()).toBe(1); // old cell removed, new cell created
	});

	it("removing last entity from cell cleans up", () => {
		updateEntity("a", 5, 5);
		expect(getCellCount()).toBe(1);
		removeEntity("a");
		expect(getCellCount()).toBe(0);
	});

	it("custom cell size", () => {
		setCellSize(50);
		expect(getCellSize()).toBe(50);
	});

	it("minimum cell size is 1", () => {
		setCellSize(0);
		expect(getCellSize()).toBe(1);
		setCellSize(-5);
		expect(getCellSize()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Radius queries
// ---------------------------------------------------------------------------

describe("queryRadius", () => {
	it("finds entities within radius", () => {
		updateEntity("a", 10, 10);
		updateEntity("b", 12, 10);
		updateEntity("c", 100, 100);

		const results = queryRadius(10, 10, 5);
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.id)).toContain("a");
		expect(results.map((r) => r.id)).toContain("b");
	});

	it("excludes entities outside radius", () => {
		updateEntity("a", 10, 10);
		updateEntity("far", 100, 100);

		const results = queryRadius(10, 10, 5);
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe("a");
	});

	it("returns sorted by distance (closest first)", () => {
		updateEntity("far", 10, 0);
		updateEntity("near", 3, 0);
		updateEntity("mid", 6, 0);

		const results = queryRadius(0, 0, 20);
		expect(results.map((r) => r.id)).toEqual(["near", "mid", "far"]);
	});

	it("includes distanceSq in results", () => {
		updateEntity("a", 3, 4);
		const results = queryRadius(0, 0, 10);
		expect(results[0].distanceSq).toBe(25); // 3² + 4² = 25
	});

	it("returns empty for empty grid", () => {
		const results = queryRadius(0, 0, 100);
		expect(results).toHaveLength(0);
	});

	it("zero radius finds entity at exact position", () => {
		updateEntity("a", 10, 10);
		const results = queryRadius(10, 10, 0);
		expect(results).toHaveLength(1);
	});

	it("entity at exact boundary is included", () => {
		updateEntity("a", 5, 0);
		const results = queryRadius(0, 0, 5);
		expect(results).toHaveLength(1);
	});

	it("works across cell boundaries", () => {
		setCellSize(10);
		updateEntity("a", 9, 0); // cell (0,0)
		updateEntity("b", 11, 0); // cell (1,0)

		const results = queryRadius(10, 0, 5);
		expect(results).toHaveLength(2);
	});

	it("handles negative coordinates", () => {
		updateEntity("a", -5, -5);
		updateEntity("b", -3, -3);

		const results = queryRadius(-4, -4, 3);
		expect(results).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Nearest entity query
// ---------------------------------------------------------------------------

describe("queryNearest", () => {
	it("returns nearest entity", () => {
		updateEntity("far", 10, 0);
		updateEntity("near", 3, 0);

		const result = queryNearest(0, 0, 20);
		expect(result).not.toBeNull();
		expect(result!.id).toBe("near");
	});

	it("returns null when no entities in range", () => {
		updateEntity("far", 100, 100);
		const result = queryNearest(0, 0, 5);
		expect(result).toBeNull();
	});

	it("returns null on empty grid", () => {
		const result = queryNearest(0, 0, 100);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Rectangle queries
// ---------------------------------------------------------------------------

describe("queryRect", () => {
	it("finds entities within rectangle", () => {
		updateEntity("inside1", 5, 5);
		updateEntity("inside2", 8, 8);
		updateEntity("outside", 20, 20);

		const results = queryRect(0, 0, 10, 10);
		expect(results).toHaveLength(2);
	});

	it("includes entities on boundary", () => {
		updateEntity("edge", 10, 10);
		const results = queryRect(0, 0, 10, 10);
		expect(results).toHaveLength(1);
	});

	it("returns sorted by distance from center", () => {
		updateEntity("far", 9, 5);
		updateEntity("near", 5, 5);

		const results = queryRect(0, 0, 10, 10);
		// Center of rect is (5,5), "near" is closer
		expect(results[0].id).toBe("near");
	});

	it("returns empty for empty rect", () => {
		updateEntity("a", 50, 50);
		const results = queryRect(0, 0, 10, 10);
		expect(results).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Performance / scale
// ---------------------------------------------------------------------------

describe("scale", () => {
	it("handles 1000 entities", () => {
		for (let i = 0; i < 1000; i++) {
			updateEntity(`e${i}`, i * 2, i * 3);
		}
		expect(getEntityCount()).toBe(1000);

		// Query near origin should find entities close to (0,0)
		const results = queryRadius(0, 0, 50);
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThan(1000);
	});

	it("handles rapid position updates", () => {
		updateEntity("mover", 0, 0);
		for (let i = 0; i < 100; i++) {
			updateEntity("mover", i, i);
		}
		expect(getEntityPosition("mover")).toEqual({ x: 99, z: 99 });
		expect(getEntityCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all state", () => {
		setCellSize(32);
		updateEntity("a", 10, 10);
		updateEntity("b", 20, 20);

		resetSpatialIndex();

		expect(getEntityCount()).toBe(0);
		expect(getCellCount()).toBe(0);
		expect(getCellSize()).toBe(16); // back to default
	});
});
