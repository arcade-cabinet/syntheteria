/**
 * Unit tests for the biome system.
 *
 * Tests cover:
 * - Biome definitions and modifier values
 * - Grid initialization and lookup
 * - Movement cost calculation
 * - Passability checks
 * - Edge cases (out of bounds, unknown biomes, empty grid)
 */

import biomesConfig from "../../../config/biomes.json";
import {
	getBiomeModifiers,
	getDefinedBiomes,
	setBiomeGrid,
	resetBiomeGrid,
	getBiomeAt,
	getBiomeNameAt,
	getMovementCost,
	isPassable,
} from "../biomeSystem";

// ---------------------------------------------------------------------------
// Setup — reset grid between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetBiomeGrid();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a simple 4x4 biome grid for testing. */
function makeTestGrid(): string[][] {
	return [
		["rust_plains", "rust_plains", "scrap_hills", "chrome_ridge"],
		["shallow_water", "rust_plains", "scrap_hills", "scrap_hills"],
		["deep_water", "shallow_water", "signal_plateau", "scrap_hills"],
		["deep_water", "deep_water", "shallow_water", "rust_plains"],
	];
}

// ---------------------------------------------------------------------------
// getBiomeModifiers — static definitions
// ---------------------------------------------------------------------------

describe("getBiomeModifiers", () => {
	it("returns correct modifiers for rust_plains", () => {
		const mods = getBiomeModifiers("rust_plains");
		expect(mods.moveSpeedMod).toBe(1.0);
		expect(mods.harvestMod).toBe(1.0);
		expect(mods.visibility).toBe(1.0);
		expect(mods.passable).toBe(true);
	});

	it("returns correct modifiers for scrap_hills", () => {
		const mods = getBiomeModifiers("scrap_hills");
		expect(mods.moveSpeedMod).toBe(0.8);
		expect(mods.harvestMod).toBe(1.2);
		expect(mods.passable).toBe(true);
	});

	it("returns correct modifiers for chrome_ridge", () => {
		const mods = getBiomeModifiers("chrome_ridge");
		expect(mods.moveSpeedMod).toBe(0.6);
		expect(mods.harvestMod).toBe(0.8);
		expect(mods.visibility).toBe(0.7);
		expect(mods.passable).toBe(true);
	});

	it("returns correct modifiers for signal_plateau", () => {
		const mods = getBiomeModifiers("signal_plateau");
		expect(mods.moveSpeedMod).toBe(0.9);
		expect(mods.harvestMod).toBe(0.7);
		expect(mods.signalBonus).toBe(1.5);
		expect(mods.passable).toBe(true);
	});

	it("marks deep_water as impassable", () => {
		const mods = getBiomeModifiers("deep_water");
		expect(mods.moveSpeedMod).toBe(0.0);
		expect(mods.harvestMod).toBe(0.0);
		expect(mods.passable).toBe(false);
	});

	it("returns correct modifiers for shallow_water", () => {
		const mods = getBiomeModifiers("shallow_water");
		expect(mods.moveSpeedMod).toBe(0.4);
		expect(mods.harvestMod).toBe(0.0);
		expect(mods.visibility).toBe(0.5);
		expect(mods.passable).toBe(true);
	});

	it("returns default modifiers for unknown biome", () => {
		const mods = getBiomeModifiers("nonexistent_biome");
		expect(mods.moveSpeedMod).toBe(1.0);
		expect(mods.harvestMod).toBe(1.0);
		expect(mods.passable).toBe(true);
	});

	it("all defined biomes have a bgColor", () => {
		for (const name of getDefinedBiomes()) {
			const mods = getBiomeModifiers(name);
			expect(mods.bgColor).toBeTruthy();
			expect(mods.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});
});

// ---------------------------------------------------------------------------
// getDefinedBiomes
// ---------------------------------------------------------------------------

describe("getDefinedBiomes", () => {
	it("returns all 7 biome types", () => {
		const biomes = getDefinedBiomes();
		expect(biomes).toHaveLength(7);
		expect(biomes).toContain("rust_plains");
		expect(biomes).toContain("scrap_hills");
		expect(biomes).toContain("chrome_ridge");
		expect(biomes).toContain("signal_plateau");
		expect(biomes).toContain("cable_forest");
		expect(biomes).toContain("deep_water");
		expect(biomes).toContain("shallow_water");
	});

	it("returns correct modifiers for cable_forest", () => {
		const mods = getBiomeModifiers("cable_forest");
		expect(mods.moveSpeedMod).toBe(0.5);
		expect(mods.harvestMod).toBe(1.1);
		expect(mods.visibility).toBe(0.4);
		expect(mods.signalBonus).toBe(0.6);
		expect(mods.passable).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// setBiomeGrid / getBiomeAt
// ---------------------------------------------------------------------------

describe("setBiomeGrid and getBiomeAt", () => {
	it("returns correct biome modifiers after grid is set", () => {
		setBiomeGrid(makeTestGrid());

		const mods00 = getBiomeAt(0, 0);
		expect(mods00.moveSpeedMod).toBe(1.0); // rust_plains

		const mods20 = getBiomeAt(2, 0);
		expect(mods20.moveSpeedMod).toBe(0.8); // scrap_hills

		const mods30 = getBiomeAt(3, 0);
		expect(mods30.moveSpeedMod).toBe(0.6); // chrome_ridge
	});

	it("returns deep_water modifiers at deep water cells", () => {
		setBiomeGrid(makeTestGrid());

		const mods02 = getBiomeAt(0, 2);
		expect(mods02.passable).toBe(false); // deep_water
		expect(mods02.moveSpeedMod).toBe(0.0);
	});

	it("returns default modifiers for out-of-bounds x", () => {
		setBiomeGrid(makeTestGrid());

		const mods = getBiomeAt(10, 0);
		expect(mods.moveSpeedMod).toBe(1.0);
		expect(mods.passable).toBe(true);
	});

	it("returns default modifiers for out-of-bounds z", () => {
		setBiomeGrid(makeTestGrid());

		const mods = getBiomeAt(0, 10);
		expect(mods.moveSpeedMod).toBe(1.0);
	});

	it("returns default modifiers for negative coordinates", () => {
		setBiomeGrid(makeTestGrid());

		const mods = getBiomeAt(-1, -1);
		expect(mods.moveSpeedMod).toBe(1.0);
	});

	it("returns default modifiers when grid is not set", () => {
		const mods = getBiomeAt(0, 0);
		expect(mods.moveSpeedMod).toBe(1.0);
		expect(mods.passable).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getBiomeNameAt
// ---------------------------------------------------------------------------

describe("getBiomeNameAt", () => {
	it("returns biome name string at valid position", () => {
		setBiomeGrid(makeTestGrid());

		expect(getBiomeNameAt(0, 0)).toBe("rust_plains");
		expect(getBiomeNameAt(2, 2)).toBe("signal_plateau");
		expect(getBiomeNameAt(0, 2)).toBe("deep_water");
	});

	it("returns 'unknown' for out-of-bounds", () => {
		setBiomeGrid(makeTestGrid());

		expect(getBiomeNameAt(10, 0)).toBe("unknown");
		expect(getBiomeNameAt(0, -1)).toBe("unknown");
	});

	it("returns 'unknown' when grid is not set", () => {
		expect(getBiomeNameAt(0, 0)).toBe("unknown");
	});
});

// ---------------------------------------------------------------------------
// getMovementCost
// ---------------------------------------------------------------------------

describe("getMovementCost", () => {
	beforeEach(() => {
		setBiomeGrid(makeTestGrid());
	});

	it("returns 1.0 for rust_plains (speed mod 1.0)", () => {
		expect(getMovementCost(0, 0)).toBe(1.0);
	});

	it("returns 1.25 for scrap_hills (speed mod 0.8)", () => {
		expect(getMovementCost(2, 0)).toBeCloseTo(1.25, 5);
	});

	it("returns ~1.667 for chrome_ridge (speed mod 0.6)", () => {
		expect(getMovementCost(3, 0)).toBeCloseTo(1 / 0.6, 5);
	});

	it("returns ~1.111 for signal_plateau (speed mod 0.9)", () => {
		expect(getMovementCost(2, 2)).toBeCloseTo(1 / 0.9, 5);
	});

	it("returns 2.5 for shallow_water (speed mod 0.4)", () => {
		expect(getMovementCost(0, 1)).toBeCloseTo(2.5, 5);
	});

	it("returns Infinity for deep_water (impassable)", () => {
		expect(getMovementCost(0, 2)).toBe(Infinity);
	});

	it("returns 1.0 for out-of-bounds (default modifiers)", () => {
		expect(getMovementCost(100, 100)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// isPassable
// ---------------------------------------------------------------------------

describe("isPassable", () => {
	beforeEach(() => {
		setBiomeGrid(makeTestGrid());
	});

	it("returns true for rust_plains", () => {
		expect(isPassable(0, 0)).toBe(true);
	});

	it("returns true for scrap_hills", () => {
		expect(isPassable(2, 0)).toBe(true);
	});

	it("returns true for chrome_ridge", () => {
		expect(isPassable(3, 0)).toBe(true);
	});

	it("returns true for signal_plateau", () => {
		expect(isPassable(2, 2)).toBe(true);
	});

	it("returns true for shallow_water", () => {
		expect(isPassable(0, 1)).toBe(true);
	});

	it("returns false for deep_water", () => {
		expect(isPassable(0, 2)).toBe(false);
	});

	it("returns true for out-of-bounds (default passable)", () => {
		expect(isPassable(100, 100)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// resetBiomeGrid
// ---------------------------------------------------------------------------

describe("resetBiomeGrid", () => {
	it("clears the grid so lookups return defaults", () => {
		setBiomeGrid(makeTestGrid());
		expect(getBiomeNameAt(0, 0)).toBe("rust_plains");

		resetBiomeGrid();
		expect(getBiomeNameAt(0, 0)).toBe("unknown");
	});
});

// ---------------------------------------------------------------------------
// Config-driven: values match biomes.json
// ---------------------------------------------------------------------------

describe("config-driven biome definitions", () => {
	it("getDefinedBiomes returns all biomes from biomes.json", () => {
		const configBiomes = Object.keys(biomesConfig.biomes);
		const defined = getDefinedBiomes();
		expect(defined.sort()).toEqual(configBiomes.sort());
	});

	it("biome modifiers match biomes.json values", () => {
		for (const [name, configBiome] of Object.entries(biomesConfig.biomes)) {
			const mods = getBiomeModifiers(name);
			expect(mods.moveSpeedMod).toBe(configBiome.moveSpeedMod);
			expect(mods.harvestMod).toBe(configBiome.harvestMod);
			expect(mods.visibility).toBe(configBiome.visibility);
			expect(mods.signalBonus).toBe(configBiome.signalBonus);
			expect(mods.passable).toBe(configBiome.passable);
			expect(mods.bgColor).toBe(configBiome.bgColor);
		}
	});
});

// ---------------------------------------------------------------------------
// Integration: setBiomeGrid from map generator output shape
// ---------------------------------------------------------------------------

describe("integration with map generator output shape", () => {
	it("accepts a grid of valid biome names and provides correct lookups", () => {
		// Simulate what generateWorld produces — a larger grid
		const size = 8;
		const grid: string[][] = [];
		const biomes = ["rust_plains", "scrap_hills", "chrome_ridge", "signal_plateau"];
		for (let z = 0; z < size; z++) {
			const row: string[] = [];
			for (let x = 0; x < size; x++) {
				row.push(biomes[(x + z) % biomes.length]);
			}
			grid.push(row);
		}

		setBiomeGrid(grid);

		// Spot-check a few cells
		expect(getBiomeNameAt(0, 0)).toBe("rust_plains");
		expect(getBiomeNameAt(1, 0)).toBe("scrap_hills");
		expect(getBiomeNameAt(2, 0)).toBe("chrome_ridge");
		expect(getBiomeNameAt(3, 0)).toBe("signal_plateau");

		// Movement costs should vary
		expect(getMovementCost(0, 0)).toBe(1.0); // rust_plains
		expect(getMovementCost(1, 0)).toBeCloseTo(1.25, 5); // scrap_hills
	});
});
