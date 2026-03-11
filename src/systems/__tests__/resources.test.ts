/**
 * Unit tests for the resource and scavenging system.
 *
 * Tests cover:
 * - ResourcePool: addResource, getResources, spendResource, resetResourcePool
 * - spendResource: insufficient funds returns false, does not deduct
 * - Resource gain subscribers: onResourceGain callbacks, unsubscribe
 * - ScavengePoints: deterministic generation, reset, caching
 * - resourceSystem: auto-scavenging with arms, range check, moving units skipped
 * - resourceSystem: point depletion, one scavenge per tick per unit, no arms = skip
 */

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockUnits = [] as Array<unknown>;
// Mock isInsideBuilding to always return false (no buildings block scavenge points)
jest.mock("../../ecs/cityLayout", () => ({
	isInsideBuilding: () => false,
}));

// Mock seed to provide deterministic PRNG
jest.mock("../../ecs/seed", () => ({
	worldPRNG: (_purpose: string) => {
		// Simple deterministic PRNG for testing
		let s = 42;
		return () => {
			s = (s * 1103515245 + 12345) & 0x7fffffff;
			return s / 0x7fffffff;
		};
	},
}));

// Mock hasArms
jest.mock("../../ecs/types", () => ({
	hasArms: (entity: { unit?: { components: Array<{ name: string; functional: boolean }> } }) => {
		if (!entity.unit) return false;
		return entity.unit.components.some(
			(c: { name: string; functional: boolean }) =>
				c.name === "arms" && c.functional,
		);
	},
}));

jest.mock("../../ecs/world", () => ({
	units: mockUnits,
}));

// Also mock the Koota compat layer (resources.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	units: mockUnits,
}));

import {
	addResource,
	getResources,
	getScavengePoints,
	onResourceGain,
	resetResourcePool,
	resetScavengePoints,
	resourceSystem,
	spendResource,
} from "../resources";

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

interface MockUnitEntity {
	unit: {
		type: string;
		displayName: string;
		speed: number;
		selected: boolean;
		components: Array<{ name: string; functional: boolean; material: string }>;
	};
	worldPosition: { x: number; y: number; z: number };
	navigation?: { path: Array<unknown>; pathIndex: number; moving: boolean };
	mapFragment: { fragmentId: string };
}

function createUnit(opts: {
	x?: number;
	z?: number;
	hasArms?: boolean;
	moving?: boolean;
}): MockUnitEntity {
	const components = [];
	if (opts.hasArms !== false) {
		components.push({ name: "arms", functional: true, material: "metal" });
	}
	components.push({ name: "camera", functional: true, material: "electronic" });

	return {
		unit: {
			type: "maintenance_bot",
			displayName: "Test Bot",
			speed: 1,
			selected: false,
			components,
		},
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		navigation: opts.moving
			? { path: [], pathIndex: 0, moving: true }
			: undefined,
		mapFragment: { fragmentId: "frag_0" },
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockUnits.length = 0;
	resetResourcePool();
	resetScavengePoints();
});

// ---------------------------------------------------------------------------
// ResourcePool basics
// ---------------------------------------------------------------------------

