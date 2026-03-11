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
});
