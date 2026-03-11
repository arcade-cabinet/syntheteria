/**
 * Unit tests for the movement system.
 *
 * Tests cover:
 * - Path waypoint interpolation (move toward target at correct speed)
 * - Path index advancement when waypoint is reached
 * - Speed calculations (delta, gameSpeed multiplier)
 * - Entity stops moving when final waypoint is reached
 * - Edge cases: empty path, single waypoint, already at destination
 * - Terrain height (Y) is updated via getTerrainHeight after each step
 * - Multiple entities processed independently
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock declarations for jest.mock factory hoisting
const mockMovingUnits = [] as Array<{
	worldPosition: { x: number; y: number; z: number };
	unit: { speed: number };
	navigation: {
		path: { x: number; y: number; z: number }[];
		pathIndex: number;
		moving: boolean;
	};
}>;

const mockGetBiomeAt = jest.fn((_x: number, _z: number) => ({
	moveSpeedMod: 1.0,
	harvestMod: 1.0,
	visibility: 1.0,
	bgColor: "#555555",
	signalBonus: 1.0,
	passable: true,
}));

// Mock getTerrainHeight to return a predictable value
jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: jest.fn((_x: number, _z: number) => 0),
}));

// We mock the world module so `movingUnits` is a controllable array
jest.mock("../../ecs/world", () => ({
	movingUnits: mockMovingUnits,
}));

// Also mock the Koota compat layer (movement.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	movingUnits: mockMovingUnits,
}));

// Mock biomeSystem so tests control biome speed modifier
jest.mock("../biomeSystem", () => ({
	getBiomeAt: (...args: [number, number]) => mockGetBiomeAt(...args),
}));

import { getTerrainHeight } from "../../ecs/terrain";
import { movementSystem } from "../movement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockMovingEntity {
	worldPosition: { x: number; y: number; z: number };
	unit: { speed: number };
	navigation: {
		path: { x: number; y: number; z: number }[];
		pathIndex: number;
		moving: boolean;
	};
}

function createMovingEntity(
	opts: {
		x?: number;
		y?: number;
		z?: number;
		speed?: number;
		path?: { x: number; y: number; z: number }[];
		pathIndex?: number;
		moving?: boolean;
	} = {},
): MockMovingEntity {
	return {
		worldPosition: { x: opts.x ?? 0, y: opts.y ?? 0, z: opts.z ?? 0 },
		unit: { speed: opts.speed ?? 5 },
		navigation: {
			path: opts.path ?? [],
			pathIndex: opts.pathIndex ?? 0,
			moving: opts.moving ?? true,
		},
	};
}

function wp(x: number, y = 0, z = 0) {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockMovingUnits.length = 0;
	jest.mocked(getTerrainHeight).mockReturnValue(0);
	// Default biome: no penalty
	mockGetBiomeAt.mockReturnValue({
		moveSpeedMod: 1.0,
		harvestMod: 1.0,
		visibility: 1.0,
		bgColor: "#555555",
		signalBonus: 1.0,
		passable: true,
	});
});

// ---------------------------------------------------------------------------
// Basic waypoint interpolation
// ---------------------------------------------------------------------------

describe("waypoint interpolation", () => {
	it("moves entity toward the first waypoint", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(10, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// speed=10, delta=1, gameSpeed=1 => step=10
		// distance to target = 10, step = 10, so should arrive exactly
		expect(entity.worldPosition.x).toBeCloseTo(10);
		expect(entity.worldPosition.z).toBeCloseTo(0);
	});

	it("partially moves toward waypoint when step < distance", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 2,
			path: [wp(10, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// step = 2, distance = 10, should move 2 units in x direction
		expect(entity.worldPosition.x).toBeCloseTo(2);
		expect(entity.worldPosition.z).toBeCloseTo(0);
		expect(entity.navigation.moving).toBe(true);
		expect(entity.navigation.pathIndex).toBe(0);
	});

	it("moves diagonally toward waypoint", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: Math.SQRT2, // sqrt(2) so 1 unit/sec along each axis when diagonal
			path: [wp(10, 0, 10)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// distance = sqrt(200) ~ 14.14, step = sqrt(2) ~ 1.414
		// normalized direction = (10/14.14, 10/14.14) = (0.707, 0.707)
		// dx = 0.707 * sqrt(2) = 1.0, dz = 1.0
		expect(entity.worldPosition.x).toBeCloseTo(1.0);
		expect(entity.worldPosition.z).toBeCloseTo(1.0);
	});
});

// ---------------------------------------------------------------------------
// Speed calculations
// ---------------------------------------------------------------------------

describe("speed calculations", () => {
	it("scales movement with delta time", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(0.016, 1.0); // ~60fps frame

		// step = 10 * 0.016 * 1.0 = 0.16
		expect(entity.worldPosition.x).toBeCloseTo(0.16);
	});

	it("scales movement with gameSpeed multiplier", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 2.0); // 2x game speed

		// step = 10 * 1.0 * 2.0 = 20
		expect(entity.worldPosition.x).toBeCloseTo(20);
	});

	it("zero delta produces no movement", () => {
		const entity = createMovingEntity({
			x: 5,
			z: 5,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(0, 1.0);

		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.worldPosition.z).toBeCloseTo(5);
	});

	it("zero gameSpeed produces no movement", () => {
		const entity = createMovingEntity({
			x: 5,
			z: 5,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 0);

		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.worldPosition.z).toBeCloseTo(5);
	});

	it("combines entity speed, delta, and gameSpeed correctly", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 5,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(0.5, 3.0);

		// step = 5 * 0.5 * 3.0 = 7.5
		expect(entity.worldPosition.x).toBeCloseTo(7.5);
	});
});

// ---------------------------------------------------------------------------
// Path index advancement
// ---------------------------------------------------------------------------

describe("path index advancement", () => {
	it("advances pathIndex when waypoint is reached exactly", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(10, 0, 0), wp(20, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// step = 10, distance to first waypoint = 10, exactly reached
		expect(entity.worldPosition.x).toBeCloseTo(10);
		expect(entity.navigation.pathIndex).toBe(1);
		expect(entity.navigation.moving).toBe(true);
	});

	it("advances pathIndex when step overshoots waypoint", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 20,
			path: [wp(5, 0, 0), wp(25, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// step = 20, distance to first waypoint = 5 => snaps to (5,0,0), pathIndex becomes 1
		// The system does NOT consume remaining distance in the same frame
		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.navigation.pathIndex).toBe(1);
		expect(entity.navigation.moving).toBe(true);
	});

	it("stops moving when final waypoint is reached", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(5, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.navigation.pathIndex).toBe(1);
		expect(entity.navigation.moving).toBe(false);
	});

	it("traverses multiple waypoints over successive frames", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(5, 0, 0), wp(15, 0, 0), wp(30, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		// Frame 1: step=10, dist to wp0=5 => arrive at wp0, pathIndex=1
		movementSystem(1.0, 1.0);
		expect(entity.navigation.pathIndex).toBe(1);
		expect(entity.worldPosition.x).toBeCloseTo(5);

		// Frame 2: step=10, dist to wp1=10 => arrive at wp1, pathIndex=2
		movementSystem(1.0, 1.0);
		expect(entity.navigation.pathIndex).toBe(2);
		expect(entity.worldPosition.x).toBeCloseTo(15);

		// Frame 3: step=10, dist to wp2=15 => partial move
		movementSystem(1.0, 1.0);
		expect(entity.navigation.pathIndex).toBe(2);
		expect(entity.worldPosition.x).toBeCloseTo(25);
		expect(entity.navigation.moving).toBe(true);

		// Frame 4: step=10, dist to wp2=5 => arrive at wp2, done
		movementSystem(1.0, 1.0);
		expect(entity.worldPosition.x).toBeCloseTo(30);
		expect(entity.navigation.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Terrain height (Y updates)
// ---------------------------------------------------------------------------

describe("terrain height updates", () => {
	it("sets Y from getTerrainHeight when moving toward waypoint", () => {
		jest.mocked(getTerrainHeight).mockReturnValue(1.5);

		const entity = createMovingEntity({
			x: 0,
			y: 0,
			z: 0,
			speed: 2,
			path: [wp(10, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.y).toBeCloseTo(1.5);
	});

	it("sets Y from getTerrainHeight when reaching waypoint", () => {
		jest.mocked(getTerrainHeight).mockReturnValue(0.75);

		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(5, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.y).toBeCloseTo(0.75);
	});

	it("calls getTerrainHeight with updated X and Z", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 3,
			path: [wp(30, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(getTerrainHeight).toHaveBeenCalledWith(
			expect.closeTo(3, 5),
			expect.closeTo(0, 5),
		);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: empty path
// ---------------------------------------------------------------------------

describe("empty path", () => {
	it("does nothing when path is empty", () => {
		const entity = createMovingEntity({
			x: 5,
			z: 5,
			speed: 10,
			path: [],
			pathIndex: 0,
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.worldPosition.z).toBeCloseTo(5);
		expect(entity.navigation.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: single waypoint
// ---------------------------------------------------------------------------

describe("single waypoint", () => {
	it("reaches single waypoint and stops", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 100,
			path: [wp(3, 0, 4)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.x).toBeCloseTo(3);
		expect(entity.worldPosition.z).toBeCloseTo(4);
		expect(entity.navigation.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: already at destination
// ---------------------------------------------------------------------------

describe("already at destination", () => {
	it("snaps to waypoint and stops when entity is already there", () => {
		const entity = createMovingEntity({
			x: 10,
			z: 20,
			speed: 5,
			path: [wp(10, 0, 20)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// dist = 0, step > 0 => dist <= step => snap + advance
		expect(entity.worldPosition.x).toBeCloseTo(10);
		expect(entity.worldPosition.z).toBeCloseTo(20);
		expect(entity.navigation.pathIndex).toBe(1);
		expect(entity.navigation.moving).toBe(false);
	});

	it("skips entity that is not moving", () => {
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(50, 0, 0)],
			pathIndex: 0,
			moving: false,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(entity.worldPosition.x).toBeCloseTo(0);
		expect(entity.worldPosition.z).toBeCloseTo(0);
	});

	it("skips entity whose pathIndex is past the end of path", () => {
		const entity = createMovingEntity({
			x: 10,
			z: 0,
			speed: 10,
			path: [wp(5, 0, 0)],
			pathIndex: 5, // way past end
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// Should set moving = false and not change position
		expect(entity.worldPosition.x).toBeCloseTo(10);
		expect(entity.navigation.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Multiple entities
// ---------------------------------------------------------------------------

describe("multiple entities", () => {
	it("moves all entities independently", () => {
		const e1 = createMovingEntity({
			x: 0,
			z: 0,
			speed: 5,
			path: [wp(50, 0, 0)],
			moving: true,
		});
		const e2 = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(0, 0, 50)],
			moving: true,
		});
		mockMovingUnits.push(e1, e2);

		movementSystem(1.0, 1.0);

		expect(e1.worldPosition.x).toBeCloseTo(5);
		expect(e1.worldPosition.z).toBeCloseTo(0);

		expect(e2.worldPosition.x).toBeCloseTo(0);
		expect(e2.worldPosition.z).toBeCloseTo(10);
	});

	it("stops one entity without affecting another", () => {
		const fast = createMovingEntity({
			x: 0,
			z: 0,
			speed: 100,
			path: [wp(5, 0, 0)],
			moving: true,
		});
		const slow = createMovingEntity({
			x: 0,
			z: 0,
			speed: 1,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(fast, slow);

		movementSystem(1.0, 1.0);

		expect(fast.navigation.moving).toBe(false);
		expect(slow.navigation.moving).toBe(true);
		expect(slow.worldPosition.x).toBeCloseTo(1);
	});
});

// ---------------------------------------------------------------------------
// Biome speed modifier
// ---------------------------------------------------------------------------

describe("biome speed modifier", () => {
	it("applies biome moveSpeedMod multiplicatively with base speed", () => {
		// scrap_hills: moveSpeedMod = 0.8
		mockGetBiomeAt.mockReturnValue({
			moveSpeedMod: 0.8,
			harvestMod: 1.2,
			visibility: 1.0,
			bgColor: "#6B5B3A",
			signalBonus: 1.0,
			passable: true,
		});

		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// effectiveSpeed = 10 (base) * 1.0 (clear weather) * 0.8 (scrap_hills) = 8
		expect(entity.worldPosition.x).toBeCloseTo(8);
	});

	it("applies chrome_ridge biome moveSpeedMod 0.6", () => {
		mockGetBiomeAt.mockReturnValue({
			moveSpeedMod: 0.6,
			harvestMod: 0.8,
			visibility: 0.7,
			bgColor: "#A0A0B0",
			signalBonus: 1.0,
			passable: true,
		});

		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// effectiveSpeed = 10 * 1.0 * 0.6 = 6
		expect(entity.worldPosition.x).toBeCloseTo(6);
	});

	it("applies cable_forest biome moveSpeedMod 0.5", () => {
		mockGetBiomeAt.mockReturnValue({
			moveSpeedMod: 0.5,
			harvestMod: 1.1,
			visibility: 0.4,
			bgColor: "#2A3A2A",
			signalBonus: 0.6,
			passable: true,
		});

		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// effectiveSpeed = 10 * 1.0 * 0.5 = 5
		expect(entity.worldPosition.x).toBeCloseTo(5);
	});

	it("biome modifier 1.0 (rust_plains) leaves speed unchanged", () => {
		// mockGetBiomeAt default already returns moveSpeedMod: 1.0
		const entity = createMovingEntity({
			x: 0,
			z: 0,
			speed: 10,
			path: [wp(100, 0, 0)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// effectiveSpeed = 10 * 1.0 * 1.0 = 10
		expect(entity.worldPosition.x).toBeCloseTo(10);
	});

	it("biome modifier 0.0 (deep_water) halts movement", () => {
		mockGetBiomeAt.mockReturnValue({
			moveSpeedMod: 0.0,
			harvestMod: 0.0,
			visibility: 0.3,
			bgColor: "#1A1A3E",
			signalBonus: 0.5,
			passable: false,
		});

		const entity = createMovingEntity({
			x: 5,
			z: 5,
			speed: 10,
			path: [wp(50, 0, 50)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		// step = 0 — entity should not move
		expect(entity.worldPosition.x).toBeCloseTo(5);
		expect(entity.worldPosition.z).toBeCloseTo(5);
	});

	it("queries getBiomeAt using floor of entity world position", () => {
		const entity = createMovingEntity({
			x: 3.7,
			z: 8.2,
			speed: 10,
			path: [wp(100, 0, 100)],
			moving: true,
		});
		mockMovingUnits.push(entity);

		movementSystem(1.0, 1.0);

		expect(mockGetBiomeAt).toHaveBeenCalledWith(
			Math.floor(3.7),
			Math.floor(8.2),
		);
	});
});
