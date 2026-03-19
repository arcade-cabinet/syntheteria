import { describe, expect, it } from "vitest";
import { BUILDING_BLUEPRINTS, getBuildingDisplayName } from "../buildingDefs";
import {
	BREAK_ALLIANCE_PENALTY,
	BREAK_TRADE_PENALTY,
	getStandingTier,
	STANDING_CHANGES,
	STANDING_DECAY_PER_TURN,
	STANDING_TIERS,
	TRADE_INCOME_SHARE_PERCENT,
} from "../diplomacyDefs";
import {
	FACTION_AI_BIASES,
	FACTION_AI_IDS,
	getDominantBias,
} from "../factionAiDefs";
import {
	getThoughtsForTrigger,
	NARRATIVE_THOUGHTS,
	THOUGHT_BY_ID,
} from "../narrativeDefs";
import {
	FOUNDABLE_POI_TYPES,
	POI_BY_TYPE,
	POI_DEFINITIONS,
	POI_DISCOVERY_RADIUS,
	poiToTile,
} from "../poiDefs";
import {
	COMPONENT_RECIPES,
	getRecipeCostMap,
	RECIPE_BY_ID,
} from "../recipeDefs";
import {
	MARK_LEVEL_COSTS,
	MARK_UPGRADE_TICKS,
	MAX_MARK_LEVEL,
	MOTOR_POOL_TIERS,
	UPGRADE_ADJACENCY_RANGE,
} from "../upgradeDefs";
import {
	CULTIST_ACTIVITY,
	POWER_GENERATION,
	REPAIR_SPEED,
	STORM_VISUAL_PARAMS,
	WEATHER_VISIBILITY,
	WORMHOLE_CYCLE,
} from "../weatherDefs";

// ─── Diplomacy config ────────────────────────────────────────────────────────

describe("diplomacy config", () => {
	it("standing tiers cover the full -100 to +100 range", () => {
		expect(STANDING_TIERS.hostile.min).toBe(-100);
		expect(STANDING_TIERS.allied.max).toBe(100);
	});

	it("getStandingTier returns correct tier for edge cases", () => {
		expect(getStandingTier(-100)).toBe("hostile");
		expect(getStandingTier(-50)).toBe("hostile");
		expect(getStandingTier(-49)).toBe("unfriendly");
		expect(getStandingTier(-10)).toBe("unfriendly");
		expect(getStandingTier(-9)).toBe("neutral");
		expect(getStandingTier(0)).toBe("neutral");
		expect(getStandingTier(10)).toBe("neutral");
		expect(getStandingTier(11)).toBe("cordial");
		expect(getStandingTier(50)).toBe("cordial");
		expect(getStandingTier(51)).toBe("allied");
		expect(getStandingTier(100)).toBe("allied");
	});

	it("standing changes are all non-zero", () => {
		for (const [action, delta] of Object.entries(STANDING_CHANGES)) {
			expect(delta).not.toBe(0);
		}
	});

	it("attack is the most severe negative standing change", () => {
		expect(STANDING_CHANGES.unit_attacked).toBeLessThan(
			STANDING_CHANGES.territory_encroachment,
		);
		expect(STANDING_CHANGES.unit_attacked).toBeLessThan(
			STANDING_CHANGES.hacking_detected,
		);
	});

	it("trade income share is a reasonable percentage", () => {
		expect(TRADE_INCOME_SHARE_PERCENT).toBeGreaterThan(0);
		expect(TRADE_INCOME_SHARE_PERCENT).toBeLessThan(100);
	});

	it("breaking alliance is worse than breaking trade", () => {
		expect(BREAK_ALLIANCE_PENALTY).toBeLessThan(BREAK_TRADE_PENALTY);
	});

	it("standing decay is positive (moves toward 0)", () => {
		expect(STANDING_DECAY_PER_TURN).toBeGreaterThan(0);
	});
});

// ─── Narrative config ────────────────────────────────────────────────────────

