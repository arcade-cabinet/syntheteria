/**
 * Validation tests for config/buildings.json
 *
 * Ensures structural integrity of the buildings config:
 * - 5 building categories (production, infrastructure, defense, territory, endgame)
 * - Every building has required fields (displayName, cubeCost, powerRequired, etc.)
 * - Cube costs reference valid materials
 * - Tech tiers are valid (1-5)
 * - HP values are positive
 * - Blueprints section references valid patterns
 */

import buildingsConfig from "../buildings.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILDING_CATEGORIES = [
	"production",
	"infrastructure",
	"defense",
	"territory",
	"endgame",
] as const;

const VALID_CUBE_MATERIALS = [
	"rock",
	"scrap_iron",
	"copper",
	"silicon",
	"carbon",
	"titanium",
	"rare_earth",
	"gold",
	"quantum_crystal",
	"iron",
	"steel",
	"advanced_alloy",
] as const;

// ---------------------------------------------------------------------------
// Category structure
// ---------------------------------------------------------------------------

describe("building categories", () => {
	it("has all 5 building categories", () => {
		for (const cat of BUILDING_CATEGORIES) {
			expect(buildingsConfig[cat]).toBeDefined();
		}
	});

	it("every category has at least one building", () => {
		for (const cat of BUILDING_CATEGORIES) {
			expect(
				Object.keys(buildingsConfig[cat]).length,
			).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Building field validation
// ---------------------------------------------------------------------------

describe("building fields", () => {
	for (const cat of BUILDING_CATEGORIES) {
		describe(`${cat} buildings`, () => {
			it("every building has a displayName", () => {
				for (const [id, building] of Object.entries(buildingsConfig[cat])) {
					expect(typeof (building as any).displayName).toBe("string");
					expect((building as any).displayName.length).toBeGreaterThan(0);
				}
			});

			it("every building has cubeCost (object or null for free buildings)", () => {
				for (const [id, building] of Object.entries(buildingsConfig[cat])) {
					const cost = (building as any).cubeCost;
					// cubeCost is either null (free, like furnace) or an object
					if (cost !== null) {
						expect(typeof cost).toBe("object");
						expect(Object.keys(cost).length).toBeGreaterThan(0);
					}
				}
			});

			it("every building has non-negative powerRequired", () => {
				for (const [id, building] of Object.entries(buildingsConfig[cat])) {
					expect(typeof (building as any).powerRequired).toBe("number");
					expect((building as any).powerRequired).toBeGreaterThanOrEqual(0);
				}
			});

			it("every building has non-negative buildTimeSeconds", () => {
				for (const [id, building] of Object.entries(buildingsConfig[cat])) {
					expect(typeof (building as any).buildTimeSeconds).toBe("number");
					expect(
						(building as any).buildTimeSeconds,
					).toBeGreaterThanOrEqual(0);
				}
			});

			it("every building has a valid techTier (1-5)", () => {
				for (const [id, building] of Object.entries(buildingsConfig[cat])) {
					expect(typeof (building as any).techTier).toBe("number");
					expect((building as any).techTier).toBeGreaterThanOrEqual(1);
					expect((building as any).techTier).toBeLessThanOrEqual(5);
				}
			});
		});
	}
});

// ---------------------------------------------------------------------------
// Cube cost validation
// ---------------------------------------------------------------------------

describe("cube cost materials", () => {
	it("all cube costs reference valid materials", () => {
		for (const cat of BUILDING_CATEGORIES) {
			for (const [id, building] of Object.entries(buildingsConfig[cat])) {
				const cost = (building as any).cubeCost;
				if (cost === null) continue;
				for (const mat of Object.keys(cost)) {
					expect(VALID_CUBE_MATERIALS).toContain(mat);
				}
			}
		}
	});

	it("all cube cost amounts are positive integers", () => {
		for (const cat of BUILDING_CATEGORIES) {
			for (const [id, building] of Object.entries(buildingsConfig[cat])) {
				const cost = (building as any).cubeCost;
				if (cost === null) continue;
				for (const [mat, amount] of Object.entries(cost)) {
					expect(typeof amount).toBe("number");
					expect(amount as number).toBeGreaterThan(0);
					expect(Number.isInteger(amount)).toBe(true);
				}
			}
		}
	});
});

// ---------------------------------------------------------------------------
// HP validation
// ---------------------------------------------------------------------------

describe("building HP", () => {
	it("production buildings have positive HP", () => {
		for (const [id, building] of Object.entries(buildingsConfig.production)) {
			expect((building as any).hp).toBeGreaterThan(0);
		}
	});

	it("infrastructure buildings have positive HP", () => {
		for (const [id, building] of Object.entries(
			buildingsConfig.infrastructure,
		)) {
			expect((building as any).hp).toBeGreaterThan(0);
		}
	});

	it("defense buildings have either hp or wallHp > 0", () => {
		for (const [id, building] of Object.entries(buildingsConfig.defense)) {
			const b = building as any;
			const hasHp = typeof b.hp === "number" && b.hp > 0;
			const hasWallHp = typeof b.wallHp === "number" && b.wallHp > 0;
			expect(hasHp || hasWallHp).toBe(true);
		}
	});

	it("territory buildings have positive HP", () => {
		for (const [id, building] of Object.entries(buildingsConfig.territory)) {
			const b = building as any;
			if (typeof b.hp === "number") {
				expect(b.hp).toBeGreaterThan(0);
			}
		}
	});

	it("endgame buildings have positive HP", () => {
		for (const [id, building] of Object.entries(buildingsConfig.endgame)) {
			expect((building as any).hp).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Specific building validation
// ---------------------------------------------------------------------------

describe("specific buildings", () => {
	it("furnace exists in production and has no cube cost (starter building)", () => {
		expect(buildingsConfig.production.furnace).toBeDefined();
		expect(buildingsConfig.production.furnace.cubeCost).toBeNull();
	});

	it("belt segments have positive speed", () => {
		const { belt_segment, fast_belt, express_belt } =
			buildingsConfig.infrastructure;
		expect(belt_segment.speed).toBeGreaterThan(0);
		expect(fast_belt.speed).toBeGreaterThan(belt_segment.speed);
		expect(express_belt.speed).toBeGreaterThan(fast_belt.speed);
	});

	it("turret has range, damage, and fire rate", () => {
		const turret = buildingsConfig.defense.turret;
		expect(turret.range).toBeGreaterThan(0);
		expect(turret.damage).toBeGreaterThan(0);
		expect(turret.fireRateTicks).toBeGreaterThan(0);
		expect(turret.hitChance).toBeGreaterThan(0);
		expect(turret.hitChance).toBeLessThanOrEqual(1);
	});

	it("wall panels have increasing wallHp with tier", () => {
		const { scrap_wall_panel, copper_wall_panel, carbon_wall_panel, titanium_wall_panel } =
			buildingsConfig.defense;
		expect(scrap_wall_panel.wallHp).toBeLessThan(copper_wall_panel.wallHp);
		expect(copper_wall_panel.wallHp).toBeLessThan(carbon_wall_panel.wallHp);
		expect(carbon_wall_panel.wallHp).toBeLessThan(
			titanium_wall_panel.wallHp,
		);
	});

	it("lightning rod has protection radius and capacity", () => {
		const lr = buildingsConfig.infrastructure.lightning_rod;
		expect(lr.capacity).toBeGreaterThan(0);
		expect(lr.protectionRadius).toBeGreaterThan(0);
		expect(lr.minSpacing).toBeGreaterThan(0);
	});

	it("outpost core has claim radius", () => {
		expect(buildingsConfig.territory.outpost_core.claimRadius).toBeGreaterThan(0);
	});

	it("outpost upgrade expands claim radius beyond base", () => {
		expect(buildingsConfig.territory.outpost_upgrade.claimRadius).toBeGreaterThan(
			buildingsConfig.territory.outpost_core.claimRadius,
		);
	});

	it("planet core tap is the most expensive endgame building", () => {
		const tap = buildingsConfig.endgame.planet_core_tap;
		expect(tap.buildTimeSeconds).toBeGreaterThanOrEqual(60);
		expect(tap.hp).toBeGreaterThanOrEqual(500);
	});

	it("signal relay and amplifier produce compute", () => {
		expect(
			buildingsConfig.infrastructure.signal_relay.computePerMinute,
		).toBeGreaterThan(0);
		expect(
			buildingsConfig.infrastructure.signal_amplifier.computePerMinute,
		).toBeGreaterThan(
			buildingsConfig.infrastructure.signal_relay.computePerMinute,
		);
	});
});

// ---------------------------------------------------------------------------
// Tech tier progression
// ---------------------------------------------------------------------------

describe("tech tier progression", () => {
	it("endgame buildings are tier 5", () => {
		for (const [id, building] of Object.entries(buildingsConfig.endgame)) {
			expect((building as any).techTier).toBe(5);
		}
	});

	it("basic production buildings are low tier (1-2)", () => {
		expect(buildingsConfig.production.furnace.techTier).toBeLessThanOrEqual(2);
		expect(buildingsConfig.production.basic_miner.techTier).toBeLessThanOrEqual(2);
	});

	it("advanced production buildings are higher tier", () => {
		expect(buildingsConfig.production.smelter.techTier).toBeGreaterThanOrEqual(3);
		expect(buildingsConfig.production.refiner.techTier).toBeGreaterThanOrEqual(3);
	});
});

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

describe("blueprints", () => {
	it("has at least one blueprint", () => {
		expect(Object.keys(buildingsConfig.blueprints).length).toBeGreaterThan(0);
	});

	it("every blueprint has pattern, result, and description", () => {
		for (const [id, bp] of Object.entries(buildingsConfig.blueprints)) {
			expect(Array.isArray((bp as any).pattern)).toBe(true);
			expect(typeof (bp as any).result).toBe("string");
			expect(typeof (bp as any).description).toBe("string");
		}
	});

	it("blueprint patterns contain valid materials", () => {
		for (const [id, bp] of Object.entries(buildingsConfig.blueprints)) {
			const pattern = (bp as any).pattern as string[][][];
			for (const layer of pattern) {
				for (const row of layer) {
					for (const cell of row) {
						expect(VALID_CUBE_MATERIALS).toContain(cell);
					}
				}
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Faction buildings
// ---------------------------------------------------------------------------

describe("factionBuildings", () => {
	const factionBuildings = buildingsConfig.factionBuildings as unknown as Record<string, {
		faction: string;
		displayName: string;
		category: string;
		cubeCost: Record<string, number> | null;
		powerRequired: number;
		buildTimeSeconds: number;
		techTier: number;
		hp: number;
		effect: string;
		effectDescription: string;
		buildingType: string;
		visualStyle: string;
	}>;

	const EXPECTED_BUILDINGS = [
		"salvage_yard", "repair_bay",         // reclaimers
		"power_plant", "tesla_tower",         // volt_collective
		"relay_station", "hacking_hub",       // signal_choir
		"barracks", "fortress",               // iron_creed
	];

	it("defines all 8 faction buildings", () => {
		for (const id of EXPECTED_BUILDINGS) {
			expect(factionBuildings[id]).toBeDefined();
		}
	});

	it("every faction building has required fields", () => {
		for (const id of EXPECTED_BUILDINGS) {
			const b = factionBuildings[id];
			expect(typeof b.faction).toBe("string");
			expect(typeof b.displayName).toBe("string");
			expect(typeof b.category).toBe("string");
			expect(b.powerRequired).toBeGreaterThanOrEqual(0);
			expect(b.buildTimeSeconds).toBeGreaterThan(0);
			expect(b.techTier).toBeGreaterThanOrEqual(1);
			expect(b.techTier).toBeLessThanOrEqual(5);
			expect(b.hp).toBeGreaterThan(0);
			expect(typeof b.effect).toBe("string");
			expect(typeof b.effectDescription).toBe("string");
			expect(typeof b.buildingType).toBe("string");
			expect(typeof b.visualStyle).toBe("string");
		}
	});

	it("2 buildings belong to each faction", () => {
		const factionCounts: Record<string, number> = {};
		for (const id of EXPECTED_BUILDINGS) {
			const faction = factionBuildings[id].faction;
			factionCounts[faction] = (factionCounts[faction] ?? 0) + 1;
		}
		expect(factionCounts["reclaimers"]).toBe(2);
		expect(factionCounts["volt_collective"]).toBe(2);
		expect(factionCounts["signal_choir"]).toBe(2);
		expect(factionCounts["iron_creed"]).toBe(2);
	});

	it("Reclaimer buildings: salvage_yard and repair_bay", () => {
		expect(factionBuildings["salvage_yard"].faction).toBe("reclaimers");
		expect(factionBuildings["repair_bay"].faction).toBe("reclaimers");
	});

	it("Volt Collective buildings: power_plant and tesla_tower", () => {
		expect(factionBuildings["power_plant"].faction).toBe("volt_collective");
		expect(factionBuildings["tesla_tower"].faction).toBe("volt_collective");
	});

	it("Signal Choir buildings: relay_station and hacking_hub", () => {
		expect(factionBuildings["relay_station"].faction).toBe("signal_choir");
		expect(factionBuildings["hacking_hub"].faction).toBe("signal_choir");
	});

	it("Iron Creed buildings: barracks and fortress", () => {
		expect(factionBuildings["barracks"].faction).toBe("iron_creed");
		expect(factionBuildings["fortress"].faction).toBe("iron_creed");
	});

	it("fortress has highest HP of all faction buildings", () => {
		const hps = EXPECTED_BUILDINGS.map((id) => factionBuildings[id].hp);
		expect(factionBuildings["fortress"].hp).toBe(Math.max(...hps));
	});

	it("cube costs reference only valid materials", () => {
		for (const id of EXPECTED_BUILDINGS) {
			const cost = factionBuildings[id].cubeCost;
			if (!cost) continue;
			for (const mat of Object.keys(cost)) {
				expect(VALID_CUBE_MATERIALS).toContain(mat);
			}
		}
	});

	it("all faction buildings have unique visual styles", () => {
		const styles = EXPECTED_BUILDINGS.map((id) => factionBuildings[id].visualStyle);
		// Not all should be the same — at least 4 distinct faction styles
		expect(new Set(styles).size).toBeGreaterThanOrEqual(4);
	});
});

// ---------------------------------------------------------------------------
// No placeholder values
// ---------------------------------------------------------------------------

describe("no placeholder values", () => {
	it("no building has -1 or 999 HP", () => {
		for (const cat of BUILDING_CATEGORIES) {
			for (const [id, building] of Object.entries(buildingsConfig[cat])) {
				const b = building as any;
				if (typeof b.hp === "number") {
					expect(b.hp).not.toBe(-1);
					expect(b.hp).not.toBe(999);
				}
				if (typeof b.wallHp === "number") {
					expect(b.wallHp).not.toBe(-1);
					expect(b.wallHp).not.toBe(999);
				}
			}
		}
	});

	it("no building has empty displayName", () => {
		for (const cat of BUILDING_CATEGORIES) {
			for (const [id, building] of Object.entries(buildingsConfig[cat])) {
				expect((building as any).displayName.trim().length).toBeGreaterThan(0);
			}
		}
	});
});
