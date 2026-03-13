import type { PathResult } from "./navmesh";

// ── Mock session and city catalog ──────────────────────────────────

const mockStructures: { q: number; r: number; model_id: string; placement_layer: string }[] = [];
const mockModelEffects = new Map<string, string>();

jest.mock("../world/session", () => ({
	getActiveWorldSession: () => ({
		sectorStructures: mockStructures,
	}),
}));

jest.mock("../city/catalog/cityCatalog", () => ({
	getCityModelById: (id: string) => {
		const effect = mockModelEffects.get(id);
		if (!effect) return null;
		return { id, passabilityEffect: effect };
	},
}));

import {
	getBlockedCells,
	getCachedPath,
	setCachedPath,
	invalidatePathCache,
	invalidateUnitPathCache,
	getStructureGeneration,
	_resetPathfindingCache,
} from "./pathfindingCache";

beforeEach(() => {
	mockStructures.length = 0;
	mockModelEffects.clear();
	_resetPathfindingCache();
});

describe("pathfindingCache", () => {
	describe("getBlockedCells", () => {
		it("returns empty set when no structures exist", () => {
			const blocked = getBlockedCells();
			expect(blocked.size).toBe(0);
		});

		it("detects blocking structures on structure layer", () => {
			mockModelEffects.set("wall_1", "blocking");
			mockStructures.push({
				q: 3,
				r: 4,
				model_id: "wall_1",
				placement_layer: "structure",
			});

			invalidatePathCache();
			const blocked = getBlockedCells();
			expect(blocked.has("3,4")).toBe(true);
		});

		it("ignores blocking structures on non-structure layers", () => {
			mockModelEffects.set("detail_blocking", "blocking");
			mockStructures.push({
				q: 5,
				r: 6,
				model_id: "detail_blocking",
				placement_layer: "detail",
			});

			invalidatePathCache();
			const blocked = getBlockedCells();
			expect(blocked.has("5,6")).toBe(false);
		});

		it("ignores non-blocking structures", () => {
			mockModelEffects.set("door_1", "walkable");
			mockStructures.push({
				q: 1,
				r: 2,
				model_id: "door_1",
				placement_layer: "structure",
			});

			invalidatePathCache();
			const blocked = getBlockedCells();
			expect(blocked.has("1,2")).toBe(false);
		});

		it("caches results until invalidated", () => {
			mockModelEffects.set("wall_1", "blocking");
			mockStructures.push({
				q: 1,
				r: 1,
				model_id: "wall_1",
				placement_layer: "structure",
			});
			invalidatePathCache();

			const first = getBlockedCells();
			expect(first.has("1,1")).toBe(true);

			// Add another structure without invalidating
			mockStructures.push({
				q: 2,
				r: 2,
				model_id: "wall_1",
				placement_layer: "structure",
			});

			// Should still return cached result
			const second = getBlockedCells();
			expect(second.has("2,2")).toBe(false);

			// After invalidation, should pick up new structure
			invalidatePathCache();
			const third = getBlockedCells();
			expect(third.has("2,2")).toBe(true);
		});
	});

	describe("path cache", () => {
		const mockResult: PathResult = {
			path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
			cost: 2,
			valid: true,
		};

		it("stores and retrieves cached paths", () => {
			setCachedPath("unit-1", 0, 0, 2, 0, mockResult);
			const cached = getCachedPath("unit-1", 0, 0, 2, 0);
			expect(cached).toEqual(mockResult);
		});

		it("returns null for uncached paths", () => {
			const cached = getCachedPath("unit-1", 0, 0, 5, 5);
			expect(cached).toBeNull();
		});

		it("separates caches per unit", () => {
			setCachedPath("unit-1", 0, 0, 2, 0, mockResult);
			const cached = getCachedPath("unit-2", 0, 0, 2, 0);
			expect(cached).toBeNull();
		});

		it("clears all unit caches on invalidatePathCache", () => {
			setCachedPath("unit-1", 0, 0, 2, 0, mockResult);
			setCachedPath("unit-2", 0, 0, 3, 0, mockResult);
			invalidatePathCache();

			expect(getCachedPath("unit-1", 0, 0, 2, 0)).toBeNull();
			expect(getCachedPath("unit-2", 0, 0, 3, 0)).toBeNull();
		});

		it("clears only one unit on invalidateUnitPathCache", () => {
			setCachedPath("unit-1", 0, 0, 2, 0, mockResult);
			setCachedPath("unit-2", 0, 0, 3, 0, mockResult);
			invalidateUnitPathCache("unit-1");

			expect(getCachedPath("unit-1", 0, 0, 2, 0)).toBeNull();
			expect(getCachedPath("unit-2", 0, 0, 3, 0)).toEqual(mockResult);
		});
	});

	describe("structure generation counter", () => {
		it("starts at 0", () => {
			expect(getStructureGeneration()).toBe(0);
		});

		it("increments on invalidatePathCache", () => {
			invalidatePathCache();
			expect(getStructureGeneration()).toBe(1);
			invalidatePathCache();
			expect(getStructureGeneration()).toBe(2);
		});
	});
});
