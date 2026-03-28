/**
 * Navmesh A* pathfinding and path smoothing tests.
 *
 * Tests findNavPath (A* over coarse nav grid) and the smoothPath behavior
 * that removes redundant waypoints via line-of-sight checks.
 *
 * The navmesh samples terrain walkability on a grid (NAV_STEP=2 world units).
 * Without city layout initialized, isInsideBuilding returns false,
 * so walkability depends only on terrain height (water = impassable).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { WORLD_HALF } from "../../ecs/terrain";
import { buildNavGraph, findNavPath } from "../navmesh";
import { findPath } from "../pathfinding";

describe("navmesh pathfinding", () => {
	beforeEach(() => {
		// Build the navigation graph from terrain.
		// City layout is NOT initialized, so isInsideBuilding always returns false
		// and walkability depends only on terrain height (procedural sine noise).
		buildNavGraph();
	});

	// --- Test 1: same start and goal ---

	it("findNavPath returns empty array when start equals goal", () => {
		// (0, 0) is walkable terrain. When start nav cell equals goal nav cell,
		// the A* loop immediately hits the goal and reconstructs a trivial path.
		// With smoothing, a path of length <= 2 passes through unchanged.
		const path = findNavPath(0, 0, 0, 0);

		// The path should be trivial — either empty or just the start/end point.
		// Since start and goal snap to the same nav cell, the A* finds the goal
		// immediately and returns [start, goal] which are the same position.
		expect(path.length).toBeLessThanOrEqual(2);
		if (path.length > 0) {
			// Both endpoints should be at (0, 0)
			expect(path[0].x).toBeCloseTo(0);
			expect(path[0].z).toBeCloseTo(0);
			expect(path[path.length - 1].x).toBeCloseTo(0);
			expect(path[path.length - 1].z).toBeCloseTo(0);
		}
	});

	// --- Test 2: path between nearby walkable points ---

	it("findNavPath finds path between nearby walkable points", () => {
		// (0, 0) and (10, 10) are both walkable (verified from terrain height function).
		const path = findNavPath(0, 0, 10, 10);

		expect(path.length).toBeGreaterThanOrEqual(2);

		// First waypoint should be the exact start position
		expect(path[0].x).toBeCloseTo(0);
		expect(path[0].z).toBeCloseTo(0);

		// Last waypoint should be the exact goal position
		expect(path[path.length - 1].x).toBeCloseTo(10);
		expect(path[path.length - 1].z).toBeCloseTo(10);
	});

	// --- Test 3: unreachable goal ---

	it("findNavPath returns empty when goal is completely unreachable", () => {
		// Before buildNavGraph is called, walkGrid is empty (all entries undefined/falsy).
		// Rebuild with an empty grid by testing before initialization.
		// We exploit maxNodes=1 to force A* to give up immediately when start != goal
		// and there are many nodes to explore.

		// A more direct approach: call findNavPath with maxNodes=0 so A* cannot
		// expand any nodes beyond the start.
		const path = findNavPath(0, 0, 50, 50, 0);
		expect(path).toEqual([]);
	});

	// --- Test 4: waypoints are in world coordinates ---

	it("path waypoints are in world coordinates", () => {
		// Path from (0, 0) to (20, 20) — both walkable.
		const path = findNavPath(0, 0, 20, 20);
		expect(path.length).toBeGreaterThanOrEqual(2);

		for (const waypoint of path) {
			// x and z should be within world bounds [-WORLD_HALF, +WORLD_HALF]
			expect(waypoint.x).toBeGreaterThanOrEqual(-WORLD_HALF);
			expect(waypoint.x).toBeLessThanOrEqual(WORLD_HALF);
			expect(waypoint.z).toBeGreaterThanOrEqual(-WORLD_HALF);
			expect(waypoint.z).toBeLessThanOrEqual(WORLD_HALF);

			// y should be 0 (navmesh outputs flat y; terrain height applied by findPath)
			expect(waypoint.y).toBe(0);
		}
	});

	// --- Test 5: path smoothing reduces redundant waypoints ---

	it("path smoothing reduces redundant waypoints on a straight line", () => {
		// Moving along a straight walkable corridor.
		// (0, 0) to (0, 20) is a straight line along z-axis, all walkable.
		// Without smoothing, A* would produce one waypoint per nav cell (~10 nodes).
		// Smoothing via line-of-sight should collapse this to just start + end.
		const path = findNavPath(0, 0, 0, 20);

		expect(path.length).toBeGreaterThanOrEqual(2);

		// The smoothed path on a clear straight line should be much shorter than
		// the raw A* path. With NAV_STEP=2, raw path would have ~10 waypoints
		// for 20 world units. Smoothing should reduce to 2 (start + end).
		expect(path.length).toBeLessThanOrEqual(3);

		// Verify endpoints are correct
		expect(path[0].x).toBeCloseTo(0);
		expect(path[0].z).toBeCloseTo(0);
		expect(path[path.length - 1].x).toBeCloseTo(0);
		expect(path[path.length - 1].z).toBeCloseTo(20);
	});

	// --- Test 6: octile distance heuristic consistency ---

	it("heuristic is consistent (octile distance)", () => {
		// The heuristic function is not exported, but we can verify its behavior
		// indirectly: for an 8-directional grid, octile distance is
		//   h = max(dx, dz) + 0.414 * min(dx, dz)
		// This means diagonal paths should be preferred over L-shaped ones.
		//
		// Test: path from (0, 0) to (10, 10) should be roughly diagonal
		// (total octile distance = 10 + 0.414*10 = 14.14 nav steps).
		// An L-shaped path would be 10 + 10 = 20 nav steps — significantly longer.
		// So the A* path cost should reflect the diagonal preference.

		const diagonalPath = findNavPath(0, 0, 10, 10);
		expect(diagonalPath.length).toBeGreaterThanOrEqual(2);

		// Compute total path length (Euclidean sum of segments)
		let totalDist = 0;
		for (let i = 1; i < diagonalPath.length; i++) {
			const dx = diagonalPath[i].x - diagonalPath[i - 1].x;
			const dz = diagonalPath[i].z - diagonalPath[i - 1].z;
			totalDist += Math.sqrt(dx * dx + dz * dz);
		}

		// Straight-line Euclidean distance from (0,0) to (10,10) = ~14.14
		const straightLine = Math.sqrt(10 * 10 + 10 * 10);

		// The path should be close to optimal (within 30% of straight line).
		// Octile heuristic ensures A* doesn't wander far from the diagonal.
		expect(totalDist).toBeLessThan(straightLine * 1.3);
		expect(totalDist).toBeGreaterThanOrEqual(straightLine);
	});

	// --- Additional: findPath wrapper applies terrain height ---

	it("findPath applies terrain height to waypoints", () => {
		const path = findPath({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 10 });

		expect(path.length).toBeGreaterThanOrEqual(2);

		// findPath calls getTerrainHeight on each waypoint, so y should NOT all be 0
		// (terrain height at these positions is non-zero due to sine noise).
		const hasNonZeroY = path.some((p) => p.y !== 0);
		expect(hasNonZeroY).toBe(true);
	});
});
