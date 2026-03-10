/**
 * Unit tests for the procedural world generator.
 *
 * Tests cover:
 * - Seeded PRNG determinism and distribution
 * - Heightmap generation dimensions and value range
 * - Biome assignment based on height + moisture
 * - Ore deposit placement with spacing constraints
 * - Start position equidistance and non-water placement
 * - Ruin placement at high elevation
 * - Full determinism: same seed + config = identical world
 */

import {
	createPRNG,
	generateWorld,
	BIOME_NAMES,
	type MapGenConfig,
	type WorldData,
} from "../mapGenerator";

// ---------------------------------------------------------------------------
// Default test config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: MapGenConfig = {
	worldSize: 64,
	waterLevel: 0.2,
	oreAbundance: 1.0,
	biomeScale: 1.0,
};

const SMALL_CONFIG: MapGenConfig = {
	worldSize: 16,
	waterLevel: 0.15,
	oreAbundance: 1.0,
	biomeScale: 1.0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(ax: number, az: number, bx: number, bz: number): number {
	const dx = ax - bx;
	const dz = az - bz;
	return Math.sqrt(dx * dx + dz * dz);
}

// ---------------------------------------------------------------------------
// createPRNG
// ---------------------------------------------------------------------------

describe("createPRNG", () => {
	it("produces values in [0, 1)", () => {
		const rng = createPRNG(42);
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it("is deterministic — same seed produces same sequence", () => {
		const rng1 = createPRNG(12345);
		const rng2 = createPRNG(12345);

		for (let i = 0; i < 100; i++) {
			expect(rng1()).toBe(rng2());
		}
	});

	it("different seeds produce different sequences", () => {
		const rng1 = createPRNG(1);
		const rng2 = createPRNG(2);

		// Collect first 10 values
		const seq1 = Array.from({ length: 10 }, () => rng1());
		const seq2 = Array.from({ length: 10 }, () => rng2());

		// At least some values should differ
		const allSame = seq1.every((v, i) => v === seq2[i]);
		expect(allSame).toBe(false);
	});

	it("has reasonable distribution (not clustered)", () => {
		const rng = createPRNG(9999);
		const buckets = [0, 0, 0, 0, 0]; // 5 buckets for [0,0.2), [0.2,0.4), etc.
		const n = 5000;

		for (let i = 0; i < n; i++) {
			const v = rng();
			const bucket = Math.min(4, Math.floor(v * 5));
			buckets[bucket]++;
		}

		// Each bucket should have at least 10% of values (expected ~20%)
		for (const count of buckets) {
			expect(count).toBeGreaterThan(n * 0.1);
		}
	});
});

// ---------------------------------------------------------------------------
// generateWorld — heightmap
// ---------------------------------------------------------------------------

describe("heightmap generation", () => {
	it("produces grid of correct dimensions", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		expect(world.heightmap).toHaveLength(DEFAULT_CONFIG.worldSize);
		for (const row of world.heightmap) {
			expect(row).toHaveLength(DEFAULT_CONFIG.worldSize);
		}
	});

	it("all values are in [0, 1] range", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const row of world.heightmap) {
			for (const h of row) {
				expect(h).toBeGreaterThanOrEqual(0);
				expect(h).toBeLessThanOrEqual(1);
			}
		}
	});

	it("has variation — not all the same value", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const values = world.heightmap.flat();
		const unique = new Set(values.map((v) => Math.round(v * 100)));
		// Should have more than just 1-2 distinct height levels
		expect(unique.size).toBeGreaterThan(10);
	});

	it("works with small world sizes", () => {
		const config: MapGenConfig = { worldSize: 4, waterLevel: 0.2, oreAbundance: 1.0, biomeScale: 1.0 };
		const world = generateWorld(1, config);

		expect(world.heightmap).toHaveLength(4);
		expect(world.heightmap[0]).toHaveLength(4);
	});
});

// ---------------------------------------------------------------------------
// generateWorld — biome grid
// ---------------------------------------------------------------------------

describe("biome grid generation", () => {
	it("produces grid of correct dimensions", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		expect(world.biomes).toHaveLength(DEFAULT_CONFIG.worldSize);
		for (const row of world.biomes) {
			expect(row).toHaveLength(DEFAULT_CONFIG.worldSize);
		}
	});

	it("all biomes are from the valid set", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const validNames = new Set<string>(BIOME_NAMES);

		for (const row of world.biomes) {
			for (const biome of row) {
				expect(validNames.has(biome)).toBe(true);
			}
		}
	});

	it("water biomes appear where height is below waterLevel", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (let z = 0; z < DEFAULT_CONFIG.worldSize; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.worldSize; x++) {
				const h = world.heightmap[z][x];
				const biome = world.biomes[z][x];

				if (h < DEFAULT_CONFIG.waterLevel * 0.6) {
					expect(biome).toBe("deep_water");
				} else if (h < DEFAULT_CONFIG.waterLevel) {
					expect(biome).toBe("shallow_water");
				} else {
					expect(biome).not.toBe("deep_water");
					expect(biome).not.toBe("shallow_water");
				}
			}
		}
	});

	it("chrome_ridge appears at high elevation (>=0.75)", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (let z = 0; z < DEFAULT_CONFIG.worldSize; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.worldSize; x++) {
				const h = world.heightmap[z][x];
				const biome = world.biomes[z][x];

				if (h >= 0.75) {
					expect(biome).toBe("chrome_ridge");
				}
			}
		}
	});

	it("produces multiple distinct biome types", () => {
		// Use a larger world to increase chance of biome variety
		const config: MapGenConfig = {
			worldSize: 128,
			waterLevel: 0.2,
			oreAbundance: 1.0,
			biomeScale: 1.0,
		};
		const world = generateWorld(42, config);
		const biomeSet = new Set(world.biomes.flat());
		// Should have at least 3 different biomes
		expect(biomeSet.size).toBeGreaterThanOrEqual(3);
	});
});

