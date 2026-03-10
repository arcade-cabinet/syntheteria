/**
 * Unit tests for terrain.ts — procedural terrain, fog of war, fragment management.
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
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

import {
	WORLD_SIZE,
	WORLD_HALF,
	FOG_RES,
	initTerrainFromSeed,
	getTerrainHeight,
	isWalkable,
	getWalkCost,
	createFragment,
	getFragment,
	getAllFragments,
	deleteFragment,
	clusterFragments,
	updateDisplayOffsets,
	worldToFogIndex,
	getFogAt,
	setFogAt,
	type FogState,
} from "../terrain";

// ---------------------------------------------------------------------------
// Setup / teardown — clean fragment state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Delete all fragments
	for (const f of getAllFragments()) {
		deleteFragment(f.id);
	}
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("terrain constants", () => {
	it("WORLD_SIZE matches config", () => {
		expect(WORLD_SIZE).toBe(200);
	});

	it("WORLD_HALF is half of WORLD_SIZE", () => {
		expect(WORLD_HALF).toBe(100);
	});

	it("FOG_RES matches config", () => {
		expect(FOG_RES).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// initTerrainFromSeed + getTerrainHeight
// ---------------------------------------------------------------------------

describe("getTerrainHeight", () => {
	it("returns a number", () => {
		initTerrainFromSeed(42);
		const h = getTerrainHeight(0, 0);
		expect(typeof h).toBe("number");
	});

	it("returns values within [0, heightScale] range", () => {
		initTerrainFromSeed(42);
		for (let x = -50; x <= 50; x += 10) {
			for (let z = -50; z <= 50; z += 10) {
				const h = getTerrainHeight(x, z);
				expect(h).toBeGreaterThanOrEqual(0);
				expect(h).toBeLessThanOrEqual(0.5); // heightScale = 0.5
			}
		}
	});

	it("is deterministic — same seed + position gives same height", () => {
		initTerrainFromSeed(42);
		const h1 = getTerrainHeight(10, 20);
		initTerrainFromSeed(42);
		const h2 = getTerrainHeight(10, 20);
		expect(h1).toBe(h2);
	});

	it("different seeds produce different terrain", () => {
		initTerrainFromSeed(1);
		const h1 = getTerrainHeight(10, 20);
		initTerrainFromSeed(2);
		const h2 = getTerrainHeight(10, 20);
		expect(h1).not.toBe(h2);
	});

	it("varies across positions (not flat)", () => {
		initTerrainFromSeed(42);
		const h1 = getTerrainHeight(0, 0);
		const h2 = getTerrainHeight(50, 50);
		const h3 = getTerrainHeight(-30, 20);
		// At least two of these should differ
		const unique = new Set([h1, h2, h3]);
		expect(unique.size).toBeGreaterThan(1);
	});
});

// ---------------------------------------------------------------------------
// isWalkable
// ---------------------------------------------------------------------------

describe("isWalkable", () => {
	beforeEach(() => {
		initTerrainFromSeed(42);
	});

	it("returns a boolean", () => {
		expect(typeof isWalkable(0, 0)).toBe("boolean");
	});

	it("returns true for terrain above the water level", () => {
		// At (0,0) the base is 0.5 which is above water level 0.15
		// The sinusoidal modulation should keep it walkable at most positions
		expect(isWalkable(0, 0)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getWalkCost
// ---------------------------------------------------------------------------

describe("getWalkCost", () => {
	beforeEach(() => {
		initTerrainFromSeed(42);
	});

	it("returns a number", () => {
		expect(typeof getWalkCost(0, 0)).toBe("number");
	});

	it("returns one of the configured walk cost values", () => {
		const validCosts = [0, 1.0, 1.5, 2.0]; // water, normal, rough, steep
		const cost = getWalkCost(0, 0);
		expect(validCosts).toContain(cost);
	});
});

// ---------------------------------------------------------------------------
// Fragment CRUD
// ---------------------------------------------------------------------------

describe("fragment management", () => {
	it("createFragment returns a fragment with a unique id", () => {
		const f1 = createFragment();
		const f2 = createFragment();
		expect(f1.id).not.toBe(f2.id);
	});

	it("createFragment returns a fragment with zeroed fog grid", () => {
		const f = createFragment();
		expect(f.fog).toBeInstanceOf(Uint8Array);
		expect(f.fog.length).toBe(FOG_RES * FOG_RES);
		for (let i = 0; i < f.fog.length; i++) {
			expect(f.fog[i]).toBe(0);
		}
	});

	it("createFragment returns a fragment with zero display offset", () => {
		const f = createFragment();
		expect(f.displayOffset).toEqual({ x: 0, z: 0 });
	});

	it("createFragment returns a fragment with empty mergedWith set", () => {
		const f = createFragment();
		expect(f.mergedWith).toBeInstanceOf(Set);
		expect(f.mergedWith.size).toBe(0);
	});

	it("getFragment retrieves a created fragment by id", () => {
		const f = createFragment();
		const retrieved = getFragment(f.id);
		expect(retrieved).toBe(f);
	});

	it("getFragment returns undefined for unknown id", () => {
		expect(getFragment("nonexistent")).toBeUndefined();
	});

	it("getAllFragments returns all created fragments", () => {
		const f1 = createFragment();
		const f2 = createFragment();
		const all = getAllFragments();
		expect(all).toContainEqual(f1);
		expect(all).toContainEqual(f2);
	});

	it("deleteFragment removes a fragment", () => {
		const f = createFragment();
		deleteFragment(f.id);
		expect(getFragment(f.id)).toBeUndefined();
	});

	it("deleteFragment is idempotent", () => {
		const f = createFragment();
		deleteFragment(f.id);
		deleteFragment(f.id); // should not throw
		expect(getFragment(f.id)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// worldToFogIndex
// ---------------------------------------------------------------------------

describe("worldToFogIndex", () => {
	it("returns a valid index for the center of the world", () => {
		const idx = worldToFogIndex(0, 0);
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(idx).toBeLessThan(FOG_RES * FOG_RES);
	});

	it("returns a valid index at the negative edge of the world", () => {
		const idx = worldToFogIndex(-WORLD_HALF, -WORLD_HALF);
		expect(idx).toBe(0);
	});

	it("returns -1 for positions outside the world", () => {
		expect(worldToFogIndex(-WORLD_HALF - 1, 0)).toBe(-1);
		expect(worldToFogIndex(0, -WORLD_HALF - 1)).toBe(-1);
		expect(worldToFogIndex(WORLD_HALF, 0)).toBe(-1);
		expect(worldToFogIndex(0, WORLD_HALF)).toBe(-1);
	});

	it("returns correct row-major index", () => {
		// worldToFogIndex computes: gz * FOG_RES + gx
		// where gx = floor(x + WORLD_HALF), gz = floor(z + WORLD_HALF)
		const idx = worldToFogIndex(-WORLD_HALF + 5, -WORLD_HALF + 3);
		expect(idx).toBe(3 * FOG_RES + 5);
	});
});

// ---------------------------------------------------------------------------
// getFogAt / setFogAt
// ---------------------------------------------------------------------------

describe("fog state", () => {
	it("new fragment has all fog at 0 (unexplored)", () => {
		const f = createFragment();
		expect(getFogAt(f, 0, 0)).toBe(0);
		expect(getFogAt(f, 10, 10)).toBe(0);
	});

	it("setFogAt upgrades fog state", () => {
		const f = createFragment();
		setFogAt(f, 0, 0, 1);
		expect(getFogAt(f, 0, 0)).toBe(1);
	});

	it("setFogAt does not downgrade fog state", () => {
		const f = createFragment();
		setFogAt(f, 0, 0, 2); // detailed
		setFogAt(f, 0, 0, 1); // try to downgrade to abstract
		expect(getFogAt(f, 0, 0)).toBe(2);
	});

	it("setFogAt can upgrade from abstract to detailed", () => {
		const f = createFragment();
		setFogAt(f, 0, 0, 1);
		setFogAt(f, 0, 0, 2);
		expect(getFogAt(f, 0, 0)).toBe(2);
	});

	it("getFogAt returns 0 for out-of-bounds positions", () => {
		const f = createFragment();
		expect(getFogAt(f, -WORLD_HALF - 10, 0)).toBe(0);
		expect(getFogAt(f, 0, WORLD_HALF + 10)).toBe(0);
	});

	it("setFogAt is a no-op for out-of-bounds positions", () => {
		const f = createFragment();
		setFogAt(f, -WORLD_HALF - 10, 0, 2);
		// Should not throw and no change observable
		expect(getFogAt(f, -WORLD_HALF - 10, 0)).toBe(0);
	});

	it("fog changes are isolated to one fragment", () => {
		const f1 = createFragment();
		const f2 = createFragment();
		setFogAt(f1, 0, 0, 2);
		expect(getFogAt(f1, 0, 0)).toBe(2);
		expect(getFogAt(f2, 0, 0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// clusterFragments
// ---------------------------------------------------------------------------

describe("clusterFragments", () => {
	it("does nothing when there is only one fragment", () => {
		const f = createFragment();
		const centers = new Map([[f.id, { x: 50, z: 50 }]]);
		clusterFragments(centers, 10);
		expect(f.displayOffset.x).toBe(0);
		expect(f.displayOffset.z).toBe(0);
	});

	it("sets display offsets for fragments beyond the cluster radius", () => {
		const f1 = createFragment();
		const f2 = createFragment();
		const centers = new Map([
			[f1.id, { x: -50, z: 0 }],
			[f2.id, { x: 50, z: 0 }],
		]);
		clusterFragments(centers, 10);

		// Both should now have nonzero offsets pulling them closer
		// Their offsets should bring displayed positions within radius of centroid
		const displayedX1 = -50 + f1.displayOffset.x;
		const displayedX2 = 50 + f2.displayOffset.x;
		const centroid = 0;
		expect(Math.abs(displayedX1 - centroid)).toBeLessThanOrEqual(10 + 0.01);
		expect(Math.abs(displayedX2 - centroid)).toBeLessThanOrEqual(10 + 0.01);
	});

	it("does not set offsets for fragments already within radius", () => {
		const f1 = createFragment();
		const f2 = createFragment();
		const centers = new Map([
			[f1.id, { x: -3, z: 0 }],
			[f2.id, { x: 3, z: 0 }],
		]);
		clusterFragments(centers, 10);

		// Both are within radius of centroid, no offset needed
		expect(f1.displayOffset.x).toBe(0);
		expect(f1.displayOffset.z).toBe(0);
		expect(f2.displayOffset.x).toBe(0);
		expect(f2.displayOffset.z).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// updateDisplayOffsets
// ---------------------------------------------------------------------------

describe("updateDisplayOffsets", () => {
	it("decays display offsets toward zero", () => {
		const f = createFragment();
		f.displayOffset.x = 100;
		f.displayOffset.z = 100;

		updateDisplayOffsets();

		expect(f.displayOffset.x).toBeLessThan(100);
		expect(f.displayOffset.z).toBeLessThan(100);
		expect(f.displayOffset.x).toBeGreaterThan(0);
		expect(f.displayOffset.z).toBeGreaterThan(0);
	});

	it("snaps to zero when below threshold", () => {
		const f = createFragment();
		f.displayOffset.x = 0.005; // below snap threshold of 0.01
		f.displayOffset.z = 0.005;

		updateDisplayOffsets();

		expect(f.displayOffset.x).toBe(0);
		expect(f.displayOffset.z).toBe(0);
	});

	it("does not snap when above threshold", () => {
		const f = createFragment();
		f.displayOffset.x = 10;
		f.displayOffset.z = 10;

		updateDisplayOffsets();

		expect(f.displayOffset.x).not.toBe(0);
		expect(f.displayOffset.z).not.toBe(0);
	});

	it("eventually converges to zero after many ticks", () => {
		const f = createFragment();
		f.displayOffset.x = 100;
		f.displayOffset.z = 100;

		for (let i = 0; i < 10000; i++) {
			updateDisplayOffsets();
		}

		expect(f.displayOffset.x).toBe(0);
		expect(f.displayOffset.z).toBe(0);
	});
});
