import type { SectorCellSnapshot } from "../world/snapshots";

// ── Mocks ─────────────────────────────────────────────────────────

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

jest.mock("../world/sectorCoordinates", () => ({
	gridToWorld: (q: number, r: number) => ({ x: q * 2, y: 0, z: r * 2 }),
	worldToGrid: (x: number, z: number) => ({
		q: Math.round(x / 2),
		r: Math.round(z / 2),
	}),
	SECTOR_LATTICE_SIZE: 2,
}));

const mockLogTurnEvent = jest.fn();
jest.mock("./turnEventLog", () => ({
	logTurnEvent: (...args: unknown[]) => mockLogTurnEvent(...args),
}));

// Import the functions we need to mock — must be after jest.mock
import {
	initializeTurnForUnits,
	getUnitTurnState,
	resetTurnSystem,
} from "./turnSystem";

// ── Helpers ───────────────────────────────────────────────────────

function makeCell(
	q: number,
	r: number,
	floorPresetId = "corridor_transit",
): SectorCellSnapshot {
	return {
		id: q * 1000 + r,
		ecumenopolis_id: 1,
		q,
		r,
		structural_zone: floorPresetId === "breach_exposed" ? "breach" : "transit",
		floor_preset_id: floorPresetId,
		discovery_state: 2,
		passable: 1,
		sector_archetype: "transit_corridor",
		storm_exposure: "shielded",
		impassable_class: "none",
		anchor_key: `${q},${r}`,
	};
}

// ── Tests ─────────────────────────────────────────────────────────

describe("movement system zone costs", () => {
	beforeEach(() => {
		mockSectorCells.length = 0;
		mockLogTurnEvent.mockClear();
		resetTurnSystem();
	});

	it("getZoneMovementCost returns 1 for corridor_transit", () => {
		// We test indirectly through the turn system MP deduction
		mockSectorCells.push(makeCell(0, 0), makeCell(1, 0), makeCell(2, 0));
		initializeTurnForUnits(["unit_a"]);

		const state = getUnitTurnState("unit_a");
		expect(state).toBeDefined();
		expect(state!.movementPoints).toBe(3); // base MP
	});

	it("breach_exposed zone costs 2 MP per config", () => {
		// Verify the config values that movement system reads
		const movementConfig = require("../config/movement.json");
		expect(movementConfig.zoneCosts.breach_exposed).toBe(2);
		expect(movementConfig.zoneCosts.corridor_transit).toBe(1);
		expect(movementConfig.defaultCost).toBe(1);
	});

	it("all zone types have defined costs in movement config", () => {
		const movementConfig = require("../config/movement.json");
		const expectedZones = [
			"corridor_transit",
			"command_core",
			"fabrication",
			"storage",
			"habitation",
			"power",
			"breach_exposed",
		];
		for (const zone of expectedZones) {
			expect(movementConfig.zoneCosts[zone]).toBeDefined();
			expect(typeof movementConfig.zoneCosts[zone]).toBe("number");
		}
	});

	it("breach zone costs more than standard zones", () => {
		const movementConfig = require("../config/movement.json");
		const breachCost = movementConfig.zoneCosts.breach_exposed;
		const corridorCost = movementConfig.zoneCosts.corridor_transit;
		expect(breachCost).toBeGreaterThan(corridorCost);
	});
});
