import {
	distanceSquaredToCamera,
	getFrustumBounds,
	isAABBInFrustum,
	isInFrustum,
	resetFrustum,
	subscribeFrustum,
	updateFrustum,
} from "./frustumCulling";

beforeEach(() => {
	resetFrustum();
});

describe("updateFrustum", () => {
	test("updates bounds from camera position", () => {
		updateFrustum(0, 0, 20, 45, 16 / 9);
		const bounds = getFrustumBounds();
		expect(bounds.minX).toBeLessThan(0);
		expect(bounds.maxX).toBeGreaterThan(0);
		expect(bounds.minZ).toBeLessThan(0);
		expect(bounds.maxZ).toBeGreaterThan(0);
	});

	test("bounds center follows camera", () => {
		updateFrustum(50, 50, 20, 45, 16 / 9);
		const bounds = getFrustumBounds();
		const centerX = (bounds.minX + bounds.maxX) / 2;
		const centerZ = (bounds.minZ + bounds.maxZ) / 2;
		expect(centerX).toBeCloseTo(50, 0);
		expect(centerZ).toBeCloseTo(50, 0);
	});

	test("higher camera height gives wider bounds", () => {
		updateFrustum(0, 0, 10, 45, 1);
		const low = getFrustumBounds();

		updateFrustum(0, 0, 40, 45, 1);
		const high = getFrustumBounds();

		expect(high.maxX - high.minX).toBeGreaterThan(low.maxX - low.minX);
	});
});

describe("isInFrustum", () => {
	test("center of camera is in frustum", () => {
		updateFrustum(10, 20, 20, 45, 1);
		expect(isInFrustum(10, 20)).toBe(true);
	});

	test("far away point is not in frustum", () => {
		updateFrustum(0, 0, 10, 45, 1);
		expect(isInFrustum(500, 500)).toBe(false);
	});

	test("point near camera edge is in frustum (with padding)", () => {
		updateFrustum(0, 0, 20, 45, 1);
		const bounds = getFrustumBounds();
		// Point just inside bounds
		expect(isInFrustum(bounds.maxX - 1, 0)).toBe(true);
	});
});

describe("isAABBInFrustum", () => {
	test("overlapping AABB is in frustum", () => {
		updateFrustum(0, 0, 20, 45, 1);
		expect(isAABBInFrustum(-5, -5, 5, 5)).toBe(true);
	});

	test("non-overlapping AABB is not in frustum", () => {
		updateFrustum(0, 0, 10, 45, 1);
		expect(isAABBInFrustum(500, 500, 510, 510)).toBe(false);
	});

	test("partially overlapping AABB is in frustum", () => {
		updateFrustum(0, 0, 20, 45, 1);
		const bounds = getFrustumBounds();
		// AABB that straddles the right edge
		expect(isAABBInFrustum(bounds.maxX - 1, -1, bounds.maxX + 10, 1)).toBe(
			true,
		);
	});
});

describe("distanceSquaredToCamera", () => {
	test("center of frustum has distance 0", () => {
		updateFrustum(10, 20, 20, 45, 1);
		expect(distanceSquaredToCamera(10, 20)).toBeCloseTo(0);
	});

	test("returns correct squared distance", () => {
		updateFrustum(0, 0, 20, 45, 1);
		// Point at (3, 4) → distance = 5, squared = 25
		expect(distanceSquaredToCamera(3, 4)).toBeCloseTo(25);
	});
});

describe("subscribeFrustum", () => {
	test("listener is called on update", () => {
		const listener = jest.fn();
		const unsub = subscribeFrustum(listener);
		updateFrustum(0, 0, 20, 45, 1);
		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
	});

	test("unsubscribe stops notifications", () => {
		const listener = jest.fn();
		const unsub = subscribeFrustum(listener);
		unsub();
		updateFrustum(0, 0, 20, 45, 1);
		expect(listener).not.toHaveBeenCalled();
	});
});

describe("resetFrustum", () => {
	test("reset restores default bounds", () => {
		updateFrustum(50, 50, 100, 90, 2);
		resetFrustum();
		const bounds = getFrustumBounds();
		expect(bounds.minX).toBe(-100);
		expect(bounds.maxX).toBe(100);
	});
});
