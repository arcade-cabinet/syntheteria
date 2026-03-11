/**
 * Validation tests for config/biomes.json
 *
 * Ensures structural integrity of biome definitions:
 * - 5 gameplay biomes + 2 water types present
 * - Movement, harvest, visibility, signal modifiers in valid ranges
 * - Resource multipliers reference valid materials
 * - Terrain hazards, bridges, and processing cycles defined
 * - Weather-biome interactions have valid biome references
 */

import biomesConfig from "../biomes.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAMEPLAY_BIOMES = [
	"rust_plains",
	"scrap_hills",
	"chrome_ridge",
	"signal_plateau",
	"cable_forest",
] as const;

const WATER_BIOMES = ["deep_water", "shallow_water"] as const;

const ALL_BIOMES = [...GAMEPLAY_BIOMES, ...WATER_BIOMES] as const;

const VALID_MATERIALS = [
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

const ALL_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

const PROCESSING_CYCLES = [
	"dormant",
	"active",
	"volatile",
	"convergent",
	"aftermath",
] as const;

// ---------------------------------------------------------------------------
// Biome existence
// ---------------------------------------------------------------------------

describe("biome definitions", () => {
	it("has all 5 gameplay biomes", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			expect(biomesConfig.biomes[biome]).toBeDefined();
		}
	});

	it("has both water biomes", () => {
		for (const biome of WATER_BIOMES) {
			expect(biomesConfig.biomes[biome]).toBeDefined();
		}
	});

	it("total biome count is 7", () => {
		expect(Object.keys(biomesConfig.biomes)).toHaveLength(7);
	});
});

// ---------------------------------------------------------------------------
// Required fields per biome
// ---------------------------------------------------------------------------

