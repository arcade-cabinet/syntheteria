/**
 * Unit tests for the otter wandering system.
 *
 * Tests cover:
 * - Stationary otters never move (quest givers)
 * - Wander timer decrements each tick
 * - New direction chosen when timer expires
 * - Movement updates worldPosition when walkable
 * - Clamping to world boundaries (WORLD_HALF - OTTER_BORDER)
 * - Bounce on unwalkable terrain (new direction, timer=1, moving=false)
 * - Terrain height applied after movement
 * - moving flag set correctly in both outcomes
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockOtters = [] as Array<unknown>;
let mockIsWalkable = true;
let mockTerrainHeight = 0.25;

jest.mock("../../ecs/terrain", () => ({
	WORLD_SIZE: 200,
	WORLD_HALF: 100,
	getTerrainHeight: (_x: number, _z: number) => mockTerrainHeight,
	isWalkable: (_x: number, _z: number) => mockIsWalkable,
}));

jest.mock("../../ecs/world", () => ({
	otters: mockOtters,
}));

import { otterSystem } from "../otters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockOtterEntity {
	otter: {
		speed: number;
		wanderTimer: number;
		wanderDir: { x: number; z: number };
		moving: boolean;
		stationary?: boolean;
	};
	worldPosition: { x: number; y: number; z: number };
}

function createOtter(
	opts: {
		x?: number;
		z?: number;
		speed?: number;
		wanderTimer?: number;
		wanderDirX?: number;
		wanderDirZ?: number;
		stationary?: boolean;
	} = {},
): MockOtterEntity {
	return {
		otter: {
			speed: opts.speed ?? 0.5,
			wanderTimer: opts.wanderTimer ?? 5,
			wanderDir: { x: opts.wanderDirX ?? 1, z: opts.wanderDirZ ?? 0 },
			moving: false,
			stationary: opts.stationary,
		},
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockOtters.length = 0;
	mockIsWalkable = true;
	mockTerrainHeight = 0.25;
});

// ---------------------------------------------------------------------------
// Stationary otters
// ---------------------------------------------------------------------------

describe("stationary otters", () => {
	it("does not move stationary otters (quest givers)", () => {
		const otter = createOtter({ stationary: true, x: 10, z: 20 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.x).toBe(10);
		expect(otter.worldPosition.z).toBe(20);
		expect(otter.otter.moving).toBe(false);
	});

	it("does not decrement wander timer for stationary otters", () => {
		const otter = createOtter({ stationary: true, wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.otter.wanderTimer).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Wander timer
// ---------------------------------------------------------------------------

describe("wander timer", () => {
	it("decrements wander timer each tick", () => {
		const otter = createOtter({ wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.otter.wanderTimer).toBe(4);
	});

	it("picks a new direction when timer reaches zero", () => {
		const otter = createOtter({ wanderTimer: 1, wanderDirX: 1, wanderDirZ: 0 });
		mockOtters.push(otter);

		// After decrement, timer = 0, which is <= 0, so new direction chosen
		otterSystem();

		// Timer should be reset to a value in [3, 10]
		expect(otter.otter.wanderTimer).toBeGreaterThanOrEqual(3);
		expect(otter.otter.wanderTimer).toBeLessThanOrEqual(10);
	});

	it("new direction is a unit vector (normalized)", () => {
		const otter = createOtter({ wanderTimer: 1 });
		mockOtters.push(otter);

		otterSystem();

		const { x, z } = otter.otter.wanderDir;
		const len = Math.sqrt(x * x + z * z);
		expect(len).toBeCloseTo(1.0, 3);
	});
});

// ---------------------------------------------------------------------------
// Movement on walkable terrain
// ---------------------------------------------------------------------------

describe("movement on walkable terrain", () => {
	it("moves otter forward along wanderDir", () => {
		const otter = createOtter({
			x: 0,
			z: 0,
			speed: 2,
			wanderDirX: 1,
			wanderDirZ: 0,
			wanderTimer: 5,
		});
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.x).toBe(2); // 0 + 1 * 2
		expect(otter.worldPosition.z).toBe(0);
		expect(otter.otter.moving).toBe(true);
	});

	it("applies terrain height to Y after movement", () => {
		mockTerrainHeight = 0.35;
		const otter = createOtter({ wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.y).toBe(0.35);
	});

	it("sets moving to true when movement succeeds", () => {
		const otter = createOtter({ wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.otter.moving).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Boundary clamping
// ---------------------------------------------------------------------------

describe("boundary clamping", () => {
	it("clamps position to WORLD_HALF - OTTER_BORDER", () => {
		// WORLD_HALF=100, OTTER_BORDER=5, so max = 95, min = -95
		const otter = createOtter({
			x: 94,
			z: 0,
			speed: 5,
			wanderDirX: 1,
			wanderDirZ: 0,
			wanderTimer: 5,
		});
		mockOtters.push(otter);

		otterSystem();

		// newX = 94 + 1*5 = 99, clamped to 95
		expect(otter.worldPosition.x).toBe(95);
	});

	it("clamps negative boundary", () => {
		const otter = createOtter({
			x: -94,
			z: 0,
			speed: 5,
			wanderDirX: -1,
			wanderDirZ: 0,
			wanderTimer: 5,
		});
		mockOtters.push(otter);

		otterSystem();

		// newX = -94 + (-1)*5 = -99, clamped to -95
		expect(otter.worldPosition.x).toBe(-95);
	});

	it("clamps Z axis boundary", () => {
		const otter = createOtter({
			x: 0,
			z: 94,
			speed: 5,
			wanderDirX: 0,
			wanderDirZ: 1,
			wanderTimer: 5,
		});
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.z).toBe(95);
	});
});

// ---------------------------------------------------------------------------
// Unwalkable terrain bounce
// ---------------------------------------------------------------------------

describe("unwalkable terrain", () => {
	it("does not move on unwalkable terrain", () => {
		mockIsWalkable = false;
		const otter = createOtter({ x: 10, z: 20, wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.x).toBe(10);
		expect(otter.worldPosition.z).toBe(20);
	});

	it("sets moving to false on unwalkable terrain", () => {
		mockIsWalkable = false;
		const otter = createOtter({ wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.otter.moving).toBe(false);
	});

	it("sets wander timer to 1 after bounce", () => {
		mockIsWalkable = false;
		const otter = createOtter({ wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.otter.wanderTimer).toBe(1);
	});

	it("picks new direction on bounce", () => {
		mockIsWalkable = false;
		const otter = createOtter({
			wanderTimer: 5,
			wanderDirX: 1,
			wanderDirZ: 0,
		});
		mockOtters.push(otter);

		otterSystem();

		// Direction should be a new unit vector (we can't predict angle, but length = 1)
		const { x, z } = otter.otter.wanderDir;
		const len = Math.sqrt(x * x + z * z);
		expect(len).toBeCloseTo(1.0, 3);
	});
});

// ---------------------------------------------------------------------------
// Multiple otters
// ---------------------------------------------------------------------------

describe("multiple otters", () => {
	it("processes all otters independently", () => {
		const otter1 = createOtter({
			x: 0,
			z: 0,
			speed: 1,
			wanderDirX: 1,
			wanderDirZ: 0,
			wanderTimer: 5,
		});
		const otter2 = createOtter({
			x: 10,
			z: 10,
			speed: 2,
			wanderDirX: 0,
			wanderDirZ: 1,
			wanderTimer: 5,
		});
		mockOtters.push(otter1, otter2);

		otterSystem();

		expect(otter1.worldPosition.x).toBe(1);
		expect(otter1.worldPosition.z).toBe(0);
		expect(otter2.worldPosition.x).toBe(10);
		expect(otter2.worldPosition.z).toBe(12);
	});

	it("stationary otter does not affect mobile otters", () => {
		const stationary = createOtter({ stationary: true, x: 5, z: 5 });
		const mobile = createOtter({
			x: 0,
			z: 0,
			speed: 1,
			wanderDirX: 1,
			wanderDirZ: 0,
			wanderTimer: 5,
		});
		mockOtters.push(stationary, mobile);

		otterSystem();

		expect(stationary.worldPosition.x).toBe(5);
		expect(mobile.worldPosition.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Empty otters list
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles empty otters list gracefully", () => {
		expect(() => otterSystem()).not.toThrow();
	});

	it("otter with speed 0 stays in place", () => {
		const otter = createOtter({ speed: 0, wanderTimer: 5 });
		mockOtters.push(otter);

		otterSystem();

		expect(otter.worldPosition.x).toBe(0);
		expect(otter.worldPosition.z).toBe(0);
		// Still "moving" because isWalkable returns true even though displacement was 0
		// The system sets moving=true when isWalkable succeeds
		expect(otter.otter.moving).toBe(true);
	});
});
