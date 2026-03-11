import enemiesConfig from "../enemies.json";

describe("enemies.json", () => {
	const factions = ["feral", "cultist", "rogue"] as const;

	it("has all hostile factions", () => {
		for (const faction of factions) {
			expect(enemiesConfig[faction]).toBeDefined();
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

	describe("cultist", () => {
		it("has lightning abilities", () => {
			expect(enemiesConfig.cultist.lightningRadius).toBeGreaterThan(0);
			expect(enemiesConfig.cultist.lightningCooldown).toBeGreaterThan(0);
			expect(enemiesConfig.cultist.lightningRange).toBeGreaterThan(0);
		});

		it("has hack difficulty", () => {
			expect(enemiesConfig.cultist.hackDifficulty).toBeGreaterThan(0);
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

	describe("ancientMachines", () => {
		it("has guardian, sentinel, and swarmDrone", () => {
			expect(enemiesConfig.ancientMachines.guardian).toBeDefined();
			expect(enemiesConfig.ancientMachines.sentinel).toBeDefined();
			expect(enemiesConfig.ancientMachines.swarmDrone).toBeDefined();
		});

		it("guardian has most HP", () => {
			expect(enemiesConfig.ancientMachines.guardian.hp).toBeGreaterThan(
				enemiesConfig.ancientMachines.sentinel.hp,
			);
		});

		it("spawns near rare deposits", () => {
			expect(enemiesConfig.ancientMachines.spawnNearDeposits.length).toBeGreaterThan(0);
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