// ---------------------------------------------------------------------------
// generateWorld — ore deposits
// ---------------------------------------------------------------------------

describe("ore deposit placement", () => {
	it("places deposits on land (not in water)", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const deposit of world.oreDeposits) {
			const height = world.heightmap[deposit.z][deposit.x];
			expect(height).toBeGreaterThanOrEqual(DEFAULT_CONFIG.waterLevel);
		}
	});

	it("deposits are within world bounds", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const deposit of world.oreDeposits) {
			expect(deposit.x).toBeGreaterThanOrEqual(0);
			expect(deposit.x).toBeLessThan(DEFAULT_CONFIG.worldSize);
			expect(deposit.z).toBeGreaterThanOrEqual(0);
			expect(deposit.z).toBeLessThan(DEFAULT_CONFIG.worldSize);
		}
	});

	it("deposits have minimum spacing between them", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const minSpacing = Math.max(3, DEFAULT_CONFIG.worldSize * 0.05);

		for (let i = 0; i < world.oreDeposits.length; i++) {
			for (let j = i + 1; j < world.oreDeposits.length; j++) {
				const d = dist(
					world.oreDeposits[i].x,
					world.oreDeposits[i].z,
					world.oreDeposits[j].x,
					world.oreDeposits[j].z,
				);
				expect(d).toBeGreaterThanOrEqual(minSpacing);
			}
		}
	});

	it("deposits have valid ore types", () => {
		const validTypes = [
			"scrap_iron",
			"copper",
			"silicon",
			"titanium",
			"carbon",
			"rare_earth",
			"gold",
			"quantum_crystal",
		];
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const deposit of world.oreDeposits) {
			expect(validTypes).toContain(deposit.type);
		}
	});

	it("deposits have richness in (0, 1] range", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const deposit of world.oreDeposits) {
			expect(deposit.richness).toBeGreaterThan(0);
			expect(deposit.richness).toBeLessThanOrEqual(1);
		}
	});

	it("higher oreAbundance produces more deposits", () => {
		const low = generateWorld(42, { ...DEFAULT_CONFIG, oreAbundance: 0.5 });
		const high = generateWorld(42, { ...DEFAULT_CONFIG, oreAbundance: 2.0 });

		// The high abundance world should generally have more deposits
		// (exact count depends on spacing constraints and terrain)
		expect(high.oreDeposits.length).toBeGreaterThanOrEqual(
			low.oreDeposits.length,
		);
	});
});

// ---------------------------------------------------------------------------
// generateWorld — start positions
// ---------------------------------------------------------------------------

describe("start position placement", () => {
	it("places 4 start positions for 4 factions", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		expect(world.startPositions).toHaveLength(4);
	});

	it("each faction appears exactly once", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const factions = world.startPositions.map((p) => p.faction);
		const uniqueFactions = new Set(factions);
		expect(uniqueFactions.size).toBe(4);
		expect(factions).toContain("reclaimers");
		expect(factions).toContain("volt_collective");
		expect(factions).toContain("signal_choir");
		expect(factions).toContain("iron_creed");
	});

	it("positions are within world bounds", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const pos of world.startPositions) {
			expect(pos.x).toBeGreaterThanOrEqual(0);
			expect(pos.x).toBeLessThan(DEFAULT_CONFIG.worldSize);
			expect(pos.z).toBeGreaterThanOrEqual(0);
			expect(pos.z).toBeLessThan(DEFAULT_CONFIG.worldSize);
		}
	});

	it("positions are roughly equidistant from center", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const center = DEFAULT_CONFIG.worldSize / 2;

		const distances = world.startPositions.map((p) =>
			dist(p.x, p.z, center, center),
		);

		const minDist = Math.min(...distances);
		const maxDist = Math.max(...distances);

		// All positions should be within 30% of each other's distance from center
		// (allows for nudging away from water)
		expect(maxDist - minDist).toBeLessThan(DEFAULT_CONFIG.worldSize * 0.3);
	});
});

// ---------------------------------------------------------------------------
// generateWorld — ruins
// ---------------------------------------------------------------------------