describe("narrative config", () => {
	it("has 9 narrative thoughts", () => {
		expect(NARRATIVE_THOUGHTS).toHaveLength(9);
	});

	it("all thoughts have unique IDs", () => {
		const ids = new Set(NARRATIVE_THOUGHTS.map((t) => t.id));
		expect(ids.size).toBe(NARRATIVE_THOUGHTS.length);
	});

	it("THOUGHT_BY_ID contains all thoughts", () => {
		expect(THOUGHT_BY_ID.size).toBe(NARRATIVE_THOUGHTS.length);
	});

	it("game_start trigger exists at consciousness level 0", () => {
		const starts = getThoughtsForTrigger("game_start");
		expect(starts).toHaveLength(1);
		expect(starts[0].consciousnessLevel).toBe(0);
	});

	it("consciousness levels progress from 0 to 2", () => {
		const levels = new Set(NARRATIVE_THOUGHTS.map((t) => t.consciousnessLevel));
		expect(levels.has(0)).toBe(true);
		expect(levels.has(1)).toBe(true);
		expect(levels.has(2)).toBe(true);
	});
});

// ─── POI config ──────────────────────────────────────────────────────────────

describe("POI config", () => {
	it("has 7 POI definitions", () => {
		expect(POI_DEFINITIONS).toHaveLength(7);
	});

	it("home_base is the only POI discovered at start", () => {
		const discovered = POI_DEFINITIONS.filter((p) => p.discoveredAtStart);
		expect(discovered).toHaveLength(1);
		expect(discovered[0].type).toBe("home_base");
	});

	it("home_base is at board center (0.5, 0.5)", () => {
		const home = POI_BY_TYPE.get("home_base");
		expect(home?.relativeX).toBe(0.5);
		expect(home?.relativeZ).toBe(0.5);
	});

	it("all relative coordinates are in [0, 1] range", () => {
		for (const poi of POI_DEFINITIONS) {
			expect(poi.relativeX).toBeGreaterThanOrEqual(0);
			expect(poi.relativeX).toBeLessThanOrEqual(1);
			expect(poi.relativeZ).toBeGreaterThanOrEqual(0);
			expect(poi.relativeZ).toBeLessThanOrEqual(1);
		}
	});

	it("poiToTile scales correctly", () => {
		const home = POI_DEFINITIONS[0]; // home_base at (0.5, 0.5)
		const tile = poiToTile(home, 64, 64);
		expect(tile.x).toBe(32);
		expect(tile.z).toBe(32);
	});

	it("discovery radius is positive", () => {
		expect(POI_DISCOVERY_RADIUS).toBeGreaterThan(0);
	});

	it("foundable types include home_base and resource_depot", () => {
		expect(FOUNDABLE_POI_TYPES).toContain("home_base");
		expect(FOUNDABLE_POI_TYPES).toContain("resource_depot");
	});
});

// ─── Weather config ──────────────────────────────────────────────────────────

describe("weather config", () => {
	it("visibility multipliers decrease with storm intensity", () => {
		expect(WEATHER_VISIBILITY.clearMultiplier).toBeGreaterThan(
			WEATHER_VISIBILITY.lightRainMultiplier,
		);
		expect(WEATHER_VISIBILITY.lightRainMultiplier).toBeGreaterThan(
			WEATHER_VISIBILITY.heavyRainMultiplier,
		);
		expect(WEATHER_VISIBILITY.heavyRainMultiplier).toBeGreaterThan(
			WEATHER_VISIBILITY.surgeMultiplier,
		);
	});

	it("night penalty reduces visibility", () => {
		expect(WEATHER_VISIBILITY.nightPenalty).toBeLessThan(1.0);
	});

	it("power generation is lower at night", () => {
		expect(POWER_GENERATION.nightMultiplier).toBeLessThan(
			POWER_GENERATION.dayMultiplier,
		);
	});

	it("cultists are more active at night", () => {
		expect(CULTIST_ACTIVITY.nightMultiplier).toBeGreaterThan(
			CULTIST_ACTIVITY.dayMultiplier,
		);
	});

	it("repair is slower during storms", () => {
		expect(REPAIR_SPEED.stormMultiplier).toBeLessThan(
			REPAIR_SPEED.clearMultiplier,
		);
	});

	it("all three storm profiles have visual params", () => {
		expect(STORM_VISUAL_PARAMS.stable).toBeDefined();
		expect(STORM_VISUAL_PARAMS.volatile).toBeDefined();
		expect(STORM_VISUAL_PARAMS.cataclysmic).toBeDefined();
	});

	it("cataclysmic has more rain particles than stable", () => {
		expect(STORM_VISUAL_PARAMS.cataclysmic.rainParticleCount).toBeGreaterThan(
			STORM_VISUAL_PARAMS.stable.rainParticleCount,
		);
	});

	it("wormhole cycle has day/night glow intensities", () => {
		expect(WORMHOLE_CYCLE.maxGlowIntensity).toBeGreaterThan(
			WORMHOLE_CYCLE.minGlowIntensity,
		);
	});
});

