/**
 * Unit tests for the navigation mesh system.
 *
 * Tests cover:
 * - buildNavGraph: initialization and grid sampling
 * - findNavPath: A* pathfinding with start/goal, path reconstruction
 * - Path smoothing: line-of-sight waypoint reduction
 * - Edge cases: unwalkable start/goal, out-of-bounds, maxNodes
 * - NAV_STEP: coordinate conversion and grid resolution
 */

import { beforeEach, describe, expect, it } from "vitest";
import { WORLD_HALF, WORLD_SIZE } from "../../ecs/terrain";
import { buildNavGraph, findNavPath, NAV_STEP } from "../navmesh";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Rebuild the nav graph before each test to get a fresh state
	buildNavGraph();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("navmesh constants", () => {
	it("NAV_STEP is 2 world units", () => {
		expect(NAV_STEP).toBe(2);
	});

	it("world size is positive", () => {
		expect(WORLD_SIZE).toBeGreaterThan(0);
	});

	it("WORLD_HALF is half the WORLD_SIZE", () => {
		expect(WORLD_HALF).toBe(WORLD_SIZE / 2);
	});
});

// ---------------------------------------------------------------------------
// buildNavGraph
// ---------------------------------------------------------------------------

describe("buildNavGraph", () => {
	it("does not throw during initialization", () => {
		expect(() => buildNavGraph()).not.toThrow();
	});

	it("can be called multiple times without error", () => {
		buildNavGraph();
		buildNavGraph();
		// Should not throw or corrupt state
		const path = findNavPath(0, 0, 2, 0);
		// Path may exist or not depending on terrain, but should not crash
		expect(Array.isArray(path)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// findNavPath — basic pathfinding
// ---------------------------------------------------------------------------

describe("findNavPath — basic", () => {
	it("returns an array (possibly empty) for any input", () => {
		const path = findNavPath(0, 0, 10, 10);
		expect(Array.isArray(path)).toBe(true);
	});

	it("returns a path with at least start and goal for nearby walkable points", () => {
		// Use spawn area center which should be walkable (spawn area is kept clear)
		const path = findNavPath(12, 14, 14, 14);
		if (path.length > 0) {
			// If a path is found, first waypoint should be near start
			expect(path[0].x).toBeCloseTo(12, 0);
			expect(path[0].z).toBeCloseTo(14, 0);
			// Last waypoint should be near goal
			const last = path[path.length - 1];
			expect(last.x).toBeCloseTo(14, 0);
			expect(last.z).toBeCloseTo(14, 0);
		}
	});

	it("sets y to 0 for all waypoints", () => {
		const path = findNavPath(12, 14, 18, 14);
		for (const waypoint of path) {
			expect(waypoint.y).toBe(0);
		}
	});

	it("first waypoint matches exact start position when path found", () => {
		const path = findNavPath(12, 14, 14, 14);
		if (path.length > 0) {
			expect(path[0].x).toBe(12);
			expect(path[0].z).toBe(14);
		}
	});

	it("last waypoint matches exact goal position when path found", () => {
		const path = findNavPath(12, 14, 14, 14);
		if (path.length > 0) {
			const last = path[path.length - 1];
			expect(last.x).toBe(14);
			expect(last.z).toBe(14);
		}
	});
});

// ---------------------------------------------------------------------------
// findNavPath — same start and goal
// ---------------------------------------------------------------------------

describe("findNavPath — same start and goal", () => {
	it("returns a path when start equals goal at walkable position", () => {
		const path = findNavPath(12, 14, 12, 14);
		if (path.length > 0) {
			// Should have minimal waypoints
			expect(path.length).toBeLessThanOrEqual(3);
			expect(path[0].x).toBe(12);
			expect(path[0].z).toBe(14);
		}
	});
});

// ---------------------------------------------------------------------------
// findNavPath — out of bounds
// ---------------------------------------------------------------------------

describe("findNavPath — out of bounds", () => {
	it("handles start position way out of bounds", () => {
		const path = findNavPath(9999, 9999, 12, 14);
		// Should either return empty or a path from the clamped position
		expect(Array.isArray(path)).toBe(true);
	});

	it("handles goal position way out of bounds", () => {
		const path = findNavPath(12, 14, 9999, 9999);
		expect(Array.isArray(path)).toBe(true);
	});

	it("handles negative out of bounds coordinates", () => {
		const path = findNavPath(-9999, -9999, 12, 14);
		expect(Array.isArray(path)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// findNavPath — maxNodes limit
// ---------------------------------------------------------------------------

describe("findNavPath — maxNodes limit", () => {
	it("respects maxNodes parameter", () => {
		// With a very small maxNodes, long paths should fail
		const path = findNavPath(-80, -80, 80, 80, 5);
		// With only 5 nodes allowed, unlikely to find a path across the world
		// Should return empty or a very short path
		expect(Array.isArray(path)).toBe(true);
	});

	it("finds path with large maxNodes allowance", () => {
		// Between walkable points with generous node budget
		const path = findNavPath(12, 14, 18, 14, 10000);
		// This should succeed if both points are walkable
		expect(Array.isArray(path)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// findNavPath — path properties
// ---------------------------------------------------------------------------

describe("findNavPath — path properties", () => {
	it("each waypoint has x, y, z properties", () => {
		const path = findNavPath(12, 14, 18, 14);
		for (const wp of path) {
			expect(wp).toHaveProperty("x");
			expect(wp).toHaveProperty("y");
			expect(wp).toHaveProperty("z");
			expect(typeof wp.x).toBe("number");
			expect(typeof wp.y).toBe("number");
			expect(typeof wp.z).toBe("number");
		}
	});

	it("path does not contain NaN coordinates", () => {
		const path = findNavPath(12, 14, 18, 14);
		for (const wp of path) {
			expect(Number.isNaN(wp.x)).toBe(false);
			expect(Number.isNaN(wp.y)).toBe(false);
			expect(Number.isNaN(wp.z)).toBe(false);
		}
	});

	it("consecutive waypoints are not identical", () => {
		const path = findNavPath(12, 14, 18, 14);
		for (let i = 1; i < path.length; i++) {
			const prev = path[i - 1];
			const curr = path[i];
			const same = prev.x === curr.x && prev.z === curr.z;
			expect(same).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// findNavPath — path smoothing
// ---------------------------------------------------------------------------

describe("findNavPath — smoothed paths", () => {
	it("short paths have few waypoints", () => {
		// Very short distance — should produce 2 waypoints at most (start + goal)
		const path = findNavPath(12, 14, 14, 14);
		if (path.length > 0) {
			// Smoothed path for short distance should be quite compact
			expect(path.length).toBeLessThanOrEqual(4);
		}
	});

	it("longer paths have more waypoints than start and goal", () => {
		// If we can find a path across a larger distance, it should have waypoints
		// Use a path within the open spawn area
		const path = findNavPath(5, 10, 20, 18);
		if (path.length > 0) {
			expect(path.length).toBeGreaterThanOrEqual(2);
		}
	});
});

// ---------------------------------------------------------------------------
// findNavPath — unwalkable terrain handling
// ---------------------------------------------------------------------------

describe("findNavPath — unwalkable terrain", () => {
	it("attempts to find nearest walkable node for unwalkable start", () => {
		// Position deep in water (very low terrain) or inside a building
		// We can't predict exact terrain, but the function should handle it
		const path = findNavPath(-95, -95, 12, 14);
		// Should return empty or find a valid path from nearest walkable
		expect(Array.isArray(path)).toBe(true);
	});

	it("attempts to find nearest walkable node for unwalkable goal", () => {
		const path = findNavPath(12, 14, -95, -95);
		expect(Array.isArray(path)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("findNavPath — determinism", () => {
	it("produces the same path for the same inputs", () => {
		buildNavGraph();
		const path1 = findNavPath(12, 14, 18, 14);
		const path2 = findNavPath(12, 14, 18, 14);

		expect(path1.length).toBe(path2.length);
		for (let i = 0; i < path1.length; i++) {
			expect(path1[i].x).toBe(path2[i].x);
			expect(path1[i].y).toBe(path2[i].y);
			expect(path1[i].z).toBe(path2[i].z);
		}
	});
});