describe("biome required fields", () => {
	it("every biome has displayName, modifiers, passable, bgColor, and features", () => {
		for (const biome of ALL_BIOMES) {
			const b = biomesConfig.biomes[biome];
			expect(b.displayName).toBeTruthy();
			expect(typeof b.moveSpeedMod).toBe("number");
			expect(typeof b.harvestMod).toBe("number");
			expect(typeof b.visibility).toBe("number");
			expect(typeof b.signalBonus).toBe("number");
			expect(typeof b.passable).toBe("boolean");
			expect(b.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(typeof b.lightningMultiplier).toBe("number");
			expect(typeof b.alienSpawnRate).toBe("number");
			expect(b.resourceMultipliers).toBeDefined();
			expect(Array.isArray(b.features)).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// Modifier value ranges
// ---------------------------------------------------------------------------

describe("biome modifier ranges", () => {
	it("movement speed is between 0 and 1", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].moveSpeedMod).toBeGreaterThanOrEqual(0);
			expect(biomesConfig.biomes[biome].moveSpeedMod).toBeLessThanOrEqual(1);
		}
	});

	it("harvest modifier is between 0 and 2", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].harvestMod).toBeGreaterThanOrEqual(0);
			expect(biomesConfig.biomes[biome].harvestMod).toBeLessThanOrEqual(2);
		}
	});

	it("visibility is between 0 and 1", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].visibility).toBeGreaterThanOrEqual(0);
			expect(biomesConfig.biomes[biome].visibility).toBeLessThanOrEqual(1);
		}
	});

	it("signal bonus is between 0 and 2", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].signalBonus).toBeGreaterThanOrEqual(0);
			expect(biomesConfig.biomes[biome].signalBonus).toBeLessThanOrEqual(2);
		}
	});

	it("lightning multiplier is non-negative", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].lightningMultiplier).toBeGreaterThanOrEqual(0);
		}
	});

	it("alien spawn rate is non-negative", () => {
		for (const biome of ALL_BIOMES) {
			expect(biomesConfig.biomes[biome].alienSpawnRate).toBeGreaterThanOrEqual(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Resource multipliers
// ---------------------------------------------------------------------------

describe("resource multipliers", () => {
	it("resource multiplier keys reference valid materials", () => {
		const validMats = new Set(VALID_MATERIALS);
		for (const biome of ALL_BIOMES) {
			for (const mat of Object.keys(
				biomesConfig.biomes[biome].resourceMultipliers,
			)) {
				expect(validMats.has(mat as any)).toBe(true);
			}
		}
	});

	it("resource multipliers are positive numbers", () => {
		for (const biome of ALL_BIOMES) {
			for (const [, val] of Object.entries(
				biomesConfig.biomes[biome].resourceMultipliers,
			)) {
				expect(val).toBeGreaterThan(0);
			}
		}
	});

	it("gameplay biomes each have at least one resource multiplier", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			expect(
				Object.keys(biomesConfig.biomes[biome].resourceMultipliers).length,
			).toBeGreaterThan(0);
		}
	});

	it("water biomes have no resource multipliers", () => {
		for (const biome of WATER_BIOMES) {
			expect(
				Object.keys(biomesConfig.biomes[biome].resourceMultipliers).length,
			).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Passability
// ---------------------------------------------------------------------------

describe("passability", () => {
	it("deep water is impassable", () => {
		expect(biomesConfig.biomes.deep_water.passable).toBe(false);
		expect(biomesConfig.biomes.deep_water.moveSpeedMod).toBe(0);
	});

	it("all gameplay biomes are passable", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			expect(biomesConfig.biomes[biome].passable).toBe(true);
			expect(biomesConfig.biomes[biome].moveSpeedMod).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Biome-specific properties
// ---------------------------------------------------------------------------

describe("biome-specific properties", () => {
	it("cable_forest has canopy protection config", () => {
		const cf = biomesConfig.biomes.cable_forest as any;
		expect(cf.cableCanopy).toBeDefined();
		expect(cf.cableCanopy.blocksLightning).toBe(true);
		expect(cf.cableCanopy.blocksAcid).toBe(true);
	});

	it("cable_forest has snare mechanics", () => {
		const cf = biomesConfig.biomes.cable_forest as any;
		expect(cf.snareChance).toBeGreaterThan(0);
		expect(cf.snareChance).toBeLessThanOrEqual(0.1);
		expect(cf.snareDurationSeconds).toBeGreaterThan(0);
	});

	it("cable_forest has zero lightning", () => {
		expect(biomesConfig.biomes.cable_forest.lightningMultiplier).toBe(0);
	});

	it("chrome_ridge has high lightning multiplier", () => {
		expect(biomesConfig.biomes.chrome_ridge.lightningMultiplier).toBe(3.0);
	});

	it("chrome_ridge has clear weather visibility bonus", () => {
		const cr = biomesConfig.biomes.chrome_ridge as any;
		expect(cr.clearWeatherVisibilityBonus).toBeGreaterThan(1.0);
	});

	it("signal_plateau has high signal bonus", () => {
		expect(biomesConfig.biomes.signal_plateau.signalBonus).toBe(1.5);
	});

	it("signal_plateau has processor tower bonus and EM interference", () => {
		const sp = biomesConfig.biomes.signal_plateau as any;
		expect(sp.processorTowerSignalBonus).toBeGreaterThan(1);
		expect(sp.emInterferenceRadius).toBeGreaterThan(0);
	});

	it("scrap_hills has elevation combat bonus", () => {
		const sh = biomesConfig.biomes.scrap_hills as any;
		expect(sh.elevationBonus).toBeDefined();
		expect(sh.elevationBonus.rangeBonus).toBeGreaterThan(0);
		expect(sh.elevationBonus.damageBonus).toBeGreaterThan(0);
	});

	it("rust_plains is the easiest biome (all modifiers at 1.0)", () => {
		const rp = biomesConfig.biomes.rust_plains;
		expect(rp.moveSpeedMod).toBe(1.0);
		expect(rp.harvestMod).toBe(1.0);
		expect(rp.visibility).toBe(1.0);
		expect(rp.signalBonus).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

describe("terrain config", () => {
	it("has 5 slope modifiers", () => {
		expect(Object.keys(biomesConfig.terrain.slopeModifiers)).toHaveLength(5);
	});

	it("slope thresholds increase", () => {
		const slopes = Object.values(biomesConfig.terrain.slopeModifiers);
		for (let i = 1; i < slopes.length; i++) {
			expect(slopes[i].threshold).toBeGreaterThan(slopes[i - 1].threshold);
		}
	});

	it("slope speed modifiers decrease as slope increases", () => {
		const slopes = Object.values(biomesConfig.terrain.slopeModifiers);
		for (let i = 1; i < slopes.length; i++) {
			expect(slopes[i].speedMod).toBeLessThanOrEqual(slopes[i - 1].speedMod);
		}
	});

	it("cliff is impassable (speedMod 0)", () => {
		expect(biomesConfig.terrain.slopeModifiers.cliff.speedMod).toBe(0);
		expect(
			(biomesConfig.terrain.slopeModifiers.cliff as any).impassable,
		).toBe(true);
	});

	it("has height advantage modifiers", () => {
		const ha = biomesConfig.terrain.heightAdvantage;
		expect(ha.rangeBonus).toBeGreaterThan(0);
		expect(ha.damageBonus).toBeGreaterThan(0);
		expect(ha.rangePenalty).toBeLessThan(0);
		expect(ha.accuracyPenalty).toBeLessThan(0);
	});
});

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

describe("terrain hazards", () => {
	it("has at least 5 hazard types", () => {
		expect(Object.keys(biomesConfig.terrain.hazards).length).toBeGreaterThanOrEqual(5);
	});

	it("every hazard has biome assignments", () => {
		for (const [name, hazard] of Object.entries(biomesConfig.terrain.hazards)) {
			if (name !== "sinkhole") {
				expect((hazard as any).biomes).toBeDefined();
				expect((hazard as any).biomes.length).toBeGreaterThan(0);
			}
		}
	});

	it("hazard biome references are valid", () => {
		const validBiomes = new Set(ALL_BIOMES);
		for (const hazard of Object.values(biomesConfig.terrain.hazards)) {
			if ((hazard as any).biomes) {
				for (const biome of (hazard as any).biomes) {
					expect(validBiomes.has(biome)).toBe(true);
				}
			}
		}
	});

	it("sinkhole has mining density threshold", () => {
		expect(biomesConfig.terrain.hazards.sinkhole.miningDensityThreshold).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------

describe("bridges", () => {
	it("has 3 bridge types", () => {
		expect(Object.keys(biomesConfig.terrain.bridges)).toHaveLength(3);
	});

	it("bridge span and HP increase with material tier", () => {
		const bridges = biomesConfig.terrain.bridges;
		expect(bridges.iron_bridge.span).toBeGreaterThan(bridges.scrap_bridge.span);
		expect(bridges.titanium_bridge.span).toBeGreaterThan(bridges.iron_bridge.span);
		expect(bridges.iron_bridge.hp).toBeGreaterThan(bridges.scrap_bridge.hp);
		expect(bridges.titanium_bridge.hp).toBeGreaterThan(bridges.iron_bridge.hp);
	});

	it("bridge width increases with tier", () => {
		const bridges = biomesConfig.terrain.bridges;
		expect(bridges.iron_bridge.width).toBeGreaterThan(bridges.scrap_bridge.width);
		expect(bridges.titanium_bridge.width).toBeGreaterThan(bridges.iron_bridge.width);
	});
});

// ---------------------------------------------------------------------------
// Processing Cycles
// ---------------------------------------------------------------------------

describe("processing cycles", () => {
	it("has all 5 cycles", () => {
		for (const cycle of PROCESSING_CYCLES) {
			expect(biomesConfig.processingCycles[cycle]).toBeDefined();
		}
	});

	it("every cycle has duration, weather bias, resource bonus, and combat mod", () => {
		for (const cycle of PROCESSING_CYCLES) {
			const c = biomesConfig.processingCycles[cycle];
			expect(c.durationMinutes).toBeGreaterThan(0);
			expect(c.weatherBias).toBeDefined();
			expect(c.resourceBonus).toBeDefined();
			expect(typeof c.combatMod).toBe("number");
		}
	});

	it("cycle durations decrease from dormant toward convergent", () => {
		const pc = biomesConfig.processingCycles;
		expect(pc.volatile.durationMinutes).toBeLessThan(pc.dormant.durationMinutes);
		expect(pc.convergent.durationMinutes).toBeLessThan(pc.volatile.durationMinutes);
		expect(pc.aftermath.durationMinutes).toBeLessThan(pc.convergent.durationMinutes);
	});

	it("every cycle has a narrative description", () => {
		for (const cycle of PROCESSING_CYCLES) {
			expect(
				(biomesConfig.processingCycles[cycle] as any).narrative,
			).toBeTruthy();
			expect(
				(biomesConfig.processingCycles[cycle] as any).narrative.length,
			).toBeGreaterThan(10);
		}
	});

	it("every cycle has a displayName", () => {
		for (const cycle of PROCESSING_CYCLES) {
			expect(
				(biomesConfig.processingCycles[cycle] as any).displayName,
			).toBeTruthy();
		}
	});
});

// ---------------------------------------------------------------------------
// Cycle progression
// ---------------------------------------------------------------------------

describe("cycle progression", () => {
	it("has at least 3 progression entries", () => {
		expect(biomesConfig.cycleProgression.length).toBeGreaterThanOrEqual(3);
	});

	it("game time starts at 0", () => {
		expect(biomesConfig.cycleProgression[0].gameTimeMinutes).toBe(0);
	});

	it("game times are monotonically increasing", () => {
		for (let i = 1; i < biomesConfig.cycleProgression.length; i++) {
			expect(
				biomesConfig.cycleProgression[i].gameTimeMinutes,
			).toBeGreaterThan(
				biomesConfig.cycleProgression[i - 1].gameTimeMinutes,
			);
		}
	});

	it("patterns reference valid processing cycles", () => {
		const validCycles = new Set(PROCESSING_CYCLES);
		for (const entry of biomesConfig.cycleProgression) {
			for (const cycle of entry.pattern) {
				expect(validCycles.has(cycle as any)).toBe(true);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Faction biome preferences
// ---------------------------------------------------------------------------

describe("faction biome preferences", () => {
	it("has preferences for all 4 factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(biomesConfig.factionBiomePreferences[faction]).toBeDefined();
			expect(
				biomesConfig.factionBiomePreferences[faction].length,
			).toBeGreaterThan(0);
		}
	});

	it("preferred biomes reference valid gameplay biomes", () => {
		const validBiomes = new Set(GAMEPLAY_BIOMES);
		for (const faction of ALL_FACTIONS) {
			for (const biome of biomesConfig.factionBiomePreferences[faction]) {
				expect(validBiomes.has(biome as any)).toBe(true);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Weather-biome interactions
// ---------------------------------------------------------------------------

describe("weather-biome interactions", () => {
	it("has at least 5 interaction entries", () => {
		expect(
			Object.keys(biomesConfig.weatherBiomeInteractions).length,
		).toBeGreaterThanOrEqual(5);
	});

	it("all interaction keys contain valid biome names", () => {
		const validBiomeNames = ALL_BIOMES.map((b) => b.toString());
		for (const key of Object.keys(biomesConfig.weatherBiomeInteractions)) {
			const containsBiome = validBiomeNames.some((b) => key.includes(b));
			expect(containsBiome).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// Default modifiers
// ---------------------------------------------------------------------------

describe("default modifiers", () => {
	it("has default modifier values", () => {
		expect(biomesConfig.defaultModifiers).toBeDefined();
		expect(biomesConfig.defaultModifiers.moveSpeedMod).toBe(1.0);
		expect(biomesConfig.defaultModifiers.harvestMod).toBe(1.0);
		expect(biomesConfig.defaultModifiers.visibility).toBe(1.0);
		expect(biomesConfig.defaultModifiers.signalBonus).toBe(1.0);
		expect(biomesConfig.defaultModifiers.passable).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Weather States
// ---------------------------------------------------------------------------

const WEATHER_STATES = [
	"clear",
	"overcast",
	"storm",
	"electromagnetic_surge",
	"acid_rain",
] as const;

describe("weather states", () => {
	const states = (biomesConfig as any).weatherStates;

	it("has all 5 weather states", () => {
		for (const state of WEATHER_STATES) {
			expect(states[state]).toBeDefined();
		}
		expect(Object.keys(states)).toHaveLength(5);
	});

	it("every state has required modifier fields", () => {
		for (const state of WEATHER_STATES) {
			const s = states[state];
			expect(typeof s.displayName).toBe("string");
			expect(typeof s.visibilityRange).toBe("number");
			expect(typeof s.movementSpeedModifier).toBe("number");
			expect(typeof s.harvestEfficiencyModifier).toBe("number");
			expect(typeof s.combatAccuracyModifier).toBe("number");
			expect(typeof s.powerGenerationModifier).toBe("number");
			expect(typeof s.lightningStrikeChance).toBe("number");
			expect(typeof s.cubeDamagePerMinute).toBe("number");
			expect(s.durationMinutes).toBeDefined();
			expect(s.durationMinutes.min).toBeLessThan(s.durationMinutes.max);
		}
	});

	it("clear weather has no penalties (all modifiers at 1.0)", () => {
		const clear = states.clear;
		expect(clear.visibilityRange).toBe(1.0);
		expect(clear.movementSpeedModifier).toBe(1.0);
		expect(clear.harvestEfficiencyModifier).toBe(1.0);
		expect(clear.combatAccuracyModifier).toBe(1.0);
		expect(clear.lightningStrikeChance).toBe(0.0);
		expect(clear.cubeDamagePerMinute).toBe(0);
	});

	it("storm and electromagnetic_surge have lightning strike chance > 0", () => {
		expect(states.storm.lightningStrikeChance).toBeGreaterThan(0);
		expect(states.electromagnetic_surge.lightningStrikeChance).toBeGreaterThan(0);
	});

	it("acid_rain deals cube damage", () => {
		expect(states.acid_rain.cubeDamagePerMinute).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Weather Transitions
// ---------------------------------------------------------------------------

describe("weather transitions", () => {
	const transitions = (biomesConfig as any).weatherTransitions;

	it("has transition probabilities from every weather state", () => {
		for (const state of WEATHER_STATES) {
			expect(transitions[state]).toBeDefined();
		}
	});

	it("transition probabilities sum to 1.0 for each source state", () => {
		for (const state of WEATHER_STATES) {
			const probs = Object.values(transitions[state]) as number[];
			const sum = probs.reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0, 5);
		}
	});

	it("every target state is a valid weather state", () => {
		const validStates = new Set(WEATHER_STATES);
		for (const state of WEATHER_STATES) {
			for (const target of Object.keys(transitions[state])) {
				expect(validStates.has(target as any)).toBe(true);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Storm Intensity
// ---------------------------------------------------------------------------

describe("storm intensity", () => {
	const intensity = (biomesConfig as any).stormIntensity;

	it("has ramp and decay rates", () => {
		expect(intensity.rampUpPerTick).toBeGreaterThan(0);
		expect(intensity.decayPerTick).toBeGreaterThan(0);
	});

	it("ramp rate is faster than decay (storms build faster than they fade)", () => {
		expect(intensity.rampUpPerTick).toBeGreaterThan(intensity.decayPerTick);
	});

	it("has tick interval and lightning check interval", () => {
		expect(intensity.transitionTickInterval).toBeGreaterThan(0);
		expect(intensity.lightningStrikeCheckInterval).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Weather Forecasting
// ---------------------------------------------------------------------------

describe("weather forecasting", () => {
	const forecast = (biomesConfig as any).weatherForecasting;

	it("has max forecast transitions", () => {
		expect(forecast.maxForecastTransitions).toBeGreaterThanOrEqual(1);
	});

	it("accuracy decreases with forecast depth", () => {
		const acc = forecast.accuracy;
		expect(acc["1"]).toBeGreaterThan(acc["2"]);
		expect(acc["2"]).toBeGreaterThan(acc["3"]);
	});

	it("first transition has highest accuracy (> 0.8)", () => {
		expect(forecast.accuracy["1"]).toBeGreaterThan(0.8);
	});
});

// ---------------------------------------------------------------------------
// Weather Shipment Effects
// ---------------------------------------------------------------------------

describe("weather shipment effects", () => {
	const effects = (biomesConfig as any).weatherShipmentEffects;

	it("has effects for all 5 weather states", () => {
		for (const state of WEATHER_STATES) {
			expect(effects[state]).toBeDefined();
		}
	});

	it("clear weather has normal shipment and clear hologram", () => {
		expect(effects.clear.shipmentEffect).toBe("normal");
		expect(effects.clear.hologramQuality).toBe("crystal_clear");
	});

	it("electromagnetic surge blocks shipments and holograms", () => {
		expect(effects.electromagnetic_surge.shipmentsBlocked).toBe(true);
		expect(effects.electromagnetic_surge.hologramQuality).toBe("offline");
	});

	it("storm delays shipments", () => {
		expect(effects.storm.shipmentDelaySeconds).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Alien Native Territories
// ---------------------------------------------------------------------------

describe("alien native territories", () => {
	const territories = (biomesConfig as any).alienNativeTerritories;

	it("has territory data for all 5 gameplay biomes", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			expect(territories[biome]).toBeDefined();
		}
	});

	it("every territory has presence level, village density, and unique resource", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			const t = territories[biome];
			expect(typeof t.nativePresence).toBe("string");
			expect(typeof t.villageDensityPerArea).toBe("string");
			expect(typeof t.uniqueResource).toBe("string");
		}
	});

	it("each biome has a unique resource (no duplicates)", () => {
		const resources = GAMEPLAY_BIOMES.map((b) => territories[b].uniqueResource);
		expect(new Set(resources).size).toBe(resources.length);
	});
});

// ---------------------------------------------------------------------------
// Strategic Roles
// ---------------------------------------------------------------------------

describe("biome strategic roles", () => {
	it("every gameplay biome has a strategicRole", () => {
		for (const biome of GAMEPLAY_BIOMES) {
			expect((biomesConfig.biomes[biome] as any).strategicRole).toBeTruthy();
		}
	});
});

// ---------------------------------------------------------------------------
// No placeholder values
// ---------------------------------------------------------------------------

describe("no placeholder values", () => {
	it("no string fields contain TODO, TBD, FIXME, or placeholder", () => {
		const json = JSON.stringify(biomesConfig);
		const placeholders = ["TODO", "TBD", "FIXME", "placeholder", "xxx"];
		for (const ph of placeholders) {
			expect(json.toLowerCase()).not.toContain(ph.toLowerCase());
		}
	});
});
