/**
 * Unit tests for the fog of war manager system.
 *
 * Tests cover:
 * - Initialization: initFogMap creates per-faction grids
 * - State transitions: hidden → explored → visible (one-way upgrade)
 * - revealCell: only upgrades, never downgrades
 * - getCellState: returns correct state for each level
 * - getExploredPercentage: fraction of explored + visible cells
 * - getVisibleCells: returns only currently visible cells
 * - clearVisibility: visible → explored, hidden stays hidden
 * - fogOfWarManagerSystem: full tick (clear + re-reveal per faction)
 * - resetFogOfWar: clears all faction state
 * - Faction isolation: each faction has independent fog
 * - Edge cases: out-of-bounds, unknown factions, empty maps
 * - Vision circle shape: cells follow circular pattern
 */

// ---------------------------------------------------------------------------
// Mocks — jest.mock factories must not reference outer variables (hoisted)
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		rendering: {
			fogOfWar: {
				defaultVisionRange: 6,
				cameraVisionBonus: 10,
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
	FOG_EXPLORED,
	FOG_HIDDEN,
	FOG_VISIBLE,
	clearVisibility,
	fogOfWarManagerSystem,
	getCellState,
	getExploredPercentage,
	getVisibleCells,
	initFogMap,
	resetFogOfWar,
	revealCell,
} from "../fogOfWarManager";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetFogOfWar();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countCellsInCircle(radius: number): number {
	const r = Math.ceil(radius);
	const rSq = radius * radius;
	let count = 0;
	for (let dz = -r; dz <= r; dz++) {
		for (let dx = -r; dx <= r; dx++) {
			if (dx * dx + dz * dz <= rSq) count++;
		}
	}
	return count;
}

// ---------------------------------------------------------------------------
// initFogMap
// ---------------------------------------------------------------------------

describe("initFogMap", () => {
	it("creates a fog map for a faction", () => {
		initFogMap("player", 10, 10);
		// All cells should start hidden
		expect(getCellState("player", 0, 0)).toBe("hidden");
		expect(getCellState("player", 5, 5)).toBe("hidden");
		expect(getCellState("player", 9, 9)).toBe("hidden");
	});

	it("reinitializes an existing faction map", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 3, 3, FOG_VISIBLE);
		expect(getCellState("player", 3, 3)).toBe("visible");

		// Reinitialize — should reset all cells
		initFogMap("player", 10, 10);
		expect(getCellState("player", 3, 3)).toBe("hidden");
	});

	it("supports different map sizes per faction", () => {
		initFogMap("player", 20, 20);
		initFogMap("enemy", 10, 10);

		// Player map has cell (15, 15), enemy does not
		revealCell("player", 15, 15, FOG_VISIBLE);
		expect(getCellState("player", 15, 15)).toBe("visible");

		revealCell("enemy", 15, 15, FOG_VISIBLE);
		// Out of bounds for enemy — should remain hidden
		expect(getCellState("enemy", 15, 15)).toBe("hidden");
	});

	it("handles zero-size map gracefully", () => {
		initFogMap("player", 0, 0);
		expect(getCellState("player", 0, 0)).toBe("hidden");
	});
});

// ---------------------------------------------------------------------------
// revealCell
// ---------------------------------------------------------------------------