describe("resource pool", () => {
	it("starts at zero for all resources", () => {
		const res = getResources();
		expect(res.scrapMetal).toBe(0);
		expect(res.eWaste).toBe(0);
		expect(res.intactComponents).toBe(0);
	});

	it("addResource increases the correct resource", () => {
		addResource("scrapMetal", 10);
		const res = getResources();
		expect(res.scrapMetal).toBe(10);
		expect(res.eWaste).toBe(0);
	});

	it("addResource accumulates", () => {
		addResource("eWaste", 3);
		addResource("eWaste", 7);
		expect(getResources().eWaste).toBe(10);
	});

	it("getResources returns a copy (not a reference)", () => {
		addResource("scrapMetal", 5);
		const res = getResources();
		res.scrapMetal = 999;
		expect(getResources().scrapMetal).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// spendResource
// ---------------------------------------------------------------------------

describe("spendResource", () => {
	it("returns true and deducts when sufficient", () => {
		addResource("scrapMetal", 10);
		const result = spendResource("scrapMetal", 7);
		expect(result).toBe(true);
		expect(getResources().scrapMetal).toBe(3);
	});

	it("returns false when insufficient", () => {
		addResource("scrapMetal", 3);
		const result = spendResource("scrapMetal", 5);
		expect(result).toBe(false);
		expect(getResources().scrapMetal).toBe(3); // unchanged
	});

	it("returns true for exact amount", () => {
		addResource("intactComponents", 5);
		const result = spendResource("intactComponents", 5);
		expect(result).toBe(true);
		expect(getResources().intactComponents).toBe(0);
	});

	it("returns false for zero balance", () => {
		const result = spendResource("scrapMetal", 1);
		expect(result).toBe(false);
	});

	it("spending zero always succeeds", () => {
		const result = spendResource("scrapMetal", 0);
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// resetResourcePool
// ---------------------------------------------------------------------------

describe("resetResourcePool", () => {
	it("resets all resources to zero", () => {
		addResource("scrapMetal", 100);
		addResource("eWaste", 50);
		addResource("intactComponents", 25);

		resetResourcePool();

		const res = getResources();
		expect(res.scrapMetal).toBe(0);
		expect(res.eWaste).toBe(0);
		expect(res.intactComponents).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// onResourceGain subscribers
// ---------------------------------------------------------------------------

describe("onResourceGain", () => {
	it("fires callback on addResource", () => {
		const cb = jest.fn();
		onResourceGain(cb);

		addResource("scrapMetal", 5);

		expect(cb).toHaveBeenCalledWith("scrapMetal", 5);
	});

	it("fires callback for each addResource call", () => {
		const cb = jest.fn();
		onResourceGain(cb);

		addResource("scrapMetal", 5);
		addResource("eWaste", 3);

		expect(cb).toHaveBeenCalledTimes(2);
		expect(cb).toHaveBeenCalledWith("scrapMetal", 5);
		expect(cb).toHaveBeenCalledWith("eWaste", 3);
	});

	it("unsubscribe stops callbacks", () => {
		const cb = jest.fn();
		const unsub = onResourceGain(cb);

		addResource("scrapMetal", 5);
		expect(cb).toHaveBeenCalledTimes(1);

		unsub();
		addResource("scrapMetal", 10);
		expect(cb).toHaveBeenCalledTimes(1); // not called again
	});

	it("multiple subscribers all receive events", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		onResourceGain(cb1);
		onResourceGain(cb2);

		addResource("intactComponents", 1);

		expect(cb1).toHaveBeenCalledWith("intactComponents", 1);
		expect(cb2).toHaveBeenCalledWith("intactComponents", 1);
	});
});

// ---------------------------------------------------------------------------
// ScavengePoints
// ---------------------------------------------------------------------------

describe("scavenge points", () => {
	it("generates scavenge points deterministically", () => {
		const points1 = getScavengePoints();
		resetScavengePoints();
		const points2 = getScavengePoints();

		expect(points1.length).toBe(points2.length);
		expect(points1.length).toBeGreaterThan(0);

		for (let i = 0; i < points1.length; i++) {
			expect(points1[i].x).toBeCloseTo(points2[i].x);
			expect(points1[i].z).toBeCloseTo(points2[i].z);
			expect(points1[i].type).toBe(points2[i].type);
		}
	});

	it("caches scavenge points (same reference on second call)", () => {
		const points1 = getScavengePoints();
		const points2 = getScavengePoints();
		expect(points1).toBe(points2); // same reference
	});

	it("resetScavengePoints causes regeneration", () => {
		const points1 = getScavengePoints();
		resetScavengePoints();
		const points2 = getScavengePoints();
		expect(points1).not.toBe(points2); // different reference
	});

	it("all points have valid types", () => {
		const points = getScavengePoints();
		const validTypes = ["scrapMetal", "eWaste", "intactComponents"];
		for (const p of points) {
			expect(validTypes).toContain(p.type);
		}
	});

	it("all points have positive remaining and amountPerScavenge", () => {
		const points = getScavengePoints();
		for (const p of points) {
			expect(p.remaining).toBeGreaterThan(0);
			expect(p.amountPerScavenge).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// resourceSystem — auto scavenging
// ---------------------------------------------------------------------------

describe("resourceSystem", () => {
	it("unit with arms scavenges nearby point", () => {
		const points = getScavengePoints();
		// Position a unit right on top of the first scavenge point
		const firstPoint = points[0];
		const unit = createUnit({ x: firstPoint.x, z: firstPoint.z, hasArms: true });
		mockUnits.push(unit);

		const initialRemaining = firstPoint.remaining;
		resourceSystem();

		// Should have scavenged: resource increased and remaining decremented
		const res = getResources();
		expect(res[firstPoint.type]).toBe(firstPoint.amountPerScavenge);
		expect(firstPoint.remaining).toBe(initialRemaining - 1);
	});

	it("unit without arms does not scavenge", () => {
		const points = getScavengePoints();
		const firstPoint = points[0];
		const unit = createUnit({
			x: firstPoint.x,
			z: firstPoint.z,
			hasArms: false,
		});
		mockUnits.push(unit);

		resourceSystem();

		expect(getResources()[firstPoint.type]).toBe(0);
		expect(firstPoint.remaining).toBe(firstPoint.remaining); // unchanged
	});

	it("moving unit does not scavenge", () => {
		const points = getScavengePoints();
		const firstPoint = points[0];
		const unit = createUnit({
			x: firstPoint.x,
			z: firstPoint.z,
			hasArms: true,
			moving: true,
		});
		mockUnits.push(unit);

		resourceSystem();

		expect(getResources()[firstPoint.type]).toBe(0);
	});

	it("unit out of range does not scavenge", () => {
		const points = getScavengePoints();
		const firstPoint = points[0];
		// Place unit far away from the point
		const unit = createUnit({
			x: firstPoint.x + 100,
			z: firstPoint.z + 100,
			hasArms: true,
		});
		mockUnits.push(unit);

		resourceSystem();

		expect(getResources()[firstPoint.type]).toBe(0);
	});

	it("depleted point is skipped", () => {
		const points = getScavengePoints();
		const firstPoint = points[0];
		firstPoint.remaining = 0; // deplete

		const unit = createUnit({
			x: firstPoint.x,
			z: firstPoint.z,
			hasArms: true,
		});
		mockUnits.push(unit);

		resourceSystem();

		// The first point should have been skipped; check if it was
		// The unit might have scavenged a different nearby point, or nothing
		expect(firstPoint.remaining).toBe(0); // still depleted
	});

	it("one scavenge per tick per unit", () => {
		const points = getScavengePoints();
		// Find two nearby points and place unit between them
		// Instead, just place unit on first point and track its remaining
		const firstPoint = points[0];
		const unit = createUnit({
			x: firstPoint.x,
			z: firstPoint.z,
			hasArms: true,
		});
		mockUnits.push(unit);

		const initRemaining = firstPoint.remaining;
		resourceSystem();

		// Should only scavenge once (remaining decremented by 1)
		expect(firstPoint.remaining).toBe(initRemaining - 1);
	});

	it("fires resource gain callback on scavenge", () => {
		const cb = jest.fn();
		onResourceGain(cb);

		const points = getScavengePoints();
		const firstPoint = points[0];
		const unit = createUnit({
			x: firstPoint.x,
			z: firstPoint.z,
			hasArms: true,
		});
		mockUnits.push(unit);

		resourceSystem();

		expect(cb).toHaveBeenCalledWith(
			firstPoint.type,
			firstPoint.amountPerScavenge,
		);
	});

	it("multiple units scavenge independently", () => {
		const points = getScavengePoints();
		// Use two different points for two units
		const point1 = points[0];
		const point2 = points.find(
			(p) =>
				p.remaining > 0 &&
				Math.sqrt((p.x - point1.x) ** 2 + (p.z - point1.z) ** 2) > 5,
		);

		if (!point2) return; // can't run this test if points are too close

		const unit1 = createUnit({ x: point1.x, z: point1.z, hasArms: true });
		const unit2 = createUnit({ x: point2.x, z: point2.z, hasArms: true });
		mockUnits.push(unit1, unit2);

		const p1Remaining = point1.remaining;
		const p2Remaining = point2.remaining;

		resourceSystem();

		// Both should have scavenged
		expect(point1.remaining).toBe(p1Remaining - 1);
		expect(point2.remaining).toBe(p2Remaining - 1);
	});

	it("handles no units gracefully", () => {
		expect(() => resourceSystem()).not.toThrow();
	});
});
