/**
 * Unit tests for PathfindingSystem — navmesh-based pathfinding.
 *
 * Tests cover:
 * - findPath: delegates to NavMesh, applies terrain height, smooths path
 * - Path smoothing: removes collinear waypoints, preserves bends
 * - createPathFollower: creates FollowPathBehavior on a vehicle
 * - findPathGlobal: convenience wrapper for global navmesh
 * - Edge cases: empty paths, single waypoint, no navmesh
 */

// ---------------------------------------------------------------------------
// Mock dependencies — must appear before imports
// ---------------------------------------------------------------------------

let mockTerrainHeightFn: (x: number, z: number) => number = () => 0;

jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: (x: number, z: number) => mockTerrainHeightFn(x, z),
}));

jest.mock("../../ecs/world", () => ({
	world: [],
}));

jest.mock("../YukaManager", () => ({
	YukaManager: {
		navMesh: null,
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { Vehicle, Vector3 as YukaVector3 } from "yuka";
import {
	findPath,
	createPathFollower,
	findPathGlobal,
} from "../PathfindingSystem.ts";
import { YukaManager } from "../YukaManager.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x: number, y: number, z: number) {
	return { x, y, z };
}

/** Create a mock NavMesh that returns a predetermined path. */
function makeMockNavMesh(pathPoints: Array<{ x: number; y: number; z: number }>) {
	return {
		findPath: (_from: unknown, _to: unknown) => {
			return pathPoints.map(
				(p) => new YukaVector3(p.x, p.y, p.z),
			);
		},
	};
}

function countSteeringBehaviors(vehicle: Vehicle): number {
	const sm = vehicle.steering as unknown as { behaviors: unknown[] };
	return sm.behaviors?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockTerrainHeightFn = () => 0;
	(YukaManager as { navMesh: unknown }).navMesh = null;
});

// ---------------------------------------------------------------------------
// findPath — basic delegation
// ---------------------------------------------------------------------------

describe("findPath", () => {
	it("returns found=false when navmesh returns empty path", () => {
		const navMesh = makeMockNavMesh([]);
		const result = findPath(navMesh as any, pos(0, 0, 0), pos(10, 0, 10));

		expect(result.found).toBe(false);
		expect(result.waypoints).toEqual([]);
	});

	it("returns found=true with waypoints from navmesh", () => {
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(5, 0, 5),
			pos(10, 0, 10),
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(10, 0, 10));

		expect(result.found).toBe(true);
		expect(result.waypoints.length).toBeGreaterThanOrEqual(2);
	});

	it("applies terrain height to all waypoints", () => {
		mockTerrainHeightFn = () => 2.5;
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(5, 0, 5),
			pos(10, 0, 10),
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(10, 0, 10));

		for (const wp of result.waypoints) {
			expect(wp.y).toBe(2.5);
		}
	});

	it("applies position-dependent terrain heights", () => {
		mockTerrainHeightFn = (x, _z) => x * 0.1;
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(10, 0, 5),
			pos(20, 0, 10),
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(20, 0, 10));

		// The smoothing may remove the middle point if they're collinear in XZ
		// But at least first and last should have correct heights
		expect(result.waypoints[0].y).toBeCloseTo(0);
		expect(result.waypoints[result.waypoints.length - 1].y).toBeCloseTo(2.0);
	});

	it("preserves X and Z coordinates from navmesh", () => {
		mockTerrainHeightFn = () => 0;
		const navMesh = makeMockNavMesh([
			pos(-5.5, 0, 3.7),
			pos(15.2, 0, -8.1),
		]);

		const result = findPath(navMesh as any, pos(-5.5, 0, 3.7), pos(15.2, 0, -8.1));

		expect(result.waypoints[0].x).toBeCloseTo(-5.5);
		expect(result.waypoints[0].z).toBeCloseTo(3.7);
		expect(result.waypoints[result.waypoints.length - 1].x).toBeCloseTo(15.2);
		expect(result.waypoints[result.waypoints.length - 1].z).toBeCloseTo(-8.1);
	});
});

// ---------------------------------------------------------------------------
// findPath — path smoothing
// ---------------------------------------------------------------------------