// ─── Upgrade config ─────────────────────────────────────────────────────────

describe("upgrade config", () => {
	it("max mark level is 5", () => {
		expect(MAX_MARK_LEVEL).toBe(5);
	});

	it("mark level costs escalate with tier", () => {
		const cost2 = MARK_LEVEL_COSTS[2].scrap_metal!;
		const cost3 = MARK_LEVEL_COSTS[3].scrap_metal!;
		const cost4 = MARK_LEVEL_COSTS[4].scrap_metal!;
		const cost5 = MARK_LEVEL_COSTS[5].scrap_metal!;
		expect(cost2).toBeLessThan(cost3);
		expect(cost3).toBeLessThan(cost4);
		expect(cost4).toBeLessThan(cost5);
	});

	it("mark upgrade ticks increase with tier", () => {
		expect(MARK_UPGRADE_TICKS[2]).toBeLessThan(MARK_UPGRADE_TICKS[3]);
		expect(MARK_UPGRADE_TICKS[3]).toBeLessThan(MARK_UPGRADE_TICKS[4]);
		expect(MARK_UPGRADE_TICKS[4]).toBeLessThan(MARK_UPGRADE_TICKS[5]);
	});

	it("motor pool tiers cap mark levels correctly", () => {
		expect(MOTOR_POOL_TIERS.basic.maxMark).toBe(2);
		expect(MOTOR_POOL_TIERS.advanced.maxMark).toBe(3);
		expect(MOTOR_POOL_TIERS.elite.maxMark).toBe(5);
	});

	it("elite motor pool can produce max mark level", () => {
		expect(MOTOR_POOL_TIERS.elite.maxMark).toBe(MAX_MARK_LEVEL);
	});

	it("adjacency range is positive", () => {
		expect(UPGRADE_ADJACENCY_RANGE).toBeGreaterThan(0);
	});
});

// ─── Faction AI config ──────────────────────────────────────────────────────

describe("faction AI config", () => {
	it("has all four factions", () => {
		expect(FACTION_AI_IDS).toContain("reclaimers");
		expect(FACTION_AI_IDS).toContain("volt_collective");
		expect(FACTION_AI_IDS).toContain("signal_choir");
		expect(FACTION_AI_IDS).toContain("iron_creed");
	});

	it("all biases are in 0-1 range", () => {
		for (const faction of Object.values(FACTION_AI_BIASES)) {
			for (const bias of [
				faction.buildBias,
				faction.expandBias,
				faction.harvestBias,
				faction.scoutBias,
			]) {
				expect(bias).toBeGreaterThanOrEqual(0);
				expect(bias).toBeLessThanOrEqual(1);
			}
		}
	});

	it("all factions have at least 2 starting units", () => {
		for (const faction of Object.values(FACTION_AI_BIASES)) {
			expect(faction.startingUnits).toBeGreaterThanOrEqual(2);
		}
	});

	it("getDominantBias returns correct values", () => {
		// Reclaimers: harvestBias=0.8 is highest
		expect(getDominantBias("reclaimers")).toBe("harvest");
		// Volt Collective: buildBias=0.8 is highest
		expect(getDominantBias("volt_collective")).toBe("build");
		// Signal Choir: scoutBias=0.8 is highest
		expect(getDominantBias("signal_choir")).toBe("scout");
		// Unknown faction returns null
		expect(getDominantBias("unknown")).toBeNull();
	});

	it("signal_choir has the most starting units", () => {
		expect(FACTION_AI_BIASES.signal_choir.startingUnits).toBeGreaterThan(
			FACTION_AI_BIASES.reclaimers.startingUnits,
		);
	});
});

