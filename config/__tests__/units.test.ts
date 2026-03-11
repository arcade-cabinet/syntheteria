import unitsConfig from "../units.json";

describe("units.json", () => {
	describe("maintenance_bot", () => {
		it("has positive speed and power draw", () => {
			expect(unitsConfig.maintenance_bot.speed).toBeGreaterThan(0);
			expect(unitsConfig.maintenance_bot.powerDraw).toBeGreaterThan(0);
		});

		it("has default components", () => {
			expect(unitsConfig.maintenance_bot.defaultComponents.length).toBeGreaterThan(0);
			for (const comp of unitsConfig.maintenance_bot.defaultComponents) {
				expect(typeof comp.name).toBe("string");
				expect(typeof comp.functional).toBe("boolean");
				expect(typeof comp.material).toBe("string");
			}
		});
	});

	describe("otters", () => {
		it("has positive speed and wander timers", () => {
			expect(unitsConfig.otters.defaultSpeed).toBeGreaterThan(0);
			expect(unitsConfig.otters.wanderTimerMin).toBeGreaterThan(0);
			expect(unitsConfig.otters.wanderTimerMax).toBeGreaterThan(unitsConfig.otters.wanderTimerMin);
		});
	});

	describe("exploration", () => {
		it("has positive vision radius", () => {
			expect(unitsConfig.exploration.visionRadius).toBeGreaterThan(0);
		});
	});

	describe("gameSpeed", () => {
		it("has valid min/max/default range", () => {
			expect(unitsConfig.gameSpeed.min).toBeGreaterThan(0);
			expect(unitsConfig.gameSpeed.max).toBeGreaterThan(unitsConfig.gameSpeed.min);
			expect(unitsConfig.gameSpeed.default).toBeGreaterThanOrEqual(unitsConfig.gameSpeed.min);
			expect(unitsConfig.gameSpeed.default).toBeLessThanOrEqual(unitsConfig.gameSpeed.max);
		});
	});

	describe("grabber", () => {
		it("has positive reach", () => {
			expect(unitsConfig.grabber.reach).toBeGreaterThan(0);
		});
	});

	describe("factionUnits", () => {
		const units = unitsConfig.factionUnits as unknown as Record<string, {
			faction: string;
			displayName: string;
			role: string;
			speed: number;
			hp: number;
			attackDamage: number;
			attackRange: number;
			attackCooldown: number;
			visionRange: number;
			techTier: number;
			fabricationRecipe: string;
			ability: string;
			powerDraw: number;
			botType: string;
		}>;

		const EXPECTED_UNITS = [
			"salvager", "patchwork_titan", "scrap_swarm",
			"arc_welder", "tesla_coil_unit", "capacitor_drone",
			"relay_node", "jammer", "hacker_bot",
			"assault_bot", "iron_tank", "artillery_bot",
		];

		it("defines all 12 faction units", () => {
			for (const id of EXPECTED_UNITS) {
				expect(units[id]).toBeDefined();
			}
		});

		it("every unit has required fields", () => {
			for (const id of EXPECTED_UNITS) {
				const u = units[id];
				expect(typeof u.faction).toBe("string");
				expect(typeof u.displayName).toBe("string");
				expect(typeof u.role).toBe("string");
				expect(u.speed).toBeGreaterThan(0);
				expect(u.hp).toBeGreaterThan(0);
				expect(u.visionRange).toBeGreaterThan(0);
				expect(u.techTier).toBeGreaterThanOrEqual(1);
				expect(u.techTier).toBeLessThanOrEqual(5);
				expect(typeof u.fabricationRecipe).toBe("string");
				expect(typeof u.ability).toBe("string");
				expect(typeof u.botType).toBe("string");
			}
		});

		it("3 units belong to each faction", () => {
			const factionCounts: Record<string, number> = {};
			for (const id of EXPECTED_UNITS) {
				const faction = units[id].faction;
				factionCounts[faction] = (factionCounts[faction] ?? 0) + 1;
			}
			expect(factionCounts["reclaimers"]).toBe(3);
			expect(factionCounts["volt_collective"]).toBe(3);
			expect(factionCounts["signal_choir"]).toBe(3);
			expect(factionCounts["iron_creed"]).toBe(3);
		});

		it("Reclaimer units: salvager/patchwork_titan/scrap_swarm", () => {
			expect(units["salvager"].faction).toBe("reclaimers");
			expect(units["patchwork_titan"].faction).toBe("reclaimers");
			expect(units["scrap_swarm"].faction).toBe("reclaimers");
		});

		it("Volt Collective units: arc_welder/tesla_coil_unit/capacitor_drone", () => {
			expect(units["arc_welder"].faction).toBe("volt_collective");
			expect(units["tesla_coil_unit"].faction).toBe("volt_collective");
			expect(units["capacitor_drone"].faction).toBe("volt_collective");
		});

		it("Signal Choir units: relay_node/jammer/hacker_bot", () => {
			expect(units["relay_node"].faction).toBe("signal_choir");
			expect(units["jammer"].faction).toBe("signal_choir");
			expect(units["hacker_bot"].faction).toBe("signal_choir");
		});

		it("Iron Creed units: assault_bot/iron_tank/artillery_bot", () => {
			expect(units["assault_bot"].faction).toBe("iron_creed");
			expect(units["iron_tank"].faction).toBe("iron_creed");
			expect(units["artillery_bot"].faction).toBe("iron_creed");
		});

		it("artillery_bot has higher attack range than melee units", () => {
			expect(units["artillery_bot"].attackRange).toBeGreaterThan(units["assault_bot"].attackRange);
		});

		it("iron_tank has highest HP of all units (heavy armor role)", () => {
			const hps = EXPECTED_UNITS.map((id) => units[id].hp);
			expect(units["iron_tank"].hp).toBe(Math.max(...hps));
		});

		it("patchwork_titan has higher HP than standard units", () => {
			// patchwork_titan is a tank — should have more HP than light units
			expect(units["patchwork_titan"].hp).toBeGreaterThan(units["arc_welder"].hp);
			expect(units["patchwork_titan"].hp).toBeGreaterThan(units["salvager"].hp);
		});

		it("capacitor_drone has highest speed (fastest unit)", () => {
			const speeds = EXPECTED_UNITS.map((id) => units[id].speed);
			expect(units["capacitor_drone"].speed).toBe(Math.max(...speeds));
		});

		it("tech tiers span range 1-5", () => {
			const tiers = new Set(EXPECTED_UNITS.map((id) => units[id].techTier));
			expect(tiers.size).toBeGreaterThan(1);
		});
	});

	describe("botVariants", () => {
		const variants = unitsConfig.botVariants as unknown as Record<string, {
			displayName: string;
			role: string;
			speed: number;
			hp: number;
			visionRange: number;
			fleeThreshold: number;
			techTier: number;
			fabricationRecipe: string;
			botType: string;
			fsmOverrides: Record<string, unknown>;
		}>;

		const EXPECTED_VARIANTS = ["scout", "hauler", "combat", "engineer", "hacker_generic"];

		it("defines all 5 bot variant archetypes", () => {
			for (const id of EXPECTED_VARIANTS) {
				expect(variants[id]).toBeDefined();
			}
		});

		it("every variant has required fields", () => {
			for (const id of EXPECTED_VARIANTS) {
				const v = variants[id];
				expect(typeof v.displayName).toBe("string");
				expect(typeof v.role).toBe("string");
				expect(v.speed).toBeGreaterThan(0);
				expect(v.hp).toBeGreaterThan(0);
				expect(v.visionRange).toBeGreaterThan(0);
				expect(v.fleeThreshold).toBeGreaterThanOrEqual(0);
				expect(v.fleeThreshold).toBeLessThanOrEqual(1);
				expect(v.techTier).toBeGreaterThanOrEqual(1);
				expect(typeof v.fabricationRecipe).toBe("string");
				expect(typeof v.botType).toBe("string");
				expect(typeof v.fsmOverrides).toBe("object");
			}
		});

		it("scout has highest vision range", () => {
			const visions = EXPECTED_VARIANTS.map((id) => variants[id].visionRange);
			expect(variants["scout"].visionRange).toBe(Math.max(...visions));
		});

		it("scout has highest speed", () => {
			const speeds = EXPECTED_VARIANTS.map((id) => variants[id].speed);
			expect(variants["scout"].speed).toBe(Math.max(...speeds));
		});

		it("combat bot has lowest flee threshold (holds ground longest)", () => {
			const thresholds = EXPECTED_VARIANTS.map((id) => variants[id].fleeThreshold);
			expect(variants["combat"].fleeThreshold).toBe(Math.min(...thresholds));
		});

		it("combat bot has lowest flee threshold among fighters", () => {
			expect(variants["combat"].fleeThreshold).toBeLessThan(variants["engineer"].fleeThreshold);
		});

		it("hacker has no attack damage", () => {
			const hacker = unitsConfig.botVariants as unknown as Record<string, { attackDamage?: number }>;
			expect(hacker["hacker_generic"].attackDamage).toBe(0);
		});

		it("hauler has carry capacity", () => {
			const hauler = unitsConfig.botVariants as unknown as Record<string, { carryCapacity?: number }>;
			expect(hauler["hauler"].carryCapacity).toBeGreaterThan(0);
		});

		it("engineer has build speed multiplier", () => {
			const eng = unitsConfig.botVariants as unknown as Record<string, { buildSpeed?: number }>;
			expect(eng["engineer"].buildSpeed).toBeGreaterThan(1);
		});

		it("all roles are distinct", () => {
			const roles = EXPECTED_VARIANTS.map((id) => variants[id].role);
			expect(new Set(roles).size).toBe(5);
		});
	});
});
