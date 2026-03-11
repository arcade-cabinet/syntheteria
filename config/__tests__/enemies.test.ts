import enemiesConfig from "../enemies.json";

describe("enemies.json", () => {
	const factions = ["feral", "volt_raider", "rogue"] as const;

	it("has all hostile factions", () => {
		for (const faction of factions) {
			expect((enemiesConfig as any)[faction]).toBeDefined();
		}
	});

	describe("feral", () => {
		const feral = enemiesConfig.feral;

		it("has valid spawn parameters", () => {
			expect(feral.spawnRate).toBeGreaterThan(0);
			expect(feral.spawnRate).toBeLessThan(1);
			expect(feral.maxCount).toBeGreaterThan(0);
			expect(feral.spawnInterval).toBeGreaterThan(0);
		});

		it("has combat parameters", () => {
			expect(feral.aggroRange).toBeGreaterThan(0);
			expect(feral.damage).toBeGreaterThan(0);
			expect(feral.components.length).toBeGreaterThan(0);
		});

		it("has spawn zones", () => {
			expect(feral.spawnZones.length).toBeGreaterThan(0);
			for (const zone of feral.spawnZones) {
				expect(typeof zone.x).toBe("number");
				expect(typeof zone.z).toBe("number");
			}
		});
	});

	describe("volt_raider", () => {
		const voltRaider = (enemiesConfig as any).volt_raider;

		it("has lightning abilities", () => {
			expect(voltRaider.lightningRadius).toBeGreaterThan(0);
			expect(voltRaider.lightningCooldown).toBeGreaterThan(0);
			expect(voltRaider.lightningRange).toBeGreaterThan(0);
		});

		it("has hack difficulty", () => {
			expect(voltRaider.hackDifficulty).toBeGreaterThan(0);
		});

		it("has a description", () => {
			expect(typeof voltRaider.description).toBe("string");
			expect(voltRaider.description.length).toBeGreaterThan(10);
		});
	});

	describe("rogue", () => {
		it("has stealth parameters", () => {
			expect(enemiesConfig.rogue.stealthDuration).toBeGreaterThan(0);
			expect(enemiesConfig.rogue.stealthCooldown).toBeGreaterThan(enemiesConfig.rogue.stealthDuration);
		});

		it("is faster than feral", () => {
			expect(enemiesConfig.rogue.speed).toBeGreaterThan(enemiesConfig.feral.baseSpeed);
		});
	});

	describe("ancientMachines — Residuals", () => {
		const am = enemiesConfig.ancientMachines;

		it("has sentinel, crawler, and colossus", () => {
			expect(am.sentinel).toBeDefined();
			expect(am.crawler).toBeDefined();
			expect(am.colossus).toBeDefined();
		});

		it("Sentinel HP is a range (hpMin < hpMax)", () => {
			expect(am.sentinel.hpMin).toBeLessThan(am.sentinel.hpMax);
		});

		it("Crawler HP is a range (hpMin < hpMax)", () => {
			expect(am.crawler.hpMin).toBeLessThan(am.crawler.hpMax);
		});

		it("Colossus has fixed HP >= 1000", () => {
			expect(am.colossus.hp).toBeGreaterThanOrEqual(1000);
		});

		it("Colossus has awakening conditions", () => {
			expect(am.colossus.awakeningConditions.substrateDamageThreshold).toBeGreaterThan(0);
			expect(typeof am.colossus.awakeningConditions.storyProgressionFlag).toBe("string");
		});

		it("Colossus has integration conditions for victory path", () => {
			expect(am.colossus.integrationConditions.relationshipThreshold).toBeGreaterThan(0);
			expect(am.colossus.integrationConditions.cubeOfferings.length).toBeGreaterThan(0);
		});

		it("awakening thresholds scale: sentinel <= crawler < colossus", () => {
			expect(am.awakening.sentinelAwakeThreshold).toBeLessThanOrEqual(
				am.awakening.crawlerAwakeThreshold,
			);
			expect(am.awakening.crawlerAwakeThreshold).toBeLessThan(
				am.awakening.colossusAwakeThreshold,
			);
		});

		it("relationship penalties: Crawler > Sentinel", () => {
			expect(am.crawler.relationshipPenalty).toBeGreaterThan(am.sentinel.relationshipPenalty);
		});

		it("substrate damage decay is positive", () => {
			expect(am.awakening.substrateDamageDecayPerTick).toBeGreaterThan(0);
		});

		it("each archetype has loot defined", () => {
			expect(am.sentinel.loot).toBeDefined();
			expect(am.crawler.loot).toBeDefined();
			// Colossus has no loot (it's a crisis event, not a kill reward)
			expect(am.colossus.loot).toBeDefined();
		});

		it("each archetype has components", () => {
			expect(am.sentinel.components.length).toBeGreaterThan(0);
			expect(am.crawler.components.length).toBeGreaterThan(0);
			expect(am.colossus.components.length).toBeGreaterThan(0);
		});
	});

	describe("perception", () => {
		it("has valid FOV values", () => {
			expect(enemiesConfig.perception.defaultFOV).toBeGreaterThan(0);
			expect(enemiesConfig.perception.defaultFOV).toBeLessThanOrEqual(360);
			expect(enemiesConfig.perception.scoutFOV).toBeGreaterThan(enemiesConfig.perception.defaultFOV);
			expect(enemiesConfig.perception.heavyFOV).toBeLessThan(enemiesConfig.perception.defaultFOV);
		});
	});
});