// ─── Building config ────────────────────────────────────────────────────────

describe("building config", () => {
	it("lightning rod has zero power demand", () => {
		expect(BUILDING_BLUEPRINTS.storm_transmitter?.powerDemand).toBe(0);
	});

	it("defense turret has attack stats", () => {
		const turret = BUILDING_BLUEPRINTS.defense_turret;
		expect(turret?.attackRange).toBeGreaterThan(0);
		expect(turret?.attackDamage).toBeGreaterThan(0);
		expect(turret?.attackCooldown).toBeGreaterThan(0);
	});

	it("relay tower has signal range", () => {
		expect(BUILDING_BLUEPRINTS.relay_tower?.signalRange).toBeGreaterThan(0);
	});

	it("motor pool has fabrication slots", () => {
		expect(BUILDING_BLUEPRINTS.motor_pool?.fabricationSlots).toBeGreaterThan(0);
	});

	it("fabrication unit has default components", () => {
		const fab = BUILDING_BLUEPRINTS.synthesizer;
		expect(fab?.defaultComponents).toBeDefined();
		expect(fab!.defaultComponents!.length).toBeGreaterThan(0);
	});

	it("getBuildingDisplayName returns display name or fallback", () => {
		expect(getBuildingDisplayName("storm_transmitter")).toBe("Lightning Rod");
		expect(getBuildingDisplayName("relay_tower")).toBe("Relay Tower");
		// Fallback for types without a blueprint
		expect(getBuildingDisplayName("outpost")).toBe("outpost");
	});
});

// ─── Recipe config ──────────────────────────────────────────────────────────

describe("recipe config", () => {
	it("has 5 component recipes", () => {
		expect(COMPONENT_RECIPES).toHaveLength(5);
	});

	it("all recipes have unique IDs", () => {
		const ids = new Set(COMPONENT_RECIPES.map((r) => r.id));
		expect(ids.size).toBe(COMPONENT_RECIPES.length);
	});

	it("RECIPE_BY_ID contains all recipes", () => {
		expect(RECIPE_BY_ID.size).toBe(COMPONENT_RECIPES.length);
	});

	it("all recipes have positive build time", () => {
		for (const recipe of COMPONENT_RECIPES) {
			expect(recipe.buildTime).toBeGreaterThan(0);
		}
	});

	it("all recipe costs have positive amounts", () => {
		for (const recipe of COMPONENT_RECIPES) {
			for (const cost of recipe.costs) {
				expect(cost.amount).toBeGreaterThan(0);
			}
		}
	});

	it("getRecipeCostMap returns correct cost map", () => {
		const cameraCost = getRecipeCostMap("camera_module");
		expect(cameraCost).not.toBeNull();
		expect(cameraCost!.e_waste).toBe(4);
		expect(cameraCost!.intact_components).toBe(1);
	});

	it("getRecipeCostMap returns null for unknown recipe", () => {
		expect(getRecipeCostMap("nonexistent")).toBeNull();
	});

	it("power_supply is the most expensive recipe (build time)", () => {
		const ps = RECIPE_BY_ID.get("power_supply")!;
		for (const recipe of COMPONENT_RECIPES) {
			expect(ps.buildTime).toBeGreaterThanOrEqual(recipe.buildTime);
		}
	});
});
