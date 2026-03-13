import type { SectorCellSnapshot, SectorStructureSnapshot, WorldSessionSnapshot } from "../world/snapshots";

// ── Mock world session ─────────────────────────────────────────────

const mockSectorCells: SectorCellSnapshot[] = [];
const mockSectorStructures: SectorStructureSnapshot[] = [];

jest.mock("../world/session", () => ({
	getActiveWorldSession: () => ({
		sectorCells: mockSectorCells,
		sectorStructures: mockSectorStructures,
	}),
	requireActiveWorldSession: () => ({
		sectorCells: mockSectorCells,
		sectorStructures: mockSectorStructures,
	}),
}));

// ── Mock city catalog for passability lookups ──────────────────────

const mockModelPassability = new Map<string, string>();

jest.mock("../city/catalog/cityCatalog", () => ({
	getCityModelById: (id: string) => {
		const effect = mockModelPassability.get(id);
		if (!effect) return null;
		return { id, passabilityEffect: effect };
	},
	CITY_MODELS: [],
	getCityComposites: () => [],
}));

import { findNavPath, findNavPathWithCost, findReachableCells } from "./navmesh";
import { _resetPathfindingCache, invalidatePathCache } from "./pathfindingCache";
import { setWorldDimensions } from "../world/sectorCoordinates";

// ── Test helpers ───────────────────────────────────────────────────

function makeCell(
	q: number,
	r: number,
	passable: boolean,
	floorPresetId = "corridor_transit",
	structuralZone = "transit",
): SectorCellSnapshot {
	return {
		id: q * 1000 + r,
		ecumenopolis_id: 1,
		q,
		r,
		structural_zone: structuralZone,
		floor_preset_id: floorPresetId,
		discovery_state: 2,
		passable: passable ? 1 : 0,
		sector_archetype: "transit_corridor",
		storm_exposure: "shielded",
		impassable_class: passable ? "none" : "breach",
		anchor_key: `${q},${r}`,
	};
}

function makeStructure(
	q: number,
	r: number,
	modelId: string,
	placementLayer = "structure",
): SectorStructureSnapshot {
	return {
		id: q * 1000 + r + 50000,
		ecumenopolis_id: 1,
		district_structure_id: "test_district",
		anchor_key: `${q},${r}`,
		q,
		r,
		model_id: modelId,
		placement_layer: placementLayer,
		edge: null,
		rotation_quarter_turns: 0,
		offset_x: 0,
		offset_y: 0,
		offset_z: 0,
		target_span: 2,
		sector_archetype: "transit_corridor",
		source: "seeded_district",
		controller_faction: null,
	};
}

/**
 * Build a simple grid of passable cells from (0,0) to (width-1, height-1).
 */
function buildGrid(
	width: number,
	height: number,
	opts?: {
		impassable?: { q: number; r: number }[];
		breach?: { q: number; r: number }[];
	},
) {
	const impassableSet = new Set(
		(opts?.impassable ?? []).map((c) => `${c.q},${c.r}`),
	);
	const breachSet = new Set(
		(opts?.breach ?? []).map((c) => `${c.q},${c.r}`),
	);

	mockSectorCells.length = 0;
	for (let q = 0; q < width; q++) {
		for (let r = 0; r < height; r++) {
			const key = `${q},${r}`;
			const isImpassable = impassableSet.has(key);
			const isBreach = breachSet.has(key);
			mockSectorCells.push(
				makeCell(
					q,
					r,
					!isImpassable,
					isBreach ? "breach_exposed" : "corridor_transit",
					isBreach ? "breach" : "transit",
				),
			);
		}
	}
	setWorldDimensions({ width, height });
}

// SECTOR_LATTICE_SIZE is 2, so grid(q,r) maps to world(q*2, r*2).
const L = 2;

beforeEach(() => {
	mockSectorCells.length = 0;
	mockSectorStructures.length = 0;
	mockModelPassability.clear();
	_resetPathfindingCache();
});

// ── Tests ──────────────────────────────────────────────────────────

