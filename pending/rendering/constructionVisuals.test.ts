import {
	getConstructionStage,
	getConstructionVisuals,
	getSparkIntensity,
	POWER_ON_FLASH_COLOR,
} from "./constructionVisuals";

describe("constructionVisuals", () => {
	describe("getConstructionStage", () => {
		it("returns 'foundation' at 0% progress", () => {
			expect(getConstructionStage(0)).toBe("foundation");
		});

		it("returns 'foundation' at 33% progress", () => {
			expect(getConstructionStage(0.33)).toBe("foundation");
		});

		it("returns 'shell' at 34% progress", () => {
			expect(getConstructionStage(0.34)).toBe("shell");
		});

		it("returns 'shell' at 50% progress", () => {
			expect(getConstructionStage(0.5)).toBe("shell");
		});

		it("returns 'shell' at 66% progress", () => {
			expect(getConstructionStage(0.66)).toBe("shell");
		});

		it("returns 'operational' at 67% progress", () => {
			expect(getConstructionStage(0.67)).toBe("operational");
		});

		it("returns 'operational' at 100% progress", () => {
			expect(getConstructionStage(1.0)).toBe("operational");
		});
	});

	describe("getConstructionVisuals", () => {
		describe("foundation stage", () => {
			it("is wireframe at 0%", () => {
				const v = getConstructionVisuals(0, false, false);
				expect(v.stage).toBe("foundation");
				expect(v.wireframe).toBe(true);
			});

			it("has low opacity at 0%", () => {
				const v = getConstructionVisuals(0, false, false);
				expect(v.opacity).toBeCloseTo(0.2);
			});

			it("has low scaleY at 0%", () => {
				const v = getConstructionVisuals(0, false, false);
				expect(v.scaleY).toBeCloseTo(0.1);
			});

			it("shows sparks when active tick", () => {
				const v = getConstructionVisuals(0.1, true, false);
				expect(v.showSparks).toBe(true);
			});

			it("hides sparks when not active tick", () => {
				const v = getConstructionVisuals(0.1, false, false);
				expect(v.showSparks).toBe(false);
			});

			it("does not show power-on flash", () => {
				const v = getConstructionVisuals(0.1, false, false);
				expect(v.showPowerOnFlash).toBe(false);
			});
		});

		describe("shell stage", () => {
			it("is not wireframe", () => {
				const v = getConstructionVisuals(0.5, false, false);
				expect(v.stage).toBe("shell");
				expect(v.wireframe).toBe(false);
			});

			it("has medium opacity", () => {
				const v = getConstructionVisuals(0.5, false, false);
				expect(v.opacity).toBeGreaterThan(0.5);
				expect(v.opacity).toBeLessThan(1.0);
			});

			it("has partial scaleY", () => {
				const v = getConstructionVisuals(0.5, false, false);
				expect(v.scaleY).toBeGreaterThan(0.5);
				expect(v.scaleY).toBeLessThan(1.0);
			});

			it("shows sparks when active tick", () => {
				const v = getConstructionVisuals(0.5, true, false);
				expect(v.showSparks).toBe(true);
			});
		});

		describe("operational stage", () => {
			it("has full opacity", () => {
				const v = getConstructionVisuals(1.0, false, false);
				expect(v.stage).toBe("operational");
				expect(v.opacity).toBe(1.0);
			});

			it("is not wireframe", () => {
				const v = getConstructionVisuals(1.0, false, false);
				expect(v.wireframe).toBe(false);
			});

			it("has full scaleY", () => {
				const v = getConstructionVisuals(1.0, false, false);
				expect(v.scaleY).toBe(1.0);
			});

			it("does not show sparks", () => {
				const v = getConstructionVisuals(1.0, true, false);
				expect(v.showSparks).toBe(false);
			});

			it("shows power-on flash when justCompleted", () => {
				const v = getConstructionVisuals(1.0, false, true);
				expect(v.showPowerOnFlash).toBe(true);
			});

			it("does not show power-on flash normally", () => {
				const v = getConstructionVisuals(1.0, false, false);
				expect(v.showPowerOnFlash).toBe(false);
			});
		});

		describe("progress clamping", () => {
			it("clamps negative progress to 0", () => {
				const v = getConstructionVisuals(-0.5, false, false);
				expect(v.stage).toBe("foundation");
				expect(v.opacity).toBeCloseTo(0.2);
			});

			it("clamps progress above 1 to 1", () => {
				const v = getConstructionVisuals(1.5, false, false);
				expect(v.stage).toBe("operational");
				expect(v.opacity).toBe(1.0);
			});
		});

		describe("opacity progression", () => {
			it("increases monotonically across stages", () => {
				const o1 = getConstructionVisuals(0.1, false, false).opacity;
				const o2 = getConstructionVisuals(0.5, false, false).opacity;
				const o3 = getConstructionVisuals(0.9, false, false).opacity;
				expect(o2).toBeGreaterThan(o1);
				expect(o3).toBeGreaterThanOrEqual(o2);
			});
		});

		describe("scaleY progression", () => {
			it("increases monotonically across stages", () => {
				const s1 = getConstructionVisuals(0.1, false, false).scaleY;
				const s2 = getConstructionVisuals(0.5, false, false).scaleY;
				const s3 = getConstructionVisuals(0.9, false, false).scaleY;
				expect(s2).toBeGreaterThan(s1);
				expect(s3).toBeGreaterThanOrEqual(s2);
			});
		});
	});

	describe("getSparkIntensity", () => {
		it("returns moderate intensity during foundation", () => {
			expect(getSparkIntensity(0.2)).toBeCloseTo(0.4);
		});

		it("returns high intensity during shell phase", () => {
			expect(getSparkIntensity(0.5)).toBeCloseTo(0.8);
		});

		it("returns 0 when complete", () => {
			expect(getSparkIntensity(1.0)).toBe(0);
		});

		it("returns moderate at very start", () => {
			expect(getSparkIntensity(0)).toBeCloseTo(0.4);
		});
	});

	describe("POWER_ON_FLASH_COLOR", () => {
		it("is a defined hex color", () => {
			expect(POWER_ON_FLASH_COLOR).toBe(0xaaddff);
		});
	});
});
