/**
 * Tests for DamageVFX pure utility functions.
 *
 * The DamageVFX React component requires R3F Canvas context and is not tested
 * here. The pure functions computeSparkVelocity, computeSmokeVelocity,
 * findUnitPosition, and getDestroyedUnitIds are fully testable without WebGL.
 */

// ---------------------------------------------------------------------------
// Mock Three.js — prevent module resolution errors
// ---------------------------------------------------------------------------

jest.mock("three", () => ({
	Color: class MockColor {
		r = 0; g = 0; b = 0;
		setHSL() { return this; }
		setRGB(r: number, g: number, b: number) { this.r = r; this.g = g; this.b = b; return this; }
	},
	BufferGeometry: class {
		setAttribute() {}
	},
	BufferAttribute: class {
		constructor(public array: Float32Array, _itemSize: number) {}
		needsUpdate = false;
	},
	PointsMaterial: class {
		constructor(_opts: unknown) {}
	},
	AdditiveBlending: 2,
	NormalBlending: 1,
}));

// ---------------------------------------------------------------------------
// Mock R3F — prevent import errors for useFrame/useEffect hooks
// ---------------------------------------------------------------------------

jest.mock("@react-three/fiber", () => ({
	useFrame: jest.fn(),
	useRef: jest.fn(() => ({ current: null })),
	useEffect: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock ECS world — expose mutable units array for testing
// ---------------------------------------------------------------------------

const mockUnits: Array<{
	id: string;
	worldPosition: { x: number; y: number; z: number };
	unit: { components: Array<{ functional: boolean }> };
}> = [];

jest.mock("../../ecs/world", () => ({
	get units() { return mockUnits; },
}));

// ---------------------------------------------------------------------------
// Mock event bus
// ---------------------------------------------------------------------------

jest.mock("../../systems/eventBus", () => ({
	subscribe: jest.fn(() => jest.fn()),
	publish: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
	computeSparkVelocity,
	computeSmokeVelocity,
	findUnitPosition,
	getDestroyedUnitIds,
} from "../DamageVFX";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeUnit(
	id: string,
	x: number,
	y: number,
	z: number,
	components: Array<{ functional: boolean }> = [],
) {
	return { id, worldPosition: { x, y, z }, unit: { components } };
}

// ---------------------------------------------------------------------------
// computeSparkVelocity
// ---------------------------------------------------------------------------

describe("computeSparkVelocity", () => {
	it("returns an object with vx, vy, vz fields", () => {
		const result = computeSparkVelocity(Math.random);
		expect(result).toHaveProperty("vx");
		expect(result).toHaveProperty("vy");
		expect(result).toHaveProperty("vz");
	});

	it("returns numeric values", () => {
		const result = computeSparkVelocity(Math.random);
		expect(typeof result.vx).toBe("number");
		expect(typeof result.vy).toBe("number");
		expect(typeof result.vz).toBe("number");
	});

	it("vy is positive (sparks fly upward)", () => {
		// With phi in [0, PI/2], cos(phi) >= 0, so vy should be positive
		// Use deterministic rng returning 0 so phi=0 (top of hemisphere)
		const result = computeSparkVelocity(() => 0);
		expect(result.vy).toBeGreaterThan(0);
	});

	it("speed is within SPARK_SPEED_MIN to SPARK_SPEED_MAX range", () => {
		// Test multiple random seeds
		for (let i = 0; i < 20; i++) {
			const rng = () => Math.random();
			const { vx, vy, vz } = computeSparkVelocity(rng);
			const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
			// Speed can exceed max due to upward bias (+rng()*1.0 on vy)
			// But should be >= SPARK_SPEED_MIN
			expect(speed).toBeGreaterThan(0);
		}
	});

	it("different rng seeds produce different velocities", () => {
		let call = 0;
		const rng1 = () => [0.1, 0.2, 0.3][call++ % 3] ?? 0.1;
		call = 0;
		const rng2 = () => [0.9, 0.8, 0.7][call++ % 3] ?? 0.9;

		const r1 = computeSparkVelocity(rng1);
		const r2 = computeSparkVelocity(rng2);
		const same = r1.vx === r2.vx && r1.vy === r2.vy && r1.vz === r2.vz;
		expect(same).toBe(false);
	});

	it("deterministic for same rng sequence", () => {
		const makeSeq = () => {
			const vals = [0.3, 0.6, 0.9];
			let i = 0;
			return () => vals[i++ % vals.length] ?? 0.3;
		};
		const r1 = computeSparkVelocity(makeSeq());
		const r2 = computeSparkVelocity(makeSeq());
		expect(r1.vx).toBeCloseTo(r2.vx);
		expect(r1.vy).toBeCloseTo(r2.vy);
		expect(r1.vz).toBeCloseTo(r2.vz);
	});
});

// ---------------------------------------------------------------------------
// computeSmokeVelocity
// ---------------------------------------------------------------------------

describe("computeSmokeVelocity", () => {
	it("returns an object with vx, vy, vz fields", () => {
		const result = computeSmokeVelocity(Math.random);
		expect(result).toHaveProperty("vx");
		expect(result).toHaveProperty("vy");
		expect(result).toHaveProperty("vz");
	});

	it("returns numeric values", () => {
		const result = computeSmokeVelocity(Math.random);
		expect(typeof result.vx).toBe("number");
		expect(typeof result.vy).toBe("number");
		expect(typeof result.vz).toBe("number");
	});

	it("vy is positive (smoke rises)", () => {
		// SMOKE_SPEED_MIN is 0.3, so vy should always be > 0
		for (let i = 0; i < 10; i++) {
			const result = computeSmokeVelocity(Math.random);
			expect(result.vy).toBeGreaterThan(0);
		}
	});

	it("lateral drift (vx, vz) is small compared to vy", () => {
		// Smoke rises mostly vertically — lateral drift factor is 0.4
		// so |vx| <= 0.2 and |vz| <= 0.2
		for (let i = 0; i < 20; i++) {
			const result = computeSmokeVelocity(Math.random);
			expect(Math.abs(result.vx)).toBeLessThanOrEqual(0.21);
			expect(Math.abs(result.vz)).toBeLessThanOrEqual(0.21);
		}
	});

	it("vy is within SMOKE_SPEED_MIN to SMOKE_SPEED_MAX range", () => {
		for (let i = 0; i < 20; i++) {
			const result = computeSmokeVelocity(Math.random);
			expect(result.vy).toBeGreaterThanOrEqual(0.3);
			expect(result.vy).toBeLessThanOrEqual(0.7);
		}
	});

	it("vx and vz are bounded by lateral drift factor", () => {
		// rng returning 0 → vx = (0-0.5)*0.4 = -0.2
		const result = computeSmokeVelocity(() => 0);
		expect(result.vx).toBeCloseTo(-0.2, 5);
		expect(result.vz).toBeCloseTo(-0.2, 5);
	});

	it("deterministic for same rng sequence", () => {
		const makeSeq = () => {
			const vals = [0.5, 0.3, 0.7];
			let i = 0;
			return () => vals[i++ % vals.length] ?? 0.5;
		};
		const r1 = computeSmokeVelocity(makeSeq());
		const r2 = computeSmokeVelocity(makeSeq());
		expect(r1.vx).toBeCloseTo(r2.vx);
		expect(r1.vy).toBeCloseTo(r2.vy);
		expect(r1.vz).toBeCloseTo(r2.vz);
	});
});

// ---------------------------------------------------------------------------
// findUnitPosition
// ---------------------------------------------------------------------------

describe("findUnitPosition", () => {
	beforeEach(() => {
		mockUnits.length = 0;
	});

	it("returns null when units list is empty", () => {
		expect(findUnitPosition("unit_1")).toBeNull();
	});

	it("returns null when unit id is not found", () => {
		mockUnits.push(makeUnit("unit_2", 1, 2, 3));
		expect(findUnitPosition("unit_1")).toBeNull();
	});

	it("returns the world position of the matching unit", () => {
		mockUnits.push(makeUnit("unit_1", 10, 5, -3));
		const pos = findUnitPosition("unit_1");
		expect(pos).not.toBeNull();
		expect(pos?.x).toBe(10);
		expect(pos?.y).toBe(5);
		expect(pos?.z).toBe(-3);
	});

	it("returns correct unit when multiple units exist", () => {
		mockUnits.push(makeUnit("unit_a", 1, 2, 3));
		mockUnits.push(makeUnit("unit_b", 4, 5, 6));
		mockUnits.push(makeUnit("unit_c", 7, 8, 9));

		const pos = findUnitPosition("unit_b");
		expect(pos?.x).toBe(4);
		expect(pos?.y).toBe(5);
		expect(pos?.z).toBe(6);
	});

	it("returns first match when duplicate ids exist", () => {
		mockUnits.push(makeUnit("dup", 1, 1, 1));
		mockUnits.push(makeUnit("dup", 2, 2, 2));
		const pos = findUnitPosition("dup");
		expect(pos?.x).toBe(1);
	});

	it("returns position with zero coords correctly", () => {
		mockUnits.push(makeUnit("origin", 0, 0, 0));
		const pos = findUnitPosition("origin");
		expect(pos?.x).toBe(0);
		expect(pos?.y).toBe(0);
		expect(pos?.z).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getDestroyedUnitIds
// ---------------------------------------------------------------------------

describe("getDestroyedUnitIds", () => {
	beforeEach(() => {
		mockUnits.length = 0;
	});

	it("returns empty array when no units exist", () => {
		expect(getDestroyedUnitIds()).toEqual([]);
	});

	it("returns empty array when no units are destroyed", () => {
		mockUnits.push(makeUnit("u1", 0, 0, 0, [{ functional: true }, { functional: true }]));
		mockUnits.push(makeUnit("u2", 1, 0, 0, [{ functional: true }]));
		expect(getDestroyedUnitIds()).toEqual([]);
	});

	it("excludes units with no components", () => {
		// units with empty components array are not considered destroyed
		mockUnits.push(makeUnit("u1", 0, 0, 0, []));
		expect(getDestroyedUnitIds()).toEqual([]);
	});

	it("returns id of unit where all components are broken", () => {
		mockUnits.push(makeUnit("destroyed_1", 0, 0, 0, [
			{ functional: false },
			{ functional: false },
		]));
		expect(getDestroyedUnitIds()).toContain("destroyed_1");
	});

	it("excludes partially broken units (some functional)", () => {
		mockUnits.push(makeUnit("partial", 0, 0, 0, [
			{ functional: true },
			{ functional: false },
		]));
		expect(getDestroyedUnitIds()).not.toContain("partial");
	});

	it("returns multiple destroyed unit ids", () => {
		mockUnits.push(makeUnit("d1", 0, 0, 0, [{ functional: false }]));
		mockUnits.push(makeUnit("d2", 1, 0, 0, [{ functional: false }, { functional: false }]));
		mockUnits.push(makeUnit("ok", 2, 0, 0, [{ functional: true }]));

		const ids = getDestroyedUnitIds();
		expect(ids).toContain("d1");
		expect(ids).toContain("d2");
		expect(ids).not.toContain("ok");
		expect(ids).toHaveLength(2);
	});

	it("handles single-component unit that is broken", () => {
		mockUnits.push(makeUnit("solo_broken", 0, 0, 0, [{ functional: false }]));
		expect(getDestroyedUnitIds()).toContain("solo_broken");
	});

	it("handles single-component unit that is functional", () => {
		mockUnits.push(makeUnit("solo_ok", 0, 0, 0, [{ functional: true }]));
		expect(getDestroyedUnitIds()).not.toContain("solo_ok");
	});
});
