/**
 * Validation tests for config/mining.json
 *
 * Ensures structural integrity of the mining config:
 * - 9 ore types with hardness, grindSpeed, color
 * - 4 drill tiers with correct progression
 * - Harvesting defaults
 * - Scavenging configuration
 * - Compression difficulty scales with material rarity
 */

import miningConfig from "../mining.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_ORE_TYPES = [
	"rock",
	"scrap_iron",
	"copper",
	"silicon",
	"carbon",
	"titanium",
	"rare_earth",
	"gold",
	"quantum_crystal",
] as const;

const DRILL_TIER_IDS = ["1", "2", "3", "4"] as const;

// ---------------------------------------------------------------------------
// Ore Types
// ---------------------------------------------------------------------------

describe("ore types", () => {
	it("has all 9 ore types", () => {
		for (const ore of ALL_ORE_TYPES) {
			expect(miningConfig.oreTypes[ore]).toBeDefined();
		}
		expect(Object.keys(miningConfig.oreTypes)).toHaveLength(9);
	});

	it("every ore type has hardness, grindSpeed, and color", () => {
		for (const ore of ALL_ORE_TYPES) {
			const o = miningConfig.oreTypes[ore];
			expect(typeof o.hardness).toBe("number");
			expect(o.hardness).toBeGreaterThanOrEqual(1);

			expect(typeof o.grindSpeed).toBe("number");
			expect(o.grindSpeed).toBeGreaterThan(0);
			expect(o.grindSpeed).toBeLessThanOrEqual(1);

			expect(typeof o.color).toBe("string");
			expect(o.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});

	it("hardness increases with material rarity", () => {
		const { oreTypes } = miningConfig;
		expect(oreTypes.rock.hardness).toBeLessThanOrEqual(
			oreTypes.scrap_iron.hardness,
		);
		expect(oreTypes.scrap_iron.hardness).toBeLessThanOrEqual(
			oreTypes.copper.hardness,
		);
		expect(oreTypes.titanium.hardness).toBeLessThanOrEqual(
			oreTypes.quantum_crystal.hardness,
		);
	});

	it("grindSpeed decreases with hardness (harder = slower)", () => {
		const { oreTypes } = miningConfig;
		expect(oreTypes.rock.grindSpeed).toBeGreaterThan(
			oreTypes.copper.grindSpeed,
		);
		expect(oreTypes.copper.grindSpeed).toBeGreaterThan(
			oreTypes.titanium.grindSpeed,
		);
		expect(oreTypes.titanium.grindSpeed).toBeGreaterThan(
			oreTypes.quantum_crystal.grindSpeed,
		);
	});

	it("quantum crystal is the hardest and slowest to grind", () => {
		const { oreTypes } = miningConfig;
		for (const ore of ALL_ORE_TYPES) {
			if (ore === "quantum_crystal") continue;
			expect(oreTypes[ore].hardness).toBeLessThanOrEqual(
				oreTypes.quantum_crystal.hardness,
			);
			expect(oreTypes[ore].grindSpeed).toBeGreaterThanOrEqual(
				oreTypes.quantum_crystal.grindSpeed,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// Drill Tiers
// ---------------------------------------------------------------------------

describe("drill tiers", () => {
	it("has 4 drill tiers", () => {
		expect(Object.keys(miningConfig.drillTiers)).toHaveLength(4);
		for (const id of DRILL_TIER_IDS) {
			expect(miningConfig.drillTiers[id]).toBeDefined();
		}
	});

	it("every drill tier has required fields", () => {
		for (const id of DRILL_TIER_IDS) {
			const tier = miningConfig.drillTiers[id];
			expect(typeof tier.name).toBe("string");
			expect(tier.name.length).toBeGreaterThan(0);

			expect(typeof tier.rateMultiplier).toBe("number");
			expect(tier.rateMultiplier).toBeGreaterThan(0);

			expect(typeof tier.capacity).toBe("number");
			expect(tier.capacity).toBeGreaterThan(0);

			expect(Array.isArray(tier.mineableTypes)).toBe(true);
			expect(tier.mineableTypes.length).toBeGreaterThan(0);

			expect(typeof tier.soundLevel).toBe("string");
			expect(typeof tier.aggroRadius).toBe("number");
			expect(tier.aggroRadius).toBeGreaterThan(0);
		}
	});

	it("rate multiplier increases with tier", () => {
		const { drillTiers } = miningConfig;
		expect(drillTiers["1"].rateMultiplier).toBeLessThan(
			drillTiers["2"].rateMultiplier,
		);
		expect(drillTiers["2"].rateMultiplier).toBeLessThan(
			drillTiers["3"].rateMultiplier,
		);
		expect(drillTiers["3"].rateMultiplier).toBeLessThan(
			drillTiers["4"].rateMultiplier,
		);
	});

	it("capacity increases with tier", () => {
		const { drillTiers } = miningConfig;
		expect(drillTiers["1"].capacity).toBeLessThan(drillTiers["2"].capacity);
		expect(drillTiers["2"].capacity).toBeLessThan(drillTiers["3"].capacity);
		expect(drillTiers["3"].capacity).toBeLessThan(drillTiers["4"].capacity);
	});

	it("higher tiers can mine everything lower tiers can plus more", () => {
		const { drillTiers } = miningConfig;
		for (let i = 0; i < DRILL_TIER_IDS.length - 1; i++) {
			const current = drillTiers[DRILL_TIER_IDS[i]].mineableTypes;
			const next = drillTiers[DRILL_TIER_IDS[i + 1]].mineableTypes;
			for (const type of current) {
				expect(next).toContain(type);
			}
			expect(next.length).toBeGreaterThan(current.length);
		}
	});

	it("tier 1 has no unlock cost (starting drill)", () => {
		expect(miningConfig.drillTiers["1"].unlockCost).toBeNull();
	});

	it("tiers 2-4 have unlock costs", () => {
		for (const id of ["2", "3", "4"] as const) {
			expect(miningConfig.drillTiers[id].unlockCost).not.toBeNull();
			expect(
				Object.keys(miningConfig.drillTiers[id].unlockCost as object).length,
			).toBeGreaterThan(0);
		}
	});

	it("all mineable types reference valid ore types", () => {
		for (const id of DRILL_TIER_IDS) {
			for (const type of miningConfig.drillTiers[id].mineableTypes) {
				expect(ALL_ORE_TYPES).toContain(type);
			}
		}
	});

	it("tier 4 can mine all ore types", () => {
		const tier4Types = miningConfig.drillTiers["4"].mineableTypes;
		for (const ore of ALL_ORE_TYPES) {
			expect(tier4Types).toContain(ore);
		}
	});

	it("aggro radius increases with tier (louder drills attract enemies)", () => {
		const { drillTiers } = miningConfig;
		expect(drillTiers["1"].aggroRadius).toBeLessThan(
			drillTiers["2"].aggroRadius,
		);
		expect(drillTiers["2"].aggroRadius).toBeLessThan(
			drillTiers["3"].aggroRadius,
		);
		expect(drillTiers["3"].aggroRadius).toBeLessThan(
			drillTiers["4"].aggroRadius,
		);
	});
});

// ---------------------------------------------------------------------------
// Harvesting defaults
// ---------------------------------------------------------------------------

describe("harvesting defaults", () => {
	it("has a positive default range", () => {
		expect(miningConfig.harvesting.defaultRange).toBeGreaterThan(0);
	});

	it("has a positive default powder capacity", () => {
		expect(miningConfig.harvesting.defaultPowderCapacity).toBeGreaterThan(0);
	});

	it("default capacity matches tier 1 drill capacity", () => {
		expect(miningConfig.harvesting.defaultPowderCapacity).toBe(
			miningConfig.drillTiers["1"].capacity,
		);
	});
});

// ---------------------------------------------------------------------------
// Scavenging
// ---------------------------------------------------------------------------

describe("scavenging", () => {
	it("has valid range and spawn chance", () => {
		expect(miningConfig.scavenging.range).toBeGreaterThan(0);
		expect(miningConfig.scavenging.spawnChance).toBeGreaterThan(0);
		expect(miningConfig.scavenging.spawnChance).toBeLessThanOrEqual(1);
	});

	it("has grid bounds that form a valid area", () => {
		expect(miningConfig.scavenging.gridMaxX).toBeGreaterThan(
			miningConfig.scavenging.gridMinX,
		);
		expect(miningConfig.scavenging.gridMaxZ).toBeGreaterThan(
			miningConfig.scavenging.gridMinZ,
		);
	});

	it("scavenge type weights sum to 1.0", () => {
		const types = miningConfig.scavenging.types;
		const total = Object.values(types).reduce((sum, t) => sum + t.weight, 0);
		expect(total).toBeCloseTo(1.0, 5);
	});
});

// ---------------------------------------------------------------------------
// No placeholder values
// ---------------------------------------------------------------------------

describe("no placeholder values", () => {
	it("does not contain -1 or 999 sentinel values in ore types", () => {
		for (const ore of ALL_ORE_TYPES) {
			const o = miningConfig.oreTypes[ore];
			expect(o.hardness).not.toBe(-1);
			expect(o.hardness).not.toBe(999);
			expect(o.grindSpeed).not.toBe(-1);
		}
	});
});
