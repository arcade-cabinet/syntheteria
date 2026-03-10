/**
 * Unit tests for the pathfinding interface.
 *
 * Tests cover:
 * - findPath delegates to navmesh findNavPath
 * - Terrain height applied to all waypoints
 * - Empty path returned when no path exists
 * - Start and goal Y values replaced with terrain height
 * - Single-waypoint path has height applied
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

let mockNavPath: Array<{ x: number; y: number; z: number }> = [];
let mockTerrainHeightFn: (x: number, z: number) => number = () => 0.25;

jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: (x: number, z: number) => mockTerrainHeightFn(x, z),
}));

jest.mock("../navmesh", () => ({
	findNavPath: (
		_startX: number,
		_startZ: number,
		_goalX: number,
		_goalZ: number,
	) => {
		// Return a deep copy so tests can verify mutation
		return mockNavPath.map((p) => ({ ...p }));
	},
}));

import { findPath } from "../pathfinding";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockNavPath = [];
	mockTerrainHeightFn = () => 0.25;
});

// ---------------------------------------------------------------------------
// Basic delegation
// ---------------------------------------------------------------------------

describe("findPath delegation", () => {
	it("returns empty array when navmesh finds no path", () => {
		mockNavPath = [];

		const result = findPath(
			{ x: 0, y: 0, z: 0 },
			{ x: 50, y: 0, z: 50 },
		);

		expect(result).toEqual([]);
	});

	it("returns waypoints from navmesh", () => {
		mockNavPath = [
			{ x: 0, y: 0, z: 0 },
			{ x: 10, y: 0, z: 10 },
			{ x: 20, y: 0, z: 20 },
		];

		const result = findPath(
			{ x: 0, y: 0, z: 0 },
			{ x: 20, y: 0, z: 20 },
		);

		expect(result).toHaveLength(3);
		expect(result[0].x).toBe(0);
		expect(result[1].x).toBe(10);
		expect(result[2].x).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// Terrain height application
// ---------------------------------------------------------------------------

describe("terrain height", () => {
	it("applies terrain height to all waypoints", () => {
		mockTerrainHeightFn = () => 0.35;
		mockNavPath = [
			{ x: 0, y: 0, z: 0 },
			{ x: 5, y: 0, z: 5 },
			{ x: 10, y: 0, z: 10 },
		];

		const result = findPath(
			{ x: 0, y: 0, z: 0 },
			{ x: 10, y: 0, z: 10 },
		);

		for (const p of result) {
			expect(p.y).toBe(0.35);
		}
	});

	it("applies position-dependent terrain heights", () => {
		mockTerrainHeightFn = (x, _z) => x * 0.01; // height varies with x
		mockNavPath = [
			{ x: 0, y: 0, z: 0 },
			{ x: 10, y: 0, z: 5 },
			{ x: 20, y: 0, z: 10 },
		];

		const result = findPath(
			{ x: 0, y: 0, z: 0 },
			{ x: 20, y: 0, z: 10 },
		);

		expect(result[0].y).toBeCloseTo(0.0);
		expect(result[1].y).toBeCloseTo(0.1);
		expect(result[2].y).toBeCloseTo(0.2);
	});

	it("replaces initial y=0 values with terrain height", () => {
		mockTerrainHeightFn = () => 0.42;
		mockNavPath = [{ x: 5, y: 0, z: 5 }];

		const result = findPath(
			{ x: 5, y: 0, z: 5 },
			{ x: 5, y: 0, z: 5 },
		);

		expect(result).toHaveLength(1);
		expect(result[0].y).toBe(0.42);
	});
});

// ---------------------------------------------------------------------------
// X/Z coordinates preserved
// ---------------------------------------------------------------------------

describe("coordinate preservation", () => {
	it("preserves X and Z from navmesh waypoints", () => {
		mockTerrainHeightFn = () => 0;
		mockNavPath = [
			{ x: -10.5, y: 0, z: 3.7 },
			{ x: 15.2, y: 0, z: -8.1 },
		];

		const result = findPath(
			{ x: -10.5, y: 0, z: 3.7 },
			{ x: 15.2, y: 0, z: -8.1 },
		);

		expect(result[0].x).toBe(-10.5);
		expect(result[0].z).toBe(3.7);
		expect(result[1].x).toBe(15.2);
		expect(result[1].z).toBe(-8.1);
	});
});

// ---------------------------------------------------------------------------
// Single waypoint
// ---------------------------------------------------------------------------

describe("single waypoint path", () => {
	it("handles single waypoint correctly", () => {
		mockTerrainHeightFn = () => 0.15;
		mockNavPath = [{ x: 7, y: 0, z: 7 }];

		const result = findPath(
			{ x: 7, y: 0, z: 7 },
			{ x: 7, y: 0, z: 7 },
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ x: 7, y: 0.15, z: 7 });
	});
});

// ---------------------------------------------------------------------------
// Long path
// ---------------------------------------------------------------------------

describe("long path", () => {
	it("handles many waypoints", () => {
		mockTerrainHeightFn = (_x, z) => z * 0.005;
		mockNavPath = [];
		for (let i = 0; i <= 20; i++) {
			mockNavPath.push({ x: i * 5, y: 0, z: i * 3 });
		}

		const result = findPath(
			{ x: 0, y: 0, z: 0 },
			{ x: 100, y: 0, z: 60 },
		);

		expect(result).toHaveLength(21);
		// Each should have terrain-derived Y
		for (let i = 0; i < result.length; i++) {
			expect(result[i].y).toBeCloseTo(i * 3 * 0.005);
		}
	});
});
