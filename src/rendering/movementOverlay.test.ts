import type { SectorCellSnapshot } from "../world/snapshots";

// ── Mock world session ─────────────────────────────────────────────

const mockSectorCells: SectorCellSnapshot[] = [];

jest.mock("../world/session", () => ({
	getActiveWorldSession: () => ({
		sectorCells: mockSectorCells,
		sectorStructures: [],
	}),
	requireActiveWorldSession: () => ({
		sectorCells: mockSectorCells,
		sectorStructures: [],
	}),
}));

jest.mock("../city/catalog/cityCatalog", () => ({
	getCityModelById: () => null,
	CITY_MODELS: [],
	getCityComposites: () => [],
}));

import { _resetPathfindingCache } from "../systems/pathfindingCache";
import { setWorldDimensions } from "../world/sectorCoordinates";
import { computeMovementOverlay } from "./movementOverlay";

function makeCell(
	q: number,
	r: number,
	passable: boolean,
	floorPresetId = "corridor_transit",
): SectorCellSnapshot {
	return {
		id: q * 1000 + r,
		ecumenopolis_id: 1,
		q,
		r,
		structural_zone: "transit",
		floor_preset_id: floorPresetId,
		discovery_state: 2,
		passable: passable ? 1 : 0,
		sector_archetype: "transit_corridor",
		storm_exposure: "shielded",
		impassable_class: passable ? "none" : "breach",
		anchor_key: `${q},${r}`,
	};
}

function buildGrid(width: number, height: number) {
	mockSectorCells.length = 0;
	for (let q = 0; q < width; q++) {
		for (let r = 0; r < height; r++) {
			mockSectorCells.push(makeCell(q, r, true));
		}
	}
	setWorldDimensions({ width, height });
}

const L = 2; // SECTOR_LATTICE_SIZE

beforeEach(() => {
	mockSectorCells.length = 0;
	_resetPathfindingCache();
});

describe("computeMovementOverlay", () => {
	it("returns empty array for 0 MP", () => {
		buildGrid(5, 5);
		const result = computeMovementOverlay(2 * L, 2 * L, 0);
		expect(result).toEqual([]);
	});

	it("returns reachable cells with intensity values", () => {
		buildGrid(5, 5);
		const result = computeMovementOverlay(2 * L, 2 * L, 2);
		expect(result.length).toBeGreaterThan(0);

		for (const cell of result) {
			expect(cell.cost).toBeGreaterThan(0);
			expect(cell.cost).toBeLessThanOrEqual(2);
			expect(cell.intensity).toBeGreaterThan(0);
			expect(cell.intensity).toBeLessThanOrEqual(1);
		}
	});

	it("closer cells have higher intensity than farther ones", () => {
		buildGrid(7, 7);
		const result = computeMovementOverlay(3 * L, 3 * L, 3);

		const cost1Cells = result.filter((c) => c.cost === 1);
		const cost3Cells = result.filter((c) => c.cost === 3);

		expect(cost1Cells.length).toBeGreaterThan(0);
		expect(cost3Cells.length).toBeGreaterThan(0);

		// Cost-1 cells should have higher intensity than cost-3 cells
		const avgIntensity1 =
			cost1Cells.reduce((s, c) => s + c.intensity, 0) / cost1Cells.length;
		const avgIntensity3 =
			cost3Cells.reduce((s, c) => s + c.intensity, 0) / cost3Cells.length;
		expect(avgIntensity1).toBeGreaterThan(avgIntensity3);
	});

	it("does not include the start cell", () => {
		buildGrid(5, 5);
		const result = computeMovementOverlay(2 * L, 2 * L, 2);
		const hasStart = result.some((c) => c.q === 2 && c.r === 2);
		expect(hasStart).toBe(false);
	});

	it("excludes impassable cells", () => {
		buildGrid(5, 5);
		// Make cell (3,2) impassable
		const cell = mockSectorCells.find((c) => c.q === 3 && c.r === 2);
		if (cell) {
			cell.passable = 0;
			cell.impassable_class = "breach";
		}
		_resetPathfindingCache();

		const result = computeMovementOverlay(2 * L, 2 * L, 1);
		const hasBlocked = result.some((c) => c.q === 3 && c.r === 2);
		expect(hasBlocked).toBe(false);
	});
});