describe("ruin placement", () => {
	it("places ruins at elevated positions", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const ruin of world.ruins) {
			const height = world.heightmap[ruin.z][ruin.x];
			expect(height).toBeGreaterThanOrEqual(0.55);
		}
	});

	it("ruins are within world bounds", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const ruin of world.ruins) {
			expect(ruin.x).toBeGreaterThanOrEqual(0);
			expect(ruin.x).toBeLessThan(DEFAULT_CONFIG.worldSize);
			expect(ruin.z).toBeGreaterThanOrEqual(0);
			expect(ruin.z).toBeLessThan(DEFAULT_CONFIG.worldSize);
		}
	});

	it("ruins have valid type strings", () => {
		const validTypes = [
			"collapsed_factory",
			"signal_tower",
			"forge_remnant",
			"data_vault",
			"power_station",
		];
		const world = generateWorld(42, DEFAULT_CONFIG);

		for (const ruin of world.ruins) {
			expect(validTypes).toContain(ruin.type);
		}
	});

	it("ruins have minimum spacing between them", () => {
		const world = generateWorld(42, DEFAULT_CONFIG);
		const minSpacing = DEFAULT_CONFIG.worldSize * 0.1;

		for (let i = 0; i < world.ruins.length; i++) {
			for (let j = i + 1; j < world.ruins.length; j++) {
				const d = dist(
					world.ruins[i].x,
					world.ruins[i].z,
					world.ruins[j].x,
					world.ruins[j].z,
				);
				expect(d).toBeGreaterThanOrEqual(minSpacing);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Determinism — the critical property
// ---------------------------------------------------------------------------

describe("determinism", () => {
	it("same seed + config produces identical world", () => {
		const world1 = generateWorld(12345, DEFAULT_CONFIG);
		const world2 = generateWorld(12345, DEFAULT_CONFIG);

		// Heightmaps must be identical
		expect(world1.heightmap).toEqual(world2.heightmap);

		// Biome grids must be identical
		expect(world1.biomes).toEqual(world2.biomes);

		// Ore deposits must be identical
		expect(world1.oreDeposits).toEqual(world2.oreDeposits);

		// Start positions must be identical
		expect(world1.startPositions).toEqual(world2.startPositions);

		// Ruins must be identical
		expect(world1.ruins).toEqual(world2.ruins);
	});

	it("different seeds produce different worlds", () => {
		const world1 = generateWorld(1, DEFAULT_CONFIG);
		const world2 = generateWorld(2, DEFAULT_CONFIG);

		// Heightmaps should differ
		const flat1 = world1.heightmap.flat();
		const flat2 = world2.heightmap.flat();
		const allSame = flat1.every((v, i) => v === flat2[i]);
		expect(allSame).toBe(false);
	});

	it("determinism holds across multiple calls", () => {
		const results: WorldData[] = [];
		for (let i = 0; i < 3; i++) {
			results.push(generateWorld(777, SMALL_CONFIG));
		}

		expect(results[0].heightmap).toEqual(results[1].heightmap);
		expect(results[1].heightmap).toEqual(results[2].heightmap);
		expect(results[0].oreDeposits).toEqual(results[1].oreDeposits);
		expect(results[0].startPositions).toEqual(results[1].startPositions);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles seed of 0", () => {
		expect(() => generateWorld(0, SMALL_CONFIG)).not.toThrow();
		const world = generateWorld(0, SMALL_CONFIG);
		expect(world.heightmap).toHaveLength(SMALL_CONFIG.worldSize);
	});

	it("handles negative seed", () => {
		expect(() => generateWorld(-42, SMALL_CONFIG)).not.toThrow();
	});

	it("handles very large seed", () => {
		expect(() => generateWorld(2147483647, SMALL_CONFIG)).not.toThrow();
	});

	it("handles very low water level (almost no water)", () => {
		const config: MapGenConfig = {
			worldSize: 32,
			waterLevel: 0.01,
			oreAbundance: 1.0,
			biomeScale: 1.0,
		};
		const world = generateWorld(42, config);
		const waterCells = world.biomes
			.flat()
			.filter((b) => b === "deep_water" || b === "shallow_water").length;
		// With very low water level, very few or no water cells
		expect(waterCells).toBeLessThan(config.worldSize * config.worldSize * 0.1);
	});

	it("handles high water level (mostly water)", () => {
		const config: MapGenConfig = {
			worldSize: 32,
			waterLevel: 0.9,
			oreAbundance: 1.0,
			biomeScale: 1.0,
		};
		const world = generateWorld(42, config);
		const waterCells = world.biomes
			.flat()
			.filter((b) => b === "deep_water" || b === "shallow_water").length;
		// With very high water level, most cells should be water
		expect(waterCells).toBeGreaterThan(
			config.worldSize * config.worldSize * 0.5,
		);
	});

	it("handles zero ore abundance (no deposits)", () => {
		const config: MapGenConfig = {
			worldSize: 32,
			waterLevel: 0.2,
			oreAbundance: 0,
			biomeScale: 1.0,
		};
		const world = generateWorld(42, config);
		expect(world.oreDeposits).toHaveLength(0);
	});
});
