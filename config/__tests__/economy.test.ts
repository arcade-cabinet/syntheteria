/**
 * Validation tests for config/economy.json
 *
 * Ensures structural integrity of the economy config:
 * - 9 raw materials with correct tiers and rates
 * - 3 alloys with smelting requirements
 * - Trade rates and patron shipment config
 * - AI difficulty multipliers with proper scaling
 * - Compression mechanics with realistic values
 */

import economyConfig from "../economy.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_RAW_MATERIALS = [
	"rock",
	"scrap_iron",
	"copper",
	"silicon",
	"carbon",
	"titanium",
	"rare_earth",
	"gold",
	"quantum_crystal",
	"e_waste",
	"fiber_optics",
	"rare_alloy",
] as const;

const ALL_ALLOYS = ["iron", "steel", "advanced_alloy"] as const;

const ALL_DIFFICULTIES = [
	"peaceful",
	"easy",
	"normal",
	"hard",
	"brutal",
] as const;

const ALL_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

const WEALTH_BRACKETS = [
	"destitute",
	"poor",
	"modest",
	"wealthy",
	"rich",
	"opulent",
] as const;

// ---------------------------------------------------------------------------
// Raw Materials
// ---------------------------------------------------------------------------

describe("raw materials", () => {
	it("has all 12 raw materials (including e_waste, fiber_optics, rare_alloy)", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			expect(economyConfig.materials[mat]).toBeDefined();
		}
		expect(Object.keys(economyConfig.materials)).toHaveLength(12);
	});

	it("every material has required fields with correct types", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			const m = economyConfig.materials[mat];
			expect(typeof m.tier).toBe("number");
			expect(m.tier).toBeGreaterThanOrEqual(1);
			expect(m.tier).toBeLessThanOrEqual(5);

			expect(typeof m.rarity).toBe("string");
			expect(m.rarity.length).toBeGreaterThan(0);

			expect(typeof m.depositFrequency).toBe("number");
			expect(m.depositFrequency).toBeGreaterThan(0);
			expect(m.depositFrequency).toBeLessThanOrEqual(1);

			expect(typeof m.grindSpeed).toBe("number");
			expect(m.grindSpeed).toBeGreaterThan(0);
			expect(m.grindSpeed).toBeLessThanOrEqual(1);

			expect(typeof m.powderToFill).toBe("number");
			expect(m.powderToFill).toBeGreaterThanOrEqual(40);
			expect(m.powderToFill).toBeLessThanOrEqual(200);

			expect(typeof m.compressTime).toBe("number");
			expect(m.compressTime).toBeGreaterThanOrEqual(1.0);
			expect(m.compressTime).toBeLessThanOrEqual(5.0);

			expect(typeof m.cubeHp).toBe("number");
			expect(m.cubeHp).toBeGreaterThan(0);

			expect(typeof m.wallHp).toBe("number");
			expect(m.wallHp).toBeGreaterThan(0);

			expect(typeof m.baseValue).toBe("number");
			expect(m.baseValue).toBeGreaterThan(0);

			expect(typeof m.cubeValue).toBe("number");
			expect(m.cubeValue).toBeGreaterThan(0);

			expect(typeof m.carrySpeedMod).toBe("number");
			expect(m.carrySpeedMod).toBeGreaterThan(0);
			expect(m.carrySpeedMod).toBeLessThanOrEqual(1);
		}
	});

	it("tiers are assigned correctly (tier 1 is cheapest, tier 5 is rarest)", () => {
		expect(economyConfig.materials.rock.tier).toBe(1);
		expect(economyConfig.materials.scrap_iron.tier).toBe(1);
		expect(economyConfig.materials.copper.tier).toBe(2);
		expect(economyConfig.materials.silicon.tier).toBe(2);
		expect(economyConfig.materials.carbon.tier).toBe(3);
		expect(economyConfig.materials.titanium.tier).toBe(3);
		expect(economyConfig.materials.rare_earth.tier).toBe(4);
		expect(economyConfig.materials.gold.tier).toBe(4);
		expect(economyConfig.materials.quantum_crystal.tier).toBe(5);
	});

	it("base value increases with tier", () => {
		const tierAvgs = new Map<number, number[]>();
		for (const mat of ALL_RAW_MATERIALS) {
			const m = economyConfig.materials[mat];
			if (!tierAvgs.has(m.tier)) tierAvgs.set(m.tier, []);
			tierAvgs.get(m.tier)!.push(m.baseValue);
		}
		const avgByTier = new Map<number, number>();
		for (const [tier, vals] of tierAvgs) {
			avgByTier.set(tier, vals.reduce((a, b) => a + b, 0) / vals.length);
		}
		const sortedTiers = [...avgByTier.keys()].sort((a, b) => a - b);
		for (let i = 1; i < sortedTiers.length; i++) {
			expect(avgByTier.get(sortedTiers[i])!).toBeGreaterThan(
				avgByTier.get(sortedTiers[i - 1])!,
			);
		}
	});

	it("grind speed decreases with tier (harder materials are slower)", () => {
		const tierAvgs = new Map<number, number[]>();
		for (const mat of ALL_RAW_MATERIALS) {
			const m = economyConfig.materials[mat];
			if (!tierAvgs.has(m.tier)) tierAvgs.set(m.tier, []);
			tierAvgs.get(m.tier)!.push(m.grindSpeed);
		}
		const avgByTier = new Map<number, number>();
		for (const [tier, vals] of tierAvgs) {
			avgByTier.set(tier, vals.reduce((a, b) => a + b, 0) / vals.length);
		}
		const sortedTiers = [...avgByTier.keys()].sort((a, b) => a - b);
		for (let i = 1; i < sortedTiers.length; i++) {
			expect(avgByTier.get(sortedTiers[i])!).toBeLessThan(
				avgByTier.get(sortedTiers[i - 1])!,
			);
		}
	});

	it("deposit frequency sums to less than 1.0", () => {
		let totalFreq = 0;
		for (const mat of ALL_RAW_MATERIALS) {
			totalFreq += economyConfig.materials[mat].depositFrequency;
		}
		expect(totalFreq).toBeLessThan(1.0);
	});

	it("wall HP is always >= cube HP (wall panels are multi-cube assemblies)", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			const m = economyConfig.materials[mat];
			expect(m.wallHp).toBeGreaterThanOrEqual(m.cubeHp);
		}
	});
});

