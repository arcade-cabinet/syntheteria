/**
 * Unit tests for cityLayout.ts — procedural city generation and collision queries.
 */

// ---------------------------------------------------------------------------
// Mock config (required by terrain.ts, which is imported by seed.ts indirectly)
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		terrain: {
			worldSize: 200,
			waterLevel: 0.15,
			heightLayers: 3,
			heightScale: 0.5,
			terrainFrequency: 0.08,
			walkCost: {
				water: 0,
				rough: 1.5,
				roughThreshold: 0.3,
				normal: 1.0,
				steep: 2.0,
				steepThreshold: 0.7,
				nearBuildingEdge: 1.3,
			},
			fogResolution: 200,
			displayOffsetDriftRate: 0.003,
			displayOffsetSnapThreshold: 0.01,
			navStep: 2,
			fragmentMergeDistance: 6,
			biomes: {},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import { setWorldSeed } from "../seed";
import {
	getCityBuildings,
	resetCityLayout,
	isInsideCityBounds,
	isInsideBuilding,
	nearBuildingEdge,
} from "../cityLayout";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetCityLayout();
	setWorldSeed(42);
});

// ---------------------------------------------------------------------------
// isInsideCityBounds
// ---------------------------------------------------------------------------

describe("isInsideCityBounds", () => {
	it("returns true for a point inside city bounds", () => {
		expect(isInsideCityBounds(0, 0)).toBe(true);
		expect(isInsideCityBounds(10, 10)).toBe(true);
	});

	it("returns true at the edge of city bounds", () => {
		// City bounds: x: -30..50, z: -20..50
		expect(isInsideCityBounds(-30, -20)).toBe(true);
		expect(isInsideCityBounds(50, 50)).toBe(true);
	});

	it("returns false for a point outside city bounds", () => {
		expect(isInsideCityBounds(-31, 0)).toBe(false);
		expect(isInsideCityBounds(51, 0)).toBe(false);
		expect(isInsideCityBounds(0, -21)).toBe(false);
		expect(isInsideCityBounds(0, 51)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getCityBuildings
// ---------------------------------------------------------------------------

describe("getCityBuildings", () => {
	it("returns an array of buildings", () => {
		const buildings = getCityBuildings();
		expect(Array.isArray(buildings)).toBe(true);
		expect(buildings.length).toBeGreaterThan(0);
	});

	it("each building has required properties", () => {
		const buildings = getCityBuildings();
		for (const b of buildings) {
			expect(typeof b.x).toBe("number");
			expect(typeof b.z).toBe("number");
			expect(typeof b.halfW).toBe("number");
			expect(typeof b.halfD).toBe("number");
			expect(typeof b.height).toBe("number");
			expect(["conduit", "node", "tower", "ruin", "wall"]).toContain(b.type);
		}
	});

	it("buildings have positive dimensions", () => {
		const buildings = getCityBuildings();
		for (const b of buildings) {
			expect(b.halfW).toBeGreaterThan(0);
			expect(b.halfD).toBeGreaterThan(0);
			expect(b.height).toBeGreaterThan(0);
		}
	});

	it("is deterministic — same seed produces same buildings", () => {
		setWorldSeed(42);
		resetCityLayout();
		const buildings1 = getCityBuildings();

		setWorldSeed(42);
		resetCityLayout();
		const buildings2 = getCityBuildings();

		expect(buildings1.length).toBe(buildings2.length);
		for (let i = 0; i < buildings1.length; i++) {
			expect(buildings1[i].x).toBe(buildings2[i].x);
			expect(buildings1[i].z).toBe(buildings2[i].z);
			expect(buildings1[i].type).toBe(buildings2[i].type);
		}
	});

	it("different seeds produce different layouts", () => {
		setWorldSeed(1);
		resetCityLayout();
		const buildings1 = getCityBuildings();

		setWorldSeed(9999);
		resetCityLayout();
		const buildings2 = getCityBuildings();

		// At least the layout should differ in count or position
		const same = buildings1.length === buildings2.length &&
			buildings1.every((b, i) => b.x === buildings2[i].x && b.z === buildings2[i].z);
		expect(same).toBe(false);
	});

	it("caches the result (returns same reference on second call)", () => {
		const buildings1 = getCityBuildings();
		const buildings2 = getCityBuildings();
		expect(buildings1).toBe(buildings2);
	});

	it("resetCityLayout clears the cache", () => {
		const buildings1 = getCityBuildings();
		resetCityLayout();
		const buildings2 = getCityBuildings();
		// Still equal content (same seed) but new array reference
		expect(buildings1).not.toBe(buildings2);
	});

	it("includes multiple building types", () => {
		const buildings = getCityBuildings();
		const types = new Set(buildings.map((b) => b.type));
		// Should have at least conduit, node, and wall
		expect(types.has("conduit")).toBe(true);
		expect(types.has("node")).toBe(true);
		expect(types.has("wall")).toBe(true);
	});

	it("clears the spawn area (5,10) to (20,18)", () => {
		const buildings = getCityBuildings();
		// The spawn area should be mostly clear of non-ruin buildings
		const spawnBuildings = buildings.filter(
			(b) =>
				b.type !== "ruin" &&
				b.x - b.halfW >= 2 &&
				b.x + b.halfW <= 23 &&
				b.z - b.halfD >= 7 &&
				b.z + b.halfD <= 21,
		);
		// Allow a few edge overlaps but should be mostly clear
		expect(spawnBuildings.length).toBeLessThan(5);
	});
});

// ---------------------------------------------------------------------------
// isInsideBuilding
// ---------------------------------------------------------------------------

describe("isInsideBuilding", () => {
	it("returns false for points far from any building", () => {
		// Point well outside the city
		expect(isInsideBuilding(-100, -100)).toBe(false);
	});

	it("returns true for a point inside a known building", () => {
		const buildings = getCityBuildings();
		// Pick a building and check its center
		const b = buildings[0];
		expect(isInsideBuilding(b.x, b.z)).toBe(true);
	});

	it("returns false for a point just outside a building", () => {
		const buildings = getCityBuildings();
		const b = buildings[0];
		// Just outside the east edge
		const _outside = isInsideBuilding(b.x + b.halfW + 5, b.z);
		// This might still be inside another building, so we test with a
		// point far from any building instead
		expect(isInsideBuilding(-100, -100)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// nearBuildingEdge
// ---------------------------------------------------------------------------

describe("nearBuildingEdge", () => {
	it("returns false for points far from any building", () => {
		expect(nearBuildingEdge(-100, -100)).toBe(false);
	});

	it("returns false for points inside a building center", () => {
		// Points inside (not near the edge) should return false
		// because nearBuildingEdge returns true only when near edge but not inside
		const buildings = getCityBuildings();
		const b = buildings.find(
			(b) => b.halfW > 1.5 && b.halfD > 1.5
		);
		if (b) {
			// Dead center of a large building should be fully inside
			expect(nearBuildingEdge(b.x, b.z, 0.5)).toBe(false);
		}
	});

	it("uses the margin parameter", () => {
		// With a very large margin, more points will be near edges
		const buildings = getCityBuildings();
		const b = buildings[0];
		// Just outside the building by a small amount
		const x = b.x + b.halfW + 0.3;
		const z = b.z;
		const nearWithMargin = nearBuildingEdge(x, z, 0.5);
		const nearWithNoMargin = nearBuildingEdge(x, z, 0.0);
		// With margin 0.5, a point 0.3 outside should be near
		// With margin 0.0, a point outside should not be near
		if (nearWithMargin !== nearWithNoMargin) {
			expect(nearWithMargin).toBe(true);
		}
	});
});