describe("findPath — smoothing", () => {
	it("removes collinear waypoints on a straight line", () => {
		mockTerrainHeightFn = () => 0;
		// All points on the line x=z, perfectly straight
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(5, 0, 5),
			pos(10, 0, 10),
			pos(15, 0, 15),
			pos(20, 0, 20),
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(20, 0, 20));

		// Smoothing should remove intermediate collinear points
		// At minimum: first + last = 2 waypoints
		expect(result.waypoints.length).toBeLessThan(5);
		expect(result.waypoints.length).toBeGreaterThanOrEqual(2);
	});

	it("preserves waypoints at bends", () => {
		mockTerrainHeightFn = () => 0;
		// Path with a sharp 90-degree turn
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(10, 0, 0),  // go east
			pos(10, 0, 10), // turn north (sharp bend)
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(10, 0, 10));

		// All 3 points should be preserved (significant bend)
		expect(result.waypoints).toHaveLength(3);
	});

	it("does not smooth paths with 2 or fewer waypoints", () => {
		mockTerrainHeightFn = () => 0;
		const navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		const result = findPath(navMesh as any, pos(0, 0, 0), pos(10, 0, 10));

		expect(result.waypoints).toHaveLength(2);
	});

	it("handles single waypoint path", () => {
		mockTerrainHeightFn = () => 0.5;
		const navMesh = makeMockNavMesh([pos(5, 0, 5)]);

		const result = findPath(navMesh as any, pos(5, 0, 5), pos(5, 0, 5));

		expect(result.found).toBe(true);
		expect(result.waypoints).toHaveLength(1);
		expect(result.waypoints[0].y).toBe(0.5);
	});
});

// ---------------------------------------------------------------------------
// createPathFollower
// ---------------------------------------------------------------------------

describe("createPathFollower", () => {
	it("attaches a FollowPathBehavior to the vehicle", () => {
		const vehicle = new Vehicle();
		const initialCount = countSteeringBehaviors(vehicle);

		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		expect(countSteeringBehaviors(vehicle)).toBe(initialCount + 1);
		expect(handle.behavior).toBeDefined();
	});

	it("behavior starts as active", () => {
		const vehicle = new Vehicle();
		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		expect(handle.behavior.active).toBe(true);
	});

	it("behavior has weight of 1", () => {
		const vehicle = new Vehicle();
		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		expect(handle.behavior.weight).toBe(1);
	});

	it("detach removes the behavior from the vehicle", () => {
		const vehicle = new Vehicle();
		const initialCount = countSteeringBehaviors(vehicle);

		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		expect(countSteeringBehaviors(vehicle)).toBe(initialCount + 1);

		handle.detach();
		expect(countSteeringBehaviors(vehicle)).toBe(initialCount);
	});

	it("isFinished reports path completion state", () => {
		const vehicle = new Vehicle();
		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		// Should not be finished immediately
		expect(handle.isFinished()).toBe(false);
	});

	it("accepts custom nextWaypointDistance", () => {
		const vehicle = new Vehicle();
		// Should not throw
		const handle = createPathFollower(vehicle, [
			pos(0, 0, 0),
			pos(10, 0, 10),
		], 3.0);

		expect(handle.behavior).toBeDefined();
	});

	it("handles single-point path", () => {
		const vehicle = new Vehicle();
		const handle = createPathFollower(vehicle, [pos(5, 0, 5)]);

		expect(handle.behavior).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// findPathGlobal
// ---------------------------------------------------------------------------

describe("findPathGlobal", () => {
	it("returns found=false when no global navmesh is set", () => {
		(YukaManager as { navMesh: unknown }).navMesh = null;

		const result = findPathGlobal(pos(0, 0, 0), pos(10, 0, 10));

		expect(result.found).toBe(false);
		expect(result.waypoints).toEqual([]);
	});

	it("delegates to findPath when navmesh is available", () => {
		mockTerrainHeightFn = () => 1.0;
		(YukaManager as { navMesh: unknown }).navMesh = makeMockNavMesh([
			pos(0, 0, 0),
			pos(10, 0, 10),
		]);

		const result = findPathGlobal(pos(0, 0, 0), pos(10, 0, 10));

		expect(result.found).toBe(true);
		expect(result.waypoints.length).toBeGreaterThanOrEqual(2);
		for (const wp of result.waypoints) {
			expect(wp.y).toBe(1.0);
		}
	});
});