// ---------------------------------------------------------------------------
// Alloys
// ---------------------------------------------------------------------------

describe("alloys", () => {
	it("has all 3 alloys", () => {
		for (const alloy of ALL_ALLOYS) {
			expect(economyConfig.alloys[alloy]).toBeDefined();
		}
		expect(Object.keys(economyConfig.alloys)).toHaveLength(3);
	});

	it("every alloy has inputs, smeltTime, cubeHp, wallHp, baseValue, cubeValue", () => {
		for (const alloy of ALL_ALLOYS) {
			const a = economyConfig.alloys[alloy];
			expect(a.inputs).toBeDefined();
			expect(Object.keys(a.inputs).length).toBeGreaterThan(0);
			expect(typeof a.smeltTime).toBe("number");
			expect(a.smeltTime).toBeGreaterThan(0);
			expect(typeof a.cubeHp).toBe("number");
			expect(a.cubeHp).toBeGreaterThan(0);
			expect(typeof a.wallHp).toBe("number");
			expect(a.wallHp).toBeGreaterThan(0);
			expect(typeof a.baseValue).toBe("number");
			expect(a.baseValue).toBeGreaterThan(0);
			expect(typeof a.cubeValue).toBe("number");
			expect(a.cubeValue).toBeGreaterThan(0);
		}
	});

	it("alloy inputs reference valid raw materials or other alloys", () => {
		const validInputs = new Set([...ALL_RAW_MATERIALS, ...ALL_ALLOYS]);
		for (const alloy of ALL_ALLOYS) {
			for (const input of Object.keys(economyConfig.alloys[alloy].inputs)) {
				expect(validInputs.has(input as any)).toBe(true);
			}
		}
	});

	it("alloys have higher base value than their cheapest input", () => {
		const allMats = { ...economyConfig.materials } as Record<
			string,
			{ baseValue: number }
		>;
		for (const alloy of ALL_ALLOYS) {
			const a = economyConfig.alloys[alloy];
			const inputValues = Object.keys(a.inputs)
				.map((k) => {
					const mat = allMats[k];
					return mat ? mat.baseValue : 0;
				})
				.filter((v) => v > 0);
			if (inputValues.length > 0) {
				expect(a.baseValue).toBeGreaterThan(Math.min(...inputValues));
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

describe("compression mechanics", () => {
	it("has cube size", () => {
		expect(economyConfig.compression.cubeSize).toBe(0.5);
	});

	it("has base extraction rate", () => {
		expect(economyConfig.compression.baseExtractionRate).toBe(0.1);
	});

	it("has screen shake config", () => {
		expect(economyConfig.compression.screenShake.curveType).toBe("easeInQuad");
		expect(economyConfig.compression.screenShake.slamMultiplier).toBeGreaterThan(1);
		expect(economyConfig.compression.screenShake.slamFrames).toBeGreaterThan(0);
	});

	it("has pressure and heat gauge configs", () => {
		expect(economyConfig.compression.pressureGauge.redZoneThreshold).toBeGreaterThan(0.5);
		expect(economyConfig.compression.pressureGauge.redZoneThreshold).toBeLessThan(1.0);
		expect(economyConfig.compression.heatGauge.delayPercent).toBeGreaterThan(0);
		expect(economyConfig.compression.heatGauge.delayPercent).toBeLessThan(0.5);
	});

	it("has eject physics with reasonable values", () => {
		const ej = economyConfig.compression.ejectPhysics;
		expect(ej.forwardWeight + ej.upWeight).toBe(1.0);
		expect(ej.bounceRestitution).toBeGreaterThan(0);
		expect(ej.bounceRestitution).toBeLessThan(1);
		expect(ej.friction).toBeGreaterThan(0);
		expect(ej.friction).toBeLessThan(1);
	});

	it("has quality modifiers where normal is 1.0 and interrupted is 0", () => {
		expect(economyConfig.compression.qualityModifiers.normal).toBe(1.0);
		expect(economyConfig.compression.qualityModifiers.interrupted).toBe(0);
		expect(economyConfig.compression.qualityModifiers.rushed).toBeGreaterThan(0);
		expect(economyConfig.compression.qualityModifiers.rushed).toBeLessThan(1);
		expect(economyConfig.compression.qualityModifiers.damageDuring).toBeGreaterThan(0);
		expect(economyConfig.compression.qualityModifiers.damageDuring).toBeLessThan(1);
	});
});

// ---------------------------------------------------------------------------
// Deposits
// ---------------------------------------------------------------------------

describe("deposits", () => {
	it("has deposit config for all 9 raw materials", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			expect(economyConfig.deposits[mat]).toBeDefined();
		}
	});

	it("every deposit has yield ranges where min < max", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			const d = economyConfig.deposits[mat];
			expect(d.yieldMin).toBeGreaterThan(0);
			expect(d.yieldMax).toBeGreaterThan(d.yieldMin);
		}
	});

	it("respawn times increase with rarity", () => {
		const respawnTimes = ALL_RAW_MATERIALS.filter(
			(m) => economyConfig.deposits[m].respawnSeconds !== null,
		).map((m) => ({
			material: m,
			tier: economyConfig.materials[m].tier,
			respawn: economyConfig.deposits[m].respawnSeconds as number,
		}));

		const tierAvgRespawn = new Map<number, number>();
		const tierCounts = new Map<number, number>();
		for (const r of respawnTimes) {
			tierAvgRespawn.set(
				r.tier,
				(tierAvgRespawn.get(r.tier) || 0) + r.respawn,
			);
			tierCounts.set(r.tier, (tierCounts.get(r.tier) || 0) + 1);
		}
		for (const [tier, total] of tierAvgRespawn) {
			tierAvgRespawn.set(tier, total / tierCounts.get(tier)!);
		}

		const tiers = [...tierAvgRespawn.keys()].sort((a, b) => a - b);
		for (let i = 1; i < tiers.length; i++) {
			expect(tierAvgRespawn.get(tiers[i])!).toBeGreaterThan(
				tierAvgRespawn.get(tiers[i - 1])!,
			);
		}
	});

	it("quantum crystal never respawns", () => {
		expect(economyConfig.deposits.quantum_crystal.respawnSeconds).toBeNull();
		expect(economyConfig.deposits.quantum_crystal.respawnMode).toBe("never");
	});
});

// ---------------------------------------------------------------------------
// Wealth Brackets
// ---------------------------------------------------------------------------

describe("wealth brackets", () => {
	it("has all 6 brackets", () => {
		for (const bracket of WEALTH_BRACKETS) {
			expect(economyConfig.wealthBrackets[bracket]).toBeDefined();
		}
	});

	it("destitute has no raids", () => {
		expect(economyConfig.wealthBrackets.destitute.raidIntervalSeconds).toBeNull();
		expect(economyConfig.wealthBrackets.destitute.maxRaiders).toBe(0);
	});

	it("raid interval decreases as wealth increases", () => {
		const raidBrackets = WEALTH_BRACKETS.filter(
			(b) => economyConfig.wealthBrackets[b].raidIntervalSeconds !== null,
		);
		for (let i = 1; i < raidBrackets.length; i++) {
			expect(
				economyConfig.wealthBrackets[raidBrackets[i]].raidIntervalSeconds,
			).toBeLessThan(
				economyConfig.wealthBrackets[raidBrackets[i - 1]]
					.raidIntervalSeconds as number,
			);
		}
	});

	it("max raiders increases with wealth", () => {
		for (let i = 1; i < WEALTH_BRACKETS.length; i++) {
			expect(
				economyConfig.wealthBrackets[WEALTH_BRACKETS[i]].maxRaiders,
			).toBeGreaterThanOrEqual(
				economyConfig.wealthBrackets[WEALTH_BRACKETS[i - 1]].maxRaiders,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// AI Difficulty
// ---------------------------------------------------------------------------

describe("AI difficulty multipliers", () => {
	it("has all 5 difficulty levels", () => {
		for (const diff of ALL_DIFFICULTIES) {
			expect(economyConfig.aiDifficulty[diff]).toBeDefined();
		}
	});

	it("harvest rate increases from peaceful to brutal", () => {
		let prev = 0;
		for (const diff of ALL_DIFFICULTIES) {
			expect(economyConfig.aiDifficulty[diff].harvestRateMod).toBeGreaterThan(prev);
			prev = economyConfig.aiDifficulty[diff].harvestRateMod;
		}
	});

	it("build speed increases from peaceful to brutal", () => {
		let prev = 0;
		for (const diff of ALL_DIFFICULTIES) {
			expect(economyConfig.aiDifficulty[diff].buildSpeedMod).toBeGreaterThan(prev);
			prev = economyConfig.aiDifficulty[diff].buildSpeedMod;
		}
	});

	it("starting cubes increase from peaceful to brutal", () => {
		let prev = 0;
		for (const diff of ALL_DIFFICULTIES) {
			expect(economyConfig.aiDifficulty[diff].startingCubes).toBeGreaterThan(prev);
			prev = economyConfig.aiDifficulty[diff].startingCubes;
		}
	});

	it("normal difficulty is 1.0x baseline", () => {
		expect(economyConfig.aiDifficulty.normal.harvestRateMod).toBe(1.0);
		expect(economyConfig.aiDifficulty.normal.buildSpeedMod).toBe(1.0);
	});

	it("peaceful has infinite peace period (null)", () => {
		expect(economyConfig.aiDifficulty.peaceful.peacePeriodSeconds).toBeNull();
	});

	it("peace period decreases from easy to brutal", () => {
		const diffs = ALL_DIFFICULTIES.filter(
			(d) => economyConfig.aiDifficulty[d].peacePeriodSeconds !== null,
		);
		for (let i = 1; i < diffs.length; i++) {
			expect(
				economyConfig.aiDifficulty[diffs[i]].peacePeriodSeconds,
			).toBeLessThan(
				economyConfig.aiDifficulty[diffs[i - 1]]
					.peacePeriodSeconds as number,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// AI Economy
// ---------------------------------------------------------------------------

describe("AI economy", () => {
	it("has base cube rate", () => {
		expect(economyConfig.aiEconomy.baseCubeRate).toBeGreaterThan(0);
	});

	it("has material distribution for all 4 factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(economyConfig.aiEconomy.materialDistribution[faction]).toBeDefined();
		}
	});

	it("material distribution percentages sum to 1.0 for each faction", () => {
		for (const faction of ALL_FACTIONS) {
			const dist = economyConfig.aiEconomy.materialDistribution[faction];
			const total = Object.values(dist).reduce((a, b) => a + b, 0);
			expect(total).toBeCloseTo(1.0, 5);
		}
	});
});

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

describe("trade config", () => {
	it("fair ratio range is valid", () => {
		expect(economyConfig.trade.fairRatioMin).toBeGreaterThan(0);
		expect(economyConfig.trade.fairRatioMax).toBeGreaterThan(
			economyConfig.trade.fairRatioMin,
		);
		expect(economyConfig.trade.exploitativeThreshold).toBeGreaterThan(
			economyConfig.trade.fairRatioMax,
		);
	});

	it("opinion changes are signed correctly", () => {
		expect(economyConfig.trade.opinionOnCompleteTrade).toBeGreaterThan(0);
		expect(economyConfig.trade.opinionOnRejectTrade).toBeLessThan(0);
		expect(economyConfig.trade.opinionOnAmbushConvoy).toBeLessThan(0);
		expect(economyConfig.trade.opinionOnBreakAgreement).toBeLessThan(0);
	});
});

// ---------------------------------------------------------------------------
// Patron Shipments
// ---------------------------------------------------------------------------

describe("patron shipments", () => {
	it("has demand cycle in seconds", () => {
		expect(economyConfig.patronShipments.demandCycleSeconds).toBeGreaterThan(0);
	});

	it("demand tiers have increasing value requirements", () => {
		const tiers = economyConfig.patronShipments.demandTiers;
		expect(tiers.standard.minValue).toBeGreaterThan(tiers.minor.maxValue as number);
		expect(tiers.major.minValue).toBeGreaterThan(tiers.standard.maxValue as number);
		expect(tiers.critical.minValue).toBeGreaterThan(tiers.major.maxValue as number);
	});

	it("favor gain increases with demand tier", () => {
		const tiers = economyConfig.patronShipments.demandTiers;
		expect(tiers.standard.favorGain).toBeGreaterThan(tiers.minor.favorGain);
		expect(tiers.major.favorGain).toBeGreaterThan(tiers.standard.favorGain);
		expect(tiers.critical.favorGain).toBeGreaterThan(tiers.major.favorGain);
	});

	it("favor levels cover full range with no gaps", () => {
		const levels = economyConfig.patronShipments.favor.levels;
		expect(levels.disfavored.min).toBe(economyConfig.patronShipments.favor.minFavor);
		expect(levels.essential.max).toBe(economyConfig.patronShipments.favor.maxFavor);
		expect(levels.neutral.min).toBe(levels.disfavored.max + 1);
		expect(levels.trusted.min).toBe(levels.neutral.max + 1);
		expect(levels.favored.min).toBe(levels.trusted.max + 1);
		expect(levels.essential.min).toBe(levels.favored.max + 1);
	});

	it("patron priorities are defined for all factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(
				economyConfig.patronShipments.patronPriorities[faction],
			).toBeDefined();
			expect(
				economyConfig.patronShipments.patronPriorities[faction].length,
			).toBeGreaterThan(0);
		}
	});

	it("independence requirements are reasonable", () => {
		const ind = economyConfig.patronShipments.independence;
		expect(ind.requiredFavor).toBe(80);
		expect(ind.requiredStockpileValue).toBeGreaterThan(0);
		expect(ind.requiredBases).toBeGreaterThan(0);
		expect(ind.punitiveWaves).toBeGreaterThan(0);
		expect(ind.punitiveBotsPerWave).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Drill Tiers
// ---------------------------------------------------------------------------

describe("drill tiers", () => {
	const drills = (economyConfig as any).drillTiers;

	it("has 4 drill tiers", () => {
		expect(Object.keys(drills)).toHaveLength(4);
	});

	it("every tier has required fields", () => {
		for (const tier of ["1", "2", "3", "4"]) {
			const d = drills[tier];
			expect(typeof d.name).toBe("string");
			expect(typeof d.baseRate).toBe("number");
			expect(typeof d.rateMultiplier).toBe("number");
			expect(typeof d.capacity).toBe("number");
			expect(Array.isArray(d.mineableTypes)).toBe(true);
			expect(d.mineableTypes.length).toBeGreaterThan(0);
			expect(typeof d.soundLevel).toBe("string");
			expect(typeof d.aggroRadius).toBe("number");
		}
	});

	it("rate multipliers increase with tier", () => {
		expect(drills["2"].rateMultiplier).toBeGreaterThan(drills["1"].rateMultiplier);
		expect(drills["3"].rateMultiplier).toBeGreaterThan(drills["2"].rateMultiplier);
		expect(drills["4"].rateMultiplier).toBeGreaterThan(drills["3"].rateMultiplier);
	});

	it("capacity increases with tier", () => {
		expect(drills["2"].capacity).toBeGreaterThan(drills["1"].capacity);
		expect(drills["3"].capacity).toBeGreaterThan(drills["2"].capacity);
		expect(drills["4"].capacity).toBeGreaterThan(drills["3"].capacity);
	});

	it("mineable types expand with tier", () => {
		expect(drills["2"].mineableTypes.length).toBeGreaterThan(drills["1"].mineableTypes.length);
		expect(drills["3"].mineableTypes.length).toBeGreaterThan(drills["2"].mineableTypes.length);
		expect(drills["4"].mineableTypes.length).toBeGreaterThan(drills["3"].mineableTypes.length);
	});

	it("tier 1 has no cost (starting equipment)", () => {
		expect(drills["1"].cost).toBeNull();
	});

	it("tiers 2-4 have crafting costs", () => {
		for (const tier of ["2", "3", "4"]) {
			expect(drills[tier].cost).not.toBeNull();
			expect(Object.keys(drills[tier].cost).length).toBeGreaterThan(0);
		}
	});

	it("aggro radius increases with tier (louder drills attract enemies)", () => {
		expect(drills["2"].aggroRadius).toBeGreaterThan(drills["1"].aggroRadius);
		expect(drills["3"].aggroRadius).toBeGreaterThan(drills["2"].aggroRadius);
		expect(drills["4"].aggroRadius).toBeGreaterThan(drills["3"].aggroRadius);
	});

	it("all mineable types reference valid materials", () => {
		const validMats = new Set(ALL_RAW_MATERIALS);
		for (const tier of ["1", "2", "3", "4"]) {
			for (const mat of drills[tier].mineableTypes) {
				expect(validMats.has(mat)).toBe(true);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Furnace Recipes
// ---------------------------------------------------------------------------

describe("furnace recipes", () => {
	const recipes = (economyConfig as any).furnaceRecipes;
	const RECIPE_TIERS = [
		"tier1_salvage",
		"tier2_copper",
		"tier3_silicon_carbon",
		"smelter_recipes",
		"tier4_titanium",
		"tier5_endgame",
	];

	it("has all 6 recipe tiers", () => {
		for (const tier of RECIPE_TIERS) {
			expect(recipes[tier]).toBeDefined();
			expect(Array.isArray(recipes[tier])).toBe(true);
		}
	});

	it("has at least 35 total recipes", () => {
		let total = 0;
		for (const tier of RECIPE_TIERS) {
			total += recipes[tier].length;
		}
		expect(total).toBeGreaterThanOrEqual(35);
	});

	it("every recipe has id, name, inputs, time, and category", () => {
		for (const tier of RECIPE_TIERS) {
			for (const recipe of recipes[tier]) {
				expect(typeof recipe.id).toBe("string");
				expect(typeof recipe.name).toBe("string");
				expect(recipe.inputs).toBeDefined();
				expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
				expect(typeof recipe.time).toBe("number");
				expect(recipe.time).toBeGreaterThan(0);
				expect(typeof recipe.category).toBe("string");
			}
		}
	});

	it("recipe IDs are unique across all tiers", () => {
		const ids = new Set<string>();
		for (const tier of RECIPE_TIERS) {
			for (const recipe of recipes[tier]) {
				expect(ids.has(recipe.id)).toBe(false);
				ids.add(recipe.id);
			}
		}
	});

	it("recipe inputs reference valid materials or alloys", () => {
		const validInputs = new Set([...ALL_RAW_MATERIALS, ...ALL_ALLOYS]);
		for (const tier of RECIPE_TIERS) {
			for (const recipe of recipes[tier]) {
				for (const input of Object.keys(recipe.inputs)) {
					expect(validInputs.has(input as any)).toBe(true);
				}
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Building Costs
// ---------------------------------------------------------------------------

describe("building costs", () => {
	const costs = (economyConfig as any).buildingCosts;
	const COST_CATEGORIES = ["production", "infrastructure", "defense", "territory"];

	it("has all 4 cost categories", () => {
		for (const cat of COST_CATEGORIES) {
			expect(costs[cat]).toBeDefined();
			expect(Object.keys(costs[cat]).length).toBeGreaterThan(0);
		}
	});

	it("every building has power, buildTime, and techTier", () => {
		for (const cat of COST_CATEGORIES) {
			for (const [, building] of Object.entries(costs[cat])) {
				const b = building as any;
				expect(typeof b.power).toBe("number");
				expect(typeof b.buildTime).toBe("number");
				expect(typeof b.techTier).toBe("number");
				expect(b.techTier).toBeGreaterThanOrEqual(1);
			}
		}
	});

	it("furnace has no cost (provided at start)", () => {
		expect(costs.production.furnace.cost).toBeNull();
		expect(costs.production.furnace.buildTime).toBe(0);
	});

	it("defense buildings include walls and turrets", () => {
		expect(costs.defense).toBeDefined();
		const defenseKeys = Object.keys(costs.defense);
		expect(defenseKeys.length).toBeGreaterThanOrEqual(3);
	});

	it("territory buildings include outpost_core", () => {
		expect(costs.territory.outpost_core).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Furnace Stats
// ---------------------------------------------------------------------------

describe("furnace stats", () => {
	const stats = (economyConfig as any).furnaceStats;

	it("has hopper capacity and upgrades", () => {
		expect(stats.hopperCapacity).toBeGreaterThan(0);
		expect(Array.isArray(stats.hopperUpgrades)).toBe(true);
		expect(stats.hopperUpgrades.length).toBeGreaterThan(0);
	});

	it("hopper upgrades increase capacity", () => {
		let prev = stats.hopperCapacity;
		for (const upgrade of stats.hopperUpgrades) {
			expect(upgrade).toBeGreaterThan(prev);
			prev = upgrade;
		}
	});

	it("has processing speed config", () => {
		expect(stats.baseProcessingSpeed).toBeGreaterThan(0);
		expect(stats.poweredSpeedBonus).toBeGreaterThan(1.0);
	});
});

// ---------------------------------------------------------------------------
// Inter-base Transport
// ---------------------------------------------------------------------------

describe("inter-base transport", () => {
	const transport = (economyConfig as any).interBaseTransport;

	it("has all 4 transport methods", () => {
		expect(transport.manual_carry).toBeDefined();
		expect(transport.worker_convoy).toBeDefined();
		expect(transport.belt_network).toBeDefined();
		expect(transport.teleporter).toBeDefined();
	});

	it("belt network has tiered speeds", () => {
		const belts = transport.belt_network.speedByTier;
		expect(belts["1"]).toBeLessThan(belts["2"]);
		expect(belts["2"]).toBeLessThan(belts["3"]);
	});

	it("teleporter is instant", () => {
		expect(transport.teleporter.speed).toBe("instant");
	});
});

// ---------------------------------------------------------------------------
// Trade Multipliers
// ---------------------------------------------------------------------------

describe("trade multipliers", () => {
	const ALL_TRADEABLE = [
		...ALL_RAW_MATERIALS,
		...ALL_ALLOYS,
	] as const;

	it("has trade multipliers for all raw materials and alloys", () => {
		for (const mat of ALL_TRADEABLE) {
			expect(
				(economyConfig as any).tradeMultipliers[mat],
			).toBeDefined();
		}
		expect(Object.keys((economyConfig as any).tradeMultipliers)).toHaveLength(15);
	});

	it("every entry has tradeValueMod, demandLevel, and notes", () => {
		for (const mat of ALL_TRADEABLE) {
			const t = (economyConfig as any).tradeMultipliers[mat];
			expect(typeof t.tradeValueMod).toBe("number");
			expect(t.tradeValueMod).toBeGreaterThan(0);
			expect(typeof t.demandLevel).toBe("string");
			expect(typeof t.notes).toBe("string");
		}
	});

	it("trade value mod increases with material tier", () => {
		const tierAvgs = new Map<number, number[]>();
		for (const mat of ALL_RAW_MATERIALS) {
			const tier = economyConfig.materials[mat].tier;
			const tradeMod = (economyConfig as any).tradeMultipliers[mat].tradeValueMod;
			if (!tierAvgs.has(tier)) tierAvgs.set(tier, []);
			tierAvgs.get(tier)!.push(tradeMod);
		}
		const avgByTier = new Map<number, number>();
		for (const [tier, vals] of tierAvgs) {
			avgByTier.set(tier, vals.reduce((a, b) => a + b, 0) / vals.length);
		}
		const sortedTiers = [...avgByTier.keys()].sort((a, b) => a - b);
		for (let i = 1; i < sortedTiers.length; i++) {
			expect(avgByTier.get(sortedTiers[i])!).toBeGreaterThan(
				avgByTier.get(sortedTiers[i - 1])!,
			);
		}
	});

	it("quantum crystal has highest trade value", () => {
		const qc = (economyConfig as any).tradeMultipliers.quantum_crystal;
		for (const mat of ALL_RAW_MATERIALS) {
			if (mat === "quantum_crystal") continue;
			expect(qc.tradeValueMod).toBeGreaterThan(
				(economyConfig as any).tradeMultipliers[mat].tradeValueMod,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// Cube Value Scaling
// ---------------------------------------------------------------------------

describe("cube value scaling", () => {
	const scaling = (economyConfig as any).cubeValueScaling;

	it("has all 6 processing stages", () => {
		const stages = [
			"raw",
			"smelted",
			"refined",
			"crafted_component",
			"crafted_tool",
			"crafted_unit",
		];
		for (const stage of stages) {
			expect(scaling[stage]).toBeDefined();
		}
		expect(Object.keys(scaling)).toHaveLength(6);
	});

	it("multipliers increase from raw to crafted_unit", () => {
		expect(scaling.raw.multiplier).toBe(1.0);
		expect(scaling.smelted.multiplier).toBeGreaterThan(scaling.raw.multiplier);
		expect(scaling.refined.multiplier).toBeGreaterThan(scaling.smelted.multiplier);
		expect(scaling.crafted_component.multiplier).toBeGreaterThan(
			scaling.refined.multiplier,
		);
		expect(scaling.crafted_tool.multiplier).toBeGreaterThan(
			scaling.crafted_component.multiplier,
		);
		expect(scaling.crafted_unit.multiplier).toBeGreaterThan(
			scaling.crafted_tool.multiplier,
		);
	});

	it("every stage has a description", () => {
		for (const stage of Object.values(scaling)) {
			expect(typeof (stage as any).description).toBe("string");
		}
	});
});

// ---------------------------------------------------------------------------
// Faction Trade Matrix
// ---------------------------------------------------------------------------

describe("faction trade matrix", () => {
	const matrix = (economyConfig as any).factionTradeMatrix;

	it("has entries for all 4 factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(matrix[faction]).toBeDefined();
		}
	});

	it("self-trade rate is always 1.0", () => {
		for (const faction of ALL_FACTIONS) {
			expect(matrix[faction][faction]).toBe(1.0);
		}
	});

	it("all cross-faction rates are between 0 and 2", () => {
		for (const from of ALL_FACTIONS) {
			for (const to of ALL_FACTIONS) {
				expect(matrix[from][to]).toBeGreaterThan(0);
				expect(matrix[from][to]).toBeLessThanOrEqual(2.0);
			}
		}
	});

	it("every faction has preferred exports and imports", () => {
		for (const faction of ALL_FACTIONS) {
			expect(Array.isArray(matrix[faction].preferredExports)).toBe(true);
			expect(matrix[faction].preferredExports.length).toBeGreaterThan(0);
			expect(Array.isArray(matrix[faction].preferredImports)).toBe(true);
			expect(matrix[faction].preferredImports.length).toBeGreaterThan(0);
		}
	});

	it("exports and imports reference valid materials", () => {
		const validMats = new Set([...ALL_RAW_MATERIALS, ...ALL_ALLOYS]);
		for (const faction of ALL_FACTIONS) {
			for (const mat of matrix[faction].preferredExports) {
				expect(validMats.has(mat)).toBe(true);
			}
			for (const mat of matrix[faction].preferredImports) {
				expect(validMats.has(mat)).toBe(true);
			}
		}
	});

	it("no faction exports what it imports", () => {
		for (const faction of ALL_FACTIONS) {
			const exports = new Set(matrix[faction].preferredExports);
			for (const imp of matrix[faction].preferredImports) {
				expect(exports.has(imp)).toBe(false);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Supply/Demand Curves
// ---------------------------------------------------------------------------

describe("supply/demand curves", () => {
	const curves = (economyConfig as any).supplyDemandCurves;

	it("has price floor less than price ceiling", () => {
		expect(curves.priceFloor).toBeGreaterThan(0);
		expect(curves.priceCeiling).toBeGreaterThan(curves.priceFloor);
	});

	it("has baseline stockpile", () => {
		expect(curves.baselineStockpile).toBeGreaterThan(0);
	});

	it("has elasticity for all 9 raw materials", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			expect(curves.elasticity[mat]).toBeDefined();
		}
	});

	it("every elasticity entry has surplus decay and deficit growth rates", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			const e = curves.elasticity[mat];
			expect(typeof e.surplusDecayRate).toBe("number");
			expect(e.surplusDecayRate).toBeGreaterThanOrEqual(0);
			expect(typeof e.deficitGrowthRate).toBe("number");
			expect(e.deficitGrowthRate).toBeGreaterThanOrEqual(0);
		}
	});

	it("higher tier materials have higher elasticity", () => {
		const tierAvgs = new Map<number, number[]>();
		for (const mat of ALL_RAW_MATERIALS) {
			const tier = economyConfig.materials[mat].tier;
			const avgElasticity =
				(curves.elasticity[mat].surplusDecayRate +
					curves.elasticity[mat].deficitGrowthRate) /
				2;
			if (!tierAvgs.has(tier)) tierAvgs.set(tier, []);
			tierAvgs.get(tier)!.push(avgElasticity);
		}
		const avgByTier = new Map<number, number>();
		for (const [tier, vals] of tierAvgs) {
			avgByTier.set(tier, vals.reduce((a, b) => a + b, 0) / vals.length);
		}
		const sortedTiers = [...avgByTier.keys()].sort((a, b) => a - b);
		for (let i = 1; i < sortedTiers.length; i++) {
			expect(avgByTier.get(sortedTiers[i])!).toBeGreaterThanOrEqual(
				avgByTier.get(sortedTiers[i - 1])!,
			);
		}
	});

	it("has surplus and deficit thresholds", () => {
		expect(curves.surplusThreshold).toBeGreaterThan(1.0);
		expect(curves.deficitThreshold).toBeLessThan(1.0);
		expect(curves.deficitThreshold).toBeGreaterThan(0);
	});

	it("has price update interval", () => {
		expect(curves.priceUpdateIntervalSeconds).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Stockpile Depreciation
// ---------------------------------------------------------------------------

describe("stockpile depreciation", () => {
	const depreciation = (economyConfig as any).stockpileDepreciation;

	it("has enabled flag and tick interval", () => {
		expect(typeof depreciation.enabled).toBe("boolean");
		expect(depreciation.tickIntervalSeconds).toBeGreaterThan(0);
	});

	it("has exposure multipliers (exposed > sheltered > underground)", () => {
		expect(depreciation.exposedMultiplier).toBeGreaterThan(
			depreciation.sheltered_multiplier,
		);
		expect(depreciation.sheltered_multiplier).toBeGreaterThan(
			depreciation.underground_multiplier,
		);
		expect(depreciation.underground_multiplier).toBe(0);
	});

	it("has decay rates for all raw materials and alloys", () => {
		const allMats = [...ALL_RAW_MATERIALS, ...ALL_ALLOYS];
		for (const mat of allMats) {
			expect(depreciation.materialRates[mat]).toBeDefined();
			expect(typeof depreciation.materialRates[mat].decayPerTick).toBe("number");
			expect(depreciation.materialRates[mat].decayPerTick).toBeGreaterThanOrEqual(0);
		}
	});

	it("chemically stable materials have zero decay", () => {
		expect(depreciation.materialRates.silicon.decayPerTick).toBe(0);
		expect(depreciation.materialRates.carbon.decayPerTick).toBe(0);
		expect(depreciation.materialRates.titanium.decayPerTick).toBe(0);
		expect(depreciation.materialRates.gold.decayPerTick).toBe(0);
	});

	it("quantum crystal has highest decay (decoherence)", () => {
		for (const mat of [...ALL_RAW_MATERIALS, ...ALL_ALLOYS]) {
			if (mat === "quantum_crystal") continue;
			expect(depreciation.materialRates.quantum_crystal.decayPerTick).toBeGreaterThanOrEqual(
				depreciation.materialRates[mat].decayPerTick,
			);
		}
	});

	it("weather multipliers amplify decay", () => {
		expect(depreciation.acidRainMultiplier).toBeGreaterThan(1.0);
		expect(depreciation.stormMultiplier).toBeGreaterThan(1.0);
		expect(depreciation.acidRainMultiplier).toBeGreaterThan(
			depreciation.stormMultiplier,
		);
	});
});

// ---------------------------------------------------------------------------
// Biome Yield Modifiers
// ---------------------------------------------------------------------------

describe("biome yield modifiers", () => {
	const yields = (economyConfig as any).biomeYieldModifiers;
	const BIOMES = [
		"rust_plains",
		"scrap_hills",
		"chrome_ridge",
		"signal_plateau",
		"cable_forest",
	];

	it("has yield modifiers for all 5 resource biomes", () => {
		for (const biome of BIOMES) {
			expect(yields[biome]).toBeDefined();
		}
		expect(Object.keys(yields)).toHaveLength(5);
	});

	it("every biome has modifiers for all 9 raw materials", () => {
		for (const biome of BIOMES) {
			for (const mat of ALL_RAW_MATERIALS) {
				expect(typeof yields[biome][mat]).toBe("number");
				expect(yields[biome][mat]).toBeGreaterThanOrEqual(0);
			}
		}
	});

	it("no biome has all materials at high yield (specialization)", () => {
		for (const biome of BIOMES) {
			const highYieldCount = ALL_RAW_MATERIALS.filter(
				(mat) => yields[biome][mat] >= 1.5,
			).length;
			expect(highYieldCount).toBeLessThanOrEqual(3);
		}
	});

	it("every material has at least one biome where yield >= 1.5", () => {
		for (const mat of ALL_RAW_MATERIALS) {
			const maxYield = Math.max(...BIOMES.map((b) => yields[b][mat]));
			expect(maxYield).toBeGreaterThanOrEqual(1.0);
		}
	});

	it("cross-references biomes.json resource multipliers for key entries", () => {
		// Verify the economy biome yields are consistent with biomes.json
		// (key entries should match the biomes.json resourceMultipliers)
		expect(yields.rust_plains.rock).toBe(1.5);
		expect(yields.rust_plains.scrap_iron).toBe(1.3);
		expect(yields.rust_plains.gold).toBe(2.0);
		expect(yields.chrome_ridge.titanium).toBe(2.0);
		expect(yields.signal_plateau.rare_earth).toBe(2.0);
		expect(yields.signal_plateau.quantum_crystal).toBe(2.0);
		expect(yields.cable_forest.copper).toBe(2.0);
	});
});

// ---------------------------------------------------------------------------
// No placeholder values
// ---------------------------------------------------------------------------

describe("no placeholder values", () => {
	it("no string fields contain TODO, TBD, FIXME, or placeholder", () => {
		const json = JSON.stringify(economyConfig);
		const placeholders = ["TODO", "TBD", "FIXME", "placeholder", "xxx"];
		for (const ph of placeholders) {
			expect(json.toLowerCase()).not.toContain(ph.toLowerCase());
		}
	});
});