describe("revealCell", () => {
	beforeEach(() => {
		initFogMap("player", 20, 20);
	});

	it("sets a hidden cell to explored", () => {
		revealCell("player", 5, 5, FOG_EXPLORED);
		expect(getCellState("player", 5, 5)).toBe("explored");
	});

	it("sets a hidden cell to visible", () => {
		revealCell("player", 5, 5, FOG_VISIBLE);
		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("upgrades explored to visible", () => {
		revealCell("player", 5, 5, FOG_EXPLORED);
		revealCell("player", 5, 5, FOG_VISIBLE);
		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("does NOT downgrade visible to explored", () => {
		revealCell("player", 5, 5, FOG_VISIBLE);
		revealCell("player", 5, 5, FOG_EXPLORED);
		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("does NOT downgrade explored to hidden", () => {
		revealCell("player", 5, 5, FOG_EXPLORED);
		revealCell("player", 5, 5, FOG_HIDDEN);
		expect(getCellState("player", 5, 5)).toBe("explored");
	});

	it("does NOT downgrade visible to hidden", () => {
		revealCell("player", 5, 5, FOG_VISIBLE);
		revealCell("player", 5, 5, FOG_HIDDEN);
		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("is a no-op for unknown faction", () => {
		revealCell("unknown", 5, 5, FOG_VISIBLE);
		expect(getCellState("unknown", 5, 5)).toBe("hidden");
	});

	it("is a no-op for out-of-bounds coordinates (negative)", () => {
		revealCell("player", -1, -1, FOG_VISIBLE);
		// Should not throw, and nearby cells unaffected
		expect(getCellState("player", 0, 0)).toBe("hidden");
	});

	it("is a no-op for out-of-bounds coordinates (too large)", () => {
		revealCell("player", 20, 20, FOG_VISIBLE);
		expect(getCellState("player", 19, 19)).toBe("hidden");
	});
});

// ---------------------------------------------------------------------------
// getCellState
// ---------------------------------------------------------------------------

describe("getCellState", () => {
	it("returns 'hidden' for unknown faction", () => {
		expect(getCellState("nonexistent", 0, 0)).toBe("hidden");
	});

	it("returns 'hidden' for out-of-bounds coordinates", () => {
		initFogMap("player", 10, 10);
		expect(getCellState("player", -1, 0)).toBe("hidden");
		expect(getCellState("player", 0, -1)).toBe("hidden");
		expect(getCellState("player", 10, 0)).toBe("hidden");
		expect(getCellState("player", 0, 10)).toBe("hidden");
		expect(getCellState("player", 999, 999)).toBe("hidden");
	});

	it("returns correct state for each fog level", () => {
		initFogMap("player", 10, 10);
		expect(getCellState("player", 0, 0)).toBe("hidden");

		revealCell("player", 0, 0, FOG_EXPLORED);
		expect(getCellState("player", 0, 0)).toBe("explored");

		revealCell("player", 0, 0, FOG_VISIBLE);
		expect(getCellState("player", 0, 0)).toBe("visible");
	});
});

// ---------------------------------------------------------------------------
// getExploredPercentage
// ---------------------------------------------------------------------------

describe("getExploredPercentage", () => {
	it("returns 0 for unknown faction", () => {
		expect(getExploredPercentage("nonexistent")).toBe(0);
	});

	it("returns 0 for a fully hidden map", () => {
		initFogMap("player", 10, 10);
		expect(getExploredPercentage("player")).toBe(0);
	});

	it("returns 1.0 for a fully explored map", () => {
		initFogMap("player", 4, 4);
		for (let z = 0; z < 4; z++) {
			for (let x = 0; x < 4; x++) {
				revealCell("player", x, z, FOG_EXPLORED);
			}
		}
		expect(getExploredPercentage("player")).toBe(1.0);
	});

	it("returns 1.0 for a fully visible map", () => {
		initFogMap("player", 4, 4);
		for (let z = 0; z < 4; z++) {
			for (let x = 0; x < 4; x++) {
				revealCell("player", x, z, FOG_VISIBLE);
			}
		}
		expect(getExploredPercentage("player")).toBe(1.0);
	});

	it("counts both explored and visible cells", () => {
		initFogMap("player", 10, 10); // 100 cells total
		// Reveal 25 as explored
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				revealCell("player", x, z, FOG_EXPLORED);
			}
		}
		expect(getExploredPercentage("player")).toBeCloseTo(0.25, 5);
	});

	it("returns correct percentage with mixed states", () => {
		initFogMap("player", 10, 10); // 100 cells
		// 10 explored + 10 visible = 20 / 100 = 0.2
		for (let x = 0; x < 10; x++) {
			revealCell("player", x, 0, FOG_EXPLORED);
		}
		for (let x = 0; x < 10; x++) {
			revealCell("player", x, 1, FOG_VISIBLE);
		}
		expect(getExploredPercentage("player")).toBeCloseTo(0.2, 5);
	});
});

// ---------------------------------------------------------------------------
// getVisibleCells
// ---------------------------------------------------------------------------

describe("getVisibleCells", () => {
	it("returns empty array for unknown faction", () => {
		expect(getVisibleCells("nonexistent")).toEqual([]);
	});

	it("returns empty array when no cells are visible", () => {
		initFogMap("player", 10, 10);
		expect(getVisibleCells("player")).toEqual([]);
	});

	it("returns empty array when all revealed cells are only explored", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 3, 3, FOG_EXPLORED);
		revealCell("player", 5, 5, FOG_EXPLORED);
		expect(getVisibleCells("player")).toEqual([]);
	});

	it("returns only visible cells, not explored ones", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 2, 3, FOG_EXPLORED);
		revealCell("player", 5, 7, FOG_VISIBLE);
		revealCell("player", 8, 1, FOG_VISIBLE);

		const visible = getVisibleCells("player");
		expect(visible).toHaveLength(2);
		expect(visible).toContainEqual({ x: 5, z: 7 });
		expect(visible).toContainEqual({ x: 8, z: 1 });
	});

	it("returns correct coordinates from flat index", () => {
		initFogMap("player", 5, 5);
		// Cell at (3, 2) → index = 2 * 5 + 3 = 13
		revealCell("player", 3, 2, FOG_VISIBLE);

		const visible = getVisibleCells("player");
		expect(visible).toEqual([{ x: 3, z: 2 }]);
	});
});

// ---------------------------------------------------------------------------
// clearVisibility
// ---------------------------------------------------------------------------

describe("clearVisibility", () => {
	it("downgrades all visible cells to explored", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 3, 3, FOG_VISIBLE);
		revealCell("player", 7, 7, FOG_VISIBLE);

		clearVisibility("player");

		expect(getCellState("player", 3, 3)).toBe("explored");
		expect(getCellState("player", 7, 7)).toBe("explored");
	});

	it("does not affect explored cells", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 3, 3, FOG_EXPLORED);

		clearVisibility("player");

		expect(getCellState("player", 3, 3)).toBe("explored");
	});

	it("does not affect hidden cells", () => {
		initFogMap("player", 10, 10);

		clearVisibility("player");

		expect(getCellState("player", 3, 3)).toBe("hidden");
	});

	it("is a no-op for unknown faction", () => {
		// Should not throw
		expect(() => clearVisibility("unknown")).not.toThrow();
	});

	it("getVisibleCells returns empty after clearVisibility", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 3, 3, FOG_VISIBLE);
		expect(getVisibleCells("player")).toHaveLength(1);

		clearVisibility("player");
		expect(getVisibleCells("player")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// fogOfWarManagerSystem — full tick
// ---------------------------------------------------------------------------

describe("fogOfWarManagerSystem", () => {
	it("reveals cells within unit vision range", () => {
		initFogMap("player", 30, 30);

		const factionUnits = new Map([
			["player", [{ x: 15, z: 15, visionRange: 3 }]],
		]);

		fogOfWarManagerSystem(factionUnits);

		// Center should be visible
		expect(getCellState("player", 15, 15)).toBe("visible");
		// Cell within range
		expect(getCellState("player", 17, 15)).toBe("visible");
		// Cell outside range
		expect(getCellState("player", 19, 15)).toBe("hidden");
	});

	it("decays visible to explored when unit moves away", () => {
		initFogMap("player", 30, 30);

		// Tick 1: unit at (10, 10)
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 10, z: 10, visionRange: 3 }]]]),
		);
		expect(getCellState("player", 10, 10)).toBe("visible");

		// Tick 2: unit at (25, 25)
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 25, z: 25, visionRange: 3 }]]]),
		);

		// Old position should be explored, not hidden
		expect(getCellState("player", 10, 10)).toBe("explored");
		// New position should be visible
		expect(getCellState("player", 25, 25)).toBe("visible");
	});

	it("explored cells never revert to hidden", () => {
		initFogMap("player", 30, 30);

		// Tick 1: reveal (10, 10) area
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 10, z: 10, visionRange: 3 }]]]),
		);

		// Tick 2: move away
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 25, z: 25, visionRange: 3 }]]]),
		);
		expect(getCellState("player", 10, 10)).toBe("explored");

		// Tick 3: move further away
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5, z: 5, visionRange: 3 }]]]),
		);
		// Cell at (10,10) is still explored — never goes back to hidden
		expect(getCellState("player", 10, 10)).toBe("explored");
	});

	it("processes multiple factions independently", () => {
		initFogMap("player", 30, 30);
		initFogMap("enemy", 30, 30);

		fogOfWarManagerSystem(
			new Map([
				["player", [{ x: 5, z: 5, visionRange: 3 }]],
				["enemy", [{ x: 20, z: 20, visionRange: 3 }]],
			]),
		);

		// Player sees (5,5) but not (20,20)
		expect(getCellState("player", 5, 5)).toBe("visible");
		expect(getCellState("player", 20, 20)).toBe("hidden");

		// Enemy sees (20,20) but not (5,5)
		expect(getCellState("enemy", 20, 20)).toBe("visible");
		expect(getCellState("enemy", 5, 5)).toBe("hidden");
	});

	it("processes multiple units per faction", () => {
		initFogMap("player", 30, 30);

		fogOfWarManagerSystem(
			new Map([
				[
					"player",
					[
						{ x: 5, z: 5, visionRange: 2 },
						{ x: 25, z: 25, visionRange: 2 },
					],
				],
			]),
		);

		expect(getCellState("player", 5, 5)).toBe("visible");
		expect(getCellState("player", 25, 25)).toBe("visible");
		// Far from both units
		expect(getCellState("player", 15, 15)).toBe("hidden");
	});

	it("skips factions without initialized maps", () => {
		// Only init "player", not "unknown"
		initFogMap("player", 30, 30);

		expect(() => {
			fogOfWarManagerSystem(
				new Map([
					["player", [{ x: 5, z: 5, visionRange: 3 }]],
					["unknown", [{ x: 10, z: 10, visionRange: 3 }]],
				]),
			);
		}).not.toThrow();

		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("handles empty unit list for a faction (just clears visibility)", () => {
		initFogMap("player", 20, 20);

		// Tick 1: reveal cells
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 10, z: 10, visionRange: 3 }]]]),
		);
		expect(getCellState("player", 10, 10)).toBe("visible");

		// Tick 2: no units — everything decays
		fogOfWarManagerSystem(new Map([["player", []]]));
		expect(getCellState("player", 10, 10)).toBe("explored");
	});

	it("handles empty factionUnits map", () => {
		initFogMap("player", 10, 10);
		expect(() => {
			fogOfWarManagerSystem(new Map());
		}).not.toThrow();
	});

	it("uses per-unit visionRange values", () => {
		initFogMap("player", 40, 40);

		fogOfWarManagerSystem(
			new Map([
				[
					"player",
					[
						{ x: 10, z: 10, visionRange: 2 },
						{ x: 30, z: 30, visionRange: 5 },
					],
				],
			]),
		);

		// Short-range unit: 3 cells away should NOT be visible
		expect(getCellState("player", 13, 10)).toBe("hidden");
		// Long-range unit: 4 cells away should be visible
		expect(getCellState("player", 34, 30)).toBe("visible");
	});
});

