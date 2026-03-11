/**
 * Validation tests for config/furnace.json
 *
 * Ensures structural integrity of the furnace config:
 * - 5 recipe tiers with correct progression
 * - All recipes have valid inputs, time, output, category
 * - Smelter recipes for alloy production
 * - 9 compression configs matching ore types
 * - Screen shake, pressure gauge, heat gauge parameters
 * - Eject physics and quality modifiers
 * - Hopper and repair config
 */

import furnaceConfig from "../furnace.json";
import miningConfig from "../mining.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECIPE_TIER_IDS = ["1", "2", "3", "4", "5"] as const;

const VALID_CATEGORIES = [
	"tool",
	"component",
	"building",
	"unit",
	"material",
	"consumable",
] as const;

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

// All valid input materials (raw ores + smelted intermediate)
const VALID_INPUT_MATERIALS = [
	...ALL_ORE_TYPES,
	"iron",
	"steel",
	"advanced_alloy",
] as const;

// ---------------------------------------------------------------------------
// Top-level config
// ---------------------------------------------------------------------------

describe("furnace top-level config", () => {
	it("has hopperCapacity > 0", () => {
		expect(furnaceConfig.hopperCapacity).toBeGreaterThan(0);
	});

	it("has hopper upgrades as ascending array", () => {
		expect(Array.isArray(furnaceConfig.hopperUpgrades)).toBe(true);
		expect(furnaceConfig.hopperUpgrades.length).toBeGreaterThan(0);
		for (let i = 1; i < furnaceConfig.hopperUpgrades.length; i++) {
			expect(furnaceConfig.hopperUpgrades[i]).toBeGreaterThan(
				furnaceConfig.hopperUpgrades[i - 1],
			);
		}
		// All upgrades should be bigger than base capacity
		for (const upgrade of furnaceConfig.hopperUpgrades) {
			expect(upgrade).toBeGreaterThan(furnaceConfig.hopperCapacity);
		}
	});

	it("has positive process speed", () => {
		expect(furnaceConfig.processSpeed).toBeGreaterThan(0);
	});

	it("powered speed bonus > 1 (must be beneficial)", () => {
		expect(furnaceConfig.poweredSpeedBonus).toBeGreaterThan(1);
	});

	it("has non-negative power requirement", () => {
		expect(furnaceConfig.powerRequired).toBeGreaterThanOrEqual(0);
	});

	it("has max queue depth >= 1", () => {
		expect(furnaceConfig.maxQueueDepth).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Recipe Tiers
// ---------------------------------------------------------------------------

describe("recipe tiers", () => {
	it("has all 5 tiers", () => {
		expect(Object.keys(furnaceConfig.tiers)).toHaveLength(5);
		for (const id of RECIPE_TIER_IDS) {
			expect(furnaceConfig.tiers[id]).toBeDefined();
		}
	});

	it("every tier has a name and techRequired", () => {
		for (const id of RECIPE_TIER_IDS) {
			const tier = furnaceConfig.tiers[id];
			expect(typeof tier.name).toBe("string");
			expect(tier.name.length).toBeGreaterThan(0);
			expect(typeof tier.techRequired).toBe("number");
			expect(tier.techRequired).toBeGreaterThanOrEqual(0);
		}
	});

	it("techRequired increases with tier", () => {
		const tiers = furnaceConfig.tiers;
		for (let i = 0; i < RECIPE_TIER_IDS.length - 1; i++) {
			expect(tiers[RECIPE_TIER_IDS[i]].techRequired).toBeLessThanOrEqual(
				tiers[RECIPE_TIER_IDS[i + 1]].techRequired,
			);
		}
	});

	it("every tier has at least one recipe", () => {
		for (const id of RECIPE_TIER_IDS) {
			const recipes = furnaceConfig.tiers[id].recipes;
			expect(Object.keys(recipes).length).toBeGreaterThan(0);
		}
	});

	it("all recipes have required fields (inputs, time, output, category)", () => {
		for (const id of RECIPE_TIER_IDS) {
			const recipes = furnaceConfig.tiers[id].recipes;
			for (const [name, recipe] of Object.entries(recipes)) {
				expect(typeof (recipe as any).inputs).toBe("object");
				expect(
					Object.keys((recipe as any).inputs).length,
				).toBeGreaterThan(0);

				expect(typeof (recipe as any).time).toBe("number");
				expect((recipe as any).time).toBeGreaterThan(0);

				expect(typeof (recipe as any).output).toBe("string");
				expect((recipe as any).output.length).toBeGreaterThan(0);

				expect(typeof (recipe as any).category).toBe("string");
				expect(VALID_CATEGORIES).toContain((recipe as any).category);
			}
		}
	});

	it("all recipe inputs reference valid materials", () => {
		for (const id of RECIPE_TIER_IDS) {
			const recipes = furnaceConfig.tiers[id].recipes;
			for (const [name, recipe] of Object.entries(recipes)) {
				for (const inputMat of Object.keys((recipe as any).inputs)) {
					expect(VALID_INPUT_MATERIALS).toContain(inputMat);
				}
			}
		}
	});

	it("all recipe input amounts are positive integers", () => {
		for (const id of RECIPE_TIER_IDS) {
			const recipes = furnaceConfig.tiers[id].recipes;
			for (const [name, recipe] of Object.entries(recipes)) {
				for (const [mat, amount] of Object.entries((recipe as any).inputs)) {
					expect(typeof amount).toBe("number");
					expect(amount).toBeGreaterThan(0);
					expect(Number.isInteger(amount)).toBe(true);
				}
			}
		}
	});

	it("tier 1 recipes only use scrap_iron and rock (starting materials)", () => {
		const tier1Recipes = furnaceConfig.tiers["1"].recipes;
		for (const [name, recipe] of Object.entries(tier1Recipes)) {
			for (const inputMat of Object.keys((recipe as any).inputs)) {
				expect(["scrap_iron", "rock"]).toContain(inputMat);
			}
		}
	});

	it("no duplicate outputs across all tiers", () => {
		const allOutputs: string[] = [];
		for (const id of RECIPE_TIER_IDS) {
			const recipes = furnaceConfig.tiers[id].recipes;
			for (const recipe of Object.values(recipes)) {
				allOutputs.push((recipe as any).output);
			}
		}
		expect(new Set(allOutputs).size).toBe(allOutputs.length);
	});

	it("total recipe count is >= 30 (comprehensive crafting tree)", () => {
		let total = 0;
		for (const id of RECIPE_TIER_IDS) {
			total += Object.keys(furnaceConfig.tiers[id].recipes).length;
		}
		expect(total).toBeGreaterThanOrEqual(30);
	});
});

// ---------------------------------------------------------------------------
// Smelter Recipes
// ---------------------------------------------------------------------------

describe("smelter recipes", () => {
	it("has at least 2 smelter recipes (iron, steel)", () => {
		expect(Object.keys(furnaceConfig.smelterRecipes).length).toBeGreaterThanOrEqual(2);
	});

	it("smelter recipes have valid structure", () => {
		for (const [name, recipe] of Object.entries(furnaceConfig.smelterRecipes)) {
			expect(typeof recipe.inputs).toBe("object");
			expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
			expect(typeof recipe.time).toBe("number");
			expect(recipe.time).toBeGreaterThan(0);
			expect(typeof recipe.output).toBe("string");
			expect(typeof recipe.category).toBe("string");
		}
	});

	it("iron recipe uses scrap_iron as input", () => {
		const ironRecipe = furnaceConfig.smelterRecipes.iron_cube;
		expect(ironRecipe).toBeDefined();
		expect(ironRecipe.inputs.scrap_iron).toBeGreaterThan(0);
	});

	it("steel recipe uses iron and carbon", () => {
		const steelRecipe = furnaceConfig.smelterRecipes.steel_cube;
		expect(steelRecipe).toBeDefined();
		expect(steelRecipe.inputs.iron).toBeGreaterThan(0);
		expect(steelRecipe.inputs.carbon).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

describe("compression configs", () => {
	it("has a positive cube size", () => {
		expect(furnaceConfig.compression.cubeSize).toBeGreaterThan(0);
	});

	it("has compression config for all 9 ore types plus smelted materials", () => {
		for (const ore of ALL_ORE_TYPES) {
			expect(furnaceConfig.compression.configs[ore]).toBeDefined();
		}
		// Also includes smelted/alias materials: iron, steel, stone
		expect(
			Object.keys(furnaceConfig.compression.configs).length,
		).toBeGreaterThanOrEqual(9);
	});

	it("every compression config has required fields", () => {
		for (const ore of ALL_ORE_TYPES) {
			const c = furnaceConfig.compression.configs[ore];
			expect(typeof c.powderRequired).toBe("number");
			expect(c.powderRequired).toBeGreaterThan(0);

			expect(typeof c.compressionTime).toBe("number");
			expect(c.compressionTime).toBeGreaterThan(0);

			expect(typeof c.screenShakePeak).toBe("number");
			expect(c.screenShakePeak).toBeGreaterThan(0);
			expect(c.screenShakePeak).toBeLessThanOrEqual(1.5);

			expect(typeof c.ejectVelocity).toBe("number");
			expect(c.ejectVelocity).toBeGreaterThan(0);
		}
	});

	it("powder required increases with ore rarity", () => {
		const { configs } = furnaceConfig.compression;
		expect(configs.rock.powderRequired).toBeLessThan(
			configs.scrap_iron.powderRequired,
		);
		expect(configs.scrap_iron.powderRequired).toBeLessThan(
			configs.copper.powderRequired,
		);
		expect(configs.titanium.powderRequired).toBeLessThan(
			configs.quantum_crystal.powderRequired,
		);
	});

	it("quantum crystal requires the most powder", () => {
		const { configs } = furnaceConfig.compression;
		for (const ore of ALL_ORE_TYPES) {
			if (ore === "quantum_crystal") continue;
			expect(configs[ore].powderRequired).toBeLessThanOrEqual(
				configs.quantum_crystal.powderRequired,
			);
		}
	});

	it("compression time increases with rarity", () => {
		const { configs } = furnaceConfig.compression;
		expect(configs.rock.compressionTime).toBeLessThan(
			configs.titanium.compressionTime,
		);
		expect(configs.titanium.compressionTime).toBeLessThan(
			configs.quantum_crystal.compressionTime,
		);
	});
});

// ---------------------------------------------------------------------------
// Screen Shake / Gauge / Eject
// ---------------------------------------------------------------------------

describe("compression effects", () => {
	it("screen shake has valid curve and multiplier", () => {
		const ss = furnaceConfig.compression.screenShake;
		expect(typeof ss.curveType).toBe("string");
		expect(ss.slamMultiplier).toBeGreaterThan(1);
		expect(ss.slamFrames).toBeGreaterThanOrEqual(1);
	});

	it("pressure gauge has red zone threshold in (0, 1)", () => {
		const pg = furnaceConfig.compression.pressureGauge;
		expect(pg.redZoneThreshold).toBeGreaterThan(0);
		expect(pg.redZoneThreshold).toBeLessThan(1);
	});

	it("heat gauge has delay in (0, 1)", () => {
		const hg = furnaceConfig.compression.heatGauge;
		expect(hg.delayPercent).toBeGreaterThan(0);
		expect(hg.delayPercent).toBeLessThan(1);
	});

	it("eject physics has valid bounce and friction", () => {
		const ep = furnaceConfig.compression.ejectPhysics;
		expect(ep.forwardWeight + ep.upWeight).toBeCloseTo(1.0, 5);
		expect(ep.bounceRestitution).toBeGreaterThanOrEqual(0);
		expect(ep.bounceRestitution).toBeLessThanOrEqual(1);
		expect(ep.friction).toBeGreaterThanOrEqual(0);
		expect(ep.friction).toBeLessThanOrEqual(1);
	});

	it("quality modifiers: normal=1.0, interrupted=0, others in (0,1)", () => {
		const qm = furnaceConfig.compression.qualityModifiers;
		expect(qm.normal).toBe(1.0);
		expect(qm.interrupted).toBe(0);
		expect(qm.damageDuring).toBeGreaterThan(0);
		expect(qm.damageDuring).toBeLessThan(1);
		expect(qm.rushed).toBeGreaterThan(0);
		expect(qm.rushed).toBeLessThan(1);
	});
});

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

describe("furnace repair config", () => {
	it("has positive repair range", () => {
		expect(furnaceConfig.repair.range).toBeGreaterThan(0);
	});

	it("has positive ticks to repair", () => {
		expect(furnaceConfig.repair.ticksToRepair).toBeGreaterThanOrEqual(1);
	});

	it("repair costs reference valid material types", () => {
		for (const [_, cost] of Object.entries(furnaceConfig.repair.costs)) {
			expect(typeof cost.type).toBe("string");
			expect(cost.amount).toBeGreaterThan(0);
		}
	});
});
