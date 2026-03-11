/**
 * Tests for StockpileGlow — cluster computation logic.
 *
 * The ECS world (placedCubes) is mocked so we can control cube state.
 * Three.js is mocked to isolate from WebGL.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
}

class MockColor {
	constructor(_hex?: number | string) {}
}

jest.mock("three", () => ({
	Vector3: MockVector3,
	Color: MockColor,
}));

// ---------------------------------------------------------------------------
// Config mock
// ---------------------------------------------------------------------------

jest.mock("../../config/cubeMaterials.ts", () => ({
	CUBE_MATERIALS: {
		iron: { glowColor: 0x884422, name: "Iron" },
		copper: { glowColor: 0x88aa44, name: "Copper" },
		gold: { glowColor: 0xffcc00, name: "Gold" },
	},
	getMaterialValue: (matId: string) => {
		const values: Record<string, number> = { iron: 1, copper: 3, gold: 10 };
		return values[matId] ?? 1;
	},
}));

// ---------------------------------------------------------------------------
// ECS world mock — writable Set so tests can control cube state
// ---------------------------------------------------------------------------

const mockPlacedCubes = new Set<unknown>();

jest.mock("../../ecs/world.ts", () => ({
	get placedCubes() { return mockPlacedCubes; },
}));

import {
	getStockpileClusters,
	invalidateStockpileClusters,
} from "../StockpileGlow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCube(x: number, z: number, materialId = "iron", y = 0) {
	return {
		worldPosition: { x, y, z },
		placedCube: { materialId },
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getStockpileClusters", () => {
	beforeEach(() => {
		mockPlacedCubes.clear();
		invalidateStockpileClusters();
	});

	it("returns empty array when no cubes", () => {
		const clusters = getStockpileClusters();
		expect(clusters).toEqual([]);
	});

	it("returns one cluster for a single cube", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters.length).toBe(1);
	});

	it("cluster has correct cubeCount", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		mockPlacedCubes.add(makeCube(1, 0, "iron"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters[0].cubeCount).toBe(2);
	});

	it("clusters adjacent cubes together", () => {
		// All cubes within the same 4-unit grid cell
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		mockPlacedCubes.add(makeCube(1, 0, "iron"));
		mockPlacedCubes.add(makeCube(2, 0, "copper"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		// All within same cell → 1 cluster
		expect(clusters.length).toBe(1);
		expect(clusters[0].cubeCount).toBe(3);
	});

	it("separates distant cubes into separate clusters", () => {
		// Far apart (different non-adjacent grid cells)
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		mockPlacedCubes.add(makeCube(100, 0, "copper"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters.length).toBe(2);
	});

	it("correctly computes totalValue", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron")); // value=1
		mockPlacedCubes.add(makeCube(1, 0, "copper")); // value=3
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters[0].totalValue).toBe(4);
	});

	it("identifies dominant material", () => {
		mockPlacedCubes.add(makeCube(0, 0, "gold"));
		mockPlacedCubes.add(makeCube(1, 0, "gold"));
		mockPlacedCubes.add(makeCube(2, 0, "iron"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters[0].dominantMaterial).toBe("gold");
	});

	it("has a glow color based on dominant material", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters[0].glowColor).toBeDefined();
	});

	it("intensity is at least 0.3 for any cluster", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		expect(clusters[0].intensity).toBeGreaterThanOrEqual(0.3);
	});

	it("intensity is capped at 3.0", () => {
		// Many high-value cubes
		for (let i = 0; i < 100; i++) {
			mockPlacedCubes.add(makeCube(i % 4, Math.floor(i / 4) % 4, "gold"));
		}
		invalidateStockpileClusters();
		const clusters = getStockpileClusters();
		for (const c of clusters) {
			expect(c.intensity).toBeLessThanOrEqual(3.0);
		}
	});

	it("uses cached clusters when cube count unchanged", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		invalidateStockpileClusters();
		const first = getStockpileClusters();
		const second = getStockpileClusters();
		// Same reference (cached)
		expect(first).toBe(second);
	});

	it("recomputes after invalidation", () => {
		mockPlacedCubes.add(makeCube(0, 0, "iron"));
		invalidateStockpileClusters();
		const first = getStockpileClusters();

		mockPlacedCubes.add(makeCube(1, 0, "copper"));
		invalidateStockpileClusters();
		const second = getStockpileClusters();

		expect(second).not.toBe(first);
		expect(second[0].cubeCount).toBe(2);
	});
});

describe("invalidateStockpileClusters", () => {
	it("does not throw", () => {
		expect(() => invalidateStockpileClusters()).not.toThrow();
	});

	it("can be called multiple times", () => {
		invalidateStockpileClusters();
		invalidateStockpileClusters();
		expect(() => getStockpileClusters()).not.toThrow();
	});
});
