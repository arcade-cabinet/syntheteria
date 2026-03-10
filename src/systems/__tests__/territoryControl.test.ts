/**
 * Unit tests for the territory control system.
 *
 * Tests cover:
 * - Claiming territory with outposts
 * - Grid cell ownership queries
 * - Territory percentage calculations
 * - Contested cells when factions overlap
 * - Border cell detection
 * - Config integration (resource bonus, building cost reduction)
 * - Multiple factions operating independently
 * - Reset clears all state
 * - Edge cases (out-of-bounds, zero radius, etc.)
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		territory: {
			outpostTiers: [
				{ tier: 1, radius: 3, cubeCost: 20, upgradeCost: 40 },
				{ tier: 2, radius: 5, cubeCost: 40, upgradeCost: 80 },
				{ tier: 3, radius: 8, cubeCost: 80 },
			],
			resourceBonusInTerritory: 1.5,
			buildingCostReduction: 0.8,
			contestationDecayRate: 0.01,
			minimumOutpostSpacing: 15,
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	claimTerritory,
	getOwner,
	getTerritoryPercentage,
	getContestedCells,
	getBorderCells,
	getOwnedCells,
	getOwnedCellCount,
	getResourceBonus,
	getBuildingCostReduction,
	territoryControlSystem,
	resetTerritoryControl,
	setMapSize,
} from "../territoryControl";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetTerritoryControl();
});

// ---------------------------------------------------------------------------
// setMapSize
// ---------------------------------------------------------------------------

describe("setMapSize", () => {
	it("sets the map dimensions for percentage calculations", () => {
		setMapSize(100, 100);
		// No claims yet — percentage should be 0
		expect(getTerritoryPercentage("reclaimers")).toBe(0);
	});

	it("returns 0 percentage when map size is not set", () => {
		// Don't call setMapSize
		claimTerritory("reclaimers", 5, 5, 2);
		expect(getTerritoryPercentage("reclaimers")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// claimTerritory
// ---------------------------------------------------------------------------

describe("claimTerritory", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("claims cells within the circular radius", () => {
		claimTerritory("reclaimers", 10, 10, 2);

		// Center should be owned
		expect(getOwner(10, 10)).toBe("reclaimers");

		// Orthogonal neighbors within radius 2
		expect(getOwner(10, 11)).toBe("reclaimers");
		expect(getOwner(10, 9)).toBe("reclaimers");
		expect(getOwner(11, 10)).toBe("reclaimers");
		expect(getOwner(9, 10)).toBe("reclaimers");
	});

	it("does not claim cells outside the circular radius", () => {
		claimTerritory("reclaimers", 10, 10, 1);

		// Diagonal at distance sqrt(2) ≈ 1.41 is outside radius 1
		expect(getOwner(11, 11)).toBeNull();
		expect(getOwner(9, 9)).toBeNull();
	});

	it("claims diagonal cells when within radius", () => {
		claimTerritory("reclaimers", 10, 10, 2);

		// Diagonal at distance sqrt(2) ≈ 1.41, within radius 2
		expect(getOwner(11, 11)).toBe("reclaimers");
		expect(getOwner(9, 9)).toBe("reclaimers");
	});

	it("does not claim cells out of bounds", () => {
		setMapSize(10, 10);
		claimTerritory("reclaimers", 0, 0, 3);

		// Negative coordinates are out of bounds
		expect(getOwner(-1, 0)).toBeNull();
		expect(getOwner(0, -1)).toBeNull();

		// But cells within bounds should be claimed
		expect(getOwner(0, 0)).toBe("reclaimers");
		expect(getOwner(1, 0)).toBe("reclaimers");
	});

	it("handles zero radius — claims only the center cell", () => {
		claimTerritory("reclaimers", 10, 10, 0);

		expect(getOwner(10, 10)).toBe("reclaimers");
		expect(getOwner(10, 11)).toBeNull();
		expect(getOwner(11, 10)).toBeNull();
	});

	it("stacks claims from the same faction", () => {
		// Two overlapping outposts from same faction
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("reclaimers", 12, 10, 2);

		// Overlap zone should still be reclaimers
		expect(getOwner(11, 10)).toBe("reclaimers");

		// Both centers claimed
		expect(getOwner(10, 10)).toBe("reclaimers");
		expect(getOwner(12, 10)).toBe("reclaimers");
	});
});

// ---------------------------------------------------------------------------
// getOwner
// ---------------------------------------------------------------------------

describe("getOwner", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("returns null for unclaimed cells", () => {
		expect(getOwner(25, 25)).toBeNull();
	});

	it("returns the faction name for claimed cells", () => {
		claimTerritory("volt_collective", 20, 20, 1);
		expect(getOwner(20, 20)).toBe("volt_collective");
	});

	it("returns null for contested cells (equal claims)", () => {
		// Two factions claim the same area
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("volt_collective", 12, 10, 2);

		// Cell at (11, 10) is distance 1 from both outposts — contested
		// Each has 1 claim → tied → contested → null
		expect(getOwner(11, 10)).toBeNull();
	});

	it("returns the dominant faction when one has more claims", () => {
		// Reclaimers place 2 outposts, volt_collective places 1
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("reclaimers", 10, 11, 2);
		claimTerritory("volt_collective", 12, 10, 2);

		// Cell (11, 10): reclaimers have 2 claims, volt has 1 → reclaimers win
		expect(getOwner(11, 10)).toBe("reclaimers");
	});
});

// ---------------------------------------------------------------------------
// getTerritoryPercentage
// ---------------------------------------------------------------------------

describe("getTerritoryPercentage", () => {
	it("returns 0 for factions with no territory", () => {
		setMapSize(10, 10);
		expect(getTerritoryPercentage("reclaimers")).toBe(0);
	});

	it("calculates correct percentage of map controlled", () => {
		setMapSize(10, 10); // 100 total cells

		// Claim a small area — radius 0 = 1 cell
		claimTerritory("reclaimers", 5, 5, 0);

		expect(getTerritoryPercentage("reclaimers")).toBeCloseTo(0.01); // 1/100
	});

	it("returns different percentages for different factions", () => {
		setMapSize(50, 50);

		claimTerritory("reclaimers", 10, 10, 3);
		claimTerritory("volt_collective", 40, 40, 3);

		const rPct = getTerritoryPercentage("reclaimers");
		const vPct = getTerritoryPercentage("volt_collective");

		// Both should have the same percentage (same radius, no overlap)
		expect(rPct).toBeCloseTo(vPct);
		expect(rPct).toBeGreaterThan(0);
	});

	it("does not count contested cells toward any faction", () => {
		setMapSize(50, 50);

		// Overlapping claims create contested cells
		claimTerritory("reclaimers", 10, 10, 3);
		claimTerritory("volt_collective", 13, 10, 3);

		const rPct = getTerritoryPercentage("reclaimers");
		const vPct = getTerritoryPercentage("volt_collective");
		const contested = getContestedCells();

		// Sum of owned + contested should be less than or equal to total claimed
		expect(rPct + vPct).toBeLessThan(1);
		expect(contested.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getContestedCells
// ---------------------------------------------------------------------------

describe("getContestedCells", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("returns empty array when no factions overlap", () => {
		claimTerritory("reclaimers", 5, 5, 2);
		claimTerritory("volt_collective", 40, 40, 2);

		expect(getContestedCells()).toEqual([]);
	});

	it("returns contested cells when factions overlap", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("volt_collective", 12, 10, 2);

		const contested = getContestedCells();
		expect(contested.length).toBeGreaterThan(0);

		// The overlap zone cells should be in the contested list
		const keys = contested.map((c) => `${c.x},${c.z}`);
		expect(keys).toContain("11,10"); // equidistant from both outposts
	});

	it("returns empty when no territory is claimed", () => {
		expect(getContestedCells()).toEqual([]);
	});

	it("cells are not contested when one faction dominates with more outposts", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("reclaimers", 10, 11, 2);
		claimTerritory("volt_collective", 12, 10, 2);

		// Cell (11,10): reclaimers=2 claims, volt=1 → reclaimers dominate → not contested
		const contested = getContestedCells();
		const keys = contested.map((c) => `${c.x},${c.z}`);
		expect(keys).not.toContain("11,10");
	});
});

// ---------------------------------------------------------------------------
// getBorderCells
// ---------------------------------------------------------------------------

describe("getBorderCells", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("returns empty array for factions with no territory", () => {
		territoryControlSystem();
		expect(getBorderCells("reclaimers")).toEqual([]);
	});

	it("identifies border cells adjacent to unclaimed territory", () => {
		claimTerritory("reclaimers", 10, 10, 1);
		territoryControlSystem();

		const borders = getBorderCells("reclaimers");
		// With radius 1, all claimed cells are border cells since they
		// are adjacent to unclaimed cells
		expect(borders.length).toBeGreaterThan(0);
	});

	it("all cells are borders for a small territory", () => {
		// A single cell is always a border
		claimTerritory("reclaimers", 10, 10, 0);
		territoryControlSystem();

		const borders = getBorderCells("reclaimers");
		expect(borders.length).toBe(1);
		expect(borders[0]).toEqual({ x: 10, z: 10 });
	});

	it("interior cells are not borders in larger territories", () => {
		// With radius 3, the center (10,10) has neighbors at (9,10),(11,10),(10,9),(10,11)
		// All within radius — so center is NOT a border
		claimTerritory("reclaimers", 10, 10, 3);
		territoryControlSystem();

		const borders = getBorderCells("reclaimers");
		const borderKeys = borders.map((c) => `${c.x},${c.z}`);

		// Center should not be a border cell (all 4 neighbors are owned)
		expect(borderKeys).not.toContain("10,10");

		// Edge cells should be borders
		expect(borders.length).toBeGreaterThan(0);
	});

	it("cells adjacent to enemy territory are borders", () => {
		claimTerritory("reclaimers", 5, 5, 2);
		claimTerritory("volt_collective", 8, 5, 2);
		territoryControlSystem();

		const rBorders = getBorderCells("reclaimers");
		const vBorders = getBorderCells("volt_collective");

		// Both factions should have border cells facing each other
		expect(rBorders.length).toBeGreaterThan(0);
		expect(vBorders.length).toBeGreaterThan(0);
	});

	it("requires territoryControlSystem() to be called first", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		// Don't call territoryControlSystem — borders not computed
		expect(getBorderCells("reclaimers")).toEqual([]);

		// Now compute
		territoryControlSystem();
		expect(getBorderCells("reclaimers").length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// territoryControlSystem tick
// ---------------------------------------------------------------------------

describe("territoryControlSystem", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("updates border caches on each call", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		territoryControlSystem();

		const borders1 = getBorderCells("reclaimers");

		// Add more territory
		claimTerritory("reclaimers", 10, 15, 2);
		territoryControlSystem();

		const borders2 = getBorderCells("reclaimers");
		// Borders should change after expanding territory
		expect(borders2.length).not.toBe(borders1.length);
	});

	it("handles multiple factions simultaneously", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("volt_collective", 40, 40, 2);
		territoryControlSystem();

		const rBorders = getBorderCells("reclaimers");
		const vBorders = getBorderCells("volt_collective");

		expect(rBorders.length).toBeGreaterThan(0);
		expect(vBorders.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getOwnedCells / getOwnedCellCount
// ---------------------------------------------------------------------------

describe("getOwnedCells / getOwnedCellCount", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("returns empty array and 0 count for factions with no claims", () => {
		expect(getOwnedCells("reclaimers")).toEqual([]);
		expect(getOwnedCellCount("reclaimers")).toBe(0);
	});

	it("returns all owned cells for a faction", () => {
		claimTerritory("reclaimers", 10, 10, 0);
		const cells = getOwnedCells("reclaimers");
		expect(cells).toEqual([{ x: 10, z: 10 }]);
		expect(getOwnedCellCount("reclaimers")).toBe(1);
	});

	it("count matches length of owned cells array", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		const cells = getOwnedCells("reclaimers");
		const count = getOwnedCellCount("reclaimers");
		expect(cells.length).toBe(count);
	});
});

// ---------------------------------------------------------------------------
// Config integration — resource bonus & building cost reduction
// ---------------------------------------------------------------------------

describe("config integration", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("getResourceBonus returns 1.5x inside owned territory", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		expect(getResourceBonus("reclaimers", 10, 10)).toBe(1.5);
	});

	it("getResourceBonus returns 1.0 outside territory", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		expect(getResourceBonus("reclaimers", 40, 40)).toBe(1.0);
	});

	it("getResourceBonus returns 1.0 in enemy territory", () => {
		claimTerritory("volt_collective", 10, 10, 2);
		expect(getResourceBonus("reclaimers", 10, 10)).toBe(1.0);
	});

	it("getBuildingCostReduction returns 0.8 inside owned territory", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		expect(getBuildingCostReduction("reclaimers", 10, 10)).toBe(0.8);
	});

	it("getBuildingCostReduction returns 1.0 outside territory", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		expect(getBuildingCostReduction("reclaimers", 40, 40)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Multi-faction independence
// ---------------------------------------------------------------------------

describe("multi-faction independence", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("factions claim territory independently", () => {
		claimTerritory("reclaimers", 5, 5, 2);
		claimTerritory("volt_collective", 45, 45, 2);

		expect(getOwner(5, 5)).toBe("reclaimers");
		expect(getOwner(45, 45)).toBe("volt_collective");
		expect(getOwner(5, 45)).toBeNull(); // unclaimed
	});

	it("each faction has independent territory percentages", () => {
		claimTerritory("reclaimers", 5, 5, 2);
		claimTerritory("volt_collective", 45, 45, 3);

		const rPct = getTerritoryPercentage("reclaimers");
		const vPct = getTerritoryPercentage("volt_collective");

		// Volt has bigger radius → more territory
		expect(vPct).toBeGreaterThan(rPct);
	});

	it("four factions can coexist", () => {
		claimTerritory("reclaimers", 5, 5, 2);
		claimTerritory("volt_collective", 45, 5, 2);
		claimTerritory("signal_choir", 5, 45, 2);
		claimTerritory("iron_creed", 45, 45, 2);

		expect(getOwner(5, 5)).toBe("reclaimers");
		expect(getOwner(45, 5)).toBe("volt_collective");
		expect(getOwner(5, 45)).toBe("signal_choir");
		expect(getOwner(45, 45)).toBe("iron_creed");

		// Each should have some percentage
		expect(getTerritoryPercentage("reclaimers")).toBeGreaterThan(0);
		expect(getTerritoryPercentage("volt_collective")).toBeGreaterThan(0);
		expect(getTerritoryPercentage("signal_choir")).toBeGreaterThan(0);
		expect(getTerritoryPercentage("iron_creed")).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// resetTerritoryControl
// ---------------------------------------------------------------------------

describe("resetTerritoryControl", () => {
	it("clears all ownership", () => {
		setMapSize(50, 50);
		claimTerritory("reclaimers", 10, 10, 3);
		expect(getOwner(10, 10)).toBe("reclaimers");

		resetTerritoryControl();

		expect(getOwner(10, 10)).toBeNull();
		expect(getTerritoryPercentage("reclaimers")).toBe(0);
		expect(getContestedCells()).toEqual([]);
	});

	it("clears border caches", () => {
		setMapSize(50, 50);
		claimTerritory("reclaimers", 10, 10, 2);
		territoryControlSystem();
		expect(getBorderCells("reclaimers").length).toBeGreaterThan(0);

		resetTerritoryControl();

		expect(getBorderCells("reclaimers")).toEqual([]);
	});

	it("clears map size", () => {
		setMapSize(50, 50);
		resetTerritoryControl();

		// After reset, percentage should be 0 (map size reset to 0)
		claimTerritory("reclaimers", 5, 5, 2);
		expect(getTerritoryPercentage("reclaimers")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	beforeEach(() => {
		setMapSize(50, 50);
	});

	it("handles claims at map edge", () => {
		claimTerritory("reclaimers", 0, 0, 2);
		expect(getOwner(0, 0)).toBe("reclaimers");
		// Should not crash for negative out-of-bounds
		expect(getOwner(-1, -1)).toBeNull();
	});

	it("handles claims at far corner", () => {
		claimTerritory("reclaimers", 49, 49, 2);
		expect(getOwner(49, 49)).toBe("reclaimers");
		// Beyond map edge
		expect(getOwner(50, 50)).toBeNull();
	});

	it("handles very large radius gracefully", () => {
		claimTerritory("reclaimers", 25, 25, 100);
		// Should claim all cells in bounds
		expect(getOwner(0, 0)).toBe("reclaimers");
		expect(getOwner(49, 49)).toBe("reclaimers");
	});

	it("handles multiple claims on same position from same faction", () => {
		claimTerritory("reclaimers", 10, 10, 2);
		claimTerritory("reclaimers", 10, 10, 2);
		// Same position claimed twice — should not break
		expect(getOwner(10, 10)).toBe("reclaimers");
	});

	it("handles faction name as empty string", () => {
		claimTerritory("", 10, 10, 1);
		expect(getOwner(10, 10)).toBe("");
		expect(getTerritoryPercentage("")).toBeGreaterThan(0);
	});
});
