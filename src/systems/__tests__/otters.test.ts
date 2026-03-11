/**
 * Unit tests for the otter hologram system.
 *
 * Tests cover:
 * - All holograms are stationary (moving = false)
 * - Idle animation timer decrements each tick
 * - Timer resets to [3, 10] range when expired
 * - Multiple holograms processed independently
 * - Empty list handled gracefully
 * - Positions never change (holograms don't move)
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockOtters = [] as Array<unknown>;

jest.mock("../../ecs/world", () => ({
	otters: mockOtters,
}));

// Also mock the Koota compat layer (otters.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
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

function createHologram(
	opts: {
		x?: number;
		z?: number;
		wanderTimer?: number;
		stationary?: boolean;
	} = {},
): MockOtterEntity {
	return {
		otter: {
			speed: 0,
			wanderTimer: opts.wanderTimer ?? 5,
			wanderDir: { x: 0, z: 0 },
			moving: false,
			stationary: opts.stationary ?? true,
		},
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockOtters.length = 0;
});

// ---------------------------------------------------------------------------
// Stationary behavior
// ---------------------------------------------------------------------------

describe("hologram stationarity", () => {
	it("sets moving to false for all holograms", () => {
		const h = createHologram({ x: 10, z: 20 });
		mockOtters.push(h);

		otterSystem();

		expect(h.otter.moving).toBe(false);
	});

	it("does not change position", () => {
		const h = createHologram({ x: 10, z: 20 });
		mockOtters.push(h);

		otterSystem();
		otterSystem();
		otterSystem();

		expect(h.worldPosition.x).toBe(10);
		expect(h.worldPosition.z).toBe(20);
	});

	it("sets moving false even without stationary flag", () => {
		const h = createHologram({ stationary: false });
		mockOtters.push(h);

		otterSystem();

		expect(h.otter.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Animation timer
// ---------------------------------------------------------------------------

describe("idle animation timer", () => {
	it("decrements timer each tick", () => {
		const h = createHologram({ wanderTimer: 5 });
		mockOtters.push(h);

		otterSystem();

		expect(h.otter.wanderTimer).toBe(4);
	});

	it("resets timer when it reaches zero", () => {
		const h = createHologram({ wanderTimer: 1 });
		mockOtters.push(h);

		// After decrement: timer = 0, triggers reset
		otterSystem();

		expect(h.otter.wanderTimer).toBeGreaterThanOrEqual(3);
		expect(h.otter.wanderTimer).toBeLessThanOrEqual(10);
	});

	it("resets timer when already negative", () => {
		const h = createHologram({ wanderTimer: 0 });
		mockOtters.push(h);

		otterSystem();

		// Timer decremented to -1, which is <= 0, so reset
		expect(h.otter.wanderTimer).toBeGreaterThanOrEqual(3);
		expect(h.otter.wanderTimer).toBeLessThanOrEqual(10);
	});

	it("does not reset timer when still positive", () => {
		const h = createHologram({ wanderTimer: 3 });
		mockOtters.push(h);

		otterSystem();

		expect(h.otter.wanderTimer).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Multiple holograms
// ---------------------------------------------------------------------------

describe("multiple holograms", () => {
	it("processes all holograms independently", () => {
		const h1 = createHologram({ x: 5, z: 10, wanderTimer: 5 });
		const h2 = createHologram({ x: 20, z: 30, wanderTimer: 3 });
		mockOtters.push(h1, h2);

		otterSystem();

		// Both decremented independently
		expect(h1.otter.wanderTimer).toBe(4);
		expect(h2.otter.wanderTimer).toBe(2);

		// Neither moved
		expect(h1.worldPosition.x).toBe(5);
		expect(h2.worldPosition.x).toBe(20);

		// Both stationary
		expect(h1.otter.moving).toBe(false);
		expect(h2.otter.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles empty hologram list gracefully", () => {
		expect(() => otterSystem()).not.toThrow();
	});
});
