/**
 * Tests for SpatialGrid pure utilities and SpatialGrid class.
 */

import {
	worldToCell,
	cellKey,
	decodeCellKey,
	getCellsInRadius,
	sqDistXZ,
	SpatialGrid,
} from "../SpatialGrid";

// ---------------------------------------------------------------------------
// worldToCell
// ---------------------------------------------------------------------------

describe("worldToCell", () => {
	it("maps origin to cell (0,0)", () => {
		expect(worldToCell(0, 0, 10)).toEqual({ cellX: 0, cellZ: 0 });
	});

	it("maps position within cell to correct cell", () => {
		expect(worldToCell(5, 7, 10)).toEqual({ cellX: 0, cellZ: 0 });
	});

	it("maps position at cell boundary to next cell", () => {
		expect(worldToCell(10, 10, 10)).toEqual({ cellX: 1, cellZ: 1 });
	});

	it("maps large coordinates correctly", () => {
		expect(worldToCell(100, 200, 10)).toEqual({ cellX: 10, cellZ: 20 });
	});

	it("maps negative coordinates to negative cell", () => {
		const cell = worldToCell(-5, -5, 10);
		expect(cell.cellX).toBeLessThan(0);
		expect(cell.cellZ).toBeLessThan(0);
	});

	it("cell size affects granularity", () => {
		const c1 = worldToCell(15, 0, 10);  // cellX=1
		const c2 = worldToCell(15, 0, 20);  // cellX=0
		expect(c1.cellX).toBe(1);
		expect(c2.cellX).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// cellKey and decodeCellKey
// ---------------------------------------------------------------------------

describe("cellKey and decodeCellKey", () => {
	it("encodes (0,0) to '0,0'", () => {
		expect(cellKey(0, 0)).toBe("0,0");
	});

	it("encodes (5, -3) correctly", () => {
		expect(cellKey(5, -3)).toBe("5,-3");
	});

	it("decodes back to original coordinates", () => {
		const key = cellKey(7, 12);
		const decoded = decodeCellKey(key);
		expect(decoded).toEqual({ cellX: 7, cellZ: 12 });
	});

	it("different cells produce different keys", () => {
		expect(cellKey(1, 2)).not.toBe(cellKey(2, 1));
		expect(cellKey(0, 10)).not.toBe(cellKey(10, 0));
	});

	it("negative cells decode correctly", () => {
		const decoded = decodeCellKey("-3,-7");
		expect(decoded).toEqual({ cellX: -3, cellZ: -7 });
	});
});

// ---------------------------------------------------------------------------
// getCellsInRadius
// ---------------------------------------------------------------------------

describe("getCellsInRadius", () => {
	it("returns at least 1 cell for radius 0", () => {
		expect(getCellsInRadius(5, 5, 0, 10)).toHaveLength(1);
	});

	it("returns more cells for larger radius", () => {
		const small = getCellsInRadius(50, 50, 5, 10);
		const large = getCellsInRadius(50, 50, 30, 10);
		expect(large.length).toBeGreaterThan(small.length);
	});

	it("includes the center cell for radius 0", () => {
		const cells = getCellsInRadius(5, 5, 0, 10);
		const { cellX, cellZ } = worldToCell(5, 5, 10);
		expect(cells).toContain(cellKey(cellX, cellZ));
	});

	it("returns unique cell keys", () => {
		const cells = getCellsInRadius(0, 0, 15, 10);
		const unique = new Set(cells);
		expect(unique.size).toBe(cells.length);
	});
});

// ---------------------------------------------------------------------------
// sqDistXZ
// ---------------------------------------------------------------------------

describe("sqDistXZ", () => {
	it("returns 0 for identical positions", () => {
		expect(sqDistXZ(3, 7, 3, 7)).toBe(0);
	});

	it("3-4-5 triangle gives 25", () => {
		expect(sqDistXZ(0, 0, 3, 4)).toBe(25);
	});

	it("is symmetric", () => {
		expect(sqDistXZ(1, 2, 5, 8)).toBe(sqDistXZ(5, 8, 1, 2));
	});
});

// ---------------------------------------------------------------------------
// SpatialGrid
// ---------------------------------------------------------------------------

describe("SpatialGrid", () => {
	it("starts empty", () => {
		const grid = new SpatialGrid(10);
		expect(grid.entityCount).toBe(0);
		expect(grid.cellCount).toBe(0);
	});

	it("insert() adds an entity", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "a", x: 5, z: 5 });
		expect(grid.entityCount).toBe(1);
		expect(grid.has("a")).toBe(true);
	});

	it("remove() removes entity", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "a", x: 5, z: 5 });
		grid.remove("a");
		expect(grid.has("a")).toBe(false);
		expect(grid.entityCount).toBe(0);
	});

	it("remove() is no-op for unknown entity", () => {
		const grid = new SpatialGrid(10);
		expect(() => grid.remove("nonexistent")).not.toThrow();
	});

	it("getPosition() returns inserted position", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "bot", x: 15, z: 22 });
		expect(grid.getPosition("bot")).toEqual({ x: 15, z: 22 });
	});

	it("getPosition() returns null for unknown entity", () => {
		const grid = new SpatialGrid(10);
		expect(grid.getPosition("unknown")).toBeNull();
	});

	it("query() finds nearby entity", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "target", x: 5, z: 5 });
		const found = grid.query(0, 0, 10);
		expect(found).toContain("target");
	});

	it("query() does not return distant entity", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "far", x: 100, z: 100 });
		const found = grid.query(0, 0, 10);
		expect(found).not.toContain("far");
	});

	it("query() excludes specified entity", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "self", x: 0, z: 0 });
		grid.insert({ id: "other", x: 1, z: 1 });
		const found = grid.query(0, 0, 10, "self");
		expect(found).not.toContain("self");
		expect(found).toContain("other");
	});

	it("query() finds multiple entities", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "a", x: 3, z: 0 });
		grid.insert({ id: "b", x: -3, z: 0 });
		grid.insert({ id: "c", x: 50, z: 0 });
		const found = grid.query(0, 0, 10);
		expect(found).toContain("a");
		expect(found).toContain("b");
		expect(found).not.toContain("c");
	});

	it("move() updates entity position", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "bot", x: 5, z: 5 });
		grid.move({ id: "bot", x: 50, z: 50 });
		expect(grid.getPosition("bot")).toEqual({ x: 50, z: 50 });
	});

	it("move() preserves query correctness after position change", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "bot", x: 5, z: 5 });
		// Initially in range
		expect(grid.query(0, 0, 15)).toContain("bot");
		// Move far away
		grid.move({ id: "bot", x: 100, z: 100 });
		// Now out of range
		expect(grid.query(0, 0, 15)).not.toContain("bot");
	});

	it("insert() called on existing entity is equivalent to move()", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "bot", x: 5, z: 5 });
		grid.insert({ id: "bot", x: 50, z: 50 }); // re-insert = move
		expect(grid.getPosition("bot")).toEqual({ x: 50, z: 50 });
		expect(grid.entityCount).toBe(1); // still just 1 entity
	});

	it("clear() removes all entities and cells", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "a", x: 0, z: 0 });
		grid.insert({ id: "b", x: 50, z: 50 });
		grid.clear();
		expect(grid.entityCount).toBe(0);
		expect(grid.cellCount).toBe(0);
		expect(grid.has("a")).toBe(false);
	});

	it("entityCount and cellCount are consistent", () => {
		const grid = new SpatialGrid(10);
		grid.insert({ id: "a", x: 0, z: 0 });
		grid.insert({ id: "b", x: 0, z: 0 }); // same cell
		expect(grid.entityCount).toBe(2);
		expect(grid.cellCount).toBe(1); // both in one cell
	});
});