// ---------------------------------------------------------------------------
// Vision circle shape
// ---------------------------------------------------------------------------

describe("vision circle shape", () => {
	it("reveals cells in a circle, not a square", () => {
		initFogMap("player", 30, 30);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 15, z: 15, visionRange: 4 }]]]),
		);

		// On-axis at range: (19, 15) → distance 4 → should be visible
		expect(getCellState("player", 19, 15)).toBe("visible");
		// Diagonal at (19, 19) → distance sqrt(32) ≈ 5.66 > 4 → hidden
		expect(getCellState("player", 19, 19)).toBe("hidden");
		// Diagonal at (18, 18) → distance sqrt(18) ≈ 4.24 > 4 → hidden
		expect(getCellState("player", 18, 18)).toBe("hidden");
		// Diagonal at (17, 17) → distance sqrt(8) ≈ 2.83 < 4 → visible
		expect(getCellState("player", 17, 17)).toBe("visible");
	});

	it("includes the center cell", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 10, z: 10, visionRange: 3 }]]]),
		);

		expect(getCellState("player", 10, 10)).toBe("visible");
	});

	it("cell count matches expected circle area", () => {
		initFogMap("player", 30, 30);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 15, z: 15, visionRange: 4 }]]]),
		);

		const visible = getVisibleCells("player");
		const expected = countCellsInCircle(4);
		expect(visible).toHaveLength(expected);
	});
});

