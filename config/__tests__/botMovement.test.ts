import botMovementConfig from "../botMovement.json";

describe("botMovement.json", () => {
	describe("maintenance_bot", () => {
		it("has positive movement parameters", () => {
			expect(botMovementConfig.maintenance_bot.maxSpeed).toBeGreaterThan(0);
			expect(botMovementConfig.maintenance_bot.maxForce).toBeGreaterThan(0);
			expect(botMovementConfig.maintenance_bot.mass).toBeGreaterThan(0);
			expect(botMovementConfig.maintenance_bot.turnRate).toBeGreaterThan(0);
		});

		it("carry speed is a fraction of normal speed", () => {
			expect(botMovementConfig.maintenance_bot.carrySpeedMultiplier).toBeGreaterThan(0);
			expect(botMovementConfig.maintenance_bot.carrySpeedMultiplier).toBeLessThan(1);
		});
	});

	describe("heavy_bot", () => {
		it("is slower and heavier than maintenance bot", () => {
			expect(botMovementConfig.heavy_bot.maxSpeed).toBeLessThan(
				botMovementConfig.maintenance_bot.maxSpeed,
			);
			expect(botMovementConfig.heavy_bot.mass).toBeGreaterThan(
				botMovementConfig.maintenance_bot.mass,
			);
		});

		it("has more force to compensate for mass", () => {
			expect(botMovementConfig.heavy_bot.maxForce).toBeGreaterThan(
				botMovementConfig.maintenance_bot.maxForce,
			);
		});
	});

	describe("automation", () => {
		it("has positive distance thresholds", () => {
			expect(botMovementConfig.automation.guardRange).toBeGreaterThan(0);
			expect(botMovementConfig.automation.followDistance).toBeGreaterThan(0);
			expect(botMovementConfig.automation.workDistance).toBeGreaterThan(0);
			expect(botMovementConfig.automation.waypointReachThreshold).toBeGreaterThan(0);
		});

		it("guard range exceeds follow distance", () => {
			expect(botMovementConfig.automation.guardRange).toBeGreaterThan(
				botMovementConfig.automation.followDistance,
			);
		});
	});
});