describe("A* grid pathfinding", () => {
	describe("basic pathfinding", () => {
		it("finds a straight-line path on open grid", () => {
			buildGrid(5, 5);
			const path = findNavPath(0, 0, 4 * L, 0);
			expect(path.length).toBeGreaterThan(0);
			expect(path[path.length - 1]).toEqual({ q: 4, r: 0 });
		});

		it("returns empty path when start is impassable", () => {
			buildGrid(5, 5, { impassable: [{ q: 0, r: 0 }] });
			const path = findNavPath(0, 0, 4 * L, 0);
			expect(path).toEqual([]);
		});

		it("returns empty path when goal is impassable", () => {
			buildGrid(5, 5, { impassable: [{ q: 4, r: 0 }] });
			const path = findNavPath(0, 0, 4 * L, 0);
			expect(path).toEqual([]);
		});

		it("routes around impassable cells", () => {
			// Wall at (2,0) blocks direct route from (0,0) to (4,0)
			buildGrid(5, 3, { impassable: [{ q: 2, r: 0 }] });
			const path = findNavPath(0, 0, 4 * L, 0);
			expect(path.length).toBeGreaterThan(0);
			// Path should not go through (2,0)
			const goesThrough2_0 = path.some((p) => p.q === 2 && p.r === 0);
			expect(goesThrough2_0).toBe(false);
			expect(path[path.length - 1]).toEqual({ q: 4, r: 0 });
		});

		it("returns empty path when no route exists", () => {
			// Wall completely blocking row 0 at q=2
			buildGrid(5, 1, { impassable: [{ q: 2, r: 0 }] });
			const path = findNavPath(0, 0, 4 * L, 0);
			expect(path).toEqual([]);
		});
	});

	describe("structure collision awareness", () => {
		it("avoids cells with blocking structures", () => {
			buildGrid(5, 3);
			// Place a blocking structure at (2,0)
			mockModelPassability.set("wall_heavy", "blocking");
			mockSectorStructures.push(makeStructure(2, 0, "wall_heavy"));
			invalidatePathCache();

			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			const goesThrough2_0 = result.path.some(
				(p) => p.q === 2 && p.r === 0,
			);
			expect(goesThrough2_0).toBe(false);
		});

		it("allows cells with non-blocking structures", () => {
			buildGrid(5, 1);
			// Place a walkable structure at (2,0)
			mockModelPassability.set("door_1", "walkable");
			mockSectorStructures.push(makeStructure(2, 0, "door_1"));
			invalidatePathCache();

			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			// Path can go through (2,0) since it's walkable
			const goesThrough2_0 = result.path.some(
				(p) => p.q === 2 && p.r === 0,
			);
			expect(goesThrough2_0).toBe(true);
		});

		it("ignores blocking structures on non-structure layers", () => {
			buildGrid(5, 1);
			// Detail layer structures should not block
			mockModelPassability.set("column_blocking", "blocking");
			mockSectorStructures.push(
				makeStructure(2, 0, "column_blocking", "detail"),
			);
			invalidatePathCache();

			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			const goesThrough2_0 = result.path.some(
				(p) => p.q === 2 && p.r === 0,
			);
			expect(goesThrough2_0).toBe(true);
		});

		it("returns empty path when goal cell has blocking structure", () => {
			buildGrid(5, 1);
			mockModelPassability.set("wall_heavy", "blocking");
			mockSectorStructures.push(makeStructure(4, 0, "wall_heavy"));
			invalidatePathCache();

			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(false);
			expect(result.path).toEqual([]);
		});
	});

	describe("cost tracking", () => {
		it("reports correct cost for uniform-cost path", () => {
			buildGrid(5, 1);
			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			// 4 cells traversed at cost 1 each (corridor_transit)
			expect(result.cost).toBe(4);
		});

		it("reports higher cost for breach zone cells", () => {
			buildGrid(5, 1, { breach: [{ q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }] });
			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			// Cells 1,2,3 are breach (cost 2 each), cell 4 is corridor (cost 1) = 7
			expect(result.cost).toBe(7);
		});

		it("prefers cheaper route when available", () => {
			// Direct path through breach zone is expensive,
			// going around via row 1 (all corridor) is cheaper
			buildGrid(5, 2, { breach: [{ q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }] });
			const result = findNavPathWithCost(0, 0, 4 * L, 0);
			expect(result.valid).toBe(true);
			// The path should avoid breach cells if the detour is cheaper
			const breachCells = result.path.filter(
				(p) => p.r === 0 && p.q >= 1 && p.q <= 3,
			);
			// With 8-directional movement, diagonal through row 1 costs 2
			// vs breach route costing 6. Detour is cheaper.
			expect(breachCells.length).toBeLessThanOrEqual(1);
		});
	});

	describe("path caching", () => {
		it("returns cached result for same unit and endpoints", () => {
			buildGrid(5, 1);
			const first = findNavPathWithCost(0, 0, 4 * L, 0, undefined, "unit-1");
			const second = findNavPathWithCost(0, 0, 4 * L, 0, undefined, "unit-1");
			expect(second).toEqual(first);
		});

		it("invalidates cache on structure change", () => {
			buildGrid(5, 3);
			const first = findNavPathWithCost(0, 0, 4 * L, 0, undefined, "unit-1");
			expect(first.valid).toBe(true);

			// Add blocking structure and invalidate
			mockModelPassability.set("wall_heavy", "blocking");
			mockSectorStructures.push(makeStructure(2, 0, "wall_heavy"));
			invalidatePathCache();

			const second = findNavPathWithCost(0, 0, 4 * L, 0, undefined, "unit-1");
			expect(second.valid).toBe(true);
			// Path should differ — avoids the new wall
			const firstGoesThrough = first.path.some(
				(p) => p.q === 2 && p.r === 0,
			);
			const secondGoesThrough = second.path.some(
				(p) => p.q === 2 && p.r === 0,
			);
			expect(firstGoesThrough).toBe(true);
			expect(secondGoesThrough).toBe(false);
		});
	});

	describe("terrain movement modifiers", () => {
		it("corridor_transit costs 1 MP", () => {
			buildGrid(3, 1);
			const result = findNavPathWithCost(0, 0, 2 * L, 0);
			expect(result.valid).toBe(true);
			expect(result.cost).toBe(2);
		});

		it("breach_exposed costs 2 MP", () => {
			buildGrid(3, 1, { breach: [{ q: 1, r: 0 }] });
			const result = findNavPathWithCost(0, 0, 2 * L, 0);
			expect(result.valid).toBe(true);
			// Cell 1 is breach (2 MP) + cell 2 is corridor (1 MP) = 3
			expect(result.cost).toBe(3);
		});

		it("mixed terrain accumulates costs correctly", () => {
			// Path: corridor(0,0) -> breach(1,0) -> breach(2,0) -> corridor(3,0)
			buildGrid(4, 1, { breach: [{ q: 1, r: 0 }, { q: 2, r: 0 }] });
			const result = findNavPathWithCost(0, 0, 3 * L, 0);
			expect(result.valid).toBe(true);
			// 2 + 2 + 1 = 5
			expect(result.cost).toBe(5);
		});

		it("reachable cells respect terrain costs in MP budget", () => {
			// Center at (2,2), breach at (3,2) costs 2
			buildGrid(5, 5, { breach: [{ q: 3, r: 2 }] });
			const reachable1 = findReachableCells(2 * L, 2 * L, 1);
			// 1 MP cannot reach breach cell
			expect(reachable1.has("3,2")).toBe(false);

			const reachable2 = findReachableCells(2 * L, 2 * L, 2);
			// 2 MP can reach breach cell
			expect(reachable2.has("3,2")).toBe(true);
			expect(reachable2.get("3,2")!.cost).toBe(2);
		});

		it("uses default cost for unknown zone types", () => {
			buildGrid(3, 1);
			// Override a cell with an unknown floor preset
			const unknownCell = mockSectorCells.find(
				(c) => c.q === 1 && c.r === 0,
			);
			if (unknownCell) {
				unknownCell.floor_preset_id = "unknown_zone_type";
			}
			_resetPathfindingCache();

			const result = findNavPathWithCost(0, 0, 2 * L, 0);
			expect(result.valid).toBe(true);
			// Default cost is 1, so 1 + 1 = 2
			expect(result.cost).toBe(2);
		});
	});

	describe("findReachableCells", () => {
		it("returns cells within MP budget", () => {
			buildGrid(5, 5);
			const reachable = findReachableCells(2 * L, 2 * L, 2);
			// With 8-directional movement and cost 1 per cell:
			// 1 MP: 8 neighbors, 2 MP: 16 more neighbors = up to 24 total
			// But grid boundaries may limit this (5x5 grid centered at 2,2)
			expect(reachable.size).toBeGreaterThan(0);

			// All returned cells should have cost <= 2
			for (const [, cell] of reachable) {
				expect(cell.cost).toBeLessThanOrEqual(2);
			}
		});

		it("excludes start cell from results", () => {
			buildGrid(5, 5);
			const reachable = findReachableCells(2 * L, 2 * L, 2);
			expect(reachable.has("2,2")).toBe(false);
		});

		it("excludes cells blocked by structures", () => {
			buildGrid(5, 5);
			mockModelPassability.set("wall_heavy", "blocking");
			mockSectorStructures.push(makeStructure(3, 2, "wall_heavy"));
			invalidatePathCache();

			const reachable = findReachableCells(2 * L, 2 * L, 1);
			expect(reachable.has("3,2")).toBe(false);
		});

		it("respects breach zone costs", () => {
			// Breach cell at (3,2) costs 2 MP to enter
			buildGrid(5, 5, { breach: [{ q: 3, r: 2 }] });
			const reachable1MP = findReachableCells(2 * L, 2 * L, 1);
			// With 1 MP budget, breach cell (cost 2) should not be reachable
			expect(reachable1MP.has("3,2")).toBe(false);

			const reachable2MP = findReachableCells(2 * L, 2 * L, 2);
			// With 2 MP budget, breach cell should be reachable
			expect(reachable2MP.has("3,2")).toBe(true);
			expect(reachable2MP.get("3,2")!.cost).toBe(2);
		});

		it("returns empty map when start is impassable", () => {
			buildGrid(5, 5, { impassable: [{ q: 2, r: 2 }] });
			const reachable = findReachableCells(2 * L, 2 * L, 3);
			expect(reachable.size).toBe(0);
		});
	});
});