// ---------------------------------------------------------------------------
// Faction isolation
// ---------------------------------------------------------------------------

describe("faction isolation", () => {
	it("revealCell on one faction does not affect another", () => {
		initFogMap("player", 10, 10);
		initFogMap("enemy", 10, 10);

		revealCell("player", 5, 5, FOG_VISIBLE);

		expect(getCellState("player", 5, 5)).toBe("visible");
		expect(getCellState("enemy", 5, 5)).toBe("hidden");
	});

	it("clearVisibility on one faction does not affect another", () => {
		initFogMap("player", 10, 10);
		initFogMap("enemy", 10, 10);

		revealCell("player", 5, 5, FOG_VISIBLE);
		revealCell("enemy", 5, 5, FOG_VISIBLE);

		clearVisibility("player");

		expect(getCellState("player", 5, 5)).toBe("explored");
		expect(getCellState("enemy", 5, 5)).toBe("visible");
	});

	it("getExploredPercentage is per-faction", () => {
		initFogMap("player", 10, 10); // 100 cells
		initFogMap("enemy", 10, 10);

		// Reveal 50 cells for player
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 10; x++) {
				revealCell("player", x, z, FOG_EXPLORED);
			}
		}

		expect(getExploredPercentage("player")).toBeCloseTo(0.5, 5);
		expect(getExploredPercentage("enemy")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// resetFogOfWar
// ---------------------------------------------------------------------------

describe("resetFogOfWar", () => {
	it("removes all faction maps", () => {
		initFogMap("player", 10, 10);
		initFogMap("enemy", 10, 10);
		revealCell("player", 5, 5, FOG_VISIBLE);
		revealCell("enemy", 5, 5, FOG_VISIBLE);

		resetFogOfWar();

		// Both factions should report hidden (no map exists)
		expect(getCellState("player", 5, 5)).toBe("hidden");
		expect(getCellState("enemy", 5, 5)).toBe("hidden");
	});

	it("explored percentage returns 0 after reset", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 5, 5, FOG_VISIBLE);
		expect(getExploredPercentage("player")).toBeGreaterThan(0);

		resetFogOfWar();
		expect(getExploredPercentage("player")).toBe(0);
	});

	it("getVisibleCells returns empty after reset", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 5, 5, FOG_VISIBLE);
		expect(getVisibleCells("player")).toHaveLength(1);

		resetFogOfWar();
		expect(getVisibleCells("player")).toEqual([]);
	});

	it("maps can be re-initialized after reset", () => {
		initFogMap("player", 10, 10);
		revealCell("player", 5, 5, FOG_VISIBLE);

		resetFogOfWar();

		initFogMap("player", 10, 10);
		expect(getCellState("player", 5, 5)).toBe("hidden");
		revealCell("player", 5, 5, FOG_EXPLORED);
		expect(getCellState("player", 5, 5)).toBe("explored");
	});

	it("is a no-op when no maps exist", () => {
		expect(() => resetFogOfWar()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("unit at map boundary reveals only valid cells", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 0, z: 0, visionRange: 3 }]]]),
		);

		// Center should be visible
		expect(getCellState("player", 0, 0)).toBe("visible");
		// Cells within range that are in bounds
		expect(getCellState("player", 2, 0)).toBe("visible");
		// Negative coords should just be hidden (out of bounds)
		expect(getCellState("player", -1, 0)).toBe("hidden");
	});

	it("unit at far corner of map", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 19, z: 19, visionRange: 3 }]]]),
		);

		expect(getCellState("player", 19, 19)).toBe("visible");
		expect(getCellState("player", 17, 19)).toBe("visible");
	});

	it("unit with visionRange 0 reveals only its own cell", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 10, z: 10, visionRange: 0 }]]]),
		);

		expect(getCellState("player", 10, 10)).toBe("visible");
		expect(getCellState("player", 11, 10)).toBe("hidden");
		expect(getCellState("player", 10, 11)).toBe("hidden");
	});

	it("unit with fractional position uses Math.floor for grid alignment", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5.7, z: 3.2, visionRange: 1 }]]]),
		);

		// Math.floor(5.7) = 5, Math.floor(3.2) = 3
		expect(getCellState("player", 5, 3)).toBe("visible");
	});

	it("large vision range covers entire small map", () => {
		initFogMap("player", 5, 5);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 2, z: 2, visionRange: 10 }]]]),
		);

		// Every cell should be visible
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				expect(getCellState("player", x, z)).toBe("visible");
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Multi-tick simulation
// ---------------------------------------------------------------------------

describe("multi-tick simulation", () => {
	it("tracks unit movement across multiple ticks", () => {
		initFogMap("player", 30, 30);

		// Tick 1: unit at (5, 5)
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5, z: 5, visionRange: 2 }]]]),
		);
		expect(getCellState("player", 5, 5)).toBe("visible");

		// Tick 2: unit moves to (15, 15)
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 15, z: 15, visionRange: 2 }]]]),
		);
		expect(getCellState("player", 5, 5)).toBe("explored");
		expect(getCellState("player", 15, 15)).toBe("visible");

		// Tick 3: unit moves to (25, 25)
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 25, z: 25, visionRange: 2 }]]]),
		);
		expect(getCellState("player", 5, 5)).toBe("explored");
		expect(getCellState("player", 15, 15)).toBe("explored");
		expect(getCellState("player", 25, 25)).toBe("visible");
	});

	it("unit returning to previously explored area makes it visible again", () => {
		initFogMap("player", 30, 30);

		// Tick 1: at origin area
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5, z: 5, visionRange: 2 }]]]),
		);

		// Tick 2: move away
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 25, z: 25, visionRange: 2 }]]]),
		);
		expect(getCellState("player", 5, 5)).toBe("explored");

		// Tick 3: return
		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5, z: 5, visionRange: 2 }]]]),
		);
		expect(getCellState("player", 5, 5)).toBe("visible");
	});

	it("multiple factions evolve independently over ticks", () => {
		initFogMap("player", 30, 30);
		initFogMap("enemy", 30, 30);

		// Tick 1
		fogOfWarManagerSystem(
			new Map([
				["player", [{ x: 5, z: 5, visionRange: 2 }]],
				["enemy", [{ x: 25, z: 25, visionRange: 2 }]],
			]),
		);

		// Tick 2: player moves, enemy stays
		fogOfWarManagerSystem(
			new Map([
				["player", [{ x: 20, z: 20, visionRange: 2 }]],
				["enemy", [{ x: 25, z: 25, visionRange: 2 }]],
			]),
		);

		// Player old area decayed
		expect(getCellState("player", 5, 5)).toBe("explored");
		// Enemy stayed — still visible
		expect(getCellState("enemy", 25, 25)).toBe("visible");
	});

	it("explored percentage only increases over time", () => {
		initFogMap("player", 20, 20);

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 5, z: 5, visionRange: 2 }]]]),
		);
		const pct1 = getExploredPercentage("player");

		fogOfWarManagerSystem(
			new Map([["player", [{ x: 15, z: 15, visionRange: 2 }]]]),
		);
		const pct2 = getExploredPercentage("player");

		expect(pct2).toBeGreaterThan(pct1);
	});
});
